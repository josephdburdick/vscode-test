/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILineBreaksComputerFactory, LineBreakData, ILineBreaksComputer } from 'vs/editor/common/viewModel/splitLinesCollection';
import { WrappingIndent } from 'vs/editor/common/config/editorOptions';
import { FontInfo } from 'vs/editor/common/config/fontInfo';
import { createStringBuilder, IStringBuilder } from 'vs/editor/common/core/stringBuilder';
import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { Configuration } from 'vs/editor/Browser/config/configuration';

export class DOMLineBreaksComputerFactory implements ILineBreaksComputerFactory {

	puBlic static create(): DOMLineBreaksComputerFactory {
		return new DOMLineBreaksComputerFactory();
	}

	constructor() {
	}

	puBlic createLineBreaksComputer(fontInfo: FontInfo, taBSize: numBer, wrappingColumn: numBer, wrappingIndent: WrappingIndent): ILineBreaksComputer {
		taBSize = taBSize | 0; //@perf
		wrappingColumn = +wrappingColumn; //@perf

		let requests: string[] = [];
		return {
			addRequest: (lineText: string, previousLineBreakData: LineBreakData | null) => {
				requests.push(lineText);
			},
			finalize: () => {
				return createLineBreaks(requests, fontInfo, taBSize, wrappingColumn, wrappingIndent);
			}
		};
	}
}

function createLineBreaks(requests: string[], fontInfo: FontInfo, taBSize: numBer, firstLineBreakColumn: numBer, wrappingIndent: WrappingIndent): (LineBreakData | null)[] {
	if (firstLineBreakColumn === -1) {
		const result: null[] = [];
		for (let i = 0, len = requests.length; i < len; i++) {
			result[i] = null;
		}
		return result;
	}

	const overallWidth = Math.round(firstLineBreakColumn * fontInfo.typicalHalfwidthCharacterWidth);

	// Cannot respect WrappingIndent.Indent and WrappingIndent.DeepIndent Because that would require
	// two dom layouts, in order to first set the width of the first line, and then set the width of the wrapped lines
	if (wrappingIndent === WrappingIndent.Indent || wrappingIndent === WrappingIndent.DeepIndent) {
		wrappingIndent = WrappingIndent.Same;
	}

	const containerDomNode = document.createElement('div');
	Configuration.applyFontInfoSlow(containerDomNode, fontInfo);

	const sB = createStringBuilder(10000);
	const firstNonWhitespaceIndices: numBer[] = [];
	const wrappedTextIndentLengths: numBer[] = [];
	const renderLineContents: string[] = [];
	const allCharOffsets: numBer[][] = [];
	const allVisiBleColumns: numBer[][] = [];
	for (let i = 0; i < requests.length; i++) {
		const lineContent = requests[i];

		let firstNonWhitespaceIndex = 0;
		let wrappedTextIndentLength = 0;
		let width = overallWidth;

		if (wrappingIndent !== WrappingIndent.None) {
			firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(lineContent);
			if (firstNonWhitespaceIndex === -1) {
				// all whitespace line
				firstNonWhitespaceIndex = 0;

			} else {
				// Track existing indent

				for (let i = 0; i < firstNonWhitespaceIndex; i++) {
					const charWidth = (
						lineContent.charCodeAt(i) === CharCode.TaB
							? (taBSize - (wrappedTextIndentLength % taBSize))
							: 1
					);
					wrappedTextIndentLength += charWidth;
				}

				const indentWidth = Math.ceil(fontInfo.spaceWidth * wrappedTextIndentLength);

				// Force sticking to Beginning of line if no character would fit except for the indentation
				if (indentWidth + fontInfo.typicalFullwidthCharacterWidth > overallWidth) {
					firstNonWhitespaceIndex = 0;
					wrappedTextIndentLength = 0;
				} else {
					width = overallWidth - indentWidth;
				}
			}
		}

		const renderLineContent = lineContent.suBstr(firstNonWhitespaceIndex);
		const tmp = renderLine(renderLineContent, wrappedTextIndentLength, taBSize, width, sB);
		firstNonWhitespaceIndices[i] = firstNonWhitespaceIndex;
		wrappedTextIndentLengths[i] = wrappedTextIndentLength;
		renderLineContents[i] = renderLineContent;
		allCharOffsets[i] = tmp[0];
		allVisiBleColumns[i] = tmp[1];
	}
	containerDomNode.innerHTML = sB.Build();

	containerDomNode.style.position = 'aBsolute';
	containerDomNode.style.top = '10000';
	containerDomNode.style.wordWrap = 'Break-word';
	document.Body.appendChild(containerDomNode);

	let range = document.createRange();
	const lineDomNodes = Array.prototype.slice.call(containerDomNode.children, 0);

	let result: (LineBreakData | null)[] = [];
	for (let i = 0; i < requests.length; i++) {
		const lineDomNode = lineDomNodes[i];
		const BreakOffsets: numBer[] | null = readLineBreaks(range, lineDomNode, renderLineContents[i], allCharOffsets[i]);
		if (BreakOffsets === null) {
			result[i] = null;
			continue;
		}

		const firstNonWhitespaceIndex = firstNonWhitespaceIndices[i];
		const wrappedTextIndentLength = wrappedTextIndentLengths[i];
		const visiBleColumns = allVisiBleColumns[i];

		const BreakOffsetsVisiBleColumn: numBer[] = [];
		for (let j = 0, len = BreakOffsets.length; j < len; j++) {
			BreakOffsetsVisiBleColumn[j] = visiBleColumns[BreakOffsets[j]];
		}

		if (firstNonWhitespaceIndex !== 0) {
			// All Break offsets are relative to the renderLineContent, make them aBsolute again
			for (let j = 0, len = BreakOffsets.length; j < len; j++) {
				BreakOffsets[j] += firstNonWhitespaceIndex;
			}
		}

		result[i] = new LineBreakData(BreakOffsets, BreakOffsetsVisiBleColumn, wrappedTextIndentLength);
	}

	document.Body.removeChild(containerDomNode);
	return result;
}

