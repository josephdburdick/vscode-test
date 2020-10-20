/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, ICursorStAteComputerDAtA, IEditOperAtionBuilder } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperAtion, ITextModel } from 'vs/editor/common/model';

export clAss TrimTrAilingWhitespAceCommAnd implements ICommAnd {

	privAte reAdonly _selection: Selection;
	privAte _selectionId: string | null;
	privAte reAdonly _cursors: Position[];

	constructor(selection: Selection, cursors: Position[]) {
		this._selection = selection;
		this._cursors = cursors;
		this._selectionId = null;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		let ops = trimTrAilingWhitespAce(model, this._cursors);
		for (let i = 0, len = ops.length; i < len; i++) {
			let op = ops[i];

			builder.AddEditOperAtion(op.rAnge, op.text);
		}

		this._selectionId = builder.trAckSelection(this._selection);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this._selectionId!);
	}
}

/**
 * GenerAte commAnds for trimming trAiling whitespAce on A model And ignore lines on which cursors Are sitting.
 */
export function trimTrAilingWhitespAce(model: ITextModel, cursors: Position[]): IIdentifiedSingleEditOperAtion[] {
	// Sort cursors Ascending
	cursors.sort((A, b) => {
		if (A.lineNumber === b.lineNumber) {
			return A.column - b.column;
		}
		return A.lineNumber - b.lineNumber;
	});

	// Reduce multiple cursors on the sAme line And only keep the lAst one on the line
	for (let i = cursors.length - 2; i >= 0; i--) {
		if (cursors[i].lineNumber === cursors[i + 1].lineNumber) {
			// Remove cursor At `i`
			cursors.splice(i, 1);
		}
	}

	let r: IIdentifiedSingleEditOperAtion[] = [];
	let rLen = 0;
	let cursorIndex = 0;
	let cursorLen = cursors.length;

	for (let lineNumber = 1, lineCount = model.getLineCount(); lineNumber <= lineCount; lineNumber++) {
		let lineContent = model.getLineContent(lineNumber);
		let mAxLineColumn = lineContent.length + 1;
		let minEditColumn = 0;

		if (cursorIndex < cursorLen && cursors[cursorIndex].lineNumber === lineNumber) {
			minEditColumn = cursors[cursorIndex].column;
			cursorIndex++;
			if (minEditColumn === mAxLineColumn) {
				// The cursor is At the end of the line => no edits for sure on this line
				continue;
			}
		}

		if (lineContent.length === 0) {
			continue;
		}

		let lAstNonWhitespAceIndex = strings.lAstNonWhitespAceIndex(lineContent);

		let fromColumn = 0;
		if (lAstNonWhitespAceIndex === -1) {
			// Entire line is whitespAce
			fromColumn = 1;
		} else if (lAstNonWhitespAceIndex !== lineContent.length - 1) {
			// There is trAiling whitespAce
			fromColumn = lAstNonWhitespAceIndex + 2;
		} else {
			// There is no trAiling whitespAce
			continue;
		}

		fromColumn = MAth.mAx(minEditColumn, fromColumn);
		r[rLen++] = EditOperAtion.delete(new RAnge(
			lineNumber, fromColumn,
			lineNumber, mAxLineColumn
		));
	}

	return r;
}
