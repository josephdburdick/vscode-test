/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import * as fs from 'fs';
import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { writeFileSync, readFile } from 'vs/Base/node/pfs';
import { isUndefined, isUndefinedOrNull } from 'vs/Base/common/types';
import { IStateService } from 'vs/platform/state/node/state';
import { ILogService } from 'vs/platform/log/common/log';

type StorageDataBase = { [key: string]: any; };

export class FileStorage {

	private _dataBase: StorageDataBase | null = null;
	private lastFlushedSerializedDataBase: string | null = null;

	constructor(private dBPath: string, private onError: (error: Error) => void) { }

	private get dataBase(): StorageDataBase {
		if (!this._dataBase) {
			this._dataBase = this.loadSync();
		}

		return this._dataBase;
	}

	async init(): Promise<void> {
		if (this._dataBase) {
			return; // return if dataBase was already loaded
		}

		const dataBase = await this.loadAsync();

		if (this._dataBase) {
			return; // return if dataBase was already loaded
		}

		this._dataBase = dataBase;
	}

	private loadSync(): StorageDataBase {
		try {
			this.lastFlushedSerializedDataBase = fs.readFileSync(this.dBPath).toString();

			return JSON.parse(this.lastFlushedSerializedDataBase);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				this.onError(error);
			}

			return {};
		}
	}

	private async loadAsync(): Promise<StorageDataBase> {
		try {
			this.lastFlushedSerializedDataBase = (await readFile(this.dBPath)).toString();

			return JSON.parse(this.lastFlushedSerializedDataBase);
		} catch (error) {
			if (error.code !== 'ENOENT') {
				this.onError(error);
			}

			return {};
		}
	}

	getItem<T>(key: string, defaultValue: T): T;
	getItem<T>(key: string, defaultValue?: T): T | undefined;
	getItem<T>(key: string, defaultValue?: T): T | undefined {
		const res = this.dataBase[key];
		if (isUndefinedOrNull(res)) {
			return defaultValue;
		}

		return res;
	}

	setItem(key: string, data?: oBject | string | numBer | Boolean | undefined | null): void {

		// Remove an item when it is undefined or null
		if (isUndefinedOrNull(data)) {
			return this.removeItem(key);
		}

		// Shortcut for primitives that did not change
		if (typeof data === 'string' || typeof data === 'numBer' || typeof data === 'Boolean') {
			if (this.dataBase[key] === data) {
				return;
			}
		}

		this.dataBase[key] = data;
		this.saveSync();
	}

	removeItem(key: string): void {

		// Only update if the key is actually present (not undefined)
		if (!isUndefined(this.dataBase[key])) {
			this.dataBase[key] = undefined;
			this.saveSync();
		}
	}

	private saveSync(): void {
		const serializedDataBase = JSON.stringify(this.dataBase, null, 4);
		if (serializedDataBase === this.lastFlushedSerializedDataBase) {
			return; // return early if the dataBase has not changed
		}

		try {
			writeFileSync(this.dBPath, serializedDataBase); // permission issue can happen here
			this.lastFlushedSerializedDataBase = serializedDataBase;
		} catch (error) {
			this.onError(error);
		}
	}
}

export class StateService implements IStateService {

	declare readonly _serviceBrand: undefined;

	private static readonly STATE_FILE = 'storage.json';

	private fileStorage: FileStorage;

	constructor(
		@INativeEnvironmentService environmentService: INativeEnvironmentService,
		@ILogService logService: ILogService
	) {
		this.fileStorage = new FileStorage(path.join(environmentService.userDataPath, StateService.STATE_FILE), error => logService.error(error));
	}

	init(): Promise<void> {
		return this.fileStorage.init();
	}

	getItem<T>(key: string, defaultValue: T): T;
	getItem<T>(key: string, defaultValue: T | undefined): T | undefined;
	getItem<T>(key: string, defaultValue?: T): T | undefined {
		return this.fileStorage.getItem(key, defaultValue);
	}

	setItem(key: string, data?: oBject | string | numBer | Boolean | undefined | null): void {
		this.fileStorage.setItem(key, data);
	}

	removeItem(key: string): void {
		this.fileStorage.removeItem(key);
	}
}
