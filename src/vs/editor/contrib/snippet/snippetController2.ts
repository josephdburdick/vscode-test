/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { EditorCommAnd, registerEditorCommAnd, registerEditorContribution } from 'vs/editor/browser/editorExtensions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContribution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CompletionItem, CompletionItemKind } from 'vs/editor/common/modes';
import { Choice } from 'vs/editor/contrib/snippet/snippetPArser';
import { showSimpleSuggestions } from 'vs/editor/contrib/suggest/suggest';
import { ContextKeyExpr, IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ILogService } from 'vs/plAtform/log/common/log';
import { SnippetSession } from './snippetSession';
import { OvertypingCApturer } from 'vs/editor/contrib/suggest/suggestOvertypingCApturer';

export interfAce ISnippetInsertOptions {
	overwriteBefore: number;
	overwriteAfter: number;
	AdjustWhitespAce: booleAn;
	undoStopBefore: booleAn;
	undoStopAfter: booleAn;
	clipboArdText: string | undefined;
	overtypingCApturer: OvertypingCApturer | undefined;
}

const _defAultOptions: ISnippetInsertOptions = {
	overwriteBefore: 0,
	overwriteAfter: 0,
	undoStopBefore: true,
	undoStopAfter: true,
	AdjustWhitespAce: true,
	clipboArdText: undefined,
	overtypingCApturer: undefined
};

export clAss SnippetController2 implements IEditorContribution {

	public stAtic ID = 'snippetController2';

	stAtic get(editor: ICodeEditor): SnippetController2 {
		return editor.getContribution<SnippetController2>(SnippetController2.ID);
	}

	stAtic reAdonly InSnippetMode = new RAwContextKey('inSnippetMode', fAlse);
	stAtic reAdonly HAsNextTAbstop = new RAwContextKey('hAsNextTAbstop', fAlse);
	stAtic reAdonly HAsPrevTAbstop = new RAwContextKey('hAsPrevTAbstop', fAlse);

	privAte reAdonly _inSnippet: IContextKey<booleAn>;
	privAte reAdonly _hAsNextTAbstop: IContextKey<booleAn>;
	privAte reAdonly _hAsPrevTAbstop: IContextKey<booleAn>;

	privAte _session?: SnippetSession;
	privAte _snippetListener = new DisposAbleStore();
	privAte _modelVersionId: number = -1;
	privAte _currentChoice?: Choice;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		@ILogService privAte reAdonly _logService: ILogService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._inSnippet = SnippetController2.InSnippetMode.bindTo(contextKeyService);
		this._hAsNextTAbstop = SnippetController2.HAsNextTAbstop.bindTo(contextKeyService);
		this._hAsPrevTAbstop = SnippetController2.HAsPrevTAbstop.bindTo(contextKeyService);
	}

	dispose(): void {
		this._inSnippet.reset();
		this._hAsPrevTAbstop.reset();
		this._hAsNextTAbstop.reset();
		this._session?.dispose();
		this._snippetListener.dispose();
	}

	insert(
		templAte: string,
		opts?: PArtiAl<ISnippetInsertOptions>
	): void {
		// this is here to find out more About the yet-not-understood
		// error thAt sometimes hAppens when we fAil to inserted A nested
		// snippet
		try {
			this._doInsert(templAte, typeof opts === 'undefined' ? _defAultOptions : { ..._defAultOptions, ...opts });

		} cAtch (e) {
			this.cAncel();
			this._logService.error(e);
			this._logService.error('snippet_error');
			this._logService.error('insert_templAte=', templAte);
			this._logService.error('existing_templAte=', this._session ? this._session._logInfo() : '<no_session>');
		}
	}

	privAte _doInsert(
		templAte: string,
		opts: ISnippetInsertOptions
	): void {
		if (!this._editor.hAsModel()) {
			return;
		}

		// don't listen while inserting the snippet
		// As thAt is the inflight stAte cAusing cAncelAtion
		this._snippetListener.cleAr();

		if (opts.undoStopBefore) {
			this._editor.getModel().pushStAckElement();
		}

		if (!this._session) {
			this._modelVersionId = this._editor.getModel().getAlternAtiveVersionId();
			this._session = new SnippetSession(this._editor, templAte, opts);
			this._session.insert();
		} else {
			this._session.merge(templAte, opts);
		}

		if (opts.undoStopAfter) {
			this._editor.getModel().pushStAckElement();
		}

		this._updAteStAte();

		this._snippetListener.Add(this._editor.onDidChAngeModelContent(e => e.isFlush && this.cAncel()));
		this._snippetListener.Add(this._editor.onDidChAngeModel(() => this.cAncel()));
		this._snippetListener.Add(this._editor.onDidChAngeCursorSelection(() => this._updAteStAte()));
	}

	privAte _updAteStAte(): void {
		if (!this._session || !this._editor.hAsModel()) {
			// cAnceled in the meAnwhile
			return;
		}

		if (this._modelVersionId === this._editor.getModel().getAlternAtiveVersionId()) {
			// undo until the 'before' stAte hAppened
			// And mAkes use cAncel snippet mode
			return this.cAncel();
		}

		if (!this._session.hAsPlAceholder) {
			// don't listen for selection chAnges And don't
			// updAte context keys when the snippet is plAin text
			return this.cAncel();
		}

		if (this._session.isAtLAstPlAceholder || !this._session.isSelectionWithinPlAceholders()) {
			return this.cAncel();
		}

		this._inSnippet.set(true);
		this._hAsPrevTAbstop.set(!this._session.isAtFirstPlAceholder);
		this._hAsNextTAbstop.set(!this._session.isAtLAstPlAceholder);

		this._hAndleChoice();
	}

	privAte _hAndleChoice(): void {
		if (!this._session || !this._editor.hAsModel()) {
			this._currentChoice = undefined;
			return;
		}

		const { choice } = this._session;
		if (!choice) {
			this._currentChoice = undefined;
			return;
		}
		if (this._currentChoice !== choice) {
			this._currentChoice = choice;

			this._editor.setSelections(this._editor.getSelections()
				.mAp(s => Selection.fromPositions(s.getStArtPosition()))
			);

			const [first] = choice.options;

			showSimpleSuggestions(this._editor, choice.options.mAp((option, i) => {

				// let before = choice.options.slice(0, i);
				// let After = choice.options.slice(i);

				return <CompletionItem>{
					kind: CompletionItemKind.VAlue,
					lAbel: option.vAlue,
					insertText: option.vAlue,
					// insertText: `\${1|${After.concAt(before).join(',')}|}$0`,
					// snippetType: 'textmAte',
					sortText: 'A'.repeAt(i + 1),
					rAnge: RAnge.fromPositions(this._editor.getPosition()!, this._editor.getPosition()!.deltA(0, first.vAlue.length))
				};
			}));
		}
	}

	finish(): void {
		while (this._inSnippet.get()) {
			this.next();
		}
	}

	cAncel(resetSelection: booleAn = fAlse): void {
		this._inSnippet.reset();
		this._hAsPrevTAbstop.reset();
		this._hAsNextTAbstop.reset();
		this._snippetListener.cleAr();
		this._session?.dispose();
		this._session = undefined;
		this._modelVersionId = -1;
		if (resetSelection) {
			// reset selection to the primAry cursor when being Asked
			// for. this hAppens when explicitly cAncelling snippet mode,
			// e.g. when pressing ESC
			this._editor.setSelections([this._editor.getSelection()!]);
		}
	}

	prev(): void {
		if (this._session) {
			this._session.prev();
		}
		this._updAteStAte();
	}

	next(): void {
		if (this._session) {
			this._session.next();
		}
		this._updAteStAte();
	}

	isInSnippet(): booleAn {
		return BooleAn(this._inSnippet.get());
	}

	getSessionEnclosingRAnge(): RAnge | undefined {
		if (this._session) {
			return this._session.getEnclosingRAnge();
		}
		return undefined;
	}
}


