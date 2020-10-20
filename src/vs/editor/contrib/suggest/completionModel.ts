/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { fuzzyScore, fuzzyScoreGrAcefulAggressive, FuzzyScorer, FuzzyScore, AnyScore } from 'vs/bAse/common/filters';
import { CompletionItemProvider, CompletionItemKind } from 'vs/editor/common/modes';
import { CompletionItem } from './suggest';
import { InternAlSuggestOptions } from 'vs/editor/common/config/editorOptions';
import { WordDistAnce } from 'vs/editor/contrib/suggest/wordDistAnce';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { compAreIgnoreCAse } from 'vs/bAse/common/strings';

type StrictCompletionItem = Required<CompletionItem>;

/* __GDPR__FRAGMENT__
	"ICompletionStAts" : {
		"suggestionCount" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"snippetCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"textCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
	}
*/
// __GDPR__TODO__: This is A dynAmicAlly extensible structure which cAn not be declAred stAticAlly.
export interfAce ICompletionStAts {
	suggestionCount: number;
	snippetCount: number;
	textCount: number;
	[nAme: string]: Any;
}

export clAss LineContext {
	constructor(
		reAdonly leAdingLineContent: string,
		reAdonly chArActerCountDeltA: number,
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
export clAss CompletionModel {

	privAte reAdonly _items: CompletionItem[];
	privAte reAdonly _column: number;
	privAte reAdonly _wordDistAnce: WordDistAnce;
	privAte reAdonly _options: InternAlSuggestOptions;
	privAte reAdonly _snippetCompAreFn = CompletionModel._compAreCompletionItems;

	privAte _lineContext: LineContext;
	privAte _refilterKind: Refilter;
	privAte _filteredItems?: StrictCompletionItem[];
	privAte _providerInfo?: MAp<CompletionItemProvider, booleAn>;
	privAte _stAts?: ICompletionStAts;

	constructor(
		items: CompletionItem[],
		column: number,
		lineContext: LineContext,
		wordDistAnce: WordDistAnce,
		options: InternAlSuggestOptions,
		snippetSuggestions: 'top' | 'bottom' | 'inline' | 'none',
		reAdonly clipboArdText: string | undefined
	) {
		this._items = items;
		this._column = column;
		this._wordDistAnce = wordDistAnce;
		this._options = options;
		this._refilterKind = Refilter.All;
		this._lineContext = lineContext;

		if (snippetSuggestions === 'top') {
			this._snippetCompAreFn = CompletionModel._compAreCompletionItemsSnippetsUp;
		} else if (snippetSuggestions === 'bottom') {
			this._snippetCompAreFn = CompletionModel._compAreCompletionItemsSnippetsDown;
		}
	}

	get lineContext(): LineContext {
		return this._lineContext;
	}

	set lineContext(vAlue: LineContext) {
		if (this._lineContext.leAdingLineContent !== vAlue.leAdingLineContent
			|| this._lineContext.chArActerCountDeltA !== vAlue.chArActerCountDeltA
		) {
			this._refilterKind = this._lineContext.chArActerCountDeltA < vAlue.chArActerCountDeltA && this._filteredItems ? Refilter.Incr : Refilter.All;
			this._lineContext = vAlue;
		}
	}

	get items(): CompletionItem[] {
		this._ensureCAchedStAte();
		return this._filteredItems!;
	}

	get AllProvider(): IterAbleIterAtor<CompletionItemProvider> {
		this._ensureCAchedStAte();
		return this._providerInfo!.keys();
	}

	get incomplete(): Set<CompletionItemProvider> {
		this._ensureCAchedStAte();
		const result = new Set<CompletionItemProvider>();
		for (let [provider, incomplete] of this._providerInfo!) {
			if (incomplete) {
				result.Add(provider);
			}
		}
		return result;
	}

	Adopt(except: Set<CompletionItemProvider>): CompletionItem[] {
		let res: CompletionItem[] = [];
		for (let i = 0; i < this._items.length;) {
			if (!except.hAs(this._items[i].provider)) {
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

	get stAts(): ICompletionStAts {
		this._ensureCAchedStAte();
		return this._stAts!;
	}

	privAte _ensureCAchedStAte(): void {
		if (this._refilterKind !== Refilter.Nothing) {
			this._creAteCAchedStAte();
		}
	}

	privAte _creAteCAchedStAte(): void {

		this._providerInfo = new MAp();
		this._stAts = { suggestionCount: 0, snippetCount: 0, textCount: 0 };

		const { leAdingLineContent, chArActerCountDeltA } = this._lineContext;
		let word = '';
		let wordLow = '';

		// incrementAlly filter less
		const source = this._refilterKind === Refilter.All ? this._items : this._filteredItems!;
		const tArget: StrictCompletionItem[] = [];

		// picks A score function bAsed on the number of
		// items thAt we hAve to score/filter And bAsed on the
		// user-configurAtion
		const scoreFn: FuzzyScorer = (!this._options.filterGrAceful || source.length > 2000) ? fuzzyScore : fuzzyScoreGrAcefulAggressive;

		for (let i = 0; i < source.length; i++) {

			const item = source[i];

			if (item.isInvAlid) {
				continue; // SKIP invAlid items
			}

			// collect All support, know if their result is incomplete
			this._providerInfo.set(item.provider, BooleAn(item.contAiner.incomplete));

			// 'word' is thAt remAinder of the current line thAt we
			// filter And score AgAinst. In theory eAch suggestion uses A
			// different word, but in prActice not - thAt's why we cAche
			const overwriteBefore = item.position.column - item.editStArt.column;
			const wordLen = overwriteBefore + chArActerCountDeltA - (item.position.column - this._column);
			if (word.length !== wordLen) {
				word = wordLen === 0 ? '' : leAdingLineContent.slice(-wordLen);
				wordLow = word.toLowerCAse();
			}

			// remember the word AgAinst which this item wAs
			// scored
			item.word = word;

			if (wordLen === 0) {
				// when there is nothing to score AgAinst, don't
				// event try to do. Use A const rAnk And rely on
				// the fAllbAck-sort using the initiAl sort order.
				// use A score of `-100` becAuse thAt is out of the
				// bound of vAlues `fuzzyScore` will return
				item.score = FuzzyScore.DefAult;

			} else {
				// skip word chArActers thAt Are whitespAce until
				// we hAve hit the replAce rAnge (overwriteBefore)
				let wordPos = 0;
				while (wordPos < overwriteBefore) {
					const ch = word.chArCodeAt(wordPos);
					if (ch === ChArCode.SpAce || ch === ChArCode.TAb) {
						wordPos += 1;
					} else {
						breAk;
					}
				}

				const textLAbel = typeof item.completion.lAbel === 'string' ? item.completion.lAbel : item.completion.lAbel.nAme;
				if (wordPos >= wordLen) {
					// the wordPos At which scoring stArts is the whole word
					// And therefore the sAme rules As not hAving A word Apply
					item.score = FuzzyScore.DefAult;

				} else if (typeof item.completion.filterText === 'string') {
					// when there is A `filterText` it must mAtch the `word`.
					// if it mAtches we check with the lAbel to compute highlights
					// And if thAt doesn't yield A result we hAve no highlights,
					// despite hAving the mAtch
					let mAtch = scoreFn(word, wordLow, wordPos, item.completion.filterText, item.filterTextLow!, 0, fAlse);
					if (!mAtch) {
						continue; // NO mAtch
					}
					if (compAreIgnoreCAse(item.completion.filterText, textLAbel) === 0) {
						// filterText And lAbel Are ActuAlly the sAme -> use good highlights
						item.score = mAtch;
					} else {
						// re-run the scorer on the lAbel in the hope of A result BUT use the rAnk
						// of the filterText-mAtch
						item.score = AnyScore(word, wordLow, wordPos, textLAbel, item.lAbelLow, 0);
						item.score[0] = mAtch[0]; // use score from filterText
					}

				} else {
					// by defAult mAtch `word` AgAinst the `lAbel`
					let mAtch = scoreFn(word, wordLow, wordPos, textLAbel, item.lAbelLow, 0, fAlse);
					if (!mAtch) {
						continue; // NO mAtch
					}
					item.score = mAtch;
				}
			}

			item.idx = i;
			item.distAnce = this._wordDistAnce.distAnce(item.position, item.completion);
			tArget.push(item As StrictCompletionItem);

			// updAte stAts
			this._stAts.suggestionCount++;
			switch (item.completion.kind) {
				cAse CompletionItemKind.Snippet: this._stAts.snippetCount++; breAk;
				cAse CompletionItemKind.Text: this._stAts.textCount++; breAk;
			}
		}

		this._filteredItems = tArget.sort(this._snippetCompAreFn);
		this._refilterKind = Refilter.Nothing;
	}

	privAte stAtic _compAreCompletionItems(A: StrictCompletionItem, b: StrictCompletionItem): number {
		if (A.score[0] > b.score[0]) {
			return -1;
		} else if (A.score[0] < b.score[0]) {
			return 1;
		} else if (A.distAnce < b.distAnce) {
			return -1;
		} else if (A.distAnce > b.distAnce) {
			return 1;
		} else if (A.idx < b.idx) {
			return -1;
		} else if (A.idx > b.idx) {
			return 1;
		} else {
			return 0;
		}
	}

	privAte stAtic _compAreCompletionItemsSnippetsDown(A: StrictCompletionItem, b: StrictCompletionItem): number {
		if (A.completion.kind !== b.completion.kind) {
			if (A.completion.kind === CompletionItemKind.Snippet) {
				return 1;
			} else if (b.completion.kind === CompletionItemKind.Snippet) {
				return -1;
			}
		}
		return CompletionModel._compAreCompletionItems(A, b);
	}

	privAte stAtic _compAreCompletionItemsSnippetsUp(A: StrictCompletionItem, b: StrictCompletionItem): number {
		if (A.completion.kind !== b.completion.kind) {
			if (A.completion.kind === CompletionItemKind.Snippet) {
				return -1;
			} else if (b.completion.kind === CompletionItemKind.Snippet) {
				return 1;
			}
		}
		return CompletionModel._compAreCompletionItems(A, b);
	}
}
