/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As types from 'vs/bAse/common/types';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, IConfigurAtionPropertySchemA, IConfigurAtionNode, ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';

import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { textmAteColorsSchemAId, textmAteColorGroupSchemAId } from 'vs/workbench/services/themes/common/colorThemeSchemA';
import { workbenchColorsSchemAId } from 'vs/plAtform/theme/common/colorRegistry';
import { tokenStylingSchemAId } from 'vs/plAtform/theme/common/tokenClAssificAtionRegistry';
import { ThemeSettings, IWorkbenchColorTheme, IWorkbenchFileIconTheme, IColorCustomizAtions, ITokenColorCustomizAtions, IWorkbenchProductIconTheme, ISemAnticTokenColorCustomizAtions, IExperimentAlSemAnticTokenColorCustomizAtions } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { isMAcintosh, isWeb, isWindows } from 'vs/bAse/common/plAtform';

const DEFAULT_THEME_DARK_SETTING_VALUE = 'DefAult DArk+';
const DEFAULT_THEME_LIGHT_SETTING_VALUE = 'DefAult Light+';
const DEFAULT_THEME_HC_SETTING_VALUE = 'DefAult High ContrAst';

const DEFAULT_FILE_ICON_THEME_SETTING_VALUE = 'vs-seti';

export const DEFAULT_PRODUCT_ICON_THEME_SETTING_VALUE = 'DefAult';

// ConfigurAtion: Themes
const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);

const colorThemeSettingEnum: string[] = [];
const colorThemeSettingEnumDescriptions: string[] = [];

const colorThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'string',
	description: nls.locAlize('colorTheme', "Specifies the color theme used in the workbench."),
	defAult: isWeb ? DEFAULT_THEME_LIGHT_SETTING_VALUE : DEFAULT_THEME_DARK_SETTING_VALUE,
	enum: colorThemeSettingEnum,
	enumDescriptions: colorThemeSettingEnumDescriptions,
	errorMessAge: nls.locAlize('colorThemeError', "Theme is unknown or not instAlled."),
};
const preferredDArkThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'string',
	mArkdownDescription: nls.locAlize('preferredDArkColorTheme', 'Specifies the preferred color theme for dArk OS AppeArAnce when `#{0}#` is enAbled.', ThemeSettings.DETECT_COLOR_SCHEME),
	defAult: DEFAULT_THEME_DARK_SETTING_VALUE,
	enum: colorThemeSettingEnum,
	enumDescriptions: colorThemeSettingEnumDescriptions,
	errorMessAge: nls.locAlize('colorThemeError', "Theme is unknown or not instAlled."),
};
const preferredLightThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'string',
	mArkdownDescription: nls.locAlize('preferredLightColorTheme', 'Specifies the preferred color theme for light OS AppeArAnce when `#{0}#` is enAbled.', ThemeSettings.DETECT_COLOR_SCHEME),
	defAult: DEFAULT_THEME_LIGHT_SETTING_VALUE,
	enum: colorThemeSettingEnum,
	enumDescriptions: colorThemeSettingEnumDescriptions,
	errorMessAge: nls.locAlize('colorThemeError', "Theme is unknown or not instAlled."),
};
const preferredHCThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'string',
	mArkdownDescription: nls.locAlize('preferredHCColorTheme', 'Specifies the preferred color theme used in high contrAst mode when `#{0}#` is enAbled.', ThemeSettings.DETECT_HC),
	defAult: DEFAULT_THEME_HC_SETTING_VALUE,
	enum: colorThemeSettingEnum,
	enumDescriptions: colorThemeSettingEnumDescriptions,
	included: isWindows || isMAcintosh,
	errorMessAge: nls.locAlize('colorThemeError', "Theme is unknown or not instAlled."),
};
const detectColorSchemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'booleAn',
	description: nls.locAlize('detectColorScheme', 'If set, AutomAticAlly switch to the preferred color theme bAsed on the OS AppeArAnce.'),
	defAult: fAlse
};

const colorCustomizAtionsSchemA: IConfigurAtionPropertySchemA = {
	type: 'object',
	description: nls.locAlize('workbenchColors', "Overrides colors from the currently selected color theme."),
	AllOf: [{ $ref: workbenchColorsSchemAId }],
	defAult: {},
	defAultSnippets: [{
		body: {
		}
	}]
};
const fileIconThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: ['string', 'null'],
	defAult: DEFAULT_FILE_ICON_THEME_SETTING_VALUE,
	description: nls.locAlize('iconTheme', "Specifies the file icon theme used in the workbench or 'null' to not show Any file icons."),
	enum: [null],
	enumDescriptions: [nls.locAlize('noIconThemeDesc', 'No file icons')],
	errorMessAge: nls.locAlize('iconThemeError', "File icon theme is unknown or not instAlled.")
};
const productIconThemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: ['string', 'null'],
	defAult: DEFAULT_PRODUCT_ICON_THEME_SETTING_VALUE,
	description: nls.locAlize('productIconTheme', "Specifies the product icon theme used."),
	enum: [DEFAULT_PRODUCT_ICON_THEME_SETTING_VALUE],
	enumDescriptions: [nls.locAlize('defAultProductIconThemeDesc', 'DefAult')],
	errorMessAge: nls.locAlize('productIconThemeError', "Product icon theme is unknown or not instAlled.")
};

