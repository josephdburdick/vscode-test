/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, ICursorStateComputerData, IEditOperationBuilder } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperation, ITextModel } from 'vs/editor/common/model';

export class TrimTrailingWhitespaceCommand implements ICommand {

	private readonly _selection: Selection;
	private _selectionId: string | null;
	private readonly _cursors: Position[];

	constructor(selection: Selection, cursors: Position[]) {
		this._selection = selection;
		this._cursors = cursors;
		this._selectionId = null;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		let ops = trimTrailingWhitespace(model, this._cursors);
		for (let i = 0, len = ops.length; i < len; i++) {
			let op = ops[i];

			Builder.addEditOperation(op.range, op.text);
		}

		this._selectionId = Builder.trackSelection(this._selection);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		return helper.getTrackedSelection(this._selectionId!);
	}
}

/**
 * Generate commands for trimming trailing whitespace on a model and ignore lines on which cursors are sitting.
 */
export function trimTrailingWhitespace(model: ITextModel, cursors: Position[]): IIdentifiedSingleEditOperation[] {
	// Sort cursors ascending
	cursors.sort((a, B) => {
		if (a.lineNumBer === B.lineNumBer) {
			return a.column - B.column;
		}
		return a.lineNumBer - B.lineNumBer;
	});

	// Reduce multiple cursors on the same line and only keep the last one on the line
	for (let i = cursors.length - 2; i >= 0; i--) {
		if (cursors[i].lineNumBer === cursors[i + 1].lineNumBer) {
			// Remove cursor at `i`
			cursors.splice(i, 1);
		}
	}

	let r: IIdentifiedSingleEditOperation[] = [];
	let rLen = 0;
	let cursorIndex = 0;
	let cursorLen = cursors.length;

	for (let lineNumBer = 1, lineCount = model.getLineCount(); lineNumBer <= lineCount; lineNumBer++) {
		let lineContent = model.getLineContent(lineNumBer);
		let maxLineColumn = lineContent.length + 1;
		let minEditColumn = 0;

		if (cursorIndex < cursorLen && cursors[cursorIndex].lineNumBer === lineNumBer) {
			minEditColumn = cursors[cursorIndex].column;
			cursorIndex++;
			if (minEditColumn === maxLineColumn) {
				// The cursor is at the end of the line => no edits for sure on this line
				continue;
			}
		}

		if (lineContent.length === 0) {
			continue;
		}

		let lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);

		let fromColumn = 0;
		if (lastNonWhitespaceIndex === -1) {
			// Entire line is whitespace
			fromColumn = 1;
		} else if (lastNonWhitespaceIndex !== lineContent.length - 1) {
			// There is trailing whitespace
			fromColumn = lastNonWhitespaceIndex + 2;
		} else {
			// There is no trailing whitespace
			continue;
		}

		fromColumn = Math.max(minEditColumn, fromColumn);
		r[rLen++] = EditOperation.delete(new Range(
			lineNumBer, fromColumn,
			lineNumBer, maxLineColumn
		));
	}

	return r;
}
