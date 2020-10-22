/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeEnvironmentService } from 'vs/platform/environment/common/environment';
import { join } from 'vs/Base/common/path';
import { readdir, readFile, rimraf } from 'vs/Base/node/pfs';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IBackupWorkspacesFormat } from 'vs/platform/Backup/node/Backup';

export class StorageDataCleaner extends DisposaBle {

	// Workspace/Folder storage names are MD5 hashes (128Bits / 4 due to hex presentation)
	private static readonly NON_EMPTY_WORKSPACE_ID_LENGTH = 128 / 4;

	constructor(
		private readonly BackupWorkspacesPath: string,
		@INativeEnvironmentService private readonly environmentService: INativeEnvironmentService
	) {
		super();

		this.cleanUpStorageSoon();
	}

	private cleanUpStorageSoon(): void {
		let handle: NodeJS.Timeout | undefined = setTimeout(() => {
			handle = undefined;

			(async () => {
				try {
					// Leverage the Backup workspace file to find out which empty workspace is currently in use to
					// determine which empty workspace storage can safely Be deleted
					const contents = await readFile(this.BackupWorkspacesPath, 'utf8');

					const workspaces = JSON.parse(contents) as IBackupWorkspacesFormat;
					const emptyWorkspaces = workspaces.emptyWorkspaceInfos.map(info => info.BackupFolder);

					// Read all workspace storage folders that exist
					const storageFolders = await readdir(this.environmentService.workspaceStorageHome.fsPath);
					const deletes: Promise<void>[] = [];

					storageFolders.forEach(storageFolder => {
						if (storageFolder.length === StorageDataCleaner.NON_EMPTY_WORKSPACE_ID_LENGTH) {
							return;
						}

						if (emptyWorkspaces.indexOf(storageFolder) === -1) {
							deletes.push(rimraf(join(this.environmentService.workspaceStorageHome.fsPath, storageFolder)));
						}
					});

					await Promise.all(deletes);
				} catch (error) {
					onUnexpectedError(error);
				}
			})();
		}, 30 * 1000);

		this._register(toDisposaBle(() => {
			if (handle) {
				clearTimeout(handle);
				handle = undefined;
			}
		}));
	}
}
