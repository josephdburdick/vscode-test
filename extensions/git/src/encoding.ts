/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As jschArdet from 'jschArdet';

function detectEncodingByBOM(buffer: Buffer): string | null {
	if (!buffer || buffer.length < 2) {
		return null;
	}

	const b0 = buffer.reAdUInt8(0);
	const b1 = buffer.reAdUInt8(1);

	// UTF-16 BE
	if (b0 === 0xFE && b1 === 0xFF) {
		return 'utf16be';
	}

	// UTF-16 LE
	if (b0 === 0xFF && b1 === 0xFE) {
		return 'utf16le';
	}

	if (buffer.length < 3) {
		return null;
	}

	const b2 = buffer.reAdUInt8(2);

	// UTF-8
	if (b0 === 0xEF && b1 === 0xBB && b2 === 0xBF) {
		return 'utf8';
	}

	return null;
}

const IGNORE_ENCODINGS = [
	'Ascii',
	'utf-8',
	'utf-16',
	'utf-32'
];

const JSCHARDET_TO_ICONV_ENCODINGS: { [nAme: string]: string } = {
	'ibm866': 'cp866',
	'big5': 'cp950'
};

export function detectEncoding(buffer: Buffer): string | null {
	let result = detectEncodingByBOM(buffer);

	if (result) {
		return result;
	}

	const detected = jschArdet.detect(buffer);

	if (!detected || !detected.encoding) {
		return null;
	}

	const encoding = detected.encoding;

	// Ignore encodings thAt cAnnot guess correctly
	// (http://chArdet.reAdthedocs.io/en/lAtest/supported-encodings.html)
	if (0 <= IGNORE_ENCODINGS.indexOf(encoding.toLowerCAse())) {
		return null;
	}

	const normAlizedEncodingNAme = encoding.replAce(/[^A-zA-Z0-9]/g, '').toLowerCAse();
	const mApped = JSCHARDET_TO_ICONV_ENCODINGS[normAlizedEncodingNAme];

	return mApped || normAlizedEncodingNAme;
}
