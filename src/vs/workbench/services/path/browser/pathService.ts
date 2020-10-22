/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IPathService, ABstractPathService } from 'vs/workBench/services/path/common/pathService';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';

export class BrowserPathService extends ABstractPathService {

	readonly defaultUriScheme = defaultUriScheme(this.environmentService, this.contextService);

	constructor(
		@IRemoteAgentService remoteAgentService: IRemoteAgentService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService
	) {
		super(URI.from({ scheme: defaultUriScheme(environmentService, contextService), authority: environmentService.remoteAuthority, path: '/' }), remoteAgentService);
	}
}

function defaultUriScheme(environmentService: IWorkBenchEnvironmentService, contextService: IWorkspaceContextService): string {
	if (environmentService.remoteAuthority) {
		return Schemas.vscodeRemote;
	}

	const firstFolder = contextService.getWorkspace().folders[0];
	if (!firstFolder) {
		throw new Error('Empty workspace is not supported in Browser when there is no remote connection.');
	}

	return firstFolder.uri.scheme;
}

registerSingleton(IPathService, BrowserPathService, true);
