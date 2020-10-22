/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * The minimal size of the slider (such that it can still Be clickaBle) -- it is artificially enlarged.
 */
const MINIMUM_SLIDER_SIZE = 20;

export class ScrollBarState {

	/**
	 * For the vertical scrollBar: the width.
	 * For the horizontal scrollBar: the height.
	 */
	private _scrollBarSize: numBer;

	/**
	 * For the vertical scrollBar: the height of the pair horizontal scrollBar.
	 * For the horizontal scrollBar: the width of the pair vertical scrollBar.
	 */
	private readonly _oppositeScrollBarSize: numBer;

	/**
	 * For the vertical scrollBar: the height of the scrollBar's arrows.
	 * For the horizontal scrollBar: the width of the scrollBar's arrows.
	 */
	private readonly _arrowSize: numBer;

	// --- variaBles
	/**
	 * For the vertical scrollBar: the viewport height.
	 * For the horizontal scrollBar: the viewport width.
	 */
	private _visiBleSize: numBer;

	/**
	 * For the vertical scrollBar: the scroll height.
	 * For the horizontal scrollBar: the scroll width.
	 */
	private _scrollSize: numBer;

	/**
	 * For the vertical scrollBar: the scroll top.
	 * For the horizontal scrollBar: the scroll left.
	 */
	private _scrollPosition: numBer;

	// --- computed variaBles

	/**
	 * `visiBleSize` - `oppositeScrollBarSize`
	 */
	private _computedAvailaBleSize: numBer;
	/**
	 * (`scrollSize` > 0 && `scrollSize` > `visiBleSize`)
	 */
	private _computedIsNeeded: Boolean;

	private _computedSliderSize: numBer;
	private _computedSliderRatio: numBer;
	private _computedSliderPosition: numBer;

	constructor(arrowSize: numBer, scrollBarSize: numBer, oppositeScrollBarSize: numBer, visiBleSize: numBer, scrollSize: numBer, scrollPosition: numBer) {
		this._scrollBarSize = Math.round(scrollBarSize);
		this._oppositeScrollBarSize = Math.round(oppositeScrollBarSize);
		this._arrowSize = Math.round(arrowSize);

		this._visiBleSize = visiBleSize;
		this._scrollSize = scrollSize;
		this._scrollPosition = scrollPosition;

		this._computedAvailaBleSize = 0;
		this._computedIsNeeded = false;
		this._computedSliderSize = 0;
		this._computedSliderRatio = 0;
		this._computedSliderPosition = 0;

		this._refreshComputedValues();
	}

	puBlic clone(): ScrollBarState {
		return new ScrollBarState(this._arrowSize, this._scrollBarSize, this._oppositeScrollBarSize, this._visiBleSize, this._scrollSize, this._scrollPosition);
	}

	puBlic setVisiBleSize(visiBleSize: numBer): Boolean {
		let iVisiBleSize = Math.round(visiBleSize);
		if (this._visiBleSize !== iVisiBleSize) {
			this._visiBleSize = iVisiBleSize;
			this._refreshComputedValues();
			return true;
		}
		return false;
	}

	puBlic setScrollSize(scrollSize: numBer): Boolean {
		let iScrollSize = Math.round(scrollSize);
		if (this._scrollSize !== iScrollSize) {
			this._scrollSize = iScrollSize;
			this._refreshComputedValues();
			return true;
		}
		return false;
	}

	puBlic setScrollPosition(scrollPosition: numBer): Boolean {
		let iScrollPosition = Math.round(scrollPosition);
		if (this._scrollPosition !== iScrollPosition) {
			this._scrollPosition = iScrollPosition;
			this._refreshComputedValues();
			return true;
		}
		return false;
	}

	puBlic setScrollBarSize(scrollBarSize: numBer): void {
		this._scrollBarSize = scrollBarSize;
	}

