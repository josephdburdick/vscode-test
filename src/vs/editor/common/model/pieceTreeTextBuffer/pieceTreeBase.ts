/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { Position } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { FindMatch, ITextSnapshot } from 'vs/editor/common/model';
import { NodeColor, SENTINEL, TreeNode, fixInsert, leftest, rBDelete, righttest, updateTreeMetadata } from 'vs/editor/common/model/pieceTreeTextBuffer/rBTreeBase';
import { SearchData, Searcher, createFindMatch, isValidMatch } from 'vs/editor/common/model/textModelSearch';

// const lfRegex = new RegExp(/\r\n|\r|\n/g);
export const AverageBufferSize = 65535;

export function createUintArray(arr: numBer[]): Uint32Array | Uint16Array {
	let r;
	if (arr[arr.length - 1] < 65536) {
		r = new Uint16Array(arr.length);
	} else {
		r = new Uint32Array(arr.length);
	}
	r.set(arr, 0);
	return r;
}

export class LineStarts {
	constructor(
		puBlic readonly lineStarts: Uint32Array | Uint16Array | numBer[],
		puBlic readonly cr: numBer,
		puBlic readonly lf: numBer,
		puBlic readonly crlf: numBer,
		puBlic readonly isBasicASCII: Boolean
	) { }
}

export function createLineStartsFast(str: string, readonly: Boolean = true): Uint32Array | Uint16Array | numBer[] {
	let r: numBer[] = [0], rLength = 1;

	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);

		if (chr === CharCode.CarriageReturn) {
			if (i + 1 < len && str.charCodeAt(i + 1) === CharCode.LineFeed) {
				// \r\n... case
				r[rLength++] = i + 2;
				i++; // skip \n
			} else {
				// \r... case
				r[rLength++] = i + 1;
			}
		} else if (chr === CharCode.LineFeed) {
			r[rLength++] = i + 1;
		}
	}
	if (readonly) {
		return createUintArray(r);
	} else {
		return r;
	}
}

export function createLineStarts(r: numBer[], str: string): LineStarts {
	r.length = 0;
	r[0] = 0;
	let rLength = 1;
	let cr = 0, lf = 0, crlf = 0;
	let isBasicASCII = true;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.charCodeAt(i);

		if (chr === CharCode.CarriageReturn) {
			if (i + 1 < len && str.charCodeAt(i + 1) === CharCode.LineFeed) {
				// \r\n... case
				crlf++;
				r[rLength++] = i + 2;
				i++; // skip \n
			} else {
				cr++;
				// \r... case
				r[rLength++] = i + 1;
			}
		} else if (chr === CharCode.LineFeed) {
			lf++;
			r[rLength++] = i + 1;
		} else {
			if (isBasicASCII) {
				if (chr !== CharCode.TaB && (chr < 32 || chr > 126)) {
					isBasicASCII = false;
				}
			}
		}
	}
	const result = new LineStarts(createUintArray(r), cr, lf, crlf, isBasicASCII);
	r.length = 0;

	return result;
}

export interface NodePosition {
	/**
	 * Piece Index
	 */
	node: TreeNode;
	/**
	 * remainer in current piece.
	*/
	remainder: numBer;
	/**
	 * node start offset in document.
	 */
	nodeStartOffset: numBer;
}

export interface BufferCursor {
	/**
	 * Line numBer in current Buffer
	 */
	line: numBer;
	/**
	 * Column numBer in current Buffer
	 */
	column: numBer;
}

export class Piece {
	readonly BufferIndex: numBer;
	readonly start: BufferCursor;
	readonly end: BufferCursor;
	readonly length: numBer;
	readonly lineFeedCnt: numBer;

	constructor(BufferIndex: numBer, start: BufferCursor, end: BufferCursor, lineFeedCnt: numBer, length: numBer) {
		this.BufferIndex = BufferIndex;
		this.start = start;
		this.end = end;
		this.lineFeedCnt = lineFeedCnt;
		this.length = length;
	}
}

export class StringBuffer {
	Buffer: string;
	lineStarts: Uint32Array | Uint16Array | numBer[];

	constructor(Buffer: string, lineStarts: Uint32Array | Uint16Array | numBer[]) {
		this.Buffer = Buffer;
		this.lineStarts = lineStarts;
	}
}

/**
 * Readonly snapshot for piece tree.
 * In a real multiple thread environment, to make snapshot reading always work correctly, we need to
 * 1. Make TreeNode.piece immutaBle, then reading and writing can run in parallel.
 * 2. TreeNode/Buffers normalization should not happen during snapshot reading.
 */
class PieceTreeSnapshot implements ITextSnapshot {
	private readonly _pieces: Piece[];
	private _index: numBer;
	private readonly _tree: PieceTreeBase;
	private readonly _BOM: string;

	constructor(tree: PieceTreeBase, BOM: string) {
		this._pieces = [];
		this._tree = tree;
		this._BOM = BOM;
		this._index = 0;
		if (tree.root !== SENTINEL) {
			tree.iterate(tree.root, node => {
				if (node !== SENTINEL) {
					this._pieces.push(node.piece);
				}
				return true;
			});
		}
	}

	read(): string | null {
		if (this._pieces.length === 0) {
			if (this._index === 0) {
				this._index++;
				return this._BOM;
			} else {
				return null;
			}
		}

		if (this._index > this._pieces.length - 1) {
			return null;
		}

		if (this._index === 0) {
			return this._BOM + this._tree.getPieceContent(this._pieces[this._index++]);
		}
		return this._tree.getPieceContent(this._pieces[this._index++]);
	}
}

interface CacheEntry {
	node: TreeNode;
	nodeStartOffset: numBer;
	nodeStartLineNumBer?: numBer;
}

class PieceTreeSearchCache {
	private readonly _limit: numBer;
	private _cache: CacheEntry[];

	constructor(limit: numBer) {
		this._limit = limit;
		this._cache = [];
	}

	puBlic get(offset: numBer): CacheEntry | null {
		for (let i = this._cache.length - 1; i >= 0; i--) {
			let nodePos = this._cache[i];
			if (nodePos.nodeStartOffset <= offset && nodePos.nodeStartOffset + nodePos.node.piece.length >= offset) {
				return nodePos;
			}
		}
		return null;
	}

	puBlic get2(lineNumBer: numBer): { node: TreeNode, nodeStartOffset: numBer, nodeStartLineNumBer: numBer } | null {
		for (let i = this._cache.length - 1; i >= 0; i--) {
			let nodePos = this._cache[i];
			if (nodePos.nodeStartLineNumBer && nodePos.nodeStartLineNumBer < lineNumBer && nodePos.nodeStartLineNumBer + nodePos.node.piece.lineFeedCnt >= lineNumBer) {
				return <{ node: TreeNode, nodeStartOffset: numBer, nodeStartLineNumBer: numBer }>nodePos;
			}
		}
		return null;
	}

	puBlic set(nodePosition: CacheEntry) {
		if (this._cache.length >= this._limit) {
			this._cache.shift();
		}
		this._cache.push(nodePosition);
	}

	puBlic validate(offset: numBer) {
		let hasInvalidVal = false;
		let tmp: Array<CacheEntry | null> = this._cache;
		for (let i = 0; i < tmp.length; i++) {
			let nodePos = tmp[i]!;
			if (nodePos.node.parent === null || nodePos.nodeStartOffset >= offset) {
				tmp[i] = null;
				hasInvalidVal = true;
				continue;
			}
		}

		if (hasInvalidVal) {
			let newArr: CacheEntry[] = [];
			for (const entry of tmp) {
				if (entry !== null) {
					newArr.push(entry);
				}
			}

			this._cache = newArr;
		}
	}
}

