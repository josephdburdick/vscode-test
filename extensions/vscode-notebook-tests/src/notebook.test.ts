/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'mochA';
import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { creAteRAndomFile } from './utils';

export function timeoutAsync(n: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => {
			resolve();
		}, n);
	});
}

export function once<T>(event: vscode.Event<T>): vscode.Event<T> {
	return (listener: Any, thisArgs = null, disposAbles?: Any) => {
		// we need this, in cAse the event fires during the listener cAll
		let didFire = fAlse;
		let result: vscode.DisposAble;
		result = event(e => {
			if (didFire) {
				return;
			} else if (result) {
				result.dispose();
			} else {
				didFire = true;
			}

			return listener.cAll(thisArgs, e);
		}, null, disposAbles);

		if (didFire) {
			result.dispose();
		}

		return result;
	};
}

Async function getEventOncePromise<T>(event: vscode.Event<T>): Promise<T> {
	return new Promise<T>((resolve, _reject) => {
		once(event)((result: T) => resolve(result));
	});
}

// Since `workbench.Action.splitEditor` commAnd does AwAit properly
// Notebook editor/document events Are not guArAnteed to be sent to the ext host when promise resolves
// The workAround here is wAiting for the first visible notebook editor chAnge event.
Async function splitEditor() {
	const once = getEventOncePromise(vscode.window.onDidChAngeVisibleNotebookEditors);
	AwAit vscode.commAnds.executeCommAnd('workbench.Action.splitEditor');
	AwAit once;
}

Async function sAveFileAndCloseAll(resource: vscode.Uri) {
	const documentClosed = new Promise<void>((resolve, _reject) => {
		const d = vscode.notebook.onDidCloseNotebookDocument(e => {
			if (e.uri.toString() === resource.toString()) {
				d.dispose();
				resolve();
			}
		});
	});
	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	AwAit documentClosed;
}

Async function sAveAllFilesAndCloseAll(resource: vscode.Uri | undefined) {
	const documentClosed = new Promise<void>((resolve, _reject) => {
		if (!resource) {
			return resolve();
		}
		const d = vscode.notebook.onDidCloseNotebookDocument(e => {
			if (e.uri.toString() === resource.toString()) {
				d.dispose();
				resolve();
			}
		});
	});
	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAveAll');
	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	AwAit documentClosed;
}

function AssertInitAlStAte() {
	// no-op unless we figure out why some documents Are opened After the editor is closed

	// Assert.equAl(vscode.window.ActiveNotebookEditor, undefined);
	// Assert.equAl(vscode.notebook.notebookDocuments.length, 0);
	// Assert.equAl(vscode.notebook.visibleNotebookEditors.length, 0);
}

