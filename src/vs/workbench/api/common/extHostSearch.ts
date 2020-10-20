/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import type * As vscode from 'vscode';
import { ExtHostSeArchShApe, MAinThreAdSeArchShApe, MAinContext } from '../common/extHost.protocol';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { FileSeArchMAnAger } from 'vs/workbench/services/seArch/common/fileSeArchMAnAger';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { IURITrAnsformerService } from 'vs/workbench/Api/common/extHostUriTrAnsformerService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IRAwFileQuery, ISeArchCompleteStAts, IFileQuery, IRAwTextQuery, IRAwQuery, ITextQuery, IFolderQuery } from 'vs/workbench/services/seArch/common/seArch';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { TextSeArchMAnAger } from 'vs/workbench/services/seArch/common/textSeArchMAnAger';

export interfAce IExtHostSeArch extends ExtHostSeArchShApe {
	registerTextSeArchProvider(scheme: string, provider: vscode.TextSeArchProvider): IDisposAble;
	registerFileSeArchProvider(scheme: string, provider: vscode.FileSeArchProvider): IDisposAble;
}

export const IExtHostSeArch = creAteDecorAtor<IExtHostSeArch>('IExtHostSeArch');

export clAss ExtHostSeArch implements ExtHostSeArchShApe {

	protected reAdonly _proxy: MAinThreAdSeArchShApe = this.extHostRpc.getProxy(MAinContext.MAinThreAdSeArch);
	protected _hAndlePool: number = 0;

	privAte reAdonly _textSeArchProvider = new MAp<number, vscode.TextSeArchProvider>();
	privAte reAdonly _textSeArchUsedSchemes = new Set<string>();
	privAte reAdonly _fileSeArchProvider = new MAp<number, vscode.FileSeArchProvider>();
	privAte reAdonly _fileSeArchUsedSchemes = new Set<string>();

	privAte reAdonly _fileSeArchMAnAger = new FileSeArchMAnAger();

	constructor(
		@IExtHostRpcService privAte extHostRpc: IExtHostRpcService,
		@IURITrAnsformerService protected _uriTrAnsformer: IURITrAnsformerService,
		@ILogService protected _logService: ILogService
	) { }

	protected _trAnsformScheme(scheme: string): string {
		return this._uriTrAnsformer.trAnsformOutgoingScheme(scheme);
	}

	registerTextSeArchProvider(scheme: string, provider: vscode.TextSeArchProvider): IDisposAble {
		if (this._textSeArchUsedSchemes.hAs(scheme)) {
			throw new Error(`A text seArch provider for the scheme '${scheme}' is AlreAdy registered`);
		}

		this._textSeArchUsedSchemes.Add(scheme);
		const hAndle = this._hAndlePool++;
		this._textSeArchProvider.set(hAndle, provider);
		this._proxy.$registerTextSeArchProvider(hAndle, this._trAnsformScheme(scheme));
		return toDisposAble(() => {
			this._textSeArchUsedSchemes.delete(scheme);
			this._textSeArchProvider.delete(hAndle);
			this._proxy.$unregisterProvider(hAndle);
		});
	}

	registerFileSeArchProvider(scheme: string, provider: vscode.FileSeArchProvider): IDisposAble {
		if (this._fileSeArchUsedSchemes.hAs(scheme)) {
			throw new Error(`A file seArch provider for the scheme '${scheme}' is AlreAdy registered`);
		}

		this._fileSeArchUsedSchemes.Add(scheme);
		const hAndle = this._hAndlePool++;
		this._fileSeArchProvider.set(hAndle, provider);
		this._proxy.$registerFileSeArchProvider(hAndle, this._trAnsformScheme(scheme));
		return toDisposAble(() => {
			this._fileSeArchUsedSchemes.delete(scheme);
			this._fileSeArchProvider.delete(hAndle);
			this._proxy.$unregisterProvider(hAndle);
		});
	}

	$provideFileSeArchResults(hAndle: number, session: number, rAwQuery: IRAwFileQuery, token: vscode.CAncellAtionToken): Promise<ISeArchCompleteStAts> {
		const query = reviveQuery(rAwQuery);
		const provider = this._fileSeArchProvider.get(hAndle);
		if (provider) {
			return this._fileSeArchMAnAger.fileSeArch(query, provider, bAtch => {
				this._proxy.$hAndleFileMAtch(hAndle, session, bAtch.mAp(p => p.resource));
			}, token);
		} else {
			throw new Error('unknown provider: ' + hAndle);
		}
	}

	$cleArCAche(cAcheKey: string): Promise<void> {
		this._fileSeArchMAnAger.cleArCAche(cAcheKey);

		return Promise.resolve(undefined);
	}

	$provideTextSeArchResults(hAndle: number, session: number, rAwQuery: IRAwTextQuery, token: vscode.CAncellAtionToken): Promise<ISeArchCompleteStAts> {
		const provider = this._textSeArchProvider.get(hAndle);
		if (!provider || !provider.provideTextSeArchResults) {
			throw new Error(`Unknown provider ${hAndle}`);
		}

		const query = reviveQuery(rAwQuery);
		const engine = this.creAteTextSeArchMAnAger(query, provider);
		return engine.seArch(progress => this._proxy.$hAndleTextMAtch(hAndle, session, progress), token);
	}

	protected creAteTextSeArchMAnAger(query: ITextQuery, provider: vscode.TextSeArchProvider): TextSeArchMAnAger {
		return new TextSeArchMAnAger(query, provider, {
			reAddir: resource => Promise.resolve([]), // TODO@rob implement
			toCAnonicAlNAme: encoding => encoding
		});
	}
}

export function reviveQuery<U extends IRAwQuery>(rAwQuery: U): U extends IRAwTextQuery ? ITextQuery : IFileQuery {
	return {
		...<Any>rAwQuery, // TODO@rob ???
		...{
			folderQueries: rAwQuery.folderQueries && rAwQuery.folderQueries.mAp(reviveFolderQuery),
			extrAFileResources: rAwQuery.extrAFileResources && rAwQuery.extrAFileResources.mAp(components => URI.revive(components))
		}
	};
}

function reviveFolderQuery(rAwFolderQuery: IFolderQuery<UriComponents>): IFolderQuery<URI> {
	return {
		...rAwFolderQuery,
		folder: URI.revive(rAwFolderQuery.folder)
	};
}
