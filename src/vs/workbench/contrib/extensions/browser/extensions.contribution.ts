/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { KeyMod, KeyChord, KeyCode } from 'vs/Base/common/keyCodes';
import { Registry } from 'vs/platform/registry/common/platform';
import { MenuRegistry, MenuId, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ExtensionsLaBel, ExtensionsLocalizedLaBel, ExtensionsChannelId, IExtensionManagementService, IExtensionGalleryService, PreferencesLocalizedLaBel } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IOutputChannelRegistry, Extensions as OutputExtensions } from 'vs/workBench/services/output/common/output';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { VIEWLET_ID, IExtensionsWorkBenchService, IExtensionsViewPaneContainer, TOGGLE_IGNORE_EXTENSION_ACTION_ID, INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID } from 'vs/workBench/contriB/extensions/common/extensions';
import {
	OpenExtensionsViewletAction, InstallExtensionsAction, ShowOutdatedExtensionsAction, ShowRecommendedExtensionsAction, ShowRecommendedKeymapExtensionsAction, ShowPopularExtensionsAction,
	ShowEnaBledExtensionsAction, ShowInstalledExtensionsAction, ShowDisaBledExtensionsAction, ShowBuiltInExtensionsAction, UpdateAllAction,
	EnaBleAllAction, EnaBleAllWorkspaceAction, DisaBleAllAction, DisaBleAllWorkspaceAction, CheckForUpdatesAction, ShowLanguageExtensionsAction, EnaBleAutoUpdateAction, DisaBleAutoUpdateAction, ConfigureRecommendedExtensionsCommandsContriButor, InstallVSIXAction, ReinstallAction, InstallSpecificVersionOfExtensionAction, ClearExtensionsSearchResultsAction
} from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { ExtensionsInput } from 'vs/workBench/contriB/extensions/common/extensionsInput';
import { ExtensionEditor } from 'vs/workBench/contriB/extensions/Browser/extensionEditor';
import { StatusUpdater, MaliciousExtensionChecker, ExtensionsViewletViewsContriBution, ExtensionsViewPaneContainer } from 'vs/workBench/contriB/extensions/Browser/extensionsViewlet';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import * as jsonContriButionRegistry from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { ExtensionsConfigurationSchema, ExtensionsConfigurationSchemaId } from 'vs/workBench/contriB/extensions/common/extensionsFileTemplate';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeymapExtensions } from 'vs/workBench/contriB/extensions/common/extensionsUtils';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { EditorDescriptor, IEditorRegistry, Extensions as EditorExtensions } from 'vs/workBench/Browser/editor';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ExtensionActivationProgress } from 'vs/workBench/contriB/extensions/Browser/extensionsActivationProgress';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { ExtensionDependencyChecker } from 'vs/workBench/contriB/extensions/Browser/extensionsDependencyChecker';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { RemoteExtensionsInstaller } from 'vs/workBench/contriB/extensions/Browser/remoteExtensionsInstaller';
import { IViewContainersRegistry, ViewContainerLocation, Extensions as ViewContainerExtensions } from 'vs/workBench/common/views';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { ContextKeyAndExpr, ContextKeyExpr, ContextKeyOrExpr, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IQuickAccessRegistry, Extensions } from 'vs/platform/quickinput/common/quickAccess';
import { InstallExtensionQuickAccessProvider, ManageExtensionsQuickAccessProvider } from 'vs/workBench/contriB/extensions/Browser/extensionsQuickAccess';
import { ExtensionRecommendationsService } from 'vs/workBench/contriB/extensions/Browser/extensionRecommendationsService';
import { CONTEXT_SYNC_ENABLEMENT } from 'vs/workBench/services/userDataSync/common/userDataSync';
import { CopyAction, CutAction, PasteAction } from 'vs/editor/contriB/clipBoard/clipBoard';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { MultiCommand } from 'vs/editor/Browser/editorExtensions';
import { WeBview } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { ExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/Browser/extensionsWorkBenchService';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { WorkBenchStateContext } from 'vs/workBench/Browser/contextkeys';
import { CATEGORIES } from 'vs/workBench/common/actions';
import { IExtensionRecommendationNotificationService } from 'vs/platform/extensionRecommendations/common/extensionRecommendations';
import { ExtensionRecommendationNotificationService } from 'vs/workBench/contriB/extensions/Browser/extensionRecommendationNotificationService';
import { IExtensionService, toExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ResourceContextKey } from 'vs/workBench/common/resources';

// Singletons
registerSingleton(IExtensionsWorkBenchService, ExtensionsWorkBenchService);
registerSingleton(IExtensionRecommendationNotificationService, ExtensionRecommendationNotificationService);
registerSingleton(IExtensionRecommendationsService, ExtensionRecommendationsService);

Registry.as<IOutputChannelRegistry>(OutputExtensions.OutputChannels)
	.registerChannel({ id: ExtensionsChannelId, laBel: ExtensionsLaBel, log: false });

// Quick Access
Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
	ctor: ManageExtensionsQuickAccessProvider,
	prefix: ManageExtensionsQuickAccessProvider.PREFIX,
	placeholder: localize('manageExtensionsQuickAccessPlaceholder', "Press Enter to manage extensions."),
	helpEntries: [{ description: localize('manageExtensionsHelp', "Manage Extensions"), needsEditor: false }]
});

