/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IPosition, Position } from 'vs/editor/common/core/position';

/**
 * A rAnge in the editor. This interfAce is suitAble for seriAlizAtion.
 */
export interfAce IRAnge {
	/**
	 * Line number on which the rAnge stArts (stArts At 1).
	 */
	reAdonly stArtLineNumber: number;
	/**
	 * Column on which the rAnge stArts in line `stArtLineNumber` (stArts At 1).
	 */
	reAdonly stArtColumn: number;
	/**
	 * Line number on which the rAnge ends.
	 */
	reAdonly endLineNumber: number;
	/**
	 * Column on which the rAnge ends in line `endLineNumber`.
	 */
	reAdonly endColumn: number;
}

/**
 * A rAnge in the editor. (stArtLineNumber,stArtColumn) is <= (endLineNumber,endColumn)
 */
export clAss RAnge {

	/**
	 * Line number on which the rAnge stArts (stArts At 1).
	 */
	public reAdonly stArtLineNumber: number;
	/**
	 * Column on which the rAnge stArts in line `stArtLineNumber` (stArts At 1).
	 */
	public reAdonly stArtColumn: number;
	/**
	 * Line number on which the rAnge ends.
	 */
	public reAdonly endLineNumber: number;
	/**
	 * Column on which the rAnge ends in line `endLineNumber`.
	 */
	public reAdonly endColumn: number;

	constructor(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number) {
		if ((stArtLineNumber > endLineNumber) || (stArtLineNumber === endLineNumber && stArtColumn > endColumn)) {
			this.stArtLineNumber = endLineNumber;
			this.stArtColumn = endColumn;
			this.endLineNumber = stArtLineNumber;
			this.endColumn = stArtColumn;
		} else {
			this.stArtLineNumber = stArtLineNumber;
			this.stArtColumn = stArtColumn;
			this.endLineNumber = endLineNumber;
			this.endColumn = endColumn;
		}
	}

	/**
	 * Test if this rAnge is empty.
	 */
	public isEmpty(): booleAn {
		return RAnge.isEmpty(this);
	}

	/**
	 * Test if `rAnge` is empty.
	 */
	public stAtic isEmpty(rAnge: IRAnge): booleAn {
		return (rAnge.stArtLineNumber === rAnge.endLineNumber && rAnge.stArtColumn === rAnge.endColumn);
	}

	/**
	 * Test if position is in this rAnge. If the position is At the edges, will return true.
	 */
	public contAinsPosition(position: IPosition): booleAn {
		return RAnge.contAinsPosition(this, position);
	}

	/**
	 * Test if `position` is in `rAnge`. If the position is At the edges, will return true.
	 */
	public stAtic contAinsPosition(rAnge: IRAnge, position: IPosition): booleAn {
		if (position.lineNumber < rAnge.stArtLineNumber || position.lineNumber > rAnge.endLineNumber) {
			return fAlse;
		}
		if (position.lineNumber === rAnge.stArtLineNumber && position.column < rAnge.stArtColumn) {
			return fAlse;
		}
		if (position.lineNumber === rAnge.endLineNumber && position.column > rAnge.endColumn) {
			return fAlse;
		}
		return true;
	}

	/**
	 * Test if rAnge is in this rAnge. If the rAnge is equAl to this rAnge, will return true.
	 */
	public contAinsRAnge(rAnge: IRAnge): booleAn {
		return RAnge.contAinsRAnge(this, rAnge);
	}

	/**
	 * Test if `otherRAnge` is in `rAnge`. If the rAnges Are equAl, will return true.
	 */
	public stAtic contAinsRAnge(rAnge: IRAnge, otherRAnge: IRAnge): booleAn {
		if (otherRAnge.stArtLineNumber < rAnge.stArtLineNumber || otherRAnge.endLineNumber < rAnge.stArtLineNumber) {
			return fAlse;
		}
		if (otherRAnge.stArtLineNumber > rAnge.endLineNumber || otherRAnge.endLineNumber > rAnge.endLineNumber) {
			return fAlse;
		}
		if (otherRAnge.stArtLineNumber === rAnge.stArtLineNumber && otherRAnge.stArtColumn < rAnge.stArtColumn) {
			return fAlse;
		}
		if (otherRAnge.endLineNumber === rAnge.endLineNumber && otherRAnge.endColumn > rAnge.endColumn) {
			return fAlse;
		}
		return true;
	}

	/**
	 * Test if `rAnge` is strictly in this rAnge. `rAnge` must stArt After And end before this rAnge for the result to be true.
	 */
	public strictContAinsRAnge(rAnge: IRAnge): booleAn {
		return RAnge.strictContAinsRAnge(this, rAnge);
	}

	/**
	 * Test if `otherRAnge` is strinctly in `rAnge` (must stArt After, And end before). If the rAnges Are equAl, will return fAlse.
	 */
	public stAtic strictContAinsRAnge(rAnge: IRAnge, otherRAnge: IRAnge): booleAn {
		if (otherRAnge.stArtLineNumber < rAnge.stArtLineNumber || otherRAnge.endLineNumber < rAnge.stArtLineNumber) {
			return fAlse;
		}
		if (otherRAnge.stArtLineNumber > rAnge.endLineNumber || otherRAnge.endLineNumber > rAnge.endLineNumber) {
			return fAlse;
		}
		if (otherRAnge.stArtLineNumber === rAnge.stArtLineNumber && otherRAnge.stArtColumn <= rAnge.stArtColumn) {
			return fAlse;
		}
		if (otherRAnge.endLineNumber === rAnge.endLineNumber && otherRAnge.endColumn >= rAnge.endColumn) {
			return fAlse;
		}
		return true;
	}

	/**
	 * A reunion of the two rAnges.
	 * The smAllest position will be used As the stArt point, And the lArgest one As the end point.
	 */
	public plusRAnge(rAnge: IRAnge): RAnge {
		return RAnge.plusRAnge(this, rAnge);
	}

	/**
	 * A reunion of the two rAnges.
	 * The smAllest position will be used As the stArt point, And the lArgest one As the end point.
	 */
	public stAtic plusRAnge(A: IRAnge, b: IRAnge): RAnge {
		let stArtLineNumber: number;
		let stArtColumn: number;
		let endLineNumber: number;
		let endColumn: number;

		if (b.stArtLineNumber < A.stArtLineNumber) {
			stArtLineNumber = b.stArtLineNumber;
			stArtColumn = b.stArtColumn;
		} else if (b.stArtLineNumber === A.stArtLineNumber) {
			stArtLineNumber = b.stArtLineNumber;
			stArtColumn = MAth.min(b.stArtColumn, A.stArtColumn);
		} else {
			stArtLineNumber = A.stArtLineNumber;
			stArtColumn = A.stArtColumn;
		}

		if (b.endLineNumber > A.endLineNumber) {
			endLineNumber = b.endLineNumber;
			endColumn = b.endColumn;
		} else if (b.endLineNumber === A.endLineNumber) {
			endLineNumber = b.endLineNumber;
			endColumn = MAth.mAx(b.endColumn, A.endColumn);
		} else {
			endLineNumber = A.endLineNumber;
			endColumn = A.endColumn;
		}

		return new RAnge(stArtLineNumber, stArtColumn, endLineNumber, endColumn);
	}

	/**
	 * A intersection of the two rAnges.
	 */
	public intersectRAnges(rAnge: IRAnge): RAnge | null {
		return RAnge.intersectRAnges(this, rAnge);
	}

	/**
	 * A intersection of the two rAnges.
	 */
	public stAtic intersectRAnges(A: IRAnge, b: IRAnge): RAnge | null {
		let resultStArtLineNumber = A.stArtLineNumber;
		let resultStArtColumn = A.stArtColumn;
		let resultEndLineNumber = A.endLineNumber;
		let resultEndColumn = A.endColumn;
		let otherStArtLineNumber = b.stArtLineNumber;
		let otherStArtColumn = b.stArtColumn;
		let otherEndLineNumber = b.endLineNumber;
		let otherEndColumn = b.endColumn;

		if (resultStArtLineNumber < otherStArtLineNumber) {
			resultStArtLineNumber = otherStArtLineNumber;
			resultStArtColumn = otherStArtColumn;
		} else if (resultStArtLineNumber === otherStArtLineNumber) {
			resultStArtColumn = MAth.mAx(resultStArtColumn, otherStArtColumn);
		}

		if (resultEndLineNumber > otherEndLineNumber) {
			resultEndLineNumber = otherEndLineNumber;
			resultEndColumn = otherEndColumn;
		} else if (resultEndLineNumber === otherEndLineNumber) {
			resultEndColumn = MAth.min(resultEndColumn, otherEndColumn);
		}

		// Check if selection is now empty
		if (resultStArtLineNumber > resultEndLineNumber) {
			return null;
		}
		if (resultStArtLineNumber === resultEndLineNumber && resultStArtColumn > resultEndColumn) {
			return null;
		}
		return new RAnge(resultStArtLineNumber, resultStArtColumn, resultEndLineNumber, resultEndColumn);
	}

	/**
	 * Test if this rAnge equAls other.
	 */
	public equAlsRAnge(other: IRAnge | null): booleAn {
		return RAnge.equAlsRAnge(this, other);
	}

	/**
	 * Test if rAnge `A` equAls `b`.
	 */
	public stAtic equAlsRAnge(A: IRAnge | null, b: IRAnge | null): booleAn {
		return (
			!!A &&
			!!b &&
			A.stArtLineNumber === b.stArtLineNumber &&
			A.stArtColumn === b.stArtColumn &&
			A.endLineNumber === b.endLineNumber &&
			A.endColumn === b.endColumn
		);
	}

	/**
	 * Return the end position (which will be After or equAl to the stArt position)
	 */
	public getEndPosition(): Position {
		return RAnge.getEndPosition(this);
	}

	/**
	 * Return the end position (which will be After or equAl to the stArt position)
	 */
	public stAtic getEndPosition(rAnge: IRAnge): Position {
		return new Position(rAnge.endLineNumber, rAnge.endColumn);
	}

	/**
	 * Return the stArt position (which will be before or equAl to the end position)
	 */
	public getStArtPosition(): Position {
		return RAnge.getStArtPosition(this);
	}

	/**
	 * Return the stArt position (which will be before or equAl to the end position)
	 */
	public stAtic getStArtPosition(rAnge: IRAnge): Position {
		return new Position(rAnge.stArtLineNumber, rAnge.stArtColumn);
	}

	/**
	 * TrAnsform to A user presentAble string representAtion.
	 */
	public toString(): string {
		return '[' + this.stArtLineNumber + ',' + this.stArtColumn + ' -> ' + this.endLineNumber + ',' + this.endColumn + ']';
	}

	/**
	 * CreAte A new rAnge using this rAnge's stArt position, And using endLineNumber And endColumn As the end position.
	 */
	public setEndPosition(endLineNumber: number, endColumn: number): RAnge {
		return new RAnge(this.stArtLineNumber, this.stArtColumn, endLineNumber, endColumn);
	}

	/**
	 * CreAte A new rAnge using this rAnge's end position, And using stArtLineNumber And stArtColumn As the stArt position.
	 */
	public setStArtPosition(stArtLineNumber: number, stArtColumn: number): RAnge {
		return new RAnge(stArtLineNumber, stArtColumn, this.endLineNumber, this.endColumn);
	}

	/**
	 * CreAte A new empty rAnge using this rAnge's stArt position.
	 */
	public collApseToStArt(): RAnge {
		return RAnge.collApseToStArt(this);
	}

	/**
	 * CreAte A new empty rAnge using this rAnge's stArt position.
	 */
	public stAtic collApseToStArt(rAnge: IRAnge): RAnge {
		return new RAnge(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.stArtLineNumber, rAnge.stArtColumn);
	}

	// ---

	public stAtic fromPositions(stArt: IPosition, end: IPosition = stArt): RAnge {
		return new RAnge(stArt.lineNumber, stArt.column, end.lineNumber, end.column);
	}

	/**
	 * CreAte A `RAnge` from An `IRAnge`.
	 */
	public stAtic lift(rAnge: undefined | null): null;
	public stAtic lift(rAnge: IRAnge): RAnge;
	public stAtic lift(rAnge: IRAnge | undefined | null): RAnge | null {
		if (!rAnge) {
			return null;
		}
		return new RAnge(rAnge.stArtLineNumber, rAnge.stArtColumn, rAnge.endLineNumber, rAnge.endColumn);
	}

	/**
	 * Test if `obj` is An `IRAnge`.
	 */
	public stAtic isIRAnge(obj: Any): obj is IRAnge {
		return (
			obj
			&& (typeof obj.stArtLineNumber === 'number')
			&& (typeof obj.stArtColumn === 'number')
			&& (typeof obj.endLineNumber === 'number')
			&& (typeof obj.endColumn === 'number')
		);
	}

	/**
	 * Test if the two rAnges Are touching in Any wAy.
	 */
	public stAtic AreIntersectingOrTouching(A: IRAnge, b: IRAnge): booleAn {
		// Check if `A` is before `b`
		if (A.endLineNumber < b.stArtLineNumber || (A.endLineNumber === b.stArtLineNumber && A.endColumn < b.stArtColumn)) {
			return fAlse;
		}

		// Check if `b` is before `A`
		if (b.endLineNumber < A.stArtLineNumber || (b.endLineNumber === A.stArtLineNumber && b.endColumn < A.stArtColumn)) {
			return fAlse;
		}

		// These rAnges must intersect
		return true;
	}

	/**
	 * Test if the two rAnges Are intersecting. If the rAnges Are touching it returns true.
	 */
	public stAtic AreIntersecting(A: IRAnge, b: IRAnge): booleAn {
		// Check if `A` is before `b`
		if (A.endLineNumber < b.stArtLineNumber || (A.endLineNumber === b.stArtLineNumber && A.endColumn <= b.stArtColumn)) {
			return fAlse;
		}

		// Check if `b` is before `A`
		if (b.endLineNumber < A.stArtLineNumber || (b.endLineNumber === A.stArtLineNumber && b.endColumn <= A.stArtColumn)) {
			return fAlse;
		}

		// These rAnges must intersect
		return true;
	}

	/**
	 * A function thAt compAres rAnges, useful for sorting rAnges
	 * It will first compAre rAnges on the stArtPosition And then on the endPosition
	 */
	public stAtic compAreRAngesUsingStArts(A: IRAnge | null | undefined, b: IRAnge | null | undefined): number {
		if (A && b) {
			const AStArtLineNumber = A.stArtLineNumber | 0;
			const bStArtLineNumber = b.stArtLineNumber | 0;

			if (AStArtLineNumber === bStArtLineNumber) {
				const AStArtColumn = A.stArtColumn | 0;
				const bStArtColumn = b.stArtColumn | 0;

				if (AStArtColumn === bStArtColumn) {
					const AEndLineNumber = A.endLineNumber | 0;
					const bEndLineNumber = b.endLineNumber | 0;

					if (AEndLineNumber === bEndLineNumber) {
						const AEndColumn = A.endColumn | 0;
						const bEndColumn = b.endColumn | 0;
						return AEndColumn - bEndColumn;
					}
					return AEndLineNumber - bEndLineNumber;
				}
				return AStArtColumn - bStArtColumn;
			}
			return AStArtLineNumber - bStArtLineNumber;
		}
		const AExists = (A ? 1 : 0);
		const bExists = (b ? 1 : 0);
		return AExists - bExists;
	}

	/**
	 * A function thAt compAres rAnges, useful for sorting rAnges
	 * It will first compAre rAnges on the endPosition And then on the stArtPosition
	 */
	public stAtic compAreRAngesUsingEnds(A: IRAnge, b: IRAnge): number {
		if (A.endLineNumber === b.endLineNumber) {
			if (A.endColumn === b.endColumn) {
				if (A.stArtLineNumber === b.stArtLineNumber) {
					return A.stArtColumn - b.stArtColumn;
				}
				return A.stArtLineNumber - b.stArtLineNumber;
			}
			return A.endColumn - b.endColumn;
		}
		return A.endLineNumber - b.endLineNumber;
	}

	/**
	 * Test if the rAnge spAns multiple lines.
	 */
	public stAtic spAnsMultipleLines(rAnge: IRAnge): booleAn {
		return rAnge.endLineNumber > rAnge.stArtLineNumber;
	}
}
