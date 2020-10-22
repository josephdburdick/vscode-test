/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { mapArrayOrNot } from 'vs/Base/common/arrays';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { isPromiseCanceledError } from 'vs/Base/common/errors';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { joinPath } from 'vs/Base/common/resources';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as pfs from 'vs/Base/node/pfs';
import { MainContext, MainThreadSearchShape } from 'vs/workBench/api/common/extHost.protocol';
import { NativeExtHostSearch } from 'vs/workBench/api/node/extHostSearch';
import { Range } from 'vs/workBench/api/common/extHostTypes';
import { IFileMatch, IFileQuery, IPatternInfo, IRawFileMatch2, ISearchCompleteStats, ISearchQuery, ITextQuery, QueryType, resultIsMatch } from 'vs/workBench/services/search/common/search';
import { TestRPCProtocol } from 'vs/workBench/test/Browser/api/testRPCProtocol';
import type * as vscode from 'vscode';
import { NullLogService } from 'vs/platform/log/common/log';
import { URITransformerService } from 'vs/workBench/api/common/extHostUriTransformerService';
import { mock } from 'vs/Base/test/common/mock';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { TextSearchManager } from 'vs/workBench/services/search/common/textSearchManager';
import { NativeTextSearchManager } from 'vs/workBench/services/search/node/textSearchManager';

let rpcProtocol: TestRPCProtocol;
let extHostSearch: NativeExtHostSearch;
const disposaBles = new DisposaBleStore();

let mockMainThreadSearch: MockMainThreadSearch;
class MockMainThreadSearch implements MainThreadSearchShape {
	lastHandle!: numBer;

	results: Array<UriComponents | IRawFileMatch2> = [];

	$registerFileSearchProvider(handle: numBer, scheme: string): void {
		this.lastHandle = handle;
	}

	$registerTextSearchProvider(handle: numBer, scheme: string): void {
		this.lastHandle = handle;
	}

	$unregisterProvider(handle: numBer): void {
	}

	$handleFileMatch(handle: numBer, session: numBer, data: UriComponents[]): void {
		this.results.push(...data);
	}

	$handleTextMatch(handle: numBer, session: numBer, data: IRawFileMatch2[]): void {
		this.results.push(...data);
	}

	$handleTelemetry(eventName: string, data: any): void {
	}

	dispose() {
	}
}

let mockPFS: Partial<typeof pfs>;

export function extensionResultIsMatch(data: vscode.TextSearchResult): data is vscode.TextSearchMatch {
	return !!(<vscode.TextSearchMatch>data).preview;
}

