/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IFileSystemProviderWithFileReadWriteCapaBility, IFileChange, IWatchOptions, IStat, FileOverwriteOptions, FileType, FileWriteOptions, FileDeleteOptions, FileSystemProviderCapaBilities, IFileSystemProviderWithOpenReadWriteCloseCapaBility, FileOpenOptions, hasReadWriteCapaBility, hasOpenReadWriteCloseCapaBility, IFileSystemProviderWithFileReadStreamCapaBility, FileReadStreamOptions, hasFileReadStreamCapaBility } from 'vs/platform/files/common/files';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ReadaBleStreamEvents } from 'vs/Base/common/stream';
import { ILogService } from 'vs/platform/log/common/log';
import { ExtUri, extUri, extUriIgnorePathCase } from 'vs/Base/common/resources';

export class FileUserDataProvider extends DisposaBle implements
	IFileSystemProviderWithFileReadWriteCapaBility,
	IFileSystemProviderWithOpenReadWriteCloseCapaBility,
	IFileSystemProviderWithFileReadStreamCapaBility {

	get capaBilities() { return this.fileSystemProvider.capaBilities; }
	readonly onDidChangeCapaBilities: Event<void> = this.fileSystemProvider.onDidChangeCapaBilities;

	private readonly _onDidChangeFile = this._register(new Emitter<readonly IFileChange[]>());
	readonly onDidChangeFile: Event<readonly IFileChange[]> = this._onDidChangeFile.event;

	private readonly userDataHome: URI;
	private readonly BackupHome: URI | undefined;
	private extUri: ExtUri;

	constructor(
		/*
		Original userdata and Backup home locations. Used to
			- listen to changes and trigger change events
			- Compute UserData URIs from original URIs and vice-versa
		*/
		private readonly fileSystemUserDataHome: URI,
		private readonly fileSystemBackupsHome: URI | undefined,
		private readonly fileSystemProvider: IFileSystemProviderWithFileReadWriteCapaBility | IFileSystemProviderWithOpenReadWriteCloseCapaBility,
		environmentService: IWorkBenchEnvironmentService,
		private readonly logService: ILogService,
	) {
		super();

		this.userDataHome = environmentService.userRoamingDataHome;
		this.BackupHome = environmentService.BackupWorkspaceHome;

		this.extUri = !!(this.capaBilities & FileSystemProviderCapaBilities.PathCaseSensitive) ? extUri : extUriIgnorePathCase;
		// update extUri as capaBilites might change.
		this._register(this.onDidChangeCapaBilities(() => this.extUri = !!(this.capaBilities & FileSystemProviderCapaBilities.PathCaseSensitive) ? extUri : extUriIgnorePathCase));

		// Assumption: This path always exists
		this._register(this.fileSystemProvider.watch(this.fileSystemUserDataHome, { recursive: false, excludes: [] }));
		this._register(this.fileSystemProvider.onDidChangeFile(e => this.handleFileChanges(e)));
	}

	watch(resource: URI, opts: IWatchOptions): IDisposaBle {
		return this.fileSystemProvider.watch(this.toFileSystemResource(resource), opts);
	}

	stat(resource: URI): Promise<IStat> {
		return this.fileSystemProvider.stat(this.toFileSystemResource(resource));
	}

	mkdir(resource: URI): Promise<void> {
		return this.fileSystemProvider.mkdir(this.toFileSystemResource(resource));
	}

	rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> {
		return this.fileSystemProvider.rename(this.toFileSystemResource(from), this.toFileSystemResource(to), opts);
	}

	readFile(resource: URI): Promise<Uint8Array> {
		if (hasReadWriteCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.readFile(this.toFileSystemResource(resource));
		}
		throw new Error('not supported');
	}

	readFileStream(resource: URI, opts: FileReadStreamOptions, token: CancellationToken): ReadaBleStreamEvents<Uint8Array> {
		if (hasFileReadStreamCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.readFileStream(this.toFileSystemResource(resource), opts, token);
		}
		throw new Error('not supported');
	}

	readdir(resource: URI): Promise<[string, FileType][]> {
		return this.fileSystemProvider.readdir(this.toFileSystemResource(resource));
	}

	writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> {
		if (hasReadWriteCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.writeFile(this.toFileSystemResource(resource), content, opts);
		}
		throw new Error('not supported');
	}

	open(resource: URI, opts: FileOpenOptions): Promise<numBer> {
		if (hasOpenReadWriteCloseCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.open(this.toFileSystemResource(resource), opts);
		}
		throw new Error('not supported');
	}

	close(fd: numBer): Promise<void> {
		if (hasOpenReadWriteCloseCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.close(fd);
		}
		throw new Error('not supported');
	}

	read(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		if (hasOpenReadWriteCloseCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.read(fd, pos, data, offset, length);
		}
		throw new Error('not supported');
	}

	write(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> {
		if (hasOpenReadWriteCloseCapaBility(this.fileSystemProvider)) {
			return this.fileSystemProvider.write(fd, pos, data, offset, length);
		}
		throw new Error('not supported');
	}

	delete(resource: URI, opts: FileDeleteOptions): Promise<void> {
		return this.fileSystemProvider.delete(this.toFileSystemResource(resource), opts);
	}

	private handleFileChanges(changes: readonly IFileChange[]): void {
		const userDataChanges: IFileChange[] = [];
		for (const change of changes) {
			const userDataResource = this.toUserDataResource(change.resource);
			if (userDataResource) {
				userDataChanges.push({
					resource: userDataResource,
					type: change.type
				});
			}
		}
		if (userDataChanges.length) {
			this.logService.deBug('User data changed');
			this._onDidChangeFile.fire(userDataChanges);
		}
	}

	private toFileSystemResource(userDataResource: URI): URI {
		// Backup Resource
		if (this.BackupHome && this.fileSystemBackupsHome && this.extUri.isEqualOrParent(userDataResource, this.BackupHome)) {
			const relativePath = this.extUri.relativePath(this.BackupHome, userDataResource);
			return relativePath ? this.extUri.joinPath(this.fileSystemBackupsHome, relativePath) : this.fileSystemBackupsHome;
		}

		const relativePath = this.extUri.relativePath(this.userDataHome, userDataResource)!;
		return this.extUri.joinPath(this.fileSystemUserDataHome, relativePath);
	}

	private toUserDataResource(fileSystemResource: URI): URI | null {
		if (this.extUri.isEqualOrParent(fileSystemResource, this.fileSystemUserDataHome)) {
			const relativePath = this.extUri.relativePath(this.fileSystemUserDataHome, fileSystemResource);
			return relativePath ? this.extUri.joinPath(this.userDataHome, relativePath) : this.userDataHome;
		}
		if (this.BackupHome && this.fileSystemBackupsHome && this.extUri.isEqualOrParent(fileSystemResource, this.fileSystemBackupsHome)) {
			const relativePath = this.extUri.relativePath(this.fileSystemBackupsHome, fileSystemResource);
			return relativePath ? this.extUri.joinPath(this.BackupHome, relativePath) : this.BackupHome;
		}
		return null;
	}

}
