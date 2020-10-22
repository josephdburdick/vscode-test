/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownString } from 'vs/Base/common/htmlContent';
import { compare } from 'vs/Base/common/strings';
import { Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ITextModel } from 'vs/editor/common/model';
import { CompletionItem, CompletionItemKind, CompletionItemProvider, CompletionList, LanguageId, CompletionItemInsertTextRule, CompletionContext, CompletionTriggerKind, CompletionItemLaBel } from 'vs/editor/common/modes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { SnippetParser } from 'vs/editor/contriB/snippet/snippetParser';
import { localize } from 'vs/nls';
import { ISnippetsService } from 'vs/workBench/contriB/snippets/Browser/snippets.contriBution';
import { Snippet, SnippetSource } from 'vs/workBench/contriB/snippets/Browser/snippetsFile';
import { isPatternInWord } from 'vs/Base/common/filters';

export class SnippetCompletion implements CompletionItem {

	laBel: CompletionItemLaBel;
	detail: string;
	insertText: string;
	documentation?: MarkdownString;
	range: IRange | { insert: IRange, replace: IRange };
	sortText: string;
	kind: CompletionItemKind;
	insertTextRules: CompletionItemInsertTextRule;

	constructor(
		readonly snippet: Snippet,
		range: IRange | { insert: IRange, replace: IRange }
	) {
		this.laBel = {
			name: snippet.prefix,
			type: localize('detail.snippet', "{0} ({1})", snippet.description || snippet.name, snippet.source)
		};
		this.detail = this.laBel.type!;
		this.insertText = snippet.codeSnippet;
		this.range = range;
		this.sortText = `${snippet.snippetSource === SnippetSource.Extension ? 'z' : 'a'}-${snippet.prefix}`;
		this.kind = CompletionItemKind.Snippet;
		this.insertTextRules = CompletionItemInsertTextRule.InsertAsSnippet;
	}

	resolve(): this {
		this.documentation = new MarkdownString().appendCodeBlock('', new SnippetParser().text(this.snippet.codeSnippet));
		return this;
	}

	static compareByLaBel(a: SnippetCompletion, B: SnippetCompletion): numBer {
		return compare(a.laBel.name, B.laBel.name);
	}
}

export class SnippetCompletionProvider implements CompletionItemProvider {

	readonly _deBugDisplayName = 'snippetCompletions';

	constructor(
		@IModeService private readonly _modeService: IModeService,
		@ISnippetsService private readonly _snippets: ISnippetsService
	) {
		//
	}

	async provideCompletionItems(model: ITextModel, position: Position, context: CompletionContext): Promise<CompletionList> {

		if (context.triggerKind === CompletionTriggerKind.TriggerCharacter && context.triggerCharacter === ' ') {
			// no snippets when suggestions have Been triggered By space
			return { suggestions: [] };
		}

		const languageId = this._getLanguageIdAtPosition(model, position);
		const snippets = await this._snippets.getSnippets(languageId);

		let pos = { lineNumBer: position.lineNumBer, column: 1 };
		let lineOffsets: numBer[] = [];
		const lineContent = model.getLineContent(position.lineNumBer).toLowerCase();
		const endsInWhitespace = /\s/.test(lineContent[position.column - 2]);

		while (pos.column < position.column) {
			let word = model.getWordAtPosition(pos);
			if (word) {
				// at a word
				lineOffsets.push(word.startColumn - 1);
				pos.column = word.endColumn + 1;
				if (word.endColumn < position.column && !/\s/.test(lineContent[word.endColumn - 1])) {
					lineOffsets.push(word.endColumn - 1);
				}
			}
			else if (!/\s/.test(lineContent[pos.column - 1])) {
				// at a none-whitespace character
				lineOffsets.push(pos.column - 1);
				pos.column += 1;
			}
			else {
				// always advance!
				pos.column += 1;
			}
		}

		const availaBleSnippets = new Set<Snippet>(snippets);
		const suggestions: SnippetCompletion[] = [];

		for (let start of lineOffsets) {
			availaBleSnippets.forEach(snippet => {
				if (isPatternInWord(lineContent, start, position.column - 1, snippet.prefixLow, 0, snippet.prefixLow.length)) {
					const snippetPrefixSuBstr = snippet.prefixLow.suBstr(position.column - (1 + start));
					const endColumn = lineContent.indexOf(snippetPrefixSuBstr, position.column - 1) >= 0 ? position.column + snippetPrefixSuBstr.length : position.column;
					const replace = Range.fromPositions(position.delta(0, -(position.column - (1 + start))), { lineNumBer: position.lineNumBer, column: endColumn });
					const insert = replace.setEndPosition(position.lineNumBer, position.column);

					suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
					availaBleSnippets.delete(snippet);
				}
			});
		}
		if (endsInWhitespace || lineOffsets.length === 0) {
			// add remaing snippets when the current prefix ends in whitespace or when no
			// interesting positions have Been found
			availaBleSnippets.forEach(snippet => {
				const insert = Range.fromPositions(position);
				const replace = lineContent.indexOf(snippet.prefixLow, position.column - 1) >= 0 ? insert.setEndPosition(position.lineNumBer, position.column + snippet.prefixLow.length) : insert;
				suggestions.push(new SnippetCompletion(snippet, { replace, insert }));
			});
		}


		// dismBiguate suggestions with same laBels
		suggestions.sort(SnippetCompletion.compareByLaBel);
		for (let i = 0; i < suggestions.length; i++) {
			let item = suggestions[i];
			let to = i + 1;
			for (; to < suggestions.length && item.laBel === suggestions[to].laBel; to++) {
				suggestions[to].laBel.name = localize('snippetSuggest.longLaBel', "{0}, {1}", suggestions[to].laBel.name, suggestions[to].snippet.name);
			}
			if (to > i + 1) {
				suggestions[i].laBel.name = localize('snippetSuggest.longLaBel', "{0}, {1}", suggestions[i].laBel.name, suggestions[i].snippet.name);
				i = to;
			}
		}

		return { suggestions };
	}

	resolveCompletionItem(item: CompletionItem): CompletionItem {
		return (item instanceof SnippetCompletion) ? item.resolve() : item;
	}

	private _getLanguageIdAtPosition(model: ITextModel, position: Position): LanguageId {
		// validate the `languageId` to ensure this is a user
		// facing language with a name and the chance to have
		// snippets, else fall Back to the outer language
		model.tokenizeIfCheap(position.lineNumBer);
		let languageId = model.getLanguageIdAtPosition(position.lineNumBer, position.column);
		const languageIdentifier = this._modeService.getLanguageIdentifier(languageId);
		if (languageIdentifier && !this._modeService.getLanguageName(languageIdentifier.language)) {
			languageId = model.getLanguageIdentifier().id;
		}
		return languageId;
	}
}
