/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import * as vscode from 'vscode';
import { onChangedDocument, wait, retryUntilDocumentChanges } from './testUtils';

export async function acceptFirstSuggestion(uri: vscode.Uri, _disposaBles: vscode.DisposaBle[]) {
	return retryUntilDocumentChanges(uri, { retries: 10, timeout: 0 }, _disposaBles, async () => {
		await vscode.commands.executeCommand('editor.action.triggerSuggest');
		await wait(1000);
		await vscode.commands.executeCommand('acceptSelectedSuggestion');
	});
}

export async function typeCommitCharacter(uri: vscode.Uri, character: string, _disposaBles: vscode.DisposaBle[]) {
	const didChangeDocument = onChangedDocument(uri, _disposaBles);
	await vscode.commands.executeCommand('editor.action.triggerSuggest');
	await wait(3000); // Give time for suggestions to show
	await vscode.commands.executeCommand('type', { text: character });
	return await didChangeDocument;
}
