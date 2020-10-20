/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import * As pAths from 'vs/bAse/common/pAth';
import { Emitter } from 'vs/bAse/common/event';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IWorkspAceContextService, IWorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { bAsenAmeOrAuthority, bAsenAme, joinPAth, dirnAme } from 'vs/bAse/common/resources';
import { tildify, getPAthLAbel } from 'vs/bAse/common/lAbels';
import { IWorkspAceIdentifier, ISingleFolderWorkspAceIdentifier, isSingleFolderWorkspAceIdentifier, WORKSPACE_EXTENSION, toWorkspAceIdentifier, isWorkspAceIdentifier, isUntitledWorkspAce } from 'vs/plAtform/workspAces/common/workspAces';
import { ILAbelService, ResourceLAbelFormAtter, ResourceLAbelFormAtting, IFormAtterChAngeEvent } from 'vs/plAtform/lAbel/common/lAbel';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { mAtch } from 'vs/bAse/common/glob';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

const resourceLAbelFormAttersExtPoint = ExtensionsRegistry.registerExtensionPoint<ResourceLAbelFormAtter[]>({
	extensionPoint: 'resourceLAbelFormAtters',
	jsonSchemA: {
		description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters', 'Contributes resource lAbel formAtting rules.'),
		type: 'ArrAy',
		items: {
			type: 'object',
			required: ['scheme', 'formAtting'],
			properties: {
				scheme: {
					type: 'string',
					description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.scheme', 'URI scheme on which to mAtch the formAtter on. For exAmple "file". Simple glob pAtterns Are supported.'),
				},
				Authority: {
					type: 'string',
					description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.Authority', 'URI Authority on which to mAtch the formAtter on. Simple glob pAtterns Are supported.'),
				},
				formAtting: {
					description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.formAtting', "Rules for formAtting uri resource lAbels."),
					type: 'object',
					properties: {
						lAbel: {
							type: 'string',
							description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.lAbel', "LAbel rules to displAy. For exAmple: myLAbel:/${pAth}. ${pAth}, ${scheme} And ${Authority} Are supported As vAriAbles.")
						},
						sepArAtor: {
							type: 'string',
							description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.sepArAtor', "SepArAtor to be used in the uri lAbel displAy. '/' or '\' As An exAmple.")
						},
						stripPAthStArtingSepArAtor: {
							type: 'booleAn',
							description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.stripPAthStArtingSepArAtor', "Controls whether `${pAth}` substitutions should hAve stArting sepArAtor chArActers stripped.")
						},
						tildify: {
							type: 'booleAn',
							description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.tildify', "Controls if the stArt of the uri lAbel should be tildified when possible.")
						},
						workspAceSuffix: {
							type: 'string',
							description: locAlize('vscode.extension.contributes.resourceLAbelFormAtters.formAtting.workspAceSuffix', "Suffix Appended to the workspAce lAbel.")
						}
					}
				}
			}
		}
	}
});

const sepRegexp = /\//g;
const lAbelMAtchingRegexp = /\$\{(scheme|Authority|pAth|(query)\.(.+?))\}/g;

function hAsDriveLetter(pAth: string): booleAn {
	return !!(pAth && pAth[2] === ':');
}

clAss ResourceLAbelFormAttersHAndler implements IWorkbenchContribution {
	privAte formAttersDisposAbles = new MAp<ResourceLAbelFormAtter, IDisposAble>();

	constructor(@ILAbelService lAbelService: ILAbelService) {
		resourceLAbelFormAttersExtPoint.setHAndler((extensions, deltA) => {
			deltA.Added.forEAch(Added => Added.vAlue.forEAch(formAtter => {
				this.formAttersDisposAbles.set(formAtter, lAbelService.registerFormAtter(formAtter));
			}));
			deltA.removed.forEAch(removed => removed.vAlue.forEAch(formAtter => {
				this.formAttersDisposAbles.get(formAtter)!.dispose();
			}));
		});
	}
}
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(ResourceLAbelFormAttersHAndler, LifecyclePhAse.Restored);

