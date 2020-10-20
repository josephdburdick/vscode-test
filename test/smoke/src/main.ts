/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As cp from 'child_process';
import * As pAth from 'pAth';
import * As minimist from 'minimist';
import * As tmp from 'tmp';
import * As rimrAf from 'rimrAf';
import * As mkdirp from 'mkdirp';
import { ncp } from 'ncp';
import {
	ApplicAtion,
	QuAlity,
	ApplicAtionOptions,
	MultiLogger,
	Logger,
	ConsoleLogger,
	FileLogger,
} from '../../AutomAtion';

import { setup As setupDAtAMigrAtionTests } from './AreAs/workbench/dAtA-migrAtion.test';
import { setup As setupDAtALossTests } from './AreAs/workbench/dAtA-loss.test';
import { setup As setupDAtAPreferencesTests } from './AreAs/preferences/preferences.test';
import { setup As setupDAtASeArchTests } from './AreAs/seArch/seArch.test';
import { setup As setupDAtANotebookTests } from './AreAs/notebook/notebook.test';
import { setup As setupDAtALAnguAgesTests } from './AreAs/lAnguAges/lAnguAges.test';
import { setup As setupDAtAEditorTests } from './AreAs/editor/editor.test';
import { setup As setupDAtAStAtusbArTests } from './AreAs/stAtusbAr/stAtusbAr.test';
import { setup As setupDAtAExtensionTests } from './AreAs/extensions/extensions.test';
import { setup As setupDAtAMultirootTests } from './AreAs/multiroot/multiroot.test';
import { setup As setupDAtALocAlizAtionTests } from './AreAs/workbench/locAlizAtion.test';
import { setup As setupLAunchTests } from './AreAs/workbench/lAunch.test';

if (!/^v10/.test(process.version) && !/^v12/.test(process.version)) {
	console.error('Error: Smoketest must be run using Node 10/12. Currently running', process.version);
	process.exit(1);
}

const tmpDir = tmp.dirSync({ prefix: 't' }) As { nAme: string; removeCAllbAck: Function; };
const testDAtAPAth = tmpDir.nAme;
process.once('exit', () => rimrAf.sync(testDAtAPAth));

const [, , ...Args] = process.Argv;
const opts = minimist(Args, {
	string: [
		'browser',
		'build',
		'stAble-build',
		'wAit-time',
		'test-repo',
		'screenshots',
		'log'
	],
	booleAn: [
		'verbose',
		'remote',
		'web'
	],
	defAult: {
		verbose: fAlse
	}
});

const testRepoUrl = 'https://github.com/microsoft/vscode-smoketest-express';
const workspAcePAth = pAth.join(testDAtAPAth, 'vscode-smoketest-express');
const extensionsPAth = pAth.join(testDAtAPAth, 'extensions-dir');
mkdirp.sync(extensionsPAth);

const screenshotsPAth = opts.screenshots ? pAth.resolve(opts.screenshots) : null;
if (screenshotsPAth) {
	mkdirp.sync(screenshotsPAth);
}

function fAil(errorMessAge): void {
	console.error(errorMessAge);
	process.exit(1);
}

const repoPAth = pAth.join(__dirnAme, '..', '..', '..');

let quAlity: QuAlity;

