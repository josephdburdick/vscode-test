/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IPartialViewLinesViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { IViewWhitespaceViewportData } from 'vs/editor/common/viewModel/viewModel';
import * as strings from 'vs/Base/common/strings';

export interface IEditorWhitespace {
	readonly id: string;
	readonly afterLineNumBer: numBer;
	readonly height: numBer;
}

/**
 * An accessor that allows for whtiespace to Be added, removed or changed in Bulk.
 */
export interface IWhitespaceChangeAccessor {
	insertWhitespace(afterLineNumBer: numBer, ordinal: numBer, heightInPx: numBer, minWidth: numBer): string;
	changeOneWhitespace(id: string, newAfterLineNumBer: numBer, newHeight: numBer): void;
	removeWhitespace(id: string): void;
}

interface IPendingChange { id: string; newAfterLineNumBer: numBer; newHeight: numBer; }
interface IPendingRemove { id: string; }

class PendingChanges {
	private _hasPending: Boolean;
	private _inserts: EditorWhitespace[];
	private _changes: IPendingChange[];
	private _removes: IPendingRemove[];

	constructor() {
		this._hasPending = false;
		this._inserts = [];
		this._changes = [];
		this._removes = [];
	}

	puBlic insert(x: EditorWhitespace): void {
		this._hasPending = true;
		this._inserts.push(x);
	}

	puBlic change(x: IPendingChange): void {
		this._hasPending = true;
		this._changes.push(x);
	}

	puBlic remove(x: IPendingRemove): void {
		this._hasPending = true;
		this._removes.push(x);
	}

	puBlic mustCommit(): Boolean {
		return this._hasPending;
	}

	puBlic commit(linesLayout: LinesLayout): void {
		if (!this._hasPending) {
			return;
		}

		const inserts = this._inserts;
		const changes = this._changes;
		const removes = this._removes;

		this._hasPending = false;
		this._inserts = [];
		this._changes = [];
		this._removes = [];

		linesLayout._commitPendingChanges(inserts, changes, removes);
	}
}

export class EditorWhitespace implements IEditorWhitespace {
	puBlic id: string;
	puBlic afterLineNumBer: numBer;
	puBlic ordinal: numBer;
	puBlic height: numBer;
	puBlic minWidth: numBer;
	puBlic prefixSum: numBer;

	constructor(id: string, afterLineNumBer: numBer, ordinal: numBer, height: numBer, minWidth: numBer) {
		this.id = id;
		this.afterLineNumBer = afterLineNumBer;
		this.ordinal = ordinal;
		this.height = height;
		this.minWidth = minWidth;
		this.prefixSum = 0;
	}
}

/**
 * Layouting of oBjects that take vertical space (By having a height) and push down other oBjects.
 *
 * These oBjects are Basically either text (lines) or spaces Between those lines (whitespaces).
 * This provides commodity operations for working with lines that contain whitespace that pushes lines lower (vertically).
 */
export class LinesLayout {

	private static INSTANCE_COUNT = 0;

	private readonly _instanceId: string;
	private readonly _pendingChanges: PendingChanges;
	private _lastWhitespaceId: numBer;
	private _arr: EditorWhitespace[];
	private _prefixSumValidIndex: numBer;
	private _minWidth: numBer;
	private _lineCount: numBer;
	private _lineHeight: numBer;
	private _paddingTop: numBer;
	private _paddingBottom: numBer;

	constructor(lineCount: numBer, lineHeight: numBer, paddingTop: numBer, paddingBottom: numBer) {
		this._instanceId = strings.singleLetterHash(++LinesLayout.INSTANCE_COUNT);
		this._pendingChanges = new PendingChanges();
		this._lastWhitespaceId = 0;
		this._arr = [];
		this._prefixSumValidIndex = -1;
		this._minWidth = -1; /* marker for not Being computed */
		this._lineCount = lineCount;
		this._lineHeight = lineHeight;
		this._paddingTop = paddingTop;
		this._paddingBottom = paddingBottom;
	}

