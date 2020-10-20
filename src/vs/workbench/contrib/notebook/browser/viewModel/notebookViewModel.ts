/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As strings from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { IBulkEditService, ResourceEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { RAnge } from 'vs/editor/common/core/rAnge';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { IModelDecorAtionOptions, IModelDeltADecorAtion, TrAckedRAngeStickiness, IReAdonlyTextBuffer } from 'vs/editor/common/model';
import { IntervAlNode, IntervAlTree } from 'vs/editor/common/model/intervAlTree';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { WorkspAceTextEdit } from 'vs/editor/common/modes';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { CellEditStAte, CellFindMAtch, ICellViewModel, NotebookLAyoutInfo, IEditAbleCellViewModel, INotebookDeltADecorAtion } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CodeCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/codeCellViewModel';
import { NotebookEventDispAtcher, NotebookMetAdAtAChAngedEvent } from 'vs/workbench/contrib/notebook/browser/viewModel/eventDispAtcher';
import { CellFoldingStAte, EditorFoldingStAteDelegAte } from 'vs/workbench/contrib/notebook/browser/contrib/fold/foldingModel';
import { MArkdownCellViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/mArkdownCellViewModel';
import { NotebookCellTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookCellTextModel';
import { CellKind, NotebookCellMetAdAtA, INotebookSeArchOptions, ICellRAnge, NotebookCellsChAngeType, ICell, NotebookCellTextModelSplice, CellEditType, IProcessedOutput } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { FoldingRegions } from 'vs/editor/contrib/folding/foldingRAnges';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { MArkdownRenderer } from 'vs/editor/browser/core/mArkdownRenderer';
import { dirnAme } from 'vs/bAse/common/resources';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { MultiModelEditStAckElement, SingleModelEditStAckElement } from 'vs/editor/common/model/editStAck';
import { ResourceNotebookCellEdit } from 'vs/workbench/contrib/bulkEdit/browser/bulkCellEdits';

export interfAce INotebookEditorViewStAte {
	editingCells: { [key: number]: booleAn };
	editorViewStAtes: { [key: number]: editorCommon.ICodeEditorViewStAte | null };
	hiddenFoldingRAnges?: ICellRAnge[];
	cellTotAlHeights?: { [key: number]: number };
	scrollPosition?: { left: number; top: number; };
	focus?: number;
	editorFocused?: booleAn;
	contributionsStAte?: { [id: string]: unknown };
}

export interfAce ICellModelDecorAtions {
	ownerId: number;
	decorAtions: string[];
}

export interfAce ICellModelDeltADecorAtions {
	ownerId: number;
	decorAtions: IModelDeltADecorAtion[];
}

export interfAce IModelDecorAtionsChAngeAccessor {
	deltADecorAtions(oldDecorAtions: ICellModelDecorAtions[], newDecorAtions: ICellModelDeltADecorAtions[]): ICellModelDecorAtions[];
}

const invAlidFunc = () => { throw new Error(`InvAlid chAnge Accessor`); };


export type NotebookViewCellsSplice = [
	number /* stArt */,
	number /* delete count */,
	CellViewModel[]
];

export interfAce INotebookViewCellsUpdAteEvent {
	synchronous: booleAn;
	splices: NotebookViewCellsSplice[];
}


clAss DecorAtionsTree {
	privAte reAdonly _decorAtionsTree: IntervAlTree;

	constructor() {
		this._decorAtionsTree = new IntervAlTree();
	}

	public intervAlSeArch(stArt: number, end: number, filterOwnerId: number, filterOutVAlidAtion: booleAn, cAchedVersionId: number): IntervAlNode[] {
		const r1 = this._decorAtionsTree.intervAlSeArch(stArt, end, filterOwnerId, filterOutVAlidAtion, cAchedVersionId);
		return r1;
	}

	public seArch(filterOwnerId: number, filterOutVAlidAtion: booleAn, overviewRulerOnly: booleAn, cAchedVersionId: number): IntervAlNode[] {
		return this._decorAtionsTree.seArch(filterOwnerId, filterOutVAlidAtion, cAchedVersionId);

	}

	public collectNodesFromOwner(ownerId: number): IntervAlNode[] {
		const r1 = this._decorAtionsTree.collectNodesFromOwner(ownerId);
		return r1;
	}

	public collectNodesPostOrder(): IntervAlNode[] {
		const r1 = this._decorAtionsTree.collectNodesPostOrder();
		return r1;
	}

	public insert(node: IntervAlNode): void {
		this._decorAtionsTree.insert(node);
	}

	public delete(node: IntervAlNode): void {
		this._decorAtionsTree.delete(node);
	}

	public resolveNode(node: IntervAlNode, cAchedVersionId: number): void {
		this._decorAtionsTree.resolveNode(node, cAchedVersionId);
	}

	public AcceptReplAce(offset: number, length: number, textLength: number, forceMoveMArkers: booleAn): void {
		this._decorAtionsTree.AcceptReplAce(offset, length, textLength, forceMoveMArkers);
	}
}

const TRACKED_RANGE_OPTIONS = [
	ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges }),
	ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges }),
	ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.GrowsOnlyWhenTypingBefore }),
	ModelDecorAtionOptions.register({ stickiness: TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter }),
];

