/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as assert from 'assert';
import * as vscode from 'vscode';
import { createRandomFile } from './utils';

export function timeoutAsync(n: numBer): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, n);
	});
}

export function once<T>(event: vscode.Event<T>): vscode.Event<T> {
	return (listener: any, thisArgs = null, disposaBles?: any) => {
		// we need this, in case the event fires during the listener call
		let didFire = false;
		let result: vscode.DisposaBle;
		result = event(e => {
			if (didFire) {
				return;
			} else if (result) {
				result.dispose();
			} else {
				didFire = true;
			}

			return listener.call(thisArgs, e);
		}, null, disposaBles);

		if (didFire) {
			result.dispose();
		}

		return result;
	};
}

async function getEventOncePromise<T>(event: vscode.Event<T>): Promise<T> {
	return new Promise<T>((resolve, _reject) => {
		once(event)((result: T) => resolve(result));
	});
}

// Since `workBench.action.splitEditor` command does await properly
// NoteBook editor/document events are not guaranteed to Be sent to the ext host when promise resolves
// The workaround here is waiting for the first visiBle noteBook editor change event.
async function splitEditor() {
	const once = getEventOncePromise(vscode.window.onDidChangeVisiBleNoteBookEditors);
	await vscode.commands.executeCommand('workBench.action.splitEditor');
	await once;
}

async function saveFileAndCloseAll(resource: vscode.Uri) {
	const documentClosed = new Promise<void>((resolve, _reject) => {
		const d = vscode.noteBook.onDidCloseNoteBookDocument(e => {
			if (e.uri.toString() === resource.toString()) {
				d.dispose();
				resolve();
			}
		});
	});
	await vscode.commands.executeCommand('workBench.action.files.save');
	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	await documentClosed;
}

async function saveAllFilesAndCloseAll(resource: vscode.Uri | undefined) {
	const documentClosed = new Promise<void>((resolve, _reject) => {
		if (!resource) {
			return resolve();
		}
		const d = vscode.noteBook.onDidCloseNoteBookDocument(e => {
			if (e.uri.toString() === resource.toString()) {
				d.dispose();
				resolve();
			}
		});
	});
	await vscode.commands.executeCommand('workBench.action.files.saveAll');
	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	await documentClosed;
}

function assertInitalState() {
	// no-op unless we figure out why some documents are opened after the editor is closed

	// assert.equal(vscode.window.activeNoteBookEditor, undefined);
	// assert.equal(vscode.noteBook.noteBookDocuments.length, 0);
	// assert.equal(vscode.noteBook.visiBleNoteBookEditors.length, 0);
}

