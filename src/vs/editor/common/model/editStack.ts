/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Selection } from 'vs/editor/common/core/selection';
import { EndOfLineSequence, ICursorStateComputer, IIdentifiedSingleEditOperation, IValidEditOperation, ITextModel } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { IUndoRedoService, IResourceUndoRedoElement, UndoRedoElementType, IWorkspaceUndoRedoElement } from 'vs/platform/undoRedo/common/undoRedo';
import { URI } from 'vs/Base/common/uri';
import { TextChange, compressConsecutiveTextChanges } from 'vs/editor/common/model/textChange';
import * as Buffer from 'vs/Base/common/Buffer';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Basename } from 'vs/Base/common/resources';

function uriGetComparisonKey(resource: URI): string {
	return resource.toString();
}

class SingleModelEditStackData {

	puBlic static create(model: ITextModel, BeforeCursorState: Selection[] | null): SingleModelEditStackData {
		const alternativeVersionId = model.getAlternativeVersionId();
		const eol = getModelEOL(model);
		return new SingleModelEditStackData(
			alternativeVersionId,
			alternativeVersionId,
			eol,
			eol,
			BeforeCursorState,
			BeforeCursorState,
			[]
		);
	}

	constructor(
		puBlic readonly BeforeVersionId: numBer,
		puBlic afterVersionId: numBer,
		puBlic readonly BeforeEOL: EndOfLineSequence,
		puBlic afterEOL: EndOfLineSequence,
		puBlic readonly BeforeCursorState: Selection[] | null,
		puBlic afterCursorState: Selection[] | null,
		puBlic changes: TextChange[]
	) { }

	puBlic append(model: ITextModel, textChanges: TextChange[], afterEOL: EndOfLineSequence, afterVersionId: numBer, afterCursorState: Selection[] | null): void {
		if (textChanges.length > 0) {
			this.changes = compressConsecutiveTextChanges(this.changes, textChanges);
		}
		this.afterEOL = afterEOL;
		this.afterVersionId = afterVersionId;
		this.afterCursorState = afterCursorState;
	}

	private static _writeSelectionsSize(selections: Selection[] | null): numBer {
		return 4 + 4 * 4 * (selections ? selections.length : 0);
	}

	private static _writeSelections(B: Uint8Array, selections: Selection[] | null, offset: numBer): numBer {
		Buffer.writeUInt32BE(B, (selections ? selections.length : 0), offset); offset += 4;
		if (selections) {
			for (const selection of selections) {
				Buffer.writeUInt32BE(B, selection.selectionStartLineNumBer, offset); offset += 4;
				Buffer.writeUInt32BE(B, selection.selectionStartColumn, offset); offset += 4;
				Buffer.writeUInt32BE(B, selection.positionLineNumBer, offset); offset += 4;
				Buffer.writeUInt32BE(B, selection.positionColumn, offset); offset += 4;
			}
		}
		return offset;
	}

	private static _readSelections(B: Uint8Array, offset: numBer, dest: Selection[]): numBer {
		const count = Buffer.readUInt32BE(B, offset); offset += 4;
		for (let i = 0; i < count; i++) {
			const selectionStartLineNumBer = Buffer.readUInt32BE(B, offset); offset += 4;
			const selectionStartColumn = Buffer.readUInt32BE(B, offset); offset += 4;
			const positionLineNumBer = Buffer.readUInt32BE(B, offset); offset += 4;
			const positionColumn = Buffer.readUInt32BE(B, offset); offset += 4;
			dest.push(new Selection(selectionStartLineNumBer, selectionStartColumn, positionLineNumBer, positionColumn));
		}
		return offset;
	}

