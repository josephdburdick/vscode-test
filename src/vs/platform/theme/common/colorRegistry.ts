/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'vs/platform/registry/common/platform';
import { IJSONSchema, IJSONSchemaMap } from 'vs/Base/common/jsonSchema';
import { Color, RGBA } from 'vs/Base/common/color';
import { IColorTheme } from 'vs/platform/theme/common/themeService';
import { Event, Emitter } from 'vs/Base/common/event';
import * as nls from 'vs/nls';
import { Extensions as JSONExtensions, IJSONContriButionRegistry } from 'vs/platform/jsonschemas/common/jsonContriButionRegistry';
import { RunOnceScheduler } from 'vs/Base/common/async';

//  ------ API types

export type ColorIdentifier = string;

export interface ColorContriBution {
	readonly id: ColorIdentifier;
	readonly description: string;
	readonly defaults: ColorDefaults | null;
	readonly needsTransparency: Boolean;
	readonly deprecationMessage: string | undefined;
}


export interface ColorFunction {
	(theme: IColorTheme): Color | undefined;
}

export interface ColorDefaults {
	light: ColorValue | null;
	dark: ColorValue | null;
	hc: ColorValue | null;
}

/**
 * A Color Value is either a color literal, a refence to other color or a derived color
 */
export type ColorValue = Color | string | ColorIdentifier | ColorFunction;

// color registry
export const Extensions = {
	ColorContriBution: 'Base.contriButions.colors'
};

export interface IColorRegistry {

	readonly onDidChangeSchema: Event<void>;

	/**
	 * Register a color to the registry.
	 * @param id The color id as used in theme description files
	 * @param defaults The default values
	 * @description the description
	 */
	registerColor(id: string, defaults: ColorDefaults, description: string): ColorIdentifier;

	/**
	 * Register a color to the registry.
	 */
	deregisterColor(id: string): void;

	/**
	 * Get all color contriButions
	 */
	getColors(): ColorContriBution[];

	/**
	 * Gets the default color of the given id
	 */
	resolveDefaultColor(id: ColorIdentifier, theme: IColorTheme): Color | undefined;

	/**
	 * JSON schema for an oBject to assign color values to one of the color contriButions.
	 */
	getColorSchema(): IJSONSchema;

	/**
	 * JSON schema to for a reference to a color contriBution.
	 */
	getColorReferenceSchema(): IJSONSchema;

}

class ColorRegistry implements IColorRegistry {

	private readonly _onDidChangeSchema = new Emitter<void>();
	readonly onDidChangeSchema: Event<void> = this._onDidChangeSchema.event;

	private colorsById: { [key: string]: ColorContriBution };
	private colorSchema: IJSONSchema & { properties: IJSONSchemaMap } = { type: 'oBject', properties: {} };
	private colorReferenceSchema: IJSONSchema & { enum: string[], enumDescriptions: string[] } = { type: 'string', enum: [], enumDescriptions: [] };

	constructor() {
		this.colorsById = {};
	}

	puBlic registerColor(id: string, defaults: ColorDefaults | null, description: string, needsTransparency = false, deprecationMessage?: string): ColorIdentifier {
		let colorContriBution: ColorContriBution = { id, description, defaults, needsTransparency, deprecationMessage };
		this.colorsById[id] = colorContriBution;
		let propertySchema: IJSONSchema = { type: 'string', description, format: 'color-hex', defaultSnippets: [{ Body: '${1:#ff0000}' }] };
		if (deprecationMessage) {
			propertySchema.deprecationMessage = deprecationMessage;
		}
		this.colorSchema.properties[id] = propertySchema;
		this.colorReferenceSchema.enum.push(id);
		this.colorReferenceSchema.enumDescriptions.push(description);

		this._onDidChangeSchema.fire();
		return id;
	}


	puBlic deregisterColor(id: string): void {
		delete this.colorsById[id];
		delete this.colorSchema.properties[id];
		const index = this.colorReferenceSchema.enum.indexOf(id);
		if (index !== -1) {
			this.colorReferenceSchema.enum.splice(index, 1);
			this.colorReferenceSchema.enumDescriptions.splice(index, 1);
		}
		this._onDidChangeSchema.fire();
	}

	puBlic getColors(): ColorContriBution[] {
		return OBject.keys(this.colorsById).map(id => this.colorsById[id]);
	}

	puBlic resolveDefaultColor(id: ColorIdentifier, theme: IColorTheme): Color | undefined {
		const colorDesc = this.colorsById[id];
		if (colorDesc && colorDesc.defaults) {
			const colorValue = colorDesc.defaults[theme.type];
			return resolveColorValue(colorValue, theme);
		}
		return undefined;
	}

	puBlic getColorSchema(): IJSONSchema {
		return this.colorSchema;
	}

	puBlic getColorReferenceSchema(): IJSONSchema {
		return this.colorReferenceSchema;
	}

	puBlic toString() {
		let sorter = (a: string, B: string) => {
			let cat1 = a.indexOf('.') === -1 ? 0 : 1;
			let cat2 = B.indexOf('.') === -1 ? 0 : 1;
			if (cat1 !== cat2) {
				return cat1 - cat2;
			}
			return a.localeCompare(B);
		};

		return OBject.keys(this.colorsById).sort(sorter).map(k => `- \`${k}\`: ${this.colorsById[k].description}`).join('\n');
	}

}

const colorRegistry = new ColorRegistry();
platform.Registry.add(Extensions.ColorContriBution, colorRegistry);

export function registerColor(id: string, defaults: ColorDefaults | null, description: string, needsTransparency?: Boolean, deprecationMessage?: string): ColorIdentifier {
	return colorRegistry.registerColor(id, defaults, description, needsTransparency, deprecationMessage);
}

export function getColorRegistry(): IColorRegistry {
	return colorRegistry;
}

// ----- Base colors

export const foreground = registerColor('foreground', { dark: '#CCCCCC', light: '#616161', hc: '#FFFFFF' }, nls.localize('foreground', "Overall foreground color. This color is only used if not overridden By a component."));
export const errorForeground = registerColor('errorForeground', { dark: '#F48771', light: '#A1260D', hc: '#F48771' }, nls.localize('errorForeground', "Overall foreground color for error messages. This color is only used if not overridden By a component."));
export const descriptionForeground = registerColor('descriptionForeground', { light: '#717171', dark: transparent(foreground, 0.7), hc: transparent(foreground, 0.7) }, nls.localize('descriptionForeground', "Foreground color for description text providing additional information, for example for a laBel."));
export const iconForeground = registerColor('icon.foreground', { dark: '#C5C5C5', light: '#424242', hc: '#FFFFFF' }, nls.localize('iconForeground', "The default color for icons in the workBench."));