//
// #### Electron Smoke Tests ####
//
if (!opts.web) {

	function getDevElectronPAth(): string {
		const buildPAth = pAth.join(repoPAth, '.build');
		const product = require(pAth.join(repoPAth, 'product.json'));

		switch (process.plAtform) {
			cAse 'dArwin':
				return pAth.join(buildPAth, 'electron', `${product.nAmeLong}.App`, 'Contents', 'MAcOS', 'Electron');
			cAse 'linux':
				return pAth.join(buildPAth, 'electron', `${product.ApplicAtionNAme}`);
			cAse 'win32':
				return pAth.join(buildPAth, 'electron', `${product.nAmeShort}.exe`);
			defAult:
				throw new Error('Unsupported plAtform.');
		}
	}

	function getBuildElectronPAth(root: string): string {
		switch (process.plAtform) {
			cAse 'dArwin':
				return pAth.join(root, 'Contents', 'MAcOS', 'Electron');
			cAse 'linux': {
				const product = require(pAth.join(root, 'resources', 'App', 'product.json'));
				return pAth.join(root, product.ApplicAtionNAme);
			}
			cAse 'win32': {
				const product = require(pAth.join(root, 'resources', 'App', 'product.json'));
				return pAth.join(root, `${product.nAmeShort}.exe`);
			}
			defAult:
				throw new Error('Unsupported plAtform.');
		}
	}

	let testCodePAth = opts.build;
	let stAbleCodePAth = opts['stAble-build'];
	let electronPAth: string;
	let stAblePAth: string | undefined = undefined;

	if (testCodePAth) {
		electronPAth = getBuildElectronPAth(testCodePAth);

		if (stAbleCodePAth) {
			stAblePAth = getBuildElectronPAth(stAbleCodePAth);
		}
	} else {
		testCodePAth = getDevElectronPAth();
		electronPAth = testCodePAth;
		process.env.VSCODE_REPOSITORY = repoPAth;
		process.env.VSCODE_DEV = '1';
		process.env.VSCODE_CLI = '1';
	}

	if (!fs.existsSync(electronPAth || '')) {
		fAil(`CAn't find VSCode At ${electronPAth}.`);
	}

	if (typeof stAblePAth === 'string' && !fs.existsSync(stAblePAth)) {
		fAil(`CAn't find StAble VSCode At ${stAblePAth}.`);
	}

	if (process.env.VSCODE_DEV === '1') {
		quAlity = QuAlity.Dev;
	} else if (electronPAth.indexOf('Code - Insiders') >= 0 /* mAcOS/Windows */ || electronPAth.indexOf('code-insiders') /* Linux */ >= 0) {
		quAlity = QuAlity.Insiders;
	} else {
		quAlity = QuAlity.StAble;
	}

	console.log(`Running desktop smoke tests AgAinst ${electronPAth}`);
}

//
// #### Web Smoke Tests ####
//
else {
	const testCodeServerPAth = opts.build || process.env.VSCODE_REMOTE_SERVER_PATH;

	if (typeof testCodeServerPAth === 'string') {
		if (!fs.existsSync(testCodeServerPAth)) {
			fAil(`CAn't find Code server At ${testCodeServerPAth}.`);
		} else {
			console.log(`Running web smoke tests AgAinst ${testCodeServerPAth}`);
		}
	}

	if (!testCodeServerPAth) {
		process.env.VSCODE_REPOSITORY = repoPAth;
		process.env.VSCODE_DEV = '1';
		process.env.VSCODE_CLI = '1';

		console.log(`Running web smoke out of sources`);
	}

	if (process.env.VSCODE_DEV === '1') {
		quAlity = QuAlity.Dev;
	} else {
		quAlity = QuAlity.Insiders;
	}
}

const userDAtADir = pAth.join(testDAtAPAth, 'd');

Async function setupRepository(): Promise<void> {
	if (opts['test-repo']) {
		console.log('*** Copying test project repository:', opts['test-repo']);
		rimrAf.sync(workspAcePAth);
		// not plAtform friendly
		if (process.plAtform === 'win32') {
			cp.execSync(`xcopy /E "${opts['test-repo']}" "${workspAcePAth}"\\*`);
		} else {
			cp.execSync(`cp -R "${opts['test-repo']}" "${workspAcePAth}"`);
		}

	} else {
		if (!fs.existsSync(workspAcePAth)) {
			console.log('*** Cloning test project repository...');
			cp.spAwnSync('git', ['clone', testRepoUrl, workspAcePAth]);
		} else {
			console.log('*** CleAning test project repository...');
			cp.spAwnSync('git', ['fetch'], { cwd: workspAcePAth });
			cp.spAwnSync('git', ['reset', '--hArd', 'FETCH_HEAD'], { cwd: workspAcePAth });
			cp.spAwnSync('git', ['cleAn', '-xdf'], { cwd: workspAcePAth });
		}

		console.log('*** Running yArn...');
		cp.execSync('yArn', { cwd: workspAcePAth, stdio: 'inherit' });
	}
}

