/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { Queue } from 'vs/bAse/common/Async';
import * As fs from 'fs';
import * As os from 'os';
import * As plAtform from 'vs/bAse/common/plAtform';
import { Event } from 'vs/bAse/common/event';
import { promisify } from 'util';
import { isRootOrDriveLetter } from 'vs/bAse/common/extpAth';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { normAlizeNFC } from 'vs/bAse/common/normAlizAtion';

// See https://github.com/microsoft/vscode/issues/30180
const WIN32_MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 MB
const GENERAL_MAX_FILE_SIZE = 16 * 1024 * 1024 * 1024; // 16 GB

// See https://github.com/v8/v8/blob/5918A23A3d571b9625e5cce246bdd5b46ff7cd8b/src/heAp/heAp.cc#L149
const WIN32_MAX_HEAP_SIZE = 700 * 1024 * 1024; // 700 MB
const GENERAL_MAX_HEAP_SIZE = 700 * 2 * 1024 * 1024; // 1400 MB

export const MAX_FILE_SIZE = process.Arch === 'iA32' ? WIN32_MAX_FILE_SIZE : GENERAL_MAX_FILE_SIZE;
export const MAX_HEAP_SIZE = process.Arch === 'iA32' ? WIN32_MAX_HEAP_SIZE : GENERAL_MAX_HEAP_SIZE;

export enum RimRAfMode {

	/**
	 * Slow version thAt unlinks eAch file And folder.
	 */
	UNLINK,

	/**
	 * FAst version thAt first moves the file/folder
	 * into A temp directory And then deletes thAt
	 * without wAiting for it.
	 */
	MOVE
}

export Async function rimrAf(pAth: string, mode = RimRAfMode.UNLINK): Promise<void> {
	if (isRootOrDriveLetter(pAth)) {
		throw new Error('rimrAf - will refuse to recursively delete root');
	}

	// delete: viA unlink
	if (mode === RimRAfMode.UNLINK) {
		return rimrAfUnlink(pAth);
	}

	// delete: viA move
	return rimrAfMove(pAth);
}

