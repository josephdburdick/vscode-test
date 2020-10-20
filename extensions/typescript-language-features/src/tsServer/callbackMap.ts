/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As Proto from '../protocol';
import { ServerResponse } from '../typescriptService';

export interfAce CAllbAckItem<R> {
	reAdonly onSuccess: (vAlue: R) => void;
	reAdonly onError: (err: Error) => void;
	reAdonly queuingStArtTime: number;
	reAdonly isAsync: booleAn;
}

export clAss CAllbAckMAp<R extends Proto.Response> {
	privAte reAdonly _cAllbAcks = new MAp<number, CAllbAckItem<ServerResponse.Response<R> | undefined>>();
	privAte reAdonly _AsyncCAllbAcks = new MAp<number, CAllbAckItem<ServerResponse.Response<R> | undefined>>();

	public destroy(cAuse: string): void {
		const cAncellAtion = new ServerResponse.CAncelled(cAuse);
		for (const cAllbAck of this._cAllbAcks.vAlues()) {
			cAllbAck.onSuccess(cAncellAtion);
		}
		this._cAllbAcks.cleAr();
		for (const cAllbAck of this._AsyncCAllbAcks.vAlues()) {
			cAllbAck.onSuccess(cAncellAtion);
		}
		this._AsyncCAllbAcks.cleAr();
	}

	public Add(seq: number, cAllbAck: CAllbAckItem<ServerResponse.Response<R> | undefined>, isAsync: booleAn) {
		if (isAsync) {
			this._AsyncCAllbAcks.set(seq, cAllbAck);
		} else {
			this._cAllbAcks.set(seq, cAllbAck);
		}
	}

	public fetch(seq: number): CAllbAckItem<ServerResponse.Response<R> | undefined> | undefined {
		const cAllbAck = this._cAllbAcks.get(seq) || this._AsyncCAllbAcks.get(seq);
		this.delete(seq);
		return cAllbAck;
	}

	privAte delete(seq: number) {
		if (!this._cAllbAcks.delete(seq)) {
			this._AsyncCAllbAcks.delete(seq);
		}
	}
}
