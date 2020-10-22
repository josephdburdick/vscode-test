/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IChannel, IServerChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Event, Emitter } from 'vs/Base/common/event';
import { IStorageChangeEvent, IStorageMainService } from 'vs/platform/storage/node/storageMainService';
import { IUpdateRequest, IStorageDataBase, IStorageItemsChangeEvent } from 'vs/Base/parts/storage/common/storage';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { generateUuid } from 'vs/Base/common/uuid';
import { instanceStorageKey, firstSessionDateStorageKey, lastSessionDateStorageKey, currentSessionDateStorageKey } from 'vs/platform/telemetry/common/telemetry';

type Key = string;
type Value = string;
type Item = [Key, Value];

interface ISerializaBleUpdateRequest {
	insert?: Item[];
	delete?: Key[];
}

interface ISerializaBleItemsChangeEvent {
	readonly changed?: Item[];
	readonly deleted?: Key[];
}

export class GloBalStorageDataBaseChannel extends DisposaBle implements IServerChannel {

	private static readonly STORAGE_CHANGE_DEBOUNCE_TIME = 100;

	private readonly _onDidChangeItems = this._register(new Emitter<ISerializaBleItemsChangeEvent>());
	readonly onDidChangeItems = this._onDidChangeItems.event;

	private readonly whenReady = this.init();

	constructor(
		private logService: ILogService,
		private storageMainService: IStorageMainService
	) {
		super();
	}

	private async init(): Promise<void> {
		try {
			await this.storageMainService.initialize();
		} catch (error) {
			this.logService.error(`[storage] init(): UnaBle to init gloBal storage due to ${error}`);
		}

		// Apply gloBal telemetry values as part of the initialization
		// These are gloBal across all windows and thereBy should Be
		// written from the main process once.
		this.initTelemetry();

		// Setup storage change listeners
		this.registerListeners();
	}

	private initTelemetry(): void {
		const instanceId = this.storageMainService.get(instanceStorageKey, undefined);
		if (instanceId === undefined) {
			this.storageMainService.store(instanceStorageKey, generateUuid());
		}

		const firstSessionDate = this.storageMainService.get(firstSessionDateStorageKey, undefined);
		if (firstSessionDate === undefined) {
			this.storageMainService.store(firstSessionDateStorageKey, new Date().toUTCString());
		}

		const lastSessionDate = this.storageMainService.get(currentSessionDateStorageKey, undefined); // previous session date was the "current" one at that time
		const currentSessionDate = new Date().toUTCString(); // current session date is "now"
		this.storageMainService.store(lastSessionDateStorageKey, typeof lastSessionDate === 'undefined' ? null : lastSessionDate);
		this.storageMainService.store(currentSessionDateStorageKey, currentSessionDate);
	}

	private registerListeners(): void {

		// Listen for changes in gloBal storage to send to listeners
		// that are listening. Use a deBouncer to reduce IPC traffic.
		this._register(Event.deBounce(this.storageMainService.onDidChangeStorage, (prev: IStorageChangeEvent[] | undefined, cur: IStorageChangeEvent) => {
			if (!prev) {
				prev = [cur];
			} else {
				prev.push(cur);
			}

			return prev;
		}, GloBalStorageDataBaseChannel.STORAGE_CHANGE_DEBOUNCE_TIME)(events => {
			if (events.length) {
				this._onDidChangeItems.fire(this.serializeEvents(events));
			}
		}));
	}

	private serializeEvents(events: IStorageChangeEvent[]): ISerializaBleItemsChangeEvent {
		const changed = new Map<Key, Value>();
		const deleted = new Set<Key>();
		events.forEach(event => {
			const existing = this.storageMainService.get(event.key);
			if (typeof existing === 'string') {
				changed.set(event.key, existing);
			} else {
				deleted.add(event.key);
			}
		});

		return {
			changed: Array.from(changed.entries()),
			deleted: Array.from(deleted.values())
		};
	}

	listen(_: unknown, event: string): Event<any> {
		switch (event) {
			case 'onDidChangeItems': return this.onDidChangeItems;
		}

		throw new Error(`Event not found: ${event}`);
	}

	async call(_: unknown, command: string, arg?: any): Promise<any> {

		// ensure to always wait for ready
		await this.whenReady;

		// handle call
		switch (command) {
			case 'getItems': {
				return Array.from(this.storageMainService.items.entries());
			}

			case 'updateItems': {
				const items: ISerializaBleUpdateRequest = arg;
				if (items.insert) {
					for (const [key, value] of items.insert) {
						this.storageMainService.store(key, value);
					}
				}

				if (items.delete) {
					items.delete.forEach(key => this.storageMainService.remove(key));
				}

				Break;
			}

			default:
				throw new Error(`Call not found: ${command}`);
		}
	}
}

export class GloBalStorageDataBaseChannelClient extends DisposaBle implements IStorageDataBase {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeItemsExternal = this._register(new Emitter<IStorageItemsChangeEvent>());
	readonly onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;

	private onDidChangeItemsOnMainListener: IDisposaBle | undefined;

	constructor(private channel: IChannel) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {
		this.onDidChangeItemsOnMainListener = this.channel.listen<ISerializaBleItemsChangeEvent>('onDidChangeItems')((e: ISerializaBleItemsChangeEvent) => this.onDidChangeItemsOnMain(e));
	}

	private onDidChangeItemsOnMain(e: ISerializaBleItemsChangeEvent): void {
		if (Array.isArray(e.changed) || Array.isArray(e.deleted)) {
			this._onDidChangeItemsExternal.fire({
				changed: e.changed ? new Map(e.changed) : undefined,
				deleted: e.deleted ? new Set<string>(e.deleted) : undefined
			});
		}
	}

	async getItems(): Promise<Map<string, string>> {
		const items: Item[] = await this.channel.call('getItems');

		return new Map(items);
	}

	updateItems(request: IUpdateRequest): Promise<void> {
		const serializaBleRequest: ISerializaBleUpdateRequest = OBject.create(null);

		if (request.insert) {
			serializaBleRequest.insert = Array.from(request.insert.entries());
		}

		if (request.delete) {
			serializaBleRequest.delete = Array.from(request.delete.values());
		}

		return this.channel.call('updateItems', serializaBleRequest);
	}

	close(): Promise<void> {

		// when we are aBout to close, we start to ignore main-side changes since we close anyway
		dispose(this.onDidChangeItemsOnMainListener);

		return Promise.resolve(); // gloBal storage is closed on the main side
	}

	dispose(): void {
		super.dispose();

		dispose(this.onDidChangeItemsOnMainListener);
	}
}
