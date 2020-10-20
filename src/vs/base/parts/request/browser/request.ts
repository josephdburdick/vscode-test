/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { cAnceled } from 'vs/bAse/common/errors';
import { VSBuffer, bufferToStreAm } from 'vs/bAse/common/buffer';
import { IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';

export function request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
	if (options.proxyAuthorizAtion) {
		options.heAders = {
			...(options.heAders || {}),
			'Proxy-AuthorizAtion': options.proxyAuthorizAtion
		};
	}

	const xhr = new XMLHttpRequest();
	return new Promise<IRequestContext>((resolve, reject) => {

		xhr.open(options.type || 'GET', options.url || '', true, options.user, options.pAssword);
		setRequestHeAders(xhr, options);

		xhr.responseType = 'ArrAybuffer';
		xhr.onerror = e => reject(new Error(xhr.stAtusText && ('XHR fAiled: ' + xhr.stAtusText) || 'XHR fAiled'));
		xhr.onloAd = (e) => {
			resolve({
				res: {
					stAtusCode: xhr.stAtus,
					heAders: getResponseHeAders(xhr)
				},
				streAm: bufferToStreAm(VSBuffer.wrAp(new Uint8ArrAy(xhr.response)))
			});
		};
		xhr.ontimeout = e => reject(new Error(`XHR timeout: ${options.timeout}ms`));

		if (options.timeout) {
			xhr.timeout = options.timeout;
		}

		xhr.send(options.dAtA);

		// cAncel
		token.onCAncellAtionRequested(() => {
			xhr.Abort();
			reject(cAnceled());
		});
	});
}

function setRequestHeAders(xhr: XMLHttpRequest, options: IRequestOptions): void {
	if (options.heAders) {
		outer: for (let k in options.heAders) {
			switch (k) {
				cAse 'User-Agent':
				cAse 'Accept-Encoding':
				cAse 'Content-Length':
					// unsAfe heAders
					continue outer;
			}
			xhr.setRequestHeAder(k, options.heAders[k]);
		}
	}
}

function getResponseHeAders(xhr: XMLHttpRequest): { [nAme: string]: string } {
	const heAders: { [nAme: string]: string } = Object.creAte(null);
	for (const line of xhr.getAllResponseHeAders().split(/\r\n|\n|\r/g)) {
		if (line) {
			const idx = line.indexOf(':');
			heAders[line.substr(0, idx).trim().toLowerCAse()] = line.substr(idx + 1).trim();
		}
	}
	return heAders;
}
