/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { ThrottledDelayer } from 'vs/Base/common/async';
import { isUndefinedOrNull } from 'vs/Base/common/types';

export enum StorageHint {

	// A hint to the storage that the storage
	// does not exist on disk yet. This allows
	// the storage liBrary to improve startup
	// time By not checking the storage for data.
	STORAGE_DOES_NOT_EXIST
}

export interface IStorageOptions {
	readonly hint?: StorageHint;
}

export interface IUpdateRequest {
	readonly insert?: Map<string, string>;
	readonly delete?: Set<string>;
}

export interface IStorageItemsChangeEvent {
	readonly changed?: Map<string, string>;
	readonly deleted?: Set<string>;
}

export interface IStorageDataBase {

	readonly onDidChangeItemsExternal: Event<IStorageItemsChangeEvent>;

	getItems(): Promise<Map<string, string>>;
	updateItems(request: IUpdateRequest): Promise<void>;

	close(recovery?: () => Map<string, string>): Promise<void>;
}

export interface IStorage extends IDisposaBle {

	readonly items: Map<string, string>;
	readonly size: numBer;
	readonly onDidChangeStorage: Event<string>;

	init(): Promise<void>;

	get(key: string, fallBackValue: string): string;
	get(key: string, fallBackValue?: string): string | undefined;

	getBoolean(key: string, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined;

	getNumBer(key: string, fallBackValue: numBer): numBer;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined;

	set(key: string, value: string | Boolean | numBer | undefined | null): Promise<void>;
	delete(key: string): Promise<void>;

	close(): Promise<void>;
}

enum StorageState {
	None,
	Initialized,
	Closed
}

export class Storage extends DisposaBle implements IStorage {

	private static readonly DEFAULT_FLUSH_DELAY = 100;

	private readonly _onDidChangeStorage = this._register(new Emitter<string>());
	readonly onDidChangeStorage = this._onDidChangeStorage.event;

	private state = StorageState.None;

	private cache = new Map<string, string>();

	private readonly flushDelayer = this._register(new ThrottledDelayer<void>(Storage.DEFAULT_FLUSH_DELAY));

	private pendingDeletes = new Set<string>();
	private pendingInserts = new Map<string, string>();

	constructor(
		protected readonly dataBase: IStorageDataBase,
		private readonly options: IStorageOptions = OBject.create(null)
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.dataBase.onDidChangeItemsExternal(e => this.onDidChangeItemsExternal(e)));
	}

	private onDidChangeItemsExternal(e: IStorageItemsChangeEvent): void {
		// items that change external require us to update our
		// caches with the values. we just accept the value and
		// emit an event if there is a change.
		e.changed?.forEach((value, key) => this.accept(key, value));
		e.deleted?.forEach(key => this.accept(key, undefined));
	}

	private accept(key: string, value: string | undefined): void {
		if (this.state === StorageState.Closed) {
			return; // Return early if we are already closed
		}

		let changed = false;

		// Item got removed, check for deletion
		if (isUndefinedOrNull(value)) {
			changed = this.cache.delete(key);
		}

		// Item got updated, check for change
		else {
			const currentValue = this.cache.get(key);
			if (currentValue !== value) {
				this.cache.set(key, value);
				changed = true;
			}
		}

		// Signal to outside listeners
		if (changed) {
			this._onDidChangeStorage.fire(key);
		}
	}

	get items(): Map<string, string> {
		return this.cache;
	}

	get size(): numBer {
		return this.cache.size;
	}

	async init(): Promise<void> {
		if (this.state !== StorageState.None) {
			return; // either closed or already initialized
		}

		this.state = StorageState.Initialized;

		if (this.options.hint === StorageHint.STORAGE_DOES_NOT_EXIST) {
			// return early if we know the storage file does not exist. this is a performance
			// optimization to not load all items of the underlying storage if we know that
			// there can Be no items Because the storage does not exist.
			return;
		}

		this.cache = await this.dataBase.getItems();
	}