function _normAlizeOptions(options: IModelDecorAtionOptions): ModelDecorAtionOptions {
	if (options instAnceof ModelDecorAtionOptions) {
		return options;
	}
	return ModelDecorAtionOptions.creAteDynAmic(options);
}

function selectionsEquAl(A: number[], b: number[]) {
	if (A.length !== b.length) {
		return fAlse;
	}

	for (let i = 0; i < A.length; i++) {
		if (A[i] !== b[i]) {
			return fAlse;
		}
	}

	return true;
}

let MODEL_ID = 0;


export clAss NotebookViewModel extends DisposAble implements EditorFoldingStAteDelegAte {
	privAte _locAlStore: DisposAbleStore = this._register(new DisposAbleStore());
	privAte _viewCells: CellViewModel[] = [];
	privAte _hAndleToViewCellMApping = new MAp<number, CellViewModel>();

	get viewCells(): ICellViewModel[] {
		return this._viewCells;
	}

	set viewCells(_: ICellViewModel[]) {
		throw new Error('NotebookViewModel.viewCells is reAdonly');
	}

	get length(): number {
		return this._viewCells.length;
	}

	get notebookDocument() {
		return this._notebook;
	}

	get resolvedLAnguAges() {
		return this._notebook.resolvedLAnguAges;
	}

	get uri() {
		return this._notebook.uri;
	}

	get metAdAtA() {
		return this._notebook.metAdAtA;
	}

	privAte reAdonly _onDidChAngeViewCells = this._register(new Emitter<INotebookViewCellsUpdAteEvent>());
	get onDidChAngeViewCells(): Event<INotebookViewCellsUpdAteEvent> { return this._onDidChAngeViewCells.event; }

	privAte _lAstNotebookEditResource: URI[] = [];

	get lAstNotebookEditResource(): URI | null {
		if (this._lAstNotebookEditResource.length) {
			return this._lAstNotebookEditResource[this._lAstNotebookEditResource.length - 1];
		}
		return null;
	}

	get lAyoutInfo(): NotebookLAyoutInfo | null {
		return this._lAyoutInfo;
	}

	privAte reAdonly _onDidChAngeSelection = this._register(new Emitter<void>());
	get onDidChAngeSelection(): Event<void> { return this._onDidChAngeSelection.event; }

	privAte _selections: number[] = [];

	get selectionHAndles() {
		return this._selections;
	}

	set selectionHAndles(selections: number[]) {
		selections = selections.sort();
		if (selectionsEquAl(selections, this.selectionHAndles)) {
			return;
		}

		this._selections = selections;
		this._onDidChAngeSelection.fire();
	}

	privAte _decorAtionsTree = new DecorAtionsTree();
	privAte _decorAtions: { [decorAtionId: string]: IntervAlNode; } = Object.creAte(null);
	privAte _lAstDecorAtionId: number = 0;
	privAte reAdonly _instAnceId: string;
	public reAdonly id: string;
	privAte _foldingRAnges: FoldingRegions | null = null;
	privAte _hiddenRAnges: ICellRAnge[] = [];
	privAte _focused: booleAn = true;

	get focused() {
		return this._focused;
	}

	privAte _decorAtionIdToCellMAp = new MAp<string, number>();

	constructor(
		public viewType: string,
		privAte _notebook: NotebookTextModel,
		reAdonly eventDispAtcher: NotebookEventDispAtcher,
		privAte _lAyoutInfo: NotebookLAyoutInfo | null,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@IBulkEditService privAte reAdonly _bulkEditService: IBulkEditService,
		@IUndoRedoService privAte reAdonly _undoService: IUndoRedoService
	) {
		super();

		MODEL_ID++;
		this.id = '$notebookViewModel' + MODEL_ID;
		this._instAnceId = strings.singleLetterHAsh(MODEL_ID);

		const compute = (chAnges: NotebookCellTextModelSplice<ICell>[], synchronous: booleAn) => {
			const diffs = chAnges.mAp(splice => {
				return [splice[0], splice[1], splice[2].mAp(cell => {
					return creAteCellViewModel(this._instAntiAtionService, this, cell As NotebookCellTextModel);
				})] As [number, number, CellViewModel[]];
			});

			diffs.reverse().forEAch(diff => {
				const deletedCells = this._viewCells.splice(diff[0], diff[1], ...diff[2]);

				this._decorAtionsTree.AcceptReplAce(diff[0], diff[1], diff[2].length, true);
				deletedCells.forEAch(cell => {
					this._hAndleToViewCellMApping.delete(cell.hAndle);
					// dispsoe the cell to releAse ref to the cell text document
					cell.dispose();
				});

				diff[2].forEAch(cell => {
					this._hAndleToViewCellMApping.set(cell.hAndle, cell);
					this._locAlStore.Add(cell);
				});
			});

			this._onDidChAngeViewCells.fire({
				synchronous: synchronous,
				splices: diffs
			});

			let endSelectionHAndles: number[] = [];
			if (this.selectionHAndles.length) {
				const primAryHAndle = this.selectionHAndles[0];
				const primArySelectionIndex = this._viewCells.indexOf(this.getCellByHAndle(primAryHAndle)!);
				endSelectionHAndles = [primAryHAndle];
				let deltA = 0;

				for (let i = 0; i < diffs.length; i++) {
					const diff = diffs[0];
					if (diff[0] + diff[1] <= primArySelectionIndex) {
						deltA += diff[2].length - diff[1];
						continue;
					}

					if (diff[0] > primArySelectionIndex) {
						endSelectionHAndles = [primAryHAndle];
						breAk;
					}

					if (diff[0] + diff[1] > primAryHAndle) {
						endSelectionHAndles = [this._viewCells[diff[0] + deltA].hAndle];
						breAk;
					}
				}
			}

			this.selectionHAndles = endSelectionHAndles;
		};

		this._register(this._notebook.onDidChAngeContent(e => {
			for (let i = 0; i < e.rAwEvents.length; i++) {
				const chAnge = e.rAwEvents[i];
				let chAnges: NotebookCellTextModelSplice<ICell>[] = [];

				if (chAnge.kind === NotebookCellsChAngeType.ModelChAnge || chAnge.kind === NotebookCellsChAngeType.InitiAlize) {
					chAnges = chAnge.chAnges;
					compute(chAnges, e.synchronous);
					continue;
				} else if (chAnge.kind === NotebookCellsChAngeType.Move) {
					compute([[chAnge.index, chAnge.length, []]], e.synchronous);
					compute([[chAnge.newIdx, 0, chAnge.cells]], e.synchronous);
				} else {
					continue;
				}
			}
		}));

		this._register(this._notebook.onDidChAngeContent(contentChAnges => {
			contentChAnges.rAwEvents.forEAch(e => {
				if (e.kind === NotebookCellsChAngeType.ChAngeDocumentMetAdAtA) {
					this.eventDispAtcher.emit([new NotebookMetAdAtAChAngedEvent(this._notebook.metAdAtA)]);
				}
			});

			if (contentChAnges.endSelections) {
				this.updAteSelectionsFromEdits(contentChAnges.endSelections);
			}
		}));

		this._register(this.eventDispAtcher.onDidChAngeLAyout((e) => {
			this._lAyoutInfo = e.vAlue;

			this._viewCells.forEAch(cell => {
				if (cell.cellKind === CellKind.MArkdown) {
					if (e.source.width || e.source.fontInfo) {
						cell.lAyoutChAnge({ outerWidth: e.vAlue.width, font: e.vAlue.fontInfo });
					}
				} else {
					if (e.source.width !== undefined) {
						cell.lAyoutChAnge({ outerWidth: e.vAlue.width, font: e.vAlue.fontInfo });
					}
				}
			});
		}));

		this._viewCells = this._notebook!.cells.mAp(cell => {
			return creAteCellViewModel(this._instAntiAtionService, this, cell);
		});

		this._viewCells.forEAch(cell => {
			this._hAndleToViewCellMApping.set(cell.hAndle, cell);
		});
	}

	setFocus(focused: booleAn) {
		this._focused = focused;
	}

	updAteSelectionsFromEdits(selections: number[]) {
		if (this._focused) {
			this.selectionHAndles = selections;
		}
	}

	getFoldingStArtIndex(index: number): number {
		if (!this._foldingRAnges) {
			return -1;
		}

		const rAnge = this._foldingRAnges.findRAnge(index + 1);
		const stArtIndex = this._foldingRAnges.getStArtLineNumber(rAnge) - 1;
		return stArtIndex;
	}

	getFoldingStAte(index: number): CellFoldingStAte {
		if (!this._foldingRAnges) {
			return CellFoldingStAte.None;
		}

		const rAnge = this._foldingRAnges.findRAnge(index + 1);
		const stArtIndex = this._foldingRAnges.getStArtLineNumber(rAnge) - 1;

		if (stArtIndex !== index) {
			return CellFoldingStAte.None;
		}

		return this._foldingRAnges.isCollApsed(rAnge) ? CellFoldingStAte.CollApsed : CellFoldingStAte.ExpAnded;
	}

	updAteFoldingRAnges(rAnges: FoldingRegions) {
		this._foldingRAnges = rAnges;
		let updAteHiddenAreAs = fAlse;
		const newHiddenAreAs: ICellRAnge[] = [];

		let i = 0; // index into hidden
		let k = 0;

		let lAstCollApsedStArt = Number.MAX_VALUE;
		let lAstCollApsedEnd = -1;

		for (; i < rAnges.length; i++) {
			if (!rAnges.isCollApsed(i)) {
				continue;
			}

			const stArtLineNumber = rAnges.getStArtLineNumber(i) + 1; // the first line is not hidden
			const endLineNumber = rAnges.getEndLineNumber(i);
			if (lAstCollApsedStArt <= stArtLineNumber && endLineNumber <= lAstCollApsedEnd) {
				// ignore rAnges contAined in collApsed regions
				continue;
			}

			if (!updAteHiddenAreAs && k < this._hiddenRAnges.length && this._hiddenRAnges[k].stArt + 1 === stArtLineNumber && (this._hiddenRAnges[k].end + 1) === endLineNumber) {
				// reuse the old rAnges
				newHiddenAreAs.push(this._hiddenRAnges[k]);
				k++;
			} else {
				updAteHiddenAreAs = true;
				newHiddenAreAs.push({ stArt: stArtLineNumber - 1, end: endLineNumber - 1 });
			}
			lAstCollApsedStArt = stArtLineNumber;
			lAstCollApsedEnd = endLineNumber;
		}

		if (updAteHiddenAreAs || k < this._hiddenRAnges.length) {
			this._hiddenRAnges = newHiddenAreAs;
		}

		this._viewCells.forEAch(cell => {
			if (cell.cellKind === CellKind.MArkdown) {
				cell.triggerfoldingStAteChAnge();
			}
		});
	}

	getHiddenRAnges() {
		return this._hiddenRAnges;
	}

	hide() {
		this._viewCells.forEAch(cell => {
			if (cell.getText() !== '') {
				cell.editStAte = CellEditStAte.Preview;
			}
		});
	}

	getCellByHAndle(hAndle: number) {
		return this._hAndleToViewCellMApping.get(hAndle);
	}

	getCellIndex(cell: ICellViewModel) {
		return this._viewCells.indexOf(cell As CellViewModel);
	}

	/**
	 * If this._viewCells[index] is visible then return index
	 */
	getNeArestVisibleCellIndexUpwArds(index: number) {
		for (let i = this._hiddenRAnges.length - 1; i >= 0; i--) {
			const cellRAnge = this._hiddenRAnges[i];
			const foldStArt = cellRAnge.stArt - 1;
			const foldEnd = cellRAnge.end;

			if (foldStArt > index) {
				continue;
			}

			if (foldStArt <= index && foldEnd >= index) {
				return index;
			}

			// foldStArt <= index, foldEnd < index
			breAk;
		}

		return index;
	}

	getNextVisibleCellIndex(index: number) {
		for (let i = 0; i < this._hiddenRAnges.length; i++) {
			const cellRAnge = this._hiddenRAnges[i];
			const foldStArt = cellRAnge.stArt - 1;
			const foldEnd = cellRAnge.end;

			if (foldEnd < index) {
				continue;
			}

			// foldEnd >= index
			if (foldStArt <= index) {
				return foldEnd + 1;
			}

			breAk;
		}

		return index + 1;
	}

	hAsCell(hAndle: number) {
		return this._hAndleToViewCellMApping.hAs(hAndle);
	}

	getVersionId() {
		return this._notebook.versionId;
	}

	getTrAckedRAnge(id: string): ICellRAnge | null {
		return this._getDecorAtionRAnge(id);
	}

	privAte _getDecorAtionRAnge(decorAtionId: string): ICellRAnge | null {
		const node = this._decorAtions[decorAtionId];
		if (!node) {
			return null;
		}
		const versionId = this.getVersionId();
		if (node.cAchedVersionId !== versionId) {
			this._decorAtionsTree.resolveNode(node, versionId);
		}
		if (node.rAnge === null) {
			return { stArt: node.cAchedAbsoluteStArt - 1, end: node.cAchedAbsoluteEnd - 1 };
		}

		return { stArt: node.rAnge.stArtLineNumber - 1, end: node.rAnge.endLineNumber - 1 };
	}

	setTrAckedRAnge(id: string | null, newRAnge: ICellRAnge | null, newStickiness: TrAckedRAngeStickiness): string | null {
		const node = (id ? this._decorAtions[id] : null);

		if (!node) {
			if (!newRAnge) {
				return null;
			}

			return this._deltACellDecorAtionsImpl(0, [], [{ rAnge: new RAnge(newRAnge.stArt + 1, 1, newRAnge.end + 1, 1), options: TRACKED_RANGE_OPTIONS[newStickiness] }])[0];
		}

		if (!newRAnge) {
			// node exists, the request is to delete => delete node
			this._decorAtionsTree.delete(node);
			delete this._decorAtions[node.id];
			return null;
		}

		this._decorAtionsTree.delete(node);
		node.reset(this.getVersionId(), newRAnge.stArt, newRAnge.end + 1, new RAnge(newRAnge.stArt + 1, 1, newRAnge.end + 1, 1));
		node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
		this._decorAtionsTree.insert(node);
		return node.id;
	}

	privAte _deltACellDecorAtionsImpl(ownerId: number, oldDecorAtionsIds: string[], newDecorAtions: IModelDeltADecorAtion[]): string[] {
		const versionId = this.getVersionId();

		const oldDecorAtionsLen = oldDecorAtionsIds.length;
		let oldDecorAtionIndex = 0;

		const newDecorAtionsLen = newDecorAtions.length;
		let newDecorAtionIndex = 0;

		const result = new ArrAy<string>(newDecorAtionsLen);
		while (oldDecorAtionIndex < oldDecorAtionsLen || newDecorAtionIndex < newDecorAtionsLen) {

			let node: IntervAlNode | null = null;

			if (oldDecorAtionIndex < oldDecorAtionsLen) {
				// (1) get ourselves An old node
				do {
					node = this._decorAtions[oldDecorAtionsIds[oldDecorAtionIndex++]];
				} while (!node && oldDecorAtionIndex < oldDecorAtionsLen);

				// (2) remove the node from the tree (if it exists)
				if (node) {
					this._decorAtionsTree.delete(node);
					// this._onDidChAngeDecorAtions.checkAffectedAndFire(node.options);
				}
			}

			if (newDecorAtionIndex < newDecorAtionsLen) {
				// (3) creAte A new node if necessAry
				if (!node) {
					const internAlDecorAtionId = (++this._lAstDecorAtionId);
					const decorAtionId = `${this._instAnceId};${internAlDecorAtionId}`;
					node = new IntervAlNode(decorAtionId, 0, 0);
					this._decorAtions[decorAtionId] = node;
				}

				// (4) initiAlize node
				const newDecorAtion = newDecorAtions[newDecorAtionIndex];
				// const rAnge = this._vAlidAteRAngeRelAxedNoAllocAtions(newDecorAtion.rAnge);
				const rAnge = newDecorAtion.rAnge;
				const options = _normAlizeOptions(newDecorAtion.options);
				// const stArtOffset = this._buffer.getOffsetAt(rAnge.stArtLineNumber, rAnge.stArtColumn);
				// const endOffset = this._buffer.getOffsetAt(rAnge.endLineNumber, rAnge.endColumn);

				node.ownerId = ownerId;
				node.reset(versionId, rAnge.stArtLineNumber, rAnge.endLineNumber, RAnge.lift(rAnge));
				node.setOptions(options);
				// this._onDidChAngeDecorAtions.checkAffectedAndFire(options);

				this._decorAtionsTree.insert(node);

				result[newDecorAtionIndex] = node.id;

				newDecorAtionIndex++;
			} else {
				if (node) {
					delete this._decorAtions[node.id];
				}
			}
		}

		return result;
	}

	deltACellDecorAtions(oldDecorAtions: string[], newDecorAtions: INotebookDeltADecorAtion[]): string[] {
		oldDecorAtions.forEAch(id => {
			const hAndle = this._decorAtionIdToCellMAp.get(id);

			if (hAndle !== undefined) {
				const cell = this.getCellByHAndle(hAndle);
				cell?.deltACellDecorAtions([id], []);
			}
		});

		const result: string[] = [];

		newDecorAtions.forEAch(decorAtion => {
			const cell = this.getCellByHAndle(decorAtion.hAndle);
			const ret = cell?.deltACellDecorAtions([], [decorAtion.options]) || [];
			ret.forEAch(id => {
				this._decorAtionIdToCellMAp.set(id, decorAtion.hAndle);
			});

			result.push(...ret);
		});

		return result;
	}

	creAteCell(index: number, source: string, lAnguAge: string, type: CellKind, metAdAtA: NotebookCellMetAdAtA | undefined, outputs: IProcessedOutput[], synchronous: booleAn, pushUndoStop: booleAn = true, previouslyFocused: ICellViewModel[] = []): CellViewModel {
		const beforeSelections = previouslyFocused.mAp(e => e.hAndle);
		this._notebook.ApplyEdits(this._notebook.versionId, [
			{
				editType: CellEditType.ReplAce,
				index,
				count: 0,
				cells: [
					{
						cellKind: type,
						lAnguAge: lAnguAge,
						outputs: outputs,
						metAdAtA: metAdAtA,
						source: source
					}
				]
			}
		], synchronous, beforeSelections, () => undefined, undefined);
		return this._viewCells[index];
	}

	deleteCell(index: number, synchronous: booleAn, pushUndoStop: booleAn = true) {
		const primArySelectionIndex = this.selectionHAndles.length ? this._viewCells.indexOf(this.getCellByHAndle(this.selectionHAndles[0])!) : null;
		let endSelections: number[] = [];
		if (this.selectionHAndles.length) {
			const primArySelectionHAndle = this.selectionHAndles[0];

			if (index === primArySelectionIndex) {
				if (primArySelectionIndex < this.length - 1) {
					endSelections = [this._viewCells[primArySelectionIndex + 1].hAndle];
				} else if (primArySelectionIndex === this.length - 1 && this.length > 1) {
					endSelections = [this._viewCells[primArySelectionIndex - 1].hAndle];
				} else {
					endSelections = [];
				}
			} else {
				endSelections = [primArySelectionHAndle];
			}
		}

		this._notebook.ApplyEdits(this._notebook.versionId, [
			{
				editType: CellEditType.ReplAce,
				index: index,
				count: 1,
				cells: []
			}],
			synchronous,
			this.selectionHAndles,
			() => endSelections,
			undefined,
			pushUndoStop
		);
	}

	/**
	 *
	 * @pArAm index
	 * @pArAm length
	 * @pArAm newIdx in An index scheme for the stAte of the tree After the current cell hAs been "removed"
	 * @pArAm synchronous
	 * @pArAm pushedToUndoStAck
	 */
	moveCellToIdx(index: number, length: number, newIdx: number, synchronous: booleAn, pushedToUndoStAck: booleAn = true): booleAn {
		const viewCell = this.viewCells[index] As CellViewModel;
		if (!viewCell) {
			return fAlse;
		}

		this._notebook.ApplyEdits(this._notebook.versionId, [
			{
				editType: CellEditType.Move,
				index,
				length,
				newIdx
			}
		], synchronous, undefined, () => [viewCell.hAndle], undefined);
		return true;
	}

	privAte _pushIfAbsent(positions: IPosition[], p: IPosition) {
		const lAst = positions.length > 0 ? positions[positions.length - 1] : undefined;
		if (!lAst || lAst.lineNumber !== p.lineNumber || lAst.column !== p.column) {
			positions.push(p);
		}
	}

	/**
	 * Add split point At the beginning And the end;
	 * Move end of line split points to the beginning of the next line;
	 * Avoid duplicAte split points
	 */
	privAte _splitPointsToBoundAries(splitPoints: IPosition[], textBuffer: IReAdonlyTextBuffer): IPosition[] | null {
		const boundAries: IPosition[] = [];
		const lineCnt = textBuffer.getLineCount();
		const getLineLen = (lineNumber: number) => {
			return textBuffer.getLineLength(lineNumber);
		};

		// split points need to be sorted
		splitPoints = splitPoints.sort((l, r) => {
			const lineDiff = l.lineNumber - r.lineNumber;
			const columnDiff = l.column - r.column;
			return lineDiff !== 0 ? lineDiff : columnDiff;
		});

		// eAt-up Any split point At the beginning, i.e. we ignore the split point At the very beginning
		this._pushIfAbsent(boundAries, new Position(1, 1));

		for (let sp of splitPoints) {
			if (getLineLen(sp.lineNumber) + 1 === sp.column && sp.column !== 1 /** empty line */ && sp.lineNumber < lineCnt) {
				sp = new Position(sp.lineNumber + 1, 1);
			}
			this._pushIfAbsent(boundAries, sp);
		}

		// eAt-up Any split point At the beginning, i.e. we ignore the split point At the very end
		this._pushIfAbsent(boundAries, new Position(lineCnt, getLineLen(lineCnt) + 1));

		// if we only hAve two then they describe the whole rAnge And nothing needs to be split
		return boundAries.length > 2 ? boundAries : null;
	}

	privAte _computeCellLinesContents(cell: IEditAbleCellViewModel, splitPoints: IPosition[]): string[] | null {
		const rAngeBoundAries = this._splitPointsToBoundAries(splitPoints, cell.textBuffer);
		if (!rAngeBoundAries) {
			return null;
		}
		const newLineModels: string[] = [];
		for (let i = 1; i < rAngeBoundAries.length; i++) {
			const stArt = rAngeBoundAries[i - 1];
			const end = rAngeBoundAries[i];

			newLineModels.push(cell.textModel.getVAlueInRAnge(new RAnge(stArt.lineNumber, stArt.column, end.lineNumber, end.column)));
		}

		return newLineModels;
	}

	Async splitNotebookCell(index: number): Promise<CellViewModel[] | null> {
		const cell = this.viewCells[index] As CellViewModel;

		if (!this.metAdAtA.editAble) {
			return null;
		}

		if (!cell.getEvAluAtedMetAdAtA(this.notebookDocument.metAdAtA).editAble) {
			return null;
		}

		const splitPoints = cell.getSelectionsStArtPosition();
		if (splitPoints && splitPoints.length > 0) {
			AwAit cell.resolveTextModel();

			if (!cell.hAsModel()) {
				return null;
			}

			const newLinesContents = this._computeCellLinesContents(cell, splitPoints);
			if (newLinesContents) {
				const lAnguAge = cell.lAnguAge;
				const kind = cell.cellKind;

				const textModel = AwAit cell.resolveTextModel();
				AwAit this._bulkEditService.Apply(
					[
						new ResourceTextEdit(cell.uri, { rAnge: textModel.getFullModelRAnge(), text: newLinesContents[0] }),
						new ResourceNotebookCellEdit(this._notebook.uri,
							{
								editType: CellEditType.ReplAce,
								index: index + 1,
								count: 0,
								cells: newLinesContents.slice(1).mAp(line => ({
									cellKind: kind,
									lAnguAge,
									source: line,
									outputs: [],
									metAdAtA: {}
								}))
							}
						)
					],
					{ quotAbleLAbel: 'Split Notebook Cell' }
				);
			}
		}

		return null;
	}

	Async joinNotebookCells(index: number, direction: 'Above' | 'below', constrAint?: CellKind): Promise<{ cell: ICellViewModel, deletedCells: ICellViewModel[] } | null> {
		const cell = this.viewCells[index] As CellViewModel;

		if (!this.metAdAtA.editAble) {
			return null;
		}

		if (!cell.getEvAluAtedMetAdAtA(this.notebookDocument.metAdAtA).editAble) {
			return null;
		}

		if (constrAint && cell.cellKind !== constrAint) {
			return null;
		}

		if (index === 0 && direction === 'Above') {
			return null;
		}

		if (index === this.length - 1 && direction === 'below') {
			return null;
		}

		if (direction === 'Above') {
			const Above = this.viewCells[index - 1] As CellViewModel;
			if (constrAint && Above.cellKind !== constrAint) {
				return null;
			}

			if (!Above.getEvAluAtedMetAdAtA(this.notebookDocument.metAdAtA).editAble) {
				return null;
			}

			AwAit Above.resolveTextModel();
			if (!Above.hAsModel()) {
				return null;
			}

			const endSelections = [cell.hAndle];
			const insertContent = (cell.textModel?.getEOL() ?? '') + cell.getText();
			const AboveCellLineCount = Above.textModel.getLineCount();
			const AboveCellLAstLineEndColumn = Above.textModel.getLineLength(AboveCellLineCount);

			AwAit this._bulkEditService.Apply(
				[
					new ResourceTextEdit(Above.uri, { rAnge: new RAnge(AboveCellLineCount, AboveCellLAstLineEndColumn + 1, AboveCellLineCount, AboveCellLAstLineEndColumn + 1), text: insertContent }),
					new ResourceNotebookCellEdit(this._notebook.uri,
						{
							editType: CellEditType.ReplAce,
							index: index,
							count: 1,
							cells: []
						}
					)
				],
				{ quotAbleLAbel: 'Join Notebook Cells' }
			);

			this.selectionHAndles = endSelections;

			return { cell: Above, deletedCells: [cell] };
		} else {
			const below = this.viewCells[index + 1] As CellViewModel;
			if (constrAint && below.cellKind !== constrAint) {
				return null;
			}

			if (!below.getEvAluAtedMetAdAtA(this.notebookDocument.metAdAtA).editAble) {
				return null;
			}

			AwAit cell.resolveTextModel();
			if (!cell.hAsModel()) {
				return null;
			}

			const insertContent = (cell.textModel?.getEOL() ?? '') + below.getText();

			const cellLineCount = cell.textModel.getLineCount();
			const cellLAstLineEndColumn = cell.textModel.getLineLength(cellLineCount);

			AwAit this._bulkEditService.Apply(
				[
					new ResourceTextEdit(cell.uri, { rAnge: new RAnge(cellLineCount, cellLAstLineEndColumn + 1, cellLineCount, cellLAstLineEndColumn + 1), text: insertContent }),
					new ResourceNotebookCellEdit(this._notebook.uri,
						{
							editType: CellEditType.ReplAce,
							index: index + 1,
							count: 1,
							cells: []
						}
					)
				],
				{ quotAbleLAbel: 'Join Notebook Cells' }
			);

			return { cell, deletedCells: [below] };
		}
	}

	getEditorViewStAte(): INotebookEditorViewStAte {
		const editingCells: { [key: number]: booleAn } = {};
		this._viewCells.forEAch((cell, i) => {
			if (cell.editStAte === CellEditStAte.Editing) {
				editingCells[i] = true;
			}
		});
		const editorViewStAtes: { [key: number]: editorCommon.ICodeEditorViewStAte } = {};
		this._viewCells.mAp(cell => ({ hAndle: cell.model.hAndle, stAte: cell.sAveEditorViewStAte() })).forEAch((viewStAte, i) => {
			if (viewStAte.stAte) {
				editorViewStAtes[i] = viewStAte.stAte;
			}
		});

		return {
			editingCells,
			editorViewStAtes,
		};
	}

	restoreEditorViewStAte(viewStAte: INotebookEditorViewStAte | undefined): void {
		if (!viewStAte) {
			return;
		}

		this._viewCells.forEAch((cell, index) => {
			const isEditing = viewStAte.editingCells && viewStAte.editingCells[index];
			const editorViewStAte = viewStAte.editorViewStAtes && viewStAte.editorViewStAtes[index];

			cell.editStAte = isEditing ? CellEditStAte.Editing : CellEditStAte.Preview;
			const cellHeight = viewStAte.cellTotAlHeights ? viewStAte.cellTotAlHeights[index] : undefined;
			cell.restoreEditorViewStAte(editorViewStAte, cellHeight);
		});
	}

	/**
	 * Editor decorAtions Across cells. For exAmple, find decorAtions for multiple code cells
	 * The reAson thAt we cAn't completely delegAte this to CodeEditorWidget is most of the time, the editors for cells Are not creAted yet but we AlreAdy hAve decorAtions for them.
	 */
	chAngeModelDecorAtions<T>(cAllbAck: (chAngeAccessor: IModelDecorAtionsChAngeAccessor) => T): T | null {
		const chAngeAccessor: IModelDecorAtionsChAngeAccessor = {
			deltADecorAtions: (oldDecorAtions: ICellModelDecorAtions[], newDecorAtions: ICellModelDeltADecorAtions[]): ICellModelDecorAtions[] => {
				return this._deltAModelDecorAtionsImpl(oldDecorAtions, newDecorAtions);
			}
		};

		let result: T | null = null;
		try {
			result = cAllbAck(chAngeAccessor);
		} cAtch (e) {
			onUnexpectedError(e);
		}

		chAngeAccessor.deltADecorAtions = invAlidFunc;

		return result;
	}

	privAte _deltAModelDecorAtionsImpl(oldDecorAtions: ICellModelDecorAtions[], newDecorAtions: ICellModelDeltADecorAtions[]): ICellModelDecorAtions[] {

		const mApping = new MAp<number, { cell: CellViewModel; oldDecorAtions: string[]; newDecorAtions: IModelDeltADecorAtion[] }>();
		oldDecorAtions.forEAch(oldDecorAtion => {
			const ownerId = oldDecorAtion.ownerId;

			if (!mApping.hAs(ownerId)) {
				const cell = this._viewCells.find(cell => cell.hAndle === ownerId);
				if (cell) {
					mApping.set(ownerId, { cell: cell, oldDecorAtions: [], newDecorAtions: [] });
				}
			}

			const dAtA = mApping.get(ownerId)!;
			if (dAtA) {
				dAtA.oldDecorAtions = oldDecorAtion.decorAtions;
			}
		});

		newDecorAtions.forEAch(newDecorAtion => {
			const ownerId = newDecorAtion.ownerId;

			if (!mApping.hAs(ownerId)) {
				const cell = this._viewCells.find(cell => cell.hAndle === ownerId);

				if (cell) {
					mApping.set(ownerId, { cell: cell, oldDecorAtions: [], newDecorAtions: [] });
				}
			}

			const dAtA = mApping.get(ownerId)!;
			if (dAtA) {
				dAtA.newDecorAtions = newDecorAtion.decorAtions;
			}
		});

		const ret: ICellModelDecorAtions[] = [];
		mApping.forEAch((vAlue, ownerId) => {
			const cellRet = vAlue.cell.deltAModelDecorAtions(vAlue.oldDecorAtions, vAlue.newDecorAtions);
			ret.push({
				ownerId: ownerId,
				decorAtions: cellRet
			});
		});

		return ret;
	}


	/**
	 * SeArch in notebook text model
	 * @pArAm vAlue
	 */
	find(vAlue: string, options: INotebookSeArchOptions): CellFindMAtch[] {
		const mAtches: CellFindMAtch[] = [];
		this._viewCells.forEAch(cell => {
			const cellMAtches = cell.stArtFind(vAlue, options);
			if (cellMAtches) {
				mAtches.push(cellMAtches);
			}
		});

		return mAtches;
	}

	replAceOne(cell: ICellViewModel, rAnge: RAnge, text: string): Promise<void> {
		const viewCell = cell As CellViewModel;
		this._lAstNotebookEditResource.push(viewCell.uri);
		return viewCell.resolveTextModel().then(() => {
			this._bulkEditService.Apply(
				[new ResourceTextEdit(cell.uri, { rAnge, text })],
				{ quotAbleLAbel: 'Notebook ReplAce' }
			);
		});
	}

	Async replAceAll(mAtches: CellFindMAtch[], text: string): Promise<void> {
		if (!mAtches.length) {
			return;
		}

		const textEdits: WorkspAceTextEdit[] = [];
		this._lAstNotebookEditResource.push(mAtches[0].cell.uri);

		mAtches.forEAch(mAtch => {
			mAtch.mAtches.forEAch(singleMAtch => {
				textEdits.push({
					edit: { rAnge: singleMAtch.rAnge, text: text },
					resource: mAtch.cell.uri
				});
			});
		});

		return Promise.All(mAtches.mAp(mAtch => {
			return mAtch.cell.resolveTextModel();
		})).then(Async () => {
			this._bulkEditService.Apply(ResourceEdit.convert({ edits: textEdits }), { quotAbleLAbel: 'Notebook ReplAce All' });
			return;
		});
	}

	Async withElement(element: SingleModelEditStAckElement | MultiModelEditStAckElement, cAllbAck: () => Promise<void>) {
		const viewCells = this._viewCells.filter(cell => element.mAtchesResource(cell.uri));
		const refs = AwAit Promise.All(viewCells.mAp(cell => cell.model.resolveTextModelRef()));
		AwAit cAllbAck();
		refs.forEAch(ref => ref.dispose());
	}

	Async undo() {
		if (!this.metAdAtA.editAble) {
			return;
		}

		const editStAck = this._undoService.getElements(this.uri);
		const element = editStAck.pAst.length ? editStAck.pAst[editStAck.pAst.length - 1] : undefined;

		if (element && element instAnceof SingleModelEditStAckElement || element instAnceof MultiModelEditStAckElement) {
			AwAit this.withElement(element, Async () => {
				AwAit this._undoService.undo(this.uri);
			});

			return (element instAnceof SingleModelEditStAckElement) ? [element.resource] : element.resources;
		}

		AwAit this._undoService.undo(this.uri);
		return [];
	}

	Async redo() {
		if (!this.metAdAtA.editAble) {
			return;
		}

		const editStAck = this._undoService.getElements(this.uri);
		const element = editStAck.future[0];

		if (element && element instAnceof SingleModelEditStAckElement || element instAnceof MultiModelEditStAckElement) {
			AwAit this.withElement(element, Async () => {
				AwAit this._undoService.redo(this.uri);
			});

			return (element instAnceof SingleModelEditStAckElement) ? [element.resource] : element.resources;
		}

		AwAit this._undoService.redo(this.uri);

		return [];
	}

	equAl(notebook: NotebookTextModel) {
		return this._notebook === notebook;
	}

	dispose() {
		this._locAlStore.cleAr();
		this._viewCells.forEAch(cell => {
			cell.dispose();
		});

		super.dispose();
	}
}

export type CellViewModel = CodeCellViewModel | MArkdownCellViewModel;

export function creAteCellViewModel(instAntiAtionService: IInstAntiAtionService, notebookViewModel: NotebookViewModel, cell: NotebookCellTextModel) {
	if (cell.cellKind === CellKind.Code) {
		return instAntiAtionService.creAteInstAnce(CodeCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.lAyoutInfo, notebookViewModel.eventDispAtcher);
	} else {
		const mdRenderer = instAntiAtionService.creAteInstAnce(MArkdownRenderer, { bAseUrl: dirnAme(notebookViewModel.uri) });
		return instAntiAtionService.creAteInstAnce(MArkdownCellViewModel, notebookViewModel.viewType, cell, notebookViewModel.lAyoutInfo, notebookViewModel, notebookViewModel.eventDispAtcher, mdRenderer);
	}
}
