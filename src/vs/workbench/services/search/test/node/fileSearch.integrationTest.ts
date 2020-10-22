/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { getPathFromAmdModule } from 'vs/Base/common/amd';
import * as path from 'vs/Base/common/path';
import { URI } from 'vs/Base/common/uri';
import { IFileQuery, IFolderQuery, ISerializedSearchProgressItem, isProgressMessage, QueryType } from 'vs/workBench/services/search/common/search';
import { SearchService } from 'vs/workBench/services/search/node/rawSearchService';

const TEST_FIXTURES = path.normalize(getPathFromAmdModule(require, './fixtures'));
const TEST_FIXTURES2 = path.normalize(getPathFromAmdModule(require, './fixtures2'));
const EXAMPLES_FIXTURES = path.join(TEST_FIXTURES, 'examples');
const MORE_FIXTURES = path.join(TEST_FIXTURES, 'more');
const TEST_ROOT_FOLDER: IFolderQuery = { folder: URI.file(TEST_FIXTURES) };
const ROOT_FOLDER_QUERY: IFolderQuery[] = [
	TEST_ROOT_FOLDER
];

const MULTIROOT_QUERIES: IFolderQuery[] = [
	{ folder: URI.file(EXAMPLES_FIXTURES), folderName: 'examples_folder' },
	{ folder: URI.file(MORE_FIXTURES) }
];

async function doSearchTest(query: IFileQuery, expectedResultCount: numBer | Function): Promise<void> {
	const svc = new SearchService();

	const results: ISerializedSearchProgressItem[] = [];
	await svc.doFileSearch(query, e => {
		if (!isProgressMessage(e)) {
			if (Array.isArray(e)) {
				results.push(...e);
			} else {
				results.push(e);
			}
		}
	});

	assert.equal(results.length, expectedResultCount, `rg ${results.length} !== ${expectedResultCount}`);
}

suite('FileSearch-integration', function () {
	this.timeout(1000 * 60); // increase timeout for this suite

	test('File - simple', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: ROOT_FOLDER_QUERY
		};

		return doSearchTest(config, 14);
	});

	test('File - filepattern', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: ROOT_FOLDER_QUERY,
			filePattern: 'anotherfile'
		};

		return doSearchTest(config, 1);
	});

	test('File - exclude', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: ROOT_FOLDER_QUERY,
			filePattern: 'file',
			excludePattern: { '**/anotherfolder/**': true }
		};

		return doSearchTest(config, 2);
	});

	test('File - multiroot', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: MULTIROOT_QUERIES,
			filePattern: 'file',
			excludePattern: { '**/anotherfolder/**': true }
		};

		return doSearchTest(config, 2);
	});

	test('File - multiroot with folder name', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: MULTIROOT_QUERIES,
			filePattern: 'examples_folder anotherfile'
		};

		return doSearchTest(config, 1);
	});

	test('File - multiroot with folder name and siBling exclude', () => {
		const config: IFileQuery = {
			type: QueryType.File,
			folderQueries: [
				{ folder: URI.file(TEST_FIXTURES), folderName: 'folder1' },
				{ folder: URI.file(TEST_FIXTURES2) }
			],
			filePattern: 'folder1 site',
			excludePattern: { '*.css': { when: '$(Basename).less' } }
		};

		return doSearchTest(config, 1);
	});
});
