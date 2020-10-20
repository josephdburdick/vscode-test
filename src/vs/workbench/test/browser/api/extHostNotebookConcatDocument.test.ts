/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TestRPCProtocol } from 'vs/workbench/test/browser/Api/testRPCProtocol';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { ExtHostNotebookConcAtDocument } from 'vs/workbench/Api/common/extHostNotebookConcAtDocument';
import { ExtHostNotebookController } from 'vs/workbench/Api/common/extHostNotebook';
import { ExtHostNotebookDocument } from 'vs/workbench/Api/common/extHostNotebookDocument';
import { URI } from 'vs/bAse/common/uri';
import { CellKind, CellUri, NotebookCellsChAngeType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { Position, LocAtion, RAnge } from 'vs/workbench/Api/common/extHostTypes';
import { ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { nullExtensionDescription } from 'vs/workbench/services/extensions/common/extensions';
import * As vscode from 'vscode';
import { mock } from 'vs/workbench/test/common/workbenchTestServices';
import { MAinContext, MAinThreAdCommAndsShApe, MAinThreAdNotebookShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IExtensionStorAgePAths } from 'vs/workbench/Api/common/extHostStorAgePAths';
import { generAteUuid } from 'vs/bAse/common/uuid';

suite('NotebookConcAtDocument', function () {

	let rpcProtocol: TestRPCProtocol;
	let notebook: ExtHostNotebookDocument;
	let extHostDocumentsAndEditors: ExtHostDocumentsAndEditors;
	let extHostDocuments: ExtHostDocuments;
	let extHostNotebooks: ExtHostNotebookController;
	const notebookUri = URI.pArse('test:///notebook.file');
	const disposAbles = new DisposAbleStore();

	setup(Async function () {
		disposAbles.cleAr();

		rpcProtocol = new TestRPCProtocol();
		rpcProtocol.set(MAinContext.MAinThreAdCommAnds, new clAss extends mock<MAinThreAdCommAndsShApe>() {
			$registerCommAnd() { }
		});
		rpcProtocol.set(MAinContext.MAinThreAdNotebook, new clAss extends mock<MAinThreAdNotebookShApe>() {
			Async $registerNotebookProvider() { }
			Async $unregisterNotebookProvider() { }
		});
		extHostDocumentsAndEditors = new ExtHostDocumentsAndEditors(rpcProtocol, new NullLogService());
		extHostDocuments = new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors);
		const extHostStorAgePAths = new clAss extends mock<IExtensionStorAgePAths>() {
			workspAceVAlue() {
				return URI.from({ scheme: 'test', pAth: generAteUuid() });
			}
		};
		extHostNotebooks = new ExtHostNotebookController(rpcProtocol, new ExtHostCommAnds(rpcProtocol, new NullLogService()), extHostDocumentsAndEditors, { isExtensionDevelopmentDebug: fAlse, webviewCspSource: '', webviewResourceRoot: '' }, new NullLogService(), extHostStorAgePAths);
		let reg = extHostNotebooks.registerNotebookContentProvider(nullExtensionDescription, 'test', new clAss extends mock<vscode.NotebookContentProvider>() {
			// Async openNotebook() { }
		});
		extHostNotebooks.$AcceptDocumentAndEditorsDeltA({
			AddedDocuments: [{
				uri: notebookUri,
				viewType: 'test',
				cells: [{
					hAndle: 0,
					uri: CellUri.generAte(notebookUri, 0),
					source: ['### HeAding'],
					eol: '\n',
					lAnguAge: 'mArkdown',
					cellKind: CellKind.MArkdown,
					outputs: [],
				}],
				contentOptions: { trAnsientOutputs: fAlse, trAnsientMetAdAtA: {} },
				versionId: 0
			}],
			AddedEditors: [
				{
					documentUri: notebookUri,
					id: '_notebook_editor_0',
					selections: [0],
					visibleRAnges: []
				}
			]
		});
		extHostNotebooks.$AcceptDocumentAndEditorsDeltA({ newActiveEditor: '_notebook_editor_0' });

		notebook = extHostNotebooks.notebookDocuments[0]!;

		disposAbles.Add(reg);
		disposAbles.Add(notebook);
		disposAbles.Add(extHostDocuments);
	});

	test('empty', function () {
		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		Assert.equAl(doc.getText(), '');
		Assert.equAl(doc.version, 0);

		// Assert.equAl(doc.locAtionAt(new Position(0, 0)), undefined);
		// Assert.equAl(doc.positionAt(SOME_FAKE_LOCATION?), undefined);
	});


	function AssertLocAtion(doc: vscode.NotebookConcAtTextDocument, pos: Position, expected: LocAtion, reverse = true) {
		const ActuAl = doc.locAtionAt(pos);
		Assert.equAl(ActuAl.uri.toString(), expected.uri.toString());
		Assert.equAl(ActuAl.rAnge.isEquAl(expected.rAnge), true);

		if (reverse) {
			// reverse - offset
			const offset = doc.offsetAt(pos);
			Assert.equAl(doc.positionAt(offset).isEquAl(pos), true);

			// reverse - pos
			const ActuAlPosition = doc.positionAt(ActuAl);
			Assert.equAl(ActuAlPosition.isEquAl(pos), true);
		}
	}

	function AssertLines(doc: vscode.NotebookConcAtTextDocument, ...lines: string[]) {
		let ActuAl = doc.getText().split(/\r\n|\n|\r/);
		Assert.deepStrictEquAl(ActuAl, lines);
	}

	test('contAins', function () {

		const cellUri1 = CellUri.generAte(notebook.uri, 1);
		const cellUri2 = CellUri.generAte(notebook.uri, 2);

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [{
				kind: NotebookCellsChAngeType.ModelChAnge,
				chAnges: [[0, 0, [{
					hAndle: 1,
					uri: cellUri1,
					source: ['Hello', 'World', 'Hello World!'],
					eol: '\n',
					lAnguAge: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}, {
					hAndle: 2,
					uri: cellUri2,
					source: ['HAllo', 'Welt', 'HAllo Welt!'],
					eol: '\n',
					lAnguAge: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}]]
				]
			}]
		}, fAlse);


		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);

		Assert.equAl(doc.contAins(cellUri1), true);
		Assert.equAl(doc.contAins(cellUri2), true);
		Assert.equAl(doc.contAins(URI.pArse('some://miss/pAth')), fAlse);
	});

	test('locAtion, position mApping', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);


		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');

		AssertLocAtion(doc, new Position(0, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(0, 0)));
		AssertLocAtion(doc, new Position(4, 0), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 0)));
		AssertLocAtion(doc, new Position(4, 3), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 3)));
		AssertLocAtion(doc, new Position(5, 11), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(2, 11)));
		AssertLocAtion(doc, new Position(5, 12), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(2, 11)), fAlse); // don't check identity becAuse position will be clAmped
	});


	test('locAtion, position mApping, cell chAnges', function () {

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);

		// UPDATE 1
		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);
		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 1);
		Assert.equAl(doc.version, 1);
		AssertLines(doc, 'Hello', 'World', 'Hello World!');

		AssertLocAtion(doc, new Position(0, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(0, 0)));
		AssertLocAtion(doc, new Position(2, 2), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 2)));
		AssertLocAtion(doc, new Position(4, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 12)), fAlse); // clAmped


		// UPDATE 2
		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[1, 0, [{
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2);
		Assert.equAl(doc.version, 2);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');
		AssertLocAtion(doc, new Position(0, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(0, 0)));
		AssertLocAtion(doc, new Position(4, 0), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 0)));
		AssertLocAtion(doc, new Position(4, 3), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 3)));
		AssertLocAtion(doc, new Position(5, 11), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(2, 11)));
		AssertLocAtion(doc, new Position(5, 12), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(2, 11)), fAlse); // don't check identity becAuse position will be clAmped

		// UPDATE 3 (remove cell #2 AgAin)
		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[1, 1, []]]
				}
			]
		}, fAlse);
		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 1);
		Assert.equAl(doc.version, 3);
		AssertLines(doc, 'Hello', 'World', 'Hello World!');
		AssertLocAtion(doc, new Position(0, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(0, 0)));
		AssertLocAtion(doc, new Position(2, 2), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 2)));
		AssertLocAtion(doc, new Position(4, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 12)), fAlse); // clAmped
	});

	test('locAtion, position mApping, cell-document chAnges', function () {

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);

		// UPDATE 1
		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{

					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);
		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2);
		Assert.equAl(doc.version, 1);

		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');
		AssertLocAtion(doc, new Position(0, 0), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(0, 0)));
		AssertLocAtion(doc, new Position(2, 2), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 2)));
		AssertLocAtion(doc, new Position(2, 12), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 12)));
		AssertLocAtion(doc, new Position(4, 0), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 0)));
		AssertLocAtion(doc, new Position(4, 3), new LocAtion(notebook.notebookDocument.cells[1].uri, new Position(1, 3)));

		// offset mAth
		let cell1End = doc.offsetAt(new Position(2, 12));
		Assert.equAl(doc.positionAt(cell1End).isEquAl(new Position(2, 12)), true);

		extHostDocuments.$AcceptModelChAnged(notebook.notebookDocument.cells[0].uri, {
			versionId: 0,
			eol: '\n',
			chAnges: [{
				rAnge: { stArtLineNumber: 3, stArtColumn: 1, endLineNumber: 3, endColumn: 6 },
				rAngeLength: 6,
				rAngeOffset: 12,
				text: 'Hi'
			}]
		}, fAlse);
		AssertLines(doc, 'Hello', 'World', 'Hi World!', 'HAllo', 'Welt', 'HAllo Welt!');
		AssertLocAtion(doc, new Position(2, 12), new LocAtion(notebook.notebookDocument.cells[0].uri, new Position(2, 9)), fAlse);

		Assert.equAl(doc.positionAt(cell1End).isEquAl(new Position(3, 2)), true);

	});

	test('selector', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['fooLAng-document'],
						eol: '\n',
						lAnguAge: 'fooLAng',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['bArLAng-document'],
						eol: '\n',
						lAnguAge: 'bArLAng',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		const mixedDoc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		const fooLAngDoc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, 'fooLAng');
		const bArLAngDoc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, 'bArLAng');

		AssertLines(mixedDoc, 'fooLAng-document', 'bArLAng-document');
		AssertLines(fooLAngDoc, 'fooLAng-document');
		AssertLines(bArLAngDoc, 'bArLAng-document');

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[2, 0, [{
						hAndle: 3,
						uri: CellUri.generAte(notebook.uri, 3),
						source: ['bArLAng-document2'],
						eol: '\n',
						lAnguAge: 'bArLAng',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		AssertLines(mixedDoc, 'fooLAng-document', 'bArLAng-document', 'bArLAng-document2');
		AssertLines(fooLAngDoc, 'fooLAng-document');
		AssertLines(bArLAngDoc, 'bArLAng-document', 'bArLAng-document2');
	});

	function AssertOffsetAtPosition(doc: vscode.NotebookConcAtTextDocument, offset: number, expected: { line: number, chArActer: number }, reverse = true) {
		const ActuAl = doc.positionAt(offset);

		Assert.equAl(ActuAl.line, expected.line);
		Assert.equAl(ActuAl.chArActer, expected.chArActer);

		if (reverse) {
			const ActuAlOffset = doc.offsetAt(ActuAl);
			Assert.equAl(ActuAlOffset, offset);
		}
	}


	test('offsetAt(position) <-> positionAt(offset)', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');

		AssertOffsetAtPosition(doc, 0, { line: 0, chArActer: 0 });
		AssertOffsetAtPosition(doc, 1, { line: 0, chArActer: 1 });
		AssertOffsetAtPosition(doc, 9, { line: 1, chArActer: 3 });
		AssertOffsetAtPosition(doc, 32, { line: 4, chArActer: 1 });
		AssertOffsetAtPosition(doc, 47, { line: 5, chArActer: 11 });
	});


	function AssertLocAtionAtPosition(doc: vscode.NotebookConcAtTextDocument, pos: { line: number, chArActer: number }, expected: { uri: URI, line: number, chArActer: number }, reverse = true) {

		const ActuAl = doc.locAtionAt(new Position(pos.line, pos.chArActer));
		Assert.equAl(ActuAl.uri.toString(), expected.uri.toString());
		Assert.equAl(ActuAl.rAnge.stArt.line, expected.line);
		Assert.equAl(ActuAl.rAnge.end.line, expected.line);
		Assert.equAl(ActuAl.rAnge.stArt.chArActer, expected.chArActer);
		Assert.equAl(ActuAl.rAnge.end.chArActer, expected.chArActer);

		if (reverse) {
			const ActuAlPos = doc.positionAt(ActuAl);
			Assert.equAl(ActuAlPos.line, pos.line);
			Assert.equAl(ActuAlPos.chArActer, pos.chArActer);
		}
	}

	test('locAtionAt(position) <-> positionAt(locAtion)', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');

		AssertLocAtionAtPosition(doc, { line: 0, chArActer: 0 }, { uri: notebook.notebookDocument.cells[0].uri, line: 0, chArActer: 0 });
		AssertLocAtionAtPosition(doc, { line: 2, chArActer: 0 }, { uri: notebook.notebookDocument.cells[0].uri, line: 2, chArActer: 0 });
		AssertLocAtionAtPosition(doc, { line: 2, chArActer: 12 }, { uri: notebook.notebookDocument.cells[0].uri, line: 2, chArActer: 12 });
		AssertLocAtionAtPosition(doc, { line: 3, chArActer: 0 }, { uri: notebook.notebookDocument.cells[1].uri, line: 0, chArActer: 0 });
		AssertLocAtionAtPosition(doc, { line: 5, chArActer: 0 }, { uri: notebook.notebookDocument.cells[1].uri, line: 2, chArActer: 0 });
		AssertLocAtionAtPosition(doc, { line: 5, chArActer: 11 }, { uri: notebook.notebookDocument.cells[1].uri, line: 2, chArActer: 11 });
	});

	test('getText(rAnge)', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');

		Assert.equAl(doc.getText(new RAnge(0, 0, 0, 0)), '');
		Assert.equAl(doc.getText(new RAnge(0, 0, 1, 0)), 'Hello\n');
		Assert.equAl(doc.getText(new RAnge(2, 0, 4, 0)), 'Hello World!\nHAllo\n');
	});

	test('vAlidAteRAnge/Position', function () {

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 1,
						uri: CellUri.generAte(notebook.uri, 1),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 2,
						uri: CellUri.generAte(notebook.uri, 2),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1 + 2); // mArkdown And code

		let doc = new ExtHostNotebookConcAtDocument(extHostNotebooks, extHostDocuments, notebook.notebookDocument, undefined);
		AssertLines(doc, 'Hello', 'World', 'Hello World!', 'HAllo', 'Welt', 'HAllo Welt!');


		function AssertPosition(ActuAl: vscode.Position, expectedLine: number, expectedCh: number) {
			Assert.equAl(ActuAl.line, expectedLine);
			Assert.equAl(ActuAl.chArActer, expectedCh);
		}


		// "fixed"
		AssertPosition(doc.vAlidAtePosition(new Position(0, 1000)), 0, 5);
		AssertPosition(doc.vAlidAtePosition(new Position(2, 1000)), 2, 12);
		AssertPosition(doc.vAlidAtePosition(new Position(5, 1000)), 5, 11);
		AssertPosition(doc.vAlidAtePosition(new Position(5000, 1000)), 5, 11);

		// "good"
		AssertPosition(doc.vAlidAtePosition(new Position(0, 1)), 0, 1);
		AssertPosition(doc.vAlidAtePosition(new Position(0, 5)), 0, 5);
		AssertPosition(doc.vAlidAtePosition(new Position(2, 8)), 2, 8);
		AssertPosition(doc.vAlidAtePosition(new Position(2, 12)), 2, 12);
		AssertPosition(doc.vAlidAtePosition(new Position(5, 11)), 5, 11);

	});
});
