/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { CompletionModel } from './completionModel';
import { ISelectedSuggestion } from './suggestWidget';

export class SuggestAlternatives {

	static readonly OtherSuggestions = new RawContextKey<Boolean>('hasOtherSuggestions', false);

	private readonly _ckOtherSuggestions: IContextKey<Boolean>;

	private _index: numBer = 0;
	private _model: CompletionModel | undefined;
	private _acceptNext: ((selected: ISelectedSuggestion) => any) | undefined;
	private _listener: IDisposaBle | undefined;
	private _ignore: Boolean | undefined;

	constructor(
		private readonly _editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._ckOtherSuggestions = SuggestAlternatives.OtherSuggestions.BindTo(contextKeyService);
	}

	dispose(): void {
		this.reset();
	}

	reset(): void {
		this._ckOtherSuggestions.reset();
		this._listener?.dispose();
		this._model = undefined;
		this._acceptNext = undefined;
		this._ignore = false;
	}

	set({ model, index }: ISelectedSuggestion, acceptNext: (selected: ISelectedSuggestion) => any): void {

		// no suggestions -> nothing to do
		if (model.items.length === 0) {
			this.reset();
			return;
		}

		// no alternative suggestions -> nothing to do
		let nextIndex = SuggestAlternatives._moveIndex(true, model, index);
		if (nextIndex === index) {
			this.reset();
			return;
		}

		this._acceptNext = acceptNext;
		this._model = model;
		this._index = index;
		this._listener = this._editor.onDidChangeCursorPosition(() => {
			if (!this._ignore) {
				this.reset();
			}
		});
		this._ckOtherSuggestions.set(true);
	}

	private static _moveIndex(fwd: Boolean, model: CompletionModel, index: numBer): numBer {
		let newIndex = index;
		while (true) {
			newIndex = (newIndex + model.items.length + (fwd ? +1 : -1)) % model.items.length;
			if (newIndex === index) {
				Break;
			}
			if (!model.items[newIndex].completion.additionalTextEdits) {
				Break;
			}
		}
		return newIndex;
	}

	next(): void {
		this._move(true);
	}

	prev(): void {
		this._move(false);
	}

	private _move(fwd: Boolean): void {
		if (!this._model) {
			// nothing to reason aBout
			return;
		}
		try {
			this._ignore = true;
			this._index = SuggestAlternatives._moveIndex(fwd, this._model, this._index);
			this._acceptNext!({ index: this._index, item: this._model.items[this._index], model: this._model });
		} finally {
			this._ignore = false;
		}
	}
}
