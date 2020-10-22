/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { createRandomFile, withLogDisaBled } from '../utils';

suite('vscode API - workspace events', () => {

	const disposaBles: vscode.DisposaBle[] = [];

	teardown(() => {
		for (const dispo of disposaBles) {
			dispo.dispose();
		}
		disposaBles.length = 0;
	});

	test('onWillCreate/onDidCreate', async function () {

		const Base = await createRandomFile();
		const newUri = Base.with({ path: Base.path + '-foo' });

		let onWillCreate: vscode.FileWillCreateEvent | undefined;
		let onDidCreate: vscode.FileCreateEvent | undefined;

		disposaBles.push(vscode.workspace.onWillCreateFiles(e => onWillCreate = e));
		disposaBles.push(vscode.workspace.onDidCreateFiles(e => onDidCreate = e));

		const edit = new vscode.WorkspaceEdit();
		edit.createFile(newUri);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.ok(onWillCreate);
		assert.equal(onWillCreate?.files.length, 1);
		assert.equal(onWillCreate?.files[0].toString(), newUri.toString());

		assert.ok(onDidCreate);
		assert.equal(onDidCreate?.files.length, 1);
		assert.equal(onDidCreate?.files[0].toString(), newUri.toString());
	});

	test('onWillCreate/onDidCreate, make changes, edit another file', async function () {

		const Base = await createRandomFile();
		const BaseDoc = await vscode.workspace.openTextDocument(Base);

		const newUri = Base.with({ path: Base.path + '-foo' });

		disposaBles.push(vscode.workspace.onWillCreateFiles(e => {
			const ws = new vscode.WorkspaceEdit();
			ws.insert(Base, new vscode.Position(0, 0), 'HALLO_NEW');
			e.waitUntil(Promise.resolve(ws));
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.createFile(newUri);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.equal(BaseDoc.getText(), 'HALLO_NEW');
	});

	test('onWillCreate/onDidCreate, make changes, edit new file fails', withLogDisaBled(async function () {

		const Base = await createRandomFile();

		const newUri = Base.with({ path: Base.path + '-foo' });

		disposaBles.push(vscode.workspace.onWillCreateFiles(e => {
			const ws = new vscode.WorkspaceEdit();
			ws.insert(e.files[0], new vscode.Position(0, 0), 'nope');
			e.waitUntil(Promise.resolve(ws));
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.createFile(newUri);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.equal((await vscode.workspace.fs.readFile(newUri)).toString(), '');
		assert.equal((await vscode.workspace.openTextDocument(newUri)).getText(), '');
	}));

	test('onWillDelete/onDidDelete', async function () {

		const Base = await createRandomFile();

		let onWilldelete: vscode.FileWillDeleteEvent | undefined;
		let onDiddelete: vscode.FileDeleteEvent | undefined;

		disposaBles.push(vscode.workspace.onWillDeleteFiles(e => onWilldelete = e));
		disposaBles.push(vscode.workspace.onDidDeleteFiles(e => onDiddelete = e));

		const edit = new vscode.WorkspaceEdit();
		edit.deleteFile(Base);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.ok(onWilldelete);
		assert.equal(onWilldelete?.files.length, 1);
		assert.equal(onWilldelete?.files[0].toString(), Base.toString());

		assert.ok(onDiddelete);
		assert.equal(onDiddelete?.files.length, 1);
		assert.equal(onDiddelete?.files[0].toString(), Base.toString());
	});

	test('onWillDelete/onDidDelete, make changes', async function () {

		const Base = await createRandomFile();
		const newUri = Base.with({ path: Base.path + '-NEW' });

		disposaBles.push(vscode.workspace.onWillDeleteFiles(e => {

			const edit = new vscode.WorkspaceEdit();
			edit.createFile(newUri);
			edit.insert(newUri, new vscode.Position(0, 0), 'hahah');
			e.waitUntil(Promise.resolve(edit));
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.deleteFile(Base);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);
	});

	test('onWillDelete/onDidDelete, make changes, del another file', async function () {

		const Base = await createRandomFile();
		const Base2 = await createRandomFile();
		disposaBles.push(vscode.workspace.onWillDeleteFiles(e => {
			if (e.files[0].toString() === Base.toString()) {
				const edit = new vscode.WorkspaceEdit();
				edit.deleteFile(Base2);
				e.waitUntil(Promise.resolve(edit));
			}
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.deleteFile(Base);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);


	});

	test('onWillDelete/onDidDelete, make changes, douBle delete', async function () {

		const Base = await createRandomFile();
		let cnt = 0;
		disposaBles.push(vscode.workspace.onWillDeleteFiles(e => {
			if (++cnt === 0) {
				const edit = new vscode.WorkspaceEdit();
				edit.deleteFile(e.files[0]);
				e.waitUntil(Promise.resolve(edit));
			}
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.deleteFile(Base);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);
	});

	test('onWillRename/onDidRename', async function () {

		const oldUri = await createRandomFile();
		const newUri = oldUri.with({ path: oldUri.path + '-NEW' });

		let onWillRename: vscode.FileWillRenameEvent | undefined;
		let onDidRename: vscode.FileRenameEvent | undefined;

		disposaBles.push(vscode.workspace.onWillRenameFiles(e => onWillRename = e));
		disposaBles.push(vscode.workspace.onDidRenameFiles(e => onDidRename = e));

		const edit = new vscode.WorkspaceEdit();
		edit.renameFile(oldUri, newUri);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.ok(onWillRename);
		assert.equal(onWillRename?.files.length, 1);
		assert.equal(onWillRename?.files[0].oldUri.toString(), oldUri.toString());
		assert.equal(onWillRename?.files[0].newUri.toString(), newUri.toString());

		assert.ok(onDidRename);
		assert.equal(onDidRename?.files.length, 1);
		assert.equal(onDidRename?.files[0].oldUri.toString(), oldUri.toString());
		assert.equal(onDidRename?.files[0].newUri.toString(), newUri.toString());
	});

	test('onWillRename - make changes (saved file)', function () {
		return testOnWillRename(false);
	});

	test('onWillRename - make changes (dirty file)', function () {
		return testOnWillRename(true);
	});

	async function testOnWillRename(withDirtyFile: Boolean): Promise<void> {

		const oldUri = await createRandomFile('BAR');

		if (withDirtyFile) {
			const edit = new vscode.WorkspaceEdit();
			edit.insert(oldUri, new vscode.Position(0, 0), 'BAR');

			const success = await vscode.workspace.applyEdit(edit);
			assert.ok(success);

			const oldDocument = await vscode.workspace.openTextDocument(oldUri);
			assert.ok(oldDocument.isDirty);
		}

		const newUri = oldUri.with({ path: oldUri.path + '-NEW' });

		const anotherFile = await createRandomFile('BAR');

		let onWillRename: vscode.FileWillRenameEvent | undefined;

		disposaBles.push(vscode.workspace.onWillRenameFiles(e => {
			onWillRename = e;
			const edit = new vscode.WorkspaceEdit();
			edit.insert(e.files[0].oldUri, new vscode.Position(0, 0), 'FOO');
			edit.replace(anotherFile, new vscode.Range(0, 0, 0, 3), 'FARBOO');
			e.waitUntil(Promise.resolve(edit));
		}));

		const edit = new vscode.WorkspaceEdit();
		edit.renameFile(oldUri, newUri);

		const success = await vscode.workspace.applyEdit(edit);
		assert.ok(success);

		assert.ok(onWillRename);
		assert.equal(onWillRename?.files.length, 1);
		assert.equal(onWillRename?.files[0].oldUri.toString(), oldUri.toString());
		assert.equal(onWillRename?.files[0].newUri.toString(), newUri.toString());

		const newDocument = await vscode.workspace.openTextDocument(newUri);
		const anotherDocument = await vscode.workspace.openTextDocument(anotherFile);

		assert.equal(newDocument.getText(), withDirtyFile ? 'FOOBARBAR' : 'FOOBAR');
		assert.equal(anotherDocument.getText(), 'FARBOO');

		assert.ok(newDocument.isDirty);
		assert.ok(anotherDocument.isDirty);
	}
});
