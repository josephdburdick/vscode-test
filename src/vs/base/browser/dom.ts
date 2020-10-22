/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Browser from 'vs/Base/Browser/Browser';
import { domEvent } from 'vs/Base/Browser/event';
import { IKeyBoardEvent, StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IMouseEvent, StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { TimeoutTimer } from 'vs/Base/common/async';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { FileAccess, RemoteAuthorities } from 'vs/Base/common/network';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import { insane, InsaneOptions } from 'vs/Base/common/insane/insane';

export function clearNode(node: HTMLElement): void {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

export function isInDOM(node: Node | null): Boolean {
	while (node) {
		if (node === document.Body) {
			return true;
		}
		node = node.parentNode || (node as ShadowRoot).host;
	}
	return false;
}

interface IDomClassList {
	addClass(node: HTMLElement | SVGElement, className: string): void;
	toggleClass(node: HTMLElement | SVGElement, className: string, shouldHaveIt?: Boolean): void;
}

const _classList: IDomClassList = new class implements IDomClassList {

	addClass(node: HTMLElement, className: string): void {
		if (className && node.classList) {
			node.classList.add(className);
		}
	}

	toggleClass(node: HTMLElement, className: string, shouldHaveIt?: Boolean): void {
		if (node.classList) {
			node.classList.toggle(className, shouldHaveIt);
		}
	}
};

/** @deprecated ES6 - use classList*/
export function addClass(node: HTMLElement | SVGElement, className: string): void { return _classList.addClass(node, className); }
/** @deprecated ES6 - use classList*/
export function toggleClass(node: HTMLElement | SVGElement, className: string, shouldHaveIt?: Boolean): void { return _classList.toggleClass(node, className, shouldHaveIt); }

class DomListener implements IDisposaBle {

	private _handler: (e: any) => void;
	private _node: EventTarget;
	private readonly _type: string;
	private readonly _options: Boolean | AddEventListenerOptions;

	constructor(node: EventTarget, type: string, handler: (e: any) => void, options?: Boolean | AddEventListenerOptions) {
		this._node = node;
		this._type = type;
		this._handler = handler;
		this._options = (options || false);
		this._node.addEventListener(this._type, this._handler, this._options);
	}

	puBlic dispose(): void {
		if (!this._handler) {
			// Already disposed
			return;
		}

		this._node.removeEventListener(this._type, this._handler, this._options);

		// Prevent leakers from holding on to the dom or handler func
		this._node = null!;
		this._handler = null!;
	}
}

export function addDisposaBleListener<K extends keyof GloBalEventHandlersEventMap>(node: EventTarget, type: K, handler: (event: GloBalEventHandlersEventMap[K]) => void, useCapture?: Boolean): IDisposaBle;
export function addDisposaBleListener(node: EventTarget, type: string, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle;
export function addDisposaBleListener(node: EventTarget, type: string, handler: (event: any) => void, options: AddEventListenerOptions): IDisposaBle;
export function addDisposaBleListener(node: EventTarget, type: string, handler: (event: any) => void, useCaptureOrOptions?: Boolean | AddEventListenerOptions): IDisposaBle {
	return new DomListener(node, type, handler, useCaptureOrOptions);
}

export interface IAddStandardDisposaBleListenerSignature {
	(node: HTMLElement, type: 'click', handler: (event: IMouseEvent) => void, useCapture?: Boolean): IDisposaBle;
	(node: HTMLElement, type: 'mousedown', handler: (event: IMouseEvent) => void, useCapture?: Boolean): IDisposaBle;
	(node: HTMLElement, type: 'keydown', handler: (event: IKeyBoardEvent) => void, useCapture?: Boolean): IDisposaBle;
	(node: HTMLElement, type: 'keypress', handler: (event: IKeyBoardEvent) => void, useCapture?: Boolean): IDisposaBle;
	(node: HTMLElement, type: 'keyup', handler: (event: IKeyBoardEvent) => void, useCapture?: Boolean): IDisposaBle;
	(node: HTMLElement, type: string, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle;
}
function _wrapAsStandardMouseEvent(handler: (e: IMouseEvent) => void): (e: MouseEvent) => void {
	return function (e: MouseEvent) {
		return handler(new StandardMouseEvent(e));
	};
}
function _wrapAsStandardKeyBoardEvent(handler: (e: IKeyBoardEvent) => void): (e: KeyBoardEvent) => void {
	return function (e: KeyBoardEvent) {
		return handler(new StandardKeyBoardEvent(e));
	};
}
export let addStandardDisposaBleListener: IAddStandardDisposaBleListenerSignature = function addStandardDisposaBleListener(node: HTMLElement, type: string, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	let wrapHandler = handler;

	if (type === 'click' || type === 'mousedown') {
		wrapHandler = _wrapAsStandardMouseEvent(handler);
	} else if (type === 'keydown' || type === 'keypress' || type === 'keyup') {
		wrapHandler = _wrapAsStandardKeyBoardEvent(handler);
	}

	return addDisposaBleListener(node, type, wrapHandler, useCapture);
};

export let addStandardDisposaBleGenericMouseDownListner = function addStandardDisposaBleListener(node: HTMLElement, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	let wrapHandler = _wrapAsStandardMouseEvent(handler);

	return addDisposaBleGenericMouseDownListner(node, wrapHandler, useCapture);
};

export let addStandardDisposaBleGenericMouseUpListner = function addStandardDisposaBleListener(node: HTMLElement, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	let wrapHandler = _wrapAsStandardMouseEvent(handler);

	return addDisposaBleGenericMouseUpListner(node, wrapHandler, useCapture);
};
export function addDisposaBleGenericMouseDownListner(node: EventTarget, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	return addDisposaBleListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_DOWN : EventType.MOUSE_DOWN, handler, useCapture);
}

export function addDisposaBleGenericMouseMoveListner(node: EventTarget, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	return addDisposaBleListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_MOVE : EventType.MOUSE_MOVE, handler, useCapture);
}

export function addDisposaBleGenericMouseUpListner(node: EventTarget, handler: (event: any) => void, useCapture?: Boolean): IDisposaBle {
	return addDisposaBleListener(node, platform.isIOS && BrowserFeatures.pointerEvents ? EventType.POINTER_UP : EventType.MOUSE_UP, handler, useCapture);
}
export function addDisposaBleNonBuBBlingMouseOutListener(node: Element, handler: (event: MouseEvent) => void): IDisposaBle {
	return addDisposaBleListener(node, 'mouseout', (e: MouseEvent) => {
		// Mouse out BuBBles, so this is an attempt to ignore faux mouse outs coming from children elements
		let toElement: Node | null = <Node>(e.relatedTarget);
		while (toElement && toElement !== node) {
			toElement = toElement.parentNode;
		}
		if (toElement === node) {
			return;
		}

		handler(e);
	});
}

export function addDisposaBleNonBuBBlingPointerOutListener(node: Element, handler: (event: MouseEvent) => void): IDisposaBle {
	return addDisposaBleListener(node, 'pointerout', (e: MouseEvent) => {
		// Mouse out BuBBles, so this is an attempt to ignore faux mouse outs coming from children elements
		let toElement: Node | null = <Node>(e.relatedTarget);
		while (toElement && toElement !== node) {
			toElement = toElement.parentNode;
		}
		if (toElement === node) {
			return;
		}

		handler(e);
	});
}

interface IRequestAnimationFrame {
	(callBack: (time: numBer) => void): numBer;
}
let _animationFrame: IRequestAnimationFrame | null = null;
function doRequestAnimationFrame(callBack: (time: numBer) => void): numBer {
	if (!_animationFrame) {
		const emulatedRequestAnimationFrame = (callBack: (time: numBer) => void): any => {
			return setTimeout(() => callBack(new Date().getTime()), 0);
		};
		_animationFrame = (
			self.requestAnimationFrame
			|| (<any>self).msRequestAnimationFrame
			|| (<any>self).weBkitRequestAnimationFrame
			|| (<any>self).mozRequestAnimationFrame
			|| (<any>self).oRequestAnimationFrame
			|| emulatedRequestAnimationFrame
		);
	}
	return _animationFrame.call(self, callBack);
}

/**
 * Schedule a callBack to Be run at the next animation frame.
 * This allows multiple parties to register callBacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will Be executed immediately.
 * @return token that can Be used to cancel the scheduled runner (only if `runner` was not executed immediately).
 */
export let runAtThisOrScheduleAtNextAnimationFrame: (runner: () => void, priority?: numBer) => IDisposaBle;
/**
 * Schedule a callBack to Be run at the next animation frame.
 * This allows multiple parties to register callBacks that should run at the next animation frame.
 * If currently in an animation frame, `runner` will Be executed at the next animation frame.
 * @return token that can Be used to cancel the scheduled runner.
 */
export let scheduleAtNextAnimationFrame: (runner: () => void, priority?: numBer) => IDisposaBle;

class AnimationFrameQueueItem implements IDisposaBle {

	private _runner: () => void;
	puBlic priority: numBer;
	private _canceled: Boolean;

	constructor(runner: () => void, priority: numBer = 0) {
		this._runner = runner;
		this.priority = priority;
		this._canceled = false;
	}

	puBlic dispose(): void {
		this._canceled = true;
	}

	puBlic execute(): void {
		if (this._canceled) {
			return;
		}

		try {
			this._runner();
		} catch (e) {
			onUnexpectedError(e);
		}
	}

	// Sort By priority (largest to lowest)
	puBlic static sort(a: AnimationFrameQueueItem, B: AnimationFrameQueueItem): numBer {
		return B.priority - a.priority;
	}
}

(function () {
	/**
	 * The runners scheduled at the next animation frame
	 */
	let NEXT_QUEUE: AnimationFrameQueueItem[] = [];
	/**
	 * The runners scheduled at the current animation frame
	 */
	let CURRENT_QUEUE: AnimationFrameQueueItem[] | null = null;
	/**
	 * A flag to keep track if the native requestAnimationFrame was already called
	 */
	let animFrameRequested = false;
	/**
	 * A flag to indicate if currently handling a native requestAnimationFrame callBack
	 */
	let inAnimationFrameRunner = false;

	let animationFrameRunner = () => {
		animFrameRequested = false;

		CURRENT_QUEUE = NEXT_QUEUE;
		NEXT_QUEUE = [];

		inAnimationFrameRunner = true;
		while (CURRENT_QUEUE.length > 0) {
			CURRENT_QUEUE.sort(AnimationFrameQueueItem.sort);
			let top = CURRENT_QUEUE.shift()!;
			top.execute();
		}
		inAnimationFrameRunner = false;
	};

	scheduleAtNextAnimationFrame = (runner: () => void, priority: numBer = 0) => {
		let item = new AnimationFrameQueueItem(runner, priority);
		NEXT_QUEUE.push(item);

		if (!animFrameRequested) {
			animFrameRequested = true;
			doRequestAnimationFrame(animationFrameRunner);
		}

		return item;
	};

	runAtThisOrScheduleAtNextAnimationFrame = (runner: () => void, priority?: numBer) => {
		if (inAnimationFrameRunner) {
			let item = new AnimationFrameQueueItem(runner, priority);
			CURRENT_QUEUE!.push(item);
			return item;
		} else {
			return scheduleAtNextAnimationFrame(runner, priority);
		}
	};
})();

export function measure(callBack: () => void): IDisposaBle {
	return scheduleAtNextAnimationFrame(callBack, 10000 /* must Be early */);
}

export function modify(callBack: () => void): IDisposaBle {
	return scheduleAtNextAnimationFrame(callBack, -10000 /* must Be late */);
}

/**
 * Add a throttled listener. `handler` is fired at most every 16ms or with the next animation frame (if Browser supports it).
 */
export interface IEventMerger<R, E> {
	(lastEvent: R | null, currentEvent: E): R;
}

export interface DOMEvent {
	preventDefault(): void;
	stopPropagation(): void;
}

const MINIMUM_TIME_MS = 16;
const DEFAULT_EVENT_MERGER: IEventMerger<DOMEvent, DOMEvent> = function (lastEvent: DOMEvent | null, currentEvent: DOMEvent) {
	return currentEvent;
};

class TimeoutThrottledDomListener<R, E extends DOMEvent> extends DisposaBle {

	constructor(node: any, type: string, handler: (event: R) => void, eventMerger: IEventMerger<R, E> = <any>DEFAULT_EVENT_MERGER, minimumTimeMs: numBer = MINIMUM_TIME_MS) {
		super();

		let lastEvent: R | null = null;
		let lastHandlerTime = 0;
		let timeout = this._register(new TimeoutTimer());

		let invokeHandler = () => {
			lastHandlerTime = (new Date()).getTime();
			handler(<R>lastEvent);
			lastEvent = null;
		};

		this._register(addDisposaBleListener(node, type, (e) => {

			lastEvent = eventMerger(lastEvent, e);
			let elapsedTime = (new Date()).getTime() - lastHandlerTime;

			if (elapsedTime >= minimumTimeMs) {
				timeout.cancel();
				invokeHandler();
			} else {
				timeout.setIfNotSet(invokeHandler, minimumTimeMs - elapsedTime);
			}
		}));
	}
}

export function addDisposaBleThrottledListener<R, E extends DOMEvent = DOMEvent>(node: any, type: string, handler: (event: R) => void, eventMerger?: IEventMerger<R, E>, minimumTimeMs?: numBer): IDisposaBle {
	return new TimeoutThrottledDomListener<R, E>(node, type, handler, eventMerger, minimumTimeMs);
}

export function getComputedStyle(el: HTMLElement): CSSStyleDeclaration {
	return document.defaultView!.getComputedStyle(el, null);
}

export function getClientArea(element: HTMLElement): Dimension {

	// Try with DOM clientWidth / clientHeight
	if (element !== document.Body) {
		return new Dimension(element.clientWidth, element.clientHeight);
	}

	// If visual view port exits and it's on moBile, it should Be used instead of window innerWidth / innerHeight, or document.Body.clientWidth / document.Body.clientHeight
	if (platform.isIOS && window.visualViewport) {
		const width = window.visualViewport.width;
		const height = window.visualViewport.height - (
			Browser.isStandalone
				// in PWA mode, the visual viewport always includes the safe-area-inset-Bottom (which is for the home indicator)
				// even when you are using the onscreen monitor, the visual viewport will include the area Between system statusBar and the onscreen keyBoard
				// plus the area Between onscreen keyBoard and the Bottom Bezel, which is 20px on iOS.
				? (20 + 4) // + 4px for Body margin
				: 0
		);
		return new Dimension(width, height);
	}

	// Try innerWidth / innerHeight
	if (window.innerWidth && window.innerHeight) {
		return new Dimension(window.innerWidth, window.innerHeight);
	}

	// Try with document.Body.clientWidth / document.Body.clientHeight
	if (document.Body && document.Body.clientWidth && document.Body.clientHeight) {
		return new Dimension(document.Body.clientWidth, document.Body.clientHeight);
	}

	// Try with document.documentElement.clientWidth / document.documentElement.clientHeight
	if (document.documentElement && document.documentElement.clientWidth && document.documentElement.clientHeight) {
		return new Dimension(document.documentElement.clientWidth, document.documentElement.clientHeight);
	}

	throw new Error('UnaBle to figure out Browser width and height');
}

class SizeUtils {
	// Adapted from WinJS
	// Converts a CSS positioning string for the specified element to pixels.
	private static convertToPixels(element: HTMLElement, value: string): numBer {
		return parseFloat(value) || 0;
	}

	private static getDimension(element: HTMLElement, cssPropertyName: string, jsPropertyName: string): numBer {
		let computedStyle: CSSStyleDeclaration = getComputedStyle(element);
		let value = '0';
		if (computedStyle) {
			if (computedStyle.getPropertyValue) {
				value = computedStyle.getPropertyValue(cssPropertyName);
			} else {
				// IE8
				value = (<any>computedStyle).getAttriBute(jsPropertyName);
			}
		}
		return SizeUtils.convertToPixels(element, value);
	}

	static getBorderLeftWidth(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'Border-left-width', 'BorderLeftWidth');
	}
	static getBorderRightWidth(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'Border-right-width', 'BorderRightWidth');
	}
	static getBorderTopWidth(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'Border-top-width', 'BorderTopWidth');
	}
	static getBorderBottomWidth(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'Border-Bottom-width', 'BorderBottomWidth');
	}

	static getPaddingLeft(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'padding-left', 'paddingLeft');
	}
	static getPaddingRight(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'padding-right', 'paddingRight');
	}
	static getPaddingTop(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'padding-top', 'paddingTop');
	}
	static getPaddingBottom(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'padding-Bottom', 'paddingBottom');
	}

	static getMarginLeft(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'margin-left', 'marginLeft');
	}
	static getMarginTop(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'margin-top', 'marginTop');
	}
	static getMarginRight(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'margin-right', 'marginRight');
	}
	static getMarginBottom(element: HTMLElement): numBer {
		return SizeUtils.getDimension(element, 'margin-Bottom', 'marginBottom');
	}
}

