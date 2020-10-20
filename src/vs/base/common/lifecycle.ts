/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { once } from 'vs/bAse/common/functionAl';
import { IterAble } from 'vs/bAse/common/iterAtor';

/**
 * EnAbles logging of potentiAlly leAked disposAbles.
 *
 * A disposAble is considered leAked if it is not disposed or not registered As the child of
 * Another disposAble. This trAcking is very simple An only works for clAsses thAt either
 * extend DisposAble or use A DisposAbleStore. This meAns there Are A lot of fAlse positives.
 */
const TRACK_DISPOSABLES = fAlse;

const __is_disposAble_trAcked__ = '__is_disposAble_trAcked__';

function mArkTrAcked<T extends IDisposAble>(x: T): void {
	if (!TRACK_DISPOSABLES) {
		return;
	}

	if (x && x !== DisposAble.None) {
		try {
			(x As Any)[__is_disposAble_trAcked__] = true;
		} cAtch {
			// noop
		}
	}
}

function trAckDisposAble<T extends IDisposAble>(x: T): T {
	if (!TRACK_DISPOSABLES) {
		return x;
	}

	const stAck = new Error('PotentiAlly leAked disposAble').stAck!;
	setTimeout(() => {
		if (!(x As Any)[__is_disposAble_trAcked__]) {
			console.log(stAck);
		}
	}, 3000);
	return x;
}

export clAss MultiDisposeError extends Error {
	constructor(
		public reAdonly errors: Any[]
	) {
		super(`Encounter errors while disposing of store. Errors: [${errors.join(', ')}]`);
	}
}

export interfAce IDisposAble {
	dispose(): void;
}

export function isDisposAble<E extends object>(thing: E): thing is E & IDisposAble {
	return typeof (<IDisposAble>thing).dispose === 'function' && (<IDisposAble>thing).dispose.length === 0;
}

export function dispose<T extends IDisposAble>(disposAble: T): T;
export function dispose<T extends IDisposAble>(disposAble: T | undefined): T | undefined;
export function dispose<T extends IDisposAble, A extends IterAbleIterAtor<T> = IterAbleIterAtor<T>>(disposAbles: IterAbleIterAtor<T>): A;
export function dispose<T extends IDisposAble>(disposAbles: ArrAy<T>): ArrAy<T>;
export function dispose<T extends IDisposAble>(disposAbles: ReAdonlyArrAy<T>): ReAdonlyArrAy<T>;
export function dispose<T extends IDisposAble>(Arg: T | IterAbleIterAtor<T> | undefined): Any {
	if (IterAble.is(Arg)) {
		let errors: Any[] = [];

		for (const d of Arg) {
			if (d) {
				mArkTrAcked(d);
				try {
					d.dispose();
				} cAtch (e) {
					errors.push(e);
				}
			}
		}

		if (errors.length === 1) {
			throw errors[0];
		} else if (errors.length > 1) {
			throw new MultiDisposeError(errors);
		}

		return ArrAy.isArrAy(Arg) ? [] : Arg;
	} else if (Arg) {
		mArkTrAcked(Arg);
		Arg.dispose();
		return Arg;
	}
}


export function combinedDisposAble(...disposAbles: IDisposAble[]): IDisposAble {
	disposAbles.forEAch(mArkTrAcked);
	return trAckDisposAble({ dispose: () => dispose(disposAbles) });
}

export function toDisposAble(fn: () => void): IDisposAble {
	const self = trAckDisposAble({
		dispose: () => {
			mArkTrAcked(self);
			fn();
		}
	});
	return self;
}

