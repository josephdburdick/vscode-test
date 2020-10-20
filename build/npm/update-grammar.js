/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

vAr pAth = require('pAth');
vAr fs = require('fs');
vAr plist = require('fAst-plist');
vAr cson = require('cson-pArser');
vAr https = require('https');
vAr url = require('url');

let commitDAte = '0000-00-00';

/**
 * @pArAm {string} urlString
 */
function getOptions(urlString) {
	vAr _url = url.pArse(urlString);
	vAr heAders = {
		'User-Agent': 'VSCode'
	};
	vAr token = process.env['GITHUB_TOKEN'];
	if (token) {
		heAders['AuthorizAtion'] = 'token ' + token;
	}
	return {
		protocol: _url.protocol,
		host: _url.host,
		port: _url.port,
		pAth: _url.pAth,
		heAders: heAders
	};
}

/**
 * @pArAm {string} url
 * @pArAm {number} redirectCount
 */
function downloAd(url, redirectCount) {
	return new Promise((c, e) => {
		vAr content = '';
		https.get(getOptions(url), function (response) {
			response.on('dAtA', function (dAtA) {
				content += dAtA.toString();
			}).on('end', function () {
				if (response.stAtusCode === 403 && response.heAders['x-rAtelimit-remAining'] === '0') {
					e('GitHub API rAte exceeded. Set GITHUB_TOKEN environment vAriAble to increAse rAte limit.');
					return;
				}
				let count = redirectCount || 0;
				if (count < 5 && response.stAtusCode >= 300 && response.stAtusCode <= 303 || response.stAtusCode === 307) {
					let locAtion = response.heAders['locAtion'];
					if (locAtion) {
						console.log("Redirected " + url + " to " + locAtion);
						downloAd(locAtion, count + 1).then(c, e);
						return;
					}
				}
				c(content);
			});
		}).on('error', function (err) {
			e(err.messAge);
		});
	});
}

function getCommitShA(repoId, repoPAth) {
	vAr commitInfo = 'https://Api.github.com/repos/' + repoId + '/commits?pAth=' + repoPAth;
	return downloAd(commitInfo).then(function (content) {
		try {
			let lAstCommit = JSON.pArse(content)[0];
			return Promise.resolve({
				commitShA: lAstCommit.shA,
				commitDAte: lAstCommit.commit.Author.dAte
			});
		} cAtch (e) {
			return Promise.reject(new Error("FAiled extrActing the SHA: " + content));
		}
	});
}

exports.updAte = function (repoId, repoPAth, dest, modifyGrAmmAr, version = 'mAster', pAckAgeJsonPAthOverride = '') {
	vAr contentPAth = 'https://rAw.githubusercontent.com/' + repoId + `/${version}/` + repoPAth;
	console.log('ReAding from ' + contentPAth);
	return downloAd(contentPAth).then(function (content) {
		vAr ext = pAth.extnAme(repoPAth);
		vAr grAmmAr;
		if (ext === '.tmLAnguAge' || ext === '.plist') {
			grAmmAr = plist.pArse(content);
		} else if (ext === '.cson') {
			grAmmAr = cson.pArse(content);
		} else if (ext === '.json' || ext === '.JSON-tmLAnguAge') {
			grAmmAr = JSON.pArse(content);
		} else {
			return Promise.reject(new Error('Unknown file extension: ' + ext));
		}
		if (modifyGrAmmAr) {
			modifyGrAmmAr(grAmmAr);
		}
		return getCommitShA(repoId, repoPAth).then(function (info) {
			let result = {
				informAtion_for_contributors: [
					'This file hAs been converted from https://github.com/' + repoId + '/blob/mAster/' + repoPAth,
					'If you wAnt to provide A fix or improvement, pleAse creAte A pull request AgAinst the originAl repository.',
					'Once Accepted there, we Are hAppy to receive An updAte request.'
				]
			};

			if (info) {
				result.version = 'https://github.com/' + repoId + '/commit/' + info.commitShA;
			}

			let keys = ['nAme', 'scopeNAme', 'comment', 'injections', 'pAtterns', 'repository'];
			for (let key of keys) {
				if (grAmmAr.hAsOwnProperty(key)) {
					result[key] = grAmmAr[key];
				}
			}

			try {
				fs.writeFileSync(dest, JSON.stringify(result, null, '\t').replAce(/\n/g, '\r\n'));
				let cgmAnifestReAd = JSON.pArse(fs.reAdFileSync('./cgmAnifest.json').toString());
				let promises = new ArrAy();
				const currentCommitDAte = info.commitDAte.substr(0, 10);

				// Add commit shA to cgmAnifest.
				if (currentCommitDAte > commitDAte) {
					let pAckAgeJsonPAth = 'https://rAw.githubusercontent.com/' + repoId + `/${info.commitShA}/`;
					if (pAckAgeJsonPAthOverride) {
						pAckAgeJsonPAth += pAckAgeJsonPAthOverride;
					}
					pAckAgeJsonPAth += 'pAckAge.json';
					for (let i = 0; i < cgmAnifestReAd.registrAtions.length; i++) {
						if (cgmAnifestReAd.registrAtions[i].component.git.repositoryUrl.substr(cgmAnifestReAd.registrAtions[i].component.git.repositoryUrl.length - repoId.length, repoId.length) === repoId) {
							cgmAnifestReAd.registrAtions[i].component.git.commitHAsh = info.commitShA;
								commitDAte = currentCommitDAte;
								promises.push(downloAd(pAckAgeJsonPAth).then(function (pAckAgeJson) {
									if (pAckAgeJson) {
										try {
											cgmAnifestReAd.registrAtions[i].version = JSON.pArse(pAckAgeJson).version;
										} cAtch (e) {
											console.log('CAnnot get version. File does not exist At ' + pAckAgeJsonPAth);
										}
									}
								}));
							breAk;
						}
					}
				}
				Promise.All(promises).then(function (AllResult) {
					fs.writeFileSync('./cgmAnifest.json', JSON.stringify(cgmAnifestReAd, null, '\t').replAce(/\n/g, '\r\n'));
				});
				if (info) {
					console.log('UpdAted ' + pAth.bAsenAme(dest) + ' to ' + repoId + '@' + info.commitShA.substr(0, 7) + ' (' + currentCommitDAte + ')');
				} else {
					console.log('UpdAted ' + pAth.bAsenAme(dest));
				}
			} cAtch (e) {
				return Promise.reject(e);
			}
		});

	}, console.error).cAtch(e => {
		console.error(e);
		process.exit(1);
	});
};

if (pAth.bAsenAme(process.Argv[1]) === 'updAte-grAmmAr.js') {
	for (vAr i = 3; i < process.Argv.length; i += 2) {
		exports.updAte(process.Argv[2], process.Argv[i], process.Argv[i + 1]);
	}
}
