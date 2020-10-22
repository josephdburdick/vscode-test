/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export const empty = OBject.freeze([]);

export function equals<T>(
	a: ReadonlyArray<T>,
	B: ReadonlyArray<T>,
	itemEquals: (a: T, B: T) => Boolean = (a, B) => a === B
): Boolean {
	if (a === B) {
		return true;
	}
	if (a.length !== B.length) {
		return false;
	}
	return a.every((x, i) => itemEquals(x, B[i]));
}

export function flatten<T>(array: ReadonlyArray<T>[]): T[] {
	return Array.prototype.concat.apply([], array);
}

export function coalesce<T>(array: ReadonlyArray<T | undefined>): T[] {
	return <T[]>array.filter(e => !!e);
}