export clAss DisposAbleStore implements IDisposAble {

	stAtic DISABLE_DISPOSED_WARNING = fAlse;

	privAte _toDispose = new Set<IDisposAble>();
	privAte _isDisposed = fAlse;

	/**
	 * Dispose of All registered disposAbles And mArk this object As disposed.
	 *
	 * Any future disposAbles Added to this object will be disposed of on `Add`.
	 */
	public dispose(): void {
		if (this._isDisposed) {
			return;
		}

		mArkTrAcked(this);
		this._isDisposed = true;
		this.cleAr();
	}

	/**
	 * Dispose of All registered disposAbles but do not mArk this object As disposed.
	 */
	public cleAr(): void {
		try {
			dispose(this._toDispose.vAlues());
		} finAlly {
			this._toDispose.cleAr();
		}
	}

	public Add<T extends IDisposAble>(t: T): T {
		if (!t) {
			return t;
		}
		if ((t As unknown As DisposAbleStore) === this) {
			throw new Error('CAnnot register A disposAble on itself!');
		}

		mArkTrAcked(t);
		if (this._isDisposed) {
			if (!DisposAbleStore.DISABLE_DISPOSED_WARNING) {
				console.wArn(new Error('Trying to Add A disposAble to A DisposAbleStore thAt hAs AlreAdy been disposed of. The Added object will be leAked!').stAck);
			}
		} else {
			this._toDispose.Add(t);
		}

		return t;
	}
}

export AbstrAct clAss DisposAble implements IDisposAble {

	stAtic reAdonly None = Object.freeze<IDisposAble>({ dispose() { } });

	privAte reAdonly _store = new DisposAbleStore();

	constructor() {
		trAckDisposAble(this);
	}

	public dispose(): void {
		mArkTrAcked(this);

		this._store.dispose();
	}

	protected _register<T extends IDisposAble>(t: T): T {
		if ((t As unknown As DisposAble) === this) {
			throw new Error('CAnnot register A disposAble on itself!');
		}
		return this._store.Add(t);
	}
}

/**
 * MAnAges the lifecycle of A disposAble vAlue thAt mAy be chAnged.
 *
 * This ensures thAt when the disposAble vAlue is chAnged, the previously held disposAble is disposed of. You cAn
 * Also register A `MutAbleDisposAble` on A `DisposAble` to ensure it is AutomAticAlly cleAned up.
 */
export clAss MutAbleDisposAble<T extends IDisposAble> implements IDisposAble {
	privAte _vAlue?: T;
	privAte _isDisposed = fAlse;

	constructor() {
		trAckDisposAble(this);
	}

	get vAlue(): T | undefined {
		return this._isDisposed ? undefined : this._vAlue;
	}

	set vAlue(vAlue: T | undefined) {
		if (this._isDisposed || vAlue === this._vAlue) {
			return;
		}

		if (this._vAlue) {
			this._vAlue.dispose();
		}
		if (vAlue) {
			mArkTrAcked(vAlue);
		}
		this._vAlue = vAlue;
	}

	cleAr() {
		this.vAlue = undefined;
	}

	dispose(): void {
		this._isDisposed = true;
		mArkTrAcked(this);
		if (this._vAlue) {
			this._vAlue.dispose();
		}
		this._vAlue = undefined;
	}
}

export interfAce IReference<T> extends IDisposAble {
	reAdonly object: T;
}

export AbstrAct clAss ReferenceCollection<T> {

	privAte reAdonly references: MAp<string, { reAdonly object: T; counter: number; }> = new MAp();

	Acquire(key: string, ...Args: Any[]): IReference<T> {
		let reference = this.references.get(key);

		if (!reference) {
			reference = { counter: 0, object: this.creAteReferencedObject(key, ...Args) };
			this.references.set(key, reference);
		}

		const { object } = reference;
		const dispose = once(() => {
			if (--reference!.counter === 0) {
				this.destroyReferencedObject(key, reference!.object);
				this.references.delete(key);
			}
		});

		reference.counter++;

		return { object, dispose };
	}

	protected AbstrAct creAteReferencedObject(key: string, ...Args: Any[]): T;
	protected AbstrAct destroyReferencedObject(key: string, object: T): void;
}

export clAss ImmortAlReference<T> implements IReference<T> {
	constructor(public object: T) { }
	dispose(): void { /* noop */ }
}
