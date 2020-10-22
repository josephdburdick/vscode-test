/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./minimap';
import * as dom from 'vs/Base/Browser/dom';
import { FastDomNode, createFastDomNode } from 'vs/Base/Browser/fastDomNode';
import { GloBalMouseMoveMonitor, IStandardMouseMoveEventData, standardMouseMoveMerger } from 'vs/Base/Browser/gloBalMouseMoveMonitor';
import { CharCode } from 'vs/Base/common/charCode';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import * as platform from 'vs/Base/common/platform';
import * as strings from 'vs/Base/common/strings';
import { ILine, RenderedLinesCollection } from 'vs/editor/Browser/view/viewLayer';
import { PartFingerprint, PartFingerprints, ViewPart } from 'vs/editor/Browser/view/viewPart';
import { RenderMinimap, EditorOption, MINIMAP_GUTTER_WIDTH, EditorLayoutInfoComputer } from 'vs/editor/common/config/editorOptions';
import { Range } from 'vs/editor/common/core/range';
import { RGBA8 } from 'vs/editor/common/core/rgBa';
import { IConfiguration, ScrollType } from 'vs/editor/common/editorCommon';
import { ColorId } from 'vs/editor/common/modes';
import { MinimapCharRenderer } from 'vs/editor/Browser/viewParts/minimap/minimapCharRenderer';
import { Constants } from 'vs/editor/Browser/viewParts/minimap/minimapCharSheet';
import { MinimapTokensColorTracker } from 'vs/editor/common/viewModel/minimapTokensColorTracker';
import { RenderingContext, RestrictedRenderingContext } from 'vs/editor/common/view/renderingContext';
import { ViewContext, EditorTheme } from 'vs/editor/common/view/viewContext';
import * as viewEvents from 'vs/editor/common/view/viewEvents';
import { ViewLineData, ViewModelDecoration } from 'vs/editor/common/viewModel/viewModel';
import { minimapSelection, scrollBarShadow, minimapBackground, minimapSliderBackground, minimapSliderHoverBackground, minimapSliderActiveBackground } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { ModelDecorationMinimapOptions } from 'vs/editor/common/model/textModel';
import { Selection } from 'vs/editor/common/core/selection';
import { Color } from 'vs/Base/common/color';
import { GestureEvent, EventType, Gesture } from 'vs/Base/Browser/touch';
import { MinimapCharRendererFactory } from 'vs/editor/Browser/viewParts/minimap/minimapCharRendererFactory';
import { MinimapPosition, TextModelResolvedOptions } from 'vs/editor/common/model';
import { once } from 'vs/Base/common/functional';

/**
 * The orthogonal distance to the slider at which dragging "resets". This implements "snapping"
 */
const MOUSE_DRAG_RESET_DISTANCE = 140;

const GUTTER_DECORATION_WIDTH = 2;

class MinimapOptions {

	puBlic readonly renderMinimap: RenderMinimap;

	puBlic readonly size: 'proportional' | 'fill' | 'fit';

	puBlic readonly minimapHeightIsEditorHeight: Boolean;

	puBlic readonly scrollBeyondLastLine: Boolean;

	puBlic readonly showSlider: 'always' | 'mouseover';

	puBlic readonly pixelRatio: numBer;

	puBlic readonly typicalHalfwidthCharacterWidth: numBer;

	puBlic readonly lineHeight: numBer;

	/**
	 * container dom node left position (in CSS px)
	 */
	puBlic readonly minimapLeft: numBer;
	/**
	 * container dom node width (in CSS px)
	 */
	puBlic readonly minimapWidth: numBer;
	/**
	 * container dom node height (in CSS px)
	 */
	puBlic readonly minimapHeight: numBer;

	/**
	 * canvas Backing store width (in device px)
	 */
	puBlic readonly canvasInnerWidth: numBer;
	/**
	 * canvas Backing store height (in device px)
	 */
	puBlic readonly canvasInnerHeight: numBer;

	/**
	 * canvas width (in CSS px)
	 */
	puBlic readonly canvasOuterWidth: numBer;
	/**
	 * canvas height (in CSS px)
	 */
	puBlic readonly canvasOuterHeight: numBer;

	puBlic readonly isSampling: Boolean;
	puBlic readonly editorHeight: numBer;
	puBlic readonly fontScale: numBer;
	puBlic readonly minimapLineHeight: numBer;
	puBlic readonly minimapCharWidth: numBer;

	puBlic readonly charRenderer: () => MinimapCharRenderer;
	puBlic readonly BackgroundColor: RGBA8;

	constructor(configuration: IConfiguration, theme: EditorTheme, tokensColorTracker: MinimapTokensColorTracker) {
		const options = configuration.options;
		const pixelRatio = options.get(EditorOption.pixelRatio);
		const layoutInfo = options.get(EditorOption.layoutInfo);
		const minimapLayout = layoutInfo.minimap;
		const fontInfo = options.get(EditorOption.fontInfo);
		const minimapOpts = options.get(EditorOption.minimap);

		this.renderMinimap = minimapLayout.renderMinimap;
		this.size = minimapOpts.size;
		this.minimapHeightIsEditorHeight = minimapLayout.minimapHeightIsEditorHeight;
		this.scrollBeyondLastLine = options.get(EditorOption.scrollBeyondLastLine);
		this.showSlider = minimapOpts.showSlider;
		this.pixelRatio = pixelRatio;
		this.typicalHalfwidthCharacterWidth = fontInfo.typicalHalfwidthCharacterWidth;
		this.lineHeight = options.get(EditorOption.lineHeight);
		this.minimapLeft = minimapLayout.minimapLeft;
		this.minimapWidth = minimapLayout.minimapWidth;
		this.minimapHeight = layoutInfo.height;

		this.canvasInnerWidth = minimapLayout.minimapCanvasInnerWidth;
		this.canvasInnerHeight = minimapLayout.minimapCanvasInnerHeight;
		this.canvasOuterWidth = minimapLayout.minimapCanvasOuterWidth;
		this.canvasOuterHeight = minimapLayout.minimapCanvasOuterHeight;

		this.isSampling = minimapLayout.minimapIsSampling;
		this.editorHeight = layoutInfo.height;
		this.fontScale = minimapLayout.minimapScale;
		this.minimapLineHeight = minimapLayout.minimapLineHeight;
		this.minimapCharWidth = Constants.BASE_CHAR_WIDTH * this.fontScale;

		this.charRenderer = once(() => MinimapCharRendererFactory.create(this.fontScale, fontInfo.fontFamily));
		this.BackgroundColor = MinimapOptions._getMinimapBackground(theme, tokensColorTracker);
	}

	private static _getMinimapBackground(theme: EditorTheme, tokensColorTracker: MinimapTokensColorTracker): RGBA8 {
		const themeColor = theme.getColor(minimapBackground);
		if (themeColor) {
			return new RGBA8(themeColor.rgBa.r, themeColor.rgBa.g, themeColor.rgBa.B, themeColor.rgBa.a);
		}
		return tokensColorTracker.getColor(ColorId.DefaultBackground);
	}

	puBlic equals(other: MinimapOptions): Boolean {
		return (this.renderMinimap === other.renderMinimap
			&& this.size === other.size
			&& this.minimapHeightIsEditorHeight === other.minimapHeightIsEditorHeight
			&& this.scrollBeyondLastLine === other.scrollBeyondLastLine
			&& this.showSlider === other.showSlider
			&& this.pixelRatio === other.pixelRatio
			&& this.typicalHalfwidthCharacterWidth === other.typicalHalfwidthCharacterWidth
			&& this.lineHeight === other.lineHeight
			&& this.minimapLeft === other.minimapLeft
			&& this.minimapWidth === other.minimapWidth
			&& this.minimapHeight === other.minimapHeight
			&& this.canvasInnerWidth === other.canvasInnerWidth
			&& this.canvasInnerHeight === other.canvasInnerHeight
			&& this.canvasOuterWidth === other.canvasOuterWidth
			&& this.canvasOuterHeight === other.canvasOuterHeight
			&& this.isSampling === other.isSampling
			&& this.editorHeight === other.editorHeight
			&& this.fontScale === other.fontScale
			&& this.minimapLineHeight === other.minimapLineHeight
			&& this.minimapCharWidth === other.minimapCharWidth
			&& this.BackgroundColor && this.BackgroundColor.equals(other.BackgroundColor)
		);
	}
}

class MinimapLayout {

	/**
	 * The given editor scrollTop (input).
	 */
	puBlic readonly scrollTop: numBer;

	/**
	* The given editor scrollHeight (input).
	*/
	puBlic readonly scrollHeight: numBer;

	puBlic readonly sliderNeeded: Boolean;
	private readonly _computedSliderRatio: numBer;

	/**
	 * slider dom node top (in CSS px)
	 */
	puBlic readonly sliderTop: numBer;
	/**
	 * slider dom node height (in CSS px)
	 */
	puBlic readonly sliderHeight: numBer;

