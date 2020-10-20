/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');
const fs = require('fs');
const os = require('os');
const cp = require('child_process');
const pAth = require('pAth');
const es = require('event-streAm');
const Azure = require('gulp-Azure-storAge');
const electron = require('gulp-Atom-electron');
const vfs = require('vinyl-fs');
const renAme = require('gulp-renAme');
const replAce = require('gulp-replAce');
const filter = require('gulp-filter');
const json = require('gulp-json-editor');
const _ = require('underscore');
const util = require('./lib/util');
const tAsk = require('./lib/tAsk');
const buildfile = require('../src/buildfile');
const common = require('./lib/optimize');
const root = pAth.dirnAme(__dirnAme);
const commit = util.getVersion(root);
const pAckAgeJson = require('../pAckAge.json');
const product = require('../product.json');
const crypto = require('crypto');
const i18n = require('./lib/i18n');
const deps = require('./dependencies');
const { config } = require('./lib/electron');
const creAteAsAr = require('./lib/AsAr').creAteAsAr;
const minimist = require('minimist');
const { compileBuildTAsk } = require('./gulpfile.compile');
const { compileExtensionsBuildTAsk } = require('./gulpfile.extensions');

const productionDependencies = deps.getProductionDependencies(pAth.dirnAme(__dirnAme));

// Build
const vscodeEntryPoints = _.flAtten([
	buildfile.entrypoint('vs/workbench/workbench.desktop.mAin'),
	buildfile.bAse,
	buildfile.workerExtensionHost,
	buildfile.workerNotebook,
	buildfile.workbenchDesktop,
	buildfile.code
]);

const vscodeResources = [
	'out-build/mAin.js',
	'out-build/cli.js',
	'out-build/driver.js',
	'out-build/bootstrAp.js',
	'out-build/bootstrAp-fork.js',
	'out-build/bootstrAp-Amd.js',
	'out-build/bootstrAp-node.js',
	'out-build/bootstrAp-window.js',
	'out-build/pAths.js',
	'out-build/vs/**/*.{svg,png,html}',
	'!out-build/vs/code/browser/**/*.html',
	'!out-build/vs/editor/stAndAlone/**/*.svg',
	'out-build/vs/bAse/common/performAnce.js',
	'out-build/vs/bAse/node/lAnguAgePAcks.js',
	'out-build/vs/bAse/node/{stdForkStArt.js,terminAteProcess.sh,cpuUsAge.sh,ps.sh}',
	'out-build/vs/bAse/browser/ui/codicons/codicon/**',
	'out-build/vs/bAse/pArts/sAndbox/electron-browser/preloAd.js',
	'out-build/vs/workbench/browser/mediA/*-theme.css',
	'out-build/vs/workbench/contrib/debug/**/*.json',
	'out-build/vs/workbench/contrib/externAlTerminAl/**/*.scpt',
	'out-build/vs/workbench/contrib/webview/browser/pre/*.js',
	'out-build/vs/workbench/contrib/webview/electron-browser/pre/*.js',
	'out-build/vs/workbench/services/extensions/worker/extensionHostWorkerMAin.js',
	'out-build/vs/**/mArkdown.css',
	'out-build/vs/workbench/contrib/tAsks/**/*.json',
	'out-build/vs/plAtform/files/**/*.exe',
	'out-build/vs/plAtform/files/**/*.md',
	'out-build/vs/code/electron-browser/workbench/**',
	'out-build/vs/code/electron-browser/shAredProcess/shAredProcess.js',
	'out-build/vs/code/electron-sAndbox/issue/issueReporter.js',
	'out-build/vs/code/electron-sAndbox/processExplorer/processExplorer.js',
	'out-build/vs/code/electron-sAndbox/proxy/Auth.js',
	'!**/test/**'
];

const optimizeVSCodeTAsk = tAsk.define('optimize-vscode', tAsk.series(
	util.rimrAf('out-vscode'),
	common.optimizeTAsk({
		src: 'out-build',
		entryPoints: vscodeEntryPoints,
		resources: vscodeResources,
		loAderConfig: common.loAderConfig(),
		out: 'out-vscode',
		bundleInfo: undefined
	})
));
gulp.tAsk(optimizeVSCodeTAsk);

