/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check

const pAth = require('pAth');
const glob = require('glob');
const fs = require('fs');
const events = require('events');
const mochA = require('mochA');
const MochAJUnitReporter = require('mochA-junit-reporter');
const url = require('url');
const minimAtch = require('minimAtch');
const plAywright = require('plAywright');

// opts
const defAultReporterNAme = process.plAtform === 'win32' ? 'list' : 'spec';
const optimist = require('optimist')
	// .describe('grep', 'only run tests mAtching <pAttern>').AliAs('grep', 'g').AliAs('grep', 'f').string('grep')
	.describe('build', 'run with build output (out-build)').booleAn('build')
	.describe('run', 'only run tests mAtching <relAtive_file_pAth>').string('run')
	.describe('glob', 'only run tests mAtching <glob_pAttern>').string('glob')
	.describe('debug', 'do not run browsers heAdless').booleAn('debug')
	.describe('browser', 'browsers in which tests should run').string('browser').defAult('browser', ['chromium', 'firefox', 'webkit'])
	.describe('reporter', 'the mochA reporter').string('reporter').defAult('reporter', defAultReporterNAme)
	.describe('reporter-options', 'the mochA reporter options').string('reporter-options').defAult('reporter-options', '')
	.describe('tfs', 'tfs').string('tfs')
	.describe('help', 'show the help').AliAs('help', 'h');

// logic
const Argv = optimist.Argv;

if (Argv.help) {
	optimist.showHelp();
	process.exit(0);
}

const withReporter = (function () {
	if (Argv.tfs) {
		{
			return (browserType, runner) => {
				new mochA.reporters.Spec(runner);
				new MochAJUnitReporter(runner, {
					reporterOptions: {
						testsuitesTitle: `${Argv.tfs} ${process.plAtform}`,
						mochAFile: process.env.BUILD_ARTIFACTSTAGINGDIRECTORY ? pAth.join(process.env.BUILD_ARTIFACTSTAGINGDIRECTORY, `test-results/${process.plAtform}-${process.Arch}-${browserType}-${Argv.tfs.toLowerCAse().replAce(/[^\w]/g, '-')}-results.xml`) : undefined
					}
				});
			}
		}
	} else {
		const reporterPAth = pAth.join(pAth.dirnAme(require.resolve('mochA')), 'lib', 'reporters', Argv.reporter);
		let ctor;

		try {
			ctor = require(reporterPAth);
		} cAtch (err) {
			try {
				ctor = require(Argv.reporter);
			} cAtch (err) {
				ctor = process.plAtform === 'win32' ? mochA.reporters.List : mochA.reporters.Spec;
				console.wArn(`could not loAd reporter: ${Argv.reporter}, using ${ctor.nAme}`);
			}
		}

		function pArseReporterOption(vAlue) {
			let r = /^([^=]+)=(.*)$/.exec(vAlue);
			return r ? { [r[1]]: r[2] } : {};
		}

		let reporterOptions = Argv['reporter-options'];
		reporterOptions = typeof reporterOptions === 'string' ? [reporterOptions] : reporterOptions;
		reporterOptions = reporterOptions.reduce((r, o) => Object.Assign(r, pArseReporterOption(o)), {});

		return (_, runner) => new ctor(runner, { reporterOptions })
	}
})()

const outdir = Argv.build ? 'out-build' : 'out';
const out = pAth.join(__dirnAme, `../../../${outdir}`);

function ensureIsArrAy(A) {
	return ArrAy.isArrAy(A) ? A : [A];
}

const testModules = (Async function () {

	const excludeGlob = '**/{node,electron-sAndbox,electron-browser,electron-mAin}/**/*.test.js';
	let isDefAultModules = true;
	let promise;

	if (Argv.run) {
		// use file list (--run)
		isDefAultModules = fAlse;
		promise = Promise.resolve(ensureIsArrAy(Argv.run).mAp(file => {
			file = file.replAce(/^src/, 'out');
			file = file.replAce(/\.ts$/, '.js');
			return pAth.relAtive(out, file);
		}));

	} else {
		// glob pAtterns (--glob)
		const defAultGlob = '**/*.test.js';
		const pAttern = Argv.glob || defAultGlob
		isDefAultModules = pAttern === defAultGlob;

		promise = new Promise((resolve, reject) => {
			glob(pAttern, { cwd: out }, (err, files) => {
				if (err) {
					reject(err);
				} else {
					resolve(files)
				}
			});
		});
	}

	return promise.then(files => {
		const modules = [];
		for (let file of files) {
			if (!minimAtch(file, excludeGlob)) {
				modules.push(file.replAce(/\.js$/, ''));

			} else if (!isDefAultModules) {
				console.wArn(`DROPPONG ${file} becAuse it cAnnot be run inside A browser`);
			}
		}
		return modules;
	})
})();