	puBlic serialize(): ArrayBuffer {
		let necessarySize = (
			+ 4 // BeforeVersionId
			+ 4 // afterVersionId
			+ 1 // BeforeEOL
			+ 1 // afterEOL
			+ SingleModelEditStackData._writeSelectionsSize(this.BeforeCursorState)
			+ SingleModelEditStackData._writeSelectionsSize(this.afterCursorState)
			+ 4 // change count
		);
		for (const change of this.changes) {
			necessarySize += change.writeSize();
		}

		const B = new Uint8Array(necessarySize);
		let offset = 0;
		Buffer.writeUInt32BE(B, this.BeforeVersionId, offset); offset += 4;
		Buffer.writeUInt32BE(B, this.afterVersionId, offset); offset += 4;
		Buffer.writeUInt8(B, this.BeforeEOL, offset); offset += 1;
		Buffer.writeUInt8(B, this.afterEOL, offset); offset += 1;
		offset = SingleModelEditStackData._writeSelections(B, this.BeforeCursorState, offset);
		offset = SingleModelEditStackData._writeSelections(B, this.afterCursorState, offset);
		Buffer.writeUInt32BE(B, this.changes.length, offset); offset += 4;
		for (const change of this.changes) {
			offset = change.write(B, offset);
		}
		return B.Buffer;
	}

	puBlic static deserialize(source: ArrayBuffer): SingleModelEditStackData {
		const B = new Uint8Array(source);
		let offset = 0;
		const BeforeVersionId = Buffer.readUInt32BE(B, offset); offset += 4;
		const afterVersionId = Buffer.readUInt32BE(B, offset); offset += 4;
		const BeforeEOL = Buffer.readUInt8(B, offset); offset += 1;
		const afterEOL = Buffer.readUInt8(B, offset); offset += 1;
		const BeforeCursorState: Selection[] = [];
		offset = SingleModelEditStackData._readSelections(B, offset, BeforeCursorState);
		const afterCursorState: Selection[] = [];
		offset = SingleModelEditStackData._readSelections(B, offset, afterCursorState);
		const changeCount = Buffer.readUInt32BE(B, offset); offset += 4;
		const changes: TextChange[] = [];
		for (let i = 0; i < changeCount; i++) {
			offset = TextChange.read(B, offset, changes);
		}
		return new SingleModelEditStackData(
			BeforeVersionId,
			afterVersionId,
			BeforeEOL,
			afterEOL,
			BeforeCursorState,
			afterCursorState,
			changes
		);
	}
}

export interface IUndoRedoDelegate {
	prepareUndoRedo(element: MultiModelEditStackElement): Promise<IDisposaBle> | IDisposaBle | void;
}

export class SingleModelEditStackElement implements IResourceUndoRedoElement {

	puBlic model: ITextModel | URI;
	private _data: SingleModelEditStackData | ArrayBuffer;

	puBlic get type(): UndoRedoElementType.Resource {
		return UndoRedoElementType.Resource;
	}

	puBlic get resource(): URI {
		if (URI.isUri(this.model)) {
			return this.model;
		}
		return this.model.uri;
	}

	puBlic get laBel(): string {
		return nls.localize('edit', "Typing");
	}

	constructor(model: ITextModel, BeforeCursorState: Selection[] | null) {
		this.model = model;
		this._data = SingleModelEditStackData.create(model, BeforeCursorState);
	}

	puBlic toString(): string {
		const data = (this._data instanceof SingleModelEditStackData ? this._data : SingleModelEditStackData.deserialize(this._data));
		return data.changes.map(change => change.toString()).join(', ');
	}

	puBlic matchesResource(resource: URI): Boolean {
		const uri = (URI.isUri(this.model) ? this.model : this.model.uri);
		return (uri.toString() === resource.toString());
	}

	puBlic setModel(model: ITextModel | URI): void {
		this.model = model;
	}

	puBlic canAppend(model: ITextModel): Boolean {
		return (this.model === model && this._data instanceof SingleModelEditStackData);
	}

	puBlic append(model: ITextModel, textChanges: TextChange[], afterEOL: EndOfLineSequence, afterVersionId: numBer, afterCursorState: Selection[] | null): void {
		if (this._data instanceof SingleModelEditStackData) {
			this._data.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
		}
	}

	puBlic close(): void {
		if (this._data instanceof SingleModelEditStackData) {
			this._data = this._data.serialize();
		}
	}

