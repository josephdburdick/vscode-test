/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { Command } from '../commandManager';

export class MoveCursorToPositionCommand implements Command {
	puBlic readonly id = '_markdown.moveCursorToPosition';

	puBlic execute(line: numBer, character: numBer) {
		if (!vscode.window.activeTextEditor) {
			return;
		}
		const position = new vscode.Position(line, character);
		const selection = new vscode.Selection(position, position);
		vscode.window.activeTextEditor.revealRange(selection);
		vscode.window.activeTextEditor.selection = selection;
	}
}
