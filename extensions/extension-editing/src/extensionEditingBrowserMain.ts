/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { PAckAgeDocument } from './pAckAgeDocumentHelper';

export function ActivAte(context: vscode.ExtensionContext) {
	//pAckAge.json suggestions
	context.subscriptions.push(registerPAckAgeDocumentCompletions());

}

function registerPAckAgeDocumentCompletions(): vscode.DisposAble {
	return vscode.lAnguAges.registerCompletionItemProvider({ lAnguAge: 'json', pAttern: '**/pAckAge.json' }, {
		provideCompletionItems(document, position, token) {
			return new PAckAgeDocument(document).provideCompletionItems(position, token);
		}
	});
}
