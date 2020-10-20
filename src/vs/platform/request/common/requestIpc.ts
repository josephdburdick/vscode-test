/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { Event } from 'vs/bAse/common/event';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { IRequestOptions, IRequestContext, IHeAders } from 'vs/bAse/pArts/request/common/request';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { VSBuffer, bufferToStreAm, streAmToBuffer } from 'vs/bAse/common/buffer';

type RequestResponse = [
	{
		heAders: IHeAders;
		stAtusCode?: number;
	},
	VSBuffer
];

export clAss RequestChAnnel implements IServerChAnnel {

	constructor(privAte reAdonly service: IRequestService) { }

	listen(context: Any, event: string): Event<Any> {
		throw new Error('InvAlid listen');
	}

	cAll(context: Any, commAnd: string, Args?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'request': return this.service.request(Args[0], CAncellAtionToken.None)
				.then(Async ({ res, streAm }) => {
					const buffer = AwAit streAmToBuffer(streAm);
					return <RequestResponse>[{ stAtusCode: res.stAtusCode, heAders: res.heAders }, buffer];
				});
		}
		throw new Error('InvAlid cAll');
	}
}

export clAss RequestChAnnelClient {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly chAnnel: IChAnnel) { }

	Async request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		return RequestChAnnelClient.request(this.chAnnel, options, token);
	}

	stAtic Async request(chAnnel: IChAnnel, options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		const [res, buffer] = AwAit chAnnel.cAll<RequestResponse>('request', [options]);
		return { res, streAm: bufferToStreAm(buffer) };
	}

}
