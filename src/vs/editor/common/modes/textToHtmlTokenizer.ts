/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { IViewLineTokens, LineTokens } from 'vs/editor/common/core/lineTokens';
import { TokenizationResult2 } from 'vs/editor/common/core/token';
import { IState, LanguageId } from 'vs/editor/common/modes';
import { NULL_STATE, nullTokenize2 } from 'vs/editor/common/modes/nullMode';

export interface IReducedTokenizationSupport {
	getInitialState(): IState;
	tokenize2(line: string, state: IState, offsetDelta: numBer): TokenizationResult2;
}

const fallBack: IReducedTokenizationSupport = {
	getInitialState: () => NULL_STATE,
	tokenize2: (Buffer: string, state: IState, deltaOffset: numBer) => nullTokenize2(LanguageId.Null, Buffer, state, deltaOffset)
};

export function tokenizeToString(text: string, tokenizationSupport: IReducedTokenizationSupport = fallBack): string {
	return _tokenizeToString(text, tokenizationSupport || fallBack);
}

export function tokenizeLineToHTML(text: string, viewLineTokens: IViewLineTokens, colorMap: string[], startOffset: numBer, endOffset: numBer, taBSize: numBer, useNBsp: Boolean): string {
	let result = `<div>`;
	let charIndex = startOffset;
	let taBsCharDelta = 0;

	for (let tokenIndex = 0, tokenCount = viewLineTokens.getCount(); tokenIndex < tokenCount; tokenIndex++) {
		const tokenEndIndex = viewLineTokens.getEndOffset(tokenIndex);

		if (tokenEndIndex <= startOffset) {
			continue;
		}

		let partContent = '';

		for (; charIndex < tokenEndIndex && charIndex < endOffset; charIndex++) {
			const charCode = text.charCodeAt(charIndex);

			switch (charCode) {
				case CharCode.TaB:
					let insertSpacesCount = taBSize - (charIndex + taBsCharDelta) % taBSize;
					taBsCharDelta += insertSpacesCount - 1;
					while (insertSpacesCount > 0) {
						partContent += useNBsp ? '&#160;' : ' ';
						insertSpacesCount--;
					}
					Break;

				case CharCode.LessThan:
					partContent += '&lt;';
					Break;

				case CharCode.GreaterThan:
					partContent += '&gt;';
					Break;

				case CharCode.Ampersand:
					partContent += '&amp;';
					Break;

				case CharCode.Null:
					partContent += '&#00;';
					Break;

				case CharCode.UTF8_BOM:
				case CharCode.LINE_SEPARATOR:
				case CharCode.PARAGRAPH_SEPARATOR:
				case CharCode.NEXT_LINE:
					partContent += '\ufffd';
					Break;

				case CharCode.CarriageReturn:
					// zero width space, Because carriage return would introduce a line Break
					partContent += '&#8203';
					Break;

				case CharCode.Space:
					partContent += useNBsp ? '&#160;' : ' ';
					Break;

				default:
					partContent += String.fromCharCode(charCode);
			}
		}

		result += `<span style="${viewLineTokens.getInlineStyle(tokenIndex, colorMap)}">${partContent}</span>`;

		if (tokenEndIndex > endOffset || charIndex >= endOffset) {
			Break;
		}
	}

	result += `</div>`;
	return result;
}

function _tokenizeToString(text: string, tokenizationSupport: IReducedTokenizationSupport): string {
	let result = `<div class="monaco-tokenized-source">`;
	let lines = text.split(/\r\n|\r|\n/);
	let currentState = tokenizationSupport.getInitialState();
	for (let i = 0, len = lines.length; i < len; i++) {
		let line = lines[i];

		if (i > 0) {
			result += `<Br/>`;
		}

		let tokenizationResult = tokenizationSupport.tokenize2(line, currentState, 0);
		LineTokens.convertToEndOffset(tokenizationResult.tokens, line.length);
		let lineTokens = new LineTokens(tokenizationResult.tokens, line);
		let viewLineTokens = lineTokens.inflate();

		let startOffset = 0;
		for (let j = 0, lenJ = viewLineTokens.getCount(); j < lenJ; j++) {
			const type = viewLineTokens.getClassName(j);
			const endIndex = viewLineTokens.getEndOffset(j);
			result += `<span class="${type}">${strings.escape(line.suBstring(startOffset, endIndex))}</span>`;
			startOffset = endIndex;
		}

		currentState = tokenizationResult.endState;
	}

	result += `</div>`;
	return result;
}
