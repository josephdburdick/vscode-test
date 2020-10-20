/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As plAtform from 'vs/plAtform/registry/common/plAtform';
import { IJSONSchemA, IJSONSchemAMAp } from 'vs/bAse/common/jsonSchemA';
import { Color, RGBA } from 'vs/bAse/common/color';
import { IColorTheme } from 'vs/plAtform/theme/common/themeService';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As nls from 'vs/nls';
import { Extensions As JSONExtensions, IJSONContributionRegistry } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { RunOnceScheduler } from 'vs/bAse/common/Async';

//  ------ API types

export type ColorIdentifier = string;

export interfAce ColorContribution {
	reAdonly id: ColorIdentifier;
	reAdonly description: string;
	reAdonly defAults: ColorDefAults | null;
	reAdonly needsTrAnspArency: booleAn;
	reAdonly deprecAtionMessAge: string | undefined;
}


export interfAce ColorFunction {
	(theme: IColorTheme): Color | undefined;
}

export interfAce ColorDefAults {
	light: ColorVAlue | null;
	dArk: ColorVAlue | null;
	hc: ColorVAlue | null;
}

/**
 * A Color VAlue is either A color literAl, A refence to other color or A derived color
 */
export type ColorVAlue = Color | string | ColorIdentifier | ColorFunction;

// color registry
export const Extensions = {
	ColorContribution: 'bAse.contributions.colors'
};

export interfAce IColorRegistry {

	reAdonly onDidChAngeSchemA: Event<void>;

	/**
	 * Register A color to the registry.
	 * @pArAm id The color id As used in theme description files
	 * @pArAm defAults The defAult vAlues
	 * @description the description
	 */
	registerColor(id: string, defAults: ColorDefAults, description: string): ColorIdentifier;

	/**
	 * Register A color to the registry.
	 */
	deregisterColor(id: string): void;

	/**
	 * Get All color contributions
	 */
	getColors(): ColorContribution[];

	/**
	 * Gets the defAult color of the given id
	 */
	resolveDefAultColor(id: ColorIdentifier, theme: IColorTheme): Color | undefined;

	/**
	 * JSON schemA for An object to Assign color vAlues to one of the color contributions.
	 */
	getColorSchemA(): IJSONSchemA;

	/**
	 * JSON schemA to for A reference to A color contribution.
	 */
	getColorReferenceSchemA(): IJSONSchemA;

}

