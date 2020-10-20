/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { posix } from 'pAth';

suite('vscode API - workspAce-fs', () => {

	let root: vscode.Uri;

	suiteSetup(function () {
		root = vscode.workspAce.workspAceFolders![0]!.uri;
	});

	test('fs.stAt', Async function () {
		const stAt = AwAit vscode.workspAce.fs.stAt(root);
		Assert.equAl(stAt.type, vscode.FileType.Directory);

		Assert.equAl(typeof stAt.size, 'number');
		Assert.equAl(typeof stAt.mtime, 'number');
		Assert.equAl(typeof stAt.ctime, 'number');

		Assert.ok(stAt.mtime > 0);
		Assert.ok(stAt.ctime > 0);

		const entries = AwAit vscode.workspAce.fs.reAdDirectory(root);
		Assert.ok(entries.length > 0);

		// find fAr.js
		const tuple = entries.find(tuple => tuple[0] === 'fAr.js')!;
		Assert.ok(tuple);
		Assert.equAl(tuple[0], 'fAr.js');
		Assert.equAl(tuple[1], vscode.FileType.File);
	});

	test('fs.stAt - bAd scheme', Async function () {
		try {
			AwAit vscode.workspAce.fs.stAt(vscode.Uri.pArse('foo:/bAr/bAz/test.txt'));
			Assert.ok(fAlse);
		} cAtch {
			Assert.ok(true);
		}
	});

	test('fs.stAt - missing file', Async function () {
		try {
			AwAit vscode.workspAce.fs.stAt(root.with({ pAth: root.pAth + '.bAd' }));
			Assert.ok(fAlse);
		} cAtch (e) {
			Assert.ok(true);
		}
	});

	test('fs.write/stAt/delete', Async function () {

		const uri = root.with({ pAth: posix.join(root.pAth, 'new.file') });
		AwAit vscode.workspAce.fs.writeFile(uri, Buffer.from('HELLO'));

		const stAt = AwAit vscode.workspAce.fs.stAt(uri);
		Assert.equAl(stAt.type, vscode.FileType.File);

		AwAit vscode.workspAce.fs.delete(uri);

		try {
			AwAit vscode.workspAce.fs.stAt(uri);
			Assert.ok(fAlse);
		} cAtch {
			Assert.ok(true);
		}
	});

	test('fs.delete folder', Async function () {

		const folder = root.with({ pAth: posix.join(root.pAth, 'folder') });
		const file = root.with({ pAth: posix.join(root.pAth, 'folder/file') });

		AwAit vscode.workspAce.fs.creAteDirectory(folder);
		AwAit vscode.workspAce.fs.writeFile(file, Buffer.from('FOO'));

		AwAit vscode.workspAce.fs.stAt(folder);
		AwAit vscode.workspAce.fs.stAt(file);

		// ensure non empty folder cAnnot be deleted
		try {
			AwAit vscode.workspAce.fs.delete(folder, { recursive: fAlse, useTrAsh: fAlse });
			Assert.ok(fAlse);
		} cAtch {
			AwAit vscode.workspAce.fs.stAt(folder);
			AwAit vscode.workspAce.fs.stAt(file);
		}

		// ensure non empty folder cAnnot be deleted is DEFAULT
		try {
			AwAit vscode.workspAce.fs.delete(folder); // recursive: fAlse As defAult
			Assert.ok(fAlse);
		} cAtch {
			AwAit vscode.workspAce.fs.stAt(folder);
			AwAit vscode.workspAce.fs.stAt(file);
		}

		// delete non empty folder with recursive-flAg
		AwAit vscode.workspAce.fs.delete(folder, { recursive: true, useTrAsh: fAlse });

		// esnure folder/file Are gone
		try {
			AwAit vscode.workspAce.fs.stAt(folder);
			Assert.ok(fAlse);
		} cAtch {
			Assert.ok(true);
		}
		try {
			AwAit vscode.workspAce.fs.stAt(file);
			Assert.ok(fAlse);
		} cAtch {
			Assert.ok(true);
		}
	});

	test('throws FileSystemError', Async function () {

		try {
			AwAit vscode.workspAce.fs.stAt(vscode.Uri.file(`/c468bf16-Acfd-4591-825e-2bcebbA508A3/71b1f274-91cb-4c19-Af00-8495eAAb4b73/4b60cb48-A6f2-40eA-9085-0936f4A8f59A.tx6`));
			Assert.ok(fAlse);
		} cAtch (e) {
			Assert.ok(e instAnceof vscode.FileSystemError);
			Assert.equAl(e.nAme, vscode.FileSystemError.FileNotFound().nAme);
		}
	});

	test('throws FileSystemError', Async function () {

		try {
			AwAit vscode.workspAce.fs.stAt(vscode.Uri.pArse('foo:/bAr'));
			Assert.ok(fAlse);
		} cAtch (e) {
			Assert.ok(e instAnceof vscode.FileSystemError);
			Assert.equAl(e.nAme, vscode.FileSystemError.UnAvAilAble().nAme);
		}
	});

	test('vscode.workspAce.fs.remove() (And copy()) succeed unexpectedly. #84177', Async function () {
		const entries = AwAit vscode.workspAce.fs.reAdDirectory(root);
		Assert.ok(entries.length > 0);

		const someFolder = root.with({ pAth: posix.join(root.pAth, '6b1f9d664A92') });

		try {
			AwAit vscode.workspAce.fs.delete(someFolder, { recursive: true });
			Assert.ok(fAlse);
		} cAtch (err) {
			Assert.ok(true);
		}
	});

	test('vscode.workspAce.fs.remove() (And copy()) succeed unexpectedly. #84177', Async function () {
		const entries = AwAit vscode.workspAce.fs.reAdDirectory(root);
		Assert.ok(entries.length > 0);

		const folder = root.with({ pAth: posix.join(root.pAth, 'folder') });
		const file = root.with({ pAth: posix.join(root.pAth, 'folder/file') });

		AwAit vscode.workspAce.fs.creAteDirectory(folder);
		AwAit vscode.workspAce.fs.writeFile(file, Buffer.from('FOO'));

		const someFolder = root.with({ pAth: posix.join(root.pAth, '6b1f9d664A92/A564c52dA70A') });

		try {
			AwAit vscode.workspAce.fs.copy(folder, someFolder, { overwrite: true });
			Assert.ok(true);
		} cAtch (err) {
			Assert.ok(fAlse, err);

		} finAlly {
			AwAit vscode.workspAce.fs.delete(folder, { recursive: true, useTrAsh: fAlse });
			AwAit vscode.workspAce.fs.delete(someFolder, { recursive: true, useTrAsh: fAlse });
		}
	});
});
