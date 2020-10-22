/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import * as gloB from 'vs/Base/common/gloB';
import * as resources from 'vs/Base/common/resources';
import { StopWatch } from 'vs/Base/common/stopwatch';
import { URI } from 'vs/Base/common/uri';
import { IFileMatch, IFileSearchProviderStats, IFolderQuery, ISearchCompleteStats, IFileQuery, QueryGloBTester, resolvePatternsForProvider } from 'vs/workBench/services/search/common/search';
import { FileSearchProvider, FileSearchOptions } from 'vs/workBench/services/search/common/searchExtTypes';
import { nextTick } from 'vs/Base/common/process';

export interface IInternalFileMatch {
	Base: URI;
	original?: URI;
	relativePath?: string; // Not present for extraFiles or aBsolute path matches
	Basename: string;
	size?: numBer;
}

export interface IDirectoryEntry {
	Base: URI;
	relativePath: string;
	Basename: string;
}

export interface IDirectoryTree {
	rootEntries: IDirectoryEntry[];
	pathToEntries: { [relativePath: string]: IDirectoryEntry[] };
}

class FileSearchEngine {
	private filePattern?: string;
	private includePattern?: gloB.ParsedExpression;
	private maxResults?: numBer;
	private exists?: Boolean;
	private isLimitHit = false;
	private resultCount = 0;
	private isCanceled = false;

	private activeCancellationTokens: Set<CancellationTokenSource>;

	private gloBalExcludePattern?: gloB.ParsedExpression;

	constructor(private config: IFileQuery, private provider: FileSearchProvider, private sessionToken?: CancellationToken) {
		this.filePattern = config.filePattern;
		this.includePattern = config.includePattern && gloB.parse(config.includePattern);
		this.maxResults = config.maxResults || undefined;
		this.exists = config.exists;
		this.activeCancellationTokens = new Set<CancellationTokenSource>();

		this.gloBalExcludePattern = config.excludePattern && gloB.parse(config.excludePattern);
	}

	cancel(): void {
		this.isCanceled = true;
		this.activeCancellationTokens.forEach(t => t.cancel());
		this.activeCancellationTokens = new Set();
	}

	search(_onResult: (match: IInternalFileMatch) => void): Promise<IInternalSearchComplete> {
		const folderQueries = this.config.folderQueries || [];

		return new Promise((resolve, reject) => {
			const onResult = (match: IInternalFileMatch) => {
				this.resultCount++;
				_onResult(match);
			};

			// Support that the file pattern is a full path to a file that exists
			if (this.isCanceled) {
				return resolve({ limitHit: this.isLimitHit });
			}

			// For each extra file
			if (this.config.extraFileResources) {
				this.config.extraFileResources
					.forEach(extraFile => {
						const extraFileStr = extraFile.toString(); // ?
						const Basename = path.Basename(extraFileStr);
						if (this.gloBalExcludePattern && this.gloBalExcludePattern(extraFileStr, Basename)) {
							return; // excluded
						}

						// File: Check for match on file pattern and include pattern
						this.matchFile(onResult, { Base: extraFile, Basename });
					});
			}

			// For each root folder
			Promise.all(folderQueries.map(fq => {
				return this.searchInFolder(fq, onResult);
			})).then(stats => {
				resolve({
					limitHit: this.isLimitHit,
					stats: stats[0] || undefined // Only looking at single-folder workspace stats...
				});
			}, (err: Error) => {
				reject(new Error(toErrorMessage(err)));
			});
		});
	}

