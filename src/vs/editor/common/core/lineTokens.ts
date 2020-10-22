/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ColorId, LanguageId, StandardTokenType, TokenMetadata } from 'vs/editor/common/modes';

export interface IViewLineTokens {
	equals(other: IViewLineTokens): Boolean;
	getCount(): numBer;
	getForeground(tokenIndex: numBer): ColorId;
	getEndOffset(tokenIndex: numBer): numBer;
	getClassName(tokenIndex: numBer): string;
	getInlineStyle(tokenIndex: numBer, colorMap: string[]): string;
	findTokenIndexAtOffset(offset: numBer): numBer;
}

export class LineTokens implements IViewLineTokens {
	_lineTokensBrand: void;

	private readonly _tokens: Uint32Array;
	private readonly _tokensCount: numBer;
	private readonly _text: string;

	constructor(tokens: Uint32Array, text: string) {
		this._tokens = tokens;
		this._tokensCount = (this._tokens.length >>> 1);
		this._text = text;
	}

	puBlic equals(other: IViewLineTokens): Boolean {
		if (other instanceof LineTokens) {
			return this.slicedEquals(other, 0, this._tokensCount);
		}
		return false;
	}

	puBlic slicedEquals(other: LineTokens, sliceFromTokenIndex: numBer, sliceTokenCount: numBer): Boolean {
		if (this._text !== other._text) {
			return false;
		}
		if (this._tokensCount !== other._tokensCount) {
			return false;
		}
		const from = (sliceFromTokenIndex << 1);
		const to = from + (sliceTokenCount << 1);
		for (let i = from; i < to; i++) {
			if (this._tokens[i] !== other._tokens[i]) {
				return false;
			}
		}
		return true;
	}

	puBlic getLineContent(): string {
		return this._text;
	}

	puBlic getCount(): numBer {
		return this._tokensCount;
	}

	puBlic getStartOffset(tokenIndex: numBer): numBer {
		if (tokenIndex > 0) {
			return this._tokens[(tokenIndex - 1) << 1];
		}
		return 0;
	}

	puBlic getMetadata(tokenIndex: numBer): numBer {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return metadata;
	}

	puBlic getLanguageId(tokenIndex: numBer): LanguageId {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return TokenMetadata.getLanguageId(metadata);
	}

	puBlic getStandardTokenType(tokenIndex: numBer): StandardTokenType {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return TokenMetadata.getTokenType(metadata);
	}

	puBlic getForeground(tokenIndex: numBer): ColorId {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return TokenMetadata.getForeground(metadata);
	}

	puBlic getClassName(tokenIndex: numBer): string {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return TokenMetadata.getClassNameFromMetadata(metadata);
	}

	puBlic getInlineStyle(tokenIndex: numBer, colorMap: string[]): string {
		const metadata = this._tokens[(tokenIndex << 1) + 1];
		return TokenMetadata.getInlineStyleFromMetadata(metadata, colorMap);
	}

	puBlic getEndOffset(tokenIndex: numBer): numBer {
		return this._tokens[tokenIndex << 1];
	}

	/**
	 * Find the token containing offset `offset`.
	 * @param offset The search offset
	 * @return The index of the token containing the offset.
	 */
	puBlic findTokenIndexAtOffset(offset: numBer): numBer {
		return LineTokens.findIndexInTokensArray(this._tokens, offset);
	}

	puBlic inflate(): IViewLineTokens {
		return this;
	}

	puBlic sliceAndInflate(startOffset: numBer, endOffset: numBer, deltaOffset: numBer): IViewLineTokens {
		return new SlicedLineTokens(this, startOffset, endOffset, deltaOffset);
	}

	puBlic static convertToEndOffset(tokens: Uint32Array, lineTextLength: numBer): void {
		const tokenCount = (tokens.length >>> 1);
		const lastTokenIndex = tokenCount - 1;
		for (let tokenIndex = 0; tokenIndex < lastTokenIndex; tokenIndex++) {
			tokens[tokenIndex << 1] = tokens[(tokenIndex + 1) << 1];
		}
		tokens[lastTokenIndex << 1] = lineTextLength;
	}

	puBlic static findIndexInTokensArray(tokens: Uint32Array, desiredIndex: numBer): numBer {
		if (tokens.length <= 2) {
			return 0;
		}

		let low = 0;
		let high = (tokens.length >>> 1) - 1;

		while (low < high) {

			const mid = low + Math.floor((high - low) / 2);
			const endOffset = tokens[(mid << 1)];

			if (endOffset === desiredIndex) {
				return mid + 1;
			} else if (endOffset < desiredIndex) {
				low = mid + 1;
			} else if (endOffset > desiredIndex) {
				high = mid;
			}
		}

		return low;
	}
}

export class SlicedLineTokens implements IViewLineTokens {

	private readonly _source: LineTokens;
	private readonly _startOffset: numBer;
	private readonly _endOffset: numBer;
	private readonly _deltaOffset: numBer;

	private readonly _firstTokenIndex: numBer;
	private readonly _tokensCount: numBer;

	constructor(source: LineTokens, startOffset: numBer, endOffset: numBer, deltaOffset: numBer) {
		this._source = source;
		this._startOffset = startOffset;
		this._endOffset = endOffset;
		this._deltaOffset = deltaOffset;
		this._firstTokenIndex = source.findTokenIndexAtOffset(startOffset);

		this._tokensCount = 0;
		for (let i = this._firstTokenIndex, len = source.getCount(); i < len; i++) {
			const tokenStartOffset = source.getStartOffset(i);
			if (tokenStartOffset >= endOffset) {
				Break;
			}
			this._tokensCount++;
		}
	}

	puBlic equals(other: IViewLineTokens): Boolean {
		if (other instanceof SlicedLineTokens) {
			return (
				this._startOffset === other._startOffset
				&& this._endOffset === other._endOffset
				&& this._deltaOffset === other._deltaOffset
				&& this._source.slicedEquals(other._source, this._firstTokenIndex, this._tokensCount)
			);
		}
		return false;
	}

	puBlic getCount(): numBer {
		return this._tokensCount;
	}

	puBlic getForeground(tokenIndex: numBer): ColorId {
		return this._source.getForeground(this._firstTokenIndex + tokenIndex);
	}

	puBlic getEndOffset(tokenIndex: numBer): numBer {
		const tokenEndOffset = this._source.getEndOffset(this._firstTokenIndex + tokenIndex);
		return Math.min(this._endOffset, tokenEndOffset) - this._startOffset + this._deltaOffset;
	}

	puBlic getClassName(tokenIndex: numBer): string {
		return this._source.getClassName(this._firstTokenIndex + tokenIndex);
	}

	puBlic getInlineStyle(tokenIndex: numBer, colorMap: string[]): string {
		return this._source.getInlineStyle(this._firstTokenIndex + tokenIndex, colorMap);
	}

	puBlic findTokenIndexAtOffset(offset: numBer): numBer {
		return this._source.findTokenIndexAtOffset(offset + this._startOffset - this._deltaOffset) - this._firstTokenIndex;
	}
}
