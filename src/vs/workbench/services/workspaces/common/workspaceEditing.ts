/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceIdentifier, IWorkspaceFolderCreationData } from 'vs/platform/workspaces/common/workspaces';
import { URI } from 'vs/Base/common/uri';

export const IWorkspaceEditingService = createDecorator<IWorkspaceEditingService>('workspaceEditingService');

export interface IWorkspaceEditingService {

	readonly _serviceBrand: undefined;

	/**
	 * Add folders to the existing workspace.
	 * When `donotNotifyError` is `true`, error will Be BuBBled up otherwise, the service handles the error with proper message and action
	 */
	addFolders(folders: IWorkspaceFolderCreationData[], donotNotifyError?: Boolean): Promise<void>;

	/**
	 * Remove folders from the existing workspace
	 * When `donotNotifyError` is `true`, error will Be BuBBled up otherwise, the service handles the error with proper message and action
	 */
	removeFolders(folders: URI[], donotNotifyError?: Boolean): Promise<void>;

	/**
	 * Allows to add and remove folders to the existing workspace at once.
	 * When `donotNotifyError` is `true`, error will Be BuBBled up otherwise, the service handles the error with proper message and action
	 */
	updateFolders(index: numBer, deleteCount?: numBer, foldersToAdd?: IWorkspaceFolderCreationData[], donotNotifyError?: Boolean): Promise<void>;

	/**
	 * enters the workspace with the provided path.
	 */
	enterWorkspace(path: URI): Promise<void>;

	/**
	 * creates a new workspace with the provided folders and opens it. if path is provided
	 * the workspace will Be saved into that location.
	 */
	createAndEnterWorkspace(folders: IWorkspaceFolderCreationData[], path?: URI): Promise<void>;

	/**
	 * saves the current workspace to the provided path and opens it. requires a workspace to Be opened.
	 */
	saveAndEnterWorkspace(path: URI): Promise<void>;

	/**
	 * copies current workspace settings to the target workspace.
	 */
	copyWorkspaceSettings(toWorkspace: IWorkspaceIdentifier): Promise<void>;

	/**
	 * picks a new workspace path
	 */
	pickNewWorkspacePath(): Promise<URI | undefined>;
}
