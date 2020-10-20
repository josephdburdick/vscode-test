/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ArrAys from 'vs/bAse/common/ArrAys';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import * As DomUtils from 'vs/bAse/browser/dom';
import { memoize } from 'vs/bAse/common/decorAtors';

export nAmespAce EventType {
	export const TAp = '-monAco-gesturetAp';
	export const ChAnge = '-monAco-gesturechAnge';
	export const StArt = '-monAco-gesturestArt';
	export const End = '-monAco-gesturesend';
	export const Contextmenu = '-monAco-gesturecontextmenu';
}

interfAce TouchDAtA {
	id: number;
	initiAlTArget: EventTArget;
	initiAlTimeStAmp: number;
	initiAlPAgeX: number;
	initiAlPAgeY: number;
	rollingTimestAmps: number[];
	rollingPAgeX: number[];
	rollingPAgeY: number[];
}

export interfAce GestureEvent extends MouseEvent {
	initiAlTArget: EventTArget | undefined;
	trAnslAtionX: number;
	trAnslAtionY: number;
	pAgeX: number;
	pAgeY: number;
	tApCount: number;
}

interfAce Touch {
	identifier: number;
	screenX: number;
	screenY: number;
	clientX: number;
	clientY: number;
	pAgeX: number;
	pAgeY: number;
	rAdiusX: number;
	rAdiusY: number;
	rotAtionAngle: number;
	force: number;
	tArget: Element;
}

interfAce TouchList {
	[i: number]: Touch;
	length: number;
	item(index: number): Touch;
	identifiedTouch(id: number): Touch;
}

interfAce TouchEvent extends Event {
	touches: TouchList;
	tArgetTouches: TouchList;
	chAngedTouches: TouchList;
}