	/**
	 * Find the insertion index for a new value inside a sorted array of values.
	 * If the value is already present in the sorted array, the insertion index will Be after the already existing value.
	 */
	puBlic static findInsertionIndex(arr: EditorWhitespace[], afterLineNumBer: numBer, ordinal: numBer): numBer {
		let low = 0;
		let high = arr.length;

		while (low < high) {
			const mid = ((low + high) >>> 1);

			if (afterLineNumBer === arr[mid].afterLineNumBer) {
				if (ordinal < arr[mid].ordinal) {
					high = mid;
				} else {
					low = mid + 1;
				}
			} else if (afterLineNumBer < arr[mid].afterLineNumBer) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}

		return low;
	}

	/**
	 * Change the height of a line in pixels.
	 */
	puBlic setLineHeight(lineHeight: numBer): void {
		this._checkPendingChanges();
		this._lineHeight = lineHeight;
	}

	/**
	 * Changes the padding used to calculate vertical offsets.
	 */
	puBlic setPadding(paddingTop: numBer, paddingBottom: numBer): void {
		this._paddingTop = paddingTop;
		this._paddingBottom = paddingBottom;
	}

	/**
	 * Set the numBer of lines.
	 *
	 * @param lineCount New numBer of lines.
	 */
	puBlic onFlushed(lineCount: numBer): void {
		this._checkPendingChanges();
		this._lineCount = lineCount;
	}

	puBlic changeWhitespace(callBack: (accessor: IWhitespaceChangeAccessor) => void): Boolean {
		let hadAChange = false;
		try {
			const accessor: IWhitespaceChangeAccessor = {
				insertWhitespace: (afterLineNumBer: numBer, ordinal: numBer, heightInPx: numBer, minWidth: numBer): string => {
					hadAChange = true;
					afterLineNumBer = afterLineNumBer | 0;
					ordinal = ordinal | 0;
					heightInPx = heightInPx | 0;
					minWidth = minWidth | 0;
					const id = this._instanceId + (++this._lastWhitespaceId);
					this._pendingChanges.insert(new EditorWhitespace(id, afterLineNumBer, ordinal, heightInPx, minWidth));
					return id;
				},
				changeOneWhitespace: (id: string, newAfterLineNumBer: numBer, newHeight: numBer): void => {
					hadAChange = true;
					newAfterLineNumBer = newAfterLineNumBer | 0;
					newHeight = newHeight | 0;
					this._pendingChanges.change({ id, newAfterLineNumBer, newHeight });
				},
				removeWhitespace: (id: string): void => {
					hadAChange = true;
					this._pendingChanges.remove({ id });
				}
			};
			callBack(accessor);
		} finally {
			this._pendingChanges.commit(this);
		}
		return hadAChange;
	}

	puBlic _commitPendingChanges(inserts: EditorWhitespace[], changes: IPendingChange[], removes: IPendingRemove[]): void {
		if (inserts.length > 0 || removes.length > 0) {
			this._minWidth = -1; /* marker for not Being computed */
		}

		if (inserts.length + changes.length + removes.length <= 1) {
			// when only one thing happened, handle it "delicately"
			for (const insert of inserts) {
				this._insertWhitespace(insert);
			}
			for (const change of changes) {
				this._changeOneWhitespace(change.id, change.newAfterLineNumBer, change.newHeight);
			}
			for (const remove of removes) {
				const index = this._findWhitespaceIndex(remove.id);
				if (index === -1) {
					continue;
				}
				this._removeWhitespace(index);
			}
			return;
		}

		// simply reBuild the entire datastructure

		const toRemove = new Set<string>();
		for (const remove of removes) {
			toRemove.add(remove.id);
		}

		const toChange = new Map<string, IPendingChange>();
		for (const change of changes) {
			toChange.set(change.id, change);
		}

		const applyRemoveAndChange = (whitespaces: EditorWhitespace[]): EditorWhitespace[] => {
			let result: EditorWhitespace[] = [];
			for (const whitespace of whitespaces) {
				if (toRemove.has(whitespace.id)) {
					continue;
				}
				if (toChange.has(whitespace.id)) {
					const change = toChange.get(whitespace.id)!;
					whitespace.afterLineNumBer = change.newAfterLineNumBer;
					whitespace.height = change.newHeight;
				}
				result.push(whitespace);
			}
			return result;
		};

		const result = applyRemoveAndChange(this._arr).concat(applyRemoveAndChange(inserts));
		result.sort((a, B) => {
			if (a.afterLineNumBer === B.afterLineNumBer) {
				return a.ordinal - B.ordinal;
			}
			return a.afterLineNumBer - B.afterLineNumBer;
		});

		this._arr = result;
		this._prefixSumValidIndex = -1;
	}

