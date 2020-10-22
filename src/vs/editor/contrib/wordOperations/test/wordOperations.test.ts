/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorCommand } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { deserializePipePositions, serializePipePositions, testRepeatedActionAndExtractPositions } from 'vs/editor/contriB/wordOperations/test/wordTestUtils';
import { CursorWordEndLeft, CursorWordEndLeftSelect, CursorWordEndRight, CursorWordEndRightSelect, CursorWordLeft, CursorWordLeftSelect, CursorWordRight, CursorWordRightSelect, CursorWordStartLeft, CursorWordStartLeftSelect, CursorWordStartRight, CursorWordStartRightSelect, DeleteWordEndLeft, DeleteWordEndRight, DeleteWordLeft, DeleteWordRight, DeleteWordStartLeft, DeleteWordStartRight, CursorWordAccessiBilityLeft, CursorWordAccessiBilityLeftSelect, CursorWordAccessiBilityRight, CursorWordAccessiBilityRightSelect } from 'vs/editor/contriB/wordOperations/wordOperations';
import { withTestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { CoreEditingCommands } from 'vs/editor/Browser/controller/coreCommands';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';
import { LanguageIdentifier } from 'vs/editor/common/modes';
import { MockMode } from 'vs/editor/test/common/mocks/mockMode';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { createTextModel } from 'vs/editor/test/common/editorTestUtils';

suite('WordOperations', () => {

	const _cursorWordStartLeft = new CursorWordStartLeft();
	const _cursorWordEndLeft = new CursorWordEndLeft();
	const _cursorWordLeft = new CursorWordLeft();
	const _cursorWordStartLeftSelect = new CursorWordStartLeftSelect();
	const _cursorWordEndLeftSelect = new CursorWordEndLeftSelect();
	const _cursorWordLeftSelect = new CursorWordLeftSelect();
	const _cursorWordStartRight = new CursorWordStartRight();
	const _cursorWordEndRight = new CursorWordEndRight();
	const _cursorWordRight = new CursorWordRight();
	const _cursorWordStartRightSelect = new CursorWordStartRightSelect();
	const _cursorWordEndRightSelect = new CursorWordEndRightSelect();
	const _cursorWordRightSelect = new CursorWordRightSelect();
	const _cursorWordAccessiBilityLeft = new CursorWordAccessiBilityLeft();
	const _cursorWordAccessiBilityLeftSelect = new CursorWordAccessiBilityLeftSelect();
	const _cursorWordAccessiBilityRight = new CursorWordAccessiBilityRight();
	const _cursorWordAccessiBilityRightSelect = new CursorWordAccessiBilityRightSelect();
	const _deleteWordLeft = new DeleteWordLeft();
	const _deleteWordStartLeft = new DeleteWordStartLeft();
	const _deleteWordEndLeft = new DeleteWordEndLeft();
	const _deleteWordRight = new DeleteWordRight();
	const _deleteWordStartRight = new DeleteWordStartRight();
	const _deleteWordEndRight = new DeleteWordEndRight();

	function runEditorCommand(editor: ICodeEditor, command: EditorCommand): void {
		command.runEditorCommand(null, editor, null);
	}
	function cursorWordLeft(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordLeftSelect : _cursorWordLeft);
	}
	function cursorWordAccessiBilityLeft(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordAccessiBilityLeft : _cursorWordAccessiBilityLeftSelect);
	}
	function cursorWordAccessiBilityRight(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordAccessiBilityRightSelect : _cursorWordAccessiBilityRight);
	}
	function cursorWordStartLeft(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordStartLeftSelect : _cursorWordStartLeft);
	}
	function cursorWordEndLeft(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordEndLeftSelect : _cursorWordEndLeft);
	}
	function cursorWordRight(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordRightSelect : _cursorWordRight);
	}
	function moveWordEndRight(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordEndRightSelect : _cursorWordEndRight);
	}
	function moveWordStartRight(editor: ICodeEditor, inSelectionMode: Boolean = false): void {
		runEditorCommand(editor, inSelectionMode ? _cursorWordStartRightSelect : _cursorWordStartRight);
	}
	function deleteWordLeft(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordLeft);
	}
	function deleteWordStartLeft(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordStartLeft);
	}
	function deleteWordEndLeft(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordEndLeft);
	}
	function deleteWordRight(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordRight);
	}
	function deleteWordStartRight(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordStartRight);
	}
	function deleteWordEndRight(editor: ICodeEditor): void {
		runEditorCommand(editor, _deleteWordEndRight);
	}

	test('cursorWordLeft - simple', () => {
		const EXPECTED = [
			'|    \t|My |First |Line\t ',
			'|\t|My |Second |Line',
			'|    |Third |Line🐶',
			'|',
			'|1',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
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
			assert.deepEqual(editor.getSelection(), new Selection(5, 2, 5, 1));
		});
	});

	test('cursorWordLeft - issue #832', () => {
		const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5-|3 |+ |7 |*/  '].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordLeft - issue #48046: Word selection doesn\'t work as usual', () => {
		const EXPECTED = [
			'|deep.|oBject.|property',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 21),
			ed => cursorWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordLeftSelect - issue #74369: cursorWordLeft and cursorWordLeftSelect do not Behave consistently', () => {
		const EXPECTED = [
			'|this.|is.|a.|test',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 15),
			ed => cursorWordLeft(ed, true),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordStartLeft', () => {
		// This is the Behaviour oBserved in Visual Studio, please do not touch test
		const EXPECTED = ['|   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  '].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordStartLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordStartLeft - issue #51119: regression makes VS compatiBility impossiBle', () => {
		// This is the Behaviour oBserved in Visual Studio, please do not touch test
		const EXPECTED = ['|this|.|is|.|a|.|test'].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordStartLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('issue #51275 - cursorWordStartLeft does not push undo/redo stack element', () => {
		function type(viewModel: ViewModel, text: string) {
			for (let i = 0; i < text.length; i++) {
				viewModel.type(text.charAt(i), 'keyBoard');
			}
		}

		withTestCodeEditor('', {}, (editor, viewModel) => {
			type(viewModel, 'foo Bar Baz');
			assert.equal(editor.getValue(), 'foo Bar Baz');

			cursorWordStartLeft(editor);
			cursorWordStartLeft(editor);
			type(viewModel, 'q');

			assert.equal(editor.getValue(), 'foo qBar Baz');

			CoreEditingCommands.Undo.runEditorCommand(null, editor, null);
			assert.equal(editor.getValue(), 'foo Bar Baz');
		});
	});

	test('cursorWordEndLeft', () => {
		const EXPECTED = ['|   /*| Just| some|   more|   text| a|+=| 3| +|5|-|3| +| 7| */|  '].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordEndLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordRight - simple', () => {
		const EXPECTED = [
			'    \tMy| First| Line|\t |',
			'\tMy| Second| Line|',
			'    Third| Line🐶|',
			'|',
			'1|',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(5, 2))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
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
			assert.deepEqual(editor.getSelection(), new Selection(1, 1, 1, 8));
		});
	});

	test('cursorWordRight - issue #832', () => {
		const EXPECTED = [
			'   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 50))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordRight - issue #41199', () => {
		const EXPECTED = [
			'console|.log|(err|)|',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => cursorWordRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 17))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('moveWordEndRight', () => {
		const EXPECTED = [
			'   /*| Just| some|   more|   text| a|+=| 3| +5|-3| +| 7| */|  |',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => moveWordEndRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 50))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('moveWordStartRight', () => {
		// This is the Behaviour oBserved in Visual Studio, please do not touch test
		const EXPECTED = [
			'   |/* |Just |some   |more   |text |a|+= |3 |+|5|-|3 |+ |7 |*/  |',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => moveWordStartRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 50))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('issue #51119: cursorWordStartRight regression makes VS compatiBility impossiBle', () => {
		// This is the Behaviour oBserved in Visual Studio, please do not touch test
		const EXPECTED = ['this|.|is|.|a|.|test|'].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => moveWordStartRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 15))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('issue #64810: cursorWordStartRight skips first word after newline', () => {
		// This is the Behaviour oBserved in Visual Studio, please do not touch test
		const EXPECTED = ['Hello |World|', '|Hei |mailman|'].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => moveWordStartRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(2, 12))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordAccessiBilityLeft', () => {
		const EXPECTED = ['|   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  '].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 1000),
			ed => cursorWordAccessiBilityLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 1))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('cursorWordAccessiBilityRight', () => {
		const EXPECTED = ['   /* |Just |some   |more   |text |a+= |3 +|5-|3 + |7 */  |'].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => cursorWordAccessiBilityRight(ed),
			ed => ed.getPosition()!,
			ed => ed.getPosition()!.equals(new Position(1, 50))
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
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
			assert.equal(model.getLineContent(3), '    Thd Line🐶');
			assert.deepEqual(editor.getPosition(), new Position(3, 7));
		});
	});

	test('deleteWordLeft for cursor at Beginning of document', () => {
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
			assert.equal(model.getLineContent(1), '    \tMy First Line\t ');
			assert.deepEqual(editor.getPosition(), new Position(1, 1));
		});
	});

	test('deleteWordLeft for cursor at end of whitespace', () => {
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
			assert.equal(model.getLineContent(3), '    Line🐶');
			assert.deepEqual(editor.getPosition(), new Position(3, 5));
		});
	});

	test('deleteWordLeft for cursor just Behind a word', () => {
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
			assert.equal(model.getLineContent(2), '\tMy  Line');
			assert.deepEqual(editor.getPosition(), new Position(2, 5));
		});
	});

	test('deleteWordLeft for cursor inside of a word', () => {
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
			assert.equal(model.getLineContent(1), '    \tMy st Line\t ');
			assert.deepEqual(editor.getPosition(), new Position(1, 9));
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
			assert.equal(model.getLineContent(3), '    Thd Line🐶');
			assert.deepEqual(editor.getPosition(), new Position(3, 7));
		});
	});

	test('deleteWordRight for cursor at end of document', () => {
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
			assert.equal(model.getLineContent(5), '1');
			assert.deepEqual(editor.getPosition(), new Position(5, 2));
		});
	});

	test('deleteWordRight for cursor at Beggining of whitespace', () => {
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
			assert.equal(model.getLineContent(3), 'Third Line🐶');
			assert.deepEqual(editor.getPosition(), new Position(3, 1));
		});
	});

	test('deleteWordRight for cursor just Before a word', () => {
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
			assert.equal(model.getLineContent(2), '\tMy  Line');
			assert.deepEqual(editor.getPosition(), new Position(2, 5));
		});
	});

	test('deleteWordRight for cursor inside of a word', () => {
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
			assert.equal(model.getLineContent(1), '    \tMy Fi Line\t ');
			assert.deepEqual(editor.getPosition(), new Position(1, 11));
		});
	});

	test('deleteWordLeft - issue #832', () => {
		const EXPECTED = [
			'|   |/* |Just |some |text |a|+= |3 |+|5 |*/|  ',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordStartLeft', () => {
		const EXPECTED = [
			'|   |/* |Just |some |text |a|+= |3 |+|5 |*/  ',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordStartLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordEndLeft', () => {
		const EXPECTED = [
			'|   /*| Just| some| text| a|+=| 3| +|5| */|  ',
		].join('\n');
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1000, 10000),
			ed => deleteWordEndLeft(ed),
			ed => ed.getPosition()!,
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordLeft - issue #24947', () => {
		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordLeft(editor); assert.equal(model.getLineContent(1), '{}');
		});

		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordStartLeft(editor); assert.equal(model.getLineContent(1), '{}');
		});

		withTestCodeEditor([
			'{',
			'}'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordEndLeft(editor); assert.equal(model.getLineContent(1), '{}');
		});
	});

	test('deleteWordRight - issue #832', () => {
		const EXPECTED = '   |/*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => deleteWordRight(ed),
			ed => new Position(1, text.length - ed.getValue().length + 1),
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordRight - issue #3882', () => {
		withTestCodeEditor([
			'puBlic void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordRight(editor); assert.equal(model.getLineContent(1), 'puBlic void Add( int x,int y )', '001');
		});
	});

	test('deleteWordStartRight - issue #3882', () => {
		withTestCodeEditor([
			'puBlic void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordStartRight(editor); assert.equal(model.getLineContent(1), 'puBlic void Add( int x,int y )', '001');
		});
	});

	test('deleteWordEndRight - issue #3882', () => {
		withTestCodeEditor([
			'puBlic void Add( int x,',
			'                 int y )'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 24));
			deleteWordEndRight(editor); assert.equal(model.getLineContent(1), 'puBlic void Add( int x,int y )', '001');
		});
	});

	test('deleteWordStartRight', () => {
		const EXPECTED = '   |/* |Just |some |text |a|+= |3 |+|5|-|3 |*/  |';
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => deleteWordStartRight(ed),
			ed => new Position(1, text.length - ed.getValue().length + 1),
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordEndRight', () => {
		const EXPECTED = '   /*| Just| some| text| a|+=| 3| +|5|-|3| */|  |';
		const [text,] = deserializePipePositions(EXPECTED);
		const actualStops = testRepeatedActionAndExtractPositions(
			text,
			new Position(1, 1),
			ed => deleteWordEndRight(ed),
			ed => new Position(1, text.length - ed.getValue().length + 1),
			ed => ed.getValue().length === 0
		);
		const actual = serializePipePositions(text, actualStops);
		assert.deepEqual(actual, EXPECTED);
	});

	test('deleteWordRight - issue #3882 (1): Ctrl+Delete removing entire line when used at the end of line', () => {
		withTestCodeEditor([
			'A line with text.',
			'   And another one'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(1, 18));
			deleteWordRight(editor); assert.equal(model.getLineContent(1), 'A line with text.And another one', '001');
		});
	});

	test('deleteWordLeft - issue #3882 (2): Ctrl+Delete removing entire line when used at the end of line', () => {
		withTestCodeEditor([
			'A line with text.',
			'   And another one'
		], {}, (editor, _) => {
			const model = editor.getModel()!;
			editor.setPosition(new Position(2, 1));
			deleteWordLeft(editor); assert.equal(model.getLineContent(1), 'A line with text.   And another one', '001');
		});
	});

	test('deleteWordLeft - issue #91855: Matching (quote, Bracket, paren) doesn\'t get deleted when hitting Ctrl+Backspace', () => {
		const languageId = new LanguageIdentifier('myTestMode', 5);
		class TestMode extends MockMode {
			constructor() {
				super(languageId);
				this._register(LanguageConfigurationRegistry.register(this.getLanguageIdentifier(), {
					autoClosingPairs: [
						{ open: '\"', close: '\"' }
					]
				}));
			}
		}

		const mode = new TestMode();
		const model = createTextModel('a ""', undefined, languageId);

		withTestCodeEditor(null, { model }, (editor, _) => {
			editor.setPosition(new Position(1, 4));
			deleteWordLeft(editor); assert.equal(model.getLineContent(1), 'a ');
		});

		model.dispose();
		mode.dispose();
	});
});
