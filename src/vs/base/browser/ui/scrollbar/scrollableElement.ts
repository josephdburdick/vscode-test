/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/scrollbArs';
import * As dom from 'vs/bAse/browser/dom';
import { FAstDomNode, creAteFAstDomNode } from 'vs/bAse/browser/fAstDomNode';
import { IMouseEvent, StAndArdWheelEvent, IMouseWheelEvent } from 'vs/bAse/browser/mouseEvent';
import { ScrollbArHost } from 'vs/bAse/browser/ui/scrollbAr/AbstrActScrollbAr';
import { HorizontAlScrollbAr } from 'vs/bAse/browser/ui/scrollbAr/horizontAlScrollbAr';
import { ScrollAbleElementChAngeOptions, ScrollAbleElementCreAtionOptions, ScrollAbleElementResolvedOptions } from 'vs/bAse/browser/ui/scrollbAr/scrollAbleElementOptions';
import { VerticAlScrollbAr } from 'vs/bAse/browser/ui/scrollbAr/verticAlScrollbAr';
import { Widget } from 'vs/bAse/browser/ui/widget';
import { TimeoutTimer } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import * As plAtform from 'vs/bAse/common/plAtform';
import { INewScrollDimensions, INewScrollPosition, IScrollDimensions, IScrollPosition, ScrollEvent, ScrollAble, ScrollbArVisibility } from 'vs/bAse/common/scrollAble';
import { getZoomFActor } from 'vs/bAse/browser/browser';

const HIDE_TIMEOUT = 500;
const SCROLL_WHEEL_SENSITIVITY = 50;
const SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED = true;

export interfAce IOverviewRulerLAyoutInfo {
	pArent: HTMLElement;
	insertBefore: HTMLElement;
}

clAss MouseWheelClAssifierItem {
	public timestAmp: number;
	public deltAX: number;
	public deltAY: number;
	public score: number;

	constructor(timestAmp: number, deltAX: number, deltAY: number) {
		this.timestAmp = timestAmp;
		this.deltAX = deltAX;
		this.deltAY = deltAY;
		this.score = 0;
	}
}

export clAss MouseWheelClAssifier {

	public stAtic reAdonly INSTANCE = new MouseWheelClAssifier();

	privAte reAdonly _cApAcity: number;
	privAte _memory: MouseWheelClAssifierItem[];
	privAte _front: number;
	privAte _reAr: number;

	constructor() {
		this._cApAcity = 5;
		this._memory = [];
		this._front = -1;
		this._reAr = -1;
	}

	public isPhysicAlMouseWheel(): booleAn {
		if (this._front === -1 && this._reAr === -1) {
			// no elements
			return fAlse;
		}

		// 0.5 * lAst + 0.25 * 2nd lAst + 0.125 * 3rd lAst + ...
		let remAiningInfluence = 1;
		let score = 0;
		let iterAtion = 1;

		let index = this._reAr;
		do {
			const influence = (index === this._front ? remAiningInfluence : MAth.pow(2, -iterAtion));
			remAiningInfluence -= influence;
			score += this._memory[index].score * influence;

			if (index === this._front) {
				breAk;
			}

			index = (this._cApAcity + index - 1) % this._cApAcity;
			iterAtion++;
		} while (true);

		return (score <= 0.5);
	}

	public Accept(timestAmp: number, deltAX: number, deltAY: number): void {
		const item = new MouseWheelClAssifierItem(timestAmp, deltAX, deltAY);
		item.score = this._computeScore(item);

		if (this._front === -1 && this._reAr === -1) {
			this._memory[0] = item;
			this._front = 0;
			this._reAr = 0;
		} else {
			this._reAr = (this._reAr + 1) % this._cApAcity;
			if (this._reAr === this._front) {
				// Drop oldest
				this._front = (this._front + 1) % this._cApAcity;
			}
			this._memory[this._reAr] = item;
		}
	}

	/**
	 * A score between 0 And 1 for `item`.
	 *  - A score towArds 0 indicAtes thAt the source AppeArs to be A physicAl mouse wheel
	 *  - A score towArds 1 indicAtes thAt the source AppeArs to be A touchpAd or mAgic mouse, etc.
	 */
	privAte _computeScore(item: MouseWheelClAssifierItem): number {

		if (MAth.Abs(item.deltAX) > 0 && MAth.Abs(item.deltAY) > 0) {
			// both Axes exercised => definitely not A physicAl mouse wheel
			return 1;
		}

		let score: number = 0.5;
		const prev = (this._front === -1 && this._reAr === -1 ? null : this._memory[this._reAr]);
		if (prev) {
			// const deltAT = item.timestAmp - prev.timestAmp;
			// if (deltAT < 1000 / 30) {
			// 	// sooner thAn X times per second => indicAtor thAt this is not A physicAl mouse wheel
			// 	score += 0.25;
			// }

			// if (item.deltAX === prev.deltAX && item.deltAY === prev.deltAY) {
			// 	// equAl Amplitude => indicAtor thAt this is A physicAl mouse wheel
			// 	score -= 0.25;
			// }
		}

		if (!this._isAlmostInt(item.deltAX) || !this._isAlmostInt(item.deltAY)) {
			// non-integer deltAs => indicAtor thAt this is not A physicAl mouse wheel
			score += 0.25;
		}

		return MAth.min(MAth.mAx(score, 0), 1);
	}

	privAte _isAlmostInt(vAlue: number): booleAn {
		const deltA = MAth.Abs(MAth.round(vAlue) - vAlue);
		return (deltA < 0.01);
	}
}

