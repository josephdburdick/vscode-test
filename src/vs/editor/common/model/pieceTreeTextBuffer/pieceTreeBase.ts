/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import { Position } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { FindMAtch, ITextSnApshot } from 'vs/editor/common/model';
import { NodeColor, SENTINEL, TreeNode, fixInsert, leftest, rbDelete, righttest, updAteTreeMetAdAtA } from 'vs/editor/common/model/pieceTreeTextBuffer/rbTreeBAse';
import { SeArchDAtA, SeArcher, creAteFindMAtch, isVAlidMAtch } from 'vs/editor/common/model/textModelSeArch';

// const lfRegex = new RegExp(/\r\n|\r|\n/g);
export const AverAgeBufferSize = 65535;

export function creAteUintArrAy(Arr: number[]): Uint32ArrAy | Uint16ArrAy {
	let r;
	if (Arr[Arr.length - 1] < 65536) {
		r = new Uint16ArrAy(Arr.length);
	} else {
		r = new Uint32ArrAy(Arr.length);
	}
	r.set(Arr, 0);
	return r;
}

export clAss LineStArts {
	constructor(
		public reAdonly lineStArts: Uint32ArrAy | Uint16ArrAy | number[],
		public reAdonly cr: number,
		public reAdonly lf: number,
		public reAdonly crlf: number,
		public reAdonly isBAsicASCII: booleAn
	) { }
}

export function creAteLineStArtsFAst(str: string, reAdonly: booleAn = true): Uint32ArrAy | Uint16ArrAy | number[] {
	let r: number[] = [0], rLength = 1;

	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.chArCodeAt(i);

		if (chr === ChArCode.CArriAgeReturn) {
			if (i + 1 < len && str.chArCodeAt(i + 1) === ChArCode.LineFeed) {
				// \r\n... cAse
				r[rLength++] = i + 2;
				i++; // skip \n
			} else {
				// \r... cAse
				r[rLength++] = i + 1;
			}
		} else if (chr === ChArCode.LineFeed) {
			r[rLength++] = i + 1;
		}
	}
	if (reAdonly) {
		return creAteUintArrAy(r);
	} else {
		return r;
	}
}

export function creAteLineStArts(r: number[], str: string): LineStArts {
	r.length = 0;
	r[0] = 0;
	let rLength = 1;
	let cr = 0, lf = 0, crlf = 0;
	let isBAsicASCII = true;
	for (let i = 0, len = str.length; i < len; i++) {
		const chr = str.chArCodeAt(i);

		if (chr === ChArCode.CArriAgeReturn) {
			if (i + 1 < len && str.chArCodeAt(i + 1) === ChArCode.LineFeed) {
				// \r\n... cAse
				crlf++;
				r[rLength++] = i + 2;
				i++; // skip \n
			} else {
				cr++;
				// \r... cAse
				r[rLength++] = i + 1;
			}
		} else if (chr === ChArCode.LineFeed) {
			lf++;
			r[rLength++] = i + 1;
		} else {
			if (isBAsicASCII) {
				if (chr !== ChArCode.TAb && (chr < 32 || chr > 126)) {
					isBAsicASCII = fAlse;
				}
			}
		}
	}
	const result = new LineStArts(creAteUintArrAy(r), cr, lf, crlf, isBAsicASCII);
	r.length = 0;

	return result;
}

export interfAce NodePosition {
	/**
	 * Piece Index
	 */
	node: TreeNode;
	/**
	 * remAiner in current piece.
	*/
	remAinder: number;
	/**
	 * node stArt offset in document.
	 */
	nodeStArtOffset: number;
}

export interfAce BufferCursor {
	/**
	 * Line number in current buffer
	 */
	line: number;
	/**
	 * Column number in current buffer
	 */
	column: number;
}

export clAss Piece {
	reAdonly bufferIndex: number;
	reAdonly stArt: BufferCursor;
	reAdonly end: BufferCursor;
	reAdonly length: number;
	reAdonly lineFeedCnt: number;

	constructor(bufferIndex: number, stArt: BufferCursor, end: BufferCursor, lineFeedCnt: number, length: number) {
		this.bufferIndex = bufferIndex;
		this.stArt = stArt;
		this.end = end;
		this.lineFeedCnt = lineFeedCnt;
		this.length = length;
	}
}

export clAss StringBuffer {
	buffer: string;
	lineStArts: Uint32ArrAy | Uint16ArrAy | number[];

	constructor(buffer: string, lineStArts: Uint32ArrAy | Uint16ArrAy | number[]) {
		this.buffer = buffer;
		this.lineStArts = lineStArts;
	}
}

/**
 * ReAdonly snApshot for piece tree.
 * In A reAl multiple threAd environment, to mAke snApshot reAding AlwAys work correctly, we need to
 * 1. MAke TreeNode.piece immutAble, then reAding And writing cAn run in pArAllel.
 * 2. TreeNode/Buffers normAlizAtion should not hAppen during snApshot reAding.
 */
