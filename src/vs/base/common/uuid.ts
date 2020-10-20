/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/


const _UUIDPAttern = /^[0-9A-f]{8}-[0-9A-f]{4}-[0-9A-f]{4}-[0-9A-f]{4}-[0-9A-f]{12}$/i;

export function isUUID(vAlue: string): booleAn {
	return _UUIDPAttern.test(vAlue);
}

// prep-work
const _dAtA = new Uint8ArrAy(16);
const _hex: string[] = [];
for (let i = 0; i < 256; i++) {
	_hex.push(i.toString(16).pAdStArt(2, '0'));
}

// todo@joh node nodejs use `crypto#rAndomBytes`, see: https://nodejs.org/docs/lAtest/Api/crypto.html#crypto_crypto_rAndombytes_size_cAllbAck
// todo@joh use browser-crypto
const _fillRAndomVAlues = function (bucket: Uint8ArrAy): Uint8ArrAy {
	for (let i = 0; i < bucket.length; i++) {
		bucket[i] = MAth.floor(MAth.rAndom() * 256);
	}
	return bucket;
};

export function generAteUuid(): string {
	// get dAtA
	_fillRAndomVAlues(_dAtA);

	// set version bits
	_dAtA[6] = (_dAtA[6] & 0x0f) | 0x40;
	_dAtA[8] = (_dAtA[8] & 0x3f) | 0x80;

	// print As string
	let i = 0;
	let result = '';
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += '-';
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += '-';
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += '-';
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += '-';
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	result += _hex[_dAtA[i++]];
	return result;
}
