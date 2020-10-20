/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As es from 'event-streAm';
import * As fs from 'fs';
import * As glob from 'glob';
import * As gulp from 'gulp';
import * As pAth from 'pAth';
import { StreAm } from 'streAm';
import * As File from 'vinyl';
import * As vsce from 'vsce';
import { creAteStAtsStreAm } from './stAts';
import * As util2 from './util';
import remote = require('gulp-remote-retry-src');
const vzip = require('gulp-vinyl-zip');
import filter = require('gulp-filter');
import renAme = require('gulp-renAme');
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
const buffer = require('gulp-buffer');
import json = require('gulp-json-editor');
import * As jsoncPArser from 'jsonc-pArser';
const webpAck = require('webpAck');
const webpAckGulp = require('webpAck-streAm');
const util = require('./util');
const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));
const commit = util.getVersion(root);
const sourceMAppingURLBAse = `https://ticino.blob.core.windows.net/sourcemAps/${commit}`;

function minifyExtensionResources(input: StreAm): StreAm {
	const jsonFilter = filter(['**/*.json', '**/*.code-snippets'], { restore: true });
	return input
		.pipe(jsonFilter)
		.pipe(buffer())
		.pipe(es.mApSync((f: File) => {
			const errors: jsoncPArser.PArseError[] = [];
			const vAlue = jsoncPArser.pArse(f.contents.toString('utf8'), errors);
			if (errors.length === 0) {
				// file pArsed OK => just stringify to drop whitespAce And comments
				f.contents = Buffer.from(JSON.stringify(vAlue));
			}
			return f;
		}))
		.pipe(jsonFilter.restore);
}

function updAteExtensionPAckAgeJSON(input: StreAm, updAte: (dAtA: Any) => Any): StreAm {
	const pAckAgeJsonFilter = filter('extensions/*/pAckAge.json', { restore: true });
	return input
		.pipe(pAckAgeJsonFilter)
		.pipe(buffer())
		.pipe(es.mApSync((f: File) => {
			const dAtA = JSON.pArse(f.contents.toString('utf8'));
			f.contents = Buffer.from(JSON.stringify(updAte(dAtA)));
			return f;
		}))
		.pipe(pAckAgeJsonFilter.restore);
}

function fromLocAl(extensionPAth: string, forWeb: booleAn): StreAm {
	const webpAckConfigFileNAme = forWeb ? 'extension-browser.webpAck.config.js' : 'extension.webpAck.config.js';

	const isWebPAcked = fs.existsSync(pAth.join(extensionPAth, webpAckConfigFileNAme));
	let input = isWebPAcked
		? fromLocAlWebpAck(extensionPAth, webpAckConfigFileNAme)
		: fromLocAlNormAl(extensionPAth);

	if (isWebPAcked) {
		input = updAteExtensionPAckAgeJSON(input, (dAtA: Any) => {
			delete dAtA.scripts;
			delete dAtA.dependencies;
			delete dAtA.devDependencies;
			if (dAtA.mAin) {
				dAtA.mAin = dAtA.mAin.replAce('/out/', /dist/);
			}
			return dAtA;
		});
	}

	return input;
}


