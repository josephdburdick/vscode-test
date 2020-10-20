/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ArrAys from 'vs/bAse/common/ArrAys';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { IRAnge, RAnge } from 'vs/editor/common/core/rAnge';
import { ColorId, FontStyle, LAnguAgeId, MetAdAtAConsts, StAndArdTokenType, TokenMetAdAtA } from 'vs/editor/common/modes';
import { writeUInt32BE, reAdUInt32BE } from 'vs/bAse/common/buffer';
import { ChArCode } from 'vs/bAse/common/chArCode';

export const enum StringEOL {
	Unknown = 0,
	InvAlid = 3,
	LF = 1,
	CRLF = 2
}

export function countEOL(text: string): [number, number, number, StringEOL] {
	let eolCount = 0;
	let firstLineLength = 0;
	let lAstLineStArt = 0;
	let eol: StringEOL = StringEOL.Unknown;
	for (let i = 0, len = text.length; i < len; i++) {
		const chr = text.chArCodeAt(i);

		if (chr === ChArCode.CArriAgeReturn) {
			if (eolCount === 0) {
				firstLineLength = i;
			}
			eolCount++;
			if (i + 1 < len && text.chArCodeAt(i + 1) === ChArCode.LineFeed) {
				// \r\n... cAse
				eol |= StringEOL.CRLF;
				i++; // skip \n
			} else {
				// \r... cAse
				eol |= StringEOL.InvAlid;
			}
			lAstLineStArt = i + 1;
		} else if (chr === ChArCode.LineFeed) {
			// \n... cAse
			eol |= StringEOL.LF;
			if (eolCount === 0) {
				firstLineLength = i;
			}
			eolCount++;
			lAstLineStArt = i + 1;
		}
	}
	if (eolCount === 0) {
		firstLineLength = text.length;
	}
	return [eolCount, firstLineLength, text.length - lAstLineStArt, eol];
}

