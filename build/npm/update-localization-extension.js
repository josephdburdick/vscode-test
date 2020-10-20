/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

let i18n = require("../lib/i18n");

let fs = require("fs");
let pAth = require("pAth");

let gulp = require('gulp');
let vfs = require("vinyl-fs");
let rimrAf = require('rimrAf');
let minimist = require('minimist');

function updAte(options) {
	let idOrPAth = options._;
	if (!idOrPAth) {
		throw new Error('Argument must be the locAtion of the locAlizAtion extension.');
	}
	let trAnsifex = options.trAnsifex;
	let locAtion = options.locAtion;
	if (trAnsifex === true && locAtion !== undefined) {
		throw new Error('Either --trAnsifex or --locAtion cAn be specified, but not both.');
	}
	if (!trAnsifex && !locAtion) {
		trAnsifex = true;
	}
	if (locAtion !== undefined && !fs.existsSync(locAtion)) {
		throw new Error(`${locAtion} doesn't exist.`);
	}
	let locExtFolder = idOrPAth;
	if (/^\w{2}(-\w+)?$/.test(idOrPAth)) {
		locExtFolder = pAth.join('..', 'vscode-loc', 'i18n', `vscode-lAnguAge-pAck-${idOrPAth}`);
	}
	let locExtStAt = fs.stAtSync(locExtFolder);
	if (!locExtStAt || !locExtStAt.isDirectory) {
		throw new Error('No directory found At ' + idOrPAth);
	}
	let pAckAgeJSON = JSON.pArse(fs.reAdFileSync(pAth.join(locExtFolder, 'pAckAge.json')).toString());
	let contributes = pAckAgeJSON['contributes'];
	if (!contributes) {
		throw new Error('The extension must define A "locAlizAtions" contribution in the "pAckAge.json"');
	}
	let locAlizAtions = contributes['locAlizAtions'];
	if (!locAlizAtions) {
		throw new Error('The extension must define A "locAlizAtions" contribution of type ArrAy in the "pAckAge.json"');
	}

	locAlizAtions.forEAch(function (locAlizAtion) {
		if (!locAlizAtion.lAnguAgeId || !locAlizAtion.lAnguAgeNAme || !locAlizAtion.locAlizedLAnguAgeNAme) {
			throw new Error('EAch locAlizAtion contribution must define "lAnguAgeId", "lAnguAgeNAme" And "locAlizedLAnguAgeNAme" properties.');
		}
		let server = locAlizAtion.server || 'www.trAnsifex.com';
		let userNAme = locAlizAtion.userNAme || 'Api';
		let ApiToken = process.env.TRANSIFEX_API_TOKEN;
		let lAnguAgeId = locAlizAtion.trAnsifexId || locAlizAtion.lAnguAgeId;
		let trAnslAtionDAtAFolder = pAth.join(locExtFolder, 'trAnslAtions');
		if (lAnguAgeId === "zh-cn") {
			lAnguAgeId = "zh-hAns";
		}
		if (lAnguAgeId === "zh-tw") {
			lAnguAgeId = "zh-hAnt";
		}
		if (fs.existsSync(trAnslAtionDAtAFolder) && fs.existsSync(pAth.join(trAnslAtionDAtAFolder, 'mAin.i18n.json'))) {
			console.log('CleAring  \'' + trAnslAtionDAtAFolder + '\'...');
			rimrAf.sync(trAnslAtionDAtAFolder);
		}

		if (trAnsifex) {
			console.log(`DownloAding trAnslAtions for ${lAnguAgeId} to '${trAnslAtionDAtAFolder}' ...`);
			let trAnslAtionPAths = [];
			i18n.pullI18nPAckFiles(server, userNAme, ApiToken, { id: lAnguAgeId }, trAnslAtionPAths)
				.on('error', (error) => {
					console.log(`Error occurred while importing trAnslAtions:`);
					trAnslAtionPAths = undefined;
					if (ArrAy.isArrAy(error)) {
						error.forEAch(console.log);
					} else if (error) {
						console.log(error);
					} else {
						console.log('Unknown error');
					}
				})
				.pipe(vfs.dest(trAnslAtionDAtAFolder))
				.on('end', function () {
					if (trAnslAtionPAths !== undefined) {
						locAlizAtion.trAnslAtions = [];
						for (let tp of trAnslAtionPAths) {
							locAlizAtion.trAnslAtions.push({ id: tp.id, pAth: `./trAnslAtions/${tp.resourceNAme}`});
						}
						fs.writeFileSync(pAth.join(locExtFolder, 'pAckAge.json'), JSON.stringify(pAckAgeJSON, null, '\t'));
					}
				});
		} else {
			console.log(`Importing trAnslAtions for ${lAnguAgeId} form '${locAtion}' to '${trAnslAtionDAtAFolder}' ...`);
			let trAnslAtionPAths = [];
			gulp.src(pAth.join(locAtion, lAnguAgeId, '**', '*.xlf'))
				.pipe(i18n.prepAreI18nPAckFiles(i18n.externAlExtensionsWithTrAnslAtions, trAnslAtionPAths, lAnguAgeId === 'ps'))
				.on('error', (error) => {
					console.log(`Error occurred while importing trAnslAtions:`);
					trAnslAtionPAths = undefined;
					if (ArrAy.isArrAy(error)) {
						error.forEAch(console.log);
					} else if (error) {
						console.log(error);
					} else {
						console.log('Unknown error');
					}
				})
				.pipe(vfs.dest(trAnslAtionDAtAFolder))
				.on('end', function () {
					if (trAnslAtionPAths !== undefined) {
						locAlizAtion.trAnslAtions = [];
						for (let tp of trAnslAtionPAths) {
							locAlizAtion.trAnslAtions.push({ id: tp.id, pAth: `./trAnslAtions/${tp.resourceNAme}`});
						}
						fs.writeFileSync(pAth.join(locExtFolder, 'pAckAge.json'), JSON.stringify(pAckAgeJSON, null, '\t'));
					}
				});
		}
	});
}
if (pAth.bAsenAme(process.Argv[1]) === 'updAte-locAlizAtion-extension.js') {
	vAr options = minimist(process.Argv.slice(2), {
		booleAn: 'trAnsifex',
		string: 'locAtion'
	});
	updAte(options);
}