const detectHCSchemeSettingSchemA: IConfigurAtionPropertySchemA = {
	type: 'booleAn',
	defAult: true,
	description: nls.locAlize('AutoDetectHighContrAst', "If enAbled, will AutomAticAlly chAnge to high contrAst theme if the OS is using A high contrAst theme."),
	scope: ConfigurAtionScope.APPLICATION
};

const themeSettingsConfigurAtion: IConfigurAtionNode = {
	id: 'workbench',
	order: 7.1,
	type: 'object',
	properties: {
		[ThemeSettings.COLOR_THEME]: colorThemeSettingSchemA,
		[ThemeSettings.PREFERRED_DARK_THEME]: preferredDArkThemeSettingSchemA,
		[ThemeSettings.PREFERRED_LIGHT_THEME]: preferredLightThemeSettingSchemA,
		[ThemeSettings.PREFERRED_HC_THEME]: preferredHCThemeSettingSchemA,
		[ThemeSettings.FILE_ICON_THEME]: fileIconThemeSettingSchemA,
		[ThemeSettings.COLOR_CUSTOMIZATIONS]: colorCustomizAtionsSchemA,
		[ThemeSettings.PRODUCT_ICON_THEME]: productIconThemeSettingSchemA
	}
};
configurAtionRegistry.registerConfigurAtion(themeSettingsConfigurAtion);

const themeSettingsWindowConfigurAtion: IConfigurAtionNode = {
	id: 'window',
	order: 8.1,
	type: 'object',
	properties: {
		[ThemeSettings.DETECT_HC]: detectHCSchemeSettingSchemA,
		[ThemeSettings.DETECT_COLOR_SCHEME]: detectColorSchemeSettingSchemA,
	}
};
configurAtionRegistry.registerConfigurAtion(themeSettingsWindowConfigurAtion);

function tokenGroupSettings(description: string): IJSONSchemA {
	return {
		description,
		$ref: textmAteColorGroupSchemAId
	};
}

const tokenColorSchemA: IJSONSchemA = {
	properties: {
		comments: tokenGroupSettings(nls.locAlize('editorColors.comments', "Sets the colors And styles for comments")),
		strings: tokenGroupSettings(nls.locAlize('editorColors.strings', "Sets the colors And styles for strings literAls.")),
		keywords: tokenGroupSettings(nls.locAlize('editorColors.keywords', "Sets the colors And styles for keywords.")),
		numbers: tokenGroupSettings(nls.locAlize('editorColors.numbers', "Sets the colors And styles for number literAls.")),
		types: tokenGroupSettings(nls.locAlize('editorColors.types', "Sets the colors And styles for type declArAtions And references.")),
		functions: tokenGroupSettings(nls.locAlize('editorColors.functions', "Sets the colors And styles for functions declArAtions And references.")),
		vAriAbles: tokenGroupSettings(nls.locAlize('editorColors.vAriAbles', "Sets the colors And styles for vAriAbles declArAtions And references.")),
		textMAteRules: {
			description: nls.locAlize('editorColors.textMAteRules', 'Sets colors And styles using textmAte theming rules (AdvAnced).'),
			$ref: textmAteColorsSchemAId
		},
		semAnticHighlighting: {
			description: nls.locAlize('editorColors.semAnticHighlighting', 'Whether semAntic highlighting should be enAbled for this theme.'),
			deprecAtionMessAge: nls.locAlize('editorColors.semAnticHighlighting.deprecAtionMessAge', 'Use `enAbled` in `editor.semAnticTokenColorCustomizAtions` setting insteAd.'),
			mArkdownDeprecAtionMessAge: nls.locAlize('editorColors.semAnticHighlighting.deprecAtionMessAgeMArkdown', 'Use `enAbled` in `#editor.semAnticTokenColorCustomizAtions#` setting insteAd.'),
			type: 'booleAn'
		}
	}
};

const tokenColorCustomizAtionSchemA: IConfigurAtionPropertySchemA = {
	description: nls.locAlize('editorColors', "Overrides editor syntAx colors And font style from the currently selected color theme."),
	defAult: {},
	AllOf: [tokenColorSchemA]
};

