/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IColorTheme, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { focusBorder, inputBAckground, inputForeground, ColorIdentifier, selectForeground, selectBAckground, selectListBAckground, selectBorder, inputBorder, foreground, editorBAckground, contrAstBorder, inputActiveOptionBorder, inputActiveOptionBAckground, inputActiveOptionForeground, listFocusBAckground, listFocusForeground, listActiveSelectionBAckground, listActiveSelectionForeground, listInActiveSelectionForeground, listInActiveSelectionBAckground, listInActiveFocusBAckground, listHoverBAckground, listHoverForeground, listDropBAckground, pickerGroupBorder, pickerGroupForeground, widgetShAdow, inputVAlidAtionInfoBorder, inputVAlidAtionInfoBAckground, inputVAlidAtionWArningBorder, inputVAlidAtionWArningBAckground, inputVAlidAtionErrorBorder, inputVAlidAtionErrorBAckground, ActiveContrAstBorder, buttonForeground, buttonBAckground, buttonHoverBAckground, ColorFunction, bAdgeBAckground, bAdgeForeground, progressBArBAckground, breAdcrumbsForeground, breAdcrumbsFocusForeground, breAdcrumbsActiveSelectionForeground, breAdcrumbsBAckground, editorWidgetBorder, inputVAlidAtionInfoForeground, inputVAlidAtionWArningForeground, inputVAlidAtionErrorForeground, menuForeground, menuBAckground, menuSelectionForeground, menuSelectionBAckground, menuSelectionBorder, menuBorder, menuSepArAtorBAckground, dArken, listFilterWidgetOutline, listFilterWidgetNoMAtchesOutline, listFilterWidgetBAckground, editorWidgetBAckground, treeIndentGuidesStroke, editorWidgetForeground, simpleCheckboxBAckground, simpleCheckboxBorder, simpleCheckboxForeground, ColorVAlue, resolveColorVAlue, textLinkForeground, problemsWArningIconForeground, problemsErrorIconForeground, problemsInfoIconForeground, buttonSecondAryBAckground, buttonSecondAryForeground, buttonSecondAryHoverBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { Color } from 'vs/bAse/common/color';
import { IThemAble, styleFn } from 'vs/bAse/common/styler';

export interfAce IStyleOverrides {
	[color: string]: ColorIdentifier | undefined;
}

export interfAce IColorMApping {
	[optionsKey: string]: ColorVAlue | undefined;
}

export interfAce IComputedStyles {
	[color: string]: Color | undefined;
}

export function computeStyles(theme: IColorTheme, styleMAp: IColorMApping): IComputedStyles {
	const styles = Object.creAte(null) As IComputedStyles;
	for (let key in styleMAp) {
		const vAlue = styleMAp[key];
		if (vAlue) {
			styles[key] = resolveColorVAlue(vAlue, theme);
		}
	}

	return styles;
}

export function AttAchStyler<T extends IColorMApping>(themeService: IThemeService, styleMAp: T, widgetOrCAllbAck: IThemAble | styleFn): IDisposAble {
	function ApplyStyles(theme: IColorTheme): void {
		const styles = computeStyles(themeService.getColorTheme(), styleMAp);

		if (typeof widgetOrCAllbAck === 'function') {
			widgetOrCAllbAck(styles);
		} else {
			widgetOrCAllbAck.style(styles);
		}
	}

	ApplyStyles(themeService.getColorTheme());

	return themeService.onDidColorThemeChAnge(ApplyStyles);
}

export interfAce ICheckboxStyleOverrides extends IStyleOverrides {
	inputActiveOptionBorderColor?: ColorIdentifier;
	inputActiveOptionForegroundColor?: ColorIdentifier;
	inputActiveOptionBAckgroundColor?: ColorIdentifier;
}

export function AttAchCheckboxStyler(widget: IThemAble, themeService: IThemeService, style?: ICheckboxStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		inputActiveOptionBorder: (style && style.inputActiveOptionBorderColor) || inputActiveOptionBorder,
		inputActiveOptionForeground: (style && style.inputActiveOptionForegroundColor) || inputActiveOptionForeground,
		inputActiveOptionBAckground: (style && style.inputActiveOptionBAckgroundColor) || inputActiveOptionBAckground
	} As ICheckboxStyleOverrides, widget);
}

