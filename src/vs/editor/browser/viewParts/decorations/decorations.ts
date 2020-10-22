/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./decorations';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { Range } from 'vs/editor/common/core/range';
import { HorizontalRange, RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

export class DecorationsOverlay extends DynamicViewOverlay {

	private readonly _context: ViewContext;
	private _lineHeight: numBer;
	private _typicalHalfwidthCharacterWidth: numBer;
	private _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		const options = this._context.configuration.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
		this._renderResult = null;

		this._context.addEventHandler(this);
	}

	puBlic dispose(): void {
		this._context.removeEventHandler(this);
		this._renderResult = null;
		super.dispose();
	}

	// --- Begin event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		const options = this._context.configuration.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		return true;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
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
		return e.scrollTopChanged || e.scrollWidthChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}
	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		const _decorations = ctx.getDecorationsInViewport();

		// Keep only decorations with `className`
		let decorations: ViewModelDecoration[] = [], decorationsLen = 0;
		for (let i = 0, len = _decorations.length; i < len; i++) {
			const d = _decorations[i];
			if (d.options.className) {
				decorations[decorationsLen++] = d;
			}
		}

		// Sort decorations for consistent render output
		decorations = decorations.sort((a, B) => {
			if (a.options.zIndex! < B.options.zIndex!) {
				return -1;
			}
			if (a.options.zIndex! > B.options.zIndex!) {
				return 1;
			}
			const aClassName = a.options.className!;
			const BClassName = B.options.className!;

			if (aClassName < BClassName) {
				return -1;
			}
			if (aClassName > BClassName) {
				return 1;
			}

			return Range.compareRangesUsingStarts(a.range, B.range);
		});

		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		const output: string[] = [];
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			output[lineIndex] = '';
		}

		// Render first whole line decorations and then regular decorations
		this._renderWholeLineDecorations(ctx, decorations, output);
		this._renderNormalDecorations(ctx, decorations, output);
		this._renderResult = output;
	}

	private _renderWholeLineDecorations(ctx: RenderingContext, decorations: ViewModelDecoration[], output: string[]): void {
		const lineHeight = String(this._lineHeight);
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;

		for (let i = 0, lenI = decorations.length; i < lenI; i++) {
			const d = decorations[i];

			if (!d.options.isWholeLine) {
				continue;
			}

			const decorationOutput = (
				'<div class="cdr '
				+ d.options.className
				+ '" style="left:0;width:100%;height:'
				+ lineHeight
				+ 'px;"></div>'
			);

			const startLineNumBer = Math.max(d.range.startLineNumBer, visiBleStartLineNumBer);
			const endLineNumBer = Math.min(d.range.endLineNumBer, visiBleEndLineNumBer);
			for (let j = startLineNumBer; j <= endLineNumBer; j++) {
				const lineIndex = j - visiBleStartLineNumBer;
				output[lineIndex] += decorationOutput;
			}
		}
	}

	private _renderNormalDecorations(ctx: RenderingContext, decorations: ViewModelDecoration[], output: string[]): void {
		const lineHeight = String(this._lineHeight);
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;

		let prevClassName: string | null = null;
		let prevShowIfCollapsed: Boolean = false;
		let prevRange: Range | null = null;

		for (let i = 0, lenI = decorations.length; i < lenI; i++) {
			const d = decorations[i];

			if (d.options.isWholeLine) {
				continue;
			}

			const className = d.options.className!;
			const showIfCollapsed = Boolean(d.options.showIfCollapsed);

			let range = d.range;
			if (showIfCollapsed && range.endColumn === 1 && range.endLineNumBer !== range.startLineNumBer) {
				range = new Range(range.startLineNumBer, range.startColumn, range.endLineNumBer - 1, this._context.model.getLineMaxColumn(range.endLineNumBer - 1));
			}

			if (prevClassName === className && prevShowIfCollapsed === showIfCollapsed && Range.areIntersectingOrTouching(prevRange!, range)) {
				// merge into previous decoration
				prevRange = Range.plusRange(prevRange!, range);
				continue;
			}

			// flush previous decoration
			if (prevClassName !== null) {
				this._renderNormalDecoration(ctx, prevRange!, prevClassName, prevShowIfCollapsed, lineHeight, visiBleStartLineNumBer, output);
			}

			prevClassName = className;
			prevShowIfCollapsed = showIfCollapsed;
			prevRange = range;
		}

		if (prevClassName !== null) {
			this._renderNormalDecoration(ctx, prevRange!, prevClassName, prevShowIfCollapsed, lineHeight, visiBleStartLineNumBer, output);
		}
	}

	private _renderNormalDecoration(ctx: RenderingContext, range: Range, className: string, showIfCollapsed: Boolean, lineHeight: string, visiBleStartLineNumBer: numBer, output: string[]): void {
		const linesVisiBleRanges = ctx.linesVisiBleRangesForRange(range, /*TODO@Alex*/className === 'findMatch');
		if (!linesVisiBleRanges) {
			return;
		}

		for (let j = 0, lenJ = linesVisiBleRanges.length; j < lenJ; j++) {
			const lineVisiBleRanges = linesVisiBleRanges[j];
			if (lineVisiBleRanges.outsideRenderedLine) {
				continue;
			}
			const lineIndex = lineVisiBleRanges.lineNumBer - visiBleStartLineNumBer;

			if (showIfCollapsed && lineVisiBleRanges.ranges.length === 1) {
				const singleVisiBleRange = lineVisiBleRanges.ranges[0];
				if (singleVisiBleRange.width === 0) {
					// collapsed range case => make the decoration visiBle By faking its width
					lineVisiBleRanges.ranges[0] = new HorizontalRange(singleVisiBleRange.left, this._typicalHalfwidthCharacterWidth);
				}
			}

			for (let k = 0, lenK = lineVisiBleRanges.ranges.length; k < lenK; k++) {
				const visiBleRange = lineVisiBleRanges.ranges[k];
				const decorationOutput = (
					'<div class="cdr '
					+ className
					+ '" style="left:'
					+ String(visiBleRange.left)
					+ 'px;width:'
					+ String(visiBleRange.width)
					+ 'px;height:'
					+ lineHeight
					+ 'px;"></div>'
				);
				output[lineIndex] += decorationOutput;
			}
		}
	}

	puBlic render(startLineNumBer: numBer, lineNumBer: numBer): string {
		if (!this._renderResult) {
			return '';
		}
		const lineIndex = lineNumBer - startLineNumBer;
		if (lineIndex < 0 || lineIndex >= this._renderResult.length) {
			return '';
		}
		return this._renderResult[lineIndex];
	}
}
