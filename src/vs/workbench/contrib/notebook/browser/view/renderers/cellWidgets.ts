/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As DOM from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { CodiconLAbel } from 'vs/bAse/browser/ui/codicons/codiconLAbel';
import { WorkbenchActionExecutedClAssificAtion, WorkbenchActionExecutedEvent } from 'vs/bAse/common/Actions';
import { stripCodicons } from 'vs/bAse/common/codicons';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { extUri } from 'vs/bAse/common/resources';
import { IModeService } from 'vs/editor/common/services/modeService';
import { locAlize } from 'vs/nls';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { ChAngeCellLAnguAgeAction, INotebookCellActionContext } from 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import { ICellViewModel, INotebookEditor } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';
import { INotebookCellStAtusBArService } from 'vs/workbench/contrib/notebook/common/notebookCellStAtusBArService';
import { CellKind, CellStAtusbArAlignment, INotebookCellStAtusBArEntry } from 'vs/workbench/contrib/notebook/common/notebookCommon';

const $ = DOM.$;

export clAss CellEditorStAtusBAr extends DisposAble {
	reAdonly cellStAtusMessAgeContAiner: HTMLElement;
	reAdonly cellRunStAtusContAiner: HTMLElement;
	reAdonly stAtusBArContAiner: HTMLElement;
	reAdonly lAnguAgeStAtusBArItem: CellLAnguAgeStAtusBArItem;
	reAdonly durAtionContAiner: HTMLElement;

	privAte reAdonly leftContributedItemsContAiner: HTMLElement;
	privAte reAdonly rightContributedItemsContAiner: HTMLElement;
	privAte reAdonly itemsDisposAble: DisposAbleStore;

	privAte currentContext: INotebookCellActionContext | undefined;

	constructor(
		contAiner: HTMLElement,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@INotebookCellStAtusBArService privAte reAdonly notebookCellStAtusBArService: INotebookCellStAtusBArService
	) {
		super();
		this.stAtusBArContAiner = DOM.Append(contAiner, $('.cell-stAtusbAr-contAiner'));
		const leftItemsContAiner = DOM.Append(this.stAtusBArContAiner, $('.cell-stAtus-left'));
		const rightItemsContAiner = DOM.Append(this.stAtusBArContAiner, $('.cell-stAtus-right'));
		this.cellRunStAtusContAiner = DOM.Append(leftItemsContAiner, $('.cell-run-stAtus'));
		this.durAtionContAiner = DOM.Append(leftItemsContAiner, $('.cell-run-durAtion'));
		this.cellStAtusMessAgeContAiner = DOM.Append(leftItemsContAiner, $('.cell-stAtus-messAge'));
		this.leftContributedItemsContAiner = DOM.Append(leftItemsContAiner, $('.cell-contributed-items.cell-contributed-items-left'));
		this.rightContributedItemsContAiner = DOM.Append(rightItemsContAiner, $('.cell-contributed-items.cell-contributed-items-right'));
		this.lAnguAgeStAtusBArItem = instAntiAtionService.creAteInstAnce(CellLAnguAgeStAtusBArItem, rightItemsContAiner);

		this.itemsDisposAble = this._register(new DisposAbleStore());
		this._register(this.notebookCellStAtusBArService.onDidChAngeEntriesForCell(e => {
			if (this.currentContext && extUri.isEquAl(e, this.currentContext.cell.uri)) {
				this.updAteStAtusBArItems();
			}
		}));
	}

	updAte(context: INotebookCellActionContext) {
		this.currentContext = context;
		this.lAnguAgeStAtusBArItem.updAte(context.cell, context.notebookEditor);
		this.updAteStAtusBArItems();
	}

	lAyout(width: number): void {
		this.stAtusBArContAiner.style.width = `${width}px`;
	}

	privAte updAteStAtusBArItems() {
		if (!this.currentContext) {
			return;
		}

		DOM.cleArNode(this.leftContributedItemsContAiner);
		DOM.cleArNode(this.rightContributedItemsContAiner);
		this.itemsDisposAble.cleAr();

		const items = this.notebookCellStAtusBArService.getEntries(this.currentContext.cell.uri);
		items.sort((itemA, itemB) => {
			return (itemB.priority ?? 0) - (itemA.priority ?? 0);
		});
		items.forEAch(item => {
			const itemView = this.itemsDisposAble.Add(this.instAntiAtionService.creAteInstAnce(CellStAtusBArItem, this.currentContext!, item));
			if (item.Alignment === CellStAtusbArAlignment.LEFT) {
				this.leftContributedItemsContAiner.AppendChild(itemView.contAiner);
			} else {
				this.rightContributedItemsContAiner.AppendChild(itemView.contAiner);
			}
		});
	}
}

