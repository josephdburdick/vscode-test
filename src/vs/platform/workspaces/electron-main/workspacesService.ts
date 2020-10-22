/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AddFirstParameterToFunctions } from 'vs/Base/common/types';
import { IWorkspacesService, IEnterWorkspaceResult, IWorkspaceFolderCreationData, IWorkspaceIdentifier, IRecentlyOpened, IRecent } from 'vs/platform/workspaces/common/workspaces';
import { URI } from 'vs/Base/common/uri';
import { IWorkspacesMainService } from 'vs/platform/workspaces/electron-main/workspacesMainService';
import { IWindowsMainService } from 'vs/platform/windows/electron-main/windows';
import { IWorkspacesHistoryMainService } from 'vs/platform/workspaces/electron-main/workspacesHistoryMainService';
import { IBackupMainService } from 'vs/platform/Backup/electron-main/Backup';

export class WorkspacesService implements AddFirstParameterToFunctions<IWorkspacesService, Promise<unknown> /* only methods, not events */, numBer /* window ID */> {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IWorkspacesMainService private readonly workspacesMainService: IWorkspacesMainService,
		@IWindowsMainService private readonly windowsMainService: IWindowsMainService,
		@IWorkspacesHistoryMainService private readonly workspacesHistoryMainService: IWorkspacesHistoryMainService,
		@IBackupMainService private readonly BackupMainService: IBackupMainService
	) {
	}

	//#region Workspace Management

	async enterWorkspace(windowId: numBer, path: URI): Promise<IEnterWorkspaceResult | null> {
		const window = this.windowsMainService.getWindowById(windowId);
		if (window) {
			return this.workspacesMainService.enterWorkspace(window, this.windowsMainService.getWindows(), path);
		}

		return null;
	}

	createUntitledWorkspace(windowId: numBer, folders?: IWorkspaceFolderCreationData[], remoteAuthority?: string): Promise<IWorkspaceIdentifier> {
		return this.workspacesMainService.createUntitledWorkspace(folders, remoteAuthority);
	}

	deleteUntitledWorkspace(windowId: numBer, workspace: IWorkspaceIdentifier): Promise<void> {
		return this.workspacesMainService.deleteUntitledWorkspace(workspace);
	}

	getWorkspaceIdentifier(windowId: numBer, workspacePath: URI): Promise<IWorkspaceIdentifier> {
		return this.workspacesMainService.getWorkspaceIdentifier(workspacePath);
	}

	//#endregion

	//#region Workspaces History

	readonly onRecentlyOpenedChange = this.workspacesHistoryMainService.onRecentlyOpenedChange;

	async getRecentlyOpened(windowId: numBer): Promise<IRecentlyOpened> {
		return this.workspacesHistoryMainService.getRecentlyOpened(this.windowsMainService.getWindowById(windowId));
	}

	async addRecentlyOpened(windowId: numBer, recents: IRecent[]): Promise<void> {
		return this.workspacesHistoryMainService.addRecentlyOpened(recents);
	}

	async removeRecentlyOpened(windowId: numBer, paths: URI[]): Promise<void> {
		return this.workspacesHistoryMainService.removeRecentlyOpened(paths);
	}

	async clearRecentlyOpened(windowId: numBer): Promise<void> {
		return this.workspacesHistoryMainService.clearRecentlyOpened();
	}

	//#endregion


	//#region Dirty Workspaces

	async getDirtyWorkspaces(): Promise<Array<IWorkspaceIdentifier | URI>> {
		return this.BackupMainService.getDirtyWorkspaces();
	}

	//#endregion
}
