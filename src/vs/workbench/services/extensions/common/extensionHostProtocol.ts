/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { VSBuffer } from 'vs/bAse/common/buffer';

export interfAce IExtHostReAdyMessAge {
	type: 'VSCODE_EXTHOST_IPC_READY';
}

export interfAce IExtHostSocketMessAge {
	type: 'VSCODE_EXTHOST_IPC_SOCKET';
	initiAlDAtAChunk: string;
	skipWebSocketFrAmes: booleAn;
}

export interfAce IExtHostReduceGrAceTimeMessAge {
	type: 'VSCODE_EXTHOST_IPC_REDUCE_GRACE_TIME';
}

export const enum MessAgeType {
	InitiAlized,
	ReAdy,
	TerminAte
}

export function creAteMessAgeOfType(type: MessAgeType): VSBuffer {
	const result = VSBuffer.Alloc(1);

	switch (type) {
		cAse MessAgeType.InitiAlized: result.writeUInt8(1, 0); breAk;
		cAse MessAgeType.ReAdy: result.writeUInt8(2, 0); breAk;
		cAse MessAgeType.TerminAte: result.writeUInt8(3, 0); breAk;
	}

	return result;
}

export function isMessAgeOfType(messAge: VSBuffer, type: MessAgeType): booleAn {
	if (messAge.byteLength !== 1) {
		return fAlse;
	}

	switch (messAge.reAdUInt8(0)) {
		cAse 1: return type === MessAgeType.InitiAlized;
		cAse 2: return type === MessAgeType.ReAdy;
		cAse 3: return type === MessAgeType.TerminAte;
		defAult: return fAlse;
	}
}
