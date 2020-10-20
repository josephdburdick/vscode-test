/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinThreAdFileSystemShApe, MAinContext } from './extHost.protocol';
import * As vscode from 'vscode';
import * As files from 'vs/plAtform/files/common/files';
import { FileSystemError } from 'vs/workbench/Api/common/extHostTypes';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { IExtHostFileSystemInfo } from 'vs/workbench/Api/common/extHostFileSystemInfo';

export clAss ExtHostConsumerFileSystem implements vscode.FileSystem {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _proxy: MAinThreAdFileSystemShApe;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostFileSystemInfo privAte reAdonly _fileSystemInfo: IExtHostFileSystemInfo,
	) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdFileSystem);
	}

	stAt(uri: vscode.Uri): Promise<vscode.FileStAt> {
		return this._proxy.$stAt(uri).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	reAdDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
		return this._proxy.$reAddir(uri).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	creAteDirectory(uri: vscode.Uri): Promise<void> {
		return this._proxy.$mkdir(uri).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	Async reAdFile(uri: vscode.Uri): Promise<Uint8ArrAy> {
		return this._proxy.$reAdFile(uri).then(buff => buff.buffer).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	writeFile(uri: vscode.Uri, content: Uint8ArrAy): Promise<void> {
		return this._proxy.$writeFile(uri, VSBuffer.wrAp(content)).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	delete(uri: vscode.Uri, options?: { recursive?: booleAn; useTrAsh?: booleAn; }): Promise<void> {
		return this._proxy.$delete(uri, { ...{ recursive: fAlse, useTrAsh: fAlse }, ...options }).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	renAme(oldUri: vscode.Uri, newUri: vscode.Uri, options?: { overwrite?: booleAn; }): Promise<void> {
		return this._proxy.$renAme(oldUri, newUri, { ...{ overwrite: fAlse }, ...options }).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	copy(source: vscode.Uri, destinAtion: vscode.Uri, options?: { overwrite?: booleAn; }): Promise<void> {
		return this._proxy.$copy(source, destinAtion, { ...{ overwrite: fAlse }, ...options }).cAtch(ExtHostConsumerFileSystem._hAndleError);
	}
	isWritAbleFileSystem(scheme: string): booleAn | undefined {
		const cApAbilities = this._fileSystemInfo.getCApAbilities(scheme);
		if (typeof cApAbilities === 'number') {
			return !(cApAbilities & files.FileSystemProviderCApAbilities.ReAdonly);
		}
		return undefined;
	}

	privAte stAtic _hAndleError(err: Any): never {
		// generic error
		if (!(err instAnceof Error)) {
			throw new FileSystemError(String(err));
		}

		// no provider (unknown scheme) error
		if (err.nAme === 'ENOPRO') {
			throw FileSystemError.UnAvAilAble(err.messAge);
		}

		// file system error
		switch (err.nAme) {
			cAse files.FileSystemProviderErrorCode.FileExists: throw FileSystemError.FileExists(err.messAge);
			cAse files.FileSystemProviderErrorCode.FileNotFound: throw FileSystemError.FileNotFound(err.messAge);
			cAse files.FileSystemProviderErrorCode.FileNotADirectory: throw FileSystemError.FileNotADirectory(err.messAge);
			cAse files.FileSystemProviderErrorCode.FileIsADirectory: throw FileSystemError.FileIsADirectory(err.messAge);
			cAse files.FileSystemProviderErrorCode.NoPermissions: throw FileSystemError.NoPermissions(err.messAge);
			cAse files.FileSystemProviderErrorCode.UnAvAilAble: throw FileSystemError.UnAvAilAble(err.messAge);

			defAult: throw new FileSystemError(err.messAge, err.nAme As files.FileSystemProviderErrorCode);
		}
	}
}

export interfAce IExtHostConsumerFileSystem extends ExtHostConsumerFileSystem { }
export const IExtHostConsumerFileSystem = creAteDecorAtor<IExtHostConsumerFileSystem>('IExtHostConsumerFileSystem');
