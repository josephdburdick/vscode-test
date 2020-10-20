/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';

export clAss LAzyPromise implements Promise<Any> {

	privAte _ActuAl: Promise<Any> | null;
	privAte _ActuAlOk: ((vAlue?: Any) => Any) | null;
	privAte _ActuAlErr: ((err?: Any) => Any) | null;

	privAte _hAsVAlue: booleAn;
	privAte _vAlue: Any;

	privAte _hAsErr: booleAn;
	privAte _err: Any;

	constructor() {
		this._ActuAl = null;
		this._ActuAlOk = null;
		this._ActuAlErr = null;
		this._hAsVAlue = fAlse;
		this._vAlue = null;
		this._hAsErr = fAlse;
		this._err = null;
	}

	get [Symbol.toStringTAg](): string {
		return this.toString();
	}

	privAte _ensureActuAl(): Promise<Any> {
		if (!this._ActuAl) {
			this._ActuAl = new Promise<Any>((c, e) => {
				this._ActuAlOk = c;
				this._ActuAlErr = e;

				if (this._hAsVAlue) {
					this._ActuAlOk(this._vAlue);
				}

				if (this._hAsErr) {
					this._ActuAlErr(this._err);
				}
			});
		}
		return this._ActuAl;
	}

	public resolveOk(vAlue: Any): void {
		if (this._hAsVAlue || this._hAsErr) {
			return;
		}

		this._hAsVAlue = true;
		this._vAlue = vAlue;

		if (this._ActuAl) {
			this._ActuAlOk!(vAlue);
		}
	}

	public resolveErr(err: Any): void {
		if (this._hAsVAlue || this._hAsErr) {
			return;
		}

		this._hAsErr = true;
		this._err = err;

		if (this._ActuAl) {
			this._ActuAlErr!(err);
		} else {
			// If nobody's listening At this point, it is sAfe to Assume they never will,
			// since resolving this promise is AlwAys "Async"
			onUnexpectedError(err);
		}
	}

	public then(success: Any, error: Any): Any {
		return this._ensureActuAl().then(success, error);
	}

	public cAtch(error: Any): Any {
		return this._ensureActuAl().then(undefined, error);
	}

	public finAlly(cAllbAck: () => void): Any {
		return this._ensureActuAl().finAlly(cAllbAck);
	}
}
