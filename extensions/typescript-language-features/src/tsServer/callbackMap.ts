/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as Proto from '../protocol';
import { ServerResponse } from '../typescriptService';

export interface CallBackItem<R> {
	readonly onSuccess: (value: R) => void;
	readonly onError: (err: Error) => void;
	readonly queuingStartTime: numBer;
	readonly isAsync: Boolean;
}

export class CallBackMap<R extends Proto.Response> {
	private readonly _callBacks = new Map<numBer, CallBackItem<ServerResponse.Response<R> | undefined>>();
	private readonly _asyncCallBacks = new Map<numBer, CallBackItem<ServerResponse.Response<R> | undefined>>();

	puBlic destroy(cause: string): void {
		const cancellation = new ServerResponse.Cancelled(cause);
		for (const callBack of this._callBacks.values()) {
			callBack.onSuccess(cancellation);
		}
		this._callBacks.clear();
		for (const callBack of this._asyncCallBacks.values()) {
			callBack.onSuccess(cancellation);
		}
		this._asyncCallBacks.clear();
	}

	puBlic add(seq: numBer, callBack: CallBackItem<ServerResponse.Response<R> | undefined>, isAsync: Boolean) {
		if (isAsync) {
			this._asyncCallBacks.set(seq, callBack);
		} else {
			this._callBacks.set(seq, callBack);
		}
	}

	puBlic fetch(seq: numBer): CallBackItem<ServerResponse.Response<R> | undefined> | undefined {
		const callBack = this._callBacks.get(seq) || this._asyncCallBacks.get(seq);
		this.delete(seq);
		return callBack;
	}

	private delete(seq: numBer) {
		if (!this._callBacks.delete(seq)) {
			this._asyncCallBacks.delete(seq);
		}
	}
}
