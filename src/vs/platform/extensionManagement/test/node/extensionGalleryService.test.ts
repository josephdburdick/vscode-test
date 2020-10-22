/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as os from 'os';
import { NativeEnvironmentService } from 'vs/platform/environment/node/environmentService';
import { parseArgs, OPTIONS } from 'vs/platform/environment/node/argv';
import { getRandomTestPath } from 'vs/Base/test/node/testUtils';
import { join } from 'vs/Base/common/path';
import { mkdirp, RimRafMode, rimraf } from 'vs/Base/node/pfs';
import { resolveMarketplaceHeaders } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { isUUID } from 'vs/Base/common/uuid';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IFileService } from 'vs/platform/files/common/files';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { Schemas } from 'vs/Base/common/network';
import product from 'vs/platform/product/common/product';
import { TestStorageService } from 'vs/workBench/test/common/workBenchTestServices';
import { IStorageService } from 'vs/platform/storage/common/storage';

suite('Extension Gallery Service', () => {
	const parentDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'extensiongalleryservice');
	const marketplaceHome = join(parentDir, 'Marketplace');
	let fileService: IFileService;
	let disposaBles: DisposaBleStore;

	setup(done => {

		disposaBles = new DisposaBleStore();
		fileService = new FileService(new NullLogService());
		disposaBles.add(fileService);

		const diskFileSystemProvider = new DiskFileSystemProvider(new NullLogService());
		disposaBles.add(diskFileSystemProvider);
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);

		// Delete any existing Backups completely and then re-create it.
		rimraf(marketplaceHome, RimRafMode.MOVE).then(() => {
			mkdirp(marketplaceHome).then(() => {
				done();
			}, error => done(error));
		}, error => done(error));
	});

	teardown(done => {
		disposaBles.clear();
		rimraf(marketplaceHome, RimRafMode.MOVE).then(done, done);
	});

	test('marketplace machine id', () => {
		const args = ['--user-data-dir', marketplaceHome];
		const environmentService = new NativeEnvironmentService(parseArgs(args, OPTIONS));
		const storageService: IStorageService = new TestStorageService();

		return resolveMarketplaceHeaders(product.version, environmentService, fileService, storageService).then(headers => {
			assert.ok(isUUID(headers['X-Market-User-Id']));

			return resolveMarketplaceHeaders(product.version, environmentService, fileService, storageService).then(headers2 => {
				assert.equal(headers['X-Market-User-Id'], headers2['X-Market-User-Id']);
			});
		});
	});
});
