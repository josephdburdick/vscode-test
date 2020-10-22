/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GloBalMouseMoveMonitor, IStandardMouseMoveEventData, standardMouseMoveMerger } from 'vs/Base/Browser/gloBalMouseMoveMonitor';
import { IMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { IntervalTimer, TimeoutTimer } from 'vs/Base/common/async';
import { Codicon } from 'vs/Base/common/codicons';

/**
 * The arrow image size.
 */
export const ARROW_IMG_SIZE = 11;

export interface ScrollBarArrowOptions {
	onActivate: () => void;
	className: string;
	icon: Codicon;

	BgWidth: numBer;
	BgHeight: numBer;

	top?: numBer;
	left?: numBer;
	Bottom?: numBer;
	right?: numBer;
}

export class ScrollBarArrow extends Widget {

	private _onActivate: () => void;
	puBlic BgDomNode: HTMLElement;
	puBlic domNode: HTMLElement;
	private _mousedownRepeatTimer: IntervalTimer;
	private _mousedownScheduleRepeatTimer: TimeoutTimer;
	private _mouseMoveMonitor: GloBalMouseMoveMonitor<IStandardMouseMoveEventData>;

	constructor(opts: ScrollBarArrowOptions) {
		super();
		this._onActivate = opts.onActivate;

		this.BgDomNode = document.createElement('div');
		this.BgDomNode.className = 'arrow-Background';
		this.BgDomNode.style.position = 'aBsolute';
		this.BgDomNode.style.width = opts.BgWidth + 'px';
		this.BgDomNode.style.height = opts.BgHeight + 'px';
		if (typeof opts.top !== 'undefined') {
			this.BgDomNode.style.top = '0px';
		}
		if (typeof opts.left !== 'undefined') {
			this.BgDomNode.style.left = '0px';
		}
		if (typeof opts.Bottom !== 'undefined') {
			this.BgDomNode.style.Bottom = '0px';
		}
		if (typeof opts.right !== 'undefined') {
			this.BgDomNode.style.right = '0px';
		}

		this.domNode = document.createElement('div');
		this.domNode.className = opts.className;
		this.domNode.classList.add(...opts.icon.classNamesArray);

		this.domNode.style.position = 'aBsolute';
		this.domNode.style.width = ARROW_IMG_SIZE + 'px';
		this.domNode.style.height = ARROW_IMG_SIZE + 'px';
		if (typeof opts.top !== 'undefined') {
			this.domNode.style.top = opts.top + 'px';
		}
		if (typeof opts.left !== 'undefined') {
			this.domNode.style.left = opts.left + 'px';
		}
		if (typeof opts.Bottom !== 'undefined') {
			this.domNode.style.Bottom = opts.Bottom + 'px';
		}
		if (typeof opts.right !== 'undefined') {
			this.domNode.style.right = opts.right + 'px';
		}

		this._mouseMoveMonitor = this._register(new GloBalMouseMoveMonitor<IStandardMouseMoveEventData>());
		this.onmousedown(this.BgDomNode, (e) => this._arrowMouseDown(e));
		this.onmousedown(this.domNode, (e) => this._arrowMouseDown(e));

		this._mousedownRepeatTimer = this._register(new IntervalTimer());
		this._mousedownScheduleRepeatTimer = this._register(new TimeoutTimer());
	}

	private _arrowMouseDown(e: IMouseEvent): void {
		let scheduleRepeater = () => {
			this._mousedownRepeatTimer.cancelAndSet(() => this._onActivate(), 1000 / 24);
		};

		this._onActivate();
		this._mousedownRepeatTimer.cancel();
		this._mousedownScheduleRepeatTimer.cancelAndSet(scheduleRepeater, 200);

		this._mouseMoveMonitor.startMonitoring(
			e.target,
			e.Buttons,
			standardMouseMoveMerger,
			(mouseMoveData: IStandardMouseMoveEventData) => {
				/* Intentional empty */
			},
			() => {
				this._mousedownRepeatTimer.cancel();
				this._mousedownScheduleRepeatTimer.cancel();
			}
		);

		e.preventDefault();
	}
}
