/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IDisposaBle, dispose, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { FileWriteOptions, FileSystemProviderCapaBilities, IFileChange, IFileService, IStat, IWatchOptions, FileType, FileOverwriteOptions, FileDeleteOptions, FileOpenOptions, IFileStat, FileOperationError, FileOperationResult, FileSystemProviderErrorCode, IFileSystemProviderWithOpenReadWriteCloseCapaBility, IFileSystemProviderWithFileReadWriteCapaBility, IFileSystemProviderWithFileFolderCopyCapaBility } from 'vs/platform/files/common/files';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ExtHostContext, ExtHostFileSystemShape, IExtHostContext, IFileChangeDto, MainContext, MainThreadFileSystemShape } from '../common/extHost.protocol';
import { VSBuffer } from 'vs/Base/common/Buffer';

@extHostNamedCustomer(MainContext.MainThreadFileSystem)
export class MainThreadFileSystem implements MainThreadFileSystemShape {

	private readonly _proxy: ExtHostFileSystemShape;
	private readonly _fileProvider = new Map<numBer, RemoteFileSystemProvider>();
	private readonly _disposaBles = new DisposaBleStore();

	constructor(
		extHostContext: IExtHostContext,
		@IFileService private readonly _fileService: IFileService,
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystem);

		const infoProxy = extHostContext.getProxy(ExtHostContext.ExtHostFileSystemInfo);

		for (let entry of _fileService.listCapaBilities()) {
			infoProxy.$acceptProviderInfos(entry.scheme, entry.capaBilities);
		}
		this._disposaBles.add(_fileService.onDidChangeFileSystemProviderRegistrations(e => infoProxy.$acceptProviderInfos(e.scheme, e.provider?.capaBilities ?? null)));
		this._disposaBles.add(_fileService.onDidChangeFileSystemProviderCapaBilities(e => infoProxy.$acceptProviderInfos(e.scheme, e.provider.capaBilities)));
	}

	dispose(): void {
		this._disposaBles.dispose();
		dispose(this._fileProvider.values());
		this._fileProvider.clear();
	}

	async $registerFileSystemProvider(handle: numBer, scheme: string, capaBilities: FileSystemProviderCapaBilities): Promise<void> {
		this._fileProvider.set(handle, new RemoteFileSystemProvider(this._fileService, scheme, capaBilities, handle, this._proxy));
	}

	$unregisterProvider(handle: numBer): void {
		this._fileProvider.get(handle)?.dispose();
		this._fileProvider.delete(handle);
	}

	$onFileSystemChange(handle: numBer, changes: IFileChangeDto[]): void {
		const fileProvider = this._fileProvider.get(handle);
		if (!fileProvider) {
			throw new Error('Unknown file provider');
		}
		fileProvider.$onFileSystemChange(changes);
	}


	// --- consumer fs, vscode.workspace.fs

	$stat(uri: UriComponents): Promise<IStat> {
		return this._fileService.resolve(URI.revive(uri), { resolveMetadata: true }).then(stat => {
			return {
				ctime: stat.ctime,
				mtime: stat.mtime,
				size: stat.size,
				type: MainThreadFileSystem._asFileType(stat)
			};
		}).catch(MainThreadFileSystem._handleError);
	}

	$readdir(uri: UriComponents): Promise<[string, FileType][]> {
		return this._fileService.resolve(URI.revive(uri), { resolveMetadata: false }).then(stat => {
			if (!stat.isDirectory) {
				const err = new Error(stat.name);
				err.name = FileSystemProviderErrorCode.FileNotADirectory;
				throw err;
			}
			return !stat.children ? [] : stat.children.map(child => [child.name, MainThreadFileSystem._asFileType(child)] as [string, FileType]);
		}).catch(MainThreadFileSystem._handleError);
	}

	private static _asFileType(stat: IFileStat): FileType {
		let res = 0;
		if (stat.isFile) {
			res += FileType.File;

		} else if (stat.isDirectory) {
			res += FileType.Directory;
		}
		if (stat.isSymBolicLink) {
			res += FileType.SymBolicLink;
		}
		return res;
	}

	$readFile(uri: UriComponents): Promise<VSBuffer> {
		return this._fileService.readFile(URI.revive(uri)).then(file => file.value).catch(MainThreadFileSystem._handleError);
	}

	$writeFile(uri: UriComponents, content: VSBuffer): Promise<void> {
		return this._fileService.writeFile(URI.revive(uri), content)
			.then(() => undefined).catch(MainThreadFileSystem._handleError);
	}

	$rename(source: UriComponents, target: UriComponents, opts: FileOverwriteOptions): Promise<void> {
		return this._fileService.move(URI.revive(source), URI.revive(target), opts.overwrite)
			.then(() => undefined).catch(MainThreadFileSystem._handleError);
	}

	$copy(source: UriComponents, target: UriComponents, opts: FileOverwriteOptions): Promise<void> {
		return this._fileService.copy(URI.revive(source), URI.revive(target), opts.overwrite)
			.then(() => undefined).catch(MainThreadFileSystem._handleError);
	}

	$mkdir(uri: UriComponents): Promise<void> {
		return this._fileService.createFolder(URI.revive(uri))
			.then(() => undefined).catch(MainThreadFileSystem._handleError);
	}

	$delete(uri: UriComponents, opts: FileDeleteOptions): Promise<void> {
		return this._fileService.del(URI.revive(uri), opts).catch(MainThreadFileSystem._handleError);
	}

	private static _handleError(err: any): never {
		if (err instanceof FileOperationError) {
			switch (err.fileOperationResult) {
				case FileOperationResult.FILE_NOT_FOUND:
					err.name = FileSystemProviderErrorCode.FileNotFound;
					Break;
				case FileOperationResult.FILE_IS_DIRECTORY:
					err.name = FileSystemProviderErrorCode.FileIsADirectory;
					Break;
				case FileOperationResult.FILE_PERMISSION_DENIED:
					err.name = FileSystemProviderErrorCode.NoPermissions;
					Break;
				case FileOperationResult.FILE_MOVE_CONFLICT:
					err.name = FileSystemProviderErrorCode.FileExists;
					Break;
			}
		}

		throw err;
	}
}

