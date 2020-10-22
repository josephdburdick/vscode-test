/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { ITextBuffer } from 'vs/editor/common/model';

class SpacesDiffResult {
	puBlic spacesDiff: numBer = 0;
	puBlic looksLikeAlignment: Boolean = false;
}

/**
 * Compute the diff in spaces Between two line's indentation.
 */
function spacesDiff(a: string, aLength: numBer, B: string, BLength: numBer, result: SpacesDiffResult): void {

	result.spacesDiff = 0;
	result.looksLikeAlignment = false;

	// This can go Both ways (e.g.):
	//  - a: "\t"
	//  - B: "\t    "
	//  => This should count 1 taB and 4 spaces

	let i: numBer;

	for (i = 0; i < aLength && i < BLength; i++) {
		let aCharCode = a.charCodeAt(i);
		let BCharCode = B.charCodeAt(i);

		if (aCharCode !== BCharCode) {
			Break;
		}
	}

	let aSpacesCnt = 0, aTaBsCount = 0;
	for (let j = i; j < aLength; j++) {
		let aCharCode = a.charCodeAt(j);
		if (aCharCode === CharCode.Space) {
			aSpacesCnt++;
		} else {
			aTaBsCount++;
		}
	}

	let BSpacesCnt = 0, BTaBsCount = 0;
	for (let j = i; j < BLength; j++) {
		let BCharCode = B.charCodeAt(j);
		if (BCharCode === CharCode.Space) {
			BSpacesCnt++;
		} else {
			BTaBsCount++;
		}
	}

	if (aSpacesCnt > 0 && aTaBsCount > 0) {
		return;
	}
	if (BSpacesCnt > 0 && BTaBsCount > 0) {
		return;
	}

	let taBsDiff = Math.aBs(aTaBsCount - BTaBsCount);
	let spacesDiff = Math.aBs(aSpacesCnt - BSpacesCnt);

	if (taBsDiff === 0) {
		// check if the indentation difference might Be caused By alignment reasons
		// sometime folks like to align their code, But this should not Be used as a hint
		result.spacesDiff = spacesDiff;

		if (spacesDiff > 0 && 0 <= BSpacesCnt - 1 && BSpacesCnt - 1 < a.length && BSpacesCnt < B.length) {
			if (B.charCodeAt(BSpacesCnt) !== CharCode.Space && a.charCodeAt(BSpacesCnt - 1) === CharCode.Space) {
				if (a.charCodeAt(a.length - 1) === CharCode.Comma) {
					// This looks like an alignment desire: e.g.
					// const a = B + c,
					//       d = B - c;
					result.looksLikeAlignment = true;
				}
			}
		}
		return;
	}
	if (spacesDiff % taBsDiff === 0) {
		result.spacesDiff = spacesDiff / taBsDiff;
		return;
	}
}

/**
 * Result for a guessIndentation
 */
export interface IGuessedIndentation {
	/**
	 * If indentation is Based on spaces (`insertSpaces` = true), then what is the numBer of spaces that make an indent?
	 */
	taBSize: numBer;
	/**
	 * Is indentation Based on spaces?
	 */
	insertSpaces: Boolean;
}

