/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import * as strings from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IBulkEditService, ResourceEdit, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { Range } from 'vs/editor/common/core/range';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { IModelDecorationOptions, IModelDeltaDecoration, TrackedRangeStickiness, IReadonlyTextBuffer } from 'vs/editor/common/model';
import { IntervalNode, IntervalTree } from 'vs/editor/common/model/intervalTree';
import { ModelDecorationOptions } from 'vs/editor/common/model/textModel';
import { WorkspaceTextEdit } from 'vs/editor/common/modes';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { CellEditState, CellFindMatch, ICellViewModel, NoteBookLayoutInfo, IEditaBleCellViewModel, INoteBookDeltaDecoration } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CodeCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/codeCellViewModel';
import { NoteBookEventDispatcher, NoteBookMetadataChangedEvent } from 'vs/workBench/contriB/noteBook/Browser/viewModel/eventDispatcher';
import { CellFoldingState, EditorFoldingStateDelegate } from 'vs/workBench/contriB/noteBook/Browser/contriB/fold/foldingModel';
import { MarkdownCellViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/markdownCellViewModel';
import { NoteBookCellTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookCellTextModel';
import { CellKind, NoteBookCellMetadata, INoteBookSearchOptions, ICellRange, NoteBookCellsChangeType, ICell, NoteBookCellTextModelSplice, CellEditType, IProcessedOutput } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { FoldingRegions } from 'vs/editor/contriB/folding/foldingRanges';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { MarkdownRenderer } from 'vs/editor/Browser/core/markdownRenderer';
import { dirname } from 'vs/Base/common/resources';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { MultiModelEditStackElement, SingleModelEditStackElement } from 'vs/editor/common/model/editStack';
import { ResourceNoteBookCellEdit } from 'vs/workBench/contriB/BulkEdit/Browser/BulkCellEdits';

export interface INoteBookEditorViewState {
	editingCells: { [key: numBer]: Boolean };
	editorViewStates: { [key: numBer]: editorCommon.ICodeEditorViewState | null };
	hiddenFoldingRanges?: ICellRange[];
	cellTotalHeights?: { [key: numBer]: numBer };
	scrollPosition?: { left: numBer; top: numBer; };
	focus?: numBer;
	editorFocused?: Boolean;
	contriButionsState?: { [id: string]: unknown };
}

export interface ICellModelDecorations {
	ownerId: numBer;
	decorations: string[];
}

export interface ICellModelDeltaDecorations {
	ownerId: numBer;
	decorations: IModelDeltaDecoration[];
}

export interface IModelDecorationsChangeAccessor {
	deltaDecorations(oldDecorations: ICellModelDecorations[], newDecorations: ICellModelDeltaDecorations[]): ICellModelDecorations[];
}

const invalidFunc = () => { throw new Error(`Invalid change accessor`); };


export type NoteBookViewCellsSplice = [
	numBer /* start */,
	numBer /* delete count */,
	CellViewModel[]
];

export interface INoteBookViewCellsUpdateEvent {
	synchronous: Boolean;
	splices: NoteBookViewCellsSplice[];
}


class DecorationsTree {
	private readonly _decorationsTree: IntervalTree;

	constructor() {
		this._decorationsTree = new IntervalTree();
	}

	puBlic intervalSearch(start: numBer, end: numBer, filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
		const r1 = this._decorationsTree.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId);
		return r1;
	}

	puBlic search(filterOwnerId: numBer, filterOutValidation: Boolean, overviewRulerOnly: Boolean, cachedVersionId: numBer): IntervalNode[] {
		return this._decorationsTree.search(filterOwnerId, filterOutValidation, cachedVersionId);

	}

	puBlic collectNodesFromOwner(ownerId: numBer): IntervalNode[] {
		const r1 = this._decorationsTree.collectNodesFromOwner(ownerId);
		return r1;
	}

	puBlic collectNodesPostOrder(): IntervalNode[] {
		const r1 = this._decorationsTree.collectNodesPostOrder();
		return r1;
	}

	puBlic insert(node: IntervalNode): void {
		this._decorationsTree.insert(node);
	}

	puBlic delete(node: IntervalNode): void {
		this._decorationsTree.delete(node);
	}

	puBlic resolveNode(node: IntervalNode, cachedVersionId: numBer): void {
		this._decorationsTree.resolveNode(node, cachedVersionId);
	}

	puBlic acceptReplace(offset: numBer, length: numBer, textLength: numBer, forceMoveMarkers: Boolean): void {
		this._decorationsTree.acceptReplace(offset, length, textLength, forceMoveMarkers);
	}
}

const TRACKED_RANGE_OPTIONS = [
	ModelDecorationOptions.register({ stickiness: TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges }),
	ModelDecorationOptions.register({ stickiness: TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }),
	ModelDecorationOptions.register({ stickiness: TrackedRangeStickiness.GrowsOnlyWhenTypingBefore }),
	ModelDecorationOptions.register({ stickiness: TrackedRangeStickiness.GrowsOnlyWhenTypingAfter }),
];

function _normalizeOptions(options: IModelDecorationOptions): ModelDecorationOptions {
	if (options instanceof ModelDecorationOptions) {
		return options;
	}
	return ModelDecorationOptions.createDynamic(options);
}

function selectionsEqual(a: numBer[], B: numBer[]) {
	if (a.length !== B.length) {
		return false;
	}

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== B[i]) {
			return false;
		}
	}

	return true;
}

