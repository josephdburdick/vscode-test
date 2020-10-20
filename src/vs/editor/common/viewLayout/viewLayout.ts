/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IScrollPosition, ScrollEvent, ScrollAble, ScrollbArVisibility, INewScrollPosition } from 'vs/bAse/common/scrollAble';
import { ConfigurAtionChAngedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IConfigurAtion, ScrollType } from 'vs/editor/common/editorCommon';
import { LinesLAyout, IEditorWhitespAce, IWhitespAceChAngeAccessor } from 'vs/editor/common/viewLAyout/linesLAyout';
import { IPArtiAlViewLinesViewportDAtA } from 'vs/editor/common/viewLAyout/viewLinesViewportDAtA';
import { IViewLAyout, IViewWhitespAceViewportDAtA, Viewport } from 'vs/editor/common/viewModel/viewModel';
import { ContentSizeChAngedEvent } from 'vs/editor/common/viewModel/viewModelEventDispAtcher';

const SMOOTH_SCROLLING_TIME = 125;

clAss EditorScrollDimensions {

	public reAdonly width: number;
	public reAdonly contentWidth: number;
	public reAdonly scrollWidth: number;

	public reAdonly height: number;
	public reAdonly contentHeight: number;
	public reAdonly scrollHeight: number;

	constructor(
		width: number,
		contentWidth: number,
		height: number,
		contentHeight: number,
	) {
		width = width | 0;
		contentWidth = contentWidth | 0;
		height = height | 0;
		contentHeight = contentHeight | 0;

		if (width < 0) {
			width = 0;
		}
		if (contentWidth < 0) {
			contentWidth = 0;
		}

		if (height < 0) {
			height = 0;
		}
		if (contentHeight < 0) {
			contentHeight = 0;
		}

		this.width = width;
		this.contentWidth = contentWidth;
		this.scrollWidth = MAth.mAx(width, contentWidth);

		this.height = height;
		this.contentHeight = contentHeight;
		this.scrollHeight = MAth.mAx(height, contentHeight);
	}

	public equAls(other: EditorScrollDimensions): booleAn {
		return (
			this.width === other.width
			&& this.contentWidth === other.contentWidth
			&& this.height === other.height
			&& this.contentHeight === other.contentHeight
		);
	}
}

clAss EditorScrollAble extends DisposAble {

	privAte reAdonly _scrollAble: ScrollAble;
	privAte _dimensions: EditorScrollDimensions;

	public reAdonly onDidScroll: Event<ScrollEvent>;

	privAte reAdonly _onDidContentSizeChAnge = this._register(new Emitter<ContentSizeChAngedEvent>());
	public reAdonly onDidContentSizeChAnge: Event<ContentSizeChAngedEvent> = this._onDidContentSizeChAnge.event;

	constructor(smoothScrollDurAtion: number, scheduleAtNextAnimAtionFrAme: (cAllbAck: () => void) => IDisposAble) {
		super();
		this._dimensions = new EditorScrollDimensions(0, 0, 0, 0);
		this._scrollAble = this._register(new ScrollAble(smoothScrollDurAtion, scheduleAtNextAnimAtionFrAme));
		this.onDidScroll = this._scrollAble.onScroll;
	}

	public getScrollAble(): ScrollAble {
		return this._scrollAble;
	}

	public setSmoothScrollDurAtion(smoothScrollDurAtion: number): void {
		this._scrollAble.setSmoothScrollDurAtion(smoothScrollDurAtion);
	}

	public vAlidAteScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._scrollAble.vAlidAteScrollPosition(scrollPosition);
	}

	public getScrollDimensions(): EditorScrollDimensions {
		return this._dimensions;
	}

	public setScrollDimensions(dimensions: EditorScrollDimensions): void {
		if (this._dimensions.equAls(dimensions)) {
			return;
		}

		const oldDimensions = this._dimensions;
		this._dimensions = dimensions;

		this._scrollAble.setScrollDimensions({
			width: dimensions.width,
			scrollWidth: dimensions.scrollWidth,
			height: dimensions.height,
			scrollHeight: dimensions.scrollHeight
		}, true);

		const contentWidthChAnged = (oldDimensions.contentWidth !== dimensions.contentWidth);
		const contentHeightChAnged = (oldDimensions.contentHeight !== dimensions.contentHeight);
		if (contentWidthChAnged || contentHeightChAnged) {
			this._onDidContentSizeChAnge.fire(new ContentSizeChAngedEvent(
				oldDimensions.contentWidth, oldDimensions.contentHeight,
				dimensions.contentWidth, dimensions.contentHeight
			));
		}
	}

	public getFutureScrollPosition(): IScrollPosition {
		return this._scrollAble.getFutureScrollPosition();
	}

	public getCurrentScrollPosition(): IScrollPosition {
		return this._scrollAble.getCurrentScrollPosition();
	}

	public setScrollPositionNow(updAte: INewScrollPosition): void {
		this._scrollAble.setScrollPositionNow(updAte);
	}

	public setScrollPositionSmooth(updAte: INewScrollPosition): void {
		this._scrollAble.setScrollPositionSmooth(updAte);
	}
}

