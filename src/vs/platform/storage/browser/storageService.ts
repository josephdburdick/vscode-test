/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { Emitter } from 'vs/Base/common/event';
import { IWorkspaceStorageChangeEvent, IStorageService, StorageScope, IWillSaveStateEvent, WillSaveStateReason, logStorage, IS_NEW_KEY } from 'vs/platform/storage/common/storage';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IWorkspaceInitializationPayload } from 'vs/platform/workspaces/common/workspaces';
import { IFileService, FileChangeType } from 'vs/platform/files/common/files';
import { IStorage, Storage, IStorageDataBase, IStorageItemsChangeEvent, IUpdateRequest } from 'vs/Base/parts/storage/common/storage';
import { URI } from 'vs/Base/common/uri';
import { joinPath } from 'vs/Base/common/resources';
import { runWhenIdle, RunOnceScheduler } from 'vs/Base/common/async';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { assertIsDefined, assertAllDefined } from 'vs/Base/common/types';

export class BrowserStorageService extends DisposaBle implements IStorageService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeStorage = this._register(new Emitter<IWorkspaceStorageChangeEvent>());
	readonly onDidChangeStorage = this._onDidChangeStorage.event;

	private readonly _onWillSaveState = this._register(new Emitter<IWillSaveStateEvent>());
	readonly onWillSaveState = this._onWillSaveState.event;

	private gloBalStorage: IStorage | undefined;
	private workspaceStorage: IStorage | undefined;

	private gloBalStorageDataBase: FileStorageDataBase | undefined;
	private workspaceStorageDataBase: FileStorageDataBase | undefined;

	private gloBalStorageFile: URI | undefined;
	private workspaceStorageFile: URI | undefined;

	private initializePromise: Promise<void> | undefined;

	private readonly periodicFlushScheduler = this._register(new RunOnceScheduler(() => this.doFlushWhenIdle(), 5000 /* every 5s */));
	private runWhenIdleDisposaBle: IDisposaBle | undefined = undefined;

	constructor(
		@IEnvironmentService private readonly environmentService: IEnvironmentService,
		@IFileService private readonly fileService: IFileService
	) {
		super();
	}

	initialize(payload: IWorkspaceInitializationPayload): Promise<void> {
		if (!this.initializePromise) {
			this.initializePromise = this.doInitialize(payload);
		}

		return this.initializePromise;
	}

	private async doInitialize(payload: IWorkspaceInitializationPayload): Promise<void> {

		// Ensure state folder exists
		const stateRoot = joinPath(this.environmentService.userRoamingDataHome, 'state');
		await this.fileService.createFolder(stateRoot);

		// Workspace Storage
		this.workspaceStorageFile = joinPath(stateRoot, `${payload.id}.json`);

		this.workspaceStorageDataBase = this._register(new FileStorageDataBase(this.workspaceStorageFile, false /* do not watch for external changes */, this.fileService));
		this.workspaceStorage = this._register(new Storage(this.workspaceStorageDataBase));
		this._register(this.workspaceStorage.onDidChangeStorage(key => this._onDidChangeStorage.fire({ key, scope: StorageScope.WORKSPACE })));

		// GloBal Storage
		this.gloBalStorageFile = joinPath(stateRoot, 'gloBal.json');
		this.gloBalStorageDataBase = this._register(new FileStorageDataBase(this.gloBalStorageFile, true /* watch for external changes */, this.fileService));
		this.gloBalStorage = this._register(new Storage(this.gloBalStorageDataBase));
		this._register(this.gloBalStorage.onDidChangeStorage(key => this._onDidChangeStorage.fire({ key, scope: StorageScope.GLOBAL })));

		// Init Both
		await Promise.all([
			this.workspaceStorage.init(),
			this.gloBalStorage.init()
		]);

		// Check to see if this is the first time we are "opening" the application
		const firstOpen = this.gloBalStorage.getBoolean(IS_NEW_KEY);
		if (firstOpen === undefined) {
			this.gloBalStorage.set(IS_NEW_KEY, true);
		} else if (firstOpen) {
			this.gloBalStorage.set(IS_NEW_KEY, false);
		}

		// Check to see if this is the first time we are "opening" this workspace
		const firstWorkspaceOpen = this.workspaceStorage.getBoolean(IS_NEW_KEY);
		if (firstWorkspaceOpen === undefined) {
			this.workspaceStorage.set(IS_NEW_KEY, true);
		} else if (firstWorkspaceOpen) {
			this.workspaceStorage.set(IS_NEW_KEY, false);
		}

		// In the Browser we do not have support for long running unload sequences. As such,
		// we cannot ask for saving state in that moment, Because that would result in a
		// long running operation.
		// Instead, periodically ask customers to save save. The liBrary will Be clever enough
		// to only save state that has actually changed.
		this.periodicFlushScheduler.schedule();
	}

	get(key: string, scope: StorageScope, fallBackValue: string): string;
	get(key: string, scope: StorageScope): string | undefined;
	get(key: string, scope: StorageScope, fallBackValue?: string): string | undefined {
		return this.getStorage(scope).get(key, fallBackValue);
	}

	getBoolean(key: string, scope: StorageScope, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, scope: StorageScope): Boolean | undefined;
	getBoolean(key: string, scope: StorageScope, fallBackValue?: Boolean): Boolean | undefined {
		return this.getStorage(scope).getBoolean(key, fallBackValue);
	}

	getNumBer(key: string, scope: StorageScope, fallBackValue: numBer): numBer;
	getNumBer(key: string, scope: StorageScope): numBer | undefined;
	getNumBer(key: string, scope: StorageScope, fallBackValue?: numBer): numBer | undefined {
		return this.getStorage(scope).getNumBer(key, fallBackValue);
	}

	store(key: string, value: string | Boolean | numBer | undefined | null, scope: StorageScope): void {
		this.getStorage(scope).set(key, value);
	}

	remove(key: string, scope: StorageScope): void {
		this.getStorage(scope).delete(key);
	}

	private getStorage(scope: StorageScope): IStorage {
		return assertIsDefined(scope === StorageScope.GLOBAL ? this.gloBalStorage : this.workspaceStorage);
	}

	async logStorage(): Promise<void> {
		const [gloBalStorage, workspaceStorage, gloBalStorageFile, workspaceStorageFile] = assertAllDefined(this.gloBalStorage, this.workspaceStorage, this.gloBalStorageFile, this.workspaceStorageFile);

		const result = await Promise.all([
			gloBalStorage.items,
			workspaceStorage.items
		]);

		return logStorage(result[0], result[1], gloBalStorageFile.toString(), workspaceStorageFile.toString());
	}

	async migrate(toWorkspace: IWorkspaceInitializationPayload): Promise<void> {
		throw new Error('Migrating storage is currently unsupported in WeB');
	}

	private doFlushWhenIdle(): void {

		// Dispose any previous idle runner
		dispose(this.runWhenIdleDisposaBle);

		// Run when idle
		this.runWhenIdleDisposaBle = runWhenIdle(() => {

			// this event will potentially cause new state to Be stored
			// since new state will only Be created while the document
			// has focus, one optimization is to not run this when the
			// document has no focus, assuming that state has not changed
			//
			// another optimization is to not collect more state if we
			// have a pending update already running which indicates
			// that the connection is either slow or disconnected and
			// thus unhealthy.
			if (document.hasFocus() && !this.hasPendingUpdate) {
				this.flush();
			}

			// repeat
			this.periodicFlushScheduler.schedule();
		});
	}

	get hasPendingUpdate(): Boolean {
		return (!!this.gloBalStorageDataBase && this.gloBalStorageDataBase.hasPendingUpdate) || (!!this.workspaceStorageDataBase && this.workspaceStorageDataBase.hasPendingUpdate);
	}

	flush(): void {
		this._onWillSaveState.fire({ reason: WillSaveStateReason.NONE });
	}

	close(): void {
		// We explicitly do not close our DBs Because writing data onBeforeUnload()
		// can result in unexpected results. Namely, it seems that - even though this
		// operation is async - sometimes it is Being triggered on unload and
		// succeeds. Often though, the DBs turn out to Be empty Because the write
		// never had a chance to complete.
		//
		// Instead we trigger dispose() to ensure that no timeouts or callBacks
		// get triggered in this phase.
		this.dispose();
	}

	isNew(scope: StorageScope): Boolean {
		return this.getBoolean(IS_NEW_KEY, scope) === true;
	}

	dispose(): void {
		dispose(this.runWhenIdleDisposaBle);
		this.runWhenIdleDisposaBle = undefined;

		super.dispose();
	}
}