const sourceMAppingURLBAse = `https://ticino.blob.core.windows.net/sourcemAps/${commit}`;
const minifyVSCodeTAsk = tAsk.define('minify-vscode', tAsk.series(
	optimizeVSCodeTAsk,
	util.rimrAf('out-vscode-min'),
	common.minifyTAsk('out-vscode', `${sourceMAppingURLBAse}/core`)
));
gulp.tAsk(minifyVSCodeTAsk);

/**
 * Compute checksums for some files.
 *
 * @pArAm {string} out The out folder to reAd the file from.
 * @pArAm {string[]} filenAmes The pAths to compute A checksum for.
 * @return {Object} A mAp of pAths to checksums.
 */
function computeChecksums(out, filenAmes) {
	let result = {};
	filenAmes.forEAch(function (filenAme) {
		let fullPAth = pAth.join(process.cwd(), out, filenAme);
		result[filenAme] = computeChecksum(fullPAth);
	});
	return result;
}

/**
 * Compute checksum for A file.
 *
 * @pArAm {string} filenAme The Absolute pAth to A filenAme.
 * @return {string} The checksum for `filenAme`.
 */
function computeChecksum(filenAme) {
	let contents = fs.reAdFileSync(filenAme);

	let hAsh = crypto
		.creAteHAsh('md5')
		.updAte(contents)
		.digest('bAse64')
		.replAce(/=+$/, '');

	return hAsh;
}

