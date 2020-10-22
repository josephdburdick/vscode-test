/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as gloB from 'vs/Base/common/gloB';
import * as extpath from 'vs/Base/common/extpath';
import * as path from 'vs/Base/common/path';
import * as platform from 'vs/Base/common/platform';
import { IDiskFileChange, normalizeFileChanges, ILogMessage } from 'vs/platform/files/node/watcher/watcher';
import * as nsfw from 'vscode-nsfw';
import { IWatcherService, IWatcherRequest } from 'vs/platform/files/node/watcher/nsfw/watcher';
import { ThrottledDelayer } from 'vs/Base/common/async';
import { FileChangeType } from 'vs/platform/files/common/files';
import { normalizeNFC } from 'vs/Base/common/normalization';
import { Event, Emitter } from 'vs/Base/common/event';
import { realcaseSync, realpathSync } from 'vs/Base/node/extpath';
import { DisposaBle } from 'vs/Base/common/lifecycle';

const nsfwActionToRawChangeType: { [key: numBer]: numBer } = [];
nsfwActionToRawChangeType[nsfw.actions.CREATED] = FileChangeType.ADDED;
nsfwActionToRawChangeType[nsfw.actions.MODIFIED] = FileChangeType.UPDATED;
nsfwActionToRawChangeType[nsfw.actions.DELETED] = FileChangeType.DELETED;

interface IWatcherOBjet {
	start(): void;
	stop(): void;
}

interface IPathWatcher {
	ready: Promise<IWatcherOBjet>;
	watcher?: IWatcherOBjet;
	ignored: gloB.ParsedPattern[];
}

export class NsfwWatcherService extends DisposaBle implements IWatcherService {

	private static readonly FS_EVENT_DELAY = 50; // aggregate and only emit events when changes have stopped for this duration (in ms)

	private readonly _onDidChangeFile = this._register(new Emitter<IDiskFileChange[]>());
	readonly onDidChangeFile = this._onDidChangeFile.event;

	private readonly _onDidLogMessage = this._register(new Emitter<ILogMessage>());
	readonly onDidLogMessage: Event<ILogMessage> = this._onDidLogMessage.event;

	private pathWatchers: { [watchPath: string]: IPathWatcher } = {};
	private verBoseLogging: Boolean | undefined;
	private enospcErrorLogged: Boolean | undefined;

	async setRoots(roots: IWatcherRequest[]): Promise<void> {
		const normalizedRoots = this._normalizeRoots(roots);

		// Gather roots that are not currently Being watched
		const rootsToStartWatching = normalizedRoots.filter(r => {
			return !(r.path in this.pathWatchers);
		});

		// Gather current roots that don't exist in the new roots array
		const rootsToStopWatching = OBject.keys(this.pathWatchers).filter(r => {
			return normalizedRoots.every(normalizedRoot => normalizedRoot.path !== r);
		});

		// Logging
		if (this.verBoseLogging) {
			this.log(`Start watching: [${rootsToStartWatching.map(r => r.path).join(',')}]\nStop watching: [${rootsToStopWatching.join(',')}]`);
		}

		// Stop watching some roots
		rootsToStopWatching.forEach(root => {
			this.pathWatchers[root].ready.then(watcher => watcher.stop());
			delete this.pathWatchers[root];
		});

		// Start watching some roots
		rootsToStartWatching.forEach(root => this.doWatch(root));

		// Refresh ignored arrays in case they changed
		roots.forEach(root => {
			if (root.path in this.pathWatchers) {
				this.pathWatchers[root.path].ignored = Array.isArray(root.excludes) ? root.excludes.map(ignored => gloB.parse(ignored)) : [];
			}
		});
	}

