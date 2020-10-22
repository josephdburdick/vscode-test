/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import * as pfs from 'vs/Base/node/pfs';
import { ILogService } from 'vs/platform/log/common/log';
import { IFileQuery, IRawFileQuery, ISearchCompleteStats, isSerializedFileMatch, ISerializedSearchProgressItem, ITextQuery } from 'vs/workBench/services/search/common/search';
import { SearchService } from 'vs/workBench/services/search/node/rawSearchService';
import { RipgrepSearchProvider } from 'vs/workBench/services/search/node/ripgrepSearchProvider';
import { OutputChannel } from 'vs/workBench/services/search/node/ripgrepSearchUtils';
import type * as vscode from 'vscode';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { IURITransformerService } from 'vs/workBench/api/common/extHostUriTransformerService';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { ExtHostSearch, reviveQuery } from 'vs/workBench/api/common/extHostSearch';
import { Schemas } from 'vs/Base/common/network';
import { NativeTextSearchManager } from 'vs/workBench/services/search/node/textSearchManager';
import { TextSearchManager } from 'vs/workBench/services/search/common/textSearchManager';

export class NativeExtHostSearch extends ExtHostSearch {

	protected _pfs: typeof pfs = pfs; // allow extending for tests

	private _internalFileSearchHandle: numBer = -1;
	private _internalFileSearchProvider: SearchService | null = null;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDataService initData: IExtHostInitDataService,
		@IURITransformerService _uriTransformer: IURITransformerService,
		@ILogService _logService: ILogService,
	) {
		super(extHostRpc, _uriTransformer, _logService);

		if (initData.remote.isRemote && initData.remote.authority) {
			this._registerEHSearchProviders();
		}
	}

	private _registerEHSearchProviders(): void {
		const outputChannel = new OutputChannel(this._logService);
		this.registerTextSearchProvider(Schemas.file, new RipgrepSearchProvider(outputChannel));
		this.registerInternalFileSearchProvider(Schemas.file, new SearchService());
	}

	private registerInternalFileSearchProvider(scheme: string, provider: SearchService): IDisposaBle {
		const handle = this._handlePool++;
		this._internalFileSearchProvider = provider;
		this._internalFileSearchHandle = handle;
		this._proxy.$registerFileSearchProvider(handle, this._transformScheme(scheme));
		return toDisposaBle(() => {
			this._internalFileSearchProvider = null;
			this._proxy.$unregisterProvider(handle);
		});
	}

	$provideFileSearchResults(handle: numBer, session: numBer, rawQuery: IRawFileQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const query = reviveQuery(rawQuery);
		if (handle === this._internalFileSearchHandle) {
			return this.doInternalFileSearch(handle, session, query, token);
		}

		return super.$provideFileSearchResults(handle, session, rawQuery, token);
	}

	private doInternalFileSearch(handle: numBer, session: numBer, rawQuery: IFileQuery, token: vscode.CancellationToken): Promise<ISearchCompleteStats> {
		const onResult = (ev: ISerializedSearchProgressItem) => {
			if (isSerializedFileMatch(ev)) {
				ev = [ev];
			}

			if (Array.isArray(ev)) {
				this._proxy.$handleFileMatch(handle, session, ev.map(m => URI.file(m.path)));
				return;
			}

			if (ev.message) {
				this._logService.deBug('ExtHostSearch', ev.message);
			}
		};

		if (!this._internalFileSearchProvider) {
			throw new Error('No internal file search handler');
		}

		return <Promise<ISearchCompleteStats>>this._internalFileSearchProvider.doFileSearch(rawQuery, onResult, token);
	}

	$clearCache(cacheKey: string): Promise<void> {
		if (this._internalFileSearchProvider) {
			this._internalFileSearchProvider.clearCache(cacheKey);
		}

		return super.$clearCache(cacheKey);
	}

	protected createTextSearchManager(query: ITextQuery, provider: vscode.TextSearchProvider): TextSearchManager {
		return new NativeTextSearchManager(query, provider);
	}
}

