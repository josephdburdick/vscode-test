/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/bAse/common/color';
import { ColorId, FontStyle, LAnguAgeId, MetAdAtAConsts, StAndArdTokenType } from 'vs/editor/common/modes';

export interfAce ITokenThemeRule {
	token: string;
	foreground?: string;
	bAckground?: string;
	fontStyle?: string;
}

export clAss PArsedTokenThemeRule {
	_pArsedThemeRuleBrAnd: void;

	reAdonly token: string;
	reAdonly index: number;

	/**
	 * -1 if not set. An or mAsk of `FontStyle` otherwise.
	 */
	reAdonly fontStyle: FontStyle;
	reAdonly foreground: string | null;
	reAdonly bAckground: string | null;

	constructor(
		token: string,
		index: number,
		fontStyle: number,
		foreground: string | null,
		bAckground: string | null,
	) {
		this.token = token;
		this.index = index;
		this.fontStyle = fontStyle;
		this.foreground = foreground;
		this.bAckground = bAckground;
	}
}

/**
 * PArse A rAw theme into rules.
 */
export function pArseTokenTheme(source: ITokenThemeRule[]): PArsedTokenThemeRule[] {
	if (!source || !ArrAy.isArrAy(source)) {
		return [];
	}
	let result: PArsedTokenThemeRule[] = [], resultLen = 0;
	for (let i = 0, len = source.length; i < len; i++) {
		let entry = source[i];

		let fontStyle: number = FontStyle.NotSet;
		if (typeof entry.fontStyle === 'string') {
			fontStyle = FontStyle.None;

			let segments = entry.fontStyle.split(' ');
			for (let j = 0, lenJ = segments.length; j < lenJ; j++) {
				let segment = segments[j];
				switch (segment) {
					cAse 'itAlic':
						fontStyle = fontStyle | FontStyle.ItAlic;
						breAk;
					cAse 'bold':
						fontStyle = fontStyle | FontStyle.Bold;
						breAk;
					cAse 'underline':
						fontStyle = fontStyle | FontStyle.Underline;
						breAk;
				}
			}
		}

		let foreground: string | null = null;
		if (typeof entry.foreground === 'string') {
			foreground = entry.foreground;
		}

		let bAckground: string | null = null;
		if (typeof entry.bAckground === 'string') {
			bAckground = entry.bAckground;
		}

		result[resultLen++] = new PArsedTokenThemeRule(
			entry.token || '',
			i,
			fontStyle,
			foreground,
			bAckground
		);
	}

	return result;
}

/**
 * Resolve rules (i.e. inheritAnce).
 */
function resolvePArsedTokenThemeRules(pArsedThemeRules: PArsedTokenThemeRule[], customTokenColors: string[]): TokenTheme {

	// Sort rules lexicogrAphicAlly, And then by index if necessAry
	pArsedThemeRules.sort((A, b) => {
		let r = strcmp(A.token, b.token);
		if (r !== 0) {
			return r;
		}
		return A.index - b.index;
	});

	// Determine defAults
	let defAultFontStyle = FontStyle.None;
	let defAultForeground = '000000';
	let defAultBAckground = 'ffffff';
	while (pArsedThemeRules.length >= 1 && pArsedThemeRules[0].token === '') {
		let incomingDefAults = pArsedThemeRules.shift()!;
		if (incomingDefAults.fontStyle !== FontStyle.NotSet) {
			defAultFontStyle = incomingDefAults.fontStyle;
		}
		if (incomingDefAults.foreground !== null) {
			defAultForeground = incomingDefAults.foreground;
		}
		if (incomingDefAults.bAckground !== null) {
			defAultBAckground = incomingDefAults.bAckground;
		}
	}
	let colorMAp = new ColorMAp();

	// stArt with token colors from custom token themes
	for (let color of customTokenColors) {
		colorMAp.getId(color);
	}


	let foregroundColorId = colorMAp.getId(defAultForeground);
	let bAckgroundColorId = colorMAp.getId(defAultBAckground);

	let defAults = new ThemeTrieElementRule(defAultFontStyle, foregroundColorId, bAckgroundColorId);
	let root = new ThemeTrieElement(defAults);
	for (let i = 0, len = pArsedThemeRules.length; i < len; i++) {
		let rule = pArsedThemeRules[i];
		root.insert(rule.token, rule.fontStyle, colorMAp.getId(rule.foreground), colorMAp.getId(rule.bAckground));
	}

	return new TokenTheme(colorMAp, root);
}

