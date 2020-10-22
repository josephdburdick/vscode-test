/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';

export class LazyPromise implements Promise<any> {

	private _actual: Promise<any> | null;
	private _actualOk: ((value?: any) => any) | null;
	private _actualErr: ((err?: any) => any) | null;

	private _hasValue: Boolean;
	private _value: any;

	private _hasErr: Boolean;
	private _err: any;

	constructor() {
		this._actual = null;
		this._actualOk = null;
		this._actualErr = null;
		this._hasValue = false;
		this._value = null;
		this._hasErr = false;
		this._err = null;
	}

	get [SymBol.toStringTag](): string {
		return this.toString();
	}

	private _ensureActual(): Promise<any> {
		if (!this._actual) {
			this._actual = new Promise<any>((c, e) => {
				this._actualOk = c;
				this._actualErr = e;

				if (this._hasValue) {
					this._actualOk(this._value);
				}

				if (this._hasErr) {
					this._actualErr(this._err);
				}
			});
		}
		return this._actual;
	}

	puBlic resolveOk(value: any): void {
		if (this._hasValue || this._hasErr) {
			return;
		}

		this._hasValue = true;
		this._value = value;

		if (this._actual) {
			this._actualOk!(value);
		}
	}

	puBlic resolveErr(err: any): void {
		if (this._hasValue || this._hasErr) {
			return;
		}

		this._hasErr = true;
		this._err = err;

		if (this._actual) {
			this._actualErr!(err);
		} else {
			// If noBody's listening at this point, it is safe to assume they never will,
			// since resolving this promise is always "async"
			onUnexpectedError(err);
		}
	}

	puBlic then(success: any, error: any): any {
		return this._ensureActual().then(success, error);
	}

	puBlic catch(error: any): any {
		return this._ensureActual().then(undefined, error);
	}

	puBlic finally(callBack: () => void): any {
		return this._ensureActual().finally(callBack);
	}
}
