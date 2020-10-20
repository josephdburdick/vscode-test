/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { EditorLAyoutInfo, EditorLAyoutInfoComputer, RenderMinimAp, EditorOption, EditorMinimApOptions, InternAlEditorScrollbArOptions, EditorOptions, RenderLineNumbersType, InternAlEditorRenderLineNumbersOptions } from 'vs/editor/common/config/editorOptions';
import { ComputedEditorOptions } from 'vs/editor/common/config/commonEditorConfig';

interfAce IEditorLAyoutProviderOpts {
	reAdonly outerWidth: number;
	reAdonly outerHeight: number;

	reAdonly showGlyphMArgin: booleAn;
	reAdonly lineHeight: number;

	reAdonly showLineNumbers: booleAn;
	reAdonly lineNumbersMinChArs: number;
	reAdonly lineNumbersDigitCount: number;
	mAxLineNumber?: number;

	reAdonly lineDecorAtionsWidth: number;

	reAdonly typicAlHAlfwidthChArActerWidth: number;
	reAdonly mAxDigitWidth: number;

	reAdonly verticAlScrollbArWidth: number;
	reAdonly verticAlScrollbArHAsArrows: booleAn;
	reAdonly scrollbArArrowSize: number;
	reAdonly horizontAlScrollbArHeight: number;

	reAdonly minimAp: booleAn;
	reAdonly minimApSide: 'left' | 'right';
	reAdonly minimApRenderChArActers: booleAn;
	reAdonly minimApMAxColumn: number;
	minimApSize?: 'proportionAl' | 'fill' | 'fit';
	reAdonly pixelRAtio: number;
}

