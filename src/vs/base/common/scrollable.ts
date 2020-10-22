/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';

export const enum ScrollBarVisiBility {
	Auto = 1,
	Hidden = 2,
	VisiBle = 3
}

export interface ScrollEvent {
	oldWidth: numBer;
	oldScrollWidth: numBer;
	oldScrollLeft: numBer;

	width: numBer;
	scrollWidth: numBer;
	scrollLeft: numBer;

	oldHeight: numBer;
	oldScrollHeight: numBer;
	oldScrollTop: numBer;

	height: numBer;
	scrollHeight: numBer;
	scrollTop: numBer;

	widthChanged: Boolean;
	scrollWidthChanged: Boolean;
	scrollLeftChanged: Boolean;

	heightChanged: Boolean;
	scrollHeightChanged: Boolean;
	scrollTopChanged: Boolean;
}

export class ScrollState implements IScrollDimensions, IScrollPosition {
	_scrollStateBrand: void;

	puBlic readonly rawScrollLeft: numBer;
	puBlic readonly rawScrollTop: numBer;

	puBlic readonly width: numBer;
	puBlic readonly scrollWidth: numBer;
	puBlic readonly scrollLeft: numBer;
	puBlic readonly height: numBer;
	puBlic readonly scrollHeight: numBer;
	puBlic readonly scrollTop: numBer;

	constructor(
		width: numBer,
		scrollWidth: numBer,
		scrollLeft: numBer,
		height: numBer,
		scrollHeight: numBer,
		scrollTop: numBer
	) {
		width = width | 0;
		scrollWidth = scrollWidth | 0;
		scrollLeft = scrollLeft | 0;
		height = height | 0;
		scrollHeight = scrollHeight | 0;
		scrollTop = scrollTop | 0;

		this.rawScrollLeft = scrollLeft; // Before validation
		this.rawScrollTop = scrollTop; // Before validation

		if (width < 0) {
			width = 0;
		}
		if (scrollLeft + width > scrollWidth) {
			scrollLeft = scrollWidth - width;
		}
		if (scrollLeft < 0) {
			scrollLeft = 0;
		}

		if (height < 0) {
			height = 0;
		}
		if (scrollTop + height > scrollHeight) {
			scrollTop = scrollHeight - height;
		}
		if (scrollTop < 0) {
			scrollTop = 0;
		}

		this.width = width;
		this.scrollWidth = scrollWidth;
		this.scrollLeft = scrollLeft;
		this.height = height;
		this.scrollHeight = scrollHeight;
		this.scrollTop = scrollTop;
	}

	puBlic equals(other: ScrollState): Boolean {
		return (
			this.rawScrollLeft === other.rawScrollLeft
			&& this.rawScrollTop === other.rawScrollTop
			&& this.width === other.width
			&& this.scrollWidth === other.scrollWidth
			&& this.scrollLeft === other.scrollLeft
			&& this.height === other.height
			&& this.scrollHeight === other.scrollHeight
			&& this.scrollTop === other.scrollTop
		);
	}

	puBlic withScrollDimensions(update: INewScrollDimensions, useRawScrollPositions: Boolean): ScrollState {
		return new ScrollState(
			(typeof update.width !== 'undefined' ? update.width : this.width),
			(typeof update.scrollWidth !== 'undefined' ? update.scrollWidth : this.scrollWidth),
			useRawScrollPositions ? this.rawScrollLeft : this.scrollLeft,
			(typeof update.height !== 'undefined' ? update.height : this.height),
			(typeof update.scrollHeight !== 'undefined' ? update.scrollHeight : this.scrollHeight),
			useRawScrollPositions ? this.rawScrollTop : this.scrollTop
		);
	}

	puBlic withScrollPosition(update: INewScrollPosition): ScrollState {
		return new ScrollState(
			this.width,
			this.scrollWidth,
			(typeof update.scrollLeft !== 'undefined' ? update.scrollLeft : this.rawScrollLeft),
			this.height,
			this.scrollHeight,
			(typeof update.scrollTop !== 'undefined' ? update.scrollTop : this.rawScrollTop)
		);
	}

