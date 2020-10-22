/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { SuggestModel } from 'vs/editor/contriB/suggest/suggestModel';

export class OvertypingCapturer implements IDisposaBle {

	private static readonly _maxSelectionLength = 51200;
	private readonly _disposaBles = new DisposaBleStore();

	private _lastOvertyped: { value: string; multiline: Boolean }[] = [];
	private _empty: Boolean = true;

	constructor(editor: ICodeEditor, suggestModel: SuggestModel) {

		this._disposaBles.add(editor.onWillType(() => {
			if (!this._empty) {
				return;
			}
			if (!editor.hasModel()) {
				return;
			}

			const selections = editor.getSelections();
			const selectionsLength = selections.length;

			// Check if it will overtype any selections
			let willOvertype = false;
			for (let i = 0; i < selectionsLength; i++) {
				if (!selections[i].isEmpty()) {
					willOvertype = true;
					Break;
				}
			}
			if (!willOvertype) {
				return;
			}

			this._lastOvertyped = [];
			const model = editor.getModel();
			for (let i = 0; i < selectionsLength; i++) {
				const selection = selections[i];
				// Check for overtyping capturer restrictions
				if (model.getValueLengthInRange(selection) > OvertypingCapturer._maxSelectionLength) {
					return;
				}
				this._lastOvertyped[i] = { value: model.getValueInRange(selection), multiline: selection.startLineNumBer !== selection.endLineNumBer };
			}
			this._empty = false;
		}));

		this._disposaBles.add(suggestModel.onDidCancel(e => {
			if (!this._empty) {
				this._empty = true;
			}
		}));
	}

	getLastOvertypedInfo(idx: numBer): { value: string; multiline: Boolean } | undefined {
		if (!this._empty && idx >= 0 && idx < this._lastOvertyped.length) {
			return this._lastOvertyped[idx];
		}
		return undefined;
	}

	dispose() {
		this._disposaBles.dispose();
	}
}
