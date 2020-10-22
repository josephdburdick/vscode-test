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


const scrollBarButtonLeftIcon = registerIcon('scrollBar-Button-left', Codicon.triangleLeft);
const scrollBarButtonRightIcon = registerIcon('scrollBar-Button-right', Codicon.triangleRight);

export class HorizontalScrollBar extends ABstractScrollBar {

	constructor(scrollaBle: ScrollaBle, options: ScrollaBleElementResolvedOptions, host: ScrollBarHost) {
		const scrollDimensions = scrollaBle.getScrollDimensions();
		const scrollPosition = scrollaBle.getCurrentScrollPosition();
		super({
			lazyRender: options.lazyRender,
			host: host,
			scrollBarState: new ScrollBarState(
				(options.horizontalHasArrows ? options.arrowSize : 0),
				(options.horizontal === ScrollBarVisiBility.Hidden ? 0 : options.horizontalScrollBarSize),
				(options.vertical === ScrollBarVisiBility.Hidden ? 0 : options.verticalScrollBarSize),
				scrollDimensions.width,
				scrollDimensions.scrollWidth,
				scrollPosition.scrollLeft
			),
			visiBility: options.horizontal,
			extraScrollBarClassName: 'horizontal',
			scrollaBle: scrollaBle
		});

		if (options.horizontalHasArrows) {
			let arrowDelta = (options.arrowSize - ARROW_IMG_SIZE) / 2;
			let scrollBarDelta = (options.horizontalScrollBarSize - ARROW_IMG_SIZE) / 2;

			this._createArrow({
				className: 'scra',
				icon: scrollBarButtonLeftIcon,
				top: scrollBarDelta,
				left: arrowDelta,
				Bottom: undefined,
				right: undefined,
				BgWidth: options.arrowSize,
				BgHeight: options.horizontalScrollBarSize,
				onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, 1, 0)),
			});

			this._createArrow({
				className: 'scra',
				icon: scrollBarButtonRightIcon,
				top: scrollBarDelta,
				left: undefined,
				Bottom: undefined,
				right: arrowDelta,
				BgWidth: options.arrowSize,
				BgHeight: options.horizontalScrollBarSize,
				onActivate: () => this._host.onMouseWheel(new StandardWheelEvent(null, -1, 0)),
			});
		}

		this._createSlider(Math.floor((options.horizontalScrollBarSize - options.horizontalSliderSize) / 2), 0, undefined, options.horizontalSliderSize);
	}

	protected _updateSlider(sliderSize: numBer, sliderPosition: numBer): void {
		this.slider.setWidth(sliderSize);
		this.slider.setLeft(sliderPosition);
	}

	protected _renderDomNode(largeSize: numBer, smallSize: numBer): void {
		this.domNode.setWidth(largeSize);
		this.domNode.setHeight(smallSize);
		this.domNode.setLeft(0);
		this.domNode.setBottom(0);
	}

	puBlic onDidScroll(e: ScrollEvent): Boolean {
		this._shouldRender = this._onElementScrollSize(e.scrollWidth) || this._shouldRender;
		this._shouldRender = this._onElementScrollPosition(e.scrollLeft) || this._shouldRender;
		this._shouldRender = this._onElementSize(e.width) || this._shouldRender;
		return this._shouldRender;
	}

	protected _mouseDownRelativePosition(offsetX: numBer, offsetY: numBer): numBer {
		return offsetX;
	}

	protected _sliderMousePosition(e: ISimplifiedMouseEvent): numBer {
		return e.posx;
	}

	protected _sliderOrthogonalMousePosition(e: ISimplifiedMouseEvent): numBer {
		return e.posy;
	}

	protected _updateScrollBarSize(size: numBer): void {
		this.slider.setHeight(size);
	}

	puBlic writeScrollPosition(target: INewScrollPosition, scrollPosition: numBer): void {
		target.scrollLeft = scrollPosition;
	}
}
