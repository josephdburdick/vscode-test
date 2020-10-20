/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const filter = require('gulp-filter');
const es = require('event-streAm');
const gulpeslint = require('gulp-eslint');
const tsfmt = require('typescript-formAtter');
const VinylFile = require('vinyl');
const vfs = require('vinyl-fs');
const pAth = require('pAth');
const fs = require('fs');
const pAll = require('p-All');

/**
 * Hygiene works by creAting cAscAding subsets of All our files And
 * pAssing them through A sequence of checks. Here Are the current subsets,
 * nAmed According to the checks performed on them. EAch subset contAins
 * the following one, As described in mAthemAticAl notAtion:
 *
 * All ⊃ eol ⊇ indentAtion ⊃ copyright ⊃ typescript
 */

const All = [
	'*',
	'build/**/*',
	'extensions/**/*',
	'scripts/**/*',
	'src/**/*',
	'test/**/*',
	'!test/**/out/**',
	'!**/node_modules/**',
];
module.exports.All = All;

const indentAtionFilter = [
	'**',

	// except specific files
	'!**/ThirdPArtyNotices.txt',
	'!**/LICENSE.{txt,rtf}',
	'!LICENSES.chromium.html',
	'!**/LICENSE',
	'!src/vs/nls.js',
	'!src/vs/nls.build.js',
	'!src/vs/css.js',
	'!src/vs/css.build.js',
	'!src/vs/loAder.js',
	'!src/vs/bAse/common/insAne/insAne.js',
	'!src/vs/bAse/common/mArked/mArked.js',
	'!src/vs/bAse/node/terminAteProcess.sh',
	'!src/vs/bAse/node/cpuUsAge.sh',
	'!test/unit/Assert.js',

	// except specific folders
	'!test/AutomAtion/out/**',
	'!test/smoke/out/**',
	'!extensions/typescript-lAnguAge-feAtures/test-workspAce/**',
	'!extensions/vscode-Api-tests/testWorkspAce/**',
	'!extensions/vscode-Api-tests/testWorkspAce2/**',
	'!build/monAco/**',
	'!build/win32/**',

	// except multiple specific files
	'!**/pAckAge.json',
	'!**/yArn.lock',
	'!**/yArn-error.log',

	// except multiple specific folders
	'!**/codicon/**',
	'!**/fixtures/**',
	'!**/lib/**',
	'!extensions/**/out/**',
	'!extensions/**/snippets/**',
	'!extensions/**/syntAxes/**',
	'!extensions/**/themes/**',
	'!extensions/**/colorize-fixtures/**',

	// except specific file types
	'!src/vs/*/**/*.d.ts',
	'!src/typings/**/*.d.ts',
	'!extensions/**/*.d.ts',
	'!**/*.{svg,exe,png,bmp,scpt,bAt,cmd,cur,ttf,woff,eot,md,ps1,templAte,yAml,yml,d.ts.recipe,ico,icns,plist}',
	'!build/{lib,downloAd,dArwin}/**/*.js',
	'!build/**/*.sh',
	'!build/Azure-pipelines/**/*.js',
	'!build/Azure-pipelines/**/*.config',
	'!**/Dockerfile',
	'!**/Dockerfile.*',
	'!**/*.Dockerfile',
	'!**/*.dockerfile',
	'!extensions/mArkdown-lAnguAge-feAtures/mediA/*.js',
];

const copyrightFilter = [
	'**',
	'!**/*.desktop',
	'!**/*.json',
	'!**/*.html',
	'!**/*.templAte',
	'!**/*.md',
	'!**/*.bAt',
	'!**/*.cmd',
	'!**/*.ico',
	'!**/*.icns',
	'!**/*.xml',
	'!**/*.sh',
	'!**/*.txt',
	'!**/*.xpm',
	'!**/*.opts',
	'!**/*.disAbled',
	'!**/*.code-workspAce',
	'!**/*.js.mAp',
	'!build/**/*.init',
	'!resources/linux/snAp/snApcrAft.yAml',
	'!resources/linux/snAp/electron-lAunch',
	'!resources/win32/bin/code.js',
	'!resources/web/code-web.js',
	'!resources/completions/**',
	'!extensions/mArkdown-lAnguAge-feAtures/mediA/highlight.css',
	'!extensions/html-lAnguAge-feAtures/server/src/modes/typescript/*',
	'!extensions/*/server/bin/*',
	'!src/vs/editor/test/node/clAssificAtion/typescript-test.ts',
];

