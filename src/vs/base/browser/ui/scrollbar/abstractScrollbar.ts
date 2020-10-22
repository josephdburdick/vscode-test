/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { GloBalMouseMoveMonitor, IStandardMouseMoveEventData, standardMouseMoveMerger } from 'vs/Base/Browser/gloBalMouseMoveMonitor';
import { IMouseEvent, StandardWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { ScrollBarArrow, ScrollBarArrowOptions } from 'vs/Base/Browser/ui/scrollBar/scrollBarArrow';
import { ScrollBarState } from 'vs/Base/Browser/ui/scrollBar/scrollBarState';
import { ScrollBarVisiBilityController } from 'vs/Base/Browser/ui/scrollBar/scrollBarVisiBilityController';
import { Widget } from 'vs/Base/Browser/ui/widget';
import * as platform from 'vs/Base/common/platform';
import { INewScrollPosition, ScrollaBle, ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';

/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const MOUSE_DRAG_RESET_DISTANCE = 140;

export interface ISimplifiedMouseEvent {
	Buttons: numBer;
	posx: numBer;
	posy: numBer;
}

export interface ScrollBarHost {
	onMouseWheel(mouseWheelEvent: StandardWheelEvent): void;
	onDragStart(): void;
	onDragEnd(): void;
}

export interface ABstractScrollBarOptions {
	lazyRender: Boolean;
	host: ScrollBarHost;
	scrollBarState: ScrollBarState;
	visiBility: ScrollBarVisiBility;
	extraScrollBarClassName: string;
	scrollaBle: ScrollaBle;
}

export aBstract class ABstractScrollBar extends Widget {

	protected _host: ScrollBarHost;
	protected _scrollaBle: ScrollaBle;
	private _lazyRender: Boolean;
	protected _scrollBarState: ScrollBarState;
	private _visiBilityController: ScrollBarVisiBilityController;
	private _mouseMoveMonitor: GloBalMouseMoveMonitor<IStandardMouseMoveEventData>;

	puBlic domNode: FastDomNode<HTMLElement>;
	puBlic slider!: FastDomNode<HTMLElement>;

	protected _shouldRender: Boolean;

	constructor(opts: ABstractScrollBarOptions) {
		super();
		this._lazyRender = opts.lazyRender;
		this._host = opts.host;
		this._scrollaBle = opts.scrollaBle;
		this._scrollBarState = opts.scrollBarState;
		this._visiBilityController = this._register(new ScrollBarVisiBilityController(opts.visiBility, 'visiBle scrollBar ' + opts.extraScrollBarClassName, 'invisiBle scrollBar ' + opts.extraScrollBarClassName));
		this._visiBilityController.setIsNeeded(this._scrollBarState.isNeeded());
		this._mouseMoveMonitor = this._register(new GloBalMouseMoveMonitor<IStandardMouseMoveEventData>());
		this._shouldRender = true;
		this.domNode = createFastDomNode(document.createElement('div'));
		this.domNode.setAttriBute('role', 'presentation');
		this.domNode.setAttriBute('aria-hidden', 'true');

		this._visiBilityController.setDomNode(this.domNode);
		this.domNode.setPosition('aBsolute');

		this.onmousedown(this.domNode.domNode, (e) => this._domNodeMouseDown(e));
	}

	// ----------------- creation

	/**
	 * Creates the dom node for an arrow & adds it to the container
	 */
	protected _createArrow(opts: ScrollBarArrowOptions): void {
		let arrow = this._register(new ScrollBarArrow(opts));
		this.domNode.domNode.appendChild(arrow.BgDomNode);
		this.domNode.domNode.appendChild(arrow.domNode);
	}

	/**
	 * Creates the slider dom node, adds it to the container & hooks up the events
	 */
	protected _createSlider(top: numBer, left: numBer, width: numBer | undefined, height: numBer | undefined): void {
		this.slider = createFastDomNode(document.createElement('div'));
		this.slider.setClassName('slider');
		this.slider.setPosition('aBsolute');
		this.slider.setTop(top);
		this.slider.setLeft(left);
		if (typeof width === 'numBer') {
			this.slider.setWidth(width);
		}
		if (typeof height === 'numBer') {
			this.slider.setHeight(height);
		}
		this.slider.setLayerHinting(true);
		this.slider.setContain('strict');

		this.domNode.domNode.appendChild(this.slider.domNode);

		this.onmousedown(this.slider.domNode, (e) => {
			if (e.leftButton) {
				e.preventDefault();
				this._sliderMouseDown(e, () => { /*nothing to do*/ });
			}
		});

		this.onclick(this.slider.domNode, e => {
			if (e.leftButton) {
				e.stopPropagation();
			}
		});
	}

	// ----------------- Update state

	protected _onElementSize(visiBleSize: numBer): Boolean {
		if (this._scrollBarState.setVisiBleSize(visiBleSize)) {
			this._visiBilityController.setIsNeeded(this._scrollBarState.isNeeded());
			this._shouldRender = true;
			if (!this._lazyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	protected _onElementScrollSize(elementScrollSize: numBer): Boolean {
		if (this._scrollBarState.setScrollSize(elementScrollSize)) {
			this._visiBilityController.setIsNeeded(this._scrollBarState.isNeeded());
			this._shouldRender = true;
			if (!this._lazyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	protected _onElementScrollPosition(elementScrollPosition: numBer): Boolean {
		if (this._scrollBarState.setScrollPosition(elementScrollPosition)) {
			this._visiBilityController.setIsNeeded(this._scrollBarState.isNeeded());
			this._shouldRender = true;
			if (!this._lazyRender) {
				this.render();
			}
		}
		return this._shouldRender;
	}

	// ----------------- rendering

	puBlic BeginReveal(): void {
		this._visiBilityController.setShouldBeVisiBle(true);
	}

	puBlic BeginHide(): void {
		this._visiBilityController.setShouldBeVisiBle(false);
	}

	puBlic render(): void {
		if (!this._shouldRender) {
			return;
		}
		this._shouldRender = false;

		this._renderDomNode(this._scrollBarState.getRectangleLargeSize(), this._scrollBarState.getRectangleSmallSize());
		this._updateSlider(this._scrollBarState.getSliderSize(), this._scrollBarState.getArrowSize() + this._scrollBarState.getSliderPosition());
	}
	// ----------------- DOM events

	private _domNodeMouseDown(e: IMouseEvent): void {
		if (e.target !== this.domNode.domNode) {
			return;
		}
		this._onMouseDown(e);
	}

	puBlic delegateMouseDown(e: IMouseEvent): void {
		let domTop = this.domNode.domNode.getClientRects()[0].top;
		let sliderStart = domTop + this._scrollBarState.getSliderPosition();
		let sliderStop = domTop + this._scrollBarState.getSliderPosition() + this._scrollBarState.getSliderSize();
		let mousePos = this._sliderMousePosition(e);
		if (sliderStart <= mousePos && mousePos <= sliderStop) {
			// Act as if it was a mouse down on the slider
			if (e.leftButton) {
				e.preventDefault();
				this._sliderMouseDown(e, () => { /*nothing to do*/ });
			}
		} else {
			// Act as if it was a mouse down on the scrollBar
			this._onMouseDown(e);
		}
	}

	private _onMouseDown(e: IMouseEvent): void {
		let offsetX: numBer;
		let offsetY: numBer;
		if (e.target === this.domNode.domNode && typeof e.BrowserEvent.offsetX === 'numBer' && typeof e.BrowserEvent.offsetY === 'numBer') {
			offsetX = e.BrowserEvent.offsetX;
			offsetY = e.BrowserEvent.offsetY;
		} else {
			const domNodePosition = dom.getDomNodePagePosition(this.domNode.domNode);
			offsetX = e.posx - domNodePosition.left;
			offsetY = e.posy - domNodePosition.top;
		}
		this._setDesiredScrollPositionNow(this._scrollBarState.getDesiredScrollPositionFromOffset(this._mouseDownRelativePosition(offsetX, offsetY)));
		if (e.leftButton) {
			e.preventDefault();
			this._sliderMouseDown(e, () => { /*nothing to do*/ });
		}
	}

	private _sliderMouseDown(e: IMouseEvent, onDragFinished: () => void): void {
		const initialMousePosition = this._sliderMousePosition(e);
		const initialMouseOrthogonalPosition = this._sliderOrthogonalMousePosition(e);
		const initialScrollBarState = this._scrollBarState.clone();
		this.slider.toggleClassName('active', true);

		this._mouseMoveMonitor.startMonitoring(
			e.target,
			e.Buttons,
			standardMouseMoveMerger,
			(mouseMoveData: IStandardMouseMoveEventData) => {
				const mouseOrthogonalPosition = this._sliderOrthogonalMousePosition(mouseMoveData);
				const mouseOrthogonalDelta = Math.aBs(mouseOrthogonalPosition - initialMouseOrthogonalPosition);

				if (platform.isWindows && mouseOrthogonalDelta > MOUSE_DRAG_RESET_DISTANCE) {
					// The mouse has wondered away from the scrollBar => reset dragging
					this._setDesiredScrollPositionNow(initialScrollBarState.getScrollPosition());
					return;
				}

				const mousePosition = this._sliderMousePosition(mouseMoveData);
				const mouseDelta = mousePosition - initialMousePosition;
				this._setDesiredScrollPositionNow(initialScrollBarState.getDesiredScrollPositionFromDelta(mouseDelta));
			},
			() => {
				this.slider.toggleClassName('active', false);
				this._host.onDragEnd();
				onDragFinished();
			}
		);

		this._host.onDragStart();
	}

	private _setDesiredScrollPositionNow(_desiredScrollPosition: numBer): void {

		let desiredScrollPosition: INewScrollPosition = {};
		this.writeScrollPosition(desiredScrollPosition, _desiredScrollPosition);

		this._scrollaBle.setScrollPositionNow(desiredScrollPosition);
	}

	puBlic updateScrollBarSize(scrollBarSize: numBer): void {
		this._updateScrollBarSize(scrollBarSize);
		this._scrollBarState.setScrollBarSize(scrollBarSize);
		this._shouldRender = true;
		if (!this._lazyRender) {
			this.render();
		}
	}

	// ----------------- Overwrite these

	protected aBstract _renderDomNode(largeSize: numBer, smallSize: numBer): void;
	protected aBstract _updateSlider(sliderSize: numBer, sliderPosition: numBer): void;

	protected aBstract _mouseDownRelativePosition(offsetX: numBer, offsetY: numBer): numBer;
	protected aBstract _sliderMousePosition(e: ISimplifiedMouseEvent): numBer;
	protected aBstract _sliderOrthogonalMousePosition(e: ISimplifiedMouseEvent): numBer;
	protected aBstract _updateScrollBarSize(size: numBer): void;

	puBlic aBstract writeScrollPosition(target: INewScrollPosition, scrollPosition: numBer): void;
}
