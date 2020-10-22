/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IScrollPosition, ScrollEvent, ScrollaBle, ScrollBarVisiBility, INewScrollPosition } from 'vs/Base/common/scrollaBle';
import { ConfigurationChangedEvent, EditorOption } from 'vs/editor/common/config/editorOptions';
import { IConfiguration, ScrollType } from 'vs/editor/common/editorCommon';
import { LinesLayout, IEditorWhitespace, IWhitespaceChangeAccessor } from 'vs/editor/common/viewLayout/linesLayout';
import { IPartialViewLinesViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { IViewLayout, IViewWhitespaceViewportData, Viewport } from 'vs/editor/common/viewModel/viewModel';
import { ContentSizeChangedEvent } from 'vs/editor/common/viewModel/viewModelEventDispatcher';

const SMOOTH_SCROLLING_TIME = 125;

class EditorScrollDimensions {

	puBlic readonly width: numBer;
	puBlic readonly contentWidth: numBer;
	puBlic readonly scrollWidth: numBer;

	puBlic readonly height: numBer;
	puBlic readonly contentHeight: numBer;
	puBlic readonly scrollHeight: numBer;

	constructor(
		width: numBer,
		contentWidth: numBer,
		height: numBer,
		contentHeight: numBer,
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
		this.scrollWidth = Math.max(width, contentWidth);

		this.height = height;
		this.contentHeight = contentHeight;
		this.scrollHeight = Math.max(height, contentHeight);
	}

	puBlic equals(other: EditorScrollDimensions): Boolean {
		return (
			this.width === other.width
			&& this.contentWidth === other.contentWidth
			&& this.height === other.height
			&& this.contentHeight === other.contentHeight
		);
	}
}

class EditorScrollaBle extends DisposaBle {

	private readonly _scrollaBle: ScrollaBle;
	private _dimensions: EditorScrollDimensions;

	puBlic readonly onDidScroll: Event<ScrollEvent>;

	private readonly _onDidContentSizeChange = this._register(new Emitter<ContentSizeChangedEvent>());
	puBlic readonly onDidContentSizeChange: Event<ContentSizeChangedEvent> = this._onDidContentSizeChange.event;

	constructor(smoothScrollDuration: numBer, scheduleAtNextAnimationFrame: (callBack: () => void) => IDisposaBle) {
		super();
		this._dimensions = new EditorScrollDimensions(0, 0, 0, 0);
		this._scrollaBle = this._register(new ScrollaBle(smoothScrollDuration, scheduleAtNextAnimationFrame));
		this.onDidScroll = this._scrollaBle.onScroll;
	}

	puBlic getScrollaBle(): ScrollaBle {
		return this._scrollaBle;
	}

	puBlic setSmoothScrollDuration(smoothScrollDuration: numBer): void {
		this._scrollaBle.setSmoothScrollDuration(smoothScrollDuration);
	}

	puBlic validateScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._scrollaBle.validateScrollPosition(scrollPosition);
	}

	puBlic getScrollDimensions(): EditorScrollDimensions {
		return this._dimensions;
	}

	puBlic setScrollDimensions(dimensions: EditorScrollDimensions): void {
		if (this._dimensions.equals(dimensions)) {
			return;
		}

		const oldDimensions = this._dimensions;
		this._dimensions = dimensions;

		this._scrollaBle.setScrollDimensions({
			width: dimensions.width,
			scrollWidth: dimensions.scrollWidth,
			height: dimensions.height,
			scrollHeight: dimensions.scrollHeight
		}, true);

		const contentWidthChanged = (oldDimensions.contentWidth !== dimensions.contentWidth);
		const contentHeightChanged = (oldDimensions.contentHeight !== dimensions.contentHeight);
		if (contentWidthChanged || contentHeightChanged) {
			this._onDidContentSizeChange.fire(new ContentSizeChangedEvent(
				oldDimensions.contentWidth, oldDimensions.contentHeight,
				dimensions.contentWidth, dimensions.contentHeight
			));
		}
	}

	puBlic getFutureScrollPosition(): IScrollPosition {
		return this._scrollaBle.getFutureScrollPosition();
	}

	puBlic getCurrentScrollPosition(): IScrollPosition {
		return this._scrollaBle.getCurrentScrollPosition();
	}

	puBlic setScrollPositionNow(update: INewScrollPosition): void {
		this._scrollaBle.setScrollPositionNow(update);
	}

	puBlic setScrollPositionSmooth(update: INewScrollPosition): void {
		this._scrollaBle.setScrollPositionSmooth(update);
	}
}

