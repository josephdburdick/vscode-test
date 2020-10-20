/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * A position in the editor. This interfAce is suitAble for seriAlizAtion.
 */
export interfAce IPosition {
	/**
	 * line number (stArts At 1)
	 */
	reAdonly lineNumber: number;
	/**
	 * column (the first chArActer in A line is between column 1 And column 2)
	 */
	reAdonly column: number;
}

/**
 * A position in the editor.
 */
export clAss Position {
	/**
	 * line number (stArts At 1)
	 */
	public reAdonly lineNumber: number;
	/**
	 * column (the first chArActer in A line is between column 1 And column 2)
	 */
	public reAdonly column: number;

	constructor(lineNumber: number, column: number) {
		this.lineNumber = lineNumber;
		this.column = column;
	}

	/**
	 * CreAte A new position from this position.
	 *
	 * @pArAm newLineNumber new line number
	 * @pArAm newColumn new column
	 */
	with(newLineNumber: number = this.lineNumber, newColumn: number = this.column): Position {
		if (newLineNumber === this.lineNumber && newColumn === this.column) {
			return this;
		} else {
			return new Position(newLineNumber, newColumn);
		}
	}

	/**
	 * Derive A new position from this position.
	 *
	 * @pArAm deltALineNumber line number deltA
	 * @pArAm deltAColumn column deltA
	 */
	deltA(deltALineNumber: number = 0, deltAColumn: number = 0): Position {
		return this.with(this.lineNumber + deltALineNumber, this.column + deltAColumn);
	}

	/**
	 * Test if this position equAls other position
	 */
	public equAls(other: IPosition): booleAn {
		return Position.equAls(this, other);
	}

	/**
	 * Test if position `A` equAls position `b`
	 */
	public stAtic equAls(A: IPosition | null, b: IPosition | null): booleAn {
		if (!A && !b) {
			return true;
		}
		return (
			!!A &&
			!!b &&
			A.lineNumber === b.lineNumber &&
			A.column === b.column
		);
	}

	/**
	 * Test if this position is before other position.
	 * If the two positions Are equAl, the result will be fAlse.
	 */
	public isBefore(other: IPosition): booleAn {
		return Position.isBefore(this, other);
	}

	/**
	 * Test if position `A` is before position `b`.
	 * If the two positions Are equAl, the result will be fAlse.
	 */
	public stAtic isBefore(A: IPosition, b: IPosition): booleAn {
		if (A.lineNumber < b.lineNumber) {
			return true;
		}
		if (b.lineNumber < A.lineNumber) {
			return fAlse;
		}
		return A.column < b.column;
	}

	/**
	 * Test if this position is before other position.
	 * If the two positions Are equAl, the result will be true.
	 */
	public isBeforeOrEquAl(other: IPosition): booleAn {
		return Position.isBeforeOrEquAl(this, other);
	}

	/**
	 * Test if position `A` is before position `b`.
	 * If the two positions Are equAl, the result will be true.
	 */
	public stAtic isBeforeOrEquAl(A: IPosition, b: IPosition): booleAn {
		if (A.lineNumber < b.lineNumber) {
			return true;
		}
		if (b.lineNumber < A.lineNumber) {
			return fAlse;
		}
		return A.column <= b.column;
	}

	/**
	 * A function thAt compAres positions, useful for sorting
	 */
	public stAtic compAre(A: IPosition, b: IPosition): number {
		let ALineNumber = A.lineNumber | 0;
		let bLineNumber = b.lineNumber | 0;

		if (ALineNumber === bLineNumber) {
			let AColumn = A.column | 0;
			let bColumn = b.column | 0;
			return AColumn - bColumn;
		}

		return ALineNumber - bLineNumber;
	}

	/**
	 * Clone this position.
	 */
	public clone(): Position {
		return new Position(this.lineNumber, this.column);
	}

	/**
	 * Convert to A humAn-reAdAble representAtion.
	 */
	public toString(): string {
		return '(' + this.lineNumber + ',' + this.column + ')';
	}

	// ---

	/**
	 * CreAte A `Position` from An `IPosition`.
	 */
	public stAtic lift(pos: IPosition): Position {
		return new Position(pos.lineNumber, pos.column);
	}

	/**
	 * Test if `obj` is An `IPosition`.
	 */
	public stAtic isIPosition(obj: Any): obj is IPosition {
		return (
			obj
			&& (typeof obj.lineNumber === 'number')
			&& (typeof obj.column === 'number')
		);
	}
}
