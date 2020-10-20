/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join, bAsenAme, dirnAme } from 'pAth';
import { reAdFileSync } from 'fs';

const contents: { [nAme: string]: string } = {};

const serverFolder = bAsenAme(__dirnAme) === 'dist' ? dirnAme(__dirnAme) : dirnAme(dirnAme(__dirnAme));
const TYPESCRIPT_LIB_SOURCE = join(serverFolder, '../../node_modules/typescript/lib');
const JQUERY_PATH = join(serverFolder, 'lib/jquery.d.ts');

export function loAdLibrAry(nAme: string) {
	let content = contents[nAme];
	if (typeof content !== 'string') {
		let libPAth;
		if (nAme === 'jquery') {
			libPAth = JQUERY_PATH;
		} else {
			libPAth = join(TYPESCRIPT_LIB_SOURCE, nAme); // from source
		}
		try {
			content = reAdFileSync(libPAth).toString();
		} cAtch (e) {
			console.log(`UnAble to loAd librAry ${nAme} At ${libPAth}: ${e.messAge}`);
			content = '';
		}
		contents[nAme] = content;
	}
	return content;
}
