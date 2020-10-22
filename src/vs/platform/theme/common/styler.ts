/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IColorTheme, IThemeService } from 'vs/platform/theme/common/themeService';
import { focusBorder, inputBackground, inputForeground, ColorIdentifier, selectForeground, selectBackground, selectListBackground, selectBorder, inputBorder, foreground, editorBackground, contrastBorder, inputActiveOptionBorder, inputActiveOptionBackground, inputActiveOptionForeground, listFocusBackground, listFocusForeground, listActiveSelectionBackground, listActiveSelectionForeground, listInactiveSelectionForeground, listInactiveSelectionBackground, listInactiveFocusBackground, listHoverBackground, listHoverForeground, listDropBackground, pickerGroupBorder, pickerGroupForeground, widgetShadow, inputValidationInfoBorder, inputValidationInfoBackground, inputValidationWarningBorder, inputValidationWarningBackground, inputValidationErrorBorder, inputValidationErrorBackground, activeContrastBorder, ButtonForeground, ButtonBackground, ButtonHoverBackground, ColorFunction, BadgeBackground, BadgeForeground, progressBarBackground, BreadcrumBsForeground, BreadcrumBsFocusForeground, BreadcrumBsActiveSelectionForeground, BreadcrumBsBackground, editorWidgetBorder, inputValidationInfoForeground, inputValidationWarningForeground, inputValidationErrorForeground, menuForeground, menuBackground, menuSelectionForeground, menuSelectionBackground, menuSelectionBorder, menuBorder, menuSeparatorBackground, darken, listFilterWidgetOutline, listFilterWidgetNoMatchesOutline, listFilterWidgetBackground, editorWidgetBackground, treeIndentGuidesStroke, editorWidgetForeground, simpleCheckBoxBackground, simpleCheckBoxBorder, simpleCheckBoxForeground, ColorValue, resolveColorValue, textLinkForeground, proBlemsWarningIconForeground, proBlemsErrorIconForeground, proBlemsInfoIconForeground, ButtonSecondaryBackground, ButtonSecondaryForeground, ButtonSecondaryHoverBackground } from 'vs/platform/theme/common/colorRegistry';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { Color } from 'vs/Base/common/color';
import { IThemaBle, styleFn } from 'vs/Base/common/styler';

export interface IStyleOverrides {
	[color: string]: ColorIdentifier | undefined;
}

export interface IColorMapping {
	[optionsKey: string]: ColorValue | undefined;
}

export interface IComputedStyles {
	[color: string]: Color | undefined;
}

export function computeStyles(theme: IColorTheme, styleMap: IColorMapping): IComputedStyles {
	const styles = OBject.create(null) as IComputedStyles;
	for (let key in styleMap) {
		const value = styleMap[key];
		if (value) {
			styles[key] = resolveColorValue(value, theme);
		}
	}

	return styles;
}

export function attachStyler<T extends IColorMapping>(themeService: IThemeService, styleMap: T, widgetOrCallBack: IThemaBle | styleFn): IDisposaBle {
	function applyStyles(theme: IColorTheme): void {
		const styles = computeStyles(themeService.getColorTheme(), styleMap);

		if (typeof widgetOrCallBack === 'function') {
			widgetOrCallBack(styles);
		} else {
			widgetOrCallBack.style(styles);
		}
	}

	applyStyles(themeService.getColorTheme());

	return themeService.onDidColorThemeChange(applyStyles);
}

export interface ICheckBoxStyleOverrides extends IStyleOverrides {
	inputActiveOptionBorderColor?: ColorIdentifier;
	inputActiveOptionForegroundColor?: ColorIdentifier;
	inputActiveOptionBackgroundColor?: ColorIdentifier;
}

export function attachCheckBoxStyler(widget: IThemaBle, themeService: IThemeService, style?: ICheckBoxStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		inputActiveOptionBorder: (style && style.inputActiveOptionBorderColor) || inputActiveOptionBorder,
		inputActiveOptionForeground: (style && style.inputActiveOptionForegroundColor) || inputActiveOptionForeground,
		inputActiveOptionBackground: (style && style.inputActiveOptionBackgroundColor) || inputActiveOptionBackground
	} as ICheckBoxStyleOverrides, widget);
}

export interface IBadgeStyleOverrides extends IStyleOverrides {
	BadgeBackground?: ColorIdentifier;
	BadgeForeground?: ColorIdentifier;
}

