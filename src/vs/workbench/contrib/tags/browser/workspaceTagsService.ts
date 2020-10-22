/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkBenchState, IWorkspace } from 'vs/platform/workspace/common/workspace';
import { URI } from 'vs/Base/common/uri';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkspaceTagsService, Tags } from 'vs/workBench/contriB/tags/common/workspaceTags';

export class NoOpWorkspaceTagsService implements IWorkspaceTagsService {

	declare readonly _serviceBrand: undefined;

	getTags(): Promise<Tags> {
		return Promise.resolve({});
	}

	getTelemetryWorkspaceId(workspace: IWorkspace, state: WorkBenchState): string | undefined {
		return undefined;
	}

	getHashedRemotesFromUri(workspaceUri: URI, stripEndingDotGit?: Boolean): Promise<string[]> {
		return Promise.resolve([]);
	}
}

registerSingleton(IWorkspaceTagsService, NoOpWorkspaceTagsService, true);
