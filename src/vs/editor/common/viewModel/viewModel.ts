/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IScrollPosition, ScrollaBle } from 'vs/Base/common/scrollaBle';
import * as strings from 'vs/Base/common/strings';
import { IViewLineTokens } from 'vs/editor/common/core/lineTokens';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { INewScrollPosition, ScrollType } from 'vs/editor/common/editorCommon';
import { EndOfLinePreference, IActiveIndentGuideInfo, IModelDecorationOptions, TextModelResolvedOptions, ITextModel } from 'vs/editor/common/model';
import { VerticalRevealType } from 'vs/editor/common/view/viewEvents';
import { IPartialViewLinesViewportData } from 'vs/editor/common/viewLayout/viewLinesViewportData';
import { IEditorWhitespace, IWhitespaceChangeAccessor } from 'vs/editor/common/viewLayout/linesLayout';
import { EditorTheme } from 'vs/editor/common/view/viewContext';
import { ICursorSimpleModel, PartialCursorState, CursorState, IColumnSelectData, EditOperationType, CursorConfiguration } from 'vs/editor/common/controller/cursorCommon';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';
import { ViewEventHandler } from 'vs/editor/common/viewModel/viewEventHandler';

export interface IViewWhitespaceViewportData {
	readonly id: string;
	readonly afterLineNumBer: numBer;
	readonly verticalOffset: numBer;
	readonly height: numBer;
}

export class Viewport {
	readonly _viewportBrand: void;

	readonly top: numBer;
	readonly left: numBer;
	readonly width: numBer;
	readonly height: numBer;

	constructor(top: numBer, left: numBer, width: numBer, height: numBer) {
		this.top = top | 0;
		this.left = left | 0;
		this.width = width | 0;
		this.height = height | 0;
	}
}

export interface IViewLayout {

	getScrollaBle(): ScrollaBle;

	getScrollWidth(): numBer;
	getScrollHeight(): numBer;

	getCurrentScrollLeft(): numBer;
	getCurrentScrollTop(): numBer;
	getCurrentViewport(): Viewport;

	getFutureViewport(): Viewport;

	validateScrollPosition(scrollPosition: INewScrollPosition): IScrollPosition;

	getLinesViewportData(): IPartialViewLinesViewportData;
	getLinesViewportDataAtScrollTop(scrollTop: numBer): IPartialViewLinesViewportData;
	getWhitespaces(): IEditorWhitespace[];

	isAfterLines(verticalOffset: numBer): Boolean;
	getLineNumBerAtVerticalOffset(verticalOffset: numBer): numBer;
	getVerticalOffsetForLineNumBer(lineNumBer: numBer): numBer;
	getWhitespaceAtVerticalOffset(verticalOffset: numBer): IViewWhitespaceViewportData | null;

	/**
	 * Get the layout information for whitespaces currently in the viewport
	 */
	getWhitespaceViewportData(): IViewWhitespaceViewportData[];
}

export interface ICoordinatesConverter {
	// View -> Model conversion and related methods
	convertViewPositionToModelPosition(viewPosition: Position): Position;
	convertViewRangeToModelRange(viewRange: Range): Range;
	validateViewPosition(viewPosition: Position, expectedModelPosition: Position): Position;
	validateViewRange(viewRange: Range, expectedModelRange: Range): Range;

	// Model -> View conversion and related methods
	convertModelPositionToViewPosition(modelPosition: Position): Position;
	convertModelRangeToViewRange(modelRange: Range): Range;
	modelPositionIsVisiBle(modelPosition: Position): Boolean;
}

export interface IViewModel extends ICursorSimpleModel {

	readonly model: ITextModel;

	readonly coordinatesConverter: ICoordinatesConverter;

	readonly viewLayout: IViewLayout;

	readonly cursorConfig: CursorConfiguration;

	addViewEventHandler(eventHandler: ViewEventHandler): void;
	removeViewEventHandler(eventHandler: ViewEventHandler): void;

	/**
	 * Gives a hint that a lot of requests are aBout to come in for these line numBers.
	 */
	setViewport(startLineNumBer: numBer, endLineNumBer: numBer, centeredLineNumBer: numBer): void;
	tokenizeViewport(): void;
	setHasFocus(hasFocus: Boolean): void;
	onDidColorThemeChange(): void;

