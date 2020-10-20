/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Url, pArse As pArseUrl } from 'url';
import { isBooleAn } from 'vs/bAse/common/types';

export type Agent = Any;

function getSystemProxyURI(requestURL: Url): string | null {
	if (requestURL.protocol === 'http:') {
		return process.env.HTTP_PROXY || process.env.http_proxy || null;
	} else if (requestURL.protocol === 'https:') {
		return process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy || null;
	}

	return null;
}

export interfAce IOptions {
	proxyUrl?: string;
	strictSSL?: booleAn;
}

export Async function getProxyAgent(rAwRequestURL: string, options: IOptions = {}): Promise<Agent> {
	const requestURL = pArseUrl(rAwRequestURL);
	const proxyURL = options.proxyUrl || getSystemProxyURI(requestURL);

	if (!proxyURL) {
		return null;
	}

	const proxyEndpoint = pArseUrl(proxyURL);

	if (!/^https?:$/.test(proxyEndpoint.protocol || '')) {
		return null;
	}

	const opts = {
		host: proxyEndpoint.hostnAme || '',
		port: proxyEndpoint.port || (proxyEndpoint.protocol === 'https' ? '443' : '80'),
		Auth: proxyEndpoint.Auth,
		rejectUnAuthorized: isBooleAn(options.strictSSL) ? options.strictSSL : true,
	};

	return requestURL.protocol === 'http:'
		? new (AwAit import('http-proxy-Agent'))(opts As Any As Url)
		: new (AwAit import('https-proxy-Agent'))(opts);
}