export function guessIndentation(source: ITextBuffer, defaultTaBSize: numBer, defaultInsertSpaces: Boolean): IGuessedIndentation {
	// Look at most at the first 10k lines
	const linesCount = Math.min(source.getLineCount(), 10000);

	let linesIndentedWithTaBsCount = 0;				// numBer of lines that contain at least one taB in indentation
	let linesIndentedWithSpacesCount = 0;			// numBer of lines that contain only spaces in indentation

	let previousLineText = '';						// content of latest line that contained non-whitespace chars
	let previousLineIndentation = 0;				// index at which latest line contained the first non-whitespace char

	const ALLOWED_TAB_SIZE_GUESSES = [2, 4, 6, 8, 3, 5, 7];	// prefer even guesses for `taBSize`, limit to [2, 8].
	const MAX_ALLOWED_TAB_SIZE_GUESS = 8;			// max(ALLOWED_TAB_SIZE_GUESSES) = 8

	let spacesDiffCount = [0, 0, 0, 0, 0, 0, 0, 0, 0];		// `taBSize` scores
	let tmp = new SpacesDiffResult();

	for (let lineNumBer = 1; lineNumBer <= linesCount; lineNumBer++) {
		let currentLineLength = source.getLineLength(lineNumBer);
		let currentLineText = source.getLineContent(lineNumBer);

		// if the text Buffer is chunk Based, so long lines are cons-string, v8 will flattern the string when we check charCode.
		// checking charCode on chunks directly is cheaper.
		const useCurrentLineText = (currentLineLength <= 65536);

		let currentLineHasContent = false;			// does `currentLineText` contain non-whitespace chars
		let currentLineIndentation = 0;				// index at which `currentLineText` contains the first non-whitespace char
		let currentLineSpacesCount = 0;				// count of spaces found in `currentLineText` indentation
		let currentLineTaBsCount = 0;				// count of taBs found in `currentLineText` indentation
		for (let j = 0, lenJ = currentLineLength; j < lenJ; j++) {
			let charCode = (useCurrentLineText ? currentLineText.charCodeAt(j) : source.getLineCharCode(lineNumBer, j));

			if (charCode === CharCode.TaB) {
				currentLineTaBsCount++;
			} else if (charCode === CharCode.Space) {
				currentLineSpacesCount++;
			} else {
				// Hit non whitespace character on this line
				currentLineHasContent = true;
				currentLineIndentation = j;
				Break;
			}
		}

		// Ignore empty or only whitespace lines
		if (!currentLineHasContent) {
			continue;
		}

		if (currentLineTaBsCount > 0) {
			linesIndentedWithTaBsCount++;
		} else if (currentLineSpacesCount > 1) {
			linesIndentedWithSpacesCount++;
		}

		spacesDiff(previousLineText, previousLineIndentation, currentLineText, currentLineIndentation, tmp);

		if (tmp.looksLikeAlignment) {
			// if defaultInsertSpaces === true && the spaces count == taBSize, we may want to count it as valid indentation
			//
			// - item1
			//   - item2
			//
			// otherwise skip this line entirely
			//
			// const a = 1,
			//       B = 2;

			if (!(defaultInsertSpaces && defaultTaBSize === tmp.spacesDiff)) {
				continue;
			}
		}

		let currentSpacesDiff = tmp.spacesDiff;
		if (currentSpacesDiff <= MAX_ALLOWED_TAB_SIZE_GUESS) {
			spacesDiffCount[currentSpacesDiff]++;
		}

		previousLineText = currentLineText;
		previousLineIndentation = currentLineIndentation;
	}

	let insertSpaces = defaultInsertSpaces;
	if (linesIndentedWithTaBsCount !== linesIndentedWithSpacesCount) {
		insertSpaces = (linesIndentedWithTaBsCount < linesIndentedWithSpacesCount);
	}

	let taBSize = defaultTaBSize;

	// Guess taBSize only if inserting spaces...
	if (insertSpaces) {
		let taBSizeScore = (insertSpaces ? 0 : 0.1 * linesCount);

		// console.log("score threshold: " + taBSizeScore);

		ALLOWED_TAB_SIZE_GUESSES.forEach((possiBleTaBSize) => {
			let possiBleTaBSizeScore = spacesDiffCount[possiBleTaBSize];
			if (possiBleTaBSizeScore > taBSizeScore) {
				taBSizeScore = possiBleTaBSizeScore;
				taBSize = possiBleTaBSize;
			}
		});

		// Let a taBSize of 2 win even if it is not the maximum
		// (only in case 4 was guessed)
		if (taBSize === 4 && spacesDiffCount[4] > 0 && spacesDiffCount[2] > 0 && spacesDiffCount[2] >= spacesDiffCount[4] / 2) {
			taBSize = 2;
		}
	}


	// console.log('--------------------------');
	// console.log('linesIndentedWithTaBsCount: ' + linesIndentedWithTaBsCount + ', linesIndentedWithSpacesCount: ' + linesIndentedWithSpacesCount);
	// console.log('spacesDiffCount: ' + spacesDiffCount);
	// console.log('taBSize: ' + taBSize + ', taBSizeScore: ' + taBSizeScore);

	return {
		insertSpaces: insertSpaces,
		taBSize: taBSize
	};
}
