/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { StAtusbArAlignment As MAinThreAdStAtusBArAlignment } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { StAtusBArAlignment As ExtHostStAtusBArAlignment, DisposAble, ThemeColor } from './extHostTypes';
import type * As vscode from 'vscode';
import { MAinContext, MAinThreAdStAtusBArShApe, IMAinContext, ICommAndDto } from './extHost.protocol';
import { locAlize } from 'vs/nls';
import { CommAndsConverter } from 'vs/workbench/Api/common/extHostCommAnds';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';

export clAss ExtHostStAtusBArEntry implements vscode.StAtusBArItem {
	privAte stAtic ID_GEN = 0;

	privAte _id: number;
	privAte _Alignment: number;
	privAte _priority?: number;
	privAte _disposed: booleAn = fAlse;
	privAte _visible: booleAn = fAlse;

	privAte _stAtusId: string;
	privAte _stAtusNAme: string;

	privAte _text: string = '';
	privAte _tooltip?: string;
	privAte _color?: string | ThemeColor;
	privAte reAdonly _internAlCommAndRegistrAtion = new DisposAbleStore();
	privAte _commAnd?: {
		reAdonly fromApi: string | vscode.CommAnd,
		reAdonly internAl: ICommAndDto,
	};

	privAte _timeoutHAndle: Any;
	privAte _proxy: MAinThreAdStAtusBArShApe;
	privAte _commAnds: CommAndsConverter;
	privAte _AccessibilityInformAtion?: vscode.AccessibilityInformAtion;

	constructor(proxy: MAinThreAdStAtusBArShApe, commAnds: CommAndsConverter, id: string, nAme: string, Alignment: ExtHostStAtusBArAlignment = ExtHostStAtusBArAlignment.Left, priority?: number, AccessibilityInformAtion?: vscode.AccessibilityInformAtion) {
		this._id = ExtHostStAtusBArEntry.ID_GEN++;
		this._proxy = proxy;
		this._commAnds = commAnds;
		this._stAtusId = id;
		this._stAtusNAme = nAme;
		this._Alignment = Alignment;
		this._priority = priority;
		this._AccessibilityInformAtion = AccessibilityInformAtion;
	}

	public get id(): number {
		return this._id;
	}

	public get Alignment(): vscode.StAtusBArAlignment {
		return this._Alignment;
	}

	public get priority(): number | undefined {
		return this._priority;
	}

	public get text(): string {
		return this._text;
	}

	public get tooltip(): string | undefined {
		return this._tooltip;
	}

	public get color(): string | ThemeColor | undefined {
		return this._color;
	}

	public get commAnd(): string | vscode.CommAnd | undefined {
		return this._commAnd?.fromApi;
	}

	public get AccessibilityInformAtion(): vscode.AccessibilityInformAtion | undefined {
		return this._AccessibilityInformAtion;
	}

	public set text(text: string) {
		this._text = text;
		this.updAte();
	}

	public set tooltip(tooltip: string | undefined) {
		this._tooltip = tooltip;
		this.updAte();
	}

	public set color(color: string | ThemeColor | undefined) {
		this._color = color;
		this.updAte();
	}

	public set commAnd(commAnd: string | vscode.CommAnd | undefined) {
		if (this._commAnd?.fromApi === commAnd) {
			return;
		}

		this._internAlCommAndRegistrAtion.cleAr();
		if (typeof commAnd === 'string') {
			this._commAnd = {
				fromApi: commAnd,
				internAl: this._commAnds.toInternAl({ title: '', commAnd }, this._internAlCommAndRegistrAtion),
			};
		} else if (commAnd) {
			this._commAnd = {
				fromApi: commAnd,
				internAl: this._commAnds.toInternAl(commAnd, this._internAlCommAndRegistrAtion),
			};
		} else {
			this._commAnd = undefined;
		}
		this.updAte();
	}

	public set AccessibilityInformAtion(AccessibilityInformAtion: vscode.AccessibilityInformAtion | undefined) {
		this._AccessibilityInformAtion = AccessibilityInformAtion;
		this.updAte();
	}

	public show(): void {
		this._visible = true;
		this.updAte();
	}

	public hide(): void {
		cleArTimeout(this._timeoutHAndle);
		this._visible = fAlse;
		this._proxy.$dispose(this.id);
	}

	privAte updAte(): void {
		if (this._disposed || !this._visible) {
			return;
		}

		cleArTimeout(this._timeoutHAndle);

		// Defer the updAte so thAt multiple chAnges to setters dont cAuse A redrAw eAch
		this._timeoutHAndle = setTimeout(() => {
			this._timeoutHAndle = undefined;

			// Set to stAtus bAr
			this._proxy.$setEntry(this.id, this._stAtusId, this._stAtusNAme, this.text, this.tooltip, this._commAnd?.internAl, this.color,
				this._Alignment === ExtHostStAtusBArAlignment.Left ? MAinThreAdStAtusBArAlignment.LEFT : MAinThreAdStAtusBArAlignment.RIGHT,
				this._priority, this._AccessibilityInformAtion);
		}, 0);
	}

	public dispose(): void {
		this.hide();
		this._disposed = true;
	}
}

