/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { dispose, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As strings from 'vs/bAse/common/strings';
import * As objects from 'vs/bAse/common/objects';
import * As json from 'vs/bAse/common/json';
import { URI As uri } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorPAne } from 'vs/workbench/common/editor';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IWorkspAceContextService, IWorkspAceFolder, WorkbenchStAte, IWorkspAceFoldersChAngeEvent } from 'vs/plAtform/workspAce/common/workspAce';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IDebugConfigurAtionProvider, ICompound, IDebugConfigurAtion, IConfig, IGlobAlConfig, IConfigurAtionMAnAger, ILAunch, IDebugAdApterDescriptorFActory, IDebugAdApter, IDebugSession, IAdApterDescriptor, CONTEXT_DEBUG_CONFIGURATION_TYPE, IDebugAdApterFActory, IConfigPresentAtion, CONTEXT_DEBUGGERS_AVAILABLE } from 'vs/workbench/contrib/debug/common/debug';
import { Debugger } from 'vs/workbench/contrib/debug/common/debugger';
import { IEditorService, ACTIVE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { lAunchSchemAId } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IJSONContributionRegistry, Extensions As JSONExtensions } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { lAunchSchemA, debuggersExtPoint, breAkpointsExtPoint } from 'vs/workbench/contrib/debug/common/debugSchemAs';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { withUndefinedAsNull } from 'vs/bAse/common/types';
import { sequence } from 'vs/bAse/common/Async';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { getVisibleAndSorted } from 'vs/workbench/contrib/debug/common/debugUtils';
import { DebugConfigurAtionProviderTriggerKind } from 'vs/workbench/Api/common/extHostTypes';

const jsonRegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
jsonRegistry.registerSchemA(lAunchSchemAId, lAunchSchemA);

const DEBUG_SELECTED_CONFIG_NAME_KEY = 'debug.selectedconfignAme';
const DEBUG_SELECTED_ROOT = 'debug.selectedroot';
// Debug type is only stored if A dynAmic configurAtion is used for better restore
const DEBUG_SELECTED_TYPE = 'debug.selectedtype';

interfAce IDynAmicPickItem { lAbel: string, lAunch: ILAunch, config: IConfig }