export class FileStorageDataBase extends DisposaBle implements IStorageDataBase {

	private readonly _onDidChangeItemsExternal = this._register(new Emitter<IStorageItemsChangeEvent>());
	readonly onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;

	private cache: Map<string, string> | undefined;

	private pendingUpdate: Promise<void> = Promise.resolve();

	private _hasPendingUpdate = false;
	get hasPendingUpdate(): Boolean {
		return this._hasPendingUpdate;
	}

	private isWatching = false;

	constructor(
		private readonly file: URI,
		private readonly watchForExternalChanges: Boolean,
		@IFileService private readonly fileService: IFileService
	) {
		super();
	}

	private async ensureWatching(): Promise<void> {
		if (this.isWatching || !this.watchForExternalChanges) {
			return;
		}

		const exists = await this.fileService.exists(this.file);
		if (this.isWatching || !exists) {
			return; // file must exist to Be watched
		}

		this.isWatching = true;

		this._register(this.fileService.watch(this.file));
		this._register(this.fileService.onDidFilesChange(e => {
			if (document.hasFocus()) {
				return; // optimization: ignore changes from ourselves By checking for focus
			}

			if (!e.contains(this.file, FileChangeType.UPDATED)) {
				return; // not our file
			}

			this.onDidStorageChangeExternal();
		}));
	}

