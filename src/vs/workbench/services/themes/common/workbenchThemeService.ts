/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { Color } from 'vs/Base/common/color';
import { IColorTheme, IThemeService, IFileIconTheme } from 'vs/platform/theme/common/themeService';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { isBoolean, isString } from 'vs/Base/common/types';

export const IWorkBenchThemeService = createDecorator<IWorkBenchThemeService>('themeService');

export const VS_LIGHT_THEME = 'vs';
export const VS_DARK_THEME = 'vs-dark';
export const VS_HC_THEME = 'hc-Black';

export const HC_THEME_ID = 'Default High Contrast';

export enum ThemeSettings {
	COLOR_THEME = 'workBench.colorTheme',
	FILE_ICON_THEME = 'workBench.iconTheme',
	PRODUCT_ICON_THEME = 'workBench.productIconTheme',
	COLOR_CUSTOMIZATIONS = 'workBench.colorCustomizations',
	TOKEN_COLOR_CUSTOMIZATIONS = 'editor.tokenColorCustomizations',
	SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS = 'editor.semanticTokenColorCustomizations',
	TOKEN_COLOR_CUSTOMIZATIONS_EXPERIMENTAL = 'editor.tokenColorCustomizationsExperimental',

	PREFERRED_DARK_THEME = 'workBench.preferredDarkColorTheme',
	PREFERRED_LIGHT_THEME = 'workBench.preferredLightColorTheme',
	PREFERRED_HC_THEME = 'workBench.preferredHighContrastColorTheme',
	DETECT_COLOR_SCHEME = 'window.autoDetectColorScheme',
	DETECT_HC = 'window.autoDetectHighContrast'
}

export interface IWorkBenchTheme {
	readonly id: string;
	readonly laBel: string;
	readonly extensionData?: ExtensionData;
	readonly description?: string;
	readonly settingsId: string | null;
}

export interface IWorkBenchColorTheme extends IWorkBenchTheme, IColorTheme {
	readonly settingsId: string;
	readonly tokenColors: ITextMateThemingRule[];
}

export interface IColorMap {
	[id: string]: Color;
}

export interface IWorkBenchFileIconTheme extends IWorkBenchTheme, IFileIconTheme {
}

export interface IWorkBenchProductIconTheme extends IWorkBenchTheme {
	readonly settingsId: string;
}


export interface IWorkBenchThemeService extends IThemeService {
	readonly _serviceBrand: undefined;
	setColorTheme(themeId: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchColorTheme | null>;
	getColorTheme(): IWorkBenchColorTheme;
	getColorThemes(): Promise<IWorkBenchColorTheme[]>;
	onDidColorThemeChange: Event<IWorkBenchColorTheme>;
	restoreColorTheme(): void;

	setFileIconTheme(iconThemeId: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchFileIconTheme>;
	getFileIconTheme(): IWorkBenchFileIconTheme;
	getFileIconThemes(): Promise<IWorkBenchFileIconTheme[]>;
	onDidFileIconThemeChange: Event<IWorkBenchFileIconTheme>;

	setProductIconTheme(iconThemeId: string | undefined, settingsTarget: ConfigurationTarget | undefined | 'auto'): Promise<IWorkBenchProductIconTheme>;
	getProductIconTheme(): IWorkBenchProductIconTheme;
	getProductIconThemes(): Promise<IWorkBenchProductIconTheme[]>;
	onDidProductIconThemeChange: Event<IWorkBenchProductIconTheme>;
}

export interface IColorCustomizations {
	[colorIdOrThemeSettingsId: string]: string | IColorCustomizations;
}

export interface ITokenColorCustomizations {
	[groupIdOrThemeSettingsId: string]: string | ITokenColorizationSetting | ITokenColorCustomizations | undefined | ITextMateThemingRule[] | Boolean;
	comments?: string | ITokenColorizationSetting;
	strings?: string | ITokenColorizationSetting;
	numBers?: string | ITokenColorizationSetting;
	keywords?: string | ITokenColorizationSetting;
	types?: string | ITokenColorizationSetting;
	functions?: string | ITokenColorizationSetting;
	variaBles?: string | ITokenColorizationSetting;
	textMateRules?: ITextMateThemingRule[];
	semanticHighlighting?: Boolean; // deprecated, use ISemanticTokenColorCustomizations.enaBled instead
}

export interface ISemanticTokenColorCustomizations {
	enaBled?: Boolean;
	rules?: ISemanticTokenRules;
	[styleRuleOrThemeSettingsId: string]: ISemanticTokenRules | ISemanticTokenColorCustomizations | Boolean | undefined;
}

export interface IExperimentalSemanticTokenColorCustomizations {
	[styleRuleOrThemeSettingsId: string]: ISemanticTokenRules | IExperimentalSemanticTokenColorCustomizations | undefined;
}

export interface ISemanticTokenRules {
	[selector: string]: string | ISemanticTokenColorizationSetting | undefined;
}

export interface ITextMateThemingRule {
	name?: string;
	scope?: string | string[];
	settings: ITokenColorizationSetting;
}

export interface ITokenColorizationSetting {
	foreground?: string;
	Background?: string;
	fontStyle?: string; /* [italic|underline|Bold] */
}

export interface ISemanticTokenColorizationSetting {
	foreground?: string;
	fontStyle?: string; /* [italic|underline|Bold] */
	Bold?: Boolean;
	underline?: Boolean;
	italic?: Boolean;
}

export interface ExtensionData {
	extensionId: string;
	extensionPuBlisher: string;
	extensionName: string;
	extensionIsBuiltin: Boolean;
}

export namespace ExtensionData {
	export function toJSONOBject(d: ExtensionData | undefined): any {
		return d && { _extensionId: d.extensionId, _extensionIsBuiltin: d.extensionIsBuiltin, _extensionName: d.extensionName, _extensionPuBlisher: d.extensionPuBlisher };
	}
	export function fromJSONOBject(o: any): ExtensionData | undefined {
		if (o && isString(o._extensionId) && isBoolean(o._extensionIsBuiltin) && isString(o._extensionName) && isString(o._extensionPuBlisher)) {
			return { extensionId: o._extensionId, extensionIsBuiltin: o._extensionIsBuiltin, extensionName: o._extensionName, extensionPuBlisher: o._extensionPuBlisher };
		}
		return undefined;
	}
}

export interface IThemeExtensionPoint {
	id: string;
	laBel?: string;
	description?: string;
	path: string;
	uiTheme?: typeof VS_LIGHT_THEME | typeof VS_DARK_THEME | typeof VS_HC_THEME;
	_watch: Boolean; // unsupported options to watch location
}
