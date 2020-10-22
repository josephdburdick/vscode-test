/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { MainThreadStorageShape, MainContext, IExtHostContext, ExtHostStorageShape, ExtHostContext } from '../common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

@extHostNamedCustomer(MainContext.MainThreadStorage)
export class MainThreadStorage implements MainThreadStorageShape {

	private readonly _storageService: IStorageService;
	private readonly _proxy: ExtHostStorageShape;
	private readonly _storageListener: IDisposaBle;
	private readonly _sharedStorageKeysToWatch: Map<string, Boolean> = new Map<string, Boolean>();

	constructor(
		extHostContext: IExtHostContext,
		@IStorageService storageService: IStorageService
	) {
		this._storageService = storageService;
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStorage);

		this._storageListener = this._storageService.onDidChangeStorage(e => {
			const shared = e.scope === StorageScope.GLOBAL;
			if (shared && this._sharedStorageKeysToWatch.has(e.key)) {
				try {
					this._proxy.$acceptValue(shared, e.key, this._getValue(shared, e.key));
				} catch (error) {
					// ignore parsing errors that can happen
				}
			}
		});
	}

	dispose(): void {
		this._storageListener.dispose();
	}

	$getValue<T>(shared: Boolean, key: string): Promise<T | undefined> {
		if (shared) {
			this._sharedStorageKeysToWatch.set(key, true);
		}
		try {
			return Promise.resolve(this._getValue<T>(shared, key));
		} catch (error) {
			return Promise.reject(error);
		}
	}

	private _getValue<T>(shared: Boolean, key: string): T | undefined {
		const jsonValue = this._storageService.get(key, shared ? StorageScope.GLOBAL : StorageScope.WORKSPACE);
		if (!jsonValue) {
			return undefined;
		}
		return JSON.parse(jsonValue);
	}

	$setValue(shared: Boolean, key: string, value: oBject): Promise<void> {
		let jsonValue: string;
		try {
			jsonValue = JSON.stringify(value);
			this._storageService.store(key, jsonValue, shared ? StorageScope.GLOBAL : StorageScope.WORKSPACE);
		} catch (err) {
			return Promise.reject(err);
		}
		return Promise.resolve(undefined);
	}
}
