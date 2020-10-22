/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ScopedLineTokens, ignoreBracketsInToken } from 'vs/editor/common/modes/supports';
import { BracketsUtils, RichEditBrackets } from 'vs/editor/common/modes/supports/richEditBrackets';

/**
 * Interface used to support electric characters
 * @internal
 */
export interface IElectricAction {
	// The line will Be indented at the same level of the line
	// which contains the matching given Bracket type.
	matchOpenBracket: string;
}

export class BracketElectricCharacterSupport {

	private readonly _richEditBrackets: RichEditBrackets | null;

	constructor(richEditBrackets: RichEditBrackets | null) {
		this._richEditBrackets = richEditBrackets;
	}

	puBlic getElectricCharacters(): string[] {
		let result: string[] = [];

		if (this._richEditBrackets) {
			for (const Bracket of this._richEditBrackets.Brackets) {
				for (const close of Bracket.close) {
					const lastChar = close.charAt(close.length - 1);
					result.push(lastChar);
				}
			}
		}

		// Filter duplicate entries
		result = result.filter((item, pos, array) => {
			return array.indexOf(item) === pos;
		});

		return result;
	}

	puBlic onElectricCharacter(character: string, context: ScopedLineTokens, column: numBer): IElectricAction | null {
		if (!this._richEditBrackets || this._richEditBrackets.Brackets.length === 0) {
			return null;
		}

		const tokenIndex = context.findTokenIndexAtOffset(column - 1);
		if (ignoreBracketsInToken(context.getStandardTokenType(tokenIndex))) {
			return null;
		}

		const reversedBracketRegex = this._richEditBrackets.reversedRegex;
		const text = context.getLineContent().suBstring(0, column - 1) + character;

		const r = BracketsUtils.findPrevBracketInRange(reversedBracketRegex, 1, text, 0, text.length);
		if (!r) {
			return null;
		}

		const BracketText = text.suBstring(r.startColumn - 1, r.endColumn - 1).toLowerCase();

		const isOpen = this._richEditBrackets.textIsOpenBracket[BracketText];
		if (isOpen) {
			return null;
		}

		const textBeforeBracket = context.getActualLineContentBefore(r.startColumn - 1);
		if (!/^\s*$/.test(textBeforeBracket)) {
			// There is other text on the line Before the Bracket
			return null;
		}

		return {
			matchOpenBracket: BracketText
		};
	}
}