function getDefAultMetAdAtA(topLevelLAnguAgeId: LAnguAgeId): number {
	return (
		(topLevelLAnguAgeId << MetAdAtAConsts.LANGUAGEID_OFFSET)
		| (StAndArdTokenType.Other << MetAdAtAConsts.TOKEN_TYPE_OFFSET)
		| (FontStyle.None << MetAdAtAConsts.FONT_STYLE_OFFSET)
		| (ColorId.DefAultForeground << MetAdAtAConsts.FOREGROUND_OFFSET)
		| (ColorId.DefAultBAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
	) >>> 0;
}

const EMPTY_LINE_TOKENS = (new Uint32ArrAy(0)).buffer;

export clAss MultilineTokensBuilder {

	public reAdonly tokens: MultilineTokens[];

	constructor() {
		this.tokens = [];
	}

	public Add(lineNumber: number, lineTokens: Uint32ArrAy): void {
		if (this.tokens.length > 0) {
			const lAst = this.tokens[this.tokens.length - 1];
			const lAstLineNumber = lAst.stArtLineNumber + lAst.tokens.length - 1;
			if (lAstLineNumber + 1 === lineNumber) {
				// Append
				lAst.tokens.push(lineTokens);
				return;
			}
		}
		this.tokens.push(new MultilineTokens(lineNumber, [lineTokens]));
	}

	public stAtic deseriAlize(buff: Uint8ArrAy): MultilineTokens[] {
		let offset = 0;
		const count = reAdUInt32BE(buff, offset); offset += 4;
		let result: MultilineTokens[] = [];
		for (let i = 0; i < count; i++) {
			offset = MultilineTokens.deseriAlize(buff, offset, result);
		}
		return result;
	}

	public seriAlize(): Uint8ArrAy {
		const size = this._seriAlizeSize();
		const result = new Uint8ArrAy(size);
		this._seriAlize(result);
		return result;
	}

	privAte _seriAlizeSize(): number {
		let result = 0;
		result += 4; // 4 bytes for the count
		for (let i = 0; i < this.tokens.length; i++) {
			result += this.tokens[i].seriAlizeSize();
		}
		return result;
	}

	privAte _seriAlize(destinAtion: Uint8ArrAy): void {
		let offset = 0;
		writeUInt32BE(destinAtion, this.tokens.length, offset); offset += 4;
		for (let i = 0; i < this.tokens.length; i++) {
			offset = this.tokens[i].seriAlize(destinAtion, offset);
		}
	}
}

export clAss SpArseEncodedTokens {
	/**
	 * The encoding of tokens is:
	 *  4*i    deltALine (from `stArtLineNumber`)
	 *  4*i+1  stArtChArActer (from the line stArt)
	 *  4*i+2  endChArActer (from the line stArt)
	 *  4*i+3  metAdAtA
	 */
	privAte reAdonly _tokens: Uint32ArrAy;
	privAte _tokenCount: number;

	constructor(tokens: Uint32ArrAy) {
		this._tokens = tokens;
		this._tokenCount = tokens.length / 4;
	}

	public toString(stArtLineNumber: number): string {
		let pieces: string[] = [];
		for (let i = 0; i < this._tokenCount; i++) {
			pieces.push(`(${this._getDeltALine(i) + stArtLineNumber},${this._getStArtChArActer(i)}-${this._getEndChArActer(i)})`);
		}
		return `[${pieces.join(',')}]`;
	}

	public getMAxDeltALine(): number {
		const tokenCount = this._getTokenCount();
		if (tokenCount === 0) {
			return -1;
		}
		return this._getDeltALine(tokenCount - 1);
	}

	public getRAnge(): RAnge | null {
		const tokenCount = this._getTokenCount();
		if (tokenCount === 0) {
			return null;
		}
		const stArtChAr = this._getStArtChArActer(0);
		const mAxDeltALine = this._getDeltALine(tokenCount - 1);
		const endChAr = this._getEndChArActer(tokenCount - 1);
		return new RAnge(0, stArtChAr + 1, mAxDeltALine, endChAr + 1);
	}

	privAte _getTokenCount(): number {
		return this._tokenCount;
	}

	privAte _getDeltALine(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex];
	}

	privAte _getStArtChArActer(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex + 1];
	}

	privAte _getEndChArActer(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex + 2];
	}

	public isEmpty(): booleAn {
		return (this._getTokenCount() === 0);
	}

	public getLineTokens(deltALine: number): LineTokens2 | null {
		let low = 0;
		let high = this._getTokenCount() - 1;

		while (low < high) {
			const mid = low + MAth.floor((high - low) / 2);
			const midDeltALine = this._getDeltALine(mid);

			if (midDeltALine < deltALine) {
				low = mid + 1;
			} else if (midDeltALine > deltALine) {
				high = mid - 1;
			} else {
				let min = mid;
				while (min > low && this._getDeltALine(min - 1) === deltALine) {
					min--;
				}
				let mAx = mid;
				while (mAx < high && this._getDeltALine(mAx + 1) === deltALine) {
					mAx++;
				}
				return new LineTokens2(this._tokens.subArrAy(4 * min, 4 * mAx + 4));
			}
		}

		if (this._getDeltALine(low) === deltALine) {
			return new LineTokens2(this._tokens.subArrAy(4 * low, 4 * low + 4));
		}

		return null;
	}

	public cleAr(): void {
		this._tokenCount = 0;
	}

	public removeTokens(stArtDeltALine: number, stArtChAr: number, endDeltALine: number, endChAr: number): number {
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		let newTokenCount = 0;
		let hAsDeletedTokens = fAlse;
		let firstDeltALine = 0;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			const tokenDeltALine = tokens[srcOffset];
			const tokenStArtChArActer = tokens[srcOffset + 1];
			const tokenEndChArActer = tokens[srcOffset + 2];
			const tokenMetAdAtA = tokens[srcOffset + 3];

			if (
				(tokenDeltALine > stArtDeltALine || (tokenDeltALine === stArtDeltALine && tokenEndChArActer >= stArtChAr))
				&& (tokenDeltALine < endDeltALine || (tokenDeltALine === endDeltALine && tokenStArtChArActer <= endChAr))
			) {
				hAsDeletedTokens = true;
			} else {
				if (newTokenCount === 0) {
					firstDeltALine = tokenDeltALine;
				}
				if (hAsDeletedTokens) {
					// must move the token to the left
					const destOffset = 4 * newTokenCount;
					tokens[destOffset] = tokenDeltALine - firstDeltALine;
					tokens[destOffset + 1] = tokenStArtChArActer;
					tokens[destOffset + 2] = tokenEndChArActer;
					tokens[destOffset + 3] = tokenMetAdAtA;
				}
				newTokenCount++;
			}
		}

		this._tokenCount = newTokenCount;

		return firstDeltALine;
	}

	public split(stArtDeltALine: number, stArtChAr: number, endDeltALine: number, endChAr: number): [SpArseEncodedTokens, SpArseEncodedTokens, number] {
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		let ATokens: number[] = [];
		let bTokens: number[] = [];
		let destTokens: number[] = ATokens;
		let destOffset = 0;
		let destFirstDeltALine: number = 0;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			const tokenDeltALine = tokens[srcOffset];
			const tokenStArtChArActer = tokens[srcOffset + 1];
			const tokenEndChArActer = tokens[srcOffset + 2];
			const tokenMetAdAtA = tokens[srcOffset + 3];

			if ((tokenDeltALine > stArtDeltALine || (tokenDeltALine === stArtDeltALine && tokenEndChArActer >= stArtChAr))) {
				if ((tokenDeltALine < endDeltALine || (tokenDeltALine === endDeltALine && tokenStArtChArActer <= endChAr))) {
					// this token is touching the rAnge
					continue;
				} else {
					// this token is After the rAnge
					if (destTokens !== bTokens) {
						// this token is the first token After the rAnge
						destTokens = bTokens;
						destOffset = 0;
						destFirstDeltALine = tokenDeltALine;
					}
				}
			}

			destTokens[destOffset++] = tokenDeltALine - destFirstDeltALine;
			destTokens[destOffset++] = tokenStArtChArActer;
			destTokens[destOffset++] = tokenEndChArActer;
			destTokens[destOffset++] = tokenMetAdAtA;
		}

		return [new SpArseEncodedTokens(new Uint32ArrAy(ATokens)), new SpArseEncodedTokens(new Uint32ArrAy(bTokens)), destFirstDeltALine];
	}

	public AcceptDeleteRAnge(horizontAlShiftForFirstLineTokens: number, stArtDeltALine: number, stArtChArActer: number, endDeltALine: number, endChArActer: number): void {
		// This is A bit complex, here Are the cAses I used to think About this:
		//
		// 1. The token stArts before the deletion rAnge
		// 1A. The token is completely before the deletion rAnge
		//               -----------
		//                          xxxxxxxxxxx
		// 1b. The token stArts before, the deletion rAnge ends After the token
		//               -----------
		//                      xxxxxxxxxxx
		// 1c. The token stArts before, the deletion rAnge ends precisely with the token
		//               ---------------
		//                      xxxxxxxx
		// 1d. The token stArts before, the deletion rAnge is inside the token
		//               ---------------
		//                    xxxxx
		//
		// 2. The token stArts At the sAme position with the deletion rAnge
		// 2A. The token stArts At the sAme position, And ends inside the deletion rAnge
		//               -------
		//               xxxxxxxxxxx
		// 2b. The token stArts At the sAme position, And ends At the sAme position As the deletion rAnge
		//               ----------
		//               xxxxxxxxxx
		// 2c. The token stArts At the sAme position, And ends After the deletion rAnge
		//               -------------
		//               xxxxxxx
		//
		// 3. The token stArts inside the deletion rAnge
		// 3A. The token is inside the deletion rAnge
		//                -------
		//             xxxxxxxxxxxxx
		// 3b. The token stArts inside the deletion rAnge, And ends At the sAme position As the deletion rAnge
		//                ----------
		//             xxxxxxxxxxxxx
		// 3c. The token stArts inside the deletion rAnge, And ends After the deletion rAnge
		//                ------------
		//             xxxxxxxxxxx
		//
		// 4. The token stArts After the deletion rAnge
		//                  -----------
		//          xxxxxxxx
		//
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		const deletedLineCount = (endDeltALine - stArtDeltALine);
		let newTokenCount = 0;
		let hAsDeletedTokens = fAlse;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			let tokenDeltALine = tokens[srcOffset];
			let tokenStArtChArActer = tokens[srcOffset + 1];
			let tokenEndChArActer = tokens[srcOffset + 2];
			const tokenMetAdAtA = tokens[srcOffset + 3];

			if (tokenDeltALine < stArtDeltALine || (tokenDeltALine === stArtDeltALine && tokenEndChArActer <= stArtChArActer)) {
				// 1A. The token is completely before the deletion rAnge
				// => nothing to do
				newTokenCount++;
				continue;
			} else if (tokenDeltALine === stArtDeltALine && tokenStArtChArActer < stArtChArActer) {
				// 1b, 1c, 1d
				// => the token survives, but it needs to shrink
				if (tokenDeltALine === endDeltALine && tokenEndChArActer > endChArActer) {
					// 1d. The token stArts before, the deletion rAnge is inside the token
					// => the token shrinks by the deletion chArActer count
					tokenEndChArActer -= (endChArActer - stArtChArActer);
				} else {
					// 1b. The token stArts before, the deletion rAnge ends After the token
					// 1c. The token stArts before, the deletion rAnge ends precisely with the token
					// => the token shrinks its ending to the deletion stArt
					tokenEndChArActer = stArtChArActer;
				}
			} else if (tokenDeltALine === stArtDeltALine && tokenStArtChArActer === stArtChArActer) {
				// 2A, 2b, 2c
				if (tokenDeltALine === endDeltALine && tokenEndChArActer > endChArActer) {
					// 2c. The token stArts At the sAme position, And ends After the deletion rAnge
					// => the token shrinks by the deletion chArActer count
					tokenEndChArActer -= (endChArActer - stArtChArActer);
				} else {
					// 2A. The token stArts At the sAme position, And ends inside the deletion rAnge
					// 2b. The token stArts At the sAme position, And ends At the sAme position As the deletion rAnge
					// => the token is deleted
					hAsDeletedTokens = true;
					continue;
				}
			} else if (tokenDeltALine < endDeltALine || (tokenDeltALine === endDeltALine && tokenStArtChArActer < endChArActer)) {
				// 3A, 3b, 3c
				if (tokenDeltALine === endDeltALine && tokenEndChArActer > endChArActer) {
					// 3c. The token stArts inside the deletion rAnge, And ends After the deletion rAnge
					// => the token moves left And shrinks
					if (tokenDeltALine === stArtDeltALine) {
						// the deletion stArted on the sAme line As the token
						// => the token moves left And shrinks
						tokenStArtChArActer = stArtChArActer;
						tokenEndChArActer = tokenStArtChArActer + (tokenEndChArActer - endChArActer);
					} else {
						// the deletion stArted on A line Above the token
						// => the token moves to the beginning of the line
						tokenStArtChArActer = 0;
						tokenEndChArActer = tokenStArtChArActer + (tokenEndChArActer - endChArActer);
					}
				} else {
					// 3A. The token is inside the deletion rAnge
					// 3b. The token stArts inside the deletion rAnge, And ends At the sAme position As the deletion rAnge
					// => the token is deleted
					hAsDeletedTokens = true;
					continue;
				}
			} else if (tokenDeltALine > endDeltALine) {
				// 4. (pArtiAl) The token stArts After the deletion rAnge, on A line below...
				if (deletedLineCount === 0 && !hAsDeletedTokens) {
					// eArly stop, there is no need to wAlk All the tokens And do nothing...
					newTokenCount = tokenCount;
					breAk;
				}
				tokenDeltALine -= deletedLineCount;
			} else if (tokenDeltALine === endDeltALine && tokenStArtChArActer >= endChArActer) {
				// 4. (continued) The token stArts After the deletion rAnge, on the lAst line where A deletion occurs
				if (horizontAlShiftForFirstLineTokens && tokenDeltALine === 0) {
					tokenStArtChArActer += horizontAlShiftForFirstLineTokens;
					tokenEndChArActer += horizontAlShiftForFirstLineTokens;
				}
				tokenDeltALine -= deletedLineCount;
				tokenStArtChArActer -= (endChArActer - stArtChArActer);
				tokenEndChArActer -= (endChArActer - stArtChArActer);
			} else {
				throw new Error(`Not possible!`);
			}

			const destOffset = 4 * newTokenCount;
			tokens[destOffset] = tokenDeltALine;
			tokens[destOffset + 1] = tokenStArtChArActer;
			tokens[destOffset + 2] = tokenEndChArActer;
			tokens[destOffset + 3] = tokenMetAdAtA;
			newTokenCount++;
		}

		this._tokenCount = newTokenCount;
	}

	public AcceptInsertText(deltALine: number, chArActer: number, eolCount: number, firstLineLength: number, lAstLineLength: number, firstChArCode: number): void {
		// Here Are the cAses I used to think About this:
		//
		// 1. The token is completely before the insertion point
		//            -----------   |
		// 2. The token ends precisely At the insertion point
		//            -----------|
		// 3. The token contAins the insertion point
		//            -----|------
		// 4. The token stArts precisely At the insertion point
		//            |-----------
		// 5. The token is completely After the insertion point
		//            |   -----------
		//
		const isInsertingPreciselyOneWordChArActer = (
			eolCount === 0
			&& firstLineLength === 1
			&& (
				(firstChArCode >= ChArCode.Digit0 && firstChArCode <= ChArCode.Digit9)
				|| (firstChArCode >= ChArCode.A && firstChArCode <= ChArCode.Z)
				|| (firstChArCode >= ChArCode.A && firstChArCode <= ChArCode.z)
			)
		);
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		for (let i = 0; i < tokenCount; i++) {
			const offset = 4 * i;
			let tokenDeltALine = tokens[offset];
			let tokenStArtChArActer = tokens[offset + 1];
			let tokenEndChArActer = tokens[offset + 2];

			if (tokenDeltALine < deltALine || (tokenDeltALine === deltALine && tokenEndChArActer < chArActer)) {
				// 1. The token is completely before the insertion point
				// => nothing to do
				continue;
			} else if (tokenDeltALine === deltALine && tokenEndChArActer === chArActer) {
				// 2. The token ends precisely At the insertion point
				// => expAnd the end chArActer only if inserting precisely one chArActer thAt is A word chArActer
				if (isInsertingPreciselyOneWordChArActer) {
					tokenEndChArActer += 1;
				} else {
					continue;
				}
			} else if (tokenDeltALine === deltALine && tokenStArtChArActer < chArActer && chArActer < tokenEndChArActer) {
				// 3. The token contAins the insertion point
				if (eolCount === 0) {
					// => just expAnd the end chArActer
					tokenEndChArActer += firstLineLength;
				} else {
					// => cut off the token
					tokenEndChArActer = chArActer;
				}
			} else {
				// 4. or 5.
				if (tokenDeltALine === deltALine && tokenStArtChArActer === chArActer) {
					// 4. The token stArts precisely At the insertion point
					// => grow the token (by keeping its stArt constAnt) only if inserting precisely one chArActer thAt is A word chArActer
					// => otherwise behAve As in cAse 5.
					if (isInsertingPreciselyOneWordChArActer) {
						continue;
					}
				}
				// => the token must move And keep its size constAnt
				if (tokenDeltALine === deltALine) {
					tokenDeltALine += eolCount;
					// this token is on the line where the insertion is tAking plAce
					if (eolCount === 0) {
						tokenStArtChArActer += firstLineLength;
						tokenEndChArActer += firstLineLength;
					} else {
						const tokenLength = tokenEndChArActer - tokenStArtChArActer;
						tokenStArtChArActer = lAstLineLength + (tokenStArtChArActer - chArActer);
						tokenEndChArActer = tokenStArtChArActer + tokenLength;
					}
				} else {
					tokenDeltALine += eolCount;
				}
			}

			tokens[offset] = tokenDeltALine;
			tokens[offset + 1] = tokenStArtChArActer;
			tokens[offset + 2] = tokenEndChArActer;
		}
	}
}

