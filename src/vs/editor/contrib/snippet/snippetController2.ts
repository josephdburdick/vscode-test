/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorCommand, registerEditorCommand, registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { CompletionItem, CompletionItemKind } from 'vs/editor/common/modes';
import { Choice } from 'vs/editor/contriB/snippet/snippetParser';
import { showSimpleSuggestions } from 'vs/editor/contriB/suggest/suggest';
import { ContextKeyExpr, IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ILogService } from 'vs/platform/log/common/log';
import { SnippetSession } from './snippetSession';
import { OvertypingCapturer } from 'vs/editor/contriB/suggest/suggestOvertypingCapturer';

export interface ISnippetInsertOptions {
	overwriteBefore: numBer;
	overwriteAfter: numBer;
	adjustWhitespace: Boolean;
	undoStopBefore: Boolean;
	undoStopAfter: Boolean;
	clipBoardText: string | undefined;
	overtypingCapturer: OvertypingCapturer | undefined;
}

const _defaultOptions: ISnippetInsertOptions = {
	overwriteBefore: 0,
	overwriteAfter: 0,
	undoStopBefore: true,
	undoStopAfter: true,
	adjustWhitespace: true,
	clipBoardText: undefined,
	overtypingCapturer: undefined
};

export class SnippetController2 implements IEditorContriBution {

	puBlic static ID = 'snippetController2';

	static get(editor: ICodeEditor): SnippetController2 {
		return editor.getContriBution<SnippetController2>(SnippetController2.ID);
	}

	static readonly InSnippetMode = new RawContextKey('inSnippetMode', false);
	static readonly HasNextTaBstop = new RawContextKey('hasNextTaBstop', false);
	static readonly HasPrevTaBstop = new RawContextKey('hasPrevTaBstop', false);

	private readonly _inSnippet: IContextKey<Boolean>;
	private readonly _hasNextTaBstop: IContextKey<Boolean>;
	private readonly _hasPrevTaBstop: IContextKey<Boolean>;

	private _session?: SnippetSession;
	private _snippetListener = new DisposaBleStore();
	private _modelVersionId: numBer = -1;
	private _currentChoice?: Choice;

	constructor(
		private readonly _editor: ICodeEditor,
		@ILogService private readonly _logService: ILogService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._inSnippet = SnippetController2.InSnippetMode.BindTo(contextKeyService);
		this._hasNextTaBstop = SnippetController2.HasNextTaBstop.BindTo(contextKeyService);
		this._hasPrevTaBstop = SnippetController2.HasPrevTaBstop.BindTo(contextKeyService);
	}

	dispose(): void {
		this._inSnippet.reset();
		this._hasPrevTaBstop.reset();
		this._hasNextTaBstop.reset();
		this._session?.dispose();
		this._snippetListener.dispose();
	}

	insert(
		template: string,
		opts?: Partial<ISnippetInsertOptions>
	): void {
		// this is here to find out more aBout the yet-not-understood
		// error that sometimes happens when we fail to inserted a nested
		// snippet
		try {
			this._doInsert(template, typeof opts === 'undefined' ? _defaultOptions : { ..._defaultOptions, ...opts });

		} catch (e) {
			this.cancel();
			this._logService.error(e);
			this._logService.error('snippet_error');
			this._logService.error('insert_template=', template);
			this._logService.error('existing_template=', this._session ? this._session._logInfo() : '<no_session>');
		}
	}

	private _doInsert(
		template: string,
		opts: ISnippetInsertOptions
	): void {
		if (!this._editor.hasModel()) {
			return;
		}

		// don't listen while inserting the snippet
		// as that is the inflight state causing cancelation
		this._snippetListener.clear();

		if (opts.undoStopBefore) {
			this._editor.getModel().pushStackElement();
		}

		if (!this._session) {
			this._modelVersionId = this._editor.getModel().getAlternativeVersionId();
			this._session = new SnippetSession(this._editor, template, opts);
			this._session.insert();
		} else {
			this._session.merge(template, opts);
		}

		if (opts.undoStopAfter) {
			this._editor.getModel().pushStackElement();
		}

		this._updateState();

		this._snippetListener.add(this._editor.onDidChangeModelContent(e => e.isFlush && this.cancel()));
		this._snippetListener.add(this._editor.onDidChangeModel(() => this.cancel()));
		this._snippetListener.add(this._editor.onDidChangeCursorSelection(() => this._updateState()));
	}

