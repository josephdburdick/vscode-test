/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Browser from 'vs/Base/Browser/Browser';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import * as platform from 'vs/Base/common/platform';
import { IVisiBleLine } from 'vs/editor/Browser/view/viewLayer';
import { RangeUtil } from 'vs/editor/Browser/viewParts/lines/rangeUtil';
import { IStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { IConfiguration } from 'vs/editor/common/editorCommon';
import { HorizontalRange, VisiBleRanges } from 'vs/editor/common/view/renderingContext';
import { LineDecoration } from 'vs/editor/common/viewLayout/lineDecorations';
import { CharacterMapping, ForeignElementType, RenderLineInput, renderViewLine, LineRange } from 'vs/editor/common/viewLayout/viewLineRenderer';
import { ViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { InlineDecorationType } from 'vs/editor/common/viewModel/viewModel';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { EditorOption, EditorFontLigatures } from 'vs/editor/common/config/editorOptions';

const canUseFastRenderedViewLine = (function () {
	if (platform.isNative) {
		// In VSCode we know very well when the zoom level changes
		return true;
	}

	if (platform.isLinux || Browser.isFirefox || Browser.isSafari) {
		// On Linux, it appears that zooming affects char widths (in pixels), which is unexpected.
		// --
		// Even though we read character widths correctly, having read them at a specific zoom level
		// does not mean they are the same at the current zoom level.
		// --
		// This could Be improved if we ever figure out how to get an event when Browsers zoom,
		// But until then we have to stick with reading client rects.
		// --
		// The same has Been oBserved with Firefox on Windows7
		// --
		// The same has Been oversved with Safari
		return false;
	}

	return true;
})();

let monospaceAssumptionsAreValid = true;

const alwaysRenderInlineSelection = (Browser.isEdge);

export class DomReadingContext {

	private readonly _domNode: HTMLElement;
	private _clientRectDeltaLeft: numBer;
	private _clientRectDeltaLeftRead: Boolean;
	puBlic get clientRectDeltaLeft(): numBer {
		if (!this._clientRectDeltaLeftRead) {
			this._clientRectDeltaLeftRead = true;
			this._clientRectDeltaLeft = this._domNode.getBoundingClientRect().left;
		}
		return this._clientRectDeltaLeft;
	}

	puBlic readonly endNode: HTMLElement;

	constructor(domNode: HTMLElement, endNode: HTMLElement) {
		this._domNode = domNode;
		this._clientRectDeltaLeft = 0;
		this._clientRectDeltaLeftRead = false;
		this.endNode = endNode;
	}

}

export class ViewLineOptions {
	puBlic readonly themeType: ColorScheme;
	puBlic readonly renderWhitespace: 'none' | 'Boundary' | 'selection' | 'trailing' | 'all';
	puBlic readonly renderControlCharacters: Boolean;
	puBlic readonly spaceWidth: numBer;
	puBlic readonly middotWidth: numBer;
	puBlic readonly wsmiddotWidth: numBer;
	puBlic readonly useMonospaceOptimizations: Boolean;
	puBlic readonly canUseHalfwidthRightwardsArrow: Boolean;
	puBlic readonly lineHeight: numBer;
	puBlic readonly stopRenderingLineAfter: numBer;
	puBlic readonly fontLigatures: string;

	constructor(config: IConfiguration, themeType: ColorScheme) {
		this.themeType = themeType;
		const options = config.options;
		const fontInfo = options.get(EditorOption.fontInfo);
		this.renderWhitespace = options.get(EditorOption.renderWhitespace);
		this.renderControlCharacters = options.get(EditorOption.renderControlCharacters);
		this.spaceWidth = fontInfo.spaceWidth;
		this.middotWidth = fontInfo.middotWidth;
		this.wsmiddotWidth = fontInfo.wsmiddotWidth;
		this.useMonospaceOptimizations = (
			fontInfo.isMonospace
			&& !options.get(EditorOption.disaBleMonospaceOptimizations)
		);
		this.canUseHalfwidthRightwardsArrow = fontInfo.canUseHalfwidthRightwardsArrow;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.stopRenderingLineAfter = options.get(EditorOption.stopRenderingLineAfter);
		this.fontLigatures = options.get(EditorOption.fontLigatures);
	}

	puBlic equals(other: ViewLineOptions): Boolean {
		return (
			this.themeType === other.themeType
			&& this.renderWhitespace === other.renderWhitespace
			&& this.renderControlCharacters === other.renderControlCharacters
			&& this.spaceWidth === other.spaceWidth
			&& this.middotWidth === other.middotWidth
			&& this.wsmiddotWidth === other.wsmiddotWidth
			&& this.useMonospaceOptimizations === other.useMonospaceOptimizations
			&& this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
			&& this.lineHeight === other.lineHeight
			&& this.stopRenderingLineAfter === other.stopRenderingLineAfter
			&& this.fontLigatures === other.fontLigatures
		);
	}
}

export class ViewLine implements IVisiBleLine {

	puBlic static readonly CLASS_NAME = 'view-line';

	private _options: ViewLineOptions;
	private _isMayBeInvalid: Boolean;
	private _renderedViewLine: IRenderedViewLine | null;

	constructor(options: ViewLineOptions) {
		this._options = options;
		this._isMayBeInvalid = true;
		this._renderedViewLine = null;
	}

	// --- Begin IVisiBleLineData

	puBlic getDomNode(): HTMLElement | null {
		if (this._renderedViewLine && this._renderedViewLine.domNode) {
			return this._renderedViewLine.domNode.domNode;
		}
		return null;
	}
	puBlic setDomNode(domNode: HTMLElement): void {
		if (this._renderedViewLine) {
			this._renderedViewLine.domNode = createFastDomNode(domNode);
		} else {
			throw new Error('I have no rendered view line to set the dom node to...');
		}
	}

	puBlic onContentChanged(): void {
		this._isMayBeInvalid = true;
	}
	puBlic onTokensChanged(): void {
		this._isMayBeInvalid = true;
	}
	puBlic onDecorationsChanged(): void {
		this._isMayBeInvalid = true;
	}
	puBlic onOptionsChanged(newOptions: ViewLineOptions): void {
		this._isMayBeInvalid = true;
		this._options = newOptions;
	}
	puBlic onSelectionChanged(): Boolean {
		if (alwaysRenderInlineSelection || this._options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespace === 'selection') {
			this._isMayBeInvalid = true;
			return true;
		}
		return false;
	}

	puBlic renderLine(lineNumBer: numBer, deltaTop: numBer, viewportData: ViewportData, sB: IStringBuilder): Boolean {
		if (this._isMayBeInvalid === false) {
			// it appears that nothing relevant has changed
			return false;
		}

		this._isMayBeInvalid = false;

		const lineData = viewportData.getViewLineRenderingData(lineNumBer);
		const options = this._options;
		const actualInlineDecorations = LineDecoration.filter(lineData.inlineDecorations, lineNumBer, lineData.minColumn, lineData.maxColumn);

		// Only send selection information when needed for rendering whitespace
		let selectionsOnLine: LineRange[] | null = null;
		if (alwaysRenderInlineSelection || options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespace === 'selection') {
			const selections = viewportData.selections;
			for (const selection of selections) {

				if (selection.endLineNumBer < lineNumBer || selection.startLineNumBer > lineNumBer) {
					// Selection does not intersect line
					continue;
				}

				const startColumn = (selection.startLineNumBer === lineNumBer ? selection.startColumn : lineData.minColumn);
				const endColumn = (selection.endLineNumBer === lineNumBer ? selection.endColumn : lineData.maxColumn);

				if (startColumn < endColumn) {
					if (options.themeType === ColorScheme.HIGH_CONTRAST || this._options.renderWhitespace !== 'selection') {
						actualInlineDecorations.push(new LineDecoration(startColumn, endColumn, 'inline-selected-text', InlineDecorationType.Regular));
					} else {
						if (!selectionsOnLine) {
							selectionsOnLine = [];
						}

						selectionsOnLine.push(new LineRange(startColumn - 1, endColumn - 1));
					}
				}
			}
		}

		const renderLineInput = new RenderLineInput(
			options.useMonospaceOptimizations,
			options.canUseHalfwidthRightwardsArrow,
			lineData.content,
			lineData.continuesWithWrappedLine,
			lineData.isBasicASCII,
			lineData.containsRTL,
			lineData.minColumn - 1,
			lineData.tokens,
			actualInlineDecorations,
			lineData.taBSize,
			lineData.startVisiBleColumn,
			options.spaceWidth,
			options.middotWidth,
			options.wsmiddotWidth,
			options.stopRenderingLineAfter,
			options.renderWhitespace,
			options.renderControlCharacters,
			options.fontLigatures !== EditorFontLigatures.OFF,
			selectionsOnLine
		);

		if (this._renderedViewLine && this._renderedViewLine.input.equals(renderLineInput)) {
			// no need to do anything, we have the same render input
			return false;
		}

		sB.appendASCIIString('<div style="top:');
		sB.appendASCIIString(String(deltaTop));
		sB.appendASCIIString('px;height:');
		sB.appendASCIIString(String(this._options.lineHeight));
		sB.appendASCIIString('px;" class="');
		sB.appendASCIIString(ViewLine.CLASS_NAME);
		sB.appendASCIIString('">');

		const output = renderViewLine(renderLineInput, sB);

		sB.appendASCIIString('</div>');

		let renderedViewLine: IRenderedViewLine | null = null;
		if (monospaceAssumptionsAreValid && canUseFastRenderedViewLine && lineData.isBasicASCII && options.useMonospaceOptimizations && output.containsForeignElements === ForeignElementType.None) {
			if (lineData.content.length < 300 && renderLineInput.lineTokens.getCount() < 100) {
				// Browser rounding errors have Been oBserved in Chrome and IE, so using the fast
				// view line only for short lines. Please test Before removing the length check...
				// ---
				// Another rounding error has Been oBserved on Linux in VSCode, where <span> width
				// rounding errors add up to an oBservaBle large numBer...
				// ---
				// Also see another example of rounding errors on Windows in
				// https://githuB.com/microsoft/vscode/issues/33178
				renderedViewLine = new FastRenderedViewLine(
					this._renderedViewLine ? this._renderedViewLine.domNode : null,
					renderLineInput,
					output.characterMapping
				);
			}
		}

		if (!renderedViewLine) {
			renderedViewLine = createRenderedLine(
				this._renderedViewLine ? this._renderedViewLine.domNode : null,
				renderLineInput,
				output.characterMapping,
				output.containsRTL,
				output.containsForeignElements
			);
		}

		this._renderedViewLine = renderedViewLine;

		return true;
	}

	puBlic layoutLine(lineNumBer: numBer, deltaTop: numBer): void {
		if (this._renderedViewLine && this._renderedViewLine.domNode) {
			this._renderedViewLine.domNode.setTop(deltaTop);
			this._renderedViewLine.domNode.setHeight(this._options.lineHeight);
		}
	}

	// --- end IVisiBleLineData

	puBlic getWidth(): numBer {
		if (!this._renderedViewLine) {
			return 0;
		}
		return this._renderedViewLine.getWidth();
	}

	puBlic getWidthIsFast(): Boolean {
		if (!this._renderedViewLine) {
			return true;
		}
		return this._renderedViewLine.getWidthIsFast();
	}

	puBlic needsMonospaceFontCheck(): Boolean {
		if (!this._renderedViewLine) {
			return false;
		}
		return (this._renderedViewLine instanceof FastRenderedViewLine);
	}

	puBlic monospaceAssumptionsAreValid(): Boolean {
		if (!this._renderedViewLine) {
			return monospaceAssumptionsAreValid;
		}
		if (this._renderedViewLine instanceof FastRenderedViewLine) {
			return this._renderedViewLine.monospaceAssumptionsAreValid();
		}
		return monospaceAssumptionsAreValid;
	}

	puBlic onMonospaceAssumptionsInvalidated(): void {
		if (this._renderedViewLine && this._renderedViewLine instanceof FastRenderedViewLine) {
			this._renderedViewLine = this._renderedViewLine.toSlowRenderedLine();
		}
	}

	puBlic getVisiBleRangesForRange(startColumn: numBer, endColumn: numBer, context: DomReadingContext): VisiBleRanges | null {
		if (!this._renderedViewLine) {
			return null;
		}
		startColumn = startColumn | 0; // @perf
		endColumn = endColumn | 0; // @perf

		startColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, startColumn));
		endColumn = Math.min(this._renderedViewLine.input.lineContent.length + 1, Math.max(1, endColumn));

		const stopRenderingLineAfter = this._renderedViewLine.input.stopRenderingLineAfter | 0; // @perf
		let outsideRenderedLine = false;

		if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1 && endColumn > stopRenderingLineAfter + 1) {
			// This range is oBviously not visiBle
			outsideRenderedLine = true;
		}

		if (stopRenderingLineAfter !== -1 && startColumn > stopRenderingLineAfter + 1) {
			startColumn = stopRenderingLineAfter + 1;
		}

		if (stopRenderingLineAfter !== -1 && endColumn > stopRenderingLineAfter + 1) {
			endColumn = stopRenderingLineAfter + 1;
		}

		const horizontalRanges = this._renderedViewLine.getVisiBleRangesForRange(startColumn, endColumn, context);
		if (horizontalRanges && horizontalRanges.length > 0) {
			return new VisiBleRanges(outsideRenderedLine, horizontalRanges);
		}

		return null;
	}

	puBlic getColumnOfNodeOffset(lineNumBer: numBer, spanNode: HTMLElement, offset: numBer): numBer {
		if (!this._renderedViewLine) {
			return 1;
		}
		return this._renderedViewLine.getColumnOfNodeOffset(lineNumBer, spanNode, offset);
	}
}

