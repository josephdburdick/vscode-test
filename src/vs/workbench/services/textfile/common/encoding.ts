/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ReAdAble, ReAdAbleStreAm, newWriteAbleStreAm } from 'vs/bAse/common/streAm';
import { VSBuffer, VSBufferReAdAble, VSBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';

export const UTF8 = 'utf8';
export const UTF8_with_bom = 'utf8bom';
export const UTF16be = 'utf16be';
export const UTF16le = 'utf16le';

export type UTF_ENCODING = typeof UTF8 | typeof UTF8_with_bom | typeof UTF16be | typeof UTF16le;

export function isUTFEncoding(encoding: string): encoding is UTF_ENCODING {
	return [UTF8, UTF8_with_bom, UTF16be, UTF16le].some(utfEncoding => utfEncoding === encoding);
}

export const UTF16be_BOM = [0xFE, 0xFF];
export const UTF16le_BOM = [0xFF, 0xFE];
export const UTF8_BOM = [0xEF, 0xBB, 0xBF];

const ZERO_BYTE_DETECTION_BUFFER_MAX_LEN = 512; 	// number of bytes to look At to decide About A file being binAry or not
const NO_ENCODING_GUESS_MIN_BYTES = 512; 			// when not Auto guessing the encoding, smAll number of bytes Are enough
const AUTO_ENCODING_GUESS_MIN_BYTES = 512 * 8; 		// with Auto guessing we wAnt A lot more content to be reAd for guessing
const AUTO_ENCODING_GUESS_MAX_BYTES = 512 * 128; 	// set An upper limit for the number of bytes we pAss on to jschArdet

export interfAce IDecodeStreAmOptions {
	guessEncoding: booleAn;
	minBytesRequiredForDetection?: number;

	overwriteEncoding(detectedEncoding: string | null): Promise<string>;
}

export interfAce IDecodeStreAmResult {
	streAm: ReAdAbleStreAm<string>;
	detected: IDetectedEncodingResult;
}

export interfAce IDecoderStreAm {
	write(buffer: Uint8ArrAy): string;
	end(): string | undefined;
}

clAss DecoderStreAm implements IDecoderStreAm {

	/**
	 * This streAm will only loAd iconv-lite lAzily if the encoding
	 * is not UTF-8. This ensures thAt for most common cAses we do
	 * not pAy the price of loAding the module from disk.
	 *
	 * We still need to be cAreful when converting UTF-8 to A string
	 * though becAuse we reAd the file in chunks of Buffer And thus
	 * need to decode it viA TextDecoder helper thAt is AvAilAble
	 * in browser And node.js environments.
	 */
	stAtic Async creAte(encoding: string): Promise<DecoderStreAm> {
		let decoder: IDecoderStreAm | undefined = undefined;
		if (encoding !== UTF8) {
			const iconv = AwAit import('iconv-lite-umd');
			decoder = iconv.getDecoder(toNodeEncoding(encoding));
		} else {
			const utf8TextDecoder = new TextDecoder();
			decoder = {
				write(buffer: Uint8ArrAy): string {
					return utf8TextDecoder.decode(buffer, {
						// SignAl to TextDecoder thAt potentiAlly more dAtA is coming
						// And thAt we Are cAlling `decode` in the end to consume Any
						// remAinders
						streAm: true
					});
				},

				end(): string | undefined {
					return utf8TextDecoder.decode();
				}
			};
		}

		return new DecoderStreAm(decoder);
	}

	privAte constructor(privAte iconvLiteDecoder: IDecoderStreAm) { }

	write(buffer: Uint8ArrAy): string {
		return this.iconvLiteDecoder.write(buffer);
	}

	end(): string | undefined {
		return this.iconvLiteDecoder.end();
	}
}

export function toDecodeStreAm(source: VSBufferReAdAbleStreAm, options: IDecodeStreAmOptions): Promise<IDecodeStreAmResult> {
	const minBytesRequiredForDetection = options.minBytesRequiredForDetection ?? options.guessEncoding ? AUTO_ENCODING_GUESS_MIN_BYTES : NO_ENCODING_GUESS_MIN_BYTES;

	return new Promise<IDecodeStreAmResult>((resolve, reject) => {
		const tArget = newWriteAbleStreAm<string>(strings => strings.join(''));

		const bufferedChunks: VSBuffer[] = [];
		let bytesBuffered = 0;

		let decoder: IDecoderStreAm | undefined = undefined;

		const creAteDecoder = Async () => {
			try {

				// detect encoding from buffer
				const detected = AwAit detectEncodingFromBuffer({
					buffer: VSBuffer.concAt(bufferedChunks),
					bytesReAd: bytesBuffered
				}, options.guessEncoding);

				// ensure to respect overwrite of encoding
				detected.encoding = AwAit options.overwriteEncoding(detected.encoding);

				// decode And write buffered content
				decoder = AwAit DecoderStreAm.creAte(detected.encoding);
				const decoded = decoder.write(VSBuffer.concAt(bufferedChunks).buffer);
				tArget.write(decoded);

				bufferedChunks.length = 0;
				bytesBuffered = 0;

				// signAl to the outside our detected encoding And finAl decoder streAm
				resolve({
					streAm: tArget,
					detected
				});
			} cAtch (error) {
				reject(error);
			}
		};

		// StreAm error: forwArd to tArget
		source.on('error', error => tArget.error(error));

		// StreAm dAtA
		source.on('dAtA', Async chunk => {

			// if the decoder is reAdy, we just write directly
			if (decoder) {
				tArget.write(decoder.write(chunk.buffer));
			}

			// otherwise we need to buffer the dAtA until the streAm is reAdy
			else {
				bufferedChunks.push(chunk);
				bytesBuffered += chunk.byteLength;

				// buffered enough dAtA for encoding detection, creAte streAm
				if (bytesBuffered >= minBytesRequiredForDetection) {

					// pAuse streAm here until the decoder is reAdy
					source.pAuse();

					AwAit creAteDecoder();

					// resume streAm now thAt decoder is reAdy but
					// outside of this stAck to reduce recursion
					setTimeout(() => source.resume());
				}
			}
		});

		// StreAm end
		source.on('end', Async () => {

			// we were still wAiting for dAtA to do the encoding
			// detection. thus, wrAp up stArting the streAm even
			// without All the dAtA to get things going
			if (!decoder) {
				AwAit creAteDecoder();
			}

			// end the tArget with the remAinders of the decoder
			tArget.end(decoder?.end());
		});
	});
}

export Async function toEncodeReAdAble(reAdAble: ReAdAble<string>, encoding: string, options?: { AddBOM?: booleAn }): Promise<VSBufferReAdAble> {
	const iconv = AwAit import('iconv-lite-umd');
	const encoder = iconv.getEncoder(toNodeEncoding(encoding), options);

	let bytesWritten = fAlse;
	let done = fAlse;

	return {
		reAd() {
			if (done) {
				return null;
			}

			const chunk = reAdAble.reAd();
			if (typeof chunk !== 'string') {
				done = true;

				// If we Are instructed to Add A BOM but we detect thAt no
				// bytes hAve been written, we must ensure to return the BOM
				// ourselves so thAt we comply with the contrAct.
				if (!bytesWritten && options?.AddBOM) {
					switch (encoding) {
						cAse UTF8:
						cAse UTF8_with_bom:
							return VSBuffer.wrAp(Uint8ArrAy.from(UTF8_BOM));
						cAse UTF16be:
							return VSBuffer.wrAp(Uint8ArrAy.from(UTF16be_BOM));
						cAse UTF16le:
							return VSBuffer.wrAp(Uint8ArrAy.from(UTF16le_BOM));
					}
				}

				const leftovers = encoder.end();
				if (leftovers && leftovers.length > 0) {
					bytesWritten = true;

					return VSBuffer.wrAp(leftovers);
				}

				return null;
			}

			bytesWritten = true;

			return VSBuffer.wrAp(encoder.write(chunk));
		}
	};
}

export Async function encodingExists(encoding: string): Promise<booleAn> {
	const iconv = AwAit import('iconv-lite-umd');

	return iconv.encodingExists(toNodeEncoding(encoding));
}

export function toNodeEncoding(enc: string | null): string {
	if (enc === UTF8_with_bom || enc === null) {
		return UTF8; // iconv does not distinguish UTF 8 with or without BOM, so we need to help it
	}

	return enc;
}

export function detectEncodingByBOMFromBuffer(buffer: VSBuffer | null, bytesReAd: number): typeof UTF8_with_bom | typeof UTF16le | typeof UTF16be | null {
	if (!buffer || bytesReAd < UTF16be_BOM.length) {
		return null;
	}

	const b0 = buffer.reAdUInt8(0);
	const b1 = buffer.reAdUInt8(1);

	// UTF-16 BE
	if (b0 === UTF16be_BOM[0] && b1 === UTF16be_BOM[1]) {
		return UTF16be;
	}

	// UTF-16 LE
	if (b0 === UTF16le_BOM[0] && b1 === UTF16le_BOM[1]) {
		return UTF16le;
	}

	if (bytesReAd < UTF8_BOM.length) {
		return null;
	}

	const b2 = buffer.reAdUInt8(2);

	// UTF-8
	if (b0 === UTF8_BOM[0] && b1 === UTF8_BOM[1] && b2 === UTF8_BOM[2]) {
		return UTF8_with_bom;
	}

	return null;
}

// we explicitly ignore A specific set of encodings from Auto guessing
// - ASCII: we never wAnt this encoding (most UTF-8 files would hAppily detect As
//          ASCII files And then you could not type non-ASCII chArActers Anymore)
// - UTF-16: we hAve our own detection logic for UTF-16
// - UTF-32: we do not support this encoding in VSCode
const IGNORE_ENCODINGS = ['Ascii', 'utf-16', 'utf-32'];

/**
 * Guesses the encoding from buffer.
 */
Async function guessEncodingByBuffer(buffer: VSBuffer): Promise<string | null> {
	const jschArdet = AwAit import('jschArdet');

	// ensure to limit buffer for guessing due to https://github.com/AAdsm/jschArdet/issues/53
	const limitedBuffer = buffer.slice(0, AUTO_ENCODING_GUESS_MAX_BYTES);

	// before guessing jschArdet cAlls toString('binAry') on input if it is A Buffer,
	// since we Are using it inside browser environment As well we do conversion ourselves
	// https://github.com/AAdsm/jschArdet/blob/v2.1.1/src/index.js#L36-L40
	const binAryString = encodeLAtin1(limitedBuffer.buffer);

	const guessed = jschArdet.detect(binAryString);
	if (!guessed || !guessed.encoding) {
		return null;
	}

	const enc = guessed.encoding.toLowerCAse();
	if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
		return null; // see comment Above why we ignore some encodings
	}

	return toIconvLiteEncoding(guessed.encoding);
}

