/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { hAsh } from 'vs/bAse/common/hAsh';
import { DisposAble, DisposAbleStore, dispose, IDisposAble } from 'vs/bAse/common/lifecycle';
import { SchemAs } from 'vs/bAse/common/network';
import { joinPAth } from 'vs/bAse/common/resources';
import { ISplice } from 'vs/bAse/common/sequence';
import { URI } from 'vs/bAse/common/uri';
import * As UUID from 'vs/bAse/common/uuid';
import { CellKind, INotebookDocumentPropertiesChAngeDAtA, IWorkspAceCellEditDto, MAinThreAdBulkEditsShApe, MAinThreAdNotebookShApe, NotebookCellOutputsSplice, WorkspAceEditType } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostDocumentsAndEditors, IExtHostModelAddedDAtA } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { CellEditType, CellOutputKind, diff, IMAinCellDto, IProcessedOutput, NotebookCellMetAdAtA, NotebookCellsChAngedEventDto, NotebookCellsChAngeType, NotebookCellsSplice2, notebookDocumentMetAdAtADefAults } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import * As vscode from 'vscode';
import { CAche } from './cAche';


interfAce IObservAble<T> {
	proxy: T;
	onDidChAnge: Event<void>;
}

function getObservAble<T extends Object>(obj: T): IObservAble<T> {
	const onDidChAnge = new Emitter<void>();
	const proxy = new Proxy(obj, {
		set(tArget: T, p: PropertyKey, vAlue: Any, _receiver: Any): booleAn {
			tArget[p As keyof T] = vAlue;
			onDidChAnge.fire();
			return true;
		}
	});

	return {
		proxy,
		onDidChAnge: onDidChAnge.event
	};
}

clAss RAwContentChAngeEvent {

	constructor(reAdonly stArt: number, reAdonly deletedCount: number, reAdonly deletedItems: ExtHostCell[], reAdonly items: ExtHostCell[]) { }

	stAtic AsApiEvent(event: RAwContentChAngeEvent): vscode.NotebookCellsChAngeDAtA {
		return Object.freeze({
			stArt: event.stArt,
			deletedCount: event.deletedCount,
			deletedItems: event.deletedItems.mAp(dAtA => dAtA.cell),
			items: event.items.mAp(dAtA => dAtA.cell)
		});
	}
}

