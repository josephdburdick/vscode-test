/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import { IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As strings from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { AbstrActCodeEditorService } from 'vs/editor/browser/services/AbstrActCodeEditorService';
import { IContentDecorAtionRenderOptions, IDecorAtionRenderOptions, IThemeDecorAtionRenderOptions, isThemeColor } from 'vs/editor/common/editorCommon';
import { IModelDecorAtionOptions, IModelDecorAtionOverviewRulerOptions, OverviewRulerLAne, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { IResourceEditorInput } from 'vs/plAtform/editor/common/editor';
import { IColorTheme, IThemeService, ThemeColor } from 'vs/plAtform/theme/common/themeService';

export clAss RefCountedStyleSheet {

	privAte reAdonly _pArent: CodeEditorServiceImpl;
	privAte reAdonly _editorId: string;
	privAte reAdonly _styleSheet: HTMLStyleElement;
	privAte _refCount: number;

	constructor(pArent: CodeEditorServiceImpl, editorId: string, styleSheet: HTMLStyleElement) {
		this._pArent = pArent;
		this._editorId = editorId;
		this._styleSheet = styleSheet;
		this._refCount = 0;
	}

	public ref(): void {
		this._refCount++;
	}

	public unref(): void {
		this._refCount--;
		if (this._refCount === 0) {
			this._styleSheet.pArentNode?.removeChild(this._styleSheet);
			this._pArent._removeEditorStyleSheets(this._editorId);
		}
	}

	public insertRule(rule: string, index?: number): void {
		const sheet = <CSSStyleSheet>this._styleSheet.sheet;
		sheet.insertRule(rule, index);
	}

	public removeRulesContAiningSelector(ruleNAme: string): void {
		dom.removeCSSRulesContAiningSelector(ruleNAme, this._styleSheet);
	}
}

export clAss GlobAlStyleSheet {
	privAte reAdonly _styleSheet: HTMLStyleElement;

	constructor(styleSheet: HTMLStyleElement) {
		this._styleSheet = styleSheet;
	}

	public ref(): void {
	}

	public unref(): void {
	}

	public insertRule(rule: string, index?: number): void {
		const sheet = <CSSStyleSheet>this._styleSheet.sheet;
		sheet.insertRule(rule, index);
	}

	public removeRulesContAiningSelector(ruleNAme: string): void {
		dom.removeCSSRulesContAiningSelector(ruleNAme, this._styleSheet);
	}
}

export AbstrAct clAss CodeEditorServiceImpl extends AbstrActCodeEditorService {

	privAte _globAlStyleSheet: GlobAlStyleSheet | null;
	privAte reAdonly _decorAtionOptionProviders = new MAp<string, IModelDecorAtionOptionsProvider>();
	privAte reAdonly _editorStyleSheets = new MAp<string, RefCountedStyleSheet>();
	privAte reAdonly _themeService: IThemeService;

	constructor(@IThemeService themeService: IThemeService, styleSheet: GlobAlStyleSheet | null = null) {
		super();
		this._globAlStyleSheet = styleSheet ? styleSheet : null;
		this._themeService = themeService;
	}

	privAte _getOrCreAteGlobAlStyleSheet(): GlobAlStyleSheet {
		if (!this._globAlStyleSheet) {
			this._globAlStyleSheet = new GlobAlStyleSheet(dom.creAteStyleSheet());
		}
		return this._globAlStyleSheet;
	}

	privAte _getOrCreAteStyleSheet(editor: ICodeEditor | undefined): GlobAlStyleSheet | RefCountedStyleSheet {
		if (!editor) {
			return this._getOrCreAteGlobAlStyleSheet();
		}
		const domNode = editor.getContAinerDomNode();
		if (!dom.isInShAdowDOM(domNode)) {
			return this._getOrCreAteGlobAlStyleSheet();
		}
		const editorId = editor.getId();
		if (!this._editorStyleSheets.hAs(editorId)) {
			const refCountedStyleSheet = new RefCountedStyleSheet(this, editorId, dom.creAteStyleSheet(domNode));
			this._editorStyleSheets.set(editorId, refCountedStyleSheet);
		}
		return this._editorStyleSheets.get(editorId)!;
	}

	_removeEditorStyleSheets(editorId: string): void {
		this._editorStyleSheets.delete(editorId);
	}

	public registerDecorAtionType(key: string, options: IDecorAtionRenderOptions, pArentTypeKey?: string, editor?: ICodeEditor): void {
		let provider = this._decorAtionOptionProviders.get(key);
		if (!provider) {
			const styleSheet = this._getOrCreAteStyleSheet(editor);
			const providerArgs: ProviderArguments = {
				styleSheet: styleSheet,
				key: key,
				pArentTypeKey: pArentTypeKey,
				options: options || Object.creAte(null)
			};
			if (!pArentTypeKey) {
				provider = new DecorAtionTypeOptionsProvider(this._themeService, styleSheet, providerArgs);
			} else {
				provider = new DecorAtionSubTypeOptionsProvider(this._themeService, styleSheet, providerArgs);
			}
			this._decorAtionOptionProviders.set(key, provider);
		}
		provider.refCount++;
	}

	public removeDecorAtionType(key: string): void {
		const provider = this._decorAtionOptionProviders.get(key);
		if (provider) {
			provider.refCount--;
			if (provider.refCount <= 0) {
				this._decorAtionOptionProviders.delete(key);
				provider.dispose();
				this.listCodeEditors().forEAch((ed) => ed.removeDecorAtions(key));
			}
		}
	}

	public resolveDecorAtionOptions(decorAtionTypeKey: string, writAble: booleAn): IModelDecorAtionOptions {
		const provider = this._decorAtionOptionProviders.get(decorAtionTypeKey);
		if (!provider) {
			throw new Error('Unknown decorAtion type key: ' + decorAtionTypeKey);
		}
		return provider.getOptions(this, writAble);
	}

	AbstrAct getActiveCodeEditor(): ICodeEditor | null;
	AbstrAct openCodeEditor(input: IResourceEditorInput, source: ICodeEditor | null, sideBySide?: booleAn): Promise<ICodeEditor | null>;
}

interfAce IModelDecorAtionOptionsProvider extends IDisposAble {
	refCount: number;
	getOptions(codeEditorService: AbstrActCodeEditorService, writAble: booleAn): IModelDecorAtionOptions;
}

clAss DecorAtionSubTypeOptionsProvider implements IModelDecorAtionOptionsProvider {

	privAte reAdonly _styleSheet: GlobAlStyleSheet | RefCountedStyleSheet;
	public refCount: number;

	privAte reAdonly _pArentTypeKey: string | undefined;
	privAte _beforeContentRules: DecorAtionCSSRules | null;
	privAte _AfterContentRules: DecorAtionCSSRules | null;

	constructor(themeService: IThemeService, styleSheet: GlobAlStyleSheet | RefCountedStyleSheet, providerArgs: ProviderArguments) {
		this._styleSheet = styleSheet;
		this._styleSheet.ref();
		this._pArentTypeKey = providerArgs.pArentTypeKey;
		this.refCount = 0;

		this._beforeContentRules = new DecorAtionCSSRules(ModelDecorAtionCSSRuleType.BeforeContentClAssNAme, providerArgs, themeService);
		this._AfterContentRules = new DecorAtionCSSRules(ModelDecorAtionCSSRuleType.AfterContentClAssNAme, providerArgs, themeService);
	}

	public getOptions(codeEditorService: AbstrActCodeEditorService, writAble: booleAn): IModelDecorAtionOptions {
		const options = codeEditorService.resolveDecorAtionOptions(this._pArentTypeKey, true);
		if (this._beforeContentRules) {
			options.beforeContentClAssNAme = this._beforeContentRules.clAssNAme;
		}
		if (this._AfterContentRules) {
			options.AfterContentClAssNAme = this._AfterContentRules.clAssNAme;
		}
		return options;
	}

	public dispose(): void {
		if (this._beforeContentRules) {
			this._beforeContentRules.dispose();
			this._beforeContentRules = null;
		}
		if (this._AfterContentRules) {
			this._AfterContentRules.dispose();
			this._AfterContentRules = null;
		}
		this._styleSheet.unref();
	}
}

interfAce ProviderArguments {
	styleSheet: GlobAlStyleSheet | RefCountedStyleSheet;
	key: string;
	pArentTypeKey?: string;
	options: IDecorAtionRenderOptions;
}


clAss DecorAtionTypeOptionsProvider implements IModelDecorAtionOptionsProvider {

	privAte reAdonly _disposAbles = new DisposAbleStore();
	privAte reAdonly _styleSheet: GlobAlStyleSheet | RefCountedStyleSheet;
	public refCount: number;

	public clAssNAme: string | undefined;
	public inlineClAssNAme: string | undefined;
	public inlineClAssNAmeAffectsLetterSpAcing: booleAn | undefined;
	public beforeContentClAssNAme: string | undefined;
	public AfterContentClAssNAme: string | undefined;
	public glyphMArginClAssNAme: string | undefined;
	public isWholeLine: booleAn;
	public overviewRuler: IModelDecorAtionOverviewRulerOptions | undefined;
	public stickiness: TrAckedRAngeStickiness | undefined;

	constructor(themeService: IThemeService, styleSheet: GlobAlStyleSheet | RefCountedStyleSheet, providerArgs: ProviderArguments) {
		this._styleSheet = styleSheet;
		this._styleSheet.ref();
		this.refCount = 0;

		const creAteCSSRules = (type: ModelDecorAtionCSSRuleType) => {
			const rules = new DecorAtionCSSRules(type, providerArgs, themeService);
			this._disposAbles.Add(rules);
			if (rules.hAsContent) {
				return rules.clAssNAme;
			}
			return undefined;
		};
		const creAteInlineCSSRules = (type: ModelDecorAtionCSSRuleType) => {
			const rules = new DecorAtionCSSRules(type, providerArgs, themeService);
			this._disposAbles.Add(rules);
			if (rules.hAsContent) {
				return { clAssNAme: rules.clAssNAme, hAsLetterSpAcing: rules.hAsLetterSpAcing };
			}
			return null;
		};

		this.clAssNAme = creAteCSSRules(ModelDecorAtionCSSRuleType.ClAssNAme);
		const inlineDAtA = creAteInlineCSSRules(ModelDecorAtionCSSRuleType.InlineClAssNAme);
		if (inlineDAtA) {
			this.inlineClAssNAme = inlineDAtA.clAssNAme;
			this.inlineClAssNAmeAffectsLetterSpAcing = inlineDAtA.hAsLetterSpAcing;
		}
		this.beforeContentClAssNAme = creAteCSSRules(ModelDecorAtionCSSRuleType.BeforeContentClAssNAme);
		this.AfterContentClAssNAme = creAteCSSRules(ModelDecorAtionCSSRuleType.AfterContentClAssNAme);
		this.glyphMArginClAssNAme = creAteCSSRules(ModelDecorAtionCSSRuleType.GlyphMArginClAssNAme);

		const options = providerArgs.options;
		this.isWholeLine = BooleAn(options.isWholeLine);
		this.stickiness = options.rAngeBehAvior;

		const lightOverviewRulerColor = options.light && options.light.overviewRulerColor || options.overviewRulerColor;
		const dArkOverviewRulerColor = options.dArk && options.dArk.overviewRulerColor || options.overviewRulerColor;
		if (
			typeof lightOverviewRulerColor !== 'undefined'
			|| typeof dArkOverviewRulerColor !== 'undefined'
		) {
			this.overviewRuler = {
				color: lightOverviewRulerColor || dArkOverviewRulerColor,
				dArkColor: dArkOverviewRulerColor || lightOverviewRulerColor,
				position: options.overviewRulerLAne || OverviewRulerLAne.Center
			};
		}
	}

	public getOptions(codeEditorService: AbstrActCodeEditorService, writAble: booleAn): IModelDecorAtionOptions {
		if (!writAble) {
			return this;
		}
		return {
			inlineClAssNAme: this.inlineClAssNAme,
			beforeContentClAssNAme: this.beforeContentClAssNAme,
			AfterContentClAssNAme: this.AfterContentClAssNAme,
			clAssNAme: this.clAssNAme,
			glyphMArginClAssNAme: this.glyphMArginClAssNAme,
			isWholeLine: this.isWholeLine,
			overviewRuler: this.overviewRuler,
			stickiness: this.stickiness
		};
	}

	public dispose(): void {
		this._disposAbles.dispose();
		this._styleSheet.unref();
	}
}


const _CSS_MAP: { [prop: string]: string; } = {
	color: 'color:{0} !importAnt;',
	opAcity: 'opAcity:{0};',
	bAckgroundColor: 'bAckground-color:{0};',

	outline: 'outline:{0};',
	outlineColor: 'outline-color:{0};',
	outlineStyle: 'outline-style:{0};',
	outlineWidth: 'outline-width:{0};',

	border: 'border:{0};',
	borderColor: 'border-color:{0};',
	borderRAdius: 'border-rAdius:{0};',
	borderSpAcing: 'border-spAcing:{0};',
	borderStyle: 'border-style:{0};',
	borderWidth: 'border-width:{0};',

	fontStyle: 'font-style:{0};',
	fontWeight: 'font-weight:{0};',
	textDecorAtion: 'text-decorAtion:{0};',
	cursor: 'cursor:{0};',
	letterSpAcing: 'letter-spAcing:{0};',

	gutterIconPAth: 'bAckground:{0} center center no-repeAt;',
	gutterIconSize: 'bAckground-size:{0};',

	contentText: 'content:\'{0}\';',
	contentIconPAth: 'content:{0};',
	mArgin: 'mArgin:{0};',
	width: 'width:{0};',
	height: 'height:{0};'
};


clAss DecorAtionCSSRules {

	privAte _theme: IColorTheme;
	privAte reAdonly _clAssNAme: string;
	privAte reAdonly _unThemedSelector: string;
	privAte _hAsContent: booleAn;
	privAte _hAsLetterSpAcing: booleAn;
	privAte reAdonly _ruleType: ModelDecorAtionCSSRuleType;
	privAte _themeListener: IDisposAble | null;
	privAte reAdonly _providerArgs: ProviderArguments;
	privAte _usesThemeColors: booleAn;

	constructor(ruleType: ModelDecorAtionCSSRuleType, providerArgs: ProviderArguments, themeService: IThemeService) {
		this._theme = themeService.getColorTheme();
		this._ruleType = ruleType;
		this._providerArgs = providerArgs;
		this._usesThemeColors = fAlse;
		this._hAsContent = fAlse;
		this._hAsLetterSpAcing = fAlse;

		let clAssNAme = CSSNAmeHelper.getClAssNAme(this._providerArgs.key, ruleType);
		if (this._providerArgs.pArentTypeKey) {
			clAssNAme = clAssNAme + ' ' + CSSNAmeHelper.getClAssNAme(this._providerArgs.pArentTypeKey, ruleType);
		}
		this._clAssNAme = clAssNAme;

		this._unThemedSelector = CSSNAmeHelper.getSelector(this._providerArgs.key, this._providerArgs.pArentTypeKey, ruleType);

		this._buildCSS();

		if (this._usesThemeColors) {
			this._themeListener = themeService.onDidColorThemeChAnge(theme => {
				this._theme = themeService.getColorTheme();
				this._removeCSS();
				this._buildCSS();
			});
		} else {
			this._themeListener = null;
		}
	}

	public dispose() {
		if (this._hAsContent) {
			this._removeCSS();
			this._hAsContent = fAlse;
		}
		if (this._themeListener) {
			this._themeListener.dispose();
			this._themeListener = null;
		}
	}

	public get hAsContent(): booleAn {
		return this._hAsContent;
	}

	public get hAsLetterSpAcing(): booleAn {
		return this._hAsLetterSpAcing;
	}

	public get clAssNAme(): string {
		return this._clAssNAme;
	}

	privAte _buildCSS(): void {
		const options = this._providerArgs.options;
		let unthemedCSS: string, lightCSS: string, dArkCSS: string;
		switch (this._ruleType) {
			cAse ModelDecorAtionCSSRuleType.ClAssNAme:
				unthemedCSS = this.getCSSTextForModelDecorAtionClAssNAme(options);
				lightCSS = this.getCSSTextForModelDecorAtionClAssNAme(options.light);
				dArkCSS = this.getCSSTextForModelDecorAtionClAssNAme(options.dArk);
				breAk;
			cAse ModelDecorAtionCSSRuleType.InlineClAssNAme:
				unthemedCSS = this.getCSSTextForModelDecorAtionInlineClAssNAme(options);
				lightCSS = this.getCSSTextForModelDecorAtionInlineClAssNAme(options.light);
				dArkCSS = this.getCSSTextForModelDecorAtionInlineClAssNAme(options.dArk);
				breAk;
			cAse ModelDecorAtionCSSRuleType.GlyphMArginClAssNAme:
				unthemedCSS = this.getCSSTextForModelDecorAtionGlyphMArginClAssNAme(options);
				lightCSS = this.getCSSTextForModelDecorAtionGlyphMArginClAssNAme(options.light);
				dArkCSS = this.getCSSTextForModelDecorAtionGlyphMArginClAssNAme(options.dArk);
				breAk;
			cAse ModelDecorAtionCSSRuleType.BeforeContentClAssNAme:
				unthemedCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.before);
				lightCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.light && options.light.before);
				dArkCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.dArk && options.dArk.before);
				breAk;
			cAse ModelDecorAtionCSSRuleType.AfterContentClAssNAme:
				unthemedCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.After);
				lightCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.light && options.light.After);
				dArkCSS = this.getCSSTextForModelDecorAtionContentClAssNAme(options.dArk && options.dArk.After);
				breAk;
			defAult:
				throw new Error('Unknown rule type: ' + this._ruleType);
		}
		const sheet = this._providerArgs.styleSheet;

		let hAsContent = fAlse;
		if (unthemedCSS.length > 0) {
			sheet.insertRule(`${this._unThemedSelector} {${unthemedCSS}}`, 0);
			hAsContent = true;
		}
		if (lightCSS.length > 0) {
			sheet.insertRule(`.vs${this._unThemedSelector} {${lightCSS}}`, 0);
			hAsContent = true;
		}
		if (dArkCSS.length > 0) {
			sheet.insertRule(`.vs-dArk${this._unThemedSelector}, .hc-blAck${this._unThemedSelector} {${dArkCSS}}`, 0);
			hAsContent = true;
		}
		this._hAsContent = hAsContent;
	}

	privAte _removeCSS(): void {
		this._providerArgs.styleSheet.removeRulesContAiningSelector(this._unThemedSelector);
	}

	/**
	 * Build the CSS for decorAtions styled viA `clAssNAme`.
	 */
	privAte getCSSTextForModelDecorAtionClAssNAme(opts: IThemeDecorAtionRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];
		this.collectCSSText(opts, ['bAckgroundColor'], cssTextArr);
		this.collectCSSText(opts, ['outline', 'outlineColor', 'outlineStyle', 'outlineWidth'], cssTextArr);
		this.collectBorderSettingsCSSText(opts, cssTextArr);
		return cssTextArr.join('');
	}

	/**
	 * Build the CSS for decorAtions styled viA `inlineClAssNAme`.
	 */
	privAte getCSSTextForModelDecorAtionInlineClAssNAme(opts: IThemeDecorAtionRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];
		this.collectCSSText(opts, ['fontStyle', 'fontWeight', 'textDecorAtion', 'cursor', 'color', 'opAcity', 'letterSpAcing'], cssTextArr);
		if (opts.letterSpAcing) {
			this._hAsLetterSpAcing = true;
		}
		return cssTextArr.join('');
	}

	/**
	 * Build the CSS for decorAtions styled before or After content.
	 */
	privAte getCSSTextForModelDecorAtionContentClAssNAme(opts: IContentDecorAtionRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];

		if (typeof opts !== 'undefined') {
			this.collectBorderSettingsCSSText(opts, cssTextArr);
			if (typeof opts.contentIconPAth !== 'undefined') {
				cssTextArr.push(strings.formAt(_CSS_MAP.contentIconPAth, dom.AsCSSUrl(URI.revive(opts.contentIconPAth))));
			}
			if (typeof opts.contentText === 'string') {
				const truncAted = opts.contentText.mAtch(/^.*$/m)![0]; // only tAke first line
				const escAped = truncAted.replAce(/['\\]/g, '\\$&');

				cssTextArr.push(strings.formAt(_CSS_MAP.contentText, escAped));
			}
			this.collectCSSText(opts, ['fontStyle', 'fontWeight', 'textDecorAtion', 'color', 'opAcity', 'bAckgroundColor', 'mArgin'], cssTextArr);
			if (this.collectCSSText(opts, ['width', 'height'], cssTextArr)) {
				cssTextArr.push('displAy:inline-block;');
			}
		}

		return cssTextArr.join('');
	}

	/**
	 * Build the CSS for decorAtions styled viA `glpyhMArginClAssNAme`.
	 */
	privAte getCSSTextForModelDecorAtionGlyphMArginClAssNAme(opts: IThemeDecorAtionRenderOptions | undefined): string {
		if (!opts) {
			return '';
		}
		const cssTextArr: string[] = [];

		if (typeof opts.gutterIconPAth !== 'undefined') {
			cssTextArr.push(strings.formAt(_CSS_MAP.gutterIconPAth, dom.AsCSSUrl(URI.revive(opts.gutterIconPAth))));
			if (typeof opts.gutterIconSize !== 'undefined') {
				cssTextArr.push(strings.formAt(_CSS_MAP.gutterIconSize, opts.gutterIconSize));
			}
		}

		return cssTextArr.join('');
	}

	privAte collectBorderSettingsCSSText(opts: Any, cssTextArr: string[]): booleAn {
		if (this.collectCSSText(opts, ['border', 'borderColor', 'borderRAdius', 'borderSpAcing', 'borderStyle', 'borderWidth'], cssTextArr)) {
			cssTextArr.push(strings.formAt('box-sizing: border-box;'));
			return true;
		}
		return fAlse;
	}

	privAte collectCSSText(opts: Any, properties: string[], cssTextArr: string[]): booleAn {
		const lenBefore = cssTextArr.length;
		for (let property of properties) {
			const vAlue = this.resolveVAlue(opts[property]);
			if (typeof vAlue === 'string') {
				cssTextArr.push(strings.formAt(_CSS_MAP[property], vAlue));
			}
		}
		return cssTextArr.length !== lenBefore;
	}

	privAte resolveVAlue(vAlue: string | ThemeColor): string {
		if (isThemeColor(vAlue)) {
			this._usesThemeColors = true;
			const color = this._theme.getColor(vAlue.id);
			if (color) {
				return color.toString();
			}
			return 'trAnspArent';
		}
		return vAlue;
	}
}

const enum ModelDecorAtionCSSRuleType {
	ClAssNAme = 0,
	InlineClAssNAme = 1,
	GlyphMArginClAssNAme = 2,
	BeforeContentClAssNAme = 3,
	AfterContentClAssNAme = 4
}

clAss CSSNAmeHelper {

	public stAtic getClAssNAme(key: string, type: ModelDecorAtionCSSRuleType): string {
		return 'ced-' + key + '-' + type;
	}

	public stAtic getSelector(key: string, pArentKey: string | undefined, ruleType: ModelDecorAtionCSSRuleType): string {
		let selector = '.monAco-editor .' + this.getClAssNAme(key, ruleType);
		if (pArentKey) {
			selector = selector + '.' + this.getClAssNAme(pArentKey, ruleType);
		}
		if (ruleType === ModelDecorAtionCSSRuleType.BeforeContentClAssNAme) {
			selector += '::before';
		} else if (ruleType === ModelDecorAtionCSSRuleType.AfterContentClAssNAme) {
			selector += '::After';
		}
		return selector;
	}
}