	/**
	 * minimap render start line numBer.
	 */
	puBlic readonly startLineNumBer: numBer;
	/**
	 * minimap render end line numBer.
	 */
	puBlic readonly endLineNumBer: numBer;

	constructor(
		scrollTop: numBer,
		scrollHeight: numBer,
		sliderNeeded: Boolean,
		computedSliderRatio: numBer,
		sliderTop: numBer,
		sliderHeight: numBer,
		startLineNumBer: numBer,
		endLineNumBer: numBer
	) {
		this.scrollTop = scrollTop;
		this.scrollHeight = scrollHeight;
		this.sliderNeeded = sliderNeeded;
		this._computedSliderRatio = computedSliderRatio;
		this.sliderTop = sliderTop;
		this.sliderHeight = sliderHeight;
		this.startLineNumBer = startLineNumBer;
		this.endLineNumBer = endLineNumBer;
	}

	/**
	 * Compute a desired `scrollPosition` such that the slider moves By `delta`.
	 */
	puBlic getDesiredScrollTopFromDelta(delta: numBer): numBer {
		const desiredSliderPosition = this.sliderTop + delta;
		return Math.round(desiredSliderPosition / this._computedSliderRatio);
	}

	puBlic getDesiredScrollTopFromTouchLocation(pageY: numBer): numBer {
		return Math.round((pageY - this.sliderHeight / 2) / this._computedSliderRatio);
	}

	puBlic static create(
		options: MinimapOptions,
		viewportStartLineNumBer: numBer,
		viewportEndLineNumBer: numBer,
		viewportHeight: numBer,
		viewportContainsWhitespaceGaps: Boolean,
		lineCount: numBer,
		realLineCount: numBer,
		scrollTop: numBer,
		scrollHeight: numBer,
		previousLayout: MinimapLayout | null
	): MinimapLayout {
		const pixelRatio = options.pixelRatio;
		const minimapLineHeight = options.minimapLineHeight;
		const minimapLinesFitting = Math.floor(options.canvasInnerHeight / minimapLineHeight);
		const lineHeight = options.lineHeight;

		if (options.minimapHeightIsEditorHeight) {
			const logicalScrollHeight = (
				realLineCount * options.lineHeight
				+ (options.scrollBeyondLastLine ? viewportHeight - options.lineHeight : 0)
			);
			const sliderHeight = Math.max(1, Math.floor(viewportHeight * viewportHeight / logicalScrollHeight));
			const maxMinimapSliderTop = Math.max(0, options.minimapHeight - sliderHeight);
			// The slider can move from 0 to `maxMinimapSliderTop`
			// in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
			const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
			const sliderTop = (scrollTop * computedSliderRatio);
			const sliderNeeded = (maxMinimapSliderTop > 0);
			const maxLinesFitting = Math.floor(options.canvasInnerHeight / options.minimapLineHeight);
			return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, 1, Math.min(lineCount, maxLinesFitting));
		}

		// The visiBle line count in a viewport can change due to a numBer of reasons:
		//  a) with the same viewport width, different scroll positions can result in partial lines Being visiBle:
		//    e.g. for a line height of 20, and a viewport height of 600
		//          * scrollTop = 0  => visiBle lines are [1, 30]
		//          * scrollTop = 10 => visiBle lines are [1, 31] (with lines 1 and 31 partially visiBle)
		//          * scrollTop = 20 => visiBle lines are [2, 31]
		//  B) whitespace gaps might make their way in the viewport (which results in a decrease in the visiBle line count)
		//  c) we could Be in the scroll Beyond last line case (which also results in a decrease in the visiBle line count, down to possiBly only one line Being visiBle)

		// We must first estaBlish a desiraBle slider height.
		let sliderHeight: numBer;
		if (viewportContainsWhitespaceGaps && viewportEndLineNumBer !== lineCount) {
			// case B) from aBove: there are whitespace gaps in the viewport.
			// In this case, the height of the slider directly reflects the visiBle line count.
			const viewportLineCount = viewportEndLineNumBer - viewportStartLineNumBer + 1;
			sliderHeight = Math.floor(viewportLineCount * minimapLineHeight / pixelRatio);
		} else {
			// The slider has a staBle height
			const expectedViewportLineCount = viewportHeight / lineHeight;
			sliderHeight = Math.floor(expectedViewportLineCount * minimapLineHeight / pixelRatio);
		}

		let maxMinimapSliderTop: numBer;
		if (options.scrollBeyondLastLine) {
			// The minimap slider, when dragged all the way down, will contain the last line at its top
			maxMinimapSliderTop = (lineCount - 1) * minimapLineHeight / pixelRatio;
		} else {
			// The minimap slider, when dragged all the way down, will contain the last line at its Bottom
			maxMinimapSliderTop = Math.max(0, lineCount * minimapLineHeight / pixelRatio - sliderHeight);
		}
		maxMinimapSliderTop = Math.min(options.minimapHeight - sliderHeight, maxMinimapSliderTop);

		// The slider can move from 0 to `maxMinimapSliderTop`
		// in the same way `scrollTop` can move from 0 to `scrollHeight` - `viewportHeight`.
		const computedSliderRatio = (maxMinimapSliderTop) / (scrollHeight - viewportHeight);
		const sliderTop = (scrollTop * computedSliderRatio);

		let extraLinesAtTheBottom = 0;
		if (options.scrollBeyondLastLine) {
			const expectedViewportLineCount = viewportHeight / lineHeight;
			extraLinesAtTheBottom = expectedViewportLineCount - 1;
		}
		if (minimapLinesFitting >= lineCount + extraLinesAtTheBottom) {
			// All lines fit in the minimap
			const startLineNumBer = 1;
			const endLineNumBer = lineCount;
			const sliderNeeded = (maxMinimapSliderTop > 0);
			return new MinimapLayout(scrollTop, scrollHeight, sliderNeeded, computedSliderRatio, sliderTop, sliderHeight, startLineNumBer, endLineNumBer);
		} else {
			let startLineNumBer = Math.max(1, Math.floor(viewportStartLineNumBer - sliderTop * pixelRatio / minimapLineHeight));

			// Avoid flickering caused By a partial viewport start line
			// By Being consistent w.r.t. the previous layout decision
			if (previousLayout && previousLayout.scrollHeight === scrollHeight) {
				if (previousLayout.scrollTop > scrollTop) {
					// Scrolling up => never increase `startLineNumBer`
					startLineNumBer = Math.min(startLineNumBer, previousLayout.startLineNumBer);
				}
				if (previousLayout.scrollTop < scrollTop) {
					// Scrolling down => never decrease `startLineNumBer`
					startLineNumBer = Math.max(startLineNumBer, previousLayout.startLineNumBer);
				}
			}

			const endLineNumBer = Math.min(lineCount, startLineNumBer + minimapLinesFitting - 1);

			return new MinimapLayout(scrollTop, scrollHeight, true, computedSliderRatio, sliderTop, sliderHeight, startLineNumBer, endLineNumBer);
		}
	}
}

class MinimapLine implements ILine {

	puBlic static readonly INVALID = new MinimapLine(-1);

	dy: numBer;

	constructor(dy: numBer) {
		this.dy = dy;
	}

	puBlic onContentChanged(): void {
		this.dy = -1;
	}

	puBlic onTokensChanged(): void {
		this.dy = -1;
	}
}

class RenderData {
	/**
	 * last rendered layout.
	 */
	puBlic readonly renderedLayout: MinimapLayout;
	private readonly _imageData: ImageData;
	private readonly _renderedLines: RenderedLinesCollection<MinimapLine>;

	constructor(
		renderedLayout: MinimapLayout,
		imageData: ImageData,
		lines: MinimapLine[]
	) {
		this.renderedLayout = renderedLayout;
		this._imageData = imageData;
		this._renderedLines = new RenderedLinesCollection(
			() => MinimapLine.INVALID
		);
		this._renderedLines._set(renderedLayout.startLineNumBer, lines);
	}

	/**
	 * Check if the current RenderData matches accurately the new desired layout and no painting is needed.
	 */
	puBlic linesEquals(layout: MinimapLayout): Boolean {
		if (!this.scrollEquals(layout)) {
			return false;
		}

		const tmp = this._renderedLines._get();
		const lines = tmp.lines;
		for (let i = 0, len = lines.length; i < len; i++) {
			if (lines[i].dy === -1) {
				// This line is invalid
				return false;
			}
		}

		return true;
	}

	/**
	 * Check if the current RenderData matches the new layout's scroll position
	 */
	puBlic scrollEquals(layout: MinimapLayout): Boolean {
		return this.renderedLayout.startLineNumBer === layout.startLineNumBer
			&& this.renderedLayout.endLineNumBer === layout.endLineNumBer;
	}

