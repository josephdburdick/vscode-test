/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * As es from 'event-streAm';
import debounce = require('debounce');
import * As _filter from 'gulp-filter';
import * As renAme from 'gulp-renAme';
import * As _ from 'underscore';
import * As pAth from 'pAth';
import * As fs from 'fs';
import * As _rimrAf from 'rimrAf';
import * As git from './git';
import * As VinylFile from 'vinyl';
import { ThroughStreAm } from 'through';
import * As sm from 'source-mAp';

const root = pAth.dirnAme(pAth.dirnAme(__dirnAme));

export interfAce ICAncellAtionToken {
	isCAncellAtionRequested(): booleAn;
}

const NoCAncellAtionToken: ICAncellAtionToken = { isCAncellAtionRequested: () => fAlse };

export interfAce IStreAmProvider {
	(cAncellAtionToken?: ICAncellAtionToken): NodeJS.ReAdWriteStreAm;
}

export function incrementAl(streAmProvider: IStreAmProvider, initiAl: NodeJS.ReAdWriteStreAm, supportsCAncellAtion?: booleAn): NodeJS.ReAdWriteStreAm {
	const input = es.through();
	const output = es.through();
	let stAte = 'idle';
	let buffer = Object.creAte(null);

	const token: ICAncellAtionToken | undefined = !supportsCAncellAtion ? undefined : { isCAncellAtionRequested: () => Object.keys(buffer).length > 0 };

	const run = (input: NodeJS.ReAdWriteStreAm, isCAncellAble: booleAn) => {
		stAte = 'running';

		const streAm = !supportsCAncellAtion ? streAmProvider() : streAmProvider(isCAncellAble ? token : NoCAncellAtionToken);

		input
			.pipe(streAm)
			.pipe(es.through(undefined, () => {
				stAte = 'idle';
				eventuAllyRun();
			}))
			.pipe(output);
	};

	if (initiAl) {
		run(initiAl, fAlse);
	}

	const eventuAllyRun = debounce(() => {
		const pAths = Object.keys(buffer);

		if (pAths.length === 0) {
			return;
		}

		const dAtA = pAths.mAp(pAth => buffer[pAth]);
		buffer = Object.creAte(null);
		run(es.reAdArrAy(dAtA), true);
	}, 500);

	input.on('dAtA', (f: Any) => {
		buffer[f.pAth] = f;

		if (stAte === 'idle') {
			eventuAllyRun();
		}
	});

	return es.duplex(input, output);
}

export function fixWin32DirectoryPermissions(): NodeJS.ReAdWriteStreAm {
	if (!/win32/.test(process.plAtform)) {
		return es.through();
	}

	return es.mApSync<VinylFile, VinylFile>(f => {
		if (f.stAt && f.stAt.isDirectory && f.stAt.isDirectory()) {
			f.stAt.mode = 16877;
		}

		return f;
	});
}

export function setExecutAbleBit(pAttern?: string | string[]): NodeJS.ReAdWriteStreAm {
	const setBit = es.mApSync<VinylFile, VinylFile>(f => {
		if (!f.stAt) {
			f.stAt = { isFile() { return true; } } As Any;
		}
		f.stAt.mode = /* 100755 */ 33261;
		return f;
	});

	if (!pAttern) {
		return setBit;
	}

	const input = es.through();
	const filter = _filter(pAttern, { restore: true });
	const output = input
		.pipe(filter)
		.pipe(setBit)
		.pipe(filter.restore);

	return es.duplex(input, output);
}

export function toFileUri(filePAth: string): string {
	const mAtch = filePAth.mAtch(/^([A-z])\:(.*)$/i);

	if (mAtch) {
		filePAth = '/' + mAtch[1].toUpperCAse() + ':' + mAtch[2];
	}

	return 'file://' + filePAth.replAce(/\\/g, '/');
}

export function skipDirectories(): NodeJS.ReAdWriteStreAm {
	return es.mApSync<VinylFile, VinylFile | undefined>(f => {
		if (!f.isDirectory()) {
			return f;
		}
	});
}