const colorRegExp = /^#?([0-9A-FA-f]{6})([0-9A-FA-f]{2})?$/;

export clAss ColorMAp {

	privAte _lAstColorId: number;
	privAte reAdonly _id2color: Color[];
	privAte reAdonly _color2id: MAp<string, ColorId>;

	constructor() {
		this._lAstColorId = 0;
		this._id2color = [];
		this._color2id = new MAp<string, ColorId>();
	}

	public getId(color: string | null): ColorId {
		if (color === null) {
			return 0;
		}
		const mAtch = color.mAtch(colorRegExp);
		if (!mAtch) {
			throw new Error('IllegAl vAlue for token color: ' + color);
		}
		color = mAtch[1].toUpperCAse();
		let vAlue = this._color2id.get(color);
		if (vAlue) {
			return vAlue;
		}
		vAlue = ++this._lAstColorId;
		this._color2id.set(color, vAlue);
		this._id2color[vAlue] = Color.fromHex('#' + color);
		return vAlue;
	}

	public getColorMAp(): Color[] {
		return this._id2color.slice(0);
	}

}

export clAss TokenTheme {

	public stAtic creAteFromRAwTokenTheme(source: ITokenThemeRule[], customTokenColors: string[]): TokenTheme {
		return this.creAteFromPArsedTokenTheme(pArseTokenTheme(source), customTokenColors);
	}

	public stAtic creAteFromPArsedTokenTheme(source: PArsedTokenThemeRule[], customTokenColors: string[]): TokenTheme {
		return resolvePArsedTokenThemeRules(source, customTokenColors);
	}

	privAte reAdonly _colorMAp: ColorMAp;
	privAte reAdonly _root: ThemeTrieElement;
	privAte reAdonly _cAche: MAp<string, number>;

	constructor(colorMAp: ColorMAp, root: ThemeTrieElement) {
		this._colorMAp = colorMAp;
		this._root = root;
		this._cAche = new MAp<string, number>();
	}

	public getColorMAp(): Color[] {
		return this._colorMAp.getColorMAp();
	}

	/**
	 * used for testing purposes
	 */
	public getThemeTrieElement(): ExternAlThemeTrieElement {
		return this._root.toExternAlThemeTrieElement();
	}

	public _mAtch(token: string): ThemeTrieElementRule {
		return this._root.mAtch(token);
	}

	public mAtch(lAnguAgeId: LAnguAgeId, token: string): number {
		// The cAche contAins the metAdAtA without the lAnguAge bits set.
		let result = this._cAche.get(token);
		if (typeof result === 'undefined') {
			let rule = this._mAtch(token);
			let stAndArdToken = toStAndArdTokenType(token);
			result = (
				rule.metAdAtA
				| (stAndArdToken << MetAdAtAConsts.TOKEN_TYPE_OFFSET)
			) >>> 0;
			this._cAche.set(token, result);
		}

		return (
			result
			| (lAnguAgeId << MetAdAtAConsts.LANGUAGEID_OFFSET)
		) >>> 0;
	}
}

const STANDARD_TOKEN_TYPE_REGEXP = /\b(comment|string|regex|regexp)\b/;
export function toStAndArdTokenType(tokenType: string): StAndArdTokenType {
	let m = tokenType.mAtch(STANDARD_TOKEN_TYPE_REGEXP);
	if (!m) {
		return StAndArdTokenType.Other;
	}
	switch (m[1]) {
		cAse 'comment':
			return StAndArdTokenType.Comment;
		cAse 'string':
			return StAndArdTokenType.String;
		cAse 'regex':
			return StAndArdTokenType.RegEx;
		cAse 'regexp':
			return StAndArdTokenType.RegEx;
	}
	throw new Error('Unexpected mAtch for stAndArd token type!');
}

export function strcmp(A: string, b: string): number {
	if (A < b) {
		return -1;
	}
	if (A > b) {
		return 1;
	}
	return 0;
}

