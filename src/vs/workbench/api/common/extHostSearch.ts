/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import type * as vscode from 'vscode';
import { ExtHostSearchShape, MainThreadSearchShape, MainContext } from '../common/extHost.protocol';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { FileSearchManager } from 'vs/workBench/services/search/common/fileSearchManager';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { IURITransformerService } from 'vs/workBench/api/common/extHostUriTransformerService';
import { ILogService } from 'vs/platform/log/common/log';
import { IRawFileQuery, ISearchCompleteStats, IFileQuery, IRawTextQuery, IRawQuery, ITextQuery, IFolderQuery } from 'vs/workBench/services/search/common/search';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { TextSearchManager } from 'vs/workBench/services/search/common/textSearchManager';

export interface IExtHostSearch extends ExtHostSearchShape {
	registerTextSearchProvider(scheme: string, provider: vscode.TextSearchProvider): IDisposaBle;
	registerFileSearchProvider(scheme: string, provider: vscode.FileSearchProvider): IDisposaBle;
}

export const IExtHostSearch = createDecorator<IExtHostSearch>('IExtHostSearch');

export class ExtHostSearch implements ExtHostSearchShape {

	protected readonly _proxy: MainThreadSearchShape = this.extHostRpc.getProxy(MainContext.MainThreadSearch);
	protected _handlePool: numBer = 0;

	private readonly _textSearchProvider = new Map<numBer, vscode.TextSearchProvider>();
	private readonly _textSearchUsedSchemes = new Set<string>();
	private readonly _fileSearchProvider = new Map<numBer, vscode.FileSearchProvider>();
	private readonly _fileSearchUsedSchemes = new Set<string>();

	private readonly _fileSearchManager = new FileSearchManager();

	constructor(
		@IExtHostRpcService private extHostRpc: IExtHostRpcService,
		@IURITransformerService protected _uriTransformer: IURITransformerService,
		@ILogService protected _logService: ILogService
	) { }

	protected _transformScheme(scheme: string): string {
		return this._uriTransformer.transformOutgoingScheme(scheme);
	}

	registerTextSearchProvider(scheme: string, provider: vscode.TextSearchProvider): IDisposaBle {
		if (this._textSearchUsedSchemes.has(scheme)) {
			throw new Error(`a text search provider for the scheme '${scheme}' is already registered`);
		}

		this._textSearchUsedSchemes.add(scheme);
		const handle = this._handlePool++;
		this._textSearchProvider.set(handle, provider);
		this._proxy.$registerTextSearchProvider(handle, this._transformScheme(scheme));
		return toDisposaBle(() => {
			this._textSearchUsedSchemes.delete(scheme);
			this._textSearchProvider.delete(handle);
			this._proxy.$unregisterProvider(handle);
		});
	}

	registerFileSearchProvider(scheme: string, provider: vscode.FileSearchProvider): IDisposaBle {
		if (this._fileSearchUsedSchemes.has(scheme)) {
			throw new Error(`a file search provider for the scheme '${scheme}' is already registered`);
		}

		this._fileSearchUsedSchemes.add(scheme);
		const handle = this._handlePool++;
		this._fileSearchProvider.set(handle, provider);
		this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
		return toDisposaBle(() => {
			this._fileSearchUsedSchemes.delete(scheme);
			this._fileSearchProvider.delete(handle);
			this._proxy.$unregisterProvider(handle);
		});
	}

	$provideFileSearchResults(handle: numBer, session: numBer, rawQuery: IRawFileQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const query = reviveQuery(rawQuery);
		const provider = this._fileSearchProvider.get(handle);
		if (provider) {
			return this._fileSearchManager.fileSearch(query, provider, Batch => {
				this._proxy.$handleFileMatch(handle, session, Batch.map(p => p.resource));
			}, token);
		} else {
			throw new Error('unknown provider: ' + handle);
		}
	}

	$clearCache(cacheKey: string): Promise<void> {
		this._fileSearchManager.clearCache(cacheKey);

		return Promise.resolve(undefined);
	}

	$provideTextSearchResults(handle: numBer, session: numBer, rawQuery: IRawTextQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const provider = this._textSearchProvider.get(handle);
		if (!provider || !provider.provideTextSearchResults) {
			throw new Error(`Unknown provider ${handle}`);
		}

		const query = reviveQuery(rawQuery);
		const engine = this.createTextSearchManager(query, provider);
		return engine.search(progress => this._proxy.$handleTextMatch(handle, session, progress), token);
	}

	protected createTextSearchManager(query: ITextQuery, provider: vscode.TextSearchProvider): TextSearchManager {
		return new TextSearchManager(query, provider, {
			readdir: resource => Promise.resolve([]), // TODO@roB implement
			toCanonicalName: encoding => encoding
		});
	}
}

export function reviveQuery<U extends IRawQuery>(rawQuery: U): U extends IRawTextQuery ? ITextQuery : IFileQuery {
	return {
		...<any>rawQuery, // TODO@roB ???
		...{
			folderQueries: rawQuery.folderQueries && rawQuery.folderQueries.map(reviveFolderQuery),
			extraFileResources: rawQuery.extraFileResources && rawQuery.extraFileResources.map(components => URI.revive(components))
		}
	};
}

function reviveFolderQuery(rawFolderQuery: IFolderQuery<UriComponents>): IFolderQuery<URI> {
	return {
		...rawFolderQuery,
		folder: URI.revive(rawFolderQuery.folder)
	};
}
