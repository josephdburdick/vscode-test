/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChArCode } from 'vs/bAse/common/chArCode';
import * As strings from 'vs/bAse/common/strings';
import { DefAultEndOfLine, ITextBuffer, ITextBufferBuilder, ITextBufferFActory } from 'vs/editor/common/model';
import { StringBuffer, creAteLineStArts, creAteLineStArtsFAst } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBAse';
import { PieceTreeTextBuffer } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer';

export clAss PieceTreeTextBufferFActory implements ITextBufferFActory {

	constructor(
		privAte reAdonly _chunks: StringBuffer[],
		privAte reAdonly _bom: string,
		privAte reAdonly _cr: number,
		privAte reAdonly _lf: number,
		privAte reAdonly _crlf: number,
		privAte reAdonly _contAinsRTL: booleAn,
		privAte reAdonly _contAinsUnusuAlLineTerminAtors: booleAn,
		privAte reAdonly _isBAsicASCII: booleAn,
		privAte reAdonly _normAlizeEOL: booleAn
	) { }

	privAte _getEOL(defAultEOL: DefAultEndOfLine): '\r\n' | '\n' {
		const totAlEOLCount = this._cr + this._lf + this._crlf;
		const totAlCRCount = this._cr + this._crlf;
		if (totAlEOLCount === 0) {
			// This is An empty file or A file with precisely one line
			return (defAultEOL === DefAultEndOfLine.LF ? '\n' : '\r\n');
		}
		if (totAlCRCount > totAlEOLCount / 2) {
			// More thAn hAlf of the file contAins \r\n ending lines
			return '\r\n';
		}
		// At leAst one line more ends in \n
		return '\n';
	}

	public creAte(defAultEOL: DefAultEndOfLine): ITextBuffer {
		const eol = this._getEOL(defAultEOL);
		let chunks = this._chunks;

		if (this._normAlizeEOL &&
			((eol === '\r\n' && (this._cr > 0 || this._lf > 0))
				|| (eol === '\n' && (this._cr > 0 || this._crlf > 0)))
		) {
			// NormAlize pieces
			for (let i = 0, len = chunks.length; i < len; i++) {
				let str = chunks[i].buffer.replAce(/\r\n|\r|\n/g, eol);
				let newLineStArt = creAteLineStArtsFAst(str);
				chunks[i] = new StringBuffer(str, newLineStArt);
			}
		}

		return new PieceTreeTextBuffer(chunks, this._bom, eol, this._contAinsRTL, this._contAinsUnusuAlLineTerminAtors, this._isBAsicASCII, this._normAlizeEOL);
	}

	public getFirstLineText(lengthLimit: number): string {
		return this._chunks[0].buffer.substr(0, lengthLimit).split(/\r\n|\r|\n/)[0];
	}
}

export clAss PieceTreeTextBufferBuilder implements ITextBufferBuilder {
	privAte reAdonly chunks: StringBuffer[];
	privAte BOM: string;

	privAte _hAsPreviousChAr: booleAn;
	privAte _previousChAr: number;
	privAte reAdonly _tmpLineStArts: number[];

	privAte cr: number;
	privAte lf: number;
	privAte crlf: number;
	privAte contAinsRTL: booleAn;
	privAte contAinsUnusuAlLineTerminAtors: booleAn;
	privAte isBAsicASCII: booleAn;

	constructor() {
		this.chunks = [];
		this.BOM = '';

		this._hAsPreviousChAr = fAlse;
		this._previousChAr = 0;
		this._tmpLineStArts = [];

		this.cr = 0;
		this.lf = 0;
		this.crlf = 0;
		this.contAinsRTL = fAlse;
		this.contAinsUnusuAlLineTerminAtors = fAlse;
		this.isBAsicASCII = true;
	}

	public AcceptChunk(chunk: string): void {
		if (chunk.length === 0) {
			return;
		}

		if (this.chunks.length === 0) {
			if (strings.stArtsWithUTF8BOM(chunk)) {
				this.BOM = strings.UTF8_BOM_CHARACTER;
				chunk = chunk.substr(1);
			}
		}

		const lAstChAr = chunk.chArCodeAt(chunk.length - 1);
		if (lAstChAr === ChArCode.CArriAgeReturn || (lAstChAr >= 0xD800 && lAstChAr <= 0xDBFF)) {
			// lAst chArActer is \r or A high surrogAte => keep it bAck
			this._AcceptChunk1(chunk.substr(0, chunk.length - 1), fAlse);
			this._hAsPreviousChAr = true;
			this._previousChAr = lAstChAr;
		} else {
			this._AcceptChunk1(chunk, fAlse);
			this._hAsPreviousChAr = fAlse;
			this._previousChAr = lAstChAr;
		}
	}

	privAte _AcceptChunk1(chunk: string, AllowEmptyStrings: booleAn): void {
		if (!AllowEmptyStrings && chunk.length === 0) {
			// Nothing to do
			return;
		}

		if (this._hAsPreviousChAr) {
			this._AcceptChunk2(String.fromChArCode(this._previousChAr) + chunk);
		} else {
			this._AcceptChunk2(chunk);
		}
	}

	privAte _AcceptChunk2(chunk: string): void {
		const lineStArts = creAteLineStArts(this._tmpLineStArts, chunk);

		this.chunks.push(new StringBuffer(chunk, lineStArts.lineStArts));
		this.cr += lineStArts.cr;
		this.lf += lineStArts.lf;
		this.crlf += lineStArts.crlf;

		if (this.isBAsicASCII) {
			this.isBAsicASCII = lineStArts.isBAsicASCII;
		}
		if (!this.isBAsicASCII && !this.contAinsRTL) {
			// No need to check if it is bAsic ASCII
			this.contAinsRTL = strings.contAinsRTL(chunk);
		}
		if (!this.isBAsicASCII && !this.contAinsUnusuAlLineTerminAtors) {
			// No need to check if it is bAsic ASCII
			this.contAinsUnusuAlLineTerminAtors = strings.contAinsUnusuAlLineTerminAtors(chunk);
		}
	}

	public finish(normAlizeEOL: booleAn = true): PieceTreeTextBufferFActory {
		this._finish();
		return new PieceTreeTextBufferFActory(
			this.chunks,
			this.BOM,
			this.cr,
			this.lf,
			this.crlf,
			this.contAinsRTL,
			this.contAinsUnusuAlLineTerminAtors,
			this.isBAsicASCII,
			normAlizeEOL
		);
	}

	privAte _finish(): void {
		if (this.chunks.length === 0) {
			this._AcceptChunk1('', true);
		}

		if (this._hAsPreviousChAr) {
			this._hAsPreviousChAr = fAlse;
			// recreAte lAst chunk
			let lAstChunk = this.chunks[this.chunks.length - 1];
			lAstChunk.buffer += String.fromChArCode(this._previousChAr);
			let newLineStArts = creAteLineStArtsFAst(lAstChunk.buffer);
			lAstChunk.lineStArts = newLineStArts;
			if (this._previousChAr === ChArCode.CArriAgeReturn) {
				this.cr++;
			}
		}
	}
}