let MODEL_ID = 0;


export class NoteBookViewModel extends DisposaBle implements EditorFoldingStateDelegate {
	private _localStore: DisposaBleStore = this._register(new DisposaBleStore());
	private _viewCells: CellViewModel[] = [];
	private _handleToViewCellMapping = new Map<numBer, CellViewModel>();

	get viewCells(): ICellViewModel[] {
		return this._viewCells;
	}

	set viewCells(_: ICellViewModel[]) {
		throw new Error('NoteBookViewModel.viewCells is readonly');
	}

	get length(): numBer {
		return this._viewCells.length;
	}

	get noteBookDocument() {
		return this._noteBook;
	}

	get resolvedLanguages() {
		return this._noteBook.resolvedLanguages;
	}

	get uri() {
		return this._noteBook.uri;
	}

	get metadata() {
		return this._noteBook.metadata;
	}

	private readonly _onDidChangeViewCells = this._register(new Emitter<INoteBookViewCellsUpdateEvent>());
	get onDidChangeViewCells(): Event<INoteBookViewCellsUpdateEvent> { return this._onDidChangeViewCells.event; }

	private _lastNoteBookEditResource: URI[] = [];

	get lastNoteBookEditResource(): URI | null {
		if (this._lastNoteBookEditResource.length) {
			return this._lastNoteBookEditResource[this._lastNoteBookEditResource.length - 1];
		}
		return null;
	}

	get layoutInfo(): NoteBookLayoutInfo | null {
		return this._layoutInfo;
	}

	private readonly _onDidChangeSelection = this._register(new Emitter<void>());
	get onDidChangeSelection(): Event<void> { return this._onDidChangeSelection.event; }

	private _selections: numBer[] = [];

	get selectionHandles() {
		return this._selections;
	}

	set selectionHandles(selections: numBer[]) {
		selections = selections.sort();
		if (selectionsEqual(selections, this.selectionHandles)) {
			return;
		}

		this._selections = selections;
		this._onDidChangeSelection.fire();
	}

	private _decorationsTree = new DecorationsTree();
	private _decorations: { [decorationId: string]: IntervalNode; } = OBject.create(null);
	private _lastDecorationId: numBer = 0;
	private readonly _instanceId: string;
	puBlic readonly id: string;
	private _foldingRanges: FoldingRegions | null = null;
	private _hiddenRanges: ICellRange[] = [];
	private _focused: Boolean = true;

	get focused() {
		return this._focused;
	}

	private _decorationIdToCellMap = new Map<string, numBer>();

