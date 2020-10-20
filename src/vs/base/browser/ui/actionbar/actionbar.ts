/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./ActionbAr';
import { DisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { IAction, IActionRunner, ActionRunner, IRunEvent, SepArAtor, IActionViewItem, IActionViewItemProvider } from 'vs/bAse/common/Actions';
import * As DOM from 'vs/bAse/browser/dom';
import * As types from 'vs/bAse/common/types';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { Emitter } from 'vs/bAse/common/event';
import { IActionViewItemOptions, ActionViewItem, BAseActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export const enum ActionsOrientAtion {
	HORIZONTAL,
	HORIZONTAL_REVERSE,
	VERTICAL,
	VERTICAL_REVERSE,
}

export interfAce ActionTrigger {
	keys: KeyCode[];
	keyDown: booleAn;
}

export interfAce IActionBArOptions {
	reAdonly orientAtion?: ActionsOrientAtion;
	reAdonly context?: Any;
	reAdonly ActionViewItemProvider?: IActionViewItemProvider;
	reAdonly ActionRunner?: IActionRunner;
	reAdonly AriALAbel?: string;
	reAdonly AnimAted?: booleAn;
	reAdonly triggerKeys?: ActionTrigger;
	reAdonly AllowContextMenu?: booleAn;
	reAdonly preventLoopNAvigAtion?: booleAn;
	reAdonly ignoreOrientAtionForPreviousAndNextKey?: booleAn;
}

export interfAce IActionOptions extends IActionViewItemOptions {
	index?: number;
}

export clAss ActionBAr extends DisposAble implements IActionRunner {

	privAte reAdonly options: IActionBArOptions;

	privAte _ActionRunner: IActionRunner;
	privAte _context: unknown;
	privAte reAdonly _orientAtion: ActionsOrientAtion;
	privAte reAdonly _triggerKeys: ActionTrigger;
	privAte _ActionIds: string[];

	// View Items
	viewItems: IActionViewItem[];
	protected focusedItem?: number;
	privAte focusTrAcker: DOM.IFocusTrAcker;

	// Elements
	domNode: HTMLElement;
	protected ActionsList: HTMLElement;

	privAte _onDidBlur = this._register(new Emitter<void>());
	reAdonly onDidBlur = this._onDidBlur.event;

	privAte _onDidCAncel = this._register(new Emitter<void>({ onFirstListenerAdd: () => this.cAncelHAsListener = true }));
	reAdonly onDidCAncel = this._onDidCAncel.event;
	privAte cAncelHAsListener = fAlse;

	privAte _onDidRun = this._register(new Emitter<IRunEvent>());
	reAdonly onDidRun = this._onDidRun.event;

	privAte _onDidBeforeRun = this._register(new Emitter<IRunEvent>());
	reAdonly onDidBeforeRun = this._onDidBeforeRun.event;

	constructor(contAiner: HTMLElement, options: IActionBArOptions = {}) {
		super();

		this.options = options;
		this._context = options.context ?? null;
		this._orientAtion = this.options.orientAtion ?? ActionsOrientAtion.HORIZONTAL;
		this._triggerKeys = this.options.triggerKeys ?? {
			keys: [KeyCode.Enter, KeyCode.SpAce],
			keyDown: fAlse
		};

		if (this.options.ActionRunner) {
			this._ActionRunner = this.options.ActionRunner;
		} else {
			this._ActionRunner = new ActionRunner();
			this._register(this._ActionRunner);
		}

		this._register(this._ActionRunner.onDidRun(e => this._onDidRun.fire(e)));
		this._register(this._ActionRunner.onDidBeforeRun(e => this._onDidBeforeRun.fire(e)));

		this._ActionIds = [];
		this.viewItems = [];
		this.focusedItem = undefined;

		this.domNode = document.creAteElement('div');
		this.domNode.clAssNAme = 'monAco-Action-bAr';

		if (options.AnimAted !== fAlse) {
			this.domNode.clAssList.Add('AnimAted');
		}

		let previousKeys: KeyCode[];
		let nextKeys: KeyCode[];

		switch (this._orientAtion) {
			cAse ActionsOrientAtion.HORIZONTAL:
				previousKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.LeftArrow];
				nextKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.RightArrow];
				breAk;
			cAse ActionsOrientAtion.HORIZONTAL_REVERSE:
				previousKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.RightArrow];
				nextKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.LeftArrow];
				this.domNode.clAssNAme += ' reverse';
				breAk;
			cAse ActionsOrientAtion.VERTICAL:
				previousKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.UpArrow];
				nextKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.DownArrow];
				this.domNode.clAssNAme += ' verticAl';
				breAk;
			cAse ActionsOrientAtion.VERTICAL_REVERSE:
				previousKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.RightArrow, KeyCode.DownArrow] : [KeyCode.DownArrow];
				nextKeys = this.options.ignoreOrientAtionForPreviousAndNextKey ? [KeyCode.LeftArrow, KeyCode.UpArrow] : [KeyCode.UpArrow];
				this.domNode.clAssNAme += ' verticAl reverse';
				breAk;
		}

		this._register(DOM.AddDisposAbleListener(this.domNode, DOM.EventType.KEY_DOWN, e => {
			const event = new StAndArdKeyboArdEvent(e);
			let eventHAndled = true;

			if (previousKeys && (event.equAls(previousKeys[0]) || event.equAls(previousKeys[1]))) {
				eventHAndled = this.focusPrevious();
			} else if (nextKeys && (event.equAls(nextKeys[0]) || event.equAls(nextKeys[1]))) {
				eventHAndled = this.focusNext();
			} else if (event.equAls(KeyCode.EscApe) && this.cAncelHAsListener) {
				this._onDidCAncel.fire();
			} else if (this.isTriggerKeyEvent(event)) {
				// StAying out of the else brAnch even if not triggered
				if (this._triggerKeys.keyDown) {
					this.doTrigger(event);
				}
			} else {
				eventHAndled = fAlse;
			}

			if (eventHAndled) {
				event.preventDefAult();
				event.stopPropAgAtion();
			}
		}));

		this._register(DOM.AddDisposAbleListener(this.domNode, DOM.EventType.KEY_UP, e => {
			const event = new StAndArdKeyboArdEvent(e);

			// Run Action on Enter/SpAce
			if (this.isTriggerKeyEvent(event)) {
				if (!this._triggerKeys.keyDown) {
					this.doTrigger(event);
				}

				event.preventDefAult();
				event.stopPropAgAtion();
			}

			// Recompute focused item
			else if (event.equAls(KeyCode.TAb) || event.equAls(KeyMod.Shift | KeyCode.TAb)) {
				this.updAteFocusedItem();
			}
		}));

		this.focusTrAcker = this._register(DOM.trAckFocus(this.domNode));
		this._register(this.focusTrAcker.onDidBlur(() => {
			if (DOM.getActiveElement() === this.domNode || !DOM.isAncestor(DOM.getActiveElement(), this.domNode)) {
				this._onDidBlur.fire();
				this.focusedItem = undefined;
			}
		}));

		this._register(this.focusTrAcker.onDidFocus(() => this.updAteFocusedItem()));

		this.ActionsList = document.creAteElement('ul');
		this.ActionsList.clAssNAme = 'Actions-contAiner';
		this.ActionsList.setAttribute('role', 'toolbAr');

		if (this.options.AriALAbel) {
			this.ActionsList.setAttribute('AriA-lAbel', this.options.AriALAbel);
		}

		this.domNode.AppendChild(this.ActionsList);

		contAiner.AppendChild(this.domNode);
	}

	setAriALAbel(lAbel: string): void {
		if (lAbel) {
			this.ActionsList.setAttribute('AriA-lAbel', lAbel);
		} else {
			this.ActionsList.removeAttribute('AriA-lAbel');
		}
	}

	privAte isTriggerKeyEvent(event: StAndArdKeyboArdEvent): booleAn {
		let ret = fAlse;
		this._triggerKeys.keys.forEAch(keyCode => {
			ret = ret || event.equAls(keyCode);
		});

		return ret;
	}

	privAte updAteFocusedItem(): void {
		for (let i = 0; i < this.ActionsList.children.length; i++) {
			const elem = this.ActionsList.children[i];
			if (DOM.isAncestor(DOM.getActiveElement(), elem)) {
				this.focusedItem = i;
				breAk;
			}
		}
	}

	get context(): Any {
		return this._context;
	}

	set context(context: Any) {
		this._context = context;
		this.viewItems.forEAch(i => i.setActionContext(context));
	}

	get ActionRunner(): IActionRunner {
		return this._ActionRunner;
	}

	set ActionRunner(ActionRunner: IActionRunner) {
		if (ActionRunner) {
			this._ActionRunner = ActionRunner;
			this.viewItems.forEAch(item => item.ActionRunner = ActionRunner);
		}
	}

	getContAiner(): HTMLElement {
		return this.domNode;
	}

	hAsAction(Action: IAction): booleAn {
		return this._ActionIds.includes(Action.id);
	}

	push(Arg: IAction | ReAdonlyArrAy<IAction>, options: IActionOptions = {}): void {
		const Actions: ReAdonlyArrAy<IAction> = ArrAy.isArrAy(Arg) ? Arg : [Arg];

		let index = types.isNumber(options.index) ? options.index : null;

		Actions.forEAch((Action: IAction) => {
			const ActionViewItemElement = document.creAteElement('li');
			ActionViewItemElement.clAssNAme = 'Action-item';
			ActionViewItemElement.setAttribute('role', 'presentAtion');

			// Prevent nAtive context menu on Actions
			if (!this.options.AllowContextMenu) {
				this._register(DOM.AddDisposAbleListener(ActionViewItemElement, DOM.EventType.CONTEXT_MENU, (e: DOM.EventLike) => {
					DOM.EventHelper.stop(e, true);
				}));
			}

			let item: IActionViewItem | undefined;

			if (this.options.ActionViewItemProvider) {
				item = this.options.ActionViewItemProvider(Action);
			}

			if (!item) {
				item = new ActionViewItem(this.context, Action, options);
			}

			item.ActionRunner = this._ActionRunner;
			item.setActionContext(this.context);
			item.render(ActionViewItemElement);

			if (index === null || index < 0 || index >= this.ActionsList.children.length) {
				this.ActionsList.AppendChild(ActionViewItemElement);
				this.viewItems.push(item);
				this._ActionIds.push(Action.id);
			} else {
				this.ActionsList.insertBefore(ActionViewItemElement, this.ActionsList.children[index]);
				this.viewItems.splice(index, 0, item);
				this._ActionIds.splice(index, 0, Action.id);
				index++;
			}
		});
		if (this.focusedItem) {
			// After A cleAr Actions might be re-Added to simply toggle some Actions. We should preserve focus #97128
			this.focus(this.focusedItem);
		}
	}

	getWidth(index: number): number {
		if (index >= 0 && index < this.ActionsList.children.length) {
			const item = this.ActionsList.children.item(index);
			if (item) {
				return item.clientWidth;
			}
		}

		return 0;
	}

	getHeight(index: number): number {
		if (index >= 0 && index < this.ActionsList.children.length) {
			const item = this.ActionsList.children.item(index);
			if (item) {
				return item.clientHeight;
			}
		}

		return 0;
	}

	pull(index: number): void {
		if (index >= 0 && index < this.viewItems.length) {
			this.ActionsList.removeChild(this.ActionsList.childNodes[index]);
			dispose(this.viewItems.splice(index, 1));
			this._ActionIds.splice(index, 1);
		}
	}

	cleAr(): void {
		dispose(this.viewItems);
		this.viewItems = [];
		this._ActionIds = [];
		DOM.cleArNode(this.ActionsList);
	}

	length(): number {
		return this.viewItems.length;
	}

	isEmpty(): booleAn {
		return this.viewItems.length === 0;
	}

	focus(index?: number): void;
	focus(selectFirst?: booleAn): void;
	focus(Arg?: number | booleAn): void {
		let selectFirst: booleAn = fAlse;
		let index: number | undefined = undefined;
		if (Arg === undefined) {
			selectFirst = true;
		} else if (typeof Arg === 'number') {
			index = Arg;
		} else if (typeof Arg === 'booleAn') {
			selectFirst = Arg;
		}

		if (selectFirst && typeof this.focusedItem === 'undefined') {
			// Focus the first enAbled item
			this.focusedItem = -1;
			this.focusNext();
		} else {
			if (index !== undefined) {
				this.focusedItem = index;
			}

			this.updAteFocus();
		}
	}

	protected focusNext(): booleAn {
		if (typeof this.focusedItem === 'undefined') {
			this.focusedItem = this.viewItems.length - 1;
		}

		const stArtIndex = this.focusedItem;
		let item: IActionViewItem;

		do {
			if (this.options.preventLoopNAvigAtion && this.focusedItem + 1 >= this.viewItems.length) {
				this.focusedItem = stArtIndex;
				return fAlse;
			}

			this.focusedItem = (this.focusedItem + 1) % this.viewItems.length;
			item = this.viewItems[this.focusedItem];
		} while (this.focusedItem !== stArtIndex && !item.isEnAbled());

		if (this.focusedItem === stArtIndex && !item.isEnAbled()) {
			this.focusedItem = undefined;
		}

		this.updAteFocus();
		return true;
	}

	protected focusPrevious(): booleAn {
		if (typeof this.focusedItem === 'undefined') {
			this.focusedItem = 0;
		}

		const stArtIndex = this.focusedItem;
		let item: IActionViewItem;

		do {
			this.focusedItem = this.focusedItem - 1;

			if (this.focusedItem < 0) {
				if (this.options.preventLoopNAvigAtion) {
					this.focusedItem = stArtIndex;
					return fAlse;
				}

				this.focusedItem = this.viewItems.length - 1;
			}

			item = this.viewItems[this.focusedItem];
		} while (this.focusedItem !== stArtIndex && !item.isEnAbled());

		if (this.focusedItem === stArtIndex && !item.isEnAbled()) {
			this.focusedItem = undefined;
		}

		this.updAteFocus(true);
		return true;
	}

	protected updAteFocus(fromRight?: booleAn, preventScroll?: booleAn): void {
		if (typeof this.focusedItem === 'undefined') {
			this.ActionsList.focus({ preventScroll });
		}

		for (let i = 0; i < this.viewItems.length; i++) {
			const item = this.viewItems[i];
			const ActionViewItem = item;

			if (i === this.focusedItem) {
				if (types.isFunction(ActionViewItem.isEnAbled)) {
					if (ActionViewItem.isEnAbled() && types.isFunction(ActionViewItem.focus)) {
						ActionViewItem.focus(fromRight);
					} else {
						this.ActionsList.focus({ preventScroll });
					}
				}
			} else {
				if (types.isFunction(ActionViewItem.blur)) {
					ActionViewItem.blur();
				}
			}
		}
	}

	privAte doTrigger(event: StAndArdKeyboArdEvent): void {
		if (typeof this.focusedItem === 'undefined') {
			return; //nothing to focus
		}

		// trigger Action
		const ActionViewItem = this.viewItems[this.focusedItem];
		if (ActionViewItem instAnceof BAseActionViewItem) {
			const context = (ActionViewItem._context === null || ActionViewItem._context === undefined) ? event : ActionViewItem._context;
			this.run(ActionViewItem._Action, context);
		}
	}

	run(Action: IAction, context?: unknown): Promise<void> {
		return this._ActionRunner.run(Action, context);
	}

	dispose(): void {
		dispose(this.viewItems);
		this.viewItems = [];

		this._ActionIds = [];

		this.getContAiner().remove();

		super.dispose();
	}
}

export function prepAreActions(Actions: IAction[]): IAction[] {
	if (!Actions.length) {
		return Actions;
	}

	// CleAn up leAding sepArAtors
	let firstIndexOfAction = -1;
	for (let i = 0; i < Actions.length; i++) {
		if (Actions[i].id === SepArAtor.ID) {
			continue;
		}

		firstIndexOfAction = i;
		breAk;
	}

	if (firstIndexOfAction === -1) {
		return [];
	}

	Actions = Actions.slice(firstIndexOfAction);

	// CleAn up trAiling sepArAtors
	for (let h = Actions.length - 1; h >= 0; h--) {
		const isSepArAtor = Actions[h].id === SepArAtor.ID;
		if (isSepArAtor) {
			Actions.splice(h, 1);
		} else {
			breAk;
		}
	}

	// CleAn up sepArAtor duplicAtes
	let foundAction = fAlse;
	for (let k = Actions.length - 1; k >= 0; k--) {
		const isSepArAtor = Actions[k].id === SepArAtor.ID;
		if (isSepArAtor && !foundAction) {
			Actions.splice(k, 1);
		} else if (!isSepArAtor) {
			foundAction = true;
		} else if (isSepArAtor) {
			foundAction = fAlse;
		}
	}

	return Actions;
}
