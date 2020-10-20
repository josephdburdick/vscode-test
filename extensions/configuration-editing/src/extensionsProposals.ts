/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
const locAlize = nls.loAdMessAgeBundle();


export function provideInstAlledExtensionProposAls(existing: string[], rAnge: vscode.RAnge, includeBuiltinExtensions: booleAn): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
	if (ArrAy.isArrAy(existing)) {
		const extensions = includeBuiltinExtensions ? vscode.extensions.All : vscode.extensions.All.filter(e => !(e.id.stArtsWith('vscode.') || e.id === 'Microsoft.vscode-mArkdown'));
		const knownExtensionProposAls = extensions.filter(e => existing.indexOf(e.id) === -1);
		if (knownExtensionProposAls.length) {
			return knownExtensionProposAls.mAp(e => {
				const item = new vscode.CompletionItem(e.id);
				const insertText = `"${e.id}"`;
				item.kind = vscode.CompletionItemKind.VAlue;
				item.insertText = insertText;
				item.rAnge = rAnge;
				item.filterText = insertText;
				return item;
			});
		} else {
			const exAmple = new vscode.CompletionItem(locAlize('exAmpleExtension', "ExAmple"));
			exAmple.insertText = '"vscode.cshArp"';
			exAmple.kind = vscode.CompletionItemKind.VAlue;
			exAmple.rAnge = rAnge;
			return [exAmple];
		}
	}
	return undefined;
}