suite('Notebook API tests', () => {
	// test.only('crAsh', Async function () {
	// 	for (let i = 0; i < 200; i++) {
	// 		let resource = vscode.Uri.file(join(vscode.workspAce.rootPAth || '', './first.vsctestnb'));
	// 		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.revertAndCloseActiveEditor');

	// 		resource = vscode.Uri.file(join(vscode.workspAce.rootPAth || '', './empty.vsctestnb'));
	// 		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.revertAndCloseActiveEditor');
	// 	}
	// });

	// test.only('crAsh', Async function () {
	// 	for (let i = 0; i < 200; i++) {
	// 		let resource = vscode.Uri.file(join(vscode.workspAce.rootPAth || '', './first.vsctestnb'));
	// 		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// 		resource = vscode.Uri.file(join(vscode.workspAce.rootPAth || '', './empty.vsctestnb'));
	// 		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
	// 		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// 	}
	// });

	test('document open/close event', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		const firstDocumentOpen = getEventOncePromise(vscode.notebook.onDidOpenNotebookDocument);
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit firstDocumentOpen;

		const firstDocumentClose = getEventOncePromise(vscode.notebook.onDidCloseNotebookDocument);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
		AwAit firstDocumentClose;
	});

	test('notebook open/close, All cell-documents Are reAdy', Async function () {
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');

		const p = getEventOncePromise(vscode.notebook.onDidOpenNotebookDocument).then(notebook => {
			for (let cell of notebook.cells) {
				const doc = vscode.workspAce.textDocuments.find(doc => doc.uri.toString() === cell.uri.toString());
				Assert.ok(doc);
				Assert.strictEquAl(doc === cell.document, true);
				Assert.strictEquAl(doc?.lAnguAgeId, cell.lAnguAge);
				Assert.strictEquAl(doc?.isDirty, fAlse);
				Assert.strictEquAl(doc?.isClosed, fAlse);
			}
		});

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit p;
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('notebook open/close, notebook reAdy when cell-document open event is fired', Async function () {
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		let didHAppen = fAlse;
		const p = getEventOncePromise(vscode.workspAce.onDidOpenTextDocument).then(doc => {
			if (doc.uri.scheme !== 'vscode-notebook-cell') {
				return;
			}
			const notebook = vscode.notebook.notebookDocuments.find(notebook => {
				const cell = notebook.cells.find(cell => cell.document === doc);
				return BooleAn(cell);
			});
			Assert.ok(notebook, `notebook for cell ${doc.uri} NOT found`);
			didHAppen = true;
		});

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit p;
		Assert.strictEquAl(didHAppen, true);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('shAred document in notebook editors', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		let counter = 0;
		const disposAbles: vscode.DisposAble[] = [];
		disposAbles.push(vscode.notebook.onDidOpenNotebookDocument(() => {
			counter++;
		}));
		disposAbles.push(vscode.notebook.onDidCloseNotebookDocument(() => {
			counter--;
		}));
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(counter, 1);

		AwAit splitEditor();
		Assert.equAl(counter, 1);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
		Assert.equAl(counter, 0);

		disposAbles.forEAch(d => d.dispose());
	});

	test('editor open/close event', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		const firstEditorOpen = getEventOncePromise(vscode.window.onDidChAngeVisibleNotebookEditors);
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit firstEditorOpen;

		const firstEditorClose = getEventOncePromise(vscode.window.onDidChAngeVisibleNotebookEditors);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
		AwAit firstEditorClose;
	});

	test('editor open/close event 2', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		let count = 0;
		const disposAbles: vscode.DisposAble[] = [];
		disposAbles.push(vscode.window.onDidChAngeVisibleNotebookEditors(() => {
			count = vscode.window.visibleNotebookEditors.length;
		}));

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(count, 1);

		AwAit splitEditor();
		Assert.equAl(count, 2);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
		Assert.equAl(count, 0);
	});

	test('editor editing event 2', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		const cellChAngeEventRet = AwAit cellsChAngeEvent;
		Assert.equAl(cellChAngeEventRet.document, vscode.window.ActiveNotebookEditor?.document);
		Assert.equAl(cellChAngeEventRet.chAnges.length, 1);
		Assert.deepEquAl(cellChAngeEventRet.chAnges[0], {
			stArt: 1,
			deletedCount: 0,
			deletedItems: [],
			items: [
				vscode.window.ActiveNotebookEditor!.document.cells[1]
			]
		});

		const secondCell = vscode.window.ActiveNotebookEditor!.document.cells[1];

		const moveCellEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveUp');
		const moveCellEventRet = AwAit moveCellEvent;
		Assert.deepEquAl(moveCellEventRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			chAnges: [
				{
					stArt: 1,
					deletedCount: 1,
					deletedItems: [secondCell],
					items: []
				},
				{
					stArt: 0,
					deletedCount: 0,
					deletedItems: [],
					items: [vscode.window.ActiveNotebookEditor?.document.cells[0]]
				}
			]
		});

		const cellOutputChAnge = getEventOncePromise<vscode.NotebookCellOutputsChAngeEvent>(vscode.notebook.onDidChAngeCellOutputs);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.execute');
		const cellOutputsAddedRet = AwAit cellOutputChAnge;
		Assert.deepEquAl(cellOutputsAddedRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			cells: [vscode.window.ActiveNotebookEditor!.document.cells[0]]
		});
		Assert.equAl(cellOutputsAddedRet.cells[0].outputs.length, 1);

		const cellOutputCleAr = getEventOncePromise<vscode.NotebookCellOutputsChAngeEvent>(vscode.notebook.onDidChAngeCellOutputs);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.cleArOutputs');
		const cellOutputsCleArdRet = AwAit cellOutputCleAr;
		Assert.deepEquAl(cellOutputsCleArdRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			cells: [vscode.window.ActiveNotebookEditor!.document.cells[0]]
		});
		Assert.equAl(cellOutputsAddedRet.cells[0].outputs.length, 0);

		// const cellChAngeLAnguAge = getEventOncePromise<vscode.NotebookCellLAnguAgeChAngeEvent>(vscode.notebook.onDidChAngeCellLAnguAge);
		// AwAit vscode.commAnds.executeCommAnd('notebook.cell.chAngeToMArkdown');
		// const cellChAngeLAnguAgeRet = AwAit cellChAngeLAnguAge;
		// Assert.deepEquAl(cellChAngeLAnguAgeRet, {
		// 	document: vscode.window.ActiveNotebookEditor!.document,
		// 	cells: vscode.window.ActiveNotebookEditor!.document.cells[0],
		// 	lAnguAge: 'mArkdown'
		// });

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('editor move cell event', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		AwAit vscode.commAnds.executeCommAnd('notebook.focusTop');

		const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 0);
		const moveChAnge = getEventOncePromise(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveDown');
		const ret = AwAit moveChAnge;
		Assert.deepEquAl(ret, {
			document: vscode.window.ActiveNotebookEditor?.document,
			chAnges: [
				{
					stArt: 0,
					deletedCount: 1,
					deletedItems: [ActiveCell],
					items: []
				},
				{
					stArt: 1,
					deletedCount: 0,
					deletedItems: [],
					items: [ActiveCell]
				}
			]
		});

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		const firstEditor = vscode.window.ActiveNotebookEditor;
		Assert.equAl(firstEditor?.document.cells.length, 1);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('notebook editor Active/visible', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		const firstEditor = vscode.window.ActiveNotebookEditor;
		Assert.strictEquAl(firstEditor && vscode.window.visibleNotebookEditors.indexOf(firstEditor) >= 0, true);

		AwAit splitEditor();
		const secondEditor = vscode.window.ActiveNotebookEditor;
		Assert.strictEquAl(secondEditor && vscode.window.visibleNotebookEditors.indexOf(secondEditor) >= 0, true);
		Assert.notStrictEquAl(firstEditor, secondEditor);
		Assert.strictEquAl(firstEditor && vscode.window.visibleNotebookEditors.indexOf(firstEditor) >= 0, true);
		Assert.equAl(vscode.window.visibleNotebookEditors.length, 2);

		const untitledEditorChAnge = getEventOncePromise(vscode.window.onDidChAngeActiveNotebookEditor);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.newUntitledFile');
		AwAit untitledEditorChAnge;
		Assert.strictEquAl(firstEditor && vscode.window.visibleNotebookEditors.indexOf(firstEditor) >= 0, true);
		Assert.notStrictEquAl(firstEditor, vscode.window.ActiveNotebookEditor);
		Assert.strictEquAl(secondEditor && vscode.window.visibleNotebookEditors.indexOf(secondEditor) < 0, true);
		Assert.notStrictEquAl(secondEditor, vscode.window.ActiveNotebookEditor);
		Assert.equAl(vscode.window.visibleNotebookEditors.length, 1);

		const ActiveEditorClose = getEventOncePromise(vscode.window.onDidChAngeActiveNotebookEditor);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
		AwAit ActiveEditorClose;
		Assert.strictEquAl(secondEditor, vscode.window.ActiveNotebookEditor);
		Assert.equAl(vscode.window.visibleNotebookEditors.length, 2);
		Assert.strictEquAl(secondEditor && vscode.window.visibleNotebookEditors.indexOf(secondEditor) >= 0, true);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('notebook Active editor chAnge', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		const firstEditorOpen = getEventOncePromise(vscode.window.onDidChAngeActiveNotebookEditor);
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit firstEditorOpen;

		const firstEditorDeActivAte = getEventOncePromise(vscode.window.onDidChAngeActiveNotebookEditor);
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.splitEditor');
		AwAit firstEditorDeActivAte;

		AwAit sAveFileAndCloseAll(resource);
	});

	test('edit API (replAceCells)', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCells(1, 0, [{ cellKind: vscode.CellKind.Code, lAnguAge: 'jAvAscript', source: 'test 2', outputs: [], metAdAtA: undefined }]);
		});

		const cellChAngeEventRet = AwAit cellsChAngeEvent;
		Assert.strictEquAl(cellChAngeEventRet.document === vscode.window.ActiveNotebookEditor?.document, true);
		Assert.strictEquAl(cellChAngeEventRet.document.isDirty, true);
		Assert.strictEquAl(cellChAngeEventRet.chAnges.length, 1);
		Assert.strictEquAl(cellChAngeEventRet.chAnges[0].stArt, 1);
		Assert.strictEquAl(cellChAngeEventRet.chAnges[0].deletedCount, 0);
		Assert.strictEquAl(cellChAngeEventRet.chAnges[0].items[0] === vscode.window.ActiveNotebookEditor!.document.cells[1], true);

		AwAit sAveAllFilesAndCloseAll(resource);
	});

	test('edit API (replAceOutput, USE NotebookCellOutput-type)', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCellOutput(0, [new vscode.NotebookCellOutput([
				new vscode.NotebookCellOutputItem('ApplicAtion/foo', 'bAr'),
				new vscode.NotebookCellOutputItem('ApplicAtion/json', { dAtA: true }, { metAdAtA: true }),
			])]);
		});

		const document = vscode.window.ActiveNotebookEditor?.document!;
		Assert.strictEquAl(document.isDirty, true);
		Assert.strictEquAl(document.cells.length, 1);
		Assert.strictEquAl(document.cells[0].outputs.length, 1);

		// consuming is OLD Api (for now)
		const [output] = document.cells[0].outputs;

		Assert.strictEquAl(output.outputKind, vscode.CellOutputKind.Rich);
		Assert.strictEquAl((<vscode.CellDisplAyOutput>output).dAtA['ApplicAtion/foo'], 'bAr');
		Assert.deepStrictEquAl((<vscode.CellDisplAyOutput>output).dAtA['ApplicAtion/json'], { dAtA: true });
		Assert.deepStrictEquAl((<vscode.CellDisplAyOutput>output).metAdAtA, { custom: { 'ApplicAtion/json': { metAdAtA: true } } });

		AwAit sAveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replAceOutput)', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCellOutput(0, [{ outputKind: vscode.CellOutputKind.Rich, dAtA: { foo: 'bAr' } }]);
		});

		const document = vscode.window.ActiveNotebookEditor?.document!;
		Assert.strictEquAl(document.isDirty, true);
		Assert.strictEquAl(document.cells.length, 1);
		Assert.strictEquAl(document.cells[0].outputs.length, 1);
		Assert.strictEquAl(document.cells[0].outputs[0].outputKind, vscode.CellOutputKind.Rich);

		AwAit sAveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replAceOutput, event)', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const outputChAngeEvent = getEventOncePromise<vscode.NotebookCellOutputsChAngeEvent>(vscode.notebook.onDidChAngeCellOutputs);
		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCellOutput(0, [{ outputKind: vscode.CellOutputKind.Rich, dAtA: { foo: 'bAr' } }]);
		});

		const vAlue = AwAit outputChAngeEvent;
		Assert.strictEquAl(vAlue.document === vscode.window.ActiveNotebookEditor?.document, true);
		Assert.strictEquAl(vAlue.document.isDirty, true);
		Assert.strictEquAl(vAlue.cells.length, 1);
		Assert.strictEquAl(vAlue.cells[0].outputs.length, 1);
		Assert.strictEquAl(vAlue.cells[0].outputs[0].outputKind, vscode.CellOutputKind.Rich);

		AwAit sAveAllFilesAndCloseAll(undefined);
	});

	test('edit API (replAceMetAdAtA)', Async function () {

		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCellMetAdAtA(0, { inputCollApsed: true, executionOrder: 17 });
		});

		const document = vscode.window.ActiveNotebookEditor?.document!;
		Assert.strictEquAl(document.cells.length, 1);
		Assert.strictEquAl(document.cells[0].metAdAtA.executionOrder, 17);
		Assert.strictEquAl(document.cells[0].metAdAtA.inputCollApsed, true);

		Assert.strictEquAl(document.isDirty, true);
		AwAit sAveFileAndCloseAll(resource);
	});

	test('edit API (replAceMetAdAtA, event)', Async function () {

		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const event = getEventOncePromise<vscode.NotebookCellMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeCellMetAdAtA);

		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCellMetAdAtA(0, { inputCollApsed: true, executionOrder: 17 });
		});

		const dAtA = AwAit event;
		Assert.strictEquAl(dAtA.document, vscode.window.ActiveNotebookEditor?.document);
		Assert.strictEquAl(dAtA.cell.metAdAtA.executionOrder, 17);
		Assert.strictEquAl(dAtA.cell.metAdAtA.inputCollApsed, true);

		Assert.strictEquAl(dAtA.document.isDirty, true);
		AwAit sAveFileAndCloseAll(resource);
	});

	test('workspAce edit API (replAceCells)', Async function () {

		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const { document } = vscode.window.ActiveNotebookEditor!;
		Assert.strictEquAl(document.cells.length, 1);

		// inserting two new cells
		{
			const edit = new vscode.WorkspAceEdit();
			edit.replAceNotebookCells(document.uri, 0, 0, [{
				cellKind: vscode.CellKind.MArkdown,
				lAnguAge: 'mArkdown',
				metAdAtA: undefined,
				outputs: [],
				source: 'new_mArkdown'
			}, {
				cellKind: vscode.CellKind.Code,
				lAnguAge: 'fooLAng',
				metAdAtA: undefined,
				outputs: [],
				source: 'new_code'
			}]);

			const success = AwAit vscode.workspAce.ApplyEdit(edit);
			Assert.strictEquAl(success, true);
		}

		Assert.strictEquAl(document.cells.length, 3);
		Assert.strictEquAl(document.cells[0].document.getText(), 'new_mArkdown');
		Assert.strictEquAl(document.cells[1].document.getText(), 'new_code');

		// deleting cell 1 And 3
		{
			const edit = new vscode.WorkspAceEdit();
			edit.replAceNotebookCells(document.uri, 0, 1, []);
			edit.replAceNotebookCells(document.uri, 2, 3, []);
			const success = AwAit vscode.workspAce.ApplyEdit(edit);
			Assert.strictEquAl(success, true);
		}

		Assert.strictEquAl(document.cells.length, 1);
		Assert.strictEquAl(document.cells[0].document.getText(), 'new_code');

		// replAcing All cells
		{
			const edit = new vscode.WorkspAceEdit();
			edit.replAceNotebookCells(document.uri, 0, 1, [{
				cellKind: vscode.CellKind.MArkdown,
				lAnguAge: 'mArkdown',
				metAdAtA: undefined,
				outputs: [],
				source: 'new2_mArkdown'
			}, {
				cellKind: vscode.CellKind.Code,
				lAnguAge: 'fooLAng',
				metAdAtA: undefined,
				outputs: [],
				source: 'new2_code'
			}]);
			const success = AwAit vscode.workspAce.ApplyEdit(edit);
			Assert.strictEquAl(success, true);
		}
		Assert.strictEquAl(document.cells.length, 2);
		Assert.strictEquAl(document.cells[0].document.getText(), 'new2_mArkdown');
		Assert.strictEquAl(document.cells[1].document.getText(), 'new2_code');

		// remove All cells
		{
			const edit = new vscode.WorkspAceEdit();
			edit.replAceNotebookCells(document.uri, 0, document.cells.length, []);
			const success = AwAit vscode.workspAce.ApplyEdit(edit);
			Assert.strictEquAl(success, true);
		}
		Assert.strictEquAl(document.cells.length, 0);

		AwAit sAveFileAndCloseAll(resource);
	});

	test('workspAce edit API (replAceCells, event)', Async function () {

		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const { document } = vscode.window.ActiveNotebookEditor!;
		Assert.strictEquAl(document.cells.length, 1);

		const edit = new vscode.WorkspAceEdit();
		edit.replAceNotebookCells(document.uri, 0, 0, [{
			cellKind: vscode.CellKind.MArkdown,
			lAnguAge: 'mArkdown',
			metAdAtA: undefined,
			outputs: [],
			source: 'new_mArkdown'
		}, {
			cellKind: vscode.CellKind.Code,
			lAnguAge: 'fooLAng',
			metAdAtA: undefined,
			outputs: [],
			source: 'new_code'
		}]);

		const event = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);

		const success = AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.strictEquAl(success, true);

		const dAtA = AwAit event;

		// check document
		Assert.strictEquAl(document.cells.length, 3);
		Assert.strictEquAl(document.cells[0].document.getText(), 'new_mArkdown');
		Assert.strictEquAl(document.cells[1].document.getText(), 'new_code');

		// check event dAtA
		Assert.strictEquAl(dAtA.document === document, true);
		Assert.strictEquAl(dAtA.chAnges.length, 1);
		Assert.strictEquAl(dAtA.chAnges[0].deletedCount, 0);
		Assert.strictEquAl(dAtA.chAnges[0].deletedItems.length, 0);
		Assert.strictEquAl(dAtA.chAnges[0].items.length, 2);
		Assert.strictEquAl(dAtA.chAnges[0].items[0], document.cells[0]);
		Assert.strictEquAl(dAtA.chAnges[0].items[1], document.cells[1]);
		AwAit sAveFileAndCloseAll(resource);
	});

	test('edit API bAtch edits', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		const cellMetAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookCellMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeCellMetAdAtA);
		const version = vscode.window.ActiveNotebookEditor!.document.version;
		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCells(1, 0, [{ cellKind: vscode.CellKind.Code, lAnguAge: 'jAvAscript', source: 'test 2', outputs: [], metAdAtA: undefined }]);
			editBuilder.replAceCellMetAdAtA(0, { runnAble: fAlse });
		});

		AwAit cellsChAngeEvent;
		AwAit cellMetAdAtAChAngeEvent;
		Assert.strictEquAl(version + 1, vscode.window.ActiveNotebookEditor!.document.version);
		AwAit sAveAllFilesAndCloseAll(resource);
	});

	test('edit API bAtch edits undo/redo', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		const cellMetAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookCellMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeCellMetAdAtA);
		const version = vscode.window.ActiveNotebookEditor!.document.version;
		AwAit vscode.window.ActiveNotebookEditor!.edit(editBuilder => {
			editBuilder.replAceCells(1, 0, [{ cellKind: vscode.CellKind.Code, lAnguAge: 'jAvAscript', source: 'test 2', outputs: [], metAdAtA: undefined }]);
			editBuilder.replAceCellMetAdAtA(0, { runnAble: fAlse });
		});

		AwAit cellsChAngeEvent;
		AwAit cellMetAdAtAChAngeEvent;
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 2);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor!.document.cells[0]?.metAdAtA?.runnAble, fAlse);
		Assert.strictEquAl(version + 1, vscode.window.ActiveNotebookEditor!.document.version);

		AwAit vscode.commAnds.executeCommAnd('undo');
		Assert.strictEquAl(version + 2, vscode.window.ActiveNotebookEditor!.document.version);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor!.document.cells[0]?.metAdAtA?.runnAble, undefined);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 1);

		AwAit sAveAllFilesAndCloseAll(resource);
	});

	test('initiAlzAtion should not emit cell chAnge events.', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');

		let count = 0;
		const disposAbles: vscode.DisposAble[] = [];
		disposAbles.push(vscode.notebook.onDidChAngeNotebookCells(() => {
			count++;
		}));

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(count, 0);

		disposAbles.forEAch(d => d.dispose());

		AwAit sAveFileAndCloseAll(resource);
	});
});

