/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { ExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { TestRPCProtocol } from 'vs/workbench/test/browser/Api/testRPCProtocol';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { mock } from 'vs/bAse/test/common/mock';
import { IModelAddedDAtA, MAinContext, MAinThreAdCommAndsShApe, MAinThreAdNotebookShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostNotebookController } from 'vs/workbench/Api/common/extHostNotebook';
import { ExtHostNotebookDocument } from 'vs/workbench/Api/common/extHostNotebookDocument';
import { CellKind, CellUri, NotebookCellsChAngeType } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { URI } from 'vs/bAse/common/uri';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { ExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { nullExtensionDescription } from 'vs/workbench/services/extensions/common/extensions';
import { isEquAl } from 'vs/bAse/common/resources';
import { IExtensionStorAgePAths } from 'vs/workbench/Api/common/extHostStorAgePAths';
import { generAteUuid } from 'vs/bAse/common/uuid';

suite('NotebookCell#Document', function () {


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
				versionId: 0,
				cells: [{
					hAndle: 0,
					uri: CellUri.generAte(notebookUri, 0),
					source: ['### HeAding'],
					eol: '\n',
					lAnguAge: 'mArkdown',
					cellKind: CellKind.MArkdown,
					outputs: [],
				}, {
					hAndle: 1,
					uri: CellUri.generAte(notebookUri, 1),
					source: ['console.log("AAA")', 'console.log("bbb")'],
					eol: '\n',
					lAnguAge: 'jAvAscript',
					cellKind: CellKind.Code,
					outputs: [],
				}],
				contentOptions: { trAnsientMetAdAtA: {}, trAnsientOutputs: fAlse }
			}],
			AddedEditors: [{
				documentUri: notebookUri,
				id: '_notebook_editor_0',
				selections: [0],
				visibleRAnges: []
			}]
		});
		extHostNotebooks.$AcceptDocumentAndEditorsDeltA({ newActiveEditor: '_notebook_editor_0' });

		notebook = extHostNotebooks.notebookDocuments[0]!;

		disposAbles.Add(reg);
		disposAbles.Add(notebook);
		disposAbles.Add(extHostDocuments);
	});


	test('cell document is vscode.TextDocument', Async function () {

		Assert.strictEquAl(notebook.notebookDocument.cells.length, 2);

		const [c1, c2] = notebook.notebookDocument.cells;
		const d1 = extHostDocuments.getDocument(c1.uri);

		Assert.ok(d1);
		Assert.equAl(d1.lAnguAgeId, c1.lAnguAge);
		Assert.equAl(d1.version, 1);
		Assert.ok(d1.notebook === notebook.notebookDocument);

		const d2 = extHostDocuments.getDocument(c2.uri);
		Assert.ok(d2);
		Assert.equAl(d2.lAnguAgeId, c2.lAnguAge);
		Assert.equAl(d2.version, 1);
		Assert.ok(d2.notebook === notebook.notebookDocument);
	});

	test('cell document goes when notebook closes', Async function () {
		const cellUris: string[] = [];
		for (let cell of notebook.notebookDocument.cells) {
			Assert.ok(extHostDocuments.getDocument(cell.uri));
			cellUris.push(cell.uri.toString());
		}

		const removedCellUris: string[] = [];
		const reg = extHostDocuments.onDidRemoveDocument(doc => {
			removedCellUris.push(doc.uri.toString());
		});

		extHostNotebooks.$AcceptDocumentAndEditorsDeltA({ removedDocuments: [notebook.uri] });
		reg.dispose();

		Assert.strictEquAl(removedCellUris.length, 2);
		Assert.deepStrictEquAl(removedCellUris.sort(), cellUris.sort());
	});

	test('cell document is vscode.TextDocument After chAnging it', Async function () {

		const p = new Promise<void>((resolve, reject) => {
			extHostNotebooks.onDidChAngeNotebookCells(e => {
				try {
					Assert.strictEquAl(e.chAnges.length, 1);
					Assert.strictEquAl(e.chAnges[0].items.length, 2);

					const [first, second] = e.chAnges[0].items;

					const doc1 = extHostDocuments.getAllDocumentDAtA().find(dAtA => isEquAl(dAtA.document.uri, first.uri));
					Assert.ok(doc1);
					Assert.strictEquAl(doc1?.document === first.document, true);

					const doc2 = extHostDocuments.getAllDocumentDAtA().find(dAtA => isEquAl(dAtA.document.uri, second.uri));
					Assert.ok(doc2);
					Assert.strictEquAl(doc2?.document === second.document, true);

					resolve();

				} cAtch (err) {
					reject(err);
				}
			});
		});

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 0, [{
						hAndle: 2,
						uri: CellUri.generAte(notebookUri, 2),
						source: ['Hello', 'World', 'Hello World!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}, {
						hAndle: 3,
						uri: CellUri.generAte(notebookUri, 3),
						source: ['HAllo', 'Welt', 'HAllo Welt!'],
						eol: '\n',
						lAnguAge: 'test',
						cellKind: CellKind.Code,
						outputs: [],
					}]]]
				}
			]
		}, fAlse);

		AwAit p;

	});

	test('cell document stAys open when notebook is still open', Async function () {

		const docs: vscode.TextDocument[] = [];
		const AddDAtA: IModelAddedDAtA[] = [];
		for (let cell of notebook.notebookDocument.cells) {
			const doc = extHostDocuments.getDocument(cell.uri);
			Assert.ok(doc);
			Assert.equAl(extHostDocuments.getDocument(cell.uri).isClosed, fAlse);
			docs.push(doc);
			AddDAtA.push({
				EOL: '\n',
				isDirty: doc.isDirty,
				lines: doc.getText().split('\n'),
				modeId: doc.lAnguAgeId,
				uri: doc.uri,
				versionId: doc.version
			});
		}

		// this cAll hAppens when opening A document on the mAin side
		extHostDocumentsAndEditors.$AcceptDocumentsAndEditorsDeltA({ AddedDocuments: AddDAtA });

		// this cAll hAppens when closing A document from the mAin side
		extHostDocumentsAndEditors.$AcceptDocumentsAndEditorsDeltA({ removedDocuments: docs.mAp(d => d.uri) });

		// notebook is still open -> cell documents stAy open
		for (let cell of notebook.notebookDocument.cells) {
			Assert.ok(extHostDocuments.getDocument(cell.uri));
			Assert.equAl(extHostDocuments.getDocument(cell.uri).isClosed, fAlse);
		}

		// close notebook -> docs Are closed
		extHostNotebooks.$AcceptDocumentAndEditorsDeltA({ removedDocuments: [notebook.uri] });
		for (let cell of notebook.notebookDocument.cells) {
			Assert.throws(() => extHostDocuments.getDocument(cell.uri));
		}
		for (let doc of docs) {
			Assert.equAl(doc.isClosed, true);
		}
	});

	test('cell document goes when cell is removed', Async function () {

		Assert.equAl(notebook.notebookDocument.cells.length, 2);
		const [cell1, cell2] = notebook.notebookDocument.cells;

		extHostNotebooks.$AcceptModelChAnged(notebook.uri, {
			versionId: 2,
			rAwEvents: [
				{
					kind: NotebookCellsChAngeType.ModelChAnge,
					chAnges: [[0, 1, []]]
				}
			]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1);
		Assert.equAl(cell1.document.isClosed, true); // ref still Alive!
		Assert.equAl(cell2.document.isClosed, fAlse);

		Assert.throws(() => extHostDocuments.getDocument(cell1.uri));
	});

	test('cell document knows notebook', function () {
		for (let cells of notebook.notebookDocument.cells) {
			Assert.equAl(cells.document.notebook === notebook.notebookDocument, true);
		}
	});

	test('cell#index', function () {

		Assert.equAl(notebook.notebookDocument.cells.length, 2);
		const [first, second] = notebook.notebookDocument.cells;
		Assert.equAl(first.index, 0);
		Assert.equAl(second.index, 1);

		// remove first cell
		extHostNotebooks.$AcceptModelChAnged(notebook.uri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [{
				kind: NotebookCellsChAngeType.ModelChAnge,
				chAnges: [[0, 1, []]]
			}]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 1);
		Assert.equAl(second.index, 0);

		extHostNotebooks.$AcceptModelChAnged(notebookUri, {
			versionId: notebook.notebookDocument.version + 1,
			rAwEvents: [{
				kind: NotebookCellsChAngeType.ModelChAnge,
				chAnges: [[0, 0, [{
					hAndle: 2,
					uri: CellUri.generAte(notebookUri, 2),
					source: ['Hello', 'World', 'Hello World!'],
					eol: '\n',
					lAnguAge: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}, {
					hAndle: 3,
					uri: CellUri.generAte(notebookUri, 3),
					source: ['HAllo', 'Welt', 'HAllo Welt!'],
					eol: '\n',
					lAnguAge: 'test',
					cellKind: CellKind.Code,
					outputs: [],
				}]]]
			}]
		}, fAlse);

		Assert.equAl(notebook.notebookDocument.cells.length, 3);
		Assert.equAl(second.index, 2);
	});
});
