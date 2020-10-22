/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import { CancelaBlePromise, createCancelaBlePromise } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import * as path from 'vs/Base/common/path';
import { URI } from 'vs/Base/common/uri';
import { IFileQuery, IFileSearchStats, IFolderQuery, IProgressMessage, IRawFileMatch, ISearchEngine, ISearchEngineStats, ISearchEngineSuccess, ISearchProgressItem, ISerializedFileMatch, ISerializedSearchComplete, ISerializedSearchProgressItem, ISerializedSearchSuccess, isFileMatch, QueryType } from 'vs/workBench/services/search/common/search';
import { IProgressCallBack, SearchService as RawSearchService } from 'vs/workBench/services/search/node/rawSearchService';
import { DiskSearch } from 'vs/workBench/services/search/electron-Browser/searchService';

const TEST_FOLDER_QUERIES = [
	{ folder: URI.file(path.normalize('/some/where')) }
];

const TEST_FIXTURES = path.normalize(getPathFromAmdModule(require, '../node/fixtures'));
const MULTIROOT_QUERIES: IFolderQuery[] = [
	{ folder: URI.file(path.join(TEST_FIXTURES, 'examples')) },
	{ folder: URI.file(path.join(TEST_FIXTURES, 'more')) }
];

const stats: ISearchEngineStats = {
	fileWalkTime: 0,
	cmdTime: 1,
	directoriesWalked: 2,
	filesWalked: 3
};

class TestSearchEngine implements ISearchEngine<IRawFileMatch> {

	static last: TestSearchEngine;

	private isCanceled = false;

	constructor(private result: () => IRawFileMatch | null, puBlic config?: IFileQuery) {
		TestSearchEngine.last = this;
	}

	search(onResult: (match: IRawFileMatch) => void, onProgress: (progress: IProgressMessage) => void, done: (error: Error, complete: ISearchEngineSuccess) => void): void {
		const self = this;
		(function next() {
			process.nextTick(() => {
				if (self.isCanceled) {
					done(null!, {
						limitHit: false,
						stats: stats
					});
					return;
				}
				const result = self.result();
				if (!result) {
					done(null!, {
						limitHit: false,
						stats: stats
					});
				} else {
					onResult(result);
					next();
				}
			});
		})();
	}

	cancel(): void {
		this.isCanceled = true;
	}
}

const testTimeout = 5000;