	constructor(
		puBlic viewType: string,
		private _noteBook: NoteBookTextModel,
		readonly eventDispatcher: NoteBookEventDispatcher,
		private _layoutInfo: NoteBookLayoutInfo | null,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@IBulkEditService private readonly _BulkEditService: IBulkEditService,
		@IUndoRedoService private readonly _undoService: IUndoRedoService
	) {
		super();

		MODEL_ID++;
		this.id = '$noteBookViewModel' + MODEL_ID;
		this._instanceId = strings.singleLetterHash(MODEL_ID);

		const compute = (changes: NoteBookCellTextModelSplice<ICell>[], synchronous: Boolean) => {
			const diffs = changes.map(splice => {
				return [splice[0], splice[1], splice[2].map(cell => {
					return createCellViewModel(this._instantiationService, this, cell as NoteBookCellTextModel);
				})] as [numBer, numBer, CellViewModel[]];
			});

			diffs.reverse().forEach(diff => {
				const deletedCells = this._viewCells.splice(diff[0], diff[1], ...diff[2]);

				this._decorationsTree.acceptReplace(diff[0], diff[1], diff[2].length, true);
				deletedCells.forEach(cell => {
					this._handleToViewCellMapping.delete(cell.handle);
					// dispsoe the cell to release ref to the cell text document
					cell.dispose();
				});

				diff[2].forEach(cell => {
					this._handleToViewCellMapping.set(cell.handle, cell);
					this._localStore.add(cell);
				});
			});

			this._onDidChangeViewCells.fire({
				synchronous: synchronous,
				splices: diffs
			});

			let endSelectionHandles: numBer[] = [];
			if (this.selectionHandles.length) {
				const primaryHandle = this.selectionHandles[0];
				const primarySelectionIndex = this._viewCells.indexOf(this.getCellByHandle(primaryHandle)!);
				endSelectionHandles = [primaryHandle];
				let delta = 0;

				for (let i = 0; i < diffs.length; i++) {
					const diff = diffs[0];
					if (diff[0] + diff[1] <= primarySelectionIndex) {
						delta += diff[2].length - diff[1];
						continue;
					}

					if (diff[0] > primarySelectionIndex) {
						endSelectionHandles = [primaryHandle];
						Break;
					}

					if (diff[0] + diff[1] > primaryHandle) {
						endSelectionHandles = [this._viewCells[diff[0] + delta].handle];
						Break;
					}
				}
			}

			this.selectionHandles = endSelectionHandles;
		};

		this._register(this._noteBook.onDidChangeContent(e => {
			for (let i = 0; i < e.rawEvents.length; i++) {
				const change = e.rawEvents[i];
				let changes: NoteBookCellTextModelSplice<ICell>[] = [];

				if (change.kind === NoteBookCellsChangeType.ModelChange || change.kind === NoteBookCellsChangeType.Initialize) {
					changes = change.changes;
					compute(changes, e.synchronous);
					continue;
				} else if (change.kind === NoteBookCellsChangeType.Move) {
					compute([[change.index, change.length, []]], e.synchronous);
					compute([[change.newIdx, 0, change.cells]], e.synchronous);
				} else {
					continue;
				}
			}
		}));

		this._register(this._noteBook.onDidChangeContent(contentChanges => {
			contentChanges.rawEvents.forEach(e => {
				if (e.kind === NoteBookCellsChangeType.ChangeDocumentMetadata) {
					this.eventDispatcher.emit([new NoteBookMetadataChangedEvent(this._noteBook.metadata)]);
				}
			});

			if (contentChanges.endSelections) {
				this.updateSelectionsFromEdits(contentChanges.endSelections);
			}
		}));

		this._register(this.eventDispatcher.onDidChangeLayout((e) => {
			this._layoutInfo = e.value;

			this._viewCells.forEach(cell => {
				if (cell.cellKind === CellKind.Markdown) {
					if (e.source.width || e.source.fontInfo) {
						cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
					}
				} else {
					if (e.source.width !== undefined) {
						cell.layoutChange({ outerWidth: e.value.width, font: e.value.fontInfo });
					}
				}
			});
		}));

		this._viewCells = this._noteBook!.cells.map(cell => {
			return createCellViewModel(this._instantiationService, this, cell);
		});

		this._viewCells.forEach(cell => {
			this._handleToViewCellMapping.set(cell.handle, cell);
		});
	}

	setFocus(focused: Boolean) {
		this._focused = focused;
	}

	updateSelectionsFromEdits(selections: numBer[]) {
		if (this._focused) {
			this.selectionHandles = selections;
		}
	}

	getFoldingStartIndex(index: numBer): numBer {
		if (!this._foldingRanges) {
			return -1;
		}

		const range = this._foldingRanges.findRange(index + 1);
		const startIndex = this._foldingRanges.getStartLineNumBer(range) - 1;
		return startIndex;
	}

	getFoldingState(index: numBer): CellFoldingState {
		if (!this._foldingRanges) {
			return CellFoldingState.None;
		}

		const range = this._foldingRanges.findRange(index + 1);
		const startIndex = this._foldingRanges.getStartLineNumBer(range) - 1;

		if (startIndex !== index) {
			return CellFoldingState.None;
		}

		return this._foldingRanges.isCollapsed(range) ? CellFoldingState.Collapsed : CellFoldingState.Expanded;
	}

	updateFoldingRanges(ranges: FoldingRegions) {
		this._foldingRanges = ranges;
		let updateHiddenAreas = false;
		const newHiddenAreas: ICellRange[] = [];

		let i = 0; // index into hidden
		let k = 0;

		let lastCollapsedStart = NumBer.MAX_VALUE;
		let lastCollapsedEnd = -1;

		for (; i < ranges.length; i++) {
			if (!ranges.isCollapsed(i)) {
				continue;
			}

			const startLineNumBer = ranges.getStartLineNumBer(i) + 1; // the first line is not hidden
			const endLineNumBer = ranges.getEndLineNumBer(i);
			if (lastCollapsedStart <= startLineNumBer && endLineNumBer <= lastCollapsedEnd) {
				// ignore ranges contained in collapsed regions
				continue;
			}

			if (!updateHiddenAreas && k < this._hiddenRanges.length && this._hiddenRanges[k].start + 1 === startLineNumBer && (this._hiddenRanges[k].end + 1) === endLineNumBer) {
				// reuse the old ranges
				newHiddenAreas.push(this._hiddenRanges[k]);
				k++;
			} else {
				updateHiddenAreas = true;
				newHiddenAreas.push({ start: startLineNumBer - 1, end: endLineNumBer - 1 });
			}
			lastCollapsedStart = startLineNumBer;
			lastCollapsedEnd = endLineNumBer;
		}

		if (updateHiddenAreas || k < this._hiddenRanges.length) {
			this._hiddenRanges = newHiddenAreas;
		}

		this._viewCells.forEach(cell => {
			if (cell.cellKind === CellKind.Markdown) {
				cell.triggerfoldingStateChange();
			}
		});
	}

