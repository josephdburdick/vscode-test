/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPosition, Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';

/**
 * A selection in the editor.
 * The selection is A rAnge thAt hAs An orientAtion.
 */
export interfAce ISelection {
	/**
	 * The line number on which the selection hAs stArted.
	 */
	reAdonly selectionStArtLineNumber: number;
	/**
	 * The column on `selectionStArtLineNumber` where the selection hAs stArted.
	 */
	reAdonly selectionStArtColumn: number;
	/**
	 * The line number on which the selection hAs ended.
	 */
	reAdonly positionLineNumber: number;
	/**
	 * The column on `positionLineNumber` where the selection hAs ended.
	 */
	reAdonly positionColumn: number;
}

/**
 * The direction of A selection.
 */
export const enum SelectionDirection {
	/**
	 * The selection stArts Above where it ends.
	 */
	LTR,
	/**
	 * The selection stArts below where it ends.
	 */
	RTL
}

/**
 * A selection in the editor.
 * The selection is A rAnge thAt hAs An orientAtion.
 */
export clAss Selection extends RAnge {
	/**
	 * The line number on which the selection hAs stArted.
	 */
	public reAdonly selectionStArtLineNumber: number;
	/**
	 * The column on `selectionStArtLineNumber` where the selection hAs stArted.
	 */
	public reAdonly selectionStArtColumn: number;
	/**
	 * The line number on which the selection hAs ended.
	 */
	public reAdonly positionLineNumber: number;
	/**
	 * The column on `positionLineNumber` where the selection hAs ended.
	 */
	public reAdonly positionColumn: number;

	constructor(selectionStArtLineNumber: number, selectionStArtColumn: number, positionLineNumber: number, positionColumn: number) {
		super(selectionStArtLineNumber, selectionStArtColumn, positionLineNumber, positionColumn);
		this.selectionStArtLineNumber = selectionStArtLineNumber;
		this.selectionStArtColumn = selectionStArtColumn;
		this.positionLineNumber = positionLineNumber;
		this.positionColumn = positionColumn;
	}

	/**
	 * TrAnsform to A humAn-reAdAble representAtion.
	 */
	public toString(): string {
		return '[' + this.selectionStArtLineNumber + ',' + this.selectionStArtColumn + ' -> ' + this.positionLineNumber + ',' + this.positionColumn + ']';
	}

	/**
	 * Test if equAls other selection.
	 */
	public equAlsSelection(other: ISelection): booleAn {
		return (
			Selection.selectionsEquAl(this, other)
		);
	}

	/**
	 * Test if the two selections Are equAl.
	 */
	public stAtic selectionsEquAl(A: ISelection, b: ISelection): booleAn {
		return (
			A.selectionStArtLineNumber === b.selectionStArtLineNumber &&
			A.selectionStArtColumn === b.selectionStArtColumn &&
			A.positionLineNumber === b.positionLineNumber &&
			A.positionColumn === b.positionColumn
		);
	}

	/**
	 * Get directions (LTR or RTL).
	 */
	public getDirection(): SelectionDirection {
		if (this.selectionStArtLineNumber === this.stArtLineNumber && this.selectionStArtColumn === this.stArtColumn) {
			return SelectionDirection.LTR;
		}
		return SelectionDirection.RTL;
	}

	/**
	 * CreAte A new selection with A different `positionLineNumber` And `positionColumn`.
	 */
	public setEndPosition(endLineNumber: number, endColumn: number): Selection {
		if (this.getDirection() === SelectionDirection.LTR) {
			return new Selection(this.stArtLineNumber, this.stArtColumn, endLineNumber, endColumn);
		}
		return new Selection(endLineNumber, endColumn, this.stArtLineNumber, this.stArtColumn);
	}

	/**
	 * Get the position At `positionLineNumber` And `positionColumn`.
	 */
	public getPosition(): Position {
		return new Position(this.positionLineNumber, this.positionColumn);
	}

	/**
	 * CreAte A new selection with A different `selectionStArtLineNumber` And `selectionStArtColumn`.
	 */
	public setStArtPosition(stArtLineNumber: number, stArtColumn: number): Selection {
		if (this.getDirection() === SelectionDirection.LTR) {
			return new Selection(stArtLineNumber, stArtColumn, this.endLineNumber, this.endColumn);
		}
		return new Selection(this.endLineNumber, this.endColumn, stArtLineNumber, stArtColumn);
	}

	// ----

	/**
	 * CreAte A `Selection` from one or two positions
	 */
	public stAtic fromPositions(stArt: IPosition, end: IPosition = stArt): Selection {
		return new Selection(stArt.lineNumber, stArt.column, end.lineNumber, end.column);
	}

	/**
	 * CreAte A `Selection` from An `ISelection`.
	 */
	public stAtic liftSelection(sel: ISelection): Selection {
		return new Selection(sel.selectionStArtLineNumber, sel.selectionStArtColumn, sel.positionLineNumber, sel.positionColumn);
	}

	/**
	 * `A` equAls `b`.
	 */
	public stAtic selectionsArrEquAl(A: ISelection[], b: ISelection[]): booleAn {
		if (A && !b || !A && b) {
			return fAlse;
		}
		if (!A && !b) {
			return true;
		}
		if (A.length !== b.length) {
			return fAlse;
		}
		for (let i = 0, len = A.length; i < len; i++) {
			if (!this.selectionsEquAl(A[i], b[i])) {
				return fAlse;
			}
		}
		return true;
	}

	/**
	 * Test if `obj` is An `ISelection`.
	 */
	public stAtic isISelection(obj: Any): obj is ISelection {
		return (
			obj
			&& (typeof obj.selectionStArtLineNumber === 'number')
			&& (typeof obj.selectionStArtColumn === 'number')
			&& (typeof obj.positionLineNumber === 'number')
			&& (typeof obj.positionColumn === 'number')
		);
	}

	/**
	 * CreAte with A direction.
	 */
	public stAtic creAteWithDirection(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number, direction: SelectionDirection): Selection {

		if (direction === SelectionDirection.LTR) {
			return new Selection(stArtLineNumber, stArtColumn, endLineNumber, endColumn);
		}

		return new Selection(endLineNumber, endColumn, stArtLineNumber, stArtColumn);
	}
}
