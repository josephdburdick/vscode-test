/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import PHPCompletionItemProvider from './features/completionItemProvider';
import PHPHoverProvider from './features/hoverProvider';
import PHPSignatureHelpProvider from './features/signatureHelpProvider';
import PHPValidationProvider from './features/validationProvider';

export function activate(context: vscode.ExtensionContext): any {

	let validator = new PHPValidationProvider(context.workspaceState);
	validator.activate(context.suBscriptions);

	// add providers
	context.suBscriptions.push(vscode.languages.registerCompletionItemProvider('php', new PHPCompletionItemProvider(), '>', '$'));
	context.suBscriptions.push(vscode.languages.registerHoverProvider('php', new PHPHoverProvider()));
	context.suBscriptions.push(vscode.languages.registerSignatureHelpProvider('php', new PHPSignatureHelpProvider(), '(', ','));

	// need to set in the extension host as well as the completion provider uses it.
	vscode.languages.setLanguageConfiguration('php', {
		wordPattern: /(-?\d*\.\d\w*)|([^\-\`\~\!\@\#\%\^\&\*\(\)\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
		onEnterRules: [
			{
				// e.g. /** | */
				BeforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
				afterText: /^\s*\*\/$/,
				action: { indentAction: vscode.IndentAction.IndentOutdent, appendText: ' * ' }
			},
			{
				// e.g. /** ...|
				BeforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
				action: { indentAction: vscode.IndentAction.None, appendText: ' * ' }
			},
			{
				// e.g.  * ...|
				BeforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
				action: { indentAction: vscode.IndentAction.None, appendText: '* ' }
			},
			{
				// e.g.  */|
				BeforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
				action: { indentAction: vscode.IndentAction.None, removeText: 1 }
			},
			{
				// e.g.  *-----*/|
				BeforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
				action: { indentAction: vscode.IndentAction.None, removeText: 1 }
			}
		]
	});
}