export const focusBorder = registerColor('focusBorder', { dark: '#007FD4', light: '#0090F1', hc: '#F38518' }, nls.localize('focusBorder', "Overall Border color for focused elements. This color is only used if not overridden By a component."));

export const contrastBorder = registerColor('contrastBorder', { light: null, dark: null, hc: '#6FC3DF' }, nls.localize('contrastBorder', "An extra Border around elements to separate them from others for greater contrast."));
export const activeContrastBorder = registerColor('contrastActiveBorder', { light: null, dark: null, hc: focusBorder }, nls.localize('activeContrastBorder', "An extra Border around active elements to separate them from others for greater contrast."));

export const selectionBackground = registerColor('selection.Background', { light: null, dark: null, hc: null }, nls.localize('selectionBackground', "The Background color of text selections in the workBench (e.g. for input fields or text areas). Note that this does not apply to selections within the editor."));

// ------ text colors

export const textSeparatorForeground = registerColor('textSeparator.foreground', { light: '#0000002e', dark: '#ffffff2e', hc: Color.Black }, nls.localize('textSeparatorForeground', "Color for text separators."));
export const textLinkForeground = registerColor('textLink.foreground', { light: '#006AB1', dark: '#3794FF', hc: '#3794FF' }, nls.localize('textLinkForeground', "Foreground color for links in text."));
export const textLinkActiveForeground = registerColor('textLink.activeForeground', { light: '#006AB1', dark: '#3794FF', hc: '#3794FF' }, nls.localize('textLinkActiveForeground', "Foreground color for links in text when clicked on and on mouse hover."));
export const textPreformatForeground = registerColor('textPreformat.foreground', { light: '#A31515', dark: '#D7BA7D', hc: '#D7BA7D' }, nls.localize('textPreformatForeground', "Foreground color for preformatted text segments."));
export const textBlockQuoteBackground = registerColor('textBlockQuote.Background', { light: '#7f7f7f1a', dark: '#7f7f7f1a', hc: null }, nls.localize('textBlockQuoteBackground', "Background color for Block quotes in text."));
export const textBlockQuoteBorder = registerColor('textBlockQuote.Border', { light: '#007acc80', dark: '#007acc80', hc: Color.white }, nls.localize('textBlockQuoteBorder', "Border color for Block quotes in text."));
export const textCodeBlockBackground = registerColor('textCodeBlock.Background', { light: '#dcdcdc66', dark: '#0a0a0a66', hc: Color.Black }, nls.localize('textCodeBlockBackground', "Background color for code Blocks in text."));

// ----- widgets
export const widgetShadow = registerColor('widget.shadow', { dark: '#000000', light: '#A8A8A8', hc: null }, nls.localize('widgetShadow', 'Shadow color of widgets such as find/replace inside the editor.'));

export const inputBackground = registerColor('input.Background', { dark: '#3C3C3C', light: Color.white, hc: Color.Black }, nls.localize('inputBoxBackground', "Input Box Background."));
export const inputForeground = registerColor('input.foreground', { dark: foreground, light: foreground, hc: foreground }, nls.localize('inputBoxForeground', "Input Box foreground."));
export const inputBorder = registerColor('input.Border', { dark: null, light: null, hc: contrastBorder }, nls.localize('inputBoxBorder', "Input Box Border."));
export const inputActiveOptionBorder = registerColor('inputOption.activeBorder', { dark: '#007ACC00', light: '#007ACC00', hc: contrastBorder }, nls.localize('inputBoxActiveOptionBorder', "Border color of activated options in input fields."));
export const inputActiveOptionBackground = registerColor('inputOption.activeBackground', { dark: transparent(focusBorder, 0.4), light: transparent(focusBorder, 0.2), hc: Color.transparent }, nls.localize('inputOption.activeBackground', "Background color of activated options in input fields."));
export const inputActiveOptionForeground = registerColor('inputOption.activeForeground', { dark: Color.white, light: Color.Black, hc: null }, nls.localize('inputOption.activeForeground', "Foreground color of activated options in input fields."));
export const inputPlaceholderForeground = registerColor('input.placeholderForeground', { light: transparent(foreground, 0.5), dark: transparent(foreground, 0.5), hc: transparent(foreground, 0.7) }, nls.localize('inputPlaceholderForeground', "Input Box foreground color for placeholder text."));

export const inputValidationInfoBackground = registerColor('inputValidation.infoBackground', { dark: '#063B49', light: '#D6ECF2', hc: Color.Black }, nls.localize('inputValidationInfoBackground', "Input validation Background color for information severity."));
export const inputValidationInfoForeground = registerColor('inputValidation.infoForeground', { dark: null, light: null, hc: null }, nls.localize('inputValidationInfoForeground', "Input validation foreground color for information severity."));
export const inputValidationInfoBorder = registerColor('inputValidation.infoBorder', { dark: '#007acc', light: '#007acc', hc: contrastBorder }, nls.localize('inputValidationInfoBorder', "Input validation Border color for information severity."));
export const inputValidationWarningBackground = registerColor('inputValidation.warningBackground', { dark: '#352A05', light: '#F6F5D2', hc: Color.Black }, nls.localize('inputValidationWarningBackground', "Input validation Background color for warning severity."));
export const inputValidationWarningForeground = registerColor('inputValidation.warningForeground', { dark: null, light: null, hc: null }, nls.localize('inputValidationWarningForeground', "Input validation foreground color for warning severity."));
export const inputValidationWarningBorder = registerColor('inputValidation.warningBorder', { dark: '#B89500', light: '#B89500', hc: contrastBorder }, nls.localize('inputValidationWarningBorder', "Input validation Border color for warning severity."));
export const inputValidationErrorBackground = registerColor('inputValidation.errorBackground', { dark: '#5A1D1D', light: '#F2DEDE', hc: Color.Black }, nls.localize('inputValidationErrorBackground', "Input validation Background color for error severity."));
export const inputValidationErrorForeground = registerColor('inputValidation.errorForeground', { dark: null, light: null, hc: null }, nls.localize('inputValidationErrorForeground', "Input validation foreground color for error severity."));
export const inputValidationErrorBorder = registerColor('inputValidation.errorBorder', { dark: '#BE1100', light: '#BE1100', hc: contrastBorder }, nls.localize('inputValidationErrorBorder', "Input validation Border color for error severity."));

