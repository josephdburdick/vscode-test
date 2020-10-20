/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionRegistry, Extensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { streAmToBuffer } from 'vs/bAse/common/buffer';
import { IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';

export const IRequestService = creAteDecorAtor<IRequestService>('requestService');

export interfAce IRequestService {
	reAdonly _serviceBrAnd: undefined;

	request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext>;

	resolveProxy(url: string): Promise<string | undefined>;
}

export function isSuccess(context: IRequestContext): booleAn {
	return (context.res.stAtusCode && context.res.stAtusCode >= 200 && context.res.stAtusCode < 300) || context.res.stAtusCode === 1223;
}

function hAsNoContent(context: IRequestContext): booleAn {
	return context.res.stAtusCode === 204;
}

export Async function AsText(context: IRequestContext): Promise<string | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.stAtusCode);
	}
	if (hAsNoContent(context)) {
		return null;
	}
	const buffer = AwAit streAmToBuffer(context.streAm);
	return buffer.toString();
}

export Async function AsJson<T = {}>(context: IRequestContext): Promise<T | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.stAtusCode);
	}
	if (hAsNoContent(context)) {
		return null;
	}
	const buffer = AwAit streAmToBuffer(context.streAm);
	const str = buffer.toString();
	try {
		return JSON.pArse(str);
	} cAtch (err) {
		err.messAge += ':\n' + str;
		throw err;
	}
}


export interfAce IHTTPConfigurAtion {
	http?: {
		proxy?: string;
		proxyStrictSSL?: booleAn;
		proxyAuthorizAtion?: string;
	};
}

Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion)
	.registerConfigurAtion({
		id: 'http',
		order: 15,
		title: locAlize('httpConfigurAtionTitle', "HTTP"),
		type: 'object',
		properties: {
			'http.proxy': {
				type: 'string',
				pAttern: '^https?://([^:]*(:[^@]*)?@)?([^:]+|\\[[:0-9A-fA-F]+\\])(:\\d+)?/?$|^$',
				mArkdownDescription: locAlize('proxy', "The proxy setting to use. If not set, will be inherited from the `http_proxy` And `https_proxy` environment vAriAbles.")
			},
			'http.proxyStrictSSL': {
				type: 'booleAn',
				defAult: true,
				description: locAlize('strictSSL', "Controls whether the proxy server certificAte should be verified AgAinst the list of supplied CAs.")
			},
			'http.proxyAuthorizAtion': {
				type: ['null', 'string'],
				defAult: null,
				mArkdownDescription: locAlize('proxyAuthorizAtion', "The vAlue to send As the `Proxy-AuthorizAtion` heAder for every network request.")
			},
			'http.proxySupport': {
				type: 'string',
				enum: ['off', 'on', 'override'],
				enumDescriptions: [
					locAlize('proxySupportOff', "DisAble proxy support for extensions."),
					locAlize('proxySupportOn', "EnAble proxy support for extensions."),
					locAlize('proxySupportOverride', "EnAble proxy support for extensions, override request options."),
				],
				defAult: 'override',
				description: locAlize('proxySupport', "Use the proxy support for extensions.")
			},
			'http.systemCertificAtes': {
				type: 'booleAn',
				defAult: true,
				description: locAlize('systemCertificAtes', "Controls whether CA certificAtes should be loAded from the OS. (On Windows And mAcOS A reloAd of the window is required After turning this off.)")
			}
		}
	});