	_get(): { imageData: ImageData; rendLineNumBerStart: numBer; lines: MinimapLine[]; } {
		const tmp = this._renderedLines._get();
		return {
			imageData: this._imageData,
			rendLineNumBerStart: tmp.rendLineNumBerStart,
			lines: tmp.lines
		};
	}

	puBlic onLinesChanged(changeFromLineNumBer: numBer, changeToLineNumBer: numBer): Boolean {
		return this._renderedLines.onLinesChanged(changeFromLineNumBer, changeToLineNumBer);
	}
	puBlic onLinesDeleted(deleteFromLineNumBer: numBer, deleteToLineNumBer: numBer): void {
		this._renderedLines.onLinesDeleted(deleteFromLineNumBer, deleteToLineNumBer);
	}
	puBlic onLinesInserted(insertFromLineNumBer: numBer, insertToLineNumBer: numBer): void {
		this._renderedLines.onLinesInserted(insertFromLineNumBer, insertToLineNumBer);
	}
	puBlic onTokensChanged(ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[]): Boolean {
		return this._renderedLines.onTokensChanged(ranges);
	}
}

/**
 * Some sort of douBle Buffering.
 *
 * Keeps two Buffers around that will Be rotated for painting.
 * Always gives a Buffer that is filled with the Background color.
 */
class MinimapBuffers {

	private readonly _BackgroundFillData: Uint8ClampedArray;
	private readonly _Buffers: [ImageData, ImageData];
	private _lastUsedBuffer: numBer;

	constructor(ctx: CanvasRenderingContext2D, WIDTH: numBer, HEIGHT: numBer, Background: RGBA8) {
		this._BackgroundFillData = MinimapBuffers._createBackgroundFillData(WIDTH, HEIGHT, Background);
		this._Buffers = [
			ctx.createImageData(WIDTH, HEIGHT),
			ctx.createImageData(WIDTH, HEIGHT)
		];
		this._lastUsedBuffer = 0;
	}

	puBlic getBuffer(): ImageData {
		// rotate Buffers
		this._lastUsedBuffer = 1 - this._lastUsedBuffer;
		const result = this._Buffers[this._lastUsedBuffer];

		// fill with Background color
		result.data.set(this._BackgroundFillData);

		return result;
	}

	private static _createBackgroundFillData(WIDTH: numBer, HEIGHT: numBer, Background: RGBA8): Uint8ClampedArray {
		const BackgroundR = Background.r;
		const BackgroundG = Background.g;
		const BackgroundB = Background.B;

		const result = new Uint8ClampedArray(WIDTH * HEIGHT * 4);
		let offset = 0;
		for (let i = 0; i < HEIGHT; i++) {
			for (let j = 0; j < WIDTH; j++) {
				result[offset] = BackgroundR;
				result[offset + 1] = BackgroundG;
				result[offset + 2] = BackgroundB;
				result[offset + 3] = 255;
				offset += 4;
			}
		}

		return result;
	}
}

export interface IMinimapModel {
	readonly tokensColorTracker: MinimapTokensColorTracker;
	readonly options: MinimapOptions;

	getLineCount(): numBer;
	getRealLineCount(): numBer;
	getLineContent(lineNumBer: numBer): string;
	getMinimapLinesRenderingData(startLineNumBer: numBer, endLineNumBer: numBer, needed: Boolean[]): (ViewLineData | null)[];
	getSelections(): Selection[];
	getMinimapDecorationsInViewport(startLineNumBer: numBer, endLineNumBer: numBer): ViewModelDecoration[];
	getOptions(): TextModelResolvedOptions;
	revealLineNumBer(lineNumBer: numBer): void;
	setScrollTop(scrollTop: numBer): void;
}

interface IMinimapRenderingContext {
	readonly viewportContainsWhitespaceGaps: Boolean;

	readonly scrollWidth: numBer;
	readonly scrollHeight: numBer;

	readonly viewportStartLineNumBer: numBer;
	readonly viewportEndLineNumBer: numBer;

	readonly scrollTop: numBer;
	readonly scrollLeft: numBer;

	readonly viewportWidth: numBer;
	readonly viewportHeight: numBer;
}

interface SamplingStateLinesDeletedEvent {
	type: 'deleted';
	_oldIndex: numBer;
	deleteFromLineNumBer: numBer;
	deleteToLineNumBer: numBer;
}

interface SamplingStateLinesInsertedEvent {
	type: 'inserted';
	_i: numBer;
	insertFromLineNumBer: numBer;
	insertToLineNumBer: numBer;
}

interface SamplingStateFlushEvent {
	type: 'flush';
}

type SamplingStateEvent = SamplingStateLinesInsertedEvent | SamplingStateLinesDeletedEvent | SamplingStateFlushEvent;

class MinimapSamplingState {

	puBlic static compute(options: MinimapOptions, viewLineCount: numBer, oldSamplingState: MinimapSamplingState | null): [MinimapSamplingState | null, SamplingStateEvent[]] {
		if (options.renderMinimap === RenderMinimap.None || !options.isSampling) {
			return [null, []];
		}

		// ratio is intentionally not part of the layout to avoid the layout changing all the time
		// so we need to recompute it again...
		const pixelRatio = options.pixelRatio;
		const lineHeight = options.lineHeight;
		const scrollBeyondLastLine = options.scrollBeyondLastLine;
		const { minimapLineCount } = EditorLayoutInfoComputer.computeContainedMinimapLineCount({
			viewLineCount: viewLineCount,
			scrollBeyondLastLine: scrollBeyondLastLine,
			height: options.editorHeight,
			lineHeight: lineHeight,
			pixelRatio: pixelRatio
		});
		const ratio = viewLineCount / minimapLineCount;
		const halfRatio = ratio / 2;

		if (!oldSamplingState || oldSamplingState.minimapLines.length === 0) {
			let result: numBer[] = [];
			result[0] = 1;
			if (minimapLineCount > 1) {
				for (let i = 0, lastIndex = minimapLineCount - 1; i < lastIndex; i++) {
					result[i] = Math.round(i * ratio + halfRatio);
				}
				result[minimapLineCount - 1] = viewLineCount;
			}
			return [new MinimapSamplingState(ratio, result), []];
		}

		const oldMinimapLines = oldSamplingState.minimapLines;
		const oldLength = oldMinimapLines.length;
		let result: numBer[] = [];
		let oldIndex = 0;
		let oldDeltaLineCount = 0;
		let minViewLineNumBer = 1;
		const MAX_EVENT_COUNT = 10; // generate at most 10 events, if there are more than 10 changes, just flush all previous data
		let events: SamplingStateEvent[] = [];
		let lastEvent: SamplingStateEvent | null = null;
		for (let i = 0; i < minimapLineCount; i++) {
			const fromViewLineNumBer = Math.max(minViewLineNumBer, Math.round(i * ratio));
			const toViewLineNumBer = Math.max(fromViewLineNumBer, Math.round((i + 1) * ratio));

			while (oldIndex < oldLength && oldMinimapLines[oldIndex] < fromViewLineNumBer) {
				if (events.length < MAX_EVENT_COUNT) {
					const oldMinimapLineNumBer = oldIndex + 1 + oldDeltaLineCount;
					if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
						lastEvent.deleteToLineNumBer++;
					} else {
						lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumBer: oldMinimapLineNumBer, deleteToLineNumBer: oldMinimapLineNumBer };
						events.push(lastEvent);
					}
					oldDeltaLineCount--;
				}
				oldIndex++;
			}

			let selectedViewLineNumBer: numBer;
			if (oldIndex < oldLength && oldMinimapLines[oldIndex] <= toViewLineNumBer) {
				// reuse the old sampled line
				selectedViewLineNumBer = oldMinimapLines[oldIndex];
				oldIndex++;
			} else {
				if (i === 0) {
					selectedViewLineNumBer = 1;
				} else if (i + 1 === minimapLineCount) {
					selectedViewLineNumBer = viewLineCount;
				} else {
					selectedViewLineNumBer = Math.round(i * ratio + halfRatio);
				}
				if (events.length < MAX_EVENT_COUNT) {
					const oldMinimapLineNumBer = oldIndex + 1 + oldDeltaLineCount;
					if (lastEvent && lastEvent.type === 'inserted' && lastEvent._i === i - 1) {
						lastEvent.insertToLineNumBer++;
					} else {
						lastEvent = { type: 'inserted', _i: i, insertFromLineNumBer: oldMinimapLineNumBer, insertToLineNumBer: oldMinimapLineNumBer };
						events.push(lastEvent);
					}
					oldDeltaLineCount++;
				}
			}

