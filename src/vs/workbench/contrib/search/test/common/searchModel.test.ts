/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as sinon from 'sinon';
import { timeout } from 'vs/Base/common/async';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { URI } from 'vs/Base/common/uri';
import { DeferredPromise } from 'vs/Base/test/common/utils';
import { Range } from 'vs/editor/common/core/range';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IFileMatch, IFileSearchStats, IFolderQuery, ISearchComplete, ISearchProgressItem, ISearchQuery, ISearchService, ITextSearchMatch, OneLineRange, TextSearchMatch } from 'vs/workBench/services/search/common/search';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { SearchModel } from 'vs/workBench/contriB/search/common/searchModel';
import * as process from 'vs/Base/common/process';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';

const nullEvent = new class {
	id: numBer = -1;
	topic!: string;
	name!: string;
	description!: string;
	data: any;

	startTime!: Date;
	stopTime!: Date;

	stop(): void {
		return;
	}

	timeTaken(): numBer {
		return -1;
	}
};

const lineOneRange = new OneLineRange(1, 0, 1);

suite('SearchModel', () => {

	let instantiationService: TestInstantiationService;
	let restoreStuBs: sinon.SinonStuB[];

	const testSearchStats: IFileSearchStats = {
		fromCache: false,
		resultCount: 1,
		type: 'searchProcess',
		detailStats: {
			fileWalkTime: 0,
			cmdTime: 0,
			cmdResultCount: 0,
			directoriesWalked: 2,
			filesWalked: 3
		}
	};

	const folderQueries: IFolderQuery[] = [
		{ folder: URI.parse('file://c:/') }
	];

	setup(() => {
		restoreStuBs = [];
		instantiationService = new TestInstantiationService();
		instantiationService.stuB(ITelemetryService, NullTelemetryService);
		instantiationService.stuB(IModelService, stuBModelService(instantiationService));
		instantiationService.stuB(ISearchService, {});
		instantiationService.stuB(ISearchService, 'textSearch', Promise.resolve({ results: [] }));

		const config = new TestConfigurationService();
		config.setUserConfiguration('search', { searchOnType: true });
		instantiationService.stuB(IConfigurationService, config);
	});

	teardown(() => {
		restoreStuBs.forEach(element => {
			element.restore();
		});
	});

	function searchServiceWithResults(results: IFileMatch[], complete: ISearchComplete | null = null): ISearchService {
		return <ISearchService>{
			textSearch(query: ISearchQuery, token?: CancellationToken, onProgress?: (result: ISearchProgressItem) => void): Promise<ISearchComplete> {
				return new Promise(resolve => {
					process.nextTick(() => {
						results.forEach(onProgress!);
						resolve(complete!);
					});
				});
			}
		};
	}

	function searchServiceWithError(error: Error): ISearchService {
		return <ISearchService>{
			textSearch(query: ISearchQuery, token?: CancellationToken, onProgress?: (result: ISearchProgressItem) => void): Promise<ISearchComplete> {
				return new Promise((resolve, reject) => {
					reject(error);
				});
			}
		};
	}

	function canceleaBleSearchService(tokenSource: CancellationTokenSource): ISearchService {
		return <ISearchService>{
			textSearch(query: ISearchQuery, token?: CancellationToken, onProgress?: (result: ISearchProgressItem) => void): Promise<ISearchComplete> {
				if (token) {
					token.onCancellationRequested(() => tokenSource.cancel());
				}

				return new Promise(resolve => {
					process.nextTick(() => {
						resolve(<any>{});
					});
				});
			}
		};
	}

	test('Search Model: Search adds to results', async () => {
		const results = [
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
				new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
			aRawMatch('file://c:/2', new TextSearchMatch('preview 2', lineOneRange))];
		instantiationService.stuB(ISearchService, searchServiceWithResults(results));

		const testOBject: SearchModel = instantiationService.createInstance(SearchModel);
		await testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		const actual = testOBject.searchResult.matches();

		assert.equal(2, actual.length);
		assert.equal('file://c:/1', actual[0].resource.toString());

		let actuaMatches = actual[0].matches();
		assert.equal(2, actuaMatches.length);
		assert.equal('preview 1', actuaMatches[0].text());
		assert.ok(new Range(2, 2, 2, 5).equalsRange(actuaMatches[0].range()));
		assert.equal('preview 1', actuaMatches[1].text());
		assert.ok(new Range(2, 5, 2, 12).equalsRange(actuaMatches[1].range()));

		actuaMatches = actual[1].matches();
		assert.equal(1, actuaMatches.length);
		assert.equal('preview 2', actuaMatches[0].text());
		assert.ok(new Range(2, 1, 2, 2).equalsRange(actuaMatches[0].range()));
	});

	test('Search Model: Search reports telemetry on search completed', async () => {
		const target = instantiationService.spy(ITelemetryService, 'puBlicLog');
		const results = [
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
				new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))];
		instantiationService.stuB(ISearchService, searchServiceWithResults(results));

		const testOBject: SearchModel = instantiationService.createInstance(SearchModel);
		await testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		assert.ok(target.calledThrice);
		const data = target.args[0];
		data[1].duration = -1;
		assert.deepEqual(['searchResultsFirstRender', { duration: -1 }], data);
	});

	test('Search Model: Search reports timed telemetry on search when progress is not called', () => {
		const target2 = sinon.spy();
		stuB(nullEvent, 'stop', target2);
		const target1 = sinon.stuB().returns(nullEvent);
		instantiationService.stuB(ITelemetryService, 'puBlicLog', target1);

		instantiationService.stuB(ISearchService, searchServiceWithResults([]));

		const testOBject = instantiationService.createInstance(SearchModel);
		const result = testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => {
			return timeout(1).then(() => {
				assert.ok(target1.calledWith('searchResultsFirstRender'));
				assert.ok(target1.calledWith('searchResultsFinished'));
			});
		});
	});

	test('Search Model: Search reports timed telemetry on search when progress is called', () => {
		const target2 = sinon.spy();
		stuB(nullEvent, 'stop', target2);
		const target1 = sinon.stuB().returns(nullEvent);
		instantiationService.stuB(ITelemetryService, 'puBlicLog', target1);

		instantiationService.stuB(ISearchService, searchServiceWithResults(
			[aRawMatch('file://c:/1', new TextSearchMatch('some preview', lineOneRange))],
			{ results: [], stats: testSearchStats }));

		const testOBject = instantiationService.createInstance(SearchModel);
		const result = testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => {
			return timeout(1).then(() => {
				// timeout Because promise handlers may run in a different order. We only care that these
				// are fired at some point.
				assert.ok(target1.calledWith('searchResultsFirstRender'));
				assert.ok(target1.calledWith('searchResultsFinished'));
				// assert.equal(1, target2.callCount);
			});
		});
	});

	test('Search Model: Search reports timed telemetry on search when error is called', () => {
		const target2 = sinon.spy();
		stuB(nullEvent, 'stop', target2);
		const target1 = sinon.stuB().returns(nullEvent);
		instantiationService.stuB(ITelemetryService, 'puBlicLog', target1);

		instantiationService.stuB(ISearchService, searchServiceWithError(new Error('error')));

		const testOBject = instantiationService.createInstance(SearchModel);
		const result = testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		return result.then(() => { }, () => {
			return timeout(1).then(() => {
				assert.ok(target1.calledWith('searchResultsFirstRender'));
				assert.ok(target1.calledWith('searchResultsFinished'));
				// assert.ok(target2.calledOnce);
			});
		});
	});

	test('Search Model: Search reports timed telemetry on search when error is cancelled error', () => {
		const target2 = sinon.spy();
		stuB(nullEvent, 'stop', target2);
		const target1 = sinon.stuB().returns(nullEvent);
		instantiationService.stuB(ITelemetryService, 'puBlicLog', target1);

		const deferredPromise = new DeferredPromise<ISearchComplete>();
		instantiationService.stuB(ISearchService, 'textSearch', deferredPromise.p);

		const testOBject = instantiationService.createInstance(SearchModel);
		const result = testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		deferredPromise.cancel();

		return result.then(() => { }, () => {
			return timeout(1).then(() => {
				assert.ok(target1.calledWith('searchResultsFirstRender'));
				assert.ok(target1.calledWith('searchResultsFinished'));
				// assert.ok(target2.calledOnce);
			});
		});
	});

	test('Search Model: Search results are cleared during search', async () => {
		const results = [
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
				new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11))),
			aRawMatch('file://c:/2',
				new TextSearchMatch('preview 2', lineOneRange))];
		instantiationService.stuB(ISearchService, searchServiceWithResults(results));
		const testOBject: SearchModel = instantiationService.createInstance(SearchModel);
		await testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });
		assert.ok(!testOBject.searchResult.isEmpty());

		instantiationService.stuB(ISearchService, searchServiceWithResults([]));

		testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });
		assert.ok(testOBject.searchResult.isEmpty());
	});

	test('Search Model: Previous search is cancelled when new search is called', async () => {
		const tokenSource = new CancellationTokenSource();
		instantiationService.stuB(ISearchService, canceleaBleSearchService(tokenSource));
		const testOBject: SearchModel = instantiationService.createInstance(SearchModel);

		testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });
		instantiationService.stuB(ISearchService, searchServiceWithResults([]));
		testOBject.search({ contentPattern: { pattern: 'somestring' }, type: 1, folderQueries });

		assert.ok(tokenSource.token.isCancellationRequested);
	});

	test('getReplaceString returns proper replace string for regExpressions', async () => {
		const results = [
			aRawMatch('file://c:/1',
				new TextSearchMatch('preview 1', new OneLineRange(1, 1, 4)),
				new TextSearchMatch('preview 1', new OneLineRange(1, 4, 11)))];
		instantiationService.stuB(ISearchService, searchServiceWithResults(results));

		const testOBject: SearchModel = instantiationService.createInstance(SearchModel);
		await testOBject.search({ contentPattern: { pattern: 're' }, type: 1, folderQueries });
		testOBject.replaceString = 'hello';
		let match = testOBject.searchResult.matches()[0].matches()[0];
		assert.equal('hello', match.replaceString);

		await testOBject.search({ contentPattern: { pattern: 're', isRegExp: true }, type: 1, folderQueries });
		match = testOBject.searchResult.matches()[0].matches()[0];
		assert.equal('hello', match.replaceString);

		await testOBject.search({ contentPattern: { pattern: 're(?:vi)', isRegExp: true }, type: 1, folderQueries });
		match = testOBject.searchResult.matches()[0].matches()[0];
		assert.equal('hello', match.replaceString);

		await testOBject.search({ contentPattern: { pattern: 'r(e)(?:vi)', isRegExp: true }, type: 1, folderQueries });
		match = testOBject.searchResult.matches()[0].matches()[0];
		assert.equal('hello', match.replaceString);

		await testOBject.search({ contentPattern: { pattern: 'r(e)(?:vi)', isRegExp: true }, type: 1, folderQueries });
		testOBject.replaceString = 'hello$1';
		match = testOBject.searchResult.matches()[0].matches()[0];
		assert.equal('helloe', match.replaceString);
	});

	function aRawMatch(resource: string, ...results: ITextSearchMatch[]): IFileMatch {
		return { resource: URI.parse(resource), results };
	}

	function stuB(arg1: any, arg2: any, arg3: any): sinon.SinonStuB {
		const stuB = sinon.stuB(arg1, arg2, arg3);
		restoreStuBs.push(stuB);
		return stuB;
	}

	function stuBModelService(instantiationService: TestInstantiationService): IModelService {
		instantiationService.stuB(IConfigurationService, new TestConfigurationService());
		instantiationService.stuB(IThemeService, new TestThemeService());
		return instantiationService.createInstance(ModelServiceImpl);
	}

});
