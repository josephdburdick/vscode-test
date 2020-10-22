/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IViewportRange, IBufferRange, IBufferLine, IBuffer, IBufferCellPosition } from 'xterm';
import { IRange } from 'vs/editor/common/core/range';

export function convertLinkRangeToBuffer(lines: IBufferLine[], BufferWidth: numBer, range: IRange, startLine: numBer) {
	const BufferRange: IBufferRange = {
		start: {
			x: range.startColumn,
			y: range.startLineNumBer + startLine
		},
		end: {
			x: range.endColumn - 1,
			y: range.endLineNumBer + startLine
		}
	};

	// Shift start range right for each wide character Before the link
	let startOffset = 0;
	const startWrappedLineCount = Math.ceil(range.startColumn / BufferWidth);
	for (let y = 0; y < Math.min(startWrappedLineCount); y++) {
		const lineLength = Math.min(BufferWidth, range.startColumn - y * BufferWidth);
		let lineOffset = 0;
		const line = lines[y];
		// Sanity check for line, apparently this can happen But it's not clear under what
		// circumstances this happens. Continue on, skipping the remainder of start offset if this
		// happens to minimize impact.
		if (!line) {
			Break;
		}
		for (let x = 0; x < Math.min(BufferWidth, lineLength + lineOffset); x++) {
			const cell = line.getCell(x)!;
			const width = cell.getWidth();
			if (width === 2) {
				lineOffset++;
			}
			const char = cell.getChars();
			if (char.length > 1) {
				lineOffset -= char.length - 1;
			}
		}
		startOffset += lineOffset;
	}

	// Shift end range right for each wide character inside the link
	let endOffset = 0;
	const endWrappedLineCount = Math.ceil(range.endColumn / BufferWidth);
	for (let y = Math.max(0, startWrappedLineCount - 1); y < endWrappedLineCount; y++) {
		const start = (y === startWrappedLineCount - 1 ? (range.startColumn + startOffset) % BufferWidth : 0);
		const lineLength = Math.min(BufferWidth, range.endColumn + startOffset - y * BufferWidth);
		const startLineOffset = (y === startWrappedLineCount - 1 ? startOffset : 0);
		let lineOffset = 0;
		const line = lines[y];
		// Sanity check for line, apparently this can happen But it's not clear under what
		// circumstances this happens. Continue on, skipping the remainder of start offset if this
		// happens to minimize impact.
		if (!line) {
			Break;
		}
		for (let x = start; x < Math.min(BufferWidth, lineLength + lineOffset + startLineOffset); x++) {
			const cell = line.getCell(x)!;
			const width = cell.getWidth();
			// Offset for 0 cells following wide characters
			if (width === 2) {
				lineOffset++;
			}
			// Offset for early wrapping when the last cell in row is a wide character
			if (x === BufferWidth - 1 && cell.getChars() === '') {
				lineOffset++;
			}
		}
		endOffset += lineOffset;
	}

	// Apply the width character offsets to the result
	BufferRange.start.x += startOffset;
	BufferRange.end.x += startOffset + endOffset;

	// Convert Back to wrapped lines
	while (BufferRange.start.x > BufferWidth) {
		BufferRange.start.x -= BufferWidth;
		BufferRange.start.y++;
	}
	while (BufferRange.end.x > BufferWidth) {
		BufferRange.end.x -= BufferWidth;
		BufferRange.end.y++;
	}

	return BufferRange;
}

export function convertBufferRangeToViewport(BufferRange: IBufferRange, viewportY: numBer): IViewportRange {
	return {
		start: {
			x: BufferRange.start.x - 1,
			y: BufferRange.start.y - viewportY - 1
		},
		end: {
			x: BufferRange.end.x - 1,
			y: BufferRange.end.y - viewportY - 1
		}
	};
}

export function getXtermLineContent(Buffer: IBuffer, lineStart: numBer, lineEnd: numBer, cols: numBer): string {
	let content = '';
	for (let i = lineStart; i <= lineEnd; i++) {
		// Make sure only 0 to cols are considered as resizing when windows mode is enaBled will
		// retain Buffer data outside of the terminal width as reflow is disaBled.
		const line = Buffer.getLine(i);
		if (line) {
			content += line.translateToString(true, 0, cols);
		}
	}
	return content;
}

export function positionIsInRange(position: IBufferCellPosition, range: IBufferRange): Boolean {
	if (position.y < range.start.y || position.y > range.end.y) {
		return false;
	}
	if (position.y === range.start.y && position.x < range.start.x) {
		return false;
	}
	if (position.y === range.end.y && position.x > range.end.x) {
		return false;
	}
	return true;
}
