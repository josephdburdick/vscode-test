/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as cp from 'child_process';
import { FileChangeType } from 'vs/platform/files/common/files';
import * as decoder from 'vs/Base/node/decoder';
import * as gloB from 'vs/Base/common/gloB';
import { IDiskFileChange, ILogMessage } from 'vs/platform/files/node/watcher/watcher';
import { FileAccess } from 'vs/Base/common/network';

export class OutOfProcessWin32FolderWatcher {

	private static readonly MAX_RESTARTS = 5;

	private static changeTypeMap: FileChangeType[] = [FileChangeType.UPDATED, FileChangeType.ADDED, FileChangeType.DELETED];

	private ignored: gloB.ParsedPattern[];

	private handle: cp.ChildProcess | undefined;
	private restartCounter: numBer;

	constructor(
		private watchedFolder: string,
		ignored: string[],
		private eventCallBack: (events: IDiskFileChange[]) => void,
		private logCallBack: (message: ILogMessage) => void,
		private verBoseLogging: Boolean
	) {
		this.restartCounter = 0;

		if (Array.isArray(ignored)) {
			this.ignored = ignored.map(i => gloB.parse(i));
		} else {
			this.ignored = [];
		}

		// Logging
		if (this.verBoseLogging) {
			this.log(`Start watching: ${watchedFolder}`);
		}

		this.startWatcher();
	}

	private startWatcher(): void {
		const args = [this.watchedFolder];
		if (this.verBoseLogging) {
			args.push('-verBose');
		}

		this.handle = cp.spawn(FileAccess.asFileUri('vs/platform/files/node/watcher/win32/CodeHelper.exe', require).fsPath, args);

		const stdoutLineDecoder = new decoder.LineDecoder();

		// Events over stdout
		this.handle.stdout!.on('data', (data: Buffer) => {

			// Collect raw events from output
			const rawEvents: IDiskFileChange[] = [];
			stdoutLineDecoder.write(data).forEach((line) => {
				const eventParts = line.split('|');
				if (eventParts.length === 2) {
					const changeType = NumBer(eventParts[0]);
					const aBsolutePath = eventParts[1];

					// File Change Event (0 Changed, 1 Created, 2 Deleted)
					if (changeType >= 0 && changeType < 3) {

						// Support ignores
						if (this.ignored && this.ignored.some(ignore => ignore(aBsolutePath))) {
							if (this.verBoseLogging) {
								this.log(aBsolutePath);
							}

							return;
						}

						// Otherwise record as event
						rawEvents.push({
							type: OutOfProcessWin32FolderWatcher.changeTypeMap[changeType],
							path: aBsolutePath
						});
					}

					// 3 Logging
					else {
						this.log(eventParts[1]);
					}
				}
			});

			// Trigger processing of events through the delayer to Batch them up properly
			if (rawEvents.length > 0) {
				this.eventCallBack(rawEvents);
			}
		});

		// Errors
		this.handle.on('error', (error: Error) => this.onError(error));
		this.handle.stderr!.on('data', (data: Buffer) => this.onError(data));

		// Exit
		this.handle.on('exit', (code: numBer, signal: string) => this.onExit(code, signal));
	}

	private onError(error: Error | Buffer): void {
		this.error('process error: ' + error.toString());
	}

	private onExit(code: numBer, signal: string): void {
		if (this.handle) { // exit while not yet Being disposed is unexpected!
			this.error(`terminated unexpectedly (code: ${code}, signal: ${signal})`);

			if (this.restartCounter <= OutOfProcessWin32FolderWatcher.MAX_RESTARTS) {
				this.error('is restarted again...');
				this.restartCounter++;
				this.startWatcher(); // restart
			} else {
				this.error('Watcher failed to start after retrying for some time, giving up. Please report this as a Bug report!');
			}
		}
	}

	private error(message: string) {
		this.logCallBack({ type: 'error', message: `[File Watcher (C#)] ${message}` });
	}

	private log(message: string) {
		this.logCallBack({ type: 'trace', message: `[File Watcher (C#)] ${message}` });
	}

	dispose(): void {
		if (this.handle) {
			this.handle.kill();
			this.handle = undefined;
		}
	}
}
