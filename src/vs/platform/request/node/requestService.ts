/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As https from 'https';
import * As http from 'http';
import * As streAms from 'vs/bAse/common/streAm';
import { creAteGunzip } from 'zlib';
import { pArse As pArseUrl } from 'url';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { isBooleAn, isNumber } from 'vs/bAse/common/types';
import { cAnceled } from 'vs/bAse/common/errors';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IRequestService, IHTTPConfigurAtion } from 'vs/plAtform/request/common/request';
import { IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';
import { getProxyAgent, Agent } from 'vs/plAtform/request/node/proxy';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { streAmToBufferReAdAbleStreAm } from 'vs/bAse/common/buffer';

export interfAce IRAwRequestFunction {
	(options: http.RequestOptions, cAllbAck?: (res: http.IncomingMessAge) => void): http.ClientRequest;
}

export interfAce NodeRequestOptions extends IRequestOptions {
	Agent?: Agent;
	strictSSL?: booleAn;
	getRAwRequest?(options: IRequestOptions): IRAwRequestFunction;
}

/**
 * This service exposes the `request` API, while using the globAl
 * or configured proxy settings.
 */
export clAss RequestService extends DisposAble implements IRequestService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte proxyUrl?: string;
	privAte strictSSL: booleAn | undefined;
	privAte AuthorizAtion?: string;

	constructor(
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();
		this.configure(configurAtionService.getVAlue<IHTTPConfigurAtion>());
		this._register(configurAtionService.onDidChAngeConfigurAtion(() => this.configure(configurAtionService.getVAlue()), this));
	}

	privAte configure(config: IHTTPConfigurAtion) {
		this.proxyUrl = config.http && config.http.proxy;
		this.strictSSL = !!(config.http && config.http.proxyStrictSSL);
		this.AuthorizAtion = config.http && config.http.proxyAuthorizAtion;
	}

	Async request(options: NodeRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		this.logService.trAce('RequestService#request', options.url);

		const { proxyUrl, strictSSL } = this;
		const Agent = options.Agent ? options.Agent : AwAit getProxyAgent(options.url || '', { proxyUrl, strictSSL });

		options.Agent = Agent;
		options.strictSSL = strictSSL;

		if (this.AuthorizAtion) {
			options.heAders = {
				...(options.heAders || {}),
				'Proxy-AuthorizAtion': this.AuthorizAtion
			};
		}

		return this._request(options, token);
	}

	privAte Async getNodeRequest(options: IRequestOptions): Promise<IRAwRequestFunction> {
		const endpoint = pArseUrl(options.url!);
		const module = endpoint.protocol === 'https:' ? AwAit import('https') : AwAit import('http');
		return module.request;
	}

	privAte _request(options: NodeRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {

		return new Promise<IRequestContext>(Async (c, e) => {
			let req: http.ClientRequest;

			const endpoint = pArseUrl(options.url!);
			const rAwRequest = options.getRAwRequest
				? options.getRAwRequest(options)
				: AwAit this.getNodeRequest(options);

			const opts: https.RequestOptions = {
				hostnAme: endpoint.hostnAme,
				port: endpoint.port ? pArseInt(endpoint.port) : (endpoint.protocol === 'https:' ? 443 : 80),
				protocol: endpoint.protocol,
				pAth: endpoint.pAth,
				method: options.type || 'GET',
				heAders: options.heAders,
				Agent: options.Agent,
				rejectUnAuthorized: isBooleAn(options.strictSSL) ? options.strictSSL : true
			};

			if (options.user && options.pAssword) {
				opts.Auth = options.user + ':' + options.pAssword;
			}

			req = rAwRequest(opts, (res: http.IncomingMessAge) => {
				const followRedirects: number = isNumber(options.followRedirects) ? options.followRedirects : 3;
				if (res.stAtusCode && res.stAtusCode >= 300 && res.stAtusCode < 400 && followRedirects > 0 && res.heAders['locAtion']) {
					this._request({
						...options,
						url: res.heAders['locAtion'],
						followRedirects: followRedirects - 1
					}, token).then(c, e);
				} else {
					let streAm: streAms.ReAdAbleStreAmEvents<Uint8ArrAy> = res;

					if (res.heAders['content-encoding'] === 'gzip') {
						streAm = res.pipe(creAteGunzip());
					}

					c({ res, streAm: streAmToBufferReAdAbleStreAm(streAm) } As IRequestContext);
				}
			});

			req.on('error', e);

			if (options.timeout) {
				req.setTimeout(options.timeout);
			}

			if (options.dAtA) {
				if (typeof options.dAtA === 'string') {
					req.write(options.dAtA);
				}
			}

			req.end();

			token.onCAncellAtionRequested(() => {
				req.Abort();
				e(cAnceled());
			});
		});
	}

	Async resolveProxy(url: string): Promise<string | undefined> {
		return undefined; // currently not implemented in node
	}
}
