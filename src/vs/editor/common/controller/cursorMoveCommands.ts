/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as types from 'vs/Base/common/types';
import { CursorState, ICursorSimpleModel, PartialCursorState, SingleCursorState } from 'vs/editor/common/controller/cursorCommon';
import { MoveOperations } from 'vs/editor/common/controller/cursorMoveOperations';
import { WordOperations } from 'vs/editor/common/controller/cursorWordOperations';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { ICommandHandlerDescription } from 'vs/platform/commands/common/commands';
import { IViewModel } from 'vs/editor/common/viewModel/viewModel';

export class CursorMoveCommands {

	puBlic static addCursorDown(viewModel: IViewModel, cursors: CursorState[], useLogicalLine: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [], resultLen = 0;
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
			if (useLogicalLine) {
				result[resultLen++] = CursorState.fromModelState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel.model, cursor.modelState));
			} else {
				result[resultLen++] = CursorState.fromViewState(MoveOperations.translateDown(viewModel.cursorConfig, viewModel, cursor.viewState));
			}
		}
		return result;
	}

	puBlic static addCursorUp(viewModel: IViewModel, cursors: CursorState[], useLogicalLine: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [], resultLen = 0;
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[resultLen++] = new CursorState(cursor.modelState, cursor.viewState);
			if (useLogicalLine) {
				result[resultLen++] = CursorState.fromModelState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel.model, cursor.modelState));
			} else {
				result[resultLen++] = CursorState.fromViewState(MoveOperations.translateUp(viewModel.cursorConfig, viewModel, cursor.viewState));
			}
		}
		return result;
	}

	puBlic static moveToBeginningOfLine(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = this._moveToLineStart(viewModel, cursor, inSelectionMode);
		}

		return result;
	}

	private static _moveToLineStart(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean): PartialCursorState {
		const currentViewStateColumn = cursor.viewState.position.column;
		const currentModelStateColumn = cursor.modelState.position.column;
		const isFirstLineOfWrappedLine = currentViewStateColumn === currentModelStateColumn;

		const currentViewStatelineNumBer = cursor.viewState.position.lineNumBer;
		const firstNonBlankColumn = viewModel.getLineFirstNonWhitespaceColumn(currentViewStatelineNumBer);
		const isBeginningOfViewLine = currentViewStateColumn === firstNonBlankColumn;

		if (!isFirstLineOfWrappedLine && !isBeginningOfViewLine) {
			return this._moveToLineStartByView(viewModel, cursor, inSelectionMode);
		} else {
			return this._moveToLineStartByModel(viewModel, cursor, inSelectionMode);
		}
	}

	private static _moveToLineStartByView(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean): PartialCursorState {
		return CursorState.fromViewState(
			MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode)
		);
	}

	private static _moveToLineStartByModel(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean): PartialCursorState {
		return CursorState.fromModelState(
			MoveOperations.moveToBeginningOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode)
		);
	}

	puBlic static moveToEndOfLine(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, sticky: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = this._moveToLineEnd(viewModel, cursor, inSelectionMode, sticky);
		}

		return result;
	}

	private static _moveToLineEnd(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, sticky: Boolean): PartialCursorState {
		const viewStatePosition = cursor.viewState.position;
		const viewModelMaxColumn = viewModel.getLineMaxColumn(viewStatePosition.lineNumBer);
		const isEndOfViewLine = viewStatePosition.column === viewModelMaxColumn;

		const modelStatePosition = cursor.modelState.position;
		const modelMaxColumn = viewModel.model.getLineMaxColumn(modelStatePosition.lineNumBer);
		const isEndLineOfWrappedLine = viewModelMaxColumn - viewStatePosition.column === modelMaxColumn - modelStatePosition.column;

		if (isEndOfViewLine || isEndLineOfWrappedLine) {
			return this._moveToLineEndByModel(viewModel, cursor, inSelectionMode, sticky);
		} else {
			return this._moveToLineEndByView(viewModel, cursor, inSelectionMode, sticky);
		}
	}

	private static _moveToLineEndByView(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, sticky: Boolean): PartialCursorState {
		return CursorState.fromViewState(
			MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, sticky)
		);
	}

	private static _moveToLineEndByModel(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, sticky: Boolean): PartialCursorState {
		return CursorState.fromModelState(
			MoveOperations.moveToEndOfLine(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, sticky)
		);
	}

	puBlic static expandLineSelection(viewModel: IViewModel, cursors: CursorState[]): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];

			const startLineNumBer = cursor.modelState.selection.startLineNumBer;
			const lineCount = viewModel.model.getLineCount();

			let endLineNumBer = cursor.modelState.selection.endLineNumBer;
			let endColumn: numBer;
			if (endLineNumBer === lineCount) {
				endColumn = viewModel.model.getLineMaxColumn(lineCount);
			} else {
				endLineNumBer++;
				endColumn = 1;
			}

			result[i] = CursorState.fromModelState(new SingleCursorState(
				new Range(startLineNumBer, 1, startLineNumBer, 1), 0,
				new Position(endLineNumBer, endColumn), 0
			));
		}
		return result;
	}

	puBlic static moveToBeginningOfBuffer(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromModelState(MoveOperations.moveToBeginningOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
		}
		return result;
	}

	puBlic static moveToEndOfBuffer(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromModelState(MoveOperations.moveToEndOfBuffer(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode));
		}
		return result;
	}

	puBlic static selectAll(viewModel: IViewModel, cursor: CursorState): PartialCursorState {
		const lineCount = viewModel.model.getLineCount();
		const maxColumn = viewModel.model.getLineMaxColumn(lineCount);

		return CursorState.fromModelState(new SingleCursorState(
			new Range(1, 1, 1, 1), 0,
			new Position(lineCount, maxColumn), 0
		));
	}

	puBlic static line(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, _position: IPosition, _viewPosition: IPosition): PartialCursorState {
		const position = viewModel.model.validatePosition(_position);
		const viewPosition = (
			_viewPosition
				? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumBer, _viewPosition.column), position)
				: viewModel.coordinatesConverter.convertModelPositionToViewPosition(position)
		);

		if (!inSelectionMode || !cursor.modelState.hasSelection()) {
			// Entering line selection for the first time
			const lineCount = viewModel.model.getLineCount();

			let selectToLineNumBer = position.lineNumBer + 1;
			let selectToColumn = 1;
			if (selectToLineNumBer > lineCount) {
				selectToLineNumBer = lineCount;
				selectToColumn = viewModel.model.getLineMaxColumn(selectToLineNumBer);
			}

			return CursorState.fromModelState(new SingleCursorState(
				new Range(position.lineNumBer, 1, selectToLineNumBer, selectToColumn), 0,
				new Position(selectToLineNumBer, selectToColumn), 0
			));
		}

		// Continuing line selection
		const enteringLineNumBer = cursor.modelState.selectionStart.getStartPosition().lineNumBer;

		if (position.lineNumBer < enteringLineNumBer) {

			return CursorState.fromViewState(cursor.viewState.move(
				cursor.modelState.hasSelection(), viewPosition.lineNumBer, 1, 0
			));

		} else if (position.lineNumBer > enteringLineNumBer) {

			const lineCount = viewModel.getLineCount();

			let selectToViewLineNumBer = viewPosition.lineNumBer + 1;
			let selectToViewColumn = 1;
			if (selectToViewLineNumBer > lineCount) {
				selectToViewLineNumBer = lineCount;
				selectToViewColumn = viewModel.getLineMaxColumn(selectToViewLineNumBer);
			}

			return CursorState.fromViewState(cursor.viewState.move(
				cursor.modelState.hasSelection(), selectToViewLineNumBer, selectToViewColumn, 0
			));

		} else {

			const endPositionOfSelectionStart = cursor.modelState.selectionStart.getEndPosition();
			return CursorState.fromModelState(cursor.modelState.move(
				cursor.modelState.hasSelection(), endPositionOfSelectionStart.lineNumBer, endPositionOfSelectionStart.column, 0
			));

		}
	}

	puBlic static word(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, _position: IPosition): PartialCursorState {
		const position = viewModel.model.validatePosition(_position);
		return CursorState.fromModelState(WordOperations.word(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, position));
	}

	puBlic static cancelSelection(viewModel: IViewModel, cursor: CursorState): PartialCursorState {
		if (!cursor.modelState.hasSelection()) {
			return new CursorState(cursor.modelState, cursor.viewState);
		}

		const lineNumBer = cursor.viewState.position.lineNumBer;
		const column = cursor.viewState.position.column;

		return CursorState.fromViewState(new SingleCursorState(
			new Range(lineNumBer, column, lineNumBer, column), 0,
			new Position(lineNumBer, column), 0
		));
	}

	puBlic static moveTo(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, _position: IPosition, _viewPosition: IPosition): PartialCursorState {
		const position = viewModel.model.validatePosition(_position);
		const viewPosition = (
			_viewPosition
				? viewModel.coordinatesConverter.validateViewPosition(new Position(_viewPosition.lineNumBer, _viewPosition.column), position)
				: viewModel.coordinatesConverter.convertModelPositionToViewPosition(position)
		);
		return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, viewPosition.lineNumBer, viewPosition.column, 0));
	}

	puBlic static simpleMove(viewModel: IViewModel, cursors: CursorState[], direction: CursorMove.SimpleMoveDirection, inSelectionMode: Boolean, value: numBer, unit: CursorMove.Unit): PartialCursorState[] | null {
		switch (direction) {
			case CursorMove.Direction.Left: {
				if (unit === CursorMove.Unit.HalfLine) {
					// Move left By half the current line length
					return this._moveHalfLineLeft(viewModel, cursors, inSelectionMode);
				} else {
					// Move left By `moveParams.value` columns
					return this._moveLeft(viewModel, cursors, inSelectionMode, value);
				}
			}
			case CursorMove.Direction.Right: {
				if (unit === CursorMove.Unit.HalfLine) {
					// Move right By half the current line length
					return this._moveHalfLineRight(viewModel, cursors, inSelectionMode);
				} else {
					// Move right By `moveParams.value` columns
					return this._moveRight(viewModel, cursors, inSelectionMode, value);
				}
			}
			case CursorMove.Direction.Up: {
				if (unit === CursorMove.Unit.WrappedLine) {
					// Move up By view lines
					return this._moveUpByViewLines(viewModel, cursors, inSelectionMode, value);
				} else {
					// Move up By model lines
					return this._moveUpByModelLines(viewModel, cursors, inSelectionMode, value);
				}
			}
			case CursorMove.Direction.Down: {
				if (unit === CursorMove.Unit.WrappedLine) {
					// Move down By view lines
					return this._moveDownByViewLines(viewModel, cursors, inSelectionMode, value);
				} else {
					// Move down By model lines
					return this._moveDownByModelLines(viewModel, cursors, inSelectionMode, value);
				}
			}
			case CursorMove.Direction.WrappedLineStart: {
				// Move to the Beginning of the current view line
				return this._moveToViewMinColumn(viewModel, cursors, inSelectionMode);
			}
			case CursorMove.Direction.WrappedLineFirstNonWhitespaceCharacter: {
				// Move to the first non-whitespace column of the current view line
				return this._moveToViewFirstNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
			}
			case CursorMove.Direction.WrappedLineColumnCenter: {
				// Move to the "center" of the current view line
				return this._moveToViewCenterColumn(viewModel, cursors, inSelectionMode);
			}
			case CursorMove.Direction.WrappedLineEnd: {
				// Move to the end of the current view line
				return this._moveToViewMaxColumn(viewModel, cursors, inSelectionMode);
			}
			case CursorMove.Direction.WrappedLineLastNonWhitespaceCharacter: {
				// Move to the last non-whitespace column of the current view line
				return this._moveToViewLastNonWhitespaceColumn(viewModel, cursors, inSelectionMode);
			}
			default:
				return null;
		}

	}

	puBlic static viewportMove(viewModel: IViewModel, cursors: CursorState[], direction: CursorMove.ViewportDirection, inSelectionMode: Boolean, value: numBer): PartialCursorState[] | null {
		const visiBleViewRange = viewModel.getCompletelyVisiBleViewRange();
		const visiBleModelRange = viewModel.coordinatesConverter.convertViewRangeToModelRange(visiBleViewRange);
		switch (direction) {
			case CursorMove.Direction.ViewPortTop: {
				// Move to the nth line start in the viewport (from the top)
				const modelLineNumBer = this._firstLineNumBerInRange(viewModel.model, visiBleModelRange, value);
				const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumBer);
				return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumBer, modelColumn)];
			}
			case CursorMove.Direction.ViewPortBottom: {
				// Move to the nth line start in the viewport (from the Bottom)
				const modelLineNumBer = this._lastLineNumBerInRange(viewModel.model, visiBleModelRange, value);
				const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumBer);
				return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumBer, modelColumn)];
			}
			case CursorMove.Direction.ViewPortCenter: {
				// Move to the line start in the viewport center
				const modelLineNumBer = Math.round((visiBleModelRange.startLineNumBer + visiBleModelRange.endLineNumBer) / 2);
				const modelColumn = viewModel.model.getLineFirstNonWhitespaceColumn(modelLineNumBer);
				return [this._moveToModelPosition(viewModel, cursors[0], inSelectionMode, modelLineNumBer, modelColumn)];
			}
			case CursorMove.Direction.ViewPortIfOutside: {
				// Move to a position inside the viewport
				let result: PartialCursorState[] = [];
				for (let i = 0, len = cursors.length; i < len; i++) {
					const cursor = cursors[i];
					result[i] = this.findPositionInViewportIfOutside(viewModel, cursor, visiBleViewRange, inSelectionMode);
				}
				return result;
			}
			default:
				return null;
		}
	}

	puBlic static findPositionInViewportIfOutside(viewModel: IViewModel, cursor: CursorState, visiBleViewRange: Range, inSelectionMode: Boolean): PartialCursorState {
		let viewLineNumBer = cursor.viewState.position.lineNumBer;

		if (visiBleViewRange.startLineNumBer <= viewLineNumBer && viewLineNumBer <= visiBleViewRange.endLineNumBer - 1) {
			// Nothing to do, cursor is in viewport
			return new CursorState(cursor.modelState, cursor.viewState);

		} else {
			if (viewLineNumBer > visiBleViewRange.endLineNumBer - 1) {
				viewLineNumBer = visiBleViewRange.endLineNumBer - 1;
			}
			if (viewLineNumBer < visiBleViewRange.startLineNumBer) {
				viewLineNumBer = visiBleViewRange.startLineNumBer;
			}
			const viewColumn = viewModel.getLineFirstNonWhitespaceColumn(viewLineNumBer);
			return this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
	}

	/**
	 * Find the nth line start included in the range (from the start).
	 */
	private static _firstLineNumBerInRange(model: ICursorSimpleModel, range: Range, count: numBer): numBer {
		let startLineNumBer = range.startLineNumBer;
		if (range.startColumn !== model.getLineMinColumn(startLineNumBer)) {
			// Move on to the second line if the first line start is not included in the range
			startLineNumBer++;
		}

		return Math.min(range.endLineNumBer, startLineNumBer + count - 1);
	}

	/**
	 * Find the nth line start included in the range (from the end).
	 */
	private static _lastLineNumBerInRange(model: ICursorSimpleModel, range: Range, count: numBer): numBer {
		let startLineNumBer = range.startLineNumBer;
		if (range.startColumn !== model.getLineMinColumn(startLineNumBer)) {
			// Move on to the second line if the first line start is not included in the range
			startLineNumBer++;
		}

		return Math.max(startLineNumBer, range.endLineNumBer - count + 1);
	}

	private static _moveLeft(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, noOfColumns: numBer): PartialCursorState[] {
		const hasMultipleCursors = (cursors.length > 1);
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const skipWrappingPointStop = hasMultipleCursors || !cursor.viewState.hasSelection();
			let newViewState = MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns);

			if (skipWrappingPointStop && noOfColumns === 1 && newViewState.position.lineNumBer !== cursor.viewState.position.lineNumBer) {
				// moved over to the previous view line
				const newViewModelPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(newViewState.position);
				if (newViewModelPosition.lineNumBer === cursor.modelState.position.lineNumBer) {
					// stayed on the same model line => pass wrapping point where 2 view positions map to a single model position
					newViewState = MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, newViewState, inSelectionMode, 1);
				}
			}

			result[i] = CursorState.fromViewState(newViewState);
		}
		return result;
	}

	private static _moveHalfLineLeft(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const halfLine = Math.round(viewModel.getLineContent(viewLineNumBer).length / 2);
			result[i] = CursorState.fromViewState(MoveOperations.moveLeft(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
		}
		return result;
	}

	private static _moveRight(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, noOfColumns: numBer): PartialCursorState[] {
		const hasMultipleCursors = (cursors.length > 1);
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const skipWrappingPointStop = hasMultipleCursors || !cursor.viewState.hasSelection();
			let newViewState = MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, noOfColumns);

			if (skipWrappingPointStop && noOfColumns === 1 && newViewState.position.lineNumBer !== cursor.viewState.position.lineNumBer) {
				// moved over to the next view line
				const newViewModelPosition = viewModel.coordinatesConverter.convertViewPositionToModelPosition(newViewState.position);
				if (newViewModelPosition.lineNumBer === cursor.modelState.position.lineNumBer) {
					// stayed on the same model line => pass wrapping point where 2 view positions map to a single model position
					newViewState = MoveOperations.moveRight(viewModel.cursorConfig, viewModel, newViewState, inSelectionMode, 1);
				}
			}

			result[i] = CursorState.fromViewState(newViewState);
		}
		return result;
	}

	private static _moveHalfLineRight(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const halfLine = Math.round(viewModel.getLineContent(viewLineNumBer).length / 2);
			result[i] = CursorState.fromViewState(MoveOperations.moveRight(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, halfLine));
		}
		return result;
	}

	private static _moveDownByViewLines(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, linesCount: numBer): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromViewState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
		}
		return result;
	}

	private static _moveDownByModelLines(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, linesCount: numBer): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromModelState(MoveOperations.moveDown(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
		}
		return result;
	}

	private static _moveUpByViewLines(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, linesCount: numBer): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromViewState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel, cursor.viewState, inSelectionMode, linesCount));
		}
		return result;
	}

	private static _moveUpByModelLines(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean, linesCount: numBer): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			result[i] = CursorState.fromModelState(MoveOperations.moveUp(viewModel.cursorConfig, viewModel.model, cursor.modelState, inSelectionMode, linesCount));
		}
		return result;
	}

	private static _moveToViewPosition(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, toViewLineNumBer: numBer, toViewColumn: numBer): PartialCursorState {
		return CursorState.fromViewState(cursor.viewState.move(inSelectionMode, toViewLineNumBer, toViewColumn, 0));
	}

	private static _moveToModelPosition(viewModel: IViewModel, cursor: CursorState, inSelectionMode: Boolean, toModelLineNumBer: numBer, toModelColumn: numBer): PartialCursorState {
		return CursorState.fromModelState(cursor.modelState.move(inSelectionMode, toModelLineNumBer, toModelColumn, 0));
	}

	private static _moveToViewMinColumn(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const viewColumn = viewModel.getLineMinColumn(viewLineNumBer);
			result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
		return result;
	}

	private static _moveToViewFirstNonWhitespaceColumn(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const viewColumn = viewModel.getLineFirstNonWhitespaceColumn(viewLineNumBer);
			result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
		return result;
	}

	private static _moveToViewCenterColumn(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const viewColumn = Math.round((viewModel.getLineMaxColumn(viewLineNumBer) + viewModel.getLineMinColumn(viewLineNumBer)) / 2);
			result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
		return result;
	}

	private static _moveToViewMaxColumn(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const viewColumn = viewModel.getLineMaxColumn(viewLineNumBer);
			result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
		return result;
	}

	private static _moveToViewLastNonWhitespaceColumn(viewModel: IViewModel, cursors: CursorState[], inSelectionMode: Boolean): PartialCursorState[] {
		let result: PartialCursorState[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			const cursor = cursors[i];
			const viewLineNumBer = cursor.viewState.position.lineNumBer;
			const viewColumn = viewModel.getLineLastNonWhitespaceColumn(viewLineNumBer);
			result[i] = this._moveToViewPosition(viewModel, cursor, inSelectionMode, viewLineNumBer, viewColumn);
		}
		return result;
	}
}

