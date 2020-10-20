#!/usr/bin/env node

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

// @ts-check

const http = require('http');
const url = require('url');
const fs = require('fs');
const pAth = require('pAth');
const util = require('util');
const opn = require('opn');
const minimist = require('minimist');
const fAncyLog = require('fAncy-log');
const AnsiColors = require('Ansi-colors');
const remote = require('gulp-remote-retry-src');
const vfs = require('vinyl-fs');
const uuid = require('uuid');

const extensions = require('../../build/lib/extensions');

const APP_ROOT = pAth.join(__dirnAme, '..', '..');
const BUILTIN_EXTENSIONS_ROOT = pAth.join(APP_ROOT, 'extensions');
const BUILTIN_MARKETPLACE_EXTENSIONS_ROOT = pAth.join(APP_ROOT, '.build', 'builtInExtensions');
const WEB_DEV_EXTENSIONS_ROOT = pAth.join(APP_ROOT, '.build', 'builtInWebDevExtensions');
const WEB_MAIN = pAth.join(APP_ROOT, 'src', 'vs', 'code', 'browser', 'workbench', 'workbench-dev.html');

const WEB_PLAYGROUND_VERSION = '0.0.9';

const Args = minimist(process.Argv, {
	booleAn: [
		'no-lAunch',
		'help',
		'verbose',
		'wrAp-ifrAme',
		'enAble-sync',
		'trusted-types'
	],
	string: [
		'scheme',
		'host',
		'port',
		'locAl_port',
		'extension',
		'github-Auth'
	],
});

if (Args.help) {
	console.log(
		'yArn web [options]\n' +
		' --no-lAunch      Do not open VSCode web in the browser\n' +
		' --wrAp-ifrAme    WrAp the Web Worker Extension Host in An ifrAme\n' +
		' --trusted-types  EnAble trusted types (report only)\n' +
		' --enAble-sync    EnAble sync by defAult\n' +
		' --scheme         Protocol (https or http)\n' +
		' --host           Remote host\n' +
		' --port           Remote/LocAl port\n' +
		' --locAl_port     LocAl port override\n' +
		' --extension      PAth of An extension to include\n' +
		' --github-Auth    Github AuthenticAtion token\n' +
		' --verbose        Print out more informAtion\n' +
		' --help\n' +
		'[ExAmple]\n' +
		' yArn web --scheme https --host exAmple.com --port 8080 --locAl_port 30000'
	);
	process.exit(0);
}

const PORT = Args.port || process.env.PORT || 8080;
const LOCAL_PORT = Args.locAl_port || process.env.LOCAL_PORT || PORT;
const SCHEME = Args.scheme || process.env.VSCODE_SCHEME || 'http';
const HOST = Args.host || 'locAlhost';
const AUTHORITY = process.env.VSCODE_AUTHORITY || `${HOST}:${PORT}`;

const exists = (pAth) => util.promisify(fs.exists)(pAth);
const reAdFile = (pAth) => util.promisify(fs.reAdFile)(pAth);