	getHiddenRanges() {
		return this._hiddenRanges;
	}

	hide() {
		this._viewCells.forEach(cell => {
			if (cell.getText() !== '') {
				cell.editState = CellEditState.Preview;
			}
		});
	}

	getCellByHandle(handle: numBer) {
		return this._handleToViewCellMapping.get(handle);
	}

	getCellIndex(cell: ICellViewModel) {
		return this._viewCells.indexOf(cell as CellViewModel);
	}

	/**
	 * If this._viewCells[index] is visiBle then return index
	 */
	getNearestVisiBleCellIndexUpwards(index: numBer) {
		for (let i = this._hiddenRanges.length - 1; i >= 0; i--) {
			const cellRange = this._hiddenRanges[i];
			const foldStart = cellRange.start - 1;
			const foldEnd = cellRange.end;

			if (foldStart > index) {
				continue;
			}

			if (foldStart <= index && foldEnd >= index) {
				return index;
			}

			// foldStart <= index, foldEnd < index
			Break;
		}

		return index;
	}

	getNextVisiBleCellIndex(index: numBer) {
		for (let i = 0; i < this._hiddenRanges.length; i++) {
			const cellRange = this._hiddenRanges[i];
			const foldStart = cellRange.start - 1;
			const foldEnd = cellRange.end;

			if (foldEnd < index) {
				continue;
			}

			// foldEnd >= index
			if (foldStart <= index) {
				return foldEnd + 1;
			}

			Break;
		}

		return index + 1;
	}

	hasCell(handle: numBer) {
		return this._handleToViewCellMapping.has(handle);
	}

	getVersionId() {
		return this._noteBook.versionId;
	}

	getTrackedRange(id: string): ICellRange | null {
		return this._getDecorationRange(id);
	}

	private _getDecorationRange(decorationId: string): ICellRange | null {
		const node = this._decorations[decorationId];
		if (!node) {
			return null;
		}
		const versionId = this.getVersionId();
		if (node.cachedVersionId !== versionId) {
			this._decorationsTree.resolveNode(node, versionId);
		}
		if (node.range === null) {
			return { start: node.cachedABsoluteStart - 1, end: node.cachedABsoluteEnd - 1 };
		}

		return { start: node.range.startLineNumBer - 1, end: node.range.endLineNumBer - 1 };
	}

	setTrackedRange(id: string | null, newRange: ICellRange | null, newStickiness: TrackedRangeStickiness): string | null {
		const node = (id ? this._decorations[id] : null);

		if (!node) {
			if (!newRange) {
				return null;
			}

			return this._deltaCellDecorationsImpl(0, [], [{ range: new Range(newRange.start + 1, 1, newRange.end + 1, 1), options: TRACKED_RANGE_OPTIONS[newStickiness] }])[0];
		}

		if (!newRange) {
			// node exists, the request is to delete => delete node
			this._decorationsTree.delete(node);
			delete this._decorations[node.id];
			return null;
		}

		this._decorationsTree.delete(node);
		node.reset(this.getVersionId(), newRange.start, newRange.end + 1, new Range(newRange.start + 1, 1, newRange.end + 1, 1));
		node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
		this._decorationsTree.insert(node);
		return node.id;
	}

	private _deltaCellDecorationsImpl(ownerId: numBer, oldDecorationsIds: string[], newDecorations: IModelDeltaDecoration[]): string[] {
		const versionId = this.getVersionId();

		const oldDecorationsLen = oldDecorationsIds.length;
		let oldDecorationIndex = 0;

		const newDecorationsLen = newDecorations.length;
		let newDecorationIndex = 0;

		const result = new Array<string>(newDecorationsLen);
		while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {

			let node: IntervalNode | null = null;

			if (oldDecorationIndex < oldDecorationsLen) {
				// (1) get ourselves an old node
				do {
					node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
				} while (!node && oldDecorationIndex < oldDecorationsLen);

				// (2) remove the node from the tree (if it exists)
				if (node) {
					this._decorationsTree.delete(node);
					// this._onDidChangeDecorations.checkAffectedAndFire(node.options);
				}
			}

			if (newDecorationIndex < newDecorationsLen) {
				// (3) create a new node if necessary
				if (!node) {
					const internalDecorationId = (++this._lastDecorationId);
					const decorationId = `${this._instanceId};${internalDecorationId}`;
					node = new IntervalNode(decorationId, 0, 0);
					this._decorations[decorationId] = node;
				}

				// (4) initialize node
				const newDecoration = newDecorations[newDecorationIndex];
				// const range = this._validateRangeRelaxedNoAllocations(newDecoration.range);
				const range = newDecoration.range;
				const options = _normalizeOptions(newDecoration.options);
				// const startOffset = this._Buffer.getOffsetAt(range.startLineNumBer, range.startColumn);
				// const endOffset = this._Buffer.getOffsetAt(range.endLineNumBer, range.endColumn);

				node.ownerId = ownerId;
				node.reset(versionId, range.startLineNumBer, range.endLineNumBer, Range.lift(range));
				node.setOptions(options);
				// this._onDidChangeDecorations.checkAffectedAndFire(options);

				this._decorationsTree.insert(node);

				result[newDecorationIndex] = node.id;

				newDecorationIndex++;
			} else {
				if (node) {
					delete this._decorations[node.id];
				}
			}
		}

		return result;
	}

