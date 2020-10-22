/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as arrays from 'vs/Base/common/arrays';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { ColorId, FontStyle, LanguageId, MetadataConsts, StandardTokenType, TokenMetadata } from 'vs/editor/common/modes';
import { writeUInt32BE, readUInt32BE } from 'vs/Base/common/Buffer';
import { CharCode } from 'vs/Base/common/charCode';

export const enum StringEOL {
	Unknown = 0,
	Invalid = 3,
	LF = 1,
	CRLF = 2
}

export function countEOL(text: string): [numBer, numBer, numBer, StringEOL] {
	let eolCount = 0;
	let firstLineLength = 0;
	let lastLineStart = 0;
	let eol: StringEOL = StringEOL.Unknown;
	for (let i = 0, len = text.length; i < len; i++) {
		const chr = text.charCodeAt(i);

		if (chr === CharCode.CarriageReturn) {
			if (eolCount === 0) {
				firstLineLength = i;
			}
			eolCount++;
			if (i + 1 < len && text.charCodeAt(i + 1) === CharCode.LineFeed) {
				// \r\n... case
				eol |= StringEOL.CRLF;
				i++; // skip \n
			} else {
				// \r... case
				eol |= StringEOL.Invalid;
			}
			lastLineStart = i + 1;
		} else if (chr === CharCode.LineFeed) {
			// \n... case
			eol |= StringEOL.LF;
			if (eolCount === 0) {
				firstLineLength = i;
			}
			eolCount++;
			lastLineStart = i + 1;
		}
	}
	if (eolCount === 0) {
		firstLineLength = text.length;
	}
	return [eolCount, firstLineLength, text.length - lastLineStart, eol];
}

function getDefaultMetadata(topLevelLanguageId: LanguageId): numBer {
	return (
		(topLevelLanguageId << MetadataConsts.LANGUAGEID_OFFSET)
		| (StandardTokenType.Other << MetadataConsts.TOKEN_TYPE_OFFSET)
		| (FontStyle.None << MetadataConsts.FONT_STYLE_OFFSET)
		| (ColorId.DefaultForeground << MetadataConsts.FOREGROUND_OFFSET)
		| (ColorId.DefaultBackground << MetadataConsts.BACKGROUND_OFFSET)
	) >>> 0;
}

const EMPTY_LINE_TOKENS = (new Uint32Array(0)).Buffer;

export class MultilineTokensBuilder {

	puBlic readonly tokens: MultilineTokens[];

	constructor() {
		this.tokens = [];
	}

	puBlic add(lineNumBer: numBer, lineTokens: Uint32Array): void {
		if (this.tokens.length > 0) {
			const last = this.tokens[this.tokens.length - 1];
			const lastLineNumBer = last.startLineNumBer + last.tokens.length - 1;
			if (lastLineNumBer + 1 === lineNumBer) {
				// append
				last.tokens.push(lineTokens);
				return;
			}
		}
		this.tokens.push(new MultilineTokens(lineNumBer, [lineTokens]));
	}

	puBlic static deserialize(Buff: Uint8Array): MultilineTokens[] {
		let offset = 0;
		const count = readUInt32BE(Buff, offset); offset += 4;
		let result: MultilineTokens[] = [];
		for (let i = 0; i < count; i++) {
			offset = MultilineTokens.deserialize(Buff, offset, result);
		}
		return result;
	}

	puBlic serialize(): Uint8Array {
		const size = this._serializeSize();
		const result = new Uint8Array(size);
		this._serialize(result);
		return result;
	}

	private _serializeSize(): numBer {
		let result = 0;
		result += 4; // 4 Bytes for the count
		for (let i = 0; i < this.tokens.length; i++) {
			result += this.tokens[i].serializeSize();
		}
		return result;
	}

	private _serialize(destination: Uint8Array): void {
		let offset = 0;
		writeUInt32BE(destination, this.tokens.length, offset); offset += 4;
		for (let i = 0; i < this.tokens.length; i++) {
			offset = this.tokens[i].serialize(destination, offset);
		}
	}
}

export class SparseEncodedTokens {
	/**
	 * The encoding of tokens is:
	 *  4*i    deltaLine (from `startLineNumBer`)
	 *  4*i+1  startCharacter (from the line start)
	 *  4*i+2  endCharacter (from the line start)
	 *  4*i+3  metadata
	 */
	private readonly _tokens: Uint32Array;
	private _tokenCount: numBer;

	constructor(tokens: Uint32Array) {
		this._tokens = tokens;
		this._tokenCount = tokens.length / 4;
	}

	puBlic toString(startLineNumBer: numBer): string {
		let pieces: string[] = [];
		for (let i = 0; i < this._tokenCount; i++) {
			pieces.push(`(${this._getDeltaLine(i) + startLineNumBer},${this._getStartCharacter(i)}-${this._getEndCharacter(i)})`);
		}
		return `[${pieces.join(',')}]`;
	}

	puBlic getMaxDeltaLine(): numBer {
		const tokenCount = this._getTokenCount();
		if (tokenCount === 0) {
			return -1;
		}
		return this._getDeltaLine(tokenCount - 1);
	}

	puBlic getRange(): Range | null {
		const tokenCount = this._getTokenCount();
		if (tokenCount === 0) {
			return null;
		}
		const startChar = this._getStartCharacter(0);
		const maxDeltaLine = this._getDeltaLine(tokenCount - 1);
		const endChar = this._getEndCharacter(tokenCount - 1);
		return new Range(0, startChar + 1, maxDeltaLine, endChar + 1);
	}

	private _getTokenCount(): numBer {
		return this._tokenCount;
	}

