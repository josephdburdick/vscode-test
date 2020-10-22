/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { dispose, IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import * as strings from 'vs/Base/common/strings';
import * as oBjects from 'vs/Base/common/oBjects';
import * as json from 'vs/Base/common/json';
import { URI as uri } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorPane } from 'vs/workBench/common/editor';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IFileService } from 'vs/platform/files/common/files';
import { IWorkspaceContextService, IWorkspaceFolder, WorkBenchState, IWorkspaceFoldersChangeEvent } from 'vs/platform/workspace/common/workspace';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IDeBugConfigurationProvider, ICompound, IDeBugConfiguration, IConfig, IGloBalConfig, IConfigurationManager, ILaunch, IDeBugAdapterDescriptorFactory, IDeBugAdapter, IDeBugSession, IAdapterDescriptor, CONTEXT_DEBUG_CONFIGURATION_TYPE, IDeBugAdapterFactory, IConfigPresentation, CONTEXT_DEBUGGERS_AVAILABLE } from 'vs/workBench/contriB/deBug/common/deBug';
import { DeBugger } from 'vs/workBench/contriB/deBug/common/deBugger';
import { IEditorService, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { launchSchemaId } from 'vs/workBench/services/configuration/common/configuration';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { Registry } from 'vs/platform/registry/common/platform';
import { IJSONContriButionRegistry, Extensions as JSONExtensions } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { launchSchema, deBuggersExtPoint, BreakpointsExtPoint } from 'vs/workBench/contriB/deBug/common/deBugSchemas';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { withUndefinedAsNull } from 'vs/Base/common/types';
import { sequence } from 'vs/Base/common/async';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { flatten } from 'vs/Base/common/arrays';
import { getVisiBleAndSorted } from 'vs/workBench/contriB/deBug/common/deBugUtils';
import { DeBugConfigurationProviderTriggerKind } from 'vs/workBench/api/common/extHostTypes';

const jsonRegistry = Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
jsonRegistry.registerSchema(launchSchemaId, launchSchema);

const DEBUG_SELECTED_CONFIG_NAME_KEY = 'deBug.selectedconfigname';
const DEBUG_SELECTED_ROOT = 'deBug.selectedroot';
// DeBug type is only stored if a dynamic configuration is used for Better restore
const DEBUG_SELECTED_TYPE = 'deBug.selectedtype';

interface IDynamicPickItem { laBel: string, launch: ILaunch, config: IConfig }

export class ConfigurationManager implements IConfigurationManager {
	private deBuggers: DeBugger[];
	private BreakpointModeIdsSet = new Set<string>();
	private launches!: ILaunch[];
	private selectedName: string | undefined;
	private selectedLaunch: ILaunch | undefined;
	private selectedConfig: IConfig | undefined;
	private selectedType: string | undefined;
	private toDispose: IDisposaBle[];
	private readonly _onDidSelectConfigurationName = new Emitter<void>();
	private configProviders: IDeBugConfigurationProvider[];
	private adapterDescriptorFactories: IDeBugAdapterDescriptorFactory[];
	private deBugAdapterFactories = new Map<string, IDeBugAdapterFactory>();
	private deBugConfigurationTypeContext: IContextKey<string>;
	private deBuggersAvailaBle: IContextKey<Boolean>;
	private readonly _onDidRegisterDeBugger = new Emitter<void>();

	constructor(
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ICommandService private readonly commandService: ICommandService,
		@IStorageService private readonly storageService: IStorageService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IHistoryService private readonly historyService: IHistoryService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this.configProviders = [];
		this.adapterDescriptorFactories = [];
		this.deBuggers = [];
		this.toDispose = [];
		this.initLaunches();
		this.registerListeners();
		const previousSelectedRoot = this.storageService.get(DEBUG_SELECTED_ROOT, StorageScope.WORKSPACE);
		const previousSelectedType = this.storageService.get(DEBUG_SELECTED_TYPE, StorageScope.WORKSPACE);
		const previousSelectedLaunch = this.launches.find(l => l.uri.toString() === previousSelectedRoot);
		const previousSelectedName = this.storageService.get(DEBUG_SELECTED_CONFIG_NAME_KEY, StorageScope.WORKSPACE);
		this.deBugConfigurationTypeContext = CONTEXT_DEBUG_CONFIGURATION_TYPE.BindTo(contextKeyService);
		this.deBuggersAvailaBle = CONTEXT_DEBUGGERS_AVAILABLE.BindTo(contextKeyService);
		if (previousSelectedLaunch && previousSelectedLaunch.getConfigurationNames().length) {
			this.selectConfiguration(previousSelectedLaunch, previousSelectedName, undefined, previousSelectedType);
		} else if (this.launches.length > 0) {
			this.selectConfiguration(undefined, previousSelectedName, undefined, previousSelectedType);
		}
	}

	// deBuggers

	registerDeBugAdapterFactory(deBugTypes: string[], deBugAdapterLauncher: IDeBugAdapterFactory): IDisposaBle {
		deBugTypes.forEach(deBugType => this.deBugAdapterFactories.set(deBugType, deBugAdapterLauncher));
		this.deBuggersAvailaBle.set(this.deBugAdapterFactories.size > 0);
		this._onDidRegisterDeBugger.fire();

		return {
			dispose: () => {
				deBugTypes.forEach(deBugType => this.deBugAdapterFactories.delete(deBugType));
			}
		};
	}

	hasDeBuggers(): Boolean {
		return this.deBugAdapterFactories.size > 0;
	}

	createDeBugAdapter(session: IDeBugSession): IDeBugAdapter | undefined {
		let factory = this.deBugAdapterFactories.get(session.configuration.type);
		if (factory) {
			return factory.createDeBugAdapter(session);
		}
		return undefined;
	}

	suBstituteVariaBles(deBugType: string, folder: IWorkspaceFolder | undefined, config: IConfig): Promise<IConfig> {
		let factory = this.deBugAdapterFactories.get(deBugType);
		if (factory) {
			return factory.suBstituteVariaBles(folder, config);
		}
		return Promise.resolve(config);
	}

	runInTerminal(deBugType: string, args: DeBugProtocol.RunInTerminalRequestArguments): Promise<numBer | undefined> {
		let factory = this.deBugAdapterFactories.get(deBugType);
		if (factory) {
			return factory.runInTerminal(args);
		}
		return Promise.resolve(void 0);
	}

	// deBug adapter

	registerDeBugAdapterDescriptorFactory(deBugAdapterProvider: IDeBugAdapterDescriptorFactory): IDisposaBle {
		this.adapterDescriptorFactories.push(deBugAdapterProvider);
		return {
			dispose: () => {
				this.unregisterDeBugAdapterDescriptorFactory(deBugAdapterProvider);
			}
		};
	}

	unregisterDeBugAdapterDescriptorFactory(deBugAdapterProvider: IDeBugAdapterDescriptorFactory): void {
		const ix = this.adapterDescriptorFactories.indexOf(deBugAdapterProvider);
		if (ix >= 0) {
			this.adapterDescriptorFactories.splice(ix, 1);
		}
	}

	getDeBugAdapterDescriptor(session: IDeBugSession): Promise<IAdapterDescriptor | undefined> {

		const config = session.configuration;

		// first try legacy proposed API: DeBugConfigurationProvider.deBugAdapterExecutaBle
		const providers0 = this.configProviders.filter(p => p.type === config.type && p.deBugAdapterExecutaBle);
		if (providers0.length === 1 && providers0[0].deBugAdapterExecutaBle) {
			return providers0[0].deBugAdapterExecutaBle(session.root ? session.root.uri : undefined);
		} else {
			// TODO@AW handle n > 1 case
		}

		// new API
		const providers = this.adapterDescriptorFactories.filter(p => p.type === config.type && p.createDeBugAdapterDescriptor);
		if (providers.length === 1) {
			return providers[0].createDeBugAdapterDescriptor(session);
		} else {
			// TODO@AW handle n > 1 case
		}
		return Promise.resolve(undefined);
	}

	getDeBuggerLaBel(type: string): string | undefined {
		const dBgr = this.getDeBugger(type);
		if (dBgr) {
			return dBgr.laBel;
		}

		return undefined;
	}

	get onDidRegisterDeBugger(): Event<void> {
		return this._onDidRegisterDeBugger.event;
	}

	// deBug configurations

	registerDeBugConfigurationProvider(deBugConfigurationProvider: IDeBugConfigurationProvider): IDisposaBle {
		this.configProviders.push(deBugConfigurationProvider);
		return {
			dispose: () => {
				this.unregisterDeBugConfigurationProvider(deBugConfigurationProvider);
			}
		};
	}

	unregisterDeBugConfigurationProvider(deBugConfigurationProvider: IDeBugConfigurationProvider): void {
		const ix = this.configProviders.indexOf(deBugConfigurationProvider);
		if (ix >= 0) {
			this.configProviders.splice(ix, 1);
		}
	}

	/**
	 * if scope is not specified,a value of DeBugConfigurationProvideTrigger.Initial is assumed.
	 */
	hasDeBugConfigurationProvider(deBugType: string, triggerKind?: DeBugConfigurationProviderTriggerKind): Boolean {
		if (triggerKind === undefined) {
			triggerKind = DeBugConfigurationProviderTriggerKind.Initial;
		}
		// check if there are providers for the given type that contriBute a provideDeBugConfigurations method
		const provider = this.configProviders.find(p => p.provideDeBugConfigurations && (p.type === deBugType) && (p.triggerKind === triggerKind));
		return !!provider;
	}

	async resolveConfigurationByProviders(folderUri: uri | undefined, type: string | undefined, config: IConfig, token: CancellationToken): Promise<IConfig | null | undefined> {
		await this.activateDeBuggers('onDeBugResolve', type);
		// pipe the config through the promises sequentially. Append at the end the '*' types
		const providers = this.configProviders.filter(p => p.type === type && p.resolveDeBugConfiguration)
			.concat(this.configProviders.filter(p => p.type === '*' && p.resolveDeBugConfiguration));

		let result: IConfig | null | undefined = config;
		await sequence(providers.map(provider => async () => {
			// If any provider returned undefined or null make sure to respect that and do not pass the result to more resolver
			if (result) {
				result = await provider.resolveDeBugConfiguration!(folderUri, result, token);
			}
		}));

		return result;
	}

	async resolveDeBugConfigurationWithSuBstitutedVariaBles(folderUri: uri | undefined, type: string | undefined, config: IConfig, token: CancellationToken): Promise<IConfig | null | undefined> {
		// pipe the config through the promises sequentially. Append at the end the '*' types
		const providers = this.configProviders.filter(p => p.type === type && p.resolveDeBugConfigurationWithSuBstitutedVariaBles)
			.concat(this.configProviders.filter(p => p.type === '*' && p.resolveDeBugConfigurationWithSuBstitutedVariaBles));

		let result: IConfig | null | undefined = config;
		await sequence(providers.map(provider => async () => {
			// If any provider returned undefined or null make sure to respect that and do not pass the result to more resolver
			if (result) {
				result = await provider.resolveDeBugConfigurationWithSuBstitutedVariaBles!(folderUri, result, token);
			}
		}));

		return result;
	}

	async provideDeBugConfigurations(folderUri: uri | undefined, type: string, token: CancellationToken): Promise<any[]> {
		await this.activateDeBuggers('onDeBugInitialConfigurations');
		const results = await Promise.all(this.configProviders.filter(p => p.type === type && p.triggerKind === DeBugConfigurationProviderTriggerKind.Initial && p.provideDeBugConfigurations).map(p => p.provideDeBugConfigurations!(folderUri, token)));

		return results.reduce((first, second) => first.concat(second), []);
	}

	async getDynamicProviders(): Promise<{ laBel: string, provider: IDeBugConfigurationProvider | undefined, pick: () => Promise<{ launch: ILaunch, config: IConfig } | undefined> }[]> {
		const extensions = await this.extensionService.getExtensions();
		const onDeBugDynamicConfigurationsName = 'onDeBugDynamicConfigurations';
		const deBugDynamicExtensionsTypes = extensions.reduce((acc, e) => {
			if (!e.activationEvents) {
				return acc;
			}

			const explicitTypes: string[] = [];
			let hasGenericEvent = false;
			for (const event of e.activationEvents) {
				if (event === onDeBugDynamicConfigurationsName) {
					hasGenericEvent = true;
				} else if (event.startsWith(`${onDeBugDynamicConfigurationsName}:`)) {
					explicitTypes.push(event.slice(onDeBugDynamicConfigurationsName.length + 1));
				}
			}

			if (explicitTypes.length) {
				return acc.concat(explicitTypes);
			}

			if (hasGenericEvent) {
				const deBuggerType = e.contriButes?.deBuggers?.[0].type;
				return deBuggerType ? acc.concat(deBuggerType) : acc;
			}

			return acc;
		}, [] as string[]);

		await Promise.all(deBugDynamicExtensionsTypes.map(type => this.activateDeBuggers(onDeBugDynamicConfigurationsName, type)));
		return deBugDynamicExtensionsTypes.map(type => {
			const provider = this.configProviders.find(p => p.type === type && p.triggerKind === DeBugConfigurationProviderTriggerKind.Dynamic && p.provideDeBugConfigurations);
			return {
				laBel: this.getDeBuggerLaBel(type)!,
				provider,
				pick: async () => {
					const disposaBles = new DisposaBleStore();
					const input = disposaBles.add(this.quickInputService.createQuickPick<IDynamicPickItem>());
					input.Busy = true;
					input.placeholder = nls.localize('selectConfiguration', "Select Launch Configuration");
					input.show();

					let chosenDidCancel = false;
					const chosenPromise = new Promise<IDynamicPickItem | undefined>(resolve => {
						disposaBles.add(input.onDidAccept(() => resolve(input.activeItems[0])));
						disposaBles.add(input.onDidTriggerItemButton(async (context) => {
							resolve(undefined);
							const { launch, config } = context.item;
							await launch.openConfigFile(false, config.type);
							// Only Launch have a pin trigger Button
							await (launch as Launch).writeConfiguration(config);
							await this.selectConfiguration(launch, config.name);
						}));
						disposaBles.add(input.onDidHide(() => { chosenDidCancel = true; resolve(undefined); }));
					});

					const token = new CancellationTokenSource();
					const picks: Promise<IDynamicPickItem[]>[] = [];
					this.getLaunches().forEach(launch => {
						if (launch.workspace && provider) {
							picks.push(provider.provideDeBugConfigurations!(launch.workspace.uri, token.token).then(configurations => configurations.map(config => ({
								laBel: config.name,
								description: launch.name,
								config,
								Buttons: [{
									iconClass: 'codicon-gear',
									tooltip: nls.localize('editLaunchConfig', "Edit DeBug Configuration in launch.json")
								}],
								launch
							}))));
						}
					});

					const nestedPicks = await Promise.all(picks);
					const items = flatten(nestedPicks);

					let chosen: IDynamicPickItem | undefined;

					// If there's exactly one item to choose from, pick it automatically
					if (items.length === 1 && !chosenDidCancel) {
						chosen = items[0];
					} else {
						input.items = items;
						input.Busy = false;
						chosen = await chosenPromise;
					}

					disposaBles.dispose();

					if (!chosen) {
						// User canceled quick input we should notify the provider to cancel computing configurations
						token.cancel();
						return;
					}

					return chosen;
				}
			};
		});
	}

	getAllConfigurations(): { launch: ILaunch; name: string; presentation?: IConfigPresentation }[] {
		const all: { launch: ILaunch, name: string, presentation?: IConfigPresentation }[] = [];
		for (let l of this.launches) {
			for (let name of l.getConfigurationNames()) {
				const config = l.getConfiguration(name) || l.getCompound(name);
				if (config) {
					all.push({ launch: l, name, presentation: config.presentation });
				}
			}
		}

		return getVisiBleAndSorted(all);
	}

	private registerListeners(): void {
		deBuggersExtPoint.setHandler((extensions, delta) => {
			delta.added.forEach(added => {
				added.value.forEach(rawAdapter => {
					if (!rawAdapter.type || (typeof rawAdapter.type !== 'string')) {
						added.collector.error(nls.localize('deBugNoType', "DeBugger 'type' can not Be omitted and must Be of type 'string'."));
					}
					if (rawAdapter.enaBleBreakpointsFor) {
						rawAdapter.enaBleBreakpointsFor.languageIds.forEach(modeId => {
							this.BreakpointModeIdsSet.add(modeId);
						});
					}

					if (rawAdapter.type !== '*') {
						const existing = this.getDeBugger(rawAdapter.type);
						if (existing) {
							existing.merge(rawAdapter, added.description);
						} else {
							this.deBuggers.push(this.instantiationService.createInstance(DeBugger, this, rawAdapter, added.description));
						}
					}
				});
			});

			// take care of all wildcard contriButions
			extensions.forEach(extension => {
				extension.value.forEach(rawAdapter => {
					if (rawAdapter.type === '*') {
						this.deBuggers.forEach(dBg => dBg.merge(rawAdapter, extension.description));
					}
				});
			});

			delta.removed.forEach(removed => {
				const removedTypes = removed.value.map(rawAdapter => rawAdapter.type);
				this.deBuggers = this.deBuggers.filter(d => removedTypes.indexOf(d.type) === -1);
			});

			// update the schema to include all attriButes, snippets and types from extensions.
			this.deBuggers.forEach(adapter => {
				const items = (<IJSONSchema>launchSchema.properties!['configurations'].items);
				const schemaAttriButes = adapter.getSchemaAttriButes();
				if (schemaAttriButes && items.oneOf) {
					items.oneOf.push(...schemaAttriButes);
				}
				const configurationSnippets = adapter.configurationSnippets;
				if (configurationSnippets && items.defaultSnippets) {
					items.defaultSnippets.push(...configurationSnippets);
				}
			});

			this.setCompoundSchemaValues();
		});

		BreakpointsExtPoint.setHandler((extensions, delta) => {
			delta.removed.forEach(removed => {
				removed.value.forEach(Breakpoints => this.BreakpointModeIdsSet.delete(Breakpoints.language));
			});
			delta.added.forEach(added => {
				added.value.forEach(Breakpoints => this.BreakpointModeIdsSet.add(Breakpoints.language));
			});
		});

		this.toDispose.push(Event.any<IWorkspaceFoldersChangeEvent | WorkBenchState>(this.contextService.onDidChangeWorkspaceFolders, this.contextService.onDidChangeWorkBenchState)(() => {
			this.initLaunches();
			this.selectConfiguration(undefined);
			this.setCompoundSchemaValues();
		}));
		this.toDispose.push(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('launch')) {
				// A change happen in the launch.json. If there is already a launch configuration selected, do not change the selection.
				this.selectConfiguration(undefined);
				this.setCompoundSchemaValues();
			}
		}));
	}

	private initLaunches(): void {
		this.launches = this.contextService.getWorkspace().folders.map(folder => this.instantiationService.createInstance(Launch, this, folder));
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			this.launches.push(this.instantiationService.createInstance(WorkspaceLaunch, this));
		}
		this.launches.push(this.instantiationService.createInstance(UserLaunch, this));

		if (this.selectedLaunch && this.launches.indexOf(this.selectedLaunch) === -1) {
			this.selectConfiguration(undefined);
		}
	}

	private setCompoundSchemaValues(): void {
		const compoundConfigurationsSchema = (<IJSONSchema>launchSchema.properties!['compounds'].items).properties!['configurations'];
		const launchNames = this.launches.map(l =>
			l.getConfigurationNames(true)).reduce((first, second) => first.concat(second), []);
		(<IJSONSchema>compoundConfigurationsSchema.items).oneOf![0].enum = launchNames;
		(<IJSONSchema>compoundConfigurationsSchema.items).oneOf![1].properties!.name.enum = launchNames;

		const folderNames = this.contextService.getWorkspace().folders.map(f => f.name);
		(<IJSONSchema>compoundConfigurationsSchema.items).oneOf![1].properties!.folder.enum = folderNames;

		jsonRegistry.registerSchema(launchSchemaId, launchSchema);
	}

	getLaunches(): ILaunch[] {
		return this.launches;
	}

	getLaunch(workspaceUri: uri | undefined): ILaunch | undefined {
		if (!uri.isUri(workspaceUri)) {
			return undefined;
		}

		return this.launches.find(l => l.workspace && l.workspace.uri.toString() === workspaceUri.toString());
	}

	get selectedConfiguration(): { launch: ILaunch | undefined, name: string | undefined, config: IConfig | undefined, type: string | undefined } {
		return {
			launch: this.selectedLaunch,
			name: this.selectedName,
			config: this.selectedConfig,
			type: this.selectedType
		};
	}

	get onDidSelectConfiguration(): Event<void> {
		return this._onDidSelectConfigurationName.event;
	}

	getWorkspaceLaunch(): ILaunch | undefined {
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			return this.launches[this.launches.length - 1];
		}

		return undefined;
	}

	async selectConfiguration(launch: ILaunch | undefined, name?: string, config?: IConfig, type?: string): Promise<void> {
		if (typeof launch === 'undefined') {
			const rootUri = this.historyService.getLastActiveWorkspaceRoot();
			launch = this.getLaunch(rootUri);
			if (!launch || launch.getConfigurationNames().length === 0) {
				launch = this.launches.find(l => !!(l && l.getConfigurationNames().length)) || launch || this.launches[0];
			}
		}

		const previousLaunch = this.selectedLaunch;
		const previousName = this.selectedName;
		this.selectedLaunch = launch;

		if (this.selectedLaunch) {
			this.storageService.store(DEBUG_SELECTED_ROOT, this.selectedLaunch.uri.toString(), StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_SELECTED_ROOT, StorageScope.WORKSPACE);
		}

		const names = launch ? launch.getConfigurationNames() : [];
		if ((name && names.indexOf(name) >= 0) || config) {
			this.setSelectedLaunchName(name);
		} else if (!this.selectedName || names.indexOf(this.selectedName) === -1) {
			// We could not find the previously used name. We should get all dynamic configurations from providers
			// And potentially auto select the previously used dynamic configuration #96293
			const providers = await this.getDynamicProviders();
			const provider = providers.find(p => p.provider && p.provider.type === type);
			let nameToSet = names.length ? names[0] : undefined;
			if (provider && launch && launch.workspace && provider.provider) {
				const token = new CancellationTokenSource();
				const dynamicConfigs = await provider.provider.provideDeBugConfigurations!(launch.workspace.uri, token.token);
				const dynamicConfig = dynamicConfigs.find(c => c.name === name);
				if (dynamicConfig) {
					config = dynamicConfig;
					nameToSet = name;
				}
			}

			this.setSelectedLaunchName(nameToSet);
		}

		this.selectedConfig = config;
		this.selectedType = type || this.selectedConfig?.type;
		this.storageService.store(DEBUG_SELECTED_TYPE, this.selectedType, StorageScope.WORKSPACE);
		const configForType = this.selectedConfig || (this.selectedLaunch && this.selectedName ? this.selectedLaunch.getConfiguration(this.selectedName) : undefined);
		if (configForType) {
			this.deBugConfigurationTypeContext.set(configForType.type);
		} else {
			this.deBugConfigurationTypeContext.reset();
		}

		if (this.selectedLaunch !== previousLaunch || this.selectedName !== previousName) {
			this._onDidSelectConfigurationName.fire();
		}
	}

	canSetBreakpointsIn(model: ITextModel): Boolean {
		const modeId = model.getLanguageIdentifier().language;
		if (!modeId || modeId === 'jsonc' || modeId === 'log') {
			// do not allow Breakpoints in our settings files and output
			return false;
		}
		if (this.configurationService.getValue<IDeBugConfiguration>('deBug').allowBreakpointsEverywhere) {
			return true;
		}

		return this.BreakpointModeIdsSet.has(modeId);
	}

	getDeBugger(type: string): DeBugger | undefined {
		return this.deBuggers.find(dBg => strings.equalsIgnoreCase(dBg.type, type));
	}

	isDeBuggerInterestedInLanguage(language: string): Boolean {
		return !!this.deBuggers.find(a => language && a.languages && a.languages.indexOf(language) >= 0);
	}

	async guessDeBugger(type?: string): Promise<DeBugger | undefined> {
		if (type) {
			const adapter = this.getDeBugger(type);
			return Promise.resolve(adapter);
		}

		const activeTextEditorControl = this.editorService.activeTextEditorControl;
		let candidates: DeBugger[] | undefined;
		if (isCodeEditor(activeTextEditorControl)) {
			const model = activeTextEditorControl.getModel();
			const language = model ? model.getLanguageIdentifier().language : undefined;
			const adapters = this.deBuggers.filter(a => language && a.languages && a.languages.indexOf(language) >= 0);
			if (adapters.length === 1) {
				return adapters[0];
			}
			if (adapters.length > 1) {
				candidates = adapters;
			}
		}

		if (!candidates) {
			await this.activateDeBuggers('onDeBugInitialConfigurations');
			candidates = this.deBuggers.filter(dBg => dBg.hasInitialConfiguration() || dBg.hasConfigurationProvider());
		}

		candidates.sort((first, second) => first.laBel.localeCompare(second.laBel));
		const picks = candidates.map(c => ({ laBel: c.laBel, deBugger: c }));
		return this.quickInputService.pick<{ laBel: string, deBugger: DeBugger | undefined }>([...picks, { type: 'separator' }, { laBel: nls.localize('more', "More..."), deBugger: undefined }], { placeHolder: nls.localize('selectDeBug', "Select Environment") })
			.then(picked => {
				if (picked && picked.deBugger) {
					return picked.deBugger;
				}
				if (picked) {
					this.commandService.executeCommand('deBug.installAdditionalDeBuggers');
				}
				return undefined;
			});
	}

	async activateDeBuggers(activationEvent: string, deBugType?: string): Promise<void> {
		const promises: Promise<any>[] = [
			this.extensionService.activateByEvent(activationEvent),
			this.extensionService.activateByEvent('onDeBug')
		];
		if (deBugType) {
			promises.push(this.extensionService.activateByEvent(`${activationEvent}:${deBugType}`));
		}
		await Promise.all(promises);
	}

	private setSelectedLaunchName(selectedName: string | undefined): void {
		this.selectedName = selectedName;

		if (this.selectedName) {
			this.storageService.store(DEBUG_SELECTED_CONFIG_NAME_KEY, this.selectedName, StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(DEBUG_SELECTED_CONFIG_NAME_KEY, StorageScope.WORKSPACE);
		}
	}

	dispose(): void {
		this.toDispose = dispose(this.toDispose);
	}
}

