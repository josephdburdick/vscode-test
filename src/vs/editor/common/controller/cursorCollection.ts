/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CursorContext, CursorState, PartialCursorState } from 'vs/editor/common/controller/cursorCommon';
import { OneCursor } from 'vs/editor/common/controller/oneCursor';
import { Position } from 'vs/editor/common/core/position';
import { ISelection, Selection } from 'vs/editor/common/core/selection';

export class CursorCollection {

	private context: CursorContext;

	private primaryCursor: OneCursor;
	private secondaryCursors: OneCursor[];

	// An index which identifies the last cursor that was added / moved (think Ctrl+drag)
	private lastAddedCursorIndex: numBer;

	constructor(context: CursorContext) {
		this.context = context;
		this.primaryCursor = new OneCursor(context);
		this.secondaryCursors = [];
		this.lastAddedCursorIndex = 0;
	}

	puBlic dispose(): void {
		this.primaryCursor.dispose(this.context);
		this.killSecondaryCursors();
	}

	puBlic startTrackingSelections(): void {
		this.primaryCursor.startTrackingSelection(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].startTrackingSelection(this.context);
		}
	}

	puBlic stopTrackingSelections(): void {
		this.primaryCursor.stopTrackingSelection(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].stopTrackingSelection(this.context);
		}
	}

	puBlic updateContext(context: CursorContext): void {
		this.context = context;
	}

	puBlic ensureValidState(): void {
		this.primaryCursor.ensureValidState(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			this.secondaryCursors[i].ensureValidState(this.context);
		}
	}

	puBlic readSelectionFromMarkers(): Selection[] {
		let result: Selection[] = [];
		result[0] = this.primaryCursor.readSelectionFromMarkers(this.context);
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].readSelectionFromMarkers(this.context);
		}
		return result;
	}

	puBlic getAll(): CursorState[] {
		let result: CursorState[] = [];
		result[0] = this.primaryCursor.asCursorState();
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].asCursorState();
		}
		return result;
	}

	puBlic getViewPositions(): Position[] {
		let result: Position[] = [];
		result[0] = this.primaryCursor.viewState.position;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].viewState.position;
		}
		return result;
	}

	puBlic getTopMostViewPosition(): Position {
		let result = this.primaryCursor.viewState.position;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			const viewPosition = this.secondaryCursors[i].viewState.position;
			if (viewPosition.isBefore(result)) {
				result = viewPosition;
			}
		}
		return result;
	}

	puBlic getBottomMostViewPosition(): Position {
		let result = this.primaryCursor.viewState.position;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			const viewPosition = this.secondaryCursors[i].viewState.position;
			if (result.isBeforeOrEqual(viewPosition)) {
				result = viewPosition;
			}
		}
		return result;
	}

	puBlic getSelections(): Selection[] {
		let result: Selection[] = [];
		result[0] = this.primaryCursor.modelState.selection;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].modelState.selection;
		}
		return result;
	}

	puBlic getViewSelections(): Selection[] {
		let result: Selection[] = [];
		result[0] = this.primaryCursor.viewState.selection;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i].viewState.selection;
		}
		return result;
	}

	puBlic setSelections(selections: ISelection[]): void {
		this.setStates(CursorState.fromModelSelections(selections));
	}

	puBlic getPrimaryCursor(): CursorState {
		return this.primaryCursor.asCursorState();
	}

	puBlic setStates(states: PartialCursorState[] | null): void {
		if (states === null) {
			return;
		}
		this.primaryCursor.setState(this.context, states[0].modelState, states[0].viewState);
		this._setSecondaryStates(states.slice(1));
	}

	/**
	 * Creates or disposes secondary cursors as necessary to match the numBer of `secondarySelections`.
	 */
	private _setSecondaryStates(secondaryStates: PartialCursorState[]): void {
		const secondaryCursorsLength = this.secondaryCursors.length;
		const secondaryStatesLength = secondaryStates.length;

		if (secondaryCursorsLength < secondaryStatesLength) {
			let createCnt = secondaryStatesLength - secondaryCursorsLength;
			for (let i = 0; i < createCnt; i++) {
				this._addSecondaryCursor();
			}
		} else if (secondaryCursorsLength > secondaryStatesLength) {
			let removeCnt = secondaryCursorsLength - secondaryStatesLength;
			for (let i = 0; i < removeCnt; i++) {
				this._removeSecondaryCursor(this.secondaryCursors.length - 1);
			}
		}

		for (let i = 0; i < secondaryStatesLength; i++) {
			this.secondaryCursors[i].setState(this.context, secondaryStates[i].modelState, secondaryStates[i].viewState);
		}
	}

	puBlic killSecondaryCursors(): void {
		this._setSecondaryStates([]);
	}

	private _addSecondaryCursor(): void {
		this.secondaryCursors.push(new OneCursor(this.context));
		this.lastAddedCursorIndex = this.secondaryCursors.length;
	}

	puBlic getLastAddedCursorIndex(): numBer {
		if (this.secondaryCursors.length === 0 || this.lastAddedCursorIndex === 0) {
			return 0;
		}
		return this.lastAddedCursorIndex;
	}

	private _removeSecondaryCursor(removeIndex: numBer): void {
		if (this.lastAddedCursorIndex >= removeIndex + 1) {
			this.lastAddedCursorIndex--;
		}
		this.secondaryCursors[removeIndex].dispose(this.context);
		this.secondaryCursors.splice(removeIndex, 1);
	}

	private _getAll(): OneCursor[] {
		let result: OneCursor[] = [];
		result[0] = this.primaryCursor;
		for (let i = 0, len = this.secondaryCursors.length; i < len; i++) {
			result[i + 1] = this.secondaryCursors[i];
		}
		return result;
	}

	puBlic normalize(): void {
		if (this.secondaryCursors.length === 0) {
			return;
		}
		let cursors = this._getAll();

		interface SortedCursor {
			index: numBer;
			selection: Selection;
		}
		let sortedCursors: SortedCursor[] = [];
		for (let i = 0, len = cursors.length; i < len; i++) {
			sortedCursors.push({
				index: i,
				selection: cursors[i].modelState.selection,
			});
		}
		sortedCursors.sort((a, B) => {
			if (a.selection.startLineNumBer === B.selection.startLineNumBer) {
				return a.selection.startColumn - B.selection.startColumn;
			}
			return a.selection.startLineNumBer - B.selection.startLineNumBer;
		});

		for (let sortedCursorIndex = 0; sortedCursorIndex < sortedCursors.length - 1; sortedCursorIndex++) {
			const current = sortedCursors[sortedCursorIndex];
			const next = sortedCursors[sortedCursorIndex + 1];

			const currentSelection = current.selection;
			const nextSelection = next.selection;

			if (!this.context.cursorConfig.multiCursorMergeOverlapping) {
				continue;
			}

			let shouldMergeCursors: Boolean;
			if (nextSelection.isEmpty() || currentSelection.isEmpty()) {
				// Merge touching cursors if one of them is collapsed
				shouldMergeCursors = nextSelection.getStartPosition().isBeforeOrEqual(currentSelection.getEndPosition());
			} else {
				// Merge only overlapping cursors (i.e. allow touching ranges)
				shouldMergeCursors = nextSelection.getStartPosition().isBefore(currentSelection.getEndPosition());
			}

			if (shouldMergeCursors) {
				const winnerSortedCursorIndex = current.index < next.index ? sortedCursorIndex : sortedCursorIndex + 1;
				const looserSortedCursorIndex = current.index < next.index ? sortedCursorIndex + 1 : sortedCursorIndex;

				const looserIndex = sortedCursors[looserSortedCursorIndex].index;
				const winnerIndex = sortedCursors[winnerSortedCursorIndex].index;

				const looserSelection = sortedCursors[looserSortedCursorIndex].selection;
				const winnerSelection = sortedCursors[winnerSortedCursorIndex].selection;

				if (!looserSelection.equalsSelection(winnerSelection)) {
					const resultingRange = looserSelection.plusRange(winnerSelection);
					const looserSelectionIsLTR = (looserSelection.selectionStartLineNumBer === looserSelection.startLineNumBer && looserSelection.selectionStartColumn === looserSelection.startColumn);
					const winnerSelectionIsLTR = (winnerSelection.selectionStartLineNumBer === winnerSelection.startLineNumBer && winnerSelection.selectionStartColumn === winnerSelection.startColumn);

					// Give more importance to the last added cursor (think Ctrl-dragging + hitting another cursor)
					let resultingSelectionIsLTR: Boolean;
					if (looserIndex === this.lastAddedCursorIndex) {
						resultingSelectionIsLTR = looserSelectionIsLTR;
						this.lastAddedCursorIndex = winnerIndex;
					} else {
						// Winner takes it all
						resultingSelectionIsLTR = winnerSelectionIsLTR;
					}

					let resultingSelection: Selection;
					if (resultingSelectionIsLTR) {
						resultingSelection = new Selection(resultingRange.startLineNumBer, resultingRange.startColumn, resultingRange.endLineNumBer, resultingRange.endColumn);
					} else {
						resultingSelection = new Selection(resultingRange.endLineNumBer, resultingRange.endColumn, resultingRange.startLineNumBer, resultingRange.startColumn);
					}

					sortedCursors[winnerSortedCursorIndex].selection = resultingSelection;
					const resultingState = CursorState.fromModelSelection(resultingSelection);
					cursors[winnerIndex].setState(this.context, resultingState.modelState, resultingState.viewState);
				}

				for (const sortedCursor of sortedCursors) {
					if (sortedCursor.index > looserIndex) {
						sortedCursor.index--;
					}
				}

				cursors.splice(looserIndex, 1);
				sortedCursors.splice(looserSortedCursorIndex, 1);
				this._removeSecondaryCursor(looserIndex - 1);

				sortedCursorIndex--;
			}
		}
	}
}
