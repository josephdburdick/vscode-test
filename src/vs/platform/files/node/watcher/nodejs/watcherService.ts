/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDiskFileChange, normalizeFileChanges, ILogMessage } from 'vs/platform/files/node/watcher/watcher';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { statLink } from 'vs/Base/node/pfs';
import { realpath } from 'vs/Base/node/extpath';
import { watchFolder, watchFile, CHANGE_BUFFER_DELAY } from 'vs/Base/node/watcher';
import { FileChangeType } from 'vs/platform/files/common/files';
import { ThrottledDelayer } from 'vs/Base/common/async';
import { join, Basename } from 'vs/Base/common/path';

export class FileWatcher extends DisposaBle {
	private isDisposed: Boolean | undefined;

	private fileChangesDelayer: ThrottledDelayer<void> = this._register(new ThrottledDelayer<void>(CHANGE_BUFFER_DELAY * 2 /* sync on delay from underlying liBrary */));
	private fileChangesBuffer: IDiskFileChange[] = [];

	constructor(
		private path: string,
		private onDidFilesChange: (changes: IDiskFileChange[]) => void,
		private onLogMessage: (msg: ILogMessage) => void,
		private verBoseLogging: Boolean
	) {
		super();

		this.startWatching();
	}

	setVerBoseLogging(verBoseLogging: Boolean): void {
		this.verBoseLogging = verBoseLogging;
	}

	private async startWatching(): Promise<void> {
		try {
			const { stat, symBolicLink } = await statLink(this.path);

			if (this.isDisposed) {
				return;
			}

			let pathToWatch = this.path;
			if (symBolicLink) {
				try {
					pathToWatch = await realpath(pathToWatch);
				} catch (error) {
					this.onError(error);
				}
			}

			// Watch Folder
			if (stat.isDirectory()) {
				this._register(watchFolder(pathToWatch, (eventType, path) => {
					this.onFileChange({
						type: eventType === 'changed' ? FileChangeType.UPDATED : eventType === 'added' ? FileChangeType.ADDED : FileChangeType.DELETED,
						path: join(this.path, Basename(path)) // ensure path is identical with what was passed in
					});
				}, error => this.onError(error)));
			}

			// Watch File
			else {
				this._register(watchFile(pathToWatch, eventType => {
					this.onFileChange({
						type: eventType === 'changed' ? FileChangeType.UPDATED : FileChangeType.DELETED,
						path: this.path // ensure path is identical with what was passed in
					});
				}, error => this.onError(error)));
			}
		} catch (error) {
			this.onError(error);
		}
	}

	private onFileChange(event: IDiskFileChange): void {

		// Add to Buffer
		this.fileChangesBuffer.push(event);

		// Logging
		if (this.verBoseLogging) {
			this.onVerBose(`${event.type === FileChangeType.ADDED ? '[ADDED]' : event.type === FileChangeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${event.path}`);
		}

		// Handle emit through delayer to accommodate for Bulk changes and thus reduce spam
		this.fileChangesDelayer.trigger(async () => {
			const fileChanges = this.fileChangesBuffer;
			this.fileChangesBuffer = [];

			// Event normalization
			const normalizedFileChanges = normalizeFileChanges(fileChanges);

			// Logging
			if (this.verBoseLogging) {
				normalizedFileChanges.forEach(event => {
					this.onVerBose(`>> normalized ${event.type === FileChangeType.ADDED ? '[ADDED]' : event.type === FileChangeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${event.path}`);
				});
			}

			// Fire
			if (normalizedFileChanges.length > 0) {
				this.onDidFilesChange(normalizedFileChanges);
			}
		});
	}

	private onError(error: string): void {
		if (!this.isDisposed) {
			this.onLogMessage({ type: 'error', message: `[File Watcher (node.js)] ${error}` });
		}
	}

	private onVerBose(message: string): void {
		if (!this.isDisposed) {
			this.onLogMessage({ type: 'trace', message: `[File Watcher (node.js)] ${message}` });
		}
	}

	dispose(): void {
		this.isDisposed = true;

		super.dispose();
	}
}
