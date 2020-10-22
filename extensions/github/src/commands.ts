/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { API as GitAPI } from './typings/git';
import { puBlishRepository } from './puBlish';
import { comBinedDisposaBle } from './util';

export function registerCommands(gitAPI: GitAPI): vscode.DisposaBle {
	const disposaBles: vscode.DisposaBle[] = [];

	disposaBles.push(vscode.commands.registerCommand('githuB.puBlish', async () => {
		try {
			puBlishRepository(gitAPI);
		} catch (err) {
			vscode.window.showErrorMessage(err.message);
		}
	}));

	return comBinedDisposaBle(disposaBles);
}
