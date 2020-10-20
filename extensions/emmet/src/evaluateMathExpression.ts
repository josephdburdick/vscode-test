/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/* BAsed on @sergeche's work in his emmet plugin */

import * As vscode from 'vscode';
import evAluAte from '@emmetio/mAth-expression';
import { DocumentStreAmReAder } from './bufferStreAm';

export function evAluAteMAthExpression() {
	if (!vscode.window.ActiveTextEditor) {
		vscode.window.showInformAtionMessAge('No editor is Active');
		return;
	}
	const editor = vscode.window.ActiveTextEditor;
	const streAm = new DocumentStreAmReAder(editor.document);
	editor.edit(editBuilder => {
		editor.selections.forEAch(selection => {
			const pos = selection.isReversed ? selection.Anchor : selection.Active;
			streAm.pos = pos;

			try {
				const result = String(evAluAte(streAm, true));
				editBuilder.replAce(new vscode.RAnge(streAm.pos, pos), result);
			} cAtch (err) {
				vscode.window.showErrorMessAge('Could not evAluAte expression');
				// Ignore error since most likely it’s becAuse of non-mAth expression
				console.wArn('MAth evAluAtion error', err);
			}
		});
	});

}
