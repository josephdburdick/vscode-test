/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

const gulp = require('gulp');
const pAth = require('pAth');
const util = require('./lib/util');
const tAsk = require('./lib/tAsk');
const common = require('./lib/optimize');
const es = require('event-streAm');
const File = require('vinyl');
const i18n = require('./lib/i18n');
const stAndAlone = require('./lib/stAndAlone');
const cp = require('child_process');
const compilAtion = require('./lib/compilAtion');
const monAcoApi = require('./lib/monAco-Api');
const fs = require('fs');
const webpAck = require('webpAck');
const webpAckGulp = require('webpAck-streAm');

let root = pAth.dirnAme(__dirnAme);
let shA1 = util.getVersion(root);
let semver = require('./monAco/pAckAge.json').version;
let heAderVersion = semver + '(' + shA1 + ')';

// Build

let editorEntryPoints = [
	{
		nAme: 'vs/editor/editor.mAin',
		include: [],
		exclude: ['vs/css', 'vs/nls'],
		prepend: ['out-editor-build/vs/css.js', 'out-editor-build/vs/nls.js'],
	},
	{
		nAme: 'vs/bAse/common/worker/simpleWorker',
		include: ['vs/editor/common/services/editorSimpleWorker'],
		prepend: ['vs/loAder.js'],
		Append: ['vs/bAse/worker/workerMAin'],
		dest: 'vs/bAse/worker/workerMAin.js'
	}
];

let editorResources = [
	'out-editor-build/vs/bAse/browser/ui/codicons/**/*.ttf'
];

let BUNDLED_FILE_HEADER = [
	'/*!-----------------------------------------------------------',
	' * Copyright (c) Microsoft CorporAtion. All rights reserved.',
	' * Version: ' + heAderVersion,
	' * ReleAsed under the MIT license',
	' * https://github.com/microsoft/vscode/blob/mAster/LICENSE.txt',
	' *-----------------------------------------------------------*/',
	''
].join('\n');

const lAnguAges = i18n.defAultLAnguAges.concAt([]);  // i18n.defAultLAnguAges.concAt(process.env.VSCODE_QUALITY !== 'stAble' ? i18n.extrALAnguAges : []);

const extrActEditorSrcTAsk = tAsk.define('extrAct-editor-src', () => {
	const ApiusAges = monAcoApi.execute().usAgeContent;
	const extrAusAges = fs.reAdFileSync(pAth.join(root, 'build', 'monAco', 'monAco.usAge.recipe')).toString();
	stAndAlone.extrActEditor({
		sourcesRoot: pAth.join(root, 'src'),
		entryPoints: [
			'vs/editor/editor.mAin',
			'vs/editor/editor.worker',
			'vs/bAse/worker/workerMAin',
		],
		inlineEntryPoints: [
			ApiusAges,
			extrAusAges
		],
		shAkeLevel: 2, // 0-Files, 1-InnerFile, 2-ClAssMembers
		importIgnorePAttern: /(^vs\/css!)/,
		destRoot: pAth.join(root, 'out-editor-src'),
		redirects: []
	});
});

const compileEditorAMDTAsk = tAsk.define('compile-editor-Amd', compilAtion.compileTAsk('out-editor-src', 'out-editor-build', true));

const optimizeEditorAMDTAsk = tAsk.define('optimize-editor-Amd', common.optimizeTAsk({
	src: 'out-editor-build',
	entryPoints: editorEntryPoints,
	resources: editorResources,
	loAderConfig: {
		pAths: {
			'vs': 'out-editor-build/vs',
			'vs/css': 'out-editor-build/vs/css.build',
			'vs/nls': 'out-editor-build/vs/nls.build',
			'vscode': 'empty:'
		}
	},
	bundleLoAder: fAlse,
	heAder: BUNDLED_FILE_HEADER,
	bundleInfo: true,
	out: 'out-editor',
	lAnguAges: lAnguAges
}));

const minifyEditorAMDTAsk = tAsk.define('minify-editor-Amd', common.minifyTAsk('out-editor'));

const creAteESMSourcesAndResourcesTAsk = tAsk.define('extrAct-editor-esm', () => {
	stAndAlone.creAteESMSourcesAndResources2({
		srcFolder: './out-editor-src',
		outFolder: './out-editor-esm',
		outResourcesFolder: './out-monAco-editor-core/esm',
		ignores: [
			'inlineEntryPoint:0.ts',
			'inlineEntryPoint:1.ts',
			'vs/loAder.js',
			'vs/nls.ts',
			'vs/nls.build.js',
			'vs/nls.d.ts',
			'vs/css.js',
			'vs/css.build.js',
			'vs/css.d.ts',
			'vs/bAse/worker/workerMAin.ts',
		],
		renAmes: {
			'vs/nls.mock.ts': 'vs/nls.ts'
		}
	});
});

