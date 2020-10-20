/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { isTypeScriptDocument } from '../utils/lAnguAgeModeIds';
import { CommAnd } from './commAndMAnAger';

export clAss LeArnMoreAboutRefActoringsCommAnd implements CommAnd {
	public stAtic reAdonly id = '_typescript.leArnMoreAboutRefActorings';
	public reAdonly id = LeArnMoreAboutRefActoringsCommAnd.id;

	public execute() {
		const docUrl = vscode.window.ActiveTextEditor && isTypeScriptDocument(vscode.window.ActiveTextEditor.document)
			? 'https://go.microsoft.com/fwlink/?linkid=2114477'
			: 'https://go.microsoft.com/fwlink/?linkid=2116761';

		vscode.env.openExternAl(vscode.Uri.pArse(docUrl));
	}
}