clAss PieceTreeSnApshot implements ITextSnApshot {
	privAte reAdonly _pieces: Piece[];
	privAte _index: number;
	privAte reAdonly _tree: PieceTreeBAse;
	privAte reAdonly _BOM: string;

	constructor(tree: PieceTreeBAse, BOM: string) {
		this._pieces = [];
		this._tree = tree;
		this._BOM = BOM;
		this._index = 0;
		if (tree.root !== SENTINEL) {
			tree.iterAte(tree.root, node => {
				if (node !== SENTINEL) {
					this._pieces.push(node.piece);
				}
				return true;
			});
		}
	}

	reAd(): string | null {
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

interfAce CAcheEntry {
	node: TreeNode;
	nodeStArtOffset: number;
	nodeStArtLineNumber?: number;
}

clAss PieceTreeSeArchCAche {
	privAte reAdonly _limit: number;
	privAte _cAche: CAcheEntry[];

	constructor(limit: number) {
		this._limit = limit;
		this._cAche = [];
	}

	public get(offset: number): CAcheEntry | null {
		for (let i = this._cAche.length - 1; i >= 0; i--) {
			let nodePos = this._cAche[i];
			if (nodePos.nodeStArtOffset <= offset && nodePos.nodeStArtOffset + nodePos.node.piece.length >= offset) {
				return nodePos;
			}
		}
		return null;
	}

	public get2(lineNumber: number): { node: TreeNode, nodeStArtOffset: number, nodeStArtLineNumber: number } | null {
		for (let i = this._cAche.length - 1; i >= 0; i--) {
			let nodePos = this._cAche[i];
			if (nodePos.nodeStArtLineNumber && nodePos.nodeStArtLineNumber < lineNumber && nodePos.nodeStArtLineNumber + nodePos.node.piece.lineFeedCnt >= lineNumber) {
				return <{ node: TreeNode, nodeStArtOffset: number, nodeStArtLineNumber: number }>nodePos;
			}
		}
		return null;
	}

	public set(nodePosition: CAcheEntry) {
		if (this._cAche.length >= this._limit) {
			this._cAche.shift();
		}
		this._cAche.push(nodePosition);
	}

	public vAlidAte(offset: number) {
		let hAsInvAlidVAl = fAlse;
		let tmp: ArrAy<CAcheEntry | null> = this._cAche;
		for (let i = 0; i < tmp.length; i++) {
			let nodePos = tmp[i]!;
			if (nodePos.node.pArent === null || nodePos.nodeStArtOffset >= offset) {
				tmp[i] = null;
				hAsInvAlidVAl = true;
				continue;
			}
		}

		if (hAsInvAlidVAl) {
			let newArr: CAcheEntry[] = [];
			for (const entry of tmp) {
				if (entry !== null) {
					newArr.push(entry);
				}
			}

			this._cAche = newArr;
		}
	}
}

export clAss PieceTreeBAse {
	root!: TreeNode;
	protected _buffers!: StringBuffer[]; // 0 is chAnge buffer, others Are reAdonly originAl buffer.
	protected _lineCnt!: number;
	protected _length!: number;
	protected _EOL!: '\r\n' | '\n';
	protected _EOLLength!: number;
	protected _EOLNormAlized!: booleAn;
	privAte _lAstChAngeBufferPos!: BufferCursor;
	privAte _seArchCAche!: PieceTreeSeArchCAche;
	privAte _lAstVisitedLine!: { lineNumber: number; vAlue: string; };

	constructor(chunks: StringBuffer[], eol: '\r\n' | '\n', eolNormAlized: booleAn) {
		this.creAte(chunks, eol, eolNormAlized);
	}

	creAte(chunks: StringBuffer[], eol: '\r\n' | '\n', eolNormAlized: booleAn) {
		this._buffers = [
			new StringBuffer('', [0])
		];
		this._lAstChAngeBufferPos = { line: 0, column: 0 };
		this.root = SENTINEL;
		this._lineCnt = 1;
		this._length = 0;
		this._EOL = eol;
		this._EOLLength = eol.length;
		this._EOLNormAlized = eolNormAlized;

		let lAstNode: TreeNode | null = null;
		for (let i = 0, len = chunks.length; i < len; i++) {
			if (chunks[i].buffer.length > 0) {
				if (!chunks[i].lineStArts) {
					chunks[i].lineStArts = creAteLineStArtsFAst(chunks[i].buffer);
				}

				let piece = new Piece(
					i + 1,
					{ line: 0, column: 0 },
					{ line: chunks[i].lineStArts.length - 1, column: chunks[i].buffer.length - chunks[i].lineStArts[chunks[i].lineStArts.length - 1] },
					chunks[i].lineStArts.length - 1,
					chunks[i].buffer.length
				);
				this._buffers.push(chunks[i]);
				lAstNode = this.rbInsertRight(lAstNode, piece);
			}
		}

		this._seArchCAche = new PieceTreeSeArchCAche(1);
		this._lAstVisitedLine = { lineNumber: 0, vAlue: '' };
		this.computeBufferMetAdAtA();
	}

	normAlizeEOL(eol: '\r\n' | '\n') {
		let AverAgeBufferSize = AverAgeBufferSize;
		let min = AverAgeBufferSize - MAth.floor(AverAgeBufferSize / 3);
		let mAx = min * 2;

		let tempChunk = '';
		let tempChunkLen = 0;
		let chunks: StringBuffer[] = [];

		this.iterAte(this.root, node => {
			let str = this.getNodeContent(node);
			let len = str.length;
			if (tempChunkLen <= min || tempChunkLen + len < mAx) {
				tempChunk += str;
				tempChunkLen += len;
				return true;
			}

			// flush AnywAys
			let text = tempChunk.replAce(/\r\n|\r|\n/g, eol);
			chunks.push(new StringBuffer(text, creAteLineStArtsFAst(text)));
			tempChunk = str;
			tempChunkLen = len;
			return true;
		});

		if (tempChunkLen > 0) {
			let text = tempChunk.replAce(/\r\n|\r|\n/g, eol);
			chunks.push(new StringBuffer(text, creAteLineStArtsFAst(text)));
		}

		this.creAte(chunks, eol, true);
	}

	// #region Buffer API
	public getEOL(): '\r\n' | '\n' {
		return this._EOL;
	}

	public setEOL(newEOL: '\r\n' | '\n'): void {
		this._EOL = newEOL;
		this._EOLLength = this._EOL.length;
		this.normAlizeEOL(newEOL);
	}

	public creAteSnApshot(BOM: string): ITextSnApshot {
		return new PieceTreeSnApshot(this, BOM);
	}

	public equAl(other: PieceTreeBAse): booleAn {
		if (this.getLength() !== other.getLength()) {
			return fAlse;
		}
		if (this.getLineCount() !== other.getLineCount()) {
			return fAlse;
		}

		let offset = 0;
		let ret = this.iterAte(this.root, node => {
			if (node === SENTINEL) {
				return true;
			}
			let str = this.getNodeContent(node);
			let len = str.length;
			let stArtPosition = other.nodeAt(offset);
			let endPosition = other.nodeAt(offset + len);
			let vAl = other.getVAlueInRAnge2(stArtPosition, endPosition);

			return str === vAl;
		});

		return ret;
	}

	public getOffsetAt(lineNumber: number, column: number): number {
		let leftLen = 0; // inorder

		let x = this.root;

		while (x !== SENTINEL) {
			if (x.left !== SENTINEL && x.lf_left + 1 >= lineNumber) {
				x = x.left;
			} else if (x.lf_left + x.piece.lineFeedCnt + 1 >= lineNumber) {
				leftLen += x.size_left;
				// lineNumber >= 2
				let AccumuAltedVAlInCurrentIndex = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 2);
				return leftLen += AccumuAltedVAlInCurrentIndex + column - 1;
			} else {
				lineNumber -= x.lf_left + x.piece.lineFeedCnt;
				leftLen += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		return leftLen;
	}

	public getPositionAt(offset: number): Position {
		offset = MAth.floor(offset);
		offset = MAth.mAx(0, offset);

		let x = this.root;
		let lfCnt = 0;
		let originAlOffset = offset;

		while (x !== SENTINEL) {
			if (x.size_left !== 0 && x.size_left >= offset) {
				x = x.left;
			} else if (x.size_left + x.piece.length >= offset) {
				let out = this.getIndexOf(x, offset - x.size_left);

				lfCnt += x.lf_left + out.index;

				if (out.index === 0) {
					let lineStArtOffset = this.getOffsetAt(lfCnt + 1, 1);
					let column = originAlOffset - lineStArtOffset;
					return new Position(lfCnt + 1, column + 1);
				}

				return new Position(lfCnt + 1, out.remAinder + 1);
			} else {
				offset -= x.size_left + x.piece.length;
				lfCnt += x.lf_left + x.piece.lineFeedCnt;

				if (x.right === SENTINEL) {
					// lAst node
					let lineStArtOffset = this.getOffsetAt(lfCnt + 1, 1);
					let column = originAlOffset - offset - lineStArtOffset;
					return new Position(lfCnt + 1, column + 1);
				} else {
					x = x.right;
				}
			}
		}

		return new Position(1, 1);
	}

	public getVAlueInRAnge(rAnge: RAnge, eol?: string): string {
		if (rAnge.stArtLineNumber === rAnge.endLineNumber && rAnge.stArtColumn === rAnge.endColumn) {
			return '';
		}

		let stArtPosition = this.nodeAt2(rAnge.stArtLineNumber, rAnge.stArtColumn);
		let endPosition = this.nodeAt2(rAnge.endLineNumber, rAnge.endColumn);

		let vAlue = this.getVAlueInRAnge2(stArtPosition, endPosition);
		if (eol) {
			if (eol !== this._EOL || !this._EOLNormAlized) {
				return vAlue.replAce(/\r\n|\r|\n/g, eol);
			}

			if (eol === this.getEOL() && this._EOLNormAlized) {
				if (eol === '\r\n') {

				}
				return vAlue;
			}
			return vAlue.replAce(/\r\n|\r|\n/g, eol);
		}
		return vAlue;
	}

	public getVAlueInRAnge2(stArtPosition: NodePosition, endPosition: NodePosition): string {
		if (stArtPosition.node === endPosition.node) {
			let node = stArtPosition.node;
			let buffer = this._buffers[node.piece.bufferIndex].buffer;
			let stArtOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.stArt);
			return buffer.substring(stArtOffset + stArtPosition.remAinder, stArtOffset + endPosition.remAinder);
		}

		let x = stArtPosition.node;
		let buffer = this._buffers[x.piece.bufferIndex].buffer;
		let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);
		let ret = buffer.substring(stArtOffset + stArtPosition.remAinder, stArtOffset + x.piece.length);

		x = x.next();
		while (x !== SENTINEL) {
			let buffer = this._buffers[x.piece.bufferIndex].buffer;
			let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);

			if (x === endPosition.node) {
				ret += buffer.substring(stArtOffset, stArtOffset + endPosition.remAinder);
				breAk;
			} else {
				ret += buffer.substr(stArtOffset, x.piece.length);
			}

			x = x.next();
		}

		return ret;
	}

	public getLinesContent(): string[] {
		let lines: string[] = [];
		let linesLength = 0;
		let currentLine = '';
		let dAnglingCR = fAlse;

		this.iterAte(this.root, node => {
			if (node === SENTINEL) {
				return true;
			}

			const piece = node.piece;
			let pieceLength = piece.length;
			if (pieceLength === 0) {
				return true;
			}

			const buffer = this._buffers[piece.bufferIndex].buffer;
			const lineStArts = this._buffers[piece.bufferIndex].lineStArts;

			const pieceStArtLine = piece.stArt.line;
			const pieceEndLine = piece.end.line;
			let pieceStArtOffset = lineStArts[pieceStArtLine] + piece.stArt.column;

			if (dAnglingCR) {
				if (buffer.chArCodeAt(pieceStArtOffset) === ChArCode.LineFeed) {
					// pretend the \n wAs in the previous piece..
					pieceStArtOffset++;
					pieceLength--;
				}
				lines[linesLength++] = currentLine;
				currentLine = '';
				dAnglingCR = fAlse;
				if (pieceLength === 0) {
					return true;
				}
			}

			if (pieceStArtLine === pieceEndLine) {
				// this piece hAs no new lines
				if (!this._EOLNormAlized && buffer.chArCodeAt(pieceStArtOffset + pieceLength - 1) === ChArCode.CArriAgeReturn) {
					dAnglingCR = true;
					currentLine += buffer.substr(pieceStArtOffset, pieceLength - 1);
				} else {
					currentLine += buffer.substr(pieceStArtOffset, pieceLength);
				}
				return true;
			}

			// Add the text before the first line stArt in this piece
			currentLine += (
				this._EOLNormAlized
					? buffer.substring(pieceStArtOffset, MAth.mAx(pieceStArtOffset, lineStArts[pieceStArtLine + 1] - this._EOLLength))
					: buffer.substring(pieceStArtOffset, lineStArts[pieceStArtLine + 1]).replAce(/(\r\n|\r|\n)$/, '')
			);
			lines[linesLength++] = currentLine;

			for (let line = pieceStArtLine + 1; line < pieceEndLine; line++) {
				currentLine = (
					this._EOLNormAlized
						? buffer.substring(lineStArts[line], lineStArts[line + 1] - this._EOLLength)
						: buffer.substring(lineStArts[line], lineStArts[line + 1]).replAce(/(\r\n|\r|\n)$/, '')
				);
				lines[linesLength++] = currentLine;
			}

			if (!this._EOLNormAlized && buffer.chArCodeAt(lineStArts[pieceEndLine] + piece.end.column - 1) === ChArCode.CArriAgeReturn) {
				dAnglingCR = true;
				if (piece.end.column === 0) {
					// The lAst line ended with A \r, let's undo the push, it will be pushed by next iterAtion
					linesLength--;
				} else {
					currentLine = buffer.substr(lineStArts[pieceEndLine], piece.end.column - 1);
				}
			} else {
				currentLine = buffer.substr(lineStArts[pieceEndLine], piece.end.column);
			}

			return true;
		});

		if (dAnglingCR) {
			lines[linesLength++] = currentLine;
			currentLine = '';
		}

		lines[linesLength++] = currentLine;
		return lines;
	}

	public getLength(): number {
		return this._length;
	}

	public getLineCount(): number {
		return this._lineCnt;
	}

	public getLineContent(lineNumber: number): string {
		if (this._lAstVisitedLine.lineNumber === lineNumber) {
			return this._lAstVisitedLine.vAlue;
		}

		this._lAstVisitedLine.lineNumber = lineNumber;

		if (lineNumber === this._lineCnt) {
			this._lAstVisitedLine.vAlue = this.getLineRAwContent(lineNumber);
		} else if (this._EOLNormAlized) {
			this._lAstVisitedLine.vAlue = this.getLineRAwContent(lineNumber, this._EOLLength);
		} else {
			this._lAstVisitedLine.vAlue = this.getLineRAwContent(lineNumber).replAce(/(\r\n|\r|\n)$/, '');
		}

		return this._lAstVisitedLine.vAlue;
	}

	privAte _getChArCode(nodePos: NodePosition): number {
		if (nodePos.remAinder === nodePos.node.piece.length) {
			// the chAr we wAnt to fetch is At the heAd of next node.
			let mAtchingNode = nodePos.node.next();
			if (!mAtchingNode) {
				return 0;
			}

			let buffer = this._buffers[mAtchingNode.piece.bufferIndex];
			let stArtOffset = this.offsetInBuffer(mAtchingNode.piece.bufferIndex, mAtchingNode.piece.stArt);
			return buffer.buffer.chArCodeAt(stArtOffset);
		} else {
			let buffer = this._buffers[nodePos.node.piece.bufferIndex];
			let stArtOffset = this.offsetInBuffer(nodePos.node.piece.bufferIndex, nodePos.node.piece.stArt);
			let tArgetOffset = stArtOffset + nodePos.remAinder;

			return buffer.buffer.chArCodeAt(tArgetOffset);
		}
	}

	public getLineChArCode(lineNumber: number, index: number): number {
		let nodePos = this.nodeAt2(lineNumber, index + 1);
		return this._getChArCode(nodePos);
	}

	public getLineLength(lineNumber: number): number {
		if (lineNumber === this.getLineCount()) {
			let stArtOffset = this.getOffsetAt(lineNumber, 1);
			return this.getLength() - stArtOffset;
		}
		return this.getOffsetAt(lineNumber + 1, 1) - this.getOffsetAt(lineNumber, 1) - this._EOLLength;
	}

	public getChArCode(offset: number): number {
		let nodePos = this.nodeAt(offset);
		return this._getChArCode(nodePos);
	}

	public findMAtchesInNode(node: TreeNode, seArcher: SeArcher, stArtLineNumber: number, stArtColumn: number, stArtCursor: BufferCursor, endCursor: BufferCursor, seArchDAtA: SeArchDAtA, cAptureMAtches: booleAn, limitResultCount: number, resultLen: number, result: FindMAtch[]) {
		let buffer = this._buffers[node.piece.bufferIndex];
		let stArtOffsetInBuffer = this.offsetInBuffer(node.piece.bufferIndex, node.piece.stArt);
		let stArt = this.offsetInBuffer(node.piece.bufferIndex, stArtCursor);
		let end = this.offsetInBuffer(node.piece.bufferIndex, endCursor);

		let m: RegExpExecArrAy | null;
		// Reset regex to seArch from the beginning
		let ret: BufferCursor = { line: 0, column: 0 };
		let seArchText: string;
		let offsetInBuffer: (offset: number) => number;

		if (seArcher._wordSepArAtors) {
			seArchText = buffer.buffer.substring(stArt, end);
			offsetInBuffer = (offset: number) => offset + stArt;
			seArcher.reset(0);
		} else {
			seArchText = buffer.buffer;
			offsetInBuffer = (offset: number) => offset;
			seArcher.reset(stArt);
		}

		do {
			m = seArcher.next(seArchText);

			if (m) {
				if (offsetInBuffer(m.index) >= end) {
					return resultLen;
				}
				this.positionInBuffer(node, offsetInBuffer(m.index) - stArtOffsetInBuffer, ret);
				let lineFeedCnt = this.getLineFeedCnt(node.piece.bufferIndex, stArtCursor, ret);
				let retStArtColumn = ret.line === stArtCursor.line ? ret.column - stArtCursor.column + stArtColumn : ret.column + 1;
				let retEndColumn = retStArtColumn + m[0].length;
				result[resultLen++] = creAteFindMAtch(new RAnge(stArtLineNumber + lineFeedCnt, retStArtColumn, stArtLineNumber + lineFeedCnt, retEndColumn), m, cAptureMAtches);

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

	public findMAtchesLineByLine(seArchRAnge: RAnge, seArchDAtA: SeArchDAtA, cAptureMAtches: booleAn, limitResultCount: number): FindMAtch[] {
		const result: FindMAtch[] = [];
		let resultLen = 0;
		const seArcher = new SeArcher(seArchDAtA.wordSepArAtors, seArchDAtA.regex);

		let stArtPosition = this.nodeAt2(seArchRAnge.stArtLineNumber, seArchRAnge.stArtColumn);
		if (stArtPosition === null) {
			return [];
		}
		let endPosition = this.nodeAt2(seArchRAnge.endLineNumber, seArchRAnge.endColumn);
		if (endPosition === null) {
			return [];
		}
		let stArt = this.positionInBuffer(stArtPosition.node, stArtPosition.remAinder);
		let end = this.positionInBuffer(endPosition.node, endPosition.remAinder);

		if (stArtPosition.node === endPosition.node) {
			this.findMAtchesInNode(stArtPosition.node, seArcher, seArchRAnge.stArtLineNumber, seArchRAnge.stArtColumn, stArt, end, seArchDAtA, cAptureMAtches, limitResultCount, resultLen, result);
			return result;
		}

		let stArtLineNumber = seArchRAnge.stArtLineNumber;

		let currentNode = stArtPosition.node;
		while (currentNode !== endPosition.node) {
			let lineBreAkCnt = this.getLineFeedCnt(currentNode.piece.bufferIndex, stArt, currentNode.piece.end);

			if (lineBreAkCnt >= 1) {
				// lAst line breAk position
				let lineStArts = this._buffers[currentNode.piece.bufferIndex].lineStArts;
				let stArtOffsetInBuffer = this.offsetInBuffer(currentNode.piece.bufferIndex, currentNode.piece.stArt);
				let nextLineStArtOffset = lineStArts[stArt.line + lineBreAkCnt];
				let stArtColumn = stArtLineNumber === seArchRAnge.stArtLineNumber ? seArchRAnge.stArtColumn : 1;
				resultLen = this.findMAtchesInNode(currentNode, seArcher, stArtLineNumber, stArtColumn, stArt, this.positionInBuffer(currentNode, nextLineStArtOffset - stArtOffsetInBuffer), seArchDAtA, cAptureMAtches, limitResultCount, resultLen, result);

				if (resultLen >= limitResultCount) {
					return result;
				}

				stArtLineNumber += lineBreAkCnt;
			}

			let stArtColumn = stArtLineNumber === seArchRAnge.stArtLineNumber ? seArchRAnge.stArtColumn - 1 : 0;
			// seArch for the remAining content
			if (stArtLineNumber === seArchRAnge.endLineNumber) {
				const text = this.getLineContent(stArtLineNumber).substring(stArtColumn, seArchRAnge.endColumn - 1);
				resultLen = this._findMAtchesInLine(seArchDAtA, seArcher, text, seArchRAnge.endLineNumber, stArtColumn, resultLen, result, cAptureMAtches, limitResultCount);
				return result;
			}

			resultLen = this._findMAtchesInLine(seArchDAtA, seArcher, this.getLineContent(stArtLineNumber).substr(stArtColumn), stArtLineNumber, stArtColumn, resultLen, result, cAptureMAtches, limitResultCount);

			if (resultLen >= limitResultCount) {
				return result;
			}

			stArtLineNumber++;
			stArtPosition = this.nodeAt2(stArtLineNumber, 1);
			currentNode = stArtPosition.node;
			stArt = this.positionInBuffer(stArtPosition.node, stArtPosition.remAinder);
		}

		if (stArtLineNumber === seArchRAnge.endLineNumber) {
			let stArtColumn = stArtLineNumber === seArchRAnge.stArtLineNumber ? seArchRAnge.stArtColumn - 1 : 0;
			const text = this.getLineContent(stArtLineNumber).substring(stArtColumn, seArchRAnge.endColumn - 1);
			resultLen = this._findMAtchesInLine(seArchDAtA, seArcher, text, seArchRAnge.endLineNumber, stArtColumn, resultLen, result, cAptureMAtches, limitResultCount);
			return result;
		}

		let stArtColumn = stArtLineNumber === seArchRAnge.stArtLineNumber ? seArchRAnge.stArtColumn : 1;
		resultLen = this.findMAtchesInNode(endPosition.node, seArcher, stArtLineNumber, stArtColumn, stArt, end, seArchDAtA, cAptureMAtches, limitResultCount, resultLen, result);
		return result;
	}

	privAte _findMAtchesInLine(seArchDAtA: SeArchDAtA, seArcher: SeArcher, text: string, lineNumber: number, deltAOffset: number, resultLen: number, result: FindMAtch[], cAptureMAtches: booleAn, limitResultCount: number): number {
		const wordSepArAtors = seArchDAtA.wordSepArAtors;
		if (!cAptureMAtches && seArchDAtA.simpleSeArch) {
			const seArchString = seArchDAtA.simpleSeArch;
			const seArchStringLen = seArchString.length;
			const textLength = text.length;

			let lAstMAtchIndex = -seArchStringLen;
			while ((lAstMAtchIndex = text.indexOf(seArchString, lAstMAtchIndex + seArchStringLen)) !== -1) {
				if (!wordSepArAtors || isVAlidMAtch(wordSepArAtors, text, textLength, lAstMAtchIndex, seArchStringLen)) {
					result[resultLen++] = new FindMAtch(new RAnge(lineNumber, lAstMAtchIndex + 1 + deltAOffset, lineNumber, lAstMAtchIndex + 1 + seArchStringLen + deltAOffset), null);
					if (resultLen >= limitResultCount) {
						return resultLen;
					}
				}
			}
			return resultLen;
		}

		let m: RegExpExecArrAy | null;
		// Reset regex to seArch from the beginning
		seArcher.reset(0);
		do {
			m = seArcher.next(text);
			if (m) {
				result[resultLen++] = creAteFindMAtch(new RAnge(lineNumber, m.index + 1 + deltAOffset, lineNumber, m.index + 1 + m[0].length + deltAOffset), m, cAptureMAtches);
				if (resultLen >= limitResultCount) {
					return resultLen;
				}
			}
		} while (m);
		return resultLen;
	}

	// #endregion

	// #region Piece TAble
	public insert(offset: number, vAlue: string, eolNormAlized: booleAn = fAlse): void {
		this._EOLNormAlized = this._EOLNormAlized && eolNormAlized;
		this._lAstVisitedLine.lineNumber = 0;
		this._lAstVisitedLine.vAlue = '';

		if (this.root !== SENTINEL) {
			let { node, remAinder, nodeStArtOffset } = this.nodeAt(offset);
			let piece = node.piece;
			let bufferIndex = piece.bufferIndex;
			let insertPosInBuffer = this.positionInBuffer(node, remAinder);
			if (node.piece.bufferIndex === 0 &&
				piece.end.line === this._lAstChAngeBufferPos.line &&
				piece.end.column === this._lAstChAngeBufferPos.column &&
				(nodeStArtOffset + piece.length === offset) &&
				vAlue.length < AverAgeBufferSize
			) {
				// chAnged buffer
				this.AppendToNode(node, vAlue);
				this.computeBufferMetAdAtA();
				return;
			}

			if (nodeStArtOffset === offset) {
				this.insertContentToNodeLeft(vAlue, node);
				this._seArchCAche.vAlidAte(offset);
			} else if (nodeStArtOffset + node.piece.length > offset) {
				// we Are inserting into the middle of A node.
				let nodesToDel: TreeNode[] = [];
				let newRightPiece = new Piece(
					piece.bufferIndex,
					insertPosInBuffer,
					piece.end,
					this.getLineFeedCnt(piece.bufferIndex, insertPosInBuffer, piece.end),
					this.offsetInBuffer(bufferIndex, piece.end) - this.offsetInBuffer(bufferIndex, insertPosInBuffer)
				);

				if (this.shouldCheckCRLF() && this.endWithCR(vAlue)) {
					let heAdOfRight = this.nodeChArCodeAt(node, remAinder);

					if (heAdOfRight === 10 /** \n */) {
						let newStArt: BufferCursor = { line: newRightPiece.stArt.line + 1, column: 0 };
						newRightPiece = new Piece(
							newRightPiece.bufferIndex,
							newStArt,
							newRightPiece.end,
							this.getLineFeedCnt(newRightPiece.bufferIndex, newStArt, newRightPiece.end),
							newRightPiece.length - 1
						);

						vAlue += '\n';
					}
				}

				// reuse node for content before insertion point.
				if (this.shouldCheckCRLF() && this.stArtWithLF(vAlue)) {
					let tAilOfLeft = this.nodeChArCodeAt(node, remAinder - 1);
					if (tAilOfLeft === 13 /** \r */) {
						let previousPos = this.positionInBuffer(node, remAinder - 1);
						this.deleteNodeTAil(node, previousPos);
						vAlue = '\r' + vAlue;

						if (node.piece.length === 0) {
							nodesToDel.push(node);
						}
					} else {
						this.deleteNodeTAil(node, insertPosInBuffer);
					}
				} else {
					this.deleteNodeTAil(node, insertPosInBuffer);
				}

				let newPieces = this.creAteNewPieces(vAlue);
				if (newRightPiece.length > 0) {
					this.rbInsertRight(node, newRightPiece);
				}

				let tmpNode = node;
				for (let k = 0; k < newPieces.length; k++) {
					tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
				}
				this.deleteNodes(nodesToDel);
			} else {
				this.insertContentToNodeRight(vAlue, node);
			}
		} else {
			// insert new node
			let pieces = this.creAteNewPieces(vAlue);
			let node = this.rbInsertLeft(null, pieces[0]);

			for (let k = 1; k < pieces.length; k++) {
				node = this.rbInsertRight(node, pieces[k]);
			}
		}

		// todo, this is too brutAl. TotAl line feed count should be updAted the sAme wAy As lf_left.
		this.computeBufferMetAdAtA();
	}

	public delete(offset: number, cnt: number): void {
		this._lAstVisitedLine.lineNumber = 0;
		this._lAstVisitedLine.vAlue = '';

		if (cnt <= 0 || this.root === SENTINEL) {
			return;
		}

		let stArtPosition = this.nodeAt(offset);
		let endPosition = this.nodeAt(offset + cnt);
		let stArtNode = stArtPosition.node;
		let endNode = endPosition.node;

		if (stArtNode === endNode) {
			let stArtSplitPosInBuffer = this.positionInBuffer(stArtNode, stArtPosition.remAinder);
			let endSplitPosInBuffer = this.positionInBuffer(stArtNode, endPosition.remAinder);

			if (stArtPosition.nodeStArtOffset === offset) {
				if (cnt === stArtNode.piece.length) { // delete node
					let next = stArtNode.next();
					rbDelete(this, stArtNode);
					this.vAlidAteCRLFWithPrevNode(next);
					this.computeBufferMetAdAtA();
					return;
				}
				this.deleteNodeHeAd(stArtNode, endSplitPosInBuffer);
				this._seArchCAche.vAlidAte(offset);
				this.vAlidAteCRLFWithPrevNode(stArtNode);
				this.computeBufferMetAdAtA();
				return;
			}

			if (stArtPosition.nodeStArtOffset + stArtNode.piece.length === offset + cnt) {
				this.deleteNodeTAil(stArtNode, stArtSplitPosInBuffer);
				this.vAlidAteCRLFWithNextNode(stArtNode);
				this.computeBufferMetAdAtA();
				return;
			}

			// delete content in the middle, this node will be splitted to nodes
			this.shrinkNode(stArtNode, stArtSplitPosInBuffer, endSplitPosInBuffer);
			this.computeBufferMetAdAtA();
			return;
		}

		let nodesToDel: TreeNode[] = [];

		let stArtSplitPosInBuffer = this.positionInBuffer(stArtNode, stArtPosition.remAinder);
		this.deleteNodeTAil(stArtNode, stArtSplitPosInBuffer);
		this._seArchCAche.vAlidAte(offset);
		if (stArtNode.piece.length === 0) {
			nodesToDel.push(stArtNode);
		}

		// updAte lAst touched node
		let endSplitPosInBuffer = this.positionInBuffer(endNode, endPosition.remAinder);
		this.deleteNodeHeAd(endNode, endSplitPosInBuffer);
		if (endNode.piece.length === 0) {
			nodesToDel.push(endNode);
		}

		// delete nodes in between
		let secondNode = stArtNode.next();
		for (let node = secondNode; node !== SENTINEL && node !== endNode; node = node.next()) {
			nodesToDel.push(node);
		}

		let prev = stArtNode.piece.length === 0 ? stArtNode.prev() : stArtNode;
		this.deleteNodes(nodesToDel);
		this.vAlidAteCRLFWithNextNode(prev);
		this.computeBufferMetAdAtA();
	}

	privAte insertContentToNodeLeft(vAlue: string, node: TreeNode) {
		// we Are inserting content to the beginning of node
		let nodesToDel: TreeNode[] = [];
		if (this.shouldCheckCRLF() && this.endWithCR(vAlue) && this.stArtWithLF(node)) {
			// move `\n` to new node.

			let piece = node.piece;
			let newStArt: BufferCursor = { line: piece.stArt.line + 1, column: 0 };
			let nPiece = new Piece(
				piece.bufferIndex,
				newStArt,
				piece.end,
				this.getLineFeedCnt(piece.bufferIndex, newStArt, piece.end),
				piece.length - 1
			);

			node.piece = nPiece;

			vAlue += '\n';
			updAteTreeMetAdAtA(this, node, -1, -1);

			if (node.piece.length === 0) {
				nodesToDel.push(node);
			}
		}

		let newPieces = this.creAteNewPieces(vAlue);
		let newNode = this.rbInsertLeft(node, newPieces[newPieces.length - 1]);
		for (let k = newPieces.length - 2; k >= 0; k--) {
			newNode = this.rbInsertLeft(newNode, newPieces[k]);
		}
		this.vAlidAteCRLFWithPrevNode(newNode);
		this.deleteNodes(nodesToDel);
	}

	privAte insertContentToNodeRight(vAlue: string, node: TreeNode) {
		// we Are inserting to the right of this node.
		if (this.AdjustCArriAgeReturnFromNext(vAlue, node)) {
			// move \n to the new node.
			vAlue += '\n';
		}

		let newPieces = this.creAteNewPieces(vAlue);
		let newNode = this.rbInsertRight(node, newPieces[0]);
		let tmpNode = newNode;

		for (let k = 1; k < newPieces.length; k++) {
			tmpNode = this.rbInsertRight(tmpNode, newPieces[k]);
		}

		this.vAlidAteCRLFWithPrevNode(newNode);
	}

	privAte positionInBuffer(node: TreeNode, remAinder: number): BufferCursor;
	privAte positionInBuffer(node: TreeNode, remAinder: number, ret: BufferCursor): null;
	privAte positionInBuffer(node: TreeNode, remAinder: number, ret?: BufferCursor): BufferCursor | null {
		let piece = node.piece;
		let bufferIndex = node.piece.bufferIndex;
		let lineStArts = this._buffers[bufferIndex].lineStArts;

		let stArtOffset = lineStArts[piece.stArt.line] + piece.stArt.column;

		let offset = stArtOffset + remAinder;

		// binAry seArch offset between stArtOffset And endOffset
		let low = piece.stArt.line;
		let high = piece.end.line;

		let mid: number = 0;
		let midStop: number = 0;
		let midStArt: number = 0;

		while (low <= high) {
			mid = low + ((high - low) / 2) | 0;
			midStArt = lineStArts[mid];

			if (mid === high) {
				breAk;
			}

			midStop = lineStArts[mid + 1];

			if (offset < midStArt) {
				high = mid - 1;
			} else if (offset >= midStop) {
				low = mid + 1;
			} else {
				breAk;
			}
		}

		if (ret) {
			ret.line = mid;
			ret.column = offset - midStArt;
			return null;
		}

		return {
			line: mid,
			column: offset - midStArt
		};
	}

	privAte getLineFeedCnt(bufferIndex: number, stArt: BufferCursor, end: BufferCursor): number {
		// we don't need to worry About stArt: Abc\r|\n, or Abc|\r, or Abc|\n, or Abc|\r\n doesn't chAnge the fAct thAt, there is one line breAk After stArt.
		// now let's tAke cAre of end: Abc\r|\n, if end is in between \r And \n, we need to Add line feed count by 1
		if (end.column === 0) {
			return end.line - stArt.line;
		}

		let lineStArts = this._buffers[bufferIndex].lineStArts;
		if (end.line === lineStArts.length - 1) { // it meAns, there is no \n After end, otherwise, there will be one more lineStArt.
			return end.line - stArt.line;
		}

		let nextLineStArtOffset = lineStArts[end.line + 1];
		let endOffset = lineStArts[end.line] + end.column;
		if (nextLineStArtOffset > endOffset + 1) { // there Are more thAn 1 chArActer After end, which meAns it cAn't be \n
			return end.line - stArt.line;
		}
		// endOffset + 1 === nextLineStArtOffset
		// chArActer At endOffset is \n, so we check the chArActer before first
		// if chArActer At endOffset is \r, end.column is 0 And we cAn't get here.
		let previousChArOffset = endOffset - 1; // end.column > 0 so it's okAy.
		let buffer = this._buffers[bufferIndex].buffer;

		if (buffer.chArCodeAt(previousChArOffset) === 13) {
			return end.line - stArt.line + 1;
		} else {
			return end.line - stArt.line;
		}
	}

	privAte offsetInBuffer(bufferIndex: number, cursor: BufferCursor): number {
		let lineStArts = this._buffers[bufferIndex].lineStArts;
		return lineStArts[cursor.line] + cursor.column;
	}

	privAte deleteNodes(nodes: TreeNode[]): void {
		for (let i = 0; i < nodes.length; i++) {
			rbDelete(this, nodes[i]);
		}
	}

	privAte creAteNewPieces(text: string): Piece[] {
		if (text.length > AverAgeBufferSize) {
			// the content is lArge, operAtions like substring, chArCode becomes slow
			// so here we split it into smAller chunks, just like whAt we did for CR/LF normAlizAtion
			let newPieces: Piece[] = [];
			while (text.length > AverAgeBufferSize) {
				const lAstChAr = text.chArCodeAt(AverAgeBufferSize - 1);
				let splitText;
				if (lAstChAr === ChArCode.CArriAgeReturn || (lAstChAr >= 0xD800 && lAstChAr <= 0xDBFF)) {
					// lAst chArActer is \r or A high surrogAte => keep it bAck
					splitText = text.substring(0, AverAgeBufferSize - 1);
					text = text.substring(AverAgeBufferSize - 1);
				} else {
					splitText = text.substring(0, AverAgeBufferSize);
					text = text.substring(AverAgeBufferSize);
				}

				let lineStArts = creAteLineStArtsFAst(splitText);
				newPieces.push(new Piece(
					this._buffers.length, /* buffer index */
					{ line: 0, column: 0 },
					{ line: lineStArts.length - 1, column: splitText.length - lineStArts[lineStArts.length - 1] },
					lineStArts.length - 1,
					splitText.length
				));
				this._buffers.push(new StringBuffer(splitText, lineStArts));
			}

			let lineStArts = creAteLineStArtsFAst(text);
			newPieces.push(new Piece(
				this._buffers.length, /* buffer index */
				{ line: 0, column: 0 },
				{ line: lineStArts.length - 1, column: text.length - lineStArts[lineStArts.length - 1] },
				lineStArts.length - 1,
				text.length
			));
			this._buffers.push(new StringBuffer(text, lineStArts));

			return newPieces;
		}

		let stArtOffset = this._buffers[0].buffer.length;
		const lineStArts = creAteLineStArtsFAst(text, fAlse);

		let stArt = this._lAstChAngeBufferPos;
		if (this._buffers[0].lineStArts[this._buffers[0].lineStArts.length - 1] === stArtOffset
			&& stArtOffset !== 0
			&& this.stArtWithLF(text)
			&& this.endWithCR(this._buffers[0].buffer) // todo, we cAn check this._lAstChAngeBufferPos's column As it's the lAst one
		) {
			this._lAstChAngeBufferPos = { line: this._lAstChAngeBufferPos.line, column: this._lAstChAngeBufferPos.column + 1 };
			stArt = this._lAstChAngeBufferPos;

			for (let i = 0; i < lineStArts.length; i++) {
				lineStArts[i] += stArtOffset + 1;
			}

			this._buffers[0].lineStArts = (<number[]>this._buffers[0].lineStArts).concAt(<number[]>lineStArts.slice(1));
			this._buffers[0].buffer += '_' + text;
			stArtOffset += 1;
		} else {
			if (stArtOffset !== 0) {
				for (let i = 0; i < lineStArts.length; i++) {
					lineStArts[i] += stArtOffset;
				}
			}
			this._buffers[0].lineStArts = (<number[]>this._buffers[0].lineStArts).concAt(<number[]>lineStArts.slice(1));
			this._buffers[0].buffer += text;
		}

		const endOffset = this._buffers[0].buffer.length;
		let endIndex = this._buffers[0].lineStArts.length - 1;
		let endColumn = endOffset - this._buffers[0].lineStArts[endIndex];
		let endPos = { line: endIndex, column: endColumn };
		let newPiece = new Piece(
			0, /** todo@peng */
			stArt,
			endPos,
			this.getLineFeedCnt(0, stArt, endPos),
			endOffset - stArtOffset
		);
		this._lAstChAngeBufferPos = endPos;
		return [newPiece];
	}

	public getLinesRAwContent(): string {
		return this.getContentOfSubTree(this.root);
	}

	public getLineRAwContent(lineNumber: number, endOffset: number = 0): string {
		let x = this.root;

		let ret = '';
		let cAche = this._seArchCAche.get2(lineNumber);
		if (cAche) {
			x = cAche.node;
			let prevAccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - cAche.nodeStArtLineNumber - 1);
			let buffer = this._buffers[x.piece.bufferIndex].buffer;
			let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);
			if (cAche.nodeStArtLineNumber + x.piece.lineFeedCnt === lineNumber) {
				ret = buffer.substring(stArtOffset + prevAccumulAtedVAlue, stArtOffset + x.piece.length);
			} else {
				let AccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - cAche.nodeStArtLineNumber);
				return buffer.substring(stArtOffset + prevAccumulAtedVAlue, stArtOffset + AccumulAtedVAlue - endOffset);
			}
		} else {
			let nodeStArtOffset = 0;
			const originAlLineNumber = lineNumber;
			while (x !== SENTINEL) {
				if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
					x = x.left;
				} else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
					let prevAccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 2);
					let AccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 1);
					let buffer = this._buffers[x.piece.bufferIndex].buffer;
					let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);
					nodeStArtOffset += x.size_left;
					this._seArchCAche.set({
						node: x,
						nodeStArtOffset,
						nodeStArtLineNumber: originAlLineNumber - (lineNumber - 1 - x.lf_left)
					});

					return buffer.substring(stArtOffset + prevAccumulAtedVAlue, stArtOffset + AccumulAtedVAlue - endOffset);
				} else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
					let prevAccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 2);
					let buffer = this._buffers[x.piece.bufferIndex].buffer;
					let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);

					ret = buffer.substring(stArtOffset + prevAccumulAtedVAlue, stArtOffset + x.piece.length);
					breAk;
				} else {
					lineNumber -= x.lf_left + x.piece.lineFeedCnt;
					nodeStArtOffset += x.size_left + x.piece.length;
					x = x.right;
				}
			}
		}

		// seArch in order, to find the node contAins end column
		x = x.next();
		while (x !== SENTINEL) {
			let buffer = this._buffers[x.piece.bufferIndex].buffer;

			if (x.piece.lineFeedCnt > 0) {
				let AccumulAtedVAlue = this.getAccumulAtedVAlue(x, 0);
				let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);

				ret += buffer.substring(stArtOffset, stArtOffset + AccumulAtedVAlue - endOffset);
				return ret;
			} else {
				let stArtOffset = this.offsetInBuffer(x.piece.bufferIndex, x.piece.stArt);
				ret += buffer.substr(stArtOffset, x.piece.length);
			}

			x = x.next();
		}

		return ret;
	}

	privAte computeBufferMetAdAtA() {
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
		this._seArchCAche.vAlidAte(this._length);
	}

	// #region node operAtions
	privAte getIndexOf(node: TreeNode, AccumulAtedVAlue: number): { index: number, remAinder: number } {
		let piece = node.piece;
		let pos = this.positionInBuffer(node, AccumulAtedVAlue);
		let lineCnt = pos.line - piece.stArt.line;

		if (this.offsetInBuffer(piece.bufferIndex, piece.end) - this.offsetInBuffer(piece.bufferIndex, piece.stArt) === AccumulAtedVAlue) {
			// we Are checking the end of this node, so A CRLF check is necessAry.
			let reAlLineCnt = this.getLineFeedCnt(node.piece.bufferIndex, piece.stArt, pos);
			if (reAlLineCnt !== lineCnt) {
				// AhA yes, CRLF
				return { index: reAlLineCnt, remAinder: 0 };
			}
		}

		return { index: lineCnt, remAinder: pos.column };
	}

	privAte getAccumulAtedVAlue(node: TreeNode, index: number) {
		if (index < 0) {
			return 0;
		}
		let piece = node.piece;
		let lineStArts = this._buffers[piece.bufferIndex].lineStArts;
		let expectedLineStArtIndex = piece.stArt.line + index + 1;
		if (expectedLineStArtIndex > piece.end.line) {
			return lineStArts[piece.end.line] + piece.end.column - lineStArts[piece.stArt.line] - piece.stArt.column;
		} else {
			return lineStArts[expectedLineStArtIndex] - lineStArts[piece.stArt.line] - piece.stArt.column;
		}
	}

	privAte deleteNodeTAil(node: TreeNode, pos: BufferCursor) {
		const piece = node.piece;
		const originAlLFCnt = piece.lineFeedCnt;
		const originAlEndOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);

		const newEnd = pos;
		const newEndOffset = this.offsetInBuffer(piece.bufferIndex, newEnd);
		const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.stArt, newEnd);

		const lf_deltA = newLineFeedCnt - originAlLFCnt;
		const size_deltA = newEndOffset - originAlEndOffset;
		const newLength = piece.length + size_deltA;

		node.piece = new Piece(
			piece.bufferIndex,
			piece.stArt,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		updAteTreeMetAdAtA(this, node, size_deltA, lf_deltA);
	}

	privAte deleteNodeHeAd(node: TreeNode, pos: BufferCursor) {
		const piece = node.piece;
		const originAlLFCnt = piece.lineFeedCnt;
		const originAlStArtOffset = this.offsetInBuffer(piece.bufferIndex, piece.stArt);

		const newStArt = pos;
		const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStArt, piece.end);
		const newStArtOffset = this.offsetInBuffer(piece.bufferIndex, newStArt);
		const lf_deltA = newLineFeedCnt - originAlLFCnt;
		const size_deltA = originAlStArtOffset - newStArtOffset;
		const newLength = piece.length + size_deltA;
		node.piece = new Piece(
			piece.bufferIndex,
			newStArt,
			piece.end,
			newLineFeedCnt,
			newLength
		);

		updAteTreeMetAdAtA(this, node, size_deltA, lf_deltA);
	}

	privAte shrinkNode(node: TreeNode, stArt: BufferCursor, end: BufferCursor) {
		const piece = node.piece;
		const originAlStArtPos = piece.stArt;
		const originAlEndPos = piece.end;

		// old piece, originAlStArtPos, stArt
		const oldLength = piece.length;
		const oldLFCnt = piece.lineFeedCnt;
		const newEnd = stArt;
		const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, piece.stArt, newEnd);
		const newLength = this.offsetInBuffer(piece.bufferIndex, stArt) - this.offsetInBuffer(piece.bufferIndex, originAlStArtPos);

		node.piece = new Piece(
			piece.bufferIndex,
			piece.stArt,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		updAteTreeMetAdAtA(this, node, newLength - oldLength, newLineFeedCnt - oldLFCnt);

		// new right piece, end, originAlEndPos
		let newPiece = new Piece(
			piece.bufferIndex,
			end,
			originAlEndPos,
			this.getLineFeedCnt(piece.bufferIndex, end, originAlEndPos),
			this.offsetInBuffer(piece.bufferIndex, originAlEndPos) - this.offsetInBuffer(piece.bufferIndex, end)
		);

		let newNode = this.rbInsertRight(node, newPiece);
		this.vAlidAteCRLFWithPrevNode(newNode);
	}

	privAte AppendToNode(node: TreeNode, vAlue: string): void {
		if (this.AdjustCArriAgeReturnFromNext(vAlue, node)) {
			vAlue += '\n';
		}

		const hitCRLF = this.shouldCheckCRLF() && this.stArtWithLF(vAlue) && this.endWithCR(node);
		const stArtOffset = this._buffers[0].buffer.length;
		this._buffers[0].buffer += vAlue;
		const lineStArts = creAteLineStArtsFAst(vAlue, fAlse);
		for (let i = 0; i < lineStArts.length; i++) {
			lineStArts[i] += stArtOffset;
		}
		if (hitCRLF) {
			let prevStArtOffset = this._buffers[0].lineStArts[this._buffers[0].lineStArts.length - 2];
			(<number[]>this._buffers[0].lineStArts).pop();
			// _lAstChAngeBufferPos is AlreAdy wrong
			this._lAstChAngeBufferPos = { line: this._lAstChAngeBufferPos.line - 1, column: stArtOffset - prevStArtOffset };
		}

		this._buffers[0].lineStArts = (<number[]>this._buffers[0].lineStArts).concAt(<number[]>lineStArts.slice(1));
		const endIndex = this._buffers[0].lineStArts.length - 1;
		const endColumn = this._buffers[0].buffer.length - this._buffers[0].lineStArts[endIndex];
		const newEnd = { line: endIndex, column: endColumn };
		const newLength = node.piece.length + vAlue.length;
		const oldLineFeedCnt = node.piece.lineFeedCnt;
		const newLineFeedCnt = this.getLineFeedCnt(0, node.piece.stArt, newEnd);
		const lf_deltA = newLineFeedCnt - oldLineFeedCnt;

		node.piece = new Piece(
			node.piece.bufferIndex,
			node.piece.stArt,
			newEnd,
			newLineFeedCnt,
			newLength
		);

		this._lAstChAngeBufferPos = newEnd;
		updAteTreeMetAdAtA(this, node, vAlue.length, lf_deltA);
	}

	privAte nodeAt(offset: number): NodePosition {
		let x = this.root;
		let cAche = this._seArchCAche.get(offset);
		if (cAche) {
			return {
				node: cAche.node,
				nodeStArtOffset: cAche.nodeStArtOffset,
				remAinder: offset - cAche.nodeStArtOffset
			};
		}

		let nodeStArtOffset = 0;

		while (x !== SENTINEL) {
			if (x.size_left > offset) {
				x = x.left;
			} else if (x.size_left + x.piece.length >= offset) {
				nodeStArtOffset += x.size_left;
				let ret = {
					node: x,
					remAinder: offset - x.size_left,
					nodeStArtOffset
				};
				this._seArchCAche.set(ret);
				return ret;
			} else {
				offset -= x.size_left + x.piece.length;
				nodeStArtOffset += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		return null!;
	}

	privAte nodeAt2(lineNumber: number, column: number): NodePosition {
		let x = this.root;
		let nodeStArtOffset = 0;

		while (x !== SENTINEL) {
			if (x.left !== SENTINEL && x.lf_left >= lineNumber - 1) {
				x = x.left;
			} else if (x.lf_left + x.piece.lineFeedCnt > lineNumber - 1) {
				let prevAccumuAltedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 2);
				let AccumulAtedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 1);
				nodeStArtOffset += x.size_left;

				return {
					node: x,
					remAinder: MAth.min(prevAccumuAltedVAlue + column - 1, AccumulAtedVAlue),
					nodeStArtOffset
				};
			} else if (x.lf_left + x.piece.lineFeedCnt === lineNumber - 1) {
				let prevAccumuAltedVAlue = this.getAccumulAtedVAlue(x, lineNumber - x.lf_left - 2);
				if (prevAccumuAltedVAlue + column - 1 <= x.piece.length) {
					return {
						node: x,
						remAinder: prevAccumuAltedVAlue + column - 1,
						nodeStArtOffset
					};
				} else {
					column -= x.piece.length - prevAccumuAltedVAlue;
					breAk;
				}
			} else {
				lineNumber -= x.lf_left + x.piece.lineFeedCnt;
				nodeStArtOffset += x.size_left + x.piece.length;
				x = x.right;
			}
		}

		// seArch in order, to find the node contAins position.column
		x = x.next();
		while (x !== SENTINEL) {

			if (x.piece.lineFeedCnt > 0) {
				let AccumulAtedVAlue = this.getAccumulAtedVAlue(x, 0);
				let nodeStArtOffset = this.offsetOfNode(x);
				return {
					node: x,
					remAinder: MAth.min(column - 1, AccumulAtedVAlue),
					nodeStArtOffset
				};
			} else {
				if (x.piece.length >= column - 1) {
					let nodeStArtOffset = this.offsetOfNode(x);
					return {
						node: x,
						remAinder: column - 1,
						nodeStArtOffset
					};
				} else {
					column -= x.piece.length;
				}
			}

			x = x.next();
		}

		return null!;
	}

	privAte nodeChArCodeAt(node: TreeNode, offset: number): number {
		if (node.piece.lineFeedCnt < 1) {
			return -1;
		}
		let buffer = this._buffers[node.piece.bufferIndex];
		let newOffset = this.offsetInBuffer(node.piece.bufferIndex, node.piece.stArt) + offset;
		return buffer.buffer.chArCodeAt(newOffset);
	}

	privAte offsetOfNode(node: TreeNode): number {
		if (!node) {
			return 0;
		}
		let pos = node.size_left;
		while (node !== this.root) {
			if (node.pArent.right === node) {
				pos += node.pArent.size_left + node.pArent.piece.length;
			}

			node = node.pArent;
		}

		return pos;
	}

	// #endregion

	// #region CRLF
	privAte shouldCheckCRLF() {
		return !(this._EOLNormAlized && this._EOL === '\n');
	}

	privAte stArtWithLF(vAl: string | TreeNode): booleAn {
		if (typeof vAl === 'string') {
			return vAl.chArCodeAt(0) === 10;
		}

		if (vAl === SENTINEL || vAl.piece.lineFeedCnt === 0) {
			return fAlse;
		}

		let piece = vAl.piece;
		let lineStArts = this._buffers[piece.bufferIndex].lineStArts;
		let line = piece.stArt.line;
		let stArtOffset = lineStArts[line] + piece.stArt.column;
		if (line === lineStArts.length - 1) {
			// lAst line, so there is no line feed At the end of this line
			return fAlse;
		}
		let nextLineOffset = lineStArts[line + 1];
		if (nextLineOffset > stArtOffset + 1) {
			return fAlse;
		}
		return this._buffers[piece.bufferIndex].buffer.chArCodeAt(stArtOffset) === 10;
	}

	privAte endWithCR(vAl: string | TreeNode): booleAn {
		if (typeof vAl === 'string') {
			return vAl.chArCodeAt(vAl.length - 1) === 13;
		}

		if (vAl === SENTINEL || vAl.piece.lineFeedCnt === 0) {
			return fAlse;
		}

		return this.nodeChArCodeAt(vAl, vAl.piece.length - 1) === 13;
	}

	privAte vAlidAteCRLFWithPrevNode(nextNode: TreeNode) {
		if (this.shouldCheckCRLF() && this.stArtWithLF(nextNode)) {
			let node = nextNode.prev();
			if (this.endWithCR(node)) {
				this.fixCRLF(node, nextNode);
			}
		}
	}

	privAte vAlidAteCRLFWithNextNode(node: TreeNode) {
		if (this.shouldCheckCRLF() && this.endWithCR(node)) {
			let nextNode = node.next();
			if (this.stArtWithLF(nextNode)) {
				this.fixCRLF(node, nextNode);
			}
		}
	}

	privAte fixCRLF(prev: TreeNode, next: TreeNode) {
		let nodesToDel: TreeNode[] = [];
		// updAte node
		let lineStArts = this._buffers[prev.piece.bufferIndex].lineStArts;
		let newEnd: BufferCursor;
		if (prev.piece.end.column === 0) {
			// it meAns, lAst line ends with \r, not \r\n
			newEnd = { line: prev.piece.end.line - 1, column: lineStArts[prev.piece.end.line] - lineStArts[prev.piece.end.line - 1] - 1 };
		} else {
			// \r\n
			newEnd = { line: prev.piece.end.line, column: prev.piece.end.column - 1 };
		}

		const prevNewLength = prev.piece.length - 1;
		const prevNewLFCnt = prev.piece.lineFeedCnt - 1;
		prev.piece = new Piece(
			prev.piece.bufferIndex,
			prev.piece.stArt,
			newEnd,
			prevNewLFCnt,
			prevNewLength
		);

		updAteTreeMetAdAtA(this, prev, - 1, -1);
		if (prev.piece.length === 0) {
			nodesToDel.push(prev);
		}

		// updAte nextNode
		let newStArt: BufferCursor = { line: next.piece.stArt.line + 1, column: 0 };
		const newLength = next.piece.length - 1;
		const newLineFeedCnt = this.getLineFeedCnt(next.piece.bufferIndex, newStArt, next.piece.end);
		next.piece = new Piece(
			next.piece.bufferIndex,
			newStArt,
			next.piece.end,
			newLineFeedCnt,
			newLength
		);

		updAteTreeMetAdAtA(this, next, - 1, -1);
		if (next.piece.length === 0) {
			nodesToDel.push(next);
		}

		// creAte new piece which contAins \r\n
		let pieces = this.creAteNewPieces('\r\n');
		this.rbInsertRight(prev, pieces[0]);
		// delete empty nodes

		for (let i = 0; i < nodesToDel.length; i++) {
			rbDelete(this, nodesToDel[i]);
		}
	}

	privAte AdjustCArriAgeReturnFromNext(vAlue: string, node: TreeNode): booleAn {
		if (this.shouldCheckCRLF() && this.endWithCR(vAlue)) {
			let nextNode = node.next();
			if (this.stArtWithLF(nextNode)) {
				// move `\n` forwArd
				vAlue += '\n';

				if (nextNode.piece.length === 1) {
					rbDelete(this, nextNode);
				} else {

					const piece = nextNode.piece;
					const newStArt: BufferCursor = { line: piece.stArt.line + 1, column: 0 };
					const newLength = piece.length - 1;
					const newLineFeedCnt = this.getLineFeedCnt(piece.bufferIndex, newStArt, piece.end);
					nextNode.piece = new Piece(
						piece.bufferIndex,
						newStArt,
						piece.end,
						newLineFeedCnt,
						newLength
					);

					updAteTreeMetAdAtA(this, nextNode, -1, -1);
				}
				return true;
			}
		}

		return fAlse;
	}

	// #endregion

	// #endregion

	// #region Tree operAtions
	iterAte(node: TreeNode, cAllbAck: (node: TreeNode) => booleAn): booleAn {
		if (node === SENTINEL) {
			return cAllbAck(SENTINEL);
		}

		let leftRet = this.iterAte(node.left, cAllbAck);
		if (!leftRet) {
			return leftRet;
		}

		return cAllbAck(node) && this.iterAte(node.right, cAllbAck);
	}

	privAte getNodeContent(node: TreeNode) {
		if (node === SENTINEL) {
			return '';
		}
		let buffer = this._buffers[node.piece.bufferIndex];
		let currentContent;
		let piece = node.piece;
		let stArtOffset = this.offsetInBuffer(piece.bufferIndex, piece.stArt);
		let endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
		currentContent = buffer.buffer.substring(stArtOffset, endOffset);
		return currentContent;
	}

	getPieceContent(piece: Piece) {
		let buffer = this._buffers[piece.bufferIndex];
		let stArtOffset = this.offsetInBuffer(piece.bufferIndex, piece.stArt);
		let endOffset = this.offsetInBuffer(piece.bufferIndex, piece.end);
		let currentContent = buffer.buffer.substring(stArtOffset, endOffset);
		return currentContent;
	}

	/**
	 *      node              node
	 *     /  \              /  \
	 *    A   b    <----   A    b
	 *                         /
	 *                        z
	 */
	privAte rbInsertRight(node: TreeNode | null, p: Piece): TreeNode {
		let z = new TreeNode(p, NodeColor.Red);
		z.left = SENTINEL;
		z.right = SENTINEL;
		z.pArent = SENTINEL;
		z.size_left = 0;
		z.lf_left = 0;

		let x = this.root;
		if (x === SENTINEL) {
			this.root = z;
			z.color = NodeColor.BlAck;
		} else if (node!.right === SENTINEL) {
			node!.right = z;
			z.pArent = node!;
		} else {
			let nextNode = leftest(node!.right);
			nextNode.left = z;
			z.pArent = nextNode;
		}

		fixInsert(this, z);
		return z;
	}

	/**
	 *      node              node
	 *     /  \              /  \
	 *    A   b     ---->   A    b
	 *                       \
	 *                        z
	 */
	privAte rbInsertLeft(node: TreeNode | null, p: Piece): TreeNode {
		let z = new TreeNode(p, NodeColor.Red);
		z.left = SENTINEL;
		z.right = SENTINEL;
		z.pArent = SENTINEL;
		z.size_left = 0;
		z.lf_left = 0;

		if (this.root === SENTINEL) {
			this.root = z;
			z.color = NodeColor.BlAck;
		} else if (node!.left === SENTINEL) {
			node!.left = z;
			z.pArent = node!;
		} else {
			let prevNode = righttest(node!.left); // A
			prevNode.right = z;
			z.pArent = prevNode;
		}

		fixInsert(this, z);
		return z;
	}

	privAte getContentOfSubTree(node: TreeNode): string {
		let str = '';

		this.iterAte(node, node => {
			str += this.getNodeContent(node);
			return true;
		});

		return str;
	}
	// #endregion
}
