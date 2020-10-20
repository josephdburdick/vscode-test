/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { RequestService } from 'vs/plAtform/request/browser/requestService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

export clAss NAtiveRequestService extends RequestService {

	constructor(
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ILogService logService: ILogService,
		@INAtiveHostService privAte nAtiveHostService: INAtiveHostService
	) {
		super(configurAtionService, logService);
	}

	Async resolveProxy(url: string): Promise<string | undefined> {
		return this.nAtiveHostService.resolveProxy(url);
	}
}

registerSingleton(IRequestService, NAtiveRequestService, true);
