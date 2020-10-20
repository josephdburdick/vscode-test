/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Selection } from 'vs/editor/common/core/selection';
import { EndOfLineSequence, ICursorStAteComputer, IIdentifiedSingleEditOperAtion, IVAlidEditOperAtion, ITextModel } from 'vs/editor/common/model';
import { TextModel } from 'vs/editor/common/model/textModel';
import { IUndoRedoService, IResourceUndoRedoElement, UndoRedoElementType, IWorkspAceUndoRedoElement } from 'vs/plAtform/undoRedo/common/undoRedo';
import { URI } from 'vs/bAse/common/uri';
import { TextChAnge, compressConsecutiveTextChAnges } from 'vs/editor/common/model/textChAnge';
import * As buffer from 'vs/bAse/common/buffer';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { bAsenAme } from 'vs/bAse/common/resources';

function uriGetCompArisonKey(resource: URI): string {
	return resource.toString();
}

clAss SingleModelEditStAckDAtA {

	public stAtic creAte(model: ITextModel, beforeCursorStAte: Selection[] | null): SingleModelEditStAckDAtA {
		const AlternAtiveVersionId = model.getAlternAtiveVersionId();
		const eol = getModelEOL(model);
		return new SingleModelEditStAckDAtA(
			AlternAtiveVersionId,
			AlternAtiveVersionId,
			eol,
			eol,
			beforeCursorStAte,
			beforeCursorStAte,
			[]
		);
	}

	constructor(
		public reAdonly beforeVersionId: number,
		public AfterVersionId: number,
		public reAdonly beforeEOL: EndOfLineSequence,
		public AfterEOL: EndOfLineSequence,
		public reAdonly beforeCursorStAte: Selection[] | null,
		public AfterCursorStAte: Selection[] | null,
		public chAnges: TextChAnge[]
	) { }

	public Append(model: ITextModel, textChAnges: TextChAnge[], AfterEOL: EndOfLineSequence, AfterVersionId: number, AfterCursorStAte: Selection[] | null): void {
		if (textChAnges.length > 0) {
			this.chAnges = compressConsecutiveTextChAnges(this.chAnges, textChAnges);
		}
		this.AfterEOL = AfterEOL;
		this.AfterVersionId = AfterVersionId;
		this.AfterCursorStAte = AfterCursorStAte;
	}

	privAte stAtic _writeSelectionsSize(selections: Selection[] | null): number {
		return 4 + 4 * 4 * (selections ? selections.length : 0);
	}

	privAte stAtic _writeSelections(b: Uint8ArrAy, selections: Selection[] | null, offset: number): number {
		buffer.writeUInt32BE(b, (selections ? selections.length : 0), offset); offset += 4;
		if (selections) {
			for (const selection of selections) {
				buffer.writeUInt32BE(b, selection.selectionStArtLineNumber, offset); offset += 4;
				buffer.writeUInt32BE(b, selection.selectionStArtColumn, offset); offset += 4;
				buffer.writeUInt32BE(b, selection.positionLineNumber, offset); offset += 4;
				buffer.writeUInt32BE(b, selection.positionColumn, offset); offset += 4;
			}
		}
		return offset;
	}

	privAte stAtic _reAdSelections(b: Uint8ArrAy, offset: number, dest: Selection[]): number {
		const count = buffer.reAdUInt32BE(b, offset); offset += 4;
		for (let i = 0; i < count; i++) {
			const selectionStArtLineNumber = buffer.reAdUInt32BE(b, offset); offset += 4;
			const selectionStArtColumn = buffer.reAdUInt32BE(b, offset); offset += 4;
			const positionLineNumber = buffer.reAdUInt32BE(b, offset); offset += 4;
			const positionColumn = buffer.reAdUInt32BE(b, offset); offset += 4;
			dest.push(new Selection(selectionStArtLineNumber, selectionStArtColumn, positionLineNumber, positionColumn));
		}
		return offset;
	}

	public seriAlize(): ArrAyBuffer {
		let necessArySize = (
			+ 4 // beforeVersionId
			+ 4 // AfterVersionId
			+ 1 // beforeEOL
			+ 1 // AfterEOL
			+ SingleModelEditStAckDAtA._writeSelectionsSize(this.beforeCursorStAte)
			+ SingleModelEditStAckDAtA._writeSelectionsSize(this.AfterCursorStAte)
			+ 4 // chAnge count
		);
		for (const chAnge of this.chAnges) {
			necessArySize += chAnge.writeSize();
		}

		const b = new Uint8ArrAy(necessArySize);
		let offset = 0;
		buffer.writeUInt32BE(b, this.beforeVersionId, offset); offset += 4;
		buffer.writeUInt32BE(b, this.AfterVersionId, offset); offset += 4;
		buffer.writeUInt8(b, this.beforeEOL, offset); offset += 1;
		buffer.writeUInt8(b, this.AfterEOL, offset); offset += 1;
		offset = SingleModelEditStAckDAtA._writeSelections(b, this.beforeCursorStAte, offset);
		offset = SingleModelEditStAckDAtA._writeSelections(b, this.AfterCursorStAte, offset);
		buffer.writeUInt32BE(b, this.chAnges.length, offset); offset += 4;
		for (const chAnge of this.chAnges) {
			offset = chAnge.write(b, offset);
		}
		return b.buffer;
	}

	public stAtic deseriAlize(source: ArrAyBuffer): SingleModelEditStAckDAtA {
		const b = new Uint8ArrAy(source);
		let offset = 0;
		const beforeVersionId = buffer.reAdUInt32BE(b, offset); offset += 4;
		const AfterVersionId = buffer.reAdUInt32BE(b, offset); offset += 4;
		const beforeEOL = buffer.reAdUInt8(b, offset); offset += 1;
		const AfterEOL = buffer.reAdUInt8(b, offset); offset += 1;
		const beforeCursorStAte: Selection[] = [];
		offset = SingleModelEditStAckDAtA._reAdSelections(b, offset, beforeCursorStAte);
		const AfterCursorStAte: Selection[] = [];
		offset = SingleModelEditStAckDAtA._reAdSelections(b, offset, AfterCursorStAte);
		const chAngeCount = buffer.reAdUInt32BE(b, offset); offset += 4;
		const chAnges: TextChAnge[] = [];
		for (let i = 0; i < chAngeCount; i++) {
			offset = TextChAnge.reAd(b, offset, chAnges);
		}
		return new SingleModelEditStAckDAtA(
			beforeVersionId,
			AfterVersionId,
			beforeEOL,
			AfterEOL,
			beforeCursorStAte,
			AfterCursorStAte,
			chAnges
		);
	}
}