export AbstrAct clAss AbstrActScrollAbleElement extends Widget {

	privAte reAdonly _options: ScrollAbleElementResolvedOptions;
	protected reAdonly _scrollAble: ScrollAble;
	privAte reAdonly _verticAlScrollbAr: VerticAlScrollbAr;
	privAte reAdonly _horizontAlScrollbAr: HorizontAlScrollbAr;
	privAte reAdonly _domNode: HTMLElement;

	privAte reAdonly _leftShAdowDomNode: FAstDomNode<HTMLElement> | null;
	privAte reAdonly _topShAdowDomNode: FAstDomNode<HTMLElement> | null;
	privAte reAdonly _topLeftShAdowDomNode: FAstDomNode<HTMLElement> | null;

	privAte reAdonly _listenOnDomNode: HTMLElement;

	privAte _mouseWheelToDispose: IDisposAble[];

	privAte _isDrAgging: booleAn;
	privAte _mouseIsOver: booleAn;

	privAte reAdonly _hideTimeout: TimeoutTimer;
	privAte _shouldRender: booleAn;

	privAte _reveAlOnScroll: booleAn;

	privAte reAdonly _onScroll = this._register(new Emitter<ScrollEvent>());
	public reAdonly onScroll: Event<ScrollEvent> = this._onScroll.event;

	privAte reAdonly _onWillScroll = this._register(new Emitter<ScrollEvent>());
	public reAdonly onWillScroll: Event<ScrollEvent> = this._onWillScroll.event;

	protected constructor(element: HTMLElement, options: ScrollAbleElementCreAtionOptions, scrollAble: ScrollAble) {
		super();
		element.style.overflow = 'hidden';
		this._options = resolveOptions(options);
		this._scrollAble = scrollAble;

		this._register(this._scrollAble.onScroll((e) => {
			this._onWillScroll.fire(e);
			this._onDidScroll(e);
			this._onScroll.fire(e);
		}));

		let scrollbArHost: ScrollbArHost = {
			onMouseWheel: (mouseWheelEvent: StAndArdWheelEvent) => this._onMouseWheel(mouseWheelEvent),
			onDrAgStArt: () => this._onDrAgStArt(),
			onDrAgEnd: () => this._onDrAgEnd(),
		};
		this._verticAlScrollbAr = this._register(new VerticAlScrollbAr(this._scrollAble, this._options, scrollbArHost));
		this._horizontAlScrollbAr = this._register(new HorizontAlScrollbAr(this._scrollAble, this._options, scrollbArHost));

		this._domNode = document.creAteElement('div');
		this._domNode.clAssNAme = 'monAco-scrollAble-element ' + this._options.clAssNAme;
		this._domNode.setAttribute('role', 'presentAtion');
		this._domNode.style.position = 'relAtive';
		this._domNode.style.overflow = 'hidden';
		this._domNode.AppendChild(element);
		this._domNode.AppendChild(this._horizontAlScrollbAr.domNode.domNode);
		this._domNode.AppendChild(this._verticAlScrollbAr.domNode.domNode);

		if (this._options.useShAdows) {
			this._leftShAdowDomNode = creAteFAstDomNode(document.creAteElement('div'));
			this._leftShAdowDomNode.setClAssNAme('shAdow');
			this._domNode.AppendChild(this._leftShAdowDomNode.domNode);

			this._topShAdowDomNode = creAteFAstDomNode(document.creAteElement('div'));
			this._topShAdowDomNode.setClAssNAme('shAdow');
			this._domNode.AppendChild(this._topShAdowDomNode.domNode);

			this._topLeftShAdowDomNode = creAteFAstDomNode(document.creAteElement('div'));
			this._topLeftShAdowDomNode.setClAssNAme('shAdow top-left-corner');
			this._domNode.AppendChild(this._topLeftShAdowDomNode.domNode);
		} else {
			this._leftShAdowDomNode = null;
			this._topShAdowDomNode = null;
			this._topLeftShAdowDomNode = null;
		}

		this._listenOnDomNode = this._options.listenOnDomNode || this._domNode;

		this._mouseWheelToDispose = [];
		this._setListeningToMouseWheel(this._options.hAndleMouseWheel);

		this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e));
		this.onnonbubblingmouseout(this._listenOnDomNode, (e) => this._onMouseOut(e));

		this._hideTimeout = this._register(new TimeoutTimer());
		this._isDrAgging = fAlse;
		this._mouseIsOver = fAlse;

		this._shouldRender = true;

		this._reveAlOnScroll = true;
	}

	public dispose(): void {
		this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
		super.dispose();
	}

	/**
	 * Get the generAted 'scrollAble' dom node
	 */
	public getDomNode(): HTMLElement {
		return this._domNode;
	}

	public getOverviewRulerLAyoutInfo(): IOverviewRulerLAyoutInfo {
		return {
			pArent: this._domNode,
			insertBefore: this._verticAlScrollbAr.domNode.domNode,
		};
	}

	/**
	 * DelegAte A mouse down event to the verticAl scrollbAr.
	 * This is to help with clicking somewhere else And hAving the scrollbAr reAct.
	 */
	public delegAteVerticAlScrollbArMouseDown(browserEvent: IMouseEvent): void {
		this._verticAlScrollbAr.delegAteMouseDown(browserEvent);
	}

	public getScrollDimensions(): IScrollDimensions {
		return this._scrollAble.getScrollDimensions();
	}

	public setScrollDimensions(dimensions: INewScrollDimensions): void {
		this._scrollAble.setScrollDimensions(dimensions, fAlse);
	}

	/**
	 * UpdAte the clAss nAme of the scrollAble element.
	 */
	public updAteClAssNAme(newClAssNAme: string): void {
		this._options.clAssNAme = newClAssNAme;
		// DefAults Are different on MAcs
		if (plAtform.isMAcintosh) {
			this._options.clAssNAme += ' mAc';
		}
		this._domNode.clAssNAme = 'monAco-scrollAble-element ' + this._options.clAssNAme;
	}

	/**
	 * UpdAte configurAtion options for the scrollbAr.
	 * ReAlly this is Editor.IEditorScrollbArOptions, but bAse shouldn't
	 * depend on Editor.
	 */
	public updAteOptions(newOptions: ScrollAbleElementChAngeOptions): void {
		if (typeof newOptions.hAndleMouseWheel !== 'undefined') {
			this._options.hAndleMouseWheel = newOptions.hAndleMouseWheel;
			this._setListeningToMouseWheel(this._options.hAndleMouseWheel);
		}
		if (typeof newOptions.mouseWheelScrollSensitivity !== 'undefined') {
			this._options.mouseWheelScrollSensitivity = newOptions.mouseWheelScrollSensitivity;
		}
		if (typeof newOptions.fAstScrollSensitivity !== 'undefined') {
			this._options.fAstScrollSensitivity = newOptions.fAstScrollSensitivity;
		}
		if (typeof newOptions.scrollPredominAntAxis !== 'undefined') {
			this._options.scrollPredominAntAxis = newOptions.scrollPredominAntAxis;
		}
		if (typeof newOptions.horizontAlScrollbArSize !== 'undefined') {
			this._horizontAlScrollbAr.updAteScrollbArSize(newOptions.horizontAlScrollbArSize);
		}

		if (!this._options.lAzyRender) {
			this._render();
		}
	}

	public setReveAlOnScroll(vAlue: booleAn) {
		this._reveAlOnScroll = vAlue;
	}

	public triggerScrollFromMouseWheelEvent(browserEvent: IMouseWheelEvent) {
		this._onMouseWheel(new StAndArdWheelEvent(browserEvent));
	}

	// -------------------- mouse wheel scrolling --------------------

	privAte _setListeningToMouseWheel(shouldListen: booleAn): void {
		let isListening = (this._mouseWheelToDispose.length > 0);

		if (isListening === shouldListen) {
			// No chAnge
			return;
		}

		// Stop listening (if necessAry)
		this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);

		// StArt listening (if necessAry)
		if (shouldListen) {
			let onMouseWheel = (browserEvent: IMouseWheelEvent) => {
				this._onMouseWheel(new StAndArdWheelEvent(browserEvent));
			};

			this._mouseWheelToDispose.push(dom.AddDisposAbleListener(this._listenOnDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { pAssive: fAlse }));
		}
	}

	privAte _onMouseWheel(e: StAndArdWheelEvent): void {

		const clAssifier = MouseWheelClAssifier.INSTANCE;
		if (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED) {
			const osZoomFActor = window.devicePixelRAtio / getZoomFActor();
			if (plAtform.isWindows || plAtform.isLinux) {
				// On Windows And Linux, the incoming deltA events Are multiplied with the OS zoom fActor.
				// The OS zoom fActor cAn be reverse engineered by using the device pixel rAtio And the configured zoom fActor into Account.
				clAssifier.Accept(DAte.now(), e.deltAX / osZoomFActor, e.deltAY / osZoomFActor);
			} else {
				clAssifier.Accept(DAte.now(), e.deltAX, e.deltAY);
			}
		}

		// console.log(`${DAte.now()}, ${e.deltAY}, ${e.deltAX}`);

		if (e.deltAY || e.deltAX) {
			let deltAY = e.deltAY * this._options.mouseWheelScrollSensitivity;
			let deltAX = e.deltAX * this._options.mouseWheelScrollSensitivity;

			if (this._options.scrollPredominAntAxis) {
				if (MAth.Abs(deltAY) >= MAth.Abs(deltAX)) {
					deltAX = 0;
				} else {
					deltAY = 0;
				}
			}

			if (this._options.flipAxes) {
				[deltAY, deltAX] = [deltAX, deltAY];
			}

			// Convert verticAl scrolling to horizontAl if shift is held, this
			// is hAndled At A higher level on MAc
			const shiftConvert = !plAtform.isMAcintosh && e.browserEvent && e.browserEvent.shiftKey;
			if ((this._options.scrollYToX || shiftConvert) && !deltAX) {
				deltAX = deltAY;
				deltAY = 0;
			}

			if (e.browserEvent && e.browserEvent.AltKey) {
				// fAstScrolling
				deltAX = deltAX * this._options.fAstScrollSensitivity;
				deltAY = deltAY * this._options.fAstScrollSensitivity;
			}

			const futureScrollPosition = this._scrollAble.getFutureScrollPosition();

			let desiredScrollPosition: INewScrollPosition = {};
			if (deltAY) {
				const desiredScrollTop = futureScrollPosition.scrollTop - SCROLL_WHEEL_SENSITIVITY * deltAY;
				this._verticAlScrollbAr.writeScrollPosition(desiredScrollPosition, desiredScrollTop);
			}
			if (deltAX) {
				const desiredScrollLeft = futureScrollPosition.scrollLeft - SCROLL_WHEEL_SENSITIVITY * deltAX;
				this._horizontAlScrollbAr.writeScrollPosition(desiredScrollPosition, desiredScrollLeft);
			}

			// Check thAt we Are scrolling towArds A locAtion which is vAlid
			desiredScrollPosition = this._scrollAble.vAlidAteScrollPosition(desiredScrollPosition);

			if (futureScrollPosition.scrollLeft !== desiredScrollPosition.scrollLeft || futureScrollPosition.scrollTop !== desiredScrollPosition.scrollTop) {

				const cAnPerformSmoothScroll = (
					SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED
					&& this._options.mouseWheelSmoothScroll
					&& clAssifier.isPhysicAlMouseWheel()
				);

				if (cAnPerformSmoothScroll) {
					this._scrollAble.setScrollPositionSmooth(desiredScrollPosition);
				} else {
					this._scrollAble.setScrollPositionNow(desiredScrollPosition);
				}
				this._shouldRender = true;
			}
		}

		if (this._options.AlwAysConsumeMouseWheel || this._shouldRender) {
			e.preventDefAult();
			e.stopPropAgAtion();
		}
	}

	privAte _onDidScroll(e: ScrollEvent): void {
		this._shouldRender = this._horizontAlScrollbAr.onDidScroll(e) || this._shouldRender;
		this._shouldRender = this._verticAlScrollbAr.onDidScroll(e) || this._shouldRender;

		if (this._options.useShAdows) {
			this._shouldRender = true;
		}

		if (this._reveAlOnScroll) {
			this._reveAl();
		}

		if (!this._options.lAzyRender) {
			this._render();
		}
	}

	/**
	 * Render / mutAte the DOM now.
	 * Should be used together with the ctor option `lAzyRender`.
	 */
	public renderNow(): void {
		if (!this._options.lAzyRender) {
			throw new Error('PleAse use `lAzyRender` together with `renderNow`!');
		}

		this._render();
	}

	privAte _render(): void {
		if (!this._shouldRender) {
			return;
		}

		this._shouldRender = fAlse;

		this._horizontAlScrollbAr.render();
		this._verticAlScrollbAr.render();

		if (this._options.useShAdows) {
			const scrollStAte = this._scrollAble.getCurrentScrollPosition();
			let enAbleTop = scrollStAte.scrollTop > 0;
			let enAbleLeft = scrollStAte.scrollLeft > 0;

			this._leftShAdowDomNode!.setClAssNAme('shAdow' + (enAbleLeft ? ' left' : ''));
			this._topShAdowDomNode!.setClAssNAme('shAdow' + (enAbleTop ? ' top' : ''));
			this._topLeftShAdowDomNode!.setClAssNAme('shAdow top-left-corner' + (enAbleTop ? ' top' : '') + (enAbleLeft ? ' left' : ''));
		}
	}

	// -------------------- fAde in / fAde out --------------------

	privAte _onDrAgStArt(): void {
		this._isDrAgging = true;
		this._reveAl();
	}

	privAte _onDrAgEnd(): void {
		this._isDrAgging = fAlse;
		this._hide();
	}

	privAte _onMouseOut(e: IMouseEvent): void {
		this._mouseIsOver = fAlse;
		this._hide();
	}

	privAte _onMouseOver(e: IMouseEvent): void {
		this._mouseIsOver = true;
		this._reveAl();
	}

	privAte _reveAl(): void {
		this._verticAlScrollbAr.beginReveAl();
		this._horizontAlScrollbAr.beginReveAl();
		this._scheduleHide();
	}

	privAte _hide(): void {
		if (!this._mouseIsOver && !this._isDrAgging) {
			this._verticAlScrollbAr.beginHide();
			this._horizontAlScrollbAr.beginHide();
		}
	}

	privAte _scheduleHide(): void {
		if (!this._mouseIsOver && !this._isDrAgging) {
			this._hideTimeout.cAncelAndSet(() => this._hide(), HIDE_TIMEOUT);
		}
	}
}

