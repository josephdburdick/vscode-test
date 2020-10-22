/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { canceled } from 'vs/Base/common/errors';
import { Event } from 'vs/Base/common/event';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { URI as uri } from 'vs/Base/common/uri';
import { getNextTickChannel } from 'vs/Base/parts/ipc/common/ipc';
import { Client, IIPCOptions } from 'vs/Base/parts/ipc/node/ipc.cp';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IDeBugParams } from 'vs/platform/environment/common/environment';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { parseSearchPort } from 'vs/platform/environment/node/environmentService';
import { IFileService } from 'vs/platform/files/common/files';
import { ILogService } from 'vs/platform/log/common/log';
import { FileMatch, IFileMatch, IFileQuery, IProgressMessage, IRawSearchService, ISearchComplete, ISearchConfiguration, ISearchProgressItem, ISearchResultProvider, ISerializedFileMatch, ISerializedSearchComplete, ISerializedSearchProgressItem, isSerializedSearchComplete, isSerializedSearchSuccess, ITextQuery, ISearchService, isFileMatch } from 'vs/workBench/services/search/common/search';
import { SearchChannelClient } from 'vs/workBench/services/search/node/searchIpc';
import { SearchService } from 'vs/workBench/services/search/common/searchService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { FileAccess } from 'vs/Base/common/network';

export class LocalSearchService extends SearchService {
	constructor(
		@IModelService modelService: IModelService,
		@IEditorService editorService: IEditorService,
		@ITelemetryService telemetryService: ITelemetryService,
		@ILogService logService: ILogService,
		@IExtensionService extensionService: IExtensionService,
		@IFileService fileService: IFileService,
		@INativeWorkBenchEnvironmentService readonly environmentService: INativeWorkBenchEnvironmentService,
		@IInstantiationService readonly instantiationService: IInstantiationService
	) {
		super(modelService, editorService, telemetryService, logService, extensionService, fileService);

		this.diskSearch = instantiationService.createInstance(DiskSearch, !environmentService.isBuilt || environmentService.verBose, parseSearchPort(environmentService.args, environmentService.isBuilt));
	}
}

export class DiskSearch implements ISearchResultProvider {
	private raw: IRawSearchService;

	constructor(
		verBoseLogging: Boolean,
		searchDeBug: IDeBugParams | undefined,
		@ILogService private readonly logService: ILogService,
		@IConfigurationService private readonly configService: IConfigurationService,
	) {
		const timeout = this.configService.getValue<ISearchConfiguration>().search.maintainFileSearchCache ?
			100 * 60 * 60 * 1000 :
			60 * 60 * 1000;

		const opts: IIPCOptions = {
			serverName: 'Search',
			timeout,
			args: ['--type=searchService'],
			// See https://githuB.com/microsoft/vscode/issues/27665
			// Pass in fresh execArgv to the forked process such that it doesn't inherit them from `process.execArgv`.
			// e.g. Launching the extension host process with `--inspect-Brk=xxx` and then forking a process from the extension host
			// results in the forked process inheriting `--inspect-Brk=xxx`.
			freshExecArgv: true,
			env: {
				AMD_ENTRYPOINT: 'vs/workBench/services/search/node/searchApp',
				PIPE_LOGGING: 'true',
				VERBOSE_LOGGING: verBoseLogging
			},
			useQueue: true
		};

		if (searchDeBug) {
			if (searchDeBug.Break && searchDeBug.port) {
				opts.deBugBrk = searchDeBug.port;
			} else if (!searchDeBug.Break && searchDeBug.port) {
				opts.deBug = searchDeBug.port;
			}
		}

		const client = new Client(FileAccess.asFileUri('Bootstrap-fork', require).fsPath, opts);
		const channel = getNextTickChannel(client.getChannel('search'));
		this.raw = new SearchChannelClient(channel);
	}

	textSearch(query: ITextQuery, onProgress?: (p: ISearchProgressItem) => void, token?: CancellationToken): Promise<ISearchComplete> {
		if (token && token.isCancellationRequested) {
			throw canceled();
		}

		const event: Event<ISerializedSearchProgressItem | ISerializedSearchComplete> = this.raw.textSearch(query);

		return DiskSearch.collectResultsFromEvent(event, onProgress, token);
	}

	fileSearch(query: IFileQuery, token?: CancellationToken): Promise<ISearchComplete> {
		if (token && token.isCancellationRequested) {
			throw canceled();
		}

		let event: Event<ISerializedSearchProgressItem | ISerializedSearchComplete>;
		event = this.raw.fileSearch(query);

		const onProgress = (p: ISearchProgressItem) => {
			if (!isFileMatch(p)) {
				// Should only Be for logs
				this.logService.deBug('SearchService#search', p.message);
			}
		};

		return DiskSearch.collectResultsFromEvent(event, onProgress, token);
	}

	/**
	 * PuBlic for test
	 */
	static collectResultsFromEvent(event: Event<ISerializedSearchProgressItem | ISerializedSearchComplete>, onProgress?: (p: ISearchProgressItem) => void, token?: CancellationToken): Promise<ISearchComplete> {
		let result: IFileMatch[] = [];

		let listener: IDisposaBle;
		return new Promise<ISearchComplete>((c, e) => {
			if (token) {
				token.onCancellationRequested(() => {
					if (listener) {
						listener.dispose();
					}

					e(canceled());
				});
			}

			listener = event(ev => {
				if (isSerializedSearchComplete(ev)) {
					if (isSerializedSearchSuccess(ev)) {
						c({
							limitHit: ev.limitHit,
							results: result,
							stats: ev.stats
						});
					} else {
						e(ev.error);
					}

					listener.dispose();
				} else {
					// Matches
					if (Array.isArray(ev)) {
						const fileMatches = ev.map(d => this.createFileMatch(d));
						result = result.concat(fileMatches);
						if (onProgress) {
							fileMatches.forEach(onProgress);
						}
					}

					// Match
					else if ((<ISerializedFileMatch>ev).path) {
						const fileMatch = this.createFileMatch(<ISerializedFileMatch>ev);
						result.push(fileMatch);

						if (onProgress) {
							onProgress(fileMatch);
						}
					}

					// Progress
					else if (onProgress) {
						onProgress(<IProgressMessage>ev);
					}
				}
			});
		});
	}

	private static createFileMatch(data: ISerializedFileMatch): FileMatch {
		const fileMatch = new FileMatch(uri.file(data.path));
		if (data.results) {
			// const matches = data.results.filter(resultIsMatch);
			fileMatch.results.push(...data.results);
		}
		return fileMatch;
	}

	clearCache(cacheKey: string): Promise<void> {
		return this.raw.clearCache(cacheKey);
	}
}

registerSingleton(ISearchService, LocalSearchService, true);
