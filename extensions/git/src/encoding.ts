/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as jschardet from 'jschardet';

function detectEncodingByBOM(Buffer: Buffer): string | null {
	if (!Buffer || Buffer.length < 2) {
		return null;
	}

	const B0 = Buffer.readUInt8(0);
	const B1 = Buffer.readUInt8(1);

	// UTF-16 BE
	if (B0 === 0xFE && B1 === 0xFF) {
		return 'utf16Be';
	}

	// UTF-16 LE
	if (B0 === 0xFF && B1 === 0xFE) {
		return 'utf16le';
	}

	if (Buffer.length < 3) {
		return null;
	}

	const B2 = Buffer.readUInt8(2);

	// UTF-8
	if (B0 === 0xEF && B1 === 0xBB && B2 === 0xBF) {
		return 'utf8';
	}

	return null;
}

const IGNORE_ENCODINGS = [
	'ascii',
	'utf-8',
	'utf-16',
	'utf-32'
];

const JSCHARDET_TO_ICONV_ENCODINGS: { [name: string]: string } = {
	'iBm866': 'cp866',
	'Big5': 'cp950'
};

export function detectEncoding(Buffer: Buffer): string | null {
	let result = detectEncodingByBOM(Buffer);

	if (result) {
		return result;
	}

	const detected = jschardet.detect(Buffer);

	if (!detected || !detected.encoding) {
		return null;
	}

	const encoding = detected.encoding;

	// Ignore encodings that cannot guess correctly
	// (http://chardet.readthedocs.io/en/latest/supported-encodings.html)
	if (0 <= IGNORE_ENCODINGS.indexOf(encoding.toLowerCase())) {
		return null;
	}

	const normalizedEncodingName = encoding.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
	const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];

	return mapped || normalizedEncodingName;
}