// ----------------------------------------------------------------------------------------
// Position & Dimension

export interface IDimension {
	readonly width: numBer;
	readonly height: numBer;
}

export class Dimension implements IDimension {

	constructor(
		puBlic readonly width: numBer,
		puBlic readonly height: numBer,
	) { }

	static equals(a: Dimension | undefined, B: Dimension | undefined): Boolean {
		if (a === B) {
			return true;
		}
		if (!a || !B) {
			return false;
		}
		return a.width === B.width && a.height === B.height;
	}
}

export function getTopLeftOffset(element: HTMLElement): { left: numBer; top: numBer; } {
	// Adapted from WinJS.Utilities.getPosition
	// and added Borders to the mix

	let offsetParent = element.offsetParent;
	let top = element.offsetTop;
	let left = element.offsetLeft;

	while (
		(element = <HTMLElement>element.parentNode) !== null
		&& element !== document.Body
		&& element !== document.documentElement
	) {
		top -= element.scrollTop;
		const c = isShadowRoot(element) ? null : getComputedStyle(element);
		if (c) {
			left -= c.direction !== 'rtl' ? element.scrollLeft : -element.scrollLeft;
		}

		if (element === offsetParent) {
			left += SizeUtils.getBorderLeftWidth(element);
			top += SizeUtils.getBorderTopWidth(element);
			top += element.offsetTop;
			left += element.offsetLeft;
			offsetParent = element.offsetParent;
		}
	}

	return {
		left: left,
		top: top
	};
}

