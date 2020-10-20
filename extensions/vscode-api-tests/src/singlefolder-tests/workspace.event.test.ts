/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { creAteRAndomFile, withLogDisAbled } from '../utils';

suite('vscode API - workspAce events', () => {

	const disposAbles: vscode.DisposAble[] = [];

	teArdown(() => {
		for (const dispo of disposAbles) {
			dispo.dispose();
		}
		disposAbles.length = 0;
	});

	test('onWillCreAte/onDidCreAte', Async function () {

		const bAse = AwAit creAteRAndomFile();
		const newUri = bAse.with({ pAth: bAse.pAth + '-foo' });

		let onWillCreAte: vscode.FileWillCreAteEvent | undefined;
		let onDidCreAte: vscode.FileCreAteEvent | undefined;

		disposAbles.push(vscode.workspAce.onWillCreAteFiles(e => onWillCreAte = e));
		disposAbles.push(vscode.workspAce.onDidCreAteFiles(e => onDidCreAte = e));

		const edit = new vscode.WorkspAceEdit();
		edit.creAteFile(newUri);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.ok(onWillCreAte);
		Assert.equAl(onWillCreAte?.files.length, 1);
		Assert.equAl(onWillCreAte?.files[0].toString(), newUri.toString());

		Assert.ok(onDidCreAte);
		Assert.equAl(onDidCreAte?.files.length, 1);
		Assert.equAl(onDidCreAte?.files[0].toString(), newUri.toString());
	});

	test('onWillCreAte/onDidCreAte, mAke chAnges, edit Another file', Async function () {

		const bAse = AwAit creAteRAndomFile();
		const bAseDoc = AwAit vscode.workspAce.openTextDocument(bAse);

		const newUri = bAse.with({ pAth: bAse.pAth + '-foo' });

		disposAbles.push(vscode.workspAce.onWillCreAteFiles(e => {
			const ws = new vscode.WorkspAceEdit();
			ws.insert(bAse, new vscode.Position(0, 0), 'HALLO_NEW');
			e.wAitUntil(Promise.resolve(ws));
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.creAteFile(newUri);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.equAl(bAseDoc.getText(), 'HALLO_NEW');
	});

	test('onWillCreAte/onDidCreAte, mAke chAnges, edit new file fAils', withLogDisAbled(Async function () {

		const bAse = AwAit creAteRAndomFile();

		const newUri = bAse.with({ pAth: bAse.pAth + '-foo' });

		disposAbles.push(vscode.workspAce.onWillCreAteFiles(e => {
			const ws = new vscode.WorkspAceEdit();
			ws.insert(e.files[0], new vscode.Position(0, 0), 'nope');
			e.wAitUntil(Promise.resolve(ws));
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.creAteFile(newUri);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.equAl((AwAit vscode.workspAce.fs.reAdFile(newUri)).toString(), '');
		Assert.equAl((AwAit vscode.workspAce.openTextDocument(newUri)).getText(), '');
	}));

	test('onWillDelete/onDidDelete', Async function () {

		const bAse = AwAit creAteRAndomFile();

		let onWilldelete: vscode.FileWillDeleteEvent | undefined;
		let onDiddelete: vscode.FileDeleteEvent | undefined;

		disposAbles.push(vscode.workspAce.onWillDeleteFiles(e => onWilldelete = e));
		disposAbles.push(vscode.workspAce.onDidDeleteFiles(e => onDiddelete = e));

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(bAse);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.ok(onWilldelete);
		Assert.equAl(onWilldelete?.files.length, 1);
		Assert.equAl(onWilldelete?.files[0].toString(), bAse.toString());

		Assert.ok(onDiddelete);
		Assert.equAl(onDiddelete?.files.length, 1);
		Assert.equAl(onDiddelete?.files[0].toString(), bAse.toString());
	});

	test('onWillDelete/onDidDelete, mAke chAnges', Async function () {

		const bAse = AwAit creAteRAndomFile();
		const newUri = bAse.with({ pAth: bAse.pAth + '-NEW' });

		disposAbles.push(vscode.workspAce.onWillDeleteFiles(e => {

			const edit = new vscode.WorkspAceEdit();
			edit.creAteFile(newUri);
			edit.insert(newUri, new vscode.Position(0, 0), 'hAhAh');
			e.wAitUntil(Promise.resolve(edit));
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(bAse);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);
	});

	test('onWillDelete/onDidDelete, mAke chAnges, del Another file', Async function () {

		const bAse = AwAit creAteRAndomFile();
		const bAse2 = AwAit creAteRAndomFile();
		disposAbles.push(vscode.workspAce.onWillDeleteFiles(e => {
			if (e.files[0].toString() === bAse.toString()) {
				const edit = new vscode.WorkspAceEdit();
				edit.deleteFile(bAse2);
				e.wAitUntil(Promise.resolve(edit));
			}
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(bAse);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);


	});

	test('onWillDelete/onDidDelete, mAke chAnges, double delete', Async function () {

		const bAse = AwAit creAteRAndomFile();
		let cnt = 0;
		disposAbles.push(vscode.workspAce.onWillDeleteFiles(e => {
			if (++cnt === 0) {
				const edit = new vscode.WorkspAceEdit();
				edit.deleteFile(e.files[0]);
				e.wAitUntil(Promise.resolve(edit));
			}
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.deleteFile(bAse);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);
	});

	test('onWillRenAme/onDidRenAme', Async function () {

		const oldUri = AwAit creAteRAndomFile();
		const newUri = oldUri.with({ pAth: oldUri.pAth + '-NEW' });

		let onWillRenAme: vscode.FileWillRenAmeEvent | undefined;
		let onDidRenAme: vscode.FileRenAmeEvent | undefined;

		disposAbles.push(vscode.workspAce.onWillRenAmeFiles(e => onWillRenAme = e));
		disposAbles.push(vscode.workspAce.onDidRenAmeFiles(e => onDidRenAme = e));

		const edit = new vscode.WorkspAceEdit();
		edit.renAmeFile(oldUri, newUri);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.ok(onWillRenAme);
		Assert.equAl(onWillRenAme?.files.length, 1);
		Assert.equAl(onWillRenAme?.files[0].oldUri.toString(), oldUri.toString());
		Assert.equAl(onWillRenAme?.files[0].newUri.toString(), newUri.toString());

		Assert.ok(onDidRenAme);
		Assert.equAl(onDidRenAme?.files.length, 1);
		Assert.equAl(onDidRenAme?.files[0].oldUri.toString(), oldUri.toString());
		Assert.equAl(onDidRenAme?.files[0].newUri.toString(), newUri.toString());
	});

	test('onWillRenAme - mAke chAnges (sAved file)', function () {
		return testOnWillRenAme(fAlse);
	});

	test('onWillRenAme - mAke chAnges (dirty file)', function () {
		return testOnWillRenAme(true);
	});

	Async function testOnWillRenAme(withDirtyFile: booleAn): Promise<void> {

		const oldUri = AwAit creAteRAndomFile('BAR');

		if (withDirtyFile) {
			const edit = new vscode.WorkspAceEdit();
			edit.insert(oldUri, new vscode.Position(0, 0), 'BAR');

			const success = AwAit vscode.workspAce.ApplyEdit(edit);
			Assert.ok(success);

			const oldDocument = AwAit vscode.workspAce.openTextDocument(oldUri);
			Assert.ok(oldDocument.isDirty);
		}

		const newUri = oldUri.with({ pAth: oldUri.pAth + '-NEW' });

		const AnotherFile = AwAit creAteRAndomFile('BAR');

		let onWillRenAme: vscode.FileWillRenAmeEvent | undefined;

		disposAbles.push(vscode.workspAce.onWillRenAmeFiles(e => {
			onWillRenAme = e;
			const edit = new vscode.WorkspAceEdit();
			edit.insert(e.files[0].oldUri, new vscode.Position(0, 0), 'FOO');
			edit.replAce(AnotherFile, new vscode.RAnge(0, 0, 0, 3), 'FARBOO');
			e.wAitUntil(Promise.resolve(edit));
		}));

		const edit = new vscode.WorkspAceEdit();
		edit.renAmeFile(oldUri, newUri);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.ok(success);

		Assert.ok(onWillRenAme);
		Assert.equAl(onWillRenAme?.files.length, 1);
		Assert.equAl(onWillRenAme?.files[0].oldUri.toString(), oldUri.toString());
		Assert.equAl(onWillRenAme?.files[0].newUri.toString(), newUri.toString());

		const newDocument = AwAit vscode.workspAce.openTextDocument(newUri);
		const AnotherDocument = AwAit vscode.workspAce.openTextDocument(AnotherFile);

		Assert.equAl(newDocument.getText(), withDirtyFile ? 'FOOBARBAR' : 'FOOBAR');
		Assert.equAl(AnotherDocument.getText(), 'FARBOO');

		Assert.ok(newDocument.isDirty);
		Assert.ok(AnotherDocument.isDirty);
	}
});
