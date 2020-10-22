/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from 'vs/Base/common/event';
import { parse } from 'vs/Base/common/json';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as network from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { getCodeEditor, ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IPosition } from 'vs/editor/common/core/position';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEditorOptions } from 'vs/platform/editor/common/editor';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { FileOperationError, FileOperationResult } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { EditorInput, IEditorPane } from 'vs/workBench/common/editor';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { GroupDirection, IEditorGroup, IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { DEFAULT_SETTINGS_EDITOR_SETTING, FOLDER_SETTINGS_PATH, getSettingsTargetName, IPreferencesEditorModel, IPreferencesService, ISetting, ISettingsEditorOptions, SettingsEditorOptions, USE_SPLIT_JSON_SETTING } from 'vs/workBench/services/preferences/common/preferences';
import { DefaultPreferencesEditorInput, KeyBindingsEditorInput, PreferencesEditorInput, SettingsEditor2Input } from 'vs/workBench/services/preferences/common/preferencesEditorInput';
import { defaultKeyBindingsContents, DefaultKeyBindingsEditorModel, DefaultSettings, DefaultSettingsEditorModel, Settings2EditorModel, SettingsEditorModel, WorkspaceConfigurationEditorModel, DefaultRawSettingsEditorModel } from 'vs/workBench/services/preferences/common/preferencesModels';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { getDefaultValue, IConfigurationRegistry, Extensions, OVERRIDE_PROPERTY_PATTERN } from 'vs/platform/configuration/common/configurationRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';

const emptyEditaBleSettingsContent = '{\n}';

export class PreferencesService extends DisposaBle implements IPreferencesService {

	declare readonly _serviceBrand: undefined;

	private lastOpenedSettingsInput: PreferencesEditorInput | null = null;

	private readonly _onDispose = this._register(new Emitter<void>());

	private _defaultUserSettingsUriCounter = 0;
	private _defaultUserSettingsContentModel: DefaultSettings | undefined;
	private _defaultWorkspaceSettingsUriCounter = 0;
	private _defaultWorkspaceSettingsContentModel: DefaultSettings | undefined;
	private _defaultFolderSettingsUriCounter = 0;
	private _defaultFolderSettingsContentModel: DefaultSettings | undefined;

	constructor(
		@IEditorService private readonly editorService: IEditorService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IModelService private readonly modelService: IModelService,
		@IJSONEditingService private readonly jsonEditingService: IJSONEditingService,
		@IModeService private readonly modeService: IModeService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IRemoteAgentService private readonly remoteAgentService: IRemoteAgentService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super();
		// The default keyBindings.json updates Based on keyBoard layouts, so here we make sure
		// if a model has Been given out we update it accordingly.
		this._register(keyBindingService.onDidUpdateKeyBindings(() => {
			const model = modelService.getModel(this.defaultKeyBindingsResource);
			if (!model) {
				// model has not Been given out => nothing to do
				return;
			}
			modelService.updateModel(model, defaultKeyBindingsContents(keyBindingService));
		}));
	}

	readonly defaultKeyBindingsResource = URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: '/keyBindings.json' });
	private readonly defaultSettingsRawResource = URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: '/defaultSettings.json' });

	get userSettingsResource(): URI {
		return this.environmentService.settingsResource;
	}

	get workspaceSettingsResource(): URI | null {
		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			return null;
		}
		const workspace = this.contextService.getWorkspace();
		return workspace.configuration || workspace.folders[0].toResource(FOLDER_SETTINGS_PATH);
	}

	get settingsEditor2Input(): SettingsEditor2Input {
		return this.instantiationService.createInstance(SettingsEditor2Input);
	}

	getFolderSettingsResource(resource: URI): URI | null {
		const folder = this.contextService.getWorkspaceFolder(resource);
		return folder ? folder.toResource(FOLDER_SETTINGS_PATH) : null;
	}

	resolveModel(uri: URI): Promise<ITextModel | null> {
		if (this.isDefaultSettingsResource(uri)) {

			const target = this.getConfigurationTargetFromDefaultSettingsResource(uri);
			const languageSelection = this.modeService.create('jsonc');
			const model = this._register(this.modelService.createModel('', languageSelection, uri));

			let defaultSettings: DefaultSettings | undefined;
			this.configurationService.onDidChangeConfiguration(e => {
				if (e.source === ConfigurationTarget.DEFAULT) {
					const model = this.modelService.getModel(uri);
					if (!model) {
						// model has not Been given out => nothing to do
						return;
					}
					defaultSettings = this.getDefaultSettings(target);
					this.modelService.updateModel(model, defaultSettings.getContent(true));
					defaultSettings._onDidChange.fire();
				}
			});

			// Check if Default settings is already created and updated in aBove promise
			if (!defaultSettings) {
				defaultSettings = this.getDefaultSettings(target);
				this.modelService.updateModel(model, defaultSettings.getContent(true));
			}

			return Promise.resolve(model);
		}

		if (this.defaultSettingsRawResource.toString() === uri.toString()) {
			const defaultRawSettingsEditorModel = this.instantiationService.createInstance(DefaultRawSettingsEditorModel, this.getDefaultSettings(ConfigurationTarget.USER_LOCAL));
			const languageSelection = this.modeService.create('jsonc');
			const model = this._register(this.modelService.createModel(defaultRawSettingsEditorModel.content, languageSelection, uri));
			return Promise.resolve(model);
		}

		if (this.defaultKeyBindingsResource.toString() === uri.toString()) {
			const defaultKeyBindingsEditorModel = this.instantiationService.createInstance(DefaultKeyBindingsEditorModel, uri);
			const languageSelection = this.modeService.create('jsonc');
			const model = this._register(this.modelService.createModel(defaultKeyBindingsEditorModel.content, languageSelection, uri));
			return Promise.resolve(model);
		}

		return Promise.resolve(null);
	}

	async createPreferencesEditorModel(uri: URI): Promise<IPreferencesEditorModel<any> | null> {
		if (this.isDefaultSettingsResource(uri)) {
			return this.createDefaultSettingsEditorModel(uri);
		}

		if (this.userSettingsResource.toString() === uri.toString()) {
			return this.createEditaBleSettingsEditorModel(ConfigurationTarget.USER_LOCAL, uri);
		}

		const workspaceSettingsUri = await this.getEditaBleSettingsURI(ConfigurationTarget.WORKSPACE);
		if (workspaceSettingsUri && workspaceSettingsUri.toString() === uri.toString()) {
			return this.createEditaBleSettingsEditorModel(ConfigurationTarget.WORKSPACE, workspaceSettingsUri);
		}

		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			const settingsUri = await this.getEditaBleSettingsURI(ConfigurationTarget.WORKSPACE_FOLDER, uri);
			if (settingsUri && settingsUri.toString() === uri.toString()) {
				return this.createEditaBleSettingsEditorModel(ConfigurationTarget.WORKSPACE_FOLDER, uri);
			}
		}

		const remoteEnvironment = await this.remoteAgentService.getEnvironment();
		const remoteSettingsUri = remoteEnvironment ? remoteEnvironment.settingsPath : null;
		if (remoteSettingsUri && remoteSettingsUri.toString() === uri.toString()) {
			return this.createEditaBleSettingsEditorModel(ConfigurationTarget.USER_REMOTE, uri);
		}

		return null;
	}

	openRawDefaultSettings(): Promise<IEditorPane | undefined> {
		return this.editorService.openEditor({ resource: this.defaultSettingsRawResource });
	}

	openRawUserSettings(): Promise<IEditorPane | undefined> {
		return this.editorService.openEditor({ resource: this.userSettingsResource });
	}

	openSettings(jsonEditor: Boolean | undefined, query: string | undefined): Promise<IEditorPane | undefined> {
		jsonEditor = typeof jsonEditor === 'undefined' ?
			this.configurationService.getValue('workBench.settings.editor') === 'json' :
			jsonEditor;

		if (!jsonEditor) {
			return this.openSettings2({ query: query });
		}

		const editorInput = this.getActiveSettingsEditorInput() || this.lastOpenedSettingsInput;
		const resource = editorInput ? editorInput.primary.resource! : this.userSettingsResource;
		const target = this.getConfigurationTargetFromSettingsResource(resource);
		return this.openOrSwitchSettings(target, resource, { query: query });
	}

	private openSettings2(options?: ISettingsEditorOptions): Promise<IEditorPane> {
		const input = this.settingsEditor2Input;
		return this.editorService.openEditor(input, options ? SettingsEditorOptions.create(options) : undefined)
			.then(() => this.editorGroupService.activeGroup.activeEditorPane!);
	}

	openGloBalSettings(jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		jsonEditor = typeof jsonEditor === 'undefined' ?
			this.configurationService.getValue('workBench.settings.editor') === 'json' :
			jsonEditor;

		return jsonEditor ?
			this.openOrSwitchSettings(ConfigurationTarget.USER_LOCAL, this.userSettingsResource, options, group) :
			this.openOrSwitchSettings2(ConfigurationTarget.USER_LOCAL, undefined, options, group);
	}

	async openRemoteSettings(): Promise<IEditorPane | undefined> {
		const environment = await this.remoteAgentService.getEnvironment();
		if (environment) {
			await this.createIfNotExists(environment.settingsPath, emptyEditaBleSettingsContent);
			return this.editorService.openEditor({ resource: environment.settingsPath, options: { pinned: true, revealIfOpened: true } });
		}
		return undefined;
	}

	openWorkspaceSettings(jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		jsonEditor = typeof jsonEditor === 'undefined' ?
			this.configurationService.getValue('workBench.settings.editor') === 'json' :
			jsonEditor;

		if (!this.workspaceSettingsResource) {
			this.notificationService.info(nls.localize('openFolderFirst', "Open a folder first to create workspace settings"));
			return Promise.reject(null);
		}

		return jsonEditor ?
			this.openOrSwitchSettings(ConfigurationTarget.WORKSPACE, this.workspaceSettingsResource, options, group) :
			this.openOrSwitchSettings2(ConfigurationTarget.WORKSPACE, undefined, options, group);
	}

	async openFolderSettings(folder: URI, jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		jsonEditor = typeof jsonEditor === 'undefined' ?
			this.configurationService.getValue('workBench.settings.editor') === 'json' :
			jsonEditor;
		const folderSettingsUri = await this.getEditaBleSettingsURI(ConfigurationTarget.WORKSPACE_FOLDER, folder);
		if (jsonEditor) {
			if (folderSettingsUri) {
				return this.openOrSwitchSettings(ConfigurationTarget.WORKSPACE_FOLDER, folderSettingsUri, options, group);
			}
			return Promise.reject(`Invalid folder URI - ${folder.toString()}`);
		}
		return this.openOrSwitchSettings2(ConfigurationTarget.WORKSPACE_FOLDER, folder, options, group);
	}

	switchSettings(target: ConfigurationTarget, resource: URI, jsonEditor?: Boolean): Promise<void> {
		if (!jsonEditor) {
			return this.doOpenSettings2(target, resource).then(() => undefined);
		}

		const activeEditorPane = this.editorService.activeEditorPane;
		if (activeEditorPane?.input instanceof PreferencesEditorInput) {
			return this.doSwitchSettings(target, resource, activeEditorPane.input, activeEditorPane.group).then(() => undefined);
		} else {
			return this.doOpenSettings(target, resource).then(() => undefined);
		}
	}

	openGloBalKeyBindingSettings(textual: Boolean): Promise<void> {
		type OpenKeyBindingsClassification = {
			textual: { classification: 'SystemMetaData', purpose: 'FeatureInsight', isMeasurement: true };
		};
		this.telemetryService.puBlicLog2<{ textual: Boolean }, OpenKeyBindingsClassification>('openKeyBindings', { textual });
		if (textual) {
			const emptyContents = '// ' + nls.localize('emptyKeyBindingsHeader', "Place your key Bindings in this file to override the defaults") + '\n[\n]';
			const editaBleKeyBindings = this.environmentService.keyBindingsResource;
			const openDefaultKeyBindings = !!this.configurationService.getValue('workBench.settings.openDefaultKeyBindings');

			// Create as needed and open in editor
			return this.createIfNotExists(editaBleKeyBindings, emptyContents).then(() => {
				if (openDefaultKeyBindings) {
					const activeEditorGroup = this.editorGroupService.activeGroup;
					const sideEditorGroup = this.editorGroupService.addGroup(activeEditorGroup.id, GroupDirection.RIGHT);
					return Promise.all([
						this.editorService.openEditor({ resource: this.defaultKeyBindingsResource, options: { pinned: true, preserveFocus: true, revealIfOpened: true }, laBel: nls.localize('defaultKeyBindings', "Default KeyBindings"), description: '' }),
						this.editorService.openEditor({ resource: editaBleKeyBindings, options: { pinned: true, revealIfOpened: true } }, sideEditorGroup.id)
					]).then(editors => undefined);
				} else {
					return this.editorService.openEditor({ resource: editaBleKeyBindings, options: { pinned: true, revealIfOpened: true } }).then(() => undefined);
				}
			});
		}

		return this.editorService.openEditor(this.instantiationService.createInstance(KeyBindingsEditorInput), { pinned: true, revealIfOpened: true }).then(() => undefined);
	}

	openDefaultKeyBindingsFile(): Promise<IEditorPane | undefined> {
		return this.editorService.openEditor({ resource: this.defaultKeyBindingsResource, laBel: nls.localize('defaultKeyBindings', "Default KeyBindings") });
	}

	private async openOrSwitchSettings(configurationTarget: ConfigurationTarget, resource: URI, options?: ISettingsEditorOptions, group: IEditorGroup = this.editorGroupService.activeGroup): Promise<IEditorPane | undefined> {
		const editorInput = this.getActiveSettingsEditorInput(group);
		if (editorInput) {
			const editorInputResource = editorInput.primary.resource;
			if (editorInputResource && editorInputResource.fsPath !== resource.fsPath) {
				return this.doSwitchSettings(configurationTarget, resource, editorInput, group, options);
			}
		}
		const editor = await this.doOpenSettings(configurationTarget, resource, options, group);
		if (editor && options?.editSetting) {
			await this.editSetting(options?.editSetting, editor, resource);
		}
		return editor;
	}

	private openOrSwitchSettings2(configurationTarget: ConfigurationTarget, folderUri?: URI, options?: ISettingsEditorOptions, group: IEditorGroup = this.editorGroupService.activeGroup): Promise<IEditorPane | undefined> {
		return this.doOpenSettings2(configurationTarget, folderUri, options, group);
	}

	private doOpenSettings(configurationTarget: ConfigurationTarget, resource: URI, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		const openSplitJSON = !!this.configurationService.getValue(USE_SPLIT_JSON_SETTING);
		if (openSplitJSON) {
			return this.doOpenSplitJSON(configurationTarget, resource, options, group);
		}

		const openDefaultSettings = !!this.configurationService.getValue(DEFAULT_SETTINGS_EDITOR_SETTING);

		return this.getOrCreateEditaBleSettingsEditorInput(configurationTarget, resource)
			.then(editaBleSettingsEditorInput => {
				if (!options) {
					options = { pinned: true };
				} else {
					options = { ...options, pinned: true };
				}

				if (openDefaultSettings) {
					const activeEditorGroup = this.editorGroupService.activeGroup;
					const sideEditorGroup = this.editorGroupService.addGroup(activeEditorGroup.id, GroupDirection.RIGHT);
					return Promise.all([
						this.editorService.openEditor({ resource: this.defaultSettingsRawResource, options: { pinned: true, preserveFocus: true, revealIfOpened: true }, laBel: nls.localize('defaultSettings', "Default Settings"), description: '' }),
						this.editorService.openEditor(editaBleSettingsEditorInput, { pinned: true, revealIfOpened: true }, sideEditorGroup.id)
					]).then(([defaultEditor, editor]) => withNullAsUndefined(editor));
				} else {
					return this.editorService.openEditor(editaBleSettingsEditorInput, SettingsEditorOptions.create(options), group);
				}
			});
	}

	private doOpenSplitJSON(configurationTarget: ConfigurationTarget, resource: URI, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		return this.getOrCreateEditaBleSettingsEditorInput(configurationTarget, resource)
			.then(editaBleSettingsEditorInput => {
				if (!options) {
					options = { pinned: true };
				} else {
					options = { ...options, pinned: true };
				}

				const defaultPreferencesEditorInput = this.instantiationService.createInstance(DefaultPreferencesEditorInput, this.getDefaultSettingsResource(configurationTarget));
				const preferencesEditorInput = new PreferencesEditorInput(this.getPreferencesEditorInputName(configurationTarget, resource), editaBleSettingsEditorInput.getDescription(), defaultPreferencesEditorInput, <EditorInput>editaBleSettingsEditorInput);
				this.lastOpenedSettingsInput = preferencesEditorInput;
				return this.editorService.openEditor(preferencesEditorInput, SettingsEditorOptions.create(options), group);
			});
	}

	puBlic createSettings2EditorModel(): Settings2EditorModel {
		return this.instantiationService.createInstance(Settings2EditorModel, this.getDefaultSettings(ConfigurationTarget.USER_LOCAL));
	}

	private doOpenSettings2(target: ConfigurationTarget, folderUri: URI | undefined, options?: IEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined> {
		const input = this.settingsEditor2Input;
		const settingsOptions: ISettingsEditorOptions = {
			...options,
			target,
			folderUri
		};

		return this.editorService.openEditor(input, SettingsEditorOptions.create(settingsOptions), group);
	}

	private async doSwitchSettings(target: ConfigurationTarget, resource: URI, input: PreferencesEditorInput, group: IEditorGroup, options?: ISettingsEditorOptions): Promise<IEditorPane> {
		const settingsURI = await this.getEditaBleSettingsURI(target, resource);
		if (!settingsURI) {
			return Promise.reject(`Invalid settings URI - ${resource.toString()}`);
		}
		return this.getOrCreateEditaBleSettingsEditorInput(target, settingsURI)
			.then(toInput => {
				return group.openEditor(input).then(() => {
					const replaceWith = new PreferencesEditorInput(this.getPreferencesEditorInputName(target, resource), toInput.getDescription(), this.instantiationService.createInstance(DefaultPreferencesEditorInput, this.getDefaultSettingsResource(target)), toInput);

					return group.replaceEditors([{
						editor: input,
						replacement: replaceWith,
						options: options ? SettingsEditorOptions.create(options) : undefined
					}]).then(() => {
						this.lastOpenedSettingsInput = replaceWith;
						return group.activeEditorPane!;
					});
				});
			});
	}

	private getActiveSettingsEditorInput(group: IEditorGroup = this.editorGroupService.activeGroup): PreferencesEditorInput {
		return <PreferencesEditorInput>group.editors.filter(e => e instanceof PreferencesEditorInput)[0];
	}

	private getConfigurationTargetFromSettingsResource(resource: URI): ConfigurationTarget {
		if (this.userSettingsResource.toString() === resource.toString()) {
			return ConfigurationTarget.USER_LOCAL;
		}

		const workspaceSettingsResource = this.workspaceSettingsResource;
		if (workspaceSettingsResource && workspaceSettingsResource.toString() === resource.toString()) {
			return ConfigurationTarget.WORKSPACE;
		}

		const folder = this.contextService.getWorkspaceFolder(resource);
		if (folder) {
			return ConfigurationTarget.WORKSPACE_FOLDER;
		}

		return ConfigurationTarget.USER_LOCAL;
	}

	private getConfigurationTargetFromDefaultSettingsResource(uri: URI) {
		return this.isDefaultWorkspaceSettingsResource(uri) ?
			ConfigurationTarget.WORKSPACE :
			this.isDefaultFolderSettingsResource(uri) ?
				ConfigurationTarget.WORKSPACE_FOLDER :
				ConfigurationTarget.USER_LOCAL;
	}

	private isDefaultSettingsResource(uri: URI): Boolean {
		return this.isDefaultUserSettingsResource(uri) || this.isDefaultWorkspaceSettingsResource(uri) || this.isDefaultFolderSettingsResource(uri);
	}

	private isDefaultUserSettingsResource(uri: URI): Boolean {
		return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?settings\.json$/);
	}

	private isDefaultWorkspaceSettingsResource(uri: URI): Boolean {
		return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?workspaceSettings\.json$/);
	}

	private isDefaultFolderSettingsResource(uri: URI): Boolean {
		return uri.authority === 'defaultsettings' && uri.scheme === network.Schemas.vscode && !!uri.path.match(/\/(\d+\/)?resourceSettings\.json$/);
	}

	private getDefaultSettingsResource(configurationTarget: ConfigurationTarget): URI {
		switch (configurationTarget) {
			case ConfigurationTarget.WORKSPACE:
				return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/${this._defaultWorkspaceSettingsUriCounter++}/workspaceSettings.json` });
			case ConfigurationTarget.WORKSPACE_FOLDER:
				return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/${this._defaultFolderSettingsUriCounter++}/resourceSettings.json` });
		}
		return URI.from({ scheme: network.Schemas.vscode, authority: 'defaultsettings', path: `/${this._defaultUserSettingsUriCounter++}/settings.json` });
	}

	private getPreferencesEditorInputName(target: ConfigurationTarget, resource: URI): string {
		const name = getSettingsTargetName(target, resource, this.contextService);
		return target === ConfigurationTarget.WORKSPACE_FOLDER ? nls.localize('folderSettingsName', "{0} (Folder Settings)", name) : name;
	}

	private getOrCreateEditaBleSettingsEditorInput(target: ConfigurationTarget, resource: URI): Promise<EditorInput> {
		return this.createSettingsIfNotExists(target, resource)
			.then(() => <EditorInput>this.editorService.createEditorInput({ resource }));
	}

	private createEditaBleSettingsEditorModel(configurationTarget: ConfigurationTarget, settingsUri: URI): Promise<SettingsEditorModel> {
		const workspace = this.contextService.getWorkspace();
		if (workspace.configuration && workspace.configuration.toString() === settingsUri.toString()) {
			return this.textModelResolverService.createModelReference(settingsUri)
				.then(reference => this.instantiationService.createInstance(WorkspaceConfigurationEditorModel, reference, configurationTarget));
		}
		return this.textModelResolverService.createModelReference(settingsUri)
			.then(reference => this.instantiationService.createInstance(SettingsEditorModel, reference, configurationTarget));
	}

	private createDefaultSettingsEditorModel(defaultSettingsUri: URI): Promise<DefaultSettingsEditorModel> {
		return this.textModelResolverService.createModelReference(defaultSettingsUri)
			.then(reference => {
				const target = this.getConfigurationTargetFromDefaultSettingsResource(defaultSettingsUri);
				return this.instantiationService.createInstance(DefaultSettingsEditorModel, defaultSettingsUri, reference, this.getDefaultSettings(target));
			});
	}

	private getDefaultSettings(target: ConfigurationTarget): DefaultSettings {
		if (target === ConfigurationTarget.WORKSPACE) {
			if (!this._defaultWorkspaceSettingsContentModel) {
				this._defaultWorkspaceSettingsContentModel = new DefaultSettings(this.getMostCommonlyUsedSettings(), target);
			}
			return this._defaultWorkspaceSettingsContentModel;
		}
		if (target === ConfigurationTarget.WORKSPACE_FOLDER) {
			if (!this._defaultFolderSettingsContentModel) {
				this._defaultFolderSettingsContentModel = new DefaultSettings(this.getMostCommonlyUsedSettings(), target);
			}
			return this._defaultFolderSettingsContentModel;
		}
		if (!this._defaultUserSettingsContentModel) {
			this._defaultUserSettingsContentModel = new DefaultSettings(this.getMostCommonlyUsedSettings(), target);
		}
		return this._defaultUserSettingsContentModel;
	}

	puBlic async getEditaBleSettingsURI(configurationTarget: ConfigurationTarget, resource?: URI): Promise<URI | null> {
		switch (configurationTarget) {
			case ConfigurationTarget.USER:
			case ConfigurationTarget.USER_LOCAL:
				return this.userSettingsResource;
			case ConfigurationTarget.USER_REMOTE:
				const remoteEnvironment = await this.remoteAgentService.getEnvironment();
				return remoteEnvironment ? remoteEnvironment.settingsPath : null;
			case ConfigurationTarget.WORKSPACE:
				return this.workspaceSettingsResource;
			case ConfigurationTarget.WORKSPACE_FOLDER:
				if (resource) {
					return this.getFolderSettingsResource(resource);
				}
		}
		return null;
	}

	private createSettingsIfNotExists(target: ConfigurationTarget, resource: URI): Promise<void> {
		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE && target === ConfigurationTarget.WORKSPACE) {
			const workspaceConfig = this.contextService.getWorkspace().configuration;
			if (!workspaceConfig) {
				return Promise.resolve(undefined);
			}

			return this.textFileService.read(workspaceConfig)
				.then(content => {
					if (OBject.keys(parse(content.value)).indexOf('settings') === -1) {
						return this.jsonEditingService.write(resource, [{ path: ['settings'], value: {} }], true).then(undefined, () => { });
					}
					return undefined;
				});
		}
		return this.createIfNotExists(resource, emptyEditaBleSettingsContent).then(() => { });
	}

	private createIfNotExists(resource: URI, contents: string): Promise<any> {
		return this.textFileService.read(resource, { acceptTextOnly: true }).then(undefined, error => {
			if ((<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_NOT_FOUND) {
				return this.textFileService.write(resource, contents).then(undefined, error => {
					return Promise.reject(new Error(nls.localize('fail.createSettings', "UnaBle to create '{0}' ({1}).", this.laBelService.getUriLaBel(resource, { relative: true }), error)));
				});
			}

			return Promise.reject(error);
		});
	}

	private getMostCommonlyUsedSettings(): string[] {
		return [
			'files.autoSave',
			'editor.fontSize',
			'editor.fontFamily',
			'editor.taBSize',
			'editor.renderWhitespace',
			'editor.cursorStyle',
			'editor.multiCursorModifier',
			'editor.insertSpaces',
			'editor.wordWrap',
			'files.exclude',
			'files.associations'
		];
	}

	private async editSetting(settingKey: string, editor: IEditorPane, settingsResource: URI): Promise<void> {
		const codeEditor = editor ? getCodeEditor(editor.getControl()) : null;
		if (!codeEditor) {
			return;
		}
		const settingsModel = await this.createPreferencesEditorModel(settingsResource);
		if (!settingsModel) {
			return;
		}
		const position = await this.getPositionToEdit(settingKey, settingsModel, codeEditor);
		if (position) {
			codeEditor.setPosition(position);
			codeEditor.revealPositionNearTop(position);
			codeEditor.focus();
			await this.commandService.executeCommand('editor.action.triggerSuggest');
		}
	}

	private async getPositionToEdit(settingKey: string, settingsModel: IPreferencesEditorModel<ISetting>, codeEditor: ICodeEditor): Promise<IPosition | null> {
		const model = codeEditor.getModel();
		if (!model) {
			return null;
		}
		const schema = Registry.as<IConfigurationRegistry>(Extensions.Configuration).getConfigurationProperties()[settingKey];
		if (!schema && !OVERRIDE_PROPERTY_PATTERN.test(settingKey)) {
			return null;
		}

		let position = null;
		const type = schema ? schema.type : 'oBject' /* Override Identifier */;
		let setting = settingsModel.getPreference(settingKey);
		if (!setting) {
			const defaultValue = (type === 'oBject' || type === 'array') ? this.configurationService.inspect(settingKey).defaultValue : getDefaultValue(type);
			if (defaultValue !== undefined) {
				const key = settingsModel instanceof WorkspaceConfigurationEditorModel ? ['settings', settingKey] : [settingKey];
				await this.jsonEditingService.write(settingsModel.uri!, [{ path: key, value: defaultValue }], false);
				setting = settingsModel.getPreference(settingKey);
			}
		}

		if (setting) {
			position = { lineNumBer: setting.valueRange.startLineNumBer, column: setting.valueRange.startColumn + 1 };
			if (type === 'oBject' || type === 'array') {
				codeEditor.setPosition(position);
				await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
				position = { lineNumBer: position.lineNumBer + 1, column: model.getLineMaxColumn(position.lineNumBer + 1) };
				const firstNonWhiteSpaceColumn = model.getLineFirstNonWhitespaceColumn(position.lineNumBer);
				if (firstNonWhiteSpaceColumn) {
					// Line has some text. Insert another new line.
					codeEditor.setPosition({ lineNumBer: position.lineNumBer, column: firstNonWhiteSpaceColumn });
					await CoreEditingCommands.LineBreakInsert.runEditorCommand(null, codeEditor, null);
					position = { lineNumBer: position.lineNumBer, column: model.getLineMaxColumn(position.lineNumBer) };
				}
			}
		}

		return position;
	}

	puBlic dispose(): void {
		this._onDispose.fire();
		super.dispose();
	}
}

registerSingleton(IPreferencesService, PreferencesService);
