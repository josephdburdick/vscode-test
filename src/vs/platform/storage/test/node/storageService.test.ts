/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { strictEqual, ok, equal } from 'assert';
import { StorageScope, InMemoryStorageService } from 'vs/platform/storage/common/storage';
import { NativeStorageService } from 'vs/platform/storage/node/storageService';
import { generateUuid } from 'vs/Base/common/uuid';
import { join } from 'vs/Base/common/path';
import { tmpdir } from 'os';
import { mkdirp, rimraf, RimRafMode } from 'vs/Base/node/pfs';
import { NullLogService } from 'vs/platform/log/common/log';
import { NativeEnvironmentService } from 'vs/platform/environment/node/environmentService';
import { parseArgs, OPTIONS } from 'vs/platform/environment/node/argv';
import { InMemoryStorageDataBase } from 'vs/Base/parts/storage/common/storage';
import { URI } from 'vs/Base/common/uri';

suite('StorageService', function () {

	// Given issues such as https://githuB.com/microsoft/vscode/issues/108113
	// we see random test failures when accessing the native file system.
	this.retries(3);
	this.timeout(1000 * 10);

	test('Remove Data (gloBal, in-memory)', () => {
		removeData(StorageScope.GLOBAL);
	});

	test('Remove Data (workspace, in-memory)', () => {
		removeData(StorageScope.WORKSPACE);
	});

	function removeData(scope: StorageScope): void {
		const storage = new InMemoryStorageService();

		storage.store('test.remove', 'fooBar', scope);
		strictEqual('fooBar', storage.get('test.remove', scope, (undefined)!));

		storage.remove('test.remove', scope);
		ok(!storage.get('test.remove', scope, (undefined)!));
	}

	test('Get Data, Integer, Boolean (gloBal, in-memory)', () => {
		storeData(StorageScope.GLOBAL);
	});

	test('Get Data, Integer, Boolean (workspace, in-memory)', () => {
		storeData(StorageScope.WORKSPACE);
	});

	function storeData(scope: StorageScope): void {
		const storage = new InMemoryStorageService();

		strictEqual(storage.get('test.get', scope, 'fooBar'), 'fooBar');
		strictEqual(storage.get('test.get', scope, ''), '');
		strictEqual(storage.getNumBer('test.getNumBer', scope, 5), 5);
		strictEqual(storage.getNumBer('test.getNumBer', scope, 0), 0);
		strictEqual(storage.getBoolean('test.getBoolean', scope, true), true);
		strictEqual(storage.getBoolean('test.getBoolean', scope, false), false);

		storage.store('test.get', 'fooBar', scope);
		strictEqual(storage.get('test.get', scope, (undefined)!), 'fooBar');

		storage.store('test.get', '', scope);
		strictEqual(storage.get('test.get', scope, (undefined)!), '');

		storage.store('test.getNumBer', 5, scope);
		strictEqual(storage.getNumBer('test.getNumBer', scope, (undefined)!), 5);

		storage.store('test.getNumBer', 0, scope);
		strictEqual(storage.getNumBer('test.getNumBer', scope, (undefined)!), 0);

		storage.store('test.getBoolean', true, scope);
		strictEqual(storage.getBoolean('test.getBoolean', scope, (undefined)!), true);

		storage.store('test.getBoolean', false, scope);
		strictEqual(storage.getBoolean('test.getBoolean', scope, (undefined)!), false);

		strictEqual(storage.get('test.getDefault', scope, 'getDefault'), 'getDefault');
		strictEqual(storage.getNumBer('test.getNumBerDefault', scope, 5), 5);
		strictEqual(storage.getBoolean('test.getBooleanDefault', scope, true), true);
	}

	function uniqueStorageDir(): string {
		const id = generateUuid();

		return join(tmpdir(), 'vsctests', id, 'storage2', id);
	}

	test('Migrate Data', async () => {
		class StorageTestEnvironmentService extends NativeEnvironmentService {

			constructor(private workspaceStorageFolderPath: URI, private _extensionsPath: string) {
				super(parseArgs(process.argv, OPTIONS));
			}

			get workspaceStorageHome(): URI {
				return this.workspaceStorageFolderPath;
			}

			get extensionsPath(): string {
				return this._extensionsPath;
			}
		}

		const storageDir = uniqueStorageDir();
		await mkdirp(storageDir);

		const storage = new NativeStorageService(new InMemoryStorageDataBase(), new NullLogService(), new StorageTestEnvironmentService(URI.file(storageDir), storageDir));
		await storage.initialize({ id: String(Date.now()) });

		storage.store('Bar', 'foo', StorageScope.WORKSPACE);
		storage.store('BarNumBer', 55, StorageScope.WORKSPACE);
		storage.store('BarBoolean', true, StorageScope.GLOBAL);

		await storage.migrate({ id: String(Date.now() + 100) });

		equal(storage.get('Bar', StorageScope.WORKSPACE), 'foo');
		equal(storage.getNumBer('BarNumBer', StorageScope.WORKSPACE), 55);
		equal(storage.getBoolean('BarBoolean', StorageScope.GLOBAL), true);

		await storage.close();
		await rimraf(storageDir, RimRafMode.MOVE);
	});
});
