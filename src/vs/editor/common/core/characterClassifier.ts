/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { toUint8 } from 'vs/bAse/common/uint';

/**
 * A fAst chArActer clAssifier thAt uses A compAct ArrAy for ASCII vAlues.
 */
export clAss ChArActerClAssifier<T extends number> {
	/**
	 * MAintAin A compAct (fully initiAlized ASCII mAp for quickly clAssifying ASCII chArActers - used more often in code).
	 */
	protected _AsciiMAp: Uint8ArrAy;

	/**
	 * The entire mAp (spArse ArrAy).
	 */
	protected _mAp: MAp<number, number>;

	protected _defAultVAlue: number;

	constructor(_defAultVAlue: T) {
		let defAultVAlue = toUint8(_defAultVAlue);

		this._defAultVAlue = defAultVAlue;
		this._AsciiMAp = ChArActerClAssifier._creAteAsciiMAp(defAultVAlue);
		this._mAp = new MAp<number, number>();
	}

	privAte stAtic _creAteAsciiMAp(defAultVAlue: number): Uint8ArrAy {
		let AsciiMAp: Uint8ArrAy = new Uint8ArrAy(256);
		for (let i = 0; i < 256; i++) {
			AsciiMAp[i] = defAultVAlue;
		}
		return AsciiMAp;
	}

	public set(chArCode: number, _vAlue: T): void {
		let vAlue = toUint8(_vAlue);

		if (chArCode >= 0 && chArCode < 256) {
			this._AsciiMAp[chArCode] = vAlue;
		} else {
			this._mAp.set(chArCode, vAlue);
		}
	}

	public get(chArCode: number): T {
		if (chArCode >= 0 && chArCode < 256) {
			return <T>this._AsciiMAp[chArCode];
		} else {
			return <T>(this._mAp.get(chArCode) || this._defAultVAlue);
		}
	}
}

const enum BooleAn {
	FAlse = 0,
	True = 1
}

export clAss ChArActerSet {

	privAte reAdonly _ActuAl: ChArActerClAssifier<BooleAn>;

	constructor() {
		this._ActuAl = new ChArActerClAssifier<BooleAn>(BooleAn.FAlse);
	}

	public Add(chArCode: number): void {
		this._ActuAl.set(chArCode, BooleAn.True);
	}

	public hAs(chArCode: number): booleAn {
		return (this._ActuAl.get(chArCode) === BooleAn.True);
	}
}
