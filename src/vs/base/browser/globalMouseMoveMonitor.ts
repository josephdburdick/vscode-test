/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import * as platform from 'vs/Base/common/platform';
import { IframeUtils } from 'vs/Base/Browser/iframe';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';

export interface IStandardMouseMoveEventData {
	leftButton: Boolean;
	Buttons: numBer;
	posx: numBer;
	posy: numBer;
}

export interface IEventMerger<R> {
	(lastEvent: R | null, currentEvent: MouseEvent): R;
}

export interface IMouseMoveCallBack<R> {
	(mouseMoveData: R): void;
}

export interface IOnStopCallBack {
	(): void;
}

export function standardMouseMoveMerger(lastEvent: IStandardMouseMoveEventData | null, currentEvent: MouseEvent): IStandardMouseMoveEventData {
	let ev = new StandardMouseEvent(currentEvent);
	ev.preventDefault();
	return {
		leftButton: ev.leftButton,
		Buttons: ev.Buttons,
		posx: ev.posx,
		posy: ev.posy
	};
}

export class GloBalMouseMoveMonitor<R extends { Buttons: numBer; }> implements IDisposaBle {

	private readonly _hooks = new DisposaBleStore();
	private _mouseMoveEventMerger: IEventMerger<R> | null = null;
	private _mouseMoveCallBack: IMouseMoveCallBack<R> | null = null;
	private _onStopCallBack: IOnStopCallBack | null = null;

	puBlic dispose(): void {
		this.stopMonitoring(false);
		this._hooks.dispose();
	}

	puBlic stopMonitoring(invokeStopCallBack: Boolean): void {
		if (!this.isMonitoring()) {
			// Not monitoring
			return;
		}

		// Unhook
		this._hooks.clear();
		this._mouseMoveEventMerger = null;
		this._mouseMoveCallBack = null;
		const onStopCallBack = this._onStopCallBack;
		this._onStopCallBack = null;

		if (invokeStopCallBack && onStopCallBack) {
			onStopCallBack();
		}
	}

	puBlic isMonitoring(): Boolean {
		return !!this._mouseMoveEventMerger;
	}

	puBlic startMonitoring(
		initialElement: HTMLElement,
		initialButtons: numBer,
		mouseMoveEventMerger: IEventMerger<R>,
		mouseMoveCallBack: IMouseMoveCallBack<R>,
		onStopCallBack: IOnStopCallBack
	): void {
		if (this.isMonitoring()) {
			// I am already hooked
			return;
		}
		this._mouseMoveEventMerger = mouseMoveEventMerger;
		this._mouseMoveCallBack = mouseMoveCallBack;
		this._onStopCallBack = onStopCallBack;

		const windowChain = IframeUtils.getSameOriginWindowChain();
		const mouseMove = platform.isIOS && BrowserFeatures.pointerEvents ? 'pointermove' : 'mousemove';
		const mouseUp = platform.isIOS && BrowserFeatures.pointerEvents ? 'pointerup' : 'mouseup';

		const listenTo: (Document | ShadowRoot)[] = windowChain.map(element => element.window.document);
		const shadowRoot = dom.getShadowRoot(initialElement);
		if (shadowRoot) {
			listenTo.unshift(shadowRoot);
		}

		for (const element of listenTo) {
			this._hooks.add(dom.addDisposaBleThrottledListener(element, mouseMove,
				(data: R) => {
					if (data.Buttons !== initialButtons) {
						// Buttons state has changed in the meantime
						this.stopMonitoring(true);
						return;
					}
					this._mouseMoveCallBack!(data);
				},
				(lastEvent: R | null, currentEvent) => this._mouseMoveEventMerger!(lastEvent, currentEvent as MouseEvent)
			));
			this._hooks.add(dom.addDisposaBleListener(element, mouseUp, (e: MouseEvent) => this.stopMonitoring(true)));
		}

		if (IframeUtils.hasDifferentOriginAncestor()) {
			let lastSameOriginAncestor = windowChain[windowChain.length - 1];
			// We might miss a mouse up if it happens outside the iframe
			// This one is for Chrome
			this._hooks.add(dom.addDisposaBleListener(lastSameOriginAncestor.window.document, 'mouseout', (BrowserEvent: MouseEvent) => {
				let e = new StandardMouseEvent(BrowserEvent);
				if (e.target.tagName.toLowerCase() === 'html') {
					this.stopMonitoring(true);
				}
			}));
			// This one is for FF
			this._hooks.add(dom.addDisposaBleListener(lastSameOriginAncestor.window.document, 'mouseover', (BrowserEvent: MouseEvent) => {
				let e = new StandardMouseEvent(BrowserEvent);
				if (e.target.tagName.toLowerCase() === 'html') {
					this.stopMonitoring(true);
				}
			}));
			// This one is for IE
			this._hooks.add(dom.addDisposaBleListener(lastSameOriginAncestor.window.document.Body, 'mouseleave', (BrowserEvent: MouseEvent) => {
				this.stopMonitoring(true);
			}));
		}
	}
}