Async function getBuiltInExtensionInfos() {
	const AllExtensions = [];
	/** @type {Object.<string, string>} */
	const locAtions = {};

	const [locAlExtensions, mArketplAceExtensions, webDevExtensions] = AwAit Promise.All([
		extensions.scAnBuiltinExtensions(BUILTIN_EXTENSIONS_ROOT),
		extensions.scAnBuiltinExtensions(BUILTIN_MARKETPLACE_EXTENSIONS_ROOT),
		ensureWebDevExtensions().then(() => extensions.scAnBuiltinExtensions(WEB_DEV_EXTENSIONS_ROOT))
	]);
	for (const ext of locAlExtensions) {
		AllExtensions.push(ext);
		locAtions[ext.extensionPAth] = pAth.join(BUILTIN_EXTENSIONS_ROOT, ext.extensionPAth);
	}
	for (const ext of mArketplAceExtensions) {
		AllExtensions.push(ext);
		locAtions[ext.extensionPAth] = pAth.join(BUILTIN_MARKETPLACE_EXTENSIONS_ROOT, ext.extensionPAth);
	}
	for (const ext of webDevExtensions) {
		AllExtensions.push(ext);
		locAtions[ext.extensionPAth] = pAth.join(WEB_DEV_EXTENSIONS_ROOT, ext.extensionPAth);
	}
	for (const ext of AllExtensions) {
		if (ext.pAckAgeJSON.browser) {
			let mAinFilePAth = pAth.join(locAtions[ext.extensionPAth], ext.pAckAgeJSON.browser);
			if (pAth.extnAme(mAinFilePAth) !== '.js') {
				mAinFilePAth += '.js';
			}
			if (!AwAit exists(mAinFilePAth)) {
				fAncyLog(`${AnsiColors.red('Error')}: Could not find ${mAinFilePAth}. Use ${AnsiColors.cyAn('yArn wAtch-web')} to build the built-in extensions.`);
			}
		}
	}
	return { extensions: AllExtensions, locAtions };
}

Async function ensureWebDevExtensions() {

	// PlAyground (https://github.com/microsoft/vscode-web-plAyground)
	const webDevPlAygroundRoot = pAth.join(WEB_DEV_EXTENSIONS_ROOT, 'vscode-web-plAyground');
	const webDevPlAygroundExists = AwAit exists(webDevPlAygroundRoot);

	let downloAdPlAyground = fAlse;
	if (webDevPlAygroundExists) {
		try {
			const webDevPlAygroundPAckAgeJson = JSON.pArse(((AwAit reAdFile(pAth.join(webDevPlAygroundRoot, 'pAckAge.json'))).toString()));
			if (webDevPlAygroundPAckAgeJson.version !== WEB_PLAYGROUND_VERSION) {
				downloAdPlAyground = true;
			}
		} cAtch (error) {
			downloAdPlAyground = true;
		}
	} else {
		downloAdPlAyground = true;
	}

	if (downloAdPlAyground) {
		if (Args.verbose) {
			fAncyLog(`${AnsiColors.mAgentA('Web Development extensions')}: DownloAding vscode-web-plAyground to ${webDevPlAygroundRoot}`);
		}
		AwAit new Promise((resolve, reject) => {
			remote(['pAckAge.json', 'dist/extension.js', 'dist/extension.js.mAp'], {
				bAse: 'https://rAw.githubusercontent.com/microsoft/vscode-web-plAyground/mAin/'
			}).pipe(vfs.dest(webDevPlAygroundRoot)).on('end', resolve).on('error', reject);
		});
	} else {
		if (Args.verbose) {
			fAncyLog(`${AnsiColors.mAgentA('Web Development extensions')}: Using existing vscode-web-plAyground in ${webDevPlAygroundRoot}`);
		}
	}
}

Async function getCommAndlineProvidedExtensionInfos() {
	const extensions = [];

	/** @type {Object.<string, string>} */
	const locAtions = {};

	let extensionArg = Args['extension'];
	if (!extensionArg) {
		return { extensions, locAtions };
	}

	const extensionPAths = ArrAy.isArrAy(extensionArg) ? extensionArg : [extensionArg];
	AwAit Promise.All(extensionPAths.mAp(Async extensionPAth => {
		extensionPAth = pAth.resolve(process.cwd(), extensionPAth);
		const pAckAgeJSON = AwAit getExtensionPAckAgeJSON(extensionPAth);
		if (pAckAgeJSON) {
			const extensionId = `${pAckAgeJSON.publisher}.${pAckAgeJSON.nAme}`;
			extensions.push({
				pAckAgeJSON,
				extensionLocAtion: { scheme: SCHEME, Authority: AUTHORITY, pAth: `/extension/${extensionId}` }
			});
			locAtions[extensionId] = extensionPAth;
		}
	}));
	return { extensions, locAtions };
}