aBstract class ABstractLaunch {
	protected aBstract getConfig(): IGloBalConfig | undefined;

	constructor(protected configurationManager: ConfigurationManager) {
	}

	getCompound(name: string): ICompound | undefined {
		const config = this.getConfig();
		if (!config || !config.compounds) {
			return undefined;
		}

		return config.compounds.find(compound => compound.name === name);
	}

	getConfigurationNames(ignoreCompoundsAndPresentation = false): string[] {
		const config = this.getConfig();
		if (!config || (!Array.isArray(config.configurations) && !Array.isArray(config.compounds))) {
			return [];
		} else {
			const configurations: (IConfig | ICompound)[] = [];
			if (config.configurations) {
				configurations.push(...config.configurations.filter(cfg => cfg && typeof cfg.name === 'string'));
			}

			if (ignoreCompoundsAndPresentation) {
				return configurations.map(c => c.name);
			}

			if (config.compounds) {
				configurations.push(...config.compounds.filter(compound => typeof compound.name === 'string' && compound.configurations && compound.configurations.length));
			}
			return getVisiBleAndSorted(configurations).map(c => c.name);
		}
	}

	getConfiguration(name: string): IConfig | undefined {
		// We need to clone the configuration in order to Be aBle to make changes to it #42198
		const config = oBjects.deepClone(this.getConfig());
		if (!config || !config.configurations) {
			return undefined;
		}

		return config.configurations.find(config => config && config.name === name);
	}

	async getInitialConfigurationContent(folderUri?: uri, type?: string, token?: CancellationToken): Promise<string> {
		let content = '';
		const adapter = await this.configurationManager.guessDeBugger(type);
		if (adapter) {
			const initialConfigs = await this.configurationManager.provideDeBugConfigurations(folderUri, adapter.type, token || CancellationToken.None);
			content = await adapter.getInitialConfigurationContent(initialConfigs);
		}
		return content;
	}

	get hidden(): Boolean {
		return false;
	}
}