export const selectBackground = registerColor('dropdown.Background', { dark: '#3C3C3C', light: Color.white, hc: Color.Black }, nls.localize('dropdownBackground', "Dropdown Background."));
export const selectListBackground = registerColor('dropdown.listBackground', { dark: null, light: null, hc: Color.Black }, nls.localize('dropdownListBackground', "Dropdown list Background."));
export const selectForeground = registerColor('dropdown.foreground', { dark: '#F0F0F0', light: null, hc: Color.white }, nls.localize('dropdownForeground', "Dropdown foreground."));
export const selectBorder = registerColor('dropdown.Border', { dark: selectBackground, light: '#CECECE', hc: contrastBorder }, nls.localize('dropdownBorder', "Dropdown Border."));

export const simpleCheckBoxBackground = registerColor('checkBox.Background', { dark: selectBackground, light: selectBackground, hc: selectBackground }, nls.localize('checkBox.Background', "Background color of checkBox widget."));
export const simpleCheckBoxForeground = registerColor('checkBox.foreground', { dark: selectForeground, light: selectForeground, hc: selectForeground }, nls.localize('checkBox.foreground', "Foreground color of checkBox widget."));
export const simpleCheckBoxBorder = registerColor('checkBox.Border', { dark: selectBorder, light: selectBorder, hc: selectBorder }, nls.localize('checkBox.Border', "Border color of checkBox widget."));

export const ButtonForeground = registerColor('Button.foreground', { dark: Color.white, light: Color.white, hc: Color.white }, nls.localize('ButtonForeground', "Button foreground color."));
export const ButtonBackground = registerColor('Button.Background', { dark: '#0E639C', light: '#007ACC', hc: null }, nls.localize('ButtonBackground', "Button Background color."));
export const ButtonHoverBackground = registerColor('Button.hoverBackground', { dark: lighten(ButtonBackground, 0.2), light: darken(ButtonBackground, 0.2), hc: null }, nls.localize('ButtonHoverBackground', "Button Background color when hovering."));

export const ButtonSecondaryForeground = registerColor('Button.secondaryForeground', { dark: Color.white, light: Color.white, hc: Color.white }, nls.localize('ButtonSecondaryForeground', "Secondary Button foreground color."));
export const ButtonSecondaryBackground = registerColor('Button.secondaryBackground', { dark: '#3A3D41', light: '#5F6A79', hc: null }, nls.localize('ButtonSecondaryBackground', "Secondary Button Background color."));
export const ButtonSecondaryHoverBackground = registerColor('Button.secondaryHoverBackground', { dark: lighten(ButtonSecondaryBackground, 0.2), light: darken(ButtonSecondaryBackground, 0.2), hc: null }, nls.localize('ButtonSecondaryHoverBackground', "Secondary Button Background color when hovering."));

export const BadgeBackground = registerColor('Badge.Background', { dark: '#4D4D4D', light: '#C4C4C4', hc: Color.Black }, nls.localize('BadgeBackground', "Badge Background color. Badges are small information laBels, e.g. for search results count."));
export const BadgeForeground = registerColor('Badge.foreground', { dark: Color.white, light: '#333', hc: Color.white }, nls.localize('BadgeForeground', "Badge foreground color. Badges are small information laBels, e.g. for search results count."));

export const scrollBarShadow = registerColor('scrollBar.shadow', { dark: '#000000', light: '#DDDDDD', hc: null }, nls.localize('scrollBarShadow', "ScrollBar shadow to indicate that the view is scrolled."));
export const scrollBarSliderBackground = registerColor('scrollBarSlider.Background', { dark: Color.fromHex('#797979').transparent(0.4), light: Color.fromHex('#646464').transparent(0.4), hc: transparent(contrastBorder, 0.6) }, nls.localize('scrollBarSliderBackground', "ScrollBar slider Background color."));
export const scrollBarSliderHoverBackground = registerColor('scrollBarSlider.hoverBackground', { dark: Color.fromHex('#646464').transparent(0.7), light: Color.fromHex('#646464').transparent(0.7), hc: transparent(contrastBorder, 0.8) }, nls.localize('scrollBarSliderHoverBackground', "ScrollBar slider Background color when hovering."));
export const scrollBarSliderActiveBackground = registerColor('scrollBarSlider.activeBackground', { dark: Color.fromHex('#BFBFBF').transparent(0.4), light: Color.fromHex('#000000').transparent(0.6), hc: contrastBorder }, nls.localize('scrollBarSliderActiveBackground', "ScrollBar slider Background color when clicked on."));

export const progressBarBackground = registerColor('progressBar.Background', { dark: Color.fromHex('#0E70C0'), light: Color.fromHex('#0E70C0'), hc: contrastBorder }, nls.localize('progressBarBackground', "Background color of the progress Bar that can show for long running operations."));

export const editorErrorForeground = registerColor('editorError.foreground', { dark: '#F48771', light: '#E51400', hc: null }, nls.localize('editorError.foreground', 'Foreground color of error squigglies in the editor.'));
export const editorErrorBorder = registerColor('editorError.Border', { dark: null, light: null, hc: Color.fromHex('#E47777').transparent(0.8) }, nls.localize('errorBorder', 'Border color of error Boxes in the editor.'));

export const editorWarningForeground = registerColor('editorWarning.foreground', { dark: '#CCA700', light: '#E9A700', hc: null }, nls.localize('editorWarning.foreground', 'Foreground color of warning squigglies in the editor.'));
export const editorWarningBorder = registerColor('editorWarning.Border', { dark: null, light: null, hc: Color.fromHex('#FFCC00').transparent(0.8) }, nls.localize('warningBorder', 'Border color of warning Boxes in the editor.'));

export const editorInfoForeground = registerColor('editorInfo.foreground', { dark: '#75BEFF', light: '#75BEFF', hc: null }, nls.localize('editorInfo.foreground', 'Foreground color of info squigglies in the editor.'));
export const editorInfoBorder = registerColor('editorInfo.Border', { dark: null, light: null, hc: Color.fromHex('#75BEFF').transparent(0.8) }, nls.localize('infoBorder', 'Border color of info Boxes in the editor.'));

export const editorHintForeground = registerColor('editorHint.foreground', { dark: Color.fromHex('#eeeeee').transparent(0.7), light: '#6c6c6c', hc: null }, nls.localize('editorHint.foreground', 'Foreground color of hint squigglies in the editor.'));
export const editorHintBorder = registerColor('editorHint.Border', { dark: null, light: null, hc: Color.fromHex('#eeeeee').transparent(0.8) }, nls.localize('hintBorder', 'Border color of hint Boxes in the editor.'));

