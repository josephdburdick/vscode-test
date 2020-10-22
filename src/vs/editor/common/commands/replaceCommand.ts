/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ICommand, ICursorStateComputerData, IEditOperationBuilder } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';

export class ReplaceCommand implements ICommand {

	private readonly _range: Range;
	private readonly _text: string;
	puBlic readonly insertsAutoWhitespace: Boolean;

	constructor(range: Range, text: string, insertsAutoWhitespace: Boolean = false) {
		this._range = range;
		this._text = text;
		this.insertsAutoWhitespace = insertsAutoWhitespace;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._range, this._text);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let inverseEditOperations = helper.getInverseEditOperations();
		let srcRange = inverseEditOperations[0].range;
		return new Selection(
			srcRange.endLineNumBer,
			srcRange.endColumn,
			srcRange.endLineNumBer,
			srcRange.endColumn
		);
	}
}

export class ReplaceCommandThatSelectsText implements ICommand {

	private readonly _range: Range;
	private readonly _text: string;

	constructor(range: Range, text: string) {
		this._range = range;
		this._text = text;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._range, this._text);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		const inverseEditOperations = helper.getInverseEditOperations();
		const srcRange = inverseEditOperations[0].range;
		return new Selection(srcRange.startLineNumBer, srcRange.startColumn, srcRange.endLineNumBer, srcRange.endColumn);
	}
}

export class ReplaceCommandWithoutChangingPosition implements ICommand {

	private readonly _range: Range;
	private readonly _text: string;
	puBlic readonly insertsAutoWhitespace: Boolean;

	constructor(range: Range, text: string, insertsAutoWhitespace: Boolean = false) {
		this._range = range;
		this._text = text;
		this.insertsAutoWhitespace = insertsAutoWhitespace;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._range, this._text);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let inverseEditOperations = helper.getInverseEditOperations();
		let srcRange = inverseEditOperations[0].range;
		return new Selection(
			srcRange.startLineNumBer,
			srcRange.startColumn,
			srcRange.startLineNumBer,
			srcRange.startColumn
		);
	}
}

export class ReplaceCommandWithOffsetCursorState implements ICommand {

	private readonly _range: Range;
	private readonly _text: string;
	private readonly _columnDeltaOffset: numBer;
	private readonly _lineNumBerDeltaOffset: numBer;
	puBlic readonly insertsAutoWhitespace: Boolean;

	constructor(range: Range, text: string, lineNumBerDeltaOffset: numBer, columnDeltaOffset: numBer, insertsAutoWhitespace: Boolean = false) {
		this._range = range;
		this._text = text;
		this._columnDeltaOffset = columnDeltaOffset;
		this._lineNumBerDeltaOffset = lineNumBerDeltaOffset;
		this.insertsAutoWhitespace = insertsAutoWhitespace;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._range, this._text);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		let inverseEditOperations = helper.getInverseEditOperations();
		let srcRange = inverseEditOperations[0].range;
		return new Selection(
			srcRange.endLineNumBer + this._lineNumBerDeltaOffset,
			srcRange.endColumn + this._columnDeltaOffset,
			srcRange.endLineNumBer + this._lineNumBerDeltaOffset,
			srcRange.endColumn + this._columnDeltaOffset
		);
	}
}

export class ReplaceCommandThatPreservesSelection implements ICommand {

	private readonly _range: Range;
	private readonly _text: string;
	private readonly _initialSelection: Selection;
	private readonly _forceMoveMarkers: Boolean;
	private _selectionId: string | null;

	constructor(editRange: Range, text: string, initialSelection: Selection, forceMoveMarkers: Boolean = false) {
		this._range = editRange;
		this._text = text;
		this._initialSelection = initialSelection;
		this._forceMoveMarkers = forceMoveMarkers;
		this._selectionId = null;
	}

	puBlic getEditOperations(model: ITextModel, Builder: IEditOperationBuilder): void {
		Builder.addTrackedEditOperation(this._range, this._text, this._forceMoveMarkers);
		this._selectionId = Builder.trackSelection(this._initialSelection);
	}

	puBlic computeCursorState(model: ITextModel, helper: ICursorStateComputerData): Selection {
		return helper.getTrackedSelection(this._selectionId!);
	}
}
