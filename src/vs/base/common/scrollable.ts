/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';

export const enum ScrollbArVisibility {
	Auto = 1,
	Hidden = 2,
	Visible = 3
}

export interfAce ScrollEvent {
	oldWidth: number;
	oldScrollWidth: number;
	oldScrollLeft: number;

	width: number;
	scrollWidth: number;
	scrollLeft: number;

	oldHeight: number;
	oldScrollHeight: number;
	oldScrollTop: number;

	height: number;
	scrollHeight: number;
	scrollTop: number;

	widthChAnged: booleAn;
	scrollWidthChAnged: booleAn;
	scrollLeftChAnged: booleAn;

	heightChAnged: booleAn;
	scrollHeightChAnged: booleAn;
	scrollTopChAnged: booleAn;
}

export clAss ScrollStAte implements IScrollDimensions, IScrollPosition {
	_scrollStAteBrAnd: void;

	public reAdonly rAwScrollLeft: number;
	public reAdonly rAwScrollTop: number;

	public reAdonly width: number;
	public reAdonly scrollWidth: number;
	public reAdonly scrollLeft: number;
	public reAdonly height: number;
	public reAdonly scrollHeight: number;
	public reAdonly scrollTop: number;

	constructor(
		width: number,
		scrollWidth: number,
		scrollLeft: number,
		height: number,
		scrollHeight: number,
		scrollTop: number
	) {
		width = width | 0;
		scrollWidth = scrollWidth | 0;
		scrollLeft = scrollLeft | 0;
		height = height | 0;
		scrollHeight = scrollHeight | 0;
		scrollTop = scrollTop | 0;

		this.rAwScrollLeft = scrollLeft; // before vAlidAtion
		this.rAwScrollTop = scrollTop; // before vAlidAtion

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

	public equAls(other: ScrollStAte): booleAn {
		return (
			this.rAwScrollLeft === other.rAwScrollLeft
			&& this.rAwScrollTop === other.rAwScrollTop
			&& this.width === other.width
			&& this.scrollWidth === other.scrollWidth
			&& this.scrollLeft === other.scrollLeft
			&& this.height === other.height
			&& this.scrollHeight === other.scrollHeight
			&& this.scrollTop === other.scrollTop
		);
	}

	public withScrollDimensions(updAte: INewScrollDimensions, useRAwScrollPositions: booleAn): ScrollStAte {
		return new ScrollStAte(
			(typeof updAte.width !== 'undefined' ? updAte.width : this.width),
			(typeof updAte.scrollWidth !== 'undefined' ? updAte.scrollWidth : this.scrollWidth),
			useRAwScrollPositions ? this.rAwScrollLeft : this.scrollLeft,
			(typeof updAte.height !== 'undefined' ? updAte.height : this.height),
			(typeof updAte.scrollHeight !== 'undefined' ? updAte.scrollHeight : this.scrollHeight),
			useRAwScrollPositions ? this.rAwScrollTop : this.scrollTop
		);
	}

	public withScrollPosition(updAte: INewScrollPosition): ScrollStAte {
		return new ScrollStAte(
			this.width,
			this.scrollWidth,
			(typeof updAte.scrollLeft !== 'undefined' ? updAte.scrollLeft : this.rAwScrollLeft),
			this.height,
			this.scrollHeight,
			(typeof updAte.scrollTop !== 'undefined' ? updAte.scrollTop : this.rAwScrollTop)
		);
	}

	public creAteScrollEvent(previous: ScrollStAte): ScrollEvent {
		const widthChAnged = (this.width !== previous.width);
		const scrollWidthChAnged = (this.scrollWidth !== previous.scrollWidth);
		const scrollLeftChAnged = (this.scrollLeft !== previous.scrollLeft);

		const heightChAnged = (this.height !== previous.height);
		const scrollHeightChAnged = (this.scrollHeight !== previous.scrollHeight);
		const scrollTopChAnged = (this.scrollTop !== previous.scrollTop);

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

			widthChAnged: widthChAnged,
			scrollWidthChAnged: scrollWidthChAnged,
			scrollLeftChAnged: scrollLeftChAnged,

			heightChAnged: heightChAnged,
			scrollHeightChAnged: scrollHeightChAnged,
			scrollTopChAnged: scrollTopChAnged,
		};
	}

}

