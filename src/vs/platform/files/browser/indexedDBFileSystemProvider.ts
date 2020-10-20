/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IFileSystemProvider, IFileSystemProviderWithFileReAdWriteCApAbility, FileSystemProviderCApAbilities, IFileChAnge, IWAtchOptions, IStAt, FileOverwriteOptions, FileType, FileDeleteOptions, FileWriteOptions, FileChAngeType, creAteFileSystemProviderError, FileSystemProviderErrorCode } from 'vs/plAtform/files/common/files';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { joinPAth, extUri, dirnAme } from 'vs/bAse/common/resources';
import { locAlize } from 'vs/nls';
import * As browser from 'vs/bAse/browser/browser';

const INDEXEDDB_VSCODE_DB = 'vscode-web-db';
export const INDEXEDDB_USERDATA_OBJECT_STORE = 'vscode-userdAtA-store';
export const INDEXEDDB_LOGS_OBJECT_STORE = 'vscode-logs-store';

export clAss IndexedDB {

	privAte indexedDBPromise: Promise<IDBDAtAbAse | null>;

	constructor() {
		this.indexedDBPromise = this.openIndexedDB(INDEXEDDB_VSCODE_DB, 2, [INDEXEDDB_USERDATA_OBJECT_STORE, INDEXEDDB_LOGS_OBJECT_STORE]);
	}

	Async creAteFileSystemProvider(scheme: string, store: string): Promise<IFileSystemProvider | null> {
		let fsp: IFileSystemProvider | null = null;
		const indexedDB = AwAit this.indexedDBPromise;
		if (indexedDB) {
			if (indexedDB.objectStoreNAmes.contAins(store)) {
				fsp = new IndexedDBFileSystemProvider(scheme, indexedDB, store);
			} else {
				console.error(`Error while creAting indexedDB filesystem provider. Could not find ${store} object store`);
			}
		}
		return fsp;
	}

	privAte openIndexedDB(nAme: string, version: number, stores: string[]): Promise<IDBDAtAbAse | null> {
		if (browser.isEdge) {
			return Promise.resolve(null);
		}
		return new Promise((c, e) => {
			const request = window.indexedDB.open(nAme, version);
			request.onerror = (err) => e(request.error);
			request.onsuccess = () => {
				const db = request.result;
				for (const store of stores) {
					if (!db.objectStoreNAmes.contAins(store)) {
						console.error(`Error while creAting indexedDB. Could not creAte ${store} object store`);
						c(null);
						return;
					}
				}
				c(db);
			};
			request.onupgrAdeneeded = () => {
				const db = request.result;
				for (const store of stores) {
					if (!db.objectStoreNAmes.contAins(store)) {
						db.creAteObjectStore(store);
					}
				}
			};
		});
	}

}

