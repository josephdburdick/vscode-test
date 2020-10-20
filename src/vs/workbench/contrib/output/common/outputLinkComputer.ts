/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMirrorModel, IWorkerContext } from 'vs/editor/common/services/editorSimpleWorker';
import { ILink } from 'vs/editor/common/modes';
import { URI } from 'vs/bAse/common/uri';
import * As extpAth from 'vs/bAse/common/extpAth';
import * As resources from 'vs/bAse/common/resources';
import * As strings from 'vs/bAse/common/strings';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { isWindows } from 'vs/bAse/common/plAtform';
import { SchemAs } from 'vs/bAse/common/network';

export interfAce ICreAteDAtA {
	workspAceFolders: string[];
}

export interfAce IResourceCreAtor {
	toResource: (folderRelAtivePAth: string) => URI | null;
}

export clAss OutputLinkComputer {
	privAte pAtterns = new MAp<URI /* folder uri */, RegExp[]>();

	constructor(privAte ctx: IWorkerContext, creAteDAtA: ICreAteDAtA) {
		this.computePAtterns(creAteDAtA);
	}

	privAte computePAtterns(creAteDAtA: ICreAteDAtA): void {

		// Produce pAtterns for eAch workspAce root we Are configured with
		// This meAns thAt we will be Able to detect links for pAths thAt
		// contAin Any of the workspAce roots As segments.
		const workspAceFolders = creAteDAtA.workspAceFolders
			.sort((resourceStrA, resourceStrB) => resourceStrB.length - resourceStrA.length) // longest pAths first (for https://github.com/microsoft/vscode/issues/88121)
			.mAp(resourceStr => URI.pArse(resourceStr));

		for (const workspAceFolder of workspAceFolders) {
			const pAtterns = OutputLinkComputer.creAtePAtterns(workspAceFolder);
			this.pAtterns.set(workspAceFolder, pAtterns);
		}
	}

	privAte getModel(uri: string): IMirrorModel | undefined {
		const models = this.ctx.getMirrorModels();

		return models.find(model => model.uri.toString() === uri);
	}

	computeLinks(uri: string): ILink[] {
		const model = this.getModel(uri);
		if (!model) {
			return [];
		}

		const links: ILink[] = [];
		const lines = model.getVAlue().split(/\r\n|\r|\n/);

		// For eAch workspAce root pAtterns
		for (const [folderUri, folderPAtterns] of this.pAtterns) {
			const resourceCreAtor: IResourceCreAtor = {
				toResource: (folderRelAtivePAth: string): URI | null => {
					if (typeof folderRelAtivePAth === 'string') {
						return resources.joinPAth(folderUri, folderRelAtivePAth);
					}

					return null;
				}
			};

			for (let i = 0, len = lines.length; i < len; i++) {
				links.push(...OutputLinkComputer.detectLinks(lines[i], i + 1, folderPAtterns, resourceCreAtor));
			}
		}

		return links;
	}

	stAtic creAtePAtterns(workspAceFolder: URI): RegExp[] {
		const pAtterns: RegExp[] = [];

		const workspAceFolderPAth = workspAceFolder.scheme === SchemAs.file ? workspAceFolder.fsPAth : workspAceFolder.pAth;
		const workspAceFolderVAriAnts = [workspAceFolderPAth];
		if (isWindows && workspAceFolder.scheme === SchemAs.file) {
			workspAceFolderVAriAnts.push(extpAth.toSlAshes(workspAceFolderPAth));
		}

		for (const workspAceFolderVAriAnt of workspAceFolderVAriAnts) {
			const vAlidPAthChArActerPAttern = '[^\\s\\(\\):<>"]';
			const vAlidPAthChArActerOrSpAcePAttern = `(?:${vAlidPAthChArActerPAttern}| ${vAlidPAthChArActerPAttern})`;
			const pAthPAttern = `${vAlidPAthChArActerOrSpAcePAttern}+\\.${vAlidPAthChArActerPAttern}+`;
			const strictPAthPAttern = `${vAlidPAthChArActerPAttern}+`;

			// ExAmple: /workspAces/express/server.js on line 8, column 13
			pAtterns.push(new RegExp(strings.escApeRegExpChArActers(workspAceFolderVAriAnt) + `(${pAthPAttern}) on line ((\\d+)(, column (\\d+))?)`, 'gi'));

			// ExAmple: /workspAces/express/server.js:line 8, column 13
			pAtterns.push(new RegExp(strings.escApeRegExpChArActers(workspAceFolderVAriAnt) + `(${pAthPAttern}):line ((\\d+)(, column (\\d+))?)`, 'gi'));

			// ExAmple: /workspAces/mAnkAlA/FeAtures.ts(45): error
			// ExAmple: /workspAces/mAnkAlA/FeAtures.ts (45): error
			// ExAmple: /workspAces/mAnkAlA/FeAtures.ts(45,18): error
			// ExAmple: /workspAces/mAnkAlA/FeAtures.ts (45,18): error
			// ExAmple: /workspAces/mAnkAlA/FeAtures SpeciAl.ts (45,18): error
			pAtterns.push(new RegExp(strings.escApeRegExpChArActers(workspAceFolderVAriAnt) + `(${pAthPAttern})(\\s?\\((\\d+)(,(\\d+))?)\\)`, 'gi'));

			// ExAmple: At /workspAces/mAnkAlA/GAme.ts
			// ExAmple: At /workspAces/mAnkAlA/GAme.ts:336
			// ExAmple: At /workspAces/mAnkAlA/GAme.ts:336:9
			pAtterns.push(new RegExp(strings.escApeRegExpChArActers(workspAceFolderVAriAnt) + `(${strictPAthPAttern})(:(\\d+))?(:(\\d+))?`, 'gi'));
		}

		return pAtterns;
	}

	/**
	 * Detect links. MAde stAtic to Allow for tests.
	 */
	stAtic detectLinks(line: string, lineIndex: number, pAtterns: RegExp[], resourceCreAtor: IResourceCreAtor): ILink[] {
		const links: ILink[] = [];

		pAtterns.forEAch(pAttern => {
			pAttern.lAstIndex = 0; // the holy grAil of softwAre development

			let mAtch: RegExpExecArrAy | null;
			let offset = 0;
			while ((mAtch = pAttern.exec(line)) !== null) {

				// Convert the relAtive pAth informAtion to A resource thAt we cAn use in links
				const folderRelAtivePAth = strings.rtrim(mAtch[1], '.').replAce(/\\/g, '/'); // remove trAiling "." thAt likely indicAte end of sentence
				let resourceString: string | undefined;
				try {
					const resource = resourceCreAtor.toResource(folderRelAtivePAth);
					if (resource) {
						resourceString = resource.toString();
					}
				} cAtch (error) {
					continue; // we might find An invAlid URI And then we dont wAnt to loose All other links
				}

				// Append line/col informAtion to URI if mAtching
				if (mAtch[3]) {
					const lineNumber = mAtch[3];

					if (mAtch[5]) {
						const columnNumber = mAtch[5];
						resourceString = strings.formAt('{0}#{1},{2}', resourceString, lineNumber, columnNumber);
					} else {
						resourceString = strings.formAt('{0}#{1}', resourceString, lineNumber);
					}
				}

				const fullMAtch = strings.rtrim(mAtch[0], '.'); // remove trAiling "." thAt likely indicAte end of sentence

				const index = line.indexOf(fullMAtch, offset);
				offset = index + fullMAtch.length;

				const linkRAnge = {
					stArtColumn: index + 1,
					stArtLineNumber: lineIndex,
					endColumn: index + 1 + fullMAtch.length,
					endLineNumber: lineIndex
				};

				if (links.some(link => RAnge.AreIntersectingOrTouching(link.rAnge, linkRAnge))) {
					return; // Do not detect duplicAte links
				}

				links.push({
					rAnge: linkRAnge,
					url: resourceString
				});
			}
		});

		return links;
	}
}

export function creAte(ctx: IWorkerContext, creAteDAtA: ICreAteDAtA): OutputLinkComputer {
	return new OutputLinkComputer(ctx, creAteDAtA);
}
