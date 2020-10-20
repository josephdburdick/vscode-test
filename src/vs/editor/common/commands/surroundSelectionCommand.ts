/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export clAss SurroundSelectionCommAnd implements ICommAnd {
	privAte reAdonly _rAnge: Selection;
	privAte reAdonly _chArBeforeSelection: string;
	privAte reAdonly _chArAfterSelection: string;

	constructor(rAnge: Selection, chArBeforeSelection: string, chArAfterSelection: string) {
		this._rAnge = rAnge;
		this._chArBeforeSelection = chArBeforeSelection;
		this._chArAfterSelection = chArAfterSelection;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(new RAnge(
			this._rAnge.stArtLineNumber,
			this._rAnge.stArtColumn,
			this._rAnge.stArtLineNumber,
			this._rAnge.stArtColumn
		), this._chArBeforeSelection);

		builder.AddTrAckedEditOperAtion(new RAnge(
			this._rAnge.endLineNumber,
			this._rAnge.endColumn,
			this._rAnge.endLineNumber,
			this._rAnge.endColumn
		), this._chArAfterSelection);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let inverseEditOperAtions = helper.getInverseEditOperAtions();
		let firstOperAtionRAnge = inverseEditOperAtions[0].rAnge;
		let secondOperAtionRAnge = inverseEditOperAtions[1].rAnge;

		return new Selection(
			firstOperAtionRAnge.endLineNumber,
			firstOperAtionRAnge.endColumn,
			secondOperAtionRAnge.endLineNumber,
			secondOperAtionRAnge.endColumn - this._chArAfterSelection.length
		);
	}
}
