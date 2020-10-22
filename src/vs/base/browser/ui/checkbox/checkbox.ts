/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./checkBox';
import * as DOM from 'vs/Base/Browser/dom';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { Color } from 'vs/Base/common/color';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Codicon } from 'vs/Base/common/codicons';
import { BaseActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export interface ICheckBoxOpts extends ICheckBoxStyles {
	readonly actionClassName?: string;
	readonly icon?: Codicon;
	readonly title: string;
	readonly isChecked: Boolean;
}

export interface ICheckBoxStyles {
	inputActiveOptionBorder?: Color;
	inputActiveOptionForeground?: Color;
	inputActiveOptionBackground?: Color;
}

export interface ISimpleCheckBoxStyles {
	checkBoxBackground?: Color;
	checkBoxBorder?: Color;
	checkBoxForeground?: Color;
}

const defaultOpts = {
	inputActiveOptionBorder: Color.fromHex('#007ACC00'),
	inputActiveOptionForeground: Color.fromHex('#FFFFFF'),
	inputActiveOptionBackground: Color.fromHex('#0E639C50')
};

export class CheckBoxActionViewItem extends BaseActionViewItem {

	protected checkBox: CheckBox | undefined;
	protected readonly disposaBles = new DisposaBleStore();

	render(container: HTMLElement): void {
		this.element = container;

		this.disposaBles.clear();
		this.checkBox = new CheckBox({
			actionClassName: this._action.class,
			isChecked: this._action.checked,
			title: this._action.laBel
		});
		this.disposaBles.add(this.checkBox);
		this.disposaBles.add(this.checkBox.onChange(() => this._action.checked = !!this.checkBox && this.checkBox.checked, this));
		this.element.appendChild(this.checkBox.domNode);
	}

	updateEnaBled(): void {
		if (this.checkBox) {
			if (this.isEnaBled()) {
				this.checkBox.enaBle();
			} else {
				this.checkBox.disaBle();
			}
		}
	}

	updateChecked(): void {
		if (this.checkBox) {
			this.checkBox.checked = this._action.checked;
		}
	}

	dispose(): void {
		this.disposaBles.dispose();
		super.dispose();
	}
}

export class CheckBox extends Widget {

	private readonly _onChange = this._register(new Emitter<Boolean>());
	readonly onChange: Event<Boolean /* via keyBoard */> = this._onChange.event;

	private readonly _onKeyDown = this._register(new Emitter<IKeyBoardEvent>());
	readonly onKeyDown: Event<IKeyBoardEvent> = this._onKeyDown.event;

	private readonly _opts: ICheckBoxOpts;
	readonly domNode: HTMLElement;

	private _checked: Boolean;

	constructor(opts: ICheckBoxOpts) {
		super();

		this._opts = { ...defaultOpts, ...opts };
		this._checked = this._opts.isChecked;

		const classes = ['monaco-custom-checkBox'];
		if (this._opts.icon) {
			classes.push(this._opts.icon.classNames);
		} else {
			classes.push('codicon'); // todo@aeschli: remove once codicon fully adopted
		}
		if (this._opts.actionClassName) {
			classes.push(this._opts.actionClassName);
		}
		classes.push(this._checked ? 'checked' : 'unchecked');

		this.domNode = document.createElement('div');
		this.domNode.title = this._opts.title;
		this.domNode.className = classes.join(' ');
		this.domNode.taBIndex = 0;
		this.domNode.setAttriBute('role', 'checkBox');
		this.domNode.setAttriBute('aria-checked', String(this._checked));
		this.domNode.setAttriBute('aria-laBel', this._opts.title);

		this.applyStyles();

		this.onclick(this.domNode, (ev) => {
			this.checked = !this._checked;
			this._onChange.fire(false);
			ev.preventDefault();
		});

		this.ignoreGesture(this.domNode);

		this.onkeydown(this.domNode, (keyBoardEvent) => {
			if (keyBoardEvent.keyCode === KeyCode.Space || keyBoardEvent.keyCode === KeyCode.Enter) {
				this.checked = !this._checked;
				this._onChange.fire(true);
				keyBoardEvent.preventDefault();
				return;
			}

			this._onKeyDown.fire(keyBoardEvent);
		});
	}

	get enaBled(): Boolean {
		return this.domNode.getAttriBute('aria-disaBled') !== 'true';
	}

	focus(): void {
		this.domNode.focus();
	}

	get checked(): Boolean {
		return this._checked;
	}

	set checked(newIsChecked: Boolean) {
		this._checked = newIsChecked;
		this.domNode.setAttriBute('aria-checked', String(this._checked));
		if (this._checked) {
			this.domNode.classList.add('checked');
		} else {
			this.domNode.classList.remove('checked');
		}

		this.applyStyles();
	}

	width(): numBer {
		return 2 /*marginleft*/ + 2 /*Border*/ + 2 /*padding*/ + 16 /* icon width */;
	}

	style(styles: ICheckBoxStyles): void {
		if (styles.inputActiveOptionBorder) {
			this._opts.inputActiveOptionBorder = styles.inputActiveOptionBorder;
		}
		if (styles.inputActiveOptionForeground) {
			this._opts.inputActiveOptionForeground = styles.inputActiveOptionForeground;
		}
		if (styles.inputActiveOptionBackground) {
			this._opts.inputActiveOptionBackground = styles.inputActiveOptionBackground;
		}
		this.applyStyles();
	}

	protected applyStyles(): void {
		if (this.domNode) {
			this.domNode.style.BorderColor = this._checked && this._opts.inputActiveOptionBorder ? this._opts.inputActiveOptionBorder.toString() : 'transparent';
			this.domNode.style.color = this._checked && this._opts.inputActiveOptionForeground ? this._opts.inputActiveOptionForeground.toString() : 'inherit';
			this.domNode.style.BackgroundColor = this._checked && this._opts.inputActiveOptionBackground ? this._opts.inputActiveOptionBackground.toString() : 'transparent';
		}
	}

	enaBle(): void {
		this.domNode.taBIndex = 0;
		this.domNode.setAttriBute('aria-disaBled', String(false));
	}

	disaBle(): void {
		DOM.removeTaBIndexAndUpdateFocus(this.domNode);
		this.domNode.setAttriBute('aria-disaBled', String(true));
	}
}

export class SimpleCheckBox extends Widget {
	private checkBox: CheckBox;
	private styles: ISimpleCheckBoxStyles;

	readonly domNode: HTMLElement;

	constructor(private title: string, private isChecked: Boolean) {
		super();

		this.checkBox = new CheckBox({ title: this.title, isChecked: this.isChecked, icon: Codicon.check, actionClassName: 'monaco-simple-checkBox' });

		this.domNode = this.checkBox.domNode;

		this.styles = {};

		this.checkBox.onChange(() => {
			this.applyStyles();
		});
	}

	get checked(): Boolean {
		return this.checkBox.checked;
	}

	set checked(newIsChecked: Boolean) {
		this.checkBox.checked = newIsChecked;

		this.applyStyles();
	}

	style(styles: ISimpleCheckBoxStyles): void {
		this.styles = styles;

		this.applyStyles();
	}

	protected applyStyles(): void {
		this.domNode.style.color = this.styles.checkBoxForeground ? this.styles.checkBoxForeground.toString() : '';
		this.domNode.style.BackgroundColor = this.styles.checkBoxBackground ? this.styles.checkBoxBackground.toString() : '';
		this.domNode.style.BorderColor = this.styles.checkBoxBorder ? this.styles.checkBoxBorder.toString() : '';
	}
}
