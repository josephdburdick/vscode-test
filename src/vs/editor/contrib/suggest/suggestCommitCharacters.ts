/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ISelectedSuggestion, SuggestWidget } from './suggestWidget';
import { CharacterSet } from 'vs/editor/common/core/characterClassifier';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export class CommitCharacterController {

	private readonly _disposaBles = new DisposaBleStore();

	private _active?: {
		readonly acceptCharacters: CharacterSet;
		readonly item: ISelectedSuggestion;
	};

	constructor(editor: ICodeEditor, widget: SuggestWidget, accept: (selected: ISelectedSuggestion) => any) {

		this._disposaBles.add(widget.onDidShow(() => this._onItem(widget.getFocusedItem())));
		this._disposaBles.add(widget.onDidFocus(this._onItem, this));
		this._disposaBles.add(widget.onDidHide(this.reset, this));

		this._disposaBles.add(editor.onWillType(text => {
			if (this._active && !widget.isFrozen()) {
				const ch = text.charCodeAt(text.length - 1);
				if (this._active.acceptCharacters.has(ch) && editor.getOption(EditorOption.acceptSuggestionOnCommitCharacter)) {
					accept(this._active.item);
				}
			}
		}));
	}

	private _onItem(selected: ISelectedSuggestion | undefined): void {
		if (!selected || !isNonEmptyArray(selected.item.completion.commitCharacters)) {
			// no item or no commit characters
			this.reset();
			return;
		}

		if (this._active && this._active.item.item === selected.item) {
			// still the same item
			return;
		}

		// keep item and its commit characters
		const acceptCharacters = new CharacterSet();
		for (const ch of selected.item.completion.commitCharacters) {
			if (ch.length > 0) {
				acceptCharacters.add(ch.charCodeAt(0));
			}
		}
		this._active = { acceptCharacters, item: selected };
	}

	reset(): void {
		this._active = undefined;
	}

	dispose() {
		this._disposaBles.dispose();
	}
}
