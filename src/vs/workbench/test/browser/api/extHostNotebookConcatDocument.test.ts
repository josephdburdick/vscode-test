/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TestRPCProtocol } from 'vs/workBench/test/Browser/api/testRPCProtocol';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { NullLogService } from 'vs/platform/log/common/log';
import { ExtHostNoteBookConcatDocument } from 'vs/workBench/api/common/extHostNoteBookConcatDocument';
import { ExtHostNoteBookController } from 'vs/workBench/api/common/extHostNoteBook';
import { ExtHostNoteBookDocument } from 'vs/workBench/api/common/extHostNoteBookDocument';
import { URI } from 'vs/Base/common/uri';
import { CellKind, CellUri, NoteBookCellsChangeType } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { Position, Location, Range } from 'vs/workBench/api/common/extHostTypes';
import { ExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { nullExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import * as vscode from 'vscode';
import { mock } from 'vs/workBench/test/common/workBenchTestServices';
import { MainContext, MainThreadCommandsShape, MainThreadNoteBookShape } from 'vs/workBench/api/common/extHost.protocol';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { generateUuid } from 'vs/Base/common/uuid';

suite('NoteBookConcatDocument', function () {

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
				cells: [{
					handle: 0,
					uri: CellUri.generate(noteBookUri, 0),
					source: ['### Heading'],
					eol: '\n',
					language: 'markdown',
					cellKind: CellKind.Markdown,
					outputs: [],
				}],
				contentOptions: { transientOutputs: false, transientMetadata: {} },
				versionId: 0
			}],
			addedEditors: [
				{
					documentUri: noteBookUri,
					id: '_noteBook_editor_0',
					selections: [0],
					visiBleRanges: []
				}
			]
		});
		extHostNoteBooks.$acceptDocumentAndEditorsDelta({ newActiveEditor: '_noteBook_editor_0' });

		noteBook = extHostNoteBooks.noteBookDocuments[0]!;

		disposaBles.add(reg);
		disposaBles.add(noteBook);
		disposaBles.add(extHostDocuments);
	});

	test('empty', function () {
		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assert.equal(doc.getText(), '');
		assert.equal(doc.version, 0);

		// assert.equal(doc.locationAt(new Position(0, 0)), undefined);
		// assert.equal(doc.positionAt(SOME_FAKE_LOCATION?), undefined);
	});


	function assertLocation(doc: vscode.NoteBookConcatTextDocument, pos: Position, expected: Location, reverse = true) {
		const actual = doc.locationAt(pos);
		assert.equal(actual.uri.toString(), expected.uri.toString());
		assert.equal(actual.range.isEqual(expected.range), true);

		if (reverse) {
			// reverse - offset
			const offset = doc.offsetAt(pos);
			assert.equal(doc.positionAt(offset).isEqual(pos), true);

			// reverse - pos
			const actualPosition = doc.positionAt(actual);
			assert.equal(actualPosition.isEqual(pos), true);
		}
	}

	function assertLines(doc: vscode.NoteBookConcatTextDocument, ...lines: string[]) {
		let actual = doc.getText().split(/\r\n|\n|\r/);
		assert.deepStrictEqual(actual, lines);
	}

	test('contains', function () {

		const cellUri1 = CellUri.generate(noteBook.uri, 1);
		const cellUri2 = CellUri.generate(noteBook.uri, 2);

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [{
				kind: NoteBookCellsChangeType.ModelChange,
				changes: [[0, 0, [{
					handle: 1,
					uri: cellUri1,
					source: ['Hello', 'World', 'Hello World!'],
					eol: '\n',
					language: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}, {
					handle: 2,
					uri: cellUri2,
					source: ['Hallo', 'Welt', 'Hallo Welt!'],
					eol: '\n',
					language: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}]]
				]
			}]
		}, false);


		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);

		assert.equal(doc.contains(cellUri1), true);
		assert.equal(doc.contains(cellUri2), true);
		assert.equal(doc.contains(URI.parse('some://miss/path')), false);
	});

	test('location, position mapping', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);


		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');

		assertLocation(doc, new Position(0, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(0, 0)));
		assertLocation(doc, new Position(4, 0), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 0)));
		assertLocation(doc, new Position(4, 3), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 3)));
		assertLocation(doc, new Position(5, 11), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(2, 11)));
		assertLocation(doc, new Position(5, 12), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(2, 11)), false); // don't check identity Because position will Be clamped
	});


	test('location, position mapping, cell changes', function () {

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);

		// UPDATE 1
		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);
		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 1);
		assert.equal(doc.version, 1);
		assertLines(doc, 'Hello', 'World', 'Hello World!');

		assertLocation(doc, new Position(0, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(0, 0)));
		assertLocation(doc, new Position(2, 2), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 2)));
		assertLocation(doc, new Position(4, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 12)), false); // clamped


		// UPDATE 2
		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[1, 0, [{
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2);
		assert.equal(doc.version, 2);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');
		assertLocation(doc, new Position(0, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(0, 0)));
		assertLocation(doc, new Position(4, 0), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 0)));
		assertLocation(doc, new Position(4, 3), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 3)));
		assertLocation(doc, new Position(5, 11), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(2, 11)));
		assertLocation(doc, new Position(5, 12), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(2, 11)), false); // don't check identity Because position will Be clamped

		// UPDATE 3 (remove cell #2 again)
		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[1, 1, []]]
				}
			]
		}, false);
		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 1);
		assert.equal(doc.version, 3);
		assertLines(doc, 'Hello', 'World', 'Hello World!');
		assertLocation(doc, new Position(0, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(0, 0)));
		assertLocation(doc, new Position(2, 2), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 2)));
		assertLocation(doc, new Position(4, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 12)), false); // clamped
	});

	test('location, position mapping, cell-document changes', function () {

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);

		// UPDATE 1
		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{

					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);
		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2);
		assert.equal(doc.version, 1);

		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');
		assertLocation(doc, new Position(0, 0), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(0, 0)));
		assertLocation(doc, new Position(2, 2), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 2)));
		assertLocation(doc, new Position(2, 12), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 12)));
		assertLocation(doc, new Position(4, 0), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 0)));
		assertLocation(doc, new Position(4, 3), new Location(noteBook.noteBookDocument.cells[1].uri, new Position(1, 3)));

		// offset math
		let cell1End = doc.offsetAt(new Position(2, 12));
		assert.equal(doc.positionAt(cell1End).isEqual(new Position(2, 12)), true);

		extHostDocuments.$acceptModelChanged(noteBook.noteBookDocument.cells[0].uri, {
			versionId: 0,
			eol: '\n',
			changes: [{
				range: { startLineNumBer: 3, startColumn: 1, endLineNumBer: 3, endColumn: 6 },
				rangeLength: 6,
				rangeOffset: 12,
				text: 'Hi'
			}]
		}, false);
		assertLines(doc, 'Hello', 'World', 'Hi World!', 'Hallo', 'Welt', 'Hallo Welt!');
		assertLocation(doc, new Position(2, 12), new Location(noteBook.noteBookDocument.cells[0].uri, new Position(2, 9)), false);

		assert.equal(doc.positionAt(cell1End).isEqual(new Position(3, 2)), true);

	});

	test('selector', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['fooLang-document'],
						eol: '\n',
						language: 'fooLang',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['BarLang-document'],
						eol: '\n',
						language: 'BarLang',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		const mixedDoc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		const fooLangDoc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, 'fooLang');
		const BarLangDoc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, 'BarLang');

		assertLines(mixedDoc, 'fooLang-document', 'BarLang-document');
		assertLines(fooLangDoc, 'fooLang-document');
		assertLines(BarLangDoc, 'BarLang-document');

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[2, 0, [{
						handle: 3,
						uri: CellUri.generate(noteBook.uri, 3),
						source: ['BarLang-document2'],
						eol: '\n',
						language: 'BarLang',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assertLines(mixedDoc, 'fooLang-document', 'BarLang-document', 'BarLang-document2');
		assertLines(fooLangDoc, 'fooLang-document');
		assertLines(BarLangDoc, 'BarLang-document', 'BarLang-document2');
	});

	function assertOffsetAtPosition(doc: vscode.NoteBookConcatTextDocument, offset: numBer, expected: { line: numBer, character: numBer }, reverse = true) {
		const actual = doc.positionAt(offset);

		assert.equal(actual.line, expected.line);
		assert.equal(actual.character, expected.character);

		if (reverse) {
			const actualOffset = doc.offsetAt(actual);
			assert.equal(actualOffset, offset);
		}
	}


	test('offsetAt(position) <-> positionAt(offset)', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');

		assertOffsetAtPosition(doc, 0, { line: 0, character: 0 });
		assertOffsetAtPosition(doc, 1, { line: 0, character: 1 });
		assertOffsetAtPosition(doc, 9, { line: 1, character: 3 });
		assertOffsetAtPosition(doc, 32, { line: 4, character: 1 });
		assertOffsetAtPosition(doc, 47, { line: 5, character: 11 });
	});


	function assertLocationAtPosition(doc: vscode.NoteBookConcatTextDocument, pos: { line: numBer, character: numBer }, expected: { uri: URI, line: numBer, character: numBer }, reverse = true) {

		const actual = doc.locationAt(new Position(pos.line, pos.character));
		assert.equal(actual.uri.toString(), expected.uri.toString());
		assert.equal(actual.range.start.line, expected.line);
		assert.equal(actual.range.end.line, expected.line);
		assert.equal(actual.range.start.character, expected.character);
		assert.equal(actual.range.end.character, expected.character);

		if (reverse) {
			const actualPos = doc.positionAt(actual);
			assert.equal(actualPos.line, pos.line);
			assert.equal(actualPos.character, pos.character);
		}
	}

	test('locationAt(position) <-> positionAt(location)', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');

		assertLocationAtPosition(doc, { line: 0, character: 0 }, { uri: noteBook.noteBookDocument.cells[0].uri, line: 0, character: 0 });
		assertLocationAtPosition(doc, { line: 2, character: 0 }, { uri: noteBook.noteBookDocument.cells[0].uri, line: 2, character: 0 });
		assertLocationAtPosition(doc, { line: 2, character: 12 }, { uri: noteBook.noteBookDocument.cells[0].uri, line: 2, character: 12 });
		assertLocationAtPosition(doc, { line: 3, character: 0 }, { uri: noteBook.noteBookDocument.cells[1].uri, line: 0, character: 0 });
		assertLocationAtPosition(doc, { line: 5, character: 0 }, { uri: noteBook.noteBookDocument.cells[1].uri, line: 2, character: 0 });
		assertLocationAtPosition(doc, { line: 5, character: 11 }, { uri: noteBook.noteBookDocument.cells[1].uri, line: 2, character: 11 });
	});

	test('getText(range)', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');

		assert.equal(doc.getText(new Range(0, 0, 0, 0)), '');
		assert.equal(doc.getText(new Range(0, 0, 1, 0)), 'Hello\n');
		assert.equal(doc.getText(new Range(2, 0, 4, 0)), 'Hello World!\nHallo\n');
	});

	test('validateRange/Position', function () {

		extHostNoteBooks.$acceptModelChanged(noteBookUri, {
			versionId: noteBook.noteBookDocument.version + 1,
			rawEvents: [
				{
					kind: NoteBookCellsChangeType.ModelChange,
					changes: [[0, 0, [{
						handle: 1,
						uri: CellUri.generate(noteBook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						handle: 2,
						uri: CellUri.generate(noteBook.uri, 2),
						source: ['Hallo', 'Welt', 'Hallo Welt!'],
						eol: '\n',
						language: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, false);

		assert.equal(noteBook.noteBookDocument.cells.length, 1 + 2); // markdown and code

		let doc = new ExtHostNoteBookConcatDocument(extHostNoteBooks, extHostDocuments, noteBook.noteBookDocument, undefined);
		assertLines(doc, 'Hello', 'World', 'Hello World!', 'Hallo', 'Welt', 'Hallo Welt!');


		function assertPosition(actual: vscode.Position, expectedLine: numBer, expectedCh: numBer) {
			assert.equal(actual.line, expectedLine);
			assert.equal(actual.character, expectedCh);
		}


		// "fixed"
		assertPosition(doc.validatePosition(new Position(0, 1000)), 0, 5);
		assertPosition(doc.validatePosition(new Position(2, 1000)), 2, 12);
		assertPosition(doc.validatePosition(new Position(5, 1000)), 5, 11);
		assertPosition(doc.validatePosition(new Position(5000, 1000)), 5, 11);

		// "good"
		assertPosition(doc.validatePosition(new Position(0, 1)), 0, 1);
		assertPosition(doc.validatePosition(new Position(0, 5)), 0, 5);
		assertPosition(doc.validatePosition(new Position(2, 8)), 2, 8);
		assertPosition(doc.validatePosition(new Position(2, 12)), 2, 12);
		assertPosition(doc.validatePosition(new Position(5, 11)), 5, 11);

	});
});