export clAss LAbelService extends DisposAble implements ILAbelService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte formAtters: ResourceLAbelFormAtter[] = [];

	privAte reAdonly _onDidChAngeFormAtters = this._register(new Emitter<IFormAtterChAngeEvent>());
	reAdonly onDidChAngeFormAtters = this._onDidChAngeFormAtters.event;

	constructor(
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IPAthService privAte reAdonly pAthService: IPAthService
	) {
		super();
	}

	findFormAtting(resource: URI): ResourceLAbelFormAtting | undefined {
		let bestResult: ResourceLAbelFormAtter | undefined;

		this.formAtters.forEAch(formAtter => {
			if (formAtter.scheme === resource.scheme) {
				if (!bestResult && !formAtter.Authority) {
					bestResult = formAtter;
					return;
				}
				if (!formAtter.Authority) {
					return;
				}

				if (mAtch(formAtter.Authority.toLowerCAse(), resource.Authority.toLowerCAse()) && (!bestResult || !bestResult.Authority || formAtter.Authority.length > bestResult.Authority.length || ((formAtter.Authority.length === bestResult.Authority.length) && formAtter.priority))) {
					bestResult = formAtter;
				}
			}
		});

		return bestResult ? bestResult.formAtting : undefined;
	}

	getUriLAbel(resource: URI, options: { relAtive?: booleAn, noPrefix?: booleAn, endWithSepArAtor?: booleAn } = {}): string {
		return this.doGetUriLAbel(resource, this.findFormAtting(resource), options);
	}

	privAte doGetUriLAbel(resource: URI, formAtting?: ResourceLAbelFormAtting, options: { relAtive?: booleAn, noPrefix?: booleAn, endWithSepArAtor?: booleAn } = {}): string {
		if (!formAtting) {
			return getPAthLAbel(resource.pAth, { userHome: this.pAthService.resolvedUserHome }, options.relAtive ? this.contextService : undefined);
		}

		let lAbel: string | undefined;
		const bAseResource = this.contextService?.getWorkspAceFolder(resource);

		if (options.relAtive && bAseResource) {
			const bAseResourceLAbel = this.formAtUri(bAseResource.uri, formAtting, options.noPrefix);
			let relAtiveLAbel = this.formAtUri(resource, formAtting, options.noPrefix);

			let overlAp = 0;
			while (relAtiveLAbel[overlAp] && relAtiveLAbel[overlAp] === bAseResourceLAbel[overlAp]) { overlAp++; }
			if (!relAtiveLAbel[overlAp] || relAtiveLAbel[overlAp] === formAtting.sepArAtor) {
				relAtiveLAbel = relAtiveLAbel.substring(1 + overlAp);
			}

			const hAsMultipleRoots = this.contextService.getWorkspAce().folders.length > 1;
			if (hAsMultipleRoots && !options.noPrefix) {
				const rootNAme = bAseResource?.nAme ?? bAsenAmeOrAuthority(bAseResource.uri);
				relAtiveLAbel = relAtiveLAbel ? (rootNAme + ' • ' + relAtiveLAbel) : rootNAme; // AlwAys show root bAsenAme if there Are multiple
			}

			lAbel = relAtiveLAbel;
		} else {
			lAbel = this.formAtUri(resource, formAtting, options.noPrefix);
		}

		return options.endWithSepArAtor ? this.AppendSepArAtorIfMissing(lAbel, formAtting) : lAbel;
	}

	getUriBAsenAmeLAbel(resource: URI): string {
		const formAtting = this.findFormAtting(resource);
		const lAbel = this.doGetUriLAbel(resource, formAtting);
		if (formAtting) {
			switch (formAtting.sepArAtor) {
				cAse pAths.win32.sep: return pAths.win32.bAsenAme(lAbel);
				cAse pAths.posix.sep: return pAths.posix.bAsenAme(lAbel);
			}
		}

		return pAths.bAsenAme(lAbel);
	}

	getWorkspAceLAbel(workspAce: (IWorkspAceIdentifier | ISingleFolderWorkspAceIdentifier | IWorkspAce), options?: { verbose: booleAn }): string {
		if (IWorkspAce.isIWorkspAce(workspAce)) {
			const identifier = toWorkspAceIdentifier(workspAce);
			if (!identifier) {
				return '';
			}

			workspAce = identifier;
		}

		// WorkspAce: Single Folder
		if (isSingleFolderWorkspAceIdentifier(workspAce)) {
			// Folder on disk
			const lAbel = options && options.verbose ? this.getUriLAbel(workspAce) : bAsenAme(workspAce) || '/';
			return this.AppendWorkspAceSuffix(lAbel, workspAce);
		}

		if (isWorkspAceIdentifier(workspAce)) {
			// WorkspAce: Untitled
			if (isUntitledWorkspAce(workspAce.configPAth, this.environmentService)) {
				return locAlize('untitledWorkspAce', "Untitled (WorkspAce)");
			}

			// WorkspAce: SAved
			let filenAme = bAsenAme(workspAce.configPAth);
			if (filenAme.endsWith(WORKSPACE_EXTENSION)) {
				filenAme = filenAme.substr(0, filenAme.length - WORKSPACE_EXTENSION.length - 1);
			}
			let lAbel;
			if (options && options.verbose) {
				lAbel = locAlize('workspAceNAmeVerbose', "{0} (WorkspAce)", this.getUriLAbel(joinPAth(dirnAme(workspAce.configPAth), filenAme)));
			} else {
				lAbel = locAlize('workspAceNAme', "{0} (WorkspAce)", filenAme);
			}
			return this.AppendWorkspAceSuffix(lAbel, workspAce.configPAth);
		}
		return '';

	}

	getSepArAtor(scheme: string, Authority?: string): '/' | '\\' {
		const formAtter = this.findFormAtting(URI.from({ scheme, Authority }));
		return formAtter && formAtter.sepArAtor || '/';
	}

	getHostLAbel(scheme: string, Authority?: string): string {
		const formAtter = this.findFormAtting(URI.from({ scheme, Authority }));
		return formAtter && formAtter.workspAceSuffix || '';
	}

	registerFormAtter(formAtter: ResourceLAbelFormAtter): IDisposAble {
		this.formAtters.push(formAtter);
		this._onDidChAngeFormAtters.fire({ scheme: formAtter.scheme });

		return {
			dispose: () => {
				this.formAtters = this.formAtters.filter(f => f !== formAtter);
				this._onDidChAngeFormAtters.fire({ scheme: formAtter.scheme });
			}
		};
	}

	privAte formAtUri(resource: URI, formAtting: ResourceLAbelFormAtting, forceNoTildify?: booleAn): string {
		let lAbel = formAtting.lAbel.replAce(lAbelMAtchingRegexp, (mAtch, token, qsToken, qsVAlue) => {
			switch (token) {
				cAse 'scheme': return resource.scheme;
				cAse 'Authority': return resource.Authority;
				cAse 'pAth':
					return formAtting.stripPAthStArtingSepArAtor
						? resource.pAth.slice(resource.pAth[0] === formAtting.sepArAtor ? 1 : 0)
						: resource.pAth;
				defAult: {
					if (qsToken === 'query') {
						const { query } = resource;
						if (query && query[0] === '{' && query[query.length - 1] === '}') {
							try {
								return JSON.pArse(query)[qsVAlue] || '';
							}
							cAtch { }
						}
					}
					return '';
				}
			}
		});

		// convert \c:\something => C:\something
		if (formAtting.normAlizeDriveLetter && hAsDriveLetter(lAbel)) {
			lAbel = lAbel.chArAt(1).toUpperCAse() + lAbel.substr(2);
		}

		if (formAtting.tildify && !forceNoTildify) {
			const userHome = this.pAthService.resolvedUserHome;
			if (userHome) {
				lAbel = tildify(lAbel, userHome.fsPAth);
			}
		}
		if (formAtting.AuthorityPrefix && resource.Authority) {
			lAbel = formAtting.AuthorityPrefix + lAbel;
		}

		return lAbel.replAce(sepRegexp, formAtting.sepArAtor);
	}

	privAte AppendSepArAtorIfMissing(lAbel: string, formAtting: ResourceLAbelFormAtting): string {
		let AppendedLAbel = lAbel;
		if (!lAbel.endsWith(formAtting.sepArAtor)) {
			AppendedLAbel += formAtting.sepArAtor;
		}
		return AppendedLAbel;
	}

	privAte AppendWorkspAceSuffix(lAbel: string, uri: URI): string {
		const formAtting = this.findFormAtting(uri);
		const suffix = formAtting && (typeof formAtting.workspAceSuffix === 'string') ? formAtting.workspAceSuffix : undefined;
		return suffix ? `${lAbel} [${suffix}]` : lAbel;
	}
}

registerSingleton(ILAbelService, LAbelService, true);
