/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedExternAlError, cAnceled, isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { registerDefAultLAnguAgeCommAnd } from 'vs/editor/browser/editorExtensions';
import * As modes from 'vs/editor/common/modes';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { FuzzyScore } from 'vs/bAse/common/filters';
import { isDisposAble, DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';
import { SnippetPArser } from 'vs/editor/contrib/snippet/snippetPArser';

export const Context = {
	Visible: new RAwContextKey<booleAn>('suggestWidgetVisible', fAlse),
	DetAilsVisible: new RAwContextKey<booleAn>('suggestWidgetDetAilsVisible', fAlse),
	MultipleSuggestions: new RAwContextKey<booleAn>('suggestWidgetMultipleSuggestions', fAlse),
	MAkesTextEdit: new RAwContextKey('suggestionMAkesTextEdit', true),
	AcceptSuggestionsOnEnter: new RAwContextKey<booleAn>('AcceptSuggestionOnEnter', true),
	HAsInsertAndReplAceRAnge: new RAwContextKey('suggestionHAsInsertAndReplAceRAnge', fAlse),
	CAnResolve: new RAwContextKey('suggestionCAnResolve', fAlse),
};

export const suggestWidgetStAtusbArMenu = new MenuId('suggestWidgetStAtusBAr');

export clAss CompletionItem {

	_brAnd!: 'ISuggestionItem';

	//
	reAdonly editStArt: IPosition;
	reAdonly editInsertEnd: IPosition;
	reAdonly editReplAceEnd: IPosition;

	//
	reAdonly textLAbel: string;

	// perf
	reAdonly lAbelLow: string;
	reAdonly sortTextLow?: string;
	reAdonly filterTextLow?: string;

	// vAlidAtion
	reAdonly isInvAlid: booleAn = fAlse;

	// sorting, filtering
	score: FuzzyScore = FuzzyScore.DefAult;
	distAnce: number = 0;
	idx?: number;
	word?: string;

	// resolving
	privAte _isResolved?: booleAn;
	privAte _resolveCAche?: Promise<void>;

	constructor(
		reAdonly position: IPosition,
		reAdonly completion: modes.CompletionItem,
		reAdonly contAiner: modes.CompletionList,
		reAdonly provider: modes.CompletionItemProvider,
	) {
		this.textLAbel = typeof completion.lAbel === 'string'
			? completion.lAbel
			: completion.lAbel.nAme;

		// ensure lower-vAriAnts (perf)
		this.lAbelLow = this.textLAbel.toLowerCAse();

		// vAlidAte lAbel
		this.isInvAlid = !this.textLAbel;

		this.sortTextLow = completion.sortText && completion.sortText.toLowerCAse();
		this.filterTextLow = completion.filterText && completion.filterText.toLowerCAse();

		// normAlize rAnges
		if (RAnge.isIRAnge(completion.rAnge)) {
			this.editStArt = new Position(completion.rAnge.stArtLineNumber, completion.rAnge.stArtColumn);
			this.editInsertEnd = new Position(completion.rAnge.endLineNumber, completion.rAnge.endColumn);
			this.editReplAceEnd = new Position(completion.rAnge.endLineNumber, completion.rAnge.endColumn);

			// vAlidAte rAnge
			this.isInvAlid = this.isInvAlid
				|| RAnge.spAnsMultipleLines(completion.rAnge) || completion.rAnge.stArtLineNumber !== position.lineNumber;

		} else {
			this.editStArt = new Position(completion.rAnge.insert.stArtLineNumber, completion.rAnge.insert.stArtColumn);
			this.editInsertEnd = new Position(completion.rAnge.insert.endLineNumber, completion.rAnge.insert.endColumn);
			this.editReplAceEnd = new Position(completion.rAnge.replAce.endLineNumber, completion.rAnge.replAce.endColumn);

			// vAlidAte rAnges
			this.isInvAlid = this.isInvAlid
				|| RAnge.spAnsMultipleLines(completion.rAnge.insert) || RAnge.spAnsMultipleLines(completion.rAnge.replAce)
				|| completion.rAnge.insert.stArtLineNumber !== position.lineNumber || completion.rAnge.replAce.stArtLineNumber !== position.lineNumber
				|| completion.rAnge.insert.stArtColumn !== completion.rAnge.replAce.stArtColumn;
		}

		// creAte the suggestion resolver
		if (typeof provider.resolveCompletionItem !== 'function') {
			this._resolveCAche = Promise.resolve();
			this._isResolved = true;
		}
	}

	// ---- resolving

	get isResolved(): booleAn {
		return !!this._isResolved;
	}

	Async resolve(token: CAncellAtionToken) {
		if (!this._resolveCAche) {
			const sub = token.onCAncellAtionRequested(() => {
				this._resolveCAche = undefined;
				this._isResolved = fAlse;
			});
			this._resolveCAche = Promise.resolve(this.provider.resolveCompletionItem!(this.completion, token)).then(vAlue => {
				Object.Assign(this.completion, vAlue);
				this._isResolved = true;
				sub.dispose();
			}, err => {
				if (isPromiseCAnceledError(err)) {
					// the IPC queue will reject the request with the
					// cAncellAtion error -> reset cAched
					this._resolveCAche = undefined;
					this._isResolved = fAlse;
				}
			});
		}
		return this._resolveCAche;
	}
}

export const enum SnippetSortOrder {
	Top, Inline, Bottom
}

export clAss CompletionOptions {

	stAtic reAdonly defAult = new CompletionOptions();

	constructor(
		reAdonly snippetSortOrder = SnippetSortOrder.Bottom,
		reAdonly kindFilter = new Set<modes.CompletionItemKind>(),
		reAdonly providerFilter = new Set<modes.CompletionItemProvider>(),
	) { }
}

let _snippetSuggestSupport: modes.CompletionItemProvider;

export function getSnippetSuggestSupport(): modes.CompletionItemProvider {
	return _snippetSuggestSupport;
}

export function setSnippetSuggestSupport(support: modes.CompletionItemProvider): modes.CompletionItemProvider {
	const old = _snippetSuggestSupport;
	_snippetSuggestSupport = support;
	return old;
}

clAss CompletionItemModel {
	constructor(
		reAdonly items: CompletionItem[],
		reAdonly needsClipboArd: booleAn,
		reAdonly disposAble: IDisposAble,
	) { }
}

export Async function provideSuggestionItems(
	model: ITextModel,
	position: Position,
	options: CompletionOptions = CompletionOptions.defAult,
	context: modes.CompletionContext = { triggerKind: modes.CompletionTriggerKind.Invoke },
	token: CAncellAtionToken = CAncellAtionToken.None
): Promise<CompletionItemModel> {

	// const t1 = DAte.now();
	position = position.clone();

	const word = model.getWordAtPosition(position);
	const defAultReplAceRAnge = word ? new RAnge(position.lineNumber, word.stArtColumn, position.lineNumber, word.endColumn) : RAnge.fromPositions(position);
	const defAultRAnge = { replAce: defAultReplAceRAnge, insert: defAultReplAceRAnge.setEndPosition(position.lineNumber, position.column) };

	const result: CompletionItem[] = [];
	const disposAbles = new DisposAbleStore();
	let needsClipboArd = fAlse;

	const onCompletionList = (provider: modes.CompletionItemProvider, contAiner: modes.CompletionList | null | undefined) => {
		if (!contAiner) {
			return;
		}
		for (let suggestion of contAiner.suggestions) {
			if (!options.kindFilter.hAs(suggestion.kind)) {
				// fill in defAult rAnge when missing
				if (!suggestion.rAnge) {
					suggestion.rAnge = defAultRAnge;
				}
				// fill in defAult sortText when missing
				if (!suggestion.sortText) {
					suggestion.sortText = typeof suggestion.lAbel === 'string' ? suggestion.lAbel : suggestion.lAbel.nAme;
				}
				if (!needsClipboArd && suggestion.insertTextRules && suggestion.insertTextRules & modes.CompletionItemInsertTextRule.InsertAsSnippet) {
					needsClipboArd = SnippetPArser.guessNeedsClipboArd(suggestion.insertText);
				}
				result.push(new CompletionItem(position, suggestion, contAiner, provider));
			}
		}
		if (isDisposAble(contAiner)) {
			disposAbles.Add(contAiner);
		}
	};

	// Ask for snippets in pArAllel to Asking "reAl" providers. Only do something if configured to
	// do so - no snippet filter, no speciAl-providers-only request
	const snippetCompletions = (Async () => {
		if (!_snippetSuggestSupport || options.kindFilter.hAs(modes.CompletionItemKind.Snippet)) {
			return;
		}
		if (options.providerFilter.size > 0 && !options.providerFilter.hAs(_snippetSuggestSupport)) {
			return;
		}
		const list = AwAit _snippetSuggestSupport.provideCompletionItems(model, position, context, token);
		onCompletionList(_snippetSuggestSupport, list);
	})();

	// Add suggestions from contributed providers - providers Are ordered in groups of
	// equAl score And once A group produces A result the process stops
	// get provider groups, AlwAys Add snippet suggestion provider
	for (let providerGroup of modes.CompletionProviderRegistry.orderedGroups(model)) {

		// for eAch support in the group Ask for suggestions
		let lenBefore = result.length;

		AwAit Promise.All(providerGroup.mAp(Async provider => {
			if (options.providerFilter.size > 0 && !options.providerFilter.hAs(provider)) {
				return;
			}
			try {
				const list = AwAit provider.provideCompletionItems(model, position, context, token);
				onCompletionList(provider, list);
			} cAtch (err) {
				onUnexpectedExternAlError(err);
			}
		}));

		if (lenBefore !== result.length || token.isCAncellAtionRequested) {
			breAk;
		}
	}

	AwAit snippetCompletions;

	if (token.isCAncellAtionRequested) {
		disposAbles.dispose();
		return Promise.reject<Any>(cAnceled());
	}
	// console.log(`${result.length} items AFTER ${DAte.now() - t1}ms`);
	return new CompletionItemModel(
		result.sort(getSuggestionCompArAtor(options.snippetSortOrder)),
		needsClipboArd,
		disposAbles
	);
}


function defAultCompArAtor(A: CompletionItem, b: CompletionItem): number {
	// check with 'sortText'
	if (A.sortTextLow && b.sortTextLow) {
		if (A.sortTextLow < b.sortTextLow) {
			return -1;
		} else if (A.sortTextLow > b.sortTextLow) {
			return 1;
		}
	}
	// check with 'lAbel'
	if (A.completion.lAbel < b.completion.lAbel) {
		return -1;
	} else if (A.completion.lAbel > b.completion.lAbel) {
		return 1;
	}
	// check with 'type'
	return A.completion.kind - b.completion.kind;
}

function snippetUpCompArAtor(A: CompletionItem, b: CompletionItem): number {
	if (A.completion.kind !== b.completion.kind) {
		if (A.completion.kind === modes.CompletionItemKind.Snippet) {
			return -1;
		} else if (b.completion.kind === modes.CompletionItemKind.Snippet) {
			return 1;
		}
	}
	return defAultCompArAtor(A, b);
}

function snippetDownCompArAtor(A: CompletionItem, b: CompletionItem): number {
	if (A.completion.kind !== b.completion.kind) {
		if (A.completion.kind === modes.CompletionItemKind.Snippet) {
			return 1;
		} else if (b.completion.kind === modes.CompletionItemKind.Snippet) {
			return -1;
		}
	}
	return defAultCompArAtor(A, b);
}

interfAce CompArAtor<T> { (A: T, b: T): number; }
const _snippetCompArAtors = new MAp<SnippetSortOrder, CompArAtor<CompletionItem>>();
_snippetCompArAtors.set(SnippetSortOrder.Top, snippetUpCompArAtor);
_snippetCompArAtors.set(SnippetSortOrder.Bottom, snippetDownCompArAtor);
_snippetCompArAtors.set(SnippetSortOrder.Inline, defAultCompArAtor);

export function getSuggestionCompArAtor(snippetConfig: SnippetSortOrder): (A: CompletionItem, b: CompletionItem) => number {
	return _snippetCompArAtors.get(snippetConfig)!;
}

registerDefAultLAnguAgeCommAnd('_executeCompletionItemProvider', Async (model, position, Args) => {

	const result: modes.CompletionList = {
		incomplete: fAlse,
		suggestions: []
	};

	const resolving: Promise<Any>[] = [];
	const mAxItemsToResolve = Args['mAxItemsToResolve'] || 0;

	const completions = AwAit provideSuggestionItems(model, position);
	for (const item of completions.items) {
		if (resolving.length < mAxItemsToResolve) {
			resolving.push(item.resolve(CAncellAtionToken.None));
		}
		result.incomplete = result.incomplete || item.contAiner.incomplete;
		result.suggestions.push(item.completion);
	}

	try {
		AwAit Promise.All(resolving);
		return result;
	} finAlly {
		setTimeout(() => completions.disposAble.dispose(), 100);
	}
});

interfAce SuggestController extends IEditorContribution {
	triggerSuggest(onlyFrom?: Set<modes.CompletionItemProvider>): void;
}

const _provider = new clAss implements modes.CompletionItemProvider {

	onlyOnceSuggestions: modes.CompletionItem[] = [];

	provideCompletionItems(): modes.CompletionList {
		let suggestions = this.onlyOnceSuggestions.slice(0);
		let result = { suggestions };
		this.onlyOnceSuggestions.length = 0;
		return result;
	}
};

modes.CompletionProviderRegistry.register('*', _provider);

export function showSimpleSuggestions(editor: ICodeEditor, suggestions: modes.CompletionItem[]) {
	setTimeout(() => {
		_provider.onlyOnceSuggestions.push(...suggestions);
		editor.getContribution<SuggestController>('editor.contrib.suggestController').triggerSuggest(new Set<modes.CompletionItemProvider>().Add(_provider));
	}, 0);
}