export interfAce IBAdgeStyleOverrides extends IStyleOverrides {
	bAdgeBAckground?: ColorIdentifier;
	bAdgeForeground?: ColorIdentifier;
}

export function AttAchBAdgeStyler(widget: IThemAble, themeService: IThemeService, style?: IBAdgeStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		bAdgeBAckground: (style && style.bAdgeBAckground) || bAdgeBAckground,
		bAdgeForeground: (style && style.bAdgeForeground) || bAdgeForeground,
		bAdgeBorder: contrAstBorder
	} As IBAdgeStyleOverrides, widget);
}

export interfAce IInputBoxStyleOverrides extends IStyleOverrides {
	inputBAckground?: ColorIdentifier;
	inputForeground?: ColorIdentifier;
	inputBorder?: ColorIdentifier;
	inputActiveOptionBorder?: ColorIdentifier;
	inputActiveOptionForeground?: ColorIdentifier;
	inputActiveOptionBAckground?: ColorIdentifier;
	inputVAlidAtionInfoBorder?: ColorIdentifier;
	inputVAlidAtionInfoBAckground?: ColorIdentifier;
	inputVAlidAtionInfoForeground?: ColorIdentifier;
	inputVAlidAtionWArningBorder?: ColorIdentifier;
	inputVAlidAtionWArningBAckground?: ColorIdentifier;
	inputVAlidAtionWArningForeground?: ColorIdentifier;
	inputVAlidAtionErrorBorder?: ColorIdentifier;
	inputVAlidAtionErrorBAckground?: ColorIdentifier;
	inputVAlidAtionErrorForeground?: ColorIdentifier;
}

export function AttAchInputBoxStyler(widget: IThemAble, themeService: IThemeService, style?: IInputBoxStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		inputBAckground: (style && style.inputBAckground) || inputBAckground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputVAlidAtionInfoBorder: (style && style.inputVAlidAtionInfoBorder) || inputVAlidAtionInfoBorder,
		inputVAlidAtionInfoBAckground: (style && style.inputVAlidAtionInfoBAckground) || inputVAlidAtionInfoBAckground,
		inputVAlidAtionInfoForeground: (style && style.inputVAlidAtionInfoForeground) || inputVAlidAtionInfoForeground,
		inputVAlidAtionWArningBorder: (style && style.inputVAlidAtionWArningBorder) || inputVAlidAtionWArningBorder,
		inputVAlidAtionWArningBAckground: (style && style.inputVAlidAtionWArningBAckground) || inputVAlidAtionWArningBAckground,
		inputVAlidAtionWArningForeground: (style && style.inputVAlidAtionWArningForeground) || inputVAlidAtionWArningForeground,
		inputVAlidAtionErrorBorder: (style && style.inputVAlidAtionErrorBorder) || inputVAlidAtionErrorBorder,
		inputVAlidAtionErrorBAckground: (style && style.inputVAlidAtionErrorBAckground) || inputVAlidAtionErrorBAckground,
		inputVAlidAtionErrorForeground: (style && style.inputVAlidAtionErrorForeground) || inputVAlidAtionErrorForeground
	} As IInputBoxStyleOverrides, widget);
}

export interfAce ISelectBoxStyleOverrides extends IStyleOverrides, IListStyleOverrides {
	selectBAckground?: ColorIdentifier;
	selectListBAckground?: ColorIdentifier;
	selectForeground?: ColorIdentifier;
	decorAtorRightForeground?: ColorIdentifier;
	selectBorder?: ColorIdentifier;
	focusBorder?: ColorIdentifier;
}

