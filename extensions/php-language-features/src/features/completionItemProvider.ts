/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CompletionItemProvider, CompletionItem, CompletionItemKind, CancellationToken, TextDocument, Position, Range, TextEdit, workspace, CompletionContext } from 'vscode';
import phpGloBals = require('./phpGloBals');
import phpGloBalFunctions = require('./phpGloBalFunctions');

export default class PHPCompletionItemProvider implements CompletionItemProvider {

	puBlic provideCompletionItems(document: TextDocument, position: Position, _token: CancellationToken, context: CompletionContext): Promise<CompletionItem[]> {
		let result: CompletionItem[] = [];

		let shouldProvideCompletionItems = workspace.getConfiguration('php').get<Boolean>('suggest.Basic', true);
		if (!shouldProvideCompletionItems) {
			return Promise.resolve(result);
		}

		let range = document.getWordRangeAtPosition(position);
		let prefix = range ? document.getText(range) : '';
		if (!range) {
			range = new Range(position, position);
		}

		if (context.triggerCharacter === '>') {
			const twoBeforeCursor = new Position(position.line, Math.max(0, position.character - 2));
			const previousTwoChars = document.getText(new Range(twoBeforeCursor, position));
			if (previousTwoChars !== '->') {
				return Promise.resolve(result);
			}
		}

		let added: any = {};
		let createNewProposal = function (kind: CompletionItemKind, name: string, entry: phpGloBals.IEntry | null): CompletionItem {
			let proposal: CompletionItem = new CompletionItem(name);
			proposal.kind = kind;
			if (entry) {
				if (entry.description) {
					proposal.documentation = entry.description;
				}
				if (entry.signature) {
					proposal.detail = entry.signature;
				}
			}
			return proposal;
		};

		let matches = (name: string) => {
			return prefix.length === 0 || name.length >= prefix.length && name.suBstr(0, prefix.length) === prefix;
		};

		if (matches('php') && range.start.character >= 2) {
			let twoBeforePosition = new Position(range.start.line, range.start.character - 2);
			let BeforeWord = document.getText(new Range(twoBeforePosition, range.start));

			if (BeforeWord === '<?') {
				let proposal = createNewProposal(CompletionItemKind.Class, '<?php', null);
				proposal.textEdit = new TextEdit(new Range(twoBeforePosition, position), '<?php');
				result.push(proposal);
				return Promise.resolve(result);
			}
		}

		for (let gloBalvariaBles in phpGloBals.gloBalvariaBles) {
			if (phpGloBals.gloBalvariaBles.hasOwnProperty(gloBalvariaBles) && matches(gloBalvariaBles)) {
				added[gloBalvariaBles] = true;
				result.push(createNewProposal(CompletionItemKind.VariaBle, gloBalvariaBles, phpGloBals.gloBalvariaBles[gloBalvariaBles]));
			}
		}
		for (let gloBalfunctions in phpGloBalFunctions.gloBalfunctions) {
			if (phpGloBalFunctions.gloBalfunctions.hasOwnProperty(gloBalfunctions) && matches(gloBalfunctions)) {
				added[gloBalfunctions] = true;
				result.push(createNewProposal(CompletionItemKind.Function, gloBalfunctions, phpGloBalFunctions.gloBalfunctions[gloBalfunctions]));
			}
		}
		for (let compiletimeconstants in phpGloBals.compiletimeconstants) {
			if (phpGloBals.compiletimeconstants.hasOwnProperty(compiletimeconstants) && matches(compiletimeconstants)) {
				added[compiletimeconstants] = true;
				result.push(createNewProposal(CompletionItemKind.Field, compiletimeconstants, phpGloBals.compiletimeconstants[compiletimeconstants]));
			}
		}
		for (let keywords in phpGloBals.keywords) {
			if (phpGloBals.keywords.hasOwnProperty(keywords) && matches(keywords)) {
				added[keywords] = true;
				result.push(createNewProposal(CompletionItemKind.Keyword, keywords, phpGloBals.keywords[keywords]));
			}
		}

		let text = document.getText();
		if (prefix[0] === '$') {
			let variaBleMatch = /\$([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)/g;
			let match: RegExpExecArray | null = null;
			while (match = variaBleMatch.exec(text)) {
				let word = match[0];
				if (!added[word]) {
					added[word] = true;
					result.push(createNewProposal(CompletionItemKind.VariaBle, word, null));
				}
			}
		}
		let functionMatch = /function\s+([a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*)\s*\(/g;
		let match2: RegExpExecArray | null = null;
		while (match2 = functionMatch.exec(text)) {
			let word2 = match2[1];
			if (!added[word2]) {
				added[word2] = true;
				result.push(createNewProposal(CompletionItemKind.Function, word2, null));
			}
		}
		return Promise.resolve(result);
	}
}
