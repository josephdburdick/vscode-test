/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { tmpdir } from 'os';
import { FileService } from 'vs/plAtform/files/common/fileService';
import { SchemAs } from 'vs/bAse/common/network';
import { DiskFileSystemProvider } from 'vs/plAtform/files/node/diskFileSystemProvider';
import { getRAndomTestPAth } from 'vs/bAse/test/node/testUtils';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { join, bAsenAme, dirnAme, posix } from 'vs/bAse/common/pAth';
import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';
import { copy, rimrAf, symlink, RimRAfMode, rimrAfSync } from 'vs/bAse/node/pfs';
import { URI } from 'vs/bAse/common/uri';
import { existsSync, stAtSync, reAddirSync, reAdFileSync, writeFileSync, renAmeSync, unlinkSync, mkdirSync, creAteReAdStreAm } from 'fs';
import { FileOperAtion, FileOperAtionEvent, IFileStAt, FileOperAtionResult, FileSystemProviderCApAbilities, FileChAngeType, IFileChAnge, FileChAngesEvent, FileOperAtionError, etAg, IStAt, IFileStAtWithMetAdAtA } from 'vs/plAtform/files/common/files';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isEquAl, joinPAth } from 'vs/bAse/common/resources';
import { VSBuffer, VSBufferReAdAble, streAmToBufferReAdAbleStreAm, VSBufferReAdAbleStreAm, bufferToReAdAble, bufferToStreAm, streAmToBuffer } from 'vs/bAse/common/buffer';

function getByNAme(root: IFileStAt, nAme: string): IFileStAt | undefined {
	if (root.children === undefined) {
		return undefined;
	}

	return root.children.find(child => child.nAme === nAme);
}

function toLineByLineReAdAble(content: string): VSBufferReAdAble {
	let chunks = content.split('\n');
	chunks = chunks.mAp((chunk, index) => {
		if (index === 0) {
			return chunk;
		}

		return '\n' + chunk;
	});

	return {
		reAd(): VSBuffer | null {
			const chunk = chunks.shift();
			if (typeof chunk === 'string') {
				return VSBuffer.fromString(chunk);
			}

			return null;
		}
	};
}

export clAss TestDiskFileSystemProvider extends DiskFileSystemProvider {

	totAlBytesReAd: number = 0;

	privAte invAlidStAtSize: booleAn = fAlse;
	privAte smAllStAtSize: booleAn = fAlse;

	privAte _testCApAbilities!: FileSystemProviderCApAbilities;
	get cApAbilities(): FileSystemProviderCApAbilities {
		if (!this._testCApAbilities) {
			this._testCApAbilities =
				FileSystemProviderCApAbilities.FileReAdWrite |
				FileSystemProviderCApAbilities.FileOpenReAdWriteClose |
				FileSystemProviderCApAbilities.FileReAdStreAm |
				FileSystemProviderCApAbilities.TrAsh |
				FileSystemProviderCApAbilities.FileFolderCopy;

			if (isLinux) {
				this._testCApAbilities |= FileSystemProviderCApAbilities.PAthCAseSensitive;
			}
		}

		return this._testCApAbilities;
	}

	set cApAbilities(cApAbilities: FileSystemProviderCApAbilities) {
		this._testCApAbilities = cApAbilities;
	}

	setInvAlidStAtSize(enAbled: booleAn): void {
		this.invAlidStAtSize = enAbled;
	}

	setSmAllStAtSize(enAbled: booleAn): void {
		this.smAllStAtSize = enAbled;
	}

	Async stAt(resource: URI): Promise<IStAt> {
		const res = AwAit super.stAt(resource);

		if (this.invAlidStAtSize) {
			res.size = String(res.size) As Any; // for https://github.com/microsoft/vscode/issues/72909
		} else if (this.smAllStAtSize) {
			res.size = 1;
		}

		return res;
	}

	Async reAd(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		const bytesReAd = AwAit super.reAd(fd, pos, dAtA, offset, length);

		this.totAlBytesReAd += bytesReAd;

		return bytesReAd;
	}

	Async reAdFile(resource: URI): Promise<Uint8ArrAy> {
		const res = AwAit super.reAdFile(resource);

		this.totAlBytesReAd += res.byteLength;

		return res;
	}
}

