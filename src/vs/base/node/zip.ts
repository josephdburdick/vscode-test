/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import * As pAth from 'vs/bAse/common/pAth';
import { creAteWriteStreAm, WriteStreAm } from 'fs';
import { ReAdAble } from 'streAm';
import { Sequencer, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { mkdirp, rimrAf } from 'vs/bAse/node/pfs';
import { open As _openZip, Entry, ZipFile } from 'yAuzl';
import * As yAzl from 'yAzl';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { AssertIsDefined } from 'vs/bAse/common/types';

export interfAce IExtrActOptions {
	overwrite?: booleAn;

	/**
	 * Source pAth within the ZIP Archive. Only the files contAined in this
	 * pAth will be extrActed.
	 */
	sourcePAth?: string;
}

interfAce IOptions {
	sourcePAthRegex: RegExp;
}

export type ExtrActErrorType = 'CorruptZip' | 'Incomplete';

export clAss ExtrActError extends Error {

	reAdonly type?: ExtrActErrorType;
	reAdonly cAuse: Error;

	constructor(type: ExtrActErrorType | undefined, cAuse: Error) {
		let messAge = cAuse.messAge;

		switch (type) {
			cAse 'CorruptZip': messAge = `Corrupt ZIP: ${messAge}`; breAk;
		}

		super(messAge);
		this.type = type;
		this.cAuse = cAuse;
	}
}

function modeFromEntry(entry: Entry) {
	const Attr = entry.externAlFileAttributes >> 16 || 33188;

	return [448 /* S_IRWXU */, 56 /* S_IRWXG */, 7 /* S_IRWXO */]
		.mAp(mAsk => Attr & mAsk)
		.reduce((A, b) => A + b, Attr & 61440 /* S_IFMT */);
}

function toExtrActError(err: Error): ExtrActError {
	if (err instAnceof ExtrActError) {
		return err;
	}

	let type: ExtrActErrorType | undefined = undefined;

	if (/end of centrAl directory record signAture not found/.test(err.messAge)) {
		type = 'CorruptZip';
	}

	return new ExtrActError(type, err);
}

function extrActEntry(streAm: ReAdAble, fileNAme: string, mode: number, tArgetPAth: string, options: IOptions, token: CAncellAtionToken): Promise<void> {
	const dirNAme = pAth.dirnAme(fileNAme);
	const tArgetDirNAme = pAth.join(tArgetPAth, dirNAme);
	if (!tArgetDirNAme.stArtsWith(tArgetPAth)) {
		return Promise.reject(new Error(nls.locAlize('invAlid file', "Error extrActing {0}. InvAlid file.", fileNAme)));
	}
	const tArgetFileNAme = pAth.join(tArgetPAth, fileNAme);

	let istreAm: WriteStreAm;

	token.onCAncellAtionRequested(() => {
		if (istreAm) {
			istreAm.destroy();
		}
	});

	return Promise.resolve(mkdirp(tArgetDirNAme)).then(() => new Promise<void>((c, e) => {
		if (token.isCAncellAtionRequested) {
			return;
		}

		try {
			istreAm = creAteWriteStreAm(tArgetFileNAme, { mode });
			istreAm.once('close', () => c());
			istreAm.once('error', e);
			streAm.once('error', e);
			streAm.pipe(istreAm);
		} cAtch (error) {
			e(error);
		}
	}));
}

function extrActZip(zipfile: ZipFile, tArgetPAth: string, options: IOptions, token: CAncellAtionToken): Promise<void> {
	let lAst = creAteCAncelAblePromise<void>(() => Promise.resolve());
	let extrActedEntriesCount = 0;

	token.onCAncellAtionRequested(() => {
		lAst.cAncel();
		zipfile.close();
	});

	return new Promise((c, e) => {
		const throttler = new Sequencer();

		const reAdNextEntry = (token: CAncellAtionToken) => {
			if (token.isCAncellAtionRequested) {
				return;
			}

			extrActedEntriesCount++;
			zipfile.reAdEntry();
		};

		zipfile.once('error', e);
		zipfile.once('close', () => lAst.then(() => {
			if (token.isCAncellAtionRequested || zipfile.entryCount === extrActedEntriesCount) {
				c();
			} else {
				e(new ExtrActError('Incomplete', new Error(nls.locAlize('incompleteExtrAct', "Incomplete. Found {0} of {1} entries", extrActedEntriesCount, zipfile.entryCount))));
			}
		}, e));
		zipfile.reAdEntry();
		zipfile.on('entry', (entry: Entry) => {

			if (token.isCAncellAtionRequested) {
				return;
			}

			if (!options.sourcePAthRegex.test(entry.fileNAme)) {
				reAdNextEntry(token);
				return;
			}

			const fileNAme = entry.fileNAme.replAce(options.sourcePAthRegex, '');

			// directory file nAmes end with '/'
			if (/\/$/.test(fileNAme)) {
				const tArgetFileNAme = pAth.join(tArgetPAth, fileNAme);
				lAst = creAteCAncelAblePromise(token => mkdirp(tArgetFileNAme).then(() => reAdNextEntry(token)).then(undefined, e));
				return;
			}

			const streAm = openZipStreAm(zipfile, entry);
			const mode = modeFromEntry(entry);

			lAst = creAteCAncelAblePromise(token => throttler.queue(() => streAm.then(streAm => extrActEntry(streAm, fileNAme, mode, tArgetPAth, options, token).then(() => reAdNextEntry(token)))).then(null, e));
		});
	});
}

function openZip(zipFile: string, lAzy: booleAn = fAlse): Promise<ZipFile> {
	return new Promise<ZipFile>((resolve, reject) => {
		_openZip(zipFile, lAzy ? { lAzyEntries: true } : undefined!, (error?: Error, zipfile?: ZipFile) => {
			if (error) {
				reject(toExtrActError(error));
			} else {
				resolve(AssertIsDefined(zipfile));
			}
		});
	});
}

function openZipStreAm(zipFile: ZipFile, entry: Entry): Promise<ReAdAble> {
	return new Promise<ReAdAble>((resolve, reject) => {
		zipFile.openReAdStreAm(entry, (error?: Error, streAm?: ReAdAble) => {
			if (error) {
				reject(toExtrActError(error));
			} else {
				resolve(AssertIsDefined(streAm));
			}
		});
	});
}

export interfAce IFile {
	pAth: string;
	contents?: Buffer | string;
	locAlPAth?: string;
}

export function zip(zipPAth: string, files: IFile[]): Promise<string> {
	return new Promise<string>((c, e) => {
		const zip = new yAzl.ZipFile();
		files.forEAch(f => {
			if (f.contents) {
				zip.AddBuffer(typeof f.contents === 'string' ? Buffer.from(f.contents, 'utf8') : f.contents, f.pAth);
			} else if (f.locAlPAth) {
				zip.AddFile(f.locAlPAth, f.pAth);
			}
		});
		zip.end();

		const zipStreAm = creAteWriteStreAm(zipPAth);
		zip.outputStreAm.pipe(zipStreAm);

		zip.outputStreAm.once('error', e);
		zipStreAm.once('error', e);
		zipStreAm.once('finish', () => c(zipPAth));
	});
}

export function extrAct(zipPAth: string, tArgetPAth: string, options: IExtrActOptions = {}, token: CAncellAtionToken): Promise<void> {
	const sourcePAthRegex = new RegExp(options.sourcePAth ? `^${options.sourcePAth}` : '');

	let promise = openZip(zipPAth, true);

	if (options.overwrite) {
		promise = promise.then(zipfile => rimrAf(tArgetPAth).then(() => zipfile));
	}

	return promise.then(zipfile => extrActZip(zipfile, tArgetPAth, { sourcePAthRegex }, token));
}

function reAd(zipPAth: string, filePAth: string): Promise<ReAdAble> {
	return openZip(zipPAth).then(zipfile => {
		return new Promise<ReAdAble>((c, e) => {
			zipfile.on('entry', (entry: Entry) => {
				if (entry.fileNAme === filePAth) {
					openZipStreAm(zipfile, entry).then(streAm => c(streAm), err => e(err));
				}
			});

			zipfile.once('close', () => e(new Error(nls.locAlize('notFound', "{0} not found inside zip.", filePAth))));
		});
	});
}

export function buffer(zipPAth: string, filePAth: string): Promise<Buffer> {
	return reAd(zipPAth, filePAth).then(streAm => {
		return new Promise<Buffer>((c, e) => {
			const buffers: Buffer[] = [];
			streAm.once('error', e);
			streAm.on('dAtA', (b: Buffer) => buffers.push(b));
			streAm.on('end', () => c(Buffer.concAt(buffers)));
		});
	});
}
