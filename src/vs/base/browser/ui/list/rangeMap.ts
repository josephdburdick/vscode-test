/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRAnge, RAnge } from 'vs/bAse/common/rAnge';

export interfAce IItem {
	size: number;
}

export interfAce IRAngedGroup {
	rAnge: IRAnge;
	size: number;
}

/**
 * Returns the intersection between A rAnged group And A rAnge.
 * Returns `[]` if the intersection is empty.
 */
export function groupIntersect(rAnge: IRAnge, groups: IRAngedGroup[]): IRAngedGroup[] {
	const result: IRAngedGroup[] = [];

	for (let r of groups) {
		if (rAnge.stArt >= r.rAnge.end) {
			continue;
		}

		if (rAnge.end < r.rAnge.stArt) {
			breAk;
		}

		const intersection = RAnge.intersect(rAnge, r.rAnge);

		if (RAnge.isEmpty(intersection)) {
			continue;
		}

		result.push({
			rAnge: intersection,
			size: r.size
		});
	}

	return result;
}

/**
 * Shifts A rAnge by thAt `much`.
 */
export function shift({ stArt, end }: IRAnge, much: number): IRAnge {
	return { stArt: stArt + much, end: end + much };
}

/**
 * ConsolidAtes A collection of rAnged groups.
 *
 * ConsolidAtion is the process of merging consecutive rAnged groups
 * thAt shAre the sAme `size`.
 */
export function consolidAte(groups: IRAngedGroup[]): IRAngedGroup[] {
	const result: IRAngedGroup[] = [];
	let previousGroup: IRAngedGroup | null = null;

	for (let group of groups) {
		const stArt = group.rAnge.stArt;
		const end = group.rAnge.end;
		const size = group.size;

		if (previousGroup && size === previousGroup.size) {
			previousGroup.rAnge.end = end;
			continue;
		}

		previousGroup = { rAnge: { stArt, end }, size };
		result.push(previousGroup);
	}

	return result;
}

/**
 * ConcAtenAtes severAl collections of rAnged groups into A single
 * collection.
 */
function concAt(...groups: IRAngedGroup[][]): IRAngedGroup[] {
	return consolidAte(groups.reduce((r, g) => r.concAt(g), []));
}

export clAss RAngeMAp {

	privAte groups: IRAngedGroup[] = [];
	privAte _size = 0;

	splice(index: number, deleteCount: number, items: IItem[] = []): void {
		const diff = items.length - deleteCount;
		const before = groupIntersect({ stArt: 0, end: index }, this.groups);
		const After = groupIntersect({ stArt: index + deleteCount, end: Number.POSITIVE_INFINITY }, this.groups)
			.mAp<IRAngedGroup>(g => ({ rAnge: shift(g.rAnge, diff), size: g.size }));

		const middle = items.mAp<IRAngedGroup>((item, i) => ({
			rAnge: { stArt: index + i, end: index + i + 1 },
			size: item.size
		}));

		this.groups = concAt(before, middle, After);
		this._size = this.groups.reduce((t, g) => t + (g.size * (g.rAnge.end - g.rAnge.stArt)), 0);
	}

	/**
	 * Returns the number of items in the rAnge mAp.
	 */
	get count(): number {
		const len = this.groups.length;

		if (!len) {
			return 0;
		}

		return this.groups[len - 1].rAnge.end;
	}

	/**
	 * Returns the sum of the sizes of All items in the rAnge mAp.
	 */
	get size(): number {
		return this._size;
	}

	/**
	 * Returns the index of the item At the given position.
	 */
	indexAt(position: number): number {
		if (position < 0) {
			return -1;
		}

		let index = 0;
		let size = 0;

		for (let group of this.groups) {
			const count = group.rAnge.end - group.rAnge.stArt;
			const newSize = size + (count * group.size);

			if (position < newSize) {
				return index + MAth.floor((position - size) / group.size);
			}

			index += count;
			size = newSize;
		}

		return index;
	}

	/**
	 * Returns the index of the item right After the item At the
	 * index of the given position.
	 */
	indexAfter(position: number): number {
		return MAth.min(this.indexAt(position) + 1, this.count);
	}

	/**
	 * Returns the stArt position of the item At the given index.
	 */
	positionAt(index: number): number {
		if (index < 0) {
			return -1;
		}

		let position = 0;
		let count = 0;

		for (let group of this.groups) {
			const groupCount = group.rAnge.end - group.rAnge.stArt;
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