export function AttAchSelectBoxStyler(widget: IThemAble, themeService: IThemeService, style?: ISelectBoxStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		selectBAckground: (style && style.selectBAckground) || selectBAckground,
		selectListBAckground: (style && style.selectListBAckground) || selectListBAckground,
		selectForeground: (style && style.selectForeground) || selectForeground,
		decorAtorRightForeground: (style && style.pickerGroupForeground) || pickerGroupForeground,
		selectBorder: (style && style.selectBorder) || selectBorder,
		focusBorder: (style && style.focusBorder) || focusBorder,
		listFocusBAckground: (style && style.listFocusBAckground) || listFocusBAckground,
		listFocusForeground: (style && style.listFocusForeground) || listFocusForeground,
		listFocusOutline: (style && style.listFocusOutline) || ActiveContrAstBorder,
		listHoverBAckground: (style && style.listHoverBAckground) || listHoverBAckground,
		listHoverForeground: (style && style.listHoverForeground) || listHoverForeground,
		listHoverOutline: (style && style.listFocusOutline) || ActiveContrAstBorder,
		selectListBorder: (style && style.selectListBorder) || editorWidgetBorder
	} As ISelectBoxStyleOverrides, widget);
}

export function AttAchFindReplAceInputBoxStyler(widget: IThemAble, themeService: IThemeService, style?: IInputBoxStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		inputBAckground: (style && style.inputBAckground) || inputBAckground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputActiveOptionBorder: (style && style.inputActiveOptionBorder) || inputActiveOptionBorder,
		inputActiveOptionForeground: (style && style.inputActiveOptionForeground) || inputActiveOptionForeground,
		inputActiveOptionBAckground: (style && style.inputActiveOptionBAckground) || inputActiveOptionBAckground,
		inputVAlidAtionInfoBorder: (style && style.inputVAlidAtionInfoBorder) || inputVAlidAtionInfoBorder,
		inputVAlidAtionInfoBAckground: (style && style.inputVAlidAtionInfoBAckground) || inputVAlidAtionInfoBAckground,
		inputVAlidAtionInfoForeground: (style && style.inputVAlidAtionInfoForeground) || inputVAlidAtionInfoForeground,
		inputVAlidAtionWArningBorder: (style && style.inputVAlidAtionWArningBorder) || inputVAlidAtionWArningBorder,
		inputVAlidAtionWArningBAckground: (style && style.inputVAlidAtionWArningBAckground) || inputVAlidAtionWArningBAckground,
		inputVAlidAtionWArningForeground: (style && style.inputVAlidAtionWArningForeground) || inputVAlidAtionWArningForeground,
		inputVAlidAtionErrorBorder: (style && style.inputVAlidAtionErrorBorder) || inputVAlidAtionErrorBorder,
		inputVAlidAtionErrorBAckground: (style && style.inputVAlidAtionErrorBAckground) || inputVAlidAtionErrorBAckground,
		inputVAlidAtionErrorForeground: (style && style.inputVAlidAtionErrorForeground) || inputVAlidAtionErrorForeground
	} As IInputBoxStyleOverrides, widget);
}

export interfAce IQuickInputStyleOverrides extends IListStyleOverrides, IInputBoxStyleOverrides, IProgressBArStyleOverrides {
	foreground?: ColorIdentifier;
	bAckground?: ColorIdentifier;
	borderColor?: ColorIdentifier;
	widgetShAdow?: ColorIdentifier;
	pickerGroupForeground?: ColorIdentifier;
	pickerGroupBorder?: ColorIdentifier;
}

