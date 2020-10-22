/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IState } from 'vs/editor/common/modes';

export class Token {
	_tokenBrand: void;

	puBlic readonly offset: numBer;
	puBlic readonly type: string;
	puBlic readonly language: string;

	constructor(offset: numBer, type: string, language: string) {
		this.offset = offset | 0;// @perf
		this.type = type;
		this.language = language;
	}

	puBlic toString(): string {
		return '(' + this.offset + ', ' + this.type + ')';
	}
}

export class TokenizationResult {
	_tokenizationResultBrand: void;

	puBlic readonly tokens: Token[];
	puBlic readonly endState: IState;

	constructor(tokens: Token[], endState: IState) {
		this.tokens = tokens;
		this.endState = endState;
	}
}

export class TokenizationResult2 {
	_tokenizationResult2Brand: void;

	/**
	 * The tokens in Binary format. Each token occupies two array indices. For token i:
	 *  - at offset 2*i => startIndex
	 *  - at offset 2*i + 1 => metadata
	 *
	 */
	puBlic readonly tokens: Uint32Array;
	puBlic readonly endState: IState;

	constructor(tokens: Uint32Array, endState: IState) {
		this.tokens = tokens;
		this.endState = endState;
	}
}
