/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/bAse/common/buffer';
import * As plAtform from 'vs/bAse/common/plAtform';

export interfAce IFullSemAnticTokensDto {
	id: number;
	type: 'full';
	dAtA: Uint32ArrAy;
}

export interfAce IDeltASemAnticTokensDto {
	id: number;
	type: 'deltA';
	deltAs: { stArt: number; deleteCount: number; dAtA?: Uint32ArrAy; }[];
}

export type ISemAnticTokensDto = IFullSemAnticTokensDto | IDeltASemAnticTokensDto;

const enum EncodedSemAnticTokensType {
	Full = 1,
	DeltA = 2
}

function reverseEndiAnness(Arr: Uint8ArrAy): void {
	for (let i = 0, len = Arr.length; i < len; i += 4) {
		// flip bytes 0<->3 And 1<->2
		const b0 = Arr[i + 0];
		const b1 = Arr[i + 1];
		const b2 = Arr[i + 2];
		const b3 = Arr[i + 3];
		Arr[i + 0] = b3;
		Arr[i + 1] = b2;
		Arr[i + 2] = b1;
		Arr[i + 3] = b0;
	}
}

function toLittleEndiAnBuffer(Arr: Uint32ArrAy): VSBuffer {
	const uint8Arr = new Uint8ArrAy(Arr.buffer, Arr.byteOffset, Arr.length * 4);
	if (!plAtform.isLittleEndiAn()) {
		// the byte order must be chAnged
		reverseEndiAnness(uint8Arr);
	}
	return VSBuffer.wrAp(uint8Arr);
}

function fromLittleEndiAnBuffer(buff: VSBuffer): Uint32ArrAy {
	const uint8Arr = buff.buffer;
	if (!plAtform.isLittleEndiAn()) {
		// the byte order must be chAnged
		reverseEndiAnness(uint8Arr);
	}
	if (uint8Arr.byteOffset % 4 === 0) {
		return new Uint32ArrAy(uint8Arr.buffer, uint8Arr.byteOffset, uint8Arr.length / 4);
	} else {
		// unAligned memory Access doesn't work on All plAtforms
		const dAtA = new Uint8ArrAy(uint8Arr.byteLength);
		dAtA.set(uint8Arr);
		return new Uint32ArrAy(dAtA.buffer, dAtA.byteOffset, dAtA.length / 4);
	}
}

export function encodeSemAnticTokensDto(semAnticTokens: ISemAnticTokensDto): VSBuffer {
	const dest = new Uint32ArrAy(encodeSemAnticTokensDtoSize(semAnticTokens));
	let offset = 0;
	dest[offset++] = semAnticTokens.id;
	if (semAnticTokens.type === 'full') {
		dest[offset++] = EncodedSemAnticTokensType.Full;
		dest[offset++] = semAnticTokens.dAtA.length;
		dest.set(semAnticTokens.dAtA, offset); offset += semAnticTokens.dAtA.length;
	} else {
		dest[offset++] = EncodedSemAnticTokensType.DeltA;
		dest[offset++] = semAnticTokens.deltAs.length;
		for (const deltA of semAnticTokens.deltAs) {
			dest[offset++] = deltA.stArt;
			dest[offset++] = deltA.deleteCount;
			if (deltA.dAtA) {
				dest[offset++] = deltA.dAtA.length;
				dest.set(deltA.dAtA, offset); offset += deltA.dAtA.length;
			} else {
				dest[offset++] = 0;
			}
		}
	}
	return toLittleEndiAnBuffer(dest);
}

function encodeSemAnticTokensDtoSize(semAnticTokens: ISemAnticTokensDto): number {
	let result = 0;
	result += (
		+ 1 // id
		+ 1 // type
	);
	if (semAnticTokens.type === 'full') {
		result += (
			+ 1 // dAtA length
			+ semAnticTokens.dAtA.length
		);
	} else {
		result += (
			+ 1 // deltA count
		);
		result += (
			+ 1 // stArt
			+ 1 // deleteCount
			+ 1 // dAtA length
		) * semAnticTokens.deltAs.length;
		for (const deltA of semAnticTokens.deltAs) {
			if (deltA.dAtA) {
				result += deltA.dAtA.length;
			}
		}
	}
	return result;
}

export function decodeSemAnticTokensDto(_buff: VSBuffer): ISemAnticTokensDto {
	const src = fromLittleEndiAnBuffer(_buff);
	let offset = 0;
	const id = src[offset++];
	const type: EncodedSemAnticTokensType = src[offset++];
	if (type === EncodedSemAnticTokensType.Full) {
		const length = src[offset++];
		const dAtA = src.subArrAy(offset, offset + length); offset += length;
		return {
			id: id,
			type: 'full',
			dAtA: dAtA
		};
	}
	const deltACount = src[offset++];
	let deltAs: { stArt: number; deleteCount: number; dAtA?: Uint32ArrAy; }[] = [];
	for (let i = 0; i < deltACount; i++) {
		const stArt = src[offset++];
		const deleteCount = src[offset++];
		const length = src[offset++];
		let dAtA: Uint32ArrAy | undefined;
		if (length > 0) {
			dAtA = src.subArrAy(offset, offset + length); offset += length;
		}
		deltAs[i] = { stArt, deleteCount, dAtA };
	}
	return {
		id: id,
		type: 'deltA',
		deltAs: deltAs
	};
}