// Explorer
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '4_extensions',
	command: {
		id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
		title: localize('installVSIX', "Install VSIX"),
	},
	when: ResourceContextKey.Extension.isEqualTo('.vsix')
});

// Editor
Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		ExtensionEditor,
		ExtensionEditor.ID,
		localize('extension', "Extension")
	),
	[
		new SyncDescriptor(ExtensionsInput)
	]);

Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer(
	{
		id: VIEWLET_ID,
		name: localize('extensions', "Extensions"),
		ctorDescriptor: new SyncDescriptor(ExtensionsViewPaneContainer),
		icon: 'codicon-extensions',
		order: 4,
		rejectAddedViews: true,
		alwaysUseContainerInfo: true
	}, ViewContainerLocation.SideBar);


Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration)
	.registerConfiguration({
		id: 'extensions',
		order: 30,
		title: localize('extensionsConfigurationTitle', "Extensions"),
		type: 'oBject',
		properties: {
			'extensions.autoUpdate': {
				type: 'Boolean',
				description: localize('extensionsAutoUpdate', "When enaBled, automatically installs updates for extensions. The updates are fetched from a Microsoft online service."),
				default: true,
				scope: ConfigurationScope.APPLICATION,
				tags: ['usesOnlineServices']
			},
			'extensions.autoCheckUpdates': {
				type: 'Boolean',
				description: localize('extensionsCheckUpdates', "When enaBled, automatically checks extensions for updates. If an extension has an update, it is marked as outdated in the Extensions view. The updates are fetched from a Microsoft online service."),
				default: true,
				scope: ConfigurationScope.APPLICATION,
				tags: ['usesOnlineServices']
			},
			'extensions.ignoreRecommendations': {
				type: 'Boolean',
				description: localize('extensionsIgnoreRecommendations', "When enaBled, the notifications for extension recommendations will not Be shown."),
				default: false
			},
			'extensions.showRecommendationsOnlyOnDemand': {
				type: 'Boolean',
				description: localize('extensionsShowRecommendationsOnlyOnDemand', "When enaBled, recommendations will not Be fetched or shown unless specifically requested By the user. Some recommendations are fetched from a Microsoft online service."),
				default: false,
				tags: ['usesOnlineServices']
			},
			'extensions.closeExtensionDetailsOnViewChange': {
				type: 'Boolean',
				description: localize('extensionsCloseExtensionDetailsOnViewChange', "When enaBled, editors with extension details will Be automatically closed upon navigating away from the Extensions View."),
				default: false
			},
			'extensions.confirmedUriHandlerExtensionIds': {
				type: 'array',
				description: localize('handleUriConfirmedExtensions', "When an extension is listed here, a confirmation prompt will not Be shown when that extension handles a URI."),
				default: []
			},
			'extensions.weBWorker': {
				type: 'Boolean',
				description: localize('extensionsWeBWorker', "EnaBle weB worker extension host."),
				default: false
			}
		}
	});

const jsonRegistry = <jsonContriButionRegistry.IJSONContriButionRegistry>Registry.as(jsonContriButionRegistry.Extensions.JSONContriBution);
jsonRegistry.registerSchema(ExtensionsConfigurationSchemaId, ExtensionsConfigurationSchema);