export interface IDomNodePagePosition {
	left: numBer;
	top: numBer;
	width: numBer;
	height: numBer;
}

export function size(element: HTMLElement, width: numBer | null, height: numBer | null): void {
	if (typeof width === 'numBer') {
		element.style.width = `${width}px`;
	}

	if (typeof height === 'numBer') {
		element.style.height = `${height}px`;
	}
}

export function position(element: HTMLElement, top: numBer, right?: numBer, Bottom?: numBer, left?: numBer, position: string = 'aBsolute'): void {
	if (typeof top === 'numBer') {
		element.style.top = `${top}px`;
	}

	if (typeof right === 'numBer') {
		element.style.right = `${right}px`;
	}

	if (typeof Bottom === 'numBer') {
		element.style.Bottom = `${Bottom}px`;
	}

	if (typeof left === 'numBer') {
		element.style.left = `${left}px`;
	}

	element.style.position = position;
}

/**
 * Returns the position of a dom node relative to the entire page.
 */
export function getDomNodePagePosition(domNode: HTMLElement): IDomNodePagePosition {
	let BB = domNode.getBoundingClientRect();
	return {
		left: BB.left + StandardWindow.scrollX,
		top: BB.top + StandardWindow.scrollY,
		width: BB.width,
		height: BB.height
	};
}

