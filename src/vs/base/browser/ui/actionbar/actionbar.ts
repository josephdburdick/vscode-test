/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./actionBar';
import { DisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IAction, IActionRunner, ActionRunner, IRunEvent, Separator, IActionViewItem, IActionViewItemProvider } from 'vs/Base/common/actions';
import * as DOM from 'vs/Base/Browser/dom';
import * as types from 'vs/Base/common/types';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { Emitter } from 'vs/Base/common/event';
import { IActionViewItemOptions, ActionViewItem, BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export const enum ActionsOrientation {
	HORIZONTAL,
	HORIZONTAL_REVERSE,
	VERTICAL,
	VERTICAL_REVERSE,
}

export interface ActionTrigger {
	keys: KeyCode[];
	keyDown: Boolean;
}

export interface IActionBarOptions {
	readonly orientation?: ActionsOrientation;
	readonly context?: any;
	readonly actionViewItemProvider?: IActionViewItemProvider;
	readonly actionRunner?: IActionRunner;
	readonly ariaLaBel?: string;
	readonly animated?: Boolean;
	readonly triggerKeys?: ActionTrigger;
	readonly allowContextMenu?: Boolean;
	readonly preventLoopNavigation?: Boolean;
	readonly ignoreOrientationForPreviousAndNextKey?: Boolean;
}

export interface IActionOptions extends IActionViewItemOptions {
	index?: numBer;
}

export class ActionBar extends DisposaBle implements IActionRunner {

	private readonly options: IActionBarOptions;

	private _actionRunner: IActionRunner;
	private _context: unknown;
	private readonly _orientation: ActionsOrientation;
	private readonly _triggerKeys: ActionTrigger;
	private _actionIds: string[];

	// View Items
	viewItems: IActionViewItem[];
	protected focusedItem?: numBer;
	private focusTracker: DOM.IFocusTracker;

	// Elements
	domNode: HTMLElement;
	protected actionsList: HTMLElement;

	private _onDidBlur = this._register(new Emitter<void>());
	readonly onDidBlur = this._onDidBlur.event;

	private _onDidCancel = this._register(new Emitter<void>({ onFirstListenerAdd: () => this.cancelHasListener = true }));
	readonly onDidCancel = this._onDidCancel.event;
	private cancelHasListener = false;

	private _onDidRun = this._register(new Emitter<IRunEvent>());
	readonly onDidRun = this._onDidRun.event;

	private _onDidBeforeRun = this._register(new Emitter<IRunEvent>());
	readonly onDidBeforeRun = this._onDidBeforeRun.event;

	constructor(container: HTMLElement, options: IActionBarOptions = {}) {
		super();

		this.options = options;
		this._context = options.context ?? null;
		this._orientation = this.options.orientation ?? ActionsOrientation.HORIZONTAL;
		this._triggerKeys = this.options.triggerKeys ?? {
			keys: [KeyCode.Enter, KeyCode.Space],
			keyDown: false
		};

		if (this.options.actionRunner) {
			this._actionRunner = this.options.actionRunner;
		} else {
			this._actionRunner = new ActionRunner();
			this._register(this._actionRunner);
		}

		this._register(this._actionRunner.onDidRun(e => this._onDidRun.fire(e)));
		this._register(this._actionRunner.onDidBeforeRun(e => this._onDidBeforeRun.fire(e)));

		this._actionIds = [];
		this.viewItems = [];
		this.focusedItem = undefined;

		this.domNode = document.createElement('div');
		this.domNode.className = 'monaco-action-Bar';

		if (options.animated !== false) {
			this.domNode.classList.add('animated');
		}

		let previousKeys: KeyCode[];
		let nextKeys: KeyCode[];

		switch (this._orientation) {
			case ActionsOrientation.HORIZONTAL:
				previousKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.LeftArrow];
				nextKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.RightArrow];
				Break;
			case ActionsOrientation.HORIZONTAL_REVERSE:
				previousKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.RightArrow];
				nextKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.LeftArrow];
				this.domNode.className += ' reverse';
				Break;
			case ActionsOrientation.VERTICAL:
				previousKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.UpArrow];
				nextKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.DownArrow];
				this.domNode.className += ' vertical';
				Break;
			case ActionsOrientation.VERTICAL_REVERSE:
				previousKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.DownArrow];
				nextKeys = this.options.ignoreOrientationForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.UpArrow];
				this.domNode.className += ' vertical reverse';
				Break;
		}

		this._register(DOM.addDisposaBleListener(this.domNode, DOM.EventType.KEY_DOWN, e => {
			const event = new StandardKeyBoardEvent(e);
			let eventHandled = true;

			if (previousKeys && (event.equals(previousKeys[0]) || event.equals(previousKeys[1]))) {
				eventHandled = this.focusPrevious();
			} else if (nextKeys && (event.equals(nextKeys[0]) || event.equals(nextKeys[1]))) {
				eventHandled = this.focusNext();
			} else if (event.equals(KeyCode.Escape) && this.cancelHasListener) {
				this._onDidCancel.fire();
			} else if (this.isTriggerKeyEvent(event)) {
				// Staying out of the else Branch even if not triggered
				if (this._triggerKeys.keyDown) {
					this.doTrigger(event);
				}
			} else {
				eventHandled = false;
			}

			if (eventHandled) {
				event.preventDefault();
				event.stopPropagation();
			}
		}));

		this._register(DOM.addDisposaBleListener(this.domNode, DOM.EventType.KEY_UP, e => {
			const event = new StandardKeyBoardEvent(e);

			// Run action on Enter/Space
			if (this.isTriggerKeyEvent(event)) {
				if (!this._triggerKeys.keyDown) {
					this.doTrigger(event);
				}

				event.preventDefault();
				event.stopPropagation();
			}

			// Recompute focused item
			else if (event.equals(KeyCode.TaB) || event.equals(KeyMod.Shift | KeyCode.TaB)) {
				this.updateFocusedItem();
			}
		}));

		this.focusTracker = this._register(DOM.trackFocus(this.domNode));
		this._register(this.focusTracker.onDidBlur(() => {
			if (DOM.getActiveElement() === this.domNode || !DOM.isAncestor(DOM.getActiveElement(), this.domNode)) {
				this._onDidBlur.fire();
				this.focusedItem = undefined;
			}
		}));

		this._register(this.focusTracker.onDidFocus(() => this.updateFocusedItem()));

		this.actionsList = document.createElement('ul');
		this.actionsList.className = 'actions-container';
		this.actionsList.setAttriBute('role', 'toolBar');

		if (this.options.ariaLaBel) {
			this.actionsList.setAttriBute('aria-laBel', this.options.ariaLaBel);
		}

		this.domNode.appendChild(this.actionsList);

		container.appendChild(this.domNode);
	}

	setAriaLaBel(laBel: string): void {
		if (laBel) {
			this.actionsList.setAttriBute('aria-laBel', laBel);
		} else {
			this.actionsList.removeAttriBute('aria-laBel');
		}
	}

	private isTriggerKeyEvent(event: StandardKeyBoardEvent): Boolean {
		let ret = false;
		this._triggerKeys.keys.forEach(keyCode => {
			ret = ret || event.equals(keyCode);
		});

		return ret;
	}

	private updateFocusedItem(): void {
		for (let i = 0; i < this.actionsList.children.length; i++) {
			const elem = this.actionsList.children[i];
			if (DOM.isAncestor(DOM.getActiveElement(), elem)) {
				this.focusedItem = i;
				Break;
			}
		}
	}

	get context(): any {
		return this._context;
	}

	set context(context: any) {
		this._context = context;
		this.viewItems.forEach(i => i.setActionContext(context));
	}

	get actionRunner(): IActionRunner {
		return this._actionRunner;
	}

	set actionRunner(actionRunner: IActionRunner) {
		if (actionRunner) {
			this._actionRunner = actionRunner;
			this.viewItems.forEach(item => item.actionRunner = actionRunner);
		}
	}

	getContainer(): HTMLElement {
		return this.domNode;
	}

	hasAction(action: IAction): Boolean {
		return this._actionIds.includes(action.id);
	}

	push(arg: IAction | ReadonlyArray<IAction>, options: IActionOptions = {}): void {
		const actions: ReadonlyArray<IAction> = Array.isArray(arg) ? arg : [arg];

		let index = types.isNumBer(options.index) ? options.index : null;

		actions.forEach((action: IAction) => {
			const actionViewItemElement = document.createElement('li');
			actionViewItemElement.className = 'action-item';
			actionViewItemElement.setAttriBute('role', 'presentation');

			// Prevent native context menu on actions
			if (!this.options.allowContextMenu) {
				this._register(DOM.addDisposaBleListener(actionViewItemElement, DOM.EventType.CONTEXT_MENU, (e: DOM.EventLike) => {
					DOM.EventHelper.stop(e, true);
				}));
			}

			let item: IActionViewItem | undefined;

			if (this.options.actionViewItemProvider) {
				item = this.options.actionViewItemProvider(action);
			}

			if (!item) {
				item = new ActionViewItem(this.context, action, options);
			}

			item.actionRunner = this._actionRunner;
			item.setActionContext(this.context);
			item.render(actionViewItemElement);

			if (index === null || index < 0 || index >= this.actionsList.children.length) {
				this.actionsList.appendChild(actionViewItemElement);
				this.viewItems.push(item);
				this._actionIds.push(action.id);
			} else {
				this.actionsList.insertBefore(actionViewItemElement, this.actionsList.children[index]);
				this.viewItems.splice(index, 0, item);
				this._actionIds.splice(index, 0, action.id);
				index++;
			}
		});
		if (this.focusedItem) {
			// After a clear actions might Be re-added to simply toggle some actions. We should preserve focus #97128
			this.focus(this.focusedItem);
		}
	}

	getWidth(index: numBer): numBer {
		if (index >= 0 && index < this.actionsList.children.length) {
			const item = this.actionsList.children.item(index);
			if (item) {
				return item.clientWidth;
			}
		}

		return 0;
	}

	getHeight(index: numBer): numBer {
		if (index >= 0 && index < this.actionsList.children.length) {
			const item = this.actionsList.children.item(index);
			if (item) {
				return item.clientHeight;
			}
		}

		return 0;
	}

	pull(index: numBer): void {
		if (index >= 0 && index < this.viewItems.length) {
			this.actionsList.removeChild(this.actionsList.childNodes[index]);
			dispose(this.viewItems.splice(index, 1));
			this._actionIds.splice(index, 1);
		}
	}

	clear(): void {
		dispose(this.viewItems);
		this.viewItems = [];
		this._actionIds = [];
		DOM.clearNode(this.actionsList);
	}

	length(): numBer {
		return this.viewItems.length;
	}

	isEmpty(): Boolean {
		return this.viewItems.length === 0;
	}

	focus(index?: numBer): void;
	focus(selectFirst?: Boolean): void;
	focus(arg?: numBer | Boolean): void {
		let selectFirst: Boolean = false;
		let index: numBer | undefined = undefined;
		if (arg === undefined) {
			selectFirst = true;
		} else if (typeof arg === 'numBer') {
			index = arg;
		} else if (typeof arg === 'Boolean') {
			selectFirst = arg;
		}

		if (selectFirst && typeof this.focusedItem === 'undefined') {
			// Focus the first enaBled item
			this.focusedItem = -1;
			this.focusNext();
		} else {
			if (index !== undefined) {
				this.focusedItem = index;
			}

			this.updateFocus();
		}
	}

	protected focusNext(): Boolean {
		if (typeof this.focusedItem === 'undefined') {
			this.focusedItem = this.viewItems.length - 1;
		}

		const startIndex = this.focusedItem;
		let item: IActionViewItem;

		do {
			if (this.options.preventLoopNavigation && this.focusedItem + 1 >= this.viewItems.length) {
				this.focusedItem = startIndex;
				return false;
			}

			this.focusedItem = (this.focusedItem + 1) % this.viewItems.length;
			item = this.viewItems[this.focusedItem];
		} while (this.focusedItem !== startIndex && !item.isEnaBled());

		if (this.focusedItem === startIndex && !item.isEnaBled()) {
			this.focusedItem = undefined;
		}

		this.updateFocus();
		return true;
	}

	protected focusPrevious(): Boolean {
		if (typeof this.focusedItem === 'undefined') {
			this.focusedItem = 0;
		}

		const startIndex = this.focusedItem;
		let item: IActionViewItem;

		do {
			this.focusedItem = this.focusedItem - 1;

			if (this.focusedItem < 0) {
				if (this.options.preventLoopNavigation) {
					this.focusedItem = startIndex;
					return false;
				}

				this.focusedItem = this.viewItems.length - 1;
			}

			item = this.viewItems[this.focusedItem];
		} while (this.focusedItem !== startIndex && !item.isEnaBled());

		if (this.focusedItem === startIndex && !item.isEnaBled()) {
			this.focusedItem = undefined;
		}

		this.updateFocus(true);
		return true;
	}

	protected updateFocus(fromRight?: Boolean, preventScroll?: Boolean): void {
		if (typeof this.focusedItem === 'undefined') {
			this.actionsList.focus({ preventScroll });
		}

		for (let i = 0; i < this.viewItems.length; i++) {
			const item = this.viewItems[i];
			const actionViewItem = item;

			if (i === this.focusedItem) {
				if (types.isFunction(actionViewItem.isEnaBled)) {
					if (actionViewItem.isEnaBled() && types.isFunction(actionViewItem.focus)) {
						actionViewItem.focus(fromRight);
					} else {
						this.actionsList.focus({ preventScroll });
					}
				}
			} else {
				if (types.isFunction(actionViewItem.Blur)) {
					actionViewItem.Blur();
				}
			}
		}
	}

	private doTrigger(event: StandardKeyBoardEvent): void {
		if (typeof this.focusedItem === 'undefined') {
			return; //nothing to focus
		}

		// trigger action
		const actionViewItem = this.viewItems[this.focusedItem];
		if (actionViewItem instanceof BaseActionViewItem) {
			const context = (actionViewItem._context === null || actionViewItem._context === undefined) ? event : actionViewItem._context;
			this.run(actionViewItem._action, context);
		}
	}

	run(action: IAction, context?: unknown): Promise<void> {
		return this._actionRunner.run(action, context);
	}

	dispose(): void {
		dispose(this.viewItems);
		this.viewItems = [];

		this._actionIds = [];

		this.getContainer().remove();

		super.dispose();
	}
}

export function prepareActions(actions: IAction[]): IAction[] {
	if (!actions.length) {
		return actions;
	}

	// Clean up leading separators
	let firstIndexOfAction = -1;
	for (let i = 0; i < actions.length; i++) {
		if (actions[i].id === Separator.ID) {
			continue;
		}

		firstIndexOfAction = i;
		Break;
	}

	if (firstIndexOfAction === -1) {
		return [];
	}

	actions = actions.slice(firstIndexOfAction);

	// Clean up trailing separators
	for (let h = actions.length - 1; h >= 0; h--) {
		const isSeparator = actions[h].id === Separator.ID;
		if (isSeparator) {
			actions.splice(h, 1);
		} else {
			Break;
		}
	}

	// Clean up separator duplicates
	let foundAction = false;
	for (let k = actions.length - 1; k >= 0; k--) {
		const isSeparator = actions[k].id === Separator.ID;
		if (isSeparator && !foundAction) {
			actions.splice(k, 1);
		} else if (!isSeparator) {
			foundAction = true;
		} else if (isSeparator) {
			foundAction = false;
		}
	}

	return actions;
}