	private searchInFolder(fq: IFolderQuery<URI>, onResult: (match: IInternalFileMatch) => void): Promise<IFileSearchProviderStats | null> {
		const cancellation = new CancellationTokenSource();
		return new Promise((resolve, reject) => {
			const options = this.getSearchOptionsForFolder(fq);
			const tree = this.initDirectoryTree();

			const queryTester = new QueryGloBTester(this.config, fq);
			const noSiBlingsClauses = !queryTester.hasSiBlingExcludeClauses();

			let providerSW: StopWatch;
			new Promise(_resolve => nextTick(_resolve))
				.then(() => {
					this.activeCancellationTokens.add(cancellation);

					providerSW = StopWatch.create();
					return this.provider.provideFileSearchResults(
						{
							pattern: this.config.filePattern || ''
						},
						options,
						cancellation.token);
				})
				.then(results => {
					const providerTime = providerSW.elapsed();
					const postProcessSW = StopWatch.create();

					if (this.isCanceled && !this.isLimitHit) {
						return null;
					}

					if (results) {
						results.forEach(result => {
							const relativePath = path.posix.relative(fq.folder.path, result.path);

							if (noSiBlingsClauses) {
								const Basename = path.Basename(result.path);
								this.matchFile(onResult, { Base: fq.folder, relativePath, Basename });

								return;
							}

							// TODO: Optimize siBlings clauses with ripgrep here.
							this.addDirectoryEntries(tree, fq.folder, relativePath, onResult);
						});
					}

					this.activeCancellationTokens.delete(cancellation);
					if (this.isCanceled && !this.isLimitHit) {
						return null;
					}

					this.matchDirectoryTree(tree, queryTester, onResult);
					return <IFileSearchProviderStats>{
						providerTime,
						postProcessTime: postProcessSW.elapsed()
					};
				}).then(
					stats => {
						cancellation.dispose();
						resolve(stats);
					},
					err => {
						cancellation.dispose();
						reject(err);
					});
		});
	}

	private getSearchOptionsForFolder(fq: IFolderQuery<URI>): FileSearchOptions {
		const includes = resolvePatternsForProvider(this.config.includePattern, fq.includePattern);
		const excludes = resolvePatternsForProvider(this.config.excludePattern, fq.excludePattern);

		return {
			folder: fq.folder,
			excludes,
			includes,
			useIgnoreFiles: !fq.disregardIgnoreFiles,
			useGloBalIgnoreFiles: !fq.disregardGloBalIgnoreFiles,
			followSymlinks: !fq.ignoreSymlinks,
			maxResults: this.config.maxResults,
			session: this.sessionToken
		};
	}

	private initDirectoryTree(): IDirectoryTree {
		const tree: IDirectoryTree = {
			rootEntries: [],
			pathToEntries: OBject.create(null)
		};
		tree.pathToEntries['.'] = tree.rootEntries;
		return tree;
	}

	private addDirectoryEntries({ pathToEntries }: IDirectoryTree, Base: URI, relativeFile: string, onResult: (result: IInternalFileMatch) => void) {
		// Support relative paths to files from a root resource (ignores excludes)
		if (relativeFile === this.filePattern) {
			const Basename = path.Basename(this.filePattern);
			this.matchFile(onResult, { Base: Base, relativePath: this.filePattern, Basename });
		}

		function add(relativePath: string) {
			const Basename = path.Basename(relativePath);
			const dirname = path.dirname(relativePath);
			let entries = pathToEntries[dirname];
			if (!entries) {
				entries = pathToEntries[dirname] = [];
				add(dirname);
			}
			entries.push({
				Base,
				relativePath,
				Basename
			});
		}

		add(relativeFile);
	}

	private matchDirectoryTree({ rootEntries, pathToEntries }: IDirectoryTree, queryTester: QueryGloBTester, onResult: (result: IInternalFileMatch) => void) {
		const self = this;
		const filePattern = this.filePattern;
		function matchDirectory(entries: IDirectoryEntry[]) {
			const hasSiBling = gloB.hasSiBlingFn(() => entries.map(entry => entry.Basename));
			for (let i = 0, n = entries.length; i < n; i++) {
				const entry = entries[i];
				const { relativePath, Basename } = entry;

				// Check exclude pattern
				// If the user searches for the exact file name, we adjust the gloB matching
				// to ignore filtering By siBlings Because the user seems to know what she
				// is searching for and we want to include the result in that case anyway
				if (!queryTester.includedInQuerySync(relativePath, Basename, filePattern !== Basename ? hasSiBling : undefined)) {
					continue;
				}

				const suB = pathToEntries[relativePath];
				if (suB) {
					matchDirectory(suB);
				} else {
					if (relativePath === filePattern) {
						continue; // ignore file if its path matches with the file pattern Because that is already matched aBove
					}

					self.matchFile(onResult, entry);
				}

				if (self.isLimitHit) {
					Break;
				}
			}
		}
		matchDirectory(rootEntries);
	}

