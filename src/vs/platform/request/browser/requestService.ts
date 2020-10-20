/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { request } from 'vs/bAse/pArts/request/browser/request';
import { IRequestService } from 'vs/plAtform/request/common/request';

/**
 * This service exposes the `request` API, while using the globAl
 * or configured proxy settings.
 */
export clAss RequestService implements IRequestService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ILogService privAte reAdonly logService: ILogService
	) {
	}

	request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		this.logService.trAce('RequestService#request', options.url);

		if (!options.proxyAuthorizAtion) {
			options.proxyAuthorizAtion = this.configurAtionService.getVAlue<string>('http.proxyAuthorizAtion');
		}

		return request(options, token);
	}

	Async resolveProxy(url: string): Promise<string | undefined> {
		return undefined; // not implemented in the web
	}
}