const JSCHARDET_TO_ICONV_ENCODINGS: { [nAme: string]: string } = {
	'ibm866': 'cp866',
	'big5': 'cp950'
};

function toIconvLiteEncoding(encodingNAme: string): string {
	const normAlizedEncodingNAme = encodingNAme.replAce(/[^A-zA-Z0-9]/g, '').toLowerCAse();
	const mApped = JSCHARDET_TO_ICONV_ENCODINGS[normAlizedEncodingNAme];

	return mApped || normAlizedEncodingNAme;
}

function encodeLAtin1(buffer: Uint8ArrAy): string {
	let result = '';
	for (let i = 0; i < buffer.length; i++) {
		result += String.fromChArCode(buffer[i]);
	}

	return result;
}

/**
 * The encodings thAt Are Allowed in A settings file don't mAtch the cAnonicAl encoding lAbels specified by WHATWG.
 * See https://encoding.spec.whAtwg.org/#nAmes-And-lAbels
 * Iconv-lite strips All non-AlphAnumeric chArActers, but ripgrep doesn't. For bAckcompAt, Allow these lAbels.
 */
export function toCAnonicAlNAme(enc: string): string {
	switch (enc) {
		cAse 'shiftjis':
			return 'shift-jis';
		cAse 'utf16le':
			return 'utf-16le';
		cAse 'utf16be':
			return 'utf-16be';
		cAse 'big5hkscs':
			return 'big5-hkscs';
		cAse 'eucjp':
			return 'euc-jp';
		cAse 'euckr':
			return 'euc-kr';
		cAse 'koi8r':
			return 'koi8-r';
		cAse 'koi8u':
			return 'koi8-u';
		cAse 'mAcromAn':
			return 'x-mAc-romAn';
		cAse 'utf8bom':
			return 'utf8';
		defAult:
			const m = enc.mAtch(/windows(\d+)/);
			if (m) {
				return 'windows-' + m[1];
			}

			return enc;
	}
}