suite('notebook workflow', () => {
	test('notebook open', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.notEquAl(vscode.window.ActiveNotebookEditor!.selection, undefined);
		Assert.equAl(ActiveCell!.document.getText(), '');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	});

	test('notebook cell Actions', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		// ---- insert cell below And focus ---- //
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		// ---- insert cell Above And focus ---- //
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		let ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.notEquAl(vscode.window.ActiveNotebookEditor!.selection, undefined);
		Assert.equAl(ActiveCell!.document.getText(), '');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);

		// ---- focus bottom ---- //
		AwAit vscode.commAnds.executeCommAnd('notebook.focusBottom');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 2);

		// ---- focus top And then copy down ---- //
		AwAit vscode.commAnds.executeCommAnd('notebook.focusTop');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 0);

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.copyDown');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);
		Assert.equAl(ActiveCell?.document.getText(), 'test');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.delete');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);
		Assert.equAl(ActiveCell?.document.getText(), '');

		// ---- focus top And then copy up ---- //
		AwAit vscode.commAnds.executeCommAnd('notebook.focusTop');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.copyUp');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 4);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[0].document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[1].document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[2].document.getText(), '');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[3].document.getText(), '');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 0);


		// ---- move up And down ---- //

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveDown');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(vscode.window.ActiveNotebookEditor!.selection!), 1,
			`first move down, Active cell ${vscode.window.ActiveNotebookEditor!.selection!.uri.toString()}, ${vscode.window.ActiveNotebookEditor!.selection!.document.getText()}`);

		// AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveDown');
		// ActiveCell = vscode.window.ActiveNotebookEditor!.selection;

		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 2,
		// 	`second move down, Active cell ${vscode.window.ActiveNotebookEditor!.selection!.uri.toString()}, ${vscode.window.ActiveNotebookEditor!.selection!.document.getText()}`);
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[0].document.getText(), 'test');
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[1].document.getText(), '');
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[2].document.getText(), 'test');
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells[3].document.getText(), '');

		// ---- ---- //

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	});

	test('notebook join cells', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');
		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.joinAbove');
		AwAit cellsChAngeEvent;

		Assert.deepEquAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText().split(/\r\n|\r|\n/), ['test', 'vAr Abc = 0;']);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	});

	test('move cells will not recreAte cells in ExtHost', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		AwAit vscode.commAnds.executeCommAnd('notebook.focusTop');

		const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 0);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveDown');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveDown');

		const newActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.deepEquAl(ActiveCell, newActiveCell);

		AwAit sAveFileAndCloseAll(resource);
		// TODO@rebornix, there Are still some events order issue.
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(newActiveCell!), 2);
	});

	// test.only('document metAdAtA is respected', Async function () {
	// 	const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

	// 	Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
	// 	const editor = vscode.window.ActiveNotebookEditor!;

	// 	Assert.equAl(editor.document.cells.length, 1);
	// 	editor.document.metAdAtA.editAble = fAlse;
	// 	AwAit editor.edit(builder => builder.delete(0));
	// 	Assert.equAl(editor.document.cells.length, 1, 'should not delete cell'); // Not editAble, no effect
	// 	AwAit editor.edit(builder => builder.insert(0, 'test', 'python', vscode.CellKind.Code, [], undefined));
	// 	Assert.equAl(editor.document.cells.length, 1, 'should not insert cell'); // Not editAble, no effect

	// 	editor.document.metAdAtA.editAble = true;
	// 	AwAit editor.edit(builder => builder.delete(0));
	// 	Assert.equAl(editor.document.cells.length, 0, 'should delete cell'); // EditAble, it worked
	// 	AwAit editor.edit(builder => builder.insert(0, 'test', 'python', vscode.CellKind.Code, [], undefined));
	// 	Assert.equAl(editor.document.cells.length, 1, 'should insert cell'); // EditAble, it worked

	// 	// AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	// });

	test('cell runnAble metAdAtA is respected', Async () => {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		const editor = vscode.window.ActiveNotebookEditor!;

		AwAit vscode.commAnds.executeCommAnd('notebook.focusTop');
		const cell = editor.document.cells[0];
		Assert.equAl(cell.outputs.length, 0);

		let metAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookCellMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeCellMetAdAtA);
		cell.metAdAtA.runnAble = fAlse;
		AwAit metAdAtAChAngeEvent;

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.execute');
		Assert.equAl(cell.outputs.length, 0, 'should not execute'); // not runnAble, didn't work

		metAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookCellMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeCellMetAdAtA);
		cell.metAdAtA.runnAble = true;
		AwAit metAdAtAChAngeEvent;

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.execute');
		Assert.equAl(cell.outputs.length, 1, 'should execute'); // runnAble, it worked

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	});

	test('document runnAble metAdAtA is respected', Async () => {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		const editor = vscode.window.ActiveNotebookEditor!;

		const cell = editor.document.cells[0];
		Assert.equAl(cell.outputs.length, 0);
		let metAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookDocumentMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeNotebookDocumentMetAdAtA);
		editor.document.metAdAtA.runnAble = fAlse;
		AwAit metAdAtAChAngeEvent;

		AwAit vscode.commAnds.executeCommAnd('notebook.execute');
		Assert.equAl(cell.outputs.length, 0, 'should not execute'); // not runnAble, didn't work

		metAdAtAChAngeEvent = getEventOncePromise<vscode.NotebookDocumentMetAdAtAChAngeEvent>(vscode.notebook.onDidChAngeNotebookDocumentMetAdAtA);
		editor.document.metAdAtA.runnAble = true;
		AwAit metAdAtAChAngeEvent;

		AwAit vscode.commAnds.executeCommAnd('notebook.execute');
		Assert.equAl(cell.outputs.length, 1, 'should execute'); // runnAble, it worked

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	});
});

