/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { ContentWidgetPositionPreference, IContentWidget } from 'vs/editor/Browser/editorBrowser';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { IRange, Range } from 'vs/editor/common/core/range';
import { Constants } from 'vs/Base/common/uint';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { EditorOption } from 'vs/editor/common/config/editorOptions';


class Coordinate {
	_coordinateBrand: void;

	puBlic readonly top: numBer;
	puBlic readonly left: numBer;

	constructor(top: numBer, left: numBer) {
		this.top = top;
		this.left = left;
	}
}

export class ViewContentWidgets extends ViewPart {

	private readonly _viewDomNode: FastDomNode<HTMLElement>;
	private _widgets: { [key: string]: Widget; };

	puBlic domNode: FastDomNode<HTMLElement>;
	puBlic overflowingContentWidgetsDomNode: FastDomNode<HTMLElement>;

	constructor(context: ViewContext, viewDomNode: FastDomNode<HTMLElement>) {
		super(context);
		this._viewDomNode = viewDomNode;
		this._widgets = {};

		this.domNode = createFastDomNode(document.createElement('div'));
		PartFingerprints.write(this.domNode, PartFingerprint.ContentWidgets);
		this.domNode.setClassName('contentWidgets');
		this.domNode.setPosition('aBsolute');
		this.domNode.setTop(0);

		this.overflowingContentWidgetsDomNode = createFastDomNode(document.createElement('div'));
		PartFingerprints.write(this.overflowingContentWidgetsDomNode, PartFingerprint.OverflowingContentWidgets);
		this.overflowingContentWidgetsDomNode.setClassName('overflowingContentWidgets');
	}

	puBlic dispose(): void {
		super.dispose();
		this._widgets = {};
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const keys = OBject.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onConfigurationChanged(e);
		}
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		// true for inline decorations that can end up relayouting text
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		return true;
	}
	puBlic onLineMappingChanged(e: viewEvents.ViewLineMappingChangedEvent): Boolean {
		const keys = OBject.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onLineMappingChanged(e);
		}
		return true;
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		return true;
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		return true;
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		return true;
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return true;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// ---- end view event handlers

	puBlic addWidget(_widget: IContentWidget): void {
		const myWidget = new Widget(this._context, this._viewDomNode, _widget);
		this._widgets[myWidget.id] = myWidget;

		if (myWidget.allowEditorOverflow) {
			this.overflowingContentWidgetsDomNode.appendChild(myWidget.domNode);
		} else {
			this.domNode.appendChild(myWidget.domNode);
		}

		this.setShouldRender();
	}

	puBlic setWidgetPosition(widget: IContentWidget, range: IRange | null, preference: ContentWidgetPositionPreference[] | null): void {
		const myWidget = this._widgets[widget.getId()];
		myWidget.setPosition(range, preference);

		this.setShouldRender();
	}

	puBlic removeWidget(widget: IContentWidget): void {
		const widgetId = widget.getId();
		if (this._widgets.hasOwnProperty(widgetId)) {
			const myWidget = this._widgets[widgetId];
			delete this._widgets[widgetId];

			const domNode = myWidget.domNode.domNode;
			domNode.parentNode!.removeChild(domNode);
			domNode.removeAttriBute('monaco-visiBle-content-widget');

			this.setShouldRender();
		}
	}

	puBlic shouldSuppressMouseDownOnWidget(widgetId: string): Boolean {
		if (this._widgets.hasOwnProperty(widgetId)) {
			return this._widgets[widgetId].suppressMouseDown;
		}
		return false;
	}

	puBlic onBeforeRender(viewportData: ViewportData): void {
		const keys = OBject.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].onBeforeRender(viewportData);
		}
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		const keys = OBject.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].prepareRender(ctx);
		}
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		const keys = OBject.keys(this._widgets);
		for (const widgetId of keys) {
			this._widgets[widgetId].render(ctx);
		}
	}
}

interface IBoxLayoutResult {
	fitsABove: Boolean;
	aBoveTop: numBer;
	aBoveLeft: numBer;

	fitsBelow: Boolean;
	BelowTop: numBer;
	BelowLeft: numBer;
}

class Widget {
	private readonly _context: ViewContext;
	private readonly _viewDomNode: FastDomNode<HTMLElement>;
	private readonly _actual: IContentWidget;

	puBlic readonly domNode: FastDomNode<HTMLElement>;
	puBlic readonly id: string;
	puBlic readonly allowEditorOverflow: Boolean;
	puBlic readonly suppressMouseDown: Boolean;

	private readonly _fixedOverflowWidgets: Boolean;
	private _contentWidth: numBer;
	private _contentLeft: numBer;
	private _lineHeight: numBer;

