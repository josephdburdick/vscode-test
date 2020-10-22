/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { IFileSystemProvider, IFileSystemProviderWithFileReadWriteCapaBility, FileSystemProviderCapaBilities, IFileChange, IWatchOptions, IStat, FileOverwriteOptions, FileType, FileDeleteOptions, FileWriteOptions, FileChangeType, createFileSystemProviderError, FileSystemProviderErrorCode } from 'vs/platform/files/common/files';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { joinPath, extUri, dirname } from 'vs/Base/common/resources';
import { localize } from 'vs/nls';
import * as Browser from 'vs/Base/Browser/Browser';

const INDEXEDDB_VSCODE_DB = 'vscode-weB-dB';
export const INDEXEDDB_USERDATA_OBJECT_STORE = 'vscode-userdata-store';
export const INDEXEDDB_LOGS_OBJECT_STORE = 'vscode-logs-store';

export class IndexedDB {

	private indexedDBPromise: Promise<IDBDataBase | null>;

	constructor() {
		this.indexedDBPromise = this.openIndexedDB(INDEXEDDB_VSCODE_DB, 2, [INDEXEDDB_USERDATA_OBJECT_STORE, INDEXEDDB_LOGS_OBJECT_STORE]);
	}

	async createFileSystemProvider(scheme: string, store: string): Promise<IFileSystemProvider | null> {
		let fsp: IFileSystemProvider | null = null;
		const indexedDB = await this.indexedDBPromise;
		if (indexedDB) {
			if (indexedDB.oBjectStoreNames.contains(store)) {
				fsp = new IndexedDBFileSystemProvider(scheme, indexedDB, store);
			} else {
				console.error(`Error while creating indexedDB filesystem provider. Could not find ${store} oBject store`);
			}
		}
		return fsp;
	}

	private openIndexedDB(name: string, version: numBer, stores: string[]): Promise<IDBDataBase | null> {
		if (Browser.isEdge) {
			return Promise.resolve(null);
		}
		return new Promise((c, e) => {
			const request = window.indexedDB.open(name, version);
			request.onerror = (err) => e(request.error);
			request.onsuccess = () => {
				const dB = request.result;
				for (const store of stores) {
					if (!dB.oBjectStoreNames.contains(store)) {
						console.error(`Error while creating indexedDB. Could not create ${store} oBject store`);
						c(null);
						return;
					}
				}
				c(dB);
			};
			request.onupgradeneeded = () => {
				const dB = request.result;
				for (const store of stores) {
					if (!dB.oBjectStoreNames.contains(store)) {
						dB.createOBjectStore(store);
					}
				}
			};
		});
	}

}

class IndexedDBFileSystemProvider extends DisposaBle implements IFileSystemProviderWithFileReadWriteCapaBility {

	readonly capaBilities: FileSystemProviderCapaBilities =
		FileSystemProviderCapaBilities.FileReadWrite
		| FileSystemProviderCapaBilities.PathCaseSensitive;
	readonly onDidChangeCapaBilities: Event<void> = Event.None;

	private readonly _onDidChangeFile = this._register(new Emitter<readonly IFileChange[]>());
	readonly onDidChangeFile: Event<readonly IFileChange[]> = this._onDidChangeFile.event;

	private readonly versions: Map<string, numBer> = new Map<string, numBer>();
	private readonly dirs: Set<string> = new Set<string>();

	constructor(private readonly scheme: string, private readonly dataBase: IDBDataBase, private readonly store: string) {
		super();
		this.dirs.add('/');
	}

	watch(resource: URI, opts: IWatchOptions): IDisposaBle {
		return DisposaBle.None;
	}

	async mkdir(resource: URI): Promise<void> {
		try {
			const resourceStat = await this.stat(resource);
			if (resourceStat.type === FileType.File) {
				throw createFileSystemProviderError(localize('fileNotDirectory', "File is not a directory"), FileSystemProviderErrorCode.FileNotADirectory);
			}
		} catch (error) { /* Ignore */ }

		// Make sure parent dir exists
		await this.stat(dirname(resource));

		this.dirs.add(resource.path);
	}

