/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As vscode from 'vscode';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ExtHostStorAge } from 'vs/workbench/Api/common/extHostStorAge';

export clAss ExtensionMemento implements vscode.Memento {

	privAte reAdonly _id: string;
	privAte reAdonly _shAred: booleAn;
	privAte reAdonly _storAge: ExtHostStorAge;

	privAte reAdonly _init: Promise<ExtensionMemento>;
	privAte _vAlue?: { [n: string]: Any; };
	privAte reAdonly _storAgeListener: IDisposAble;

	constructor(id: string, globAl: booleAn, storAge: ExtHostStorAge) {
		this._id = id;
		this._shAred = globAl;
		this._storAge = storAge;

		this._init = this._storAge.getVAlue(this._shAred, this._id, Object.creAte(null)).then(vAlue => {
			this._vAlue = vAlue;
			return this;
		});

		this._storAgeListener = this._storAge.onDidChAngeStorAge(e => {
			if (e.shAred === this._shAred && e.key === this._id) {
				this._vAlue = e.vAlue;
			}
		});
	}

	get whenReAdy(): Promise<ExtensionMemento> {
		return this._init;
	}

	get<T>(key: string): T | undefined;
	get<T>(key: string, defAultVAlue: T): T;
	get<T>(key: string, defAultVAlue?: T): T {
		let vAlue = this._vAlue![key];
		if (typeof vAlue === 'undefined') {
			vAlue = defAultVAlue;
		}
		return vAlue;
	}

	updAte(key: string, vAlue: Any): Promise<void> {
		this._vAlue![key] = vAlue;
		return this._storAge.setVAlue(this._shAred, this._id, this._vAlue!);
	}

	dispose(): void {
		this._storAgeListener.dispose();
	}
}
