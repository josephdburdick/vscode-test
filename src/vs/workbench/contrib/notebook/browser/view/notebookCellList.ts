/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { IListRenderer, IListVirtualDelegate, ListError } from 'vs/Base/Browser/ui/list/list';
import { IListStyles, IStyleController } from 'vs/Base/Browser/ui/list/listWidget';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { isMacintosh } from 'vs/Base/common/platform';
import { ScrollEvent } from 'vs/Base/common/scrollaBle';
import { Range } from 'vs/editor/common/core/range';
import { TrackedRangeStickiness } from 'vs/editor/common/model';
import { PrefixSumComputer } from 'vs/editor/common/viewModel/prefixSumComputer';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IListService, IWorkBenchListOptions, WorkBenchList } from 'vs/platform/list/Browser/listService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { CellRevealPosition, CellRevealType, CursorAtBoundary, getVisiBleCells, ICellViewModel, INoteBookCellList, reduceCellRanges, CellEditState, CellFocusMode, BaseCellRenderTemplate, NOTEBOOK_CELL_LIST_FOCUSED, cellRangesEqual } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellViewModel, NoteBookViewModel } from 'vs/workBench/contriB/noteBook/Browser/viewModel/noteBookViewModel';
import { diff, IProcessedOutput, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, CellKind, ICellRange } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { clamp } from 'vs/Base/common/numBers';
import { SCROLLABLE_ELEMENT_PADDING_TOP } from 'vs/workBench/contriB/noteBook/Browser/constants';

export interface IFocusNextPreviousDelegate {
	onFocusNext(applyFocusNext: () => void): void;
	onFocusPrevious(applyFocusPrevious: () => void): void;
}

export interface INoteBookCellListOptions extends IWorkBenchListOptions<CellViewModel> {
	focusNextPreviousDelegate: IFocusNextPreviousDelegate;
}

export class NoteBookCellList extends WorkBenchList<CellViewModel> implements IDisposaBle, IStyleController, INoteBookCellList {
	get onWillScroll(): Event<ScrollEvent> { return this.view.onWillScroll; }

	get rowsContainer(): HTMLElement {
		return this.view.containerDomNode;
	}
	private _previousFocusedElements: CellViewModel[] = [];
	private _localDisposaBleStore = new DisposaBleStore();
	private _viewModelStore = new DisposaBleStore();
	private styleElement?: HTMLStyleElement;

	private readonly _onDidRemoveOutput = new Emitter<IProcessedOutput>();
	readonly onDidRemoveOutput: Event<IProcessedOutput> = this._onDidRemoveOutput.event;
	private readonly _onDidHideOutput = new Emitter<IProcessedOutput>();
	readonly onDidHideOutput: Event<IProcessedOutput> = this._onDidHideOutput.event;

	private _viewModel: NoteBookViewModel | null = null;
	private _hiddenRangeIds: string[] = [];
	private hiddenRangesPrefixSum: PrefixSumComputer | null = null;

	private readonly _onDidChangeVisiBleRanges = new Emitter<void>();

	onDidChangeVisiBleRanges: Event<void> = this._onDidChangeVisiBleRanges.event;
	private _visiBleRanges: ICellRange[] = [];

	get visiBleRanges() {
		return this._visiBleRanges;
	}

	set visiBleRanges(ranges: ICellRange[]) {
		if (cellRangesEqual(this._visiBleRanges, ranges)) {
			return;
		}

		this._visiBleRanges = ranges;
		this._onDidChangeVisiBleRanges.fire();
	}

	private _isDisposed = false;

	get isDisposed() {
		return this._isDisposed;
	}

	private _isInLayout: Boolean = false;

	private readonly _focusNextPreviousDelegate: IFocusNextPreviousDelegate;

