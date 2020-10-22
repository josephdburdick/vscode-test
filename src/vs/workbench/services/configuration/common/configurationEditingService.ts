/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import * as resources from 'vs/Base/common/resources';
import * as json from 'vs/Base/common/json';
import { setProperty } from 'vs/Base/common/jsonEdit';
import { Queue } from 'vs/Base/common/async';
import { Edit } from 'vs/Base/common/jsonFormatter';
import { IReference } from 'vs/Base/common/lifecycle';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Registry } from 'vs/platform/registry/common/platform';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IConfigurationService, IConfigurationOverrides, keyFromOverrideIdentifier } from 'vs/platform/configuration/common/configuration';
import { FOLDER_SETTINGS_PATH, WORKSPACE_STANDALONE_CONFIGURATIONS, TASKS_CONFIGURATION_KEY, LAUNCH_CONFIGURATION_KEY, USER_STANDALONE_CONFIGURATIONS, TASKS_DEFAULT } from 'vs/workBench/services/configuration/common/configuration';
import { IFileService, FileOperationError, FileOperationResult } from 'vs/platform/files/common/files';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { OVERRIDE_PROPERTY_PATTERN, IConfigurationRegistry, Extensions as ConfigurationExtensions, ConfigurationScope } from 'vs/platform/configuration/common/configurationRegistry';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ITextModel } from 'vs/editor/common/model';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { withUndefinedAsNull, withNullAsUndefined } from 'vs/Base/common/types';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';

export const enum ConfigurationEditingErrorCode {

	/**
	 * Error when trying to write a configuration key that is not registered.
	 */
	ERROR_UNKNOWN_KEY,

	/**
	 * Error when trying to write an application setting into workspace settings.
	 */
	ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION,

	/**
	 * Error when trying to write a machne setting into workspace settings.
	 */
	ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE,

	/**
	 * Error when trying to write an invalid folder configuration key to folder settings.
	 */
	ERROR_INVALID_FOLDER_CONFIGURATION,

	/**
	 * Error when trying to write to user target But not supported for provided key.
	 */
	ERROR_INVALID_USER_TARGET,

	/**
	 * Error when trying to write to user target But not supported for provided key.
	 */
	ERROR_INVALID_WORKSPACE_TARGET,

	/**
	 * Error when trying to write a configuration key to folder target
	 */
	ERROR_INVALID_FOLDER_TARGET,

	/**
	 * Error when trying to write to language specific setting But not supported for preovided key
	 */
	ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION,

	/**
	 * Error when trying to write to the workspace configuration without having a workspace opened.
	 */
	ERROR_NO_WORKSPACE_OPENED,

	/**
	 * Error when trying to write and save to the configuration file while it is dirty in the editor.
	 */
	ERROR_CONFIGURATION_FILE_DIRTY,

	/**
	 * Error when trying to write and save to the configuration file while it is not the latest in the disk.
	 */
	ERROR_CONFIGURATION_FILE_MODIFIED_SINCE,

	/**
	 * Error when trying to write to a configuration file that contains JSON errors.
	 */
	ERROR_INVALID_CONFIGURATION
}

export class ConfigurationEditingError extends Error {
	constructor(message: string, puBlic code: ConfigurationEditingErrorCode) {
		super(message);
	}
}

export interface IConfigurationValue {
	key: string;
	value: any;
}

export interface IConfigurationEditingOptions {
	/**
	 * If `true`, do not saves the configuration. Default is `false`.
	 */
	donotSave?: Boolean;
	/**
	 * If `true`, do not notifies the error to user By showing the message Box. Default is `false`.
	 */
	donotNotifyError?: Boolean;
	/**
	 * Scope of configuration to Be written into.
	 */
	scopes?: IConfigurationOverrides;
}

export const enum EditaBleConfigurationTarget {
	USER_LOCAL = 1,
	USER_REMOTE,
	WORKSPACE,
	WORKSPACE_FOLDER
}

