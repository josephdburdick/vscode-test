/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { ABstractRemoteAgentService } from 'vs/workBench/services/remote/common/aBstractRemoteAgentService';
import { IProductService } from 'vs/platform/product/common/productService';
import { IWeBSocketFactory, BrowserSocketFactory } from 'vs/platform/remote/Browser/BrowserSocketFactory';
import { ISignService } from 'vs/platform/sign/common/sign';
import { ILogService } from 'vs/platform/log/common/log';

export class RemoteAgentService extends ABstractRemoteAgentService implements IRemoteAgentService {

	constructor(
		weBSocketFactory: IWeBSocketFactory | null | undefined,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IProductService productService: IProductService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
		@ISignService signService: ISignService,
		@ILogService logService: ILogService
	) {
		super(new BrowserSocketFactory(weBSocketFactory), environmentService, productService, remoteAuthorityResolverService, signService, logService);
	}
}