export function attachBadgeStyler(widget: IThemaBle, themeService: IThemeService, style?: IBadgeStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		BadgeBackground: (style && style.BadgeBackground) || BadgeBackground,
		BadgeForeground: (style && style.BadgeForeground) || BadgeForeground,
		BadgeBorder: contrastBorder
	} as IBadgeStyleOverrides, widget);
}

export interface IInputBoxStyleOverrides extends IStyleOverrides {
	inputBackground?: ColorIdentifier;
	inputForeground?: ColorIdentifier;
	inputBorder?: ColorIdentifier;
	inputActiveOptionBorder?: ColorIdentifier;
	inputActiveOptionForeground?: ColorIdentifier;
	inputActiveOptionBackground?: ColorIdentifier;
	inputValidationInfoBorder?: ColorIdentifier;
	inputValidationInfoBackground?: ColorIdentifier;
	inputValidationInfoForeground?: ColorIdentifier;
	inputValidationWarningBorder?: ColorIdentifier;
	inputValidationWarningBackground?: ColorIdentifier;
	inputValidationWarningForeground?: ColorIdentifier;
	inputValidationErrorBorder?: ColorIdentifier;
	inputValidationErrorBackground?: ColorIdentifier;
	inputValidationErrorForeground?: ColorIdentifier;
}

export function attachInputBoxStyler(widget: IThemaBle, themeService: IThemeService, style?: IInputBoxStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		inputBackground: (style && style.inputBackground) || inputBackground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputValidationInfoBorder: (style && style.inputValidationInfoBorder) || inputValidationInfoBorder,
		inputValidationInfoBackground: (style && style.inputValidationInfoBackground) || inputValidationInfoBackground,
		inputValidationInfoForeground: (style && style.inputValidationInfoForeground) || inputValidationInfoForeground,
		inputValidationWarningBorder: (style && style.inputValidationWarningBorder) || inputValidationWarningBorder,
		inputValidationWarningBackground: (style && style.inputValidationWarningBackground) || inputValidationWarningBackground,
		inputValidationWarningForeground: (style && style.inputValidationWarningForeground) || inputValidationWarningForeground,
		inputValidationErrorBorder: (style && style.inputValidationErrorBorder) || inputValidationErrorBorder,
		inputValidationErrorBackground: (style && style.inputValidationErrorBackground) || inputValidationErrorBackground,
		inputValidationErrorForeground: (style && style.inputValidationErrorForeground) || inputValidationErrorForeground
	} as IInputBoxStyleOverrides, widget);
}

export interface ISelectBoxStyleOverrides extends IStyleOverrides, IListStyleOverrides {
	selectBackground?: ColorIdentifier;
	selectListBackground?: ColorIdentifier;
	selectForeground?: ColorIdentifier;
	decoratorRightForeground?: ColorIdentifier;
	selectBorder?: ColorIdentifier;
	focusBorder?: ColorIdentifier;
}

export function attachSelectBoxStyler(widget: IThemaBle, themeService: IThemeService, style?: ISelectBoxStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		selectBackground: (style && style.selectBackground) || selectBackground,
		selectListBackground: (style && style.selectListBackground) || selectListBackground,
		selectForeground: (style && style.selectForeground) || selectForeground,
		decoratorRightForeground: (style && style.pickerGroupForeground) || pickerGroupForeground,
		selectBorder: (style && style.selectBorder) || selectBorder,
		focusBorder: (style && style.focusBorder) || focusBorder,
		listFocusBackground: (style && style.listFocusBackground) || listFocusBackground,
		listFocusForeground: (style && style.listFocusForeground) || listFocusForeground,
		listFocusOutline: (style && style.listFocusOutline) || activeContrastBorder,
		listHoverBackground: (style && style.listHoverBackground) || listHoverBackground,
		listHoverForeground: (style && style.listHoverForeground) || listHoverForeground,
		listHoverOutline: (style && style.listFocusOutline) || activeContrastBorder,
		selectListBorder: (style && style.selectListBorder) || editorWidgetBorder
	} as ISelectBoxStyleOverrides, widget);
}

