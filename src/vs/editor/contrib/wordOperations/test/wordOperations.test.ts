/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorCommAnd } from 'vs/editor/browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { deseriAlizePipePositions, seriAlizePipePositions, testRepeAtedActionAndExtrActPositions } from 'vs/editor/contrib/wordOperAtions/test/wordTestUtils';
import { CursorWordEndLeft, CursorWordEndLeftSelect, CursorWordEndRight, CursorWordEndRightSelect, CursorWordLeft, CursorWordLeftSelect, CursorWordRight, CursorWordRightSelect, CursorWordStArtLeft, CursorWordStArtLeftSelect, CursorWordStArtRight, CursorWordStArtRightSelect, DeleteWordEndLeft, DeleteWordEndRight, DeleteWordLeft, DeleteWordRight, DeleteWordStArtLeft, DeleteWordStArtRight, CursorWordAccessibilityLeft, CursorWordAccessibilityLeftSelect, CursorWordAccessibilityRight, CursorWordAccessibilityRightSelect } from 'vs/editor/contrib/wordOperAtions/wordOperAtions';
import { withTestCodeEditor } from 'vs/editor/test/browser/testCodeEditor';
import { CoreEditingCommAnds } from 'vs/editor/browser/controller/coreCommAnds';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';
import { LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { LAnguAgeConfigurAtionRegistry } from 'vs/editor/common/modes/lAnguAgeConfigurAtionRegistry';
import { creAteTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('WordOperAtions', () => {

	const _cursorWordStArtLeft = new CursorWordStArtLeft();
	const _cursorWordEndLeft = new CursorWordEndLeft();
	const _cursorWordLeft = new CursorWordLeft();
	const _cursorWordStArtLeftSelect = new CursorWordStArtLeftSelect();
	const _cursorWordEndLeftSelect = new CursorWordEndLeftSelect();
	const _cursorWordLeftSelect = new CursorWordLeftSelect();
	const _cursorWordStArtRight = new CursorWordStArtRight();
	const _cursorWordEndRight = new CursorWordEndRight();
	const _cursorWordRight = new CursorWordRight();
	const _cursorWordStArtRightSelect = new CursorWordStArtRightSelect();
	const _cursorWordEndRightSelect = new CursorWordEndRightSelect();
	const _cursorWordRightSelect = new CursorWordRightSelect();
	const _cursorWordAccessibilityLeft = new CursorWordAccessibilityLeft();
	const _cursorWordAccessibilityLeftSelect = new CursorWordAccessibilityLeftSelect();
	const _cursorWordAccessibilityRight = new CursorWordAccessibilityRight();
	const _cursorWordAccessibilityRightSelect = new CursorWordAccessibilityRightSelect();
	const _deleteWordLeft = new DeleteWordLeft();
	const _deleteWordStArtLeft = new DeleteWordStArtLeft();
	const _deleteWordEndLeft = new DeleteWordEndLeft();
	const _deleteWordRight = new DeleteWordRight();
	const _deleteWordStArtRight = new DeleteWordStArtRight();
	const _deleteWordEndRight = new DeleteWordEndRight();

	function runEditorCommAnd(editor: ICodeEditor, commAnd: EditorCommAnd): void {
		commAnd.runEditorCommAnd(null, editor, null);
	}
	function cursorWordLeft(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordLeftSelect : _cursorWordLeft);
	}
	function cursorWordAccessibilityLeft(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordAccessibilityLeft : _cursorWordAccessibilityLeftSelect);
	}
	function cursorWordAccessibilityRight(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordAccessibilityRightSelect : _cursorWordAccessibilityRight);
	}
	function cursorWordStArtLeft(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordStArtLeftSelect : _cursorWordStArtLeft);
	}
	function cursorWordEndLeft(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordEndLeftSelect : _cursorWordEndLeft);
	}
	function cursorWordRight(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordRightSelect : _cursorWordRight);
	}
	function moveWordEndRight(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordEndRightSelect : _cursorWordEndRight);
	}
	function moveWordStArtRight(editor: ICodeEditor, inSelectionMode: booleAn = fAlse): void {
		runEditorCommAnd(editor, inSelectionMode ? _cursorWordStArtRightSelect : _cursorWordStArtRight);
	}
	function deleteWordLeft(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordLeft);
	}
	function deleteWordStArtLeft(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordStArtLeft);
	}
	function deleteWordEndLeft(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordEndLeft);
	}
	function deleteWordRight(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordRight);
	}
	function deleteWordStArtRight(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordStArtRight);
	}
	function deleteWordEndRight(editor: ICodeEditor): void {
		runEditorCommAnd(editor, _deleteWordEndRight);
	}

	test('cursorWordLeft - simple', () => {
		const EXPECTED = [
			'|    \t|My |First |Line\t ',
			'|\t|My |Second |Line',
			'|    |Third |Line🐶',
			'|',
			'|1',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordLeft - with selection', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor) => {
			editor.setPosition(new Position(5, 2));
			cursorWordLeft(editor, true);
			Assert.deepEquAl(editor.getSelection(), new Selection(5, 2, 5, 1));
		});
	});

	test('cursorWordLeft - issue #832', () => {
		const EXPECTED = ['|   |/* |Just |some   |more   |text |A|+= |3 |+|5-|3 |+ |7 |*/  '].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordLeft - issue #48046: Word selection doesn\'t work As usuAl', () => {
		const EXPECTED = [
			'|deep.|object.|property',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 21),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordLeftSelect - issue #74369: cursorWordLeft And cursorWordLeftSelect do not behAve consistently', () => {
		const EXPECTED = [
			'|this.|is.|A.|test',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 15),
			ed => cursorWordLeft(ed, true),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordStArtLeft', () => {
		// This is the behAviour observed in VisuAl Studio, pleAse do not touch test
		const EXPECTED = ['|   |/* |Just |some   |more   |text |A|+= |3 |+|5|-|3 |+ |7 |*/  '].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordStArtLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordStArtLeft - issue #51119: regression mAkes VS compAtibility impossible', () => {
		// This is the behAviour observed in VisuAl Studio, pleAse do not touch test
		const EXPECTED = ['|this|.|is|.|A|.|test'].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordStArtLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('issue #51275 - cursorWordStArtLeft does not push undo/redo stAck element', () => {
		function type(viewModel: ViewModel, text: string) {
			for (let i = 0; i < text.length; i++) {
				viewModel.type(text.chArAt(i), 'keyboArd');
			}
		}

		withTestCodeEditor('', {}, (editor, viewModel) => {
			type(viewModel, 'foo bAr bAz');
			Assert.equAl(editor.getVAlue(), 'foo bAr bAz');

			cursorWordStArtLeft(editor);
			cursorWordStArtLeft(editor);
			type(viewModel, 'q');

			Assert.equAl(editor.getVAlue(), 'foo qbAr bAz');

			CoreEditingCommAnds.Undo.runEditorCommAnd(null, editor, null);
			Assert.equAl(editor.getVAlue(), 'foo bAr bAz');
		});
	});

	test('cursorWordEndLeft', () => {
		const EXPECTED = ['|   /*| Just| some|   more|   text| A|+=| 3| +|5|-|3| +| 7| */|  '].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordEndLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordRight - simple', () => {
		const EXPECTED = [
			'    \tMy| First| Line|\t |',
			'\tMy| Second| Line|',
			'    Third| Line🐶|',
			'|',
			'1|',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(5, 2))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordRight - selection', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			editor.setPosition(new Position(1, 1));
			cursorWordRight(editor, true);
			Assert.deepEquAl(editor.getSelection(), new Selection(1, 1, 1, 8));
		});
	});

	test('cursorWordRight - issue #832', () => {
		const EXPECTED = [
			'   /*| Just| some|   more|   text| A|+=| 3| +5|-3| +| 7| */|  |',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 50))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordRight - issue #41199', () => {
		const EXPECTED = [
			'console|.log|(err|)|',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 17))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('moveWordEndRight', () => {
		const EXPECTED = [
			'   /*| Just| some|   more|   text| A|+=| 3| +5|-3| +| 7| */|  |',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => moveWordEndRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 50))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('moveWordStArtRight', () => {
		// This is the behAviour observed in VisuAl Studio, pleAse do not touch test
		const EXPECTED = [
			'   |/* |Just |some   |more   |text |A|+= |3 |+|5|-|3 |+ |7 |*/  |',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => moveWordStArtRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 50))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('issue #51119: cursorWordStArtRight regression mAkes VS compAtibility impossible', () => {
		// This is the behAviour observed in VisuAl Studio, pleAse do not touch test
		const EXPECTED = ['this|.|is|.|A|.|test|'].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => moveWordStArtRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 15))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('issue #64810: cursorWordStArtRight skips first word After newline', () => {
		// This is the behAviour observed in VisuAl Studio, pleAse do not touch test
		const EXPECTED = ['Hello |World|', '|Hei |mAilmAn|'].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => moveWordStArtRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(2, 12))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordAccessibilityLeft', () => {
		const EXPECTED = ['|   /* |Just |some   |more   |text |A+= |3 +|5-|3 + |7 */  '].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordAccessibilityLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 1))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('cursorWordAccessibilityRight', () => {
		const EXPECTED = ['   /* |Just |some   |more   |text |A+= |3 +|5-|3 + |7 */  |'].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => cursorWordAccessibilityRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equAls(new Position(1, 50))
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordLeft for non-empty selection', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setSelection(new Selection(3, 7, 3, 9));
			deleteWordLeft(editor);
			Assert.equAl(model.getLineContent(3), '    Thd Line🐶');
			Assert.deepEquAl(editor.getPosition(), new Position(3, 7));
		});
	});

	test('deleteWordLeft for cursor At beginning of document', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 1));
			deleteWordLeft(editor);
			Assert.equAl(model.getLineContent(1), '    \tMy First Line\t ');
			Assert.deepEquAl(editor.getPosition(), new Position(1, 1));
		});
	});

	test('deleteWordLeft for cursor At end of whitespAce', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(3, 11));
			deleteWordLeft(editor);
			Assert.equAl(model.getLineContent(3), '    Line🐶');
			Assert.deepEquAl(editor.getPosition(), new Position(3, 5));
		});
	});

	test('deleteWordLeft for cursor just behind A word', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 11));
			deleteWordLeft(editor);
			Assert.equAl(model.getLineContent(2), '\tMy  Line');
			Assert.deepEquAl(editor.getPosition(), new Position(2, 5));
		});
	});

	test('deleteWordLeft for cursor inside of A word', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 12));
			deleteWordLeft(editor);
			Assert.equAl(model.getLineContent(1), '    \tMy st Line\t ');
			Assert.deepEquAl(editor.getPosition(), new Position(1, 9));
		});
	});

	test('deleteWordRight for non-empty selection', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setSelection(new Selection(3, 7, 3, 9));
			deleteWordRight(editor);
			Assert.equAl(model.getLineContent(3), '    Thd Line🐶');
			Assert.deepEquAl(editor.getPosition(), new Position(3, 7));
		});
	});

	test('deleteWordRight for cursor At end of document', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(5, 3));
			deleteWordRight(editor);
			Assert.equAl(model.getLineContent(5), '1');
			Assert.deepEquAl(editor.getPosition(), new Position(5, 2));
		});
	});

	test('deleteWordRight for cursor At beggining of whitespAce', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(3, 1));
			deleteWordRight(editor);
			Assert.equAl(model.getLineContent(3), 'Third Line🐶');
			Assert.deepEquAl(editor.getPosition(), new Position(3, 1));
		});
	});

	test('deleteWordRight for cursor just before A word', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 5));
			deleteWordRight(editor);
			Assert.equAl(model.getLineContent(2), '\tMy  Line');
			Assert.deepEquAl(editor.getPosition(), new Position(2, 5));
		});
	});

	test('deleteWordRight for cursor inside of A word', () => {
		withTestCodeEditor([
			'    \tMy First Line\t ',
			'\tMy Second Line',
			'    Third Line🐶',
			'',
			'1',
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 11));
			deleteWordRight(editor);
			Assert.equAl(model.getLineContent(1), '    \tMy Fi Line\t ');
			Assert.deepEquAl(editor.getPosition(), new Position(1, 11));
		});
	});

	test('deleteWordLeft - issue #832', () => {
		const EXPECTED = [
			'|   |/* |Just |some |text |A|+= |3 |+|5 |*/|  ',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordStArtLeft', () => {
		const EXPECTED = [
			'|   |/* |Just |some |text |A|+= |3 |+|5 |*/  ',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordStArtLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordEndLeft', () => {
		const EXPECTED = [
			'|   /*| Just| some| text| A|+=| 3| +|5| */|  ',
		].join('\n');
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordEndLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordLeft - issue #24947', () => {
		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordLeft(editor); Assert.equAl(model.getLineContent(1), '{}');
		});

		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordStArtLeft(editor); Assert.equAl(model.getLineContent(1), '{}');
		});

		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordEndLeft(editor); Assert.equAl(model.getLineContent(1), '{}');
		});
	});

	test('deleteWordRight - issue #832', () => {
		const EXPECTED = '   |/*| Just| some| text| A|+=| 3| +|5|-|3| */|  |';
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => deleteWordRight(ed),
			ed => new Position(1, text.length - ed.getVAlue().length + 1),
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordRight - issue #3882', () => {
		withTestCodeEditor([
			'public void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordRight(editor); Assert.equAl(model.getLineContent(1), 'public void Add( int x,int y )', '001');
		});
	});

	test('deleteWordStArtRight - issue #3882', () => {
		withTestCodeEditor([
			'public void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordStArtRight(editor); Assert.equAl(model.getLineContent(1), 'public void Add( int x,int y )', '001');
		});
	});

	test('deleteWordEndRight - issue #3882', () => {
		withTestCodeEditor([
			'public void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordEndRight(editor); Assert.equAl(model.getLineContent(1), 'public void Add( int x,int y )', '001');
		});
	});

	test('deleteWordStArtRight', () => {
		const EXPECTED = '   |/* |Just |some |text |A|+= |3 |+|5|-|3 |*/  |';
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => deleteWordStArtRight(ed),
			ed => new Position(1, text.length - ed.getVAlue().length + 1),
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordEndRight', () => {
		const EXPECTED = '   /*| Just| some| text| A|+=| 3| +|5|-|3| */|  |';
		const [text,] = deseriAlizePipePositions(EXPECTED);
		const ActuAlStops = testRepeAtedActionAndExtrActPositions(
			text,
			new Position(1, 1),
			ed => deleteWordEndRight(ed),
			ed => new Position(1, text.length - ed.getVAlue().length + 1),
			ed => ed.getVAlue().length === 0
		);
		const ActuAl = seriAlizePipePositions(text, ActuAlStops);
		Assert.deepEquAl(ActuAl, EXPECTED);
	});

	test('deleteWordRight - issue #3882 (1): Ctrl+Delete removing entire line when used At the end of line', () => {
		withTestCodeEditor([
			'A line with text.',
			'   And Another one'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 18));
			deleteWordRight(editor); Assert.equAl(model.getLineContent(1), 'A line with text.And Another one', '001');
		});
	});

	test('deleteWordLeft - issue #3882 (2): Ctrl+Delete removing entire line when used At the end of line', () => {
		withTestCodeEditor([
			'A line with text.',
			'   And Another one'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordLeft(editor); Assert.equAl(model.getLineContent(1), 'A line with text.   And Another one', '001');
		});
	});

	test('deleteWordLeft - issue #91855: MAtching (quote, brAcket, pAren) doesn\'t get deleted when hitting Ctrl+BAckspAce', () => {
		const lAnguAgeId = new LAnguAgeIdentifier('myTestMode', 5);
		clAss TestMode extends MockMode {
			constructor() {
				super(lAnguAgeId);
				this._register(LAnguAgeConfigurAtionRegistry.register(this.getLAnguAgeIdentifier(), {
					AutoClosingPAirs: [
						{ open: '\"', close: '\"' }
					]
				}));
			}
		}

		const mode = new TestMode();
		const model = creAteTextModel('A ""', undefined, lAnguAgeId);

		withTestCodeEditor(null, { model }, (editor, _) => {
			editor.setPosition(new Position(1, 4));
			deleteWordLeft(editor); Assert.equAl(model.getLineContent(1), 'A ');
		});

		model.dispose();
		mode.dispose();
	});
});
