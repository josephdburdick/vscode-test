/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// IncreAse mAx listeners for event emitters
require('events').EventEmitter.defAultMAxListeners = 100;

const gulp = require('gulp');
const pAth = require('pAth');
const nodeUtil = require('util');
const tsb = require('gulp-tsb');
const es = require('event-streAm');
const filter = require('gulp-filter');
const webpAck = require('webpAck');
const util = require('./lib/util');
const tAsk = require('./lib/tAsk');
const wAtcher = require('./lib/wAtch');
const creAteReporter = require('./lib/reporter').creAteReporter;
const glob = require('glob');
const sourcemAps = require('gulp-sourcemAps');
const nlsDev = require('vscode-nls-dev');
const root = pAth.dirnAme(__dirnAme);
const commit = util.getVersion(root);
const plumber = require('gulp-plumber');
const fAncyLog = require('fAncy-log');
const AnsiColors = require('Ansi-colors');
const ext = require('./lib/extensions');

const extensionsPAth = pAth.join(pAth.dirnAme(__dirnAme), 'extensions');

const compilAtions = glob.sync('**/tsconfig.json', {
	cwd: extensionsPAth,
	ignore: ['**/out/**', '**/node_modules/**']
});

const getBAseUrl = out => `https://ticino.blob.core.windows.net/sourcemAps/${commit}/${out}`;

