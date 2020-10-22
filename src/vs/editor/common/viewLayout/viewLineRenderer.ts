/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { IViewLineTokens } from 'vs/editor/common/core/lineTokens';
import { IStringBuilder, createStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { LineDecoration, LineDecorationsNormalizer } from 'vs/editor/common/viewLayout/lineDecorations';
import { InlineDecorationType } from 'vs/editor/common/viewModel/viewModel';

export const enum RenderWhitespace {
	None = 0,
	Boundary = 1,
	Selection = 2,
	Trailing = 3,
	All = 4
}

export const enum LinePartMetadata {
	IS_WHITESPACE = 1,
	PSEUDO_BEFORE = 2,
	PSEUDO_AFTER = 4,

	IS_WHITESPACE_MASK = 0B001,
	PSEUDO_BEFORE_MASK = 0B010,
	PSEUDO_AFTER_MASK = 0B100,
}

class LinePart {
	_linePartBrand: void;

	/**
	 * last char index of this token (not inclusive).
	 */
	puBlic readonly endIndex: numBer;
	puBlic readonly type: string;
	puBlic readonly metadata: numBer;

	constructor(endIndex: numBer, type: string, metadata: numBer) {
		this.endIndex = endIndex;
		this.type = type;
		this.metadata = metadata;
	}

	puBlic isWhitespace(): Boolean {
		return (this.metadata & LinePartMetadata.IS_WHITESPACE_MASK ? true : false);
	}
}

export class LineRange {
	/**
	 * Zero-Based offset on which the range starts, inclusive.
	 */
	puBlic readonly startOffset: numBer;

	/**
	 * Zero-Based offset on which the range ends, inclusive.
	 */
	puBlic readonly endOffset: numBer;

	constructor(startIndex: numBer, endIndex: numBer) {
		this.startOffset = startIndex;
		this.endOffset = endIndex;
	}

	puBlic equals(otherLineRange: LineRange) {
		return this.startOffset === otherLineRange.startOffset
			&& this.endOffset === otherLineRange.endOffset;
	}
}

export class RenderLineInput {

	puBlic readonly useMonospaceOptimizations: Boolean;
	puBlic readonly canUseHalfwidthRightwardsArrow: Boolean;
	puBlic readonly lineContent: string;
	puBlic readonly continuesWithWrappedLine: Boolean;
	puBlic readonly isBasicASCII: Boolean;
	puBlic readonly containsRTL: Boolean;
	puBlic readonly fauxIndentLength: numBer;
	puBlic readonly lineTokens: IViewLineTokens;
	puBlic readonly lineDecorations: LineDecoration[];
	puBlic readonly taBSize: numBer;
	puBlic readonly startVisiBleColumn: numBer;
	puBlic readonly spaceWidth: numBer;
	puBlic readonly renderSpaceWidth: numBer;
	puBlic readonly renderSpaceCharCode: numBer;
	puBlic readonly stopRenderingLineAfter: numBer;
	puBlic readonly renderWhitespace: RenderWhitespace;
	puBlic readonly renderControlCharacters: Boolean;
	puBlic readonly fontLigatures: Boolean;

	/**
	 * Defined only when renderWhitespace is 'selection'. Selections are non-overlapping,
	 * and ordered By position within the line.
	 */
	puBlic readonly selectionsOnLine: LineRange[] | null;

	constructor(
		useMonospaceOptimizations: Boolean,
		canUseHalfwidthRightwardsArrow: Boolean,
		lineContent: string,
		continuesWithWrappedLine: Boolean,
		isBasicASCII: Boolean,
		containsRTL: Boolean,
		fauxIndentLength: numBer,
		lineTokens: IViewLineTokens,
		lineDecorations: LineDecoration[],
		taBSize: numBer,
		startVisiBleColumn: numBer,
		spaceWidth: numBer,
		middotWidth: numBer,
		wsmiddotWidth: numBer,
		stopRenderingLineAfter: numBer,
		renderWhitespace: 'none' | 'Boundary' | 'selection' | 'trailing' | 'all',
		renderControlCharacters: Boolean,
		fontLigatures: Boolean,
		selectionsOnLine: LineRange[] | null
	) {
		this.useMonospaceOptimizations = useMonospaceOptimizations;
		this.canUseHalfwidthRightwardsArrow = canUseHalfwidthRightwardsArrow;
		this.lineContent = lineContent;
		this.continuesWithWrappedLine = continuesWithWrappedLine;
		this.isBasicASCII = isBasicASCII;
		this.containsRTL = containsRTL;
		this.fauxIndentLength = fauxIndentLength;
		this.lineTokens = lineTokens;
		this.lineDecorations = lineDecorations;
		this.taBSize = taBSize;
		this.startVisiBleColumn = startVisiBleColumn;
		this.spaceWidth = spaceWidth;
		this.stopRenderingLineAfter = stopRenderingLineAfter;
		this.renderWhitespace = (
			renderWhitespace === 'all'
				? RenderWhitespace.All
				: renderWhitespace === 'Boundary'
					? RenderWhitespace.Boundary
					: renderWhitespace === 'selection'
						? RenderWhitespace.Selection
						: renderWhitespace === 'trailing'
							? RenderWhitespace.Trailing
							: RenderWhitespace.None
		);
		this.renderControlCharacters = renderControlCharacters;
		this.fontLigatures = fontLigatures;
		this.selectionsOnLine = selectionsOnLine && selectionsOnLine.sort((a, B) => a.startOffset < B.startOffset ? -1 : 1);

		const wsmiddotDiff = Math.aBs(wsmiddotWidth - spaceWidth);
		const middotDiff = Math.aBs(middotWidth - spaceWidth);
		if (wsmiddotDiff < middotDiff) {
			this.renderSpaceWidth = wsmiddotWidth;
			this.renderSpaceCharCode = 0x2E31; // U+2E31 - WORD SEPARATOR MIDDLE DOT
		} else {
			this.renderSpaceWidth = middotWidth;
			this.renderSpaceCharCode = 0xB7; // U+00B7 - MIDDLE DOT
		}
	}

	private sameSelection(otherSelections: LineRange[] | null): Boolean {
		if (this.selectionsOnLine === null) {
			return otherSelections === null;
		}

		if (otherSelections === null) {
			return false;
		}

		if (otherSelections.length !== this.selectionsOnLine.length) {
			return false;
		}

		for (let i = 0; i < this.selectionsOnLine.length; i++) {
			if (!this.selectionsOnLine[i].equals(otherSelections[i])) {
				return false;
			}
		}

		return true;
	}

	puBlic equals(other: RenderLineInput): Boolean {
		return (
			this.useMonospaceOptimizations === other.useMonospaceOptimizations
			&& this.canUseHalfwidthRightwardsArrow === other.canUseHalfwidthRightwardsArrow
			&& this.lineContent === other.lineContent
			&& this.continuesWithWrappedLine === other.continuesWithWrappedLine
			&& this.isBasicASCII === other.isBasicASCII
			&& this.containsRTL === other.containsRTL
			&& this.fauxIndentLength === other.fauxIndentLength
			&& this.taBSize === other.taBSize
			&& this.startVisiBleColumn === other.startVisiBleColumn
			&& this.spaceWidth === other.spaceWidth
			&& this.renderSpaceWidth === other.renderSpaceWidth
			&& this.renderSpaceCharCode === other.renderSpaceCharCode
			&& this.stopRenderingLineAfter === other.stopRenderingLineAfter
			&& this.renderWhitespace === other.renderWhitespace
			&& this.renderControlCharacters === other.renderControlCharacters
			&& this.fontLigatures === other.fontLigatures
			&& LineDecoration.equalsArr(this.lineDecorations, other.lineDecorations)
			&& this.lineTokens.equals(other.lineTokens)
			&& this.sameSelection(other.selectionsOnLine)
		);
	}
}

export const enum CharacterMappingConstants {
	PART_INDEX_MASK = 0B11111111111111110000000000000000,
	CHAR_INDEX_MASK = 0B00000000000000001111111111111111,

	CHAR_INDEX_OFFSET = 0,
	PART_INDEX_OFFSET = 16
}

/**
 * Provides a Both direction mapping Between a line's character and its rendered position.
 */
export class CharacterMapping {

	puBlic static getPartIndex(partData: numBer): numBer {
		return (partData & CharacterMappingConstants.PART_INDEX_MASK) >>> CharacterMappingConstants.PART_INDEX_OFFSET;
	}

	puBlic static getCharIndex(partData: numBer): numBer {
		return (partData & CharacterMappingConstants.CHAR_INDEX_MASK) >>> CharacterMappingConstants.CHAR_INDEX_OFFSET;
	}

	puBlic readonly length: numBer;
	private readonly _data: Uint32Array;
	private readonly _aBsoluteOffsets: Uint32Array;

	constructor(length: numBer, partCount: numBer) {
		this.length = length;
		this._data = new Uint32Array(this.length);
		this._aBsoluteOffsets = new Uint32Array(this.length);
	}

	puBlic setPartData(charOffset: numBer, partIndex: numBer, charIndex: numBer, partABsoluteOffset: numBer): void {
		let partData = (
			(partIndex << CharacterMappingConstants.PART_INDEX_OFFSET)
			| (charIndex << CharacterMappingConstants.CHAR_INDEX_OFFSET)
		) >>> 0;
		this._data[charOffset] = partData;
		this._aBsoluteOffsets[charOffset] = partABsoluteOffset + charIndex;
	}

	puBlic getABsoluteOffsets(): Uint32Array {
		return this._aBsoluteOffsets;
	}

	puBlic charOffsetToPartData(charOffset: numBer): numBer {
		if (this.length === 0) {
			return 0;
		}
		if (charOffset < 0) {
			return this._data[0];
		}
		if (charOffset >= this.length) {
			return this._data[this.length - 1];
		}
		return this._data[charOffset];
	}

	puBlic partDataToCharOffset(partIndex: numBer, partLength: numBer, charIndex: numBer): numBer {
		if (this.length === 0) {
			return 0;
		}

		let searchEntry = (
			(partIndex << CharacterMappingConstants.PART_INDEX_OFFSET)
			| (charIndex << CharacterMappingConstants.CHAR_INDEX_OFFSET)
		) >>> 0;

		let min = 0;
		let max = this.length - 1;
		while (min + 1 < max) {
			let mid = ((min + max) >>> 1);
			let midEntry = this._data[mid];
			if (midEntry === searchEntry) {
				return mid;
			} else if (midEntry > searchEntry) {
				max = mid;
			} else {
				min = mid;
			}
		}

		if (min === max) {
			return min;
		}

		let minEntry = this._data[min];
		let maxEntry = this._data[max];

		if (minEntry === searchEntry) {
			return min;
		}
		if (maxEntry === searchEntry) {
			return max;
		}

		let minPartIndex = CharacterMapping.getPartIndex(minEntry);
		let minCharIndex = CharacterMapping.getCharIndex(minEntry);

		let maxPartIndex = CharacterMapping.getPartIndex(maxEntry);
		let maxCharIndex: numBer;

		if (minPartIndex !== maxPartIndex) {
			// sitting Between parts
			maxCharIndex = partLength;
		} else {
			maxCharIndex = CharacterMapping.getCharIndex(maxEntry);
		}

		let minEntryDistance = charIndex - minCharIndex;
		let maxEntryDistance = maxCharIndex - charIndex;

		if (minEntryDistance <= maxEntryDistance) {
			return min;
		}
		return max;
	}
}

export const enum ForeignElementType {
	None = 0,
	Before = 1,
	After = 2
}

export class RenderLineOutput {
	_renderLineOutputBrand: void;

	readonly characterMapping: CharacterMapping;
	readonly containsRTL: Boolean;
	readonly containsForeignElements: ForeignElementType;

	constructor(characterMapping: CharacterMapping, containsRTL: Boolean, containsForeignElements: ForeignElementType) {
		this.characterMapping = characterMapping;
		this.containsRTL = containsRTL;
		this.containsForeignElements = containsForeignElements;
	}
}

export function renderViewLine(input: RenderLineInput, sB: IStringBuilder): RenderLineOutput {
	if (input.lineContent.length === 0) {

		let containsForeignElements = ForeignElementType.None;

		let content: string = '<span><span></span></span>';

		if (input.lineDecorations.length > 0) {
			// This line is empty, But it contains inline decorations
			const BeforeClassNames: string[] = [];
			const afterClassNames: string[] = [];
			for (let i = 0, len = input.lineDecorations.length; i < len; i++) {
				const lineDecoration = input.lineDecorations[i];
				if (lineDecoration.type === InlineDecorationType.Before) {
					BeforeClassNames.push(input.lineDecorations[i].className);
					containsForeignElements |= ForeignElementType.Before;
				}
				if (lineDecoration.type === InlineDecorationType.After) {
					afterClassNames.push(input.lineDecorations[i].className);
					containsForeignElements |= ForeignElementType.After;
				}
			}

			if (containsForeignElements !== ForeignElementType.None) {
				const BeforeSpan = (BeforeClassNames.length > 0 ? `<span class="${BeforeClassNames.join(' ')}"></span>` : ``);
				const afterSpan = (afterClassNames.length > 0 ? `<span class="${afterClassNames.join(' ')}"></span>` : ``);
				content = `<span>${BeforeSpan}${afterSpan}</span>`;
			}
		}

		sB.appendASCIIString(content);
		return new RenderLineOutput(
			new CharacterMapping(0, 0),
			false,
			containsForeignElements
		);
	}

	return _renderLine(resolveRenderLineInput(input), sB);
}

export class RenderLineOutput2 {
	constructor(
		puBlic readonly characterMapping: CharacterMapping,
		puBlic readonly html: string,
		puBlic readonly containsRTL: Boolean,
		puBlic readonly containsForeignElements: ForeignElementType
	) {
	}
}

export function renderViewLine2(input: RenderLineInput): RenderLineOutput2 {
	let sB = createStringBuilder(10000);
	let out = renderViewLine(input, sB);
	return new RenderLineOutput2(out.characterMapping, sB.Build(), out.containsRTL, out.containsForeignElements);
}

class ResolvedRenderLineInput {
	constructor(
		puBlic readonly fontIsMonospace: Boolean,
		puBlic readonly canUseHalfwidthRightwardsArrow: Boolean,
		puBlic readonly lineContent: string,
		puBlic readonly len: numBer,
		puBlic readonly isOverflowing: Boolean,
		puBlic readonly parts: LinePart[],
		puBlic readonly containsForeignElements: ForeignElementType,
		puBlic readonly fauxIndentLength: numBer,
		puBlic readonly taBSize: numBer,
		puBlic readonly startVisiBleColumn: numBer,
		puBlic readonly containsRTL: Boolean,
		puBlic readonly spaceWidth: numBer,
		puBlic readonly renderSpaceCharCode: numBer,
		puBlic readonly renderWhitespace: RenderWhitespace,
		puBlic readonly renderControlCharacters: Boolean,
	) {
		//
	}
}

function resolveRenderLineInput(input: RenderLineInput): ResolvedRenderLineInput {
	const lineContent = input.lineContent;

	let isOverflowing: Boolean;
	let len: numBer;

	if (input.stopRenderingLineAfter !== -1 && input.stopRenderingLineAfter < lineContent.length) {
		isOverflowing = true;
		len = input.stopRenderingLineAfter;
	} else {
		isOverflowing = false;
		len = lineContent.length;
	}

	let tokens = transformAndRemoveOverflowing(input.lineTokens, input.fauxIndentLength, len);
	if (input.renderWhitespace === RenderWhitespace.All ||
		input.renderWhitespace === RenderWhitespace.Boundary ||
		(input.renderWhitespace === RenderWhitespace.Selection && !!input.selectionsOnLine) ||
		input.renderWhitespace === RenderWhitespace.Trailing) {

		tokens = _applyRenderWhitespace(input, lineContent, len, tokens);
	}
	let containsForeignElements = ForeignElementType.None;
	if (input.lineDecorations.length > 0) {
		for (let i = 0, len = input.lineDecorations.length; i < len; i++) {
			const lineDecoration = input.lineDecorations[i];
			if (lineDecoration.type === InlineDecorationType.RegularAffectingLetterSpacing) {
				// Pretend there are foreign elements... although not 100% accurate.
				containsForeignElements |= ForeignElementType.Before;
			} else if (lineDecoration.type === InlineDecorationType.Before) {
				containsForeignElements |= ForeignElementType.Before;
			} else if (lineDecoration.type === InlineDecorationType.After) {
				containsForeignElements |= ForeignElementType.After;
			}
		}
		tokens = _applyInlineDecorations(lineContent, len, tokens, input.lineDecorations);
	}
	if (!input.containsRTL) {
		// We can never split RTL text, as it ruins the rendering
		tokens = splitLargeTokens(lineContent, tokens, !input.isBasicASCII || input.fontLigatures);
	}

	return new ResolvedRenderLineInput(
		input.useMonospaceOptimizations,
		input.canUseHalfwidthRightwardsArrow,
		lineContent,
		len,
		isOverflowing,
		tokens,
		containsForeignElements,
		input.fauxIndentLength,
		input.taBSize,
		input.startVisiBleColumn,
		input.containsRTL,
		input.spaceWidth,
		input.renderSpaceCharCode,
		input.renderWhitespace,
		input.renderControlCharacters
	);
}

/**
 * In the rendering phase, characters are always looped until token.endIndex.
 * Ensure that all tokens end Before `len` and the last one ends precisely at `len`.
 */
function transformAndRemoveOverflowing(tokens: IViewLineTokens, fauxIndentLength: numBer, len: numBer): LinePart[] {
	let result: LinePart[] = [], resultLen = 0;

	// The faux indent part of the line should have no token type
	if (fauxIndentLength > 0) {
		result[resultLen++] = new LinePart(fauxIndentLength, '', 0);
	}

	for (let tokenIndex = 0, tokensLen = tokens.getCount(); tokenIndex < tokensLen; tokenIndex++) {
		const endIndex = tokens.getEndOffset(tokenIndex);
		if (endIndex <= fauxIndentLength) {
			// The faux indent part of the line should have no token type
			continue;
		}
		const type = tokens.getClassName(tokenIndex);
		if (endIndex >= len) {
			result[resultLen++] = new LinePart(len, type, 0);
			Break;
		}
		result[resultLen++] = new LinePart(endIndex, type, 0);
	}

	return result;
}

/**
 * written as a const enum to get value inlining.
 */
const enum Constants {
	LongToken = 50
}

/**
 * See https://githuB.com/microsoft/vscode/issues/6885.
 * It appears that having very large spans causes very slow reading of character positions.
 * So here we try to avoid that.
 */
function splitLargeTokens(lineContent: string, tokens: LinePart[], onlyAtSpaces: Boolean): LinePart[] {
	let lastTokenEndIndex = 0;
	let result: LinePart[] = [], resultLen = 0;

	if (onlyAtSpaces) {
		// Split only at spaces => we need to walk each character
		for (let i = 0, len = tokens.length; i < len; i++) {
			const token = tokens[i];
			const tokenEndIndex = token.endIndex;
			if (lastTokenEndIndex + Constants.LongToken < tokenEndIndex) {
				const tokenType = token.type;
				const tokenMetadata = token.metadata;

				let lastSpaceOffset = -1;
				let currTokenStart = lastTokenEndIndex;
				for (let j = lastTokenEndIndex; j < tokenEndIndex; j++) {
					if (lineContent.charCodeAt(j) === CharCode.Space) {
						lastSpaceOffset = j;
					}
					if (lastSpaceOffset !== -1 && j - currTokenStart >= Constants.LongToken) {
						// Split at `lastSpaceOffset` + 1
						result[resultLen++] = new LinePart(lastSpaceOffset + 1, tokenType, tokenMetadata);
						currTokenStart = lastSpaceOffset + 1;
						lastSpaceOffset = -1;
					}
				}
				if (currTokenStart !== tokenEndIndex) {
					result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata);
				}
			} else {
				result[resultLen++] = token;
			}

			lastTokenEndIndex = tokenEndIndex;
		}
	} else {
		// Split anywhere => we don't need to walk each character
		for (let i = 0, len = tokens.length; i < len; i++) {
			const token = tokens[i];
			const tokenEndIndex = token.endIndex;
			let diff = (tokenEndIndex - lastTokenEndIndex);
			if (diff > Constants.LongToken) {
				const tokenType = token.type;
				const tokenMetadata = token.metadata;
				const piecesCount = Math.ceil(diff / Constants.LongToken);
				for (let j = 1; j < piecesCount; j++) {
					let pieceEndIndex = lastTokenEndIndex + (j * Constants.LongToken);
					result[resultLen++] = new LinePart(pieceEndIndex, tokenType, tokenMetadata);
				}
				result[resultLen++] = new LinePart(tokenEndIndex, tokenType, tokenMetadata);
			} else {
				result[resultLen++] = token;
			}
			lastTokenEndIndex = tokenEndIndex;
		}
	}

	return result;
}