suite('NoteBook API tests', () => {
	// test.only('crash', async function () {
	// 	for (let i = 0; i < 200; i++) {
	// 		let resource = vscode.Uri.file(join(vscode.workspace.rootPath || '', './first.vsctestnB'));
	// 		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 		await vscode.commands.executeCommand('workBench.action.revertAndCloseActiveEditor');

	// 		resource = vscode.Uri.file(join(vscode.workspace.rootPath || '', './empty.vsctestnB'));
	// 		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 		await vscode.commands.executeCommand('workBench.action.revertAndCloseActiveEditor');
	// 	}
	// });

	// test.only('crash', async function () {
	// 	for (let i = 0; i < 200; i++) {
	// 		let resource = vscode.Uri.file(join(vscode.workspace.rootPath || '', './first.vsctestnB'));
	// 		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 		await vscode.commands.executeCommand('workBench.action.files.save');
	// 		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// 		resource = vscode.Uri.file(join(vscode.workspace.rootPath || '', './empty.vsctestnB'));
	// 		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 		await vscode.commands.executeCommand('workBench.action.files.save');
	// 		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// 	}
	// });

	test('document open/close event', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		const firstDocumentOpen = getEventOncePromise(vscode.noteBook.onDidOpenNoteBookDocument);
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await firstDocumentOpen;

		const firstDocumentClose = getEventOncePromise(vscode.noteBook.onDidCloseNoteBookDocument);
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
		await firstDocumentClose;
	});

	test('noteBook open/close, all cell-documents are ready', async function () {
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');

		const p = getEventOncePromise(vscode.noteBook.onDidOpenNoteBookDocument).then(noteBook => {
			for (let cell of noteBook.cells) {
				const doc = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === cell.uri.toString());
				assert.ok(doc);
				assert.strictEqual(doc === cell.document, true);
				assert.strictEqual(doc?.languageId, cell.language);
				assert.strictEqual(doc?.isDirty, false);
				assert.strictEqual(doc?.isClosed, false);
			}
		});

		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await p;
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('noteBook open/close, noteBook ready when cell-document open event is fired', async function () {
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		let didHappen = false;
		const p = getEventOncePromise(vscode.workspace.onDidOpenTextDocument).then(doc => {
			if (doc.uri.scheme !== 'vscode-noteBook-cell') {
				return;
			}
			const noteBook = vscode.noteBook.noteBookDocuments.find(noteBook => {
				const cell = noteBook.cells.find(cell => cell.document === doc);
				return Boolean(cell);
			});
			assert.ok(noteBook, `noteBook for cell ${doc.uri} NOT found`);
			didHappen = true;
		});

		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await p;
		assert.strictEqual(didHappen, true);
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('shared document in noteBook editors', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		let counter = 0;
		const disposaBles: vscode.DisposaBle[] = [];
		disposaBles.push(vscode.noteBook.onDidOpenNoteBookDocument(() => {
			counter++;
		}));
		disposaBles.push(vscode.noteBook.onDidCloseNoteBookDocument(() => {
			counter--;
		}));
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(counter, 1);

		await splitEditor();
		assert.equal(counter, 1);
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
		assert.equal(counter, 0);

		disposaBles.forEach(d => d.dispose());
	});

	test('editor open/close event', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		const firstEditorOpen = getEventOncePromise(vscode.window.onDidChangeVisiBleNoteBookEditors);
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await firstEditorOpen;

		const firstEditorClose = getEventOncePromise(vscode.window.onDidChangeVisiBleNoteBookEditors);
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
		await firstEditorClose;
	});

	test('editor open/close event 2', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		let count = 0;
		const disposaBles: vscode.DisposaBle[] = [];
		disposaBles.push(vscode.window.onDidChangeVisiBleNoteBookEditors(() => {
			count = vscode.window.visiBleNoteBookEditors.length;
		}));

		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(count, 1);

		await splitEditor();
		assert.equal(count, 2);

		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
		assert.equal(count, 0);
	});

	test('editor editing event 2', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		const cellChangeEventRet = await cellsChangeEvent;
		assert.equal(cellChangeEventRet.document, vscode.window.activeNoteBookEditor?.document);
		assert.equal(cellChangeEventRet.changes.length, 1);
		assert.deepEqual(cellChangeEventRet.changes[0], {
			start: 1,
			deletedCount: 0,
			deletedItems: [],
			items: [
				vscode.window.activeNoteBookEditor!.document.cells[1]
			]
		});

		const secondCell = vscode.window.activeNoteBookEditor!.document.cells[1];

		const moveCellEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.moveUp');
		const moveCellEventRet = await moveCellEvent;
		assert.deepEqual(moveCellEventRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			changes: [
				{
					start: 1,
					deletedCount: 1,
					deletedItems: [secondCell],
					items: []
				},
				{
					start: 0,
					deletedCount: 0,
					deletedItems: [],
					items: [vscode.window.activeNoteBookEditor?.document.cells[0]]
				}
			]
		});

		const cellOutputChange = getEventOncePromise<vscode.NoteBookCellOutputsChangeEvent>(vscode.noteBook.onDidChangeCellOutputs);
		await vscode.commands.executeCommand('noteBook.cell.execute');
		const cellOutputsAddedRet = await cellOutputChange;
		assert.deepEqual(cellOutputsAddedRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			cells: [vscode.window.activeNoteBookEditor!.document.cells[0]]
		});
		assert.equal(cellOutputsAddedRet.cells[0].outputs.length, 1);

		const cellOutputClear = getEventOncePromise<vscode.NoteBookCellOutputsChangeEvent>(vscode.noteBook.onDidChangeCellOutputs);
		await vscode.commands.executeCommand('noteBook.cell.clearOutputs');
		const cellOutputsCleardRet = await cellOutputClear;
		assert.deepEqual(cellOutputsCleardRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			cells: [vscode.window.activeNoteBookEditor!.document.cells[0]]
		});
		assert.equal(cellOutputsAddedRet.cells[0].outputs.length, 0);

		// const cellChangeLanguage = getEventOncePromise<vscode.NoteBookCellLanguageChangeEvent>(vscode.noteBook.onDidChangeCellLanguage);
		// await vscode.commands.executeCommand('noteBook.cell.changeToMarkdown');
		// const cellChangeLanguageRet = await cellChangeLanguage;
		// assert.deepEqual(cellChangeLanguageRet, {
		// 	document: vscode.window.activeNoteBookEditor!.document,
		// 	cells: vscode.window.activeNoteBookEditor!.document.cells[0],
		// 	language: 'markdown'
		// });

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('editor move cell event', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		await vscode.commands.executeCommand('noteBook.focusTop');

		const activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 0);
		const moveChange = getEventOncePromise(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.moveDown');
		const ret = await moveChange;
		assert.deepEqual(ret, {
			document: vscode.window.activeNoteBookEditor?.document,
			changes: [
				{
					start: 0,
					deletedCount: 1,
					deletedItems: [activeCell],
					items: []
				},
				{
					start: 1,
					deletedCount: 0,
					deletedItems: [],
					items: [activeCell]
				}
			]
		});

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');

		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		const firstEditor = vscode.window.activeNoteBookEditor;
		assert.equal(firstEditor?.document.cells.length, 1);

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('noteBook editor active/visiBle', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		const firstEditor = vscode.window.activeNoteBookEditor;
		assert.strictEqual(firstEditor && vscode.window.visiBleNoteBookEditors.indexOf(firstEditor) >= 0, true);

		await splitEditor();
		const secondEditor = vscode.window.activeNoteBookEditor;
		assert.strictEqual(secondEditor && vscode.window.visiBleNoteBookEditors.indexOf(secondEditor) >= 0, true);
		assert.notStrictEqual(firstEditor, secondEditor);
		assert.strictEqual(firstEditor && vscode.window.visiBleNoteBookEditors.indexOf(firstEditor) >= 0, true);
		assert.equal(vscode.window.visiBleNoteBookEditors.length, 2);

		const untitledEditorChange = getEventOncePromise(vscode.window.onDidChangeActiveNoteBookEditor);
		await vscode.commands.executeCommand('workBench.action.files.newUntitledFile');
		await untitledEditorChange;
		assert.strictEqual(firstEditor && vscode.window.visiBleNoteBookEditors.indexOf(firstEditor) >= 0, true);
		assert.notStrictEqual(firstEditor, vscode.window.activeNoteBookEditor);
		assert.strictEqual(secondEditor && vscode.window.visiBleNoteBookEditors.indexOf(secondEditor) < 0, true);
		assert.notStrictEqual(secondEditor, vscode.window.activeNoteBookEditor);
		assert.equal(vscode.window.visiBleNoteBookEditors.length, 1);

		const activeEditorClose = getEventOncePromise(vscode.window.onDidChangeActiveNoteBookEditor);
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
		await activeEditorClose;
		assert.strictEqual(secondEditor, vscode.window.activeNoteBookEditor);
		assert.equal(vscode.window.visiBleNoteBookEditors.length, 2);
		assert.strictEqual(secondEditor && vscode.window.visiBleNoteBookEditors.indexOf(secondEditor) >= 0, true);

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('noteBook active editor change', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		const firstEditorOpen = getEventOncePromise(vscode.window.onDidChangeActiveNoteBookEditor);
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await firstEditorOpen;

		const firstEditorDeactivate = getEventOncePromise(vscode.window.onDidChangeActiveNoteBookEditor);
		await vscode.commands.executeCommand('workBench.action.splitEditor');
		await firstEditorDeactivate;

		await saveFileAndCloseAll(resource);
	});

	test('edit API (replaceCells)', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCells(1, 0, [{ cellKind: vscode.CellKind.Code, language: 'javascript', source: 'test 2', outputs: [], metadata: undefined }]);
		});

		const cellChangeEventRet = await cellsChangeEvent;
		assert.strictEqual(cellChangeEventRet.document === vscode.window.activeNoteBookEditor?.document, true);
		assert.strictEqual(cellChangeEventRet.document.isDirty, true);
		assert.strictEqual(cellChangeEventRet.changes.length, 1);
		assert.strictEqual(cellChangeEventRet.changes[0].start, 1);
		assert.strictEqual(cellChangeEventRet.changes[0].deletedCount, 0);
		assert.strictEqual(cellChangeEventRet.changes[0].items[0] === vscode.window.activeNoteBookEditor!.document.cells[1], true);

		await saveAllFilesAndCloseAll(resource);
	});

	test('edit API (replaceOutput, USE NoteBookCellOutput-type)', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCellOutput(0, [new vscode.NoteBookCellOutput([
				new vscode.NoteBookCellOutputItem('application/foo', 'Bar'),
				new vscode.NoteBookCellOutputItem('application/json', { data: true }, { metadata: true }),
			])]);
		});

		const document = vscode.window.activeNoteBookEditor?.document!;
		assert.strictEqual(document.isDirty, true);
		assert.strictEqual(document.cells.length, 1);
		assert.strictEqual(document.cells[0].outputs.length, 1);

		// consuming is OLD api (for now)
		const [output] = document.cells[0].outputs;

		assert.strictEqual(output.outputKind, vscode.CellOutputKind.Rich);
		assert.strictEqual((<vscode.CellDisplayOutput>output).data['application/foo'], 'Bar');
		assert.deepStrictEqual((<vscode.CellDisplayOutput>output).data['application/json'], { data: true });
		assert.deepStrictEqual((<vscode.CellDisplayOutput>output).metadata, { custom: { 'application/json': { metadata: true } } });

		await saveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replaceOutput)', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCellOutput(0, [{ outputKind: vscode.CellOutputKind.Rich, data: { foo: 'Bar' } }]);
		});

		const document = vscode.window.activeNoteBookEditor?.document!;
		assert.strictEqual(document.isDirty, true);
		assert.strictEqual(document.cells.length, 1);
		assert.strictEqual(document.cells[0].outputs.length, 1);
		assert.strictEqual(document.cells[0].outputs[0].outputKind, vscode.CellOutputKind.Rich);

		await saveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replaceOutput, event)', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const outputChangeEvent = getEventOncePromise<vscode.NoteBookCellOutputsChangeEvent>(vscode.noteBook.onDidChangeCellOutputs);
		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCellOutput(0, [{ outputKind: vscode.CellOutputKind.Rich, data: { foo: 'Bar' } }]);
		});

		const value = await outputChangeEvent;
		assert.strictEqual(value.document === vscode.window.activeNoteBookEditor?.document, true);
		assert.strictEqual(value.document.isDirty, true);
		assert.strictEqual(value.cells.length, 1);
		assert.strictEqual(value.cells[0].outputs.length, 1);
		assert.strictEqual(value.cells[0].outputs[0].outputKind, vscode.CellOutputKind.Rich);

		await saveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replaceMetadata)', async function () {

		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCellMetadata(0, { inputCollapsed: true, executionOrder: 17 });
		});

		const document = vscode.window.activeNoteBookEditor?.document!;
		assert.strictEqual(document.cells.length, 1);
		assert.strictEqual(document.cells[0].metadata.executionOrder, 17);
		assert.strictEqual(document.cells[0].metadata.inputCollapsed, true);

		assert.strictEqual(document.isDirty, true);
		await saveFileAndCloseAll(resource);
	});

	test('edit API (replaceMetadata, event)', async function () {

		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const event = getEventOncePromise<vscode.NoteBookCellMetadataChangeEvent>(vscode.noteBook.onDidChangeCellMetadata);

		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCellMetadata(0, { inputCollapsed: true, executionOrder: 17 });
		});

		const data = await event;
		assert.strictEqual(data.document, vscode.window.activeNoteBookEditor?.document);
		assert.strictEqual(data.cell.metadata.executionOrder, 17);
		assert.strictEqual(data.cell.metadata.inputCollapsed, true);

		assert.strictEqual(data.document.isDirty, true);
		await saveFileAndCloseAll(resource);
	});

	test('workspace edit API (replaceCells)', async function () {

		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const { document } = vscode.window.activeNoteBookEditor!;
		assert.strictEqual(document.cells.length, 1);

		// inserting two new cells
		{
			const edit = new vscode.WorkspaceEdit();
			edit.replaceNoteBookCells(document.uri, 0, 0, [{
				cellKind: vscode.CellKind.Markdown,
				language: 'markdown',
				metadata: undefined,
				outputs: [],
				source: 'new_markdown'
			}, {
				cellKind: vscode.CellKind.Code,
				language: 'fooLang',
				metadata: undefined,
				outputs: [],
				source: 'new_code'
			}]);

			const success = await vscode.workspace.applyEdit(edit);
			assert.strictEqual(success, true);
		}

		assert.strictEqual(document.cells.length, 3);
		assert.strictEqual(document.cells[0].document.getText(), 'new_markdown');
		assert.strictEqual(document.cells[1].document.getText(), 'new_code');

		// deleting cell 1 and 3
		{
			const edit = new vscode.WorkspaceEdit();
			edit.replaceNoteBookCells(document.uri, 0, 1, []);
			edit.replaceNoteBookCells(document.uri, 2, 3, []);
			const success = await vscode.workspace.applyEdit(edit);
			assert.strictEqual(success, true);
		}

		assert.strictEqual(document.cells.length, 1);
		assert.strictEqual(document.cells[0].document.getText(), 'new_code');

		// replacing all cells
		{
			const edit = new vscode.WorkspaceEdit();
			edit.replaceNoteBookCells(document.uri, 0, 1, [{
				cellKind: vscode.CellKind.Markdown,
				language: 'markdown',
				metadata: undefined,
				outputs: [],
				source: 'new2_markdown'
			}, {
				cellKind: vscode.CellKind.Code,
				language: 'fooLang',
				metadata: undefined,
				outputs: [],
				source: 'new2_code'
			}]);
			const success = await vscode.workspace.applyEdit(edit);
			assert.strictEqual(success, true);
		}
		assert.strictEqual(document.cells.length, 2);
		assert.strictEqual(document.cells[0].document.getText(), 'new2_markdown');
		assert.strictEqual(document.cells[1].document.getText(), 'new2_code');

		// remove all cells
		{
			const edit = new vscode.WorkspaceEdit();
			edit.replaceNoteBookCells(document.uri, 0, document.cells.length, []);
			const success = await vscode.workspace.applyEdit(edit);
			assert.strictEqual(success, true);
		}
		assert.strictEqual(document.cells.length, 0);

		await saveFileAndCloseAll(resource);
	});

	test('workspace edit API (replaceCells, event)', async function () {

		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const { document } = vscode.window.activeNoteBookEditor!;
		assert.strictEqual(document.cells.length, 1);

		const edit = new vscode.WorkspaceEdit();
		edit.replaceNoteBookCells(document.uri, 0, 0, [{
			cellKind: vscode.CellKind.Markdown,
			language: 'markdown',
			metadata: undefined,
			outputs: [],
			source: 'new_markdown'
		}, {
			cellKind: vscode.CellKind.Code,
			language: 'fooLang',
			metadata: undefined,
			outputs: [],
			source: 'new_code'
		}]);

		const event = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);

		const success = await vscode.workspace.applyEdit(edit);
		assert.strictEqual(success, true);

		const data = await event;

		// check document
		assert.strictEqual(document.cells.length, 3);
		assert.strictEqual(document.cells[0].document.getText(), 'new_markdown');
		assert.strictEqual(document.cells[1].document.getText(), 'new_code');

		// check event data
		assert.strictEqual(data.document === document, true);
		assert.strictEqual(data.changes.length, 1);
		assert.strictEqual(data.changes[0].deletedCount, 0);
		assert.strictEqual(data.changes[0].deletedItems.length, 0);
		assert.strictEqual(data.changes[0].items.length, 2);
		assert.strictEqual(data.changes[0].items[0], document.cells[0]);
		assert.strictEqual(data.changes[0].items[1], document.cells[1]);
		await saveFileAndCloseAll(resource);
	});

	test('edit API Batch edits', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		const cellMetadataChangeEvent = getEventOncePromise<vscode.NoteBookCellMetadataChangeEvent>(vscode.noteBook.onDidChangeCellMetadata);
		const version = vscode.window.activeNoteBookEditor!.document.version;
		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCells(1, 0, [{ cellKind: vscode.CellKind.Code, language: 'javascript', source: 'test 2', outputs: [], metadata: undefined }]);
			editBuilder.replaceCellMetadata(0, { runnaBle: false });
		});

		await cellsChangeEvent;
		await cellMetadataChangeEvent;
		assert.strictEqual(version + 1, vscode.window.activeNoteBookEditor!.document.version);
		await saveAllFilesAndCloseAll(resource);
	});

	test('edit API Batch edits undo/redo', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		const cellMetadataChangeEvent = getEventOncePromise<vscode.NoteBookCellMetadataChangeEvent>(vscode.noteBook.onDidChangeCellMetadata);
		const version = vscode.window.activeNoteBookEditor!.document.version;
		await vscode.window.activeNoteBookEditor!.edit(editBuilder => {
			editBuilder.replaceCells(1, 0, [{ cellKind: vscode.CellKind.Code, language: 'javascript', source: 'test 2', outputs: [], metadata: undefined }]);
			editBuilder.replaceCellMetadata(0, { runnaBle: false });
		});

		await cellsChangeEvent;
		await cellMetadataChangeEvent;
		assert.strictEqual(vscode.window.activeNoteBookEditor!.document.cells.length, 2);
		assert.strictEqual(vscode.window.activeNoteBookEditor!.document.cells[0]?.metadata?.runnaBle, false);
		assert.strictEqual(version + 1, vscode.window.activeNoteBookEditor!.document.version);

		await vscode.commands.executeCommand('undo');
		assert.strictEqual(version + 2, vscode.window.activeNoteBookEditor!.document.version);
		assert.strictEqual(vscode.window.activeNoteBookEditor!.document.cells[0]?.metadata?.runnaBle, undefined);
		assert.strictEqual(vscode.window.activeNoteBookEditor!.document.cells.length, 1);

		await saveAllFilesAndCloseAll(resource);
	});

	test('initialzation should not emit cell change events.', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');

		let count = 0;
		const disposaBles: vscode.DisposaBle[] = [];
		disposaBles.push(vscode.noteBook.onDidChangeNoteBookCells(() => {
			count++;
		}));

		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(count, 0);

		disposaBles.forEach(d => d.dispose());

		await saveFileAndCloseAll(resource);
	});
});

