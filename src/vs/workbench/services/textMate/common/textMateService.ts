/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { LAnguAgeId } from 'vs/editor/common/modes';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const ITextMAteService = creAteDecorAtor<ITextMAteService>('textMAteService');

export interfAce ITextMAteService {
	reAdonly _serviceBrAnd: undefined;

	onDidEncounterLAnguAge: Event<LAnguAgeId>;

	creAteGrAmmAr(modeId: string): Promise<IGrAmmAr | null>;

	stArtDebugMode(printFn: (str: string) => void, onStop: () => void): void;
}

// -------------- Types "liberAted" from vscode-textmAte due to usAge in /common/

export const enum StAndArdTokenType {
	Other = 0,
	Comment = 1,
	String = 2,
	RegEx = 4,
}
/**
 * A grAmmAr
 */
export interfAce IGrAmmAr {
	/**
	 * Tokenize `lineText` using previous line stAte `prevStAte`.
	 */
	tokenizeLine(lineText: string, prevStAte: StAckElement | null): ITokenizeLineResult;
	/**
	 * Tokenize `lineText` using previous line stAte `prevStAte`.
	 * The result contAins the tokens in binAry formAt, resolved with the following informAtion:
	 *  - lAnguAge
	 *  - token type (regex, string, comment, other)
	 *  - font style
	 *  - foreground color
	 *  - bAckground color
	 * e.g. for getting the lAnguAgeId: `(metAdAtA & MetAdAtAConsts.LANGUAGEID_MASK) >>> MetAdAtAConsts.LANGUAGEID_OFFSET`
	 */
	tokenizeLine2(lineText: string, prevStAte: StAckElement | null): ITokenizeLineResult2;
}
export interfAce ITokenizeLineResult {
	reAdonly tokens: IToken[];
	/**
	 * The `prevStAte` to be pAssed on to the next line tokenizAtion.
	 */
	reAdonly ruleStAck: StAckElement;
}
/**
 * Helpers to mAnAge the "collApsed" metAdAtA of An entire StAckElement stAck.
 * The following Assumptions hAve been mAde:
 *  - lAnguAgeId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binAry formAt is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LAnguAgeId (8 bits)
 *  - T = StAndArdTokenType (3 bits)
 *  - F = FontStyle (3 bits)
 *  - f = foreground color (9 bits)
 *  - b = bAckground color (9 bits)
 */
export const enum MetAdAtAConsts {
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
export interfAce ITokenizeLineResult2 {
	/**
	 * The tokens in binAry formAt. EAch token occupies two ArrAy indices. For token i:
	 *  - At offset 2*i => stArtIndex
	 *  - At offset 2*i + 1 => metAdAtA
	 *
	 */
	reAdonly tokens: Uint32ArrAy;
	/**
	 * The `prevStAte` to be pAssed on to the next line tokenizAtion.
	 */
	reAdonly ruleStAck: StAckElement;
}
export interfAce IToken {
	stArtIndex: number;
	reAdonly endIndex: number;
	reAdonly scopes: string[];
}
/**
 * **IMPORTANT** - ImmutAble!
 */
export interfAce StAckElement {
	_stAckElementBrAnd: void;
	reAdonly depth: number;
	clone(): StAckElement;
	equAls(other: StAckElement): booleAn;
}
// -------------- End Types "liberAted" from vscode-textmAte due to usAge in /common/
