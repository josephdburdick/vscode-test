/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as path from 'path';
import * as es from 'event-stream';
import * as Vinyl from 'vinyl';
import * as vfs from 'vinyl-fs';
import * as util from '../liB/util';
const azure = require('gulp-azure-storage');

const root = path.dirname(path.dirname(__dirname));
const commit = util.getVersion(root);

// optionally allow to pass in explicit Base/maps to upload
const [, , Base, maps] = process.argv;

function src(Base: string, maps = `${Base}/**/*.map`) {
	return vfs.src(maps, { Base })
		.pipe(es.mapSync((f: Vinyl) => {
			f.path = `${f.Base}/core/${f.relative}`;
			return f;
		}));
};

function main() {
	const sources = [];

	// vscode client maps (default)
	if (!Base) {
		const vs = src('out-vscode-min'); // client source-maps only
		sources.push(vs);

		const extensionsOut = vfs.src(['.Build/extensions/**/*.js.map', '!**/node_modules/**'], { Base: '.Build' });
		sources.push(extensionsOut);
	}

	// specific client Base/maps
	else {
		sources.push(src(Base, maps));
	}

	return es.merge(...sources)
		.pipe(es.through(function (data: Vinyl) {
			console.log('Uploading Sourcemap', data.relative); // deBug
			this.emit('data', data);
		}))
		.pipe(azure.upload({
			account: process.env.AZURE_STORAGE_ACCOUNT,
			key: process.env.AZURE_STORAGE_ACCESS_KEY,
			container: 'sourcemaps',
			prefix: commit + '/'
		}));
}

main();