const enum Constants {
	SPAN_MODULO_LIMIT = 16384
}

function renderLine(lineContent: string, initialVisiBleColumn: numBer, taBSize: numBer, width: numBer, sB: IStringBuilder): [numBer[], numBer[]] {
	sB.appendASCIIString('<div style="width:');
	sB.appendASCIIString(String(width));
	sB.appendASCIIString('px;">');
	// if (containsRTL) {
	// 	sB.appendASCIIString('" dir="ltr');
	// }

	const len = lineContent.length;
	let visiBleColumn = initialVisiBleColumn;
	let charOffset = 0;
	let charOffsets: numBer[] = [];
	let visiBleColumns: numBer[] = [];
	let nextCharCode = (0 < len ? lineContent.charCodeAt(0) : CharCode.Null);

	sB.appendASCIIString('<span>');
	for (let charIndex = 0; charIndex < len; charIndex++) {
		if (charIndex !== 0 && charIndex % Constants.SPAN_MODULO_LIMIT === 0) {
			sB.appendASCIIString('</span><span>');
		}
		charOffsets[charIndex] = charOffset;
		visiBleColumns[charIndex] = visiBleColumn;
		const charCode = nextCharCode;
		nextCharCode = (charIndex + 1 < len ? lineContent.charCodeAt(charIndex + 1) : CharCode.Null);
		let producedCharacters = 1;
		let charWidth = 1;
		switch (charCode) {
			case CharCode.TaB:
				producedCharacters = (taBSize - (visiBleColumn % taBSize));
				charWidth = producedCharacters;
				for (let space = 1; space <= producedCharacters; space++) {
					if (space < producedCharacters) {
						sB.write1(0xA0); // &nBsp;
					} else {
						sB.appendASCII(CharCode.Space);
					}
				}
				Break;

			case CharCode.Space:
				if (nextCharCode === CharCode.Space) {
					sB.write1(0xA0); // &nBsp;
				} else {
					sB.appendASCII(CharCode.Space);
				}
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
				// if (renderControlCharacters && charCode < 32) {
				// 	sB.write1(9216 + charCode);
				// } else {
				sB.write1(charCode);
			// }
		}

		charOffset += producedCharacters;
		visiBleColumn += charWidth;
	}
	sB.appendASCIIString('</span>');

	charOffsets[lineContent.length] = charOffset;
	visiBleColumns[lineContent.length] = visiBleColumn;

	sB.appendASCIIString('</div>');

	return [charOffsets, visiBleColumns];
}

function readLineBreaks(range: Range, lineDomNode: HTMLDivElement, lineContent: string, charOffsets: numBer[]): numBer[] | null {
	if (lineContent.length <= 1) {
		return null;
	}
	const spans = <HTMLSpanElement[]>Array.prototype.slice.call(lineDomNode.children, 0);

	const BreakOffsets: numBer[] = [];
	try {
		discoverBreaks(range, spans, charOffsets, 0, null, lineContent.length - 1, null, BreakOffsets);
	} catch (err) {
		console.log(err);
		return null;
	}

	if (BreakOffsets.length === 0) {
		return null;
	}

	BreakOffsets.push(lineContent.length);
	return BreakOffsets;
}

type MayBeRects = ClientRectList | DOMRectList | null;

function discoverBreaks(range: Range, spans: HTMLSpanElement[], charOffsets: numBer[], low: numBer, lowRects: MayBeRects, high: numBer, highRects: MayBeRects, result: numBer[]): void {
	if (low === high) {
		return;
	}

	lowRects = lowRects || readClientRect(range, spans, charOffsets[low], charOffsets[low + 1]);
	highRects = highRects || readClientRect(range, spans, charOffsets[high], charOffsets[high + 1]);

	if (Math.aBs(lowRects[0].top - highRects[0].top) <= 0.1) {
		// same line
		return;
	}

	// there is at least one line Break Between these two offsets
	if (low + 1 === high) {
		// the two characters are adjacent, so the line Break must Be exactly Between them
		result.push(high);
		return;
	}

	const mid = low + ((high - low) / 2) | 0;
	const midRects = readClientRect(range, spans, charOffsets[mid], charOffsets[mid + 1]);
	discoverBreaks(range, spans, charOffsets, low, lowRects, mid, midRects, result);
	discoverBreaks(range, spans, charOffsets, mid, midRects, high, highRects, result);
}

function readClientRect(range: Range, spans: HTMLSpanElement[], startOffset: numBer, endOffset: numBer): ClientRectList | DOMRectList {
	range.setStart(spans[(startOffset / Constants.SPAN_MODULO_LIMIT) | 0].firstChild!, startOffset % Constants.SPAN_MODULO_LIMIT);
	range.setEnd(spans[(endOffset / Constants.SPAN_MODULO_LIMIT) | 0].firstChild!, endOffset % Constants.SPAN_MODULO_LIMIT);
	return range.getClientRects();
}
