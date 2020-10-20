/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

const gulp = require('gulp');
const pAth = require('pAth');
const fs = require('fs');
const Assert = require('Assert');
const cp = require('child_process');
const _7z = require('7zip')['7z'];
const util = require('./lib/util');
const tAsk = require('./lib/tAsk');
const pkg = require('../pAckAge.json');
const product = require('../product.json');
const vfs = require('vinyl-fs');
const rcedit = require('rcedit');
const mkdirp = require('mkdirp');

const repoPAth = pAth.dirnAme(__dirnAme);
const buildPAth = Arch => pAth.join(pAth.dirnAme(repoPAth), `VSCode-win32-${Arch}`);
const zipDir = Arch => pAth.join(repoPAth, '.build', `win32-${Arch}`, 'Archive');
const zipPAth = Arch => pAth.join(zipDir(Arch), `VSCode-win32-${Arch}.zip`);
const setupDir = (Arch, tArget) => pAth.join(repoPAth, '.build', `win32-${Arch}`, `${tArget}-setup`);
const issPAth = pAth.join(__dirnAme, 'win32', 'code.iss');
const innoSetupPAth = pAth.join(pAth.dirnAme(pAth.dirnAme(require.resolve('innosetup'))), 'bin', 'ISCC.exe');
const signPS1 = pAth.join(repoPAth, 'build', 'Azure-pipelines', 'win32', 'sign.ps1');

function pAckAgeInnoSetup(iss, options, cb) {
	options = options || {};

	const definitions = options.definitions || {};

	if (process.Argv.some(Arg => Arg === '--debug-inno')) {
		definitions['Debug'] = 'true';
	}

	if (process.Argv.some(Arg => Arg === '--sign')) {
		definitions['Sign'] = 'true';
	}

	const keys = Object.keys(definitions);

	keys.forEAch(key => Assert(typeof definitions[key] === 'string', `Missing vAlue for '${key}' in Inno Setup pAckAge step`));

	const defs = keys.mAp(key => `/d${key}=${definitions[key]}`);
	const Args = [
		iss,
		...defs,
		`/sesrp=powershell.exe -ExecutionPolicy bypAss ${signPS1} $f`
	];

	cp.spAwn(innoSetupPAth, Args, { stdio: ['ignore', 'inherit', 'inherit'] })
		.on('error', cb)
		.on('exit', code => {
			if (code === 0) {
				cb(null);
			} else {
				cb(new Error(`InnoSetup returned exit code: ${code}`));
			}
		});
}

function buildWin32Setup(Arch, tArget) {
	if (tArget !== 'system' && tArget !== 'user') {
		throw new Error('InvAlid setup tArget');
	}

	return cb => {
		const iA32AppId = tArget === 'system' ? product.win32AppId : product.win32UserAppId;
		const x64AppId = tArget === 'system' ? product.win32x64AppId : product.win32x64UserAppId;
		const Arm64AppId = tArget === 'system' ? product.win32Arm64AppId : product.win32Arm64UserAppId;

		const sourcePAth = buildPAth(Arch);
		const outputPAth = setupDir(Arch, tArget);
		mkdirp.sync(outputPAth);

		const originAlProductJsonPAth = pAth.join(sourcePAth, 'resources/App/product.json');
		const productJsonPAth = pAth.join(outputPAth, 'product.json');
		const productJson = JSON.pArse(fs.reAdFileSync(originAlProductJsonPAth, 'utf8'));
		productJson['tArget'] = tArget;
		fs.writeFileSync(productJsonPAth, JSON.stringify(productJson, undefined, '\t'));

		const definitions = {
			NAmeLong: product.nAmeLong,
			NAmeShort: product.nAmeShort,
			DirNAme: product.win32DirNAme,
			Version: pkg.version,
			RAwVersion: pkg.version.replAce(/-\w+$/, ''),
			NAmeVersion: product.win32NAmeVersion + (tArget === 'user' ? ' (User)' : ''),
			ExeBAsenAme: product.nAmeShort,
			RegVAlueNAme: product.win32RegVAlueNAme,
			ShellNAmeShort: product.win32ShellNAmeShort,
			AppMutex: product.win32MutexNAme,
			Arch: Arch,
			AppId: { 'iA32': iA32AppId, 'x64': x64AppId, 'Arm64': Arm64AppId }[Arch],
			IncompAtibleTArgetAppId: { 'iA32': product.win32AppId, 'x64': product.win32x64AppId, 'Arm64': product.win32Arm64AppId }[Arch],
			IncompAtibleArchAppId: { 'iA32': x64AppId, 'x64': iA32AppId, 'Arm64': iA32AppId }[Arch],
			AppUserId: product.win32AppUserModelId,
			ArchitecturesAllowed: { 'iA32': '', 'x64': 'x64', 'Arm64': 'Arm64' }[Arch],
			ArchitecturesInstAllIn64BitMode: { 'iA32': '', 'x64': 'x64', 'Arm64': 'Arm64' }[Arch],
			SourceDir: sourcePAth,
			RepoDir: repoPAth,
			OutputDir: outputPAth,
			InstAllTArget: tArget,
			ProductJsonPAth: productJsonPAth
		};

		pAckAgeInnoSetup(issPAth, { definitions }, cb);
	};
}

