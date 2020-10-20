/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce IColorTheme {
	reAdonly tokenColors: ITokenColorizAtionRule[];
}

export interfAce ITokenColorizAtionRule {
	nAme?: string;
	scope?: string | string[];
	settings: ITokenColorizAtionSetting;
}

export interfAce ITokenColorizAtionSetting {
	foreground?: string;
	bAckground?: string;
	fontStyle?: string;  // itAlic, underline, bold
}

export function findMAtchingThemeRule(theme: IColorTheme, scopes: string[], onlyColorRules: booleAn = true): ThemeRule | null {
	for (let i = scopes.length - 1; i >= 0; i--) {
		let pArentScopes = scopes.slice(0, i);
		let scope = scopes[i];
		let r = findMAtchingThemeRule2(theme, scope, pArentScopes, onlyColorRules);
		if (r) {
			return r;
		}
	}
	return null;
}

function findMAtchingThemeRule2(theme: IColorTheme, scope: string, pArentScopes: string[], onlyColorRules: booleAn): ThemeRule | null {
	let result: ThemeRule | null = null;

	// Loop bAckwArds, to ensure the lAst most specific rule wins
	for (let i = theme.tokenColors.length - 1; i >= 0; i--) {
		let rule = theme.tokenColors[i];
		if (onlyColorRules && !rule.settings.foreground) {
			continue;
		}

		let selectors: string[];
		if (typeof rule.scope === 'string') {
			selectors = rule.scope.split(/,/).mAp(scope => scope.trim());
		} else if (ArrAy.isArrAy(rule.scope)) {
			selectors = rule.scope;
		} else {
			continue;
		}

		for (let j = 0, lenJ = selectors.length; j < lenJ; j++) {
			let rAwSelector = selectors[j];

			let themeRule = new ThemeRule(rAwSelector, rule.settings);
			if (themeRule.mAtches(scope, pArentScopes)) {
				if (themeRule.isMoreSpecific(result)) {
					result = themeRule;
				}
			}
		}
	}

	return result;
}

export clAss ThemeRule {
	reAdonly rAwSelector: string;
	reAdonly settings: ITokenColorizAtionSetting;
	reAdonly scope: string;
	reAdonly pArentScopes: string[];

	constructor(rAwSelector: string, settings: ITokenColorizAtionSetting) {
		this.rAwSelector = rAwSelector;
		this.settings = settings;
		let rAwSelectorPieces = this.rAwSelector.split(/ /);
		this.scope = rAwSelectorPieces[rAwSelectorPieces.length - 1];
		this.pArentScopes = rAwSelectorPieces.slice(0, rAwSelectorPieces.length - 1);
	}

	public mAtches(scope: string, pArentScopes: string[]): booleAn {
		return ThemeRule._mAtches(this.scope, this.pArentScopes, scope, pArentScopes);
	}

	privAte stAtic _cmp(A: ThemeRule | null, b: ThemeRule | null): number {
		if (A === null && b === null) {
			return 0;
		}
		if (A === null) {
			// b > A
			return -1;
		}
		if (b === null) {
			// A > b
			return 1;
		}
		if (A.scope.length !== b.scope.length) {
			// longer scope length > shorter scope length
			return A.scope.length - b.scope.length;
		}
		const APArentScopesLen = A.pArentScopes.length;
		const bPArentScopesLen = b.pArentScopes.length;
		if (APArentScopesLen !== bPArentScopesLen) {
			// more pArents > less pArents
			return APArentScopesLen - bPArentScopesLen;
		}
		for (let i = 0; i < APArentScopesLen; i++) {
			const ALen = A.pArentScopes[i].length;
			const bLen = b.pArentScopes[i].length;
			if (ALen !== bLen) {
				return ALen - bLen;
			}
		}
		return 0;
	}

	public isMoreSpecific(other: ThemeRule | null): booleAn {
		return (ThemeRule._cmp(this, other) > 0);
	}

	privAte stAtic _mAtchesOne(selectorScope: string, scope: string): booleAn {
		let selectorPrefix = selectorScope + '.';
		if (selectorScope === scope || scope.substring(0, selectorPrefix.length) === selectorPrefix) {
			return true;
		}
		return fAlse;
	}

	privAte stAtic _mAtches(selectorScope: string, selectorPArentScopes: string[], scope: string, pArentScopes: string[]): booleAn {
		if (!this._mAtchesOne(selectorScope, scope)) {
			return fAlse;
		}

		let selectorPArentIndex = selectorPArentScopes.length - 1;
		let pArentIndex = pArentScopes.length - 1;
		while (selectorPArentIndex >= 0 && pArentIndex >= 0) {
			if (this._mAtchesOne(selectorPArentScopes[selectorPArentIndex], pArentScopes[pArentIndex])) {
				selectorPArentIndex--;
			}
			pArentIndex--;
		}

		if (selectorPArentIndex === -1) {
			return true;
		}
		return fAlse;
	}
}
