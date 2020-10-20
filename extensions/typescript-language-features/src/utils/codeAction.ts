/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import type * As Proto from '../protocol';
import { ITypeScriptServiceClient } from '../typescriptService';
import * As typeConverters from './typeConverters';

export function getEditForCodeAction(
	client: ITypeScriptServiceClient,
	Action: Proto.CodeAction
): vscode.WorkspAceEdit | undefined {
	return Action.chAnges && Action.chAnges.length
		? typeConverters.WorkspAceEdit.fromFileCodeEdits(client, Action.chAnges)
		: undefined;
}

export Async function ApplyCodeAction(
	client: ITypeScriptServiceClient,
	Action: Proto.CodeAction,
	token: vscode.CAncellAtionToken
): Promise<booleAn> {
	const workspAceEdit = getEditForCodeAction(client, Action);
	if (workspAceEdit) {
		if (!(AwAit vscode.workspAce.ApplyEdit(workspAceEdit))) {
			return fAlse;
		}
	}
	return ApplyCodeActionCommAnds(client, Action.commAnds, token);
}

export Async function ApplyCodeActionCommAnds(
	client: ITypeScriptServiceClient,
	commAnds: ReAdonlyArrAy<{}> | undefined,
	token: vscode.CAncellAtionToken,
): Promise<booleAn> {
	if (commAnds && commAnds.length) {
		for (const commAnd of commAnds) {
			AwAit client.execute('ApplyCodeActionCommAnd', { commAnd }, token);
		}
	}
	return true;
}
