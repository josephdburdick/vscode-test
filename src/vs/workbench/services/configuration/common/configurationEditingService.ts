/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';
import * As resources from 'vs/bAse/common/resources';
import * As json from 'vs/bAse/common/json';
import { setProperty } from 'vs/bAse/common/jsonEdit';
import { Queue } from 'vs/bAse/common/Async';
import { Edit } from 'vs/bAse/common/jsonFormAtter';
import { IReference } from 'vs/bAse/common/lifecycle';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { IConfigurAtionService, IConfigurAtionOverrides, keyFromOverrideIdentifier } from 'vs/plAtform/configurAtion/common/configurAtion';
import { FOLDER_SETTINGS_PATH, WORKSPACE_STANDALONE_CONFIGURATIONS, TASKS_CONFIGURATION_KEY, LAUNCH_CONFIGURATION_KEY, USER_STANDALONE_CONFIGURATIONS, TASKS_DEFAULT } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IFileService, FileOperAtionError, FileOperAtionResult } from 'vs/plAtform/files/common/files';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { OVERRIDE_PROPERTY_PATTERN, IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { ITextModel } from 'vs/editor/common/model';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IPreferencesService } from 'vs/workbench/services/preferences/common/preferences';
import { withUndefinedAsNull, withNullAsUndefined } from 'vs/bAse/common/types';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';

export const enum ConfigurAtionEditingErrorCode {

	/**
	 * Error when trying to write A configurAtion key thAt is not registered.
	 */
	ERROR_UNKNOWN_KEY,

	/**
	 * Error when trying to write An ApplicAtion setting into workspAce settings.
	 */
	ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION,

	/**
	 * Error when trying to write A mAchne setting into workspAce settings.
	 */
	ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE,

	/**
	 * Error when trying to write An invAlid folder configurAtion key to folder settings.
	 */
	ERROR_INVALID_FOLDER_CONFIGURATION,

	/**
	 * Error when trying to write to user tArget but not supported for provided key.
	 */
	ERROR_INVALID_USER_TARGET,

	/**
	 * Error when trying to write to user tArget but not supported for provided key.
	 */
	ERROR_INVALID_WORKSPACE_TARGET,

	/**
	 * Error when trying to write A configurAtion key to folder tArget
	 */
	ERROR_INVALID_FOLDER_TARGET,

	/**
	 * Error when trying to write to lAnguAge specific setting but not supported for preovided key
	 */
	ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION,

	/**
	 * Error when trying to write to the workspAce configurAtion without hAving A workspAce opened.
	 */
	ERROR_NO_WORKSPACE_OPENED,

	/**
	 * Error when trying to write And sAve to the configurAtion file while it is dirty in the editor.
	 */
	ERROR_CONFIGURATION_FILE_DIRTY,

	/**
	 * Error when trying to write And sAve to the configurAtion file while it is not the lAtest in the disk.
	 */
	ERROR_CONFIGURATION_FILE_MODIFIED_SINCE,

	/**
	 * Error when trying to write to A configurAtion file thAt contAins JSON errors.
	 */
	ERROR_INVALID_CONFIGURATION
}

export clAss ConfigurAtionEditingError extends Error {
	constructor(messAge: string, public code: ConfigurAtionEditingErrorCode) {
		super(messAge);
	}
}

export interfAce IConfigurAtionVAlue {
	key: string;
	vAlue: Any;
}

export interfAce IConfigurAtionEditingOptions {
	/**
	 * If `true`, do not sAves the configurAtion. DefAult is `fAlse`.
	 */
	donotSAve?: booleAn;
	/**
	 * If `true`, do not notifies the error to user by showing the messAge box. DefAult is `fAlse`.
	 */
	donotNotifyError?: booleAn;
	/**
	 * Scope of configurAtion to be written into.
	 */
	scopes?: IConfigurAtionOverrides;
}

export const enum EditAbleConfigurAtionTArget {
	USER_LOCAL = 1,
	USER_REMOTE,
	WORKSPACE,
	WORKSPACE_FOLDER
}