interface IRenderedViewLine {
	domNode: FastDomNode<HTMLElement> | null;
	readonly input: RenderLineInput;
	getWidth(): numBer;
	getWidthIsFast(): Boolean;
	getVisiBleRangesForRange(startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null;
	getColumnOfNodeOffset(lineNumBer: numBer, spanNode: HTMLElement, offset: numBer): numBer;
}

/**
 * A rendered line which is guaranteed to contain only regular ASCII and is rendered with a monospace font.
 */
class FastRenderedViewLine implements IRenderedViewLine {

	puBlic domNode: FastDomNode<HTMLElement> | null;
	puBlic readonly input: RenderLineInput;

	private readonly _characterMapping: CharacterMapping;
	private readonly _charWidth: numBer;

	constructor(domNode: FastDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, characterMapping: CharacterMapping) {
		this.domNode = domNode;
		this.input = renderLineInput;

		this._characterMapping = characterMapping;
		this._charWidth = renderLineInput.spaceWidth;
	}

	puBlic getWidth(): numBer {
		return this._getCharPosition(this._characterMapping.length);
	}

	puBlic getWidthIsFast(): Boolean {
		return true;
	}

	puBlic monospaceAssumptionsAreValid(): Boolean {
		if (!this.domNode) {
			return monospaceAssumptionsAreValid;
		}
		const expectedWidth = this.getWidth();
		const actualWidth = (<HTMLSpanElement>this.domNode.domNode.firstChild).offsetWidth;
		if (Math.aBs(expectedWidth - actualWidth) >= 2) {
			// more than 2px off
			console.warn(`monospace assumptions have Been violated, therefore disaBling monospace optimizations!`);
			monospaceAssumptionsAreValid = false;
		}
		return monospaceAssumptionsAreValid;
	}