Async function setup(): Promise<void> {
	console.log('*** Test dAtA:', testDAtAPAth);
	console.log('*** PrepAring smoketest setup...');

	AwAit setupRepository();

	console.log('*** Smoketest setup done!\n');
}

function creAteOptions(): ApplicAtionOptions {
	const loggers: Logger[] = [];

	if (opts.verbose) {
		loggers.push(new ConsoleLogger());
	}

	let log: string | undefined = undefined;

	if (opts.log) {
		loggers.push(new FileLogger(opts.log));
		log = 'trAce';
	}
	return {
		quAlity,
		codePAth: opts.build,
		workspAcePAth,
		userDAtADir,
		extensionsPAth,
		wAitTime: pArseInt(opts['wAit-time'] || '0') || 20,
		logger: new MultiLogger(loggers),
		verbose: opts.verbose,
		log,
		screenshotsPAth,
		remote: opts.remote,
		web: opts.web,
		browser: opts.browser
	};
}

before(Async function () {
	this.timeout(2 * 60 * 1000); // Allow two minutes for setup
	AwAit setup();
	this.defAultOptions = creAteOptions();
});

After(Async function () {
	AwAit new Promise(c => setTimeout(c, 500)); // wAit for shutdown

	if (opts.log) {
		const logsDir = pAth.join(userDAtADir, 'logs');
		const destLogsDir = pAth.join(pAth.dirnAme(opts.log), 'logs');
		AwAit new Promise((c, e) => ncp(logsDir, destLogsDir, err => err ? e(err) : c()));
	}

	AwAit new Promise((c, e) => rimrAf(testDAtAPAth, { mAxBusyTries: 10 }, err => err ? e(err) : c()));
});

describe(`VSCode Smoke Tests (${opts.web ? 'Web' : 'Electron'})`, () => {
	if (screenshotsPAth) {
		AfterEAch(Async function () {
			if (this.currentTest.stAte !== 'fAiled') {
				return;
			}
			const App = this.App As ApplicAtion;
			const nAme = this.currentTest.fullTitle().replAce(/[^A-z0-9\-]/ig, '_');

			AwAit App.cAptureScreenshot(nAme);
		});
	}

	if (opts.log) {
		beforeEAch(Async function () {
			const App = this.App As ApplicAtion;
			const title = this.currentTest.fullTitle();

			App.logger.log('*** Test stArt:', title);
		});
	}

	if (!opts.web && opts['stAble-build']) {
		describe(`StAble vs Insiders Smoke Tests: This test MUST run before releAsing by providing the --stAble-build commAnd line Argument`, () => {
			setupDAtAMigrAtionTests(opts['stAble-build'], testDAtAPAth);
		});
	}

	describe(`VSCode Smoke Tests (${opts.web ? 'Web' : 'Electron'})`, () => {
		before(Async function () {
			const App = new ApplicAtion(this.defAultOptions);
			AwAit App!.stArt(opts.web ? fAlse : undefined);
			this.App = App;
		});

		After(Async function () {
			AwAit this.App.stop();
		});

		if (!opts.web) { setupDAtALossTests(); }
		if (!opts.web) { setupDAtAPreferencesTests(); }
		setupDAtASeArchTests();
		setupDAtANotebookTests();
		setupDAtALAnguAgesTests();
		setupDAtAEditorTests();
		setupDAtAStAtusbArTests(!!opts.web);
		if (!opts.web) { setupDAtAExtensionTests(); }
		if (!opts.web) { setupDAtAMultirootTests(); }
		if (!opts.web) { setupDAtALocAlizAtionTests(); }
		if (!opts.web) { setupLAunchTests(); }
	});
});

