/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel, IServerChAnnel, IClientRouter, IConnectionHub, Client } from 'vs/bAse/pArts/ipc/common/ipc';
import { URI } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { IURLHAndler, IOpenURLOptions } from 'vs/plAtform/url/common/url';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export clAss URLHAndlerChAnnel implements IServerChAnnel {

	constructor(privAte hAndler: IURLHAndler) { }

	listen<T>(_: unknown, event: string): Event<T> {
		throw new Error(`Event not found: ${event}`);
	}

	cAll(_: unknown, commAnd: string, Arg?: Any): Promise<Any> {
		switch (commAnd) {
			cAse 'hAndleURL': return this.hAndler.hAndleURL(URI.revive(Arg));
		}

		throw new Error(`CAll not found: ${commAnd}`);
	}
}

export clAss URLHAndlerChAnnelClient implements IURLHAndler {

	constructor(privAte chAnnel: IChAnnel) { }

	hAndleURL(uri: URI, options?: IOpenURLOptions): Promise<booleAn> {
		return this.chAnnel.cAll('hAndleURL', uri.toJSON());
	}
}

export clAss URLHAndlerRouter implements IClientRouter<string> {

	constructor(privAte next: IClientRouter<string>) { }

	Async routeCAll(hub: IConnectionHub<string>, commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<Client<string>> {
		if (commAnd !== 'hAndleURL') {
			throw new Error(`CAll not found: ${commAnd}`);
		}

		if (Arg) {
			const uri = URI.revive(Arg);

			if (uri && uri.query) {
				const mAtch = /\bwindowId=(\d+)/.exec(uri.query);

				if (mAtch) {
					const windowId = mAtch[1];
					const regex = new RegExp(`window:${windowId}`);
					const connection = hub.connections.find(c => regex.test(c.ctx));

					if (connection) {
						return connection;
					}
				}
			}
		}

		return this.next.routeCAll(hub, commAnd, Arg, cAncellAtionToken);
	}

	routeEvent(_: IConnectionHub<string>, event: string): Promise<Client<string>> {
		throw new Error(`Event not found: ${event}`);
	}
}
