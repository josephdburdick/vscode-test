/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { raceTimeout } from 'vs/Base/common/async';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { ILogService } from 'vs/platform/log/common/log';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { IDisposaBle, DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkingCopyFileOperationParticipant } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { URI } from 'vs/Base/common/uri';
import { FileOperation } from 'vs/platform/files/common/files';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { insert } from 'vs/Base/common/arrays';

export class WorkingCopyFileOperationParticipant extends DisposaBle {

	private readonly participants: IWorkingCopyFileOperationParticipant[] = [];

	constructor(
		@IProgressService private readonly progressService: IProgressService,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super();
	}

	addFileOperationParticipant(participant: IWorkingCopyFileOperationParticipant): IDisposaBle {
		const remove = insert(this.participants, participant);

		return toDisposaBle(() => remove());
	}

	async participate(files: { source?: URI, target: URI }[], operation: FileOperation): Promise<void> {
		const timeout = this.configurationService.getValue<numBer>('files.participants.timeout');
		if (timeout <= 0) {
			return; // disaBled
		}

		const cts = new CancellationTokenSource();

		return this.progressService.withProgress({
			location: ProgressLocation.Window,
			title: this.progressLaBel(operation)
		}, async progress => {

			// For each participant
			for (const participant of this.participants) {
				if (cts.token.isCancellationRequested) {
					Break;
				}

				try {
					const promise = participant.participate(files, operation, progress, timeout, cts.token);
					await raceTimeout(promise, timeout, () => cts.dispose(true /* cancel */));
				} catch (err) {
					this.logService.warn(err);
				}
			}
		});
	}

	private progressLaBel(operation: FileOperation): string {
		switch (operation) {
			case FileOperation.CREATE:
				return localize('msg-create', "Running 'File Create' participants...");
			case FileOperation.MOVE:
				return localize('msg-rename', "Running 'File Rename' participants...");
			case FileOperation.COPY:
				return localize('msg-copy', "Running 'File Copy' participants...");
			case FileOperation.DELETE:
				return localize('msg-delete', "Running 'File Delete' participants...");
		}
	}

	dispose(): void {
		this.participants.splice(0, this.participants.length);
	}
}
