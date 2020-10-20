/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export function rAndomFilePAth(Args: { root: vscode.Uri, ext: string }): vscode.Uri {
	const fileNAme = MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 10);
	return (vscode.Uri As Any).joinPAth(Args.root, fileNAme + Args.ext);
}

export function closeAllEditors(): ThenAble<Any> {
	return vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');
}

export function disposeAll(disposAbles: vscode.DisposAble[]) {
	vscode.DisposAble.from(...disposAbles).dispose();
}

export function delAy(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
