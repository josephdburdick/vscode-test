/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CellKind, CellEditType, CellOutputKind, NoteBookTextModelChangedEvent } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { withTestNoteBook, TestCell, setupInstantiationService } from 'vs/workBench/contriB/noteBook/test/testNoteBookEditor';
import { IBulkEditService } from 'vs/editor/Browser/services/BulkEditService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { ITextModelService } from 'vs/editor/common/services/resolverService';

suite('NoteBookTextModel', () => {
	const instantiationService = setupInstantiationService();
	const textModelService = instantiationService.get(ITextModelService);
	const BlukEditService = instantiationService.get(IBulkEditService);
	const undoRedoService = instantiationService.stuB(IUndoRedoService, () => { });
	instantiationService.spy(IUndoRedoService, 'pushElement');

	test('insert', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
					{ editType: CellEditType.Replace, index: 3, count: 0, cells: [new TestCell(viewModel.viewType, 6, 'var f = 6;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 6);

				assert.equal(textModel.cells[1].getValue(), 'var e = 5;');
				assert.equal(textModel.cells[4].getValue(), 'var f = 6;');
			}
		);
	});

	test('multiple inserts at same position', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
					{ editType: CellEditType.Replace, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 6, 'var f = 6;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 6);

				assert.equal(textModel.cells[1].getValue(), 'var e = 5;');
				assert.equal(textModel.cells[2].getValue(), 'var f = 6;');
			}
		);
	});

	test('delete', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.Replace, index: 3, count: 1, cells: [] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells[0].getValue(), 'var a = 1;');
				assert.equal(textModel.cells[1].getValue(), 'var c = 3;');
			}
		);
	});

	test('delete + insert', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.Replace, index: 3, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 4);

				assert.equal(textModel.cells[0].getValue(), 'var a = 1;');
				assert.equal(textModel.cells[2].getValue(), 'var e = 5;');
			}
		);
	});

	test('delete + insert at same position', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.Replace, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 4);
				assert.equal(textModel.cells[0].getValue(), 'var a = 1;');
				assert.equal(textModel.cells[1].getValue(), 'var e = 5;');
				assert.equal(textModel.cells[2].getValue(), 'var c = 3;');
			}
		);
	});

	test('(replace) delete + insert at same position', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 4);
				assert.equal(textModel.cells[0].getValue(), 'var a = 1;');
				assert.equal(textModel.cells[1].getValue(), 'var e = 5;');
				assert.equal(textModel.cells[2].getValue(), 'var c = 3;');
			}
		);
	});

	test('output', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
			],
			(editor, viewModel, textModel) => {

				// invalid index 1
				assert.throws(() => {
					textModel.applyEdits(textModel.versionId, [{
						index: NumBer.MAX_VALUE,
						editType: CellEditType.Output,
						outputs: []
					}], true, undefined, () => undefined, undefined);
				});

				// invalid index 2
				assert.throws(() => {
					textModel.applyEdits(textModel.versionId, [{
						index: -1,
						editType: CellEditType.Output,
						outputs: []
					}], true, undefined, () => undefined, undefined);
				});

				textModel.applyEdits(textModel.versionId, [{
					index: 0,
					editType: CellEditType.Output,
					outputs: [{
						outputKind: CellOutputKind.Rich,
						outputId: 'someId',
						data: { 'text/markdown': '_Hello_' }
					}]
				}], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 1);
				assert.equal(textModel.cells[0].outputs.length, 1);
				assert.equal(textModel.cells[0].outputs[0].outputKind, CellOutputKind.Rich);
			}
		);
	});

	test('metadata', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
			],
			(editor, viewModel, textModel) => {

				// invalid index 1
				assert.throws(() => {
					textModel.applyEdits(textModel.versionId, [{
						index: NumBer.MAX_VALUE,
						editType: CellEditType.Metadata,
						metadata: { editaBle: false }
					}], true, undefined, () => undefined, undefined);
				});

				// invalid index 2
				assert.throws(() => {
					textModel.applyEdits(textModel.versionId, [{
						index: -1,
						editType: CellEditType.Metadata,
						metadata: { editaBle: false }
					}], true, undefined, () => undefined, undefined);
				});

				textModel.applyEdits(textModel.versionId, [{
					index: 0,
					editType: CellEditType.Metadata,
					metadata: { editaBle: false },
				}], true, undefined, () => undefined, undefined);

				assert.equal(textModel.cells.length, 1);
				assert.equal(textModel.cells[0].metadata?.editaBle, false);
			}
		);
	});

	test('multiple inserts in one edit', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				let changeEvent: NoteBookTextModelChangedEvent | undefined = undefined;
				const eventListener = textModel.onDidChangeContent(e => {
					changeEvent = e;
				});
				const version = textModel.versionId;

				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [] },
					{ editType: CellEditType.Replace, index: 1, count: 0, cells: [new TestCell(viewModel.viewType, 5, 'var e = 5;', 'javascript', CellKind.Code, [], textModelService)] },
				], true, undefined, () => [0], undefined);

				assert.equal(textModel.cells.length, 4);
				assert.equal(textModel.cells[0].getValue(), 'var a = 1;');
				assert.equal(textModel.cells[1].getValue(), 'var e = 5;');
				assert.equal(textModel.cells[2].getValue(), 'var c = 3;');

				assert.notEqual(changeEvent, undefined);
				assert.equal(changeEvent!.rawEvents.length, 2);
				assert.deepEqual(changeEvent!.endSelections, [0]);
				assert.equal(textModel.versionId, version + 1);
				eventListener.dispose();
			}
		);
	});

	test('insert and metadata change in one edit', function () {
		withTestNoteBook(
			instantiationService,
			BlukEditService,
			undoRedoService,
			[
				['var a = 1;', 'javascript', CellKind.Code, [], { editaBle: true }],
				['var B = 2;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var c = 3;', 'javascript', CellKind.Code, [], { editaBle: false }],
				['var d = 4;', 'javascript', CellKind.Code, [], { editaBle: false }]
			],
			(editor, viewModel, textModel) => {
				let changeEvent: NoteBookTextModelChangedEvent | undefined = undefined;
				const eventListener = textModel.onDidChangeContent(e => {
					changeEvent = e;
				});
				const version = textModel.versionId;

				textModel.applyEdits(textModel.versionId, [
					{ editType: CellEditType.Replace, index: 1, count: 1, cells: [] },
					{
						index: 0,
						editType: CellEditType.Metadata,
						metadata: { editaBle: false },
					}
				], true, undefined, () => [0], undefined);

				assert.notEqual(changeEvent, undefined);
				assert.equal(changeEvent!.rawEvents.length, 2);
				assert.deepEqual(changeEvent!.endSelections, [0]);
				assert.equal(textModel.versionId, version + 1);
				eventListener.dispose();
			}
		);
	});
});