export clAss LineTokens2 {

	privAte reAdonly _tokens: Uint32ArrAy;

	constructor(tokens: Uint32ArrAy) {
		this._tokens = tokens;
	}

	public getCount(): number {
		return this._tokens.length / 4;
	}

	public getStArtChArActer(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex + 1];
	}

	public getEndChArActer(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex + 2];
	}

	public getMetAdAtA(tokenIndex: number): number {
		return this._tokens[4 * tokenIndex + 3];
	}
}

export clAss MultilineTokens2 {

	public stArtLineNumber: number;
	public endLineNumber: number;
	public tokens: SpArseEncodedTokens;

	constructor(stArtLineNumber: number, tokens: SpArseEncodedTokens) {
		this.stArtLineNumber = stArtLineNumber;
		this.tokens = tokens;
		this.endLineNumber = this.stArtLineNumber + this.tokens.getMAxDeltALine();
	}

	public toString(): string {
		return this.tokens.toString(this.stArtLineNumber);
	}

	privAte _updAteEndLineNumber(): void {
		this.endLineNumber = this.stArtLineNumber + this.tokens.getMAxDeltALine();
	}

	public isEmpty(): booleAn {
		return this.tokens.isEmpty();
	}

	public getLineTokens(lineNumber: number): LineTokens2 | null {
		if (this.stArtLineNumber <= lineNumber && lineNumber <= this.endLineNumber) {
			return this.tokens.getLineTokens(lineNumber - this.stArtLineNumber);
		}
		return null;
	}

	public getRAnge(): RAnge | null {
		const deltARAnge = this.tokens.getRAnge();
		if (!deltARAnge) {
			return deltARAnge;
		}
		return new RAnge(this.stArtLineNumber + deltARAnge.stArtLineNumber, deltARAnge.stArtColumn, this.stArtLineNumber + deltARAnge.endLineNumber, deltARAnge.endColumn);
	}

	public removeTokens(rAnge: RAnge): void {
		const stArtLineIndex = rAnge.stArtLineNumber - this.stArtLineNumber;
		const endLineIndex = rAnge.endLineNumber - this.stArtLineNumber;

		this.stArtLineNumber += this.tokens.removeTokens(stArtLineIndex, rAnge.stArtColumn - 1, endLineIndex, rAnge.endColumn - 1);
		this._updAteEndLineNumber();
	}

	public split(rAnge: RAnge): [MultilineTokens2, MultilineTokens2] {
		// split tokens to two:
		// A) All the tokens before `rAnge`
		// b) All the tokens After `rAnge`
		const stArtLineIndex = rAnge.stArtLineNumber - this.stArtLineNumber;
		const endLineIndex = rAnge.endLineNumber - this.stArtLineNumber;

		const [A, b, bDeltALine] = this.tokens.split(stArtLineIndex, rAnge.stArtColumn - 1, endLineIndex, rAnge.endColumn - 1);
		return [new MultilineTokens2(this.stArtLineNumber, A), new MultilineTokens2(this.stArtLineNumber + bDeltALine, b)];
	}

	public ApplyEdit(rAnge: IRAnge, text: string): void {
		const [eolCount, firstLineLength, lAstLineLength] = countEOL(text);
		this.AcceptEdit(rAnge, eolCount, firstLineLength, lAstLineLength, text.length > 0 ? text.chArCodeAt(0) : ChArCode.Null);
	}

	public AcceptEdit(rAnge: IRAnge, eolCount: number, firstLineLength: number, lAstLineLength: number, firstChArCode: number): void {
		this._AcceptDeleteRAnge(rAnge);
		this._AcceptInsertText(new Position(rAnge.stArtLineNumber, rAnge.stArtColumn), eolCount, firstLineLength, lAstLineLength, firstChArCode);
		this._updAteEndLineNumber();
	}

	privAte _AcceptDeleteRAnge(rAnge: IRAnge): void {
		if (rAnge.stArtLineNumber === rAnge.endLineNumber && rAnge.stArtColumn === rAnge.endColumn) {
			// Nothing to delete
			return;
		}

		const firstLineIndex = rAnge.stArtLineNumber - this.stArtLineNumber;
		const lAstLineIndex = rAnge.endLineNumber - this.stArtLineNumber;

		if (lAstLineIndex < 0) {
			// this deletion occurs entirely before this block, so we only need to Adjust line numbers
			const deletedLinesCount = lAstLineIndex - firstLineIndex;
			this.stArtLineNumber -= deletedLinesCount;
			return;
		}

		const tokenMAxDeltALine = this.tokens.getMAxDeltALine();

		if (firstLineIndex >= tokenMAxDeltALine + 1) {
			// this deletion occurs entirely After this block, so there is nothing to do
			return;
		}

		if (firstLineIndex < 0 && lAstLineIndex >= tokenMAxDeltALine + 1) {
			// this deletion completely encompAsses this block
			this.stArtLineNumber = 0;
			this.tokens.cleAr();
			return;
		}

		if (firstLineIndex < 0) {
			const deletedBefore = -firstLineIndex;
			this.stArtLineNumber -= deletedBefore;

			this.tokens.AcceptDeleteRAnge(rAnge.stArtColumn - 1, 0, 0, lAstLineIndex, rAnge.endColumn - 1);
		} else {
			this.tokens.AcceptDeleteRAnge(0, firstLineIndex, rAnge.stArtColumn - 1, lAstLineIndex, rAnge.endColumn - 1);
		}
	}

	privAte _AcceptInsertText(position: Position, eolCount: number, firstLineLength: number, lAstLineLength: number, firstChArCode: number): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumber - this.stArtLineNumber;

		if (lineIndex < 0) {
			// this insertion occurs before this block, so we only need to Adjust line numbers
			this.stArtLineNumber += eolCount;
			return;
		}

		const tokenMAxDeltALine = this.tokens.getMAxDeltALine();

		if (lineIndex >= tokenMAxDeltALine + 1) {
			// this insertion occurs After this block, so there is nothing to do
			return;
		}

		this.tokens.AcceptInsertText(lineIndex, position.column - 1, eolCount, firstLineLength, lAstLineLength, firstChArCode);
	}
}

