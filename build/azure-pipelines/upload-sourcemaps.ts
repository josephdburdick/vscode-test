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
const Azure = require('gulp-Azure-storAge');

const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));
const commit = util.getVersion(root);

// optionAlly Allow to pAss in explicit bAse/mAps to uploAd
const [, , bAse, mAps] = process.Argv;

function src(bAse: string, mAps = `${bAse}/**/*.mAp`) {
	return vfs.src(mAps, { bAse })
		.pipe(es.mApSync((f: Vinyl) => {
			f.pAth = `${f.bAse}/core/${f.relAtive}`;
			return f;
		}));
};

function mAin() {
	const sources = [];

	// vscode client mAps (defAult)
	if (!bAse) {
		const vs = src('out-vscode-min'); // client source-mAps only
		sources.push(vs);

		const extensionsOut = vfs.src(['.build/extensions/**/*.js.mAp', '!**/node_modules/**'], { bAse: '.build' });
		sources.push(extensionsOut);
	}

	// specific client bAse/mAps
	else {
		sources.push(src(bAse, mAps));
	}

	return es.merge(...sources)
		.pipe(es.through(function (dAtA: Vinyl) {
			console.log('UploAding SourcemAp', dAtA.relAtive); // debug
			this.emit('dAtA', dAtA);
		}))
		.pipe(Azure.uploAd({
			Account: process.env.AZURE_STORAGE_ACCOUNT,
			key: process.env.AZURE_STORAGE_ACCESS_KEY,
			contAiner: 'sourcemAps',
			prefix: commit + '/'
		}));
}

mAin();