/**
 * Whitespace is rendered By "replacing" tokens with a special-purpose `mtkw` type that is later recognized in the rendering phase.
 * Moreover, a token is created for every visual indent Because on some fonts the glyphs used for rendering whitespace (&rarr; or &middot;) do not have the same width as &nBsp;.
 * The rendering phase will generate `style="width:..."` for these tokens.
 */
function _applyRenderWhitespace(input: RenderLineInput, lineContent: string, len: numBer, tokens: LinePart[]): LinePart[] {

	const continuesWithWrappedLine = input.continuesWithWrappedLine;
	const fauxIndentLength = input.fauxIndentLength;
	const taBSize = input.taBSize;
	const startVisiBleColumn = input.startVisiBleColumn;
	const useMonospaceOptimizations = input.useMonospaceOptimizations;
	const selections = input.selectionsOnLine;
	const onlyBoundary = (input.renderWhitespace === RenderWhitespace.Boundary);
	const onlyTrailing = (input.renderWhitespace === RenderWhitespace.Trailing);
	const generateLinePartForEachWhitespace = (input.renderSpaceWidth !== input.spaceWidth);

	let result: LinePart[] = [], resultLen = 0;
	let tokenIndex = 0;
	let tokenType = tokens[tokenIndex].type;
	let tokenEndIndex = tokens[tokenIndex].endIndex;
	const tokensLength = tokens.length;

	let lineIsEmptyOrWhitespace = false;
	let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
	let lastNonWhitespaceIndex: numBer;
	if (firstNonWhitespaceIndex === -1) {
		lineIsEmptyOrWhitespace = true;
		firstNonWhitespaceIndex = len;
		lastNonWhitespaceIndex = len;
	} else {
		lastNonWhitespaceIndex = strings.lastNonWhitespaceIndex(lineContent);
	}

	let wasInWhitespace = false;
	let currentSelectionIndex = 0;
	let currentSelection = selections && selections[currentSelectionIndex];
	let tmpIndent = startVisiBleColumn % taBSize;
	for (let charIndex = fauxIndentLength; charIndex < len; charIndex++) {
		const chCode = lineContent.charCodeAt(charIndex);

		if (currentSelection && charIndex >= currentSelection.endOffset) {
			currentSelectionIndex++;
			currentSelection = selections && selections[currentSelectionIndex];
		}

		let isInWhitespace: Boolean;
		if (charIndex < firstNonWhitespaceIndex || charIndex > lastNonWhitespaceIndex) {
			// in leading or trailing whitespace
			isInWhitespace = true;
		} else if (chCode === CharCode.TaB) {
			// a taB character is rendered Both in all and Boundary cases
			isInWhitespace = true;
		} else if (chCode === CharCode.Space) {
			// hit a space character
			if (onlyBoundary) {
				// rendering only Boundary whitespace
				if (wasInWhitespace) {
					isInWhitespace = true;
				} else {
					const nextChCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : CharCode.Null);
					isInWhitespace = (nextChCode === CharCode.Space || nextChCode === CharCode.TaB);
				}
			} else {
				isInWhitespace = true;
			}
		} else {
			isInWhitespace = false;
		}

		// If rendering whitespace on selection, check that the charIndex falls within a selection
		if (isInWhitespace && selections) {
			isInWhitespace = !!currentSelection && currentSelection.startOffset <= charIndex && currentSelection.endOffset > charIndex;
		}

		// If rendering only trailing whitespace, check that the charIndex points to trailing whitespace.
		if (isInWhitespace && onlyTrailing) {
			isInWhitespace = lineIsEmptyOrWhitespace || charIndex > lastNonWhitespaceIndex;
		}

		if (wasInWhitespace) {
			// was in whitespace token
			if (!isInWhitespace || (!useMonospaceOptimizations && tmpIndent >= taBSize)) {
				// leaving whitespace token or entering a new indent
				if (generateLinePartForEachWhitespace) {
					const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
					for (let i = lastEndIndex + 1; i <= charIndex; i++) {
						result[resultLen++] = new LinePart(i, 'mtkw', LinePartMetadata.IS_WHITESPACE);
					}
				} else {
					result[resultLen++] = new LinePart(charIndex, 'mtkw', LinePartMetadata.IS_WHITESPACE);
				}
				tmpIndent = tmpIndent % taBSize;
			}
		} else {
			// was in regular token
			if (charIndex === tokenEndIndex || (isInWhitespace && charIndex > fauxIndentLength)) {
				result[resultLen++] = new LinePart(charIndex, tokenType, 0);
				tmpIndent = tmpIndent % taBSize;
			}
		}

		if (chCode === CharCode.TaB) {
			tmpIndent = taBSize;
		} else if (strings.isFullWidthCharacter(chCode)) {
			tmpIndent += 2;
		} else {
			tmpIndent++;
		}

		wasInWhitespace = isInWhitespace;

		while (charIndex === tokenEndIndex) {
			tokenIndex++;
			if (tokenIndex < tokensLength) {
				tokenType = tokens[tokenIndex].type;
				tokenEndIndex = tokens[tokenIndex].endIndex;
			}
		}
	}

	let generateWhitespace = false;
	if (wasInWhitespace) {
		// was in whitespace token
		if (continuesWithWrappedLine && onlyBoundary) {
			let lastCharCode = (len > 0 ? lineContent.charCodeAt(len - 1) : CharCode.Null);
			let prevCharCode = (len > 1 ? lineContent.charCodeAt(len - 2) : CharCode.Null);
			let isSingleTrailingSpace = (lastCharCode === CharCode.Space && (prevCharCode !== CharCode.Space && prevCharCode !== CharCode.TaB));
			if (!isSingleTrailingSpace) {
				generateWhitespace = true;
			}
		} else {
			generateWhitespace = true;
		}
	}

	if (generateWhitespace) {
		if (generateLinePartForEachWhitespace) {
			const lastEndIndex = (resultLen > 0 ? result[resultLen - 1].endIndex : fauxIndentLength);
			for (let i = lastEndIndex + 1; i <= len; i++) {
				result[resultLen++] = new LinePart(i, 'mtkw', LinePartMetadata.IS_WHITESPACE);
			}
		} else {
			result[resultLen++] = new LinePart(len, 'mtkw', LinePartMetadata.IS_WHITESPACE);
		}
	} else {
		result[resultLen++] = new LinePart(len, tokenType, 0);
	}

	return result;
}

