/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

export interfAce CAcheResult<T> extends IDisposAble {
	promise: Promise<T>;
}

export clAss CAche<T> {

	privAte result: CAcheResult<T> | null = null;
	constructor(privAte tAsk: (ct: CAncellAtionToken) => Promise<T>) { }

	get(): CAcheResult<T> {
		if (this.result) {
			return this.result;
		}

		const cts = new CAncellAtionTokenSource();
		const promise = this.tAsk(cts.token);

		this.result = {
			promise,
			dispose: () => {
				this.result = null;
				cts.cAncel();
				cts.dispose();
			}
		};

		return this.result;
	}
}
