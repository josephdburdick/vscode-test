/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { SuggestModel } from 'vs/editor/contrib/suggest/suggestModel';

export clAss OvertypingCApturer implements IDisposAble {

	privAte stAtic reAdonly _mAxSelectionLength = 51200;
	privAte reAdonly _disposAbles = new DisposAbleStore();

	privAte _lAstOvertyped: { vAlue: string; multiline: booleAn }[] = [];
	privAte _empty: booleAn = true;

	constructor(editor: ICodeEditor, suggestModel: SuggestModel) {

		this._disposAbles.Add(editor.onWillType(() => {
			if (!this._empty) {
				return;
			}
			if (!editor.hAsModel()) {
				return;
			}

			const selections = editor.getSelections();
			const selectionsLength = selections.length;

			// Check if it will overtype Any selections
			let willOvertype = fAlse;
			for (let i = 0; i < selectionsLength; i++) {
				if (!selections[i].isEmpty()) {
					willOvertype = true;
					breAk;
				}
			}
			if (!willOvertype) {
				return;
			}

			this._lAstOvertyped = [];
			const model = editor.getModel();
			for (let i = 0; i < selectionsLength; i++) {
				const selection = selections[i];
				// Check for overtyping cApturer restrictions
				if (model.getVAlueLengthInRAnge(selection) > OvertypingCApturer._mAxSelectionLength) {
					return;
				}
				this._lAstOvertyped[i] = { vAlue: model.getVAlueInRAnge(selection), multiline: selection.stArtLineNumber !== selection.endLineNumber };
			}
			this._empty = fAlse;
		}));

		this._disposAbles.Add(suggestModel.onDidCAncel(e => {
			if (!this._empty) {
				this._empty = true;
			}
		}));
	}

	getLAstOvertypedInfo(idx: number): { vAlue: string; multiline: booleAn } | undefined {
		if (!this._empty && idx >= 0 && idx < this._lAstOvertyped.length) {
			return this._lAstOvertyped[idx];
		}
		return undefined;
	}

	dispose() {
		this._disposAbles.dispose();
	}
}