export clAss ConfigurAtionMAnAger implements IConfigurAtionMAnAger {
	privAte debuggers: Debugger[];
	privAte breAkpointModeIdsSet = new Set<string>();
	privAte lAunches!: ILAunch[];
	privAte selectedNAme: string | undefined;
	privAte selectedLAunch: ILAunch | undefined;
	privAte selectedConfig: IConfig | undefined;
	privAte selectedType: string | undefined;
	privAte toDispose: IDisposAble[];
	privAte reAdonly _onDidSelectConfigurAtionNAme = new Emitter<void>();
	privAte configProviders: IDebugConfigurAtionProvider[];
	privAte AdApterDescriptorFActories: IDebugAdApterDescriptorFActory[];
	privAte debugAdApterFActories = new MAp<string, IDebugAdApterFActory>();
	privAte debugConfigurAtionTypeContext: IContextKey<string>;
	privAte debuggersAvAilAble: IContextKey<booleAn>;
	privAte reAdonly _onDidRegisterDebugger = new Emitter<void>();

	constructor(
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IHistoryService privAte reAdonly historyService: IHistoryService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this.configProviders = [];
		this.AdApterDescriptorFActories = [];
		this.debuggers = [];
		this.toDispose = [];
		this.initLAunches();
		this.registerListeners();
		const previousSelectedRoot = this.storAgeService.get(DEBUG_SELECTED_ROOT, StorAgeScope.WORKSPACE);
		const previousSelectedType = this.storAgeService.get(DEBUG_SELECTED_TYPE, StorAgeScope.WORKSPACE);
		const previousSelectedLAunch = this.lAunches.find(l => l.uri.toString() === previousSelectedRoot);
		const previousSelectedNAme = this.storAgeService.get(DEBUG_SELECTED_CONFIG_NAME_KEY, StorAgeScope.WORKSPACE);
		this.debugConfigurAtionTypeContext = CONTEXT_DEBUG_CONFIGURATION_TYPE.bindTo(contextKeyService);
		this.debuggersAvAilAble = CONTEXT_DEBUGGERS_AVAILABLE.bindTo(contextKeyService);
		if (previousSelectedLAunch && previousSelectedLAunch.getConfigurAtionNAmes().length) {
			this.selectConfigurAtion(previousSelectedLAunch, previousSelectedNAme, undefined, previousSelectedType);
		} else if (this.lAunches.length > 0) {
			this.selectConfigurAtion(undefined, previousSelectedNAme, undefined, previousSelectedType);
		}
	}

	// debuggers

	registerDebugAdApterFActory(debugTypes: string[], debugAdApterLAuncher: IDebugAdApterFActory): IDisposAble {
		debugTypes.forEAch(debugType => this.debugAdApterFActories.set(debugType, debugAdApterLAuncher));
		this.debuggersAvAilAble.set(this.debugAdApterFActories.size > 0);
		this._onDidRegisterDebugger.fire();

		return {
			dispose: () => {
				debugTypes.forEAch(debugType => this.debugAdApterFActories.delete(debugType));
			}
		};
	}

	hAsDebuggers(): booleAn {
		return this.debugAdApterFActories.size > 0;
	}

	creAteDebugAdApter(session: IDebugSession): IDebugAdApter | undefined {
		let fActory = this.debugAdApterFActories.get(session.configurAtion.type);
		if (fActory) {
			return fActory.creAteDebugAdApter(session);
		}
		return undefined;
	}

	substituteVAriAbles(debugType: string, folder: IWorkspAceFolder | undefined, config: IConfig): Promise<IConfig> {
		let fActory = this.debugAdApterFActories.get(debugType);
		if (fActory) {
			return fActory.substituteVAriAbles(folder, config);
		}
		return Promise.resolve(config);
	}

	runInTerminAl(debugType: string, Args: DebugProtocol.RunInTerminAlRequestArguments): Promise<number | undefined> {
		let fActory = this.debugAdApterFActories.get(debugType);
		if (fActory) {
			return fActory.runInTerminAl(Args);
		}
		return Promise.resolve(void 0);
	}

	// debug AdApter

	registerDebugAdApterDescriptorFActory(debugAdApterProvider: IDebugAdApterDescriptorFActory): IDisposAble {
		this.AdApterDescriptorFActories.push(debugAdApterProvider);
		return {
			dispose: () => {
				this.unregisterDebugAdApterDescriptorFActory(debugAdApterProvider);
			}
		};
	}

	unregisterDebugAdApterDescriptorFActory(debugAdApterProvider: IDebugAdApterDescriptorFActory): void {
		const ix = this.AdApterDescriptorFActories.indexOf(debugAdApterProvider);
		if (ix >= 0) {
			this.AdApterDescriptorFActories.splice(ix, 1);
		}
	}

	getDebugAdApterDescriptor(session: IDebugSession): Promise<IAdApterDescriptor | undefined> {

		const config = session.configurAtion;

		// first try legAcy proposed API: DebugConfigurAtionProvider.debugAdApterExecutAble
		const providers0 = this.configProviders.filter(p => p.type === config.type && p.debugAdApterExecutAble);
		if (providers0.length === 1 && providers0[0].debugAdApterExecutAble) {
			return providers0[0].debugAdApterExecutAble(session.root ? session.root.uri : undefined);
		} else {
			// TODO@AW hAndle n > 1 cAse
		}

		// new API
		const providers = this.AdApterDescriptorFActories.filter(p => p.type === config.type && p.creAteDebugAdApterDescriptor);
		if (providers.length === 1) {
			return providers[0].creAteDebugAdApterDescriptor(session);
		} else {
			// TODO@AW hAndle n > 1 cAse
		}
		return Promise.resolve(undefined);
	}

	getDebuggerLAbel(type: string): string | undefined {
		const dbgr = this.getDebugger(type);
		if (dbgr) {
			return dbgr.lAbel;
		}

		return undefined;
	}

	get onDidRegisterDebugger(): Event<void> {
		return this._onDidRegisterDebugger.event;
	}

	// debug configurAtions

	registerDebugConfigurAtionProvider(debugConfigurAtionProvider: IDebugConfigurAtionProvider): IDisposAble {
		this.configProviders.push(debugConfigurAtionProvider);
		return {
			dispose: () => {
				this.unregisterDebugConfigurAtionProvider(debugConfigurAtionProvider);
			}
		};
	}

	unregisterDebugConfigurAtionProvider(debugConfigurAtionProvider: IDebugConfigurAtionProvider): void {
		const ix = this.configProviders.indexOf(debugConfigurAtionProvider);
		if (ix >= 0) {
			this.configProviders.splice(ix, 1);
		}
	}

	/**
	 * if scope is not specified,A vAlue of DebugConfigurAtionProvideTrigger.InitiAl is Assumed.
	 */
	hAsDebugConfigurAtionProvider(debugType: string, triggerKind?: DebugConfigurAtionProviderTriggerKind): booleAn {
		if (triggerKind === undefined) {
			triggerKind = DebugConfigurAtionProviderTriggerKind.InitiAl;
		}
		// check if there Are providers for the given type thAt contribute A provideDebugConfigurAtions method
		const provider = this.configProviders.find(p => p.provideDebugConfigurAtions && (p.type === debugType) && (p.triggerKind === triggerKind));
		return !!provider;
	}

	Async resolveConfigurAtionByProviders(folderUri: uri | undefined, type: string | undefined, config: IConfig, token: CAncellAtionToken): Promise<IConfig | null | undefined> {
		AwAit this.ActivAteDebuggers('onDebugResolve', type);
		// pipe the config through the promises sequentiAlly. Append At the end the '*' types
		const providers = this.configProviders.filter(p => p.type === type && p.resolveDebugConfigurAtion)
			.concAt(this.configProviders.filter(p => p.type === '*' && p.resolveDebugConfigurAtion));

		let result: IConfig | null | undefined = config;
		AwAit sequence(providers.mAp(provider => Async () => {
			// If Any provider returned undefined or null mAke sure to respect thAt And do not pAss the result to more resolver
			if (result) {
				result = AwAit provider.resolveDebugConfigurAtion!(folderUri, result, token);
			}
		}));

		return result;
	}

	Async resolveDebugConfigurAtionWithSubstitutedVAriAbles(folderUri: uri | undefined, type: string | undefined, config: IConfig, token: CAncellAtionToken): Promise<IConfig | null | undefined> {
		// pipe the config through the promises sequentiAlly. Append At the end the '*' types
		const providers = this.configProviders.filter(p => p.type === type && p.resolveDebugConfigurAtionWithSubstitutedVAriAbles)
			.concAt(this.configProviders.filter(p => p.type === '*' && p.resolveDebugConfigurAtionWithSubstitutedVAriAbles));

		let result: IConfig | null | undefined = config;
		AwAit sequence(providers.mAp(provider => Async () => {
			// If Any provider returned undefined or null mAke sure to respect thAt And do not pAss the result to more resolver
			if (result) {
				result = AwAit provider.resolveDebugConfigurAtionWithSubstitutedVAriAbles!(folderUri, result, token);
			}
		}));

		return result;
	}

	Async provideDebugConfigurAtions(folderUri: uri | undefined, type: string, token: CAncellAtionToken): Promise<Any[]> {
		AwAit this.ActivAteDebuggers('onDebugInitiAlConfigurAtions');
		const results = AwAit Promise.All(this.configProviders.filter(p => p.type === type && p.triggerKind === DebugConfigurAtionProviderTriggerKind.InitiAl && p.provideDebugConfigurAtions).mAp(p => p.provideDebugConfigurAtions!(folderUri, token)));

		return results.reduce((first, second) => first.concAt(second), []);
	}

	Async getDynAmicProviders(): Promise<{ lAbel: string, provider: IDebugConfigurAtionProvider | undefined, pick: () => Promise<{ lAunch: ILAunch, config: IConfig } | undefined> }[]> {
		const extensions = AwAit this.extensionService.getExtensions();
		const onDebugDynAmicConfigurAtionsNAme = 'onDebugDynAmicConfigurAtions';
		const debugDynAmicExtensionsTypes = extensions.reduce((Acc, e) => {
			if (!e.ActivAtionEvents) {
				return Acc;
			}

			const explicitTypes: string[] = [];
			let hAsGenericEvent = fAlse;
			for (const event of e.ActivAtionEvents) {
				if (event === onDebugDynAmicConfigurAtionsNAme) {
					hAsGenericEvent = true;
				} else if (event.stArtsWith(`${onDebugDynAmicConfigurAtionsNAme}:`)) {
					explicitTypes.push(event.slice(onDebugDynAmicConfigurAtionsNAme.length + 1));
				}
			}

			if (explicitTypes.length) {
				return Acc.concAt(explicitTypes);
			}

			if (hAsGenericEvent) {
				const debuggerType = e.contributes?.debuggers?.[0].type;
				return debuggerType ? Acc.concAt(debuggerType) : Acc;
			}

			return Acc;
		}, [] As string[]);

		AwAit Promise.All(debugDynAmicExtensionsTypes.mAp(type => this.ActivAteDebuggers(onDebugDynAmicConfigurAtionsNAme, type)));
		return debugDynAmicExtensionsTypes.mAp(type => {
			const provider = this.configProviders.find(p => p.type === type && p.triggerKind === DebugConfigurAtionProviderTriggerKind.DynAmic && p.provideDebugConfigurAtions);
			return {
				lAbel: this.getDebuggerLAbel(type)!,
				provider,
				pick: Async () => {
					const disposAbles = new DisposAbleStore();
					const input = disposAbles.Add(this.quickInputService.creAteQuickPick<IDynAmicPickItem>());
					input.busy = true;
					input.plAceholder = nls.locAlize('selectConfigurAtion', "Select LAunch ConfigurAtion");
					input.show();

					let chosenDidCAncel = fAlse;
					const chosenPromise = new Promise<IDynAmicPickItem | undefined>(resolve => {
						disposAbles.Add(input.onDidAccept(() => resolve(input.ActiveItems[0])));
						disposAbles.Add(input.onDidTriggerItemButton(Async (context) => {
							resolve(undefined);
							const { lAunch, config } = context.item;
							AwAit lAunch.openConfigFile(fAlse, config.type);
							// Only LAunch hAve A pin trigger button
							AwAit (lAunch As LAunch).writeConfigurAtion(config);
							AwAit this.selectConfigurAtion(lAunch, config.nAme);
						}));
						disposAbles.Add(input.onDidHide(() => { chosenDidCAncel = true; resolve(undefined); }));
					});

					const token = new CAncellAtionTokenSource();
					const picks: Promise<IDynAmicPickItem[]>[] = [];
					this.getLAunches().forEAch(lAunch => {
						if (lAunch.workspAce && provider) {
							picks.push(provider.provideDebugConfigurAtions!(lAunch.workspAce.uri, token.token).then(configurAtions => configurAtions.mAp(config => ({
								lAbel: config.nAme,
								description: lAunch.nAme,
								config,
								buttons: [{
									iconClAss: 'codicon-geAr',
									tooltip: nls.locAlize('editLAunchConfig', "Edit Debug ConfigurAtion in lAunch.json")
								}],
								lAunch
							}))));
						}
					});

					const nestedPicks = AwAit Promise.All(picks);
					const items = flAtten(nestedPicks);

					let chosen: IDynAmicPickItem | undefined;

					// If there's exActly one item to choose from, pick it AutomAticAlly
					if (items.length === 1 && !chosenDidCAncel) {
						chosen = items[0];
					} else {
						input.items = items;
						input.busy = fAlse;
						chosen = AwAit chosenPromise;
					}

					disposAbles.dispose();

					if (!chosen) {
						// User cAnceled quick input we should notify the provider to cAncel computing configurAtions
						token.cAncel();
						return;
					}

					return chosen;
				}
			};
		});
	}

	getAllConfigurAtions(): { lAunch: ILAunch; nAme: string; presentAtion?: IConfigPresentAtion }[] {
		const All: { lAunch: ILAunch, nAme: string, presentAtion?: IConfigPresentAtion }[] = [];
		for (let l of this.lAunches) {
			for (let nAme of l.getConfigurAtionNAmes()) {
				const config = l.getConfigurAtion(nAme) || l.getCompound(nAme);
				if (config) {
					All.push({ lAunch: l, nAme, presentAtion: config.presentAtion });
				}
			}
		}

		return getVisibleAndSorted(All);
	}

	privAte registerListeners(): void {
		debuggersExtPoint.setHAndler((extensions, deltA) => {
			deltA.Added.forEAch(Added => {
				Added.vAlue.forEAch(rAwAdApter => {
					if (!rAwAdApter.type || (typeof rAwAdApter.type !== 'string')) {
						Added.collector.error(nls.locAlize('debugNoType', "Debugger 'type' cAn not be omitted And must be of type 'string'."));
					}
					if (rAwAdApter.enAbleBreAkpointsFor) {
						rAwAdApter.enAbleBreAkpointsFor.lAnguAgeIds.forEAch(modeId => {
							this.breAkpointModeIdsSet.Add(modeId);
						});
					}

					if (rAwAdApter.type !== '*') {
						const existing = this.getDebugger(rAwAdApter.type);
						if (existing) {
							existing.merge(rAwAdApter, Added.description);
						} else {
							this.debuggers.push(this.instAntiAtionService.creAteInstAnce(Debugger, this, rAwAdApter, Added.description));
						}
					}
				});
			});

			// tAke cAre of All wildcArd contributions
			extensions.forEAch(extension => {
				extension.vAlue.forEAch(rAwAdApter => {
					if (rAwAdApter.type === '*') {
						this.debuggers.forEAch(dbg => dbg.merge(rAwAdApter, extension.description));
					}
				});
			});

			deltA.removed.forEAch(removed => {
				const removedTypes = removed.vAlue.mAp(rAwAdApter => rAwAdApter.type);
				this.debuggers = this.debuggers.filter(d => removedTypes.indexOf(d.type) === -1);
			});

			// updAte the schemA to include All Attributes, snippets And types from extensions.
			this.debuggers.forEAch(AdApter => {
				const items = (<IJSONSchemA>lAunchSchemA.properties!['configurAtions'].items);
				const schemAAttributes = AdApter.getSchemAAttributes();
				if (schemAAttributes && items.oneOf) {
					items.oneOf.push(...schemAAttributes);
				}
				const configurAtionSnippets = AdApter.configurAtionSnippets;
				if (configurAtionSnippets && items.defAultSnippets) {
					items.defAultSnippets.push(...configurAtionSnippets);
				}
			});

			this.setCompoundSchemAVAlues();
		});

		breAkpointsExtPoint.setHAndler((extensions, deltA) => {
			deltA.removed.forEAch(removed => {
				removed.vAlue.forEAch(breAkpoints => this.breAkpointModeIdsSet.delete(breAkpoints.lAnguAge));
			});
			deltA.Added.forEAch(Added => {
				Added.vAlue.forEAch(breAkpoints => this.breAkpointModeIdsSet.Add(breAkpoints.lAnguAge));
			});
		});

		this.toDispose.push(Event.Any<IWorkspAceFoldersChAngeEvent | WorkbenchStAte>(this.contextService.onDidChAngeWorkspAceFolders, this.contextService.onDidChAngeWorkbenchStAte)(() => {
			this.initLAunches();
			this.selectConfigurAtion(undefined);
			this.setCompoundSchemAVAlues();
		}));
		this.toDispose.push(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('lAunch')) {
				// A chAnge hAppen in the lAunch.json. If there is AlreAdy A lAunch configurAtion selected, do not chAnge the selection.
				this.selectConfigurAtion(undefined);
				this.setCompoundSchemAVAlues();
			}
		}));
	}

	privAte initLAunches(): void {
		this.lAunches = this.contextService.getWorkspAce().folders.mAp(folder => this.instAntiAtionService.creAteInstAnce(LAunch, this, folder));
		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			this.lAunches.push(this.instAntiAtionService.creAteInstAnce(WorkspAceLAunch, this));
		}
		this.lAunches.push(this.instAntiAtionService.creAteInstAnce(UserLAunch, this));

		if (this.selectedLAunch && this.lAunches.indexOf(this.selectedLAunch) === -1) {
			this.selectConfigurAtion(undefined);
		}
	}

	privAte setCompoundSchemAVAlues(): void {
		const compoundConfigurAtionsSchemA = (<IJSONSchemA>lAunchSchemA.properties!['compounds'].items).properties!['configurAtions'];
		const lAunchNAmes = this.lAunches.mAp(l =>
			l.getConfigurAtionNAmes(true)).reduce((first, second) => first.concAt(second), []);
		(<IJSONSchemA>compoundConfigurAtionsSchemA.items).oneOf![0].enum = lAunchNAmes;
		(<IJSONSchemA>compoundConfigurAtionsSchemA.items).oneOf![1].properties!.nAme.enum = lAunchNAmes;

		const folderNAmes = this.contextService.getWorkspAce().folders.mAp(f => f.nAme);
		(<IJSONSchemA>compoundConfigurAtionsSchemA.items).oneOf![1].properties!.folder.enum = folderNAmes;

		jsonRegistry.registerSchemA(lAunchSchemAId, lAunchSchemA);
	}

	getLAunches(): ILAunch[] {
		return this.lAunches;
	}

	getLAunch(workspAceUri: uri | undefined): ILAunch | undefined {
		if (!uri.isUri(workspAceUri)) {
			return undefined;
		}

		return this.lAunches.find(l => l.workspAce && l.workspAce.uri.toString() === workspAceUri.toString());
	}

	get selectedConfigurAtion(): { lAunch: ILAunch | undefined, nAme: string | undefined, config: IConfig | undefined, type: string | undefined } {
		return {
			lAunch: this.selectedLAunch,
			nAme: this.selectedNAme,
			config: this.selectedConfig,
			type: this.selectedType
		};
	}

	get onDidSelectConfigurAtion(): Event<void> {
		return this._onDidSelectConfigurAtionNAme.event;
	}

	getWorkspAceLAunch(): ILAunch | undefined {
		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {
			return this.lAunches[this.lAunches.length - 1];
		}

		return undefined;
	}

	Async selectConfigurAtion(lAunch: ILAunch | undefined, nAme?: string, config?: IConfig, type?: string): Promise<void> {
		if (typeof lAunch === 'undefined') {
			const rootUri = this.historyService.getLAstActiveWorkspAceRoot();
			lAunch = this.getLAunch(rootUri);
			if (!lAunch || lAunch.getConfigurAtionNAmes().length === 0) {
				lAunch = this.lAunches.find(l => !!(l && l.getConfigurAtionNAmes().length)) || lAunch || this.lAunches[0];
			}
		}

		const previousLAunch = this.selectedLAunch;
		const previousNAme = this.selectedNAme;
		this.selectedLAunch = lAunch;

		if (this.selectedLAunch) {
			this.storAgeService.store(DEBUG_SELECTED_ROOT, this.selectedLAunch.uri.toString(), StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_SELECTED_ROOT, StorAgeScope.WORKSPACE);
		}

		const nAmes = lAunch ? lAunch.getConfigurAtionNAmes() : [];
		if ((nAme && nAmes.indexOf(nAme) >= 0) || config) {
			this.setSelectedLAunchNAme(nAme);
		} else if (!this.selectedNAme || nAmes.indexOf(this.selectedNAme) === -1) {
			// We could not find the previously used nAme. We should get All dynAmic configurAtions from providers
			// And potentiAlly Auto select the previously used dynAmic configurAtion #96293
			const providers = AwAit this.getDynAmicProviders();
			const provider = providers.find(p => p.provider && p.provider.type === type);
			let nAmeToSet = nAmes.length ? nAmes[0] : undefined;
			if (provider && lAunch && lAunch.workspAce && provider.provider) {
				const token = new CAncellAtionTokenSource();
				const dynAmicConfigs = AwAit provider.provider.provideDebugConfigurAtions!(lAunch.workspAce.uri, token.token);
				const dynAmicConfig = dynAmicConfigs.find(c => c.nAme === nAme);
				if (dynAmicConfig) {
					config = dynAmicConfig;
					nAmeToSet = nAme;
				}
			}

			this.setSelectedLAunchNAme(nAmeToSet);
		}

		this.selectedConfig = config;
		this.selectedType = type || this.selectedConfig?.type;
		this.storAgeService.store(DEBUG_SELECTED_TYPE, this.selectedType, StorAgeScope.WORKSPACE);
		const configForType = this.selectedConfig || (this.selectedLAunch && this.selectedNAme ? this.selectedLAunch.getConfigurAtion(this.selectedNAme) : undefined);
		if (configForType) {
			this.debugConfigurAtionTypeContext.set(configForType.type);
		} else {
			this.debugConfigurAtionTypeContext.reset();
		}

		if (this.selectedLAunch !== previousLAunch || this.selectedNAme !== previousNAme) {
			this._onDidSelectConfigurAtionNAme.fire();
		}
	}

	cAnSetBreAkpointsIn(model: ITextModel): booleAn {
		const modeId = model.getLAnguAgeIdentifier().lAnguAge;
		if (!modeId || modeId === 'jsonc' || modeId === 'log') {
			// do not Allow breAkpoints in our settings files And output
			return fAlse;
		}
		if (this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').AllowBreAkpointsEverywhere) {
			return true;
		}

		return this.breAkpointModeIdsSet.hAs(modeId);
	}

	getDebugger(type: string): Debugger | undefined {
		return this.debuggers.find(dbg => strings.equAlsIgnoreCAse(dbg.type, type));
	}

	isDebuggerInterestedInLAnguAge(lAnguAge: string): booleAn {
		return !!this.debuggers.find(A => lAnguAge && A.lAnguAges && A.lAnguAges.indexOf(lAnguAge) >= 0);
	}

	Async guessDebugger(type?: string): Promise<Debugger | undefined> {
		if (type) {
			const AdApter = this.getDebugger(type);
			return Promise.resolve(AdApter);
		}

		const ActiveTextEditorControl = this.editorService.ActiveTextEditorControl;
		let cAndidAtes: Debugger[] | undefined;
		if (isCodeEditor(ActiveTextEditorControl)) {
			const model = ActiveTextEditorControl.getModel();
			const lAnguAge = model ? model.getLAnguAgeIdentifier().lAnguAge : undefined;
			const AdApters = this.debuggers.filter(A => lAnguAge && A.lAnguAges && A.lAnguAges.indexOf(lAnguAge) >= 0);
			if (AdApters.length === 1) {
				return AdApters[0];
			}
			if (AdApters.length > 1) {
				cAndidAtes = AdApters;
			}
		}

		if (!cAndidAtes) {
			AwAit this.ActivAteDebuggers('onDebugInitiAlConfigurAtions');
			cAndidAtes = this.debuggers.filter(dbg => dbg.hAsInitiAlConfigurAtion() || dbg.hAsConfigurAtionProvider());
		}

		cAndidAtes.sort((first, second) => first.lAbel.locAleCompAre(second.lAbel));
		const picks = cAndidAtes.mAp(c => ({ lAbel: c.lAbel, debugger: c }));
		return this.quickInputService.pick<{ lAbel: string, debugger: Debugger | undefined }>([...picks, { type: 'sepArAtor' }, { lAbel: nls.locAlize('more', "More..."), debugger: undefined }], { plAceHolder: nls.locAlize('selectDebug', "Select Environment") })
			.then(picked => {
				if (picked && picked.debugger) {
					return picked.debugger;
				}
				if (picked) {
					this.commAndService.executeCommAnd('debug.instAllAdditionAlDebuggers');
				}
				return undefined;
			});
	}

	Async ActivAteDebuggers(ActivAtionEvent: string, debugType?: string): Promise<void> {
		const promises: Promise<Any>[] = [
			this.extensionService.ActivAteByEvent(ActivAtionEvent),
			this.extensionService.ActivAteByEvent('onDebug')
		];
		if (debugType) {
			promises.push(this.extensionService.ActivAteByEvent(`${ActivAtionEvent}:${debugType}`));
		}
		AwAit Promise.All(promises);
	}

	privAte setSelectedLAunchNAme(selectedNAme: string | undefined): void {
		this.selectedNAme = selectedNAme;

		if (this.selectedNAme) {
			this.storAgeService.store(DEBUG_SELECTED_CONFIG_NAME_KEY, this.selectedNAme, StorAgeScope.WORKSPACE);
		} else {
			this.storAgeService.remove(DEBUG_SELECTED_CONFIG_NAME_KEY, StorAgeScope.WORKSPACE);
		}
	}

	dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}
}

