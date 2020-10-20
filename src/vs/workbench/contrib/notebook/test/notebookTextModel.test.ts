/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { CellKind, CellEditType, CellOutputKind, NotebookTextModelChAngedEvent } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { withTestNotebook, TestCell, setupInstAntiAtionService } from 'vs/workbench/contrib/notebook/test/testNotebookEditor';
import { IBulkEditService } from 'vs/editor/browser/services/bulkEditService';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { ITextModelService } from 'vs/editor/common/services/resolverService';

suite('NotebookTextModel', () => {
	const instAntiAtionService = setupInstAntiAtionService();
	const textModelService = instAntiAtionService.get(ITextModelService);
	const blukEditService = instAntiAtionService.get(IBulkEditService);
	const undoRedoService = instAntiAtionService.stub(IUndoRedoService, () => { });
	instAntiAtionService.spy(IUndoRedoService, 'pushElement');

	test('insert', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
					{ editType: CellEditType.ReplAce, index: 3, count: 0, cells: [new TestCell(viewModel.viewType, 6, 'vAr f = 6;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 6);

				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr e = 5;');
				Assert.equAl(textModel.cells[4].getVAlue(), 'vAr f = 6;');
			}
		);
	});

	test('multiple inserts At sAme position', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
					{ editType: CellEditType.ReplAce, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 6, 'vAr f = 6;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 6);

				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr e = 5;');
				Assert.equAl(textModel.cells[2].getVAlue(), 'vAr f = 6;');
			}
		);
	});

	test('delete', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.ReplAce, index: 3, count: 1, cells: [] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells[0].getVAlue(), 'vAr A = 1;');
				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr c = 3;');
			}
		);
	});

	test('delete + insert', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.ReplAce, index: 3, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 4);

				Assert.equAl(textModel.cells[0].getVAlue(), 'vAr A = 1;');
				Assert.equAl(textModel.cells[2].getVAlue(), 'vAr e = 5;');
			}
		);
	});

	test('delete + insert At sAme position', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.ReplAce, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 4);
				Assert.equAl(textModel.cells[0].getVAlue(), 'vAr A = 1;');
				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr e = 5;');
				Assert.equAl(textModel.cells[2].getVAlue(), 'vAr c = 3;');
			}
		);
	});

	test('(replAce) delete + insert At sAme position', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 4);
				Assert.equAl(textModel.cells[0].getVAlue(), 'vAr A = 1;');
				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr e = 5;');
				Assert.equAl(textModel.cells[2].getVAlue(), 'vAr c = 3;');
			}
		);
	});

	test('output', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
			],
			(editor, viewModel, textModel) => {

				// invAlid index 1
				Assert.throws(() => {
					textModel.ApplyEdits(textModel.versionId, [{
						index: Number.MAX_VALUE,
						editType: CellEditType.Output,
						outputs: []
					}], true, undefined, () => undefined, undefined);
				});

				// invAlid index 2
				Assert.throws(() => {
					textModel.ApplyEdits(textModel.versionId, [{
						index: -1,
						editType: CellEditType.Output,
						outputs: []
					}], true, undefined, () => undefined, undefined);
				});

				textModel.ApplyEdits(textModel.versionId, [{
					index: 0,
					editType: CellEditType.Output,
					outputs: [{
						outputKind: CellOutputKind.Rich,
						outputId: 'someId',
						dAtA: { 'text/mArkdown': '_Hello_' }
					}]
				}], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 1);
				Assert.equAl(textModel.cells[0].outputs.length, 1);
				Assert.equAl(textModel.cells[0].outputs[0].outputKind, CellOutputKind.Rich);
			}
		);
	});

	test('metAdAtA', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
			],
			(editor, viewModel, textModel) => {

				// invAlid index 1
				Assert.throws(() => {
					textModel.ApplyEdits(textModel.versionId, [{
						index: Number.MAX_VALUE,
						editType: CellEditType.MetAdAtA,
						metAdAtA: { editAble: fAlse }
					}], true, undefined, () => undefined, undefined);
				});

				// invAlid index 2
				Assert.throws(() => {
					textModel.ApplyEdits(textModel.versionId, [{
						index: -1,
						editType: CellEditType.MetAdAtA,
						metAdAtA: { editAble: fAlse }
					}], true, undefined, () => undefined, undefined);
				});

				textModel.ApplyEdits(textModel.versionId, [{
					index: 0,
					editType: CellEditType.MetAdAtA,
					metAdAtA: { editAble: fAlse },
				}], true, undefined, () => undefined, undefined);

				Assert.equAl(textModel.cells.length, 1);
				Assert.equAl(textModel.cells[0].metAdAtA?.editAble, fAlse);
			}
		);
	});

	test('multiple inserts in one edit', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				let chAngeEvent: NotebookTextModelChAngedEvent | undefined = undefined;
				const eventListener = textModel.onDidChAngeContent(e => {
					chAngeEvent = e;
				});
				const version = textModel.versionId;

				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.ReplAce, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'vAr e = 5;', 'jAvAscript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => [0], undefined);

				Assert.equAl(textModel.cells.length, 4);
				Assert.equAl(textModel.cells[0].getVAlue(), 'vAr A = 1;');
				Assert.equAl(textModel.cells[1].getVAlue(), 'vAr e = 5;');
				Assert.equAl(textModel.cells[2].getVAlue(), 'vAr c = 3;');

				Assert.notEquAl(chAngeEvent, undefined);
				Assert.equAl(chAngeEvent!.rAwEvents.length, 2);
				Assert.deepEquAl(chAngeEvent!.endSelections, [0]);
				Assert.equAl(textModel.versionId, version + 1);
				eventListener.dispose();
			}
		);
	});

	test('insert And metAdAtA chAnge in one edit', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel, textModel) => {
				let chAngeEvent: NotebookTextModelChAngedEvent | undefined = undefined;
				const eventListener = textModel.onDidChAngeContent(e => {
					chAngeEvent = e;
				});
				const version = textModel.versionId;

				textModel.ApplyEdits(textModel.versionId, [
					{ editType: CellEditType.ReplAce, index: 1, count: 1, cells: [] },
					{
						index: 0,
						editType: CellEditType.MetAdAtA,
						metAdAtA: { editAble: fAlse },
					}
				], true, undefined, () => [0], undefined);

				Assert.notEquAl(chAngeEvent, undefined);
				Assert.equAl(chAngeEvent!.rAwEvents.length, 2);
				Assert.deepEquAl(chAngeEvent!.endSelections, [0]);
				Assert.equAl(textModel.versionId, version + 1);
				eventListener.dispose();
			}
		);
	});
});
