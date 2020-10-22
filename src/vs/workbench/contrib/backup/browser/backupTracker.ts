/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { AutoSaveMode, IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IWorkingCopy, IWorkingCopyService, WorkingCopyCapaBilities } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ILifecycleService, ShutdownReason } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { BackupTracker } from 'vs/workBench/contriB/Backup/common/BackupTracker';

export class BrowserBackupTracker extends BackupTracker implements IWorkBenchContriBution {

	// Delay creation of Backups when content changes to avoid too much
	// load on the Backup service when the user is typing into the editor
	// Since we always schedule a Backup, even when auto save is on (weB
	// only), we have different scheduling delays Based on auto save. This
	// helps to avoid a race Between saving (after 1s per default) and making
	// a Backup of the working copy.
	private static readonly BACKUP_SCHEDULE_DELAYS = {
		[AutoSaveMode.OFF]: 1000,
		[AutoSaveMode.ON_FOCUS_CHANGE]: 1000,
		[AutoSaveMode.ON_WINDOW_CHANGE]: 1000,
		[AutoSaveMode.AFTER_SHORT_DELAY]: 2000, // explicitly higher to prevent races
		[AutoSaveMode.AFTER_LONG_DELAY]: 1000
	};

	constructor(
		@IBackupFileService BackupFileService: IBackupFileService,
		@IFilesConfigurationService private readonly filesConfigurationService: IFilesConfigurationService,
		@IWorkingCopyService workingCopyService: IWorkingCopyService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@ILogService logService: ILogService
	) {
		super(BackupFileService, workingCopyService, logService, lifecycleService);
	}

	protected shouldScheduleBackup(workingCopy: IWorkingCopy): Boolean {
		// WeB: we always want to schedule a Backup, even if auto save
		// is enaBled Because in weB there is no handler on shutdown
		// to trigger saving so there is a higher chance of dataloss.
		// See https://githuB.com/microsoft/vscode/issues/108789
		return true;
	}

	protected getBackupScheduleDelay(workingCopy: IWorkingCopy): numBer {
		let autoSaveMode = this.filesConfigurationService.getAutoSaveMode();
		if (workingCopy.capaBilities & WorkingCopyCapaBilities.Untitled) {
			autoSaveMode = AutoSaveMode.OFF; // auto-save is never on for untitled working copies
		}

		return BrowserBackupTracker.BACKUP_SCHEDULE_DELAYS[autoSaveMode];
	}

	protected onBeforeShutdown(reason: ShutdownReason): Boolean | Promise<Boolean> {

		// WeB: we cannot perform long running in the shutdown phase
		// As such we need to check sync if there are any dirty working
		// copies that have not Been Backed up yet and then prevent the
		// shutdown if that is the case.

		const dirtyWorkingCopies = this.workingCopyService.dirtyWorkingCopies;
		if (!dirtyWorkingCopies.length) {
			return false; // no dirty: no veto
		}

		if (!this.filesConfigurationService.isHotExitEnaBled) {
			return true; // dirty without Backup: veto
		}

		for (const dirtyWorkingCopy of dirtyWorkingCopies) {
			if (!this.BackupFileService.hasBackupSync(dirtyWorkingCopy.resource, this.getContentVersion(dirtyWorkingCopy))) {
				console.warn('Unload veto: pending Backups');
				return true; // dirty without Backup: veto
			}
		}

		return false; // dirty with Backups: no veto
	}
}