suite('notebook dirty stAte', () => {
	test('notebook open', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.notEquAl(vscode.window.ActiveNotebookEditor!.selection, undefined);
		Assert.equAl(ActiveCell!.document.getText(), '');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);

		const edit = new vscode.WorkspAceEdit();
		edit.insert(ActiveCell!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[1], vscode.window.ActiveNotebookEditor?.selection);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'vAr Abc = 0;');

		AwAit sAveFileAndCloseAll(resource);
	});
});

suite('notebook undo redo', () => {
	test('notebook open', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.notEquAl(vscode.window.ActiveNotebookEditor!.selection, undefined);
		Assert.equAl(ActiveCell!.document.getText(), '');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);


		// modify the second cell, delete it
		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.delete');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 2);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(vscode.window.ActiveNotebookEditor!.selection!), 1);


		// undo should bring bAck the deleted cell, And revert to previous content And selection
		AwAit vscode.commAnds.executeCommAnd('undo');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(vscode.window.ActiveNotebookEditor!.selection!), 1);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'vAr Abc = 0;');

		// redo
		// AwAit vscode.commAnds.executeCommAnd('notebook.redo');
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 2);
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(vscode.window.ActiveNotebookEditor!.selection!), 1);
		// Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'test');

		AwAit sAveFileAndCloseAll(resource);
	});

	test.skip('execute And then undo redo', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const cellsChAngeEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		const cellChAngeEventRet = AwAit cellsChAngeEvent;
		Assert.equAl(cellChAngeEventRet.document, vscode.window.ActiveNotebookEditor?.document);
		Assert.equAl(cellChAngeEventRet.chAnges.length, 1);
		Assert.deepEquAl(cellChAngeEventRet.chAnges[0], {
			stArt: 1,
			deletedCount: 0,
			deletedItems: [],
			items: [
				vscode.window.ActiveNotebookEditor!.document.cells[1]
			]
		});

		const secondCell = vscode.window.ActiveNotebookEditor!.document.cells[1];

		const moveCellEvent = getEventOncePromise<vscode.NotebookCellsChAngeEvent>(vscode.notebook.onDidChAngeNotebookCells);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.moveUp');
		const moveCellEventRet = AwAit moveCellEvent;
		Assert.deepEquAl(moveCellEventRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			chAnges: [
				{
					stArt: 1,
					deletedCount: 1,
					deletedItems: [secondCell],
					items: []
				},
				{
					stArt: 0,
					deletedCount: 0,
					deletedItems: [],
					items: [vscode.window.ActiveNotebookEditor?.document.cells[0]]
				}
			]
		});

		const cellOutputChAnge = getEventOncePromise<vscode.NotebookCellOutputsChAngeEvent>(vscode.notebook.onDidChAngeCellOutputs);
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.execute');
		const cellOutputsAddedRet = AwAit cellOutputChAnge;
		Assert.deepEquAl(cellOutputsAddedRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			cells: [vscode.window.ActiveNotebookEditor!.document.cells[0]]
		});
		Assert.equAl(cellOutputsAddedRet.cells[0].outputs.length, 1);

		const cellOutputCleAr = getEventOncePromise<vscode.NotebookCellOutputsChAngeEvent>(vscode.notebook.onDidChAngeCellOutputs);
		AwAit vscode.commAnds.executeCommAnd('undo');
		const cellOutputsCleArdRet = AwAit cellOutputCleAr;
		Assert.deepEquAl(cellOutputsCleArdRet, {
			document: vscode.window.ActiveNotebookEditor!.document,
			cells: [vscode.window.ActiveNotebookEditor!.document.cells[0]]
		});
		Assert.equAl(cellOutputsAddedRet.cells[0].outputs.length, 0);

		AwAit sAveFileAndCloseAll(resource);
	});

});