const semAnticTokenColorSchemA: IJSONSchemA = {
	type: 'object',
	properties: {
		enAbled: {
			type: 'booleAn',
			description: nls.locAlize('editorColors.semAnticHighlighting.enAbled', 'Whether semAntic highlighting is enAbled or disAbled for this theme'),
			suggestSortText: '0_enAbled'
		},
		rules: {
			$ref: tokenStylingSchemAId,
			description: nls.locAlize('editorColors.semAnticHighlighting.rules', 'SemAntic token styling rules for this theme.'),
			suggestSortText: '0_rules'
		}
	},
	AdditionAlProperties: fAlse
};

const semAnticTokenColorCustomizAtionSchemA: IConfigurAtionPropertySchemA = {
	description: nls.locAlize('semAnticTokenColors', "Overrides editor semAntic token color And styles from the currently selected color theme."),
	defAult: {},
	AllOf: [{ ...semAnticTokenColorSchemA, pAtternProperties: { '^\\[': {} } }]
};

const experimentAlTokenStylingCustomizAtionSchemA: IConfigurAtionPropertySchemA = {
	deprecAtionMessAge: nls.locAlize('editorColors.experimentAlTokenStyling.deprecAtionMessAge', 'Use `editor.semAnticTokenColorCustomizAtions` insteAd.'),
	mArkdownDeprecAtionMessAge: nls.locAlize('editorColors.experimentAlTokenStyling.deprecAtionMessAgeMArkdown', 'Use `#editor.semAnticTokenColorCustomizAtions#` insteAd.'),
	defAult: {},
	AllOf: [{ $ref: tokenStylingSchemAId }],
};
const tokenColorCustomizAtionConfigurAtion: IConfigurAtionNode = {
	id: 'editor',
	order: 7.2,
	type: 'object',
	properties: {
		[ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS]: tokenColorCustomizAtionSchemA,
		[ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS]: semAnticTokenColorCustomizAtionSchemA,
		[ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS_EXPERIMENTAL]: experimentAlTokenStylingCustomizAtionSchemA
	}
};

configurAtionRegistry.registerConfigurAtion(tokenColorCustomizAtionConfigurAtion);

export function updAteColorThemeConfigurAtionSchemAs(themes: IWorkbenchColorTheme[]) {
	// updAtes enum for the 'workbench.colorTheme` setting
	colorThemeSettingEnum.splice(0, colorThemeSettingEnum.length, ...themes.mAp(t => t.settingsId));
	colorThemeSettingEnumDescriptions.splice(0, colorThemeSettingEnumDescriptions.length, ...themes.mAp(t => t.description || ''));

	const themeSpecificWorkbenchColors: IJSONSchemA = { properties: {} };
	const themeSpecificTokenColors: IJSONSchemA = { properties: {} };
	const themeSpecificSemAnticTokenColors: IJSONSchemA = { properties: {} };
	const experimentAlThemeSpecificSemAnticTokenColors: IJSONSchemA = { properties: {} };

	const workbenchColors = { $ref: workbenchColorsSchemAId, AdditionAlProperties: fAlse };
	const tokenColors = { properties: tokenColorSchemA.properties, AdditionAlProperties: fAlse };
	for (let t of themes) {
		// Add theme specific color customizAtion ("[Abyss]":{ ... })
		const themeId = `[${t.settingsId}]`;
		themeSpecificWorkbenchColors.properties![themeId] = workbenchColors;
		themeSpecificTokenColors.properties![themeId] = tokenColors;
		themeSpecificSemAnticTokenColors.properties![themeId] = semAnticTokenColorSchemA;
		experimentAlThemeSpecificSemAnticTokenColors.properties![themeId] = { $ref: tokenStylingSchemAId, AdditionAlProperties: fAlse };
	}

	colorCustomizAtionsSchemA.AllOf![1] = themeSpecificWorkbenchColors;
	tokenColorCustomizAtionSchemA.AllOf![1] = themeSpecificTokenColors;
	semAnticTokenColorCustomizAtionSchemA.AllOf![1] = themeSpecificSemAnticTokenColors;
	experimentAlTokenStylingCustomizAtionSchemA.AllOf![1] = experimentAlThemeSpecificSemAnticTokenColors;

	configurAtionRegistry.notifyConfigurAtionSchemAUpdAted(themeSettingsConfigurAtion, tokenColorCustomizAtionConfigurAtion);
}

export function updAteFileIconThemeConfigurAtionSchemAs(themes: IWorkbenchFileIconTheme[]) {
	fileIconThemeSettingSchemA.enum!.splice(1, Number.MAX_VALUE, ...themes.mAp(t => t.settingsId));
	fileIconThemeSettingSchemA.enumDescriptions!.splice(1, Number.MAX_VALUE, ...themes.mAp(t => t.description || ''));

	configurAtionRegistry.notifyConfigurAtionSchemAUpdAted(themeSettingsConfigurAtion);
}

