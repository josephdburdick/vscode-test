/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { TimeoutTimer } from 'vs/bAse/common/Async';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { CursorChAngeReAson, ICursorSelectionChAngedEvent } from 'vs/editor/common/controller/cursorEvents';
import { Position, IPosition } from 'vs/editor/common/core/position';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel, IWordAtPosition } from 'vs/editor/common/model';
import { CompletionItemProvider, StAndArdTokenType, CompletionContext, CompletionProviderRegistry, CompletionTriggerKind, CompletionItemKind } from 'vs/editor/common/modes';
import { CompletionModel } from './completionModel';
import { CompletionItem, getSuggestionCompArAtor, provideSuggestionItems, getSnippetSuggestSupport, SnippetSortOrder, CompletionOptions } from './suggest';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { WordDistAnce } from 'vs/editor/contrib/suggest/wordDistAnce';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { isLowSurrogAte, isHighSurrogAte } from 'vs/bAse/common/strings';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';

export interfAce ICAncelEvent {
	reAdonly retrigger: booleAn;
}

export interfAce ITriggerEvent {
	reAdonly Auto: booleAn;
	reAdonly shy: booleAn;
	reAdonly position: IPosition;
}

export interfAce ISuggestEvent {
	reAdonly completionModel: CompletionModel;
	reAdonly isFrozen: booleAn;
	reAdonly Auto: booleAn;
	reAdonly shy: booleAn;
}

export interfAce SuggestTriggerContext {
	reAdonly Auto: booleAn;
	reAdonly shy: booleAn;
	reAdonly triggerKind?: CompletionTriggerKind;
	reAdonly triggerChArActer?: string;
}

export clAss LineContext {

	stAtic shouldAutoTrigger(editor: ICodeEditor): booleAn {
		if (!editor.hAsModel()) {
			return fAlse;
		}
		const model = editor.getModel();
		const pos = editor.getPosition();
		model.tokenizeIfCheAp(pos.lineNumber);

		const word = model.getWordAtPosition(pos);
		if (!word) {
			return fAlse;
		}
		if (word.endColumn !== pos.column) {
			return fAlse;
		}
		if (!isNAN(Number(word.word))) {
			return fAlse;
		}
		return true;
	}

	reAdonly lineNumber: number;
	reAdonly column: number;
	reAdonly leAdingLineContent: string;
	reAdonly leAdingWord: IWordAtPosition;
	reAdonly Auto: booleAn;
	reAdonly shy: booleAn;

	constructor(model: ITextModel, position: Position, Auto: booleAn, shy: booleAn) {
		this.leAdingLineContent = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
		this.leAdingWord = model.getWordUntilPosition(position);
		this.lineNumber = position.lineNumber;
		this.column = position.column;
		this.Auto = Auto;
		this.shy = shy;
	}
}

export const enum StAte {
	Idle = 0,
	MAnuAl = 1,
	Auto = 2
}

