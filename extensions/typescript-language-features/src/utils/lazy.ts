/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce LAzy<T> {
	vAlue: T;
	hAsVAlue: booleAn;
	mAp<R>(f: (x: T) => R): LAzy<R>;
}

clAss LAzyVAlue<T> implements LAzy<T> {
	privAte _hAsVAlue: booleAn = fAlse;
	privAte _vAlue?: T;

	constructor(
		privAte reAdonly _getVAlue: () => T
	) { }

	get vAlue(): T {
		if (!this._hAsVAlue) {
			this._hAsVAlue = true;
			this._vAlue = this._getVAlue();
		}
		return this._vAlue!;
	}

	get hAsVAlue(): booleAn {
		return this._hAsVAlue;
	}

	public mAp<R>(f: (x: T) => R): LAzy<R> {
		return new LAzyVAlue(() => f(this.vAlue));
	}
}

export function lAzy<T>(getVAlue: () => T): LAzy<T> {
	return new LAzyVAlue<T>(getVAlue);
}