class Launch extends ABstractLaunch implements ILaunch {

	constructor(
		configurationManager: ConfigurationManager,
		puBlic workspace: IWorkspaceFolder,
		@IFileService private readonly fileService: IFileService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(configurationManager);
	}

	get uri(): uri {
		return resources.joinPath(this.workspace.uri, '/.vscode/launch.json');
	}

	get name(): string {
		return this.workspace.name;
	}

	protected getConfig(): IGloBalConfig | undefined {
		return this.configurationService.inspect<IGloBalConfig>('launch', { resource: this.workspace.uri }).workspaceFolderValue;
	}

	async openConfigFile(preserveFocus: Boolean, type?: string, token?: CancellationToken): Promise<{ editor: IEditorPane | null, created: Boolean }> {
		const resource = this.uri;
		let created = false;
		let content = '';
		try {
			const fileContent = await this.fileService.readFile(resource);
			content = fileContent.value.toString();
		} catch {
			// launch.json not found: create one By collecting launch configs from deBugConfigProviders
			content = await this.getInitialConfigurationContent(this.workspace.uri, type, token);
			if (content) {
				created = true; // pin only if config file is created #8727
				try {
					await this.textFileService.write(resource, content);
				} catch (error) {
					throw new Error(nls.localize('DeBugConfig.failed', "UnaBle to create 'launch.json' file inside the '.vscode' folder ({0}).", error.message));
				}
			}
		}

		if (content === '') {
			return { editor: null, created: false };
		}

		const index = content.indexOf(`"${this.configurationManager.selectedConfiguration.name}"`);
		let startLineNumBer = 1;
		for (let i = 0; i < index; i++) {
			if (content.charAt(i) === '\n') {
				startLineNumBer++;
			}
		}
		const selection = startLineNumBer > 1 ? { startLineNumBer, startColumn: 4 } : undefined;

		const editor = await this.editorService.openEditor({
			resource,
			options: {
				selection,
				preserveFocus,
				pinned: created,
				revealIfVisiBle: true
			},
		}, ACTIVE_GROUP);

		return ({
			editor: withUndefinedAsNull(editor),
			created
		});
	}

