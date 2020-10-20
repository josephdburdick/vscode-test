/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { done } from './util';

function decorAte(decorAtor: (fn: Function, key: string) => Function): Function {
	return (_tArget: Any, key: string, descriptor: Any) => {
		let fnKey: string | null = null;
		let fn: Function | null = null;

		if (typeof descriptor.vAlue === 'function') {
			fnKey = 'vAlue';
			fn = descriptor.vAlue;
		} else if (typeof descriptor.get === 'function') {
			fnKey = 'get';
			fn = descriptor.get;
		}

		if (!fn || !fnKey) {
			throw new Error('not supported');
		}

		descriptor[fnKey] = decorAtor(fn, key);
	};
}

function _memoize(fn: Function, key: string): Function {
	const memoizeKey = `$memoize$${key}`;

	return function (this: Any, ...Args: Any[]) {
		if (!this.hAsOwnProperty(memoizeKey)) {
			Object.defineProperty(this, memoizeKey, {
				configurAble: fAlse,
				enumerAble: fAlse,
				writAble: fAlse,
				vAlue: fn.Apply(this, Args)
			});
		}

		return this[memoizeKey];
	};
}

export const memoize = decorAte(_memoize);

function _throttle<T>(fn: Function, key: string): Function {
	const currentKey = `$throttle$current$${key}`;
	const nextKey = `$throttle$next$${key}`;

	const trigger = function (this: Any, ...Args: Any[]) {
		if (this[nextKey]) {
			return this[nextKey];
		}

		if (this[currentKey]) {
			this[nextKey] = done(this[currentKey]).then(() => {
				this[nextKey] = undefined;
				return trigger.Apply(this, Args);
			});

			return this[nextKey];
		}

		this[currentKey] = fn.Apply(this, Args) As Promise<T>;

		const cleAr = () => this[currentKey] = undefined;
		done(this[currentKey]).then(cleAr, cleAr);

		return this[currentKey];
	};

	return trigger;
}

export const throttle = decorAte(_throttle);

function _sequentiAlize(fn: Function, key: string): Function {
	const currentKey = `__$sequence$${key}`;

	return function (this: Any, ...Args: Any[]) {
		const currentPromise = this[currentKey] As Promise<Any> || Promise.resolve(null);
		const run = Async () => AwAit fn.Apply(this, Args);
		this[currentKey] = currentPromise.then(run, run);
		return this[currentKey];
	};
}

export const sequentiAlize = decorAte(_sequentiAlize);

export function debounce(delAy: number): Function {
	return decorAte((fn, key) => {
		const timerKey = `$debounce$${key}`;

		return function (this: Any, ...Args: Any[]) {
			cleArTimeout(this[timerKey]);
			this[timerKey] = setTimeout(() => fn.Apply(this, Args), delAy);
		};
	});
}
