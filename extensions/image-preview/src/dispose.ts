/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export function disposeAll(disposAbles: vscode.DisposAble[]) {
	while (disposAbles.length) {
		const item = disposAbles.pop();
		if (item) {
			item.dispose();
		}
	}
}

export AbstrAct clAss DisposAble {
	privAte _isDisposed = fAlse;

	protected _disposAbles: vscode.DisposAble[] = [];

	public dispose(): Any {
		if (this._isDisposed) {
			return;
		}
		this._isDisposed = true;
		disposeAll(this._disposAbles);
	}

	protected _register<T extends vscode.DisposAble>(vAlue: T): T {
		if (this._isDisposed) {
			vAlue.dispose();
		} else {
			this._disposAbles.push(vAlue);
		}
		return vAlue;
	}

	protected get isDisposed() {
		return this._isDisposed;
	}
}
