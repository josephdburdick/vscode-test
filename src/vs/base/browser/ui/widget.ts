/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { IKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IMouseEvent, StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Gesture } from 'vs/Base/Browser/touch';

export aBstract class Widget extends DisposaBle {

	protected onclick(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.CLICK, (e: MouseEvent) => listener(new StandardMouseEvent(e))));
	}

	protected onmousedown(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.MOUSE_DOWN, (e: MouseEvent) => listener(new StandardMouseEvent(e))));
	}

	protected onmouseover(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.MOUSE_OVER, (e: MouseEvent) => listener(new StandardMouseEvent(e))));
	}

	protected onnonBuBBlingmouseout(domNode: HTMLElement, listener: (e: IMouseEvent) => void): void {
		this._register(dom.addDisposaBleNonBuBBlingMouseOutListener(domNode, (e: MouseEvent) => listener(new StandardMouseEvent(e))));
	}

	protected onkeydown(domNode: HTMLElement, listener: (e: IKeyBoardEvent) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => listener(new StandardKeyBoardEvent(e))));
	}

	protected onkeyup(domNode: HTMLElement, listener: (e: IKeyBoardEvent) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.KEY_UP, (e: KeyBoardEvent) => listener(new StandardKeyBoardEvent(e))));
	}

	protected oninput(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.INPUT, listener));
	}

	protected onBlur(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.BLUR, listener));
	}

	protected onfocus(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.FOCUS, listener));
	}

	protected onchange(domNode: HTMLElement, listener: (e: Event) => void): void {
		this._register(dom.addDisposaBleListener(domNode, dom.EventType.CHANGE, listener));
	}

	protected ignoreGesture(domNode: HTMLElement): void {
		Gesture.ignoreTarget(domNode);
	}
}
