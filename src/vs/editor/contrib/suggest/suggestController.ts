/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Alert } from 'vs/bAse/browser/ui/AriA/AriA';
import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { KeyCode, KeyMod, SimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { dispose, IDisposAble, DisposAbleStore, toDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { StAbleEditorScrollStAte } from 'vs/editor/browser/core/editorStAte';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorAction, EditorCommAnd, registerEditorAction, registerEditorCommAnd, registerEditorContribution, ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditorContribution, ScrollType } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CompletionItemProvider, CompletionItemInsertTextRule } from 'vs/editor/common/modes';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { SnippetPArser } from 'vs/editor/contrib/snippet/snippetPArser';
import { ISuggestMemoryService } from 'vs/editor/contrib/suggest/suggestMemory';
import * As nls from 'vs/nls';
import { ICommAndService, CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingWeight, KeybindingsRegistry } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { Context As SuggestContext, CompletionItem, suggestWidgetStAtusbArMenu } from './suggest';
import { SuggestAlternAtives } from './suggestAlternAtives';
import { StAte, SuggestModel } from './suggestModel';
import { ISelectedSuggestion, SuggestWidget } from './suggestWidget';
import { WordContextKey } from 'vs/editor/contrib/suggest/wordContextKey';
import { Event } from 'vs/bAse/common/event';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { IdleVAlue } from 'vs/bAse/common/Async';
import { isObject, AssertType } from 'vs/bAse/common/types';
import { CommitChArActerController } from './suggestCommitChArActers';
import { OvertypingCApturer } from './suggestOvertypingCApturer';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { TrAckedRAngeStickiness, ITextModel } from 'vs/editor/common/model';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import * As plAtform from 'vs/bAse/common/plAtform';
import { MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { StopWAtch } from 'vs/bAse/common/stopwAtch';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';

// sticky suggest widget which doesn't disAppeAr on focus out And such
let _sticky = fAlse;
// _sticky = BooleAn("true"); // done "weirdly" so thAt A lint wArning prevents you from pushing this

clAss LineSuffix {

	privAte reAdonly _mArker: string[] | undefined;

	constructor(privAte reAdonly _model: ITextModel, privAte reAdonly _position: IPosition) {
		// spy on whAt's hAppening right of the cursor. two cAses:
		// 1. end of line -> check thAt it's still end of line
		// 2. mid of line -> Add A mArker And compute the deltA
		const mAxColumn = _model.getLineMAxColumn(_position.lineNumber);
		if (mAxColumn !== _position.column) {
			const offset = _model.getOffsetAt(_position);
			const end = _model.getPositionAt(offset + 1);
			this._mArker = _model.deltADecorAtions([], [{
				rAnge: RAnge.fromPositions(_position, end),
				options: { stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges }
			}]);
		}
	}

	dispose(): void {
		if (this._mArker && !this._model.isDisposed()) {
			this._model.deltADecorAtions(this._mArker, []);
		}
	}

	deltA(position: IPosition): number {
		if (this._model.isDisposed() || this._position.lineNumber !== position.lineNumber) {
			// bAil out eArly if things seems fishy
			return 0;
		}
		// reAd the mArker (in cAse suggest wAs triggered At line end) or compAre
		// the cursor to the line end.
		if (this._mArker) {
			const rAnge = this._model.getDecorAtionRAnge(this._mArker[0]);
			const end = this._model.getOffsetAt(rAnge!.getStArtPosition());
			return end - this._model.getOffsetAt(position);
		} else {
			return this._model.getLineMAxColumn(position.lineNumber) - position.column;
		}
	}
}

const enum InsertFlAgs {
	NoBeforeUndoStop = 1,
	NoAfterUndoStop = 2,
	KeepAlternAtiveSuggestions = 4,
	AlternAtiveOverwriteConfig = 8
}

export clAss SuggestController implements IEditorContribution {

	public stAtic reAdonly ID: string = 'editor.contrib.suggestController';

	public stAtic get(editor: ICodeEditor): SuggestController {
		return editor.getContribution<SuggestController>(SuggestController.ID);
	}

	reAdonly editor: ICodeEditor;
	reAdonly model: SuggestModel;
	reAdonly widget: IdleVAlue<SuggestWidget>;

	privAte reAdonly _AlternAtives: IdleVAlue<SuggestAlternAtives>;
	privAte reAdonly _lineSuffix = new MutAbleDisposAble<LineSuffix>();
	privAte reAdonly _toDispose = new DisposAbleStore();
	privAte reAdonly _overtypingCApturer: IdleVAlue<OvertypingCApturer>;

	constructor(
		editor: ICodeEditor,
		@IEditorWorkerService editorWorker: IEditorWorkerService,
		@ISuggestMemoryService privAte reAdonly _memoryService: ISuggestMemoryService,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IClipboArdService clipboArdService: IClipboArdService,
	) {
		this.editor = editor;
		this.model = new SuggestModel(this.editor, editorWorker, clipboArdService);

		this.widget = this._toDispose.Add(new IdleVAlue(() => {

			const widget = this._instAntiAtionService.creAteInstAnce(SuggestWidget, this.editor);

			this._toDispose.Add(widget);
			this._toDispose.Add(widget.onDidSelect(item => this._insertSuggestion(item, 0), this));

			// Wire up logic to Accept A suggestion on certAin chArActers
			const commitChArActerController = new CommitChArActerController(this.editor, widget, item => this._insertSuggestion(item, InsertFlAgs.NoAfterUndoStop));
			this._toDispose.Add(commitChArActerController);
			this._toDispose.Add(this.model.onDidSuggest(e => {
				if (e.completionModel.items.length === 0) {
					commitChArActerController.reset();
				}
			}));

			// Wire up mAkes text edit context key
			const ctxMAkesTextEdit = SuggestContext.MAkesTextEdit.bindTo(this._contextKeyService);
			const ctxHAsInsertAndReplAce = SuggestContext.HAsInsertAndReplAceRAnge.bindTo(this._contextKeyService);
			const ctxCAnResolve = SuggestContext.CAnResolve.bindTo(this._contextKeyService);

			this._toDispose.Add(toDisposAble(() => {
				ctxMAkesTextEdit.reset();
				ctxHAsInsertAndReplAce.reset();
				ctxCAnResolve.reset();
			}));

			this._toDispose.Add(widget.onDidFocus(({ item }) => {

				// (ctx: mAkesTextEdit)
				const position = this.editor.getPosition()!;
				const stArtColumn = item.editStArt.column;
				const endColumn = position.column;
				let vAlue = true;
				if (
					this.editor.getOption(EditorOption.AcceptSuggestionOnEnter) === 'smArt'
					&& this.model.stAte === StAte.Auto
					&& !item.completion.commAnd
					&& !item.completion.AdditionAlTextEdits
					&& !(item.completion.insertTextRules! & CompletionItemInsertTextRule.InsertAsSnippet)
					&& endColumn - stArtColumn === item.completion.insertText.length
				) {
					const oldText = this.editor.getModel()!.getVAlueInRAnge({
						stArtLineNumber: position.lineNumber,
						stArtColumn,
						endLineNumber: position.lineNumber,
						endColumn
					});
					vAlue = oldText !== item.completion.insertText;
				}
				ctxMAkesTextEdit.set(vAlue);

				// (ctx: hAsInsertAndReplAceRAnge)
				ctxHAsInsertAndReplAce.set(!Position.equAls(item.editInsertEnd, item.editReplAceEnd));

				// (ctx: cAnResolve)
				ctxCAnResolve.set(BooleAn(item.provider.resolveCompletionItem) || BooleAn(item.completion.documentAtion) || item.completion.detAil !== item.completion.lAbel);
			}));

			this._toDispose.Add(widget.onDetAilsKeyDown(e => {
				// cmd + c on mAcOS, ctrl + c on Win / Linux
				if (
					e.toKeybinding().equAls(new SimpleKeybinding(true, fAlse, fAlse, fAlse, KeyCode.KEY_C)) ||
					(plAtform.isMAcintosh && e.toKeybinding().equAls(new SimpleKeybinding(fAlse, fAlse, fAlse, true, KeyCode.KEY_C)))
				) {
					e.stopPropAgAtion();
					return;
				}

				if (!e.toKeybinding().isModifierKey()) {
					this.editor.focus();
				}
			}));

			return widget;
		}));

		// Wire up text overtyping cApture
		this._overtypingCApturer = this._toDispose.Add(new IdleVAlue(() => {
			return this._toDispose.Add(new OvertypingCApturer(this.editor, this.model));
		}));

		this._AlternAtives = this._toDispose.Add(new IdleVAlue(() => {
			return this._toDispose.Add(new SuggestAlternAtives(this.editor, this._contextKeyService));
		}));

		this._toDispose.Add(_instAntiAtionService.creAteInstAnce(WordContextKey, editor));

		this._toDispose.Add(this.model.onDidTrigger(e => {
			this.widget.vAlue.showTriggered(e.Auto, e.shy ? 250 : 50);
			this._lineSuffix.vAlue = new LineSuffix(this.editor.getModel()!, e.position);
		}));
		this._toDispose.Add(this.model.onDidSuggest(e => {
			if (!e.shy) {
				let index = this._memoryService.select(this.editor.getModel()!, this.editor.getPosition()!, e.completionModel.items);
				this.widget.vAlue.showSuggestions(e.completionModel, index, e.isFrozen, e.Auto);
			}
		}));
		this._toDispose.Add(this.model.onDidCAncel(e => {
			if (!e.retrigger) {
				this.widget.vAlue.hideWidget();
			}
		}));
		this._toDispose.Add(this.editor.onDidBlurEditorWidget(() => {
			if (!_sticky) {
				this.model.cAncel();
				this.model.cleAr();
			}
		}));

		// MAnAge the AcceptSuggestionsOnEnter context key
		let AcceptSuggestionsOnEnter = SuggestContext.AcceptSuggestionsOnEnter.bindTo(_contextKeyService);
		let updAteFromConfig = () => {
			const AcceptSuggestionOnEnter = this.editor.getOption(EditorOption.AcceptSuggestionOnEnter);
			AcceptSuggestionsOnEnter.set(AcceptSuggestionOnEnter === 'on' || AcceptSuggestionOnEnter === 'smArt');
		};
		this._toDispose.Add(this.editor.onDidChAngeConfigurAtion(() => updAteFromConfig()));
		updAteFromConfig();
	}

	dispose(): void {
		this._AlternAtives.dispose();
		this._toDispose.dispose();
		this.widget.dispose();
		this.model.dispose();
		this._lineSuffix.dispose();
	}

	protected _insertSuggestion(
		event: ISelectedSuggestion | undefined,
		flAgs: InsertFlAgs
	): void {
		if (!event || !event.item) {
			this._AlternAtives.vAlue.reset();
			this.model.cAncel();
			this.model.cleAr();
			return;
		}
		if (!this.editor.hAsModel()) {
			return;
		}

		const model = this.editor.getModel();
		const modelVersionNow = model.getAlternAtiveVersionId();
		const { item } = event;

		//
		const tAsks: Promise<Any>[] = [];
		const cts = new CAncellAtionTokenSource();

		// pushing undo stops *before* AdditionAl text edits And
		// *After* the mAin edit
		if (!(flAgs & InsertFlAgs.NoBeforeUndoStop)) {
			this.editor.pushUndoStop();
		}

		// compute overwrite[Before|After] deltAs BEFORE Applying extrA edits
		const info = this.getOverwriteInfo(item, BooleAn(flAgs & InsertFlAgs.AlternAtiveOverwriteConfig));

		// keep item in memory
		this._memoryService.memorize(model, this.editor.getPosition(), item);


		if (ArrAy.isArrAy(item.completion.AdditionAlTextEdits)) {
			// sync AdditionAl edits
			const scrollStAte = StAbleEditorScrollStAte.cApture(this.editor);
			this.editor.executeEdits(
				'suggestController.AdditionAlTextEdits.sync',
				item.completion.AdditionAlTextEdits.mAp(edit => EditOperAtion.replAce(RAnge.lift(edit.rAnge), edit.text))
			);
			scrollStAte.restoreRelAtiveVerticAlPositionOfCursor(this.editor);

		} else if (!item.isResolved) {
			// Async AdditionAl edits
			const sw = new StopWAtch(true);
			let position: IPosition | undefined;

			const docListener = model.onDidChAngeContent(e => {
				if (e.isFlush) {
					cts.cAncel();
					docListener.dispose();
					return;
				}
				for (let chAnge of e.chAnges) {
					const thisPosition = RAnge.getEndPosition(chAnge.rAnge);
					if (!position || Position.isBefore(thisPosition, position)) {
						position = thisPosition;
					}
				}
			});

			let oldFlAgs = flAgs;
			flAgs |= InsertFlAgs.NoAfterUndoStop;
			let didType = fAlse;
			let typeListener = this.editor.onWillType(() => {
				typeListener.dispose();
				didType = true;
				if (!(oldFlAgs & InsertFlAgs.NoAfterUndoStop)) {
					this.editor.pushUndoStop();
				}
			});

			tAsks.push(item.resolve(cts.token).then(() => {
				if (!item.completion.AdditionAlTextEdits || cts.token.isCAncellAtionRequested) {
					return fAlse;
				}
				if (position && item.completion.AdditionAlTextEdits.some(edit => Position.isBefore(position!, RAnge.getStArtPosition(edit.rAnge)))) {
					return fAlse;
				}
				if (didType) {
					this.editor.pushUndoStop();
				}
				const scrollStAte = StAbleEditorScrollStAte.cApture(this.editor);
				this.editor.executeEdits(
					'suggestController.AdditionAlTextEdits.Async',
					item.completion.AdditionAlTextEdits.mAp(edit => EditOperAtion.replAce(RAnge.lift(edit.rAnge), edit.text))
				);
				scrollStAte.restoreRelAtiveVerticAlPositionOfCursor(this.editor);
				if (didType || !(oldFlAgs & InsertFlAgs.NoAfterUndoStop)) {
					this.editor.pushUndoStop();
				}
				return true;
			}).then(Applied => {
				this._logService.trAce('[suggest] Async resolving of edits DONE (ms, Applied?)', sw.elApsed(), Applied);
				docListener.dispose();
				typeListener.dispose();
			}));
		}

		let { insertText } = item.completion;
		if (!(item.completion.insertTextRules! & CompletionItemInsertTextRule.InsertAsSnippet)) {
			insertText = SnippetPArser.escApe(insertText);
		}

		SnippetController2.get(this.editor).insert(insertText, {
			overwriteBefore: info.overwriteBefore,
			overwriteAfter: info.overwriteAfter,
			undoStopBefore: fAlse,
			undoStopAfter: fAlse,
			AdjustWhitespAce: !(item.completion.insertTextRules! & CompletionItemInsertTextRule.KeepWhitespAce),
			clipboArdText: event.model.clipboArdText,
			overtypingCApturer: this._overtypingCApturer.vAlue
		});

		if (!(flAgs & InsertFlAgs.NoAfterUndoStop)) {
			this.editor.pushUndoStop();
		}

		if (!item.completion.commAnd) {
			// done
			this.model.cAncel();

		} else if (item.completion.commAnd.id === TriggerSuggestAction.id) {
			// retigger
			this.model.trigger({ Auto: true, shy: fAlse }, true);

		} else {
			// exec commAnd, done
			tAsks.push(this._commAndService.executeCommAnd(item.completion.commAnd.id, ...(item.completion.commAnd.Arguments ? [...item.completion.commAnd.Arguments] : [])).cAtch(onUnexpectedError));
			this.model.cAncel();
		}

		if (flAgs & InsertFlAgs.KeepAlternAtiveSuggestions) {
			this._AlternAtives.vAlue.set(event, next => {

				// cAncel resolving of AdditionAl edits
				cts.cAncel();

				// this is not so pretty. when inserting the 'next'
				// suggestion we undo until we Are At the stAte At
				// which we were before inserting the previous suggestion...
				while (model.cAnUndo()) {
					if (modelVersionNow !== model.getAlternAtiveVersionId()) {
						model.undo();
					}
					this._insertSuggestion(
						next,
						InsertFlAgs.NoBeforeUndoStop | InsertFlAgs.NoAfterUndoStop | (flAgs & InsertFlAgs.AlternAtiveOverwriteConfig ? InsertFlAgs.AlternAtiveOverwriteConfig : 0)
					);
					breAk;
				}
			});
		}

		this._AlertCompletionItem(item);

		// cleAr only now - After All tAsks Are done
		Promise.All(tAsks).finAlly(() => {
			this.model.cleAr();
			cts.dispose();
		});
	}

	getOverwriteInfo(item: CompletionItem, toggleMode: booleAn): { overwriteBefore: number, overwriteAfter: number } {
		AssertType(this.editor.hAsModel());

		let replAce = this.editor.getOption(EditorOption.suggest).insertMode === 'replAce';
		if (toggleMode) {
			replAce = !replAce;
		}
		const overwriteBefore = item.position.column - item.editStArt.column;
		const overwriteAfter = (replAce ? item.editReplAceEnd.column : item.editInsertEnd.column) - item.position.column;
		const columnDeltA = this.editor.getPosition().column - item.position.column;
		const suffixDeltA = this._lineSuffix.vAlue ? this._lineSuffix.vAlue.deltA(this.editor.getPosition()) : 0;

		return {
			overwriteBefore: overwriteBefore + columnDeltA,
			overwriteAfter: overwriteAfter + suffixDeltA
		};
	}

	privAte _AlertCompletionItem({ completion: suggestion }: CompletionItem): void {
		const textLAbel = typeof suggestion.lAbel === 'string' ? suggestion.lAbel : suggestion.lAbel.nAme;
		if (isNonEmptyArrAy(suggestion.AdditionAlTextEdits)) {
			let msg = nls.locAlize('AriA.Alert.snippet', "Accepting '{0}' mAde {1} AdditionAl edits", textLAbel, suggestion.AdditionAlTextEdits.length);
			Alert(msg);
		}
	}

	triggerSuggest(onlyFrom?: Set<CompletionItemProvider>): void {
		if (this.editor.hAsModel()) {
			this.model.trigger({ Auto: fAlse, shy: fAlse }, fAlse, onlyFrom);
			this.editor.reveAlLine(this.editor.getPosition().lineNumber, ScrollType.Smooth);
			this.editor.focus();
		}
	}

	triggerSuggestAndAcceptBest(Arg: { fAllbAck: string }): void {
		if (!this.editor.hAsModel()) {
			return;

		}
		const positionNow = this.editor.getPosition();

		const fAllbAck = () => {
			if (positionNow.equAls(this.editor.getPosition()!)) {
				this._commAndService.executeCommAnd(Arg.fAllbAck);
			}
		};

		const mAkesTextEdit = (item: CompletionItem): booleAn => {
			if (item.completion.insertTextRules! & CompletionItemInsertTextRule.InsertAsSnippet || item.completion.AdditionAlTextEdits) {
				// snippet, other editor -> mAkes edit
				return true;
			}
			const position = this.editor.getPosition()!;
			const stArtColumn = item.editStArt.column;
			const endColumn = position.column;
			if (endColumn - stArtColumn !== item.completion.insertText.length) {
				// unequAl lengths -> mAkes edit
				return true;
			}
			const textNow = this.editor.getModel()!.getVAlueInRAnge({
				stArtLineNumber: position.lineNumber,
				stArtColumn,
				endLineNumber: position.lineNumber,
				endColumn
			});
			// unequAl text -> mAkes edit
			return textNow !== item.completion.insertText;
		};

		Event.once(this.model.onDidTrigger)(_ => {
			// wAit for trigger becAuse only then the cAncel-event is trustworthy
			let listener: IDisposAble[] = [];

			Event.Any<Any>(this.model.onDidTrigger, this.model.onDidCAncel)(() => {
				// retrigger or cAncel -> try to type defAult text
				dispose(listener);
				fAllbAck();
			}, undefined, listener);

			this.model.onDidSuggest(({ completionModel }) => {
				dispose(listener);
				if (completionModel.items.length === 0) {
					fAllbAck();
					return;
				}
				const index = this._memoryService.select(this.editor.getModel()!, this.editor.getPosition()!, completionModel.items);
				const item = completionModel.items[index];
				if (!mAkesTextEdit(item)) {
					fAllbAck();
					return;
				}
				this.editor.pushUndoStop();
				this._insertSuggestion({ index, item, model: completionModel }, InsertFlAgs.KeepAlternAtiveSuggestions | InsertFlAgs.NoBeforeUndoStop | InsertFlAgs.NoAfterUndoStop);

			}, undefined, listener);
		});

		this.model.trigger({ Auto: fAlse, shy: true });
		this.editor.reveAlLine(positionNow.lineNumber, ScrollType.Smooth);
		this.editor.focus();
	}

	AcceptSelectedSuggestion(keepAlternAtiveSuggestions: booleAn, AlternAtiveOverwriteConfig: booleAn): void {
		const item = this.widget.vAlue.getFocusedItem();
		let flAgs = 0;
		if (keepAlternAtiveSuggestions) {
			flAgs |= InsertFlAgs.KeepAlternAtiveSuggestions;
		}
		if (AlternAtiveOverwriteConfig) {
			flAgs |= InsertFlAgs.AlternAtiveOverwriteConfig;
		}
		this._insertSuggestion(item, flAgs);
	}
	AcceptNextSuggestion() {
		this._AlternAtives.vAlue.next();
	}

	AcceptPrevSuggestion() {
		this._AlternAtives.vAlue.prev();
	}

	cAncelSuggestWidget(): void {
		this.model.cAncel();
		this.model.cleAr();
		this.widget.vAlue.hideWidget();
	}

	selectNextSuggestion(): void {
		this.widget.vAlue.selectNext();
	}

	selectNextPAgeSuggestion(): void {
		this.widget.vAlue.selectNextPAge();
	}

	selectLAstSuggestion(): void {
		this.widget.vAlue.selectLAst();
	}

	selectPrevSuggestion(): void {
		this.widget.vAlue.selectPrevious();
	}

	selectPrevPAgeSuggestion(): void {
		this.widget.vAlue.selectPreviousPAge();
	}

	selectFirstSuggestion(): void {
		this.widget.vAlue.selectFirst();
	}

	toggleSuggestionDetAils(): void {
		this.widget.vAlue.toggleDetAils();
	}

	toggleExplAinMode(): void {
		this.widget.vAlue.toggleExplAinMode();
	}

	toggleSuggestionFocus(): void {
		this.widget.vAlue.toggleDetAilsFocus();
	}
}

export clAss TriggerSuggestAction extends EditorAction {

	stAtic reAdonly id = 'editor.Action.triggerSuggest';

	constructor() {
		super({
			id: TriggerSuggestAction.id,
			lAbel: nls.locAlize('suggest.trigger.lAbel', "Trigger Suggest"),
			AliAs: 'Trigger Suggest',
			precondition: ContextKeyExpr.And(EditorContextKeys.writAble, EditorContextKeys.hAsCompletionItemProvider),
			kbOpts: {
				kbExpr: EditorContextKeys.textInputFocus,
				primAry: KeyMod.CtrlCmd | KeyCode.SpAce,
				secondAry: [KeyMod.CtrlCmd | KeyCode.KEY_I],
				mAc: { primAry: KeyMod.WinCtrl | KeyCode.SpAce, secondAry: [KeyMod.Alt | KeyCode.EscApe, KeyMod.CtrlCmd | KeyCode.KEY_I] },
				weight: KeybindingWeight.EditorContrib
			}
		});
	}

	public run(Accessor: ServicesAccessor, editor: ICodeEditor): void {
		const controller = SuggestController.get(editor);

		if (!controller) {
			return;
		}

		controller.triggerSuggest();
	}
}

registerEditorContribution(SuggestController.ID, SuggestController);
registerEditorAction(TriggerSuggestAction);

const weight = KeybindingWeight.EditorContrib + 90;

const SuggestCommAnd = EditorCommAnd.bindToContribution<SuggestController>(SuggestController.get);


registerEditorCommAnd(new SuggestCommAnd({
	id: 'AcceptSelectedSuggestion',
	precondition: SuggestContext.Visible,
	hAndler(x) {
		x.AcceptSelectedSuggestion(true, fAlse);
	}
}));

// normAl tAb
KeybindingsRegistry.registerKeybindingRule({
	id: 'AcceptSelectedSuggestion',
	when: ContextKeyExpr.And(SuggestContext.Visible, EditorContextKeys.textInputFocus),
	primAry: KeyCode.TAb,
	weight
});

// Accept on enter hAs speciAl rules
KeybindingsRegistry.registerKeybindingRule({
	id: 'AcceptSelectedSuggestion',
	when: ContextKeyExpr.And(SuggestContext.Visible, EditorContextKeys.textInputFocus, SuggestContext.AcceptSuggestionsOnEnter, SuggestContext.MAkesTextEdit),
	primAry: KeyCode.Enter,
	weight,
});

MenuRegistry.AppendMenuItem(suggestWidgetStAtusbArMenu, {
	commAnd: { id: 'AcceptSelectedSuggestion', title: nls.locAlize({ key: 'Accept.Accept', comment: ['{0} will be A keybinding, e.g "Enter to insert"'] }, "{0} to insert") },
	group: 'left',
	order: 1,
	when: SuggestContext.HAsInsertAndReplAceRAnge.toNegAted()
});
MenuRegistry.AppendMenuItem(suggestWidgetStAtusbArMenu, {
	commAnd: { id: 'AcceptSelectedSuggestion', title: nls.locAlize({ key: 'Accept.insert', comment: ['{0} will be A keybinding, e.g "Enter to insert"'] }, "{0} to insert") },
	group: 'left',
	order: 1,
	when: ContextKeyExpr.And(SuggestContext.HAsInsertAndReplAceRAnge, ContextKeyExpr.equAls('config.editor.suggest.insertMode', 'insert'))
});
MenuRegistry.AppendMenuItem(suggestWidgetStAtusbArMenu, {
	commAnd: { id: 'AcceptSelectedSuggestion', title: nls.locAlize({ key: 'Accept.replAce', comment: ['{0} will be A keybinding, e.g "Enter to replAce"'] }, "{0} to replAce") },
	group: 'left',
	order: 1,
	when: ContextKeyExpr.And(SuggestContext.HAsInsertAndReplAceRAnge, ContextKeyExpr.equAls('config.editor.suggest.insertMode', 'replAce'))
});

registerEditorCommAnd(new SuggestCommAnd({
	id: 'AcceptAlternAtiveSelectedSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, EditorContextKeys.textInputFocus),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyMod.Shift | KeyCode.Enter,
		secondAry: [KeyMod.Shift | KeyCode.TAb],
	},
	hAndler(x) {
		x.AcceptSelectedSuggestion(fAlse, true);
	},
	menuOpts: [{
		menuId: suggestWidgetStAtusbArMenu,
		group: 'left',
		order: 2,
		when: ContextKeyExpr.And(SuggestContext.HAsInsertAndReplAceRAnge, ContextKeyExpr.equAls('config.editor.suggest.insertMode', 'insert')),
		title: nls.locAlize({ key: 'Accept.replAce', comment: ['{0} will be A keybinding, e.g "Enter to replAce"'] }, "{0} to replAce")
	}, {
		menuId: suggestWidgetStAtusbArMenu,
		group: 'left',
		order: 2,
		when: ContextKeyExpr.And(SuggestContext.HAsInsertAndReplAceRAnge, ContextKeyExpr.equAls('config.editor.suggest.insertMode', 'replAce')),
		title: nls.locAlize({ key: 'Accept.insert', comment: ['{0} will be A keybinding, e.g "Enter to insert"'] }, "{0} to insert")
	}]
}));


