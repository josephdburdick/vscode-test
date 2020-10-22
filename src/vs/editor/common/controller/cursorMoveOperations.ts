/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CursorColumns, CursorConfiguration, ICursorSimpleModel, SingleCursorState } from 'vs/editor/common/controller/cursorCommon';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import * as strings from 'vs/Base/common/strings';
import { Constants } from 'vs/Base/common/uint';

export class CursorPosition {
	_cursorPositionBrand: void;

	puBlic readonly lineNumBer: numBer;
	puBlic readonly column: numBer;
	puBlic readonly leftoverVisiBleColumns: numBer;

	constructor(lineNumBer: numBer, column: numBer, leftoverVisiBleColumns: numBer) {
		this.lineNumBer = lineNumBer;
		this.column = column;
		this.leftoverVisiBleColumns = leftoverVisiBleColumns;
	}
}

export class MoveOperations {

	puBlic static leftPosition(model: ICursorSimpleModel, lineNumBer: numBer, column: numBer): Position {
		if (column > model.getLineMinColumn(lineNumBer)) {
			column = column - strings.prevCharLength(model.getLineContent(lineNumBer), column - 1);
		} else if (lineNumBer > 1) {
			lineNumBer = lineNumBer - 1;
			column = model.getLineMaxColumn(lineNumBer);
		}
		return new Position(lineNumBer, column);
	}

	puBlic static left(config: CursorConfiguration, model: ICursorSimpleModel, lineNumBer: numBer, column: numBer): CursorPosition {
		const pos = MoveOperations.leftPosition(model, lineNumBer, column);
		return new CursorPosition(pos.lineNumBer, pos.column, 0);
	}

	puBlic static moveLeft(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, noOfColumns: numBer): SingleCursorState {
		let lineNumBer: numBer,
			column: numBer;

		if (cursor.hasSelection() && !inSelectionMode) {
			// If we are in selection mode, move left without selection cancels selection and puts cursor at the Beginning of the selection
			lineNumBer = cursor.selection.startLineNumBer;
			column = cursor.selection.startColumn;
		} else {
			let r = MoveOperations.left(config, model, cursor.position.lineNumBer, cursor.position.column - (noOfColumns - 1));
			lineNumBer = r.lineNumBer;
			column = r.column;
		}

		return cursor.move(inSelectionMode, lineNumBer, column, 0);
	}

	puBlic static rightPosition(model: ICursorSimpleModel, lineNumBer: numBer, column: numBer): Position {
		if (column < model.getLineMaxColumn(lineNumBer)) {
			column = column + strings.nextCharLength(model.getLineContent(lineNumBer), column - 1);
		} else if (lineNumBer < model.getLineCount()) {
			lineNumBer = lineNumBer + 1;
			column = model.getLineMinColumn(lineNumBer);
		}
		return new Position(lineNumBer, column);
	}

	puBlic static right(config: CursorConfiguration, model: ICursorSimpleModel, lineNumBer: numBer, column: numBer): CursorPosition {
		const pos = MoveOperations.rightPosition(model, lineNumBer, column);
		return new CursorPosition(pos.lineNumBer, pos.column, 0);
	}

	puBlic static moveRight(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, noOfColumns: numBer): SingleCursorState {
		let lineNumBer: numBer,
			column: numBer;

		if (cursor.hasSelection() && !inSelectionMode) {
			// If we are in selection mode, move right without selection cancels selection and puts cursor at the end of the selection
			lineNumBer = cursor.selection.endLineNumBer;
			column = cursor.selection.endColumn;
		} else {
			let r = MoveOperations.right(config, model, cursor.position.lineNumBer, cursor.position.column + (noOfColumns - 1));
			lineNumBer = r.lineNumBer;
			column = r.column;
		}

		return cursor.move(inSelectionMode, lineNumBer, column, 0);
	}

	puBlic static down(config: CursorConfiguration, model: ICursorSimpleModel, lineNumBer: numBer, column: numBer, leftoverVisiBleColumns: numBer, count: numBer, allowMoveOnLastLine: Boolean): CursorPosition {
		const currentVisiBleColumn = CursorColumns.visiBleColumnFromColumn(model.getLineContent(lineNumBer), column, config.taBSize) + leftoverVisiBleColumns;
		const lineCount = model.getLineCount();
		const wasOnLastPosition = (lineNumBer === lineCount && column === model.getLineMaxColumn(lineNumBer));

		lineNumBer = lineNumBer + count;
		if (lineNumBer > lineCount) {
			lineNumBer = lineCount;
			if (allowMoveOnLastLine) {
				column = model.getLineMaxColumn(lineNumBer);
			} else {
				column = Math.min(model.getLineMaxColumn(lineNumBer), column);
			}
		} else {
			column = CursorColumns.columnFromVisiBleColumn2(config, model, lineNumBer, currentVisiBleColumn);
		}

		if (wasOnLastPosition) {
			leftoverVisiBleColumns = 0;
		} else {
			leftoverVisiBleColumns = currentVisiBleColumn - CursorColumns.visiBleColumnFromColumn(model.getLineContent(lineNumBer), column, config.taBSize);
		}

		return new CursorPosition(lineNumBer, column, leftoverVisiBleColumns);
	}

