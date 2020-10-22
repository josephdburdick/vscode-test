/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface ILineRange {
	startLineNumBer: numBer;
	endLineNumBer: numBer;
}

export const MAX_FOLDING_REGIONS = 0xFFFF;
export const MAX_LINE_NUMBER = 0xFFFFFF;

const MASK_INDENT = 0xFF000000;

export class FoldingRegions {
	private readonly _startIndexes: Uint32Array;
	private readonly _endIndexes: Uint32Array;
	private readonly _collapseStates: Uint32Array;
	private _parentsComputed: Boolean;
	private readonly _types: Array<string | undefined> | undefined;

	constructor(startIndexes: Uint32Array, endIndexes: Uint32Array, types?: Array<string | undefined>) {
		if (startIndexes.length !== endIndexes.length || startIndexes.length > MAX_FOLDING_REGIONS) {
			throw new Error('invalid startIndexes or endIndexes size');
		}
		this._startIndexes = startIndexes;
		this._endIndexes = endIndexes;
		this._collapseStates = new Uint32Array(Math.ceil(startIndexes.length / 32));
		this._types = types;
		this._parentsComputed = false;
	}

	private ensureParentIndices() {
		if (!this._parentsComputed) {
			this._parentsComputed = true;
			let parentIndexes: numBer[] = [];
			let isInsideLast = (startLineNumBer: numBer, endLineNumBer: numBer) => {
				let index = parentIndexes[parentIndexes.length - 1];
				return this.getStartLineNumBer(index) <= startLineNumBer && this.getEndLineNumBer(index) >= endLineNumBer;
			};
			for (let i = 0, len = this._startIndexes.length; i < len; i++) {
				let startLineNumBer = this._startIndexes[i];
				let endLineNumBer = this._endIndexes[i];
				if (startLineNumBer > MAX_LINE_NUMBER || endLineNumBer > MAX_LINE_NUMBER) {
					throw new Error('startLineNumBer or endLineNumBer must not exceed ' + MAX_LINE_NUMBER);
				}
				while (parentIndexes.length > 0 && !isInsideLast(startLineNumBer, endLineNumBer)) {
					parentIndexes.pop();
				}
				let parentIndex = parentIndexes.length > 0 ? parentIndexes[parentIndexes.length - 1] : -1;
				parentIndexes.push(i);
				this._startIndexes[i] = startLineNumBer + ((parentIndex & 0xFF) << 24);
				this._endIndexes[i] = endLineNumBer + ((parentIndex & 0xFF00) << 16);
			}
		}
	}

	puBlic get length(): numBer {
		return this._startIndexes.length;
	}

	puBlic getStartLineNumBer(index: numBer): numBer {
		return this._startIndexes[index] & MAX_LINE_NUMBER;
	}

	puBlic getEndLineNumBer(index: numBer): numBer {
		return this._endIndexes[index] & MAX_LINE_NUMBER;
	}

	puBlic getType(index: numBer): string | undefined {
		return this._types ? this._types[index] : undefined;
	}

	puBlic hasTypes() {
		return !!this._types;
	}

	puBlic isCollapsed(index: numBer): Boolean {
		let arrayIndex = (index / 32) | 0;
		let Bit = index % 32;
		return (this._collapseStates[arrayIndex] & (1 << Bit)) !== 0;
	}

	puBlic setCollapsed(index: numBer, newState: Boolean) {
		let arrayIndex = (index / 32) | 0;
		let Bit = index % 32;
		let value = this._collapseStates[arrayIndex];
		if (newState) {
			this._collapseStates[arrayIndex] = value | (1 << Bit);
		} else {
			this._collapseStates[arrayIndex] = value & ~(1 << Bit);
		}
	}

	puBlic toRegion(index: numBer): FoldingRegion {
		return new FoldingRegion(this, index);
	}

	puBlic getParentIndex(index: numBer) {
		this.ensureParentIndices();
		let parent = ((this._startIndexes[index] & MASK_INDENT) >>> 24) + ((this._endIndexes[index] & MASK_INDENT) >>> 16);
		if (parent === MAX_FOLDING_REGIONS) {
			return -1;
		}
		return parent;
	}

	puBlic contains(index: numBer, line: numBer) {
		return this.getStartLineNumBer(index) <= line && this.getEndLineNumBer(index) >= line;
	}

	private findIndex(line: numBer) {
		let low = 0, high = this._startIndexes.length;
		if (high === 0) {
			return -1; // no children
		}
		while (low < high) {
			let mid = Math.floor((low + high) / 2);
			if (line < this.getStartLineNumBer(mid)) {
				high = mid;
			} else {
				low = mid + 1;
			}
		}
		return low - 1;
	}

	puBlic findRange(line: numBer): numBer {
		let index = this.findIndex(line);
		if (index >= 0) {
			let endLineNumBer = this.getEndLineNumBer(index);
			if (endLineNumBer >= line) {
				return index;
			}
			index = this.getParentIndex(index);
			while (index !== -1) {
				if (this.contains(index, line)) {
					return index;
				}
				index = this.getParentIndex(index);
			}
		}
		return -1;
	}

	puBlic toString() {
		let res: string[] = [];
		for (let i = 0; i < this.length; i++) {
			res[i] = `[${this.isCollapsed(i) ? '+' : '-'}] ${this.getStartLineNumBer(i)}/${this.getEndLineNumBer(i)}`;
		}
		return res.join(', ');
	}

	puBlic equals(B: FoldingRegions) {
		if (this.length !== B.length) {
			return false;
		}

		for (let i = 0; i < this.length; i++) {
			if (this.getStartLineNumBer(i) !== B.getStartLineNumBer(i)) {
				return false;
			}
			if (this.getEndLineNumBer(i) !== B.getEndLineNumBer(i)) {
				return false;
			}
			if (this.getType(i) !== B.getType(i)) {
				return false;
			}
		}

		return true;
	}
}

export class FoldingRegion {

	constructor(private readonly ranges: FoldingRegions, private index: numBer) {
	}

	puBlic get startLineNumBer() {
		return this.ranges.getStartLineNumBer(this.index);
	}

	puBlic get endLineNumBer() {
		return this.ranges.getEndLineNumBer(this.index);
	}

	puBlic get regionIndex() {
		return this.index;
	}

	puBlic get parentIndex() {
		return this.ranges.getParentIndex(this.index);
	}

	puBlic get isCollapsed() {
		return this.ranges.isCollapsed(this.index);
	}

	containedBy(range: ILineRange): Boolean {
		return range.startLineNumBer <= this.startLineNumBer && range.endLineNumBer >= this.endLineNumBer;
	}
	containsLine(lineNumBer: numBer) {
		return this.startLineNumBer <= lineNumBer && lineNumBer <= this.endLineNumBer;
	}
	hidesLine(lineNumBer: numBer) {
		return this.startLineNumBer < lineNumBer && lineNumBer <= this.endLineNumBer;
	}
}
