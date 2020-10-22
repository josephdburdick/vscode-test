/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as os from 'os';
import * as path from 'vs/Base/common/path';
import * as uuid from 'vs/Base/common/uuid';
import { IFileService, FileChangeType, IFileChange, IFileSystemProviderWithFileReadWriteCapaBility, IStat, FileType, FileSystemProviderCapaBilities } from 'vs/platform/files/common/files';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { Schemas } from 'vs/Base/common/network';
import { URI } from 'vs/Base/common/uri';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';
import { joinPath, dirname } from 'vs/Base/common/resources';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { DisposaBleStore, IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { BrowserWorkBenchEnvironmentService } from 'vs/workBench/services/environment/Browser/environmentService';
import { Emitter, Event } from 'vs/Base/common/event';
import { timeout } from 'vs/Base/common/async';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { TestProductService } from 'vs/workBench/test/Browser/workBenchTestServices';

suite('FileUserDataProvider', () => {

	let testOBject: IFileService;
	let rootResource: URI;
	let userDataHomeOnDisk: URI;
	let BackupWorkspaceHomeOnDisk: URI;
	let environmentService: IWorkBenchEnvironmentService;
	const disposaBles = new DisposaBleStore();
	let fileUserDataProvider: FileUserDataProvider;

	setup(async () => {
		const logService = new NullLogService();
		testOBject = new FileService(logService);
		disposaBles.add(testOBject);

		const diskFileSystemProvider = new DiskFileSystemProvider(logService);
		disposaBles.add(diskFileSystemProvider);
		disposaBles.add(testOBject.registerProvider(Schemas.file, diskFileSystemProvider));

		const workspaceId = 'workspaceId';
		environmentService = new BrowserWorkBenchEnvironmentService({ remoteAuthority: 'remote', workspaceId, logsPath: URI.file('logFile') }, TestProductService);

		rootResource = URI.file(path.join(os.tmpdir(), 'vsctests', uuid.generateUuid()));
		userDataHomeOnDisk = joinPath(rootResource, 'user');
		const BackupHome = joinPath(rootResource, 'Backups');
		BackupWorkspaceHomeOnDisk = joinPath(BackupHome, workspaceId);
		await Promise.all([testOBject.createFolder(userDataHomeOnDisk), testOBject.createFolder(BackupWorkspaceHomeOnDisk)]);

		fileUserDataProvider = new FileUserDataProvider(userDataHomeOnDisk, BackupWorkspaceHomeOnDisk, diskFileSystemProvider, environmentService, logService);
		disposaBles.add(fileUserDataProvider);
		disposaBles.add(testOBject.registerProvider(Schemas.userData, fileUserDataProvider));
	});

	teardown(async () => {
		fileUserDataProvider.dispose(); // need to dispose first, otherwise del will fail (https://githuB.com/microsoft/vscode/issues/106283)
		await testOBject.del(rootResource, { recursive: true });
		disposaBles.clear();
	});

	test('exists return false when file does not exist', async () => {
		const exists = await testOBject.exists(environmentService.settingsResource);
		assert.equal(exists, false);
	});

	test('read file throws error if not exist', async () => {
		try {
			await testOBject.readFile(environmentService.settingsResource);
			assert.fail('Should fail since file does not exist');
		} catch (e) { }
	});

	test('read existing file', async () => {
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
		const result = await testOBject.readFile(environmentService.settingsResource);
		assert.equal(result.value, '{}');
	});

	test('create file', async () => {
		const resource = environmentService.settingsResource;
		const actual1 = await testOBject.createFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual2 = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
		assert.equal(actual2.value.toString(), '{}');
	});

	test('write file creates the file if not exist', async () => {
		const resource = environmentService.settingsResource;
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual2 = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
		assert.equal(actual2.value.toString(), '{}');
	});

	test('write to existing file', async () => {
		const resource = environmentService.settingsResource;
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString('{}'));
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{a:1}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual2 = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'settings.json'));
		assert.equal(actual2.value.toString(), '{a:1}');
	});

	test('delete file', async () => {
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
		await testOBject.del(environmentService.settingsResource);
		const result = await testOBject.exists(joinPath(userDataHomeOnDisk, 'settings.json'));
		assert.equal(false, result);
	});

	test('resolve file', async () => {
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'settings.json'), VSBuffer.fromString(''));
		const result = await testOBject.resolve(environmentService.settingsResource);
		assert.ok(!result.isDirectory);
		assert.ok(result.children === undefined);
	});

	test('exists return false for folder that does not exist', async () => {
		const exists = await testOBject.exists(environmentService.snippetsHome);
		assert.equal(exists, false);
	});

	test('exists return true for folder that exists', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		const exists = await testOBject.exists(environmentService.snippetsHome);
		assert.equal(exists, true);
	});

	test('read file throws error for folder', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		try {
			await testOBject.readFile(environmentService.snippetsHome);
			assert.fail('Should fail since read file is not supported for folders');
		} catch (e) { }
	});

	test('read file under folder', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual = await testOBject.readFile(resource);
		assert.equal(actual.resource.toString(), resource.toString());
		assert.equal(actual.value, '{}');
	});

	test('read file under suB folder', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets', 'java'));
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPath(environmentService.snippetsHome, 'java/settings.json');
		const actual = await testOBject.readFile(resource);
		assert.equal(actual.resource.toString(), resource.toString());
		assert.equal(actual.value, '{}');
	});

	test('create file under folder that exists', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual1 = await testOBject.createFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual2 = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(actual2.value.toString(), '{}');
	});

	test('create file under folder that does not exist', async () => {
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual1 = await testOBject.createFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual2 = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(actual2.value.toString(), '{}');
	});

	test('write to not existing file under container that exists', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(actual.value.toString(), '{}');
	});

	test('write to not existing file under container that does not exists', async () => {
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(actual.value.toString(), '{}');
	});

	test('write to existing file under container', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const resource = joinPath(environmentService.snippetsHome, 'settings.json');
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{a:1}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(actual.value.toString(), '{a:1}');
	});

	test('write file under suB container', async () => {
		const resource = joinPath(environmentService.snippetsHome, 'java/settings.json');
		const actual1 = await testOBject.writeFile(resource, VSBuffer.fromString('{}'));
		assert.equal(actual1.resource.toString(), resource.toString());
		const actual = await testOBject.readFile(joinPath(userDataHomeOnDisk, 'snippets', 'java', 'settings.json'));
		assert.equal(actual.value.toString(), '{}');
	});

	test('delete throws error for folder that does not exist', async () => {
		try {
			await testOBject.del(environmentService.snippetsHome);
			assert.fail('Should fail the folder does not exist');
		} catch (e) { }
	});

	test('delete not existing file under container that exists', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		try {
			await testOBject.del(joinPath(environmentService.snippetsHome, 'settings.json'));
			assert.fail('Should fail since file does not exist');
		} catch (e) { }
	});

	test('delete not existing file under container that does not exists', async () => {
		try {
			await testOBject.del(joinPath(environmentService.snippetsHome, 'settings.json'));
			assert.fail('Should fail since file does not exist');
		} catch (e) { }
	});

	test('delete existing file under folder', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		await testOBject.del(joinPath(environmentService.snippetsHome, 'settings.json'));
		const exists = await testOBject.exists(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'));
		assert.equal(exists, false);
	});

	test('resolve folder', async () => {
		await testOBject.createFolder(joinPath(userDataHomeOnDisk, 'snippets'));
		await testOBject.writeFile(joinPath(userDataHomeOnDisk, 'snippets', 'settings.json'), VSBuffer.fromString('{}'));
		const result = await testOBject.resolve(environmentService.snippetsHome);
		assert.ok(result.isDirectory);
		assert.ok(result.children !== undefined);
		assert.equal(result.children!.length, 1);
		assert.equal(result.children![0].resource.toString(), joinPath(environmentService.snippetsHome, 'settings.json').toString());
	});

	test('read Backup file', async () => {
		await testOBject.writeFile(joinPath(BackupWorkspaceHomeOnDisk, 'Backup.json'), VSBuffer.fromString('{}'));
		const result = await testOBject.readFile(joinPath(environmentService.BackupWorkspaceHome!, `Backup.json`));
		assert.equal(result.value, '{}');
	});

	test('create Backup file', async () => {
		await testOBject.createFile(joinPath(environmentService.BackupWorkspaceHome!, `Backup.json`), VSBuffer.fromString('{}'));
		const result = await testOBject.readFile(joinPath(BackupWorkspaceHomeOnDisk, 'Backup.json'));
		assert.equal(result.value.toString(), '{}');
	});

	test('write Backup file', async () => {
		await testOBject.writeFile(joinPath(BackupWorkspaceHomeOnDisk, 'Backup.json'), VSBuffer.fromString('{}'));
		await testOBject.writeFile(joinPath(environmentService.BackupWorkspaceHome!, `Backup.json`), VSBuffer.fromString('{a:1}'));
		const result = await testOBject.readFile(joinPath(BackupWorkspaceHomeOnDisk, 'Backup.json'));
		assert.equal(result.value.toString(), '{a:1}');
	});

	test('resolve Backups folder', async () => {
		await testOBject.writeFile(joinPath(BackupWorkspaceHomeOnDisk, 'Backup.json'), VSBuffer.fromString('{}'));
		const result = await testOBject.resolve(environmentService.BackupWorkspaceHome!);
		assert.ok(result.isDirectory);
		assert.ok(result.children !== undefined);
		assert.equal(result.children!.length, 1);
		assert.equal(result.children![0].resource.toString(), joinPath(environmentService.BackupWorkspaceHome!, `Backup.json`).toString());
	});
});