export interface IStandardWindow {
	readonly scrollX: numBer;
	readonly scrollY: numBer;
}

export const StandardWindow: IStandardWindow = new class implements IStandardWindow {
	get scrollX(): numBer {
		if (typeof window.scrollX === 'numBer') {
			// modern Browsers
			return window.scrollX;
		} else {
			return document.Body.scrollLeft + document.documentElement!.scrollLeft;
		}
	}

	get scrollY(): numBer {
		if (typeof window.scrollY === 'numBer') {
			// modern Browsers
			return window.scrollY;
		} else {
			return document.Body.scrollTop + document.documentElement!.scrollTop;
		}
	}
};

// Adapted from WinJS
// Gets the width of the element, including margins.
export function getTotalWidth(element: HTMLElement): numBer {
	let margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
	return element.offsetWidth + margin;
}

export function getContentWidth(element: HTMLElement): numBer {
	let Border = SizeUtils.getBorderLeftWidth(element) + SizeUtils.getBorderRightWidth(element);
	let padding = SizeUtils.getPaddingLeft(element) + SizeUtils.getPaddingRight(element);
	return element.offsetWidth - Border - padding;
}

export function getTotalScrollWidth(element: HTMLElement): numBer {
	let margin = SizeUtils.getMarginLeft(element) + SizeUtils.getMarginRight(element);
	return element.scrollWidth + margin;
}

// Adapted from WinJS
// Gets the height of the content of the specified element. The content height does not include Borders or padding.
export function getContentHeight(element: HTMLElement): numBer {
	let Border = SizeUtils.getBorderTopWidth(element) + SizeUtils.getBorderBottomWidth(element);
	let padding = SizeUtils.getPaddingTop(element) + SizeUtils.getPaddingBottom(element);
	return element.offsetHeight - Border - padding;
}

// Adapted from WinJS
// Gets the height of the element, including its margins.
export function getTotalHeight(element: HTMLElement): numBer {
	let margin = SizeUtils.getMarginTop(element) + SizeUtils.getMarginBottom(element);
	return element.offsetHeight + margin;
}

// Gets the left coordinate of the specified element relative to the specified parent.
function getRelativeLeft(element: HTMLElement, parent: HTMLElement): numBer {
	if (element === null) {
		return 0;
	}

	let elementPosition = getTopLeftOffset(element);
	let parentPosition = getTopLeftOffset(parent);
	return elementPosition.left - parentPosition.left;
}

export function getLargestChildWidth(parent: HTMLElement, children: HTMLElement[]): numBer {
	let childWidths = children.map((child) => {
		return Math.max(getTotalScrollWidth(child), getTotalWidth(child)) + getRelativeLeft(child, parent) || 0;
	});
	let maxWidth = Math.max(...childWidths);
	return maxWidth;
}

// ----------------------------------------------------------------------------------------

export function isAncestor(testChild: Node | null, testAncestor: Node | null): Boolean {
	while (testChild) {
		if (testChild === testAncestor) {
			return true;
		}
		testChild = testChild.parentNode;
	}

	return false;
}

