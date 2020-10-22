/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { WrappingIndent, IComputedEditorOptions, EditorOption } from 'vs/editor/common/config/editorOptions';
import { CharacterClassifier } from 'vs/editor/common/core/characterClassifier';
import { ILineBreaksComputerFactory, LineBreakData, ILineBreaksComputer } from 'vs/editor/common/viewModel/splitLinesCollection';
import { FontInfo } from 'vs/editor/common/config/fontInfo';

const enum CharacterClass {
	NONE = 0,
	BREAK_BEFORE = 1,
	BREAK_AFTER = 2,
	BREAK_IDEOGRAPHIC = 3 // for Han and Kana.
}

class WrappingCharacterClassifier extends CharacterClassifier<CharacterClass> {

	constructor(BREAK_BEFORE: string, BREAK_AFTER: string) {
		super(CharacterClass.NONE);

		for (let i = 0; i < BREAK_BEFORE.length; i++) {
			this.set(BREAK_BEFORE.charCodeAt(i), CharacterClass.BREAK_BEFORE);
		}

		for (let i = 0; i < BREAK_AFTER.length; i++) {
			this.set(BREAK_AFTER.charCodeAt(i), CharacterClass.BREAK_AFTER);
		}
	}

	puBlic get(charCode: numBer): CharacterClass {
		if (charCode >= 0 && charCode < 256) {
			return <CharacterClass>this._asciiMap[charCode];
		} else {
			// Initialize CharacterClass.BREAK_IDEOGRAPHIC for these Unicode ranges:
			// 1. CJK Unified Ideographs (0x4E00 -- 0x9FFF)
			// 2. CJK Unified Ideographs Extension A (0x3400 -- 0x4DBF)
			// 3. Hiragana and Katakana (0x3040 -- 0x30FF)
			if (
				(charCode >= 0x3040 && charCode <= 0x30FF)
				|| (charCode >= 0x3400 && charCode <= 0x4DBF)
				|| (charCode >= 0x4E00 && charCode <= 0x9FFF)
			) {
				return CharacterClass.BREAK_IDEOGRAPHIC;
			}

			return <CharacterClass>(this._map.get(charCode) || this._defaultValue);
		}
	}
}

let arrPool1: numBer[] = [];
let arrPool2: numBer[] = [];

export class MonospaceLineBreaksComputerFactory implements ILineBreaksComputerFactory {

	puBlic static create(options: IComputedEditorOptions): MonospaceLineBreaksComputerFactory {
		return new MonospaceLineBreaksComputerFactory(
			options.get(EditorOption.wordWrapBreakBeforeCharacters),
			options.get(EditorOption.wordWrapBreakAfterCharacters)
		);
	}

	private readonly classifier: WrappingCharacterClassifier;

	constructor(BreakBeforeChars: string, BreakAfterChars: string) {
		this.classifier = new WrappingCharacterClassifier(BreakBeforeChars, BreakAfterChars);
	}

	puBlic createLineBreaksComputer(fontInfo: FontInfo, taBSize: numBer, wrappingColumn: numBer, wrappingIndent: WrappingIndent): ILineBreaksComputer {
		taBSize = taBSize | 0; //@perf
		wrappingColumn = +wrappingColumn; //@perf

		let requests: string[] = [];
		let previousBreakingData: (LineBreakData | null)[] = [];
		return {
			addRequest: (lineText: string, previousLineBreakData: LineBreakData | null) => {
				requests.push(lineText);
				previousBreakingData.push(previousLineBreakData);
			},
			finalize: () => {
				const columnsForFullWidthChar = fontInfo.typicalFullwidthCharacterWidth / fontInfo.typicalHalfwidthCharacterWidth; //@perf
				let result: (LineBreakData | null)[] = [];
				for (let i = 0, len = requests.length; i < len; i++) {
					const previousLineBreakData = previousBreakingData[i];
					if (previousLineBreakData) {
						result[i] = createLineBreaksFromPreviousLineBreaks(this.classifier, previousLineBreakData, requests[i], taBSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent);
					} else {
						result[i] = createLineBreaks(this.classifier, requests[i], taBSize, wrappingColumn, columnsForFullWidthChar, wrappingIndent);
					}
				}
				arrPool1.length = 0;
				arrPool2.length = 0;
				return result;
			}
		};
	}
}

