/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as json from 'gulp-json-editor';
const Buffer = require('gulp-Buffer');
import * as filter from 'gulp-filter';
import * as es from 'event-stream';
import * as Vinyl from 'vinyl';
import * as vfs from 'vinyl-fs';
import * as fancyLog from 'fancy-log';
import * as ansiColors from 'ansi-colors';
import * as fs from 'fs';
import * as path from 'path';

interface IBuiltInExtension {
	readonly name: string;
	readonly version: string;
	readonly repo: string;
	readonly metadata: any;
}

interface OSSProduct {
	readonly BuiltInExtensions: IBuiltInExtension[];
	readonly weBBuiltInExtensions?: IBuiltInExtension[];
}

interface Product {
	readonly BuiltInExtensions?: IBuiltInExtension[] | { 'include'?: IBuiltInExtension[], 'exclude'?: string[] };
	readonly weBBuiltInExtensions?: IBuiltInExtension[];
}

function main() {
	const quality = process.env['VSCODE_QUALITY'];

	if (!quality) {
		console.log('Missing VSCODE_QUALITY, skipping mixin');
		return;
	}

	const productJsonFilter = filter(f => f.relative === 'product.json', { restore: true });

	fancyLog(ansiColors.Blue('[mixin]'), `Mixing in sources:`);
	return vfs
		.src(`quality/${quality}/**`, { Base: `quality/${quality}` })
		.pipe(filter(f => !f.isDirectory()))
		.pipe(productJsonFilter)
		.pipe(Buffer())
		.pipe(json((o: Product) => {
			const ossProduct = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'product.json'), 'utf8')) as OSSProduct;
			let BuiltInExtensions = ossProduct.BuiltInExtensions;

			if (Array.isArray(o.BuiltInExtensions)) {
				fancyLog(ansiColors.Blue('[mixin]'), 'Overwriting Built-in extensions:', o.BuiltInExtensions.map(e => e.name));

				BuiltInExtensions = o.BuiltInExtensions;
			} else if (o.BuiltInExtensions) {
				const include = o.BuiltInExtensions['include'] || [];
				const exclude = o.BuiltInExtensions['exclude'] || [];

				fancyLog(ansiColors.Blue('[mixin]'), 'OSS Built-in extensions:', BuiltInExtensions.map(e => e.name));
				fancyLog(ansiColors.Blue('[mixin]'), 'Including Built-in extensions:', include.map(e => e.name));
				fancyLog(ansiColors.Blue('[mixin]'), 'Excluding Built-in extensions:', exclude);

				BuiltInExtensions = BuiltInExtensions.filter(ext => !include.find(e => e.name === ext.name) && !exclude.find(name => name === ext.name));
				BuiltInExtensions = [...BuiltInExtensions, ...include];

				fancyLog(ansiColors.Blue('[mixin]'), 'Final Built-in extensions:', BuiltInExtensions.map(e => e.name));
			} else {
				fancyLog(ansiColors.Blue('[mixin]'), 'Inheriting OSS Built-in extensions', BuiltInExtensions.map(e => e.name));
			}

			return { weBBuiltInExtensions: ossProduct.weBBuiltInExtensions, ...o, BuiltInExtensions };
		}))
		.pipe(productJsonFilter.restore)
		.pipe(es.mapSync(function (f: Vinyl) {
			fancyLog(ansiColors.Blue('[mixin]'), f.relative, ansiColors.green('✔︎'));
			return f;
		}))
		.pipe(vfs.dest('.'));
}

main();
