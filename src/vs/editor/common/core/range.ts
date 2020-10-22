/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPosition, Position } from 'vs/editor/common/core/position';

/**
 * A range in the editor. This interface is suitaBle for serialization.
 */
export interface IRange {
	/**
	 * Line numBer on which the range starts (starts at 1).
	 */
	readonly startLineNumBer: numBer;
	/**
	 * Column on which the range starts in line `startLineNumBer` (starts at 1).
	 */
	readonly startColumn: numBer;
	/**
	 * Line numBer on which the range ends.
	 */
	readonly endLineNumBer: numBer;
	/**
	 * Column on which the range ends in line `endLineNumBer`.
	 */
	readonly endColumn: numBer;
}

/**
 * A range in the editor. (startLineNumBer,startColumn) is <= (endLineNumBer,endColumn)
 */
export class Range {

	/**
	 * Line numBer on which the range starts (starts at 1).
	 */
	puBlic readonly startLineNumBer: numBer;
	/**
	 * Column on which the range starts in line `startLineNumBer` (starts at 1).
	 */
	puBlic readonly startColumn: numBer;
	/**
	 * Line numBer on which the range ends.
	 */
	puBlic readonly endLineNumBer: numBer;
	/**
	 * Column on which the range ends in line `endLineNumBer`.
	 */
	puBlic readonly endColumn: numBer;

	constructor(startLineNumBer: numBer, startColumn: numBer, endLineNumBer: numBer, endColumn: numBer) {
		if ((startLineNumBer > endLineNumBer) || (startLineNumBer === endLineNumBer && startColumn > endColumn)) {
			this.startLineNumBer = endLineNumBer;
			this.startColumn = endColumn;
			this.endLineNumBer = startLineNumBer;
			this.endColumn = startColumn;
		} else {
			this.startLineNumBer = startLineNumBer;
			this.startColumn = startColumn;
			this.endLineNumBer = endLineNumBer;
			this.endColumn = endColumn;
		}
	}

	/**
	 * Test if this range is empty.
	 */
	puBlic isEmpty(): Boolean {
		return Range.isEmpty(this);
	}

	/**
	 * Test if `range` is empty.
	 */
	puBlic static isEmpty(range: IRange): Boolean {
		return (range.startLineNumBer === range.endLineNumBer && range.startColumn === range.endColumn);
	}

	/**
	 * Test if position is in this range. If the position is at the edges, will return true.
	 */
	puBlic containsPosition(position: IPosition): Boolean {
		return Range.containsPosition(this, position);
	}

	/**
	 * Test if `position` is in `range`. If the position is at the edges, will return true.
	 */
	puBlic static containsPosition(range: IRange, position: IPosition): Boolean {
		if (position.lineNumBer < range.startLineNumBer || position.lineNumBer > range.endLineNumBer) {
			return false;
		}
		if (position.lineNumBer === range.startLineNumBer && position.column < range.startColumn) {
			return false;
		}
		if (position.lineNumBer === range.endLineNumBer && position.column > range.endColumn) {
			return false;
		}
		return true;
	}

	/**
	 * Test if range is in this range. If the range is equal to this range, will return true.
	 */
	puBlic containsRange(range: IRange): Boolean {
		return Range.containsRange(this, range);
	}

	/**
	 * Test if `otherRange` is in `range`. If the ranges are equal, will return true.
	 */
	puBlic static containsRange(range: IRange, otherRange: IRange): Boolean {
		if (otherRange.startLineNumBer < range.startLineNumBer || otherRange.endLineNumBer < range.startLineNumBer) {
			return false;
		}
		if (otherRange.startLineNumBer > range.endLineNumBer || otherRange.endLineNumBer > range.endLineNumBer) {
			return false;
		}
		if (otherRange.startLineNumBer === range.startLineNumBer && otherRange.startColumn < range.startColumn) {
			return false;
		}
		if (otherRange.endLineNumBer === range.endLineNumBer && otherRange.endColumn > range.endColumn) {
			return false;
		}
		return true;
	}

	/**
	 * Test if `range` is strictly in this range. `range` must start after and end Before this range for the result to Be true.
	 */
	puBlic strictContainsRange(range: IRange): Boolean {
		return Range.strictContainsRange(this, range);
	}

	/**
	 * Test if `otherRange` is strinctly in `range` (must start after, and end Before). If the ranges are equal, will return false.
	 */
	puBlic static strictContainsRange(range: IRange, otherRange: IRange): Boolean {
		if (otherRange.startLineNumBer < range.startLineNumBer || otherRange.endLineNumBer < range.startLineNumBer) {
			return false;
		}
		if (otherRange.startLineNumBer > range.endLineNumBer || otherRange.endLineNumBer > range.endLineNumBer) {
			return false;
		}
		if (otherRange.startLineNumBer === range.startLineNumBer && otherRange.startColumn <= range.startColumn) {
			return false;
		}
		if (otherRange.endLineNumBer === range.endLineNumBer && otherRange.endColumn >= range.endColumn) {
			return false;
		}
		return true;
	}

