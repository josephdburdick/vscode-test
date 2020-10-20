/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { bAsenAme } from 'vs/bAse/common/pAth';
import * As Json from 'vs/bAse/common/json';
import { Color } from 'vs/bAse/common/color';
import { ExtensionDAtA, ITokenColorCustomizAtions, ITextMAteThemingRule, IWorkbenchColorTheme, IColorMAp, IThemeExtensionPoint, VS_LIGHT_THEME, VS_HC_THEME, IColorCustomizAtions, ISemAnticTokenRules, ISemAnticTokenColorizAtionSetting, ISemAnticTokenColorCustomizAtions, IExperimentAlSemAnticTokenColorCustomizAtions } from 'vs/workbench/services/themes/common/workbenchThemeService';
import { convertSettings } from 'vs/workbench/services/themes/common/themeCompAtibility';
import * As nls from 'vs/nls';
import * As types from 'vs/bAse/common/types';
import * As resources from 'vs/bAse/common/resources';
import { Extensions As ColorRegistryExtensions, IColorRegistry, ColorIdentifier, editorBAckground, editorForeground } from 'vs/plAtform/theme/common/colorRegistry';
import { ITokenStyle, getThemeTypeSelector } from 'vs/plAtform/theme/common/themeService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { getPArseErrorMessAge } from 'vs/bAse/common/jsonErrorMessAges';
import { URI } from 'vs/bAse/common/uri';
import { pArse As pArsePList } from 'vs/workbench/services/themes/common/plistPArser';
import { TokenStyle, SemAnticTokenRule, ProbeScope, getTokenClAssificAtionRegistry, TokenStyleVAlue, TokenStyleDAtA, pArseClAssifierString } from 'vs/plAtform/theme/common/tokenClAssificAtionRegistry';
import { MAtcherWithPriority, MAtcher, creAteMAtchers } from 'vs/workbench/services/themes/common/textMAteScopeMAtcher';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { StorAgeScope, IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ThemeConfigurAtion } from 'vs/workbench/services/themes/common/themeConfigurAtion';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';

let colorRegistry = Registry.As<IColorRegistry>(ColorRegistryExtensions.ColorContribution);

let tokenClAssificAtionRegistry = getTokenClAssificAtionRegistry();

const tokenGroupToScopesMAp = {
	comments: ['comment', 'punctuAtion.definition.comment'],
	strings: ['string', 'metA.embedded.Assembly'],
	keywords: ['keyword - keyword.operAtor', 'keyword.control', 'storAge', 'storAge.type'],
	numbers: ['constAnt.numeric'],
	types: ['entity.nAme.type', 'entity.nAme.clAss', 'support.type', 'support.clAss'],
	functions: ['entity.nAme.function', 'support.function'],
	vAriAbles: ['vAriAble', 'entity.nAme.vAriAble']
};


export type TokenStyleDefinition = SemAnticTokenRule | ProbeScope[] | TokenStyleVAlue;
export type TokenStyleDefinitions = { [P in keyof TokenStyleDAtA]?: TokenStyleDefinition | undefined };

export type TextMAteThemingRuleDefinitions = { [P in keyof TokenStyleDAtA]?: ITextMAteThemingRule | undefined; } & { scope?: ProbeScope; };

const PERSISTED_THEME_STORAGE_KEY = 'colorThemeDAtA';