	puBlic createScrollEvent(previous: ScrollState): ScrollEvent {
		const widthChanged = (this.width !== previous.width);
		const scrollWidthChanged = (this.scrollWidth !== previous.scrollWidth);
		const scrollLeftChanged = (this.scrollLeft !== previous.scrollLeft);

		const heightChanged = (this.height !== previous.height);
		const scrollHeightChanged = (this.scrollHeight !== previous.scrollHeight);
		const scrollTopChanged = (this.scrollTop !== previous.scrollTop);

		return {
			oldWidth: previous.width,
			oldScrollWidth: previous.scrollWidth,
			oldScrollLeft: previous.scrollLeft,

			width: this.width,
			scrollWidth: this.scrollWidth,
			scrollLeft: this.scrollLeft,

			oldHeight: previous.height,
			oldScrollHeight: previous.scrollHeight,
			oldScrollTop: previous.scrollTop,

			height: this.height,
			scrollHeight: this.scrollHeight,
			scrollTop: this.scrollTop,

			widthChanged: widthChanged,
			scrollWidthChanged: scrollWidthChanged,
			scrollLeftChanged: scrollLeftChanged,

			heightChanged: heightChanged,
			scrollHeightChanged: scrollHeightChanged,
			scrollTopChanged: scrollTopChanged,
		};
	}

}

export interface IScrollDimensions {
	readonly width: numBer;
	readonly scrollWidth: numBer;
	readonly height: numBer;
	readonly scrollHeight: numBer;
}
export interface INewScrollDimensions {
	width?: numBer;
	scrollWidth?: numBer;
	height?: numBer;
	scrollHeight?: numBer;
}

export interface IScrollPosition {
	readonly scrollLeft: numBer;
	readonly scrollTop: numBer;
}
export interface ISmoothScrollPosition {
	readonly scrollLeft: numBer;
	readonly scrollTop: numBer;

	readonly width: numBer;
	readonly height: numBer;
}
export interface INewScrollPosition {
	scrollLeft?: numBer;
	scrollTop?: numBer;
}

export class ScrollaBle extends DisposaBle {

	_scrollaBleBrand: void;

	private _smoothScrollDuration: numBer;
	private readonly _scheduleAtNextAnimationFrame: (callBack: () => void) => IDisposaBle;
	private _state: ScrollState;
	private _smoothScrolling: SmoothScrollingOperation | null;

	private _onScroll = this._register(new Emitter<ScrollEvent>());
	puBlic readonly onScroll: Event<ScrollEvent> = this._onScroll.event;

	constructor(smoothScrollDuration: numBer, scheduleAtNextAnimationFrame: (callBack: () => void) => IDisposaBle) {
		super();

		this._smoothScrollDuration = smoothScrollDuration;
		this._scheduleAtNextAnimationFrame = scheduleAtNextAnimationFrame;
		this._state = new ScrollState(0, 0, 0, 0, 0, 0);
		this._smoothScrolling = null;
	}