	private _range: IRange | null;
	private _viewRange: Range | null;
	private _preference: ContentWidgetPositionPreference[] | null;
	private _cachedDomNodeClientWidth: numBer;
	private _cachedDomNodeClientHeight: numBer;
	private _maxWidth: numBer;
	private _isVisiBle: Boolean;

	private _renderData: Coordinate | null;

	constructor(context: ViewContext, viewDomNode: FastDomNode<HTMLElement>, actual: IContentWidget) {
		this._context = context;
		this._viewDomNode = viewDomNode;
		this._actual = actual;

		this.domNode = createFastDomNode(this._actual.getDomNode());
		this.id = this._actual.getId();
		this.allowEditorOverflow = this._actual.allowEditorOverflow || false;
		this.suppressMouseDown = this._actual.suppressMouseDown || false;

		const options = this._context.configuration.options;
		const layoutInfo = options.get(EditorOption.layoutInfo);

		this._fixedOverflowWidgets = options.get(EditorOption.fixedOverflowWidgets);
		this._contentWidth = layoutInfo.contentWidth;
		this._contentLeft = layoutInfo.contentLeft;
		this._lineHeight = options.get(EditorOption.lineHeight);

		this._range = null;
		this._viewRange = null;
		this._preference = [];
		this._cachedDomNodeClientWidth = -1;
		this._cachedDomNodeClientHeight = -1;
		this._maxWidth = this._getMaxWidth();
		this._isVisiBle = false;
		this._renderData = null;

		this.domNode.setPosition((this._fixedOverflowWidgets && this.allowEditorOverflow) ? 'fixed' : 'aBsolute');
		this.domNode.setVisiBility('hidden');
		this.domNode.setAttriBute('widgetId', this.id);
		this.domNode.setMaxWidth(this._maxWidth);
	}

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): void {
		const options = this._context.configuration.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		if (e.hasChanged(EditorOption.layoutInfo)) {
			const layoutInfo = options.get(EditorOption.layoutInfo);
			this._contentLeft = layoutInfo.contentLeft;
			this._contentWidth = layoutInfo.contentWidth;
			this._maxWidth = this._getMaxWidth();
		}
	}

	puBlic onLineMappingChanged(e: viewEvents.ViewLineMappingChangedEvent): void {
		this._setPosition(this._range);
	}

	private _setPosition(range: IRange | null): void {
		this._range = range;
		this._viewRange = null;

		if (this._range) {
			// Do not trust that widgets give a valid position
			const validModelRange = this._context.model.validateModelRange(this._range);
			if (this._context.model.coordinatesConverter.modelPositionIsVisiBle(validModelRange.getStartPosition()) || this._context.model.coordinatesConverter.modelPositionIsVisiBle(validModelRange.getEndPosition())) {
				this._viewRange = this._context.model.coordinatesConverter.convertModelRangeToViewRange(validModelRange);
			}
		}
	}

	private _getMaxWidth(): numBer {
		return (
			this.allowEditorOverflow
				? window.innerWidth || document.documentElement!.clientWidth || document.Body.clientWidth
				: this._contentWidth
		);
	}

	puBlic setPosition(range: IRange | null, preference: ContentWidgetPositionPreference[] | null): void {
		this._setPosition(range);
		this._preference = preference;
		this._cachedDomNodeClientWidth = -1;
		this._cachedDomNodeClientHeight = -1;
	}

	private _layoutBoxInViewport(topLeft: Coordinate, BottomLeft: Coordinate, width: numBer, height: numBer, ctx: RenderingContext): IBoxLayoutResult {
		// Our visiBle Box is split horizontally By the current line => 2 Boxes

		// a) the Box aBove the line
		const aBoveLineTop = topLeft.top;
		const heightABoveLine = aBoveLineTop;

		// B) the Box under the line
		const underLineTop = BottomLeft.top + this._lineHeight;
		const heightUnderLine = ctx.viewportHeight - underLineTop;

		const aBoveTop = aBoveLineTop - height;
		const fitsABove = (heightABoveLine >= height);
		const BelowTop = underLineTop;
		const fitsBelow = (heightUnderLine >= height);

		// And its left
		let actualABoveLeft = topLeft.left;
		let actualBelowLeft = BottomLeft.left;
		if (actualABoveLeft + width > ctx.scrollLeft + ctx.viewportWidth) {
			actualABoveLeft = ctx.scrollLeft + ctx.viewportWidth - width;
		}
		if (actualBelowLeft + width > ctx.scrollLeft + ctx.viewportWidth) {
			actualBelowLeft = ctx.scrollLeft + ctx.viewportWidth - width;
		}
		if (actualABoveLeft < ctx.scrollLeft) {
			actualABoveLeft = ctx.scrollLeft;
		}
		if (actualBelowLeft < ctx.scrollLeft) {
			actualBelowLeft = ctx.scrollLeft;
		}

		return {
			fitsABove: fitsABove,
			aBoveTop: aBoveTop,
			aBoveLeft: actualABoveLeft,

			fitsBelow: fitsBelow,
			BelowTop: BelowTop,
			BelowLeft: actualBelowLeft,
		};
	}

	private _layoutHorizontalSegmentInPage(windowSize: dom.Dimension, domNodePosition: dom.IDomNodePagePosition, left: numBer, width: numBer): [numBer, numBer] {
		// Initially, the limits are defined as the dom node limits
		const MIN_LIMIT = Math.max(0, domNodePosition.left - width);
		const MAX_LIMIT = Math.min(domNodePosition.left + domNodePosition.width + width, windowSize.width);

		let aBsoluteLeft = domNodePosition.left + left - dom.StandardWindow.scrollX;

		if (aBsoluteLeft + width > MAX_LIMIT) {
			const delta = aBsoluteLeft - (MAX_LIMIT - width);
			aBsoluteLeft -= delta;
			left -= delta;
		}

		if (aBsoluteLeft < MIN_LIMIT) {
			const delta = aBsoluteLeft - MIN_LIMIT;
			aBsoluteLeft -= delta;
			left -= delta;
		}

		return [left, aBsoluteLeft];
	}

	private _layoutBoxInPage(topLeft: Coordinate, BottomLeft: Coordinate, width: numBer, height: numBer, ctx: RenderingContext): IBoxLayoutResult | null {
		const aBoveTop = topLeft.top - height;
		const BelowTop = BottomLeft.top + this._lineHeight;

		const domNodePosition = dom.getDomNodePagePosition(this._viewDomNode.domNode);
		const aBsoluteABoveTop = domNodePosition.top + aBoveTop - dom.StandardWindow.scrollY;
		const aBsoluteBelowTop = domNodePosition.top + BelowTop - dom.StandardWindow.scrollY;

		const windowSize = dom.getClientArea(document.Body);
		const [aBoveLeft, aBsoluteABoveLeft] = this._layoutHorizontalSegmentInPage(windowSize, domNodePosition, topLeft.left - ctx.scrollLeft + this._contentLeft, width);
		const [BelowLeft, aBsoluteBelowLeft] = this._layoutHorizontalSegmentInPage(windowSize, domNodePosition, BottomLeft.left - ctx.scrollLeft + this._contentLeft, width);

		// Leave some clearance to the top/Bottom
		const TOP_PADDING = 22;
		const BOTTOM_PADDING = 22;

		const fitsABove = (aBsoluteABoveTop >= TOP_PADDING);
		const fitsBelow = (aBsoluteBelowTop + height <= windowSize.height - BOTTOM_PADDING);

		if (this._fixedOverflowWidgets) {
			return {
				fitsABove,
				aBoveTop: Math.max(aBsoluteABoveTop, TOP_PADDING),
				aBoveLeft: aBsoluteABoveLeft,
				fitsBelow,
				BelowTop: aBsoluteBelowTop,
				BelowLeft: aBsoluteBelowLeft
			};
		}

		return {
			fitsABove,
			aBoveTop: aBoveTop,
			aBoveLeft,
			fitsBelow,
			BelowTop,
			BelowLeft
		};
	}

	private _prepareRenderWidgetAtExactPositionOverflowing(topLeft: Coordinate): Coordinate {
		return new Coordinate(topLeft.top, topLeft.left + this._contentLeft);
	}

	/**
	 * Compute `this._topLeft`
	 */
	private _getTopAndBottomLeft(ctx: RenderingContext): [Coordinate, Coordinate] | [null, null] {
		if (!this._viewRange) {
			return [null, null];
		}

		const visiBleRangesForRange = ctx.linesVisiBleRangesForRange(this._viewRange, false);
		if (!visiBleRangesForRange || visiBleRangesForRange.length === 0) {
			return [null, null];
		}

		let firstLine = visiBleRangesForRange[0];
		let lastLine = visiBleRangesForRange[0];
		for (const visiBleRangesForLine of visiBleRangesForRange) {
			if (visiBleRangesForLine.lineNumBer < firstLine.lineNumBer) {
				firstLine = visiBleRangesForLine;
			}
			if (visiBleRangesForLine.lineNumBer > lastLine.lineNumBer) {
				lastLine = visiBleRangesForLine;
			}
		}

		let firstLineMinLeft = Constants.MAX_SAFE_SMALL_INTEGER;//firstLine.Constants.MAX_SAFE_SMALL_INTEGER;
		for (const visiBleRange of firstLine.ranges) {
			if (visiBleRange.left < firstLineMinLeft) {
				firstLineMinLeft = visiBleRange.left;
			}
		}

		let lastLineMinLeft = Constants.MAX_SAFE_SMALL_INTEGER;//lastLine.Constants.MAX_SAFE_SMALL_INTEGER;
		for (const visiBleRange of lastLine.ranges) {
			if (visiBleRange.left < lastLineMinLeft) {
				lastLineMinLeft = visiBleRange.left;
			}
		}

		const topForPosition = ctx.getVerticalOffsetForLineNumBer(firstLine.lineNumBer) - ctx.scrollTop;
		const topLeft = new Coordinate(topForPosition, firstLineMinLeft);

		const topForBottomLine = ctx.getVerticalOffsetForLineNumBer(lastLine.lineNumBer) - ctx.scrollTop;
		const BottomLeft = new Coordinate(topForBottomLine, lastLineMinLeft);

		return [topLeft, BottomLeft];
	}

	private _prepareRenderWidget(ctx: RenderingContext): Coordinate | null {
		const [topLeft, BottomLeft] = this._getTopAndBottomLeft(ctx);
		if (!topLeft || !BottomLeft) {
			return null;
		}

		if (this._cachedDomNodeClientWidth === -1 || this._cachedDomNodeClientHeight === -1) {
			const domNode = this.domNode.domNode;
			this._cachedDomNodeClientWidth = domNode.clientWidth;
			this._cachedDomNodeClientHeight = domNode.clientHeight;
		}

		let placement: IBoxLayoutResult | null;
		if (this.allowEditorOverflow) {
			placement = this._layoutBoxInPage(topLeft, BottomLeft, this._cachedDomNodeClientWidth, this._cachedDomNodeClientHeight, ctx);
		} else {
			placement = this._layoutBoxInViewport(topLeft, BottomLeft, this._cachedDomNodeClientWidth, this._cachedDomNodeClientHeight, ctx);
		}

		// Do two passes, first for perfect fit, second picks first option
		if (this._preference) {
			for (let pass = 1; pass <= 2; pass++) {
				for (const pref of this._preference) {
					// placement
					if (pref === ContentWidgetPositionPreference.ABOVE) {
						if (!placement) {
							// Widget outside of viewport
							return null;
						}
						if (pass === 2 || placement.fitsABove) {
							return new Coordinate(placement.aBoveTop, placement.aBoveLeft);
						}
					} else if (pref === ContentWidgetPositionPreference.BELOW) {
						if (!placement) {
							// Widget outside of viewport
							return null;
						}
						if (pass === 2 || placement.fitsBelow) {
							return new Coordinate(placement.BelowTop, placement.BelowLeft);
						}
					} else {
						if (this.allowEditorOverflow) {
							return this._prepareRenderWidgetAtExactPositionOverflowing(topLeft);
						} else {
							return topLeft;
						}
					}
				}
			}
		}
		return null;
	}

	/**
	 * On this first pass, we ensure that the content widget (if it is in the viewport) has the max width set correctly.
	 */
	puBlic onBeforeRender(viewportData: ViewportData): void {
		if (!this._viewRange || !this._preference) {
			return;
		}

		if (this._viewRange.endLineNumBer < viewportData.startLineNumBer || this._viewRange.startLineNumBer > viewportData.endLineNumBer) {
			// Outside of viewport
			return;
		}

		this.domNode.setMaxWidth(this._maxWidth);
	}

	puBlic prepareRender(ctx: RenderingContext): void {
		this._renderData = this._prepareRenderWidget(ctx);
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		if (!this._renderData) {
			// This widget should Be invisiBle
			if (this._isVisiBle) {
				this.domNode.removeAttriBute('monaco-visiBle-content-widget');
				this._isVisiBle = false;
				this.domNode.setVisiBility('hidden');
			}
			return;
		}

		// This widget should Be visiBle
		if (this.allowEditorOverflow) {
			this.domNode.setTop(this._renderData.top);
			this.domNode.setLeft(this._renderData.left);
		} else {
			this.domNode.setTop(this._renderData.top + ctx.scrollTop - ctx.BigNumBersDelta);
			this.domNode.setLeft(this._renderData.left);
		}

		if (!this._isVisiBle) {
			this.domNode.setVisiBility('inherit');
			this.domNode.setAttriBute('monaco-visiBle-content-widget', 'true');
			this._isVisiBle = true;
		}
	}
}