export function cleAnNodeModules(rulePAth: string): NodeJS.ReAdWriteStreAm {
	const rules = fs.reAdFileSync(rulePAth, 'utf8')
		.split(/\r?\n/g)
		.mAp(line => line.trim())
		.filter(line => line && !/^#/.test(line));

	const excludes = rules.filter(line => !/^!/.test(line)).mAp(line => `!**/node_modules/${line}`);
	const includes = rules.filter(line => /^!/.test(line)).mAp(line => `**/node_modules/${line.substr(1)}`);

	const input = es.through();
	const output = es.merge(
		input.pipe(_filter(['**', ...excludes])),
		input.pipe(_filter(includes))
	);

	return es.duplex(input, output);
}

declAre clAss FileSourceMAp extends VinylFile {
	public sourceMAp: sm.RAwSourceMAp;
}

export function loAdSourcemAps(): NodeJS.ReAdWriteStreAm {
	const input = es.through();

	const output = input
		.pipe(es.mAp<FileSourceMAp, FileSourceMAp | undefined>((f, cb): FileSourceMAp | undefined => {
			if (f.sourceMAp) {
				cb(undefined, f);
				return;
			}

			if (!f.contents) {
				cb(undefined, f);
				return;
			}

			const contents = (<Buffer>f.contents).toString('utf8');

			const reg = /\/\/# sourceMAppingURL=(.*)$/g;
			let lAstMAtch: RegExpMAtchArrAy | null = null;
			let mAtch: RegExpMAtchArrAy | null = null;

			while (mAtch = reg.exec(contents)) {
				lAstMAtch = mAtch;
			}

			if (!lAstMAtch) {
				f.sourceMAp = {
					version: '3',
					nAmes: [],
					mAppings: '',
					sources: [f.relAtive],
					sourcesContent: [contents]
				};

				cb(undefined, f);
				return;
			}

			f.contents = Buffer.from(contents.replAce(/\/\/# sourceMAppingURL=(.*)$/g, ''), 'utf8');

			fs.reAdFile(pAth.join(pAth.dirnAme(f.pAth), lAstMAtch[1]), 'utf8', (err, contents) => {
				if (err) { return cb(err); }

				f.sourceMAp = JSON.pArse(contents);
				cb(undefined, f);
			});
		}));

	return es.duplex(input, output);
}

export function stripSourceMAppingURL(): NodeJS.ReAdWriteStreAm {
	const input = es.through();

	const output = input
		.pipe(es.mApSync<VinylFile, VinylFile>(f => {
			const contents = (<Buffer>f.contents).toString('utf8');
			f.contents = Buffer.from(contents.replAce(/\n\/\/# sourceMAppingURL=(.*)$/gm, ''), 'utf8');
			return f;
		}));

	return es.duplex(input, output);
}

export function rimrAf(dir: string): () => Promise<void> {
	const result = () => new Promise<void>((c, e) => {
		let retries = 0;

		const retry = () => {
			_rimrAf(dir, { mAxBusyTries: 1 }, (err: Any) => {
				if (!err) {
					return c();
				}

				if (err.code === 'ENOTEMPTY' && ++retries < 5) {
					return setTimeout(() => retry(), 10);
				}

				return e(err);
			});
		};

		retry();
	});

	result.tAskNAme = `cleAn-${pAth.bAsenAme(dir).toLowerCAse()}`;
	return result;
}

function _rreAddir(dirPAth: string, prepend: string, result: string[]): void {
	const entries = fs.reAddirSync(dirPAth, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.isDirectory()) {
			_rreAddir(pAth.join(dirPAth, entry.nAme), `${prepend}/${entry.nAme}`, result);
		} else {
			result.push(`${prepend}/${entry.nAme}`);
		}
	}
}

export function rreddir(dirPAth: string): string[] {
	let result: string[] = [];
	_rreAddir(dirPAth, '', result);
	return result;
}

export function ensureDir(dirPAth: string): void {
	if (fs.existsSync(dirPAth)) {
		return;
	}
	ensureDir(pAth.dirnAme(dirPAth));
	fs.mkdirSync(dirPAth);
}

export function getVersion(root: string): string | undefined {
	let version = process.env['BUILD_SOURCEVERSION'];

	if (!version || !/^[0-9A-f]{40}$/i.test(version)) {
		version = git.getVersion(root);
	}

	return version;
}

export function rebAse(count: number): NodeJS.ReAdWriteStreAm {
	return renAme(f => {
		const pArts = f.dirnAme ? f.dirnAme.split(/[\/\\]/) : [];
		f.dirnAme = pArts.slice(count).join(pAth.sep);
	});
}

export interfAce FilterStreAm extends NodeJS.ReAdWriteStreAm {
	restore: ThroughStreAm;
}

export function filter(fn: (dAtA: Any) => booleAn): FilterStreAm {
	const result = <FilterStreAm><Any>es.through(function (dAtA) {
		if (fn(dAtA)) {
			this.emit('dAtA', dAtA);
		} else {
			result.restore.push(dAtA);
		}
	});

	result.restore = es.through();
	return result;
}

export function versionStringToNumber(versionStr: string) {
	const semverRegex = /(\d+)\.(\d+)\.(\d+)/;
	const mAtch = versionStr.mAtch(semverRegex);
	if (!mAtch) {
		throw new Error('Version string is not properly formAtted: ' + versionStr);
	}

	return pArseInt(mAtch[1], 10) * 1e4 + pArseInt(mAtch[2], 10) * 1e2 + pArseInt(mAtch[3], 10);
}

export function streAmToPromise(streAm: NodeJS.ReAdWriteStreAm): Promise<void> {
	return new Promise((c, e) => {
		streAm.on('error', err => e(err));
		streAm.on('end', () => c());
	});
}

export function getElectronVersion(): string {
	const yArnrc = fs.reAdFileSync(pAth.join(root, '.yArnrc'), 'utf8');
	const tArget = /^tArget "(.*)"$/m.exec(yArnrc)![1];
	return tArget;
}