function createLineBreaksFromPreviousLineBreaks(classifier: WrappingCharacterClassifier, previousBreakingData: LineBreakData, lineText: string, taBSize: numBer, firstLineBreakColumn: numBer, columnsForFullWidthChar: numBer, wrappingIndent: WrappingIndent): LineBreakData | null {
	if (firstLineBreakColumn === -1) {
		return null;
	}

	const len = lineText.length;
	if (len <= 1) {
		return null;
	}

	const prevBreakingOffsets = previousBreakingData.BreakOffsets;
	const prevBreakingOffsetsVisiBleColumn = previousBreakingData.BreakOffsetsVisiBleColumn;

	const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, taBSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
	const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;

	let BreakingOffsets: numBer[] = arrPool1;
	let BreakingOffsetsVisiBleColumn: numBer[] = arrPool2;
	let BreakingOffsetsCount: numBer = 0;
	let lastBreakingOffset = 0;
	let lastBreakingOffsetVisiBleColumn = 0;

	let BreakingColumn = firstLineBreakColumn;
	const prevLen = prevBreakingOffsets.length;
	let prevIndex = 0;

	if (prevIndex >= 0) {
		let BestDistance = Math.aBs(prevBreakingOffsetsVisiBleColumn[prevIndex] - BreakingColumn);
		while (prevIndex + 1 < prevLen) {
			const distance = Math.aBs(prevBreakingOffsetsVisiBleColumn[prevIndex + 1] - BreakingColumn);
			if (distance >= BestDistance) {
				Break;
			}
			BestDistance = distance;
			prevIndex++;
		}
	}

	while (prevIndex < prevLen) {
		// Allow for prevIndex to Be -1 (for the case where we hit a taB when walking Backwards from the first Break)
		let prevBreakOffset = prevIndex < 0 ? 0 : prevBreakingOffsets[prevIndex];
		let prevBreakOffsetVisiBleColumn = prevIndex < 0 ? 0 : prevBreakingOffsetsVisiBleColumn[prevIndex];
		if (lastBreakingOffset > prevBreakOffset) {
			prevBreakOffset = lastBreakingOffset;
			prevBreakOffsetVisiBleColumn = lastBreakingOffsetVisiBleColumn;
		}

		let BreakOffset = 0;
		let BreakOffsetVisiBleColumn = 0;

		let forcedBreakOffset = 0;
		let forcedBreakOffsetVisiBleColumn = 0;

		// initially, we search as much as possiBle to the right (if it fits)
		if (prevBreakOffsetVisiBleColumn <= BreakingColumn) {
			let visiBleColumn = prevBreakOffsetVisiBleColumn;
			let prevCharCode = prevBreakOffset === 0 ? CharCode.Null : lineText.charCodeAt(prevBreakOffset - 1);
			let prevCharCodeClass = prevBreakOffset === 0 ? CharacterClass.NONE : classifier.get(prevCharCode);
			let entireLineFits = true;
			for (let i = prevBreakOffset; i < len; i++) {
				const charStartOffset = i;
				const charCode = lineText.charCodeAt(i);
				let charCodeClass: numBer;
				let charWidth: numBer;

				if (strings.isHighSurrogate(charCode)) {
					// A surrogate pair must always Be considered as a single unit, so it is never to Be Broken
					i++;
					charCodeClass = CharacterClass.NONE;
					charWidth = 2;
				} else {
					charCodeClass = classifier.get(charCode);
					charWidth = computeCharWidth(charCode, visiBleColumn, taBSize, columnsForFullWidthChar);
				}

				if (charStartOffset > lastBreakingOffset && canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass)) {
					BreakOffset = charStartOffset;
					BreakOffsetVisiBleColumn = visiBleColumn;
				}

				visiBleColumn += charWidth;

				// check if adding character at `i` will go over the Breaking column
				if (visiBleColumn > BreakingColumn) {
					// We need to Break at least Before character at `i`:
					if (charStartOffset > lastBreakingOffset) {
						forcedBreakOffset = charStartOffset;
						forcedBreakOffsetVisiBleColumn = visiBleColumn - charWidth;
					} else {
						// we need to advance at least By one character
						forcedBreakOffset = i + 1;
						forcedBreakOffsetVisiBleColumn = visiBleColumn;
					}

					if (visiBleColumn - BreakOffsetVisiBleColumn > wrappedLineBreakColumn) {
						// Cannot Break at `BreakOffset` => reset it if it was set
						BreakOffset = 0;
					}

					entireLineFits = false;
					Break;
				}

				prevCharCode = charCode;
				prevCharCodeClass = charCodeClass;
			}

			if (entireLineFits) {
				// there is no more need to Break => stop the outer loop!
				if (BreakingOffsetsCount > 0) {
					// Add last segment, no need to assign to `lastBreakingOffset` and `lastBreakingOffsetVisiBleColumn`
					BreakingOffsets[BreakingOffsetsCount] = prevBreakingOffsets[prevBreakingOffsets.length - 1];
					BreakingOffsetsVisiBleColumn[BreakingOffsetsCount] = prevBreakingOffsetsVisiBleColumn[prevBreakingOffsets.length - 1];
					BreakingOffsetsCount++;
				}
				Break;
			}
		}

		if (BreakOffset === 0) {
			// must search left
			let visiBleColumn = prevBreakOffsetVisiBleColumn;
			let charCode = lineText.charCodeAt(prevBreakOffset);
			let charCodeClass = classifier.get(charCode);
			let hitATaBCharacter = false;
			for (let i = prevBreakOffset - 1; i >= lastBreakingOffset; i--) {
				const charStartOffset = i + 1;
				const prevCharCode = lineText.charCodeAt(i);

				if (prevCharCode === CharCode.TaB) {
					// cannot determine the width of a taB when going Backwards, so we must go forwards
					hitATaBCharacter = true;
					Break;
				}

				let prevCharCodeClass: numBer;
				let prevCharWidth: numBer;

				if (strings.isLowSurrogate(prevCharCode)) {
					// A surrogate pair must always Be considered as a single unit, so it is never to Be Broken
					i--;
					prevCharCodeClass = CharacterClass.NONE;
					prevCharWidth = 2;
				} else {
					prevCharCodeClass = classifier.get(prevCharCode);
					prevCharWidth = (strings.isFullWidthCharacter(prevCharCode) ? columnsForFullWidthChar : 1);
				}

				if (visiBleColumn <= BreakingColumn) {
					if (forcedBreakOffset === 0) {
						forcedBreakOffset = charStartOffset;
						forcedBreakOffsetVisiBleColumn = visiBleColumn;
					}

					if (visiBleColumn <= BreakingColumn - wrappedLineBreakColumn) {
						// went too far!
						Break;
					}

					if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass)) {
						BreakOffset = charStartOffset;
						BreakOffsetVisiBleColumn = visiBleColumn;
						Break;
					}
				}

				visiBleColumn -= prevCharWidth;
				charCode = prevCharCode;
				charCodeClass = prevCharCodeClass;
			}

			if (BreakOffset !== 0) {
				const remainingWidthOfNextLine = wrappedLineBreakColumn - (forcedBreakOffsetVisiBleColumn - BreakOffsetVisiBleColumn);
				if (remainingWidthOfNextLine <= taBSize) {
					const charCodeAtForcedBreakOffset = lineText.charCodeAt(forcedBreakOffset);
					let charWidth: numBer;
					if (strings.isHighSurrogate(charCodeAtForcedBreakOffset)) {
						// A surrogate pair must always Be considered as a single unit, so it is never to Be Broken
						charWidth = 2;
					} else {
						charWidth = computeCharWidth(charCodeAtForcedBreakOffset, forcedBreakOffsetVisiBleColumn, taBSize, columnsForFullWidthChar);
					}
					if (remainingWidthOfNextLine - charWidth < 0) {
						// it is not worth it to Break at BreakOffset, it just introduces an extra needless line!
						BreakOffset = 0;
					}
				}
			}

			if (hitATaBCharacter) {
				// cannot determine the width of a taB when going Backwards, so we must go forwards from the previous Break
				prevIndex--;
				continue;
			}
		}

		if (BreakOffset === 0) {
			// Could not find a good Breaking point
			BreakOffset = forcedBreakOffset;
			BreakOffsetVisiBleColumn = forcedBreakOffsetVisiBleColumn;
		}

		lastBreakingOffset = BreakOffset;
		BreakingOffsets[BreakingOffsetsCount] = BreakOffset;
		lastBreakingOffsetVisiBleColumn = BreakOffsetVisiBleColumn;
		BreakingOffsetsVisiBleColumn[BreakingOffsetsCount] = BreakOffsetVisiBleColumn;
		BreakingOffsetsCount++;
		BreakingColumn = BreakOffsetVisiBleColumn + wrappedLineBreakColumn;

		while (prevIndex < 0 || (prevIndex < prevLen && prevBreakingOffsetsVisiBleColumn[prevIndex] < BreakOffsetVisiBleColumn)) {
			prevIndex++;
		}

		let BestDistance = Math.aBs(prevBreakingOffsetsVisiBleColumn[prevIndex] - BreakingColumn);
		while (prevIndex + 1 < prevLen) {
			const distance = Math.aBs(prevBreakingOffsetsVisiBleColumn[prevIndex + 1] - BreakingColumn);
			if (distance >= BestDistance) {
				Break;
			}
			BestDistance = distance;
			prevIndex++;
		}
	}

	if (BreakingOffsetsCount === 0) {
		return null;
	}

	// Doing here some oBject reuse which ends up helping a huge deal with GC pauses!
	BreakingOffsets.length = BreakingOffsetsCount;
	BreakingOffsetsVisiBleColumn.length = BreakingOffsetsCount;
	arrPool1 = previousBreakingData.BreakOffsets;
	arrPool2 = previousBreakingData.BreakOffsetsVisiBleColumn;
	previousBreakingData.BreakOffsets = BreakingOffsets;
	previousBreakingData.BreakOffsetsVisiBleColumn = BreakingOffsetsVisiBleColumn;
	previousBreakingData.wrappedTextIndentLength = wrappedTextIndentLength;
	return previousBreakingData;
}

