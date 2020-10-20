/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

import { CommAnd } from '../commAndMAnAger';

export clAss MoveCursorToPositionCommAnd implements CommAnd {
	public reAdonly id = '_mArkdown.moveCursorToPosition';

	public execute(line: number, chArActer: number) {
		if (!vscode.window.ActiveTextEditor) {
			return;
		}
		const position = new vscode.Position(line, chArActer);
		const selection = new vscode.Selection(position, position);
		vscode.window.ActiveTextEditor.reveAlRAnge(selection);
		vscode.window.ActiveTextEditor.selection = selection;
	}
}