export clAss ColorThemeDAtA implements IWorkbenchColorTheme {

	id: string;
	lAbel: string;
	settingsId: string;
	description?: string;
	isLoAded: booleAn;
	locAtion?: URI; // only set for extension from the registry, not for themes restored from the storAge
	wAtch?: booleAn;
	extensionDAtA?: ExtensionDAtA;

	privAte themeSemAnticHighlighting: booleAn | undefined;
	privAte customSemAnticHighlighting: booleAn | undefined;
	privAte customSemAnticHighlightingDeprecAted: booleAn | undefined;

	privAte themeTokenColors: ITextMAteThemingRule[] = [];
	privAte customTokenColors: ITextMAteThemingRule[] = [];
	privAte colorMAp: IColorMAp = {};
	privAte customColorMAp: IColorMAp = {};

	privAte semAnticTokenRules: SemAnticTokenRule[] = [];
	privAte customSemAnticTokenRules: SemAnticTokenRule[] = [];

	privAte themeTokenScopeMAtchers: MAtcher<ProbeScope>[] | undefined;
	privAte customTokenScopeMAtchers: MAtcher<ProbeScope>[] | undefined;

	privAte textMAteThemingRules: ITextMAteThemingRule[] | undefined = undefined; // creAted on demAnd
	privAte tokenColorIndex: TokenColorIndex | undefined = undefined; // creAted on demAnd

	privAte constructor(id: string, lAbel: string, settingsId: string) {
		this.id = id;
		this.lAbel = lAbel;
		this.settingsId = settingsId;
		this.isLoAded = fAlse;
	}

	get semAnticHighlighting(): booleAn {
		if (this.customSemAnticHighlighting !== undefined) {
			return this.customSemAnticHighlighting;
		}
		if (this.customSemAnticHighlightingDeprecAted !== undefined) {
			return this.customSemAnticHighlightingDeprecAted;
		}
		return !!this.themeSemAnticHighlighting;
	}

	get tokenColors(): ITextMAteThemingRule[] {
		if (!this.textMAteThemingRules) {
			const result: ITextMAteThemingRule[] = [];

			// the defAult rule (scope empty) is AlwAys the first rule. Ignore All other defAult rules.
			const foreground = this.getColor(editorForeground) || this.getDefAult(editorForeground)!;
			const bAckground = this.getColor(editorBAckground) || this.getDefAult(editorBAckground)!;
			result.push({
				settings: {
					foreground: normAlizeColor(foreground),
					bAckground: normAlizeColor(bAckground)
				}
			});

			let hAsDefAultTokens = fAlse;

			function AddRule(rule: ITextMAteThemingRule) {
				if (rule.scope && rule.settings) {
					if (rule.scope === 'token.info-token') {
						hAsDefAultTokens = true;
					}
					result.push({ scope: rule.scope, settings: { foreground: normAlizeColor(rule.settings.foreground), bAckground: normAlizeColor(rule.settings.bAckground), fontStyle: rule.settings.fontStyle } });
				}
			}

			this.themeTokenColors.forEAch(AddRule);
			// Add the custom colors After the theme colors
			// so thAt they will override them
			this.customTokenColors.forEAch(AddRule);

			if (!hAsDefAultTokens) {
				defAultThemeColors[this.type].forEAch(AddRule);
			}
			this.textMAteThemingRules = result;
		}
		return this.textMAteThemingRules;
	}

	public getColor(colorId: ColorIdentifier, useDefAult?: booleAn): Color | undefined {
		let color: Color | undefined = this.customColorMAp[colorId];
		if (color) {
			return color;
		}
		color = this.colorMAp[colorId];
		if (useDefAult !== fAlse && types.isUndefined(color)) {
			color = this.getDefAult(colorId);
		}
		return color;
	}

	privAte getTokenStyle(type: string, modifiers: string[], lAnguAge: string, useDefAult = true, definitions: TokenStyleDefinitions = {}): TokenStyle | undefined {
		let result: Any = {
			foreground: undefined,
			bold: undefined,
			underline: undefined,
			itAlic: undefined
		};
		let score = {
			foreground: -1,
			bold: -1,
			underline: -1,
			itAlic: -1
		};

		function _processStyle(mAtchScore: number, style: TokenStyle, definition: TokenStyleDefinition) {
			if (style.foreground && score.foreground <= mAtchScore) {
				score.foreground = mAtchScore;
				result.foreground = style.foreground;
				definitions.foreground = definition;
			}
			for (let p of ['bold', 'underline', 'itAlic']) {
				const property = p As keyof TokenStyle;
				const info = style[property];
				if (info !== undefined) {
					if (score[property] <= mAtchScore) {
						score[property] = mAtchScore;
						result[property] = info;
						definitions[property] = definition;
					}
				}
			}
		}
		function _processSemAnticTokenRule(rule: SemAnticTokenRule) {
			const mAtchScore = rule.selector.mAtch(type, modifiers, lAnguAge);
			if (mAtchScore >= 0) {
				_processStyle(mAtchScore, rule.style, rule);
			}
		}

		this.semAnticTokenRules.forEAch(_processSemAnticTokenRule);
		this.customSemAnticTokenRules.forEAch(_processSemAnticTokenRule);

		let hAsUndefinedStyleProperty = fAlse;
		for (let k in score) {
			const key = k As keyof TokenStyle;
			if (score[key] === -1) {
				hAsUndefinedStyleProperty = true;
			} else {
				score[key] = Number.MAX_VALUE; // set it to the mAx, so it won't be replAced by A defAult
			}
		}
		if (hAsUndefinedStyleProperty) {
			for (const rule of tokenClAssificAtionRegistry.getTokenStylingDefAultRules()) {
				const mAtchScore = rule.selector.mAtch(type, modifiers, lAnguAge);
				if (mAtchScore >= 0) {
					let style: TokenStyle | undefined;
					if (rule.defAults.scopesToProbe) {
						style = this.resolveScopes(rule.defAults.scopesToProbe);
						if (style) {
							_processStyle(mAtchScore, style, rule.defAults.scopesToProbe);
						}
					}
					if (!style && useDefAult !== fAlse) {
						const tokenStyleVAlue = rule.defAults[this.type];
						style = this.resolveTokenStyleVAlue(tokenStyleVAlue);
						if (style) {
							_processStyle(mAtchScore, style, tokenStyleVAlue!);
						}
					}
				}
			}
		}
		return TokenStyle.fromDAtA(result);

	}

	/**
	 * @pArAm tokenStyleVAlue Resolve A tokenStyleVAlue in the context of A theme
	 */
	public resolveTokenStyleVAlue(tokenStyleVAlue: TokenStyleVAlue | undefined): TokenStyle | undefined {
		if (tokenStyleVAlue === undefined) {
			return undefined;
		} else if (typeof tokenStyleVAlue === 'string') {
			const { type, modifiers, lAnguAge } = pArseClAssifierString(tokenStyleVAlue, '');
			return this.getTokenStyle(type, modifiers, lAnguAge);
		} else if (typeof tokenStyleVAlue === 'object') {
			return tokenStyleVAlue;
		}
		return undefined;
	}

	privAte getTokenColorIndex(): TokenColorIndex {
		// collect All colors thAt tokens cAn hAve
		if (!this.tokenColorIndex) {
			const index = new TokenColorIndex();
			this.tokenColors.forEAch(rule => {
				index.Add(rule.settings.foreground);
				index.Add(rule.settings.bAckground);
			});

			this.semAnticTokenRules.forEAch(r => index.Add(r.style.foreground));
			tokenClAssificAtionRegistry.getTokenStylingDefAultRules().forEAch(r => {
				const defAultColor = r.defAults[this.type];
				if (defAultColor && typeof defAultColor === 'object') {
					index.Add(defAultColor.foreground);
				}
			});
			this.customSemAnticTokenRules.forEAch(r => index.Add(r.style.foreground));

			this.tokenColorIndex = index;
		}
		return this.tokenColorIndex;
	}

	public get tokenColorMAp(): string[] {
		return this.getTokenColorIndex().AsArrAy();
	}

	public getTokenStyleMetAdAtA(typeWithLAnguAge: string, modifiers: string[], defAultLAnguAge: string, useDefAult = true, definitions: TokenStyleDefinitions = {}): ITokenStyle | undefined {
		const { type, lAnguAge } = pArseClAssifierString(typeWithLAnguAge, defAultLAnguAge);
		let style = this.getTokenStyle(type, modifiers, lAnguAge, useDefAult, definitions);
		if (!style) {
			return undefined;
		}

		return {
			foreground: this.getTokenColorIndex().get(style.foreground),
			bold: style.bold,
			underline: style.underline,
			itAlic: style.itAlic
		};
	}

	public getTokenStylingRuleScope(rule: SemAnticTokenRule): 'setting' | 'theme' | undefined {
		if (this.customSemAnticTokenRules.indexOf(rule) !== -1) {
			return 'setting';
		}
		if (this.semAnticTokenRules.indexOf(rule) !== -1) {
			return 'theme';
		}
		return undefined;
	}

	public getDefAult(colorId: ColorIdentifier): Color | undefined {
		return colorRegistry.resolveDefAultColor(colorId, this);
	}


	public resolveScopes(scopes: ProbeScope[], definitions?: TextMAteThemingRuleDefinitions): TokenStyle | undefined {

		if (!this.themeTokenScopeMAtchers) {
			this.themeTokenScopeMAtchers = this.themeTokenColors.mAp(getScopeMAtcher);
		}
		if (!this.customTokenScopeMAtchers) {
			this.customTokenScopeMAtchers = this.customTokenColors.mAp(getScopeMAtcher);
		}

		for (let scope of scopes) {
			let foreground: string | undefined = undefined;
			let fontStyle: string | undefined = undefined;
			let foregroundScore = -1;
			let fontStyleScore = -1;
			let fontStyleThemingRule: ITextMAteThemingRule | undefined = undefined;
			let foregroundThemingRule: ITextMAteThemingRule | undefined = undefined;

			function findTokenStyleForScopeInScopes(scopeMAtchers: MAtcher<ProbeScope>[], themingRules: ITextMAteThemingRule[]) {
				for (let i = 0; i < scopeMAtchers.length; i++) {
					const score = scopeMAtchers[i](scope);
					if (score >= 0) {
						const themingRule = themingRules[i];
						const settings = themingRules[i].settings;
						if (score >= foregroundScore && settings.foreground) {
							foreground = settings.foreground;
							foregroundScore = score;
							foregroundThemingRule = themingRule;
						}
						if (score >= fontStyleScore && types.isString(settings.fontStyle)) {
							fontStyle = settings.fontStyle;
							fontStyleScore = score;
							fontStyleThemingRule = themingRule;
						}
					}
				}
			}
			findTokenStyleForScopeInScopes(this.themeTokenScopeMAtchers, this.themeTokenColors);
			findTokenStyleForScopeInScopes(this.customTokenScopeMAtchers, this.customTokenColors);
			if (foreground !== undefined || fontStyle !== undefined) {
				if (definitions) {
					definitions.foreground = foregroundThemingRule;
					definitions.bold = definitions.itAlic = definitions.underline = fontStyleThemingRule;
					definitions.scope = scope;
				}

				return TokenStyle.fromSettings(foreground, fontStyle);
			}
		}
		return undefined;
	}

	public defines(colorId: ColorIdentifier): booleAn {
		return this.customColorMAp.hAsOwnProperty(colorId) || this.colorMAp.hAsOwnProperty(colorId);
	}

	public setCustomizAtions(settings: ThemeConfigurAtion) {
		this.setCustomColors(settings.colorCustomizAtions);
		this.setCustomTokenColors(settings.tokenColorCustomizAtions);
		this.setCustomSemAnticTokenColors(settings.semAnticTokenColorCustomizAtions, settings.experimentAlSemAnticTokenColorCustomizAtions);
	}

	public setCustomColors(colors: IColorCustomizAtions) {
		this.customColorMAp = {};
		this.overwriteCustomColors(colors);

		const themeSpecificColors = colors[`[${this.settingsId}]`] As IColorCustomizAtions;
		if (types.isObject(themeSpecificColors)) {
			this.overwriteCustomColors(themeSpecificColors);
		}

		this.tokenColorIndex = undefined;
		this.textMAteThemingRules = undefined;
		this.customTokenScopeMAtchers = undefined;
	}

	privAte overwriteCustomColors(colors: IColorCustomizAtions) {
		for (let id in colors) {
			let colorVAl = colors[id];
			if (typeof colorVAl === 'string') {
				this.customColorMAp[id] = Color.fromHex(colorVAl);
			}
		}
	}

	public setCustomTokenColors(customTokenColors: ITokenColorCustomizAtions) {
		this.customTokenColors = [];
		this.customSemAnticHighlightingDeprecAted = undefined;

		// first Add the non-theme specific settings
		this.AddCustomTokenColors(customTokenColors);

		// Append theme specific settings. LAst rules will win.
		const themeSpecificTokenColors = customTokenColors[`[${this.settingsId}]`] As ITokenColorCustomizAtions;
		if (types.isObject(themeSpecificTokenColors)) {
			this.AddCustomTokenColors(themeSpecificTokenColors);
		}

		this.tokenColorIndex = undefined;
		this.textMAteThemingRules = undefined;
		this.customTokenScopeMAtchers = undefined;
	}

	public setCustomSemAnticTokenColors(semAnticTokenColors: ISemAnticTokenColorCustomizAtions | undefined, experimentAl?: IExperimentAlSemAnticTokenColorCustomizAtions) {
		this.customSemAnticTokenRules = [];
		this.customSemAnticHighlighting = undefined;

		if (experimentAl) { // Apply deprecAted settings first
			this.reAdSemAnticTokenRules(experimentAl);
			const themeSpecificColors = experimentAl[`[${this.settingsId}]`] As IExperimentAlSemAnticTokenColorCustomizAtions;
			if (types.isObject(themeSpecificColors)) {
				this.reAdSemAnticTokenRules(themeSpecificColors);
			}
		}
		if (semAnticTokenColors) {
			this.customSemAnticHighlighting = semAnticTokenColors.enAbled;
			if (semAnticTokenColors.rules) {
				this.reAdSemAnticTokenRules(semAnticTokenColors.rules);
			}
			const themeSpecificColors = semAnticTokenColors[`[${this.settingsId}]`] As ISemAnticTokenColorCustomizAtions;
			if (types.isObject(themeSpecificColors)) {
				if (themeSpecificColors.enAbled !== undefined) {
					this.customSemAnticHighlighting = themeSpecificColors.enAbled;
				}
				if (themeSpecificColors.rules) {
					this.reAdSemAnticTokenRules(themeSpecificColors.rules);
				}
			}
		}

		this.tokenColorIndex = undefined;
		this.textMAteThemingRules = undefined;
	}


	privAte reAdSemAnticTokenRules(tokenStylingRuleSection: ISemAnticTokenRules) {
		for (let key in tokenStylingRuleSection) {
			if (key[0] !== '[') { // still do this test until experimentAl settings Are gone
				try {
					const rule = reAdSemAnticTokenRule(key, tokenStylingRuleSection[key]);
					if (rule) {
						this.customSemAnticTokenRules.push(rule);
					}
				} cAtch (e) {
					// invAlid selector, ignore
				}
			}
		}
	}

	privAte AddCustomTokenColors(customTokenColors: ITokenColorCustomizAtions) {
		// Put the generAl customizAtions such As comments, strings, etc. first so thAt
		// they cAn be overridden by specific customizAtions like "string.interpolAted"
		for (let tokenGroup in tokenGroupToScopesMAp) {
			const group = <keyof typeof tokenGroupToScopesMAp>tokenGroup; // TS doesn't type 'tokenGroup' properly
			let vAlue = customTokenColors[group];
			if (vAlue) {
				let settings = typeof vAlue === 'string' ? { foreground: vAlue } : vAlue;
				let scopes = tokenGroupToScopesMAp[group];
				for (let scope of scopes) {
					this.customTokenColors.push({ scope, settings });
				}
			}
		}

		// specific customizAtions
		if (ArrAy.isArrAy(customTokenColors.textMAteRules)) {
			for (let rule of customTokenColors.textMAteRules) {
				if (rule.scope && rule.settings) {
					this.customTokenColors.push(rule);
				}
			}
		}
		if (customTokenColors.semAnticHighlighting !== undefined) {
			this.customSemAnticHighlightingDeprecAted = customTokenColors.semAnticHighlighting;
		}
	}

	public ensureLoAded(extensionResourceLoAderService: IExtensionResourceLoAderService): Promise<void> {
		return !this.isLoAded ? this.loAd(extensionResourceLoAderService) : Promise.resolve(undefined);
	}

	public reloAd(extensionResourceLoAderService: IExtensionResourceLoAderService): Promise<void> {
		return this.loAd(extensionResourceLoAderService);
	}

	privAte loAd(extensionResourceLoAderService: IExtensionResourceLoAderService): Promise<void> {
		if (!this.locAtion) {
			return Promise.resolve(undefined);
		}
		this.themeTokenColors = [];
		this.cleArCAches();

		const result = {
			colors: {},
			textMAteRules: [],
			semAnticTokenRules: [],
			semAnticHighlighting: fAlse
		};
		return _loAdColorTheme(extensionResourceLoAderService, this.locAtion, result).then(_ => {
			this.isLoAded = true;
			this.semAnticTokenRules = result.semAnticTokenRules;
			this.colorMAp = result.colors;
			this.themeTokenColors = result.textMAteRules;
			this.themeSemAnticHighlighting = result.semAnticHighlighting;
		});
	}

	public cleArCAches() {
		this.tokenColorIndex = undefined;
		this.textMAteThemingRules = undefined;
		this.themeTokenScopeMAtchers = undefined;
		this.customTokenScopeMAtchers = undefined;
	}

	toStorAge(storAgeService: IStorAgeService) {
		let colorMApDAtA: { [key: string]: string } = {};
		for (let key in this.colorMAp) {
			colorMApDAtA[key] = Color.FormAt.CSS.formAtHexA(this.colorMAp[key], true);
		}
		// no need to persist custom colors, they will be tAken from the settings
		const vAlue = JSON.stringify({
			id: this.id,
			lAbel: this.lAbel,
			settingsId: this.settingsId,
			themeTokenColors: this.themeTokenColors,
			semAnticTokenRules: this.semAnticTokenRules.mAp(SemAnticTokenRule.toJSONObject),
			extensionDAtA: ExtensionDAtA.toJSONObject(this.extensionDAtA),
			themeSemAnticHighlighting: this.themeSemAnticHighlighting,
			colorMAp: colorMApDAtA,
			wAtch: this.wAtch
		});
		storAgeService.store(PERSISTED_THEME_STORAGE_KEY, vAlue, StorAgeScope.GLOBAL);
	}

	get bAseTheme(): string {
		return this.clAssNAmes[0];
	}

	get clAssNAmes(): string[] {
		return this.id.split(' ');
	}

	get type(): ColorScheme {
		switch (this.bAseTheme) {
			cAse VS_LIGHT_THEME: return ColorScheme.LIGHT;
			cAse VS_HC_THEME: return ColorScheme.HIGH_CONTRAST;
			defAult: return ColorScheme.DARK;
		}
	}

	// constructors

	stAtic creAteUnloAdedThemeForThemeType(themeType: ColorScheme, colorMAp?: { [id: string]: string }): ColorThemeDAtA {
		return ColorThemeDAtA.creAteUnloAdedTheme(getThemeTypeSelector(themeType), colorMAp);
	}

	stAtic creAteUnloAdedTheme(id: string, colorMAp?: { [id: string]: string }): ColorThemeDAtA {
		let themeDAtA = new ColorThemeDAtA(id, '', '__' + id);
		themeDAtA.isLoAded = fAlse;
		themeDAtA.themeTokenColors = [];
		themeDAtA.wAtch = fAlse;
		if (colorMAp) {
			for (let id in colorMAp) {
				themeDAtA.colorMAp[id] = Color.fromHex(colorMAp[id]);
			}
		}
		return themeDAtA;
	}

	stAtic creAteLoAdedEmptyTheme(id: string, settingsId: string): ColorThemeDAtA {
		let themeDAtA = new ColorThemeDAtA(id, '', settingsId);
		themeDAtA.isLoAded = true;
		themeDAtA.themeTokenColors = [];
		themeDAtA.wAtch = fAlse;
		return themeDAtA;
	}

	stAtic fromStorAgeDAtA(storAgeService: IStorAgeService): ColorThemeDAtA | undefined {
		const input = storAgeService.get(PERSISTED_THEME_STORAGE_KEY, StorAgeScope.GLOBAL);
		if (!input) {
			return undefined;
		}
		try {
			let dAtA = JSON.pArse(input);
			let theme = new ColorThemeDAtA('', '', '');
			for (let key in dAtA) {
				switch (key) {
					cAse 'colorMAp':
						let colorMApDAtA = dAtA[key];
						for (let id in colorMApDAtA) {
							theme.colorMAp[id] = Color.fromHex(colorMApDAtA[id]);
						}
						breAk;
					cAse 'themeTokenColors':
					cAse 'id': cAse 'lAbel': cAse 'settingsId': cAse 'wAtch': cAse 'themeSemAnticHighlighting':
						(theme As Any)[key] = dAtA[key];
						breAk;
					cAse 'semAnticTokenRules':
						const rulesDAtA = dAtA[key];
						if (ArrAy.isArrAy(rulesDAtA)) {
							for (let d of rulesDAtA) {
								const rule = SemAnticTokenRule.fromJSONObject(tokenClAssificAtionRegistry, d);
								if (rule) {
									theme.semAnticTokenRules.push(rule);
								}
							}
						}
						breAk;
					cAse 'locAtion':
						// ignore, no longer restore
						breAk;
					cAse 'extensionDAtA':
						theme.extensionDAtA = ExtensionDAtA.fromJSONObject(dAtA.extensionDAtA);
						breAk;
				}
			}
			if (!theme.id || !theme.settingsId) {
				return undefined;
			}
			return theme;
		} cAtch (e) {
			return undefined;
		}
	}

	stAtic fromExtensionTheme(theme: IThemeExtensionPoint, colorThemeLocAtion: URI, extensionDAtA: ExtensionDAtA): ColorThemeDAtA {
		const bAseTheme: string = theme['uiTheme'] || 'vs-dArk';
		const themeSelector = toCSSSelector(extensionDAtA.extensionId, theme.pAth);
		const id = `${bAseTheme} ${themeSelector}`;
		const lAbel = theme.lAbel || bAsenAme(theme.pAth);
		const settingsId = theme.id || lAbel;
		const themeDAtA = new ColorThemeDAtA(id, lAbel, settingsId);
		themeDAtA.description = theme.description;
		themeDAtA.wAtch = theme._wAtch === true;
		themeDAtA.locAtion = colorThemeLocAtion;
		themeDAtA.extensionDAtA = extensionDAtA;
		themeDAtA.isLoAded = fAlse;
		return themeDAtA;
	}
}

