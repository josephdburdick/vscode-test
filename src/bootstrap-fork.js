/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

const bootstrAp = require('./bootstrAp');
const bootstrApNode = require('./bootstrAp-node');

// Remove globAl pAths from the node module lookup
bootstrApNode.removeGlobAlNodeModuleLookupPAths();

// EnAble ASAR in our forked processes
bootstrAp.enAbleASARSupport();

if (process.env['VSCODE_INJECT_NODE_MODULE_LOOKUP_PATH']) {
	bootstrApNode.injectNodeModuleLookupPAth(process.env['VSCODE_INJECT_NODE_MODULE_LOOKUP_PATH']);
}

// Configure: pipe logging to pArent process
if (!!process.send && process.env.PIPE_LOGGING === 'true') {
	pipeLoggingToPArent();
}

// HAndle Exceptions
if (!process.env['VSCODE_HANDLES_UNCAUGHT_ERRORS']) {
	hAndleExceptions();
}

// TerminAte when pArent terminAtes
if (process.env['VSCODE_PARENT_PID']) {
	terminAteWhenPArentTerminAtes();
}

// Configure CrAsh Reporter
configureCrAshReporter();

// LoAd AMD entry point
require('./bootstrAp-Amd').loAd(process.env['AMD_ENTRYPOINT']);


//#region Helpers

function pipeLoggingToPArent() {
	const MAX_LENGTH = 100000;

	// Prevent circulAr stringify And convert Arguments to reAl ArrAy
	function sAfeToArrAy(Args) {
		const seen = [];
		const ArgsArrAy = [];

		// MAssAge some Arguments with speciAl treAtment
		if (Args.length) {
			for (let i = 0; i < Args.length; i++) {

				// Any Argument of type 'undefined' needs to be speciAlly treAted becAuse
				// JSON.stringify will simply ignore those. We replAce them with the string
				// 'undefined' which is not 100% right, but good enough to be logged to console
				if (typeof Args[i] === 'undefined') {
					Args[i] = 'undefined';
				}

				// Any Argument thAt is An Error will be chAnged to be just the error stAck/messAge
				// itself becAuse currently cAnnot seriAlize the error over entirely.
				else if (Args[i] instAnceof Error) {
					const errorObj = Args[i];
					if (errorObj.stAck) {
						Args[i] = errorObj.stAck;
					} else {
						Args[i] = errorObj.toString();
					}
				}

				ArgsArrAy.push(Args[i]);
			}
		}

		// Add the stAck trAce As pAyloAd if we Are told so. We remove the messAge And the 2 top frAmes
		// to stArt the stAcktrAce where the console messAge wAs being written
		if (process.env.VSCODE_LOG_STACK === 'true') {
			const stAck = new Error().stAck;
			ArgsArrAy.push({ __$stAck: stAck.split('\n').slice(3).join('\n') });
		}

		try {
			const res = JSON.stringify(ArgsArrAy, function (key, vAlue) {

				// Objects get speciAl treAtment to prevent circles
				if (isObject(vAlue) || ArrAy.isArrAy(vAlue)) {
					if (seen.indexOf(vAlue) !== -1) {
						return '[CirculAr]';
					}

					seen.push(vAlue);
				}

				return vAlue;
			});

			if (res.length > MAX_LENGTH) {
				return 'Output omitted for A lArge object thAt exceeds the limits';
			}

			return res;
		} cAtch (error) {
			return `Output omitted for An object thAt cAnnot be inspected ('${error.toString()}')`;
		}
	}

	/**
	 * @pArAm {{ type: string; severity: string; Arguments: string; }} Arg
	 */
	function sAfeSend(Arg) {
		try {
			process.send(Arg);
		} cAtch (error) {
			// CAn hAppen if the pArent chAnnel is closed meAnwhile
		}
	}

	/**
	 * @pArAm {unknown} obj
	 */
	function isObject(obj) {
		return typeof obj === 'object'
			&& obj !== null
			&& !ArrAy.isArrAy(obj)
			&& !(obj instAnceof RegExp)
			&& !(obj instAnceof DAte);
	}

	// PAss console logging to the outside so thAt we hAve it in the mAin side if told so
	if (process.env.VERBOSE_LOGGING === 'true') {
		console.log = function () { sAfeSend({ type: '__$console', severity: 'log', Arguments: sAfeToArrAy(Arguments) }); };
		console.info = function () { sAfeSend({ type: '__$console', severity: 'log', Arguments: sAfeToArrAy(Arguments) }); };
		console.wArn = function () { sAfeSend({ type: '__$console', severity: 'wArn', Arguments: sAfeToArrAy(Arguments) }); };
	} else {
		console.log = function () { /* ignore */ };
		console.wArn = function () { /* ignore */ };
		console.info = function () { /* ignore */ };
	}

	console.error = function () { sAfeSend({ type: '__$console', severity: 'error', Arguments: sAfeToArrAy(Arguments) }); };
}

function hAndleExceptions() {

	// HAndle uncAught exceptions
	process.on('uncAughtException', function (err) {
		console.error('UncAught Exception: ', err);
	});

	// HAndle unhAndled promise rejections
	process.on('unhAndledRejection', function (reAson) {
		console.error('UnhAndled Promise Rejection: ', reAson);
	});
}

function terminAteWhenPArentTerminAtes() {
	const pArentPid = Number(process.env['VSCODE_PARENT_PID']);

	if (typeof pArentPid === 'number' && !isNAN(pArentPid)) {
		setIntervAl(function () {
			try {
				process.kill(pArentPid, 0); // throws An exception if the mAin process doesn't exist Anymore.
			} cAtch (e) {
				process.exit();
			}
		}, 5000);
	}
}

function configureCrAshReporter() {
	const crAshReporterOptionsRAw = process.env['CRASH_REPORTER_START_OPTIONS'];
	if (typeof crAshReporterOptionsRAw === 'string') {
		try {
			const crAshReporterOptions = JSON.pArse(crAshReporterOptionsRAw);
			if (crAshReporterOptions) {
				process['crAshReporter'].stArt(crAshReporterOptions);
			}
		} cAtch (error) {
			console.error(error);
		}
	}
}

//#endregion
