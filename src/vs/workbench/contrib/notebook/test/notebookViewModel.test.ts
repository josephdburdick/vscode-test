/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { NotebookViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/notebookViewModel';
import { CellKind, NotebookCellMetAdAtA, diff, ICellRAnge, notebookDocumentMetAdAtADefAults } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { withTestNotebook, NotebookEditorTestModel, setupInstAntiAtionService } from 'vs/workbench/contrib/notebook/test/testNotebookEditor';
import { IBulkEditService } from 'vs/editor/browser/services/bulkEditService';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { NotebookEventDispAtcher } from 'vs/workbench/contrib/notebook/browser/viewModel/eventDispAtcher';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { reduceCellRAnges } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IModeService } from 'vs/editor/common/services/modeService';

suite('NotebookViewModel', () => {
	const instAntiAtionService = setupInstAntiAtionService();
	const textModelService = instAntiAtionService.get(ITextModelService);
	const blukEditService = instAntiAtionService.get(IBulkEditService);
	const undoRedoService = instAntiAtionService.get(IUndoRedoService);
	const modeService = instAntiAtionService.get(IModeService);

	test('ctor', function () {
		const notebook = new NotebookTextModel('notebook', fAlse, URI.pArse('test'), [], [], notebookDocumentMetAdAtADefAults, { trAnsientMetAdAtA: {}, trAnsientOutputs: fAlse }, undoRedoService, textModelService, modeService);
		const model = new NotebookEditorTestModel(notebook);
		const eventDispAtcher = new NotebookEventDispAtcher();
		const viewModel = new NotebookViewModel('notebook', model.notebook, eventDispAtcher, null, instAntiAtionService, blukEditService, undoRedoService);
		Assert.equAl(viewModel.viewType, 'notebook');
	});

	test('insert/delete', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse }]
			],
			(editor, viewModel) => {
				Assert.equAl(viewModel.viewCells[0].metAdAtA?.editAble, true);
				Assert.equAl(viewModel.viewCells[1].metAdAtA?.editAble, fAlse);

				const cell = viewModel.creAteCell(1, 'vAr c = 3', 'jAvAscript', CellKind.Code, {}, [], true, true, []);
				Assert.equAl(viewModel.viewCells.length, 3);
				Assert.equAl(viewModel.notebookDocument.cells.length, 3);
				Assert.equAl(viewModel.getCellIndex(cell), 1);

				viewModel.deleteCell(1, true);
				Assert.equAl(viewModel.viewCells.length, 2);
				Assert.equAl(viewModel.notebookDocument.cells.length, 2);
				Assert.equAl(viewModel.getCellIndex(cell), -1);
			}
		);
	});

	test('move cells down', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['//A', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['//b', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['//c', 'jAvAscript', CellKind.Code, [], { editAble: true }],
			],
			(editor, viewModel) => {
				viewModel.moveCellToIdx(0, 1, 0, true);
				// no-op
				Assert.equAl(viewModel.viewCells[0].getText(), '//A');
				Assert.equAl(viewModel.viewCells[1].getText(), '//b');

				viewModel.moveCellToIdx(0, 1, 1, true);
				// b, A, c
				Assert.equAl(viewModel.viewCells[0].getText(), '//b');
				Assert.equAl(viewModel.viewCells[1].getText(), '//A');
				Assert.equAl(viewModel.viewCells[2].getText(), '//c');

				viewModel.moveCellToIdx(0, 1, 2, true);
				// A, c, b
				Assert.equAl(viewModel.viewCells[0].getText(), '//A');
				Assert.equAl(viewModel.viewCells[1].getText(), '//c');
				Assert.equAl(viewModel.viewCells[2].getText(), '//b');
			}
		);
	});

	test('move cells up', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['//A', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['//b', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['//c', 'jAvAscript', CellKind.Code, [], { editAble: true }],
			],
			(editor, viewModel) => {
				viewModel.moveCellToIdx(1, 1, 0, true);
				// b, A, c
				Assert.equAl(viewModel.viewCells[0].getText(), '//b');
				Assert.equAl(viewModel.viewCells[1].getText(), '//A');

				viewModel.moveCellToIdx(2, 1, 0, true);
				// c, b, A
				Assert.equAl(viewModel.viewCells[0].getText(), '//c');
				Assert.equAl(viewModel.viewCells[1].getText(), '//b');
				Assert.equAl(viewModel.viewCells[2].getText(), '//A');
			}
		);
	});

	test('index', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], { editAble: true }],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: true }]
			],
			(editor, viewModel) => {
				const firstViewCell = viewModel.viewCells[0];
				const lAstViewCell = viewModel.viewCells[viewModel.viewCells.length - 1];

				const insertIndex = viewModel.getCellIndex(firstViewCell) + 1;
				const cell = viewModel.creAteCell(insertIndex, 'vAr c = 3;', 'jAvAscript', CellKind.Code, {}, [], true);

				const AddedCellIndex = viewModel.getCellIndex(cell);
				viewModel.deleteCell(AddedCellIndex, true);

				const secondInsertIndex = viewModel.getCellIndex(lAstViewCell) + 1;
				const cell2 = viewModel.creAteCell(secondInsertIndex, 'vAr d = 4;', 'jAvAscript', CellKind.Code, {}, [], true);

				Assert.equAl(viewModel.viewCells.length, 3);
				Assert.equAl(viewModel.notebookDocument.cells.length, 3);
				Assert.equAl(viewModel.getCellIndex(cell2), 2);
			}
		);
	});

	test('metAdAtA', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], {}],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: true }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: true }],
				['vAr e = 5;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: fAlse }],
			],
			(editor, viewModel) => {
				viewModel.notebookDocument.metAdAtA = { editAble: true, runnAble: true, cellRunnAble: true, cellEditAble: true, cellHAsExecutionOrder: true };

				const defAults = { hAsExecutionOrder: true };

				Assert.deepEquAl(viewModel.viewCells[0].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: true,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[1].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: true,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[2].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: fAlse,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[3].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: fAlse,
					runnAble: true,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[4].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: fAlse,
					runnAble: fAlse,
					...defAults
				});

				viewModel.notebookDocument.metAdAtA = { editAble: true, runnAble: true, cellRunnAble: fAlse, cellEditAble: true, cellHAsExecutionOrder: true };

				Assert.deepEquAl(viewModel.viewCells[0].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: fAlse,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[1].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: true,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[2].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: true,
					runnAble: fAlse,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[3].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: fAlse,
					runnAble: true,
					...defAults
				});

				Assert.deepEquAl(viewModel.viewCells[4].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: fAlse,
					runnAble: fAlse,
					...defAults
				});

				viewModel.notebookDocument.metAdAtA = { editAble: true, runnAble: true, cellRunnAble: fAlse, cellEditAble: fAlse, cellHAsExecutionOrder: true };

				Assert.deepEquAl(viewModel.viewCells[0].getEvAluAtedMetAdAtA(viewModel.metAdAtA), <NotebookCellMetAdAtA>{
					editAble: fAlse,
					runnAble: fAlse,
					...defAults
				});
			}
		);
	});
});