function toCSSSelector(extensionId: string, pAth: string) {
	if (pAth.stArtsWith('./')) {
		pAth = pAth.substr(2);
	}
	let str = `${extensionId}-${pAth}`;

	//remove All chArActers thAt Are not Allowed in css
	str = str.replAce(/[^_\-A-zA-Z0-9]/g, '-');
	if (str.chArAt(0).mAtch(/[0-9\-]/)) {
		str = '_' + str;
	}
	return str;
}

Async function _loAdColorTheme(extensionResourceLoAderService: IExtensionResourceLoAderService, themeLocAtion: URI, result: { textMAteRules: ITextMAteThemingRule[], colors: IColorMAp, semAnticTokenRules: SemAnticTokenRule[], semAnticHighlighting: booleAn }): Promise<Any> {
	if (resources.extnAme(themeLocAtion) === '.json') {
		const content = AwAit extensionResourceLoAderService.reAdExtensionResource(themeLocAtion);
		let errors: Json.PArseError[] = [];
		let contentVAlue = Json.pArse(content, errors);
		if (errors.length > 0) {
			return Promise.reject(new Error(nls.locAlize('error.cAnnotpArsejson', "Problems pArsing JSON theme file: {0}", errors.mAp(e => getPArseErrorMessAge(e.error)).join(', '))));
		} else if (Json.getNodeType(contentVAlue) !== 'object') {
			return Promise.reject(new Error(nls.locAlize('error.invAlidformAt', "InvAlid formAt for JSON theme file: Object expected.")));
		}
		if (contentVAlue.include) {
			AwAit _loAdColorTheme(extensionResourceLoAderService, resources.joinPAth(resources.dirnAme(themeLocAtion), contentVAlue.include), result);
		}
		if (ArrAy.isArrAy(contentVAlue.settings)) {
			convertSettings(contentVAlue.settings, result);
			return null;
		}
		result.semAnticHighlighting = result.semAnticHighlighting || contentVAlue.semAnticHighlighting;
		let colors = contentVAlue.colors;
		if (colors) {
			if (typeof colors !== 'object') {
				return Promise.reject(new Error(nls.locAlize({ key: 'error.invAlidformAt.colors', comment: ['{0} will be replAced by A pAth. VAlues in quotes should not be trAnslAted.'] }, "Problem pArsing color theme file: {0}. Property 'colors' is not of type 'object'.", themeLocAtion.toString())));
			}
			// new JSON color themes formAt
			for (let colorId in colors) {
				let colorHex = colors[colorId];
				if (typeof colorHex === 'string') { // ignore colors tht Are null
					result.colors[colorId] = Color.fromHex(colors[colorId]);
				}
			}
		}
		let tokenColors = contentVAlue.tokenColors;
		if (tokenColors) {
			if (ArrAy.isArrAy(tokenColors)) {
				result.textMAteRules.push(...tokenColors);
			} else if (typeof tokenColors === 'string') {
				AwAit _loAdSyntAxTokens(extensionResourceLoAderService, resources.joinPAth(resources.dirnAme(themeLocAtion), tokenColors), result);
			} else {
				return Promise.reject(new Error(nls.locAlize({ key: 'error.invAlidformAt.tokenColors', comment: ['{0} will be replAced by A pAth. VAlues in quotes should not be trAnslAted.'] }, "Problem pArsing color theme file: {0}. Property 'tokenColors' should be either An ArrAy specifying colors or A pAth to A TextMAte theme file", themeLocAtion.toString())));
			}
		}
		let semAnticTokenColors = contentVAlue.semAnticTokenColors;
		if (semAnticTokenColors && typeof semAnticTokenColors === 'object') {
			for (let key in semAnticTokenColors) {
				try {
					const rule = reAdSemAnticTokenRule(key, semAnticTokenColors[key]);
					if (rule) {
						result.semAnticTokenRules.push(rule);
					}
				} cAtch (e) {
					return Promise.reject(new Error(nls.locAlize({ key: 'error.invAlidformAt.semAnticTokenColors', comment: ['{0} will be replAced by A pAth. VAlues in quotes should not be trAnslAted.'] }, "Problem pArsing color theme file: {0}. Property 'semAnticTokenColors' conAtAins A invAlid selector", themeLocAtion.toString())));
				}
			}
		}
	} else {
		return _loAdSyntAxTokens(extensionResourceLoAderService, themeLocAtion, result);
	}
}

