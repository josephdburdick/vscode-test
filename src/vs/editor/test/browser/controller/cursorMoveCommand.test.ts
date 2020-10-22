/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { CoreNavigationCommands } from 'vs/editor/Browser/controller/coreCommands';
import { CursorMove } from 'vs/editor/common/controller/cursorMoveCommands';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { withTestCodeEditor, ITestCodeEditor } from 'vs/editor/test/Browser/testCodeEditor';
import { ViewModel } from 'vs/editor/common/viewModel/viewModelImpl';

suite('Cursor move command test', () => {

	const TEXT = [
		'    \tMy First Line\t ',
		'\tMy Second Line',
		'    Third Line🐶',
		'',
		'1'
	].join('\n');

	function executeTest(callBack: (editor: ITestCodeEditor, viewModel: ViewModel) => void): void {
		withTestCodeEditor(TEXT, {}, (editor, viewModel) => {
			callBack(editor, viewModel);
		});
	}

	test('move left should move to left character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveLeft(viewModel);
			cursorEqual(viewModel, 1, 7);
		});
	});

	test('move left should move to left By n characters', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveLeft(viewModel, 3);
			cursorEqual(viewModel, 1, 5);
		});
	});

	test('move left should move to left By half line', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveLeft(viewModel, 1, CursorMove.RawUnit.HalfLine);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move left moves to previous line', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 2, 3);
			moveLeft(viewModel, 10);
			cursorEqual(viewModel, 1, 21);
		});
	});

	test('move right should move to right character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 5);
			moveRight(viewModel);
			cursorEqual(viewModel, 1, 6);
		});
	});

	test('move right should move to right By n characters', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 2);
			moveRight(viewModel, 6);
			cursorEqual(viewModel, 1, 8);
		});
	});

	test('move right should move to right By half line', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 4);
			moveRight(viewModel, 1, CursorMove.RawUnit.HalfLine);
			cursorEqual(viewModel, 1, 14);
		});
	});

	test('move right moves to next line', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveRight(viewModel, 100);
			cursorEqual(viewModel, 2, 1);
		});
	});

	test('move to first character of line from middle', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveToLineStart(viewModel);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move to first character of line from first non white space character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 6);
			moveToLineStart(viewModel);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move to first character of line from first character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 1);
			moveToLineStart(viewModel);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move to first non white space character of line from middle', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveToLineFirstNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 6);
		});
	});

	test('move to first non white space character of line from first non white space character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 6);
			moveToLineFirstNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 6);
		});
	});

	test('move to first non white space character of line from first character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 1);
			moveToLineFirstNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 6);
		});
	});

	test('move to end of line from middle', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveToLineEnd(viewModel);
			cursorEqual(viewModel, 1, 21);
		});
	});

	test('move to end of line from last non white space character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 19);
			moveToLineEnd(viewModel);
			cursorEqual(viewModel, 1, 21);
		});
	});

	test('move to end of line from line end', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 21);
			moveToLineEnd(viewModel);
			cursorEqual(viewModel, 1, 21);
		});
	});

	test('move to last non white space character from middle', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveToLineLastNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 19);
		});
	});

	test('move to last non white space character from last non white space character', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 19);
			moveToLineLastNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 19);
		});
	});

	test('move to last non white space character from line end', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 21);
			moveToLineLastNonWhitespaceCharacter(viewModel);
			cursorEqual(viewModel, 1, 19);
		});
	});

	test('move to center of line not from center', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 8);
			moveToLineCenter(viewModel);
			cursorEqual(viewModel, 1, 11);
		});
	});

	test('move to center of line from center', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 11);
			moveToLineCenter(viewModel);
			cursorEqual(viewModel, 1, 11);
		});
	});

	test('move to center of line from start', () => {
		executeTest((editor, viewModel) => {
			moveToLineStart(viewModel);
			moveToLineCenter(viewModel);
			cursorEqual(viewModel, 1, 11);
		});
	});

	test('move to center of line from end', () => {
		executeTest((editor, viewModel) => {
			moveToLineEnd(viewModel);
			moveToLineCenter(viewModel);
			cursorEqual(viewModel, 1, 11);
		});
	});

	test('move up By cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 3, 5);
			cursorEqual(viewModel, 3, 5);

			moveUp(viewModel, 2);
			cursorEqual(viewModel, 1, 5);

			moveUp(viewModel, 1);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move up By model line cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 3, 5);
			cursorEqual(viewModel, 3, 5);

			moveUpByModelLine(viewModel, 2);
			cursorEqual(viewModel, 1, 5);

			moveUpByModelLine(viewModel, 1);
			cursorEqual(viewModel, 1, 1);
		});
	});

	test('move down By model line cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 3, 5);
			cursorEqual(viewModel, 3, 5);

			moveDownByModelLine(viewModel, 2);
			cursorEqual(viewModel, 5, 2);

			moveDownByModelLine(viewModel, 1);
			cursorEqual(viewModel, 5, 2);
		});
	});

	test('move up with selection By cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 3, 5);
			cursorEqual(viewModel, 3, 5);

			moveUp(viewModel, 1, true);
			cursorEqual(viewModel, 2, 2, 3, 5);

			moveUp(viewModel, 1, true);
			cursorEqual(viewModel, 1, 5, 3, 5);
		});
	});

	test('move up and down with taBs By cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveTo(viewModel, 1, 5);
			cursorEqual(viewModel, 1, 5);

			moveDown(viewModel, 4);
			cursorEqual(viewModel, 5, 2);

			moveUp(viewModel, 1);
			cursorEqual(viewModel, 4, 1);

			moveUp(viewModel, 1);
			cursorEqual(viewModel, 3, 5);

			moveUp(viewModel, 1);
			cursorEqual(viewModel, 2, 2);

			moveUp(viewModel, 1);
			cursorEqual(viewModel, 1, 5);
		});
	});

	test('move up and down with end of lines starting from a long one By cursor move command', () => {
		executeTest((editor, viewModel) => {
			moveToEndOfLine(viewModel);
			cursorEqual(viewModel, 1, 21);

			moveToEndOfLine(viewModel);
			cursorEqual(viewModel, 1, 21);

			moveDown(viewModel, 2);
			cursorEqual(viewModel, 3, 17);

			moveDown(viewModel, 1);
			cursorEqual(viewModel, 4, 1);

			moveDown(viewModel, 1);
			cursorEqual(viewModel, 5, 2);

			moveUp(viewModel, 4);
			cursorEqual(viewModel, 1, 21);
		});
	});

	test('move to view top line moves to first visiBle line if it is first line', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(1, 1, 10, 1);

			moveTo(viewModel, 2, 2);
			moveToTop(viewModel);

			cursorEqual(viewModel, 1, 6);
		});
	});

	test('move to view top line moves to top visiBle line when first line is not visiBle', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(2, 1, 10, 1);

			moveTo(viewModel, 4, 1);
			moveToTop(viewModel);

			cursorEqual(viewModel, 2, 2);
		});
	});

	test('move to view top line moves to nth line from top', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(1, 1, 10, 1);

			moveTo(viewModel, 4, 1);
			moveToTop(viewModel, 3);

			cursorEqual(viewModel, 3, 5);
		});
	});

	test('move to view top line moves to last line if n is greater than last visiBle line numBer', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(1, 1, 3, 1);

			moveTo(viewModel, 2, 2);
			moveToTop(viewModel, 4);

			cursorEqual(viewModel, 3, 5);
		});
	});

	test('move to view center line moves to the center line', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(3, 1, 3, 1);

			moveTo(viewModel, 2, 2);
			moveToCenter(viewModel);

			cursorEqual(viewModel, 3, 5);
		});
	});

	test('move to view Bottom line moves to last visiBle line if it is last line', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(1, 1, 5, 1);

			moveTo(viewModel, 2, 2);
			moveToBottom(viewModel);

			cursorEqual(viewModel, 5, 1);
		});
	});

	test('move to view Bottom line moves to last visiBle line when last line is not visiBle', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(2, 1, 3, 1);

			moveTo(viewModel, 2, 2);
			moveToBottom(viewModel);

			cursorEqual(viewModel, 3, 5);
		});
	});

	test('move to view Bottom line moves to nth line from Bottom', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(1, 1, 5, 1);

			moveTo(viewModel, 4, 1);
			moveToBottom(viewModel, 3);

			cursorEqual(viewModel, 3, 5);
		});
	});

	test('move to view Bottom line moves to first line if n is lesser than first visiBle line numBer', () => {
		executeTest((editor, viewModel) => {
			viewModel.getCompletelyVisiBleViewRange = () => new Range(2, 1, 5, 1);

			moveTo(viewModel, 4, 1);
			moveToBottom(viewModel, 5);

			cursorEqual(viewModel, 2, 2);
		});
	});
});

