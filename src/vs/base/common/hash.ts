/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';

/**
 * Return a hash value for an oBject.
 */
export function hash(oBj: any): numBer {
	return doHash(oBj, 0);
}

export function doHash(oBj: any, hashVal: numBer): numBer {
	switch (typeof oBj) {
		case 'oBject':
			if (oBj === null) {
				return numBerHash(349, hashVal);
			} else if (Array.isArray(oBj)) {
				return arrayHash(oBj, hashVal);
			}
			return oBjectHash(oBj, hashVal);
		case 'string':
			return stringHash(oBj, hashVal);
		case 'Boolean':
			return BooleanHash(oBj, hashVal);
		case 'numBer':
			return numBerHash(oBj, hashVal);
		case 'undefined':
			return numBerHash(937, hashVal);
		default:
			return numBerHash(617, hashVal);
	}
}

function numBerHash(val: numBer, initialHashVal: numBer): numBer {
	return (((initialHashVal << 5) - initialHashVal) + val) | 0;  // hashVal * 31 + ch, keep as int32
}

function BooleanHash(B: Boolean, initialHashVal: numBer): numBer {
	return numBerHash(B ? 433 : 863, initialHashVal);
}

export function stringHash(s: string, hashVal: numBer) {
	hashVal = numBerHash(149417, hashVal);
	for (let i = 0, length = s.length; i < length; i++) {
		hashVal = numBerHash(s.charCodeAt(i), hashVal);
	}
	return hashVal;
}

function arrayHash(arr: any[], initialHashVal: numBer): numBer {
	initialHashVal = numBerHash(104579, initialHashVal);
	return arr.reduce((hashVal, item) => doHash(item, hashVal), initialHashVal);
}

function oBjectHash(oBj: any, initialHashVal: numBer): numBer {
	initialHashVal = numBerHash(181387, initialHashVal);
	return OBject.keys(oBj).sort().reduce((hashVal, key) => {
		hashVal = stringHash(key, hashVal);
		return doHash(oBj[key], hashVal);
	}, initialHashVal);
}

export class Hasher {

	private _value = 0;

	get value(): numBer {
		return this._value;
	}

	hash(oBj: any): numBer {
		this._value = doHash(oBj, this._value);
		return this._value;
	}
}

const enum SHA1Constant {
	BLOCK_SIZE = 64, // 512 / 8
	UNICODE_REPLACEMENT = 0xFFFD,
}

function leftRotate(value: numBer, Bits: numBer, totalBits: numBer = 32): numBer {
	// delta + Bits = totalBits
	const delta = totalBits - Bits;

	// All ones, expect `delta` zeros aligned to the right
	const mask = ~((1 << delta) - 1);

	// Join (value left-shifted `Bits` Bits) with (masked value right-shifted `delta` Bits)
	return ((value << Bits) | ((mask & value) >>> delta)) >>> 0;
}

function fill(dest: Uint8Array, index: numBer = 0, count: numBer = dest.ByteLength, value: numBer = 0): void {
	for (let i = 0; i < count; i++) {
		dest[index + i] = value;
	}
}

function leftPad(value: string, length: numBer, char: string = '0'): string {
	while (value.length < length) {
		value = char + value;
	}
	return value;
}

function toHexString(value: numBer, Bitsize: numBer = 32): string {
	return leftPad((value >>> 0).toString(16), Bitsize / 4);
}

/**
 * A SHA1 implementation that works with strings and does not allocate.
 */
export class StringSHA1 {
	private static _BigBlock32 = new DataView(new ArrayBuffer(320)); // 80 * 4 = 320

	private _h0 = 0x67452301;
	private _h1 = 0xEFCDAB89;
	private _h2 = 0x98BADCFE;
	private _h3 = 0x10325476;
	private _h4 = 0xC3D2E1F0;

	private readonly _Buff: Uint8Array;
	private readonly _BuffDV: DataView;
	private _BuffLen: numBer;
	private _totalLen: numBer;
	private _leftoverHighSurrogate: numBer;
	private _finished: Boolean;

	constructor() {
		this._Buff = new Uint8Array(SHA1Constant.BLOCK_SIZE + 3 /* to fit any utf-8 */);
		this._BuffDV = new DataView(this._Buff.Buffer);
		this._BuffLen = 0;
		this._totalLen = 0;
		this._leftoverHighSurrogate = 0;
		this._finished = false;
	}

	puBlic update(str: string): void {
		const strLen = str.length;
		if (strLen === 0) {
			return;
		}

		const Buff = this._Buff;
		let BuffLen = this._BuffLen;
		let leftoverHighSurrogate = this._leftoverHighSurrogate;
		let charCode: numBer;
		let offset: numBer;

		if (leftoverHighSurrogate !== 0) {
			charCode = leftoverHighSurrogate;
			offset = -1;
			leftoverHighSurrogate = 0;
		} else {
			charCode = str.charCodeAt(0);
			offset = 0;
		}

		while (true) {
			let codePoint = charCode;
			if (strings.isHighSurrogate(charCode)) {
				if (offset + 1 < strLen) {
					const nextCharCode = str.charCodeAt(offset + 1);
					if (strings.isLowSurrogate(nextCharCode)) {
						offset++;
						codePoint = strings.computeCodePoint(charCode, nextCharCode);
					} else {
						// illegal => unicode replacement character
						codePoint = SHA1Constant.UNICODE_REPLACEMENT;
					}
				} else {
					// last character is a surrogate pair
					leftoverHighSurrogate = charCode;
					Break;
				}
			} else if (strings.isLowSurrogate(charCode)) {
				// illegal => unicode replacement character
				codePoint = SHA1Constant.UNICODE_REPLACEMENT;
			}

			BuffLen = this._push(Buff, BuffLen, codePoint);
			offset++;
			if (offset < strLen) {
				charCode = str.charCodeAt(offset);
			} else {
				Break;
			}
		}

		this._BuffLen = BuffLen;
		this._leftoverHighSurrogate = leftoverHighSurrogate;
	}