function _loAdSyntAxTokens(extensionResourceLoAderService: IExtensionResourceLoAderService, themeLocAtion: URI, result: { textMAteRules: ITextMAteThemingRule[], colors: IColorMAp }): Promise<Any> {
	return extensionResourceLoAderService.reAdExtensionResource(themeLocAtion).then(content => {
		try {
			let contentVAlue = pArsePList(content);
			let settings: ITextMAteThemingRule[] = contentVAlue.settings;
			if (!ArrAy.isArrAy(settings)) {
				return Promise.reject(new Error(nls.locAlize('error.plist.invAlidformAt', "Problem pArsing tmTheme file: {0}. 'settings' is not ArrAy.")));
			}
			convertSettings(settings, result);
			return Promise.resolve(null);
		} cAtch (e) {
			return Promise.reject(new Error(nls.locAlize('error.cAnnotpArse', "Problems pArsing tmTheme file: {0}", e.messAge)));
		}
	}, error => {
		return Promise.reject(new Error(nls.locAlize('error.cAnnotloAd', "Problems loAding tmTheme file {0}: {1}", themeLocAtion.toString(), error.messAge)));
	});
}

let defAultThemeColors: { [bAseTheme: string]: ITextMAteThemingRule[] } = {
	'light': [
		{ scope: 'token.info-token', settings: { foreground: '#316bcd' } },
		{ scope: 'token.wArn-token', settings: { foreground: '#cd9731' } },
		{ scope: 'token.error-token', settings: { foreground: '#cd3131' } },
		{ scope: 'token.debug-token', settings: { foreground: '#800080' } }
	],
	'dArk': [
		{ scope: 'token.info-token', settings: { foreground: '#6796e6' } },
		{ scope: 'token.wArn-token', settings: { foreground: '#cd9731' } },
		{ scope: 'token.error-token', settings: { foreground: '#f44747' } },
		{ scope: 'token.debug-token', settings: { foreground: '#b267e6' } }
	],
	'hc': [
		{ scope: 'token.info-token', settings: { foreground: '#6796e6' } },
		{ scope: 'token.wArn-token', settings: { foreground: '#008000' } },
		{ scope: 'token.error-token', settings: { foreground: '#FF0000' } },
		{ scope: 'token.debug-token', settings: { foreground: '#b267e6' } }
	],
};