	/**
	 * A reunion of the two ranges.
	 * The smallest position will Be used as the start point, and the largest one as the end point.
	 */
	puBlic plusRange(range: IRange): Range {
		return Range.plusRange(this, range);
	}

	/**
	 * A reunion of the two ranges.
	 * The smallest position will Be used as the start point, and the largest one as the end point.
	 */
	puBlic static plusRange(a: IRange, B: IRange): Range {
		let startLineNumBer: numBer;
		let startColumn: numBer;
		let endLineNumBer: numBer;
		let endColumn: numBer;

		if (B.startLineNumBer < a.startLineNumBer) {
			startLineNumBer = B.startLineNumBer;
			startColumn = B.startColumn;
		} else if (B.startLineNumBer === a.startLineNumBer) {
			startLineNumBer = B.startLineNumBer;
			startColumn = Math.min(B.startColumn, a.startColumn);
		} else {
			startLineNumBer = a.startLineNumBer;
			startColumn = a.startColumn;
		}

		if (B.endLineNumBer > a.endLineNumBer) {
			endLineNumBer = B.endLineNumBer;
			endColumn = B.endColumn;
		} else if (B.endLineNumBer === a.endLineNumBer) {
			endLineNumBer = B.endLineNumBer;
			endColumn = Math.max(B.endColumn, a.endColumn);
		} else {
			endLineNumBer = a.endLineNumBer;
			endColumn = a.endColumn;
		}

		return new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);
	}

	/**
	 * A intersection of the two ranges.
	 */
	puBlic intersectRanges(range: IRange): Range | null {
		return Range.intersectRanges(this, range);
	}

	/**
	 * A intersection of the two ranges.
	 */
	puBlic static intersectRanges(a: IRange, B: IRange): Range | null {
		let resultStartLineNumBer = a.startLineNumBer;
		let resultStartColumn = a.startColumn;
		let resultEndLineNumBer = a.endLineNumBer;
		let resultEndColumn = a.endColumn;
		let otherStartLineNumBer = B.startLineNumBer;
		let otherStartColumn = B.startColumn;
		let otherEndLineNumBer = B.endLineNumBer;
		let otherEndColumn = B.endColumn;

		if (resultStartLineNumBer < otherStartLineNumBer) {
			resultStartLineNumBer = otherStartLineNumBer;
			resultStartColumn = otherStartColumn;
		} else if (resultStartLineNumBer === otherStartLineNumBer) {
			resultStartColumn = Math.max(resultStartColumn, otherStartColumn);
		}

		if (resultEndLineNumBer > otherEndLineNumBer) {
			resultEndLineNumBer = otherEndLineNumBer;
			resultEndColumn = otherEndColumn;
		} else if (resultEndLineNumBer === otherEndLineNumBer) {
			resultEndColumn = Math.min(resultEndColumn, otherEndColumn);
		}

		// Check if selection is now empty
		if (resultStartLineNumBer > resultEndLineNumBer) {
			return null;
		}
		if (resultStartLineNumBer === resultEndLineNumBer && resultStartColumn > resultEndColumn) {
			return null;
		}
		return new Range(resultStartLineNumBer, resultStartColumn, resultEndLineNumBer, resultEndColumn);
	}

	/**
	 * Test if this range equals other.
	 */
	puBlic equalsRange(other: IRange | null): Boolean {
		return Range.equalsRange(this, other);
	}

	/**
	 * Test if range `a` equals `B`.
	 */
	puBlic static equalsRange(a: IRange | null, B: IRange | null): Boolean {
		return (
			!!a &&
			!!B &&
			a.startLineNumBer === B.startLineNumBer &&
			a.startColumn === B.startColumn &&
			a.endLineNumBer === B.endLineNumBer &&
			a.endColumn === B.endColumn
		);
	}

	/**
	 * Return the end position (which will Be after or equal to the start position)
	 */
	puBlic getEndPosition(): Position {
		return Range.getEndPosition(this);
	}

	/**
	 * Return the end position (which will Be after or equal to the start position)
	 */
	puBlic static getEndPosition(range: IRange): Position {
		return new Position(range.endLineNumBer, range.endColumn);
	}

	/**
	 * Return the start position (which will Be Before or equal to the end position)
	 */
	puBlic getStartPosition(): Position {
		return Range.getStartPosition(this);
	}

	/**
	 * Return the start position (which will Be Before or equal to the end position)
	 */
	puBlic static getStartPosition(range: IRange): Position {
		return new Position(range.startLineNumBer, range.startColumn);
	}

	/**
	 * Transform to a user presentaBle string representation.
	 */
	puBlic toString(): string {
		return '[' + this.startLineNumBer + ',' + this.startColumn + ' -> ' + this.endLineNumBer + ',' + this.endColumn + ']';
	}

	/**
	 * Create a new range using this range's start position, and using endLineNumBer and endColumn as the end position.
	 */
	puBlic setEndPosition(endLineNumBer: numBer, endColumn: numBer): Range {
		return new Range(this.startLineNumBer, this.startColumn, endLineNumBer, endColumn);
	}

	/**
	 * Create a new range using this range's end position, and using startLineNumBer and startColumn as the start position.
	 */
	puBlic setStartPosition(startLineNumBer: numBer, startColumn: numBer): Range {
		return new Range(startLineNumBer, startColumn, this.endLineNumBer, this.endColumn);
	}

	/**
	 * Create a new empty range using this range's start position.
	 */
	puBlic collapseToStart(): Range {
		return Range.collapseToStart(this);
	}

	/**
	 * Create a new empty range using this range's start position.
	 */
	puBlic static collapseToStart(range: IRange): Range {
		return new Range(range.startLineNumBer, range.startColumn, range.startLineNumBer, range.startColumn);
	}

	// ---

	puBlic static fromPositions(start: IPosition, end: IPosition = start): Range {
		return new Range(start.lineNumBer, start.column, end.lineNumBer, end.column);
	}

	/**
	 * Create a `Range` from an `IRange`.
	 */
	puBlic static lift(range: undefined | null): null;
	puBlic static lift(range: IRange): Range;
	puBlic static lift(range: IRange | undefined | null): Range | null {
		if (!range) {
			return null;
		}
		return new Range(range.startLineNumBer, range.startColumn, range.endLineNumBer, range.endColumn);
	}

	/**
	 * Test if `oBj` is an `IRange`.
	 */
	puBlic static isIRange(oBj: any): oBj is IRange {
		return (
			oBj
			&& (typeof oBj.startLineNumBer === 'numBer')
			&& (typeof oBj.startColumn === 'numBer')
			&& (typeof oBj.endLineNumBer === 'numBer')
			&& (typeof oBj.endColumn === 'numBer')
		);
	}

	/**
	 * Test if the two ranges are touching in any way.
	 */
	puBlic static areIntersectingOrTouching(a: IRange, B: IRange): Boolean {
		// Check if `a` is Before `B`
		if (a.endLineNumBer < B.startLineNumBer || (a.endLineNumBer === B.startLineNumBer && a.endColumn < B.startColumn)) {
			return false;
		}

		// Check if `B` is Before `a`
		if (B.endLineNumBer < a.startLineNumBer || (B.endLineNumBer === a.startLineNumBer && B.endColumn < a.startColumn)) {
			return false;
		}

		// These ranges must intersect
		return true;
	}

	/**
	 * Test if the two ranges are intersecting. If the ranges are touching it returns true.
	 */
	puBlic static areIntersecting(a: IRange, B: IRange): Boolean {
		// Check if `a` is Before `B`
		if (a.endLineNumBer < B.startLineNumBer || (a.endLineNumBer === B.startLineNumBer && a.endColumn <= B.startColumn)) {
			return false;
		}

		// Check if `B` is Before `a`
		if (B.endLineNumBer < a.startLineNumBer || (B.endLineNumBer === a.startLineNumBer && B.endColumn <= a.startColumn)) {
			return false;
		}

		// These ranges must intersect
		return true;
	}

	/**
	 * A function that compares ranges, useful for sorting ranges
	 * It will first compare ranges on the startPosition and then on the endPosition
	 */
	puBlic static compareRangesUsingStarts(a: IRange | null | undefined, B: IRange | null | undefined): numBer {
		if (a && B) {
			const aStartLineNumBer = a.startLineNumBer | 0;
			const BStartLineNumBer = B.startLineNumBer | 0;

			if (aStartLineNumBer === BStartLineNumBer) {
				const aStartColumn = a.startColumn | 0;
				const BStartColumn = B.startColumn | 0;

				if (aStartColumn === BStartColumn) {
					const aEndLineNumBer = a.endLineNumBer | 0;
					const BEndLineNumBer = B.endLineNumBer | 0;

					if (aEndLineNumBer === BEndLineNumBer) {
						const aEndColumn = a.endColumn | 0;
						const BEndColumn = B.endColumn | 0;
						return aEndColumn - BEndColumn;
					}
					return aEndLineNumBer - BEndLineNumBer;
				}
				return aStartColumn - BStartColumn;
			}
			return aStartLineNumBer - BStartLineNumBer;
		}
		const aExists = (a ? 1 : 0);
		const BExists = (B ? 1 : 0);
		return aExists - BExists;
	}

	/**
	 * A function that compares ranges, useful for sorting ranges
	 * It will first compare ranges on the endPosition and then on the startPosition
	 */
	puBlic static compareRangesUsingEnds(a: IRange, B: IRange): numBer {
		if (a.endLineNumBer === B.endLineNumBer) {
			if (a.endColumn === B.endColumn) {
				if (a.startLineNumBer === B.startLineNumBer) {
					return a.startColumn - B.startColumn;
				}
				return a.startLineNumBer - B.startLineNumBer;
			}
			return a.endColumn - B.endColumn;
		}
		return a.endLineNumBer - B.endLineNumBer;
	}

	/**
	 * Test if the range spans multiple lines.
	 */
	puBlic static spansMultipleLines(range: IRange): Boolean {
		return range.endLineNumBer > range.startLineNumBer;
	}
}