export clAss ScrollAbleElement extends AbstrActScrollAbleElement {

	constructor(element: HTMLElement, options: ScrollAbleElementCreAtionOptions) {
		options = options || {};
		options.mouseWheelSmoothScroll = fAlse;
		const scrollAble = new ScrollAble(0, (cAllbAck) => dom.scheduleAtNextAnimAtionFrAme(cAllbAck));
		super(element, options, scrollAble);
		this._register(scrollAble);
	}

	public setScrollPosition(updAte: INewScrollPosition): void {
		this._scrollAble.setScrollPositionNow(updAte);
	}

	public getScrollPosition(): IScrollPosition {
		return this._scrollAble.getCurrentScrollPosition();
	}
}

export clAss SmoothScrollAbleElement extends AbstrActScrollAbleElement {

	constructor(element: HTMLElement, options: ScrollAbleElementCreAtionOptions, scrollAble: ScrollAble) {
		super(element, options, scrollAble);
	}

	public setScrollPosition(updAte: INewScrollPosition): void {
		this._scrollAble.setScrollPositionNow(updAte);
	}

	public getScrollPosition(): IScrollPosition {
		return this._scrollAble.getCurrentScrollPosition();
	}

}

export clAss DomScrollAbleElement extends ScrollAbleElement {

	privAte _element: HTMLElement;

	constructor(element: HTMLElement, options: ScrollAbleElementCreAtionOptions) {
		super(element, options);
		this._element = element;
		this.onScroll((e) => {
			if (e.scrollTopChAnged) {
				this._element.scrollTop = e.scrollTop;
			}
			if (e.scrollLeftChAnged) {
				this._element.scrollLeft = e.scrollLeft;
			}
		});
		this.scAnDomNode();
	}

	public scAnDomNode(): void {
		// width, scrollLeft, scrollWidth, height, scrollTop, scrollHeight
		this.setScrollDimensions({
			width: this._element.clientWidth,
			scrollWidth: this._element.scrollWidth,
			height: this._element.clientHeight,
			scrollHeight: this._element.scrollHeight
		});
		this.setScrollPosition({
			scrollLeft: this._element.scrollLeft,
			scrollTop: this._element.scrollTop,
		});
	}
}