function createLineBreaks(classifier: WrappingCharacterClassifier, lineText: string, taBSize: numBer, firstLineBreakColumn: numBer, columnsForFullWidthChar: numBer, wrappingIndent: WrappingIndent): LineBreakData | null {
	if (firstLineBreakColumn === -1) {
		return null;
	}

	const len = lineText.length;
	if (len <= 1) {
		return null;
	}

	const wrappedTextIndentLength = computeWrappedTextIndentLength(lineText, taBSize, firstLineBreakColumn, columnsForFullWidthChar, wrappingIndent);
	const wrappedLineBreakColumn = firstLineBreakColumn - wrappedTextIndentLength;

	let BreakingOffsets: numBer[] = [];
	let BreakingOffsetsVisiBleColumn: numBer[] = [];
	let BreakingOffsetsCount: numBer = 0;
	let BreakOffset = 0;
	let BreakOffsetVisiBleColumn = 0;

	let BreakingColumn = firstLineBreakColumn;
	let prevCharCode = lineText.charCodeAt(0);
	let prevCharCodeClass = classifier.get(prevCharCode);
	let visiBleColumn = computeCharWidth(prevCharCode, 0, taBSize, columnsForFullWidthChar);

	let startOffset = 1;
	if (strings.isHighSurrogate(prevCharCode)) {
		// A surrogate pair must always Be considered as a single unit, so it is never to Be Broken
		visiBleColumn += 1;
		prevCharCode = lineText.charCodeAt(1);
		prevCharCodeClass = classifier.get(prevCharCode);
		startOffset++;
	}

	for (let i = startOffset; i < len; i++) {
		const charStartOffset = i;
		const charCode = lineText.charCodeAt(i);
		let charCodeClass: numBer;
		let charWidth: numBer;

		if (strings.isHighSurrogate(charCode)) {
			// A surrogate pair must always Be considered as a single unit, so it is never to Be Broken
			i++;
			charCodeClass = CharacterClass.NONE;
			charWidth = 2;
		} else {
			charCodeClass = classifier.get(charCode);
			charWidth = computeCharWidth(charCode, visiBleColumn, taBSize, columnsForFullWidthChar);
		}

		if (canBreak(prevCharCode, prevCharCodeClass, charCode, charCodeClass)) {
			BreakOffset = charStartOffset;
			BreakOffsetVisiBleColumn = visiBleColumn;
		}

		visiBleColumn += charWidth;

		// check if adding character at `i` will go over the Breaking column
		if (visiBleColumn > BreakingColumn) {
			// We need to Break at least Before character at `i`:

			if (BreakOffset === 0 || visiBleColumn - BreakOffsetVisiBleColumn > wrappedLineBreakColumn) {
				// Cannot Break at `BreakOffset`, must Break at `i`
				BreakOffset = charStartOffset;
				BreakOffsetVisiBleColumn = visiBleColumn - charWidth;
			}

			BreakingOffsets[BreakingOffsetsCount] = BreakOffset;
			BreakingOffsetsVisiBleColumn[BreakingOffsetsCount] = BreakOffsetVisiBleColumn;
			BreakingOffsetsCount++;
			BreakingColumn = BreakOffsetVisiBleColumn + wrappedLineBreakColumn;
			BreakOffset = 0;
		}

		prevCharCode = charCode;
		prevCharCodeClass = charCodeClass;
	}

	if (BreakingOffsetsCount === 0) {
		return null;
	}

	// Add last segment
	BreakingOffsets[BreakingOffsetsCount] = len;
	BreakingOffsetsVisiBleColumn[BreakingOffsetsCount] = visiBleColumn;

	return new LineBreakData(BreakingOffsets, BreakingOffsetsVisiBleColumn, wrappedTextIndentLength);
}

