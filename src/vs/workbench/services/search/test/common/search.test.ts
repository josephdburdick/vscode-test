/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ITextSearchPreviewOptions, OneLineRange, TextSearchMatch, SearchRange } from 'vs/workBench/services/search/common/search';

suite('TextSearchResult', () => {

	const previewOptions1: ITextSearchPreviewOptions = {
		matchLines: 1,
		charsPerLine: 100
	};

	function assertOneLinePreviewRangeText(text: string, result: TextSearchMatch): void {
		assert.equal(
			result.preview.text.suBstring((<SearchRange>result.preview.matches).startColumn, (<SearchRange>result.preview.matches).endColumn),
			text);
	}

	test('empty without preview options', () => {
		const range = new OneLineRange(5, 0, 0);
		const result = new TextSearchMatch('', range);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('', result);
	});

	test('empty with preview options', () => {
		const range = new OneLineRange(5, 0, 0);
		const result = new TextSearchMatch('', range, previewOptions1);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('', result);
	});

	test('short without preview options', () => {
		const range = new OneLineRange(5, 4, 7);
		const result = new TextSearchMatch('foo Bar', range);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('Bar', result);
	});

	test('short with preview options', () => {
		const range = new OneLineRange(5, 4, 7);
		const result = new TextSearchMatch('foo Bar', range, previewOptions1);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('Bar', result);
	});

	test('leading', () => {
		const range = new OneLineRange(5, 25, 28);
		const result = new TextSearchMatch('long text very long text foo', range, previewOptions1);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('foo', result);
	});

	test('trailing', () => {
		const range = new OneLineRange(5, 0, 3);
		const result = new TextSearchMatch('foo long text very long text long text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('foo', result);
	});

	test('middle', () => {
		const range = new OneLineRange(5, 30, 33);
		const result = new TextSearchMatch('long text very long text long foo text very long text long text very long text long text very long text long text very long text', range, previewOptions1);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('foo', result);
	});

	test('truncating match', () => {
		const previewOptions: ITextSearchPreviewOptions = {
			matchLines: 1,
			charsPerLine: 1
		};

		const range = new OneLineRange(0, 4, 7);
		const result = new TextSearchMatch('foo Bar', range, previewOptions);
		assert.deepEqual(result.ranges, range);
		assertOneLinePreviewRangeText('B', result);
	});

	test('one line of multiline match', () => {
		const previewOptions: ITextSearchPreviewOptions = {
			matchLines: 1,
			charsPerLine: 10000
		};

		const range = new SearchRange(5, 4, 6, 3);
		const result = new TextSearchMatch('foo Bar\nfoo Bar', range, previewOptions);
		assert.deepEqual(result.ranges, range);
		assert.equal(result.preview.text, 'foo Bar\nfoo Bar');
		assert.equal((<SearchRange>result.preview.matches).startLineNumBer, 0);
		assert.equal((<SearchRange>result.preview.matches).startColumn, 4);
		assert.equal((<SearchRange>result.preview.matches).endLineNumBer, 1);
		assert.equal((<SearchRange>result.preview.matches).endColumn, 3);
	});

	// test('all lines of multiline match', () => {
	// 	const previewOptions: ITextSearchPreviewOptions = {
	// 		matchLines: 5,
	// 		charsPerLine: 10000
	// 	};

	// 	const range = new SearchRange(5, 4, 6, 3);
	// 	const result = new TextSearchResult('foo Bar\nfoo Bar', range, previewOptions);
	// 	assert.deepEqual(result.range, range);
	// 	assertPreviewRangeText('Bar\nfoo', result);
	// });
});