// Move command

function move(viewModel: ViewModel, args: any) {
	CoreNavigationCommands.CursorMove.runCoreEditorCommand(viewModel, args);
}

function moveToLineStart(viewModel: ViewModel) {
	move(viewModel, { to: CursorMove.RawDirection.WrappedLineStart });
}

function moveToLineFirstNonWhitespaceCharacter(viewModel: ViewModel) {
	move(viewModel, { to: CursorMove.RawDirection.WrappedLineFirstNonWhitespaceCharacter });
}

function moveToLineCenter(viewModel: ViewModel) {
	move(viewModel, { to: CursorMove.RawDirection.WrappedLineColumnCenter });
}

function moveToLineEnd(viewModel: ViewModel) {
	move(viewModel, { to: CursorMove.RawDirection.WrappedLineEnd });
}

function moveToLineLastNonWhitespaceCharacter(viewModel: ViewModel) {
	move(viewModel, { to: CursorMove.RawDirection.WrappedLineLastNonWhitespaceCharacter });
}

function moveLeft(viewModel: ViewModel, value?: numBer, By?: string, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Left, By: By, value: value, select: select });
}

function moveRight(viewModel: ViewModel, value?: numBer, By?: string, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Right, By: By, value: value, select: select });
}

function moveUp(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Up, By: CursorMove.RawUnit.WrappedLine, value: noOfLines, select: select });
}