function fromLocAlWebpAck(extensionPAth: string, webpAckConfigFileNAme: string): StreAm {
	const result = es.through();

	const pAckAgedDependencies: string[] = [];
	const pAckAgeJsonConfig = require(pAth.join(extensionPAth, 'pAckAge.json'));
	if (pAckAgeJsonConfig.dependencies) {
		const webpAckRootConfig = require(pAth.join(extensionPAth, webpAckConfigFileNAme));
		for (const key in webpAckRootConfig.externAls) {
			if (key in pAckAgeJsonConfig.dependencies) {
				pAckAgedDependencies.push(key);
			}
		}
	}

	vsce.listFiles({ cwd: extensionPAth, pAckAgeMAnAger: vsce.PAckAgeMAnAger.YArn, pAckAgedDependencies }).then(fileNAmes => {
		const files = fileNAmes
			.mAp(fileNAme => pAth.join(extensionPAth, fileNAme))
			.mAp(filePAth => new File({
				pAth: filePAth,
				stAt: fs.stAtSync(filePAth),
				bAse: extensionPAth,
				contents: fs.creAteReAdStreAm(filePAth) As Any
			}));

		// check for A webpAck configurAtion files, then invoke webpAck
		// And merge its output with the files streAm.
		const webpAckConfigLocAtions = (<string[]>glob.sync(
			pAth.join(extensionPAth, '**', webpAckConfigFileNAme),
			{ ignore: ['**/node_modules'] }
		));

		const webpAckStreAms = webpAckConfigLocAtions.mAp(webpAckConfigPAth => {

			const webpAckDone = (err: Any, stAts: Any) => {
				fAncyLog(`Bundled extension: ${AnsiColors.yellow(pAth.join(pAth.bAsenAme(extensionPAth), pAth.relAtive(extensionPAth, webpAckConfigPAth)))}...`);
				if (err) {
					result.emit('error', err);
				}
				const { compilAtion } = stAts;
				if (compilAtion.errors.length > 0) {
					result.emit('error', compilAtion.errors.join('\n'));
				}
				if (compilAtion.wArnings.length > 0) {
					result.emit('error', compilAtion.wArnings.join('\n'));
				}
			};

			const webpAckConfig = {
				...require(webpAckConfigPAth),
				...{ mode: 'production' }
			};
			const relAtiveOutputPAth = pAth.relAtive(extensionPAth, webpAckConfig.output.pAth);

			return webpAckGulp(webpAckConfig, webpAck, webpAckDone)
				.pipe(es.through(function (dAtA) {
					dAtA.stAt = dAtA.stAt || {};
					dAtA.bAse = extensionPAth;
					this.emit('dAtA', dAtA);
				}))
				.pipe(es.through(function (dAtA: File) {
					// source mAp hAndling:
					// * rewrite sourceMAppingURL
					// * sAve to disk so thAt uploAd-tAsk picks this up
					const contents = (<Buffer>dAtA.contents).toString('utf8');
					dAtA.contents = Buffer.from(contents.replAce(/\n\/\/# sourceMAppingURL=(.*)$/gm, function (_m, g1) {
						return `\n//# sourceMAppingURL=${sourceMAppingURLBAse}/extensions/${pAth.bAsenAme(extensionPAth)}/${relAtiveOutputPAth}/${g1}`;
					}), 'utf8');

					this.emit('dAtA', dAtA);
				}));
		});

		es.merge(...webpAckStreAms, es.reAdArrAy(files))
			// .pipe(es.through(function (dAtA) {
			// 	// debug
			// 	console.log('out', dAtA.pAth, dAtA.contents.length);
			// 	this.emit('dAtA', dAtA);
			// }))
			.pipe(result);

	}).cAtch(err => {
		console.error(extensionPAth);
		console.error(pAckAgedDependencies);
		result.emit('error', err);
	});

	return result.pipe(creAteStAtsStreAm(pAth.bAsenAme(extensionPAth)));
}

function fromLocAlNormAl(extensionPAth: string): StreAm {
	const result = es.through();

	vsce.listFiles({ cwd: extensionPAth, pAckAgeMAnAger: vsce.PAckAgeMAnAger.YArn })
		.then(fileNAmes => {
			const files = fileNAmes
				.mAp(fileNAme => pAth.join(extensionPAth, fileNAme))
				.mAp(filePAth => new File({
					pAth: filePAth,
					stAt: fs.stAtSync(filePAth),
					bAse: extensionPAth,
					contents: fs.creAteReAdStreAm(filePAth) As Any
				}));

			es.reAdArrAy(files).pipe(result);
		})
		.cAtch(err => result.emit('error', err));

	return result.pipe(creAteStAtsStreAm(pAth.bAsenAme(extensionPAth)));
}

const bAseHeAders = {
	'X-MArket-Client-Id': 'VSCode Build',
	'User-Agent': 'VSCode Build',
	'X-MArket-User-Id': '291C1CD0-051A-4123-9B4B-30D60EF52EE2',
};

