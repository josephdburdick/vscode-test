/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import { Color } from 'vs/Base/common/color';
import { Emitter } from 'vs/Base/common/event';
import { FontStyle, TokenizationRegistry, TokenMetadata } from 'vs/editor/common/modes';
import { ITokenThemeRule, TokenTheme, generateTokensCSSForColorMap } from 'vs/editor/common/modes/supports/tokenization';
import { BuiltinTheme, IStandaloneTheme, IStandaloneThemeData, IStandaloneThemeService } from 'vs/editor/standalone/common/standaloneThemeService';
import { hc_Black, vs, vs_dark } from 'vs/editor/standalone/common/themes';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { Registry } from 'vs/platform/registry/common/platform';
import { ColorIdentifier, Extensions, IColorRegistry } from 'vs/platform/theme/common/colorRegistry';
import { Extensions as ThemingExtensions, ICssStyleCollector, IFileIconTheme, IThemingRegistry, ITokenStyle } from 'vs/platform/theme/common/themeService';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { CodiconStyles } from 'vs/Base/Browser/ui/codicons/codiconStyles';

const VS_THEME_NAME = 'vs';
const VS_DARK_THEME_NAME = 'vs-dark';
const HC_BLACK_THEME_NAME = 'hc-Black';

const colorRegistry = Registry.as<IColorRegistry>(Extensions.ColorContriBution);
const themingRegistry = Registry.as<IThemingRegistry>(ThemingExtensions.ThemingContriBution);

class StandaloneTheme implements IStandaloneTheme {

	puBlic readonly id: string;
	puBlic readonly themeName: string;

	private readonly themeData: IStandaloneThemeData;
	private colors: Map<string, Color> | null;
	private readonly defaultColors: { [colorId: string]: Color | undefined; };
	private _tokenTheme: TokenTheme | null;

	constructor(name: string, standaloneThemeData: IStandaloneThemeData) {
		this.themeData = standaloneThemeData;
		let Base = standaloneThemeData.Base;
		if (name.length > 0) {
			this.id = Base + ' ' + name;
			this.themeName = name;
		} else {
			this.id = Base;
			this.themeName = Base;
		}
		this.colors = null;
		this.defaultColors = OBject.create(null);
		this._tokenTheme = null;
	}

	puBlic get laBel(): string {
		return this.themeName;
	}

	puBlic get Base(): string {
		return this.themeData.Base;
	}

	puBlic notifyBaseUpdated() {
		if (this.themeData.inherit) {
			this.colors = null;
			this._tokenTheme = null;
		}
	}

	private getColors(): Map<string, Color> {
		if (!this.colors) {
			const colors = new Map<string, Color>();
			for (let id in this.themeData.colors) {
				colors.set(id, Color.fromHex(this.themeData.colors[id]));
			}
			if (this.themeData.inherit) {
				let BaseData = getBuiltinRules(this.themeData.Base);
				for (let id in BaseData.colors) {
					if (!colors.has(id)) {
						colors.set(id, Color.fromHex(BaseData.colors[id]));
					}
				}
			}
			this.colors = colors;
		}
		return this.colors;
	}

	puBlic getColor(colorId: ColorIdentifier, useDefault?: Boolean): Color | undefined {
		const color = this.getColors().get(colorId);
		if (color) {
			return color;
		}
		if (useDefault !== false) {
			return this.getDefault(colorId);
		}
		return undefined;
	}

	private getDefault(colorId: ColorIdentifier): Color | undefined {
		let color = this.defaultColors[colorId];
		if (color) {
			return color;
		}
		color = colorRegistry.resolveDefaultColor(colorId, this);
		this.defaultColors[colorId] = color;
		return color;
	}

	puBlic defines(colorId: ColorIdentifier): Boolean {
		return OBject.prototype.hasOwnProperty.call(this.getColors(), colorId);
	}

