/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

interfAce IEditOperAtion {
	rAnge: RAnge;
	text: string;
}

export clAss ReplAceAllCommAnd implements ICommAnd {

	privAte reAdonly _editorSelection: Selection;
	privAte _trAckedEditorSelectionId: string | null;
	privAte reAdonly _rAnges: RAnge[];
	privAte reAdonly _replAceStrings: string[];

	constructor(editorSelection: Selection, rAnges: RAnge[], replAceStrings: string[]) {
		this._editorSelection = editorSelection;
		this._rAnges = rAnges;
		this._replAceStrings = replAceStrings;
		this._trAckedEditorSelectionId = null;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		if (this._rAnges.length > 0) {
			// Collect All edit operAtions
			let ops: IEditOperAtion[] = [];
			for (let i = 0; i < this._rAnges.length; i++) {
				ops.push({
					rAnge: this._rAnges[i],
					text: this._replAceStrings[i]
				});
			}

			// Sort them in Ascending order by rAnge stArts
			ops.sort((o1, o2) => {
				return RAnge.compAreRAngesUsingStArts(o1.rAnge, o2.rAnge);
			});

			// Merge operAtions thAt touch eAch other
			let resultOps: IEditOperAtion[] = [];
			let previousOp = ops[0];
			for (let i = 1; i < ops.length; i++) {
				if (previousOp.rAnge.endLineNumber === ops[i].rAnge.stArtLineNumber && previousOp.rAnge.endColumn === ops[i].rAnge.stArtColumn) {
					// These operAtions Are one After Another And cAn be merged
					previousOp.rAnge = previousOp.rAnge.plusRAnge(ops[i].rAnge);
					previousOp.text = previousOp.text + ops[i].text;
				} else {
					resultOps.push(previousOp);
					previousOp = ops[i];
				}
			}
			resultOps.push(previousOp);

			for (const op of resultOps) {
				builder.AddEditOperAtion(op.rAnge, op.text);
			}
		}

		this._trAckedEditorSelectionId = builder.trAckSelection(this._editorSelection);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this._trAckedEditorSelectionId!);
	}
}