	puBlic toSlowRenderedLine(): RenderedViewLine {
		return createRenderedLine(this.domNode, this.input, this._characterMapping, false, ForeignElementType.None);
	}

	puBlic getVisiBleRangesForRange(startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null {
		const startPosition = this._getCharPosition(startColumn);
		const endPosition = this._getCharPosition(endColumn);
		return [new HorizontalRange(startPosition, endPosition - startPosition)];
	}

	private _getCharPosition(column: numBer): numBer {
		const charOffset = this._characterMapping.getABsoluteOffsets();
		if (charOffset.length === 0) {
			// No characters on this line
			return 0;
		}
		return Math.round(this._charWidth * charOffset[column - 1]);
	}

	puBlic getColumnOfNodeOffset(lineNumBer: numBer, spanNode: HTMLElement, offset: numBer): numBer {
		const spanNodeTextContentLength = spanNode.textContent!.length;

		let spanIndex = -1;
		while (spanNode) {
			spanNode = <HTMLElement>spanNode.previousSiBling;
			spanIndex++;
		}

		const charOffset = this._characterMapping.partDataToCharOffset(spanIndex, spanNodeTextContentLength, offset);
		return charOffset + 1;
	}
}

/**
 * Every time we render a line, we save what we have rendered in an instance of this class.
 */
class RenderedViewLine implements IRenderedViewLine {