clAss IndexedDBFileSystemProvider extends DisposAble implements IFileSystemProviderWithFileReAdWriteCApAbility {

	reAdonly cApAbilities: FileSystemProviderCApAbilities =
		FileSystemProviderCApAbilities.FileReAdWrite
		| FileSystemProviderCApAbilities.PAthCAseSensitive;
	reAdonly onDidChAngeCApAbilities: Event<void> = Event.None;

	privAte reAdonly _onDidChAngeFile = this._register(new Emitter<reAdonly IFileChAnge[]>());
	reAdonly onDidChAngeFile: Event<reAdonly IFileChAnge[]> = this._onDidChAngeFile.event;

	privAte reAdonly versions: MAp<string, number> = new MAp<string, number>();
	privAte reAdonly dirs: Set<string> = new Set<string>();

	constructor(privAte reAdonly scheme: string, privAte reAdonly dAtAbAse: IDBDAtAbAse, privAte reAdonly store: string) {
		super();
		this.dirs.Add('/');
	}

	wAtch(resource: URI, opts: IWAtchOptions): IDisposAble {
		return DisposAble.None;
	}

	Async mkdir(resource: URI): Promise<void> {
		try {
			const resourceStAt = AwAit this.stAt(resource);
			if (resourceStAt.type === FileType.File) {
				throw creAteFileSystemProviderError(locAlize('fileNotDirectory', "File is not A directory"), FileSystemProviderErrorCode.FileNotADirectory);
			}
		} cAtch (error) { /* Ignore */ }

		// MAke sure pArent dir exists
		AwAit this.stAt(dirnAme(resource));

		this.dirs.Add(resource.pAth);
	}

	Async stAt(resource: URI): Promise<IStAt> {
		try {
			const content = AwAit this.reAdFile(resource);
			return {
				type: FileType.File,
				ctime: 0,
				mtime: this.versions.get(resource.toString()) || 0,
				size: content.byteLength
			};
		} cAtch (e) {
		}
		const files = AwAit this.reAddir(resource);
		if (files.length) {
			return {
				type: FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: 0
			};
		}
		if (this.dirs.hAs(resource.pAth)) {
			return {
				type: FileType.Directory,
				ctime: 0,
				mtime: 0,
				size: 0
			};
		}
		throw creAteFileSystemProviderError(locAlize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
	}

	Async reAddir(resource: URI): Promise<[string, FileType][]> {
		const hAsKey = AwAit this.hAsKey(resource.pAth);
		if (hAsKey) {
			throw creAteFileSystemProviderError(locAlize('fileNotDirectory', "File is not A directory"), FileSystemProviderErrorCode.FileNotADirectory);
		}
		const keys = AwAit this.getAllKeys();
		const files: MAp<string, [string, FileType]> = new MAp<string, [string, FileType]>();
		for (const key of keys) {
			const keyResource = this.toResource(key);
			if (extUri.isEquAlOrPArent(keyResource, resource)) {
				const pAth = extUri.relAtivePAth(resource, keyResource);
				if (pAth) {
					const keySegments = pAth.split('/');
					files.set(keySegments[0], [keySegments[0], keySegments.length === 1 ? FileType.File : FileType.Directory]);
				}
			}
		}
		return [...files.vAlues()];
	}

	Async reAdFile(resource: URI): Promise<Uint8ArrAy> {
		const hAsKey = AwAit this.hAsKey(resource.pAth);
		if (!hAsKey) {
			throw creAteFileSystemProviderError(locAlize('fileNotFound', "File not found"), FileSystemProviderErrorCode.FileNotFound);
		}
		const vAlue = AwAit this.getVAlue(resource.pAth);
		if (typeof vAlue === 'string') {
			return VSBuffer.fromString(vAlue).buffer;
		} else {
			return vAlue;
		}
	}

	Async writeFile(resource: URI, content: Uint8ArrAy, opts: FileWriteOptions): Promise<void> {
		const hAsKey = AwAit this.hAsKey(resource.pAth);
		if (!hAsKey) {
			const files = AwAit this.reAddir(resource);
			if (files.length) {
				throw creAteFileSystemProviderError(locAlize('fileIsDirectory', "File is Directory"), FileSystemProviderErrorCode.FileIsADirectory);
			}
		}
		AwAit this.setVAlue(resource.pAth, content);
		this.versions.set(resource.toString(), (this.versions.get(resource.toString()) || 0) + 1);
		this._onDidChAngeFile.fire([{ resource, type: FileChAngeType.UPDATED }]);
	}

	Async delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		const hAsKey = AwAit this.hAsKey(resource.pAth);
		if (hAsKey) {
			AwAit this.deleteKey(resource.pAth);
			this.versions.delete(resource.pAth);
			this._onDidChAngeFile.fire([{ resource, type: FileChAngeType.DELETED }]);
			return;
		}

		if (opts.recursive) {
			const files = AwAit this.reAddir(resource);
			AwAit Promise.All(files.mAp(([key]) => this.delete(joinPAth(resource, key), opts)));
		}
	}

	renAme(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		return Promise.reject(new Error('Not Supported'));
	}

	privAte toResource(key: string): URI {
		return URI.file(key).with({ scheme: this.scheme });
	}

	Async getAllKeys(): Promise<string[]> {
		return new Promise(Async (c, e) => {
			const trAnsAction = this.dAtAbAse.trAnsAction([this.store]);
			const objectStore = trAnsAction.objectStore(this.store);
			const request = objectStore.getAllKeys();
			request.onerror = () => e(request.error);
			request.onsuccess = () => c(<string[]>request.result);
		});
	}

	hAsKey(key: string): Promise<booleAn> {
		return new Promise<booleAn>(Async (c, e) => {
			const trAnsAction = this.dAtAbAse.trAnsAction([this.store]);
			const objectStore = trAnsAction.objectStore(this.store);
			const request = objectStore.getKey(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => {
				c(!!request.result);
			};
		});
	}

	getVAlue(key: string): Promise<Uint8ArrAy | string> {
		return new Promise(Async (c, e) => {
			const trAnsAction = this.dAtAbAse.trAnsAction([this.store]);
			const objectStore = trAnsAction.objectStore(this.store);
			const request = objectStore.get(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c(request.result || '');
		});
	}

	setVAlue(key: string, vAlue: Uint8ArrAy): Promise<void> {
		return new Promise(Async (c, e) => {
			const trAnsAction = this.dAtAbAse.trAnsAction([this.store], 'reAdwrite');
			const objectStore = trAnsAction.objectStore(this.store);
			const request = objectStore.put(vAlue, key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c();
		});
	}

	deleteKey(key: string): Promise<void> {
		return new Promise(Async (c, e) => {
			const trAnsAction = this.dAtAbAse.trAnsAction([this.store], 'reAdwrite');
			const objectStore = trAnsAction.objectStore(this.store);
			const request = objectStore.delete(key);
			request.onerror = () => e(request.error);
			request.onsuccess = () => c();
		});
	}
}
