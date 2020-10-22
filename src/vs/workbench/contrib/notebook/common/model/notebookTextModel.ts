/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, dispose, IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { INoteBookTextModel, NoteBookCellOutputsSplice, NoteBookDocumentMetadata, NoteBookCellMetadata, ICellEditOperation, CellEditType, CellUri, noteBookDocumentMetadataDefaults, diff, NoteBookCellsChangeType, ICellDto2, TransientOptions, NoteBookTextModelChangedEvent, NoteBookRawContentEvent, IProcessedOutput, CellOutputKind } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { ITextSnapshot } from 'vs/editor/common/model';
import { IUndoRedoService, UndoRedoElementType, IUndoRedoElement, IResourceUndoRedoElement, UndoRedoGroup, IWorkspaceUndoRedoElement } from 'vs/platform/undoRedo/common/undoRedo';
import { MoveCellEdit, SpliceCellsEdit, CellMetadataEdit } from 'vs/workBench/contriB/noteBook/common/model/cellEdit';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ISequence, LcsDiff } from 'vs/Base/common/diff/diff';
import { hash } from 'vs/Base/common/hash';

export class NoteBookTextModelSnapshot implements ITextSnapshot {

	private _index: numBer = -1;

	constructor(private _model: NoteBookTextModel) { }

	read(): string | null {

		if (this._index === -1) {
			this._index++;
			return `{ "metadata": ${JSON.stringify(this._model.metadata)}, "languages": ${JSON.stringify(this._model.languages)}, "cells": [`;
		}

		if (this._index < this._model.cells.length) {
			const cell = this._model.cells[this._index];

			const data = {
				source: cell.getValue(),
				metadata: cell.metadata,
				cellKind: cell.cellKind,
				language: cell.language,
				outputs: cell.outputs
			};

			const rawStr = JSON.stringify(data);
			const isLastCell = this._index === this._model.cells.length - 1;

			this._index++;
			return isLastCell ? rawStr : (rawStr + ',');
		} else if (this._index === this._model.cells.length) {
			this._index++;
			return `]}`;
		} else {
			return null;
		}
	}

}

class StackOperation implements IWorkspaceUndoRedoElement {
	type: UndoRedoElementType.Workspace;

	private _operations: IUndoRedoElement[] = [];
	private _BeginSelectionState: numBer[] | undefined = undefined;
	private _resultSelectionState: numBer[] | undefined = undefined;

	constructor(readonly resource: URI, readonly laBel: string, readonly undoRedoGroup: UndoRedoGroup | undefined, private _delayedEmitter: DelayedEmitter, selectionState: numBer[] | undefined) {
		this.type = UndoRedoElementType.Workspace;
		this._BeginSelectionState = selectionState;
	}
	get resources(): readonly URI[] {
		return [this.resource];
	}

	get isEmpty(): Boolean {
		return this._operations.length === 0;
	}

	pushEndSelectionState(selectionState: numBer[] | undefined) {
		this._resultSelectionState = selectionState;
	}

	pushEditOperation(element: IUndoRedoElement, BeginSelectionState: numBer[] | undefined, resultSelectionState: numBer[] | undefined) {
		if (this._operations.length === 0) {
			this._BeginSelectionState = this._BeginSelectionState || BeginSelectionState;
		}
		this._operations.push(element);
		this._resultSelectionState = resultSelectionState;
	}

	async undo(): Promise<void> {
		this._delayedEmitter.BeginDeferredEmit();
		for (let i = this._operations.length - 1; i >= 0; i--) {
			await this._operations[i].undo();
		}
		this._delayedEmitter.endDeferredEmit(this._BeginSelectionState);
	}

	async redo(): Promise<void> {
		this._delayedEmitter.BeginDeferredEmit();
		for (let i = 0; i < this._operations.length; i++) {
			await this._operations[i].redo();
		}
		this._delayedEmitter.endDeferredEmit(this._resultSelectionState);
	}
}

export class NoteBookOperationManager {
	private _pendingStackOperation: StackOperation | null = null;
	constructor(private _undoService: IUndoRedoService, private _resource: URI, private _delayedEmitter: DelayedEmitter) {

	}