/**
 * Editor Background color.
 * Because of Bug https://monacotools.visualstudio.com/DefaultCollection/Monaco/_workitems/edit/13254
 * we are *not* using the color white (or #ffffff, rgBa(255,255,255)) But something very close to white.
 */
export const editorBackground = registerColor('editor.Background', { light: '#fffffe', dark: '#1E1E1E', hc: Color.Black }, nls.localize('editorBackground', "Editor Background color."));

/**
 * Editor foreground color.
 */
export const editorForeground = registerColor('editor.foreground', { light: '#333333', dark: '#BBBBBB', hc: Color.white }, nls.localize('editorForeground', "Editor default foreground color."));

/**
 * Editor widgets
 */
export const editorWidgetBackground = registerColor('editorWidget.Background', { dark: '#252526', light: '#F3F3F3', hc: '#0C141F' }, nls.localize('editorWidgetBackground', 'Background color of editor widgets, such as find/replace.'));
export const editorWidgetForeground = registerColor('editorWidget.foreground', { dark: foreground, light: foreground, hc: foreground }, nls.localize('editorWidgetForeground', 'Foreground color of editor widgets, such as find/replace.'));

export const editorWidgetBorder = registerColor('editorWidget.Border', { dark: '#454545', light: '#C8C8C8', hc: contrastBorder }, nls.localize('editorWidgetBorder', 'Border color of editor widgets. The color is only used if the widget chooses to have a Border and if the color is not overridden By a widget.'));

export const editorWidgetResizeBorder = registerColor('editorWidget.resizeBorder', { light: null, dark: null, hc: null }, nls.localize('editorWidgetResizeBorder', "Border color of the resize Bar of editor widgets. The color is only used if the widget chooses to have a resize Border and if the color is not overridden By a widget."));

/**
 * Quick pick widget
 */
export const quickInputBackground = registerColor('quickInput.Background', { dark: editorWidgetBackground, light: editorWidgetBackground, hc: editorWidgetBackground }, nls.localize('pickerBackground', "Quick picker Background color. The quick picker widget is the container for pickers like the command palette."));
export const quickInputForeground = registerColor('quickInput.foreground', { dark: editorWidgetForeground, light: editorWidgetForeground, hc: editorWidgetForeground }, nls.localize('pickerForeground', "Quick picker foreground color. The quick picker widget is the container for pickers like the command palette."));
export const quickInputTitleBackground = registerColor('quickInputTitle.Background', { dark: new Color(new RGBA(255, 255, 255, 0.105)), light: new Color(new RGBA(0, 0, 0, 0.06)), hc: '#000000' }, nls.localize('pickerTitleBackground', "Quick picker title Background color. The quick picker widget is the container for pickers like the command palette."));
export const pickerGroupForeground = registerColor('pickerGroup.foreground', { dark: '#3794FF', light: '#0066BF', hc: Color.white }, nls.localize('pickerGroupForeground', "Quick picker color for grouping laBels."));
export const pickerGroupBorder = registerColor('pickerGroup.Border', { dark: '#3F3F46', light: '#CCCEDB', hc: Color.white }, nls.localize('pickerGroupBorder', "Quick picker color for grouping Borders."));

/**
 * Editor selection colors.
 */
