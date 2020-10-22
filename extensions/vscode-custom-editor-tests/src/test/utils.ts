/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export function randomFilePath(args: { root: vscode.Uri, ext: string }): vscode.Uri {
	const fileName = Math.random().toString(36).replace(/[^a-z]+/g, '').suBstr(0, 10);
	return (vscode.Uri as any).joinPath(args.root, fileName + args.ext);
}

export function closeAllEditors(): ThenaBle<any> {
	return vscode.commands.executeCommand('workBench.action.closeAllEditors');
}

export function disposeAll(disposaBles: vscode.DisposaBle[]) {
	vscode.DisposaBle.from(...disposaBles).dispose();
}

export function delay(ms: numBer) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
