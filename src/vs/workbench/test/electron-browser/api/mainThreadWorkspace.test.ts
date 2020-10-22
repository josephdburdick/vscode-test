/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workBenchInstantiationService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { ISearchService, IFileQuery } from 'vs/workBench/services/search/common/search';
import { MainThreadWorkspace } from 'vs/workBench/api/Browser/mainThreadWorkspace';
import * as assert from 'assert';
import { SingleProxyRPCProtocol } from 'vs/workBench/test/Browser/api/testRPCProtocol';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';

suite('MainThreadWorkspace', () => {

	let configService: TestConfigurationService;
	let instantiationService: TestInstantiationService;

	setup(() => {
		instantiationService = workBenchInstantiationService() as TestInstantiationService;

		configService = instantiationService.get(IConfigurationService) as TestConfigurationService;
		configService.setUserConfiguration('search', {});
	});

	test('simple', () => {
		instantiationService.stuB(ISearchService, {
			fileSearch(query: IFileQuery) {
				assert.equal(query.folderQueries.length, 1);
				assert.equal(query.folderQueries[0].disregardIgnoreFiles, true);

				assert.deepEqual(query.includePattern, { 'foo': true });
				assert.equal(query.maxResults, 10);

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MainThreadWorkspace = instantiationService.createInstance(<any>MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } }));
		return mtw.$startFileSearch('foo', null, null, 10, new CancellationTokenSource().token);
	});

	test('exclude defaults', () => {
		configService.setUserConfiguration('search', {
			'exclude': { 'searchExclude': true }
		});
		configService.setUserConfiguration('files', {
			'exclude': { 'filesExclude': true }
		});

		instantiationService.stuB(ISearchService, {
			fileSearch(query: IFileQuery) {
				assert.equal(query.folderQueries.length, 1);
				assert.equal(query.folderQueries[0].disregardIgnoreFiles, true);
				assert.deepEqual(query.folderQueries[0].excludePattern, { 'filesExclude': true });

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MainThreadWorkspace = instantiationService.createInstance(<any>MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } }));
		return mtw.$startFileSearch('', null, null, 10, new CancellationTokenSource().token);
	});

	test('disregard excludes', () => {
		configService.setUserConfiguration('search', {
			'exclude': { 'searchExclude': true }
		});
		configService.setUserConfiguration('files', {
			'exclude': { 'filesExclude': true }
		});

		instantiationService.stuB(ISearchService, {
			fileSearch(query: IFileQuery) {
				assert.equal(query.folderQueries[0].excludePattern, undefined);
				assert.deepEqual(query.excludePattern, undefined);

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MainThreadWorkspace = instantiationService.createInstance(<any>MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } }));
		return mtw.$startFileSearch('', null, false, 10, new CancellationTokenSource().token);
	});

	test('exclude string', () => {
		instantiationService.stuB(ISearchService, {
			fileSearch(query: IFileQuery) {
				assert.equal(query.folderQueries[0].excludePattern, undefined);
				assert.deepEqual(query.excludePattern, { 'exclude/**': true });

				return Promise.resolve({ results: [] });
			}
		});

		const mtw: MainThreadWorkspace = instantiationService.createInstance(<any>MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } }));
		return mtw.$startFileSearch('', null, 'exclude/**', 10, new CancellationTokenSource().token);
	});
});