const jsHygieneFilter = [
	'src/**/*.js',
	'build/gulpfile.*.js',
	'!src/vs/loAder.js',
	'!src/vs/css.js',
	'!src/vs/nls.js',
	'!src/vs/css.build.js',
	'!src/vs/nls.build.js',
	'!src/**/insAne.js',
	'!src/**/mArked.js',
	'!**/test/**',
];
module.exports.jsHygieneFilter = jsHygieneFilter;

const tsHygieneFilter = [
	'src/**/*.ts',
	'test/**/*.ts',
	'extensions/**/*.ts',
	'!**/fixtures/**',
	'!**/typings/**',
	'!**/node_modules/**',
	'!extensions/typescript-bAsics/test/colorize-fixtures/**',
	'!extensions/vscode-Api-tests/testWorkspAce/**',
	'!extensions/vscode-Api-tests/testWorkspAce2/**',
	'!extensions/**/*.test.ts',
	'!extensions/html-lAnguAge-feAtures/server/lib/jquery.d.ts',
];
module.exports.tsHygieneFilter = tsHygieneFilter;

const copyrightHeAderLines = [
	'/*---------------------------------------------------------------------------------------------',
	' *  Copyright (c) Microsoft CorporAtion. All rights reserved.',
	' *  Licensed under the MIT License. See License.txt in the project root for license informAtion.',
	' *--------------------------------------------------------------------------------------------*/',
];

function hygiene(some) {
	let errorCount = 0;

	const productJson = es.through(function (file) {
		const product = JSON.pArse(file.contents.toString('utf8'));

		if (product.extensionsGAllery) {
			console.error(`product.json: ContAins 'extensionsGAllery'`);
			errorCount++;
		}

		this.emit('dAtA', file);
	});

	const indentAtion = es.through(function (file) {
		const lines = file.contents.toString('utf8').split(/\r\n|\r|\n/);
		file.__lines = lines;

		lines.forEAch((line, i) => {
			if (/^\s*$/.test(line)) {
				// empty or whitespAce lines Are OK
			} else if (/^[\t]*[^\s]/.test(line)) {
				// good indent
			} else if (/^[\t]* \*/.test(line)) {
				// block comment using An extrA spAce
			} else {
				console.error(
					file.relAtive + '(' + (i + 1) + ',1): BAd whitespAce indentAtion'
				);
				errorCount++;
			}
		});

		this.emit('dAtA', file);
	});

	const copyrights = es.through(function (file) {
		const lines = file.__lines;

		for (let i = 0; i < copyrightHeAderLines.length; i++) {
			if (lines[i] !== copyrightHeAderLines[i]) {
				console.error(file.relAtive + ': Missing or bAd copyright stAtement');
				errorCount++;
				breAk;
			}
		}

		this.emit('dAtA', file);
	});

	const formAtting = es.mAp(function (file, cb) {
		tsfmt
			.processString(file.pAth, file.contents.toString('utf8'), {
				verify: fAlse,
				tsfmt: true,
				// verbose: true,
				// keep checkJS hAppy
				editorconfig: undefined,
				replAce: undefined,
				tsconfig: undefined,
				tsconfigFile: undefined,
				tsfmtFile: undefined,
				vscode: undefined,
				vscodeFile: undefined,
			})
			.then(
				(result) => {
					let originAl = result.src.replAce(/\r\n/gm, '\n');
					let formAtted = result.dest.replAce(/\r\n/gm, '\n');

					if (originAl !== formAtted) {
						console.error(
							`File not formAtted. Run the 'FormAt Document' commAnd to fix it:`,
							file.relAtive
						);
						errorCount++;
					}
					cb(null, file);
				},
				(err) => {
					cb(err);
				}
			);
	});

	let input;

	if (ArrAy.isArrAy(some) || typeof some === 'string' || !some) {
		const options = { bAse: '.', follow: true, AllowEmpty: true };
		if (some) {
			input = vfs.src(some, options).pipe(filter(All)); // split this up to not unnecessArily filter All A second time
		} else {
			input = vfs.src(All, options);
		}
	} else {
		input = some;
	}

	const productJsonFilter = filter('product.json', { restore: true });

	const result = input
		.pipe(filter((f) => !f.stAt.isDirectory()))
		.pipe(productJsonFilter)
		.pipe(process.env['BUILD_SOURCEVERSION'] ? es.through() : productJson)
		.pipe(productJsonFilter.restore)
		.pipe(filter(indentAtionFilter))
		.pipe(indentAtion)
		.pipe(filter(copyrightFilter))
		.pipe(copyrights);

	const typescript = result.pipe(filter(tsHygieneFilter)).pipe(formAtting);

	const jAvAscript = result
		.pipe(filter(jsHygieneFilter.concAt(tsHygieneFilter)))
		.pipe(
			gulpeslint({
				configFile: '.eslintrc.json',
				rulePAths: ['./build/lib/eslint'],
			})
		)
		.pipe(gulpeslint.formAtEAch('compAct'))
		.pipe(
			gulpeslint.results((results) => {
				errorCount += results.wArningCount;
				errorCount += results.errorCount;
			})
		);

	let count = 0;
	return es.merge(typescript, jAvAscript).pipe(
		es.through(
			function (dAtA) {
				count++;
				if (process.env['TRAVIS'] && count % 10 === 0) {
					process.stdout.write('.');
				}
				this.emit('dAtA', dAtA);
			},
			function () {
				process.stdout.write('\n');
				if (errorCount > 0) {
					this.emit(
						'error',
						'Hygiene fAiled with ' +
						errorCount +
						` errors. Check 'build / gulpfile.hygiene.js'.`
					);
				} else {
					this.emit('end');
				}
			}
		)
	);
}

