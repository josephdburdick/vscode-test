/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { CellKind, NoteBookCellMetadata, diff, ICellRange, noteBookDocumentMetadataDefaults } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { withTestNoteBook, NoteBookEditorTestModel, setupInstantiationService } from 'vs/workBench/contriB/noteBook/test/testNoteBookEditor';
import { IBulkEditService } from 'vs/editor/Browser/services/BulkEditService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { NoteBookEventDispatcher } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { TrackedRangeStickiness } from 'vs/editor/common/model';
import { reduceCellRanges } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IModeService } from 'vs/editor/common/services/modeService';

suite('NoteBookViewModel', () => {
	const instantiationService = setupInstantiationService();
	const textModelService = instantiationService.get(ITextModelService);
	const BlukEditService = instantiationService.get(IBulkEditService);
	const undoRedoService = instantiationService.get(IUndoRedoService);
	const modeService = instantiationService.get(IModeService);

	test('ctor', function () {
		const noteBook = new NoteBookTextModel('noteBook', false, URI.parse('test'), [], [], noteBookDocumentMetadataDefaults, { transientMetadata: {}, transientOutputs: false }, undoRedoService, textModelService, modeService);
		const model = new NoteBookEditorTestModel(noteBook);
		const eventDispatcher = new NoteBookEventDispatcher();
		const viewModel = new NoteBookViewModel('noteBook', model.noteBook, eventDispatcher, null, instantiationService, BlukEditService, undoRedoService);
		assert.equal(viewModel.viewType, 'noteBook');
	});

	test('insert/delete', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel) => {
				assert.equal(viewModel.viewCells[0].metadata?.editaBle, true);
				assert.equal(viewModel.viewCells[1].metadata?.editaBle, false);

				const cell = viewModel.createCell(1, 'var c = 3', 'javascript', CellKind.Code, {}, [], true, true, []);
				assert.equal(viewModel.viewCells.length, 3);
				assert.equal(viewModel.noteBookDocument.cells.length, 3);
				assert.equal(viewModel.getCellIndex(cell), 1);

				viewModel.deleteCell(1, true);
				assert.equal(viewModel.viewCells.length, 2);
				assert.equal(viewModel.noteBookDocument.cells.length, 2);
				assert.equal(viewModel.getCellIndex(cell), -1);
			}
		);
	});

	test('move cells down', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['//a', 'javascript', CellKind.Code, [], { editaBle: true }],
				['//B', 'javascript', CellKind.Code, [], { editaBle: true }],
				['//c', 'javascript', CellKind.Code, [], { editaBle: true }],
			],
			(editor, viewModel) => {
				viewModel.moveCellToIdx(0, 1, 0, true);
				// no-op
				assert.equal(viewModel.viewCells[0].getText(), '//a');
				assert.equal(viewModel.viewCells[1].getText(), '//B');

				viewModel.moveCellToIdx(0, 1, 1, true);
				// B, a, c
				assert.equal(viewModel.viewCells[0].getText(), '//B');
				assert.equal(viewModel.viewCells[1].getText(), '//a');
				assert.equal(viewModel.viewCells[2].getText(), '//c');

				viewModel.moveCellToIdx(0, 1, 2, true);
				// a, c, B
				assert.equal(viewModel.viewCells[0].getText(), '//a');
				assert.equal(viewModel.viewCells[1].getText(), '//c');
				assert.equal(viewModel.viewCells[2].getText(), '//B');
			}
		);
	});

	test('move cells up', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['//a', 'javascript', CellKind.Code, [], { editaBle: true }],
				['//B', 'javascript', CellKind.Code, [], { editaBle: true }],
				['//c', 'javascript', CellKind.Code, [], { editaBle: true }],
			],
			(editor, viewModel) => {
				viewModel.moveCellToIdx(1, 1, 0, true);
				// B, a, c
				assert.equal(viewModel.viewCells[0].getText(), '//B');
				assert.equal(viewModel.viewCells[1].getText(), '//a');

				viewModel.moveCellToIdx(2, 1, 0, true);
				// c, B, a
				assert.equal(viewModel.viewCells[0].getText(), '//c');
				assert.equal(viewModel.viewCells[1].getText(), '//B');
				assert.equal(viewModel.viewCells[2].getText(), '//a');
			}
		);
	});

	test('index', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: true }]
			],
			(editor, viewModel) => {
				const firstViewCell = viewModel.viewCells[0];
				const lastViewCell = viewModel.viewCells[viewModel.viewCells.length - 1];

				const insertIndex = viewModel.getCellIndex(firstViewCell) + 1;
				const cell = viewModel.createCell(insertIndex, 'var c = 3;', 'javascript', CellKind.Code, {}, [], true);

				const addedCellIndex = viewModel.getCellIndex(cell);
				viewModel.deleteCell(addedCellIndex, true);

				const secondInsertIndex = viewModel.getCellIndex(lastViewCell) + 1;
				const cell2 = viewModel.createCell(secondInsertIndex, 'var d = 4;', 'javascript', CellKind.Code, {}, [], true);

				assert.equal(viewModel.viewCells.length, 3);
				assert.equal(viewModel.noteBookDocument.cells.length, 3);
				assert.equal(viewModel.getCellIndex(cell2), 2);
			}
		);
	});

	test('metadata', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: true }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: true }],
				['var e = 5;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: false }],
			],
			(editor, viewModel) => {
				viewModel.noteBookDocument.metadata = { editaBle: true, runnaBle: true, cellRunnaBle: true, cellEditaBle: true, cellHasExecutionOrder: true };

				const defaults = { hasExecutionOrder: true };

				assert.deepEqual(viewModel.viewCells[0].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: true,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[1].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: true,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[2].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: false,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[3].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: false,
					runnaBle: true,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[4].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: false,
					runnaBle: false,
					...defaults
				});

				viewModel.noteBookDocument.metadata = { editaBle: true, runnaBle: true, cellRunnaBle: false, cellEditaBle: true, cellHasExecutionOrder: true };

				assert.deepEqual(viewModel.viewCells[0].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: false,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[1].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: true,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[2].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: true,
					runnaBle: false,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[3].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: false,
					runnaBle: true,
					...defaults
				});

				assert.deepEqual(viewModel.viewCells[4].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: false,
					runnaBle: false,
					...defaults
				});

				viewModel.noteBookDocument.metadata = { editaBle: true, runnaBle: true, cellRunnaBle: false, cellEditaBle: false, cellHasExecutionOrder: true };

				assert.deepEqual(viewModel.viewCells[0].getEvaluatedMetadata(viewModel.metadata), <NoteBookCellMetadata>{
					editaBle: false,
					runnaBle: false,
					...defaults
				});
			}
		);
	});
});