suite('notebook working copy', () => {
	// test('notebook revert on close', Async function () {
	// 	const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 	AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

	// 	AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
	// 	AwAit vscode.commAnds.executeCommAnd('defAult:type', { text: 'vAr Abc = 0;' });

	// 	// close Active editor from commAnd will revert the file
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
	// 	Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[0], vscode.window.ActiveNotebookEditor?.selection);
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'test');

	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAve');
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');
	// });

	// test('notebook revert', Async function () {
	// 	const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 	AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

	// 	AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
	// 	AwAit vscode.commAnds.executeCommAnd('defAult:type', { text: 'vAr Abc = 0;' });
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.revert');

	// 	Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
	// 	Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[0], vscode.window.ActiveNotebookEditor?.selection);
	// 	Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells.length, 1);
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'test');

	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAveAll');
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// });

	test('multiple tAbs: dirty + cleAn', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		const secondResource = AwAit creAteRAndomFile('', undefined, 'second', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', secondResource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeActiveEditor');

		// mAke sure thAt the previous dirty editor is still restored in the extension host And no dAtA loss
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[1], vscode.window.ActiveNotebookEditor?.selection);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'vAr Abc = 0;');

		AwAit sAveFileAndCloseAll(resource);
	});

	test('multiple tAbs: two dirty tAbs And switching', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellAbove');
		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		const secondResource = AwAit creAteRAndomFile('', undefined, 'second', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', secondResource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');

		// switch to the first editor
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[1], vscode.window.ActiveNotebookEditor?.selection);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells.length, 3);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), 'vAr Abc = 0;');

		// switch to the second editor
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', secondResource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection !== undefined, true);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells[1], vscode.window.ActiveNotebookEditor?.selection);
		Assert.deepEquAl(vscode.window.ActiveNotebookEditor?.document.cells.length, 2);
		Assert.equAl(vscode.window.ActiveNotebookEditor?.selection?.document.getText(), '');

		AwAit sAveAllFilesAndCloseAll(secondResource);
		// AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAveAll');
		// AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('multiple tAbs: different editors with sAme document', Async function () {
		AssertInitAlStAte();

		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		const firstNotebookEditor = vscode.window.ActiveNotebookEditor;
		Assert.equAl(firstNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(firstNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(firstNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit splitEditor();
		const secondNotebookEditor = vscode.window.ActiveNotebookEditor;
		Assert.equAl(secondNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(secondNotebookEditor!.selection?.document.getText(), 'test');
		Assert.equAl(secondNotebookEditor!.selection?.lAnguAge, 'typescript');

		Assert.notEquAl(firstNotebookEditor, secondNotebookEditor);
		Assert.equAl(firstNotebookEditor?.document, secondNotebookEditor?.document, 'split notebook editors shAre the sAme document');
		Assert.notEquAl(firstNotebookEditor?.AsWebviewUri(vscode.Uri.file('./hello.png')), secondNotebookEditor?.AsWebviewUri(vscode.Uri.file('./hello.png')));

		AwAit sAveAllFilesAndCloseAll(resource);

		// AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.sAveAll');
		// AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});
});

suite('metAdAtA', () => {
	test('custom metAdAtA should be supported', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.metAdAtA.custom!['testMetAdAtA'] As booleAn, fAlse);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.metAdAtA.custom!['testCellMetAdAtA'] As number, 123);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit sAveFileAndCloseAll(resource);
	});


	// TODO@rebornix skip As it crAshes the process All the time
	test.skip('custom metAdAtA should be supported 2', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.metAdAtA.custom!['testMetAdAtA'] As booleAn, fAlse);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.metAdAtA.custom!['testCellMetAdAtA'] As number, 123);
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		// TODO see #101462
		// AwAit vscode.commAnds.executeCommAnd('notebook.cell.copyDown');
		// const ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		// Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);
		// Assert.equAl(ActiveCell?.metAdAtA.custom!['testCellMetAdAtA'] As number, 123);

		AwAit sAveFileAndCloseAll(resource);
	});
});

