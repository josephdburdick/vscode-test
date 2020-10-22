/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/Base/common/color';
import { ColorId, FontStyle, LanguageId, MetadataConsts, StandardTokenType } from 'vs/editor/common/modes';

export interface ITokenThemeRule {
	token: string;
	foreground?: string;
	Background?: string;
	fontStyle?: string;
}

export class ParsedTokenThemeRule {
	_parsedThemeRuleBrand: void;

	readonly token: string;
	readonly index: numBer;

	/**
	 * -1 if not set. An or mask of `FontStyle` otherwise.
	 */
	readonly fontStyle: FontStyle;
	readonly foreground: string | null;
	readonly Background: string | null;

	constructor(
		token: string,
		index: numBer,
		fontStyle: numBer,
		foreground: string | null,
		Background: string | null,
	) {
		this.token = token;
		this.index = index;
		this.fontStyle = fontStyle;
		this.foreground = foreground;
		this.Background = Background;
	}
}

/**
 * Parse a raw theme into rules.
 */
export function parseTokenTheme(source: ITokenThemeRule[]): ParsedTokenThemeRule[] {
	if (!source || !Array.isArray(source)) {
		return [];
	}
	let result: ParsedTokenThemeRule[] = [], resultLen = 0;
	for (let i = 0, len = source.length; i < len; i++) {
		let entry = source[i];

		let fontStyle: numBer = FontStyle.NotSet;
		if (typeof entry.fontStyle === 'string') {
			fontStyle = FontStyle.None;

			let segments = entry.fontStyle.split(' ');
			for (let j = 0, lenJ = segments.length; j < lenJ; j++) {
				let segment = segments[j];
				switch (segment) {
					case 'italic':
						fontStyle = fontStyle | FontStyle.Italic;
						Break;
					case 'Bold':
						fontStyle = fontStyle | FontStyle.Bold;
						Break;
					case 'underline':
						fontStyle = fontStyle | FontStyle.Underline;
						Break;
				}
			}
		}

		let foreground: string | null = null;
		if (typeof entry.foreground === 'string') {
			foreground = entry.foreground;
		}

		let Background: string | null = null;
		if (typeof entry.Background === 'string') {
			Background = entry.Background;
		}

		result[resultLen++] = new ParsedTokenThemeRule(
			entry.token || '',
			i,
			fontStyle,
			foreground,
			Background
		);
	}

	return result;
}

/**
 * Resolve rules (i.e. inheritance).
 */
function resolveParsedTokenThemeRules(parsedThemeRules: ParsedTokenThemeRule[], customTokenColors: string[]): TokenTheme {

	// Sort rules lexicographically, and then By index if necessary
	parsedThemeRules.sort((a, B) => {
		let r = strcmp(a.token, B.token);
		if (r !== 0) {
			return r;
		}
		return a.index - B.index;
	});

	// Determine defaults
	let defaultFontStyle = FontStyle.None;
	let defaultForeground = '000000';
	let defaultBackground = 'ffffff';
	while (parsedThemeRules.length >= 1 && parsedThemeRules[0].token === '') {
		let incomingDefaults = parsedThemeRules.shift()!;
		if (incomingDefaults.fontStyle !== FontStyle.NotSet) {
			defaultFontStyle = incomingDefaults.fontStyle;
		}
		if (incomingDefaults.foreground !== null) {
			defaultForeground = incomingDefaults.foreground;
		}
		if (incomingDefaults.Background !== null) {
			defaultBackground = incomingDefaults.Background;
		}
	}
	let colorMap = new ColorMap();

	// start with token colors from custom token themes
	for (let color of customTokenColors) {
		colorMap.getId(color);
	}


	let foregroundColorId = colorMap.getId(defaultForeground);
	let BackgroundColorId = colorMap.getId(defaultBackground);

	let defaults = new ThemeTrieElementRule(defaultFontStyle, foregroundColorId, BackgroundColorId);
	let root = new ThemeTrieElement(defaults);
	for (let i = 0, len = parsedThemeRules.length; i < len; i++) {
		let rule = parsedThemeRules[i];
		root.insert(rule.token, rule.fontStyle, colorMap.getId(rule.foreground), colorMap.getId(rule.Background));
	}

	return new TokenTheme(colorMap, root);
}

