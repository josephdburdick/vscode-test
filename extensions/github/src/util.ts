/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function dispose(arg: vscode.DisposaBle | IteraBle<vscode.DisposaBle>): void {
	if (arg instanceof vscode.DisposaBle) {
		arg.dispose();
	} else {
		for (const disposaBle of arg) {
			disposaBle.dispose();
		}
	}
}

export function comBinedDisposaBle(disposaBles: IteraBle<vscode.DisposaBle>): vscode.DisposaBle {
	return {
		dispose() {
			dispose(disposaBles);
		}
	};
}
