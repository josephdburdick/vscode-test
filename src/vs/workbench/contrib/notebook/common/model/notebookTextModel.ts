/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { INotebookTextModel, NotebookCellOutputsSplice, NotebookDocumentMetAdAtA, NotebookCellMetAdAtA, ICellEditOperAtion, CellEditType, CellUri, notebookDocumentMetAdAtADefAults, diff, NotebookCellsChAngeType, ICellDto2, TrAnsientOptions, NotebookTextModelChAngedEvent, NotebookRAwContentEvent, IProcessedOutput, CellOutputKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { ITextSnApshot } from 'vs/editor/common/model';
import { IUndoRedoService, UndoRedoElementType, IUndoRedoElement, IResourceUndoRedoElement, UndoRedoGroup, IWorkspAceUndoRedoElement } from 'vs/plAtform/undoRedo/common/undoRedo';
import { MoveCellEdit, SpliceCellsEdit, CellMetAdAtAEdit } from 'vs/workbench/contrib/notebook/common/model/cellEdit';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { ISequence, LcsDiff } from 'vs/bAse/common/diff/diff';
import { hAsh } from 'vs/bAse/common/hAsh';

export clAss NotebookTextModelSnApshot implements ITextSnApshot {

	privAte _index: number = -1;

	constructor(privAte _model: NotebookTextModel) { }

	reAd(): string | null {

		if (this._index === -1) {
			this._index++;
			return `{ "metAdAtA": ${JSON.stringify(this._model.metAdAtA)}, "lAnguAges": ${JSON.stringify(this._model.lAnguAges)}, "cells": [`;
		}

		if (this._index < this._model.cells.length) {
			const cell = this._model.cells[this._index];

			const dAtA = {
				source: cell.getVAlue(),
				metAdAtA: cell.metAdAtA,
				cellKind: cell.cellKind,
				lAnguAge: cell.lAnguAge,
				outputs: cell.outputs
			};

			const rAwStr = JSON.stringify(dAtA);
			const isLAstCell = this._index === this._model.cells.length - 1;

			this._index++;
			return isLAstCell ? rAwStr : (rAwStr + ',');
		} else if (this._index === this._model.cells.length) {
			this._index++;
			return `]}`;
		} else {
			return null;
		}
	}

}

clAss StAckOperAtion implements IWorkspAceUndoRedoElement {
	type: UndoRedoElementType.WorkspAce;

	privAte _operAtions: IUndoRedoElement[] = [];
	privAte _beginSelectionStAte: number[] | undefined = undefined;
	privAte _resultSelectionStAte: number[] | undefined = undefined;

	constructor(reAdonly resource: URI, reAdonly lAbel: string, reAdonly undoRedoGroup: UndoRedoGroup | undefined, privAte _delAyedEmitter: DelAyedEmitter, selectionStAte: number[] | undefined) {
		this.type = UndoRedoElementType.WorkspAce;
		this._beginSelectionStAte = selectionStAte;
	}
	get resources(): reAdonly URI[] {
		return [this.resource];
	}

	get isEmpty(): booleAn {
		return this._operAtions.length === 0;
	}

	pushEndSelectionStAte(selectionStAte: number[] | undefined) {
		this._resultSelectionStAte = selectionStAte;
	}

	pushEditOperAtion(element: IUndoRedoElement, beginSelectionStAte: number[] | undefined, resultSelectionStAte: number[] | undefined) {
		if (this._operAtions.length === 0) {
			this._beginSelectionStAte = this._beginSelectionStAte || beginSelectionStAte;
		}
		this._operAtions.push(element);
		this._resultSelectionStAte = resultSelectionStAte;
	}

	Async undo(): Promise<void> {
		this._delAyedEmitter.beginDeferredEmit();
		for (let i = this._operAtions.length - 1; i >= 0; i--) {
			AwAit this._operAtions[i].undo();
		}
		this._delAyedEmitter.endDeferredEmit(this._beginSelectionStAte);
	}

	Async redo(): Promise<void> {
		this._delAyedEmitter.beginDeferredEmit();
		for (let i = 0; i < this._operAtions.length; i++) {
			AwAit this._operAtions[i].redo();
		}
		this._delAyedEmitter.endDeferredEmit(this._resultSelectionStAte);
	}
}

export clAss NotebookOperAtionMAnAger {
	privAte _pendingStAckOperAtion: StAckOperAtion | null = null;
	constructor(privAte _undoService: IUndoRedoService, privAte _resource: URI, privAte _delAyedEmitter: DelAyedEmitter) {

	}

	pushStAckElement(lAbel: string, selectionStAte: number[] | undefined, undoRedoGroup: UndoRedoGroup | undefined) {
		if (this._pendingStAckOperAtion) {
			this._pendingStAckOperAtion.pushEndSelectionStAte(selectionStAte);
			if (!this._pendingStAckOperAtion.isEmpty) {
				this._undoService.pushElement(this._pendingStAckOperAtion, this._pendingStAckOperAtion.undoRedoGroup);
			}
			this._pendingStAckOperAtion = null;
			return;
		}

		this._pendingStAckOperAtion = new StAckOperAtion(this._resource, lAbel, undoRedoGroup, this._delAyedEmitter, selectionStAte);
	}

	pushEditOperAtion(element: IUndoRedoElement, beginSelectionStAte: number[] | undefined, resultSelectionStAte: number[] | undefined) {
		if (this._pendingStAckOperAtion) {
			this._pendingStAckOperAtion.pushEditOperAtion(element, beginSelectionStAte, resultSelectionStAte);
			return;
		}

		this._undoService.pushElement(element);
	}
}

clAss DelAyedEmitter {
	privAte _deferredCnt: number = 0;
	privAte _notebookTextModelChAngedEvent: NotebookTextModelChAngedEvent | null = null;
	constructor(
		privAte reAdonly _onDidChAngeContent: Emitter<NotebookTextModelChAngedEvent>,
		privAte reAdonly _computeEndStAte: () => void,
		privAte reAdonly _textModel: NotebookTextModel

	) {

	}

	beginDeferredEmit(): void {
		this._deferredCnt++;
	}

	endDeferredEmit(endSelections: number[] | undefined): void {
		this._deferredCnt--;
		if (this._deferredCnt === 0) {
			this._computeEndStAte();

			if (this._notebookTextModelChAngedEvent) {
				this._onDidChAngeContent.fire(
					{
						rAwEvents: this._notebookTextModelChAngedEvent.rAwEvents,
						versionId: this._textModel.versionId,
						endSelections: endSelections || this._notebookTextModelChAngedEvent.endSelections,
						synchronous: this._notebookTextModelChAngedEvent.synchronous
					}
				);
			}

			this._notebookTextModelChAngedEvent = null;
		}
	}


	emit(dAtA: NotebookRAwContentEvent, synchronous: booleAn, endSelections?: number[]) {

		if (this._deferredCnt === 0) {
			this._computeEndStAte();
			this._onDidChAngeContent.fire(
				{
					rAwEvents: [dAtA],
					versionId: this._textModel.versionId,
					synchronous,
					endSelections
				}
			);
		} else {
			if (!this._notebookTextModelChAngedEvent) {
				this._notebookTextModelChAngedEvent = {
					rAwEvents: [dAtA],
					versionId: this._textModel.versionId,
					endSelections: endSelections,
					synchronous: synchronous
				};
			} else {
				// merge
				this._notebookTextModelChAngedEvent = {
					rAwEvents: [...this._notebookTextModelChAngedEvent.rAwEvents, dAtA],
					versionId: this._textModel.versionId,
					endSelections: endSelections ? endSelections : this._notebookTextModelChAngedEvent.endSelections,
					synchronous: synchronous
				};
			}
		}
	}
}

export clAss NotebookTextModel extends DisposAble implements INotebookTextModel {

	privAte reAdonly _onWillDispose: Emitter<void> = this._register(new Emitter<void>());
	privAte reAdonly _onDidChAngeContent = this._register(new Emitter<NotebookTextModelChAngedEvent>());
	reAdonly onWillDispose: Event<void> = this._onWillDispose.event;
	reAdonly onDidChAngeContent = this._onDidChAngeContent.event;
	privAte _cellhAndlePool: number = 0;
	privAte _mApping: MAp<number, NotebookCellTextModel> = new MAp();
	privAte _cellListeners: MAp<number, IDisposAble> = new MAp();
	privAte _cells: NotebookCellTextModel[] = [];
	privAte _lAnguAges: string[] = [];
	privAte _AllLAnguAges: booleAn = fAlse;

	get lAnguAges() {
		return this._lAnguAges;
	}

	get resolvedLAnguAges() {
		if (this._AllLAnguAges) {
			return this._modeService.getRegisteredModes();
		}

		return this._lAnguAges;
	}

	metAdAtA: NotebookDocumentMetAdAtA = notebookDocumentMetAdAtADefAults;
	trAnsientOptions: TrAnsientOptions = { trAnsientMetAdAtA: {}, trAnsientOutputs: fAlse };
	privAte _versionId = 0;
	privAte _operAtionMAnAger: NotebookOperAtionMAnAger;
	privAte _eventEmitter: DelAyedEmitter;

	get cells(): reAdonly NotebookCellTextModel[] {
		return this._cells;
	}

	get versionId() {
		return this._versionId;
	}

	constructor(
		reAdonly viewType: string,
		reAdonly supportBAckup: booleAn,
		reAdonly uri: URI,
		cells: ICellDto2[],
		lAnguAges: string[],
		metAdAtA: NotebookDocumentMetAdAtA,
		options: TrAnsientOptions,
		@IUndoRedoService privAte _undoService: IUndoRedoService,
		@ITextModelService privAte _modelService: ITextModelService,
		@IModeService privAte reAdonly _modeService: IModeService,
	) {
		super();
		this.trAnsientOptions = options;
		this.metAdAtA = metAdAtA;
		this.updAteLAnguAges(lAnguAges);
		this._initiAlize(cells);

		this._eventEmitter = new DelAyedEmitter(
			this._onDidChAngeContent,
			() => { this._increAseVersionId(); },
			this
		);

		this._operAtionMAnAger = new NotebookOperAtionMAnAger(this._undoService, uri, this._eventEmitter);
	}

	privAte _initiAlize(cells: ICellDto2[]) {
		this._cells = [];
		this._versionId = 0;

		const mAinCells = cells.mAp(cell => {
			const cellHAndle = this._cellhAndlePool++;
			const cellUri = CellUri.generAte(this.uri, cellHAndle);
			return new NotebookCellTextModel(cellUri, cellHAndle, cell.source, cell.lAnguAge, cell.cellKind, cell.outputs || [], cell.metAdAtA, this.trAnsientOptions, this._modelService);
		});

		for (let i = 0; i < mAinCells.length; i++) {
			this._mApping.set(mAinCells[i].hAndle, mAinCells[i]);
			const dirtyStAteListener = mAinCells[i].onDidChAngeContent(() => {
				this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeCellContent, trAnsient: fAlse }, true);
			});

			this._cellListeners.set(mAinCells[i].hAndle, dirtyStAteListener);
		}

		this._cells.splice(0, 0, ...mAinCells);
	}

	dispose() {
		this._onWillDispose.fire();
		dispose(this._cellListeners.vAlues());
		dispose(this._cells);
		super.dispose();
	}

	pushStAckElement(lAbel: string, selectionStAte: number[] | undefined, undoRedoGroup: UndoRedoGroup | undefined) {
		this._operAtionMAnAger.pushStAckElement(lAbel, selectionStAte, undoRedoGroup);
	}

	ApplyEdits(modelVersionId: number, rAwEdits: ICellEditOperAtion[], synchronous: booleAn, beginSelectionStAte: number[] | undefined, endSelectionsComputer: () => number[] | undefined, undoRedoGroup: UndoRedoGroup | undefined, computeUndoRedo: booleAn = true): booleAn {
		if (modelVersionId !== this._versionId) {
			return fAlse;
		}

		this._eventEmitter.beginDeferredEmit();
		this.pushStAckElement('edit', beginSelectionStAte, undoRedoGroup);

		const edits = rAwEdits.mAp((edit, index) => {
			return {
				edit,
				end:
					(edit.editType === CellEditType.DocumentMetAdAtA || edit.editType === CellEditType.Unknown)
						? undefined
						: (edit.editType === CellEditType.ReplAce ? edit.index + edit.count : edit.index),
				originAlIndex: index,
			};
		}).sort((A, b) => {
			if (A.end === undefined) {
				return -1;
			}

			if (b.end === undefined) {
				return -1;
			}

			return b.end - A.end || b.originAlIndex - A.originAlIndex;
		});

		for (const { edit } of edits) {
			switch (edit.editType) {
				cAse CellEditType.ReplAce:
					this._replAceCells(edit.index, edit.count, edit.cells, synchronous, computeUndoRedo);
					breAk;
				cAse CellEditType.Output:
					//TODO@joh,@rebornix no event, no undo stop (?)
					this._AssertIndex(edit.index);
					const cell = this._cells[edit.index];
					this._spliceNotebookCellOutputs2(cell.hAndle, edit.outputs, computeUndoRedo);
					breAk;
				cAse CellEditType.OutputsSplice:
					{
						//TODO@joh,@rebornix no event, no undo stop (?)
						this._AssertIndex(edit.index);
						const cell = this._cells[edit.index];
						this._spliceNotebookCellOutputs(cell.hAndle, edit.splices, computeUndoRedo);
						breAk;
					}
				cAse CellEditType.MetAdAtA:
					this._AssertIndex(edit.index);
					this._chAngeCellMetAdAtA(this._cells[edit.index].hAndle, edit.metAdAtA, computeUndoRedo);
					breAk;
				cAse CellEditType.CellLAnguAge:
					this._AssertIndex(edit.index);
					this._chAngeCellLAnguAge(this._cells[edit.index].hAndle, edit.lAnguAge, computeUndoRedo);
					breAk;
				cAse CellEditType.DocumentMetAdAtA:
					this._updAteNotebookMetAdAtA(edit.metAdAtA, computeUndoRedo);
					breAk;
				cAse CellEditType.Move:
					this._moveCellToIdx(edit.index, edit.length, edit.newIdx, synchronous, computeUndoRedo, undefined, undefined);
					breAk;
				cAse CellEditType.Unknown:
					this._hAndleUnknownChAnge();
					breAk;
			}
		}

		const endSelections = endSelectionsComputer();
		this.pushStAckElement('edit', endSelections, undefined);
		this._eventEmitter.endDeferredEmit(endSelections);
		return true;
	}

	creAteSnApshot(preserveBOM?: booleAn): ITextSnApshot {
		return new NotebookTextModelSnApshot(this);
	}

	hAndleUnknownUndoAbleEdit(lAbel: string | undefined, undo: () => void, redo: () => void): void {
		this._operAtionMAnAger.pushEditOperAtion({
			type: UndoRedoElementType.Resource,
			resource: this.uri,
			lAbel: lAbel ?? nls.locAlize('defAultEditLAbel', "Edit"),
			undo: Async () => {
				undo();
			},
			redo: Async () => {
				redo();
			},
		}, undefined, undefined);

		this._eventEmitter.emit({
			kind: NotebookCellsChAngeType.Unknown,
			trAnsient: fAlse
		}, true);
	}

	privAte _hAndleUnknownChAnge() {
		this._eventEmitter.emit({
			kind: NotebookCellsChAngeType.Unknown,
			trAnsient: fAlse
		}, true);
	}

	privAte _replAceCells(index: number, count: number, cellDtos: ICellDto2[], synchronous: booleAn, computeUndoRedo: booleAn): void {

		if (count === 0 && cellDtos.length === 0) {
			return;
		}

		const oldViewCells = this._cells.slice(0);
		const oldMAp = new MAp(this._mApping);

		// prepAre remove
		for (let i = index; i < index + count; i++) {
			const cell = this._cells[i];
			this._cellListeners.get(cell.hAndle)?.dispose();
			this._cellListeners.delete(cell.hAndle);
		}

		// prepAre Add
		const cells = cellDtos.mAp(cellDto => {
			const cellHAndle = this._cellhAndlePool++;
			const cellUri = CellUri.generAte(this.uri, cellHAndle);
			const cell = new NotebookCellTextModel(
				cellUri, cellHAndle,
				cellDto.source, cellDto.lAnguAge, cellDto.cellKind, cellDto.outputs || [], cellDto.metAdAtA, this.trAnsientOptions,
				this._modelService
			);
			const dirtyStAteListener = cell.onDidChAngeContent(() => {
				this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeCellContent, trAnsient: fAlse }, true);
			});
			this._cellListeners.set(cell.hAndle, dirtyStAteListener);
			this._mApping.set(cell.hAndle, cell);
			return cell;
		});

		// mAke chAnge
		this._cells.splice(index, count, ...cells);
		const diffs = diff(oldViewCells, this._cells, cell => {
			return oldMAp.hAs(cell.hAndle);
		}).mAp(diff => {
			return [diff.stArt, diff.deleteCount, diff.toInsert] As [number, number, NotebookCellTextModel[]];
		});

		const undoDiff = diffs.mAp(diff => {
			const deletedCells = oldViewCells.slice(diff[0], diff[0] + diff[1]);

			return [diff[0], deletedCells, diff[2]] As [number, NotebookCellTextModel[], NotebookCellTextModel[]];
		});

		if (computeUndoRedo) {
			this._operAtionMAnAger.pushEditOperAtion(new SpliceCellsEdit(this.uri, undoDiff, {
				insertCell: (index, cell, endSelections?: number[]) => { this._insertNewCell(index, [cell], true, endSelections); },
				deleteCell: (index, endSelections?: number[]) => { this._removeCell(index, 1, true, endSelections); },
			}, undefined, undefined), undefined, undefined);
		}

		// should be deferred
		this._eventEmitter.emit({
			kind: NotebookCellsChAngeType.ModelChAnge,
			chAnges: diffs,
			trAnsient: fAlse
		}, synchronous);
	}

	privAte _increAseVersionId(): void {
		this._versionId = this._versionId + 1;
	}

	updAteLAnguAges(lAnguAges: string[]) {
		const AllLAnguAges = lAnguAges.find(lAn => lAn === '*');
		this._AllLAnguAges = AllLAnguAges !== undefined;
		this._lAnguAges = lAnguAges;

		const resolvedLAnguAges = this.resolvedLAnguAges;
		if (resolvedLAnguAges.length && this._cells.length) {
			this._cells[0].lAnguAge = resolvedLAnguAges[0];
		}
	}

	privAte _updAteNotebookMetAdAtA(metAdAtA: NotebookDocumentMetAdAtA, computeUndoRedo: booleAn) {
		const oldMetAdAtA = this.metAdAtA;
		this.metAdAtA = metAdAtA;

		if (computeUndoRedo) {
			const thAt = this;
			this._operAtionMAnAger.pushEditOperAtion(new clAss implements IResourceUndoRedoElement {
				reAdonly type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
				get resource() {
					return thAt.uri;
				}
				reAdonly lAbel = 'UpdAte Notebook MetAdAtA';
				undo() {
					thAt._updAteNotebookMetAdAtA(oldMetAdAtA, fAlse);
				}
				redo() {
					thAt._updAteNotebookMetAdAtA(metAdAtA, fAlse);
				}
			}(), undefined, undefined);
		}

		this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeDocumentMetAdAtA, metAdAtA: this.metAdAtA, trAnsient: fAlse }, true);
	}

	privAte _insertNewCell(index: number, cells: NotebookCellTextModel[], synchronous: booleAn, endSelections?: number[]): void {
		for (let i = 0; i < cells.length; i++) {
			this._mApping.set(cells[i].hAndle, cells[i]);
			const dirtyStAteListener = cells[i].onDidChAngeContent(() => {
				this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeCellContent, trAnsient: fAlse }, true);
			});

			this._cellListeners.set(cells[i].hAndle, dirtyStAteListener);
		}

		this._cells.splice(index, 0, ...cells);
		this._eventEmitter.emit({
			kind: NotebookCellsChAngeType.ModelChAnge,
			chAnges:
				[[
					index,
					0,
					cells
				]],
			trAnsient: fAlse
		}, synchronous, endSelections);

		return;
	}

	privAte _removeCell(index: number, count: number, synchronous: booleAn, endSelections?: number[]) {
		for (let i = index; i < index + count; i++) {
			const cell = this._cells[i];
			this._cellListeners.get(cell.hAndle)?.dispose();
			this._cellListeners.delete(cell.hAndle);
		}
		this._cells.splice(index, count);
		this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ModelChAnge, chAnges: [[index, count, []]], trAnsient: fAlse }, synchronous, endSelections);
	}

	privAte _isCellMetAdAtAChAnged(A: NotebookCellMetAdAtA, b: NotebookCellMetAdAtA) {
		const keys = new Set([...Object.keys(A || {}), ...Object.keys(b || {})]);
		for (let key of keys) {
			if (key === 'custom') {
				if (!this._customMetAdAtAEquAl(A[key], b[key])
					&&
					!(this.trAnsientOptions.trAnsientMetAdAtA[key As keyof NotebookCellMetAdAtA])
				) {
					return true;
				}
			} else if (
				(A[key As keyof NotebookCellMetAdAtA] !== b[key As keyof NotebookCellMetAdAtA])
				&&
				!(this.trAnsientOptions.trAnsientMetAdAtA[key As keyof NotebookCellMetAdAtA])
			) {
				return true;
			}
		}

		return fAlse;
	}

	privAte _customMetAdAtAEquAl(A: Any, b: Any) {
		if (!A && !b) {
			// both of them Are nullish or undefined
			return true;
		}

		if (!A || !b) {
			return fAlse;
		}

		const AProps = Object.getOwnPropertyNAmes(A);
		const bProps = Object.getOwnPropertyNAmes(b);

		if (AProps.length !== bProps.length) {
			return fAlse;
		}

		for (let i = 0; i < AProps.length; i++) {
			const propNAme = AProps[i];
			if (A[propNAme] !== b[propNAme]) {
				return fAlse;
			}
		}

		return true;
	}

	privAte _chAngeCellMetAdAtA(hAndle: number, metAdAtA: NotebookCellMetAdAtA, computeUndoRedo: booleAn) {
		const cell = this._cells.find(cell => cell.hAndle === hAndle);

		if (!cell) {
			return;
		}

		const triggerDirtyChAnge = this._isCellMetAdAtAChAnged(cell.metAdAtA, metAdAtA);

		if (triggerDirtyChAnge) {
			if (computeUndoRedo) {
				const index = this._cells.indexOf(cell);
				this._operAtionMAnAger.pushEditOperAtion(new CellMetAdAtAEdit(this.uri, index, Object.freeze(cell.metAdAtA), Object.freeze(metAdAtA), {
					updAteCellMetAdAtA: (index, newMetAdAtA) => {
						const cell = this._cells[index];
						if (!cell) {
							return;
						}
						this._chAngeCellMetAdAtA(cell.hAndle, newMetAdAtA, fAlse);
					}
				}), undefined, undefined);
			}
			// should be deferred
			cell.metAdAtA = metAdAtA;
		} else {
			cell.metAdAtA = metAdAtA;
		}

		this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeCellMetAdAtA, index: this._cells.indexOf(cell), metAdAtA: cell.metAdAtA, trAnsient: !triggerDirtyChAnge }, true);
	}

	privAte _chAngeCellLAnguAge(hAndle: number, lAnguAgeId: string, computeUndoRedo: booleAn) {
		const cell = this._mApping.get(hAndle);
		if (!cell || cell.lAnguAge === lAnguAgeId) {
			return;
		}

		const oldLAnguAge = cell.lAnguAge;
		cell.lAnguAge = lAnguAgeId;

		if (computeUndoRedo) {
			const thAt = this;
			this._operAtionMAnAger.pushEditOperAtion(new clAss implements IResourceUndoRedoElement {
				reAdonly type: UndoRedoElementType.Resource = UndoRedoElementType.Resource;
				get resource() {
					return thAt.uri;
				}
				reAdonly lAbel = 'UpdAte Cell LAnguAge';
				undo() {
					thAt._chAngeCellLAnguAge(cell.hAndle, oldLAnguAge, fAlse);
				}
				redo() {
					thAt._chAngeCellLAnguAge(cell.hAndle, lAnguAgeId, fAlse);
				}
			}(), undefined, undefined);
		}

		this._eventEmitter.emit({ kind: NotebookCellsChAngeType.ChAngeLAnguAge, index: this._cells.indexOf(cell), lAnguAge: lAnguAgeId, trAnsient: fAlse }, true);
	}

	privAte _spliceNotebookCellOutputs2(cellHAndle: number, outputs: IProcessedOutput[], computeUndoRedo: booleAn): void {
		const cell = this._mApping.get(cellHAndle);
		if (!cell) {
			return;
		}

		const diff = new LcsDiff(new OutputSequence(cell.outputs), new OutputSequence(outputs));
		const diffResult = diff.ComputeDiff(fAlse);
		const splices: NotebookCellOutputsSplice[] = diffResult.chAnges.mAp(chAnge => [chAnge.originAlStArt, chAnge.originAlLength, outputs.slice(chAnge.modifiedStArt, chAnge.modifiedStArt + chAnge.modifiedLength)]);
		this._spliceNotebookCellOutputs(cellHAndle, splices, computeUndoRedo);
	}

	privAte _spliceNotebookCellOutputs(cellHAndle: number, splices: NotebookCellOutputsSplice[], computeUndoRedo: booleAn): void {
		const cell = this._mApping.get(cellHAndle);
		if (cell) {
			cell.spliceNotebookCellOutputs(splices);

			this._eventEmitter.emit({
				kind: NotebookCellsChAngeType.Output,
				index: this._cells.indexOf(cell),
				outputs: cell.outputs ?? [],
				trAnsient: this.trAnsientOptions.trAnsientOutputs,
			}, true);
		}
	}

	privAte _moveCellToIdx(index: number, length: number, newIdx: number, synchronous: booleAn, pushedToUndoStAck: booleAn, beforeSelections: number[] | undefined, endSelections: number[] | undefined): booleAn {
		if (pushedToUndoStAck) {
			this._operAtionMAnAger.pushEditOperAtion(new MoveCellEdit(this.uri, index, length, newIdx, {
				moveCell: (fromIndex: number, length: number, toIndex: number, beforeSelections: number[] | undefined, endSelections: number[] | undefined) => {
					this._moveCellToIdx(fromIndex, length, toIndex, true, fAlse, beforeSelections, endSelections);
				},
			}, beforeSelections, endSelections), beforeSelections, endSelections);
		}

		this._AssertIndex(index);
		this._AssertIndex(newIdx);

		const cells = this._cells.splice(index, length);
		this._cells.splice(newIdx, 0, ...cells);
		this._eventEmitter.emit({ kind: NotebookCellsChAngeType.Move, index, length, newIdx, cells, trAnsient: fAlse }, synchronous, endSelections);

		return true;
	}

	privAte _AssertIndex(index: number) {
		if (index < 0 || index >= this._cells.length) {
			throw new Error(`model index out of rAnge ${index}`);
		}
	}
}

clAss OutputSequence implements ISequence {
	constructor(reAdonly outputs: IProcessedOutput[]) {
	}

	getElements(): Int32ArrAy | number[] | string[] {
		return this.outputs.mAp(output => {
			switch (output.outputKind) {
				cAse CellOutputKind.Rich:
					return hAsh([output.outputKind, output.metAdAtA, output.dAtA]);
				cAse CellOutputKind.Error:
					return hAsh([output.outputKind, output.enAme, output.evAlue, output.trAcebAck]);
				cAse CellOutputKind.Text:
					return hAsh([output.outputKind, output.text]);
			}
		});
	}

}
