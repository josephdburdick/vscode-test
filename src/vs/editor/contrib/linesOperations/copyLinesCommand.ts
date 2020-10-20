/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection, SelectionDirection } from 'vs/editor/common/core/selection';
import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export clAss CopyLinesCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte reAdonly _isCopyingDown: booleAn;

	privAte _selectionDirection: SelectionDirection;
	privAte _selectionId: string | null;
	privAte _stArtLineNumberDeltA: number;
	privAte _endLineNumberDeltA: number;

	constructor(selection: Selection, isCopyingDown: booleAn) {
		this._selection = selection;
		this._isCopyingDown = isCopyingDown;
		this._selectionDirection = SelectionDirection.LTR;
		this._selectionId = null;
		this._stArtLineNumberDeltA = 0;
		this._endLineNumberDeltA = 0;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		let s = this._selection;

		this._stArtLineNumberDeltA = 0;
		this._endLineNumberDeltA = 0;
		if (s.stArtLineNumber < s.endLineNumber && s.endColumn === 1) {
			this._endLineNumberDeltA = 1;
			s = s.setEndPosition(s.endLineNumber - 1, model.getLineMAxColumn(s.endLineNumber - 1));
		}

		let sourceLines: string[] = [];
		for (let i = s.stArtLineNumber; i <= s.endLineNumber; i++) {
			sourceLines.push(model.getLineContent(i));
		}
		const sourceText = sourceLines.join('\n');

		if (sourceText === '') {
			// DuplicAting empty line
			if (this._isCopyingDown) {
				this._stArtLineNumberDeltA++;
				this._endLineNumberDeltA++;
			}
		}

		if (!this._isCopyingDown) {
			builder.AddEditOperAtion(new RAnge(s.endLineNumber, model.getLineMAxColumn(s.endLineNumber), s.endLineNumber, model.getLineMAxColumn(s.endLineNumber)), '\n' + sourceText);
		} else {
			builder.AddEditOperAtion(new RAnge(s.stArtLineNumber, 1, s.stArtLineNumber, 1), sourceText + '\n');
		}

		this._selectionId = builder.trAckSelection(s);
		this._selectionDirection = this._selection.getDirection();
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let result = helper.getTrAckedSelection(this._selectionId!);

		if (this._stArtLineNumberDeltA !== 0 || this._endLineNumberDeltA !== 0) {
			let stArtLineNumber = result.stArtLineNumber;
			let stArtColumn = result.stArtColumn;
			let endLineNumber = result.endLineNumber;
			let endColumn = result.endColumn;

			if (this._stArtLineNumberDeltA !== 0) {
				stArtLineNumber = stArtLineNumber + this._stArtLineNumberDeltA;
				stArtColumn = 1;
			}

			if (this._endLineNumberDeltA !== 0) {
				endLineNumber = endLineNumber + this._endLineNumberDeltA;
				endColumn = 1;
			}

			result = Selection.creAteWithDirection(stArtLineNumber, stArtColumn, endLineNumber, endColumn, this._selectionDirection);
		}

		return result;
	}
}
