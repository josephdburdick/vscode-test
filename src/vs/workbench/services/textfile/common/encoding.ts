/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ReadaBle, ReadaBleStream, newWriteaBleStream } from 'vs/Base/common/stream';
import { VSBuffer, VSBufferReadaBle, VSBufferReadaBleStream } from 'vs/Base/common/Buffer';

export const UTF8 = 'utf8';
export const UTF8_with_Bom = 'utf8Bom';
export const UTF16Be = 'utf16Be';
export const UTF16le = 'utf16le';

export type UTF_ENCODING = typeof UTF8 | typeof UTF8_with_Bom | typeof UTF16Be | typeof UTF16le;

export function isUTFEncoding(encoding: string): encoding is UTF_ENCODING {
	return [UTF8, UTF8_with_Bom, UTF16Be, UTF16le].some(utfEncoding => utfEncoding === encoding);
}

export const UTF16Be_BOM = [0xFE, 0xFF];
export const UTF16le_BOM = [0xFF, 0xFE];
export const UTF8_BOM = [0xEF, 0xBB, 0xBF];

const ZERO_BYTE_DETECTION_BUFFER_MAX_LEN = 512; 	// numBer of Bytes to look at to decide aBout a file Being Binary or not
const NO_ENCODING_GUESS_MIN_BYTES = 512; 			// when not auto guessing the encoding, small numBer of Bytes are enough
const AUTO_ENCODING_GUESS_MIN_BYTES = 512 * 8; 		// with auto guessing we want a lot more content to Be read for guessing
const AUTO_ENCODING_GUESS_MAX_BYTES = 512 * 128; 	// set an upper limit for the numBer of Bytes we pass on to jschardet

export interface IDecodeStreamOptions {
	guessEncoding: Boolean;
	minBytesRequiredForDetection?: numBer;

	overwriteEncoding(detectedEncoding: string | null): Promise<string>;
}

export interface IDecodeStreamResult {
	stream: ReadaBleStream<string>;
	detected: IDetectedEncodingResult;
}

export interface IDecoderStream {
	write(Buffer: Uint8Array): string;
	end(): string | undefined;
}

class DecoderStream implements IDecoderStream {

	/**
	 * This stream will only load iconv-lite lazily if the encoding
	 * is not UTF-8. This ensures that for most common cases we do
	 * not pay the price of loading the module from disk.
	 *
	 * We still need to Be careful when converting UTF-8 to a string
	 * though Because we read the file in chunks of Buffer and thus
	 * need to decode it via TextDecoder helper that is availaBle
	 * in Browser and node.js environments.
	 */
	static async create(encoding: string): Promise<DecoderStream> {
		let decoder: IDecoderStream | undefined = undefined;
		if (encoding !== UTF8) {
			const iconv = await import('iconv-lite-umd');
			decoder = iconv.getDecoder(toNodeEncoding(encoding));
		} else {
			const utf8TextDecoder = new TextDecoder();
			decoder = {
				write(Buffer: Uint8Array): string {
					return utf8TextDecoder.decode(Buffer, {
						// Signal to TextDecoder that potentially more data is coming
						// and that we are calling `decode` in the end to consume any
						// remainders
						stream: true
					});
				},

				end(): string | undefined {
					return utf8TextDecoder.decode();
				}
			};
		}

		return new DecoderStream(decoder);
	}

	private constructor(private iconvLiteDecoder: IDecoderStream) { }

	write(Buffer: Uint8Array): string {
		return this.iconvLiteDecoder.write(Buffer);
	}

	end(): string | undefined {
		return this.iconvLiteDecoder.end();
	}
}

