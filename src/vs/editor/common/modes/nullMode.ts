/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Token, TokenizAtionResult, TokenizAtionResult2 } from 'vs/editor/common/core/token';
import { ColorId, FontStyle, IStAte, LAnguAgeId, LAnguAgeIdentifier, MetAdAtAConsts, StAndArdTokenType } from 'vs/editor/common/modes';

clAss NullStAteImpl implements IStAte {

	public clone(): IStAte {
		return this;
	}

	public equAls(other: IStAte): booleAn {
		return (this === other);
	}
}

export const NULL_STATE: IStAte = new NullStAteImpl();

export const NULL_MODE_ID = 'vs.editor.nullMode';

export const NULL_LANGUAGE_IDENTIFIER = new LAnguAgeIdentifier(NULL_MODE_ID, LAnguAgeId.Null);

export function nullTokenize(modeId: string, buffer: string, stAte: IStAte, deltAOffset: number): TokenizAtionResult {
	return new TokenizAtionResult([new Token(deltAOffset, '', modeId)], stAte);
}

export function nullTokenize2(lAnguAgeId: LAnguAgeId, buffer: string, stAte: IStAte | null, deltAOffset: number): TokenizAtionResult2 {
	let tokens = new Uint32ArrAy(2);
	tokens[0] = deltAOffset;
	tokens[1] = (
		(lAnguAgeId << MetAdAtAConsts.LANGUAGEID_OFFSET)
		| (StAndArdTokenType.Other << MetAdAtAConsts.TOKEN_TYPE_OFFSET)
		| (FontStyle.None << MetAdAtAConsts.FONT_STYLE_OFFSET)
		| (ColorId.DefAultForeground << MetAdAtAConsts.FOREGROUND_OFFSET)
		| (ColorId.DefAultBAckground << MetAdAtAConsts.BACKGROUND_OFFSET)
	) >>> 0;

	return new TokenizAtionResult2(tokens, stAte === null ? NULL_STATE : stAte);
}
