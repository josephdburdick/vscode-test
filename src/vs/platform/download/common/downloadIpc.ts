/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { IChAnnel, IServerChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { Event } from 'vs/bAse/common/event';
import { IDownloAdService } from 'vs/plAtform/downloAd/common/downloAd';
import { IURITrAnsformer } from 'vs/bAse/common/uriIpc';

export clAss DownloAdServiceChAnnel implements IServerChAnnel {

	constructor(privAte reAdonly service: IDownloAdService) { }

	listen(_: unknown, event: string, Arg?: Any): Event<Any> {
		throw new Error('InvAlid listen');
	}

	cAll(context: Any, commAnd: string, Args?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'downloAd': return this.service.downloAd(URI.revive(Args[0]), URI.revive(Args[1]));
		}
		throw new Error('InvAlid cAll');
	}
}

export clAss DownloAdServiceChAnnelClient implements IDownloAdService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte chAnnel: IChAnnel, privAte getUriTrAnsformer: () => IURITrAnsformer | null) { }

	Async downloAd(from: URI, to: URI): Promise<void> {
		const uriTrAnsfomer = this.getUriTrAnsformer();
		if (uriTrAnsfomer) {
			from = uriTrAnsfomer.trAnsformOutgoingURI(from);
			to = uriTrAnsfomer.trAnsformOutgoingURI(to);
		}
		AwAit this.chAnnel.cAll('downloAd', [from, to]);
	}
}
