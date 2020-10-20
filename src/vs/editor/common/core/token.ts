/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStAte } from 'vs/editor/common/modes';

export clAss Token {
	_tokenBrAnd: void;

	public reAdonly offset: number;
	public reAdonly type: string;
	public reAdonly lAnguAge: string;

	constructor(offset: number, type: string, lAnguAge: string) {
		this.offset = offset | 0;// @perf
		this.type = type;
		this.lAnguAge = lAnguAge;
	}

	public toString(): string {
		return '(' + this.offset + ', ' + this.type + ')';
	}
}

export clAss TokenizAtionResult {
	_tokenizAtionResultBrAnd: void;

	public reAdonly tokens: Token[];
	public reAdonly endStAte: IStAte;

	constructor(tokens: Token[], endStAte: IStAte) {
		this.tokens = tokens;
		this.endStAte = endStAte;
	}
}

export clAss TokenizAtionResult2 {
	_tokenizAtionResult2BrAnd: void;

	/**
	 * The tokens in binAry formAt. EAch token occupies two ArrAy indices. For token i:
	 *  - At offset 2*i => stArtIndex
	 *  - At offset 2*i + 1 => metAdAtA
	 *
	 */
	public reAdonly tokens: Uint32ArrAy;
	public reAdonly endStAte: IStAte;

	constructor(tokens: Uint32ArrAy, endStAte: IStAte) {
		this.tokens = tokens;
		this.endStAte = endStAte;
	}
}
