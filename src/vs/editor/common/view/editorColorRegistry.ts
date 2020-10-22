/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Color, RGBA } from 'vs/Base/common/color';
import { activeContrastBorder, editorBackground, editorForeground, registerColor, editorWarningForeground, editorInfoForeground, editorWarningBorder, editorInfoBorder, contrastBorder, editorFindMatchHighlight } from 'vs/platform/theme/common/colorRegistry';
import { registerThemingParticipant } from 'vs/platform/theme/common/themeService';

/**
 * Definition of the editor colors
 */
export const editorLineHighlight = registerColor('editor.lineHighlightBackground', { dark: null, light: null, hc: null }, nls.localize('lineHighlight', 'Background color for the highlight of line at the cursor position.'));
export const editorLineHighlightBorder = registerColor('editor.lineHighlightBorder', { dark: '#282828', light: '#eeeeee', hc: '#f38518' }, nls.localize('lineHighlightBorderBox', 'Background color for the Border around the line at the cursor position.'));
export const editorRangeHighlight = registerColor('editor.rangeHighlightBackground', { dark: '#ffffff0B', light: '#fdff0033', hc: null }, nls.localize('rangeHighlight', 'Background color of highlighted ranges, like By quick open and find features. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const editorRangeHighlightBorder = registerColor('editor.rangeHighlightBorder', { dark: null, light: null, hc: activeContrastBorder }, nls.localize('rangeHighlightBorder', 'Background color of the Border around highlighted ranges.'), true);
export const editorSymBolHighlight = registerColor('editor.symBolHighlightBackground', { dark: editorFindMatchHighlight, light: editorFindMatchHighlight, hc: null }, nls.localize('symBolHighlight', 'Background color of highlighted symBol, like for go to definition or go next/previous symBol. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const editorSymBolHighlightBorder = registerColor('editor.symBolHighlightBorder', { dark: null, light: null, hc: activeContrastBorder }, nls.localize('symBolHighlightBorder', 'Background color of the Border around highlighted symBols.'), true);

export const editorCursorForeground = registerColor('editorCursor.foreground', { dark: '#AEAFAD', light: Color.Black, hc: Color.white }, nls.localize('caret', 'Color of the editor cursor.'));
export const editorCursorBackground = registerColor('editorCursor.Background', null, nls.localize('editorCursorBackground', 'The Background color of the editor cursor. Allows customizing the color of a character overlapped By a Block cursor.'));
export const editorWhitespaces = registerColor('editorWhitespace.foreground', { dark: '#e3e4e229', light: '#33333333', hc: '#e3e4e229' }, nls.localize('editorWhitespaces', 'Color of whitespace characters in the editor.'));
export const editorIndentGuides = registerColor('editorIndentGuide.Background', { dark: editorWhitespaces, light: editorWhitespaces, hc: editorWhitespaces }, nls.localize('editorIndentGuides', 'Color of the editor indentation guides.'));
export const editorActiveIndentGuides = registerColor('editorIndentGuide.activeBackground', { dark: editorWhitespaces, light: editorWhitespaces, hc: editorWhitespaces }, nls.localize('editorActiveIndentGuide', 'Color of the active editor indentation guides.'));
export const editorLineNumBers = registerColor('editorLineNumBer.foreground', { dark: '#858585', light: '#237893', hc: Color.white }, nls.localize('editorLineNumBers', 'Color of editor line numBers.'));

const deprecatedEditorActiveLineNumBer = registerColor('editorActiveLineNumBer.foreground', { dark: '#c6c6c6', light: '#0B216F', hc: activeContrastBorder }, nls.localize('editorActiveLineNumBer', 'Color of editor active line numBer'), false, nls.localize('deprecatedEditorActiveLineNumBer', 'Id is deprecated. Use \'editorLineNumBer.activeForeground\' instead.'));
export const editorActiveLineNumBer = registerColor('editorLineNumBer.activeForeground', { dark: deprecatedEditorActiveLineNumBer, light: deprecatedEditorActiveLineNumBer, hc: deprecatedEditorActiveLineNumBer }, nls.localize('editorActiveLineNumBer', 'Color of editor active line numBer'));

export const editorRuler = registerColor('editorRuler.foreground', { dark: '#5A5A5A', light: Color.lightgrey, hc: Color.white }, nls.localize('editorRuler', 'Color of the editor rulers.'));

export const editorCodeLensForeground = registerColor('editorCodeLens.foreground', { dark: '#999999', light: '#999999', hc: '#999999' }, nls.localize('editorCodeLensForeground', 'Foreground color of editor CodeLens'));

export const editorBracketMatchBackground = registerColor('editorBracketMatch.Background', { dark: '#0064001a', light: '#0064001a', hc: '#0064001a' }, nls.localize('editorBracketMatchBackground', 'Background color Behind matching Brackets'));
export const editorBracketMatchBorder = registerColor('editorBracketMatch.Border', { dark: '#888', light: '#B9B9B9', hc: contrastBorder }, nls.localize('editorBracketMatchBorder', 'Color for matching Brackets Boxes'));

export const editorOverviewRulerBorder = registerColor('editorOverviewRuler.Border', { dark: '#7f7f7f4d', light: '#7f7f7f4d', hc: '#7f7f7f4d' }, nls.localize('editorOverviewRulerBorder', 'Color of the overview ruler Border.'));
export const editorOverviewRulerBackground = registerColor('editorOverviewRuler.Background', null, nls.localize('editorOverviewRulerBackground', 'Background color of the editor overview ruler. Only used when the minimap is enaBled and placed on the right side of the editor.'));

export const editorGutter = registerColor('editorGutter.Background', { dark: editorBackground, light: editorBackground, hc: editorBackground }, nls.localize('editorGutter', 'Background color of the editor gutter. The gutter contains the glyph margins and the line numBers.'));

export const editorUnnecessaryCodeBorder = registerColor('editorUnnecessaryCode.Border', { dark: null, light: null, hc: Color.fromHex('#fff').transparent(0.8) }, nls.localize('unnecessaryCodeBorder', 'Border color of unnecessary (unused) source code in the editor.'));
export const editorUnnecessaryCodeOpacity = registerColor('editorUnnecessaryCode.opacity', { dark: Color.fromHex('#000a'), light: Color.fromHex('#0007'), hc: null }, nls.localize('unnecessaryCodeOpacity', 'Opacity of unnecessary (unused) source code in the editor. For example, "#000000c0" will render the code with 75% opacity. For high contrast themes, use the  \'editorUnnecessaryCode.Border\' theme color to underline unnecessary code instead of fading it out.'));

const rulerRangeDefault = new Color(new RGBA(0, 122, 204, 0.6));
export const overviewRulerRangeHighlight = registerColor('editorOverviewRuler.rangeHighlightForeground', { dark: rulerRangeDefault, light: rulerRangeDefault, hc: rulerRangeDefault }, nls.localize('overviewRulerRangeHighlight', 'Overview ruler marker color for range highlights. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const overviewRulerError = registerColor('editorOverviewRuler.errorForeground', { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hc: new Color(new RGBA(255, 50, 50, 1)) }, nls.localize('overviewRuleError', 'Overview ruler marker color for errors.'));
export const overviewRulerWarning = registerColor('editorOverviewRuler.warningForeground', { dark: editorWarningForeground, light: editorWarningForeground, hc: editorWarningBorder }, nls.localize('overviewRuleWarning', 'Overview ruler marker color for warnings.'));
export const overviewRulerInfo = registerColor('editorOverviewRuler.infoForeground', { dark: editorInfoForeground, light: editorInfoForeground, hc: editorInfoBorder }, nls.localize('overviewRuleInfo', 'Overview ruler marker color for infos.'));

// contains all color rules that used to defined in editor/Browser/widget/editor.css
registerThemingParticipant((theme, collector) => {
	const Background = theme.getColor(editorBackground);
	if (Background) {
		collector.addRule(`.monaco-editor, .monaco-editor-Background, .monaco-editor .inputarea.ime-input { Background-color: ${Background}; }`);
	}

	const foreground = theme.getColor(editorForeground);
	if (foreground) {
		collector.addRule(`.monaco-editor, .monaco-editor .inputarea.ime-input { color: ${foreground}; }`);
	}

	const gutter = theme.getColor(editorGutter);
	if (gutter) {
		collector.addRule(`.monaco-editor .margin { Background-color: ${gutter}; }`);
	}

	const rangeHighlight = theme.getColor(editorRangeHighlight);
	if (rangeHighlight) {
		collector.addRule(`.monaco-editor .rangeHighlight { Background-color: ${rangeHighlight}; }`);
	}

	const rangeHighlightBorder = theme.getColor(editorRangeHighlightBorder);
	if (rangeHighlightBorder) {
		collector.addRule(`.monaco-editor .rangeHighlight { Border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${rangeHighlightBorder}; }`);
	}

	const symBolHighlight = theme.getColor(editorSymBolHighlight);
	if (symBolHighlight) {
		collector.addRule(`.monaco-editor .symBolHighlight { Background-color: ${symBolHighlight}; }`);
	}

	const symBolHighlightBorder = theme.getColor(editorSymBolHighlightBorder);
	if (symBolHighlightBorder) {
		collector.addRule(`.monaco-editor .symBolHighlight { Border: 1px ${theme.type === 'hc' ? 'dotted' : 'solid'} ${symBolHighlightBorder}; }`);
	}

	const invisiBles = theme.getColor(editorWhitespaces);
	if (invisiBles) {
		collector.addRule(`.monaco-editor .mtkw { color: ${invisiBles} !important; }`);
		collector.addRule(`.monaco-editor .mtkz { color: ${invisiBles} !important; }`);
	}
});