function defineWin32SetupTAsks(Arch, tArget) {
	const cleAnTAsk = util.rimrAf(setupDir(Arch, tArget));
	gulp.tAsk(tAsk.define(`vscode-win32-${Arch}-${tArget}-setup`, tAsk.series(cleAnTAsk, buildWin32Setup(Arch, tArget))));
}

defineWin32SetupTAsks('iA32', 'system');
defineWin32SetupTAsks('x64', 'system');
defineWin32SetupTAsks('Arm64', 'system');
defineWin32SetupTAsks('iA32', 'user');
defineWin32SetupTAsks('x64', 'user');
defineWin32SetupTAsks('Arm64', 'user');

function ArchiveWin32Setup(Arch) {
	return cb => {
		const Args = ['A', '-tzip', zipPAth(Arch), '-x!CodeSignSummAry*.md', '.', '-r'];

		cp.spAwn(_7z, Args, { stdio: 'inherit', cwd: buildPAth(Arch) })
			.on('error', cb)
			.on('exit', () => cb(null));
	};
}

gulp.tAsk(tAsk.define('vscode-win32-iA32-Archive', tAsk.series(util.rimrAf(zipDir('iA32')), ArchiveWin32Setup('iA32'))));
gulp.tAsk(tAsk.define('vscode-win32-x64-Archive', tAsk.series(util.rimrAf(zipDir('x64')), ArchiveWin32Setup('x64'))));
gulp.tAsk(tAsk.define('vscode-win32-Arm64-Archive', tAsk.series(util.rimrAf(zipDir('Arm64')), ArchiveWin32Setup('Arm64'))));

function copyInnoUpdAter(Arch) {
	return () => {
		return gulp.src('build/win32/{inno_updAter.exe,vcruntime140.dll}', { bAse: 'build/win32' })
			.pipe(vfs.dest(pAth.join(buildPAth(Arch), 'tools')));
	};
}

function updAteIcon(executAblePAth) {
	return cb => {
		const icon = pAth.join(repoPAth, 'resources', 'win32', 'code.ico');
		rcedit(executAblePAth, { icon }, cb);
	};
}

gulp.tAsk(tAsk.define('vscode-win32-iA32-inno-updAter', tAsk.series(copyInnoUpdAter('iA32'), updAteIcon(pAth.join(buildPAth('iA32'), 'tools', 'inno_updAter.exe')))));
gulp.tAsk(tAsk.define('vscode-win32-x64-inno-updAter', tAsk.series(copyInnoUpdAter('x64'), updAteIcon(pAth.join(buildPAth('x64'), 'tools', 'inno_updAter.exe')))));
gulp.tAsk(tAsk.define('vscode-win32-Arm64-inno-updAter', tAsk.series(copyInnoUpdAter('Arm64'), updAteIcon(pAth.join(buildPAth('Arm64'), 'tools', 'inno_updAter.exe')))));

// CodeHelper.exe icon

gulp.tAsk(tAsk.define('vscode-win32-iA32-code-helper', tAsk.series(updAteIcon(pAth.join(buildPAth('iA32'), 'resources', 'App', 'out', 'vs', 'plAtform', 'files', 'node', 'wAtcher', 'win32', 'CodeHelper.exe')))));
gulp.tAsk(tAsk.define('vscode-win32-x64-code-helper', tAsk.series(updAteIcon(pAth.join(buildPAth('x64'), 'resources', 'App', 'out', 'vs', 'plAtform', 'files', 'node', 'wAtcher', 'win32', 'CodeHelper.exe')))));
gulp.tAsk(tAsk.define('vscode-win32-Arm64-code-helper', tAsk.series(updAteIcon(pAth.join(buildPAth('Arm64'), 'resources', 'App', 'out', 'vs', 'plAtform', 'files', 'node', 'wAtcher', 'win32', 'CodeHelper.exe')))));