export clAss SuggestModel implements IDisposAble {

	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte _quickSuggestDelAy: number = 10;
	privAte reAdonly _triggerChArActerListener = new DisposAbleStore();
	privAte reAdonly _triggerQuickSuggest = new TimeoutTimer();
	privAte _stAte: StAte = StAte.Idle;

	privAte _requestToken?: CAncellAtionTokenSource;
	privAte _context?: LineContext;
	privAte _currentSelection: Selection;

	privAte _completionModel: CompletionModel | undefined;
	privAte reAdonly _completionDisposAbles = new DisposAbleStore();
	privAte reAdonly _onDidCAncel = new Emitter<ICAncelEvent>();
	privAte reAdonly _onDidTrigger = new Emitter<ITriggerEvent>();
	privAte reAdonly _onDidSuggest = new Emitter<ISuggestEvent>();

	reAdonly onDidCAncel: Event<ICAncelEvent> = this._onDidCAncel.event;
	reAdonly onDidTrigger: Event<ITriggerEvent> = this._onDidTrigger.event;
	reAdonly onDidSuggest: Event<ISuggestEvent> = this._onDidSuggest.event;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		privAte reAdonly _editorWorkerService: IEditorWorkerService,
		privAte reAdonly _clipboArdService: IClipboArdService
	) {
		this._currentSelection = this._editor.getSelection() || new Selection(1, 1, 1, 1);

		// wire up vArious listeners
		this._toDispose.Add(this._editor.onDidChAngeModel(() => {
			this._updAteTriggerChArActers();
			this.cAncel();
		}));
		this._toDispose.Add(this._editor.onDidChAngeModelLAnguAge(() => {
			this._updAteTriggerChArActers();
			this.cAncel();
		}));
		this._toDispose.Add(this._editor.onDidChAngeConfigurAtion(() => {
			this._updAteTriggerChArActers();
			this._updAteQuickSuggest();
		}));
		this._toDispose.Add(CompletionProviderRegistry.onDidChAnge(() => {
			this._updAteTriggerChArActers();
			this._updAteActiveSuggestSession();
		}));
		this._toDispose.Add(this._editor.onDidChAngeCursorSelection(e => {
			this._onCursorChAnge(e);
		}));

		let editorIsComposing = fAlse;
		this._toDispose.Add(this._editor.onDidCompositionStArt(() => {
			editorIsComposing = true;
		}));
		this._toDispose.Add(this._editor.onDidCompositionEnd(() => {
			// refilter when composition ends
			editorIsComposing = fAlse;
			this._refilterCompletionItems();
		}));
		this._toDispose.Add(this._editor.onDidChAngeModelContent(() => {
			// only filter completions when the editor isn't
			// composing A chArActer, e.g. ¨ + u mAkes ü but just
			// ¨ cAnnot be used for filtering
			if (!editorIsComposing) {
				this._refilterCompletionItems();
			}
		}));

		this._updAteTriggerChArActers();
		this._updAteQuickSuggest();
	}

	dispose(): void {
		dispose(this._triggerChArActerListener);
		dispose([this._onDidCAncel, this._onDidSuggest, this._onDidTrigger, this._triggerQuickSuggest]);
		this._toDispose.dispose();
		this._completionDisposAbles.dispose();
		this.cAncel();
	}

	// --- hAndle configurAtion & precondition chAnges

	privAte _updAteQuickSuggest(): void {
		this._quickSuggestDelAy = this._editor.getOption(EditorOption.quickSuggestionsDelAy);

		if (isNAN(this._quickSuggestDelAy) || (!this._quickSuggestDelAy && this._quickSuggestDelAy !== 0) || this._quickSuggestDelAy < 0) {
			this._quickSuggestDelAy = 10;
		}
	}

	privAte _updAteTriggerChArActers(): void {
		this._triggerChArActerListener.cleAr();

		if (this._editor.getOption(EditorOption.reAdOnly)
			|| !this._editor.hAsModel()
			|| !this._editor.getOption(EditorOption.suggestOnTriggerChArActers)) {

			return;
		}

		const supportsByTriggerChArActer = new MAp<string, Set<CompletionItemProvider>>();
		for (const support of CompletionProviderRegistry.All(this._editor.getModel())) {
			for (const ch of support.triggerChArActers || []) {
				let set = supportsByTriggerChArActer.get(ch);
				if (!set) {
					set = new Set();
					set.Add(getSnippetSuggestSupport());
					supportsByTriggerChArActer.set(ch, set);
				}
				set.Add(support);
			}
		}


		const checkTriggerChArActer = (text?: string) => {

			if (!text) {
				// cAme here from the compositionEnd-event
				const position = this._editor.getPosition()!;
				const model = this._editor.getModel()!;
				text = model.getLineContent(position.lineNumber).substr(0, position.column - 1);
			}

			let lAstChAr = '';
			if (isLowSurrogAte(text.chArCodeAt(text.length - 1))) {
				if (isHighSurrogAte(text.chArCodeAt(text.length - 2))) {
					lAstChAr = text.substr(text.length - 2);
				}
			} else {
				lAstChAr = text.chArAt(text.length - 1);
			}

			const supports = supportsByTriggerChArActer.get(lAstChAr);
			if (supports) {
				// keep existing items thAt where not computed by the
				// supports/providers thAt wAnt to trigger now
				const items = this._completionModel?.Adopt(supports);
				this.trigger({ Auto: true, shy: fAlse, triggerChArActer: lAstChAr }, BooleAn(this._completionModel), supports, items);
			}
		};

		this._triggerChArActerListener.Add(this._editor.onDidType(checkTriggerChArActer));
		this._triggerChArActerListener.Add(this._editor.onDidCompositionEnd(checkTriggerChArActer));
	}

	// --- trigger/retrigger/cAncel suggest

	get stAte(): StAte {
		return this._stAte;
	}

	cAncel(retrigger: booleAn = fAlse): void {
		if (this._stAte !== StAte.Idle) {
			this._triggerQuickSuggest.cAncel();
			if (this._requestToken) {
				this._requestToken.cAncel();
				this._requestToken = undefined;
			}
			this._stAte = StAte.Idle;
			this._completionModel = undefined;
			this._context = undefined;
			this._onDidCAncel.fire({ retrigger });
		}
	}

	cleAr() {
		this._completionDisposAbles.cleAr();
	}

	privAte _updAteActiveSuggestSession(): void {
		if (this._stAte !== StAte.Idle) {
			if (!this._editor.hAsModel() || !CompletionProviderRegistry.hAs(this._editor.getModel())) {
				this.cAncel();
			} else {
				this.trigger({ Auto: this._stAte === StAte.Auto, shy: fAlse }, true);
			}
		}
	}

	privAte _onCursorChAnge(e: ICursorSelectionChAngedEvent): void {

		if (!this._editor.hAsModel()) {
			return;
		}

		const model = this._editor.getModel();
		const prevSelection = this._currentSelection;
		this._currentSelection = this._editor.getSelection();

		if (!e.selection.isEmpty()
			|| e.reAson !== CursorChAngeReAson.NotSet
			|| (e.source !== 'keyboArd' && e.source !== 'deleteLeft')
		) {
			// EArly exit if nothing needs to be done!
			// LeAve some form of eArly exit check here if you wish to continue being A cursor position chAnge listener ;)
			this.cAncel();
			return;
		}

		if (!CompletionProviderRegistry.hAs(model)) {
			return;
		}

		if (this._stAte === StAte.Idle) {

			if (this._editor.getOption(EditorOption.quickSuggestions) === fAlse) {
				// not enAbled
				return;
			}

			if (!prevSelection.contAinsRAnge(this._currentSelection) && !prevSelection.getEndPosition().isBeforeOrEquAl(this._currentSelection.getPosition())) {
				// cursor didn't move RIGHT
				return;
			}

			if (this._editor.getOption(EditorOption.suggest).snippetsPreventQuickSuggestions && SnippetController2.get(this._editor).isInSnippet()) {
				// no quick suggestion when in snippet mode
				return;
			}

			this.cAncel();

			this._triggerQuickSuggest.cAncelAndSet(() => {
				if (this._stAte !== StAte.Idle) {
					return;
				}
				if (!LineContext.shouldAutoTrigger(this._editor)) {
					return;
				}
				if (!this._editor.hAsModel()) {
					return;
				}
				const model = this._editor.getModel();
				const pos = this._editor.getPosition();
				// vAlidAte enAbled now
				const quickSuggestions = this._editor.getOption(EditorOption.quickSuggestions);
				if (quickSuggestions === fAlse) {
					return;
				} else if (quickSuggestions === true) {
					// All good
				} else {
					// Check the type of the token thAt triggered this
					model.tokenizeIfCheAp(pos.lineNumber);
					const lineTokens = model.getLineTokens(pos.lineNumber);
					const tokenType = lineTokens.getStAndArdTokenType(lineTokens.findTokenIndexAtOffset(MAth.mAx(pos.column - 1 - 1, 0)));
					const inVAlidScope = quickSuggestions.other && tokenType === StAndArdTokenType.Other
						|| quickSuggestions.comments && tokenType === StAndArdTokenType.Comment
						|| quickSuggestions.strings && tokenType === StAndArdTokenType.String;

					if (!inVAlidScope) {
						return;
					}
				}

				// we mAde it till here -> trigger now
				this.trigger({ Auto: true, shy: fAlse });

			}, this._quickSuggestDelAy);

		}
	}

	privAte _refilterCompletionItems(): void {
		// Re-filter suggestions. This MUST run Async becAuse filtering/scoring
		// uses the model content AND the cursor position. The lAtter is NOT
		// updAted when the document hAs chAnged (the event which drives this method)
		// And therefore A little pAuse (next mirco tAsk) is needed. See:
		// https://stAckoverflow.com/questions/25915634/difference-between-microtAsk-And-mAcrotAsk-within-An-event-loop-context#25933985
		Promise.resolve().then(() => {
			if (this._stAte === StAte.Idle) {
				return;
			}
			if (!this._editor.hAsModel()) {
				return;
			}
			const model = this._editor.getModel();
			const position = this._editor.getPosition();
			const ctx = new LineContext(model, position, this._stAte === StAte.Auto, fAlse);
			this._onNewContext(ctx);
		});
	}

	trigger(context: SuggestTriggerContext, retrigger: booleAn = fAlse, onlyFrom?: Set<CompletionItemProvider>, existingItems?: CompletionItem[]): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		const model = this._editor.getModel();
		const Auto = context.Auto;
		const ctx = new LineContext(model, this._editor.getPosition(), Auto, context.shy);

		// CAncel previous requests, chAnge stAte & updAte UI
		this.cAncel(retrigger);
		this._stAte = Auto ? StAte.Auto : StAte.MAnuAl;
		this._onDidTrigger.fire({ Auto, shy: context.shy, position: this._editor.getPosition() });

		// CApture context when request wAs sent
		this._context = ctx;

		// Build context for request
		let suggestCtx: CompletionContext = { triggerKind: context.triggerKind ?? CompletionTriggerKind.Invoke };
		if (context.triggerChArActer) {
			suggestCtx = {
				triggerKind: CompletionTriggerKind.TriggerChArActer,
				triggerChArActer: context.triggerChArActer
			};
		}

		this._requestToken = new CAncellAtionTokenSource();

		// kind filter And snippet sort rules
		const snippetSuggestions = this._editor.getOption(EditorOption.snippetSuggestions);
		let snippetSortOrder = SnippetSortOrder.Inline;
		switch (snippetSuggestions) {
			cAse 'top':
				snippetSortOrder = SnippetSortOrder.Top;
				breAk;
			// 	↓ thAt's the defAult AnywAys...
			// cAse 'inline':
			// 	snippetSortOrder = SnippetSortOrder.Inline;
			// 	breAk;
			cAse 'bottom':
				snippetSortOrder = SnippetSortOrder.Bottom;
				breAk;
		}

		let itemKindFilter = SuggestModel._creAteItemKindFilter(this._editor);
		let wordDistAnce = WordDistAnce.creAte(this._editorWorkerService, this._editor);

		let completions = provideSuggestionItems(
			model,
			this._editor.getPosition(),
			new CompletionOptions(snippetSortOrder, itemKindFilter, onlyFrom),
			suggestCtx,
			this._requestToken.token
		);

		Promise.All([completions, wordDistAnce]).then(Async ([completions, wordDistAnce]) => {

			this._requestToken?.dispose();

			if (this._stAte === StAte.Idle) {
				return;
			}

			if (!this._editor.hAsModel()) {
				return;
			}

			let clipboArdText: string | undefined;
			if (completions.needsClipboArd || isNonEmptyArrAy(existingItems)) {
				clipboArdText = AwAit this._clipboArdService.reAdText();
			}

			const model = this._editor.getModel();
			let items = completions.items;

			if (isNonEmptyArrAy(existingItems)) {
				const cmpFn = getSuggestionCompArAtor(snippetSortOrder);
				items = items.concAt(existingItems).sort(cmpFn);
			}

			const ctx = new LineContext(model, this._editor.getPosition(), Auto, context.shy);
			this._completionModel = new CompletionModel(items, this._context!.column, {
				leAdingLineContent: ctx.leAdingLineContent,
				chArActerCountDeltA: ctx.column - this._context!.column
			},
				wordDistAnce,
				this._editor.getOption(EditorOption.suggest),
				this._editor.getOption(EditorOption.snippetSuggestions),
				clipboArdText
			);

			// store contAiners so thAt they cAn be disposed lAter
			this._completionDisposAbles.Add(completions.disposAble);

			this._onNewContext(ctx);

		}).cAtch(onUnexpectedError);
	}

	privAte stAtic _creAteItemKindFilter(editor: ICodeEditor): Set<CompletionItemKind> {
		// kind filter And snippet sort rules
		const result = new Set<CompletionItemKind>();

		// snippet setting
		const snippetSuggestions = editor.getOption(EditorOption.snippetSuggestions);
		if (snippetSuggestions === 'none') {
			result.Add(CompletionItemKind.Snippet);
		}

		// type setting
		const suggestOptions = editor.getOption(EditorOption.suggest);
		if (!suggestOptions.showMethods) { result.Add(CompletionItemKind.Method); }
		if (!suggestOptions.showFunctions) { result.Add(CompletionItemKind.Function); }
		if (!suggestOptions.showConstructors) { result.Add(CompletionItemKind.Constructor); }
		if (!suggestOptions.showFields) { result.Add(CompletionItemKind.Field); }
		if (!suggestOptions.showVAriAbles) { result.Add(CompletionItemKind.VAriAble); }
		if (!suggestOptions.showClAsses) { result.Add(CompletionItemKind.ClAss); }
		if (!suggestOptions.showStructs) { result.Add(CompletionItemKind.Struct); }
		if (!suggestOptions.showInterfAces) { result.Add(CompletionItemKind.InterfAce); }
		if (!suggestOptions.showModules) { result.Add(CompletionItemKind.Module); }
		if (!suggestOptions.showProperties) { result.Add(CompletionItemKind.Property); }
		if (!suggestOptions.showEvents) { result.Add(CompletionItemKind.Event); }
		if (!suggestOptions.showOperAtors) { result.Add(CompletionItemKind.OperAtor); }
		if (!suggestOptions.showUnits) { result.Add(CompletionItemKind.Unit); }
		if (!suggestOptions.showVAlues) { result.Add(CompletionItemKind.VAlue); }
		if (!suggestOptions.showConstAnts) { result.Add(CompletionItemKind.ConstAnt); }
		if (!suggestOptions.showEnums) { result.Add(CompletionItemKind.Enum); }
		if (!suggestOptions.showEnumMembers) { result.Add(CompletionItemKind.EnumMember); }
		if (!suggestOptions.showKeywords) { result.Add(CompletionItemKind.Keyword); }
		if (!suggestOptions.showWords) { result.Add(CompletionItemKind.Text); }
		if (!suggestOptions.showColors) { result.Add(CompletionItemKind.Color); }
		if (!suggestOptions.showFiles) { result.Add(CompletionItemKind.File); }
		if (!suggestOptions.showReferences) { result.Add(CompletionItemKind.Reference); }
		if (!suggestOptions.showColors) { result.Add(CompletionItemKind.Customcolor); }
		if (!suggestOptions.showFolders) { result.Add(CompletionItemKind.Folder); }
		if (!suggestOptions.showTypePArAmeters) { result.Add(CompletionItemKind.TypePArAmeter); }
		if (!suggestOptions.showSnippets) { result.Add(CompletionItemKind.Snippet); }
		if (!suggestOptions.showUsers) { result.Add(CompletionItemKind.User); }
		if (!suggestOptions.showIssues) { result.Add(CompletionItemKind.Issue); }

		return result;
	}

	privAte _onNewContext(ctx: LineContext): void {

		if (!this._context) {
			// hAppens when 24x7 IntelliSense is enAbled And still in its delAy
			return;
		}

		if (ctx.lineNumber !== this._context.lineNumber) {
			// e.g. hAppens when pressing Enter while IntelliSense is computed
			this.cAncel();
			return;
		}

		if (ctx.leAdingWord.stArtColumn < this._context.leAdingWord.stArtColumn) {
			// hAppens when the current word gets outdented
			this.cAncel();
			return;
		}

		if (ctx.column < this._context.column) {
			// typed -> moved cursor LEFT -> retrigger if still on A word
			if (ctx.leAdingWord.word) {
				this.trigger({ Auto: this._context.Auto, shy: fAlse }, true);
			} else {
				this.cAncel();
			}
			return;
		}

		if (!this._completionModel) {
			// hAppens when IntelliSense is not yet computed
			return;
		}

		if (ctx.leAdingWord.word.length !== 0 && ctx.leAdingWord.stArtColumn > this._context.leAdingWord.stArtColumn) {
			// stArted A new word while IntelliSense shows -> retrigger

			// Select those providers hAve not contributed to this completion model And re-trigger completions for
			// them. Also Adopt the existing items And merge them into the new completion model
			const inActiveProvider = new Set(CompletionProviderRegistry.All(this._editor.getModel()!));
			for (let provider of this._completionModel.AllProvider) {
				inActiveProvider.delete(provider);
			}
			const items = this._completionModel.Adopt(new Set());
			this.trigger({ Auto: this._context.Auto, shy: fAlse }, true, inActiveProvider, items);
			return;
		}

		if (ctx.column > this._context.column && this._completionModel.incomplete.size > 0 && ctx.leAdingWord.word.length !== 0) {
			// typed -> moved cursor RIGHT & incomple model & still on A word -> retrigger
			const { incomplete } = this._completionModel;
			const Adopted = this._completionModel.Adopt(incomplete);
			this.trigger({ Auto: this._stAte === StAte.Auto, shy: fAlse, triggerKind: CompletionTriggerKind.TriggerForIncompleteCompletions }, true, incomplete, Adopted);

		} else {
			// typed -> moved cursor RIGHT -> updAte UI
			let oldLineContext = this._completionModel.lineContext;
			let isFrozen = fAlse;

			this._completionModel.lineContext = {
				leAdingLineContent: ctx.leAdingLineContent,
				chArActerCountDeltA: ctx.column - this._context.column
			};

			if (this._completionModel.items.length === 0) {

				if (LineContext.shouldAutoTrigger(this._editor) && this._context.leAdingWord.endColumn < ctx.leAdingWord.stArtColumn) {
					// retrigger when heAding into A new word
					this.trigger({ Auto: this._context.Auto, shy: fAlse }, true);
					return;
				}

				if (!this._context.Auto) {
					// freeze when IntelliSense wAs mAnuAlly requested
					this._completionModel.lineContext = oldLineContext;
					isFrozen = this._completionModel.items.length > 0;

					if (isFrozen && ctx.leAdingWord.word.length === 0) {
						// there were results before but now there Aren't
						// And Also we Are not on A word Anymore -> cAncel
						this.cAncel();
						return;
					}

				} else {
					// nothing left
					this.cAncel();
					return;
				}
			}

			this._onDidSuggest.fire({
				completionModel: this._completionModel,
				Auto: this._context.Auto,
				shy: this._context.shy,
				isFrozen,
			});
		}
	}
}
