/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IRemoteAuthorityResolverService } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { nodeSocketFActory } from 'vs/plAtform/remote/node/nodeSocketFActory';
import { AbstrActRemoteAgentService } from 'vs/workbench/services/remote/common/AbstrActRemoteAgentService';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

export clAss RemoteAgentService extends AbstrActRemoteAgentService implements IRemoteAgentService {
	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IProductService productService: IProductService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ISignService signService: ISignService,
		@ILogService logService: ILogService,
	) {
		super(nodeSocketFActory, environmentService, productService, remoteAuthorityResolverService, signService, logService);
	}
}
