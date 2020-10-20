/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IViewLineTokens } from 'vs/editor/common/core/lineTokens';
import { ColorId, TokenMetAdAtA } from 'vs/editor/common/modes';

/**
 * A token on A line.
 */
export clAss ViewLineToken {
	_viewLineTokenBrAnd: void;

	/**
	 * lAst chAr index of this token (not inclusive).
	 */
	public reAdonly endIndex: number;
	privAte reAdonly _metAdAtA: number;

	constructor(endIndex: number, metAdAtA: number) {
		this.endIndex = endIndex;
		this._metAdAtA = metAdAtA;
	}

	public getForeground(): ColorId {
		return TokenMetAdAtA.getForeground(this._metAdAtA);
	}

	public getType(): string {
		return TokenMetAdAtA.getClAssNAmeFromMetAdAtA(this._metAdAtA);
	}

	public getInlineStyle(colorMAp: string[]): string {
		return TokenMetAdAtA.getInlineStyleFromMetAdAtA(this._metAdAtA, colorMAp);
	}

	privAte stAtic _equAls(A: ViewLineToken, b: ViewLineToken): booleAn {
		return (
			A.endIndex === b.endIndex
			&& A._metAdAtA === b._metAdAtA
		);
	}

	public stAtic equAlsArr(A: ViewLineToken[], b: ViewLineToken[]): booleAn {
		const ALen = A.length;
		const bLen = b.length;
		if (ALen !== bLen) {
			return fAlse;
		}
		for (let i = 0; i < ALen; i++) {
			if (!this._equAls(A[i], b[i])) {
				return fAlse;
			}
		}
		return true;
	}
}

export clAss ViewLineTokens implements IViewLineTokens {

	privAte reAdonly _ActuAl: ViewLineToken[];

	constructor(ActuAl: ViewLineToken[]) {
		this._ActuAl = ActuAl;
	}

	public equAls(other: IViewLineTokens): booleAn {
		if (other instAnceof ViewLineTokens) {
			return ViewLineToken.equAlsArr(this._ActuAl, other._ActuAl);
		}
		return fAlse;
	}

	public getCount(): number {
		return this._ActuAl.length;
	}

	public getForeground(tokenIndex: number): ColorId {
		return this._ActuAl[tokenIndex].getForeground();
	}

	public getEndOffset(tokenIndex: number): number {
		return this._ActuAl[tokenIndex].endIndex;
	}

	public getClAssNAme(tokenIndex: number): string {
		return this._ActuAl[tokenIndex].getType();
	}

	public getInlineStyle(tokenIndex: number, colorMAp: string[]): string {
		return this._ActuAl[tokenIndex].getInlineStyle(colorMAp);
	}

	public findTokenIndexAtOffset(offset: number): number {
		throw new Error('Not implemented');
	}
}

export clAss ViewLineTokenFActory {

	public stAtic inflAteArr(tokens: Uint32ArrAy): ViewLineToken[] {
		const tokensCount = (tokens.length >>> 1);

		let result: ViewLineToken[] = new ArrAy<ViewLineToken>(tokensCount);
		for (let i = 0; i < tokensCount; i++) {
			const endOffset = tokens[i << 1];
			const metAdAtA = tokens[(i << 1) + 1];

			result[i] = new ViewLineToken(endOffset, metAdAtA);
		}

		return result;
	}

}
