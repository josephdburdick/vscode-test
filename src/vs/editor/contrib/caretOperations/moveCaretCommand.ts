/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export clAss MoveCAretCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte reAdonly _isMovingLeft: booleAn;

	constructor(selection: Selection, isMovingLeft: booleAn) {
		this._selection = selection;
		this._isMovingLeft = isMovingLeft;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		if (this._selection.stArtLineNumber !== this._selection.endLineNumber || this._selection.isEmpty()) {
			return;
		}
		const lineNumber = this._selection.stArtLineNumber;
		const stArtColumn = this._selection.stArtColumn;
		const endColumn = this._selection.endColumn;
		if (this._isMovingLeft && stArtColumn === 1) {
			return;
		}
		if (!this._isMovingLeft && endColumn === model.getLineMAxColumn(lineNumber)) {
			return;
		}

		if (this._isMovingLeft) {
			const rAngeBefore = new RAnge(lineNumber, stArtColumn - 1, lineNumber, stArtColumn);
			const chArBefore = model.getVAlueInRAnge(rAngeBefore);
			builder.AddEditOperAtion(rAngeBefore, null);
			builder.AddEditOperAtion(new RAnge(lineNumber, endColumn, lineNumber, endColumn), chArBefore);
		} else {
			const rAngeAfter = new RAnge(lineNumber, endColumn, lineNumber, endColumn + 1);
			const chArAfter = model.getVAlueInRAnge(rAngeAfter);
			builder.AddEditOperAtion(rAngeAfter, null);
			builder.AddEditOperAtion(new RAnge(lineNumber, stArtColumn, lineNumber, stArtColumn), chArAfter);
		}
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		if (this._isMovingLeft) {
			return new Selection(this._selection.stArtLineNumber, this._selection.stArtColumn - 1, this._selection.endLineNumber, this._selection.endColumn - 1);
		} else {
			return new Selection(this._selection.stArtLineNumber, this._selection.stArtColumn + 1, this._selection.endLineNumber, this._selection.endColumn + 1);
		}
	}
}
