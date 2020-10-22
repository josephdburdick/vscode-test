/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CellKind } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { setupInstantiationService, withTestNoteBook } from 'vs/workBench/contriB/noteBook/test/testNoteBookEditor';
import { IBulkEditService } from 'vs/editor/Browser/services/BulkEditService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { FoldingModel } from 'vs/workBench/contriB/noteBook/Browser/contriB/fold/foldingModel';

function updateFoldingStateAtIndex(foldingModel: FoldingModel, index: numBer, collapsed: Boolean) {
	const range = foldingModel.regions.findRange(index + 1);
	foldingModel.setCollapsed(range, collapsed);
}

suite('NoteBook Folding', () => {
	const instantiationService = setupInstantiationService();
	const BlukEditService = instantiationService.get(IBulkEditService);
	const undoRedoService = instantiationService.stuB(IUndoRedoService, () => { });
	instantiationService.spy(IUndoRedoService, 'pushElement');

	test('Folding Based on markdown cells', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.1', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingController = new FoldingModel();
				foldingController.attachViewModel(viewModel);

				assert.equal(foldingController.regions.findRange(1), 0);
				assert.equal(foldingController.regions.findRange(2), 0);
				assert.equal(foldingController.regions.findRange(3), 1);
				assert.equal(foldingController.regions.findRange(4), 1);
				assert.equal(foldingController.regions.findRange(5), 1);
				assert.equal(foldingController.regions.findRange(6), 2);
				assert.equal(foldingController.regions.findRange(7), 2);
			}
		);
	});

	test('Top level header in a cell wins', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.1\n# header3', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingController = new FoldingModel();
				foldingController.attachViewModel(viewModel);

				assert.equal(foldingController.regions.findRange(1), 0);
				assert.equal(foldingController.regions.findRange(2), 0);
				assert.equal(foldingController.regions.getEndLineNumBer(0), 2);

				assert.equal(foldingController.regions.findRange(3), 1);
				assert.equal(foldingController.regions.findRange(4), 1);
				assert.equal(foldingController.regions.findRange(5), 1);
				assert.equal(foldingController.regions.getEndLineNumBer(1), 7);

				assert.equal(foldingController.regions.findRange(6), 2);
				assert.equal(foldingController.regions.findRange(7), 2);
				assert.equal(foldingController.regions.getEndLineNumBer(2), 7);
			}
		);
	});

	test('Folding', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.1', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				updateFoldingStateAtIndex(foldingModel, 0, true);
				viewModel.updateFoldingRanges(foldingModel.regions);
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 1, end: 6 }
				]);
			}
		);

		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				updateFoldingStateAtIndex(foldingModel, 2, true);
				viewModel.updateFoldingRanges(foldingModel.regions);

				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 3, end: 4 }
				]);
			}
		);

		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				updateFoldingStateAtIndex(foldingModel, 2, true);
				viewModel.updateFoldingRanges(foldingModel.regions);

				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 3, end: 6 }
				]);
			}
		);
	});

	test('Nested Folding', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				updateFoldingStateAtIndex(foldingModel, 0, true);
				viewModel.updateFoldingRanges(foldingModel.regions);

				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 1, end: 1 }
				]);

				updateFoldingStateAtIndex(foldingModel, 5, true);
				updateFoldingStateAtIndex(foldingModel, 2, true);
				viewModel.updateFoldingRanges(foldingModel.regions);

				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 1, end: 1 },
					{ start: 3, end: 6 }
				]);

				updateFoldingStateAtIndex(foldingModel, 2, false);
				viewModel.updateFoldingRanges(foldingModel.regions);
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 1, end: 1 },
					{ start: 6, end: 6 }
				]);

				// viewModel.insertCell(7, new TestCell(viewModel.viewType, 7, ['var c = 8;'], 'markdown', CellKind.Code, []), true);

				// assert.deepEqual(viewModel.getHiddenRanges(), [
				// 	{ start: 1, end: 1 },
				// 	{ start: 6, end: 7 }
				// ]);

				// viewModel.insertCell(1, new TestCell(viewModel.viewType, 8, ['var c = 9;'], 'markdown', CellKind.Code, []), true);
				// assert.deepEqual(viewModel.getHiddenRanges(), [
				// 	// the first collapsed range is now expanded as we insert content into it.
				// 	// { start: 1,},
				// 	{ start: 7, end: 8 }
				// ]);
			}
		);
	});

	test('Folding Memento', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				foldingModel.applyMemento([{ start: 2, end: 6 }]);
				viewModel.updateFoldingRanges(foldingModel.regions);

				// Note that hidden ranges !== folding ranges
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 3, end: 6 }
				]);
			}
		);

		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				foldingModel.applyMemento([
					{ start: 5, end: 6 },
					{ start: 10, end: 11 },
				]);
				viewModel.updateFoldingRanges(foldingModel.regions);

				// Note that hidden ranges !== folding ranges
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 6, end: 6 },
					{ start: 11, end: 11 }
				]);
			}
		);

		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				foldingModel.applyMemento([
					{ start: 5, end: 6 },
					{ start: 7, end: 11 },
				]);
				viewModel.updateFoldingRanges(foldingModel.regions);

				// Note that hidden ranges !== folding ranges
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 6, end: 6 },
					{ start: 8, end: 11 }
				]);
			}
		);
	});

	test('View Index', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				foldingModel.applyMemento([{ start: 2, end: 6 }]);
				viewModel.updateFoldingRanges(foldingModel.regions);

				// Note that hidden ranges !== folding ranges
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 3, end: 6 }
				]);

				assert.equal(viewModel.getNextVisiBleCellIndex(1), 2);
				assert.equal(viewModel.getNextVisiBleCellIndex(2), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(3), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(4), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(5), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(6), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(7), 8);
			}
		);

		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['# header 1', 'markdown', CellKind.Markdown, [], {}],
				['Body', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
				['# header 2.1\n', 'markdown', CellKind.Markdown, [], {}],
				['Body 2', 'markdown', CellKind.Markdown, [], {}],
				['Body 3', 'markdown', CellKind.Markdown, [], {}],
				['## header 2.2', 'markdown', CellKind.Markdown, [], {}],
				['var e = 7;', 'markdown', CellKind.Markdown, [], {}],
			],
			(editor, viewModel) => {
				const foldingModel = new FoldingModel();
				foldingModel.attachViewModel(viewModel);
				foldingModel.applyMemento([
					{ start: 5, end: 6 },
					{ start: 10, end: 11 },
				]);

				viewModel.updateFoldingRanges(foldingModel.regions);

				// Note that hidden ranges !== folding ranges
				assert.deepEqual(viewModel.getHiddenRanges(), [
					{ start: 6, end: 6 },
					{ start: 11, end: 11 }
				]);

				// folding ranges
				// [5, 6]
				// [10, 11]
				assert.equal(viewModel.getNextVisiBleCellIndex(4), 5);
				assert.equal(viewModel.getNextVisiBleCellIndex(5), 7);
				assert.equal(viewModel.getNextVisiBleCellIndex(6), 7);

				assert.equal(viewModel.getNextVisiBleCellIndex(9), 10);
				assert.equal(viewModel.getNextVisiBleCellIndex(10), 12);
				assert.equal(viewModel.getNextVisiBleCellIndex(11), 12);
			}
		);
	});
});