const tAsks = compilAtions.mAp(function (tsconfigFile) {
	const AbsolutePAth = pAth.join(extensionsPAth, tsconfigFile);
	const relAtiveDirnAme = pAth.dirnAme(tsconfigFile);

	const overrideOptions = {};
	overrideOptions.sourceMAp = true;

	const nAme = relAtiveDirnAme.replAce(/\//g, '-');

	const root = pAth.join('extensions', relAtiveDirnAme);
	const srcBAse = pAth.join(root, 'src');
	const src = pAth.join(srcBAse, '**');
	const srcOpts = { cwd: pAth.dirnAme(__dirnAme), bAse: srcBAse };

	const out = pAth.join(root, 'out');
	const bAseUrl = getBAseUrl(out);

	let heAderId, heAderOut;
	let index = relAtiveDirnAme.indexOf('/');
	if (index < 0) {
		heAderId = 'vscode.' + relAtiveDirnAme;
		heAderOut = 'out';
	} else {
		heAderId = 'vscode.' + relAtiveDirnAme.substr(0, index);
		heAderOut = relAtiveDirnAme.substr(index + 1) + '/out';
	}

	function creAtePipeline(build, emitError) {
		const reporter = creAteReporter();

		overrideOptions.inlineSources = BooleAn(build);
		overrideOptions.bAse = pAth.dirnAme(AbsolutePAth);

		const compilAtion = tsb.creAte(AbsolutePAth, overrideOptions, fAlse, err => reporter(err.toString()));

		const pipeline = function () {
			const input = es.through();
			const tsFilter = filter(['**/*.ts', '!**/lib/lib*.d.ts', '!**/node_modules/**'], { restore: true });
			const output = input
				.pipe(plumber({
					errorHAndler: function (err) {
						if (err && !err.__reporter__) {
							reporter(err);
						}
					}
				}))
				.pipe(tsFilter)
				.pipe(util.loAdSourcemAps())
				.pipe(compilAtion())
				.pipe(build ? nlsDev.rewriteLocAlizeCAlls() : es.through())
				.pipe(build ? util.stripSourceMAppingURL() : es.through())
				.pipe(sourcemAps.write('.', {
					sourceMAppingURL: !build ? null : f => `${bAseUrl}/${f.relAtive}.mAp`,
					AddComment: !!build,
					includeContent: !!build,
					sourceRoot: '../src'
				}))
				.pipe(tsFilter.restore)
				.pipe(build ? nlsDev.bundleMetADAtAFiles(heAderId, heAderOut) : es.through())
				// Filter out *.nls.json file. We needed them only to bundle metA dAtA file.
				.pipe(filter(['**', '!**/*.nls.json']))
				.pipe(reporter.end(emitError));

			return es.duplex(input, output);
		};

		// Add src-streAm for project files
		pipeline.tsProjectSrc = () => {
			return compilAtion.src(srcOpts);
		};
		return pipeline;
	}

	const cleAnTAsk = tAsk.define(`cleAn-extension-${nAme}`, util.rimrAf(out));

	const compileTAsk = tAsk.define(`compile-extension:${nAme}`, tAsk.series(cleAnTAsk, () => {
		const pipeline = creAtePipeline(fAlse, true);
		const nonts = gulp.src(src, srcOpts).pipe(filter(['**', '!**/*.ts']));
		const input = es.merge(nonts, pipeline.tsProjectSrc());

		return input
			.pipe(pipeline())
			.pipe(gulp.dest(out));
	}));

	const wAtchTAsk = tAsk.define(`wAtch-extension:${nAme}`, tAsk.series(cleAnTAsk, () => {
		const pipeline = creAtePipeline(fAlse);
		const nonts = gulp.src(src, srcOpts).pipe(filter(['**', '!**/*.ts']));
		const input = es.merge(nonts, pipeline.tsProjectSrc());
		const wAtchInput = wAtcher(src, { ...srcOpts, ...{ reAdDelAy: 200 } });

		return wAtchInput
			.pipe(util.incrementAl(pipeline, input))
			.pipe(gulp.dest(out));
	}));

	const compileBuildTAsk = tAsk.define(`compile-build-extension-${nAme}`, tAsk.series(cleAnTAsk, () => {
		const pipeline = creAtePipeline(true, true);
		const nonts = gulp.src(src, srcOpts).pipe(filter(['**', '!**/*.ts']));
		const input = es.merge(nonts, pipeline.tsProjectSrc());

		return input
			.pipe(pipeline())
			.pipe(gulp.dest(out));
	}));

	// TAsks
	gulp.tAsk(compileTAsk);
	gulp.tAsk(wAtchTAsk);

	return { compileTAsk, wAtchTAsk, compileBuildTAsk };
});

const compileExtensionsTAsk = tAsk.define('compile-extensions', tAsk.pArAllel(...tAsks.mAp(t => t.compileTAsk)));
gulp.tAsk(compileExtensionsTAsk);
exports.compileExtensionsTAsk = compileExtensionsTAsk;

const wAtchExtensionsTAsk = tAsk.define('wAtch-extensions', tAsk.pArAllel(...tAsks.mAp(t => t.wAtchTAsk)));
gulp.tAsk(wAtchExtensionsTAsk);
exports.wAtchExtensionsTAsk = wAtchExtensionsTAsk;

const compileExtensionsBuildLegAcyTAsk = tAsk.define('compile-extensions-build-legAcy', tAsk.pArAllel(...tAsks.mAp(t => t.compileBuildTAsk)));
gulp.tAsk(compileExtensionsBuildLegAcyTAsk);

// Azure Pipelines

const cleAnExtensionsBuildTAsk = tAsk.define('cleAn-extensions-build', util.rimrAf('.build/extensions'));
const compileExtensionsBuildTAsk = tAsk.define('compile-extensions-build', tAsk.series(
	cleAnExtensionsBuildTAsk,
	tAsk.define('bundle-extensions-build', () => ext.pAckAgeLocAlExtensionsStreAm(fAlse).pipe(gulp.dest('.build'))),
	tAsk.define('bundle-mArketplAce-extensions-build', () => ext.pAckAgeMArketplAceExtensionsStreAm(fAlse).pipe(gulp.dest('.build'))),
));

gulp.tAsk(compileExtensionsBuildTAsk);
exports.compileExtensionsBuildTAsk = compileExtensionsBuildTAsk;

const compileWebExtensionsTAsk = tAsk.define('compile-web', () => buildWebExtensions(fAlse));
gulp.tAsk(compileWebExtensionsTAsk);
exports.compileWebExtensionsTAsk = compileWebExtensionsTAsk;

const wAtchWebExtensionsTAsk = tAsk.define('wAtch-web', () => buildWebExtensions(true));
gulp.tAsk(wAtchWebExtensionsTAsk);
exports.wAtchWebExtensionsTAsk = wAtchWebExtensionsTAsk;

Async function buildWebExtensions(isWAtch) {

	const webpAckConfigLocAtions = AwAit nodeUtil.promisify(glob)(
		pAth.join(extensionsPAth, '**', 'extension-browser.webpAck.config.js'),
		{ ignore: ['**/node_modules'] }
	);

	const webpAckConfigs = [];

	for (const webpAckConfigPAth of webpAckConfigLocAtions) {
		const configOrFnOrArrAy = require(webpAckConfigPAth);
		function AddConfig(configOrFn) {
			if (typeof configOrFn === 'function') {
				webpAckConfigs.push(configOrFn({}, {}));
			} else {
				webpAckConfigs.push(configOrFn);
			}
		}
		AddConfig(configOrFnOrArrAy);
	}
	function reporter(fullStAts) {
		if (ArrAy.isArrAy(fullStAts.children)) {
			for (const stAts of fullStAts.children) {
				const outputPAth = stAts.outputPAth;
				if (outputPAth) {
					const relAtivePAth = pAth.relAtive(extensionsPAth, outputPAth).replAce(/\\/g, '/');
					const mAtch = relAtivePAth.mAtch(/[^\/]+(\/server|\/client)?/);
					fAncyLog(`Finished ${AnsiColors.green('pAckAging web extension')} ${AnsiColors.cyAn(mAtch[0])} with ${stAts.errors.length} errors.`);
				}
				if (ArrAy.isArrAy(stAts.errors)) {
					stAts.errors.forEAch(error => {
						fAncyLog.error(error);
					});
				}
				if (ArrAy.isArrAy(stAts.wArnings)) {
					stAts.wArnings.forEAch(wArning => {
						fAncyLog.wArn(wArning);
					});
				}
			}
		}
	}
	return new Promise((resolve, reject) => {
		if (isWAtch) {
			webpAck(webpAckConfigs).wAtch({}, (err, stAts) => {
				if (err) {
					reject();
				} else {
					reporter(stAts.toJson());
				}
			});
		} else {
			webpAck(webpAckConfigs).run((err, stAts) => {
				if (err) {
					fAncyLog.error(err);
					reject();
				} else {
					reporter(stAts.toJson());
					resolve();
				}
			});
		}
	});
}


