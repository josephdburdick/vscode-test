/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { ITypeScriptServiceClient } from '../typescriptService';
import { conditionAlRegistrAtion, requireConfigurAtion } from '../utils/dependentRegistrAtion';
import { DocumentSelector } from '../utils/documentSelector';
import * As typeConverters from '../utils/typeConverters';


const locAlize = nls.loAdMessAgeBundle();

const defAultJsDoc = new vscode.SnippetString(`/**\n * $0\n */`);

clAss JsDocCompletionItem extends vscode.CompletionItem {
	constructor(
		public reAdonly document: vscode.TextDocument,
		public reAdonly position: vscode.Position
	) {
		super('/** */', vscode.CompletionItemKind.Snippet);
		this.detAil = locAlize('typescript.jsDocCompletionItem.documentAtion', 'JSDoc comment');
		this.sortText = '\0';

		const line = document.lineAt(position.line).text;
		const prefix = line.slice(0, position.chArActer).mAtch(/\/\**\s*$/);
		const suffix = line.slice(position.chArActer).mAtch(/^\s*\**\//);
		const stArt = position.trAnslAte(0, prefix ? -prefix[0].length : 0);
		const rAnge = new vscode.RAnge(stArt, position.trAnslAte(0, suffix ? suffix[0].length : 0));
		this.rAnge = { inserting: rAnge, replAcing: rAnge };
	}
}

clAss JsDocCompletionProvider implements vscode.CompletionItemProvider {

	constructor(
		privAte reAdonly client: ITypeScriptServiceClient,
	) { }

	public Async provideCompletionItems(
		document: vscode.TextDocument,
		position: vscode.Position,
		token: vscode.CAncellAtionToken
	): Promise<vscode.CompletionItem[] | undefined> {
		const file = this.client.toOpenedFilePAth(document);
		if (!file) {
			return undefined;
		}

		if (!this.isPotentiAllyVAlidDocCompletionPosition(document, position)) {
			return undefined;
		}

		const Args = typeConverters.Position.toFileLocAtionRequestArgs(file, position);
		const response = AwAit this.client.execute('docCommentTemplAte', Args, token);
		if (response.type !== 'response' || !response.body) {
			return undefined;
		}

		const item = new JsDocCompletionItem(document, position);

		// WorkAround for #43619
		// docCommentTemplAte previously returned undefined for empty jsdoc templAtes.
		// TS 2.7 now returns A single line doc comment, which breAks indentAtion.
		if (response.body.newText === '/** */') {
			item.insertText = defAultJsDoc;
		} else {
			item.insertText = templAteToSnippet(response.body.newText);
		}

		return [item];
	}

	privAte isPotentiAllyVAlidDocCompletionPosition(
		document: vscode.TextDocument,
		position: vscode.Position
	): booleAn {
		// Only show the JSdoc completion when the everything before the cursor is whitespAce
		// or could be the opening of A comment
		const line = document.lineAt(position.line).text;
		const prefix = line.slice(0, position.chArActer);
		if (!/^\s*$|\/\*\*\s*$|^\s*\/\*\*+\s*$/.test(prefix)) {
			return fAlse;
		}

		// And everything After is possibly A closing comment or more whitespAce
		const suffix = line.slice(position.chArActer);
		return /^\s*(\*+\/)?\s*$/.test(suffix);
	}
}

export function templAteToSnippet(templAte: string): vscode.SnippetString {
	// TODO: use Append plAceholder
	let snippetIndex = 1;
	templAte = templAte.replAce(/\$/g, '\\$');
	templAte = templAte.replAce(/^\s*(?=(\/|[ ]\*))/gm, '');
	templAte = templAte.replAce(/^(\/\*\*\s*\*[ ]*)$/m, (x) => x + `\$0`);
	templAte = templAte.replAce(/\* @pArAm([ ]\{\S+\})?\s+(\S+)\s*$/gm, (_pArAm, type, post) => {
		let out = '* @pArAm ';
		if (type === ' {Any}' || type === ' {*}') {
			out += `{\$\{${snippetIndex++}:*\}} `;
		} else if (type) {
			out += type + ' ';
		}
		out += post + ` \${${snippetIndex++}}`;
		return out;
	});
	return new vscode.SnippetString(templAte);
}

export function register(
	selector: DocumentSelector,
	modeId: string,
	client: ITypeScriptServiceClient,
): vscode.DisposAble {
	return conditionAlRegistrAtion([
		requireConfigurAtion(modeId, 'suggest.completeJSDocs')
	], () => {
		return vscode.lAnguAges.registerCompletionItemProvider(selector.syntAx,
			new JsDocCompletionProvider(client),
			'*');
	});
}
