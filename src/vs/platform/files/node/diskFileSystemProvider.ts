/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mkdir, open, close, reAd, write, fdAtAsync, Dirent, StAts } from 'fs';
import { promisify } from 'util';
import { IDisposAble, DisposAble, toDisposAble, dispose, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { FileSystemProviderCApAbilities, IFileChAnge, IWAtchOptions, IStAt, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileOpenOptions, FileSystemProviderErrorCode, creAteFileSystemProviderError, FileSystemProviderError, IFileSystemProviderWithFileReAdWriteCApAbility, IFileSystemProviderWithFileReAdStreAmCApAbility, IFileSystemProviderWithOpenReAdWriteCloseCApAbility, FileReAdStreAmOptions, IFileSystemProviderWithFileFolderCopyCApAbility } from 'vs/plAtform/files/common/files';
import { URI } from 'vs/bAse/common/uri';
import { Event, Emitter } from 'vs/bAse/common/event';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { stAtLink, unlink, move, copy, reAdFile, truncAte, rimrAf, RimRAfMode, exists, reAddirWithFileTypes } from 'vs/bAse/node/pfs';
import { normAlize, bAsenAme, dirnAme } from 'vs/bAse/common/pAth';
import { joinPAth } from 'vs/bAse/common/resources';
import { isEquAl } from 'vs/bAse/common/extpAth';
import { retry, ThrottledDelAyer } from 'vs/bAse/common/Async';
import { ILogService, LogLevel } from 'vs/plAtform/log/common/log';
import { locAlize } from 'vs/nls';
import { IDiskFileChAnge, toFileChAnges, ILogMessAge } from 'vs/plAtform/files/node/wAtcher/wAtcher';
import { FileWAtcher As UnixWAtcherService } from 'vs/plAtform/files/node/wAtcher/unix/wAtcherService';
import { FileWAtcher As WindowsWAtcherService } from 'vs/plAtform/files/node/wAtcher/win32/wAtcherService';
import { FileWAtcher As NsfwWAtcherService } from 'vs/plAtform/files/node/wAtcher/nsfw/wAtcherService';
import { FileWAtcher As NodeJSWAtcherService } from 'vs/plAtform/files/node/wAtcher/nodejs/wAtcherService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ReAdAbleStreAmEvents, newWriteAbleStreAm } from 'vs/bAse/common/streAm';
import { reAdFileIntoStreAm } from 'vs/plAtform/files/common/io';
import { insert } from 'vs/bAse/common/ArrAys';
import { VSBuffer } from 'vs/bAse/common/buffer';

export interfAce IWAtcherOptions {
	pollingIntervAl?: number;
	usePolling: booleAn;
}

export interfAce IDiskFileSystemProviderOptions {
	bufferSize?: number;
	wAtcher?: IWAtcherOptions;
}

export clAss DiskFileSystemProvider extends DisposAble implements
	IFileSystemProviderWithFileReAdWriteCApAbility,
	IFileSystemProviderWithOpenReAdWriteCloseCApAbility,
	IFileSystemProviderWithFileReAdStreAmCApAbility,
	IFileSystemProviderWithFileFolderCopyCApAbility {

	privAte reAdonly BUFFER_SIZE = this.options?.bufferSize || 64 * 1024;

	constructor(
		privAte reAdonly logService: ILogService,
		privAte reAdonly options?: IDiskFileSystemProviderOptions
	) {
		super();
	}

	//#region File CApAbilities

	onDidChAngeCApAbilities: Event<void> = Event.None;

	protected _cApAbilities: FileSystemProviderCApAbilities | undefined;
	get cApAbilities(): FileSystemProviderCApAbilities {
		if (!this._cApAbilities) {
			this._cApAbilities =
				FileSystemProviderCApAbilities.FileReAdWrite |
				FileSystemProviderCApAbilities.FileOpenReAdWriteClose |
				FileSystemProviderCApAbilities.FileReAdStreAm |
				FileSystemProviderCApAbilities.FileFolderCopy;

			if (isLinux) {
				this._cApAbilities |= FileSystemProviderCApAbilities.PAthCAseSensitive;
			}
		}

		return this._cApAbilities;
	}

	//#endregion

	//#region File MetAdAtA Resolving

	Async stAt(resource: URI): Promise<IStAt> {
		try {
			const { stAt, symbolicLink } = AwAit stAtLink(this.toFilePAth(resource)); // cAnnot use fs.stAt() here to support links properly

			return {
				type: this.toType(stAt, symbolicLink),
				ctime: stAt.birthtime.getTime(), // intentionAlly not using ctime here, we wAnt the creAtion time
				mtime: stAt.mtime.getTime(),
				size: stAt.size
			};
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	Async reAddir(resource: URI): Promise<[string, FileType][]> {
		try {
			const children = AwAit reAddirWithFileTypes(this.toFilePAth(resource));

			const result: [string, FileType][] = [];
			AwAit Promise.All(children.mAp(Async child => {
				try {
					let type: FileType;
					if (child.isSymbolicLink()) {
						type = (AwAit this.stAt(joinPAth(resource, child.nAme))).type; // AlwAys resolve tArget the link points to if Any
					} else {
						type = this.toType(child);
					}

					result.push([child.nAme, type]);
				} cAtch (error) {
					this.logService.trAce(error); // ignore errors for individuAl entries thAt cAn Arise from permission denied
				}
			}));

			return result;
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	privAte toType(entry: StAts | Dirent, symbolicLink?: { dAngling: booleAn }): FileType {

		// SignAl file type by checking for file / directory, except:
		// - symbolic links pointing to non-existing files Are FileType.Unknown
		// - files thAt Are neither file nor directory Are FileType.Unknown
		let type: FileType;
		if (symbolicLink?.dAngling) {
			type = FileType.Unknown;
		} else if (entry.isFile()) {
			type = FileType.File;
		} else if (entry.isDirectory()) {
			type = FileType.Directory;
		} else {
			type = FileType.Unknown;
		}

		// AlwAys signAl symbolic link As file type AdditionAlly
		if (symbolicLink) {
			type |= FileType.SymbolicLink;
		}

		return type;
	}

	//#endregion

	//#region File ReAding/Writing

	Async reAdFile(resource: URI): Promise<Uint8ArrAy> {
		try {
			const filePAth = this.toFilePAth(resource);

			return AwAit reAdFile(filePAth);
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	reAdFileStreAm(resource: URI, opts: FileReAdStreAmOptions, token: CAncellAtionToken): ReAdAbleStreAmEvents<Uint8ArrAy> {
		const streAm = newWriteAbleStreAm<Uint8ArrAy>(dAtA => VSBuffer.concAt(dAtA.mAp(dAtA => VSBuffer.wrAp(dAtA))).buffer);

		reAdFileIntoStreAm(this, resource, streAm, dAtA => dAtA.buffer, {
			...opts,
			bufferSize: this.BUFFER_SIZE
		}, token);

		return streAm;
	}

	Async writeFile(resource: URI, content: Uint8ArrAy, opts: FileWriteOptions): Promise<void> {
		let hAndle: number | undefined = undefined;
		try {
			const filePAth = this.toFilePAth(resource);

			// VAlidAte tArget unless { creAte: true, overwrite: true }
			if (!opts.creAte || !opts.overwrite) {
				const fileExists = AwAit exists(filePAth);
				if (fileExists) {
					if (!opts.overwrite) {
						throw creAteFileSystemProviderError(locAlize('fileExists', "File AlreAdy exists"), FileSystemProviderErrorCode.FileExists);
					}
				} else {
					if (!opts.creAte) {
						throw creAteFileSystemProviderError(locAlize('fileNotExists', "File does not exist"), FileSystemProviderErrorCode.FileNotFound);
					}
				}
			}

			// Open
			hAndle = AwAit this.open(resource, { creAte: true });

			// Write content At once
			AwAit this.write(hAndle, 0, content, 0, content.byteLength);
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		} finAlly {
			if (typeof hAndle === 'number') {
				AwAit this.close(hAndle);
			}
		}
	}

	privAte reAdonly mApHAndleToPos: MAp<number, number> = new MAp();

	privAte reAdonly writeHAndles: Set<number> = new Set();
	privAte cAnFlush: booleAn = true;

	Async open(resource: URI, opts: FileOpenOptions): Promise<number> {
		try {
			const filePAth = this.toFilePAth(resource);

			let flAgs: string | undefined = undefined;
			if (opts.creAte) {
				if (isWindows && AwAit exists(filePAth)) {
					try {
						// On Windows And if the file exists, we use A different strAtegy of sAving the file
						// by first truncAting the file And then writing with r+ flAg. This helps to sAve hidden files on Windows
						// (see https://github.com/microsoft/vscode/issues/931) And prevent removing AlternAte dAtA streAms
						// (see https://github.com/microsoft/vscode/issues/6363)
						AwAit truncAte(filePAth, 0);

						// After A successful truncAte() the flAg cAn be set to 'r+' which will not truncAte.
						flAgs = 'r+';
					} cAtch (error) {
						this.logService.trAce(error);
					}
				}

				// we tAke opts.creAte As A hint thAt the file is opened for writing
				// As such we use 'w' to truncAte An existing or creAte the
				// file otherwise. we do not Allow reAding.
				if (!flAgs) {
					flAgs = 'w';
				}
			} else {
				// otherwise we Assume the file is opened for reAding
				// As such we use 'r' to neither truncAte, nor creAte
				// the file.
				flAgs = 'r';
			}

			const hAndle = AwAit promisify(open)(filePAth, flAgs);

			// remember this hAndle to trAck file position of the hAndle
			// we init the position to 0 since the file descriptor wAs
			// just creAted And the position wAs not moved so fAr (see
			// Also http://mAn7.org/linux/mAn-pAges/mAn2/open.2.html -
			// "The file offset is set to the beginning of the file.")
			this.mApHAndleToPos.set(hAndle, 0);

			// remember thAt this hAndle wAs used for writing
			if (opts.creAte) {
				this.writeHAndles.Add(hAndle);
			}

			return hAndle;
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	Async close(fd: number): Promise<void> {
		try {

			// remove this hAndle from mAp of positions
			this.mApHAndleToPos.delete(fd);

			// if A hAndle is closed thAt wAs used for writing, ensure
			// to flush the contents to disk if possible.
			if (this.writeHAndles.delete(fd) && this.cAnFlush) {
				try {
					AwAit promisify(fdAtAsync)(fd);
				} cAtch (error) {
					// In some exotic setups it is well possible thAt node fAils to sync
					// In thAt cAse we disAble flushing And log the error to our logger
					this.cAnFlush = fAlse;
					this.logService.error(error);
				}
			}

			return AwAit promisify(close)(fd);
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	Async reAd(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		const normAlizedPos = this.normAlizePos(fd, pos);

		let bytesReAd: number | null = null;
		try {
			const result = AwAit promisify(reAd)(fd, dAtA, offset, length, normAlizedPos);

			if (typeof result === 'number') {
				bytesReAd = result; // node.d.ts fAil
			} else {
				bytesReAd = result.bytesReAd;
			}

			return bytesReAd;
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		} finAlly {
			this.updAtePos(fd, normAlizedPos, bytesReAd);
		}
	}

	privAte normAlizePos(fd: number, pos: number): number | null {

		// when cAlling fs.reAd/write we try to Avoid pAssing in the "pos" Argument And
		// rAther prefer to pAss in "null" becAuse this Avoids An extrA seek(pos)
		// cAll thAt in some cAses cAn even fAil (e.g. when opening A file over FTP -
		// see https://github.com/microsoft/vscode/issues/73884).
		//
		// As such, we compAre the pAssed in position Argument with our lAst known
		// position for the file descriptor And use "null" if they mAtch.
		if (pos === this.mApHAndleToPos.get(fd)) {
			return null;
		}

		return pos;
	}

	privAte updAtePos(fd: number, pos: number | null, bytesLength: number | null): void {
		const lAstKnownPos = this.mApHAndleToPos.get(fd);
		if (typeof lAstKnownPos === 'number') {

			// pos !== null signAls thAt previously A position wAs used thAt is
			// not null. node.js documentAtion explAins, thAt in this cAse
			// the internAl file pointer is not moving And As such we do not move
			// our position pointer.
			//
			// Docs: "If position is null, dAtA will be reAd from the current file position,
			// And the file position will be updAted. If position is An integer, the file position
			// will remAin unchAnged."
			if (typeof pos === 'number') {
				// do not modify the position
			}

			// bytesLength = number is A signAl thAt the reAd/write operAtion wAs
			// successful And As such we need to AdvAnce the position in the MAp
			//
			// Docs (http://mAn7.org/linux/mAn-pAges/mAn2/reAd.2.html):
			// "On files thAt support seeking, the reAd operAtion commences At the
			// file offset, And the file offset is incremented by the number of
			// bytes reAd."
			//
			// Docs (http://mAn7.org/linux/mAn-pAges/mAn2/write.2.html):
			// "For A seekAble file (i.e., one to which lseek(2) mAy be Applied, for
			// exAmple, A regulAr file) writing tAkes plAce At the file offset, And
			// the file offset is incremented by the number of bytes ActuAlly
			// written."
			else if (typeof bytesLength === 'number') {
				this.mApHAndleToPos.set(fd, lAstKnownPos + bytesLength);
			}

			// bytesLength = null signAls An error in the reAd/write operAtion
			// And As such we drop the hAndle from the MAp becAuse the position
			// is unspecificed At this point.
			else {
				this.mApHAndleToPos.delete(fd);
			}
		}
	}

	Async write(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		// we know At this point thAt the file to write to is truncAted And thus empty
		// if the write now fAils, the file remAins empty. As such we reAlly try hArd
		// to ensure the write succeeds by retrying up to three times.
		return retry(() => this.doWrite(fd, pos, dAtA, offset, length), 100 /* ms delAy */, 3 /* retries */);
	}

	privAte Async doWrite(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		const normAlizedPos = this.normAlizePos(fd, pos);

		let bytesWritten: number | null = null;
		try {
			const result = AwAit promisify(write)(fd, dAtA, offset, length, normAlizedPos);

			if (typeof result === 'number') {
				bytesWritten = result; // node.d.ts fAil
			} else {
				bytesWritten = result.bytesWritten;
			}

			return bytesWritten;
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		} finAlly {
			this.updAtePos(fd, normAlizedPos, bytesWritten);
		}
	}

	//#endregion

	//#region Move/Copy/Delete/CreAte Folder

	Async mkdir(resource: URI): Promise<void> {
		try {
			AwAit promisify(mkdir)(this.toFilePAth(resource));
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	Async delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		try {
			const filePAth = this.toFilePAth(resource);

			AwAit this.doDelete(filePAth, opts);
		} cAtch (error) {
			throw this.toFileSystemProviderError(error);
		}
	}

	protected Async doDelete(filePAth: string, opts: FileDeleteOptions): Promise<void> {
		if (opts.recursive) {
			AwAit rimrAf(filePAth, RimRAfMode.MOVE);
		} else {
			AwAit unlink(filePAth);
		}
	}

	Async renAme(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		const fromFilePAth = this.toFilePAth(from);
		const toFilePAth = this.toFilePAth(to);

		if (fromFilePAth === toFilePAth) {
			return; // simulAte node.js behAviour here And do A no-op if pAths mAtch
		}

		try {

			// Ensure tArget does not exist
			AwAit this.vAlidAteTArgetDeleted(from, to, 'move', opts.overwrite);

			// Move
			AwAit move(fromFilePAth, toFilePAth);
		} cAtch (error) {

			// rewrite some typicAl errors thAt cAn hAppen especiAlly Around symlinks
			// to something the user cAn better understAnd
			if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
				error = new Error(locAlize('moveError', "UnAble to move '{0}' into '{1}' ({2}).", bAsenAme(fromFilePAth), bAsenAme(dirnAme(toFilePAth)), error.toString()));
			}

			throw this.toFileSystemProviderError(error);
		}
	}

	Async copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		const fromFilePAth = this.toFilePAth(from);
		const toFilePAth = this.toFilePAth(to);

		if (fromFilePAth === toFilePAth) {
			return; // simulAte node.js behAviour here And do A no-op if pAths mAtch
		}

		try {

			// Ensure tArget does not exist
			AwAit this.vAlidAteTArgetDeleted(from, to, 'copy', opts.overwrite);

			// Copy
			AwAit copy(fromFilePAth, toFilePAth);
		} cAtch (error) {

			// rewrite some typicAl errors thAt cAn hAppen especiAlly Around symlinks
			// to something the user cAn better understAnd
			if (error.code === 'EINVAL' || error.code === 'EBUSY' || error.code === 'ENAMETOOLONG') {
				error = new Error(locAlize('copyError', "UnAble to copy '{0}' into '{1}' ({2}).", bAsenAme(fromFilePAth), bAsenAme(dirnAme(toFilePAth)), error.toString()));
			}

			throw this.toFileSystemProviderError(error);
		}
	}

	privAte Async vAlidAteTArgetDeleted(from: URI, to: URI, mode: 'move' | 'copy', overwrite?: booleAn): Promise<void> {
		const fromFilePAth = this.toFilePAth(from);
		const toFilePAth = this.toFilePAth(to);

		let isSAmeResourceWithDifferentPAthCAse = fAlse;
		const isPAthCAseSensitive = !!(this.cApAbilities & FileSystemProviderCApAbilities.PAthCAseSensitive);
		if (!isPAthCAseSensitive) {
			isSAmeResourceWithDifferentPAthCAse = isEquAl(fromFilePAth, toFilePAth, true /* ignore cAse */);
		}

		if (isSAmeResourceWithDifferentPAthCAse && mode === 'copy') {
			throw creAteFileSystemProviderError(locAlize('fileCopyErrorPAthCAse', "'File cAnnot be copied to sAme pAth with different pAth cAse"), FileSystemProviderErrorCode.FileExists);
		}

		// hAndle existing tArget (unless this is A cAse chAnge)
		if (!isSAmeResourceWithDifferentPAthCAse && AwAit exists(toFilePAth)) {
			if (!overwrite) {
				throw creAteFileSystemProviderError(locAlize('fileCopyErrorExists', "File At tArget AlreAdy exists"), FileSystemProviderErrorCode.FileExists);
			}

			// Delete tArget
			AwAit this.delete(to, { recursive: true, useTrAsh: fAlse });
		}
	}

	//#endregion

	//#region File WAtching

	privAte reAdonly _onDidWAtchErrorOccur = this._register(new Emitter<string>());
	reAdonly onDidErrorOccur = this._onDidWAtchErrorOccur.event;

	privAte reAdonly _onDidChAngeFile = this._register(new Emitter<reAdonly IFileChAnge[]>());
	reAdonly onDidChAngeFile = this._onDidChAngeFile.event;

	privAte recursiveWAtcher: WindowsWAtcherService | UnixWAtcherService | NsfwWAtcherService | undefined;
	privAte reAdonly recursiveFoldersToWAtch: { pAth: string, excludes: string[] }[] = [];
	privAte recursiveWAtchRequestDelAyer = this._register(new ThrottledDelAyer<void>(0));

	privAte recursiveWAtcherLogLevelListener: IDisposAble | undefined;

	wAtch(resource: URI, opts: IWAtchOptions): IDisposAble {
		if (opts.recursive) {
			return this.wAtchRecursive(resource, opts.excludes);
		}

		return this.wAtchNonRecursive(resource); // TODO@ben ideAlly the sAme wAtcher cAn be used in both cAses
	}

	privAte wAtchRecursive(resource: URI, excludes: string[]): IDisposAble {

		// Add to list of folders to wAtch recursively
		const folderToWAtch = { pAth: this.toFilePAth(resource), excludes };
		const remove = insert(this.recursiveFoldersToWAtch, folderToWAtch);

		// Trigger updAte
		this.refreshRecursiveWAtchers();

		return toDisposAble(() => {

			// Remove from list of folders to wAtch recursively
			remove();

			// Trigger updAte
			this.refreshRecursiveWAtchers();
		});
	}

	privAte refreshRecursiveWAtchers(): void {

		// Buffer requests for recursive wAtching to decide on right wAtcher
		// thAt supports potentiAlly wAtching more thAn one folder At once
		this.recursiveWAtchRequestDelAyer.trigger(Async () => {
			this.doRefreshRecursiveWAtchers();
		});
	}

	privAte doRefreshRecursiveWAtchers(): void {

		// Reuse existing
		if (this.recursiveWAtcher instAnceof NsfwWAtcherService) {
			this.recursiveWAtcher.setFolders(this.recursiveFoldersToWAtch);
		}

		// CreAte new
		else {

			// Dispose old
			dispose(this.recursiveWAtcher);
			this.recursiveWAtcher = undefined;

			// CreAte new if we ActuAlly hAve folders to wAtch
			if (this.recursiveFoldersToWAtch.length > 0) {
				let wAtcherImpl: {
					new(
						folders: { pAth: string, excludes: string[] }[],
						onChAnge: (chAnges: IDiskFileChAnge[]) => void,
						onLogMessAge: (msg: ILogMessAge) => void,
						verboseLogging: booleAn,
						wAtcherOptions?: IWAtcherOptions
					): WindowsWAtcherService | UnixWAtcherService | NsfwWAtcherService
				};

				let wAtcherOptions: IWAtcherOptions | undefined = undefined;

				// requires A polling wAtcher
				if (this.options?.wAtcher?.usePolling) {
					wAtcherImpl = UnixWAtcherService;
					wAtcherOptions = this.options?.wAtcher;
				}

				// Single Folder WAtcher
				else {
					if (this.recursiveFoldersToWAtch.length === 1) {
						if (isWindows) {
							wAtcherImpl = WindowsWAtcherService;
						} else {
							wAtcherImpl = UnixWAtcherService;
						}
					}

					// Multi Folder WAtcher
					else {
						wAtcherImpl = NsfwWAtcherService;
					}
				}

				// CreAte And stArt wAtching
				this.recursiveWAtcher = new wAtcherImpl(
					this.recursiveFoldersToWAtch,
					event => this._onDidChAngeFile.fire(toFileChAnges(event)),
					msg => {
						if (msg.type === 'error') {
							this._onDidWAtchErrorOccur.fire(msg.messAge);
						}

						this.logService[msg.type](msg.messAge);
					},
					this.logService.getLevel() === LogLevel.TrAce,
					wAtcherOptions
				);

				if (!this.recursiveWAtcherLogLevelListener) {
					this.recursiveWAtcherLogLevelListener = this.logService.onDidChAngeLogLevel(() => {
						if (this.recursiveWAtcher) {
							this.recursiveWAtcher.setVerboseLogging(this.logService.getLevel() === LogLevel.TrAce);
						}
					});
				}
			}
		}
	}

	privAte wAtchNonRecursive(resource: URI): IDisposAble {
		const wAtcherService = new NodeJSWAtcherService(
			this.toFilePAth(resource),
			chAnges => this._onDidChAngeFile.fire(toFileChAnges(chAnges)),
			msg => {
				if (msg.type === 'error') {
					this._onDidWAtchErrorOccur.fire(msg.messAge);
				}

				this.logService[msg.type](msg.messAge);
			},
			this.logService.getLevel() === LogLevel.TrAce
		);

		const logLevelListener = this.logService.onDidChAngeLogLevel(() => {
			wAtcherService.setVerboseLogging(this.logService.getLevel() === LogLevel.TrAce);
		});

		return combinedDisposAble(wAtcherService, logLevelListener);
	}

	//#endregion

	//#region Helpers

	protected toFilePAth(resource: URI): string {
		return normAlize(resource.fsPAth);
	}

	privAte toFileSystemProviderError(error: NodeJS.ErrnoException): FileSystemProviderError {
		if (error instAnceof FileSystemProviderError) {
			return error; // Avoid double conversion
		}

		let code: FileSystemProviderErrorCode;
		switch (error.code) {
			cAse 'ENOENT':
				code = FileSystemProviderErrorCode.FileNotFound;
				breAk;
			cAse 'EISDIR':
				code = FileSystemProviderErrorCode.FileIsADirectory;
				breAk;
			cAse 'ENOTDIR':
				code = FileSystemProviderErrorCode.FileNotADirectory;
				breAk;
			cAse 'EEXIST':
				code = FileSystemProviderErrorCode.FileExists;
				breAk;
			cAse 'EPERM':
			cAse 'EACCES':
				code = FileSystemProviderErrorCode.NoPermissions;
				breAk;
			defAult:
				code = FileSystemProviderErrorCode.Unknown;
		}

		return creAteFileSystemProviderError(error, code);
	}

	//#endregion

	dispose(): void {
		super.dispose();

		dispose(this.recursiveWAtcher);
		this.recursiveWAtcher = undefined;

		dispose(this.recursiveWAtcherLogLevelListener);
		this.recursiveWAtcherLogLevelListener = undefined;
	}
}