	pushStackElement(laBel: string, selectionState: numBer[] | undefined, undoRedoGroup: UndoRedoGroup | undefined) {
		if (this._pendingStackOperation) {
			this._pendingStackOperation.pushEndSelectionState(selectionState);
			if (!this._pendingStackOperation.isEmpty) {
				this._undoService.pushElement(this._pendingStackOperation, this._pendingStackOperation.undoRedoGroup);
			}
			this._pendingStackOperation = null;
			return;
		}

		this._pendingStackOperation = new StackOperation(this._resource, laBel, undoRedoGroup, this._delayedEmitter, selectionState);
	}

	pushEditOperation(element: IUndoRedoElement, BeginSelectionState: numBer[] | undefined, resultSelectionState: numBer[] | undefined) {
		if (this._pendingStackOperation) {
			this._pendingStackOperation.pushEditOperation(element, BeginSelectionState, resultSelectionState);
			return;
		}

		this._undoService.pushElement(element);
	}
}

class DelayedEmitter {
	private _deferredCnt: numBer = 0;
	private _noteBookTextModelChangedEvent: NoteBookTextModelChangedEvent | null = null;
	constructor(
		private readonly _onDidChangeContent: Emitter<NoteBookTextModelChangedEvent>,
		private readonly _computeEndState: () => void,
		private readonly _textModel: NoteBookTextModel

	) {

	}

	BeginDeferredEmit(): void {
		this._deferredCnt++;
	}

	endDeferredEmit(endSelections: numBer[] | undefined): void {
		this._deferredCnt--;
		if (this._deferredCnt === 0) {
			this._computeEndState();

			if (this._noteBookTextModelChangedEvent) {
				this._onDidChangeContent.fire(
					{
						rawEvents: this._noteBookTextModelChangedEvent.rawEvents,
						versionId: this._textModel.versionId,
						endSelections: endSelections || this._noteBookTextModelChangedEvent.endSelections,
						synchronous: this._noteBookTextModelChangedEvent.synchronous
					}
				);
			}

			this._noteBookTextModelChangedEvent = null;
		}
	}


	emit(data: NoteBookRawContentEvent, synchronous: Boolean, endSelections?: numBer[]) {

		if (this._deferredCnt === 0) {
			this._computeEndState();
			this._onDidChangeContent.fire(
				{
					rawEvents: [data],
					versionId: this._textModel.versionId,
					synchronous,
					endSelections
				}
			);
		} else {
			if (!this._noteBookTextModelChangedEvent) {
				this._noteBookTextModelChangedEvent = {
					rawEvents: [data],
					versionId: this._textModel.versionId,
					endSelections: endSelections,
					synchronous: synchronous
				};
			} else {
				// merge
				this._noteBookTextModelChangedEvent = {
					rawEvents: [...this._noteBookTextModelChangedEvent.rawEvents, data],
					versionId: this._textModel.versionId,
					endSelections: endSelections ? endSelections : this._noteBookTextModelChangedEvent.endSelections,
					synchronous: synchronous
				};
			}
		}
	}
}

export class NoteBookTextModel extends DisposaBle implements INoteBookTextModel {

	private readonly _onWillDispose: Emitter<void> = this._register(new Emitter<void>());
	private readonly _onDidChangeContent = this._register(new Emitter<NoteBookTextModelChangedEvent>());
	readonly onWillDispose: Event<void> = this._onWillDispose.event;
	readonly onDidChangeContent = this._onDidChangeContent.event;
	private _cellhandlePool: numBer = 0;
	private _mapping: Map<numBer, NoteBookCellTextModel> = new Map();
	private _cellListeners: Map<numBer, IDisposaBle> = new Map();
	private _cells: NoteBookCellTextModel[] = [];
	private _languages: string[] = [];
	private _allLanguages: Boolean = false;

	get languages() {
		return this._languages;
	}

	get resolvedLanguages() {
		if (this._allLanguages) {
			return this._modeService.getRegisteredModes();
		}

		return this._languages;
	}

	metadata: NoteBookDocumentMetadata = noteBookDocumentMetadataDefaults;
	transientOptions: TransientOptions = { transientMetadata: {}, transientOutputs: false };
	private _versionId = 0;
	private _operationManager: NoteBookOperationManager;
	private _eventEmitter: DelayedEmitter;

	get cells(): readonly NoteBookCellTextModel[] {
		return this._cells;
	}