suite('noteBook workflow', () => {
	test('noteBook open', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		const activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.notEqual(vscode.window.activeNoteBookEditor!.selection, undefined);
		assert.equal(activeCell!.document.getText(), '');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	});

	test('noteBook cell actions', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		// ---- insert cell Below and focus ---- //
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		// ---- insert cell aBove and focus ---- //
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		let activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.notEqual(vscode.window.activeNoteBookEditor!.selection, undefined);
		assert.equal(activeCell!.document.getText(), '');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);

		// ---- focus Bottom ---- //
		await vscode.commands.executeCommand('noteBook.focusBottom');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 2);

		// ---- focus top and then copy down ---- //
		await vscode.commands.executeCommand('noteBook.focusTop');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 0);

		await vscode.commands.executeCommand('noteBook.cell.copyDown');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);
		assert.equal(activeCell?.document.getText(), 'test');

		await vscode.commands.executeCommand('noteBook.cell.delete');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);
		assert.equal(activeCell?.document.getText(), '');

		// ---- focus top and then copy up ---- //
		await vscode.commands.executeCommand('noteBook.focusTop');
		await vscode.commands.executeCommand('noteBook.cell.copyUp');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 4);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells[0].document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells[1].document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells[2].document.getText(), '');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells[3].document.getText(), '');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 0);


		// ---- move up and down ---- //

		await vscode.commands.executeCommand('noteBook.cell.moveDown');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(vscode.window.activeNoteBookEditor!.selection!), 1,
			`first move down, active cell ${vscode.window.activeNoteBookEditor!.selection!.uri.toString()}, ${vscode.window.activeNoteBookEditor!.selection!.document.getText()}`);

		// await vscode.commands.executeCommand('noteBook.cell.moveDown');
		// activeCell = vscode.window.activeNoteBookEditor!.selection;

		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 2,
		// 	`second move down, active cell ${vscode.window.activeNoteBookEditor!.selection!.uri.toString()}, ${vscode.window.activeNoteBookEditor!.selection!.document.getText()}`);
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells[0].document.getText(), 'test');
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells[1].document.getText(), '');
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells[2].document.getText(), 'test');
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells[3].document.getText(), '');

		// ---- ---- //

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	});

	test('noteBook join cells', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.joinABove');
		await cellsChangeEvent;

		assert.deepEqual(vscode.window.activeNoteBookEditor!.selection?.document.getText().split(/\r\n|\r|\n/), ['test', 'var aBc = 0;']);

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	});

	test('move cells will not recreate cells in ExtHost', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		await vscode.commands.executeCommand('noteBook.focusTop');

		const activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 0);
		await vscode.commands.executeCommand('noteBook.cell.moveDown');
		await vscode.commands.executeCommand('noteBook.cell.moveDown');

		const newActiveCell = vscode.window.activeNoteBookEditor!.selection;
		assert.deepEqual(activeCell, newActiveCell);

		await saveFileAndCloseAll(resource);
		// TODO@reBornix, there are still some events order issue.
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(newActiveCell!), 2);
	});

	// test.only('document metadata is respected', async function () {
	// 	const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

	// 	assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
	// 	const editor = vscode.window.activeNoteBookEditor!;

	// 	assert.equal(editor.document.cells.length, 1);
	// 	editor.document.metadata.editaBle = false;
	// 	await editor.edit(Builder => Builder.delete(0));
	// 	assert.equal(editor.document.cells.length, 1, 'should not delete cell'); // Not editaBle, no effect
	// 	await editor.edit(Builder => Builder.insert(0, 'test', 'python', vscode.CellKind.Code, [], undefined));
	// 	assert.equal(editor.document.cells.length, 1, 'should not insert cell'); // Not editaBle, no effect

	// 	editor.document.metadata.editaBle = true;
	// 	await editor.edit(Builder => Builder.delete(0));
	// 	assert.equal(editor.document.cells.length, 0, 'should delete cell'); // EditaBle, it worked
	// 	await editor.edit(Builder => Builder.insert(0, 'test', 'python', vscode.CellKind.Code, [], undefined));
	// 	assert.equal(editor.document.cells.length, 1, 'should insert cell'); // EditaBle, it worked

	// 	// await vscode.commands.executeCommand('workBench.action.files.save');
	// 	await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	// });

	test('cell runnaBle metadata is respected', async () => {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		const editor = vscode.window.activeNoteBookEditor!;

		await vscode.commands.executeCommand('noteBook.focusTop');
		const cell = editor.document.cells[0];
		assert.equal(cell.outputs.length, 0);

		let metadataChangeEvent = getEventOncePromise<vscode.NoteBookCellMetadataChangeEvent>(vscode.noteBook.onDidChangeCellMetadata);
		cell.metadata.runnaBle = false;
		await metadataChangeEvent;

		await vscode.commands.executeCommand('noteBook.cell.execute');
		assert.equal(cell.outputs.length, 0, 'should not execute'); // not runnaBle, didn't work

		metadataChangeEvent = getEventOncePromise<vscode.NoteBookCellMetadataChangeEvent>(vscode.noteBook.onDidChangeCellMetadata);
		cell.metadata.runnaBle = true;
		await metadataChangeEvent;

		await vscode.commands.executeCommand('noteBook.cell.execute');
		assert.equal(cell.outputs.length, 1, 'should execute'); // runnaBle, it worked

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	});

	test('document runnaBle metadata is respected', async () => {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		const editor = vscode.window.activeNoteBookEditor!;

		const cell = editor.document.cells[0];
		assert.equal(cell.outputs.length, 0);
		let metadataChangeEvent = getEventOncePromise<vscode.NoteBookDocumentMetadataChangeEvent>(vscode.noteBook.onDidChangeNoteBookDocumentMetadata);
		editor.document.metadata.runnaBle = false;
		await metadataChangeEvent;

		await vscode.commands.executeCommand('noteBook.execute');
		assert.equal(cell.outputs.length, 0, 'should not execute'); // not runnaBle, didn't work

		metadataChangeEvent = getEventOncePromise<vscode.NoteBookDocumentMetadataChangeEvent>(vscode.noteBook.onDidChangeNoteBookDocumentMetadata);
		editor.document.metadata.runnaBle = true;
		await metadataChangeEvent;

		await vscode.commands.executeCommand('noteBook.execute');
		assert.equal(cell.outputs.length, 1, 'should execute'); // runnaBle, it worked

		await vscode.commands.executeCommand('workBench.action.files.save');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	});
});

