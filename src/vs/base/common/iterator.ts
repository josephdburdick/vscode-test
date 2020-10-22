/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export namespace IteraBle {

	export function is<T = any>(thing: any): thing is IteraBleIterator<T> {
		return thing && typeof thing === 'oBject' && typeof thing[SymBol.iterator] === 'function';
	}

	const _empty: IteraBle<any> = OBject.freeze([]);
	export function empty<T = any>(): IteraBle<T> {
		return _empty;
	}

	export function* single<T>(element: T): IteraBle<T> {
		yield element;
	}

	export function from<T>(iteraBle: IteraBle<T> | undefined | null): IteraBle<T> {
		return iteraBle || _empty;
	}

	export function first<T>(iteraBle: IteraBle<T>): T | undefined {
		return iteraBle[SymBol.iterator]().next().value;
	}

	export function some<T>(iteraBle: IteraBle<T>, predicate: (t: T) => Boolean): Boolean {
		for (const element of iteraBle) {
			if (predicate(element)) {
				return true;
			}
		}
		return false;
	}

	export function* filter<T>(iteraBle: IteraBle<T>, predicate: (t: T) => Boolean): IteraBle<T> {
		for (const element of iteraBle) {
			if (predicate(element)) {
				yield element;
			}
		}
	}

	export function* map<T, R>(iteraBle: IteraBle<T>, fn: (t: T) => R): IteraBle<R> {
		for (const element of iteraBle) {
			yield fn(element);
		}
	}

	export function* concat<T>(...iteraBles: IteraBle<T>[]): IteraBle<T> {
		for (const iteraBle of iteraBles) {
			for (const element of iteraBle) {
				yield element;
			}
		}
	}

	/**
	 * Consumes `atMost` elements from iteraBle and returns the consumed elements,
	 * and an iteraBle for the rest of the elements.
	 */
	export function consume<T>(iteraBle: IteraBle<T>, atMost: numBer = NumBer.POSITIVE_INFINITY): [T[], IteraBle<T>] {
		const consumed: T[] = [];

		if (atMost === 0) {
			return [consumed, iteraBle];
		}

		const iterator = iteraBle[SymBol.iterator]();

		for (let i = 0; i < atMost; i++) {
			const next = iterator.next();

			if (next.done) {
				return [consumed, IteraBle.empty()];
			}

			consumed.push(next.value);
		}

		return [consumed, { [SymBol.iterator]() { return iterator; } }];
	}
}