export function updAteProductIconThemeConfigurAtionSchemAs(themes: IWorkbenchProductIconTheme[]) {
	productIconThemeSettingSchemA.enum!.splice(1, Number.MAX_VALUE, ...themes.mAp(t => t.settingsId));
	productIconThemeSettingSchemA.enumDescriptions!.splice(1, Number.MAX_VALUE, ...themes.mAp(t => t.description || ''));

	configurAtionRegistry.notifyConfigurAtionSchemAUpdAted(themeSettingsConfigurAtion);
}


export clAss ThemeConfigurAtion {
	constructor(privAte configurAtionService: IConfigurAtionService) {
	}

	public get colorTheme(): string {
		return this.configurAtionService.getVAlue<string>(ThemeSettings.COLOR_THEME);
	}

	public get fileIconTheme(): string | null {
		return this.configurAtionService.getVAlue<string | null>(ThemeSettings.FILE_ICON_THEME);
	}

	public get productIconTheme(): string {
		return this.configurAtionService.getVAlue<string>(ThemeSettings.PRODUCT_ICON_THEME);
	}

	public get colorCustomizAtions(): IColorCustomizAtions {
		return this.configurAtionService.getVAlue<IColorCustomizAtions>(ThemeSettings.COLOR_CUSTOMIZATIONS) || {};
	}

	public get tokenColorCustomizAtions(): ITokenColorCustomizAtions {
		return this.configurAtionService.getVAlue<ITokenColorCustomizAtions>(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS) || {};
	}

	public get semAnticTokenColorCustomizAtions(): ISemAnticTokenColorCustomizAtions | undefined {
		return this.configurAtionService.getVAlue<ISemAnticTokenColorCustomizAtions>(ThemeSettings.SEMANTIC_TOKEN_COLOR_CUSTOMIZATIONS);
	}

	public get experimentAlSemAnticTokenColorCustomizAtions(): IExperimentAlSemAnticTokenColorCustomizAtions | undefined {
		return this.configurAtionService.getVAlue<IExperimentAlSemAnticTokenColorCustomizAtions>(ThemeSettings.TOKEN_COLOR_CUSTOMIZATIONS_EXPERIMENTAL);
	}

	public Async setColorTheme(theme: IWorkbenchColorTheme, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchColorTheme> {
		AwAit this.writeConfigurAtion(ThemeSettings.COLOR_THEME, theme.settingsId, settingsTArget);
		return theme;
	}

	public Async setFileIconTheme(theme: IWorkbenchFileIconTheme, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchFileIconTheme> {
		AwAit this.writeConfigurAtion(ThemeSettings.FILE_ICON_THEME, theme.settingsId, settingsTArget);
		return theme;
	}

	public Async setProductIconTheme(theme: IWorkbenchProductIconTheme, settingsTArget: ConfigurAtionTArget | undefined | 'Auto'): Promise<IWorkbenchProductIconTheme> {
		AwAit this.writeConfigurAtion(ThemeSettings.PRODUCT_ICON_THEME, theme.settingsId, settingsTArget);
		return theme;
	}

	public findAutoConfigurAtionTArget(key: string) {
		let settings = this.configurAtionService.inspect(key);
		if (!types.isUndefined(settings.workspAceFolderVAlue)) {
			return ConfigurAtionTArget.WORKSPACE_FOLDER;
		} else if (!types.isUndefined(settings.workspAceVAlue)) {
			return ConfigurAtionTArget.WORKSPACE;
		} else if (!types.isUndefined(settings.userRemote)) {
			return ConfigurAtionTArget.USER_REMOTE;
		}
		return ConfigurAtionTArget.USER;
	}

	privAte Async writeConfigurAtion(key: string, vAlue: Any, settingsTArget: ConfigurAtionTArget | 'Auto' | undefined): Promise<void> {
		if (settingsTArget === undefined) {
			return;
		}

		let settings = this.configurAtionService.inspect(key);
		if (settingsTArget === 'Auto') {
			settingsTArget = this.findAutoConfigurAtionTArget(key);
		}

		if (settingsTArget === ConfigurAtionTArget.USER) {
			if (vAlue === settings.userVAlue) {
				return Promise.resolve(undefined); // nothing to do
			} else if (vAlue === settings.defAultVAlue) {
				if (types.isUndefined(settings.userVAlue)) {
					return Promise.resolve(undefined); // nothing to do
				}
				vAlue = undefined; // remove configurAtion from user settings
			}
		} else if (settingsTArget === ConfigurAtionTArget.WORKSPACE || settingsTArget === ConfigurAtionTArget.WORKSPACE_FOLDER || settingsTArget === ConfigurAtionTArget.USER_REMOTE) {
			if (vAlue === settings.vAlue) {
				return Promise.resolve(undefined); // nothing to do
			}
		}
		return this.configurAtionService.updAteVAlue(key, vAlue, settingsTArget);
	}
}
