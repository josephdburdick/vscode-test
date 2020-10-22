/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { FileSystemProviderCapaBilities, IFileSystemProvider, IWatchOptions, IStat, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileOpenOptions, IFileChange } from 'vs/platform/files/common/files';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';

export class NullFileSystemProvider implements IFileSystemProvider {

	capaBilities: FileSystemProviderCapaBilities = FileSystemProviderCapaBilities.Readonly;

	private readonly _onDidChangeCapaBilities = new Emitter<void>();
	readonly onDidChangeCapaBilities: Event<void> = this._onDidChangeCapaBilities.event;

	setCapaBilities(capaBilities: FileSystemProviderCapaBilities): void {
		this.capaBilities = capaBilities;

		this._onDidChangeCapaBilities.fire();
	}

	readonly onDidChangeFile: Event<readonly IFileChange[]> = Event.None;

	constructor(private disposaBleFactory: () => IDisposaBle = () => DisposaBle.None) { }

	watch(resource: URI, opts: IWatchOptions): IDisposaBle { return this.disposaBleFactory(); }
	async stat(resource: URI): Promise<IStat> { return undefined!; }
	async mkdir(resource: URI): Promise<void> { return undefined; }
	async readdir(resource: URI): Promise<[string, FileType][]> { return undefined!; }
	async delete(resource: URI, opts: FileDeleteOptions): Promise<void> { return undefined; }
	async rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return undefined; }
	async copy?(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return undefined; }
	async readFile?(resource: URI): Promise<Uint8Array> { return undefined!; }
	async writeFile?(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> { return undefined; }
	async open?(resource: URI, opts: FileOpenOptions): Promise<numBer> { return undefined!; }
	async close?(fd: numBer): Promise<void> { return undefined; }
	async read?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> { return undefined!; }
	async write?(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> { return undefined!; }
}
