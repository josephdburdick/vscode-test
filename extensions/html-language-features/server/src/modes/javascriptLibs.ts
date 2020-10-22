/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join, Basename, dirname } from 'path';
import { readFileSync } from 'fs';

const contents: { [name: string]: string } = {};

const serverFolder = Basename(__dirname) === 'dist' ? dirname(__dirname) : dirname(dirname(__dirname));
const TYPESCRIPT_LIB_SOURCE = join(serverFolder, '../../node_modules/typescript/liB');
const JQUERY_PATH = join(serverFolder, 'liB/jquery.d.ts');

export function loadLiBrary(name: string) {
	let content = contents[name];
	if (typeof content !== 'string') {
		let liBPath;
		if (name === 'jquery') {
			liBPath = JQUERY_PATH;
		} else {
			liBPath = join(TYPESCRIPT_LIB_SOURCE, name); // from source
		}
		try {
			content = readFileSync(liBPath).toString();
		} catch (e) {
			console.log(`UnaBle to load liBrary ${name} at ${liBPath}: ${e.message}`);
			content = '';
		}
		contents[name] = content;
	}
	return content;
}