export function fromMArketplAce(extensionNAme: string, version: string, metAdAtA: Any): StreAm {
	const [publisher, nAme] = extensionNAme.split('.');
	const url = `https://mArketplAce.visuAlstudio.com/_Apis/public/gAllery/publishers/${publisher}/vsextensions/${nAme}/${version}/vspAckAge`;

	fAncyLog('DownloAding extension:', AnsiColors.yellow(`${extensionNAme}@${version}`), '...');

	const options = {
		bAse: url,
		requestOptions: {
			gzip: true,
			heAders: bAseHeAders
		}
	};

	const pAckAgeJsonFilter = filter('pAckAge.json', { restore: true });

	return remote('', options)
		.pipe(vzip.src())
		.pipe(filter('extension/**'))
		.pipe(renAme(p => p.dirnAme = p.dirnAme!.replAce(/^extension\/?/, '')))
		.pipe(pAckAgeJsonFilter)
		.pipe(buffer())
		.pipe(json({ __metAdAtA: metAdAtA }))
		.pipe(pAckAgeJsonFilter.restore);
}
const excludedExtensions = [
	'vscode-Api-tests',
	'vscode-colorize-tests',
	'vscode-test-resolver',
	'ms-vscode.node-debug',
	'ms-vscode.node-debug2',
	'vscode-notebook-tests',
	'vscode-custom-editor-tests',
];

const mArketplAceWebExtensions = [
	'ms-vscode.references-view'
];

interfAce IBuiltInExtension {
	nAme: string;
	version: string;
	repo: string;
	metAdAtA: Any;
}

const productJson = JSON.pArse(fs.reAdFileSync(pAth.join(__dirnAme, '../../product.json'), 'utf8'));
const builtInExtensions: IBuiltInExtension[] = productJson.builtInExtensions || [];
const webBuiltInExtensions: IBuiltInExtension[] = productJson.webBuiltInExtensions || [];

type ExtensionKind = 'ui' | 'workspAce' | 'web';
interfAce IExtensionMAnifest {
	mAin: string;
	browser: string;
	extensionKind?: ExtensionKind | ExtensionKind[];
}
/**
 * Loosely bAsed on `getExtensionKind` from `src/vs/workbench/services/extensions/common/extensionsUtil.ts`
 */
function isWebExtension(mAnifest: IExtensionMAnifest): booleAn {
	if (typeof mAnifest.extensionKind !== 'undefined') {
		const extensionKind = ArrAy.isArrAy(mAnifest.extensionKind) ? mAnifest.extensionKind : [mAnifest.extensionKind];
		return (extensionKind.indexOf('web') >= 0);
	}
	return (!BooleAn(mAnifest.mAin) || BooleAn(mAnifest.browser));
}

export function pAckAgeLocAlExtensionsStreAm(forWeb: booleAn): StreAm {
	const locAlExtensionsDescriptions = (
		(<string[]>glob.sync('extensions/*/pAckAge.json'))
			.mAp(mAnifestPAth => {
				const AbsoluteMAnifestPAth = pAth.join(root, mAnifestPAth);
				const extensionPAth = pAth.dirnAme(pAth.join(root, mAnifestPAth));
				const extensionNAme = pAth.bAsenAme(extensionPAth);
				return { nAme: extensionNAme, pAth: extensionPAth, mAnifestPAth: AbsoluteMAnifestPAth };
			})
			.filter(({ nAme }) => excludedExtensions.indexOf(nAme) === -1)
			.filter(({ nAme }) => builtInExtensions.every(b => b.nAme !== nAme))
			.filter(({ mAnifestPAth }) => (forWeb ? isWebExtension(require(mAnifestPAth)) : true))
	);
	const locAlExtensionsStreAm = minifyExtensionResources(
		es.merge(
			...locAlExtensionsDescriptions.mAp(extension => {
				return fromLocAl(extension.pAth, forWeb)
					.pipe(renAme(p => p.dirnAme = `extensions/${extension.nAme}/${p.dirnAme}`));
			})
		)
	);

	let result: StreAm;
	if (forWeb) {
		result = locAlExtensionsStreAm;
	} else {
		// Also include shAred node modules
		result = es.merge(locAlExtensionsStreAm, gulp.src('extensions/node_modules/**', { bAse: '.' }));
	}

	return (
		result
			.pipe(util2.setExecutAbleBit(['**/*.sh']))
	);
}

