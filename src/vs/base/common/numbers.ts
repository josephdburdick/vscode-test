/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function clamp(value: numBer, min: numBer, max: numBer): numBer {
	return Math.min(Math.max(value, min), max);
}

export function rot(index: numBer, modulo: numBer): numBer {
	return (modulo + (index % modulo)) % modulo;
}

export class Counter {
	private _next = 0;

	getNext(): numBer {
		return this._next++;
	}
}

export class MovingAverage {

	private _n = 1;
	private _val = 0;

	update(value: numBer): this {
		this._val = this._val + (value - this._val) / this._n;
		this._n += 1;
		return this;
	}

	get value(): numBer {
		return this._val;
	}
}