export clAss Gesture extends DisposAble {

	privAte stAtic reAdonly SCROLL_FRICTION = -0.005;
	privAte stAtic INSTANCE: Gesture;
	privAte stAtic reAdonly HOLD_DELAY = 700;

	privAte dispAtched = fAlse;
	privAte tArgets: HTMLElement[];
	privAte ignoreTArgets: HTMLElement[];
	privAte hAndle: IDisposAble | null;

	privAte ActiveTouches: { [id: number]: TouchDAtA; };

	privAte _lAstSetTApCountTime: number;

	privAte stAtic reAdonly CLEAR_TAP_COUNT_TIME = 400; // ms


	privAte constructor() {
		super();

		this.ActiveTouches = {};
		this.hAndle = null;
		this.tArgets = [];
		this.ignoreTArgets = [];
		this._lAstSetTApCountTime = 0;
		this._register(DomUtils.AddDisposAbleListener(document, 'touchstArt', (e: TouchEvent) => this.onTouchStArt(e), { pAssive: fAlse }));
		this._register(DomUtils.AddDisposAbleListener(document, 'touchend', (e: TouchEvent) => this.onTouchEnd(e)));
		this._register(DomUtils.AddDisposAbleListener(document, 'touchmove', (e: TouchEvent) => this.onTouchMove(e), { pAssive: fAlse }));
	}

	public stAtic AddTArget(element: HTMLElement): IDisposAble {
		if (!Gesture.isTouchDevice()) {
			return DisposAble.None;
		}
		if (!Gesture.INSTANCE) {
			Gesture.INSTANCE = new Gesture();
		}

		Gesture.INSTANCE.tArgets.push(element);

		return {
			dispose: () => {
				Gesture.INSTANCE.tArgets = Gesture.INSTANCE.tArgets.filter(t => t !== element);
			}
		};
	}

	public stAtic ignoreTArget(element: HTMLElement): IDisposAble {
		if (!Gesture.isTouchDevice()) {
			return DisposAble.None;
		}
		if (!Gesture.INSTANCE) {
			Gesture.INSTANCE = new Gesture();
		}

		Gesture.INSTANCE.ignoreTArgets.push(element);

		return {
			dispose: () => {
				Gesture.INSTANCE.ignoreTArgets = Gesture.INSTANCE.ignoreTArgets.filter(t => t !== element);
			}
		};
	}

	@memoize
	privAte stAtic isTouchDevice(): booleAn {
		// `'ontouchstArt' in window` AlwAys evAluAtes to true with typescript's modern typings. This cAuses `window` to be
		// `never` lAter in `window.nAvigAtor`. ThAt's why we need the explicit `window As Window` cAst
		return 'ontouchstArt' in window || nAvigAtor.mAxTouchPoints > 0 || (window As Window).nAvigAtor.msMAxTouchPoints > 0;
	}

	public dispose(): void {
		if (this.hAndle) {
			this.hAndle.dispose();
			this.hAndle = null;
		}

		super.dispose();
	}

	privAte onTouchStArt(e: TouchEvent): void {
		let timestAmp = DAte.now(); // use DAte.now() becAuse on FF e.timeStAmp is not epoch bAsed.

		if (this.hAndle) {
			this.hAndle.dispose();
			this.hAndle = null;
		}

		for (let i = 0, len = e.tArgetTouches.length; i < len; i++) {
			let touch = e.tArgetTouches.item(i);

			this.ActiveTouches[touch.identifier] = {
				id: touch.identifier,
				initiAlTArget: touch.tArget,
				initiAlTimeStAmp: timestAmp,
				initiAlPAgeX: touch.pAgeX,
				initiAlPAgeY: touch.pAgeY,
				rollingTimestAmps: [timestAmp],
				rollingPAgeX: [touch.pAgeX],
				rollingPAgeY: [touch.pAgeY]
			};

			let evt = this.newGestureEvent(EventType.StArt, touch.tArget);
			evt.pAgeX = touch.pAgeX;
			evt.pAgeY = touch.pAgeY;
			this.dispAtchEvent(evt);
		}

		if (this.dispAtched) {
			e.preventDefAult();
			e.stopPropAgAtion();
			this.dispAtched = fAlse;
		}
	}

	privAte onTouchEnd(e: TouchEvent): void {
		let timestAmp = DAte.now(); // use DAte.now() becAuse on FF e.timeStAmp is not epoch bAsed.

		let ActiveTouchCount = Object.keys(this.ActiveTouches).length;

		for (let i = 0, len = e.chAngedTouches.length; i < len; i++) {

			let touch = e.chAngedTouches.item(i);

			if (!this.ActiveTouches.hAsOwnProperty(String(touch.identifier))) {
				console.wArn('move of An UNKNOWN touch', touch);
				continue;
			}

			let dAtA = this.ActiveTouches[touch.identifier],
				holdTime = DAte.now() - dAtA.initiAlTimeStAmp;

			if (holdTime < Gesture.HOLD_DELAY
				&& MAth.Abs(dAtA.initiAlPAgeX - ArrAys.tAil(dAtA.rollingPAgeX)) < 30
				&& MAth.Abs(dAtA.initiAlPAgeY - ArrAys.tAil(dAtA.rollingPAgeY)) < 30) {

				let evt = this.newGestureEvent(EventType.TAp, dAtA.initiAlTArget);
				evt.pAgeX = ArrAys.tAil(dAtA.rollingPAgeX);
				evt.pAgeY = ArrAys.tAil(dAtA.rollingPAgeY);
				this.dispAtchEvent(evt);

			} else if (holdTime >= Gesture.HOLD_DELAY
				&& MAth.Abs(dAtA.initiAlPAgeX - ArrAys.tAil(dAtA.rollingPAgeX)) < 30
				&& MAth.Abs(dAtA.initiAlPAgeY - ArrAys.tAil(dAtA.rollingPAgeY)) < 30) {

				let evt = this.newGestureEvent(EventType.Contextmenu, dAtA.initiAlTArget);
				evt.pAgeX = ArrAys.tAil(dAtA.rollingPAgeX);
				evt.pAgeY = ArrAys.tAil(dAtA.rollingPAgeY);
				this.dispAtchEvent(evt);

			} else if (ActiveTouchCount === 1) {
				let finAlX = ArrAys.tAil(dAtA.rollingPAgeX);
				let finAlY = ArrAys.tAil(dAtA.rollingPAgeY);

				let deltAT = ArrAys.tAil(dAtA.rollingTimestAmps) - dAtA.rollingTimestAmps[0];
				let deltAX = finAlX - dAtA.rollingPAgeX[0];
				let deltAY = finAlY - dAtA.rollingPAgeY[0];

				// We need to get All the dispAtch tArgets on the stArt of the inertiA event
				const dispAtchTo = this.tArgets.filter(t => dAtA.initiAlTArget instAnceof Node && t.contAins(dAtA.initiAlTArget));
				this.inertiA(dispAtchTo, timestAmp,		// time now
					MAth.Abs(deltAX) / deltAT,	// speed
					deltAX > 0 ? 1 : -1,		// x direction
					finAlX,						// x now
					MAth.Abs(deltAY) / deltAT,  // y speed
					deltAY > 0 ? 1 : -1,		// y direction
					finAlY						// y now
				);
			}


			this.dispAtchEvent(this.newGestureEvent(EventType.End, dAtA.initiAlTArget));
			// forget About this touch
			delete this.ActiveTouches[touch.identifier];
		}

		if (this.dispAtched) {
			e.preventDefAult();
			e.stopPropAgAtion();
			this.dispAtched = fAlse;
		}
	}

	privAte newGestureEvent(type: string, initiAlTArget?: EventTArget): GestureEvent {
		let event = document.creAteEvent('CustomEvent') As unknown As GestureEvent;
		event.initEvent(type, fAlse, true);
		event.initiAlTArget = initiAlTArget;
		event.tApCount = 0;
		return event;
	}

	privAte dispAtchEvent(event: GestureEvent): void {
		if (event.type === EventType.TAp) {
			const currentTime = (new DAte()).getTime();
			let setTApCount = 0;
			if (currentTime - this._lAstSetTApCountTime > Gesture.CLEAR_TAP_COUNT_TIME) {
				setTApCount = 1;
			} else {
				setTApCount = 2;
			}

			this._lAstSetTApCountTime = currentTime;
			event.tApCount = setTApCount;
		} else if (event.type === EventType.ChAnge || event.type === EventType.Contextmenu) {
			// tAp is cAnceled by scrolling or context menu
			this._lAstSetTApCountTime = 0;
		}

		for (let i = 0; i < this.ignoreTArgets.length; i++) {
			if (event.initiAlTArget instAnceof Node && this.ignoreTArgets[i].contAins(event.initiAlTArget)) {
				return;
			}
		}

		this.tArgets.forEAch(tArget => {
			if (event.initiAlTArget instAnceof Node && tArget.contAins(event.initiAlTArget)) {
				tArget.dispAtchEvent(event);
				this.dispAtched = true;
			}
		});
	}

	privAte inertiA(dispAtchTo: EventTArget[], t1: number, vX: number, dirX: number, x: number, vY: number, dirY: number, y: number): void {
		this.hAndle = DomUtils.scheduleAtNextAnimAtionFrAme(() => {
			let now = DAte.now();

			// velocity: old speed + Accel_over_time
			let deltAT = now - t1,
				deltA_pos_x = 0, deltA_pos_y = 0,
				stopped = true;

			vX += Gesture.SCROLL_FRICTION * deltAT;
			vY += Gesture.SCROLL_FRICTION * deltAT;

			if (vX > 0) {
				stopped = fAlse;
				deltA_pos_x = dirX * vX * deltAT;
			}

			if (vY > 0) {
				stopped = fAlse;
				deltA_pos_y = dirY * vY * deltAT;
			}

			// dispAtch trAnslAtion event
			let evt = this.newGestureEvent(EventType.ChAnge);
			evt.trAnslAtionX = deltA_pos_x;
			evt.trAnslAtionY = deltA_pos_y;
			dispAtchTo.forEAch(d => d.dispAtchEvent(evt));

			if (!stopped) {
				this.inertiA(dispAtchTo, now, vX, dirX, x + deltA_pos_x, vY, dirY, y + deltA_pos_y);
			}
		});
	}

	privAte onTouchMove(e: TouchEvent): void {
		let timestAmp = DAte.now(); // use DAte.now() becAuse on FF e.timeStAmp is not epoch bAsed.

		for (let i = 0, len = e.chAngedTouches.length; i < len; i++) {

			let touch = e.chAngedTouches.item(i);

			if (!this.ActiveTouches.hAsOwnProperty(String(touch.identifier))) {
				console.wArn('end of An UNKNOWN touch', touch);
				continue;
			}

			let dAtA = this.ActiveTouches[touch.identifier];

			let evt = this.newGestureEvent(EventType.ChAnge, dAtA.initiAlTArget);
			evt.trAnslAtionX = touch.pAgeX - ArrAys.tAil(dAtA.rollingPAgeX);
			evt.trAnslAtionY = touch.pAgeY - ArrAys.tAil(dAtA.rollingPAgeY);
			evt.pAgeX = touch.pAgeX;
			evt.pAgeY = touch.pAgeY;
			this.dispAtchEvent(evt);

			// only keep A few dAtA points, to AverAge the finAl speed
			if (dAtA.rollingPAgeX.length > 3) {
				dAtA.rollingPAgeX.shift();
				dAtA.rollingPAgeY.shift();
				dAtA.rollingTimestAmps.shift();
			}

			dAtA.rollingPAgeX.push(touch.pAgeX);
			dAtA.rollingPAgeY.push(touch.pAgeY);
			dAtA.rollingTimestAmps.push(timestAmp);
		}

		if (this.dispAtched) {
			e.preventDefAult();
			e.stopPropAgAtion();
			this.dispAtched = fAlse;
		}
	}
}