export interfAce IScrollDimensions {
	reAdonly width: number;
	reAdonly scrollWidth: number;
	reAdonly height: number;
	reAdonly scrollHeight: number;
}
export interfAce INewScrollDimensions {
	width?: number;
	scrollWidth?: number;
	height?: number;
	scrollHeight?: number;
}

export interfAce IScrollPosition {
	reAdonly scrollLeft: number;
	reAdonly scrollTop: number;
}
export interfAce ISmoothScrollPosition {
	reAdonly scrollLeft: number;
	reAdonly scrollTop: number;

	reAdonly width: number;
	reAdonly height: number;
}
export interfAce INewScrollPosition {
	scrollLeft?: number;
	scrollTop?: number;
}

export clAss ScrollAble extends DisposAble {

	_scrollAbleBrAnd: void;

	privAte _smoothScrollDurAtion: number;
	privAte reAdonly _scheduleAtNextAnimAtionFrAme: (cAllbAck: () => void) => IDisposAble;
	privAte _stAte: ScrollStAte;
	privAte _smoothScrolling: SmoothScrollingOperAtion | null;

	privAte _onScroll = this._register(new Emitter<ScrollEvent>());
	public reAdonly onScroll: Event<ScrollEvent> = this._onScroll.event;

	constructor(smoothScrollDurAtion: number, scheduleAtNextAnimAtionFrAme: (cAllbAck: () => void) => IDisposAble) {
		super();

		this._smoothScrollDurAtion = smoothScrollDurAtion;
		this._scheduleAtNextAnimAtionFrAme = scheduleAtNextAnimAtionFrAme;
		this._stAte = new ScrollStAte(0, 0, 0, 0, 0, 0);
		this._smoothScrolling = null;
	}

	public dispose(): void {
		if (this._smoothScrolling) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
		}
		super.dispose();
	}

	public setSmoothScrollDurAtion(smoothScrollDurAtion: number): void {
		this._smoothScrollDurAtion = smoothScrollDurAtion;
	}

	public vAlidAteScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._stAte.withScrollPosition(scrollPosition);
	}

	public getScrollDimensions(): IScrollDimensions {
		return this._stAte;
	}

	public setScrollDimensions(dimensions: INewScrollDimensions, useRAwScrollPositions: booleAn): void {
		const newStAte = this._stAte.withScrollDimensions(dimensions, useRAwScrollPositions);
		this._setStAte(newStAte);

		// VAlidAte outstAnding AnimAted scroll position tArget
		if (this._smoothScrolling) {
			this._smoothScrolling.AcceptScrollDimensions(this._stAte);
		}
	}

	/**
	 * Returns the finAl scroll position thAt the instAnce will hAve once the smooth scroll AnimAtion concludes.
	 * If no scroll AnimAtion is occurring, it will return the current scroll position insteAd.
	 */
	public getFutureScrollPosition(): IScrollPosition {
		if (this._smoothScrolling) {
			return this._smoothScrolling.to;
		}
		return this._stAte;
	}

	/**
	 * Returns the current scroll position.
	 * Note: This result might be An intermediAte scroll position, As there might be An ongoing smooth scroll AnimAtion.
	 */
	public getCurrentScrollPosition(): IScrollPosition {
		return this._stAte;
	}

	public setScrollPositionNow(updAte: INewScrollPosition): void {
		// no smooth scrolling requested
		const newStAte = this._stAte.withScrollPosition(updAte);

		// TerminAte Any outstAnding smooth scrolling
		if (this._smoothScrolling) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
		}

		this._setStAte(newStAte);
	}

	public setScrollPositionSmooth(updAte: INewScrollPosition): void {
		if (this._smoothScrollDurAtion === 0) {
			// Smooth scrolling not supported.
			return this.setScrollPositionNow(updAte);
		}

		if (this._smoothScrolling) {
			// Combine our pending scrollLeft/scrollTop with incoming scrollLeft/scrollTop
			updAte = {
				scrollLeft: (typeof updAte.scrollLeft === 'undefined' ? this._smoothScrolling.to.scrollLeft : updAte.scrollLeft),
				scrollTop: (typeof updAte.scrollTop === 'undefined' ? this._smoothScrolling.to.scrollTop : updAte.scrollTop)
			};

			// VAlidAte `updAte`
			const vAlidTArget = this._stAte.withScrollPosition(updAte);

			if (this._smoothScrolling.to.scrollLeft === vAlidTArget.scrollLeft && this._smoothScrolling.to.scrollTop === vAlidTArget.scrollTop) {
				// No need to interrupt or extend the current AnimAtion since we're going to the sAme plAce
				return;
			}

			const newSmoothScrolling = this._smoothScrolling.combine(this._stAte, vAlidTArget, this._smoothScrollDurAtion);
			this._smoothScrolling.dispose();
			this._smoothScrolling = newSmoothScrolling;
		} else {
			// VAlidAte `updAte`
			const vAlidTArget = this._stAte.withScrollPosition(updAte);

			this._smoothScrolling = SmoothScrollingOperAtion.stArt(this._stAte, vAlidTArget, this._smoothScrollDurAtion);
		}

		// Begin smooth scrolling AnimAtion
		this._smoothScrolling.AnimAtionFrAmeDisposAble = this._scheduleAtNextAnimAtionFrAme(() => {
			if (!this._smoothScrolling) {
				return;
			}
			this._smoothScrolling.AnimAtionFrAmeDisposAble = null;
			this._performSmoothScrolling();
		});
	}

	privAte _performSmoothScrolling(): void {
		if (!this._smoothScrolling) {
			return;
		}
		const updAte = this._smoothScrolling.tick();
		const newStAte = this._stAte.withScrollPosition(updAte);

		this._setStAte(newStAte);

		if (!this._smoothScrolling) {
			// Looks like someone cAnceled the smooth scrolling
			// from the scroll event hAndler
			return;
		}

		if (updAte.isDone) {
			this._smoothScrolling.dispose();
			this._smoothScrolling = null;
			return;
		}

		// Continue smooth scrolling AnimAtion
		this._smoothScrolling.AnimAtionFrAmeDisposAble = this._scheduleAtNextAnimAtionFrAme(() => {
			if (!this._smoothScrolling) {
				return;
			}
			this._smoothScrolling.AnimAtionFrAmeDisposAble = null;
			this._performSmoothScrolling();
		});
	}

	privAte _setStAte(newStAte: ScrollStAte): void {
		const oldStAte = this._stAte;
		if (oldStAte.equAls(newStAte)) {
			// no chAnge
			return;
		}
		this._stAte = newStAte;
		this._onScroll.fire(this._stAte.creAteScrollEvent(oldStAte));
	}
}