	private _getDeltaLine(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex];
	}

	private _getStartCharacter(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex + 1];
	}

	private _getEndCharacter(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex + 2];
	}

	puBlic isEmpty(): Boolean {
		return (this._getTokenCount() === 0);
	}

	puBlic getLineTokens(deltaLine: numBer): LineTokens2 | null {
		let low = 0;
		let high = this._getTokenCount() - 1;

		while (low < high) {
			const mid = low + Math.floor((high - low) / 2);
			const midDeltaLine = this._getDeltaLine(mid);

			if (midDeltaLine < deltaLine) {
				low = mid + 1;
			} else if (midDeltaLine > deltaLine) {
				high = mid - 1;
			} else {
				let min = mid;
				while (min > low && this._getDeltaLine(min - 1) === deltaLine) {
					min--;
				}
				let max = mid;
				while (max < high && this._getDeltaLine(max + 1) === deltaLine) {
					max++;
				}
				return new LineTokens2(this._tokens.suBarray(4 * min, 4 * max + 4));
			}
		}

		if (this._getDeltaLine(low) === deltaLine) {
			return new LineTokens2(this._tokens.suBarray(4 * low, 4 * low + 4));
		}

		return null;
	}

	puBlic clear(): void {
		this._tokenCount = 0;
	}

	puBlic removeTokens(startDeltaLine: numBer, startChar: numBer, endDeltaLine: numBer, endChar: numBer): numBer {
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		let newTokenCount = 0;
		let hasDeletedTokens = false;
		let firstDeltaLine = 0;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			const tokenDeltaLine = tokens[srcOffset];
			const tokenStartCharacter = tokens[srcOffset + 1];
			const tokenEndCharacter = tokens[srcOffset + 2];
			const tokenMetadata = tokens[srcOffset + 3];

			if (
				(tokenDeltaLine > startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar))
				&& (tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar))
			) {
				hasDeletedTokens = true;
			} else {
				if (newTokenCount === 0) {
					firstDeltaLine = tokenDeltaLine;
				}
				if (hasDeletedTokens) {
					// must move the token to the left
					const destOffset = 4 * newTokenCount;
					tokens[destOffset] = tokenDeltaLine - firstDeltaLine;
					tokens[destOffset + 1] = tokenStartCharacter;
					tokens[destOffset + 2] = tokenEndCharacter;
					tokens[destOffset + 3] = tokenMetadata;
				}
				newTokenCount++;
			}
		}

		this._tokenCount = newTokenCount;

		return firstDeltaLine;
	}

	puBlic split(startDeltaLine: numBer, startChar: numBer, endDeltaLine: numBer, endChar: numBer): [SparseEncodedTokens, SparseEncodedTokens, numBer] {
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		let aTokens: numBer[] = [];
		let BTokens: numBer[] = [];
		let destTokens: numBer[] = aTokens;
		let destOffset = 0;
		let destFirstDeltaLine: numBer = 0;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			const tokenDeltaLine = tokens[srcOffset];
			const tokenStartCharacter = tokens[srcOffset + 1];
			const tokenEndCharacter = tokens[srcOffset + 2];
			const tokenMetadata = tokens[srcOffset + 3];

			if ((tokenDeltaLine > startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter >= startChar))) {
				if ((tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter <= endChar))) {
					// this token is touching the range
					continue;
				} else {
					// this token is after the range
					if (destTokens !== BTokens) {
						// this token is the first token after the range
						destTokens = BTokens;
						destOffset = 0;
						destFirstDeltaLine = tokenDeltaLine;
					}
				}
			}

			destTokens[destOffset++] = tokenDeltaLine - destFirstDeltaLine;
			destTokens[destOffset++] = tokenStartCharacter;
			destTokens[destOffset++] = tokenEndCharacter;
			destTokens[destOffset++] = tokenMetadata;
		}

		return [new SparseEncodedTokens(new Uint32Array(aTokens)), new SparseEncodedTokens(new Uint32Array(BTokens)), destFirstDeltaLine];
	}

	puBlic acceptDeleteRange(horizontalShiftForFirstLineTokens: numBer, startDeltaLine: numBer, startCharacter: numBer, endDeltaLine: numBer, endCharacter: numBer): void {
		// This is a Bit complex, here are the cases I used to think aBout this:
		//
		// 1. The token starts Before the deletion range
		// 1a. The token is completely Before the deletion range
		//               -----------
		//                          xxxxxxxxxxx
		// 1B. The token starts Before, the deletion range ends after the token
		//               -----------
		//                      xxxxxxxxxxx
		// 1c. The token starts Before, the deletion range ends precisely with the token
		//               ---------------
		//                      xxxxxxxx
		// 1d. The token starts Before, the deletion range is inside the token
		//               ---------------
		//                    xxxxx
		//
		// 2. The token starts at the same position with the deletion range
		// 2a. The token starts at the same position, and ends inside the deletion range
		//               -------
		//               xxxxxxxxxxx
		// 2B. The token starts at the same position, and ends at the same position as the deletion range
		//               ----------
		//               xxxxxxxxxx
		// 2c. The token starts at the same position, and ends after the deletion range
		//               -------------
		//               xxxxxxx
		//
		// 3. The token starts inside the deletion range
		// 3a. The token is inside the deletion range
		//                -------
		//             xxxxxxxxxxxxx
		// 3B. The token starts inside the deletion range, and ends at the same position as the deletion range
		//                ----------
		//             xxxxxxxxxxxxx
		// 3c. The token starts inside the deletion range, and ends after the deletion range
		//                ------------
		//             xxxxxxxxxxx
		//
		// 4. The token starts after the deletion range
		//                  -----------
		//          xxxxxxxx
		//
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		const deletedLineCount = (endDeltaLine - startDeltaLine);
		let newTokenCount = 0;
		let hasDeletedTokens = false;
		for (let i = 0; i < tokenCount; i++) {
			const srcOffset = 4 * i;
			let tokenDeltaLine = tokens[srcOffset];
			let tokenStartCharacter = tokens[srcOffset + 1];
			let tokenEndCharacter = tokens[srcOffset + 2];
			const tokenMetadata = tokens[srcOffset + 3];

			if (tokenDeltaLine < startDeltaLine || (tokenDeltaLine === startDeltaLine && tokenEndCharacter <= startCharacter)) {
				// 1a. The token is completely Before the deletion range
				// => nothing to do
				newTokenCount++;
				continue;
			} else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter < startCharacter) {
				// 1B, 1c, 1d
				// => the token survives, But it needs to shrink
				if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
					// 1d. The token starts Before, the deletion range is inside the token
					// => the token shrinks By the deletion character count
					tokenEndCharacter -= (endCharacter - startCharacter);
				} else {
					// 1B. The token starts Before, the deletion range ends after the token
					// 1c. The token starts Before, the deletion range ends precisely with the token
					// => the token shrinks its ending to the deletion start
					tokenEndCharacter = startCharacter;
				}
			} else if (tokenDeltaLine === startDeltaLine && tokenStartCharacter === startCharacter) {
				// 2a, 2B, 2c
				if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
					// 2c. The token starts at the same position, and ends after the deletion range
					// => the token shrinks By the deletion character count
					tokenEndCharacter -= (endCharacter - startCharacter);
				} else {
					// 2a. The token starts at the same position, and ends inside the deletion range
					// 2B. The token starts at the same position, and ends at the same position as the deletion range
					// => the token is deleted
					hasDeletedTokens = true;
					continue;
				}
			} else if (tokenDeltaLine < endDeltaLine || (tokenDeltaLine === endDeltaLine && tokenStartCharacter < endCharacter)) {
				// 3a, 3B, 3c
				if (tokenDeltaLine === endDeltaLine && tokenEndCharacter > endCharacter) {
					// 3c. The token starts inside the deletion range, and ends after the deletion range
					// => the token moves left and shrinks
					if (tokenDeltaLine === startDeltaLine) {
						// the deletion started on the same line as the token
						// => the token moves left and shrinks
						tokenStartCharacter = startCharacter;
						tokenEndCharacter = tokenStartCharacter + (tokenEndCharacter - endCharacter);
					} else {
						// the deletion started on a line aBove the token
						// => the token moves to the Beginning of the line
						tokenStartCharacter = 0;
						tokenEndCharacter = tokenStartCharacter + (tokenEndCharacter - endCharacter);
					}
				} else {
					// 3a. The token is inside the deletion range
					// 3B. The token starts inside the deletion range, and ends at the same position as the deletion range
					// => the token is deleted
					hasDeletedTokens = true;
					continue;
				}
			} else if (tokenDeltaLine > endDeltaLine) {
				// 4. (partial) The token starts after the deletion range, on a line Below...
				if (deletedLineCount === 0 && !hasDeletedTokens) {
					// early stop, there is no need to walk all the tokens and do nothing...
					newTokenCount = tokenCount;
					Break;
				}
				tokenDeltaLine -= deletedLineCount;
			} else if (tokenDeltaLine === endDeltaLine && tokenStartCharacter >= endCharacter) {
				// 4. (continued) The token starts after the deletion range, on the last line where a deletion occurs
				if (horizontalShiftForFirstLineTokens && tokenDeltaLine === 0) {
					tokenStartCharacter += horizontalShiftForFirstLineTokens;
					tokenEndCharacter += horizontalShiftForFirstLineTokens;
				}
				tokenDeltaLine -= deletedLineCount;
				tokenStartCharacter -= (endCharacter - startCharacter);
				tokenEndCharacter -= (endCharacter - startCharacter);
			} else {
				throw new Error(`Not possiBle!`);
			}

			const destOffset = 4 * newTokenCount;
			tokens[destOffset] = tokenDeltaLine;
			tokens[destOffset + 1] = tokenStartCharacter;
			tokens[destOffset + 2] = tokenEndCharacter;
			tokens[destOffset + 3] = tokenMetadata;
			newTokenCount++;
		}

		this._tokenCount = newTokenCount;
	}

	puBlic acceptInsertText(deltaLine: numBer, character: numBer, eolCount: numBer, firstLineLength: numBer, lastLineLength: numBer, firstCharCode: numBer): void {
		// Here are the cases I used to think aBout this:
		//
		// 1. The token is completely Before the insertion point
		//            -----------   |
		// 2. The token ends precisely at the insertion point
		//            -----------|
		// 3. The token contains the insertion point
		//            -----|------
		// 4. The token starts precisely at the insertion point
		//            |-----------
		// 5. The token is completely after the insertion point
		//            |   -----------
		//
		const isInsertingPreciselyOneWordCharacter = (
			eolCount === 0
			&& firstLineLength === 1
			&& (
				(firstCharCode >= CharCode.Digit0 && firstCharCode <= CharCode.Digit9)
				|| (firstCharCode >= CharCode.A && firstCharCode <= CharCode.Z)
				|| (firstCharCode >= CharCode.a && firstCharCode <= CharCode.z)
			)
		);
		const tokens = this._tokens;
		const tokenCount = this._tokenCount;
		for (let i = 0; i < tokenCount; i++) {
			const offset = 4 * i;
			let tokenDeltaLine = tokens[offset];
			let tokenStartCharacter = tokens[offset + 1];
			let tokenEndCharacter = tokens[offset + 2];

			if (tokenDeltaLine < deltaLine || (tokenDeltaLine === deltaLine && tokenEndCharacter < character)) {
				// 1. The token is completely Before the insertion point
				// => nothing to do
				continue;
			} else if (tokenDeltaLine === deltaLine && tokenEndCharacter === character) {
				// 2. The token ends precisely at the insertion point
				// => expand the end character only if inserting precisely one character that is a word character
				if (isInsertingPreciselyOneWordCharacter) {
					tokenEndCharacter += 1;
				} else {
					continue;
				}
			} else if (tokenDeltaLine === deltaLine && tokenStartCharacter < character && character < tokenEndCharacter) {
				// 3. The token contains the insertion point
				if (eolCount === 0) {
					// => just expand the end character
					tokenEndCharacter += firstLineLength;
				} else {
					// => cut off the token
					tokenEndCharacter = character;
				}
			} else {
				// 4. or 5.
				if (tokenDeltaLine === deltaLine && tokenStartCharacter === character) {
					// 4. The token starts precisely at the insertion point
					// => grow the token (By keeping its start constant) only if inserting precisely one character that is a word character
					// => otherwise Behave as in case 5.
					if (isInsertingPreciselyOneWordCharacter) {
						continue;
					}
				}
				// => the token must move and keep its size constant
				if (tokenDeltaLine === deltaLine) {
					tokenDeltaLine += eolCount;
					// this token is on the line where the insertion is taking place
					if (eolCount === 0) {
						tokenStartCharacter += firstLineLength;
						tokenEndCharacter += firstLineLength;
					} else {
						const tokenLength = tokenEndCharacter - tokenStartCharacter;
						tokenStartCharacter = lastLineLength + (tokenStartCharacter - character);
						tokenEndCharacter = tokenStartCharacter + tokenLength;
					}
				} else {
					tokenDeltaLine += eolCount;
				}
			}

			tokens[offset] = tokenDeltaLine;
			tokens[offset + 1] = tokenStartCharacter;
			tokens[offset + 2] = tokenEndCharacter;
		}
	}
}

