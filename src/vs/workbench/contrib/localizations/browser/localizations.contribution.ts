/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContribution, Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IWorkbenchActionRegistry, Extensions } from 'vs/workbench/common/Actions';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ConfigureLocAleAction } from 'vs/workbench/contrib/locAlizAtions/browser/locAlizAtionsActions';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IExtensionMAnAgementService, DidInstAllExtensionEvent, IExtensionGAlleryService, IGAlleryExtension, InstAllOperAtion } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import Severity from 'vs/bAse/common/severity';
import { IJSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditing';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { VIEWLET_ID As EXTENSIONS_VIEWLET_ID, IExtensionsViewPAneContAiner } from 'vs/workbench/contrib/extensions/common/extensions';
import { minimumTrAnslAtedStrings } from 'vs/workbench/contrib/locAlizAtions/browser/minimAlTrAnslAtions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';

// Register Action to configure locAle And relAted settings
const registry = Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ConfigureLocAleAction), 'Configure DisplAy LAnguAge');

const LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY = 'extensionsAssistAnt/lAnguAgePAckSuggestionIgnore';

export clAss LocAlizAtionWorkbenchContribution extends DisposAble implements IWorkbenchContribution {
	constructor(
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IJSONEditingService privAte reAdonly jsonEditingService: IJSONEditingService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IViewletService privAte reAdonly viewletService: IViewletService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService
	) {
		super();

		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, version: 1 });
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: 'lAngugAge.updAte.donotAsk', version: 1 });
		this.checkAndInstAll();
		this._register(this.extensionMAnAgementService.onDidInstAllExtension(e => this.onDidInstAllExtension(e)));
	}

	privAte onDidInstAllExtension(e: DidInstAllExtensionEvent): void {
		if (e.locAl && e.operAtion === InstAllOperAtion.InstAll && e.locAl.mAnifest.contributes && e.locAl.mAnifest.contributes.locAlizAtions && e.locAl.mAnifest.contributes.locAlizAtions.length) {
			const locAle = e.locAl.mAnifest.contributes.locAlizAtions[0].lAnguAgeId;
			if (plAtform.lAnguAge !== locAle) {
				const updAteAndRestArt = plAtform.locAle !== locAle;
				this.notificAtionService.prompt(
					Severity.Info,
					updAteAndRestArt ? locAlize('updAteLocAle', "Would you like to chAnge VS Code's UI lAnguAge to {0} And restArt?", e.locAl.mAnifest.contributes.locAlizAtions[0].lAnguAgeNAme || e.locAl.mAnifest.contributes.locAlizAtions[0].lAnguAgeId)
						: locAlize('ActivAteLAnguAgePAck', "In order to use VS Code in {0}, VS Code needs to restArt.", e.locAl.mAnifest.contributes.locAlizAtions[0].lAnguAgeNAme || e.locAl.mAnifest.contributes.locAlizAtions[0].lAnguAgeId),
					[{
						lAbel: updAteAndRestArt ? locAlize('yes', "Yes") : locAlize('restArt now', "RestArt Now"),
						run: () => {
							const updAtePromise = updAteAndRestArt ? this.jsonEditingService.write(this.environmentService.ArgvResource, [{ pAth: ['locAle'], vAlue: locAle }], true) : Promise.resolve(undefined);
							updAtePromise.then(() => this.hostService.restArt(), e => this.notificAtionService.error(e));
						}
					}],
					{
						sticky: true,
						neverShowAgAin: { id: 'lAngugAge.updAte.donotAsk', isSecondAry: true }
					}
				);
			}
		}
	}

	privAte checkAndInstAll(): void {
		const lAnguAge = plAtform.lAnguAge;
		const locAle = plAtform.locAle;
		const lAnguAgePAckSuggestionIgnoreList = <string[]>JSON.pArse(this.storAgeService.get(LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY, StorAgeScope.GLOBAL, '[]'));

		if (!this.gAlleryService.isEnAbled()) {
			return;
		}
		if (!lAnguAge || !locAle || lAnguAge === 'en' || lAnguAge.indexOf('en-') === 0) {
			return;
		}
		if (lAnguAge === locAle || lAnguAgePAckSuggestionIgnoreList.indexOf(lAnguAge) > -1) {
			return;
		}

		this.isLAnguAgeInstAlled(locAle)
			.then(instAlled => {
				if (instAlled) {
					return;
				}

				this.gAlleryService.query({ text: `tAg:lp-${locAle}` }, CAncellAtionToken.None).then(tAgResult => {
					if (tAgResult.totAl === 0) {
						return;
					}

					const extensionToInstAll = tAgResult.totAl === 1 ? tAgResult.firstPAge[0] : tAgResult.firstPAge.filter(e => e.publisher === 'MS-CEINTL' && e.nAme.indexOf('vscode-lAnguAge-pAck') === 0)[0];
					const extensionToFetchTrAnslAtionsFrom = extensionToInstAll || tAgResult.firstPAge[0];

					if (!extensionToFetchTrAnslAtionsFrom.Assets.mAnifest) {
						return;
					}

					Promise.All([this.gAlleryService.getMAnifest(extensionToFetchTrAnslAtionsFrom, CAncellAtionToken.None), this.gAlleryService.getCoreTrAnslAtion(extensionToFetchTrAnslAtionsFrom, locAle)])
						.then(([mAnifest, trAnslAtion]) => {
							const loc = mAnifest && mAnifest.contributes && mAnifest.contributes.locAlizAtions && mAnifest.contributes.locAlizAtions.filter(x => x.lAnguAgeId.toLowerCAse() === locAle)[0];
							const lAnguAgeNAme = loc ? (loc.lAnguAgeNAme || locAle) : locAle;
							const lAnguAgeDisplAyNAme = loc ? (loc.locAlizedLAnguAgeNAme || loc.lAnguAgeNAme || locAle) : locAle;
							const trAnslAtionsFromPAck: Any = trAnslAtion && trAnslAtion.contents ? trAnslAtion.contents['vs/workbench/contrib/locAlizAtions/browser/minimAlTrAnslAtions'] : {};
							const promptMessAgeKey = extensionToInstAll ? 'instAllAndRestArtMessAge' : 'showLAnguAgePAckExtensions';
							const useEnglish = !trAnslAtionsFromPAck[promptMessAgeKey];

							const trAnslAtions: Any = {};
							Object.keys(minimumTrAnslAtedStrings).forEAch(key => {
								if (!trAnslAtionsFromPAck[key] || useEnglish) {
									trAnslAtions[key] = minimumTrAnslAtedStrings[key].replAce('{0}', lAnguAgeNAme);
								} else {
									trAnslAtions[key] = `${trAnslAtionsFromPAck[key].replAce('{0}', lAnguAgeDisplAyNAme)} (${minimumTrAnslAtedStrings[key].replAce('{0}', lAnguAgeNAme)})`;
								}
							});

							const logUserReAction = (userReAction: string) => {
								/* __GDPR__
									"lAnguAgePAckSuggestion:popup" : {
										"userReAction" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
										"lAnguAge": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
									}
								*/
								this.telemetryService.publicLog('lAnguAgePAckSuggestion:popup', { userReAction, lAnguAge });
							};

							const seArchAction = {
								lAbel: trAnslAtions['seArchMArketplAce'],
								run: () => {
									logUserReAction('seArch');
									this.viewletService.openViewlet(EXTENSIONS_VIEWLET_ID, true)
										.then(viewlet => viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner)
										.then(viewlet => {
											viewlet.seArch(`tAg:lp-${locAle}`);
											viewlet.focus();
										});
								}
							};

							const instAllAndRestArtAction = {
								lAbel: trAnslAtions['instAllAndRestArt'],
								run: () => {
									logUserReAction('instAllAndRestArt');
									this.instAllExtension(extensionToInstAll).then(() => this.hostService.restArt());
								}
							};

							const promptMessAge = trAnslAtions[promptMessAgeKey];

							this.notificAtionService.prompt(
								Severity.Info,
								promptMessAge,
								[extensionToInstAll ? instAllAndRestArtAction : seArchAction,
								{
									lAbel: locAlize('neverAgAin', "Don't Show AgAin"),
									isSecondAry: true,
									run: () => {
										lAnguAgePAckSuggestionIgnoreList.push(lAnguAge);
										this.storAgeService.store(
											LANGUAGEPACK_SUGGESTION_IGNORE_STORAGE_KEY,
											JSON.stringify(lAnguAgePAckSuggestionIgnoreList),
											StorAgeScope.GLOBAL
										);
										logUserReAction('neverShowAgAin');
									}
								}],
								{
									onCAncel: () => {
										logUserReAction('cAncelled');
									}
								}
							);

						});
				});
			});

	}

	privAte isLAnguAgeInstAlled(lAnguAge: string | undefined): Promise<booleAn> {
		return this.extensionMAnAgementService.getInstAlled()
			.then(instAlled => instAlled.some(i =>
				!!(i.mAnifest
					&& i.mAnifest.contributes
					&& i.mAnifest.contributes.locAlizAtions
					&& i.mAnifest.contributes.locAlizAtions.length
					&& i.mAnifest.contributes.locAlizAtions.some(l => l.lAnguAgeId.toLowerCAse() === lAnguAge))));
	}

	privAte instAllExtension(extension: IGAlleryExtension): Promise<void> {
		return this.viewletService.openViewlet(EXTENSIONS_VIEWLET_ID)
			.then(viewlet => viewlet?.getViewPAneContAiner() As IExtensionsViewPAneContAiner)
			.then(viewlet => viewlet.seArch(`@id:${extension.identifier.id}`))
			.then(() => this.extensionMAnAgementService.instAllFromGAllery(extension))
			.then(() => undefined, err => this.notificAtionService.error(err));
	}
}

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(LocAlizAtionWorkbenchContribution, LifecyclePhAse.EventuAlly);