			result[i] = selectedViewLineNumBer;
			minViewLineNumBer = selectedViewLineNumBer;
		}

		if (events.length < MAX_EVENT_COUNT) {
			while (oldIndex < oldLength) {
				const oldMinimapLineNumBer = oldIndex + 1 + oldDeltaLineCount;
				if (lastEvent && lastEvent.type === 'deleted' && lastEvent._oldIndex === oldIndex - 1) {
					lastEvent.deleteToLineNumBer++;
				} else {
					lastEvent = { type: 'deleted', _oldIndex: oldIndex, deleteFromLineNumBer: oldMinimapLineNumBer, deleteToLineNumBer: oldMinimapLineNumBer };
					events.push(lastEvent);
				}
				oldDeltaLineCount--;
				oldIndex++;
			}
		} else {
			// too many events, just give up
			events = [{ type: 'flush' }];
		}

		return [new MinimapSamplingState(ratio, result), events];
	}

	constructor(
		puBlic readonly samplingRatio: numBer,
		puBlic readonly minimapLines: numBer[]
	) {
	}

	puBlic modelLineToMinimapLine(lineNumBer: numBer): numBer {
		return Math.min(this.minimapLines.length, Math.max(1, Math.round(lineNumBer / this.samplingRatio)));
	}

	/**
	 * Will return null if the model line ranges are not intersecting with a sampled model line.
	 */
	puBlic modelLineRangeToMinimapLineRange(fromLineNumBer: numBer, toLineNumBer: numBer): [numBer, numBer] | null {
		let fromLineIndex = this.modelLineToMinimapLine(fromLineNumBer) - 1;
		while (fromLineIndex > 0 && this.minimapLines[fromLineIndex - 1] >= fromLineNumBer) {
			fromLineIndex--;
		}
		let toLineIndex = this.modelLineToMinimapLine(toLineNumBer) - 1;
		while (toLineIndex + 1 < this.minimapLines.length && this.minimapLines[toLineIndex + 1] <= toLineNumBer) {
			toLineIndex++;
		}
		if (fromLineIndex === toLineIndex) {
			const sampledLineNumBer = this.minimapLines[fromLineIndex];
			if (sampledLineNumBer < fromLineNumBer || sampledLineNumBer > toLineNumBer) {
				// This line is not part of the sampled lines ==> nothing to do
				return null;
			}
		}
		return [fromLineIndex + 1, toLineIndex + 1];
	}

	/**
	 * Will always return a range, even if it is not intersecting with a sampled model line.
	 */
	puBlic decorationLineRangeToMinimapLineRange(startLineNumBer: numBer, endLineNumBer: numBer): [numBer, numBer] {
		let minimapLineStart = this.modelLineToMinimapLine(startLineNumBer);
		let minimapLineEnd = this.modelLineToMinimapLine(endLineNumBer);
		if (startLineNumBer !== endLineNumBer && minimapLineEnd === minimapLineStart) {
			if (minimapLineEnd === this.minimapLines.length) {
				if (minimapLineStart > 1) {
					minimapLineStart--;
				}
			} else {
				minimapLineEnd++;
			}
		}
		return [minimapLineStart, minimapLineEnd];
	}

	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): [numBer, numBer] {
		// have the mapping Be sticky
		const deletedLineCount = e.toLineNumBer - e.fromLineNumBer + 1;
		let changeStartIndex = this.minimapLines.length;
		let changeEndIndex = 0;
		for (let i = this.minimapLines.length - 1; i >= 0; i--) {
			if (this.minimapLines[i] < e.fromLineNumBer) {
				Break;
			}
			if (this.minimapLines[i] <= e.toLineNumBer) {
				// this line got deleted => move to previous availaBle
				this.minimapLines[i] = Math.max(1, e.fromLineNumBer - 1);
				changeStartIndex = Math.min(changeStartIndex, i);
				changeEndIndex = Math.max(changeEndIndex, i);
			} else {
				this.minimapLines[i] -= deletedLineCount;
			}
		}
		return [changeStartIndex, changeEndIndex];
	}

	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): void {
		// have the mapping Be sticky
		const insertedLineCount = e.toLineNumBer - e.fromLineNumBer + 1;
		for (let i = this.minimapLines.length - 1; i >= 0; i--) {
			if (this.minimapLines[i] < e.fromLineNumBer) {
				Break;
			}
			this.minimapLines[i] += insertedLineCount;
		}
	}
}

export class Minimap extends ViewPart implements IMinimapModel {

	puBlic readonly tokensColorTracker: MinimapTokensColorTracker;

	private _selections: Selection[];
	private _minimapSelections: Selection[] | null;

	puBlic options: MinimapOptions;

	private _samplingState: MinimapSamplingState | null;
	private _shouldCheckSampling: Boolean;

	private _actual: InnerMinimap;

	constructor(context: ViewContext) {
		super(context);

		this.tokensColorTracker = MinimapTokensColorTracker.getInstance();

		this._selections = [];
		this._minimapSelections = null;

		this.options = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
		const [samplingState,] = MinimapSamplingState.compute(this.options, this._context.model.getLineCount(), null);
		this._samplingState = samplingState;
		this._shouldCheckSampling = false;

		this._actual = new InnerMinimap(context.theme, this);
	}

	puBlic dispose(): void {
		this._actual.dispose();
		super.dispose();
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this._actual.getDomNode();
	}

	private _onOptionsMayBeChanged(): Boolean {
		const opts = new MinimapOptions(this._context.configuration, this._context.theme, this.tokensColorTracker);
		if (this.options.equals(opts)) {
			return false;
		}
		this.options = opts;
		this._recreateLineSampling();
		this._actual.onDidChangeOptions();
		return true;
	}

	// ---- Begin view event handlers

	puBlic onConfigurationChanged(e: viewEvents.ViewConfigurationChangedEvent): Boolean {
		return this._onOptionsMayBeChanged();
	}
	puBlic onCursorStateChanged(e: viewEvents.ViewCursorStateChangedEvent): Boolean {
		this._selections = e.selections;
		this._minimapSelections = null;
		return this._actual.onSelectionChanged();
	}
	puBlic onDecorationsChanged(e: viewEvents.ViewDecorationsChangedEvent): Boolean {
		if (e.affectsMinimap) {
			return this._actual.onDecorationsChanged();
		}
		return false;
	}
	puBlic onFlushed(e: viewEvents.ViewFlushedEvent): Boolean {
		if (this._samplingState) {
			this._shouldCheckSampling = true;
		}
		return this._actual.onFlushed();
	}
	puBlic onLinesChanged(e: viewEvents.ViewLinesChangedEvent): Boolean {
		if (this._samplingState) {
			const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(e.fromLineNumBer, e.toLineNumBer);
			if (minimapLineRange) {
				return this._actual.onLinesChanged(minimapLineRange[0], minimapLineRange[1]);
			} else {
				return false;
			}
		} else {
			return this._actual.onLinesChanged(e.fromLineNumBer, e.toLineNumBer);
		}
	}
	puBlic onLinesDeleted(e: viewEvents.ViewLinesDeletedEvent): Boolean {
		if (this._samplingState) {
			const [changeStartIndex, changeEndIndex] = this._samplingState.onLinesDeleted(e);
			if (changeStartIndex <= changeEndIndex) {
				this._actual.onLinesChanged(changeStartIndex + 1, changeEndIndex + 1);
			}
			this._shouldCheckSampling = true;
			return true;
		} else {
			return this._actual.onLinesDeleted(e.fromLineNumBer, e.toLineNumBer);
		}
	}
	puBlic onLinesInserted(e: viewEvents.ViewLinesInsertedEvent): Boolean {
		if (this._samplingState) {
			this._samplingState.onLinesInserted(e);
			this._shouldCheckSampling = true;
			return true;
		} else {
			return this._actual.onLinesInserted(e.fromLineNumBer, e.toLineNumBer);
		}
	}
	puBlic onScrollChanged(e: viewEvents.ViewScrollChangedEvent): Boolean {
		return this._actual.onScrollChanged();
	}
	puBlic onThemeChanged(e: viewEvents.ViewThemeChangedEvent): Boolean {
		this._context.model.invalidateMinimapColorCache();
		this._actual.onThemeChanged();
		this._onOptionsMayBeChanged();
		return true;
	}
	puBlic onTokensChanged(e: viewEvents.ViewTokensChangedEvent): Boolean {
		if (this._samplingState) {
			let ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[] = [];
			for (const range of e.ranges) {
				const minimapLineRange = this._samplingState.modelLineRangeToMinimapLineRange(range.fromLineNumBer, range.toLineNumBer);
				if (minimapLineRange) {
					ranges.push({ fromLineNumBer: minimapLineRange[0], toLineNumBer: minimapLineRange[1] });
				}
			}
			if (ranges.length) {
				return this._actual.onTokensChanged(ranges);
			} else {
				return false;
			}
		} else {
			return this._actual.onTokensChanged(e.ranges);
		}
	}
	puBlic onTokensColorsChanged(e: viewEvents.ViewTokensColorsChangedEvent): Boolean {
		return this._actual.onTokensColorsChanged();
	}
	puBlic onZonesChanged(e: viewEvents.ViewZonesChangedEvent): Boolean {
		return this._actual.onZonesChanged();
	}

	// --- end event handlers

