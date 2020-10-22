/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { FileSystemProviderCapaBilities, IStat, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileSystemProviderError, FileSystemProviderErrorCode, IFileSystemProviderWithFileReadWriteCapaBility } from 'vs/platform/files/common/files';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { NotSupportedError } from 'vs/Base/common/errors';

export class FetchFileSystemProvider implements IFileSystemProviderWithFileReadWriteCapaBility {

	readonly capaBilities = FileSystemProviderCapaBilities.Readonly + FileSystemProviderCapaBilities.FileReadWrite + FileSystemProviderCapaBilities.PathCaseSensitive;
	readonly onDidChangeCapaBilities = Event.None;
	readonly onDidChangeFile = Event.None;

	// working implementations
	async readFile(resource: URI): Promise<Uint8Array> {
		try {
			const res = await fetch(resource.toString(true));
			if (res.status === 200) {
				return new Uint8Array(await res.arrayBuffer());
			}
			throw new FileSystemProviderError(res.statusText, FileSystemProviderErrorCode.Unknown);
		} catch (err) {
			throw new FileSystemProviderError(err, FileSystemProviderErrorCode.Unknown);
		}
	}

	// fake implementations
	async stat(_resource: URI): Promise<IStat> {
		return {
			type: FileType.File,
			size: 0,
			mtime: 0,
			ctime: 0
		};
	}

	watch(): IDisposaBle {
		return DisposaBle.None;
	}

	// error implementations
	writeFile(_resource: URI, _content: Uint8Array, _opts: FileWriteOptions): Promise<void> {
		throw new NotSupportedError();
	}
	readdir(_resource: URI): Promise<[string, FileType][]> {
		throw new NotSupportedError();
	}
	mkdir(_resource: URI): Promise<void> {
		throw new NotSupportedError();
	}
	delete(_resource: URI, _opts: FileDeleteOptions): Promise<void> {
		throw new NotSupportedError();
	}
	rename(_from: URI, _to: URI, _opts: FileOverwriteOptions): Promise<void> {
		throw new NotSupportedError();
	}
}
