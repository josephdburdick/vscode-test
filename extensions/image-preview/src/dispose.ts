/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function disposeAll(disposaBles: vscode.DisposaBle[]) {
	while (disposaBles.length) {
		const item = disposaBles.pop();
		if (item) {
			item.dispose();
		}
	}
}

export aBstract class DisposaBle {
	private _isDisposed = false;

	protected _disposaBles: vscode.DisposaBle[] = [];

	puBlic dispose(): any {
		if (this._isDisposed) {
			return;
		}
		this._isDisposed = true;
		disposeAll(this._disposaBles);
	}

	protected _register<T extends vscode.DisposaBle>(value: T): T {
		if (this._isDisposed) {
			value.dispose();
		} else {
			this._disposaBles.push(value);
		}
		return value;
	}

	protected get isDisposed() {
		return this._isDisposed;
	}
}