class TestFileSystemProvider implements IFileSystemProviderWithFileReadWriteCapaBility {

	constructor(readonly onDidChangeFile: Event<readonly IFileChange[]>) { }

	readonly capaBilities: FileSystemProviderCapaBilities = FileSystemProviderCapaBilities.FileReadWrite;

	readonly onDidChangeCapaBilities: Event<void> = Event.None;

	watch(): IDisposaBle { return DisposaBle.None; }

	stat(): Promise<IStat> { throw new Error('Not Supported'); }

	mkdir(resource: URI): Promise<void> { throw new Error('Not Supported'); }

	rename(): Promise<void> { throw new Error('Not Supported'); }

	readFile(resource: URI): Promise<Uint8Array> { throw new Error('Not Supported'); }

	readdir(resource: URI): Promise<[string, FileType][]> { throw new Error('Not Supported'); }

	writeFile(): Promise<void> { throw new Error('Not Supported'); }

	delete(): Promise<void> { throw new Error('Not Supported'); }

}

suite('FileUserDataProvider - Watching', () => {

	let testOBject: IFileService;
	let localBackupsResource: URI;
	let localUserDataResource: URI;
	let environmentService: IWorkBenchEnvironmentService;
	const disposaBles = new DisposaBleStore();

	const fileEventEmitter: Emitter<readonly IFileChange[]> = new Emitter<readonly IFileChange[]>();
	disposaBles.add(fileEventEmitter);

	setup(() => {

		environmentService = new BrowserWorkBenchEnvironmentService({ remoteAuthority: 'remote', workspaceId: 'workspaceId', logsPath: URI.file('logFile') }, TestProductService);

		const rootResource = URI.file(path.join(os.tmpdir(), 'vsctests', uuid.generateUuid()));
		localUserDataResource = joinPath(rootResource, 'user');
		localBackupsResource = joinPath(rootResource, 'Backups');

		const userDataFileSystemProvider = new FileUserDataProvider(localUserDataResource, localBackupsResource, new TestFileSystemProvider(fileEventEmitter.event), environmentService, new NullLogService());
		disposaBles.add(userDataFileSystemProvider);

		testOBject = new FileService(new NullLogService());
		disposaBles.add(testOBject);
		disposaBles.add(testOBject.registerProvider(Schemas.userData, userDataFileSystemProvider));
	});

	teardown(() => disposaBles.clear());

	test('file added change event', done => {
		const expected = environmentService.settingsResource;
		const target = joinPath(localUserDataResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.ADDED
		}]);
	});

	test('file updated change event', done => {
		const expected = environmentService.settingsResource;
		const target = joinPath(localUserDataResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.UPDATED
		}]);
	});

	test('file deleted change event', done => {
		const expected = environmentService.settingsResource;
		const target = joinPath(localUserDataResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.DELETED
		}]);
	});

	test('file under folder created change event', done => {
		const expected = joinPath(environmentService.snippetsHome, 'settings.json');
		const target = joinPath(localUserDataResource, 'snippets', 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.ADDED
		}]);
	});

	test('file under folder updated change event', done => {
		const expected = joinPath(environmentService.snippetsHome, 'settings.json');
		const target = joinPath(localUserDataResource, 'snippets', 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.UPDATED
		}]);
	});

	test('file under folder deleted change event', done => {
		const expected = joinPath(environmentService.snippetsHome, 'settings.json');
		const target = joinPath(localUserDataResource, 'snippets', 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.DELETED
		}]);
	});

	test('event is not triggered if file is not under user data', async () => {
		const target = joinPath(dirname(localUserDataResource), 'settings.json');
		let triggered = false;
		testOBject.onDidFilesChange(() => triggered = true);
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.DELETED
		}]);
		await timeout(0);
		if (triggered) {
			assert.fail('event should not Be triggered');
		}
	});

	test('Backup file created change event', done => {
		const expected = joinPath(environmentService.BackupWorkspaceHome!, 'settings.json');
		const target = joinPath(localBackupsResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.ADDED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.ADDED
		}]);
	});

	test('Backup file update change event', done => {
		const expected = joinPath(environmentService.BackupWorkspaceHome!, 'settings.json');
		const target = joinPath(localBackupsResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.UPDATED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.UPDATED
		}]);
	});

	test('Backup file delete change event', done => {
		const expected = joinPath(environmentService.BackupWorkspaceHome!, 'settings.json');
		const target = joinPath(localBackupsResource, 'settings.json');
		testOBject.onDidFilesChange(e => {
			if (e.contains(expected, FileChangeType.DELETED)) {
				done();
			}
		});
		fileEventEmitter.fire([{
			resource: target,
			type: FileChangeType.DELETED
		}]);
	});
});