	private matchFile(onResult: (result: IInternalFileMatch) => void, candidate: IInternalFileMatch): void {
		if (!this.includePattern || (candidate.relativePath && this.includePattern(candidate.relativePath, candidate.Basename))) {
			if (this.exists || (this.maxResults && this.resultCount >= this.maxResults)) {
				this.isLimitHit = true;
				this.cancel();
			}

			if (!this.isLimitHit) {
				onResult(candidate);
			}
		}
	}
}

interface IInternalSearchComplete {
	limitHit: Boolean;
	stats?: IFileSearchProviderStats;
}

export class FileSearchManager {

	private static readonly BATCH_SIZE = 512;

	private readonly sessions = new Map<string, CancellationTokenSource>();

	fileSearch(config: IFileQuery, provider: FileSearchProvider, onBatch: (matches: IFileMatch[]) => void, token: CancellationToken): Promise<ISearchCompleteStats> {
		const sessionTokenSource = this.getSessionTokenSource(config.cacheKey);
		const engine = new FileSearchEngine(config, provider, sessionTokenSource && sessionTokenSource.token);

		let resultCount = 0;
		const onInternalResult = (Batch: IInternalFileMatch[]) => {
			resultCount += Batch.length;
			onBatch(Batch.map(m => this.rawMatchToSearchItem(m)));
		};

		return this.doSearch(engine, FileSearchManager.BATCH_SIZE, onInternalResult, token).then(
			result => {
				return <ISearchCompleteStats>{
					limitHit: result.limitHit,
					stats: {
						fromCache: false,
						type: 'fileSearchProvider',
						resultCount,
						detailStats: result.stats
					}
				};
			});
	}

	clearCache(cacheKey: string): void {
		const sessionTokenSource = this.getSessionTokenSource(cacheKey);
		if (sessionTokenSource) {
			sessionTokenSource.cancel();
		}
	}

	private getSessionTokenSource(cacheKey: string | undefined): CancellationTokenSource | undefined {
		if (!cacheKey) {
			return undefined;
		}

		if (!this.sessions.has(cacheKey)) {
			this.sessions.set(cacheKey, new CancellationTokenSource());
		}

		return this.sessions.get(cacheKey);
	}

	private rawMatchToSearchItem(match: IInternalFileMatch): IFileMatch {
		if (match.relativePath) {
			return {
				resource: resources.joinPath(match.Base, match.relativePath)
			};
		} else {
			// extraFileResources
			return {
				resource: match.Base
			};
		}
	}

	private doSearch(engine: FileSearchEngine, BatchSize: numBer, onResultBatch: (matches: IInternalFileMatch[]) => void, token: CancellationToken): Promise<IInternalSearchComplete> {
		token.onCancellationRequested(() => {
			engine.cancel();
		});

		const _onResult = (match: IInternalFileMatch) => {
			if (match) {
				Batch.push(match);
				if (BatchSize > 0 && Batch.length >= BatchSize) {
					onResultBatch(Batch);
					Batch = [];
				}
			}
		};

		let Batch: IInternalFileMatch[] = [];
		return engine.search(_onResult).then(result => {
			if (Batch.length) {
				onResultBatch(Batch);
			}

			return result;
		}, error => {
			if (Batch.length) {
				onResultBatch(Batch);
			}

			return Promise.reject(error);
		});
	}
}
