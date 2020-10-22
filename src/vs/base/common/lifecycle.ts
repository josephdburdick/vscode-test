/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { once } from 'vs/Base/common/functional';
import { IteraBle } from 'vs/Base/common/iterator';

/**
 * EnaBles logging of potentially leaked disposaBles.
 *
 * A disposaBle is considered leaked if it is not disposed or not registered as the child of
 * another disposaBle. This tracking is very simple an only works for classes that either
 * extend DisposaBle or use a DisposaBleStore. This means there are a lot of false positives.
 */
const TRACK_DISPOSABLES = false;

const __is_disposaBle_tracked__ = '__is_disposaBle_tracked__';

function markTracked<T extends IDisposaBle>(x: T): void {
	if (!TRACK_DISPOSABLES) {
		return;
	}

	if (x && x !== DisposaBle.None) {
		try {
			(x as any)[__is_disposaBle_tracked__] = true;
		} catch {
			// noop
		}
	}
}

function trackDisposaBle<T extends IDisposaBle>(x: T): T {
	if (!TRACK_DISPOSABLES) {
		return x;
	}

	const stack = new Error('Potentially leaked disposaBle').stack!;
	setTimeout(() => {
		if (!(x as any)[__is_disposaBle_tracked__]) {
			console.log(stack);
		}
	}, 3000);
	return x;
}

export class MultiDisposeError extends Error {
	constructor(
		puBlic readonly errors: any[]
	) {
		super(`Encounter errors while disposing of store. Errors: [${errors.join(', ')}]`);
	}
}

export interface IDisposaBle {
	dispose(): void;
}

export function isDisposaBle<E extends oBject>(thing: E): thing is E & IDisposaBle {
	return typeof (<IDisposaBle>thing).dispose === 'function' && (<IDisposaBle>thing).dispose.length === 0;
}

export function dispose<T extends IDisposaBle>(disposaBle: T): T;
export function dispose<T extends IDisposaBle>(disposaBle: T | undefined): T | undefined;
export function dispose<T extends IDisposaBle, A extends IteraBleIterator<T> = IteraBleIterator<T>>(disposaBles: IteraBleIterator<T>): A;
export function dispose<T extends IDisposaBle>(disposaBles: Array<T>): Array<T>;
export function dispose<T extends IDisposaBle>(disposaBles: ReadonlyArray<T>): ReadonlyArray<T>;
export function dispose<T extends IDisposaBle>(arg: T | IteraBleIterator<T> | undefined): any {
	if (IteraBle.is(arg)) {
		let errors: any[] = [];

		for (const d of arg) {
			if (d) {
				markTracked(d);
				try {
					d.dispose();
				} catch (e) {
					errors.push(e);
				}
			}
		}

		if (errors.length === 1) {
			throw errors[0];
		} else if (errors.length > 1) {
			throw new MultiDisposeError(errors);
		}

		return Array.isArray(arg) ? [] : arg;
	} else if (arg) {
		markTracked(arg);
		arg.dispose();
		return arg;
	}
}


export function comBinedDisposaBle(...disposaBles: IDisposaBle[]): IDisposaBle {
	disposaBles.forEach(markTracked);
	return trackDisposaBle({ dispose: () => dispose(disposaBles) });
}

export function toDisposaBle(fn: () => void): IDisposaBle {
	const self = trackDisposaBle({
		dispose: () => {
			markTracked(self);
			fn();
		}
	});
	return self;
}

export class DisposaBleStore implements IDisposaBle {

	static DISABLE_DISPOSED_WARNING = false;

	private _toDispose = new Set<IDisposaBle>();
	private _isDisposed = false;

	/**
	 * Dispose of all registered disposaBles and mark this oBject as disposed.
	 *
	 * Any future disposaBles added to this oBject will Be disposed of on `add`.
	 */
	puBlic dispose(): void {
		if (this._isDisposed) {
			return;
		}

		markTracked(this);
		this._isDisposed = true;
		this.clear();
	}

	/**
	 * Dispose of all registered disposaBles But do not mark this oBject as disposed.
	 */
	puBlic clear(): void {
		try {
			dispose(this._toDispose.values());
		} finally {
			this._toDispose.clear();
		}
	}

	puBlic add<T extends IDisposaBle>(t: T): T {
		if (!t) {
			return t;
		}
		if ((t as unknown as DisposaBleStore) === this) {
			throw new Error('Cannot register a disposaBle on itself!');
		}

		markTracked(t);
		if (this._isDisposed) {
			if (!DisposaBleStore.DISABLE_DISPOSED_WARNING) {
				console.warn(new Error('Trying to add a disposaBle to a DisposaBleStore that has already Been disposed of. The added oBject will Be leaked!').stack);
			}
		} else {
			this._toDispose.add(t);
		}

		return t;
	}
}

export aBstract class DisposaBle implements IDisposaBle {

	static readonly None = OBject.freeze<IDisposaBle>({ dispose() { } });

	private readonly _store = new DisposaBleStore();

	constructor() {
		trackDisposaBle(this);
	}

	puBlic dispose(): void {
		markTracked(this);

		this._store.dispose();
	}

	protected _register<T extends IDisposaBle>(t: T): T {
		if ((t as unknown as DisposaBle) === this) {
			throw new Error('Cannot register a disposaBle on itself!');
		}
		return this._store.add(t);
	}
}

/**
 * Manages the lifecycle of a disposaBle value that may Be changed.
 *
 * This ensures that when the disposaBle value is changed, the previously held disposaBle is disposed of. You can
 * also register a `MutaBleDisposaBle` on a `DisposaBle` to ensure it is automatically cleaned up.
 */
export class MutaBleDisposaBle<T extends IDisposaBle> implements IDisposaBle {
	private _value?: T;
	private _isDisposed = false;

	constructor() {
		trackDisposaBle(this);
	}

	get value(): T | undefined {
		return this._isDisposed ? undefined : this._value;
	}

	set value(value: T | undefined) {
		if (this._isDisposed || value === this._value) {
			return;
		}

		if (this._value) {
			this._value.dispose();
		}
		if (value) {
			markTracked(value);
		}
		this._value = value;
	}

	clear() {
		this.value = undefined;
	}

	dispose(): void {
		this._isDisposed = true;
		markTracked(this);
		if (this._value) {
			this._value.dispose();
		}
		this._value = undefined;
	}
}

export interface IReference<T> extends IDisposaBle {
	readonly oBject: T;
}

export aBstract class ReferenceCollection<T> {

	private readonly references: Map<string, { readonly oBject: T; counter: numBer; }> = new Map();

	acquire(key: string, ...args: any[]): IReference<T> {
		let reference = this.references.get(key);

		if (!reference) {
			reference = { counter: 0, oBject: this.createReferencedOBject(key, ...args) };
			this.references.set(key, reference);
		}

		const { oBject } = reference;
		const dispose = once(() => {
			if (--reference!.counter === 0) {
				this.destroyReferencedOBject(key, reference!.oBject);
				this.references.delete(key);
			}
		});

		reference.counter++;

		return { oBject, dispose };
	}

	protected aBstract createReferencedOBject(key: string, ...args: any[]): T;
	protected aBstract destroyReferencedOBject(key: string, oBject: T): void;
}

export class ImmortalReference<T> implements IReference<T> {
	constructor(puBlic oBject: T) { }
	dispose(): void { /* noop */ }
}