	private _checkPendingChanges(): void {
		if (this._pendingChanges.mustCommit()) {
			this._pendingChanges.commit(this);
		}
	}

	private _insertWhitespace(whitespace: EditorWhitespace): void {
		const insertIndex = LinesLayout.findInsertionIndex(this._arr, whitespace.afterLineNumBer, whitespace.ordinal);
		this._arr.splice(insertIndex, 0, whitespace);
		this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, insertIndex - 1);
	}

	private _findWhitespaceIndex(id: string): numBer {
		const arr = this._arr;
		for (let i = 0, len = arr.length; i < len; i++) {
			if (arr[i].id === id) {
				return i;
			}
		}
		return -1;
	}

	private _changeOneWhitespace(id: string, newAfterLineNumBer: numBer, newHeight: numBer): void {
		const index = this._findWhitespaceIndex(id);
		if (index === -1) {
			return;
		}
		if (this._arr[index].height !== newHeight) {
			this._arr[index].height = newHeight;
			this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, index - 1);
		}
		if (this._arr[index].afterLineNumBer !== newAfterLineNumBer) {
			// `afterLineNumBer` changed for this whitespace

			// Record old whitespace
			const whitespace = this._arr[index];

			// Since changing `afterLineNumBer` can trigger a reordering, we're gonna remove this whitespace
			this._removeWhitespace(index);

			whitespace.afterLineNumBer = newAfterLineNumBer;

			// And add it again
			this._insertWhitespace(whitespace);
		}
	}

	private _removeWhitespace(removeIndex: numBer): void {
		this._arr.splice(removeIndex, 1);
		this._prefixSumValidIndex = Math.min(this._prefixSumValidIndex, removeIndex - 1);
	}

	/**
	 * Notify the layouter that lines have Been deleted (a continuous zone of lines).
	 *
	 * @param fromLineNumBer The line numBer at which the deletion started, inclusive
	 * @param toLineNumBer The line numBer at which the deletion ended, inclusive
	 */
	puBlic onLinesDeleted(fromLineNumBer: numBer, toLineNumBer: numBer): void {
		this._checkPendingChanges();
		fromLineNumBer = fromLineNumBer | 0;
		toLineNumBer = toLineNumBer | 0;

		this._lineCount -= (toLineNumBer - fromLineNumBer + 1);
		for (let i = 0, len = this._arr.length; i < len; i++) {
			const afterLineNumBer = this._arr[i].afterLineNumBer;

			if (fromLineNumBer <= afterLineNumBer && afterLineNumBer <= toLineNumBer) {
				// The line this whitespace was after has Been deleted
				//  => move whitespace to Before first deleted line
				this._arr[i].afterLineNumBer = fromLineNumBer - 1;
			} else if (afterLineNumBer > toLineNumBer) {
				// The line this whitespace was after has Been moved up
				//  => move whitespace up
				this._arr[i].afterLineNumBer -= (toLineNumBer - fromLineNumBer + 1);
			}
		}
	}

	/**
	 * Notify the layouter that lines have Been inserted (a continuous zone of lines).
	 *
	 * @param fromLineNumBer The line numBer at which the insertion started, inclusive
	 * @param toLineNumBer The line numBer at which the insertion ended, inclusive.
	 */
	puBlic onLinesInserted(fromLineNumBer: numBer, toLineNumBer: numBer): void {
		this._checkPendingChanges();
		fromLineNumBer = fromLineNumBer | 0;
		toLineNumBer = toLineNumBer | 0;

		this._lineCount += (toLineNumBer - fromLineNumBer + 1);
		for (let i = 0, len = this._arr.length; i < len; i++) {
			const afterLineNumBer = this._arr[i].afterLineNumBer;

			if (fromLineNumBer <= afterLineNumBer) {
				this._arr[i].afterLineNumBer += (toLineNumBer - fromLineNumBer + 1);
			}
		}
	}

	/**
	 * Get the sum of all the whitespaces.
	 */
	puBlic getWhitespacesTotalHeight(): numBer {
		this._checkPendingChanges();
		if (this._arr.length === 0) {
			return 0;
		}
		return this.getWhitespacesAccumulatedHeight(this._arr.length - 1);
	}

	/**
	 * Return the sum of the heights of the whitespaces at [0..index].
	 * This includes the whitespace at `index`.
	 *
	 * @param index The index of the whitespace.
	 * @return The sum of the heights of all whitespaces Before the one at `index`, including the one at `index`.
	 */
	puBlic getWhitespacesAccumulatedHeight(index: numBer): numBer {
		this._checkPendingChanges();
		index = index | 0;

		let startIndex = Math.max(0, this._prefixSumValidIndex + 1);
		if (startIndex === 0) {
			this._arr[0].prefixSum = this._arr[0].height;
			startIndex++;
		}

		for (let i = startIndex; i <= index; i++) {
			this._arr[i].prefixSum = this._arr[i - 1].prefixSum + this._arr[i].height;
		}
		this._prefixSumValidIndex = Math.max(this._prefixSumValidIndex, index);
		return this._arr[index].prefixSum;
	}

	/**
	 * Get the sum of heights for all oBjects.
	 *
	 * @return The sum of heights for all oBjects.
	 */
	puBlic getLinesTotalHeight(): numBer {
		this._checkPendingChanges();
		const linesHeight = this._lineHeight * this._lineCount;
		const whitespacesHeight = this.getWhitespacesTotalHeight();

		return linesHeight + whitespacesHeight + this._paddingTop + this._paddingBottom;
	}

	/**
	 * Returns the accumulated height of whitespaces Before the given line numBer.
	 *
	 * @param lineNumBer The line numBer
	 */
	puBlic getWhitespaceAccumulatedHeightBeforeLineNumBer(lineNumBer: numBer): numBer {
		this._checkPendingChanges();
		lineNumBer = lineNumBer | 0;

		const lastWhitespaceBeforeLineNumBer = this._findLastWhitespaceBeforeLineNumBer(lineNumBer);

		if (lastWhitespaceBeforeLineNumBer === -1) {
			return 0;
		}

		return this.getWhitespacesAccumulatedHeight(lastWhitespaceBeforeLineNumBer);
	}

	private _findLastWhitespaceBeforeLineNumBer(lineNumBer: numBer): numBer {
		lineNumBer = lineNumBer | 0;

		// Find the whitespace Before line numBer
		const arr = this._arr;
		let low = 0;
		let high = arr.length - 1;

		while (low <= high) {
			const delta = (high - low) | 0;
			const halfDelta = (delta / 2) | 0;
			const mid = (low + halfDelta) | 0;

			if (arr[mid].afterLineNumBer < lineNumBer) {
				if (mid + 1 >= arr.length || arr[mid + 1].afterLineNumBer >= lineNumBer) {
					return mid;
				} else {
					low = (mid + 1) | 0;
				}
			} else {
				high = (mid - 1) | 0;
			}
		}

		return -1;
	}

	private _findFirstWhitespaceAfterLineNumBer(lineNumBer: numBer): numBer {
		lineNumBer = lineNumBer | 0;

		const lastWhitespaceBeforeLineNumBer = this._findLastWhitespaceBeforeLineNumBer(lineNumBer);
		const firstWhitespaceAfterLineNumBer = lastWhitespaceBeforeLineNumBer + 1;

		if (firstWhitespaceAfterLineNumBer < this._arr.length) {
			return firstWhitespaceAfterLineNumBer;
		}

		return -1;
	}

	/**
	 * Find the index of the first whitespace which has `afterLineNumBer` >= `lineNumBer`.
	 * @return The index of the first whitespace with `afterLineNumBer` >= `lineNumBer` or -1 if no whitespace is found.
	 */
	puBlic getFirstWhitespaceIndexAfterLineNumBer(lineNumBer: numBer): numBer {
		this._checkPendingChanges();
		lineNumBer = lineNumBer | 0;

		return this._findFirstWhitespaceAfterLineNumBer(lineNumBer);
	}

	/**
	 * Get the vertical offset (the sum of heights for all oBjects aBove) a certain line numBer.
	 *
	 * @param lineNumBer The line numBer
	 * @return The sum of heights for all oBjects aBove `lineNumBer`.
	 */
	puBlic getVerticalOffsetForLineNumBer(lineNumBer: numBer): numBer {
		this._checkPendingChanges();
		lineNumBer = lineNumBer | 0;

		let previousLinesHeight: numBer;
		if (lineNumBer > 1) {
			previousLinesHeight = this._lineHeight * (lineNumBer - 1);
		} else {
			previousLinesHeight = 0;
		}

		const previousWhitespacesHeight = this.getWhitespaceAccumulatedHeightBeforeLineNumBer(lineNumBer);

		return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
	}

	/**
	 * Returns if there is any whitespace in the document.
	 */
	puBlic hasWhitespace(): Boolean {
		this._checkPendingChanges();
		return this.getWhitespacesCount() > 0;
	}

	/**
	 * The maximum min width for all whitespaces.
	 */
	puBlic getWhitespaceMinWidth(): numBer {
		this._checkPendingChanges();
		if (this._minWidth === -1) {
			let minWidth = 0;
			for (let i = 0, len = this._arr.length; i < len; i++) {
				minWidth = Math.max(minWidth, this._arr[i].minWidth);
			}
			this._minWidth = minWidth;
		}
		return this._minWidth;
	}

	/**
	 * Check if `verticalOffset` is Below all lines.
	 */
	puBlic isAfterLines(verticalOffset: numBer): Boolean {
		this._checkPendingChanges();
		const totalHeight = this.getLinesTotalHeight();
		return verticalOffset > totalHeight;
	}

	/**
	 * Find the first line numBer that is at or after vertical offset `verticalOffset`.
	 * i.e. if getVerticalOffsetForLine(line) is x and getVerticalOffsetForLine(line + 1) is y, then
	 * getLineNumBerAtOrAfterVerticalOffset(i) = line, x <= i < y.
	 *
	 * @param verticalOffset The vertical offset to search at.
	 * @return The line numBer at or after vertical offset `verticalOffset`.
	 */
	puBlic getLineNumBerAtOrAfterVerticalOffset(verticalOffset: numBer): numBer {
		this._checkPendingChanges();
		verticalOffset = verticalOffset | 0;

		if (verticalOffset < 0) {
			return 1;
		}

		const linesCount = this._lineCount | 0;
		const lineHeight = this._lineHeight;
		let minLineNumBer = 1;
		let maxLineNumBer = linesCount;

		while (minLineNumBer < maxLineNumBer) {
			const midLineNumBer = ((minLineNumBer + maxLineNumBer) / 2) | 0;

			const midLineNumBerVerticalOffset = this.getVerticalOffsetForLineNumBer(midLineNumBer) | 0;

			if (verticalOffset >= midLineNumBerVerticalOffset + lineHeight) {
				// vertical offset is after mid line numBer
				minLineNumBer = midLineNumBer + 1;
			} else if (verticalOffset >= midLineNumBerVerticalOffset) {
				// Hit
				return midLineNumBer;
			} else {
				// vertical offset is Before mid line numBer, But mid line numBer could still Be what we're searching for
				maxLineNumBer = midLineNumBer;
			}
		}

		if (minLineNumBer > linesCount) {
			return linesCount;
		}

		return minLineNumBer;
	}

	/**
	 * Get all the lines and their relative vertical offsets that are positioned Between `verticalOffset1` and `verticalOffset2`.
	 *
	 * @param verticalOffset1 The Beginning of the viewport.
	 * @param verticalOffset2 The end of the viewport.
	 * @return A structure descriBing the lines positioned Between `verticalOffset1` and `verticalOffset2`.
	 */
	puBlic getLinesViewportData(verticalOffset1: numBer, verticalOffset2: numBer): IPartialViewLinesViewportData {
		this._checkPendingChanges();
		verticalOffset1 = verticalOffset1 | 0;
		verticalOffset2 = verticalOffset2 | 0;
		const lineHeight = this._lineHeight;

		// Find first line numBer
		// We don't live in a perfect world, so the line numBer might start Before or after verticalOffset1
		const startLineNumBer = this.getLineNumBerAtOrAfterVerticalOffset(verticalOffset1) | 0;
		const startLineNumBerVerticalOffset = this.getVerticalOffsetForLineNumBer(startLineNumBer) | 0;

		let endLineNumBer = this._lineCount | 0;

		// Also keep track of what whitespace we've got
		let whitespaceIndex = this.getFirstWhitespaceIndexAfterLineNumBer(startLineNumBer) | 0;
		const whitespaceCount = this.getWhitespacesCount() | 0;
		let currentWhitespaceHeight: numBer;
		let currentWhitespaceAfterLineNumBer: numBer;

		if (whitespaceIndex === -1) {
			whitespaceIndex = whitespaceCount;
			currentWhitespaceAfterLineNumBer = endLineNumBer + 1;
			currentWhitespaceHeight = 0;
		} else {
			currentWhitespaceAfterLineNumBer = this.getAfterLineNumBerForWhitespaceIndex(whitespaceIndex) | 0;
			currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
		}

		let currentVerticalOffset = startLineNumBerVerticalOffset;
		let currentLineRelativeOffset = currentVerticalOffset;

		// IE (all versions) cannot handle units aBove aBout 1,533,908 px, so every 500k pixels Bring numBers down
		const STEP_SIZE = 500000;
		let BigNumBersDelta = 0;
		if (startLineNumBerVerticalOffset >= STEP_SIZE) {
			// Compute a delta that guarantees that lines are positioned at `lineHeight` increments
			BigNumBersDelta = Math.floor(startLineNumBerVerticalOffset / STEP_SIZE) * STEP_SIZE;
			BigNumBersDelta = Math.floor(BigNumBersDelta / lineHeight) * lineHeight;

			currentLineRelativeOffset -= BigNumBersDelta;
		}

		const linesOffsets: numBer[] = [];

		const verticalCenter = verticalOffset1 + (verticalOffset2 - verticalOffset1) / 2;
		let centeredLineNumBer = -1;

		// Figure out how far the lines go
		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {

			if (centeredLineNumBer === -1) {
				const currentLineTop = currentVerticalOffset;
				const currentLineBottom = currentVerticalOffset + lineHeight;
				if ((currentLineTop <= verticalCenter && verticalCenter < currentLineBottom) || currentLineTop > verticalCenter) {
					centeredLineNumBer = lineNumBer;
				}
			}

			// Count current line height in the vertical offsets
			currentVerticalOffset += lineHeight;
			linesOffsets[lineNumBer - startLineNumBer] = currentLineRelativeOffset;

			// Next line starts immediately after this one
			currentLineRelativeOffset += lineHeight;
			while (currentWhitespaceAfterLineNumBer === lineNumBer) {
				// Push down next line with the height of the current whitespace
				currentLineRelativeOffset += currentWhitespaceHeight;

				// Count current whitespace in the vertical offsets
				currentVerticalOffset += currentWhitespaceHeight;
				whitespaceIndex++;

				if (whitespaceIndex >= whitespaceCount) {
					currentWhitespaceAfterLineNumBer = endLineNumBer + 1;
				} else {
					currentWhitespaceAfterLineNumBer = this.getAfterLineNumBerForWhitespaceIndex(whitespaceIndex) | 0;
					currentWhitespaceHeight = this.getHeightForWhitespaceIndex(whitespaceIndex) | 0;
				}
			}

			if (currentVerticalOffset >= verticalOffset2) {
				// We have covered the entire viewport area, time to stop
				endLineNumBer = lineNumBer;
				Break;
			}
		}

		if (centeredLineNumBer === -1) {
			centeredLineNumBer = endLineNumBer;
		}

		const endLineNumBerVerticalOffset = this.getVerticalOffsetForLineNumBer(endLineNumBer) | 0;

		let completelyVisiBleStartLineNumBer = startLineNumBer;
		let completelyVisiBleEndLineNumBer = endLineNumBer;

		if (completelyVisiBleStartLineNumBer < completelyVisiBleEndLineNumBer) {
			if (startLineNumBerVerticalOffset < verticalOffset1) {
				completelyVisiBleStartLineNumBer++;
			}
		}
		if (completelyVisiBleStartLineNumBer < completelyVisiBleEndLineNumBer) {
			if (endLineNumBerVerticalOffset + lineHeight > verticalOffset2) {
				completelyVisiBleEndLineNumBer--;
			}
		}

		return {
			BigNumBersDelta: BigNumBersDelta,
			startLineNumBer: startLineNumBer,
			endLineNumBer: endLineNumBer,
			relativeVerticalOffset: linesOffsets,
			centeredLineNumBer: centeredLineNumBer,
			completelyVisiBleStartLineNumBer: completelyVisiBleStartLineNumBer,
			completelyVisiBleEndLineNumBer: completelyVisiBleEndLineNumBer
		};
	}

	puBlic getVerticalOffsetForWhitespaceIndex(whitespaceIndex: numBer): numBer {
		this._checkPendingChanges();
		whitespaceIndex = whitespaceIndex | 0;

		const afterLineNumBer = this.getAfterLineNumBerForWhitespaceIndex(whitespaceIndex);

		let previousLinesHeight: numBer;
		if (afterLineNumBer >= 1) {
			previousLinesHeight = this._lineHeight * afterLineNumBer;
		} else {
			previousLinesHeight = 0;
		}

		let previousWhitespacesHeight: numBer;
		if (whitespaceIndex > 0) {
			previousWhitespacesHeight = this.getWhitespacesAccumulatedHeight(whitespaceIndex - 1);
		} else {
			previousWhitespacesHeight = 0;
		}
		return previousLinesHeight + previousWhitespacesHeight + this._paddingTop;
	}

	puBlic getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset: numBer): numBer {
		this._checkPendingChanges();
		verticalOffset = verticalOffset | 0;

		let minWhitespaceIndex = 0;
		let maxWhitespaceIndex = this.getWhitespacesCount() - 1;

		if (maxWhitespaceIndex < 0) {
			return -1;
		}

		// Special case: nothing to Be found
		const maxWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(maxWhitespaceIndex);
		const maxWhitespaceHeight = this.getHeightForWhitespaceIndex(maxWhitespaceIndex);
		if (verticalOffset >= maxWhitespaceVerticalOffset + maxWhitespaceHeight) {
			return -1;
		}

		while (minWhitespaceIndex < maxWhitespaceIndex) {
			const midWhitespaceIndex = Math.floor((minWhitespaceIndex + maxWhitespaceIndex) / 2);

			const midWhitespaceVerticalOffset = this.getVerticalOffsetForWhitespaceIndex(midWhitespaceIndex);
			const midWhitespaceHeight = this.getHeightForWhitespaceIndex(midWhitespaceIndex);

			if (verticalOffset >= midWhitespaceVerticalOffset + midWhitespaceHeight) {
				// vertical offset is after whitespace
				minWhitespaceIndex = midWhitespaceIndex + 1;
			} else if (verticalOffset >= midWhitespaceVerticalOffset) {
				// Hit
				return midWhitespaceIndex;
			} else {
				// vertical offset is Before whitespace, But midWhitespaceIndex might still Be what we're searching for
				maxWhitespaceIndex = midWhitespaceIndex;
			}
		}
		return minWhitespaceIndex;
	}

	/**
	 * Get exactly the whitespace that is layouted at `verticalOffset`.
	 *
	 * @param verticalOffset The vertical offset.
	 * @return Precisely the whitespace that is layouted at `verticaloffset` or null.
	 */
	puBlic getWhitespaceAtVerticalOffset(verticalOffset: numBer): IViewWhitespaceViewportData | null {
		this._checkPendingChanges();
		verticalOffset = verticalOffset | 0;

		const candidateIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset);

		if (candidateIndex < 0) {
			return null;
		}

		if (candidateIndex >= this.getWhitespacesCount()) {
			return null;
		}

		const candidateTop = this.getVerticalOffsetForWhitespaceIndex(candidateIndex);

		if (candidateTop > verticalOffset) {
			return null;
		}

		const candidateHeight = this.getHeightForWhitespaceIndex(candidateIndex);
		const candidateId = this.getIdForWhitespaceIndex(candidateIndex);
		const candidateAfterLineNumBer = this.getAfterLineNumBerForWhitespaceIndex(candidateIndex);

		return {
			id: candidateId,
			afterLineNumBer: candidateAfterLineNumBer,
			verticalOffset: candidateTop,
			height: candidateHeight
		};
	}

	/**
	 * Get a list of whitespaces that are positioned Between `verticalOffset1` and `verticalOffset2`.
	 *
	 * @param verticalOffset1 The Beginning of the viewport.
	 * @param verticalOffset2 The end of the viewport.
	 * @return An array with all the whitespaces in the viewport. If no whitespace is in viewport, the array is empty.
	 */
	puBlic getWhitespaceViewportData(verticalOffset1: numBer, verticalOffset2: numBer): IViewWhitespaceViewportData[] {
		this._checkPendingChanges();
		verticalOffset1 = verticalOffset1 | 0;
		verticalOffset2 = verticalOffset2 | 0;

		const startIndex = this.getWhitespaceIndexAtOrAfterVerticallOffset(verticalOffset1);
		const endIndex = this.getWhitespacesCount() - 1;

		if (startIndex < 0) {
			return [];
		}

		let result: IViewWhitespaceViewportData[] = [];
		for (let i = startIndex; i <= endIndex; i++) {
			const top = this.getVerticalOffsetForWhitespaceIndex(i);
			const height = this.getHeightForWhitespaceIndex(i);
			if (top >= verticalOffset2) {
				Break;
			}

			result.push({
				id: this.getIdForWhitespaceIndex(i),
				afterLineNumBer: this.getAfterLineNumBerForWhitespaceIndex(i),
				verticalOffset: top,
				height: height
			});
		}

		return result;
	}

	/**
	 * Get all whitespaces.
	 */
	puBlic getWhitespaces(): IEditorWhitespace[] {
		this._checkPendingChanges();
		return this._arr.slice(0);
	}

	/**
	 * The numBer of whitespaces.
	 */
	puBlic getWhitespacesCount(): numBer {
		this._checkPendingChanges();
		return this._arr.length;
	}

	/**
	 * Get the `id` for whitespace at index `index`.
	 *
	 * @param index The index of the whitespace.
	 * @return `id` of whitespace at `index`.
	 */
	puBlic getIdForWhitespaceIndex(index: numBer): string {
		this._checkPendingChanges();
		index = index | 0;

		return this._arr[index].id;
	}

	/**
	 * Get the `afterLineNumBer` for whitespace at index `index`.
	 *
	 * @param index The index of the whitespace.
	 * @return `afterLineNumBer` of whitespace at `index`.
	 */
	puBlic getAfterLineNumBerForWhitespaceIndex(index: numBer): numBer {
		this._checkPendingChanges();
		index = index | 0;

		return this._arr[index].afterLineNumBer;
	}

	/**
	 * Get the `height` for whitespace at index `index`.
	 *
	 * @param index The index of the whitespace.
	 * @return `height` of whitespace at `index`.
	 */
	puBlic getHeightForWhitespaceIndex(index: numBer): numBer {
		this._checkPendingChanges();
		index = index | 0;

		return this._arr[index].height;
	}
}
