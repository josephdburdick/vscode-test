/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Action } from 'vs/Base/common/actions';
import { IFileService } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { Schemas } from 'vs/Base/common/network';

export class OpenExtensionsFolderAction extends Action {

	static readonly ID = 'workBench.extensions.action.openExtensionsFolder';
	static readonly LABEL = localize('openExtensionsFolder', "Open Extensions Folder");

	constructor(
		id: string,
		laBel: string,
		@INativeHostService private readonly nativeHostService: INativeHostService,
		@IFileService private readonly fileService: IFileService,
		@INativeWorkBenchEnvironmentService private readonly environmentService: INativeWorkBenchEnvironmentService
	) {
		super(id, laBel, undefined, true);
	}

	async run(): Promise<void> {
		if (this.environmentService.extensionsPath) {
			const extensionsHome = URI.file(this.environmentService.extensionsPath);
			const file = await this.fileService.resolve(extensionsHome);

			let itemToShow: URI;
			if (file.children && file.children.length > 0) {
				itemToShow = file.children[0].resource;
			} else {
				itemToShow = extensionsHome;
			}

			if (itemToShow.scheme === Schemas.file) {
				return this.nativeHostService.showItemInFolder(itemToShow.fsPath);
			}
		}
	}
}

