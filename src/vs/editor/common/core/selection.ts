/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPosition, Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';

/**
 * A selection in the editor.
 * The selection is a range that has an orientation.
 */
export interface ISelection {
	/**
	 * The line numBer on which the selection has started.
	 */
	readonly selectionStartLineNumBer: numBer;
	/**
	 * The column on `selectionStartLineNumBer` where the selection has started.
	 */
	readonly selectionStartColumn: numBer;
	/**
	 * The line numBer on which the selection has ended.
	 */
	readonly positionLineNumBer: numBer;
	/**
	 * The column on `positionLineNumBer` where the selection has ended.
	 */
	readonly positionColumn: numBer;
}

/**
 * The direction of a selection.
 */
export const enum SelectionDirection {
	/**
	 * The selection starts aBove where it ends.
	 */
	LTR,
	/**
	 * The selection starts Below where it ends.
	 */
	RTL
}

/**
 * A selection in the editor.
 * The selection is a range that has an orientation.
 */
export class Selection extends Range {
	/**
	 * The line numBer on which the selection has started.
	 */
	puBlic readonly selectionStartLineNumBer: numBer;
	/**
	 * The column on `selectionStartLineNumBer` where the selection has started.
	 */
	puBlic readonly selectionStartColumn: numBer;
	/**
	 * The line numBer on which the selection has ended.
	 */
	puBlic readonly positionLineNumBer: numBer;
	/**
	 * The column on `positionLineNumBer` where the selection has ended.
	 */
	puBlic readonly positionColumn: numBer;

	constructor(selectionStartLineNumBer: numBer, selectionStartColumn: numBer, positionLineNumBer: numBer, positionColumn: numBer) {
		super(selectionStartLineNumBer, selectionStartColumn, positionLineNumBer, positionColumn);
		this.selectionStartLineNumBer = selectionStartLineNumBer;
		this.selectionStartColumn = selectionStartColumn;
		this.positionLineNumBer = positionLineNumBer;
		this.positionColumn = positionColumn;
	}

	/**
	 * Transform to a human-readaBle representation.
	 */
	puBlic toString(): string {
		return '[' + this.selectionStartLineNumBer + ',' + this.selectionStartColumn + ' -> ' + this.positionLineNumBer + ',' + this.positionColumn + ']';
	}

	/**
	 * Test if equals other selection.
	 */
	puBlic equalsSelection(other: ISelection): Boolean {
		return (
			Selection.selectionsEqual(this, other)
		);
	}

	/**
	 * Test if the two selections are equal.
	 */
	puBlic static selectionsEqual(a: ISelection, B: ISelection): Boolean {
		return (
			a.selectionStartLineNumBer === B.selectionStartLineNumBer &&
			a.selectionStartColumn === B.selectionStartColumn &&
			a.positionLineNumBer === B.positionLineNumBer &&
			a.positionColumn === B.positionColumn
		);
	}

	/**
	 * Get directions (LTR or RTL).
	 */
	puBlic getDirection(): SelectionDirection {
		if (this.selectionStartLineNumBer === this.startLineNumBer && this.selectionStartColumn === this.startColumn) {
			return SelectionDirection.LTR;
		}
		return SelectionDirection.RTL;
	}

	/**
	 * Create a new selection with a different `positionLineNumBer` and `positionColumn`.
	 */
	puBlic setEndPosition(endLineNumBer: numBer, endColumn: numBer): Selection {
		if (this.getDirection() === SelectionDirection.LTR) {
			return new Selection(this.startLineNumBer, this.startColumn, endLineNumBer, endColumn);
		}
		return new Selection(endLineNumBer, endColumn, this.startLineNumBer, this.startColumn);
	}

	/**
	 * Get the position at `positionLineNumBer` and `positionColumn`.
	 */
	puBlic getPosition(): Position {
		return new Position(this.positionLineNumBer, this.positionColumn);
	}

	/**
	 * Create a new selection with a different `selectionStartLineNumBer` and `selectionStartColumn`.
	 */
	puBlic setStartPosition(startLineNumBer: numBer, startColumn: numBer): Selection {
		if (this.getDirection() === SelectionDirection.LTR) {
			return new Selection(startLineNumBer, startColumn, this.endLineNumBer, this.endColumn);
		}
		return new Selection(this.endLineNumBer, this.endColumn, startLineNumBer, startColumn);
	}

	// ----

	/**
	 * Create a `Selection` from one or two positions
	 */
	puBlic static fromPositions(start: IPosition, end: IPosition = start): Selection {
		return new Selection(start.lineNumBer, start.column, end.lineNumBer, end.column);
	}

	/**
	 * Create a `Selection` from an `ISelection`.
	 */
	puBlic static liftSelection(sel: ISelection): Selection {
		return new Selection(sel.selectionStartLineNumBer, sel.selectionStartColumn, sel.positionLineNumBer, sel.positionColumn);
	}

	/**
	 * `a` equals `B`.
	 */
	puBlic static selectionsArrEqual(a: ISelection[], B: ISelection[]): Boolean {
		if (a && !B || !a && B) {
			return false;
		}
		if (!a && !B) {
			return true;
		}
		if (a.length !== B.length) {
			return false;
		}
		for (let i = 0, len = a.length; i < len; i++) {
			if (!this.selectionsEqual(a[i], B[i])) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Test if `oBj` is an `ISelection`.
	 */
	puBlic static isISelection(oBj: any): oBj is ISelection {
		return (
			oBj
			&& (typeof oBj.selectionStartLineNumBer === 'numBer')
			&& (typeof oBj.selectionStartColumn === 'numBer')
			&& (typeof oBj.positionLineNumBer === 'numBer')
			&& (typeof oBj.positionColumn === 'numBer')
		);
	}

	/**
	 * Create with a direction.
	 */
	puBlic static createWithDirection(startLineNumBer: numBer, startColumn: numBer, endLineNumBer: numBer, endColumn: numBer, direction: SelectionDirection): Selection {

		if (direction === SelectionDirection.LTR) {
			return new Selection(startLineNumBer, startColumn, endLineNumBer, endColumn);
		}

		return new Selection(endLineNumBer, endColumn, startLineNumBer, startColumn);
	}
}