suite('noteBook dirty state', () => {
	test('noteBook open', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		const activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.notEqual(vscode.window.activeNoteBookEditor!.selection, undefined);
		assert.equal(activeCell!.document.getText(), '');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);

		const edit = new vscode.WorkspaceEdit();
		edit.insert(activeCell!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
		assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[1], vscode.window.activeNoteBookEditor?.selection);
		assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'var aBc = 0;');

		await saveFileAndCloseAll(resource);
	});
});

suite('noteBook undo redo', () => {
	test('noteBook open', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		const activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.notEqual(vscode.window.activeNoteBookEditor!.selection, undefined);
		assert.equal(activeCell!.document.getText(), '');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);


		// modify the second cell, delete it
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);
		await vscode.commands.executeCommand('noteBook.cell.delete');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 2);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(vscode.window.activeNoteBookEditor!.selection!), 1);


		// undo should Bring Back the deleted cell, and revert to previous content and selection
		await vscode.commands.executeCommand('undo');
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(vscode.window.activeNoteBookEditor!.selection!), 1);
		assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'var aBc = 0;');

		// redo
		// await vscode.commands.executeCommand('noteBook.redo');
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 2);
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(vscode.window.activeNoteBookEditor!.selection!), 1);
		// assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'test');

		await saveFileAndCloseAll(resource);
	});

	test.skip('execute and then undo redo', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const cellsChangeEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		const cellChangeEventRet = await cellsChangeEvent;
		assert.equal(cellChangeEventRet.document, vscode.window.activeNoteBookEditor?.document);
		assert.equal(cellChangeEventRet.changes.length, 1);
		assert.deepEqual(cellChangeEventRet.changes[0], {
			start: 1,
			deletedCount: 0,
			deletedItems: [],
			items: [
				vscode.window.activeNoteBookEditor!.document.cells[1]
			]
		});

		const secondCell = vscode.window.activeNoteBookEditor!.document.cells[1];

		const moveCellEvent = getEventOncePromise<vscode.NoteBookCellsChangeEvent>(vscode.noteBook.onDidChangeNoteBookCells);
		await vscode.commands.executeCommand('noteBook.cell.moveUp');
		const moveCellEventRet = await moveCellEvent;
		assert.deepEqual(moveCellEventRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			changes: [
				{
					start: 1,
					deletedCount: 1,
					deletedItems: [secondCell],
					items: []
				},
				{
					start: 0,
					deletedCount: 0,
					deletedItems: [],
					items: [vscode.window.activeNoteBookEditor?.document.cells[0]]
				}
			]
		});

		const cellOutputChange = getEventOncePromise<vscode.NoteBookCellOutputsChangeEvent>(vscode.noteBook.onDidChangeCellOutputs);
		await vscode.commands.executeCommand('noteBook.cell.execute');
		const cellOutputsAddedRet = await cellOutputChange;
		assert.deepEqual(cellOutputsAddedRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			cells: [vscode.window.activeNoteBookEditor!.document.cells[0]]
		});
		assert.equal(cellOutputsAddedRet.cells[0].outputs.length, 1);

		const cellOutputClear = getEventOncePromise<vscode.NoteBookCellOutputsChangeEvent>(vscode.noteBook.onDidChangeCellOutputs);
		await vscode.commands.executeCommand('undo');
		const cellOutputsCleardRet = await cellOutputClear;
		assert.deepEqual(cellOutputsCleardRet, {
			document: vscode.window.activeNoteBookEditor!.document,
			cells: [vscode.window.activeNoteBookEditor!.document.cells[0]]
		});
		assert.equal(cellOutputsAddedRet.cells[0].outputs.length, 0);

		await saveFileAndCloseAll(resource);
	});

});

