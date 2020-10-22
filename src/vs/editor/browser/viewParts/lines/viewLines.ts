/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./viewLines';
import * as platform from 'vs/Base/common/platform';
import { FastDomNode } from 'vs/Base/Browser/fastDomNode';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { Configuration } from 'vs/editor/Browser/config/configuration';
import { IVisiBleLinesHost, VisiBleLinesCollection } from 'vs/editor/Browser/view/viewLayer';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { DomReadingContext, ViewLine, ViewLineOptions } from 'vs/editor/Browser/viewParts/lines/viewLine';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ScrollType } from 'vs/editor/common/editorCommon';
import { IViewLines, LineVisiBleRanges, VisiBleRanges, HorizontalPosition } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { Viewport } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { Constants } from 'vs/Base/common/uint';
import { MOUSE_CURSOR_TEXT_CSS_CLASS_NAME } from 'vs/Base/Browser/ui/mouseCursor/mouseCursor';

class LastRenderedData {

	private _currentVisiBleRange: Range;

	constructor() {
		this._currentVisiBleRange = new Range(1, 1, 1, 1);
	}

	puBlic getCurrentVisiBleRange(): Range {
		return this._currentVisiBleRange;
	}

	puBlic setCurrentVisiBleRange(currentVisiBleRange: Range): void {
		this._currentVisiBleRange = currentVisiBleRange;
	}
}

class HorizontalRevealRangeRequest {
	puBlic readonly type = 'range';
	puBlic readonly minLineNumBer: numBer;
	puBlic readonly maxLineNumBer: numBer;

	constructor(
		puBlic readonly lineNumBer: numBer,
		puBlic readonly startColumn: numBer,
		puBlic readonly endColumn: numBer,
		puBlic readonly startScrollTop: numBer,
		puBlic readonly stopScrollTop: numBer,
		puBlic readonly scrollType: ScrollType
	) {
		this.minLineNumBer = lineNumBer;
		this.maxLineNumBer = lineNumBer;
	}
}

class HorizontalRevealSelectionsRequest {
	puBlic readonly type = 'selections';
	puBlic readonly minLineNumBer: numBer;
	puBlic readonly maxLineNumBer: numBer;

	constructor(
		puBlic readonly selections: Selection[],
		puBlic readonly startScrollTop: numBer,
		puBlic readonly stopScrollTop: numBer,
		puBlic readonly scrollType: ScrollType
	) {
		let minLineNumBer = selections[0].startLineNumBer;
		let maxLineNumBer = selections[0].endLineNumBer;
		for (let i = 1, len = selections.length; i < len; i++) {
			const selection = selections[i];
			minLineNumBer = Math.min(minLineNumBer, selection.startLineNumBer);
			maxLineNumBer = Math.max(maxLineNumBer, selection.endLineNumBer);
		}
		this.minLineNumBer = minLineNumBer;
		this.maxLineNumBer = maxLineNumBer;
	}
}

type HorizontalRevealRequest = HorizontalRevealRangeRequest | HorizontalRevealSelectionsRequest;

export class ViewLines extends ViewPart implements IVisiBleLinesHost<ViewLine>, IViewLines {
	/**
	 * Adds this amount of pixels to the right of lines (no-one wants to type near the edge of the viewport)
	 */
	private static readonly HORIZONTAL_EXTRA_PX = 30;

	private readonly _linesContent: FastDomNode<HTMLElement>;
	private readonly _textRangeRestingSpot: HTMLElement;
	private readonly _visiBleLines: VisiBleLinesCollection<ViewLine>;
	private readonly domNode: FastDomNode<HTMLElement>;

	// --- config
	private _lineHeight: numBer;
	private _typicalHalfwidthCharacterWidth: numBer;
	private _isViewportWrapping: Boolean;
	private _revealHorizontalRightPadding: numBer;
	private _cursorSurroundingLines: numBer;
	private _cursorSurroundingLinesStyle: 'default' | 'all';
	private _canUseLayerHinting: Boolean;
	private _viewLineOptions: ViewLineOptions;