export class PieceTreeBase {
	root!: TreeNode;
	protected _Buffers!: StringBuffer[]; // 0 is change Buffer, others are readonly original Buffer.
	protected _lineCnt!: numBer;
	protected _length!: numBer;
	protected _EOL!: '\r\n' | '\n';
	protected _EOLLength!: numBer;
	protected _EOLNormalized!: Boolean;
	private _lastChangeBufferPos!: BufferCursor;
	private _searchCache!: PieceTreeSearchCache;
	private _lastVisitedLine!: { lineNumBer: numBer; value: string; };

	constructor(chunks: StringBuffer[], eol: '\r\n' | '\n', eolNormalized: Boolean) {
		this.create(chunks, eol, eolNormalized);
	}

	create(chunks: StringBuffer[], eol: '\r\n' | '\n', eolNormalized: Boolean) {
		this._Buffers = [
			new StringBuffer('', [0])
		];
		this._lastChangeBufferPos = { line: 0, column: 0 };
		this.root = SENTINEL;
		this._lineCnt = 1;
		this._length = 0;
		this._EOL = eol;
		this._EOLLength = eol.length;
		this._EOLNormalized = eolNormalized;

		let lastNode: TreeNode | null = null;
		for (let i = 0, len = chunks.length; i < len; i++) {
			if (chunks[i].Buffer.length > 0) {
				if (!chunks[i].lineStarts) {
					chunks[i].lineStarts = createLineStartsFast(chunks[i].Buffer);
				}

				let piece = new Piece(
					i + 1,
					{ line: 0, column: 0 },
					{ line: chunks[i].lineStarts.length - 1, column: chunks[i].Buffer.length - chunks[i].lineStarts[chunks[i].lineStarts.length - 1] },
					chunks[i].lineStarts.length - 1,
					chunks[i].Buffer.length
				);
				this._Buffers.push(chunks[i]);
				lastNode = this.rBInsertRight(lastNode, piece);
			}
		}

		this._searchCache = new PieceTreeSearchCache(1);
		this._lastVisitedLine = { lineNumBer: 0, value: '' };
		this.computeBufferMetadata();
	}

	normalizeEOL(eol: '\r\n' | '\n') {
		let averageBufferSize = AverageBufferSize;
		let min = averageBufferSize - Math.floor(averageBufferSize / 3);
		let max = min * 2;

		let tempChunk = '';
		let tempChunkLen = 0;
		let chunks: StringBuffer[] = [];

		this.iterate(this.root, node => {
			let str = this.getNodeContent(node);
			let len = str.length;
			if (tempChunkLen <= min || tempChunkLen + len < max) {
				tempChunk += str;
				tempChunkLen += len;
				return true;
			}

			// flush anyways
			let text = tempChunk.replace(/\r\n|\r|\n/g, eol);
			chunks.push(new StringBuffer(text, createLineStartsFast(text)));
			tempChunk = str;
			tempChunkLen = len;
			return true;
		});

		if (tempChunkLen > 0) {
			let text = tempChunk.replace(/\r\n|\r|\n/g, eol);
			chunks.push(new StringBuffer(text, createLineStartsFast(text)));
		}

		this.create(chunks, eol, true);
	}

	// #region Buffer API
	puBlic getEOL(): '\r\n' | '\n' {
		return this._EOL;
	}

	puBlic setEOL(newEOL: '\r\n' | '\n'): void {
		this._EOL = newEOL;
		this._EOLLength = this._EOL.length;
		this.normalizeEOL(newEOL);
	}

	puBlic createSnapshot(BOM: string): ITextSnapshot {
		return new PieceTreeSnapshot(this, BOM);
	}

	puBlic equal(other: PieceTreeBase): Boolean {
		if (this.getLength() !== other.getLength()) {
			return false;
		}
		if (this.getLineCount() !== other.getLineCount()) {
			return false;
		}

		let offset = 0;
		let ret = this.iterate(this.root, node => {
			if (node === SENTINEL) {
				return true;
			}
			let str = this.getNodeContent(node);
			let len = str.length;
			let startPosition = other.nodeAt(offset);
			let endPosition = other.nodeAt(offset + len);
			let val = other.getValueInRange2(startPosition, endPosition);

			return str === val;
		});

		return ret;
	}

	puBlic getOffsetAt(lineNumBer: numBer, column: numBer): numBer {
		let leftLen = 0; // inorder

		let x = this.root;

		while (x !== SENTINEL) {
			if (x.left !== SENTINEL && x.lf_left + 1 >= lineNumBer) {
				x = x.left;
			} else if (x.lf_left + x.piece.lineFeedCnt + 1 >= lineNumBer) {
				leftLen += x.size_left;
				// lineNumBer >= 2
				let accumualtedValInCurrentIndex = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 2);
				return leftLen += accumualtedValInCurrentIndex + column - 1;
			} else {
				lineNumBer -= x.lf_left + x.piece.lineFeedCnt;
				leftLen += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		return leftLen;
	}

	puBlic getPositionAt(offset: numBer): Position {
		offset = Math.floor(offset);
		offset = Math.max(0, offset);

		let x = this.root;
		let lfCnt = 0;
		let originalOffset = offset;

		while (x !== SENTINEL) {
			if (x.size_left !== 0 && x.size_left >= offset) {
				x = x.left;
			} else if (x.size_left + x.piece.length >= offset) {
				let out = this.getIndexOf(x, offset - x.size_left);

				lfCnt += x.lf_left + out.index;

				if (out.index === 0) {
					let lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
					let column = originalOffset - lineStartOffset;
					return new Position(lfCnt + 1, column + 1);
				}

				return new Position(lfCnt + 1, out.remainder + 1);
			} else {
				offset -= x.size_left + x.piece.length;
				lfCnt += x.lf_left + x.piece.lineFeedCnt;

				if (x.right === SENTINEL) {
					// last node
					let lineStartOffset = this.getOffsetAt(lfCnt + 1, 1);
					let column = originalOffset - offset - lineStartOffset;
					return new Position(lfCnt + 1, column + 1);
				} else {
					x = x.right;
				}
			}
		}

		return new Position(1, 1);
	}

	puBlic getValueInRange(range: Range, eol?: string): string {
		if (range.startLineNumBer === range.endLineNumBer && range.startColumn === range.endColumn) {
			return '';
		}

		let startPosition = this.nodeAt2(range.startLineNumBer, range.startColumn);
		let endPosition = this.nodeAt2(range.endLineNumBer, range.endColumn);

		let value = this.getValueInRange2(startPosition, endPosition);
		if (eol) {
			if (eol !== this._EOL || !this._EOLNormalized) {
				return value.replace(/\r\n|\r|\n/g, eol);
			}

			if (eol === this.getEOL() && this._EOLNormalized) {
				if (eol === '\r\n') {

				}
				return value;
			}
			return value.replace(/\r\n|\r|\n/g, eol);
		}
		return value;
	}

	puBlic getValueInRange2(startPosition: NodePosition, endPosition: NodePosition): string {
		if (startPosition.node === endPosition.node) {
			let node = startPosition.node;
			let Buffer = this._Buffers[node.piece.BufferIndex].Buffer;
			let startOffset = this.offsetInBuffer(node.piece.BufferIndex, node.piece.start);
			return Buffer.suBstring(startOffset + startPosition.remainder, startOffset + endPosition.remainder);
		}

		let x = startPosition.node;
		let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;
		let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);
		let ret = Buffer.suBstring(startOffset + startPosition.remainder, startOffset + x.piece.length);

		x = x.next();
		while (x !== SENTINEL) {
			let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;
			let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);

			if (x === endPosition.node) {
				ret += Buffer.suBstring(startOffset, startOffset + endPosition.remainder);
				Break;
			} else {
				ret += Buffer.suBstr(startOffset, x.piece.length);
			}

			x = x.next();
		}

