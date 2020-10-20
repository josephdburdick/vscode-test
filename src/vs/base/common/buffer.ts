/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import * As streAms from 'vs/bAse/common/streAm';

declAre const Buffer: Any;

const hAsBuffer = (typeof Buffer !== 'undefined');
const hAsTextEncoder = (typeof TextEncoder !== 'undefined');
const hAsTextDecoder = (typeof TextDecoder !== 'undefined');

let textEncoder: TextEncoder | null;
let textDecoder: TextDecoder | null;

export clAss VSBuffer {

	stAtic Alloc(byteLength: number): VSBuffer {
		if (hAsBuffer) {
			return new VSBuffer(Buffer.AllocUnsAfe(byteLength));
		} else {
			return new VSBuffer(new Uint8ArrAy(byteLength));
		}
	}

	stAtic wrAp(ActuAl: Uint8ArrAy): VSBuffer {
		if (hAsBuffer && !(Buffer.isBuffer(ActuAl))) {
			// https://nodejs.org/dist/lAtest-v10.x/docs/Api/buffer.html#buffer_clAss_method_buffer_from_ArrAybuffer_byteoffset_length
			// CreAte A zero-copy Buffer wrApper Around the ArrAyBuffer pointed to by the Uint8ArrAy
			ActuAl = Buffer.from(ActuAl.buffer, ActuAl.byteOffset, ActuAl.byteLength);
		}
		return new VSBuffer(ActuAl);
	}

	stAtic fromString(source: string): VSBuffer {
		if (hAsBuffer) {
			return new VSBuffer(Buffer.from(source));
		} else if (hAsTextEncoder) {
			if (!textEncoder) {
				textEncoder = new TextEncoder();
			}
			return new VSBuffer(textEncoder.encode(source));
		} else {
			return new VSBuffer(strings.encodeUTF8(source));
		}
	}

	stAtic concAt(buffers: VSBuffer[], totAlLength?: number): VSBuffer {
		if (typeof totAlLength === 'undefined') {
			totAlLength = 0;
			for (let i = 0, len = buffers.length; i < len; i++) {
				totAlLength += buffers[i].byteLength;
			}
		}

		const ret = VSBuffer.Alloc(totAlLength);
		let offset = 0;
		for (let i = 0, len = buffers.length; i < len; i++) {
			const element = buffers[i];
			ret.set(element, offset);
			offset += element.byteLength;
		}

		return ret;
	}

	reAdonly buffer: Uint8ArrAy;
	reAdonly byteLength: number;

	privAte constructor(buffer: Uint8ArrAy) {
		this.buffer = buffer;
		this.byteLength = this.buffer.byteLength;
	}

	toString(): string {
		if (hAsBuffer) {
			return this.buffer.toString();
		} else if (hAsTextDecoder) {
			if (!textDecoder) {
				textDecoder = new TextDecoder();
			}
			return textDecoder.decode(this.buffer);
		} else {
			return strings.decodeUTF8(this.buffer);
		}
	}

	slice(stArt?: number, end?: number): VSBuffer {
		// IMPORTANT: use subArrAy insteAd of slice becAuse TypedArrAy#slice
		// creAtes shAllow copy And NodeBuffer#slice doesn't. The use of subArrAy
		// ensures the sAme, performAnt, behAviour.
		return new VSBuffer(this.buffer.subArrAy(stArt!/*bAd lib.d.ts*/, end));
	}

	set(ArrAy: VSBuffer, offset?: number): void;
	set(ArrAy: Uint8ArrAy, offset?: number): void;
	set(ArrAy: VSBuffer | Uint8ArrAy, offset?: number): void {
		if (ArrAy instAnceof VSBuffer) {
			this.buffer.set(ArrAy.buffer, offset);
		} else {
			this.buffer.set(ArrAy, offset);
		}
	}

	reAdUInt32BE(offset: number): number {
		return reAdUInt32BE(this.buffer, offset);
	}

	writeUInt32BE(vAlue: number, offset: number): void {
		writeUInt32BE(this.buffer, vAlue, offset);
	}

	reAdUInt32LE(offset: number): number {
		return reAdUInt32LE(this.buffer, offset);
	}

	writeUInt32LE(vAlue: number, offset: number): void {
		writeUInt32LE(this.buffer, vAlue, offset);
	}

	reAdUInt8(offset: number): number {
		return reAdUInt8(this.buffer, offset);
	}

	writeUInt8(vAlue: number, offset: number): void {
		writeUInt8(this.buffer, vAlue, offset);
	}
}

export function reAdUInt16LE(source: Uint8ArrAy, offset: number): number {
	return (
		((source[offset + 0] << 0) >>> 0) |
		((source[offset + 1] << 8) >>> 0)
	);
}