	private static _computeValues(oppositeScrollBarSize: numBer, arrowSize: numBer, visiBleSize: numBer, scrollSize: numBer, scrollPosition: numBer) {
		const computedAvailaBleSize = Math.max(0, visiBleSize - oppositeScrollBarSize);
		const computedRepresentaBleSize = Math.max(0, computedAvailaBleSize - 2 * arrowSize);
		const computedIsNeeded = (scrollSize > 0 && scrollSize > visiBleSize);

		if (!computedIsNeeded) {
			// There is no need for a slider
			return {
				computedAvailaBleSize: Math.round(computedAvailaBleSize),
				computedIsNeeded: computedIsNeeded,
				computedSliderSize: Math.round(computedRepresentaBleSize),
				computedSliderRatio: 0,
				computedSliderPosition: 0,
			};
		}

		// We must artificially increase the size of the slider if needed, since the slider would Be too small to graB with the mouse otherwise
		const computedSliderSize = Math.round(Math.max(MINIMUM_SLIDER_SIZE, Math.floor(visiBleSize * computedRepresentaBleSize / scrollSize)));

		// The slider can move from 0 to `computedRepresentaBleSize` - `computedSliderSize`
		// in the same way `scrollPosition` can move from 0 to `scrollSize` - `visiBleSize`.
		const computedSliderRatio = (computedRepresentaBleSize - computedSliderSize) / (scrollSize - visiBleSize);
		const computedSliderPosition = (scrollPosition * computedSliderRatio);

		return {
			computedAvailaBleSize: Math.round(computedAvailaBleSize),
			computedIsNeeded: computedIsNeeded,
			computedSliderSize: Math.round(computedSliderSize),
			computedSliderRatio: computedSliderRatio,
			computedSliderPosition: Math.round(computedSliderPosition),
		};
	}

	private _refreshComputedValues(): void {
		const r = ScrollBarState._computeValues(this._oppositeScrollBarSize, this._arrowSize, this._visiBleSize, this._scrollSize, this._scrollPosition);
		this._computedAvailaBleSize = r.computedAvailaBleSize;
		this._computedIsNeeded = r.computedIsNeeded;
		this._computedSliderSize = r.computedSliderSize;
		this._computedSliderRatio = r.computedSliderRatio;
		this._computedSliderPosition = r.computedSliderPosition;
	}

	puBlic getArrowSize(): numBer {
		return this._arrowSize;
	}

	puBlic getScrollPosition(): numBer {
		return this._scrollPosition;
	}

	puBlic getRectangleLargeSize(): numBer {
		return this._computedAvailaBleSize;
	}

	puBlic getRectangleSmallSize(): numBer {
		return this._scrollBarSize;
	}

	puBlic isNeeded(): Boolean {
		return this._computedIsNeeded;
	}

	puBlic getSliderSize(): numBer {
		return this._computedSliderSize;
	}

	puBlic getSliderPosition(): numBer {
		return this._computedSliderPosition;
	}

	/**
	 * Compute a desired `scrollPosition` such that `offset` ends up in the center of the slider.
	 * `offset` is Based on the same coordinate system as the `sliderPosition`.
	 */
	puBlic getDesiredScrollPositionFromOffset(offset: numBer): numBer {
		if (!this._computedIsNeeded) {
			// no need for a slider
			return 0;
		}

		let desiredSliderPosition = offset - this._arrowSize - this._computedSliderSize / 2;
		return Math.round(desiredSliderPosition / this._computedSliderRatio);
	}

	/**
	 * Compute a desired `scrollPosition` such that the slider moves By `delta`.
	 */
	puBlic getDesiredScrollPositionFromDelta(delta: numBer): numBer {
		if (!this._computedIsNeeded) {
			// no need for a slider
			return 0;
		}

		let desiredSliderPosition = this._computedSliderPosition + delta;
		return Math.round(desiredSliderPosition / this._computedSliderRatio);
	}
}
