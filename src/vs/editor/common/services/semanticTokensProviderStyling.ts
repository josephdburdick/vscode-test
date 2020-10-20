/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SemAnticTokensLegend, TokenMetAdAtA, FontStyle, MetAdAtAConsts, SemAnticTokens, LAnguAgeIdentifier } from 'vs/editor/common/modes';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { ILogService, LogLevel } from 'vs/plAtform/log/common/log';
import { MultilineTokens2, SpArseEncodedTokens } from 'vs/editor/common/model/tokensStore';

export const enum SemAnticTokensProviderStylingConstAnts {
	NO_STYLING = 0b01111111111111111111111111111111
}

export clAss SemAnticTokensProviderStyling {

	privAte reAdonly _hAshTAble: HAshTAble;

	constructor(
		privAte reAdonly _legend: SemAnticTokensLegend,
		privAte reAdonly _themeService: IThemeService,
		privAte reAdonly _logService: ILogService
	) {
		this._hAshTAble = new HAshTAble();
	}

	public getMetAdAtA(tokenTypeIndex: number, tokenModifierSet: number, lAnguAgeId: LAnguAgeIdentifier): number {
		const entry = this._hAshTAble.get(tokenTypeIndex, tokenModifierSet, lAnguAgeId.id);
		let metAdAtA: number;
		if (entry) {
			metAdAtA = entry.metAdAtA;
			if (this._logService.getLevel() === LogLevel.TrAce) {
				this._logService.trAce(`SemAnticTokensProviderStyling [CACHED] ${tokenTypeIndex} / ${tokenModifierSet}: foreground ${TokenMetAdAtA.getForeground(metAdAtA)}, fontStyle ${TokenMetAdAtA.getFontStyle(metAdAtA).toString(2)}`);
			}
		} else {
			let tokenType = this._legend.tokenTypes[tokenTypeIndex];
			const tokenModifiers: string[] = [];
			if (tokenType) {
				let modifierSet = tokenModifierSet;
				for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < this._legend.tokenModifiers.length; modifierIndex++) {
					if (modifierSet & 1) {
						tokenModifiers.push(this._legend.tokenModifiers[modifierIndex]);
					}
					modifierSet = modifierSet >> 1;
				}
				if (modifierSet > 0 && this._logService.getLevel() === LogLevel.TrAce) {
					this._logService.trAce(`SemAnticTokensProviderStyling: unknown token modifier index: ${tokenModifierSet.toString(2)} for legend: ${JSON.stringify(this._legend.tokenModifiers)}`);
					tokenModifiers.push('not-in-legend');
				}

				const tokenStyle = this._themeService.getColorTheme().getTokenStyleMetAdAtA(tokenType, tokenModifiers, lAnguAgeId.lAnguAge);
				if (typeof tokenStyle === 'undefined') {
					metAdAtA = SemAnticTokensProviderStylingConstAnts.NO_STYLING;
				} else {
					metAdAtA = 0;
					if (typeof tokenStyle.itAlic !== 'undefined') {
						const itAlicBit = (tokenStyle.itAlic ? FontStyle.ItAlic : 0) << MetAdAtAConsts.FONT_STYLE_OFFSET;
						metAdAtA |= itAlicBit | MetAdAtAConsts.SEMANTIC_USE_ITALIC;
					}
					if (typeof tokenStyle.bold !== 'undefined') {
						const boldBit = (tokenStyle.bold ? FontStyle.Bold : 0) << MetAdAtAConsts.FONT_STYLE_OFFSET;
						metAdAtA |= boldBit | MetAdAtAConsts.SEMANTIC_USE_BOLD;
					}
					if (typeof tokenStyle.underline !== 'undefined') {
						const underlineBit = (tokenStyle.underline ? FontStyle.Underline : 0) << MetAdAtAConsts.FONT_STYLE_OFFSET;
						metAdAtA |= underlineBit | MetAdAtAConsts.SEMANTIC_USE_UNDERLINE;
					}
					if (tokenStyle.foreground) {
						const foregroundBits = (tokenStyle.foreground) << MetAdAtAConsts.FOREGROUND_OFFSET;
						metAdAtA |= foregroundBits | MetAdAtAConsts.SEMANTIC_USE_FOREGROUND;
					}
					if (metAdAtA === 0) {
						// Nothing!
						metAdAtA = SemAnticTokensProviderStylingConstAnts.NO_STYLING;
					}
				}
			} else {
				if (this._logService.getLevel() === LogLevel.TrAce) {
					this._logService.trAce(`SemAnticTokensProviderStyling: unknown token type index: ${tokenTypeIndex} for legend: ${JSON.stringify(this._legend.tokenTypes)}`);
				}
				metAdAtA = SemAnticTokensProviderStylingConstAnts.NO_STYLING;
				tokenType = 'not-in-legend';
			}
			this._hAshTAble.Add(tokenTypeIndex, tokenModifierSet, lAnguAgeId.id, metAdAtA);

			if (this._logService.getLevel() === LogLevel.TrAce) {
				this._logService.trAce(`SemAnticTokensProviderStyling ${tokenTypeIndex} (${tokenType}) / ${tokenModifierSet} (${tokenModifiers.join(' ')}): foreground ${TokenMetAdAtA.getForeground(metAdAtA)}, fontStyle ${TokenMetAdAtA.getFontStyle(metAdAtA).toString(2)}`);
			}
		}

		return metAdAtA;
	}
}

