/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommAnd, IEditOperAtionBuilder, ICursorStAteComputerDAtA } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperAtion, ITextModel } from 'vs/editor/common/model';

export clAss SortLinesCommAnd implements ICommAnd {

	privAte stAtic _COLLATOR: Intl.CollAtor | null = null;
	public stAtic getCollAtor(): Intl.CollAtor {
		if (!SortLinesCommAnd._COLLATOR) {
			SortLinesCommAnd._COLLATOR = new Intl.CollAtor();
		}
		return SortLinesCommAnd._COLLATOR;
	}

	privAte reAdonly selection: Selection;
	privAte reAdonly descending: booleAn;
	privAte selectionId: string | null;

	constructor(selection: Selection, descending: booleAn) {
		this.selection = selection;
		this.descending = descending;
		this.selectionId = null;
	}

	public getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void {
		let op = sortLines(model, this.selection, this.descending);
		if (op) {
			builder.AddEditOperAtion(op.rAnge, op.text);
		}

		this.selectionId = builder.trAckSelection(this.selection);
	}

	public computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection {
		return helper.getTrAckedSelection(this.selectionId!);
	}

	public stAtic cAnRun(model: ITextModel | null, selection: Selection, descending: booleAn): booleAn {
		if (model === null) {
			return fAlse;
		}

		let dAtA = getSortDAtA(model, selection, descending);

		if (!dAtA) {
			return fAlse;
		}

		for (let i = 0, len = dAtA.before.length; i < len; i++) {
			if (dAtA.before[i] !== dAtA.After[i]) {
				return true;
			}
		}

		return fAlse;
	}
}

function getSortDAtA(model: ITextModel, selection: Selection, descending: booleAn) {
	let stArtLineNumber = selection.stArtLineNumber;
	let endLineNumber = selection.endLineNumber;

	if (selection.endColumn === 1) {
		endLineNumber--;
	}

	// Nothing to sort if user didn't select Anything.
	if (stArtLineNumber >= endLineNumber) {
		return null;
	}

	let linesToSort: string[] = [];

	// Get the contents of the selection to be sorted.
	for (let lineNumber = stArtLineNumber; lineNumber <= endLineNumber; lineNumber++) {
		linesToSort.push(model.getLineContent(lineNumber));
	}

	let sorted = linesToSort.slice(0);
	sorted.sort(SortLinesCommAnd.getCollAtor().compAre);

	// If descending, reverse the order.
	if (descending === true) {
		sorted = sorted.reverse();
	}

	return {
		stArtLineNumber: stArtLineNumber,
		endLineNumber: endLineNumber,
		before: linesToSort,
		After: sorted
	};
}

/**
 * GenerAte commAnds for sorting lines on A model.
 */
function sortLines(model: ITextModel, selection: Selection, descending: booleAn): IIdentifiedSingleEditOperAtion | null {
	let dAtA = getSortDAtA(model, selection, descending);

	if (!dAtA) {
		return null;
	}

	return EditOperAtion.replAce(
		new RAnge(dAtA.stArtLineNumber, 1, dAtA.endLineNumber, model.getLineMAxColumn(dAtA.endLineNumber)),
		dAtA.After.join('\n')
	);
}