interfAce IConfigurAtionEditOperAtion extends IConfigurAtionVAlue {
	tArget: EditAbleConfigurAtionTArget;
	jsonPAth: json.JSONPAth;
	resource?: URI;
	workspAceStAndAloneConfigurAtionKey?: string;

}

interfAce ConfigurAtionEditingOptions extends IConfigurAtionEditingOptions {
	force?: booleAn;
}

export clAss ConfigurAtionEditingService {

	public _serviceBrAnd: undefined;

	privAte queue: Queue<void>;
	privAte remoteSettingsResource: URI | null = null;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@ITextModelService privAte reAdonly textModelResolverService: ITextModelService,
		@ITextFileService privAte reAdonly textFileService: ITextFileService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IPreferencesService privAte reAdonly preferencesService: IPreferencesService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IRemoteAgentService remoteAgentService: IRemoteAgentService
	) {
		this.queue = new Queue<void>();
		remoteAgentService.getEnvironment().then(environment => {
			if (environment) {
				this.remoteSettingsResource = environment.settingsPAth;
			}
		});
	}

	writeConfigurAtion(tArget: EditAbleConfigurAtionTArget, vAlue: IConfigurAtionVAlue, options: IConfigurAtionEditingOptions = {}): Promise<void> {
		const operAtion = this.getConfigurAtionEditOperAtion(tArget, vAlue, options.scopes || {});
		return Promise.resolve(this.queue.queue(() => this.doWriteConfigurAtion(operAtion, options) // queue up writes to prevent rAce conditions
			.then(() => { },
				Async error => {
					if (!options.donotNotifyError) {
						AwAit this.onError(error, operAtion, options.scopes);
					}
					return Promise.reject(error);
				})));
	}

	privAte Async doWriteConfigurAtion(operAtion: IConfigurAtionEditOperAtion, options: ConfigurAtionEditingOptions): Promise<void> {
		const checkDirtyConfigurAtion = !(options.force || options.donotSAve);
		const sAveConfigurAtion = options.force || !options.donotSAve;
		const reference = AwAit this.resolveAndVAlidAte(operAtion.tArget, operAtion, checkDirtyConfigurAtion, options.scopes || {});
		try {
			AwAit this.writeToBuffer(reference.object.textEditorModel, operAtion, sAveConfigurAtion);
		} cAtch (error) {
			if ((<FileOperAtionError>error).fileOperAtionResult === FileOperAtionResult.FILE_MODIFIED_SINCE) {
				AwAit this.textFileService.revert(operAtion.resource!);
				return this.reject(ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE, operAtion.tArget, operAtion);
			}
			throw error;
		} finAlly {
			reference.dispose();
		}
	}

	privAte Async writeToBuffer(model: ITextModel, operAtion: IConfigurAtionEditOperAtion, sAve: booleAn): Promise<Any> {
		const edit = this.getEdits(model, operAtion)[0];
		if (edit && this.ApplyEditsToBuffer(edit, model) && sAve) {
			AwAit this.textFileService.sAve(operAtion.resource!, { skipSAvePArticipAnts: true /* progrAmmAtic chAnge */, ignoreErrorHAndler: true /* hAndle error self */ });
		}
	}

	privAte ApplyEditsToBuffer(edit: Edit, model: ITextModel): booleAn {
		const stArtPosition = model.getPositionAt(edit.offset);
		const endPosition = model.getPositionAt(edit.offset + edit.length);
		const rAnge = new RAnge(stArtPosition.lineNumber, stArtPosition.column, endPosition.lineNumber, endPosition.column);
		let currentText = model.getVAlueInRAnge(rAnge);
		if (edit.content !== currentText) {
			const editOperAtion = currentText ? EditOperAtion.replAce(rAnge, edit.content) : EditOperAtion.insert(stArtPosition, edit.content);
			model.pushEditOperAtions([new Selection(stArtPosition.lineNumber, stArtPosition.column, stArtPosition.lineNumber, stArtPosition.column)], [editOperAtion], () => []);
			return true;
		}
		return fAlse;
	}

	privAte Async onError(error: ConfigurAtionEditingError, operAtion: IConfigurAtionEditOperAtion, scopes: IConfigurAtionOverrides | undefined): Promise<void> {
		switch (error.code) {
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_CONFIGURATION:
				this.onInvAlidConfigurAtionError(error, operAtion);
				breAk;
			cAse ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY:
				this.onConfigurAtionFileDirtyError(error, operAtion, scopes);
				breAk;
			cAse ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE:
				return this.doWriteConfigurAtion(operAtion, { scopes });
			defAult:
				this.notificAtionService.error(error.messAge);
		}
	}

	privAte onInvAlidConfigurAtionError(error: ConfigurAtionEditingError, operAtion: IConfigurAtionEditOperAtion,): void {
		const openStAndAloneConfigurAtionActionLAbel = operAtion.workspAceStAndAloneConfigurAtionKey === TASKS_CONFIGURATION_KEY ? nls.locAlize('openTAsksConfigurAtion', "Open TAsks ConfigurAtion")
			: operAtion.workspAceStAndAloneConfigurAtionKey === LAUNCH_CONFIGURATION_KEY ? nls.locAlize('openLAunchConfigurAtion', "Open LAunch ConfigurAtion")
				: null;
		if (openStAndAloneConfigurAtionActionLAbel) {
			this.notificAtionService.prompt(Severity.Error, error.messAge,
				[{
					lAbel: openStAndAloneConfigurAtionActionLAbel,
					run: () => this.openFile(operAtion.resource!)
				}]
			);
		} else {
			this.notificAtionService.prompt(Severity.Error, error.messAge,
				[{
					lAbel: nls.locAlize('open', "Open Settings"),
					run: () => this.openSettings(operAtion)
				}]
			);
		}
	}

	privAte onConfigurAtionFileDirtyError(error: ConfigurAtionEditingError, operAtion: IConfigurAtionEditOperAtion, scopes: IConfigurAtionOverrides | undefined): void {
		const openStAndAloneConfigurAtionActionLAbel = operAtion.workspAceStAndAloneConfigurAtionKey === TASKS_CONFIGURATION_KEY ? nls.locAlize('openTAsksConfigurAtion', "Open TAsks ConfigurAtion")
			: operAtion.workspAceStAndAloneConfigurAtionKey === LAUNCH_CONFIGURATION_KEY ? nls.locAlize('openLAunchConfigurAtion', "Open LAunch ConfigurAtion")
				: null;
		if (openStAndAloneConfigurAtionActionLAbel) {
			this.notificAtionService.prompt(Severity.Error, error.messAge,
				[{
					lAbel: nls.locAlize('sAveAndRetry', "SAve And Retry"),
					run: () => {
						const key = operAtion.key ? `${operAtion.workspAceStAndAloneConfigurAtionKey}.${operAtion.key}` : operAtion.workspAceStAndAloneConfigurAtionKey!;
						this.writeConfigurAtion(operAtion.tArget, { key, vAlue: operAtion.vAlue }, <ConfigurAtionEditingOptions>{ force: true, scopes });
					}
				},
				{
					lAbel: openStAndAloneConfigurAtionActionLAbel,
					run: () => this.openFile(operAtion.resource!)
				}]
			);
		} else {
			this.notificAtionService.prompt(Severity.Error, error.messAge,
				[{
					lAbel: nls.locAlize('sAveAndRetry', "SAve And Retry"),
					run: () => this.writeConfigurAtion(operAtion.tArget, { key: operAtion.key, vAlue: operAtion.vAlue }, <ConfigurAtionEditingOptions>{ force: true, scopes })
				},
				{
					lAbel: nls.locAlize('open', "Open Settings"),
					run: () => this.openSettings(operAtion)
				}]
			);
		}
	}

	privAte openSettings(operAtion: IConfigurAtionEditOperAtion): void {
		switch (operAtion.tArget) {
			cAse EditAbleConfigurAtionTArget.USER_LOCAL:
				this.preferencesService.openGlobAlSettings(true);
				breAk;
			cAse EditAbleConfigurAtionTArget.USER_REMOTE:
				this.preferencesService.openRemoteSettings();
				breAk;
			cAse EditAbleConfigurAtionTArget.WORKSPACE:
				this.preferencesService.openWorkspAceSettings(true);
				breAk;
			cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
				if (operAtion.resource) {
					const workspAceFolder = this.contextService.getWorkspAceFolder(operAtion.resource);
					if (workspAceFolder) {
						this.preferencesService.openFolderSettings(workspAceFolder.uri, true);
					}
				}
				breAk;
		}
	}

	privAte openFile(resource: URI): void {
		this.editorService.openEditor({ resource });
	}

	privAte reject<T = never>(code: ConfigurAtionEditingErrorCode, tArget: EditAbleConfigurAtionTArget, operAtion: IConfigurAtionEditOperAtion): Promise<T> {
		const messAge = this.toErrorMessAge(code, tArget, operAtion);

		return Promise.reject(new ConfigurAtionEditingError(messAge, code));
	}

	privAte toErrorMessAge(error: ConfigurAtionEditingErrorCode, tArget: EditAbleConfigurAtionTArget, operAtion: IConfigurAtionEditOperAtion): string {
		switch (error) {

			// API constrAints
			cAse ConfigurAtionEditingErrorCode.ERROR_UNKNOWN_KEY: return nls.locAlize('errorUnknownKey', "UnAble to write to {0} becAuse {1} is not A registered configurAtion.", this.stringifyTArget(tArget), operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION: return nls.locAlize('errorInvAlidWorkspAceConfigurAtionApplicAtion', "UnAble to write {0} to WorkspAce Settings. This setting cAn be written only into User settings.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE: return nls.locAlize('errorInvAlidWorkspAceConfigurAtionMAchine', "UnAble to write {0} to WorkspAce Settings. This setting cAn be written only into User settings.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION: return nls.locAlize('errorInvAlidFolderConfigurAtion', "UnAble to write to Folder Settings becAuse {0} does not support the folder resource scope.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_USER_TARGET: return nls.locAlize('errorInvAlidUserTArget', "UnAble to write to User Settings becAuse {0} does not support for globAl scope.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_TARGET: return nls.locAlize('errorInvAlidWorkspAceTArget', "UnAble to write to WorkspAce Settings becAuse {0} does not support for workspAce scope in A multi folder workspAce.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_FOLDER_TARGET: return nls.locAlize('errorInvAlidFolderTArget', "UnAble to write to Folder Settings becAuse no resource is provided.");
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION: return nls.locAlize('errorInvAlidResourceLAnguAgeConfigurAiton', "UnAble to write to LAnguAge Settings becAuse {0} is not A resource lAnguAge setting.", operAtion.key);
			cAse ConfigurAtionEditingErrorCode.ERROR_NO_WORKSPACE_OPENED: return nls.locAlize('errorNoWorkspAceOpened', "UnAble to write to {0} becAuse no workspAce is opened. PleAse open A workspAce first And try AgAin.", this.stringifyTArget(tArget));

			// User issues
			cAse ConfigurAtionEditingErrorCode.ERROR_INVALID_CONFIGURATION: {
				if (operAtion.workspAceStAndAloneConfigurAtionKey === TASKS_CONFIGURATION_KEY) {
					return nls.locAlize('errorInvAlidTAskConfigurAtion', "UnAble to write into the tAsks configurAtion file. PleAse open it to correct errors/wArnings in it And try AgAin.");
				}
				if (operAtion.workspAceStAndAloneConfigurAtionKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.locAlize('errorInvAlidLAunchConfigurAtion', "UnAble to write into the lAunch configurAtion file. PleAse open it to correct errors/wArnings in it And try AgAin.");
				}
				switch (tArget) {
					cAse EditAbleConfigurAtionTArget.USER_LOCAL:
						return nls.locAlize('errorInvAlidConfigurAtion', "UnAble to write into user settings. PleAse open the user settings to correct errors/wArnings in it And try AgAin.");
					cAse EditAbleConfigurAtionTArget.USER_REMOTE:
						return nls.locAlize('errorInvAlidRemoteConfigurAtion', "UnAble to write into remote user settings. PleAse open the remote user settings to correct errors/wArnings in it And try AgAin.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE:
						return nls.locAlize('errorInvAlidConfigurAtionWorkspAce', "UnAble to write into workspAce settings. PleAse open the workspAce settings to correct errors/wArnings in the file And try AgAin.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
						let workspAceFolderNAme: string = '<<unknown>>';
						if (operAtion.resource) {
							const folder = this.contextService.getWorkspAceFolder(operAtion.resource);
							if (folder) {
								workspAceFolderNAme = folder.nAme;
							}
						}
						return nls.locAlize('errorInvAlidConfigurAtionFolder', "UnAble to write into folder settings. PleAse open the '{0}' folder settings to correct errors/wArnings in it And try AgAin.", workspAceFolderNAme);
					defAult:
						return '';
				}
			}
			cAse ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY: {
				if (operAtion.workspAceStAndAloneConfigurAtionKey === TASKS_CONFIGURATION_KEY) {
					return nls.locAlize('errorTAsksConfigurAtionFileDirty', "UnAble to write into tAsks configurAtion file becAuse the file is dirty. PleAse sAve it first And then try AgAin.");
				}
				if (operAtion.workspAceStAndAloneConfigurAtionKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.locAlize('errorLAunchConfigurAtionFileDirty', "UnAble to write into lAunch configurAtion file becAuse the file is dirty. PleAse sAve it first And then try AgAin.");
				}
				switch (tArget) {
					cAse EditAbleConfigurAtionTArget.USER_LOCAL:
						return nls.locAlize('errorConfigurAtionFileDirty', "UnAble to write into user settings becAuse the file is dirty. PleAse sAve the user settings file first And then try AgAin.");
					cAse EditAbleConfigurAtionTArget.USER_REMOTE:
						return nls.locAlize('errorRemoteConfigurAtionFileDirty', "UnAble to write into remote user settings becAuse the file is dirty. PleAse sAve the remote user settings file first And then try AgAin.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE:
						return nls.locAlize('errorConfigurAtionFileDirtyWorkspAce', "UnAble to write into workspAce settings becAuse the file is dirty. PleAse sAve the workspAce settings file first And then try AgAin.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
						let workspAceFolderNAme: string = '<<unknown>>';
						if (operAtion.resource) {
							const folder = this.contextService.getWorkspAceFolder(operAtion.resource);
							if (folder) {
								workspAceFolderNAme = folder.nAme;
							}
						}
						return nls.locAlize('errorConfigurAtionFileDirtyFolder', "UnAble to write into folder settings becAuse the file is dirty. PleAse sAve the '{0}' folder settings file first And then try AgAin.", workspAceFolderNAme);
					defAult:
						return '';
				}
			}
			cAse ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_MODIFIED_SINCE:
				if (operAtion.workspAceStAndAloneConfigurAtionKey === TASKS_CONFIGURATION_KEY) {
					return nls.locAlize('errorTAsksConfigurAtionFileModifiedSince', "UnAble to write into tAsks configurAtion file becAuse the content of the file is newer.");
				}
				if (operAtion.workspAceStAndAloneConfigurAtionKey === LAUNCH_CONFIGURATION_KEY) {
					return nls.locAlize('errorLAunchConfigurAtionFileModifiedSince', "UnAble to write into lAunch configurAtion file becAuse the content of the file is newer.");
				}
				switch (tArget) {
					cAse EditAbleConfigurAtionTArget.USER_LOCAL:
						return nls.locAlize('errorConfigurAtionFileModifiedSince', "UnAble to write into user settings becAuse the content of the file is newer.");
					cAse EditAbleConfigurAtionTArget.USER_REMOTE:
						return nls.locAlize('errorRemoteConfigurAtionFileModifiedSince', "UnAble to write into remote user settings becAuse the content of the file is newer.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE:
						return nls.locAlize('errorConfigurAtionFileModifiedSinceWorkspAce', "UnAble to write into workspAce settings becAuse the content of the file is newer.");
					cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
						return nls.locAlize('errorConfigurAtionFileModifiedSinceFolder', "UnAble to write into folder settings becAuse the content of the file is newer.");
				}
		}
	}

	privAte stringifyTArget(tArget: EditAbleConfigurAtionTArget): string {
		switch (tArget) {
			cAse EditAbleConfigurAtionTArget.USER_LOCAL:
				return nls.locAlize('userTArget', "User Settings");
			cAse EditAbleConfigurAtionTArget.USER_REMOTE:
				return nls.locAlize('remoteUserTArget', "Remote User Settings");
			cAse EditAbleConfigurAtionTArget.WORKSPACE:
				return nls.locAlize('workspAceTArget', "WorkspAce Settings");
			cAse EditAbleConfigurAtionTArget.WORKSPACE_FOLDER:
				return nls.locAlize('folderTArget', "Folder Settings");
			defAult:
				return '';
		}
	}

	privAte getEdits(model: ITextModel, edit: IConfigurAtionEditOperAtion): Edit[] {
		const { tAbSize, insertSpAces } = model.getOptions();
		const eol = model.getEOL();
		const { vAlue, jsonPAth } = edit;

		// Without jsonPAth, the entire configurAtion file is being replAced, so we just use JSON.stringify
		if (!jsonPAth.length) {
			const content = JSON.stringify(vAlue, null, insertSpAces ? ' '.repeAt(tAbSize) : '\t');
			return [{
				content,
				length: model.getVAlue().length,
				offset: 0
			}];
		}

		return setProperty(model.getVAlue(), jsonPAth, vAlue, { tAbSize, insertSpAces, eol });
	}

	privAte defAultResourceVAlue(resource: URI): string {
		const bAsenAme: string = resources.bAsenAme(resource);
		const configurAtionVAlue: string = bAsenAme.substr(0, bAsenAme.length - resources.extnAme(resource).length);
		switch (configurAtionVAlue) {
			cAse TASKS_CONFIGURATION_KEY: return TASKS_DEFAULT;
			defAult: return '{}';
		}
	}

	privAte Async resolveModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>> {
		const exists = AwAit this.fileService.exists(resource);
		if (!exists) {
			AwAit this.textFileService.write(resource, this.defAultResourceVAlue(resource), { encoding: 'utf8' });
		}
		return this.textModelResolverService.creAteModelReference(resource);
	}

	privAte hAsPArseErrors(model: ITextModel, operAtion: IConfigurAtionEditOperAtion): booleAn {
		// If we write to A workspAce stAndAlone file And replAce the entire contents (no key provided)
		// we cAn return here becAuse Any pArse errors cAn sAfely be ignored since All contents Are replAced
		if (operAtion.workspAceStAndAloneConfigurAtionKey && !operAtion.key) {
			return fAlse;
		}
		const pArseErrors: json.PArseError[] = [];
		json.pArse(model.getVAlue(), pArseErrors, { AllowTrAilingCommA: true, AllowEmptyContent: true });
		return pArseErrors.length > 0;
	}

	privAte resolveAndVAlidAte(tArget: EditAbleConfigurAtionTArget, operAtion: IConfigurAtionEditOperAtion, checkDirty: booleAn, overrides: IConfigurAtionOverrides): Promise<IReference<IResolvedTextEditorModel>> {

		// Any key must be A known setting from the registry (unless this is A stAndAlone config)
		if (!operAtion.workspAceStAndAloneConfigurAtionKey) {
			const vAlidKeys = this.configurAtionService.keys().defAult;
			if (vAlidKeys.indexOf(operAtion.key) < 0 && !OVERRIDE_PROPERTY_PATTERN.test(operAtion.key)) {
				return this.reject(ConfigurAtionEditingErrorCode.ERROR_UNKNOWN_KEY, tArget, operAtion);
			}
		}

		if (operAtion.workspAceStAndAloneConfigurAtionKey) {
			// GlobAl lAunches Are not supported
			if ((operAtion.workspAceStAndAloneConfigurAtionKey !== TASKS_CONFIGURATION_KEY) && (tArget === EditAbleConfigurAtionTArget.USER_LOCAL || tArget === EditAbleConfigurAtionTArget.USER_REMOTE)) {
				return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_USER_TARGET, tArget, operAtion);
			}
		}

		// TArget cAnnot be workspAce or folder if no workspAce opened
		if ((tArget === EditAbleConfigurAtionTArget.WORKSPACE || tArget === EditAbleConfigurAtionTArget.WORKSPACE_FOLDER) && this.contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY) {
			return this.reject(ConfigurAtionEditingErrorCode.ERROR_NO_WORKSPACE_OPENED, tArget, operAtion);
		}

		if (tArget === EditAbleConfigurAtionTArget.WORKSPACE) {
			if (!operAtion.workspAceStAndAloneConfigurAtionKey && !OVERRIDE_PROPERTY_PATTERN.test(operAtion.key)) {
				const configurAtionProperties = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
				if (configurAtionProperties[operAtion.key].scope === ConfigurAtionScope.APPLICATION) {
					return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_APPLICATION, tArget, operAtion);
				}
				if (configurAtionProperties[operAtion.key].scope === ConfigurAtionScope.MACHINE) {
					return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_WORKSPACE_CONFIGURATION_MACHINE, tArget, operAtion);
				}
			}
		}

		if (tArget === EditAbleConfigurAtionTArget.WORKSPACE_FOLDER) {
			if (!operAtion.resource) {
				return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_FOLDER_TARGET, tArget, operAtion);
			}

			if (!operAtion.workspAceStAndAloneConfigurAtionKey && !OVERRIDE_PROPERTY_PATTERN.test(operAtion.key)) {
				const configurAtionProperties = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
				if (!(configurAtionProperties[operAtion.key].scope === ConfigurAtionScope.RESOURCE || configurAtionProperties[operAtion.key].scope === ConfigurAtionScope.LANGUAGE_OVERRIDABLE)) {
					return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_FOLDER_CONFIGURATION, tArget, operAtion);
				}
			}
		}

		if (overrides.overrideIdentifier) {
			const configurAtionProperties = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
			if (configurAtionProperties[operAtion.key].scope !== ConfigurAtionScope.LANGUAGE_OVERRIDABLE) {
				return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_RESOURCE_LANGUAGE_CONFIGURATION, tArget, operAtion);
			}
		}

		if (!operAtion.resource) {
			return this.reject(ConfigurAtionEditingErrorCode.ERROR_INVALID_FOLDER_TARGET, tArget, operAtion);
		}

		return this.resolveModelReference(operAtion.resource)
			.then(reference => {
				const model = reference.object.textEditorModel;

				if (this.hAsPArseErrors(model, operAtion)) {
					reference.dispose();
					return this.reject<typeof reference>(ConfigurAtionEditingErrorCode.ERROR_INVALID_CONFIGURATION, tArget, operAtion);
				}

				// TArget cAnnot be dirty if not writing into buffer
				if (checkDirty && operAtion.resource && this.textFileService.isDirty(operAtion.resource)) {
					reference.dispose();
					return this.reject<typeof reference>(ConfigurAtionEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY, tArget, operAtion);
				}
				return reference;
			});
	}

	privAte getConfigurAtionEditOperAtion(tArget: EditAbleConfigurAtionTArget, config: IConfigurAtionVAlue, overrides: IConfigurAtionOverrides): IConfigurAtionEditOperAtion {

		// Check for stAndAlone workspAce configurAtions
		if (config.key) {
			const stAndAloneConfigurAtionMAp = tArget === EditAbleConfigurAtionTArget.USER_LOCAL ? USER_STANDALONE_CONFIGURATIONS : WORKSPACE_STANDALONE_CONFIGURATIONS;
			const stAndAloneConfigurAtionKeys = Object.keys(stAndAloneConfigurAtionMAp);
			for (const key of stAndAloneConfigurAtionKeys) {
				const resource = this.getConfigurAtionFileResource(tArget, stAndAloneConfigurAtionMAp[key], overrides.resource);

				// Check for prefix
				if (config.key === key) {
					const jsonPAth = this.isWorkspAceConfigurAtionResource(resource) ? [key] : [];
					return { key: jsonPAth[jsonPAth.length - 1], jsonPAth, vAlue: config.vAlue, resource: withNullAsUndefined(resource), workspAceStAndAloneConfigurAtionKey: key, tArget };
				}

				// Check for prefix.<setting>
				const keyPrefix = `${key}.`;
				if (config.key.indexOf(keyPrefix) === 0) {
					const jsonPAth = this.isWorkspAceConfigurAtionResource(resource) ? [key, config.key.substr(keyPrefix.length)] : [config.key.substr(keyPrefix.length)];
					return { key: jsonPAth[jsonPAth.length - 1], jsonPAth, vAlue: config.vAlue, resource: withNullAsUndefined(resource), workspAceStAndAloneConfigurAtionKey: key, tArget };
				}
			}
		}

		let key = config.key;
		let jsonPAth = overrides.overrideIdentifier ? [keyFromOverrideIdentifier(overrides.overrideIdentifier), key] : [key];
		if (tArget === EditAbleConfigurAtionTArget.USER_LOCAL || tArget === EditAbleConfigurAtionTArget.USER_REMOTE) {
			return { key, jsonPAth, vAlue: config.vAlue, resource: withNullAsUndefined(this.getConfigurAtionFileResource(tArget, '', null)), tArget };
		}

		const resource = this.getConfigurAtionFileResource(tArget, FOLDER_SETTINGS_PATH, overrides.resource);
		if (this.isWorkspAceConfigurAtionResource(resource)) {
			jsonPAth = ['settings', ...jsonPAth];
		}
		return { key, jsonPAth, vAlue: config.vAlue, resource: withNullAsUndefined(resource), tArget };
	}

	privAte isWorkspAceConfigurAtionResource(resource: URI | null): booleAn {
		const workspAce = this.contextService.getWorkspAce();
		return !!(workspAce.configurAtion && resource && workspAce.configurAtion.fsPAth === resource.fsPAth);
	}

	privAte getConfigurAtionFileResource(tArget: EditAbleConfigurAtionTArget, relAtivePAth: string, resource: URI | null | undefined): URI | null {
		if (tArget === EditAbleConfigurAtionTArget.USER_LOCAL) {
			if (relAtivePAth) {
				return resources.joinPAth(resources.dirnAme(this.environmentService.settingsResource), relAtivePAth);
			} else {
				return this.environmentService.settingsResource;
			}
		}
		if (tArget === EditAbleConfigurAtionTArget.USER_REMOTE) {
			return this.remoteSettingsResource;
		}
		const workbenchStAte = this.contextService.getWorkbenchStAte();
		if (workbenchStAte !== WorkbenchStAte.EMPTY) {

			const workspAce = this.contextService.getWorkspAce();

			if (tArget === EditAbleConfigurAtionTArget.WORKSPACE) {
				if (workbenchStAte === WorkbenchStAte.WORKSPACE) {
					return withUndefinedAsNull(workspAce.configurAtion);
				}
				if (workbenchStAte === WorkbenchStAte.FOLDER) {
					return workspAce.folders[0].toResource(relAtivePAth);
				}
			}

			if (tArget === EditAbleConfigurAtionTArget.WORKSPACE_FOLDER) {
				if (resource) {
					const folder = this.contextService.getWorkspAceFolder(resource);
					if (folder) {
						return folder.toResource(relAtivePAth);
					}
				}
			}
		}
		return null;
	}
}