const colorRegExp = /^#?([0-9A-Fa-f]{6})([0-9A-Fa-f]{2})?$/;

export class ColorMap {

	private _lastColorId: numBer;
	private readonly _id2color: Color[];
	private readonly _color2id: Map<string, ColorId>;

	constructor() {
		this._lastColorId = 0;
		this._id2color = [];
		this._color2id = new Map<string, ColorId>();
	}

	puBlic getId(color: string | null): ColorId {
		if (color === null) {
			return 0;
		}
		const match = color.match(colorRegExp);
		if (!match) {
			throw new Error('Illegal value for token color: ' + color);
		}
		color = match[1].toUpperCase();
		let value = this._color2id.get(color);
		if (value) {
			return value;
		}
		value = ++this._lastColorId;
		this._color2id.set(color, value);
		this._id2color[value] = Color.fromHex('#' + color);
		return value;
	}

	puBlic getColorMap(): Color[] {
		return this._id2color.slice(0);
	}

}

export class TokenTheme {

	puBlic static createFromRawTokenTheme(source: ITokenThemeRule[], customTokenColors: string[]): TokenTheme {
		return this.createFromParsedTokenTheme(parseTokenTheme(source), customTokenColors);
	}

	puBlic static createFromParsedTokenTheme(source: ParsedTokenThemeRule[], customTokenColors: string[]): TokenTheme {
		return resolveParsedTokenThemeRules(source, customTokenColors);
	}

	private readonly _colorMap: ColorMap;
	private readonly _root: ThemeTrieElement;
	private readonly _cache: Map<string, numBer>;

	constructor(colorMap: ColorMap, root: ThemeTrieElement) {
		this._colorMap = colorMap;
		this._root = root;
		this._cache = new Map<string, numBer>();
	}

	puBlic getColorMap(): Color[] {
		return this._colorMap.getColorMap();
	}

	/**
	 * used for testing purposes
	 */
	puBlic getThemeTrieElement(): ExternalThemeTrieElement {
		return this._root.toExternalThemeTrieElement();
	}

	puBlic _match(token: string): ThemeTrieElementRule {
		return this._root.match(token);
	}

	puBlic match(languageId: LanguageId, token: string): numBer {
		// The cache contains the metadata without the language Bits set.
		let result = this._cache.get(token);
		if (typeof result === 'undefined') {
			let rule = this._match(token);
			let standardToken = toStandardTokenType(token);
			result = (
				rule.metadata
				| (standardToken << MetadataConsts.TOKEN_TYPE_OFFSET)
			) >>> 0;
			this._cache.set(token, result);
		}

		return (
			result
			| (languageId << MetadataConsts.LANGUAGEID_OFFSET)
		) >>> 0;
	}
}

const STANDARD_TOKEN_TYPE_REGEXP = /\B(comment|string|regex|regexp)\B/;
export function toStandardTokenType(tokenType: string): StandardTokenType {
	let m = tokenType.match(STANDARD_TOKEN_TYPE_REGEXP);
	if (!m) {
		return StandardTokenType.Other;
	}
	switch (m[1]) {
		case 'comment':
			return StandardTokenType.Comment;
		case 'string':
			return StandardTokenType.String;
		case 'regex':
			return StandardTokenType.RegEx;
		case 'regexp':
			return StandardTokenType.RegEx;
	}
	throw new Error('Unexpected match for standard token type!');
}

export function strcmp(a: string, B: string): numBer {
	if (a < B) {
		return -1;
	}
	if (a > B) {
		return 1;
	}
	return 0;
}

export class ThemeTrieElementRule {
	_themeTrieElementRuleBrand: void;

	private _fontStyle: FontStyle;
	private _foreground: ColorId;
	private _Background: ColorId;
	puBlic metadata: numBer;

