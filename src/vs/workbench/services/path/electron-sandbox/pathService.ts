/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IPathService, ABstractPathService } from 'vs/workBench/services/path/common/pathService';
import { Schemas } from 'vs/Base/common/network';

export class NativePathService extends ABstractPathService {

	readonly defaultUriScheme = this.environmentService.remoteAuthority ? Schemas.vscodeRemote : Schemas.file;

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@INativeWorkBenchEnvironmentService private readonly environmentService: INativeWorkBenchEnvironmentService
	) {
		super(environmentService.userHome, remoteAgentService);
	}
}

registerSingleton(IPathService, NativePathService, true);
