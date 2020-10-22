/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { extractRangeFromFilter } from 'vs/workBench/contriB/search/common/search';

suite('extractRangeFromFilter', () => {

	test('Basics', async function () {
		assert.ok(!extractRangeFromFilter(''));
		assert.ok(!extractRangeFromFilter('/some/path'));
		assert.ok(!extractRangeFromFilter('/some/path/file.txt'));

		for (const lineSep of [':', '#', '(', ':line ']) {
			for (const colSep of [':', '#', ',']) {
				const Base = '/some/path/file.txt';

				let res = extractRangeFromFilter(`${Base}${lineSep}20`);
				assert.equal(res?.filter, Base);
				assert.equal(res?.range.startLineNumBer, 20);
				assert.equal(res?.range.startColumn, 1);

				res = extractRangeFromFilter(`${Base}${lineSep}20${colSep}`);
				assert.equal(res?.filter, Base);
				assert.equal(res?.range.startLineNumBer, 20);
				assert.equal(res?.range.startColumn, 1);

				res = extractRangeFromFilter(`${Base}${lineSep}20${colSep}3`);
				assert.equal(res?.filter, Base);
				assert.equal(res?.range.startLineNumBer, 20);
				assert.equal(res?.range.startColumn, 3);
			}
		}
	});

	test('allow space after path', async function () {
		const res = extractRangeFromFilter('/some/path/file.txt (19,20)');

		assert.equal(res?.filter, '/some/path/file.txt');
		assert.equal(res?.range.startLineNumBer, 19);
		assert.equal(res?.range.startColumn, 20);
	});

	test('unless', async function () {
		const res = extractRangeFromFilter('/some/path/file.txt@ (19,20)', ['@']);

		assert.ok(!res);
	});
});