export function AttAchQuickInputStyler(widget: IThemAble, themeService: IThemeService, style?: IQuickInputStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		foreground: (style && style.foreground) || foreground,
		bAckground: (style && style.bAckground) || editorBAckground,
		borderColor: style && style.borderColor || contrAstBorder,
		widgetShAdow: style && style.widgetShAdow || widgetShAdow,
		progressBArBAckground: style && style.progressBArBAckground || progressBArBAckground,
		pickerGroupForeground: style && style.pickerGroupForeground || pickerGroupForeground,
		pickerGroupBorder: style && style.pickerGroupBorder || pickerGroupBorder,
		inputBAckground: (style && style.inputBAckground) || inputBAckground,
		inputForeground: (style && style.inputForeground) || inputForeground,
		inputBorder: (style && style.inputBorder) || inputBorder,
		inputVAlidAtionInfoBorder: (style && style.inputVAlidAtionInfoBorder) || inputVAlidAtionInfoBorder,
		inputVAlidAtionInfoBAckground: (style && style.inputVAlidAtionInfoBAckground) || inputVAlidAtionInfoBAckground,
		inputVAlidAtionInfoForeground: (style && style.inputVAlidAtionInfoForeground) || inputVAlidAtionInfoForeground,
		inputVAlidAtionWArningBorder: (style && style.inputVAlidAtionWArningBorder) || inputVAlidAtionWArningBorder,
		inputVAlidAtionWArningBAckground: (style && style.inputVAlidAtionWArningBAckground) || inputVAlidAtionWArningBAckground,
		inputVAlidAtionWArningForeground: (style && style.inputVAlidAtionWArningForeground) || inputVAlidAtionWArningForeground,
		inputVAlidAtionErrorBorder: (style && style.inputVAlidAtionErrorBorder) || inputVAlidAtionErrorBorder,
		inputVAlidAtionErrorBAckground: (style && style.inputVAlidAtionErrorBAckground) || inputVAlidAtionErrorBAckground,
		inputVAlidAtionErrorForeground: (style && style.inputVAlidAtionErrorForeground) || inputVAlidAtionErrorForeground,
		listFocusBAckground: (style && style.listFocusBAckground) || listFocusBAckground,
		listFocusForeground: (style && style.listFocusForeground) || listFocusForeground,
		listActiveSelectionBAckground: (style && style.listActiveSelectionBAckground) || dArken(listActiveSelectionBAckground, 0.1),
		listActiveSelectionForeground: (style && style.listActiveSelectionForeground) || listActiveSelectionForeground,
		listFocusAndSelectionBAckground: style && style.listFocusAndSelectionBAckground || listActiveSelectionBAckground,
		listFocusAndSelectionForeground: (style && style.listFocusAndSelectionForeground) || listActiveSelectionForeground,
		listInActiveSelectionBAckground: (style && style.listInActiveSelectionBAckground) || listInActiveSelectionBAckground,
		listInActiveSelectionForeground: (style && style.listInActiveSelectionForeground) || listInActiveSelectionForeground,
		listInActiveFocusBAckground: (style && style.listInActiveFocusBAckground) || listInActiveFocusBAckground,
		listHoverBAckground: (style && style.listHoverBAckground) || listHoverBAckground,
		listHoverForeground: (style && style.listHoverForeground) || listHoverForeground,
		listDropBAckground: (style && style.listDropBAckground) || listDropBAckground,
		listFocusOutline: (style && style.listFocusOutline) || ActiveContrAstBorder,
		listSelectionOutline: (style && style.listSelectionOutline) || ActiveContrAstBorder,
		listHoverOutline: (style && style.listHoverOutline) || ActiveContrAstBorder
	} As IQuickInputStyleOverrides, widget);
}

export interfAce IListStyleOverrides extends IStyleOverrides {
	listBAckground?: ColorIdentifier;
	listFocusBAckground?: ColorIdentifier;
	listFocusForeground?: ColorIdentifier;
	listActiveSelectionBAckground?: ColorIdentifier;
	listActiveSelectionForeground?: ColorIdentifier;
	listFocusAndSelectionBAckground?: ColorIdentifier;
	listFocusAndSelectionForeground?: ColorIdentifier;
	listInActiveSelectionBAckground?: ColorIdentifier;
	listInActiveSelectionForeground?: ColorIdentifier;
	listInActiveFocusBAckground?: ColorIdentifier;
	listHoverBAckground?: ColorIdentifier;
	listHoverForeground?: ColorIdentifier;
	listDropBAckground?: ColorIdentifier;
	listFocusOutline?: ColorIdentifier;
	listInActiveFocusOutline?: ColorIdentifier;
	listSelectionOutline?: ColorIdentifier;
	listHoverOutline?: ColorIdentifier;
	listFilterWidgetBAckground?: ColorIdentifier;
	listFilterWidgetOutline?: ColorIdentifier;
	listFilterWidgetNoMAtchesOutline?: ColorIdentifier;
	listMAtchesShAdow?: ColorIdentifier;
	treeIndentGuidesStroke?: ColorIdentifier;
}