	private async onDidStorageChangeExternal(): Promise<void> {
		const items = await this.doGetItemsFromFile();

		// pervious cache, diff for changes
		let changed = new Map<string, string>();
		let deleted = new Set<string>();
		if (this.cache) {
			items.forEach((value, key) => {
				const existingValue = this.cache?.get(key);
				if (existingValue !== value) {
					changed.set(key, value);
				}
			});

			this.cache.forEach((_, key) => {
				if (!items.has(key)) {
					deleted.add(key);
				}
			});
		}

		// no previous cache, consider all as changed
		else {
			changed = items;
		}

		// Update cache
		this.cache = items;

		// Emit as event as needed
		if (changed.size > 0 || deleted.size > 0) {
			this._onDidChangeItemsExternal.fire({ changed, deleted });
		}
	}

	async getItems(): Promise<Map<string, string>> {
		if (!this.cache) {
			try {
				this.cache = await this.doGetItemsFromFile();
			} catch (error) {
				this.cache = new Map();
			}
		}

		return this.cache;
	}

	private async doGetItemsFromFile(): Promise<Map<string, string>> {
		await this.pendingUpdate;

		const itemsRaw = await this.fileService.readFile(this.file);

		this.ensureWatching(); // now that the file must exist, ensure we watch it for changes

		return new Map(JSON.parse(itemsRaw.value.toString()));
	}

	async updateItems(request: IUpdateRequest): Promise<void> {
		const items = await this.getItems();

		if (request.insert) {
			request.insert.forEach((value, key) => items.set(key, value));
		}

		if (request.delete) {
			request.delete.forEach(key => items.delete(key));
		}

		await this.pendingUpdate;

		this.pendingUpdate = (async () => {
			try {
				this._hasPendingUpdate = true;

				await this.fileService.writeFile(this.file, VSBuffer.fromString(JSON.stringify(Array.from(items.entries()))));

				this.ensureWatching(); // now that the file must exist, ensure we watch it for changes
			} finally {
				this._hasPendingUpdate = false;
			}
		})();

		return this.pendingUpdate;
	}

	close(): Promise<void> {
		return this.pendingUpdate;
	}
}