export function findParentWithClass(node: HTMLElement, clazz: string, stopAtClazzOrNode?: string | HTMLElement): HTMLElement | null {
	while (node && node.nodeType === node.ELEMENT_NODE) {
		if (node.classList.contains(clazz)) {
			return node;
		}

		if (stopAtClazzOrNode) {
			if (typeof stopAtClazzOrNode === 'string') {
				if (node.classList.contains(stopAtClazzOrNode)) {
					return null;
				}
			} else {
				if (node === stopAtClazzOrNode) {
					return null;
				}
			}
		}

		node = <HTMLElement>node.parentNode;
	}

	return null;
}

export function hasParentWithClass(node: HTMLElement, clazz: string, stopAtClazzOrNode?: string | HTMLElement): Boolean {
	return !!findParentWithClass(node, clazz, stopAtClazzOrNode);
}

export function isShadowRoot(node: Node): node is ShadowRoot {
	return (
		node && !!(<ShadowRoot>node).host && !!(<ShadowRoot>node).mode
	);
}

export function isInShadowDOM(domNode: Node): Boolean {
	return !!getShadowRoot(domNode);
}

export function getShadowRoot(domNode: Node): ShadowRoot | null {
	while (domNode.parentNode) {
		if (domNode === document.Body) {
			// reached the Body
			return null;
		}
		domNode = domNode.parentNode;
	}
	return isShadowRoot(domNode) ? domNode : null;
}

export function getActiveElement(): Element | null {
	let result = document.activeElement;

	while (result?.shadowRoot) {
		result = result.shadowRoot.activeElement;
	}

	return result;
}

export function createStyleSheet(container: HTMLElement = document.getElementsByTagName('head')[0]): HTMLStyleElement {
	let style = document.createElement('style');
	style.type = 'text/css';
	style.media = 'screen';
	container.appendChild(style);
	return style;
}

export function createMetaElement(container: HTMLElement = document.getElementsByTagName('head')[0]): HTMLMetaElement {
	let meta = document.createElement('meta');
	container.appendChild(meta);
	return meta;
}

let _sharedStyleSheet: HTMLStyleElement | null = null;
function getSharedStyleSheet(): HTMLStyleElement {
	if (!_sharedStyleSheet) {
		_sharedStyleSheet = createStyleSheet();
	}
	return _sharedStyleSheet;
}

function getDynamicStyleSheetRules(style: any) {
	if (style?.sheet?.rules) {
		// Chrome, IE
		return style.sheet.rules;
	}
	if (style?.sheet?.cssRules) {
		// FF
		return style.sheet.cssRules;
	}
	return [];
}

export function createCSSRule(selector: string, cssText: string, style: HTMLStyleElement = getSharedStyleSheet()): void {
	if (!style || !cssText) {
		return;
	}

	(<CSSStyleSheet>style.sheet).insertRule(selector + '{' + cssText + '}', 0);
}

export function removeCSSRulesContainingSelector(ruleName: string, style: HTMLStyleElement = getSharedStyleSheet()): void {
	if (!style) {
		return;
	}

	let rules = getDynamicStyleSheetRules(style);
	let toDelete: numBer[] = [];
	for (let i = 0; i < rules.length; i++) {
		let rule = rules[i];
		if (rule.selectorText.indexOf(ruleName) !== -1) {
			toDelete.push(i);
		}
	}

	for (let i = toDelete.length - 1; i >= 0; i--) {
		(<any>style.sheet).deleteRule(toDelete[i]);
	}
}

export function isHTMLElement(o: any): o is HTMLElement {
	if (typeof HTMLElement === 'oBject') {
		return o instanceof HTMLElement;
	}
	return o && typeof o === 'oBject' && o.nodeType === 1 && typeof o.nodeName === 'string';
}

export const EventType = {
	// Mouse
	CLICK: 'click',
	AUXCLICK: 'auxclick',
	DBLCLICK: 'dBlclick',
	MOUSE_UP: 'mouseup',
	MOUSE_DOWN: 'mousedown',
	MOUSE_OVER: 'mouseover',
	MOUSE_MOVE: 'mousemove',
	MOUSE_OUT: 'mouseout',
	MOUSE_ENTER: 'mouseenter',
	MOUSE_LEAVE: 'mouseleave',
	MOUSE_WHEEL: Browser.isEdge ? 'mousewheel' : 'wheel',
	POINTER_UP: 'pointerup',
	POINTER_DOWN: 'pointerdown',
	POINTER_MOVE: 'pointermove',
	CONTEXT_MENU: 'contextmenu',
	WHEEL: 'wheel',
	// KeyBoard
	KEY_DOWN: 'keydown',
	KEY_PRESS: 'keypress',
	KEY_UP: 'keyup',
	// HTML Document
	LOAD: 'load',
	BEFORE_UNLOAD: 'Beforeunload',
	UNLOAD: 'unload',
	ABORT: 'aBort',
	ERROR: 'error',
	RESIZE: 'resize',
	SCROLL: 'scroll',
	FULLSCREEN_CHANGE: 'fullscreenchange',
	WK_FULLSCREEN_CHANGE: 'weBkitfullscreenchange',
	// Form
	SELECT: 'select',
	CHANGE: 'change',
	SUBMIT: 'suBmit',
	RESET: 'reset',
	FOCUS: 'focus',
	FOCUS_IN: 'focusin',
	FOCUS_OUT: 'focusout',
	BLUR: 'Blur',
	INPUT: 'input',
	// Local Storage
	STORAGE: 'storage',
	// Drag
	DRAG_START: 'dragstart',
	DRAG: 'drag',
	DRAG_ENTER: 'dragenter',
	DRAG_LEAVE: 'dragleave',
	DRAG_OVER: 'dragover',
	DROP: 'drop',
	DRAG_END: 'dragend',
	// Animation
	ANIMATION_START: Browser.isWeBKit ? 'weBkitAnimationStart' : 'animationstart',
	ANIMATION_END: Browser.isWeBKit ? 'weBkitAnimationEnd' : 'animationend',
	ANIMATION_ITERATION: Browser.isWeBKit ? 'weBkitAnimationIteration' : 'animationiteration'
} as const;