// Register Commands
CommandsRegistry.registerCommand('_extensions.manage', (accessor: ServicesAccessor, extensionId: string) => {
	const extensionService = accessor.get(IExtensionsWorkBenchService);
	const extension = extensionService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }));
	if (extension.length === 1) {
		extensionService.open(extension[0]);
	}
});

CommandsRegistry.registerCommand('extension.open', (accessor: ServicesAccessor, extensionId: string) => {
	const extensionService = accessor.get(IExtensionsWorkBenchService);

	return extensionService.queryGallery({ names: [extensionId], pageSize: 1 }, CancellationToken.None).then(pager => {
		if (pager.total !== 1) {
			return;
		}

		extensionService.open(pager.firstPage[0]);
	});
});

CommandsRegistry.registerCommand({
	id: 'workBench.extensions.installExtension',
	description: {
		description: localize('workBench.extensions.installExtension.description', "Install the given extension"),
		args: [
			{
				name: localize('workBench.extensions.installExtension.arg.name', "Extension id or VSIX resource uri"),
				schema: {
					'type': ['oBject', 'string']
				}
			}
		]
	},
	handler: async (accessor, arg: string | UriComponents) => {
		const extensionManagementService = accessor.get(IExtensionManagementService);
		const extensionGalleryService = accessor.get(IExtensionGalleryService);
		try {
			if (typeof arg === 'string') {
				const extension = await extensionGalleryService.getCompatiBleExtension({ id: arg });
				if (extension) {
					await extensionManagementService.installFromGallery(extension);
				} else {
					throw new Error(localize('notFound', "Extension '{0}' not found.", arg));
				}
			} else {
				const vsix = URI.revive(arg);
				await extensionManagementService.install(vsix);
			}
		} catch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommandsRegistry.registerCommand({
	id: INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID,
	handler: async (accessor: ServicesAccessor, resources: URI[] | URI) => {
		const extensionService = accessor.get(IExtensionService);
		const extensionsWorkBenchService = accessor.get(IExtensionsWorkBenchService);
		const instantiationService = accessor.get(IInstantiationService);
		const hostService = accessor.get(IHostService);
		const notificationService = accessor.get(INotificationService);

		const viewletService = accessor.get(IViewletService);
		const viewlet = await viewletService.openViewlet(VIEWLET_ID, true);

		if (!viewlet) {
			return;
		}

		const extensions = Array.isArray(resources) ? resources : [resources];
		await Promise.all(extensions.map(async (vsix) => await extensionsWorkBenchService.install(vsix)))
			.then(async (extensions) => {
				for (const extension of extensions) {
					const requireReload = !(extension.local && extensionService.canAddExtension(toExtensionDescription(extension.local)));
					const message = requireReload ? localize('InstallVSIXAction.successReload', "Please reload Visual Studio Code to complete installing the extension {0}.", extension.displayName || extension.name)
						: localize('InstallVSIXAction.success', "Completed installing the extension {0}.", extension.displayName || extension.name);
					const actions = requireReload ? [{
						laBel: localize('InstallVSIXAction.reloadNow', "Reload Now"),
						run: () => hostService.reload()
					}] : [];
					notificationService.prompt(
						Severity.Info,
						message,
						actions,
						{ sticky: true }
					);
				}
				await instantiationService.createInstance(ShowInstalledExtensionsAction, ShowInstalledExtensionsAction.ID, ShowInstalledExtensionsAction.LABEL).run(true);
			});
	}
});

CommandsRegistry.registerCommand({
	id: 'workBench.extensions.uninstallExtension',
	description: {
		description: localize('workBench.extensions.uninstallExtension.description', "Uninstall the given extension"),
		args: [
			{
				name: localize('workBench.extensions.uninstallExtension.arg.name', "Id of the extension to uninstall"),
				schema: {
					'type': 'string'
				}
			}
		]
	},
	handler: async (accessor, id: string) => {
		if (!id) {
			throw new Error(localize('id required', "Extension id required."));
		}
		const extensionManagementService = accessor.get(IExtensionManagementService);
		const installed = await extensionManagementService.getInstalled();
		const [extensionToUninstall] = installed.filter(e => areSameExtensions(e.identifier, { id }));
		if (!extensionToUninstall) {
			throw new Error(localize('notInstalled', "Extension '{0}' is not installed. Make sure you use the full extension ID, including the puBlisher, e.g.: ms-dotnettools.csharp.", id));
		}
		if (extensionToUninstall.isBuiltin) {
			throw new Error(localize('Builtin', "Extension '{0}' is a Built-in extension and cannot Be installed", id));
		}

		try {
			await extensionManagementService.uninstall(extensionToUninstall, true);
		} catch (e) {
			onUnexpectedError(e);
			throw e;
		}
	}
});

CommandsRegistry.registerCommand({
	id: 'workBench.extensions.search',
	description: {
		description: localize('workBench.extensions.search.description', "Search for a specific extension"),
		args: [
			{
				name: localize('workBench.extensions.search.arg.name', "Query to use in search"),
				schema: { 'type': 'string' }
			}
		]
	},
	handler: async (accessor, query: string = '') => {
		const viewletService = accessor.get(IViewletService);
		const viewlet = await viewletService.openViewlet(VIEWLET_ID, true);

		if (!viewlet) {
			return;
		}

		(viewlet.getViewPaneContainer() as IExtensionsViewPaneContainer).search(query);
		viewlet.focus();
	}
});

// File menu registration

MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
	group: '2_keyBindings',
	command: {
		id: ShowRecommendedKeymapExtensionsAction.ID,
		title: localize({ key: 'miOpenKeymapExtensions', comment: ['&& denotes a mnemonic'] }, "&&Keymaps")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
	group: '2_keyBindings',
	command: {
		id: ShowRecommendedKeymapExtensionsAction.ID,
		title: localize('miOpenKeymapExtensions2', "Keymaps")
	},
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
	group: '1_settings',
	command: {
		id: VIEWLET_ID,
		title: localize({ key: 'miPreferencesExtensions', comment: ['&& denotes a mnemonic'] }, "&&Extensions")
	},
	order: 3
});

// View menu

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '3_views',
	command: {
		id: VIEWLET_ID,
		title: localize({ key: 'miViewExtensions', comment: ['&& denotes a mnemonic'] }, "E&&xtensions")
	},
	order: 5
});

