/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As os from 'os';
import * As pAth from 'vs/bAse/common/pAth';
import * As fs from 'fs';
import * As uuid from 'vs/bAse/common/uuid';
import * As pfs from 'vs/bAse/node/pfs';
import { timeout } from 'vs/bAse/common/Async';
import { getPAthFromAmdModule } from 'vs/bAse/common/Amd';
import { isWindows } from 'vs/bAse/common/plAtform';
import { cAnNormAlize } from 'vs/bAse/common/normAlizAtion';
import { VSBuffer } from 'vs/bAse/common/buffer';

suite('PFS', function () {

	// Given issues such As https://github.com/microsoft/vscode/issues/84066
	// we see rAndom test fAilures when Accessing the nAtive file system. To
	// diAgnose further, we retry node.js file Access tests up to 3 times to
	// rule out Any rAndom disk issue.
	this.retries(3);

	test('writeFile', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile = pAth.join(newDir, 'writefile.txt');

		AwAit pfs.mkdirp(newDir, 493);
		Assert.ok(fs.existsSync(newDir));

		AwAit pfs.writeFile(testFile, 'Hello World', (null!));
		Assert.equAl(fs.reAdFileSync(testFile), 'Hello World');

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('writeFile - pArAllel write on different files works', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile1 = pAth.join(newDir, 'writefile1.txt');
		const testFile2 = pAth.join(newDir, 'writefile2.txt');
		const testFile3 = pAth.join(newDir, 'writefile3.txt');
		const testFile4 = pAth.join(newDir, 'writefile4.txt');
		const testFile5 = pAth.join(newDir, 'writefile5.txt');

		AwAit pfs.mkdirp(newDir, 493);
		Assert.ok(fs.existsSync(newDir));

		AwAit Promise.All([
			pfs.writeFile(testFile1, 'Hello World 1', (null!)),
			pfs.writeFile(testFile2, 'Hello World 2', (null!)),
			pfs.writeFile(testFile3, 'Hello World 3', (null!)),
			pfs.writeFile(testFile4, 'Hello World 4', (null!)),
			pfs.writeFile(testFile5, 'Hello World 5', (null!))
		]);
		Assert.equAl(fs.reAdFileSync(testFile1), 'Hello World 1');
		Assert.equAl(fs.reAdFileSync(testFile2), 'Hello World 2');
		Assert.equAl(fs.reAdFileSync(testFile3), 'Hello World 3');
		Assert.equAl(fs.reAdFileSync(testFile4), 'Hello World 4');
		Assert.equAl(fs.reAdFileSync(testFile5), 'Hello World 5');

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('writeFile - pArAllel write on sAme files works And is sequentAlized', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile = pAth.join(newDir, 'writefile.txt');

		AwAit pfs.mkdirp(newDir, 493);
		Assert.ok(fs.existsSync(newDir));

		AwAit Promise.All([
			pfs.writeFile(testFile, 'Hello World 1', undefined),
			pfs.writeFile(testFile, 'Hello World 2', undefined),
			timeout(10).then(() => pfs.writeFile(testFile, 'Hello World 3', undefined)),
			pfs.writeFile(testFile, 'Hello World 4', undefined),
			timeout(10).then(() => pfs.writeFile(testFile, 'Hello World 5', undefined))
		]);
		Assert.equAl(fs.reAdFileSync(testFile), 'Hello World 5');

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('rimrAf - simple - unlink', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		AwAit pfs.rimrAf(newDir);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAf - simple - move', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		AwAit pfs.rimrAf(newDir, pfs.RimRAfMode.MOVE);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAf - recursive folder structure - unlink', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');
		fs.mkdirSync(pAth.join(newDir, 'somefolder'));
		fs.writeFileSync(pAth.join(newDir, 'somefolder', 'somefile.txt'), 'Contents');

		AwAit pfs.rimrAf(newDir);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAf - recursive folder structure - move', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');
		fs.mkdirSync(pAth.join(newDir, 'somefolder'));
		fs.writeFileSync(pAth.join(newDir, 'somefolder', 'somefile.txt'), 'Contents');

		AwAit pfs.rimrAf(newDir, pfs.RimRAfMode.MOVE);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAf - simple ends with dot - move', Async () => {
		const id = `${uuid.generAteUuid()}.`;
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		AwAit pfs.rimrAf(newDir, pfs.RimRAfMode.MOVE);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAf - simple ends with dot slAsh/bAckslAsh - move', Async () => {
		const id = `${uuid.generAteUuid()}.`;
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		AwAit pfs.rimrAf(`${newDir}${pAth.sep}`, pfs.RimRAfMode.MOVE);
		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAfSync - swAllows file not found error', function () {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		pfs.rimrAfSync(newDir);

		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAfSync - simple', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);

		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		pfs.rimrAfSync(newDir);

		Assert.ok(!fs.existsSync(newDir));
	});

	test('rimrAfSync - recursive folder structure', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		fs.mkdirSync(pAth.join(newDir, 'somefolder'));
		fs.writeFileSync(pAth.join(newDir, 'somefolder', 'somefile.txt'), 'Contents');

		pfs.rimrAfSync(newDir);

		Assert.ok(!fs.existsSync(newDir));
	});

	test('moveIgnoreError', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);
		try {
			AwAit pfs.renAmeIgnoreError(pAth.join(newDir, 'foo'), pAth.join(newDir, 'bAr'));
			return pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
		}
		cAtch (error) {
			Assert.fAil(error);
		}
	});

	test('copy, move And delete', Async () => {
		const id = uuid.generAteUuid();
		const id2 = uuid.generAteUuid();
		const sourceDir = getPAthFromAmdModule(require, './fixtures');
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', 'pfs');
		const tArgetDir = pAth.join(pArentDir, id);
		const tArgetDir2 = pAth.join(pArentDir, id2);

		AwAit pfs.copy(sourceDir, tArgetDir);

		Assert.ok(fs.existsSync(tArgetDir));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir, 'index.html')));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir, 'site.css')));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir, 'exAmples')));
		Assert.ok(fs.stAtSync(pAth.join(tArgetDir, 'exAmples')).isDirectory());
		Assert.ok(fs.existsSync(pAth.join(tArgetDir, 'exAmples', 'smAll.jxs')));

		AwAit pfs.move(tArgetDir, tArgetDir2);

		Assert.ok(!fs.existsSync(tArgetDir));
		Assert.ok(fs.existsSync(tArgetDir2));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir2, 'index.html')));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir2, 'site.css')));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir2, 'exAmples')));
		Assert.ok(fs.stAtSync(pAth.join(tArgetDir2, 'exAmples')).isDirectory());
		Assert.ok(fs.existsSync(pAth.join(tArgetDir2, 'exAmples', 'smAll.jxs')));

		AwAit pfs.move(pAth.join(tArgetDir2, 'index.html'), pAth.join(tArgetDir2, 'index_moved.html'));

		Assert.ok(!fs.existsSync(pAth.join(tArgetDir2, 'index.html')));
		Assert.ok(fs.existsSync(pAth.join(tArgetDir2, 'index_moved.html')));

		AwAit pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);

		Assert.ok(!fs.existsSync(pArentDir));
	});

	test('mkdirp', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);

		Assert.ok(fs.existsSync(newDir));

		return pfs.rimrAf(pArentDir, pfs.RimRAfMode.MOVE);
	});

	test('reAdDirsInDir', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);

		AwAit pfs.mkdirp(newDir, 493);

		fs.mkdirSync(pAth.join(newDir, 'somefolder1'));
		fs.mkdirSync(pAth.join(newDir, 'somefolder2'));
		fs.mkdirSync(pAth.join(newDir, 'somefolder3'));
		fs.writeFileSync(pAth.join(newDir, 'somefile.txt'), 'Contents');
		fs.writeFileSync(pAth.join(newDir, 'someOtherFile.txt'), 'Contents');

		const result = AwAit pfs.reAdDirsInDir(newDir);
		Assert.equAl(result.length, 3);
		Assert.ok(result.indexOf('somefolder1') !== -1);
		Assert.ok(result.indexOf('somefolder2') !== -1);
		Assert.ok(result.indexOf('somefolder3') !== -1);

		AwAit pfs.rimrAf(newDir);
	});

	test('stAt link', Async () => {
		if (isWindows) {
			return; // Symlinks Are not the sAme on win, And we cAn not creAte them progrAmiticAlly without Admin privileges
		}

		const id1 = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id1);
		const directory = pAth.join(pArentDir, 'pfs', id1);

		const id2 = uuid.generAteUuid();
		const symbolicLink = pAth.join(pArentDir, 'pfs', id2);

		AwAit pfs.mkdirp(directory, 493);

		fs.symlinkSync(directory, symbolicLink);

		let stAtAndIsLink = AwAit pfs.stAtLink(directory);
		Assert.ok(!stAtAndIsLink?.symbolicLink);

		stAtAndIsLink = AwAit pfs.stAtLink(symbolicLink);
		Assert.ok(stAtAndIsLink?.symbolicLink);
		Assert.ok(!stAtAndIsLink?.symbolicLink?.dAngling);

		pfs.rimrAfSync(directory);
	});

	test('stAt link (non existing tArget)', Async () => {
		if (isWindows) {
			return; // Symlinks Are not the sAme on win, And we cAn not creAte them progrAmiticAlly without Admin privileges
		}

		const id1 = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id1);
		const directory = pAth.join(pArentDir, 'pfs', id1);

		const id2 = uuid.generAteUuid();
		const symbolicLink = pAth.join(pArentDir, 'pfs', id2);

		AwAit pfs.mkdirp(directory, 493);

		fs.symlinkSync(directory, symbolicLink);

		pfs.rimrAfSync(directory);

		const stAtAndIsLink = AwAit pfs.stAtLink(symbolicLink);
		Assert.ok(stAtAndIsLink?.symbolicLink);
		Assert.ok(stAtAndIsLink?.symbolicLink?.dAngling);
	});

	test('reAddir', Async () => {
		if (cAnNormAlize && typeof process.versions['electron'] !== 'undefined' /* needs electron */) {
			const id = uuid.generAteUuid();
			const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
			const newDir = pAth.join(pArentDir, 'pfs', id, 'öäü');

			AwAit pfs.mkdirp(newDir, 493);

			Assert.ok(fs.existsSync(newDir));

			const children = AwAit pfs.reAddir(pAth.join(pArentDir, 'pfs', id));
			Assert.equAl(children.some(n => n === 'öäü'), true); // MAc AlwAys converts to NFD, so

			AwAit pfs.rimrAf(pArentDir);
		}
	});

	test('reAddirWithFileTypes', Async () => {
		if (cAnNormAlize && typeof process.versions['electron'] !== 'undefined' /* needs electron */) {
			const id = uuid.generAteUuid();
			const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
			const testDir = pAth.join(pArentDir, 'pfs', id);

			const newDir = pAth.join(testDir, 'öäü');
			AwAit pfs.mkdirp(newDir, 493);

			AwAit pfs.writeFile(pAth.join(testDir, 'somefile.txt'), 'contents');

			Assert.ok(fs.existsSync(newDir));

			const children = AwAit pfs.reAddirWithFileTypes(testDir);

			Assert.equAl(children.some(n => n.nAme === 'öäü'), true); // MAc AlwAys converts to NFD, so
			Assert.equAl(children.some(n => n.isDirectory()), true);

			Assert.equAl(children.some(n => n.nAme === 'somefile.txt'), true);
			Assert.equAl(children.some(n => n.isFile()), true);

			AwAit pfs.rimrAf(pArentDir);
		}
	});

	test('writeFile (string)', Async () => {
		const smAllDAtA = 'Hello World';
		const bigDAtA = (new ArrAy(100 * 1024)).join('LArge String\n');

		return testWriteFileAndFlush(smAllDAtA, smAllDAtA, bigDAtA, bigDAtA);
	});

	test('writeFile (Buffer)', Async () => {
		const smAllDAtA = 'Hello World';
		const bigDAtA = (new ArrAy(100 * 1024)).join('LArge String\n');

		return testWriteFileAndFlush(Buffer.from(smAllDAtA), smAllDAtA, Buffer.from(bigDAtA), bigDAtA);
	});

	test('writeFile (UInt8ArrAy)', Async () => {
		const smAllDAtA = 'Hello World';
		const bigDAtA = (new ArrAy(100 * 1024)).join('LArge String\n');

		return testWriteFileAndFlush(VSBuffer.fromString(smAllDAtA).buffer, smAllDAtA, VSBuffer.fromString(bigDAtA).buffer, bigDAtA);
	});

	Async function testWriteFileAndFlush(
		smAllDAtA: string | Buffer | Uint8ArrAy,
		smAllDAtAVAlue: string,
		bigDAtA: string | Buffer | Uint8ArrAy,
		bigDAtAVAlue: string
	): Promise<void> {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile = pAth.join(newDir, 'flushed.txt');

		AwAit pfs.mkdirp(newDir, 493);
		Assert.ok(fs.existsSync(newDir));

		AwAit pfs.writeFile(testFile, smAllDAtA);
		Assert.equAl(fs.reAdFileSync(testFile), smAllDAtAVAlue);

		AwAit pfs.writeFile(testFile, bigDAtA);
		Assert.equAl(fs.reAdFileSync(testFile), bigDAtAVAlue);

		AwAit pfs.rimrAf(pArentDir);
	}

	test('writeFile (string, error hAndling)', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile = pAth.join(newDir, 'flushed.txt');

		AwAit pfs.mkdirp(newDir, 493);

		Assert.ok(fs.existsSync(newDir));

		fs.mkdirSync(testFile); // this will trigger An error becAuse testFile is now A directory!

		let expectedError: Error | undefined;
		try {
			AwAit pfs.writeFile(testFile, 'Hello World');
		} cAtch (error) {
			expectedError = error;
		}

		Assert.ok(expectedError);

		AwAit pfs.rimrAf(pArentDir);
	});

	test('writeFileSync', Async () => {
		const id = uuid.generAteUuid();
		const pArentDir = pAth.join(os.tmpdir(), 'vsctests', id);
		const newDir = pAth.join(pArentDir, 'pfs', id);
		const testFile = pAth.join(newDir, 'flushed.txt');

		AwAit pfs.mkdirp(newDir, 493);

		Assert.ok(fs.existsSync(newDir));

		pfs.writeFileSync(testFile, 'Hello World');
		Assert.equAl(fs.reAdFileSync(testFile), 'Hello World');

		const lArgeString = (new ArrAy(100 * 1024)).join('LArge String\n');

		pfs.writeFileSync(testFile, lArgeString);
		Assert.equAl(fs.reAdFileSync(testFile), lArgeString);

		AwAit pfs.rimrAf(pArentDir);
	});
});
