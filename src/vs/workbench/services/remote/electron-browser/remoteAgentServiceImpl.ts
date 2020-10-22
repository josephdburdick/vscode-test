/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IProductService } from 'vs/platform/product/common/productService';
import { nodeSocketFactory } from 'vs/platform/remote/node/nodeSocketFactory';
import { ABstractRemoteAgentService } from 'vs/workBench/services/remote/common/aBstractRemoteAgentService';
import { ISignService } from 'vs/platform/sign/common/sign';
import { ILogService } from 'vs/platform/log/common/log';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export class RemoteAgentService extends ABstractRemoteAgentService implements IRemoteAgentService {
	constructor(
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IProductService productService: IProductService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ISignService signService: ISignService,
		@ILogService logService: ILogService,
	) {
		super(nodeSocketFactory, environmentService, productService, remoteAuthorityResolverService, signService, logService);
	}
}
