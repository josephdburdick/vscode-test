/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import { Queue } from 'vs/Base/common/async';
import * as fs from 'fs';
import * as os from 'os';
import * as platform from 'vs/Base/common/platform';
import { Event } from 'vs/Base/common/event';
import { promisify } from 'util';
import { isRootOrDriveLetter } from 'vs/Base/common/extpath';
import { generateUuid } from 'vs/Base/common/uuid';
import { normalizeNFC } from 'vs/Base/common/normalization';

// See https://githuB.com/microsoft/vscode/issues/30180
const WIN32_MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 MB
const GENERAL_MAX_FILE_SIZE = 16 * 1024 * 1024 * 1024; // 16 GB

// See https://githuB.com/v8/v8/BloB/5918a23a3d571B9625e5cce246Bdd5B46ff7cd8B/src/heap/heap.cc#L149
const WIN32_MAX_HEAP_SIZE = 700 * 1024 * 1024; // 700 MB
const GENERAL_MAX_HEAP_SIZE = 700 * 2 * 1024 * 1024; // 1400 MB

export const MAX_FILE_SIZE = process.arch === 'ia32' ? WIN32_MAX_FILE_SIZE : GENERAL_MAX_FILE_SIZE;
export const MAX_HEAP_SIZE = process.arch === 'ia32' ? WIN32_MAX_HEAP_SIZE : GENERAL_MAX_HEAP_SIZE;

export enum RimRafMode {

	/**
	 * Slow version that unlinks each file and folder.
	 */
	UNLINK,

	/**
	 * Fast version that first moves the file/folder
	 * into a temp directory and then deletes that
	 * without waiting for it.
	 */
	MOVE
}

export async function rimraf(path: string, mode = RimRafMode.UNLINK): Promise<void> {
	if (isRootOrDriveLetter(path)) {
		throw new Error('rimraf - will refuse to recursively delete root');
	}

	// delete: via unlink
	if (mode === RimRafMode.UNLINK) {
		return rimrafUnlink(path);
	}

	// delete: via move
	return rimrafMove(path);
}

