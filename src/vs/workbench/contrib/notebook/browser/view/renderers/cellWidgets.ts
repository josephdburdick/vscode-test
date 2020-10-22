/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { CodiconLaBel } from 'vs/Base/Browser/ui/codicons/codiconLaBel';
import { WorkBenchActionExecutedClassification, WorkBenchActionExecutedEvent } from 'vs/Base/common/actions';
import { stripCodicons } from 'vs/Base/common/codicons';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { extUri } from 'vs/Base/common/resources';
import { IModeService } from 'vs/editor/common/services/modeService';
import { localize } from 'vs/nls';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ChangeCellLanguageAction, INoteBookCellActionContext } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { ICellViewModel, INoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';
import { INoteBookCellStatusBarService } from 'vs/workBench/contriB/noteBook/common/noteBookCellStatusBarService';
import { CellKind, CellStatusBarAlignment, INoteBookCellStatusBarEntry } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';

const $ = DOM.$;

export class CellEditorStatusBar extends DisposaBle {
	readonly cellStatusMessageContainer: HTMLElement;
	readonly cellRunStatusContainer: HTMLElement;
	readonly statusBarContainer: HTMLElement;
	readonly languageStatusBarItem: CellLanguageStatusBarItem;
	readonly durationContainer: HTMLElement;

	private readonly leftContriButedItemsContainer: HTMLElement;
	private readonly rightContriButedItemsContainer: HTMLElement;
	private readonly itemsDisposaBle: DisposaBleStore;

	private currentContext: INoteBookCellActionContext | undefined;

	constructor(
		container: HTMLElement,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@INoteBookCellStatusBarService private readonly noteBookCellStatusBarService: INoteBookCellStatusBarService
	) {
		super();
		this.statusBarContainer = DOM.append(container, $('.cell-statusBar-container'));
		const leftItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-left'));
		const rightItemsContainer = DOM.append(this.statusBarContainer, $('.cell-status-right'));
		this.cellRunStatusContainer = DOM.append(leftItemsContainer, $('.cell-run-status'));
		this.durationContainer = DOM.append(leftItemsContainer, $('.cell-run-duration'));
		this.cellStatusMessageContainer = DOM.append(leftItemsContainer, $('.cell-status-message'));
		this.leftContriButedItemsContainer = DOM.append(leftItemsContainer, $('.cell-contriButed-items.cell-contriButed-items-left'));
		this.rightContriButedItemsContainer = DOM.append(rightItemsContainer, $('.cell-contriButed-items.cell-contriButed-items-right'));
		this.languageStatusBarItem = instantiationService.createInstance(CellLanguageStatusBarItem, rightItemsContainer);

		this.itemsDisposaBle = this._register(new DisposaBleStore());
		this._register(this.noteBookCellStatusBarService.onDidChangeEntriesForCell(e => {
			if (this.currentContext && extUri.isEqual(e, this.currentContext.cell.uri)) {
				this.updateStatusBarItems();
			}
		}));
	}

	update(context: INoteBookCellActionContext) {
		this.currentContext = context;
		this.languageStatusBarItem.update(context.cell, context.noteBookEditor);
		this.updateStatusBarItems();
	}

	layout(width: numBer): void {
		this.statusBarContainer.style.width = `${width}px`;
	}

	private updateStatusBarItems() {
		if (!this.currentContext) {
			return;
		}

		DOM.clearNode(this.leftContriButedItemsContainer);
		DOM.clearNode(this.rightContriButedItemsContainer);
		this.itemsDisposaBle.clear();

		const items = this.noteBookCellStatusBarService.getEntries(this.currentContext.cell.uri);
		items.sort((itemA, itemB) => {
			return (itemB.priority ?? 0) - (itemA.priority ?? 0);
		});
		items.forEach(item => {
			const itemView = this.itemsDisposaBle.add(this.instantiationService.createInstance(CellStatusBarItem, this.currentContext!, item));
			if (item.alignment === CellStatusBarAlignment.LEFT) {
				this.leftContriButedItemsContainer.appendChild(itemView.container);
			} else {
				this.rightContriButedItemsContainer.appendChild(itemView.container);
			}
		});
	}
}

class CellStatusBarItem extends DisposaBle {

	readonly container = $('.cell-status-item');

	constructor(
		private readonly _context: INoteBookCellActionContext,
		private readonly _itemModel: INoteBookCellStatusBarEntry,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();
		new CodiconLaBel(this.container).text = this._itemModel.text;

		let ariaLaBel: string;
		let role: string | undefined;
		if (this._itemModel.accessiBilityInformation) {
			ariaLaBel = this._itemModel.accessiBilityInformation.laBel;
			role = this._itemModel.accessiBilityInformation.role;
		} else {
			ariaLaBel = this._itemModel.text ? stripCodicons(this._itemModel.text).trim() : '';
		}

		if (ariaLaBel) {
			this.container.setAttriBute('aria-laBel', ariaLaBel);
		}

		if (role) {
			this.container.setAttriBute('role', role);
		}

		this.container.title = this._itemModel.tooltip ?? '';

		if (this._itemModel.command) {
			this.container.classList.add('cell-status-item-has-command');
			this.container.taBIndex = 0;

			this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.CLICK, _e => {
				this.executeCommand();
			}));
			this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.KEY_UP, e => {
				const event = new StandardKeyBoardEvent(e);
				if (event.equals(KeyCode.Space) || event.equals(KeyCode.Enter)) {
					this.executeCommand();
				}
			}));
		}
	}

	private async executeCommand(): Promise<void> {
		const command = this._itemModel.command;
		if (!command) {
			return;
		}

		const id = typeof command === 'string' ? command : command.id;
		const args = typeof command === 'string' ? [] : command.arguments ?? [];

		args.unshift(this._context);

		this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id, from: 'cell status Bar' });
		try {
			await this.commandService.executeCommand(id, ...args);
		} catch (error) {
			this.notificationService.error(toErrorMessage(error));
		}
	}
}