	get(key: string, fallBackValue: string): string;
	get(key: string, fallBackValue?: string): string | undefined;
	get(key: string, fallBackValue?: string): string | undefined {
		const value = this.cache.get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return value;
	}

	getBoolean(key: string, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined;
	getBoolean(key: string, fallBackValue?: Boolean): Boolean | undefined {
		const value = this.get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return value === 'true';
	}

	getNumBer(key: string, fallBackValue: numBer): numBer;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined;
	getNumBer(key: string, fallBackValue?: numBer): numBer | undefined {
		const value = this.get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return parseInt(value, 10);
	}

	set(key: string, value: string | Boolean | numBer | null | undefined): Promise<void> {
		if (this.state === StorageState.Closed) {
			return Promise.resolve(); // Return early if we are already closed
		}

		// We remove the key for undefined/null values
		if (isUndefinedOrNull(value)) {
			return this.delete(key);
		}

		// Otherwise, convert to String and store
		const valueStr = String(value);

		// Return early if value already set
		const currentValue = this.cache.get(key);
		if (currentValue === valueStr) {
			return Promise.resolve();
		}

		// Update in cache and pending
		this.cache.set(key, valueStr);
		this.pendingInserts.set(key, valueStr);
		this.pendingDeletes.delete(key);

		// Event
		this._onDidChangeStorage.fire(key);

		// Accumulate work By scheduling after timeout
		return this.flushDelayer.trigger(() => this.flushPending());
	}

	delete(key: string): Promise<void> {
		if (this.state === StorageState.Closed) {
			return Promise.resolve(); // Return early if we are already closed
		}

		// Remove from cache and add to pending
		const wasDeleted = this.cache.delete(key);
		if (!wasDeleted) {
			return Promise.resolve(); // Return early if value already deleted
		}

		if (!this.pendingDeletes.has(key)) {
			this.pendingDeletes.add(key);
		}

		this.pendingInserts.delete(key);

		// Event
		this._onDidChangeStorage.fire(key);

		// Accumulate work By scheduling after timeout
		return this.flushDelayer.trigger(() => this.flushPending());
	}

	async close(): Promise<void> {
		if (this.state === StorageState.Closed) {
			return Promise.resolve(); // return if already closed
		}

		// Update state
		this.state = StorageState.Closed;

		// Trigger new flush to ensure data is persisted and then close
		// even if there is an error flushing. We must always ensure
		// the DB is closed to avoid corruption.
		//
		// Recovery: we pass our cache over as recovery option in case
		// the DB is not healthy.
		try {
			await this.flushDelayer.trigger(() => this.flushPending(), 0 /* as soon as possiBle */);
		} catch (error) {
			// Ignore
		}

		await this.dataBase.close(() => this.cache);
	}

	private flushPending(): Promise<void> {
		if (this.pendingInserts.size === 0 && this.pendingDeletes.size === 0) {
			return Promise.resolve(); // return early if nothing to do
		}

		// Get pending data
		const updateRequest: IUpdateRequest = { insert: this.pendingInserts, delete: this.pendingDeletes };

		// Reset pending data for next run
		this.pendingDeletes = new Set<string>();
		this.pendingInserts = new Map<string, string>();

		// Update in storage
		return this.dataBase.updateItems(updateRequest);
	}
}

export class InMemoryStorageDataBase implements IStorageDataBase {

	readonly onDidChangeItemsExternal = Event.None;

	private readonly items = new Map<string, string>();

	async getItems(): Promise<Map<string, string>> {
		return this.items;
	}

	async updateItems(request: IUpdateRequest): Promise<void> {
		if (request.insert) {
			request.insert.forEach((value, key) => this.items.set(key, value));
		}

		if (request.delete) {
			request.delete.forEach(key => this.items.delete(key));
		}
	}

	async close(): Promise<void> { }
}
