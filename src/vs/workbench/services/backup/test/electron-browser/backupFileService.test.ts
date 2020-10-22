/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import * as crypto from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'vs/Base/common/path';
import * as pfs from 'vs/Base/node/pfs';
import { URI } from 'vs/Base/common/uri';
import { BackupFilesModel } from 'vs/workBench/services/Backup/common/BackupFileService';
import { createTextBufferFactory } from 'vs/editor/common/model/textModel';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';
import { getRandomTestPath } from 'vs/Base/test/node/testUtils';
import { DefaultEndOfLine, ITextSnapshot } from 'vs/editor/common/model';
import { Schemas } from 'vs/Base/common/network';
import { FileService } from 'vs/platform/files/common/fileService';
import { NullLogService } from 'vs/platform/log/common/log';
import { DiskFileSystemProvider } from 'vs/platform/files/node/diskFileSystemProvider';
import { NativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-Browser/environmentService';
import { snapshotToString } from 'vs/workBench/services/textfile/common/textfiles';
import { IFileService } from 'vs/platform/files/common/files';
import { hashPath, BackupFileService } from 'vs/workBench/services/Backup/node/BackupFileService';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { TestWorkBenchConfiguration } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { TestProductService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';

const userdataDir = getRandomTestPath(os.tmpdir(), 'vsctests', 'Backupfileservice');
const BackupHome = path.join(userdataDir, 'Backups');
const workspacesJsonPath = path.join(BackupHome, 'workspaces.json');

const workspaceResource = URI.file(platform.isWindows ? 'c:\\workspace' : '/workspace');
const workspaceBackupPath = path.join(BackupHome, hashPath(workspaceResource));
const fooFile = URI.file(platform.isWindows ? 'c:\\Foo' : '/Foo');
const customFile = URI.parse('customScheme://some/path');
const customFileWithFragment = URI.parse('customScheme2://some/path#fragment');
const BarFile = URI.file(platform.isWindows ? 'c:\\Bar' : '/Bar');
const fooBarFile = URI.file(platform.isWindows ? 'c:\\Foo Bar' : '/Foo Bar');
const untitledFile = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
const fooBackupPath = path.join(workspaceBackupPath, 'file', hashPath(fooFile));
const BarBackupPath = path.join(workspaceBackupPath, 'file', hashPath(BarFile));
const untitledBackupPath = path.join(workspaceBackupPath, 'untitled', hashPath(untitledFile));

class TestWorkBenchEnvironmentService extends NativeWorkBenchEnvironmentService {

	constructor(BackupPath: string) {
		super({ ...TestWorkBenchConfiguration, BackupPath, 'user-data-dir': userdataDir }, TestProductService);
	}
}

export class NodeTestBackupFileService extends BackupFileService {

	readonly fileService: IFileService;

	private BackupResourceJoiners: Function[];
	private discardBackupJoiners: Function[];
	discardedBackups: URI[];

	constructor(workspaceBackupPath: string) {
		const environmentService = new TestWorkBenchEnvironmentService(workspaceBackupPath);
		const logService = new NullLogService();
		const fileService = new FileService(logService);
		const diskFileSystemProvider = new DiskFileSystemProvider(logService);
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);
		fileService.registerProvider(Schemas.userData, new FileUserDataProvider(environmentService.appSettingsHome, URI.file(workspaceBackupPath), diskFileSystemProvider, environmentService, logService));

		super(environmentService, fileService, logService);

		this.fileService = fileService;
		this.BackupResourceJoiners = [];
		this.discardBackupJoiners = [];
		this.discardedBackups = [];
	}

	joinBackupResource(): Promise<void> {
		return new Promise(resolve => this.BackupResourceJoiners.push(resolve));
	}

	async Backup(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: any, token?: CancellationToken): Promise<void> {
		await super.Backup(resource, content, versionId, meta, token);

		while (this.BackupResourceJoiners.length) {
			this.BackupResourceJoiners.pop()!();
		}
	}

	joinDiscardBackup(): Promise<void> {
		return new Promise(resolve => this.discardBackupJoiners.push(resolve));
	}

	async discardBackup(resource: URI): Promise<void> {
		await super.discardBackup(resource);
		this.discardedBackups.push(resource);

		while (this.discardBackupJoiners.length) {
			this.discardBackupJoiners.pop()!();
		}
	}

	async getBackupContents(resource: URI): Promise<string> {
		const BackupResource = this.toBackupResource(resource);

		const fileContents = await this.fileService.readFile(BackupResource);

		return fileContents.value.toString();
	}
}

suite('BackupFileService', () => {
	let service: NodeTestBackupFileService;

	setup(async () => {
		service = new NodeTestBackupFileService(workspaceBackupPath);

		// Delete any existing Backups completely and then re-create it.
		await pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
		await pfs.mkdirp(BackupHome);

		return pfs.writeFile(workspacesJsonPath, '');
	});

	teardown(() => {
		return pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
	});

	suite('hashPath', () => {
		test('should correctly hash the path for untitled scheme URIs', () => {
			const uri = URI.from({
				scheme: 'untitled',
				path: 'Untitled-1'
			});
			const actual = hashPath(uri);
			// If these hashes change people will lose their Backed up files!
			assert.equal(actual, '13264068d108c6901B3592ea654fcd57');
			assert.equal(actual, crypto.createHash('md5').update(uri.fsPath).digest('hex'));
		});

		test('should correctly hash the path for file scheme URIs', () => {
			const uri = URI.file('/foo');
			const actual = hashPath(uri);
			// If these hashes change people will lose their Backed up files!
			if (platform.isWindows) {
				assert.equal(actual, 'dec1a583f52468a020Bd120c3f01d812');
			} else {
				assert.equal(actual, '1effB2475fcfBa4f9e8B8a1dBc8f3caf');
			}
			assert.equal(actual, crypto.createHash('md5').update(uri.fsPath).digest('hex'));
		});
	});

	suite('getBackupResource', () => {
		test('should get the correct Backup path for text files', () => {
			// Format should Be: <BackupHome>/<workspaceHash>/<scheme>/<filePathHash>
			const BackupResource = fooFile;
			const workspaceHash = hashPath(workspaceResource);
			const filePathHash = hashPath(BackupResource);
			const expectedPath = URI.file(path.join(BackupHome, workspaceHash, Schemas.file, filePathHash)).with({ scheme: Schemas.userData }).toString();
			assert.equal(service.toBackupResource(BackupResource).toString(), expectedPath);
		});

		test('should get the correct Backup path for untitled files', () => {
			// Format should Be: <BackupHome>/<workspaceHash>/<scheme>/<filePath>
			const BackupResource = URI.from({ scheme: Schemas.untitled, path: 'Untitled-1' });
			const workspaceHash = hashPath(workspaceResource);
			const filePathHash = hashPath(BackupResource);
			const expectedPath = URI.file(path.join(BackupHome, workspaceHash, Schemas.untitled, filePathHash)).with({ scheme: Schemas.userData }).toString();
			assert.equal(service.toBackupResource(BackupResource).toString(), expectedPath);
		});
	});

	suite('Backup', () => {
		test('no text', async () => {
			await service.Backup(fooFile);
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath), `${fooFile.toString()}\n`);
			assert.ok(service.hasBackupSync(fooFile));
		});

		test('text file', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath), `${fooFile.toString()}\ntest`);
			assert.ok(service.hasBackupSync(fooFile));
		});

		test('text file (with version)', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false), 666);
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath), `${fooFile.toString()}\ntest`);
			assert.ok(!service.hasBackupSync(fooFile, 555));
			assert.ok(service.hasBackupSync(fooFile, 666));
		});

		test('text file (with meta)', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false), undefined, { etag: '678', orphaned: true });
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath).toString(), `${fooFile.toString()} {"etag":"678","orphaned":true}\ntest`);
			assert.ok(service.hasBackupSync(fooFile));
		});

		test('untitled file', async () => {
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 1);
			assert.equal(fs.existsSync(untitledBackupPath), true);
			assert.equal(fs.readFileSync(untitledBackupPath), `${untitledFile.toString()}\ntest`);
			assert.ok(service.hasBackupSync(untitledFile));
		});

		test('text file (ITextSnapshot)', async () => {
			const model = createTextModel('test');

			await service.Backup(fooFile, model.createSnapshot());
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath), `${fooFile.toString()}\ntest`);
			assert.ok(service.hasBackupSync(fooFile));

			model.dispose();
		});

		test('untitled file (ITextSnapshot)', async () => {
			const model = createTextModel('test');

			await service.Backup(untitledFile, model.createSnapshot());
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 1);
			assert.equal(fs.existsSync(untitledBackupPath), true);
			assert.equal(fs.readFileSync(untitledBackupPath), `${untitledFile.toString()}\ntest`);

			model.dispose();
		});

		test('text file (large file, ITextSnapshot)', async () => {
			const largeString = (new Array(10 * 1024)).join('Large String\n');
			const model = createTextModel(largeString);

			await service.Backup(fooFile, model.createSnapshot());
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.equal(fs.existsSync(fooBackupPath), true);
			assert.equal(fs.readFileSync(fooBackupPath), `${fooFile.toString()}\n${largeString}`);
			assert.ok(service.hasBackupSync(fooFile));

			model.dispose();
		});

		test('untitled file (large file, ITextSnapshot)', async () => {
			const largeString = (new Array(10 * 1024)).join('Large String\n');
			const model = createTextModel(largeString);

			await service.Backup(untitledFile, model.createSnapshot());
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 1);
			assert.equal(fs.existsSync(untitledBackupPath), true);
			assert.equal(fs.readFileSync(untitledBackupPath), `${untitledFile.toString()}\n${largeString}`);
			assert.ok(service.hasBackupSync(untitledFile));

			model.dispose();
		});

		test('cancellation', async () => {
			const cts = new CancellationTokenSource();
			const promise = service.Backup(fooFile, undefined, undefined, undefined, cts.token);
			cts.cancel();
			await promise;

			assert.equal(fs.existsSync(fooBackupPath), false);
			assert.ok(!service.hasBackupSync(fooFile));
		});
	});

	suite('discardBackup', () => {
		test('text file', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			assert.ok(service.hasBackupSync(fooFile));

			await service.discardBackup(fooFile);
			assert.equal(fs.existsSync(fooBackupPath), false);
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 0);
			assert.ok(!service.hasBackupSync(fooFile));
		});

		test('untitled file', async () => {
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 1);
			await service.discardBackup(untitledFile);
			assert.equal(fs.existsSync(untitledBackupPath), false);
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 0);
		});
	});

	suite('discardBackups', () => {
		test('text file', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 1);
			await service.Backup(BarFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'file')).length, 2);
			await service.discardBackups();
			assert.equal(fs.existsSync(fooBackupPath), false);
			assert.equal(fs.existsSync(BarBackupPath), false);
			assert.equal(fs.existsSync(path.join(workspaceBackupPath, 'file')), false);
		});

		test('untitled file', async () => {
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.readdirSync(path.join(workspaceBackupPath, 'untitled')).length, 1);
			await service.discardBackups();
			assert.equal(fs.existsSync(untitledBackupPath), false);
			assert.equal(fs.existsSync(path.join(workspaceBackupPath, 'untitled')), false);
		});

		test('can Backup after discarding all', async () => {
			await service.discardBackups();
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			assert.equal(fs.existsSync(workspaceBackupPath), true);
		});
	});

	suite('getBackups', () => {
		test('("file") - text file', async () => {
			await service.Backup(fooFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			const textFiles = await service.getBackups();
			assert.deepEqual(textFiles.map(f => f.fsPath), [fooFile.fsPath]);
			await service.Backup(BarFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			const textFiles_1 = await service.getBackups();
			assert.deepEqual(textFiles_1.map(f => f.fsPath), [fooFile.fsPath, BarFile.fsPath]);
		});

		test('("file") - untitled file', async () => {
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			const textFiles = await service.getBackups();
			assert.deepEqual(textFiles.map(f => f.fsPath), [untitledFile.fsPath]);
		});

		test('("untitled") - untitled file', async () => {
			await service.Backup(untitledFile, createTextBufferFactory('test').create(DefaultEndOfLine.LF).createSnapshot(false));
			const textFiles = await service.getBackups();
			assert.deepEqual(textFiles.map(f => f.fsPath), ['Untitled-1']);
		});
	});

	suite('resolve', () => {

		interface IBackupTestMetaData {
			mtime?: numBer;
			size?: numBer;
			etag?: string;
			orphaned?: Boolean;
		}

		test('should restore the original contents (untitled file)', async () => {
			const contents = 'test\nand more stuff';

			await testResolveBackup(untitledFile, contents);
		});

		test('should restore the original contents (untitled file with metadata)', async () => {
			const contents = 'test\nand more stuff';

			const meta = {
				etag: 'the Etag',
				size: 666,
				mtime: Date.now(),
				orphaned: true
			};

			await testResolveBackup(untitledFile, contents, meta);
		});

		test('should restore the original contents (text file)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'consectetur ',
				'adipiscing ßß elit'
			].join('');

			await testResolveBackup(fooFile, contents);
		});

		test('should restore the original contents (text file - custom scheme)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'consectetur ',
				'adipiscing ßß elit'
			].join('');

			await testResolveBackup(customFile, contents);
		});

		test('should restore the original contents (text file with metadata)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: 'theEtag',
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await testResolveBackup(fooFile, contents, meta);
		});

		test('should restore the original contents (text file with metadata changed once)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: 'theEtag',
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await testResolveBackup(fooFile, contents, meta);

			// Change meta and test again
			meta.size = 999;
			await testResolveBackup(fooFile, contents, meta);
		});

		test('should restore the original contents (text file with Broken metadata)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: 'theEtag',
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await service.Backup(fooFile, createTextBufferFactory(contents).create(DefaultEndOfLine.LF).createSnapshot(false), 1, meta);

			const fileContents = fs.readFileSync(fooBackupPath).toString();
			assert.equal(fileContents.indexOf(fooFile.toString()), 0);

			const metaIndex = fileContents.indexOf('{');
			const newFileContents = fileContents.suBstring(0, metaIndex) + '{{' + fileContents.suBstr(metaIndex);
			fs.writeFileSync(fooBackupPath, newFileContents);

			const Backup = await service.resolve(fooFile);
			assert.ok(Backup);
			assert.equal(contents, snapshotToString(Backup!.value.create(platform.isWindows ? DefaultEndOfLine.CRLF : DefaultEndOfLine.LF).createSnapshot(true)));
			assert.ok(!Backup!.meta);
		});

		test('should restore the original contents (text file with metadata and fragment URI)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: 'theEtag',
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await testResolveBackup(customFileWithFragment, contents, meta);
		});

		test('should restore the original contents (text file with space in name with metadata)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: 'theEtag',
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await testResolveBackup(fooBarFile, contents, meta);
		});

		test('should restore the original contents (text file with too large metadata to persist)', async () => {
			const contents = [
				'Lorem ipsum ',
				'dolor öäü sit amet ',
				'adipiscing ßß elit',
				'consectetur '
			].join('');

			const meta = {
				etag: (new Array(100 * 1024)).join('Large String'),
				size: 888,
				mtime: Date.now(),
				orphaned: false
			};

			await testResolveBackup(fooBarFile, contents, meta, null);
		});

		test('should ignore invalid Backups', async () => {
			const contents = 'test\nand more stuff';

			await service.Backup(fooBarFile, createTextBufferFactory(contents).create(DefaultEndOfLine.LF).createSnapshot(false), 1);

			const Backup = await service.resolve(fooBarFile);
			if (!Backup) {
				throw new Error('Unexpected missing Backup');
			}

			await service.fileService.writeFile(service.toBackupResource(fooBarFile), VSBuffer.fromString(''));

			let err: Error | undefined = undefined;
			try {
				await service.resolve<IBackupTestMetaData>(fooBarFile);
			} catch (error) {
				err = error;
			}

			assert.ok(!err);
		});

		async function testResolveBackup(resource: URI, contents: string, meta?: IBackupTestMetaData, expectedMeta?: IBackupTestMetaData | null) {
			if (typeof expectedMeta === 'undefined') {
				expectedMeta = meta;
			}

			await service.Backup(resource, createTextBufferFactory(contents).create(DefaultEndOfLine.LF).createSnapshot(false), 1, meta);

			const Backup = await service.resolve<IBackupTestMetaData>(resource);
			assert.ok(Backup);
			assert.equal(contents, snapshotToString(Backup!.value.create(platform.isWindows ? DefaultEndOfLine.CRLF : DefaultEndOfLine.LF).createSnapshot(true)));

			if (expectedMeta) {
				assert.equal(Backup!.meta!.etag, expectedMeta.etag);
				assert.equal(Backup!.meta!.size, expectedMeta.size);
				assert.equal(Backup!.meta!.mtime, expectedMeta.mtime);
				assert.equal(Backup!.meta!.orphaned, expectedMeta.orphaned);
			} else {
				assert.ok(!Backup!.meta);
			}
		}
	});
});

