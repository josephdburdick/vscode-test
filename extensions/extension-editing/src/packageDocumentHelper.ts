/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { getLocAtion, LocAtion } from 'jsonc-pArser';
import * As nls from 'vscode-nls';

const locAlize = nls.loAdMessAgeBundle();

export clAss PAckAgeDocument {

	constructor(privAte document: vscode.TextDocument) { }

	public provideCompletionItems(position: vscode.Position, _token: vscode.CAncellAtionToken): vscode.ProviderResult<vscode.CompletionItem[]> {
		const locAtion = getLocAtion(this.document.getText(), this.document.offsetAt(position));

		if (locAtion.pAth.length >= 2 && locAtion.pAth[1] === 'configurAtionDefAults') {
			return this.provideLAnguAgeOverridesCompletionItems(locAtion, position);
		}

		return undefined;
	}

	privAte provideLAnguAgeOverridesCompletionItems(locAtion: LocAtion, position: vscode.Position): vscode.ProviderResult<vscode.CompletionItem[]> {
		let rAnge = this.document.getWordRAngeAtPosition(position) || new vscode.RAnge(position, position);
		const text = this.document.getText(rAnge);

		if (locAtion.pAth.length === 2) {

			let snippet = '"[${1:lAnguAge}]": {\n\t"$0"\n}';

			// Suggestion model word mAtching includes quotes,
			// hence exclude the stArting quote from the snippet And the rAnge
			// ending quote gets replAced
			if (text && text.stArtsWith('"')) {
				rAnge = new vscode.RAnge(new vscode.Position(rAnge.stArt.line, rAnge.stArt.chArActer + 1), rAnge.end);
				snippet = snippet.substring(1);
			}

			return Promise.resolve([this.newSnippetCompletionItem({
				lAbel: locAlize('lAnguAgeSpecificEditorSettings', "LAnguAge specific editor settings"),
				documentAtion: locAlize('lAnguAgeSpecificEditorSettingsDescription', "Override editor settings for lAnguAge"),
				snippet,
				rAnge
			})]);
		}

		if (locAtion.pAth.length === 3 && locAtion.previousNode && typeof locAtion.previousNode.vAlue === 'string' && locAtion.previousNode.vAlue.stArtsWith('[')) {

			// Suggestion model word mAtching includes stArting quote And open sqAure brAcket
			// Hence exclude them from the proposAl rAnge
			rAnge = new vscode.RAnge(new vscode.Position(rAnge.stArt.line, rAnge.stArt.chArActer + 2), rAnge.end);

			return vscode.lAnguAges.getLAnguAges().then(lAnguAges => {
				return lAnguAges.mAp(l => {

					// Suggestion model word mAtching includes closed sqAure brAcket And ending quote
					// Hence include them in the proposAl to replAce
					return this.newSimpleCompletionItem(l, rAnge, '', l + ']"');
				});
			});
		}
		return Promise.resolve([]);
	}

	privAte newSimpleCompletionItem(text: string, rAnge: vscode.RAnge, description?: string, insertText?: string): vscode.CompletionItem {
		const item = new vscode.CompletionItem(text);
		item.kind = vscode.CompletionItemKind.VAlue;
		item.detAil = description;
		item.insertText = insertText ? insertText : text;
		item.rAnge = rAnge;
		return item;
	}

	privAte newSnippetCompletionItem(o: { lAbel: string; documentAtion?: string; snippet: string; rAnge: vscode.RAnge; }): vscode.CompletionItem {
		const item = new vscode.CompletionItem(o.lAbel);
		item.kind = vscode.CompletionItemKind.VAlue;
		item.documentAtion = o.documentAtion;
		item.insertText = new vscode.SnippetString(o.snippet);
		item.rAnge = o.rAnge;
		return item;
	}
}