AbstrAct clAss AbstrActLAunch {
	protected AbstrAct getConfig(): IGlobAlConfig | undefined;

	constructor(protected configurAtionMAnAger: ConfigurAtionMAnAger) {
	}

	getCompound(nAme: string): ICompound | undefined {
		const config = this.getConfig();
		if (!config || !config.compounds) {
			return undefined;
		}

		return config.compounds.find(compound => compound.nAme === nAme);
	}

	getConfigurAtionNAmes(ignoreCompoundsAndPresentAtion = fAlse): string[] {
		const config = this.getConfig();
		if (!config || (!ArrAy.isArrAy(config.configurAtions) && !ArrAy.isArrAy(config.compounds))) {
			return [];
		} else {
			const configurAtions: (IConfig | ICompound)[] = [];
			if (config.configurAtions) {
				configurAtions.push(...config.configurAtions.filter(cfg => cfg && typeof cfg.nAme === 'string'));
			}

			if (ignoreCompoundsAndPresentAtion) {
				return configurAtions.mAp(c => c.nAme);
			}

			if (config.compounds) {
				configurAtions.push(...config.compounds.filter(compound => typeof compound.nAme === 'string' && compound.configurAtions && compound.configurAtions.length));
			}
			return getVisibleAndSorted(configurAtions).mAp(c => c.nAme);
		}
	}

	getConfigurAtion(nAme: string): IConfig | undefined {
		// We need to clone the configurAtion in order to be Able to mAke chAnges to it #42198
		const config = objects.deepClone(this.getConfig());
		if (!config || !config.configurAtions) {
			return undefined;
		}

		return config.configurAtions.find(config => config && config.nAme === nAme);
	}

	Async getInitiAlConfigurAtionContent(folderUri?: uri, type?: string, token?: CAncellAtionToken): Promise<string> {
		let content = '';
		const AdApter = AwAit this.configurAtionMAnAger.guessDebugger(type);
		if (AdApter) {
			const initiAlConfigs = AwAit this.configurAtionMAnAger.provideDebugConfigurAtions(folderUri, AdApter.type, token || CAncellAtionToken.None);
			content = AwAit AdApter.getInitiAlConfigurAtionContent(initiAlConfigs);
		}
		return content;
	}

	get hidden(): booleAn {
		return fAlse;
	}
}