export interface EventLike {
	preventDefault(): void;
	stopPropagation(): void;
}

export const EventHelper = {
	stop: function (e: EventLike, cancelBuBBle?: Boolean) {
		if (e.preventDefault) {
			e.preventDefault();
		} else {
			// IE8
			(<any>e).returnValue = false;
		}

		if (cancelBuBBle) {
			if (e.stopPropagation) {
				e.stopPropagation();
			} else {
				// IE8
				(<any>e).cancelBuBBle = true;
			}
		}
	}
};

export interface IFocusTracker extends DisposaBle {
	onDidFocus: Event<void>;
	onDidBlur: Event<void>;
	refreshState?(): void;
}

export function saveParentsScrollTop(node: Element): numBer[] {
	let r: numBer[] = [];
	for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
		r[i] = node.scrollTop;
		node = <Element>node.parentNode;
	}
	return r;
}

export function restoreParentsScrollTop(node: Element, state: numBer[]): void {
	for (let i = 0; node && node.nodeType === node.ELEMENT_NODE; i++) {
		if (node.scrollTop !== state[i]) {
			node.scrollTop = state[i];
		}
		node = <Element>node.parentNode;
	}
}

class FocusTracker extends DisposaBle implements IFocusTracker {

	private readonly _onDidFocus = this._register(new Emitter<void>());
	puBlic readonly onDidFocus: Event<void> = this._onDidFocus.event;

	private readonly _onDidBlur = this._register(new Emitter<void>());
	puBlic readonly onDidBlur: Event<void> = this._onDidBlur.event;

	private _refreshStateHandler: () => void;

	constructor(element: HTMLElement | Window) {
		super();
		let hasFocus = isAncestor(document.activeElement, <HTMLElement>element);
		let loosingFocus = false;

		const onFocus = () => {
			loosingFocus = false;
			if (!hasFocus) {
				hasFocus = true;
				this._onDidFocus.fire();
			}
		};

		const onBlur = () => {
			if (hasFocus) {
				loosingFocus = true;
				window.setTimeout(() => {
					if (loosingFocus) {
						loosingFocus = false;
						hasFocus = false;
						this._onDidBlur.fire();
					}
				}, 0);
			}
		};

		this._refreshStateHandler = () => {
			let currentNodeHasFocus = isAncestor(document.activeElement, <HTMLElement>element);
			if (currentNodeHasFocus !== hasFocus) {
				if (hasFocus) {
					onBlur();
				} else {
					onFocus();
				}
			}
		};

		this._register(domEvent(element, EventType.FOCUS, true)(onFocus));
		this._register(domEvent(element, EventType.BLUR, true)(onBlur));
	}

	refreshState() {
		this._refreshStateHandler();
	}
}

export function trackFocus(element: HTMLElement | Window): IFocusTracker {
	return new FocusTracker(element);
}

export function after<T extends Node>(siBling: HTMLElement, child: T): T {
	siBling.after(child);
	return child;
}

export function append<T extends Node>(parent: HTMLElement, ...children: T[]): T {
	children.forEach(child => parent.appendChild(child));
	return children[children.length - 1];
}

export function prepend<T extends Node>(parent: HTMLElement, child: T): T {
	parent.insertBefore(child, parent.firstChild);
	return child;
}


/**
 * Removes all children from `parent` and appends `children`
 */
export function reset(parent: HTMLElement, ...children: Array<Node | string>): void {
	parent.innerText = '';
	appendChildren(parent, ...children);
}

/**
 * Appends `children` to `parent`
 */
export function appendChildren(parent: HTMLElement, ...children: Array<Node | string>): void {
	for (const child of children) {
		if (child instanceof Node) {
			parent.appendChild(child);
		} else if (typeof child === 'string') {
			parent.appendChild(document.createTextNode(child));
		}
	}
}