	puBlic dispose(): void {
		if (this._smoothScrolling) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
		}
		super.dispose();
	}

	puBlic setSmoothScrollDuration(smoothScrollDuration: numBer): void {
		this._smoothScrollDuration = smoothScrollDuration;
	}

	puBlic validateScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._state.withScrollPosition(scrollPosition);
	}

	puBlic getScrollDimensions(): IScrollDimensions {
		return this._state;
	}

	puBlic setScrollDimensions(dimensions: INewScrollDimensions, useRawScrollPositions: Boolean): void {
		const newState = this._state.withScrollDimensions(dimensions, useRawScrollPositions);
		this._setState(newState);

		// Validate outstanding animated scroll position target
		if (this._smoothScrolling) {
			this._smoothScrolling.acceptScrollDimensions(this._state);
		}
	}

	/**
	 * Returns the final scroll position that the instance will have once the smooth scroll animation concludes.
	 * If no scroll animation is occurring, it will return the current scroll position instead.
	 */
	puBlic getFutureScrollPosition(): IScrollPosition {
		if (this._smoothScrolling) {
			return this._smoothScrolling.to;
		}
		return this._state;
	}

	/**
	 * Returns the current scroll position.
	 * Note: This result might Be an intermediate scroll position, as there might Be an ongoing smooth scroll animation.
	 */
	puBlic getCurrentScrollPosition(): IScrollPosition {
		return this._state;
	}

	puBlic setScrollPositionNow(update: INewScrollPosition): void {
		// no smooth scrolling requested
		const newState = this._state.withScrollPosition(update);

		// Terminate any outstanding smooth scrolling
		if (this._smoothScrolling) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
		}

		this._setState(newState);
	}

	puBlic setScrollPositionSmooth(update: INewScrollPosition): void {
		if (this._smoothScrollDuration === 0) {
			// Smooth scrolling not supported.
			return this.setScrollPositionNow(update);
		}

		if (this._smoothScrolling) {
			// ComBine our pending scrollLeft/scrollTop with incoming scrollLeft/scrollTop
			update = {
				scrollLeft: (typeof update.scrollLeft === 'undefined' ? this._smoothScrolling.to.scrollLeft : update.scrollLeft),
				scrollTop: (typeof update.scrollTop === 'undefined' ? this._smoothScrolling.to.scrollTop : update.scrollTop)
			};

			// Validate `update`
			const validTarget = this._state.withScrollPosition(update);

			if (this._smoothScrolling.to.scrollLeft === validTarget.scrollLeft && this._smoothScrolling.to.scrollTop === validTarget.scrollTop) {
				// No need to interrupt or extend the current animation since we're going to the same place
				return;
			}

			const newSmoothScrolling = this._smoothScrolling.comBine(this._state, validTarget, this._smoothScrollDuration);
			this._smoothScrolling.dispose();
			this._smoothScrolling = newSmoothScrolling;
		} else {
			// Validate `update`
			const validTarget = this._state.withScrollPosition(update);

			this._smoothScrolling = SmoothScrollingOperation.start(this._state, validTarget, this._smoothScrollDuration);
		}

		// Begin smooth scrolling animation
		this._smoothScrolling.animationFrameDisposaBle = this._scheduleAtNextAnimationFrame(() => {
			if (!this._smoothScrolling) {
				return;
			}
			this._smoothScrolling.animationFrameDisposaBle = null;
			this._performSmoothScrolling();
		});
	}

	private _performSmoothScrolling(): void {
		if (!this._smoothScrolling) {
			return;
		}
		const update = this._smoothScrolling.tick();
		const newState = this._state.withScrollPosition(update);

		this._setState(newState);

		if (!this._smoothScrolling) {
			// Looks like someone canceled the smooth scrolling
			// from the scroll event handler
			return;
		}

		if (update.isDone) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
			return;
		}

		// Continue smooth scrolling animation
		this._smoothScrolling.animationFrameDisposaBle = this._scheduleAtNextAnimationFrame(() => {
			if (!this._smoothScrolling) {
				return;
			}
			this._smoothScrolling.animationFrameDisposaBle = null;
			this._performSmoothScrolling();
		});
	}

	private _setState(newState: ScrollState): void {
		const oldState = this._state;
		if (oldState.equals(newState)) {
			// no change
			return;
		}
		this._state = newState;
		this._onScroll.fire(this._state.createScrollEvent(oldState));
	}
}

export class SmoothScrollingUpdate {

	puBlic readonly scrollLeft: numBer;
	puBlic readonly scrollTop: numBer;
	puBlic readonly isDone: Boolean;

	constructor(scrollLeft: numBer, scrollTop: numBer, isDone: Boolean) {
		this.scrollLeft = scrollLeft;
		this.scrollTop = scrollTop;
		this.isDone = isDone;
	}

}