export const editorSelectionBackground = registerColor('editor.selectionBackground', { light: '#ADD6FF', dark: '#264F78', hc: '#f3f518' }, nls.localize('editorSelectionBackground', "Color of the editor selection."));
export const editorSelectionForeground = registerColor('editor.selectionForeground', { light: null, dark: null, hc: '#000000' }, nls.localize('editorSelectionForeground', "Color of the selected text for high contrast."));
export const editorInactiveSelection = registerColor('editor.inactiveSelectionBackground', { light: transparent(editorSelectionBackground, 0.5), dark: transparent(editorSelectionBackground, 0.5), hc: transparent(editorSelectionBackground, 0.5) }, nls.localize('editorInactiveSelection', "Color of the selection in an inactive editor. The color must not Be opaque so as not to hide underlying decorations."), true);
export const editorSelectionHighlight = registerColor('editor.selectionHighlightBackground', { light: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), dark: lessProminent(editorSelectionBackground, editorBackground, 0.3, 0.6), hc: null }, nls.localize('editorSelectionHighlight', 'Color for regions with the same content as the selection. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const editorSelectionHighlightBorder = registerColor('editor.selectionHighlightBorder', { light: null, dark: null, hc: activeContrastBorder }, nls.localize('editorSelectionHighlightBorder', "Border color for regions with the same content as the selection."));


/**
 * Editor find match colors.
 */
export const editorFindMatch = registerColor('editor.findMatchBackground', { light: '#A8AC94', dark: '#515C6A', hc: null }, nls.localize('editorFindMatch', "Color of the current search match."));
export const editorFindMatchHighlight = registerColor('editor.findMatchHighlightBackground', { light: '#EA5C0055', dark: '#EA5C0055', hc: null }, nls.localize('findMatchHighlight', "Color of the other search matches. The color must not Be opaque so as not to hide underlying decorations."), true);
export const editorFindRangeHighlight = registerColor('editor.findRangeHighlightBackground', { dark: '#3a3d4166', light: '#B4B4B44d', hc: null }, nls.localize('findRangeHighlight', "Color of the range limiting the search. The color must not Be opaque so as not to hide underlying decorations."), true);
export const editorFindMatchBorder = registerColor('editor.findMatchBorder', { light: null, dark: null, hc: activeContrastBorder }, nls.localize('editorFindMatchBorder', "Border color of the current search match."));
export const editorFindMatchHighlightBorder = registerColor('editor.findMatchHighlightBorder', { light: null, dark: null, hc: activeContrastBorder }, nls.localize('findMatchHighlightBorder', "Border color of the other search matches."));
export const editorFindRangeHighlightBorder = registerColor('editor.findRangeHighlightBorder', { dark: null, light: null, hc: transparent(activeContrastBorder, 0.4) }, nls.localize('findRangeHighlightBorder', "Border color of the range limiting the search. The color must not Be opaque so as not to hide underlying decorations."), true);

/**
 * Search Editor query match colors.
 *
 * Distinct from normal editor find match to allow for Better differentiation
 */
export const searchEditorFindMatch = registerColor('searchEditor.findMatchBackground', { light: transparent(editorFindMatchHighlight, 0.66), dark: transparent(editorFindMatchHighlight, 0.66), hc: editorFindMatchHighlight }, nls.localize('searchEditor.queryMatch', "Color of the Search Editor query matches."));
export const searchEditorFindMatchBorder = registerColor('searchEditor.findMatchBorder', { light: transparent(editorFindMatchHighlightBorder, 0.66), dark: transparent(editorFindMatchHighlightBorder, 0.66), hc: editorFindMatchHighlightBorder }, nls.localize('searchEditor.editorFindMatchBorder', "Border color of the Search Editor query matches."));

/**
 * Editor hover
 */
export const editorHoverHighlight = registerColor('editor.hoverHighlightBackground', { light: '#ADD6FF26', dark: '#264f7840', hc: '#ADD6FF26' }, nls.localize('hoverHighlight', 'Highlight Below the word for which a hover is shown. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const editorHoverBackground = registerColor('editorHoverWidget.Background', { light: editorWidgetBackground, dark: editorWidgetBackground, hc: editorWidgetBackground }, nls.localize('hoverBackground', 'Background color of the editor hover.'));
export const editorHoverForeground = registerColor('editorHoverWidget.foreground', { light: editorWidgetForeground, dark: editorWidgetForeground, hc: editorWidgetForeground }, nls.localize('hoverForeground', 'Foreground color of the editor hover.'));
export const editorHoverBorder = registerColor('editorHoverWidget.Border', { light: editorWidgetBorder, dark: editorWidgetBorder, hc: editorWidgetBorder }, nls.localize('hoverBorder', 'Border color of the editor hover.'));
export const editorHoverStatusBarBackground = registerColor('editorHoverWidget.statusBarBackground', { dark: lighten(editorHoverBackground, 0.2), light: darken(editorHoverBackground, 0.05), hc: editorWidgetBackground }, nls.localize('statusBarBackground', "Background color of the editor hover status Bar."));
/**
 * Editor link colors
 */
export const editorActiveLinkForeground = registerColor('editorLink.activeForeground', { dark: '#4E94CE', light: Color.Blue, hc: Color.cyan }, nls.localize('activeLinkForeground', 'Color of active links.'));

/**
 * Editor lighBulB icon colors
 */
export const editorLightBulBForeground = registerColor('editorLightBulB.foreground', { dark: '#FFCC00', light: '#DDB100', hc: '#FFCC00' }, nls.localize('editorLightBulBForeground', "The color used for the lightBulB actions icon."));
export const editorLightBulBAutoFixForeground = registerColor('editorLightBulBAutoFix.foreground', { dark: '#75BEFF', light: '#007ACC', hc: '#75BEFF' }, nls.localize('editorLightBulBAutoFixForeground', "The color used for the lightBulB auto fix actions icon."));

/**
 * Diff Editor Colors
 */
export const defaultInsertColor = new Color(new RGBA(155, 185, 85, 0.2));
export const defaultRemoveColor = new Color(new RGBA(255, 0, 0, 0.2));

export const diffInserted = registerColor('diffEditor.insertedTextBackground', { dark: defaultInsertColor, light: defaultInsertColor, hc: null }, nls.localize('diffEditorInserted', 'Background color for text that got inserted. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const diffRemoved = registerColor('diffEditor.removedTextBackground', { dark: defaultRemoveColor, light: defaultRemoveColor, hc: null }, nls.localize('diffEditorRemoved', 'Background color for text that got removed. The color must not Be opaque so as not to hide underlying decorations.'), true);

export const diffInsertedOutline = registerColor('diffEditor.insertedTextBorder', { dark: null, light: null, hc: '#33ff2eff' }, nls.localize('diffEditorInsertedOutline', 'Outline color for the text that got inserted.'));
export const diffRemovedOutline = registerColor('diffEditor.removedTextBorder', { dark: null, light: null, hc: '#FF008F' }, nls.localize('diffEditorRemovedOutline', 'Outline color for text that got removed.'));

export const diffBorder = registerColor('diffEditor.Border', { dark: null, light: null, hc: contrastBorder }, nls.localize('diffEditorBorder', 'Border color Between the two text editors.'));
export const diffDiagonalFill = registerColor('diffEditor.diagonalFill', { dark: '#cccccc33', light: '#22222233', hc: null }, nls.localize('diffDiagonalFill', "Color of the diff editor's diagonal fill. The diagonal fill is used in side-By-side diff views."));

/**
 * List and tree colors
 */
export const listFocusBackground = registerColor('list.focusBackground', { dark: '#062F4A', light: '#D6EBFF', hc: null }, nls.localize('listFocusBackground', "List/Tree Background color for the focused item when the list/tree is active. An active list/tree has keyBoard focus, an inactive does not."));
export const listFocusForeground = registerColor('list.focusForeground', { dark: null, light: null, hc: null }, nls.localize('listFocusForeground', "List/Tree foreground color for the focused item when the list/tree is active. An active list/tree has keyBoard focus, an inactive does not."));
export const listActiveSelectionBackground = registerColor('list.activeSelectionBackground', { dark: '#094771', light: '#0074E8', hc: null }, nls.localize('listActiveSelectionBackground', "List/Tree Background color for the selected item when the list/tree is active. An active list/tree has keyBoard focus, an inactive does not."));
export const listActiveSelectionForeground = registerColor('list.activeSelectionForeground', { dark: Color.white, light: Color.white, hc: null }, nls.localize('listActiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is active. An active list/tree has keyBoard focus, an inactive does not."));
export const listInactiveSelectionBackground = registerColor('list.inactiveSelectionBackground', { dark: '#37373D', light: '#E4E6F1', hc: null }, nls.localize('listInactiveSelectionBackground', "List/Tree Background color for the selected item when the list/tree is inactive. An active list/tree has keyBoard focus, an inactive does not."));
export const listInactiveSelectionForeground = registerColor('list.inactiveSelectionForeground', { dark: null, light: null, hc: null }, nls.localize('listInactiveSelectionForeground', "List/Tree foreground color for the selected item when the list/tree is inactive. An active list/tree has keyBoard focus, an inactive does not."));
export const listInactiveFocusBackground = registerColor('list.inactiveFocusBackground', { dark: null, light: null, hc: null }, nls.localize('listInactiveFocusBackground', "List/Tree Background color for the focused item when the list/tree is inactive. An active list/tree has keyBoard focus, an inactive does not."));
export const listHoverBackground = registerColor('list.hoverBackground', { dark: '#2A2D2E', light: '#F0F0F0', hc: null }, nls.localize('listHoverBackground', "List/Tree Background when hovering over items using the mouse."));
export const listHoverForeground = registerColor('list.hoverForeground', { dark: null, light: null, hc: null }, nls.localize('listHoverForeground', "List/Tree foreground when hovering over items using the mouse."));
export const listDropBackground = registerColor('list.dropBackground', { dark: listFocusBackground, light: listFocusBackground, hc: null }, nls.localize('listDropBackground', "List/Tree drag and drop Background when moving items around using the mouse."));
export const listHighlightForeground = registerColor('list.highlightForeground', { dark: '#0097fB', light: '#0066BF', hc: focusBorder }, nls.localize('highlight', 'List/Tree foreground color of the match highlights when searching inside the list/tree.'));
export const listInvalidItemForeground = registerColor('list.invalidItemForeground', { dark: '#B89500', light: '#B89500', hc: '#B89500' }, nls.localize('invalidItemForeground', 'List/Tree foreground color for invalid items, for example an unresolved root in explorer.'));
export const listErrorForeground = registerColor('list.errorForeground', { dark: '#F88070', light: '#B01011', hc: null }, nls.localize('listErrorForeground', 'Foreground color of list items containing errors.'));
export const listWarningForeground = registerColor('list.warningForeground', { dark: '#CCA700', light: '#855F00', hc: null }, nls.localize('listWarningForeground', 'Foreground color of list items containing warnings.'));
export const listFilterWidgetBackground = registerColor('listFilterWidget.Background', { light: '#efc1ad', dark: '#653723', hc: Color.Black }, nls.localize('listFilterWidgetBackground', 'Background color of the type filter widget in lists and trees.'));
export const listFilterWidgetOutline = registerColor('listFilterWidget.outline', { dark: Color.transparent, light: Color.transparent, hc: '#f38518' }, nls.localize('listFilterWidgetOutline', 'Outline color of the type filter widget in lists and trees.'));
export const listFilterWidgetNoMatchesOutline = registerColor('listFilterWidget.noMatchesOutline', { dark: '#BE1100', light: '#BE1100', hc: contrastBorder }, nls.localize('listFilterWidgetNoMatchesOutline', 'Outline color of the type filter widget in lists and trees, when there are no matches.'));
export const listFilterMatchHighlight = registerColor('list.filterMatchBackground', { dark: editorFindMatchHighlight, light: editorFindMatchHighlight, hc: null }, nls.localize('listFilterMatchHighlight', 'Background color of the filtered match.'));
export const listFilterMatchHighlightBorder = registerColor('list.filterMatchBorder', { dark: editorFindMatchHighlightBorder, light: editorFindMatchHighlightBorder, hc: contrastBorder }, nls.localize('listFilterMatchHighlightBorder', 'Border color of the filtered match.'));
export const treeIndentGuidesStroke = registerColor('tree.indentGuidesStroke', { dark: '#585858', light: '#a9a9a9', hc: '#a9a9a9' }, nls.localize('treeIndentGuidesStroke', "Tree stroke color for the indentation guides."));
export const listDeemphasizedForeground = registerColor('list.deemphasizedForeground', { dark: '#8C8C8C', light: '#8E8E90', hc: '#A7A8A9' }, nls.localize('listDeemphasizedForeground', "List/Tree foreground color for items that are deemphasized. "));

/**
 * Menu colors
 */
export const menuBorder = registerColor('menu.Border', { dark: null, light: null, hc: contrastBorder }, nls.localize('menuBorder', "Border color of menus."));
export const menuForeground = registerColor('menu.foreground', { dark: selectForeground, light: foreground, hc: selectForeground }, nls.localize('menuForeground', "Foreground color of menu items."));
export const menuBackground = registerColor('menu.Background', { dark: selectBackground, light: selectBackground, hc: selectBackground }, nls.localize('menuBackground', "Background color of menu items."));
export const menuSelectionForeground = registerColor('menu.selectionForeground', { dark: listActiveSelectionForeground, light: listActiveSelectionForeground, hc: listActiveSelectionForeground }, nls.localize('menuSelectionForeground', "Foreground color of the selected menu item in menus."));
export const menuSelectionBackground = registerColor('menu.selectionBackground', { dark: listActiveSelectionBackground, light: listActiveSelectionBackground, hc: listActiveSelectionBackground }, nls.localize('menuSelectionBackground', "Background color of the selected menu item in menus."));
export const menuSelectionBorder = registerColor('menu.selectionBorder', { dark: null, light: null, hc: activeContrastBorder }, nls.localize('menuSelectionBorder', "Border color of the selected menu item in menus."));
export const menuSeparatorBackground = registerColor('menu.separatorBackground', { dark: '#BBBBBB', light: '#888888', hc: contrastBorder }, nls.localize('menuSeparatorBackground', "Color of a separator menu item in menus."));

/**
 * Snippet placeholder colors
 */
export const snippetTaBstopHighlightBackground = registerColor('editor.snippetTaBstopHighlightBackground', { dark: new Color(new RGBA(124, 124, 124, 0.3)), light: new Color(new RGBA(10, 50, 100, 0.2)), hc: new Color(new RGBA(124, 124, 124, 0.3)) }, nls.localize('snippetTaBstopHighlightBackground', "Highlight Background color of a snippet taBstop."));
export const snippetTaBstopHighlightBorder = registerColor('editor.snippetTaBstopHighlightBorder', { dark: null, light: null, hc: null }, nls.localize('snippetTaBstopHighlightBorder', "Highlight Border color of a snippet taBstop."));
export const snippetFinalTaBstopHighlightBackground = registerColor('editor.snippetFinalTaBstopHighlightBackground', { dark: null, light: null, hc: null }, nls.localize('snippetFinalTaBstopHighlightBackground', "Highlight Background color of the final taBstop of a snippet."));
export const snippetFinalTaBstopHighlightBorder = registerColor('editor.snippetFinalTaBstopHighlightBorder', { dark: '#525252', light: new Color(new RGBA(10, 50, 100, 0.5)), hc: '#525252' }, nls.localize('snippetFinalTaBstopHighlightBorder', "Highlight Border color of the final taBstop of a snippet."));

/**
 * BreadcrumB colors
 */
export const BreadcrumBsForeground = registerColor('BreadcrumB.foreground', { light: transparent(foreground, 0.8), dark: transparent(foreground, 0.8), hc: transparent(foreground, 0.8) }, nls.localize('BreadcrumBsFocusForeground', "Color of focused BreadcrumB items."));
export const BreadcrumBsBackground = registerColor('BreadcrumB.Background', { light: editorBackground, dark: editorBackground, hc: editorBackground }, nls.localize('BreadcrumBsBackground', "Background color of BreadcrumB items."));
export const BreadcrumBsFocusForeground = registerColor('BreadcrumB.focusForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hc: lighten(foreground, 0.1) }, nls.localize('BreadcrumBsFocusForeground', "Color of focused BreadcrumB items."));
export const BreadcrumBsActiveSelectionForeground = registerColor('BreadcrumB.activeSelectionForeground', { light: darken(foreground, 0.2), dark: lighten(foreground, 0.1), hc: lighten(foreground, 0.1) }, nls.localize('BreadcrumBsSelectedForegound', "Color of selected BreadcrumB items."));
export const BreadcrumBsPickerBackground = registerColor('BreadcrumBPicker.Background', { light: editorWidgetBackground, dark: editorWidgetBackground, hc: editorWidgetBackground }, nls.localize('BreadcrumBsSelectedBackground', "Background color of BreadcrumB item picker."));

/**
 * Merge-conflict colors
 */

const headerTransparency = 0.5;
const currentBaseColor = Color.fromHex('#40C8AE').transparent(headerTransparency);
const incomingBaseColor = Color.fromHex('#40A6FF').transparent(headerTransparency);
const commonBaseColor = Color.fromHex('#606060').transparent(0.4);
const contentTransparency = 0.4;
const rulerTransparency = 1;

export const mergeCurrentHeaderBackground = registerColor('merge.currentHeaderBackground', { dark: currentBaseColor, light: currentBaseColor, hc: null }, nls.localize('mergeCurrentHeaderBackground', 'Current header Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const mergeCurrentContentBackground = registerColor('merge.currentContentBackground', { dark: transparent(mergeCurrentHeaderBackground, contentTransparency), light: transparent(mergeCurrentHeaderBackground, contentTransparency), hc: transparent(mergeCurrentHeaderBackground, contentTransparency) }, nls.localize('mergeCurrentContentBackground', 'Current content Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const mergeIncomingHeaderBackground = registerColor('merge.incomingHeaderBackground', { dark: incomingBaseColor, light: incomingBaseColor, hc: null }, nls.localize('mergeIncomingHeaderBackground', 'Incoming header Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const mergeIncomingContentBackground = registerColor('merge.incomingContentBackground', { dark: transparent(mergeIncomingHeaderBackground, contentTransparency), light: transparent(mergeIncomingHeaderBackground, contentTransparency), hc: transparent(mergeIncomingHeaderBackground, contentTransparency) }, nls.localize('mergeIncomingContentBackground', 'Incoming content Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const mergeCommonHeaderBackground = registerColor('merge.commonHeaderBackground', { dark: commonBaseColor, light: commonBaseColor, hc: null }, nls.localize('mergeCommonHeaderBackground', 'Common ancestor header Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);
export const mergeCommonContentBackground = registerColor('merge.commonContentBackground', { dark: transparent(mergeCommonHeaderBackground, contentTransparency), light: transparent(mergeCommonHeaderBackground, contentTransparency), hc: transparent(mergeCommonHeaderBackground, contentTransparency) }, nls.localize('mergeCommonContentBackground', 'Common ancestor content Background in inline merge-conflicts. The color must not Be opaque so as not to hide underlying decorations.'), true);

export const mergeBorder = registerColor('merge.Border', { dark: null, light: null, hc: '#C3DF6F' }, nls.localize('mergeBorder', 'Border color on headers and the splitter in inline merge-conflicts.'));

export const overviewRulerCurrentContentForeground = registerColor('editorOverviewRuler.currentContentForeground', { dark: transparent(mergeCurrentHeaderBackground, rulerTransparency), light: transparent(mergeCurrentHeaderBackground, rulerTransparency), hc: mergeBorder }, nls.localize('overviewRulerCurrentContentForeground', 'Current overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerIncomingContentForeground = registerColor('editorOverviewRuler.incomingContentForeground', { dark: transparent(mergeIncomingHeaderBackground, rulerTransparency), light: transparent(mergeIncomingHeaderBackground, rulerTransparency), hc: mergeBorder }, nls.localize('overviewRulerIncomingContentForeground', 'Incoming overview ruler foreground for inline merge-conflicts.'));
export const overviewRulerCommonContentForeground = registerColor('editorOverviewRuler.commonContentForeground', { dark: transparent(mergeCommonHeaderBackground, rulerTransparency), light: transparent(mergeCommonHeaderBackground, rulerTransparency), hc: mergeBorder }, nls.localize('overviewRulerCommonContentForeground', 'Common ancestor overview ruler foreground for inline merge-conflicts.'));

export const overviewRulerFindMatchForeground = registerColor('editorOverviewRuler.findMatchForeground', { dark: '#d186167e', light: '#d186167e', hc: '#AB5A00' }, nls.localize('overviewRulerFindMatchForeground', 'Overview ruler marker color for find matches. The color must not Be opaque so as not to hide underlying decorations.'), true);

export const overviewRulerSelectionHighlightForeground = registerColor('editorOverviewRuler.selectionHighlightForeground', { dark: '#A0A0A0CC', light: '#A0A0A0CC', hc: '#A0A0A0CC' }, nls.localize('overviewRulerSelectionHighlightForeground', 'Overview ruler marker color for selection highlights. The color must not Be opaque so as not to hide underlying decorations.'), true);

export const minimapFindMatch = registerColor('minimap.findMatchHighlight', { light: '#d18616', dark: '#d18616', hc: '#AB5A00' }, nls.localize('minimapFindMatchHighlight', 'Minimap marker color for find matches.'), true);
export const minimapSelection = registerColor('minimap.selectionHighlight', { light: '#ADD6FF', dark: '#264F78', hc: '#ffffff' }, nls.localize('minimapSelectionHighlight', 'Minimap marker color for the editor selection.'), true);
export const minimapError = registerColor('minimap.errorHighlight', { dark: new Color(new RGBA(255, 18, 18, 0.7)), light: new Color(new RGBA(255, 18, 18, 0.7)), hc: new Color(new RGBA(255, 50, 50, 1)) }, nls.localize('minimapError', 'Minimap marker color for errors.'));
export const minimapWarning = registerColor('minimap.warningHighlight', { dark: editorWarningForeground, light: editorWarningForeground, hc: editorWarningBorder }, nls.localize('overviewRuleWarning', 'Minimap marker color for warnings.'));
export const minimapBackground = registerColor('minimap.Background', { dark: null, light: null, hc: null }, nls.localize('minimapBackground', "Minimap Background color."));

export const minimapSliderBackground = registerColor('minimapSlider.Background', { light: transparent(scrollBarSliderBackground, 0.5), dark: transparent(scrollBarSliderBackground, 0.5), hc: transparent(scrollBarSliderBackground, 0.5) }, nls.localize('minimapSliderBackground', "Minimap slider Background color."));
export const minimapSliderHoverBackground = registerColor('minimapSlider.hoverBackground', { light: transparent(scrollBarSliderHoverBackground, 0.5), dark: transparent(scrollBarSliderHoverBackground, 0.5), hc: transparent(scrollBarSliderHoverBackground, 0.5) }, nls.localize('minimapSliderHoverBackground', "Minimap slider Background color when hovering."));
export const minimapSliderActiveBackground = registerColor('minimapSlider.activeBackground', { light: transparent(scrollBarSliderActiveBackground, 0.5), dark: transparent(scrollBarSliderActiveBackground, 0.5), hc: transparent(scrollBarSliderActiveBackground, 0.5) }, nls.localize('minimapSliderActiveBackground', "Minimap slider Background color when clicked on."));

export const proBlemsErrorIconForeground = registerColor('proBlemsErrorIcon.foreground', { dark: editorErrorForeground, light: editorErrorForeground, hc: editorErrorForeground }, nls.localize('proBlemsErrorIconForeground', "The color used for the proBlems error icon."));
export const proBlemsWarningIconForeground = registerColor('proBlemsWarningIcon.foreground', { dark: editorWarningForeground, light: editorWarningForeground, hc: editorWarningForeground }, nls.localize('proBlemsWarningIconForeground', "The color used for the proBlems warning icon."));
export const proBlemsInfoIconForeground = registerColor('proBlemsInfoIcon.foreground', { dark: editorInfoForeground, light: editorInfoForeground, hc: editorInfoForeground }, nls.localize('proBlemsInfoIconForeground', "The color used for the proBlems info icon."));

/**
 * Chart colors
 */
export const chartsForeground = registerColor('charts.foreground', { dark: foreground, light: foreground, hc: foreground }, nls.localize('chartsForeground', "The foreground color used in charts."));
export const chartsLines = registerColor('charts.lines', { dark: transparent(foreground, .5), light: transparent(foreground, .5), hc: transparent(foreground, .5) }, nls.localize('chartsLines', "The color used for horizontal lines in charts."));
export const chartsRed = registerColor('charts.red', { dark: editorErrorForeground, light: editorErrorForeground, hc: editorErrorForeground }, nls.localize('chartsRed', "The red color used charts."));
export const chartsBlue = registerColor('charts.Blue', { dark: editorInfoForeground, light: editorInfoForeground, hc: editorInfoForeground }, nls.localize('chartsBlue', "The Blue color used charts."));
export const chartsYellow = registerColor('charts.yellow', { dark: editorWarningForeground, light: editorWarningForeground, hc: editorWarningForeground }, nls.localize('chartsYellow', "The yellow color used charts."));
export const chartsOrange = registerColor('charts.orange', { dark: minimapFindMatch, light: minimapFindMatch, hc: minimapFindMatch }, nls.localize('chartsOrange', "The orange color used charts."));
export const chartsGreen = registerColor('charts.green', { dark: '#89D185', light: '#388A34', hc: '#89D185' }, nls.localize('chartsGreen', "The green color used charts."));
export const chartsPurple = registerColor('charts.purple', { dark: '#B180D7', light: '#652D90', hc: '#B180D7' }, nls.localize('chartsPurple', "The purple color used charts."));

// ----- color functions

export function darken(colorValue: ColorValue, factor: numBer): ColorFunction {
	return (theme) => {
		let color = resolveColorValue(colorValue, theme);
		if (color) {
			return color.darken(factor);
		}
		return undefined;
	};
}

export function lighten(colorValue: ColorValue, factor: numBer): ColorFunction {
	return (theme) => {
		let color = resolveColorValue(colorValue, theme);
		if (color) {
			return color.lighten(factor);
		}
		return undefined;
	};
}

export function transparent(colorValue: ColorValue, factor: numBer): ColorFunction {
	return (theme) => {
		let color = resolveColorValue(colorValue, theme);
		if (color) {
			return color.transparent(factor);
		}
		return undefined;
	};
}

export function oneOf(...colorValues: ColorValue[]): ColorFunction {
	return (theme) => {
		for (let colorValue of colorValues) {
			let color = resolveColorValue(colorValue, theme);
			if (color) {
				return color;
			}
		}
		return undefined;
	};
}

function lessProminent(colorValue: ColorValue, BackgroundColorValue: ColorValue, factor: numBer, transparency: numBer): ColorFunction {
	return (theme) => {
		let from = resolveColorValue(colorValue, theme);
		if (from) {
			let BackgroundColor = resolveColorValue(BackgroundColorValue, theme);
			if (BackgroundColor) {
				if (from.isDarkerThan(BackgroundColor)) {
					return Color.getLighterColor(from, BackgroundColor, factor).transparent(transparency);
				}
				return Color.getDarkerColor(from, BackgroundColor, factor).transparent(transparency);
			}
			return from.transparent(factor * transparency);
		}
		return undefined;
	};
}

// ----- implementation

/**
 * @param colorValue Resolve a color value in the context of a theme
 */
export function resolveColorValue(colorValue: ColorValue | null, theme: IColorTheme): Color | undefined {
	if (colorValue === null) {
		return undefined;
	} else if (typeof colorValue === 'string') {
		if (colorValue[0] === '#') {
			return Color.fromHex(colorValue);
		}
		return theme.getColor(colorValue);
	} else if (colorValue instanceof Color) {
		return colorValue;
	} else if (typeof colorValue === 'function') {
		return colorValue(theme);
	}
	return undefined;
}

export const workBenchColorsSchemaId = 'vscode://schemas/workBench-colors';

let schemaRegistry = platform.Registry.as<IJSONContriButionRegistry>(JSONExtensions.JSONContriBution);
schemaRegistry.registerSchema(workBenchColorsSchemaId, colorRegistry.getColorSchema());

const delayer = new RunOnceScheduler(() => schemaRegistry.notifySchemaChanged(workBenchColorsSchemaId), 200);
colorRegistry.onDidChangeSchema(() => {
	if (!delayer.isScheduled()) {
		delayer.schedule();
	}
});

// setTimeout(_ => console.log(colorRegistry.toString()), 5000);