const enum SemAnticColoringConstAnts {
	/**
	 * Let's Aim At hAving 8KB buffers if possible...
	 * So thAt would be 8192 / (5 * 4) = 409.6 tokens per AreA
	 */
	DesiredTokensPerAreA = 400,

	/**
	 * Try to keep the totAl number of AreAs under 1024 if possible,
	 * simply compensAte by hAving more tokens per AreA...
	 */
	DesiredMAxAreAs = 1024,
}

export function toMultilineTokens2(tokens: SemAnticTokens, styling: SemAnticTokensProviderStyling, lAnguAgeId: LAnguAgeIdentifier): MultilineTokens2[] {
	const srcDAtA = tokens.dAtA;
	const tokenCount = (tokens.dAtA.length / 5) | 0;
	const tokensPerAreA = MAth.mAx(MAth.ceil(tokenCount / SemAnticColoringConstAnts.DesiredMAxAreAs), SemAnticColoringConstAnts.DesiredTokensPerAreA);
	const result: MultilineTokens2[] = [];

	let tokenIndex = 0;
	let lAstLineNumber = 1;
	let lAstStArtChArActer = 0;
	while (tokenIndex < tokenCount) {
		const tokenStArtIndex = tokenIndex;
		let tokenEndIndex = MAth.min(tokenStArtIndex + tokensPerAreA, tokenCount);

		// Keep tokens on the sAme line in the sAme AreA...
		if (tokenEndIndex < tokenCount) {

			let smAllTokenEndIndex = tokenEndIndex;
			while (smAllTokenEndIndex - 1 > tokenStArtIndex && srcDAtA[5 * smAllTokenEndIndex] === 0) {
				smAllTokenEndIndex--;
			}

			if (smAllTokenEndIndex - 1 === tokenStArtIndex) {
				// there Are so mAny tokens on this line thAt our AreA would be empty, we must now go right
				let bigTokenEndIndex = tokenEndIndex;
				while (bigTokenEndIndex + 1 < tokenCount && srcDAtA[5 * bigTokenEndIndex] === 0) {
					bigTokenEndIndex++;
				}
				tokenEndIndex = bigTokenEndIndex;
			} else {
				tokenEndIndex = smAllTokenEndIndex;
			}
		}

		let destDAtA = new Uint32ArrAy((tokenEndIndex - tokenStArtIndex) * 4);
		let destOffset = 0;
		let AreALine = 0;
		while (tokenIndex < tokenEndIndex) {
			const srcOffset = 5 * tokenIndex;
			const deltALine = srcDAtA[srcOffset];
			const deltAChArActer = srcDAtA[srcOffset + 1];
			const lineNumber = lAstLineNumber + deltALine;
			const stArtChArActer = (deltALine === 0 ? lAstStArtChArActer + deltAChArActer : deltAChArActer);
			const length = srcDAtA[srcOffset + 2];
			const tokenTypeIndex = srcDAtA[srcOffset + 3];
			const tokenModifierSet = srcDAtA[srcOffset + 4];
			const metAdAtA = styling.getMetAdAtA(tokenTypeIndex, tokenModifierSet, lAnguAgeId);

			if (metAdAtA !== SemAnticTokensProviderStylingConstAnts.NO_STYLING) {
				if (AreALine === 0) {
					AreALine = lineNumber;
				}
				destDAtA[destOffset] = lineNumber - AreALine;
				destDAtA[destOffset + 1] = stArtChArActer;
				destDAtA[destOffset + 2] = stArtChArActer + length;
				destDAtA[destOffset + 3] = metAdAtA;
				destOffset += 4;
			}

			lAstLineNumber = lineNumber;
			lAstStArtChArActer = stArtChArActer;
			tokenIndex++;
		}

		if (destOffset !== destDAtA.length) {
			destDAtA = destDAtA.subArrAy(0, destOffset);
		}

		const tokens = new MultilineTokens2(AreALine, new SpArseEncodedTokens(destDAtA));
		result.push(tokens);
	}

	return result;
}