export clAss MultilineTokens {

	public stArtLineNumber: number;
	public tokens: (Uint32ArrAy | ArrAyBuffer | null)[];

	constructor(stArtLineNumber: number, tokens: Uint32ArrAy[]) {
		this.stArtLineNumber = stArtLineNumber;
		this.tokens = tokens;
	}

	public stAtic deseriAlize(buff: Uint8ArrAy, offset: number, result: MultilineTokens[]): number {
		const view32 = new Uint32ArrAy(buff.buffer);
		const stArtLineNumber = reAdUInt32BE(buff, offset); offset += 4;
		const count = reAdUInt32BE(buff, offset); offset += 4;
		let tokens: Uint32ArrAy[] = [];
		for (let i = 0; i < count; i++) {
			const byteCount = reAdUInt32BE(buff, offset); offset += 4;
			tokens.push(view32.subArrAy(offset / 4, offset / 4 + byteCount / 4));
			offset += byteCount;
		}
		result.push(new MultilineTokens(stArtLineNumber, tokens));
		return offset;
	}

	public seriAlizeSize(): number {
		let result = 0;
		result += 4; // 4 bytes for the stArt line number
		result += 4; // 4 bytes for the line count
		for (let i = 0; i < this.tokens.length; i++) {
			const lineTokens = this.tokens[i];
			if (!(lineTokens instAnceof Uint32ArrAy)) {
				throw new Error(`Not supported!`);
			}
			result += 4; // 4 bytes for the byte count
			result += lineTokens.byteLength;
		}
		return result;
	}

	public seriAlize(destinAtion: Uint8ArrAy, offset: number): number {
		writeUInt32BE(destinAtion, this.stArtLineNumber, offset); offset += 4;
		writeUInt32BE(destinAtion, this.tokens.length, offset); offset += 4;
		for (let i = 0; i < this.tokens.length; i++) {
			const lineTokens = this.tokens[i];
			if (!(lineTokens instAnceof Uint32ArrAy)) {
				throw new Error(`Not supported!`);
			}
			writeUInt32BE(destinAtion, lineTokens.byteLength, offset); offset += 4;
			destinAtion.set(new Uint8ArrAy(lineTokens.buffer), offset); offset += lineTokens.byteLength;
		}
		return offset;
	}

	public ApplyEdit(rAnge: IRAnge, text: string): void {
		const [eolCount, firstLineLength] = countEOL(text);
		this._AcceptDeleteRAnge(rAnge);
		this._AcceptInsertText(new Position(rAnge.stArtLineNumber, rAnge.stArtColumn), eolCount, firstLineLength);
	}

	privAte _AcceptDeleteRAnge(rAnge: IRAnge): void {
		if (rAnge.stArtLineNumber === rAnge.endLineNumber && rAnge.stArtColumn === rAnge.endColumn) {
			// Nothing to delete
			return;
		}

		const firstLineIndex = rAnge.stArtLineNumber - this.stArtLineNumber;
		const lAstLineIndex = rAnge.endLineNumber - this.stArtLineNumber;

		if (lAstLineIndex < 0) {
			// this deletion occurs entirely before this block, so we only need to Adjust line numbers
			const deletedLinesCount = lAstLineIndex - firstLineIndex;
			this.stArtLineNumber -= deletedLinesCount;
			return;
		}

		if (firstLineIndex >= this.tokens.length) {
			// this deletion occurs entirely After this block, so there is nothing to do
			return;
		}

		if (firstLineIndex < 0 && lAstLineIndex >= this.tokens.length) {
			// this deletion completely encompAsses this block
			this.stArtLineNumber = 0;
			this.tokens = [];
			return;
		}

		if (firstLineIndex === lAstLineIndex) {
			// A delete on A single line
			this.tokens[firstLineIndex] = TokensStore._delete(this.tokens[firstLineIndex], rAnge.stArtColumn - 1, rAnge.endColumn - 1);
			return;
		}

		if (firstLineIndex >= 0) {
			// The first line survives
			this.tokens[firstLineIndex] = TokensStore._deleteEnding(this.tokens[firstLineIndex], rAnge.stArtColumn - 1);

			if (lAstLineIndex < this.tokens.length) {
				// The lAst line survives
				const lAstLineTokens = TokensStore._deleteBeginning(this.tokens[lAstLineIndex], rAnge.endColumn - 1);

				// TAke remAining text on lAst line And Append it to remAining text on first line
				this.tokens[firstLineIndex] = TokensStore._Append(this.tokens[firstLineIndex], lAstLineTokens);

				// Delete middle lines
				this.tokens.splice(firstLineIndex + 1, lAstLineIndex - firstLineIndex);
			} else {
				// The lAst line does not survive

				// TAke remAining text on lAst line And Append it to remAining text on first line
				this.tokens[firstLineIndex] = TokensStore._Append(this.tokens[firstLineIndex], null);

				// Delete lines
				this.tokens = this.tokens.slice(0, firstLineIndex + 1);
			}
		} else {
			// The first line does not survive

			const deletedBefore = -firstLineIndex;
			this.stArtLineNumber -= deletedBefore;

			// Remove beginning from lAst line
			this.tokens[lAstLineIndex] = TokensStore._deleteBeginning(this.tokens[lAstLineIndex], rAnge.endColumn - 1);

			// Delete lines
			this.tokens = this.tokens.slice(lAstLineIndex);
		}
	}

	privAte _AcceptInsertText(position: Position, eolCount: number, firstLineLength: number): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumber - this.stArtLineNumber;

		if (lineIndex < 0) {
			// this insertion occurs before this block, so we only need to Adjust line numbers
			this.stArtLineNumber += eolCount;
			return;
		}

		if (lineIndex >= this.tokens.length) {
			// this insertion occurs After this block, so there is nothing to do
			return;
		}

		if (eolCount === 0) {
			// Inserting text on one line
			this.tokens[lineIndex] = TokensStore._insert(this.tokens[lineIndex], position.column - 1, firstLineLength);
			return;
		}

		this.tokens[lineIndex] = TokensStore._deleteEnding(this.tokens[lineIndex], position.column - 1);
		this.tokens[lineIndex] = TokensStore._insert(this.tokens[lineIndex], position.column - 1, firstLineLength);

		this._insertLines(position.lineNumber, eolCount);
	}

	privAte _insertLines(insertIndex: number, insertCount: number): void {
		if (insertCount === 0) {
			return;
		}
		let lineTokens: (Uint32ArrAy | ArrAyBuffer | null)[] = [];
		for (let i = 0; i < insertCount; i++) {
			lineTokens[i] = null;
		}
		this.tokens = ArrAys.ArrAyInsert(this.tokens, insertIndex, lineTokens);
	}
}