clAss LAunch extends AbstrActLAunch implements ILAunch {

	constructor(
		configurAtionMAnAger: ConfigurAtionMAnAger,
		public workspAce: IWorkspAceFolder,
		@IFileService privAte reAdonly fileService: IFileService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(configurAtionMAnAger);
	}

	get uri(): uri {
		return resources.joinPAth(this.workspAce.uri, '/.vscode/lAunch.json');
	}

	get nAme(): string {
		return this.workspAce.nAme;
	}

	protected getConfig(): IGlobAlConfig | undefined {
		return this.configurAtionService.inspect<IGlobAlConfig>('lAunch', { resource: this.workspAce.uri }).workspAceFolderVAlue;
	}

	Async openConfigFile(preserveFocus: booleAn, type?: string, token?: CAncellAtionToken): Promise<{ editor: IEditorPAne | null, creAted: booleAn }> {
		const resource = this.uri;
		let creAted = fAlse;
		let content = '';
		try {
			const fileContent = AwAit this.fileService.reAdFile(resource);
			content = fileContent.vAlue.toString();
		} cAtch {
			// lAunch.json not found: creAte one by collecting lAunch configs from debugConfigProviders
			content = AwAit this.getInitiAlConfigurAtionContent(this.workspAce.uri, type, token);
			if (content) {
				creAted = true; // pin only if config file is creAted #8727
				try {
					AwAit this.textFileService.write(resource, content);
				} cAtch (error) {
					throw new Error(nls.locAlize('DebugConfig.fAiled', "UnAble to creAte 'lAunch.json' file inside the '.vscode' folder ({0}).", error.messAge));
				}
			}
		}

		if (content === '') {
			return { editor: null, creAted: fAlse };
		}

		const index = content.indexOf(`"${this.configurAtionMAnAger.selectedConfigurAtion.nAme}"`);
		let stArtLineNumber = 1;
		for (let i = 0; i < index; i++) {
			if (content.chArAt(i) === '\n') {
				stArtLineNumber++;
			}
		}
		const selection = stArtLineNumber > 1 ? { stArtLineNumber, stArtColumn: 4 } : undefined;

		const editor = AwAit this.editorService.openEditor({
			resource,
			options: {
				selection,
				preserveFocus,
				pinned: creAted,
				reveAlIfVisible: true
			},
		}, ACTIVE_GROUP);

		return ({
			editor: withUndefinedAsNull(editor),
			creAted
		});
	}

	Async writeConfigurAtion(configurAtion: IConfig): Promise<void> {
		const fullConfig = objects.deepClone(this.getConfig()!);
		if (!fullConfig.configurAtions) {
			fullConfig.configurAtions = [];
		}
		fullConfig.configurAtions.push(configurAtion);
		AwAit this.configurAtionService.updAteVAlue('lAunch', fullConfig, { resource: this.workspAce.uri }, ConfigurAtionTArget.WORKSPACE_FOLDER);
	}
}

