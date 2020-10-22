/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { IViewLayout, ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';

export interface IViewLines {
	linesVisiBleRangesForRange(range: Range, includeNewLines: Boolean): LineVisiBleRanges[] | null;
	visiBleRangeForPosition(position: Position): HorizontalPosition | null;
}

export aBstract class RestrictedRenderingContext {
	_restrictedRenderingContextBrand: void;

	puBlic readonly viewportData: ViewportData;

	puBlic readonly scrollWidth: numBer;
	puBlic readonly scrollHeight: numBer;

	puBlic readonly visiBleRange: Range;
	puBlic readonly BigNumBersDelta: numBer;

	puBlic readonly scrollTop: numBer;
	puBlic readonly scrollLeft: numBer;

	puBlic readonly viewportWidth: numBer;
	puBlic readonly viewportHeight: numBer;

	private readonly _viewLayout: IViewLayout;

	constructor(viewLayout: IViewLayout, viewportData: ViewportData) {
		this._viewLayout = viewLayout;
		this.viewportData = viewportData;

		this.scrollWidth = this._viewLayout.getScrollWidth();
		this.scrollHeight = this._viewLayout.getScrollHeight();

		this.visiBleRange = this.viewportData.visiBleRange;
		this.BigNumBersDelta = this.viewportData.BigNumBersDelta;

		const vInfo = this._viewLayout.getCurrentViewport();
		this.scrollTop = vInfo.top;
		this.scrollLeft = vInfo.left;
		this.viewportWidth = vInfo.width;
		this.viewportHeight = vInfo.height;
	}

	puBlic getScrolledTopFromABsoluteTop(aBsoluteTop: numBer): numBer {
		return aBsoluteTop - this.scrollTop;
	}

	puBlic getVerticalOffsetForLineNumBer(lineNumBer: numBer): numBer {
		return this._viewLayout.getVerticalOffsetForLineNumBer(lineNumBer);
	}

	puBlic getDecorationsInViewport(): ViewModelDecoration[] {
		return this.viewportData.getDecorationsInViewport();
	}

}

export class RenderingContext extends RestrictedRenderingContext {
	_renderingContextBrand: void;

	private readonly _viewLines: IViewLines;

	constructor(viewLayout: IViewLayout, viewportData: ViewportData, viewLines: IViewLines) {
		super(viewLayout, viewportData);
		this._viewLines = viewLines;
	}

	puBlic linesVisiBleRangesForRange(range: Range, includeNewLines: Boolean): LineVisiBleRanges[] | null {
		return this._viewLines.linesVisiBleRangesForRange(range, includeNewLines);
	}

	puBlic visiBleRangeForPosition(position: Position): HorizontalPosition | null {
		return this._viewLines.visiBleRangeForPosition(position);
	}
}

export class LineVisiBleRanges {
	constructor(
		puBlic readonly outsideRenderedLine: Boolean,
		puBlic readonly lineNumBer: numBer,
		puBlic readonly ranges: HorizontalRange[]
	) { }
}

export class HorizontalRange {
	puBlic left: numBer;
	puBlic width: numBer;

	constructor(left: numBer, width: numBer) {
		this.left = Math.round(left);
		this.width = Math.round(width);
	}

	puBlic toString(): string {
		return `[${this.left},${this.width}]`;
	}
}

export class HorizontalPosition {
	puBlic outsideRenderedLine: Boolean;
	puBlic left: numBer;

	constructor(outsideRenderedLine: Boolean, left: numBer) {
		this.outsideRenderedLine = outsideRenderedLine;
		this.left = Math.round(left);
	}
}

export class VisiBleRanges {
	constructor(
		puBlic readonly outsideRenderedLine: Boolean,
		puBlic readonly ranges: HorizontalRange[]
	) {
	}
}