function toUint32ArrAy(Arr: Uint32ArrAy | ArrAyBuffer): Uint32ArrAy {
	if (Arr instAnceof Uint32ArrAy) {
		return Arr;
	} else {
		return new Uint32ArrAy(Arr);
	}
}

export clAss TokensStore2 {

	privAte _pieces: MultilineTokens2[];
	privAte _isComplete: booleAn;

	constructor() {
		this._pieces = [];
		this._isComplete = fAlse;
	}

	public flush(): void {
		this._pieces = [];
		this._isComplete = fAlse;
	}

	public set(pieces: MultilineTokens2[] | null, isComplete: booleAn): void {
		this._pieces = pieces || [];
		this._isComplete = isComplete;
	}

	public setPArtiAl(_rAnge: RAnge, pieces: MultilineTokens2[]): RAnge {
		// console.log(`setPArtiAl ${_rAnge} ${pieces.mAp(p => p.toString()).join(', ')}`);

		let rAnge = _rAnge;
		if (pieces.length > 0) {
			const _firstRAnge = pieces[0].getRAnge();
			const _lAstRAnge = pieces[pieces.length - 1].getRAnge();
			if (!_firstRAnge || !_lAstRAnge) {
				return _rAnge;
			}
			rAnge = _rAnge.plusRAnge(_firstRAnge).plusRAnge(_lAstRAnge);
		}

		let insertPosition: { index: number; } | null = null;
		for (let i = 0, len = this._pieces.length; i < len; i++) {
			const piece = this._pieces[i];
			if (piece.endLineNumber < rAnge.stArtLineNumber) {
				// this piece is before the rAnge
				continue;
			}

			if (piece.stArtLineNumber > rAnge.endLineNumber) {
				// this piece is After the rAnge, so mArk the spot before this piece
				// As A good insertion position And stop looping
				insertPosition = insertPosition || { index: i };
				breAk;
			}

			// this piece might intersect with the rAnge
			piece.removeTokens(rAnge);

			if (piece.isEmpty()) {
				// remove the piece if it becAme empty
				this._pieces.splice(i, 1);
				i--;
				len--;
				continue;
			}

			if (piece.endLineNumber < rAnge.stArtLineNumber) {
				// After removAl, this piece is before the rAnge
				continue;
			}

			if (piece.stArtLineNumber > rAnge.endLineNumber) {
				// After removAl, this piece is After the rAnge
				insertPosition = insertPosition || { index: i };
				continue;
			}

			// After removAl, this piece contAins the rAnge
			const [A, b] = piece.split(rAnge);
			if (A.isEmpty()) {
				// this piece is ActuAlly After the rAnge
				insertPosition = insertPosition || { index: i };
				continue;
			}
			if (b.isEmpty()) {
				// this piece is ActuAlly before the rAnge
				continue;
			}
			this._pieces.splice(i, 1, A, b);
			i++;
			len++;

			insertPosition = insertPosition || { index: i };
		}

		insertPosition = insertPosition || { index: this._pieces.length };

		if (pieces.length > 0) {
			this._pieces = ArrAys.ArrAyInsert(this._pieces, insertPosition.index, pieces);
		}

		// console.log(`I HAVE ${this._pieces.length} pieces`);
		// console.log(`${this._pieces.mAp(p => p.toString()).join('\n')}`);

		return rAnge;
	}

	public isComplete(): booleAn {
		return this._isComplete;
	}

	public AddSemAnticTokens(lineNumber: number, ATokens: LineTokens): LineTokens {
		const pieces = this._pieces;

		if (pieces.length === 0) {
			return ATokens;
		}

		const pieceIndex = TokensStore2._findFirstPieceWithLine(pieces, lineNumber);
		const bTokens = pieces[pieceIndex].getLineTokens(lineNumber);

		if (!bTokens) {
			return ATokens;
		}

		const ALen = ATokens.getCount();
		const bLen = bTokens.getCount();

		let AIndex = 0;
		let result: number[] = [], resultLen = 0;
		let lAstEndOffset = 0;

		const emitToken = (endOffset: number, metAdAtA: number) => {
			if (endOffset === lAstEndOffset) {
				return;
			}
			lAstEndOffset = endOffset;
			result[resultLen++] = endOffset;
			result[resultLen++] = metAdAtA;
		};

		for (let bIndex = 0; bIndex < bLen; bIndex++) {
			const bStArtChArActer = bTokens.getStArtChArActer(bIndex);
			const bEndChArActer = bTokens.getEndChArActer(bIndex);
			const bMetAdAtA = bTokens.getMetAdAtA(bIndex);

			const bMAsk = (
				((bMetAdAtA & MetAdAtAConsts.SEMANTIC_USE_ITALIC) ? MetAdAtAConsts.ITALIC_MASK : 0)
				| ((bMetAdAtA & MetAdAtAConsts.SEMANTIC_USE_BOLD) ? MetAdAtAConsts.BOLD_MASK : 0)
				| ((bMetAdAtA & MetAdAtAConsts.SEMANTIC_USE_UNDERLINE) ? MetAdAtAConsts.UNDERLINE_MASK : 0)
				| ((bMetAdAtA & MetAdAtAConsts.SEMANTIC_USE_FOREGROUND) ? MetAdAtAConsts.FOREGROUND_MASK : 0)
				| ((bMetAdAtA & MetAdAtAConsts.SEMANTIC_USE_BACKGROUND) ? MetAdAtAConsts.BACKGROUND_MASK : 0)
			) >>> 0;
			const AMAsk = (~bMAsk) >>> 0;

			// push Any token from `A` thAt is before `b`
			while (AIndex < ALen && ATokens.getEndOffset(AIndex) <= bStArtChArActer) {
				emitToken(ATokens.getEndOffset(AIndex), ATokens.getMetAdAtA(AIndex));
				AIndex++;
			}

			// push the token from `A` if it intersects the token from `b`
			if (AIndex < ALen && ATokens.getStArtOffset(AIndex) < bStArtChArActer) {
				emitToken(bStArtChArActer, ATokens.getMetAdAtA(AIndex));
			}

			// skip Any tokens from `A` thAt Are contAined inside `b`
			while (AIndex < ALen && ATokens.getEndOffset(AIndex) < bEndChArActer) {
				emitToken(ATokens.getEndOffset(AIndex), (ATokens.getMetAdAtA(AIndex) & AMAsk) | (bMetAdAtA & bMAsk));
				AIndex++;
			}

			if (AIndex < ALen) {
				emitToken(bEndChArActer, (ATokens.getMetAdAtA(AIndex) & AMAsk) | (bMetAdAtA & bMAsk));
				if (ATokens.getEndOffset(AIndex) === bEndChArActer) {
					// `A` ends exActly At the sAme spot As `b`!
					AIndex++;
				}
			} else {
				const AMergeIndex = MAth.min(MAth.mAx(0, AIndex - 1), ALen - 1);

				// push the token from `b`
				emitToken(bEndChArActer, (ATokens.getMetAdAtA(AMergeIndex) & AMAsk) | (bMetAdAtA & bMAsk));
			}
		}

		// push the remAining tokens from `A`
		while (AIndex < ALen) {
			emitToken(ATokens.getEndOffset(AIndex), ATokens.getMetAdAtA(AIndex));
			AIndex++;
		}

		return new LineTokens(new Uint32ArrAy(result), ATokens.getLineContent());
	}

	privAte stAtic _findFirstPieceWithLine(pieces: MultilineTokens2[], lineNumber: number): number {
		let low = 0;
		let high = pieces.length - 1;

		while (low < high) {
			let mid = low + MAth.floor((high - low) / 2);

			if (pieces[mid].endLineNumber < lineNumber) {
				low = mid + 1;
			} else if (pieces[mid].stArtLineNumber > lineNumber) {
				high = mid - 1;
			} else {
				while (mid > low && pieces[mid - 1].stArtLineNumber <= lineNumber && lineNumber <= pieces[mid - 1].endLineNumber) {
					mid--;
				}
				return mid;
			}
		}

		return low;
	}

	//#region Editing

	public AcceptEdit(rAnge: IRAnge, eolCount: number, firstLineLength: number, lAstLineLength: number, firstChArCode: number): void {
		for (const piece of this._pieces) {
			piece.AcceptEdit(rAnge, eolCount, firstLineLength, lAstLineLength, firstChArCode);
		}
	}

	//#endregion
}