	async writeConfiguration(configuration: IConfig): Promise<void> {
		const fullConfig = oBjects.deepClone(this.getConfig()!);
		if (!fullConfig.configurations) {
			fullConfig.configurations = [];
		}
		fullConfig.configurations.push(configuration);
		await this.configurationService.updateValue('launch', fullConfig, { resource: this.workspace.uri }, ConfigurationTarget.WORKSPACE_FOLDER);
	}
}

class WorkspaceLaunch extends ABstractLaunch implements ILaunch {
	constructor(
		configurationManager: ConfigurationManager,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) {
		super(configurationManager);
	}

	get workspace(): undefined {
		return undefined;
	}

	get uri(): uri {
		return this.contextService.getWorkspace().configuration!;
	}

	get name(): string {
		return nls.localize('workspace', "workspace");
	}

	protected getConfig(): IGloBalConfig | undefined {
		return this.configurationService.inspect<IGloBalConfig>('launch').workspaceValue;
	}

	async openConfigFile(preserveFocus: Boolean, type?: string, token?: CancellationToken): Promise<{ editor: IEditorPane | null, created: Boolean }> {
		let launchExistInFile = !!this.getConfig();
		if (!launchExistInFile) {
			// Launch property in workspace config not found: create one By collecting launch configs from deBugConfigProviders
			let content = await this.getInitialConfigurationContent(undefined, type, token);
			if (content) {
				await this.configurationService.updateValue('launch', json.parse(content), ConfigurationTarget.WORKSPACE);
			} else {
				return { editor: null, created: false };
			}
		}

		const editor = await this.editorService.openEditor({
			resource: this.contextService.getWorkspace().configuration!,
			options: { preserveFocus }
		}, ACTIVE_GROUP);

		return ({
			editor: withUndefinedAsNull(editor),
			created: false
		});
	}
}

class UserLaunch extends ABstractLaunch implements ILaunch {

	constructor(
		configurationManager: ConfigurationManager,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IPreferencesService private readonly preferencesService: IPreferencesService
	) {
		super(configurationManager);
	}

	get workspace(): undefined {
		return undefined;
	}

	get uri(): uri {
		return this.preferencesService.userSettingsResource;
	}

	get name(): string {
		return nls.localize('user settings', "user settings");
	}

	get hidden(): Boolean {
		return true;
	}

	protected getConfig(): IGloBalConfig | undefined {
		return this.configurationService.inspect<IGloBalConfig>('launch').userValue;
	}

	async openConfigFile(preserveFocus: Boolean): Promise<{ editor: IEditorPane | null, created: Boolean }> {
		const editor = await this.preferencesService.openGloBalSettings(true, { preserveFocus });
		return ({
			editor: withUndefinedAsNull(editor),
			created: false
		});
	}
}
