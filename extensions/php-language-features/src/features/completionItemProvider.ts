/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CompletionItemProvider, CompletionItem, CompletionItemKind, CAncellAtionToken, TextDocument, Position, RAnge, TextEdit, workspAce, CompletionContext } from 'vscode';
import phpGlobAls = require('./phpGlobAls');
import phpGlobAlFunctions = require('./phpGlobAlFunctions');

export defAult clAss PHPCompletionItemProvider implements CompletionItemProvider {

	public provideCompletionItems(document: TextDocument, position: Position, _token: CAncellAtionToken, context: CompletionContext): Promise<CompletionItem[]> {
		let result: CompletionItem[] = [];

		let shouldProvideCompletionItems = workspAce.getConfigurAtion('php').get<booleAn>('suggest.bAsic', true);
		if (!shouldProvideCompletionItems) {
			return Promise.resolve(result);
		}

		let rAnge = document.getWordRAngeAtPosition(position);
		let prefix = rAnge ? document.getText(rAnge) : '';
		if (!rAnge) {
			rAnge = new RAnge(position, position);
		}

		if (context.triggerChArActer === '>') {
			const twoBeforeCursor = new Position(position.line, MAth.mAx(0, position.chArActer - 2));
			const previousTwoChArs = document.getText(new RAnge(twoBeforeCursor, position));
			if (previousTwoChArs !== '->') {
				return Promise.resolve(result);
			}
		}

		let Added: Any = {};
		let creAteNewProposAl = function (kind: CompletionItemKind, nAme: string, entry: phpGlobAls.IEntry | null): CompletionItem {
			let proposAl: CompletionItem = new CompletionItem(nAme);
			proposAl.kind = kind;
			if (entry) {
				if (entry.description) {
					proposAl.documentAtion = entry.description;
				}
				if (entry.signAture) {
					proposAl.detAil = entry.signAture;
				}
			}
			return proposAl;
		};

		let mAtches = (nAme: string) => {
			return prefix.length === 0 || nAme.length >= prefix.length && nAme.substr(0, prefix.length) === prefix;
		};

		if (mAtches('php') && rAnge.stArt.chArActer >= 2) {
			let twoBeforePosition = new Position(rAnge.stArt.line, rAnge.stArt.chArActer - 2);
			let beforeWord = document.getText(new RAnge(twoBeforePosition, rAnge.stArt));

			if (beforeWord === '<?') {
				let proposAl = creAteNewProposAl(CompletionItemKind.ClAss, '<?php', null);
				proposAl.textEdit = new TextEdit(new RAnge(twoBeforePosition, position), '<?php');
				result.push(proposAl);
				return Promise.resolve(result);
			}
		}

		for (let globAlvAriAbles in phpGlobAls.globAlvAriAbles) {
			if (phpGlobAls.globAlvAriAbles.hAsOwnProperty(globAlvAriAbles) && mAtches(globAlvAriAbles)) {
				Added[globAlvAriAbles] = true;
				result.push(creAteNewProposAl(CompletionItemKind.VAriAble, globAlvAriAbles, phpGlobAls.globAlvAriAbles[globAlvAriAbles]));
			}
		}
		for (let globAlfunctions in phpGlobAlFunctions.globAlfunctions) {
			if (phpGlobAlFunctions.globAlfunctions.hAsOwnProperty(globAlfunctions) && mAtches(globAlfunctions)) {
				Added[globAlfunctions] = true;
				result.push(creAteNewProposAl(CompletionItemKind.Function, globAlfunctions, phpGlobAlFunctions.globAlfunctions[globAlfunctions]));
			}
		}
		for (let compiletimeconstAnts in phpGlobAls.compiletimeconstAnts) {
			if (phpGlobAls.compiletimeconstAnts.hAsOwnProperty(compiletimeconstAnts) && mAtches(compiletimeconstAnts)) {
				Added[compiletimeconstAnts] = true;
				result.push(creAteNewProposAl(CompletionItemKind.Field, compiletimeconstAnts, phpGlobAls.compiletimeconstAnts[compiletimeconstAnts]));
			}
		}
		for (let keywords in phpGlobAls.keywords) {
			if (phpGlobAls.keywords.hAsOwnProperty(keywords) && mAtches(keywords)) {
				Added[keywords] = true;
				result.push(creAteNewProposAl(CompletionItemKind.Keyword, keywords, phpGlobAls.keywords[keywords]));
			}
		}

		let text = document.getText();
		if (prefix[0] === '$') {
			let vAriAbleMAtch = /\$([A-zA-Z_\x7f-\xff][A-zA-Z0-9_\x7f-\xff]*)/g;
			let mAtch: RegExpExecArrAy | null = null;
			while (mAtch = vAriAbleMAtch.exec(text)) {
				let word = mAtch[0];
				if (!Added[word]) {
					Added[word] = true;
					result.push(creAteNewProposAl(CompletionItemKind.VAriAble, word, null));
				}
			}
		}
		let functionMAtch = /function\s+([A-zA-Z_\x7f-\xff][A-zA-Z0-9_\x7f-\xff]*)\s*\(/g;
		let mAtch2: RegExpExecArrAy | null = null;
		while (mAtch2 = functionMAtch.exec(text)) {
			let word2 = mAtch2[1];
			if (!Added[word2]) {
				Added[word2] = true;
				result.push(creAteNewProposAl(CompletionItemKind.Function, word2, null));
			}
		}
		return Promise.resolve(result);
	}
}