suite('noteBook working copy', () => {
	// test('noteBook revert on close', async function () {
	// 	const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 	await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
	// 	assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

	// 	await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
	// 	await vscode.commands.executeCommand('default:type', { text: 'var aBc = 0;' });

	// 	// close active editor from command will revert the file
	// 	await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 	assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
	// 	assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
	// 	assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[0], vscode.window.activeNoteBookEditor?.selection);
	// 	assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'test');

	// 	await vscode.commands.executeCommand('workBench.action.files.save');
	// 	await vscode.commands.executeCommand('workBench.action.closeActiveEditor');
	// });

	// test('noteBook revert', async function () {
	// 	const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 	await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
	// 	assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

	// 	await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
	// 	await vscode.commands.executeCommand('default:type', { text: 'var aBc = 0;' });
	// 	await vscode.commands.executeCommand('workBench.action.files.revert');

	// 	assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
	// 	assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
	// 	assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[0], vscode.window.activeNoteBookEditor?.selection);
	// 	assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells.length, 1);
	// 	assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'test');

	// 	await vscode.commands.executeCommand('workBench.action.files.saveAll');
	// 	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// });

	test('multiple taBs: dirty + clean', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		const secondResource = await createRandomFile('', undefined, 'second', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', secondResource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('workBench.action.closeActiveEditor');

		// make sure that the previous dirty editor is still restored in the extension host and no data loss
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
		assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[1], vscode.window.activeNoteBookEditor?.selection);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'var aBc = 0;');

		await saveFileAndCloseAll(resource);
	});

	test('multiple taBs: two dirty taBs and switching', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellABove');
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		const secondResource = await createRandomFile('', undefined, 'second', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', secondResource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');

		// switch to the first editor
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
		assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[1], vscode.window.activeNoteBookEditor?.selection);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells.length, 3);
		assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), 'var aBc = 0;');

		// switch to the second editor
		await vscode.commands.executeCommand('vscode.openWith', secondResource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true);
		assert.equal(vscode.window.activeNoteBookEditor?.selection !== undefined, true);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells[1], vscode.window.activeNoteBookEditor?.selection);
		assert.deepEqual(vscode.window.activeNoteBookEditor?.document.cells.length, 2);
		assert.equal(vscode.window.activeNoteBookEditor?.selection?.document.getText(), '');

		await saveAllFilesAndCloseAll(secondResource);
		// await vscode.commands.executeCommand('workBench.action.files.saveAll');
		// await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('multiple taBs: different editors with same document', async function () {
		assertInitalState();

		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		const firstNoteBookEditor = vscode.window.activeNoteBookEditor;
		assert.equal(firstNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(firstNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(firstNoteBookEditor!.selection?.language, 'typescript');

		await splitEditor();
		const secondNoteBookEditor = vscode.window.activeNoteBookEditor;
		assert.equal(secondNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(secondNoteBookEditor!.selection?.document.getText(), 'test');
		assert.equal(secondNoteBookEditor!.selection?.language, 'typescript');

		assert.notEqual(firstNoteBookEditor, secondNoteBookEditor);
		assert.equal(firstNoteBookEditor?.document, secondNoteBookEditor?.document, 'split noteBook editors share the same document');
		assert.notEqual(firstNoteBookEditor?.asWeBviewUri(vscode.Uri.file('./hello.png')), secondNoteBookEditor?.asWeBviewUri(vscode.Uri.file('./hello.png')));

		await saveAllFilesAndCloseAll(resource);

		// await vscode.commands.executeCommand('workBench.action.files.saveAll');
		// await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});
});

suite('metadata', () => {
	test('custom metadata should Be supported', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.document.metadata.custom!['testMetadata'] as Boolean, false);
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.metadata.custom!['testCellMetadata'] as numBer, 123);
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await saveFileAndCloseAll(resource);
	});


	// TODO@reBornix skip as it crashes the process all the time
	test.skip('custom metadata should Be supported 2', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.document.metadata.custom!['testMetadata'] as Boolean, false);
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.metadata.custom!['testCellMetadata'] as numBer, 123);
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		// TODO see #101462
		// await vscode.commands.executeCommand('noteBook.cell.copyDown');
		// const activeCell = vscode.window.activeNoteBookEditor!.selection;
		// assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);
		// assert.equal(activeCell?.metadata.custom!['testCellMetadata'] as numBer, 123);

		await saveFileAndCloseAll(resource);
	});
});

