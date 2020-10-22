/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/scrollBars';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { IMouseEvent, StandardWheelEvent, IMouseWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { ScrollBarHost } from 'vs/Base/Browser/ui/scrollBar/aBstractScrollBar';
import { HorizontalScrollBar } from 'vs/Base/Browser/ui/scrollBar/horizontalScrollBar';
import { ScrollaBleElementChangeOptions, ScrollaBleElementCreationOptions, ScrollaBleElementResolvedOptions } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElementOptions';
import { VerticalScrollBar } from 'vs/Base/Browser/ui/scrollBar/verticalScrollBar';
import { Widget } from 'vs/Base/Browser/ui/widget';
import { TimeoutTimer } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { INewScrollDimensions, INewScrollPosition, IScrollDimensions, IScrollPosition, ScrollEvent, ScrollaBle, ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { getZoomFactor } from 'vs/Base/Browser/Browser';

const HIDE_TIMEOUT = 500;
const SCROLL_WHEEL_SENSITIVITY = 50;
const SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED = true;

export interface IOverviewRulerLayoutInfo {
	parent: HTMLElement;
	insertBefore: HTMLElement;
}

class MouseWheelClassifierItem {
	puBlic timestamp: numBer;
	puBlic deltaX: numBer;
	puBlic deltaY: numBer;
	puBlic score: numBer;

	constructor(timestamp: numBer, deltaX: numBer, deltaY: numBer) {
		this.timestamp = timestamp;
		this.deltaX = deltaX;
		this.deltaY = deltaY;
		this.score = 0;
	}
}

export class MouseWheelClassifier {

	puBlic static readonly INSTANCE = new MouseWheelClassifier();

	private readonly _capacity: numBer;
	private _memory: MouseWheelClassifierItem[];
	private _front: numBer;
	private _rear: numBer;

	constructor() {
		this._capacity = 5;
		this._memory = [];
		this._front = -1;
		this._rear = -1;
	}

	puBlic isPhysicalMouseWheel(): Boolean {
		if (this._front === -1 && this._rear === -1) {
			// no elements
			return false;
		}

		// 0.5 * last + 0.25 * 2nd last + 0.125 * 3rd last + ...
		let remainingInfluence = 1;
		let score = 0;
		let iteration = 1;

		let index = this._rear;
		do {
			const influence = (index === this._front ? remainingInfluence : Math.pow(2, -iteration));
			remainingInfluence -= influence;
			score += this._memory[index].score * influence;

			if (index === this._front) {
				Break;
			}

			index = (this._capacity + index - 1) % this._capacity;
			iteration++;
		} while (true);

		return (score <= 0.5);
	}

	puBlic accept(timestamp: numBer, deltaX: numBer, deltaY: numBer): void {
		const item = new MouseWheelClassifierItem(timestamp, deltaX, deltaY);
		item.score = this._computeScore(item);

		if (this._front === -1 && this._rear === -1) {
			this._memory[0] = item;
			this._front = 0;
			this._rear = 0;
		} else {
			this._rear = (this._rear + 1) % this._capacity;
			if (this._rear === this._front) {
				// Drop oldest
				this._front = (this._front + 1) % this._capacity;
			}
			this._memory[this._rear] = item;
		}
	}

	/**
	 * A score Between 0 and 1 for `item`.
	 *  - a score towards 0 indicates that the source appears to Be a physical mouse wheel
	 *  - a score towards 1 indicates that the source appears to Be a touchpad or magic mouse, etc.
	 */
	private _computeScore(item: MouseWheelClassifierItem): numBer {

		if (Math.aBs(item.deltaX) > 0 && Math.aBs(item.deltaY) > 0) {
			// Both axes exercised => definitely not a physical mouse wheel
			return 1;
		}

		let score: numBer = 0.5;
		const prev = (this._front === -1 && this._rear === -1 ? null : this._memory[this._rear]);
		if (prev) {
			// const deltaT = item.timestamp - prev.timestamp;
			// if (deltaT < 1000 / 30) {
			// 	// sooner than X times per second => indicator that this is not a physical mouse wheel
			// 	score += 0.25;
			// }

			// if (item.deltaX === prev.deltaX && item.deltaY === prev.deltaY) {
			// 	// equal amplitude => indicator that this is a physical mouse wheel
			// 	score -= 0.25;
			// }
		}

		if (!this._isAlmostInt(item.deltaX) || !this._isAlmostInt(item.deltaY)) {
			// non-integer deltas => indicator that this is not a physical mouse wheel
			score += 0.25;
		}

		return Math.min(Math.max(score, 0), 1);
	}

	private _isAlmostInt(value: numBer): Boolean {
		const delta = Math.aBs(Math.round(value) - value);
		return (delta < 0.01);
	}
}

export aBstract class ABstractScrollaBleElement extends Widget {

	private readonly _options: ScrollaBleElementResolvedOptions;
	protected readonly _scrollaBle: ScrollaBle;
	private readonly _verticalScrollBar: VerticalScrollBar;
	private readonly _horizontalScrollBar: HorizontalScrollBar;
	private readonly _domNode: HTMLElement;

	private readonly _leftShadowDomNode: FastDomNode<HTMLElement> | null;
	private readonly _topShadowDomNode: FastDomNode<HTMLElement> | null;
	private readonly _topLeftShadowDomNode: FastDomNode<HTMLElement> | null;

	private readonly _listenOnDomNode: HTMLElement;

	private _mouseWheelToDispose: IDisposaBle[];

	private _isDragging: Boolean;
	private _mouseIsOver: Boolean;

	private readonly _hideTimeout: TimeoutTimer;
	private _shouldRender: Boolean;

	private _revealOnScroll: Boolean;

	private readonly _onScroll = this._register(new Emitter<ScrollEvent>());
	puBlic readonly onScroll: Event<ScrollEvent> = this._onScroll.event;

	private readonly _onWillScroll = this._register(new Emitter<ScrollEvent>());
	puBlic readonly onWillScroll: Event<ScrollEvent> = this._onWillScroll.event;

	protected constructor(element: HTMLElement, options: ScrollaBleElementCreationOptions, scrollaBle: ScrollaBle) {
		super();
		element.style.overflow = 'hidden';
		this._options = resolveOptions(options);
		this._scrollaBle = scrollaBle;

		this._register(this._scrollaBle.onScroll((e) => {
			this._onWillScroll.fire(e);
			this._onDidScroll(e);
			this._onScroll.fire(e);
		}));

		let scrollBarHost: ScrollBarHost = {
			onMouseWheel: (mouseWheelEvent: StandardWheelEvent) => this._onMouseWheel(mouseWheelEvent),
			onDragStart: () => this._onDragStart(),
			onDragEnd: () => this._onDragEnd(),
		};
		this._verticalScrollBar = this._register(new VerticalScrollBar(this._scrollaBle, this._options, scrollBarHost));
		this._horizontalScrollBar = this._register(new HorizontalScrollBar(this._scrollaBle, this._options, scrollBarHost));

		this._domNode = document.createElement('div');
		this._domNode.className = 'monaco-scrollaBle-element ' + this._options.className;
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.style.position = 'relative';
		this._domNode.style.overflow = 'hidden';
		this._domNode.appendChild(element);
		this._domNode.appendChild(this._horizontalScrollBar.domNode.domNode);
		this._domNode.appendChild(this._verticalScrollBar.domNode.domNode);

		if (this._options.useShadows) {
			this._leftShadowDomNode = createFastDomNode(document.createElement('div'));
			this._leftShadowDomNode.setClassName('shadow');
			this._domNode.appendChild(this._leftShadowDomNode.domNode);

			this._topShadowDomNode = createFastDomNode(document.createElement('div'));
			this._topShadowDomNode.setClassName('shadow');
			this._domNode.appendChild(this._topShadowDomNode.domNode);

			this._topLeftShadowDomNode = createFastDomNode(document.createElement('div'));
			this._topLeftShadowDomNode.setClassName('shadow top-left-corner');
			this._domNode.appendChild(this._topLeftShadowDomNode.domNode);
		} else {
			this._leftShadowDomNode = null;
			this._topShadowDomNode = null;
			this._topLeftShadowDomNode = null;
		}

		this._listenOnDomNode = this._options.listenOnDomNode || this._domNode;

		this._mouseWheelToDispose = [];
		this._setListeningToMouseWheel(this._options.handleMouseWheel);

		this.onmouseover(this._listenOnDomNode, (e) => this._onMouseOver(e));
		this.onnonBuBBlingmouseout(this._listenOnDomNode, (e) => this._onMouseOut(e));

		this._hideTimeout = this._register(new TimeoutTimer());
		this._isDragging = false;
		this._mouseIsOver = false;

		this._shouldRender = true;

		this._revealOnScroll = true;
	}

	puBlic dispose(): void {
		this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);
		super.dispose();
	}

	/**
	 * Get the generated 'scrollaBle' dom node
	 */
	puBlic getDomNode(): HTMLElement {
		return this._domNode;
	}

	puBlic getOverviewRulerLayoutInfo(): IOverviewRulerLayoutInfo {
		return {
			parent: this._domNode,
			insertBefore: this._verticalScrollBar.domNode.domNode,
		};
	}

	/**
	 * Delegate a mouse down event to the vertical scrollBar.
	 * This is to help with clicking somewhere else and having the scrollBar react.
	 */
	puBlic delegateVerticalScrollBarMouseDown(BrowserEvent: IMouseEvent): void {
		this._verticalScrollBar.delegateMouseDown(BrowserEvent);
	}

	puBlic getScrollDimensions(): IScrollDimensions {
		return this._scrollaBle.getScrollDimensions();
	}

	puBlic setScrollDimensions(dimensions: INewScrollDimensions): void {
		this._scrollaBle.setScrollDimensions(dimensions, false);
	}

	/**
	 * Update the class name of the scrollaBle element.
	 */
	puBlic updateClassName(newClassName: string): void {
		this._options.className = newClassName;
		// Defaults are different on Macs
		if (platform.isMacintosh) {
			this._options.className += ' mac';
		}
		this._domNode.className = 'monaco-scrollaBle-element ' + this._options.className;
	}

	/**
	 * Update configuration options for the scrollBar.
	 * Really this is Editor.IEditorScrollBarOptions, But Base shouldn't
	 * depend on Editor.
	 */
	puBlic updateOptions(newOptions: ScrollaBleElementChangeOptions): void {
		if (typeof newOptions.handleMouseWheel !== 'undefined') {
			this._options.handleMouseWheel = newOptions.handleMouseWheel;
			this._setListeningToMouseWheel(this._options.handleMouseWheel);
		}
		if (typeof newOptions.mouseWheelScrollSensitivity !== 'undefined') {
			this._options.mouseWheelScrollSensitivity = newOptions.mouseWheelScrollSensitivity;
		}
		if (typeof newOptions.fastScrollSensitivity !== 'undefined') {
			this._options.fastScrollSensitivity = newOptions.fastScrollSensitivity;
		}
		if (typeof newOptions.scrollPredominantAxis !== 'undefined') {
			this._options.scrollPredominantAxis = newOptions.scrollPredominantAxis;
		}
		if (typeof newOptions.horizontalScrollBarSize !== 'undefined') {
			this._horizontalScrollBar.updateScrollBarSize(newOptions.horizontalScrollBarSize);
		}

		if (!this._options.lazyRender) {
			this._render();
		}
	}

	puBlic setRevealOnScroll(value: Boolean) {
		this._revealOnScroll = value;
	}

	puBlic triggerScrollFromMouseWheelEvent(BrowserEvent: IMouseWheelEvent) {
		this._onMouseWheel(new StandardWheelEvent(BrowserEvent));
	}

	// -------------------- mouse wheel scrolling --------------------

	private _setListeningToMouseWheel(shouldListen: Boolean): void {
		let isListening = (this._mouseWheelToDispose.length > 0);

		if (isListening === shouldListen) {
			// No change
			return;
		}

		// Stop listening (if necessary)
		this._mouseWheelToDispose = dispose(this._mouseWheelToDispose);

		// Start listening (if necessary)
		if (shouldListen) {
			let onMouseWheel = (BrowserEvent: IMouseWheelEvent) => {
				this._onMouseWheel(new StandardWheelEvent(BrowserEvent));
			};

			this._mouseWheelToDispose.push(dom.addDisposaBleListener(this._listenOnDomNode, dom.EventType.MOUSE_WHEEL, onMouseWheel, { passive: false }));
		}
	}

	private _onMouseWheel(e: StandardWheelEvent): void {

		const classifier = MouseWheelClassifier.INSTANCE;
		if (SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED) {
			const osZoomFactor = window.devicePixelRatio / getZoomFactor();
			if (platform.isWindows || platform.isLinux) {
				// On Windows and Linux, the incoming delta events are multiplied with the OS zoom factor.
				// The OS zoom factor can Be reverse engineered By using the device pixel ratio and the configured zoom factor into account.
				classifier.accept(Date.now(), e.deltaX / osZoomFactor, e.deltaY / osZoomFactor);
			} else {
				classifier.accept(Date.now(), e.deltaX, e.deltaY);
			}
		}

		// console.log(`${Date.now()}, ${e.deltaY}, ${e.deltaX}`);

		if (e.deltaY || e.deltaX) {
			let deltaY = e.deltaY * this._options.mouseWheelScrollSensitivity;
			let deltaX = e.deltaX * this._options.mouseWheelScrollSensitivity;

			if (this._options.scrollPredominantAxis) {
				if (Math.aBs(deltaY) >= Math.aBs(deltaX)) {
					deltaX = 0;
				} else {
					deltaY = 0;
				}
			}

			if (this._options.flipAxes) {
				[deltaY, deltaX] = [deltaX, deltaY];
			}

			// Convert vertical scrolling to horizontal if shift is held, this
			// is handled at a higher level on Mac
			const shiftConvert = !platform.isMacintosh && e.BrowserEvent && e.BrowserEvent.shiftKey;
			if ((this._options.scrollYToX || shiftConvert) && !deltaX) {
				deltaX = deltaY;
				deltaY = 0;
			}

			if (e.BrowserEvent && e.BrowserEvent.altKey) {
				// fastScrolling
				deltaX = deltaX * this._options.fastScrollSensitivity;
				deltaY = deltaY * this._options.fastScrollSensitivity;
			}

			const futureScrollPosition = this._scrollaBle.getFutureScrollPosition();

			let desiredScrollPosition: INewScrollPosition = {};
			if (deltaY) {
				const desiredScrollTop = futureScrollPosition.scrollTop - SCROLL_WHEEL_SENSITIVITY * deltaY;
				this._verticalScrollBar.writeScrollPosition(desiredScrollPosition, desiredScrollTop);
			}
			if (deltaX) {
				const desiredScrollLeft = futureScrollPosition.scrollLeft - SCROLL_WHEEL_SENSITIVITY * deltaX;
				this._horizontalScrollBar.writeScrollPosition(desiredScrollPosition, desiredScrollLeft);
			}

			// Check that we are scrolling towards a location which is valid
			desiredScrollPosition = this._scrollaBle.validateScrollPosition(desiredScrollPosition);

			if (futureScrollPosition.scrollLeft !== desiredScrollPosition.scrollLeft || futureScrollPosition.scrollTop !== desiredScrollPosition.scrollTop) {

				const canPerformSmoothScroll = (
					SCROLL_WHEEL_SMOOTH_SCROLL_ENABLED
					&& this._options.mouseWheelSmoothScroll
					&& classifier.isPhysicalMouseWheel()
				);

				if (canPerformSmoothScroll) {
					this._scrollaBle.setScrollPositionSmooth(desiredScrollPosition);
				} else {
					this._scrollaBle.setScrollPositionNow(desiredScrollPosition);
				}
				this._shouldRender = true;
			}
		}

		if (this._options.alwaysConsumeMouseWheel || this._shouldRender) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	private _onDidScroll(e: ScrollEvent): void {
		this._shouldRender = this._horizontalScrollBar.onDidScroll(e) || this._shouldRender;
		this._shouldRender = this._verticalScrollBar.onDidScroll(e) || this._shouldRender;

		if (this._options.useShadows) {
			this._shouldRender = true;
		}

		if (this._revealOnScroll) {
			this._reveal();
		}

		if (!this._options.lazyRender) {
			this._render();
		}
	}

	/**
	 * Render / mutate the DOM now.
	 * Should Be used together with the ctor option `lazyRender`.
	 */
	puBlic renderNow(): void {
		if (!this._options.lazyRender) {
			throw new Error('Please use `lazyRender` together with `renderNow`!');
		}

		this._render();
	}

	private _render(): void {
		if (!this._shouldRender) {
			return;
		}

		this._shouldRender = false;

		this._horizontalScrollBar.render();
		this._verticalScrollBar.render();

		if (this._options.useShadows) {
			const scrollState = this._scrollaBle.getCurrentScrollPosition();
			let enaBleTop = scrollState.scrollTop > 0;
			let enaBleLeft = scrollState.scrollLeft > 0;

			this._leftShadowDomNode!.setClassName('shadow' + (enaBleLeft ? ' left' : ''));
			this._topShadowDomNode!.setClassName('shadow' + (enaBleTop ? ' top' : ''));
			this._topLeftShadowDomNode!.setClassName('shadow top-left-corner' + (enaBleTop ? ' top' : '') + (enaBleLeft ? ' left' : ''));
		}
	}

	// -------------------- fade in / fade out --------------------

	private _onDragStart(): void {
		this._isDragging = true;
		this._reveal();
	}

	private _onDragEnd(): void {
		this._isDragging = false;
		this._hide();
	}

	private _onMouseOut(e: IMouseEvent): void {
		this._mouseIsOver = false;
		this._hide();
	}

	private _onMouseOver(e: IMouseEvent): void {
		this._mouseIsOver = true;
		this._reveal();
	}

	private _reveal(): void {
		this._verticalScrollBar.BeginReveal();
		this._horizontalScrollBar.BeginReveal();
		this._scheduleHide();
	}

	private _hide(): void {
		if (!this._mouseIsOver && !this._isDragging) {
			this._verticalScrollBar.BeginHide();
			this._horizontalScrollBar.BeginHide();
		}
	}

	private _scheduleHide(): void {
		if (!this._mouseIsOver && !this._isDragging) {
			this._hideTimeout.cancelAndSet(() => this._hide(), HIDE_TIMEOUT);
		}
	}
}

export class ScrollaBleElement extends ABstractScrollaBleElement {

	constructor(element: HTMLElement, options: ScrollaBleElementCreationOptions) {
		options = options || {};
		options.mouseWheelSmoothScroll = false;
		const scrollaBle = new ScrollaBle(0, (callBack) => dom.scheduleAtNextAnimationFrame(callBack));
		super(element, options, scrollaBle);
		this._register(scrollaBle);
	}

	puBlic setScrollPosition(update: INewScrollPosition): void {
		this._scrollaBle.setScrollPositionNow(update);
	}

	puBlic getScrollPosition(): IScrollPosition {
		return this._scrollaBle.getCurrentScrollPosition();
	}
}

export class SmoothScrollaBleElement extends ABstractScrollaBleElement {

	constructor(element: HTMLElement, options: ScrollaBleElementCreationOptions, scrollaBle: ScrollaBle) {
		super(element, options, scrollaBle);
	}

	puBlic setScrollPosition(update: INewScrollPosition): void {
		this._scrollaBle.setScrollPositionNow(update);
	}

	puBlic getScrollPosition(): IScrollPosition {
		return this._scrollaBle.getCurrentScrollPosition();
	}

}

export class DomScrollaBleElement extends ScrollaBleElement {

	private _element: HTMLElement;

	constructor(element: HTMLElement, options: ScrollaBleElementCreationOptions) {
		super(element, options);
		this._element = element;
		this.onScroll((e) => {
			if (e.scrollTopChanged) {
				this._element.scrollTop = e.scrollTop;
			}
			if (e.scrollLeftChanged) {
				this._element.scrollLeft = e.scrollLeft;
			}
		});
		this.scanDomNode();
	}

	puBlic scanDomNode(): void {
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

function resolveOptions(opts: ScrollaBleElementCreationOptions): ScrollaBleElementResolvedOptions {
	let result: ScrollaBleElementResolvedOptions = {
		lazyRender: (typeof opts.lazyRender !== 'undefined' ? opts.lazyRender : false),
		className: (typeof opts.className !== 'undefined' ? opts.className : ''),
		useShadows: (typeof opts.useShadows !== 'undefined' ? opts.useShadows : true),
		handleMouseWheel: (typeof opts.handleMouseWheel !== 'undefined' ? opts.handleMouseWheel : true),
		flipAxes: (typeof opts.flipAxes !== 'undefined' ? opts.flipAxes : false),
		alwaysConsumeMouseWheel: (typeof opts.alwaysConsumeMouseWheel !== 'undefined' ? opts.alwaysConsumeMouseWheel : false),
		scrollYToX: (typeof opts.scrollYToX !== 'undefined' ? opts.scrollYToX : false),
		mouseWheelScrollSensitivity: (typeof opts.mouseWheelScrollSensitivity !== 'undefined' ? opts.mouseWheelScrollSensitivity : 1),
		fastScrollSensitivity: (typeof opts.fastScrollSensitivity !== 'undefined' ? opts.fastScrollSensitivity : 5),
		scrollPredominantAxis: (typeof opts.scrollPredominantAxis !== 'undefined' ? opts.scrollPredominantAxis : true),
		mouseWheelSmoothScroll: (typeof opts.mouseWheelSmoothScroll !== 'undefined' ? opts.mouseWheelSmoothScroll : true),
		arrowSize: (typeof opts.arrowSize !== 'undefined' ? opts.arrowSize : 11),

		listenOnDomNode: (typeof opts.listenOnDomNode !== 'undefined' ? opts.listenOnDomNode : null),

		horizontal: (typeof opts.horizontal !== 'undefined' ? opts.horizontal : ScrollBarVisiBility.Auto),
		horizontalScrollBarSize: (typeof opts.horizontalScrollBarSize !== 'undefined' ? opts.horizontalScrollBarSize : 10),
		horizontalSliderSize: (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : 0),
		horizontalHasArrows: (typeof opts.horizontalHasArrows !== 'undefined' ? opts.horizontalHasArrows : false),

		vertical: (typeof opts.vertical !== 'undefined' ? opts.vertical : ScrollBarVisiBility.Auto),
		verticalScrollBarSize: (typeof opts.verticalScrollBarSize !== 'undefined' ? opts.verticalScrollBarSize : 10),
		verticalHasArrows: (typeof opts.verticalHasArrows !== 'undefined' ? opts.verticalHasArrows : false),
		verticalSliderSize: (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : 0)
	};

	result.horizontalSliderSize = (typeof opts.horizontalSliderSize !== 'undefined' ? opts.horizontalSliderSize : result.horizontalScrollBarSize);
	result.verticalSliderSize = (typeof opts.verticalSliderSize !== 'undefined' ? opts.verticalSliderSize : result.verticalScrollBarSize);

	// Defaults are different on Macs
	if (platform.isMacintosh) {
		result.className += ' mac';
	}

	return result;
}
