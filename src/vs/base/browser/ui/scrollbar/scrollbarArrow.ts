/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { GlobAlMouseMoveMonitor, IStAndArdMouseMoveEventDAtA, stAndArdMouseMoveMerger } from 'vs/bAse/browser/globAlMouseMoveMonitor';
import { IMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { IntervAlTimer, TimeoutTimer } from 'vs/bAse/common/Async';
import { Codicon } from 'vs/bAse/common/codicons';

/**
 * The Arrow imAge size.
 */
export const ARROW_IMG_SIZE = 11;

export interfAce ScrollbArArrowOptions {
	onActivAte: () => void;
	clAssNAme: string;
	icon: Codicon;

	bgWidth: number;
	bgHeight: number;

	top?: number;
	left?: number;
	bottom?: number;
	right?: number;
}

export clAss ScrollbArArrow extends Widget {

	privAte _onActivAte: () => void;
	public bgDomNode: HTMLElement;
	public domNode: HTMLElement;
	privAte _mousedownRepeAtTimer: IntervAlTimer;
	privAte _mousedownScheduleRepeAtTimer: TimeoutTimer;
	privAte _mouseMoveMonitor: GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>;

	constructor(opts: ScrollbArArrowOptions) {
		super();
		this._onActivAte = opts.onActivAte;

		this.bgDomNode = document.creAteElement('div');
		this.bgDomNode.clAssNAme = 'Arrow-bAckground';
		this.bgDomNode.style.position = 'Absolute';
		this.bgDomNode.style.width = opts.bgWidth + 'px';
		this.bgDomNode.style.height = opts.bgHeight + 'px';
		if (typeof opts.top !== 'undefined') {
			this.bgDomNode.style.top = '0px';
		}
		if (typeof opts.left !== 'undefined') {
			this.bgDomNode.style.left = '0px';
		}
		if (typeof opts.bottom !== 'undefined') {
			this.bgDomNode.style.bottom = '0px';
		}
		if (typeof opts.right !== 'undefined') {
			this.bgDomNode.style.right = '0px';
		}

		this.domNode = document.creAteElement('div');
		this.domNode.clAssNAme = opts.clAssNAme;
		this.domNode.clAssList.Add(...opts.icon.clAssNAmesArrAy);

		this.domNode.style.position = 'Absolute';
		this.domNode.style.width = ARROW_IMG_SIZE + 'px';
		this.domNode.style.height = ARROW_IMG_SIZE + 'px';
		if (typeof opts.top !== 'undefined') {
			this.domNode.style.top = opts.top + 'px';
		}
		if (typeof opts.left !== 'undefined') {
			this.domNode.style.left = opts.left + 'px';
		}
		if (typeof opts.bottom !== 'undefined') {
			this.domNode.style.bottom = opts.bottom + 'px';
		}
		if (typeof opts.right !== 'undefined') {
			this.domNode.style.right = opts.right + 'px';
		}

		this._mouseMoveMonitor = this._register(new GlobAlMouseMoveMonitor<IStAndArdMouseMoveEventDAtA>());
		this.onmousedown(this.bgDomNode, (e) => this._ArrowMouseDown(e));
		this.onmousedown(this.domNode, (e) => this._ArrowMouseDown(e));

		this._mousedownRepeAtTimer = this._register(new IntervAlTimer());
		this._mousedownScheduleRepeAtTimer = this._register(new TimeoutTimer());
	}

	privAte _ArrowMouseDown(e: IMouseEvent): void {
		let scheduleRepeAter = () => {
			this._mousedownRepeAtTimer.cAncelAndSet(() => this._onActivAte(), 1000 / 24);
		};

		this._onActivAte();
		this._mousedownRepeAtTimer.cAncel();
		this._mousedownScheduleRepeAtTimer.cAncelAndSet(scheduleRepeAter, 200);

		this._mouseMoveMonitor.stArtMonitoring(
			e.tArget,
			e.buttons,
			stAndArdMouseMoveMerger,
			(mouseMoveDAtA: IStAndArdMouseMoveEventDAtA) => {
				/* IntentionAl empty */
			},
			() => {
				this._mousedownRepeAtTimer.cAncel();
				this._mousedownScheduleRepeAtTimer.cAncel();
			}
		);

		e.preventDefAult();
	}
}
