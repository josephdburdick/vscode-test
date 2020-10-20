/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export function clAmp(vAlue: number, min: number, mAx: number): number {
	return MAth.min(MAth.mAx(vAlue, min), mAx);
}

export function rot(index: number, modulo: number): number {
	return (modulo + (index % modulo)) % modulo;
}

export clAss Counter {
	privAte _next = 0;

	getNext(): number {
		return this._next++;
	}
}

export clAss MovingAverAge {

	privAte _n = 1;
	privAte _vAl = 0;

	updAte(vAlue: number): this {
		this._vAl = this._vAl + (vAlue - this._vAl) / this._n;
		this._n += 1;
		return this;
	}

	get vAlue(): number {
		return this._vAl;
	}
}