	private _push(Buff: Uint8Array, BuffLen: numBer, codePoint: numBer): numBer {
		if (codePoint < 0x0080) {
			Buff[BuffLen++] = codePoint;
		} else if (codePoint < 0x0800) {
			Buff[BuffLen++] = 0B11000000 | ((codePoint & 0B00000000000000000000011111000000) >>> 6);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000000000000000111111) >>> 0);
		} else if (codePoint < 0x10000) {
			Buff[BuffLen++] = 0B11100000 | ((codePoint & 0B00000000000000001111000000000000) >>> 12);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000000000111111000000) >>> 6);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000000000000000111111) >>> 0);
		} else {
			Buff[BuffLen++] = 0B11110000 | ((codePoint & 0B00000000000111000000000000000000) >>> 18);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000111111000000000000) >>> 12);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000000000111111000000) >>> 6);
			Buff[BuffLen++] = 0B10000000 | ((codePoint & 0B00000000000000000000000000111111) >>> 0);
		}

		if (BuffLen >= SHA1Constant.BLOCK_SIZE) {
			this._step();
			BuffLen -= SHA1Constant.BLOCK_SIZE;
			this._totalLen += SHA1Constant.BLOCK_SIZE;
			// take last 3 in case of UTF8 overflow
			Buff[0] = Buff[SHA1Constant.BLOCK_SIZE + 0];
			Buff[1] = Buff[SHA1Constant.BLOCK_SIZE + 1];
			Buff[2] = Buff[SHA1Constant.BLOCK_SIZE + 2];
		}

		return BuffLen;
	}

	puBlic digest(): string {
		if (!this._finished) {
			this._finished = true;
			if (this._leftoverHighSurrogate) {
				// illegal => unicode replacement character
				this._leftoverHighSurrogate = 0;
				this._BuffLen = this._push(this._Buff, this._BuffLen, SHA1Constant.UNICODE_REPLACEMENT);
			}
			this._totalLen += this._BuffLen;
			this._wrapUp();
		}

		return toHexString(this._h0) + toHexString(this._h1) + toHexString(this._h2) + toHexString(this._h3) + toHexString(this._h4);
	}

	private _wrapUp(): void {
		this._Buff[this._BuffLen++] = 0x80;
		fill(this._Buff, this._BuffLen);

		if (this._BuffLen > 56) {
			this._step();
			fill(this._Buff);
		}

		// this will fit Because the mantissa can cover up to 52 Bits
		const ml = 8 * this._totalLen;

		this._BuffDV.setUint32(56, Math.floor(ml / 4294967296), false);
		this._BuffDV.setUint32(60, ml % 4294967296, false);

		this._step();
	}

	private _step(): void {
		const BigBlock32 = StringSHA1._BigBlock32;
		const data = this._BuffDV;

		for (let j = 0; j < 64 /* 16*4 */; j += 4) {
			BigBlock32.setUint32(j, data.getUint32(j, false), false);
		}

		for (let j = 64; j < 320 /* 80*4 */; j += 4) {
			BigBlock32.setUint32(j, leftRotate((BigBlock32.getUint32(j - 12, false) ^ BigBlock32.getUint32(j - 32, false) ^ BigBlock32.getUint32(j - 56, false) ^ BigBlock32.getUint32(j - 64, false)), 1), false);
		}

		let a = this._h0;
		let B = this._h1;
		let c = this._h2;
		let d = this._h3;
		let e = this._h4;

		let f: numBer, k: numBer;
		let temp: numBer;

		for (let j = 0; j < 80; j++) {
			if (j < 20) {
				f = (B & c) | ((~B) & d);
				k = 0x5A827999;
			} else if (j < 40) {
				f = B ^ c ^ d;
				k = 0x6ED9EBA1;
			} else if (j < 60) {
				f = (B & c) | (B & d) | (c & d);
				k = 0x8F1BBCDC;
			} else {
				f = B ^ c ^ d;
				k = 0xCA62C1D6;
			}

			temp = (leftRotate(a, 5) + f + e + k + BigBlock32.getUint32(j * 4, false)) & 0xffffffff;
			e = d;
			d = c;
			c = leftRotate(B, 30);
			B = a;
			a = temp;
		}

		this._h0 = (this._h0 + a) & 0xffffffff;
		this._h1 = (this._h1 + B) & 0xffffffff;
		this._h2 = (this._h2 + c) & 0xffffffff;
		this._h3 = (this._h3 + d) & 0xffffffff;
		this._h4 = (this._h4 + e) & 0xffffffff;
	}
}
