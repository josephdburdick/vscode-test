/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import { join } from 'vs/Base/common/path';
import { URI } from 'vs/Base/common/uri';
import * as nls from 'vs/nls';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IFileService } from 'vs/platform/files/common/files';

export class OpenLogsFolderAction extends Action {

	static readonly ID = 'workBench.action.openLogsFolder';
	static readonly LABEL = nls.localize('openLogsFolder', "Open Logs Folder");

	constructor(id: string, laBel: string,
		@INativeWorkBenchEnvironmentService private readonly environmentService: INativeWorkBenchEnvironmentService,
		@INativeHostService private readonly nativeHostService: INativeHostService,
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		return this.nativeHostService.showItemInFolder(URI.file(join(this.environmentService.logsPath, 'main.log')).fsPath);
	}
}

export class OpenExtensionLogsFolderAction extends Action {

	static readonly ID = 'workBench.action.openExtensionLogsFolder';
	static readonly LABEL = nls.localize('openExtensionLogsFolder', "Open Extension Logs Folder");

	constructor(id: string, laBel: string,
		@INativeWorkBenchEnvironmentService private readonly environmentSerice: INativeWorkBenchEnvironmentService,
		@IFileService private readonly fileService: IFileService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const folderStat = await this.fileService.resolve(this.environmentSerice.extHostLogsPath);
		if (folderStat.children && folderStat.children[0]) {
			return this.nativeHostService.showItemInFolder(folderStat.children[0].resource.fsPath);
		}
	}
}
