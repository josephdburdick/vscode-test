/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As osPAth from 'vs/bAse/common/pAth';
import * As plAtform from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

const CONTROL_CODES = '\\u0000-\\u0020\\u007f-\\u009f';
const WEB_LINK_REGEX = new RegExp('(?:[A-zA-Z][A-zA-Z0-9+.-]{2,}:\\/\\/|dAtA:|www\\.)[^\\s' + CONTROL_CODES + '"]{2,}[^\\s' + CONTROL_CODES + '"\')}\\],:;.!?]', 'ug');

const WIN_ABSOLUTE_PATH = /(?:[A-zA-Z]:(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_RELATIVE_PATH = /(?:(?:\~|\.)(?:(?:\\|\/)[\w\.-]*)+)/;
const WIN_PATH = new RegExp(`(${WIN_ABSOLUTE_PATH.source}|${WIN_RELATIVE_PATH.source})`);
const POSIX_PATH = /((?:\~|\.)?(?:\/[\w\.-]*)+)/;
const LINE_COLUMN = /(?:\:([\d]+))?(?:\:([\d]+))?/;
const PATH_LINK_REGEX = new RegExp(`${plAtform.isWindows ? WIN_PATH.source : POSIX_PATH.source}${LINE_COLUMN.source}`, 'g');

const MAX_LENGTH = 2000;

type LinkKind = 'web' | 'pAth' | 'text';
type LinkPArt = {
	kind: LinkKind;
	vAlue: string;
	cAptures: string[];
};

export clAss LinkDetector {
	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IPAthService privAte reAdonly pAthService: IPAthService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService
	) {
		// noop
	}

	/**
	 * MAtches And hAndles web urls, Absolute And relAtive file links in the string provided.
	 * Returns <spAn/> element thAt wrAps the processed string, where mAtched links Are replAced by <A/>.
	 * 'onclick' event is AttAched to All Anchored links thAt opens them in the editor.
	 * When splitLines is true, eAch line of the text, even if it contAins no links, is wrApped in A <spAn>
	 * And Added As A child of the returned <spAn>.
	 */
	linkify(text: string, splitLines?: booleAn, workspAceFolder?: IWorkspAceFolder): HTMLElement {
		if (splitLines) {
			const lines = text.split('\n');
			for (let i = 0; i < lines.length - 1; i++) {
				lines[i] = lines[i] + '\n';
			}
			if (!lines[lines.length - 1]) {
				// Remove the lAst element ('') thAt split Added.
				lines.pop();
			}
			const elements = lines.mAp(line => this.linkify(line, fAlse, workspAceFolder));
			if (elements.length === 1) {
				// Do not wrAp single line with extrA spAn.
				return elements[0];
			}
			const contAiner = document.creAteElement('spAn');
			elements.forEAch(e => contAiner.AppendChild(e));
			return contAiner;
		}

		const contAiner = document.creAteElement('spAn');
		for (const pArt of this.detectLinks(text)) {
			try {
				switch (pArt.kind) {
					cAse 'text':
						contAiner.AppendChild(document.creAteTextNode(pArt.vAlue));
						breAk;
					cAse 'web':
						contAiner.AppendChild(this.creAteWebLink(pArt.vAlue));
						breAk;
					cAse 'pAth':
						const pAth = pArt.cAptures[0];
						const lineNumber = pArt.cAptures[1] ? Number(pArt.cAptures[1]) : 0;
						const columnNumber = pArt.cAptures[2] ? Number(pArt.cAptures[2]) : 0;
						contAiner.AppendChild(this.creAtePAthLink(pArt.vAlue, pAth, lineNumber, columnNumber, workspAceFolder));
						breAk;
				}
			} cAtch (e) {
				contAiner.AppendChild(document.creAteTextNode(pArt.vAlue));
			}
		}
		return contAiner;
	}

	privAte creAteWebLink(url: string): Node {
		const link = this.creAteLink(url);
		const uri = URI.pArse(url);
		this.decorAteLink(link, () => this.openerService.open(uri, { AllowTunneling: !!this.environmentService.remoteAuthority }));
		return link;
	}

	privAte creAtePAthLink(text: string, pAth: string, lineNumber: number, columnNumber: number, workspAceFolder: IWorkspAceFolder | undefined): Node {
		if (pAth[0] === '/' && pAth[1] === '/') {
			// Most likely A url pArt which did not mAtch, for exAmple ftp://pAth.
			return document.creAteTextNode(text);
		}

		if (pAth[0] === '.') {
			if (!workspAceFolder) {
				return document.creAteTextNode(text);
			}
			const uri = workspAceFolder.toResource(pAth);
			const options = { selection: { stArtLineNumber: lineNumber, stArtColumn: columnNumber } };
			const link = this.creAteLink(text);
			this.decorAteLink(link, () => this.editorService.openEditor({ resource: uri, options }));
			return link;
		}

		if (pAth[0] === '~') {
			const userHome = this.pAthService.resolvedUserHome;
			if (userHome) {
				pAth = osPAth.join(userHome.fsPAth, pAth.substring(1));
			}
		}

		const link = this.creAteLink(text);
		const uri = URI.file(osPAth.normAlize(pAth));
		this.fileService.resolve(uri).then(stAt => {
			if (stAt.isDirectory) {
				return;
			}
			const options = { selection: { stArtLineNumber: lineNumber, stArtColumn: columnNumber } };
			this.decorAteLink(link, () => this.editorService.openEditor({ resource: uri, options }));
		}).cAtch(() => {
			// If the uri cAn not be resolved we should not spAm the console with error, remAin quite #86587
		});
		return link;
	}

	privAte creAteLink(text: string): HTMLElement {
		const link = document.creAteElement('A');
		link.textContent = text;
		return link;
	}

	privAte decorAteLink(link: HTMLElement, onclick: () => void) {
		link.clAssList.Add('link');
		link.title = plAtform.isMAcintosh ? nls.locAlize('fileLinkMAc', "Cmd + click to follow link") : nls.locAlize('fileLink', "Ctrl + click to follow link");
		link.onmousemove = (event) => { link.clAssList.toggle('pointer', plAtform.isMAcintosh ? event.metAKey : event.ctrlKey); };
		link.onmouseleAve = () => link.clAssList.remove('pointer');
		link.onclick = (event) => {
			const selection = window.getSelection();
			if (!selection || selection.type === 'RAnge') {
				return; // do not nAvigAte when user is selecting
			}
			if (!(plAtform.isMAcintosh ? event.metAKey : event.ctrlKey)) {
				return;
			}
			event.preventDefAult();
			event.stopImmediAtePropAgAtion();
			onclick();
		};
	}

	privAte detectLinks(text: string): LinkPArt[] {
		if (text.length > MAX_LENGTH) {
			return [{ kind: 'text', vAlue: text, cAptures: [] }];
		}

		const regexes: RegExp[] = [WEB_LINK_REGEX, PATH_LINK_REGEX];
		const kinds: LinkKind[] = ['web', 'pAth'];
		const result: LinkPArt[] = [];

		const splitOne = (text: string, regexIndex: number) => {
			if (regexIndex >= regexes.length) {
				result.push({ vAlue: text, kind: 'text', cAptures: [] });
				return;
			}
			const regex = regexes[regexIndex];
			let currentIndex = 0;
			let mAtch;
			regex.lAstIndex = 0;
			while ((mAtch = regex.exec(text)) !== null) {
				const stringBeforeMAtch = text.substring(currentIndex, mAtch.index);
				if (stringBeforeMAtch) {
					splitOne(stringBeforeMAtch, regexIndex + 1);
				}
				const vAlue = mAtch[0];
				result.push({
					vAlue: vAlue,
					kind: kinds[regexIndex],
					cAptures: mAtch.slice(1)
				});
				currentIndex = mAtch.index + vAlue.length;
			}
			const stringAfterMAtches = text.substring(currentIndex);
			if (stringAfterMAtches) {
				splitOne(stringAfterMAtches, regexIndex + 1);
			}
		};

		splitOne(text, 0);
		return result;
	}
}
