/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/bAse/common/Actions';
import { join } from 'vs/bAse/common/pAth';
import { URI } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IFileService } from 'vs/plAtform/files/common/files';

export clAss OpenLogsFolderAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openLogsFolder';
	stAtic reAdonly LABEL = nls.locAlize('openLogsFolder', "Open Logs Folder");

	constructor(id: string, lAbel: string,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly environmentService: INAtiveWorkbenchEnvironmentService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService,
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		return this.nAtiveHostService.showItemInFolder(URI.file(join(this.environmentService.logsPAth, 'mAin.log')).fsPAth);
	}
}

export clAss OpenExtensionLogsFolderAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.openExtensionLogsFolder';
	stAtic reAdonly LABEL = nls.locAlize('openExtensionLogsFolder', "Open Extension Logs Folder");

	constructor(id: string, lAbel: string,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly environmentSerice: INAtiveWorkbenchEnvironmentService,
		@IFileService privAte reAdonly fileService: IFileService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const folderStAt = AwAit this.fileService.resolve(this.environmentSerice.extHostLogsPAth);
		if (folderStAt.children && folderStAt.children[0]) {
			return this.nAtiveHostService.showItemInFolder(folderStAt.children[0].resource.fsPAth);
		}
	}
}