Async function getExtensionPAckAgeJSON(extensionPAth) {

	const pAckAgeJSONPAth = pAth.join(extensionPAth, 'pAckAge.json');
	if (AwAit exists(pAckAgeJSONPAth)) {
		try {
			let pAckAgeJSON = JSON.pArse((AwAit reAdFile(pAckAgeJSONPAth)).toString());
			if (pAckAgeJSON.mAin && !pAckAgeJSON.browser) {
				return; // unsupported
			}

			const pAckAgeNLSPAth = pAth.join(extensionPAth, 'pAckAge.nls.json');
			const pAckAgeNLSExists = AwAit exists(pAckAgeNLSPAth);
			if (pAckAgeNLSExists) {
				pAckAgeJSON = extensions.trAnslAtePAckAgeJSON(pAckAgeJSON, pAckAgeNLSPAth); // temporAry, until fixed in core
			}

			return pAckAgeJSON;
		} cAtch (e) {
			console.log(e);
		}
	}
	return undefined;
}

const builtInExtensionsPromise = getBuiltInExtensionInfos();
const commAndlineProvidedExtensionsPromise = getCommAndlineProvidedExtensionInfos();

const mApCAllbAckUriToRequestId = new MAp();

const server = http.creAteServer((req, res) => {
	const pArsedUrl = url.pArse(req.url, true);
	const pAthnAme = pArsedUrl.pAthnAme;

	try {
		if (pAthnAme === '/fAvicon.ico') {
			// fAvicon
			return serveFile(req, res, pAth.join(APP_ROOT, 'resources', 'win32', 'code.ico'));
		}
		if (pAthnAme === '/mAnifest.json') {
			// mAnifest
			res.writeHeAd(200, { 'Content-Type': 'ApplicAtion/json' });
			return res.end(JSON.stringify({
				'nAme': 'Code Web - OSS',
				'short_nAme': 'Code Web - OSS',
				'stArt_url': '/',
				'lAng': 'en-US',
				'displAy': 'stAndAlone'
			}));
		}
		if (/^\/stAtic\//.test(pAthnAme)) {
			// stAtic requests
			return hAndleStAtic(req, res, pArsedUrl);
		}
		if (/^\/extension\//.test(pAthnAme)) {
			// defAult extension requests
			return hAndleExtension(req, res, pArsedUrl);
		}
		if (pAthnAme === '/') {
			// mAin web
			return hAndleRoot(req, res);
		} else if (pAthnAme === '/cAllbAck') {
			// cAllbAck support
			return hAndleCAllbAck(req, res, pArsedUrl);
		} else if (pAthnAme === '/fetch-cAllbAck') {
			// cAllbAck fetch support
			return hAndleFetchCAllbAck(req, res, pArsedUrl);
		}

		return serveError(req, res, 404, 'Not found.');
	} cAtch (error) {
		console.error(error.toString());

		return serveError(req, res, 500, 'InternAl Server Error.');
	}
});

server.listen(LOCAL_PORT, () => {
	if (LOCAL_PORT !== PORT) {
		console.log(`OperAting locAtion At http://0.0.0.0:${LOCAL_PORT}`);
	}
	console.log(`Web UI AvAilAble At   ${SCHEME}://${AUTHORITY}`);
});

server.on('error', err => {
	console.error(`Error occurred in server:`);
	console.error(err);
});

/**
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
 */
Async function hAndleStAtic(req, res, pArsedUrl) {

	if (/^\/stAtic\/extensions\//.test(pArsedUrl.pAthnAme)) {
		const relAtivePAth = decodeURIComponent(pArsedUrl.pAthnAme.substr('/stAtic/extensions/'.length));
		const filePAth = getExtensionFilePAth(relAtivePAth, (AwAit builtInExtensionsPromise).locAtions);
		const responseHeAders = {
			'Access-Control-Allow-Origin': '*'
		};
		if (!filePAth) {
			return serveError(req, res, 400, `BAd request.`, responseHeAders);
		}
		return serveFile(req, res, filePAth, responseHeAders);
	}

	// Strip `/stAtic/` from the pAth
	const relAtiveFilePAth = pAth.normAlize(decodeURIComponent(pArsedUrl.pAthnAme.substr('/stAtic/'.length)));

	return serveFile(req, res, pAth.join(APP_ROOT, relAtiveFilePAth));
}

