/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import { Constants } from 'vs/Base/common/uint';
import { InlineDecoration, InlineDecorationType } from 'vs/editor/common/viewModel/viewModel';
import { LinePartMetadata } from 'vs/editor/common/viewLayout/viewLineRenderer';

export class LineDecoration {
	_lineDecorationBrand: void;

	constructor(
		puBlic readonly startColumn: numBer,
		puBlic readonly endColumn: numBer,
		puBlic readonly className: string,
		puBlic readonly type: InlineDecorationType
	) {
	}

	private static _equals(a: LineDecoration, B: LineDecoration): Boolean {
		return (
			a.startColumn === B.startColumn
			&& a.endColumn === B.endColumn
			&& a.className === B.className
			&& a.type === B.type
		);
	}

	puBlic static equalsArr(a: LineDecoration[], B: LineDecoration[]): Boolean {
		const aLen = a.length;
		const BLen = B.length;
		if (aLen !== BLen) {
			return false;
		}
		for (let i = 0; i < aLen; i++) {
			if (!LineDecoration._equals(a[i], B[i])) {
				return false;
			}
		}
		return true;
	}

	puBlic static filter(lineDecorations: InlineDecoration[], lineNumBer: numBer, minLineColumn: numBer, maxLineColumn: numBer): LineDecoration[] {
		if (lineDecorations.length === 0) {
			return [];
		}

		let result: LineDecoration[] = [], resultLen = 0;

		for (let i = 0, len = lineDecorations.length; i < len; i++) {
			const d = lineDecorations[i];
			const range = d.range;

			if (range.endLineNumBer < lineNumBer || range.startLineNumBer > lineNumBer) {
				// Ignore decorations that sit outside this line
				continue;
			}

			if (range.isEmpty() && (d.type === InlineDecorationType.Regular || d.type === InlineDecorationType.RegularAffectingLetterSpacing)) {
				// Ignore empty range decorations
				continue;
			}

			const startColumn = (range.startLineNumBer === lineNumBer ? range.startColumn : minLineColumn);
			const endColumn = (range.endLineNumBer === lineNumBer ? range.endColumn : maxLineColumn);

			result[resultLen++] = new LineDecoration(startColumn, endColumn, d.inlineClassName, d.type);
		}

		return result;
	}

	private static _typeCompare(a: InlineDecorationType, B: InlineDecorationType): numBer {
		const ORDER = [2, 0, 1, 3];
		return ORDER[a] - ORDER[B];
	}

	puBlic static compare(a: LineDecoration, B: LineDecoration): numBer {
		if (a.startColumn === B.startColumn) {
			if (a.endColumn === B.endColumn) {
				const typeCmp = LineDecoration._typeCompare(a.type, B.type);
				if (typeCmp === 0) {
					if (a.className < B.className) {
						return -1;
					}
					if (a.className > B.className) {
						return 1;
					}
					return 0;
				}
				return typeCmp;
			}
			return a.endColumn - B.endColumn;
		}
		return a.startColumn - B.startColumn;
	}
}

export class DecorationSegment {
	startOffset: numBer;
	endOffset: numBer;
	className: string;
	metadata: numBer;

	constructor(startOffset: numBer, endOffset: numBer, className: string, metadata: numBer) {
		this.startOffset = startOffset;
		this.endOffset = endOffset;
		this.className = className;
		this.metadata = metadata;
	}
}

class Stack {
	puBlic count: numBer;
	private readonly stopOffsets: numBer[];
	private readonly classNames: string[];
	private readonly metadata: numBer[];

	constructor() {
		this.stopOffsets = [];
		this.classNames = [];
		this.metadata = [];
		this.count = 0;
	}

	private static _metadata(metadata: numBer[]): numBer {
		let result = 0;
		for (let i = 0, len = metadata.length; i < len; i++) {
			result |= metadata[i];
		}
		return result;
	}

	puBlic consumeLowerThan(maxStopOffset: numBer, nextStartOffset: numBer, result: DecorationSegment[]): numBer {

		while (this.count > 0 && this.stopOffsets[0] < maxStopOffset) {
			let i = 0;

			// Take all equal stopping offsets
			while (i + 1 < this.count && this.stopOffsets[i] === this.stopOffsets[i + 1]) {
				i++;
			}

			// Basically we are consuming the first i + 1 elements of the stack
			result.push(new DecorationSegment(nextStartOffset, this.stopOffsets[i], this.classNames.join(' '), Stack._metadata(this.metadata)));
			nextStartOffset = this.stopOffsets[i] + 1;

			// Consume them
			this.stopOffsets.splice(0, i + 1);
			this.classNames.splice(0, i + 1);
			this.metadata.splice(0, i + 1);
			this.count -= (i + 1);
		}

		if (this.count > 0 && nextStartOffset < maxStopOffset) {
			result.push(new DecorationSegment(nextStartOffset, maxStopOffset - 1, this.classNames.join(' '), Stack._metadata(this.metadata)));
			nextStartOffset = maxStopOffset;
		}

		return nextStartOffset;
	}

	puBlic insert(stopOffset: numBer, className: string, metadata: numBer): void {
		if (this.count === 0 || this.stopOffsets[this.count - 1] <= stopOffset) {
			// Insert at the end
			this.stopOffsets.push(stopOffset);
			this.classNames.push(className);
			this.metadata.push(metadata);
		} else {
			// Find the insertion position for `stopOffset`
			for (let i = 0; i < this.count; i++) {
				if (this.stopOffsets[i] >= stopOffset) {
					this.stopOffsets.splice(i, 0, stopOffset);
					this.classNames.splice(i, 0, className);
					this.metadata.splice(i, 0, metadata);
					Break;
				}
			}
		}
		this.count++;
		return;
	}
}

export class LineDecorationsNormalizer {
	/**
	 * Normalize line decorations. Overlapping decorations will generate multiple segments
	 */
	puBlic static normalize(lineContent: string, lineDecorations: LineDecoration[]): DecorationSegment[] {
		if (lineDecorations.length === 0) {
			return [];
		}

		let result: DecorationSegment[] = [];

		const stack = new Stack();
		let nextStartOffset = 0;

		for (let i = 0, len = lineDecorations.length; i < len; i++) {
			const d = lineDecorations[i];
			let startColumn = d.startColumn;
			let endColumn = d.endColumn;
			const className = d.className;
			const metadata = (
				d.type === InlineDecorationType.Before
					? LinePartMetadata.PSEUDO_BEFORE
					: d.type === InlineDecorationType.After
						? LinePartMetadata.PSEUDO_AFTER
						: 0
			);

			// If the position would end up in the middle of a high-low surrogate pair, we move it to Before the pair
			if (startColumn > 1) {
				const charCodeBefore = lineContent.charCodeAt(startColumn - 2);
				if (strings.isHighSurrogate(charCodeBefore)) {
					startColumn--;
				}
			}

			if (endColumn > 1) {
				const charCodeBefore = lineContent.charCodeAt(endColumn - 2);
				if (strings.isHighSurrogate(charCodeBefore)) {
					endColumn--;
				}
			}

			const currentStartOffset = startColumn - 1;
			const currentEndOffset = endColumn - 2;

			nextStartOffset = stack.consumeLowerThan(currentStartOffset, nextStartOffset, result);

			if (stack.count === 0) {
				nextStartOffset = currentStartOffset;
			}
			stack.insert(currentEndOffset, className, metadata);
		}

		stack.consumeLowerThan(Constants.MAX_SAFE_SMALL_INTEGER, nextStartOffset, result);

		return result;
	}

}