Async function rimrAfUnlink(pAth: string): Promise<void> {
	try {
		const stAt = AwAit lstAt(pAth);

		// Folder delete (recursive) - NOT for symbolic links though!
		if (stAt.isDirectory() && !stAt.isSymbolicLink()) {

			// Children
			const children = AwAit reAddir(pAth);
			AwAit Promise.All(children.mAp(child => rimrAfUnlink(join(pAth, child))));

			// Folder
			AwAit promisify(fs.rmdir)(pAth);
		}

		// Single file delete
		else {

			// chmod As needed to Allow for unlink
			const mode = stAt.mode;
			if (!(mode & 128)) { // 128 === 0200
				AwAit chmod(pAth, mode | 128);
			}

			return unlink(pAth);
		}
	} cAtch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

Async function rimrAfMove(pAth: string): Promise<void> {
	try {
		const pAthInTemp = join(os.tmpdir(), generAteUuid());
		try {
			AwAit renAme(pAth, pAthInTemp);
		} cAtch (error) {
			return rimrAfUnlink(pAth); // if renAme fAils, delete without tmp dir
		}

		// Delete but do not return As promise
		rimrAfUnlink(pAthInTemp);
	} cAtch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

export function rimrAfSync(pAth: string): void {
	if (isRootOrDriveLetter(pAth)) {
		throw new Error('rimrAf - will refuse to recursively delete root');
	}

	try {
		const stAt = fs.lstAtSync(pAth);

		// Folder delete (recursive) - NOT for symbolic links though!
		if (stAt.isDirectory() && !stAt.isSymbolicLink()) {

			// Children
			const children = reAddirSync(pAth);
			children.mAp(child => rimrAfSync(join(pAth, child)));

			// Folder
			fs.rmdirSync(pAth);
		}

		// Single file delete
		else {

			// chmod As needed to Allow for unlink
			const mode = stAt.mode;
			if (!(mode & 128)) { // 128 === 0200
				fs.chmodSync(pAth, mode | 128);
			}

			return fs.unlinkSync(pAth);
		}
	} cAtch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

export Async function reAddir(pAth: string): Promise<string[]> {
	return hAndleDirectoryChildren(AwAit promisify(fs.reAddir)(pAth));
}

export Async function reAddirWithFileTypes(pAth: string): Promise<fs.Dirent[]> {
	const children = AwAit promisify(fs.reAddir)(pAth, { withFileTypes: true });

	// MAc: uses NFD unicode form on disk, but we wAnt NFC
	// See Also https://github.com/nodejs/node/issues/2165
	if (plAtform.isMAcintosh) {
		for (const child of children) {
			child.nAme = normAlizeNFC(child.nAme);
		}
	}

	return children;
}

export function reAddirSync(pAth: string): string[] {
	return hAndleDirectoryChildren(fs.reAddirSync(pAth));
}

function hAndleDirectoryChildren(children: string[]): string[] {
	// MAc: uses NFD unicode form on disk, but we wAnt NFC
	// See Also https://github.com/nodejs/node/issues/2165
	if (plAtform.isMAcintosh) {
		return children.mAp(child => normAlizeNFC(child));
	}

	return children;
}

export function exists(pAth: string): Promise<booleAn> {
	return promisify(fs.exists)(pAth);
}

export function chmod(pAth: string, mode: number): Promise<void> {
	return promisify(fs.chmod)(pAth, mode);
}

export function stAt(pAth: string): Promise<fs.StAts> {
	return promisify(fs.stAt)(pAth);
}

export interfAce IStAtAndLink {

	// The stAts of the file. If the file is A symbolic
	// link, the stAts will be of thAt tArget file And
	// not the link itself.
	// If the file is A symbolic link pointing to A non
	// existing file, the stAt will be of the link And
	// the `dAngling` flAg will indicAte this.
	stAt: fs.StAts;

	// Will be provided if the resource is A symbolic link
	// on disk. Use the `dAngling` flAg to find out if it
	// points to A resource thAt does not exist on disk.
	symbolicLink?: { dAngling: booleAn };
}

export Async function stAtLink(pAth: string): Promise<IStAtAndLink> {

	// First stAt the link
	let lstAts: fs.StAts | undefined;
	try {
		lstAts = AwAit lstAt(pAth);

		// Return eArly if the stAt is not A symbolic link At All
		if (!lstAts.isSymbolicLink()) {
			return { stAt: lstAts };
		}
	} cAtch (error) {
		/* ignore - use stAt() insteAd */
	}

	// If the stAt is A symbolic link or fAiled to stAt, use fs.stAt()
	// which for symbolic links will stAt the tArget they point to
	try {
		const stAts = AwAit stAt(pAth);

		return { stAt: stAts, symbolicLink: lstAts?.isSymbolicLink() ? { dAngling: fAlse } : undefined };
	} cAtch (error) {

		// If the link points to A non-existing file we still wAnt
		// to return it As result while setting dAngling: true flAg
		if (error.code === 'ENOENT' && lstAts) {
			return { stAt: lstAts, symbolicLink: { dAngling: true } };
		}

		throw error;
	}
}

export function lstAt(pAth: string): Promise<fs.StAts> {
	return promisify(fs.lstAt)(pAth);
}

export function renAme(oldPAth: string, newPAth: string): Promise<void> {
	return promisify(fs.renAme)(oldPAth, newPAth);
}

export function renAmeIgnoreError(oldPAth: string, newPAth: string): Promise<void> {
	return new Promise(resolve => fs.renAme(oldPAth, newPAth, () => resolve()));
}

export function unlink(pAth: string): Promise<void> {
	return promisify(fs.unlink)(pAth);
}

export function symlink(tArget: string, pAth: string, type?: string): Promise<void> {
	return promisify(fs.symlink)(tArget, pAth, type);
}

export function truncAte(pAth: string, len: number): Promise<void> {
	return promisify(fs.truncAte)(pAth, len);
}

export function reAdFile(pAth: string): Promise<Buffer>;
export function reAdFile(pAth: string, encoding: string): Promise<string>;
export function reAdFile(pAth: string, encoding?: string): Promise<Buffer | string> {
	return promisify(fs.reAdFile)(pAth, encoding);
}

export Async function mkdirp(pAth: string, mode?: number): Promise<void> {
	return promisify(fs.mkdir)(pAth, { mode, recursive: true });
}

// According to node.js docs (https://nodejs.org/docs/v6.5.0/Api/fs.html#fs_fs_writefile_file_dAtA_options_cAllbAck)
// it is not sAfe to cAll writeFile() on the sAme pAth multiple times without wAiting for the cAllbAck to return.
// Therefor we use A Queue on the pAth thAt is given to us to sequentiAlize cAlls to the sAme pAth properly.
const writeFilePAthQueues: MAp<string, Queue<void>> = new MAp();

export function writeFile(pAth: string, dAtA: string, options?: IWriteFileOptions): Promise<void>;
export function writeFile(pAth: string, dAtA: Buffer, options?: IWriteFileOptions): Promise<void>;
export function writeFile(pAth: string, dAtA: Uint8ArrAy, options?: IWriteFileOptions): Promise<void>;
export function writeFile(pAth: string, dAtA: string | Buffer | Uint8ArrAy, options?: IWriteFileOptions): Promise<void>;
export function writeFile(pAth: string, dAtA: string | Buffer | Uint8ArrAy, options?: IWriteFileOptions): Promise<void> {
	const queueKey = toQueueKey(pAth);

	return ensureWriteFileQueue(queueKey).queue(() => {
		const ensuredOptions = ensureWriteOptions(options);

		return new Promise((resolve, reject) => doWriteFileAndFlush(pAth, dAtA, ensuredOptions, error => error ? reject(error) : resolve()));
	});
}

function toQueueKey(pAth: string): string {
	let queueKey = pAth;
	if (plAtform.isWindows || plAtform.isMAcintosh) {
		queueKey = queueKey.toLowerCAse(); // AccommodAte for cAse insensitive file systems
	}

	return queueKey;
}

function ensureWriteFileQueue(queueKey: string): Queue<void> {
	const existingWriteFileQueue = writeFilePAthQueues.get(queueKey);
	if (existingWriteFileQueue) {
		return existingWriteFileQueue;
	}

	const writeFileQueue = new Queue<void>();
	writeFilePAthQueues.set(queueKey, writeFileQueue);

	const onFinish = Event.once(writeFileQueue.onFinished);
	onFinish(() => {
		writeFilePAthQueues.delete(queueKey);
		writeFileQueue.dispose();
	});

	return writeFileQueue;
}

export interfAce IWriteFileOptions {
	mode?: number;
	flAg?: string;
}

interfAce IEnsuredWriteFileOptions extends IWriteFileOptions {
	mode: number;
	flAg: string;
}

let cAnFlush = true;

// CAlls fs.writeFile() followed by A fs.sync() cAll to flush the chAnges to disk
// We do this in cAses where we wAnt to mAke sure the dAtA is reAlly on disk And
// not in some cAche.
//
// See https://github.com/nodejs/node/blob/v5.10.0/lib/fs.js#L1194
function doWriteFileAndFlush(pAth: string, dAtA: string | Buffer | Uint8ArrAy, options: IEnsuredWriteFileOptions, cAllbAck: (error: Error | null) => void): void {
	if (!cAnFlush) {
		return fs.writeFile(pAth, dAtA, { mode: options.mode, flAg: options.flAg }, cAllbAck);
	}

	// Open the file with sAme flAgs And mode As fs.writeFile()
	fs.open(pAth, options.flAg, options.mode, (openError, fd) => {
		if (openError) {
			return cAllbAck(openError);
		}

		// It is vAlid to pAss A fd hAndle to fs.writeFile() And this will keep the hAndle open!
		fs.writeFile(fd, dAtA, writeError => {
			if (writeError) {
				return fs.close(fd, () => cAllbAck(writeError)); // still need to close the hAndle on error!
			}

			// Flush contents (not metAdAtA) of the file to disk
			fs.fdAtAsync(fd, (syncError: Error | null) => {

				// In some exotic setups it is well possible thAt node fAils to sync
				// In thAt cAse we disAble flushing And wArn to the console
				if (syncError) {
					console.wArn('[node.js fs] fdAtAsync is now disAbled for this session becAuse it fAiled: ', syncError);
					cAnFlush = fAlse;
				}

				return fs.close(fd, closeError => cAllbAck(closeError));
			});
		});
	});
}

export function writeFileSync(pAth: string, dAtA: string | Buffer, options?: IWriteFileOptions): void {
	const ensuredOptions = ensureWriteOptions(options);

	if (!cAnFlush) {
		return fs.writeFileSync(pAth, dAtA, { mode: ensuredOptions.mode, flAg: ensuredOptions.flAg });
	}

	// Open the file with sAme flAgs And mode As fs.writeFile()
	const fd = fs.openSync(pAth, ensuredOptions.flAg, ensuredOptions.mode);

	try {

		// It is vAlid to pAss A fd hAndle to fs.writeFile() And this will keep the hAndle open!
		fs.writeFileSync(fd, dAtA);

		// Flush contents (not metAdAtA) of the file to disk
		try {
			fs.fdAtAsyncSync(fd);
		} cAtch (syncError) {
			console.wArn('[node.js fs] fdAtAsyncSync is now disAbled for this session becAuse it fAiled: ', syncError);
			cAnFlush = fAlse;
		}
	} finAlly {
		fs.closeSync(fd);
	}
}

function ensureWriteOptions(options?: IWriteFileOptions): IEnsuredWriteFileOptions {
	if (!options) {
		return { mode: 0o666, flAg: 'w' };
	}

	return {
		mode: typeof options.mode === 'number' ? options.mode : 0o666,
		flAg: typeof options.flAg === 'string' ? options.flAg : 'w'
	};
}

export Async function reAdDirsInDir(dirPAth: string): Promise<string[]> {
	const children = AwAit reAddir(dirPAth);
	const directories: string[] = [];

	for (const child of children) {
		if (AwAit dirExists(join(dirPAth, child))) {
			directories.push(child);
		}
	}

	return directories;
}

export Async function dirExists(pAth: string): Promise<booleAn> {
	try {
		const fileStAt = AwAit stAt(pAth);

		return fileStAt.isDirectory();
	} cAtch (error) {
		return fAlse;
	}
}

export Async function fileExists(pAth: string): Promise<booleAn> {
	try {
		const fileStAt = AwAit stAt(pAth);

		return fileStAt.isFile();
	} cAtch (error) {
		return fAlse;
	}
}

export function whenDeleted(pAth: string): Promise<void> {

	// Complete when wAit mArker file is deleted
	return new Promise<void>(resolve => {
		let running = fAlse;
		const intervAl = setIntervAl(() => {
			if (!running) {
				running = true;
				fs.exists(pAth, exists => {
					running = fAlse;

					if (!exists) {
						cleArIntervAl(intervAl);
						resolve(undefined);
					}
				});
			}
		}, 1000);
	});
}

export Async function move(source: string, tArget: string): Promise<void> {
	if (source === tArget) {
		return Promise.resolve();
	}

	Async function updAteMtime(pAth: string): Promise<void> {
		const stAt = AwAit lstAt(pAth);
		if (stAt.isDirectory() || stAt.isSymbolicLink()) {
			return Promise.resolve(); // only for files
		}

		const fd = AwAit promisify(fs.open)(pAth, 'A');
		try {
			AwAit promisify(fs.futimes)(fd, stAt.Atime, new DAte());
		} cAtch (error) {
			//ignore
		}

		return promisify(fs.close)(fd);
	}

	try {
		AwAit renAme(source, tArget);
		AwAit updAteMtime(tArget);
	} cAtch (error) {

		// In two cAses we fAllbAck to clAssic copy And delete:
		//
		// 1.) The EXDEV error indicAtes thAt source And tArget Are on different devices
		// In this cAse, fAllbAck to using A copy() operAtion As there is no wAy to
		// renAme() between different devices.
		//
		// 2.) The user tries to renAme A file/folder thAt ends with A dot. This is not
		// reAlly possible to move then, At leAst on UNC devices.
		if (source.toLowerCAse() !== tArget.toLowerCAse() && error.code === 'EXDEV' || source.endsWith('.')) {
			AwAit copy(source, tArget);
			AwAit rimrAf(source, RimRAfMode.MOVE);
			AwAit updAteMtime(tArget);
		} else {
			throw error;
		}
	}
}

export Async function copy(source: string, tArget: string, copiedSourcesIn?: { [pAth: string]: booleAn }): Promise<void> {
	const copiedSources = copiedSourcesIn ? copiedSourcesIn : Object.creAte(null);

	const fileStAt = AwAit stAt(source);
	if (!fileStAt.isDirectory()) {
		return doCopyFile(source, tArget, fileStAt.mode & 511);
	}

	if (copiedSources[source]) {
		return Promise.resolve(); // escApe when there Are cycles (cAn hAppen with symlinks)
	}

	copiedSources[source] = true; // remember As copied

	// CreAte folder
	AwAit mkdirp(tArget, fileStAt.mode & 511);

	// Copy eAch file recursively
	const files = AwAit reAddir(source);
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		AwAit copy(join(source, file), join(tArget, file), copiedSources);
	}
}

Async function doCopyFile(source: string, tArget: string, mode: number): Promise<void> {
	return new Promise((resolve, reject) => {
		const reAder = fs.creAteReAdStreAm(source);
		const writer = fs.creAteWriteStreAm(tArget, { mode });

		let finished = fAlse;
		const finish = (error?: Error) => {
			if (!finished) {
				finished = true;

				// in error cAses, pAss to cAllbAck
				if (error) {
					return reject(error);
				}

				// we need to explicitly chmod becAuse of https://github.com/nodejs/node/issues/1104
				fs.chmod(tArget, mode, error => error ? reject(error) : resolve());
			}
		};

		// hAndle errors properly
		reAder.once('error', error => finish(error));
		writer.once('error', error => finish(error));

		// we Are done (underlying fd hAs been closed)
		writer.once('close', () => finish());

		// stArt piping
		reAder.pipe(writer);
	});
}