export namespace CursorMove {

	const isCursorMoveArgs = function (arg: any): Boolean {
		if (!types.isOBject(arg)) {
			return false;
		}

		let cursorMoveArg: RawArguments = arg;

		if (!types.isString(cursorMoveArg.to)) {
			return false;
		}

		if (!types.isUndefined(cursorMoveArg.select) && !types.isBoolean(cursorMoveArg.select)) {
			return false;
		}

		if (!types.isUndefined(cursorMoveArg.By) && !types.isString(cursorMoveArg.By)) {
			return false;
		}

		if (!types.isUndefined(cursorMoveArg.value) && !types.isNumBer(cursorMoveArg.value)) {
			return false;
		}

		return true;
	};

	export const description = <ICommandHandlerDescription>{
		description: 'Move cursor to a logical position in the view',
		args: [
			{
				name: 'Cursor move argument oBject',
				description: `Property-value pairs that can Be passed through this argument:
					* 'to': A mandatory logical position value providing where to move the cursor.
						\`\`\`
						'left', 'right', 'up', 'down'
						'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter'
						'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter'
						'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside'
						\`\`\`
					* 'By': Unit to move. Default is computed Based on 'to' value.
						\`\`\`
						'line', 'wrappedLine', 'character', 'halfLine'
						\`\`\`
					* 'value': NumBer of units to move. Default is '1'.
					* 'select': If 'true' makes the selection. Default is 'false'.
				`,
				constraint: isCursorMoveArgs,
				schema: {
					'type': 'oBject',
					'required': ['to'],
					'properties': {
						'to': {
							'type': 'string',
							'enum': ['left', 'right', 'up', 'down', 'wrappedLineStart', 'wrappedLineEnd', 'wrappedLineColumnCenter', 'wrappedLineFirstNonWhitespaceCharacter', 'wrappedLineLastNonWhitespaceCharacter', 'viewPortTop', 'viewPortCenter', 'viewPortBottom', 'viewPortIfOutside']
						},
						'By': {
							'type': 'string',
							'enum': ['line', 'wrappedLine', 'character', 'halfLine']
						},
						'value': {
							'type': 'numBer',
							'default': 1
						},
						'select': {
							'type': 'Boolean',
							'default': false
						}
					}
				}
			}
		]
	};