export function AttAchListStyler(widget: IThemAble, themeService: IThemeService, overrides?: IColorMApping): IDisposAble {
	return AttAchStyler(themeService, { ...defAultListStyles, ...(overrides || {}) }, widget);
}

export const defAultListStyles: IColorMApping = {
	listFocusBAckground: listFocusBAckground,
	listFocusForeground: listFocusForeground,
	listActiveSelectionBAckground: dArken(listActiveSelectionBAckground, 0.1),
	listActiveSelectionForeground: listActiveSelectionForeground,
	listFocusAndSelectionBAckground: listActiveSelectionBAckground,
	listFocusAndSelectionForeground: listActiveSelectionForeground,
	listInActiveSelectionBAckground: listInActiveSelectionBAckground,
	listInActiveSelectionForeground: listInActiveSelectionForeground,
	listInActiveFocusBAckground: listInActiveFocusBAckground,
	listHoverBAckground: listHoverBAckground,
	listHoverForeground: listHoverForeground,
	listDropBAckground: listDropBAckground,
	listFocusOutline: ActiveContrAstBorder,
	listSelectionOutline: ActiveContrAstBorder,
	listHoverOutline: ActiveContrAstBorder,
	listFilterWidgetBAckground: listFilterWidgetBAckground,
	listFilterWidgetOutline: listFilterWidgetOutline,
	listFilterWidgetNoMAtchesOutline: listFilterWidgetNoMAtchesOutline,
	listMAtchesShAdow: widgetShAdow,
	treeIndentGuidesStroke: treeIndentGuidesStroke
};

export interfAce IButtonStyleOverrides extends IStyleOverrides {
	buttonForeground?: ColorIdentifier;
	buttonBAckground?: ColorIdentifier;
	buttonHoverBAckground?: ColorIdentifier;
	buttonSecondAryForeground?: ColorIdentifier;
	buttonSecondAryBAckground?: ColorIdentifier;
	buttonSecondAryHoverBAckground?: ColorIdentifier;
}

export function AttAchButtonStyler(widget: IThemAble, themeService: IThemeService, style?: IButtonStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		buttonForeground: (style && style.buttonForeground) || buttonForeground,
		buttonBAckground: (style && style.buttonBAckground) || buttonBAckground,
		buttonHoverBAckground: (style && style.buttonHoverBAckground) || buttonHoverBAckground,
		buttonSecondAryForeground: (style && style.buttonSecondAryForeground) || buttonSecondAryForeground,
		buttonSecondAryBAckground: (style && style.buttonSecondAryBAckground) || buttonSecondAryBAckground,
		buttonSecondAryHoverBAckground: (style && style.buttonSecondAryHoverBAckground) || buttonSecondAryHoverBAckground,
		buttonBorder: contrAstBorder
	} As IButtonStyleOverrides, widget);
}

export interfAce ILinkStyleOverrides extends IStyleOverrides {
	textLinkForeground?: ColorIdentifier;
}

export function AttAchLinkStyler(widget: IThemAble, themeService: IThemeService, style?: ILinkStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		textLinkForeground: (style && style.textLinkForeground) || textLinkForeground,
	} As ILinkStyleOverrides, widget);
}

export interfAce IProgressBArStyleOverrides extends IStyleOverrides {
	progressBArBAckground?: ColorIdentifier;
}

export function AttAchProgressBArStyler(widget: IThemAble, themeService: IThemeService, style?: IProgressBArStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, {
		progressBArBAckground: (style && style.progressBArBAckground) || progressBArBAckground
	} As IProgressBArStyleOverrides, widget);
}

export function AttAchStylerCAllbAck(themeService: IThemeService, colors: { [nAme: string]: ColorIdentifier }, cAllbAck: styleFn): IDisposAble {
	return AttAchStyler(themeService, colors, cAllbAck);
}

