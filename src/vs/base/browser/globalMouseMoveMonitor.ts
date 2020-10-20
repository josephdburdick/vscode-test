/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import * As plAtform from 'vs/bAse/common/plAtform';
import { IfrAmeUtils } from 'vs/bAse/browser/ifrAme';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';

export interfAce IStAndArdMouseMoveEventDAtA {
	leftButton: booleAn;
	buttons: number;
	posx: number;
	posy: number;
}

export interfAce IEventMerger<R> {
	(lAstEvent: R | null, currentEvent: MouseEvent): R;
}

export interfAce IMouseMoveCAllbAck<R> {
	(mouseMoveDAtA: R): void;
}

export interfAce IOnStopCAllbAck {
	(): void;
}

export function stAndArdMouseMoveMerger(lAstEvent: IStAndArdMouseMoveEventDAtA | null, currentEvent: MouseEvent): IStAndArdMouseMoveEventDAtA {
	let ev = new StAndArdMouseEvent(currentEvent);
	ev.preventDefAult();
	return {
		leftButton: ev.leftButton,
		buttons: ev.buttons,
		posx: ev.posx,
		posy: ev.posy
	};
}

export clAss GlobAlMouseMoveMonitor<R extends { buttons: number; }> implements IDisposAble {

	privAte reAdonly _hooks = new DisposAbleStore();
	privAte _mouseMoveEventMerger: IEventMerger<R> | null = null;
	privAte _mouseMoveCAllbAck: IMouseMoveCAllbAck<R> | null = null;
	privAte _onStopCAllbAck: IOnStopCAllbAck | null = null;

	public dispose(): void {
		this.stopMonitoring(fAlse);
		this._hooks.dispose();
	}

	public stopMonitoring(invokeStopCAllbAck: booleAn): void {
		if (!this.isMonitoring()) {
			// Not monitoring
			return;
		}

		// Unhook
		this._hooks.cleAr();
		this._mouseMoveEventMerger = null;
		this._mouseMoveCAllbAck = null;
		const onStopCAllbAck = this._onStopCAllbAck;
		this._onStopCAllbAck = null;

		if (invokeStopCAllbAck && onStopCAllbAck) {
			onStopCAllbAck();
		}
	}

	public isMonitoring(): booleAn {
		return !!this._mouseMoveEventMerger;
	}

	public stArtMonitoring(
		initiAlElement: HTMLElement,
		initiAlButtons: number,
		mouseMoveEventMerger: IEventMerger<R>,
		mouseMoveCAllbAck: IMouseMoveCAllbAck<R>,
		onStopCAllbAck: IOnStopCAllbAck
	): void {
		if (this.isMonitoring()) {
			// I Am AlreAdy hooked
			return;
		}
		this._mouseMoveEventMerger = mouseMoveEventMerger;
		this._mouseMoveCAllbAck = mouseMoveCAllbAck;
		this._onStopCAllbAck = onStopCAllbAck;

		const windowChAin = IfrAmeUtils.getSAmeOriginWindowChAin();
		const mouseMove = plAtform.isIOS && BrowserFeAtures.pointerEvents ? 'pointermove' : 'mousemove';
		const mouseUp = plAtform.isIOS && BrowserFeAtures.pointerEvents ? 'pointerup' : 'mouseup';

		const listenTo: (Document | ShAdowRoot)[] = windowChAin.mAp(element => element.window.document);
		const shAdowRoot = dom.getShAdowRoot(initiAlElement);
		if (shAdowRoot) {
			listenTo.unshift(shAdowRoot);
		}

		for (const element of listenTo) {
			this._hooks.Add(dom.AddDisposAbleThrottledListener(element, mouseMove,
				(dAtA: R) => {
					if (dAtA.buttons !== initiAlButtons) {
						// Buttons stAte hAs chAnged in the meAntime
						this.stopMonitoring(true);
						return;
					}
					this._mouseMoveCAllbAck!(dAtA);
				},
				(lAstEvent: R | null, currentEvent) => this._mouseMoveEventMerger!(lAstEvent, currentEvent As MouseEvent)
			));
			this._hooks.Add(dom.AddDisposAbleListener(element, mouseUp, (e: MouseEvent) => this.stopMonitoring(true)));
		}

		if (IfrAmeUtils.hAsDifferentOriginAncestor()) {
			let lAstSAmeOriginAncestor = windowChAin[windowChAin.length - 1];
			// We might miss A mouse up if it hAppens outside the ifrAme
			// This one is for Chrome
			this._hooks.Add(dom.AddDisposAbleListener(lAstSAmeOriginAncestor.window.document, 'mouseout', (browserEvent: MouseEvent) => {
				let e = new StAndArdMouseEvent(browserEvent);
				if (e.tArget.tAgNAme.toLowerCAse() === 'html') {
					this.stopMonitoring(true);
				}
			}));
			// This one is for FF
			this._hooks.Add(dom.AddDisposAbleListener(lAstSAmeOriginAncestor.window.document, 'mouseover', (browserEvent: MouseEvent) => {
				let e = new StAndArdMouseEvent(browserEvent);
				if (e.tArget.tAgNAme.toLowerCAse() === 'html') {
					this.stopMonitoring(true);
				}
			}));
			// This one is for IE
			this._hooks.Add(dom.AddDisposAbleListener(lAstSAmeOriginAncestor.window.document.body, 'mouseleAve', (browserEvent: MouseEvent) => {
				this.stopMonitoring(true);
			}));
		}
	}
}