	private _updateState(): void {
		if (!this._session || !this._editor.hasModel()) {
			// canceled in the meanwhile
			return;
		}

		if (this._modelVersionId === this._editor.getModel().getAlternativeVersionId()) {
			// undo until the 'Before' state happened
			// and makes use cancel snippet mode
			return this.cancel();
		}

		if (!this._session.hasPlaceholder) {
			// don't listen for selection changes and don't
			// update context keys when the snippet is plain text
			return this.cancel();
		}

		if (this._session.isAtLastPlaceholder || !this._session.isSelectionWithinPlaceholders()) {
			return this.cancel();
		}

		this._inSnippet.set(true);
		this._hasPrevTaBstop.set(!this._session.isAtFirstPlaceholder);
		this._hasNextTaBstop.set(!this._session.isAtLastPlaceholder);

		this._handleChoice();
	}

	private _handleChoice(): void {
		if (!this._session || !this._editor.hasModel()) {
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
				.map(s => Selection.fromPositions(s.getStartPosition()))
			);

			const [first] = choice.options;

			showSimpleSuggestions(this._editor, choice.options.map((option, i) => {

				// let Before = choice.options.slice(0, i);
				// let after = choice.options.slice(i);

				return <CompletionItem>{
					kind: CompletionItemKind.Value,
					laBel: option.value,
					insertText: option.value,
					// insertText: `\${1|${after.concat(Before).join(',')}|}$0`,
					// snippetType: 'textmate',
					sortText: 'a'.repeat(i + 1),
					range: Range.fromPositions(this._editor.getPosition()!, this._editor.getPosition()!.delta(0, first.value.length))
				};
			}));
		}
	}

	finish(): void {
		while (this._inSnippet.get()) {
			this.next();
		}
	}

	cancel(resetSelection: Boolean = false): void {
		this._inSnippet.reset();
		this._hasPrevTaBstop.reset();
		this._hasNextTaBstop.reset();
		this._snippetListener.clear();
		this._session?.dispose();
		this._session = undefined;
		this._modelVersionId = -1;
		if (resetSelection) {
			// reset selection to the primary cursor when Being asked
			// for. this happens when explicitly cancelling snippet mode,
			// e.g. when pressing ESC
			this._editor.setSelections([this._editor.getSelection()!]);
		}
	}

	prev(): void {
		if (this._session) {
			this._session.prev();
		}
		this._updateState();
	}

	next(): void {
		if (this._session) {
			this._session.next();
		}
		this._updateState();
	}

	isInSnippet(): Boolean {
		return Boolean(this._inSnippet.get());
	}

	getSessionEnclosingRange(): Range | undefined {
		if (this._session) {
			return this._session.getEnclosingRange();
		}
		return undefined;
	}
}


registerEditorContriBution(SnippetController2.ID, SnippetController2);

const CommandCtor = EditorCommand.BindToContriBution<SnippetController2>(SnippetController2.get);

registerEditorCommand(new CommandCtor({
	id: 'jumpToNextSnippetPlaceholder',
	precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasNextTaBstop),
	handler: ctrl => ctrl.next(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 30,
		kBExpr: EditorContextKeys.editorTextFocus,
		primary: KeyCode.TaB
	}
}));
registerEditorCommand(new CommandCtor({
	id: 'jumpToPrevSnippetPlaceholder',
	precondition: ContextKeyExpr.and(SnippetController2.InSnippetMode, SnippetController2.HasPrevTaBstop),
	handler: ctrl => ctrl.prev(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 30,
		kBExpr: EditorContextKeys.editorTextFocus,
		primary: KeyMod.Shift | KeyCode.TaB
	}
}));
registerEditorCommand(new CommandCtor({
	id: 'leaveSnippet',
	precondition: SnippetController2.InSnippetMode,
	handler: ctrl => ctrl.cancel(true),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB + 30,
		kBExpr: EditorContextKeys.editorTextFocus,
		primary: KeyCode.Escape,
		secondary: [KeyMod.Shift | KeyCode.Escape]
	}
}));

registerEditorCommand(new CommandCtor({
	id: 'acceptSnippet',
	precondition: SnippetController2.InSnippetMode,
	handler: ctrl => ctrl.finish(),
	// kBOpts: {
	// 	weight: KeyBindingWeight.EditorContriB + 30,
	// 	kBExpr: EditorContextKeys.textFocus,
	// 	primary: KeyCode.Enter,
	// }
}));