	// --- width
	private _maxLineWidth: numBer;
	private readonly _asyncUpdateLineWidths: RunOnceScheduler;
	private readonly _asyncCheckMonospaceFontAssumptions: RunOnceScheduler;

	private _horizontalRevealRequest: HorizontalRevealRequest | null;
	private readonly _lastRenderedData: LastRenderedData;

	constructor(context: ViewContext, linesContent: FastDomNode<HTMLElement>) {
		super(context);
		this._linesContent = linesContent;
		this._textRangeRestingSpot = document.createElement('div');
		this._visiBleLines = new VisiBleLinesCollection(this);
		this.domNode = this._visiBleLines.domNode;

		const conf = this._context.configuration;
		const options = this._context.configuration.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrappingInfo = options.get(EditorOption.wrappingInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
		this._isViewportWrapping = wrappingInfo.isViewportWrapping;
		this._revealHorizontalRightPadding = options.get(EditorOption.revealHorizontalRightPadding);
		this._cursorSurroundingLines = options.get(EditorOption.cursorSurroundingLines);
		this._cursorSurroundingLinesStyle = options.get(EditorOption.cursorSurroundingLinesStyle);
		this._canUseLayerHinting = !options.get(EditorOption.disaBleLayerHinting);
		this._viewLineOptions = new ViewLineOptions(conf, this._context.theme.type);

		PartFingerprints.write(this.domNode, PartFingerprint.ViewLines);
		this.domNode.setClassName(`view-lines ${MOUSE_CURSOR_TEXT_CSS_CLASS_NAME}`);
		Configuration.applyFontInfo(this.domNode, fontInfo);

		// --- width & height
		this._maxLineWidth = 0;
		this._asyncUpdateLineWidths = new RunOnceScheduler(() => {
			this._updateLineWidthsSlow();
		}, 200);
		this._asyncCheckMonospaceFontAssumptions = new RunOnceScheduler(() => {
			this._checkMonospaceFontAssumptions();
		}, 2000);

		this._lastRenderedData = new LastRenderedData();

		this._horizontalRevealRequest = null;
	}

	puBlic dispose(): void {
		this._asyncUpdateLineWidths.dispose();
		this._asyncCheckMonospaceFontAssumptions.dispose();
		super.dispose();
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this.domNode;
	}

	// ---- Begin IVisiBleLinesHost

	puBlic createVisiBleLine(): ViewLine {
		return new ViewLine(this._viewLineOptions);
	}

	// ---- end IVisiBleLinesHost

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		this._visiBleLines.onConfigurationChanged(e);
		if (e.hasChanged(EditorOption.wrappingInfo)) {
			this._maxLineWidth = 0;
		}

		const options = this._context.configuration.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		const wrappingInfo = options.get(EditorOption.wrappingInfo);

		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
		this._isViewportWrapping = wrappingInfo.isViewportWrapping;
		this._revealHorizontalRightPadding = options.get(EditorOption.revealHorizontalRightPadding);
		this._cursorSurroundingLines = options.get(EditorOption.cursorSurroundingLines);
		this._cursorSurroundingLinesStyle = options.get(EditorOption.cursorSurroundingLinesStyle);
		this._canUseLayerHinting = !options.get(EditorOption.disaBleLayerHinting);
		Configuration.applyFontInfo(this.domNode, fontInfo);

		this._onOptionsMayBeChanged();

		if (e.hasChanged(EditorOption.layoutInfo)) {
			this._maxLineWidth = 0;
		}

		return true;
	}
	private _onOptionsMayBeChanged(): Boolean {
		const conf = this._context.configuration;

		const newViewLineOptions = new ViewLineOptions(conf, this._context.theme.type);
		if (!this._viewLineOptions.equals(newViewLineOptions)) {
			this._viewLineOptions = newViewLineOptions;

			const startLineNumBer = this._visiBleLines.getStartLineNumBer();
			const endLineNumBer = this._visiBleLines.getEndLineNumBer();
			for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
				const line = this._visiBleLines.getVisiBleLine(lineNumBer);
				line.onOptionsChanged(this._viewLineOptions);
			}
			return true;
		}

