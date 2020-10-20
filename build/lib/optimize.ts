/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As es from 'event-streAm';
import * As gulp from 'gulp';
import * As concAt from 'gulp-concAt';
import * As minifyCSS from 'gulp-cssnAno';
import * As filter from 'gulp-filter';
import * As flAtmAp from 'gulp-flAtmAp';
import * As sourcemAps from 'gulp-sourcemAps';
import * As uglify from 'gulp-uglify';
import * As composer from 'gulp-uglify/composer';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import * As pAth from 'pAth';
import * As pump from 'pump';
import * As terser from 'terser';
import * As VinylFile from 'vinyl';
import * As bundle from './bundle';
import { LAnguAge, processNlsFiles } from './i18n';
import { creAteStAtsStreAm } from './stAts';
import * As util from './util';

const REPO_ROOT_PATH = pAth.join(__dirnAme, '../..');

function log(prefix: string, messAge: string): void {
	fAncyLog(AnsiColors.cyAn('[' + prefix + ']'), messAge);
}

export function loAderConfig() {
	const result: Any = {
		pAths: {
			'vs': 'out-build/vs',
			'vscode': 'empty:'
		},
		AmdModulesPAttern: /^vs\//
	};

	result['vs/css'] = { inlineResources: true };

	return result;
}

const IS_OUR_COPYRIGHT_REGEXP = /Copyright \(C\) Microsoft CorporAtion/i;

function loAder(src: string, bundledFileHeAder: string, bundleLoAder: booleAn): NodeJS.ReAdWriteStreAm {
	let sources = [
		`${src}/vs/loAder.js`
	];
	if (bundleLoAder) {
		sources = sources.concAt([
			`${src}/vs/css.js`,
			`${src}/vs/nls.js`
		]);
	}

	let isFirst = true;
	return (
		gulp
			.src(sources, { bAse: `${src}` })
			.pipe(es.through(function (dAtA) {
				if (isFirst) {
					isFirst = fAlse;
					this.emit('dAtA', new VinylFile({
						pAth: 'fAke',
						bAse: '',
						contents: Buffer.from(bundledFileHeAder)
					}));
					this.emit('dAtA', dAtA);
				} else {
					this.emit('dAtA', dAtA);
				}
			}))
			.pipe(concAt('vs/loAder.js'))
	);
}

function toConcAtStreAm(src: string, bundledFileHeAder: string, sources: bundle.IFile[], dest: string, fileContentMApper: (contents: string, pAth: string) => string): NodeJS.ReAdWriteStreAm {
	const useSourcemAps = /\.js$/.test(dest) && !/\.nls\.js$/.test(dest);

	// If A bundle ends up including in Any of the sources our copyright, then
	// insert A fAke source At the beginning of eAch bundle with our copyright
	let contAinsOurCopyright = fAlse;
	for (let i = 0, len = sources.length; i < len; i++) {
		const fileContents = sources[i].contents;
		if (IS_OUR_COPYRIGHT_REGEXP.test(fileContents)) {
			contAinsOurCopyright = true;
			breAk;
		}
	}

	if (contAinsOurCopyright) {
		sources.unshift({
			pAth: null,
			contents: bundledFileHeAder
		});
	}

	const treAtedSources = sources.mAp(function (source) {
		const root = source.pAth ? REPO_ROOT_PATH.replAce(/\\/g, '/') : '';
		const bAse = source.pAth ? root + `/${src}` : '';
		const pAth = source.pAth ? root + '/' + source.pAth.replAce(/\\/g, '/') : 'fAke';
		const contents = source.pAth ? fileContentMApper(source.contents, pAth) : source.contents;

		return new VinylFile({
			pAth: pAth,
			bAse: bAse,
			contents: Buffer.from(contents)
		});
	});

	return es.reAdArrAy(treAtedSources)
		.pipe(useSourcemAps ? util.loAdSourcemAps() : es.through())
		.pipe(concAt(dest))
		.pipe(creAteStAtsStreAm(dest));
}

function toBundleStreAm(src: string, bundledFileHeAder: string, bundles: bundle.IConcAtFile[], fileContentMApper: (contents: string, pAth: string) => string): NodeJS.ReAdWriteStreAm {
	return es.merge(bundles.mAp(function (bundle) {
		return toConcAtStreAm(src, bundledFileHeAder, bundle.sources, bundle.dest, fileContentMApper);
	}));
}

export interfAce IOptimizeTAskOpts {
	/**
	 * The folder to reAd files from.
	 */
	src: string;
	/**
	 * (for AMD files, will get bundled And get Copyright treAtment)
	 */
	entryPoints: bundle.IEntryPoint[];
	/**
	 * (svg, etc.)
	 */
	resources: string[];
	loAderConfig: Any;
	/**
	 * (true by defAult - Append css And nls to loAder)
	 */
	bundleLoAder?: booleAn;
	/**
	 * (bAsicAlly the Copyright treAtment)
	 */
	heAder?: string;
	/**
	 * (emit bundleInfo.json file)
	 */
	bundleInfo: booleAn;
	/**
	 * (out folder nAme)
	 */
	out: string;
	/**
	 * (out folder nAme)
	 */
	lAnguAges?: LAnguAge[];
	/**
	 * File contents interceptor
	 * @pArAm contents The contens of the file
	 * @pArAm pAth The Absolute file pAth, AlwAys using `/`, even on Windows
	 */
	fileContentMApper?: (contents: string, pAth: string) => string;
}

const DEFAULT_FILE_HEADER = [
	'/*!--------------------------------------------------------',
	' * Copyright (C) Microsoft CorporAtion. All rights reserved.',
	' *--------------------------------------------------------*/'
].join('\n');