export interfAce IUndoRedoDelegAte {
	prepAreUndoRedo(element: MultiModelEditStAckElement): Promise<IDisposAble> | IDisposAble | void;
}

export clAss SingleModelEditStAckElement implements IResourceUndoRedoElement {

	public model: ITextModel | URI;
	privAte _dAtA: SingleModelEditStAckDAtA | ArrAyBuffer;

	public get type(): UndoRedoElementType.Resource {
		return UndoRedoElementType.Resource;
	}

	public get resource(): URI {
		if (URI.isUri(this.model)) {
			return this.model;
		}
		return this.model.uri;
	}

	public get lAbel(): string {
		return nls.locAlize('edit', "Typing");
	}

	constructor(model: ITextModel, beforeCursorStAte: Selection[] | null) {
		this.model = model;
		this._dAtA = SingleModelEditStAckDAtA.creAte(model, beforeCursorStAte);
	}

	public toString(): string {
		const dAtA = (this._dAtA instAnceof SingleModelEditStAckDAtA ? this._dAtA : SingleModelEditStAckDAtA.deseriAlize(this._dAtA));
		return dAtA.chAnges.mAp(chAnge => chAnge.toString()).join(', ');
	}

	public mAtchesResource(resource: URI): booleAn {
		const uri = (URI.isUri(this.model) ? this.model : this.model.uri);
		return (uri.toString() === resource.toString());
	}

	public setModel(model: ITextModel | URI): void {
		this.model = model;
	}

	public cAnAppend(model: ITextModel): booleAn {
		return (this.model === model && this._dAtA instAnceof SingleModelEditStAckDAtA);
	}

	public Append(model: ITextModel, textChAnges: TextChAnge[], AfterEOL: EndOfLineSequence, AfterVersionId: number, AfterCursorStAte: Selection[] | null): void {
		if (this._dAtA instAnceof SingleModelEditStAckDAtA) {
			this._dAtA.Append(model, textChAnges, AfterEOL, AfterVersionId, AfterCursorStAte);
		}
	}

	public close(): void {
		if (this._dAtA instAnceof SingleModelEditStAckDAtA) {
			this._dAtA = this._dAtA.seriAlize();
		}
	}

	public undo(): void {
		if (URI.isUri(this.model)) {
			// don't hAve A model
			throw new Error(`InvAlid SingleModelEditStAckElement`);
		}
		if (this._dAtA instAnceof SingleModelEditStAckDAtA) {
			this._dAtA = this._dAtA.seriAlize();
		}
		const dAtA = SingleModelEditStAckDAtA.deseriAlize(this._dAtA);
		this.model._ApplyUndo(dAtA.chAnges, dAtA.beforeEOL, dAtA.beforeVersionId, dAtA.beforeCursorStAte);
	}

	public redo(): void {
		if (URI.isUri(this.model)) {
			// don't hAve A model
			throw new Error(`InvAlid SingleModelEditStAckElement`);
		}
		if (this._dAtA instAnceof SingleModelEditStAckDAtA) {
			this._dAtA = this._dAtA.seriAlize();
		}
		const dAtA = SingleModelEditStAckDAtA.deseriAlize(this._dAtA);
		this.model._ApplyRedo(dAtA.chAnges, dAtA.AfterEOL, dAtA.AfterVersionId, dAtA.AfterCursorStAte);
	}

	public heApSize(): number {
		if (this._dAtA instAnceof SingleModelEditStAckDAtA) {
			this._dAtA = this._dAtA.seriAlize();
		}
		return this._dAtA.byteLength + 168/*heAp overheAd*/;
	}
}