suite('ExtHostSearch', () => {
	async function registerTestTextSearchProvider(provider: vscode.TextSearchProvider, scheme = 'file'): Promise<void> {
		disposaBles.add(extHostSearch.registerTextSearchProvider(scheme, provider));
		await rpcProtocol.sync();
	}

	async function registerTestFileSearchProvider(provider: vscode.FileSearchProvider, scheme = 'file'): Promise<void> {
		disposaBles.add(extHostSearch.registerFileSearchProvider(scheme, provider));
		await rpcProtocol.sync();
	}

	async function runFileSearch(query: IFileQuery, cancel = false): Promise<{ results: URI[]; stats: ISearchCompleteStats }> {
		let stats: ISearchCompleteStats;
		try {
			const cancellation = new CancellationTokenSource();
			const p = extHostSearch.$provideFileSearchResults(mockMainThreadSearch.lastHandle, 0, query, cancellation.token);
			if (cancel) {
				await new Promise(resolve => process.nextTick(resolve));
				cancellation.cancel();
			}

			stats = await p;
		} catch (err) {
			if (!isPromiseCanceledError(err)) {
				await rpcProtocol.sync();
				throw err;
			}
		}

		await rpcProtocol.sync();
		return {
			results: (<UriComponents[]>mockMainThreadSearch.results).map(r => URI.revive(r)),
			stats: stats!
		};
	}

	async function runTextSearch(query: ITextQuery, cancel = false): Promise<{ results: IFileMatch[], stats: ISearchCompleteStats }> {
		let stats: ISearchCompleteStats;
		try {
			const cancellation = new CancellationTokenSource();
			const p = extHostSearch.$provideTextSearchResults(mockMainThreadSearch.lastHandle, 0, query, cancellation.token);
			if (cancel) {
				await new Promise(resolve => process.nextTick(resolve));
				cancellation.cancel();
			}

			stats = await p;
		} catch (err) {
			if (!isPromiseCanceledError(err)) {
				await rpcProtocol.sync();
				throw err;
			}
		}

		await rpcProtocol.sync();
		const results = (<IRawFileMatch2[]>mockMainThreadSearch.results).map(r => ({
			...r,
			...{
				resource: URI.revive(r.resource)
			}
		}));

		return { results, stats: stats! };
	}

	setup(() => {
		rpcProtocol = new TestRPCProtocol();

		mockMainThreadSearch = new MockMainThreadSearch();
		const logService = new NullLogService();

		rpcProtocol.set(MainContext.MainThreadSearch, mockMainThreadSearch);

		mockPFS = {};
		extHostSearch = new class extends NativeExtHostSearch {
			constructor() {
				super(
					rpcProtocol,
					new class extends mock<IExtHostInitDataService>() { remote = { isRemote: false, authority: undefined, connectionData: null }; },
					new URITransformerService(null),
					logService
				);
				this._pfs = mockPFS as any;
			}

			protected createTextSearchManager(query: ITextQuery, provider: vscode.TextSearchProvider): TextSearchManager {
				return new NativeTextSearchManager(query, provider, this._pfs);
			}
		};
	});

	teardown(() => {
		disposaBles.clear();
		return rpcProtocol.sync();
	});

	const rootFolderA = URI.file('/foo/Bar1');
	const rootFolderB = URI.file('/foo/Bar2');
	const fancyScheme = 'fancy';
	const fancySchemeFolderA = URI.from({ scheme: fancyScheme, path: '/project/folder1' });

	suite('File:', () => {

		function getSimpleQuery(filePattern = ''): IFileQuery {
			return {
				type: QueryType.File,

				filePattern,
				folderQueries: [
					{ folder: rootFolderA }
				]
			};
		}

		function compareURIs(actual: URI[], expected: URI[]) {
			const sortAndStringify = (arr: URI[]) => arr.sort().map(u => u.toString());

			assert.deepEqual(
				sortAndStringify(actual),
				sortAndStringify(expected));
		}

		test('no results', async () => {
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return Promise.resolve(null!);
				}
			});

			const { results, stats } = await runFileSearch(getSimpleQuery());
			assert(!stats.limitHit);
			assert(!results.length);
		});

		test('simple results', async () => {
			const reportedResults = [
				joinPath(rootFolderA, 'file1.ts'),
				joinPath(rootFolderA, 'file2.ts'),
				joinPath(rootFolderA, 'suBfolder/file3.ts')
			];

			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return Promise.resolve(reportedResults);
				}
			});

			const { results, stats } = await runFileSearch(getSimpleQuery());
			assert(!stats.limitHit);
			assert.equal(results.length, 3);
			compareURIs(results, reportedResults);
		});

		test('Search canceled', async () => {
			let cancelRequested = false;
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return new Promise((resolve, reject) => {
						token.onCancellationRequested(() => {
							cancelRequested = true;

							resolve([joinPath(options.folder, 'file1.ts')]); // or reject or nothing?
						});
					});
				}
			});

			const { results } = await runFileSearch(getSimpleQuery(), true);
			assert(cancelRequested);
			assert(!results.length);
		});

		test('provider returns null', async () => {
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return null!;
				}
			});

			try {
				await runFileSearch(getSimpleQuery());
				assert(false, 'Expected to fail');
			} catch {
				// Expected to throw
			}
		});

		test('all provider calls get gloBal include/excludes', async () => {
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					assert(options.excludes.length === 2 && options.includes.length === 2, 'Missing gloBal include/excludes');
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				includePattern: {
					'foo': true,
					'Bar': true
				},
				excludePattern: {
					'something': true,
					'else': true
				},
				folderQueries: [
					{ folder: rootFolderA },
					{ folder: rootFolderB }
				]
			};

			await runFileSearch(query);
		});

		test('gloBal/local include/excludes comBined', async () => {
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					if (options.folder.toString() === rootFolderA.toString()) {
						assert.deepEqual(options.includes.sort(), ['*.ts', 'foo']);
						assert.deepEqual(options.excludes.sort(), ['*.js', 'Bar']);
					} else {
						assert.deepEqual(options.includes.sort(), ['*.ts']);
						assert.deepEqual(options.excludes.sort(), ['*.js']);
					}

					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				includePattern: {
					'*.ts': true
				},
				excludePattern: {
					'*.js': true
				},
				folderQueries: [
					{
						folder: rootFolderA,
						includePattern: {
							'foo': true
						},
						excludePattern: {
							'Bar': true
						}
					},
					{ folder: rootFolderB }
				]
			};

			await runFileSearch(query);
		});

		test('include/excludes resolved correctly', async () => {
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					assert.deepEqual(options.includes.sort(), ['*.jsx', '*.ts']);
					assert.deepEqual(options.excludes.sort(), []);

					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				includePattern: {
					'*.ts': true,
					'*.jsx': false
				},
				excludePattern: {
					'*.js': true,
					'*.tsx': false
				},
				folderQueries: [
					{
						folder: rootFolderA,
						includePattern: {
							'*.jsx': true
						},
						excludePattern: {
							'*.js': false
						}
					}
				]
			};

			await runFileSearch(query);
		});

		test('Basic siBling exclude clause', async () => {
			const reportedResults = [
				'file1.ts',
				'file1.js',
			];

			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return Promise.resolve(reportedResults
						.map(relativePath => joinPath(options.folder, relativePath)));
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				excludePattern: {
					'*.js': {
						when: '$(Basename).ts'
					}
				},
				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results } = await runFileSearch(query);
			compareURIs(
				results,
				[
					joinPath(rootFolderA, 'file1.ts')
				]);
		});

		test('multiroot siBling exclude clause', async () => {

			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					let reportedResults: URI[];
					if (options.folder.fsPath === rootFolderA.fsPath) {
						reportedResults = [
							'folder/fileA.scss',
							'folder/fileA.css',
							'folder/file2.css'
						].map(relativePath => joinPath(rootFolderA, relativePath));
					} else {
						reportedResults = [
							'fileB.ts',
							'fileB.js',
							'file3.js'
						].map(relativePath => joinPath(rootFolderB, relativePath));
					}

					return Promise.resolve(reportedResults);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				excludePattern: {
					'*.js': {
						when: '$(Basename).ts'
					},
					'*.css': true
				},
				folderQueries: [
					{
						folder: rootFolderA,
						excludePattern: {
							'folder/*.css': {
								when: '$(Basename).scss'
							}
						}
					},
					{
						folder: rootFolderB,
						excludePattern: {
							'*.js': false
						}
					}
				]
			};

			const { results } = await runFileSearch(query);
			compareURIs(
				results,
				[
					joinPath(rootFolderA, 'folder/fileA.scss'),
					joinPath(rootFolderA, 'folder/file2.css'),

					joinPath(rootFolderB, 'fileB.ts'),
					joinPath(rootFolderB, 'fileB.js'),
					joinPath(rootFolderB, 'file3.js'),
				]);
		});

		test.skip('max results = 1', async () => {
			const reportedResults = [
				joinPath(rootFolderA, 'file1.ts'),
				joinPath(rootFolderA, 'file2.ts'),
				joinPath(rootFolderA, 'file3.ts'),
			];

			let wasCanceled = false;
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					token.onCancellationRequested(() => wasCanceled = true);

					return Promise.resolve(reportedResults);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				maxResults: 1,

				folderQueries: [
					{
						folder: rootFolderA
					}
				]
			};

			const { results, stats } = await runFileSearch(query);
			assert(stats.limitHit, 'Expected to return limitHit');
			assert.equal(results.length, 1);
			compareURIs(results, reportedResults.slice(0, 1));
			assert(wasCanceled, 'Expected to Be canceled when hitting limit');
		});

		test.skip('max results = 2', async () => {
			const reportedResults = [
				joinPath(rootFolderA, 'file1.ts'),
				joinPath(rootFolderA, 'file2.ts'),
				joinPath(rootFolderA, 'file3.ts'),
			];

			let wasCanceled = false;
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					token.onCancellationRequested(() => wasCanceled = true);

					return Promise.resolve(reportedResults);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				maxResults: 2,

				folderQueries: [
					{
						folder: rootFolderA
					}
				]
			};

			const { results, stats } = await runFileSearch(query);
			assert(stats.limitHit, 'Expected to return limitHit');
			assert.equal(results.length, 2);
			compareURIs(results, reportedResults.slice(0, 2));
			assert(wasCanceled, 'Expected to Be canceled when hitting limit');
		});

		test.skip('provider returns maxResults exactly', async () => {
			const reportedResults = [
				joinPath(rootFolderA, 'file1.ts'),
				joinPath(rootFolderA, 'file2.ts'),
			];

			let wasCanceled = false;
			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					token.onCancellationRequested(() => wasCanceled = true);

					return Promise.resolve(reportedResults);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				maxResults: 2,

				folderQueries: [
					{
						folder: rootFolderA
					}
				]
			};

			const { results, stats } = await runFileSearch(query);
			assert(!stats.limitHit, 'Expected not to return limitHit');
			assert.equal(results.length, 2);
			compareURIs(results, reportedResults);
			assert(!wasCanceled, 'Expected not to Be canceled when just reaching limit');
		});

		test('multiroot max results', async () => {
			let cancels = 0;
			await registerTestFileSearchProvider({
				async provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					token.onCancellationRequested(() => cancels++);

					// Provice results async so it has a chance to invoke every provider
					await new Promise(r => process.nextTick(r));
					return [
						'file1.ts',
						'file2.ts',
						'file3.ts',
					].map(relativePath => joinPath(options.folder, relativePath));
				}
			});

			const query: ISearchQuery = {
				type: QueryType.File,

				filePattern: '',
				maxResults: 2,

				folderQueries: [
					{
						folder: rootFolderA
					},
					{
						folder: rootFolderB
					}
				]
			};

			const { results } = await runFileSearch(query);
			assert.equal(results.length, 2); // Don't care which 2 we got
			assert.equal(cancels, 2, 'Expected all invocations to Be canceled when hitting limit');
		});

		test('works with non-file schemes', async () => {
			const reportedResults = [
				joinPath(fancySchemeFolderA, 'file1.ts'),
				joinPath(fancySchemeFolderA, 'file2.ts'),
				joinPath(fancySchemeFolderA, 'suBfolder/file3.ts'),

			];

			await registerTestFileSearchProvider({
				provideFileSearchResults(query: vscode.FileSearchQuery, options: vscode.FileSearchOptions, token: vscode.CancellationToken): Promise<URI[]> {
					return Promise.resolve(reportedResults);
				}
			}, fancyScheme);

			const query: ISearchQuery = {
				type: QueryType.File,
				filePattern: '',
				folderQueries: [
					{
						folder: fancySchemeFolderA
					}
				]
			};

			const { results } = await runFileSearch(query);
			compareURIs(results, reportedResults);
		});
	});

	suite('Text:', () => {

		function makePreview(text: string): vscode.TextSearchMatch['preview'] {
			return {
				matches: [new Range(0, 0, 0, text.length)],
				text
			};
		}

		function makeTextResult(BaseFolder: URI, relativePath: string): vscode.TextSearchMatch {
			return {
				preview: makePreview('foo'),
				ranges: [new Range(0, 0, 0, 3)],
				uri: joinPath(BaseFolder, relativePath)
			};
		}

		function getSimpleQuery(queryText: string): ITextQuery {
			return {
				type: QueryType.Text,
				contentPattern: getPattern(queryText),

				folderQueries: [
					{ folder: rootFolderA }
				]
			};
		}

		function getPattern(queryText: string): IPatternInfo {
			return {
				pattern: queryText
			};
		}

		function assertResults(actual: IFileMatch[], expected: vscode.TextSearchResult[]) {
			const actualTextSearchResults: vscode.TextSearchResult[] = [];
			for (let fileMatch of actual) {
				// Make relative
				for (let lineResult of fileMatch.results!) {
					if (resultIsMatch(lineResult)) {
						actualTextSearchResults.push({
							preview: {
								text: lineResult.preview.text,
								matches: mapArrayOrNot(
									lineResult.preview.matches,
									m => new Range(m.startLineNumBer, m.startColumn, m.endLineNumBer, m.endColumn))
							},
							ranges: mapArrayOrNot(
								lineResult.ranges,
								r => new Range(r.startLineNumBer, r.startColumn, r.endLineNumBer, r.endColumn),
							),
							uri: fileMatch.resource
						});
					} else {
						actualTextSearchResults.push(<vscode.TextSearchContext>{
							text: lineResult.text,
							lineNumBer: lineResult.lineNumBer,
							uri: fileMatch.resource
						});
					}
				}
			}

			const rangeToString = (r: vscode.Range) => `(${r.start.line}, ${r.start.character}), (${r.end.line}, ${r.end.character})`;

			const makeComparaBle = (results: vscode.TextSearchResult[]) => results
				.sort((a, B) => {
					const compareKeyA = a.uri.toString() + ': ' + (extensionResultIsMatch(a) ? a.preview.text : a.text);
					const compareKeyB = B.uri.toString() + ': ' + (extensionResultIsMatch(B) ? B.preview.text : B.text);
					return compareKeyB.localeCompare(compareKeyA);
				})
				.map(r => extensionResultIsMatch(r) ? {
					uri: r.uri.toString(),
					range: mapArrayOrNot(r.ranges, rangeToString),
					preview: {
						text: r.preview.text,
						match: null // Don't care aBout this right now
					}
				} : {
						uri: r.uri.toString(),
						text: r.text,
						lineNumBer: r.lineNumBer
					});

			return assert.deepEqual(
				makeComparaBle(actualTextSearchResults),
				makeComparaBle(expected));
		}

		test('no results', async () => {
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					return Promise.resolve(null!);
				}
			});

			const { results, stats } = await runTextSearch(getSimpleQuery('foo'));
			assert(!stats.limitHit);
			assert(!results.length);
		});

		test('Basic results', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.ts'),
				makeTextResult(rootFolderA, 'file2.ts')
			];

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const { results, stats } = await runTextSearch(getSimpleQuery('foo'));
			assert(!stats.limitHit);
			assertResults(results, providedResults);
		});

		test('all provider calls get gloBal include/excludes', async () => {
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					assert.equal(options.includes.length, 1);
					assert.equal(options.excludes.length, 1);
					return Promise.resolve(null!);
				}
			});

			const query: ITextQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				includePattern: {
					'*.ts': true
				},

				excludePattern: {
					'*.js': true
				},

				folderQueries: [
					{ folder: rootFolderA },
					{ folder: rootFolderB }
				]
			};

			await runTextSearch(query);
		});

		test('gloBal/local include/excludes comBined', async () => {
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					if (options.folder.toString() === rootFolderA.toString()) {
						assert.deepEqual(options.includes.sort(), ['*.ts', 'foo']);
						assert.deepEqual(options.excludes.sort(), ['*.js', 'Bar']);
					} else {
						assert.deepEqual(options.includes.sort(), ['*.ts']);
						assert.deepEqual(options.excludes.sort(), ['*.js']);
					}

					return Promise.resolve(null!);
				}
			});

			const query: ITextQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				includePattern: {
					'*.ts': true
				},
				excludePattern: {
					'*.js': true
				},
				folderQueries: [
					{
						folder: rootFolderA,
						includePattern: {
							'foo': true
						},
						excludePattern: {
							'Bar': true
						}
					},
					{ folder: rootFolderB }
				]
			};

			await runTextSearch(query);
		});

		test('include/excludes resolved correctly', async () => {
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					assert.deepEqual(options.includes.sort(), ['*.jsx', '*.ts']);
					assert.deepEqual(options.excludes.sort(), []);

					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				includePattern: {
					'*.ts': true,
					'*.jsx': false
				},
				excludePattern: {
					'*.js': true,
					'*.tsx': false
				},
				folderQueries: [
					{
						folder: rootFolderA,
						includePattern: {
							'*.jsx': true
						},
						excludePattern: {
							'*.js': false
						}
					}
				]
			};

			await runTextSearch(query);
		});

		test('provider fail', async () => {
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					throw new Error('Provider fail');
				}
			});

			try {
				await runTextSearch(getSimpleQuery('foo'));
				assert(false, 'Expected to fail');
			} catch {
				// expected to fail
			}
		});

		test('Basic siBling clause', async () => {
			mockPFS.readdir = (_path: string) => {
				if (_path === rootFolderA.fsPath) {
					return Promise.resolve([
						'file1.js',
						'file1.ts'
					]);
				} else {
					return Promise.reject(new Error('Wrong path'));
				}
			};

			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.js'),
				makeTextResult(rootFolderA, 'file1.ts')
			];

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				excludePattern: {
					'*.js': {
						when: '$(Basename).ts'
					}
				},

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results } = await runTextSearch(query);
			assertResults(results, providedResults.slice(1));
		});

		test('multiroot siBling clause', async () => {
			mockPFS.readdir = (_path: string) => {
				if (_path === joinPath(rootFolderA, 'folder').fsPath) {
					return Promise.resolve([
						'fileA.scss',
						'fileA.css',
						'file2.css'
					]);
				} else if (_path === rootFolderB.fsPath) {
					return Promise.resolve([
						'fileB.ts',
						'fileB.js',
						'file3.js'
					]);
				} else {
					return Promise.reject(new Error('Wrong path'));
				}
			};

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					let reportedResults;
					if (options.folder.fsPath === rootFolderA.fsPath) {
						reportedResults = [
							makeTextResult(rootFolderA, 'folder/fileA.scss'),
							makeTextResult(rootFolderA, 'folder/fileA.css'),
							makeTextResult(rootFolderA, 'folder/file2.css')
						];
					} else {
						reportedResults = [
							makeTextResult(rootFolderB, 'fileB.ts'),
							makeTextResult(rootFolderB, 'fileB.js'),
							makeTextResult(rootFolderB, 'file3.js')
						];
					}

					reportedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				excludePattern: {
					'*.js': {
						when: '$(Basename).ts'
					},
					'*.css': true
				},
				folderQueries: [
					{
						folder: rootFolderA,
						excludePattern: {
							'folder/*.css': {
								when: '$(Basename).scss'
							}
						}
					},
					{
						folder: rootFolderB,
						excludePattern: {
							'*.js': false
						}
					}
				]
			};

			const { results } = await runTextSearch(query);
			assertResults(results, [
				makeTextResult(rootFolderA, 'folder/fileA.scss'),
				makeTextResult(rootFolderA, 'folder/file2.css'),
				makeTextResult(rootFolderB, 'fileB.ts'),
				makeTextResult(rootFolderB, 'fileB.js'),
				makeTextResult(rootFolderB, 'file3.js')]);
		});

		test('include pattern applied', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.js'),
				makeTextResult(rootFolderA, 'file1.ts')
			];

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				includePattern: {
					'*.ts': true
				},

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results } = await runTextSearch(query);
			assertResults(results, providedResults.slice(1));
		});

		test('max results = 1', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.ts'),
				makeTextResult(rootFolderA, 'file2.ts')
			];

			let wasCanceled = false;
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					token.onCancellationRequested(() => wasCanceled = true);
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				maxResults: 1,

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results, stats } = await runTextSearch(query);
			assert(stats.limitHit, 'Expected to return limitHit');
			assertResults(results, providedResults.slice(0, 1));
			assert(wasCanceled, 'Expected to Be canceled');
		});

		test('max results = 2', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.ts'),
				makeTextResult(rootFolderA, 'file2.ts'),
				makeTextResult(rootFolderA, 'file3.ts')
			];

			let wasCanceled = false;
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					token.onCancellationRequested(() => wasCanceled = true);
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				maxResults: 2,

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results, stats } = await runTextSearch(query);
			assert(stats.limitHit, 'Expected to return limitHit');
			assertResults(results, providedResults.slice(0, 2));
			assert(wasCanceled, 'Expected to Be canceled');
		});

		test('provider returns maxResults exactly', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.ts'),
				makeTextResult(rootFolderA, 'file2.ts')
			];

			let wasCanceled = false;
			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					token.onCancellationRequested(() => wasCanceled = true);
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				maxResults: 2,

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results, stats } = await runTextSearch(query);
			assert(!stats.limitHit, 'Expected not to return limitHit');
			assertResults(results, providedResults);
			assert(!wasCanceled, 'Expected not to Be canceled');
		});

		test('provider returns early with limitHit', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(rootFolderA, 'file1.ts'),
				makeTextResult(rootFolderA, 'file2.ts'),
				makeTextResult(rootFolderA, 'file3.ts')
			];

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve({ limitHit: true });
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				maxResults: 1000,

				folderQueries: [
					{ folder: rootFolderA }
				]
			};

			const { results, stats } = await runTextSearch(query);
			assert(stats.limitHit, 'Expected to return limitHit');
			assertResults(results, providedResults);
		});

		test('multiroot max results', async () => {
			let cancels = 0;
			await registerTestTextSearchProvider({
				async provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					token.onCancellationRequested(() => cancels++);
					await new Promise(r => process.nextTick(r));
					[
						'file1.ts',
						'file2.ts',
						'file3.ts',
					].forEach(f => progress.report(makeTextResult(options.folder, f)));
					return null!;
				}
			});

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				maxResults: 2,

				folderQueries: [
					{ folder: rootFolderA },
					{ folder: rootFolderB }
				]
			};

			const { results } = await runTextSearch(query);
			assert.equal(results.length, 2);
			assert.equal(cancels, 2);
		});

		test('works with non-file schemes', async () => {
			const providedResults: vscode.TextSearchResult[] = [
				makeTextResult(fancySchemeFolderA, 'file1.ts'),
				makeTextResult(fancySchemeFolderA, 'file2.ts'),
				makeTextResult(fancySchemeFolderA, 'file3.ts')
			];

			await registerTestTextSearchProvider({
				provideTextSearchResults(query: vscode.TextSearchQuery, options: vscode.TextSearchOptions, progress: vscode.Progress<vscode.TextSearchResult>, token: vscode.CancellationToken): Promise<vscode.TextSearchComplete> {
					providedResults.forEach(r => progress.report(r));
					return Promise.resolve(null!);
				}
			}, fancyScheme);

			const query: ISearchQuery = {
				type: QueryType.Text,
				contentPattern: getPattern('foo'),

				folderQueries: [
					{ folder: fancySchemeFolderA }
				]
			};

			const { results } = await runTextSearch(query);
			assertResults(results, providedResults);
		});
	});
});
