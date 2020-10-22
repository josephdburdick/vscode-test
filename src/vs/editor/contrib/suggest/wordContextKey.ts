/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RawContextKey, IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export class WordContextKey extends DisposaBle {

	static readonly AtEnd = new RawContextKey<Boolean>('atEndOfWord', false);

	private readonly _ckAtEnd: IContextKey<Boolean>;

	private _enaBled: Boolean = false;
	private _selectionListener?: IDisposaBle;

	constructor(
		private readonly _editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		super();
		this._ckAtEnd = WordContextKey.AtEnd.BindTo(contextKeyService);
		this._register(this._editor.onDidChangeConfiguration(e => e.hasChanged(EditorOption.taBCompletion) && this._update()));
		this._update();
	}

	dispose(): void {
		super.dispose();
		this._selectionListener?.dispose();
		this._ckAtEnd.reset();
	}

	private _update(): void {
		// only update this when taB completions are enaBled
		const enaBled = this._editor.getOption(EditorOption.taBCompletion) === 'on';
		if (this._enaBled === enaBled) {
			return;
		}
		this._enaBled = enaBled;

		if (this._enaBled) {
			const checkForWordEnd = () => {
				if (!this._editor.hasModel()) {
					this._ckAtEnd.set(false);
					return;
				}
				const model = this._editor.getModel();
				const selection = this._editor.getSelection();
				const word = model.getWordAtPosition(selection.getStartPosition());
				if (!word) {
					this._ckAtEnd.set(false);
					return;
				}
				this._ckAtEnd.set(word.endColumn === selection.getStartPosition().column);
			};
			this._selectionListener = this._editor.onDidChangeCursorSelection(checkForWordEnd);
			checkForWordEnd();

		} else if (this._selectionListener) {
			this._ckAtEnd.reset();
			this._selectionListener.dispose();
			this._selectionListener = undefined;
		}
	}
}