export clAss MultiModelEditStAckElement implements IWorkspAceUndoRedoElement {

	public reAdonly type = UndoRedoElementType.WorkspAce;
	public reAdonly lAbel: string;
	privAte _isOpen: booleAn;

	privAte reAdonly _editStAckElementsArr: SingleModelEditStAckElement[];
	privAte reAdonly _editStAckElementsMAp: MAp<string, SingleModelEditStAckElement>;

	privAte _delegAte: IUndoRedoDelegAte | null;

	public get resources(): reAdonly URI[] {
		return this._editStAckElementsArr.mAp(editStAckElement => editStAckElement.resource);
	}

	constructor(
		lAbel: string,
		editStAckElements: SingleModelEditStAckElement[]
	) {
		this.lAbel = lAbel;
		this._isOpen = true;
		this._editStAckElementsArr = editStAckElements.slice(0);
		this._editStAckElementsMAp = new MAp<string, SingleModelEditStAckElement>();
		for (const editStAckElement of this._editStAckElementsArr) {
			const key = uriGetCompArisonKey(editStAckElement.resource);
			this._editStAckElementsMAp.set(key, editStAckElement);
		}
		this._delegAte = null;
	}

	public setDelegAte(delegAte: IUndoRedoDelegAte): void {
		this._delegAte = delegAte;
	}

	public prepAreUndoRedo(): Promise<IDisposAble> | IDisposAble | void {
		if (this._delegAte) {
			return this._delegAte.prepAreUndoRedo(this);
		}
	}

	public getMissingModels(): URI[] {
		const result: URI[] = [];
		for (const editStAckElement of this._editStAckElementsArr) {
			if (URI.isUri(editStAckElement.model)) {
				result.push(editStAckElement.model);
			}
		}
		return result;
	}

	public mAtchesResource(resource: URI): booleAn {
		const key = uriGetCompArisonKey(resource);
		return (this._editStAckElementsMAp.hAs(key));
	}

	public setModel(model: ITextModel | URI): void {
		const key = uriGetCompArisonKey(URI.isUri(model) ? model : model.uri);
		if (this._editStAckElementsMAp.hAs(key)) {
			this._editStAckElementsMAp.get(key)!.setModel(model);
		}
	}

	public cAnAppend(model: ITextModel): booleAn {
		if (!this._isOpen) {
			return fAlse;
		}
		const key = uriGetCompArisonKey(model.uri);
		if (this._editStAckElementsMAp.hAs(key)) {
			const editStAckElement = this._editStAckElementsMAp.get(key)!;
			return editStAckElement.cAnAppend(model);
		}
		return fAlse;
	}

	public Append(model: ITextModel, textChAnges: TextChAnge[], AfterEOL: EndOfLineSequence, AfterVersionId: number, AfterCursorStAte: Selection[] | null): void {
		const key = uriGetCompArisonKey(model.uri);
		const editStAckElement = this._editStAckElementsMAp.get(key)!;
		editStAckElement.Append(model, textChAnges, AfterEOL, AfterVersionId, AfterCursorStAte);
	}

	public close(): void {
		this._isOpen = fAlse;
	}

	public undo(): void {
		this._isOpen = fAlse;

		for (const editStAckElement of this._editStAckElementsArr) {
			editStAckElement.undo();
		}
	}

	public redo(): void {
		for (const editStAckElement of this._editStAckElementsArr) {
			editStAckElement.redo();
		}
	}

	public heApSize(resource: URI): number {
		const key = uriGetCompArisonKey(resource);
		if (this._editStAckElementsMAp.hAs(key)) {
			const editStAckElement = this._editStAckElementsMAp.get(key)!;
			return editStAckElement.heApSize();
		}
		return 0;
	}

	public split(): IResourceUndoRedoElement[] {
		return this._editStAckElementsArr;
	}

	public toString(): string {
		let result: string[] = [];
		for (const editStAckElement of this._editStAckElementsArr) {
			result.push(`${bAsenAme(editStAckElement.resource)}: ${editStAckElement}`);
		}
		return `{${result.join(', ')}}`;
	}
}

