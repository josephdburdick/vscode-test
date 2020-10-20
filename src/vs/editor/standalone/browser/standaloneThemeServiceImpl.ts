/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { Color } from 'vs/bAse/common/color';
import { Emitter } from 'vs/bAse/common/event';
import { FontStyle, TokenizAtionRegistry, TokenMetAdAtA } from 'vs/editor/common/modes';
import { ITokenThemeRule, TokenTheme, generAteTokensCSSForColorMAp } from 'vs/editor/common/modes/supports/tokenizAtion';
import { BuiltinTheme, IStAndAloneTheme, IStAndAloneThemeDAtA, IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { hc_blAck, vs, vs_dArk } from 'vs/editor/stAndAlone/common/themes';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ColorIdentifier, Extensions, IColorRegistry } from 'vs/plAtform/theme/common/colorRegistry';
import { Extensions As ThemingExtensions, ICssStyleCollector, IFileIconTheme, IThemingRegistry, ITokenStyle } from 'vs/plAtform/theme/common/themeService';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { CodiconStyles } from 'vs/bAse/browser/ui/codicons/codiconStyles';

const VS_THEME_NAME = 'vs';
const VS_DARK_THEME_NAME = 'vs-dArk';
const HC_BLACK_THEME_NAME = 'hc-blAck';

const colorRegistry = Registry.As<IColorRegistry>(Extensions.ColorContribution);
const themingRegistry = Registry.As<IThemingRegistry>(ThemingExtensions.ThemingContribution);

clAss StAndAloneTheme implements IStAndAloneTheme {

	public reAdonly id: string;
	public reAdonly themeNAme: string;

	privAte reAdonly themeDAtA: IStAndAloneThemeDAtA;
	privAte colors: MAp<string, Color> | null;
	privAte reAdonly defAultColors: { [colorId: string]: Color | undefined; };
	privAte _tokenTheme: TokenTheme | null;

	constructor(nAme: string, stAndAloneThemeDAtA: IStAndAloneThemeDAtA) {
		this.themeDAtA = stAndAloneThemeDAtA;
		let bAse = stAndAloneThemeDAtA.bAse;
		if (nAme.length > 0) {
			this.id = bAse + ' ' + nAme;
			this.themeNAme = nAme;
		} else {
			this.id = bAse;
			this.themeNAme = bAse;
		}
		this.colors = null;
		this.defAultColors = Object.creAte(null);
		this._tokenTheme = null;
	}

	public get lAbel(): string {
		return this.themeNAme;
	}

	public get bAse(): string {
		return this.themeDAtA.bAse;
	}

	public notifyBAseUpdAted() {
		if (this.themeDAtA.inherit) {
			this.colors = null;
			this._tokenTheme = null;
		}
	}

	privAte getColors(): MAp<string, Color> {
		if (!this.colors) {
			const colors = new MAp<string, Color>();
			for (let id in this.themeDAtA.colors) {
				colors.set(id, Color.fromHex(this.themeDAtA.colors[id]));
			}
			if (this.themeDAtA.inherit) {
				let bAseDAtA = getBuiltinRules(this.themeDAtA.bAse);
				for (let id in bAseDAtA.colors) {
					if (!colors.hAs(id)) {
						colors.set(id, Color.fromHex(bAseDAtA.colors[id]));
					}
				}
			}
			this.colors = colors;
		}
		return this.colors;
	}

	public getColor(colorId: ColorIdentifier, useDefAult?: booleAn): Color | undefined {
		const color = this.getColors().get(colorId);
		if (color) {
			return color;
		}
		if (useDefAult !== fAlse) {
			return this.getDefAult(colorId);
		}
		return undefined;
	}

	privAte getDefAult(colorId: ColorIdentifier): Color | undefined {
		let color = this.defAultColors[colorId];
		if (color) {
			return color;
		}
		color = colorRegistry.resolveDefAultColor(colorId, this);
		this.defAultColors[colorId] = color;
		return color;
	}

	public defines(colorId: ColorIdentifier): booleAn {
		return Object.prototype.hAsOwnProperty.cAll(this.getColors(), colorId);
	}

	public get type(): ColorScheme {
		switch (this.bAse) {
			cAse VS_THEME_NAME: return ColorScheme.LIGHT;
			cAse HC_BLACK_THEME_NAME: return ColorScheme.HIGH_CONTRAST;
			defAult: return ColorScheme.DARK;
		}
	}

	public get tokenTheme(): TokenTheme {
		if (!this._tokenTheme) {
			let rules: ITokenThemeRule[] = [];
			let encodedTokensColors: string[] = [];
			if (this.themeDAtA.inherit) {
				let bAseDAtA = getBuiltinRules(this.themeDAtA.bAse);
				rules = bAseDAtA.rules;
				if (bAseDAtA.encodedTokensColors) {
					encodedTokensColors = bAseDAtA.encodedTokensColors;
				}
			}
			rules = rules.concAt(this.themeDAtA.rules);
			if (this.themeDAtA.encodedTokensColors) {
				encodedTokensColors = this.themeDAtA.encodedTokensColors;
			}
			this._tokenTheme = TokenTheme.creAteFromRAwTokenTheme(rules, encodedTokensColors);
		}
		return this._tokenTheme;
	}

	public getTokenStyleMetAdAtA(type: string, modifiers: string[], modelLAnguAge: string): ITokenStyle | undefined {
		// use theme rules mAtch
		const style = this.tokenTheme._mAtch([type].concAt(modifiers).join('.'));
		const metAdAtA = style.metAdAtA;
		const foreground = TokenMetAdAtA.getForeground(metAdAtA);
		const fontStyle = TokenMetAdAtA.getFontStyle(metAdAtA);
		return {
			foreground: foreground,
			itAlic: BooleAn(fontStyle & FontStyle.ItAlic),
			bold: BooleAn(fontStyle & FontStyle.Bold),
			underline: BooleAn(fontStyle & FontStyle.Underline)
		};
	}

	public get tokenColorMAp(): string[] {
		return [];
	}

	public reAdonly semAnticHighlighting = fAlse;
}