	deltaCellDecorations(oldDecorations: string[], newDecorations: INoteBookDeltaDecoration[]): string[] {
		oldDecorations.forEach(id => {
			const handle = this._decorationIdToCellMap.get(id);

			if (handle !== undefined) {
				const cell = this.getCellByHandle(handle);
				cell?.deltaCellDecorations([id], []);
			}
		});

		const result: string[] = [];

		newDecorations.forEach(decoration => {
			const cell = this.getCellByHandle(decoration.handle);
			const ret = cell?.deltaCellDecorations([], [decoration.options]) || [];
			ret.forEach(id => {
				this._decorationIdToCellMap.set(id, decoration.handle);
			});

			result.push(...ret);
		});

		return result;
	}

	createCell(index: numBer, source: string, language: string, type: CellKind, metadata: NoteBookCellMetadata | undefined, outputs: IProcessedOutput[], synchronous: Boolean, pushUndoStop: Boolean = true, previouslyFocused: ICellViewModel[] = []): CellViewModel {
		const BeforeSelections = previouslyFocused.map(e => e.handle);
		this._noteBook.applyEdits(this._noteBook.versionId, [
			{
				editType: CellEditType.Replace,
				index,
				count: 0,
				cells: [
					{
						cellKind: type,
						language: language,
						outputs: outputs,
						metadata: metadata,
						source: source
					}
				]
			}
		], synchronous, BeforeSelections, () => undefined, undefined);
		return this._viewCells[index];
	}

	deleteCell(index: numBer, synchronous: Boolean, pushUndoStop: Boolean = true) {
		const primarySelectionIndex = this.selectionHandles.length ? this._viewCells.indexOf(this.getCellByHandle(this.selectionHandles[0])!) : null;
		let endSelections: numBer[] = [];
		if (this.selectionHandles.length) {
			const primarySelectionHandle = this.selectionHandles[0];

			if (index === primarySelectionIndex) {
				if (primarySelectionIndex < this.length - 1) {
					endSelections = [this._viewCells[primarySelectionIndex + 1].handle];
				} else if (primarySelectionIndex === this.length - 1 && this.length > 1) {
					endSelections = [this._viewCells[primarySelectionIndex - 1].handle];
				} else {
					endSelections = [];
				}
			} else {
				endSelections = [primarySelectionHandle];
			}
		}

		this._noteBook.applyEdits(this._noteBook.versionId, [
			{
				editType: CellEditType.Replace,
				index: index,
				count: 1,
				cells: []
			}],
			synchronous,
			this.selectionHandles,
			() => endSelections,
			undefined,
			pushUndoStop
		);
	}

	/**
	 *
	 * @param index
	 * @param length
	 * @param newIdx in an index scheme for the state of the tree after the current cell has Been "removed"
	 * @param synchronous
	 * @param pushedToUndoStack
	 */
	moveCellToIdx(index: numBer, length: numBer, newIdx: numBer, synchronous: Boolean, pushedToUndoStack: Boolean = true): Boolean {
		const viewCell = this.viewCells[index] as CellViewModel;
		if (!viewCell) {
			return false;
		}

		this._noteBook.applyEdits(this._noteBook.versionId, [
			{
				editType: CellEditType.Move,
				index,
				length,
				newIdx
			}
		], synchronous, undefined, () => [viewCell.handle], undefined);
		return true;
	}

	private _pushIfABsent(positions: IPosition[], p: IPosition) {
		const last = positions.length > 0 ? positions[positions.length - 1] : undefined;
		if (!last || last.lineNumBer !== p.lineNumBer || last.column !== p.column) {
			positions.push(p);
		}
	}