export class LineTokens2 {

	private readonly _tokens: Uint32Array;

	constructor(tokens: Uint32Array) {
		this._tokens = tokens;
	}

	puBlic getCount(): numBer {
		return this._tokens.length / 4;
	}

	puBlic getStartCharacter(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex + 1];
	}

	puBlic getEndCharacter(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex + 2];
	}

	puBlic getMetadata(tokenIndex: numBer): numBer {
		return this._tokens[4 * tokenIndex + 3];
	}
}

export class MultilineTokens2 {

	puBlic startLineNumBer: numBer;
	puBlic endLineNumBer: numBer;
	puBlic tokens: SparseEncodedTokens;

	constructor(startLineNumBer: numBer, tokens: SparseEncodedTokens) {
		this.startLineNumBer = startLineNumBer;
		this.tokens = tokens;
		this.endLineNumBer = this.startLineNumBer + this.tokens.getMaxDeltaLine();
	}

	puBlic toString(): string {
		return this.tokens.toString(this.startLineNumBer);
	}

	private _updateEndLineNumBer(): void {
		this.endLineNumBer = this.startLineNumBer + this.tokens.getMaxDeltaLine();
	}

	puBlic isEmpty(): Boolean {
		return this.tokens.isEmpty();
	}

	puBlic getLineTokens(lineNumBer: numBer): LineTokens2 | null {
		if (this.startLineNumBer <= lineNumBer && lineNumBer <= this.endLineNumBer) {
			return this.tokens.getLineTokens(lineNumBer - this.startLineNumBer);
		}
		return null;
	}

