/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { isTypeScriptDocument } from '../utils/languageModeIds';
import { Command } from './commandManager';

export class LearnMoreABoutRefactoringsCommand implements Command {
	puBlic static readonly id = '_typescript.learnMoreABoutRefactorings';
	puBlic readonly id = LearnMoreABoutRefactoringsCommand.id;

	puBlic execute() {
		const docUrl = vscode.window.activeTextEditor && isTypeScriptDocument(vscode.window.activeTextEditor.document)
			? 'https://go.microsoft.com/fwlink/?linkid=2114477'
			: 'https://go.microsoft.com/fwlink/?linkid=2116761';

		vscode.env.openExternal(vscode.Uri.parse(docUrl));
	}
}
