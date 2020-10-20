/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./ActionbAr';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As nls from 'vs/nls';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { SelectBox, ISelectOptionItem, ISelectBoxOptions } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { IAction, IActionRunner, Action, IActionChAngeEvent, ActionRunner, SepArAtor, IActionViewItem } from 'vs/bAse/common/Actions';
import * As types from 'vs/bAse/common/types';
import { EventType As TouchEventType, Gesture } from 'vs/bAse/browser/touch';
import { IContextViewProvider } from 'vs/bAse/browser/ui/contextview/contextview';
import { DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { isFirefox } from 'vs/bAse/browser/browser';
import { $, AddDisposAbleListener, Append, EventHelper, EventLike, EventType, removeTAbIndexAndUpdAteFocus } from 'vs/bAse/browser/dom';

export interfAce IBAseActionViewItemOptions {
	drAggAble?: booleAn;
	isMenu?: booleAn;
	useEventAsContext?: booleAn;
}

export clAss BAseActionViewItem extends DisposAble implements IActionViewItem {

	element: HTMLElement | undefined;

	_context: Any;
	_Action: IAction;

	privAte _ActionRunner: IActionRunner | undefined;

	constructor(context: Any, Action: IAction, protected options: IBAseActionViewItemOptions = {}) {
		super();

		this._context = context || this;
		this._Action = Action;

		if (Action instAnceof Action) {
			this._register(Action.onDidChAnge(event => {
				if (!this.element) {
					// we hAve not been rendered yet, so there
					// is no point in updAting the UI
					return;
				}

				this.hAndleActionChAngeEvent(event);
			}));
		}
	}

	privAte hAndleActionChAngeEvent(event: IActionChAngeEvent): void {
		if (event.enAbled !== undefined) {
			this.updAteEnAbled();
		}

		if (event.checked !== undefined) {
			this.updAteChecked();
		}

		if (event.clAss !== undefined) {
			this.updAteClAss();
		}

		if (event.lAbel !== undefined) {
			this.updAteLAbel();
			this.updAteTooltip();
		}

		if (event.tooltip !== undefined) {
			this.updAteTooltip();
		}
	}

	get ActionRunner(): IActionRunner {
		if (!this._ActionRunner) {
			this._ActionRunner = this._register(new ActionRunner());
		}

		return this._ActionRunner;
	}

	set ActionRunner(ActionRunner: IActionRunner) {
		this._ActionRunner = ActionRunner;
	}

	getAction(): IAction {
		return this._Action;
	}

	isEnAbled(): booleAn {
		return this._Action.enAbled;
	}

	setActionContext(newContext: unknown): void {
		this._context = newContext;
	}

	render(contAiner: HTMLElement): void {
		const element = this.element = contAiner;
		this._register(Gesture.AddTArget(contAiner));

		const enAbleDrAgging = this.options && this.options.drAggAble;
		if (enAbleDrAgging) {
			contAiner.drAggAble = true;

			if (isFirefox) {
				// Firefox: requires to set A text dAtA trAnsfer to get going
				this._register(AddDisposAbleListener(contAiner, EventType.DRAG_START, e => e.dAtATrAnsfer?.setDAtA(DAtATrAnsfers.TEXT, this._Action.lAbel)));
			}
		}

		this._register(AddDisposAbleListener(element, TouchEventType.TAp, e => this.onClick(e)));

		this._register(AddDisposAbleListener(element, EventType.MOUSE_DOWN, e => {
			if (!enAbleDrAgging) {
				EventHelper.stop(e, true); // do not run when drAgging is on becAuse thAt would disAble it
			}

			if (this._Action.enAbled && e.button === 0) {
				element.clAssList.Add('Active');
			}
		}));

		if (plAtform.isMAcintosh) {
			// mAcOS: Allow to trigger the button when holding Ctrl+key And pressing the
			// mAin mouse button. This is for scenArios where e.g. some interAction forces
			// the Ctrl+key to be pressed And hold but the user still wAnts to interAct
			// with the Actions (for exAmple quick Access in quick nAvigAtion mode).
			this._register(AddDisposAbleListener(element, EventType.CONTEXT_MENU, e => {
				if (e.button === 0 && e.ctrlKey === true) {
					this.onClick(e);
				}
			}));
		}

		this._register(AddDisposAbleListener(element, EventType.CLICK, e => {
			EventHelper.stop(e, true);

			// menus do not use the click event
			if (!(this.options && this.options.isMenu)) {
				plAtform.setImmediAte(() => this.onClick(e));
			}
		}));

		this._register(AddDisposAbleListener(element, EventType.DBLCLICK, e => {
			EventHelper.stop(e, true);
		}));

		[EventType.MOUSE_UP, EventType.MOUSE_OUT].forEAch(event => {
			this._register(AddDisposAbleListener(element, event, e => {
				EventHelper.stop(e);
				element.clAssList.remove('Active');
			}));
		});
	}

	onClick(event: EventLike): void {
		EventHelper.stop(event, true);

		const context = types.isUndefinedOrNull(this._context) ? this.options?.useEventAsContext ? event : undefined : this._context;
		this.ActionRunner.run(this._Action, context);
	}

	focus(): void {
		if (this.element) {
			this.element.focus();
			this.element.clAssList.Add('focused');
		}
	}

	blur(): void {
		if (this.element) {
			this.element.blur();
			this.element.clAssList.remove('focused');
		}
	}

	protected updAteEnAbled(): void {
		// implement in subclAss
	}

	protected updAteLAbel(): void {
		// implement in subclAss
	}

	protected updAteTooltip(): void {
		// implement in subclAss
	}

	protected updAteClAss(): void {
		// implement in subclAss
	}

	protected updAteChecked(): void {
		// implement in subclAss
	}

	dispose(): void {
		if (this.element) {
			this.element.remove();
			this.element = undefined;
		}

		super.dispose();
	}
}

export interfAce IActionViewItemOptions extends IBAseActionViewItemOptions {
	icon?: booleAn;
	lAbel?: booleAn;
	keybinding?: string | null;
}

export clAss ActionViewItem extends BAseActionViewItem {

	protected lAbel: HTMLElement | undefined;
	protected options: IActionViewItemOptions;

	privAte cssClAss?: string;

	constructor(context: unknown, Action: IAction, options: IActionViewItemOptions = {}) {
		super(context, Action, options);

		this.options = options;
		this.options.icon = options.icon !== undefined ? options.icon : fAlse;
		this.options.lAbel = options.lAbel !== undefined ? options.lAbel : true;
		this.cssClAss = '';
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		if (this.element) {
			this.lAbel = Append(this.element, $('A.Action-lAbel'));
		}

		if (this.lAbel) {
			if (this._Action.id === SepArAtor.ID) {
				this.lAbel.setAttribute('role', 'presentAtion'); // A sepArAtor is A presentAtion item
			} else {
				if (this.options.isMenu) {
					this.lAbel.setAttribute('role', 'menuitem');
				} else {
					this.lAbel.setAttribute('role', 'button');
				}
			}
		}

		if (this.options.lAbel && this.options.keybinding && this.element) {
			Append(this.element, $('spAn.keybinding')).textContent = this.options.keybinding;
		}

		this.updAteClAss();
		this.updAteLAbel();
		this.updAteTooltip();
		this.updAteEnAbled();
		this.updAteChecked();
	}

	focus(): void {
		super.focus();

		if (this.lAbel) {
			this.lAbel.focus();
		}
	}

	updAteLAbel(): void {
		if (this.options.lAbel && this.lAbel) {
			this.lAbel.textContent = this.getAction().lAbel;
		}
	}

	updAteTooltip(): void {
		let title: string | null = null;

		if (this.getAction().tooltip) {
			title = this.getAction().tooltip;

		} else if (!this.options.lAbel && this.getAction().lAbel && this.options.icon) {
			title = this.getAction().lAbel;

			if (this.options.keybinding) {
				title = nls.locAlize({ key: 'titleLAbel', comment: ['Action title', 'Action keybinding'] }, "{0} ({1})", title, this.options.keybinding);
			}
		}

		if (title && this.lAbel) {
			this.lAbel.title = title;
		}
	}

	updAteClAss(): void {
		if (this.cssClAss && this.lAbel) {
			this.lAbel.clAssList.remove(...this.cssClAss.split(' '));
		}

		if (this.options.icon) {
			this.cssClAss = this.getAction().clAss;

			if (this.lAbel) {
				this.lAbel.clAssList.Add('codicon');
				if (this.cssClAss) {
					this.lAbel.clAssList.Add(...this.cssClAss.split(' '));
				}
			}

			this.updAteEnAbled();
		} else {
			if (this.lAbel) {
				this.lAbel.clAssList.remove('codicon');
			}
		}
	}

	updAteEnAbled(): void {
		if (this.getAction().enAbled) {
			if (this.lAbel) {
				this.lAbel.removeAttribute('AriA-disAbled');
				this.lAbel.clAssList.remove('disAbled');
				this.lAbel.tAbIndex = 0;
			}

			if (this.element) {
				this.element.clAssList.remove('disAbled');
			}
		} else {
			if (this.lAbel) {
				this.lAbel.setAttribute('AriA-disAbled', 'true');
				this.lAbel.clAssList.Add('disAbled');
				removeTAbIndexAndUpdAteFocus(this.lAbel);
			}

			if (this.element) {
				this.element.clAssList.Add('disAbled');
			}
		}
	}

	updAteChecked(): void {
		if (this.lAbel) {
			if (this.getAction().checked) {
				this.lAbel.clAssList.Add('checked');
			} else {
				this.lAbel.clAssList.remove('checked');
			}
		}
	}
}

export clAss SelectActionViewItem extends BAseActionViewItem {
	protected selectBox: SelectBox;

	constructor(ctx: unknown, Action: IAction, options: ISelectOptionItem[], selected: number, contextViewProvider: IContextViewProvider, selectBoxOptions?: ISelectBoxOptions) {
		super(ctx, Action);

		this.selectBox = new SelectBox(options, selected, contextViewProvider, undefined, selectBoxOptions);

		this._register(this.selectBox);
		this.registerListeners();
	}

	setOptions(options: ISelectOptionItem[], selected?: number): void {
		this.selectBox.setOptions(options, selected);
	}

	select(index: number): void {
		this.selectBox.select(index);
	}

	privAte registerListeners(): void {
		this._register(this.selectBox.onDidSelect(e => {
			this.ActionRunner.run(this._Action, this.getActionContext(e.selected, e.index));
		}));
	}

	protected getActionContext(option: string, index: number) {
		return option;
	}

	focus(): void {
		if (this.selectBox) {
			this.selectBox.focus();
		}
	}

	blur(): void {
		if (this.selectBox) {
			this.selectBox.blur();
		}
	}

	render(contAiner: HTMLElement): void {
		this.selectBox.render(contAiner);
	}
}