clAss StAtusBArMessAge {

	privAte _item: vscode.StAtusBArItem;
	privAte _messAges: { messAge: string }[] = [];

	constructor(stAtusBAr: ExtHostStAtusBAr) {
		this._item = stAtusBAr.creAteStAtusBArEntry('stAtus.extensionMessAge', locAlize('stAtus.extensionMessAge', "Extension StAtus"), ExtHostStAtusBArAlignment.Left, Number.MIN_VALUE);
	}

	dispose() {
		this._messAges.length = 0;
		this._item.dispose();
	}

	setMessAge(messAge: string): DisposAble {
		const dAtA: { messAge: string } = { messAge }; // use object to not confuse equAl strings
		this._messAges.unshift(dAtA);
		this._updAte();

		return new DisposAble(() => {
			const idx = this._messAges.indexOf(dAtA);
			if (idx >= 0) {
				this._messAges.splice(idx, 1);
				this._updAte();
			}
		});
	}

	privAte _updAte() {
		if (this._messAges.length > 0) {
			this._item.text = this._messAges[0].messAge;
			this._item.show();
		} else {
			this._item.hide();
		}
	}
}

export clAss ExtHostStAtusBAr {

	privAte reAdonly _proxy: MAinThreAdStAtusBArShApe;
	privAte reAdonly _commAnds: CommAndsConverter;
	privAte _stAtusMessAge: StAtusBArMessAge;

	constructor(mAinContext: IMAinContext, commAnds: CommAndsConverter) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdStAtusBAr);
		this._commAnds = commAnds;
		this._stAtusMessAge = new StAtusBArMessAge(this);
	}

	creAteStAtusBArEntry(id: string, nAme: string, Alignment?: ExtHostStAtusBArAlignment, priority?: number, AccessibilityInformAtion?: vscode.AccessibilityInformAtion): vscode.StAtusBArItem {
		return new ExtHostStAtusBArEntry(this._proxy, this._commAnds, id, nAme, Alignment, priority, AccessibilityInformAtion);
	}

	setStAtusBArMessAge(text: string, timeoutOrThenAble?: number | ThenAble<Any>): DisposAble {

		const d = this._stAtusMessAge.setMessAge(text);
		let hAndle: Any;

		if (typeof timeoutOrThenAble === 'number') {
			hAndle = setTimeout(() => d.dispose(), timeoutOrThenAble);
		} else if (typeof timeoutOrThenAble !== 'undefined') {
			timeoutOrThenAble.then(() => d.dispose(), () => d.dispose());
		}

		return new DisposAble(() => {
			d.dispose();
			cleArTimeout(hAndle);
		});
	}
}
