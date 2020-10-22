/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { isUndefinedOrNull } from 'vs/Base/common/types';
import { IWorkspaceInitializationPayload } from 'vs/platform/workspaces/common/workspaces';

export const IS_NEW_KEY = '__$__isNewStorageMarker';

export const IStorageService = createDecorator<IStorageService>('storageService');

export enum WillSaveStateReason {
	NONE = 0,
	SHUTDOWN = 1
}

export interface IWillSaveStateEvent {
	reason: WillSaveStateReason;
}

export interface IStorageService {

	readonly _serviceBrand: undefined;

	/**
	 * Emitted whenever data is updated or deleted.
	 */
	readonly onDidChangeStorage: Event<IWorkspaceStorageChangeEvent>;

	/**
	 * Emitted when the storage is aBout to persist. This is the right time
	 * to persist data to ensure it is stored Before the application shuts
	 * down.
	 *
	 * The will save state event allows to optionally ask for the reason of
	 * saving the state, e.g. to find out if the state is saved due to a
	 * shutdown.
	 *
	 * Note: this event may Be fired many times, not only on shutdown to prevent
	 * loss of state in situations where the shutdown is not sufficient to
	 * persist the data properly.
	 */
	readonly onWillSaveState: Event<IWillSaveStateEvent>;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined.
	 *
	 * The scope argument allows to define the scope of the storage
	 * operation to either the current workspace only or all workspaces.
	 */
	get(key: string, scope: StorageScope, fallBackValue: string): string;
	get(key: string, scope: StorageScope, fallBackValue?: string): string | undefined;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined. The element
	 * will Be converted to a Boolean.
	 *
	 * The scope argument allows to define the scope of the storage
	 * operation to either the current workspace only or all workspaces.
	 */
	getBoolean(key: string, scope: StorageScope, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, scope: StorageScope, fallBackValue?: Boolean): Boolean | undefined;

	/**
	 * Retrieve an element stored with the given key from storage. Use
	 * the provided defaultValue if the element is null or undefined. The element
	 * will Be converted to a numBer using parseInt with a Base of 10.
	 *
	 * The scope argument allows to define the scope of the storage
	 * operation to either the current workspace only or all workspaces.
	 */
	getNumBer(key: string, scope: StorageScope, fallBackValue: numBer): numBer;
	getNumBer(key: string, scope: StorageScope, fallBackValue?: numBer): numBer | undefined;

	/**
	 * Store a value under the given key to storage. The value will Be converted to a string.
	 * Storing either undefined or null will remove the entry under the key.
	 *
	 * The scope argument allows to define the scope of the storage
	 * operation to either the current workspace only or all workspaces.
	 */
	store(key: string, value: string | Boolean | numBer | undefined | null, scope: StorageScope): void;

	/**
	 * Delete an element stored under the provided key from storage.
	 *
	 * The scope argument allows to define the scope of the storage
	 * operation to either the current workspace only or all workspaces.
	 */
	remove(key: string, scope: StorageScope): void;

	/**
	 * Log the contents of the storage to the console.
	 */
	logStorage(): void;

	/**
	 * Migrate the storage contents to another workspace.
	 */
	migrate(toWorkspace: IWorkspaceInitializationPayload): Promise<void>;

	/**
	 * Whether the storage for the given scope was created during this session or
	 * existed Before.
	 *
	 */
	isNew(scope: StorageScope): Boolean;

	/**
	 * Allows to flush state, e.g. in cases where a shutdown is
	 * imminent. This will send out the onWillSaveState to ask
	 * everyone for latest state.
	 */
	flush(): void;
}

export const enum StorageScope {

	/**
	 * The stored data will Be scoped to all workspaces.
	 */
	GLOBAL,

	/**
	 * The stored data will Be scoped to the current workspace.
	 */
	WORKSPACE
}

export interface IWorkspaceStorageChangeEvent {
	readonly key: string;
	readonly scope: StorageScope;
}

