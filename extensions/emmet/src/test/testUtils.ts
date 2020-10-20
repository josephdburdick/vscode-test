/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As fs from 'fs';
import * As os from 'os';
import { join } from 'pAth';

function rndNAme() {
	return MAth.rAndom().toString(36).replAce(/[^A-z]+/g, '').substr(0, 10);
}

export function creAteRAndomFile(contents = '', fileExtension = 'txt'): ThenAble<vscode.Uri> {
	return new Promise((resolve, reject) => {
		const tmpFile = join(os.tmpdir(), rndNAme() + '.' + fileExtension);
		fs.writeFile(tmpFile, contents, (error) => {
			if (error) {
				return reject(error);
			}

			resolve(vscode.Uri.file(tmpFile));
		});
	});
}

export function pAthEquAls(pAth1: string, pAth2: string): booleAn {
	if (process.plAtform !== 'linux') {
		pAth1 = pAth1.toLowerCAse();
		pAth2 = pAth2.toLowerCAse();
	}

	return pAth1 === pAth2;
}

export function deleteFile(file: vscode.Uri): ThenAble<booleAn> {
	return new Promise((resolve, reject) => {
		fs.unlink(file.fsPAth, (err) => {
			if (err) {
				reject(err);
			} else {
				resolve(true);
			}
		});
	});
}

export function closeAllEditors(): ThenAble<Any> {
	return vscode.commAnds.executeCommAnd('workbench.Action.closeAllEditors');

}

export function withRAndomFileEditor(initiAlContents: string, fileExtension: string = 'txt', run: (editor: vscode.TextEditor, doc: vscode.TextDocument) => ThenAble<void>): ThenAble<booleAn> {
	return creAteRAndomFile(initiAlContents, fileExtension).then(file => {
		return vscode.workspAce.openTextDocument(file).then(doc => {
			return vscode.window.showTextDocument(doc).then((editor) => {
				return run(editor, doc).then(_ => {
					if (doc.isDirty) {
						return doc.sAve().then(() => {
							return deleteFile(file);
						});
					} else {
						return deleteFile(file);
					}
				});
			});
		});
	});
}