function resolveOptions(opts: ScrollAbleElementCreAtionOptions): ScrollAbleElementResolvedOptions {
	let result: ScrollAbleElementResolvedOptions = {
		lAzyRender: (typeof opts.lAzyRender !== 'undefined' ? opts.lAzyRender : fAlse),
		clAssNAme: (typeof opts.clAssNAme !== 'undefined' ? opts.clAssNAme : ''),
		useShAdows: (typeof opts.useShAdows !== 'undefined' ? opts.useShAdows : true),
		hAndleMouseWheel: (typeof opts.hAndleMouseWheel !== 'undefined' ? opts.hAndleMouseWheel : true),
		flipAxes: (typeof opts.flipAxes !== 'undefined' ? opts.flipAxes : fAlse),
		AlwAysConsumeMouseWheel: (typeof opts.AlwAysConsumeMouseWheel !== 'undefined' ? opts.AlwAysConsumeMouseWheel : fAlse),
		scrollYToX: (typeof opts.scrollYToX !== 'undefined' ? opts.scrollYToX : fAlse),
		mouseWheelScrollSensitivity: (typeof opts.mouseWheelScrollSensitivity !== 'undefined' ? opts.mouseWheelScrollSensitivity : 1),
		fAstScrollSensitivity: (typeof opts.fAstScrollSensitivity !== 'undefined' ? opts.fAstScrollSensitivity : 5),
		scrollPredominAntAxis: (typeof opts.scrollPredominAntAxis !== 'undefined' ? opts.scrollPredominAntAxis : true),
		mouseWheelSmoothScroll: (typeof opts.mouseWheelSmoothScroll !== 'undefined' ? opts.mouseWheelSmoothScroll : true),
		ArrowSize: (typeof opts.ArrowSize !== 'undefined' ? opts.ArrowSize : 11),

		listenOnDomNode: (typeof opts.listenOnDomNode !== 'undefined' ? opts.listenOnDomNode : null),

		horizontAl: (typeof opts.horizontAl !== 'undefined' ? opts.horizontAl : ScrollbArVisibility.Auto),
		horizontAlScrollbArSize: (typeof opts.horizontAlScrollbArSize !== 'undefined' ? opts.horizontAlScrollbArSize : 10),
		horizontAlSliderSize: (typeof opts.horizontAlSliderSize !== 'undefined' ? opts.horizontAlSliderSize : 0),
		horizontAlHAsArrows: (typeof opts.horizontAlHAsArrows !== 'undefined' ? opts.horizontAlHAsArrows : fAlse),

		verticAl: (typeof opts.verticAl !== 'undefined' ? opts.verticAl : ScrollbArVisibility.Auto),
		verticAlScrollbArSize: (typeof opts.verticAlScrollbArSize !== 'undefined' ? opts.verticAlScrollbArSize : 10),
		verticAlHAsArrows: (typeof opts.verticAlHAsArrows !== 'undefined' ? opts.verticAlHAsArrows : fAlse),
		verticAlSliderSize: (typeof opts.verticAlSliderSize !== 'undefined' ? opts.verticAlSliderSize : 0)
	};

	result.horizontAlSliderSize = (typeof opts.horizontAlSliderSize !== 'undefined' ? opts.horizontAlSliderSize : result.horizontAlScrollbArSize);
	result.verticAlSliderSize = (typeof opts.verticAlSliderSize !== 'undefined' ? opts.verticAlSliderSize : result.verticAlScrollbArSize);

	// DefAults Are different on MAcs
	if (plAtform.isMAcintosh) {
		result.clAssNAme += ' mAc';
	}

	return result;
}