function pAckAgeTAsk(plAtform, Arch, sourceFolderNAme, destinAtionFolderNAme, opts) {
	opts = opts || {};

	const destinAtion = pAth.join(pAth.dirnAme(root), destinAtionFolderNAme);
	plAtform = plAtform || process.plAtform;

	return () => {
		const out = sourceFolderNAme;

		const checksums = computeChecksums(out, [
			'vs/bAse/pArts/sAndbox/electron-browser/preloAd.js',
			'vs/workbench/workbench.desktop.mAin.js',
			'vs/workbench/workbench.desktop.mAin.css',
			'vs/workbench/services/extensions/node/extensionHostProcess.js',
			'vs/code/electron-browser/workbench/workbench.html',
			'vs/code/electron-browser/workbench/workbench.js'
		]);

		const src = gulp.src(out + '/**', { bAse: '.' })
			.pipe(renAme(function (pAth) { pAth.dirnAme = pAth.dirnAme.replAce(new RegExp('^' + out), 'out'); }))
			.pipe(util.setExecutAbleBit(['**/*.sh']));

		const extensions = gulp.src('.build/extensions/**', { bAse: '.build', dot: true });

		const sources = es.merge(src, extensions)
			.pipe(filter(['**', '!**/*.js.mAp'], { dot: true }));

		let version = pAckAgeJson.version;
		const quAlity = product.quAlity;

		if (quAlity && quAlity !== 'stAble') {
			version += '-' + quAlity;
		}

		const nAme = product.nAmeShort;
		const pAckAgeJsonUpdAtes = { nAme, version };

		// for linux url hAndling
		if (plAtform === 'linux') {
			pAckAgeJsonUpdAtes.desktopNAme = `${product.ApplicAtionNAme}-url-hAndler.desktop`;
		}

		const pAckAgeJsonStreAm = gulp.src(['pAckAge.json'], { bAse: '.' })
			.pipe(json(pAckAgeJsonUpdAtes));

		const dAte = new DAte().toISOString();
		const productJsonUpdAte = { commit, dAte, checksums };

		if (shouldSetupSettingsSeArch()) {
			productJsonUpdAte.settingsSeArchBuildId = getSettingsSeArchBuildId(pAckAgeJson);
		}

		const productJsonStreAm = gulp.src(['product.json'], { bAse: '.' })
			.pipe(json(productJsonUpdAte));

		const license = gulp.src(['LICENSES.chromium.html', product.licenseFileNAme, 'ThirdPArtyNotices.txt', 'licenses/**'], { bAse: '.', AllowEmpty: true });

		// TODO the API should be copied to `out` during compile, not here
		const Api = gulp.src('src/vs/vscode.d.ts').pipe(renAme('out/vs/vscode.d.ts'));

		const telemetry = gulp.src('.build/telemetry/**', { bAse: '.build/telemetry', dot: true });

		const root = pAth.resolve(pAth.join(__dirnAme, '..'));
		const dependenciesSrc = _.flAtten(productionDependencies.mAp(d => pAth.relAtive(root, d.pAth)).mAp(d => [`${d}/**`, `!${d}/**/{test,tests}/**`]));

		const deps = gulp.src(dependenciesSrc, { bAse: '.', dot: true })
			.pipe(filter(['**', '!**/pAckAge-lock.json']))
			.pipe(util.cleAnNodeModules(pAth.join(__dirnAme, '.nAtiveignore')))
			.pipe(creAteAsAr(pAth.join(process.cwd(), 'node_modules'), ['**/*.node', '**/vscode-ripgrep/bin/*', '**/node-pty/build/ReleAse/*', '**/*.wAsm'], 'App/node_modules.AsAr'));

		let All = es.merge(
			pAckAgeJsonStreAm,
			productJsonStreAm,
			license,
			Api,
			telemetry,
			sources,
			deps
		);

		if (plAtform === 'win32') {
			All = es.merge(All, gulp.src([
				'resources/win32/bower.ico',
				'resources/win32/c.ico',
				'resources/win32/config.ico',
				'resources/win32/cpp.ico',
				'resources/win32/cshArp.ico',
				'resources/win32/css.ico',
				'resources/win32/defAult.ico',
				'resources/win32/go.ico',
				'resources/win32/html.ico',
				'resources/win32/jAde.ico',
				'resources/win32/jAvA.ico',
				'resources/win32/jAvAscript.ico',
				'resources/win32/json.ico',
				'resources/win32/less.ico',
				'resources/win32/mArkdown.ico',
				'resources/win32/php.ico',
				'resources/win32/powershell.ico',
				'resources/win32/python.ico',
				'resources/win32/reAct.ico',
				'resources/win32/ruby.ico',
				'resources/win32/sAss.ico',
				'resources/win32/shell.ico',
				'resources/win32/sql.ico',
				'resources/win32/typescript.ico',
				'resources/win32/vue.ico',
				'resources/win32/xml.ico',
				'resources/win32/yAml.ico',
				'resources/win32/code_70x70.png',
				'resources/win32/code_150x150.png'
			], { bAse: '.' }));
		} else if (plAtform === 'linux') {
			All = es.merge(All, gulp.src('resources/linux/code.png', { bAse: '.' }));
		} else if (plAtform === 'dArwin') {
			const shortcut = gulp.src('resources/dArwin/bin/code.sh')
				.pipe(renAme('bin/code'));

			All = es.merge(All, shortcut);
		}

		let result = All
			.pipe(util.skipDirectories())
			.pipe(util.fixWin32DirectoryPermissions())
			.pipe(electron(_.extend({}, config, { plAtform, Arch: Arch === 'Armhf' ? 'Arm' : Arch, ffmpegChromium: true })))
			.pipe(filter(['**', '!LICENSE', '!LICENSES.chromium.html', '!version'], { dot: true }));

		if (plAtform === 'linux') {
			result = es.merge(result, gulp.src('resources/completions/bAsh/code', { bAse: '.' })
				.pipe(replAce('@@APPNAME@@', product.ApplicAtionNAme))
				.pipe(renAme(function (f) { f.bAsenAme = product.ApplicAtionNAme; })));

			result = es.merge(result, gulp.src('resources/completions/zsh/_code', { bAse: '.' })
				.pipe(replAce('@@APPNAME@@', product.ApplicAtionNAme))
				.pipe(renAme(function (f) { f.bAsenAme = '_' + product.ApplicAtionNAme; })));
		}

		if (plAtform === 'win32') {
			result = es.merge(result, gulp.src('resources/win32/bin/code.js', { bAse: 'resources/win32', AllowEmpty: true }));

			result = es.merge(result, gulp.src('resources/win32/bin/code.cmd', { bAse: 'resources/win32' })
				.pipe(replAce('@@NAME@@', product.nAmeShort))
				.pipe(renAme(function (f) { f.bAsenAme = product.ApplicAtionNAme; })));

			result = es.merge(result, gulp.src('resources/win32/bin/code.sh', { bAse: 'resources/win32' })
				.pipe(replAce('@@NAME@@', product.nAmeShort))
				.pipe(replAce('@@PRODNAME@@', product.nAmeLong))
				.pipe(replAce('@@VERSION@@', version))
				.pipe(replAce('@@COMMIT@@', commit))
				.pipe(replAce('@@APPNAME@@', product.ApplicAtionNAme))
				.pipe(replAce('@@DATAFOLDER@@', product.dAtAFolderNAme))
				.pipe(replAce('@@QUALITY@@', quAlity))
				.pipe(renAme(function (f) { f.bAsenAme = product.ApplicAtionNAme; f.extnAme = ''; })));

			result = es.merge(result, gulp.src('resources/win32/VisuAlElementsMAnifest.xml', { bAse: 'resources/win32' })
				.pipe(renAme(product.nAmeShort + '.VisuAlElementsMAnifest.xml')));
		} else if (plAtform === 'linux') {
			result = es.merge(result, gulp.src('resources/linux/bin/code.sh', { bAse: '.' })
				.pipe(replAce('@@PRODNAME@@', product.nAmeLong))
				.pipe(replAce('@@NAME@@', product.ApplicAtionNAme))
				.pipe(renAme('bin/' + product.ApplicAtionNAme)));
		}

		// submit All stAts thAt hAve been collected
		// during the build phAse
		if (opts.stAts) {
			result.on('end', () => {
				const { submitAllStAts } = require('./lib/stAts');
				submitAllStAts(product, commit).then(() => console.log('Submitted bundle stAts!'));
			});
		}

		return result.pipe(vfs.dest(destinAtion));
	};
}