// continue to support the old commAnd
CommAndsRegistry.registerCommAndAliAs('AcceptSelectedSuggestionOnEnter', 'AcceptSelectedSuggestion');

registerEditorCommAnd(new SuggestCommAnd({
	id: 'hideSuggestWidget',
	precondition: SuggestContext.Visible,
	hAndler: x => x.cAncelSuggestWidget(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.EscApe,
		secondAry: [KeyMod.Shift | KeyCode.EscApe]
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectNextSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectNextSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.DownArrow,
		secondAry: [KeyMod.CtrlCmd | KeyCode.DownArrow],
		mAc: { primAry: KeyCode.DownArrow, secondAry: [KeyMod.CtrlCmd | KeyCode.DownArrow, KeyMod.WinCtrl | KeyCode.KEY_N] }
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectNextPAgeSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectNextPAgeSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.PAgeDown,
		secondAry: [KeyMod.CtrlCmd | KeyCode.PAgeDown]
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectLAstSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectLAstSuggestion()
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectPrevSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectPrevSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.UpArrow,
		secondAry: [KeyMod.CtrlCmd | KeyCode.UpArrow],
		mAc: { primAry: KeyCode.UpArrow, secondAry: [KeyMod.CtrlCmd | KeyCode.UpArrow, KeyMod.WinCtrl | KeyCode.KEY_P] }
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectPrevPAgeSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectPrevPAgeSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.PAgeUp,
		secondAry: [KeyMod.CtrlCmd | KeyCode.PAgeUp]
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'selectFirstSuggestion',
	precondition: ContextKeyExpr.And(SuggestContext.Visible, SuggestContext.MultipleSuggestions),
	hAndler: c => c.selectFirstSuggestion()
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'toggleSuggestionDetAils',
	precondition: SuggestContext.Visible,
	hAndler: x => x.toggleSuggestionDetAils(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyMod.CtrlCmd | KeyCode.SpAce,
		mAc: { primAry: KeyMod.WinCtrl | KeyCode.SpAce }
	},
	menuOpts: [{
		menuId: suggestWidgetStAtusbArMenu,
		group: 'right',
		order: 1,
		when: ContextKeyExpr.And(SuggestContext.DetAilsVisible, SuggestContext.CAnResolve),
		title: nls.locAlize('detAil.more', "show less")
	}, {
		menuId: suggestWidgetStAtusbArMenu,
		group: 'right',
		order: 1,
		when: ContextKeyExpr.And(SuggestContext.DetAilsVisible.toNegAted(), SuggestContext.CAnResolve),
		title: nls.locAlize('detAil.less', "show more")
	}]
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'toggleExplAinMode',
	precondition: SuggestContext.Visible,
	hAndler: x => x.toggleExplAinMode(),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib,
		primAry: KeyMod.CtrlCmd | KeyCode.US_SLASH,
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'toggleSuggestionFocus',
	precondition: SuggestContext.Visible,
	hAndler: x => x.toggleSuggestionFocus(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.SpAce,
		mAc: { primAry: KeyMod.WinCtrl | KeyMod.Alt | KeyCode.SpAce }
	}
}));

//#region tAb completions

registerEditorCommAnd(new SuggestCommAnd({
	id: 'insertBestCompletion',
	precondition: ContextKeyExpr.And(
		EditorContextKeys.textInputFocus,
		ContextKeyExpr.equAls('config.editor.tAbCompletion', 'on'),
		WordContextKey.AtEnd,
		SuggestContext.Visible.toNegAted(),
		SuggestAlternAtives.OtherSuggestions.toNegAted(),
		SnippetController2.InSnippetMode.toNegAted()
	),
	hAndler: (x, Arg) => {

		x.triggerSuggestAndAcceptBest(isObject(Arg) ? { fAllbAck: 'tAb', ...Arg } : { fAllbAck: 'tAb' });
	},
	kbOpts: {
		weight,
		primAry: KeyCode.TAb
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'insertNextSuggestion',
	precondition: ContextKeyExpr.And(
		EditorContextKeys.textInputFocus,
		ContextKeyExpr.equAls('config.editor.tAbCompletion', 'on'),
		SuggestAlternAtives.OtherSuggestions,
		SuggestContext.Visible.toNegAted(),
		SnippetController2.InSnippetMode.toNegAted()
	),
	hAndler: x => x.AcceptNextSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyCode.TAb
	}
}));

registerEditorCommAnd(new SuggestCommAnd({
	id: 'insertPrevSuggestion',
	precondition: ContextKeyExpr.And(
		EditorContextKeys.textInputFocus,
		ContextKeyExpr.equAls('config.editor.tAbCompletion', 'on'),
		SuggestAlternAtives.OtherSuggestions,
		SuggestContext.Visible.toNegAted(),
		SnippetController2.InSnippetMode.toNegAted()
	),
	hAndler: x => x.AcceptPrevSuggestion(),
	kbOpts: {
		weight: weight,
		kbExpr: EditorContextKeys.textInputFocus,
		primAry: KeyMod.Shift | KeyCode.TAb
	}
}));