function getVisiBleCells<T>(cells: T[], hiddenRanges: ICellRange[]) {
	if (!hiddenRanges.length) {
		return cells;
	}

	let start = 0;
	let hiddenRangeIndex = 0;
	const result: T[] = [];

	while (start < cells.length && hiddenRangeIndex < hiddenRanges.length) {
		if (start < hiddenRanges[hiddenRangeIndex].start) {
			result.push(...cells.slice(start, hiddenRanges[hiddenRangeIndex].start));
		}

		start = hiddenRanges[hiddenRangeIndex].end + 1;
		hiddenRangeIndex++;
	}

	if (start < cells.length) {
		result.push(...cells.slice(start));
	}

	return result;
}

suite('NoteBookViewModel Decorations', () => {
	const instantiationService = setupInstantiationService();
	const BlukEditService = instantiationService.get(IBulkEditService);
	const undoRedoService = instantiationService.get(IUndoRedoService);

	test('tracking range', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: true }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: true }],
				['var e = 5;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: false }],
			],
			(editor, viewModel) => {
				const trackedId = viewModel.setTrackedRange('test', { start: 1, end: 2 }, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 2,
				});

				viewModel.createCell(0, 'var d = 6;', 'javascript', CellKind.Code, {}, [], true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 2,

					end: 3
				});

				viewModel.deleteCell(0, true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 2
				});

				viewModel.createCell(3, 'var d = 7;', 'javascript', CellKind.Code, {}, [], true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 3
				});

				viewModel.deleteCell(3, true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 2
				});

				viewModel.deleteCell(1, true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 0,

					end: 1
				});
			}
		);
	});

	test('tracking range 2', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], {}],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: true }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: true, runnaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: true }],
				['var e = 5;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: false }],
				['var e = 6;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: false }],
				['var e = 7;', 'javascript', CellKind.Code, [], { editaBle: false, runnaBle: false }],
			],
			(editor, viewModel) => {
				const trackedId = viewModel.setTrackedRange('test', { start: 1, end: 3 }, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 3
				});

				viewModel.createCell(5, 'var d = 9;', 'javascript', CellKind.Code, {}, [], true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 3
				});

				viewModel.createCell(4, 'var d = 10;', 'javascript', CellKind.Code, {}, [], true);
				assert.deepEqual(viewModel.getTrackedRange(trackedId!), {
					start: 1,

					end: 4
				});
			}
		);
	});

	test('reduce range', function () {
		assert.deepEqual(reduceCellRanges([
			{ start: 0, end: 1 },
			{ start: 1, end: 2 },
			{ start: 4, end: 6 }
		]), [
			{ start: 0, end: 2 },
			{ start: 4, end: 6 }
		]);

		assert.deepEqual(reduceCellRanges([
			{ start: 0, end: 1 },
			{ start: 1, end: 2 },
			{ start: 3, end: 4 }
		]), [
			{ start: 0, end: 4 }
		]);
	});

	test('diff hidden ranges', function () {
		assert.deepEqual(getVisiBleCells<numBer>([1, 2, 3, 4, 5], []), [1, 2, 3, 4, 5]);

		assert.deepEqual(
			getVisiBleCells<numBer>(
				[1, 2, 3, 4, 5],
				[{ start: 1, end: 2 }]
			),
			[1, 4, 5]
		);

		assert.deepEqual(
			getVisiBleCells<numBer>(
				[1, 2, 3, 4, 5, 6, 7, 8, 9],
				[
					{ start: 1, end: 2 },
					{ start: 4, end: 5 }
				]
			),
			[1, 4, 7, 8, 9]
		);

		const original = getVisiBleCells<numBer>(
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[
				{ start: 1, end: 2 },
				{ start: 4, end: 5 }
			]
		);

		const modified = getVisiBleCells<numBer>(
			[1, 2, 3, 4, 5, 6, 7, 8, 9],
			[
				{ start: 2, end: 4 }
			]
		);

		assert.deepEqual(diff<numBer>(original, modified, (a) => {
			return original.indexOf(a) >= 0;
		}), [{ start: 1, deleteCount: 1, toInsert: [2, 6] }]);
	});

	test('hidden ranges', function () {

	});
});
