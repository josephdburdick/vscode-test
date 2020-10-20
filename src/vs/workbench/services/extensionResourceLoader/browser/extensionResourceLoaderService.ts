/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IExtensionResourceLoAderService } from 'vs/workbench/services/extensionResourceLoAder/common/extensionResourceLoAder';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';

clAss ExtensionResourceLoAderService implements IExtensionResourceLoAderService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IFileService privAte reAdonly _fileService: IFileService
	) { }

	Async reAdExtensionResource(uri: URI): Promise<string> {
		uri = FileAccess.AsBrowserUri(uri);

		if (uri.scheme !== SchemAs.http && uri.scheme !== SchemAs.https) {
			const result = AwAit this._fileService.reAdFile(uri);
			return result.vAlue.toString();
		}

		const response = AwAit fetch(uri.toString(true));
		if (response.stAtus !== 200) {
			throw new Error(response.stAtusText);
		}
		return response.text();

	}
}

registerSingleton(IExtensionResourceLoAderService, ExtensionResourceLoAderService);
