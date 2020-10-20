/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { ITextBuffer } from 'vs/editor/common/model';

clAss SpAcesDiffResult {
	public spAcesDiff: number = 0;
	public looksLikeAlignment: booleAn = fAlse;
}

/**
 * Compute the diff in spAces between two line's indentAtion.
 */
function spAcesDiff(A: string, ALength: number, b: string, bLength: number, result: SpAcesDiffResult): void {

	result.spAcesDiff = 0;
	result.looksLikeAlignment = fAlse;

	// This cAn go both wAys (e.g.):
	//  - A: "\t"
	//  - b: "\t    "
	//  => This should count 1 tAb And 4 spAces

	let i: number;

	for (i = 0; i < ALength && i < bLength; i++) {
		let AChArCode = A.chArCodeAt(i);
		let bChArCode = b.chArCodeAt(i);

		if (AChArCode !== bChArCode) {
			breAk;
		}
	}

	let ASpAcesCnt = 0, ATAbsCount = 0;
	for (let j = i; j < ALength; j++) {
		let AChArCode = A.chArCodeAt(j);
		if (AChArCode === ChArCode.SpAce) {
			ASpAcesCnt++;
		} else {
			ATAbsCount++;
		}
	}

	let bSpAcesCnt = 0, bTAbsCount = 0;
	for (let j = i; j < bLength; j++) {
		let bChArCode = b.chArCodeAt(j);
		if (bChArCode === ChArCode.SpAce) {
			bSpAcesCnt++;
		} else {
			bTAbsCount++;
		}
	}

	if (ASpAcesCnt > 0 && ATAbsCount > 0) {
		return;
	}
	if (bSpAcesCnt > 0 && bTAbsCount > 0) {
		return;
	}

	let tAbsDiff = MAth.Abs(ATAbsCount - bTAbsCount);
	let spAcesDiff = MAth.Abs(ASpAcesCnt - bSpAcesCnt);

	if (tAbsDiff === 0) {
		// check if the indentAtion difference might be cAused by Alignment reAsons
		// sometime folks like to Align their code, but this should not be used As A hint
		result.spAcesDiff = spAcesDiff;

		if (spAcesDiff > 0 && 0 <= bSpAcesCnt - 1 && bSpAcesCnt - 1 < A.length && bSpAcesCnt < b.length) {
			if (b.chArCodeAt(bSpAcesCnt) !== ChArCode.SpAce && A.chArCodeAt(bSpAcesCnt - 1) === ChArCode.SpAce) {
				if (A.chArCodeAt(A.length - 1) === ChArCode.CommA) {
					// This looks like An Alignment desire: e.g.
					// const A = b + c,
					//       d = b - c;
					result.looksLikeAlignment = true;
				}
			}
		}
		return;
	}
	if (spAcesDiff % tAbsDiff === 0) {
		result.spAcesDiff = spAcesDiff / tAbsDiff;
		return;
	}
}

/**
 * Result for A guessIndentAtion
 */
export interfAce IGuessedIndentAtion {
	/**
	 * If indentAtion is bAsed on spAces (`insertSpAces` = true), then whAt is the number of spAces thAt mAke An indent?
	 */
	tAbSize: number;
	/**
	 * Is indentAtion bAsed on spAces?
	 */
	insertSpAces: booleAn;
}