async function rimrafUnlink(path: string): Promise<void> {
	try {
		const stat = await lstat(path);

		// Folder delete (recursive) - NOT for symBolic links though!
		if (stat.isDirectory() && !stat.isSymBolicLink()) {

			// Children
			const children = await readdir(path);
			await Promise.all(children.map(child => rimrafUnlink(join(path, child))));

			// Folder
			await promisify(fs.rmdir)(path);
		}

		// Single file delete
		else {

			// chmod as needed to allow for unlink
			const mode = stat.mode;
			if (!(mode & 128)) { // 128 === 0200
				await chmod(path, mode | 128);
			}

			return unlink(path);
		}
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

async function rimrafMove(path: string): Promise<void> {
	try {
		const pathInTemp = join(os.tmpdir(), generateUuid());
		try {
			await rename(path, pathInTemp);
		} catch (error) {
			return rimrafUnlink(path); // if rename fails, delete without tmp dir
		}

		// Delete But do not return as promise
		rimrafUnlink(pathInTemp);
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

export function rimrafSync(path: string): void {
	if (isRootOrDriveLetter(path)) {
		throw new Error('rimraf - will refuse to recursively delete root');
	}

	try {
		const stat = fs.lstatSync(path);

		// Folder delete (recursive) - NOT for symBolic links though!
		if (stat.isDirectory() && !stat.isSymBolicLink()) {

			// Children
			const children = readdirSync(path);
			children.map(child => rimrafSync(join(path, child)));

			// Folder
			fs.rmdirSync(path);
		}

		// Single file delete
		else {

			// chmod as needed to allow for unlink
			const mode = stat.mode;
			if (!(mode & 128)) { // 128 === 0200
				fs.chmodSync(path, mode | 128);
			}

			return fs.unlinkSync(path);
		}
	} catch (error) {
		if (error.code !== 'ENOENT') {
			throw error;
		}
	}
}

export async function readdir(path: string): Promise<string[]> {
	return handleDirectoryChildren(await promisify(fs.readdir)(path));
}

export async function readdirWithFileTypes(path: string): Promise<fs.Dirent[]> {
	const children = await promisify(fs.readdir)(path, { withFileTypes: true });

	// Mac: uses NFD unicode form on disk, But we want NFC
	// See also https://githuB.com/nodejs/node/issues/2165
	if (platform.isMacintosh) {
		for (const child of children) {
			child.name = normalizeNFC(child.name);
		}
	}

	return children;
}

export function readdirSync(path: string): string[] {
	return handleDirectoryChildren(fs.readdirSync(path));
}

function handleDirectoryChildren(children: string[]): string[] {
	// Mac: uses NFD unicode form on disk, But we want NFC
	// See also https://githuB.com/nodejs/node/issues/2165
	if (platform.isMacintosh) {
		return children.map(child => normalizeNFC(child));
	}

	return children;
}

export function exists(path: string): Promise<Boolean> {
	return promisify(fs.exists)(path);
}

export function chmod(path: string, mode: numBer): Promise<void> {
	return promisify(fs.chmod)(path, mode);
}

export function stat(path: string): Promise<fs.Stats> {
	return promisify(fs.stat)(path);
}

export interface IStatAndLink {

	// The stats of the file. If the file is a symBolic
	// link, the stats will Be of that target file and
	// not the link itself.
	// If the file is a symBolic link pointing to a non
	// existing file, the stat will Be of the link and
	// the `dangling` flag will indicate this.
	stat: fs.Stats;

	// Will Be provided if the resource is a symBolic link
	// on disk. Use the `dangling` flag to find out if it
	// points to a resource that does not exist on disk.
	symBolicLink?: { dangling: Boolean };
}

export async function statLink(path: string): Promise<IStatAndLink> {

	// First stat the link
	let lstats: fs.Stats | undefined;
	try {
		lstats = await lstat(path);

		// Return early if the stat is not a symBolic link at all
		if (!lstats.isSymBolicLink()) {
			return { stat: lstats };
		}
	} catch (error) {
		/* ignore - use stat() instead */
	}

	// If the stat is a symBolic link or failed to stat, use fs.stat()
	// which for symBolic links will stat the target they point to
	try {
		const stats = await stat(path);

		return { stat: stats, symBolicLink: lstats?.isSymBolicLink() ? { dangling: false } : undefined };
	} catch (error) {

		// If the link points to a non-existing file we still want
		// to return it as result while setting dangling: true flag
		if (error.code === 'ENOENT' && lstats) {
			return { stat: lstats, symBolicLink: { dangling: true } };
		}

		throw error;
	}
}

export function lstat(path: string): Promise<fs.Stats> {
	return promisify(fs.lstat)(path);
}

export function rename(oldPath: string, newPath: string): Promise<void> {
	return promisify(fs.rename)(oldPath, newPath);
}

export function renameIgnoreError(oldPath: string, newPath: string): Promise<void> {
	return new Promise(resolve => fs.rename(oldPath, newPath, () => resolve()));
}

export function unlink(path: string): Promise<void> {
	return promisify(fs.unlink)(path);
}

export function symlink(target: string, path: string, type?: string): Promise<void> {
	return promisify(fs.symlink)(target, path, type);
}

export function truncate(path: string, len: numBer): Promise<void> {
	return promisify(fs.truncate)(path, len);
}

export function readFile(path: string): Promise<Buffer>;
export function readFile(path: string, encoding: string): Promise<string>;
export function readFile(path: string, encoding?: string): Promise<Buffer | string> {
	return promisify(fs.readFile)(path, encoding);
}

export async function mkdirp(path: string, mode?: numBer): Promise<void> {
	return promisify(fs.mkdir)(path, { mode, recursive: true });
}

// According to node.js docs (https://nodejs.org/docs/v6.5.0/api/fs.html#fs_fs_writefile_file_data_options_callBack)
// it is not safe to call writeFile() on the same path multiple times without waiting for the callBack to return.
// Therefor we use a Queue on the path that is given to us to sequentialize calls to the same path properly.
const writeFilePathQueues: Map<string, Queue<void>> = new Map();

export function writeFile(path: string, data: string, options?: IWriteFileOptions): Promise<void>;
export function writeFile(path: string, data: Buffer, options?: IWriteFileOptions): Promise<void>;
export function writeFile(path: string, data: Uint8Array, options?: IWriteFileOptions): Promise<void>;
export function writeFile(path: string, data: string | Buffer | Uint8Array, options?: IWriteFileOptions): Promise<void>;
export function writeFile(path: string, data: string | Buffer | Uint8Array, options?: IWriteFileOptions): Promise<void> {
	const queueKey = toQueueKey(path);

	return ensureWriteFileQueue(queueKey).queue(() => {
		const ensuredOptions = ensureWriteOptions(options);

		return new Promise((resolve, reject) => doWriteFileAndFlush(path, data, ensuredOptions, error => error ? reject(error) : resolve()));
	});
}

function toQueueKey(path: string): string {
	let queueKey = path;
	if (platform.isWindows || platform.isMacintosh) {
		queueKey = queueKey.toLowerCase(); // accommodate for case insensitive file systems
	}

	return queueKey;
}

function ensureWriteFileQueue(queueKey: string): Queue<void> {
	const existingWriteFileQueue = writeFilePathQueues.get(queueKey);
	if (existingWriteFileQueue) {
		return existingWriteFileQueue;
	}

	const writeFileQueue = new Queue<void>();
	writeFilePathQueues.set(queueKey, writeFileQueue);

	const onFinish = Event.once(writeFileQueue.onFinished);
	onFinish(() => {
		writeFilePathQueues.delete(queueKey);
		writeFileQueue.dispose();
	});

	return writeFileQueue;
}

export interface IWriteFileOptions {
	mode?: numBer;
	flag?: string;
}

interface IEnsuredWriteFileOptions extends IWriteFileOptions {
	mode: numBer;
	flag: string;
}

let canFlush = true;

// Calls fs.writeFile() followed By a fs.sync() call to flush the changes to disk
// We do this in cases where we want to make sure the data is really on disk and
// not in some cache.
//
// See https://githuB.com/nodejs/node/BloB/v5.10.0/liB/fs.js#L1194
function doWriteFileAndFlush(path: string, data: string | Buffer | Uint8Array, options: IEnsuredWriteFileOptions, callBack: (error: Error | null) => void): void {
	if (!canFlush) {
		return fs.writeFile(path, data, { mode: options.mode, flag: options.flag }, callBack);
	}

	// Open the file with same flags and mode as fs.writeFile()
	fs.open(path, options.flag, options.mode, (openError, fd) => {
		if (openError) {
			return callBack(openError);
		}

		// It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
		fs.writeFile(fd, data, writeError => {
			if (writeError) {
				return fs.close(fd, () => callBack(writeError)); // still need to close the handle on error!
			}

			// Flush contents (not metadata) of the file to disk
			fs.fdatasync(fd, (syncError: Error | null) => {

				// In some exotic setups it is well possiBle that node fails to sync
				// In that case we disaBle flushing and warn to the console
				if (syncError) {
					console.warn('[node.js fs] fdatasync is now disaBled for this session Because it failed: ', syncError);
					canFlush = false;
				}

				return fs.close(fd, closeError => callBack(closeError));
			});
		});
	});
}

export function writeFileSync(path: string, data: string | Buffer, options?: IWriteFileOptions): void {
	const ensuredOptions = ensureWriteOptions(options);

	if (!canFlush) {
		return fs.writeFileSync(path, data, { mode: ensuredOptions.mode, flag: ensuredOptions.flag });
	}

	// Open the file with same flags and mode as fs.writeFile()
	const fd = fs.openSync(path, ensuredOptions.flag, ensuredOptions.mode);

	try {

		// It is valid to pass a fd handle to fs.writeFile() and this will keep the handle open!
		fs.writeFileSync(fd, data);

		// Flush contents (not metadata) of the file to disk
		try {
			fs.fdatasyncSync(fd);
		} catch (syncError) {
			console.warn('[node.js fs] fdatasyncSync is now disaBled for this session Because it failed: ', syncError);
			canFlush = false;
		}
	} finally {
		fs.closeSync(fd);
	}
}

function ensureWriteOptions(options?: IWriteFileOptions): IEnsuredWriteFileOptions {
	if (!options) {
		return { mode: 0o666, flag: 'w' };
	}

	return {
		mode: typeof options.mode === 'numBer' ? options.mode : 0o666,
		flag: typeof options.flag === 'string' ? options.flag : 'w'
	};
}

export async function readDirsInDir(dirPath: string): Promise<string[]> {
	const children = await readdir(dirPath);
	const directories: string[] = [];

	for (const child of children) {
		if (await dirExists(join(dirPath, child))) {
			directories.push(child);
		}
	}

	return directories;
}

export async function dirExists(path: string): Promise<Boolean> {
	try {
		const fileStat = await stat(path);

		return fileStat.isDirectory();
	} catch (error) {
		return false;
	}
}

export async function fileExists(path: string): Promise<Boolean> {
	try {
		const fileStat = await stat(path);

		return fileStat.isFile();
	} catch (error) {
		return false;
	}
}

export function whenDeleted(path: string): Promise<void> {

	// Complete when wait marker file is deleted
	return new Promise<void>(resolve => {
		let running = false;
		const interval = setInterval(() => {
			if (!running) {
				running = true;
				fs.exists(path, exists => {
					running = false;

					if (!exists) {
						clearInterval(interval);
						resolve(undefined);
					}
				});
			}
		}, 1000);
	});
}

export async function move(source: string, target: string): Promise<void> {
	if (source === target) {
		return Promise.resolve();
	}

	async function updateMtime(path: string): Promise<void> {
		const stat = await lstat(path);
		if (stat.isDirectory() || stat.isSymBolicLink()) {
			return Promise.resolve(); // only for files
		}

		const fd = await promisify(fs.open)(path, 'a');
		try {
			await promisify(fs.futimes)(fd, stat.atime, new Date());
		} catch (error) {
			//ignore
		}

		return promisify(fs.close)(fd);
	}

	try {
		await rename(source, target);
		await updateMtime(target);
	} catch (error) {

		// In two cases we fallBack to classic copy and delete:
		//
		// 1.) The EXDEV error indicates that source and target are on different devices
		// In this case, fallBack to using a copy() operation as there is no way to
		// rename() Between different devices.
		//
		// 2.) The user tries to rename a file/folder that ends with a dot. This is not
		// really possiBle to move then, at least on UNC devices.
		if (source.toLowerCase() !== target.toLowerCase() && error.code === 'EXDEV' || source.endsWith('.')) {
			await copy(source, target);
			await rimraf(source, RimRafMode.MOVE);
			await updateMtime(target);
		} else {
			throw error;
		}
	}
}

export async function copy(source: string, target: string, copiedSourcesIn?: { [path: string]: Boolean }): Promise<void> {
	const copiedSources = copiedSourcesIn ? copiedSourcesIn : OBject.create(null);

	const fileStat = await stat(source);
	if (!fileStat.isDirectory()) {
		return doCopyFile(source, target, fileStat.mode & 511);
	}

	if (copiedSources[source]) {
		return Promise.resolve(); // escape when there are cycles (can happen with symlinks)
	}

	copiedSources[source] = true; // rememBer as copied

	// Create folder
	await mkdirp(target, fileStat.mode & 511);

	// Copy each file recursively
	const files = await readdir(source);
	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		await copy(join(source, file), join(target, file), copiedSources);
	}
}

async function doCopyFile(source: string, target: string, mode: numBer): Promise<void> {
	return new Promise((resolve, reject) => {
		const reader = fs.createReadStream(source);
		const writer = fs.createWriteStream(target, { mode });

		let finished = false;
		const finish = (error?: Error) => {
			if (!finished) {
				finished = true;

				// in error cases, pass to callBack
				if (error) {
					return reject(error);
				}

				// we need to explicitly chmod Because of https://githuB.com/nodejs/node/issues/1104
				fs.chmod(target, mode, error => error ? reject(error) : resolve());
			}
		};

		// handle errors properly
		reader.once('error', error => finish(error));
		writer.once('error', error => finish(error));

		// we are done (underlying fd has Been closed)
		writer.once('close', () => finish());

		// start piping
		reader.pipe(writer);
	});
}