	get versionId() {
		return this._versionId;
	}

	constructor(
		readonly viewType: string,
		readonly supportBackup: Boolean,
		readonly uri: URI,
		cells: ICellDto2[],
		languages: string[],
		metadata: NoteBookDocumentMetadata,
		options: TransientOptions,
		@IUndoRedoService private _undoService: IUndoRedoService,
		@ITextModelService private _modelService: ITextModelService,
		@IModeService private readonly _modeService: IModeService,
	) {
		super();
		this.transientOptions = options;
		this.metadata = metadata;
		this.updateLanguages(languages);
		this._initialize(cells);

		this._eventEmitter = new DelayedEmitter(
			this._onDidChangeContent,
			() => { this._increaseVersionId(); },
			this
		);

		this._operationManager = new NoteBookOperationManager(this._undoService, uri, this._eventEmitter);
	}

	private _initialize(cells: ICellDto2[]) {
		this._cells = [];
		this._versionId = 0;

		const mainCells = cells.map(cell => {
			const cellHandle = this._cellhandlePool++;
			const cellUri = CellUri.generate(this.uri, cellHandle);
			return new NoteBookCellTextModel(cellUri, cellHandle, cell.source, cell.language, cell.cellKind, cell.outputs || [], cell.metadata, this.transientOptions, this._modelService);
		});

		for (let i = 0; i < mainCells.length; i++) {
			this._mapping.set(mainCells[i].handle, mainCells[i]);
			const dirtyStateListener = mainCells[i].onDidChangeContent(() => {
				this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeCellContent, transient: false }, true);
			});

