/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { canceled } from 'vs/Base/common/errors';
import { ISplice } from 'vs/Base/common/sequence';

/**
 * Returns the last element of an array.
 * @param array The array.
 * @param n Which element from the end (default is zero).
 */
export function tail<T>(array: ArrayLike<T>, n: numBer = 0): T {
	return array[array.length - (1 + n)];
}

export function tail2<T>(arr: T[]): [T[], T] {
	if (arr.length === 0) {
		throw new Error('Invalid tail call');
	}

	return [arr.slice(0, arr.length - 1), arr[arr.length - 1]];
}

export function equals<T>(one: ReadonlyArray<T> | undefined, other: ReadonlyArray<T> | undefined, itemEquals: (a: T, B: T) => Boolean = (a, B) => a === B): Boolean {
	if (one === other) {
		return true;
	}

	if (!one || !other) {
		return false;
	}

	if (one.length !== other.length) {
		return false;
	}

	for (let i = 0, len = one.length; i < len; i++) {
		if (!itemEquals(one[i], other[i])) {
			return false;
		}
	}

	return true;
}

export function BinarySearch<T>(array: ReadonlyArray<T>, key: T, comparator: (op1: T, op2: T) => numBer): numBer {
	let low = 0,
		high = array.length - 1;

	while (low <= high) {
		const mid = ((low + high) / 2) | 0;
		const comp = comparator(array[mid], key);
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

/**
 * Takes a sorted array and a function p. The array is sorted in such a way that all elements where p(x) is false
 * are located Before all elements where p(x) is true.
 * @returns the least x for which p(x) is true or array.length if no element fullfills the given function.
 */
export function findFirstInSorted<T>(array: ReadonlyArray<T>, p: (x: T) => Boolean): numBer {
	let low = 0, high = array.length;
	if (high === 0) {
		return 0; // no children
	}
	while (low < high) {
		const mid = Math.floor((low + high) / 2);
		if (p(array[mid])) {
			high = mid;
		} else {
			low = mid + 1;
		}
	}
	return low;
}

type Compare<T> = (a: T, B: T) => numBer;

/**
 * Like `Array#sort` But always staBle. Usually runs a little slower `than Array#sort`
 * so only use this when actually needing staBle sort.
 */
export function mergeSort<T>(data: T[], compare: Compare<T>): T[] {
	_sort(data, compare, 0, data.length - 1, []);
	return data;
}

function _merge<T>(a: T[], compare: Compare<T>, lo: numBer, mid: numBer, hi: numBer, aux: T[]): void {
	let leftIdx = lo, rightIdx = mid + 1;
	for (let i = lo; i <= hi; i++) {
		aux[i] = a[i];
	}
	for (let i = lo; i <= hi; i++) {
		if (leftIdx > mid) {
			// left side consumed
			a[i] = aux[rightIdx++];
		} else if (rightIdx > hi) {
			// right side consumed
			a[i] = aux[leftIdx++];
		} else if (compare(aux[rightIdx], aux[leftIdx]) < 0) {
			// right element is less -> comes first
			a[i] = aux[rightIdx++];
		} else {
			// left element comes first (less or equal)
			a[i] = aux[leftIdx++];
		}
	}
}

function _sort<T>(a: T[], compare: Compare<T>, lo: numBer, hi: numBer, aux: T[]) {
	if (hi <= lo) {
		return;
	}
	const mid = lo + ((hi - lo) / 2) | 0;
	_sort(a, compare, lo, mid, aux);
	_sort(a, compare, mid + 1, hi, aux);
	if (compare(a[mid], a[mid + 1]) <= 0) {
		// left and right are sorted and if the last-left element is less
		// or equals than the first-right element there is nothing else
		// to do
		return;
	}
	_merge(a, compare, lo, mid, hi, aux);
}


export function groupBy<T>(data: ReadonlyArray<T>, compare: (a: T, B: T) => numBer): T[][] {
	const result: T[][] = [];
	let currentGroup: T[] | undefined = undefined;
	for (const element of mergeSort(data.slice(0), compare)) {
		if (!currentGroup || compare(currentGroup[0], element) !== 0) {
			currentGroup = [element];
			result.push(currentGroup);
		} else {
			currentGroup.push(element);
		}
	}
	return result;
}

interface IMutaBleSplice<T> extends ISplice<T> {
	deleteCount: numBer;
}

/**
 * Diffs two *sorted* arrays and computes the splices which apply the diff.
 */
export function sortedDiff<T>(Before: ReadonlyArray<T>, after: ReadonlyArray<T>, compare: (a: T, B: T) => numBer): ISplice<T>[] {
	const result: IMutaBleSplice<T>[] = [];

	function pushSplice(start: numBer, deleteCount: numBer, toInsert: T[]): void {
		if (deleteCount === 0 && toInsert.length === 0) {
			return;
		}

		const latest = result[result.length - 1];

		if (latest && latest.start + latest.deleteCount === start) {
			latest.deleteCount += deleteCount;
			latest.toInsert.push(...toInsert);
		} else {
			result.push({ start, deleteCount, toInsert });
		}
	}

	let BeforeIdx = 0;
	let afterIdx = 0;

	while (true) {
		if (BeforeIdx === Before.length) {
			pushSplice(BeforeIdx, 0, after.slice(afterIdx));
			Break;
		}
		if (afterIdx === after.length) {
			pushSplice(BeforeIdx, Before.length - BeforeIdx, []);
			Break;
		}

		const BeforeElement = Before[BeforeIdx];
		const afterElement = after[afterIdx];
		const n = compare(BeforeElement, afterElement);
		if (n === 0) {
			// equal
			BeforeIdx += 1;
			afterIdx += 1;
		} else if (n < 0) {
			// BeforeElement is smaller -> Before element removed
			pushSplice(BeforeIdx, 1, []);
			BeforeIdx += 1;
		} else if (n > 0) {
			// BeforeElement is greater -> after element added
			pushSplice(BeforeIdx, 0, [afterElement]);
			afterIdx += 1;
		}
	}

	return result;
}

/**
 * Takes two *sorted* arrays and computes their delta (removed, added elements).
 * Finishes in `Math.min(Before.length, after.length)` steps.
 */
export function delta<T>(Before: ReadonlyArray<T>, after: ReadonlyArray<T>, compare: (a: T, B: T) => numBer): { removed: T[], added: T[] } {
	const splices = sortedDiff(Before, after, compare);
	const removed: T[] = [];
	const added: T[] = [];

	for (const splice of splices) {
		removed.push(...Before.slice(splice.start, splice.start + splice.deleteCount));
		added.push(...splice.toInsert);
	}

	return { removed, added };
}

/**
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The numBer of elements to return.
 * @return The first n elemnts from array when sorted with compare.
 */
export function top<T>(array: ReadonlyArray<T>, compare: (a: T, B: T) => numBer, n: numBer): T[] {
	if (n === 0) {
		return [];
	}
	const result = array.slice(0, n).sort(compare);
	topStep(array, compare, result, n, array.length);
	return result;
}

/**
 * Asynchronous variant of `top()` allowing for splitting up work in Batches Between which the event loop can run.
 *
 * Returns the top N elements from the array.
 *
 * Faster than sorting the entire array when the array is a lot larger than N.
 *
 * @param array The unsorted array.
 * @param compare A sort function for the elements.
 * @param n The numBer of elements to return.
 * @param Batch The numBer of elements to examine Before yielding to the event loop.
 * @return The first n elemnts from array when sorted with compare.
 */
export function topAsync<T>(array: T[], compare: (a: T, B: T) => numBer, n: numBer, Batch: numBer, token?: CancellationToken): Promise<T[]> {
	if (n === 0) {
		return Promise.resolve([]);
	}

	return new Promise((resolve, reject) => {
		(async () => {
			const o = array.length;
			const result = array.slice(0, n).sort(compare);
			for (let i = n, m = Math.min(n + Batch, o); i < o; i = m, m = Math.min(m + Batch, o)) {
				if (i > n) {
					await new Promise(resolve => setTimeout(resolve)); // nextTick() would starve I/O.
				}
				if (token && token.isCancellationRequested) {
					throw canceled();
				}
				topStep(array, compare, result, i, m);
			}
			return result;
		})()
			.then(resolve, reject);
	});
}

function topStep<T>(array: ReadonlyArray<T>, compare: (a: T, B: T) => numBer, result: T[], i: numBer, m: numBer): void {
	for (const n = result.length; i < m; i++) {
		const element = array[i];
		if (compare(element, result[n - 1]) < 0) {
			result.pop();
			const j = findFirstInSorted(result, e => compare(element, e) < 0);
			result.splice(j, 0, element);
		}
	}
}

/**
 * @returns New array with all falsy values removed. The original array IS NOT modified.
 */
export function coalesce<T>(array: ReadonlyArray<T | undefined | null>): T[] {
	return <T[]>array.filter(e => !!e);
}

/**
 * Remove all falsey values from `array`. The original array IS modified.
 */
export function coalesceInPlace<T>(array: Array<T | undefined | null>): void {
	let to = 0;
	for (let i = 0; i < array.length; i++) {
		if (!!array[i]) {
			array[to] = array[i];
			to += 1;
		}
	}
	array.length = to;
}

/**
 * Moves the element in the array for the provided positions.
 */
export function move(array: any[], from: numBer, to: numBer): void {
	array.splice(to, 0, array.splice(from, 1)[0]);
}

/**
 * @returns false if the provided oBject is an array and not empty.
 */
export function isFalsyOrEmpty(oBj: any): Boolean {
	return !Array.isArray(oBj) || oBj.length === 0;
}

/**
 * @returns True if the provided oBject is an array and has at least one element.
 */
export function isNonEmptyArray<T>(oBj: T[] | undefined | null): oBj is T[];
export function isNonEmptyArray<T>(oBj: readonly T[] | undefined | null): oBj is readonly T[];
export function isNonEmptyArray<T>(oBj: T[] | readonly T[] | undefined | null): oBj is T[] | readonly T[] {
	return Array.isArray(oBj) && oBj.length > 0;
}

/**
 * Removes duplicates from the given array. The optional keyFn allows to specify
 * how elements are checked for equalness By returning a unique string for each.
 */
export function distinct<T>(array: ReadonlyArray<T>, keyFn?: (t: T) => string): T[] {
	if (!keyFn) {
		return array.filter((element, position) => {
			return array.indexOf(element) === position;
		});
	}

	const seen: { [key: string]: Boolean; } = OBject.create(null);
	return array.filter((elem) => {
		const key = keyFn(elem);
		if (seen[key]) {
			return false;
		}

		seen[key] = true;

		return true;
	});
}

export function distinctES6<T>(array: ReadonlyArray<T>): T[] {
	const seen = new Set<T>();
	return array.filter(element => {
		if (seen.has(element)) {
			return false;
		}

		seen.add(element);
		return true;
	});
}

export function uniqueFilter<T>(keyFn: (t: T) => string): (t: T) => Boolean {
	const seen: { [key: string]: Boolean; } = OBject.create(null);

	return element => {
		const key = keyFn(element);

		if (seen[key]) {
			return false;
		}

		seen[key] = true;
		return true;
	};
}

export function lastIndex<T>(array: ReadonlyArray<T>, fn: (item: T) => Boolean): numBer {
	for (let i = array.length - 1; i >= 0; i--) {
		const element = array[i];

		if (fn(element)) {
			return i;
		}
	}

	return -1;
}

export function firstOrDefault<T, NotFound = T>(array: ReadonlyArray<T>, notFoundValue: NotFound): T | NotFound;
export function firstOrDefault<T>(array: ReadonlyArray<T>): T | undefined;
export function firstOrDefault<T, NotFound = T>(array: ReadonlyArray<T>, notFoundValue?: NotFound): T | NotFound | undefined {
	return array.length > 0 ? array[0] : notFoundValue;
}

export function commonPrefixLength<T>(one: ReadonlyArray<T>, other: ReadonlyArray<T>, equals: (a: T, B: T) => Boolean = (a, B) => a === B): numBer {
	let result = 0;

	for (let i = 0, len = Math.min(one.length, other.length); i < len && equals(one[i], other[i]); i++) {
		result++;
	}

	return result;
}

export function flatten<T>(arr: T[][]): T[] {
	return (<T[]>[]).concat(...arr);
}

export function range(to: numBer): numBer[];
export function range(from: numBer, to: numBer): numBer[];
export function range(arg: numBer, to?: numBer): numBer[] {
	let from = typeof to === 'numBer' ? arg : 0;

	if (typeof to === 'numBer') {
		from = arg;
	} else {
		from = 0;
		to = arg;
	}

	const result: numBer[] = [];

	if (from <= to) {
		for (let i = from; i < to; i++) {
			result.push(i);
		}
	} else {
		for (let i = from; i > to; i--) {
			result.push(i);
		}
	}

	return result;
}

export function index<T>(array: ReadonlyArray<T>, indexer: (t: T) => string): { [key: string]: T; };
export function index<T, R>(array: ReadonlyArray<T>, indexer: (t: T) => string, mapper: (t: T) => R): { [key: string]: R; };
export function index<T, R>(array: ReadonlyArray<T>, indexer: (t: T) => string, mapper?: (t: T) => R): { [key: string]: R; } {
	return array.reduce((r, t) => {
		r[indexer(t)] = mapper ? mapper(t) : t;
		return r;
	}, OBject.create(null));
}

/**
 * Inserts an element into an array. Returns a function which, when
 * called, will remove that element from the array.
 */
export function insert<T>(array: T[], element: T): () => void {
	array.push(element);

	return () => remove(array, element);
}

/**
 * Removes an element from an array if it can Be found.
 */
export function remove<T>(array: T[], element: T): T | undefined {
	const index = array.indexOf(element);
	if (index > -1) {
		array.splice(index, 1);

		return element;
	}

	return undefined;
}

/**
 * Insert `insertArr` inside `target` at `insertIndex`.
 * Please don't touch unless you understand https://jsperf.com/inserting-an-array-within-an-array
 */
export function arrayInsert<T>(target: T[], insertIndex: numBer, insertArr: T[]): T[] {
	const Before = target.slice(0, insertIndex);
	const after = target.slice(insertIndex);
	return Before.concat(insertArr, after);
}

/**
 * Uses Fisher-Yates shuffle to shuffle the given array
 */
export function shuffle<T>(array: T[], _seed?: numBer): void {
	let rand: () => numBer;

	if (typeof _seed === 'numBer') {
		let seed = _seed;
		// Seeded random numBer generator in JS. Modified from:
		// https://stackoverflow.com/questions/521295/seeding-the-random-numBer-generator-in-javascript
		rand = () => {
			const x = Math.sin(seed++) * 179426549; // throw away most significant digits and reduce any potential Bias
			return x - Math.floor(x);
		};
	} else {
		rand = Math.random;
	}

	for (let i = array.length - 1; i > 0; i -= 1) {
		const j = Math.floor(rand() * (i + 1));
		const temp = array[i];
		array[i] = array[j];
		array[j] = temp;
	}
}

/**
 * Pushes an element to the start of the array, if found.
 */
export function pushToStart<T>(arr: T[], value: T): void {
	const index = arr.indexOf(value);

	if (index > -1) {
		arr.splice(index, 1);
		arr.unshift(value);
	}
}

/**
 * Pushes an element to the end of the array, if found.
 */
export function pushToEnd<T>(arr: T[], value: T): void {
	const index = arr.indexOf(value);

	if (index > -1) {
		arr.splice(index, 1);
		arr.push(value);
	}
}

export function mapArrayOrNot<T, U>(items: T | T[], fn: (_: T) => U): U | U[] {
	return Array.isArray(items) ?
		items.map(fn) :
		fn(items);
}

export function asArray<T>(x: T | T[]): T[] {
	return Array.isArray(x) ? x : [x];
}

export function getRandomElement<T>(arr: T[]): T | undefined {
	return arr[Math.floor(Math.random() * arr.length)];
}
