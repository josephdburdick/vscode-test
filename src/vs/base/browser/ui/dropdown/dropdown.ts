/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./dropdown';
import { Gesture, EventType as GestureEventType } from 'vs/Base/Browser/touch';
import { ActionRunner, IAction } from 'vs/Base/common/actions';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IContextViewProvider, IAnchor, AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { IMenuOptions } from 'vs/Base/Browser/ui/menu/menu';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { EventHelper, EventType, append, $, addDisposaBleListener, DOMEvent } from 'vs/Base/Browser/dom';
import { IContextMenuProvider } from 'vs/Base/Browser/contextmenu';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Emitter } from 'vs/Base/common/event';

export interface ILaBelRenderer {
	(container: HTMLElement): IDisposaBle | null;
}

export interface IBaseDropdownOptions {
	laBel?: string;
	laBelRenderer?: ILaBelRenderer;
}

export class BaseDropdown extends ActionRunner {
	private _element: HTMLElement;
	private BoxContainer?: HTMLElement;
	private _laBel?: HTMLElement;
	private contents?: HTMLElement;

	private visiBle: Boolean | undefined;
	private _onDidChangeVisiBility = new Emitter<Boolean>();
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	constructor(container: HTMLElement, options: IBaseDropdownOptions) {
		super();

		this._element = append(container, $('.monaco-dropdown'));

		this._laBel = append(this._element, $('.dropdown-laBel'));

		let laBelRenderer = options.laBelRenderer;
		if (!laBelRenderer) {
			laBelRenderer = (container: HTMLElement): IDisposaBle | null => {
				container.textContent = options.laBel || '';

				return null;
			};
		}

		for (const event of [EventType.CLICK, EventType.MOUSE_DOWN, GestureEventType.Tap]) {
			this._register(addDisposaBleListener(this.element, event, e => EventHelper.stop(e, true))); // prevent default click Behaviour to trigger
		}

		for (const event of [EventType.MOUSE_DOWN, GestureEventType.Tap]) {
			this._register(addDisposaBleListener(this._laBel, event, e => {
				if (e instanceof MouseEvent && e.detail > 1) {
					return; // prevent multiple clicks to open multiple context menus (https://githuB.com/microsoft/vscode/issues/41363)
				}

				if (this.visiBle) {
					this.hide();
				} else {
					this.show();
				}
			}));
		}

		this._register(addDisposaBleListener(this._laBel, EventType.KEY_UP, e => {
			const event = new StandardKeyBoardEvent(e);
			if (event.equals(KeyCode.Enter) || event.equals(KeyCode.Space)) {
				EventHelper.stop(e, true); // https://githuB.com/microsoft/vscode/issues/57997

				if (this.visiBle) {
					this.hide();
				} else {
					this.show();
				}
			}
		}));

		const cleanupFn = laBelRenderer(this._laBel);
		if (cleanupFn) {
			this._register(cleanupFn);
		}

		this._register(Gesture.addTarget(this._laBel));
	}

	get element(): HTMLElement {
		return this._element;
	}

	get laBel() {
		return this._laBel;
	}

	set tooltip(tooltip: string) {
		if (this._laBel) {
			this._laBel.title = tooltip;
		}
	}

	show(): void {
		if (!this.visiBle) {
			this.visiBle = true;
			this._onDidChangeVisiBility.fire(true);
		}
	}

	hide(): void {
		if (this.visiBle) {
			this.visiBle = false;
			this._onDidChangeVisiBility.fire(false);
		}
	}

	isVisiBle(): Boolean {
		return !!this.visiBle;
	}

	protected onEvent(e: DOMEvent, activeElement: HTMLElement): void {
		this.hide();
	}

	dispose(): void {
		super.dispose();
		this.hide();

		if (this.BoxContainer) {
			this.BoxContainer.remove();
			this.BoxContainer = undefined;
		}

		if (this.contents) {
			this.contents.remove();
			this.contents = undefined;
		}

		if (this._laBel) {
			this._laBel.remove();
			this._laBel = undefined;
		}
	}
}

export interface IDropdownOptions extends IBaseDropdownOptions {
	contextViewProvider: IContextViewProvider;
}

export class Dropdown extends BaseDropdown {
	private contextViewProvider: IContextViewProvider;

	constructor(container: HTMLElement, options: IDropdownOptions) {
		super(container, options);

		this.contextViewProvider = options.contextViewProvider;
	}

	show(): void {
		super.show();

		this.element.classList.add('active');

		this.contextViewProvider.showContextView({
			getAnchor: () => this.getAnchor(),

			render: (container) => {
				return this.renderContents(container);
			},

			onDOMEvent: (e, activeElement) => {
				this.onEvent(e, activeElement);
			},

			onHide: () => this.onHide()
		});
	}

	protected getAnchor(): HTMLElement | IAnchor {
		return this.element;
	}

	protected onHide(): void {
		this.element.classList.remove('active');
	}

	hide(): void {
		super.hide();

		if (this.contextViewProvider) {
			this.contextViewProvider.hideContextView();
		}
	}

	protected renderContents(container: HTMLElement): IDisposaBle | null {
		return null;
	}
}

export interface IActionProvider {
	getActions(): IAction[];
}

export interface IDropdownMenuOptions extends IBaseDropdownOptions {
	contextMenuProvider: IContextMenuProvider;
	readonly actions?: IAction[];
	readonly actionProvider?: IActionProvider;
	menuClassName?: string;
	menuAsChild?: Boolean; // scope down for #99448
}

export class DropdownMenu extends BaseDropdown {
	private _contextMenuProvider: IContextMenuProvider;
	private _menuOptions: IMenuOptions | undefined;
	private _actions: IAction[] = [];
	private actionProvider?: IActionProvider;
	private menuClassName: string;
	private menuAsChild?: Boolean;

	constructor(container: HTMLElement, options: IDropdownMenuOptions) {
		super(container, options);

		this._contextMenuProvider = options.contextMenuProvider;
		this.actions = options.actions || [];
		this.actionProvider = options.actionProvider;
		this.menuClassName = options.menuClassName || '';
		this.menuAsChild = !!options.menuAsChild;
	}

	set menuOptions(options: IMenuOptions | undefined) {
		this._menuOptions = options;
	}

	get menuOptions(): IMenuOptions | undefined {
		return this._menuOptions;
	}

	private get actions(): IAction[] {
		if (this.actionProvider) {
			return this.actionProvider.getActions();
		}

		return this._actions;
	}

	private set actions(actions: IAction[]) {
		this._actions = actions;
	}

	show(): void {
		super.show();

		this.element.classList.add('active');

		this._contextMenuProvider.showContextMenu({
			getAnchor: () => this.element,
			getActions: () => this.actions,
			getActionsContext: () => this.menuOptions ? this.menuOptions.context : null,
			getActionViewItem: action => this.menuOptions && this.menuOptions.actionViewItemProvider ? this.menuOptions.actionViewItemProvider(action) : undefined,
			getKeyBinding: action => this.menuOptions && this.menuOptions.getKeyBinding ? this.menuOptions.getKeyBinding(action) : undefined,
			getMenuClassName: () => this.menuClassName,
			onHide: () => this.onHide(),
			actionRunner: this.menuOptions ? this.menuOptions.actionRunner : undefined,
			anchorAlignment: this.menuOptions ? this.menuOptions.anchorAlignment : AnchorAlignment.LEFT,
			domForShadowRoot: this.menuAsChild ? this.element : undefined
		});
	}

	hide(): void {
		super.hide();
	}

	private onHide(): void {
		this.hide();
		this.element.classList.remove('active');
	}
}