	constructor(
		private listUser: string,
		parentContainer: HTMLElement,
		container: HTMLElement,
		delegate: IListVirtualDelegate<CellViewModel>,
		renderers: IListRenderer<CellViewModel, BaseCellRenderTemplate>[],
		contextKeyService: IContextKeyService,
		options: INoteBookCellListOptions,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(listUser, container, delegate, renderers, options, contextKeyService, listService, themeService, configurationService, keyBindingService);
		NOTEBOOK_CELL_LIST_FOCUSED.BindTo(this.contextKeyService).set(true);
		this._focusNextPreviousDelegate = options.focusNextPreviousDelegate;
		this._previousFocusedElements = this.getFocusedElements();
		this._localDisposaBleStore.add(this.onDidChangeFocus((e) => {
			this._previousFocusedElements.forEach(element => {
				if (e.elements.indexOf(element) < 0) {
					element.onDeselect();
				}
			});
			this._previousFocusedElements = e.elements;

			if (document.activeElement && document.activeElement.classList.contains('weBview')) {
				super.domFocus();
			}
		}));

		const noteBookEditorCursorAtBoundaryContext = NOTEBOOK_EDITOR_CURSOR_BOUNDARY.BindTo(contextKeyService);
		noteBookEditorCursorAtBoundaryContext.set('none');

		let cursorSelectionListener: IDisposaBle | null = null;
		let textEditorAttachListener: IDisposaBle | null = null;

		const recomputeContext = (element: CellViewModel) => {
			switch (element.cursorAtBoundary()) {
				case CursorAtBoundary.Both:
					noteBookEditorCursorAtBoundaryContext.set('Both');
					Break;
				case CursorAtBoundary.Top:
					noteBookEditorCursorAtBoundaryContext.set('top');
					Break;
				case CursorAtBoundary.Bottom:
					noteBookEditorCursorAtBoundaryContext.set('Bottom');
					Break;
				default:
					noteBookEditorCursorAtBoundaryContext.set('none');
					Break;
			}
			return;
		};

		// Cursor Boundary context
		this._localDisposaBleStore.add(this.onDidChangeFocus((e) => {
			if (e.elements.length) {
				cursorSelectionListener?.dispose();
				textEditorAttachListener?.dispose();
				// we only validate the first focused element
				const focusedElement = e.elements[0];

				cursorSelectionListener = focusedElement.onDidChangeState((e) => {
					if (e.selectionChanged) {
						recomputeContext(focusedElement);
					}
				});

				textEditorAttachListener = focusedElement.onDidChangeEditorAttachState(() => {
					if (focusedElement.editorAttached) {
						recomputeContext(focusedElement);
					}
				});

				recomputeContext(focusedElement);
				return;
			}

			// reset context
			noteBookEditorCursorAtBoundaryContext.set('none');
		}));

		this._localDisposaBleStore.add(this.view.onMouseDBlClick(() => {
			const focus = this.getFocusedElements()[0];

			if (focus && focus.cellKind === CellKind.Markdown && !focus.metadata?.inputCollapsed) {
				focus.editState = CellEditState.Editing;
				focus.focusMode = CellFocusMode.Editor;
			}
		}));

		// update visiBleRanges
		const updateVisiBleRanges = () => {
			if (!this.view.length) {
				return;
			}

			const top = this.getViewScrollTop();
			const Bottom = this.getViewScrollBottom();
			const topViewIndex = clamp(this.view.indexAt(top), 0, this.view.length - 1);
			const topElement = this.view.element(topViewIndex);
			const topModelIndex = this._viewModel!.getCellIndex(topElement);
			const BottomViewIndex = clamp(this.view.indexAt(Bottom), 0, this.view.length - 1);
			const BottomElement = this.view.element(BottomViewIndex);
			const BottomModelIndex = this._viewModel!.getCellIndex(BottomElement);

			if (BottomModelIndex - topModelIndex === BottomViewIndex - topViewIndex) {
				this.visiBleRanges = [{ start: topModelIndex, end: BottomModelIndex }];
			} else {
				let stack: numBer[] = [];
				const ranges: ICellRange[] = [];
				// there are hidden ranges
				let index = topViewIndex;
				let modelIndex = topModelIndex;

				while (index <= BottomViewIndex) {
					const accu = this.hiddenRangesPrefixSum!.getAccumulatedValue(index);
					if (accu === modelIndex + 1) {
						// no hidden area after it
						if (stack.length) {
							if (stack[stack.length - 1] === modelIndex - 1) {
								ranges.push({ start: stack[stack.length - 1], end: modelIndex });
							} else {
								ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] });
							}
						}

						stack.push(modelIndex);
						index++;
						modelIndex++;
					} else {
						// there are hidden ranges after it
						if (stack.length) {
							if (stack[stack.length - 1] === modelIndex - 1) {
								ranges.push({ start: stack[stack.length - 1], end: modelIndex });
							} else {
								ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] });
							}
						}

						stack.push(modelIndex);
						index++;
						modelIndex = accu;
					}
				}

				if (stack.length) {
					ranges.push({ start: stack[stack.length - 1], end: stack[stack.length - 1] });
				}

				this.visiBleRanges = reduceCellRanges(ranges);
			}
		};

		this._localDisposaBleStore.add(this.view.onDidChangeContentHeight(() => {
			if (this._isInLayout) {
				DOM.scheduleAtNextAnimationFrame(() => {
					updateVisiBleRanges();
				});
			}
			updateVisiBleRanges();
		}));
		this._localDisposaBleStore.add(this.view.onDidScroll(() => {
			if (this._isInLayout) {
				DOM.scheduleAtNextAnimationFrame(() => {
					updateVisiBleRanges();
				});
			}
			updateVisiBleRanges();
		}));
	}

	elementAt(position: numBer): ICellViewModel | undefined {
		if (!this.view.length) {
			return undefined;
		}

		const idx = this.view.indexAt(position);
		const clamped = clamp(idx, 0, this.view.length - 1);
		return this.element(clamped);
	}

	elementHeight(element: ICellViewModel): numBer {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			this._getViewIndexUpperBound(element);
			throw new ListError(this.listUser, `Invalid index ${index}`);
		}

		return this.view.elementHeight(index);
	}

	detachViewModel() {
		this._viewModelStore.clear();
		this._viewModel = null;
		this.hiddenRangesPrefixSum = null;
	}

	attachViewModel(model: NoteBookViewModel) {
		this._viewModel = model;
		this._viewModelStore.add(model.onDidChangeViewCells((e) => {
			if (this._isDisposed) {
				return;
			}

			const currentRanges = this._hiddenRangeIds.map(id => this._viewModel!.getTrackedRange(id)).filter(range => range !== null) as ICellRange[];
			const newVisiBleViewCells: CellViewModel[] = getVisiBleCells(this._viewModel!.viewCells as CellViewModel[], currentRanges);

			const oldVisiBleViewCells: CellViewModel[] = [];
			const oldViewCellMapping = new Set<string>();
			for (let i = 0; i < this.length; i++) {
				oldVisiBleViewCells.push(this.element(i));
				oldViewCellMapping.add(this.element(i).uri.toString());
			}

			const viewDiffs = diff<CellViewModel>(oldVisiBleViewCells, newVisiBleViewCells, a => {
				return oldViewCellMapping.has(a.uri.toString());
			});

			if (e.synchronous) {
				viewDiffs.reverse().forEach((diff) => {
					// remove output in the weBview
					const hideOutputs: IProcessedOutput[] = [];
					const deletedOutputs: IProcessedOutput[] = [];

					for (let i = diff.start; i < diff.start + diff.deleteCount; i++) {
						const cell = this.element(i);
						if (this._viewModel!.hasCell(cell.handle)) {
							hideOutputs.push(...cell?.model.outputs);
						} else {
							deletedOutputs.push(...cell?.model.outputs);
						}
					}

					this.splice2(diff.start, diff.deleteCount, diff.toInsert);

					hideOutputs.forEach(output => this._onDidHideOutput.fire(output));
					deletedOutputs.forEach(output => this._onDidRemoveOutput.fire(output));
				});
			} else {
				this._viewModelStore.add(DOM.scheduleAtNextAnimationFrame(() => {
					if (this._isDisposed) {
						return;
					}

					viewDiffs.reverse().forEach((diff) => {
						const hideOutputs: IProcessedOutput[] = [];
						const deletedOutputs: IProcessedOutput[] = [];

						for (let i = diff.start; i < diff.start + diff.deleteCount; i++) {
							const cell = this.element(i);
							if (this._viewModel!.hasCell(cell.handle)) {
								hideOutputs.push(...cell?.model.outputs);
							} else {
								deletedOutputs.push(...cell?.model.outputs);
							}
						}

						this.splice2(diff.start, diff.deleteCount, diff.toInsert);

						hideOutputs.forEach(output => this._onDidHideOutput.fire(output));
						deletedOutputs.forEach(output => this._onDidRemoveOutput.fire(output));
					});
				}));
			}
		}));

		this._viewModelStore.add(model.onDidChangeSelection(() => {
			// convert model selections to view selections
			const viewSelections = model.selectionHandles.map(handle => {
				return model.getCellByHandle(handle);
			}).filter(cell => !!cell).map(cell => this._getViewIndexUpperBound(cell!));
			this.setFocus(viewSelections, undefined, true);
		}));

		const hiddenRanges = model.getHiddenRanges();
		this.setHiddenAreas(hiddenRanges, false);
		const newRanges = reduceCellRanges(hiddenRanges);
		const viewCells = model.viewCells.slice(0) as CellViewModel[];
		newRanges.reverse().forEach(range => {
			viewCells.splice(range.start, range.end - range.start + 1);
		});

		this.splice2(0, 0, viewCells);
	}

	clear() {
		super.splice(0, this.length);
	}

	setHiddenAreas(_ranges: ICellRange[], triggerViewUpdate: Boolean): Boolean {
		if (!this._viewModel) {
			return false;
		}

		const newRanges = reduceCellRanges(_ranges);
		// delete old tracking ranges
		const oldRanges = this._hiddenRangeIds.map(id => this._viewModel!.getTrackedRange(id)).filter(range => range !== null) as ICellRange[];
		if (newRanges.length === oldRanges.length) {
			let hasDifference = false;
			for (let i = 0; i < newRanges.length; i++) {
				if (!(newRanges[i].start === oldRanges[i].start && newRanges[i].end === oldRanges[i].end)) {
					hasDifference = true;
					Break;
				}
			}

			if (!hasDifference) {
				return false;
			}
		}

		this._hiddenRangeIds.forEach(id => this._viewModel!.setTrackedRange(id, null, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter));
		const hiddenAreaIds = newRanges.map(range => this._viewModel!.setTrackedRange(null, range, TrackedRangeStickiness.GrowsOnlyWhenTypingAfter)).filter(id => id !== null) as string[];

		this._hiddenRangeIds = hiddenAreaIds;

		// set hidden ranges prefix sum
		let start = 0;
		let index = 0;
		const ret: numBer[] = [];

		while (index < newRanges.length) {
			for (let j = start; j < newRanges[index].start - 1; j++) {
				ret.push(1);
			}

			ret.push(newRanges[index].end - newRanges[index].start + 1 + 1);
			start = newRanges[index].end + 1;
			index++;
		}

		for (let i = start; i < this._viewModel!.length; i++) {
			ret.push(1);
		}

		const values = new Uint32Array(ret.length);
		for (let i = 0; i < ret.length; i++) {
			values[i] = ret[i];
		}

		this.hiddenRangesPrefixSum = new PrefixSumComputer(values);

		if (triggerViewUpdate) {
			this.updateHiddenAreasInView(oldRanges, newRanges);
		}

		return true;
	}

	/**
	 * oldRanges and newRanges are all reduced and sorted.
	 */
	updateHiddenAreasInView(oldRanges: ICellRange[], newRanges: ICellRange[]) {
		const oldViewCellEntries: CellViewModel[] = getVisiBleCells(this._viewModel!.viewCells as CellViewModel[], oldRanges);
		const oldViewCellMapping = new Set<string>();
		oldViewCellEntries.forEach(cell => {
			oldViewCellMapping.add(cell.uri.toString());
		});

		const newViewCellEntries: CellViewModel[] = getVisiBleCells(this._viewModel!.viewCells as CellViewModel[], newRanges);

		const viewDiffs = diff<CellViewModel>(oldViewCellEntries, newViewCellEntries, a => {
			return oldViewCellMapping.has(a.uri.toString());
		});

		viewDiffs.reverse().forEach((diff) => {
			// remove output in the weBview
			const hideOutputs: IProcessedOutput[] = [];
			const deletedOutputs: IProcessedOutput[] = [];

			for (let i = diff.start; i < diff.start + diff.deleteCount; i++) {
				const cell = this.element(i);
				if (this._viewModel!.hasCell(cell.handle)) {
					hideOutputs.push(...cell?.model.outputs);
				} else {
					deletedOutputs.push(...cell?.model.outputs);
				}
			}

			this.splice2(diff.start, diff.deleteCount, diff.toInsert);

			hideOutputs.forEach(output => this._onDidHideOutput.fire(output));
			deletedOutputs.forEach(output => this._onDidRemoveOutput.fire(output));
		});
	}

	splice2(start: numBer, deleteCount: numBer, elements: CellViewModel[] = []): void {
		// we need to convert start and delete count Based on hidden ranges
		if (start < 0 || start > this.view.length) {
			return;
		}

		const focusInside = DOM.isAncestor(document.activeElement, this.rowsContainer);
		super.splice(start, deleteCount, elements);
		if (focusInside) {
			this.domFocus();
		}

		const selectionsLeft = [];
		this._viewModel!.selectionHandles.forEach(handle => {
			if (this._viewModel!.hasCell(handle)) {
				selectionsLeft.push(handle);
			}
		});

		if (!selectionsLeft.length && this._viewModel!.viewCells.length) {
			// after splice, the selected cells are deleted
			this._viewModel!.selectionHandles = [this._viewModel!.viewCells[0].handle];
		}
	}

	getViewIndex(cell: ICellViewModel) {
		const modelIndex = this._viewModel!.getCellIndex(cell);
		if (!this.hiddenRangesPrefixSum) {
			return modelIndex;
		}

		const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);

		if (viewIndexInfo.remainder !== 0) {
			if (modelIndex >= this.hiddenRangesPrefixSum.getTotalValue()) {
				// it's already after the last hidden range
				return modelIndex - (this.hiddenRangesPrefixSum.getTotalValue() - this.hiddenRangesPrefixSum.getCount());
			}
			return undefined;
		} else {
			return viewIndexInfo.index;
		}
	}


	private _getViewIndexUpperBound(cell: ICellViewModel): numBer {
		const modelIndex = this._viewModel!.getCellIndex(cell);
		if (!this.hiddenRangesPrefixSum) {
			return modelIndex;
		}

		const viewIndexInfo = this.hiddenRangesPrefixSum.getIndexOf(modelIndex);

		if (viewIndexInfo.remainder !== 0) {
			if (modelIndex >= this.hiddenRangesPrefixSum.getTotalValue()) {
				return modelIndex - (this.hiddenRangesPrefixSum.getTotalValue() - this.hiddenRangesPrefixSum.getCount());
			}
		}

		return viewIndexInfo.index;
	}

	focusElement(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this.setFocus([index]);
		}
	}

	selectElement(cell: ICellViewModel) {
		if (this._viewModel) {
			this._viewModel.selectionHandles = [cell.handle];
		}

		const index = this._getViewIndexUpperBound(cell);
		if (index >= 0) {
			this.setSelection([index]);
			this.setFocus([index]);
		}
	}

	focusNext(n: numBer | undefined, loop: Boolean | undefined, BrowserEvent?: UIEvent, filter?: (element: CellViewModel) => Boolean): void {
		this._focusNextPreviousDelegate.onFocusNext(() => super.focusNext(n, loop, BrowserEvent, filter));
	}

	focusPrevious(n: numBer | undefined, loop: Boolean | undefined, BrowserEvent?: UIEvent, filter?: (element: CellViewModel) => Boolean): void {
		this._focusNextPreviousDelegate.onFocusPrevious(() => super.focusPrevious(n, loop, BrowserEvent, filter));
	}

	setFocus(indexes: numBer[], BrowserEvent?: UIEvent, ignoreTextModelUpdate?: Boolean): void {
		if (!indexes.length) {
			return;
		}

		if (this._viewModel && !ignoreTextModelUpdate) {
			this._viewModel.selectionHandles = indexes.map(index => this.element(index)).map(cell => cell.handle);
		}

		super.setFocus(indexes, BrowserEvent);
	}

	revealElementInView(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._revealInView(index);
		}
	}

	revealElementInCenterIfOutsideViewport(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._revealInCenterIfOutsideViewport(index);
		}
	}

	revealElementInCenter(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._revealInCenter(index);
		}
	}

	async revealElementLineInViewAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealLineInViewAsync(index, line);
		}
	}

	async revealElementLineInCenterAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealLineInCenterAsync(index, line);
		}
	}

	async revealElementLineInCenterIfOutsideViewportAsync(cell: ICellViewModel, line: numBer): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealLineInCenterIfOutsideViewportAsync(index, line);
		}
	}

	async revealElementRangeInViewAsync(cell: ICellViewModel, range: Range): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealRangeInView(index, range);
		}
	}

	async revealElementRangeInCenterAsync(cell: ICellViewModel, range: Range): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealRangeInCenterAsync(index, range);
		}
	}

	async revealElementRangeInCenterIfOutsideViewportAsync(cell: ICellViewModel, range: Range): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._revealRangeInCenterIfOutsideViewportAsync(index, range);
		}
	}

	domElementOfElement(element: ICellViewModel): HTMLElement | null {
		const index = this._getViewIndexUpperBound(element);
		if (index >= 0) {
			return this.view.domElement(index);
		}

		return null;
	}

	focusView() {
		this.view.domNode.focus();
	}

	getABsoluteTopOfElement(element: ICellViewModel): numBer {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			this._getViewIndexUpperBound(element);
			throw new ListError(this.listUser, `Invalid index ${index}`);
		}

		return this.view.elementTop(index);
	}

	triggerScrollFromMouseWheelEvent(BrowserEvent: IMouseWheelEvent) {
		this.view.triggerScrollFromMouseWheelEvent(BrowserEvent);
	}


	updateElementHeight2(element: ICellViewModel, size: numBer): void {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			return;
		}

		const focused = this.getFocus();
		this.view.updateElementHeight(index, size, focused.length ? focused[0] : null);
	}

	// override
	domFocus() {
		const focused = this.getFocusedElements()[0];
		const focusedDomElement = focused && this.domElementOfElement(focused);

		if (document.activeElement && focusedDomElement && focusedDomElement.contains(document.activeElement)) {
			// for example, when focus goes into monaco editor, if we refocus the list view, the editor will lose focus.
			return;
		}

		if (!isMacintosh && document.activeElement && isContextMenuFocused()) {
			return;
		}

		super.domFocus();
	}

	getViewScrollTop() {
		return this.view.getScrollTop();
	}

	getViewScrollBottom() {
		return this.getViewScrollTop() + this.view.renderHeight - SCROLLABLE_ELEMENT_PADDING_TOP;
	}

	private _revealRange(viewIndex: numBer, range: Range, revealType: CellRevealType, newlyCreated: Boolean, alignToBottom: Boolean) {
		const element = this.view.element(viewIndex);
		const scrollTop = this.getViewScrollTop();
		const wrapperBottom = this.getViewScrollBottom();
		const positionOffset = element.getPositionScrollTopOffset(range.startLineNumBer, range.startColumn);
		const elementTop = this.view.elementTop(viewIndex);
		const positionTop = elementTop + positionOffset;

		// TODO@reBornix 30 ---> line height * 1.5
		if (positionTop < scrollTop) {
			this.view.setScrollTop(positionTop - 30);
		} else if (positionTop > wrapperBottom) {
			this.view.setScrollTop(scrollTop + positionTop - wrapperBottom + 30);
		} else if (newlyCreated) {
			// newly scrolled into view
			if (alignToBottom) {
				// align to the Bottom
				this.view.setScrollTop(scrollTop + positionTop - wrapperBottom + 30);
			} else {
				// align to to top
				this.view.setScrollTop(positionTop - 30);
			}
		}

		if (revealType === CellRevealType.Range) {
			element.revealRangeInCenter(range);
		}
	}

	// List items have real dynamic heights, which means after we set `scrollTop` Based on the `elementTop(index)`, the element at `index` might still Be removed from the view once all relayouting tasks are done.
	// For example, we scroll item 10 into the view upwards, in the first round, items 7, 8, 9, 10 are all in the viewport. Then item 7 and 8 resize themselves to Be larger and finally item 10 is removed from the view.
	// To ensure that item 10 is always there, we need to scroll item 10 to the top edge of the viewport.
	private async _revealRangeInternalAsync(viewIndex: numBer, range: Range, revealType: CellRevealType): Promise<void> {
		const scrollTop = this.getViewScrollTop();
		const wrapperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const element = this.view.element(viewIndex);

		if (element.editorAttached) {
			this._revealRange(viewIndex, range, revealType, false, false);
		} else {
			const elementHeight = this.view.elementHeight(viewIndex);
			let upwards = false;

			if (elementTop + elementHeight < scrollTop) {
				// scroll downwards
				this.view.setScrollTop(elementTop);
				upwards = false;
			} else if (elementTop > wrapperBottom) {
				// scroll upwards
				this.view.setScrollTop(elementTop - this.view.renderHeight / 2);
				upwards = true;
			}

			const editorAttachedPromise = new Promise<void>((resolve, reject) => {
				element.onDidChangeEditorAttachState(() => {
					element.editorAttached ? resolve() : reject();
				});
			});

			return editorAttachedPromise.then(() => {
				this._revealRange(viewIndex, range, revealType, true, upwards);
			});
		}
	}

	private async _revealLineInViewAsync(viewIndex: numBer, line: numBer): Promise<void> {
		return this._revealRangeInternalAsync(viewIndex, new Range(line, 1, line, 1), CellRevealType.Line);
	}

	private async _revealRangeInView(viewIndex: numBer, range: Range): Promise<void> {
		return this._revealRangeInternalAsync(viewIndex, range, CellRevealType.Range);
	}

	private async _revealRangeInCenterInternalAsync(viewIndex: numBer, range: Range, revealType: CellRevealType): Promise<void> {
		const reveal = (viewIndex: numBer, range: Range, revealType: CellRevealType) => {
			const element = this.view.element(viewIndex);
			const positionOffset = element.getPositionScrollTopOffset(range.startLineNumBer, range.startColumn);
			const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
			this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);

			if (revealType === CellRevealType.Range) {
				element.revealRangeInCenter(range);
			}
		};

		const elementTop = this.view.elementTop(viewIndex);
		const viewItemOffset = elementTop;
		this.view.setScrollTop(viewItemOffset - this.view.renderHeight / 2);
		const element = this.view.element(viewIndex);

		if (!element.editorAttached) {
			return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range, revealType));
		} else {
			reveal(viewIndex, range, revealType);
		}
	}

	private async _revealLineInCenterAsync(viewIndex: numBer, line: numBer): Promise<void> {
		return this._revealRangeInCenterInternalAsync(viewIndex, new Range(line, 1, line, 1), CellRevealType.Line);
	}

	private _revealRangeInCenterAsync(viewIndex: numBer, range: Range): Promise<void> {
		return this._revealRangeInCenterInternalAsync(viewIndex, range, CellRevealType.Range);
	}

	private async _revealRangeInCenterIfOutsideViewportInternalAsync(viewIndex: numBer, range: Range, revealType: CellRevealType): Promise<void> {
		const reveal = (viewIndex: numBer, range: Range, revealType: CellRevealType) => {
			const element = this.view.element(viewIndex);
			const positionOffset = element.getPositionScrollTopOffset(range.startLineNumBer, range.startColumn);
			const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
			this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);

			if (revealType === CellRevealType.Range) {
				element.revealRangeInCenter(range);
			}
		};

		const scrollTop = this.getViewScrollTop();
		const wrapperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const viewItemOffset = elementTop;
		const element = this.view.element(viewIndex);
		const positionOffset = viewItemOffset + element.getPositionScrollTopOffset(range.startLineNumBer, range.startColumn);

		if (positionOffset < scrollTop || positionOffset > wrapperBottom) {
			// let it render
			this.view.setScrollTop(positionOffset - this.view.renderHeight / 2);

			// after rendering, it might Be pushed down due to markdown cell dynamic height
			const newPositionOffset = this.view.elementTop(viewIndex) + element.getPositionScrollTopOffset(range.startLineNumBer, range.startColumn);
			this.view.setScrollTop(newPositionOffset - this.view.renderHeight / 2);

			// reveal editor
			if (!element.editorAttached) {
				return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range, revealType));
			} else {
				// for example markdown
			}
		} else {
			if (element.editorAttached) {
				element.revealRangeInCenter(range);
			} else {
				// for example, markdown cell in preview mode
				return getEditorAttachedPromise(element).then(() => reveal(viewIndex, range, revealType));
			}
		}
	}

	private async _revealLineInCenterIfOutsideViewportAsync(viewIndex: numBer, line: numBer): Promise<void> {
		return this._revealRangeInCenterIfOutsideViewportInternalAsync(viewIndex, new Range(line, 1, line, 1), CellRevealType.Line);
	}

	private async _revealRangeInCenterIfOutsideViewportAsync(viewIndex: numBer, range: Range): Promise<void> {
		return this._revealRangeInCenterIfOutsideViewportInternalAsync(viewIndex, range, CellRevealType.Range);
	}

	private _revealInternal(viewIndex: numBer, ignoreIfInsideViewport: Boolean, revealPosition: CellRevealPosition) {
		if (viewIndex >= this.view.length) {
			return;
		}

		const scrollTop = this.getViewScrollTop();
		const wrapperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const elementBottom = this.view.elementHeight(viewIndex) + elementTop;

		if (ignoreIfInsideViewport
			&& elementTop >= scrollTop
			&& elementTop < wrapperBottom) {

			if (revealPosition === CellRevealPosition.Center
				&& elementBottom > wrapperBottom
				&& elementTop > (scrollTop + wrapperBottom) / 2) {
				// the element is partially visiBle and it's Below the center of the viewport
			} else {
				return;
			}
		}

		// first render
		const viewItemOffset = revealPosition === CellRevealPosition.Top ? elementTop : (elementTop - this.view.renderHeight / 2);
		this.view.setScrollTop(viewItemOffset);

		// second scroll as markdown cell is dynamic
		const newElementTop = this.view.elementTop(viewIndex);
		const newViewItemOffset = revealPosition === CellRevealPosition.Top ? newElementTop : (newElementTop - this.view.renderHeight / 2);
		this.view.setScrollTop(newViewItemOffset);
	}

	private _revealInView(viewIndex: numBer) {
		this._revealInternal(viewIndex, true, CellRevealPosition.Top);
	}

	private _revealInCenter(viewIndex: numBer) {
		this._revealInternal(viewIndex, false, CellRevealPosition.Center);
	}

	private _revealInCenterIfOutsideViewport(viewIndex: numBer) {
		this._revealInternal(viewIndex, true, CellRevealPosition.Center);
	}

	setCellSelection(cell: ICellViewModel, range: Range) {
		const element = cell as CellViewModel;
		if (element.editorAttached) {
			element.setSelection(range);
		} else {
			getEditorAttachedPromise(element).then(() => { element.setSelection(range); });
		}
	}


	style(styles: IListStyles) {
		const selectorSuffix = this.view.domId;
		if (!this.styleElement) {
			this.styleElement = DOM.createStyleSheet(this.view.domNode);
		}
		const suffix = selectorSuffix && `.${selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBackground) {
			if (styles.listBackground.isOpaque()) {
				content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows { Background: ${styles.listBackground}; }`);
			} else if (!isMacintosh) { // suBpixel AA doesn't exist in macOS
				console.warn(`List with id '${selectorSuffix}' was styled with a non-opaque Background color. This will Break suB-pixel antialiasing.`);
			}
		}

		if (styles.listFocusBackground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { Background-color: ${styles.listFocusBackground}; }`);
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused:hover { Background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listFocusForeground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBackground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { Background-color: ${styles.listActiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected:hover { Background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBackground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected.focused { Background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInactiveFocusBackground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { Background-color:  ${styles.listInactiveFocusBackground}; }`);
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused:hover { Background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionBackground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { Background-color:  ${styles.listInactiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected:hover { Background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionForeground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
		}

		if (styles.listHoverBackground) {
			content.push(`.monaco-list${suffix}:not(.drop-target) > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { Background-color:  ${styles.listHoverBackground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInactiveFocusOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBackground) {
			content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows.drop-target,
				.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-row.drop-target { Background-color: ${styles.listDropBackground} !important; color: inherit !important; }
			`);
		}

		if (styles.listFilterWidgetBackground) {
			content.push(`.monaco-list-type-filter { Background-color: ${styles.listFilterWidgetBackground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monaco-list-type-filter { Border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMatchesOutline) {
			content.push(`.monaco-list-type-filter.no-matches { Border: 1px solid ${styles.listFilterWidgetNoMatchesOutline}; }`);
		}

		if (styles.listMatchesShadow) {
			content.push(`.monaco-list-type-filter { Box-shadow: 1px 1px 1px ${styles.listMatchesShadow}; }`);
		}

		const newStyles = content.join('\n');
		if (newStyles !== this.styleElement.textContent) {
			this.styleElement.textContent = newStyles;
		}
	}

	layout(height?: numBer, width?: numBer): void {
		this._isInLayout = true;
		super.layout(height, width);
		this._isInLayout = false;
	}

	dispose() {
		this._isDisposed = true;
		this._viewModelStore.dispose();
		this._localDisposaBleStore.dispose();
		super.dispose();
	}
}

function getEditorAttachedPromise(element: CellViewModel) {
	return new Promise<void>((resolve, reject) => {
		Event.once(element.onDidChangeEditorAttachState)(() => element.editorAttached ? resolve() : reject());
	});
}

function isContextMenuFocused() {
	return !!DOM.findParentWithClass(<HTMLElement>document.activeElement, 'context-view');
}