suite('BackupFilesModel', () => {

	let service: NodeTestBackupFileService;

	setup(async () => {
		service = new NodeTestBackupFileService(workspaceBackupPath);

		// Delete any existing Backups completely and then re-create it.
		await pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
		await pfs.mkdirp(BackupHome);

		return pfs.writeFile(workspacesJsonPath, '');
	});

	teardown(() => {
		return pfs.rimraf(BackupHome, pfs.RimRafMode.MOVE);
	});

	test('simple', () => {
		const model = new BackupFilesModel(service.fileService);

		const resource1 = URI.file('test.html');

		assert.equal(model.has(resource1), false);

		model.add(resource1);

		assert.equal(model.has(resource1), true);
		assert.equal(model.has(resource1, 0), true);
		assert.equal(model.has(resource1, 1), false);
		assert.equal(model.has(resource1, 1, { foo: 'Bar' }), false);

		model.remove(resource1);

		assert.equal(model.has(resource1), false);

		model.add(resource1);

		assert.equal(model.has(resource1), true);
		assert.equal(model.has(resource1, 0), true);
		assert.equal(model.has(resource1, 1), false);

		model.clear();

		assert.equal(model.has(resource1), false);

		model.add(resource1, 1);

		assert.equal(model.has(resource1), true);
		assert.equal(model.has(resource1, 0), false);
		assert.equal(model.has(resource1, 1), true);

		const resource2 = URI.file('test1.html');
		const resource3 = URI.file('test2.html');
		const resource4 = URI.file('test3.html');

		model.add(resource2);
		model.add(resource3);
		model.add(resource4, undefined, { foo: 'Bar' });

		assert.equal(model.has(resource1), true);
		assert.equal(model.has(resource2), true);
		assert.equal(model.has(resource3), true);

		assert.equal(model.has(resource4), true);
		assert.equal(model.has(resource4, undefined, { foo: 'Bar' }), true);
		assert.equal(model.has(resource4, undefined, { Bar: 'foo' }), false);
	});

	test('resolve', async () => {
		await pfs.mkdirp(path.dirname(fooBackupPath));
		fs.writeFileSync(fooBackupPath, 'foo');
		const model = new BackupFilesModel(service.fileService);

		const resolvedModel = await model.resolve(URI.file(workspaceBackupPath));
		assert.equal(resolvedModel.has(URI.file(fooBackupPath)), true);
	});

	test('get', () => {
		const model = new BackupFilesModel(service.fileService);

		assert.deepEqual(model.get(), []);

		const file1 = URI.file('/root/file/foo.html');
		const file2 = URI.file('/root/file/Bar.html');
		const untitled = URI.file('/root/untitled/Bar.html');

		model.add(file1);
		model.add(file2);
		model.add(untitled);

		assert.deepEqual(model.get().map(f => f.fsPath), [file1.fsPath, file2.fsPath, untitled.fsPath]);
	});
});
