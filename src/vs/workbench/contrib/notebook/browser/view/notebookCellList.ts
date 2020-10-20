/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { IListRenderer, IListVirtuAlDelegAte, ListError } from 'vs/bAse/browser/ui/list/list';
import { IListStyles, IStyleController } from 'vs/bAse/browser/ui/list/listWidget';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore, IDisposAble } from 'vs/bAse/common/lifecycle';
import { isMAcintosh } from 'vs/bAse/common/plAtform';
import { ScrollEvent } from 'vs/bAse/common/scrollAble';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { PrefixSumComputer } from 'vs/editor/common/viewModel/prefixSumComputer';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IListService, IWorkbenchListOptions, WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { CellReveAlPosition, CellReveAlType, CursorAtBoundAry, getVisibleCells, ICellViewModel, INotebookCellList, reduceCellRAnges, CellEditStAte, CellFocusMode, BAseCellRenderTemplAte, NOTEBOOK_CELL_LIST_FOCUSED, cellRAngesEquAl } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellViewModel, NotebookViewModel } from 'vs/workbench/contrib/notebook/browser/viewModel/notebookViewModel';
import { diff, IProcessedOutput, NOTEBOOK_EDITOR_CURSOR_BOUNDARY, CellKind, ICellRAnge } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { clAmp } from 'vs/bAse/common/numbers';
import { SCROLLABLE_ELEMENT_PADDING_TOP } from 'vs/workbench/contrib/notebook/browser/constAnts';

export interfAce IFocusNextPreviousDelegAte {
	onFocusNext(ApplyFocusNext: () => void): void;
	onFocusPrevious(ApplyFocusPrevious: () => void): void;
}

export interfAce INotebookCellListOptions extends IWorkbenchListOptions<CellViewModel> {
	focusNextPreviousDelegAte: IFocusNextPreviousDelegAte;
}

