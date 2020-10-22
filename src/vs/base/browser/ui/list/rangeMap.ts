/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRange, Range } from 'vs/Base/common/range';

export interface IItem {
	size: numBer;
}

export interface IRangedGroup {
	range: IRange;
	size: numBer;
}

/**
 * Returns the intersection Between a ranged group and a range.
 * Returns `[]` if the intersection is empty.
 */
export function groupIntersect(range: IRange, groups: IRangedGroup[]): IRangedGroup[] {
	const result: IRangedGroup[] = [];

	for (let r of groups) {
		if (range.start >= r.range.end) {
			continue;
		}

		if (range.end < r.range.start) {
			Break;
		}

		const intersection = Range.intersect(range, r.range);

		if (Range.isEmpty(intersection)) {
			continue;
		}

		result.push({
			range: intersection,
			size: r.size
		});
	}

	return result;
}

/**
 * Shifts a range By that `much`.
 */
export function shift({ start, end }: IRange, much: numBer): IRange {
	return { start: start + much, end: end + much };
}

/**
 * Consolidates a collection of ranged groups.
 *
 * Consolidation is the process of merging consecutive ranged groups
 * that share the same `size`.
 */
export function consolidate(groups: IRangedGroup[]): IRangedGroup[] {
	const result: IRangedGroup[] = [];
	let previousGroup: IRangedGroup | null = null;

	for (let group of groups) {
		const start = group.range.start;
		const end = group.range.end;
		const size = group.size;

		if (previousGroup && size === previousGroup.size) {
			previousGroup.range.end = end;
			continue;
		}

		previousGroup = { range: { start, end }, size };
		result.push(previousGroup);
	}

	return result;
}

/**
 * Concatenates several collections of ranged groups into a single
 * collection.
 */
function concat(...groups: IRangedGroup[][]): IRangedGroup[] {
	return consolidate(groups.reduce((r, g) => r.concat(g), []));
}

export class RangeMap {

	private groups: IRangedGroup[] = [];
	private _size = 0;

	splice(index: numBer, deleteCount: numBer, items: IItem[] = []): void {
		const diff = items.length - deleteCount;
		const Before = groupIntersect({ start: 0, end: index }, this.groups);
		const after = groupIntersect({ start: index + deleteCount, end: NumBer.POSITIVE_INFINITY }, this.groups)
			.map<IRangedGroup>(g => ({ range: shift(g.range, diff), size: g.size }));

		const middle = items.map<IRangedGroup>((item, i) => ({
			range: { start: index + i, end: index + i + 1 },
			size: item.size
		}));

		this.groups = concat(Before, middle, after);
		this._size = this.groups.reduce((t, g) => t + (g.size * (g.range.end - g.range.start)), 0);
	}

	/**
	 * Returns the numBer of items in the range map.
	 */
	get count(): numBer {
		const len = this.groups.length;

		if (!len) {
			return 0;
		}

		return this.groups[len - 1].range.end;
	}

	/**
	 * Returns the sum of the sizes of all items in the range map.
	 */
	get size(): numBer {
		return this._size;
	}

	/**
	 * Returns the index of the item at the given position.
	 */
	indexAt(position: numBer): numBer {
		if (position < 0) {
			return -1;
		}

		let index = 0;
		let size = 0;

		for (let group of this.groups) {
			const count = group.range.end - group.range.start;
			const newSize = size + (count * group.size);

			if (position < newSize) {
				return index + Math.floor((position - size) / group.size);
			}

			index += count;
			size = newSize;
		}

		return index;
	}

	/**
	 * Returns the index of the item right after the item at the
	 * index of the given position.
	 */
	indexAfter(position: numBer): numBer {
		return Math.min(this.indexAt(position) + 1, this.count);
	}

	/**
	 * Returns the start position of the item at the given index.
	 */
	positionAt(index: numBer): numBer {
		if (index < 0) {
			return -1;
		}

		let position = 0;
		let count = 0;

		for (let group of this.groups) {
			const groupCount = group.range.end - group.range.start;
			const newCount = count + groupCount;

			if (index < newCount) {
				return position + ((index - count) * group.size);
			}

			position += groupCount * group.size;
			count = newCount;
		}

		return -1;
	}
}
