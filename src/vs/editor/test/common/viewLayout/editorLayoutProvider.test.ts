/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { EditorLayoutInfo, EditorLayoutInfoComputer, RenderMinimap, EditorOption, EditorMinimapOptions, InternalEditorScrollBarOptions, EditorOptions, RenderLineNumBersType, InternalEditorRenderLineNumBersOptions } from 'vs/editor/common/config/editorOptions';
import { ComputedEditorOptions } from 'vs/editor/common/config/commonEditorConfig';

interface IEditorLayoutProviderOpts {
	readonly outerWidth: numBer;
	readonly outerHeight: numBer;

	readonly showGlyphMargin: Boolean;
	readonly lineHeight: numBer;

	readonly showLineNumBers: Boolean;
	readonly lineNumBersMinChars: numBer;
	readonly lineNumBersDigitCount: numBer;
	maxLineNumBer?: numBer;

	readonly lineDecorationsWidth: numBer;

	readonly typicalHalfwidthCharacterWidth: numBer;
	readonly maxDigitWidth: numBer;

	readonly verticalScrollBarWidth: numBer;
	readonly verticalScrollBarHasArrows: Boolean;
	readonly scrollBarArrowSize: numBer;
	readonly horizontalScrollBarHeight: numBer;

	readonly minimap: Boolean;
	readonly minimapSide: 'left' | 'right';
	readonly minimapRenderCharacters: Boolean;
	readonly minimapMaxColumn: numBer;
	minimapSize?: 'proportional' | 'fill' | 'fit';
	readonly pixelRatio: numBer;
}