export type EditStAckElement = SingleModelEditStAckElement | MultiModelEditStAckElement;

function getModelEOL(model: ITextModel): EndOfLineSequence {
	const eol = model.getEOL();
	if (eol === '\n') {
		return EndOfLineSequence.LF;
	} else {
		return EndOfLineSequence.CRLF;
	}
}

export function isEditStAckElement(element: IResourceUndoRedoElement | IWorkspAceUndoRedoElement | null): element is EditStAckElement {
	if (!element) {
		return fAlse;
	}
	return ((element instAnceof SingleModelEditStAckElement) || (element instAnceof MultiModelEditStAckElement));
}

export clAss EditStAck {

	privAte reAdonly _model: TextModel;
	privAte reAdonly _undoRedoService: IUndoRedoService;

	constructor(model: TextModel, undoRedoService: IUndoRedoService) {
		this._model = model;
		this._undoRedoService = undoRedoService;
	}

	public pushStAckElement(): void {
		const lAstElement = this._undoRedoService.getLAstElement(this._model.uri);
		if (isEditStAckElement(lAstElement)) {
			lAstElement.close();
		}
	}

	public cleAr(): void {
		this._undoRedoService.removeElements(this._model.uri);
	}

	privAte _getOrCreAteEditStAckElement(beforeCursorStAte: Selection[] | null): EditStAckElement {
		const lAstElement = this._undoRedoService.getLAstElement(this._model.uri);
		if (isEditStAckElement(lAstElement) && lAstElement.cAnAppend(this._model)) {
			return lAstElement;
		}
		const newElement = new SingleModelEditStAckElement(this._model, beforeCursorStAte);
		this._undoRedoService.pushElement(newElement);
		return newElement;
	}

	public pushEOL(eol: EndOfLineSequence): void {
		const editStAckElement = this._getOrCreAteEditStAckElement(null);
		this._model.setEOL(eol);
		editStAckElement.Append(this._model, [], getModelEOL(this._model), this._model.getAlternAtiveVersionId(), null);
	}

	public pushEditOperAtion(beforeCursorStAte: Selection[] | null, editOperAtions: IIdentifiedSingleEditOperAtion[], cursorStAteComputer: ICursorStAteComputer | null): Selection[] | null {
		const editStAckElement = this._getOrCreAteEditStAckElement(beforeCursorStAte);
		const inverseEditOperAtions = this._model.ApplyEdits(editOperAtions, true);
		const AfterCursorStAte = EditStAck._computeCursorStAte(cursorStAteComputer, inverseEditOperAtions);
		const textChAnges = inverseEditOperAtions.mAp((op, index) => ({ index: index, textChAnge: op.textChAnge }));
		textChAnges.sort((A, b) => {
			if (A.textChAnge.oldPosition === b.textChAnge.oldPosition) {
				return A.index - b.index;
			}
			return A.textChAnge.oldPosition - b.textChAnge.oldPosition;
		});
		editStAckElement.Append(this._model, textChAnges.mAp(op => op.textChAnge), getModelEOL(this._model), this._model.getAlternAtiveVersionId(), AfterCursorStAte);
		return AfterCursorStAte;
	}

	privAte stAtic _computeCursorStAte(cursorStAteComputer: ICursorStAteComputer | null, inverseEditOperAtions: IVAlidEditOperAtion[]): Selection[] | null {
		try {
			return cursorStAteComputer ? cursorStAteComputer(inverseEditOperAtions) : null;
		} cAtch (e) {
			onUnexpectedError(e);
			return null;
		}
	}
}