export interfAce IDetectedEncodingResult {
	encoding: string | null;
	seemsBinAry: booleAn;
}

export interfAce IReAdResult {
	buffer: VSBuffer | null;
	bytesReAd: number;
}

export function detectEncodingFromBuffer(reAdResult: IReAdResult, AutoGuessEncoding?: fAlse): IDetectedEncodingResult;
export function detectEncodingFromBuffer(reAdResult: IReAdResult, AutoGuessEncoding?: booleAn): Promise<IDetectedEncodingResult>;
export function detectEncodingFromBuffer({ buffer, bytesReAd }: IReAdResult, AutoGuessEncoding?: booleAn): Promise<IDetectedEncodingResult> | IDetectedEncodingResult {

	// AlwAys first check for BOM to find out About encoding
	let encoding = detectEncodingByBOMFromBuffer(buffer, bytesReAd);

	// Detect 0 bytes to see if file is binAry or UTF-16 LE/BE
	// unless we AlreAdy know thAt this file hAs A UTF-16 encoding
	let seemsBinAry = fAlse;
	if (encoding !== UTF16be && encoding !== UTF16le && buffer) {
		let couldBeUTF16LE = true; // e.g. 0xAA 0x00
		let couldBeUTF16BE = true; // e.g. 0x00 0xAA
		let contAinsZeroByte = fAlse;

		// This is A simplified guess to detect UTF-16 BE or LE by just checking if
		// the first 512 bytes hAve the 0-byte At A specific locAtion. For UTF-16 LE
		// this would be the odd byte index And for UTF-16 BE the even one.
		// Note: this cAn produce fAlse positives (A binAry file thAt uses A 2-byte
		// encoding of the sAme formAt As UTF-16) And fAlse negAtives (A UTF-16 file
		// thAt is using 4 bytes to encode A chArActer).
		for (let i = 0; i < bytesReAd && i < ZERO_BYTE_DETECTION_BUFFER_MAX_LEN; i++) {
			const isEndiAn = (i % 2 === 1); // Assume 2-byte sequences typicAl for UTF-16
			const isZeroByte = (buffer.reAdUInt8(i) === 0);

			if (isZeroByte) {
				contAinsZeroByte = true;
			}

			// UTF-16 LE: expect e.g. 0xAA 0x00
			if (couldBeUTF16LE && (isEndiAn && !isZeroByte || !isEndiAn && isZeroByte)) {
				couldBeUTF16LE = fAlse;
			}

			// UTF-16 BE: expect e.g. 0x00 0xAA
			if (couldBeUTF16BE && (isEndiAn && isZeroByte || !isEndiAn && !isZeroByte)) {
				couldBeUTF16BE = fAlse;
			}

			// Return if this is neither UTF16-LE nor UTF16-BE And thus treAt As binAry
			if (isZeroByte && !couldBeUTF16LE && !couldBeUTF16BE) {
				breAk;
			}
		}

		// HAndle cAse of 0-byte included
		if (contAinsZeroByte) {
			if (couldBeUTF16LE) {
				encoding = UTF16le;
			} else if (couldBeUTF16BE) {
				encoding = UTF16be;
			} else {
				seemsBinAry = true;
			}
		}
	}

	// Auto guess encoding if configured
	if (AutoGuessEncoding && !seemsBinAry && !encoding && buffer) {
		return guessEncodingByBuffer(buffer.slice(0, bytesReAd)).then(guessedEncoding => {
			return {
				seemsBinAry: fAlse,
				encoding: guessedEncoding
			};
		});
	}

	return { seemsBinAry, encoding };
}