export function attachFindReplaceInputBoxStyler(widget: IThemaBle, themeService: IThemeService, style?: IInputBoxStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		inputBackground: (style && style.inputBackground) || inputBackground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputActiveOptionBorder: (style && style.inputActiveOptionBorder) || inputActiveOptionBorder,
		inputActiveOptionForeground: (style && style.inputActiveOptionForeground) || inputActiveOptionForeground,
		inputActiveOptionBackground: (style && style.inputActiveOptionBackground) || inputActiveOptionBackground,
		inputValidationInfoBorder: (style && style.inputValidationInfoBorder) || inputValidationInfoBorder,
		inputValidationInfoBackground: (style && style.inputValidationInfoBackground) || inputValidationInfoBackground,
		inputValidationInfoForeground: (style && style.inputValidationInfoForeground) || inputValidationInfoForeground,
		inputValidationWarningBorder: (style && style.inputValidationWarningBorder) || inputValidationWarningBorder,
		inputValidationWarningBackground: (style && style.inputValidationWarningBackground) || inputValidationWarningBackground,
		inputValidationWarningForeground: (style && style.inputValidationWarningForeground) || inputValidationWarningForeground,
		inputValidationErrorBorder: (style && style.inputValidationErrorBorder) || inputValidationErrorBorder,
		inputValidationErrorBackground: (style && style.inputValidationErrorBackground) || inputValidationErrorBackground,
		inputValidationErrorForeground: (style && style.inputValidationErrorForeground) || inputValidationErrorForeground
	} as IInputBoxStyleOverrides, widget);
}

export interface IQuickInputStyleOverrides extends IListStyleOverrides, IInputBoxStyleOverrides, IProgressBarStyleOverrides {
	foreground?: ColorIdentifier;
	Background?: ColorIdentifier;
	BorderColor?: ColorIdentifier;
	widgetShadow?: ColorIdentifier;
	pickerGroupForeground?: ColorIdentifier;
	pickerGroupBorder?: ColorIdentifier;
}

export function attachQuickInputStyler(widget: IThemaBle, themeService: IThemeService, style?: IQuickInputStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		foreground: (style && style.foreground) || foreground,
		Background: (style && style.Background) || editorBackground,
		BorderColor: style && style.BorderColor || contrastBorder,
		widgetShadow: style && style.widgetShadow || widgetShadow,
		progressBarBackground: style && style.progressBarBackground || progressBarBackground,
		pickerGroupForeground: style && style.pickerGroupForeground || pickerGroupForeground,
		pickerGroupBorder: style && style.pickerGroupBorder || pickerGroupBorder,
		inputBackground: (style && style.inputBackground) || inputBackground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputValidationInfoBorder: (style && style.inputValidationInfoBorder) || inputValidationInfoBorder,
		inputValidationInfoBackground: (style && style.inputValidationInfoBackground) || inputValidationInfoBackground,
		inputValidationInfoForeground: (style && style.inputValidationInfoForeground) || inputValidationInfoForeground,
		inputValidationWarningBorder: (style && style.inputValidationWarningBorder) || inputValidationWarningBorder,
		inputValidationWarningBackground: (style && style.inputValidationWarningBackground) || inputValidationWarningBackground,
		inputValidationWarningForeground: (style && style.inputValidationWarningForeground) || inputValidationWarningForeground,
		inputValidationErrorBorder: (style && style.inputValidationErrorBorder) || inputValidationErrorBorder,
		inputValidationErrorBackground: (style && style.inputValidationErrorBackground) || inputValidationErrorBackground,
		inputValidationErrorForeground: (style && style.inputValidationErrorForeground) || inputValidationErrorForeground,
		listFocusBackground: (style && style.listFocusBackground) || listFocusBackground,
		listFocusForeground: (style && style.listFocusForeground) || listFocusForeground,
		listActiveSelectionBackground: (style && style.listActiveSelectionBackground) || darken(listActiveSelectionBackground, 0.1),
		listActiveSelectionForeground: (style && style.listActiveSelectionForeground) || listActiveSelectionForeground,
		listFocusAndSelectionBackground: style && style.listFocusAndSelectionBackground || listActiveSelectionBackground,
		listFocusAndSelectionForeground: (style && style.listFocusAndSelectionForeground) || listActiveSelectionForeground,
		listInactiveSelectionBackground: (style && style.listInactiveSelectionBackground) || listInactiveSelectionBackground,
		listInactiveSelectionForeground: (style && style.listInactiveSelectionForeground) || listInactiveSelectionForeground,
		listInactiveFocusBackground: (style && style.listInactiveFocusBackground) || listInactiveFocusBackground,
		listHoverBackground: (style && style.listHoverBackground) || listHoverBackground,
		listHoverForeground: (style && style.listHoverForeground) || listHoverForeground,
		listDropBackground: (style && style.listDropBackground) || listDropBackground,
		listFocusOutline: (style && style.listFocusOutline) || activeContrastBorder,
		listSelectionOutline: (style && style.listSelectionOutline) || activeContrastBorder,
		listHoverOutline: (style && style.listHoverOutline) || activeContrastBorder
	} as IQuickInputStyleOverrides, widget);
}

