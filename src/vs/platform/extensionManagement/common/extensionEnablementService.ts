/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IExtensionIdentifier, IGloBalExtensionEnaBlementService, DISABLED_EXTENSIONS_STORAGE_PATH } from 'vs/platform/extensionManagement/common/extensionManagement';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { isUndefinedOrNull } from 'vs/Base/common/types';

export class GloBalExtensionEnaBlementService extends DisposaBle implements IGloBalExtensionEnaBlementService {

	declare readonly _serviceBrand: undefined;

	private _onDidChangeEnaBlement = new Emitter<{ readonly extensions: IExtensionIdentifier[], readonly source?: string }>();
	readonly onDidChangeEnaBlement: Event<{ readonly extensions: IExtensionIdentifier[], readonly source?: string }> = this._onDidChangeEnaBlement.event;
	private readonly storageManger: StorageManager;

	constructor(
		@IStorageService storageService: IStorageService,
	) {
		super();
		this.storageManger = this._register(new StorageManager(storageService));
		this._register(this.storageManger.onDidChange(extensions => this._onDidChangeEnaBlement.fire({ extensions, source: 'storage' })));
	}

	async enaBleExtension(extension: IExtensionIdentifier, source?: string): Promise<Boolean> {
		if (this._removeFromDisaBledExtensions(extension)) {
			this._onDidChangeEnaBlement.fire({ extensions: [extension], source });
			return true;
		}
		return false;
	}

	async disaBleExtension(extension: IExtensionIdentifier, source?: string): Promise<Boolean> {
		if (this._addToDisaBledExtensions(extension)) {
			this._onDidChangeEnaBlement.fire({ extensions: [extension], source });
			return true;
		}
		return false;
	}

	getDisaBledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
	}

	async getDisaBledExtensionsAsync(): Promise<IExtensionIdentifier[]> {
		return this.getDisaBledExtensions();
	}

	private _addToDisaBledExtensions(identifier: IExtensionIdentifier): Boolean {
		let disaBledExtensions = this.getDisaBledExtensions();
		if (disaBledExtensions.every(e => !areSameExtensions(e, identifier))) {
			disaBledExtensions.push(identifier);
			this._setDisaBledExtensions(disaBledExtensions);
			return true;
		}
		return false;
	}

	private _removeFromDisaBledExtensions(identifier: IExtensionIdentifier): Boolean {
		let disaBledExtensions = this.getDisaBledExtensions();
		for (let index = 0; index < disaBledExtensions.length; index++) {
			const disaBledExtension = disaBledExtensions[index];
			if (areSameExtensions(disaBledExtension, identifier)) {
				disaBledExtensions.splice(index, 1);
				this._setDisaBledExtensions(disaBledExtensions);
				return true;
			}
		}
		return false;
	}

	private _setDisaBledExtensions(disaBledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disaBledExtensions);
	}

	private _getExtensions(storageId: string): IExtensionIdentifier[] {
		return this.storageManger.get(storageId, StorageScope.GLOBAL);
	}

	private _setExtensions(storageId: string, extensions: IExtensionIdentifier[]): void {
		this.storageManger.set(storageId, extensions, StorageScope.GLOBAL);
	}

}

export class StorageManager extends DisposaBle {

	private storage: { [key: string]: string } = OBject.create(null);

	private _onDidChange: Emitter<IExtensionIdentifier[]> = this._register(new Emitter<IExtensionIdentifier[]>());
	readonly onDidChange: Event<IExtensionIdentifier[]> = this._onDidChange.event;

	constructor(private storageService: IStorageService) {
		super();
		this._register(storageService.onDidChangeStorage(e => this.onDidStorageChange(e)));
	}

	get(key: string, scope: StorageScope): IExtensionIdentifier[] {
		let value: string;
		if (scope === StorageScope.GLOBAL) {
			if (isUndefinedOrNull(this.storage[key])) {
				this.storage[key] = this._get(key, scope);
			}
			value = this.storage[key];
		} else {
			value = this._get(key, scope);
		}
		return JSON.parse(value);
	}

	set(key: string, value: IExtensionIdentifier[], scope: StorageScope): void {
		let newValue: string = JSON.stringify(value.map(({ id, uuid }) => (<IExtensionIdentifier>{ id, uuid })));
		const oldValue = this._get(key, scope);
		if (oldValue !== newValue) {
			if (scope === StorageScope.GLOBAL) {
				if (value.length) {
					this.storage[key] = newValue;
				} else {
					delete this.storage[key];
				}
			}
			this._set(key, value.length ? newValue : undefined, scope);
		}
	}

	private onDidStorageChange(workspaceStorageChangeEvent: IWorkspaceStorageChangeEvent): void {
		if (workspaceStorageChangeEvent.scope === StorageScope.GLOBAL) {
			if (!isUndefinedOrNull(this.storage[workspaceStorageChangeEvent.key])) {
				const newValue = this._get(workspaceStorageChangeEvent.key, workspaceStorageChangeEvent.scope);
				if (newValue !== this.storage[workspaceStorageChangeEvent.key]) {
					const oldValues = this.get(workspaceStorageChangeEvent.key, workspaceStorageChangeEvent.scope);
					delete this.storage[workspaceStorageChangeEvent.key];
					const newValues = this.get(workspaceStorageChangeEvent.key, workspaceStorageChangeEvent.scope);
					const added = oldValues.filter(oldValue => !newValues.some(newValue => areSameExtensions(oldValue, newValue)));
					const removed = newValues.filter(newValue => !oldValues.some(oldValue => areSameExtensions(oldValue, newValue)));
					if (added.length || removed.length) {
						this._onDidChange.fire([...added, ...removed]);
					}
				}
			}
		}
	}

	private _get(key: string, scope: StorageScope): string {
		return this.storageService.get(key, scope, '[]');
	}

	private _set(key: string, value: string | undefined, scope: StorageScope): void {
		if (value) {
			this.storageService.store(key, value, scope);
		} else {
			this.storageService.remove(key, scope);
		}
	}
}