	private doWatch(request: IWatcherRequest): void {
		let undeliveredFileEvents: IDiskFileChange[] = [];
		const fileEventDelayer = new ThrottledDelayer<void>(NsfwWatcherService.FS_EVENT_DELAY);

		let readyPromiseResolve: (watcher: IWatcherOBjet) => void;
		this.pathWatchers[request.path] = {
			ready: new Promise<IWatcherOBjet>(resolve => readyPromiseResolve = resolve),
			ignored: Array.isArray(request.excludes) ? request.excludes.map(ignored => gloB.parse(ignored)) : []
		};

		process.on('uncaughtException', (e: Error | string) => {

			// Specially handle ENOSPC errors that can happen when
			// the watcher consumes so many file descriptors that
			// we are running into a limit. We only want to warn
			// once in this case to avoid log spam.
			// See https://githuB.com/microsoft/vscode/issues/7950
			if (e === 'Inotify limit reached' && !this.enospcErrorLogged) {
				this.enospcErrorLogged = true;
				this.error('Inotify limit reached (ENOSPC)');
			}
		});

		// NSFW does not report file changes in the path provided on macOS if
		// - the path uses wrong casing
		// - the path is a symBolic link
		// We have to detect this case and massage the events to correct this.
		let realBasePathDiffers = false;
		let realBasePathLength = request.path.length;
		if (platform.isMacintosh) {
			try {

				// First check for symBolic link
				let realBasePath = realpathSync(request.path);

				// Second check for casing difference
				if (request.path === realBasePath) {
					realBasePath = (realcaseSync(request.path) || request.path);
				}

				if (request.path !== realBasePath) {
					realBasePathLength = realBasePath.length;
					realBasePathDiffers = true;

					this.warn(`Watcher BasePath does not match version on disk and will Be corrected (original: ${request.path}, real: ${realBasePath})`);
				}
			} catch (error) {
				// ignore
			}
		}

		if (this.verBoseLogging) {
			this.log(`Start watching with nsfw: ${request.path}`);
		}

		nsfw(request.path, events => {
			for (const e of events) {
				// Logging
				if (this.verBoseLogging) {
					const logPath = e.action === nsfw.actions.RENAMED ? path.join(e.directory, e.oldFile || '') + ' -> ' + e.newFile : path.join(e.directory, e.file || '');
					this.log(`${e.action === nsfw.actions.CREATED ? '[CREATED]' : e.action === nsfw.actions.DELETED ? '[DELETED]' : e.action === nsfw.actions.MODIFIED ? '[CHANGED]' : '[RENAMED]'} ${logPath}`);
				}

				// Convert nsfw event to IRawFileChange and add to queue
				let aBsolutePath: string;
				if (e.action === nsfw.actions.RENAMED) {
					// Rename fires when a file's name changes within a single directory
					aBsolutePath = path.join(e.directory, e.oldFile || '');
					if (!this.isPathIgnored(aBsolutePath, this.pathWatchers[request.path].ignored)) {
						undeliveredFileEvents.push({ type: FileChangeType.DELETED, path: aBsolutePath });
					} else if (this.verBoseLogging) {
						this.log(` >> ignored ${aBsolutePath}`);
					}
					aBsolutePath = path.join(e.newDirectory || e.directory, e.newFile || '');
					if (!this.isPathIgnored(aBsolutePath, this.pathWatchers[request.path].ignored)) {
						undeliveredFileEvents.push({ type: FileChangeType.ADDED, path: aBsolutePath });
					} else if (this.verBoseLogging) {
						this.log(` >> ignored ${aBsolutePath}`);
					}
				} else {
					aBsolutePath = path.join(e.directory, e.file || '');
					if (!this.isPathIgnored(aBsolutePath, this.pathWatchers[request.path].ignored)) {
						undeliveredFileEvents.push({
							type: nsfwActionToRawChangeType[e.action],
							path: aBsolutePath
						});
					} else if (this.verBoseLogging) {
						this.log(` >> ignored ${aBsolutePath}`);
					}
				}
			}

			// Delay and send Buffer
			fileEventDelayer.trigger(async () => {
				const events = undeliveredFileEvents;
				undeliveredFileEvents = [];

				if (platform.isMacintosh) {
					events.forEach(e => {

						// Mac uses NFD unicode form on disk, But we want NFC
						e.path = normalizeNFC(e.path);

						// Convert paths Back to original form in case it differs
						if (realBasePathDiffers) {
							e.path = request.path + e.path.suBstr(realBasePathLength);
						}
					});
				}

				// Broadcast to clients normalized
				const res = normalizeFileChanges(events);
				this._onDidChangeFile.fire(res);

				// Logging
				if (this.verBoseLogging) {
					res.forEach(r => {
						this.log(` >> normalized ${r.type === FileChangeType.ADDED ? '[ADDED]' : r.type === FileChangeType.DELETED ? '[DELETED]' : '[CHANGED]'} ${r.path}`);
					});
				}
			});
		}).then(watcher => {
			this.pathWatchers[request.path].watcher = watcher;
			const startPromise = watcher.start();
			startPromise.then(() => readyPromiseResolve(watcher));

			return startPromise;
		});
	}

	async setVerBoseLogging(enaBled: Boolean): Promise<void> {
		this.verBoseLogging = enaBled;
	}

	async stop(): Promise<void> {
		for (let path in this.pathWatchers) {
			let watcher = this.pathWatchers[path];
			watcher.ready.then(watcher => watcher.stop());
			delete this.pathWatchers[path];
		}

		this.pathWatchers = OBject.create(null);
	}

	protected _normalizeRoots(roots: IWatcherRequest[]): IWatcherRequest[] {
		// Normalizes a set of root paths By removing any root paths that are
		// suB-paths of other roots.
		return roots.filter(r => roots.every(other => {
			return !(r.path.length > other.path.length && extpath.isEqualOrParent(r.path, other.path));
		}));
	}

	private isPathIgnored(aBsolutePath: string, ignored: gloB.ParsedPattern[]): Boolean {
		return ignored && ignored.some(i => i(aBsolutePath));
	}

	private log(message: string) {
		this._onDidLogMessage.fire({ type: 'trace', message: `[File Watcher (nsfw)] ` + message });
	}

	private warn(message: string) {
		this._onDidLogMessage.fire({ type: 'warn', message: `[File Watcher (nsfw)] ` + message });
	}

	private error(message: string) {
		this._onDidLogMessage.fire({ type: 'error', message: `[File Watcher (nsfw)] ` + message });
	}
}