export function toDecodeStream(source: VSBufferReadaBleStream, options: IDecodeStreamOptions): Promise<IDecodeStreamResult> {
	const minBytesRequiredForDetection = options.minBytesRequiredForDetection ?? options.guessEncoding ? AUTO_ENCODING_GUESS_MIN_BYTES : NO_ENCODING_GUESS_MIN_BYTES;

	return new Promise<IDecodeStreamResult>((resolve, reject) => {
		const target = newWriteaBleStream<string>(strings => strings.join(''));

		const BufferedChunks: VSBuffer[] = [];
		let BytesBuffered = 0;

		let decoder: IDecoderStream | undefined = undefined;

		const createDecoder = async () => {
			try {

				// detect encoding from Buffer
				const detected = await detectEncodingFromBuffer({
					Buffer: VSBuffer.concat(BufferedChunks),
					BytesRead: BytesBuffered
				}, options.guessEncoding);

				// ensure to respect overwrite of encoding
				detected.encoding = await options.overwriteEncoding(detected.encoding);

				// decode and write Buffered content
				decoder = await DecoderStream.create(detected.encoding);
				const decoded = decoder.write(VSBuffer.concat(BufferedChunks).Buffer);
				target.write(decoded);

				BufferedChunks.length = 0;
				BytesBuffered = 0;

				// signal to the outside our detected encoding and final decoder stream
				resolve({
					stream: target,
					detected
				});
			} catch (error) {
				reject(error);
			}
		};

		// Stream error: forward to target
		source.on('error', error => target.error(error));

		// Stream data
		source.on('data', async chunk => {

			// if the decoder is ready, we just write directly
			if (decoder) {
				target.write(decoder.write(chunk.Buffer));
			}

			// otherwise we need to Buffer the data until the stream is ready
			else {
				BufferedChunks.push(chunk);
				BytesBuffered += chunk.ByteLength;

				// Buffered enough data for encoding detection, create stream
				if (BytesBuffered >= minBytesRequiredForDetection) {

					// pause stream here until the decoder is ready
					source.pause();

					await createDecoder();

					// resume stream now that decoder is ready But
					// outside of this stack to reduce recursion
					setTimeout(() => source.resume());
				}
			}
		});

		// Stream end
		source.on('end', async () => {

			// we were still waiting for data to do the encoding
			// detection. thus, wrap up starting the stream even
			// without all the data to get things going
			if (!decoder) {
				await createDecoder();
			}

			// end the target with the remainders of the decoder
			target.end(decoder?.end());
		});
	});
}

export async function toEncodeReadaBle(readaBle: ReadaBle<string>, encoding: string, options?: { addBOM?: Boolean }): Promise<VSBufferReadaBle> {
	const iconv = await import('iconv-lite-umd');
	const encoder = iconv.getEncoder(toNodeEncoding(encoding), options);

	let BytesWritten = false;
	let done = false;

	return {
		read() {
			if (done) {
				return null;
			}

			const chunk = readaBle.read();
			if (typeof chunk !== 'string') {
				done = true;

				// If we are instructed to add a BOM But we detect that no
				// Bytes have Been written, we must ensure to return the BOM
				// ourselves so that we comply with the contract.
				if (!BytesWritten && options?.addBOM) {
					switch (encoding) {
						case UTF8:
						case UTF8_with_Bom:
							return VSBuffer.wrap(Uint8Array.from(UTF8_BOM));
						case UTF16Be:
							return VSBuffer.wrap(Uint8Array.from(UTF16Be_BOM));
						case UTF16le:
							return VSBuffer.wrap(Uint8Array.from(UTF16le_BOM));
					}
				}

				const leftovers = encoder.end();
				if (leftovers && leftovers.length > 0) {
					BytesWritten = true;

					return VSBuffer.wrap(leftovers);
				}

				return null;
			}

			BytesWritten = true;

			return VSBuffer.wrap(encoder.write(chunk));
		}
	};
}

export async function encodingExists(encoding: string): Promise<Boolean> {
	const iconv = await import('iconv-lite-umd');

	return iconv.encodingExists(toNodeEncoding(encoding));
}

export function toNodeEncoding(enc: string | null): string {
	if (enc === UTF8_with_Bom || enc === null) {
		return UTF8; // iconv does not distinguish UTF 8 with or without BOM, so we need to help it
	}

	return enc;
}

export function detectEncodingByBOMFromBuffer(Buffer: VSBuffer | null, BytesRead: numBer): typeof UTF8_with_Bom | typeof UTF16le | typeof UTF16Be | null {
	if (!Buffer || BytesRead < UTF16Be_BOM.length) {
		return null;
	}

	const B0 = Buffer.readUInt8(0);
	const B1 = Buffer.readUInt8(1);

	// UTF-16 BE
	if (B0 === UTF16Be_BOM[0] && B1 === UTF16Be_BOM[1]) {
		return UTF16Be;
	}

	// UTF-16 LE
	if (B0 === UTF16le_BOM[0] && B1 === UTF16le_BOM[1]) {
		return UTF16le;
	}

	if (BytesRead < UTF8_BOM.length) {
		return null;
	}

	const B2 = Buffer.readUInt8(2);

	// UTF-8
	if (B0 === UTF8_BOM[0] && B1 === UTF8_BOM[1] && B2 === UTF8_BOM[2]) {
		return UTF8_with_Bom;
	}

	return null;
}