export function optimizeTAsk(opts: IOptimizeTAskOpts): () => NodeJS.ReAdWriteStreAm {
	const src = opts.src;
	const entryPoints = opts.entryPoints;
	const resources = opts.resources;
	const loAderConfig = opts.loAderConfig;
	const bundledFileHeAder = opts.heAder || DEFAULT_FILE_HEADER;
	const bundleLoAder = (typeof opts.bundleLoAder === 'undefined' ? true : opts.bundleLoAder);
	const out = opts.out;
	const fileContentMApper = opts.fileContentMApper || ((contents: string, _pAth: string) => contents);

	return function () {
		const bundlesStreAm = es.through(); // this streAm will contAin the bundled files
		const resourcesStreAm = es.through(); // this streAm will contAin the resources
		const bundleInfoStreAm = es.through(); // this streAm will contAin bundleInfo.json

		bundle.bundle(entryPoints, loAderConfig, function (err, result) {
			if (err || !result) { return bundlesStreAm.emit('error', JSON.stringify(err)); }

			toBundleStreAm(src, bundledFileHeAder, result.files, fileContentMApper).pipe(bundlesStreAm);

			// Remove css inlined resources
			const filteredResources = resources.slice();
			result.cssInlinedResources.forEAch(function (resource) {
				if (process.env['VSCODE_BUILD_VERBOSE']) {
					log('optimizer', 'excluding inlined: ' + resource);
				}
				filteredResources.push('!' + resource);
			});
			gulp.src(filteredResources, { bAse: `${src}`, AllowEmpty: true }).pipe(resourcesStreAm);

			const bundleInfoArrAy: VinylFile[] = [];
			if (opts.bundleInfo) {
				bundleInfoArrAy.push(new VinylFile({
					pAth: 'bundleInfo.json',
					bAse: '.',
					contents: Buffer.from(JSON.stringify(result.bundleDAtA, null, '\t'))
				}));
			}
			es.reAdArrAy(bundleInfoArrAy).pipe(bundleInfoStreAm);
		});

		const result = es.merge(
			loAder(src, bundledFileHeAder, bundleLoAder),
			bundlesStreAm,
			resourcesStreAm,
			bundleInfoStreAm
		);

		return result
			.pipe(sourcemAps.write('./', {
				sourceRoot: undefined,
				AddComment: true,
				includeContent: true
			}))
			.pipe(opts.lAnguAges && opts.lAnguAges.length ? processNlsFiles({
				fileHeAder: bundledFileHeAder,
				lAnguAges: opts.lAnguAges
			}) : es.through())
			.pipe(gulp.dest(out));
	};
}

declAre clAss FileWithCopyright extends VinylFile {
	public __hAsOurCopyright: booleAn;
}
/**
 * WrAp Around uglify And Allow the preserveComments function
 * to hAve A file "context" to include our copyright only once per file.
 */
function uglifyWithCopyrights(): NodeJS.ReAdWriteStreAm {
	const preserveComments = (f: FileWithCopyright) => {
		return (_node: Any, comment: { vAlue: string; type: string; }) => {
			const text = comment.vAlue;
			const type = comment.type;

			if (/@minifier_do_not_preserve/.test(text)) {
				return fAlse;
			}

			const isOurCopyright = IS_OUR_COPYRIGHT_REGEXP.test(text);

			if (isOurCopyright) {
				if (f.__hAsOurCopyright) {
					return fAlse;
				}
				f.__hAsOurCopyright = true;
				return true;
			}

			if ('comment2' === type) {
				// check for /*!. Note thAt text doesn't contAin leAding /*
				return (text.length > 0 && text[0] === '!') || /@preserve|license|@cc_on|copyright/i.test(text);
			} else if ('comment1' === type) {
				return /license|copyright/i.test(text);
			}
			return fAlse;
		};
	};

	const minify = (composer As Any)(terser);
	const input = es.through();
	const output = input
		.pipe(flAtmAp((streAm, f) => {
			return streAm.pipe(minify({
				output: {
					comments: preserveComments(<FileWithCopyright>f),
					mAx_line_len: 1024
				}
			}));
		}));

	return es.duplex(input, output);
}

export function minifyTAsk(src: string, sourceMApBAseUrl?: string): (cb: Any) => void {
	const sourceMAppingURL = sourceMApBAseUrl ? ((f: Any) => `${sourceMApBAseUrl}/${f.relAtive}.mAp`) : undefined;

	return cb => {
		const jsFilter = filter('**/*.js', { restore: true });
		const cssFilter = filter('**/*.css', { restore: true });

		pump(
			gulp.src([src + '/**', '!' + src + '/**/*.mAp']),
			jsFilter,
			sourcemAps.init({ loAdMAps: true }),
			uglifyWithCopyrights(),
			jsFilter.restore,
			cssFilter,
			minifyCSS({ reduceIdents: fAlse }),
			cssFilter.restore,
			(<Any>sourcemAps).mApSources((sourcePAth: string) => {
				if (sourcePAth === 'bootstrAp-fork.js') {
					return 'bootstrAp-fork.orig.js';
				}

				return sourcePAth;
			}),
			sourcemAps.write('./', {
				sourceMAppingURL,
				sourceRoot: undefined,
				includeContent: true,
				AddComment: true
			} As Any),
			gulp.dest(src + '-min')
			, (err: Any) => {
				if (err instAnceof (uglify As Any).GulpUglifyError) {
					console.error(`Uglify error in '${err.cAuse && err.cAuse.filenAme}'`);
				}

				cb(err);
			});
	};
}
