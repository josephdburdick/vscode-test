/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import 'vs/css!./media/preferences';
import { Context as SuggestContext } from 'vs/editor/contriB/suggest/suggest';
import * as nls from 'vs/nls';
import { Action2, MenuId, MenuRegistry, registerAction2 } from 'vs/platform/actions/common/actions';
import { CommandsRegistry, ICommandService } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IsMacNativeContext } from 'vs/platform/contextkey/common/contextkeys';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkspaceContextService, IWorkspaceFolder, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from 'vs/workBench/Browser/actions/workspaceCommands';
import { RemoteNameContext, WorkBenchStateContext } from 'vs/workBench/Browser/contextkeys';
import { EditorDescriptor, Extensions as EditorExtensions, IEditorRegistry } from 'vs/workBench/Browser/editor';
import { ABstractSideBySideEditorInputFactory } from 'vs/workBench/Browser/parts/editor/editor.contriBution';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { EditorInput, Extensions as EditorInputExtensions, IEditorInputFactory, IEditorInputFactoryRegistry } from 'vs/workBench/common/editor';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { ExplorerFolderContext, ExplorerRootContext } from 'vs/workBench/contriB/files/common/files';
import { KeyBindingsEditor } from 'vs/workBench/contriB/preferences/Browser/keyBindingsEditor';
import { ConfigureLanguageBasedSettingsAction } from 'vs/workBench/contriB/preferences/Browser/preferencesActions';
import { PreferencesEditor } from 'vs/workBench/contriB/preferences/Browser/preferencesEditor';
import { SettingsEditor2, SettingsFocusContext } from 'vs/workBench/contriB/preferences/Browser/settingsEditor2';
import { CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS, CONTEXT_KEYBINDING_FOCUS, CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR, CONTEXT_SETTINGS_ROW_FOCUS, CONTEXT_SETTINGS_SEARCH_FOCUS, CONTEXT_TOC_ROW_FOCUS, KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, KEYBINDINGS_EDITOR_COMMAND_COPY, KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND, KEYBINDINGS_EDITOR_COMMAND_DEFINE, KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN, KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS, KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS, KEYBINDINGS_EDITOR_COMMAND_REMOVE, KEYBINDINGS_EDITOR_COMMAND_RESET, KEYBINDINGS_EDITOR_COMMAND_SEARCH, KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR, KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE, KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS, KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS, MODIFIED_SETTING_TAG, SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS, SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU } from 'vs/workBench/contriB/preferences/common/preferences';
import { PreferencesContriBution } from 'vs/workBench/contriB/preferences/common/preferencesContriBution';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { DefaultPreferencesEditorInput, KeyBindingsEditorInput, PreferencesEditorInput, SettingsEditor2Input } from 'vs/workBench/services/preferences/common/preferencesEditorInput';

const SETTINGS_EDITOR_COMMAND_SEARCH = 'settings.action.search';

const SETTINGS_EDITOR_COMMAND_FOCUS_NEXT_SETTING = 'settings.action.focusNextSetting';
const SETTINGS_EDITOR_COMMAND_FOCUS_PREVIOUS_SETTING = 'settings.action.focusPreviousSetting';
const SETTINGS_EDITOR_COMMAND_FOCUS_FILE = 'settings.action.focusSettingsFile';
const SETTINGS_EDITOR_COMMAND_EDIT_FOCUSED_SETTING = 'settings.action.editFocusedSetting';
const SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH = 'settings.action.focusSettingsFromSearch';
const SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST = 'settings.action.focusSettingsList';
const SETTINGS_EDITOR_COMMAND_FOCUS_TOC = 'settings.action.focusTOC';
const SETTINGS_EDITOR_COMMAND_FOCUS_CONTROL = 'settings.action.focusSettingControl';
const SETTINGS_EDITOR_COMMAND_FOCUS_UP = 'settings.action.focusLevelUp';

const SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON = 'settings.switchToJSON';
const SETTINGS_EDITOR_COMMAND_FILTER_MODIFIED = 'settings.filterByModified';
const SETTINGS_EDITOR_COMMAND_FILTER_ONLINE = 'settings.filterByOnline';

const SETTINGS_COMMAND_OPEN_SETTINGS = 'workBench.action.openSettings';

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		PreferencesEditor,
		PreferencesEditor.ID,
		nls.localize('defaultPreferencesEditor', "Default Preferences Editor")
	),
	[
		new SyncDescriptor(PreferencesEditorInput)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		SettingsEditor2,
		SettingsEditor2.ID,
		nls.localize('settingsEditor2', "Settings Editor 2")
	),
	[
		new SyncDescriptor(SettingsEditor2Input)
	]
);

Registry.as<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.create(
		KeyBindingsEditor,
		KeyBindingsEditor.ID,
		nls.localize('keyBindingsEditor', "KeyBindings Editor")
	),
	[
		new SyncDescriptor(KeyBindingsEditorInput)
	]
);

// Register Preferences Editor Input Factory
class PreferencesEditorInputFactory extends ABstractSideBySideEditorInputFactory {

	protected createEditorInput(name: string, description: string | undefined, secondaryInput: EditorInput, primaryInput: EditorInput): EditorInput {
		return new PreferencesEditorInput(name, description, secondaryInput, primaryInput);
	}
}

class KeyBindingsEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): Boolean {
		return true;
	}

	serialize(editorInput: EditorInput): string {
		const input = <KeyBindingsEditorInput>editorInput;
		return JSON.stringify({
			name: input.getName(),
			typeId: input.getTypeId()
		});
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
		return instantiationService.createInstance(KeyBindingsEditorInput);
	}
}

class SettingsEditor2InputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): Boolean {
		return true;
	}

	serialize(input: SettingsEditor2Input): string {
		return '{}';
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): SettingsEditor2Input {
		return instantiationService.createInstance(SettingsEditor2Input);
	}
}

interface ISerializedDefaultPreferencesEditorInput {
	resource: string;
}

// Register Default Preferences Editor Input Factory
class DefaultPreferencesEditorInputFactory implements IEditorInputFactory {

	canSerialize(editorInput: EditorInput): Boolean {
		return true;
	}

	serialize(editorInput: EditorInput): string {
		const input = <DefaultPreferencesEditorInput>editorInput;

		const serialized: ISerializedDefaultPreferencesEditorInput = { resource: input.resource.toString() };

		return JSON.stringify(serialized);
	}

	deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
		const deserialized: ISerializedDefaultPreferencesEditorInput = JSON.parse(serializedEditorInput);

