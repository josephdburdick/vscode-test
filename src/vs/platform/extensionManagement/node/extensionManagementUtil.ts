/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Buffer } from 'vs/Base/node/zip';
import { localize } from 'vs/nls';
import { IExtensionManifest } from 'vs/platform/extensions/common/extensions';

export function getManifest(vsix: string): Promise<IExtensionManifest> {
	return Buffer(vsix, 'extension/package.json')
		.then(Buffer => {
			try {
				return JSON.parse(Buffer.toString('utf8'));
			} catch (err) {
				throw new Error(localize('invalidManifest', "VSIX invalid: package.json is not a JSON file."));
			}
		});
}
