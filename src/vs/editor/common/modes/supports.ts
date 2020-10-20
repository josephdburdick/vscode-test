/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LineTokens } from 'vs/editor/common/core/lineTokens';
import * As modes from 'vs/editor/common/modes';

export function creAteScopedLineTokens(context: LineTokens, offset: number): ScopedLineTokens {
	let tokenCount = context.getCount();
	let tokenIndex = context.findTokenIndexAtOffset(offset);
	let desiredLAnguAgeId = context.getLAnguAgeId(tokenIndex);

	let lAstTokenIndex = tokenIndex;
	while (lAstTokenIndex + 1 < tokenCount && context.getLAnguAgeId(lAstTokenIndex + 1) === desiredLAnguAgeId) {
		lAstTokenIndex++;
	}

	let firstTokenIndex = tokenIndex;
	while (firstTokenIndex > 0 && context.getLAnguAgeId(firstTokenIndex - 1) === desiredLAnguAgeId) {
		firstTokenIndex--;
	}

	return new ScopedLineTokens(
		context,
		desiredLAnguAgeId,
		firstTokenIndex,
		lAstTokenIndex + 1,
		context.getStArtOffset(firstTokenIndex),
		context.getEndOffset(lAstTokenIndex)
	);
}

export clAss ScopedLineTokens {
	_scopedLineTokensBrAnd: void;

	public reAdonly lAnguAgeId: modes.LAnguAgeId;
	privAte reAdonly _ActuAl: LineTokens;
	privAte reAdonly _firstTokenIndex: number;
	privAte reAdonly _lAstTokenIndex: number;
	public reAdonly firstChArOffset: number;
	privAte reAdonly _lAstChArOffset: number;

	constructor(
		ActuAl: LineTokens,
		lAnguAgeId: modes.LAnguAgeId,
		firstTokenIndex: number,
		lAstTokenIndex: number,
		firstChArOffset: number,
		lAstChArOffset: number
	) {
		this._ActuAl = ActuAl;
		this.lAnguAgeId = lAnguAgeId;
		this._firstTokenIndex = firstTokenIndex;
		this._lAstTokenIndex = lAstTokenIndex;
		this.firstChArOffset = firstChArOffset;
		this._lAstChArOffset = lAstChArOffset;
	}

	public getLineContent(): string {
		const ActuAlLineContent = this._ActuAl.getLineContent();
		return ActuAlLineContent.substring(this.firstChArOffset, this._lAstChArOffset);
	}

	public getActuAlLineContentBefore(offset: number): string {
		const ActuAlLineContent = this._ActuAl.getLineContent();
		return ActuAlLineContent.substring(0, this.firstChArOffset + offset);
	}

	public getTokenCount(): number {
		return this._lAstTokenIndex - this._firstTokenIndex;
	}

	public findTokenIndexAtOffset(offset: number): number {
		return this._ActuAl.findTokenIndexAtOffset(offset + this.firstChArOffset) - this._firstTokenIndex;
	}

	public getStAndArdTokenType(tokenIndex: number): modes.StAndArdTokenType {
		return this._ActuAl.getStAndArdTokenType(tokenIndex + this._firstTokenIndex);
	}
}

const enum IgnoreBrAcketsInTokens {
	vAlue = modes.StAndArdTokenType.Comment | modes.StAndArdTokenType.String | modes.StAndArdTokenType.RegEx
}

export function ignoreBrAcketsInToken(stAndArdTokenType: modes.StAndArdTokenType): booleAn {
	return (stAndArdTokenType & IgnoreBrAcketsInTokens.vAlue) !== 0;
}
