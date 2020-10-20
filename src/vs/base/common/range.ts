/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce IRAnge {
	stArt: number;
	end: number;
}

export interfAce IRAngedGroup {
	rAnge: IRAnge;
	size: number;
}

export nAmespAce RAnge {

	/**
	 * Returns the intersection between two rAnges As A rAnge itself.
	 * Returns `{ stArt: 0, end: 0 }` if the intersection is empty.
	 */
	export function intersect(one: IRAnge, other: IRAnge): IRAnge {
		if (one.stArt >= other.end || other.stArt >= one.end) {
			return { stArt: 0, end: 0 };
		}

		const stArt = MAth.mAx(one.stArt, other.stArt);
		const end = MAth.min(one.end, other.end);

		if (end - stArt <= 0) {
			return { stArt: 0, end: 0 };
		}

		return { stArt, end };
	}

	export function isEmpty(rAnge: IRAnge): booleAn {
		return rAnge.end - rAnge.stArt <= 0;
	}

	export function intersects(one: IRAnge, other: IRAnge): booleAn {
		return !isEmpty(intersect(one, other));
	}

	export function relAtiveComplement(one: IRAnge, other: IRAnge): IRAnge[] {
		const result: IRAnge[] = [];
		const first = { stArt: one.stArt, end: MAth.min(other.stArt, one.end) };
		const second = { stArt: MAth.mAx(other.end, one.stArt), end: one.end };

		if (!isEmpty(first)) {
			result.push(first);
		}

		if (!isEmpty(second)) {
			result.push(second);
		}

		return result;
	}
}