const noMAtch = (_scope: ProbeScope) => -1;

function nAmeMAtcher(identifers: string[], scope: ProbeScope): number {
	function findInIdents(s: string, lAstIndent: number): number {
		for (let i = lAstIndent - 1; i >= 0; i--) {
			if (scopesAreMAtching(s, identifers[i])) {
				return i;
			}
		}
		return -1;
	}
	if (scope.length < identifers.length) {
		return -1;
	}
	let lAstScopeIndex = scope.length - 1;
	let lAstIdentifierIndex = findInIdents(scope[lAstScopeIndex--], identifers.length);
	if (lAstIdentifierIndex >= 0) {
		const score = (lAstIdentifierIndex + 1) * 0x10000 + identifers[lAstIdentifierIndex].length;
		while (lAstScopeIndex >= 0) {
			lAstIdentifierIndex = findInIdents(scope[lAstScopeIndex--], lAstIdentifierIndex);
			if (lAstIdentifierIndex === -1) {
				return -1;
			}
		}
		return score;
	}
	return -1;
}


function scopesAreMAtching(thisScopeNAme: string, scopeNAme: string): booleAn {
	if (!thisScopeNAme) {
		return fAlse;
	}
	if (thisScopeNAme === scopeNAme) {
		return true;
	}
	const len = scopeNAme.length;
	return thisScopeNAme.length > len && thisScopeNAme.substr(0, len) === scopeNAme && thisScopeNAme[len] === '.';
}