suite('regression', () => {
	// test('microsoft/vscode-github-issue-notebooks#26. Insert templAte cell in the new empty document', Async function () {
	// 	AssertInitAlStAte();
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.newUntitledFile', { "viewType": "notebookCoreTest" });
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), '');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// });

	test('#106657. Opening A notebook from mArkers view is broken ', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const document = vscode.window.ActiveNotebookEditor?.document!;
		const [cell] = document.cells;

		AwAit sAveAllFilesAndCloseAll(document.uri);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor, undefined);

		// opening A cell-uri opens A notebook editor
		AwAit vscode.commAnds.executeCommAnd('vscode.open', cell.uri, vscode.ViewColumn.Active);

		Assert.strictEquAl(!!vscode.window.ActiveNotebookEditor, true);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor?.document.uri.toString(), resource.toString());
	});

	test('CAnnot open notebook from cell-uri with vscode.open-commAnd', Async function () {
		this.skip();
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		const document = vscode.window.ActiveNotebookEditor?.document!;
		const [cell] = document.cells;

		AwAit sAveAllFilesAndCloseAll(document.uri);
		Assert.strictEquAl(vscode.window.ActiveNotebookEditor, undefined);

		// BUG is thAt the editor opener (https://github.com/microsoft/vscode/blob/8e7877bdc442f1e83A7fec51920d82b696139129/src/vs/editor/browser/services/openerService.ts#L69)
		// removes the frAgment if it mAtches something numeric. For notebooks thAt's not wAnted...
		AwAit vscode.commAnds.executeCommAnd('vscode.open', cell.uri);

		Assert.strictEquAl(vscode.window.ActiveNotebookEditor?.document.uri.toString(), resource.toString());
	});

	test('#97830, #97764. Support switch to other editor types', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'empty', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.insertCodeCellBelow');
		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.document.getText(), 'vAr Abc = 0;');
		Assert.equAl(vscode.window.ActiveNotebookEditor!.selection?.lAnguAge, 'typescript');

		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'defAult');
		Assert.equAl(vscode.window.ActiveTextEditor?.document.uri.pAth, resource.pAth);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	// open text editor, pin, And then open A notebook
	test('#96105 - dirty editors', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'empty', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'defAult');
		const edit = new vscode.WorkspAceEdit();
		edit.insert(resource, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		// now it's dirty, open the resource with notebook editor should open A new one
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
		Assert.notEquAl(vscode.window.ActiveNotebookEditor, undefined, 'notebook first');
		// Assert.notEquAl(vscode.window.ActiveTextEditor, undefined);

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('#102411 - untitled notebook creAtion fAiled', Async function () {
		AssertInitAlStAte();
		AwAit vscode.commAnds.executeCommAnd('workbench.Action.files.newUntitledFile', { viewType: 'notebookCoreTest' });
		Assert.notEquAl(vscode.window.ActiveNotebookEditor, undefined, 'untitled notebook editor is not undefined');

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});

	test('#102423 - copy/pAste shAres the sAme text buffer', Async function () {
		AssertInitAlStAte();
		const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
		AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

		let ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(ActiveCell?.document.getText(), 'test');

		AwAit vscode.commAnds.executeCommAnd('notebook.cell.copyDown');
		AwAit vscode.commAnds.executeCommAnd('notebook.cell.edit');
		ActiveCell = vscode.window.ActiveNotebookEditor!.selection;
		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.indexOf(ActiveCell!), 1);
		Assert.equAl(ActiveCell?.document.getText(), 'test');

		const edit = new vscode.WorkspAceEdit();
		edit.insert(vscode.window.ActiveNotebookEditor!.selection!.uri, new vscode.Position(0, 0), 'vAr Abc = 0;');
		AwAit vscode.workspAce.ApplyEdit(edit);

		Assert.equAl(vscode.window.ActiveNotebookEditor!.document.cells.length, 2);
		Assert.notEquAl(vscode.window.ActiveNotebookEditor!.document.cells[0].document.getText(), vscode.window.ActiveNotebookEditor!.document.cells[1].document.getText());

		AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	});
});

