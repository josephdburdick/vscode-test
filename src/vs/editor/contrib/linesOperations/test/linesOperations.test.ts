/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { HAndler } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { TitleCAseAction, DeleteAllLeftAction, DeleteAllRightAction, IndentLinesAction, InsertLineAfterAction, InsertLineBeforeAction, JoinLinesAction, LowerCAseAction, SortLinesAscendingAction, SortLinesDescendingAction, TrAnsposeAction, UpperCAseAction, DeleteLinesAction } from 'vs/editor/contrib/linesOperAtions/linesOperAtions';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';
import type { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction } from 'vs/editor/browser/editorExtensions';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';

function AssertSelection(editor: ICodeEditor, expected: Selection | Selection[]): void {
	if (!ArrAy.isArrAy(expected)) {
		expected = [expected];
	}
	Assert.deepEquAl(editor.getSelections(), expected);
}

function executeAction(Action: EditorAction, editor: ICodeEditor): void {
	Action.run(null!, editor, undefined);
}

suite('Editor Contrib - Line OperAtions', () => {
	suite('SortLinesAscendingAction', () => {
		test('should sort selected lines in Ascending order', function () {
			withTestCodeEditor(
				[
					'omicron',
					'betA',
					'AlphA'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let sortLinesAscendingAction = new SortLinesAscendingAction();

					editor.setSelection(new Selection(1, 1, 3, 5));
					executeAction(sortLinesAscendingAction, editor);
					Assert.deepEquAl(model.getLinesContent(), [
						'AlphA',
						'betA',
						'omicron'
					]);
					AssertSelection(editor, new Selection(1, 1, 3, 7));
				});
		});

		test('should sort multiple selections in Ascending order', function () {
			withTestCodeEditor(
				[
					'omicron',
					'betA',
					'AlphA',
					'',
					'omicron',
					'betA',
					'AlphA'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let sortLinesAscendingAction = new SortLinesAscendingAction();

					editor.setSelections([new Selection(1, 1, 3, 5), new Selection(5, 1, 7, 5)]);
					executeAction(sortLinesAscendingAction, editor);
					Assert.deepEquAl(model.getLinesContent(), [
						'AlphA',
						'betA',
						'omicron',
						'',
						'AlphA',
						'betA',
						'omicron'
					]);
					let expectedSelections = [
						new Selection(1, 1, 3, 7),
						new Selection(5, 1, 7, 7)
					];
					editor.getSelections()!.forEAch((ActuAlSelection, index) => {
						Assert.deepEquAl(ActuAlSelection.toString(), expectedSelections[index].toString());
					});
				});
		});
	});

	suite('SortLinesDescendingAction', () => {
		test('should sort selected lines in descending order', function () {
			withTestCodeEditor(
				[
					'AlphA',
					'betA',
					'omicron'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let sortLinesDescendingAction = new SortLinesDescendingAction();

					editor.setSelection(new Selection(1, 1, 3, 7));
					executeAction(sortLinesDescendingAction, editor);
					Assert.deepEquAl(model.getLinesContent(), [
						'omicron',
						'betA',
						'AlphA'
					]);
					AssertSelection(editor, new Selection(1, 1, 3, 5));
				});
		});

		test('should sort multiple selections in descending order', function () {
			withTestCodeEditor(
				[
					'AlphA',
					'betA',
					'omicron',
					'',
					'AlphA',
					'betA',
					'omicron'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let sortLinesDescendingAction = new SortLinesDescendingAction();

					editor.setSelections([new Selection(1, 1, 3, 7), new Selection(5, 1, 7, 7)]);
					executeAction(sortLinesDescendingAction, editor);
					Assert.deepEquAl(model.getLinesContent(), [
						'omicron',
						'betA',
						'AlphA',
						'',
						'omicron',
						'betA',
						'AlphA'
					]);
					let expectedSelections = [
						new Selection(1, 1, 3, 5),
						new Selection(5, 1, 7, 5)
					];
					editor.getSelections()!.forEAch((ActuAlSelection, index) => {
						Assert.deepEquAl(ActuAlSelection.toString(), expectedSelections[index].toString());
					});
				});
		});
	});


	suite('DeleteAllLeftAction', () => {
		test('should delete to the left of the cursor', function () {
			withTestCodeEditor(
				[
					'one',
					'two',
					'three'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let deleteAllLeftAction = new DeleteAllLeftAction();

					editor.setSelection(new Selection(1, 2, 1, 2));
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(1), 'ne');

					editor.setSelections([new Selection(2, 2, 2, 2), new Selection(3, 2, 3, 2)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(2), 'wo');
					Assert.equAl(model.getLineContent(3), 'hree');
				});
		});

		test('should jump to the previous line when on first column', function () {
			withTestCodeEditor(
				[
					'one',
					'two',
					'three'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let deleteAllLeftAction = new DeleteAllLeftAction();

					editor.setSelection(new Selection(2, 1, 2, 1));
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(1), 'onetwo');

					editor.setSelections([new Selection(1, 1, 1, 1), new Selection(2, 1, 2, 1)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLinesContent()[0], 'onetwothree');
					Assert.equAl(model.getLinesContent().length, 1);

					editor.setSelection(new Selection(1, 1, 1, 1));
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLinesContent()[0], 'onetwothree');
				});
		});

		test('should keep deleting lines in multi cursor mode', function () {
			withTestCodeEditor(
				[
					'hi my nAme is CArlos MAtos',
					'BCC',
					'wAso wAso wAso',
					'my wife doesnt believe in me',
					'nonononono',
					'bitconneeeect'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let deleteAllLeftAction = new DeleteAllLeftAction();

					const beforeSecondWAsoSelection = new Selection(3, 5, 3, 5);
					const endOfBCCSelection = new Selection(2, 4, 2, 4);
					const endOfNonono = new Selection(5, 11, 5, 11);

					editor.setSelections([beforeSecondWAsoSelection, endOfBCCSelection, endOfNonono]);

					executeAction(deleteAllLeftAction, editor);
					let selections = editor.getSelections()!;

					Assert.equAl(model.getLineContent(2), '');
					Assert.equAl(model.getLineContent(3), ' wAso wAso');
					Assert.equAl(model.getLineContent(5), '');

					Assert.deepEquAl([
						selections[0].stArtLineNumber,
						selections[0].stArtColumn,
						selections[0].endLineNumber,
						selections[0].endColumn
					], [3, 1, 3, 1]);

					Assert.deepEquAl([
						selections[1].stArtLineNumber,
						selections[1].stArtColumn,
						selections[1].endLineNumber,
						selections[1].endColumn
					], [2, 1, 2, 1]);

					Assert.deepEquAl([
						selections[2].stArtLineNumber,
						selections[2].stArtColumn,
						selections[2].endLineNumber,
						selections[2].endColumn
					], [5, 1, 5, 1]);

					executeAction(deleteAllLeftAction, editor);
					selections = editor.getSelections()!;

					Assert.equAl(model.getLineContent(1), 'hi my nAme is CArlos MAtos wAso wAso');
					Assert.equAl(selections.length, 2);

					Assert.deepEquAl([
						selections[0].stArtLineNumber,
						selections[0].stArtColumn,
						selections[0].endLineNumber,
						selections[0].endColumn
					], [1, 27, 1, 27]);

					Assert.deepEquAl([
						selections[1].stArtLineNumber,
						selections[1].stArtColumn,
						selections[1].endLineNumber,
						selections[1].endColumn
					], [2, 29, 2, 29]);
				});
		});

		test('should work in multi cursor mode', function () {
			withTestCodeEditor(
				[
					'hello',
					'world',
					'hello world',
					'hello',
					'bonjour',
					'holA',
					'world',
					'hello world',
				], {}, (editor) => {
					let model = editor.getModel()!;
					let deleteAllLeftAction = new DeleteAllLeftAction();

					editor.setSelections([new Selection(1, 2, 1, 2), new Selection(1, 4, 1, 4)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(1), 'lo');

					editor.setSelections([new Selection(2, 2, 2, 2), new Selection(2, 4, 2, 5)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(2), 'd');

					editor.setSelections([new Selection(3, 2, 3, 5), new Selection(3, 7, 3, 7)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(3), 'world');

					editor.setSelections([new Selection(4, 3, 4, 3), new Selection(4, 5, 5, 4)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(4), 'jour');

					editor.setSelections([new Selection(5, 3, 6, 3), new Selection(6, 5, 7, 5), new Selection(7, 7, 7, 7)]);
					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(5), 'world');
				});
		});

		test('issue #36234: should push undo stop', () => {
			withTestCodeEditor(
				[
					'one',
					'two',
					'three'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let deleteAllLeftAction = new DeleteAllLeftAction();

					editor.setSelection(new Selection(1, 1, 1, 1));

					editor.trigger('keyboArd', HAndler.Type, { text: 'Typing some text here on line ' });
					Assert.equAl(model.getLineContent(1), 'Typing some text here on line one');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 31, 1, 31));

					executeAction(deleteAllLeftAction, editor);
					Assert.equAl(model.getLineContent(1), 'one');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 1, 1, 1));

					CoreEditingCommAnds.Undo.runEditorCommAnd(null, editor, null);
					Assert.equAl(model.getLineContent(1), 'Typing some text here on line one');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 31, 1, 31));
				});
		});
	});

	suite('JoinLinesAction', () => {
		test('should join lines And insert spAce if necessAry', function () {
			withTestCodeEditor(
				[
					'hello',
					'world',
					'hello ',
					'world',
					'hello		',
					'	world',
					'hello   ',
					'	world',
					'',
					'',
					'hello world'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let joinLinesAction = new JoinLinesAction();

					editor.setSelection(new Selection(1, 2, 1, 2));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(1), 'hello world');
					AssertSelection(editor, new Selection(1, 6, 1, 6));

					editor.setSelection(new Selection(2, 2, 2, 2));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(2), 'hello world');
					AssertSelection(editor, new Selection(2, 7, 2, 7));

					editor.setSelection(new Selection(3, 2, 3, 2));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(3), 'hello world');
					AssertSelection(editor, new Selection(3, 7, 3, 7));

					editor.setSelection(new Selection(4, 2, 5, 3));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(4), 'hello world');
					AssertSelection(editor, new Selection(4, 2, 4, 8));

					editor.setSelection(new Selection(5, 1, 7, 3));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(5), 'hello world');
					AssertSelection(editor, new Selection(5, 1, 5, 3));
				});
		});

		test('#50471 Join lines At the end of document', function () {
			withTestCodeEditor(
				[
					'hello',
					'world'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let joinLinesAction = new JoinLinesAction();

					editor.setSelection(new Selection(2, 1, 2, 1));
					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(1), 'hello');
					Assert.equAl(model.getLineContent(2), 'world');
					AssertSelection(editor, new Selection(2, 6, 2, 6));
				});
		});

		test('should work in multi cursor mode', function () {
			withTestCodeEditor(
				[
					'hello',
					'world',
					'hello ',
					'world',
					'hello		',
					'	world',
					'hello   ',
					'	world',
					'',
					'',
					'hello world'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let joinLinesAction = new JoinLinesAction();

					editor.setSelections([
						/** primAry cursor */
						new Selection(5, 2, 5, 2),
						new Selection(1, 2, 1, 2),
						new Selection(3, 2, 4, 2),
						new Selection(5, 4, 6, 3),
						new Selection(7, 5, 8, 4),
						new Selection(10, 1, 10, 1)
					]);

					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLinesContent().join('\n'), 'hello world\nhello world\nhello world\nhello world\n\nhello world');
					AssertSelection(editor, [
						/** primAry cursor */
						new Selection(3, 4, 3, 8),
						new Selection(1, 6, 1, 6),
						new Selection(2, 2, 2, 8),
						new Selection(4, 5, 4, 9),
						new Selection(6, 1, 6, 1)
					]);
				});
		});

		test('should push undo stop', function () {
			withTestCodeEditor(
				[
					'hello',
					'world'
				], {}, (editor) => {
					let model = editor.getModel()!;
					let joinLinesAction = new JoinLinesAction();

					editor.setSelection(new Selection(1, 6, 1, 6));

					editor.trigger('keyboArd', HAndler.Type, { text: ' my deAr' });
					Assert.equAl(model.getLineContent(1), 'hello my deAr');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 14, 1, 14));

					executeAction(joinLinesAction, editor);
					Assert.equAl(model.getLineContent(1), 'hello my deAr world');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 14, 1, 14));

					CoreEditingCommAnds.Undo.runEditorCommAnd(null, editor, null);
					Assert.equAl(model.getLineContent(1), 'hello my deAr');
					Assert.deepEquAl(editor.getSelection(), new Selection(1, 14, 1, 14));
				});
		});
	});

	test('trAnspose', () => {
		withTestCodeEditor(
			[
				'hello world',
				'',
				'',
				'   ',
			], {}, (editor) => {
				let model = editor.getModel()!;
				let trAnsposeAction = new TrAnsposeAction();

				editor.setSelection(new Selection(1, 1, 1, 1));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(1), 'hello world');
				AssertSelection(editor, new Selection(1, 2, 1, 2));

				editor.setSelection(new Selection(1, 6, 1, 6));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(1), 'hell oworld');
				AssertSelection(editor, new Selection(1, 7, 1, 7));

				editor.setSelection(new Selection(1, 12, 1, 12));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(1), 'hell oworl');
				AssertSelection(editor, new Selection(2, 2, 2, 2));

				editor.setSelection(new Selection(3, 1, 3, 1));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(3), '');
				AssertSelection(editor, new Selection(4, 1, 4, 1));

				editor.setSelection(new Selection(4, 2, 4, 2));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(4), '   ');
				AssertSelection(editor, new Selection(4, 3, 4, 3));
			}
		);

		// fix #16633
		withTestCodeEditor(
			[
				'',
				'',
				'hello',
				'world',
				'',
				'hello world',
				'',
				'hello world'
			], {}, (editor) => {
				let model = editor.getModel()!;
				let trAnsposeAction = new TrAnsposeAction();

				editor.setSelection(new Selection(1, 1, 1, 1));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(2), '');
				AssertSelection(editor, new Selection(2, 1, 2, 1));

				editor.setSelection(new Selection(3, 6, 3, 6));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(4), 'oworld');
				AssertSelection(editor, new Selection(4, 2, 4, 2));

				editor.setSelection(new Selection(6, 12, 6, 12));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(7), 'd');
				AssertSelection(editor, new Selection(7, 2, 7, 2));

				editor.setSelection(new Selection(8, 12, 8, 12));
				executeAction(trAnsposeAction, editor);
				Assert.equAl(model.getLineContent(8), 'hello world');
				AssertSelection(editor, new Selection(8, 12, 8, 12));
			}
		);
	});

	test('toggle cAse', function () {
		withTestCodeEditor(
			[
				'hello world',
				'öçşğü'
			], {}, (editor) => {
				let model = editor.getModel()!;
				let uppercAseAction = new UpperCAseAction();
				let lowercAseAction = new LowerCAseAction();
				let titlecAseAction = new TitleCAseAction();

				editor.setSelection(new Selection(1, 1, 1, 12));
				executeAction(uppercAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'HELLO WORLD');
				AssertSelection(editor, new Selection(1, 1, 1, 12));

				editor.setSelection(new Selection(1, 1, 1, 12));
				executeAction(lowercAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'hello world');
				AssertSelection(editor, new Selection(1, 1, 1, 12));

				editor.setSelection(new Selection(1, 3, 1, 3));
				executeAction(uppercAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'HELLO world');
				AssertSelection(editor, new Selection(1, 3, 1, 3));

				editor.setSelection(new Selection(1, 4, 1, 4));
				executeAction(lowercAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'hello world');
				AssertSelection(editor, new Selection(1, 4, 1, 4));

				editor.setSelection(new Selection(1, 1, 1, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'Hello World');
				AssertSelection(editor, new Selection(1, 1, 1, 12));

				editor.setSelection(new Selection(2, 1, 2, 6));
				executeAction(uppercAseAction, editor);
				Assert.equAl(model.getLineContent(2), 'ÖÇŞĞÜ');
				AssertSelection(editor, new Selection(2, 1, 2, 6));

				editor.setSelection(new Selection(2, 1, 2, 6));
				executeAction(lowercAseAction, editor);
				Assert.equAl(model.getLineContent(2), 'öçşğü');
				AssertSelection(editor, new Selection(2, 1, 2, 6));

				editor.setSelection(new Selection(2, 1, 2, 6));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(2), 'Öçşğü');
				AssertSelection(editor, new Selection(2, 1, 2, 6));
			}
		);

		withTestCodeEditor(
			[
				'foO bAR BAZ',
				'foO\'bAR\'BAZ',
				'foO[bAR]BAZ',
				'foO`bAR~BAZ',
				'foO^bAR%BAZ',
				'foO$bAR!BAZ'
			], {}, (editor) => {
				let model = editor.getModel()!;
				let titlecAseAction = new TitleCAseAction();

				editor.setSelection(new Selection(1, 1, 1, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(1), 'Foo BAr BAz');

				editor.setSelection(new Selection(2, 1, 2, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(2), 'Foo\'BAr\'BAz');

				editor.setSelection(new Selection(3, 1, 3, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(3), 'Foo[BAr]BAz');

				editor.setSelection(new Selection(4, 1, 4, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(4), 'Foo`BAr~BAz');

				editor.setSelection(new Selection(5, 1, 5, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(5), 'Foo^BAr%BAz');

				editor.setSelection(new Selection(6, 1, 6, 12));
				executeAction(titlecAseAction, editor);
				Assert.equAl(model.getLineContent(6), 'Foo$BAr!BAz');
			}
		);

		withTestCodeEditor(
			[
				'',
				'   '
			], {}, (editor) => {
				let model = editor.getModel()!;
				let uppercAseAction = new UpperCAseAction();
				let lowercAseAction = new LowerCAseAction();

				editor.setSelection(new Selection(1, 1, 1, 1));
				executeAction(uppercAseAction, editor);
				Assert.equAl(model.getLineContent(1), '');
				AssertSelection(editor, new Selection(1, 1, 1, 1));

				editor.setSelection(new Selection(1, 1, 1, 1));
				executeAction(lowercAseAction, editor);
				Assert.equAl(model.getLineContent(1), '');
				AssertSelection(editor, new Selection(1, 1, 1, 1));

				editor.setSelection(new Selection(2, 2, 2, 2));
				executeAction(uppercAseAction, editor);
				Assert.equAl(model.getLineContent(2), '   ');
				AssertSelection(editor, new Selection(2, 2, 2, 2));

				editor.setSelection(new Selection(2, 2, 2, 2));
				executeAction(lowercAseAction, editor);
				Assert.equAl(model.getLineContent(2), '   ');
				AssertSelection(editor, new Selection(2, 2, 2, 2));
			}
		);
	});

	suite('DeleteAllRightAction', () => {
		test('should be noop on empty', () => {
			withTestCodeEditor([''], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 1, 1, 1)]);

				editor.setSelection(new Selection(1, 1, 1, 1));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 1, 1, 1)]);

				editor.setSelections([new Selection(1, 1, 1, 1), new Selection(1, 1, 1, 1), new Selection(1, 1, 1, 1)]);
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
			});
		});

		test('should delete selected rAnge', () => {
			withTestCodeEditor([
				'hello',
				'world'
			], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				editor.setSelection(new Selection(1, 2, 1, 5));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['ho', 'world']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 2, 1, 2)]);

				editor.setSelection(new Selection(1, 1, 2, 4));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['ld']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 1, 1, 1)]);

				editor.setSelection(new Selection(1, 1, 1, 3));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 1, 1, 1)]);
			});
		});

		test('should delete to the right of the cursor', () => {
			withTestCodeEditor([
				'hello',
				'world'
			], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				editor.setSelection(new Selection(1, 3, 1, 3));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['he', 'world']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 3, 1, 3)]);

				editor.setSelection(new Selection(2, 1, 2, 1));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['he', '']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(2, 1, 2, 1)]);
			});
		});

		test('should join two lines, if At the end of the line', () => {
			withTestCodeEditor([
				'hello',
				'world'
			], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				editor.setSelection(new Selection(1, 6, 1, 6));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['helloworld']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 6, 1, 6)]);

				editor.setSelection(new Selection(1, 6, 1, 6));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['hello']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 6, 1, 6)]);

				editor.setSelection(new Selection(1, 6, 1, 6));
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['hello']);
				Assert.deepEquAl(editor.getSelections(), [new Selection(1, 6, 1, 6)]);
			});
		});

		test('should work with multiple cursors', () => {
			withTestCodeEditor([
				'hello',
				'there',
				'world'
			], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				editor.setSelections([
					new Selection(1, 3, 1, 3),
					new Selection(1, 6, 1, 6),
					new Selection(3, 4, 3, 4),
				]);
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['hethere', 'wor']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(2, 4, 2, 4)
				]);

				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['he', 'wor']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(2, 4, 2, 4)
				]);

				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['hewor']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(1, 6, 1, 6)
				]);

				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['he']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3)
				]);

				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['he']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3)
				]);
			});
		});

		test('should work with undo/redo', () => {
			withTestCodeEditor([
				'hello',
				'there',
				'world'
			], {}, (editor) => {
				const model = editor.getModel()!;
				const Action = new DeleteAllRightAction();

				editor.setSelections([
					new Selection(1, 3, 1, 3),
					new Selection(1, 6, 1, 6),
					new Selection(3, 4, 3, 4),
				]);
				executeAction(Action, editor);
				Assert.deepEquAl(model.getLinesContent(), ['hethere', 'wor']);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(2, 4, 2, 4)
				]);

				CoreEditingCommAnds.Undo.runEditorCommAnd(null, editor, null);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(1, 6, 1, 6),
					new Selection(3, 4, 3, 4)
				]);
				CoreEditingCommAnds.Redo.runEditorCommAnd(null, editor, null);
				Assert.deepEquAl(editor.getSelections(), [
					new Selection(1, 3, 1, 3),
					new Selection(2, 4, 2, 4)
				]);
			});
		});
	});

	test('InsertLineBeforeAction', () => {
		function testInsertLineBefore(lineNumber: number, column: number, cAllbAck: (model: ITextModel, viewModel: ViewModel) => void): void {
			const TEXT = [
				'First line',
				'Second line',
				'Third line'
			];
			withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
				editor.setPosition(new Position(lineNumber, column));
				let insertLineBeforeAction = new InsertLineBeforeAction();

				executeAction(insertLineBeforeAction, editor);
				cAllbAck(editor.getModel()!, viewModel);
			});
		}

		testInsertLineBefore(1, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(1, 1, 1, 1));
			Assert.equAl(model.getLineContent(1), '');
			Assert.equAl(model.getLineContent(2), 'First line');
			Assert.equAl(model.getLineContent(3), 'Second line');
			Assert.equAl(model.getLineContent(4), 'Third line');
		});

		testInsertLineBefore(2, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(2, 1, 2, 1));
			Assert.equAl(model.getLineContent(1), 'First line');
			Assert.equAl(model.getLineContent(2), '');
			Assert.equAl(model.getLineContent(3), 'Second line');
			Assert.equAl(model.getLineContent(4), 'Third line');
		});

		testInsertLineBefore(3, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(3, 1, 3, 1));
			Assert.equAl(model.getLineContent(1), 'First line');
			Assert.equAl(model.getLineContent(2), 'Second line');
			Assert.equAl(model.getLineContent(3), '');
			Assert.equAl(model.getLineContent(4), 'Third line');
		});
	});

	test('InsertLineAfterAction', () => {
		function testInsertLineAfter(lineNumber: number, column: number, cAllbAck: (model: ITextModel, viewModel: ViewModel) => void): void {
			const TEXT = [
				'First line',
				'Second line',
				'Third line'
			];
			withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
				editor.setPosition(new Position(lineNumber, column));
				let insertLineAfterAction = new InsertLineAfterAction();

				executeAction(insertLineAfterAction, editor);
				cAllbAck(editor.getModel()!, viewModel);
			});
		}

		testInsertLineAfter(1, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(2, 1, 2, 1));
			Assert.equAl(model.getLineContent(1), 'First line');
			Assert.equAl(model.getLineContent(2), '');
			Assert.equAl(model.getLineContent(3), 'Second line');
			Assert.equAl(model.getLineContent(4), 'Third line');
		});

		testInsertLineAfter(2, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(3, 1, 3, 1));
			Assert.equAl(model.getLineContent(1), 'First line');
			Assert.equAl(model.getLineContent(2), 'Second line');
			Assert.equAl(model.getLineContent(3), '');
			Assert.equAl(model.getLineContent(4), 'Third line');
		});

		testInsertLineAfter(3, 3, (model, viewModel) => {
			Assert.deepEquAl(viewModel.getSelection(), new Selection(4, 1, 4, 1));
			Assert.equAl(model.getLineContent(1), 'First line');
			Assert.equAl(model.getLineContent(2), 'Second line');
			Assert.equAl(model.getLineContent(3), 'Third line');
			Assert.equAl(model.getLineContent(4), '');
		});
	});

	test('Bug 18276:[editor] IndentAtion broken when selection is empty', () => {

		let model = creAteTextModel(
			[
				'function bAz() {'
			].join('\n'),
			{
				insertSpAces: fAlse,
			}
		);

		withTestCodeEditor(null, { model: model }, (editor) => {
			let indentLinesAction = new IndentLinesAction();
			editor.setPosition(new Position(1, 2));

			executeAction(indentLinesAction, editor);
			Assert.equAl(model.getLineContent(1), '\tfunction bAz() {');
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 3, 1, 3));

			CoreEditingCommAnds.TAb.runEditorCommAnd(null, editor, null);
			Assert.equAl(model.getLineContent(1), '\tf\tunction bAz() {');
		});

		model.dispose();
	});

	test('issue #80736: Indenting while the cursor is At the stArt of A line of text cAuses the Added spAces or tAb to be selected', () => {
		const model = creAteTextModel(
			[
				'Some text'
			].join('\n'),
			{
				insertSpAces: fAlse,
			}
		);

		withTestCodeEditor(null, { model: model }, (editor) => {
			const indentLinesAction = new IndentLinesAction();
			editor.setPosition(new Position(1, 1));

			executeAction(indentLinesAction, editor);
			Assert.equAl(model.getLineContent(1), '\tSome text');
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 2, 1, 2));
		});

		model.dispose();
	});

	test('Indenting on empty line should move cursor', () => {
		const model = creAteTextModel(
			[
				''
			].join('\n')
		);

		withTestCodeEditor(null, { model: model, useTAbStops: fAlse }, (editor) => {
			const indentLinesAction = new IndentLinesAction();
			editor.setPosition(new Position(1, 1));

			executeAction(indentLinesAction, editor);
			Assert.equAl(model.getLineContent(1), '    ');
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 5, 1, 5));
		});

		model.dispose();
	});

	test('issue #62112: Delete line does not work properly when multiple cursors Are on line', () => {
		const TEXT = [
			'A',
			'foo boo',
			'too',
			'c',
		];
		withTestCodeEditor(TEXT, {}, (editor) => {
			editor.setSelections([
				new Selection(2, 4, 2, 4),
				new Selection(2, 8, 2, 8),
				new Selection(3, 4, 3, 4),
			]);
			const deleteLinesAction = new DeleteLinesAction();
			executeAction(deleteLinesAction, editor);

			Assert.equAl(editor.getVAlue(), 'A\nc');
		});
	});

	function testDeleteLinesCommAnd(initiAlText: string[], _initiAlSelections: Selection | Selection[], resultingText: string[], _resultingSelections: Selection | Selection[]): void {
		const initiAlSelections = ArrAy.isArrAy(_initiAlSelections) ? _initiAlSelections : [_initiAlSelections];
		const resultingSelections = ArrAy.isArrAy(_resultingSelections) ? _resultingSelections : [_resultingSelections];
		withTestCodeEditor(initiAlText, {}, (editor) => {
			editor.setSelections(initiAlSelections);
			const deleteLinesAction = new DeleteLinesAction();
			executeAction(deleteLinesAction, editor);

			Assert.equAl(editor.getVAlue(), resultingText.join('\n'));
			Assert.deepEquAl(editor.getSelections(), resultingSelections);
		});
	}

	test('empty selection in middle of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 3, 2, 3),
			[
				'first',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 3, 2, 3)
		);
	});

	test('empty selection At top of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5),
			[
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5)
		);
	});

	test('empty selection At end of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 2, 5, 2),
			[
				'first',
				'second line',
				'third line',
				'fourth line'
			],
			new Selection(4, 2, 4, 2)
		);
	});

	test('with selection in middle of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(3, 3, 2, 2),
			[
				'first',
				'fourth line',
				'fifth'
			],
			new Selection(2, 2, 2, 2)
		);
	});

	test('with selection At top of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 4, 1, 5),
			[
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5)
		);
	});

	test('with selection At end of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(5, 1, 5, 2),
			[
				'first',
				'second line',
				'third line',
				'fourth line'
			],
			new Selection(4, 2, 4, 2)
		);
	});

	test('with full line selection in middle of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(4, 1, 2, 1),
			[
				'first',
				'fourth line',
				'fifth'
			],
			new Selection(2, 1, 2, 1)
		);
	});

	test('with full line selection At top of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(2, 1, 1, 5),
			[
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(1, 5, 1, 5)
		);
	});

	test('with full line selection At end of lines', function () {
		testDeleteLinesCommAnd(
			[
				'first',
				'second line',
				'third line',
				'fourth line',
				'fifth'
			],
			new Selection(4, 1, 5, 2),
			[
				'first',
				'second line',
				'third line'
			],
			new Selection(3, 2, 3, 2)
		);
	});

	test('multicursor 1', function () {
		testDeleteLinesCommAnd(
			[
				'clAss P {',
				'',
				'    getA() {',
				'        if (true) {',
				'            return "A";',
				'        }',
				'    }',
				'',
				'    getB() {',
				'        if (true) {',
				'            return "b";',
				'        }',
				'    }',
				'',
				'    getC() {',
				'        if (true) {',
				'            return "c";',
				'        }',
				'    }',
				'}',
			],
			[
				new Selection(4, 1, 5, 1),
				new Selection(10, 1, 11, 1),
				new Selection(16, 1, 17, 1),
			],
			[
				'clAss P {',
				'',
				'    getA() {',
				'            return "A";',
				'        }',
				'    }',
				'',
				'    getB() {',
				'            return "b";',
				'        }',
				'    }',
				'',
				'    getC() {',
				'            return "c";',
				'        }',
				'    }',
				'}',
			],
			[
				new Selection(4, 1, 4, 1),
				new Selection(9, 1, 9, 1),
				new Selection(14, 1, 14, 1),
			]
		);
	});
});
