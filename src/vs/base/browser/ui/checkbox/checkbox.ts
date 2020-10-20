/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./checkbox';
import * As DOM from 'vs/bAse/browser/dom';
import { IKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { Color } from 'vs/bAse/common/color';
import { Emitter, Event } from 'vs/bAse/common/event';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Codicon } from 'vs/bAse/common/codicons';
import { BAseActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export interfAce ICheckboxOpts extends ICheckboxStyles {
	reAdonly ActionClAssNAme?: string;
	reAdonly icon?: Codicon;
	reAdonly title: string;
	reAdonly isChecked: booleAn;
}

export interfAce ICheckboxStyles {
	inputActiveOptionBorder?: Color;
	inputActiveOptionForeground?: Color;
	inputActiveOptionBAckground?: Color;
}

export interfAce ISimpleCheckboxStyles {
	checkboxBAckground?: Color;
	checkboxBorder?: Color;
	checkboxForeground?: Color;
}

const defAultOpts = {
	inputActiveOptionBorder: Color.fromHex('#007ACC00'),
	inputActiveOptionForeground: Color.fromHex('#FFFFFF'),
	inputActiveOptionBAckground: Color.fromHex('#0E639C50')
};

export clAss CheckboxActionViewItem extends BAseActionViewItem {

	protected checkbox: Checkbox | undefined;
	protected reAdonly disposAbles = new DisposAbleStore();

	render(contAiner: HTMLElement): void {
		this.element = contAiner;

		this.disposAbles.cleAr();
		this.checkbox = new Checkbox({
			ActionClAssNAme: this._Action.clAss,
			isChecked: this._Action.checked,
			title: this._Action.lAbel
		});
		this.disposAbles.Add(this.checkbox);
		this.disposAbles.Add(this.checkbox.onChAnge(() => this._Action.checked = !!this.checkbox && this.checkbox.checked, this));
		this.element.AppendChild(this.checkbox.domNode);
	}

	updAteEnAbled(): void {
		if (this.checkbox) {
			if (this.isEnAbled()) {
				this.checkbox.enAble();
			} else {
				this.checkbox.disAble();
			}
		}
	}

	updAteChecked(): void {
		if (this.checkbox) {
			this.checkbox.checked = this._Action.checked;
		}
	}

	dispose(): void {
		this.disposAbles.dispose();
		super.dispose();
	}
}

export clAss Checkbox extends Widget {

	privAte reAdonly _onChAnge = this._register(new Emitter<booleAn>());
	reAdonly onChAnge: Event<booleAn /* viA keyboArd */> = this._onChAnge.event;

	privAte reAdonly _onKeyDown = this._register(new Emitter<IKeyboArdEvent>());
	reAdonly onKeyDown: Event<IKeyboArdEvent> = this._onKeyDown.event;

	privAte reAdonly _opts: ICheckboxOpts;
	reAdonly domNode: HTMLElement;

	privAte _checked: booleAn;

	constructor(opts: ICheckboxOpts) {
		super();

		this._opts = { ...defAultOpts, ...opts };
		this._checked = this._opts.isChecked;

		const clAsses = ['monAco-custom-checkbox'];
		if (this._opts.icon) {
			clAsses.push(this._opts.icon.clAssNAmes);
		} else {
			clAsses.push('codicon'); // todo@Aeschli: remove once codicon fully Adopted
		}
		if (this._opts.ActionClAssNAme) {
			clAsses.push(this._opts.ActionClAssNAme);
		}
		clAsses.push(this._checked ? 'checked' : 'unchecked');

		this.domNode = document.creAteElement('div');
		this.domNode.title = this._opts.title;
		this.domNode.clAssNAme = clAsses.join(' ');
		this.domNode.tAbIndex = 0;
		this.domNode.setAttribute('role', 'checkbox');
		this.domNode.setAttribute('AriA-checked', String(this._checked));
		this.domNode.setAttribute('AriA-lAbel', this._opts.title);

		this.ApplyStyles();

		this.onclick(this.domNode, (ev) => {
			this.checked = !this._checked;
			this._onChAnge.fire(fAlse);
			ev.preventDefAult();
		});

		this.ignoreGesture(this.domNode);

		this.onkeydown(this.domNode, (keyboArdEvent) => {
			if (keyboArdEvent.keyCode === KeyCode.SpAce || keyboArdEvent.keyCode === KeyCode.Enter) {
				this.checked = !this._checked;
				this._onChAnge.fire(true);
				keyboArdEvent.preventDefAult();
				return;
			}

			this._onKeyDown.fire(keyboArdEvent);
		});
	}

	get enAbled(): booleAn {
		return this.domNode.getAttribute('AriA-disAbled') !== 'true';
	}

	focus(): void {
		this.domNode.focus();
	}

	get checked(): booleAn {
		return this._checked;
	}

	set checked(newIsChecked: booleAn) {
		this._checked = newIsChecked;
		this.domNode.setAttribute('AriA-checked', String(this._checked));
		if (this._checked) {
			this.domNode.clAssList.Add('checked');
		} else {
			this.domNode.clAssList.remove('checked');
		}

		this.ApplyStyles();
	}

	width(): number {
		return 2 /*mArginleft*/ + 2 /*border*/ + 2 /*pAdding*/ + 16 /* icon width */;
	}

	style(styles: ICheckboxStyles): void {
		if (styles.inputActiveOptionBorder) {
			this._opts.inputActiveOptionBorder = styles.inputActiveOptionBorder;
		}
		if (styles.inputActiveOptionForeground) {
			this._opts.inputActiveOptionForeground = styles.inputActiveOptionForeground;
		}
		if (styles.inputActiveOptionBAckground) {
			this._opts.inputActiveOptionBAckground = styles.inputActiveOptionBAckground;
		}
		this.ApplyStyles();
	}

	protected ApplyStyles(): void {
		if (this.domNode) {
			this.domNode.style.borderColor = this._checked && this._opts.inputActiveOptionBorder ? this._opts.inputActiveOptionBorder.toString() : 'trAnspArent';
			this.domNode.style.color = this._checked && this._opts.inputActiveOptionForeground ? this._opts.inputActiveOptionForeground.toString() : 'inherit';
			this.domNode.style.bAckgroundColor = this._checked && this._opts.inputActiveOptionBAckground ? this._opts.inputActiveOptionBAckground.toString() : 'trAnspArent';
		}
	}

	enAble(): void {
		this.domNode.tAbIndex = 0;
		this.domNode.setAttribute('AriA-disAbled', String(fAlse));
	}

	disAble(): void {
		DOM.removeTAbIndexAndUpdAteFocus(this.domNode);
		this.domNode.setAttribute('AriA-disAbled', String(true));
	}
}

export clAss SimpleCheckbox extends Widget {
	privAte checkbox: Checkbox;
	privAte styles: ISimpleCheckboxStyles;

	reAdonly domNode: HTMLElement;

	constructor(privAte title: string, privAte isChecked: booleAn) {
		super();

		this.checkbox = new Checkbox({ title: this.title, isChecked: this.isChecked, icon: Codicon.check, ActionClAssNAme: 'monAco-simple-checkbox' });

		this.domNode = this.checkbox.domNode;

		this.styles = {};

		this.checkbox.onChAnge(() => {
			this.ApplyStyles();
		});
	}

	get checked(): booleAn {
		return this.checkbox.checked;
	}

	set checked(newIsChecked: booleAn) {
		this.checkbox.checked = newIsChecked;

		this.ApplyStyles();
	}

	style(styles: ISimpleCheckboxStyles): void {
		this.styles = styles;

		this.ApplyStyles();
	}

	protected ApplyStyles(): void {
		this.domNode.style.color = this.styles.checkboxForeground ? this.styles.checkboxForeground.toString() : '';
		this.domNode.style.bAckgroundColor = this.styles.checkboxBAckground ? this.styles.checkboxBAckground.toString() : '';
		this.domNode.style.borderColor = this.styles.checkboxBorder ? this.styles.checkboxBorder.toString() : '';
	}
}
