/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import * as strings from 'vs/Base/common/strings';
import { DefaultEndOfLine, ITextBuffer, ITextBufferBuilder, ITextBufferFactory } from 'vs/editor/common/model';
import { StringBuffer, createLineStarts, createLineStartsFast } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeBase';
import { PieceTreeTextBuffer } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBuffer';

export class PieceTreeTextBufferFactory implements ITextBufferFactory {

	constructor(
		private readonly _chunks: StringBuffer[],
		private readonly _Bom: string,
		private readonly _cr: numBer,
		private readonly _lf: numBer,
		private readonly _crlf: numBer,
		private readonly _containsRTL: Boolean,
		private readonly _containsUnusualLineTerminators: Boolean,
		private readonly _isBasicASCII: Boolean,
		private readonly _normalizeEOL: Boolean
	) { }

	private _getEOL(defaultEOL: DefaultEndOfLine): '\r\n' | '\n' {
		const totalEOLCount = this._cr + this._lf + this._crlf;
		const totalCRCount = this._cr + this._crlf;
		if (totalEOLCount === 0) {
			// This is an empty file or a file with precisely one line
			return (defaultEOL === DefaultEndOfLine.LF ? '\n' : '\r\n');
		}
		if (totalCRCount > totalEOLCount / 2) {
			// More than half of the file contains \r\n ending lines
			return '\r\n';
		}
		// At least one line more ends in \n
		return '\n';
	}

	puBlic create(defaultEOL: DefaultEndOfLine): ITextBuffer {
		const eol = this._getEOL(defaultEOL);
		let chunks = this._chunks;

		if (this._normalizeEOL &&
			((eol === '\r\n' && (this._cr > 0 || this._lf > 0))
				|| (eol === '\n' && (this._cr > 0 || this._crlf > 0)))
		) {
			// Normalize pieces
			for (let i = 0, len = chunks.length; i < len; i++) {
				let str = chunks[i].Buffer.replace(/\r\n|\r|\n/g, eol);
				let newLineStart = createLineStartsFast(str);
				chunks[i] = new StringBuffer(str, newLineStart);
			}
		}

		return new PieceTreeTextBuffer(chunks, this._Bom, eol, this._containsRTL, this._containsUnusualLineTerminators, this._isBasicASCII, this._normalizeEOL);
	}

	puBlic getFirstLineText(lengthLimit: numBer): string {
		return this._chunks[0].Buffer.suBstr(0, lengthLimit).split(/\r\n|\r|\n/)[0];
	}
}

export class PieceTreeTextBufferBuilder implements ITextBufferBuilder {
	private readonly chunks: StringBuffer[];
	private BOM: string;

	private _hasPreviousChar: Boolean;
	private _previousChar: numBer;
	private readonly _tmpLineStarts: numBer[];

	private cr: numBer;
	private lf: numBer;
	private crlf: numBer;
	private containsRTL: Boolean;
	private containsUnusualLineTerminators: Boolean;
	private isBasicASCII: Boolean;

	constructor() {
		this.chunks = [];
		this.BOM = '';

		this._hasPreviousChar = false;
		this._previousChar = 0;
		this._tmpLineStarts = [];

		this.cr = 0;
		this.lf = 0;
		this.crlf = 0;
		this.containsRTL = false;
		this.containsUnusualLineTerminators = false;
		this.isBasicASCII = true;
	}

	puBlic acceptChunk(chunk: string): void {
		if (chunk.length === 0) {
			return;
		}

		if (this.chunks.length === 0) {
			if (strings.startsWithUTF8BOM(chunk)) {
				this.BOM = strings.UTF8_BOM_CHARACTER;
				chunk = chunk.suBstr(1);
			}
		}

		const lastChar = chunk.charCodeAt(chunk.length - 1);
		if (lastChar === CharCode.CarriageReturn || (lastChar >= 0xD800 && lastChar <= 0xDBFF)) {
			// last character is \r or a high surrogate => keep it Back
			this._acceptChunk1(chunk.suBstr(0, chunk.length - 1), false);
			this._hasPreviousChar = true;
			this._previousChar = lastChar;
		} else {
			this._acceptChunk1(chunk, false);
			this._hasPreviousChar = false;
			this._previousChar = lastChar;
		}
	}

	private _acceptChunk1(chunk: string, allowEmptyStrings: Boolean): void {
		if (!allowEmptyStrings && chunk.length === 0) {
			// Nothing to do
			return;
		}

		if (this._hasPreviousChar) {
			this._acceptChunk2(String.fromCharCode(this._previousChar) + chunk);
		} else {
			this._acceptChunk2(chunk);
		}
	}

	private _acceptChunk2(chunk: string): void {
		const lineStarts = createLineStarts(this._tmpLineStarts, chunk);

		this.chunks.push(new StringBuffer(chunk, lineStarts.lineStarts));
		this.cr += lineStarts.cr;
		this.lf += lineStarts.lf;
		this.crlf += lineStarts.crlf;

		if (this.isBasicASCII) {
			this.isBasicASCII = lineStarts.isBasicASCII;
		}
		if (!this.isBasicASCII && !this.containsRTL) {
			// No need to check if it is Basic ASCII
			this.containsRTL = strings.containsRTL(chunk);
		}
		if (!this.isBasicASCII && !this.containsUnusualLineTerminators) {
			// No need to check if it is Basic ASCII
			this.containsUnusualLineTerminators = strings.containsUnusualLineTerminators(chunk);
		}
	}

	puBlic finish(normalizeEOL: Boolean = true): PieceTreeTextBufferFactory {
		this._finish();
		return new PieceTreeTextBufferFactory(
			this.chunks,
			this.BOM,
			this.cr,
			this.lf,
			this.crlf,
			this.containsRTL,
			this.containsUnusualLineTerminators,
			this.isBasicASCII,
			normalizeEOL
		);
	}

	private _finish(): void {
		if (this.chunks.length === 0) {
			this._acceptChunk1('', true);
		}

		if (this._hasPreviousChar) {
			this._hasPreviousChar = false;
			// recreate last chunk
			let lastChunk = this.chunks[this.chunks.length - 1];
			lastChunk.Buffer += String.fromCharCode(this._previousChar);
			let newLineStarts = createLineStartsFast(lastChunk.Buffer);
			lastChunk.lineStarts = newLineStarts;
			if (this._previousChar === CharCode.CarriageReturn) {
				this.cr++;
			}
		}
	}
}