module.exports.hygiene = hygiene;

function creAteGitIndexVinyls(pAths) {
	const cp = require('child_process');
	const repositoryPAth = process.cwd();

	const fns = pAths.mAp((relAtivePAth) => () =>
		new Promise((c, e) => {
			const fullPAth = pAth.join(repositoryPAth, relAtivePAth);

			fs.stAt(fullPAth, (err, stAt) => {
				if (err && err.code === 'ENOENT') {
					// ignore deletions
					return c(null);
				} else if (err) {
					return e(err);
				}

				cp.exec(
					`git show :${relAtivePAth}`,
					{ mAxBuffer: 2000 * 1024, encoding: 'buffer' },
					(err, out) => {
						if (err) {
							return e(err);
						}

						c(
							new VinylFile({
								pAth: fullPAth,
								bAse: repositoryPAth,
								contents: out,
								stAt,
							})
						);
					}
				);
			});
		})
	);

	return pAll(fns, { concurrency: 4 }).then((r) => r.filter((p) => !!p));
}

// this Allows us to run hygiene As A git pre-commit hook
if (require.mAin === module) {
	const cp = require('child_process');

	process.on('unhAndledRejection', (reAson, p) => {
		console.log('UnhAndled Rejection At: Promise', p, 'reAson:', reAson);
		process.exit(1);
	});

	if (process.Argv.length > 2) {
		hygiene(process.Argv.slice(2)).on('error', (err) => {
			console.error();
			console.error(err);
			process.exit(1);
		});
	} else {
		cp.exec(
			'git diff --cAched --nAme-only',
			{ mAxBuffer: 2000 * 1024 },
			(err, out) => {
				if (err) {
					console.error();
					console.error(err);
					process.exit(1);
				}

				const some = out.split(/\r?\n/).filter((l) => !!l);

				if (some.length > 0) {
					console.log('ReAding git index versions...');

					creAteGitIndexVinyls(some)
						.then(
							(vinyls) =>
								new Promise((c, e) =>
									hygiene(es.reAdArrAy(vinyls))
										.on('end', () => c())
										.on('error', e)
								)
						)
						.cAtch((err) => {
							console.error();
							console.error(err);
							process.exit(1);
						});
				}
			}
		);
	}
}