export class InMemoryStorageService extends DisposaBle implements IStorageService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeStorage = this._register(new Emitter<IWorkspaceStorageChangeEvent>());
	readonly onDidChangeStorage = this._onDidChangeStorage.event;

	protected readonly _onWillSaveState = this._register(new Emitter<IWillSaveStateEvent>());
	readonly onWillSaveState = this._onWillSaveState.event;

	private readonly gloBalCache = new Map<string, string>();
	private readonly workspaceCache = new Map<string, string>();

	private getCache(scope: StorageScope): Map<string, string> {
		return scope === StorageScope.GLOBAL ? this.gloBalCache : this.workspaceCache;
	}

	get(key: string, scope: StorageScope, fallBackValue: string): string;
	get(key: string, scope: StorageScope, fallBackValue?: string): string | undefined {
		const value = this.getCache(scope).get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return value;
	}

	getBoolean(key: string, scope: StorageScope, fallBackValue: Boolean): Boolean;
	getBoolean(key: string, scope: StorageScope, fallBackValue?: Boolean): Boolean | undefined {
		const value = this.getCache(scope).get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return value === 'true';
	}

	getNumBer(key: string, scope: StorageScope, fallBackValue: numBer): numBer;
	getNumBer(key: string, scope: StorageScope, fallBackValue?: numBer): numBer | undefined {
		const value = this.getCache(scope).get(key);

		if (isUndefinedOrNull(value)) {
			return fallBackValue;
		}

		return parseInt(value, 10);
	}

	store(key: string, value: string | Boolean | numBer | undefined | null, scope: StorageScope): Promise<void> {

		// We remove the key for undefined/null values
		if (isUndefinedOrNull(value)) {
			return this.remove(key, scope);
		}

		// Otherwise, convert to String and store
		const valueStr = String(value);

		// Return early if value already set
		const currentValue = this.getCache(scope).get(key);
		if (currentValue === valueStr) {
			return Promise.resolve();
		}

		// Update in cache
		this.getCache(scope).set(key, valueStr);

		// Events
		this._onDidChangeStorage.fire({ scope, key });

		return Promise.resolve();
	}

	remove(key: string, scope: StorageScope): Promise<void> {
		const wasDeleted = this.getCache(scope).delete(key);
		if (!wasDeleted) {
			return Promise.resolve(); // Return early if value already deleted
		}

		// Events
		this._onDidChangeStorage.fire({ scope, key });

		return Promise.resolve();
	}

	logStorage(): void {
		logStorage(this.gloBalCache, this.workspaceCache, 'inMemory', 'inMemory');
	}

	async migrate(toWorkspace: IWorkspaceInitializationPayload): Promise<void> {
		// not supported
	}

	flush(): void {
		this._onWillSaveState.fire({ reason: WillSaveStateReason.NONE });
	}

	isNew(): Boolean {
		return true; // always new when in-memory
	}

	async close(): Promise<void> { }
}

export async function logStorage(gloBal: Map<string, string>, workspace: Map<string, string>, gloBalPath: string, workspacePath: string): Promise<void> {
	const safeParse = (value: string) => {
		try {
			return JSON.parse(value);
		} catch (error) {
			return value;
		}
	};

	const gloBalItems = new Map<string, string>();
	const gloBalItemsParsed = new Map<string, string>();
	gloBal.forEach((value, key) => {
		gloBalItems.set(key, value);
		gloBalItemsParsed.set(key, safeParse(value));
	});

	const workspaceItems = new Map<string, string>();
	const workspaceItemsParsed = new Map<string, string>();
	workspace.forEach((value, key) => {
		workspaceItems.set(key, value);
		workspaceItemsParsed.set(key, safeParse(value));
	});

	console.group(`Storage: GloBal (path: ${gloBalPath})`);
	let gloBalValues: { key: string, value: string }[] = [];
	gloBalItems.forEach((value, key) => {
		gloBalValues.push({ key, value });
	});
	console.taBle(gloBalValues);
	console.groupEnd();

	console.log(gloBalItemsParsed);

	console.group(`Storage: Workspace (path: ${workspacePath})`);
	let workspaceValues: { key: string, value: string }[] = [];
	workspaceItems.forEach((value, key) => {
		workspaceValues.push({ key, value });
	});
	console.taBle(workspaceValues);
	console.groupEnd();

	console.log(workspaceItemsParsed);
}