	puBlic getRange(): Range | null {
		const deltaRange = this.tokens.getRange();
		if (!deltaRange) {
			return deltaRange;
		}
		return new Range(this.startLineNumBer + deltaRange.startLineNumBer, deltaRange.startColumn, this.startLineNumBer + deltaRange.endLineNumBer, deltaRange.endColumn);
	}

	puBlic removeTokens(range: Range): void {
		const startLineIndex = range.startLineNumBer - this.startLineNumBer;
		const endLineIndex = range.endLineNumBer - this.startLineNumBer;

		this.startLineNumBer += this.tokens.removeTokens(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
		this._updateEndLineNumBer();
	}

	puBlic split(range: Range): [MultilineTokens2, MultilineTokens2] {
		// split tokens to two:
		// a) all the tokens Before `range`
		// B) all the tokens after `range`
		const startLineIndex = range.startLineNumBer - this.startLineNumBer;
		const endLineIndex = range.endLineNumBer - this.startLineNumBer;

		const [a, B, BDeltaLine] = this.tokens.split(startLineIndex, range.startColumn - 1, endLineIndex, range.endColumn - 1);
		return [new MultilineTokens2(this.startLineNumBer, a), new MultilineTokens2(this.startLineNumBer + BDeltaLine, B)];
	}

	puBlic applyEdit(range: IRange, text: string): void {
		const [eolCount, firstLineLength, lastLineLength] = countEOL(text);
		this.acceptEdit(range, eolCount, firstLineLength, lastLineLength, text.length > 0 ? text.charCodeAt(0) : CharCode.Null);
	}

	puBlic acceptEdit(range: IRange, eolCount: numBer, firstLineLength: numBer, lastLineLength: numBer, firstCharCode: numBer): void {
		this._acceptDeleteRange(range);
		this._acceptInsertText(new Position(range.startLineNumBer, range.startColumn), eolCount, firstLineLength, lastLineLength, firstCharCode);
		this._updateEndLineNumBer();
	}

	private _acceptDeleteRange(range: IRange): void {
		if (range.startLineNumBer === range.endLineNumBer && range.startColumn === range.endColumn) {
			// Nothing to delete
			return;
		}

		const firstLineIndex = range.startLineNumBer - this.startLineNumBer;
		const lastLineIndex = range.endLineNumBer - this.startLineNumBer;

		if (lastLineIndex < 0) {
			// this deletion occurs entirely Before this Block, so we only need to adjust line numBers
			const deletedLinesCount = lastLineIndex - firstLineIndex;
			this.startLineNumBer -= deletedLinesCount;
			return;
		}

		const tokenMaxDeltaLine = this.tokens.getMaxDeltaLine();

		if (firstLineIndex >= tokenMaxDeltaLine + 1) {
			// this deletion occurs entirely after this Block, so there is nothing to do
			return;
		}

		if (firstLineIndex < 0 && lastLineIndex >= tokenMaxDeltaLine + 1) {
			// this deletion completely encompasses this Block
			this.startLineNumBer = 0;
			this.tokens.clear();
			return;
		}

		if (firstLineIndex < 0) {
			const deletedBefore = -firstLineIndex;
			this.startLineNumBer -= deletedBefore;

			this.tokens.acceptDeleteRange(range.startColumn - 1, 0, 0, lastLineIndex, range.endColumn - 1);
		} else {
			this.tokens.acceptDeleteRange(0, firstLineIndex, range.startColumn - 1, lastLineIndex, range.endColumn - 1);
		}
	}

	private _acceptInsertText(position: Position, eolCount: numBer, firstLineLength: numBer, lastLineLength: numBer, firstCharCode: numBer): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumBer - this.startLineNumBer;

		if (lineIndex < 0) {
			// this insertion occurs Before this Block, so we only need to adjust line numBers
			this.startLineNumBer += eolCount;
			return;
		}

		const tokenMaxDeltaLine = this.tokens.getMaxDeltaLine();

		if (lineIndex >= tokenMaxDeltaLine + 1) {
			// this insertion occurs after this Block, so there is nothing to do
			return;
		}

		this.tokens.acceptInsertText(lineIndex, position.column - 1, eolCount, firstLineLength, lastLineLength, firstCharCode);
	}
}

