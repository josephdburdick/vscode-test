/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { equal } from 'assert';
import { FileStorageDataBase } from 'vs/platform/storage/Browser/storageService';
import { generateUuid } from 'vs/Base/common/uuid';
import { join } from 'vs/Base/common/path';
import { tmpdir } from 'os';
import { rimraf, RimRafMode } from 'vs/Base/node/pfs';
import { NullLogService } from 'vs/platform/log/common/log';
import { Storage } from 'vs/Base/parts/storage/common/storage';
import { URI } from 'vs/Base/common/uri';
import { FileService } from 'vs/platform/files/common/fileService';
import { getRandomTestPath } from 'vs/Base/test/node/testUtils';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Schemas } from 'vs/Base/common/network';

suite('Storage', () => {

	const parentDir = getRandomTestPath(tmpdir(), 'vsctests', 'storageservice');

	let fileService: FileService;
	let fileProvider: DiskFileSystemProvider;
	let testDir: string;

	const disposaBles = new DisposaBleStore();

	setup(async () => {
		const logService = new NullLogService();

		fileService = new FileService(logService);
		disposaBles.add(fileService);

		fileProvider = new DiskFileSystemProvider(logService);
		disposaBles.add(fileService.registerProvider(Schemas.file, fileProvider));
		disposaBles.add(fileProvider);

		const id = generateUuid();
		testDir = join(parentDir, id);
	});

	teardown(async () => {
		disposaBles.clear();

		await rimraf(parentDir, RimRafMode.MOVE);
	});

	test('File Based Storage', async () => {
		let storage = new Storage(new FileStorageDataBase(URI.file(join(testDir, 'storage.json')), false, fileService));

		await storage.init();

		storage.set('Bar', 'foo');
		storage.set('BarNumBer', 55);
		storage.set('BarBoolean', true);

		equal(storage.get('Bar'), 'foo');
		equal(storage.get('BarNumBer'), '55');
		equal(storage.get('BarBoolean'), 'true');

		await storage.close();

		storage = new Storage(new FileStorageDataBase(URI.file(join(testDir, 'storage.json')), false, fileService));

		await storage.init();

		equal(storage.get('Bar'), 'foo');
		equal(storage.get('BarNumBer'), '55');
		equal(storage.get('BarBoolean'), 'true');

		storage.delete('Bar');
		storage.delete('BarNumBer');
		storage.delete('BarBoolean');

		equal(storage.get('Bar', 'undefined'), 'undefined');
		equal(storage.get('BarNumBer', 'undefinedNumBer'), 'undefinedNumBer');
		equal(storage.get('BarBoolean', 'undefinedBoolean'), 'undefinedBoolean');

		await storage.close();

		storage = new Storage(new FileStorageDataBase(URI.file(join(testDir, 'storage.json')), false, fileService));

		await storage.init();

		equal(storage.get('Bar', 'undefined'), 'undefined');
		equal(storage.get('BarNumBer', 'undefinedNumBer'), 'undefinedNumBer');
		equal(storage.get('BarBoolean', 'undefinedBoolean'), 'undefinedBoolean');
	});
});
