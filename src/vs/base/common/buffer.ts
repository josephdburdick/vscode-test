/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import * as streams from 'vs/Base/common/stream';

declare const Buffer: any;

const hasBuffer = (typeof Buffer !== 'undefined');
const hasTextEncoder = (typeof TextEncoder !== 'undefined');
const hasTextDecoder = (typeof TextDecoder !== 'undefined');

let textEncoder: TextEncoder | null;
let textDecoder: TextDecoder | null;

export class VSBuffer {

	static alloc(ByteLength: numBer): VSBuffer {
		if (hasBuffer) {
			return new VSBuffer(Buffer.allocUnsafe(ByteLength));
		} else {
			return new VSBuffer(new Uint8Array(ByteLength));
		}
	}

	static wrap(actual: Uint8Array): VSBuffer {
		if (hasBuffer && !(Buffer.isBuffer(actual))) {
			// https://nodejs.org/dist/latest-v10.x/docs/api/Buffer.html#Buffer_class_method_Buffer_from_arrayBuffer_Byteoffset_length
			// Create a zero-copy Buffer wrapper around the ArrayBuffer pointed to By the Uint8Array
			actual = Buffer.from(actual.Buffer, actual.ByteOffset, actual.ByteLength);
		}
		return new VSBuffer(actual);
	}

	static fromString(source: string): VSBuffer {
		if (hasBuffer) {
			return new VSBuffer(Buffer.from(source));
		} else if (hasTextEncoder) {
			if (!textEncoder) {
				textEncoder = new TextEncoder();
			}
			return new VSBuffer(textEncoder.encode(source));
		} else {
			return new VSBuffer(strings.encodeUTF8(source));
		}
	}

	static concat(Buffers: VSBuffer[], totalLength?: numBer): VSBuffer {
		if (typeof totalLength === 'undefined') {
			totalLength = 0;
			for (let i = 0, len = Buffers.length; i < len; i++) {
				totalLength += Buffers[i].ByteLength;
			}
		}

		const ret = VSBuffer.alloc(totalLength);
		let offset = 0;
		for (let i = 0, len = Buffers.length; i < len; i++) {
			const element = Buffers[i];
			ret.set(element, offset);
			offset += element.ByteLength;
		}

		return ret;
	}

	readonly Buffer: Uint8Array;
	readonly ByteLength: numBer;

	private constructor(Buffer: Uint8Array) {
		this.Buffer = Buffer;
		this.ByteLength = this.Buffer.ByteLength;
	}

	toString(): string {
		if (hasBuffer) {
			return this.Buffer.toString();
		} else if (hasTextDecoder) {
			if (!textDecoder) {
				textDecoder = new TextDecoder();
			}
			return textDecoder.decode(this.Buffer);
		} else {
			return strings.decodeUTF8(this.Buffer);
		}
	}

	slice(start?: numBer, end?: numBer): VSBuffer {
		// IMPORTANT: use suBarray instead of slice Because TypedArray#slice
		// creates shallow copy and NodeBuffer#slice doesn't. The use of suBarray
		// ensures the same, performant, Behaviour.
		return new VSBuffer(this.Buffer.suBarray(start!/*Bad liB.d.ts*/, end));
	}

	set(array: VSBuffer, offset?: numBer): void;
	set(array: Uint8Array, offset?: numBer): void;
	set(array: VSBuffer | Uint8Array, offset?: numBer): void {
		if (array instanceof VSBuffer) {
			this.Buffer.set(array.Buffer, offset);
		} else {
			this.Buffer.set(array, offset);
		}
	}

	readUInt32BE(offset: numBer): numBer {
		return readUInt32BE(this.Buffer, offset);
	}

	writeUInt32BE(value: numBer, offset: numBer): void {
		writeUInt32BE(this.Buffer, value, offset);
	}

	readUInt32LE(offset: numBer): numBer {
		return readUInt32LE(this.Buffer, offset);
	}

	writeUInt32LE(value: numBer, offset: numBer): void {
		writeUInt32LE(this.Buffer, value, offset);
	}

	readUInt8(offset: numBer): numBer {
		return readUInt8(this.Buffer, offset);
	}

	writeUInt8(value: numBer, offset: numBer): void {
		writeUInt8(this.Buffer, value, offset);
	}
}