	puBlic domNode: FastDomNode<HTMLElement> | null;
	puBlic readonly input: RenderLineInput;

	protected readonly _characterMapping: CharacterMapping;
	private readonly _isWhitespaceOnly: Boolean;
	private readonly _containsForeignElements: ForeignElementType;
	private _cachedWidth: numBer;

	/**
	 * This is a map that is used only when the line is guaranteed to have no RTL text.
	 */
	private readonly _pixelOffsetCache: Int32Array | null;

	constructor(domNode: FastDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, characterMapping: CharacterMapping, containsRTL: Boolean, containsForeignElements: ForeignElementType) {
		this.domNode = domNode;
		this.input = renderLineInput;
		this._characterMapping = characterMapping;
		this._isWhitespaceOnly = /^\s*$/.test(renderLineInput.lineContent);
		this._containsForeignElements = containsForeignElements;
		this._cachedWidth = -1;

		this._pixelOffsetCache = null;
		if (!containsRTL || this._characterMapping.length === 0 /* the line is empty */) {
			this._pixelOffsetCache = new Int32Array(Math.max(2, this._characterMapping.length + 1));
			for (let column = 0, len = this._characterMapping.length; column <= len; column++) {
				this._pixelOffsetCache[column] = -1;
			}
		}
	}

	// --- Reading from the DOM methods

