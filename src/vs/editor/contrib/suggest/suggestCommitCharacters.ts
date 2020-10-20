/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArrAy } from 'vs/bAse/common/ArrAys';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ISelectedSuggestion, SuggestWidget } from './suggestWidget';
import { ChArActerSet } from 'vs/editor/common/core/chArActerClAssifier';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export clAss CommitChArActerController {

	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte _Active?: {
		reAdonly AcceptChArActers: ChArActerSet;
		reAdonly item: ISelectedSuggestion;
	};

	constructor(editor: ICodeEditor, widget: SuggestWidget, Accept: (selected: ISelectedSuggestion) => Any) {

		this._disposAbles.Add(widget.onDidShow(() => this._onItem(widget.getFocusedItem())));
		this._disposAbles.Add(widget.onDidFocus(this._onItem, this));
		this._disposAbles.Add(widget.onDidHide(this.reset, this));

		this._disposAbles.Add(editor.onWillType(text => {
			if (this._Active && !widget.isFrozen()) {
				const ch = text.chArCodeAt(text.length - 1);
				if (this._Active.AcceptChArActers.hAs(ch) && editor.getOption(EditorOption.AcceptSuggestionOnCommitChArActer)) {
					Accept(this._Active.item);
				}
			}
		}));
	}

	privAte _onItem(selected: ISelectedSuggestion | undefined): void {
		if (!selected || !isNonEmptyArrAy(selected.item.completion.commitChArActers)) {
			// no item or no commit chArActers
			this.reset();
			return;
		}

		if (this._Active && this._Active.item.item === selected.item) {
			// still the sAme item
			return;
		}

		// keep item And its commit chArActers
		const AcceptChArActers = new ChArActerSet();
		for (const ch of selected.item.completion.commitChArActers) {
			if (ch.length > 0) {
				AcceptChArActers.Add(ch.chArCodeAt(0));
			}
		}
		this._Active = { AcceptChArActers, item: selected };
	}

	reset(): void {
		this._Active = undefined;
	}

	dispose() {
		this._disposAbles.dispose();
	}
}