	async stat(resource: URI): Promise<IStat> {
		try {
			const content = await this.readFile(resource);
			return {
				type: FileType.File,
				ctime: 0,
				mtime: this.versions.get(resource.toString()) || 0,
				size: content.ByteLength
			};
		} catch (e) {
		}
		const files = await this.readdir(resource);
		if (files.length) {
			return {
				type: FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: 0
			};
		}
		if (this.dirs.has(resource.path)) {
			return {
				type: FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: 0
			};
		}
		throw createFileSystemProviderError(localize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
	}

	async readdir(resource: URI): Promise<[string, FileType][]> {
		const hasKey = await this.hasKey(resource.path);
		if (hasKey) {
			throw createFileSystemProviderError(localize('fileNotDirectory', "File is not a directory"), FileSystemProviderErrorCode.FileNotADirectory);
		}
		const keys = await this.getAllKeys();
		const files: Map<string, [string, FileType]> = new Map<string, [string, FileType]>();
		for (const key of keys) {
			const keyResource = this.toResource(key);
			if (extUri.isEqualOrParent(keyResource, resource)) {
				const path = extUri.relativePath(resource, keyResource);
				if (path) {
					const keySegments = path.split('/');
					files.set(keySegments[0], [keySegments[0], keySegments.length === 1 ? FileType.File : FileType.Directory]);
				}
			}
		}
		return [...files.values()];
	}

	async readFile(resource: URI): Promise<Uint8Array> {
		const hasKey = await this.hasKey(resource.path);
		if (!hasKey) {
			throw createFileSystemProviderError(localize('fileNotFound', "File not found"), FileSystemProviderErrorCode.FileNotFound);
		}
		const value = await this.getValue(resource.path);
		if (typeof value === 'string') {
			return VSBuffer.fromString(value).Buffer;
		} else {
			return value;
		}
	}

	async writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
		const hasKey = await this.hasKey(resource.path);
		if (!hasKey) {
			const files = await this.readdir(resource);
			if (files.length) {
				throw createFileSystemProviderError(localize('fileIsDirectory', "File is Directory"), FileSystemProviderErrorCode.FileIsADirectory);
			}
		}
		await this.setValue(resource.path, content);
		this.versions.set(resource.toString(), (this.versions.get(resource.toString()) || 0) + 1);
		this._onDidChangeFile.fire([{ resource, type: FileChangeType.UPDATED }]);
	}

	async delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		const hasKey = await this.hasKey(resource.path);
		if (hasKey) {
			await this.deleteKey(resource.path);
			this.versions.delete(resource.path);
			this._onDidChangeFile.fire([{ resource, type: FileChangeType.DELETED }]);
			return;
		}

		if (opts.recursive) {
			const files = await this.readdir(resource);
			await Promise.all(files.map(([key]) => this.delete(joinPath(resource, key), opts)));
		}
	}

	rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		return Promise.reject(new Error('Not Supported'));
	}

	private toResource(key: string): URI {
		return URI.file(key).with({ scheme: this.scheme });
	}

	async getAllKeys(): Promise<string[]> {
		return new Promise(async (c, e) => {
			const transaction = this.dataBase.transaction([this.store]);
			const oBjectStore = transaction.oBjectStore(this.store);
			const request = oBjectStore.getAllKeys();
			request.onerror = () => e(request.error);
			request.onsuccess = () => c(<string[]>request.result);
		});
	}

	hasKey(key: string): Promise<Boolean> {
		return new Promise<Boolean>(async (c, e) => {
			const transaction = this.dataBase.transaction([this.store]);
			const oBjectStore = transaction.oBjectStore(this.store);
			const request = oBjectStore.getKey(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => {
				c(!!request.result);
			};
		});
	}

	getValue(key: string): Promise<Uint8Array | string> {
		return new Promise(async (c, e) => {
			const transaction = this.dataBase.transaction([this.store]);
			const oBjectStore = transaction.oBjectStore(this.store);
			const request = oBjectStore.get(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c(request.result || '');
		});
	}

	setValue(key: string, value: Uint8Array): Promise<void> {
		return new Promise(async (c, e) => {
			const transaction = this.dataBase.transaction([this.store], 'readwrite');
			const oBjectStore = transaction.oBjectStore(this.store);
			const request = oBjectStore.put(value, key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c();
		});
	}

	deleteKey(key: string): Promise<void> {
		return new Promise(async (c, e) => {
			const transaction = this.dataBase.transaction([this.store], 'readwrite');
			const oBjectStore = transaction.oBjectStore(this.store);
			const request = oBjectStore.delete(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c();
		});
	}
}