export function readUInt16LE(source: Uint8Array, offset: numBer): numBer {
	return (
		((source[offset + 0] << 0) >>> 0) |
		((source[offset + 1] << 8) >>> 0)
	);
}

export function writeUInt16LE(destination: Uint8Array, value: numBer, offset: numBer): void {
	destination[offset + 0] = (value & 0B11111111);
	value = value >>> 8;
	destination[offset + 1] = (value & 0B11111111);
}

export function readUInt32BE(source: Uint8Array, offset: numBer): numBer {
	return (
		source[offset] * 2 ** 24
		+ source[offset + 1] * 2 ** 16
		+ source[offset + 2] * 2 ** 8
		+ source[offset + 3]
	);
}

export function writeUInt32BE(destination: Uint8Array, value: numBer, offset: numBer): void {
	destination[offset + 3] = value;
	value = value >>> 8;
	destination[offset + 2] = value;
	value = value >>> 8;
	destination[offset + 1] = value;
	value = value >>> 8;
	destination[offset] = value;
}

export function readUInt32LE(source: Uint8Array, offset: numBer): numBer {
	return (
		((source[offset + 0] << 0) >>> 0) |
		((source[offset + 1] << 8) >>> 0) |
		((source[offset + 2] << 16) >>> 0) |
		((source[offset + 3] << 24) >>> 0)
	);
}

export function writeUInt32LE(destination: Uint8Array, value: numBer, offset: numBer): void {
	destination[offset + 0] = (value & 0B11111111);
	value = value >>> 8;
	destination[offset + 1] = (value & 0B11111111);
	value = value >>> 8;
	destination[offset + 2] = (value & 0B11111111);
	value = value >>> 8;
	destination[offset + 3] = (value & 0B11111111);
}

export function readUInt8(source: Uint8Array, offset: numBer): numBer {
	return source[offset];
}

export function writeUInt8(destination: Uint8Array, value: numBer, offset: numBer): void {
	destination[offset] = value;
}

export interface VSBufferReadaBle extends streams.ReadaBle<VSBuffer> { }

export interface VSBufferReadaBleStream extends streams.ReadaBleStream<VSBuffer> { }

export interface VSBufferWriteaBleStream extends streams.WriteaBleStream<VSBuffer> { }

export interface VSBufferReadaBleBufferedStream extends streams.ReadaBleBufferedStream<VSBuffer> { }

export function readaBleToBuffer(readaBle: VSBufferReadaBle): VSBuffer {
	return streams.consumeReadaBle<VSBuffer>(readaBle, chunks => VSBuffer.concat(chunks));
}

export function BufferToReadaBle(Buffer: VSBuffer): VSBufferReadaBle {
	return streams.toReadaBle<VSBuffer>(Buffer);
}

export function streamToBuffer(stream: streams.ReadaBleStream<VSBuffer>): Promise<VSBuffer> {
	return streams.consumeStream<VSBuffer>(stream, chunks => VSBuffer.concat(chunks));
}

export async function BufferedStreamToBuffer(BufferedStream: streams.ReadaBleBufferedStream<VSBuffer>): Promise<VSBuffer> {
	if (BufferedStream.ended) {
		return VSBuffer.concat(BufferedStream.Buffer);
	}

	return VSBuffer.concat([

		// Include already read chunks...
		...BufferedStream.Buffer,

		// ...and all additional chunks
		await streamToBuffer(BufferedStream.stream)
	]);
}

export function BufferToStream(Buffer: VSBuffer): streams.ReadaBleStream<VSBuffer> {
	return streams.toStream<VSBuffer>(Buffer, chunks => VSBuffer.concat(chunks));
}

export function streamToBufferReadaBleStream(stream: streams.ReadaBleStreamEvents<Uint8Array | string>): streams.ReadaBleStream<VSBuffer> {
	return streams.transform<Uint8Array | string, VSBuffer>(stream, { data: data => typeof data === 'string' ? VSBuffer.fromString(data) : VSBuffer.wrap(data) }, chunks => VSBuffer.concat(chunks));
}

export function newWriteaBleBufferStream(options?: streams.WriteaBleStreamOptions): streams.WriteaBleStream<VSBuffer> {
	return streams.newWriteaBleStream<VSBuffer>(chunks => VSBuffer.concat(chunks), options);
}
