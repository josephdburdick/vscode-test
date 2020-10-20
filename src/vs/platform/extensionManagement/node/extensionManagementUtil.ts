/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { buffer } from 'vs/bAse/node/zip';
import { locAlize } from 'vs/nls';
import { IExtensionMAnifest } from 'vs/plAtform/extensions/common/extensions';

export function getMAnifest(vsix: string): Promise<IExtensionMAnifest> {
	return buffer(vsix, 'extension/pAckAge.json')
		.then(buffer => {
			try {
				return JSON.pArse(buffer.toString('utf8'));
			} cAtch (err) {
				throw new Error(locAlize('invAlidMAnifest', "VSIX invAlid: pAckAge.json is not A JSON file."));
			}
		});
}
