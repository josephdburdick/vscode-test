/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, IEditOperationBuilder, ICursorStateComputerData } from 'vs/editor/common/editorCommon';
import { Range } from 'vs/editor/common/core/range';
import { ITextModel } from 'vs/editor/common/model';

export class InPlaceReplaceCommand implements ICommand {

	private readonly _editRange: Range;
	private readonly _originalSelection: Selection;
	private readonly _text: string;

	constructor(editRange: Range, originalSelection: Selection, text: string) {
		this._editRange = editRange;
		this._originalSelection = originalSelection;
		this._text = text;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._editRange, this._text);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		const inverseEditOperations = helper.getInverseEditOperations();
		const srcRange = inverseEditOperations[0].range;

		if (!this._originalSelection.isEmpty()) {
			// Preserve selection and extends to typed text
			return new Selection(
				srcRange.endLineNumBer,
				srcRange.endColumn - this._text.length,
				srcRange.endLineNumBer,
				srcRange.endColumn
			);
		}

		return new Selection(
			srcRange.endLineNumBer,
			Math.min(this._originalSelection.positionColumn, srcRange.endColumn),
			srcRange.endLineNumBer,
			Math.min(this._originalSelection.positionColumn, srcRange.endColumn)
		);
	}
}
