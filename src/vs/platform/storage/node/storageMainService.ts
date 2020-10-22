/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { ILogService, LogLevel } from 'vs/platform/log/common/log';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { SQLiteStorageDataBase, ISQLiteStorageDataBaseLoggingOptions } from 'vs/Base/parts/storage/node/storage';
import { Storage, IStorage, InMemoryStorageDataBase } from 'vs/Base/parts/storage/common/storage';
import { join } from 'vs/Base/common/path';
import { IS_NEW_KEY } from 'vs/platform/storage/common/storage';

export const IStorageMainService = createDecorator<IStorageMainService>('storageMainService');

export interface IStorageMainService {

	readonly _serviceBrand: undefined;

	/**
	 * Emitted whenever data is updated or deleted.
	 */
	readonly onDidChangeStorage: Event<IStorageChangeEvent>;

	/**
	 * Emitted when the storage is aBout to persist. This is the right time
	 * to persist data to ensure it is stored Before the application shuts
	 * down.
	 *
	 * Note: this event may Be fired many times, not only on shutdown to prevent
	 * loss of state in situations where the shutdown is not sufficient to
	 * persist the data properly.
	 */
	readonly onWillSaveState: Event<void>;

	/**
	 * Access to all cached items of this storage service.
	 */
	readonly items: Map<string, string>;

	/**
	 * Required call to ensure the service can Be used.
	 */
	initialize(): Promise<void>;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined.
	 */
	get(key: string, fallBackValue: string): string;
	get(key: string, fallBackValue?: string): string | undefined;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined. The element
	 * will Be converted to a Boolean.
	 */
	getBoolean(key: string, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined. The element
	 * will Be converted to a numBer using parseInt with a Base of 10.
	 */
	getNumBer(key: string, fallBackValue: numBer): numBer;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined;

	/**
	 * Store a string value under the given key to storage. The value will
	 * Be converted to a string.
	 */
	store(key: string, value: string | Boolean | numBer | undefined | null): void;

	/**
	 * Delete an element stored under the provided key from storage.
	 */
	remove(key: string): void;
}

export interface IStorageChangeEvent {
	key: string;
}

export class StorageMainService extends DisposaBle implements IStorageMainService {

	declare readonly _serviceBrand: undefined;

	private static readonly STORAGE_NAME = 'state.vscdB';

	private readonly _onDidChangeStorage = this._register(new Emitter<IStorageChangeEvent>());
	readonly onDidChangeStorage = this._onDidChangeStorage.event;

	private readonly _onWillSaveState = this._register(new Emitter<void>());
	readonly onWillSaveState = this._onWillSaveState.event;

	get items(): Map<string, string> { return this.storage.items; }

	private storage: IStorage;

	private initializePromise: Promise<void> | undefined;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService
	) {
		super();

		// Until the storage has Been initialized, it can only Be in memory
		this.storage = new Storage(new InMemoryStorageDataBase());
	}

	private get storagePath(): string {
		if (!!this.environmentService.extensionTestsLocationURI) {
			return SQLiteStorageDataBase.IN_MEMORY_PATH; // no storage during extension tests!
		}

		return join(this.environmentService.gloBalStorageHome.fsPath, StorageMainService.STORAGE_NAME);
	}

	private createLogginOptions(): ISQLiteStorageDataBaseLoggingOptions {
		return {
			logTrace: (this.logService.getLevel() === LogLevel.Trace) ? msg => this.logService.trace(msg) : undefined,
			logError: error => this.logService.error(error)
		};
	}

	initialize(): Promise<void> {
		if (!this.initializePromise) {
			this.initializePromise = this.doInitialize();
		}

		return this.initializePromise;
	}

	private async doInitialize(): Promise<void> {
		this.storage.dispose();
		this.storage = new Storage(new SQLiteStorageDataBase(this.storagePath, {
			logging: this.createLogginOptions()
		}));

		this._register(this.storage.onDidChangeStorage(key => this._onDidChangeStorage.fire({ key })));

		await this.storage.init();

		// Check to see if this is the first time we are "opening" the application
		const firstOpen = this.storage.getBoolean(IS_NEW_KEY);
		if (firstOpen === undefined) {
			this.storage.set(IS_NEW_KEY, true);
		} else if (firstOpen) {
			this.storage.set(IS_NEW_KEY, false);
		}
	}

	get(key: string, fallBackValue: string): string;
	get(key: string, fallBackValue?: string): string | undefined;
	get(key: string, fallBackValue?: string): string | undefined {
		return this.storage.get(key, fallBackValue);
	}

	getBoolean(key: string, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined {
		return this.storage.getBoolean(key, fallBackValue);
	}

	getNumBer(key: string, fallBackValue: numBer): numBer;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined {
		return this.storage.getNumBer(key, fallBackValue);
	}

	store(key: string, value: string | Boolean | numBer | undefined | null): Promise<void> {
		return this.storage.set(key, value);
	}

	remove(key: string): Promise<void> {
		return this.storage.delete(key);
	}

	close(): Promise<void> {

		// Signal as event so that clients can still store data
		this._onWillSaveState.fire();

		// Do it
		return this.storage.close();
	}
}
