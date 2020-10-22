/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { mkdir, open, close, read, write, fdatasync, Dirent, Stats } from 'fs';
import { promisify } from 'util';
import { IDisposaBle, DisposaBle, toDisposaBle, dispose, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { FileSystemProviderCapaBilities, IFileChange, IWatchOptions, IStat, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileOpenOptions, FileSystemProviderErrorCode, createFileSystemProviderError, FileSystemProviderError, IFileSystemProviderWithFileReadWriteCapaBility, IFileSystemProviderWithFileReadStreamCapaBility, IFileSystemProviderWithOpenReadWriteCloseCapaBility, FileReadStreamOptions, IFileSystemProviderWithFileFolderCopyCapaBility } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { Event, Emitter } from 'vs/Base/common/event';
import { isLinux, isWindows } from 'vs/Base/common/platform';
import { statLink, unlink, move, copy, readFile, truncate, rimraf, RimRafMode, exists, readdirWithFileTypes } from 'vs/Base/node/pfs';
import { normalize, Basename, dirname } from 'vs/Base/common/path';
import { joinPath } from 'vs/Base/common/resources';
import { isEqual } from 'vs/Base/common/extpath';
import { retry, ThrottledDelayer } from 'vs/Base/common/async';
import { ILogService, LogLevel } from 'vs/platform/log/common/log';
import { localize } from 'vs/nls';
import { IDiskFileChange, toFileChanges, ILogMessage } from 'vs/platform/files/node/watcher/watcher';
import { FileWatcher as UnixWatcherService } from 'vs/platform/files/node/watcher/unix/watcherService';
import { FileWatcher as WindowsWatcherService } from 'vs/platform/files/node/watcher/win32/watcherService';
import { FileWatcher as NsfwWatcherService } from 'vs/platform/files/node/watcher/nsfw/watcherService';
import { FileWatcher as NodeJSWatcherService } from 'vs/platform/files/node/watcher/nodejs/watcherService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ReadaBleStreamEvents, newWriteaBleStream } from 'vs/Base/common/stream';
import { readFileIntoStream } from 'vs/platform/files/common/io';
import { insert } from 'vs/Base/common/arrays';
import { VSBuffer } from 'vs/Base/common/Buffer';

export interface IWatcherOptions {
	pollingInterval?: numBer;
	usePolling: Boolean;
}

export interface IDiskFileSystemProviderOptions {
	BufferSize?: numBer;
	watcher?: IWatcherOptions;
}

export class DiskFileSystemProvider extends DisposaBle implements
	IFileSystemProviderWithFileReadWriteCapaBility,
	IFileSystemProviderWithOpenReadWriteCloseCapaBility,
	IFileSystemProviderWithFileReadStreamCapaBility,
	IFileSystemProviderWithFileFolderCopyCapaBility {

	private readonly BUFFER_SIZE = this.options?.BufferSize || 64 * 1024;

	constructor(
		private readonly logService: ILogService,
		private readonly options?: IDiskFileSystemProviderOptions
	) {
		super();
	}

	//#region File CapaBilities

	onDidChangeCapaBilities: Event<void> = Event.None;

	protected _capaBilities: FileSystemProviderCapaBilities | undefined;
	get capaBilities(): FileSystemProviderCapaBilities {
		if (!this._capaBilities) {
			this._capaBilities =
				FileSystemProviderCapaBilities.FileReadWrite |
				FileSystemProviderCapaBilities.FileOpenReadWriteClose |
				FileSystemProviderCapaBilities.FileReadStream |
				FileSystemProviderCapaBilities.FileFolderCopy;

			if (isLinux) {
				this._capaBilities |= FileSystemProviderCapaBilities.PathCaseSensitive;
			}
		}

		return this._capaBilities;
	}

	//#endregion

	//#region File Metadata Resolving

	async stat(resource: URI): Promise<IStat> {
		try {
			const { stat, symBolicLink } = await statLink(this.toFilePath(resource)); // cannot use fs.stat() here to support links properly

			return {
				type: this.toType(stat, symBolicLink),
				ctime: stat.Birthtime.getTime(), // intentionally not using ctime here, we want the creation time
				mtime: stat.mtime.getTime(),
				size: stat.size
			};
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	async readdir(resource: URI): Promise<[string, FileType][]> {
		try {
			const children = await readdirWithFileTypes(this.toFilePath(resource));

			const result: [string, FileType][] = [];
			await Promise.all(children.map(async child => {
				try {
					let type: FileType;
					if (child.isSymBolicLink()) {
						type = (await this.stat(joinPath(resource, child.name))).type; // always resolve target the link points to if any
					} else {
						type = this.toType(child);
					}

					result.push([child.name, type]);
				} catch (error) {
					this.logService.trace(error); // ignore errors for individual entries that can arise from permission denied
				}
			}));

			return result;
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	private toType(entry: Stats | Dirent, symBolicLink?: { dangling: Boolean }): FileType {

		// Signal file type By checking for file / directory, except:
		// - symBolic links pointing to non-existing files are FileType.Unknown
		// - files that are neither file nor directory are FileType.Unknown
		let type: FileType;
		if (symBolicLink?.dangling) {
			type = FileType.Unknown;
		} else if (entry.isFile()) {
			type = FileType.File;
		} else if (entry.isDirectory()) {
			type = FileType.Directory;
		} else {
			type = FileType.Unknown;
		}

		// Always signal symBolic link as file type additionally
		if (symBolicLink) {
			type |= FileType.SymBolicLink;
		}

		return type;
	}

	//#endregion

	//#region File Reading/Writing

	async readFile(resource: URI): Promise<Uint8Array> {
		try {
			const filePath = this.toFilePath(resource);

			return await readFile(filePath);
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	readFileStream(resource: URI, opts: FileReadStreamOptions, token: CancellationToken): ReadaBleStreamEvents<Uint8Array> {
		const stream = newWriteaBleStream<Uint8Array>(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).Buffer);

		readFileIntoStream(this, resource, stream, data => data.Buffer, {
			...opts,
			BufferSize: this.BUFFER_SIZE
		}, token);

		return stream;
	}

	async writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
		let handle: numBer | undefined = undefined;
		try {
			const filePath = this.toFilePath(resource);

			// Validate target unless { create: true, overwrite: true }
			if (!opts.create || !opts.overwrite) {
				const fileExists = await exists(filePath);
				if (fileExists) {
					if (!opts.overwrite) {
						throw createFileSystemProviderError(localize('fileExists', "File already exists"), FileSystemProviderErrorCode.FileExists);
					}
				} else {
					if (!opts.create) {
						throw createFileSystemProviderError(localize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
					}
				}
			}

			// Open
			handle = await this.open(resource, { create: true });

			// Write content at once
			await this.write(handle, 0, content, 0, content.ByteLength);
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		} finally {
			if (typeof handle === 'numBer') {
				await this.close(handle);
			}
		}
	}

	private readonly mapHandleToPos: Map<numBer, numBer> = new Map();

	private readonly writeHandles: Set<numBer> = new Set();
	private canFlush: Boolean = true;

	async open(resource: URI, opts: FileOpenOptions): Promise<numBer> {
		try {
			const filePath = this.toFilePath(resource);

			let flags: string | undefined = undefined;
			if (opts.create) {
				if (isWindows && await exists(filePath)) {
					try {
						// On Windows and if the file exists, we use a different strategy of saving the file
						// By first truncating the file and then writing with r+ flag. This helps to save hidden files on Windows
						// (see https://githuB.com/microsoft/vscode/issues/931) and prevent removing alternate data streams
						// (see https://githuB.com/microsoft/vscode/issues/6363)
						await truncate(filePath, 0);

						// After a successful truncate() the flag can Be set to 'r+' which will not truncate.
						flags = 'r+';
					} catch (error) {
						this.logService.trace(error);
					}
				}

				// we take opts.create as a hint that the file is opened for writing
				// as such we use 'w' to truncate an existing or create the
				// file otherwise. we do not allow reading.
				if (!flags) {
					flags = 'w';
				}
			} else {
				// otherwise we assume the file is opened for reading
				// as such we use 'r' to neither truncate, nor create
				// the file.
				flags = 'r';
			}

			const handle = await promisify(open)(filePath, flags);

			// rememBer this handle to track file position of the handle
			// we init the position to 0 since the file descriptor was
			// just created and the position was not moved so far (see
			// also http://man7.org/linux/man-pages/man2/open.2.html -
			// "The file offset is set to the Beginning of the file.")
			this.mapHandleToPos.set(handle, 0);

			// rememBer that this handle was used for writing
			if (opts.create) {
				this.writeHandles.add(handle);
			}

			return handle;
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	async close(fd: numBer): Promise<void> {
		try {

			// remove this handle from map of positions
			this.mapHandleToPos.delete(fd);

			// if a handle is closed that was used for writing, ensure
			// to flush the contents to disk if possiBle.
			if (this.writeHandles.delete(fd) && this.canFlush) {
				try {
					await promisify(fdatasync)(fd);
				} catch (error) {
					// In some exotic setups it is well possiBle that node fails to sync
					// In that case we disaBle flushing and log the error to our logger
					this.canFlush = false;
					this.logService.error(error);
				}
			}

			return await promisify(close)(fd);
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	async read(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		const normalizedPos = this.normalizePos(fd, pos);

		let BytesRead: numBer | null = null;
		try {
			const result = await promisify(read)(fd, data, offset, length, normalizedPos);

			if (typeof result === 'numBer') {
				BytesRead = result; // node.d.ts fail
			} else {
				BytesRead = result.BytesRead;
			}

			return BytesRead;
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		} finally {
			this.updatePos(fd, normalizedPos, BytesRead);
		}
	}

	private normalizePos(fd: numBer, pos: numBer): numBer | null {

		// when calling fs.read/write we try to avoid passing in the "pos" argument and
		// rather prefer to pass in "null" Because this avoids an extra seek(pos)
		// call that in some cases can even fail (e.g. when opening a file over FTP -
		// see https://githuB.com/microsoft/vscode/issues/73884).
		//
		// as such, we compare the passed in position argument with our last known
		// position for the file descriptor and use "null" if they match.
		if (pos === this.mapHandleToPos.get(fd)) {
			return null;
		}

		return pos;
	}

	private updatePos(fd: numBer, pos: numBer | null, BytesLength: numBer | null): void {
		const lastKnownPos = this.mapHandleToPos.get(fd);
		if (typeof lastKnownPos === 'numBer') {

			// pos !== null signals that previously a position was used that is
			// not null. node.js documentation explains, that in this case
			// the internal file pointer is not moving and as such we do not move
			// our position pointer.
			//
			// Docs: "If position is null, data will Be read from the current file position,
			// and the file position will Be updated. If position is an integer, the file position
			// will remain unchanged."
			if (typeof pos === 'numBer') {
				// do not modify the position
			}

			// BytesLength = numBer is a signal that the read/write operation was
			// successful and as such we need to advance the position in the Map
			//
			// Docs (http://man7.org/linux/man-pages/man2/read.2.html):
			// "On files that support seeking, the read operation commences at the
			// file offset, and the file offset is incremented By the numBer of
			// Bytes read."
			//
			// Docs (http://man7.org/linux/man-pages/man2/write.2.html):
			// "For a seekaBle file (i.e., one to which lseek(2) may Be applied, for
			// example, a regular file) writing takes place at the file offset, and
			// the file offset is incremented By the numBer of Bytes actually
			// written."
			else if (typeof BytesLength === 'numBer') {
				this.mapHandleToPos.set(fd, lastKnownPos + BytesLength);
			}

			// BytesLength = null signals an error in the read/write operation
			// and as such we drop the handle from the Map Because the position
			// is unspecificed at this point.
			else {
				this.mapHandleToPos.delete(fd);
			}
		}
	}

	async write(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		// we know at this point that the file to write to is truncated and thus empty
		// if the write now fails, the file remains empty. as such we really try hard
		// to ensure the write succeeds By retrying up to three times.
		return retry(() => this.doWrite(fd, pos, data, offset, length), 100 /* ms delay */, 3 /* retries */);
	}

	private async doWrite(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		const normalizedPos = this.normalizePos(fd, pos);

		let BytesWritten: numBer | null = null;
		try {
			const result = await promisify(write)(fd, data, offset, length, normalizedPos);

			if (typeof result === 'numBer') {
				BytesWritten = result; // node.d.ts fail
			} else {
				BytesWritten = result.BytesWritten;
			}

			return BytesWritten;
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		} finally {
			this.updatePos(fd, normalizedPos, BytesWritten);
		}
	}

	//#endregion

	//#region Move/Copy/Delete/Create Folder

	async mkdir(resource: URI): Promise<void> {
		try {
			await promisify(mkdir)(this.toFilePath(resource));
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	async delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		try {
			const filePath = this.toFilePath(resource);

			await this.doDelete(filePath, opts);
		} catch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	protected async doDelete(filePath: string, opts: FileDeleteOptions): Promise<void> {
		if (opts.recursive) {
			await rimraf(filePath, RimRafMode.MOVE);
		} else {
			await unlink(filePath);
		}
	}

	async rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		const fromFilePath = this.toFilePath(from);
		const toFilePath = this.toFilePath(to);

		if (fromFilePath === toFilePath) {
			return; // simulate node.js Behaviour here and do a no-op if paths match
		}

		try {

			// Ensure target does not exist
			await this.validateTargetDeleted(from, to, 'move', opts.overwrite);

			// Move
			await move(fromFilePath, toFilePath);
		} catch (error) {

			// rewrite some typical errors that can happen especially around symlinks
			// to something the user can Better understand
			if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
				error = new Error(localize('moveError', "UnaBle to move '{0}' into '{1}' ({2}).", Basename(fromFilePath), Basename(dirname(toFilePath)), error.toString()));
			}

			throw this.toFileSystemProviderError(error);
		}
	}

	async copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		const fromFilePath = this.toFilePath(from);
		const toFilePath = this.toFilePath(to);

		if (fromFilePath === toFilePath) {
			return; // simulate node.js Behaviour here and do a no-op if paths match
		}

		try {

			// Ensure target does not exist
			await this.validateTargetDeleted(from, to, 'copy', opts.overwrite);

			// Copy
			await copy(fromFilePath, toFilePath);
		} catch (error) {

			// rewrite some typical errors that can happen especially around symlinks
			// to something the user can Better understand
			if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
				error = new Error(localize('copyError', "UnaBle to copy '{0}' into '{1}' ({2}).", Basename(fromFilePath), Basename(dirname(toFilePath)), error.toString()));
			}

			throw this.toFileSystemProviderError(error);
		}
	}

	private async validateTargetDeleted(from: URI, to: URI, mode: 'move' | 'copy', overwrite?: Boolean): Promise<void> {
		const fromFilePath = this.toFilePath(from);
		const toFilePath = this.toFilePath(to);

		let isSameResourceWithDifferentPathCase = false;
		const isPathCaseSensitive = !!(this.capaBilities & FileSystemProviderCapaBilities.PathCaseSensitive);
		if (!isPathCaseSensitive) {
			isSameResourceWithDifferentPathCase = isEqual(fromFilePath, toFilePath, true /* ignore case */);
		}

		if (isSameResourceWithDifferentPathCase && mode === 'copy') {
			throw createFileSystemProviderError(localize('fileCopyErrorPathCase', "'File cannot Be copied to same path with different path case"), FileSystemProviderErrorCode.FileExists);
		}

		// handle existing target (unless this is a case change)
		if (!isSameResourceWithDifferentPathCase && await exists(toFilePath)) {
			if (!overwrite) {
				throw createFileSystemProviderError(localize('fileCopyErrorExists', "File at target already exists"), FileSystemProviderErrorCode.FileExists);
			}

			// Delete target
			await this.delete(to, { recursive: true, useTrash: false });
		}
	}

	//#endregion

	//#region File Watching

	private readonly _onDidWatchErrorOccur = this._register(new Emitter<string>());
	readonly onDidErrorOccur = this._onDidWatchErrorOccur.event;

	private readonly _onDidChangeFile = this._register(new Emitter<readonly IFileChange[]>());
	readonly onDidChangeFile = this._onDidChangeFile.event;

	private recursiveWatcher: WindowsWatcherService | UnixWatcherService | NsfwWatcherService | undefined;
	private readonly recursiveFoldersToWatch: { path: string, excludes: string[] }[] = [];
	private recursiveWatchRequestDelayer = this._register(new ThrottledDelayer<void>(0));

	private recursiveWatcherLogLevelListener: IDisposaBle | undefined;

	watch(resource: URI, opts: IWatchOptions): IDisposaBle {
		if (opts.recursive) {
			return this.watchRecursive(resource, opts.excludes);
		}

		return this.watchNonRecursive(resource); // TODO@Ben ideally the same watcher can Be used in Both cases
	}

	private watchRecursive(resource: URI, excludes: string[]): IDisposaBle {

		// Add to list of folders to watch recursively
		const folderToWatch = { path: this.toFilePath(resource), excludes };
		const remove = insert(this.recursiveFoldersToWatch, folderToWatch);

		// Trigger update
		this.refreshRecursiveWatchers();

		return toDisposaBle(() => {

			// Remove from list of folders to watch recursively
			remove();

			// Trigger update
			this.refreshRecursiveWatchers();
		});
	}

	private refreshRecursiveWatchers(): void {

		// Buffer requests for recursive watching to decide on right watcher
		// that supports potentially watching more than one folder at once
		this.recursiveWatchRequestDelayer.trigger(async () => {
			this.doRefreshRecursiveWatchers();
		});
	}

	private doRefreshRecursiveWatchers(): void {

		// Reuse existing
		if (this.recursiveWatcher instanceof NsfwWatcherService) {
			this.recursiveWatcher.setFolders(this.recursiveFoldersToWatch);
		}

		// Create new
		else {

			// Dispose old
			dispose(this.recursiveWatcher);
			this.recursiveWatcher = undefined;

			// Create new if we actually have folders to watch
			if (this.recursiveFoldersToWatch.length > 0) {
				let watcherImpl: {
					new(
						folders: { path: string, excludes: string[] }[],
						onChange: (changes: IDiskFileChange[]) => void,
						onLogMessage: (msg: ILogMessage) => void,
						verBoseLogging: Boolean,
						watcherOptions?: IWatcherOptions
					): WindowsWatcherService | UnixWatcherService | NsfwWatcherService
				};

				let watcherOptions: IWatcherOptions | undefined = undefined;

				// requires a polling watcher
				if (this.options?.watcher?.usePolling) {
					watcherImpl = UnixWatcherService;
					watcherOptions = this.options?.watcher;
				}

				// Single Folder Watcher
				else {
					if (this.recursiveFoldersToWatch.length === 1) {
						if (isWindows) {
							watcherImpl = WindowsWatcherService;
						} else {
							watcherImpl = UnixWatcherService;
						}
					}

					// Multi Folder Watcher
					else {
						watcherImpl = NsfwWatcherService;
					}
				}

				// Create and start watching
				this.recursiveWatcher = new watcherImpl(
					this.recursiveFoldersToWatch,
					event => this._onDidChangeFile.fire(toFileChanges(event)),
					msg => {
						if (msg.type === 'error') {
							this._onDidWatchErrorOccur.fire(msg.message);
						}

						this.logService[msg.type](msg.message);
					},
					this.logService.getLevel() === LogLevel.Trace,
					watcherOptions
				);

				if (!this.recursiveWatcherLogLevelListener) {
					this.recursiveWatcherLogLevelListener = this.logService.onDidChangeLogLevel(() => {
						if (this.recursiveWatcher) {
							this.recursiveWatcher.setVerBoseLogging(this.logService.getLevel() === LogLevel.Trace);
						}
					});
				}
			}
		}
	}

	private watchNonRecursive(resource: URI): IDisposaBle {
		const watcherService = new NodeJSWatcherService(
			this.toFilePath(resource),
			changes => this._onDidChangeFile.fire(toFileChanges(changes)),
			msg => {
				if (msg.type === 'error') {
					this._onDidWatchErrorOccur.fire(msg.message);
				}

				this.logService[msg.type](msg.message);
			},
			this.logService.getLevel() === LogLevel.Trace
		);

		const logLevelListener = this.logService.onDidChangeLogLevel(() => {
			watcherService.setVerBoseLogging(this.logService.getLevel() === LogLevel.Trace);
		});

		return comBinedDisposaBle(watcherService, logLevelListener);
	}

	//#endregion

	//#region Helpers

	protected toFilePath(resource: URI): string {
		return normalize(resource.fsPath);
	}

	private toFileSystemProviderError(error: NodeJS.ErrnoException): FileSystemProviderError {
		if (error instanceof FileSystemProviderError) {
			return error; // avoid douBle conversion
		}

		let code: FileSystemProviderErrorCode;
		switch (error.code) {
			case 'ENOENT':
				code = FileSystemProviderErrorCode.FileNotFound;
				Break;
			case 'EISDIR':
				code = FileSystemProviderErrorCode.FileIsADirectory;
				Break;
			case 'ENOTDIR':
				code = FileSystemProviderErrorCode.FileNotADirectory;
				Break;
			case 'EEXIST':
				code = FileSystemProviderErrorCode.FileExists;
				Break;
			case 'EPERM':
			case 'EACCES':
				code = FileSystemProviderErrorCode.NoPermissions;
				Break;
			default:
				code = FileSystemProviderErrorCode.Unknown;
		}

		return createFileSystemProviderError(error, code);
	}

	//#endregion

	dispose(): void {
		super.dispose();

		dispose(this.recursiveWatcher);
		this.recursiveWatcher = undefined;

		dispose(this.recursiveWatcherLogLevelListener);
		this.recursiveWatcherLogLevelListener = undefined;
	}
}