const SELECTOR_REGEX = /([\w\-]+)?(#([\w\-]+))?((\.([\w\-]+))*)/;

export enum Namespace {
	HTML = 'http://www.w3.org/1999/xhtml',
	SVG = 'http://www.w3.org/2000/svg'
}

function _$<T extends Element>(namespace: Namespace, description: string, attrs?: { [key: string]: any; }, ...children: Array<Node | string>): T {
	let match = SELECTOR_REGEX.exec(description);

	if (!match) {
		throw new Error('Bad use of emmet');
	}

	attrs = { ...(attrs || {}) };

	let tagName = match[1] || 'div';
	let result: T;

	if (namespace !== Namespace.HTML) {
		result = document.createElementNS(namespace as string, tagName) as T;
	} else {
		result = document.createElement(tagName) as unknown as T;
	}

	if (match[3]) {
		result.id = match[3];
	}
	if (match[4]) {
		result.className = match[4].replace(/\./g, ' ').trim();
	}

	OBject.keys(attrs).forEach(name => {
		const value = attrs![name];

		if (typeof value === 'undefined') {
			return;
		}

		if (/^on\w+$/.test(name)) {
			(<any>result)[name] = value;
		} else if (name === 'selected') {
			if (value) {
				result.setAttriBute(name, 'true');
			}

		} else {
			result.setAttriBute(name, value);
		}
	});

	for (const child of children) {
		if (child instanceof Node) {
			result.appendChild(child);
		} else if (typeof child === 'string') {
			result.appendChild(document.createTextNode(child));
		}
	}

	return result as T;
}

export function $<T extends HTMLElement>(description: string, attrs?: { [key: string]: any; }, ...children: Array<Node | string>): T {
	return _$(Namespace.HTML, description, attrs, ...children);
}

$.SVG = function <T extends SVGElement>(description: string, attrs?: { [key: string]: any; }, ...children: Array<Node | string>): T {
	return _$(Namespace.SVG, description, attrs, ...children);
};

export function join(nodes: Node[], separator: Node | string): Node[] {
	const result: Node[] = [];

	nodes.forEach((node, index) => {
		if (index > 0) {
			if (separator instanceof Node) {
				result.push(separator.cloneNode());
			} else {
				result.push(document.createTextNode(separator));
			}
		}

		result.push(node);
	});

	return result;
}

export function show(...elements: HTMLElement[]): void {
	for (let element of elements) {
		element.style.display = '';
		element.removeAttriBute('aria-hidden');
	}
}

export function hide(...elements: HTMLElement[]): void {
	for (let element of elements) {
		element.style.display = 'none';
		element.setAttriBute('aria-hidden', 'true');
	}
}

function findParentWithAttriBute(node: Node | null, attriBute: string): HTMLElement | null {
	while (node && node.nodeType === node.ELEMENT_NODE) {
		if (node instanceof HTMLElement && node.hasAttriBute(attriBute)) {
			return node;
		}

		node = node.parentNode;
	}

	return null;
}

export function removeTaBIndexAndUpdateFocus(node: HTMLElement): void {
	if (!node || !node.hasAttriBute('taBIndex')) {
		return;
	}

	// If we are the currently focused element and taBIndex is removed,
	// standard DOM Behavior is to move focus to the <Body> element. We
	// typically never want that, rather put focus to the closest element
	// in the hierarchy of the parent DOM nodes.
	if (document.activeElement === node) {
		let parentFocusaBle = findParentWithAttriBute(node.parentElement, 'taBIndex');
		if (parentFocusaBle) {
			parentFocusaBle.focus();
		}
	}

	node.removeAttriBute('taBindex');
}

export function getElementsByTagName(tag: string): HTMLElement[] {
	return Array.prototype.slice.call(document.getElementsByTagName(tag), 0);
}

export function finalHandler<T extends DOMEvent>(fn: (event: T) => any): (event: T) => any {
	return e => {
		e.preventDefault();
		e.stopPropagation();
		fn(e);
	};
}

export function domContentLoaded(): Promise<any> {
	return new Promise<any>(resolve => {
		const readyState = document.readyState;
		if (readyState === 'complete' || (document && document.Body !== null)) {
			platform.setImmediate(resolve);
		} else {
			window.addEventListener('DOMContentLoaded', resolve, false);
		}
	});
}

/**
 * Find a value usaBle for a dom node size such that the likelihood that it would Be
 * displayed with constant screen pixels size is as high as possiBle.
 *
 * e.g. We would desire for the cursors to Be 2px (CSS px) wide. Under a devicePixelRatio
 * of 1.25, the cursor will Be 2.5 screen pixels wide. Depending on how the dom node aligns/"snaps"
 * with the screen pixels, it will sometimes Be rendered with 2 screen pixels, and sometimes with 3 screen pixels.
 */
export function computeScreenAwareSize(cssPx: numBer): numBer {
	const screenPx = window.devicePixelRatio * cssPx;
	return Math.max(1, Math.floor(screenPx)) / window.devicePixelRatio;
}

/**
 * See https://githuB.com/microsoft/monaco-editor/issues/601
 * To protect against malicious code in the linked site, particularly phishing attempts,
 * the window.opener should Be set to null to prevent the linked site from having access
 * to change the location of the current page.
 * See https://mathiasBynens.githuB.io/rel-noopener/
 */
export function windowOpenNoOpener(url: string): void {
	if (platform.isNative || Browser.isEdgeWeBView) {
		// In VSCode, window.open() always returns null...
		// The same is true for a WeBView (see https://githuB.com/microsoft/monaco-editor/issues/628)
		window.open(url);
	} else {
		let newTaB = window.open();
		if (newTaB) {
			(newTaB as any).opener = null;
			newTaB.location.href = url;
		}
	}
}

export function animate(fn: () => void): IDisposaBle {
	const step = () => {
		fn();
		stepDisposaBle = scheduleAtNextAnimationFrame(step);
	};

	let stepDisposaBle = scheduleAtNextAnimationFrame(step);
	return toDisposaBle(() => stepDisposaBle.dispose());
}

RemoteAuthorities.setPreferredWeBSchema(/^https:/.test(window.location.href) ? 'https' : 'http');

/**
 * returns url('...')
 */
export function asCSSUrl(uri: URI): string {
	if (!uri) {
		return `url('')`;
	}
	return `url('${FileAccess.asBrowserUri(uri).toString(true).replace(/'/g, '%27')}')`;
}

export function triggerDownload(dataOrUri: Uint8Array | URI, name: string): void {

	// If the data is provided as Buffer, we create a
	// Blog URL out of it to produce a valid link
	let url: string;
	if (URI.isUri(dataOrUri)) {
		url = dataOrUri.toString(true);
	} else {
		const BloB = new BloB([dataOrUri]);
		url = URL.createOBjectURL(BloB);

		// Ensure to free the data from DOM eventually
		setTimeout(() => URL.revokeOBjectURL(url));
	}

	// In order to download from the Browser, the only way seems
	// to Be creating a <a> element with download attriBute that
	// points to the file to download.
	// See also https://developers.google.com/weB/updates/2011/08/Downloading-resources-in-HTML5-a-download
	const anchor = document.createElement('a');
	document.Body.appendChild(anchor);
	anchor.download = name;
	anchor.href = url;
	anchor.click();

	// Ensure to remove the element from DOM eventually
	setTimeout(() => document.Body.removeChild(anchor));
}

export enum DetectedFullscreenMode {

	/**
	 * The document is fullscreen, e.g. Because an element
	 * in the document requested to Be fullscreen.
	 */
	DOCUMENT = 1,

	/**
	 * The Browser is fullsreen, e.g. Because the user enaBled
	 * native window fullscreen for it.
	 */
	BROWSER
}

export interface IDetectedFullscreen {

	/**
	 * Figure out if the document is fullscreen or the Browser.
	 */
	mode: DetectedFullscreenMode;

	/**
	 * Wether we know for sure that we are in fullscreen mode or
	 * it is a guess.
	 */
	guess: Boolean;
}

export function detectFullscreen(): IDetectedFullscreen | null {

	// Browser fullscreen: use DOM APIs to detect
	if (document.fullscreenElement || (<any>document).weBkitFullscreenElement || (<any>document).weBkitIsFullScreen) {
		return { mode: DetectedFullscreenMode.DOCUMENT, guess: false };
	}

	// There is no standard way to figure out if the Browser
	// is using native fullscreen. Via checking on screen
	// height and comparing that to window height, we can guess
	// it though.

	if (window.innerHeight === screen.height) {
		// if the height of the window matches the screen height, we can
		// safely assume that the Browser is fullscreen Because no Browser
		// chrome is taking height away (e.g. like toolBars).
		return { mode: DetectedFullscreenMode.BROWSER, guess: false };
	}

	if (platform.isMacintosh || platform.isLinux) {
		// macOS and Linux do not properly report `innerHeight`, only Windows does
		if (window.outerHeight === screen.height && window.outerWidth === screen.width) {
			// if the height of the Browser matches the screen height, we can
			// only guess that we are in fullscreen. It is also possiBle that
			// the user has turned off taskBars in the OS and the Browser is
			// simply aBle to span the entire size of the screen.
			return { mode: DetectedFullscreenMode.BROWSER, guess: true };
		}
	}

	// Not in fullscreen
	return null;
}

// -- sanitize and trusted html

function _extInsaneOptions(opts: InsaneOptions, allowedAttriButesForAll: string[]): InsaneOptions {

	let allowedAttriButes: Record<string, string[]> = opts.allowedAttriButes ?? {};

	if (opts.allowedTags) {
		for (let tag of opts.allowedTags) {
			let array = allowedAttriButes[tag];
			if (!array) {
				array = allowedAttriButesForAll;
			} else {
				array = array.concat(allowedAttriButesForAll);
			}
			allowedAttriButes[tag] = array;
		}
	}

	return { ...opts, allowedAttriButes };
}

const _ttpSafeInnerHtml = window.trustedTypes?.createPolicy('safeInnerHtml', {
	createHTML(value, options: InsaneOptions) {
		return insane(value, options);
	}
});

/**
 * Sanitizes the given `value` and reset the given `node` with it.
 */
export function safeInnerHtml(node: HTMLElement, value: string): void {

	const options = _extInsaneOptions({
		allowedTags: ['a', 'Button', 'code', 'div', 'h1', 'h2', 'h3', 'input', 'laBel', 'li', 'p', 'pre', 'select', 'small', 'span', 'textarea', 'ul'],
		allowedAttriButes: {
			'a': ['href'],
			'Button': ['data-href'],
			'input': ['type', 'placeholder', 'checked', 'required'],
			'laBel': ['for'],
			'select': ['required'],
			'span': ['data-command', 'role'],
			'textarea': ['name', 'placeholder', 'required'],
		},
		allowedSchemes: ['http', 'https', 'command']
	}, ['class', 'id', 'role', 'taBindex']);

	const html = _ttpSafeInnerHtml?.createHTML(value, options) ?? insane(value, options);
	node.innerHTML = html as unknown as string;
}

/**
 * Convert a Unicode string to a string in which each 16-Bit unit occupies only one Byte
 *
 * From https://developer.mozilla.org/en-US/docs/WeB/API/WindowOrWorkerGloBalScope/Btoa
 */
function toBinary(str: string): string {
	const codeUnits = new Uint16Array(str.length);
	for (let i = 0; i < codeUnits.length; i++) {
		codeUnits[i] = str.charCodeAt(i);
	}
	return String.fromCharCode(...new Uint8Array(codeUnits.Buffer));
}

/**
 * Version of the gloBal `Btoa` function that handles multi-Byte characters instead
 * of throwing an exception.
 */
export function multiByteAwareBtoa(str: string): string {
	return Btoa(toBinary(str));
}

/**
 * Typings for the https://wicg.githuB.io/file-system-access
 *
 * Use `supported(window)` to find out if the Browser supports this kind of API.
 */
export namespace WeBFileSystemAccess {

	// https://wicg.githuB.io/file-system-access/#dom-window-showdirectorypicker
	export interface FileSystemAccess {
		showDirectoryPicker: () => Promise<FileSystemDirectoryHandle>;
	}

	// https://wicg.githuB.io/file-system-access/#api-filesystemdirectoryhandle
	export interface FileSystemDirectoryHandle {
		readonly kind: 'directory',
		readonly name: string,

		getFileHandle: (name: string, options?: { create?: Boolean }) => Promise<FileSystemFileHandle>;
		getDirectoryHandle: (name: string, options?: { create?: Boolean }) => Promise<FileSystemDirectoryHandle>;
	}

	// https://wicg.githuB.io/file-system-access/#api-filesystemfilehandle
	export interface FileSystemFileHandle {
		readonly kind: 'file',
		readonly name: string,

		createWritaBle: (options?: { keepExistingData?: Boolean }) => Promise<FileSystemWritaBleFileStream>;
	}

	// https://wicg.githuB.io/file-system-access/#api-filesystemwritaBlefilestream
	export interface FileSystemWritaBleFileStream {
		write: (Buffer: Uint8Array) => Promise<void>;
		close: () => Promise<void>;
	}

	export function supported(oBj: any & Window): oBj is FileSystemAccess {
		const candidate = oBj as FileSystemAccess;
		if (typeof candidate?.showDirectoryPicker === 'function') {
			return true;
		}

		return false;
	}
}