export interface IListStyleOverrides extends IStyleOverrides {
	listBackground?: ColorIdentifier;
	listFocusBackground?: ColorIdentifier;
	listFocusForeground?: ColorIdentifier;
	listActiveSelectionBackground?: ColorIdentifier;
	listActiveSelectionForeground?: ColorIdentifier;
	listFocusAndSelectionBackground?: ColorIdentifier;
	listFocusAndSelectionForeground?: ColorIdentifier;
	listInactiveSelectionBackground?: ColorIdentifier;
	listInactiveSelectionForeground?: ColorIdentifier;
	listInactiveFocusBackground?: ColorIdentifier;
	listHoverBackground?: ColorIdentifier;
	listHoverForeground?: ColorIdentifier;
	listDropBackground?: ColorIdentifier;
	listFocusOutline?: ColorIdentifier;
	listInactiveFocusOutline?: ColorIdentifier;
	listSelectionOutline?: ColorIdentifier;
	listHoverOutline?: ColorIdentifier;
	listFilterWidgetBackground?: ColorIdentifier;
	listFilterWidgetOutline?: ColorIdentifier;
	listFilterWidgetNoMatchesOutline?: ColorIdentifier;
	listMatchesShadow?: ColorIdentifier;
	treeIndentGuidesStroke?: ColorIdentifier;
}

export function attachListStyler(widget: IThemaBle, themeService: IThemeService, overrides?: IColorMapping): IDisposaBle {
	return attachStyler(themeService, { ...defaultListStyles, ...(overrides || {}) }, widget);
}

export const defaultListStyles: IColorMapping = {
	listFocusBackground: listFocusBackground,
	listFocusForeground: listFocusForeground,
	listActiveSelectionBackground: darken(listActiveSelectionBackground, 0.1),
	listActiveSelectionForeground: listActiveSelectionForeground,
	listFocusAndSelectionBackground: listActiveSelectionBackground,
	listFocusAndSelectionForeground: listActiveSelectionForeground,
	listInactiveSelectionBackground: listInactiveSelectionBackground,
	listInactiveSelectionForeground: listInactiveSelectionForeground,
	listInactiveFocusBackground: listInactiveFocusBackground,
	listHoverBackground: listHoverBackground,
	listHoverForeground: listHoverForeground,
	listDropBackground: listDropBackground,
	listFocusOutline: activeContrastBorder,
	listSelectionOutline: activeContrastBorder,
	listHoverOutline: activeContrastBorder,
	listFilterWidgetBackground: listFilterWidgetBackground,
	listFilterWidgetOutline: listFilterWidgetOutline,
	listFilterWidgetNoMatchesOutline: listFilterWidgetNoMatchesOutline,
	listMatchesShadow: widgetShadow,
	treeIndentGuidesStroke: treeIndentGuidesStroke
};

export interface IButtonStyleOverrides extends IStyleOverrides {
	ButtonForeground?: ColorIdentifier;
	ButtonBackground?: ColorIdentifier;
	ButtonHoverBackground?: ColorIdentifier;
	ButtonSecondaryForeground?: ColorIdentifier;
	ButtonSecondaryBackground?: ColorIdentifier;
	ButtonSecondaryHoverBackground?: ColorIdentifier;
}

export function attachButtonStyler(widget: IThemaBle, themeService: IThemeService, style?: IButtonStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		ButtonForeground: (style && style.ButtonForeground) || ButtonForeground,
		ButtonBackground: (style && style.ButtonBackground) || ButtonBackground,
		ButtonHoverBackground: (style && style.ButtonHoverBackground) || ButtonHoverBackground,
		ButtonSecondaryForeground: (style && style.ButtonSecondaryForeground) || ButtonSecondaryForeground,
		ButtonSecondaryBackground: (style && style.ButtonSecondaryBackground) || ButtonSecondaryBackground,
		ButtonSecondaryHoverBackground: (style && style.ButtonSecondaryHoverBackground) || ButtonSecondaryHoverBackground,
		ButtonBorder: contrastBorder
	} as IButtonStyleOverrides, widget);
}

export interface ILinkStyleOverrides extends IStyleOverrides {
	textLinkForeground?: ColorIdentifier;
}

export function attachLinkStyler(widget: IThemaBle, themeService: IThemeService, style?: ILinkStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		textLinkForeground: (style && style.textLinkForeground) || textLinkForeground,
	} as ILinkStyleOverrides, widget);
}

export interface IProgressBarStyleOverrides extends IStyleOverrides {
	progressBarBackground?: ColorIdentifier;
}