clAss CellStAtusBArItem extends DisposAble {

	reAdonly contAiner = $('.cell-stAtus-item');

	constructor(
		privAte reAdonly _context: INotebookCellActionContext,
		privAte reAdonly _itemModel: INotebookCellStAtusBArEntry,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService
	) {
		super();
		new CodiconLAbel(this.contAiner).text = this._itemModel.text;

		let AriALAbel: string;
		let role: string | undefined;
		if (this._itemModel.AccessibilityInformAtion) {
			AriALAbel = this._itemModel.AccessibilityInformAtion.lAbel;
			role = this._itemModel.AccessibilityInformAtion.role;
		} else {
			AriALAbel = this._itemModel.text ? stripCodicons(this._itemModel.text).trim() : '';
		}

		if (AriALAbel) {
			this.contAiner.setAttribute('AriA-lAbel', AriALAbel);
		}

		if (role) {
			this.contAiner.setAttribute('role', role);
		}

		this.contAiner.title = this._itemModel.tooltip ?? '';

		if (this._itemModel.commAnd) {
			this.contAiner.clAssList.Add('cell-stAtus-item-hAs-commAnd');
			this.contAiner.tAbIndex = 0;

			this._register(DOM.AddDisposAbleListener(this.contAiner, DOM.EventType.CLICK, _e => {
				this.executeCommAnd();
			}));
			this._register(DOM.AddDisposAbleListener(this.contAiner, DOM.EventType.KEY_UP, e => {
				const event = new StAndArdKeyboArdEvent(e);
				if (event.equAls(KeyCode.SpAce) || event.equAls(KeyCode.Enter)) {
					this.executeCommAnd();
				}
			}));
		}
	}

	privAte Async executeCommAnd(): Promise<void> {
		const commAnd = this._itemModel.commAnd;
		if (!commAnd) {
			return;
		}

		const id = typeof commAnd === 'string' ? commAnd : commAnd.id;
		const Args = typeof commAnd === 'string' ? [] : commAnd.Arguments ?? [];

		Args.unshift(this._context);

		this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id, from: 'cell stAtus bAr' });
		try {
			AwAit this.commAndService.executeCommAnd(id, ...Args);
		} cAtch (error) {
			this.notificAtionService.error(toErrorMessAge(error));
		}
	}
}

export clAss CellLAnguAgeStAtusBArItem extends DisposAble {
	privAte reAdonly lAbelElement: HTMLElement;

	privAte cell: ICellViewModel | undefined;
	privAte editor: INotebookEditor | undefined;

	privAte cellDisposAbles: DisposAbleStore;

	constructor(
		reAdonly contAiner: HTMLElement,
		@IModeService privAte reAdonly modeService: IModeService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this.lAbelElement = DOM.Append(contAiner, $('.cell-lAnguAge-picker.cell-stAtus-item'));
		this.lAbelElement.tAbIndex = 0;

		this._register(DOM.AddDisposAbleListener(this.lAbelElement, DOM.EventType.CLICK, () => {
			this.run();
		}));
		this._register(DOM.AddDisposAbleListener(this.lAbelElement, DOM.EventType.KEY_UP, e => {
			const event = new StAndArdKeyboArdEvent(e);
			if (event.equAls(KeyCode.SpAce) || event.equAls(KeyCode.Enter)) {
				this.run();
			}
		}));
		this._register(this.cellDisposAbles = new DisposAbleStore());
	}

	privAte run() {
		this.instAntiAtionService.invokeFunction(Accessor => {
			new ChAngeCellLAnguAgeAction().run(Accessor, { notebookEditor: this.editor!, cell: this.cell! });
		});
	}

	updAte(cell: ICellViewModel, editor: INotebookEditor): void {
		this.cellDisposAbles.cleAr();
		this.cell = cell;
		this.editor = editor;

		this.render();
		this.cellDisposAbles.Add(this.cell.model.onDidChAngeLAnguAge(() => this.render()));
	}

	privAte render(): void {
		const modeId = this.cell?.cellKind === CellKind.MArkdown ? 'mArkdown' : this.modeService.getModeIdForLAnguAgeNAme(this.cell!.lAnguAge) || this.cell!.lAnguAge;
		this.lAbelElement.textContent = this.modeService.getLAnguAgeNAme(modeId) || this.modeService.getLAnguAgeNAme('plAintext');
		this.lAbelElement.title = locAlize('notebook.cell.stAtus.lAnguAge', "Select Cell LAnguAge Mode");
	}
}
