/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { TestRPCProtocol } from 'vs/workBench/test/Browser/api/testRPCProtocol';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { NullLogService } from 'vs/platform/log/common/log';
import { mock } from 'vs/Base/test/common/mock';
import { IModelAddedData, MainContext, MainThreadCommandsShape, MainThreadNoteBookShape } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostNoteBookController } from 'vs/workBench/api/common/extHostNoteBook';
import { ExtHostNoteBookDocument } from 'vs/workBench/api/common/extHostNoteBookDocument';
import { CellKind, CellUri, NoteBookCellsChangeType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { URI } from 'vs/Base/common/uri';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { nullExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import { isEqual } from 'vs/Base/common/resources';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { generateUuid } from 'vs/Base/common/uuid';

suite('NoteBookCell#Document', function () {


	let rpcProtocol: TestRPCProtocol;
	let noteBook: ExtHostNoteBookDocument;
	let extHostDocumentsAndEditors: ExtHostDocumentsAndEditors;
	let extHostDocuments: ExtHostDocuments;
	let extHostNoteBooks: ExtHostNoteBookController;
	const noteBookUri = URI.parse('test:///noteBook.file');
	const disposaBles = new DisposaBleStore();

	setup(async function () {
		disposaBles.clear();

		rpcProtocol = new TestRPCProtocol();
		rpcProtocol.set(MainContext.MainThreadCommands, new class extends mock<MainThreadCommandsShape>() {
			$registerCommand() { }
		});
		rpcProtocol.set(MainContext.MainThreadNoteBook, new class extends mock<MainThreadNoteBookShape>() {
			async $registerNoteBookProvider() { }
			async $unregisterNoteBookProvider() { }
		});
		extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
		extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
		const extHostStoragePaths = new class extends mock<IExtensionStoragePaths>() {
			workspaceValue() {
				return URI.from({ scheme: 'test', path: generateUuid() });
			}
		};
		extHostNoteBooks = new ExtHostNoteBookController(rpcProtocol, new ExtHostCommands(rpcProtocol, new NullLogService()), extHostDocumentsAndEditors, { isExtensionDevelopmentDeBug: false, weBviewCspSource: '', weBviewResourceRoot: '' }, new NullLogService(), extHostStoragePaths);
		let reg = extHostNoteBooks.registerNoteBookContentProvider(nullExtensionDescription, 'test', new class extends mock<vscode.NoteBookContentProvider>() {
			// async openNoteBook() { }
		});
		extHostNoteBooks.$acceptDocumentAndEditorsDelta({
			addedDocuments: [{
				uri: noteBookUri,
				viewType: 'test',
				versionId: 0,
				cells: [{
					handle: 0,
					uri: CellUri.generate(noteBookUri, 0),
					source: ['### Heading'],
					eol: '\n',
					language: 'markdown',
					cellKind: CellKind.Markdown,
					outputs: [],
				}, {
					handle: 1,
					uri: CellUri.generate(noteBookUri, 1),
					source: ['console.log("aaa")', 'console.log("BBB")'],
					eol: '\n',
					language: 'javascript',
					cellKind: CellKind.Code,
					outputs: [],
				}],
				contentOptions: { transientMetadata: {}, transientOutputs: false }
			}],
			addedEditors: [{
				documentUri: noteBookUri,
				id: '_noteBook_editor_0',
				selections: [0],
				visiBleRanges: []
			}]
		});
		extHostNoteBooks.$acceptDocumentAndEditorsDelta({ newActiveEditor: '_noteBook_editor_0' });

		noteBook = extHostNoteBooks.noteBookDocuments[0]!;

		disposaBles.add(reg);
		disposaBles.add(noteBook);
		disposaBles.add(extHostDocuments);
	});


	test('cell document is vscode.TextDocument', async function () {

		assert.strictEqual(noteBook.noteBookDocument.cells.length, 2);

		const [c1, c2] = noteBook.noteBookDocument.cells;
		const d1 = extHostDocuments.getDocument(c1.uri);

		assert.ok(d1);
		assert.equal(d1.languageId, c1.language);
		assert.equal(d1.version, 1);
		assert.ok(d1.noteBook === noteBook.noteBookDocument);

		const d2 = extHostDocuments.getDocument(c2.uri);
		assert.ok(d2);
		assert.equal(d2.languageId, c2.language);
		assert.equal(d2.version, 1);
		assert.ok(d2.noteBook === noteBook.noteBookDocument);
	});

	test('cell document goes when noteBook closes', async function () {
		const cellUris: string[] = [];
		for (let cell of noteBook.noteBookDocument.cells) {
			assert.ok(extHostDocuments.getDocument(cell.uri));
			cellUris.push(cell.uri.toString());
		}

		const removedCellUris: string[] = [];
		const reg = extHostDocuments.onDidRemoveDocument(doc => {
			removedCellUris.push(doc.uri.toString());
		});

		extHostNoteBooks.$acceptDocumentAndEditorsDelta({ removedDocuments: [noteBook.uri] });
		reg.dispose();

		assert.strictEqual(removedCellUris.length, 2);
		assert.deepStrictEqual(removedCellUris.sort(), cellUris.sort());
	});

	test('cell document is vscode.TextDocument after changing it', async function () {

		const p = new Promise<void>((resolve, reject) => {
			extHostNoteBooks.onDidChangeNoteBookCells(e => {
				try {
					assert.strictEqual(e.changes.length, 1);
					assert.strictEqual(e.changes[0].items.length, 2);

					const [first, second] = e.changes[0].items;

					const doc1 = extHostDocuments.getAllDocumentData().find(data => isEqual(data.document.uri, first.uri));
					assert.ok(doc1);
					assert.strictEqual(doc1?.document === first.document, true);

					const doc2 = extHostDocuments.getAllDocumentData().find(data => isEqual(data.document.uri, second.uri));
					assert.ok(doc2);
					assert.strictEqual(doc2?.document === second.document, true);

					resolve();

				} catch (err) {
					reject(err);
				}
			});
		});

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 2,
						uri: CellUri.generate(noteBookUri, 2),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 3,
						uri: CellUri.generate(noteBookUri, 3),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		await p;

	});

	test('cell document stays open when noteBook is still open', async function () {

		const docs: vscode.TextDocument[] = [];
		const addData: IModelAddedData[] = [];
		for (let cell of noteBook.noteBookDocument.cells) {
			const doc = extHostDocuments.getDocument(cell.uri);
			assert.ok(doc);
			assert.equal(extHostDocuments.getDocument(cell.uri).isClosed, false);
			docs.push(doc);
			addData.push({
				EOL: '\n',
				isDirty: doc.isDirty,
				lines: doc.getText().split('\n'),
				modeId: doc.languageId,
				uri: doc.uri,
				versionId: doc.version
			});
		}

		// this call happens when opening a document on the main side
		extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ addedDocuments: addData });

		// this call happens when closing a document from the main side
		extHostDocumentsAndEditors.$acceptDocumentsAndEditorsDelta({ removedDocuments: docs.map(d => d.uri) });

		// noteBook is still open -> cell documents stay open
		for (let cell of noteBook.noteBookDocument.cells) {
			assert.ok(extHostDocuments.getDocument(cell.uri));
			assert.equal(extHostDocuments.getDocument(cell.uri).isClosed, false);
		}

		// close noteBook -> docs are closed
		extHostNoteBooks.$acceptDocumentAndEditorsDelta({ removedDocuments: [noteBook.uri] });
		for (let cell of noteBook.noteBookDocument.cells) {
			assert.throws(() => extHostDocuments.getDocument(cell.uri));
		}
		for (let doc of docs) {
			assert.equal(doc.isClosed, true);
		}
	});

	test('cell document goes when cell is removed', async function () {

		assert.equal(noteBook.noteBookDocument.cells.length, 2);
		const [cell1, cell2] = noteBook.noteBookDocument.cells;

		extHostNoteBooks.$acceptModelChanged(noteBook.uri, {
			versionId: 2,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 1, []]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1);
		assert.equal(cell1.document.isClosed, true); // ref still alive!
		assert.equal(cell2.document.isClosed, false);

		assert.throws(() => extHostDocuments.getDocument(cell1.uri));
	});

	test('cell document knows noteBook', function () {
		for (let cells of noteBook.noteBookDocument.cells) {
			assert.equal(cells.document.noteBook === noteBook.noteBookDocument, true);
		}
	});

	test('cell#index', function () {

		assert.equal(noteBook.noteBookDocument.cells.length, 2);
		const [first, second] = noteBook.noteBookDocument.cells;
		assert.equal(first.index, 0);
		assert.equal(second.index, 1);

		// remove first cell
		extHostNoteBooks.$acceptModelChanged(noteBook.uri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [{
				kind: NoteBookCellsChangeType.ModelChange,
				changes: [[0, 1, []]]
			}]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1);
		assert.equal(second.index, 0);

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [{
				kind: NoteBookCellsChangeType.ModelChange,
				changes: [[0, 0, [{
					handle: 2,
					uri: CellUri.generate(noteBookUri, 2),
					source: ['Hello', 'World', 'Hello World!'],
					eol: '\n',
					language: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}, {
					handle: 3,
					uri: CellUri.generate(noteBookUri, 3),
					source: ['Hallo', 'Welt', 'Hallo Welt!'],
					eol: '\n',
					language: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}]]]
			}]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 3);
		assert.equal(second.index, 2);
	});
});