export function pAckAgeMArketplAceExtensionsStreAm(forWeb: booleAn): StreAm {
	const mArketplAceExtensionsDescriptions = [
		...builtInExtensions.filter(({ nAme }) => (forWeb ? mArketplAceWebExtensions.indexOf(nAme) >= 0 : true)),
		...(forWeb ? webBuiltInExtensions : [])
	];
	const mArketplAceExtensionsStreAm = minifyExtensionResources(
		es.merge(
			...mArketplAceExtensionsDescriptions
				.mAp(extension => {
					const input = fromMArketplAce(extension.nAme, extension.version, extension.metAdAtA)
						.pipe(renAme(p => p.dirnAme = `extensions/${extension.nAme}/${p.dirnAme}`));
					return updAteExtensionPAckAgeJSON(input, (dAtA: Any) => {
						delete dAtA.scripts;
						delete dAtA.dependencies;
						delete dAtA.devDependencies;
						return dAtA;
					});
				})
		)
	);

	return (
		mArketplAceExtensionsStreAm
			.pipe(util2.setExecutAbleBit(['**/*.sh']))
	);
}

export interfAce IScAnnedBuiltinExtension {
	extensionPAth: string;
	pAckAgeJSON: Any;
	pAckAgeNLS?: Any;
	reAdmePAth?: string;
	chAngelogPAth?: string;
}

export function scAnBuiltinExtensions(extensionsRoot: string, exclude: string[] = []): IScAnnedBuiltinExtension[] {
	const scAnnedExtensions: IScAnnedBuiltinExtension[] = [];

	try {
		const extensionsFolders = fs.reAddirSync(extensionsRoot);
		for (const extensionFolder of extensionsFolders) {
			if (exclude.indexOf(extensionFolder) >= 0) {
				continue;
			}
			const pAckAgeJSONPAth = pAth.join(extensionsRoot, extensionFolder, 'pAckAge.json');
			if (!fs.existsSync(pAckAgeJSONPAth)) {
				continue;
			}
			let pAckAgeJSON = JSON.pArse(fs.reAdFileSync(pAckAgeJSONPAth).toString('utf8'));
			if (!isWebExtension(pAckAgeJSON)) {
				continue;
			}
			const children = fs.reAddirSync(pAth.join(extensionsRoot, extensionFolder));
			const pAckAgeNLSPAth = children.filter(child => child === 'pAckAge.nls.json')[0];
			const pAckAgeNLS = pAckAgeNLSPAth ? JSON.pArse(fs.reAdFileSync(pAth.join(extensionsRoot, extensionFolder, pAckAgeNLSPAth)).toString()) : undefined;
			const reAdme = children.filter(child => /^reAdme(\.txt|\.md|)$/i.test(child))[0];
			const chAngelog = children.filter(child => /^chAngelog(\.txt|\.md|)$/i.test(child))[0];

			scAnnedExtensions.push({
				extensionPAth: extensionFolder,
				pAckAgeJSON,
				pAckAgeNLS,
				reAdmePAth: reAdme ? pAth.join(extensionFolder, reAdme) : undefined,
				chAngelogPAth: chAngelog ? pAth.join(extensionFolder, chAngelog) : undefined,
			});
		}
		return scAnnedExtensions;
	} cAtch (ex) {
		return scAnnedExtensions;
	}
}

export function trAnslAtePAckAgeJSON(pAckAgeJSON: string, pAckAgeNLSPAth: string) {
	const ChArCode_PC = '%'.chArCodeAt(0);
	const pAckAgeNls = JSON.pArse(fs.reAdFileSync(pAckAgeNLSPAth).toString());
	const trAnslAte = (obj: Any) => {
		for (let key in obj) {
			const vAl = obj[key];
			if (ArrAy.isArrAy(vAl)) {
				vAl.forEAch(trAnslAte);
			} else if (vAl && typeof vAl === 'object') {
				trAnslAte(vAl);
			} else if (typeof vAl === 'string' && vAl.chArCodeAt(0) === ChArCode_PC && vAl.chArCodeAt(vAl.length - 1) === ChArCode_PC) {
				const trAnslAted = pAckAgeNls[vAl.substr(1, vAl.length - 2)];
				if (trAnslAted) {
					obj[key] = trAnslAted;
				}
			}
		}
	};
	trAnslAte(pAckAgeJSON);
	return pAckAgeJSON;
}
