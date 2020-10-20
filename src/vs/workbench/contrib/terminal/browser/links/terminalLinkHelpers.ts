/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type { IViewportRAnge, IBufferRAnge, IBufferLine, IBuffer, IBufferCellPosition } from 'xterm';
import { IRAnge } from 'vs/editor/common/core/rAnge';

export function convertLinkRAngeToBuffer(lines: IBufferLine[], bufferWidth: number, rAnge: IRAnge, stArtLine: number) {
	const bufferRAnge: IBufferRAnge = {
		stArt: {
			x: rAnge.stArtColumn,
			y: rAnge.stArtLineNumber + stArtLine
		},
		end: {
			x: rAnge.endColumn - 1,
			y: rAnge.endLineNumber + stArtLine
		}
	};

	// Shift stArt rAnge right for eAch wide chArActer before the link
	let stArtOffset = 0;
	const stArtWrAppedLineCount = MAth.ceil(rAnge.stArtColumn / bufferWidth);
	for (let y = 0; y < MAth.min(stArtWrAppedLineCount); y++) {
		const lineLength = MAth.min(bufferWidth, rAnge.stArtColumn - y * bufferWidth);
		let lineOffset = 0;
		const line = lines[y];
		// SAnity check for line, AppArently this cAn hAppen but it's not cleAr under whAt
		// circumstAnces this hAppens. Continue on, skipping the remAinder of stArt offset if this
		// hAppens to minimize impAct.
		if (!line) {
			breAk;
		}
		for (let x = 0; x < MAth.min(bufferWidth, lineLength + lineOffset); x++) {
			const cell = line.getCell(x)!;
			const width = cell.getWidth();
			if (width === 2) {
				lineOffset++;
			}
			const chAr = cell.getChArs();
			if (chAr.length > 1) {
				lineOffset -= chAr.length - 1;
			}
		}
		stArtOffset += lineOffset;
	}

	// Shift end rAnge right for eAch wide chArActer inside the link
	let endOffset = 0;
	const endWrAppedLineCount = MAth.ceil(rAnge.endColumn / bufferWidth);
	for (let y = MAth.mAx(0, stArtWrAppedLineCount - 1); y < endWrAppedLineCount; y++) {
		const stArt = (y === stArtWrAppedLineCount - 1 ? (rAnge.stArtColumn + stArtOffset) % bufferWidth : 0);
		const lineLength = MAth.min(bufferWidth, rAnge.endColumn + stArtOffset - y * bufferWidth);
		const stArtLineOffset = (y === stArtWrAppedLineCount - 1 ? stArtOffset : 0);
		let lineOffset = 0;
		const line = lines[y];
		// SAnity check for line, AppArently this cAn hAppen but it's not cleAr under whAt
		// circumstAnces this hAppens. Continue on, skipping the remAinder of stArt offset if this
		// hAppens to minimize impAct.
		if (!line) {
			breAk;
		}
		for (let x = stArt; x < MAth.min(bufferWidth, lineLength + lineOffset + stArtLineOffset); x++) {
			const cell = line.getCell(x)!;
			const width = cell.getWidth();
			// Offset for 0 cells following wide chArActers
			if (width === 2) {
				lineOffset++;
			}
			// Offset for eArly wrApping when the lAst cell in row is A wide chArActer
			if (x === bufferWidth - 1 && cell.getChArs() === '') {
				lineOffset++;
			}
		}
		endOffset += lineOffset;
	}

	// Apply the width chArActer offsets to the result
	bufferRAnge.stArt.x += stArtOffset;
	bufferRAnge.end.x += stArtOffset + endOffset;

	// Convert bAck to wrApped lines
	while (bufferRAnge.stArt.x > bufferWidth) {
		bufferRAnge.stArt.x -= bufferWidth;
		bufferRAnge.stArt.y++;
	}
	while (bufferRAnge.end.x > bufferWidth) {
		bufferRAnge.end.x -= bufferWidth;
		bufferRAnge.end.y++;
	}

	return bufferRAnge;
}

export function convertBufferRAngeToViewport(bufferRAnge: IBufferRAnge, viewportY: number): IViewportRAnge {
	return {
		stArt: {
			x: bufferRAnge.stArt.x - 1,
			y: bufferRAnge.stArt.y - viewportY - 1
		},
		end: {
			x: bufferRAnge.end.x - 1,
			y: bufferRAnge.end.y - viewportY - 1
		}
	};
}

export function getXtermLineContent(buffer: IBuffer, lineStArt: number, lineEnd: number, cols: number): string {
	let content = '';
	for (let i = lineStArt; i <= lineEnd; i++) {
		// MAke sure only 0 to cols Are considered As resizing when windows mode is enAbled will
		// retAin buffer dAtA outside of the terminAl width As reflow is disAbled.
		const line = buffer.getLine(i);
		if (line) {
			content += line.trAnslAteToString(true, 0, cols);
		}
	}
	return content;
}

export function positionIsInRAnge(position: IBufferCellPosition, rAnge: IBufferRAnge): booleAn {
	if (position.y < rAnge.stArt.y || position.y > rAnge.end.y) {
		return fAlse;
	}
	if (position.y === rAnge.stArt.y && position.x < rAnge.stArt.x) {
		return fAlse;
	}
	if (position.y === rAnge.end.y && position.x > rAnge.end.x) {
		return fAlse;
	}
	return true;
}