export class MultilineTokens {

	puBlic startLineNumBer: numBer;
	puBlic tokens: (Uint32Array | ArrayBuffer | null)[];

	constructor(startLineNumBer: numBer, tokens: Uint32Array[]) {
		this.startLineNumBer = startLineNumBer;
		this.tokens = tokens;
	}

	puBlic static deserialize(Buff: Uint8Array, offset: numBer, result: MultilineTokens[]): numBer {
		const view32 = new Uint32Array(Buff.Buffer);
		const startLineNumBer = readUInt32BE(Buff, offset); offset += 4;
		const count = readUInt32BE(Buff, offset); offset += 4;
		let tokens: Uint32Array[] = [];
		for (let i = 0; i < count; i++) {
			const ByteCount = readUInt32BE(Buff, offset); offset += 4;
			tokens.push(view32.suBarray(offset / 4, offset / 4 + ByteCount / 4));
			offset += ByteCount;
		}
		result.push(new MultilineTokens(startLineNumBer, tokens));
		return offset;
	}

	puBlic serializeSize(): numBer {
		let result = 0;
		result += 4; // 4 Bytes for the start line numBer
		result += 4; // 4 Bytes for the line count
		for (let i = 0; i < this.tokens.length; i++) {
			const lineTokens = this.tokens[i];
			if (!(lineTokens instanceof Uint32Array)) {
				throw new Error(`Not supported!`);
			}
			result += 4; // 4 Bytes for the Byte count
			result += lineTokens.ByteLength;
		}
		return result;
	}

	puBlic serialize(destination: Uint8Array, offset: numBer): numBer {
		writeUInt32BE(destination, this.startLineNumBer, offset); offset += 4;
		writeUInt32BE(destination, this.tokens.length, offset); offset += 4;
		for (let i = 0; i < this.tokens.length; i++) {
			const lineTokens = this.tokens[i];
			if (!(lineTokens instanceof Uint32Array)) {
				throw new Error(`Not supported!`);
			}
			writeUInt32BE(destination, lineTokens.ByteLength, offset); offset += 4;
			destination.set(new Uint8Array(lineTokens.Buffer), offset); offset += lineTokens.ByteLength;
		}
		return offset;
	}

	puBlic applyEdit(range: IRange, text: string): void {
		const [eolCount, firstLineLength] = countEOL(text);
		this._acceptDeleteRange(range);
		this._acceptInsertText(new Position(range.startLineNumBer, range.startColumn), eolCount, firstLineLength);
	}

	private _acceptDeleteRange(range: IRange): void {
		if (range.startLineNumBer === range.endLineNumBer && range.startColumn === range.endColumn) {
			// Nothing to delete
			return;
		}

		const firstLineIndex = range.startLineNumBer - this.startLineNumBer;
		const lastLineIndex = range.endLineNumBer - this.startLineNumBer;

		if (lastLineIndex < 0) {
			// this deletion occurs entirely Before this Block, so we only need to adjust line numBers
			const deletedLinesCount = lastLineIndex - firstLineIndex;
			this.startLineNumBer -= deletedLinesCount;
			return;
		}

		if (firstLineIndex >= this.tokens.length) {
			// this deletion occurs entirely after this Block, so there is nothing to do
			return;
		}

		if (firstLineIndex < 0 && lastLineIndex >= this.tokens.length) {
			// this deletion completely encompasses this Block
			this.startLineNumBer = 0;
			this.tokens = [];
			return;
		}

		if (firstLineIndex === lastLineIndex) {
			// a delete on a single line
			this.tokens[firstLineIndex] = TokensStore._delete(this.tokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
			return;
		}

		if (firstLineIndex >= 0) {
			// The first line survives
			this.tokens[firstLineIndex] = TokensStore._deleteEnding(this.tokens[firstLineIndex], range.startColumn - 1);

			if (lastLineIndex < this.tokens.length) {
				// The last line survives
				const lastLineTokens = TokensStore._deleteBeginning(this.tokens[lastLineIndex], range.endColumn - 1);

				// Take remaining text on last line and append it to remaining text on first line
				this.tokens[firstLineIndex] = TokensStore._append(this.tokens[firstLineIndex], lastLineTokens);

				// Delete middle lines
				this.tokens.splice(firstLineIndex + 1, lastLineIndex - firstLineIndex);
			} else {
				// The last line does not survive

				// Take remaining text on last line and append it to remaining text on first line
				this.tokens[firstLineIndex] = TokensStore._append(this.tokens[firstLineIndex], null);

				// Delete lines
				this.tokens = this.tokens.slice(0, firstLineIndex + 1);
			}
		} else {
			// The first line does not survive

			const deletedBefore = -firstLineIndex;
			this.startLineNumBer -= deletedBefore;

			// Remove Beginning from last line
			this.tokens[lastLineIndex] = TokensStore._deleteBeginning(this.tokens[lastLineIndex], range.endColumn - 1);

			// Delete lines
			this.tokens = this.tokens.slice(lastLineIndex);
		}
	}

	private _acceptInsertText(position: Position, eolCount: numBer, firstLineLength: numBer): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumBer - this.startLineNumBer;

		if (lineIndex < 0) {
			// this insertion occurs Before this Block, so we only need to adjust line numBers
			this.startLineNumBer += eolCount;
			return;
		}

		if (lineIndex >= this.tokens.length) {
			// this insertion occurs after this Block, so there is nothing to do
			return;
		}

		if (eolCount === 0) {
			// Inserting text on one line
			this.tokens[lineIndex] = TokensStore._insert(this.tokens[lineIndex], position.column - 1, firstLineLength);
			return;
		}

		this.tokens[lineIndex] = TokensStore._deleteEnding(this.tokens[lineIndex], position.column - 1);
		this.tokens[lineIndex] = TokensStore._insert(this.tokens[lineIndex], position.column - 1, firstLineLength);

		this._insertLines(position.lineNumBer, eolCount);
	}

