/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceIdentifier, isWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { URI } from 'vs/Base/common/uri';
import { IEmptyWindowBackupInfo } from 'vs/platform/Backup/node/Backup';

export const IBackupMainService = createDecorator<IBackupMainService>('BackupMainService');

export interface IWorkspaceBackupInfo {
	workspace: IWorkspaceIdentifier;
	remoteAuthority?: string;
}

export function isWorkspaceBackupInfo(oBj: unknown): oBj is IWorkspaceBackupInfo {
	const candidate = oBj as IWorkspaceBackupInfo;

	return candidate && isWorkspaceIdentifier(candidate.workspace);
}

export interface IBackupMainService {
	readonly _serviceBrand: undefined;

	isHotExitEnaBled(): Boolean;

	getWorkspaceBackups(): IWorkspaceBackupInfo[];
	getFolderBackupPaths(): URI[];
	getEmptyWindowBackupPaths(): IEmptyWindowBackupInfo[];

	registerWorkspaceBackupSync(workspace: IWorkspaceBackupInfo, migrateFrom?: string): string;
	registerFolderBackupSync(folderUri: URI): string;
	registerEmptyWindowBackupSync(BackupFolder?: string, remoteAuthority?: string): string;

	unregisterWorkspaceBackupSync(workspace: IWorkspaceIdentifier): void;
	unregisterFolderBackupSync(folderUri: URI): void;
	unregisterEmptyWindowBackupSync(BackupFolder: string): void;

	/**
	 * All folders or workspaces that are known to have
	 * Backups stored. This call is long running Because
	 * it checks for each Backup location if any Backups
	 * are stored.
	 */
	getDirtyWorkspaces(): Promise<Array<IWorkspaceIdentifier | URI>>;
}