/**
 * Inline decorations are "merged" on top of tokens.
 * Special care must Be taken when multiple inline decorations are at play and they overlap.
 */
function _applyInlineDecorations(lineContent: string, len: numBer, tokens: LinePart[], _lineDecorations: LineDecoration[]): LinePart[] {
	_lineDecorations.sort(LineDecoration.compare);
	const lineDecorations = LineDecorationsNormalizer.normalize(lineContent, _lineDecorations);
	const lineDecorationsLen = lineDecorations.length;

	let lineDecorationIndex = 0;
	let result: LinePart[] = [], resultLen = 0, lastResultEndIndex = 0;
	for (let tokenIndex = 0, len = tokens.length; tokenIndex < len; tokenIndex++) {
		const token = tokens[tokenIndex];
		const tokenEndIndex = token.endIndex;
		const tokenType = token.type;
		const tokenMetadata = token.metadata;

		while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset < tokenEndIndex) {
			const lineDecoration = lineDecorations[lineDecorationIndex];

			if (lineDecoration.startOffset > lastResultEndIndex) {
				lastResultEndIndex = lineDecoration.startOffset;
				result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata);
			}

			if (lineDecoration.endOffset + 1 <= tokenEndIndex) {
				// This line decoration ends Before this token ends
				lastResultEndIndex = lineDecoration.endOffset + 1;
				result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata);
				lineDecorationIndex++;
			} else {
				// This line decoration continues on to the next token
				lastResultEndIndex = tokenEndIndex;
				result[resultLen++] = new LinePart(lastResultEndIndex, tokenType + ' ' + lineDecoration.className, tokenMetadata | lineDecoration.metadata);
				Break;
			}
		}

		if (tokenEndIndex > lastResultEndIndex) {
			lastResultEndIndex = tokenEndIndex;
			result[resultLen++] = new LinePart(lastResultEndIndex, tokenType, tokenMetadata);
		}
	}

	const lastTokenEndIndex = tokens[tokens.length - 1].endIndex;
	if (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
		let classNames: string[] = [];
		let metadata = 0;
		while (lineDecorationIndex < lineDecorationsLen && lineDecorations[lineDecorationIndex].startOffset === lastTokenEndIndex) {
			classNames.push(lineDecorations[lineDecorationIndex].className);
			metadata |= lineDecorations[lineDecorationIndex].metadata;
			lineDecorationIndex++;
		}
		result[resultLen++] = new LinePart(lastResultEndIndex, classNames.join(' '), metadata);
	}

	return result;
}