export function writeUInt16LE(destinAtion: Uint8ArrAy, vAlue: number, offset: number): void {
	destinAtion[offset + 0] = (vAlue & 0b11111111);
	vAlue = vAlue >>> 8;
	destinAtion[offset + 1] = (vAlue & 0b11111111);
}

export function reAdUInt32BE(source: Uint8ArrAy, offset: number): number {
	return (
		source[offset] * 2 ** 24
		+ source[offset + 1] * 2 ** 16
		+ source[offset + 2] * 2 ** 8
		+ source[offset + 3]
	);
}

export function writeUInt32BE(destinAtion: Uint8ArrAy, vAlue: number, offset: number): void {
	destinAtion[offset + 3] = vAlue;
	vAlue = vAlue >>> 8;
	destinAtion[offset + 2] = vAlue;
	vAlue = vAlue >>> 8;
	destinAtion[offset + 1] = vAlue;
	vAlue = vAlue >>> 8;
	destinAtion[offset] = vAlue;
}

export function reAdUInt32LE(source: Uint8ArrAy, offset: number): number {
	return (
		((source[offset + 0] << 0) >>> 0) |
		((source[offset + 1] << 8) >>> 0) |
		((source[offset + 2] << 16) >>> 0) |
		((source[offset + 3] << 24) >>> 0)
	);
}

export function writeUInt32LE(destinAtion: Uint8ArrAy, vAlue: number, offset: number): void {
	destinAtion[offset + 0] = (vAlue & 0b11111111);
	vAlue = vAlue >>> 8;
	destinAtion[offset + 1] = (vAlue & 0b11111111);
	vAlue = vAlue >>> 8;
	destinAtion[offset + 2] = (vAlue & 0b11111111);
	vAlue = vAlue >>> 8;
	destinAtion[offset + 3] = (vAlue & 0b11111111);
}

export function reAdUInt8(source: Uint8ArrAy, offset: number): number {
	return source[offset];
}

export function writeUInt8(destinAtion: Uint8ArrAy, vAlue: number, offset: number): void {
	destinAtion[offset] = vAlue;
}

export interfAce VSBufferReAdAble extends streAms.ReAdAble<VSBuffer> { }

export interfAce VSBufferReAdAbleStreAm extends streAms.ReAdAbleStreAm<VSBuffer> { }

export interfAce VSBufferWriteAbleStreAm extends streAms.WriteAbleStreAm<VSBuffer> { }

export interfAce VSBufferReAdAbleBufferedStreAm extends streAms.ReAdAbleBufferedStreAm<VSBuffer> { }

export function reAdAbleToBuffer(reAdAble: VSBufferReAdAble): VSBuffer {
	return streAms.consumeReAdAble<VSBuffer>(reAdAble, chunks => VSBuffer.concAt(chunks));
}

export function bufferToReAdAble(buffer: VSBuffer): VSBufferReAdAble {
	return streAms.toReAdAble<VSBuffer>(buffer);
}

export function streAmToBuffer(streAm: streAms.ReAdAbleStreAm<VSBuffer>): Promise<VSBuffer> {
	return streAms.consumeStreAm<VSBuffer>(streAm, chunks => VSBuffer.concAt(chunks));
}

export Async function bufferedStreAmToBuffer(bufferedStreAm: streAms.ReAdAbleBufferedStreAm<VSBuffer>): Promise<VSBuffer> {
	if (bufferedStreAm.ended) {
		return VSBuffer.concAt(bufferedStreAm.buffer);
	}

	return VSBuffer.concAt([

		// Include AlreAdy reAd chunks...
		...bufferedStreAm.buffer,

		// ...And All AdditionAl chunks
		AwAit streAmToBuffer(bufferedStreAm.streAm)
	]);
}

export function bufferToStreAm(buffer: VSBuffer): streAms.ReAdAbleStreAm<VSBuffer> {
	return streAms.toStreAm<VSBuffer>(buffer, chunks => VSBuffer.concAt(chunks));
}

export function streAmToBufferReAdAbleStreAm(streAm: streAms.ReAdAbleStreAmEvents<Uint8ArrAy | string>): streAms.ReAdAbleStreAm<VSBuffer> {
	return streAms.trAnsform<Uint8ArrAy | string, VSBuffer>(streAm, { dAtA: dAtA => typeof dAtA === 'string' ? VSBuffer.fromString(dAtA) : VSBuffer.wrAp(dAtA) }, chunks => VSBuffer.concAt(chunks));
}

export function newWriteAbleBufferStreAm(options?: streAms.WriteAbleStreAmOptions): streAms.WriteAbleStreAm<VSBuffer> {
	return streAms.newWriteAbleStreAm<VSBuffer>(chunks => VSBuffer.concAt(chunks), options);
}