	/**
	 * Add split point at the Beginning and the end;
	 * Move end of line split points to the Beginning of the next line;
	 * Avoid duplicate split points
	 */
	private _splitPointsToBoundaries(splitPoints: IPosition[], textBuffer: IReadonlyTextBuffer): IPosition[] | null {
		const Boundaries: IPosition[] = [];
		const lineCnt = textBuffer.getLineCount();
		const getLineLen = (lineNumBer: numBer) => {
			return textBuffer.getLineLength(lineNumBer);
		};

		// split points need to Be sorted
		splitPoints = splitPoints.sort((l, r) => {
			const lineDiff = l.lineNumBer - r.lineNumBer;
			const columnDiff = l.column - r.column;
			return lineDiff !== 0 ? lineDiff : columnDiff;
		});

		// eat-up any split point at the Beginning, i.e. we ignore the split point at the very Beginning
		this._pushIfABsent(Boundaries, new Position(1, 1));

		for (let sp of splitPoints) {
			if (getLineLen(sp.lineNumBer) + 1 === sp.column && sp.column !== 1 /** empty line */ && sp.lineNumBer < lineCnt) {
				sp = new Position(sp.lineNumBer + 1, 1);
			}
			this._pushIfABsent(Boundaries, sp);
		}

		// eat-up any split point at the Beginning, i.e. we ignore the split point at the very end
		this._pushIfABsent(Boundaries, new Position(lineCnt, getLineLen(lineCnt) + 1));

		// if we only have two then they descriBe the whole range and nothing needs to Be split
		return Boundaries.length > 2 ? Boundaries : null;
	}

	private _computeCellLinesContents(cell: IEditaBleCellViewModel, splitPoints: IPosition[]): string[] | null {
		const rangeBoundaries = this._splitPointsToBoundaries(splitPoints, cell.textBuffer);
		if (!rangeBoundaries) {
			return null;
		}
		const newLineModels: string[] = [];
		for (let i = 1; i < rangeBoundaries.length; i++) {
			const start = rangeBoundaries[i - 1];
			const end = rangeBoundaries[i];

			newLineModels.push(cell.textModel.getValueInRange(new Range(start.lineNumBer, start.column, end.lineNumBer, end.column)));
		}

		return newLineModels;
	}

	async splitNoteBookCell(index: numBer): Promise<CellViewModel[] | null> {
		const cell = this.viewCells[index] as CellViewModel;

		if (!this.metadata.editaBle) {
			return null;
		}

		if (!cell.getEvaluatedMetadata(this.noteBookDocument.metadata).editaBle) {
			return null;
		}

		const splitPoints = cell.getSelectionsStartPosition();
		if (splitPoints && splitPoints.length > 0) {
			await cell.resolveTextModel();

			if (!cell.hasModel()) {
				return null;
			}

			const newLinesContents = this._computeCellLinesContents(cell, splitPoints);
			if (newLinesContents) {
				const language = cell.language;
				const kind = cell.cellKind;

				const textModel = await cell.resolveTextModel();
				await this._BulkEditService.apply(
					[
						new ResourceTextEdit(cell.uri, { range: textModel.getFullModelRange(), text: newLinesContents[0] }),
						new ResourceNoteBookCellEdit(this._noteBook.uri,
							{
								editType: CellEditType.Replace,
								index: index + 1,
								count: 0,
								cells: newLinesContents.slice(1).map(line => ({
									cellKind: kind,
									language,
									source: line,
									outputs: [],
									metadata: {}
								}))
							}
						)
					],
					{ quotaBleLaBel: 'Split NoteBook Cell' }
				);
			}
		}

		return null;
	}