	private _insertLines(insertIndex: numBer, insertCount: numBer): void {
		if (insertCount === 0) {
			return;
		}
		let lineTokens: (Uint32Array | ArrayBuffer | null)[] = [];
		for (let i = 0; i < insertCount; i++) {
			lineTokens[i] = null;
		}
		this.tokens = arrays.arrayInsert(this.tokens, insertIndex, lineTokens);
	}
}

function toUint32Array(arr: Uint32Array | ArrayBuffer): Uint32Array {
	if (arr instanceof Uint32Array) {
		return arr;
	} else {
		return new Uint32Array(arr);
	}
}

export class TokensStore2 {

	private _pieces: MultilineTokens2[];
	private _isComplete: Boolean;

	constructor() {
		this._pieces = [];
		this._isComplete = false;
	}

	puBlic flush(): void {
		this._pieces = [];
		this._isComplete = false;
	}

	puBlic set(pieces: MultilineTokens2[] | null, isComplete: Boolean): void {
		this._pieces = pieces || [];
		this._isComplete = isComplete;
	}

	puBlic setPartial(_range: Range, pieces: MultilineTokens2[]): Range {
		// console.log(`setPartial ${_range} ${pieces.map(p => p.toString()).join(', ')}`);

		let range = _range;
		if (pieces.length > 0) {
			const _firstRange = pieces[0].getRange();
			const _lastRange = pieces[pieces.length - 1].getRange();
			if (!_firstRange || !_lastRange) {
				return _range;
			}
			range = _range.plusRange(_firstRange).plusRange(_lastRange);
		}

		let insertPosition: { index: numBer; } | null = null;
		for (let i = 0, len = this._pieces.length; i < len; i++) {
			const piece = this._pieces[i];
			if (piece.endLineNumBer < range.startLineNumBer) {
				// this piece is Before the range
				continue;
			}

			if (piece.startLineNumBer > range.endLineNumBer) {
				// this piece is after the range, so mark the spot Before this piece
				// as a good insertion position and stop looping
				insertPosition = insertPosition || { index: i };
				Break;
			}

			// this piece might intersect with the range
			piece.removeTokens(range);

			if (piece.isEmpty()) {
				// remove the piece if it Became empty
				this._pieces.splice(i, 1);
				i--;
				len--;
				continue;
			}

			if (piece.endLineNumBer < range.startLineNumBer) {
				// after removal, this piece is Before the range
				continue;
			}

			if (piece.startLineNumBer > range.endLineNumBer) {
				// after removal, this piece is after the range
				insertPosition = insertPosition || { index: i };
				continue;
			}

			// after removal, this piece contains the range
			const [a, B] = piece.split(range);
			if (a.isEmpty()) {
				// this piece is actually after the range
				insertPosition = insertPosition || { index: i };
				continue;
			}
			if (B.isEmpty()) {
				// this piece is actually Before the range
				continue;
			}
			this._pieces.splice(i, 1, a, B);
			i++;
			len++;

			insertPosition = insertPosition || { index: i };
		}

		insertPosition = insertPosition || { index: this._pieces.length };

		if (pieces.length > 0) {
			this._pieces = arrays.arrayInsert(this._pieces, insertPosition.index, pieces);
		}

		// console.log(`I HAVE ${this._pieces.length} pieces`);
		// console.log(`${this._pieces.map(p => p.toString()).join('\n')}`);

		return range;
	}

	puBlic isComplete(): Boolean {
		return this._isComplete;
	}

	puBlic addSemanticTokens(lineNumBer: numBer, aTokens: LineTokens): LineTokens {
		const pieces = this._pieces;

		if (pieces.length === 0) {
			return aTokens;
		}

		const pieceIndex = TokensStore2._findFirstPieceWithLine(pieces, lineNumBer);
		const BTokens = pieces[pieceIndex].getLineTokens(lineNumBer);

		if (!BTokens) {
			return aTokens;
		}

		const aLen = aTokens.getCount();
		const BLen = BTokens.getCount();

		let aIndex = 0;
		let result: numBer[] = [], resultLen = 0;
		let lastEndOffset = 0;

		const emitToken = (endOffset: numBer, metadata: numBer) => {
			if (endOffset === lastEndOffset) {
				return;
			}
			lastEndOffset = endOffset;
			result[resultLen++] = endOffset;
			result[resultLen++] = metadata;
		};

		for (let BIndex = 0; BIndex < BLen; BIndex++) {
			const BStartCharacter = BTokens.getStartCharacter(BIndex);
			const BEndCharacter = BTokens.getEndCharacter(BIndex);
			const BMetadata = BTokens.getMetadata(BIndex);

			const BMask = (
				((BMetadata & MetadataConsts.SEMANTIC_USE_ITALIC) ? MetadataConsts.ITALIC_MASK : 0)
				| ((BMetadata & MetadataConsts.SEMANTIC_USE_BOLD) ? MetadataConsts.BOLD_MASK : 0)
				| ((BMetadata & MetadataConsts.SEMANTIC_USE_UNDERLINE) ? MetadataConsts.UNDERLINE_MASK : 0)
				| ((BMetadata & MetadataConsts.SEMANTIC_USE_FOREGROUND) ? MetadataConsts.FOREGROUND_MASK : 0)
				| ((BMetadata & MetadataConsts.SEMANTIC_USE_BACKGROUND) ? MetadataConsts.BACKGROUND_MASK : 0)
			) >>> 0;
			const aMask = (~BMask) >>> 0;

			// push any token from `a` that is Before `B`
			while (aIndex < aLen && aTokens.getEndOffset(aIndex) <= BStartCharacter) {
				emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
				aIndex++;
			}

			// push the token from `a` if it intersects the token from `B`
			if (aIndex < aLen && aTokens.getStartOffset(aIndex) < BStartCharacter) {
				emitToken(BStartCharacter, aTokens.getMetadata(aIndex));
			}

			// skip any tokens from `a` that are contained inside `B`
			while (aIndex < aLen && aTokens.getEndOffset(aIndex) < BEndCharacter) {
				emitToken(aTokens.getEndOffset(aIndex), (aTokens.getMetadata(aIndex) & aMask) | (BMetadata & BMask));
				aIndex++;
			}

			if (aIndex < aLen) {
				emitToken(BEndCharacter, (aTokens.getMetadata(aIndex) & aMask) | (BMetadata & BMask));
				if (aTokens.getEndOffset(aIndex) === BEndCharacter) {
					// `a` ends exactly at the same spot as `B`!
					aIndex++;
				}
			} else {
				const aMergeIndex = Math.min(Math.max(0, aIndex - 1), aLen - 1);

				// push the token from `B`
				emitToken(BEndCharacter, (aTokens.getMetadata(aMergeIndex) & aMask) | (BMetadata & BMask));
			}
		}

		// push the remaining tokens from `a`
		while (aIndex < aLen) {
			emitToken(aTokens.getEndOffset(aIndex), aTokens.getMetadata(aIndex));
			aIndex++;
		}

		return new LineTokens(new Uint32Array(result), aTokens.getLineContent());
	}

