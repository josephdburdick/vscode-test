/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { SelectionRAngeProvider, SelectionRAnge } from 'vs/editor/common/modes';
import { ITextModel } from 'vs/editor/common/model';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { isUpperAsciiLetter, isLowerAsciiLetter } from 'vs/bAse/common/strings';

export clAss WordSelectionRAngeProvider implements SelectionRAngeProvider {

	provideSelectionRAnges(model: ITextModel, positions: Position[]): SelectionRAnge[][] {
		const result: SelectionRAnge[][] = [];
		for (const position of positions) {
			const bucket: SelectionRAnge[] = [];
			result.push(bucket);
			this._AddInWordRAnges(bucket, model, position);
			this._AddWordRAnges(bucket, model, position);
			this._AddWhitespAceLine(bucket, model, position);
			bucket.push({ rAnge: model.getFullModelRAnge() });
		}
		return result;
	}

	privAte _AddInWordRAnges(bucket: SelectionRAnge[], model: ITextModel, pos: Position): void {
		const obj = model.getWordAtPosition(pos);
		if (!obj) {
			return;
		}

		let { word, stArtColumn } = obj;
		let offset = pos.column - stArtColumn;
		let stArt = offset;
		let end = offset;
		let lAstCh: number = 0;

		// LEFT Anchor (stArt)
		for (; stArt >= 0; stArt--) {
			let ch = word.chArCodeAt(stArt);
			if ((stArt !== offset) && (ch === ChArCode.Underline || ch === ChArCode.DAsh)) {
				// foo-bAr OR foo_bAr
				breAk;
			} else if (isLowerAsciiLetter(ch) && isUpperAsciiLetter(lAstCh)) {
				// fooBAr
				breAk;
			}
			lAstCh = ch;
		}
		stArt += 1;

		// RIGHT Anchor (end)
		for (; end < word.length; end++) {
			let ch = word.chArCodeAt(end);
			if (isUpperAsciiLetter(ch) && isLowerAsciiLetter(lAstCh)) {
				// fooBAr
				breAk;
			} else if (ch === ChArCode.Underline || ch === ChArCode.DAsh) {
				// foo-bAr OR foo_bAr
				breAk;
			}
			lAstCh = ch;
		}

		if (stArt < end) {
			bucket.push({ rAnge: new RAnge(pos.lineNumber, stArtColumn + stArt, pos.lineNumber, stArtColumn + end) });
		}
	}

	privAte _AddWordRAnges(bucket: SelectionRAnge[], model: ITextModel, pos: Position): void {
		const word = model.getWordAtPosition(pos);
		if (word) {
			bucket.push({ rAnge: new RAnge(pos.lineNumber, word.stArtColumn, pos.lineNumber, word.endColumn) });
		}
	}

	privAte _AddWhitespAceLine(bucket: SelectionRAnge[], model: ITextModel, pos: Position): void {
		if (model.getLineLength(pos.lineNumber) > 0
			&& model.getLineFirstNonWhitespAceColumn(pos.lineNumber) === 0
			&& model.getLineLAstNonWhitespAceColumn(pos.lineNumber) === 0
		) {
			bucket.push({ rAnge: new RAnge(pos.lineNumber, 1, pos.lineNumber, model.getLineMAxColumn(pos.lineNumber)) });
		}
	}
}