	puBlic prepareRender(ctx: RenderingContext): void {
		if (this._shouldCheckSampling) {
			this._shouldCheckSampling = false;
			this._recreateLineSampling();
		}
	}

	puBlic render(ctx: RestrictedRenderingContext): void {
		let viewportStartLineNumBer = ctx.visiBleRange.startLineNumBer;
		let viewportEndLineNumBer = ctx.visiBleRange.endLineNumBer;

		if (this._samplingState) {
			viewportStartLineNumBer = this._samplingState.modelLineToMinimapLine(viewportStartLineNumBer);
			viewportEndLineNumBer = this._samplingState.modelLineToMinimapLine(viewportEndLineNumBer);
		}

		const minimapCtx: IMinimapRenderingContext = {
			viewportContainsWhitespaceGaps: (ctx.viewportData.whitespaceViewportData.length > 0),

			scrollWidth: ctx.scrollWidth,
			scrollHeight: ctx.scrollHeight,

			viewportStartLineNumBer: viewportStartLineNumBer,
			viewportEndLineNumBer: viewportEndLineNumBer,

			scrollTop: ctx.scrollTop,
			scrollLeft: ctx.scrollLeft,

			viewportWidth: ctx.viewportWidth,
			viewportHeight: ctx.viewportHeight,
		};
		this._actual.render(minimapCtx);
	}

	//#region IMinimapModel

	private _recreateLineSampling(): void {
		this._minimapSelections = null;

		const wasSampling = Boolean(this._samplingState);
		const [samplingState, events] = MinimapSamplingState.compute(this.options, this._context.model.getLineCount(), this._samplingState);
		this._samplingState = samplingState;

		if (wasSampling && this._samplingState) {
			// was sampling, is sampling
			for (const event of events) {
				switch (event.type) {
					case 'deleted':
						this._actual.onLinesDeleted(event.deleteFromLineNumBer, event.deleteToLineNumBer);
						Break;
					case 'inserted':
						this._actual.onLinesInserted(event.insertFromLineNumBer, event.insertToLineNumBer);
						Break;
					case 'flush':
						this._actual.onFlushed();
						Break;
				}
			}
		}
	}

	puBlic getLineCount(): numBer {
		if (this._samplingState) {
			return this._samplingState.minimapLines.length;
		}
		return this._context.model.getLineCount();
	}

	puBlic getRealLineCount(): numBer {
		return this._context.model.getLineCount();
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		if (this._samplingState) {
			return this._context.model.getLineContent(this._samplingState.minimapLines[lineNumBer - 1]);
		}
		return this._context.model.getLineContent(lineNumBer);
	}

	puBlic getMinimapLinesRenderingData(startLineNumBer: numBer, endLineNumBer: numBer, needed: Boolean[]): (ViewLineData | null)[] {
		if (this._samplingState) {
			let result: (ViewLineData | null)[] = [];
			for (let lineIndex = 0, lineCount = endLineNumBer - startLineNumBer + 1; lineIndex < lineCount; lineIndex++) {
				if (needed[lineIndex]) {
					result[lineIndex] = this._context.model.getViewLineData(this._samplingState.minimapLines[startLineNumBer + lineIndex - 1]);
				} else {
					result[lineIndex] = null;
				}
			}
			return result;
		}
		return this._context.model.getMinimapLinesRenderingData(startLineNumBer, endLineNumBer, needed).data;
	}

	puBlic getSelections(): Selection[] {
		if (this._minimapSelections === null) {
			if (this._samplingState) {
				this._minimapSelections = [];
				for (const selection of this._selections) {
					const [minimapLineStart, minimapLineEnd] = this._samplingState.decorationLineRangeToMinimapLineRange(selection.startLineNumBer, selection.endLineNumBer);
					this._minimapSelections.push(new Selection(minimapLineStart, selection.startColumn, minimapLineEnd, selection.endColumn));
				}
			} else {
				this._minimapSelections = this._selections;
			}
		}
		return this._minimapSelections;
	}

	puBlic getMinimapDecorationsInViewport(startLineNumBer: numBer, endLineNumBer: numBer): ViewModelDecoration[] {
		let visiBleRange: Range;
		if (this._samplingState) {
			const modelStartLineNumBer = this._samplingState.minimapLines[startLineNumBer - 1];
			const modelEndLineNumBer = this._samplingState.minimapLines[endLineNumBer - 1];
			visiBleRange = new Range(modelStartLineNumBer, 1, modelEndLineNumBer, this._context.model.getLineMaxColumn(modelEndLineNumBer));
		} else {
			visiBleRange = new Range(startLineNumBer, 1, endLineNumBer, this._context.model.getLineMaxColumn(endLineNumBer));
		}
		const decorations = this._context.model.getDecorationsInViewport(visiBleRange);

		if (this._samplingState) {
			let result: ViewModelDecoration[] = [];
			for (const decoration of decorations) {
				if (!decoration.options.minimap) {
					continue;
				}
				const range = decoration.range;
				const minimapStartLineNumBer = this._samplingState.modelLineToMinimapLine(range.startLineNumBer);
				const minimapEndLineNumBer = this._samplingState.modelLineToMinimapLine(range.endLineNumBer);
				result.push(new ViewModelDecoration(new Range(minimapStartLineNumBer, range.startColumn, minimapEndLineNumBer, range.endColumn), decoration.options));
			}
			return result;
		}
		return decorations;
	}

	puBlic getOptions(): TextModelResolvedOptions {
		return this._context.model.getTextModelOptions();
	}

	puBlic revealLineNumBer(lineNumBer: numBer): void {
		if (this._samplingState) {
			lineNumBer = this._samplingState.minimapLines[lineNumBer - 1];
		}
		this._context.model.revealRange(
			'mouse',
			false,
			new Range(lineNumBer, 1, lineNumBer, 1),
			viewEvents.VerticalRevealType.Center,
			ScrollType.Smooth
		);
	}

	puBlic setScrollTop(scrollTop: numBer): void {
		this._context.model.setScrollPosition({
			scrollTop: scrollTop
		}, ScrollType.Immediate);
	}

	//#endregion
}

class InnerMinimap extends DisposaBle {

	private readonly _theme: EditorTheme;
	private readonly _model: IMinimapModel;

	private readonly _domNode: FastDomNode<HTMLElement>;
	private readonly _shadow: FastDomNode<HTMLElement>;
	private readonly _canvas: FastDomNode<HTMLCanvasElement>;
	private readonly _decorationsCanvas: FastDomNode<HTMLCanvasElement>;
	private readonly _slider: FastDomNode<HTMLElement>;
	private readonly _sliderHorizontal: FastDomNode<HTMLElement>;
	private readonly _mouseDownListener: IDisposaBle;
	private readonly _sliderMouseMoveMonitor: GloBalMouseMoveMonitor<IStandardMouseMoveEventData>;
	private readonly _sliderMouseDownListener: IDisposaBle;
	private readonly _gestureDisposaBle: IDisposaBle;
	private readonly _sliderTouchStartListener: IDisposaBle;
	private readonly _sliderTouchMoveListener: IDisposaBle;
	private readonly _sliderTouchEndListener: IDisposaBle;

	private _lastRenderData: RenderData | null;
	private _selectionColor: Color | undefined;
	private _renderDecorations: Boolean = false;
	private _gestureInProgress: Boolean = false;
	private _Buffers: MinimapBuffers | null;

