/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./dropdown';
import { Gesture, EventType As GestureEventType } from 'vs/bAse/browser/touch';
import { ActionRunner, IAction } from 'vs/bAse/common/Actions';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IContextViewProvider, IAnchor, AnchorAlignment } from 'vs/bAse/browser/ui/contextview/contextview';
import { IMenuOptions } from 'vs/bAse/browser/ui/menu/menu';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { EventHelper, EventType, Append, $, AddDisposAbleListener, DOMEvent } from 'vs/bAse/browser/dom';
import { IContextMenuProvider } from 'vs/bAse/browser/contextmenu';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { Emitter } from 'vs/bAse/common/event';

export interfAce ILAbelRenderer {
	(contAiner: HTMLElement): IDisposAble | null;
}

export interfAce IBAseDropdownOptions {
	lAbel?: string;
	lAbelRenderer?: ILAbelRenderer;
}

export clAss BAseDropdown extends ActionRunner {
	privAte _element: HTMLElement;
	privAte boxContAiner?: HTMLElement;
	privAte _lAbel?: HTMLElement;
	privAte contents?: HTMLElement;

	privAte visible: booleAn | undefined;
	privAte _onDidChAngeVisibility = new Emitter<booleAn>();
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	constructor(contAiner: HTMLElement, options: IBAseDropdownOptions) {
		super();

		this._element = Append(contAiner, $('.monAco-dropdown'));

		this._lAbel = Append(this._element, $('.dropdown-lAbel'));

		let lAbelRenderer = options.lAbelRenderer;
		if (!lAbelRenderer) {
			lAbelRenderer = (contAiner: HTMLElement): IDisposAble | null => {
				contAiner.textContent = options.lAbel || '';

				return null;
			};
		}

		for (const event of [EventType.CLICK, EventType.MOUSE_DOWN, GestureEventType.TAp]) {
			this._register(AddDisposAbleListener(this.element, event, e => EventHelper.stop(e, true))); // prevent defAult click behAviour to trigger
		}

		for (const event of [EventType.MOUSE_DOWN, GestureEventType.TAp]) {
			this._register(AddDisposAbleListener(this._lAbel, event, e => {
				if (e instAnceof MouseEvent && e.detAil > 1) {
					return; // prevent multiple clicks to open multiple context menus (https://github.com/microsoft/vscode/issues/41363)
				}

				if (this.visible) {
					this.hide();
				} else {
					this.show();
				}
			}));
		}

		this._register(AddDisposAbleListener(this._lAbel, EventType.KEY_UP, e => {
			const event = new StAndArdKeyboArdEvent(e);
			if (event.equAls(KeyCode.Enter) || event.equAls(KeyCode.SpAce)) {
				EventHelper.stop(e, true); // https://github.com/microsoft/vscode/issues/57997

				if (this.visible) {
					this.hide();
				} else {
					this.show();
				}
			}
		}));

		const cleAnupFn = lAbelRenderer(this._lAbel);
		if (cleAnupFn) {
			this._register(cleAnupFn);
		}

		this._register(Gesture.AddTArget(this._lAbel));
	}

	get element(): HTMLElement {
		return this._element;
	}

	get lAbel() {
		return this._lAbel;
	}

	set tooltip(tooltip: string) {
		if (this._lAbel) {
			this._lAbel.title = tooltip;
		}
	}

	show(): void {
		if (!this.visible) {
			this.visible = true;
			this._onDidChAngeVisibility.fire(true);
		}
	}

	hide(): void {
		if (this.visible) {
			this.visible = fAlse;
			this._onDidChAngeVisibility.fire(fAlse);
		}
	}

	isVisible(): booleAn {
		return !!this.visible;
	}

	protected onEvent(e: DOMEvent, ActiveElement: HTMLElement): void {
		this.hide();
	}

	dispose(): void {
		super.dispose();
		this.hide();

		if (this.boxContAiner) {
			this.boxContAiner.remove();
			this.boxContAiner = undefined;
		}

		if (this.contents) {
			this.contents.remove();
			this.contents = undefined;
		}

		if (this._lAbel) {
			this._lAbel.remove();
			this._lAbel = undefined;
		}
	}
}