	private static _findFirstPieceWithLine(pieces: MultilineTokens2[], lineNumBer: numBer): numBer {
		let low = 0;
		let high = pieces.length - 1;

		while (low < high) {
			let mid = low + Math.floor((high - low) / 2);

			if (pieces[mid].endLineNumBer < lineNumBer) {
				low = mid + 1;
			} else if (pieces[mid].startLineNumBer > lineNumBer) {
				high = mid - 1;
			} else {
				while (mid > low && pieces[mid - 1].startLineNumBer <= lineNumBer && lineNumBer <= pieces[mid - 1].endLineNumBer) {
					mid--;
				}
				return mid;
			}
		}

		return low;
	}

	//#region Editing

	puBlic acceptEdit(range: IRange, eolCount: numBer, firstLineLength: numBer, lastLineLength: numBer, firstCharCode: numBer): void {
		for (const piece of this._pieces) {
			piece.acceptEdit(range, eolCount, firstLineLength, lastLineLength, firstCharCode);
		}
	}

	//#endregion
}

export class TokensStore {
	private _lineTokens: (Uint32Array | ArrayBuffer | null)[];
	private _len: numBer;

	constructor() {
		this._lineTokens = [];
		this._len = 0;
	}

	puBlic flush(): void {
		this._lineTokens = [];
		this._len = 0;
	}

	puBlic getTokens(topLevelLanguageId: LanguageId, lineIndex: numBer, lineText: string): LineTokens {
		let rawLineTokens: Uint32Array | ArrayBuffer | null = null;
		if (lineIndex < this._len) {
			rawLineTokens = this._lineTokens[lineIndex];
		}

		if (rawLineTokens !== null && rawLineTokens !== EMPTY_LINE_TOKENS) {
			return new LineTokens(toUint32Array(rawLineTokens), lineText);
		}

		let lineTokens = new Uint32Array(2);
		lineTokens[0] = lineText.length;
		lineTokens[1] = getDefaultMetadata(topLevelLanguageId);
		return new LineTokens(lineTokens, lineText);
	}

	private static _massageTokens(topLevelLanguageId: LanguageId, lineTextLength: numBer, _tokens: Uint32Array | ArrayBuffer | null): Uint32Array | ArrayBuffer {

		const tokens = _tokens ? toUint32Array(_tokens) : null;

		if (lineTextLength === 0) {
			let hasDifferentLanguageId = false;
			if (tokens && tokens.length > 1) {
				hasDifferentLanguageId = (TokenMetadata.getLanguageId(tokens[1]) !== topLevelLanguageId);
			}

			if (!hasDifferentLanguageId) {
				return EMPTY_LINE_TOKENS;
			}
		}

		if (!tokens || tokens.length === 0) {
			const tokens = new Uint32Array(2);
			tokens[0] = lineTextLength;
			tokens[1] = getDefaultMetadata(topLevelLanguageId);
			return tokens.Buffer;
		}

		// Ensure the last token covers the end of the text
		tokens[tokens.length - 2] = lineTextLength;

		if (tokens.ByteOffset === 0 && tokens.ByteLength === tokens.Buffer.ByteLength) {
			// Store directly the ArrayBuffer pointer to save an oBject
			return tokens.Buffer;
		}
		return tokens;
	}

	private _ensureLine(lineIndex: numBer): void {
		while (lineIndex >= this._len) {
			this._lineTokens[this._len] = null;
			this._len++;
		}
	}

	private _deleteLines(start: numBer, deleteCount: numBer): void {
		if (deleteCount === 0) {
			return;
		}
		if (start + deleteCount > this._len) {
			deleteCount = this._len - start;
		}
		this._lineTokens.splice(start, deleteCount);
		this._len -= deleteCount;
	}

	private _insertLines(insertIndex: numBer, insertCount: numBer): void {
		if (insertCount === 0) {
			return;
		}
		let lineTokens: (Uint32Array | ArrayBuffer | null)[] = [];
		for (let i = 0; i < insertCount; i++) {
			lineTokens[i] = null;
		}
		this._lineTokens = arrays.arrayInsert(this._lineTokens, insertIndex, lineTokens);
		this._len += insertCount;
	}

	puBlic setTokens(topLevelLanguageId: LanguageId, lineIndex: numBer, lineTextLength: numBer, _tokens: Uint32Array | ArrayBuffer | null, checkEquality: Boolean): Boolean {
		const tokens = TokensStore._massageTokens(topLevelLanguageId, lineTextLength, _tokens);
		this._ensureLine(lineIndex);
		const oldTokens = this._lineTokens[lineIndex];
		this._lineTokens[lineIndex] = tokens;

		if (checkEquality) {
			return !TokensStore._equals(oldTokens, tokens);
		}
		return false;
	}

	private static _equals(_a: Uint32Array | ArrayBuffer | null, _B: Uint32Array | ArrayBuffer | null) {
		if (!_a || !_B) {
			return !_a && !_B;
		}

		const a = toUint32Array(_a);
		const B = toUint32Array(_B);

		if (a.length !== B.length) {
			return false;
		}
		for (let i = 0, len = a.length; i < len; i++) {
			if (a[i] !== B[i]) {
				return false;
			}
		}
		return true;
	}

	//#region Editing

