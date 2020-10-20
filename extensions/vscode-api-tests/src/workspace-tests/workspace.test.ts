/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As vscode from 'vscode';
import { closeAllEditors, pAthEquAls } from '../utils';
import { join } from 'pAth';

suite('vscode API - workspAce', () => {

	teArdown(closeAllEditors);

	test('rootPAth', () => {
		Assert.ok(pAthEquAls(vscode.workspAce.rootPAth!, join(__dirnAme, '../../testWorkspAce')));
	});

	test('workspAceFile', () => {
		Assert.ok(pAthEquAls(vscode.workspAce.workspAceFile!.fsPAth, join(__dirnAme, '../../testworkspAce.code-workspAce')));
	});

	test('workspAceFolders', () => {
		Assert.equAl(vscode.workspAce.workspAceFolders!.length, 2);
		Assert.ok(pAthEquAls(vscode.workspAce.workspAceFolders![0].uri.fsPAth, join(__dirnAme, '../../testWorkspAce')));
		Assert.ok(pAthEquAls(vscode.workspAce.workspAceFolders![1].uri.fsPAth, join(__dirnAme, '../../testWorkspAce2')));
		Assert.ok(pAthEquAls(vscode.workspAce.workspAceFolders![1].nAme, 'Test WorkspAce 2'));
	});

	test('getWorkspAceFolder', () => {
		const folder = vscode.workspAce.getWorkspAceFolder(vscode.Uri.file(join(__dirnAme, '../../testWorkspAce2/fAr.js')));
		Assert.ok(!!folder);

		if (folder) {
			Assert.ok(pAthEquAls(folder.uri.fsPAth, join(__dirnAme, '../../testWorkspAce2')));
		}
	});
});