// GloBal Activity Menu

MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
	group: '2_configuration',
	command: {
		id: VIEWLET_ID,
		title: localize('showExtensions', "Extensions")
	},
	order: 3
});

function overrideActionForActiveExtensionEditorWeBview(command: MultiCommand | undefined, f: (weBview: WeBview) => void) {
	command?.addImplementation(105, (accessor) => {
		const editorService = accessor.get(IEditorService);
		const editor = editorService.activeEditorPane;
		if (editor instanceof ExtensionEditor) {
			if (editor.activeWeBview?.isFocused) {
				f(editor.activeWeBview);
				return true;
			}
		}
		return false;
	});
}

overrideActionForActiveExtensionEditorWeBview(CopyAction, weBview => weBview.copy());
overrideActionForActiveExtensionEditorWeBview(CutAction, weBview => weBview.cut());
overrideActionForActiveExtensionEditorWeBview(PasteAction, weBview => weBview.paste());

// Contexts
export const CONTEXT_HAS_GALLERY = new RawContextKey<Boolean>('hasGallery', false);
export const CONTEXT_HAS_LOCAL_SERVER = new RawContextKey<Boolean>('hasLocalServer', false);
export const CONTEXT_HAS_REMOTE_SERVER = new RawContextKey<Boolean>('hasRemoteServer', false);
export const CONTEXT_HAS_WEB_SERVER = new RawContextKey<Boolean>('hasWeBServer', false);

class ExtensionsContriButions implements IWorkBenchContriBution {

	constructor(
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IExtensionGalleryService extensionGalleryService: IExtensionGalleryService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		const hasGalleryContext = CONTEXT_HAS_GALLERY.BindTo(contextKeyService);
		if (extensionGalleryService.isEnaBled()) {
			hasGalleryContext.set(true);
		}

		const hasLocalServerContext = CONTEXT_HAS_LOCAL_SERVER.BindTo(contextKeyService);
		if (this.extensionManagementServerService.localExtensionManagementServer) {
			hasLocalServerContext.set(true);
		}

		const hasRemoteServerContext = CONTEXT_HAS_REMOTE_SERVER.BindTo(contextKeyService);
		if (this.extensionManagementServerService.remoteExtensionManagementServer) {
			hasRemoteServerContext.set(true);
		}

		const hasWeBServerContext = CONTEXT_HAS_WEB_SERVER.BindTo(contextKeyService);
		if (this.extensionManagementServerService.weBExtensionManagementServer) {
			hasWeBServerContext.set(true);
		}

		this.registerGloBalActions();
		this.registerContextMenuActions();
		this.registerQuickAccessProvider();
	}