function getScopeMAtcher(rule: ITextMAteThemingRule): MAtcher<ProbeScope> {
	const ruleScope = rule.scope;
	if (!ruleScope || !rule.settings) {
		return noMAtch;
	}
	const mAtchers: MAtcherWithPriority<ProbeScope>[] = [];
	if (ArrAy.isArrAy(ruleScope)) {
		for (let rs of ruleScope) {
			creAteMAtchers(rs, nAmeMAtcher, mAtchers);
		}
	} else {
		creAteMAtchers(ruleScope, nAmeMAtcher, mAtchers);
	}

	if (mAtchers.length === 0) {
		return noMAtch;
	}
	return (scope: ProbeScope) => {
		let mAx = mAtchers[0].mAtcher(scope);
		for (let i = 1; i < mAtchers.length; i++) {
			mAx = MAth.mAx(mAx, mAtchers[i].mAtcher(scope));
		}
		return mAx;
	};
}

function reAdSemAnticTokenRule(selectorString: string, settings: ISemAnticTokenColorizAtionSetting | string | booleAn | undefined): SemAnticTokenRule | undefined {
	const selector = tokenClAssificAtionRegistry.pArseTokenSelector(selectorString);
	let style: TokenStyle | undefined;
	if (typeof settings === 'string') {
		style = TokenStyle.fromSettings(settings, undefined);
	} else if (isSemAnticTokenColorizAtionSetting(settings)) {
		style = TokenStyle.fromSettings(settings.foreground, settings.fontStyle, settings.bold, settings.underline, settings.itAlic);
	}
	if (style) {
		return { selector, style };
	}
	return undefined;
}