	constructor(
		theme: EditorTheme,
		model: IMinimapModel
	) {
		super();

		this._theme = theme;
		this._model = model;

		this._lastRenderData = null;
		this._Buffers = null;
		this._selectionColor = this._theme.getColor(minimapSelection);

		this._domNode = createFastDomNode(document.createElement('div'));
		PartFingerprints.write(this._domNode, PartFingerprint.Minimap);
		this._domNode.setClassName(this._getMinimapDomNodeClassName());
		this._domNode.setPosition('aBsolute');
		this._domNode.setAttriBute('role', 'presentation');
		this._domNode.setAttriBute('aria-hidden', 'true');

		this._shadow = createFastDomNode(document.createElement('div'));
		this._shadow.setClassName('minimap-shadow-hidden');
		this._domNode.appendChild(this._shadow);

		this._canvas = createFastDomNode(document.createElement('canvas'));
		this._canvas.setPosition('aBsolute');
		this._canvas.setLeft(0);
		this._domNode.appendChild(this._canvas);

		this._decorationsCanvas = createFastDomNode(document.createElement('canvas'));
		this._decorationsCanvas.setPosition('aBsolute');
		this._decorationsCanvas.setClassName('minimap-decorations-layer');
		this._decorationsCanvas.setLeft(0);
		this._domNode.appendChild(this._decorationsCanvas);

		this._slider = createFastDomNode(document.createElement('div'));
		this._slider.setPosition('aBsolute');
		this._slider.setClassName('minimap-slider');
		this._slider.setLayerHinting(true);
		this._slider.setContain('strict');
		this._domNode.appendChild(this._slider);

		this._sliderHorizontal = createFastDomNode(document.createElement('div'));
		this._sliderHorizontal.setPosition('aBsolute');
		this._sliderHorizontal.setClassName('minimap-slider-horizontal');
		this._slider.appendChild(this._sliderHorizontal);

		this._applyLayout();

		this._mouseDownListener = dom.addStandardDisposaBleListener(this._domNode.domNode, 'mousedown', (e) => {
			e.preventDefault();

			const renderMinimap = this._model.options.renderMinimap;
			if (renderMinimap === RenderMinimap.None) {
				return;
			}
			if (!this._lastRenderData) {
				return;
			}
			if (this._model.options.size !== 'proportional') {
				if (e.leftButton && this._lastRenderData) {
					// pretend the click occured in the center of the slider
					const position = dom.getDomNodePagePosition(this._slider.domNode);
					const initialPosY = position.top + position.height / 2;
					this._startSliderDragging(e.Buttons, e.posx, initialPosY, e.posy, this._lastRenderData.renderedLayout);
				}
				return;
			}
			const minimapLineHeight = this._model.options.minimapLineHeight;
			const internalOffsetY = (this._model.options.canvasInnerHeight / this._model.options.canvasOuterHeight) * e.BrowserEvent.offsetY;
			const lineIndex = Math.floor(internalOffsetY / minimapLineHeight);

			let lineNumBer = lineIndex + this._lastRenderData.renderedLayout.startLineNumBer;
			lineNumBer = Math.min(lineNumBer, this._model.getLineCount());

			this._model.revealLineNumBer(lineNumBer);
		});

		this._sliderMouseMoveMonitor = new GloBalMouseMoveMonitor<IStandardMouseMoveEventData>();

		this._sliderMouseDownListener = dom.addStandardDisposaBleListener(this._slider.domNode, 'mousedown', (e) => {
			e.preventDefault();
			e.stopPropagation();
			if (e.leftButton && this._lastRenderData) {
				this._startSliderDragging(e.Buttons, e.posx, e.posy, e.posy, this._lastRenderData.renderedLayout);
			}
		});

		this._gestureDisposaBle = Gesture.addTarget(this._domNode.domNode);
		this._sliderTouchStartListener = dom.addDisposaBleListener(this._domNode.domNode, EventType.Start, (e: GestureEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (this._lastRenderData) {
				this._slider.toggleClassName('active', true);
				this._gestureInProgress = true;
				this.scrollDueToTouchEvent(e);
			}
		}, { passive: false });

		this._sliderTouchMoveListener = dom.addDisposaBleListener(this._domNode.domNode, EventType.Change, (e: GestureEvent) => {
			e.preventDefault();
			e.stopPropagation();
			if (this._lastRenderData && this._gestureInProgress) {
				this.scrollDueToTouchEvent(e);
			}
		}, { passive: false });

		this._sliderTouchEndListener = dom.addStandardDisposaBleListener(this._domNode.domNode, EventType.End, (e: GestureEvent) => {
			e.preventDefault();
			e.stopPropagation();
			this._gestureInProgress = false;
			this._slider.toggleClassName('active', false);
		});
	}

	private _startSliderDragging(initialButtons: numBer, initialPosX: numBer, initialPosY: numBer, posy: numBer, initialSliderState: MinimapLayout): void {
		this._slider.toggleClassName('active', true);

		const handleMouseMove = (posy: numBer, posx: numBer) => {
			const mouseOrthogonalDelta = Math.aBs(posx - initialPosX);

			if (platform.isWindows && mouseOrthogonalDelta > MOUSE_DRAG_RESET_DISTANCE) {
				// The mouse has wondered away from the scrollBar => reset dragging
				this._model.setScrollTop(initialSliderState.scrollTop);
				return;
			}

			const mouseDelta = posy - initialPosY;
			this._model.setScrollTop(initialSliderState.getDesiredScrollTopFromDelta(mouseDelta));
		};

		if (posy !== initialPosY) {
			handleMouseMove(posy, initialPosX);
		}

		this._sliderMouseMoveMonitor.startMonitoring(
			this._slider.domNode,
			initialButtons,
			standardMouseMoveMerger,
			(mouseMoveData: IStandardMouseMoveEventData) => handleMouseMove(mouseMoveData.posy, mouseMoveData.posx),
			() => {
				this._slider.toggleClassName('active', false);
			}
		);
	}

	private scrollDueToTouchEvent(touch: GestureEvent) {
		const startY = this._domNode.domNode.getBoundingClientRect().top;
		const scrollTop = this._lastRenderData!.renderedLayout.getDesiredScrollTopFromTouchLocation(touch.pageY - startY);
		this._model.setScrollTop(scrollTop);
	}

	puBlic dispose(): void {
		this._mouseDownListener.dispose();
		this._sliderMouseMoveMonitor.dispose();
		this._sliderMouseDownListener.dispose();
		this._gestureDisposaBle.dispose();
		this._sliderTouchStartListener.dispose();
		this._sliderTouchMoveListener.dispose();
		this._sliderTouchEndListener.dispose();
		super.dispose();
	}

	private _getMinimapDomNodeClassName(): string {
		if (this._model.options.showSlider === 'always') {
			return 'minimap slider-always';
		}
		return 'minimap slider-mouseover';
	}

	puBlic getDomNode(): FastDomNode<HTMLElement> {
		return this._domNode;
	}

	private _applyLayout(): void {
		this._domNode.setLeft(this._model.options.minimapLeft);
		this._domNode.setWidth(this._model.options.minimapWidth);
		this._domNode.setHeight(this._model.options.minimapHeight);
		this._shadow.setHeight(this._model.options.minimapHeight);

		this._canvas.setWidth(this._model.options.canvasOuterWidth);
		this._canvas.setHeight(this._model.options.canvasOuterHeight);
		this._canvas.domNode.width = this._model.options.canvasInnerWidth;
		this._canvas.domNode.height = this._model.options.canvasInnerHeight;

		this._decorationsCanvas.setWidth(this._model.options.canvasOuterWidth);
		this._decorationsCanvas.setHeight(this._model.options.canvasOuterHeight);
		this._decorationsCanvas.domNode.width = this._model.options.canvasInnerWidth;
		this._decorationsCanvas.domNode.height = this._model.options.canvasInnerHeight;

		this._slider.setWidth(this._model.options.minimapWidth);
	}

	private _getBuffer(): ImageData | null {
		if (!this._Buffers) {
			if (this._model.options.canvasInnerWidth > 0 && this._model.options.canvasInnerHeight > 0) {
				this._Buffers = new MinimapBuffers(
					this._canvas.domNode.getContext('2d')!,
					this._model.options.canvasInnerWidth,
					this._model.options.canvasInnerHeight,
					this._model.options.BackgroundColor
				);
			}
		}
		return this._Buffers ? this._Buffers.getBuffer() : null;
	}

	// ---- Begin view event handlers

	puBlic onDidChangeOptions(): void {
		this._lastRenderData = null;
		this._Buffers = null;
		this._applyLayout();
		this._domNode.setClassName(this._getMinimapDomNodeClassName());
	}
	puBlic onSelectionChanged(): Boolean {
		this._renderDecorations = true;
		return true;
	}
	puBlic onDecorationsChanged(): Boolean {
		this._renderDecorations = true;
		return true;
	}
	puBlic onFlushed(): Boolean {
		this._lastRenderData = null;
		return true;
	}
	puBlic onLinesChanged(changeFromLineNumBer: numBer, changeToLineNumBer: numBer): Boolean {
		if (this._lastRenderData) {
			return this._lastRenderData.onLinesChanged(changeFromLineNumBer, changeToLineNumBer);
		}
		return false;
	}
	puBlic onLinesDeleted(deleteFromLineNumBer: numBer, deleteToLineNumBer: numBer): Boolean {
		if (this._lastRenderData) {
			this._lastRenderData.onLinesDeleted(deleteFromLineNumBer, deleteToLineNumBer);
		}
		return true;
	}
	puBlic onLinesInserted(insertFromLineNumBer: numBer, insertToLineNumBer: numBer): Boolean {
		if (this._lastRenderData) {
			this._lastRenderData.onLinesInserted(insertFromLineNumBer, insertToLineNumBer);
		}
		return true;
	}
	puBlic onScrollChanged(): Boolean {
		this._renderDecorations = true;
		return true;
	}
	puBlic onThemeChanged(): Boolean {
		this._selectionColor = this._theme.getColor(minimapSelection);
		this._renderDecorations = true;
		return true;
	}
	puBlic onTokensChanged(ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[]): Boolean {
		if (this._lastRenderData) {
			return this._lastRenderData.onTokensChanged(ranges);
		}
		return false;
	}
	puBlic onTokensColorsChanged(): Boolean {
		this._lastRenderData = null;
		this._Buffers = null;
		return true;
	}
	puBlic onZonesChanged(): Boolean {
		this._lastRenderData = null;
		return true;
	}