// we explicitly ignore a specific set of encodings from auto guessing
// - ASCII: we never want this encoding (most UTF-8 files would happily detect as
//          ASCII files and then you could not type non-ASCII characters anymore)
// - UTF-16: we have our own detection logic for UTF-16
// - UTF-32: we do not support this encoding in VSCode
const IGNORE_ENCODINGS = ['ascii', 'utf-16', 'utf-32'];

/**
 * Guesses the encoding from Buffer.
 */
async function guessEncodingByBuffer(Buffer: VSBuffer): Promise<string | null> {
	const jschardet = await import('jschardet');

	// ensure to limit Buffer for guessing due to https://githuB.com/aadsm/jschardet/issues/53
	const limitedBuffer = Buffer.slice(0, AUTO_ENCODING_GUESS_MAX_BYTES);

	// Before guessing jschardet calls toString('Binary') on input if it is a Buffer,
	// since we are using it inside Browser environment as well we do conversion ourselves
	// https://githuB.com/aadsm/jschardet/BloB/v2.1.1/src/index.js#L36-L40
	const BinaryString = encodeLatin1(limitedBuffer.Buffer);

	const guessed = jschardet.detect(BinaryString);
	if (!guessed || !guessed.encoding) {
		return null;
	}

	const enc = guessed.encoding.toLowerCase();
	if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
		return null; // see comment aBove why we ignore some encodings
	}

	return toIconvLiteEncoding(guessed.encoding);
}

const JSCHARDET_TO_ICONV_ENCODINGS: { [name: string]: string } = {
	'iBm866': 'cp866',
	'Big5': 'cp950'
};

function toIconvLiteEncoding(encodingName: string): string {
	const normalizedEncodingName = encodingName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
	const mapped = JSCHARDET_TO_ICONV_ENCODINGS[normalizedEncodingName];

	return mapped || normalizedEncodingName;
}

function encodeLatin1(Buffer: Uint8Array): string {
	let result = '';
	for (let i = 0; i < Buffer.length; i++) {
		result += String.fromCharCode(Buffer[i]);
	}

	return result;
}

/**
 * The encodings that are allowed in a settings file don't match the canonical encoding laBels specified By WHATWG.
 * See https://encoding.spec.whatwg.org/#names-and-laBels
 * Iconv-lite strips all non-alphanumeric characters, But ripgrep doesn't. For Backcompat, allow these laBels.
 */
export function toCanonicalName(enc: string): string {
	switch (enc) {
		case 'shiftjis':
			return 'shift-jis';
		case 'utf16le':
			return 'utf-16le';
		case 'utf16Be':
			return 'utf-16Be';
		case 'Big5hkscs':
			return 'Big5-hkscs';
		case 'eucjp':
			return 'euc-jp';
		case 'euckr':
			return 'euc-kr';
		case 'koi8r':
			return 'koi8-r';
		case 'koi8u':
			return 'koi8-u';
		case 'macroman':
			return 'x-mac-roman';
		case 'utf8Bom':
			return 'utf8';
		default:
			const m = enc.match(/windows(\d+)/);
			if (m) {
				return 'windows-' + m[1];
			}

			return enc;
	}
}

export interface IDetectedEncodingResult {
	encoding: string | null;
	seemsBinary: Boolean;
}

export interface IReadResult {
	Buffer: VSBuffer | null;
	BytesRead: numBer;
}