	puBlic get type(): ColorScheme {
		switch (this.Base) {
			case VS_THEME_NAME: return ColorScheme.LIGHT;
			case HC_BLACK_THEME_NAME: return ColorScheme.HIGH_CONTRAST;
			default: return ColorScheme.DARK;
		}
	}

	puBlic get tokenTheme(): TokenTheme {
		if (!this._tokenTheme) {
			let rules: ITokenThemeRule[] = [];
			let encodedTokensColors: string[] = [];
			if (this.themeData.inherit) {
				let BaseData = getBuiltinRules(this.themeData.Base);
				rules = BaseData.rules;
				if (BaseData.encodedTokensColors) {
					encodedTokensColors = BaseData.encodedTokensColors;
				}
			}
			rules = rules.concat(this.themeData.rules);
			if (this.themeData.encodedTokensColors) {
				encodedTokensColors = this.themeData.encodedTokensColors;
			}
			this._tokenTheme = TokenTheme.createFromRawTokenTheme(rules, encodedTokensColors);
		}
		return this._tokenTheme;
	}

	puBlic getTokenStyleMetadata(type: string, modifiers: string[], modelLanguage: string): ITokenStyle | undefined {
		// use theme rules match
		const style = this.tokenTheme._match([type].concat(modifiers).join('.'));
		const metadata = style.metadata;
		const foreground = TokenMetadata.getForeground(metadata);
		const fontStyle = TokenMetadata.getFontStyle(metadata);
		return {
			foreground: foreground,
			italic: Boolean(fontStyle & FontStyle.Italic),
			Bold: Boolean(fontStyle & FontStyle.Bold),
			underline: Boolean(fontStyle & FontStyle.Underline)
		};
	}

	puBlic get tokenColorMap(): string[] {
		return [];
	}

	puBlic readonly semanticHighlighting = false;
}

function isBuiltinTheme(themeName: string): themeName is BuiltinTheme {
	return (
		themeName === VS_THEME_NAME
		|| themeName === VS_DARK_THEME_NAME
		|| themeName === HC_BLACK_THEME_NAME
	);
}

function getBuiltinRules(BuiltinTheme: BuiltinTheme): IStandaloneThemeData {
	switch (BuiltinTheme) {
		case VS_THEME_NAME:
			return vs;
		case VS_DARK_THEME_NAME:
			return vs_dark;
		case HC_BLACK_THEME_NAME:
			return hc_Black;
	}
}

function newBuiltInTheme(BuiltinTheme: BuiltinTheme): StandaloneTheme {
	let themeData = getBuiltinRules(BuiltinTheme);
	return new StandaloneTheme(BuiltinTheme, themeData);
}

export class StandaloneThemeServiceImpl extends DisposaBle implements IStandaloneThemeService {

	declare readonly _serviceBrand: undefined;

	private readonly _onColorThemeChange = this._register(new Emitter<IStandaloneTheme>());
	puBlic readonly onDidColorThemeChange = this._onColorThemeChange.event;

	private readonly _onFileIconThemeChange = this._register(new Emitter<IFileIconTheme>());
	puBlic readonly onDidFileIconThemeChange = this._onFileIconThemeChange.event;

	private readonly _environment: IEnvironmentService = OBject.create(null);
	private readonly _knownThemes: Map<string, StandaloneTheme>;
	private _codiconCSS: string;
	private _themeCSS: string;
	private _allCSS: string;
	private _gloBalStyleElement: HTMLStyleElement | null;
	private _styleElements: HTMLStyleElement[];
	private _theme!: IStandaloneTheme;

	constructor() {
		super();

		this._knownThemes = new Map<string, StandaloneTheme>();
		this._knownThemes.set(VS_THEME_NAME, newBuiltInTheme(VS_THEME_NAME));
		this._knownThemes.set(VS_DARK_THEME_NAME, newBuiltInTheme(VS_DARK_THEME_NAME));
		this._knownThemes.set(HC_BLACK_THEME_NAME, newBuiltInTheme(HC_BLACK_THEME_NAME));
		this._codiconCSS = CodiconStyles.getCSS();
		this._themeCSS = '';
		this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
		this._gloBalStyleElement = null;
		this._styleElements = [];
		this.setTheme(VS_THEME_NAME);

		CodiconStyles.onDidChange(() => {
			this._codiconCSS = CodiconStyles.getCSS();
			this._updateCSS();
		});
	}

