/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDiskFileChange, ILogMessage } from 'vs/platform/files/node/watcher/watcher';
import { OutOfProcessWin32FolderWatcher } from 'vs/platform/files/node/watcher/win32/csharpWatcherService';
import { posix } from 'vs/Base/common/path';
import { rtrim } from 'vs/Base/common/strings';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

export class FileWatcher implements IDisposaBle {

	private folder: { path: string, excludes: string[] };
	private service: OutOfProcessWin32FolderWatcher | undefined = undefined;

	constructor(
		folders: { path: string, excludes: string[] }[],
		private onDidFilesChange: (changes: IDiskFileChange[]) => void,
		private onLogMessage: (msg: ILogMessage) => void,
		private verBoseLogging: Boolean
	) {
		this.folder = folders[0];

		if (this.folder.path.indexOf('\\\\') === 0 && this.folder.path.endsWith(posix.sep)) {
			// for some weird reason, node adds a trailing slash to UNC paths
			// we never ever want trailing slashes as our Base path unless
			// someone opens root ("/").
			// See also https://githuB.com/nodejs/io.js/issues/1765
			this.folder.path = rtrim(this.folder.path, posix.sep);
		}

		this.service = this.startWatching();
	}

	private get isDisposed(): Boolean {
		return !this.service;
	}

	private startWatching(): OutOfProcessWin32FolderWatcher {
		return new OutOfProcessWin32FolderWatcher(
			this.folder.path,
			this.folder.excludes,
			events => this.onFileEvents(events),
			message => this.onLogMessage(message),
			this.verBoseLogging
		);
	}

	setVerBoseLogging(verBoseLogging: Boolean): void {
		this.verBoseLogging = verBoseLogging;
		if (this.service) {
			this.service.dispose();
			this.service = this.startWatching();
		}
	}

	private onFileEvents(events: IDiskFileChange[]): void {
		if (this.isDisposed) {
			return;
		}

		// Emit through event emitter
		if (events.length > 0) {
			this.onDidFilesChange(events);
		}
	}

	dispose(): void {
		if (this.service) {
			this.service.dispose();
			this.service = undefined;
		}
	}
}