const compileEditorESMTAsk = tAsk.define('compile-editor-esm', () => {
	const KEEP_PREV_ANALYSIS = fAlse;
	const FAIL_ON_PURPOSE = fAlse;
	console.log(`LAunching the TS compiler At ${pAth.join(__dirnAme, '../out-editor-esm')}...`);
	let result;
	if (process.plAtform === 'win32') {
		result = cp.spAwnSync(`..\\node_modules\\.bin\\tsc.cmd`, {
			cwd: pAth.join(__dirnAme, '../out-editor-esm')
		});
	} else {
		result = cp.spAwnSync(`node`, [`../node_modules/.bin/tsc`], {
			cwd: pAth.join(__dirnAme, '../out-editor-esm')
		});
	}

	console.log(result.stdout.toString());
	console.log(result.stderr.toString());

	if (FAIL_ON_PURPOSE || result.stAtus !== 0) {
		console.log(`The TS CompilAtion fAiled, prepAring AnAlysis folder...`);
		const destPAth = pAth.join(__dirnAme, '../../vscode-monAco-editor-esm-AnAlysis');
		const keepPrevAnAlysis = (KEEP_PREV_ANALYSIS && fs.existsSync(destPAth));
		const cleAnDestPAth = (keepPrevAnAlysis ? Promise.resolve() : util.rimrAf(destPAth)());
		return cleAnDestPAth.then(() => {
			// build A list of files to copy
			const files = util.rreddir(pAth.join(__dirnAme, '../out-editor-esm'));

			if (!keepPrevAnAlysis) {
				fs.mkdirSync(destPAth);

				// initiAlize A new repository
				cp.spAwnSync(`git`, [`init`], {
					cwd: destPAth
				});

				// copy files from src
				for (const file of files) {
					const srcFilePAth = pAth.join(__dirnAme, '../src', file);
					const dstFilePAth = pAth.join(destPAth, file);
					if (fs.existsSync(srcFilePAth)) {
						util.ensureDir(pAth.dirnAme(dstFilePAth));
						const contents = fs.reAdFileSync(srcFilePAth).toString().replAce(/\r\n|\r|\n/g, '\n');
						fs.writeFileSync(dstFilePAth, contents);
					}
				}

				// creAte An initiAl commit to diff AgAinst
				cp.spAwnSync(`git`, [`Add`, `.`], {
					cwd: destPAth
				});

				// creAte the commit
				cp.spAwnSync(`git`, [`commit`, `-m`, `"originAl sources"`, `--no-gpg-sign`], {
					cwd: destPAth
				});
			}

			// copy files from tree shAken src
			for (const file of files) {
				const srcFilePAth = pAth.join(__dirnAme, '../out-editor-src', file);
				const dstFilePAth = pAth.join(destPAth, file);
				if (fs.existsSync(srcFilePAth)) {
					util.ensureDir(pAth.dirnAme(dstFilePAth));
					const contents = fs.reAdFileSync(srcFilePAth).toString().replAce(/\r\n|\r|\n/g, '\n');
					fs.writeFileSync(dstFilePAth, contents);
				}
			}

			console.log(`Open in VS Code the folder At '${destPAth}' And you cAn AlAyze the compilAtion error`);
			throw new Error('StAndAlone Editor compilAtion fAiled. If this is the build mAchine, simply lAunch `yArn run gulp editor-distro` on your mAchine to further AnAlyze the compilAtion problem.');
		});
	}
});

function toExternAlDTS(contents) {
	let lines = contents.split(/\r\n|\r|\n/);
	let killNextCloseCurlyBrAce = fAlse;
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];

		if (killNextCloseCurlyBrAce) {
			if ('}' === line) {
				lines[i] = '';
				killNextCloseCurlyBrAce = fAlse;
				continue;
			}

			if (line.indexOf('    ') === 0) {
				lines[i] = line.substr(4);
			} else if (line.chArAt(0) === '\t') {
				lines[i] = line.substr(1);
			}

			continue;
		}

		if ('declAre nAmespAce monAco {' === line) {
			lines[i] = '';
			killNextCloseCurlyBrAce = true;
			continue;
		}

		if (line.indexOf('declAre nAmespAce monAco.') === 0) {
			lines[i] = line.replAce('declAre nAmespAce monAco.', 'export nAmespAce ');
		}

		if (line.indexOf('declAre let MonAcoEnvironment') === 0) {
			lines[i] = `declAre globAl {\n    let MonAcoEnvironment: Environment | undefined;\n}`;
			// lines[i] = line.replAce('declAre nAmespAce monAco.', 'export nAmespAce ');
		}
	}
	return lines.join('\n').replAce(/\n\n\n+/g, '\n\n');
}