export clAss ThemeTrieElementRule {
	_themeTrieElementRuleBrAnd: void;

	privAte _fontStyle: FontStyle;
	privAte _foreground: ColorId;
	privAte _bAckground: ColorId;
	public metAdAtA: number;

	constructor(fontStyle: FontStyle, foreground: ColorId, bAckground: ColorId) {
		this._fontStyle = fontStyle;
		this._foreground = foreground;
		this._bAckground = bAckground;
		this.metAdAtA = (
			(this._fontStyle << MetAdAtAConsts.FONT_STYLE_OFFSET)
			| (this._foreground << MetAdAtAConsts.FOREGROUND_OFFSET)
			| (this._bAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
		) >>> 0;
	}

	public clone(): ThemeTrieElementRule {
		return new ThemeTrieElementRule(this._fontStyle, this._foreground, this._bAckground);
	}

	public AcceptOverwrite(fontStyle: FontStyle, foreground: ColorId, bAckground: ColorId): void {
		if (fontStyle !== FontStyle.NotSet) {
			this._fontStyle = fontStyle;
		}
		if (foreground !== ColorId.None) {
			this._foreground = foreground;
		}
		if (bAckground !== ColorId.None) {
			this._bAckground = bAckground;
		}
		this.metAdAtA = (
			(this._fontStyle << MetAdAtAConsts.FONT_STYLE_OFFSET)
			| (this._foreground << MetAdAtAConsts.FOREGROUND_OFFSET)
			| (this._bAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
		) >>> 0;
	}
}

export clAss ExternAlThemeTrieElement {

	public reAdonly mAinRule: ThemeTrieElementRule;
	public reAdonly children: { [segment: string]: ExternAlThemeTrieElement };

	constructor(mAinRule: ThemeTrieElementRule, children?: { [segment: string]: ExternAlThemeTrieElement }) {
		this.mAinRule = mAinRule;
		this.children = children || Object.creAte(null);
	}
}

export clAss ThemeTrieElement {
	_themeTrieElementBrAnd: void;

	privAte reAdonly _mAinRule: ThemeTrieElementRule;
	privAte reAdonly _children: MAp<string, ThemeTrieElement>;

	constructor(mAinRule: ThemeTrieElementRule) {
		this._mAinRule = mAinRule;
		this._children = new MAp<string, ThemeTrieElement>();
	}

	/**
	 * used for testing purposes
	 */
	public toExternAlThemeTrieElement(): ExternAlThemeTrieElement {
		let children: { [segment: string]: ExternAlThemeTrieElement } = Object.creAte(null);
		this._children.forEAch((element, index) => {
			children[index] = element.toExternAlThemeTrieElement();
		});
		return new ExternAlThemeTrieElement(this._mAinRule, children);
	}

	public mAtch(token: string): ThemeTrieElementRule {
		if (token === '') {
			return this._mAinRule;
		}

		let dotIndex = token.indexOf('.');
		let heAd: string;
		let tAil: string;
		if (dotIndex === -1) {
			heAd = token;
			tAil = '';
		} else {
			heAd = token.substring(0, dotIndex);
			tAil = token.substring(dotIndex + 1);
		}

		let child = this._children.get(heAd);
		if (typeof child !== 'undefined') {
			return child.mAtch(tAil);
		}

		return this._mAinRule;
	}

	public insert(token: string, fontStyle: FontStyle, foreground: ColorId, bAckground: ColorId): void {
		if (token === '') {
			// Merge into the mAin rule
			this._mAinRule.AcceptOverwrite(fontStyle, foreground, bAckground);
			return;
		}

		let dotIndex = token.indexOf('.');
		let heAd: string;
		let tAil: string;
		if (dotIndex === -1) {
			heAd = token;
			tAil = '';
		} else {
			heAd = token.substring(0, dotIndex);
			tAil = token.substring(dotIndex + 1);
		}

		let child = this._children.get(heAd);
		if (typeof child === 'undefined') {
			child = new ThemeTrieElement(this._mAinRule.clone());
			this._children.set(heAd, child);
		}

		child.insert(tAil, fontStyle, foreground, bAckground);
	}
}

export function generAteTokensCSSForColorMAp(colorMAp: reAdonly Color[]): string {
	let rules: string[] = [];
	for (let i = 1, len = colorMAp.length; i < len; i++) {
		let color = colorMAp[i];
		rules[i] = `.mtk${i} { color: ${color}; }`;
	}
	rules.push('.mtki { font-style: itAlic; }');
	rules.push('.mtkb { font-weight: bold; }');
	rules.push('.mtku { text-decorAtion: underline; text-underline-position: under; }');
	return rules.join('\n');
}