ExtensionsRegistry.registerExtensionPoint({
	extensionPoint: 'locAlizAtions',
	jsonSchemA: {
		description: locAlize('vscode.extension.contributes.locAlizAtions', "Contributes locAlizAtions to the editor"),
		type: 'ArrAy',
		defAult: [],
		items: {
			type: 'object',
			required: ['lAnguAgeId', 'trAnslAtions'],
			defAultSnippets: [{ body: { lAnguAgeId: '', lAnguAgeNAme: '', locAlizedLAnguAgeNAme: '', trAnslAtions: [{ id: 'vscode', pAth: '' }] } }],
			properties: {
				lAnguAgeId: {
					description: locAlize('vscode.extension.contributes.locAlizAtions.lAnguAgeId', 'Id of the lAnguAge into which the displAy strings Are trAnslAted.'),
					type: 'string'
				},
				lAnguAgeNAme: {
					description: locAlize('vscode.extension.contributes.locAlizAtions.lAnguAgeNAme', 'NAme of the lAnguAge in English.'),
					type: 'string'
				},
				locAlizedLAnguAgeNAme: {
					description: locAlize('vscode.extension.contributes.locAlizAtions.lAnguAgeNAmeLocAlized', 'NAme of the lAnguAge in contributed lAnguAge.'),
					type: 'string'
				},
				trAnslAtions: {
					description: locAlize('vscode.extension.contributes.locAlizAtions.trAnslAtions', 'List of trAnslAtions AssociAted to the lAnguAge.'),
					type: 'ArrAy',
					defAult: [{ id: 'vscode', pAth: '' }],
					items: {
						type: 'object',
						required: ['id', 'pAth'],
						properties: {
							id: {
								type: 'string',
								description: locAlize('vscode.extension.contributes.locAlizAtions.trAnslAtions.id', "Id of VS Code or Extension for which this trAnslAtion is contributed to. Id of VS Code is AlwAys `vscode` And of extension should be in formAt `publisherId.extensionNAme`."),
								pAttern: '^((vscode)|([A-z0-9A-Z][A-z0-9\-A-Z]*)\\.([A-z0-9A-Z][A-z0-9\-A-Z]*))$',
								pAtternErrorMessAge: locAlize('vscode.extension.contributes.locAlizAtions.trAnslAtions.id.pAttern', "Id should be `vscode` or in formAt `publisherId.extensionNAme` for trAnslAting VS code or An extension respectively.")
							},
							pAth: {
								type: 'string',
								description: locAlize('vscode.extension.contributes.locAlizAtions.trAnslAtions.pAth', "A relAtive pAth to A file contAining trAnslAtions for the lAnguAge.")
							}
						},
						defAultSnippets: [{ body: { id: '', pAth: '' } }],
					},
				}
			}
		}
	}
});