export interfAce IDropdownOptions extends IBAseDropdownOptions {
	contextViewProvider: IContextViewProvider;
}

export clAss Dropdown extends BAseDropdown {
	privAte contextViewProvider: IContextViewProvider;

	constructor(contAiner: HTMLElement, options: IDropdownOptions) {
		super(contAiner, options);

		this.contextViewProvider = options.contextViewProvider;
	}

	show(): void {
		super.show();

		this.element.clAssList.Add('Active');

		this.contextViewProvider.showContextView({
			getAnchor: () => this.getAnchor(),

			render: (contAiner) => {
				return this.renderContents(contAiner);
			},

			onDOMEvent: (e, ActiveElement) => {
				this.onEvent(e, ActiveElement);
			},

			onHide: () => this.onHide()
		});
	}

	protected getAnchor(): HTMLElement | IAnchor {
		return this.element;
	}

	protected onHide(): void {
		this.element.clAssList.remove('Active');
	}

	hide(): void {
		super.hide();

		if (this.contextViewProvider) {
			this.contextViewProvider.hideContextView();
		}
	}

	protected renderContents(contAiner: HTMLElement): IDisposAble | null {
		return null;
	}
}

export interfAce IActionProvider {
	getActions(): IAction[];
}

export interfAce IDropdownMenuOptions extends IBAseDropdownOptions {
	contextMenuProvider: IContextMenuProvider;
	reAdonly Actions?: IAction[];
	reAdonly ActionProvider?: IActionProvider;
	menuClAssNAme?: string;
	menuAsChild?: booleAn; // scope down for #99448
}

export clAss DropdownMenu extends BAseDropdown {
	privAte _contextMenuProvider: IContextMenuProvider;
	privAte _menuOptions: IMenuOptions | undefined;
	privAte _Actions: IAction[] = [];
	privAte ActionProvider?: IActionProvider;
	privAte menuClAssNAme: string;
	privAte menuAsChild?: booleAn;

	constructor(contAiner: HTMLElement, options: IDropdownMenuOptions) {
		super(contAiner, options);

		this._contextMenuProvider = options.contextMenuProvider;
		this.Actions = options.Actions || [];
		this.ActionProvider = options.ActionProvider;
		this.menuClAssNAme = options.menuClAssNAme || '';
		this.menuAsChild = !!options.menuAsChild;
	}

	set menuOptions(options: IMenuOptions | undefined) {
		this._menuOptions = options;
	}

	get menuOptions(): IMenuOptions | undefined {
		return this._menuOptions;
	}

	privAte get Actions(): IAction[] {
		if (this.ActionProvider) {
			return this.ActionProvider.getActions();
		}

		return this._Actions;
	}

	privAte set Actions(Actions: IAction[]) {
		this._Actions = Actions;
	}

	show(): void {
		super.show();

		this.element.clAssList.Add('Active');

		this._contextMenuProvider.showContextMenu({
			getAnchor: () => this.element,
			getActions: () => this.Actions,
			getActionsContext: () => this.menuOptions ? this.menuOptions.context : null,
			getActionViewItem: Action => this.menuOptions && this.menuOptions.ActionViewItemProvider ? this.menuOptions.ActionViewItemProvider(Action) : undefined,
			getKeyBinding: Action => this.menuOptions && this.menuOptions.getKeyBinding ? this.menuOptions.getKeyBinding(Action) : undefined,
			getMenuClAssNAme: () => this.menuClAssNAme,
			onHide: () => this.onHide(),
			ActionRunner: this.menuOptions ? this.menuOptions.ActionRunner : undefined,
			AnchorAlignment: this.menuOptions ? this.menuOptions.AnchorAlignment : AnchorAlignment.LEFT,
			domForShAdowRoot: this.menuAsChild ? this.element : undefined
		});
	}

	hide(): void {
		super.hide();
	}

	privAte onHide(): void {
		this.hide();
		this.element.clAssList.remove('Active');
	}
}