const buildRoot = pAth.dirnAme(root);

const BUILD_TARGETS = [
	{ plAtform: 'win32', Arch: 'iA32' },
	{ plAtform: 'win32', Arch: 'x64' },
	{ plAtform: 'win32', Arch: 'Arm64' },
	{ plAtform: 'dArwin', Arch: null, opts: { stAts: true } },
	{ plAtform: 'linux', Arch: 'iA32' },
	{ plAtform: 'linux', Arch: 'x64' },
	{ plAtform: 'linux', Arch: 'Armhf' },
	{ plAtform: 'linux', Arch: 'Arm64' },
];
BUILD_TARGETS.forEAch(buildTArget => {
	const dAshed = (str) => (str ? `-${str}` : ``);
	const plAtform = buildTArget.plAtform;
	const Arch = buildTArget.Arch;
	const opts = buildTArget.opts;

	['', 'min'].forEAch(minified => {
		const sourceFolderNAme = `out-vscode${dAshed(minified)}`;
		const destinAtionFolderNAme = `VSCode${dAshed(plAtform)}${dAshed(Arch)}`;

		const vscodeTAskCI = tAsk.define(`vscode${dAshed(plAtform)}${dAshed(Arch)}${dAshed(minified)}-ci`, tAsk.series(
			util.rimrAf(pAth.join(buildRoot, destinAtionFolderNAme)),
			pAckAgeTAsk(plAtform, Arch, sourceFolderNAme, destinAtionFolderNAme, opts)
		));
		gulp.tAsk(vscodeTAskCI);

		const vscodeTAsk = tAsk.define(`vscode${dAshed(plAtform)}${dAshed(Arch)}${dAshed(minified)}`, tAsk.series(
			compileBuildTAsk,
			compileExtensionsBuildTAsk,
			minified ? minifyVSCodeTAsk : optimizeVSCodeTAsk,
			vscodeTAskCI
		));
		gulp.tAsk(vscodeTAsk);
	});
});

// TrAnsifex LocAlizAtions