function getVisibleCells<T>(cells: T[], hiddenRAnges: ICellRAnge[]) {
	if (!hiddenRAnges.length) {
		return cells;
	}

	let stArt = 0;
	let hiddenRAngeIndex = 0;
	const result: T[] = [];

	while (stArt < cells.length && hiddenRAngeIndex < hiddenRAnges.length) {
		if (stArt < hiddenRAnges[hiddenRAngeIndex].stArt) {
			result.push(...cells.slice(stArt, hiddenRAnges[hiddenRAngeIndex].stArt));
		}

		stArt = hiddenRAnges[hiddenRAngeIndex].end + 1;
		hiddenRAngeIndex++;
	}

	if (stArt < cells.length) {
		result.push(...cells.slice(stArt));
	}

	return result;
}

suite('NotebookViewModel DecorAtions', () => {
	const instAntiAtionService = setupInstAntiAtionService();
	const blukEditService = instAntiAtionService.get(IBulkEditService);
	const undoRedoService = instAntiAtionService.get(IUndoRedoService);

	test('trAcking rAnge', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], {}],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: true }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: true }],
				['vAr e = 5;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: fAlse }],
			],
			(editor, viewModel) => {
				const trAckedId = viewModel.setTrAckedRAnge('test', { stArt: 1, end: 2 }, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 2,
				});

				viewModel.creAteCell(0, 'vAr d = 6;', 'jAvAscript', CellKind.Code, {}, [], true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 2,

					end: 3
				});

				viewModel.deleteCell(0, true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 2
				});

				viewModel.creAteCell(3, 'vAr d = 7;', 'jAvAscript', CellKind.Code, {}, [], true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 3
				});

				viewModel.deleteCell(3, true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 2
				});

				viewModel.deleteCell(1, true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 0,

					end: 1
				});
			}
		);
	});

	test('trAcking rAnge 2', function () {
		withTestNotebook(
			instAntiAtionService,
			blukEditService,
			undoRedoService,
			[
				['vAr A = 1;', 'jAvAscript', CellKind.Code, [], {}],
				['vAr b = 2;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: true }],
				['vAr c = 3;', 'jAvAscript', CellKind.Code, [], { editAble: true, runnAble: fAlse }],
				['vAr d = 4;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: true }],
				['vAr e = 5;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: fAlse }],
				['vAr e = 6;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: fAlse }],
				['vAr e = 7;', 'jAvAscript', CellKind.Code, [], { editAble: fAlse, runnAble: fAlse }],
			],
			(editor, viewModel) => {
				const trAckedId = viewModel.setTrAckedRAnge('test', { stArt: 1, end: 3 }, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 3
				});

				viewModel.creAteCell(5, 'vAr d = 9;', 'jAvAscript', CellKind.Code, {}, [], true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 3
				});

				viewModel.creAteCell(4, 'vAr d = 10;', 'jAvAscript', CellKind.Code, {}, [], true);
				Assert.deepEquAl(viewModel.getTrAckedRAnge(trAckedId!), {
					stArt: 1,

					end: 4
				});
			}
		);
	});

	test('reduce rAnge', function () {
		Assert.deepEquAl(reduceCellRAnges([
			{ stArt: 0, end: 1 },
			{ stArt: 1, end: 2 },
			{ stArt: 4, end: 6 }
		]), [
			{ stArt: 0, end: 2 },
			{ stArt: 4, end: 6 }
		]);

		Assert.deepEquAl(reduceCellRAnges([
			{ stArt: 0, end: 1 },
			{ stArt: 1, end: 2 },
			{ stArt: 3, end: 4 }
		]), [
			{ stArt: 0, end: 4 }
		]);
	});

	test('diff hidden rAnges', function () {
		Assert.deepEquAl(getVisibleCells<number>([1, 2, 3, 4, 5], []), [1, 2, 3, 4, 5]);

		Assert.deepEquAl(
			getVisibleCells<number>(
				[1, 2, 3, 4, 5],
				[{ stArt: 1, end: 2 }]
			),
			[1, 4, 5]
		);

		Assert.deepEquAl(
			getVisibleCells<number>(
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
				[
					{ stArt: 1, end: 2 },
					{ stArt: 4, end: 5 }
				]
			),
			[1, 4, 7, 8, 9]
		);

		const originAl = getVisibleCells<number>(
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[
				{ stArt: 1, end: 2 },
				{ stArt: 4, end: 5 }
			]
		);

		const modified = getVisibleCells<number>(
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[
				{ stArt: 2, end: 4 }
			]
		);

		Assert.deepEquAl(diff<number>(originAl, modified, (A) => {
			return originAl.indexOf(A) >= 0;
		}), [{ stArt: 1, deleteCount: 1, toInsert: [2, 6] }]);
	});

	test('hidden rAnges', function () {

	});
});
