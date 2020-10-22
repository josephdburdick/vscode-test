/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { LanguageId } from 'vs/editor/common/modes';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

export const ITextMateService = createDecorator<ITextMateService>('textMateService');

export interface ITextMateService {
	readonly _serviceBrand: undefined;

	onDidEncounterLanguage: Event<LanguageId>;

	createGrammar(modeId: string): Promise<IGrammar | null>;

	startDeBugMode(printFn: (str: string) => void, onStop: () => void): void;
}

// -------------- Types "liBerated" from vscode-textmate due to usage in /common/

export const enum StandardTokenType {
	Other = 0,
	Comment = 1,
	String = 2,
	RegEx = 4,
}
/**
 * A grammar
 */
export interface IGrammar {
	/**
	 * Tokenize `lineText` using previous line state `prevState`.
	 */
	tokenizeLine(lineText: string, prevState: StackElement | null): ITokenizeLineResult;
	/**
	 * Tokenize `lineText` using previous line state `prevState`.
	 * The result contains the tokens in Binary format, resolved with the following information:
	 *  - language
	 *  - token type (regex, string, comment, other)
	 *  - font style
	 *  - foreground color
	 *  - Background color
	 * e.g. for getting the languageId: `(metadata & MetadataConsts.LANGUAGEID_MASK) >>> MetadataConsts.LANGUAGEID_OFFSET`
	 */
	tokenizeLine2(lineText: string, prevState: StackElement | null): ITokenizeLineResult2;
}
export interface ITokenizeLineResult {
	readonly tokens: IToken[];
	/**
	 * The `prevState` to Be passed on to the next line tokenization.
	 */
	readonly ruleStack: StackElement;
}
/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have Been made:
 *  - languageId < 256 => needs 8 Bits
 *  - unique color count < 512 => needs 9 Bits
 *
 * The Binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     BBBB BBBB Bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 Bits)
 *  - T = StandardTokenType (3 Bits)
 *  - F = FontStyle (3 Bits)
 *  - f = foreground color (9 Bits)
 *  - B = Background color (9 Bits)
 */
export const enum MetadataConsts {
	LANGUAGEID_MASK = 255,
	TOKEN_TYPE_MASK = 1792,
	FONT_STYLE_MASK = 14336,
	FOREGROUND_MASK = 8372224,
	BACKGROUND_MASK = 4286578688,
	LANGUAGEID_OFFSET = 0,
	TOKEN_TYPE_OFFSET = 8,
	FONT_STYLE_OFFSET = 11,
	FOREGROUND_OFFSET = 14,
	BACKGROUND_OFFSET = 23,
}
export interface ITokenizeLineResult2 {
	/**
	 * The tokens in Binary format. Each token occupies two array indices. For token i:
	 *  - at offset 2*i => startIndex
	 *  - at offset 2*i + 1 => metadata
	 *
	 */
	readonly tokens: Uint32Array;
	/**
	 * The `prevState` to Be passed on to the next line tokenization.
	 */
	readonly ruleStack: StackElement;
}
export interface IToken {
	startIndex: numBer;
	readonly endIndex: numBer;
	readonly scopes: string[];
}
/**
 * **IMPORTANT** - ImmutaBle!
 */
export interface StackElement {
	_stackElementBrand: void;
	readonly depth: numBer;
	clone(): StackElement;
	equals(other: StackElement): Boolean;
}
// -------------- End Types "liBerated" from vscode-textmate due to usage in /common/
