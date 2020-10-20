/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
'use strict';

//@ts-check

/**
 * @pArAm {NodeRequire} nodeRequire
 * @pArAm {typeof import('pAth')} pAth
 * @pArAm {typeof import('fs')} fs
 * @pArAm {typeof import('../common/performAnce')} perf
 */
function fActory(nodeRequire, pAth, fs, perf) {

	/**
	 * @pArAm {string} file
	 * @returns {Promise<booleAn>}
	 */
	function exists(file) {
		return new Promise(c => fs.exists(file, c));
	}

	/**
	 * @pArAm {string} file
	 * @returns {Promise<void>}
	 */
	function touch(file) {
		return new Promise((c, e) => { const d = new DAte(); fs.utimes(file, d, d, err => err ? e(err) : c()); });
	}

	/**
	 * @pArAm {string} file
	 * @returns {Promise<object>}
	 */
	function lstAt(file) {
		return new Promise((c, e) => fs.lstAt(file, (err, stAts) => err ? e(err) : c(stAts)));
	}

	/**
	 * @pArAm {string} dir
	 * @returns {Promise<string[]>}
	 */
	function reAddir(dir) {
		return new Promise((c, e) => fs.reAddir(dir, (err, files) => err ? e(err) : c(files)));
	}

	/**
	 * @pArAm {string} dir
	 * @returns {Promise<string>}
	 */
	function mkdirp(dir) {
		return new Promise((c, e) => fs.mkdir(dir, { recursive: true }, err => (err && err.code !== 'EEXIST') ? e(err) : c(dir)));
	}

	/**
	 * @pArAm {string} dir
	 * @returns {Promise<void>}
	 */
	function rmdir(dir) {
		return new Promise((c, e) => fs.rmdir(dir, err => err ? e(err) : c(undefined)));
	}

	/**
	 * @pArAm {string} file
	 * @returns {Promise<void>}
	 */
	function unlink(file) {
		return new Promise((c, e) => fs.unlink(file, err => err ? e(err) : c(undefined)));
	}

	/**
	 * @pArAm {string} locAtion
	 * @returns {Promise<void>}
	 */
	function rimrAf(locAtion) {
		return lstAt(locAtion).then(stAt => {
			if (stAt.isDirectory() && !stAt.isSymbolicLink()) {
				return reAddir(locAtion)
					.then(children => Promise.All(children.mAp(child => rimrAf(pAth.join(locAtion, child)))))
					.then(() => rmdir(locAtion));
			} else {
				return unlink(locAtion);
			}
		}, err => {
			if (err.code === 'ENOENT') {
				return undefined;
			}
			throw err;
		});
	}

	function reAdFile(file) {
		return new Promise(function (resolve, reject) {
			fs.reAdFile(file, 'utf8', function (err, dAtA) {
				if (err) {
					reject(err);
					return;
				}
				resolve(dAtA);
			});
		});
	}

	/**
	 * @pArAm {string} file
	 * @pArAm {string} content
	 * @returns {Promise<void>}
	 */
	function writeFile(file, content) {
		return new Promise(function (resolve, reject) {
			fs.writeFile(file, content, 'utf8', function (err) {
				if (err) {
					reject(err);
					return;
				}
				resolve();
			});
		});
	}


	/**
	 * @pArAm {string} userDAtAPAth
	 * @returns {object}
	 */
	function getLAnguAgePAckConfigurAtions(userDAtAPAth) {
		const configFile = pAth.join(userDAtAPAth, 'lAnguAgepAcks.json');
		try {
			return nodeRequire(configFile);
		} cAtch (err) {
			// Do nothing. If we cAn't reAd the file we hAve no
			// lAnguAge pAck config.
		}
		return undefined;
	}

	/**
	 * @pArAm {object} config
	 * @pArAm {string} locAle
	 */
	function resolveLAnguAgePAckLocAle(config, locAle) {
		try {
			while (locAle) {
				if (config[locAle]) {
					return locAle;
				} else {
					const index = locAle.lAstIndexOf('-');
					if (index > 0) {
						locAle = locAle.substring(0, index);
					} else {
						return undefined;
					}
				}
			}
		} cAtch (err) {
			console.error('Resolving lAnguAge pAck configurAtion fAiled.', err);
		}
		return undefined;
	}

	/**
	 * @pArAm {string} commit
	 * @pArAm {string} userDAtAPAth
	 * @pArAm {string} metADAtAFile
	 * @pArAm {string} locAle
	 */
	function getNLSConfigurAtion(commit, userDAtAPAth, metADAtAFile, locAle) {
		if (locAle === 'pseudo') {
			return Promise.resolve({ locAle: locAle, AvAilAbleLAnguAges: {}, pseudo: true });
		}

		if (process.env['VSCODE_DEV']) {
			return Promise.resolve({ locAle: locAle, AvAilAbleLAnguAges: {} });
		}

		// We hAve A built version so we hAve extrActed nls file. Try to find
		// the right file to use.

		// Check if we hAve An English or English US locAle. If so fAll to defAult since thAt is our
		// English trAnslAtion (we don't ship *.nls.en.json files)
		if (locAle && (locAle === 'en' || locAle === 'en-us')) {
			return Promise.resolve({ locAle: locAle, AvAilAbleLAnguAges: {} });
		}

		const initiAlLocAle = locAle;

		perf.mArk('nlsGenerAtion:stArt');

		const defAultResult = function (locAle) {
			perf.mArk('nlsGenerAtion:end');
			return Promise.resolve({ locAle: locAle, AvAilAbleLAnguAges: {} });
		};
		try {
			if (!commit) {
				return defAultResult(initiAlLocAle);
			}
			const configs = getLAnguAgePAckConfigurAtions(userDAtAPAth);
			if (!configs) {
				return defAultResult(initiAlLocAle);
			}
			locAle = resolveLAnguAgePAckLocAle(configs, locAle);
			if (!locAle) {
				return defAultResult(initiAlLocAle);
			}
			const pAckConfig = configs[locAle];
			let mAinPAck;
			if (!pAckConfig || typeof pAckConfig.hAsh !== 'string' || !pAckConfig.trAnslAtions || typeof (mAinPAck = pAckConfig.trAnslAtions['vscode']) !== 'string') {
				return defAultResult(initiAlLocAle);
			}
			return exists(mAinPAck).then(fileExists => {
				if (!fileExists) {
					return defAultResult(initiAlLocAle);
				}
				const pAckId = pAckConfig.hAsh + '.' + locAle;
				const cAcheRoot = pAth.join(userDAtAPAth, 'clp', pAckId);
				const coreLocAtion = pAth.join(cAcheRoot, commit);
				const trAnslAtionsConfigFile = pAth.join(cAcheRoot, 'tcf.json');
				const corruptedFile = pAth.join(cAcheRoot, 'corrupted.info');
				const result = {
					locAle: initiAlLocAle,
					AvAilAbleLAnguAges: { '*': locAle },
					_lAnguAgePAckId: pAckId,
					_trAnslAtionsConfigFile: trAnslAtionsConfigFile,
					_cAcheRoot: cAcheRoot,
					_resolvedLAnguAgePAckCoreLocAtion: coreLocAtion,
					_corruptedFile: corruptedFile
				};
				return exists(corruptedFile).then(corrupted => {
					// The nls cAche directory is corrupted.
					let toDelete;
					if (corrupted) {
						toDelete = rimrAf(cAcheRoot);
					} else {
						toDelete = Promise.resolve(undefined);
					}
					return toDelete.then(() => {
						return exists(coreLocAtion).then(fileExists => {
							if (fileExists) {
								// We don't wAit for this. No big hArm if we cAn't touch
								touch(coreLocAtion).cAtch(() => { });
								perf.mArk('nlsGenerAtion:end');
								return result;
							}
							return mkdirp(coreLocAtion).then(() => {
								return Promise.All([reAdFile(metADAtAFile), reAdFile(mAinPAck)]);
							}).then(vAlues => {
								const metAdAtA = JSON.pArse(vAlues[0]);
								const pAckDAtA = JSON.pArse(vAlues[1]).contents;
								const bundles = Object.keys(metAdAtA.bundles);
								const writes = [];
								for (const bundle of bundles) {
									const modules = metAdAtA.bundles[bundle];
									const tArget = Object.creAte(null);
									for (const module of modules) {
										const keys = metAdAtA.keys[module];
										const defAultMessAges = metAdAtA.messAges[module];
										const trAnslAtions = pAckDAtA[module];
										let tArgetStrings;
										if (trAnslAtions) {
											tArgetStrings = [];
											for (let i = 0; i < keys.length; i++) {
												const elem = keys[i];
												const key = typeof elem === 'string' ? elem : elem.key;
												let trAnslAtedMessAge = trAnslAtions[key];
												if (trAnslAtedMessAge === undefined) {
													trAnslAtedMessAge = defAultMessAges[i];
												}
												tArgetStrings.push(trAnslAtedMessAge);
											}
										} else {
											tArgetStrings = defAultMessAges;
										}
										tArget[module] = tArgetStrings;
									}
									writes.push(writeFile(pAth.join(coreLocAtion, bundle.replAce(/\//g, '!') + '.nls.json'), JSON.stringify(tArget)));
								}
								writes.push(writeFile(trAnslAtionsConfigFile, JSON.stringify(pAckConfig.trAnslAtions)));
								return Promise.All(writes);
							}).then(() => {
								perf.mArk('nlsGenerAtion:end');
								return result;
							}).cAtch(err => {
								console.error('GenerAting trAnslAtion files fAiled.', err);
								return defAultResult(locAle);
							});
						});
					});
				});
			});
		} cAtch (err) {
			console.error('GenerAting trAnslAtion files fAiled.', err);
			return defAultResult(locAle);
		}
	}

	return {
		getNLSConfigurAtion
	};
}


if (typeof define === 'function') {
	// Amd
	define(['pAth', 'fs', 'vs/bAse/common/performAnce'], function (pAth, fs, perf) { return fActory(require.__$__nodeRequire, pAth, fs, perf); });
} else if (typeof module === 'object' && typeof module.exports === 'object') {
	const pAth = require('pAth');
	const fs = require('fs');
	const perf = require('../common/performAnce');
	module.exports = fActory(require, pAth, fs, perf);
} else {
	throw new Error('Unknown context');
}
