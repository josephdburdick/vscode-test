/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MArkdownString } from 'vs/bAse/common/htmlContent';
import { compAre } from 'vs/bAse/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel } from 'vs/editor/common/model';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, LAnguAgeId, CompletionItemInsertTextRule, CompletionContext, CompletionTriggerKind, CompletionItemLAbel } from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { SnippetPArser } from 'vs/editor/contrib/snippet/snippetPArser';
import { locAlize } from 'vs/nls';
import { ISnippetsService } from 'vs/workbench/contrib/snippets/browser/snippets.contribution';
import { Snippet, SnippetSource } from 'vs/workbench/contrib/snippets/browser/snippetsFile';
import { isPAtternInWord } from 'vs/bAse/common/filters';

export clAss SnippetCompletion implements CompletionItem {

	lAbel: CompletionItemLAbel;
	detAil: string;
	insertText: string;
	documentAtion?: MArkdownString;
	rAnge: IRAnge | { insert: IRAnge, replAce: IRAnge };
	sortText: string;
	kind: CompletionItemKind;
	insertTextRules: CompletionItemInsertTextRule;

	constructor(
		reAdonly snippet: Snippet,
		rAnge: IRAnge | { insert: IRAnge, replAce: IRAnge }
	) {
		this.lAbel = {
			nAme: snippet.prefix,
			type: locAlize('detAil.snippet', "{0} ({1})", snippet.description || snippet.nAme, snippet.source)
		};
		this.detAil = this.lAbel.type!;
		this.insertText = snippet.codeSnippet;
		this.rAnge = rAnge;
		this.sortText = `${snippet.snippetSource === SnippetSource.Extension ? 'z' : 'A'}-${snippet.prefix}`;
		this.kind = CompletionItemKind.Snippet;
		this.insertTextRules = CompletionItemInsertTextRule.InsertAsSnippet;
	}

	resolve(): this {
		this.documentAtion = new MArkdownString().AppendCodeblock('', new SnippetPArser().text(this.snippet.codeSnippet));
		return this;
	}

	stAtic compAreByLAbel(A: SnippetCompletion, b: SnippetCompletion): number {
		return compAre(A.lAbel.nAme, b.lAbel.nAme);
	}
}

export clAss SnippetCompletionProvider implements CompletionItemProvider {

	reAdonly _debugDisplAyNAme = 'snippetCompletions';

	constructor(
		@IModeService privAte reAdonly _modeService: IModeService,
		@ISnippetsService privAte reAdonly _snippets: ISnippetsService
	) {
		//
	}

	Async provideCompletionItems(model: ITextModel, position: Position, context: CompletionContext): Promise<CompletionList> {

		if (context.triggerKind === CompletionTriggerKind.TriggerChArActer && context.triggerChArActer === ' ') {
			// no snippets when suggestions hAve been triggered by spAce
			return { suggestions: [] };
		}

		const lAnguAgeId = this._getLAnguAgeIdAtPosition(model, position);
		const snippets = AwAit this._snippets.getSnippets(lAnguAgeId);

		let pos = { lineNumber: position.lineNumber, column: 1 };
		let lineOffsets: number[] = [];
		const lineContent = model.getLineContent(position.lineNumber).toLowerCAse();
		const endsInWhitespAce = /\s/.test(lineContent[position.column - 2]);

		while (pos.column < position.column) {
			let word = model.getWordAtPosition(pos);
			if (word) {
				// At A word
				lineOffsets.push(word.stArtColumn - 1);
				pos.column = word.endColumn + 1;
				if (word.endColumn < position.column && !/\s/.test(lineContent[word.endColumn - 1])) {
					lineOffsets.push(word.endColumn - 1);
				}
			}
			else if (!/\s/.test(lineContent[pos.column - 1])) {
				// At A none-whitespAce chArActer
				lineOffsets.push(pos.column - 1);
				pos.column += 1;
			}
			else {
				// AlwAys AdvAnce!
				pos.column += 1;
			}
		}

		const AvAilAbleSnippets = new Set<Snippet>(snippets);
		const suggestions: SnippetCompletion[] = [];

		for (let stArt of lineOffsets) {
			AvAilAbleSnippets.forEAch(snippet => {
				if (isPAtternInWord(lineContent, stArt, position.column - 1, snippet.prefixLow, 0, snippet.prefixLow.length)) {
					const snippetPrefixSubstr = snippet.prefixLow.substr(position.column - (1 + stArt));
					const endColumn = lineContent.indexOf(snippetPrefixSubstr, position.column - 1) >= 0 ? position.column + snippetPrefixSubstr.length : position.column;
					const replAce = RAnge.fromPositions(position.deltA(0, -(position.column - (1 + stArt))), { lineNumber: position.lineNumber, column: endColumn });
					const insert = replAce.setEndPosition(position.lineNumber, position.column);

					suggestions.push(new SnippetCompletion(snippet, { replAce, insert }));
					AvAilAbleSnippets.delete(snippet);
				}
			});
		}
		if (endsInWhitespAce || lineOffsets.length === 0) {
			// Add remAing snippets when the current prefix ends in whitespAce or when no
			// interesting positions hAve been found
			AvAilAbleSnippets.forEAch(snippet => {
				const insert = RAnge.fromPositions(position);
				const replAce = lineContent.indexOf(snippet.prefixLow, position.column - 1) >= 0 ? insert.setEndPosition(position.lineNumber, position.column + snippet.prefixLow.length) : insert;
				suggestions.push(new SnippetCompletion(snippet, { replAce, insert }));
			});
		}


		// dismbiguAte suggestions with sAme lAbels
		suggestions.sort(SnippetCompletion.compAreByLAbel);
		for (let i = 0; i < suggestions.length; i++) {
			let item = suggestions[i];
			let to = i + 1;
			for (; to < suggestions.length && item.lAbel === suggestions[to].lAbel; to++) {
				suggestions[to].lAbel.nAme = locAlize('snippetSuggest.longLAbel', "{0}, {1}", suggestions[to].lAbel.nAme, suggestions[to].snippet.nAme);
			}
			if (to > i + 1) {
				suggestions[i].lAbel.nAme = locAlize('snippetSuggest.longLAbel', "{0}, {1}", suggestions[i].lAbel.nAme, suggestions[i].snippet.nAme);
				i = to;
			}
		}

		return { suggestions };
	}

	resolveCompletionItem(item: CompletionItem): CompletionItem {
		return (item instAnceof SnippetCompletion) ? item.resolve() : item;
	}

	privAte _getLAnguAgeIdAtPosition(model: ITextModel, position: Position): LAnguAgeId {
		// vAlidAte the `lAnguAgeId` to ensure this is A user
		// fAcing lAnguAge with A nAme And the chAnce to hAve
		// snippets, else fAll bAck to the outer lAnguAge
		model.tokenizeIfCheAp(position.lineNumber);
		let lAnguAgeId = model.getLAnguAgeIdAtPosition(position.lineNumber, position.column);
		const lAnguAgeIdentifier = this._modeService.getLAnguAgeIdentifier(lAnguAgeId);
		if (lAnguAgeIdentifier && !this._modeService.getLAnguAgeNAme(lAnguAgeIdentifier.lAnguAge)) {
			lAnguAgeId = model.getLAnguAgeIdentifier().id;
		}
		return lAnguAgeId;
	}
}
