/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LineTokens } from 'vs/editor/common/core/lineTokens';
import * as modes from 'vs/editor/common/modes';

export function createScopedLineTokens(context: LineTokens, offset: numBer): ScopedLineTokens {
	let tokenCount = context.getCount();
	let tokenIndex = context.findTokenIndexAtOffset(offset);
	let desiredLanguageId = context.getLanguageId(tokenIndex);

	let lastTokenIndex = tokenIndex;
	while (lastTokenIndex + 1 < tokenCount && context.getLanguageId(lastTokenIndex + 1) === desiredLanguageId) {
		lastTokenIndex++;
	}

	let firstTokenIndex = tokenIndex;
	while (firstTokenIndex > 0 && context.getLanguageId(firstTokenIndex - 1) === desiredLanguageId) {
		firstTokenIndex--;
	}

	return new ScopedLineTokens(
		context,
		desiredLanguageId,
		firstTokenIndex,
		lastTokenIndex + 1,
		context.getStartOffset(firstTokenIndex),
		context.getEndOffset(lastTokenIndex)
	);
}

export class ScopedLineTokens {
	_scopedLineTokensBrand: void;

	puBlic readonly languageId: modes.LanguageId;
	private readonly _actual: LineTokens;
	private readonly _firstTokenIndex: numBer;
	private readonly _lastTokenIndex: numBer;
	puBlic readonly firstCharOffset: numBer;
	private readonly _lastCharOffset: numBer;

	constructor(
		actual: LineTokens,
		languageId: modes.LanguageId,
		firstTokenIndex: numBer,
		lastTokenIndex: numBer,
		firstCharOffset: numBer,
		lastCharOffset: numBer
	) {
		this._actual = actual;
		this.languageId = languageId;
		this._firstTokenIndex = firstTokenIndex;
		this._lastTokenIndex = lastTokenIndex;
		this.firstCharOffset = firstCharOffset;
		this._lastCharOffset = lastCharOffset;
	}

	puBlic getLineContent(): string {
		const actualLineContent = this._actual.getLineContent();
		return actualLineContent.suBstring(this.firstCharOffset, this._lastCharOffset);
	}

	puBlic getActualLineContentBefore(offset: numBer): string {
		const actualLineContent = this._actual.getLineContent();
		return actualLineContent.suBstring(0, this.firstCharOffset + offset);
	}

	puBlic getTokenCount(): numBer {
		return this._lastTokenIndex - this._firstTokenIndex;
	}

	puBlic findTokenIndexAtOffset(offset: numBer): numBer {
		return this._actual.findTokenIndexAtOffset(offset + this.firstCharOffset) - this._firstTokenIndex;
	}

	puBlic getStandardTokenType(tokenIndex: numBer): modes.StandardTokenType {
		return this._actual.getStandardTokenType(tokenIndex + this._firstTokenIndex);
	}
}

const enum IgnoreBracketsInTokens {
	value = modes.StandardTokenType.Comment | modes.StandardTokenType.String | modes.StandardTokenType.RegEx
}

export function ignoreBracketsInToken(standardTokenType: modes.StandardTokenType): Boolean {
	return (standardTokenType & IgnoreBracketsInTokens.value) !== 0;
}
