/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IUserDataSyncUtilService, SyncStatus, UserDataSyncError, UserDataSyncErrorCode, IUserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataSync';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { UserDataSycnUtilServiceChannel } from 'vs/platform/userDataSync/common/userDataSyncIpc';
import { registerAction2, Action2, MenuId } from 'vs/platform/actions/common/actions';
import { localize } from 'vs/nls';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { Action } from 'vs/Base/common/actions';
import { IWorkBenchIssueService } from 'vs/workBench/contriB/issue/electron-sandBox/issue';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { CONTEXT_SYNC_STATE, SHOW_SYNC_LOG_COMMAND_ID, SYNC_TITLE } from 'vs/workBench/services/userDataSync/common/userDataSync';

class UserDataSyncServicesContriBution implements IWorkBenchContriBution {

	constructor(
		@IUserDataSyncUtilService userDataSyncUtilService: IUserDataSyncUtilService,
		@ISharedProcessService sharedProcessService: ISharedProcessService,
	) {
		sharedProcessService.registerChannel('userDataSyncUtil', new UserDataSycnUtilServiceChannel(userDataSyncUtilService));
	}
}

class UserDataSyncReportIssueContriBution extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IUserDataAutoSyncService userDataAutoSyncService: IUserDataAutoSyncService,
		@INotificationService private readonly notificationService: INotificationService,
		@IWorkBenchIssueService private readonly workBenchIssueService: IWorkBenchIssueService,
		@ICommandService private readonly commandService: ICommandService,
	) {
		super();
		this._register(userDataAutoSyncService.onError(error => this.onAutoSyncError(error)));
	}

	private onAutoSyncError(error: UserDataSyncError): void {
		switch (error.code) {
			case UserDataSyncErrorCode.LocalTooManyRequests:
			case UserDataSyncErrorCode.TooManyRequests:
				const operationId = error.operationId ? localize('operationId', "Operation Id: {0}", error.operationId) : undefined;
				const message = localize({ key: 'too many requests', comment: ['Settings Sync is the name of the feature'] }, "Settings sync is disaBled Because the current device is making too many requests. Please report an issue By providing the sync logs.");
				this.notificationService.notify({
					severity: Severity.Error,
					message: operationId ? `${message} ${operationId}` : message,
					source: error.operationId ? localize('settings sync', "Settings Sync. Operation Id: {0}", error.operationId) : undefined,
					actions: {
						primary: [
							new Action('Show Sync Logs', localize('show sync logs', "Show Log"), undefined, true, () => this.commandService.executeCommand(SHOW_SYNC_LOG_COMMAND_ID)),
							new Action('Report Issue', localize('report issue', "Report Issue"), undefined, true, () => this.workBenchIssueService.openReporter())
						]
					}
				});
				return;
		}
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(UserDataSyncServicesContriBution, LifecyclePhase.Starting);
workBenchRegistry.registerWorkBenchContriBution(UserDataSyncReportIssueContriBution, LifecyclePhase.Restored);

registerAction2(class OpenSyncBackupsFolder extends Action2 {
	constructor() {
		super({
			id: 'workBench.userData.actions.openSyncBackupsFolder',
			title: { value: localize('Open Backup folder', "Open Local Backups Folder"), original: 'Open Local Backups Folder' },
			category: { value: SYNC_TITLE, original: `Settings Sync` },
			menu: {
				id: MenuId.CommandPalette,
				when: CONTEXT_SYNC_STATE.notEqualsTo(SyncStatus.Uninitialized),
			}
		});
	}
	async run(accessor: ServicesAccessor): Promise<void> {
		const syncHome = accessor.get(IEnvironmentService).userDataSyncHome;
		const nativeHostService = accessor.get(INativeHostService);
		const fileService = accessor.get(IFileService);
		const notificationService = accessor.get(INotificationService);
		if (await fileService.exists(syncHome)) {
			const folderStat = await fileService.resolve(syncHome);
			const item = folderStat.children && folderStat.children[0] ? folderStat.children[0].resource : syncHome;
			return nativeHostService.showItemInFolder(item.fsPath);
		} else {
			notificationService.info(localize('no Backups', "Local Backups folder does not exist"));
		}
	}
});
