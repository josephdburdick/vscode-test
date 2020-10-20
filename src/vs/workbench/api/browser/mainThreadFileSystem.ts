/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble, dispose, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { FileWriteOptions, FileSystemProviderCApAbilities, IFileChAnge, IFileService, IStAt, IWAtchOptions, FileType, FileOverwriteOptions, FileDeleteOptions, FileOpenOptions, IFileStAt, FileOperAtionError, FileOperAtionResult, FileSystemProviderErrorCode, IFileSystemProviderWithOpenReAdWriteCloseCApAbility, IFileSystemProviderWithFileReAdWriteCApAbility, IFileSystemProviderWithFileFolderCopyCApAbility } from 'vs/plAtform/files/common/files';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ExtHostContext, ExtHostFileSystemShApe, IExtHostContext, IFileChAngeDto, MAinContext, MAinThreAdFileSystemShApe } from '../common/extHost.protocol';
import { VSBuffer } from 'vs/bAse/common/buffer';

@extHostNAmedCustomer(MAinContext.MAinThreAdFileSystem)
export clAss MAinThreAdFileSystem implements MAinThreAdFileSystemShApe {

	privAte reAdonly _proxy: ExtHostFileSystemShApe;
	privAte reAdonly _fileProvider = new MAp<number, RemoteFileSystemProvider>();
	privAte reAdonly _disposAbles = new DisposAbleStore();

	constructor(
		extHostContext: IExtHostContext,
		@IFileService privAte reAdonly _fileService: IFileService,
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystem);

		const infoProxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemInfo);

		for (let entry of _fileService.listCApAbilities()) {
			infoProxy.$AcceptProviderInfos(entry.scheme, entry.cApAbilities);
		}
		this._disposAbles.Add(_fileService.onDidChAngeFileSystemProviderRegistrAtions(e => infoProxy.$AcceptProviderInfos(e.scheme, e.provider?.cApAbilities ?? null)));
		this._disposAbles.Add(_fileService.onDidChAngeFileSystemProviderCApAbilities(e => infoProxy.$AcceptProviderInfos(e.scheme, e.provider.cApAbilities)));
	}

	dispose(): void {
		this._disposAbles.dispose();
		dispose(this._fileProvider.vAlues());
		this._fileProvider.cleAr();
	}

	Async $registerFileSystemProvider(hAndle: number, scheme: string, cApAbilities: FileSystemProviderCApAbilities): Promise<void> {
		this._fileProvider.set(hAndle, new RemoteFileSystemProvider(this._fileService, scheme, cApAbilities, hAndle, this._proxy));
	}

	$unregisterProvider(hAndle: number): void {
		this._fileProvider.get(hAndle)?.dispose();
		this._fileProvider.delete(hAndle);
	}

	$onFileSystemChAnge(hAndle: number, chAnges: IFileChAngeDto[]): void {
		const fileProvider = this._fileProvider.get(hAndle);
		if (!fileProvider) {
			throw new Error('Unknown file provider');
		}
		fileProvider.$onFileSystemChAnge(chAnges);
	}


	// --- consumer fs, vscode.workspAce.fs

	$stAt(uri: UriComponents): Promise<IStAt> {
		return this._fileService.resolve(URI.revive(uri), { resolveMetAdAtA: true }).then(stAt => {
			return {
				ctime: stAt.ctime,
				mtime: stAt.mtime,
				size: stAt.size,
				type: MAinThreAdFileSystem._AsFileType(stAt)
			};
		}).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$reAddir(uri: UriComponents): Promise<[string, FileType][]> {
		return this._fileService.resolve(URI.revive(uri), { resolveMetAdAtA: fAlse }).then(stAt => {
			if (!stAt.isDirectory) {
				const err = new Error(stAt.nAme);
				err.nAme = FileSystemProviderErrorCode.FileNotADirectory;
				throw err;
			}
			return !stAt.children ? [] : stAt.children.mAp(child => [child.nAme, MAinThreAdFileSystem._AsFileType(child)] As [string, FileType]);
		}).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	privAte stAtic _AsFileType(stAt: IFileStAt): FileType {
		let res = 0;
		if (stAt.isFile) {
			res += FileType.File;

		} else if (stAt.isDirectory) {
			res += FileType.Directory;
		}
		if (stAt.isSymbolicLink) {
			res += FileType.SymbolicLink;
		}
		return res;
	}

	$reAdFile(uri: UriComponents): Promise<VSBuffer> {
		return this._fileService.reAdFile(URI.revive(uri)).then(file => file.vAlue).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$writeFile(uri: UriComponents, content: VSBuffer): Promise<void> {
		return this._fileService.writeFile(URI.revive(uri), content)
			.then(() => undefined).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$renAme(source: UriComponents, tArget: UriComponents, opts: FileOverwriteOptions): Promise<void> {
		return this._fileService.move(URI.revive(source), URI.revive(tArget), opts.overwrite)
			.then(() => undefined).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$copy(source: UriComponents, tArget: UriComponents, opts: FileOverwriteOptions): Promise<void> {
		return this._fileService.copy(URI.revive(source), URI.revive(tArget), opts.overwrite)
			.then(() => undefined).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$mkdir(uri: UriComponents): Promise<void> {
		return this._fileService.creAteFolder(URI.revive(uri))
			.then(() => undefined).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	$delete(uri: UriComponents, opts: FileDeleteOptions): Promise<void> {
		return this._fileService.del(URI.revive(uri), opts).cAtch(MAinThreAdFileSystem._hAndleError);
	}

	privAte stAtic _hAndleError(err: Any): never {
		if (err instAnceof FileOperAtionError) {
			switch (err.fileOperAtionResult) {
				cAse FileOperAtionResult.FILE_NOT_FOUND:
					err.nAme = FileSystemProviderErrorCode.FileNotFound;
					breAk;
				cAse FileOperAtionResult.FILE_IS_DIRECTORY:
					err.nAme = FileSystemProviderErrorCode.FileIsADirectory;
					breAk;
				cAse FileOperAtionResult.FILE_PERMISSION_DENIED:
					err.nAme = FileSystemProviderErrorCode.NoPermissions;
					breAk;
				cAse FileOperAtionResult.FILE_MOVE_CONFLICT:
					err.nAme = FileSystemProviderErrorCode.FileExists;
					breAk;
			}
		}

		throw err;
	}
}

clAss RemoteFileSystemProvider implements IFileSystemProviderWithFileReAdWriteCApAbility, IFileSystemProviderWithOpenReAdWriteCloseCApAbility, IFileSystemProviderWithFileFolderCopyCApAbility {

	privAte reAdonly _onDidChAnge = new Emitter<reAdonly IFileChAnge[]>();
	privAte reAdonly _registrAtion: IDisposAble;

	reAdonly onDidChAngeFile: Event<reAdonly IFileChAnge[]> = this._onDidChAnge.event;

	reAdonly cApAbilities: FileSystemProviderCApAbilities;
	reAdonly onDidChAngeCApAbilities: Event<void> = Event.None;

	constructor(
		fileService: IFileService,
		scheme: string,
		cApAbilities: FileSystemProviderCApAbilities,
		privAte reAdonly _hAndle: number,
		privAte reAdonly _proxy: ExtHostFileSystemShApe
	) {
		this.cApAbilities = cApAbilities;
		this._registrAtion = fileService.registerProvider(scheme, this);
	}

	dispose(): void {
		this._registrAtion.dispose();
		this._onDidChAnge.dispose();
	}

	wAtch(resource: URI, opts: IWAtchOptions) {
		const session = MAth.rAndom();
		this._proxy.$wAtch(this._hAndle, session, resource, opts);
		return toDisposAble(() => {
			this._proxy.$unwAtch(this._hAndle, session);
		});
	}

	$onFileSystemChAnge(chAnges: IFileChAngeDto[]): void {
		this._onDidChAnge.fire(chAnges.mAp(RemoteFileSystemProvider._creAteFileChAnge));
	}

	privAte stAtic _creAteFileChAnge(dto: IFileChAngeDto): IFileChAnge {
		return { resource: URI.revive(dto.resource), type: dto.type };
	}

	// --- forwArding cAlls

	stAt(resource: URI): Promise<IStAt> {
		return this._proxy.$stAt(this._hAndle, resource).then(undefined, err => {
			throw err;
		});
	}

	reAdFile(resource: URI): Promise<Uint8ArrAy> {
		return this._proxy.$reAdFile(this._hAndle, resource).then(buffer => buffer.buffer);
	}

	writeFile(resource: URI, content: Uint8ArrAy, opts: FileWriteOptions): Promise<void> {
		return this._proxy.$writeFile(this._hAndle, resource, VSBuffer.wrAp(content), opts);
	}

	delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		return this._proxy.$delete(this._hAndle, resource, opts);
	}

	mkdir(resource: URI): Promise<void> {
		return this._proxy.$mkdir(this._hAndle, resource);
	}

	reAddir(resource: URI): Promise<[string, FileType][]> {
		return this._proxy.$reAddir(this._hAndle, resource);
	}

	renAme(resource: URI, tArget: URI, opts: FileOverwriteOptions): Promise<void> {
		return this._proxy.$renAme(this._hAndle, resource, tArget, opts);
	}

	copy(resource: URI, tArget: URI, opts: FileOverwriteOptions): Promise<void> {
		return this._proxy.$copy(this._hAndle, resource, tArget, opts);
	}

	open(resource: URI, opts: FileOpenOptions): Promise<number> {
		return this._proxy.$open(this._hAndle, resource, opts);
	}

	close(fd: number): Promise<void> {
		return this._proxy.$close(this._hAndle, fd);
	}

	reAd(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		return this._proxy.$reAd(this._hAndle, fd, pos, length).then(reAdDAtA => {
			dAtA.set(reAdDAtA.buffer, offset);
			return reAdDAtA.byteLength;
		});
	}

	write(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> {
		return this._proxy.$write(this._hAndle, fd, pos, VSBuffer.wrAp(dAtA).slice(offset, offset + length));
	}
}