	private registerQuickAccessProvider(): void {
		if (this.extensionManagementServerService.localExtensionManagementServer
			|| this.extensionManagementServerService.remoteExtensionManagementServer
			|| this.extensionManagementServerService.weBExtensionManagementServer
		) {
			Registry.as<IQuickAccessRegistry>(Extensions.Quickaccess).registerQuickAccessProvider({
				ctor: InstallExtensionQuickAccessProvider,
				prefix: InstallExtensionQuickAccessProvider.PREFIX,
				placeholder: localize('installExtensionQuickAccessPlaceholder', "Type the name of an extension to install or search."),
				helpEntries: [{ description: localize('installExtensionQuickAccessHelp', "Install or Search Extensions"), needsEditor: false }]
			});
		}
	}

	// GloBal actions
	private registerGloBalActions(): void {
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: OpenExtensionsViewletAction.ID,
					title: { value: OpenExtensionsViewletAction.LABEL, original: 'Show Extensions' },
					category: CATEGORIES.View,
					menu: {
						id: MenuId.CommandPalette,
					},
					keyBinding: {
						primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_X,
						weight: KeyBindingWeight.WorkBenchContriB
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(OpenExtensionsViewletAction, OpenExtensionsViewletAction.ID, OpenExtensionsViewletAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: InstallExtensionsAction.ID,
					title: { value: InstallExtensionsAction.LABEL, original: 'Install Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(InstallExtensionsAction, InstallExtensionsAction.ID, InstallExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowOutdatedExtensionsAction.ID,
					title: { value: ShowOutdatedExtensionsAction.LABEL, original: 'Show Outdated Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowOutdatedExtensionsAction, ShowOutdatedExtensionsAction.ID, ShowOutdatedExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowRecommendedExtensionsAction.ID,
					title: { value: ShowRecommendedExtensionsAction.LABEL, original: 'Show Recommended Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowRecommendedExtensionsAction, ShowRecommendedExtensionsAction.ID, ShowRecommendedExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowRecommendedKeymapExtensionsAction.ID,
					title: { value: ShowRecommendedKeymapExtensionsAction.LABEL, original: 'Keymaps' },
					category: PreferencesLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: CONTEXT_HAS_GALLERY
					},
					keyBinding: {
						primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_M),
						weight: KeyBindingWeight.WorkBenchContriB
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowRecommendedKeymapExtensionsAction, ShowRecommendedKeymapExtensionsAction.ID, ShowRecommendedKeymapExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowLanguageExtensionsAction.ID,
					title: { value: ShowLanguageExtensionsAction.LABEL, original: 'Language Extensions' },
					category: PreferencesLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowLanguageExtensionsAction, ShowLanguageExtensionsAction.ID, ShowLanguageExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowPopularExtensionsAction.ID,
					title: { value: ShowPopularExtensionsAction.LABEL, original: 'Show Popular Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: CONTEXT_HAS_GALLERY
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowPopularExtensionsAction, ShowPopularExtensionsAction.ID, ShowPopularExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowEnaBledExtensionsAction.ID,
					title: { value: ShowEnaBledExtensionsAction.LABEL, original: 'Show EnaBled Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowEnaBledExtensionsAction, ShowEnaBledExtensionsAction.ID, ShowEnaBledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowInstalledExtensionsAction.ID,
					title: { value: ShowInstalledExtensionsAction.LABEL, original: 'Show Installed Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowInstalledExtensionsAction, ShowInstalledExtensionsAction.ID, ShowInstalledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowDisaBledExtensionsAction.ID,
					title: { value: ShowDisaBledExtensionsAction.LABEL, original: 'Show DisaBled Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowDisaBledExtensionsAction, ShowDisaBledExtensionsAction.ID, ShowDisaBledExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ShowBuiltInExtensionsAction.ID,
					title: { value: ShowBuiltInExtensionsAction.LABEL, original: 'Show Built-in Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ShowBuiltInExtensionsAction, ShowBuiltInExtensionsAction.ID, ShowBuiltInExtensionsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: UpdateAllAction.ID,
					title: { value: UpdateAllAction.LABEL, original: 'Update All Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(UpdateAllAction, UpdateAllAction.ID, UpdateAllAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: InstallVSIXAction.ID,
					title: { value: InstallVSIXAction.LABEL, original: 'Install from VSIX...' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(InstallVSIXAction, InstallVSIXAction.ID, InstallVSIXAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: DisaBleAllAction.ID,
					title: { value: DisaBleAllAction.LABEL, original: 'DisaBle All Installed Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(DisaBleAllAction, DisaBleAllAction.ID, DisaBleAllAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: DisaBleAllWorkspaceAction.ID,
					title: { value: DisaBleAllWorkspaceAction.LABEL, original: 'DisaBle All Installed Extensions for this Workspace' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([WorkBenchStateContext.notEqualsTo('empty'), ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(DisaBleAllWorkspaceAction, DisaBleAllWorkspaceAction.ID, DisaBleAllWorkspaceAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: EnaBleAllAction.ID,
					title: { value: EnaBleAllAction.LABEL, original: 'EnaBle All Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(EnaBleAllAction, EnaBleAllAction.ID, EnaBleAllAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: EnaBleAllWorkspaceAction.ID,
					title: { value: EnaBleAllWorkspaceAction.LABEL, original: 'EnaBle All Extensions for this Workspace' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([WorkBenchStateContext.notEqualsTo('empty'), ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(EnaBleAllWorkspaceAction, EnaBleAllWorkspaceAction.ID, EnaBleAllWorkspaceAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: CheckForUpdatesAction.ID,
					title: { value: CheckForUpdatesAction.LABEL, original: 'Check for Extension Updates' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(CheckForUpdatesAction, CheckForUpdatesAction.ID, CheckForUpdatesAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ClearExtensionsSearchResultsAction.ID,
					title: { value: ClearExtensionsSearchResultsAction.LABEL, original: 'Clear Extensions Search Results' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ClearExtensionsSearchResultsAction, ClearExtensionsSearchResultsAction.ID, ClearExtensionsSearchResultsAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: EnaBleAutoUpdateAction.ID,
					title: { value: EnaBleAutoUpdateAction.LABEL, original: 'EnaBle Auto Updating Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(EnaBleAutoUpdateAction, EnaBleAutoUpdateAction.ID, EnaBleAutoUpdateAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: DisaBleAutoUpdateAction.ID,
					title: { value: DisaBleAutoUpdateAction.LABEL, original: 'DisaBle Auto Updating Extensions' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(DisaBleAutoUpdateAction, DisaBleAutoUpdateAction.ID, DisaBleAutoUpdateAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: InstallSpecificVersionOfExtensionAction.ID,
					title: { value: InstallSpecificVersionOfExtensionAction.LABEL, original: 'Install Specific Version of Extension...' },
					category: ExtensionsLocalizedLaBel,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER, CONTEXT_HAS_WEB_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(InstallSpecificVersionOfExtensionAction, InstallSpecificVersionOfExtensionAction.ID, InstallSpecificVersionOfExtensionAction.LABEL).run();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ReinstallAction.ID,
					title: { value: ReinstallAction.LABEL, original: 'Reinstall Extension...' },
					category: CATEGORIES.Developer,
					menu: {
						id: MenuId.CommandPalette,
						when: ContextKeyAndExpr.create([CONTEXT_HAS_GALLERY, ContextKeyOrExpr.create([CONTEXT_HAS_LOCAL_SERVER, CONTEXT_HAS_REMOTE_SERVER])])
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ReinstallAction, ReinstallAction.ID, ReinstallAction.LABEL).run();
			}
		});
	}

	// Extension Context Menu
	private registerContextMenuActions(): void {
		registerAction2(class extends Action2 {

			constructor() {
				super({
					id: 'workBench.extensions.action.copyExtension',
					title: { value: localize('workBench.extensions.action.copyExtension', "Copy"), original: 'Copy' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '1_copy'
					}
				});
			}

			async run(accessor: ServicesAccessor, extensionId: string) {
				const extensionWorkBenchService = accessor.get(IExtensionsWorkBenchService);
				let extension = extensionWorkBenchService.local.filter(e => areSameExtensions(e.identifier, { id: extensionId }))[0]
					|| (await extensionWorkBenchService.queryGallery({ names: [extensionId], pageSize: 1 }, CancellationToken.None)).firstPage[0];
				if (extension) {
					const name = localize('extensionInfoName', 'Name: {0}', extension.displayName);
					const id = localize('extensionInfoId', 'Id: {0}', extensionId);
					const description = localize('extensionInfoDescription', 'Description: {0}', extension.description);
					const verision = localize('extensionInfoVersion', 'Version: {0}', extension.version);
					const puBlisher = localize('extensionInfoPuBlisher', 'PuBlisher: {0}', extension.puBlisherDisplayName);
					const link = extension.url ? localize('extensionInfoVSMarketplaceLink', 'VS Marketplace Link: {0}', `${extension.url}`) : null;
					const clipBoardStr = `${name}\n${id}\n${description}\n${verision}\n${puBlisher}${link ? '\n' + link : ''}`;
					await accessor.get(IClipBoardService).writeText(clipBoardStr);
				}
			}
		});

		registerAction2(class extends Action2 {

			constructor() {
				super({
					id: 'workBench.extensions.action.copyExtensionId',
					title: { value: localize('workBench.extensions.action.copyExtensionId', "Copy Extension Id"), original: 'Copy Extension Id' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '1_copy'
					}
				});
			}

			async run(accessor: ServicesAccessor, id: string) {
				await accessor.get(IClipBoardService).writeText(id);
			}
		});

		registerAction2(class extends Action2 {

			constructor() {
				super({
					id: 'workBench.extensions.action.configure',
					title: { value: localize('workBench.extensions.action.configure', "Extension Settings"), original: 'Extension Settings' },
					menu: {
						id: MenuId.ExtensionContext,
						group: '2_configure',
						when: ContextKeyExpr.and(ContextKeyExpr.equals('extensionStatus', 'installed'), ContextKeyExpr.has('extensionHasConfiguration'))
					}
				});
			}

			async run(accessor: ServicesAccessor, id: string) {
				await accessor.get(IPreferencesService).openSettings(false, `@ext:${id}`);
			}
		});

		registerAction2(class extends Action2 {

			constructor() {
				super({
					id: TOGGLE_IGNORE_EXTENSION_ACTION_ID,
					title: { value: localize('workBench.extensions.action.toggleIgnoreExtension', "Sync This Extension"), original: `Sync This Extension` },
					menu: {
						id: MenuId.ExtensionContext,
						group: '2_configure',
						when: CONTEXT_SYNC_ENABLEMENT
					},
				});
			}

			async run(accessor: ServicesAccessor, id: string) {
				const extensionsWorkBenchService = accessor.get(IExtensionsWorkBenchService);
				const extension = extensionsWorkBenchService.local.find(e => areSameExtensions({ id }, e.identifier));
				if (extension) {
					return extensionsWorkBenchService.toggleExtensionIgnoredToSync(extension);
				}
			}
		});
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(ExtensionsContriButions, LifecyclePhase.Starting);
workBenchRegistry.registerWorkBenchContriBution(StatusUpdater, LifecyclePhase.Restored);
workBenchRegistry.registerWorkBenchContriBution(MaliciousExtensionChecker, LifecyclePhase.Eventually);
workBenchRegistry.registerWorkBenchContriBution(ConfigureRecommendedExtensionsCommandsContriButor, LifecyclePhase.Eventually);
workBenchRegistry.registerWorkBenchContriBution(KeymapExtensions, LifecyclePhase.Restored);
workBenchRegistry.registerWorkBenchContriBution(ExtensionsViewletViewsContriBution, LifecyclePhase.Starting);
workBenchRegistry.registerWorkBenchContriBution(ExtensionActivationProgress, LifecyclePhase.Eventually);
workBenchRegistry.registerWorkBenchContriBution(ExtensionDependencyChecker, LifecyclePhase.Eventually);
workBenchRegistry.registerWorkBenchContriBution(RemoteExtensionsInstaller, LifecyclePhase.Eventually);