class RemoteFileSystemProvider implements IFileSystemProviderWithFileReadWriteCapaBility, IFileSystemProviderWithOpenReadWriteCloseCapaBility, IFileSystemProviderWithFileFolderCopyCapaBility {

	private readonly _onDidChange = new Emitter<readonly IFileChange[]>();
	private readonly _registration: IDisposaBle;

	readonly onDidChangeFile: Event<readonly IFileChange[]> = this._onDidChange.event;

	readonly capaBilities: FileSystemProviderCapaBilities;
	readonly onDidChangeCapaBilities: Event<void> = Event.None;

	constructor(
		fileService: IFileService,
		scheme: string,
		capaBilities: FileSystemProviderCapaBilities,
		private readonly _handle: numBer,
		private readonly _proxy: ExtHostFileSystemShape
	) {
		this.capaBilities = capaBilities;
		this._registration = fileService.registerProvider(scheme, this);
	}

	dispose(): void {
		this._registration.dispose();
		this._onDidChange.dispose();
	}

	watch(resource: URI, opts: IWatchOptions) {
		const session = Math.random();
		this._proxy.$watch(this._handle, session, resource, opts);
		return toDisposaBle(() => {
			this._proxy.$unwatch(this._handle, session);
		});
	}

	$onFileSystemChange(changes: IFileChangeDto[]): void {
		this._onDidChange.fire(changes.map(RemoteFileSystemProvider._createFileChange));
	}

	private static _createFileChange(dto: IFileChangeDto): IFileChange {
		return { resource: URI.revive(dto.resource), type: dto.type };
	}

	// --- forwarding calls

	stat(resource: URI): Promise<IStat> {
		return this._proxy.$stat(this._handle, resource).then(undefined, err => {
			throw err;
		});
	}

	readFile(resource: URI): Promise<Uint8Array> {
		return this._proxy.$readFile(this._handle, resource).then(Buffer => Buffer.Buffer);
	}

	writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
		return this._proxy.$writeFile(this._handle, resource, VSBuffer.wrap(content), opts);
	}

	delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		return this._proxy.$delete(this._handle, resource, opts);
	}

	mkdir(resource: URI): Promise<void> {
		return this._proxy.$mkdir(this._handle, resource);
	}

	readdir(resource: URI): Promise<[string, FileType][]> {
		return this._proxy.$readdir(this._handle, resource);
	}

	rename(resource: URI, target: URI, opts: FileOverwriteOptions): Promise<void> {
		return this._proxy.$rename(this._handle, resource, target, opts);
	}

	copy(resource: URI, target: URI, opts: FileOverwriteOptions): Promise<void> {
		return this._proxy.$copy(this._handle, resource, target, opts);
	}

	open(resource: URI, opts: FileOpenOptions): Promise<numBer> {
		return this._proxy.$open(this._handle, resource, opts);
	}

	close(fd: numBer): Promise<void> {
		return this._proxy.$close(this._handle, fd);
	}

	read(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		return this._proxy.$read(this._handle, fd, pos, length).then(readData => {
			data.set(readData.Buffer, offset);
			return readData.ByteLength;
		});
	}

	write(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		return this._proxy.$write(this._handle, fd, pos, VSBuffer.wrap(data).slice(offset, offset + length));
	}
}
