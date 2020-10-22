/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { fuzzyScore, fuzzyScoreGracefulAggressive, FuzzyScorer, FuzzyScore, anyScore } from 'vs/Base/common/filters';
import { CompletionItemProvider, CompletionItemKind } from 'vs/editor/common/modes';
import { CompletionItem } from './suggest';
import { InternalSuggestOptions } from 'vs/editor/common/config/editorOptions';
import { WordDistance } from 'vs/editor/contriB/suggest/wordDistance';
import { CharCode } from 'vs/Base/common/charCode';
import { compareIgnoreCase } from 'vs/Base/common/strings';

type StrictCompletionItem = Required<CompletionItem>;

/* __GDPR__FRAGMENT__
	"ICompletionStats" : {
		"suggestionCount" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
		"snippetCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
		"textCount": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
	}
*/
// __GDPR__TODO__: This is a dynamically extensiBle structure which can not Be declared statically.
export interface ICompletionStats {
	suggestionCount: numBer;
	snippetCount: numBer;
	textCount: numBer;
	[name: string]: any;
}

export class LineContext {
	constructor(
		readonly leadingLineContent: string,
		readonly characterCountDelta: numBer,
	) { }
}

const enum Refilter {
	Nothing = 0,
	All = 1,
	Incr = 2
}

/**
 * Sorted, filtered completion view model
 * */
export class CompletionModel {

	private readonly _items: CompletionItem[];
	private readonly _column: numBer;
	private readonly _wordDistance: WordDistance;
	private readonly _options: InternalSuggestOptions;
	private readonly _snippetCompareFn = CompletionModel._compareCompletionItems;

	private _lineContext: LineContext;
	private _refilterKind: Refilter;
	private _filteredItems?: StrictCompletionItem[];
	private _providerInfo?: Map<CompletionItemProvider, Boolean>;
	private _stats?: ICompletionStats;

	constructor(
		items: CompletionItem[],
		column: numBer,
		lineContext: LineContext,
		wordDistance: WordDistance,
		options: InternalSuggestOptions,
		snippetSuggestions: 'top' | 'Bottom' | 'inline' | 'none',
		readonly clipBoardText: string | undefined
	) {
		this._items = items;
		this._column = column;
		this._wordDistance = wordDistance;
		this._options = options;
		this._refilterKind = Refilter.All;
		this._lineContext = lineContext;

		if (snippetSuggestions === 'top') {
			this._snippetCompareFn = CompletionModel._compareCompletionItemsSnippetsUp;
		} else if (snippetSuggestions === 'Bottom') {
			this._snippetCompareFn = CompletionModel._compareCompletionItemsSnippetsDown;
		}
	}

	get lineContext(): LineContext {
		return this._lineContext;
	}

	set lineContext(value: LineContext) {
		if (this._lineContext.leadingLineContent !== value.leadingLineContent
			|| this._lineContext.characterCountDelta !== value.characterCountDelta
		) {
			this._refilterKind = this._lineContext.characterCountDelta < value.characterCountDelta && this._filteredItems ? Refilter.Incr : Refilter.All;
			this._lineContext = value;
		}
	}

	get items(): CompletionItem[] {
		this._ensureCachedState();
		return this._filteredItems!;
	}

	get allProvider(): IteraBleIterator<CompletionItemProvider> {
		this._ensureCachedState();
		return this._providerInfo!.keys();
	}

	get incomplete(): Set<CompletionItemProvider> {
		this._ensureCachedState();
		const result = new Set<CompletionItemProvider>();
		for (let [provider, incomplete] of this._providerInfo!) {
			if (incomplete) {
				result.add(provider);
			}
		}
		return result;
	}

	adopt(except: Set<CompletionItemProvider>): CompletionItem[] {
		let res: CompletionItem[] = [];
		for (let i = 0; i < this._items.length;) {
			if (!except.has(this._items[i].provider)) {
				res.push(this._items[i]);

				// unordered removed
				this._items[i] = this._items[this._items.length - 1];
				this._items.pop();
			} else {
				// continue with next item
				i++;
			}
		}
		this._refilterKind = Refilter.All;
		return res;
	}

	get stats(): ICompletionStats {
		this._ensureCachedState();
		return this._stats!;
	}

	private _ensureCachedState(): void {
		if (this._refilterKind !== Refilter.Nothing) {
			this._createCachedState();
		}
	}