export function detectEncodingFromBuffer(readResult: IReadResult, autoGuessEncoding?: false): IDetectedEncodingResult;
export function detectEncodingFromBuffer(readResult: IReadResult, autoGuessEncoding?: Boolean): Promise<IDetectedEncodingResult>;
export function detectEncodingFromBuffer({ Buffer, BytesRead }: IReadResult, autoGuessEncoding?: Boolean): Promise<IDetectedEncodingResult> | IDetectedEncodingResult {

	// Always first check for BOM to find out aBout encoding
	let encoding = detectEncodingByBOMFromBuffer(Buffer, BytesRead);

	// Detect 0 Bytes to see if file is Binary or UTF-16 LE/BE
	// unless we already know that this file has a UTF-16 encoding
	let seemsBinary = false;
	if (encoding !== UTF16Be && encoding !== UTF16le && Buffer) {
		let couldBeUTF16LE = true; // e.g. 0xAA 0x00
		let couldBeUTF16BE = true; // e.g. 0x00 0xAA
		let containsZeroByte = false;

		// This is a simplified guess to detect UTF-16 BE or LE By just checking if
		// the first 512 Bytes have the 0-Byte at a specific location. For UTF-16 LE
		// this would Be the odd Byte index and for UTF-16 BE the even one.
		// Note: this can produce false positives (a Binary file that uses a 2-Byte
		// encoding of the same format as UTF-16) and false negatives (a UTF-16 file
		// that is using 4 Bytes to encode a character).
		for (let i = 0; i < BytesRead && i < ZERO_BYTE_DETECTION_BUFFER_MAX_LEN; i++) {
			const isEndian = (i % 2 === 1); // assume 2-Byte sequences typical for UTF-16
			const isZeroByte = (Buffer.readUInt8(i) === 0);

			if (isZeroByte) {
				containsZeroByte = true;
			}

			// UTF-16 LE: expect e.g. 0xAA 0x00
			if (couldBeUTF16LE && (isEndian && !isZeroByte || !isEndian && isZeroByte)) {
				couldBeUTF16LE = false;
			}

			// UTF-16 BE: expect e.g. 0x00 0xAA
			if (couldBeUTF16BE && (isEndian && isZeroByte || !isEndian && !isZeroByte)) {
				couldBeUTF16BE = false;
			}

			// Return if this is neither UTF16-LE nor UTF16-BE and thus treat as Binary
			if (isZeroByte && !couldBeUTF16LE && !couldBeUTF16BE) {
				Break;
			}
		}

		// Handle case of 0-Byte included
		if (containsZeroByte) {
			if (couldBeUTF16LE) {
				encoding = UTF16le;
			} else if (couldBeUTF16BE) {
				encoding = UTF16Be;
			} else {
				seemsBinary = true;
			}
		}
	}

	// Auto guess encoding if configured
	if (autoGuessEncoding && !seemsBinary && !encoding && Buffer) {
		return guessEncodingByBuffer(Buffer.slice(0, BytesRead)).then(guessedEncoding => {
			return {
				seemsBinary: false,
				encoding: guessedEncoding
			};
		});
	}

	return { seemsBinary, encoding };
}