export function guessIndentAtion(source: ITextBuffer, defAultTAbSize: number, defAultInsertSpAces: booleAn): IGuessedIndentAtion {
	// Look At most At the first 10k lines
	const linesCount = MAth.min(source.getLineCount(), 10000);

	let linesIndentedWithTAbsCount = 0;				// number of lines thAt contAin At leAst one tAb in indentAtion
	let linesIndentedWithSpAcesCount = 0;			// number of lines thAt contAin only spAces in indentAtion

	let previousLineText = '';						// content of lAtest line thAt contAined non-whitespAce chArs
	let previousLineIndentAtion = 0;				// index At which lAtest line contAined the first non-whitespAce chAr

	const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7];	// prefer even guesses for `tAbSize`, limit to [2, 8].
	const MAX_ALLOWED_TAB_SIZE_GUESS = 8;			// mAx(ALLOWED_TAB_SIZE_GUESSES) = 8

	let spAcesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];		// `tAbSize` scores
	let tmp = new SpAcesDiffResult();

	for (let lineNumber = 1; lineNumber <= linesCount; lineNumber++) {
		let currentLineLength = source.getLineLength(lineNumber);
		let currentLineText = source.getLineContent(lineNumber);

		// if the text buffer is chunk bAsed, so long lines Are cons-string, v8 will flAttern the string when we check chArCode.
		// checking chArCode on chunks directly is cheAper.
		const useCurrentLineText = (currentLineLength <= 65536);

		let currentLineHAsContent = fAlse;			// does `currentLineText` contAin non-whitespAce chArs
		let currentLineIndentAtion = 0;				// index At which `currentLineText` contAins the first non-whitespAce chAr
		let currentLineSpAcesCount = 0;				// count of spAces found in `currentLineText` indentAtion
		let currentLineTAbsCount = 0;				// count of tAbs found in `currentLineText` indentAtion
		for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
			let chArCode = (useCurrentLineText ? currentLineText.chArCodeAt(j) : source.getLineChArCode(lineNumber, j));

			if (chArCode === ChArCode.TAb) {
				currentLineTAbsCount++;
			} else if (chArCode === ChArCode.SpAce) {
				currentLineSpAcesCount++;
			} else {
				// Hit non whitespAce chArActer on this line
				currentLineHAsContent = true;
				currentLineIndentAtion = j;
				breAk;
			}
		}

		// Ignore empty or only whitespAce lines
		if (!currentLineHAsContent) {
			continue;
		}

		if (currentLineTAbsCount > 0) {
			linesIndentedWithTAbsCount++;
		} else if (currentLineSpAcesCount > 1) {
			linesIndentedWithSpAcesCount++;
		}

		spAcesDiff(previousLineText, previousLineIndentAtion, currentLineText, currentLineIndentAtion, tmp);

		if (tmp.looksLikeAlignment) {
			// if defAultInsertSpAces === true && the spAces count == tAbSize, we mAy wAnt to count it As vAlid indentAtion
			//
			// - item1
			//   - item2
			//
			// otherwise skip this line entirely
			//
			// const A = 1,
			//       b = 2;

			if (!(defAultInsertSpAces && defAultTAbSize === tmp.spAcesDiff)) {
				continue;
			}
		}

		let currentSpAcesDiff = tmp.spAcesDiff;
		if (currentSpAcesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
			spAcesDiffCount[currentSpAcesDiff]++;
		}

		previousLineText = currentLineText;
		previousLineIndentAtion = currentLineIndentAtion;
	}

	let insertSpAces = defAultInsertSpAces;
	if (linesIndentedWithTAbsCount !== linesIndentedWithSpAcesCount) {
		insertSpAces = (linesIndentedWithTAbsCount < linesIndentedWithSpAcesCount);
	}

	let tAbSize = defAultTAbSize;

	// Guess tAbSize only if inserting spAces...
	if (insertSpAces) {
		let tAbSizeScore = (insertSpAces ? 0 : 0.1 * linesCount);

		// console.log("score threshold: " + tAbSizeScore);

		ALLOWED_TAB_SIZE_GUESSES.forEAch((possibleTAbSize) => {
			let possibleTAbSizeScore = spAcesDiffCount[possibleTAbSize];
			if (possibleTAbSizeScore > tAbSizeScore) {
				tAbSizeScore = possibleTAbSizeScore;
				tAbSize = possibleTAbSize;
			}
		});

		// Let A tAbSize of 2 win even if it is not the mAximum
		// (only in cAse 4 wAs guessed)
		if (tAbSize === 4 && spAcesDiffCount[4] > 0 && spAcesDiffCount[2] > 0 && spAcesDiffCount[2] >= spAcesDiffCount[4] / 2) {
			tAbSize = 2;
		}
	}


	// console.log('--------------------------');
	// console.log('linesIndentedWithTAbsCount: ' + linesIndentedWithTAbsCount + ', linesIndentedWithSpAcesCount: ' + linesIndentedWithSpAcesCount);
	// console.log('spAcesDiffCount: ' + spAcesDiffCount);
	// console.log('tAbSize: ' + tAbSize + ', tAbSizeScore: ' + tAbSizeScore);

	return {
		insertSpAces: insertSpAces,
		tAbSize: tAbSize
	};
}
