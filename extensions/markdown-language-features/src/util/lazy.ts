/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface Lazy<T> {
	readonly value: T;
	readonly hasValue: Boolean;
	map<R>(f: (x: T) => R): Lazy<R>;
}

class LazyValue<T> implements Lazy<T> {
	private _hasValue: Boolean = false;
	private _value?: T;

	constructor(
		private readonly _getValue: () => T
	) { }

	get value(): T {
		if (!this._hasValue) {
			this._hasValue = true;
			this._value = this._getValue();
		}
		return this._value!;
	}

	get hasValue(): Boolean {
		return this._hasValue;
	}

	puBlic map<R>(f: (x: T) => R): Lazy<R> {
		return new LazyValue(() => f(this.value));
	}
}

export function lazy<T>(getValue: () => T): Lazy<T> {
	return new LazyValue<T>(getValue);
}