suite('Editor ViewLayout - EditorLayoutProvider', () => {

	function doTest(input: IEditorLayoutProviderOpts, expected: EditorLayoutInfo): void {
		const options = new ComputedEditorOptions();
		options._write(EditorOption.glyphMargin, input.showGlyphMargin);
		options._write(EditorOption.lineNumBersMinChars, input.lineNumBersMinChars);
		options._write(EditorOption.lineDecorationsWidth, input.lineDecorationsWidth);
		options._write(EditorOption.folding, false);
		const minimapOptions: EditorMinimapOptions = {
			enaBled: input.minimap,
			size: input.minimapSize || 'proportional',
			side: input.minimapSide,
			renderCharacters: input.minimapRenderCharacters,
			maxColumn: input.minimapMaxColumn,
			showSlider: 'mouseover',
			scale: 1,
		};
		options._write(EditorOption.minimap, minimapOptions);
		const scrollBarOptions: InternalEditorScrollBarOptions = {
			arrowSize: input.scrollBarArrowSize,
			vertical: EditorOptions.scrollBar.defaultValue.vertical,
			horizontal: EditorOptions.scrollBar.defaultValue.horizontal,
			useShadows: EditorOptions.scrollBar.defaultValue.useShadows,
			verticalHasArrows: input.verticalScrollBarHasArrows,
			horizontalHasArrows: false,
			handleMouseWheel: EditorOptions.scrollBar.defaultValue.handleMouseWheel,
			alwaysConsumeMouseWheel: true,
			horizontalScrollBarSize: input.horizontalScrollBarHeight,
			horizontalSliderSize: EditorOptions.scrollBar.defaultValue.horizontalSliderSize,
			verticalScrollBarSize: input.verticalScrollBarWidth,
			verticalSliderSize: EditorOptions.scrollBar.defaultValue.verticalSliderSize,
		};
		options._write(EditorOption.scrollBar, scrollBarOptions);
		const lineNumBersOptions: InternalEditorRenderLineNumBersOptions = {
			renderType: input.showLineNumBers ? RenderLineNumBersType.On : RenderLineNumBersType.Off,
			renderFn: null
		};
		options._write(EditorOption.lineNumBers, lineNumBersOptions);

		options._write(EditorOption.wordWrap, 'off');
		options._write(EditorOption.wordWrapColumn, 80);
		options._write(EditorOption.wordWrapMinified, true);
		options._write(EditorOption.accessiBilitySupport, 'auto');

		const actual = EditorLayoutInfoComputer.computeLayout(options, {
			memory: null,
			outerWidth: input.outerWidth,
			outerHeight: input.outerHeight,
			isDominatedByLongLines: false,
			lineHeight: input.lineHeight,
			viewLineCount: input.maxLineNumBer || Math.pow(10, input.lineNumBersDigitCount) - 1,
			lineNumBersDigitCount: input.lineNumBersDigitCount,
			typicalHalfwidthCharacterWidth: input.typicalHalfwidthCharacterWidth,
			maxDigitWidth: input.maxDigitWidth,
			pixelRatio: input.pixelRatio,
		});
		assert.deepEqual(actual, expected);
	}

	test('EditorLayoutProvider 1', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 990,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 800,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 98,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 1.1', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 11,
			horizontalScrollBarHeight: 12,
			scrollBarArrowSize: 13,
			verticalScrollBarHasArrows: true,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 990,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 800,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 97,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 11,
			horizontalScrollBarHeight: 12,

			overviewRuler: {
				top: 13,
				width: 11,
				height: (800 - 2 * 13),
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 2', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 800,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 88,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 3', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 88,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 4', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 88,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 5', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: true,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 50,

			decorationsLeft: 50,
			decorationsWidth: 10,

			contentLeft: 60,
			contentWidth: 840,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 83,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 6', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: true,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 5,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 50,

			decorationsLeft: 50,
			decorationsWidth: 10,

			contentLeft: 60,
			contentWidth: 840,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 83,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 7', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: true,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 6,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 60,

			decorationsLeft: 60,
			decorationsWidth: 10,

			contentLeft: 70,
			contentWidth: 830,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 82,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 8', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: true,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 6,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 5,
			maxDigitWidth: 5,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 30,

			decorationsLeft: 30,
			decorationsWidth: 10,

			contentLeft: 40,
			contentWidth: 860,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 171,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 8 - rounds floats', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: true,
			lineNumBersMinChars: 5,
			lineNumBersDigitCount: 6,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 5.05,
			maxDigitWidth: 5.05,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: false,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 30,

			decorationsLeft: 30,
			decorationsWidth: 10,

			contentLeft: 40,
			contentWidth: 860,

			minimap: {
				renderMinimap: RenderMinimap.None,
				minimapLeft: 0,
				minimapWidth: 0,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 0,
				minimapCanvasInnerHeight: 900,
				minimapCanvasOuterWidth: 0,
				minimapCanvasOuterHeight: 900,
			},

			viewportColumn: 169,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 9 - render minimap', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 903,
				minimapWidth: 97,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 1,
				minimapLineHeight: 2,
				minimapCanvasInnerWidth: 97,
				minimapCanvasInnerHeight: 800,
				minimapCanvasOuterWidth: 97,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 9 - render minimap with pixelRatio = 2', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 903,
				minimapWidth: 97,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 2,
				minimapLineHeight: 4,
				minimapCanvasInnerWidth: 194,
				minimapCanvasInnerHeight: 1600,
				minimapCanvasOuterWidth: 97,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 9 - render minimap with pixelRatio = 4', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 4,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 945,
				minimapWidth: 55,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 2,
				minimapLineHeight: 4,
				minimapCanvasInnerWidth: 220,
				minimapCanvasInnerHeight: 3200,
				minimapCanvasOuterWidth: 55,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 10 - render minimap to left', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'left',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			pixelRatio: 4,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 55,
			glyphMarginWidth: 0,

			lineNumBersLeft: 55,
			lineNumBersWidth: 0,

			decorationsLeft: 55,
			decorationsWidth: 10,

			contentLeft: 65,
			contentWidth: 935,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 0,
				minimapWidth: 55,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 2,
				minimapLineHeight: 4,
				minimapCanvasInnerWidth: 220,
				minimapCanvasInnerHeight: 3200,
				minimapCanvasOuterWidth: 55,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 11 - minimap mode cover without sampling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 3,
			maxLineNumBer: 120,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			minimapSize: 'fill',
			pixelRatio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 903,
				minimapWidth: 97,
				minimapHeightIsEditorHeight: true,
				minimapIsSampling: false,
				minimapScale: 3,
				minimapLineHeight: 13,
				minimapCanvasInnerWidth: 291,
				minimapCanvasInnerHeight: 1560,
				minimapCanvasOuterWidth: 97,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 12 - minimap mode cover with sampling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 4,
			maxLineNumBer: 2500,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			minimapSize: 'fill',
			pixelRatio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 945,
				minimapWidth: 55,
				minimapHeightIsEditorHeight: true,
				minimapIsSampling: true,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 110,
				minimapCanvasInnerHeight: 1600,
				minimapCanvasOuterWidth: 55,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 13 - minimap mode contain without sampling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 3,
			maxLineNumBer: 120,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			minimapSize: 'fit',
			pixelRatio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 903,
				minimapWidth: 97,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 2,
				minimapLineHeight: 4,
				minimapCanvasInnerWidth: 194,
				minimapCanvasInnerHeight: 1600,
				minimapCanvasOuterWidth: 97,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLayoutProvider 14 - minimap mode contain with sampling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMargin: false,
			lineHeight: 16,
			showLineNumBers: false,
			lineNumBersMinChars: 0,
			lineNumBersDigitCount: 4,
			maxLineNumBer: 2500,
			lineDecorationsWidth: 10,
			typicalHalfwidthCharacterWidth: 10,
			maxDigitWidth: 10,
			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,
			scrollBarArrowSize: 0,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 150,
			minimapSize: 'fit',
			pixelRatio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMarginLeft: 0,
			glyphMarginWidth: 0,

			lineNumBersLeft: 0,
			lineNumBersWidth: 0,

			decorationsLeft: 0,
			decorationsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 945,
				minimapWidth: 55,
				minimapHeightIsEditorHeight: true,
				minimapIsSampling: true,
				minimapScale: 1,
				minimapLineHeight: 1,
				minimapCanvasInnerWidth: 110,
				minimapCanvasInnerHeight: 1600,
				minimapCanvasOuterWidth: 55,
				minimapCanvasOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 0,
			horizontalScrollBarHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('issue #31312: When wrapping, leave 2px for the cursor', () => {
		doTest({
			outerWidth: 1201,
			outerHeight: 422,
			showGlyphMargin: true,
			lineHeight: 30,
			showLineNumBers: true,
			lineNumBersMinChars: 3,
			lineNumBersDigitCount: 1,
			lineDecorationsWidth: 26,
			typicalHalfwidthCharacterWidth: 12.04296875,
			maxDigitWidth: 12.04296875,
			verticalScrollBarWidth: 14,
			horizontalScrollBarHeight: 10,
			scrollBarArrowSize: 11,
			verticalScrollBarHasArrows: false,
			minimap: true,
			minimapSide: 'right',
			minimapRenderCharacters: true,
			minimapMaxColumn: 120,
			pixelRatio: 2
		}, {
			width: 1201,
			height: 422,

			glyphMarginLeft: 0,
			glyphMarginWidth: 30,

			lineNumBersLeft: 30,
			lineNumBersWidth: 36,

			decorationsLeft: 66,
			decorationsWidth: 26,

			contentLeft: 92,
			contentWidth: 1018,

			minimap: {
				renderMinimap: RenderMinimap.Text,
				minimapLeft: 1096,
				minimapWidth: 91,
				minimapHeightIsEditorHeight: false,
				minimapIsSampling: false,
				minimapScale: 2,
				minimapLineHeight: 4,
				minimapCanvasInnerWidth: 182,
				minimapCanvasInnerHeight: 844,
				minimapCanvasOuterWidth: 91,
				minimapCanvasOuterHeight: 422,
			},

			viewportColumn: 83,
			isWordWrapMinified: false,
			isViewportWrapping: false,
			wrappingColumn: -1,

			verticalScrollBarWidth: 14,
			horizontalScrollBarHeight: 10,

			overviewRuler: {
				top: 0,
				width: 14,
				height: 422,
				right: 0
			}
		});

	});
});