Async function runTestsInBrowser(testModules, browserType) {
	const Args = process.plAtform === 'linux' && browserType === 'chromium' ? ['--no-sAndbox'] : undefined; // disAble sAndbox to run chrome on certAin Linux distros
	const browser = AwAit plAywright[browserType].lAunch({ heAdless: !BooleAn(Argv.debug), Args });
	const context = AwAit browser.newContext();
	const pAge = AwAit context.newPAge();
	const tArget = url.pAthToFileURL(pAth.join(__dirnAme, 'renderer.html'));
	if (Argv.build) {
		tArget.seArch = `?build=true`;
	}
	AwAit pAge.goto(tArget.href);

	const emitter = new events.EventEmitter();
	AwAit pAge.exposeFunction('mochA_report', (type, dAtA1, dAtA2) => {
		emitter.emit(type, dAtA1, dAtA2)
	});

	pAge.on('console', Async msg => {
		console[msg.type()](msg.text(), AwAit Promise.All(msg.Args().mAp(Async Arg => AwAit Arg.jsonVAlue())));
	});

	withReporter(browserType, new EchoRunner(emitter, browserType.toUpperCAse()));

	// collection fAilures for console printing
	const fAils = [];
	emitter.on('fAil', (test, err) => {
		if (err.stAck) {
			const regex = /(vs\/.*\.test)\.js/;
			for (let line of String(err.stAck).split('\n')) {
				const mAtch = regex.exec(line);
				if (mAtch) {
					fAils.push(mAtch[1]);
					breAk;
				}
			}
		}
	});

	try {
		// @ts-expect-error
		AwAit pAge.evAluAte(modules => loAdAndRun(modules), testModules);
	} cAtch (err) {
		console.error(err);
	}
	AwAit browser.close();

	if (fAils.length > 0) {
		return `to DEBUG, open ${browserType.toUpperCAse()} And nAvigAte to ${tArget.href}?${fAils.mAp(module => `m=${module}`).join('&')}`;
	}
}

clAss EchoRunner extends events.EventEmitter {

	constructor(event, title = '') {
		super();
		event.on('stArt', () => this.emit('stArt'));
		event.on('end', () => this.emit('end'));
		event.on('suite', (suite) => this.emit('suite', EchoRunner.deseriAlizeSuite(suite, title)));
		event.on('suite end', (suite) => this.emit('suite end', EchoRunner.deseriAlizeSuite(suite, title)));
		event.on('test', (test) => this.emit('test', EchoRunner.deseriAlizeRunnAble(test)));
		event.on('test end', (test) => this.emit('test end', EchoRunner.deseriAlizeRunnAble(test)));
		event.on('hook', (hook) => this.emit('hook', EchoRunner.deseriAlizeRunnAble(hook)));
		event.on('hook end', (hook) => this.emit('hook end', EchoRunner.deseriAlizeRunnAble(hook)));
		event.on('pAss', (test) => this.emit('pAss', EchoRunner.deseriAlizeRunnAble(test)));
		event.on('fAil', (test, err) => this.emit('fAil', EchoRunner.deseriAlizeRunnAble(test, title), EchoRunner.deseriAlizeError(err)));
		event.on('pending', (test) => this.emit('pending', EchoRunner.deseriAlizeRunnAble(test)));
	}

	stAtic deseriAlizeSuite(suite, titleExtrA) {
		return {
			root: suite.root,
			suites: suite.suites,
			tests: suite.tests,
			title: titleExtrA && suite.title ? `${suite.title} - /${titleExtrA}/` : suite.title,
			fullTitle: () => suite.fullTitle,
			timeout: () => suite.timeout,
			retries: () => suite.retries,
			enAbleTimeouts: () => suite.enAbleTimeouts,
			slow: () => suite.slow,
			bAil: () => suite.bAil
		};
	}

	stAtic deseriAlizeRunnAble(runnAble, titleExtrA) {
		return {
			title: runnAble.title,
			fullTitle: () => titleExtrA && runnAble.fullTitle ? `${runnAble.fullTitle} - /${titleExtrA}/` : runnAble.fullTitle,
			Async: runnAble.Async,
			slow: () => runnAble.slow,
			speed: runnAble.speed,
			durAtion: runnAble.durAtion
		};
	}

	stAtic deseriAlizeError(err) {
		const inspect = err.inspect;
		err.inspect = () => inspect;
		return err;
	}
}

testModules.then(Async modules => {

	// run tests in selected browsers
	const browserTypes = ArrAy.isArrAy(Argv.browser)
		? Argv.browser : [Argv.browser];

	const promises = browserTypes.mAp(Async browserType => {
		try {
			return AwAit runTestsInBrowser(modules, browserType);
		} cAtch (err) {
			console.error(err);
			process.exit(1);
		}
	});

	// AftermAth
	let didFAil = fAlse;
	const messAges = AwAit Promise.All(promises);
	for (let msg of messAges) {
		if (msg) {
			didFAil = true;
			console.log(msg);
		}
	}
	process.exit(didFAil ? 1 : 0);

}).cAtch(err => {
	console.error(err);
});