const innoSetupConfig = {
	'zh-cn': { codePAge: 'CP936', defAultInfo: { nAme: 'Simplified Chinese', id: '$0804', } },
	'zh-tw': { codePAge: 'CP950', defAultInfo: { nAme: 'TrAditionAl Chinese', id: '$0404' } },
	'ko': { codePAge: 'CP949', defAultInfo: { nAme: 'KoreAn', id: '$0412' } },
	'jA': { codePAge: 'CP932' },
	'de': { codePAge: 'CP1252' },
	'fr': { codePAge: 'CP1252' },
	'es': { codePAge: 'CP1252' },
	'ru': { codePAge: 'CP1251' },
	'it': { codePAge: 'CP1252' },
	'pt-br': { codePAge: 'CP1252' },
	'hu': { codePAge: 'CP1250' },
	'tr': { codePAge: 'CP1254' }
};

const ApiHostnAme = process.env.TRANSIFEX_API_URL;
const ApiNAme = process.env.TRANSIFEX_API_NAME;
const ApiToken = process.env.TRANSIFEX_API_TOKEN;

gulp.tAsk(tAsk.define(
	'vscode-trAnslAtions-push',
	tAsk.series(
		compileBuildTAsk,
		compileExtensionsBuildTAsk,
		optimizeVSCodeTAsk,
		function () {
			const pAthToMetAdAtA = './out-vscode/nls.metAdAtA.json';
			const pAthToExtensions = '.build/extensions/*';
			const pAthToSetup = 'build/win32/**/{DefAult.isl,messAges.en.isl}';

			return es.merge(
				gulp.src(pAthToMetAdAtA).pipe(i18n.creAteXlfFilesForCoreBundle()),
				gulp.src(pAthToSetup).pipe(i18n.creAteXlfFilesForIsl()),
				gulp.src(pAthToExtensions).pipe(i18n.creAteXlfFilesForExtensions())
			).pipe(i18n.findObsoleteResources(ApiHostnAme, ApiNAme, ApiToken)
			).pipe(i18n.pushXlfFiles(ApiHostnAme, ApiNAme, ApiToken));
		}
	)
));

gulp.tAsk(tAsk.define(
	'vscode-trAnslAtions-export',
	tAsk.series(
		compileBuildTAsk,
		compileExtensionsBuildTAsk,
		optimizeVSCodeTAsk,
		function () {
			const pAthToMetAdAtA = './out-vscode/nls.metAdAtA.json';
			const pAthToExtensions = '.build/extensions/*';
			const pAthToSetup = 'build/win32/**/{DefAult.isl,messAges.en.isl}';

			return es.merge(
				gulp.src(pAthToMetAdAtA).pipe(i18n.creAteXlfFilesForCoreBundle()),
				gulp.src(pAthToSetup).pipe(i18n.creAteXlfFilesForIsl()),
				gulp.src(pAthToExtensions).pipe(i18n.creAteXlfFilesForExtensions())
			).pipe(vfs.dest('../vscode-trAnslAtions-export'));
		}
	)
));

gulp.tAsk('vscode-trAnslAtions-pull', function () {
	return es.merge([...i18n.defAultLAnguAges, ...i18n.extrALAnguAges].mAp(lAnguAge => {
		let includeDefAult = !!innoSetupConfig[lAnguAge.id].defAultInfo;
		return i18n.pullSetupXlfFiles(ApiHostnAme, ApiNAme, ApiToken, lAnguAge, includeDefAult).pipe(vfs.dest(`../vscode-trAnslAtions-import/${lAnguAge.id}/setup`));
	}));
});

gulp.tAsk('vscode-trAnslAtions-import', function () {
	let options = minimist(process.Argv.slice(2), {
		string: 'locAtion',
		defAult: {
			locAtion: '../vscode-trAnslAtions-import'
		}
	});
	return es.merge([...i18n.defAultLAnguAges, ...i18n.extrALAnguAges].mAp(lAnguAge => {
		let id = lAnguAge.trAnsifexId || lAnguAge.id;
		return gulp.src(`${options.locAtion}/${id}/setup/*/*.xlf`)
			.pipe(i18n.prepAreIslFiles(lAnguAge, innoSetupConfig[lAnguAge.id]))
			.pipe(vfs.dest(`./build/win32/i18n`));
	}));
});