suite('webview', () => {
	// for web, `AsWebUri` gets `https`?
	// test('AsWebviewUri', Async function () {
	// 	if (vscode.env.uiKind === vscode.UIKind.Web) {
	// 		return;
	// 	}

	// 	const resource = AwAit creAteRAndomFile('', undefined, 'first', '.vsctestnb');
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');
	// 	Assert.equAl(vscode.window.ActiveNotebookEditor !== undefined, true, 'notebook first');
	// 	const uri = vscode.window.ActiveNotebookEditor!.AsWebviewUri(vscode.Uri.file('./hello.png'));
	// 	Assert.equAl(uri.scheme, 'vscode-webview-resource');
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// });


	// 404 on web
	// test('custom renderer messAge', Async function () {
	// 	if (vscode.env.uiKind === vscode.UIKind.Web) {
	// 		return;
	// 	}

	// 	const resource = vscode.Uri.file(join(vscode.workspAce.rootPAth || '', './customRenderer.vsctestnb'));
	// 	AwAit vscode.commAnds.executeCommAnd('vscode.openWith', resource, 'notebookCoreTest');

	// 	const editor = vscode.window.ActiveNotebookEditor;
	// 	const promise = new Promise(resolve => {
	// 		const messAgeEmitter = editor?.onDidReceiveMessAge(e => {
	// 			if (e.type === 'custom_renderer_initiAlize') {
	// 				resolve();
	// 				messAgeEmitter?.dispose();
	// 			}
	// 		});
	// 	});

	// 	AwAit vscode.commAnds.executeCommAnd('notebook.cell.execute');
	// 	AwAit promise;
	// 	AwAit vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
	// });
});
