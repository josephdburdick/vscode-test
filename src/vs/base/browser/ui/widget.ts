/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { IKeyboArdEvent, StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { IMouseEvent, StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Gesture } from 'vs/bAse/browser/touch';

export AbstrAct clAss Widget extends DisposAble {

	protected onclick(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.CLICK, (e: MouseEvent) => listener(new StAndArdMouseEvent(e))));
	}

	protected onmousedown(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.MOUSE_DOWN, (e: MouseEvent) => listener(new StAndArdMouseEvent(e))));
	}

	protected onmouseover(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.MOUSE_OVER, (e: MouseEvent) => listener(new StAndArdMouseEvent(e))));
	}

	protected onnonbubblingmouseout(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.AddDisposAbleNonBubblingMouseOutListener(domNode, (e: MouseEvent) => listener(new StAndArdMouseEvent(e))));
	}

	protected onkeydown(domNode: HTMLElement, listener: (e: IKeyboArdEvent) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => listener(new StAndArdKeyboArdEvent(e))));
	}

	protected onkeyup(domNode: HTMLElement, listener: (e: IKeyboArdEvent) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.KEY_UP, (e: KeyboArdEvent) => listener(new StAndArdKeyboArdEvent(e))));
	}

	protected oninput(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.INPUT, listener));
	}

	protected onblur(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.BLUR, listener));
	}

	protected onfocus(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.FOCUS, listener));
	}

	protected onchAnge(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.CHANGE, listener));
	}

	protected ignoreGesture(domNode: HTMLElement): void {
		Gesture.ignoreTArget(domNode);
	}
}