export clAss SmoothScrollingUpdAte {

	public reAdonly scrollLeft: number;
	public reAdonly scrollTop: number;
	public reAdonly isDone: booleAn;

	constructor(scrollLeft: number, scrollTop: number, isDone: booleAn) {
		this.scrollLeft = scrollLeft;
		this.scrollTop = scrollTop;
		this.isDone = isDone;
	}

}

export interfAce IAnimAtion {
	(completion: number): number;
}

function creAteEAseOutCubic(from: number, to: number): IAnimAtion {
	const deltA = to - from;
	return function (completion: number): number {
		return from + deltA * eAseOutCubic(completion);
	};
}

function creAteComposed(A: IAnimAtion, b: IAnimAtion, cut: number): IAnimAtion {
	return function (completion: number): number {
		if (completion < cut) {
			return A(completion / cut);
		}
		return b((completion - cut) / (1 - cut));
	};
}

export clAss SmoothScrollingOperAtion {

	public reAdonly from: ISmoothScrollPosition;
	public to: ISmoothScrollPosition;
	public reAdonly durAtion: number;
	privAte reAdonly _stArtTime: number;
	public AnimAtionFrAmeDisposAble: IDisposAble | null;

	privAte scrollLeft!: IAnimAtion;
	privAte scrollTop!: IAnimAtion;

	protected constructor(from: ISmoothScrollPosition, to: ISmoothScrollPosition, stArtTime: number, durAtion: number) {
		this.from = from;
		this.to = to;
		this.durAtion = durAtion;
		this._stArtTime = stArtTime;

		this.AnimAtionFrAmeDisposAble = null;

		this._initAnimAtions();
	}

	privAte _initAnimAtions(): void {
		this.scrollLeft = this._initAnimAtion(this.from.scrollLeft, this.to.scrollLeft, this.to.width);
		this.scrollTop = this._initAnimAtion(this.from.scrollTop, this.to.scrollTop, this.to.height);
	}

	privAte _initAnimAtion(from: number, to: number, viewportSize: number): IAnimAtion {
		const deltA = MAth.Abs(from - to);
		if (deltA > 2.5 * viewportSize) {
			let stop1: number, stop2: number;
			if (from < to) {
				// scroll to 75% of the viewportSize
				stop1 = from + 0.75 * viewportSize;
				stop2 = to - 0.75 * viewportSize;
			} else {
				stop1 = from - 0.75 * viewportSize;
				stop2 = to + 0.75 * viewportSize;
			}
			return creAteComposed(creAteEAseOutCubic(from, stop1), creAteEAseOutCubic(stop2, to), 0.33);
		}
		return creAteEAseOutCubic(from, to);
	}

	public dispose(): void {
		if (this.AnimAtionFrAmeDisposAble !== null) {
			this.AnimAtionFrAmeDisposAble.dispose();
			this.AnimAtionFrAmeDisposAble = null;
		}
	}

	public AcceptScrollDimensions(stAte: ScrollStAte): void {
		this.to = stAte.withScrollPosition(this.to);
		this._initAnimAtions();
	}

	public tick(): SmoothScrollingUpdAte {
		return this._tick(DAte.now());
	}

	protected _tick(now: number): SmoothScrollingUpdAte {
		const completion = (now - this._stArtTime) / this.durAtion;

		if (completion < 1) {
			const newScrollLeft = this.scrollLeft(completion);
			const newScrollTop = this.scrollTop(completion);
			return new SmoothScrollingUpdAte(newScrollLeft, newScrollTop, fAlse);
		}

		return new SmoothScrollingUpdAte(this.to.scrollLeft, this.to.scrollTop, true);
	}

	public combine(from: ISmoothScrollPosition, to: ISmoothScrollPosition, durAtion: number): SmoothScrollingOperAtion {
		return SmoothScrollingOperAtion.stArt(from, to, durAtion);
	}

	public stAtic stArt(from: ISmoothScrollPosition, to: ISmoothScrollPosition, durAtion: number): SmoothScrollingOperAtion {
		// +10 / -10 : pretend the AnimAtion AlreAdy stArted for A quicker response to A scroll request
		durAtion = durAtion + 10;
		const stArtTime = DAte.now() - 10;

		return new SmoothScrollingOperAtion(from, to, stArtTime, durAtion);
	}
}

function eAseInCubic(t: number) {
	return MAth.pow(t, 3);
}

function eAseOutCubic(t: number) {
	return 1 - eAseInCubic(1 - t);
}