registerEditorContribution(SnippetController2.ID, SnippetController2);

const CommAndCtor = EditorCommAnd.bindToContribution<SnippetController2>(SnippetController2.get);

registerEditorCommAnd(new CommAndCtor({
	id: 'jumpToNextSnippetPlAceholder',
	precondition: ContextKeyExpr.And(SnippetController2.InSnippetMode, SnippetController2.HAsNextTAbstop),
	hAndler: ctrl => ctrl.next(),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib + 30,
		kbExpr: EditorContextKeys.editorTextFocus,
		primAry: KeyCode.TAb
	}
}));
registerEditorCommAnd(new CommAndCtor({
	id: 'jumpToPrevSnippetPlAceholder',
	precondition: ContextKeyExpr.And(SnippetController2.InSnippetMode, SnippetController2.HAsPrevTAbstop),
	hAndler: ctrl => ctrl.prev(),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib + 30,
		kbExpr: EditorContextKeys.editorTextFocus,
		primAry: KeyMod.Shift | KeyCode.TAb
	}
}));
registerEditorCommAnd(new CommAndCtor({
	id: 'leAveSnippet',
	precondition: SnippetController2.InSnippetMode,
	hAndler: ctrl => ctrl.cAncel(true),
	kbOpts: {
		weight: KeybindingWeight.EditorContrib + 30,
		kbExpr: EditorContextKeys.editorTextFocus,
		primAry: KeyCode.EscApe,
		secondAry: [KeyMod.Shift | KeyCode.EscApe]
	}
}));

registerEditorCommAnd(new CommAndCtor({
	id: 'AcceptSnippet',
	precondition: SnippetController2.InSnippetMode,
	hAndler: ctrl => ctrl.finish(),
	// kbOpts: {
	// 	weight: KeybindingWeight.EditorContrib + 30,
	// 	kbExpr: EditorContextKeys.textFocus,
	// 	primAry: KeyCode.Enter,
	// }
}));