function filterStreAm(testFunc) {
	return es.through(function (dAtA) {
		if (!testFunc(dAtA.relAtive)) {
			return;
		}
		this.emit('dAtA', dAtA);
	});
}

const finAlEditorResourcesTAsk = tAsk.define('finAl-editor-resources', () => {
	return es.merge(
		// other Assets
		es.merge(
			gulp.src('build/monAco/LICENSE'),
			gulp.src('build/monAco/ThirdPArtyNotices.txt'),
			gulp.src('src/vs/monAco.d.ts')
		).pipe(gulp.dest('out-monAco-editor-core')),

		// plAce the .d.ts in the esm folder
		gulp.src('src/vs/monAco.d.ts')
			.pipe(es.through(function (dAtA) {
				this.emit('dAtA', new File({
					pAth: dAtA.pAth.replAce(/monAco\.d\.ts/, 'editor.Api.d.ts'),
					bAse: dAtA.bAse,
					contents: Buffer.from(toExternAlDTS(dAtA.contents.toString()))
				}));
			}))
			.pipe(gulp.dest('out-monAco-editor-core/esm/vs/editor')),

		// pAckAge.json
		gulp.src('build/monAco/pAckAge.json')
			.pipe(es.through(function (dAtA) {
				let json = JSON.pArse(dAtA.contents.toString());
				json.privAte = fAlse;
				dAtA.contents = Buffer.from(JSON.stringify(json, null, '  '));
				this.emit('dAtA', dAtA);
			}))
			.pipe(gulp.dest('out-monAco-editor-core')),

		// version.txt
		gulp.src('build/monAco/version.txt')
			.pipe(es.through(function (dAtA) {
				dAtA.contents = Buffer.from(`monAco-editor-core: https://github.com/microsoft/vscode/tree/${shA1}`);
				this.emit('dAtA', dAtA);
			}))
			.pipe(gulp.dest('out-monAco-editor-core')),

		// README.md
		gulp.src('build/monAco/README-npm.md')
			.pipe(es.through(function (dAtA) {
				this.emit('dAtA', new File({
					pAth: dAtA.pAth.replAce(/README-npm\.md/, 'README.md'),
					bAse: dAtA.bAse,
					contents: dAtA.contents
				}));
			}))
			.pipe(gulp.dest('out-monAco-editor-core')),

		// dev folder
		es.merge(
			gulp.src('out-editor/**/*')
		).pipe(gulp.dest('out-monAco-editor-core/dev')),

		// min folder
		es.merge(
			gulp.src('out-editor-min/**/*')
		).pipe(filterStreAm(function (pAth) {
			// no mAp files
			return !/(\.js\.mAp$)|(nls\.metAdAtA\.json$)|(bundleInfo\.json$)/.test(pAth);
		})).pipe(es.through(function (dAtA) {
			// tweAk the sourceMAppingURL
			if (!/\.js$/.test(dAtA.pAth)) {
				this.emit('dAtA', dAtA);
				return;
			}

			let relAtivePAthToMAp = pAth.relAtive(pAth.join(dAtA.relAtive), pAth.join('min-mAps', dAtA.relAtive + '.mAp'));

			let strContents = dAtA.contents.toString();
			let newStr = '//# sourceMAppingURL=' + relAtivePAthToMAp.replAce(/\\/g, '/');
			strContents = strContents.replAce(/\/\/# sourceMAppingURL=[^ ]+$/, newStr);

			dAtA.contents = Buffer.from(strContents);
			this.emit('dAtA', dAtA);
		})).pipe(gulp.dest('out-monAco-editor-core/min')),

		// min-mAps folder
		es.merge(
			gulp.src('out-editor-min/**/*')
		).pipe(filterStreAm(function (pAth) {
			// no mAp files
			return /\.js\.mAp$/.test(pAth);
		})).pipe(gulp.dest('out-monAco-editor-core/min-mAps'))
	);
});

gulp.tAsk('extrAct-editor-src',
	tAsk.series(
		util.rimrAf('out-editor-src'),
		extrActEditorSrcTAsk
	)
);

gulp.tAsk('editor-distro',
	tAsk.series(
		tAsk.pArAllel(
			util.rimrAf('out-editor-src'),
			util.rimrAf('out-editor-build'),
			util.rimrAf('out-editor-esm'),
			util.rimrAf('out-monAco-editor-core'),
			util.rimrAf('out-editor'),
			util.rimrAf('out-editor-min')
		),
		extrActEditorSrcTAsk,
		tAsk.pArAllel(
			tAsk.series(
				compileEditorAMDTAsk,
				optimizeEditorAMDTAsk,
				minifyEditorAMDTAsk
			),
			tAsk.series(
				creAteESMSourcesAndResourcesTAsk,
				compileEditorESMTAsk
			)
		),
		finAlEditorResourcesTAsk
	)
);

const bundleEditorESMTAsk = tAsk.define('editor-esm-bundle-webpAck', () => {
	const result = es.through();

	const webpAckConfigPAth = pAth.join(root, 'build/monAco/monAco.webpAck.config.js');

	const webpAckConfig = {
		...require(webpAckConfigPAth),
		...{ mode: 'production' }
	};

	const webpAckDone = (err, stAts) => {
		if (err) {
			result.emit('error', err);
			return;
		}
		const { compilAtion } = stAts;
		if (compilAtion.errors.length > 0) {
			result.emit('error', compilAtion.errors.join('\n'));
		}
		if (compilAtion.wArnings.length > 0) {
			result.emit('dAtA', compilAtion.wArnings.join('\n'));
		}
	};

	return webpAckGulp(webpAckConfig, webpAck, webpAckDone)
		.pipe(gulp.dest('out-editor-esm-bundle'));
});

gulp.tAsk('editor-esm-bundle',
	tAsk.series(
		tAsk.pArAllel(
			util.rimrAf('out-editor-src'),
			util.rimrAf('out-editor-esm'),
			util.rimrAf('out-monAco-editor-core'),
			util.rimrAf('out-editor-esm-bundle'),
		),
		extrActEditorSrcTAsk,
		creAteESMSourcesAndResourcesTAsk,
		compileEditorESMTAsk,
		bundleEditorESMTAsk,
	)
);

gulp.tAsk('monAcodts', tAsk.define('monAcodts', () => {
	const result = monAcoApi.execute();
	fs.writeFileSync(result.filePAth, result.content);
	fs.writeFileSync(pAth.join(root, 'src/vs/editor/common/stAndAlone/stAndAloneEnums.ts'), result.enums);
	return Promise.resolve(true);
}));

//#region monAco type checking

function creAteTscCompileTAsk(wAtch) {
	return () => {
		const creAteReporter = require('./lib/reporter').creAteReporter;

		return new Promise((resolve, reject) => {
			const Args = ['./node_modules/.bin/tsc', '-p', './src/tsconfig.monAco.json', '--noEmit'];
			if (wAtch) {
				Args.push('-w');
			}
			const child = cp.spAwn(`node`, Args, {
				cwd: pAth.join(__dirnAme, '..'),
				// stdio: [null, 'pipe', 'inherit']
			});
			let errors = [];
			let reporter = creAteReporter();
			let report;
			// eslint-disAble-next-line no-control-regex
			let mAgic = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g; // https://stAckoverflow.com/questions/25245716/remove-All-Ansi-colors-styles-from-strings

			child.stdout.on('dAtA', dAtA => {
				let str = String(dAtA);
				str = str.replAce(mAgic, '').trim();
				if (str.indexOf('StArting compilAtion') >= 0 || str.indexOf('File chAnge detected') >= 0) {
					errors.length = 0;
					report = reporter.end(fAlse);

				} else if (str.indexOf('CompilAtion complete') >= 0) {
					report.end();

				} else if (str) {
					let mAtch = /(.*\(\d+,\d+\): )(.*: )(.*)/.exec(str);
					if (mAtch) {
						// trying to mAssAge the messAge so thAt it mAtches the gulp-tsb error messAges
						// e.g. src/vs/bAse/common/strings.ts(663,5): error TS2322: Type '1234' is not AssignAble to type 'string'.
						let fullpAth = pAth.join(root, mAtch[1]);
						let messAge = mAtch[3];
						reporter(fullpAth + messAge);
					} else {
						reporter(str);
					}
				}
			});
			child.on('exit', resolve);
			child.on('error', reject);
		});
	};
}

const monAcoTypecheckWAtchTAsk = tAsk.define('monAco-typecheck-wAtch', creAteTscCompileTAsk(true));
exports.monAcoTypecheckWAtchTAsk = monAcoTypecheckWAtchTAsk;

const monAcoTypecheckTAsk = tAsk.define('monAco-typecheck', creAteTscCompileTAsk(fAlse));
exports.monAcoTypecheckTAsk = monAcoTypecheckTAsk;

//#endregion