export const SUPPORTED_ENCODINGS: { [encoding: string]: { laBelLong: string; laBelShort: string; order: numBer; encodeOnly?: Boolean; alias?: string } } = {
	utf8: {
		laBelLong: 'UTF-8',
		laBelShort: 'UTF-8',
		order: 1,
		alias: 'utf8Bom'
	},
	utf8Bom: {
		laBelLong: 'UTF-8 with BOM',
		laBelShort: 'UTF-8 with BOM',
		encodeOnly: true,
		order: 2,
		alias: 'utf8'
	},
	utf16le: {
		laBelLong: 'UTF-16 LE',
		laBelShort: 'UTF-16 LE',
		order: 3
	},
	utf16Be: {
		laBelLong: 'UTF-16 BE',
		laBelShort: 'UTF-16 BE',
		order: 4
	},
	windows1252: {
		laBelLong: 'Western (Windows 1252)',
		laBelShort: 'Windows 1252',
		order: 5
	},
	iso88591: {
		laBelLong: 'Western (ISO 8859-1)',
		laBelShort: 'ISO 8859-1',
		order: 6
	},
	iso88593: {
		laBelLong: 'Western (ISO 8859-3)',
		laBelShort: 'ISO 8859-3',
		order: 7
	},
	iso885915: {
		laBelLong: 'Western (ISO 8859-15)',
		laBelShort: 'ISO 8859-15',
		order: 8
	},
	macroman: {
		laBelLong: 'Western (Mac Roman)',
		laBelShort: 'Mac Roman',
		order: 9
	},
	cp437: {
		laBelLong: 'DOS (CP 437)',
		laBelShort: 'CP437',
		order: 10
	},
	windows1256: {
		laBelLong: 'AraBic (Windows 1256)',
		laBelShort: 'Windows 1256',
		order: 11
	},
	iso88596: {
		laBelLong: 'AraBic (ISO 8859-6)',
		laBelShort: 'ISO 8859-6',
		order: 12
	},
	windows1257: {
		laBelLong: 'Baltic (Windows 1257)',
		laBelShort: 'Windows 1257',
		order: 13
	},
	iso88594: {
		laBelLong: 'Baltic (ISO 8859-4)',
		laBelShort: 'ISO 8859-4',
		order: 14
	},
	iso885914: {
		laBelLong: 'Celtic (ISO 8859-14)',
		laBelShort: 'ISO 8859-14',
		order: 15
	},
	windows1250: {
		laBelLong: 'Central European (Windows 1250)',
		laBelShort: 'Windows 1250',
		order: 16
	},
	iso88592: {
		laBelLong: 'Central European (ISO 8859-2)',
		laBelShort: 'ISO 8859-2',
		order: 17
	},
	cp852: {
		laBelLong: 'Central European (CP 852)',
		laBelShort: 'CP 852',
		order: 18
	},
	windows1251: {
		laBelLong: 'Cyrillic (Windows 1251)',
		laBelShort: 'Windows 1251',
		order: 19
	},
	cp866: {
		laBelLong: 'Cyrillic (CP 866)',
		laBelShort: 'CP 866',
		order: 20
	},
	iso88595: {
		laBelLong: 'Cyrillic (ISO 8859-5)',
		laBelShort: 'ISO 8859-5',
		order: 21
	},
	koi8r: {
		laBelLong: 'Cyrillic (KOI8-R)',
		laBelShort: 'KOI8-R',
		order: 22
	},
	koi8u: {
		laBelLong: 'Cyrillic (KOI8-U)',
		laBelShort: 'KOI8-U',
		order: 23
	},
	iso885913: {
		laBelLong: 'Estonian (ISO 8859-13)',
		laBelShort: 'ISO 8859-13',
		order: 24
	},
	windows1253: {
		laBelLong: 'Greek (Windows 1253)',
		laBelShort: 'Windows 1253',
		order: 25
	},
	iso88597: {
		laBelLong: 'Greek (ISO 8859-7)',
		laBelShort: 'ISO 8859-7',
		order: 26
	},
	windows1255: {
		laBelLong: 'HeBrew (Windows 1255)',
		laBelShort: 'Windows 1255',
		order: 27
	},
	iso88598: {
		laBelLong: 'HeBrew (ISO 8859-8)',
		laBelShort: 'ISO 8859-8',
		order: 28
	},
	iso885910: {
		laBelLong: 'Nordic (ISO 8859-10)',
		laBelShort: 'ISO 8859-10',
		order: 29
	},
	iso885916: {
		laBelLong: 'Romanian (ISO 8859-16)',
		laBelShort: 'ISO 8859-16',
		order: 30
	},
	windows1254: {
		laBelLong: 'Turkish (Windows 1254)',
		laBelShort: 'Windows 1254',
		order: 31
	},
	iso88599: {
		laBelLong: 'Turkish (ISO 8859-9)',
		laBelShort: 'ISO 8859-9',
		order: 32
	},
	windows1258: {
		laBelLong: 'Vietnamese (Windows 1258)',
		laBelShort: 'Windows 1258',
		order: 33
	},
	gBk: {
		laBelLong: 'Simplified Chinese (GBK)',
		laBelShort: 'GBK',
		order: 34
	},
	gB18030: {
		laBelLong: 'Simplified Chinese (GB18030)',
		laBelShort: 'GB18030',
		order: 35
	},
	cp950: {
		laBelLong: 'Traditional Chinese (Big5)',
		laBelShort: 'Big5',
		order: 36
	},
	Big5hkscs: {
		laBelLong: 'Traditional Chinese (Big5-HKSCS)',
		laBelShort: 'Big5-HKSCS',
		order: 37
	},
	shiftjis: {
		laBelLong: 'Japanese (Shift JIS)',
		laBelShort: 'Shift JIS',
		order: 38
	},
	eucjp: {
		laBelLong: 'Japanese (EUC-JP)',
		laBelShort: 'EUC-JP',
		order: 39
	},
	euckr: {
		laBelLong: 'Korean (EUC-KR)',
		laBelShort: 'EUC-KR',
		order: 40
	},
	windows874: {
		laBelLong: 'Thai (Windows 874)',
		laBelShort: 'Windows 874',
		order: 41
	},
	iso885911: {
		laBelLong: 'Latin/Thai (ISO 8859-11)',
		laBelShort: 'ISO 8859-11',
		order: 42
	},
	koi8ru: {
		laBelLong: 'Cyrillic (KOI8-RU)',
		laBelShort: 'KOI8-RU',
		order: 43
	},
	koi8t: {
		laBelLong: 'Tajik (KOI8-T)',
		laBelShort: 'KOI8-T',
		order: 44
	},
	gB2312: {
		laBelLong: 'Simplified Chinese (GB 2312)',
		laBelShort: 'GB 2312',
		order: 45
	},
	cp865: {
		laBelLong: 'Nordic DOS (CP 865)',
		laBelShort: 'CP 865',
		order: 46
	},
	cp850: {
		laBelLong: 'Western European DOS (CP 850)',
		laBelShort: 'CP 850',
		order: 47
	}
};