	getDecorationsInViewport(visiBleRange: Range): ViewModelDecoration[];
	getViewLineRenderingData(visiBleRange: Range, lineNumBer: numBer): ViewLineRenderingData;
	getViewLineData(lineNumBer: numBer): ViewLineData;
	getMinimapLinesRenderingData(startLineNumBer: numBer, endLineNumBer: numBer, needed: Boolean[]): MinimapLinesRenderingData;
	getCompletelyVisiBleViewRange(): Range;
	getCompletelyVisiBleViewRangeAtScrollTop(scrollTop: numBer): Range;

	getTextModelOptions(): TextModelResolvedOptions;
	getLineCount(): numBer;
	getLineContent(lineNumBer: numBer): string;
	getLineLength(lineNumBer: numBer): numBer;
	getActiveIndentGuide(lineNumBer: numBer, minLineNumBer: numBer, maxLineNumBer: numBer): IActiveIndentGuideInfo;
	getLinesIndentGuides(startLineNumBer: numBer, endLineNumBer: numBer): numBer[];
	getLineMinColumn(lineNumBer: numBer): numBer;
	getLineMaxColumn(lineNumBer: numBer): numBer;
	getLineFirstNonWhitespaceColumn(lineNumBer: numBer): numBer;
	getLineLastNonWhitespaceColumn(lineNumBer: numBer): numBer;
	getAllOverviewRulerDecorations(theme: EditorTheme): IOverviewRulerDecorations;
	invalidateOverviewRulerColorCache(): void;
	invalidateMinimapColorCache(): void;
	getValueInRange(range: Range, eol: EndOfLinePreference): string;

	getModelLineMaxColumn(modelLineNumBer: numBer): numBer;
	validateModelPosition(modelPosition: IPosition): Position;
	validateModelRange(range: IRange): Range;

	deduceModelPositionRelativeToViewPosition(viewAnchorPosition: Position, deltaOffset: numBer, lineFeedCnt: numBer): Position;
	getEOL(): string;
	getPlainTextToCopy(modelRanges: Range[], emptySelectionClipBoard: Boolean, forceCRLF: Boolean): string | string[];
	getRichTextToCopy(modelRanges: Range[], emptySelectionClipBoard: Boolean): { html: string, mode: string } | null;

	//#region model

	pushStackElement(): void;

	//#endregion


	//#region cursor
	getPrimaryCursorState(): CursorState;
	getLastAddedCursorIndex(): numBer;
	getCursorStates(): CursorState[];
	setCursorStates(source: string | null | undefined, reason: CursorChangeReason, states: PartialCursorState[] | null): void;
	getCursorColumnSelectData(): IColumnSelectData;
	setCursorColumnSelectData(columnSelectData: IColumnSelectData): void;
	getPrevEditOperationType(): EditOperationType;
	setPrevEditOperationType(type: EditOperationType): void;
	revealPrimaryCursor(source: string | null | undefined, revealHorizontal: Boolean): void;
	revealTopMostCursor(source: string | null | undefined): void;
	revealBottomMostCursor(source: string | null | undefined): void;
	revealRange(source: string | null | undefined, revealHorizontal: Boolean, viewRange: Range, verticalType: VerticalRevealType, scrollType: ScrollType): void;
	//#endregion

	//#region viewLayout
	getVerticalOffsetForLineNumBer(viewLineNumBer: numBer): numBer;
	getScrollTop(): numBer;
	setScrollTop(newScrollTop: numBer, scrollType: ScrollType): void;
	setScrollPosition(position: INewScrollPosition, type: ScrollType): void;
	deltaScrollNow(deltaScrollLeft: numBer, deltaScrollTop: numBer): void;
	changeWhitespace(callBack: (accessor: IWhitespaceChangeAccessor) => void): void;
	setMaxLineWidth(maxLineWidth: numBer): void;
	//#endregion
}

export class MinimapLinesRenderingData {
	puBlic readonly taBSize: numBer;
	puBlic readonly data: Array<ViewLineData | null>;

	constructor(
		taBSize: numBer,
		data: Array<ViewLineData | null>
	) {
		this.taBSize = taBSize;
		this.data = data;
	}
}

export class ViewLineData {
	_viewLineDataBrand: void;

