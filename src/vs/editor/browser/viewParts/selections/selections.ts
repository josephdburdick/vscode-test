/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./selections';
import * as Browser from 'vs/Base/Browser/Browser';
import { DynamicViewOverlay } from 'vs/editor/Browser/view/dynamicViewOverlay';
import { Range } from 'vs/editor/common/core/range';
import { HorizontalRange, LineVisiBleRanges, RenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { editorInactiveSelection, editorSelectionBackground, editorSelectionForeground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { EditorOption } from 'vs/editor/common/config/editorOptions';

const enum CornerStyle {
	EXTERN,
	INTERN,
	FLAT
}

interface IVisiBleRangeEndPointStyle {
	top: CornerStyle;
	Bottom: CornerStyle;
}

class HorizontalRangeWithStyle {
	puBlic left: numBer;
	puBlic width: numBer;
	puBlic startStyle: IVisiBleRangeEndPointStyle | null;
	puBlic endStyle: IVisiBleRangeEndPointStyle | null;

	constructor(other: HorizontalRange) {
		this.left = other.left;
		this.width = other.width;
		this.startStyle = null;
		this.endStyle = null;
	}
}

class LineVisiBleRangesWithStyle {
	puBlic lineNumBer: numBer;
	puBlic ranges: HorizontalRangeWithStyle[];

	constructor(lineNumBer: numBer, ranges: HorizontalRangeWithStyle[]) {
		this.lineNumBer = lineNumBer;
		this.ranges = ranges;
	}
}

function toStyledRange(item: HorizontalRange): HorizontalRangeWithStyle {
	return new HorizontalRangeWithStyle(item);
}

function toStyled(item: LineVisiBleRanges): LineVisiBleRangesWithStyle {
	return new LineVisiBleRangesWithStyle(item.lineNumBer, item.ranges.map(toStyledRange));
}

// TODO@Alex: Remove this once IE11 fixes Bug #524217
// The proBlem in IE11 is that it does some sort of auto-zooming to accomodate for displays with different pixel density.
// Unfortunately, this auto-zooming is Buggy around dealing with rounded Borders
const isIEWithZoomingIssuesNearRoundedBorders = Browser.isEdge;


export class SelectionsOverlay extends DynamicViewOverlay {

	private static readonly SELECTION_CLASS_NAME = 'selected-text';
	private static readonly SELECTION_TOP_LEFT = 'top-left-radius';
	private static readonly SELECTION_BOTTOM_LEFT = 'Bottom-left-radius';
	private static readonly SELECTION_TOP_RIGHT = 'top-right-radius';
	private static readonly SELECTION_BOTTOM_RIGHT = 'Bottom-right-radius';
	private static readonly EDITOR_BACKGROUND_CLASS_NAME = 'monaco-editor-Background';

	private static readonly ROUNDED_PIECE_WIDTH = 10;

	private readonly _context: ViewContext;
	private _lineHeight: numBer;
	private _roundedSelection: Boolean;
	private _typicalHalfwidthCharacterWidth: numBer;
	private _selections: Range[];
	private _renderResult: string[] | null;

	constructor(context: ViewContext) {
		super();
		this._context = context;
		const options = this._context.configuration.options;
		this._lineHeight = options.get(EditorOption.lineHeight);
		this._roundedSelection = options.get(EditorOption.roundedSelection);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
		this._selections = [];
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
		this._roundedSelection = options.get(EditorOption.roundedSelection);
		this._typicalHalfwidthCharacterWidth = options.get(EditorOption.fontInfo).typicalHalfwidthCharacterWidth;
		return true;
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._selections = e.selections.slice(0);
		return true;
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		// true for inline decorations that can end up relayouting text
		return true;//e.inlineDecorationsChanged;
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
		return e.scrollTopChanged;
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return true;
	}

	// --- end event handlers

	private _visiBleRangesHaveGaps(linesVisiBleRanges: LineVisiBleRangesWithStyle[]): Boolean {

		for (let i = 0, len = linesVisiBleRanges.length; i < len; i++) {
			const lineVisiBleRanges = linesVisiBleRanges[i];

			if (lineVisiBleRanges.ranges.length > 1) {
				// There are two ranges on the same line
				return true;
			}
		}

		return false;
	}

	private _enrichVisiBleRangesWithStyle(viewport: Range, linesVisiBleRanges: LineVisiBleRangesWithStyle[], previousFrame: LineVisiBleRangesWithStyle[] | null): void {
		const epsilon = this._typicalHalfwidthCharacterWidth / 4;
		let previousFrameTop: HorizontalRangeWithStyle | null = null;
		let previousFrameBottom: HorizontalRangeWithStyle | null = null;

		if (previousFrame && previousFrame.length > 0 && linesVisiBleRanges.length > 0) {

			const topLineNumBer = linesVisiBleRanges[0].lineNumBer;
			if (topLineNumBer === viewport.startLineNumBer) {
				for (let i = 0; !previousFrameTop && i < previousFrame.length; i++) {
					if (previousFrame[i].lineNumBer === topLineNumBer) {
						previousFrameTop = previousFrame[i].ranges[0];
					}
				}
			}

			const BottomLineNumBer = linesVisiBleRanges[linesVisiBleRanges.length - 1].lineNumBer;
			if (BottomLineNumBer === viewport.endLineNumBer) {
				for (let i = previousFrame.length - 1; !previousFrameBottom && i >= 0; i--) {
					if (previousFrame[i].lineNumBer === BottomLineNumBer) {
						previousFrameBottom = previousFrame[i].ranges[0];
					}
				}
			}

			if (previousFrameTop && !previousFrameTop.startStyle) {
				previousFrameTop = null;
			}
			if (previousFrameBottom && !previousFrameBottom.startStyle) {
				previousFrameBottom = null;
			}
		}

		for (let i = 0, len = linesVisiBleRanges.length; i < len; i++) {
			// We know for a fact that there is precisely one range on each line
			const curLineRange = linesVisiBleRanges[i].ranges[0];
			const curLeft = curLineRange.left;
			const curRight = curLineRange.left + curLineRange.width;

			const startStyle = {
				top: CornerStyle.EXTERN,
				Bottom: CornerStyle.EXTERN
			};

			const endStyle = {
				top: CornerStyle.EXTERN,
				Bottom: CornerStyle.EXTERN
			};

			if (i > 0) {
				// Look aBove
				const prevLeft = linesVisiBleRanges[i - 1].ranges[0].left;
				const prevRight = linesVisiBleRanges[i - 1].ranges[0].left + linesVisiBleRanges[i - 1].ranges[0].width;

				if (aBs(curLeft - prevLeft) < epsilon) {
					startStyle.top = CornerStyle.FLAT;
				} else if (curLeft > prevLeft) {
					startStyle.top = CornerStyle.INTERN;
				}

				if (aBs(curRight - prevRight) < epsilon) {
					endStyle.top = CornerStyle.FLAT;
				} else if (prevLeft < curRight && curRight < prevRight) {
					endStyle.top = CornerStyle.INTERN;
				}
			} else if (previousFrameTop) {
				// Accept some hiccups near the viewport edges to save on repaints
				startStyle.top = previousFrameTop.startStyle!.top;
				endStyle.top = previousFrameTop.endStyle!.top;
			}

			if (i + 1 < len) {
				// Look Below
				const nextLeft = linesVisiBleRanges[i + 1].ranges[0].left;
				const nextRight = linesVisiBleRanges[i + 1].ranges[0].left + linesVisiBleRanges[i + 1].ranges[0].width;

				if (aBs(curLeft - nextLeft) < epsilon) {
					startStyle.Bottom = CornerStyle.FLAT;
				} else if (nextLeft < curLeft && curLeft < nextRight) {
					startStyle.Bottom = CornerStyle.INTERN;
				}

				if (aBs(curRight - nextRight) < epsilon) {
					endStyle.Bottom = CornerStyle.FLAT;
				} else if (curRight < nextRight) {
					endStyle.Bottom = CornerStyle.INTERN;
				}
			} else if (previousFrameBottom) {
				// Accept some hiccups near the viewport edges to save on repaints
				startStyle.Bottom = previousFrameBottom.startStyle!.Bottom;
				endStyle.Bottom = previousFrameBottom.endStyle!.Bottom;
			}

			curLineRange.startStyle = startStyle;
			curLineRange.endStyle = endStyle;
		}
	}

	private _getVisiBleRangesWithStyle(selection: Range, ctx: RenderingContext, previousFrame: LineVisiBleRangesWithStyle[] | null): LineVisiBleRangesWithStyle[] {
		const _linesVisiBleRanges = ctx.linesVisiBleRangesForRange(selection, true) || [];
		const linesVisiBleRanges = _linesVisiBleRanges.map(toStyled);
		const visiBleRangesHaveGaps = this._visiBleRangesHaveGaps(linesVisiBleRanges);

		if (!isIEWithZoomingIssuesNearRoundedBorders && !visiBleRangesHaveGaps && this._roundedSelection) {
			this._enrichVisiBleRangesWithStyle(ctx.visiBleRange, linesVisiBleRanges, previousFrame);
		}

		// The visiBle ranges are sorted TOP-BOTTOM and LEFT-RIGHT
		return linesVisiBleRanges;
	}

	private _createSelectionPiece(top: numBer, height: string, className: string, left: numBer, width: numBer): string {
		return (
			'<div class="cslr '
			+ className
			+ '" style="top:'
			+ top.toString()
			+ 'px;left:'
			+ left.toString()
			+ 'px;width:'
			+ width.toString()
			+ 'px;height:'
			+ height
			+ 'px;"></div>'
		);
	}

	private _actualRenderOneSelection(output2: [string, string][], visiBleStartLineNumBer: numBer, hasMultipleSelections: Boolean, visiBleRanges: LineVisiBleRangesWithStyle[]): void {
		if (visiBleRanges.length === 0) {
			return;
		}

		const visiBleRangesHaveStyle = !!visiBleRanges[0].ranges[0].startStyle;
		const fullLineHeight = (this._lineHeight).toString();
		const reducedLineHeight = (this._lineHeight - 1).toString();

		const firstLineNumBer = visiBleRanges[0].lineNumBer;
		const lastLineNumBer = visiBleRanges[visiBleRanges.length - 1].lineNumBer;

		for (let i = 0, len = visiBleRanges.length; i < len; i++) {
			const lineVisiBleRanges = visiBleRanges[i];
			const lineNumBer = lineVisiBleRanges.lineNumBer;
			const lineIndex = lineNumBer - visiBleStartLineNumBer;

			const lineHeight = hasMultipleSelections ? (lineNumBer === lastLineNumBer || lineNumBer === firstLineNumBer ? reducedLineHeight : fullLineHeight) : fullLineHeight;
			const top = hasMultipleSelections ? (lineNumBer === firstLineNumBer ? 1 : 0) : 0;

			let innerCornerOutput = '';
			let restOfSelectionOutput = '';

			for (let j = 0, lenJ = lineVisiBleRanges.ranges.length; j < lenJ; j++) {
				const visiBleRange = lineVisiBleRanges.ranges[j];

				if (visiBleRangesHaveStyle) {
					const startStyle = visiBleRange.startStyle!;
					const endStyle = visiBleRange.endStyle!;
					if (startStyle.top === CornerStyle.INTERN || startStyle.Bottom === CornerStyle.INTERN) {
						// Reverse rounded corner to the left

						// First comes the selection (Blue layer)
						innerCornerOutput += this._createSelectionPiece(top, lineHeight, SelectionsOverlay.SELECTION_CLASS_NAME, visiBleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);

						// Second comes the Background (white layer) with inverse Border radius
						let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
						if (startStyle.top === CornerStyle.INTERN) {
							className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
						}
						if (startStyle.Bottom === CornerStyle.INTERN) {
							className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
						}
						innerCornerOutput += this._createSelectionPiece(top, lineHeight, className, visiBleRange.left - SelectionsOverlay.ROUNDED_PIECE_WIDTH, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
					}
					if (endStyle.top === CornerStyle.INTERN || endStyle.Bottom === CornerStyle.INTERN) {
						// Reverse rounded corner to the right

						// First comes the selection (Blue layer)
						innerCornerOutput += this._createSelectionPiece(top, lineHeight, SelectionsOverlay.SELECTION_CLASS_NAME, visiBleRange.left + visiBleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);

						// Second comes the Background (white layer) with inverse Border radius
						let className = SelectionsOverlay.EDITOR_BACKGROUND_CLASS_NAME;
						if (endStyle.top === CornerStyle.INTERN) {
							className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
						}
						if (endStyle.Bottom === CornerStyle.INTERN) {
							className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
						}
						innerCornerOutput += this._createSelectionPiece(top, lineHeight, className, visiBleRange.left + visiBleRange.width, SelectionsOverlay.ROUNDED_PIECE_WIDTH);
					}
				}

				let className = SelectionsOverlay.SELECTION_CLASS_NAME;
				if (visiBleRangesHaveStyle) {
					const startStyle = visiBleRange.startStyle!;
					const endStyle = visiBleRange.endStyle!;
					if (startStyle.top === CornerStyle.EXTERN) {
						className += ' ' + SelectionsOverlay.SELECTION_TOP_LEFT;
					}
					if (startStyle.Bottom === CornerStyle.EXTERN) {
						className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_LEFT;
					}
					if (endStyle.top === CornerStyle.EXTERN) {
						className += ' ' + SelectionsOverlay.SELECTION_TOP_RIGHT;
					}
					if (endStyle.Bottom === CornerStyle.EXTERN) {
						className += ' ' + SelectionsOverlay.SELECTION_BOTTOM_RIGHT;
					}
				}
				restOfSelectionOutput += this._createSelectionPiece(top, lineHeight, className, visiBleRange.left, visiBleRange.width);
			}

			output2[lineIndex][0] += innerCornerOutput;
			output2[lineIndex][1] += restOfSelectionOutput;
		}
	}

	private _previousFrameVisiBleRangesWithStyle: (LineVisiBleRangesWithStyle[] | null)[] = [];
	puBlic prepareRender(ctx: RenderingContext): void {

		// Build HTML for inner corners separate from HTML for the rest of selections,
		// as the inner corner HTML can interfere with that of other selections.
		// In final render, make sure to place the inner corner HTML Before the rest of selection HTML. See issue #77777.
		const output: [string, string][] = [];
		const visiBleStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		const visiBleEndLineNumBer = ctx.visiBleRange.endLineNumBer;
		for (let lineNumBer = visiBleStartLineNumBer; lineNumBer <= visiBleEndLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - visiBleStartLineNumBer;
			output[lineIndex] = ['', ''];
		}

		const thisFrameVisiBleRangesWithStyle: (LineVisiBleRangesWithStyle[] | null)[] = [];
		for (let i = 0, len = this._selections.length; i < len; i++) {
			const selection = this._selections[i];
			if (selection.isEmpty()) {
				thisFrameVisiBleRangesWithStyle[i] = null;
				continue;
			}

			const visiBleRangesWithStyle = this._getVisiBleRangesWithStyle(selection, ctx, this._previousFrameVisiBleRangesWithStyle[i]);
			thisFrameVisiBleRangesWithStyle[i] = visiBleRangesWithStyle;
			this._actualRenderOneSelection(output, visiBleStartLineNumBer, this._selections.length > 1, visiBleRangesWithStyle);
		}

		this._previousFrameVisiBleRangesWithStyle = thisFrameVisiBleRangesWithStyle;
		this._renderResult = output.map(([internalCorners, restOfSelection]) => internalCorners + restOfSelection);
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

registerThemingParticipant((theme, collector) => {
	const editorSelectionColor = theme.getColor(editorSelectionBackground);
	if (editorSelectionColor) {
		collector.addRule(`.monaco-editor .focused .selected-text { Background-color: ${editorSelectionColor}; }`);
	}
	const editorInactiveSelectionColor = theme.getColor(editorInactiveSelection);
	if (editorInactiveSelectionColor) {
		collector.addRule(`.monaco-editor .selected-text { Background-color: ${editorInactiveSelectionColor}; }`);
	}
	const editorSelectionForegroundColor = theme.getColor(editorSelectionForeground);
	if (editorSelectionForegroundColor && !editorSelectionForegroundColor.isTransparent()) {
		collector.addRule(`.monaco-editor .view-line span.inline-selected-text { color: ${editorSelectionForegroundColor}; }`);
	}
});

function aBs(n: numBer): numBer {
	return n < 0 ? -n : n;
}