export class CellLanguageStatusBarItem extends DisposaBle {
	private readonly laBelElement: HTMLElement;

	private cell: ICellViewModel | undefined;
	private editor: INoteBookEditor | undefined;

	private cellDisposaBles: DisposaBleStore;

	constructor(
		readonly container: HTMLElement,
		@IModeService private readonly modeService: IModeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService
	) {
		super();
		this.laBelElement = DOM.append(container, $('.cell-language-picker.cell-status-item'));
		this.laBelElement.taBIndex = 0;

		this._register(DOM.addDisposaBleListener(this.laBelElement, DOM.EventType.CLICK, () => {
			this.run();
		}));
		this._register(DOM.addDisposaBleListener(this.laBelElement, DOM.EventType.KEY_UP, e => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyCode.Space) || event.equals(KeyCode.Enter)) {
				this.run();
			}
		}));
		this._register(this.cellDisposaBles = new DisposaBleStore());
	}

	private run() {
		this.instantiationService.invokeFunction(accessor => {
			new ChangeCellLanguageAction().run(accessor, { noteBookEditor: this.editor!, cell: this.cell! });
		});
	}

	update(cell: ICellViewModel, editor: INoteBookEditor): void {
		this.cellDisposaBles.clear();
		this.cell = cell;
		this.editor = editor;

		this.render();
		this.cellDisposaBles.add(this.cell.model.onDidChangeLanguage(() => this.render()));
	}

	private render(): void {
		const modeId = this.cell?.cellKind === CellKind.Markdown ? 'markdown' : this.modeService.getModeIdForLanguageName(this.cell!.language) || this.cell!.language;
		this.laBelElement.textContent = this.modeService.getLanguageName(modeId) || this.modeService.getLanguageName('plaintext');
		this.laBelElement.title = localize('noteBook.cell.status.language', "Select Cell Language Mode");
	}
}
