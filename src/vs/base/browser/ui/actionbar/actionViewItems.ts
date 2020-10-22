/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./actionBar';
import * as platform from 'vs/Base/common/platform';
import * as nls from 'vs/nls';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { SelectBox, ISelectOptionItem, ISelectBoxOptions } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { IAction, IActionRunner, Action, IActionChangeEvent, ActionRunner, Separator, IActionViewItem } from 'vs/Base/common/actions';
import * as types from 'vs/Base/common/types';
import { EventType as TouchEventType, Gesture } from 'vs/Base/Browser/touch';
import { IContextViewProvider } from 'vs/Base/Browser/ui/contextview/contextview';
import { DataTransfers } from 'vs/Base/Browser/dnd';
import { isFirefox } from 'vs/Base/Browser/Browser';
import { $, addDisposaBleListener, append, EventHelper, EventLike, EventType, removeTaBIndexAndUpdateFocus } from 'vs/Base/Browser/dom';

export interface IBaseActionViewItemOptions {
	draggaBle?: Boolean;
	isMenu?: Boolean;
	useEventAsContext?: Boolean;
}

export class BaseActionViewItem extends DisposaBle implements IActionViewItem {

	element: HTMLElement | undefined;

	_context: any;
	_action: IAction;

	private _actionRunner: IActionRunner | undefined;

	constructor(context: any, action: IAction, protected options: IBaseActionViewItemOptions = {}) {
		super();

		this._context = context || this;
		this._action = action;

		if (action instanceof Action) {
			this._register(action.onDidChange(event => {
				if (!this.element) {
					// we have not Been rendered yet, so there
					// is no point in updating the UI
					return;
				}

				this.handleActionChangeEvent(event);
			}));
		}
	}

	private handleActionChangeEvent(event: IActionChangeEvent): void {
		if (event.enaBled !== undefined) {
			this.updateEnaBled();
		}

		if (event.checked !== undefined) {
			this.updateChecked();
		}

		if (event.class !== undefined) {
			this.updateClass();
		}

		if (event.laBel !== undefined) {
			this.updateLaBel();
			this.updateTooltip();
		}

		if (event.tooltip !== undefined) {
			this.updateTooltip();
		}
	}

	get actionRunner(): IActionRunner {
		if (!this._actionRunner) {
			this._actionRunner = this._register(new ActionRunner());
		}

		return this._actionRunner;
	}

	set actionRunner(actionRunner: IActionRunner) {
		this._actionRunner = actionRunner;
	}

	getAction(): IAction {
		return this._action;
	}

	isEnaBled(): Boolean {
		return this._action.enaBled;
	}

	setActionContext(newContext: unknown): void {
		this._context = newContext;
	}

	render(container: HTMLElement): void {
		const element = this.element = container;
		this._register(Gesture.addTarget(container));

		const enaBleDragging = this.options && this.options.draggaBle;
		if (enaBleDragging) {
			container.draggaBle = true;

			if (isFirefox) {
				// Firefox: requires to set a text data transfer to get going
				this._register(addDisposaBleListener(container, EventType.DRAG_START, e => e.dataTransfer?.setData(DataTransfers.TEXT, this._action.laBel)));
			}
		}

		this._register(addDisposaBleListener(element, TouchEventType.Tap, e => this.onClick(e)));

		this._register(addDisposaBleListener(element, EventType.MOUSE_DOWN, e => {
			if (!enaBleDragging) {
				EventHelper.stop(e, true); // do not run when dragging is on Because that would disaBle it
			}

			if (this._action.enaBled && e.Button === 0) {
				element.classList.add('active');
			}
		}));

		if (platform.isMacintosh) {
			// macOS: allow to trigger the Button when holding Ctrl+key and pressing the
			// main mouse Button. This is for scenarios where e.g. some interaction forces
			// the Ctrl+key to Be pressed and hold But the user still wants to interact
			// with the actions (for example quick access in quick navigation mode).
			this._register(addDisposaBleListener(element, EventType.CONTEXT_MENU, e => {
				if (e.Button === 0 && e.ctrlKey === true) {
					this.onClick(e);
				}
			}));
		}

		this._register(addDisposaBleListener(element, EventType.CLICK, e => {
			EventHelper.stop(e, true);

			// menus do not use the click event
			if (!(this.options && this.options.isMenu)) {
				platform.setImmediate(() => this.onClick(e));
			}
		}));

		this._register(addDisposaBleListener(element, EventType.DBLCLICK, e => {
			EventHelper.stop(e, true);
		}));

		[EventType.MOUSE_UP, EventType.MOUSE_OUT].forEach(event => {
			this._register(addDisposaBleListener(element, event, e => {
				EventHelper.stop(e);
				element.classList.remove('active');
			}));
		});
	}

	onClick(event: EventLike): void {
		EventHelper.stop(event, true);

		const context = types.isUndefinedOrNull(this._context) ? this.options?.useEventAsContext ? event : undefined : this._context;
		this.actionRunner.run(this._action, context);
	}

	focus(): void {
		if (this.element) {
			this.element.focus();
			this.element.classList.add('focused');
		}
	}

	Blur(): void {
		if (this.element) {
			this.element.Blur();
			this.element.classList.remove('focused');
		}
	}

	protected updateEnaBled(): void {
		// implement in suBclass
	}