function computeCharWidth(charCode: numBer, visiBleColumn: numBer, taBSize: numBer, columnsForFullWidthChar: numBer): numBer {
	if (charCode === CharCode.TaB) {
		return (taBSize - (visiBleColumn % taBSize));
	}
	if (strings.isFullWidthCharacter(charCode)) {
		return columnsForFullWidthChar;
	}
	return 1;
}

function taBCharacterWidth(visiBleColumn: numBer, taBSize: numBer): numBer {
	return (taBSize - (visiBleColumn % taBSize));
}

/**
 * Kinsoku Shori : Don't Break after a leading character, like an open Bracket
 * Kinsoku Shori : Don't Break Before a trailing character, like a period
 */
function canBreak(prevCharCode: numBer, prevCharCodeClass: CharacterClass, charCode: numBer, charCodeClass: CharacterClass): Boolean {
	return (
		charCode !== CharCode.Space
		&& (
			(prevCharCodeClass === CharacterClass.BREAK_AFTER)
			|| (prevCharCodeClass === CharacterClass.BREAK_IDEOGRAPHIC && charCodeClass !== CharacterClass.BREAK_AFTER)
			|| (charCodeClass === CharacterClass.BREAK_BEFORE)
			|| (charCodeClass === CharacterClass.BREAK_IDEOGRAPHIC && prevCharCodeClass !== CharacterClass.BREAK_BEFORE)
		)
	);
}