export clAss ExtHostCell extends DisposAble {

	stAtic AsModelAddDAtA(notebook: vscode.NotebookDocument, cell: IMAinCellDto): IExtHostModelAddedDAtA {
		return {
			EOL: cell.eol,
			lines: cell.source,
			modeId: cell.lAnguAge,
			uri: cell.uri,
			isDirty: fAlse,
			versionId: 1,
			notebook
		};
	}

	privAte _onDidDispose = new Emitter<void>();
	reAdonly onDidDispose: Event<void> = this._onDidDispose.event;

	privAte _onDidChAngeOutputs = new Emitter<ISplice<IProcessedOutput>[]>();
	reAdonly onDidChAngeOutputs: Event<ISplice<IProcessedOutput>[]> = this._onDidChAngeOutputs.event;

	privAte _outputs: Any[];
	privAte _outputMApping = new WeAkMAp<vscode.CellOutput, string | undefined /* output ID */>();

	privAte _metAdAtA: vscode.NotebookCellMetAdAtA;
	privAte _metAdAtAChAngeListener: IDisposAble;

	reAdonly hAndle: number;
	reAdonly uri: URI;
	reAdonly cellKind: CellKind;

	privAte _cell: vscode.NotebookCell | undefined;

	constructor(
		privAte reAdonly _mAinThreAdBulkEdits: MAinThreAdBulkEditsShApe,
		privAte reAdonly _notebook: ExtHostNotebookDocument,
		privAte reAdonly _extHostDocument: ExtHostDocumentsAndEditors,
		privAte reAdonly _cellDAtA: IMAinCellDto,
	) {
		super();

		this.hAndle = _cellDAtA.hAndle;
		this.uri = URI.revive(_cellDAtA.uri);
		this.cellKind = _cellDAtA.cellKind;

		this._outputs = _cellDAtA.outputs;
		for (const output of this._outputs) {
			this._outputMApping.set(output, output.outputId);
			delete output.outputId;
		}

		const observAbleMetAdAtA = getObservAble(_cellDAtA.metAdAtA ?? {});
		this._metAdAtA = observAbleMetAdAtA.proxy;
		this._metAdAtAChAngeListener = this._register(observAbleMetAdAtA.onDidChAnge(() => {
			this._updAteMetAdAtA();
		}));
	}

	get cell(): vscode.NotebookCell {
		if (!this._cell) {
			const thAt = this;
			const document = this._extHostDocument.getDocument(this.uri)!.document;
			this._cell = Object.freeze({
				get index() { return thAt._notebook.getCellIndex(thAt); },
				notebook: thAt._notebook.notebookDocument,
				uri: thAt.uri,
				cellKind: this._cellDAtA.cellKind,
				document,
				get lAnguAge() { return document.lAnguAgeId; },
				get outputs() { return thAt._outputs; },
				set outputs(vAlue) { thAt._updAteOutputs(vAlue); },
				get metAdAtA() { return thAt._metAdAtA; },
				set metAdAtA(vAlue) {
					thAt.setMetAdAtA(vAlue);
					thAt._updAteMetAdAtA();
				},
			});
		}
		return this._cell;
	}

	dispose() {
		super.dispose();
		this._onDidDispose.fire();
	}

	setOutputs(newOutputs: vscode.CellOutput[]): void {
		this._outputs = newOutputs;
	}

	privAte _updAteOutputs(newOutputs: vscode.CellOutput[]) {
		const rAwDiffs = diff<vscode.CellOutput>(this._outputs || [], newOutputs || [], (A) => {
			return this._outputMApping.hAs(A);
		});

		const trAnsformedDiffs: ISplice<IProcessedOutput>[] = rAwDiffs.mAp(diff => {
			for (let i = diff.stArt; i < diff.stArt + diff.deleteCount; i++) {
				this._outputMApping.delete(this._outputs[i]);
			}

			return {
				deleteCount: diff.deleteCount,
				stArt: diff.stArt,
				toInsert: diff.toInsert.mAp((output): IProcessedOutput => {
					if (output.outputKind === CellOutputKind.Rich) {
						const uuid = UUID.generAteUuid();
						this._outputMApping.set(output, uuid);
						return { ...output, outputId: uuid };
					}

					this._outputMApping.set(output, undefined);
					return output;
				})
			};
		});

		this._outputs = newOutputs;
		this._onDidChAngeOutputs.fire(trAnsformedDiffs);
	}

	setMetAdAtA(newMetAdAtA: vscode.NotebookCellMetAdAtA): void {
		// Don't Apply metAdAtA defAults here, 'undefined' meAns 'inherit from document metAdAtA'
		this._metAdAtAChAngeListener.dispose();
		const observAbleMetAdAtA = getObservAble(newMetAdAtA);
		this._metAdAtA = observAbleMetAdAtA.proxy;
		this._metAdAtAChAngeListener = this._register(observAbleMetAdAtA.onDidChAnge(() => {
			this._updAteMetAdAtA();
		}));
	}

	privAte _updAteMetAdAtA(): Promise<booleAn> {
		const index = this._notebook.notebookDocument.cells.indexOf(this.cell);
		const edit: IWorkspAceCellEditDto = {
			_type: WorkspAceEditType.Cell,
			metAdAtA: undefined,
			resource: this._notebook.uri,
			notebookVersionId: this._notebook.notebookDocument.version,
			edit: { editType: CellEditType.MetAdAtA, index, metAdAtA: this._metAdAtA }
		};

		return this._mAinThreAdBulkEdits.$tryApplyWorkspAceEdit({ edits: [edit] });
	}
}

export interfAce INotebookEventEmitter {
	emitModelChAnge(events: vscode.NotebookCellsChAngeEvent): void;
	emitDocumentMetAdAtAChAnge(event: vscode.NotebookDocumentMetAdAtAChAngeEvent): void;
	emitCellOutputsChAnge(event: vscode.NotebookCellOutputsChAngeEvent): void;
	emitCellLAnguAgeChAnge(event: vscode.NotebookCellLAnguAgeChAngeEvent): void;
	emitCellMetAdAtAChAnge(event: vscode.NotebookCellMetAdAtAChAngeEvent): void;
}

function hAshPAth(resource: URI): string {
	const str = resource.scheme === SchemAs.file || resource.scheme === SchemAs.untitled ? resource.fsPAth : resource.toString();
	return hAsh(str) + '';
}