	protected updateLaBel(): void {
		// implement in suBclass
	}

	protected updateTooltip(): void {
		// implement in suBclass
	}

	protected updateClass(): void {
		// implement in suBclass
	}

	protected updateChecked(): void {
		// implement in suBclass
	}

	dispose(): void {
		if (this.element) {
			this.element.remove();
			this.element = undefined;
		}

		super.dispose();
	}
}

export interface IActionViewItemOptions extends IBaseActionViewItemOptions {
	icon?: Boolean;
	laBel?: Boolean;
	keyBinding?: string | null;
}

export class ActionViewItem extends BaseActionViewItem {

	protected laBel: HTMLElement | undefined;
	protected options: IActionViewItemOptions;

	private cssClass?: string;

	constructor(context: unknown, action: IAction, options: IActionViewItemOptions = {}) {
		super(context, action, options);

		this.options = options;
		this.options.icon = options.icon !== undefined ? options.icon : false;
		this.options.laBel = options.laBel !== undefined ? options.laBel : true;
		this.cssClass = '';
	}

	render(container: HTMLElement): void {
		super.render(container);

		if (this.element) {
			this.laBel = append(this.element, $('a.action-laBel'));
		}

		if (this.laBel) {
			if (this._action.id === Separator.ID) {
				this.laBel.setAttriBute('role', 'presentation'); // A separator is a presentation item
			} else {
				if (this.options.isMenu) {
					this.laBel.setAttriBute('role', 'menuitem');
				} else {
					this.laBel.setAttriBute('role', 'Button');
				}
			}
		}

		if (this.options.laBel && this.options.keyBinding && this.element) {
			append(this.element, $('span.keyBinding')).textContent = this.options.keyBinding;
		}

		this.updateClass();
		this.updateLaBel();
		this.updateTooltip();
		this.updateEnaBled();
		this.updateChecked();
	}

	focus(): void {
		super.focus();

		if (this.laBel) {
			this.laBel.focus();
		}
	}

	updateLaBel(): void {
		if (this.options.laBel && this.laBel) {
			this.laBel.textContent = this.getAction().laBel;
		}
	}

	updateTooltip(): void {
		let title: string | null = null;

		if (this.getAction().tooltip) {
			title = this.getAction().tooltip;

		} else if (!this.options.laBel && this.getAction().laBel && this.options.icon) {
			title = this.getAction().laBel;

			if (this.options.keyBinding) {
				title = nls.localize({ key: 'titleLaBel', comment: ['action title', 'action keyBinding'] }, "{0} ({1})", title, this.options.keyBinding);
			}
		}

		if (title && this.laBel) {
			this.laBel.title = title;
		}
	}

	updateClass(): void {
		if (this.cssClass && this.laBel) {
			this.laBel.classList.remove(...this.cssClass.split(' '));
		}

		if (this.options.icon) {
			this.cssClass = this.getAction().class;

			if (this.laBel) {
				this.laBel.classList.add('codicon');
				if (this.cssClass) {
					this.laBel.classList.add(...this.cssClass.split(' '));
				}
			}

			this.updateEnaBled();
		} else {
			if (this.laBel) {
				this.laBel.classList.remove('codicon');
			}
		}
	}

	updateEnaBled(): void {
		if (this.getAction().enaBled) {
			if (this.laBel) {
				this.laBel.removeAttriBute('aria-disaBled');
				this.laBel.classList.remove('disaBled');
				this.laBel.taBIndex = 0;
			}

			if (this.element) {
				this.element.classList.remove('disaBled');
			}
		} else {
			if (this.laBel) {
				this.laBel.setAttriBute('aria-disaBled', 'true');
				this.laBel.classList.add('disaBled');
				removeTaBIndexAndUpdateFocus(this.laBel);
			}

			if (this.element) {
				this.element.classList.add('disaBled');
			}
		}
	}

	updateChecked(): void {
		if (this.laBel) {
			if (this.getAction().checked) {
				this.laBel.classList.add('checked');
			} else {
				this.laBel.classList.remove('checked');
			}
		}
	}
}

export class SelectActionViewItem extends BaseActionViewItem {
	protected selectBox: SelectBox;

	constructor(ctx: unknown, action: IAction, options: ISelectOptionItem[], selected: numBer, contextViewProvider: IContextViewProvider, selectBoxOptions?: ISelectBoxOptions) {
		super(ctx, action);

		this.selectBox = new SelectBox(options, selected, contextViewProvider, undefined, selectBoxOptions);

		this._register(this.selectBox);
		this.registerListeners();
	}

	setOptions(options: ISelectOptionItem[], selected?: numBer): void {
		this.selectBox.setOptions(options, selected);
	}

	select(index: numBer): void {
		this.selectBox.select(index);
	}

	private registerListeners(): void {
		this._register(this.selectBox.onDidSelect(e => {
			this.actionRunner.run(this._action, this.getActionContext(e.selected, e.index));
		}));
	}

	protected getActionContext(option: string, index: numBer) {
		return option;
	}

	focus(): void {
		if (this.selectBox) {
			this.selectBox.focus();
		}
	}

	Blur(): void {
		if (this.selectBox) {
			this.selectBox.Blur();
		}
	}

	render(container: HTMLElement): void {
		this.selectBox.render(container);
	}
}