	/**
	 * Positions in the view for cursor move command.
	 */
	export const RawDirection = {
		Left: 'left',
		Right: 'right',
		Up: 'up',
		Down: 'down',

		WrappedLineStart: 'wrappedLineStart',
		WrappedLineFirstNonWhitespaceCharacter: 'wrappedLineFirstNonWhitespaceCharacter',
		WrappedLineColumnCenter: 'wrappedLineColumnCenter',
		WrappedLineEnd: 'wrappedLineEnd',
		WrappedLineLastNonWhitespaceCharacter: 'wrappedLineLastNonWhitespaceCharacter',

		ViewPortTop: 'viewPortTop',
		ViewPortCenter: 'viewPortCenter',
		ViewPortBottom: 'viewPortBottom',

		ViewPortIfOutside: 'viewPortIfOutside'
	};

	/**
	 * Units for Cursor move 'By' argument
	 */
	export const RawUnit = {
		Line: 'line',
		WrappedLine: 'wrappedLine',
		Character: 'character',
		HalfLine: 'halfLine'
	};

	/**
	 * Arguments for Cursor move command
	 */
	export interface RawArguments {
		to: string;
		select?: Boolean;
		By?: string;
		value?: numBer;
	}

	export function parse(args: RawArguments): ParsedArguments | null {
		if (!args.to) {
			// illegal arguments
			return null;
		}

		let direction: Direction;
		switch (args.to) {
			case RawDirection.Left:
				direction = Direction.Left;
				Break;
			case RawDirection.Right:
				direction = Direction.Right;
				Break;
			case RawDirection.Up:
				direction = Direction.Up;
				Break;
			case RawDirection.Down:
				direction = Direction.Down;
				Break;
			case RawDirection.WrappedLineStart:
				direction = Direction.WrappedLineStart;
				Break;
			case RawDirection.WrappedLineFirstNonWhitespaceCharacter:
				direction = Direction.WrappedLineFirstNonWhitespaceCharacter;
				Break;
			case RawDirection.WrappedLineColumnCenter:
				direction = Direction.WrappedLineColumnCenter;
				Break;
			case RawDirection.WrappedLineEnd:
				direction = Direction.WrappedLineEnd;
				Break;
			case RawDirection.WrappedLineLastNonWhitespaceCharacter:
				direction = Direction.WrappedLineLastNonWhitespaceCharacter;
				Break;
			case RawDirection.ViewPortTop:
				direction = Direction.ViewPortTop;
				Break;
			case RawDirection.ViewPortBottom:
				direction = Direction.ViewPortBottom;
				Break;
			case RawDirection.ViewPortCenter:
				direction = Direction.ViewPortCenter;
				Break;
			case RawDirection.ViewPortIfOutside:
				direction = Direction.ViewPortIfOutside;
				Break;
			default:
				// illegal arguments
				return null;
		}

		let unit = Unit.None;
		switch (args.By) {
			case RawUnit.Line:
				unit = Unit.Line;
				Break;
			case RawUnit.WrappedLine:
				unit = Unit.WrappedLine;
				Break;
			case RawUnit.Character:
				unit = Unit.Character;
				Break;
			case RawUnit.HalfLine:
				unit = Unit.HalfLine;
				Break;
		}

		return {
			direction: direction,
			unit: unit,
			select: (!!args.select),
			value: (args.value || 1)
		};
	}