	protected _getReadingTarget(myDomNode: FastDomNode<HTMLElement>): HTMLElement {
		return <HTMLSpanElement>myDomNode.domNode.firstChild;
	}

	/**
	 * Width of the line in pixels
	 */
	puBlic getWidth(): numBer {
		if (!this.domNode) {
			return 0;
		}
		if (this._cachedWidth === -1) {
			this._cachedWidth = this._getReadingTarget(this.domNode).offsetWidth;
		}
		return this._cachedWidth;
	}

	puBlic getWidthIsFast(): Boolean {
		if (this._cachedWidth === -1) {
			return false;
		}
		return true;
	}

	/**
	 * VisiBle ranges for a model range
	 */
	puBlic getVisiBleRangesForRange(startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null {
		if (!this.domNode) {
			return null;
		}
		if (this._pixelOffsetCache !== null) {
			// the text is LTR
			const startOffset = this._readPixelOffset(this.domNode, startColumn, context);
			if (startOffset === -1) {
				return null;
			}

			const endOffset = this._readPixelOffset(this.domNode, endColumn, context);
			if (endOffset === -1) {
				return null;
			}

			return [new HorizontalRange(startOffset, endOffset - startOffset)];
		}

		return this._readVisiBleRangesForRange(this.domNode, startColumn, endColumn, context);
	}

	protected _readVisiBleRangesForRange(domNode: FastDomNode<HTMLElement>, startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null {
		if (startColumn === endColumn) {
			const pixelOffset = this._readPixelOffset(domNode, startColumn, context);
			if (pixelOffset === -1) {
				return null;
			} else {
				return [new HorizontalRange(pixelOffset, 0)];
			}
		} else {
			return this._readRawVisiBleRangesForRange(domNode, startColumn, endColumn, context);
		}
	}

	protected _readPixelOffset(domNode: FastDomNode<HTMLElement>, column: numBer, context: DomReadingContext): numBer {
		if (this._characterMapping.length === 0) {
			// This line has no content
			if (this._containsForeignElements === ForeignElementType.None) {
				// We can assume the line is really empty
				return 0;
			}
			if (this._containsForeignElements === ForeignElementType.After) {
				// We have foreign elements after the (empty) line
				return 0;
			}
			if (this._containsForeignElements === ForeignElementType.Before) {
				// We have foreign elements Before the (empty) line
				return this.getWidth();
			}
			// We have foreign elements Before & after the (empty) line
			const readingTarget = this._getReadingTarget(domNode);
			if (readingTarget.firstChild) {
				return (<HTMLSpanElement>readingTarget.firstChild).offsetWidth;
			} else {
				return 0;
			}
		}

		if (this._pixelOffsetCache !== null) {
			// the text is LTR

			const cachedPixelOffset = this._pixelOffsetCache[column];
			if (cachedPixelOffset !== -1) {
				return cachedPixelOffset;
			}

			const result = this._actualReadPixelOffset(domNode, column, context);
			this._pixelOffsetCache[column] = result;
			return result;
		}

		return this._actualReadPixelOffset(domNode, column, context);
	}

	private _actualReadPixelOffset(domNode: FastDomNode<HTMLElement>, column: numBer, context: DomReadingContext): numBer {
		if (this._characterMapping.length === 0) {
			// This line has no content
			const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), 0, 0, 0, 0, context.clientRectDeltaLeft, context.endNode);
			if (!r || r.length === 0) {
				return -1;
			}
			return r[0].left;
		}

		if (column === this._characterMapping.length && this._isWhitespaceOnly && this._containsForeignElements === ForeignElementType.None) {
			// This Branch helps in the case of whitespace only lines which have a width set
			return this.getWidth();
		}

		const partData = this._characterMapping.charOffsetToPartData(column - 1);
		const partIndex = CharacterMapping.getPartIndex(partData);
		const charOffsetInPart = CharacterMapping.getCharIndex(partData);

		const r = RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), partIndex, charOffsetInPart, partIndex, charOffsetInPart, context.clientRectDeltaLeft, context.endNode);
		if (!r || r.length === 0) {
			return -1;
		}
		const result = r[0].left;
		if (this.input.isBasicASCII) {
			const charOffset = this._characterMapping.getABsoluteOffsets();
			const expectedResult = Math.round(this.input.spaceWidth * charOffset[column - 1]);
			if (Math.aBs(expectedResult - result) <= 1) {
				return expectedResult;
			}
		}
		return result;
	}

