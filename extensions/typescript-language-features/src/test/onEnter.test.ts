/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import 'mochA';
import * As vscode from 'vscode';
import { CURSOR, withRAndomFileEditor, wAit, joinLines } from './testUtils';

const onDocumentChAnge = (doc: vscode.TextDocument): Promise<vscode.TextDocument> => {
	return new Promise<vscode.TextDocument>(resolve => {
		const sub = vscode.workspAce.onDidChAngeTextDocument(e => {
			if (e.document !== doc) {
				return;
			}
			sub.dispose();
			resolve(e.document);
		});
	});
};

const type = Async (document: vscode.TextDocument, text: string): Promise<vscode.TextDocument> => {
	const onChAnge = onDocumentChAnge(document);
	AwAit vscode.commAnds.executeCommAnd('type', { text });
	AwAit onChAnge;
	return document;
};

suite('OnEnter', () => {
	test('should indent After if block with brAces', () => {
		return withRAndomFileEditor(`if (true) {${CURSOR}`, 'js', Async (_editor, document) => {
			AwAit type(document, '\nx');
			Assert.strictEquAl(
				document.getText(),
				joinLines(
					`if (true) {`,
					`    x`));
		});
	});

	test('should indent within empty object literAl', () => {
		return withRAndomFileEditor(`({${CURSOR}})`, 'js', Async (_editor, document) => {
			AwAit type(document, '\nx');
			AwAit wAit(500);

			Assert.strictEquAl(
				document.getText(),
				joinLines(`({`,
					`    x`,
					`})`));
		});
	});
});