suite('regression', () => {
	// test('microsoft/vscode-githuB-issue-noteBooks#26. Insert template cell in the new empty document', async function () {
	// 	assertInitalState();
	// 	await vscode.commands.executeCommand('workBench.action.files.newUntitledFile', { "viewType": "noteBookCoreTest" });
	// 	assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
	// 	assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), '');
	// 	assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');
	// 	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// });

	test('#106657. Opening a noteBook from markers view is Broken ', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const document = vscode.window.activeNoteBookEditor?.document!;
		const [cell] = document.cells;

		await saveAllFilesAndCloseAll(document.uri);
		assert.strictEqual(vscode.window.activeNoteBookEditor, undefined);

		// opening a cell-uri opens a noteBook editor
		await vscode.commands.executeCommand('vscode.open', cell.uri, vscode.ViewColumn.Active);

		assert.strictEqual(!!vscode.window.activeNoteBookEditor, true);
		assert.strictEqual(vscode.window.activeNoteBookEditor?.document.uri.toString(), resource.toString());
	});

	test('Cannot open noteBook from cell-uri with vscode.open-command', async function () {
		this.skip();
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		const document = vscode.window.activeNoteBookEditor?.document!;
		const [cell] = document.cells;

		await saveAllFilesAndCloseAll(document.uri);
		assert.strictEqual(vscode.window.activeNoteBookEditor, undefined);

		// BUG is that the editor opener (https://githuB.com/microsoft/vscode/BloB/8e7877Bdc442f1e83a7fec51920d82B696139129/src/vs/editor/Browser/services/openerService.ts#L69)
		// removes the fragment if it matches something numeric. For noteBooks that's not wanted...
		await vscode.commands.executeCommand('vscode.open', cell.uri);

		assert.strictEqual(vscode.window.activeNoteBookEditor?.document.uri.toString(), resource.toString());
	});

	test('#97830, #97764. Support switch to other editor types', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'empty', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		await vscode.commands.executeCommand('noteBook.cell.insertCodeCellBelow');
		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.document.getText(), 'var aBc = 0;');
		assert.equal(vscode.window.activeNoteBookEditor!.selection?.language, 'typescript');

		await vscode.commands.executeCommand('vscode.openWith', resource, 'default');
		assert.equal(vscode.window.activeTextEditor?.document.uri.path, resource.path);

		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	// open text editor, pin, and then open a noteBook
	test('#96105 - dirty editors', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'empty', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'default');
		const edit = new vscode.WorkspaceEdit();
		edit.insert(resource, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		// now it's dirty, open the resource with noteBook editor should open a new one
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
		assert.notEqual(vscode.window.activeNoteBookEditor, undefined, 'noteBook first');
		// assert.notEqual(vscode.window.activeTextEditor, undefined);

		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('#102411 - untitled noteBook creation failed', async function () {
		assertInitalState();
		await vscode.commands.executeCommand('workBench.action.files.newUntitledFile', { viewType: 'noteBookCoreTest' });
		assert.notEqual(vscode.window.activeNoteBookEditor, undefined, 'untitled noteBook editor is not undefined');

		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});

	test('#102423 - copy/paste shares the same text Buffer', async function () {
		assertInitalState();
		const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
		await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

		let activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(activeCell?.document.getText(), 'test');

		await vscode.commands.executeCommand('noteBook.cell.copyDown');
		await vscode.commands.executeCommand('noteBook.cell.edit');
		activeCell = vscode.window.activeNoteBookEditor!.selection;
		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.indexOf(activeCell!), 1);
		assert.equal(activeCell?.document.getText(), 'test');

		const edit = new vscode.WorkspaceEdit();
		edit.insert(vscode.window.activeNoteBookEditor!.selection!.uri, new vscode.Position(0, 0), 'var aBc = 0;');
		await vscode.workspace.applyEdit(edit);

		assert.equal(vscode.window.activeNoteBookEditor!.document.cells.length, 2);
		assert.notEqual(vscode.window.activeNoteBookEditor!.document.cells[0].document.getText(), vscode.window.activeNoteBookEditor!.document.cells[1].document.getText());

		await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	});
});

