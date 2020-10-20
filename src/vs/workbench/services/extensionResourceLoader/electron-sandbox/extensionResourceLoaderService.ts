/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';

export clAss ExtensionResourceLoAderService implements IExtensionResourceLoAderService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IFileService privAte reAdonly _fileService: IFileService
	) { }

	Async reAdExtensionResource(uri: URI): Promise<string> {
		const result = AwAit this._fileService.reAdFile(uri);
		return result.vAlue.toString();
	}
}

registerSingleton(IExtensionResourceLoAderService, ExtensionResourceLoAderService);
