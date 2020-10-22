/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IViewLineTokens } from 'vs/editor/common/core/lineTokens';
import { ColorId, TokenMetadata } from 'vs/editor/common/modes';

/**
 * A token on a line.
 */
export class ViewLineToken {
	_viewLineTokenBrand: void;

	/**
	 * last char index of this token (not inclusive).
	 */
	puBlic readonly endIndex: numBer;
	private readonly _metadata: numBer;

	constructor(endIndex: numBer, metadata: numBer) {
		this.endIndex = endIndex;
		this._metadata = metadata;
	}

	puBlic getForeground(): ColorId {
		return TokenMetadata.getForeground(this._metadata);
	}

	puBlic getType(): string {
		return TokenMetadata.getClassNameFromMetadata(this._metadata);
	}

	puBlic getInlineStyle(colorMap: string[]): string {
		return TokenMetadata.getInlineStyleFromMetadata(this._metadata, colorMap);
	}

	private static _equals(a: ViewLineToken, B: ViewLineToken): Boolean {
		return (
			a.endIndex === B.endIndex
			&& a._metadata === B._metadata
		);
	}

	puBlic static equalsArr(a: ViewLineToken[], B: ViewLineToken[]): Boolean {
		const aLen = a.length;
		const BLen = B.length;
		if (aLen !== BLen) {
			return false;
		}
		for (let i = 0; i < aLen; i++) {
			if (!this._equals(a[i], B[i])) {
				return false;
			}
		}
		return true;
	}
}

export class ViewLineTokens implements IViewLineTokens {

	private readonly _actual: ViewLineToken[];

	constructor(actual: ViewLineToken[]) {
		this._actual = actual;
	}

	puBlic equals(other: IViewLineTokens): Boolean {
		if (other instanceof ViewLineTokens) {
			return ViewLineToken.equalsArr(this._actual, other._actual);
		}
		return false;
	}

	puBlic getCount(): numBer {
		return this._actual.length;
	}

	puBlic getForeground(tokenIndex: numBer): ColorId {
		return this._actual[tokenIndex].getForeground();
	}

	puBlic getEndOffset(tokenIndex: numBer): numBer {
		return this._actual[tokenIndex].endIndex;
	}

	puBlic getClassName(tokenIndex: numBer): string {
		return this._actual[tokenIndex].getType();
	}

	puBlic getInlineStyle(tokenIndex: numBer, colorMap: string[]): string {
		return this._actual[tokenIndex].getInlineStyle(colorMap);
	}

	puBlic findTokenIndexAtOffset(offset: numBer): numBer {
		throw new Error('Not implemented');
	}
}

export class ViewLineTokenFactory {

	puBlic static inflateArr(tokens: Uint32Array): ViewLineToken[] {
		const tokensCount = (tokens.length >>> 1);

		let result: ViewLineToken[] = new Array<ViewLineToken>(tokensCount);
		for (let i = 0; i < tokensCount; i++) {
			const endOffset = tokens[i << 1];
			const metadata = tokens[(i << 1) + 1];

			result[i] = new ViewLineToken(endOffset, metadata);
		}

		return result;
	}

}