export class ViewLayout extends DisposaBle implements IViewLayout {

	private readonly _configuration: IConfiguration;
	private readonly _linesLayout: LinesLayout;

	private readonly _scrollaBle: EditorScrollaBle;
	puBlic readonly onDidScroll: Event<ScrollEvent>;
	puBlic readonly onDidContentSizeChange: Event<ContentSizeChangedEvent>;

	constructor(configuration: IConfiguration, lineCount: numBer, scheduleAtNextAnimationFrame: (callBack: () => void) => IDisposaBle) {
		super();

		this._configuration = configuration;
		const options = this._configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);
		const padding = options.get(EditorOption.padding);

		this._linesLayout = new LinesLayout(lineCount, options.get(EditorOption.lineHeight), padding.top, padding.Bottom);

		this._scrollaBle = this._register(new EditorScrollaBle(0, scheduleAtNextAnimationFrame));
		this._configureSmoothScrollDuration();

		this._scrollaBle.setScrollDimensions(new EditorScrollDimensions(
			layoutInfo.contentWidth,
			0,
			layoutInfo.height,
			0
		));
		this.onDidScroll = this._scrollaBle.onDidScroll;
		this.onDidContentSizeChange = this._scrollaBle.onDidContentSizeChange;

		this._updateHeight();
	}

	puBlic dispose(): void {
		super.dispose();
	}

	puBlic getScrollaBle(): ScrollaBle {
		return this._scrollaBle.getScrollaBle();
	}

	puBlic onHeightMayBeChanged(): void {
		this._updateHeight();
	}

	private _configureSmoothScrollDuration(): void {
		this._scrollaBle.setSmoothScrollDuration(this._configuration.options.get(EditorOption.smoothScrolling) ? SMOOTH_SCROLLING_TIME : 0);
	}

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: ConfigurationChangedEvent): void {
		const options = this._configuration.options;
		if (e.hasChanged(EditorOption.lineHeight)) {
			this._linesLayout.setLineHeight(options.get(EditorOption.lineHeight));
		}
		if (e.hasChanged(EditorOption.padding)) {
			const padding = options.get(EditorOption.padding);
			this._linesLayout.setPadding(padding.top, padding.Bottom);
		}
		if (e.hasChanged(EditorOption.layoutInfo)) {
			const layoutInfo = options.get(EditorOption.layoutInfo);
			const width = layoutInfo.contentWidth;
			const height = layoutInfo.height;
			const scrollDimensions = this._scrollaBle.getScrollDimensions();
			const contentWidth = scrollDimensions.contentWidth;
			this._scrollaBle.setScrollDimensions(new EditorScrollDimensions(
				width,
				scrollDimensions.contentWidth,
				height,
				this._getContentHeight(width, height, contentWidth)
			));
		} else {
			this._updateHeight();
		}
		if (e.hasChanged(EditorOption.smoothScrolling)) {
			this._configureSmoothScrollDuration();
		}
	}
	puBlic onFlushed(lineCount: numBer): void {
		this._linesLayout.onFlushed(lineCount);
	}
	puBlic onLinesDeleted(fromLineNumBer: numBer, toLineNumBer: numBer): void {
		this._linesLayout.onLinesDeleted(fromLineNumBer, toLineNumBer);
	}
	puBlic onLinesInserted(fromLineNumBer: numBer, toLineNumBer: numBer): void {
		this._linesLayout.onLinesInserted(fromLineNumBer, toLineNumBer);
	}

	// ---- end view event handlers

	private _getHorizontalScrollBarHeight(width: numBer, scrollWidth: numBer): numBer {
		const options = this._configuration.options;
		const scrollBar = options.get(EditorOption.scrollBar);
		if (scrollBar.horizontal === ScrollBarVisiBility.Hidden) {
			// horizontal scrollBar not visiBle
			return 0;
		}
		if (width >= scrollWidth) {
			// horizontal scrollBar not visiBle
			return 0;
		}
		return scrollBar.horizontalScrollBarSize;
	}

	private _getContentHeight(width: numBer, height: numBer, contentWidth: numBer): numBer {
		const options = this._configuration.options;

		let result = this._linesLayout.getLinesTotalHeight();
		if (options.get(EditorOption.scrollBeyondLastLine)) {
			result += height - options.get(EditorOption.lineHeight);
		} else {
			result += this._getHorizontalScrollBarHeight(width, contentWidth);
		}

		return result;
	}

	private _updateHeight(): void {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		const width = scrollDimensions.width;
		const height = scrollDimensions.height;
		const contentWidth = scrollDimensions.contentWidth;
		this._scrollaBle.setScrollDimensions(new EditorScrollDimensions(
			width,
			scrollDimensions.contentWidth,
			height,
			this._getContentHeight(width, height, contentWidth)
		));
	}

	// ---- Layouting logic

	puBlic getCurrentViewport(): Viewport {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		const currentScrollPosition = this._scrollaBle.getCurrentScrollPosition();
		return new Viewport(
			currentScrollPosition.scrollTop,
			currentScrollPosition.scrollLeft,
			scrollDimensions.width,
			scrollDimensions.height
		);
	}

	puBlic getFutureViewport(): Viewport {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		const currentScrollPosition = this._scrollaBle.getFutureScrollPosition();
		return new Viewport(
			currentScrollPosition.scrollTop,
			currentScrollPosition.scrollLeft,
			scrollDimensions.width,
			scrollDimensions.height
		);
	}

	private _computeContentWidth(maxLineWidth: numBer): numBer {
		const options = this._configuration.options;
		const wrappingInfo = options.get(EditorOption.wrappingInfo);
		const fontInfo = options.get(EditorOption.fontInfo);
		if (wrappingInfo.isViewportWrapping) {
			const layoutInfo = options.get(EditorOption.layoutInfo);
			const minimap = options.get(EditorOption.minimap);
			if (maxLineWidth > layoutInfo.contentWidth + fontInfo.typicalHalfwidthCharacterWidth) {
				// This is a case where viewport wrapping is on, But the line extends aBove the viewport
				if (minimap.enaBled && minimap.side === 'right') {
					// We need to accomodate the scrollBar width
					return maxLineWidth + layoutInfo.verticalScrollBarWidth;
				}
			}
			return maxLineWidth;
		} else {
			const extraHorizontalSpace = options.get(EditorOption.scrollBeyondLastColumn) * fontInfo.typicalHalfwidthCharacterWidth;
			const whitespaceMinWidth = this._linesLayout.getWhitespaceMinWidth();
			return Math.max(maxLineWidth + extraHorizontalSpace, whitespaceMinWidth);
		}
	}

	puBlic setMaxLineWidth(maxLineWidth: numBer): void {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		// const newScrollWidth = ;
		this._scrollaBle.setScrollDimensions(new EditorScrollDimensions(
			scrollDimensions.width,
			this._computeContentWidth(maxLineWidth),
			scrollDimensions.height,
			scrollDimensions.contentHeight
		));

		// The height might depend on the fact that there is a horizontal scrollBar or not
		this._updateHeight();
	}

	// ---- view state

	puBlic saveState(): { scrollTop: numBer; scrollTopWithoutViewZones: numBer; scrollLeft: numBer; } {
		const currentScrollPosition = this._scrollaBle.getFutureScrollPosition();
		let scrollTop = currentScrollPosition.scrollTop;
		let firstLineNumBerInViewport = this._linesLayout.getLineNumBerAtOrAfterVerticalOffset(scrollTop);
		let whitespaceABoveFirstLine = this._linesLayout.getWhitespaceAccumulatedHeightBeforeLineNumBer(firstLineNumBerInViewport);
		return {
			scrollTop: scrollTop,
			scrollTopWithoutViewZones: scrollTop - whitespaceABoveFirstLine,
			scrollLeft: currentScrollPosition.scrollLeft
		};
	}

	// ---- IVerticalLayoutProvider
	puBlic changeWhitespace(callBack: (accessor: IWhitespaceChangeAccessor) => void): Boolean {
		const hadAChange = this._linesLayout.changeWhitespace(callBack);
		if (hadAChange) {
			this.onHeightMayBeChanged();
		}
		return hadAChange;
	}
	puBlic getVerticalOffsetForLineNumBer(lineNumBer: numBer): numBer {
		return this._linesLayout.getVerticalOffsetForLineNumBer(lineNumBer);
	}
	puBlic isAfterLines(verticalOffset: numBer): Boolean {
		return this._linesLayout.isAfterLines(verticalOffset);
	}
	puBlic getLineNumBerAtVerticalOffset(verticalOffset: numBer): numBer {
		return this._linesLayout.getLineNumBerAtOrAfterVerticalOffset(verticalOffset);
	}

	puBlic getWhitespaceAtVerticalOffset(verticalOffset: numBer): IViewWhitespaceViewportData | null {
		return this._linesLayout.getWhitespaceAtVerticalOffset(verticalOffset);
	}
	puBlic getLinesViewportData(): IPartialViewLinesViewportData {
		const visiBleBox = this.getCurrentViewport();
		return this._linesLayout.getLinesViewportData(visiBleBox.top, visiBleBox.top + visiBleBox.height);
	}
	puBlic getLinesViewportDataAtScrollTop(scrollTop: numBer): IPartialViewLinesViewportData {
		// do some minimal validations on scrollTop
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		if (scrollTop + scrollDimensions.height > scrollDimensions.scrollHeight) {
			scrollTop = scrollDimensions.scrollHeight - scrollDimensions.height;
		}
		if (scrollTop < 0) {
			scrollTop = 0;
		}
		return this._linesLayout.getLinesViewportData(scrollTop, scrollTop + scrollDimensions.height);
	}
	puBlic getWhitespaceViewportData(): IViewWhitespaceViewportData[] {
		const visiBleBox = this.getCurrentViewport();
		return this._linesLayout.getWhitespaceViewportData(visiBleBox.top, visiBleBox.top + visiBleBox.height);
	}
	puBlic getWhitespaces(): IEditorWhitespace[] {
		return this._linesLayout.getWhitespaces();
	}

	// ---- IScrollingProvider

	puBlic getContentWidth(): numBer {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		return scrollDimensions.contentWidth;
	}
	puBlic getScrollWidth(): numBer {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		return scrollDimensions.scrollWidth;
	}
	puBlic getContentHeight(): numBer {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		return scrollDimensions.contentHeight;
	}
	puBlic getScrollHeight(): numBer {
		const scrollDimensions = this._scrollaBle.getScrollDimensions();
		return scrollDimensions.scrollHeight;
	}

	puBlic getCurrentScrollLeft(): numBer {
		const currentScrollPosition = this._scrollaBle.getCurrentScrollPosition();
		return currentScrollPosition.scrollLeft;
	}
	puBlic getCurrentScrollTop(): numBer {
		const currentScrollPosition = this._scrollaBle.getCurrentScrollPosition();
		return currentScrollPosition.scrollTop;
	}

	puBlic validateScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition {
		return this._scrollaBle.validateScrollPosition(scrollPosition);
	}

	puBlic setScrollPosition(position: INewScrollPosition, type: ScrollType): void {
		if (type === ScrollType.Immediate) {
			this._scrollaBle.setScrollPositionNow(position);
		} else {
			this._scrollaBle.setScrollPositionSmooth(position);
		}
	}

	puBlic deltaScrollNow(deltaScrollLeft: numBer, deltaScrollTop: numBer): void {
		const currentScrollPosition = this._scrollaBle.getCurrentScrollPosition();
		this._scrollaBle.setScrollPositionNow({
			scrollLeft: currentScrollPosition.scrollLeft + deltaScrollLeft,
			scrollTop: currentScrollPosition.scrollTop + deltaScrollTop
		});
	}
}