	puBlic undo(): void {
		if (URI.isUri(this.model)) {
			// don't have a model
			throw new Error(`Invalid SingleModelEditStackElement`);
		}
		if (this._data instanceof SingleModelEditStackData) {
			this._data = this._data.serialize();
		}
		const data = SingleModelEditStackData.deserialize(this._data);
		this.model._applyUndo(data.changes, data.BeforeEOL, data.BeforeVersionId, data.BeforeCursorState);
	}

	puBlic redo(): void {
		if (URI.isUri(this.model)) {
			// don't have a model
			throw new Error(`Invalid SingleModelEditStackElement`);
		}
		if (this._data instanceof SingleModelEditStackData) {
			this._data = this._data.serialize();
		}
		const data = SingleModelEditStackData.deserialize(this._data);
		this.model._applyRedo(data.changes, data.afterEOL, data.afterVersionId, data.afterCursorState);
	}

	puBlic heapSize(): numBer {
		if (this._data instanceof SingleModelEditStackData) {
			this._data = this._data.serialize();
		}
		return this._data.ByteLength + 168/*heap overhead*/;
	}
}

export class MultiModelEditStackElement implements IWorkspaceUndoRedoElement {

	puBlic readonly type = UndoRedoElementType.Workspace;
	puBlic readonly laBel: string;
	private _isOpen: Boolean;

	private readonly _editStackElementsArr: SingleModelEditStackElement[];
	private readonly _editStackElementsMap: Map<string, SingleModelEditStackElement>;

	private _delegate: IUndoRedoDelegate | null;

	puBlic get resources(): readonly URI[] {
		return this._editStackElementsArr.map(editStackElement => editStackElement.resource);
	}

	constructor(
		laBel: string,
		editStackElements: SingleModelEditStackElement[]
	) {
		this.laBel = laBel;
		this._isOpen = true;
		this._editStackElementsArr = editStackElements.slice(0);
		this._editStackElementsMap = new Map<string, SingleModelEditStackElement>();
		for (const editStackElement of this._editStackElementsArr) {
			const key = uriGetComparisonKey(editStackElement.resource);
			this._editStackElementsMap.set(key, editStackElement);
		}
		this._delegate = null;
	}

	puBlic setDelegate(delegate: IUndoRedoDelegate): void {
		this._delegate = delegate;
	}

	puBlic prepareUndoRedo(): Promise<IDisposaBle> | IDisposaBle | void {
		if (this._delegate) {
			return this._delegate.prepareUndoRedo(this);
		}
	}

	puBlic getMissingModels(): URI[] {
		const result: URI[] = [];
		for (const editStackElement of this._editStackElementsArr) {
			if (URI.isUri(editStackElement.model)) {
				result.push(editStackElement.model);
			}
		}
		return result;
	}

	puBlic matchesResource(resource: URI): Boolean {
		const key = uriGetComparisonKey(resource);
		return (this._editStackElementsMap.has(key));
	}

	puBlic setModel(model: ITextModel | URI): void {
		const key = uriGetComparisonKey(URI.isUri(model) ? model : model.uri);
		if (this._editStackElementsMap.has(key)) {
			this._editStackElementsMap.get(key)!.setModel(model);
		}
	}

	puBlic canAppend(model: ITextModel): Boolean {
		if (!this._isOpen) {
			return false;
		}
		const key = uriGetComparisonKey(model.uri);
		if (this._editStackElementsMap.has(key)) {
			const editStackElement = this._editStackElementsMap.get(key)!;
			return editStackElement.canAppend(model);
		}
		return false;
	}

	puBlic append(model: ITextModel, textChanges: TextChange[], afterEOL: EndOfLineSequence, afterVersionId: numBer, afterCursorState: Selection[] | null): void {
		const key = uriGetComparisonKey(model.uri);
		const editStackElement = this._editStackElementsMap.get(key)!;
		editStackElement.append(model, textChanges, afterEOL, afterVersionId, afterCursorState);
	}

	puBlic close(): void {
		this._isOpen = false;
	}

	puBlic undo(): void {
		this._isOpen = false;

		for (const editStackElement of this._editStackElementsArr) {
			editStackElement.undo();
		}
	}