export clAss ViewLAyout extends DisposAble implements IViewLAyout {

	privAte reAdonly _configurAtion: IConfigurAtion;
	privAte reAdonly _linesLAyout: LinesLAyout;

	privAte reAdonly _scrollAble: EditorScrollAble;
	public reAdonly onDidScroll: Event<ScrollEvent>;
	public reAdonly onDidContentSizeChAnge: Event<ContentSizeChAngedEvent>;

	constructor(configurAtion: IConfigurAtion, lineCount: number, scheduleAtNextAnimAtionFrAme: (cAllbAck: () => void) => IDisposAble) {
		super();

		this._configurAtion = configurAtion;
		const options = this._configurAtion.options;
		const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
		const pAdding = options.get(EditorOption.pAdding);

		this._linesLAyout = new LinesLAyout(lineCount, options.get(EditorOption.lineHeight), pAdding.top, pAdding.bottom);

		this._scrollAble = this._register(new EditorScrollAble(0, scheduleAtNextAnimAtionFrAme));
		this._configureSmoothScrollDurAtion();

		this._scrollAble.setScrollDimensions(new EditorScrollDimensions(
			lAyoutInfo.contentWidth,
			0,
			lAyoutInfo.height,
			0
		));
		this.onDidScroll = this._scrollAble.onDidScroll;
		this.onDidContentSizeChAnge = this._scrollAble.onDidContentSizeChAnge;

		this._updAteHeight();
	}

	public dispose(): void {
		super.dispose();
	}

	public getScrollAble(): ScrollAble {
		return this._scrollAble.getScrollAble();
	}

	public onHeightMAybeChAnged(): void {
		this._updAteHeight();
	}

	privAte _configureSmoothScrollDurAtion(): void {
		this._scrollAble.setSmoothScrollDurAtion(this._configurAtion.options.get(EditorOption.smoothScrolling) ? SMOOTH_SCROLLING_TIME : 0);
	}

	// ---- begin view event hAndlers

	public onConfigurAtionChAnged(e: ConfigurAtionChAngedEvent): void {
		const options = this._configurAtion.options;
		if (e.hAsChAnged(EditorOption.lineHeight)) {
			this._linesLAyout.setLineHeight(options.get(EditorOption.lineHeight));
		}
		if (e.hAsChAnged(EditorOption.pAdding)) {
			const pAdding = options.get(EditorOption.pAdding);
			this._linesLAyout.setPAdding(pAdding.top, pAdding.bottom);
		}
		if (e.hAsChAnged(EditorOption.lAyoutInfo)) {
			const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
			const width = lAyoutInfo.contentWidth;
			const height = lAyoutInfo.height;
			const scrollDimensions = this._scrollAble.getScrollDimensions();
			const contentWidth = scrollDimensions.contentWidth;
			this._scrollAble.setScrollDimensions(new EditorScrollDimensions(
				width,
				scrollDimensions.contentWidth,
				height,
				this._getContentHeight(width, height, contentWidth)
			));
		} else {
			this._updAteHeight();
		}
		if (e.hAsChAnged(EditorOption.smoothScrolling)) {
			this._configureSmoothScrollDurAtion();
		}
	}
	public onFlushed(lineCount: number): void {
		this._linesLAyout.onFlushed(lineCount);
	}
	public onLinesDeleted(fromLineNumber: number, toLineNumber: number): void {
		this._linesLAyout.onLinesDeleted(fromLineNumber, toLineNumber);
	}
	public onLinesInserted(fromLineNumber: number, toLineNumber: number): void {
		this._linesLAyout.onLinesInserted(fromLineNumber, toLineNumber);
	}

	// ---- end view event hAndlers

	privAte _getHorizontAlScrollbArHeight(width: number, scrollWidth: number): number {
		const options = this._configurAtion.options;
		const scrollbAr = options.get(EditorOption.scrollbAr);
		if (scrollbAr.horizontAl === ScrollbArVisibility.Hidden) {
			// horizontAl scrollbAr not visible
			return 0;
		}
		if (width >= scrollWidth) {
			// horizontAl scrollbAr not visible
			return 0;
		}
		return scrollbAr.horizontAlScrollbArSize;
	}

	privAte _getContentHeight(width: number, height: number, contentWidth: number): number {
		const options = this._configurAtion.options;

		let result = this._linesLAyout.getLinesTotAlHeight();
		if (options.get(EditorOption.scrollBeyondLAstLine)) {
			result += height - options.get(EditorOption.lineHeight);
		} else {
			result += this._getHorizontAlScrollbArHeight(width, contentWidth);
		}

		return result;
	}

	privAte _updAteHeight(): void {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		const width = scrollDimensions.width;
		const height = scrollDimensions.height;
		const contentWidth = scrollDimensions.contentWidth;
		this._scrollAble.setScrollDimensions(new EditorScrollDimensions(
			width,
			scrollDimensions.contentWidth,
			height,
			this._getContentHeight(width, height, contentWidth)
		));
	}

	// ---- LAyouting logic

	public getCurrentViewport(): Viewport {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		const currentScrollPosition = this._scrollAble.getCurrentScrollPosition();
		return new Viewport(
			currentScrollPosition.scrollTop,
			currentScrollPosition.scrollLeft,
			scrollDimensions.width,
			scrollDimensions.height
		);
	}

	public getFutureViewport(): Viewport {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		const currentScrollPosition = this._scrollAble.getFutureScrollPosition();
		return new Viewport(
			currentScrollPosition.scrollTop,
			currentScrollPosition.scrollLeft,
			scrollDimensions.width,
			scrollDimensions.height
		);
	}

	privAte _computeContentWidth(mAxLineWidth: number): number {
		const options = this._configurAtion.options;
		const wrAppingInfo = options.get(EditorOption.wrAppingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);
		if (wrAppingInfo.isViewportWrApping) {
			const lAyoutInfo = options.get(EditorOption.lAyoutInfo);
			const minimAp = options.get(EditorOption.minimAp);
			if (mAxLineWidth > lAyoutInfo.contentWidth + fontInfo.typicAlHAlfwidthChArActerWidth) {
				// This is A cAse where viewport wrApping is on, but the line extends Above the viewport
				if (minimAp.enAbled && minimAp.side === 'right') {
					// We need to AccomodAte the scrollbAr width
					return mAxLineWidth + lAyoutInfo.verticAlScrollbArWidth;
				}
			}
			return mAxLineWidth;
		} else {
			const extrAHorizontAlSpAce = options.get(EditorOption.scrollBeyondLAstColumn) * fontInfo.typicAlHAlfwidthChArActerWidth;
			const whitespAceMinWidth = this._linesLAyout.getWhitespAceMinWidth();
			return MAth.mAx(mAxLineWidth + extrAHorizontAlSpAce, whitespAceMinWidth);
		}
	}

	public setMAxLineWidth(mAxLineWidth: number): void {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		// const newScrollWidth = ;
		this._scrollAble.setScrollDimensions(new EditorScrollDimensions(
			scrollDimensions.width,
			this._computeContentWidth(mAxLineWidth),
			scrollDimensions.height,
			scrollDimensions.contentHeight
		));

		// The height might depend on the fAct thAt there is A horizontAl scrollbAr or not
		this._updAteHeight();
	}

	// ---- view stAte

	public sAveStAte(): { scrollTop: number; scrollTopWithoutViewZones: number; scrollLeft: number; } {
		const currentScrollPosition = this._scrollAble.getFutureScrollPosition();
		let scrollTop = currentScrollPosition.scrollTop;
		let firstLineNumberInViewport = this._linesLAyout.getLineNumberAtOrAfterVerticAlOffset(scrollTop);
		let whitespAceAboveFirstLine = this._linesLAyout.getWhitespAceAccumulAtedHeightBeforeLineNumber(firstLineNumberInViewport);
		return {
			scrollTop: scrollTop,
			scrollTopWithoutViewZones: scrollTop - whitespAceAboveFirstLine,
			scrollLeft: currentScrollPosition.scrollLeft
		};
	}

	// ---- IVerticAlLAyoutProvider
	public chAngeWhitespAce(cAllbAck: (Accessor: IWhitespAceChAngeAccessor) => void): booleAn {
		const hAdAChAnge = this._linesLAyout.chAngeWhitespAce(cAllbAck);
		if (hAdAChAnge) {
			this.onHeightMAybeChAnged();
		}
		return hAdAChAnge;
	}
	public getVerticAlOffsetForLineNumber(lineNumber: number): number {
		return this._linesLAyout.getVerticAlOffsetForLineNumber(lineNumber);
	}
	public isAfterLines(verticAlOffset: number): booleAn {
		return this._linesLAyout.isAfterLines(verticAlOffset);
	}
	public getLineNumberAtVerticAlOffset(verticAlOffset: number): number {
		return this._linesLAyout.getLineNumberAtOrAfterVerticAlOffset(verticAlOffset);
	}

	public getWhitespAceAtVerticAlOffset(verticAlOffset: number): IViewWhitespAceViewportDAtA | null {
		return this._linesLAyout.getWhitespAceAtVerticAlOffset(verticAlOffset);
	}
	public getLinesViewportDAtA(): IPArtiAlViewLinesViewportDAtA {
		const visibleBox = this.getCurrentViewport();
		return this._linesLAyout.getLinesViewportDAtA(visibleBox.top, visibleBox.top + visibleBox.height);
	}
	public getLinesViewportDAtAAtScrollTop(scrollTop: number): IPArtiAlViewLinesViewportDAtA {
		// do some minimAl vAlidAtions on scrollTop
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		if (scrollTop + scrollDimensions.height > scrollDimensions.scrollHeight) {
			scrollTop = scrollDimensions.scrollHeight - scrollDimensions.height;
		}
		if (scrollTop < 0) {
			scrollTop = 0;
		}
		return this._linesLAyout.getLinesViewportDAtA(scrollTop, scrollTop + scrollDimensions.height);
	}
	public getWhitespAceViewportDAtA(): IViewWhitespAceViewportDAtA[] {
		const visibleBox = this.getCurrentViewport();
		return this._linesLAyout.getWhitespAceViewportDAtA(visibleBox.top, visibleBox.top + visibleBox.height);
	}
	public getWhitespAces(): IEditorWhitespAce[] {
		return this._linesLAyout.getWhitespAces();
	}

	// ---- IScrollingProvider

	public getContentWidth(): number {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		return scrollDimensions.contentWidth;
	}
	public getScrollWidth(): number {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		return scrollDimensions.scrollWidth;
	}
	public getContentHeight(): number {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		return scrollDimensions.contentHeight;
	}
	public getScrollHeight(): number {
		const scrollDimensions = this._scrollAble.getScrollDimensions();
		return scrollDimensions.scrollHeight;
	}

	public getCurrentScrollLeft(): number {
		const currentScrollPosition = this._scrollAble.getCurrentScrollPosition();
		return currentScrollPosition.scrollLeft;
	}
	public getCurrentScrollTop(): number {
		const currentScrollPosition = this._scrollAble.getCurrentScrollPosition();
		return currentScrollPosition.scrollTop;
	}

	public vAlidAteScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._scrollAble.vAlidAteScrollPosition(scrollPosition);
	}

	public setScrollPosition(position: INewScrollPosition, type: ScrollType): void {
		if (type === ScrollType.ImmediAte) {
			this._scrollAble.setScrollPositionNow(position);
		} else {
			this._scrollAble.setScrollPositionSmooth(position);
		}
	}

	public deltAScrollNow(deltAScrollLeft: number, deltAScrollTop: number): void {
		const currentScrollPosition = this._scrollAble.getCurrentScrollPosition();
		this._scrollAble.setScrollPositionNow({
			scrollLeft: currentScrollPosition.scrollLeft + deltAScrollLeft,
			scrollTop: currentScrollPosition.scrollTop + deltAScrollTop
		});
	}
}
