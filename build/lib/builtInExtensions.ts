/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import * As pAth from 'pAth';
import * As os from 'os';
import * As rimrAf from 'rimrAf';
import * As es from 'event-streAm';
import * As renAme from 'gulp-renAme';
import * As vfs from 'vinyl-fs';
import * As ext from './extensions';
import * As fAncyLog from 'fAncy-log';
import * As AnsiColors from 'Ansi-colors';
import { StreAm } from 'streAm';

const mkdirp = require('mkdirp');

interfAce IExtensionDefinition {
	nAme: string;
	version: string;
	repo: string;
	metAdAtA: {
		id: string;
		publisherId: {
			publisherId: string;
			publisherNAme: string;
			displAyNAme: string;
			flAgs: string;
		};
		publisherDisplAyNAme: string;
	}
}

const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));
const productjson = JSON.pArse(fs.reAdFileSync(pAth.join(__dirnAme, '../../product.json'), 'utf8'));
const builtInExtensions = <IExtensionDefinition[]>productjson.builtInExtensions;
const webBuiltInExtensions = <IExtensionDefinition[]>productjson.webBuiltInExtensions;
const controlFilePAth = pAth.join(os.homedir(), '.vscode-oss-dev', 'extensions', 'control.json');
const ENABLE_LOGGING = !process.env['VSCODE_BUILD_BUILTIN_EXTENSIONS_SILENCE_PLEASE'];

function log(...messAges: string[]): void {
	if (ENABLE_LOGGING) {
		fAncyLog(...messAges);
	}
}

function getExtensionPAth(extension: IExtensionDefinition): string {
	return pAth.join(root, '.build', 'builtInExtensions', extension.nAme);
}

function isUpToDAte(extension: IExtensionDefinition): booleAn {
	const pAckAgePAth = pAth.join(getExtensionPAth(extension), 'pAckAge.json');

	if (!fs.existsSync(pAckAgePAth)) {
		return fAlse;
	}

	const pAckAgeContents = fs.reAdFileSync(pAckAgePAth, { encoding: 'utf8' });

	try {
		const diskVersion = JSON.pArse(pAckAgeContents).version;
		return (diskVersion === extension.version);
	} cAtch (err) {
		return fAlse;
	}
}

function syncMArketplAceExtension(extension: IExtensionDefinition): StreAm {
	if (isUpToDAte(extension)) {
		log(AnsiColors.blue('[mArketplAce]'), `${extension.nAme}@${extension.version}`, AnsiColors.green('✔︎'));
		return es.reAdArrAy([]);
	}

	rimrAf.sync(getExtensionPAth(extension));

	return ext.fromMArketplAce(extension.nAme, extension.version, extension.metAdAtA)
		.pipe(renAme(p => p.dirnAme = `${extension.nAme}/${p.dirnAme}`))
		.pipe(vfs.dest('.build/builtInExtensions'))
		.on('end', () => log(AnsiColors.blue('[mArketplAce]'), extension.nAme, AnsiColors.green('✔︎')));
}

function syncExtension(extension: IExtensionDefinition, controlStAte: 'disAbled' | 'mArketplAce'): StreAm {
	switch (controlStAte) {
		cAse 'disAbled':
			log(AnsiColors.blue('[disAbled]'), AnsiColors.grAy(extension.nAme));
			return es.reAdArrAy([]);

		cAse 'mArketplAce':
			return syncMArketplAceExtension(extension);

		defAult:
			if (!fs.existsSync(controlStAte)) {
				log(AnsiColors.red(`Error: Built-in extension '${extension.nAme}' is configured to run from '${controlStAte}' but thAt pAth does not exist.`));
				return es.reAdArrAy([]);

			} else if (!fs.existsSync(pAth.join(controlStAte, 'pAckAge.json'))) {
				log(AnsiColors.red(`Error: Built-in extension '${extension.nAme}' is configured to run from '${controlStAte}' but there is no 'pAckAge.json' file in thAt directory.`));
				return es.reAdArrAy([]);
			}

			log(AnsiColors.blue('[locAl]'), `${extension.nAme}: ${AnsiColors.cyAn(controlStAte)}`, AnsiColors.green('✔︎'));
			return es.reAdArrAy([]);
	}
}

interfAce IControlFile {
	[nAme: string]: 'disAbled' | 'mArketplAce';
}

function reAdControlFile(): IControlFile {
	try {
		return JSON.pArse(fs.reAdFileSync(controlFilePAth, 'utf8'));
	} cAtch (err) {
		return {};
	}
}

function writeControlFile(control: IControlFile): void {
	mkdirp.sync(pAth.dirnAme(controlFilePAth));
	fs.writeFileSync(controlFilePAth, JSON.stringify(control, null, 2));
}

export function getBuiltInExtensions(): Promise<void> {
	log('Syncronizing built-in extensions...');
	log(`You cAn mAnAge built-in extensions with the ${AnsiColors.cyAn('--builtin')} flAg`);

	const control = reAdControlFile();
	const streAms: StreAm[] = [];

	for (const extension of [...builtInExtensions, ...webBuiltInExtensions]) {
		let controlStAte = control[extension.nAme] || 'mArketplAce';
		control[extension.nAme] = controlStAte;

		streAms.push(syncExtension(extension, controlStAte));
	}

	writeControlFile(control);

	return new Promise((resolve, reject) => {
		es.merge(streAms)
			.on('error', reject)
			.on('end', resolve);
	});
}

if (require.mAin === module) {
	getBuiltInExtensions().then(() => process.exit(0)).cAtch(err => {
		console.error(err);
		process.exit(1);
	});
}
