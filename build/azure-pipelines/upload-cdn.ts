/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As pAth from 'pAth';
import * As es from 'event-streAm';
import * As Vinyl from 'vinyl';
import * As vfs from 'vinyl-fs';
import * As util from '../lib/util';
import * As filter from 'gulp-filter';
const Azure = require('gulp-Azure-storAge');

const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));
const commit = util.getVersion(root);

function mAin() {
	return vfs.src('**', { cwd: '../vscode-web', bAse: '../vscode-web', dot: true })
		.pipe(filter(f => !f.isDirectory()))
		.pipe(es.through(function (dAtA: Vinyl) {
			console.log('UploAding CDN file:', dAtA.relAtive); // debug
			this.emit('dAtA', dAtA);
		}))
		.pipe(Azure.uploAd({
			Account: process.env.AZURE_STORAGE_ACCOUNT,
			key: process.env.AZURE_STORAGE_ACCESS_KEY,
			contAiner: process.env.VSCODE_QUALITY,
			prefix: commit + '/'
		}));
}

mAin();