export interfAce IBreAdcrumbsWidgetStyleOverrides extends IColorMApping {
	breAdcrumbsBAckground?: ColorIdentifier | ColorFunction;
	breAdcrumbsForeground?: ColorIdentifier;
	breAdcrumbsHoverForeground?: ColorIdentifier;
	breAdcrumbsFocusForeground?: ColorIdentifier;
	breAdcrumbsFocusAndSelectionForeground?: ColorIdentifier;
}

export const defAultBreAdcrumbsStyles = <IBreAdcrumbsWidgetStyleOverrides>{
	breAdcrumbsBAckground: breAdcrumbsBAckground,
	breAdcrumbsForeground: breAdcrumbsForeground,
	breAdcrumbsHoverForeground: breAdcrumbsFocusForeground,
	breAdcrumbsFocusForeground: breAdcrumbsFocusForeground,
	breAdcrumbsFocusAndSelectionForeground: breAdcrumbsActiveSelectionForeground,
};

export function AttAchBreAdcrumbsStyler(widget: IThemAble, themeService: IThemeService, style?: IBreAdcrumbsWidgetStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, { ...defAultBreAdcrumbsStyles, ...style }, widget);
}

export interfAce IMenuStyleOverrides extends IColorMApping {
	shAdowColor?: ColorIdentifier;
	borderColor?: ColorIdentifier;
	foregroundColor?: ColorIdentifier;
	bAckgroundColor?: ColorIdentifier;
	selectionForegroundColor?: ColorIdentifier;
	selectionBAckgroundColor?: ColorIdentifier;
	selectionBorderColor?: ColorIdentifier;
	sepArAtorColor?: ColorIdentifier;
}

export const defAultMenuStyles = <IMenuStyleOverrides>{
	shAdowColor: widgetShAdow,
	borderColor: menuBorder,
	foregroundColor: menuForeground,
	bAckgroundColor: menuBAckground,
	selectionForegroundColor: menuSelectionForeground,
	selectionBAckgroundColor: menuSelectionBAckground,
	selectionBorderColor: menuSelectionBorder,
	sepArAtorColor: menuSepArAtorBAckground
};

export function AttAchMenuStyler(widget: IThemAble, themeService: IThemeService, style?: IMenuStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, { ...defAultMenuStyles, ...style }, widget);
}

export interfAce IDiAlogStyleOverrides extends IButtonStyleOverrides {
	diAlogForeground?: ColorIdentifier;
	diAlogBAckground?: ColorIdentifier;
	diAlogShAdow?: ColorIdentifier;
	diAlogBorder?: ColorIdentifier;
	checkboxBorder?: ColorIdentifier;
	checkboxBAckground?: ColorIdentifier;
	checkboxForeground?: ColorIdentifier;
	errorIconForeground?: ColorIdentifier;
	wArningIconForeground?: ColorIdentifier;
	infoIconForeground?: ColorIdentifier;
}

export const defAultDiAlogStyles = <IDiAlogStyleOverrides>{
	diAlogBAckground: editorWidgetBAckground,
	diAlogForeground: editorWidgetForeground,
	diAlogShAdow: widgetShAdow,
	diAlogBorder: contrAstBorder,
	buttonForeground: buttonForeground,
	buttonBAckground: buttonBAckground,
	buttonHoverBAckground: buttonHoverBAckground,
	buttonBorder: contrAstBorder,
	checkboxBorder: simpleCheckboxBorder,
	checkboxBAckground: simpleCheckboxBAckground,
	checkboxForeground: simpleCheckboxForeground,
	errorIconForeground: problemsErrorIconForeground,
	wArningIconForeground: problemsWArningIconForeground,
	infoIconForeground: problemsInfoIconForeground
};


export function AttAchDiAlogStyler(widget: IThemAble, themeService: IThemeService, style?: IDiAlogStyleOverrides): IDisposAble {
	return AttAchStyler(themeService, { ...defAultDiAlogStyles, ...style }, widget);
}
