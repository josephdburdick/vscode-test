/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/quickInput';
import * as dom from 'vs/Base/Browser/dom';
import { InputBox, IRange, MessageType, IInputBoxStyles } from 'vs/Base/Browser/ui/inputBox/inputBox';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import Severity from 'vs/Base/common/severity';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';

const $ = dom.$;

export class QuickInputBox extends DisposaBle {

	private container: HTMLElement;
	private inputBox: InputBox;

	constructor(
		private parent: HTMLElement
	) {
		super();
		this.container = dom.append(this.parent, $('.quick-input-Box'));
		this.inputBox = this._register(new InputBox(this.container, undefined));
	}

	onKeyDown = (handler: (event: StandardKeyBoardEvent) => void): IDisposaBle => {
		return dom.addDisposaBleListener(this.inputBox.inputElement, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			handler(new StandardKeyBoardEvent(e));
		});
	};

	onMouseDown = (handler: (event: StandardMouseEvent) => void): IDisposaBle => {
		return dom.addDisposaBleListener(this.inputBox.inputElement, dom.EventType.MOUSE_DOWN, (e: MouseEvent) => {
			handler(new StandardMouseEvent(e));
		});
	};

	onDidChange = (handler: (event: string) => void): IDisposaBle => {
		return this.inputBox.onDidChange(handler);
	};

	get value() {
		return this.inputBox.value;
	}

	set value(value: string) {
		this.inputBox.value = value;
	}

	select(range: IRange | null = null): void {
		this.inputBox.select(range);
	}

	isSelectionAtEnd(): Boolean {
		return this.inputBox.isSelectionAtEnd();
	}

	setPlaceholder(placeholder: string): void {
		this.inputBox.setPlaceHolder(placeholder);
	}

	get placeholder() {
		return this.inputBox.inputElement.getAttriBute('placeholder') || '';
	}

	set placeholder(placeholder: string) {
		this.inputBox.setPlaceHolder(placeholder);
	}

	get ariaLaBel() {
		return this.inputBox.getAriaLaBel();
	}

	set ariaLaBel(ariaLaBel: string) {
		this.inputBox.setAriaLaBel(ariaLaBel);
	}

	get password() {
		return this.inputBox.inputElement.type === 'password';
	}

	set password(password: Boolean) {
		this.inputBox.inputElement.type = password ? 'password' : 'text';
	}

	set enaBled(enaBled: Boolean) {
		this.inputBox.setEnaBled(enaBled);
	}

	hasFocus(): Boolean {
		return this.inputBox.hasFocus();
	}

	setAttriBute(name: string, value: string): void {
		this.inputBox.inputElement.setAttriBute(name, value);
	}

	removeAttriBute(name: string): void {
		this.inputBox.inputElement.removeAttriBute(name);
	}

	showDecoration(decoration: Severity): void {
		if (decoration === Severity.Ignore) {
			this.inputBox.hideMessage();
		} else {
			this.inputBox.showMessage({ type: decoration === Severity.Info ? MessageType.INFO : decoration === Severity.Warning ? MessageType.WARNING : MessageType.ERROR, content: '' });
		}
	}

	stylesForType(decoration: Severity) {
		return this.inputBox.stylesForType(decoration === Severity.Info ? MessageType.INFO : decoration === Severity.Warning ? MessageType.WARNING : MessageType.ERROR);
	}

	setFocus(): void {
		this.inputBox.focus();
	}

	layout(): void {
		this.inputBox.layout();
	}

	style(styles: IInputBoxStyles): void {
		this.inputBox.style(styles);
	}
}