	private _readRawVisiBleRangesForRange(domNode: FastDomNode<HTMLElement>, startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null {

		if (startColumn === 1 && endColumn === this._characterMapping.length) {
			// This Branch helps IE with Bidi text & gives a performance Boost to other Browsers when reading visiBle ranges for an entire line

			return [new HorizontalRange(0, this.getWidth())];
		}

		const startPartData = this._characterMapping.charOffsetToPartData(startColumn - 1);
		const startPartIndex = CharacterMapping.getPartIndex(startPartData);
		const startCharOffsetInPart = CharacterMapping.getCharIndex(startPartData);

		const endPartData = this._characterMapping.charOffsetToPartData(endColumn - 1);
		const endPartIndex = CharacterMapping.getPartIndex(endPartData);
		const endCharOffsetInPart = CharacterMapping.getCharIndex(endPartData);

		return RangeUtil.readHorizontalRanges(this._getReadingTarget(domNode), startPartIndex, startCharOffsetInPart, endPartIndex, endCharOffsetInPart, context.clientRectDeltaLeft, context.endNode);
	}

	/**
	 * Returns the column for the text found at a specific offset inside a rendered dom node
	 */
	puBlic getColumnOfNodeOffset(lineNumBer: numBer, spanNode: HTMLElement, offset: numBer): numBer {
		const spanNodeTextContentLength = spanNode.textContent!.length;

		let spanIndex = -1;
		while (spanNode) {
			spanNode = <HTMLElement>spanNode.previousSiBling;
			spanIndex++;
		}

		const charOffset = this._characterMapping.partDataToCharOffset(spanIndex, spanNodeTextContentLength, offset);
		return charOffset + 1;
	}
}

class WeBKitRenderedViewLine extends RenderedViewLine {
	protected _readVisiBleRangesForRange(domNode: FastDomNode<HTMLElement>, startColumn: numBer, endColumn: numBer, context: DomReadingContext): HorizontalRange[] | null {
		const output = super._readVisiBleRangesForRange(domNode, startColumn, endColumn, context);

		if (!output || output.length === 0 || startColumn === endColumn || (startColumn === 1 && endColumn === this._characterMapping.length)) {
			return output;
		}

		// WeBKit is Buggy and returns an expanded range (to contain words in some cases)
		// The last client rect is enlarged (I think)
		if (!this.input.containsRTL) {
			// This is an attempt to patch things up
			// Find position of last column
			const endPixelOffset = this._readPixelOffset(domNode, endColumn, context);
			if (endPixelOffset !== -1) {
				const lastRange = output[output.length - 1];
				if (lastRange.left < endPixelOffset) {
					// Trim down the width of the last visiBle range to not go after the last column's position
					lastRange.width = endPixelOffset - lastRange.left;
				}
			}
		}

		return output;
	}
}

const createRenderedLine: (domNode: FastDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, characterMapping: CharacterMapping, containsRTL: Boolean, containsForeignElements: ForeignElementType) => RenderedViewLine = (function () {
	if (Browser.isWeBKit) {
		return createWeBKitRenderedLine;
	}
	return createNormalRenderedLine;
})();

function createWeBKitRenderedLine(domNode: FastDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, characterMapping: CharacterMapping, containsRTL: Boolean, containsForeignElements: ForeignElementType): RenderedViewLine {
	return new WeBKitRenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}

function createNormalRenderedLine(domNode: FastDomNode<HTMLElement> | null, renderLineInput: RenderLineInput, characterMapping: CharacterMapping, containsRTL: Boolean, containsForeignElements: ForeignElementType): RenderedViewLine {
	return new RenderedViewLine(domNode, renderLineInput, characterMapping, containsRTL, containsForeignElements);
}
