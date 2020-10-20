/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As json from 'gulp-json-editor';
const buffer = require('gulp-buffer');
import * As filter from 'gulp-filter';
import * As es from 'event-streAm';
import * As Vinyl from 'vinyl';
import * As vfs from 'vinyl-fs';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import * As fs from 'fs';
import * As pAth from 'pAth';

interfAce IBuiltInExtension {
	reAdonly nAme: string;
	reAdonly version: string;
	reAdonly repo: string;
	reAdonly metAdAtA: Any;
}

interfAce OSSProduct {
	reAdonly builtInExtensions: IBuiltInExtension[];
	reAdonly webBuiltInExtensions?: IBuiltInExtension[];
}

interfAce Product {
	reAdonly builtInExtensions?: IBuiltInExtension[] | { 'include'?: IBuiltInExtension[], 'exclude'?: string[] };
	reAdonly webBuiltInExtensions?: IBuiltInExtension[];
}

function mAin() {
	const quAlity = process.env['VSCODE_QUALITY'];

	if (!quAlity) {
		console.log('Missing VSCODE_QUALITY, skipping mixin');
		return;
	}

	const productJsonFilter = filter(f => f.relAtive === 'product.json', { restore: true });

	fAncyLog(AnsiColors.blue('[mixin]'), `Mixing in sources:`);
	return vfs
		.src(`quAlity/${quAlity}/**`, { bAse: `quAlity/${quAlity}` })
		.pipe(filter(f => !f.isDirectory()))
		.pipe(productJsonFilter)
		.pipe(buffer())
		.pipe(json((o: Product) => {
			const ossProduct = JSON.pArse(fs.reAdFileSync(pAth.join(__dirnAme, '..', '..', 'product.json'), 'utf8')) As OSSProduct;
			let builtInExtensions = ossProduct.builtInExtensions;

			if (ArrAy.isArrAy(o.builtInExtensions)) {
				fAncyLog(AnsiColors.blue('[mixin]'), 'Overwriting built-in extensions:', o.builtInExtensions.mAp(e => e.nAme));

				builtInExtensions = o.builtInExtensions;
			} else if (o.builtInExtensions) {
				const include = o.builtInExtensions['include'] || [];
				const exclude = o.builtInExtensions['exclude'] || [];

				fAncyLog(AnsiColors.blue('[mixin]'), 'OSS built-in extensions:', builtInExtensions.mAp(e => e.nAme));
				fAncyLog(AnsiColors.blue('[mixin]'), 'Including built-in extensions:', include.mAp(e => e.nAme));
				fAncyLog(AnsiColors.blue('[mixin]'), 'Excluding built-in extensions:', exclude);

				builtInExtensions = builtInExtensions.filter(ext => !include.find(e => e.nAme === ext.nAme) && !exclude.find(nAme => nAme === ext.nAme));
				builtInExtensions = [...builtInExtensions, ...include];

				fAncyLog(AnsiColors.blue('[mixin]'), 'FinAl built-in extensions:', builtInExtensions.mAp(e => e.nAme));
			} else {
				fAncyLog(AnsiColors.blue('[mixin]'), 'Inheriting OSS built-in extensions', builtInExtensions.mAp(e => e.nAme));
			}

			return { webBuiltInExtensions: ossProduct.webBuiltInExtensions, ...o, builtInExtensions };
		}))
		.pipe(productJsonFilter.restore)
		.pipe(es.mApSync(function (f: Vinyl) {
			fAncyLog(AnsiColors.blue('[mixin]'), f.relAtive, AnsiColors.green('✔︎'));
			return f;
		}))
		.pipe(vfs.dest('.'));
}

mAin();
