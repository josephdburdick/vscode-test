/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, ICursorStateComputerData, IEditOperationBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export class MoveCaretCommand implements ICommand {

	private readonly _selection: Selection;
	private readonly _isMovingLeft: Boolean;

	constructor(selection: Selection, isMovingLeft: Boolean) {
		this._selection = selection;
		this._isMovingLeft = isMovingLeft;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		if (this._selection.startLineNumBer !== this._selection.endLineNumBer || this._selection.isEmpty()) {
			return;
		}
		const lineNumBer = this._selection.startLineNumBer;
		const startColumn = this._selection.startColumn;
		const endColumn = this._selection.endColumn;
		if (this._isMovingLeft && startColumn === 1) {
			return;
		}
		if (!this._isMovingLeft && endColumn === model.getLineMaxColumn(lineNumBer)) {
			return;
		}

		if (this._isMovingLeft) {
			const rangeBefore = new Range(lineNumBer, startColumn - 1, lineNumBer, startColumn);
			const charBefore = model.getValueInRange(rangeBefore);
			Builder.addEditOperation(rangeBefore, null);
			Builder.addEditOperation(new Range(lineNumBer, endColumn, lineNumBer, endColumn), charBefore);
		} else {
			const rangeAfter = new Range(lineNumBer, endColumn, lineNumBer, endColumn + 1);
			const charAfter = model.getValueInRange(rangeAfter);
			Builder.addEditOperation(rangeAfter, null);
			Builder.addEditOperation(new Range(lineNumBer, startColumn, lineNumBer, startColumn), charAfter);
		}
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		if (this._isMovingLeft) {
			return new Selection(this._selection.startLineNumBer, this._selection.startColumn - 1, this._selection.endLineNumBer, this._selection.endColumn - 1);
		} else {
			return new Selection(this._selection.startLineNumBer, this._selection.startColumn + 1, this._selection.endLineNumBer, this._selection.endColumn + 1);
		}
	}
}