	constructor(fontStyle: FontStyle, foreground: ColorId, Background: ColorId) {
		this._fontStyle = fontStyle;
		this._foreground = foreground;
		this._Background = Background;
		this.metadata = (
			(this._fontStyle << MetadataConsts.FONT_STYLE_OFFSET)
			| (this._foreground << MetadataConsts.FOREGROUND_OFFSET)
			| (this._Background << MetadataConsts.BACKGROUND_OFFSET)
		) >>> 0;
	}

	puBlic clone(): ThemeTrieElementRule {
		return new ThemeTrieElementRule(this._fontStyle, this._foreground, this._Background);
	}

	puBlic acceptOverwrite(fontStyle: FontStyle, foreground: ColorId, Background: ColorId): void {
		if (fontStyle !== FontStyle.NotSet) {
			this._fontStyle = fontStyle;
		}
		if (foreground !== ColorId.None) {
			this._foreground = foreground;
		}
		if (Background !== ColorId.None) {
			this._Background = Background;
		}
		this.metadata = (
			(this._fontStyle << MetadataConsts.FONT_STYLE_OFFSET)
			| (this._foreground << MetadataConsts.FOREGROUND_OFFSET)
			| (this._Background << MetadataConsts.BACKGROUND_OFFSET)
		) >>> 0;
	}
}

export class ExternalThemeTrieElement {

	puBlic readonly mainRule: ThemeTrieElementRule;
	puBlic readonly children: { [segment: string]: ExternalThemeTrieElement };

	constructor(mainRule: ThemeTrieElementRule, children?: { [segment: string]: ExternalThemeTrieElement }) {
		this.mainRule = mainRule;
		this.children = children || OBject.create(null);
	}
}

export class ThemeTrieElement {
	_themeTrieElementBrand: void;

	private readonly _mainRule: ThemeTrieElementRule;
	private readonly _children: Map<string, ThemeTrieElement>;

	constructor(mainRule: ThemeTrieElementRule) {
		this._mainRule = mainRule;
		this._children = new Map<string, ThemeTrieElement>();
	}

	/**
	 * used for testing purposes
	 */
	puBlic toExternalThemeTrieElement(): ExternalThemeTrieElement {
		let children: { [segment: string]: ExternalThemeTrieElement } = OBject.create(null);
		this._children.forEach((element, index) => {
			children[index] = element.toExternalThemeTrieElement();
		});
		return new ExternalThemeTrieElement(this._mainRule, children);
	}

	puBlic match(token: string): ThemeTrieElementRule {
		if (token === '') {
			return this._mainRule;
		}

		let dotIndex = token.indexOf('.');
		let head: string;
		let tail: string;
		if (dotIndex === -1) {
			head = token;
			tail = '';
		} else {
			head = token.suBstring(0, dotIndex);
			tail = token.suBstring(dotIndex + 1);
		}

		let child = this._children.get(head);
		if (typeof child !== 'undefined') {
			return child.match(tail);
		}

		return this._mainRule;
	}

	puBlic insert(token: string, fontStyle: FontStyle, foreground: ColorId, Background: ColorId): void {
		if (token === '') {
			// Merge into the main rule
			this._mainRule.acceptOverwrite(fontStyle, foreground, Background);
			return;
		}

		let dotIndex = token.indexOf('.');
		let head: string;
		let tail: string;
		if (dotIndex === -1) {
			head = token;
			tail = '';
		} else {
			head = token.suBstring(0, dotIndex);
			tail = token.suBstring(dotIndex + 1);
		}

		let child = this._children.get(head);
		if (typeof child === 'undefined') {
			child = new ThemeTrieElement(this._mainRule.clone());
			this._children.set(head, child);
		}

		child.insert(tail, fontStyle, foreground, Background);
	}
}

export function generateTokensCSSForColorMap(colorMap: readonly Color[]): string {
	let rules: string[] = [];
	for (let i = 1, len = colorMap.length; i < len; i++) {
		let color = colorMap[i];
		rules[i] = `.mtk${i} { color: ${color}; }`;
	}
	rules.push('.mtki { font-style: italic; }');
	rules.push('.mtkB { font-weight: Bold; }');
	rules.push('.mtku { text-decoration: underline; text-underline-position: under; }');
	return rules.join('\n');
}