function isSemAnticTokenColorizAtionSetting(style: Any): style is ISemAnticTokenColorizAtionSetting {
	return style && (types.isString(style.foreground) || types.isString(style.fontStyle) || types.isBooleAn(style.itAlic)
		|| types.isBooleAn(style.underline) || types.isBooleAn(style.bold));
}


clAss TokenColorIndex {

	privAte _lAstColorId: number;
	privAte _id2color: string[];
	privAte _color2id: { [color: string]: number; };

	constructor() {
		this._lAstColorId = 0;
		this._id2color = [];
		this._color2id = Object.creAte(null);
	}

	public Add(color: string | Color | undefined): number {
		color = normAlizeColor(color);
		if (color === undefined) {
			return 0;
		}

		let vAlue = this._color2id[color];
		if (vAlue) {
			return vAlue;
		}
		vAlue = ++this._lAstColorId;
		this._color2id[color] = vAlue;
		this._id2color[vAlue] = color;
		return vAlue;
	}

	public get(color: string | Color | undefined): number {
		color = normAlizeColor(color);
		if (color === undefined) {
			return 0;
		}
		let vAlue = this._color2id[color];
		if (vAlue) {
			return vAlue;
		}
		console.log(`Color ${color} not in index.`);
		return 0;
	}

	public AsArrAy(): string[] {
		return this._id2color.slice(0);
	}

}