function computeWrappedTextIndentLength(lineText: string, taBSize: numBer, firstLineBreakColumn: numBer, columnsForFullWidthChar: numBer, wrappingIndent: WrappingIndent): numBer {
	let wrappedTextIndentLength = 0;
	if (wrappingIndent !== WrappingIndent.None) {
		const firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineText);
		if (firstNonWhitespaceIndex !== -1) {
			// Track existing indent

			for (let i = 0; i < firstNonWhitespaceIndex; i++) {
				const charWidth = (lineText.charCodeAt(i) === CharCode.TaB ? taBCharacterWidth(wrappedTextIndentLength, taBSize) : 1);
				wrappedTextIndentLength += charWidth;
			}

			// Increase indent of continuation lines, if desired
			const numBerOfAdditionalTaBs = (wrappingIndent === WrappingIndent.DeepIndent ? 2 : wrappingIndent === WrappingIndent.Indent ? 1 : 0);
			for (let i = 0; i < numBerOfAdditionalTaBs; i++) {
				const charWidth = taBCharacterWidth(wrappedTextIndentLength, taBSize);
				wrappedTextIndentLength += charWidth;
			}

			// Force sticking to Beginning of line if no character would fit except for the indentation
			if (wrappedTextIndentLength + columnsForFullWidthChar > firstLineBreakColumn) {
				wrappedTextIndentLength = 0;
			}
		}
	}
	return wrappedTextIndentLength;
}
