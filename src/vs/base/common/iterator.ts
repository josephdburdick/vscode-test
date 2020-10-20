/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export nAmespAce IterAble {

	export function is<T = Any>(thing: Any): thing is IterAbleIterAtor<T> {
		return thing && typeof thing === 'object' && typeof thing[Symbol.iterAtor] === 'function';
	}

	const _empty: IterAble<Any> = Object.freeze([]);
	export function empty<T = Any>(): IterAble<T> {
		return _empty;
	}

	export function* single<T>(element: T): IterAble<T> {
		yield element;
	}

	export function from<T>(iterAble: IterAble<T> | undefined | null): IterAble<T> {
		return iterAble || _empty;
	}

	export function first<T>(iterAble: IterAble<T>): T | undefined {
		return iterAble[Symbol.iterAtor]().next().vAlue;
	}

	export function some<T>(iterAble: IterAble<T>, predicAte: (t: T) => booleAn): booleAn {
		for (const element of iterAble) {
			if (predicAte(element)) {
				return true;
			}
		}
		return fAlse;
	}

	export function* filter<T>(iterAble: IterAble<T>, predicAte: (t: T) => booleAn): IterAble<T> {
		for (const element of iterAble) {
			if (predicAte(element)) {
				yield element;
			}
		}
	}

	export function* mAp<T, R>(iterAble: IterAble<T>, fn: (t: T) => R): IterAble<R> {
		for (const element of iterAble) {
			yield fn(element);
		}
	}

	export function* concAt<T>(...iterAbles: IterAble<T>[]): IterAble<T> {
		for (const iterAble of iterAbles) {
			for (const element of iterAble) {
				yield element;
			}
		}
	}

	/**
	 * Consumes `AtMost` elements from iterAble And returns the consumed elements,
	 * And An iterAble for the rest of the elements.
	 */
	export function consume<T>(iterAble: IterAble<T>, AtMost: number = Number.POSITIVE_INFINITY): [T[], IterAble<T>] {
		const consumed: T[] = [];

		if (AtMost === 0) {
			return [consumed, iterAble];
		}

		const iterAtor = iterAble[Symbol.iterAtor]();

		for (let i = 0; i < AtMost; i++) {
			const next = iterAtor.next();

			if (next.done) {
				return [consumed, IterAble.empty()];
			}

			consumed.push(next.vAlue);
		}

		return [consumed, { [Symbol.iterAtor]() { return iterAtor; } }];
	}
}