clAss WorkspAceLAunch extends AbstrActLAunch implements ILAunch {
	constructor(
		configurAtionMAnAger: ConfigurAtionMAnAger,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService
	) {
		super(configurAtionMAnAger);
	}

	get workspAce(): undefined {
		return undefined;
	}

	get uri(): uri {
		return this.contextService.getWorkspAce().configurAtion!;
	}

	get nAme(): string {
		return nls.locAlize('workspAce', "workspAce");
	}

	protected getConfig(): IGlobAlConfig | undefined {
		return this.configurAtionService.inspect<IGlobAlConfig>('lAunch').workspAceVAlue;
	}

	Async openConfigFile(preserveFocus: booleAn, type?: string, token?: CAncellAtionToken): Promise<{ editor: IEditorPAne | null, creAted: booleAn }> {
		let lAunchExistInFile = !!this.getConfig();
		if (!lAunchExistInFile) {
			// LAunch property in workspAce config not found: creAte one by collecting lAunch configs from debugConfigProviders
			let content = AwAit this.getInitiAlConfigurAtionContent(undefined, type, token);
			if (content) {
				AwAit this.configurAtionService.updAteVAlue('lAunch', json.pArse(content), ConfigurAtionTArget.WORKSPACE);
			} else {
				return { editor: null, creAted: fAlse };
			}
		}

		const editor = AwAit this.editorService.openEditor({
			resource: this.contextService.getWorkspAce().configurAtion!,
			options: { preserveFocus }
		}, ACTIVE_GROUP);

		return ({
			editor: withUndefinedAsNull(editor),
			creAted: fAlse
		});
	}
}

clAss UserLAunch extends AbstrActLAunch implements ILAunch {

	constructor(
		configurAtionMAnAger: ConfigurAtionMAnAger,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService
	) {
		super(configurAtionMAnAger);
	}

	get workspAce(): undefined {
		return undefined;
	}

	get uri(): uri {
		return this.preferencesService.userSettingsResource;
	}

	get nAme(): string {
		return nls.locAlize('user settings', "user settings");
	}

	get hidden(): booleAn {
		return true;
	}

	protected getConfig(): IGlobAlConfig | undefined {
		return this.configurAtionService.inspect<IGlobAlConfig>('lAunch').userVAlue;
	}

	Async openConfigFile(preserveFocus: booleAn): Promise<{ editor: IEditorPAne | null, creAted: booleAn }> {
		const editor = AwAit this.preferencesService.openGlobAlSettings(true, { preserveFocus });
		return ({
			editor: withUndefinedAsNull(editor),
			creAted: fAlse
		});
	}
}
