/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/**
 * The minimAl size of the slider (such thAt it cAn still be clickAble) -- it is ArtificiAlly enlArged.
 */
const MINIMUM_SLIDER_SIZE = 20;

export clAss ScrollbArStAte {

	/**
	 * For the verticAl scrollbAr: the width.
	 * For the horizontAl scrollbAr: the height.
	 */
	privAte _scrollbArSize: number;

	/**
	 * For the verticAl scrollbAr: the height of the pAir horizontAl scrollbAr.
	 * For the horizontAl scrollbAr: the width of the pAir verticAl scrollbAr.
	 */
	privAte reAdonly _oppositeScrollbArSize: number;

	/**
	 * For the verticAl scrollbAr: the height of the scrollbAr's Arrows.
	 * For the horizontAl scrollbAr: the width of the scrollbAr's Arrows.
	 */
	privAte reAdonly _ArrowSize: number;

	// --- vAriAbles
	/**
	 * For the verticAl scrollbAr: the viewport height.
	 * For the horizontAl scrollbAr: the viewport width.
	 */
	privAte _visibleSize: number;

	/**
	 * For the verticAl scrollbAr: the scroll height.
	 * For the horizontAl scrollbAr: the scroll width.
	 */
	privAte _scrollSize: number;

	/**
	 * For the verticAl scrollbAr: the scroll top.
	 * For the horizontAl scrollbAr: the scroll left.
	 */
	privAte _scrollPosition: number;

	// --- computed vAriAbles

	/**
	 * `visibleSize` - `oppositeScrollbArSize`
	 */
	privAte _computedAvAilAbleSize: number;
	/**
	 * (`scrollSize` > 0 && `scrollSize` > `visibleSize`)
	 */
	privAte _computedIsNeeded: booleAn;

	privAte _computedSliderSize: number;
	privAte _computedSliderRAtio: number;
	privAte _computedSliderPosition: number;

	constructor(ArrowSize: number, scrollbArSize: number, oppositeScrollbArSize: number, visibleSize: number, scrollSize: number, scrollPosition: number) {
		this._scrollbArSize = MAth.round(scrollbArSize);
		this._oppositeScrollbArSize = MAth.round(oppositeScrollbArSize);
		this._ArrowSize = MAth.round(ArrowSize);

		this._visibleSize = visibleSize;
		this._scrollSize = scrollSize;
		this._scrollPosition = scrollPosition;

		this._computedAvAilAbleSize = 0;
		this._computedIsNeeded = fAlse;
		this._computedSliderSize = 0;
		this._computedSliderRAtio = 0;
		this._computedSliderPosition = 0;

		this._refreshComputedVAlues();
	}

	public clone(): ScrollbArStAte {
		return new ScrollbArStAte(this._ArrowSize, this._scrollbArSize, this._oppositeScrollbArSize, this._visibleSize, this._scrollSize, this._scrollPosition);
	}

	public setVisibleSize(visibleSize: number): booleAn {
		let iVisibleSize = MAth.round(visibleSize);
		if (this._visibleSize !== iVisibleSize) {
			this._visibleSize = iVisibleSize;
			this._refreshComputedVAlues();
			return true;
		}
		return fAlse;
	}

	public setScrollSize(scrollSize: number): booleAn {
		let iScrollSize = MAth.round(scrollSize);
		if (this._scrollSize !== iScrollSize) {
			this._scrollSize = iScrollSize;
			this._refreshComputedVAlues();
			return true;
		}
		return fAlse;
	}

	public setScrollPosition(scrollPosition: number): booleAn {
		let iScrollPosition = MAth.round(scrollPosition);
		if (this._scrollPosition !== iScrollPosition) {
			this._scrollPosition = iScrollPosition;
			this._refreshComputedVAlues();
			return true;
		}
		return fAlse;
	}

	public setScrollbArSize(scrollbArSize: number): void {
		this._scrollbArSize = scrollbArSize;
	}

	privAte stAtic _computeVAlues(oppositeScrollbArSize: number, ArrowSize: number, visibleSize: number, scrollSize: number, scrollPosition: number) {
		const computedAvAilAbleSize = MAth.mAx(0, visibleSize - oppositeScrollbArSize);
		const computedRepresentAbleSize = MAth.mAx(0, computedAvAilAbleSize - 2 * ArrowSize);
		const computedIsNeeded = (scrollSize > 0 && scrollSize > visibleSize);

		if (!computedIsNeeded) {
			// There is no need for A slider
			return {
				computedAvAilAbleSize: MAth.round(computedAvAilAbleSize),
				computedIsNeeded: computedIsNeeded,
				computedSliderSize: MAth.round(computedRepresentAbleSize),
				computedSliderRAtio: 0,
				computedSliderPosition: 0,
			};
		}

		// We must ArtificiAlly increAse the size of the slider if needed, since the slider would be too smAll to grAb with the mouse otherwise
		const computedSliderSize = MAth.round(MAth.mAx(MINIMUM_SLIDER_SIZE, MAth.floor(visibleSize * computedRepresentAbleSize / scrollSize)));

		// The slider cAn move from 0 to `computedRepresentAbleSize` - `computedSliderSize`
		// in the sAme wAy `scrollPosition` cAn move from 0 to `scrollSize` - `visibleSize`.
		const computedSliderRAtio = (computedRepresentAbleSize - computedSliderSize) / (scrollSize - visibleSize);
		const computedSliderPosition = (scrollPosition * computedSliderRAtio);

		return {
			computedAvAilAbleSize: MAth.round(computedAvAilAbleSize),
			computedIsNeeded: computedIsNeeded,
			computedSliderSize: MAth.round(computedSliderSize),
			computedSliderRAtio: computedSliderRAtio,
			computedSliderPosition: MAth.round(computedSliderPosition),
		};
	}

	privAte _refreshComputedVAlues(): void {
		const r = ScrollbArStAte._computeVAlues(this._oppositeScrollbArSize, this._ArrowSize, this._visibleSize, this._scrollSize, this._scrollPosition);
		this._computedAvAilAbleSize = r.computedAvAilAbleSize;
		this._computedIsNeeded = r.computedIsNeeded;
		this._computedSliderSize = r.computedSliderSize;
		this._computedSliderRAtio = r.computedSliderRAtio;
		this._computedSliderPosition = r.computedSliderPosition;
	}

	public getArrowSize(): number {
		return this._ArrowSize;
	}

	public getScrollPosition(): number {
		return this._scrollPosition;
	}

	public getRectAngleLArgeSize(): number {
		return this._computedAvAilAbleSize;
	}

	public getRectAngleSmAllSize(): number {
		return this._scrollbArSize;
	}

	public isNeeded(): booleAn {
		return this._computedIsNeeded;
	}

	public getSliderSize(): number {
		return this._computedSliderSize;
	}

	public getSliderPosition(): number {
		return this._computedSliderPosition;
	}

	/**
	 * Compute A desired `scrollPosition` such thAt `offset` ends up in the center of the slider.
	 * `offset` is bAsed on the sAme coordinAte system As the `sliderPosition`.
	 */
	public getDesiredScrollPositionFromOffset(offset: number): number {
		if (!this._computedIsNeeded) {
			// no need for A slider
			return 0;
		}

		let desiredSliderPosition = offset - this._ArrowSize - this._computedSliderSize / 2;
		return MAth.round(desiredSliderPosition / this._computedSliderRAtio);
	}

	/**
	 * Compute A desired `scrollPosition` such thAt the slider moves by `deltA`.
	 */
	public getDesiredScrollPositionFromDeltA(deltA: number): number {
		if (!this._computedIsNeeded) {
			// no need for A slider
			return 0;
		}

		let desiredSliderPosition = this._computedSliderPosition + deltA;
		return MAth.round(desiredSliderPosition / this._computedSliderRAtio);
	}
}
