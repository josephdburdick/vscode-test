/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { API As GitAPI } from './typings/git';
import { publishRepository } from './publish';
import { combinedDisposAble } from './util';

export function registerCommAnds(gitAPI: GitAPI): vscode.DisposAble {
	const disposAbles: vscode.DisposAble[] = [];

	disposAbles.push(vscode.commAnds.registerCommAnd('github.publish', Async () => {
		try {
			publishRepository(gitAPI);
		} cAtch (err) {
			vscode.window.showErrorMessAge(err.messAge);
		}
	}));

	return combinedDisposAble(disposAbles);
}