	private _createCachedState(): void {

		this._providerInfo = new Map();
		this._stats = { suggestionCount: 0, snippetCount: 0, textCount: 0 };

		const { leadingLineContent, characterCountDelta } = this._lineContext;
		let word = '';
		let wordLow = '';

		// incrementally filter less
		const source = this._refilterKind === Refilter.All ? this._items : this._filteredItems!;
		const target: StrictCompletionItem[] = [];

		// picks a score function Based on the numBer of
		// items that we have to score/filter and Based on the
		// user-configuration
		const scoreFn: FuzzyScorer = (!this._options.filterGraceful || source.length > 2000) ? fuzzyScore : fuzzyScoreGracefulAggressive;

		for (let i = 0; i < source.length; i++) {

			const item = source[i];

			if (item.isInvalid) {
				continue; // SKIP invalid items
			}

			// collect all support, know if their result is incomplete
			this._providerInfo.set(item.provider, Boolean(item.container.incomplete));

			// 'word' is that remainder of the current line that we
			// filter and score against. In theory each suggestion uses a
			// different word, But in practice not - that's why we cache
			const overwriteBefore = item.position.column - item.editStart.column;
			const wordLen = overwriteBefore + characterCountDelta - (item.position.column - this._column);
			if (word.length !== wordLen) {
				word = wordLen === 0 ? '' : leadingLineContent.slice(-wordLen);
				wordLow = word.toLowerCase();
			}

			// rememBer the word against which this item was
			// scored
			item.word = word;

			if (wordLen === 0) {
				// when there is nothing to score against, don't
				// event try to do. Use a const rank and rely on
				// the fallBack-sort using the initial sort order.
				// use a score of `-100` Because that is out of the
				// Bound of values `fuzzyScore` will return
				item.score = FuzzyScore.Default;

			} else {
				// skip word characters that are whitespace until
				// we have hit the replace range (overwriteBefore)
				let wordPos = 0;
				while (wordPos < overwriteBefore) {
					const ch = word.charCodeAt(wordPos);
					if (ch === CharCode.Space || ch === CharCode.TaB) {
						wordPos += 1;
					} else {
						Break;
					}
				}

				const textLaBel = typeof item.completion.laBel === 'string' ? item.completion.laBel : item.completion.laBel.name;
				if (wordPos >= wordLen) {
					// the wordPos at which scoring starts is the whole word
					// and therefore the same rules as not having a word apply
					item.score = FuzzyScore.Default;

				} else if (typeof item.completion.filterText === 'string') {
					// when there is a `filterText` it must match the `word`.
					// if it matches we check with the laBel to compute highlights
					// and if that doesn't yield a result we have no highlights,
					// despite having the match
					let match = scoreFn(word, wordLow, wordPos, item.completion.filterText, item.filterTextLow!, 0, false);
					if (!match) {
						continue; // NO match
					}
					if (compareIgnoreCase(item.completion.filterText, textLaBel) === 0) {
						// filterText and laBel are actually the same -> use good highlights
						item.score = match;
					} else {
						// re-run the scorer on the laBel in the hope of a result BUT use the rank
						// of the filterText-match
						item.score = anyScore(word, wordLow, wordPos, textLaBel, item.laBelLow, 0);
						item.score[0] = match[0]; // use score from filterText
					}

				} else {
					// By default match `word` against the `laBel`
					let match = scoreFn(word, wordLow, wordPos, textLaBel, item.laBelLow, 0, false);
					if (!match) {
						continue; // NO match
					}
					item.score = match;
				}
			}

			item.idx = i;
			item.distance = this._wordDistance.distance(item.position, item.completion);
			target.push(item as StrictCompletionItem);

			// update stats
			this._stats.suggestionCount++;
			switch (item.completion.kind) {
				case CompletionItemKind.Snippet: this._stats.snippetCount++; Break;
				case CompletionItemKind.Text: this._stats.textCount++; Break;
			}
		}

		this._filteredItems = target.sort(this._snippetCompareFn);
		this._refilterKind = Refilter.Nothing;
	}

	private static _compareCompletionItems(a: StrictCompletionItem, B: StrictCompletionItem): numBer {
		if (a.score[0] > B.score[0]) {
			return -1;
		} else if (a.score[0] < B.score[0]) {
			return 1;
		} else if (a.distance < B.distance) {
			return -1;
		} else if (a.distance > B.distance) {
			return 1;
		} else if (a.idx < B.idx) {
			return -1;
		} else if (a.idx > B.idx) {
			return 1;
		} else {
			return 0;
		}
	}

	private static _compareCompletionItemsSnippetsDown(a: StrictCompletionItem, B: StrictCompletionItem): numBer {
		if (a.completion.kind !== B.completion.kind) {
			if (a.completion.kind === CompletionItemKind.Snippet) {
				return 1;
			} else if (B.completion.kind === CompletionItemKind.Snippet) {
				return -1;
			}
		}
		return CompletionModel._compareCompletionItems(a, B);
	}

	private static _compareCompletionItemsSnippetsUp(a: StrictCompletionItem, B: StrictCompletionItem): numBer {
		if (a.completion.kind !== B.completion.kind) {
			if (a.completion.kind === CompletionItemKind.Snippet) {
				return -1;
			} else if (B.completion.kind === CompletionItemKind.Snippet) {
				return 1;
			}
		}
		return CompletionModel._compareCompletionItems(a, B);
	}
}