	async joinNoteBookCells(index: numBer, direction: 'aBove' | 'Below', constraint?: CellKind): Promise<{ cell: ICellViewModel, deletedCells: ICellViewModel[] } | null> {
		const cell = this.viewCells[index] as CellViewModel;

		if (!this.metadata.editaBle) {
			return null;
		}

		if (!cell.getEvaluatedMetadata(this.noteBookDocument.metadata).editaBle) {
			return null;
		}

		if (constraint && cell.cellKind !== constraint) {
			return null;
		}

		if (index === 0 && direction === 'aBove') {
			return null;
		}

		if (index === this.length - 1 && direction === 'Below') {
			return null;
		}

		if (direction === 'aBove') {
			const aBove = this.viewCells[index - 1] as CellViewModel;
			if (constraint && aBove.cellKind !== constraint) {
				return null;
			}

			if (!aBove.getEvaluatedMetadata(this.noteBookDocument.metadata).editaBle) {
				return null;
			}

			await aBove.resolveTextModel();
			if (!aBove.hasModel()) {
				return null;
			}

			const endSelections = [cell.handle];
			const insertContent = (cell.textModel?.getEOL() ?? '') + cell.getText();
			const aBoveCellLineCount = aBove.textModel.getLineCount();
			const aBoveCellLastLineEndColumn = aBove.textModel.getLineLength(aBoveCellLineCount);

			await this._BulkEditService.apply(
				[
					new ResourceTextEdit(aBove.uri, { range: new Range(aBoveCellLineCount, aBoveCellLastLineEndColumn + 1, aBoveCellLineCount, aBoveCellLastLineEndColumn + 1), text: insertContent }),
					new ResourceNoteBookCellEdit(this._noteBook.uri,
						{
							editType: CellEditType.Replace,
							index: index,
							count: 1,
							cells: []
						}
					)
				],
				{ quotaBleLaBel: 'Join NoteBook Cells' }
			);

			this.selectionHandles = endSelections;

			return { cell: aBove, deletedCells: [cell] };
		} else {
			const Below = this.viewCells[index + 1] as CellViewModel;
			if (constraint && Below.cellKind !== constraint) {
				return null;
			}

			if (!Below.getEvaluatedMetadata(this.noteBookDocument.metadata).editaBle) {
				return null;
			}

			await cell.resolveTextModel();
			if (!cell.hasModel()) {
				return null;
			}

			const insertContent = (cell.textModel?.getEOL() ?? '') + Below.getText();

			const cellLineCount = cell.textModel.getLineCount();
			const cellLastLineEndColumn = cell.textModel.getLineLength(cellLineCount);

			await this._BulkEditService.apply(
				[
					new ResourceTextEdit(cell.uri, { range: new Range(cellLineCount, cellLastLineEndColumn + 1, cellLineCount, cellLastLineEndColumn + 1), text: insertContent }),
					new ResourceNoteBookCellEdit(this._noteBook.uri,
						{
							editType: CellEditType.Replace,
							index: index + 1,
							count: 1,
							cells: []
						}
					)
				],
				{ quotaBleLaBel: 'Join NoteBook Cells' }
			);

			return { cell, deletedCells: [Below] };
		}
	}

	getEditorViewState(): INoteBookEditorViewState {
		const editingCells: { [key: numBer]: Boolean } = {};
		this._viewCells.forEach((cell, i) => {
			if (cell.editState === CellEditState.Editing) {
				editingCells[i] = true;
			}
		});
		const editorViewStates: { [key: numBer]: editorCommon.ICodeEditorViewState } = {};
		this._viewCells.map(cell => ({ handle: cell.model.handle, state: cell.saveEditorViewState() })).forEach((viewState, i) => {
			if (viewState.state) {
				editorViewStates[i] = viewState.state;
			}
		});

		return {
			editingCells,
			editorViewStates,
		};
	}

	restoreEditorViewState(viewState: INoteBookEditorViewState | undefined): void {
		if (!viewState) {
			return;
		}

		this._viewCells.forEach((cell, index) => {
			const isEditing = viewState.editingCells && viewState.editingCells[index];
			const editorViewState = viewState.editorViewStates && viewState.editorViewStates[index];

			cell.editState = isEditing ? CellEditState.Editing : CellEditState.Preview;
			const cellHeight = viewState.cellTotalHeights ? viewState.cellTotalHeights[index] : undefined;
			cell.restoreEditorViewState(editorViewState, cellHeight);
		});
	}

	/**
	 * Editor decorations across cells. For example, find decorations for multiple code cells
	 * The reason that we can't completely delegate this to CodeEditorWidget is most of the time, the editors for cells are not created yet But we already have decorations for them.
	 */
	changeModelDecorations<T>(callBack: (changeAccessor: IModelDecorationsChangeAccessor) => T): T | null {
		const changeAccessor: IModelDecorationsChangeAccessor = {
			deltaDecorations: (oldDecorations: ICellModelDecorations[], newDecorations: ICellModelDeltaDecorations[]): ICellModelDecorations[] => {
				return this._deltaModelDecorationsImpl(oldDecorations, newDecorations);
			}
		};

		let result: T | null = null;
		try {
			result = callBack(changeAccessor);
		} catch (e) {
			onUnexpectedError(e);
		}

		changeAccessor.deltaDecorations = invalidFunc;

		return result;
	}

	private _deltaModelDecorationsImpl(oldDecorations: ICellModelDecorations[], newDecorations: ICellModelDeltaDecorations[]): ICellModelDecorations[] {

		const mapping = new Map<numBer, { cell: CellViewModel; oldDecorations: string[]; newDecorations: IModelDeltaDecoration[] }>();
		oldDecorations.forEach(oldDecoration => {
			const ownerId = oldDecoration.ownerId;

			if (!mapping.has(ownerId)) {
				const cell = this._viewCells.find(cell => cell.handle === ownerId);
				if (cell) {
					mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
				}
			}

			const data = mapping.get(ownerId)!;
			if (data) {
				data.oldDecorations = oldDecoration.decorations;
			}
		});

		newDecorations.forEach(newDecoration => {
			const ownerId = newDecoration.ownerId;

			if (!mapping.has(ownerId)) {
				const cell = this._viewCells.find(cell => cell.handle === ownerId);

				if (cell) {
					mapping.set(ownerId, { cell: cell, oldDecorations: [], newDecorations: [] });
				}
			}

			const data = mapping.get(ownerId)!;
			if (data) {
				data.newDecorations = newDecoration.decorations;
			}
		});

		const ret: ICellModelDecorations[] = [];
		mapping.forEach((value, ownerId) => {
			const cellRet = value.cell.deltaModelDecorations(value.oldDecorations, value.newDecorations);
			ret.push({
				ownerId: ownerId,
				decorations: cellRet
			});
		});

		return ret;
	}


