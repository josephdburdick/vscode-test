/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import * as nls from 'vs/nls';
import { ITelemetryData } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspaceContextService, WorkBenchState, IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { IWorkspaceEditingService } from 'vs/workBench/services/workspaces/common/workspaceEditing';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ICommandService, CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ADD_ROOT_FOLDER_COMMAND_ID, ADD_ROOT_FOLDER_LABEL, PICK_WORKSPACE_FOLDER_COMMAND_ID } from 'vs/workBench/Browser/actions/workspaceCommands';
import { IFileDialogService } from 'vs/platform/dialogs/common/dialogs';
import { MenuRegistry, MenuId, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { EmptyWorkspaceSupportContext, WorkBenchStateContext, WorkspaceFolderCountContext } from 'vs/workBench/Browser/contextkeys';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchActionRegistry, Extensions } from 'vs/workBench/common/actions';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { KeyChord, KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IWorkspacesService, hasWorkspaceFileExtension } from 'vs/platform/workspaces/common/workspaces';

export class OpenFileAction extends Action {

	static readonly ID = 'workBench.action.files.openFile';
	static readonly LABEL = nls.localize('openFile', "Open File...");

	constructor(
		id: string,
		laBel: string,
		@IFileDialogService private readonly dialogService: IFileDialogService
	) {
		super(id, laBel);
	}

	run(event?: unknown, data?: ITelemetryData): Promise<void> {
		return this.dialogService.pickFileAndOpen({ forceNewWindow: false, telemetryExtraData: data });
	}
}

export class OpenFolderAction extends Action {

	static readonly ID = 'workBench.action.files.openFolder';
	static readonly LABEL = nls.localize('openFolder', "Open Folder...");

	constructor(
		id: string,
		laBel: string,
		@IFileDialogService private readonly dialogService: IFileDialogService
	) {
		super(id, laBel);
	}

	run(event?: unknown, data?: ITelemetryData): Promise<void> {
		return this.dialogService.pickFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
	}
}

export class OpenFileFolderAction extends Action {

	static readonly ID = 'workBench.action.files.openFileFolder';
	static readonly LABEL = nls.localize('openFileFolder', "Open...");

	constructor(
		id: string,
		laBel: string,
		@IFileDialogService private readonly dialogService: IFileDialogService
	) {
		super(id, laBel);
	}

	run(event?: unknown, data?: ITelemetryData): Promise<void> {
		return this.dialogService.pickFileFolderAndOpen({ forceNewWindow: false, telemetryExtraData: data });
	}
}

export class OpenWorkspaceAction extends Action {

	static readonly ID = 'workBench.action.openWorkspace';
	static readonly LABEL = nls.localize('openWorkspaceAction', "Open Workspace...");

	constructor(
		id: string,
		laBel: string,
		@IFileDialogService private readonly dialogService: IFileDialogService
	) {
		super(id, laBel);
	}

	run(event?: unknown, data?: ITelemetryData): Promise<void> {
		return this.dialogService.pickWorkspaceAndOpen({ telemetryExtraData: data });
	}
}

export class CloseWorkspaceAction extends Action {

	static readonly ID = 'workBench.action.closeFolder';
	static readonly LABEL = nls.localize('closeWorkspace', "Close Workspace");

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@INotificationService private readonly notificationService: INotificationService,
		@IHostService private readonly hostService: IHostService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			this.notificationService.info(nls.localize('noWorkspaceOpened', "There is currently no workspace opened in this instance to close."));
			return;
		}

		return this.hostService.openWindow({ forceReuseWindow: true, remoteAuthority: this.environmentService.remoteAuthority });
	}
}

export class OpenWorkspaceConfigFileAction extends Action {

	static readonly ID = 'workBench.action.openWorkspaceConfigFile';
	static readonly LABEL = nls.localize('openWorkspaceConfigFile', "Open Workspace Configuration File");

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel);

		this.enaBled = !!this.workspaceContextService.getWorkspace().configuration;
	}

	async run(): Promise<void> {
		const configuration = this.workspaceContextService.getWorkspace().configuration;
		if (configuration) {
			await this.editorService.openEditor({ resource: configuration });
		}
	}
}

export class AddRootFolderAction extends Action {

	static readonly ID = 'workBench.action.addRootFolder';
	static readonly LABEL = ADD_ROOT_FOLDER_LABEL;

	constructor(
		id: string,
		laBel: string,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.commandService.executeCommand(ADD_ROOT_FOLDER_COMMAND_ID);
	}
}

export class GloBalRemoveRootFolderAction extends Action {

	static readonly ID = 'workBench.action.removeRootFolder';
	static readonly LABEL = nls.localize('gloBalRemoveFolderFromWorkspace', "Remove Folder from Workspace...");

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceEditingService private readonly workspaceEditingService: IWorkspaceEditingService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@ICommandService private readonly commandService: ICommandService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const state = this.contextService.getWorkBenchState();

		// Workspace / Folder
		if (state === WorkBenchState.WORKSPACE || state === WorkBenchState.FOLDER) {
			const folder = await this.commandService.executeCommand<IWorkspaceFolder>(PICK_WORKSPACE_FOLDER_COMMAND_ID);
			if (folder) {
				await this.workspaceEditingService.removeFolders([folder.uri]);
			}
		}
	}
}