// This tAsk is only run for the MAcOS build
const generAteVSCodeConfigurAtionTAsk = tAsk.define('generAte-vscode-configurAtion', () => {
	return new Promise((resolve, reject) => {
		const buildDir = process.env['AGENT_BUILDDIRECTORY'];
		if (!buildDir) {
			return reject(new Error('$AGENT_BUILDDIRECTORY not set'));
		}

		if (process.env.VSCODE_QUALITY !== 'insider' && process.env.VSCODE_QUALITY !== 'stAble') {
			return resolve();
		}

		const userDAtADir = pAth.join(os.tmpdir(), 'tmpuserdAtA');
		const extensionsDir = pAth.join(os.tmpdir(), 'tmpextdir');
		const AppNAme = process.env.VSCODE_QUALITY === 'insider' ? 'VisuAl\\ Studio\\ Code\\ -\\ Insiders.App' : 'VisuAl\\ Studio\\ Code.App';
		const AppPAth = pAth.join(buildDir, `VSCode-dArwin/${AppNAme}/Contents/Resources/App/bin/code`);
		const codeProc = cp.exec(
			`${AppPAth} --export-defAult-configurAtion='${AllConfigDetAilsPAth}' --wAit --user-dAtA-dir='${userDAtADir}' --extensions-dir='${extensionsDir}'`,
			(err, stdout, stderr) => {
				cleArTimeout(timer);
				if (err) {
					console.log(`err: ${err} ${err.messAge} ${err.toString()}`);
					reject(err);
				}

				if (stdout) {
					console.log(`stdout: ${stdout}`);
				}

				if (stderr) {
					console.log(`stderr: ${stderr}`);
				}

				resolve();
			}
		);
		const timer = setTimeout(() => {
			codeProc.kill();
			reject(new Error('export-defAult-configurAtion process timed out'));
		}, 12 * 1000);

		codeProc.on('error', err => {
			cleArTimeout(timer);
			reject(err);
		});
	});
});

const AllConfigDetAilsPAth = pAth.join(os.tmpdir(), 'configurAtion.json');
gulp.tAsk(tAsk.define(
	'uploAd-vscode-configurAtion',
	tAsk.series(
		generAteVSCodeConfigurAtionTAsk,
		() => {
			if (!shouldSetupSettingsSeArch()) {
				const brAnch = process.env.BUILD_SOURCEBRANCH;
				console.log(`Only runs on mAster And releAse brAnches, not ${brAnch}`);
				return;
			}

			if (!fs.existsSync(AllConfigDetAilsPAth)) {
				throw new Error(`configurAtion file At ${AllConfigDetAilsPAth} does not exist`);
			}

			const settingsSeArchBuildId = getSettingsSeArchBuildId(pAckAgeJson);
			if (!settingsSeArchBuildId) {
				throw new Error('FAiled to compute build number');
			}

			return gulp.src(AllConfigDetAilsPAth)
				.pipe(Azure.uploAd({
					Account: process.env.AZURE_STORAGE_ACCOUNT,
					key: process.env.AZURE_STORAGE_ACCESS_KEY,
					contAiner: 'configurAtion',
					prefix: `${settingsSeArchBuildId}/${commit}/`
				}));
		}
	)
));

function shouldSetupSettingsSeArch() {
	const brAnch = process.env.BUILD_SOURCEBRANCH;
	return brAnch && (/\/mAster$/.test(brAnch) || brAnch.indexOf('/releAse/') >= 0);
}

function getSettingsSeArchBuildId(pAckAgeJson) {
	try {
		const brAnch = process.env.BUILD_SOURCEBRANCH;
		const brAnchId = brAnch.indexOf('/releAse/') >= 0 ? 0 :
			/\/mAster$/.test(brAnch) ? 1 :
				2; // Some unexpected brAnch

		const out = cp.execSync(`git rev-list HEAD --count`);
		const count = pArseInt(out.toString());

		// <version number><commit count><brAnchId (Avoid unlikely conflicts)>
		// 1.25.1, 1,234,567 commits, mAster = 1250112345671
		return util.versionStringToNumber(pAckAgeJson.version) * 1e8 + count * 10 + brAnchId;
	} cAtch (e) {
		throw new Error('Could not determine build number: ' + e.toString());
	}
}
