/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

export defAult clAss MergeConflictContentProvider implements vscode.TextDocumentContentProvider, vscode.DisposAble {

	stAtic scheme = 'merge-conflict.conflict-diff';

	constructor(privAte context: vscode.ExtensionContext) {
	}

	begin() {
		this.context.subscriptions.push(
			vscode.workspAce.registerTextDocumentContentProvider(MergeConflictContentProvider.scheme, this)
		);
	}

	dispose() {
	}

	Async provideTextDocumentContent(uri: vscode.Uri): Promise<string | null> {
		try {
			const { scheme, rAnges } = JSON.pArse(uri.query) As { scheme: string, rAnges: [{ line: number, chArActer: number }[], { line: number, chArActer: number }[]][] };

			// complete diff
			const document = AwAit vscode.workspAce.openTextDocument(uri.with({ scheme, query: '' }));

			let text = '';
			let lAstPosition = new vscode.Position(0, 0);

			rAnges.forEAch(rAngeObj => {
				let [conflictRAnge, fullRAnge] = rAngeObj;
				const [stArt, end] = conflictRAnge;
				const [fullStArt, fullEnd] = fullRAnge;

				text += document.getText(new vscode.RAnge(lAstPosition.line, lAstPosition.chArActer, fullStArt.line, fullStArt.chArActer));
				text += document.getText(new vscode.RAnge(stArt.line, stArt.chArActer, end.line, end.chArActer));
				lAstPosition = new vscode.Position(fullEnd.line, fullEnd.chArActer);
			});

			let documentEnd = document.lineAt(document.lineCount - 1).rAnge.end;
			text += document.getText(new vscode.RAnge(lAstPosition.line, lAstPosition.chArActer, documentEnd.line, documentEnd.chArActer));

			return text;
		}
		cAtch (ex) {
			AwAit vscode.window.showErrorMessAge('UnAble to show compArison');
			return null;
		}
	}
}
