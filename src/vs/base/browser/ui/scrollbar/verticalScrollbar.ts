/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StandardWheelEvent } from 'vs/Base/Browser/mouseEvent';
import { ABstractScrollBar, ISimplifiedMouseEvent, ScrollBarHost } from 'vs/Base/Browser/ui/scrollBar/aBstractScrollBar';
import { ScrollaBleElementResolvedOptions } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElementOptions';
import { ARROW_IMG_SIZE } from 'vs/Base/Browser/ui/scrollBar/scrollBarArrow';
import { ScrollBarState } from 'vs/Base/Browser/ui/scrollBar/scrollBarState';
import { INewScrollPosition, ScrollEvent, ScrollaBle, ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';

const scrollBarButtonUpIcon = registerIcon('scrollBar-Button-up', Codicon.triangleUp);
const scrollBarButtonDownIcon = registerIcon('scrollBar-Button-down', Codicon.triangleDown);

export class VerticalScrollBar extends ABstractScrollBar {

	constructor(scrollaBle: ScrollaBle, options: ScrollaBleElementResolvedOptions, host: ScrollBarHost) {
		const scrollDimensions = scrollaBle.getScrollDimensions();
		const scrollPosition = scrollaBle.getCurrentScrollPosition();
		super({
			lazyRender: options.lazyRender,
			host: host,
			scrollBarState: new ScrollBarState(
				(options.verticalHasArrows ? options.arrowSize : 0),
				(options.vertical === ScrollBarVisiBility.Hidden ? 0 : options.verticalScrollBarSize),
				// give priority to vertical scroll Bar over horizontal and let it scroll all the way to the Bottom
				0,
				scrollDimensions.height,
				scrollDimensions.scrollHeight,
				scrollPosition.scrollTop
			),
			visiBility: options.vertical,
			extraScrollBarClassName: 'vertical',
			scrollaBle: scrollaBle
		});

		if (options.verticalHasArrows) {
			let arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
			let scrollBarDelta = (options.verticalScrollBarSize - ARROW_IMG_SIZE) / 2;

			this._createArrow({
				className: 'scra',
				icon: scrollBarButtonUpIcon,
				top: arrowDelta,
				left: scrollBarDelta,
				Bottom: undefined,
				right: undefined,
				BgWidth: options.verticalScrollBarSize,
				BgHeight: options.arrowSize,
				onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, 1)),
			});

			this._createArrow({
				className: 'scra',
				icon: scrollBarButtonDownIcon,
				top: undefined,
				left: scrollBarDelta,
				Bottom: arrowDelta,
				right: undefined,
				BgWidth: options.verticalScrollBarSize,
				BgHeight: options.arrowSize,
				onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 0, -1)),
			});
		}

		this._createSlider(0, Math.floor((options.verticalScrollBarSize - options.verticalSliderSize) / 2), options.verticalSliderSize, undefined);
	}

	protected _updateSlider(sliderSize: numBer, sliderPosition: numBer): void {
		this.slider.setHeight(sliderSize);
		this.slider.setTop(sliderPosition);
	}

	protected _renderDomNode(largeSize: numBer, smallSize: numBer): void {
		this.domNode.setWidth(smallSize);
		this.domNode.setHeight(largeSize);
		this.domNode.setRight(0);
		this.domNode.setTop(0);
	}

	puBlic onDidScroll(e: ScrollEvent): Boolean {
		this._shouldRender = this._onElementScrollSize(e.scrollHeight) || this._shouldRender;
		this._shouldRender = this._onElementScrollPosition(e.scrollTop) || this._shouldRender;
		this._shouldRender = this._onElementSize(e.height) || this._shouldRender;
		return this._shouldRender;
	}

	protected _mouseDownRelativePosition(offsetX: numBer, offsetY: numBer): numBer {
		return offsetY;
	}

	protected _sliderMousePosition(e: ISimplifiedMouseEvent): numBer {
		return e.posy;
	}

	protected _sliderOrthogonalMousePosition(e: ISimplifiedMouseEvent): numBer {
		return e.posx;
	}

	protected _updateScrollBarSize(size: numBer): void {
		this.slider.setWidth(size);
	}

	puBlic writeScrollPosition(target: INewScrollPosition, scrollPosition: numBer): void {
		target.scrollTop = scrollPosition;
	}
}