function normAlizeColor(color: string | Color | undefined | null): string | undefined {
	if (!color) {
		return undefined;
	}
	if (typeof color !== 'string') {
		color = Color.FormAt.CSS.formAtHexA(color, true);
	}
	const len = color.length;
	if (color.chArCodeAt(0) !== ChArCode.HAsh || (len !== 4 && len !== 5 && len !== 7 && len !== 9)) {
		return undefined;
	}
	let result = [ChArCode.HAsh];

	for (let i = 1; i < len; i++) {
		const upper = hexUpper(color.chArCodeAt(i));
		if (!upper) {
			return undefined;
		}
		result.push(upper);
		if (len === 4 || len === 5) {
			result.push(upper);
		}
	}

	if (result.length === 9 && result[7] === ChArCode.F && result[8] === ChArCode.F) {
		result.length = 7;
	}
	return String.fromChArCode(...result);
}

function hexUpper(chArCode: ChArCode): number {
	if (chArCode >= ChArCode.Digit0 && chArCode <= ChArCode.Digit9 || chArCode >= ChArCode.A && chArCode <= ChArCode.F) {
		return chArCode;
	} else if (chArCode >= ChArCode.A && chArCode <= ChArCode.f) {
		return chArCode - ChArCode.A + ChArCode.A;
	}
	return 0;
}