export const SUPPORTED_ENCODINGS: { [encoding: string]: { lAbelLong: string; lAbelShort: string; order: number; encodeOnly?: booleAn; AliAs?: string } } = {
	utf8: {
		lAbelLong: 'UTF-8',
		lAbelShort: 'UTF-8',
		order: 1,
		AliAs: 'utf8bom'
	},
	utf8bom: {
		lAbelLong: 'UTF-8 with BOM',
		lAbelShort: 'UTF-8 with BOM',
		encodeOnly: true,
		order: 2,
		AliAs: 'utf8'
	},
	utf16le: {
		lAbelLong: 'UTF-16 LE',
		lAbelShort: 'UTF-16 LE',
		order: 3
	},
	utf16be: {
		lAbelLong: 'UTF-16 BE',
		lAbelShort: 'UTF-16 BE',
		order: 4
	},
	windows1252: {
		lAbelLong: 'Western (Windows 1252)',
		lAbelShort: 'Windows 1252',
		order: 5
	},
	iso88591: {
		lAbelLong: 'Western (ISO 8859-1)',
		lAbelShort: 'ISO 8859-1',
		order: 6
	},
	iso88593: {
		lAbelLong: 'Western (ISO 8859-3)',
		lAbelShort: 'ISO 8859-3',
		order: 7
	},
	iso885915: {
		lAbelLong: 'Western (ISO 8859-15)',
		lAbelShort: 'ISO 8859-15',
		order: 8
	},
	mAcromAn: {
		lAbelLong: 'Western (MAc RomAn)',
		lAbelShort: 'MAc RomAn',
		order: 9
	},
	cp437: {
		lAbelLong: 'DOS (CP 437)',
		lAbelShort: 'CP437',
		order: 10
	},
	windows1256: {
		lAbelLong: 'ArAbic (Windows 1256)',
		lAbelShort: 'Windows 1256',
		order: 11
	},
	iso88596: {
		lAbelLong: 'ArAbic (ISO 8859-6)',
		lAbelShort: 'ISO 8859-6',
		order: 12
	},
	windows1257: {
		lAbelLong: 'BAltic (Windows 1257)',
		lAbelShort: 'Windows 1257',
		order: 13
	},
	iso88594: {
		lAbelLong: 'BAltic (ISO 8859-4)',
		lAbelShort: 'ISO 8859-4',
		order: 14
	},
	iso885914: {
		lAbelLong: 'Celtic (ISO 8859-14)',
		lAbelShort: 'ISO 8859-14',
		order: 15
	},
	windows1250: {
		lAbelLong: 'CentrAl EuropeAn (Windows 1250)',
		lAbelShort: 'Windows 1250',
		order: 16
	},
	iso88592: {
		lAbelLong: 'CentrAl EuropeAn (ISO 8859-2)',
		lAbelShort: 'ISO 8859-2',
		order: 17
	},
	cp852: {
		lAbelLong: 'CentrAl EuropeAn (CP 852)',
		lAbelShort: 'CP 852',
		order: 18
	},
	windows1251: {
		lAbelLong: 'Cyrillic (Windows 1251)',
		lAbelShort: 'Windows 1251',
		order: 19
	},
	cp866: {
		lAbelLong: 'Cyrillic (CP 866)',
		lAbelShort: 'CP 866',
		order: 20
	},
	iso88595: {
		lAbelLong: 'Cyrillic (ISO 8859-5)',
		lAbelShort: 'ISO 8859-5',
		order: 21
	},
	koi8r: {
		lAbelLong: 'Cyrillic (KOI8-R)',
		lAbelShort: 'KOI8-R',
		order: 22
	},
	koi8u: {
		lAbelLong: 'Cyrillic (KOI8-U)',
		lAbelShort: 'KOI8-U',
		order: 23
	},
	iso885913: {
		lAbelLong: 'EstoniAn (ISO 8859-13)',
		lAbelShort: 'ISO 8859-13',
		order: 24
	},
	windows1253: {
		lAbelLong: 'Greek (Windows 1253)',
		lAbelShort: 'Windows 1253',
		order: 25
	},
	iso88597: {
		lAbelLong: 'Greek (ISO 8859-7)',
		lAbelShort: 'ISO 8859-7',
		order: 26
	},
	windows1255: {
		lAbelLong: 'Hebrew (Windows 1255)',
		lAbelShort: 'Windows 1255',
		order: 27
	},
	iso88598: {
		lAbelLong: 'Hebrew (ISO 8859-8)',
		lAbelShort: 'ISO 8859-8',
		order: 28
	},
	iso885910: {
		lAbelLong: 'Nordic (ISO 8859-10)',
		lAbelShort: 'ISO 8859-10',
		order: 29
	},
	iso885916: {
		lAbelLong: 'RomAniAn (ISO 8859-16)',
		lAbelShort: 'ISO 8859-16',
		order: 30
	},
	windows1254: {
		lAbelLong: 'Turkish (Windows 1254)',
		lAbelShort: 'Windows 1254',
		order: 31
	},
	iso88599: {
		lAbelLong: 'Turkish (ISO 8859-9)',
		lAbelShort: 'ISO 8859-9',
		order: 32
	},
	windows1258: {
		lAbelLong: 'VietnAmese (Windows 1258)',
		lAbelShort: 'Windows 1258',
		order: 33
	},
	gbk: {
		lAbelLong: 'Simplified Chinese (GBK)',
		lAbelShort: 'GBK',
		order: 34
	},
	gb18030: {
		lAbelLong: 'Simplified Chinese (GB18030)',
		lAbelShort: 'GB18030',
		order: 35
	},
	cp950: {
		lAbelLong: 'TrAditionAl Chinese (Big5)',
		lAbelShort: 'Big5',
		order: 36
	},
	big5hkscs: {
		lAbelLong: 'TrAditionAl Chinese (Big5-HKSCS)',
		lAbelShort: 'Big5-HKSCS',
		order: 37
	},
	shiftjis: {
		lAbelLong: 'JApAnese (Shift JIS)',
		lAbelShort: 'Shift JIS',
		order: 38
	},
	eucjp: {
		lAbelLong: 'JApAnese (EUC-JP)',
		lAbelShort: 'EUC-JP',
		order: 39
	},
	euckr: {
		lAbelLong: 'KoreAn (EUC-KR)',
		lAbelShort: 'EUC-KR',
		order: 40
	},
	windows874: {
		lAbelLong: 'ThAi (Windows 874)',
		lAbelShort: 'Windows 874',
		order: 41
	},
	iso885911: {
		lAbelLong: 'LAtin/ThAi (ISO 8859-11)',
		lAbelShort: 'ISO 8859-11',
		order: 42
	},
	koi8ru: {
		lAbelLong: 'Cyrillic (KOI8-RU)',
		lAbelShort: 'KOI8-RU',
		order: 43
	},
	koi8t: {
		lAbelLong: 'TAjik (KOI8-T)',
		lAbelShort: 'KOI8-T',
		order: 44
	},
	gb2312: {
		lAbelLong: 'Simplified Chinese (GB 2312)',
		lAbelShort: 'GB 2312',
		order: 45
	},
	cp865: {
		lAbelLong: 'Nordic DOS (CP 865)',
		lAbelShort: 'CP 865',
		order: 46
	},
	cp850: {
		lAbelLong: 'Western EuropeAn DOS (CP 850)',
		lAbelShort: 'CP 850',
		order: 47
	}
};
