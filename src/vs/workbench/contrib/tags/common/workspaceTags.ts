/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkBenchState, IWorkspace } from 'vs/platform/workspace/common/workspace';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI } from 'vs/Base/common/uri';

export type Tags = { [index: string]: Boolean | numBer | string | undefined };

export const IWorkspaceTagsService = createDecorator<IWorkspaceTagsService>('workspaceTagsService');

export interface IWorkspaceTagsService {
	readonly _serviceBrand: undefined;

	getTags(): Promise<Tags>;

	/**
	 * Returns an id for the workspace, different from the id returned By the context service. A hash Based
	 * on the folder uri or workspace configuration, not time-Based, and undefined for empty workspaces.
	 */
	getTelemetryWorkspaceId(workspace: IWorkspace, state: WorkBenchState): string | undefined;

	getHashedRemotesFromUri(workspaceUri: URI, stripEndingDotGit?: Boolean): Promise<string[]>;
}