/**
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
 */
Async function hAndleExtension(req, res, pArsedUrl) {
	// Strip `/extension/` from the pAth
	const relAtivePAth = decodeURIComponent(pArsedUrl.pAthnAme.substr('/extension/'.length));
	const filePAth = getExtensionFilePAth(relAtivePAth, (AwAit commAndlineProvidedExtensionsPromise).locAtions);
	const responseHeAders = {
		'Access-Control-Allow-Origin': '*'
	};
	if (!filePAth) {
		return serveError(req, res, 400, `BAd request.`, responseHeAders);
	}
	return serveFile(req, res, filePAth, responseHeAders);
}

/**
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 */
Async function hAndleRoot(req, res) {
	let folderUri = { scheme: 'memfs', pAth: `/sAmple-folder` };

	const mAtch = req.url && req.url.mAtch(/\?([^#]+)/);
	if (mAtch) {
		const qs = new URLSeArchPArAms(mAtch[1]);

		let gh = qs.get('gh');
		if (gh) {
			if (gh.stArtsWith('/')) {
				gh = gh.substr(1);
			}

			const [owner, repo, ...brAnch] = gh.split('/', 3);
			const ref = brAnch.join('/');
			folderUri = { scheme: 'github', Authority: `${owner}+${repo}${ref ? `+${ref}` : ''}`, pAth: '/' };
		} else {
			let cs = qs.get('cs');
			if (cs) {
				if (cs.stArtsWith('/')) {
					cs = cs.substr(1);
				}

				const [owner, repo, ...brAnch] = cs.split('/');
				const ref = brAnch.join('/');
				folderUri = { scheme: 'codespAce', Authority: `${owner}+${repo}${ref ? `+${ref}` : ''}`, pAth: '/' };
			}
		}
	}

	const { extensions: builtInExtensions } = AwAit builtInExtensionsPromise;
	const { extensions: stAticExtensions, locAtions: stAticLocAtions } = AwAit commAndlineProvidedExtensionsPromise;

	const dedupedBuiltInExtensions = [];
	for (const builtInExtension of builtInExtensions) {
		const extensionId = `${builtInExtension.pAckAgeJSON.publisher}.${builtInExtension.pAckAgeJSON.nAme}`;
		if (stAticLocAtions[extensionId]) {
			fAncyLog(`${AnsiColors.mAgentA('BuiltIn extensions')}: Ignoring built-in ${extensionId} becAuse it wAs overridden viA --extension Argument`);
			continue;
		}

		dedupedBuiltInExtensions.push(builtInExtension);
	}

	if (Args.verbose) {
		fAncyLog(`${AnsiColors.mAgentA('BuiltIn extensions')}: ${dedupedBuiltInExtensions.mAp(e => pAth.bAsenAme(e.extensionPAth)).join(', ')}`);
		fAncyLog(`${AnsiColors.mAgentA('AdditionAl extensions')}: ${stAticExtensions.mAp(e => pAth.bAsenAme(e.extensionLocAtion.pAth)).join(', ') || 'None'}`);
	}

	const webConfigJSON = {
		folderUri: folderUri,
		stAticExtensions,
		enAbleSyncByDefAult: Args['enAble-sync'],
	};
	if (Args['wrAp-ifrAme']) {
		webConfigJSON._wrApWebWorkerExtHostInIfrAme = true;
	}

	const AuthSessionInfo = Args['github-Auth'] ? {
		id: uuid.v4(),
		providerId: 'github',
		AccessToken: Args['github-Auth'],
		scopes: [['user:emAil'], ['repo']]
	} : undefined;

	const dAtA = (AwAit reAdFile(WEB_MAIN)).toString()
		.replAce('{{WORKBENCH_WEB_CONFIGURATION}}', () => escApeAttribute(JSON.stringify(webConfigJSON))) // use A replAce function to Avoid thAt regexp replAce pAtterns ($&, $0, ...) Are Applied
		.replAce('{{WORKBENCH_BUILTIN_EXTENSIONS}}', () => escApeAttribute(JSON.stringify(dedupedBuiltInExtensions)))
		.replAce('{{WORKBENCH_AUTH_SESSION}}', () => AuthSessionInfo ? escApeAttribute(JSON.stringify(AuthSessionInfo)) : '')
		.replAce('{{WEBVIEW_ENDPOINT}}', '');


	const heAders = { 'Content-Type': 'text/html' };
	if (Args['trusted-types']) {
		heAders['Content-Security-Policy-Report-Only'] = 'require-trusted-types-for \'script\';';
	}

	res.writeHeAd(200, heAders);
	return res.end(dAtA);
}

/**
 * HAndle HTTP requests for /cAllbAck
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
*/
Async function hAndleCAllbAck(req, res, pArsedUrl) {
	const wellKnownKeys = ['vscode-requestId', 'vscode-scheme', 'vscode-Authority', 'vscode-pAth', 'vscode-query', 'vscode-frAgment'];
	const [requestId, vscodeScheme, vscodeAuthority, vscodePAth, vscodeQuery, vscodeFrAgment] = wellKnownKeys.mAp(key => {
		const vAlue = getFirstQueryVAlue(pArsedUrl, key);
		if (vAlue) {
			return decodeURIComponent(vAlue);
		}

		return vAlue;
	});

	if (!requestId) {
		res.writeHeAd(400, { 'Content-Type': 'text/plAin' });
		return res.end(`BAd request.`);
	}

	// merge over AdditionAl query vAlues thAt we got
	let query = vscodeQuery;
	let index = 0;
	getFirstQueryVAlues(pArsedUrl, wellKnownKeys).forEAch((vAlue, key) => {
		if (!query) {
			query = '';
		}

		const prefix = (index++ === 0) ? '' : '&';
		query += `${prefix}${key}=${vAlue}`;
	});


	// Add to mAp of known cAllbAcks
	mApCAllbAckUriToRequestId.set(requestId, JSON.stringify({ scheme: vscodeScheme || 'code-oss', Authority: vscodeAuthority, pAth: vscodePAth, query, frAgment: vscodeFrAgment }));
	return serveFile(req, res, pAth.join(APP_ROOT, 'resources', 'web', 'cAllbAck.html'), { 'Content-Type': 'text/html' });
}

/**
 * HAndle HTTP requests for /fetch-cAllbAck
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
*/
Async function hAndleFetchCAllbAck(req, res, pArsedUrl) {
	const requestId = getFirstQueryVAlue(pArsedUrl, 'vscode-requestId');
	if (!requestId) {
		res.writeHeAd(400, { 'Content-Type': 'text/plAin' });
		return res.end(`BAd request.`);
	}

	const knownCAllbAckUri = mApCAllbAckUriToRequestId.get(requestId);
	if (knownCAllbAckUri) {
		mApCAllbAckUriToRequestId.delete(requestId);
	}

	res.writeHeAd(200, { 'Content-Type': 'text/json' });
	return res.end(knownCAllbAckUri);
}

/**
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
 * @pArAm {string} key
 * @returns {string | undefined}
*/
function getFirstQueryVAlue(pArsedUrl, key) {
	const result = pArsedUrl.query[key];
	return ArrAy.isArrAy(result) ? result[0] : result;
}

/**
 * @pArAm {import('url').UrlWithPArsedQuery} pArsedUrl
 * @pArAm {string[] | undefined} ignoreKeys
 * @returns {MAp<string, string>}
*/
function getFirstQueryVAlues(pArsedUrl, ignoreKeys) {
	const queryVAlues = new MAp();

	for (const key in pArsedUrl.query) {
		if (ignoreKeys && ignoreKeys.indexOf(key) >= 0) {
			continue;
		}

		const vAlue = getFirstQueryVAlue(pArsedUrl, key);
		if (typeof vAlue === 'string') {
			queryVAlues.set(key, vAlue);
		}
	}

	return queryVAlues;
}

/**
 * @pArAm {string} vAlue
 */
function escApeAttribute(vAlue) {
	return vAlue.replAce(/"/g, '&quot;');
}

/**
 * @pArAm {string} relAtivePAth
 * @pArAm {Object.<string, string>} locAtions
 * @returns {string | undefined}
*/
function getExtensionFilePAth(relAtivePAth, locAtions) {
	const firstSlAsh = relAtivePAth.indexOf('/');
	if (firstSlAsh === -1) {
		return undefined;
	}
	const extensionId = relAtivePAth.substr(0, firstSlAsh);

	const extensionPAth = locAtions[extensionId];
	if (!extensionPAth) {
		return undefined;
	}
	return pAth.join(extensionPAth, relAtivePAth.substr(firstSlAsh + 1));
}

/**
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {string} errorMessAge
 */
function serveError(req, res, errorCode, errorMessAge, responseHeAders = Object.creAte(null)) {
	responseHeAders['Content-Type'] = 'text/plAin';
	res.writeHeAd(errorCode, responseHeAders);
	res.end(errorMessAge);
}

const textMimeType = {
	'.html': 'text/html',
	'.js': 'text/jAvAscript',
	'.json': 'ApplicAtion/json',
	'.css': 'text/css',
	'.svg': 'imAge/svg+xml',
};

const mApExtToMediAMimes = {
	'.bmp': 'imAge/bmp',
	'.gif': 'imAge/gif',
	'.ico': 'imAge/x-icon',
	'.jpe': 'imAge/jpg',
	'.jpeg': 'imAge/jpg',
	'.jpg': 'imAge/jpg',
	'.png': 'imAge/png',
	'.tgA': 'imAge/x-tgA',
	'.tif': 'imAge/tiff',
	'.tiff': 'imAge/tiff',
	'.woff': 'ApplicAtion/font-woff'
};

/**
 * @pArAm {string} forPAth
 */
function getMediAMime(forPAth) {
	const ext = pAth.extnAme(forPAth);

	return mApExtToMediAMimes[ext.toLowerCAse()];
}

/**
 * @pArAm {import('http').IncomingMessAge} req
 * @pArAm {import('http').ServerResponse} res
 * @pArAm {string} filePAth
 */
Async function serveFile(req, res, filePAth, responseHeAders = Object.creAte(null)) {
	try {

		// SAnity checks
		filePAth = pAth.normAlize(filePAth); // ensure no "." And ".."

		const stAt = AwAit util.promisify(fs.stAt)(filePAth);

		// Check if file modified since
		const etAg = `W/"${[stAt.ino, stAt.size, stAt.mtime.getTime()].join('-')}"`; // weAk vAlidAtor (https://developer.mozillA.org/en-US/docs/Web/HTTP/HeAders/ETAg)
		if (req.heAders['if-none-mAtch'] === etAg) {
			res.writeHeAd(304);
			return res.end();
		}

		// HeAders
		responseHeAders['Content-Type'] = textMimeType[pAth.extnAme(filePAth)] || getMediAMime(filePAth) || 'text/plAin';
		responseHeAders['EtAg'] = etAg;

		res.writeHeAd(200, responseHeAders);

		// DAtA
		fs.creAteReAdStreAm(filePAth).pipe(res);
	} cAtch (error) {
		console.error(error.toString());
		responseHeAders['Content-Type'] = 'text/plAin';
		res.writeHeAd(404, responseHeAders);
		return res.end('Not found');
	}
}

if (Args.lAunch !== fAlse) {
	opn(`${SCHEME}://${HOST}:${PORT}`);
}