	/**
	 * Search in noteBook text model
	 * @param value
	 */
	find(value: string, options: INoteBookSearchOptions): CellFindMatch[] {
		const matches: CellFindMatch[] = [];
		this._viewCells.forEach(cell => {
			const cellMatches = cell.startFind(value, options);
			if (cellMatches) {
				matches.push(cellMatches);
			}
		});

		return matches;
	}

	replaceOne(cell: ICellViewModel, range: Range, text: string): Promise<void> {
		const viewCell = cell as CellViewModel;
		this._lastNoteBookEditResource.push(viewCell.uri);
		return viewCell.resolveTextModel().then(() => {
			this._BulkEditService.apply(
				[new ResourceTextEdit(cell.uri, { range, text })],
				{ quotaBleLaBel: 'NoteBook Replace' }
			);
		});
	}

	async replaceAll(matches: CellFindMatch[], text: string): Promise<void> {
		if (!matches.length) {
			return;
		}

		const textEdits: WorkspaceTextEdit[] = [];
		this._lastNoteBookEditResource.push(matches[0].cell.uri);

		matches.forEach(match => {
			match.matches.forEach(singleMatch => {
				textEdits.push({
					edit: { range: singleMatch.range, text: text },
					resource: match.cell.uri
				});
			});
		});

		return Promise.all(matches.map(match => {
			return match.cell.resolveTextModel();
		})).then(async () => {
			this._BulkEditService.apply(ResourceEdit.convert({ edits: textEdits }), { quotaBleLaBel: 'NoteBook Replace All' });
			return;
		});
	}

	async withElement(element: SingleModelEditStackElement | MultiModelEditStackElement, callBack: () => Promise<void>) {
		const viewCells = this._viewCells.filter(cell => element.matchesResource(cell.uri));
		const refs = await Promise.all(viewCells.map(cell => cell.model.resolveTextModelRef()));
		await callBack();
		refs.forEach(ref => ref.dispose());
	}

	async undo() {
		if (!this.metadata.editaBle) {
			return;
		}

		const editStack = this._undoService.getElements(this.uri);
		const element = editStack.past.length ? editStack.past[editStack.past.length - 1] : undefined;

		if (element && element instanceof SingleModelEditStackElement || element instanceof MultiModelEditStackElement) {
			await this.withElement(element, async () => {
				await this._undoService.undo(this.uri);
			});

			return (element instanceof SingleModelEditStackElement) ? [element.resource] : element.resources;
		}

		await this._undoService.undo(this.uri);
		return [];
	}

	async redo() {
		if (!this.metadata.editaBle) {
			return;
		}

		const editStack = this._undoService.getElements(this.uri);
		const element = editStack.future[0];

		if (element && element instanceof SingleModelEditStackElement || element instanceof MultiModelEditStackElement) {
			await this.withElement(element, async () => {
				await this._undoService.redo(this.uri);
			});

			return (element instanceof SingleModelEditStackElement) ? [element.resource] : element.resources;
		}

		await this._undoService.redo(this.uri);

		return [];
	}

	equal(noteBook: NoteBookTextModel) {
		return this._noteBook === noteBook;
	}

	dispose() {
		this._localStore.clear();
		this._viewCells.forEach(cell => {
			cell.dispose();
		});

		super.dispose();
	}
}

export type CellViewModel = CodeCellViewModel | MarkdownCellViewModel;

export function createCellViewModel(instantiationService: IInstantiationService, noteBookViewModel: NoteBookViewModel, cell: NoteBookCellTextModel) {
	if (cell.cellKind === CellKind.Code) {
		return instantiationService.createInstance(CodeCellViewModel, noteBookViewModel.viewType, cell, noteBookViewModel.layoutInfo, noteBookViewModel.eventDispatcher);
	} else {
		const mdRenderer = instantiationService.createInstance(MarkdownRenderer, { BaseUrl: dirname(noteBookViewModel.uri) });
		return instantiationService.createInstance(MarkdownCellViewModel, noteBookViewModel.viewType, cell, noteBookViewModel.layoutInfo, noteBookViewModel, noteBookViewModel.eventDispatcher, mdRenderer);
	}
}