suite('Editor ViewLAyout - EditorLAyoutProvider', () => {

	function doTest(input: IEditorLAyoutProviderOpts, expected: EditorLAyoutInfo): void {
		const options = new ComputedEditorOptions();
		options._write(EditorOption.glyphMArgin, input.showGlyphMArgin);
		options._write(EditorOption.lineNumbersMinChArs, input.lineNumbersMinChArs);
		options._write(EditorOption.lineDecorAtionsWidth, input.lineDecorAtionsWidth);
		options._write(EditorOption.folding, fAlse);
		const minimApOptions: EditorMinimApOptions = {
			enAbled: input.minimAp,
			size: input.minimApSize || 'proportionAl',
			side: input.minimApSide,
			renderChArActers: input.minimApRenderChArActers,
			mAxColumn: input.minimApMAxColumn,
			showSlider: 'mouseover',
			scAle: 1,
		};
		options._write(EditorOption.minimAp, minimApOptions);
		const scrollbArOptions: InternAlEditorScrollbArOptions = {
			ArrowSize: input.scrollbArArrowSize,
			verticAl: EditorOptions.scrollbAr.defAultVAlue.verticAl,
			horizontAl: EditorOptions.scrollbAr.defAultVAlue.horizontAl,
			useShAdows: EditorOptions.scrollbAr.defAultVAlue.useShAdows,
			verticAlHAsArrows: input.verticAlScrollbArHAsArrows,
			horizontAlHAsArrows: fAlse,
			hAndleMouseWheel: EditorOptions.scrollbAr.defAultVAlue.hAndleMouseWheel,
			AlwAysConsumeMouseWheel: true,
			horizontAlScrollbArSize: input.horizontAlScrollbArHeight,
			horizontAlSliderSize: EditorOptions.scrollbAr.defAultVAlue.horizontAlSliderSize,
			verticAlScrollbArSize: input.verticAlScrollbArWidth,
			verticAlSliderSize: EditorOptions.scrollbAr.defAultVAlue.verticAlSliderSize,
		};
		options._write(EditorOption.scrollbAr, scrollbArOptions);
		const lineNumbersOptions: InternAlEditorRenderLineNumbersOptions = {
			renderType: input.showLineNumbers ? RenderLineNumbersType.On : RenderLineNumbersType.Off,
			renderFn: null
		};
		options._write(EditorOption.lineNumbers, lineNumbersOptions);

		options._write(EditorOption.wordWrAp, 'off');
		options._write(EditorOption.wordWrApColumn, 80);
		options._write(EditorOption.wordWrApMinified, true);
		options._write(EditorOption.AccessibilitySupport, 'Auto');

		const ActuAl = EditorLAyoutInfoComputer.computeLAyout(options, {
			memory: null,
			outerWidth: input.outerWidth,
			outerHeight: input.outerHeight,
			isDominAtedByLongLines: fAlse,
			lineHeight: input.lineHeight,
			viewLineCount: input.mAxLineNumber || MAth.pow(10, input.lineNumbersDigitCount) - 1,
			lineNumbersDigitCount: input.lineNumbersDigitCount,
			typicAlHAlfwidthChArActerWidth: input.typicAlHAlfwidthChArActerWidth,
			mAxDigitWidth: input.mAxDigitWidth,
			pixelRAtio: input.pixelRAtio,
		});
		Assert.deepEquAl(ActuAl, expected);
	}

	test('EditorLAyoutProvider 1', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 990,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 800,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 98,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 1.1', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 11,
			horizontAlScrollbArHeight: 12,
			scrollbArArrowSize: 13,
			verticAlScrollbArHAsArrows: true,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 990,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 800,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 97,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 11,
			horizontAlScrollbArHeight: 12,

			overviewRuler: {
				top: 13,
				width: 11,
				height: (800 - 2 * 13),
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 2', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 800,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 88,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 3', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 88,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 4', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 890,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 88,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 5', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: true,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 50,

			decorAtionsLeft: 50,
			decorAtionsWidth: 10,

			contentLeft: 60,
			contentWidth: 840,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 83,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 6', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: true,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 5,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 50,

			decorAtionsLeft: 50,
			decorAtionsWidth: 10,

			contentLeft: 60,
			contentWidth: 840,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 83,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 7', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: true,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 6,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 60,

			decorAtionsLeft: 60,
			decorAtionsWidth: 10,

			contentLeft: 70,
			contentWidth: 830,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 82,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 8', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: true,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 6,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 5,
			mAxDigitWidth: 5,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 30,

			decorAtionsLeft: 30,
			decorAtionsWidth: 10,

			contentLeft: 40,
			contentWidth: 860,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 171,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 8 - rounds floAts', () => {
		doTest({
			outerWidth: 900,
			outerHeight: 900,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: true,
			lineNumbersMinChArs: 5,
			lineNumbersDigitCount: 6,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 5.05,
			mAxDigitWidth: 5.05,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: fAlse,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 900,
			height: 900,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 30,

			decorAtionsLeft: 30,
			decorAtionsWidth: 10,

			contentLeft: 40,
			contentWidth: 860,

			minimAp: {
				renderMinimAp: RenderMinimAp.None,
				minimApLeft: 0,
				minimApWidth: 0,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 0,
				minimApCAnvAsInnerHeight: 900,
				minimApCAnvAsOuterWidth: 0,
				minimApCAnvAsOuterHeight: 900,
			},

			viewportColumn: 169,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 900,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 9 - render minimAp', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 1,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 903,
				minimApWidth: 97,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 1,
				minimApLineHeight: 2,
				minimApCAnvAsInnerWidth: 97,
				minimApCAnvAsInnerHeight: 800,
				minimApCAnvAsOuterWidth: 97,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 9 - render minimAp with pixelRAtio = 2', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 903,
				minimApWidth: 97,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 2,
				minimApLineHeight: 4,
				minimApCAnvAsInnerWidth: 194,
				minimApCAnvAsInnerHeight: 1600,
				minimApCAnvAsOuterWidth: 97,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 9 - render minimAp with pixelRAtio = 4', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 4,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 945,
				minimApWidth: 55,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 2,
				minimApLineHeight: 4,
				minimApCAnvAsInnerWidth: 220,
				minimApCAnvAsInnerHeight: 3200,
				minimApCAnvAsOuterWidth: 55,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 10 - render minimAp to left', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'left',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			pixelRAtio: 4,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 55,
			glyphMArginWidth: 0,

			lineNumbersLeft: 55,
			lineNumbersWidth: 0,

			decorAtionsLeft: 55,
			decorAtionsWidth: 10,

			contentLeft: 65,
			contentWidth: 935,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 0,
				minimApWidth: 55,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 2,
				minimApLineHeight: 4,
				minimApCAnvAsInnerWidth: 220,
				minimApCAnvAsInnerHeight: 3200,
				minimApCAnvAsOuterWidth: 55,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 11 - minimAp mode cover without sAmpling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 3,
			mAxLineNumber: 120,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			minimApSize: 'fill',
			pixelRAtio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 903,
				minimApWidth: 97,
				minimApHeightIsEditorHeight: true,
				minimApIsSAmpling: fAlse,
				minimApScAle: 3,
				minimApLineHeight: 13,
				minimApCAnvAsInnerWidth: 291,
				minimApCAnvAsInnerHeight: 1560,
				minimApCAnvAsOuterWidth: 97,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 12 - minimAp mode cover with sAmpling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 4,
			mAxLineNumber: 2500,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			minimApSize: 'fill',
			pixelRAtio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 945,
				minimApWidth: 55,
				minimApHeightIsEditorHeight: true,
				minimApIsSAmpling: true,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 110,
				minimApCAnvAsInnerHeight: 1600,
				minimApCAnvAsOuterWidth: 55,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 13 - minimAp mode contAin without sAmpling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 3,
			mAxLineNumber: 120,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			minimApSize: 'fit',
			pixelRAtio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 893,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 903,
				minimApWidth: 97,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 2,
				minimApLineHeight: 4,
				minimApCAnvAsInnerWidth: 194,
				minimApCAnvAsInnerHeight: 1600,
				minimApCAnvAsOuterWidth: 97,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 89,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('EditorLAyoutProvider 14 - minimAp mode contAin with sAmpling', () => {
		doTest({
			outerWidth: 1000,
			outerHeight: 800,
			showGlyphMArgin: fAlse,
			lineHeight: 16,
			showLineNumbers: fAlse,
			lineNumbersMinChArs: 0,
			lineNumbersDigitCount: 4,
			mAxLineNumber: 2500,
			lineDecorAtionsWidth: 10,
			typicAlHAlfwidthChArActerWidth: 10,
			mAxDigitWidth: 10,
			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,
			scrollbArArrowSize: 0,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 150,
			minimApSize: 'fit',
			pixelRAtio: 2,
		}, {
			width: 1000,
			height: 800,

			glyphMArginLeft: 0,
			glyphMArginWidth: 0,

			lineNumbersLeft: 0,
			lineNumbersWidth: 0,

			decorAtionsLeft: 0,
			decorAtionsWidth: 10,

			contentLeft: 10,
			contentWidth: 935,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 945,
				minimApWidth: 55,
				minimApHeightIsEditorHeight: true,
				minimApIsSAmpling: true,
				minimApScAle: 1,
				minimApLineHeight: 1,
				minimApCAnvAsInnerWidth: 110,
				minimApCAnvAsInnerHeight: 1600,
				minimApCAnvAsOuterWidth: 55,
				minimApCAnvAsOuterHeight: 800,
			},

			viewportColumn: 93,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 0,
			horizontAlScrollbArHeight: 0,

			overviewRuler: {
				top: 0,
				width: 0,
				height: 800,
				right: 0
			}
		});
	});

	test('issue #31312: When wrApping, leAve 2px for the cursor', () => {
		doTest({
			outerWidth: 1201,
			outerHeight: 422,
			showGlyphMArgin: true,
			lineHeight: 30,
			showLineNumbers: true,
			lineNumbersMinChArs: 3,
			lineNumbersDigitCount: 1,
			lineDecorAtionsWidth: 26,
			typicAlHAlfwidthChArActerWidth: 12.04296875,
			mAxDigitWidth: 12.04296875,
			verticAlScrollbArWidth: 14,
			horizontAlScrollbArHeight: 10,
			scrollbArArrowSize: 11,
			verticAlScrollbArHAsArrows: fAlse,
			minimAp: true,
			minimApSide: 'right',
			minimApRenderChArActers: true,
			minimApMAxColumn: 120,
			pixelRAtio: 2
		}, {
			width: 1201,
			height: 422,

			glyphMArginLeft: 0,
			glyphMArginWidth: 30,

			lineNumbersLeft: 30,
			lineNumbersWidth: 36,

			decorAtionsLeft: 66,
			decorAtionsWidth: 26,

			contentLeft: 92,
			contentWidth: 1018,

			minimAp: {
				renderMinimAp: RenderMinimAp.Text,
				minimApLeft: 1096,
				minimApWidth: 91,
				minimApHeightIsEditorHeight: fAlse,
				minimApIsSAmpling: fAlse,
				minimApScAle: 2,
				minimApLineHeight: 4,
				minimApCAnvAsInnerWidth: 182,
				minimApCAnvAsInnerHeight: 844,
				minimApCAnvAsOuterWidth: 91,
				minimApCAnvAsOuterHeight: 422,
			},

			viewportColumn: 83,
			isWordWrApMinified: fAlse,
			isViewportWrApping: fAlse,
			wrAppingColumn: -1,

			verticAlScrollbArWidth: 14,
			horizontAlScrollbArHeight: 10,

			overviewRuler: {
				top: 0,
				width: 14,
				height: 422,
				right: 0
			}
		});

	});
});