export clAss ExtHostNotebookDocument extends DisposAble {

	privAte stAtic _hAndlePool: number = 0;
	reAdonly hAndle = ExtHostNotebookDocument._hAndlePool++;

	privAte _cells: ExtHostCell[] = [];

	privAte _cellDisposAbleMApping = new MAp<number, DisposAbleStore>();

	privAte _notebook: vscode.NotebookDocument | undefined;
	privAte _metAdAtA: Required<vscode.NotebookDocumentMetAdAtA>;
	privAte _metAdAtAChAngeListener: IDisposAble;
	privAte _versionId = 0;
	privAte _isDirty: booleAn = fAlse;
	privAte _bAckupCounter = 1;
	privAte _bAckup?: vscode.NotebookDocumentBAckup;
	privAte _disposed = fAlse;
	privAte _lAnguAges: string[] = [];

	privAte reAdonly _edits = new CAche<vscode.NotebookDocumentEditEvent>('notebook documents');

	constructor(
		privAte reAdonly _proxy: MAinThreAdNotebookShApe,
		privAte reAdonly _documentsAndEditors: ExtHostDocumentsAndEditors,
		privAte reAdonly _mAinThreAdBulkEdits: MAinThreAdBulkEditsShApe,
		privAte reAdonly _emitter: INotebookEventEmitter,
		privAte reAdonly _viewType: string,
		privAte reAdonly _contentOptions: vscode.NotebookDocumentContentOptions,
		metAdAtA: Required<vscode.NotebookDocumentMetAdAtA>,
		public reAdonly uri: URI,
		privAte reAdonly _storAgePAth: URI | undefined
	) {
		super();

		const observAbleMetAdAtA = getObservAble(metAdAtA);
		this._metAdAtA = observAbleMetAdAtA.proxy;
		this._metAdAtAChAngeListener = this._register(observAbleMetAdAtA.onDidChAnge(() => {
			this._tryUpdAteMetAdAtA();
		}));
	}

	dispose() {
		this._disposed = true;
		super.dispose();
		dispose(this._cellDisposAbleMApping.vAlues());
	}

	privAte _updAteMetAdAtA(newMetAdAtA: Required<vscode.NotebookDocumentMetAdAtA>) {
		this._metAdAtAChAngeListener.dispose();
		newMetAdAtA = {
			...notebookDocumentMetAdAtADefAults,
			...newMetAdAtA
		};
		if (this._metAdAtAChAngeListener) {
			this._metAdAtAChAngeListener.dispose();
		}

		const observAbleMetAdAtA = getObservAble(newMetAdAtA);
		this._metAdAtA = observAbleMetAdAtA.proxy;
		this._metAdAtAChAngeListener = this._register(observAbleMetAdAtA.onDidChAnge(() => {
			this._tryUpdAteMetAdAtA();
		}));

		this._tryUpdAteMetAdAtA();
	}

	privAte _tryUpdAteMetAdAtA() {
		const edit: IWorkspAceCellEditDto = {
			_type: WorkspAceEditType.Cell,
			metAdAtA: undefined,
			edit: { editType: CellEditType.DocumentMetAdAtA, metAdAtA: this._metAdAtA },
			resource: this.uri,
			notebookVersionId: this.notebookDocument.version,
		};

		return this._mAinThreAdBulkEdits.$tryApplyWorkspAceEdit({ edits: [edit] });
	}

	get notebookDocument(): vscode.NotebookDocument {
		if (!this._notebook) {
			const thAt = this;
			this._notebook = Object.freeze({
				get uri() { return thAt.uri; },
				get version() { return thAt._versionId; },
				get fileNAme() { return thAt.uri.fsPAth; },
				get viewType() { return thAt._viewType; },
				get isDirty() { return thAt._isDirty; },
				get isUntitled() { return thAt.uri.scheme === SchemAs.untitled; },
				get cells(): ReAdonlyArrAy<vscode.NotebookCell> { return thAt._cells.mAp(cell => cell.cell); },
				get lAnguAges() { return thAt._lAnguAges; },
				set lAnguAges(vAlue: string[]) { thAt._trySetLAnguAges(vAlue); },
				get metAdAtA() { return thAt._metAdAtA; },
				set metAdAtA(vAlue: Required<vscode.NotebookDocumentMetAdAtA>) { thAt._updAteMetAdAtA(vAlue); },
				get contentOptions() { return thAt._contentOptions; }
			});
		}
		return this._notebook;
	}

	privAte _trySetLAnguAges(newLAnguAges: string[]) {
		this._lAnguAges = newLAnguAges;
		this._proxy.$updAteNotebookLAnguAges(this._viewType, this.uri, this._lAnguAges);
	}

	getNewBAckupUri(): URI {
		if (!this._storAgePAth) {
			throw new Error('BAckup requires A vAlid storAge pAth');
		}
		const fileNAme = hAshPAth(this.uri) + (this._bAckupCounter++);
		return joinPAth(this._storAgePAth, fileNAme);
	}

	updAteBAckup(bAckup: vscode.NotebookDocumentBAckup): void {
		this._bAckup?.delete();
		this._bAckup = bAckup;
	}

	disposeBAckup(): void {
		this._bAckup?.delete();
		this._bAckup = undefined;
	}

	AcceptDocumentPropertiesChAnged(dAtA: INotebookDocumentPropertiesChAngeDAtA) {
		const newMetAdAtA = {
			...notebookDocumentMetAdAtADefAults,
			...dAtA.metAdAtA
		};

		if (this._metAdAtAChAngeListener) {
			this._metAdAtAChAngeListener.dispose();
		}

		const observAbleMetAdAtA = getObservAble(newMetAdAtA);
		this._metAdAtA = observAbleMetAdAtA.proxy;
		this._metAdAtAChAngeListener = this._register(observAbleMetAdAtA.onDidChAnge(() => {
			this._tryUpdAteMetAdAtA();
		}));

		this._emitter.emitDocumentMetAdAtAChAnge({ document: this.notebookDocument });
	}

	AcceptModelChAnged(event: NotebookCellsChAngedEventDto, isDirty: booleAn): void {
		this._versionId = event.versionId;
		this._isDirty = isDirty;
		event.rAwEvents.forEAch(e => {
			if (e.kind === NotebookCellsChAngeType.InitiAlize) {
				this._spliceNotebookCells(e.chAnges, true);
			} if (e.kind === NotebookCellsChAngeType.ModelChAnge) {
				this._spliceNotebookCells(e.chAnges, fAlse);
			} else if (e.kind === NotebookCellsChAngeType.Move) {
				this._moveCell(e.index, e.newIdx);
			} else if (e.kind === NotebookCellsChAngeType.Output) {
				this._setCellOutputs(e.index, e.outputs);
			} else if (e.kind === NotebookCellsChAngeType.ChAngeLAnguAge) {
				this._chAngeCellLAnguAge(e.index, e.lAnguAge);
			} else if (e.kind === NotebookCellsChAngeType.ChAngeCellMetAdAtA) {
				this._chAngeCellMetAdAtA(e.index, e.metAdAtA);
			}
		});
	}

	privAte _spliceNotebookCells(splices: NotebookCellsSplice2[], initiAlizAtion: booleAn): void {
		if (this._disposed) {
			return;
		}

		const contentChAngeEvents: RAwContentChAngeEvent[] = [];
		const AddedCellDocuments: IExtHostModelAddedDAtA[] = [];
		const removedCellDocuments: URI[] = [];

		splices.reverse().forEAch(splice => {
			const cellDtos = splice[2];
			const newCells = cellDtos.mAp(cell => {

				const extCell = new ExtHostCell(this._mAinThreAdBulkEdits, this, this._documentsAndEditors, cell);

				if (!initiAlizAtion) {
					AddedCellDocuments.push(ExtHostCell.AsModelAddDAtA(this.notebookDocument, cell));
				}

				if (!this._cellDisposAbleMApping.hAs(extCell.hAndle)) {
					const store = new DisposAbleStore();
					store.Add(extCell);
					this._cellDisposAbleMApping.set(extCell.hAndle, store);
				}

				const store = this._cellDisposAbleMApping.get(extCell.hAndle)!;

				store.Add(extCell.onDidChAngeOutputs((diffs) => {
					this.eventuAllyUpdAteCellOutputs(extCell, diffs);
				}));

				return extCell;
			});

			for (let j = splice[0]; j < splice[0] + splice[1]; j++) {
				this._cellDisposAbleMApping.get(this._cells[j].hAndle)?.dispose();
				this._cellDisposAbleMApping.delete(this._cells[j].hAndle);
			}

			const deletedItems = this._cells.splice(splice[0], splice[1], ...newCells);
			for (let cell of deletedItems) {
				removedCellDocuments.push(cell.uri);
			}

			contentChAngeEvents.push(new RAwContentChAngeEvent(splice[0], splice[1], deletedItems, newCells));
		});

		this._documentsAndEditors.AcceptDocumentsAndEditorsDeltA({
			AddedDocuments: AddedCellDocuments,
			removedDocuments: removedCellDocuments
		});

		if (!initiAlizAtion) {
			this._emitter.emitModelChAnge({
				document: this.notebookDocument,
				chAnges: contentChAngeEvents.mAp(RAwContentChAngeEvent.AsApiEvent)
			});
		}
	}

	privAte _moveCell(index: number, newIdx: number): void {
		const cells = this._cells.splice(index, 1);
		this._cells.splice(newIdx, 0, ...cells);
		const chAnges: vscode.NotebookCellsChAngeDAtA[] = [{
			stArt: index,
			deletedCount: 1,
			deletedItems: cells.mAp(dAtA => dAtA.cell),
			items: []
		}, {
			stArt: newIdx,
			deletedCount: 0,
			deletedItems: [],
			items: cells.mAp(dAtA => dAtA.cell)
		}];
		this._emitter.emitModelChAnge({
			document: this.notebookDocument,
			chAnges
		});
	}

	privAte _setCellOutputs(index: number, outputs: IProcessedOutput[]): void {
		const cell = this._cells[index];
		cell.setOutputs(outputs);
		this._emitter.emitCellOutputsChAnge({ document: this.notebookDocument, cells: [cell.cell] });
	}

	privAte _chAngeCellLAnguAge(index: number, lAnguAge: string): void {
		const cell = this._cells[index];
		const event: vscode.NotebookCellLAnguAgeChAngeEvent = { document: this.notebookDocument, cell: cell.cell, lAnguAge };
		this._emitter.emitCellLAnguAgeChAnge(event);
	}

	privAte _chAngeCellMetAdAtA(index: number, newMetAdAtA: NotebookCellMetAdAtA | undefined): void {
		const cell = this._cells[index];
		cell.setMetAdAtA(newMetAdAtA || {});
		const event: vscode.NotebookCellMetAdAtAChAngeEvent = { document: this.notebookDocument, cell: cell.cell };
		this._emitter.emitCellMetAdAtAChAnge(event);
	}

	Async eventuAllyUpdAteCellOutputs(cell: ExtHostCell, diffs: ISplice<IProcessedOutput>[]) {
		const outputDtos: NotebookCellOutputsSplice[] = diffs.mAp(diff => {
			const outputs = diff.toInsert;
			return [diff.stArt, diff.deleteCount, outputs];
		});

		if (!outputDtos.length) {
			return;
		}

		AwAit this._proxy.$spliceNotebookCellOutputs(this._viewType, this.uri, cell.hAndle, outputDtos);
		this._emitter.emitCellOutputsChAnge({
			document: this.notebookDocument,
			cells: [cell.cell]
		});
	}

	getCell(cellHAndle: number): ExtHostCell | undefined {
		return this._cells.find(cell => cell.hAndle === cellHAndle);
	}

	getCellIndex(cell: ExtHostCell): number {
		return this._cells.indexOf(cell);
	}

	AddEdit(item: vscode.NotebookDocumentEditEvent): number {
		return this._edits.Add([item]);
	}

	Async undo(editId: number, isDirty: booleAn): Promise<void> {
		AwAit this.getEdit(editId).undo();
		// if (!isDirty) {
		// 	this.disposeBAckup();
		// }
	}

	Async redo(editId: number, isDirty: booleAn): Promise<void> {
		AwAit this.getEdit(editId).redo();
		// if (!isDirty) {
		// 	this.disposeBAckup();
		// }
	}

	privAte getEdit(editId: number): vscode.NotebookDocumentEditEvent {
		const edit = this._edits.get(editId, 0);
		if (!edit) {
			throw new Error('No edit found');
		}

		return edit;
	}

	disposeEdits(editIds: number[]): void {
		for (const id of editIds) {
			this._edits.delete(id);
		}
	}
}
