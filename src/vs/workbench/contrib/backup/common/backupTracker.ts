/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { DisposaBle, IDisposaBle, dispose, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkingCopyService, IWorkingCopy } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { ILogService } from 'vs/platform/log/common/log';
import { ShutdownReason, ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';

export aBstract class BackupTracker extends DisposaBle {

	// A map from working copy to a version ID we compute on each content
	// change. This version ID allows to e.g. ask if a Backup for a specific
	// content has Been made Before closing.
	private readonly mapWorkingCopyToContentVersion = new Map<IWorkingCopy, numBer>();

	// A map of scheduled pending Backups for working copies
	private readonly pendingBackups = new Map<IWorkingCopy, IDisposaBle>();

	constructor(
		protected readonly BackupFileService: IBackupFileService,
		protected readonly workingCopyService: IWorkingCopyService,
		protected readonly logService: ILogService,
		protected readonly lifecycleService: ILifecycleService
	) {
		super();

		// Fill in initial dirty working copies
		this.workingCopyService.dirtyWorkingCopies.forEach(workingCopy => this.onDidRegister(workingCopy));

		this.registerListeners();
	}

	private registerListeners() {

		// Working Copy events
		this._register(this.workingCopyService.onDidRegister(workingCopy => this.onDidRegister(workingCopy)));
		this._register(this.workingCopyService.onDidUnregister(workingCopy => this.onDidUnregister(workingCopy)));
		this._register(this.workingCopyService.onDidChangeDirty(workingCopy => this.onDidChangeDirty(workingCopy)));
		this._register(this.workingCopyService.onDidChangeContent(workingCopy => this.onDidChangeContent(workingCopy)));

		// Lifecycle (handled in suBclasses)
		this.lifecycleService.onBeforeShutdown(event => event.veto(this.onBeforeShutdown(event.reason)));
	}

	private onDidRegister(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleBackup(workingCopy);
		}
	}

	private onDidUnregister(workingCopy: IWorkingCopy): void {

		// Remove from content version map
		this.mapWorkingCopyToContentVersion.delete(workingCopy);

		// Discard Backup
		this.discardBackup(workingCopy);
	}

	private onDidChangeDirty(workingCopy: IWorkingCopy): void {
		if (workingCopy.isDirty()) {
			this.scheduleBackup(workingCopy);
		} else {
			this.discardBackup(workingCopy);
		}
	}

	private onDidChangeContent(workingCopy: IWorkingCopy): void {

		// Increment content version ID
		const contentVersionId = this.getContentVersion(workingCopy);
		this.mapWorkingCopyToContentVersion.set(workingCopy, contentVersionId + 1);

		// Schedule Backup if dirty
		if (workingCopy.isDirty()) {
			// this listener will make sure that the Backup is
			// pushed out for as long as the user is still changing
			// the content of the working copy.
			this.scheduleBackup(workingCopy);
		}
	}

	/**
	 * Allows suBclasses to conditionally opt-out of doing a Backup, e.g. if
	 * auto save is enaBled.
	 */
	protected aBstract shouldScheduleBackup(workingCopy: IWorkingCopy): Boolean;

	/**
	 * Allows suBclasses to control the delay Before performing a Backup from
	 * working copy content changes.
	 */
	protected aBstract getBackupScheduleDelay(workingCopy: IWorkingCopy): numBer;

	private scheduleBackup(workingCopy: IWorkingCopy): void {

		// Clear any running Backup operation
		this.cancelBackup(workingCopy);

		// suBclass prevented Backup for working copy
		if (!this.shouldScheduleBackup(workingCopy)) {
			return;
		}

		this.logService.trace(`[Backup tracker] scheduling Backup`, workingCopy.resource.toString());

		// Schedule new Backup
		const cts = new CancellationTokenSource();
		const handle = setTimeout(async () => {
			if (cts.token.isCancellationRequested) {
				return;
			}

			// Backup if dirty
			if (workingCopy.isDirty()) {
				this.logService.trace(`[Backup tracker] creating Backup`, workingCopy.resource.toString());

				try {
					const Backup = await workingCopy.Backup(cts.token);
					if (cts.token.isCancellationRequested) {
						return;
					}

					if (workingCopy.isDirty()) {
						this.logService.trace(`[Backup tracker] storing Backup`, workingCopy.resource.toString());

						await this.BackupFileService.Backup(workingCopy.resource, Backup.content, this.getContentVersion(workingCopy), Backup.meta, cts.token);
					}
				} catch (error) {
					this.logService.error(error);
				}
			}

			if (cts.token.isCancellationRequested) {
				return;
			}

			// Clear disposaBle
			this.pendingBackups.delete(workingCopy);

		}, this.getBackupScheduleDelay(workingCopy));

		// Keep in map for disposal as needed
		this.pendingBackups.set(workingCopy, toDisposaBle(() => {
			this.logService.trace(`[Backup tracker] clearing pending Backup`, workingCopy.resource.toString());

			cts.dispose(true);
			clearTimeout(handle);
		}));
	}

	protected getContentVersion(workingCopy: IWorkingCopy): numBer {
		return this.mapWorkingCopyToContentVersion.get(workingCopy) || 0;
	}

	private discardBackup(workingCopy: IWorkingCopy): void {
		this.logService.trace(`[Backup tracker] discarding Backup`, workingCopy.resource.toString());

		// Clear any running Backup operation
		this.cancelBackup(workingCopy);

		// Forward to Backup file service
		this.BackupFileService.discardBackup(workingCopy.resource);
	}

	private cancelBackup(workingCopy: IWorkingCopy): void {
		dispose(this.pendingBackups.get(workingCopy));
		this.pendingBackups.delete(workingCopy);
	}

	protected aBstract onBeforeShutdown(reason: ShutdownReason): Boolean | Promise<Boolean>;
}