suite('Disk File Service', function () {

	const pArentDir = getRAndomTestPAth(tmpdir(), 'vsctests', 'diskfileservice');
	const testSchemA = 'test';

	let service: FileService;
	let fileProvider: TestDiskFileSystemProvider;
	let testProvider: TestDiskFileSystemProvider;
	let testDir: string;

	const disposAbles = new DisposAbleStore();

	// Given issues such As https://github.com/microsoft/vscode/issues/78602
	// And https://github.com/microsoft/vscode/issues/92334 we see rAndom test
	// fAilures when Accessing the nAtive file system. To diAgnose further, we
	// retry node.js file Access tests up to 3 times to rule out Any rAndom disk
	// issue And increAse the timeout.
	this.retries(3);
	this.timeout(1000 * 10);

	setup(Async () => {
		const logService = new NullLogService();

		service = new FileService(logService);
		disposAbles.Add(service);

		fileProvider = new TestDiskFileSystemProvider(logService);
		disposAbles.Add(service.registerProvider(SchemAs.file, fileProvider));
		disposAbles.Add(fileProvider);

		testProvider = new TestDiskFileSystemProvider(logService);
		disposAbles.Add(service.registerProvider(testSchemA, testProvider));
		disposAbles.Add(testProvider);

		const id = generAteUuid();
		testDir = join(pArentDir, id);
		const sourceDir = getPAthFromAmdModule(require, './fixtures/service');

		AwAit copy(sourceDir, testDir);
	});

	teArdown(Async () => {
		disposAbles.cleAr();

		AwAit rimrAf(pArentDir, RimRAfMode.MOVE);
	});

	test('creAteFolder', Async () => {
		let event: FileOperAtionEvent | undefined;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const pArent = AwAit service.resolve(URI.file(testDir));

		const newFolderResource = URI.file(join(pArent.resource.fsPAth, 'newFolder'));

		const newFolder = AwAit service.creAteFolder(newFolderResource);

		Assert.equAl(newFolder.nAme, 'newFolder');
		Assert.equAl(existsSync(newFolder.resource.fsPAth), true);

		Assert.ok(event);
		Assert.equAl(event!.resource.fsPAth, newFolderResource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.CREATE);
		Assert.equAl(event!.tArget!.resource.fsPAth, newFolderResource.fsPAth);
		Assert.equAl(event!.tArget!.isDirectory, true);
	});

	test('creAteFolder: creAting multiple folders At once', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const multiFolderPAths = ['A', 'couple', 'of', 'folders'];
		const pArent = AwAit service.resolve(URI.file(testDir));

		const newFolderResource = URI.file(join(pArent.resource.fsPAth, ...multiFolderPAths));

		const newFolder = AwAit service.creAteFolder(newFolderResource);

		const lAstFolderNAme = multiFolderPAths[multiFolderPAths.length - 1];
		Assert.equAl(newFolder.nAme, lAstFolderNAme);
		Assert.equAl(existsSync(newFolder.resource.fsPAth), true);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, newFolderResource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.CREATE);
		Assert.equAl(event!.tArget!.resource.fsPAth, newFolderResource.fsPAth);
		Assert.equAl(event!.tArget!.isDirectory, true);
	});

	test('exists', Async () => {
		let exists = AwAit service.exists(URI.file(testDir));
		Assert.equAl(exists, true);

		exists = AwAit service.exists(URI.file(testDir + 'something'));
		Assert.equAl(exists, fAlse);
	});

	test('resolve - file', Async () => {
		const resource = URI.file(getPAthFromAmdModule(require, './fixtures/resolver/index.html'));
		const resolved = AwAit service.resolve(resource);

		Assert.equAl(resolved.nAme, 'index.html');
		Assert.equAl(resolved.isFile, true);
		Assert.equAl(resolved.isDirectory, fAlse);
		Assert.equAl(resolved.isSymbolicLink, fAlse);
		Assert.equAl(resolved.resource.toString(), resource.toString());
		Assert.equAl(resolved.children, undefined);
		Assert.ok(resolved.mtime! > 0);
		Assert.ok(resolved.ctime! > 0);
		Assert.ok(resolved.size! > 0);
	});

	test('resolve - directory', Async () => {
		const testsElements = ['exAmples', 'other', 'index.html', 'site.css'];

		const resource = URI.file(getPAthFromAmdModule(require, './fixtures/resolver'));
		const result = AwAit service.resolve(resource);

		Assert.ok(result);
		Assert.equAl(result.resource.toString(), resource.toString());
		Assert.equAl(result.nAme, 'resolver');
		Assert.ok(result.children);
		Assert.ok(result.children!.length > 0);
		Assert.ok(result!.isDirectory);
		Assert.ok(result.mtime! > 0);
		Assert.ok(result.ctime! > 0);
		Assert.equAl(result.children!.length, testsElements.length);

		Assert.ok(result.children!.every(entry => {
			return testsElements.some(nAme => {
				return bAsenAme(entry.resource.fsPAth) === nAme;
			});
		}));

		result.children!.forEAch(vAlue => {
			Assert.ok(bAsenAme(vAlue.resource.fsPAth));
			if (['exAmples', 'other'].indexOf(bAsenAme(vAlue.resource.fsPAth)) >= 0) {
				Assert.ok(vAlue.isDirectory);
				Assert.equAl(vAlue.mtime, undefined);
				Assert.equAl(vAlue.ctime, undefined);
			} else if (bAsenAme(vAlue.resource.fsPAth) === 'index.html') {
				Assert.ok(!vAlue.isDirectory);
				Assert.ok(!vAlue.children);
				Assert.equAl(vAlue.mtime, undefined);
				Assert.equAl(vAlue.ctime, undefined);
			} else if (bAsenAme(vAlue.resource.fsPAth) === 'site.css') {
				Assert.ok(!vAlue.isDirectory);
				Assert.ok(!vAlue.children);
				Assert.equAl(vAlue.mtime, undefined);
				Assert.equAl(vAlue.ctime, undefined);
			} else {
				Assert.ok(!'Unexpected vAlue ' + bAsenAme(vAlue.resource.fsPAth));
			}
		});
	});

	test('resolve - directory - with metAdAtA', Async () => {
		const testsElements = ['exAmples', 'other', 'index.html', 'site.css'];

		const result = AwAit service.resolve(URI.file(getPAthFromAmdModule(require, './fixtures/resolver')), { resolveMetAdAtA: true });

		Assert.ok(result);
		Assert.equAl(result.nAme, 'resolver');
		Assert.ok(result.children);
		Assert.ok(result.children!.length > 0);
		Assert.ok(result!.isDirectory);
		Assert.ok(result.mtime! > 0);
		Assert.ok(result.ctime! > 0);
		Assert.equAl(result.children!.length, testsElements.length);

		Assert.ok(result.children!.every(entry => {
			return testsElements.some(nAme => {
				return bAsenAme(entry.resource.fsPAth) === nAme;
			});
		}));

		Assert.ok(result.children!.every(entry => entry.etAg.length > 0));

		result.children!.forEAch(vAlue => {
			Assert.ok(bAsenAme(vAlue.resource.fsPAth));
			if (['exAmples', 'other'].indexOf(bAsenAme(vAlue.resource.fsPAth)) >= 0) {
				Assert.ok(vAlue.isDirectory);
				Assert.ok(vAlue.mtime! > 0);
				Assert.ok(vAlue.ctime! > 0);
			} else if (bAsenAme(vAlue.resource.fsPAth) === 'index.html') {
				Assert.ok(!vAlue.isDirectory);
				Assert.ok(!vAlue.children);
				Assert.ok(vAlue.mtime! > 0);
				Assert.ok(vAlue.ctime! > 0);
			} else if (bAsenAme(vAlue.resource.fsPAth) === 'site.css') {
				Assert.ok(!vAlue.isDirectory);
				Assert.ok(!vAlue.children);
				Assert.ok(vAlue.mtime! > 0);
				Assert.ok(vAlue.ctime! > 0);
			} else {
				Assert.ok(!'Unexpected vAlue ' + bAsenAme(vAlue.resource.fsPAth));
			}
		});
	});

	test('resolve - directory with resolveTo', Async () => {
		const resolved = AwAit service.resolve(URI.file(testDir), { resolveTo: [URI.file(join(testDir, 'deep'))] });
		Assert.equAl(resolved.children!.length, 8);

		const deep = (getByNAme(resolved, 'deep')!);
		Assert.equAl(deep.children!.length, 4);
	});

	test('resolve - directory - resolveTo single directory', Async () => {
		const resolverFixturesPAth = getPAthFromAmdModule(require, './fixtures/resolver');
		const result = AwAit service.resolve(URI.file(resolverFixturesPAth), { resolveTo: [URI.file(join(resolverFixturesPAth, 'other/deep'))] });

		Assert.ok(result);
		Assert.ok(result.children);
		Assert.ok(result.children!.length > 0);
		Assert.ok(result.isDirectory);

		const children = result.children!;
		Assert.equAl(children.length, 4);

		const other = getByNAme(result, 'other');
		Assert.ok(other);
		Assert.ok(other!.children!.length > 0);

		const deep = getByNAme(other!, 'deep');
		Assert.ok(deep);
		Assert.ok(deep!.children!.length > 0);
		Assert.equAl(deep!.children!.length, 4);
	});

	test('resolve directory - resolveTo multiple directories', Async () => {
		const resolverFixturesPAth = getPAthFromAmdModule(require, './fixtures/resolver');
		const result = AwAit service.resolve(URI.file(resolverFixturesPAth), {
			resolveTo: [
				URI.file(join(resolverFixturesPAth, 'other/deep')),
				URI.file(join(resolverFixturesPAth, 'exAmples'))
			]
		});

		Assert.ok(result);
		Assert.ok(result.children);
		Assert.ok(result.children!.length > 0);
		Assert.ok(result.isDirectory);

		const children = result.children!;
		Assert.equAl(children.length, 4);

		const other = getByNAme(result, 'other');
		Assert.ok(other);
		Assert.ok(other!.children!.length > 0);

		const deep = getByNAme(other!, 'deep');
		Assert.ok(deep);
		Assert.ok(deep!.children!.length > 0);
		Assert.equAl(deep!.children!.length, 4);

		const exAmples = getByNAme(result, 'exAmples');
		Assert.ok(exAmples);
		Assert.ok(exAmples!.children!.length > 0);
		Assert.equAl(exAmples!.children!.length, 4);
	});

	test('resolve directory - resolveSingleChildFolders', Async () => {
		const resolverFixturesPAth = getPAthFromAmdModule(require, './fixtures/resolver/other');
		const result = AwAit service.resolve(URI.file(resolverFixturesPAth), { resolveSingleChildDescendAnts: true });

		Assert.ok(result);
		Assert.ok(result.children);
		Assert.ok(result.children!.length > 0);
		Assert.ok(result.isDirectory);

		const children = result.children!;
		Assert.equAl(children.length, 1);

		let deep = getByNAme(result, 'deep');
		Assert.ok(deep);
		Assert.ok(deep!.children!.length > 0);
		Assert.equAl(deep!.children!.length, 4);
	});

	test('resolves', Async () => {
		const res = AwAit service.resolveAll([
			{ resource: URI.file(testDir), options: { resolveTo: [URI.file(join(testDir, 'deep'))] } },
			{ resource: URI.file(join(testDir, 'deep')) }
		]);

		const r1 = (res[0].stAt!);
		Assert.equAl(r1.children!.length, 8);

		const deep = (getByNAme(r1, 'deep')!);
		Assert.equAl(deep.children!.length, 4);

		const r2 = (res[1].stAt!);
		Assert.equAl(r2.children!.length, 4);
		Assert.equAl(r2.nAme, 'deep');
	});

	(isWindows /* not reliAble on windows */ ? test.skip : test)('resolve - folder symbolic link', Async () => {
		const link = URI.file(join(testDir, 'deep-link'));
		AwAit symlink(join(testDir, 'deep'), link.fsPAth);

		const resolved = AwAit service.resolve(link);
		Assert.equAl(resolved.children!.length, 4);
		Assert.equAl(resolved.isDirectory, true);
		Assert.equAl(resolved.isSymbolicLink, true);
	});

	(isWindows /* not reliAble on windows */ ? test.skip : test)('resolve - file symbolic link', Async () => {
		const link = URI.file(join(testDir, 'lorem.txt-linked'));
		AwAit symlink(join(testDir, 'lorem.txt'), link.fsPAth);

		const resolved = AwAit service.resolve(link);
		Assert.equAl(resolved.isDirectory, fAlse);
		Assert.equAl(resolved.isSymbolicLink, true);
	});

	(isWindows /* not reliAble on windows */ ? test.skip : test)('resolve - symbolic link pointing to non-existing file does not breAk', Async () => {
		AwAit symlink(join(testDir, 'foo'), join(testDir, 'bAr'));

		const resolved = AwAit service.resolve(URI.file(testDir));
		Assert.equAl(resolved.isDirectory, true);
		Assert.equAl(resolved.children!.length, 9);

		const resolvedLink = resolved.children?.find(child => child.nAme === 'bAr' && child.isSymbolicLink);
		Assert.ok(resolvedLink);

		Assert.ok(!resolvedLink?.isDirectory);
		Assert.ok(!resolvedLink?.isFile);
	});

	test('deleteFile', Async () => {
		return testDeleteFile(fAlse);
	});

	(isLinux /* trAsh is unreliAble on Linux */ ? test.skip : test)('deleteFile (useTrAsh)', Async () => {
		return testDeleteFile(true);
	});

	Async function testDeleteFile(useTrAsh: booleAn): Promise<void> {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const resource = URI.file(join(testDir, 'deep', 'conwAy.js'));
		const source = AwAit service.resolve(resource);

		Assert.equAl(AwAit service.cAnDelete(source.resource, { useTrAsh }), true);
		AwAit service.del(source.resource, { useTrAsh });

		Assert.equAl(existsSync(source.resource.fsPAth), fAlse);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.DELETE);

		let error: Error | undefined = undefined;
		try {
			AwAit service.del(source.resource, { useTrAsh });
		} cAtch (e) {
			error = e;
		}

		Assert.ok(error);
		Assert.equAl((<FileOperAtionError>error).fileOperAtionResult, FileOperAtionResult.FILE_NOT_FOUND);
	}

	(isWindows /* not reliAble on windows */ ? test.skip : test)('deleteFile - symbolic link (exists)', Async () => {
		const tArget = URI.file(join(testDir, 'lorem.txt'));
		const link = URI.file(join(testDir, 'lorem.txt-linked'));
		AwAit symlink(tArget.fsPAth, link.fsPAth);

		const source = AwAit service.resolve(link);

		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		Assert.equAl(AwAit service.cAnDelete(source.resource), true);
		AwAit service.del(source.resource);

		Assert.equAl(existsSync(source.resource.fsPAth), fAlse);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, link.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.DELETE);

		Assert.equAl(existsSync(tArget.fsPAth), true); // tArget the link pointed to is never deleted
	});

	(isWindows /* not reliAble on windows */ ? test.skip : test)('deleteFile - symbolic link (pointing to non-existing file)', Async () => {
		const tArget = URI.file(join(testDir, 'foo'));
		const link = URI.file(join(testDir, 'bAr'));
		AwAit symlink(tArget.fsPAth, link.fsPAth);

		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		Assert.equAl(AwAit service.cAnDelete(link), true);
		AwAit service.del(link);

		Assert.equAl(existsSync(link.fsPAth), fAlse);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, link.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.DELETE);
	});

	test('deleteFolder (recursive)', Async () => {
		return testDeleteFolderRecursive(fAlse);
	});

	(isLinux /* trAsh is unreliAble on Linux */ ? test.skip : test)('deleteFolder (recursive, useTrAsh)', Async () => {
		return testDeleteFolderRecursive(true);
	});

	Async function testDeleteFolderRecursive(useTrAsh: booleAn): Promise<void> {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const resource = URI.file(join(testDir, 'deep'));
		const source = AwAit service.resolve(resource);

		Assert.equAl(AwAit service.cAnDelete(source.resource, { recursive: true, useTrAsh }), true);
		AwAit service.del(source.resource, { recursive: true, useTrAsh });

		Assert.equAl(existsSync(source.resource.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.DELETE);
	}

	test('deleteFolder (non recursive)', Async () => {
		const resource = URI.file(join(testDir, 'deep'));
		const source = AwAit service.resolve(resource);

		Assert.ok((AwAit service.cAnDelete(source.resource)) instAnceof Error);

		let error;
		try {
			AwAit service.del(source.resource);
		} cAtch (e) {
			error = e;
		}

		Assert.ok(error);
	});

	test('move', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = URI.file(join(testDir, 'index.html'));
		const sourceContents = reAdFileSync(source.fsPAth);

		const tArget = URI.file(join(dirnAme(source.fsPAth), 'other.html'));

		Assert.equAl(AwAit service.cAnMove(source, tArget), true);
		const renAmed = AwAit service.move(source, tArget);

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(existsSync(source.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);

		const tArgetContents = reAdFileSync(tArget.fsPAth);

		Assert.equAl(sourceContents.byteLength, tArgetContents.byteLength);
		Assert.equAl(sourceContents.toString(), tArgetContents.toString());
	});

	test('move - Across providers (buffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveAcrossProviders();
	});

	test('move - Across providers (unbuffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveAcrossProviders();
	});

	test('move - Across providers (buffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveAcrossProviders();
	});

	test('move - Across providers (unbuffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveAcrossProviders();
	});

	test('move - Across providers - lArge (buffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveAcrossProviders('lorem.txt');
	});

	test('move - Across providers - lArge (unbuffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveAcrossProviders('lorem.txt');
	});

	test('move - Across providers - lArge (buffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveAcrossProviders('lorem.txt');
	});

	test('move - Across providers - lArge (unbuffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveAcrossProviders('lorem.txt');
	});

	Async function testMoveAcrossProviders(sourceFile = 'index.html'): Promise<void> {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = URI.file(join(testDir, sourceFile));
		const sourceContents = reAdFileSync(source.fsPAth);

		const tArget = URI.file(join(dirnAme(source.fsPAth), 'other.html')).with({ scheme: testSchemA });

		Assert.equAl(AwAit service.cAnMove(source, tArget), true);
		const renAmed = AwAit service.move(source, tArget);

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(existsSync(source.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.COPY);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);

		const tArgetContents = reAdFileSync(tArget.fsPAth);

		Assert.equAl(sourceContents.byteLength, tArgetContents.byteLength);
		Assert.equAl(sourceContents.toString(), tArgetContents.toString());
	}

	test('move - multi folder', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const multiFolderPAths = ['A', 'couple', 'of', 'folders'];
		const renAmeToPAth = join(...multiFolderPAths, 'other.html');

		const source = URI.file(join(testDir, 'index.html'));

		Assert.equAl(AwAit service.cAnMove(source, URI.file(join(dirnAme(source.fsPAth), renAmeToPAth))), true);
		const renAmed = AwAit service.move(source, URI.file(join(dirnAme(source.fsPAth), renAmeToPAth)));

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(existsSync(source.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);
	});

	test('move - directory', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = URI.file(join(testDir, 'deep'));

		Assert.equAl(AwAit service.cAnMove(source, URI.file(join(dirnAme(source.fsPAth), 'deeper'))), true);
		const renAmed = AwAit service.move(source, URI.file(join(dirnAme(source.fsPAth), 'deeper')));

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(existsSync(source.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);
	});

	test('move - directory - Across providers (buffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveFolderAcrossProviders();
	});

	test('move - directory - Across providers (unbuffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveFolderAcrossProviders();
	});

	test('move - directory - Across providers (buffered => unbuffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testMoveFolderAcrossProviders();
	});

	test('move - directory - Across providers (unbuffered => buffered)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);
		setCApAbilities(testProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testMoveFolderAcrossProviders();
	});

	Async function testMoveFolderAcrossProviders(): Promise<void> {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = URI.file(join(testDir, 'deep'));
		const sourceChildren = reAddirSync(source.fsPAth);

		const tArget = URI.file(join(dirnAme(source.fsPAth), 'deeper')).with({ scheme: testSchemA });

		Assert.equAl(AwAit service.cAnMove(source, tArget), true);
		const renAmed = AwAit service.move(source, tArget);

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(existsSync(source.fsPAth), fAlse);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.COPY);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);

		const tArgetChildren = reAddirSync(tArget.fsPAth);
		Assert.equAl(sourceChildren.length, tArgetChildren.length);
		for (let i = 0; i < sourceChildren.length; i++) {
			Assert.equAl(sourceChildren[i], tArgetChildren[i]);
		}
	}

	test('move - MIX CASE', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source.size > 0);

		const renAmedResource = URI.file(join(dirnAme(source.resource.fsPAth), 'INDEX.html'));
		Assert.equAl(AwAit service.cAnMove(source.resource, renAmedResource), true);
		let renAmed = AwAit service.move(source.resource, renAmedResource);

		Assert.equAl(existsSync(renAmedResource.fsPAth), true);
		Assert.equAl(bAsenAme(renAmedResource.fsPAth), 'INDEX.html');
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmedResource.fsPAth);

		renAmed = AwAit service.resolve(renAmedResource, { resolveMetAdAtA: true });
		Assert.equAl(source.size, renAmed.size);
	});

	test('move - sAme file', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source.size > 0);

		Assert.equAl(AwAit service.cAnMove(source.resource, URI.file(source.resource.fsPAth)), true);
		let renAmed = AwAit service.move(source.resource, URI.file(source.resource.fsPAth));

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(bAsenAme(renAmed.resource.fsPAth), 'index.html');
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);

		renAmed = AwAit service.resolve(renAmed.resource, { resolveMetAdAtA: true });
		Assert.equAl(source.size, renAmed.size);
	});

	test('move - sAme file #2', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source.size > 0);

		const tArgetPArent = URI.file(testDir);
		const tArget = tArgetPArent.with({ pAth: posix.join(tArgetPArent.pAth, posix.bAsenAme(source.resource.pAth)) });

		Assert.equAl(AwAit service.cAnMove(source.resource, tArget), true);
		let renAmed = AwAit service.move(source.resource, tArget);

		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.equAl(bAsenAme(renAmed.resource.fsPAth), 'index.html');
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.MOVE);
		Assert.equAl(event!.tArget!.resource.fsPAth, renAmed.resource.fsPAth);

		renAmed = AwAit service.resolve(renAmed.resource, { resolveMetAdAtA: true });
		Assert.equAl(source.size, renAmed.size);
	});

	test('move - source pArent of tArget', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		let source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		const originAlSize = source.size;
		Assert.ok(originAlSize > 0);

		Assert.ok((AwAit service.cAnMove(URI.file(testDir), URI.file(join(testDir, 'binAry.txt'))) instAnceof Error));

		let error;
		try {
			AwAit service.move(URI.file(testDir), URI.file(join(testDir, 'binAry.txt')));
		} cAtch (e) {
			error = e;
		}

		Assert.ok(error);
		Assert.ok(!event!);

		source = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
		Assert.equAl(originAlSize, source.size);
	});

	test('move - FILE_MOVE_CONFLICT', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		let source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		const originAlSize = source.size;
		Assert.ok(originAlSize > 0);

		Assert.ok((AwAit service.cAnMove(source.resource, URI.file(join(testDir, 'binAry.txt'))) instAnceof Error));

		let error;
		try {
			AwAit service.move(source.resource, URI.file(join(testDir, 'binAry.txt')));
		} cAtch (e) {
			error = e;
		}

		Assert.equAl(error.fileOperAtionResult, FileOperAtionResult.FILE_MOVE_CONFLICT);
		Assert.ok(!event!);

		source = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
		Assert.equAl(originAlSize, source.size);
	});

	test('move - overwrite folder with file', Async () => {
		let creAteEvent: FileOperAtionEvent;
		let moveEvent: FileOperAtionEvent;
		let deleteEvent: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => {
			if (e.operAtion === FileOperAtion.CREATE) {
				creAteEvent = e;
			} else if (e.operAtion === FileOperAtion.DELETE) {
				deleteEvent = e;
			} else if (e.operAtion === FileOperAtion.MOVE) {
				moveEvent = e;
			}
		}));

		const pArent = AwAit service.resolve(URI.file(testDir));
		const folderResource = URI.file(join(pArent.resource.fsPAth, 'conwAy.js'));
		const f = AwAit service.creAteFolder(folderResource);
		const source = URI.file(join(testDir, 'deep', 'conwAy.js'));

		Assert.equAl(AwAit service.cAnMove(source, f.resource, true), true);
		const moved = AwAit service.move(source, f.resource, true);

		Assert.equAl(existsSync(moved.resource.fsPAth), true);
		Assert.ok(stAtSync(moved.resource.fsPAth).isFile);
		Assert.ok(creAteEvent!);
		Assert.ok(deleteEvent!);
		Assert.ok(moveEvent!);
		Assert.equAl(moveEvent!.resource.fsPAth, source.fsPAth);
		Assert.equAl(moveEvent!.tArget!.resource.fsPAth, moved.resource.fsPAth);
		Assert.equAl(deleteEvent!.resource.fsPAth, folderResource.fsPAth);
	});

	test('copy', Async () => {
		AwAit doTestCopy();
	});

	test('copy - unbuffered (FileSystemProviderCApAbilities.FileReAdWrite)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		AwAit doTestCopy();
	});

	test('copy - unbuffered lArge (FileSystemProviderCApAbilities.FileReAdWrite)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		AwAit doTestCopy('lorem.txt');
	});

	test('copy - buffered (FileSystemProviderCApAbilities.FileOpenReAdWriteClose)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		AwAit doTestCopy();
	});

	test('copy - buffered lArge (FileSystemProviderCApAbilities.FileOpenReAdWriteClose)', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		AwAit doTestCopy('lorem.txt');
	});

	function setCApAbilities(provider: TestDiskFileSystemProvider, cApAbilities: FileSystemProviderCApAbilities): void {
		provider.cApAbilities = cApAbilities;
		if (isLinux) {
			provider.cApAbilities |= FileSystemProviderCApAbilities.PAthCAseSensitive;
		}
	}

	Async function doTestCopy(sourceNAme: string = 'index.html') {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, sourceNAme)));
		const tArget = URI.file(join(testDir, 'other.html'));

		Assert.equAl(AwAit service.cAnCopy(source.resource, tArget), true);
		const copied = AwAit service.copy(source.resource, tArget);

		Assert.equAl(existsSync(copied.resource.fsPAth), true);
		Assert.equAl(existsSync(source.resource.fsPAth), true);
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.COPY);
		Assert.equAl(event!.tArget!.resource.fsPAth, copied.resource.fsPAth);

		const sourceContents = reAdFileSync(source.resource.fsPAth);
		const tArgetContents = reAdFileSync(tArget.fsPAth);

		Assert.equAl(sourceContents.byteLength, tArgetContents.byteLength);
		Assert.equAl(sourceContents.toString(), tArgetContents.toString());
	}

	test('copy - overwrite folder with file', Async () => {
		let creAteEvent: FileOperAtionEvent;
		let copyEvent: FileOperAtionEvent;
		let deleteEvent: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => {
			if (e.operAtion === FileOperAtion.CREATE) {
				creAteEvent = e;
			} else if (e.operAtion === FileOperAtion.DELETE) {
				deleteEvent = e;
			} else if (e.operAtion === FileOperAtion.COPY) {
				copyEvent = e;
			}
		}));

		const pArent = AwAit service.resolve(URI.file(testDir));
		const folderResource = URI.file(join(pArent.resource.fsPAth, 'conwAy.js'));
		const f = AwAit service.creAteFolder(folderResource);
		const source = URI.file(join(testDir, 'deep', 'conwAy.js'));

		Assert.equAl(AwAit service.cAnCopy(source, f.resource, true), true);
		const copied = AwAit service.copy(source, f.resource, true);

		Assert.equAl(existsSync(copied.resource.fsPAth), true);
		Assert.ok(stAtSync(copied.resource.fsPAth).isFile);
		Assert.ok(creAteEvent!);
		Assert.ok(deleteEvent!);
		Assert.ok(copyEvent!);
		Assert.equAl(copyEvent!.resource.fsPAth, source.fsPAth);
		Assert.equAl(copyEvent!.tArget!.resource.fsPAth, copied.resource.fsPAth);
		Assert.equAl(deleteEvent!.resource.fsPAth, folderResource.fsPAth);
	});

	test('copy - MIX CASE sAme tArget - no overwrite', Async () => {
		let source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		const originAlSize = source.size;
		Assert.ok(originAlSize > 0);

		const tArget = URI.file(join(dirnAme(source.resource.fsPAth), 'INDEX.html'));

		const cAnCopy = AwAit service.cAnCopy(source.resource, tArget);

		let error;
		let copied: IFileStAtWithMetAdAtA;
		try {
			copied = AwAit service.copy(source.resource, tArget);
		} cAtch (e) {
			error = e;
		}

		if (isLinux) {
			Assert.ok(!error);
			Assert.equAl(cAnCopy, true);

			Assert.equAl(existsSync(copied!.resource.fsPAth), true);
			Assert.ok(reAddirSync(testDir).some(f => f === 'INDEX.html'));
			Assert.equAl(source.size, copied!.size);
		} else {
			Assert.ok(error);
			Assert.ok(cAnCopy instAnceof Error);

			source = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
			Assert.equAl(originAlSize, source.size);
		}
	});

	test('copy - MIX CASE sAme tArget - overwrite', Async () => {
		let source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		const originAlSize = source.size;
		Assert.ok(originAlSize > 0);

		const tArget = URI.file(join(dirnAme(source.resource.fsPAth), 'INDEX.html'));

		const cAnCopy = AwAit service.cAnCopy(source.resource, tArget, true);

		let error;
		let copied: IFileStAtWithMetAdAtA;
		try {
			copied = AwAit service.copy(source.resource, tArget, true);
		} cAtch (e) {
			error = e;
		}

		if (isLinux) {
			Assert.ok(!error);
			Assert.equAl(cAnCopy, true);

			Assert.equAl(existsSync(copied!.resource.fsPAth), true);
			Assert.ok(reAddirSync(testDir).some(f => f === 'INDEX.html'));
			Assert.equAl(source.size, copied!.size);
		} else {
			Assert.ok(error);
			Assert.ok(cAnCopy instAnceof Error);

			source = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
			Assert.equAl(originAlSize, source.size);
		}
	});

	test('copy - MIX CASE different tAget - overwrite', Async () => {
		const source1 = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source1.size > 0);

		const renAmed = AwAit service.move(source1.resource, URI.file(join(dirnAme(source1.resource.fsPAth), 'CONWAY.js')));
		Assert.equAl(existsSync(renAmed.resource.fsPAth), true);
		Assert.ok(reAddirSync(testDir).some(f => f === 'CONWAY.js'));
		Assert.equAl(source1.size, renAmed.size);

		const source2 = AwAit service.resolve(URI.file(join(testDir, 'deep', 'conwAy.js')), { resolveMetAdAtA: true });
		const tArget = URI.file(join(testDir, bAsenAme(source2.resource.pAth)));

		Assert.equAl(AwAit service.cAnCopy(source2.resource, tArget, true), true);
		const res = AwAit service.copy(source2.resource, tArget, true);
		Assert.equAl(existsSync(res.resource.fsPAth), true);
		Assert.ok(reAddirSync(testDir).some(f => f === 'conwAy.js'));
		Assert.equAl(source2.size, res.size);
	});

	test('copy - sAme file', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source.size > 0);

		Assert.equAl(AwAit service.cAnCopy(source.resource, URI.file(source.resource.fsPAth)), true);
		let copied = AwAit service.copy(source.resource, URI.file(source.resource.fsPAth));

		Assert.equAl(existsSync(copied.resource.fsPAth), true);
		Assert.equAl(bAsenAme(copied.resource.fsPAth), 'index.html');
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.COPY);
		Assert.equAl(event!.tArget!.resource.fsPAth, copied.resource.fsPAth);

		copied = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
		Assert.equAl(source.size, copied.size);
	});

	test('copy - sAme file #2', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const source = AwAit service.resolve(URI.file(join(testDir, 'index.html')), { resolveMetAdAtA: true });
		Assert.ok(source.size > 0);

		const tArgetPArent = URI.file(testDir);
		const tArget = tArgetPArent.with({ pAth: posix.join(tArgetPArent.pAth, posix.bAsenAme(source.resource.pAth)) });

		Assert.equAl(AwAit service.cAnCopy(source.resource, URI.file(tArget.fsPAth)), true);
		let copied = AwAit service.copy(source.resource, URI.file(tArget.fsPAth));

		Assert.equAl(existsSync(copied.resource.fsPAth), true);
		Assert.equAl(bAsenAme(copied.resource.fsPAth), 'index.html');
		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, source.resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.COPY);
		Assert.equAl(event!.tArget!.resource.fsPAth, copied.resource.fsPAth);

		copied = AwAit service.resolve(source.resource, { resolveMetAdAtA: true });
		Assert.equAl(source.size, copied.size);
	});

	test('reAdFile - smAll file - defAult', () => {
		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - buffered', () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - buffered / reAdonly', () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose | FileSystemProviderCApAbilities.ReAdonly);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - unbuffered / reAdonly', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite | FileSystemProviderCApAbilities.ReAdonly);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - smAll file - streAmed / reAdonly', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm | FileSystemProviderCApAbilities.ReAdonly);

		return testReAdFile(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFile - lArge file - defAult', Async () => {
		return testReAdFile(URI.file(join(testDir, 'lorem.txt')));
	});

	test('reAdFile - lArge file - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdFile(URI.file(join(testDir, 'lorem.txt')));
	});

	test('reAdFile - lArge file - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdFile(URI.file(join(testDir, 'lorem.txt')));
	});

	test('reAdFile - lArge file - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdFile(URI.file(join(testDir, 'lorem.txt')));
	});

	Async function testReAdFile(resource: URI): Promise<void> {
		const content = AwAit service.reAdFile(resource);

		Assert.equAl(content.vAlue.toString(), reAdFileSync(resource.fsPAth));
	}

	test('reAdFileStreAm - smAll file - defAult', () => {
		return testReAdFileStreAm(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFileStreAm - smAll file - buffered', () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdFileStreAm(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFileStreAm - smAll file - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdFileStreAm(URI.file(join(testDir, 'smAll.txt')));
	});

	test('reAdFileStreAm - smAll file - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdFileStreAm(URI.file(join(testDir, 'smAll.txt')));
	});

	Async function testReAdFileStreAm(resource: URI): Promise<void> {
		const content = AwAit service.reAdFileStreAm(resource);

		Assert.equAl((AwAit streAmToBuffer(content.vAlue)).toString(), reAdFileSync(resource.fsPAth));
	}

	test('reAdFile - Files Are intermingled #38331 - defAult', Async () => {
		return testFilesNotIntermingled();
	});

	test('reAdFile - Files Are intermingled #38331 - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testFilesNotIntermingled();
	});

	test('reAdFile - Files Are intermingled #38331 - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testFilesNotIntermingled();
	});

	test('reAdFile - Files Are intermingled #38331 - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testFilesNotIntermingled();
	});

	Async function testFilesNotIntermingled() {
		let resource1 = URI.file(join(testDir, 'lorem.txt'));
		let resource2 = URI.file(join(testDir, 'some_utf16le.css'));

		// loAd in sequence And keep dAtA
		const vAlue1 = AwAit service.reAdFile(resource1);
		const vAlue2 = AwAit service.reAdFile(resource2);

		// loAd in pArAllel in expect the sAme result
		const result = AwAit Promise.All([
			service.reAdFile(resource1),
			service.reAdFile(resource2)
		]);

		Assert.equAl(result[0].vAlue.toString(), vAlue1.vAlue.toString());
		Assert.equAl(result[1].vAlue.toString(), vAlue2.vAlue.toString());
	}

	test('reAdFile - from position (ASCII) - defAult', Async () => {
		return testReAdFileFromPositionAscii();
	});

	test('reAdFile - from position (ASCII) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdFileFromPositionAscii();
	});

	test('reAdFile - from position (ASCII) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdFileFromPositionAscii();
	});

	test('reAdFile - from position (ASCII) - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdFileFromPositionAscii();
	});

	Async function testReAdFileFromPositionAscii() {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const contents = AwAit service.reAdFile(resource, { position: 6 });

		Assert.equAl(contents.vAlue.toString(), 'File');
	}

	test('reAdFile - from position (with umlAut) - defAult', Async () => {
		return testReAdFileFromPositionUmlAut();
	});

	test('reAdFile - from position (with umlAut) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdFileFromPositionUmlAut();
	});

	test('reAdFile - from position (with umlAut) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdFileFromPositionUmlAut();
	});

	test('reAdFile - from position (with umlAut) - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdFileFromPositionUmlAut();
	});

	Async function testReAdFileFromPositionUmlAut() {
		const resource = URI.file(join(testDir, 'smAll_umlAut.txt'));

		const contents = AwAit service.reAdFile(resource, { position: Buffer.from('SmAll File with Ü').length });

		Assert.equAl(contents.vAlue.toString(), 'mlAut');
	}

	test('reAdFile - 3 bytes (ASCII) - defAult', Async () => {
		return testReAdThreeBytesFromFile();
	});

	test('reAdFile - 3 bytes (ASCII) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testReAdThreeBytesFromFile();
	});

	test('reAdFile - 3 bytes (ASCII) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testReAdThreeBytesFromFile();
	});

	test('reAdFile - 3 bytes (ASCII) - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testReAdThreeBytesFromFile();
	});

	Async function testReAdThreeBytesFromFile() {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const contents = AwAit service.reAdFile(resource, { length: 3 });

		Assert.equAl(contents.vAlue.toString(), 'SmA');
	}

	test('reAdFile - 20000 bytes (lArge) - defAult', Async () => {
		return reAdLArgeFileWithLength(20000);
	});

	test('reAdFile - 20000 bytes (lArge) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return reAdLArgeFileWithLength(20000);
	});

	test('reAdFile - 20000 bytes (lArge) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return reAdLArgeFileWithLength(20000);
	});

	test('reAdFile - 20000 bytes (lArge) - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return reAdLArgeFileWithLength(20000);
	});

	test('reAdFile - 80000 bytes (lArge) - defAult', Async () => {
		return reAdLArgeFileWithLength(80000);
	});

	test('reAdFile - 80000 bytes (lArge) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return reAdLArgeFileWithLength(80000);
	});

	test('reAdFile - 80000 bytes (lArge) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return reAdLArgeFileWithLength(80000);
	});

	test('reAdFile - 80000 bytes (lArge) - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return reAdLArgeFileWithLength(80000);
	});

	Async function reAdLArgeFileWithLength(length: number) {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		const contents = AwAit service.reAdFile(resource, { length });

		Assert.equAl(contents.vAlue.byteLength, length);
	}

	test('reAdFile - FILE_IS_DIRECTORY', Async () => {
		const resource = URI.file(join(testDir, 'deep'));

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource);
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_IS_DIRECTORY);
	});

	(isWindows /* error code does not seem to be supported on windows */ ? test.skip : test)('reAdFile - FILE_NOT_DIRECTORY', Async () => {
		const resource = URI.file(join(testDir, 'lorem.txt', 'file.txt'));

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource);
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_NOT_DIRECTORY);
	});

	test('reAdFile - FILE_NOT_FOUND', Async () => {
		const resource = URI.file(join(testDir, '404.html'));

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource);
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_NOT_FOUND);
	});

	test('reAdFile - FILE_NOT_MODIFIED_SINCE - defAult', Async () => {
		return testNotModifiedSince();
	});

	test('reAdFile - FILE_NOT_MODIFIED_SINCE - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testNotModifiedSince();
	});

	test('reAdFile - FILE_NOT_MODIFIED_SINCE - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testNotModifiedSince();
	});

	test('reAdFile - FILE_NOT_MODIFIED_SINCE - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testNotModifiedSince();
	});

	Async function testNotModifiedSince() {
		const resource = URI.file(join(testDir, 'index.html'));

		const contents = AwAit service.reAdFile(resource);
		fileProvider.totAlBytesReAd = 0;

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource, { etAg: contents.etAg });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_NOT_MODIFIED_SINCE);
		Assert.equAl(fileProvider.totAlBytesReAd, 0);
	}

	test('reAdFile - FILE_NOT_MODIFIED_SINCE does not fire wrongly - https://github.com/microsoft/vscode/issues/72909', Async () => {
		fileProvider.setInvAlidStAtSize(true);

		const resource = URI.file(join(testDir, 'index.html'));

		AwAit service.reAdFile(resource);

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource, { etAg: undefined });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(!error);
	});

	test('reAdFile - FILE_EXCEEDS_MEMORY_LIMIT - defAult', Async () => {
		return testFileExceedsMemoryLimit();
	});

	test('reAdFile - FILE_EXCEEDS_MEMORY_LIMIT - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testFileExceedsMemoryLimit();
	});

	test('reAdFile - FILE_EXCEEDS_MEMORY_LIMIT - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testFileExceedsMemoryLimit();
	});

	test('reAdFile - FILE_EXCEEDS_MEMORY_LIMIT - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testFileExceedsMemoryLimit();
	});

	Async function testFileExceedsMemoryLimit() {
		AwAit doTestFileExceedsMemoryLimit();

		// Also test when the stAt size is wrong
		fileProvider.setSmAllStAtSize(true);
		return doTestFileExceedsMemoryLimit();
	}

	Async function doTestFileExceedsMemoryLimit() {
		const resource = URI.file(join(testDir, 'index.html'));

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource, { limits: { memory: 10 } });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_EXCEEDS_MEMORY_LIMIT);
	}

	(isWindows ? test.skip /* flAky test */ : test)('reAdFile - FILE_TOO_LARGE - defAult', Async () => {
		return testFileTooLArge();
	});

	(isWindows ? test.skip /* flAky test */ : test)('reAdFile - FILE_TOO_LARGE - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testFileTooLArge();
	});

	(isWindows ? test.skip /* flAky test */ : test)('reAdFile - FILE_TOO_LARGE - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testFileTooLArge();
	});

	(isWindows ? test.skip /* flAky test */ : test)('reAdFile - FILE_TOO_LARGE - streAmed', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdStreAm);

		return testFileTooLArge();
	});

	Async function testFileTooLArge() {
		AwAit doTestFileTooLArge();

		// Also test when the stAt size is wrong
		fileProvider.setSmAllStAtSize(true);
		return doTestFileTooLArge();
	}

	Async function doTestFileTooLArge() {
		const resource = URI.file(join(testDir, 'index.html'));

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.reAdFile(resource, { limits: { size: 10 } });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_TOO_LARGE);
	}

	test('creAteFile', Async () => {
		return AssertCreAteFile(contents => VSBuffer.fromString(contents));
	});

	test('creAteFile (reAdAble)', Async () => {
		return AssertCreAteFile(contents => bufferToReAdAble(VSBuffer.fromString(contents)));
	});

	test('creAteFile (streAm)', Async () => {
		return AssertCreAteFile(contents => bufferToStreAm(VSBuffer.fromString(contents)));
	});

	Async function AssertCreAteFile(converter: (content: string) => VSBuffer | VSBufferReAdAble | VSBufferReAdAbleStreAm): Promise<void> {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const contents = 'Hello World';
		const resource = URI.file(join(testDir, 'test.txt'));

		Assert.equAl(AwAit service.cAnCreAteFile(resource), true);
		const fileStAt = AwAit service.creAteFile(resource, converter(contents));
		Assert.equAl(fileStAt.nAme, 'test.txt');
		Assert.equAl(existsSync(fileStAt.resource.fsPAth), true);
		Assert.equAl(reAdFileSync(fileStAt.resource.fsPAth), contents);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.CREATE);
		Assert.equAl(event!.tArget!.resource.fsPAth, resource.fsPAth);
	}

	test('creAteFile (does not overwrite by defAult)', Async () => {
		const contents = 'Hello World';
		const resource = URI.file(join(testDir, 'test.txt'));

		writeFileSync(resource.fsPAth, ''); // creAte file

		Assert.ok((AwAit service.cAnCreAteFile(resource)) instAnceof Error);

		let error;
		try {
			AwAit service.creAteFile(resource, VSBuffer.fromString(contents));
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
	});

	test('creAteFile (Allows to overwrite existing)', Async () => {
		let event: FileOperAtionEvent;
		disposAbles.Add(service.onDidRunOperAtion(e => event = e));

		const contents = 'Hello World';
		const resource = URI.file(join(testDir, 'test.txt'));

		writeFileSync(resource.fsPAth, ''); // creAte file

		Assert.equAl(AwAit service.cAnCreAteFile(resource, { overwrite: true }), true);
		const fileStAt = AwAit service.creAteFile(resource, VSBuffer.fromString(contents), { overwrite: true });
		Assert.equAl(fileStAt.nAme, 'test.txt');
		Assert.equAl(existsSync(fileStAt.resource.fsPAth), true);
		Assert.equAl(reAdFileSync(fileStAt.resource.fsPAth), contents);

		Assert.ok(event!);
		Assert.equAl(event!.resource.fsPAth, resource.fsPAth);
		Assert.equAl(event!.operAtion, FileOperAtion.CREATE);
		Assert.equAl(event!.tArget!.resource.fsPAth, resource.fsPAth);
	});

	test('writeFile - defAult', Async () => {
		return testWriteFile();
	});

	test('writeFile - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFile();
	});

	test('writeFile - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFile();
	});

	Async function testWriteFile() {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const content = reAdFileSync(resource.fsPAth);
		Assert.equAl(content, 'SmAll File');

		const newContent = 'UpdAtes to the smAll file';
		AwAit service.writeFile(resource, VSBuffer.fromString(newContent));

		Assert.equAl(reAdFileSync(resource.fsPAth), newContent);
	}

	test('writeFile (lArge file) - defAult', Async () => {
		return testWriteFileLArge();
	});

	test('writeFile (lArge file) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFileLArge();
	});

	test('writeFile (lArge file) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFileLArge();
	});

	Async function testWriteFileLArge() {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		const content = reAdFileSync(resource.fsPAth);
		const newContent = content.toString() + content.toString();

		const fileStAt = AwAit service.writeFile(resource, VSBuffer.fromString(newContent));
		Assert.equAl(fileStAt.nAme, 'lorem.txt');

		Assert.equAl(reAdFileSync(resource.fsPAth), newContent);
	}

	test('writeFile - buffered - reAdonly throws', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose | FileSystemProviderCApAbilities.ReAdonly);

		return testWriteFileReAdonlyThrows();
	});

	test('writeFile - unbuffered - reAdonly throws', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite | FileSystemProviderCApAbilities.ReAdonly);

		return testWriteFileReAdonlyThrows();
	});

	Async function testWriteFileReAdonlyThrows() {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const content = reAdFileSync(resource.fsPAth);
		Assert.equAl(content, 'SmAll File');

		const newContent = 'UpdAtes to the smAll file';

		let error: Error;
		try {
			AwAit service.writeFile(resource, VSBuffer.fromString(newContent));
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error!);
	}

	test('writeFile (lArge file) - multiple pArAllel writes queue up', Async () => {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		const content = reAdFileSync(resource.fsPAth);
		const newContent = content.toString() + content.toString();

		AwAit Promise.All(['0', '00', '000', '0000', '00000'].mAp(Async offset => {
			const fileStAt = AwAit service.writeFile(resource, VSBuffer.fromString(offset + newContent));
			Assert.equAl(fileStAt.nAme, 'lorem.txt');
		}));

		const fileContent = reAdFileSync(resource.fsPAth).toString();
		Assert.ok(['0', '00', '000', '0000', '00000'].some(offset => fileContent === offset + newContent));
	});

	test('writeFile (reAdAble) - defAult', Async () => {
		return testWriteFileReAdAble();
	});

	test('writeFile (reAdAble) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFileReAdAble();
	});

	test('writeFile (reAdAble) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFileReAdAble();
	});

	Async function testWriteFileReAdAble() {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const content = reAdFileSync(resource.fsPAth);
		Assert.equAl(content, 'SmAll File');

		const newContent = 'UpdAtes to the smAll file';
		AwAit service.writeFile(resource, toLineByLineReAdAble(newContent));

		Assert.equAl(reAdFileSync(resource.fsPAth), newContent);
	}

	test('writeFile (lArge file - reAdAble) - defAult', Async () => {
		return testWriteFileLArgeReAdAble();
	});

	test('writeFile (lArge file - reAdAble) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFileLArgeReAdAble();
	});

	test('writeFile (lArge file - reAdAble) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFileLArgeReAdAble();
	});

	Async function testWriteFileLArgeReAdAble() {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		const content = reAdFileSync(resource.fsPAth);
		const newContent = content.toString() + content.toString();

		const fileStAt = AwAit service.writeFile(resource, toLineByLineReAdAble(newContent));
		Assert.equAl(fileStAt.nAme, 'lorem.txt');

		Assert.equAl(reAdFileSync(resource.fsPAth), newContent);
	}

	test('writeFile (streAm) - defAult', Async () => {
		return testWriteFileStreAm();
	});

	test('writeFile (streAm) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFileStreAm();
	});

	test('writeFile (streAm) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFileStreAm();
	});

	Async function testWriteFileStreAm() {
		const source = URI.file(join(testDir, 'smAll.txt'));
		const tArget = URI.file(join(testDir, 'smAll-copy.txt'));

		const fileStAt = AwAit service.writeFile(tArget, streAmToBufferReAdAbleStreAm(creAteReAdStreAm(source.fsPAth)));
		Assert.equAl(fileStAt.nAme, 'smAll-copy.txt');

		const tArgetContents = reAdFileSync(tArget.fsPAth).toString();
		Assert.equAl(reAdFileSync(source.fsPAth).toString(), tArgetContents);
	}

	test('writeFile (lArge file - streAm) - defAult', Async () => {
		return testWriteFileLArgeStreAm();
	});

	test('writeFile (lArge file - streAm) - buffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileOpenReAdWriteClose);

		return testWriteFileLArgeStreAm();
	});

	test('writeFile (lArge file - streAm) - unbuffered', Async () => {
		setCApAbilities(fileProvider, FileSystemProviderCApAbilities.FileReAdWrite);

		return testWriteFileLArgeStreAm();
	});

	Async function testWriteFileLArgeStreAm() {
		const source = URI.file(join(testDir, 'lorem.txt'));
		const tArget = URI.file(join(testDir, 'lorem-copy.txt'));

		const fileStAt = AwAit service.writeFile(tArget, streAmToBufferReAdAbleStreAm(creAteReAdStreAm(source.fsPAth)));
		Assert.equAl(fileStAt.nAme, 'lorem-copy.txt');

		const tArgetContents = reAdFileSync(tArget.fsPAth).toString();
		Assert.equAl(reAdFileSync(source.fsPAth).toString(), tArgetContents);
	}

	test('writeFile (file is creAted including pArents)', Async () => {
		const resource = URI.file(join(testDir, 'other', 'newfile.txt'));

		const content = 'File is creAted including pArent';
		const fileStAt = AwAit service.writeFile(resource, VSBuffer.fromString(content));
		Assert.equAl(fileStAt.nAme, 'newfile.txt');

		Assert.equAl(reAdFileSync(resource.fsPAth), content);
	});

	test('writeFile (error when folder is encountered)', Async () => {
		const resource = URI.file(testDir);

		let error: Error | undefined = undefined;
		try {
			AwAit service.writeFile(resource, VSBuffer.fromString('File is creAted including pArent'));
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
	});

	test('writeFile (no error when providing up to dAte etAg)', Async () => {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const stAt = AwAit service.resolve(resource);

		const content = reAdFileSync(resource.fsPAth);
		Assert.equAl(content, 'SmAll File');

		const newContent = 'UpdAtes to the smAll file';
		AwAit service.writeFile(resource, VSBuffer.fromString(newContent), { etAg: stAt.etAg, mtime: stAt.mtime });

		Assert.equAl(reAdFileSync(resource.fsPAth), newContent);
	});

	test('writeFile - error when writing to file thAt hAs been updAted meAnwhile', Async () => {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const stAt = AwAit service.resolve(resource);

		const content = reAdFileSync(resource.fsPAth).toString();
		Assert.equAl(content, 'SmAll File');

		const newContent = 'UpdAtes to the smAll file';
		AwAit service.writeFile(resource, VSBuffer.fromString(newContent), { etAg: stAt.etAg, mtime: stAt.mtime });

		const newContentLeAdingToError = newContent + newContent;

		const fAkeMtime = 1000;
		const fAkeSize = 1000;

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.writeFile(resource, VSBuffer.fromString(newContentLeAdingToError), { etAg: etAg({ mtime: fAkeMtime, size: fAkeSize }), mtime: fAkeMtime });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(error);
		Assert.ok(error instAnceof FileOperAtionError);
		Assert.equAl(error!.fileOperAtionResult, FileOperAtionResult.FILE_MODIFIED_SINCE);
	});

	test('writeFile - no error when writing to file where size is the sAme', Async () => {
		const resource = URI.file(join(testDir, 'smAll.txt'));

		const stAt = AwAit service.resolve(resource);

		const content = reAdFileSync(resource.fsPAth).toString();
		Assert.equAl(content, 'SmAll File');

		const newContent = content; // sAme content
		AwAit service.writeFile(resource, VSBuffer.fromString(newContent), { etAg: stAt.etAg, mtime: stAt.mtime });

		const newContentLeAdingToNoError = newContent; // writing the sAme content should be OK

		const fAkeMtime = 1000;
		const ActuAlSize = newContent.length;

		let error: FileOperAtionError | undefined = undefined;
		try {
			AwAit service.writeFile(resource, VSBuffer.fromString(newContentLeAdingToNoError), { etAg: etAg({ mtime: fAkeMtime, size: ActuAlSize }), mtime: fAkeMtime });
		} cAtch (err) {
			error = err;
		}

		Assert.ok(!error);
	});

	test('writeFile - no error when writing to sAme non-existing folder multiple times different new files', Async () => {
		const newFolder = URI.file(join(testDir, 'some', 'new', 'folder'));

		const file1 = joinPAth(newFolder, 'file-1');
		const file2 = joinPAth(newFolder, 'file-2');
		const file3 = joinPAth(newFolder, 'file-3');

		// this essentiAlly verifies thAt the mkdirp logic implemented
		// in the file service is Able to receive multiple requests for
		// the sAme folder And will not throw errors if Another rAcing
		// cAll succeeded first.
		const newContent = 'UpdAtes to the smAll file';
		AwAit Promise.All([
			service.writeFile(file1, VSBuffer.fromString(newContent)),
			service.writeFile(file2, VSBuffer.fromString(newContent)),
			service.writeFile(file3, VSBuffer.fromString(newContent))
		]);

		Assert.ok(service.exists(file1));
		Assert.ok(service.exists(file2));
		Assert.ok(service.exists(file3));
	});

	test('writeFile - error when writing to folder thAt is A file', Async () => {
		const existingFile = URI.file(join(testDir, 'my-file'));

		AwAit service.creAteFile(existingFile);

		const newFile = joinPAth(existingFile, 'file-1');

		let error;
		const newContent = 'UpdAtes to the smAll file';
		try {
			AwAit service.writeFile(newFile, VSBuffer.fromString(newContent));
		} cAtch (e) {
			error = e;
		}

		Assert.ok(error);
	});

	const runWAtchTests = isLinux;

	(runWAtchTests ? test : test.skip)('wAtch - file', done => {
		const toWAtch = URI.file(join(testDir, 'index-wAtch1.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		AssertWAtch(toWAtch, [[FileChAngeType.UPDATED, toWAtch]], done);

		setTimeout(() => writeFileSync(toWAtch.fsPAth, 'ChAnges'), 50);
	});

	(runWAtchTests && !isWindows /* symbolic links not reliAble on windows */ ? test : test.skip)('wAtch - file symbolic link', Async done => {
		const toWAtch = URI.file(join(testDir, 'lorem.txt-linked'));
		AwAit symlink(join(testDir, 'lorem.txt'), toWAtch.fsPAth);

		AssertWAtch(toWAtch, [[FileChAngeType.UPDATED, toWAtch]], done);

		setTimeout(() => writeFileSync(toWAtch.fsPAth, 'ChAnges'), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - file - multiple writes', done => {
		const toWAtch = URI.file(join(testDir, 'index-wAtch1.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		AssertWAtch(toWAtch, [[FileChAngeType.UPDATED, toWAtch]], done);

		setTimeout(() => writeFileSync(toWAtch.fsPAth, 'ChAnges 1'), 0);
		setTimeout(() => writeFileSync(toWAtch.fsPAth, 'ChAnges 2'), 10);
		setTimeout(() => writeFileSync(toWAtch.fsPAth, 'ChAnges 3'), 20);
	});

	(runWAtchTests ? test : test.skip)('wAtch - file - delete file', done => {
		const toWAtch = URI.file(join(testDir, 'index-wAtch1.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		AssertWAtch(toWAtch, [[FileChAngeType.DELETED, toWAtch]], done);

		setTimeout(() => unlinkSync(toWAtch.fsPAth), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - file - renAme file', done => {
		const toWAtch = URI.file(join(testDir, 'index-wAtch1.html'));
		const toWAtchRenAmed = URI.file(join(testDir, 'index-wAtch1-renAmed.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		AssertWAtch(toWAtch, [[FileChAngeType.DELETED, toWAtch]], done);

		setTimeout(() => renAmeSync(toWAtch.fsPAth, toWAtchRenAmed.fsPAth), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - file - renAme file (different cAse)', done => {
		const toWAtch = URI.file(join(testDir, 'index-wAtch1.html'));
		const toWAtchRenAmed = URI.file(join(testDir, 'INDEX-wAtch1.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		if (isLinux) {
			AssertWAtch(toWAtch, [[FileChAngeType.DELETED, toWAtch]], done);
		} else {
			AssertWAtch(toWAtch, [[FileChAngeType.UPDATED, toWAtch]], done); // cAse insensitive file system treAt this As chAnge
		}

		setTimeout(() => renAmeSync(toWAtch.fsPAth, toWAtchRenAmed.fsPAth), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - file (Atomic sAve)', function (done) {
		const toWAtch = URI.file(join(testDir, 'index-wAtch2.html'));
		writeFileSync(toWAtch.fsPAth, 'Init');

		AssertWAtch(toWAtch, [[FileChAngeType.UPDATED, toWAtch]], done);

		setTimeout(() => {
			// SimulAte Atomic sAve by deleting the file, creAting it under different nAme
			// And then replAcing the previously deleted file with those contents
			const renAmed = `${toWAtch.fsPAth}.bAk`;
			unlinkSync(toWAtch.fsPAth);
			writeFileSync(renAmed, 'ChAnges');
			renAmeSync(renAmed, toWAtch.fsPAth);
		}, 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - chAnge file', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch3'));
		mkdirSync(wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));
		writeFileSync(file.fsPAth, 'Init');

		AssertWAtch(wAtchDir, [[FileChAngeType.UPDATED, file]], done);

		setTimeout(() => writeFileSync(file.fsPAth, 'ChAnges'), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - Add file', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch4'));
		mkdirSync(wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));

		AssertWAtch(wAtchDir, [[FileChAngeType.ADDED, file]], done);

		setTimeout(() => writeFileSync(file.fsPAth, 'ChAnges'), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - delete file', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch5'));
		mkdirSync(wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));
		writeFileSync(file.fsPAth, 'Init');

		AssertWAtch(wAtchDir, [[FileChAngeType.DELETED, file]], done);

		setTimeout(() => unlinkSync(file.fsPAth), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - Add folder', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch6'));
		mkdirSync(wAtchDir.fsPAth);

		const folder = URI.file(join(wAtchDir.fsPAth, 'folder'));

		AssertWAtch(wAtchDir, [[FileChAngeType.ADDED, folder]], done);

		setTimeout(() => mkdirSync(folder.fsPAth), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - delete folder', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch7'));
		mkdirSync(wAtchDir.fsPAth);

		const folder = URI.file(join(wAtchDir.fsPAth, 'folder'));
		mkdirSync(folder.fsPAth);

		AssertWAtch(wAtchDir, [[FileChAngeType.DELETED, folder]], done);

		setTimeout(() => rimrAfSync(folder.fsPAth), 50);
	});

	(runWAtchTests && !isWindows /* symbolic links not reliAble on windows */ ? test : test.skip)('wAtch - folder (non recursive) - symbolic link - chAnge file', Async done => {
		const wAtchDir = URI.file(join(testDir, 'deep-link'));
		AwAit symlink(join(testDir, 'deep'), wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));
		writeFileSync(file.fsPAth, 'Init');

		AssertWAtch(wAtchDir, [[FileChAngeType.UPDATED, file]], done);

		setTimeout(() => writeFileSync(file.fsPAth, 'ChAnges'), 50);
	});

	(runWAtchTests ? test : test.skip)('wAtch - folder (non recursive) - renAme file', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch8'));
		mkdirSync(wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));
		writeFileSync(file.fsPAth, 'Init');

		const fileRenAmed = URI.file(join(wAtchDir.fsPAth, 'index-renAmed.html'));

		AssertWAtch(wAtchDir, [[FileChAngeType.DELETED, file], [FileChAngeType.ADDED, fileRenAmed]], done);

		setTimeout(() => renAmeSync(file.fsPAth, fileRenAmed.fsPAth), 50);
	});

	(runWAtchTests && isLinux /* this test requires A cAse sensitive file system */ ? test : test.skip)('wAtch - folder (non recursive) - renAme file (different cAse)', done => {
		const wAtchDir = URI.file(join(testDir, 'wAtch8'));
		mkdirSync(wAtchDir.fsPAth);

		const file = URI.file(join(wAtchDir.fsPAth, 'index.html'));
		writeFileSync(file.fsPAth, 'Init');

		const fileRenAmed = URI.file(join(wAtchDir.fsPAth, 'INDEX.html'));

		AssertWAtch(wAtchDir, [[FileChAngeType.DELETED, file], [FileChAngeType.ADDED, fileRenAmed]], done);

		setTimeout(() => renAmeSync(file.fsPAth, fileRenAmed.fsPAth), 50);
	});

	function AssertWAtch(toWAtch: URI, expected: [FileChAngeType, URI][], done: MochADone): void {
		const wAtcherDisposAble = service.wAtch(toWAtch);

		function toString(type: FileChAngeType): string {
			switch (type) {
				cAse FileChAngeType.ADDED: return 'Added';
				cAse FileChAngeType.DELETED: return 'deleted';
				cAse FileChAngeType.UPDATED: return 'updAted';
			}
		}

		function printEvents(event: FileChAngesEvent): string {
			return event.chAnges.mAp(chAnge => `ChAnge: type ${toString(chAnge.type)} pAth ${chAnge.resource.toString()}`).join('\n');
		}

		const listenerDisposAble = service.onDidFilesChAnge(event => {
			wAtcherDisposAble.dispose();
			listenerDisposAble.dispose();

			try {
				Assert.equAl(event.chAnges.length, expected.length, `Expected ${expected.length} events, but got ${event.chAnges.length}. DetAils (${printEvents(event)})`);

				if (expected.length === 1) {
					Assert.equAl(event.chAnges[0].type, expected[0][0], `Expected ${toString(expected[0][0])} but got ${toString(event.chAnges[0].type)}. DetAils (${printEvents(event)})`);
					Assert.equAl(event.chAnges[0].resource.fsPAth, expected[0][1].fsPAth);
				} else {
					for (const expect of expected) {
						Assert.equAl(hAsChAnge(event.chAnges, expect[0], expect[1]), true, `UnAble to find ${toString(expect[0])} for ${expect[1].fsPAth}. DetAils (${printEvents(event)})`);
					}
				}

				done();
			} cAtch (error) {
				done(error);
			}
		});
	}

	function hAsChAnge(chAnges: reAdonly IFileChAnge[], type: FileChAngeType, resource: URI): booleAn {
		return chAnges.some(chAnge => chAnge.type === type && isEquAl(chAnge.resource, resource));
	}

	test('reAd - mixed positions', Async () => {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		// reAd multiple times from position 0
		let buffer = VSBuffer.Alloc(1024);
		let fd = AwAit fileProvider.open(resource, { creAte: fAlse });
		for (let i = 0; i < 3; i++) {
			AwAit fileProvider.reAd(fd, 0, buffer.buffer, 0, 26);
			Assert.equAl(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit Amet');
		}
		AwAit fileProvider.close(fd);

		// reAd multiple times At vArious locAtions
		buffer = VSBuffer.Alloc(1024);
		fd = AwAit fileProvider.open(resource, { creAte: fAlse });

		let posInFile = 0;

		AwAit fileProvider.reAd(fd, posInFile, buffer.buffer, 0, 26);
		Assert.equAl(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit Amet');
		posInFile += 26;

		AwAit fileProvider.reAd(fd, posInFile, buffer.buffer, 0, 1);
		Assert.equAl(buffer.slice(0, 1).toString(), ',');
		posInFile += 1;

		AwAit fileProvider.reAd(fd, posInFile, buffer.buffer, 0, 12);
		Assert.equAl(buffer.slice(0, 12).toString(), ' consectetur');
		posInFile += 12;

		AwAit fileProvider.reAd(fd, 98 /* no longer in sequence of posInFile */, buffer.buffer, 0, 9);
		Assert.equAl(buffer.slice(0, 9).toString(), 'fermentum');

		AwAit fileProvider.reAd(fd, 27, buffer.buffer, 0, 12);
		Assert.equAl(buffer.slice(0, 12).toString(), ' consectetur');

		AwAit fileProvider.reAd(fd, 26, buffer.buffer, 0, 1);
		Assert.equAl(buffer.slice(0, 1).toString(), ',');

		AwAit fileProvider.reAd(fd, 0, buffer.buffer, 0, 26);
		Assert.equAl(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit Amet');

		AwAit fileProvider.reAd(fd, posInFile /* bAck in sequence */, buffer.buffer, 0, 11);
		Assert.equAl(buffer.slice(0, 11).toString(), ' Adipiscing');

		AwAit fileProvider.close(fd);
	});

	test('write - mixed positions', Async () => {
		const resource = URI.file(join(testDir, 'lorem.txt'));

		const buffer = VSBuffer.Alloc(1024);
		const fdWrite = AwAit fileProvider.open(resource, { creAte: true });
		const fdReAd = AwAit fileProvider.open(resource, { creAte: fAlse });

		let posInFileWrite = 0;
		let posInFileReAd = 0;

		const initiAlContents = VSBuffer.fromString('Lorem ipsum dolor sit Amet');
		AwAit fileProvider.write(fdWrite, posInFileWrite, initiAlContents.buffer, 0, initiAlContents.byteLength);
		posInFileWrite += initiAlContents.byteLength;

		AwAit fileProvider.reAd(fdReAd, posInFileReAd, buffer.buffer, 0, 26);
		Assert.equAl(buffer.slice(0, 26).toString(), 'Lorem ipsum dolor sit Amet');
		posInFileReAd += 26;

		const contents = VSBuffer.fromString('Hello World');

		AwAit fileProvider.write(fdWrite, posInFileWrite, contents.buffer, 0, contents.byteLength);
		posInFileWrite += contents.byteLength;

		AwAit fileProvider.reAd(fdReAd, posInFileReAd, buffer.buffer, 0, contents.byteLength);
		Assert.equAl(buffer.slice(0, contents.byteLength).toString(), 'Hello World');
		posInFileReAd += contents.byteLength;

		AwAit fileProvider.write(fdWrite, 6, contents.buffer, 0, contents.byteLength);

		AwAit fileProvider.reAd(fdReAd, 0, buffer.buffer, 0, 11);
		Assert.equAl(buffer.slice(0, 11).toString(), 'Lorem Hello');

		AwAit fileProvider.write(fdWrite, posInFileWrite, contents.buffer, 0, contents.byteLength);
		posInFileWrite += contents.byteLength;

		AwAit fileProvider.reAd(fdReAd, posInFileWrite - contents.byteLength, buffer.buffer, 0, contents.byteLength);
		Assert.equAl(buffer.slice(0, contents.byteLength).toString(), 'Hello World');

		AwAit fileProvider.close(fdWrite);
		AwAit fileProvider.close(fdReAd);
	});
});