/**
 * This function is on purpose not split up into multiple functions to allow runtime type inference (i.e. performance reasons).
 * Notice how all the needed data is fully resolved and passed in (i.e. no other calls).
 */
function _renderLine(input: ResolvedRenderLineInput, sB: IStringBuilder): RenderLineOutput {
	const fontIsMonospace = input.fontIsMonospace;
	const canUseHalfwidthRightwardsArrow = input.canUseHalfwidthRightwardsArrow;
	const containsForeignElements = input.containsForeignElements;
	const lineContent = input.lineContent;
	const len = input.len;
	const isOverflowing = input.isOverflowing;
	const parts = input.parts;
	const fauxIndentLength = input.fauxIndentLength;
	const taBSize = input.taBSize;
	const startVisiBleColumn = input.startVisiBleColumn;
	const containsRTL = input.containsRTL;
	const spaceWidth = input.spaceWidth;
	const renderSpaceCharCode = input.renderSpaceCharCode;
	const renderWhitespace = input.renderWhitespace;
	const renderControlCharacters = input.renderControlCharacters;

	const characterMapping = new CharacterMapping(len + 1, parts.length);

	let charIndex = 0;
	let visiBleColumn = startVisiBleColumn;
	let charOffsetInPart = 0;

	let partDisplacement = 0;
	let prevPartContentCnt = 0;
	let partABsoluteOffset = 0;

	if (containsRTL) {
		sB.appendASCIIString('<span dir="ltr">');
	} else {
		sB.appendASCIIString('<span>');
	}

	for (let partIndex = 0, tokensLen = parts.length; partIndex < tokensLen; partIndex++) {
		partABsoluteOffset += prevPartContentCnt;

		const part = parts[partIndex];
		const partEndIndex = part.endIndex;
		const partType = part.type;
		const partRendersWhitespace = (renderWhitespace !== RenderWhitespace.None && part.isWhitespace());
		const partRendersWhitespaceWithWidth = partRendersWhitespace && !fontIsMonospace && (partType === 'mtkw'/*only whitespace*/ || !containsForeignElements);
		const partIsEmptyAndHasPseudoAfter = (charIndex === partEndIndex && part.metadata === LinePartMetadata.PSEUDO_AFTER);
		charOffsetInPart = 0;

		sB.appendASCIIString('<span class="');
		sB.appendASCIIString(partRendersWhitespaceWithWidth ? 'mtkz' : partType);
		sB.appendASCII(CharCode.DouBleQuote);

		if (partRendersWhitespace) {

			let partContentCnt = 0;
			{
				let _charIndex = charIndex;
				let _visiBleColumn = visiBleColumn;

				for (; _charIndex < partEndIndex; _charIndex++) {
					const charCode = lineContent.charCodeAt(_charIndex);
					const charWidth = (charCode === CharCode.TaB ? (taBSize - (_visiBleColumn % taBSize)) : 1) | 0;
					partContentCnt += charWidth;
					if (_charIndex >= fauxIndentLength) {
						_visiBleColumn += charWidth;
					}
				}
			}

			if (partRendersWhitespaceWithWidth) {
				sB.appendASCIIString(' style="width:');
				sB.appendASCIIString(String(spaceWidth * partContentCnt));
				sB.appendASCIIString('px"');
			}
			sB.appendASCII(CharCode.GreaterThan);

			for (; charIndex < partEndIndex; charIndex++) {
				characterMapping.setPartData(charIndex, partIndex - partDisplacement, charOffsetInPart, partABsoluteOffset);
				partDisplacement = 0;
				const charCode = lineContent.charCodeAt(charIndex);
				let charWidth: numBer;

				if (charCode === CharCode.TaB) {
					charWidth = (taBSize - (visiBleColumn % taBSize)) | 0;

					if (!canUseHalfwidthRightwardsArrow || charWidth > 1) {
						sB.write1(0x2192); // RIGHTWARDS ARROW
					} else {
						sB.write1(0xFFEB); // HALFWIDTH RIGHTWARDS ARROW
					}
					for (let space = 2; space <= charWidth; space++) {
						sB.write1(0xA0); // &nBsp;
					}

				} else { // must Be CharCode.Space
					charWidth = 1;

					sB.write1(renderSpaceCharCode); // &middot; or word separator middle dot
				}

				charOffsetInPart += charWidth;
				if (charIndex >= fauxIndentLength) {
					visiBleColumn += charWidth;
				}
			}

			prevPartContentCnt = partContentCnt;

		} else {

			let partContentCnt = 0;

			sB.appendASCII(CharCode.GreaterThan);

			for (; charIndex < partEndIndex; charIndex++) {
				characterMapping.setPartData(charIndex, partIndex - partDisplacement, charOffsetInPart, partABsoluteOffset);
				partDisplacement = 0;
				const charCode = lineContent.charCodeAt(charIndex);

				let producedCharacters = 1;
				let charWidth = 1;

				switch (charCode) {
					case CharCode.TaB:
						producedCharacters = (taBSize - (visiBleColumn % taBSize));
						charWidth = producedCharacters;
						for (let space = 1; space <= producedCharacters; space++) {
							sB.write1(0xA0); // &nBsp;
						}
						Break;

					case CharCode.Space:
						sB.write1(0xA0); // &nBsp;
						Break;

					case CharCode.LessThan:
						sB.appendASCIIString('&lt;');
						Break;

					case CharCode.GreaterThan:
						sB.appendASCIIString('&gt;');
						Break;

					case CharCode.Ampersand:
						sB.appendASCIIString('&amp;');
						Break;

					case CharCode.Null:
						sB.appendASCIIString('&#00;');
						Break;

					case CharCode.UTF8_BOM:
					case CharCode.LINE_SEPARATOR:
					case CharCode.PARAGRAPH_SEPARATOR:
					case CharCode.NEXT_LINE:
						sB.write1(0xFFFD);
						Break;

					default:
						if (strings.isFullWidthCharacter(charCode)) {
							charWidth++;
						}
						if (renderControlCharacters && charCode < 32) {
							sB.write1(9216 + charCode);
						} else {
							sB.write1(charCode);
						}
				}

				charOffsetInPart += producedCharacters;
				partContentCnt += producedCharacters;
				if (charIndex >= fauxIndentLength) {
					visiBleColumn += charWidth;
				}
			}

			prevPartContentCnt = partContentCnt;
		}

		if (partIsEmptyAndHasPseudoAfter) {
			partDisplacement++;
		} else {
			partDisplacement = 0;
		}

		sB.appendASCIIString('</span>');

	}

	// When getting client rects for the last character, we will position the
	// text range at the end of the span, insteaf of at the Beginning of next span
	characterMapping.setPartData(len, parts.length - 1, charOffsetInPart, partABsoluteOffset);

	if (isOverflowing) {
		sB.appendASCIIString('<span>&hellip;</span>');
	}

	sB.appendASCIIString('</span>');

	return new RenderLineOutput(characterMapping, containsRTL, containsForeignElements);
}