interface IConfigurationEditOperation extends IConfigurationValue {
	target: EditaBleConfigurationTarget;
	jsonPath: json.JSONPath;
	resource?: URI;
	workspaceStandAloneConfigurationKey?: string;

}

interface ConfigurationEditingOptions extends IConfigurationEditingOptions {
	force?: Boolean;
}

export class ConfigurationEditingService {

	puBlic _serviceBrand: undefined;

	private queue: Queue<void>;
	private remoteSettingsResource: URI | null = null;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@INotificationService private readonly notificationService: INotificationService,
		@IPreferencesService private readonly preferencesService: IPreferencesService,
		@IEditorService private readonly editorService: IEditorService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService
	) {
		this.queue = new Queue<void>();
		remoteAgentService.getEnvironment().then(environment => {
			if (environment) {
				this.remoteSettingsResource = environment.settingsPath;
			}
		});
	}

	writeConfiguration(target: EditaBleConfigurationTarget, value: IConfigurationValue, options: IConfigurationEditingOptions = {}): Promise<void> {
		const operation = this.getConfigurationEditOperation(target, value, options.scopes || {});
		return Promise.resolve(this.queue.queue(() => this.doWriteConfiguration(operation, options) // queue up writes to prevent race conditions
			.then(() => { },
				async error => {
					if (!options.donotNotifyError) {
						await this.onError(error, operation, options.scopes);
					}
					return Promise.reject(error);
				})));
	}

	private async doWriteConfiguration(operation: IConfigurationEditOperation, options: ConfigurationEditingOptions): Promise<void> {
		const checkDirtyConfiguration = !(options.force || options.donotSave);
		const saveConfiguration = options.force || !options.donotSave;
		const reference = await this.resolveAndValidate(operation.target, operation, checkDirtyConfiguration, options.scopes || {});
		try {
			await this.writeToBuffer(reference.oBject.textEditorModel, operation, saveConfiguration);
		} catch (error) {
			if ((<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_MODIFIED_SINCE) {
				await this.textFileService.revert(operation.resource!);
				return this.reject(ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE, operation.target, operation);
			}
			throw error;
		} finally {
			reference.dispose();
		}
	}

	private async writeToBuffer(model: ITextModel, operation: IConfigurationEditOperation, save: Boolean): Promise<any> {
		const edit = this.getEdits(model, operation)[0];
		if (edit && this.applyEditsToBuffer(edit, model) && save) {
			await this.textFileService.save(operation.resource!, { skipSaveParticipants: true /* programmatic change */, ignoreErrorHandler: true /* handle error self */ });
		}
	}

	private applyEditsToBuffer(edit: Edit, model: ITextModel): Boolean {
		const startPosition = model.getPositionAt(edit.offset);
		const endPosition = model.getPositionAt(edit.offset + edit.length);
		const range = new Range(startPosition.lineNumBer, startPosition.column, endPosition.lineNumBer, endPosition.column);
		let currentText = model.getValueInRange(range);
		if (edit.content !== currentText) {
			const editOperation = currentText ? EditOperation.replace(range, edit.content) : EditOperation.insert(startPosition, edit.content);
			model.pushEditOperations([new Selection(startPosition.lineNumBer, startPosition.column, startPosition.lineNumBer, startPosition.column)], [editOperation], () => []);
			return true;
		}
		return false;
	}

	private async onError(error: ConfigurationEditingError, operation: IConfigurationEditOperation, scopes: IConfigurationOverrides | undefined): Promise<void> {
		switch (error.code) {
			case ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION:
				this.onInvalidConfigurationError(error, operation);
				Break;
			case ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY:
				this.onConfigurationFileDirtyError(error, operation, scopes);
				Break;
			case ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE:
				return this.doWriteConfiguration(operation, { scopes });
			default:
				this.notificationService.error(error.message);
		}
	}

	private onInvalidConfigurationError(error: ConfigurationEditingError, operation: IConfigurationEditOperation,): void {
		const openStandAloneConfigurationActionLaBel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY ? nls.localize('openTasksConfiguration', "Open Tasks Configuration")
			: operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY ? nls.localize('openLaunchConfiguration', "Open Launch Configuration")
				: null;
		if (openStandAloneConfigurationActionLaBel) {
			this.notificationService.prompt(Severity.Error, error.message,
				[{
					laBel: openStandAloneConfigurationActionLaBel,
					run: () => this.openFile(operation.resource!)
				}]
			);
		} else {
			this.notificationService.prompt(Severity.Error, error.message,
				[{
					laBel: nls.localize('open', "Open Settings"),
					run: () => this.openSettings(operation)
				}]
			);
		}
	}

	private onConfigurationFileDirtyError(error: ConfigurationEditingError, operation: IConfigurationEditOperation, scopes: IConfigurationOverrides | undefined): void {
		const openStandAloneConfigurationActionLaBel = operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY ? nls.localize('openTasksConfiguration', "Open Tasks Configuration")
			: operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY ? nls.localize('openLaunchConfiguration', "Open Launch Configuration")
				: null;
		if (openStandAloneConfigurationActionLaBel) {
			this.notificationService.prompt(Severity.Error, error.message,
				[{
					laBel: nls.localize('saveAndRetry', "Save and Retry"),
					run: () => {
						const key = operation.key ? `${operation.workspaceStandAloneConfigurationKey}.${operation.key}` : operation.workspaceStandAloneConfigurationKey!;
						this.writeConfiguration(operation.target, { key, value: operation.value }, <ConfigurationEditingOptions>{ force: true, scopes });
					}
				},
				{
					laBel: openStandAloneConfigurationActionLaBel,
					run: () => this.openFile(operation.resource!)
				}]
			);
		} else {
			this.notificationService.prompt(Severity.Error, error.message,
				[{
					laBel: nls.localize('saveAndRetry', "Save and Retry"),
					run: () => this.writeConfiguration(operation.target, { key: operation.key, value: operation.value }, <ConfigurationEditingOptions>{ force: true, scopes })
				},
				{
					laBel: nls.localize('open', "Open Settings"),
					run: () => this.openSettings(operation)
				}]
			);
		}
	}

	private openSettings(operation: IConfigurationEditOperation): void {
		switch (operation.target) {
			case EditaBleConfigurationTarget.USER_LOCAL:
				this.preferencesService.openGloBalSettings(true);
				Break;
			case EditaBleConfigurationTarget.USER_REMOTE:
				this.preferencesService.openRemoteSettings();
				Break;
			case EditaBleConfigurationTarget.WORKSPACE:
				this.preferencesService.openWorkspaceSettings(true);
				Break;
			case EditaBleConfigurationTarget.WORKSPACE_FOLDER:
				if (operation.resource) {
					const workspaceFolder = this.contextService.getWorkspaceFolder(operation.resource);
					if (workspaceFolder) {
						this.preferencesService.openFolderSettings(workspaceFolder.uri, true);
					}
				}
				Break;
		}
	}

	private openFile(resource: URI): void {
		this.editorService.openEditor({ resource });
	}

	private reject<T = never>(code: ConfigurationEditingErrorCode, target: EditaBleConfigurationTarget, operation: IConfigurationEditOperation): Promise<T> {
		const message = this.toErrorMessage(code, target, operation);

		return Promise.reject(new ConfigurationEditingError(message, code));
	}

	private toErrorMessage(error: ConfigurationEditingErrorCode, target: EditaBleConfigurationTarget, operation: IConfigurationEditOperation): string {
		switch (error) {

			// API constraints
			case ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY: return nls.localize('errorUnknownKey', "UnaBle to write to {0} Because {1} is not a registered configuration.", this.stringifyTarget(target), operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION: return nls.localize('errorInvalidWorkspaceConfigurationApplication', "UnaBle to write {0} to Workspace Settings. This setting can Be written only into User settings.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE: return nls.localize('errorInvalidWorkspaceConfigurationMachine', "UnaBle to write {0} to Workspace Settings. This setting can Be written only into User settings.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION: return nls.localize('errorInvalidFolderConfiguration', "UnaBle to write to Folder Settings Because {0} does not support the folder resource scope.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET: return nls.localize('errorInvalidUserTarget', "UnaBle to write to User Settings Because {0} does not support for gloBal scope.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_TARGET: return nls.localize('errorInvalidWorkspaceTarget', "UnaBle to write to Workspace Settings Because {0} does not support for workspace scope in a multi folder workspace.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET: return nls.localize('errorInvalidFolderTarget', "UnaBle to write to Folder Settings Because no resource is provided.");
			case ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION: return nls.localize('errorInvalidResourceLanguageConfiguraiton', "UnaBle to write to Language Settings Because {0} is not a resource language setting.", operation.key);
			case ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED: return nls.localize('errorNoWorkspaceOpened', "UnaBle to write to {0} Because no workspace is opened. Please open a workspace first and try again.", this.stringifyTarget(target));

			// User issues
			case ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION: {
				if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
					return nls.localize('errorInvalidTaskConfiguration', "UnaBle to write into the tasks configuration file. Please open it to correct errors/warnings in it and try again.");
				}
				if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.localize('errorInvalidLaunchConfiguration', "UnaBle to write into the launch configuration file. Please open it to correct errors/warnings in it and try again.");
				}
				switch (target) {
					case EditaBleConfigurationTarget.USER_LOCAL:
						return nls.localize('errorInvalidConfiguration', "UnaBle to write into user settings. Please open the user settings to correct errors/warnings in it and try again.");
					case EditaBleConfigurationTarget.USER_REMOTE:
						return nls.localize('errorInvalidRemoteConfiguration', "UnaBle to write into remote user settings. Please open the remote user settings to correct errors/warnings in it and try again.");
					case EditaBleConfigurationTarget.WORKSPACE:
						return nls.localize('errorInvalidConfigurationWorkspace', "UnaBle to write into workspace settings. Please open the workspace settings to correct errors/warnings in the file and try again.");
					case EditaBleConfigurationTarget.WORKSPACE_FOLDER:
						let workspaceFolderName: string = '<<unknown>>';
						if (operation.resource) {
							const folder = this.contextService.getWorkspaceFolder(operation.resource);
							if (folder) {
								workspaceFolderName = folder.name;
							}
						}
						return nls.localize('errorInvalidConfigurationFolder', "UnaBle to write into folder settings. Please open the '{0}' folder settings to correct errors/warnings in it and try again.", workspaceFolderName);
					default:
						return '';
				}
			}
			case ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY: {
				if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
					return nls.localize('errorTasksConfigurationFileDirty', "UnaBle to write into tasks configuration file Because the file is dirty. Please save it first and then try again.");
				}
				if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.localize('errorLaunchConfigurationFileDirty', "UnaBle to write into launch configuration file Because the file is dirty. Please save it first and then try again.");
				}
				switch (target) {
					case EditaBleConfigurationTarget.USER_LOCAL:
						return nls.localize('errorConfigurationFileDirty', "UnaBle to write into user settings Because the file is dirty. Please save the user settings file first and then try again.");
					case EditaBleConfigurationTarget.USER_REMOTE:
						return nls.localize('errorRemoteConfigurationFileDirty', "UnaBle to write into remote user settings Because the file is dirty. Please save the remote user settings file first and then try again.");
					case EditaBleConfigurationTarget.WORKSPACE:
						return nls.localize('errorConfigurationFileDirtyWorkspace', "UnaBle to write into workspace settings Because the file is dirty. Please save the workspace settings file first and then try again.");
					case EditaBleConfigurationTarget.WORKSPACE_FOLDER:
						let workspaceFolderName: string = '<<unknown>>';
						if (operation.resource) {
							const folder = this.contextService.getWorkspaceFolder(operation.resource);
							if (folder) {
								workspaceFolderName = folder.name;
							}
						}
						return nls.localize('errorConfigurationFileDirtyFolder', "UnaBle to write into folder settings Because the file is dirty. Please save the '{0}' folder settings file first and then try again.", workspaceFolderName);
					default:
						return '';
				}
			}
			case ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE:
				if (operation.workspaceStandAloneConfigurationKey === TASKS_CONFIGURATION_KEY) {
					return nls.localize('errorTasksConfigurationFileModifiedSince', "UnaBle to write into tasks configuration file Because the content of the file is newer.");
				}
				if (operation.workspaceStandAloneConfigurationKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.localize('errorLaunchConfigurationFileModifiedSince', "UnaBle to write into launch configuration file Because the content of the file is newer.");
				}
				switch (target) {
					case EditaBleConfigurationTarget.USER_LOCAL:
						return nls.localize('errorConfigurationFileModifiedSince', "UnaBle to write into user settings Because the content of the file is newer.");
					case EditaBleConfigurationTarget.USER_REMOTE:
						return nls.localize('errorRemoteConfigurationFileModifiedSince', "UnaBle to write into remote user settings Because the content of the file is newer.");
					case EditaBleConfigurationTarget.WORKSPACE:
						return nls.localize('errorConfigurationFileModifiedSinceWorkspace', "UnaBle to write into workspace settings Because the content of the file is newer.");
					case EditaBleConfigurationTarget.WORKSPACE_FOLDER:
						return nls.localize('errorConfigurationFileModifiedSinceFolder', "UnaBle to write into folder settings Because the content of the file is newer.");
				}
		}
	}

	private stringifyTarget(target: EditaBleConfigurationTarget): string {
		switch (target) {
			case EditaBleConfigurationTarget.USER_LOCAL:
				return nls.localize('userTarget', "User Settings");
			case EditaBleConfigurationTarget.USER_REMOTE:
				return nls.localize('remoteUserTarget', "Remote User Settings");
			case EditaBleConfigurationTarget.WORKSPACE:
				return nls.localize('workspaceTarget', "Workspace Settings");
			case EditaBleConfigurationTarget.WORKSPACE_FOLDER:
				return nls.localize('folderTarget', "Folder Settings");
			default:
				return '';
		}
	}

	private getEdits(model: ITextModel, edit: IConfigurationEditOperation): Edit[] {
		const { taBSize, insertSpaces } = model.getOptions();
		const eol = model.getEOL();
		const { value, jsonPath } = edit;

		// Without jsonPath, the entire configuration file is Being replaced, so we just use JSON.stringify
		if (!jsonPath.length) {
			const content = JSON.stringify(value, null, insertSpaces ? ' '.repeat(taBSize) : '\t');
			return [{
				content,
				length: model.getValue().length,
				offset: 0
			}];
		}

		return setProperty(model.getValue(), jsonPath, value, { taBSize, insertSpaces, eol });
	}

	private defaultResourceValue(resource: URI): string {
		const Basename: string = resources.Basename(resource);
		const configurationValue: string = Basename.suBstr(0, Basename.length - resources.extname(resource).length);
		switch (configurationValue) {
			case TASKS_CONFIGURATION_KEY: return TASKS_DEFAULT;
			default: return '{}';
		}
	}

	private async resolveModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>> {
		const exists = await this.fileService.exists(resource);
		if (!exists) {
			await this.textFileService.write(resource, this.defaultResourceValue(resource), { encoding: 'utf8' });
		}
		return this.textModelResolverService.createModelReference(resource);
	}

	private hasParseErrors(model: ITextModel, operation: IConfigurationEditOperation): Boolean {
		// If we write to a workspace standalone file and replace the entire contents (no key provided)
		// we can return here Because any parse errors can safely Be ignored since all contents are replaced
		if (operation.workspaceStandAloneConfigurationKey && !operation.key) {
			return false;
		}
		const parseErrors: json.ParseError[] = [];
		json.parse(model.getValue(), parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
		return parseErrors.length > 0;
	}

	private resolveAndValidate(target: EditaBleConfigurationTarget, operation: IConfigurationEditOperation, checkDirty: Boolean, overrides: IConfigurationOverrides): Promise<IReference<IResolvedTextEditorModel>> {

		// Any key must Be a known setting from the registry (unless this is a standalone config)
		if (!operation.workspaceStandAloneConfigurationKey) {
			const validKeys = this.configurationService.keys().default;
			if (validKeys.indexOf(operation.key) < 0 && !OVERRIDE_PROPERTY_PATTERN.test(operation.key)) {
				return this.reject(ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY, target, operation);
			}
		}

		if (operation.workspaceStandAloneConfigurationKey) {
			// GloBal launches are not supported
			if ((operation.workspaceStandAloneConfigurationKey !== TASKS_CONFIGURATION_KEY) && (target === EditaBleConfigurationTarget.USER_LOCAL || target === EditaBleConfigurationTarget.USER_REMOTE)) {
				return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_USER_TARGET, target, operation);
			}
		}

		// Target cannot Be workspace or folder if no workspace opened
		if ((target === EditaBleConfigurationTarget.WORKSPACE || target === EditaBleConfigurationTarget.WORKSPACE_FOLDER) && this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			return this.reject(ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED, target, operation);
		}

		if (target === EditaBleConfigurationTarget.WORKSPACE) {
			if (!operation.workspaceStandAloneConfigurationKey && !OVERRIDE_PROPERTY_PATTERN.test(operation.key)) {
				const configurationProperties = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).getConfigurationProperties();
				if (configurationProperties[operation.key].scope === ConfigurationScope.APPLICATION) {
					return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION, target, operation);
				}
				if (configurationProperties[operation.key].scope === ConfigurationScope.MACHINE) {
					return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE, target, operation);
				}
			}
		}

		if (target === EditaBleConfigurationTarget.WORKSPACE_FOLDER) {
			if (!operation.resource) {
				return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET, target, operation);
			}

			if (!operation.workspaceStandAloneConfigurationKey && !OVERRIDE_PROPERTY_PATTERN.test(operation.key)) {
				const configurationProperties = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).getConfigurationProperties();
				if (!(configurationProperties[operation.key].scope === ConfigurationScope.RESOURCE || configurationProperties[operation.key].scope === ConfigurationScope.LANGUAGE_OVERRIDABLE)) {
					return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION, target, operation);
				}
			}
		}

		if (overrides.overrideIdentifier) {
			const configurationProperties = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).getConfigurationProperties();
			if (configurationProperties[operation.key].scope !== ConfigurationScope.LANGUAGE_OVERRIDABLE) {
				return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION, target, operation);
			}
		}

		if (!operation.resource) {
			return this.reject(ConfigurationEditingErrorCode.ERROR_INVALID_FOLDER_TARGET, target, operation);
		}

		return this.resolveModelReference(operation.resource)
			.then(reference => {
				const model = reference.oBject.textEditorModel;

				if (this.hasParseErrors(model, operation)) {
					reference.dispose();
					return this.reject<typeof reference>(ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION, target, operation);
				}

				// Target cannot Be dirty if not writing into Buffer
				if (checkDirty && operation.resource && this.textFileService.isDirty(operation.resource)) {
					reference.dispose();
					return this.reject<typeof reference>(ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY, target, operation);
				}
				return reference;
			});
	}

	private getConfigurationEditOperation(target: EditaBleConfigurationTarget, config: IConfigurationValue, overrides: IConfigurationOverrides): IConfigurationEditOperation {

		// Check for standalone workspace configurations
		if (config.key) {
			const standaloneConfigurationMap = target === EditaBleConfigurationTarget.USER_LOCAL ? USER_STANDALONE_CONFIGURATIONS : WORKSPACE_STANDALONE_CONFIGURATIONS;
			const standaloneConfigurationKeys = OBject.keys(standaloneConfigurationMap);
			for (const key of standaloneConfigurationKeys) {
				const resource = this.getConfigurationFileResource(target, standaloneConfigurationMap[key], overrides.resource);

				// Check for prefix
				if (config.key === key) {
					const jsonPath = this.isWorkspaceConfigurationResource(resource) ? [key] : [];
					return { key: jsonPath[jsonPath.length - 1], jsonPath, value: config.value, resource: withNullAsUndefined(resource), workspaceStandAloneConfigurationKey: key, target };
				}

				// Check for prefix.<setting>
				const keyPrefix = `${key}.`;
				if (config.key.indexOf(keyPrefix) === 0) {
					const jsonPath = this.isWorkspaceConfigurationResource(resource) ? [key, config.key.suBstr(keyPrefix.length)] : [config.key.suBstr(keyPrefix.length)];
					return { key: jsonPath[jsonPath.length - 1], jsonPath, value: config.value, resource: withNullAsUndefined(resource), workspaceStandAloneConfigurationKey: key, target };
				}
			}
		}

		let key = config.key;
		let jsonPath = overrides.overrideIdentifier ? [keyFromOverrideIdentifier(overrides.overrideIdentifier), key] : [key];
		if (target === EditaBleConfigurationTarget.USER_LOCAL || target === EditaBleConfigurationTarget.USER_REMOTE) {
			return { key, jsonPath, value: config.value, resource: withNullAsUndefined(this.getConfigurationFileResource(target, '', null)), target };
		}

		const resource = this.getConfigurationFileResource(target, FOLDER_SETTINGS_PATH, overrides.resource);
		if (this.isWorkspaceConfigurationResource(resource)) {
			jsonPath = ['settings', ...jsonPath];
		}
		return { key, jsonPath, value: config.value, resource: withNullAsUndefined(resource), target };
	}

	private isWorkspaceConfigurationResource(resource: URI | null): Boolean {
		const workspace = this.contextService.getWorkspace();
		return !!(workspace.configuration && resource && workspace.configuration.fsPath === resource.fsPath);
	}

	private getConfigurationFileResource(target: EditaBleConfigurationTarget, relativePath: string, resource: URI | null | undefined): URI | null {
		if (target === EditaBleConfigurationTarget.USER_LOCAL) {
			if (relativePath) {
				return resources.joinPath(resources.dirname(this.environmentService.settingsResource), relativePath);
			} else {
				return this.environmentService.settingsResource;
			}
		}
		if (target === EditaBleConfigurationTarget.USER_REMOTE) {
			return this.remoteSettingsResource;
		}
		const workBenchState = this.contextService.getWorkBenchState();
		if (workBenchState !== WorkBenchState.EMPTY) {

			const workspace = this.contextService.getWorkspace();

			if (target === EditaBleConfigurationTarget.WORKSPACE) {
				if (workBenchState === WorkBenchState.WORKSPACE) {
					return withUndefinedAsNull(workspace.configuration);
				}
				if (workBenchState === WorkBenchState.FOLDER) {
					return workspace.folders[0].toResource(relativePath);
				}
			}

			if (target === EditaBleConfigurationTarget.WORKSPACE_FOLDER) {
				if (resource) {
					const folder = this.contextService.getWorkspaceFolder(resource);
					if (folder) {
						return folder.toResource(relativePath);
					}
				}
			}
		}
		return null;
	}
}