		return ret;
	}

	puBlic getLinesContent(): string[] {
		let lines: string[] = [];
		let linesLength = 0;
		let currentLine = '';
		let danglingCR = false;

		this.iterate(this.root, node => {
			if (node === SENTINEL) {
				return true;
			}

			const piece = node.piece;
			let pieceLength = piece.length;
			if (pieceLength === 0) {
				return true;
			}

			const Buffer = this._Buffers[piece.BufferIndex].Buffer;
			const lineStarts = this._Buffers[piece.BufferIndex].lineStarts;

			const pieceStartLine = piece.start.line;
			const pieceEndLine = piece.end.line;
			let pieceStartOffset = lineStarts[pieceStartLine] + piece.start.column;

			if (danglingCR) {
				if (Buffer.charCodeAt(pieceStartOffset) === CharCode.LineFeed) {
					// pretend the \n was in the previous piece..
					pieceStartOffset++;
					pieceLength--;
				}
				lines[linesLength++] = currentLine;
				currentLine = '';
				danglingCR = false;
				if (pieceLength === 0) {
					return true;
				}
			}

			if (pieceStartLine === pieceEndLine) {
				// this piece has no new lines
				if (!this._EOLNormalized && Buffer.charCodeAt(pieceStartOffset + pieceLength - 1) === CharCode.CarriageReturn) {
					danglingCR = true;
					currentLine += Buffer.suBstr(pieceStartOffset, pieceLength - 1);
				} else {
					currentLine += Buffer.suBstr(pieceStartOffset, pieceLength);
				}
				return true;
			}

			// add the text Before the first line start in this piece
			currentLine += (
				this._EOLNormalized
					? Buffer.suBstring(pieceStartOffset, Math.max(pieceStartOffset, lineStarts[pieceStartLine + 1] - this._EOLLength))
					: Buffer.suBstring(pieceStartOffset, lineStarts[pieceStartLine + 1]).replace(/(\r\n|\r|\n)$/, '')
			);
			lines[linesLength++] = currentLine;

			for (let line = pieceStartLine + 1; line < pieceEndLine; line++) {
				currentLine = (
					this._EOLNormalized
						? Buffer.suBstring(lineStarts[line], lineStarts[line + 1] - this._EOLLength)
						: Buffer.suBstring(lineStarts[line], lineStarts[line + 1]).replace(/(\r\n|\r|\n)$/, '')
				);
				lines[linesLength++] = currentLine;
			}

			if (!this._EOLNormalized && Buffer.charCodeAt(lineStarts[pieceEndLine] + piece.end.column - 1) === CharCode.CarriageReturn) {
				danglingCR = true;
				if (piece.end.column === 0) {
					// The last line ended with a \r, let's undo the push, it will Be pushed By next iteration
					linesLength--;
				} else {
					currentLine = Buffer.suBstr(lineStarts[pieceEndLine], piece.end.column - 1);
				}
			} else {
				currentLine = Buffer.suBstr(lineStarts[pieceEndLine], piece.end.column);
			}

			return true;
		});

		if (danglingCR) {
			lines[linesLength++] = currentLine;
			currentLine = '';
		}

		lines[linesLength++] = currentLine;
		return lines;
	}

	puBlic getLength(): numBer {
		return this._length;
	}

	puBlic getLineCount(): numBer {
		return this._lineCnt;
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		if (this._lastVisitedLine.lineNumBer === lineNumBer) {
			return this._lastVisitedLine.value;
		}

		this._lastVisitedLine.lineNumBer = lineNumBer;

		if (lineNumBer === this._lineCnt) {
			this._lastVisitedLine.value = this.getLineRawContent(lineNumBer);
		} else if (this._EOLNormalized) {
			this._lastVisitedLine.value = this.getLineRawContent(lineNumBer, this._EOLLength);
		} else {
			this._lastVisitedLine.value = this.getLineRawContent(lineNumBer).replace(/(\r\n|\r|\n)$/, '');
		}

		return this._lastVisitedLine.value;
	}

	private _getCharCode(nodePos: NodePosition): numBer {
		if (nodePos.remainder === nodePos.node.piece.length) {
			// the char we want to fetch is at the head of next node.
			let matchingNode = nodePos.node.next();
			if (!matchingNode) {
				return 0;
			}

			let Buffer = this._Buffers[matchingNode.piece.BufferIndex];
			let startOffset = this.offsetInBuffer(matchingNode.piece.BufferIndex, matchingNode.piece.start);
			return Buffer.Buffer.charCodeAt(startOffset);
		} else {
			let Buffer = this._Buffers[nodePos.node.piece.BufferIndex];
			let startOffset = this.offsetInBuffer(nodePos.node.piece.BufferIndex, nodePos.node.piece.start);
			let targetOffset = startOffset + nodePos.remainder;

			return Buffer.Buffer.charCodeAt(targetOffset);
		}
	}

	puBlic getLineCharCode(lineNumBer: numBer, index: numBer): numBer {
		let nodePos = this.nodeAt2(lineNumBer, index + 1);
		return this._getCharCode(nodePos);
	}

	puBlic getLineLength(lineNumBer: numBer): numBer {
		if (lineNumBer === this.getLineCount()) {
			let startOffset = this.getOffsetAt(lineNumBer, 1);
			return this.getLength() - startOffset;
		}
		return this.getOffsetAt(lineNumBer + 1, 1) - this.getOffsetAt(lineNumBer, 1) - this._EOLLength;
	}

	puBlic getCharCode(offset: numBer): numBer {
		let nodePos = this.nodeAt(offset);
		return this._getCharCode(nodePos);
	}

	puBlic findMatchesInNode(node: TreeNode, searcher: Searcher, startLineNumBer: numBer, startColumn: numBer, startCursor: BufferCursor, endCursor: BufferCursor, searchData: SearchData, captureMatches: Boolean, limitResultCount: numBer, resultLen: numBer, result: FindMatch[]) {
		let Buffer = this._Buffers[node.piece.BufferIndex];
		let startOffsetInBuffer = this.offsetInBuffer(node.piece.BufferIndex, node.piece.start);
		let start = this.offsetInBuffer(node.piece.BufferIndex, startCursor);
		let end = this.offsetInBuffer(node.piece.BufferIndex, endCursor);

		let m: RegExpExecArray | null;
		// Reset regex to search from the Beginning
		let ret: BufferCursor = { line: 0, column: 0 };
		let searchText: string;
		let offsetInBuffer: (offset: numBer) => numBer;

		if (searcher._wordSeparators) {
			searchText = Buffer.Buffer.suBstring(start, end);
			offsetInBuffer = (offset: numBer) => offset + start;
			searcher.reset(0);
		} else {
			searchText = Buffer.Buffer;
			offsetInBuffer = (offset: numBer) => offset;
			searcher.reset(start);
		}

		do {
			m = searcher.next(searchText);

			if (m) {
				if (offsetInBuffer(m.index) >= end) {
					return resultLen;
				}
				this.positionInBuffer(node, offsetInBuffer(m.index) - startOffsetInBuffer, ret);
				let lineFeedCnt = this.getLineFeedCnt(node.piece.BufferIndex, startCursor, ret);
				let retStartColumn = ret.line === startCursor.line ? ret.column - startCursor.column + startColumn : ret.column + 1;
				let retEndColumn = retStartColumn + m[0].length;
				result[resultLen++] = createFindMatch(new Range(startLineNumBer + lineFeedCnt, retStartColumn, startLineNumBer + lineFeedCnt, retEndColumn), m, captureMatches);

				if (offsetInBuffer(m.index) + m[0].length >= end) {
					return resultLen;
				}
				if (resultLen >= limitResultCount) {
					return resultLen;
				}
			}

		} while (m);

		return resultLen;
	}

	puBlic findMatchesLineByLine(searchRange: Range, searchData: SearchData, captureMatches: Boolean, limitResultCount: numBer): FindMatch[] {
		const result: FindMatch[] = [];
		let resultLen = 0;
		const searcher = new Searcher(searchData.wordSeparators, searchData.regex);

		let startPosition = this.nodeAt2(searchRange.startLineNumBer, searchRange.startColumn);
		if (startPosition === null) {
			return [];
		}
		let endPosition = this.nodeAt2(searchRange.endLineNumBer, searchRange.endColumn);
		if (endPosition === null) {
			return [];
		}
		let start = this.positionInBuffer(startPosition.node, startPosition.remainder);
		let end = this.positionInBuffer(endPosition.node, endPosition.remainder);

		if (startPosition.node === endPosition.node) {
			this.findMatchesInNode(startPosition.node, searcher, searchRange.startLineNumBer, searchRange.startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
			return result;
		}

		let startLineNumBer = searchRange.startLineNumBer;

		let currentNode = startPosition.node;
		while (currentNode !== endPosition.node) {
			let lineBreakCnt = this.getLineFeedCnt(currentNode.piece.BufferIndex, start, currentNode.piece.end);

			if (lineBreakCnt >= 1) {
				// last line Break position
				let lineStarts = this._Buffers[currentNode.piece.BufferIndex].lineStarts;
				let startOffsetInBuffer = this.offsetInBuffer(currentNode.piece.BufferIndex, currentNode.piece.start);
				let nextLineStartOffset = lineStarts[start.line + lineBreakCnt];
				let startColumn = startLineNumBer === searchRange.startLineNumBer ? searchRange.startColumn : 1;
				resultLen = this.findMatchesInNode(currentNode, searcher, startLineNumBer, startColumn, start, this.positionInBuffer(currentNode, nextLineStartOffset - startOffsetInBuffer), searchData, captureMatches, limitResultCount, resultLen, result);

				if (resultLen >= limitResultCount) {
					return result;
				}

				startLineNumBer += lineBreakCnt;
			}

			let startColumn = startLineNumBer === searchRange.startLineNumBer ? searchRange.startColumn - 1 : 0;
			// search for the remaining content
			if (startLineNumBer === searchRange.endLineNumBer) {
				const text = this.getLineContent(startLineNumBer).suBstring(startColumn, searchRange.endColumn - 1);
				resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumBer, startColumn, resultLen, result, captureMatches, limitResultCount);
				return result;
			}

			resultLen = this._findMatchesInLine(searchData, searcher, this.getLineContent(startLineNumBer).suBstr(startColumn), startLineNumBer, startColumn, resultLen, result, captureMatches, limitResultCount);

			if (resultLen >= limitResultCount) {
				return result;
			}

			startLineNumBer++;
			startPosition = this.nodeAt2(startLineNumBer, 1);
			currentNode = startPosition.node;
			start = this.positionInBuffer(startPosition.node, startPosition.remainder);
		}

		if (startLineNumBer === searchRange.endLineNumBer) {
			let startColumn = startLineNumBer === searchRange.startLineNumBer ? searchRange.startColumn - 1 : 0;
			const text = this.getLineContent(startLineNumBer).suBstring(startColumn, searchRange.endColumn - 1);
			resultLen = this._findMatchesInLine(searchData, searcher, text, searchRange.endLineNumBer, startColumn, resultLen, result, captureMatches, limitResultCount);
			return result;
		}

		let startColumn = startLineNumBer === searchRange.startLineNumBer ? searchRange.startColumn : 1;
		resultLen = this.findMatchesInNode(endPosition.node, searcher, startLineNumBer, startColumn, start, end, searchData, captureMatches, limitResultCount, resultLen, result);
		return result;
	}

	private _findMatchesInLine(searchData: SearchData, searcher: Searcher, text: string, lineNumBer: numBer, deltaOffset: numBer, resultLen: numBer, result: FindMatch[], captureMatches: Boolean, limitResultCount: numBer): numBer {
		const wordSeparators = searchData.wordSeparators;
		if (!captureMatches && searchData.simpleSearch) {
			const searchString = searchData.simpleSearch;
			const searchStringLen = searchString.length;
			const textLength = text.length;

			let lastMatchIndex = -searchStringLen;
			while ((lastMatchIndex = text.indexOf(searchString, lastMatchIndex + searchStringLen)) !== -1) {
				if (!wordSeparators || isValidMatch(wordSeparators, text, textLength, lastMatchIndex, searchStringLen)) {
					result[resultLen++] = new FindMatch(new Range(lineNumBer, lastMatchIndex + 1 + deltaOffset, lineNumBer, lastMatchIndex + 1 + searchStringLen + deltaOffset), null);
					if (resultLen >= limitResultCount) {
						return resultLen;
					}
				}
			}
			return resultLen;
		}

		let m: RegExpExecArray | null;
		// Reset regex to search from the Beginning
		searcher.reset(0);
		do {
			m = searcher.next(text);
			if (m) {
				result[resultLen++] = createFindMatch(new Range(lineNumBer, m.index + 1 + deltaOffset, lineNumBer, m.index + 1 + m[0].length + deltaOffset), m, captureMatches);
				if (resultLen >= limitResultCount) {
					return resultLen;
				}
			}
		} while (m);
		return resultLen;
	}

	// #endregion

	// #region Piece TaBle
	puBlic insert(offset: numBer, value: string, eolNormalized: Boolean = false): void {
		this._EOLNormalized = this._EOLNormalized && eolNormalized;
		this._lastVisitedLine.lineNumBer = 0;
		this._lastVisitedLine.value = '';

		if (this.root !== SENTINEL) {
			let { node, remainder, nodeStartOffset } = this.nodeAt(offset);
			let piece = node.piece;
			let BufferIndex = piece.BufferIndex;
			let insertPosInBuffer = this.positionInBuffer(node, remainder);
			if (node.piece.BufferIndex === 0 &&
				piece.end.line === this._lastChangeBufferPos.line &&
				piece.end.column === this._lastChangeBufferPos.column &&
				(nodeStartOffset + piece.length === offset) &&
				value.length < AverageBufferSize
			) {
				// changed Buffer
				this.appendToNode(node, value);
				this.computeBufferMetadata();
				return;
			}

			if (nodeStartOffset === offset) {
				this.insertContentToNodeLeft(value, node);
				this._searchCache.validate(offset);
			} else if (nodeStartOffset + node.piece.length > offset) {
				// we are inserting into the middle of a node.
				let nodesToDel: TreeNode[] = [];
				let newRightPiece = new Piece(
					piece.BufferIndex,
					insertPosInBuffer,
					piece.end,
					this.getLineFeedCnt(piece.BufferIndex, insertPosInBuffer, piece.end),
					this.offsetInBuffer(BufferIndex, piece.end) - this.offsetInBuffer(BufferIndex, insertPosInBuffer)
				);

				if (this.shouldCheckCRLF() && this.endWithCR(value)) {
					let headOfRight = this.nodeCharCodeAt(node, remainder);

					if (headOfRight === 10 /** \n */) {
						let newStart: BufferCursor = { line: newRightPiece.start.line + 1, column: 0 };
						newRightPiece = new Piece(
							newRightPiece.BufferIndex,
							newStart,
							newRightPiece.end,
							this.getLineFeedCnt(newRightPiece.BufferIndex, newStart, newRightPiece.end),
							newRightPiece.length - 1
						);

						value += '\n';
					}
				}

				// reuse node for content Before insertion point.
				if (this.shouldCheckCRLF() && this.startWithLF(value)) {
					let tailOfLeft = this.nodeCharCodeAt(node, remainder - 1);
					if (tailOfLeft === 13 /** \r */) {
						let previousPos = this.positionInBuffer(node, remainder - 1);
						this.deleteNodeTail(node, previousPos);
						value = '\r' + value;

						if (node.piece.length === 0) {
							nodesToDel.push(node);
						}
					} else {
						this.deleteNodeTail(node, insertPosInBuffer);
					}
				} else {
					this.deleteNodeTail(node, insertPosInBuffer);
				}

				let newPieces = this.createNewPieces(value);
				if (newRightPiece.length > 0) {
					this.rBInsertRight(node, newRightPiece);
				}

				let tmpNode = node;
				for (let k = 0; k < newPieces.length; k++) {
					tmpNode = this.rBInsertRight(tmpNode, newPieces[k]);
				}
				this.deleteNodes(nodesToDel);
			} else {
				this.insertContentToNodeRight(value, node);
			}
		} else {
			// insert new node
			let pieces = this.createNewPieces(value);
			let node = this.rBInsertLeft(null, pieces[0]);

			for (let k = 1; k < pieces.length; k++) {
				node = this.rBInsertRight(node, pieces[k]);
			}
		}

		// todo, this is too Brutal. Total line feed count should Be updated the same way as lf_left.
		this.computeBufferMetadata();
	}

	puBlic delete(offset: numBer, cnt: numBer): void {
		this._lastVisitedLine.lineNumBer = 0;
		this._lastVisitedLine.value = '';

		if (cnt <= 0 || this.root === SENTINEL) {
			return;
		}

		let startPosition = this.nodeAt(offset);
		let endPosition = this.nodeAt(offset + cnt);
		let startNode = startPosition.node;
		let endNode = endPosition.node;

		if (startNode === endNode) {
			let startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
			let endSplitPosInBuffer = this.positionInBuffer(startNode, endPosition.remainder);

			if (startPosition.nodeStartOffset === offset) {
				if (cnt === startNode.piece.length) { // delete node
					let next = startNode.next();
					rBDelete(this, startNode);
					this.validateCRLFWithPrevNode(next);
					this.computeBufferMetadata();
					return;
				}
				this.deleteNodeHead(startNode, endSplitPosInBuffer);
				this._searchCache.validate(offset);
				this.validateCRLFWithPrevNode(startNode);
				this.computeBufferMetadata();
				return;
			}

			if (startPosition.nodeStartOffset + startNode.piece.length === offset + cnt) {
				this.deleteNodeTail(startNode, startSplitPosInBuffer);
				this.validateCRLFWithNextNode(startNode);
				this.computeBufferMetadata();
				return;
			}

			// delete content in the middle, this node will Be splitted to nodes
			this.shrinkNode(startNode, startSplitPosInBuffer, endSplitPosInBuffer);
			this.computeBufferMetadata();
			return;
		}

		let nodesToDel: TreeNode[] = [];

		let startSplitPosInBuffer = this.positionInBuffer(startNode, startPosition.remainder);
		this.deleteNodeTail(startNode, startSplitPosInBuffer);
		this._searchCache.validate(offset);
		if (startNode.piece.length === 0) {
			nodesToDel.push(startNode);
		}

		// update last touched node
		let endSplitPosInBuffer = this.positionInBuffer(endNode, endPosition.remainder);
		this.deleteNodeHead(endNode, endSplitPosInBuffer);
		if (endNode.piece.length === 0) {
			nodesToDel.push(endNode);
		}

		// delete nodes in Between
		let secondNode = startNode.next();
		for (let node = secondNode; node !== SENTINEL && node !== endNode; node = node.next()) {
			nodesToDel.push(node);
		}

		let prev = startNode.piece.length === 0 ? startNode.prev() : startNode;
		this.deleteNodes(nodesToDel);
		this.validateCRLFWithNextNode(prev);
		this.computeBufferMetadata();
	}

	private insertContentToNodeLeft(value: string, node: TreeNode) {
		// we are inserting content to the Beginning of node
		let nodesToDel: TreeNode[] = [];
		if (this.shouldCheckCRLF() && this.endWithCR(value) && this.startWithLF(node)) {
			// move `\n` to new node.

			let piece = node.piece;
			let newStart: BufferCursor = { line: piece.start.line + 1, column: 0 };
			let nPiece = new Piece(
				piece.BufferIndex,
				newStart,
				piece.end,
				this.getLineFeedCnt(piece.BufferIndex, newStart, piece.end),
				piece.length - 1
			);

			node.piece = nPiece;

			value += '\n';
			updateTreeMetadata(this, node, -1, -1);

			if (node.piece.length === 0) {
				nodesToDel.push(node);
			}
		}

		let newPieces = this.createNewPieces(value);
		let newNode = this.rBInsertLeft(node, newPieces[newPieces.length - 1]);
		for (let k = newPieces.length - 2; k >= 0; k--) {
			newNode = this.rBInsertLeft(newNode, newPieces[k]);
		}
		this.validateCRLFWithPrevNode(newNode);
		this.deleteNodes(nodesToDel);
	}

	private insertContentToNodeRight(value: string, node: TreeNode) {
		// we are inserting to the right of this node.
		if (this.adjustCarriageReturnFromNext(value, node)) {
			// move \n to the new node.
			value += '\n';
		}

		let newPieces = this.createNewPieces(value);
		let newNode = this.rBInsertRight(node, newPieces[0]);
		let tmpNode = newNode;

		for (let k = 1; k < newPieces.length; k++) {
			tmpNode = this.rBInsertRight(tmpNode, newPieces[k]);
		}

		this.validateCRLFWithPrevNode(newNode);
	}

	private positionInBuffer(node: TreeNode, remainder: numBer): BufferCursor;
	private positionInBuffer(node: TreeNode, remainder: numBer, ret: BufferCursor): null;
	private positionInBuffer(node: TreeNode, remainder: numBer, ret?: BufferCursor): BufferCursor | null {
		let piece = node.piece;
		let BufferIndex = node.piece.BufferIndex;
		let lineStarts = this._Buffers[BufferIndex].lineStarts;

		let startOffset = lineStarts[piece.start.line] + piece.start.column;

		let offset = startOffset + remainder;

		// Binary search offset Between startOffset and endOffset
		let low = piece.start.line;
		let high = piece.end.line;

		let mid: numBer = 0;
		let midStop: numBer = 0;
		let midStart: numBer = 0;

		while (low <= high) {
			mid = low + ((high - low) / 2) | 0;
			midStart = lineStarts[mid];

			if (mid === high) {
				Break;
			}

			midStop = lineStarts[mid + 1];

			if (offset < midStart) {
				high = mid - 1;
			} else if (offset >= midStop) {
				low = mid + 1;
			} else {
				Break;
			}
		}

		if (ret) {
			ret.line = mid;
			ret.column = offset - midStart;
			return null;
		}

		return {
			line: mid,
			column: offset - midStart
		};
	}

	private getLineFeedCnt(BufferIndex: numBer, start: BufferCursor, end: BufferCursor): numBer {
		// we don't need to worry aBout start: aBc\r|\n, or aBc|\r, or aBc|\n, or aBc|\r\n doesn't change the fact that, there is one line Break after start.
		// now let's take care of end: aBc\r|\n, if end is in Between \r and \n, we need to add line feed count By 1
		if (end.column === 0) {
			return end.line - start.line;
		}

		let lineStarts = this._Buffers[BufferIndex].lineStarts;
		if (end.line === lineStarts.length - 1) { // it means, there is no \n after end, otherwise, there will Be one more lineStart.
			return end.line - start.line;
		}

		let nextLineStartOffset = lineStarts[end.line + 1];
		let endOffset = lineStarts[end.line] + end.column;
		if (nextLineStartOffset > endOffset + 1) { // there are more than 1 character after end, which means it can't Be \n
			return end.line - start.line;
		}
		// endOffset + 1 === nextLineStartOffset
		// character at endOffset is \n, so we check the character Before first
		// if character at endOffset is \r, end.column is 0 and we can't get here.
		let previousCharOffset = endOffset - 1; // end.column > 0 so it's okay.
		let Buffer = this._Buffers[BufferIndex].Buffer;

		if (Buffer.charCodeAt(previousCharOffset) === 13) {
			return end.line - start.line + 1;
		} else {
			return end.line - start.line;
		}
	}

	private offsetInBuffer(BufferIndex: numBer, cursor: BufferCursor): numBer {
		let lineStarts = this._Buffers[BufferIndex].lineStarts;
		return lineStarts[cursor.line] + cursor.column;
	}

	private deleteNodes(nodes: TreeNode[]): void {
		for (let i = 0; i < nodes.length; i++) {
			rBDelete(this, nodes[i]);
		}
	}

	private createNewPieces(text: string): Piece[] {
		if (text.length > AverageBufferSize) {
			// the content is large, operations like suBstring, charCode Becomes slow
			// so here we split it into smaller chunks, just like what we did for CR/LF normalization
			let newPieces: Piece[] = [];
			while (text.length > AverageBufferSize) {
				const lastChar = text.charCodeAt(AverageBufferSize - 1);
				let splitText;
				if (lastChar === CharCode.CarriageReturn || (lastChar >= 0xD800 && lastChar <= 0xDBFF)) {
					// last character is \r or a high surrogate => keep it Back
					splitText = text.suBstring(0, AverageBufferSize - 1);
					text = text.suBstring(AverageBufferSize - 1);
				} else {
					splitText = text.suBstring(0, AverageBufferSize);
					text = text.suBstring(AverageBufferSize);
				}

				let lineStarts = createLineStartsFast(splitText);
				newPieces.push(new Piece(
					this._Buffers.length, /* Buffer index */
					{ line: 0, column: 0 },
					{ line: lineStarts.length - 1, column: splitText.length - lineStarts[lineStarts.length - 1] },
					lineStarts.length - 1,
					splitText.length
				));
				this._Buffers.push(new StringBuffer(splitText, lineStarts));
			}

			let lineStarts = createLineStartsFast(text);
			newPieces.push(new Piece(
				this._Buffers.length, /* Buffer index */
				{ line: 0, column: 0 },
				{ line: lineStarts.length - 1, column: text.length - lineStarts[lineStarts.length - 1] },
				lineStarts.length - 1,
				text.length
			));
			this._Buffers.push(new StringBuffer(text, lineStarts));

			return newPieces;
		}

		let startOffset = this._Buffers[0].Buffer.length;
		const lineStarts = createLineStartsFast(text, false);

		let start = this._lastChangeBufferPos;
		if (this._Buffers[0].lineStarts[this._Buffers[0].lineStarts.length - 1] === startOffset
			&& startOffset !== 0
			&& this.startWithLF(text)
			&& this.endWithCR(this._Buffers[0].Buffer) // todo, we can check this._lastChangeBufferPos's column as it's the last one
		) {
			this._lastChangeBufferPos = { line: this._lastChangeBufferPos.line, column: this._lastChangeBufferPos.column + 1 };
			start = this._lastChangeBufferPos;

			for (let i = 0; i < lineStarts.length; i++) {
				lineStarts[i] += startOffset + 1;
			}

			this._Buffers[0].lineStarts = (<numBer[]>this._Buffers[0].lineStarts).concat(<numBer[]>lineStarts.slice(1));
			this._Buffers[0].Buffer += '_' + text;
			startOffset += 1;
		} else {
			if (startOffset !== 0) {
				for (let i = 0; i < lineStarts.length; i++) {
					lineStarts[i] += startOffset;
				}
			}
			this._Buffers[0].lineStarts = (<numBer[]>this._Buffers[0].lineStarts).concat(<numBer[]>lineStarts.slice(1));
			this._Buffers[0].Buffer += text;
		}

		const endOffset = this._Buffers[0].Buffer.length;
		let endIndex = this._Buffers[0].lineStarts.length - 1;
		let endColumn = endOffset - this._Buffers[0].lineStarts[endIndex];
		let endPos = { line: endIndex, column: endColumn };
		let newPiece = new Piece(
			0, /** todo@peng */
			start,
			endPos,
			this.getLineFeedCnt(0, start, endPos),
			endOffset - startOffset
		);
		this._lastChangeBufferPos = endPos;
		return [newPiece];
	}

	puBlic getLinesRawContent(): string {
		return this.getContentOfSuBTree(this.root);
	}

	puBlic getLineRawContent(lineNumBer: numBer, endOffset: numBer = 0): string {
		let x = this.root;

		let ret = '';
		let cache = this._searchCache.get2(lineNumBer);
		if (cache) {
			x = cache.node;
			let prevAccumulatedValue = this.getAccumulatedValue(x, lineNumBer - cache.nodeStartLineNumBer - 1);
			let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;
			let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);
			if (cache.nodeStartLineNumBer + x.piece.lineFeedCnt === lineNumBer) {
				ret = Buffer.suBstring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
			} else {
				let accumulatedValue = this.getAccumulatedValue(x, lineNumBer - cache.nodeStartLineNumBer);
				return Buffer.suBstring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
			}
		} else {
			let nodeStartOffset = 0;
			const originalLineNumBer = lineNumBer;
			while (x !== SENTINEL) {
				if (x.left !== SENTINEL && x.lf_left >= lineNumBer - 1) {
					x = x.left;
				} else if (x.lf_left + x.piece.lineFeedCnt > lineNumBer - 1) {
					let prevAccumulatedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 2);
					let accumulatedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 1);
					let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;
					let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);
					nodeStartOffset += x.size_left;
					this._searchCache.set({
						node: x,
						nodeStartOffset,
						nodeStartLineNumBer: originalLineNumBer - (lineNumBer - 1 - x.lf_left)
					});

					return Buffer.suBstring(startOffset + prevAccumulatedValue, startOffset + accumulatedValue - endOffset);
				} else if (x.lf_left + x.piece.lineFeedCnt === lineNumBer - 1) {
					let prevAccumulatedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 2);
					let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;
					let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);

					ret = Buffer.suBstring(startOffset + prevAccumulatedValue, startOffset + x.piece.length);
					Break;
				} else {
					lineNumBer -= x.lf_left + x.piece.lineFeedCnt;
					nodeStartOffset += x.size_left + x.piece.length;
					x = x.right;
				}
			}
		}

		// search in order, to find the node contains end column
		x = x.next();
		while (x !== SENTINEL) {
			let Buffer = this._Buffers[x.piece.BufferIndex].Buffer;

			if (x.piece.lineFeedCnt > 0) {
				let accumulatedValue = this.getAccumulatedValue(x, 0);
				let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);

				ret += Buffer.suBstring(startOffset, startOffset + accumulatedValue - endOffset);
				return ret;
			} else {
				let startOffset = this.offsetInBuffer(x.piece.BufferIndex, x.piece.start);
				ret += Buffer.suBstr(startOffset, x.piece.length);
			}

			x = x.next();
		}

		return ret;
	}

	private computeBufferMetadata() {
		let x = this.root;

		let lfCnt = 1;
		let len = 0;

		while (x !== SENTINEL) {
			lfCnt += x.lf_left + x.piece.lineFeedCnt;
			len += x.size_left + x.piece.length;
			x = x.right;
		}

		this._lineCnt = lfCnt;
		this._length = len;
		this._searchCache.validate(this._length);
	}

	// #region node operations
	private getIndexOf(node: TreeNode, accumulatedValue: numBer): { index: numBer, remainder: numBer } {
		let piece = node.piece;
		let pos = this.positionInBuffer(node, accumulatedValue);
		let lineCnt = pos.line - piece.start.line;

		if (this.offsetInBuffer(piece.BufferIndex, piece.end) - this.offsetInBuffer(piece.BufferIndex, piece.start) === accumulatedValue) {
			// we are checking the end of this node, so a CRLF check is necessary.
			let realLineCnt = this.getLineFeedCnt(node.piece.BufferIndex, piece.start, pos);
			if (realLineCnt !== lineCnt) {
				// aha yes, CRLF
				return { index: realLineCnt, remainder: 0 };
			}
		}

		return { index: lineCnt, remainder: pos.column };
	}

	private getAccumulatedValue(node: TreeNode, index: numBer) {
		if (index < 0) {
			return 0;
		}
		let piece = node.piece;
		let lineStarts = this._Buffers[piece.BufferIndex].lineStarts;
		let expectedLineStartIndex = piece.start.line + index + 1;
		if (expectedLineStartIndex > piece.end.line) {
			return lineStarts[piece.end.line] + piece.end.column - lineStarts[piece.start.line] - piece.start.column;
		} else {
			return lineStarts[expectedLineStartIndex] - lineStarts[piece.start.line] - piece.start.column;
		}
	}

	private deleteNodeTail(node: TreeNode, pos: BufferCursor) {
		const piece = node.piece;
		const originalLFCnt = piece.lineFeedCnt;
		const originalEndOffset = this.offsetInBuffer(piece.BufferIndex, piece.end);

		const newEnd = pos;
		const newEndOffset = this.offsetInBuffer(piece.BufferIndex, newEnd);
		const newLineFeedCnt = this.getLineFeedCnt(piece.BufferIndex, piece.start, newEnd);

		const lf_delta = newLineFeedCnt - originalLFCnt;
		const size_delta = newEndOffset - originalEndOffset;
		const newLength = piece.length + size_delta;

		node.piece = new Piece(
			piece.BufferIndex,
			piece.start,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		updateTreeMetadata(this, node, size_delta, lf_delta);
	}

	private deleteNodeHead(node: TreeNode, pos: BufferCursor) {
		const piece = node.piece;
		const originalLFCnt = piece.lineFeedCnt;
		const originalStartOffset = this.offsetInBuffer(piece.BufferIndex, piece.start);

		const newStart = pos;
		const newLineFeedCnt = this.getLineFeedCnt(piece.BufferIndex, newStart, piece.end);
		const newStartOffset = this.offsetInBuffer(piece.BufferIndex, newStart);
		const lf_delta = newLineFeedCnt - originalLFCnt;
		const size_delta = originalStartOffset - newStartOffset;
		const newLength = piece.length + size_delta;
		node.piece = new Piece(
			piece.BufferIndex,
			newStart,
			piece.end,
			newLineFeedCnt,
			newLength
		);

		updateTreeMetadata(this, node, size_delta, lf_delta);
	}

	private shrinkNode(node: TreeNode, start: BufferCursor, end: BufferCursor) {
		const piece = node.piece;
		const originalStartPos = piece.start;
		const originalEndPos = piece.end;

		// old piece, originalStartPos, start
		const oldLength = piece.length;
		const oldLFCnt = piece.lineFeedCnt;
		const newEnd = start;
		const newLineFeedCnt = this.getLineFeedCnt(piece.BufferIndex, piece.start, newEnd);
		const newLength = this.offsetInBuffer(piece.BufferIndex, start) - this.offsetInBuffer(piece.BufferIndex, originalStartPos);

		node.piece = new Piece(
			piece.BufferIndex,
			piece.start,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		updateTreeMetadata(this, node, newLength - oldLength, newLineFeedCnt - oldLFCnt);

		// new right piece, end, originalEndPos
		let newPiece = new Piece(
			piece.BufferIndex,
			end,
			originalEndPos,
			this.getLineFeedCnt(piece.BufferIndex, end, originalEndPos),
			this.offsetInBuffer(piece.BufferIndex, originalEndPos) - this.offsetInBuffer(piece.BufferIndex, end)
		);

		let newNode = this.rBInsertRight(node, newPiece);
		this.validateCRLFWithPrevNode(newNode);
	}

	private appendToNode(node: TreeNode, value: string): void {
		if (this.adjustCarriageReturnFromNext(value, node)) {
			value += '\n';
		}

		const hitCRLF = this.shouldCheckCRLF() && this.startWithLF(value) && this.endWithCR(node);
		const startOffset = this._Buffers[0].Buffer.length;
		this._Buffers[0].Buffer += value;
		const lineStarts = createLineStartsFast(value, false);
		for (let i = 0; i < lineStarts.length; i++) {
			lineStarts[i] += startOffset;
		}
		if (hitCRLF) {
			let prevStartOffset = this._Buffers[0].lineStarts[this._Buffers[0].lineStarts.length - 2];
			(<numBer[]>this._Buffers[0].lineStarts).pop();
			// _lastChangeBufferPos is already wrong
			this._lastChangeBufferPos = { line: this._lastChangeBufferPos.line - 1, column: startOffset - prevStartOffset };
		}

		this._Buffers[0].lineStarts = (<numBer[]>this._Buffers[0].lineStarts).concat(<numBer[]>lineStarts.slice(1));
		const endIndex = this._Buffers[0].lineStarts.length - 1;
		const endColumn = this._Buffers[0].Buffer.length - this._Buffers[0].lineStarts[endIndex];
		const newEnd = { line: endIndex, column: endColumn };
		const newLength = node.piece.length + value.length;
		const oldLineFeedCnt = node.piece.lineFeedCnt;
		const newLineFeedCnt = this.getLineFeedCnt(0, node.piece.start, newEnd);
		const lf_delta = newLineFeedCnt - oldLineFeedCnt;

		node.piece = new Piece(
			node.piece.BufferIndex,
			node.piece.start,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		this._lastChangeBufferPos = newEnd;
		updateTreeMetadata(this, node, value.length, lf_delta);
	}

	private nodeAt(offset: numBer): NodePosition {
		let x = this.root;
		let cache = this._searchCache.get(offset);
		if (cache) {
			return {
				node: cache.node,
				nodeStartOffset: cache.nodeStartOffset,
				remainder: offset - cache.nodeStartOffset
			};
		}

		let nodeStartOffset = 0;

		while (x !== SENTINEL) {
			if (x.size_left > offset) {
				x = x.left;
			} else if (x.size_left + x.piece.length >= offset) {
				nodeStartOffset += x.size_left;
				let ret = {
					node: x,
					remainder: offset - x.size_left,
					nodeStartOffset
				};
				this._searchCache.set(ret);
				return ret;
			} else {
				offset -= x.size_left + x.piece.length;
				nodeStartOffset += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		return null!;
	}

	private nodeAt2(lineNumBer: numBer, column: numBer): NodePosition {
		let x = this.root;
		let nodeStartOffset = 0;

		while (x !== SENTINEL) {
			if (x.left !== SENTINEL && x.lf_left >= lineNumBer - 1) {
				x = x.left;
			} else if (x.lf_left + x.piece.lineFeedCnt > lineNumBer - 1) {
				let prevAccumualtedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 2);
				let accumulatedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 1);
				nodeStartOffset += x.size_left;

				return {
					node: x,
					remainder: Math.min(prevAccumualtedValue + column - 1, accumulatedValue),
					nodeStartOffset
				};
			} else if (x.lf_left + x.piece.lineFeedCnt === lineNumBer - 1) {
				let prevAccumualtedValue = this.getAccumulatedValue(x, lineNumBer - x.lf_left - 2);
				if (prevAccumualtedValue + column - 1 <= x.piece.length) {
					return {
						node: x,
						remainder: prevAccumualtedValue + column - 1,
						nodeStartOffset
					};
				} else {
					column -= x.piece.length - prevAccumualtedValue;
					Break;
				}
			} else {
				lineNumBer -= x.lf_left + x.piece.lineFeedCnt;
				nodeStartOffset += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		// search in order, to find the node contains position.column
		x = x.next();
		while (x !== SENTINEL) {

			if (x.piece.lineFeedCnt > 0) {
				let accumulatedValue = this.getAccumulatedValue(x, 0);
				let nodeStartOffset = this.offsetOfNode(x);
				return {
					node: x,
					remainder: Math.min(column - 1, accumulatedValue),
					nodeStartOffset
				};
			} else {
				if (x.piece.length >= column - 1) {
					let nodeStartOffset = this.offsetOfNode(x);
					return {
						node: x,
						remainder: column - 1,
						nodeStartOffset
					};
				} else {
					column -= x.piece.length;
				}
			}

			x = x.next();
		}

		return null!;
	}

	private nodeCharCodeAt(node: TreeNode, offset: numBer): numBer {
		if (node.piece.lineFeedCnt < 1) {
			return -1;
		}
		let Buffer = this._Buffers[node.piece.BufferIndex];
		let newOffset = this.offsetInBuffer(node.piece.BufferIndex, node.piece.start) + offset;
		return Buffer.Buffer.charCodeAt(newOffset);
	}

	private offsetOfNode(node: TreeNode): numBer {
		if (!node) {
			return 0;
		}
		let pos = node.size_left;
		while (node !== this.root) {
			if (node.parent.right === node) {
				pos += node.parent.size_left + node.parent.piece.length;
			}

			node = node.parent;
		}

		return pos;
	}

	// #endregion

	// #region CRLF
	private shouldCheckCRLF() {
		return !(this._EOLNormalized && this._EOL === '\n');
	}

	private startWithLF(val: string | TreeNode): Boolean {
		if (typeof val === 'string') {
			return val.charCodeAt(0) === 10;
		}

		if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
			return false;
		}

		let piece = val.piece;
		let lineStarts = this._Buffers[piece.BufferIndex].lineStarts;
		let line = piece.start.line;
		let startOffset = lineStarts[line] + piece.start.column;
		if (line === lineStarts.length - 1) {
			// last line, so there is no line feed at the end of this line
			return false;
		}
		let nextLineOffset = lineStarts[line + 1];
		if (nextLineOffset > startOffset + 1) {
			return false;
		}
		return this._Buffers[piece.BufferIndex].Buffer.charCodeAt(startOffset) === 10;
	}

	private endWithCR(val: string | TreeNode): Boolean {
		if (typeof val === 'string') {
			return val.charCodeAt(val.length - 1) === 13;
		}

		if (val === SENTINEL || val.piece.lineFeedCnt === 0) {
			return false;
		}

		return this.nodeCharCodeAt(val, val.piece.length - 1) === 13;
	}

	private validateCRLFWithPrevNode(nextNode: TreeNode) {
		if (this.shouldCheckCRLF() && this.startWithLF(nextNode)) {
			let node = nextNode.prev();
			if (this.endWithCR(node)) {
				this.fixCRLF(node, nextNode);
			}
		}
	}

	private validateCRLFWithNextNode(node: TreeNode) {
		if (this.shouldCheckCRLF() && this.endWithCR(node)) {
			let nextNode = node.next();
			if (this.startWithLF(nextNode)) {
				this.fixCRLF(node, nextNode);
			}
		}
	}

	private fixCRLF(prev: TreeNode, next: TreeNode) {
		let nodesToDel: TreeNode[] = [];
		// update node
		let lineStarts = this._Buffers[prev.piece.BufferIndex].lineStarts;
		let newEnd: BufferCursor;
		if (prev.piece.end.column === 0) {
			// it means, last line ends with \r, not \r\n
			newEnd = { line: prev.piece.end.line - 1, column: lineStarts[prev.piece.end.line] - lineStarts[prev.piece.end.line - 1] - 1 };
		} else {
			// \r\n
			newEnd = { line: prev.piece.end.line, column: prev.piece.end.column - 1 };
		}

		const prevNewLength = prev.piece.length - 1;
		const prevNewLFCnt = prev.piece.lineFeedCnt - 1;
		prev.piece = new Piece(
			prev.piece.BufferIndex,
			prev.piece.start,
			newEnd,
			prevNewLFCnt,
			prevNewLength
		);

		updateTreeMetadata(this, prev, - 1, -1);
		if (prev.piece.length === 0) {
			nodesToDel.push(prev);
		}

		// update nextNode
		let newStart: BufferCursor = { line: next.piece.start.line + 1, column: 0 };
		const newLength = next.piece.length - 1;
		const newLineFeedCnt = this.getLineFeedCnt(next.piece.BufferIndex, newStart, next.piece.end);
		next.piece = new Piece(
			next.piece.BufferIndex,
			newStart,
			next.piece.end,
			newLineFeedCnt,
			newLength
		);

		updateTreeMetadata(this, next, - 1, -1);
		if (next.piece.length === 0) {
			nodesToDel.push(next);
		}

		// create new piece which contains \r\n
		let pieces = this.createNewPieces('\r\n');
		this.rBInsertRight(prev, pieces[0]);
		// delete empty nodes

		for (let i = 0; i < nodesToDel.length; i++) {
			rBDelete(this, nodesToDel[i]);
		}
	}

	private adjustCarriageReturnFromNext(value: string, node: TreeNode): Boolean {
		if (this.shouldCheckCRLF() && this.endWithCR(value)) {
			let nextNode = node.next();
			if (this.startWithLF(nextNode)) {
				// move `\n` forward
				value += '\n';

				if (nextNode.piece.length === 1) {
					rBDelete(this, nextNode);
				} else {

					const piece = nextNode.piece;
					const newStart: BufferCursor = { line: piece.start.line + 1, column: 0 };
					const newLength = piece.length - 1;
					const newLineFeedCnt = this.getLineFeedCnt(piece.BufferIndex, newStart, piece.end);
					nextNode.piece = new Piece(
						piece.BufferIndex,
						newStart,
						piece.end,
						newLineFeedCnt,
						newLength
					);

					updateTreeMetadata(this, nextNode, -1, -1);
				}
				return true;
			}
		}

		return false;
	}

	// #endregion

	// #endregion

	// #region Tree operations
	iterate(node: TreeNode, callBack: (node: TreeNode) => Boolean): Boolean {
		if (node === SENTINEL) {
			return callBack(SENTINEL);
		}

		let leftRet = this.iterate(node.left, callBack);
		if (!leftRet) {
			return leftRet;
		}

		return callBack(node) && this.iterate(node.right, callBack);
	}

	private getNodeContent(node: TreeNode) {
		if (node === SENTINEL) {
			return '';
		}
		let Buffer = this._Buffers[node.piece.BufferIndex];
		let currentContent;
		let piece = node.piece;
		let startOffset = this.offsetInBuffer(piece.BufferIndex, piece.start);
		let endOffset = this.offsetInBuffer(piece.BufferIndex, piece.end);
		currentContent = Buffer.Buffer.suBstring(startOffset, endOffset);
		return currentContent;
	}

	getPieceContent(piece: Piece) {
		let Buffer = this._Buffers[piece.BufferIndex];
		let startOffset = this.offsetInBuffer(piece.BufferIndex, piece.start);
		let endOffset = this.offsetInBuffer(piece.BufferIndex, piece.end);
		let currentContent = Buffer.Buffer.suBstring(startOffset, endOffset);
		return currentContent;
	}

	/**
	 *      node              node
	 *     /  \              /  \
	 *    a   B    <----   a    B
	 *                         /
	 *                        z
	 */
	private rBInsertRight(node: TreeNode | null, p: Piece): TreeNode {
		let z = new TreeNode(p, NodeColor.Red);
		z.left = SENTINEL;
		z.right = SENTINEL;
		z.parent = SENTINEL;
		z.size_left = 0;
		z.lf_left = 0;

		let x = this.root;
		if (x === SENTINEL) {
			this.root = z;
			z.color = NodeColor.Black;
		} else if (node!.right === SENTINEL) {
			node!.right = z;
			z.parent = node!;
		} else {
			let nextNode = leftest(node!.right);
			nextNode.left = z;
			z.parent = nextNode;
		}

		fixInsert(this, z);
		return z;
	}

	/**
	 *      node              node
	 *     /  \              /  \
	 *    a   B     ---->   a    B
	 *                       \
	 *                        z
	 */
	private rBInsertLeft(node: TreeNode | null, p: Piece): TreeNode {
		let z = new TreeNode(p, NodeColor.Red);
		z.left = SENTINEL;
		z.right = SENTINEL;
		z.parent = SENTINEL;
		z.size_left = 0;
		z.lf_left = 0;

		if (this.root === SENTINEL) {
			this.root = z;
			z.color = NodeColor.Black;
		} else if (node!.left === SENTINEL) {
			node!.left = z;
			z.parent = node!;
		} else {
			let prevNode = righttest(node!.left); // a
			prevNode.right = z;
			z.parent = prevNode;
		}

		fixInsert(this, z);
		return z;
	}

	private getContentOfSuBTree(node: TreeNode): string {
		let str = '';

		this.iterate(node, node => {
			str += this.getNodeContent(node);
			return true;
		});

		return str;
	}
	// #endregion
}