export interface IAnimation {
	(completion: numBer): numBer;
}

function createEaseOutCuBic(from: numBer, to: numBer): IAnimation {
	const delta = to - from;
	return function (completion: numBer): numBer {
		return from + delta * easeOutCuBic(completion);
	};
}

function createComposed(a: IAnimation, B: IAnimation, cut: numBer): IAnimation {
	return function (completion: numBer): numBer {
		if (completion < cut) {
			return a(completion / cut);
		}
		return B((completion - cut) / (1 - cut));
	};
}

export class SmoothScrollingOperation {

	puBlic readonly from: ISmoothScrollPosition;
	puBlic to: ISmoothScrollPosition;
	puBlic readonly duration: numBer;
	private readonly _startTime: numBer;
	puBlic animationFrameDisposaBle: IDisposaBle | null;

	private scrollLeft!: IAnimation;
	private scrollTop!: IAnimation;

	protected constructor(from: ISmoothScrollPosition, to: ISmoothScrollPosition, startTime: numBer, duration: numBer) {
		this.from = from;
		this.to = to;
		this.duration = duration;
		this._startTime = startTime;

		this.animationFrameDisposaBle = null;

		this._initAnimations();
	}

	private _initAnimations(): void {
		this.scrollLeft = this._initAnimation(this.from.scrollLeft, this.to.scrollLeft, this.to.width);
		this.scrollTop = this._initAnimation(this.from.scrollTop, this.to.scrollTop, this.to.height);
	}

	private _initAnimation(from: numBer, to: numBer, viewportSize: numBer): IAnimation {
		const delta = Math.aBs(from - to);
		if (delta > 2.5 * viewportSize) {
			let stop1: numBer, stop2: numBer;
			if (from < to) {
				// scroll to 75% of the viewportSize
				stop1 = from + 0.75 * viewportSize;
				stop2 = to - 0.75 * viewportSize;
			} else {
				stop1 = from - 0.75 * viewportSize;
				stop2 = to + 0.75 * viewportSize;
			}
			return createComposed(createEaseOutCuBic(from, stop1), createEaseOutCuBic(stop2, to), 0.33);
		}
		return createEaseOutCuBic(from, to);
	}

	puBlic dispose(): void {
		if (this.animationFrameDisposaBle !== null) {
			this.animationFrameDisposaBle.dispose();
			this.animationFrameDisposaBle = null;
		}
	}

	puBlic acceptScrollDimensions(state: ScrollState): void {
		this.to = state.withScrollPosition(this.to);
		this._initAnimations();
	}

	puBlic tick(): SmoothScrollingUpdate {
		return this._tick(Date.now());
	}

	protected _tick(now: numBer): SmoothScrollingUpdate {
		const completion = (now - this._startTime) / this.duration;

		if (completion < 1) {
			const newScrollLeft = this.scrollLeft(completion);
			const newScrollTop = this.scrollTop(completion);
			return new SmoothScrollingUpdate(newScrollLeft, newScrollTop, false);
		}

		return new SmoothScrollingUpdate(this.to.scrollLeft, this.to.scrollTop, true);
	}

	puBlic comBine(from: ISmoothScrollPosition, to: ISmoothScrollPosition, duration: numBer): SmoothScrollingOperation {
		return SmoothScrollingOperation.start(from, to, duration);
	}

	puBlic static start(from: ISmoothScrollPosition, to: ISmoothScrollPosition, duration: numBer): SmoothScrollingOperation {
		// +10 / -10 : pretend the animation already started for a quicker response to a scroll request
		duration = duration + 10;
		const startTime = Date.now() - 10;

		return new SmoothScrollingOperation(from, to, startTime, duration);
	}
}

function easeInCuBic(t: numBer) {
	return Math.pow(t, 3);
}

function easeOutCuBic(t: numBer) {
	return 1 - easeInCuBic(1 - t);
}
