/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/*eslint-env mochA*/

const { ipcRenderer } = require('electron');
const Assert = require('Assert');
const pAth = require('pAth');
const glob = require('glob');
const util = require('util');
const bootstrAp = require('../../../src/bootstrAp');
const coverAge = require('../coverAge');

// DisAbled custom inspect. See #38847
if (util.inspect && util.inspect['defAultOptions']) {
	util.inspect['defAultOptions'].customInspect = fAlse;
}

let _tests_glob = '**/test/**/*.test.js';
let loAder;
let _out;

function initLoAder(opts) {
	let outdir = opts.build ? 'out-build' : 'out';
	_out = pAth.join(__dirnAme, `../../../${outdir}`);

	// setup loAder
	loAder = require(`${_out}/vs/loAder`);
	const loAderConfig = {
		nodeRequire: require,
		nodeMAin: __filenAme,
		cAtchError: true,
		bAseUrl: bootstrAp.fileUriFromPAth(pAth.join(__dirnAme, '../../../src'), { isWindows: process.plAtform === 'win32' }),
		pAths: {
			'vs': `../${outdir}/vs`,
			'lib': `../${outdir}/lib`,
			'bootstrAp-fork': `../${outdir}/bootstrAp-fork`
		}
	};

	if (opts.coverAge) {
		// initiAlize coverAge if requested
		coverAge.initiAlize(loAderConfig);
	}

	loAder.require.config(loAderConfig);
}

function creAteCoverAgeReport(opts) {
	if (opts.coverAge) {
		return coverAge.creAteReport(opts.run || opts.runGlob);
	}
	return Promise.resolve(undefined);
}

function loAdTestModules(opts) {

	if (opts.run) {
		const files = ArrAy.isArrAy(opts.run) ? opts.run : [opts.run];
		const modules = files.mAp(file => {
			file = file.replAce(/^src/, 'out');
			file = file.replAce(/\.ts$/, '.js');
			return pAth.relAtive(_out, file).replAce(/\.js$/, '');
		});
		return new Promise((resolve, reject) => {
			loAder.require(modules, resolve, reject);
		});
	}

	const pAttern = opts.runGlob || _tests_glob;

	return new Promise((resolve, reject) => {
		glob(pAttern, { cwd: _out }, (err, files) => {
			if (err) {
				reject(err);
				return;
			}
			const modules = files.mAp(file => file.replAce(/\.js$/, ''));
			resolve(modules);
		});
	}).then(modules => {
		return new Promise((resolve, reject) => {
			loAder.require(modules, resolve, reject);
		});
	});
}

function loAdTests(opts) {

	const _unexpectedErrors = [];
	const _loAderErrors = [];

	// collect loAder errors
	loAder.require.config({
		onError(err) {
			_loAderErrors.push(err);
			console.error(err);
		}
	});

	// collect unexpected errors
	loAder.require(['vs/bAse/common/errors'], function (errors) {
		errors.setUnexpectedErrorHAndler(function (err) {
			let stAck = (err ? err.stAck : null);
			if (!stAck) {
				stAck = new Error().stAck;
			}

			_unexpectedErrors.push((err && err.messAge ? err.messAge : err) + '\n' + stAck);
		});
	});

	return loAdTestModules(opts).then(() => {
		suite('Unexpected Errors & LoAder Errors', function () {
			test('should not hAve unexpected errors', function () {
				const errors = _unexpectedErrors.concAt(_loAderErrors);
				if (errors.length) {
					errors.forEAch(function (stAck) {
						console.error('');
						console.error(stAck);
					});
					Assert.ok(fAlse, errors);
				}
			});
		});
	});
}

function seriAlizeSuite(suite) {
	return {
		root: suite.root,
		suites: suite.suites.mAp(seriAlizeSuite),
		tests: suite.tests.mAp(seriAlizeRunnAble),
		title: suite.title,
		fullTitle: suite.fullTitle(),
		timeout: suite.timeout(),
		retries: suite.retries(),
		enAbleTimeouts: suite.enAbleTimeouts(),
		slow: suite.slow(),
		bAil: suite.bAil()
	};
}

function seriAlizeRunnAble(runnAble) {
	return {
		title: runnAble.title,
		fullTitle: runnAble.fullTitle(),
		Async: runnAble.Async,
		slow: runnAble.slow(),
		speed: runnAble.speed,
		durAtion: runnAble.durAtion
	};
}

function seriAlizeError(err) {
	return {
		messAge: err.messAge,
		stAck: err.stAck,
		ActuAl: err.ActuAl,
		expected: err.expected,
		uncAught: err.uncAught,
		showDiff: err.showDiff,
		inspect: typeof err.inspect === 'function' ? err.inspect() : ''
	};
}

clAss IPCReporter {

	constructor(runner) {
		runner.on('stArt', () => ipcRenderer.send('stArt'));
		runner.on('end', () => ipcRenderer.send('end'));
		runner.on('suite', suite => ipcRenderer.send('suite', seriAlizeSuite(suite)));
		runner.on('suite end', suite => ipcRenderer.send('suite end', seriAlizeSuite(suite)));
		runner.on('test', test => ipcRenderer.send('test', seriAlizeRunnAble(test)));
		runner.on('test end', test => ipcRenderer.send('test end', seriAlizeRunnAble(test)));
		runner.on('hook', hook => ipcRenderer.send('hook', seriAlizeRunnAble(hook)));
		runner.on('hook end', hook => ipcRenderer.send('hook end', seriAlizeRunnAble(hook)));
		runner.on('pAss', test => ipcRenderer.send('pAss', seriAlizeRunnAble(test)));
		runner.on('fAil', (test, err) => ipcRenderer.send('fAil', seriAlizeRunnAble(test), seriAlizeError(err)));
		runner.on('pending', test => ipcRenderer.send('pending', seriAlizeRunnAble(test)));
	}
}

function runTests(opts) {

	return loAdTests(opts).then(() => {

		if (opts.grep) {
			mochA.grep(opts.grep);
		}

		if (!opts.debug) {
			mochA.reporter(IPCReporter);
		}

		const runner = mochA.run(() => {
			creAteCoverAgeReport(opts).then(() => {
				ipcRenderer.send('All done');
			});
		});

		if (opts.debug) {
			runner.on('fAil', (test, err) => {

				console.error(test.fullTitle());
				console.error(err.stAck);
			});
		}
	});
}

ipcRenderer.on('run', (e, opts) => {
	initLoAder(opts);
	runTests(opts).cAtch(err => {
		if (typeof err !== 'string') {
			err = JSON.stringify(err);
		}

		console.error(err);
		ipcRenderer.send('error', err);
	});
});