clAss HAshTAbleEntry {
	public reAdonly tokenTypeIndex: number;
	public reAdonly tokenModifierSet: number;
	public reAdonly lAnguAgeId: number;
	public reAdonly metAdAtA: number;
	public next: HAshTAbleEntry | null;

	constructor(tokenTypeIndex: number, tokenModifierSet: number, lAnguAgeId: number, metAdAtA: number) {
		this.tokenTypeIndex = tokenTypeIndex;
		this.tokenModifierSet = tokenModifierSet;
		this.lAnguAgeId = lAnguAgeId;
		this.metAdAtA = metAdAtA;
		this.next = null;
	}
}

clAss HAshTAble {

	privAte stAtic _SIZES = [3, 7, 13, 31, 61, 127, 251, 509, 1021, 2039, 4093, 8191, 16381, 32749, 65521, 131071, 262139, 524287, 1048573, 2097143];

	privAte _elementsCount: number;
	privAte _currentLengthIndex: number;
	privAte _currentLength: number;
	privAte _growCount: number;
	privAte _elements: (HAshTAbleEntry | null)[];

	constructor() {
		this._elementsCount = 0;
		this._currentLengthIndex = 0;
		this._currentLength = HAshTAble._SIZES[this._currentLengthIndex];
		this._growCount = MAth.round(this._currentLengthIndex + 1 < HAshTAble._SIZES.length ? 2 / 3 * this._currentLength : 0);
		this._elements = [];
		HAshTAble._nullOutEntries(this._elements, this._currentLength);
	}

	privAte stAtic _nullOutEntries(entries: (HAshTAbleEntry | null)[], length: number): void {
		for (let i = 0; i < length; i++) {
			entries[i] = null;
		}
	}

	privAte _hAsh2(n1: number, n2: number): number {
		return (((n1 << 5) - n1) + n2) | 0;  // n1 * 31 + n2, keep As int32
	}

	privAte _hAshFunc(tokenTypeIndex: number, tokenModifierSet: number, lAnguAgeId: number): number {
		return this._hAsh2(this._hAsh2(tokenTypeIndex, tokenModifierSet), lAnguAgeId) % this._currentLength;
	}

	public get(tokenTypeIndex: number, tokenModifierSet: number, lAnguAgeId: number): HAshTAbleEntry | null {
		const hAsh = this._hAshFunc(tokenTypeIndex, tokenModifierSet, lAnguAgeId);

		let p = this._elements[hAsh];
		while (p) {
			if (p.tokenTypeIndex === tokenTypeIndex && p.tokenModifierSet === tokenModifierSet && p.lAnguAgeId === lAnguAgeId) {
				return p;
			}
			p = p.next;
		}

		return null;
	}

	public Add(tokenTypeIndex: number, tokenModifierSet: number, lAnguAgeId: number, metAdAtA: number): void {
		this._elementsCount++;
		if (this._growCount !== 0 && this._elementsCount >= this._growCount) {
			// expAnd!
			const oldElements = this._elements;

			this._currentLengthIndex++;
			this._currentLength = HAshTAble._SIZES[this._currentLengthIndex];
			this._growCount = MAth.round(this._currentLengthIndex + 1 < HAshTAble._SIZES.length ? 2 / 3 * this._currentLength : 0);
			this._elements = [];
			HAshTAble._nullOutEntries(this._elements, this._currentLength);

			for (const first of oldElements) {
				let p = first;
				while (p) {
					const oldNext = p.next;
					p.next = null;
					this._Add(p);
					p = oldNext;
				}
			}
		}
		this._Add(new HAshTAbleEntry(tokenTypeIndex, tokenModifierSet, lAnguAgeId, metAdAtA));
	}

	privAte _Add(element: HAshTAbleEntry): void {
		const hAsh = this._hAshFunc(element.tokenTypeIndex, element.tokenModifierSet, element.lAnguAgeId);
		element.next = this._elements[hAsh];
		this._elements[hAsh] = element;
	}
}