		return instantiationService.createInstance(DefaultPreferencesEditorInput, URI.parse(deserialized.resource));
	}
}

Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(PreferencesEditorInput.ID, PreferencesEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(DefaultPreferencesEditorInput.ID, DefaultPreferencesEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(KeyBindingsEditorInput.ID, KeyBindingsEditorInputFactory);
Registry.as<IEditorInputFactoryRegistry>(EditorInputExtensions.EditorInputFactories).registerEditorInputFactory(SettingsEditor2Input.ID, SettingsEditor2InputFactory);

const OPEN_SETTINGS2_ACTION_TITLE = { value: nls.localize('openSettings2', "Open Settings (UI)"), original: 'Open Settings (UI)' };

const category = { value: nls.localize('preferences', "Preferences"), original: 'Preferences' };

class PreferencesActionsContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IExtensionService private readonly extensionService: IExtensionService,
	) {
		super();

		this.registerSettingsActions();
		this.registerKeyBindingsActions();

		this.updatePreferencesEditorMenuItem();
		this._register(workspaceContextService.onDidChangeWorkBenchState(() => this.updatePreferencesEditorMenuItem()));
		this._register(workspaceContextService.onDidChangeWorkspaceFolders(() => this.updatePreferencesEditorMenuItemForWorkspaceFolders()));
	}

	private registerSettingsActions() {
		const that = this;
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_COMMAND_OPEN_SETTINGS,
					title: nls.localize('settings', "Settings"),
					keyBinding: {
						weight: KeyBindingWeight.WorkBenchContriB,
						when: null,
						primary: KeyMod.CtrlCmd | KeyCode.US_COMMA,
					},
					menu: {
						id: MenuId.GloBalActivity,
						group: '2_configuration',
						order: 1
					}
				});
			}
			run(accessor: ServicesAccessor, args: string | undefined) {
				const query = typeof args === 'string' ? args : undefined;
				return accessor.get(IPreferencesService).openSettings(query ? false : undefined, query);
			}
		});
		MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
			group: '1_settings',
			command: {
				id: SETTINGS_COMMAND_OPEN_SETTINGS,
				title: nls.localize({ key: 'miOpenSettings', comment: ['&& denotes a mnemonic'] }, "&&Settings")
			},
			order: 1
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openSettings2',
					title: { value: nls.localize('openSettings2', "Open Settings (UI)"), original: 'Open Settings (UI)' },
					category,
					f1: true,
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openSettings(false, undefined);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openSettingsJson',
					title: { value: nls.localize('openSettingsJson', "Open Settings (JSON)"), original: 'Open Settings (JSON)' },
					category,
					f1: true,
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openSettings(true, undefined);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openGloBalSettings',
					title: { value: nls.localize('openGloBalSettings', "Open User Settings"), original: 'Open User Settings' },
					category,
					f1: true,
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openGloBalSettings();
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openRawDefaultSettings',
					title: { value: nls.localize('openRawDefaultSettings', "Open Default Settings (JSON)"), original: 'Open Default Settings (JSON)' },
					category,
					f1: true,
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openRawDefaultSettings();
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: '_workBench.openUserSettingsEditor',
					title: OPEN_SETTINGS2_ACTION_TITLE,
					icon: { id: 'codicon/go-to-file' },
					menu: [{
						id: MenuId.EditorTitle,
						when: ResourceContextKey.Resource.isEqualTo(that.environmentService.settingsResource.toString()),
						group: 'navigation',
						order: 1
					}]
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openGloBalSettings(false);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_SWITCH_TO_JSON,
					title: { value: nls.localize('openSettingsJson', "Open Settings (JSON)"), original: 'Open Settings (JSON)' },
					icon: { id: 'codicon/go-to-file' },
					menu: [{
						id: MenuId.EditorTitle,
						when: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR.toNegated()),
						group: 'navigation',
						order: 1
					}]
				});
			}
			run(accessor: ServicesAccessor) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof SettingsEditor2) {
					return editorPane.switchToSettingsFile();
				}
				return Promise.resolve(null);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: ConfigureLanguageBasedSettingsAction.ID,
					title: ConfigureLanguageBasedSettingsAction.LABEL,
					category,
					f1: true,
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IInstantiationService).createInstance(ConfigureLanguageBasedSettingsAction, ConfigureLanguageBasedSettingsAction.ID, ConfigureLanguageBasedSettingsAction.LABEL.value).run();
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openWorkspaceSettings',
					title: { value: nls.localize('openWorkspaceSettings', "Open Workspace Settings"), original: 'Open Workspace Settings' },
					category,
					menu: {
						id: MenuId.CommandPalette,
						when: WorkBenchStateContext.notEqualsTo('empty')
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openWorkspaceSettings();
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openWorkspaceSettingsFile',
					title: { value: nls.localize('openWorkspaceSettingsFile', "Open Workspace Settings (JSON)"), original: 'Open Workspace Settings (JSON)' },
					category,
					menu: {
						id: MenuId.CommandPalette,
						when: WorkBenchStateContext.notEqualsTo('empty')
					}
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openWorkspaceSettings(true);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openFolderSettings',
					title: { value: nls.localize('openFolderSettings', "Open Folder Settings"), original: 'Open Folder Settings' },
					category,
					menu: {
						id: MenuId.CommandPalette,
						when: WorkBenchStateContext.isEqualTo('workspace')
					}
				});
			}
			async run(accessor: ServicesAccessor) {
				const commandService = accessor.get(ICommandService);
				const preferencesService = accessor.get(IPreferencesService);
				const workspaceFolder = await commandService.executeCommand<IWorkspaceFolder>(PICK_WORKSPACE_FOLDER_COMMAND_ID);
				if (workspaceFolder) {
					await preferencesService.openFolderSettings(workspaceFolder.uri);
				}
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openFolderSettingsFile',
					title: { value: nls.localize('openFolderSettingsFile', "Open Folder Settings (JSON)"), original: 'Open Folder Settings (JSON)' },
					category,
					menu: {
						id: MenuId.CommandPalette,
						when: WorkBenchStateContext.isEqualTo('workspace')
					}
				});
			}
			async run(accessor: ServicesAccessor) {
				const commandService = accessor.get(ICommandService);
				const preferencesService = accessor.get(IPreferencesService);
				const workspaceFolder = await commandService.executeCommand<IWorkspaceFolder>(PICK_WORKSPACE_FOLDER_COMMAND_ID);
				if (workspaceFolder) {
					await preferencesService.openFolderSettings(workspaceFolder.uri, true);
				}
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: '_workBench.action.openFolderSettings',
					title: { value: nls.localize('openFolderSettings', "Open Folder Settings"), original: 'Open Folder Settings' },
					category,
					menu: {
						id: MenuId.ExplorerContext,
						group: '2_workspace',
						order: 20,
						when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext)
					}
				});
			}
			run(accessor: ServicesAccessor, resource: URI) {
				return accessor.get(IPreferencesService).openFolderSettings(resource);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FILTER_MODIFIED,
					title: { value: nls.localize('filterModifiedLaBel', "Show modified settings"), original: 'Show modified settings' },
					menu: {
						id: MenuId.EditorTitle,
						group: '1_filter',
						order: 1,
						when: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR.toNegated())
					}
				});
			}
			run(accessor: ServicesAccessor, resource: URI) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof SettingsEditor2) {
					editorPane.focusSearch(`@${MODIFIED_SETTING_TAG}`);
				}
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
					title: { value: nls.localize('filterOnlineServicesLaBel', "Show settings for online services"), original: 'Show settings for online services' },
					menu: {
						id: MenuId.EditorTitle,
						group: '1_filter',
						order: 2,
						when: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_JSON_EDITOR.toNegated())
					}
				});
			}
			run(accessor: ServicesAccessor) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof SettingsEditor2) {
					editorPane.focusSearch(`@tag:usesOnlineServices`);
				} else {
					accessor.get(IPreferencesService).openSettings(false, '@tag:usesOnlineServices');
				}
			}
		});
		MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
			group: '1_settings',
			command: {
				id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
				title: nls.localize({ key: 'miOpenOnlineSettings', comment: ['&& denotes a mnemonic'] }, "&&Online Services Settings")
			},
			order: 2
		});
		MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
			group: '2_configuration',
			command: {
				id: SETTINGS_EDITOR_COMMAND_FILTER_ONLINE,
				title: nls.localize('onlineServices', "Online Services Settings")
			},
			order: 2
		});

		this.registerSettingsEditorActions();

		this.extensionService.whenInstalledExtensionsRegistered()
			.then(() => {
				const remoteAuthority = this.environmentService.remoteAuthority;
				const hostLaBel = this.laBelService.getHostLaBel(Schemas.vscodeRemote, remoteAuthority) || remoteAuthority;
				const laBel = nls.localize('openRemoteSettings', "Open Remote Settings ({0})", hostLaBel);
				registerAction2(class extends Action2 {
					constructor() {
						super({
							id: 'workBench.action.openRemoteSettings',
							title: { value: laBel, original: `Open Remote Settings (${hostLaBel})` },
							category,
							menu: {
								id: MenuId.CommandPalette,
								when: RemoteNameContext.notEqualsTo('')
							}
						});
					}
					run(accessor: ServicesAccessor) {
						return accessor.get(IPreferencesService).openRemoteSettings();
					}
				});
			});
	}

	private registerSettingsEditorActions() {
		function getPreferencesEditor(accessor: ServicesAccessor): PreferencesEditor | SettingsEditor2 | null {
			const activeEditorPane = accessor.get(IEditorService).activeEditorPane;
			if (activeEditorPane instanceof PreferencesEditor || activeEditorPane instanceof SettingsEditor2) {
				return activeEditorPane;
			}
			return null;
		}

		function settingsEditorFocusSearch(accessor: ServicesAccessor) {
			const preferencesEditor = getPreferencesEditor(accessor);
			if (preferencesEditor) {
				preferencesEditor.focusSearch();
			}
		}

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_SEARCH,
					precondition: CONTEXT_SETTINGS_EDITOR,
					keyBinding: {
						primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
						weight: KeyBindingWeight.EditorContriB,
						when: null
					},
					category,
					f1: true,
					title: nls.localize('settings.focusSearch', "Focus Settings Search")
				});
			}

			run(accessor: ServicesAccessor) { settingsEditorFocusSearch(accessor); }
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
					precondition: CONTEXT_SETTINGS_EDITOR,
					keyBinding: {
						primary: KeyCode.Escape,
						weight: KeyBindingWeight.EditorContriB,
						when: CONTEXT_SETTINGS_SEARCH_FOCUS
					},
					category,
					f1: true,
					title: nls.localize('settings.clearResults', "Clear Settings Search Results")
				});
			}

			run(accessor: ServicesAccessor) {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor) {
					preferencesEditor.clearSearchResults();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_FILE,
					precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.VisiBle.toNegated()),
					keyBinding: {
						primary: KeyCode.DownArrow,
						weight: KeyBindingWeight.EditorContriB,
						when: null
					},
					title: nls.localize('settings.focusFile', "Focus settings file")
				});
			}

			run(accessor: ServicesAccessor, args: any): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof PreferencesEditor) {
					preferencesEditor.focusSettingsFileEditor();
				} else if (preferencesEditor) {
					preferencesEditor.focusSettings();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_FROM_SEARCH,
					precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_SEARCH_FOCUS, SuggestContext.VisiBle.toNegated()),
					keyBinding: {
						primary: KeyCode.DownArrow,
						weight: KeyBindingWeight.WorkBenchContriB,
						when: null
					},
					title: nls.localize('settings.focusFile', "Focus settings file")
				});
			}

			run(accessor: ServicesAccessor, args: any): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof PreferencesEditor) {
					preferencesEditor.focusSettingsFileEditor();
				} else if (preferencesEditor) {
					preferencesEditor.focusSettings();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_NEXT_SETTING,
					precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
					keyBinding: {
						primary: KeyCode.Enter,
						weight: KeyBindingWeight.EditorContriB,
						when: null
					},
					title: nls.localize('settings.focusNextSetting', "Focus next setting")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof PreferencesEditor) {
					preferencesEditor.focusNextResult();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_PREVIOUS_SETTING,
					precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
					keyBinding: {
						primary: KeyMod.Shift | KeyCode.Enter,
						weight: KeyBindingWeight.EditorContriB,
						when: null
					},
					title: nls.localize('settings.focusPreviousSetting', "Focus previous setting")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof PreferencesEditor) {
					preferencesEditor.focusPreviousResult();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_EDIT_FOCUSED_SETTING,
					precondition: CONTEXT_SETTINGS_SEARCH_FOCUS,
					keyBinding: {
						primary: KeyMod.CtrlCmd | KeyCode.US_DOT,
						weight: KeyBindingWeight.EditorContriB,
						when: null
					},
					title: nls.localize('settings.editFocusedSetting', "Edit focused setting")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof PreferencesEditor) {
					preferencesEditor.editFocusedPreference();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_SETTINGS_LIST,
					precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_TOC_ROW_FOCUS),
					keyBinding: {
						primary: KeyCode.Enter,
						weight: KeyBindingWeight.WorkBenchContriB,
						when: null
					},
					title: nls.localize('settings.focusSettingsList', "Focus settings list")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof SettingsEditor2) {
					preferencesEditor.focusSettings();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_TOC,
					precondition: CONTEXT_SETTINGS_EDITOR,
					f1: true,
					keyBinding: [
						{
							primary: KeyCode.LeftArrow,
							weight: KeyBindingWeight.WorkBenchContriB,
							when: CONTEXT_SETTINGS_ROW_FOCUS
						}],
					category,
					title: nls.localize('settings.focusSettingsTOC', "Focus Settings TaBle of Contents")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (!(preferencesEditor instanceof SettingsEditor2)) {
					return;
				}

				preferencesEditor.focusTOC();
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_CONTROL,
					precondition: CONTEXT_SETTINGS_ROW_FOCUS,
					keyBinding: {
						primary: KeyCode.Enter,
						weight: KeyBindingWeight.WorkBenchContriB,
					},
					title: nls.localize('settings.focusSettingControl', "Focus Setting Control")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (!(preferencesEditor instanceof SettingsEditor2)) {
					return;
				}

				if (document.activeElement?.classList.contains('monaco-list')) {
					preferencesEditor.focusSettings(true);
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_SHOW_CONTEXT_MENU,
					precondition: CONTEXT_SETTINGS_EDITOR,
					keyBinding: {
						primary: KeyMod.Shift | KeyCode.F9,
						weight: KeyBindingWeight.WorkBenchContriB,
						when: null
					},
					f1: true,
					category,
					title: nls.localize('settings.showContextMenu', "Show Setting Context Menu")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (preferencesEditor instanceof SettingsEditor2) {
					preferencesEditor.showContextMenu();
				}
			}
		});

		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: SETTINGS_EDITOR_COMMAND_FOCUS_UP,
					precondition: ContextKeyExpr.and(CONTEXT_SETTINGS_EDITOR, CONTEXT_SETTINGS_SEARCH_FOCUS.toNegated()),
					keyBinding: {
						primary: KeyCode.Escape,
						weight: KeyBindingWeight.WorkBenchContriB,
						when: null
					},
					f1: true,
					category,
					title: nls.localize('settings.focusLevelUp', "Move Focus Up One Level")
				});
			}

			run(accessor: ServicesAccessor): void {
				const preferencesEditor = getPreferencesEditor(accessor);
				if (!(preferencesEditor instanceof SettingsEditor2)) {
					return;
				}

				if (preferencesEditor.currentFocusContext === SettingsFocusContext.SettingControl) {
					preferencesEditor.focusSettings();
				} else if (preferencesEditor.currentFocusContext === SettingsFocusContext.SettingTree) {
					preferencesEditor.focusTOC();
				} else if (preferencesEditor.currentFocusContext === SettingsFocusContext.TaBleOfContents) {
					preferencesEditor.focusSearch();
				}
			}
		});
	}

	private registerKeyBindingsActions() {
		const that = this;
		const category = { value: nls.localize('preferences', "Preferences"), original: 'Preferences' };
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openGloBalKeyBindings',
					title: { value: nls.localize('openGloBalKeyBindings', "Open KeyBoard Shortcuts"), original: 'Open KeyBoard Shortcuts' },
					category,
					icon: { id: 'codicon/go-to-file' },
					keyBinding: {
						when: null,
						weight: KeyBindingWeight.WorkBenchContriB,
						primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_S)
					},
					menu: [
						{ id: MenuId.CommandPalette },
						{
							id: MenuId.EditorTitle,
							when: ResourceContextKey.Resource.isEqualTo(that.environmentService.keyBindingsResource.toString()),
							group: 'navigation',
							order: 1,
						}
					]
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openGloBalKeyBindingSettings(false);
			}
		});
		MenuRegistry.appendMenuItem(MenuId.GloBalActivity, {
			command: {
				id: 'workBench.action.openGloBalKeyBindings',
				title: { value: nls.localize('KeyBoard Shortcuts', "KeyBoard Shortcuts"), original: 'KeyBoard Shortcuts' }
			},
			group: '2_keyBindings',
			order: 1
		});
		MenuRegistry.appendMenuItem(MenuId.MenuBarPreferencesMenu, {
			command: {
				id: 'workBench.action.openGloBalKeyBindings',
				title: { value: nls.localize('KeyBoard Shortcuts', "KeyBoard Shortcuts"), original: 'KeyBoard Shortcuts' }
			},
			group: '2_keyBindings',
			order: 1
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openDefaultKeyBindingsFile',
					title: { value: nls.localize('openDefaultKeyBindingsFile', "Open Default KeyBoard Shortcuts (JSON)"), original: 'Open Default KeyBoard Shortcuts (JSON)' },
					category,
					menu: { id: MenuId.CommandPalette }
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openDefaultKeyBindingsFile();
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: 'workBench.action.openGloBalKeyBindingsFile',
					title: { value: nls.localize('openGloBalKeyBindingsFile', "Open KeyBoard Shortcuts (JSON)"), original: 'Open KeyBoard Shortcuts (JSON)' },
					category,
					icon: { id: 'codicon/go-to-file' },
					menu: [
						{ id: MenuId.CommandPalette },
						{
							id: MenuId.EditorTitle,
							when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
							group: 'navigation',
						}
					]
				});
			}
			run(accessor: ServicesAccessor) {
				return accessor.get(IPreferencesService).openGloBalKeyBindingSettings(true);
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: KEYBINDINGS_EDITOR_SHOW_DEFAULT_KEYBINDINGS,
					title: { value: nls.localize('showDefaultKeyBindings', "Show Default KeyBindings"), original: 'Show Default KeyBindings' },
					menu: [
						{
							id: MenuId.EditorTitle,
							when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
							group: '1_keyBoard_preferences_actions'
						}
					]
				});
			}
			run(accessor: ServicesAccessor) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.search('@source:default');
				}
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: KEYBINDINGS_EDITOR_SHOW_USER_KEYBINDINGS,
					title: { value: nls.localize('showUserKeyBindings', "Show User KeyBindings"), original: 'Show User KeyBindings' },
					menu: [
						{
							id: MenuId.EditorTitle,
							when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
							group: '1_keyBoard_preferences_actions'
						}
					]
				});
			}
			run(accessor: ServicesAccessor) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.search('@source:user');
				}
			}
		});
		registerAction2(class extends Action2 {
			constructor() {
				super({
					id: KEYBINDINGS_EDITOR_COMMAND_CLEAR_SEARCH_RESULTS,
					title: nls.localize('clear', "Clear Search Results"),
					keyBinding: {
						weight: KeyBindingWeight.WorkBenchContriB,
						when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
						primary: KeyCode.Escape,
					}
				});
			}
			run(accessor: ServicesAccessor) {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.clearSearchResults();
				}
			}
		});

		this.registerKeyBindingEditorActions();
	}

	private registerKeyBindingEditorActions(): void {
		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_K),
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.defineKeyBinding(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_DEFINE_WHEN,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_E),
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor && editorPane.activeKeyBindingEntry!.keyBindingItem.keyBinding) {
					editorPane.defineWhenExpression(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_REMOVE,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: KeyCode.Delete,
			mac: {
				primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.Backspace)
			},
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.removeKeyBinding(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_RESET,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: 0,
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.resetKeyBinding(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_SEARCH,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
			primary: KeyMod.CtrlCmd | KeyCode.KEY_F,
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.focusSearch();
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_RECORD_SEARCH_KEYS,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
			primary: KeyMod.Alt | KeyCode.KEY_K,
			mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_K },
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.recordSearchKeys();
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_SORTBY_PRECEDENCE,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR),
			primary: KeyMod.Alt | KeyCode.KEY_P,
			mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_P },
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.toggleSortByPrecedence();
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_SHOW_SIMILAR,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: 0,
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.showSimilarKeyBindings(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_COPY,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
			handler: async (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					await editorPane.copyKeyBinding(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_COPY_COMMAND,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDING_FOCUS),
			primary: 0,
			handler: async (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					await editorPane.copyKeyBindingCommand(editorPane.activeKeyBindingEntry!);
				}
			}
		});

		KeyBindingsRegistry.registerCommandAndKeyBindingRule({
			id: KEYBINDINGS_EDITOR_COMMAND_FOCUS_KEYBINDINGS,
			weight: KeyBindingWeight.WorkBenchContriB,
			when: ContextKeyExpr.and(CONTEXT_KEYBINDINGS_EDITOR, CONTEXT_KEYBINDINGS_SEARCH_FOCUS),
			primary: KeyCode.DownArrow,
			handler: (accessor, args: any) => {
				const editorPane = accessor.get(IEditorService).activeEditorPane;
				if (editorPane instanceof KeyBindingsEditor) {
					editorPane.focusKeyBindings();
				}
			}
		});
	}

	private updatePreferencesEditorMenuItem() {
		const commandId = '_workBench.openWorkspaceSettingsEditor';
		if (this.workspaceContextService.getWorkBenchState() === WorkBenchState.WORKSPACE && !CommandsRegistry.getCommand(commandId)) {
			CommandsRegistry.registerCommand(commandId, () => this.preferencesService.openWorkspaceSettings(false));
			MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
				command: {
					id: commandId,
					title: OPEN_SETTINGS2_ACTION_TITLE,
					icon: { id: 'codicon/go-to-file' }
				},
				when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.workspaceSettingsResource!.toString()), WorkBenchStateContext.isEqualTo('workspace')),
				group: 'navigation',
				order: 1
			});
		}
		this.updatePreferencesEditorMenuItemForWorkspaceFolders();
	}

	private updatePreferencesEditorMenuItemForWorkspaceFolders() {
		for (const folder of this.workspaceContextService.getWorkspace().folders) {
			const commandId = `_workBench.openFolderSettings.${folder.uri.toString()}`;
			if (!CommandsRegistry.getCommand(commandId)) {
				CommandsRegistry.registerCommand(commandId, () => {
					if (this.workspaceContextService.getWorkBenchState() === WorkBenchState.FOLDER) {
						return this.preferencesService.openWorkspaceSettings(false);
					} else {
						return this.preferencesService.openFolderSettings(folder.uri, false);
					}
				});
				MenuRegistry.appendMenuItem(MenuId.EditorTitle, {
					command: {
						id: commandId,
						title: OPEN_SETTINGS2_ACTION_TITLE,
						icon: { id: 'codicon/go-to-file' }
					},
					when: ContextKeyExpr.and(ResourceContextKey.Resource.isEqualTo(this.preferencesService.getFolderSettingsResource(folder.uri)!.toString())),
					group: 'navigation',
					order: 1
				});
			}
		}
	}
}

const workBenchContriButionsRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchContriButionsRegistry.registerWorkBenchContriBution(PreferencesActionsContriBution, LifecyclePhase.Starting);
workBenchContriButionsRegistry.registerWorkBenchContriBution(PreferencesContriBution, LifecyclePhase.Starting);

// Preferences menu

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	title: nls.localize({ key: 'miPreferences', comment: ['&& denotes a mnemonic'] }, "&&Preferences"),
	suBmenu: MenuId.MenuBarPreferencesMenu,
	group: '5_autosave',
	order: 2,
	when: IsMacNativeContext.toNegated() // on macOS native the preferences menu is separate under the application menu
});
