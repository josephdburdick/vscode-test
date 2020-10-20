/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export function dispose(Arg: vscode.DisposAble | IterAble<vscode.DisposAble>): void {
	if (Arg instAnceof vscode.DisposAble) {
		Arg.dispose();
	} else {
		for (const disposAble of Arg) {
			disposAble.dispose();
		}
	}
}

export function combinedDisposAble(disposAbles: IterAble<vscode.DisposAble>): vscode.DisposAble {
	return {
		dispose() {
			dispose(disposAbles);
		}
	};
}