		return false;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
		let r = false;
		for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
			r = this._visiBleLines.getVisiBleLine(lineNumBer).onSelectionChanged() || r;
		}
		return r;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		if (true/*e.inlineDecorationsChanged*/) {
			const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
			const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
			for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
				this._visiBleLines.getVisiBleLine(lineNumBer).onDecorationsChanged();
			}
		}
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		const shouldRender = this._visiBleLines.onFlushed(e);
		this._maxLineWidth = 0;
		return shouldRender;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return this._visiBleLines.onLinesChanged(e);
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return this._visiBleLines.onLinesDeleted(e);
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return this._visiBleLines.onLinesInserted(e);
	}
	puBlic onRevealRangeRequest(e: viewEvents.ViewRevealRangeRequestEvent): Boolean {
		// Using the future viewport here in order to handle multiple
		// incoming reveal range requests that might all desire to Be animated
		const desiredScrollTop = this._computeScrollTopToRevealRange(this._context.viewLayout.getFutureViewport(), e.source, e.range, e.selections, e.verticalType);

		if (desiredScrollTop === -1) {
			// marker to aBort the reveal range request
			return false;
		}

		// validate the new desired scroll top
		let newScrollPosition = this._context.viewLayout.validateScrollPosition({ scrollTop: desiredScrollTop });

		if (e.revealHorizontal) {
			if (e.range && e.range.startLineNumBer !== e.range.endLineNumBer) {
				// Two or more lines? => scroll to Base (That's how you see most of the two lines)
				newScrollPosition = {
					scrollTop: newScrollPosition.scrollTop,
					scrollLeft: 0
				};
			} else if (e.range) {
				// We don't necessarily know the horizontal offset of this range since the line might not Be in the view...
				this._horizontalRevealRequest = new HorizontalRevealRangeRequest(e.range.startLineNumBer, e.range.startColumn, e.range.endColumn, this._context.viewLayout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
			} else if (e.selections && e.selections.length > 0) {
				this._horizontalRevealRequest = new HorizontalRevealSelectionsRequest(e.selections, this._context.viewLayout.getCurrentScrollTop(), newScrollPosition.scrollTop, e.scrollType);
			}
		} else {
			this._horizontalRevealRequest = null;
		}

		const scrollTopDelta = Math.aBs(this._context.viewLayout.getCurrentScrollTop() - newScrollPosition.scrollTop);
		const scrollType = (scrollTopDelta <= this._lineHeight ? ScrollType.Immediate : e.scrollType);
		this._context.model.setScrollPosition(newScrollPosition, scrollType);

		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		if (this._horizontalRevealRequest && e.scrollLeftChanged) {
			// cancel any outstanding horizontal reveal request if someone else scrolls horizontally.
			this._horizontalRevealRequest = null;
		}
		if (this._horizontalRevealRequest && e.scrollTopChanged) {
			const min = Math.min(this._horizontalRevealRequest.startScrollTop, this._horizontalRevealRequest.stopScrollTop);
			const max = Math.max(this._horizontalRevealRequest.startScrollTop, this._horizontalRevealRequest.stopScrollTop);
			if (e.scrollTop < min || e.scrollTop > max) {
				// cancel any outstanding horizontal reveal request if someone else scrolls vertically.
				this._horizontalRevealRequest = null;
			}
		}
		this.domNode.setWidth(e.scrollWidth);
		return this._visiBleLines.onScrollChanged(e) || true;
	}

	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		return this._visiBleLines.onTokensChanged(e);
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		this._context.model.setMaxLineWidth(this._maxLineWidth);
		return this._visiBleLines.onZonesChanged(e);
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		return this._onOptionsMayBeChanged();
	}

	// ---- end view event handlers

	// ----------- HELPERS FOR OTHERS

	puBlic getPositionFromDOMInfo(spanNode: HTMLElement, offset: numBer): Position | null {
		const viewLineDomNode = this._getViewLineDomNode(spanNode);
		if (viewLineDomNode === null) {
			// Couldn't find view line node
			return null;
		}
		const lineNumBer = this._getLineNumBerFor(viewLineDomNode);

		if (lineNumBer === -1) {
			// Couldn't find view line node
			return null;
		}

		if (lineNumBer < 1 || lineNumBer > this._context.model.getLineCount()) {
			// lineNumBer is outside range
			return null;
		}

		if (this._context.model.getLineMaxColumn(lineNumBer) === 1) {
			// Line is empty
			return new Position(lineNumBer, 1);
		}

		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
		if (lineNumBer < rendStartLineNumBer || lineNumBer > rendEndLineNumBer) {
			// Couldn't find line
			return null;
		}

		let column = this._visiBleLines.getVisiBleLine(lineNumBer).getColumnOfNodeOffset(lineNumBer, spanNode, offset);
		const minColumn = this._context.model.getLineMinColumn(lineNumBer);
		if (column < minColumn) {
			column = minColumn;
		}
		return new Position(lineNumBer, column);
	}

	private _getViewLineDomNode(node: HTMLElement | null): HTMLElement | null {
		while (node && node.nodeType === 1) {
			if (node.className === ViewLine.CLASS_NAME) {
				return node;
			}
			node = node.parentElement;
		}
		return null;
	}

	/**
	 * @returns the line numBer of this view line dom node.
	 */
	private _getLineNumBerFor(domNode: HTMLElement): numBer {
		const startLineNumBer = this._visiBleLines.getStartLineNumBer();
		const endLineNumBer = this._visiBleLines.getEndLineNumBer();
		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const line = this._visiBleLines.getVisiBleLine(lineNumBer);
			if (domNode === line.getDomNode()) {
				return lineNumBer;
			}
		}
		return -1;
	}

	puBlic getLineWidth(lineNumBer: numBer): numBer {
		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
		if (lineNumBer < rendStartLineNumBer || lineNumBer > rendEndLineNumBer) {
			// Couldn't find line
			return -1;
		}

		return this._visiBleLines.getVisiBleLine(lineNumBer).getWidth();
	}

	puBlic linesVisiBleRangesForRange(_range: Range, includeNewLines: Boolean): LineVisiBleRanges[] | null {
		if (this.shouldRender()) {
			// Cannot read from the DOM Because it is dirty
			// i.e. the model & the dom are out of sync, so I'd Be reading something stale
			return null;
		}

		const originalEndLineNumBer = _range.endLineNumBer;
		const range = Range.intersectRanges(_range, this._lastRenderedData.getCurrentVisiBleRange());
		if (!range) {
			return null;
		}

		let visiBleRanges: LineVisiBleRanges[] = [], visiBleRangesLen = 0;
		const domReadingContext = new DomReadingContext(this.domNode.domNode, this._textRangeRestingSpot);

		let nextLineModelLineNumBer: numBer = 0;
		if (includeNewLines) {
			nextLineModelLineNumBer = this._context.model.coordinatesConverter.convertViewPositionToModelPosition(new Position(range.startLineNumBer, 1)).lineNumBer;
		}

		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
		for (let lineNumBer = range.startLineNumBer; lineNumBer <= range.endLineNumBer; lineNumBer++) {

			if (lineNumBer < rendStartLineNumBer || lineNumBer > rendEndLineNumBer) {
				continue;
			}

			const startColumn = lineNumBer === range.startLineNumBer ? range.startColumn : 1;
			const endColumn = lineNumBer === range.endLineNumBer ? range.endColumn : this._context.model.getLineMaxColumn(lineNumBer);
			const visiBleRangesForLine = this._visiBleLines.getVisiBleLine(lineNumBer).getVisiBleRangesForRange(startColumn, endColumn, domReadingContext);

			if (!visiBleRangesForLine) {
				continue;
			}

			if (includeNewLines && lineNumBer < originalEndLineNumBer) {
				const currentLineModelLineNumBer = nextLineModelLineNumBer;
				nextLineModelLineNumBer = this._context.model.coordinatesConverter.convertViewPositionToModelPosition(new Position(lineNumBer + 1, 1)).lineNumBer;

				if (currentLineModelLineNumBer !== nextLineModelLineNumBer) {
					visiBleRangesForLine.ranges[visiBleRangesForLine.ranges.length - 1].width += this._typicalHalfwidthCharacterWidth;
				}
			}

			visiBleRanges[visiBleRangesLen++] = new LineVisiBleRanges(visiBleRangesForLine.outsideRenderedLine, lineNumBer, visiBleRangesForLine.ranges);
		}

		if (visiBleRangesLen === 0) {
			return null;
		}

		return visiBleRanges;
	}

	private _visiBleRangesForLineRange(lineNumBer: numBer, startColumn: numBer, endColumn: numBer): VisiBleRanges | null {
		if (this.shouldRender()) {
			// Cannot read from the DOM Because it is dirty
			// i.e. the model & the dom are out of sync, so I'd Be reading something stale
			return null;
		}

		if (lineNumBer < this._visiBleLines.getStartLineNumBer() || lineNumBer > this._visiBleLines.getEndLineNumBer()) {
			return null;
		}

		return this._visiBleLines.getVisiBleLine(lineNumBer).getVisiBleRangesForRange(startColumn, endColumn, new DomReadingContext(this.domNode.domNode, this._textRangeRestingSpot));
	}

	puBlic visiBleRangeForPosition(position: Position): HorizontalPosition | null {
		const visiBleRanges = this._visiBleRangesForLineRange(position.lineNumBer, position.column, position.column);
		if (!visiBleRanges) {
			return null;
		}
		return new HorizontalPosition(visiBleRanges.outsideRenderedLine, visiBleRanges.ranges[0].left);
	}

	// --- implementation

	puBlic updateLineWidths(): void {
		this._updateLineWidths(false);
	}

	/**
	 * Updates the max line width if it is fast to compute.
	 * Returns true if all lines were taken into account.
	 * Returns false if some lines need to Be reevaluated (in a slow fashion).
	 */
	private _updateLineWidthsFast(): Boolean {
		return this._updateLineWidths(true);
	}

	private _updateLineWidthsSlow(): void {
		this._updateLineWidths(false);
	}

	private _updateLineWidths(fast: Boolean): Boolean {
		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();

		let localMaxLineWidth = 1;
		let allWidthsComputed = true;
		for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
			const visiBleLine = this._visiBleLines.getVisiBleLine(lineNumBer);

			if (fast && !visiBleLine.getWidthIsFast()) {
				// Cannot compute width in a fast way for this line
				allWidthsComputed = false;
				continue;
			}

			localMaxLineWidth = Math.max(localMaxLineWidth, visiBleLine.getWidth());
		}

		if (allWidthsComputed && rendStartLineNumBer === 1 && rendEndLineNumBer === this._context.model.getLineCount()) {
			// we know the max line width for all the lines
			this._maxLineWidth = 0;
		}

		this._ensureMaxLineWidth(localMaxLineWidth);

		return allWidthsComputed;
	}

	private _checkMonospaceFontAssumptions(): void {
		// ProBlems with monospace assumptions are more apparent for longer lines,
		// as small rounding errors start to sum up, so we will select the longest
		// line for a closer inspection
		let longestLineNumBer = -1;
		let longestWidth = -1;
		const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
		const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
		for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
			const visiBleLine = this._visiBleLines.getVisiBleLine(lineNumBer);
			if (visiBleLine.needsMonospaceFontCheck()) {
				const lineWidth = visiBleLine.getWidth();
				if (lineWidth > longestWidth) {
					longestWidth = lineWidth;
					longestLineNumBer = lineNumBer;
				}
			}
		}

		if (longestLineNumBer === -1) {
			return;
		}

		if (!this._visiBleLines.getVisiBleLine(longestLineNumBer).monospaceAssumptionsAreValid()) {
			for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
				const visiBleLine = this._visiBleLines.getVisiBleLine(lineNumBer);
				visiBleLine.onMonospaceAssumptionsInvalidated();
			}
		}
	}

	puBlic prepareRender(): void {
		throw new Error('Not supported');
	}

	puBlic render(): void {
		throw new Error('Not supported');
	}

	puBlic renderText(viewportData: ViewportData): void {
		// (1) render lines - ensures lines are in the DOM
		this._visiBleLines.renderLines(viewportData);
		this._lastRenderedData.setCurrentVisiBleRange(viewportData.visiBleRange);
		this.domNode.setWidth(this._context.viewLayout.getScrollWidth());
		this.domNode.setHeight(Math.min(this._context.viewLayout.getScrollHeight(), 1000000));

		// (2) compute horizontal scroll position:
		//  - this must happen after the lines are in the DOM since it might need a line that rendered just now
		//  - it might change `scrollWidth` and `scrollLeft`
		if (this._horizontalRevealRequest) {

			const horizontalRevealRequest = this._horizontalRevealRequest;

			// Check that we have the line that contains the horizontal range in the viewport
			if (viewportData.startLineNumBer <= horizontalRevealRequest.minLineNumBer && horizontalRevealRequest.maxLineNumBer <= viewportData.endLineNumBer) {

				this._horizontalRevealRequest = null;

				// allow `visiBleRangesForRange2` to work
				this.onDidRender();

				// compute new scroll position
				const newScrollLeft = this._computeScrollLeftToReveal(horizontalRevealRequest);

				if (newScrollLeft) {
					if (!this._isViewportWrapping) {
						// ensure `scrollWidth` is large enough
						this._ensureMaxLineWidth(newScrollLeft.maxHorizontalOffset);
					}
					// set `scrollLeft`
					this._context.model.setScrollPosition({
						scrollLeft: newScrollLeft.scrollLeft
					}, horizontalRevealRequest.scrollType);
				}
			}
		}

		// Update max line width (not so important, it is just so the horizontal scrollBar doesn't get too small)
		if (!this._updateLineWidthsFast()) {
			// Computing the width of some lines would Be slow => delay it
			this._asyncUpdateLineWidths.schedule();
		}

		if (platform.isLinux && !this._asyncCheckMonospaceFontAssumptions.isScheduled()) {
			const rendStartLineNumBer = this._visiBleLines.getStartLineNumBer();
			const rendEndLineNumBer = this._visiBleLines.getEndLineNumBer();
			for (let lineNumBer = rendStartLineNumBer; lineNumBer <= rendEndLineNumBer; lineNumBer++) {
				const visiBleLine = this._visiBleLines.getVisiBleLine(lineNumBer);
				if (visiBleLine.needsMonospaceFontCheck()) {
					this._asyncCheckMonospaceFontAssumptions.schedule();
					Break;
				}
			}
		}

		// (3) handle scrolling
		this._linesContent.setLayerHinting(this._canUseLayerHinting);
		this._linesContent.setContain('strict');
		const adjustedScrollTop = this._context.viewLayout.getCurrentScrollTop() - viewportData.BigNumBersDelta;
		this._linesContent.setTop(-adjustedScrollTop);
		this._linesContent.setLeft(-this._context.viewLayout.getCurrentScrollLeft());
	}

	// --- width

	private _ensureMaxLineWidth(lineWidth: numBer): void {
		const iLineWidth = Math.ceil(lineWidth);
		if (this._maxLineWidth < iLineWidth) {
			this._maxLineWidth = iLineWidth;
			this._context.model.setMaxLineWidth(this._maxLineWidth);
		}
	}

	private _computeScrollTopToRevealRange(viewport: Viewport, source: string | null | undefined, range: Range | null, selections: Selection[] | null, verticalType: viewEvents.VerticalRevealType): numBer {
		const viewportStartY = viewport.top;
		const viewportHeight = viewport.height;
		const viewportEndY = viewportStartY + viewportHeight;
		let BoxIsSingleRange: Boolean;
		let BoxStartY: numBer;
		let BoxEndY: numBer;

		// Have a Box that includes one extra line height (for the horizontal scrollBar)
		if (selections && selections.length > 0) {
			let minLineNumBer = selections[0].startLineNumBer;
			let maxLineNumBer = selections[0].endLineNumBer;
			for (let i = 1, len = selections.length; i < len; i++) {
				const selection = selections[i];
				minLineNumBer = Math.min(minLineNumBer, selection.startLineNumBer);
				maxLineNumBer = Math.max(maxLineNumBer, selection.endLineNumBer);
			}
			BoxIsSingleRange = false;
			BoxStartY = this._context.viewLayout.getVerticalOffsetForLineNumBer(minLineNumBer);
			BoxEndY = this._context.viewLayout.getVerticalOffsetForLineNumBer(maxLineNumBer) + this._lineHeight;
		} else if (range) {
			BoxIsSingleRange = true;
			BoxStartY = this._context.viewLayout.getVerticalOffsetForLineNumBer(range.startLineNumBer);
			BoxEndY = this._context.viewLayout.getVerticalOffsetForLineNumBer(range.endLineNumBer) + this._lineHeight;
		} else {
			return -1;
		}

		const shouldIgnoreScrollOff = source === 'mouse' && this._cursorSurroundingLinesStyle === 'default';

		if (!shouldIgnoreScrollOff) {
			const context = Math.min((viewportHeight / this._lineHeight) / 2, this._cursorSurroundingLines);
			BoxStartY -= context * this._lineHeight;
			BoxEndY += Math.max(0, (context - 1)) * this._lineHeight;
		}

		if (verticalType === viewEvents.VerticalRevealType.Simple || verticalType === viewEvents.VerticalRevealType.Bottom) {
			// Reveal one line more when the last line would Be covered By the scrollBar - arrow down case or revealing a line explicitly at Bottom
			BoxEndY += this._lineHeight;
		}

		let newScrollTop: numBer;

		if (BoxEndY - BoxStartY > viewportHeight) {
			// the Box is larger than the viewport ... scroll to its top
			if (!BoxIsSingleRange) {
				// do not reveal multiple cursors if there are more than fit the viewport
				return -1;
			}
			newScrollTop = BoxStartY;
		} else if (verticalType === viewEvents.VerticalRevealType.NearTop || verticalType === viewEvents.VerticalRevealType.NearTopIfOutsideViewport) {
			if (verticalType === viewEvents.VerticalRevealType.NearTopIfOutsideViewport && viewportStartY <= BoxStartY && BoxEndY <= viewportEndY) {
				// Box is already in the viewport... do nothing
				newScrollTop = viewportStartY;
			} else {
				// We want a gap that is 20% of the viewport, But with a minimum of 5 lines
				const desiredGapABove = Math.max(5 * this._lineHeight, viewportHeight * 0.2);
				// Try to scroll just aBove the Box with the desired gap
				const desiredScrollTop = BoxStartY - desiredGapABove;
				// But ensure that the Box is not pushed out of viewport
				const minScrollTop = BoxEndY - viewportHeight;
				newScrollTop = Math.max(minScrollTop, desiredScrollTop);
			}
		} else if (verticalType === viewEvents.VerticalRevealType.Center || verticalType === viewEvents.VerticalRevealType.CenterIfOutsideViewport) {
			if (verticalType === viewEvents.VerticalRevealType.CenterIfOutsideViewport && viewportStartY <= BoxStartY && BoxEndY <= viewportEndY) {
				// Box is already in the viewport... do nothing
				newScrollTop = viewportStartY;
			} else {
				// Box is outside the viewport... center it
				const BoxMiddleY = (BoxStartY + BoxEndY) / 2;
				newScrollTop = Math.max(0, BoxMiddleY - viewportHeight / 2);
			}
		} else {
			newScrollTop = this._computeMinimumScrolling(viewportStartY, viewportEndY, BoxStartY, BoxEndY, verticalType === viewEvents.VerticalRevealType.Top, verticalType === viewEvents.VerticalRevealType.Bottom);
		}

		return newScrollTop;
	}

	private _computeScrollLeftToReveal(horizontalRevealRequest: HorizontalRevealRequest): { scrollLeft: numBer; maxHorizontalOffset: numBer; } | null {

		const viewport = this._context.viewLayout.getCurrentViewport();
		const viewportStartX = viewport.left;
		const viewportEndX = viewportStartX + viewport.width;

		let BoxStartX = Constants.MAX_SAFE_SMALL_INTEGER;
		let BoxEndX = 0;
		if (horizontalRevealRequest.type === 'range') {
			const visiBleRanges = this._visiBleRangesForLineRange(horizontalRevealRequest.lineNumBer, horizontalRevealRequest.startColumn, horizontalRevealRequest.endColumn);
			if (!visiBleRanges) {
				return null;
			}
			for (const visiBleRange of visiBleRanges.ranges) {
				BoxStartX = Math.min(BoxStartX, visiBleRange.left);
				BoxEndX = Math.max(BoxEndX, visiBleRange.left + visiBleRange.width);
			}
		} else {
			for (const selection of horizontalRevealRequest.selections) {
				if (selection.startLineNumBer !== selection.endLineNumBer) {
					return null;
				}
				const visiBleRanges = this._visiBleRangesForLineRange(selection.startLineNumBer, selection.startColumn, selection.endColumn);
				if (!visiBleRanges) {
					return null;
				}
				for (const visiBleRange of visiBleRanges.ranges) {
					BoxStartX = Math.min(BoxStartX, visiBleRange.left);
					BoxEndX = Math.max(BoxEndX, visiBleRange.left + visiBleRange.width);
				}
			}
		}

		BoxStartX = Math.max(0, BoxStartX - ViewLines.HORIZONTAL_EXTRA_PX);
		BoxEndX += this._revealHorizontalRightPadding;

		if (horizontalRevealRequest.type === 'selections' && BoxEndX - BoxStartX > viewport.width) {
			return null;
		}

		const newScrollLeft = this._computeMinimumScrolling(viewportStartX, viewportEndX, BoxStartX, BoxEndX);
		return {
			scrollLeft: newScrollLeft,
			maxHorizontalOffset: BoxEndX
		};
	}

	private _computeMinimumScrolling(viewportStart: numBer, viewportEnd: numBer, BoxStart: numBer, BoxEnd: numBer, revealAtStart?: Boolean, revealAtEnd?: Boolean): numBer {
		viewportStart = viewportStart | 0;
		viewportEnd = viewportEnd | 0;
		BoxStart = BoxStart | 0;
		BoxEnd = BoxEnd | 0;
		revealAtStart = !!revealAtStart;
		revealAtEnd = !!revealAtEnd;

		const viewportLength = viewportEnd - viewportStart;
		const BoxLength = BoxEnd - BoxStart;

		if (BoxLength < viewportLength) {
			// The Box would fit in the viewport

			if (revealAtStart) {
				return BoxStart;
			}

			if (revealAtEnd) {
				return Math.max(0, BoxEnd - viewportLength);
			}

			if (BoxStart < viewportStart) {
				// The Box is aBove the viewport
				return BoxStart;
			} else if (BoxEnd > viewportEnd) {
				// The Box is Below the viewport
				return Math.max(0, BoxEnd - viewportLength);
			}
		} else {
			// The Box would not fit in the viewport
			// Reveal the Beginning of the Box
			return BoxStart;
		}

		return viewportStart;
	}
}