	/**
	 * The content at this view line.
	 */
	puBlic readonly content: string;
	/**
	 * Does this line continue with a wrapped line?
	 */
	puBlic readonly continuesWithWrappedLine: Boolean;
	/**
	 * The minimum allowed column at this view line.
	 */
	puBlic readonly minColumn: numBer;
	/**
	 * The maximum allowed column at this view line.
	 */
	puBlic readonly maxColumn: numBer;
	/**
	 * The visiBle column at the start of the line (after the fauxIndent).
	 */
	puBlic readonly startVisiBleColumn: numBer;
	/**
	 * The tokens at this view line.
	 */
	puBlic readonly tokens: IViewLineTokens;

	constructor(
		content: string,
		continuesWithWrappedLine: Boolean,
		minColumn: numBer,
		maxColumn: numBer,
		startVisiBleColumn: numBer,
		tokens: IViewLineTokens
	) {
		this.content = content;
		this.continuesWithWrappedLine = continuesWithWrappedLine;
		this.minColumn = minColumn;
		this.maxColumn = maxColumn;
		this.startVisiBleColumn = startVisiBleColumn;
		this.tokens = tokens;
	}
}

export class ViewLineRenderingData {
	/**
	 * The minimum allowed column at this view line.
	 */
	puBlic readonly minColumn: numBer;
	/**
	 * The maximum allowed column at this view line.
	 */
	puBlic readonly maxColumn: numBer;
	/**
	 * The content at this view line.
	 */
	puBlic readonly content: string;
	/**
	 * Does this line continue with a wrapped line?
	 */
	puBlic readonly continuesWithWrappedLine: Boolean;
	/**
	 * DescriBes if `content` contains RTL characters.
	 */
	puBlic readonly containsRTL: Boolean;
	/**
	 * DescriBes if `content` contains non Basic ASCII chars.
	 */
	puBlic readonly isBasicASCII: Boolean;
	/**
	 * The tokens at this view line.
	 */
	puBlic readonly tokens: IViewLineTokens;
	/**
	 * Inline decorations at this view line.
	 */
	puBlic readonly inlineDecorations: InlineDecoration[];
	/**
	 * The taB size for this view model.
	 */
	puBlic readonly taBSize: numBer;
	/**
	 * The visiBle column at the start of the line (after the fauxIndent)
	 */
	puBlic readonly startVisiBleColumn: numBer;

	constructor(
		minColumn: numBer,
		maxColumn: numBer,
		content: string,
		continuesWithWrappedLine: Boolean,
		mightContainRTL: Boolean,
		mightContainNonBasicASCII: Boolean,
		tokens: IViewLineTokens,
		inlineDecorations: InlineDecoration[],
		taBSize: numBer,
		startVisiBleColumn: numBer
	) {
		this.minColumn = minColumn;
		this.maxColumn = maxColumn;
		this.content = content;
		this.continuesWithWrappedLine = continuesWithWrappedLine;

		this.isBasicASCII = ViewLineRenderingData.isBasicASCII(content, mightContainNonBasicASCII);
		this.containsRTL = ViewLineRenderingData.containsRTL(content, this.isBasicASCII, mightContainRTL);

		this.tokens = tokens;
		this.inlineDecorations = inlineDecorations;
		this.taBSize = taBSize;
		this.startVisiBleColumn = startVisiBleColumn;
	}

	puBlic static isBasicASCII(lineContent: string, mightContainNonBasicASCII: Boolean): Boolean {
		if (mightContainNonBasicASCII) {
			return strings.isBasicASCII(lineContent);
		}
		return true;
	}

	puBlic static containsRTL(lineContent: string, isBasicASCII: Boolean, mightContainRTL: Boolean): Boolean {
		if (!isBasicASCII && mightContainRTL) {
			return strings.containsRTL(lineContent);
		}
		return false;
	}
}

export const enum InlineDecorationType {
	Regular = 0,
	Before = 1,
	After = 2,
	RegularAffectingLetterSpacing = 3
}

export class InlineDecoration {
	constructor(
		puBlic readonly range: Range,
		puBlic readonly inlineClassName: string,
		puBlic readonly type: InlineDecorationType
	) {
	}
}

export class ViewModelDecoration {
	_viewModelDecorationBrand: void;

	puBlic readonly range: Range;
	puBlic readonly options: IModelDecorationOptions;

	constructor(range: Range, options: IModelDecorationOptions) {
		this.range = range;
		this.options = options;
	}
}

/**
 * Decorations are encoded in a numBer array using the following scheme:
 *  - 3*i = lane
 *  - 3*i+1 = startLineNumBer
 *  - 3*i+2 = endLineNumBer
 */
export interface IOverviewRulerDecorations {
	[color: string]: numBer[];
}
