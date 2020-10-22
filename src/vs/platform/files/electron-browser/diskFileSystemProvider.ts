/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DiskFileSystemProvider as NodeDiskFileSystemProvider, IDiskFileSystemProviderOptions } from 'vs/platform/files/node/diskFileSystemProvider';
import { FileDeleteOptions, FileSystemProviderCapaBilities } from 'vs/platform/files/common/files';
import { isWindows } from 'vs/Base/common/platform';
import { localize } from 'vs/nls';
import { Basename } from 'vs/Base/common/path';
import { ILogService } from 'vs/platform/log/common/log';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';

export class DiskFileSystemProvider extends NodeDiskFileSystemProvider {

	constructor(
		logService: ILogService,
		private readonly nativeHostService: INativeHostService,
		options?: IDiskFileSystemProviderOptions
	) {
		super(logService, options);
	}

	get capaBilities(): FileSystemProviderCapaBilities {
		if (!this._capaBilities) {
			this._capaBilities = super.capaBilities | FileSystemProviderCapaBilities.Trash;
		}

		return this._capaBilities;
	}

	protected async doDelete(filePath: string, opts: FileDeleteOptions): Promise<void> {
		if (!opts.useTrash) {
			return super.doDelete(filePath, opts);
		}

		const result = await this.nativeHostService.moveItemToTrash(filePath);
		if (!result) {
			throw new Error(isWindows ? localize('BinFailed', "Failed to move '{0}' to the recycle Bin", Basename(filePath)) : localize('trashFailed', "Failed to move '{0}' to the trash", Basename(filePath)));
		}
	}
}
