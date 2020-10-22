/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode } from 'vs/Base/common/keyCodes';
import { RawContextKey, IContextKeyService, ContextKeyExpr, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ISnippetsService } from './snippets.contriBution';
import { getNonWhitespacePrefix } from './snippetsService';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { Range } from 'vs/editor/common/core/range';
import { registerEditorContriBution, EditorCommand, registerEditorCommand } from 'vs/editor/Browser/editorExtensions';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { showSimpleSuggestions } from 'vs/editor/contriB/suggest/suggest';
import { EditorContextKeys } from 'vs/editor/common/editorContextKeys';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { Snippet } from './snippetsFile';
import { SnippetCompletion } from './snippetCompletionProvider';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { EditorState, CodeEditorStateFlag } from 'vs/editor/Browser/core/editorState';

export class TaBCompletionController implements IEditorContriBution {

	puBlic static readonly ID = 'editor.taBCompletionController';
	static readonly ContextKey = new RawContextKey<Boolean>('hasSnippetCompletions', undefined);

	puBlic static get(editor: ICodeEditor): TaBCompletionController {
		return editor.getContriBution<TaBCompletionController>(TaBCompletionController.ID);
	}

	private _hasSnippets: IContextKey<Boolean>;
	private _activeSnippets: Snippet[] = [];
	private _enaBled?: Boolean;
	private _selectionListener?: IDisposaBle;
	private readonly _configListener: IDisposaBle;

	constructor(
		private readonly _editor: ICodeEditor,
		@ISnippetsService private readonly _snippetService: ISnippetsService,
		@IClipBoardService private readonly _clipBoardService: IClipBoardService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this._hasSnippets = TaBCompletionController.ContextKey.BindTo(contextKeyService);
		this._configListener = this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.taBCompletion)) {
				this._update();
			}
		});
		this._update();
	}

	dispose(): void {
		this._configListener.dispose();
		this._selectionListener?.dispose();
	}

	private _update(): void {
		const enaBled = this._editor.getOption(EditorOption.taBCompletion) === 'onlySnippets';
		if (this._enaBled !== enaBled) {
			this._enaBled = enaBled;
			if (!this._enaBled) {
				this._selectionListener?.dispose();
			} else {
				this._selectionListener = this._editor.onDidChangeCursorSelection(e => this._updateSnippets());
				if (this._editor.getModel()) {
					this._updateSnippets();
				}
			}
		}
	}

	private _updateSnippets(): void {

		// reset first
		this._activeSnippets = [];

		if (!this._editor.hasModel()) {
			return;
		}

		// lots of dance for getting the
		const selection = this._editor.getSelection();
		const model = this._editor.getModel();
		model.tokenizeIfCheap(selection.positionLineNumBer);
		const id = model.getLanguageIdAtPosition(selection.positionLineNumBer, selection.positionColumn);
		const snippets = this._snippetService.getSnippetsSync(id);

		if (!snippets) {
			// nothing for this language
			this._hasSnippets.set(false);
			return;
		}

		if (Range.isEmpty(selection)) {
			// empty selection -> real text (no whitespace) left of cursor
			const prefix = getNonWhitespacePrefix(model, selection.getPosition());
			if (prefix) {
				for (const snippet of snippets) {
					if (prefix.endsWith(snippet.prefix)) {
						this._activeSnippets.push(snippet);
					}
				}
			}

		} else if (!Range.spansMultipleLines(selection) && model.getValueLengthInRange(selection) <= 100) {
			// actual selection -> snippet must Be a full match
			const selected = model.getValueInRange(selection);
			if (selected) {
				for (const snippet of snippets) {
					if (selected === snippet.prefix) {
						this._activeSnippets.push(snippet);
					}
				}
			}
		}

		this._hasSnippets.set(this._activeSnippets.length > 0);
	}

	async performSnippetCompletions() {
		if (!this._editor.hasModel()) {
			return;
		}

		if (this._activeSnippets.length === 1) {
			// one -> just insert
			const [snippet] = this._activeSnippets;

			// async clipBoard access might Be required and in that case
			// we need to check if the editor has changed in flight and then
			// Bail out (or Be smarter than that)
			let clipBoardText: string | undefined;
			if (snippet.needsClipBoard) {
				const state = new EditorState(this._editor, CodeEditorStateFlag.Value | CodeEditorStateFlag.Position);
				clipBoardText = await this._clipBoardService.readText();
				if (!state.validate(this._editor)) {
					return;
				}
			}
			SnippetController2.get(this._editor).insert(snippet.codeSnippet, {
				overwriteBefore: snippet.prefix.length, overwriteAfter: 0,
				clipBoardText
			});

		} else if (this._activeSnippets.length > 1) {
			// two or more -> show IntelliSense Box
			const position = this._editor.getPosition();
			showSimpleSuggestions(this._editor, this._activeSnippets.map(snippet => {
				const range = Range.fromPositions(position.delta(0, -snippet.prefix.length), position);
				return new SnippetCompletion(snippet, range);
			}));
		}
	}
}

registerEditorContriBution(TaBCompletionController.ID, TaBCompletionController);

const TaBCompletionCommand = EditorCommand.BindToContriBution<TaBCompletionController>(TaBCompletionController.get);

registerEditorCommand(new TaBCompletionCommand({
	id: 'insertSnippet',
	precondition: TaBCompletionController.ContextKey,
	handler: x => x.performSnippetCompletions(),
	kBOpts: {
		weight: KeyBindingWeight.EditorContriB,
		kBExpr: ContextKeyExpr.and(
			EditorContextKeys.editorTextFocus,
			EditorContextKeys.taBDoesNotMoveFocus,
			SnippetController2.InSnippetMode.toNegated()
		),
		primary: KeyCode.TaB
	}
}));