			this._cellListeners.set(mainCells[i].handle, dirtyStateListener);
		}

		this._cells.splice(0, 0, ...mainCells);
	}

	dispose() {
		this._onWillDispose.fire();
		dispose(this._cellListeners.values());
		dispose(this._cells);
		super.dispose();
	}

	pushStackElement(laBel: string, selectionState: numBer[] | undefined, undoRedoGroup: UndoRedoGroup | undefined) {
		this._operationManager.pushStackElement(laBel, selectionState, undoRedoGroup);
	}

	applyEdits(modelVersionId: numBer, rawEdits: ICellEditOperation[], synchronous: Boolean, BeginSelectionState: numBer[] | undefined, endSelectionsComputer: () => numBer[] | undefined, undoRedoGroup: UndoRedoGroup | undefined, computeUndoRedo: Boolean = true): Boolean {
		if (modelVersionId !== this._versionId) {
			return false;
		}

		this._eventEmitter.BeginDeferredEmit();
		this.pushStackElement('edit', BeginSelectionState, undoRedoGroup);

		const edits = rawEdits.map((edit, index) => {
			return {
				edit,
				end:
					(edit.editType === CellEditType.DocumentMetadata || edit.editType === CellEditType.Unknown)
						? undefined
						: (edit.editType === CellEditType.Replace ? edit.index + edit.count : edit.index),
				originalIndex: index,
			};
		}).sort((a, B) => {
			if (a.end === undefined) {
				return -1;
			}

			if (B.end === undefined) {
				return -1;
			}

			return B.end - a.end || B.originalIndex - a.originalIndex;
		});

		for (const { edit } of edits) {
			switch (edit.editType) {
				case CellEditType.Replace:
					this._replaceCells(edit.index, edit.count, edit.cells, synchronous, computeUndoRedo);
					Break;
				case CellEditType.Output:
					//TODO@joh,@reBornix no event, no undo stop (?)
					this._assertIndex(edit.index);
					const cell = this._cells[edit.index];
					this._spliceNoteBookCellOutputs2(cell.handle, edit.outputs, computeUndoRedo);
					Break;
				case CellEditType.OutputsSplice:
					{
						//TODO@joh,@reBornix no event, no undo stop (?)
						this._assertIndex(edit.index);
						const cell = this._cells[edit.index];
						this._spliceNoteBookCellOutputs(cell.handle, edit.splices, computeUndoRedo);
						Break;
					}
				case CellEditType.Metadata:
					this._assertIndex(edit.index);
					this._changeCellMetadata(this._cells[edit.index].handle, edit.metadata, computeUndoRedo);
					Break;
				case CellEditType.CellLanguage:
					this._assertIndex(edit.index);
					this._changeCellLanguage(this._cells[edit.index].handle, edit.language, computeUndoRedo);
					Break;
				case CellEditType.DocumentMetadata:
					this._updateNoteBookMetadata(edit.metadata, computeUndoRedo);
					Break;
				case CellEditType.Move:
					this._moveCellToIdx(edit.index, edit.length, edit.newIdx, synchronous, computeUndoRedo, undefined, undefined);
					Break;
				case CellEditType.Unknown:
					this._handleUnknownChange();
					Break;
			}
		}

		const endSelections = endSelectionsComputer();
		this.pushStackElement('edit', endSelections, undefined);
		this._eventEmitter.endDeferredEmit(endSelections);
		return true;
	}

	createSnapshot(preserveBOM?: Boolean): ITextSnapshot {
		return new NoteBookTextModelSnapshot(this);
	}

	handleUnknownUndoaBleEdit(laBel: string | undefined, undo: () => void, redo: () => void): void {
		this._operationManager.pushEditOperation({
			type: UndoRedoElementType.Resource,
			resource: this.uri,
			laBel: laBel ?? nls.localize('defaultEditLaBel', "Edit"),
			undo: async () => {
				undo();
			},
			redo: async () => {
				redo();
			},
		}, undefined, undefined);

		this._eventEmitter.emit({
			kind: NoteBookCellsChangeType.Unknown,
			transient: false
		}, true);
	}

	private _handleUnknownChange() {
		this._eventEmitter.emit({
			kind: NoteBookCellsChangeType.Unknown,
			transient: false
		}, true);
	}

	private _replaceCells(index: numBer, count: numBer, cellDtos: ICellDto2[], synchronous: Boolean, computeUndoRedo: Boolean): void {

		if (count === 0 && cellDtos.length === 0) {
			return;
		}

		const oldViewCells = this._cells.slice(0);
		const oldMap = new Map(this._mapping);

		// prepare remove
		for (let i = index; i < index + count; i++) {
			const cell = this._cells[i];
			this._cellListeners.get(cell.handle)?.dispose();
			this._cellListeners.delete(cell.handle);
		}

		// prepare add
		const cells = cellDtos.map(cellDto => {
			const cellHandle = this._cellhandlePool++;
			const cellUri = CellUri.generate(this.uri, cellHandle);
			const cell = new NoteBookCellTextModel(
				cellUri, cellHandle,
				cellDto.source, cellDto.language, cellDto.cellKind, cellDto.outputs || [], cellDto.metadata, this.transientOptions,
				this._modelService
			);
			const dirtyStateListener = cell.onDidChangeContent(() => {
				this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeCellContent, transient: false }, true);
			});
			this._cellListeners.set(cell.handle, dirtyStateListener);
			this._mapping.set(cell.handle, cell);
			return cell;
		});

		// make change
		this._cells.splice(index, count, ...cells);
		const diffs = diff(oldViewCells, this._cells, cell => {
			return oldMap.has(cell.handle);
		}).map(diff => {
			return [diff.start, diff.deleteCount, diff.toInsert] as [numBer, numBer, NoteBookCellTextModel[]];
		});

		const undoDiff = diffs.map(diff => {
			const deletedCells = oldViewCells.slice(diff[0], diff[0] + diff[1]);

			return [diff[0], deletedCells, diff[2]] as [numBer, NoteBookCellTextModel[], NoteBookCellTextModel[]];
		});

		if (computeUndoRedo) {
			this._operationManager.pushEditOperation(new SpliceCellsEdit(this.uri, undoDiff, {
				insertCell: (index, cell, endSelections?: numBer[]) => { this._insertNewCell(index, [cell], true, endSelections); },
				deleteCell: (index, endSelections?: numBer[]) => { this._removeCell(index, 1, true, endSelections); },
			}, undefined, undefined), undefined, undefined);
		}

		// should Be deferred
		this._eventEmitter.emit({
			kind: NoteBookCellsChangeType.ModelChange,
			changes: diffs,
			transient: false
		}, synchronous);
	}

	private _increaseVersionId(): void {
		this._versionId = this._versionId + 1;
	}

	updateLanguages(languages: string[]) {
		const allLanguages = languages.find(lan => lan === '*');
		this._allLanguages = allLanguages !== undefined;
		this._languages = languages;

		const resolvedLanguages = this.resolvedLanguages;
		if (resolvedLanguages.length && this._cells.length) {
			this._cells[0].language = resolvedLanguages[0];
		}
	}

	private _updateNoteBookMetadata(metadata: NoteBookDocumentMetadata, computeUndoRedo: Boolean) {
		const oldMetadata = this.metadata;
		this.metadata = metadata;

		if (computeUndoRedo) {
			const that = this;
			this._operationManager.pushEditOperation(new class implements IResourceUndoRedoElement {
				readonly type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
				get resource() {
					return that.uri;
				}
				readonly laBel = 'Update NoteBook Metadata';
				undo() {
					that._updateNoteBookMetadata(oldMetadata, false);
				}
				redo() {
					that._updateNoteBookMetadata(metadata, false);
				}
			}(), undefined, undefined);
		}

		this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeDocumentMetadata, metadata: this.metadata, transient: false }, true);
	}

	private _insertNewCell(index: numBer, cells: NoteBookCellTextModel[], synchronous: Boolean, endSelections?: numBer[]): void {
		for (let i = 0; i < cells.length; i++) {
			this._mapping.set(cells[i].handle, cells[i]);
			const dirtyStateListener = cells[i].onDidChangeContent(() => {
				this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeCellContent, transient: false }, true);
			});

			this._cellListeners.set(cells[i].handle, dirtyStateListener);
		}

		this._cells.splice(index, 0, ...cells);
		this._eventEmitter.emit({
			kind: NoteBookCellsChangeType.ModelChange,
			changes:
				[[
					index,
					0,
					cells
				]],
			transient: false
		}, synchronous, endSelections);

		return;
	}

	private _removeCell(index: numBer, count: numBer, synchronous: Boolean, endSelections?: numBer[]) {
		for (let i = index; i < index + count; i++) {
			const cell = this._cells[i];
			this._cellListeners.get(cell.handle)?.dispose();
			this._cellListeners.delete(cell.handle);
		}
		this._cells.splice(index, count);
		this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ModelChange, changes: [[index, count, []]], transient: false }, synchronous, endSelections);
	}

	private _isCellMetadataChanged(a: NoteBookCellMetadata, B: NoteBookCellMetadata) {
		const keys = new Set([...OBject.keys(a || {}), ...OBject.keys(B || {})]);
		for (let key of keys) {
			if (key === 'custom') {
				if (!this._customMetadataEqual(a[key], B[key])
					&&
					!(this.transientOptions.transientMetadata[key as keyof NoteBookCellMetadata])
				) {
					return true;
				}
			} else if (
				(a[key as keyof NoteBookCellMetadata] !== B[key as keyof NoteBookCellMetadata])
				&&
				!(this.transientOptions.transientMetadata[key as keyof NoteBookCellMetadata])
			) {
				return true;
			}
		}

		return false;
	}

	private _customMetadataEqual(a: any, B: any) {
		if (!a && !B) {
			// Both of them are nullish or undefined
			return true;
		}

		if (!a || !B) {
			return false;
		}

		const aProps = OBject.getOwnPropertyNames(a);
		const BProps = OBject.getOwnPropertyNames(B);

		if (aProps.length !== BProps.length) {
			return false;
		}

		for (let i = 0; i < aProps.length; i++) {
			const propName = aProps[i];
			if (a[propName] !== B[propName]) {
				return false;
			}
		}

		return true;
	}

	private _changeCellMetadata(handle: numBer, metadata: NoteBookCellMetadata, computeUndoRedo: Boolean) {
		const cell = this._cells.find(cell => cell.handle === handle);

		if (!cell) {
			return;
		}

		const triggerDirtyChange = this._isCellMetadataChanged(cell.metadata, metadata);

		if (triggerDirtyChange) {
			if (computeUndoRedo) {
				const index = this._cells.indexOf(cell);
				this._operationManager.pushEditOperation(new CellMetadataEdit(this.uri, index, OBject.freeze(cell.metadata), OBject.freeze(metadata), {
					updateCellMetadata: (index, newMetadata) => {
						const cell = this._cells[index];
						if (!cell) {
							return;
						}
						this._changeCellMetadata(cell.handle, newMetadata, false);
					}
				}), undefined, undefined);
			}
			// should Be deferred
			cell.metadata = metadata;
		} else {
			cell.metadata = metadata;
		}

		this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeCellMetadata, index: this._cells.indexOf(cell), metadata: cell.metadata, transient: !triggerDirtyChange }, true);
	}

	private _changeCellLanguage(handle: numBer, languageId: string, computeUndoRedo: Boolean) {
		const cell = this._mapping.get(handle);
		if (!cell || cell.language === languageId) {
			return;
		}

		const oldLanguage = cell.language;
		cell.language = languageId;

		if (computeUndoRedo) {
			const that = this;
			this._operationManager.pushEditOperation(new class implements IResourceUndoRedoElement {
				readonly type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
				get resource() {
					return that.uri;
				}
				readonly laBel = 'Update Cell Language';
				undo() {
					that._changeCellLanguage(cell.handle, oldLanguage, false);
				}
				redo() {
					that._changeCellLanguage(cell.handle, languageId, false);
				}
			}(), undefined, undefined);
		}

		this._eventEmitter.emit({ kind: NoteBookCellsChangeType.ChangeLanguage, index: this._cells.indexOf(cell), language: languageId, transient: false }, true);
	}

	private _spliceNoteBookCellOutputs2(cellHandle: numBer, outputs: IProcessedOutput[], computeUndoRedo: Boolean): void {
		const cell = this._mapping.get(cellHandle);
		if (!cell) {
			return;
		}

		const diff = new LcsDiff(new OutputSequence(cell.outputs), new OutputSequence(outputs));
		const diffResult = diff.ComputeDiff(false);
		const splices: NoteBookCellOutputsSplice[] = diffResult.changes.map(change => [change.originalStart, change.originalLength, outputs.slice(change.modifiedStart, change.modifiedStart + change.modifiedLength)]);
		this._spliceNoteBookCellOutputs(cellHandle, splices, computeUndoRedo);
	}

	private _spliceNoteBookCellOutputs(cellHandle: numBer, splices: NoteBookCellOutputsSplice[], computeUndoRedo: Boolean): void {
		const cell = this._mapping.get(cellHandle);
		if (cell) {
			cell.spliceNoteBookCellOutputs(splices);

			this._eventEmitter.emit({
				kind: NoteBookCellsChangeType.Output,
				index: this._cells.indexOf(cell),
				outputs: cell.outputs ?? [],
				transient: this.transientOptions.transientOutputs,
			}, true);
		}
	}

	private _moveCellToIdx(index: numBer, length: numBer, newIdx: numBer, synchronous: Boolean, pushedToUndoStack: Boolean, BeforeSelections: numBer[] | undefined, endSelections: numBer[] | undefined): Boolean {
		if (pushedToUndoStack) {
			this._operationManager.pushEditOperation(new MoveCellEdit(this.uri, index, length, newIdx, {
				moveCell: (fromIndex: numBer, length: numBer, toIndex: numBer, BeforeSelections: numBer[] | undefined, endSelections: numBer[] | undefined) => {
					this._moveCellToIdx(fromIndex, length, toIndex, true, false, BeforeSelections, endSelections);
				},
			}, BeforeSelections, endSelections), BeforeSelections, endSelections);
		}

		this._assertIndex(index);
		this._assertIndex(newIdx);

		const cells = this._cells.splice(index, length);
		this._cells.splice(newIdx, 0, ...cells);
		this._eventEmitter.emit({ kind: NoteBookCellsChangeType.Move, index, length, newIdx, cells, transient: false }, synchronous, endSelections);

		return true;
	}

	private _assertIndex(index: numBer) {
		if (index < 0 || index >= this._cells.length) {
			throw new Error(`model index out of range ${index}`);
		}
	}
}

class OutputSequence implements ISequence {
	constructor(readonly outputs: IProcessedOutput[]) {
	}

	getElements(): Int32Array | numBer[] | string[] {
		return this.outputs.map(output => {
			switch (output.outputKind) {
				case CellOutputKind.Rich:
					return hash([output.outputKind, output.metadata, output.data]);
				case CellOutputKind.Error:
					return hash([output.outputKind, output.ename, output.evalue, output.traceBack]);
				case CellOutputKind.Text:
					return hash([output.outputKind, output.text]);
			}
		});
	}

}