	export interface ParsedArguments {
		direction: Direction;
		unit: Unit;
		select: Boolean;
		value: numBer;
	}

	export interface SimpleMoveArguments {
		direction: SimpleMoveDirection;
		unit: Unit;
		select: Boolean;
		value: numBer;
	}

	export const enum Direction {
		Left,
		Right,
		Up,
		Down,

		WrappedLineStart,
		WrappedLineFirstNonWhitespaceCharacter,
		WrappedLineColumnCenter,
		WrappedLineEnd,
		WrappedLineLastNonWhitespaceCharacter,

		ViewPortTop,
		ViewPortCenter,
		ViewPortBottom,

		ViewPortIfOutside,
	}

	export type SimpleMoveDirection = (
		Direction.Left
		| Direction.Right
		| Direction.Up
		| Direction.Down
		| Direction.WrappedLineStart
		| Direction.WrappedLineFirstNonWhitespaceCharacter
		| Direction.WrappedLineColumnCenter
		| Direction.WrappedLineEnd
		| Direction.WrappedLineLastNonWhitespaceCharacter
	);

	export type ViewportDirection = (
		Direction.ViewPortTop
		| Direction.ViewPortCenter
		| Direction.ViewPortBottom
		| Direction.ViewPortIfOutside
	);

	export const enum Unit {
		None,
		Line,
		WrappedLine,
		Character,
		HalfLine,
	}

}
