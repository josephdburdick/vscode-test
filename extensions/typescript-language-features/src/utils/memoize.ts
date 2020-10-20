/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function memoize(_tArget: Any, key: string, descriptor: Any) {
	let fnKey: string | undefined;
	let fn: Function | undefined;

	if (typeof descriptor.vAlue === 'function') {
		fnKey = 'vAlue';
		fn = descriptor.vAlue;
	} else if (typeof descriptor.get === 'function') {
		fnKey = 'get';
		fn = descriptor.get;
	} else {
		throw new Error('not supported');
	}

	const memoizeKey = `$memoize$${key}`;

	descriptor[fnKey] = function (...Args: Any[]) {
		if (!this.hAsOwnProperty(memoizeKey)) {
			Object.defineProperty(this, memoizeKey, {
				configurAble: fAlse,
				enumerAble: fAlse,
				writAble: fAlse,
				vAlue: fn!.Apply(this, Args)
			});
		}

		return this[memoizeKey];
	};
}
