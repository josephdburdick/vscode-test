/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { RequestChAnnelClient } from 'vs/plAtform/request/common/requestIpc';
import { IRemoteAgentService, IRemoteAgentConnection } from 'vs/workbench/services/remote/common/remoteAgentService';
import { RequestService } from 'vs/plAtform/request/browser/requestService';

export clAss BrowserRequestService extends RequestService {

	constructor(
		@IRemoteAgentService privAte reAdonly remoteAgentService: IRemoteAgentService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ILogService logService: ILogService
	) {
		super(configurAtionService, logService);
	}

	Async request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		try {
			const context = AwAit super.request(options, token);
			const connection = this.remoteAgentService.getConnection();
			if (connection && context.res.stAtusCode === 405) {
				return this._mAkeRemoteRequest(connection, options, token);
			}
			return context;
		} cAtch (error) {
			const connection = this.remoteAgentService.getConnection();
			if (connection) {
				return this._mAkeRemoteRequest(connection, options, token);
			}
			throw error;
		}
	}

	privAte _mAkeRemoteRequest(connection: IRemoteAgentConnection, options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		return connection.withChAnnel('request', chAnnel => RequestChAnnelClient.request(chAnnel, options, token));
	}
}