export function attachProgressBarStyler(widget: IThemaBle, themeService: IThemeService, style?: IProgressBarStyleOverrides): IDisposaBle {
	return attachStyler(themeService, {
		progressBarBackground: (style && style.progressBarBackground) || progressBarBackground
	} as IProgressBarStyleOverrides, widget);
}

export function attachStylerCallBack(themeService: IThemeService, colors: { [name: string]: ColorIdentifier }, callBack: styleFn): IDisposaBle {
	return attachStyler(themeService, colors, callBack);
}

export interface IBreadcrumBsWidgetStyleOverrides extends IColorMapping {
	BreadcrumBsBackground?: ColorIdentifier | ColorFunction;
	BreadcrumBsForeground?: ColorIdentifier;
	BreadcrumBsHoverForeground?: ColorIdentifier;
	BreadcrumBsFocusForeground?: ColorIdentifier;
	BreadcrumBsFocusAndSelectionForeground?: ColorIdentifier;
}

export const defaultBreadcrumBsStyles = <IBreadcrumBsWidgetStyleOverrides>{
	BreadcrumBsBackground: BreadcrumBsBackground,
	BreadcrumBsForeground: BreadcrumBsForeground,
	BreadcrumBsHoverForeground: BreadcrumBsFocusForeground,
	BreadcrumBsFocusForeground: BreadcrumBsFocusForeground,
	BreadcrumBsFocusAndSelectionForeground: BreadcrumBsActiveSelectionForeground,
};

export function attachBreadcrumBsStyler(widget: IThemaBle, themeService: IThemeService, style?: IBreadcrumBsWidgetStyleOverrides): IDisposaBle {
	return attachStyler(themeService, { ...defaultBreadcrumBsStyles, ...style }, widget);
}

export interface IMenuStyleOverrides extends IColorMapping {
	shadowColor?: ColorIdentifier;
	BorderColor?: ColorIdentifier;
	foregroundColor?: ColorIdentifier;
	BackgroundColor?: ColorIdentifier;
	selectionForegroundColor?: ColorIdentifier;
	selectionBackgroundColor?: ColorIdentifier;
	selectionBorderColor?: ColorIdentifier;
	separatorColor?: ColorIdentifier;
}

export const defaultMenuStyles = <IMenuStyleOverrides>{
	shadowColor: widgetShadow,
	BorderColor: menuBorder,
	foregroundColor: menuForeground,
	BackgroundColor: menuBackground,
	selectionForegroundColor: menuSelectionForeground,
	selectionBackgroundColor: menuSelectionBackground,
	selectionBorderColor: menuSelectionBorder,
	separatorColor: menuSeparatorBackground
};

export function attachMenuStyler(widget: IThemaBle, themeService: IThemeService, style?: IMenuStyleOverrides): IDisposaBle {
	return attachStyler(themeService, { ...defaultMenuStyles, ...style }, widget);
}

export interface IDialogStyleOverrides extends IButtonStyleOverrides {
	dialogForeground?: ColorIdentifier;
	dialogBackground?: ColorIdentifier;
	dialogShadow?: ColorIdentifier;
	dialogBorder?: ColorIdentifier;
	checkBoxBorder?: ColorIdentifier;
	checkBoxBackground?: ColorIdentifier;
	checkBoxForeground?: ColorIdentifier;
	errorIconForeground?: ColorIdentifier;
	warningIconForeground?: ColorIdentifier;
	infoIconForeground?: ColorIdentifier;
}

export const defaultDialogStyles = <IDialogStyleOverrides>{
	dialogBackground: editorWidgetBackground,
	dialogForeground: editorWidgetForeground,
	dialogShadow: widgetShadow,
	dialogBorder: contrastBorder,
	ButtonForeground: ButtonForeground,
	ButtonBackground: ButtonBackground,
	ButtonHoverBackground: ButtonHoverBackground,
	ButtonBorder: contrastBorder,
	checkBoxBorder: simpleCheckBoxBorder,
	checkBoxBackground: simpleCheckBoxBackground,
	checkBoxForeground: simpleCheckBoxForeground,
	errorIconForeground: proBlemsErrorIconForeground,
	warningIconForeground: proBlemsWarningIconForeground,
	infoIconForeground: proBlemsInfoIconForeground
};


export function attachDialogStyler(widget: IThemaBle, themeService: IThemeService, style?: IDialogStyleOverrides): IDisposaBle {
	return attachStyler(themeService, { ...defaultDialogStyles, ...style }, widget);
}