function moveUpByModelLine(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Up, value: noOfLines, select: select });
}

function moveDown(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Down, By: CursorMove.RawUnit.WrappedLine, value: noOfLines, select: select });
}

function moveDownByModelLine(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.Down, value: noOfLines, select: select });
}

function moveToTop(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.ViewPortTop, value: noOfLines, select: select });
}

function moveToCenter(viewModel: ViewModel, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.ViewPortCenter, select: select });
}

function moveToBottom(viewModel: ViewModel, noOfLines: numBer = 1, select?: Boolean) {
	move(viewModel, { to: CursorMove.RawDirection.ViewPortBottom, value: noOfLines, select: select });
}

function cursorEqual(viewModel: ViewModel, posLineNumBer: numBer, posColumn: numBer, selLineNumBer: numBer = posLineNumBer, selColumn: numBer = posColumn) {
	positionEqual(viewModel.getPosition(), posLineNumBer, posColumn);
	selectionEqual(viewModel.getSelection(), posLineNumBer, posColumn, selLineNumBer, selColumn);
}

function positionEqual(position: Position, lineNumBer: numBer, column: numBer) {
	assert.deepEqual(position, new Position(lineNumBer, column), 'position equal');
}

function selectionEqual(selection: Selection, posLineNumBer: numBer, posColumn: numBer, selLineNumBer: numBer, selColumn: numBer) {
	assert.deepEqual({
		selectionStartLineNumBer: selection.selectionStartLineNumBer,
		selectionStartColumn: selection.selectionStartColumn,
		positionLineNumBer: selection.positionLineNumBer,
		positionColumn: selection.positionColumn
	}, {
		selectionStartLineNumBer: selLineNumBer,
		selectionStartColumn: selColumn,
		positionLineNumBer: posLineNumBer,
		positionColumn: posColumn
	}, 'selection equal');
}

function moveTo(viewModel: ViewModel, lineNumBer: numBer, column: numBer, inSelectionMode: Boolean = false) {
	if (inSelectionMode) {
		CoreNavigationCommands.MoveToSelect.runCoreEditorCommand(viewModel, {
			position: new Position(lineNumBer, column)
		});
	} else {
		CoreNavigationCommands.MoveTo.runCoreEditorCommand(viewModel, {
			position: new Position(lineNumBer, column)
		});
	}
}

function moveToEndOfLine(viewModel: ViewModel, inSelectionMode: Boolean = false) {
	if (inSelectionMode) {
		CoreNavigationCommands.CursorEndSelect.runCoreEditorCommand(viewModel, {});
	} else {
		CoreNavigationCommands.CursorEnd.runCoreEditorCommand(viewModel, {});
	}
}
