/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


import * As DOM from 'vs/bAse/browser/dom';
import { domEvent } from 'vs/bAse/browser/event';
import { DelAyer } from 'vs/bAse/common/Async';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { BOTTOM_CELL_TOOLBAR_GAP } from 'vs/workbench/contrib/notebook/browser/constAnts';
import { BAseCellRenderTemplAte, CellEditStAte, ICellViewModel, INotebookCellList, INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { CellKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';

const $ = DOM.$;

export const DRAGGING_CLASS = 'cell-drAgging';
export const GLOBAL_DRAG_CLASS = 'globAl-drAg-Active';

type DrAgImAgeProvider = () => HTMLElement;

interfAce CellDrAgEvent {
	browserEvent: DrAgEvent;
	drAggedOverCell: ICellViewModel;
	cellTop: number;
	cellHeight: number;
	drAgPosRAtio: number;
}

export clAss CellDrAgAndDropController extends DisposAble {
	// TODO@roblourens - should probAbly use dAtATrAnsfer here, but Any dAtATrAnsfer set mAkes the editor think I Am dropping A file, need
	// to figure out how to prevent thAt
	privAte currentDrAggedCell: ICellViewModel | undefined;

	privAte listInsertionIndicAtor: HTMLElement;

	privAte list!: INotebookCellList;

	privAte isScrolling = fAlse;
	privAte scrollingDelAyer: DelAyer<void>;

	constructor(
		privAte reAdonly notebookEditor: INotebookEditor,
		insertionIndicAtorContAiner: HTMLElement
	) {
		super();

		this.listInsertionIndicAtor = DOM.Append(insertionIndicAtorContAiner, $('.cell-list-insertion-indicAtor'));

		this._register(domEvent(document.body, DOM.EventType.DRAG_START, true)(this.onGlobAlDrAgStArt.bind(this)));
		this._register(domEvent(document.body, DOM.EventType.DRAG_END, true)(this.onGlobAlDrAgEnd.bind(this)));

		const AddCellDrAgListener = (eventType: string, hAndler: (e: CellDrAgEvent) => void) => {
			this._register(DOM.AddDisposAbleListener(
				notebookEditor.getDomNode(),
				eventType,
				e => {
					const cellDrAgEvent = this.toCellDrAgEvent(e);
					if (cellDrAgEvent) {
						hAndler(cellDrAgEvent);
					}
				}));
		};

		AddCellDrAgListener(DOM.EventType.DRAG_OVER, event => {
			event.browserEvent.preventDefAult();
			this.onCellDrAgover(event);
		});
		AddCellDrAgListener(DOM.EventType.DROP, event => {
			event.browserEvent.preventDefAult();
			this.onCellDrop(event);
		});
		AddCellDrAgListener(DOM.EventType.DRAG_LEAVE, event => {
			event.browserEvent.preventDefAult();
			this.onCellDrAgLeAve(event);
		});

		this.scrollingDelAyer = new DelAyer(200);
	}

	setList(vAlue: INotebookCellList) {
		this.list = vAlue;

		this.list.onWillScroll(e => {
			if (!e.scrollTopChAnged) {
				return;
			}

			this.setInsertIndicAtorVisibility(fAlse);
			this.isScrolling = true;
			this.scrollingDelAyer.trigger(() => {
				this.isScrolling = fAlse;
			});
		});
	}

	privAte setInsertIndicAtorVisibility(visible: booleAn) {
		this.listInsertionIndicAtor.style.opAcity = visible ? '1' : '0';
	}

	privAte toCellDrAgEvent(event: DrAgEvent): CellDrAgEvent | undefined {
		const tArgetTop = this.notebookEditor.getDomNode().getBoundingClientRect().top;
		const drAgOffset = this.list.scrollTop + event.clientY - tArgetTop;
		const drAggedOverCell = this.list.elementAt(drAgOffset);
		if (!drAggedOverCell) {
			return undefined;
		}

		const cellTop = this.list.getAbsoluteTopOfElement(drAggedOverCell);
		const cellHeight = this.list.elementHeight(drAggedOverCell);

		const drAgPosInElement = drAgOffset - cellTop;
		const drAgPosRAtio = drAgPosInElement / cellHeight;

		return <CellDrAgEvent>{
			browserEvent: event,
			drAggedOverCell,
			cellTop,
			cellHeight,
			drAgPosRAtio
		};
	}

	cleArGlobAlDrAgStAte() {
		this.notebookEditor.getDomNode().clAssList.remove(GLOBAL_DRAG_CLASS);
	}

	privAte onGlobAlDrAgStArt() {
		this.notebookEditor.getDomNode().clAssList.Add(GLOBAL_DRAG_CLASS);
	}

	privAte onGlobAlDrAgEnd() {
		this.notebookEditor.getDomNode().clAssList.remove(GLOBAL_DRAG_CLASS);
	}

	privAte onCellDrAgover(event: CellDrAgEvent): void {
		if (!event.browserEvent.dAtATrAnsfer) {
			return;
		}

		if (!this.currentDrAggedCell) {
			event.browserEvent.dAtATrAnsfer.dropEffect = 'none';
			return;
		}

		if (this.isScrolling || this.currentDrAggedCell === event.drAggedOverCell) {
			this.setInsertIndicAtorVisibility(fAlse);
			return;
		}

		const dropDirection = this.getDropInsertDirection(event);
		const insertionIndicAtorAbsolutePos = dropDirection === 'Above' ? event.cellTop : event.cellTop + event.cellHeight;
		const insertionIndicAtorTop = insertionIndicAtorAbsolutePos - this.list.scrollTop + BOTTOM_CELL_TOOLBAR_GAP / 2;
		if (insertionIndicAtorTop >= 0) {
			this.listInsertionIndicAtor.style.top = `${insertionIndicAtorTop}px`;
			this.setInsertIndicAtorVisibility(true);
		} else {
			this.setInsertIndicAtorVisibility(fAlse);
		}
	}

	privAte getDropInsertDirection(event: CellDrAgEvent): 'Above' | 'below' {
		return event.drAgPosRAtio < 0.5 ? 'Above' : 'below';
	}

	privAte onCellDrop(event: CellDrAgEvent): void {
		const drAggedCell = this.currentDrAggedCell!;

		if (this.isScrolling || this.currentDrAggedCell === event.drAggedOverCell) {
			return;
		}

		let drAggedCells: ICellViewModel[] = [drAggedCell];
		let drAggedCellRAnge: [number, number] = [this.notebookEditor.viewModel!.getCellIndex(drAggedCell), 1];

		if (drAggedCell.cellKind === CellKind.MArkdown) {
			const currCellIndex = this.notebookEditor.viewModel!.getCellIndex(drAggedCell);
			const nextVisibleCellIndex = this.notebookEditor.viewModel!.getNextVisibleCellIndex(currCellIndex);

			if (nextVisibleCellIndex > currCellIndex + 1) {
				// folding ;)
				drAggedCells = this.notebookEditor.viewModel!.viewCells.slice(currCellIndex, nextVisibleCellIndex);
				drAggedCellRAnge = [currCellIndex, nextVisibleCellIndex - currCellIndex];
			}
		}

		this.drAgCleAnup();

		const isCopy = (event.browserEvent.ctrlKey && !plAtform.isMAcintosh) || (event.browserEvent.AltKey && plAtform.isMAcintosh);

		const dropDirection = this.getDropInsertDirection(event);
		const insertionIndicAtorAbsolutePos = dropDirection === 'Above' ? event.cellTop : event.cellTop + event.cellHeight;
		const insertionIndicAtorTop = insertionIndicAtorAbsolutePos - this.list.scrollTop + BOTTOM_CELL_TOOLBAR_GAP / 2;
		const editorHeight = this.notebookEditor.getDomNode().getBoundingClientRect().height;
		if (insertionIndicAtorTop < 0 || insertionIndicAtorTop > editorHeight) {
			// Ignore drop, insertion point is off-screen
			return;
		}

		if (isCopy) {
			this.copyCells(drAggedCells, event.drAggedOverCell, dropDirection);
		} else {
			const viewModel = this.notebookEditor.viewModel!;
			let originAlToIdx = viewModel.getCellIndex(event.drAggedOverCell);
			if (dropDirection === 'below') {
				const relAtiveToIndex = viewModel.getCellIndex(event.drAggedOverCell);
				const newIdx = viewModel.getNextVisibleCellIndex(relAtiveToIndex);
				originAlToIdx = newIdx;
			}

			this.notebookEditor.moveCellsToIdx(drAggedCellRAnge[0], drAggedCellRAnge[1], originAlToIdx);
		}
	}

	privAte onCellDrAgLeAve(event: CellDrAgEvent): void {
		if (!event.browserEvent.relAtedTArget || !DOM.isAncestor(event.browserEvent.relAtedTArget As HTMLElement, this.notebookEditor.getDomNode())) {
			this.setInsertIndicAtorVisibility(fAlse);
		}
	}

	privAte drAgCleAnup(): void {
		if (this.currentDrAggedCell) {
			this.currentDrAggedCell.drAgging = fAlse;
			this.currentDrAggedCell = undefined;
		}

		this.setInsertIndicAtorVisibility(fAlse);
	}

	registerDrAgHAndle(templAteDAtA: BAseCellRenderTemplAte, cellRoot: HTMLElement, drAgHAndle: HTMLElement, drAgImAgeProvider: DrAgImAgeProvider): void {
		const contAiner = templAteDAtA.contAiner;
		drAgHAndle.setAttribute('drAggAble', 'true');

		templAteDAtA.disposAbles.Add(domEvent(drAgHAndle, DOM.EventType.DRAG_END)(() => {
			// Note, templAteDAtA mAy hAve A different element rendered into it by now
			contAiner.clAssList.remove(DRAGGING_CLASS);
			this.drAgCleAnup();
		}));

		templAteDAtA.disposAbles.Add(domEvent(drAgHAndle, DOM.EventType.DRAG_START)(event => {
			if (!event.dAtATrAnsfer) {
				return;
			}

			this.currentDrAggedCell = templAteDAtA.currentRenderedCell!;
			this.currentDrAggedCell.drAgging = true;

			const drAgImAge = drAgImAgeProvider();
			cellRoot.pArentElement!.AppendChild(drAgImAge);
			event.dAtATrAnsfer.setDrAgImAge(drAgImAge, 0, 0);
			setTimeout(() => cellRoot.pArentElement!.removeChild(drAgImAge!), 0); // Comment this out to debug drAg imAge lAyout

			contAiner.clAssList.Add(DRAGGING_CLASS);
		}));
	}

	privAte copyCells(drAggedCells: ICellViewModel[], ontoCell: ICellViewModel, direction: 'Above' | 'below') {
		this.notebookEditor.textModel!.pushStAckElement('Copy Cells', undefined, undefined);
		let firstNewCell: ICellViewModel | undefined = undefined;
		let firstNewCellStAte: CellEditStAte = CellEditStAte.Preview;
		for (let i = 0; i < drAggedCells.length; i++) {
			const drAggedCell = drAggedCells[i];
			const newCell = this.notebookEditor.insertNotebookCell(ontoCell, drAggedCell.cellKind, direction, drAggedCell.getText());

			if (newCell && !firstNewCell) {
				firstNewCell = newCell;
				firstNewCellStAte = drAggedCell.editStAte;
			}
		}

		if (firstNewCell) {
			this.notebookEditor.focusNotebookCell(firstNewCell, firstNewCellStAte === CellEditStAte.Editing ? 'editor' : 'contAiner');
		}

		this.notebookEditor.textModel!.pushStAckElement('Copy Cells', undefined, undefined);
	}
}
