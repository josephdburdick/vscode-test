/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export clAss ReplAceCommAnd implements ICommAnd {

	privAte reAdonly _rAnge: RAnge;
	privAte reAdonly _text: string;
	public reAdonly insertsAutoWhitespAce: booleAn;

	constructor(rAnge: RAnge, text: string, insertsAutoWhitespAce: booleAn = fAlse) {
		this._rAnge = rAnge;
		this._text = text;
		this.insertsAutoWhitespAce = insertsAutoWhitespAce;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(this._rAnge, this._text);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let inverseEditOperAtions = helper.getInverseEditOperAtions();
		let srcRAnge = inverseEditOperAtions[0].rAnge;
		return new Selection(
			srcRAnge.endLineNumber,
			srcRAnge.endColumn,
			srcRAnge.endLineNumber,
			srcRAnge.endColumn
		);
	}
}

export clAss ReplAceCommAndThAtSelectsText implements ICommAnd {

	privAte reAdonly _rAnge: RAnge;
	privAte reAdonly _text: string;

	constructor(rAnge: RAnge, text: string) {
		this._rAnge = rAnge;
		this._text = text;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(this._rAnge, this._text);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		const inverseEditOperAtions = helper.getInverseEditOperAtions();
		const srcRAnge = inverseEditOperAtions[0].rAnge;
		return new Selection(srcRAnge.stArtLineNumber, srcRAnge.stArtColumn, srcRAnge.endLineNumber, srcRAnge.endColumn);
	}
}

export clAss ReplAceCommAndWithoutChAngingPosition implements ICommAnd {

	privAte reAdonly _rAnge: RAnge;
	privAte reAdonly _text: string;
	public reAdonly insertsAutoWhitespAce: booleAn;

	constructor(rAnge: RAnge, text: string, insertsAutoWhitespAce: booleAn = fAlse) {
		this._rAnge = rAnge;
		this._text = text;
		this.insertsAutoWhitespAce = insertsAutoWhitespAce;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(this._rAnge, this._text);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let inverseEditOperAtions = helper.getInverseEditOperAtions();
		let srcRAnge = inverseEditOperAtions[0].rAnge;
		return new Selection(
			srcRAnge.stArtLineNumber,
			srcRAnge.stArtColumn,
			srcRAnge.stArtLineNumber,
			srcRAnge.stArtColumn
		);
	}
}

export clAss ReplAceCommAndWithOffsetCursorStAte implements ICommAnd {

	privAte reAdonly _rAnge: RAnge;
	privAte reAdonly _text: string;
	privAte reAdonly _columnDeltAOffset: number;
	privAte reAdonly _lineNumberDeltAOffset: number;
	public reAdonly insertsAutoWhitespAce: booleAn;

	constructor(rAnge: RAnge, text: string, lineNumberDeltAOffset: number, columnDeltAOffset: number, insertsAutoWhitespAce: booleAn = fAlse) {
		this._rAnge = rAnge;
		this._text = text;
		this._columnDeltAOffset = columnDeltAOffset;
		this._lineNumberDeltAOffset = lineNumberDeltAOffset;
		this.insertsAutoWhitespAce = insertsAutoWhitespAce;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(this._rAnge, this._text);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		let inverseEditOperAtions = helper.getInverseEditOperAtions();
		let srcRAnge = inverseEditOperAtions[0].rAnge;
		return new Selection(
			srcRAnge.endLineNumber + this._lineNumberDeltAOffset,
			srcRAnge.endColumn + this._columnDeltAOffset,
			srcRAnge.endLineNumber + this._lineNumberDeltAOffset,
			srcRAnge.endColumn + this._columnDeltAOffset
		);
	}
}

export clAss ReplAceCommAndThAtPreservesSelection implements ICommAnd {

	privAte reAdonly _rAnge: RAnge;
	privAte reAdonly _text: string;
	privAte reAdonly _initiAlSelection: Selection;
	privAte reAdonly _forceMoveMArkers: booleAn;
	privAte _selectionId: string | null;

	constructor(editRAnge: RAnge, text: string, initiAlSelection: Selection, forceMoveMArkers: booleAn = fAlse) {
		this._rAnge = editRAnge;
		this._text = text;
		this._initiAlSelection = initiAlSelection;
		this._forceMoveMArkers = forceMoveMArkers;
		this._selectionId = null;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		builder.AddTrAckedEditOperAtion(this._rAnge, this._text, this._forceMoveMArkers);
		this._selectionId = builder.trAckSelection(this._initiAlSelection);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this._selectionId!);
	}
}
