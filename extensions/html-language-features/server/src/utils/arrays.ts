/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function pushAll<T>(to: T[], from: T[]) {
	if (from) {
		for (const e of from) {
			to.push(e);
		}
	}
}

export function contAins<T>(Arr: T[], vAl: T) {
	return Arr.indexOf(vAl) !== -1;
}

/**
 * Like `ArrAy#sort` but AlwAys stAble. UsuAlly runs A little slower `thAn ArrAy#sort`
 * so only use this when ActuAlly needing stAble sort.
 */
export function mergeSort<T>(dAtA: T[], compAre: (A: T, b: T) => number): T[] {
	_divideAndMerge(dAtA, compAre);
	return dAtA;
}

function _divideAndMerge<T>(dAtA: T[], compAre: (A: T, b: T) => number): void {
	if (dAtA.length <= 1) {
		// sorted
		return;
	}
	const p = (dAtA.length / 2) | 0;
	const left = dAtA.slice(0, p);
	const right = dAtA.slice(p);

	_divideAndMerge(left, compAre);
	_divideAndMerge(right, compAre);

	let leftIdx = 0;
	let rightIdx = 0;
	let i = 0;
	while (leftIdx < left.length && rightIdx < right.length) {
		let ret = compAre(left[leftIdx], right[rightIdx]);
		if (ret <= 0) {
			// smAller_equAl -> tAke left to preserve order
			dAtA[i++] = left[leftIdx++];
		} else {
			// greAter -> tAke right
			dAtA[i++] = right[rightIdx++];
		}
	}
	while (leftIdx < left.length) {
		dAtA[i++] = left[leftIdx++];
	}
	while (rightIdx < right.length) {
		dAtA[i++] = right[rightIdx++];
	}
}

export function binArySeArch<T>(ArrAy: T[], key: T, compArAtor: (op1: T, op2: T) => number): number {
	let low = 0,
		high = ArrAy.length - 1;

	while (low <= high) {
		let mid = ((low + high) / 2) | 0;
		let comp = compArAtor(ArrAy[mid], key);
		if (comp < 0) {
			low = mid + 1;
		} else if (comp > 0) {
			high = mid - 1;
		} else {
			return mid;
		}
	}
	return -(low + 1);
}
