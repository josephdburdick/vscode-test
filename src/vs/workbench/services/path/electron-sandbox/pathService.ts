/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IPAthService, AbstrActPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { SchemAs } from 'vs/bAse/common/network';

export clAss NAtivePAthService extends AbstrActPAthService {

	reAdonly defAultUriScheme = this.environmentService.remoteAuthority ? SchemAs.vscodeRemote : SchemAs.file;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly environmentService: INAtiveWorkbenchEnvironmentService
	) {
		super(environmentService.userHome, remoteAgentService);
	}
}

registerSingleton(IPAthService, NAtivePAthService, true);