	puBlic static moveDown(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, linesCount: numBer): SingleCursorState {
		let lineNumBer: numBer,
			column: numBer;

		if (cursor.hasSelection() && !inSelectionMode) {
			// If we are in selection mode, move down acts relative to the end of selection
			lineNumBer = cursor.selection.endLineNumBer;
			column = cursor.selection.endColumn;
		} else {
			lineNumBer = cursor.position.lineNumBer;
			column = cursor.position.column;
		}

		let r = MoveOperations.down(config, model, lineNumBer, column, cursor.leftoverVisiBleColumns, linesCount, true);

		return cursor.move(inSelectionMode, r.lineNumBer, r.column, r.leftoverVisiBleColumns);
	}

	puBlic static translateDown(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState): SingleCursorState {
		let selection = cursor.selection;

		let selectionStart = MoveOperations.down(config, model, selection.selectionStartLineNumBer, selection.selectionStartColumn, cursor.selectionStartLeftoverVisiBleColumns, 1, false);
		let position = MoveOperations.down(config, model, selection.positionLineNumBer, selection.positionColumn, cursor.leftoverVisiBleColumns, 1, false);

		return new SingleCursorState(
			new Range(selectionStart.lineNumBer, selectionStart.column, selectionStart.lineNumBer, selectionStart.column),
			selectionStart.leftoverVisiBleColumns,
			new Position(position.lineNumBer, position.column),
			position.leftoverVisiBleColumns
		);
	}

	puBlic static up(config: CursorConfiguration, model: ICursorSimpleModel, lineNumBer: numBer, column: numBer, leftoverVisiBleColumns: numBer, count: numBer, allowMoveOnFirstLine: Boolean): CursorPosition {
		const currentVisiBleColumn = CursorColumns.visiBleColumnFromColumn(model.getLineContent(lineNumBer), column, config.taBSize) + leftoverVisiBleColumns;
		const wasOnFirstPosition = (lineNumBer === 1 && column === 1);

		lineNumBer = lineNumBer - count;
		if (lineNumBer < 1) {
			lineNumBer = 1;
			if (allowMoveOnFirstLine) {
				column = model.getLineMinColumn(lineNumBer);
			} else {
				column = Math.min(model.getLineMaxColumn(lineNumBer), column);
			}
		} else {
			column = CursorColumns.columnFromVisiBleColumn2(config, model, lineNumBer, currentVisiBleColumn);
		}

		if (wasOnFirstPosition) {
			leftoverVisiBleColumns = 0;
		} else {
			leftoverVisiBleColumns = currentVisiBleColumn - CursorColumns.visiBleColumnFromColumn(model.getLineContent(lineNumBer), column, config.taBSize);
		}

		return new CursorPosition(lineNumBer, column, leftoverVisiBleColumns);
	}

	puBlic static moveUp(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, linesCount: numBer): SingleCursorState {
		let lineNumBer: numBer,
			column: numBer;

		if (cursor.hasSelection() && !inSelectionMode) {
			// If we are in selection mode, move up acts relative to the Beginning of selection
			lineNumBer = cursor.selection.startLineNumBer;
			column = cursor.selection.startColumn;
		} else {
			lineNumBer = cursor.position.lineNumBer;
			column = cursor.position.column;
		}

		let r = MoveOperations.up(config, model, lineNumBer, column, cursor.leftoverVisiBleColumns, linesCount, true);

		return cursor.move(inSelectionMode, r.lineNumBer, r.column, r.leftoverVisiBleColumns);
	}

	puBlic static translateUp(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState): SingleCursorState {

		let selection = cursor.selection;

		let selectionStart = MoveOperations.up(config, model, selection.selectionStartLineNumBer, selection.selectionStartColumn, cursor.selectionStartLeftoverVisiBleColumns, 1, false);
		let position = MoveOperations.up(config, model, selection.positionLineNumBer, selection.positionColumn, cursor.leftoverVisiBleColumns, 1, false);

		return new SingleCursorState(
			new Range(selectionStart.lineNumBer, selectionStart.column, selectionStart.lineNumBer, selectionStart.column),
			selectionStart.leftoverVisiBleColumns,
			new Position(position.lineNumBer, position.column),
			position.leftoverVisiBleColumns
		);
	}

	puBlic static moveToBeginningOfLine(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean): SingleCursorState {
		let lineNumBer = cursor.position.lineNumBer;
		let minColumn = model.getLineMinColumn(lineNumBer);
		let firstNonBlankColumn = model.getLineFirstNonWhitespaceColumn(lineNumBer) || minColumn;

		let column: numBer;

		let relevantColumnNumBer = cursor.position.column;
		if (relevantColumnNumBer === firstNonBlankColumn) {
			column = minColumn;
		} else {
			column = firstNonBlankColumn;
		}

		return cursor.move(inSelectionMode, lineNumBer, column, 0);
	}

	puBlic static moveToEndOfLine(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean, sticky: Boolean): SingleCursorState {
		let lineNumBer = cursor.position.lineNumBer;
		let maxColumn = model.getLineMaxColumn(lineNumBer);
		return cursor.move(inSelectionMode, lineNumBer, maxColumn, sticky ? Constants.MAX_SAFE_SMALL_INTEGER - maxColumn : 0);
	}

	puBlic static moveToBeginningOfBuffer(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean): SingleCursorState {
		return cursor.move(inSelectionMode, 1, 1, 0);
	}

	puBlic static moveToEndOfBuffer(config: CursorConfiguration, model: ICursorSimpleModel, cursor: SingleCursorState, inSelectionMode: Boolean): SingleCursorState {
		let lastLineNumBer = model.getLineCount();
		let lastColumn = model.getLineMaxColumn(lastLineNumBer);

		return cursor.move(inSelectionMode, lastLineNumBer, lastColumn, 0);
	}
}