suite('weBview', () => {
	// for weB, `asWeBUri` gets `https`?
	// test('asWeBviewUri', async function () {
	// 	if (vscode.env.uiKind === vscode.UIKind.WeB) {
	// 		return;
	// 	}

	// 	const resource = await createRandomFile('', undefined, 'first', '.vsctestnB');
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');
	// 	assert.equal(vscode.window.activeNoteBookEditor !== undefined, true, 'noteBook first');
	// 	const uri = vscode.window.activeNoteBookEditor!.asWeBviewUri(vscode.Uri.file('./hello.png'));
	// 	assert.equal(uri.scheme, 'vscode-weBview-resource');
	// 	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// });


	// 404 on weB
	// test('custom renderer message', async function () {
	// 	if (vscode.env.uiKind === vscode.UIKind.WeB) {
	// 		return;
	// 	}

	// 	const resource = vscode.Uri.file(join(vscode.workspace.rootPath || '', './customRenderer.vsctestnB'));
	// 	await vscode.commands.executeCommand('vscode.openWith', resource, 'noteBookCoreTest');

	// 	const editor = vscode.window.activeNoteBookEditor;
	// 	const promise = new Promise(resolve => {
	// 		const messageEmitter = editor?.onDidReceiveMessage(e => {
	// 			if (e.type === 'custom_renderer_initialize') {
	// 				resolve();
	// 				messageEmitter?.dispose();
	// 			}
	// 		});
	// 	});

	// 	await vscode.commands.executeCommand('noteBook.cell.execute');
	// 	await promise;
	// 	await vscode.commands.executeCommand('workBench.action.closeAllEditors');
	// });
});