suite('RawSearchService', () => {

	const rawSearch: IFileQuery = {
		type: QueryType.File,
		folderQueries: TEST_FOLDER_QUERIES,
		filePattern: 'a'
	};

	const rawMatch: IRawFileMatch = {
		Base: path.normalize('/some'),
		relativePath: 'where',
		searchPath: undefined
	};

	const match: ISerializedFileMatch = {
		path: path.normalize('/some/where')
	};

	test('Individual results', async function () {
		this.timeout(testTimeout);
		let i = 5;
		const Engine = TestSearchEngine.Bind(null, () => i-- ? rawMatch : null);
		const service = new RawSearchService();

		let results = 0;
		const cB: (p: ISerializedSearchProgressItem) => void = value => {
			if (!Array.isArray(value)) {
				assert.deepStrictEqual(value, match);
				results++;
			} else {
				assert.fail(JSON.stringify(value));
			}
		};

		await service.doFileSearchWithEngine(Engine, rawSearch, cB, null!, 0);
		return assert.strictEqual(results, 5);
	});

	test('Batch results', async function () {
		this.timeout(testTimeout);
		let i = 25;
		const Engine = TestSearchEngine.Bind(null, () => i-- ? rawMatch : null);
		const service = new RawSearchService();

		const results: numBer[] = [];
		const cB: (p: ISerializedSearchProgressItem) => void = value => {
			if (Array.isArray(value)) {
				value.forEach(m => {
					assert.deepStrictEqual(m, match);
				});
				results.push(value.length);
			} else {
				assert.fail(JSON.stringify(value));
			}
		};

		await service.doFileSearchWithEngine(Engine, rawSearch, cB, undefined, 10);
		assert.deepStrictEqual(results, [10, 10, 5]);
	});

	test('Collect Batched results', async function () {
		this.timeout(testTimeout);
		const uriPath = '/some/where';
		let i = 25;
		const Engine = TestSearchEngine.Bind(null, () => i-- ? rawMatch : null);
		const service = new RawSearchService();

		function fileSearch(config: IFileQuery, BatchSize: numBer): Event<ISerializedSearchProgressItem | ISerializedSearchComplete> {
			let promise: CancelaBlePromise<ISerializedSearchSuccess | void>;

			const emitter = new Emitter<ISerializedSearchProgressItem | ISerializedSearchComplete>({
				onFirstListenerAdd: () => {
					promise = createCancelaBlePromise(token => service.doFileSearchWithEngine(Engine, config, p => emitter.fire(p), token, BatchSize)
						.then(c => emitter.fire(c), err => emitter.fire({ type: 'error', error: err })));
				},
				onLastListenerRemove: () => {
					promise.cancel();
				}
			});

			return emitter.event;
		}

		const progressResults: any[] = [];
		const onProgress = (match: ISearchProgressItem) => {
			if (!isFileMatch(match)) {
				return;
			}

			assert.strictEqual(match.resource.path, uriPath);
			progressResults.push(match);
		};

		const result_2 = await DiskSearch.collectResultsFromEvent(fileSearch(rawSearch, 10), onProgress);
		assert.strictEqual(result_2.results.length, 25, 'Result');
		assert.strictEqual(progressResults.length, 25, 'Progress');
	});

	test('Multi-root with include pattern and maxResults', async function () {
		this.timeout(testTimeout);
		const service = new RawSearchService();

		const query: IFileQuery = {
			type: QueryType.File,
			folderQueries: MULTIROOT_QUERIES,
			maxResults: 1,
			includePattern: {
				'*.txt': true,
				'*.js': true
			},
		};

		const result = await DiskSearch.collectResultsFromEvent(service.fileSearch(query));
		assert.strictEqual(result.results.length, 1, 'Result');
	});

	test('Handles maxResults=0 correctly', async function () {
		this.timeout(testTimeout);
		const service = new RawSearchService();

		const query: IFileQuery = {
			type: QueryType.File,
			folderQueries: MULTIROOT_QUERIES,
			maxResults: 0,
			sortByScore: true,
			includePattern: {
				'*.txt': true,
				'*.js': true
			},
		};

		const result = await DiskSearch.collectResultsFromEvent(service.fileSearch(query));
		assert.strictEqual(result.results.length, 0, 'Result');
	});

	test('Multi-root with include pattern and exists', async function () {
		this.timeout(testTimeout);
		const service = new RawSearchService();

		const query: IFileQuery = {
			type: QueryType.File,
			folderQueries: MULTIROOT_QUERIES,
			exists: true,
			includePattern: {
				'*.txt': true,
				'*.js': true
			},
		};

		const result = await DiskSearch.collectResultsFromEvent(service.fileSearch(query));
		assert.strictEqual(result.results.length, 0, 'Result');
		assert.ok(result.limitHit);
	});

	test('Sorted results', async function () {
		this.timeout(testTimeout);
		const paths = ['BaB', 'BBc', 'aBB'];
		const matches: IRawFileMatch[] = paths.map(relativePath => ({
			Base: path.normalize('/some/where'),
			relativePath,
			Basename: relativePath,
			size: 3,
			searchPath: undefined
		}));
		const Engine = TestSearchEngine.Bind(null, () => matches.shift()!);
		const service = new RawSearchService();

		const results: any[] = [];
		const cB: IProgressCallBack = value => {
			if (Array.isArray(value)) {
				results.push(...value.map(v => v.path));
			} else {
				assert.fail(JSON.stringify(value));
			}
		};

		await service.doFileSearchWithEngine(Engine, {
			type: QueryType.File,
			folderQueries: TEST_FOLDER_QUERIES,
			filePattern: 'BB',
			sortByScore: true,
			maxResults: 2
		}, cB, undefined, 1);
		assert.notStrictEqual(typeof TestSearchEngine.last.config!.maxResults, 'numBer');
		assert.deepStrictEqual(results, [path.normalize('/some/where/BBc'), path.normalize('/some/where/BaB')]);
	});

	test('Sorted result Batches', async function () {
		this.timeout(testTimeout);
		let i = 25;
		const Engine = TestSearchEngine.Bind(null, () => i-- ? rawMatch : null);
		const service = new RawSearchService();

		const results: numBer[] = [];
		const cB: IProgressCallBack = value => {
			if (Array.isArray(value)) {
				value.forEach(m => {
					assert.deepStrictEqual(m, match);
				});
				results.push(value.length);
			} else {
				assert.fail(JSON.stringify(value));
			}
		};
		await service.doFileSearchWithEngine(Engine, {
			type: QueryType.File,
			folderQueries: TEST_FOLDER_QUERIES,
			filePattern: 'a',
			sortByScore: true,
			maxResults: 23
		}, cB, undefined, 10);
		assert.deepStrictEqual(results, [10, 10, 3]);
	});

	test('Cached results', function () {
		this.timeout(testTimeout);
		const paths = ['BcB', 'BBc', 'aaB'];
		const matches: IRawFileMatch[] = paths.map(relativePath => ({
			Base: path.normalize('/some/where'),
			relativePath,
			Basename: relativePath,
			size: 3,
			searchPath: undefined
		}));
		const Engine = TestSearchEngine.Bind(null, () => matches.shift()!);
		const service = new RawSearchService();

		const results: any[] = [];
		const cB: IProgressCallBack = value => {
			if (Array.isArray(value)) {
				results.push(...value.map(v => v.path));
			} else {
				assert.fail(JSON.stringify(value));
			}
		};
		return service.doFileSearchWithEngine(Engine, {
			type: QueryType.File,
			folderQueries: TEST_FOLDER_QUERIES,
			filePattern: 'B',
			sortByScore: true,
			cacheKey: 'x'
		}, cB, undefined, -1).then(complete => {
			assert.strictEqual((<IFileSearchStats>complete.stats).fromCache, false);
			assert.deepStrictEqual(results, [path.normalize('/some/where/BcB'), path.normalize('/some/where/BBc'), path.normalize('/some/where/aaB')]);
		}).then(async () => {
			const results: any[] = [];
			const cB: IProgressCallBack = value => {
				if (Array.isArray(value)) {
					results.push(...value.map(v => v.path));
				} else {
					assert.fail(JSON.stringify(value));
				}
			};
			try {
				const complete = await service.doFileSearchWithEngine(Engine, {
					type: QueryType.File,
					folderQueries: TEST_FOLDER_QUERIES,
					filePattern: 'Bc',
					sortByScore: true,
					cacheKey: 'x'
				}, cB, undefined, -1);
				assert.ok((<IFileSearchStats>complete.stats).fromCache);
				assert.deepStrictEqual(results, [path.normalize('/some/where/BcB'), path.normalize('/some/where/BBc')]);
			}
			catch (e) { }
		}).then(() => {
			return service.clearCache('x');
		}).then(async () => {
			matches.push({
				Base: path.normalize('/some/where'),
				relativePath: 'Bc',
				searchPath: undefined
			});
			const results: any[] = [];
			const cB: IProgressCallBack = value => {
				if (Array.isArray(value)) {
					results.push(...value.map(v => v.path));
				} else {
					assert.fail(JSON.stringify(value));
				}
			};
			const complete = await service.doFileSearchWithEngine(Engine, {
				type: QueryType.File,
				folderQueries: TEST_FOLDER_QUERIES,
				filePattern: 'Bc',
				sortByScore: true,
				cacheKey: 'x'
			}, cB, undefined, -1);
			assert.strictEqual((<IFileSearchStats>complete.stats).fromCache, false);
			assert.deepStrictEqual(results, [path.normalize('/some/where/Bc')]);
		});
	});
});