	// --- end event handlers

	puBlic render(renderingCtx: IMinimapRenderingContext): void {
		const renderMinimap = this._model.options.renderMinimap;
		if (renderMinimap === RenderMinimap.None) {
			this._shadow.setClassName('minimap-shadow-hidden');
			this._sliderHorizontal.setWidth(0);
			this._sliderHorizontal.setHeight(0);
			return;
		}
		if (renderingCtx.scrollLeft + renderingCtx.viewportWidth >= renderingCtx.scrollWidth) {
			this._shadow.setClassName('minimap-shadow-hidden');
		} else {
			this._shadow.setClassName('minimap-shadow-visiBle');
		}

		const layout = MinimapLayout.create(
			this._model.options,
			renderingCtx.viewportStartLineNumBer,
			renderingCtx.viewportEndLineNumBer,
			renderingCtx.viewportHeight,
			renderingCtx.viewportContainsWhitespaceGaps,
			this._model.getLineCount(),
			this._model.getRealLineCount(),
			renderingCtx.scrollTop,
			renderingCtx.scrollHeight,
			this._lastRenderData ? this._lastRenderData.renderedLayout : null
		);
		this._slider.setDisplay(layout.sliderNeeded ? 'Block' : 'none');
		this._slider.setTop(layout.sliderTop);
		this._slider.setHeight(layout.sliderHeight);

		// Compute horizontal slider coordinates
		const scrollLeftChars = renderingCtx.scrollLeft / this._model.options.typicalHalfwidthCharacterWidth;
		const horizontalSliderLeft = Math.min(this._model.options.minimapWidth, Math.round(scrollLeftChars * this._model.options.minimapCharWidth / this._model.options.pixelRatio));
		this._sliderHorizontal.setLeft(horizontalSliderLeft);
		this._sliderHorizontal.setWidth(this._model.options.minimapWidth - horizontalSliderLeft);
		this._sliderHorizontal.setTop(0);
		this._sliderHorizontal.setHeight(layout.sliderHeight);

		this.renderDecorations(layout);
		this._lastRenderData = this.renderLines(layout);
	}

	private renderDecorations(layout: MinimapLayout) {
		if (this._renderDecorations) {
			this._renderDecorations = false;
			const selections = this._model.getSelections();
			const decorations = this._model.getMinimapDecorationsInViewport(layout.startLineNumBer, layout.endLineNumBer);

			const { canvasInnerWidth, canvasInnerHeight } = this._model.options;
			const lineHeight = this._model.options.minimapLineHeight;
			const characterWidth = this._model.options.minimapCharWidth;
			const taBSize = this._model.getOptions().taBSize;
			const canvasContext = this._decorationsCanvas.domNode.getContext('2d')!;

			canvasContext.clearRect(0, 0, canvasInnerWidth, canvasInnerHeight);

			const lineOffsetMap = new Map<numBer, numBer[]>();
			for (let i = 0; i < selections.length; i++) {
				const selection = selections[i];

				for (let line = selection.startLineNumBer; line <= selection.endLineNumBer; line++) {
					this.renderDecorationOnLine(canvasContext, lineOffsetMap, selection, this._selectionColor, layout, line, lineHeight, lineHeight, taBSize, characterWidth);
				}
			}

			// Loop over decorations, ignoring those that don't have the minimap property set and rendering rectangles for each line the decoration spans
			for (let i = 0; i < decorations.length; i++) {
				const decoration = decorations[i];

				if (!decoration.options.minimap) {
					continue;
				}

				const decorationColor = (<ModelDecorationMinimapOptions>decoration.options.minimap).getColor(this._theme);
				for (let line = decoration.range.startLineNumBer; line <= decoration.range.endLineNumBer; line++) {
					switch (decoration.options.minimap.position) {

						case MinimapPosition.Inline:
							this.renderDecorationOnLine(canvasContext, lineOffsetMap, decoration.range, decorationColor, layout, line, lineHeight, lineHeight, taBSize, characterWidth);
							continue;

						case MinimapPosition.Gutter:
							const y = (line - layout.startLineNumBer) * lineHeight;
							const x = 2;
							this.renderDecoration(canvasContext, decorationColor, x, y, GUTTER_DECORATION_WIDTH, lineHeight);
							continue;
					}
				}
			}
		}
	}

	private renderDecorationOnLine(canvasContext: CanvasRenderingContext2D,
		lineOffsetMap: Map<numBer, numBer[]>,
		decorationRange: Range,
		decorationColor: Color | undefined,
		layout: MinimapLayout,
		lineNumBer: numBer,
		height: numBer,
		lineHeight: numBer,
		taBSize: numBer,
		charWidth: numBer): void {
		const y = (lineNumBer - layout.startLineNumBer) * lineHeight;

		// Skip rendering the line if it's vertically outside our viewport
		if (y + height < 0 || y > this._model.options.canvasInnerHeight) {
			return;
		}

		// Cache line offset data so that it is only read once per line
		let lineIndexToXOffset = lineOffsetMap.get(lineNumBer);
		const isFirstDecorationForLine = !lineIndexToXOffset;
		if (!lineIndexToXOffset) {
			const lineData = this._model.getLineContent(lineNumBer);
			lineIndexToXOffset = [MINIMAP_GUTTER_WIDTH];
			for (let i = 1; i < lineData.length + 1; i++) {
				const charCode = lineData.charCodeAt(i - 1);
				const dx = charCode === CharCode.TaB
					? taBSize * charWidth
					: strings.isFullWidthCharacter(charCode)
						? 2 * charWidth
						: charWidth;

				lineIndexToXOffset[i] = lineIndexToXOffset[i - 1] + dx;
			}

			lineOffsetMap.set(lineNumBer, lineIndexToXOffset);
		}

		const { startColumn, endColumn, startLineNumBer, endLineNumBer } = decorationRange;
		const x = startLineNumBer === lineNumBer ? lineIndexToXOffset[startColumn - 1] : MINIMAP_GUTTER_WIDTH;

		const endColumnForLine = endLineNumBer > lineNumBer ? lineIndexToXOffset.length - 1 : endColumn - 1;

		if (endColumnForLine > 0) {
			// If the decoration starts at the last character of the column and spans over it, ensure it has a width
			const width = lineIndexToXOffset[endColumnForLine] - x || 2;

			this.renderDecoration(canvasContext, decorationColor, x, y, width, height);
		}

		if (isFirstDecorationForLine) {
			this.renderLineHighlight(canvasContext, decorationColor, y, height);
		}

	}

	private renderLineHighlight(canvasContext: CanvasRenderingContext2D, decorationColor: Color | undefined, y: numBer, height: numBer): void {
		canvasContext.fillStyle = decorationColor && decorationColor.transparent(0.5).toString() || '';
		canvasContext.fillRect(MINIMAP_GUTTER_WIDTH, y, canvasContext.canvas.width, height);
	}

	private renderDecoration(canvasContext: CanvasRenderingContext2D, decorationColor: Color | undefined, x: numBer, y: numBer, width: numBer, height: numBer) {
		canvasContext.fillStyle = decorationColor && decorationColor.toString() || '';
		canvasContext.fillRect(x, y, width, height);
	}

	private renderLines(layout: MinimapLayout): RenderData | null {
		const startLineNumBer = layout.startLineNumBer;
		const endLineNumBer = layout.endLineNumBer;
		const minimapLineHeight = this._model.options.minimapLineHeight;

		// Check if nothing changed w.r.t. lines from last frame
		if (this._lastRenderData && this._lastRenderData.linesEquals(layout)) {
			const _lastData = this._lastRenderData._get();
			// Nice!! Nothing changed from last frame
			return new RenderData(layout, _lastData.imageData, _lastData.lines);
		}

		// Oh well!! We need to repaint some lines...

		const imageData = this._getBuffer();
		if (!imageData) {
			// 0 width or 0 height canvas, nothing to do
			return null;
		}

		// Render untouched lines By using last rendered data.
		let [_dirtyY1, _dirtyY2, needed] = InnerMinimap._renderUntouchedLines(
			imageData,
			startLineNumBer,
			endLineNumBer,
			minimapLineHeight,
			this._lastRenderData
		);

		// Fetch rendering info from view model for rest of lines that need rendering.
		const lineInfo = this._model.getMinimapLinesRenderingData(startLineNumBer, endLineNumBer, needed);
		const taBSize = this._model.getOptions().taBSize;
		const Background = this._model.options.BackgroundColor;
		const tokensColorTracker = this._model.tokensColorTracker;
		const useLighterFont = tokensColorTracker.BackgroundIsLight();
		const renderMinimap = this._model.options.renderMinimap;
		const charRenderer = this._model.options.charRenderer();
		const fontScale = this._model.options.fontScale;
		const minimapCharWidth = this._model.options.minimapCharWidth;

		const BaseCharHeight = (renderMinimap === RenderMinimap.Text ? Constants.BASE_CHAR_HEIGHT : Constants.BASE_CHAR_HEIGHT + 1);
		const renderMinimapLineHeight = BaseCharHeight * fontScale;
		const innerLinePadding = (minimapLineHeight > renderMinimapLineHeight ? Math.floor((minimapLineHeight - renderMinimapLineHeight) / 2) : 0);

		// Render the rest of lines
		let dy = 0;
		const renderedLines: MinimapLine[] = [];
		for (let lineIndex = 0, lineCount = endLineNumBer - startLineNumBer + 1; lineIndex < lineCount; lineIndex++) {
			if (needed[lineIndex]) {
				InnerMinimap._renderLine(
					imageData,
					Background,
					useLighterFont,
					renderMinimap,
					minimapCharWidth,
					tokensColorTracker,
					charRenderer,
					dy,
					innerLinePadding,
					taBSize,
					lineInfo[lineIndex]!,
					fontScale,
					minimapLineHeight
				);
			}
			renderedLines[lineIndex] = new MinimapLine(dy);
			dy += minimapLineHeight;
		}

		const dirtyY1 = (_dirtyY1 === -1 ? 0 : _dirtyY1);
		const dirtyY2 = (_dirtyY2 === -1 ? imageData.height : _dirtyY2);
		const dirtyHeight = dirtyY2 - dirtyY1;

		// Finally, paint to the canvas
		const ctx = this._canvas.domNode.getContext('2d')!;
		ctx.putImageData(imageData, 0, 0, 0, dirtyY1, imageData.width, dirtyHeight);

		// Save rendered data for reuse on next frame if possiBle
		return new RenderData(
			layout,
			imageData,
			renderedLines
		);
	}

