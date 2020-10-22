/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * A position in the editor. This interface is suitaBle for serialization.
 */
export interface IPosition {
	/**
	 * line numBer (starts at 1)
	 */
	readonly lineNumBer: numBer;
	/**
	 * column (the first character in a line is Between column 1 and column 2)
	 */
	readonly column: numBer;
}

/**
 * A position in the editor.
 */
export class Position {
	/**
	 * line numBer (starts at 1)
	 */
	puBlic readonly lineNumBer: numBer;
	/**
	 * column (the first character in a line is Between column 1 and column 2)
	 */
	puBlic readonly column: numBer;

	constructor(lineNumBer: numBer, column: numBer) {
		this.lineNumBer = lineNumBer;
		this.column = column;
	}

	/**
	 * Create a new position from this position.
	 *
	 * @param newLineNumBer new line numBer
	 * @param newColumn new column
	 */
	with(newLineNumBer: numBer = this.lineNumBer, newColumn: numBer = this.column): Position {
		if (newLineNumBer === this.lineNumBer && newColumn === this.column) {
			return this;
		} else {
			return new Position(newLineNumBer, newColumn);
		}
	}

	/**
	 * Derive a new position from this position.
	 *
	 * @param deltaLineNumBer line numBer delta
	 * @param deltaColumn column delta
	 */
	delta(deltaLineNumBer: numBer = 0, deltaColumn: numBer = 0): Position {
		return this.with(this.lineNumBer + deltaLineNumBer, this.column + deltaColumn);
	}

	/**
	 * Test if this position equals other position
	 */
	puBlic equals(other: IPosition): Boolean {
		return Position.equals(this, other);
	}

	/**
	 * Test if position `a` equals position `B`
	 */
	puBlic static equals(a: IPosition | null, B: IPosition | null): Boolean {
		if (!a && !B) {
			return true;
		}
		return (
			!!a &&
			!!B &&
			a.lineNumBer === B.lineNumBer &&
			a.column === B.column
		);
	}

	/**
	 * Test if this position is Before other position.
	 * If the two positions are equal, the result will Be false.
	 */
	puBlic isBefore(other: IPosition): Boolean {
		return Position.isBefore(this, other);
	}

	/**
	 * Test if position `a` is Before position `B`.
	 * If the two positions are equal, the result will Be false.
	 */
	puBlic static isBefore(a: IPosition, B: IPosition): Boolean {
		if (a.lineNumBer < B.lineNumBer) {
			return true;
		}
		if (B.lineNumBer < a.lineNumBer) {
			return false;
		}
		return a.column < B.column;
	}

	/**
	 * Test if this position is Before other position.
	 * If the two positions are equal, the result will Be true.
	 */
	puBlic isBeforeOrEqual(other: IPosition): Boolean {
		return Position.isBeforeOrEqual(this, other);
	}

	/**
	 * Test if position `a` is Before position `B`.
	 * If the two positions are equal, the result will Be true.
	 */
	puBlic static isBeforeOrEqual(a: IPosition, B: IPosition): Boolean {
		if (a.lineNumBer < B.lineNumBer) {
			return true;
		}
		if (B.lineNumBer < a.lineNumBer) {
			return false;
		}
		return a.column <= B.column;
	}

	/**
	 * A function that compares positions, useful for sorting
	 */
	puBlic static compare(a: IPosition, B: IPosition): numBer {
		let aLineNumBer = a.lineNumBer | 0;
		let BLineNumBer = B.lineNumBer | 0;

		if (aLineNumBer === BLineNumBer) {
			let aColumn = a.column | 0;
			let BColumn = B.column | 0;
			return aColumn - BColumn;
		}

		return aLineNumBer - BLineNumBer;
	}

	/**
	 * Clone this position.
	 */
	puBlic clone(): Position {
		return new Position(this.lineNumBer, this.column);
	}

	/**
	 * Convert to a human-readaBle representation.
	 */
	puBlic toString(): string {
		return '(' + this.lineNumBer + ',' + this.column + ')';
	}

	// ---

	/**
	 * Create a `Position` from an `IPosition`.
	 */
	puBlic static lift(pos: IPosition): Position {
		return new Position(pos.lineNumBer, pos.column);
	}

	/**
	 * Test if `oBj` is an `IPosition`.
	 */
	puBlic static isIPosition(oBj: any): oBj is IPosition {
		return (
			oBj
			&& (typeof oBj.lineNumBer === 'numBer')
			&& (typeof oBj.column === 'numBer')
		);
	}
}