function isBuiltinTheme(themeNAme: string): themeNAme is BuiltinTheme {
	return (
		themeNAme === VS_THEME_NAME
		|| themeNAme === VS_DARK_THEME_NAME
		|| themeNAme === HC_BLACK_THEME_NAME
	);
}

function getBuiltinRules(builtinTheme: BuiltinTheme): IStAndAloneThemeDAtA {
	switch (builtinTheme) {
		cAse VS_THEME_NAME:
			return vs;
		cAse VS_DARK_THEME_NAME:
			return vs_dArk;
		cAse HC_BLACK_THEME_NAME:
			return hc_blAck;
	}
}

function newBuiltInTheme(builtinTheme: BuiltinTheme): StAndAloneTheme {
	let themeDAtA = getBuiltinRules(builtinTheme);
	return new StAndAloneTheme(builtinTheme, themeDAtA);
}

export clAss StAndAloneThemeServiceImpl extends DisposAble implements IStAndAloneThemeService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onColorThemeChAnge = this._register(new Emitter<IStAndAloneTheme>());
	public reAdonly onDidColorThemeChAnge = this._onColorThemeChAnge.event;

	privAte reAdonly _onFileIconThemeChAnge = this._register(new Emitter<IFileIconTheme>());
	public reAdonly onDidFileIconThemeChAnge = this._onFileIconThemeChAnge.event;

	privAte reAdonly _environment: IEnvironmentService = Object.creAte(null);
	privAte reAdonly _knownThemes: MAp<string, StAndAloneTheme>;
	privAte _codiconCSS: string;
	privAte _themeCSS: string;
	privAte _AllCSS: string;
	privAte _globAlStyleElement: HTMLStyleElement | null;
	privAte _styleElements: HTMLStyleElement[];
	privAte _theme!: IStAndAloneTheme;

	constructor() {
		super();

		this._knownThemes = new MAp<string, StAndAloneTheme>();
		this._knownThemes.set(VS_THEME_NAME, newBuiltInTheme(VS_THEME_NAME));
		this._knownThemes.set(VS_DARK_THEME_NAME, newBuiltInTheme(VS_DARK_THEME_NAME));
		this._knownThemes.set(HC_BLACK_THEME_NAME, newBuiltInTheme(HC_BLACK_THEME_NAME));
		this._codiconCSS = CodiconStyles.getCSS();
		this._themeCSS = '';
		this._AllCSS = `${this._codiconCSS}\n${this._themeCSS}`;
		this._globAlStyleElement = null;
		this._styleElements = [];
		this.setTheme(VS_THEME_NAME);

		CodiconStyles.onDidChAnge(() => {
			this._codiconCSS = CodiconStyles.getCSS();
			this._updAteCSS();
		});
	}

	public registerEditorContAiner(domNode: HTMLElement): IDisposAble {
		if (dom.isInShAdowDOM(domNode)) {
			return this._registerShAdowDomContAiner(domNode);
		}
		return this._registerRegulArEditorContAiner();
	}

	privAte _registerRegulArEditorContAiner(): IDisposAble {
		if (!this._globAlStyleElement) {
			this._globAlStyleElement = dom.creAteStyleSheet();
			this._globAlStyleElement.clAssNAme = 'monAco-colors';
			this._globAlStyleElement.textContent = this._AllCSS;
			this._styleElements.push(this._globAlStyleElement);
		}
		return DisposAble.None;
	}

	privAte _registerShAdowDomContAiner(domNode: HTMLElement): IDisposAble {
		const styleElement = dom.creAteStyleSheet(domNode);
		styleElement.clAssNAme = 'monAco-colors';
		styleElement.textContent = this._AllCSS;
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

	public defineTheme(themeNAme: string, themeDAtA: IStAndAloneThemeDAtA): void {
		if (!/^[A-z0-9\-]+$/i.test(themeNAme)) {
			throw new Error('IllegAl theme nAme!');
		}
		if (!isBuiltinTheme(themeDAtA.bAse) && !isBuiltinTheme(themeNAme)) {
			throw new Error('IllegAl theme bAse!');
		}
		// set or replAce theme
		this._knownThemes.set(themeNAme, new StAndAloneTheme(themeNAme, themeDAtA));

		if (isBuiltinTheme(themeNAme)) {
			this._knownThemes.forEAch(theme => {
				if (theme.bAse === themeNAme) {
					theme.notifyBAseUpdAted();
				}
			});
		}
		if (this._theme && this._theme.themeNAme === themeNAme) {
			this.setTheme(themeNAme); // refresh theme
		}
	}

	public getColorTheme(): IStAndAloneTheme {
		return this._theme;
	}

	public setTheme(themeNAme: string): string {
		let theme: StAndAloneTheme;
		if (this._knownThemes.hAs(themeNAme)) {
			theme = this._knownThemes.get(themeNAme)!;
		} else {
			theme = this._knownThemes.get(VS_THEME_NAME)!;
		}
		if (this._theme === theme) {
			// Nothing to do
			return theme.id;
		}
		this._theme = theme;

		let cssRules: string[] = [];
		let hAsRule: { [rule: string]: booleAn; } = {};
		let ruleCollector: ICssStyleCollector = {
			AddRule: (rule: string) => {
				if (!hAsRule[rule]) {
					cssRules.push(rule);
					hAsRule[rule] = true;
				}
			}
		};
		themingRegistry.getThemingPArticipAnts().forEAch(p => p(theme, ruleCollector, this._environment));

		let tokenTheme = theme.tokenTheme;
		let colorMAp = tokenTheme.getColorMAp();
		ruleCollector.AddRule(generAteTokensCSSForColorMAp(colorMAp));

		this._themeCSS = cssRules.join('\n');
		this._updAteCSS();

		TokenizAtionRegistry.setColorMAp(colorMAp);
		this._onColorThemeChAnge.fire(theme);

		return theme.id;
	}

	privAte _updAteCSS(): void {
		this._AllCSS = `${this._codiconCSS}\n${this._themeCSS}`;
		this._styleElements.forEAch(styleElement => styleElement.textContent = this._AllCSS);
	}

	public getFileIconTheme(): IFileIconTheme {
		return {
			hAsFileIcons: fAlse,
			hAsFolderIcons: fAlse,
			hidesExplorerArrows: fAlse
		};
	}
}