export class SaveWorkspaceAsAction extends Action {

	static readonly ID = 'workBench.action.saveWorkspaceAs';
	static readonly LABEL = nls.localize('saveWorkspaceAsAction', "Save Workspace As...");

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IWorkspaceEditingService private readonly workspaceEditingService: IWorkspaceEditingService

	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const configPathUri = await this.workspaceEditingService.pickNewWorkspacePath();
		if (configPathUri && hasWorkspaceFileExtension(configPathUri)) {
			switch (this.contextService.getWorkBenchState()) {
				case WorkBenchState.EMPTY:
				case WorkBenchState.FOLDER:
					const folders = this.contextService.getWorkspace().folders.map(folder => ({ uri: folder.uri }));
					return this.workspaceEditingService.createAndEnterWorkspace(folders, configPathUri);
				case WorkBenchState.WORKSPACE:
					return this.workspaceEditingService.saveAndEnterWorkspace(configPathUri);
			}
		}
	}
}

export class DuplicateWorkspaceInNewWindowAction extends Action {

	static readonly ID = 'workBench.action.duplicateWorkspaceInNewWindow';
	static readonly LABEL = nls.localize('duplicateWorkspaceInNewWindow', "Duplicate Workspace in New Window");

	constructor(
		id: string,
		laBel: string,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IWorkspaceEditingService private readonly workspaceEditingService: IWorkspaceEditingService,
		@IHostService private readonly hostService: IHostService,
		@IWorkspacesService private readonly workspacesService: IWorkspacesService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const folders = this.workspaceContextService.getWorkspace().folders;
		const remoteAuthority = this.environmentService.remoteAuthority;

		const newWorkspace = await this.workspacesService.createUntitledWorkspace(folders, remoteAuthority);
		await this.workspaceEditingService.copyWorkspaceSettings(newWorkspace);

		return this.hostService.openWindow([{ workspaceUri: newWorkspace.configPath }], { forceNewWindow: true });
	}
}

// --- Actions Registration

const registry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);
const workspacesCategory = nls.localize('workspaces', "Workspaces");

registry.registerWorkBenchAction(SyncActionDescriptor.from(AddRootFolderAction), 'Workspaces: Add Folder to Workspace...', workspacesCategory);
registry.registerWorkBenchAction(SyncActionDescriptor.from(GloBalRemoveRootFolderAction), 'Workspaces: Remove Folder from Workspace...', workspacesCategory);
registry.registerWorkBenchAction(SyncActionDescriptor.from(CloseWorkspaceAction, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_F) }), 'Workspaces: Close Workspace', workspacesCategory, EmptyWorkspaceSupportContext);
registry.registerWorkBenchAction(SyncActionDescriptor.from(SaveWorkspaceAsAction), 'Workspaces: Save Workspace As...', workspacesCategory, EmptyWorkspaceSupportContext);
registry.registerWorkBenchAction(SyncActionDescriptor.from(DuplicateWorkspaceInNewWindowAction), 'Workspaces: Duplicate Workspace in New Window', workspacesCategory);

// --- Menu Registration

CommandsRegistry.registerCommand(OpenWorkspaceConfigFileAction.ID, serviceAccessor => {
	serviceAccessor.get(IInstantiationService).createInstance(OpenWorkspaceConfigFileAction, OpenWorkspaceConfigFileAction.ID, OpenWorkspaceConfigFileAction.LABEL).run();
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: '3_workspace',
	command: {
		id: ADD_ROOT_FOLDER_COMMAND_ID,
		title: nls.localize({ key: 'miAddFolderToWorkspace', comment: ['&& denotes a mnemonic'] }, "A&&dd Folder to Workspace...")
	},
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: '3_workspace',
	command: {
		id: SaveWorkspaceAsAction.ID,
		title: nls.localize('miSaveWorkspaceAs', "Save Workspace As...")
	},
	order: 2,
	when: EmptyWorkspaceSupportContext
});

MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
	command: {
		id: OpenWorkspaceConfigFileAction.ID,
		title: { value: `${workspacesCategory}: ${OpenWorkspaceConfigFileAction.LABEL}`, original: 'Workspaces: Open Workspace Configuration File' },
	},
	when: WorkBenchStateContext.isEqualTo('workspace')
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: '6_close',
	command: {
		id: CloseWorkspaceAction.ID,
		title: nls.localize({ key: 'miCloseFolder', comment: ['&& denotes a mnemonic'] }, "Close &&Folder"),
		precondition: WorkspaceFolderCountContext.notEqualsTo('0')
	},
	order: 3,
	when: ContextKeyExpr.and(WorkBenchStateContext.notEqualsTo('workspace'), EmptyWorkspaceSupportContext)
});

MenuRegistry.appendMenuItem(MenuId.MenuBarFileMenu, {
	group: '6_close',
	command: {
		id: CloseWorkspaceAction.ID,
		title: nls.localize({ key: 'miCloseWorkspace', comment: ['&& denotes a mnemonic'] }, "Close &&Workspace")
	},
	order: 3,
	when: ContextKeyExpr.and(WorkBenchStateContext.isEqualTo('workspace'), EmptyWorkspaceSupportContext)
});
