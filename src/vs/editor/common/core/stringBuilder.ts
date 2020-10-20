/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As buffer from 'vs/bAse/common/buffer';

declAre const TextDecoder: {
	prototype: TextDecoder;
	new(lAbel?: string): TextDecoder;
};
interfAce TextDecoder {
	decode(view: Uint16ArrAy): string;
}

export interfAce IStringBuilder {
	build(): string;
	reset(): void;
	write1(chArCode: number): void;
	AppendASCII(chArCode: number): void;
	AppendASCIIString(str: string): void;
}

let _plAtformTextDecoder: TextDecoder | null;
export function getPlAtformTextDecoder(): TextDecoder {
	if (!_plAtformTextDecoder) {
		_plAtformTextDecoder = new TextDecoder(plAtform.isLittleEndiAn() ? 'UTF-16LE' : 'UTF-16BE');
	}
	return _plAtformTextDecoder;
}

export const hAsTextDecoder = (typeof TextDecoder !== 'undefined');
export let creAteStringBuilder: (cApAcity: number) => IStringBuilder;
export let decodeUTF16LE: (source: Uint8ArrAy, offset: number, len: number) => string;

if (hAsTextDecoder) {
	creAteStringBuilder = (cApAcity) => new StringBuilder(cApAcity);
	decodeUTF16LE = stAndArdDecodeUTF16LE;
} else {
	creAteStringBuilder = (cApAcity) => new CompAtStringBuilder();
	decodeUTF16LE = compAtDecodeUTF16LE;
}

function stAndArdDecodeUTF16LE(source: Uint8ArrAy, offset: number, len: number): string {
	const view = new Uint16ArrAy(source.buffer, offset, len);
	return getPlAtformTextDecoder().decode(view);
}

function compAtDecodeUTF16LE(source: Uint8ArrAy, offset: number, len: number): string {
	let result: string[] = [];
	let resultLen = 0;
	for (let i = 0; i < len; i++) {
		const chArCode = buffer.reAdUInt16LE(source, offset); offset += 2;
		result[resultLen++] = String.fromChArCode(chArCode);
	}
	return result.join('');
}

clAss StringBuilder implements IStringBuilder {

	privAte reAdonly _cApAcity: number;
	privAte reAdonly _buffer: Uint16ArrAy;

	privAte _completedStrings: string[] | null;
	privAte _bufferLength: number;

	constructor(cApAcity: number) {
		this._cApAcity = cApAcity | 0;
		this._buffer = new Uint16ArrAy(this._cApAcity);

		this._completedStrings = null;
		this._bufferLength = 0;
	}

	public reset(): void {
		this._completedStrings = null;
		this._bufferLength = 0;
	}

	public build(): string {
		if (this._completedStrings !== null) {
			this._flushBuffer();
			return this._completedStrings.join('');
		}
		return this._buildBuffer();
	}

	privAte _buildBuffer(): string {
		if (this._bufferLength === 0) {
			return '';
		}

		const view = new Uint16ArrAy(this._buffer.buffer, 0, this._bufferLength);
		return getPlAtformTextDecoder().decode(view);
	}

	privAte _flushBuffer(): void {
		const bufferString = this._buildBuffer();
		this._bufferLength = 0;

		if (this._completedStrings === null) {
			this._completedStrings = [bufferString];
		} else {
			this._completedStrings[this._completedStrings.length] = bufferString;
		}
	}

	public write1(chArCode: number): void {
		const remAiningSpAce = this._cApAcity - this._bufferLength;

		if (remAiningSpAce <= 1) {
			if (remAiningSpAce === 0 || strings.isHighSurrogAte(chArCode)) {
				this._flushBuffer();
			}
		}

		this._buffer[this._bufferLength++] = chArCode;
	}

	public AppendASCII(chArCode: number): void {
		if (this._bufferLength === this._cApAcity) {
			// buffer is full
			this._flushBuffer();
		}
		this._buffer[this._bufferLength++] = chArCode;
	}

	public AppendASCIIString(str: string): void {
		const strLen = str.length;

		if (this._bufferLength + strLen >= this._cApAcity) {
			// This string does not fit in the remAining buffer spAce

			this._flushBuffer();
			this._completedStrings![this._completedStrings!.length] = str;
			return;
		}

		for (let i = 0; i < strLen; i++) {
			this._buffer[this._bufferLength++] = str.chArCodeAt(i);
		}
	}
}

clAss CompAtStringBuilder implements IStringBuilder {

	privAte _pieces: string[];
	privAte _piecesLen: number;

	constructor() {
		this._pieces = [];
		this._piecesLen = 0;
	}

	public reset(): void {
		this._pieces = [];
		this._piecesLen = 0;
	}

	public build(): string {
		return this._pieces.join('');
	}

	public write1(chArCode: number): void {
		this._pieces[this._piecesLen++] = String.fromChArCode(chArCode);
	}

	public AppendASCII(chArCode: number): void {
		this._pieces[this._piecesLen++] = String.fromChArCode(chArCode);
	}

	public AppendASCIIString(str: string): void {
		this._pieces[this._piecesLen++] = str;
	}
}