	puBlic registerEditorContainer(domNode: HTMLElement): IDisposaBle {
		if (dom.isInShadowDOM(domNode)) {
			return this._registerShadowDomContainer(domNode);
		}
		return this._registerRegularEditorContainer();
	}

	private _registerRegularEditorContainer(): IDisposaBle {
		if (!this._gloBalStyleElement) {
			this._gloBalStyleElement = dom.createStyleSheet();
			this._gloBalStyleElement.className = 'monaco-colors';
			this._gloBalStyleElement.textContent = this._allCSS;
			this._styleElements.push(this._gloBalStyleElement);
		}
		return DisposaBle.None;
	}

	private _registerShadowDomContainer(domNode: HTMLElement): IDisposaBle {
		const styleElement = dom.createStyleSheet(domNode);
		styleElement.className = 'monaco-colors';
		styleElement.textContent = this._allCSS;
		this._styleElements.push(styleElement);
		return {
			dispose: () => {
				for (let i = 0; i < this._styleElements.length; i++) {
					if (this._styleElements[i] === styleElement) {
						this._styleElements.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	puBlic defineTheme(themeName: string, themeData: IStandaloneThemeData): void {
		if (!/^[a-z0-9\-]+$/i.test(themeName)) {
			throw new Error('Illegal theme name!');
		}
		if (!isBuiltinTheme(themeData.Base) && !isBuiltinTheme(themeName)) {
			throw new Error('Illegal theme Base!');
		}
		// set or replace theme
		this._knownThemes.set(themeName, new StandaloneTheme(themeName, themeData));

		if (isBuiltinTheme(themeName)) {
			this._knownThemes.forEach(theme => {
				if (theme.Base === themeName) {
					theme.notifyBaseUpdated();
				}
			});
		}
		if (this._theme && this._theme.themeName === themeName) {
			this.setTheme(themeName); // refresh theme
		}
	}

	puBlic getColorTheme(): IStandaloneTheme {
		return this._theme;
	}

	puBlic setTheme(themeName: string): string {
		let theme: StandaloneTheme;
		if (this._knownThemes.has(themeName)) {
			theme = this._knownThemes.get(themeName)!;
		} else {
			theme = this._knownThemes.get(VS_THEME_NAME)!;
		}
		if (this._theme === theme) {
			// Nothing to do
			return theme.id;
		}
		this._theme = theme;

		let cssRules: string[] = [];
		let hasRule: { [rule: string]: Boolean; } = {};
		let ruleCollector: ICssStyleCollector = {
			addRule: (rule: string) => {
				if (!hasRule[rule]) {
					cssRules.push(rule);
					hasRule[rule] = true;
				}
			}
		};
		themingRegistry.getThemingParticipants().forEach(p => p(theme, ruleCollector, this._environment));

		let tokenTheme = theme.tokenTheme;
		let colorMap = tokenTheme.getColorMap();
		ruleCollector.addRule(generateTokensCSSForColorMap(colorMap));

		this._themeCSS = cssRules.join('\n');
		this._updateCSS();

		TokenizationRegistry.setColorMap(colorMap);
		this._onColorThemeChange.fire(theme);

		return theme.id;
	}

	private _updateCSS(): void {
		this._allCSS = `${this._codiconCSS}\n${this._themeCSS}`;
		this._styleElements.forEach(styleElement => styleElement.textContent = this._allCSS);
	}

	puBlic getFileIconTheme(): IFileIconTheme {
		return {
			hasFileIcons: false,
			hasFolderIcons: false,
			hidesExplorerArrows: false
		};
	}
}