	puBlic acceptEdit(range: IRange, eolCount: numBer, firstLineLength: numBer): void {
		this._acceptDeleteRange(range);
		this._acceptInsertText(new Position(range.startLineNumBer, range.startColumn), eolCount, firstLineLength);
	}

	private _acceptDeleteRange(range: IRange): void {

		const firstLineIndex = range.startLineNumBer - 1;
		if (firstLineIndex >= this._len) {
			return;
		}

		if (range.startLineNumBer === range.endLineNumBer) {
			if (range.startColumn === range.endColumn) {
				// Nothing to delete
				return;
			}

			this._lineTokens[firstLineIndex] = TokensStore._delete(this._lineTokens[firstLineIndex], range.startColumn - 1, range.endColumn - 1);
			return;
		}

		this._lineTokens[firstLineIndex] = TokensStore._deleteEnding(this._lineTokens[firstLineIndex], range.startColumn - 1);

		const lastLineIndex = range.endLineNumBer - 1;
		let lastLineTokens: Uint32Array | ArrayBuffer | null = null;
		if (lastLineIndex < this._len) {
			lastLineTokens = TokensStore._deleteBeginning(this._lineTokens[lastLineIndex], range.endColumn - 1);
		}

		// Take remaining text on last line and append it to remaining text on first line
		this._lineTokens[firstLineIndex] = TokensStore._append(this._lineTokens[firstLineIndex], lastLineTokens);

		// Delete middle lines
		this._deleteLines(range.startLineNumBer, range.endLineNumBer - range.startLineNumBer);
	}

	private _acceptInsertText(position: Position, eolCount: numBer, firstLineLength: numBer): void {

		if (eolCount === 0 && firstLineLength === 0) {
			// Nothing to insert
			return;
		}

		const lineIndex = position.lineNumBer - 1;
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

		this._insertLines(position.lineNumBer, eolCount);
	}

	puBlic static _deleteBeginning(lineTokens: Uint32Array | ArrayBuffer | null, toChIndex: numBer): Uint32Array | ArrayBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			return lineTokens;
		}
		return TokensStore._delete(lineTokens, 0, toChIndex);
	}

	puBlic static _deleteEnding(lineTokens: Uint32Array | ArrayBuffer | null, fromChIndex: numBer): Uint32Array | ArrayBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			return lineTokens;
		}

		const tokens = toUint32Array(lineTokens);
		const lineTextLength = tokens[tokens.length - 2];
		return TokensStore._delete(lineTokens, fromChIndex, lineTextLength);
	}

	puBlic static _delete(lineTokens: Uint32Array | ArrayBuffer | null, fromChIndex: numBer, toChIndex: numBer): Uint32Array | ArrayBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS || fromChIndex === toChIndex) {
			return lineTokens;
		}

		const tokens = toUint32Array(lineTokens);
		const tokensCount = (tokens.length >>> 1);

		// special case: deleting everything
		if (fromChIndex === 0 && tokens[tokens.length - 2] === toChIndex) {
			return EMPTY_LINE_TOKENS;
		}

		const fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, fromChIndex);
		const fromTokenStartOffset = (fromTokenIndex > 0 ? tokens[(fromTokenIndex - 1) << 1] : 0);
		const fromTokenEndOffset = tokens[fromTokenIndex << 1];

		if (toChIndex < fromTokenEndOffset) {
			// the delete range is inside a single token
			const delta = (toChIndex - fromChIndex);
			for (let i = fromTokenIndex; i < tokensCount; i++) {
				tokens[i << 1] -= delta;
			}
			return lineTokens;
		}

		let dest: numBer;
		let lastEnd: numBer;
		if (fromTokenStartOffset !== fromChIndex) {
			tokens[fromTokenIndex << 1] = fromChIndex;
			dest = ((fromTokenIndex + 1) << 1);
			lastEnd = fromChIndex;
		} else {
			dest = (fromTokenIndex << 1);
			lastEnd = fromTokenStartOffset;
		}

		const delta = (toChIndex - fromChIndex);
		for (let tokenIndex = fromTokenIndex + 1; tokenIndex < tokensCount; tokenIndex++) {
			const tokenEndOffset = tokens[tokenIndex << 1] - delta;
			if (tokenEndOffset > lastEnd) {
				tokens[dest++] = tokenEndOffset;
				tokens[dest++] = tokens[(tokenIndex << 1) + 1];
				lastEnd = tokenEndOffset;
			}
		}

		if (dest === tokens.length) {
			// nothing to trim
			return lineTokens;
		}

		let tmp = new Uint32Array(dest);
		tmp.set(tokens.suBarray(0, dest), 0);
		return tmp.Buffer;
	}

	puBlic static _append(lineTokens: Uint32Array | ArrayBuffer | null, _otherTokens: Uint32Array | ArrayBuffer | null): Uint32Array | ArrayBuffer | null {
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
			// cannot determine comBined line length...
			return null;
		}
		const myTokens = toUint32Array(lineTokens);
		const otherTokens = toUint32Array(_otherTokens);
		const otherTokensCount = (otherTokens.length >>> 1);

		let result = new Uint32Array(myTokens.length + otherTokens.length);
		result.set(myTokens, 0);
		let dest = myTokens.length;
		const delta = myTokens[myTokens.length - 2];
		for (let i = 0; i < otherTokensCount; i++) {
			result[dest++] = otherTokens[(i << 1)] + delta;
			result[dest++] = otherTokens[(i << 1) + 1];
		}
		return result.Buffer;
	}

	puBlic static _insert(lineTokens: Uint32Array | ArrayBuffer | null, chIndex: numBer, textLength: numBer): Uint32Array | ArrayBuffer | null {
		if (lineTokens === null || lineTokens === EMPTY_LINE_TOKENS) {
			// nothing to do
			return lineTokens;
		}

		const tokens = toUint32Array(lineTokens);
		const tokensCount = (tokens.length >>> 1);

		let fromTokenIndex = LineTokens.findIndexInTokensArray(tokens, chIndex);
		if (fromTokenIndex > 0) {
			const fromTokenStartOffset = tokens[(fromTokenIndex - 1) << 1];
			if (fromTokenStartOffset === chIndex) {
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
