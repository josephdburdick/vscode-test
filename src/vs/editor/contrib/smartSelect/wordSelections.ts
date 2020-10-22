/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { SelectionRangeProvider, SelectionRange } from 'vs/editor/common/modes';
import { ITextModel } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { CharCode } from 'vs/Base/common/charCode';
import { isUpperAsciiLetter, isLowerAsciiLetter } from 'vs/Base/common/strings';

export class WordSelectionRangeProvider implements SelectionRangeProvider {

	provideSelectionRanges(model: ITextModel, positions: Position[]): SelectionRange[][] {
		const result: SelectionRange[][] = [];
		for (const position of positions) {
			const Bucket: SelectionRange[] = [];
			result.push(Bucket);
			this._addInWordRanges(Bucket, model, position);
			this._addWordRanges(Bucket, model, position);
			this._addWhitespaceLine(Bucket, model, position);
			Bucket.push({ range: model.getFullModelRange() });
		}
		return result;
	}

	private _addInWordRanges(Bucket: SelectionRange[], model: ITextModel, pos: Position): void {
		const oBj = model.getWordAtPosition(pos);
		if (!oBj) {
			return;
		}

		let { word, startColumn } = oBj;
		let offset = pos.column - startColumn;
		let start = offset;
		let end = offset;
		let lastCh: numBer = 0;

		// LEFT anchor (start)
		for (; start >= 0; start--) {
			let ch = word.charCodeAt(start);
			if ((start !== offset) && (ch === CharCode.Underline || ch === CharCode.Dash)) {
				// foo-Bar OR foo_Bar
				Break;
			} else if (isLowerAsciiLetter(ch) && isUpperAsciiLetter(lastCh)) {
				// fooBar
				Break;
			}
			lastCh = ch;
		}
		start += 1;

		// RIGHT anchor (end)
		for (; end < word.length; end++) {
			let ch = word.charCodeAt(end);
			if (isUpperAsciiLetter(ch) && isLowerAsciiLetter(lastCh)) {
				// fooBar
				Break;
			} else if (ch === CharCode.Underline || ch === CharCode.Dash) {
				// foo-Bar OR foo_Bar
				Break;
			}
			lastCh = ch;
		}

		if (start < end) {
			Bucket.push({ range: new Range(pos.lineNumBer, startColumn + start, pos.lineNumBer, startColumn + end) });
		}
	}

	private _addWordRanges(Bucket: SelectionRange[], model: ITextModel, pos: Position): void {
		const word = model.getWordAtPosition(pos);
		if (word) {
			Bucket.push({ range: new Range(pos.lineNumBer, word.startColumn, pos.lineNumBer, word.endColumn) });
		}
	}

	private _addWhitespaceLine(Bucket: SelectionRange[], model: ITextModel, pos: Position): void {
		if (model.getLineLength(pos.lineNumBer) > 0
			&& model.getLineFirstNonWhitespaceColumn(pos.lineNumBer) === 0
			&& model.getLineLastNonWhitespaceColumn(pos.lineNumBer) === 0
		) {
			Bucket.push({ range: new Range(pos.lineNumBer, 1, pos.lineNumBer, model.getLineMaxColumn(pos.lineNumBer)) });
		}
	}
}