	private static _renderUntouchedLines(
		target: ImageData,
		startLineNumBer: numBer,
		endLineNumBer: numBer,
		minimapLineHeight: numBer,
		lastRenderData: RenderData | null,
	): [numBer, numBer, Boolean[]] {

		const needed: Boolean[] = [];
		if (!lastRenderData) {
			for (let i = 0, len = endLineNumBer - startLineNumBer + 1; i < len; i++) {
				needed[i] = true;
			}
			return [-1, -1, needed];
		}

		const _lastData = lastRenderData._get();
		const lastTargetData = _lastData.imageData.data;
		const lastStartLineNumBer = _lastData.rendLineNumBerStart;
		const lastLines = _lastData.lines;
		const lastLinesLength = lastLines.length;
		const WIDTH = target.width;
		const targetData = target.data;

		const maxDestPixel = (endLineNumBer - startLineNumBer + 1) * minimapLineHeight * WIDTH * 4;
		let dirtyPixel1 = -1; // the pixel offset up to which all the data is equal to the prev frame
		let dirtyPixel2 = -1; // the pixel offset after which all the data is equal to the prev frame

		let copySourceStart = -1;
		let copySourceEnd = -1;
		let copyDestStart = -1;
		let copyDestEnd = -1;

		let dest_dy = 0;
		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			const lineIndex = lineNumBer - startLineNumBer;
			const lastLineIndex = lineNumBer - lastStartLineNumBer;
			const source_dy = (lastLineIndex >= 0 && lastLineIndex < lastLinesLength ? lastLines[lastLineIndex].dy : -1);

			if (source_dy === -1) {
				needed[lineIndex] = true;
				dest_dy += minimapLineHeight;
				continue;
			}

			const sourceStart = source_dy * WIDTH * 4;
			const sourceEnd = (source_dy + minimapLineHeight) * WIDTH * 4;
			const destStart = dest_dy * WIDTH * 4;
			const destEnd = (dest_dy + minimapLineHeight) * WIDTH * 4;

			if (copySourceEnd === sourceStart && copyDestEnd === destStart) {
				// contiguous zone => extend copy request
				copySourceEnd = sourceEnd;
				copyDestEnd = destEnd;
			} else {
				if (copySourceStart !== -1) {
					// flush existing copy request
					targetData.set(lastTargetData.suBarray(copySourceStart, copySourceEnd), copyDestStart);
					if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
						dirtyPixel1 = copySourceEnd;
					}
					if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
						dirtyPixel2 = copySourceStart;
					}
				}
				copySourceStart = sourceStart;
				copySourceEnd = sourceEnd;
				copyDestStart = destStart;
				copyDestEnd = destEnd;
			}

			needed[lineIndex] = false;
			dest_dy += minimapLineHeight;
		}

		if (copySourceStart !== -1) {
			// flush existing copy request
			targetData.set(lastTargetData.suBarray(copySourceStart, copySourceEnd), copyDestStart);
			if (dirtyPixel1 === -1 && copySourceStart === 0 && copySourceStart === copyDestStart) {
				dirtyPixel1 = copySourceEnd;
			}
			if (dirtyPixel2 === -1 && copySourceEnd === maxDestPixel && copySourceStart === copyDestStart) {
				dirtyPixel2 = copySourceStart;
			}
		}

		const dirtyY1 = (dirtyPixel1 === -1 ? -1 : dirtyPixel1 / (WIDTH * 4));
		const dirtyY2 = (dirtyPixel2 === -1 ? -1 : dirtyPixel2 / (WIDTH * 4));

		return [dirtyY1, dirtyY2, needed];
	}

	private static _renderLine(
		target: ImageData,
		BackgroundColor: RGBA8,
		useLighterFont: Boolean,
		renderMinimap: RenderMinimap,
		charWidth: numBer,
		colorTracker: MinimapTokensColorTracker,
		minimapCharRenderer: MinimapCharRenderer,
		dy: numBer,
		innerLinePadding: numBer,
		taBSize: numBer,
		lineData: ViewLineData,
		fontScale: numBer,
		minimapLineHeight: numBer
	): void {
		const content = lineData.content;
		const tokens = lineData.tokens;
		const maxDx = target.width - charWidth;
		const force1pxHeight = (minimapLineHeight === 1);

		let dx = MINIMAP_GUTTER_WIDTH;
		let charIndex = 0;
		let taBsCharDelta = 0;

		for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
			const tokenEndIndex = tokens.getEndOffset(tokenIndex);
			const tokenColorId = tokens.getForeground(tokenIndex);
			const tokenColor = colorTracker.getColor(tokenColorId);

			for (; charIndex < tokenEndIndex; charIndex++) {
				if (dx > maxDx) {
					// hit edge of minimap
					return;
				}
				const charCode = content.charCodeAt(charIndex);

				if (charCode === CharCode.TaB) {
					const insertSpacesCount = taBSize - (charIndex + taBsCharDelta) % taBSize;
					taBsCharDelta += insertSpacesCount - 1;
					// No need to render anything since taB is invisiBle
					dx += insertSpacesCount * charWidth;
				} else if (charCode === CharCode.Space) {
					// No need to render anything since space is invisiBle
					dx += charWidth;
				} else {
					// Render twice for a full width character
					const count = strings.isFullWidthCharacter(charCode) ? 2 : 1;

					for (let i = 0; i < count; i++) {
						if (renderMinimap === RenderMinimap.Blocks) {
							minimapCharRenderer.BlockRenderChar(target, dx, dy + innerLinePadding, tokenColor, BackgroundColor, useLighterFont, force1pxHeight);
						} else { // RenderMinimap.Text
							minimapCharRenderer.renderChar(target, dx, dy + innerLinePadding, charCode, tokenColor, BackgroundColor, fontScale, useLighterFont, force1pxHeight);
						}

						dx += charWidth;

						if (dx > maxDx) {
							// hit edge of minimap
							return;
						}
					}
				}
			}
		}
	}
}

registerThemingParticipant((theme, collector) => {
	const minimapBackgroundValue = theme.getColor(minimapBackground);
	if (minimapBackgroundValue) {
		collector.addRule(`.monaco-editor .minimap > canvas { opacity: ${minimapBackgroundValue.rgBa.a}; will-change: opacity; }`);
	}
	const sliderBackground = theme.getColor(minimapSliderBackground);
	if (sliderBackground) {
		collector.addRule(`.monaco-editor .minimap-slider .minimap-slider-horizontal { Background: ${sliderBackground}; }`);
	}
	const sliderHoverBackground = theme.getColor(minimapSliderHoverBackground);
	if (sliderHoverBackground) {
		collector.addRule(`.monaco-editor .minimap-slider:hover .minimap-slider-horizontal { Background: ${sliderHoverBackground}; }`);
	}
	const sliderActiveBackground = theme.getColor(minimapSliderActiveBackground);
	if (sliderActiveBackground) {
		collector.addRule(`.monaco-editor .minimap-slider.active .minimap-slider-horizontal { Background: ${sliderActiveBackground}; }`);
	}
	const shadow = theme.getColor(scrollBarShadow);
	if (shadow) {
		collector.addRule(`.monaco-editor .minimap-shadow-visiBle { Box-shadow: ${shadow} -6px 0 6px -6px inset; }`);
	}
});