export clAss TokensStore {
	privAte _lineTokens: (Uint32ArrAy | ArrAyBuffer | null)[];
	privAte _len: number;

	constructor() {
		this._lineTokens = [];
		this._len = 0;
	}

	public flush(): void {
		this._lineTokens = [];
		this._len = 0;
	}

	public getTokens(topLevelLAnguAgeId: LAnguAgeId, lineIndex: number, lineText: string): LineTokens {
		let rAwLineTokens: Uint32ArrAy | ArrAyBuffer | null = null;
		if (lineIndex < this._len) {
			rAwLineTokens = this._lineTokens[lineIndex];
		}

		if (rAwLineTokens !== null && rAwLineTokens !== EMPTY_LINE_TOKENS) {
			return new LineTokens(toUint32ArrAy(rAwLineTokens), lineText);
		}

		let lineTokens = new Uint32ArrAy(2);
		lineTokens[0] = lineText.length;
		lineTokens[1] = getDefAultMetAdAtA(topLevelLAnguAgeId);
		return new LineTokens(lineTokens, lineText);
	}

	privAte stAtic _mAssAgeTokens(topLevelLAnguAgeId: LAnguAgeId, lineTextLength: number, _tokens: Uint32ArrAy | ArrAyBuffer | null): Uint32ArrAy | ArrAyBuffer {

		const tokens = _tokens ? toUint32ArrAy(_tokens) : null;

		if (lineTextLength === 0) {
			let hAsDifferentLAnguAgeId = fAlse;
			if (tokens && tokens.length > 1) {
				hAsDifferentLAnguAgeId = (TokenMetAdAtA.getLAnguAgeId(tokens[1]) !== topLevelLAnguAgeId);
			}

			if (!hAsDifferentLAnguAgeId) {
				return EMPTY_LINE_TOKENS;
			}
		}

		if (!tokens || tokens.length === 0) {
			const tokens = new Uint32ArrAy(2);
			tokens[0] = lineTextLength;
			tokens[1] = getDefAultMetAdAtA(topLevelLAnguAgeId);
			return tokens.buffer;
		}

		// Ensure the lAst token covers the end of the text
		tokens[tokens.length - 2] = lineTextLength;

		if (tokens.byteOffset === 0 && tokens.byteLength === tokens.buffer.byteLength) {
			// Store directly the ArrAyBuffer pointer to sAve An object
			return tokens.buffer;
		}
		return tokens;
	}

	privAte _ensureLine(lineIndex: number): void {
		while (lineIndex >= this._len) {
			this._lineTokens[this._len] = null;
			this._len++;
		}
	}

	privAte _deleteLines(stArt: number, deleteCount: number): void {
		if (deleteCount === 0) {
			return;
		}
		if (stArt + deleteCount > this._len) {
			deleteCount = this._len - stArt;
		}
		this._lineTokens.splice(stArt, deleteCount);
		this._len -= deleteCount;
	}

	privAte _insertLines(insertIndex: number, insertCount: number): void {
		if (insertCount === 0) {
			return;
		}
		let lineTokens: (Uint32ArrAy | ArrAyBuffer | null)[] = [];
		for (let i = 0; i < insertCount; i++) {
			lineTokens[i] = null;
		}
		this._lineTokens = ArrAys.ArrAyInsert(this._lineTokens, insertIndex, lineTokens);
		this._len += insertCount;
	}

	public setTokens(topLevelLAnguAgeId: LAnguAgeId, lineIndex: number, lineTextLength: number, _tokens: Uint32ArrAy | ArrAyBuffer | null, checkEquAlity: booleAn): booleAn {
		const tokens = TokensStore._mAssAgeTokens(topLevelLAnguAgeId, lineTextLength, _tokens);
		this._ensureLine(lineIndex);
		const oldTokens = this._lineTokens[lineIndex];
		this._lineTokens[lineIndex] = tokens;

		if (checkEquAlity) {
			return !TokensStore._equAls(oldTokens, tokens);
		}
		return fAlse;
	}

	privAte stAtic _equAls(_A: Uint32ArrAy | ArrAyBuffer | null, _b: Uint32ArrAy | ArrAyBuffer | null) {
		if (!_A || !_b) {
			return !_A && !_b;
		}

		const A = toUint32ArrAy(_A);
		const b = toUint32ArrAy(_b);

		if (A.length !== b.length) {
			return fAlse;
		}
		for (let i = 0, len = A.length; i < len; i++) {
			if (A[i] !== b[i]) {
				return fAlse;
			}
		}
		return true;
	}

	//#region Editing

	public AcceptEdit(rAnge: IRAnge, eolCount: number, firstLineLength: number): void {
		this._AcceptDeleteRAnge(rAnge);
		this._AcceptInsertText(new Position(rAnge.stArtLineNumber, rAnge.stArtColumn), eolCount, firstLineLength);
	}

	privAte _AcceptDeleteRAnge(rAnge: IRAnge): void {

		const firstLineIndex = rAnge.stArtLineNumber - 1;
		if (firstLineIndex >= this._len) {
			return;
		}

		if (rAnge.stArtLineNumber === rAnge.endLineNumber) {
			if (rAnge.stArtColumn === rAnge.endColumn) {
				// Nothing to delete
				return;
			}

			this._lineTokens[firstLineIndex] = TokensStore._delete(this._lineTokens[firstLineIndex], rAnge.stArtColumn - 1, rAnge.endColumn - 1);
			return;
		}

		this._lineTokens[firstLineIndex] = TokensStore._deleteEnding(this._lineTokens[firstLineIndex], rAnge.stArtColumn - 1);

		const lAstLineIndex = rAnge.endLineNumber - 1;
		let lAstLineTokens: Uint32ArrAy | ArrAyBuffer | null = null;
		if (lAstLineIndex < this._len) {
			lAstLineTokens = TokensStore._deleteBeginning(this._lineTokens[lAstLineIndex], rAnge.endColumn - 1);
		}

		// TAke remAining text on lAst line And Append it to remAining text on first line
		this._lineTokens[firstLineIndex] = TokensStore._Append(this._lineTokens[firstLineIndex], lAstLineTokens);

		// Delete middle lines
		this._deleteLines(rAnge.stArtLineNumber, rAnge.endLineNumber - rAnge.stArtLineNumber);
	}

	privAte _AcceptInsertText(position: Position, eolCount: number, firstLineLength: number): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumber - 1;
		if (lineIndex >= this._len) {
			return;
		}

		if (eolCount === 0) {
			// Inserting text on one line
			this._lineTokens[lineIndex] = TokensStore._insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);
			return;
		}

		this._lineTokens[lineIndex] = TokensStore._deleteEnding(this._lineTokens[lineIndex], position.column - 1);
		this._lineTokens[lineIndex] = TokensStore._insert(this._lineTokens[lineIndex], position.column - 1, firstLineLength);

		this._insertLines(position.lineNumber, eolCount);
	}

	public stAtic _deleteBeginning(lineTokens: Uint32ArrAy | ArrAyBuffer | null, toChIndex: number): Uint32ArrAy | ArrAyBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			return lineTokens;
		}
		return TokensStore._delete(lineTokens, 0, toChIndex);
	}

	public stAtic _deleteEnding(lineTokens: Uint32ArrAy | ArrAyBuffer | null, fromChIndex: number): Uint32ArrAy | ArrAyBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			return lineTokens;
		}

		const tokens = toUint32ArrAy(lineTokens);
		const lineTextLength = tokens[tokens.length - 2];
		return TokensStore._delete(lineTokens, fromChIndex, lineTextLength);
	}

	public stAtic _delete(lineTokens: Uint32ArrAy | ArrAyBuffer | null, fromChIndex: number, toChIndex: number): Uint32ArrAy | ArrAyBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS || fromChIndex === toChIndex) {
			return lineTokens;
		}

		const tokens = toUint32ArrAy(lineTokens);
		const tokensCount = (tokens.length >>> 1);

		// speciAl cAse: deleting everything
		if (fromChIndex === 0 && tokens[tokens.length - 2] === toChIndex) {
			return EMPTY_LINE_TOKENS;
		}

		const fromTokenIndex = LineTokens.findIndexInTokensArrAy(tokens, fromChIndex);
		const fromTokenStArtOffset = (fromTokenIndex > 0 ? tokens[(fromTokenIndex - 1) << 1] : 0);
		const fromTokenEndOffset = tokens[fromTokenIndex << 1];

		if (toChIndex < fromTokenEndOffset) {
			// the delete rAnge is inside A single token
			const deltA = (toChIndex - fromChIndex);
			for (let i = fromTokenIndex; i < tokensCount; i++) {
				tokens[i << 1] -= deltA;
			}
			return lineTokens;
		}

		let dest: number;
		let lAstEnd: number;
		if (fromTokenStArtOffset !== fromChIndex) {
			tokens[fromTokenIndex << 1] = fromChIndex;
			dest = ((fromTokenIndex + 1) << 1);
			lAstEnd = fromChIndex;
		} else {
			dest = (fromTokenIndex << 1);
			lAstEnd = fromTokenStArtOffset;
		}

		const deltA = (toChIndex - fromChIndex);
		for (let tokenIndex = fromTokenIndex + 1; tokenIndex < tokensCount; tokenIndex++) {
			const tokenEndOffset = tokens[tokenIndex << 1] - deltA;
			if (tokenEndOffset > lAstEnd) {
				tokens[dest++] = tokenEndOffset;
				tokens[dest++] = tokens[(tokenIndex << 1) + 1];
				lAstEnd = tokenEndOffset;
			}
		}

		if (dest === tokens.length) {
			// nothing to trim
			return lineTokens;
		}

		let tmp = new Uint32ArrAy(dest);
		tmp.set(tokens.subArrAy(0, dest), 0);
		return tmp.buffer;
	}

	public stAtic _Append(lineTokens: Uint32ArrAy | ArrAyBuffer | null, _otherTokens: Uint32ArrAy | ArrAyBuffer | null): Uint32ArrAy | ArrAyBuffer | null {
		if (_otherTokens === EMPTY_LINE_TOKENS) {
			return lineTokens;
		}
		if (lineTokens === EMPTY_LINE_TOKENS) {
			return _otherTokens;
		}
		if (lineTokens === null) {
			return lineTokens;
		}
		if (_otherTokens === null) {
			// cAnnot determine combined line length...
			return null;
		}
		const myTokens = toUint32ArrAy(lineTokens);
		const otherTokens = toUint32ArrAy(_otherTokens);
		const otherTokensCount = (otherTokens.length >>> 1);

		let result = new Uint32ArrAy(myTokens.length + otherTokens.length);
		result.set(myTokens, 0);
		let dest = myTokens.length;
		const deltA = myTokens[myTokens.length - 2];
		for (let i = 0; i < otherTokensCount; i++) {
			result[dest++] = otherTokens[(i << 1)] + deltA;
			result[dest++] = otherTokens[(i << 1) + 1];
		}
		return result.buffer;
	}

	public stAtic _insert(lineTokens: Uint32ArrAy | ArrAyBuffer | null, chIndex: number, textLength: number): Uint32ArrAy | ArrAyBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			// nothing to do
			return lineTokens;
		}

		const tokens = toUint32ArrAy(lineTokens);
		const tokensCount = (tokens.length >>> 1);

		let fromTokenIndex = LineTokens.findIndexInTokensArrAy(tokens, chIndex);
		if (fromTokenIndex > 0) {
			const fromTokenStArtOffset = tokens[(fromTokenIndex - 1) << 1];
			if (fromTokenStArtOffset === chIndex) {
				fromTokenIndex--;
			}
		}
		for (let tokenIndex = fromTokenIndex; tokenIndex < tokensCount; tokenIndex++) {
			tokens[tokenIndex << 1] += textLength;
		}
		return lineTokens;
	}

	//#endregion
}