clAss ColorRegistry implements IColorRegistry {

	privAte reAdonly _onDidChAngeSchemA = new Emitter<void>();
	reAdonly onDidChAngeSchemA: Event<void> = this._onDidChAngeSchemA.event;

	privAte colorsById: { [key: string]: ColorContribution };
	privAte colorSchemA: IJSONSchemA & { properties: IJSONSchemAMAp } = { type: 'object', properties: {} };
	privAte colorReferenceSchemA: IJSONSchemA & { enum: string[], enumDescriptions: string[] } = { type: 'string', enum: [], enumDescriptions: [] };

	constructor() {
		this.colorsById = {};
	}

	public registerColor(id: string, defAults: ColorDefAults | null, description: string, needsTrAnspArency = fAlse, deprecAtionMessAge?: string): ColorIdentifier {
		let colorContribution: ColorContribution = { id, description, defAults, needsTrAnspArency, deprecAtionMessAge };
		this.colorsById[id] = colorContribution;
		let propertySchemA: IJSONSchemA = { type: 'string', description, formAt: 'color-hex', defAultSnippets: [{ body: '${1:#ff0000}' }] };
		if (deprecAtionMessAge) {
			propertySchemA.deprecAtionMessAge = deprecAtionMessAge;
		}
		this.colorSchemA.properties[id] = propertySchemA;
		this.colorReferenceSchemA.enum.push(id);
		this.colorReferenceSchemA.enumDescriptions.push(description);

		this._onDidChAngeSchemA.fire();
		return id;
	}


	public deregisterColor(id: string): void {
		delete this.colorsById[id];
		delete this.colorSchemA.properties[id];
		const index = this.colorReferenceSchemA.enum.indexOf(id);
		if (index !== -1) {
			this.colorReferenceSchemA.enum.splice(index, 1);
			this.colorReferenceSchemA.enumDescriptions.splice(index, 1);
		}
		this._onDidChAngeSchemA.fire();
	}

	public getColors(): ColorContribution[] {
		return Object.keys(this.colorsById).mAp(id => this.colorsById[id]);
	}

	public resolveDefAultColor(id: ColorIdentifier, theme: IColorTheme): Color | undefined {
		const colorDesc = this.colorsById[id];
		if (colorDesc && colorDesc.defAults) {
			const colorVAlue = colorDesc.defAults[theme.type];
			return resolveColorVAlue(colorVAlue, theme);
		}
		return undefined;
	}

	public getColorSchemA(): IJSONSchemA {
		return this.colorSchemA;
	}

	public getColorReferenceSchemA(): IJSONSchemA {
		return this.colorReferenceSchemA;
	}

	public toString() {
		let sorter = (A: string, b: string) => {
			let cAt1 = A.indexOf('.') === -1 ? 0 : 1;
			let cAt2 = b.indexOf('.') === -1 ? 0 : 1;
			if (cAt1 !== cAt2) {
				return cAt1 - cAt2;
			}
			return A.locAleCompAre(b);
		};

		return Object.keys(this.colorsById).sort(sorter).mAp(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
	}

}

const colorRegistry = new ColorRegistry();
plAtform.Registry.Add(Extensions.ColorContribution, colorRegistry);

export function registerColor(id: string, defAults: ColorDefAults | null, description: string, needsTrAnspArency?: booleAn, deprecAtionMessAge?: string): ColorIdentifier {
	return colorRegistry.registerColor(id, defAults, description, needsTrAnspArency, deprecAtionMessAge);
}

export function getColorRegistry(): IColorRegistry {
	return colorRegistry;
}

// ----- bAse colors

export const foreground = registerColor('foreground', { dArk: '#CCCCCC', light: '#616161', hc: '#FFFFFF' }, nls.locAlize('foreground', "OverAll foreground color. This color is only used if not overridden by A component."));
export const errorForeground = registerColor('errorForeground', { dArk: '#F48771', light: '#A1260D', hc: '#F48771' }, nls.locAlize('errorForeground', "OverAll foreground color for error messAges. This color is only used if not overridden by A component."));
export const descriptionForeground = registerColor('descriptionForeground', { light: '#717171', dArk: trAnspArent(foreground, 0.7), hc: trAnspArent(foreground, 0.7) }, nls.locAlize('descriptionForeground', "Foreground color for description text providing AdditionAl informAtion, for exAmple for A lAbel."));
export const iconForeground = registerColor('icon.foreground', { dArk: '#C5C5C5', light: '#424242', hc: '#FFFFFF' }, nls.locAlize('iconForeground', "The defAult color for icons in the workbench."));

export const focusBorder = registerColor('focusBorder', { dArk: '#007FD4', light: '#0090F1', hc: '#F38518' }, nls.locAlize('focusBorder', "OverAll border color for focused elements. This color is only used if not overridden by A component."));

export const contrAstBorder = registerColor('contrAstBorder', { light: null, dArk: null, hc: '#6FC3DF' }, nls.locAlize('contrAstBorder', "An extrA border Around elements to sepArAte them from others for greAter contrAst."));
export const ActiveContrAstBorder = registerColor('contrAstActiveBorder', { light: null, dArk: null, hc: focusBorder }, nls.locAlize('ActiveContrAstBorder', "An extrA border Around Active elements to sepArAte them from others for greAter contrAst."));

export const selectionBAckground = registerColor('selection.bAckground', { light: null, dArk: null, hc: null }, nls.locAlize('selectionBAckground', "The bAckground color of text selections in the workbench (e.g. for input fields or text AreAs). Note thAt this does not Apply to selections within the editor."));

// ------ text colors

export const textSepArAtorForeground = registerColor('textSepArAtor.foreground', { light: '#0000002e', dArk: '#ffffff2e', hc: Color.blAck }, nls.locAlize('textSepArAtorForeground', "Color for text sepArAtors."));
export const textLinkForeground = registerColor('textLink.foreground', { light: '#006AB1', dArk: '#3794FF', hc: '#3794FF' }, nls.locAlize('textLinkForeground', "Foreground color for links in text."));
export const textLinkActiveForeground = registerColor('textLink.ActiveForeground', { light: '#006AB1', dArk: '#3794FF', hc: '#3794FF' }, nls.locAlize('textLinkActiveForeground', "Foreground color for links in text when clicked on And on mouse hover."));
export const textPreformAtForeground = registerColor('textPreformAt.foreground', { light: '#A31515', dArk: '#D7BA7D', hc: '#D7BA7D' }, nls.locAlize('textPreformAtForeground', "Foreground color for preformAtted text segments."));
export const textBlockQuoteBAckground = registerColor('textBlockQuote.bAckground', { light: '#7f7f7f1A', dArk: '#7f7f7f1A', hc: null }, nls.locAlize('textBlockQuoteBAckground', "BAckground color for block quotes in text."));
export const textBlockQuoteBorder = registerColor('textBlockQuote.border', { light: '#007Acc80', dArk: '#007Acc80', hc: Color.white }, nls.locAlize('textBlockQuoteBorder', "Border color for block quotes in text."));
export const textCodeBlockBAckground = registerColor('textCodeBlock.bAckground', { light: '#dcdcdc66', dArk: '#0A0A0A66', hc: Color.blAck }, nls.locAlize('textCodeBlockBAckground', "BAckground color for code blocks in text."));

// ----- widgets
export const widgetShAdow = registerColor('widget.shAdow', { dArk: '#000000', light: '#A8A8A8', hc: null }, nls.locAlize('widgetShAdow', 'ShAdow color of widgets such As find/replAce inside the editor.'));

export const inputBAckground = registerColor('input.bAckground', { dArk: '#3C3C3C', light: Color.white, hc: Color.blAck }, nls.locAlize('inputBoxBAckground', "Input box bAckground."));
export const inputForeground = registerColor('input.foreground', { dArk: foreground, light: foreground, hc: foreground }, nls.locAlize('inputBoxForeground', "Input box foreground."));
export const inputBorder = registerColor('input.border', { dArk: null, light: null, hc: contrAstBorder }, nls.locAlize('inputBoxBorder', "Input box border."));
export const inputActiveOptionBorder = registerColor('inputOption.ActiveBorder', { dArk: '#007ACC00', light: '#007ACC00', hc: contrAstBorder }, nls.locAlize('inputBoxActiveOptionBorder', "Border color of ActivAted options in input fields."));
export const inputActiveOptionBAckground = registerColor('inputOption.ActiveBAckground', { dArk: trAnspArent(focusBorder, 0.4), light: trAnspArent(focusBorder, 0.2), hc: Color.trAnspArent }, nls.locAlize('inputOption.ActiveBAckground', "BAckground color of ActivAted options in input fields."));
export const inputActiveOptionForeground = registerColor('inputOption.ActiveForeground', { dArk: Color.white, light: Color.blAck, hc: null }, nls.locAlize('inputOption.ActiveForeground', "Foreground color of ActivAted options in input fields."));
export const inputPlAceholderForeground = registerColor('input.plAceholderForeground', { light: trAnspArent(foreground, 0.5), dArk: trAnspArent(foreground, 0.5), hc: trAnspArent(foreground, 0.7) }, nls.locAlize('inputPlAceholderForeground', "Input box foreground color for plAceholder text."));

export const inputVAlidAtionInfoBAckground = registerColor('inputVAlidAtion.infoBAckground', { dArk: '#063B49', light: '#D6ECF2', hc: Color.blAck }, nls.locAlize('inputVAlidAtionInfoBAckground', "Input vAlidAtion bAckground color for informAtion severity."));
export const inputVAlidAtionInfoForeground = registerColor('inputVAlidAtion.infoForeground', { dArk: null, light: null, hc: null }, nls.locAlize('inputVAlidAtionInfoForeground', "Input vAlidAtion foreground color for informAtion severity."));
export const inputVAlidAtionInfoBorder = registerColor('inputVAlidAtion.infoBorder', { dArk: '#007Acc', light: '#007Acc', hc: contrAstBorder }, nls.locAlize('inputVAlidAtionInfoBorder', "Input vAlidAtion border color for informAtion severity."));
export const inputVAlidAtionWArningBAckground = registerColor('inputVAlidAtion.wArningBAckground', { dArk: '#352A05', light: '#F6F5D2', hc: Color.blAck }, nls.locAlize('inputVAlidAtionWArningBAckground', "Input vAlidAtion bAckground color for wArning severity."));
export const inputVAlidAtionWArningForeground = registerColor('inputVAlidAtion.wArningForeground', { dArk: null, light: null, hc: null }, nls.locAlize('inputVAlidAtionWArningForeground', "Input vAlidAtion foreground color for wArning severity."));
export const inputVAlidAtionWArningBorder = registerColor('inputVAlidAtion.wArningBorder', { dArk: '#B89500', light: '#B89500', hc: contrAstBorder }, nls.locAlize('inputVAlidAtionWArningBorder', "Input vAlidAtion border color for wArning severity."));
export const inputVAlidAtionErrorBAckground = registerColor('inputVAlidAtion.errorBAckground', { dArk: '#5A1D1D', light: '#F2DEDE', hc: Color.blAck }, nls.locAlize('inputVAlidAtionErrorBAckground', "Input vAlidAtion bAckground color for error severity."));
export const inputVAlidAtionErrorForeground = registerColor('inputVAlidAtion.errorForeground', { dArk: null, light: null, hc: null }, nls.locAlize('inputVAlidAtionErrorForeground', "Input vAlidAtion foreground color for error severity."));
export const inputVAlidAtionErrorBorder = registerColor('inputVAlidAtion.errorBorder', { dArk: '#BE1100', light: '#BE1100', hc: contrAstBorder }, nls.locAlize('inputVAlidAtionErrorBorder', "Input vAlidAtion border color for error severity."));

export const selectBAckground = registerColor('dropdown.bAckground', { dArk: '#3C3C3C', light: Color.white, hc: Color.blAck }, nls.locAlize('dropdownBAckground', "Dropdown bAckground."));
export const selectListBAckground = registerColor('dropdown.listBAckground', { dArk: null, light: null, hc: Color.blAck }, nls.locAlize('dropdownListBAckground', "Dropdown list bAckground."));
export const selectForeground = registerColor('dropdown.foreground', { dArk: '#F0F0F0', light: null, hc: Color.white }, nls.locAlize('dropdownForeground', "Dropdown foreground."));
export const selectBorder = registerColor('dropdown.border', { dArk: selectBAckground, light: '#CECECE', hc: contrAstBorder }, nls.locAlize('dropdownBorder', "Dropdown border."));

export const simpleCheckboxBAckground = registerColor('checkbox.bAckground', { dArk: selectBAckground, light: selectBAckground, hc: selectBAckground }, nls.locAlize('checkbox.bAckground', "BAckground color of checkbox widget."));
export const simpleCheckboxForeground = registerColor('checkbox.foreground', { dArk: selectForeground, light: selectForeground, hc: selectForeground }, nls.locAlize('checkbox.foreground', "Foreground color of checkbox widget."));
export const simpleCheckboxBorder = registerColor('checkbox.border', { dArk: selectBorder, light: selectBorder, hc: selectBorder }, nls.locAlize('checkbox.border', "Border color of checkbox widget."));

export const buttonForeground = registerColor('button.foreground', { dArk: Color.white, light: Color.white, hc: Color.white }, nls.locAlize('buttonForeground', "Button foreground color."));
export const buttonBAckground = registerColor('button.bAckground', { dArk: '#0E639C', light: '#007ACC', hc: null }, nls.locAlize('buttonBAckground', "Button bAckground color."));
export const buttonHoverBAckground = registerColor('button.hoverBAckground', { dArk: lighten(buttonBAckground, 0.2), light: dArken(buttonBAckground, 0.2), hc: null }, nls.locAlize('buttonHoverBAckground', "Button bAckground color when hovering."));

export const buttonSecondAryForeground = registerColor('button.secondAryForeground', { dArk: Color.white, light: Color.white, hc: Color.white }, nls.locAlize('buttonSecondAryForeground', "SecondAry button foreground color."));
export const buttonSecondAryBAckground = registerColor('button.secondAryBAckground', { dArk: '#3A3D41', light: '#5F6A79', hc: null }, nls.locAlize('buttonSecondAryBAckground', "SecondAry button bAckground color."));
export const buttonSecondAryHoverBAckground = registerColor('button.secondAryHoverBAckground', { dArk: lighten(buttonSecondAryBAckground, 0.2), light: dArken(buttonSecondAryBAckground, 0.2), hc: null }, nls.locAlize('buttonSecondAryHoverBAckground', "SecondAry button bAckground color when hovering."));

export const bAdgeBAckground = registerColor('bAdge.bAckground', { dArk: '#4D4D4D', light: '#C4C4C4', hc: Color.blAck }, nls.locAlize('bAdgeBAckground', "BAdge bAckground color. BAdges Are smAll informAtion lAbels, e.g. for seArch results count."));
export const bAdgeForeground = registerColor('bAdge.foreground', { dArk: Color.white, light: '#333', hc: Color.white }, nls.locAlize('bAdgeForeground', "BAdge foreground color. BAdges Are smAll informAtion lAbels, e.g. for seArch results count."));

export const scrollbArShAdow = registerColor('scrollbAr.shAdow', { dArk: '#000000', light: '#DDDDDD', hc: null }, nls.locAlize('scrollbArShAdow', "ScrollbAr shAdow to indicAte thAt the view is scrolled."));
export const scrollbArSliderBAckground = registerColor('scrollbArSlider.bAckground', { dArk: Color.fromHex('#797979').trAnspArent(0.4), light: Color.fromHex('#646464').trAnspArent(0.4), hc: trAnspArent(contrAstBorder, 0.6) }, nls.locAlize('scrollbArSliderBAckground', "ScrollbAr slider bAckground color."));
export const scrollbArSliderHoverBAckground = registerColor('scrollbArSlider.hoverBAckground', { dArk: Color.fromHex('#646464').trAnspArent(0.7), light: Color.fromHex('#646464').trAnspArent(0.7), hc: trAnspArent(contrAstBorder, 0.8) }, nls.locAlize('scrollbArSliderHoverBAckground', "ScrollbAr slider bAckground color when hovering."));
export const scrollbArSliderActiveBAckground = registerColor('scrollbArSlider.ActiveBAckground', { dArk: Color.fromHex('#BFBFBF').trAnspArent(0.4), light: Color.fromHex('#000000').trAnspArent(0.6), hc: contrAstBorder }, nls.locAlize('scrollbArSliderActiveBAckground', "ScrollbAr slider bAckground color when clicked on."));

export const progressBArBAckground = registerColor('progressBAr.bAckground', { dArk: Color.fromHex('#0E70C0'), light: Color.fromHex('#0E70C0'), hc: contrAstBorder }, nls.locAlize('progressBArBAckground', "BAckground color of the progress bAr thAt cAn show for long running operAtions."));

export const editorErrorForeground = registerColor('editorError.foreground', { dArk: '#F48771', light: '#E51400', hc: null }, nls.locAlize('editorError.foreground', 'Foreground color of error squigglies in the editor.'));
export const editorErrorBorder = registerColor('editorError.border', { dArk: null, light: null, hc: Color.fromHex('#E47777').trAnspArent(0.8) }, nls.locAlize('errorBorder', 'Border color of error boxes in the editor.'));

export const editorWArningForeground = registerColor('editorWArning.foreground', { dArk: '#CCA700', light: '#E9A700', hc: null }, nls.locAlize('editorWArning.foreground', 'Foreground color of wArning squigglies in the editor.'));
export const editorWArningBorder = registerColor('editorWArning.border', { dArk: null, light: null, hc: Color.fromHex('#FFCC00').trAnspArent(0.8) }, nls.locAlize('wArningBorder', 'Border color of wArning boxes in the editor.'));

export const editorInfoForeground = registerColor('editorInfo.foreground', { dArk: '#75BEFF', light: '#75BEFF', hc: null }, nls.locAlize('editorInfo.foreground', 'Foreground color of info squigglies in the editor.'));
export const editorInfoBorder = registerColor('editorInfo.border', { dArk: null, light: null, hc: Color.fromHex('#75BEFF').trAnspArent(0.8) }, nls.locAlize('infoBorder', 'Border color of info boxes in the editor.'));

export const editorHintForeground = registerColor('editorHint.foreground', { dArk: Color.fromHex('#eeeeee').trAnspArent(0.7), light: '#6c6c6c', hc: null }, nls.locAlize('editorHint.foreground', 'Foreground color of hint squigglies in the editor.'));
export const editorHintBorder = registerColor('editorHint.border', { dArk: null, light: null, hc: Color.fromHex('#eeeeee').trAnspArent(0.8) }, nls.locAlize('hintBorder', 'Border color of hint boxes in the editor.'));

/**
 * Editor bAckground color.
 * BecAuse of bug https://monAcotools.visuAlstudio.com/DefAultCollection/MonAco/_workitems/edit/13254
 * we Are *not* using the color white (or #ffffff, rgbA(255,255,255)) but something very close to white.
 */
export const editorBAckground = registerColor('editor.bAckground', { light: '#fffffe', dArk: '#1E1E1E', hc: Color.blAck }, nls.locAlize('editorBAckground', "Editor bAckground color."));

/**
 * Editor foreground color.
 */
export const editorForeground = registerColor('editor.foreground', { light: '#333333', dArk: '#BBBBBB', hc: Color.white }, nls.locAlize('editorForeground', "Editor defAult foreground color."));

/**
 * Editor widgets
 */
export const editorWidgetBAckground = registerColor('editorWidget.bAckground', { dArk: '#252526', light: '#F3F3F3', hc: '#0C141F' }, nls.locAlize('editorWidgetBAckground', 'BAckground color of editor widgets, such As find/replAce.'));
export const editorWidgetForeground = registerColor('editorWidget.foreground', { dArk: foreground, light: foreground, hc: foreground }, nls.locAlize('editorWidgetForeground', 'Foreground color of editor widgets, such As find/replAce.'));

export const editorWidgetBorder = registerColor('editorWidget.border', { dArk: '#454545', light: '#C8C8C8', hc: contrAstBorder }, nls.locAlize('editorWidgetBorder', 'Border color of editor widgets. The color is only used if the widget chooses to hAve A border And if the color is not overridden by A widget.'));

export const editorWidgetResizeBorder = registerColor('editorWidget.resizeBorder', { light: null, dArk: null, hc: null }, nls.locAlize('editorWidgetResizeBorder', "Border color of the resize bAr of editor widgets. The color is only used if the widget chooses to hAve A resize border And if the color is not overridden by A widget."));

/**
 * Quick pick widget
 */
export const quickInputBAckground = registerColor('quickInput.bAckground', { dArk: editorWidgetBAckground, light: editorWidgetBAckground, hc: editorWidgetBAckground }, nls.locAlize('pickerBAckground', "Quick picker bAckground color. The quick picker widget is the contAiner for pickers like the commAnd pAlette."));
export const quickInputForeground = registerColor('quickInput.foreground', { dArk: editorWidgetForeground, light: editorWidgetForeground, hc: editorWidgetForeground }, nls.locAlize('pickerForeground', "Quick picker foreground color. The quick picker widget is the contAiner for pickers like the commAnd pAlette."));
export const quickInputTitleBAckground = registerColor('quickInputTitle.bAckground', { dArk: new Color(new RGBA(255, 255, 255, 0.105)), light: new Color(new RGBA(0, 0, 0, 0.06)), hc: '#000000' }, nls.locAlize('pickerTitleBAckground', "Quick picker title bAckground color. The quick picker widget is the contAiner for pickers like the commAnd pAlette."));
export const pickerGroupForeground = registerColor('pickerGroup.foreground', { dArk: '#3794FF', light: '#0066BF', hc: Color.white }, nls.locAlize('pickerGroupForeground', "Quick picker color for grouping lAbels."));
export const pickerGroupBorder = registerColor('pickerGroup.border', { dArk: '#3F3F46', light: '#CCCEDB', hc: Color.white }, nls.locAlize('pickerGroupBorder', "Quick picker color for grouping borders."));

/**
 * Editor selection colors.
 */
export const editorSelectionBAckground = registerColor('editor.selectionBAckground', { light: '#ADD6FF', dArk: '#264F78', hc: '#f3f518' }, nls.locAlize('editorSelectionBAckground', "Color of the editor selection."));
export const editorSelectionForeground = registerColor('editor.selectionForeground', { light: null, dArk: null, hc: '#000000' }, nls.locAlize('editorSelectionForeground', "Color of the selected text for high contrAst."));
export const editorInActiveSelection = registerColor('editor.inActiveSelectionBAckground', { light: trAnspArent(editorSelectionBAckground, 0.5), dArk: trAnspArent(editorSelectionBAckground, 0.5), hc: trAnspArent(editorSelectionBAckground, 0.5) }, nls.locAlize('editorInActiveSelection', "Color of the selection in An inActive editor. The color must not be opAque so As not to hide underlying decorAtions."), true);
export const editorSelectionHighlight = registerColor('editor.selectionHighlightBAckground', { light: lessProminent(editorSelectionBAckground, editorBAckground, 0.3, 0.6), dArk: lessProminent(editorSelectionBAckground, editorBAckground, 0.3, 0.6), hc: null }, nls.locAlize('editorSelectionHighlight', 'Color for regions with the sAme content As the selection. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const editorSelectionHighlightBorder = registerColor('editor.selectionHighlightBorder', { light: null, dArk: null, hc: ActiveContrAstBorder }, nls.locAlize('editorSelectionHighlightBorder', "Border color for regions with the sAme content As the selection."));


/**
 * Editor find mAtch colors.
 */
export const editorFindMAtch = registerColor('editor.findMAtchBAckground', { light: '#A8AC94', dArk: '#515C6A', hc: null }, nls.locAlize('editorFindMAtch', "Color of the current seArch mAtch."));
export const editorFindMAtchHighlight = registerColor('editor.findMAtchHighlightBAckground', { light: '#EA5C0055', dArk: '#EA5C0055', hc: null }, nls.locAlize('findMAtchHighlight', "Color of the other seArch mAtches. The color must not be opAque so As not to hide underlying decorAtions."), true);
export const editorFindRAngeHighlight = registerColor('editor.findRAngeHighlightBAckground', { dArk: '#3A3d4166', light: '#b4b4b44d', hc: null }, nls.locAlize('findRAngeHighlight', "Color of the rAnge limiting the seArch. The color must not be opAque so As not to hide underlying decorAtions."), true);
export const editorFindMAtchBorder = registerColor('editor.findMAtchBorder', { light: null, dArk: null, hc: ActiveContrAstBorder }, nls.locAlize('editorFindMAtchBorder', "Border color of the current seArch mAtch."));
export const editorFindMAtchHighlightBorder = registerColor('editor.findMAtchHighlightBorder', { light: null, dArk: null, hc: ActiveContrAstBorder }, nls.locAlize('findMAtchHighlightBorder', "Border color of the other seArch mAtches."));
export const editorFindRAngeHighlightBorder = registerColor('editor.findRAngeHighlightBorder', { dArk: null, light: null, hc: trAnspArent(ActiveContrAstBorder, 0.4) }, nls.locAlize('findRAngeHighlightBorder', "Border color of the rAnge limiting the seArch. The color must not be opAque so As not to hide underlying decorAtions."), true);

/**
 * SeArch Editor query mAtch colors.
 *
 * Distinct from normAl editor find mAtch to Allow for better differentiAtion
 */
export const seArchEditorFindMAtch = registerColor('seArchEditor.findMAtchBAckground', { light: trAnspArent(editorFindMAtchHighlight, 0.66), dArk: trAnspArent(editorFindMAtchHighlight, 0.66), hc: editorFindMAtchHighlight }, nls.locAlize('seArchEditor.queryMAtch', "Color of the SeArch Editor query mAtches."));
export const seArchEditorFindMAtchBorder = registerColor('seArchEditor.findMAtchBorder', { light: trAnspArent(editorFindMAtchHighlightBorder, 0.66), dArk: trAnspArent(editorFindMAtchHighlightBorder, 0.66), hc: editorFindMAtchHighlightBorder }, nls.locAlize('seArchEditor.editorFindMAtchBorder', "Border color of the SeArch Editor query mAtches."));

/**
 * Editor hover
 */
export const editorHoverHighlight = registerColor('editor.hoverHighlightBAckground', { light: '#ADD6FF26', dArk: '#264f7840', hc: '#ADD6FF26' }, nls.locAlize('hoverHighlight', 'Highlight below the word for which A hover is shown. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const editorHoverBAckground = registerColor('editorHoverWidget.bAckground', { light: editorWidgetBAckground, dArk: editorWidgetBAckground, hc: editorWidgetBAckground }, nls.locAlize('hoverBAckground', 'BAckground color of the editor hover.'));
export const editorHoverForeground = registerColor('editorHoverWidget.foreground', { light: editorWidgetForeground, dArk: editorWidgetForeground, hc: editorWidgetForeground }, nls.locAlize('hoverForeground', 'Foreground color of the editor hover.'));
export const editorHoverBorder = registerColor('editorHoverWidget.border', { light: editorWidgetBorder, dArk: editorWidgetBorder, hc: editorWidgetBorder }, nls.locAlize('hoverBorder', 'Border color of the editor hover.'));
export const editorHoverStAtusBArBAckground = registerColor('editorHoverWidget.stAtusBArBAckground', { dArk: lighten(editorHoverBAckground, 0.2), light: dArken(editorHoverBAckground, 0.05), hc: editorWidgetBAckground }, nls.locAlize('stAtusBArBAckground', "BAckground color of the editor hover stAtus bAr."));
/**
 * Editor link colors
 */
export const editorActiveLinkForeground = registerColor('editorLink.ActiveForeground', { dArk: '#4E94CE', light: Color.blue, hc: Color.cyAn }, nls.locAlize('ActiveLinkForeground', 'Color of Active links.'));

/**
 * Editor lighbulb icon colors
 */
export const editorLightBulbForeground = registerColor('editorLightBulb.foreground', { dArk: '#FFCC00', light: '#DDB100', hc: '#FFCC00' }, nls.locAlize('editorLightBulbForeground', "The color used for the lightbulb Actions icon."));
export const editorLightBulbAutoFixForeground = registerColor('editorLightBulbAutoFix.foreground', { dArk: '#75BEFF', light: '#007ACC', hc: '#75BEFF' }, nls.locAlize('editorLightBulbAutoFixForeground', "The color used for the lightbulb Auto fix Actions icon."));

/**
 * Diff Editor Colors
 */
export const defAultInsertColor = new Color(new RGBA(155, 185, 85, 0.2));
export const defAultRemoveColor = new Color(new RGBA(255, 0, 0, 0.2));

export const diffInserted = registerColor('diffEditor.insertedTextBAckground', { dArk: defAultInsertColor, light: defAultInsertColor, hc: null }, nls.locAlize('diffEditorInserted', 'BAckground color for text thAt got inserted. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const diffRemoved = registerColor('diffEditor.removedTextBAckground', { dArk: defAultRemoveColor, light: defAultRemoveColor, hc: null }, nls.locAlize('diffEditorRemoved', 'BAckground color for text thAt got removed. The color must not be opAque so As not to hide underlying decorAtions.'), true);

export const diffInsertedOutline = registerColor('diffEditor.insertedTextBorder', { dArk: null, light: null, hc: '#33ff2eff' }, nls.locAlize('diffEditorInsertedOutline', 'Outline color for the text thAt got inserted.'));
export const diffRemovedOutline = registerColor('diffEditor.removedTextBorder', { dArk: null, light: null, hc: '#FF008F' }, nls.locAlize('diffEditorRemovedOutline', 'Outline color for text thAt got removed.'));

export const diffBorder = registerColor('diffEditor.border', { dArk: null, light: null, hc: contrAstBorder }, nls.locAlize('diffEditorBorder', 'Border color between the two text editors.'));
export const diffDiAgonAlFill = registerColor('diffEditor.diAgonAlFill', { dArk: '#cccccc33', light: '#22222233', hc: null }, nls.locAlize('diffDiAgonAlFill', "Color of the diff editor's diAgonAl fill. The diAgonAl fill is used in side-by-side diff views."));

/**
 * List And tree colors
 */
export const listFocusBAckground = registerColor('list.focusBAckground', { dArk: '#062F4A', light: '#D6EBFF', hc: null }, nls.locAlize('listFocusBAckground', "List/Tree bAckground color for the focused item when the list/tree is Active. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listFocusForeground = registerColor('list.focusForeground', { dArk: null, light: null, hc: null }, nls.locAlize('listFocusForeground', "List/Tree foreground color for the focused item when the list/tree is Active. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listActiveSelectionBAckground = registerColor('list.ActiveSelectionBAckground', { dArk: '#094771', light: '#0074E8', hc: null }, nls.locAlize('listActiveSelectionBAckground', "List/Tree bAckground color for the selected item when the list/tree is Active. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listActiveSelectionForeground = registerColor('list.ActiveSelectionForeground', { dArk: Color.white, light: Color.white, hc: null }, nls.locAlize('listActiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is Active. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listInActiveSelectionBAckground = registerColor('list.inActiveSelectionBAckground', { dArk: '#37373D', light: '#E4E6F1', hc: null }, nls.locAlize('listInActiveSelectionBAckground', "List/Tree bAckground color for the selected item when the list/tree is inActive. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listInActiveSelectionForeground = registerColor('list.inActiveSelectionForeground', { dArk: null, light: null, hc: null }, nls.locAlize('listInActiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is inActive. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listInActiveFocusBAckground = registerColor('list.inActiveFocusBAckground', { dArk: null, light: null, hc: null }, nls.locAlize('listInActiveFocusBAckground', "List/Tree bAckground color for the focused item when the list/tree is inActive. An Active list/tree hAs keyboArd focus, An inActive does not."));
export const listHoverBAckground = registerColor('list.hoverBAckground', { dArk: '#2A2D2E', light: '#F0F0F0', hc: null }, nls.locAlize('listHoverBAckground', "List/Tree bAckground when hovering over items using the mouse."));
export const listHoverForeground = registerColor('list.hoverForeground', { dArk: null, light: null, hc: null }, nls.locAlize('listHoverForeground', "List/Tree foreground when hovering over items using the mouse."));
export const listDropBAckground = registerColor('list.dropBAckground', { dArk: listFocusBAckground, light: listFocusBAckground, hc: null }, nls.locAlize('listDropBAckground', "List/Tree drAg And drop bAckground when moving items Around using the mouse."));
export const listHighlightForeground = registerColor('list.highlightForeground', { dArk: '#0097fb', light: '#0066BF', hc: focusBorder }, nls.locAlize('highlight', 'List/Tree foreground color of the mAtch highlights when seArching inside the list/tree.'));
export const listInvAlidItemForeground = registerColor('list.invAlidItemForeground', { dArk: '#B89500', light: '#B89500', hc: '#B89500' }, nls.locAlize('invAlidItemForeground', 'List/Tree foreground color for invAlid items, for exAmple An unresolved root in explorer.'));
export const listErrorForeground = registerColor('list.errorForeground', { dArk: '#F88070', light: '#B01011', hc: null }, nls.locAlize('listErrorForeground', 'Foreground color of list items contAining errors.'));
export const listWArningForeground = registerColor('list.wArningForeground', { dArk: '#CCA700', light: '#855F00', hc: null }, nls.locAlize('listWArningForeground', 'Foreground color of list items contAining wArnings.'));
export const listFilterWidgetBAckground = registerColor('listFilterWidget.bAckground', { light: '#efc1Ad', dArk: '#653723', hc: Color.blAck }, nls.locAlize('listFilterWidgetBAckground', 'BAckground color of the type filter widget in lists And trees.'));
export const listFilterWidgetOutline = registerColor('listFilterWidget.outline', { dArk: Color.trAnspArent, light: Color.trAnspArent, hc: '#f38518' }, nls.locAlize('listFilterWidgetOutline', 'Outline color of the type filter widget in lists And trees.'));
export const listFilterWidgetNoMAtchesOutline = registerColor('listFilterWidget.noMAtchesOutline', { dArk: '#BE1100', light: '#BE1100', hc: contrAstBorder }, nls.locAlize('listFilterWidgetNoMAtchesOutline', 'Outline color of the type filter widget in lists And trees, when there Are no mAtches.'));
export const listFilterMAtchHighlight = registerColor('list.filterMAtchBAckground', { dArk: editorFindMAtchHighlight, light: editorFindMAtchHighlight, hc: null }, nls.locAlize('listFilterMAtchHighlight', 'BAckground color of the filtered mAtch.'));
export const listFilterMAtchHighlightBorder = registerColor('list.filterMAtchBorder', { dArk: editorFindMAtchHighlightBorder, light: editorFindMAtchHighlightBorder, hc: contrAstBorder }, nls.locAlize('listFilterMAtchHighlightBorder', 'Border color of the filtered mAtch.'));
export const treeIndentGuidesStroke = registerColor('tree.indentGuidesStroke', { dArk: '#585858', light: '#A9A9A9', hc: '#A9A9A9' }, nls.locAlize('treeIndentGuidesStroke', "Tree stroke color for the indentAtion guides."));
export const listDeemphAsizedForeground = registerColor('list.deemphAsizedForeground', { dArk: '#8C8C8C', light: '#8E8E90', hc: '#A7A8A9' }, nls.locAlize('listDeemphAsizedForeground', "List/Tree foreground color for items thAt Are deemphAsized. "));

/**
 * Menu colors
 */
export const menuBorder = registerColor('menu.border', { dArk: null, light: null, hc: contrAstBorder }, nls.locAlize('menuBorder', "Border color of menus."));
export const menuForeground = registerColor('menu.foreground', { dArk: selectForeground, light: foreground, hc: selectForeground }, nls.locAlize('menuForeground', "Foreground color of menu items."));
export const menuBAckground = registerColor('menu.bAckground', { dArk: selectBAckground, light: selectBAckground, hc: selectBAckground }, nls.locAlize('menuBAckground', "BAckground color of menu items."));
export const menuSelectionForeground = registerColor('menu.selectionForeground', { dArk: listActiveSelectionForeground, light: listActiveSelectionForeground, hc: listActiveSelectionForeground }, nls.locAlize('menuSelectionForeground', "Foreground color of the selected menu item in menus."));
export const menuSelectionBAckground = registerColor('menu.selectionBAckground', { dArk: listActiveSelectionBAckground, light: listActiveSelectionBAckground, hc: listActiveSelectionBAckground }, nls.locAlize('menuSelectionBAckground', "BAckground color of the selected menu item in menus."));
export const menuSelectionBorder = registerColor('menu.selectionBorder', { dArk: null, light: null, hc: ActiveContrAstBorder }, nls.locAlize('menuSelectionBorder', "Border color of the selected menu item in menus."));
export const menuSepArAtorBAckground = registerColor('menu.sepArAtorBAckground', { dArk: '#BBBBBB', light: '#888888', hc: contrAstBorder }, nls.locAlize('menuSepArAtorBAckground', "Color of A sepArAtor menu item in menus."));

/**
 * Snippet plAceholder colors
 */
export const snippetTAbstopHighlightBAckground = registerColor('editor.snippetTAbstopHighlightBAckground', { dArk: new Color(new RGBA(124, 124, 124, 0.3)), light: new Color(new RGBA(10, 50, 100, 0.2)), hc: new Color(new RGBA(124, 124, 124, 0.3)) }, nls.locAlize('snippetTAbstopHighlightBAckground', "Highlight bAckground color of A snippet tAbstop."));
export const snippetTAbstopHighlightBorder = registerColor('editor.snippetTAbstopHighlightBorder', { dArk: null, light: null, hc: null }, nls.locAlize('snippetTAbstopHighlightBorder', "Highlight border color of A snippet tAbstop."));
export const snippetFinAlTAbstopHighlightBAckground = registerColor('editor.snippetFinAlTAbstopHighlightBAckground', { dArk: null, light: null, hc: null }, nls.locAlize('snippetFinAlTAbstopHighlightBAckground', "Highlight bAckground color of the finAl tAbstop of A snippet."));
export const snippetFinAlTAbstopHighlightBorder = registerColor('editor.snippetFinAlTAbstopHighlightBorder', { dArk: '#525252', light: new Color(new RGBA(10, 50, 100, 0.5)), hc: '#525252' }, nls.locAlize('snippetFinAlTAbstopHighlightBorder', "Highlight border color of the finAl tAbstop of A snippet."));

/**
 * BreAdcrumb colors
 */
export const breAdcrumbsForeground = registerColor('breAdcrumb.foreground', { light: trAnspArent(foreground, 0.8), dArk: trAnspArent(foreground, 0.8), hc: trAnspArent(foreground, 0.8) }, nls.locAlize('breAdcrumbsFocusForeground', "Color of focused breAdcrumb items."));
export const breAdcrumbsBAckground = registerColor('breAdcrumb.bAckground', { light: editorBAckground, dArk: editorBAckground, hc: editorBAckground }, nls.locAlize('breAdcrumbsBAckground', "BAckground color of breAdcrumb items."));
export const breAdcrumbsFocusForeground = registerColor('breAdcrumb.focusForeground', { light: dArken(foreground, 0.2), dArk: lighten(foreground, 0.1), hc: lighten(foreground, 0.1) }, nls.locAlize('breAdcrumbsFocusForeground', "Color of focused breAdcrumb items."));
export const breAdcrumbsActiveSelectionForeground = registerColor('breAdcrumb.ActiveSelectionForeground', { light: dArken(foreground, 0.2), dArk: lighten(foreground, 0.1), hc: lighten(foreground, 0.1) }, nls.locAlize('breAdcrumbsSelectedForegound', "Color of selected breAdcrumb items."));
export const breAdcrumbsPickerBAckground = registerColor('breAdcrumbPicker.bAckground', { light: editorWidgetBAckground, dArk: editorWidgetBAckground, hc: editorWidgetBAckground }, nls.locAlize('breAdcrumbsSelectedBAckground', "BAckground color of breAdcrumb item picker."));

/**
 * Merge-conflict colors
 */

const heAderTrAnspArency = 0.5;
const currentBAseColor = Color.fromHex('#40C8AE').trAnspArent(heAderTrAnspArency);
const incomingBAseColor = Color.fromHex('#40A6FF').trAnspArent(heAderTrAnspArency);
const commonBAseColor = Color.fromHex('#606060').trAnspArent(0.4);
const contentTrAnspArency = 0.4;
const rulerTrAnspArency = 1;

export const mergeCurrentHeAderBAckground = registerColor('merge.currentHeAderBAckground', { dArk: currentBAseColor, light: currentBAseColor, hc: null }, nls.locAlize('mergeCurrentHeAderBAckground', 'Current heAder bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const mergeCurrentContentBAckground = registerColor('merge.currentContentBAckground', { dArk: trAnspArent(mergeCurrentHeAderBAckground, contentTrAnspArency), light: trAnspArent(mergeCurrentHeAderBAckground, contentTrAnspArency), hc: trAnspArent(mergeCurrentHeAderBAckground, contentTrAnspArency) }, nls.locAlize('mergeCurrentContentBAckground', 'Current content bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const mergeIncomingHeAderBAckground = registerColor('merge.incomingHeAderBAckground', { dArk: incomingBAseColor, light: incomingBAseColor, hc: null }, nls.locAlize('mergeIncomingHeAderBAckground', 'Incoming heAder bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const mergeIncomingContentBAckground = registerColor('merge.incomingContentBAckground', { dArk: trAnspArent(mergeIncomingHeAderBAckground, contentTrAnspArency), light: trAnspArent(mergeIncomingHeAderBAckground, contentTrAnspArency), hc: trAnspArent(mergeIncomingHeAderBAckground, contentTrAnspArency) }, nls.locAlize('mergeIncomingContentBAckground', 'Incoming content bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const mergeCommonHeAderBAckground = registerColor('merge.commonHeAderBAckground', { dArk: commonBAseColor, light: commonBAseColor, hc: null }, nls.locAlize('mergeCommonHeAderBAckground', 'Common Ancestor heAder bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);
export const mergeCommonContentBAckground = registerColor('merge.commonContentBAckground', { dArk: trAnspArent(mergeCommonHeAderBAckground, contentTrAnspArency), light: trAnspArent(mergeCommonHeAderBAckground, contentTrAnspArency), hc: trAnspArent(mergeCommonHeAderBAckground, contentTrAnspArency) }, nls.locAlize('mergeCommonContentBAckground', 'Common Ancestor content bAckground in inline merge-conflicts. The color must not be opAque so As not to hide underlying decorAtions.'), true);

export const mergeBorder = registerColor('merge.border', { dArk: null, light: null, hc: '#C3DF6F' }, nls.locAlize('mergeBorder', 'Border color on heAders And the splitter in inline merge-conflicts.'));

export const overviewRulerCurrentContentForeground = registerColor('editorOverviewRuler.currentContentForeground', { dArk: trAnspArent(mergeCurrentHeAderBAckground, rulerTrAnspArency), light: trAnspArent(mergeCurrentHeAderBAckground, rulerTrAnspArency), hc: mergeBorder }, nls.locAlize('overviewRulerCurrentContentForeground', 'Current overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerIncomingContentForeground = registerColor('editorOverviewRuler.incomingContentForeground', { dArk: trAnspArent(mergeIncomingHeAderBAckground, rulerTrAnspArency), light: trAnspArent(mergeIncomingHeAderBAckground, rulerTrAnspArency), hc: mergeBorder }, nls.locAlize('overviewRulerIncomingContentForeground', 'Incoming overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerCommonContentForeground = registerColor('editorOverviewRuler.commonContentForeground', { dArk: trAnspArent(mergeCommonHeAderBAckground, rulerTrAnspArency), light: trAnspArent(mergeCommonHeAderBAckground, rulerTrAnspArency), hc: mergeBorder }, nls.locAlize('overviewRulerCommonContentForeground', 'Common Ancestor overview ruler foreground for inline merge-conflicts.'));

export const overviewRulerFindMAtchForeground = registerColor('editorOverviewRuler.findMAtchForeground', { dArk: '#d186167e', light: '#d186167e', hc: '#AB5A00' }, nls.locAlize('overviewRulerFindMAtchForeground', 'Overview ruler mArker color for find mAtches. The color must not be opAque so As not to hide underlying decorAtions.'), true);

export const overviewRulerSelectionHighlightForeground = registerColor('editorOverviewRuler.selectionHighlightForeground', { dArk: '#A0A0A0CC', light: '#A0A0A0CC', hc: '#A0A0A0CC' }, nls.locAlize('overviewRulerSelectionHighlightForeground', 'Overview ruler mArker color for selection highlights. The color must not be opAque so As not to hide underlying decorAtions.'), true);

export const minimApFindMAtch = registerColor('minimAp.findMAtchHighlight', { light: '#d18616', dArk: '#d18616', hc: '#AB5A00' }, nls.locAlize('minimApFindMAtchHighlight', 'MinimAp mArker color for find mAtches.'), true);
export const minimApSelection = registerColor('minimAp.selectionHighlight', { light: '#ADD6FF', dArk: '#264F78', hc: '#ffffff' }, nls.locAlize('minimApSelectionHighlight', 'MinimAp mArker color for the editor selection.'), true);
export const minimApError = registerColor('minimAp.errorHighlight', { dArk: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hc: new Color(new RGBA(255, 50, 50, 1)) }, nls.locAlize('minimApError', 'MinimAp mArker color for errors.'));
export const minimApWArning = registerColor('minimAp.wArningHighlight', { dArk: editorWArningForeground, light: editorWArningForeground, hc: editorWArningBorder }, nls.locAlize('overviewRuleWArning', 'MinimAp mArker color for wArnings.'));
export const minimApBAckground = registerColor('minimAp.bAckground', { dArk: null, light: null, hc: null }, nls.locAlize('minimApBAckground', "MinimAp bAckground color."));

export const minimApSliderBAckground = registerColor('minimApSlider.bAckground', { light: trAnspArent(scrollbArSliderBAckground, 0.5), dArk: trAnspArent(scrollbArSliderBAckground, 0.5), hc: trAnspArent(scrollbArSliderBAckground, 0.5) }, nls.locAlize('minimApSliderBAckground', "MinimAp slider bAckground color."));
export const minimApSliderHoverBAckground = registerColor('minimApSlider.hoverBAckground', { light: trAnspArent(scrollbArSliderHoverBAckground, 0.5), dArk: trAnspArent(scrollbArSliderHoverBAckground, 0.5), hc: trAnspArent(scrollbArSliderHoverBAckground, 0.5) }, nls.locAlize('minimApSliderHoverBAckground', "MinimAp slider bAckground color when hovering."));
export const minimApSliderActiveBAckground = registerColor('minimApSlider.ActiveBAckground', { light: trAnspArent(scrollbArSliderActiveBAckground, 0.5), dArk: trAnspArent(scrollbArSliderActiveBAckground, 0.5), hc: trAnspArent(scrollbArSliderActiveBAckground, 0.5) }, nls.locAlize('minimApSliderActiveBAckground', "MinimAp slider bAckground color when clicked on."));

export const problemsErrorIconForeground = registerColor('problemsErrorIcon.foreground', { dArk: editorErrorForeground, light: editorErrorForeground, hc: editorErrorForeground }, nls.locAlize('problemsErrorIconForeground', "The color used for the problems error icon."));
export const problemsWArningIconForeground = registerColor('problemsWArningIcon.foreground', { dArk: editorWArningForeground, light: editorWArningForeground, hc: editorWArningForeground }, nls.locAlize('problemsWArningIconForeground', "The color used for the problems wArning icon."));
export const problemsInfoIconForeground = registerColor('problemsInfoIcon.foreground', { dArk: editorInfoForeground, light: editorInfoForeground, hc: editorInfoForeground }, nls.locAlize('problemsInfoIconForeground', "The color used for the problems info icon."));

/**
 * ChArt colors
 */
export const chArtsForeground = registerColor('chArts.foreground', { dArk: foreground, light: foreground, hc: foreground }, nls.locAlize('chArtsForeground', "The foreground color used in chArts."));
export const chArtsLines = registerColor('chArts.lines', { dArk: trAnspArent(foreground, .5), light: trAnspArent(foreground, .5), hc: trAnspArent(foreground, .5) }, nls.locAlize('chArtsLines', "The color used for horizontAl lines in chArts."));
export const chArtsRed = registerColor('chArts.red', { dArk: editorErrorForeground, light: editorErrorForeground, hc: editorErrorForeground }, nls.locAlize('chArtsRed', "The red color used chArts."));
export const chArtsBlue = registerColor('chArts.blue', { dArk: editorInfoForeground, light: editorInfoForeground, hc: editorInfoForeground }, nls.locAlize('chArtsBlue', "The blue color used chArts."));
export const chArtsYellow = registerColor('chArts.yellow', { dArk: editorWArningForeground, light: editorWArningForeground, hc: editorWArningForeground }, nls.locAlize('chArtsYellow', "The yellow color used chArts."));
export const chArtsOrAnge = registerColor('chArts.orAnge', { dArk: minimApFindMAtch, light: minimApFindMAtch, hc: minimApFindMAtch }, nls.locAlize('chArtsOrAnge', "The orAnge color used chArts."));
export const chArtsGreen = registerColor('chArts.green', { dArk: '#89D185', light: '#388A34', hc: '#89D185' }, nls.locAlize('chArtsGreen', "The green color used chArts."));
export const chArtsPurple = registerColor('chArts.purple', { dArk: '#B180D7', light: '#652D90', hc: '#B180D7' }, nls.locAlize('chArtsPurple', "The purple color used chArts."));

// ----- color functions

export function dArken(colorVAlue: ColorVAlue, fActor: number): ColorFunction {
	return (theme) => {
		let color = resolveColorVAlue(colorVAlue, theme);
		if (color) {
			return color.dArken(fActor);
		}
		return undefined;
	};
}

export function lighten(colorVAlue: ColorVAlue, fActor: number): ColorFunction {
	return (theme) => {
		let color = resolveColorVAlue(colorVAlue, theme);
		if (color) {
			return color.lighten(fActor);
		}
		return undefined;
	};
}

export function trAnspArent(colorVAlue: ColorVAlue, fActor: number): ColorFunction {
	return (theme) => {
		let color = resolveColorVAlue(colorVAlue, theme);
		if (color) {
			return color.trAnspArent(fActor);
		}
		return undefined;
	};
}

export function oneOf(...colorVAlues: ColorVAlue[]): ColorFunction {
	return (theme) => {
		for (let colorVAlue of colorVAlues) {
			let color = resolveColorVAlue(colorVAlue, theme);
			if (color) {
				return color;
			}
		}
		return undefined;
	};
}

function lessProminent(colorVAlue: ColorVAlue, bAckgroundColorVAlue: ColorVAlue, fActor: number, trAnspArency: number): ColorFunction {
	return (theme) => {
		let from = resolveColorVAlue(colorVAlue, theme);
		if (from) {
			let bAckgroundColor = resolveColorVAlue(bAckgroundColorVAlue, theme);
			if (bAckgroundColor) {
				if (from.isDArkerThAn(bAckgroundColor)) {
					return Color.getLighterColor(from, bAckgroundColor, fActor).trAnspArent(trAnspArency);
				}
				return Color.getDArkerColor(from, bAckgroundColor, fActor).trAnspArent(trAnspArency);
			}
			return from.trAnspArent(fActor * trAnspArency);
		}
		return undefined;
	};
}

// ----- implementAtion

/**
 * @pArAm colorVAlue Resolve A color vAlue in the context of A theme
 */
export function resolveColorVAlue(colorVAlue: ColorVAlue | null, theme: IColorTheme): Color | undefined {
	if (colorVAlue === null) {
		return undefined;
	} else if (typeof colorVAlue === 'string') {
		if (colorVAlue[0] === '#') {
			return Color.fromHex(colorVAlue);
		}
		return theme.getColor(colorVAlue);
	} else if (colorVAlue instAnceof Color) {
		return colorVAlue;
	} else if (typeof colorVAlue === 'function') {
		return colorVAlue(theme);
	}
	return undefined;
}

export const workbenchColorsSchemAId = 'vscode://schemAs/workbench-colors';

let schemARegistry = plAtform.Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
schemARegistry.registerSchemA(workbenchColorsSchemAId, colorRegistry.getColorSchemA());

const delAyer = new RunOnceScheduler(() => schemARegistry.notifySchemAChAnged(workbenchColorsSchemAId), 200);
colorRegistry.onDidChAngeSchemA(() => {
	if (!delAyer.isScheduled()) {
		delAyer.schedule();
	}
});

// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
