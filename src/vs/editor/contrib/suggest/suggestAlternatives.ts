/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IContextKey, IContextKeyService, RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { CompletionModel } from './completionModel';
import { ISelectedSuggestion } from './suggestWidget';

export clAss SuggestAlternAtives {

	stAtic reAdonly OtherSuggestions = new RAwContextKey<booleAn>('hAsOtherSuggestions', fAlse);

	privAte reAdonly _ckOtherSuggestions: IContextKey<booleAn>;

	privAte _index: number = 0;
	privAte _model: CompletionModel | undefined;
	privAte _AcceptNext: ((selected: ISelectedSuggestion) => Any) | undefined;
	privAte _listener: IDisposAble | undefined;
	privAte _ignore: booleAn | undefined;

	constructor(
		privAte reAdonly _editor: ICodeEditor,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		this._ckOtherSuggestions = SuggestAlternAtives.OtherSuggestions.bindTo(contextKeyService);
	}

	dispose(): void {
		this.reset();
	}

	reset(): void {
		this._ckOtherSuggestions.reset();
		this._listener?.dispose();
		this._model = undefined;
		this._AcceptNext = undefined;
		this._ignore = fAlse;
	}

	set({ model, index }: ISelectedSuggestion, AcceptNext: (selected: ISelectedSuggestion) => Any): void {

		// no suggestions -> nothing to do
		if (model.items.length === 0) {
			this.reset();
			return;
		}

		// no AlternAtive suggestions -> nothing to do
		let nextIndex = SuggestAlternAtives._moveIndex(true, model, index);
		if (nextIndex === index) {
			this.reset();
			return;
		}

		this._AcceptNext = AcceptNext;
		this._model = model;
		this._index = index;
		this._listener = this._editor.onDidChAngeCursorPosition(() => {
			if (!this._ignore) {
				this.reset();
			}
		});
		this._ckOtherSuggestions.set(true);
	}

	privAte stAtic _moveIndex(fwd: booleAn, model: CompletionModel, index: number): number {
		let newIndex = index;
		while (true) {
			newIndex = (newIndex + model.items.length + (fwd ? +1 : -1)) % model.items.length;
			if (newIndex === index) {
				breAk;
			}
			if (!model.items[newIndex].completion.AdditionAlTextEdits) {
				breAk;
			}
		}
		return newIndex;
	}

	next(): void {
		this._move(true);
	}

	prev(): void {
		this._move(fAlse);
	}

	privAte _move(fwd: booleAn): void {
		if (!this._model) {
			// nothing to reAson About
			return;
		}
		try {
			this._ignore = true;
			this._index = SuggestAlternAtives._moveIndex(fwd, this._model, this._index);
			this._AcceptNext!({ index: this._index, item: this._model.items[this._index], model: this._model });
		} finAlly {
			this._ignore = fAlse;
		}
	}
}
