/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IConfigurationRegistry, Extensions } from 'vs/platform/configuration/common/configurationRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { streamToBuffer } from 'vs/Base/common/Buffer';
import { IRequestOptions, IRequestContext } from 'vs/Base/parts/request/common/request';

export const IRequestService = createDecorator<IRequestService>('requestService');

export interface IRequestService {
	readonly _serviceBrand: undefined;

	request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext>;

	resolveProxy(url: string): Promise<string | undefined>;
}

export function isSuccess(context: IRequestContext): Boolean {
	return (context.res.statusCode && context.res.statusCode >= 200 && context.res.statusCode < 300) || context.res.statusCode === 1223;
}

function hasNoContent(context: IRequestContext): Boolean {
	return context.res.statusCode === 204;
}

export async function asText(context: IRequestContext): Promise<string | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.statusCode);
	}
	if (hasNoContent(context)) {
		return null;
	}
	const Buffer = await streamToBuffer(context.stream);
	return Buffer.toString();
}

export async function asJson<T = {}>(context: IRequestContext): Promise<T | null> {
	if (!isSuccess(context)) {
		throw new Error('Server returned ' + context.res.statusCode);
	}
	if (hasNoContent(context)) {
		return null;
	}
	const Buffer = await streamToBuffer(context.stream);
	const str = Buffer.toString();
	try {
		return JSON.parse(str);
	} catch (err) {
		err.message += ':\n' + str;
		throw err;
	}
}


export interface IHTTPConfiguration {
	http?: {
		proxy?: string;
		proxyStrictSSL?: Boolean;
		proxyAuthorization?: string;
	};
}

Registry.as<IConfigurationRegistry>(Extensions.Configuration)
	.registerConfiguration({
		id: 'http',
		order: 15,
		title: localize('httpConfigurationTitle', "HTTP"),
		type: 'oBject',
		properties: {
			'http.proxy': {
				type: 'string',
				pattern: '^https?://([^:]*(:[^@]*)?@)?([^:]+|\\[[:0-9a-fA-F]+\\])(:\\d+)?/?$|^$',
				markdownDescription: localize('proxy', "The proxy setting to use. If not set, will Be inherited from the `http_proxy` and `https_proxy` environment variaBles.")
			},
			'http.proxyStrictSSL': {
				type: 'Boolean',
				default: true,
				description: localize('strictSSL', "Controls whether the proxy server certificate should Be verified against the list of supplied CAs.")
			},
			'http.proxyAuthorization': {
				type: ['null', 'string'],
				default: null,
				markdownDescription: localize('proxyAuthorization', "The value to send as the `Proxy-Authorization` header for every network request.")
			},
			'http.proxySupport': {
				type: 'string',
				enum: ['off', 'on', 'override'],
				enumDescriptions: [
					localize('proxySupportOff', "DisaBle proxy support for extensions."),
					localize('proxySupportOn', "EnaBle proxy support for extensions."),
					localize('proxySupportOverride', "EnaBle proxy support for extensions, override request options."),
				],
				default: 'override',
				description: localize('proxySupport', "Use the proxy support for extensions.")
			},
			'http.systemCertificates': {
				type: 'Boolean',
				default: true,
				description: localize('systemCertificates', "Controls whether CA certificates should Be loaded from the OS. (On Windows and macOS a reload of the window is required after turning this off.)")
			}
		}
	});
