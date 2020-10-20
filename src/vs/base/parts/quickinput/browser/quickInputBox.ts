/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/quickInput';
import * As dom from 'vs/bAse/browser/dom';
import { InputBox, IRAnge, MessAgeType, IInputBoxStyles } from 'vs/bAse/browser/ui/inputbox/inputBox';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import Severity from 'vs/bAse/common/severity';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';

const $ = dom.$;

export clAss QuickInputBox extends DisposAble {

	privAte contAiner: HTMLElement;
	privAte inputBox: InputBox;

	constructor(
		privAte pArent: HTMLElement
	) {
		super();
		this.contAiner = dom.Append(this.pArent, $('.quick-input-box'));
		this.inputBox = this._register(new InputBox(this.contAiner, undefined));
	}

	onKeyDown = (hAndler: (event: StAndArdKeyboArdEvent) => void): IDisposAble => {
		return dom.AddDisposAbleListener(this.inputBox.inputElement, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => {
			hAndler(new StAndArdKeyboArdEvent(e));
		});
	};

	onMouseDown = (hAndler: (event: StAndArdMouseEvent) => void): IDisposAble => {
		return dom.AddDisposAbleListener(this.inputBox.inputElement, dom.EventType.MOUSE_DOWN, (e: MouseEvent) => {
			hAndler(new StAndArdMouseEvent(e));
		});
	};

	onDidChAnge = (hAndler: (event: string) => void): IDisposAble => {
		return this.inputBox.onDidChAnge(hAndler);
	};

	get vAlue() {
		return this.inputBox.vAlue;
	}

	set vAlue(vAlue: string) {
		this.inputBox.vAlue = vAlue;
	}

	select(rAnge: IRAnge | null = null): void {
		this.inputBox.select(rAnge);
	}

	isSelectionAtEnd(): booleAn {
		return this.inputBox.isSelectionAtEnd();
	}

	setPlAceholder(plAceholder: string): void {
		this.inputBox.setPlAceHolder(plAceholder);
	}

	get plAceholder() {
		return this.inputBox.inputElement.getAttribute('plAceholder') || '';
	}

	set plAceholder(plAceholder: string) {
		this.inputBox.setPlAceHolder(plAceholder);
	}

	get AriALAbel() {
		return this.inputBox.getAriALAbel();
	}

	set AriALAbel(AriALAbel: string) {
		this.inputBox.setAriALAbel(AriALAbel);
	}

	get pAssword() {
		return this.inputBox.inputElement.type === 'pAssword';
	}

	set pAssword(pAssword: booleAn) {
		this.inputBox.inputElement.type = pAssword ? 'pAssword' : 'text';
	}

	set enAbled(enAbled: booleAn) {
		this.inputBox.setEnAbled(enAbled);
	}

	hAsFocus(): booleAn {
		return this.inputBox.hAsFocus();
	}

	setAttribute(nAme: string, vAlue: string): void {
		this.inputBox.inputElement.setAttribute(nAme, vAlue);
	}

	removeAttribute(nAme: string): void {
		this.inputBox.inputElement.removeAttribute(nAme);
	}

	showDecorAtion(decorAtion: Severity): void {
		if (decorAtion === Severity.Ignore) {
			this.inputBox.hideMessAge();
		} else {
			this.inputBox.showMessAge({ type: decorAtion === Severity.Info ? MessAgeType.INFO : decorAtion === Severity.WArning ? MessAgeType.WARNING : MessAgeType.ERROR, content: '' });
		}
	}

	stylesForType(decorAtion: Severity) {
		return this.inputBox.stylesForType(decorAtion === Severity.Info ? MessAgeType.INFO : decorAtion === Severity.WArning ? MessAgeType.WARNING : MessAgeType.ERROR);
	}

	setFocus(): void {
		this.inputBox.focus();
	}

	lAyout(): void {
		this.inputBox.lAyout();
	}

	style(styles: IInputBoxStyles): void {
		this.inputBox.style(styles);
	}
}