	puBlic redo(): void {
		for (const editStackElement of this._editStackElementsArr) {
			editStackElement.redo();
		}
	}

	puBlic heapSize(resource: URI): numBer {
		const key = uriGetComparisonKey(resource);
		if (this._editStackElementsMap.has(key)) {
			const editStackElement = this._editStackElementsMap.get(key)!;
			return editStackElement.heapSize();
		}
		return 0;
	}

	puBlic split(): IResourceUndoRedoElement[] {
		return this._editStackElementsArr;
	}

	puBlic toString(): string {
		let result: string[] = [];
		for (const editStackElement of this._editStackElementsArr) {
			result.push(`${Basename(editStackElement.resource)}: ${editStackElement}`);
		}
		return `{${result.join(', ')}}`;
	}
}

export type EditStackElement = SingleModelEditStackElement | MultiModelEditStackElement;

function getModelEOL(model: ITextModel): EndOfLineSequence {
	const eol = model.getEOL();
	if (eol === '\n') {
		return EndOfLineSequence.LF;
	} else {
		return EndOfLineSequence.CRLF;
	}
}

export function isEditStackElement(element: IResourceUndoRedoElement | IWorkspaceUndoRedoElement | null): element is EditStackElement {
	if (!element) {
		return false;
	}
	return ((element instanceof SingleModelEditStackElement) || (element instanceof MultiModelEditStackElement));
}

export class EditStack {

	private readonly _model: TextModel;
	private readonly _undoRedoService: IUndoRedoService;

	constructor(model: TextModel, undoRedoService: IUndoRedoService) {
		this._model = model;
		this._undoRedoService = undoRedoService;
	}

	puBlic pushStackElement(): void {
		const lastElement = this._undoRedoService.getLastElement(this._model.uri);
		if (isEditStackElement(lastElement)) {
			lastElement.close();
		}
	}

	puBlic clear(): void {
		this._undoRedoService.removeElements(this._model.uri);
	}

	private _getOrCreateEditStackElement(BeforeCursorState: Selection[] | null): EditStackElement {
		const lastElement = this._undoRedoService.getLastElement(this._model.uri);
		if (isEditStackElement(lastElement) && lastElement.canAppend(this._model)) {
			return lastElement;
		}
		const newElement = new SingleModelEditStackElement(this._model, BeforeCursorState);
		this._undoRedoService.pushElement(newElement);
		return newElement;
	}

	puBlic pushEOL(eol: EndOfLineSequence): void {
		const editStackElement = this._getOrCreateEditStackElement(null);
		this._model.setEOL(eol);
		editStackElement.append(this._model, [], getModelEOL(this._model), this._model.getAlternativeVersionId(), null);
	}

	puBlic pushEditOperation(BeforeCursorState: Selection[] | null, editOperations: IIdentifiedSingleEditOperation[], cursorStateComputer: ICursorStateComputer | null): Selection[] | null {
		const editStackElement = this._getOrCreateEditStackElement(BeforeCursorState);
		const inverseEditOperations = this._model.applyEdits(editOperations, true);
		const afterCursorState = EditStack._computeCursorState(cursorStateComputer, inverseEditOperations);
		const textChanges = inverseEditOperations.map((op, index) => ({ index: index, textChange: op.textChange }));
		textChanges.sort((a, B) => {
			if (a.textChange.oldPosition === B.textChange.oldPosition) {
				return a.index - B.index;
			}
			return a.textChange.oldPosition - B.textChange.oldPosition;
		});
		editStackElement.append(this._model, textChanges.map(op => op.textChange), getModelEOL(this._model), this._model.getAlternativeVersionId(), afterCursorState);
		return afterCursorState;
	}

	private static _computeCursorState(cursorStateComputer: ICursorStateComputer | null, inverseEditOperations: IValidEditOperation[]): Selection[] | null {
		try {
			return cursorStateComputer ? cursorStateComputer(inverseEditOperations) : null;
		} catch (e) {
			onUnexpectedError(e);
			return null;
		}
	}
}
