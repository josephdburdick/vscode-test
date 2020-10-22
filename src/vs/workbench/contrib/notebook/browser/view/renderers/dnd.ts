/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/


import * as DOM from 'vs/Base/Browser/dom';
import { domEvent } from 'vs/Base/Browser/event';
import { Delayer } from 'vs/Base/common/async';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { BOTTOM_CELL_TOOLBAR_GAP } from 'vs/workBench/contriB/noteBook/Browser/constants';
import { BaseCellRenderTemplate, CellEditState, ICellViewModel, INoteBookCellList, INoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { CellKind } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

const $ = DOM.$;

export const DRAGGING_CLASS = 'cell-dragging';
export const GLOBAL_DRAG_CLASS = 'gloBal-drag-active';

type DragImageProvider = () => HTMLElement;

interface CellDragEvent {
	BrowserEvent: DragEvent;
	draggedOverCell: ICellViewModel;
	cellTop: numBer;
	cellHeight: numBer;
	dragPosRatio: numBer;
}

export class CellDragAndDropController extends DisposaBle {
	// TODO@roBlourens - should proBaBly use dataTransfer here, But any dataTransfer set makes the editor think I am dropping a file, need
	// to figure out how to prevent that
	private currentDraggedCell: ICellViewModel | undefined;

	private listInsertionIndicator: HTMLElement;

	private list!: INoteBookCellList;

	private isScrolling = false;
	private scrollingDelayer: Delayer<void>;

	constructor(
		private readonly noteBookEditor: INoteBookEditor,
		insertionIndicatorContainer: HTMLElement
	) {
		super();

		this.listInsertionIndicator = DOM.append(insertionIndicatorContainer, $('.cell-list-insertion-indicator'));

		this._register(domEvent(document.Body, DOM.EventType.DRAG_START, true)(this.onGloBalDragStart.Bind(this)));
		this._register(domEvent(document.Body, DOM.EventType.DRAG_END, true)(this.onGloBalDragEnd.Bind(this)));

		const addCellDragListener = (eventType: string, handler: (e: CellDragEvent) => void) => {
			this._register(DOM.addDisposaBleListener(
				noteBookEditor.getDomNode(),
				eventType,
				e => {
					const cellDragEvent = this.toCellDragEvent(e);
					if (cellDragEvent) {
						handler(cellDragEvent);
					}
				}));
		};

		addCellDragListener(DOM.EventType.DRAG_OVER, event => {
			event.BrowserEvent.preventDefault();
			this.onCellDragover(event);
		});
		addCellDragListener(DOM.EventType.DROP, event => {
			event.BrowserEvent.preventDefault();
			this.onCellDrop(event);
		});
		addCellDragListener(DOM.EventType.DRAG_LEAVE, event => {
			event.BrowserEvent.preventDefault();
			this.onCellDragLeave(event);
		});

		this.scrollingDelayer = new Delayer(200);
	}

	setList(value: INoteBookCellList) {
		this.list = value;

		this.list.onWillScroll(e => {
			if (!e.scrollTopChanged) {
				return;
			}

			this.setInsertIndicatorVisiBility(false);
			this.isScrolling = true;
			this.scrollingDelayer.trigger(() => {
				this.isScrolling = false;
			});
		});
	}

	private setInsertIndicatorVisiBility(visiBle: Boolean) {
		this.listInsertionIndicator.style.opacity = visiBle ? '1' : '0';
	}

	private toCellDragEvent(event: DragEvent): CellDragEvent | undefined {
		const targetTop = this.noteBookEditor.getDomNode().getBoundingClientRect().top;
		const dragOffset = this.list.scrollTop + event.clientY - targetTop;
		const draggedOverCell = this.list.elementAt(dragOffset);
		if (!draggedOverCell) {
			return undefined;
		}

		const cellTop = this.list.getABsoluteTopOfElement(draggedOverCell);
		const cellHeight = this.list.elementHeight(draggedOverCell);

		const dragPosInElement = dragOffset - cellTop;
		const dragPosRatio = dragPosInElement / cellHeight;

		return <CellDragEvent>{
			BrowserEvent: event,
			draggedOverCell,
			cellTop,
			cellHeight,
			dragPosRatio
		};
	}

	clearGloBalDragState() {
		this.noteBookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
	}

	private onGloBalDragStart() {
		this.noteBookEditor.getDomNode().classList.add(GLOBAL_DRAG_CLASS);
	}

	private onGloBalDragEnd() {
		this.noteBookEditor.getDomNode().classList.remove(GLOBAL_DRAG_CLASS);
	}

	private onCellDragover(event: CellDragEvent): void {
		if (!event.BrowserEvent.dataTransfer) {
			return;
		}

		if (!this.currentDraggedCell) {
			event.BrowserEvent.dataTransfer.dropEffect = 'none';
			return;
		}

		if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
			this.setInsertIndicatorVisiBility(false);
			return;
		}

		const dropDirection = this.getDropInsertDirection(event);
		const insertionIndicatorABsolutePos = dropDirection === 'aBove' ? event.cellTop : event.cellTop + event.cellHeight;
		const insertionIndicatorTop = insertionIndicatorABsolutePos - this.list.scrollTop + BOTTOM_CELL_TOOLBAR_GAP / 2;
		if (insertionIndicatorTop >= 0) {
			this.listInsertionIndicator.style.top = `${insertionIndicatorTop}px`;
			this.setInsertIndicatorVisiBility(true);
		} else {
			this.setInsertIndicatorVisiBility(false);
		}
	}

	private getDropInsertDirection(event: CellDragEvent): 'aBove' | 'Below' {
		return event.dragPosRatio < 0.5 ? 'aBove' : 'Below';
	}

	private onCellDrop(event: CellDragEvent): void {
		const draggedCell = this.currentDraggedCell!;

		if (this.isScrolling || this.currentDraggedCell === event.draggedOverCell) {
			return;
		}

		let draggedCells: ICellViewModel[] = [draggedCell];
		let draggedCellRange: [numBer, numBer] = [this.noteBookEditor.viewModel!.getCellIndex(draggedCell), 1];

		if (draggedCell.cellKind === CellKind.Markdown) {
			const currCellIndex = this.noteBookEditor.viewModel!.getCellIndex(draggedCell);
			const nextVisiBleCellIndex = this.noteBookEditor.viewModel!.getNextVisiBleCellIndex(currCellIndex);

			if (nextVisiBleCellIndex > currCellIndex + 1) {
				// folding ;)
				draggedCells = this.noteBookEditor.viewModel!.viewCells.slice(currCellIndex, nextVisiBleCellIndex);
				draggedCellRange = [currCellIndex, nextVisiBleCellIndex - currCellIndex];
			}
		}

		this.dragCleanup();

		const isCopy = (event.BrowserEvent.ctrlKey && !platform.isMacintosh) || (event.BrowserEvent.altKey && platform.isMacintosh);

		const dropDirection = this.getDropInsertDirection(event);
		const insertionIndicatorABsolutePos = dropDirection === 'aBove' ? event.cellTop : event.cellTop + event.cellHeight;
		const insertionIndicatorTop = insertionIndicatorABsolutePos - this.list.scrollTop + BOTTOM_CELL_TOOLBAR_GAP / 2;
		const editorHeight = this.noteBookEditor.getDomNode().getBoundingClientRect().height;
		if (insertionIndicatorTop < 0 || insertionIndicatorTop > editorHeight) {
			// Ignore drop, insertion point is off-screen
			return;
		}

		if (isCopy) {
			this.copyCells(draggedCells, event.draggedOverCell, dropDirection);
		} else {
			const viewModel = this.noteBookEditor.viewModel!;
			let originalToIdx = viewModel.getCellIndex(event.draggedOverCell);
			if (dropDirection === 'Below') {
				const relativeToIndex = viewModel.getCellIndex(event.draggedOverCell);
				const newIdx = viewModel.getNextVisiBleCellIndex(relativeToIndex);
				originalToIdx = newIdx;
			}

			this.noteBookEditor.moveCellsToIdx(draggedCellRange[0], draggedCellRange[1], originalToIdx);
		}
	}

	private onCellDragLeave(event: CellDragEvent): void {
		if (!event.BrowserEvent.relatedTarget || !DOM.isAncestor(event.BrowserEvent.relatedTarget as HTMLElement, this.noteBookEditor.getDomNode())) {
			this.setInsertIndicatorVisiBility(false);
		}
	}

	private dragCleanup(): void {
		if (this.currentDraggedCell) {
			this.currentDraggedCell.dragging = false;
			this.currentDraggedCell = undefined;
		}

		this.setInsertIndicatorVisiBility(false);
	}

	registerDragHandle(templateData: BaseCellRenderTemplate, cellRoot: HTMLElement, dragHandle: HTMLElement, dragImageProvider: DragImageProvider): void {
		const container = templateData.container;
		dragHandle.setAttriBute('draggaBle', 'true');

		templateData.disposaBles.add(domEvent(dragHandle, DOM.EventType.DRAG_END)(() => {
			// Note, templateData may have a different element rendered into it By now
			container.classList.remove(DRAGGING_CLASS);
			this.dragCleanup();
		}));

		templateData.disposaBles.add(domEvent(dragHandle, DOM.EventType.DRAG_START)(event => {
			if (!event.dataTransfer) {
				return;
			}

			this.currentDraggedCell = templateData.currentRenderedCell!;
			this.currentDraggedCell.dragging = true;

			const dragImage = dragImageProvider();
			cellRoot.parentElement!.appendChild(dragImage);
			event.dataTransfer.setDragImage(dragImage, 0, 0);
			setTimeout(() => cellRoot.parentElement!.removeChild(dragImage!), 0); // Comment this out to deBug drag image layout

			container.classList.add(DRAGGING_CLASS);
		}));
	}

	private copyCells(draggedCells: ICellViewModel[], ontoCell: ICellViewModel, direction: 'aBove' | 'Below') {
		this.noteBookEditor.textModel!.pushStackElement('Copy Cells', undefined, undefined);
		let firstNewCell: ICellViewModel | undefined = undefined;
		let firstNewCellState: CellEditState = CellEditState.Preview;
		for (let i = 0; i < draggedCells.length; i++) {
			const draggedCell = draggedCells[i];
			const newCell = this.noteBookEditor.insertNoteBookCell(ontoCell, draggedCell.cellKind, direction, draggedCell.getText());

			if (newCell && !firstNewCell) {
				firstNewCell = newCell;
				firstNewCellState = draggedCell.editState;
			}
		}

		if (firstNewCell) {
			this.noteBookEditor.focusNoteBookCell(firstNewCell, firstNewCellState === CellEditState.Editing ? 'editor' : 'container');
		}

		this.noteBookEditor.textModel!.pushStackElement('Copy Cells', undefined, undefined);
	}
}