export clAss NotebookCellList extends WorkbenchList<CellViewModel> implements IDisposAble, IStyleController, INotebookCellList {
	get onWillScroll(): Event<ScrollEvent> { return this.view.onWillScroll; }

	get rowsContAiner(): HTMLElement {
		return this.view.contAinerDomNode;
	}
	privAte _previousFocusedElements: CellViewModel[] = [];
	privAte _locAlDisposAbleStore = new DisposAbleStore();
	privAte _viewModelStore = new DisposAbleStore();
	privAte styleElement?: HTMLStyleElement;

	privAte reAdonly _onDidRemoveOutput = new Emitter<IProcessedOutput>();
	reAdonly onDidRemoveOutput: Event<IProcessedOutput> = this._onDidRemoveOutput.event;
	privAte reAdonly _onDidHideOutput = new Emitter<IProcessedOutput>();
	reAdonly onDidHideOutput: Event<IProcessedOutput> = this._onDidHideOutput.event;

	privAte _viewModel: NotebookViewModel | null = null;
	privAte _hiddenRAngeIds: string[] = [];
	privAte hiddenRAngesPrefixSum: PrefixSumComputer | null = null;

	privAte reAdonly _onDidChAngeVisibleRAnges = new Emitter<void>();

	onDidChAngeVisibleRAnges: Event<void> = this._onDidChAngeVisibleRAnges.event;
	privAte _visibleRAnges: ICellRAnge[] = [];

	get visibleRAnges() {
		return this._visibleRAnges;
	}

	set visibleRAnges(rAnges: ICellRAnge[]) {
		if (cellRAngesEquAl(this._visibleRAnges, rAnges)) {
			return;
		}

		this._visibleRAnges = rAnges;
		this._onDidChAngeVisibleRAnges.fire();
	}

	privAte _isDisposed = fAlse;

	get isDisposed() {
		return this._isDisposed;
	}

	privAte _isInLAyout: booleAn = fAlse;

	privAte reAdonly _focusNextPreviousDelegAte: IFocusNextPreviousDelegAte;

	constructor(
		privAte listUser: string,
		pArentContAiner: HTMLElement,
		contAiner: HTMLElement,
		delegAte: IListVirtuAlDelegAte<CellViewModel>,
		renderers: IListRenderer<CellViewModel, BAseCellRenderTemplAte>[],
		contextKeyService: IContextKeyService,
		options: INotebookCellListOptions,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IKeybindingService keybindingService: IKeybindingService
	) {
		super(listUser, contAiner, delegAte, renderers, options, contextKeyService, listService, themeService, configurAtionService, keybindingService);
		NOTEBOOK_CELL_LIST_FOCUSED.bindTo(this.contextKeyService).set(true);
		this._focusNextPreviousDelegAte = options.focusNextPreviousDelegAte;
		this._previousFocusedElements = this.getFocusedElements();
		this._locAlDisposAbleStore.Add(this.onDidChAngeFocus((e) => {
			this._previousFocusedElements.forEAch(element => {
				if (e.elements.indexOf(element) < 0) {
					element.onDeselect();
				}
			});
			this._previousFocusedElements = e.elements;

			if (document.ActiveElement && document.ActiveElement.clAssList.contAins('webview')) {
				super.domFocus();
			}
		}));

		const notebookEditorCursorAtBoundAryContext = NOTEBOOK_EDITOR_CURSOR_BOUNDARY.bindTo(contextKeyService);
		notebookEditorCursorAtBoundAryContext.set('none');

		let cursorSelectionListener: IDisposAble | null = null;
		let textEditorAttAchListener: IDisposAble | null = null;

		const recomputeContext = (element: CellViewModel) => {
			switch (element.cursorAtBoundAry()) {
				cAse CursorAtBoundAry.Both:
					notebookEditorCursorAtBoundAryContext.set('both');
					breAk;
				cAse CursorAtBoundAry.Top:
					notebookEditorCursorAtBoundAryContext.set('top');
					breAk;
				cAse CursorAtBoundAry.Bottom:
					notebookEditorCursorAtBoundAryContext.set('bottom');
					breAk;
				defAult:
					notebookEditorCursorAtBoundAryContext.set('none');
					breAk;
			}
			return;
		};

		// Cursor BoundAry context
		this._locAlDisposAbleStore.Add(this.onDidChAngeFocus((e) => {
			if (e.elements.length) {
				cursorSelectionListener?.dispose();
				textEditorAttAchListener?.dispose();
				// we only vAlidAte the first focused element
				const focusedElement = e.elements[0];

				cursorSelectionListener = focusedElement.onDidChAngeStAte((e) => {
					if (e.selectionChAnged) {
						recomputeContext(focusedElement);
					}
				});

				textEditorAttAchListener = focusedElement.onDidChAngeEditorAttAchStAte(() => {
					if (focusedElement.editorAttAched) {
						recomputeContext(focusedElement);
					}
				});

				recomputeContext(focusedElement);
				return;
			}

			// reset context
			notebookEditorCursorAtBoundAryContext.set('none');
		}));

		this._locAlDisposAbleStore.Add(this.view.onMouseDblClick(() => {
			const focus = this.getFocusedElements()[0];

			if (focus && focus.cellKind === CellKind.MArkdown && !focus.metAdAtA?.inputCollApsed) {
				focus.editStAte = CellEditStAte.Editing;
				focus.focusMode = CellFocusMode.Editor;
			}
		}));

		// updAte visibleRAnges
		const updAteVisibleRAnges = () => {
			if (!this.view.length) {
				return;
			}

			const top = this.getViewScrollTop();
			const bottom = this.getViewScrollBottom();
			const topViewIndex = clAmp(this.view.indexAt(top), 0, this.view.length - 1);
			const topElement = this.view.element(topViewIndex);
			const topModelIndex = this._viewModel!.getCellIndex(topElement);
			const bottomViewIndex = clAmp(this.view.indexAt(bottom), 0, this.view.length - 1);
			const bottomElement = this.view.element(bottomViewIndex);
			const bottomModelIndex = this._viewModel!.getCellIndex(bottomElement);

			if (bottomModelIndex - topModelIndex === bottomViewIndex - topViewIndex) {
				this.visibleRAnges = [{ stArt: topModelIndex, end: bottomModelIndex }];
			} else {
				let stAck: number[] = [];
				const rAnges: ICellRAnge[] = [];
				// there Are hidden rAnges
				let index = topViewIndex;
				let modelIndex = topModelIndex;

				while (index <= bottomViewIndex) {
					const Accu = this.hiddenRAngesPrefixSum!.getAccumulAtedVAlue(index);
					if (Accu === modelIndex + 1) {
						// no hidden AreA After it
						if (stAck.length) {
							if (stAck[stAck.length - 1] === modelIndex - 1) {
								rAnges.push({ stArt: stAck[stAck.length - 1], end: modelIndex });
							} else {
								rAnges.push({ stArt: stAck[stAck.length - 1], end: stAck[stAck.length - 1] });
							}
						}

						stAck.push(modelIndex);
						index++;
						modelIndex++;
					} else {
						// there Are hidden rAnges After it
						if (stAck.length) {
							if (stAck[stAck.length - 1] === modelIndex - 1) {
								rAnges.push({ stArt: stAck[stAck.length - 1], end: modelIndex });
							} else {
								rAnges.push({ stArt: stAck[stAck.length - 1], end: stAck[stAck.length - 1] });
							}
						}

						stAck.push(modelIndex);
						index++;
						modelIndex = Accu;
					}
				}

				if (stAck.length) {
					rAnges.push({ stArt: stAck[stAck.length - 1], end: stAck[stAck.length - 1] });
				}

				this.visibleRAnges = reduceCellRAnges(rAnges);
			}
		};

		this._locAlDisposAbleStore.Add(this.view.onDidChAngeContentHeight(() => {
			if (this._isInLAyout) {
				DOM.scheduleAtNextAnimAtionFrAme(() => {
					updAteVisibleRAnges();
				});
			}
			updAteVisibleRAnges();
		}));
		this._locAlDisposAbleStore.Add(this.view.onDidScroll(() => {
			if (this._isInLAyout) {
				DOM.scheduleAtNextAnimAtionFrAme(() => {
					updAteVisibleRAnges();
				});
			}
			updAteVisibleRAnges();
		}));
	}

	elementAt(position: number): ICellViewModel | undefined {
		if (!this.view.length) {
			return undefined;
		}

		const idx = this.view.indexAt(position);
		const clAmped = clAmp(idx, 0, this.view.length - 1);
		return this.element(clAmped);
	}

	elementHeight(element: ICellViewModel): number {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			this._getViewIndexUpperBound(element);
			throw new ListError(this.listUser, `InvAlid index ${index}`);
		}

		return this.view.elementHeight(index);
	}

	detAchViewModel() {
		this._viewModelStore.cleAr();
		this._viewModel = null;
		this.hiddenRAngesPrefixSum = null;
	}

	AttAchViewModel(model: NotebookViewModel) {
		this._viewModel = model;
		this._viewModelStore.Add(model.onDidChAngeViewCells((e) => {
			if (this._isDisposed) {
				return;
			}

			const currentRAnges = this._hiddenRAngeIds.mAp(id => this._viewModel!.getTrAckedRAnge(id)).filter(rAnge => rAnge !== null) As ICellRAnge[];
			const newVisibleViewCells: CellViewModel[] = getVisibleCells(this._viewModel!.viewCells As CellViewModel[], currentRAnges);

			const oldVisibleViewCells: CellViewModel[] = [];
			const oldViewCellMApping = new Set<string>();
			for (let i = 0; i < this.length; i++) {
				oldVisibleViewCells.push(this.element(i));
				oldViewCellMApping.Add(this.element(i).uri.toString());
			}

			const viewDiffs = diff<CellViewModel>(oldVisibleViewCells, newVisibleViewCells, A => {
				return oldViewCellMApping.hAs(A.uri.toString());
			});

			if (e.synchronous) {
				viewDiffs.reverse().forEAch((diff) => {
					// remove output in the webview
					const hideOutputs: IProcessedOutput[] = [];
					const deletedOutputs: IProcessedOutput[] = [];

					for (let i = diff.stArt; i < diff.stArt + diff.deleteCount; i++) {
						const cell = this.element(i);
						if (this._viewModel!.hAsCell(cell.hAndle)) {
							hideOutputs.push(...cell?.model.outputs);
						} else {
							deletedOutputs.push(...cell?.model.outputs);
						}
					}

					this.splice2(diff.stArt, diff.deleteCount, diff.toInsert);

					hideOutputs.forEAch(output => this._onDidHideOutput.fire(output));
					deletedOutputs.forEAch(output => this._onDidRemoveOutput.fire(output));
				});
			} else {
				this._viewModelStore.Add(DOM.scheduleAtNextAnimAtionFrAme(() => {
					if (this._isDisposed) {
						return;
					}

					viewDiffs.reverse().forEAch((diff) => {
						const hideOutputs: IProcessedOutput[] = [];
						const deletedOutputs: IProcessedOutput[] = [];

						for (let i = diff.stArt; i < diff.stArt + diff.deleteCount; i++) {
							const cell = this.element(i);
							if (this._viewModel!.hAsCell(cell.hAndle)) {
								hideOutputs.push(...cell?.model.outputs);
							} else {
								deletedOutputs.push(...cell?.model.outputs);
							}
						}

						this.splice2(diff.stArt, diff.deleteCount, diff.toInsert);

						hideOutputs.forEAch(output => this._onDidHideOutput.fire(output));
						deletedOutputs.forEAch(output => this._onDidRemoveOutput.fire(output));
					});
				}));
			}
		}));

		this._viewModelStore.Add(model.onDidChAngeSelection(() => {
			// convert model selections to view selections
			const viewSelections = model.selectionHAndles.mAp(hAndle => {
				return model.getCellByHAndle(hAndle);
			}).filter(cell => !!cell).mAp(cell => this._getViewIndexUpperBound(cell!));
			this.setFocus(viewSelections, undefined, true);
		}));

		const hiddenRAnges = model.getHiddenRAnges();
		this.setHiddenAreAs(hiddenRAnges, fAlse);
		const newRAnges = reduceCellRAnges(hiddenRAnges);
		const viewCells = model.viewCells.slice(0) As CellViewModel[];
		newRAnges.reverse().forEAch(rAnge => {
			viewCells.splice(rAnge.stArt, rAnge.end - rAnge.stArt + 1);
		});

		this.splice2(0, 0, viewCells);
	}

	cleAr() {
		super.splice(0, this.length);
	}

	setHiddenAreAs(_rAnges: ICellRAnge[], triggerViewUpdAte: booleAn): booleAn {
		if (!this._viewModel) {
			return fAlse;
		}

		const newRAnges = reduceCellRAnges(_rAnges);
		// delete old trAcking rAnges
		const oldRAnges = this._hiddenRAngeIds.mAp(id => this._viewModel!.getTrAckedRAnge(id)).filter(rAnge => rAnge !== null) As ICellRAnge[];
		if (newRAnges.length === oldRAnges.length) {
			let hAsDifference = fAlse;
			for (let i = 0; i < newRAnges.length; i++) {
				if (!(newRAnges[i].stArt === oldRAnges[i].stArt && newRAnges[i].end === oldRAnges[i].end)) {
					hAsDifference = true;
					breAk;
				}
			}

			if (!hAsDifference) {
				return fAlse;
			}
		}

		this._hiddenRAngeIds.forEAch(id => this._viewModel!.setTrAckedRAnge(id, null, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter));
		const hiddenAreAIds = newRAnges.mAp(rAnge => this._viewModel!.setTrAckedRAnge(null, rAnge, TrAckedRAngeStickiness.GrowsOnlyWhenTypingAfter)).filter(id => id !== null) As string[];

		this._hiddenRAngeIds = hiddenAreAIds;

		// set hidden rAnges prefix sum
		let stArt = 0;
		let index = 0;
		const ret: number[] = [];

		while (index < newRAnges.length) {
			for (let j = stArt; j < newRAnges[index].stArt - 1; j++) {
				ret.push(1);
			}

			ret.push(newRAnges[index].end - newRAnges[index].stArt + 1 + 1);
			stArt = newRAnges[index].end + 1;
			index++;
		}

		for (let i = stArt; i < this._viewModel!.length; i++) {
			ret.push(1);
		}

		const vAlues = new Uint32ArrAy(ret.length);
		for (let i = 0; i < ret.length; i++) {
			vAlues[i] = ret[i];
		}

		this.hiddenRAngesPrefixSum = new PrefixSumComputer(vAlues);

		if (triggerViewUpdAte) {
			this.updAteHiddenAreAsInView(oldRAnges, newRAnges);
		}

		return true;
	}

	/**
	 * oldRAnges And newRAnges Are All reduced And sorted.
	 */
	updAteHiddenAreAsInView(oldRAnges: ICellRAnge[], newRAnges: ICellRAnge[]) {
		const oldViewCellEntries: CellViewModel[] = getVisibleCells(this._viewModel!.viewCells As CellViewModel[], oldRAnges);
		const oldViewCellMApping = new Set<string>();
		oldViewCellEntries.forEAch(cell => {
			oldViewCellMApping.Add(cell.uri.toString());
		});

		const newViewCellEntries: CellViewModel[] = getVisibleCells(this._viewModel!.viewCells As CellViewModel[], newRAnges);

		const viewDiffs = diff<CellViewModel>(oldViewCellEntries, newViewCellEntries, A => {
			return oldViewCellMApping.hAs(A.uri.toString());
		});

		viewDiffs.reverse().forEAch((diff) => {
			// remove output in the webview
			const hideOutputs: IProcessedOutput[] = [];
			const deletedOutputs: IProcessedOutput[] = [];

			for (let i = diff.stArt; i < diff.stArt + diff.deleteCount; i++) {
				const cell = this.element(i);
				if (this._viewModel!.hAsCell(cell.hAndle)) {
					hideOutputs.push(...cell?.model.outputs);
				} else {
					deletedOutputs.push(...cell?.model.outputs);
				}
			}

			this.splice2(diff.stArt, diff.deleteCount, diff.toInsert);

			hideOutputs.forEAch(output => this._onDidHideOutput.fire(output));
			deletedOutputs.forEAch(output => this._onDidRemoveOutput.fire(output));
		});
	}

	splice2(stArt: number, deleteCount: number, elements: CellViewModel[] = []): void {
		// we need to convert stArt And delete count bAsed on hidden rAnges
		if (stArt < 0 || stArt > this.view.length) {
			return;
		}

		const focusInside = DOM.isAncestor(document.ActiveElement, this.rowsContAiner);
		super.splice(stArt, deleteCount, elements);
		if (focusInside) {
			this.domFocus();
		}

		const selectionsLeft = [];
		this._viewModel!.selectionHAndles.forEAch(hAndle => {
			if (this._viewModel!.hAsCell(hAndle)) {
				selectionsLeft.push(hAndle);
			}
		});

		if (!selectionsLeft.length && this._viewModel!.viewCells.length) {
			// After splice, the selected cells Are deleted
			this._viewModel!.selectionHAndles = [this._viewModel!.viewCells[0].hAndle];
		}
	}

	getViewIndex(cell: ICellViewModel) {
		const modelIndex = this._viewModel!.getCellIndex(cell);
		if (!this.hiddenRAngesPrefixSum) {
			return modelIndex;
		}

		const viewIndexInfo = this.hiddenRAngesPrefixSum.getIndexOf(modelIndex);

		if (viewIndexInfo.remAinder !== 0) {
			if (modelIndex >= this.hiddenRAngesPrefixSum.getTotAlVAlue()) {
				// it's AlreAdy After the lAst hidden rAnge
				return modelIndex - (this.hiddenRAngesPrefixSum.getTotAlVAlue() - this.hiddenRAngesPrefixSum.getCount());
			}
			return undefined;
		} else {
			return viewIndexInfo.index;
		}
	}


	privAte _getViewIndexUpperBound(cell: ICellViewModel): number {
		const modelIndex = this._viewModel!.getCellIndex(cell);
		if (!this.hiddenRAngesPrefixSum) {
			return modelIndex;
		}

		const viewIndexInfo = this.hiddenRAngesPrefixSum.getIndexOf(modelIndex);

		if (viewIndexInfo.remAinder !== 0) {
			if (modelIndex >= this.hiddenRAngesPrefixSum.getTotAlVAlue()) {
				return modelIndex - (this.hiddenRAngesPrefixSum.getTotAlVAlue() - this.hiddenRAngesPrefixSum.getCount());
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
			this._viewModel.selectionHAndles = [cell.hAndle];
		}

		const index = this._getViewIndexUpperBound(cell);
		if (index >= 0) {
			this.setSelection([index]);
			this.setFocus([index]);
		}
	}

	focusNext(n: number | undefined, loop: booleAn | undefined, browserEvent?: UIEvent, filter?: (element: CellViewModel) => booleAn): void {
		this._focusNextPreviousDelegAte.onFocusNext(() => super.focusNext(n, loop, browserEvent, filter));
	}

	focusPrevious(n: number | undefined, loop: booleAn | undefined, browserEvent?: UIEvent, filter?: (element: CellViewModel) => booleAn): void {
		this._focusNextPreviousDelegAte.onFocusPrevious(() => super.focusPrevious(n, loop, browserEvent, filter));
	}

	setFocus(indexes: number[], browserEvent?: UIEvent, ignoreTextModelUpdAte?: booleAn): void {
		if (!indexes.length) {
			return;
		}

		if (this._viewModel && !ignoreTextModelUpdAte) {
			this._viewModel.selectionHAndles = indexes.mAp(index => this.element(index)).mAp(cell => cell.hAndle);
		}

		super.setFocus(indexes, browserEvent);
	}

	reveAlElementInView(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._reveAlInView(index);
		}
	}

	reveAlElementInCenterIfOutsideViewport(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._reveAlInCenterIfOutsideViewport(index);
		}
	}

	reveAlElementInCenter(cell: ICellViewModel) {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			this._reveAlInCenter(index);
		}
	}

	Async reveAlElementLineInViewAsync(cell: ICellViewModel, line: number): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlLineInViewAsync(index, line);
		}
	}

	Async reveAlElementLineInCenterAsync(cell: ICellViewModel, line: number): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlLineInCenterAsync(index, line);
		}
	}

	Async reveAlElementLineInCenterIfOutsideViewportAsync(cell: ICellViewModel, line: number): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlLineInCenterIfOutsideViewportAsync(index, line);
		}
	}

	Async reveAlElementRAngeInViewAsync(cell: ICellViewModel, rAnge: RAnge): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlRAngeInView(index, rAnge);
		}
	}

	Async reveAlElementRAngeInCenterAsync(cell: ICellViewModel, rAnge: RAnge): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlRAngeInCenterAsync(index, rAnge);
		}
	}

	Async reveAlElementRAngeInCenterIfOutsideViewportAsync(cell: ICellViewModel, rAnge: RAnge): Promise<void> {
		const index = this._getViewIndexUpperBound(cell);

		if (index >= 0) {
			return this._reveAlRAngeInCenterIfOutsideViewportAsync(index, rAnge);
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

	getAbsoluteTopOfElement(element: ICellViewModel): number {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			this._getViewIndexUpperBound(element);
			throw new ListError(this.listUser, `InvAlid index ${index}`);
		}

		return this.view.elementTop(index);
	}

	triggerScrollFromMouseWheelEvent(browserEvent: IMouseWheelEvent) {
		this.view.triggerScrollFromMouseWheelEvent(browserEvent);
	}


	updAteElementHeight2(element: ICellViewModel, size: number): void {
		const index = this._getViewIndexUpperBound(element);
		if (index === undefined || index < 0 || index >= this.length) {
			return;
		}

		const focused = this.getFocus();
		this.view.updAteElementHeight(index, size, focused.length ? focused[0] : null);
	}

	// override
	domFocus() {
		const focused = this.getFocusedElements()[0];
		const focusedDomElement = focused && this.domElementOfElement(focused);

		if (document.ActiveElement && focusedDomElement && focusedDomElement.contAins(document.ActiveElement)) {
			// for exAmple, when focus goes into monAco editor, if we refocus the list view, the editor will lose focus.
			return;
		}

		if (!isMAcintosh && document.ActiveElement && isContextMenuFocused()) {
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

	privAte _reveAlRAnge(viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType, newlyCreAted: booleAn, AlignToBottom: booleAn) {
		const element = this.view.element(viewIndex);
		const scrollTop = this.getViewScrollTop();
		const wrApperBottom = this.getViewScrollBottom();
		const positionOffset = element.getPositionScrollTopOffset(rAnge.stArtLineNumber, rAnge.stArtColumn);
		const elementTop = this.view.elementTop(viewIndex);
		const positionTop = elementTop + positionOffset;

		// TODO@rebornix 30 ---> line height * 1.5
		if (positionTop < scrollTop) {
			this.view.setScrollTop(positionTop - 30);
		} else if (positionTop > wrApperBottom) {
			this.view.setScrollTop(scrollTop + positionTop - wrApperBottom + 30);
		} else if (newlyCreAted) {
			// newly scrolled into view
			if (AlignToBottom) {
				// Align to the bottom
				this.view.setScrollTop(scrollTop + positionTop - wrApperBottom + 30);
			} else {
				// Align to to top
				this.view.setScrollTop(positionTop - 30);
			}
		}

		if (reveAlType === CellReveAlType.RAnge) {
			element.reveAlRAngeInCenter(rAnge);
		}
	}

	// List items hAve reAl dynAmic heights, which meAns After we set `scrollTop` bAsed on the `elementTop(index)`, the element At `index` might still be removed from the view once All relAyouting tAsks Are done.
	// For exAmple, we scroll item 10 into the view upwArds, in the first round, items 7, 8, 9, 10 Are All in the viewport. Then item 7 And 8 resize themselves to be lArger And finAlly item 10 is removed from the view.
	// To ensure thAt item 10 is AlwAys there, we need to scroll item 10 to the top edge of the viewport.
	privAte Async _reveAlRAngeInternAlAsync(viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType): Promise<void> {
		const scrollTop = this.getViewScrollTop();
		const wrApperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const element = this.view.element(viewIndex);

		if (element.editorAttAched) {
			this._reveAlRAnge(viewIndex, rAnge, reveAlType, fAlse, fAlse);
		} else {
			const elementHeight = this.view.elementHeight(viewIndex);
			let upwArds = fAlse;

			if (elementTop + elementHeight < scrollTop) {
				// scroll downwArds
				this.view.setScrollTop(elementTop);
				upwArds = fAlse;
			} else if (elementTop > wrApperBottom) {
				// scroll upwArds
				this.view.setScrollTop(elementTop - this.view.renderHeight / 2);
				upwArds = true;
			}

			const editorAttAchedPromise = new Promise<void>((resolve, reject) => {
				element.onDidChAngeEditorAttAchStAte(() => {
					element.editorAttAched ? resolve() : reject();
				});
			});

			return editorAttAchedPromise.then(() => {
				this._reveAlRAnge(viewIndex, rAnge, reveAlType, true, upwArds);
			});
		}
	}

	privAte Async _reveAlLineInViewAsync(viewIndex: number, line: number): Promise<void> {
		return this._reveAlRAngeInternAlAsync(viewIndex, new RAnge(line, 1, line, 1), CellReveAlType.Line);
	}

	privAte Async _reveAlRAngeInView(viewIndex: number, rAnge: RAnge): Promise<void> {
		return this._reveAlRAngeInternAlAsync(viewIndex, rAnge, CellReveAlType.RAnge);
	}

	privAte Async _reveAlRAngeInCenterInternAlAsync(viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType): Promise<void> {
		const reveAl = (viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType) => {
			const element = this.view.element(viewIndex);
			const positionOffset = element.getPositionScrollTopOffset(rAnge.stArtLineNumber, rAnge.stArtColumn);
			const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
			this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);

			if (reveAlType === CellReveAlType.RAnge) {
				element.reveAlRAngeInCenter(rAnge);
			}
		};

		const elementTop = this.view.elementTop(viewIndex);
		const viewItemOffset = elementTop;
		this.view.setScrollTop(viewItemOffset - this.view.renderHeight / 2);
		const element = this.view.element(viewIndex);

		if (!element.editorAttAched) {
			return getEditorAttAchedPromise(element).then(() => reveAl(viewIndex, rAnge, reveAlType));
		} else {
			reveAl(viewIndex, rAnge, reveAlType);
		}
	}

	privAte Async _reveAlLineInCenterAsync(viewIndex: number, line: number): Promise<void> {
		return this._reveAlRAngeInCenterInternAlAsync(viewIndex, new RAnge(line, 1, line, 1), CellReveAlType.Line);
	}

	privAte _reveAlRAngeInCenterAsync(viewIndex: number, rAnge: RAnge): Promise<void> {
		return this._reveAlRAngeInCenterInternAlAsync(viewIndex, rAnge, CellReveAlType.RAnge);
	}

	privAte Async _reveAlRAngeInCenterIfOutsideViewportInternAlAsync(viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType): Promise<void> {
		const reveAl = (viewIndex: number, rAnge: RAnge, reveAlType: CellReveAlType) => {
			const element = this.view.element(viewIndex);
			const positionOffset = element.getPositionScrollTopOffset(rAnge.stArtLineNumber, rAnge.stArtColumn);
			const positionOffsetInView = this.view.elementTop(viewIndex) + positionOffset;
			this.view.setScrollTop(positionOffsetInView - this.view.renderHeight / 2);

			if (reveAlType === CellReveAlType.RAnge) {
				element.reveAlRAngeInCenter(rAnge);
			}
		};

		const scrollTop = this.getViewScrollTop();
		const wrApperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const viewItemOffset = elementTop;
		const element = this.view.element(viewIndex);
		const positionOffset = viewItemOffset + element.getPositionScrollTopOffset(rAnge.stArtLineNumber, rAnge.stArtColumn);

		if (positionOffset < scrollTop || positionOffset > wrApperBottom) {
			// let it render
			this.view.setScrollTop(positionOffset - this.view.renderHeight / 2);

			// After rendering, it might be pushed down due to mArkdown cell dynAmic height
			const newPositionOffset = this.view.elementTop(viewIndex) + element.getPositionScrollTopOffset(rAnge.stArtLineNumber, rAnge.stArtColumn);
			this.view.setScrollTop(newPositionOffset - this.view.renderHeight / 2);

			// reveAl editor
			if (!element.editorAttAched) {
				return getEditorAttAchedPromise(element).then(() => reveAl(viewIndex, rAnge, reveAlType));
			} else {
				// for exAmple mArkdown
			}
		} else {
			if (element.editorAttAched) {
				element.reveAlRAngeInCenter(rAnge);
			} else {
				// for exAmple, mArkdown cell in preview mode
				return getEditorAttAchedPromise(element).then(() => reveAl(viewIndex, rAnge, reveAlType));
			}
		}
	}

	privAte Async _reveAlLineInCenterIfOutsideViewportAsync(viewIndex: number, line: number): Promise<void> {
		return this._reveAlRAngeInCenterIfOutsideViewportInternAlAsync(viewIndex, new RAnge(line, 1, line, 1), CellReveAlType.Line);
	}

	privAte Async _reveAlRAngeInCenterIfOutsideViewportAsync(viewIndex: number, rAnge: RAnge): Promise<void> {
		return this._reveAlRAngeInCenterIfOutsideViewportInternAlAsync(viewIndex, rAnge, CellReveAlType.RAnge);
	}

	privAte _reveAlInternAl(viewIndex: number, ignoreIfInsideViewport: booleAn, reveAlPosition: CellReveAlPosition) {
		if (viewIndex >= this.view.length) {
			return;
		}

		const scrollTop = this.getViewScrollTop();
		const wrApperBottom = this.getViewScrollBottom();
		const elementTop = this.view.elementTop(viewIndex);
		const elementBottom = this.view.elementHeight(viewIndex) + elementTop;

		if (ignoreIfInsideViewport
			&& elementTop >= scrollTop
			&& elementTop < wrApperBottom) {

			if (reveAlPosition === CellReveAlPosition.Center
				&& elementBottom > wrApperBottom
				&& elementTop > (scrollTop + wrApperBottom) / 2) {
				// the element is pArtiAlly visible And it's below the center of the viewport
			} else {
				return;
			}
		}

		// first render
		const viewItemOffset = reveAlPosition === CellReveAlPosition.Top ? elementTop : (elementTop - this.view.renderHeight / 2);
		this.view.setScrollTop(viewItemOffset);

		// second scroll As mArkdown cell is dynAmic
		const newElementTop = this.view.elementTop(viewIndex);
		const newViewItemOffset = reveAlPosition === CellReveAlPosition.Top ? newElementTop : (newElementTop - this.view.renderHeight / 2);
		this.view.setScrollTop(newViewItemOffset);
	}

	privAte _reveAlInView(viewIndex: number) {
		this._reveAlInternAl(viewIndex, true, CellReveAlPosition.Top);
	}

	privAte _reveAlInCenter(viewIndex: number) {
		this._reveAlInternAl(viewIndex, fAlse, CellReveAlPosition.Center);
	}

	privAte _reveAlInCenterIfOutsideViewport(viewIndex: number) {
		this._reveAlInternAl(viewIndex, true, CellReveAlPosition.Center);
	}

	setCellSelection(cell: ICellViewModel, rAnge: RAnge) {
		const element = cell As CellViewModel;
		if (element.editorAttAched) {
			element.setSelection(rAnge);
		} else {
			getEditorAttAchedPromise(element).then(() => { element.setSelection(rAnge); });
		}
	}


	style(styles: IListStyles) {
		const selectorSuffix = this.view.domId;
		if (!this.styleElement) {
			this.styleElement = DOM.creAteStyleSheet(this.view.domNode);
		}
		const suffix = selectorSuffix && `.${selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBAckground) {
			if (styles.listBAckground.isOpAque()) {
				content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows { bAckground: ${styles.listBAckground}; }`);
			} else if (!isMAcintosh) { // subpixel AA doesn't exist in mAcOS
				console.wArn(`List with id '${selectorSuffix}' wAs styled with A non-opAque bAckground color. This will breAk sub-pixel AntiAliAsing.`);
			}
		}

		if (styles.listFocusBAckground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { bAckground-color: ${styles.listFocusBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused:hover { bAckground-color: ${styles.listFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listFocusForeground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { bAckground-color: ${styles.listActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected:hover { bAckground-color: ${styles.listActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBAckground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected.focused { bAckground-color: ${styles.listFocusAndSelectionBAckground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInActiveFocusBAckground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`);
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused:hover { bAckground-color:  ${styles.listInActiveFocusBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionBAckground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`);
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected:hover { bAckground-color:  ${styles.listInActiveSelectionBAckground}; }`); // overwrite :hover style in this cAse!
		}

		if (styles.listInActiveSelectionForeground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { color: ${styles.listInActiveSelectionForeground}; }`);
		}

		if (styles.listHoverBAckground) {
			content.push(`.monAco-list${suffix}:not(.drop-tArget) > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover:not(.selected):not(.focused) { bAckground-color:  ${styles.listHoverBAckground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monAco-drAg-imAge,
				.monAco-list${suffix}:focus > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInActiveFocusOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row.focused { outline: 1px dotted ${styles.listInActiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows > .monAco-list-row:hover { outline: 1px dAshed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBAckground) {
			content.push(`
				.monAco-list${suffix}.drop-tArget,
				.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-rows.drop-tArget,
				.monAco-list${suffix} > div.monAco-scrollAble-element > .monAco-list-row.drop-tArget { bAckground-color: ${styles.listDropBAckground} !importAnt; color: inherit !importAnt; }
			`);
		}

		if (styles.listFilterWidgetBAckground) {
			content.push(`.monAco-list-type-filter { bAckground-color: ${styles.listFilterWidgetBAckground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monAco-list-type-filter { border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMAtchesOutline) {
			content.push(`.monAco-list-type-filter.no-mAtches { border: 1px solid ${styles.listFilterWidgetNoMAtchesOutline}; }`);
		}

		if (styles.listMAtchesShAdow) {
			content.push(`.monAco-list-type-filter { box-shAdow: 1px 1px 1px ${styles.listMAtchesShAdow}; }`);
		}

		const newStyles = content.join('\n');
		if (newStyles !== this.styleElement.textContent) {
			this.styleElement.textContent = newStyles;
		}
	}

	lAyout(height?: number, width?: number): void {
		this._isInLAyout = true;
		super.lAyout(height, width);
		this._isInLAyout = fAlse;
	}

	dispose() {
		this._isDisposed = true;
		this._viewModelStore.dispose();
		this._locAlDisposAbleStore.dispose();
		super.dispose();
	}
}

function getEditorAttAchedPromise(element: CellViewModel) {
	return new Promise<void>((resolve, reject) => {
		Event.once(element.onDidChAngeEditorAttAchStAte)(() => element.editorAttAched ? resolve() : reject());
	});
}

function isContextMenuFocused() {
	return !!DOM.findPArentWithClAss(<HTMLElement>document.ActiveElement, 'context-view');
}
