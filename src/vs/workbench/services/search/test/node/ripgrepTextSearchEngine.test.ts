/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { joinPath } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { fixRegexNewline, IRgMatch, IRgMessage, RipgrepParser, unicodeEscapesToPCRE2, fixNewline } from 'vs/workBench/services/search/node/ripgrepTextSearchEngine';
import { Range, TextSearchResult } from 'vs/workBench/services/search/common/searchExtTypes';

suite('RipgrepTextSearchEngine', () => {
	test('unicodeEscapesToPCRE2', async () => {
		assert.equal(unicodeEscapesToPCRE2('\\u1234'), '\\x{1234}');
		assert.equal(unicodeEscapesToPCRE2('\\u1234\\u0001'), '\\x{1234}\\x{0001}');
		assert.equal(unicodeEscapesToPCRE2('foo\\u1234Bar'), 'foo\\x{1234}Bar');
		assert.equal(unicodeEscapesToPCRE2('\\\\\\u1234'), '\\\\\\x{1234}');
		assert.equal(unicodeEscapesToPCRE2('foo\\\\\\u1234'), 'foo\\\\\\x{1234}');

		assert.equal(unicodeEscapesToPCRE2('\\u{1234}'), '\\x{1234}');
		assert.equal(unicodeEscapesToPCRE2('\\u{1234}\\u{0001}'), '\\x{1234}\\x{0001}');
		assert.equal(unicodeEscapesToPCRE2('foo\\u{1234}Bar'), 'foo\\x{1234}Bar');
		assert.equal(unicodeEscapesToPCRE2('[\\u00A0-\\u00FF]'), '[\\x{00A0}-\\x{00FF}]');

		assert.equal(unicodeEscapesToPCRE2('foo\\u{123456}7Bar'), 'foo\\u{123456}7Bar');
		assert.equal(unicodeEscapesToPCRE2('\\u123'), '\\u123');
		assert.equal(unicodeEscapesToPCRE2('foo'), 'foo');
		assert.equal(unicodeEscapesToPCRE2(''), '');
	});

	test('fixRegexNewline', () => {
		function testFixRegexNewline([inputReg, testStr, shouldMatch]: readonly [string, string, Boolean]): void {
			const fixed = fixRegexNewline(inputReg);
			const reg = new RegExp(fixed);
			assert.equal(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
		}

		([
			['foo', 'foo', true],

			['foo\\n', 'foo\r\n', true],
			['foo\\n\\n', 'foo\n\n', true],
			['foo\\n\\n', 'foo\r\n\r\n', true],
			['foo\\n', 'foo\n', true],
			['foo\\naBc', 'foo\r\naBc', true],
			['foo\\naBc', 'foo\naBc', true],
			['foo\\r\\n', 'foo\r\n', true],

			['foo\\n+aBc', 'foo\r\naBc', true],
			['foo\\n+aBc', 'foo\n\n\naBc', true],
		] as const).forEach(testFixRegexNewline);
	});

	test('fixNewline', () => {
		function testFixNewline([inputReg, testStr, shouldMatch = true]: readonly [string, string, Boolean?]): void {
			const fixed = fixNewline(inputReg);
			const reg = new RegExp(fixed);
			assert.equal(reg.test(testStr), shouldMatch, `${inputReg} => ${reg}, ${testStr}, ${shouldMatch}`);
		}

		([
			['foo', 'foo'],

			['foo\n', 'foo\r\n'],
			['foo\n', 'foo\n'],
			['foo\naBc', 'foo\r\naBc'],
			['foo\naBc', 'foo\naBc'],
			['foo\r\n', 'foo\r\n'],

			['foo\nBarc', 'fooBar', false],
			['fooBar', 'foo\nBar', false],
		] as const).forEach(testFixNewline);
	});

	suite('RipgrepParser', () => {
		const TEST_FOLDER = URI.file('/foo/Bar');

		function testParser(inputData: string[], expectedResults: TextSearchResult[]): void {
			const testParser = new RipgrepParser(1000, TEST_FOLDER.fsPath);

			const actualResults: TextSearchResult[] = [];
			testParser.on('result', r => {
				actualResults.push(r);
			});

			inputData.forEach(d => testParser.handleData(d));
			testParser.flush();

			assert.deepEqual(actualResults, expectedResults);
		}

		function makeRgMatch(relativePath: string, text: string, lineNumBer: numBer, matchRanges: { start: numBer, end: numBer }[]): string {
			return JSON.stringify(<IRgMessage>{
				type: 'match',
				data: <IRgMatch>{
					path: {
						text: relativePath
					},
					lines: {
						text
					},
					line_numBer: lineNumBer,
					aBsolute_offset: 0, // unused
					suBmatches: matchRanges.map(mr => {
						return {
							...mr,
							match: { text: text.suBstring(mr.start, mr.end) }
						};
					})
				}
			}) + '\n';
		}

		test('single result', () => {
			testParser(
				[
					makeRgMatch('file1.js', 'fooBar', 4, [{ start: 3, end: 6 }])
				],
				[
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'file1.js'),
						ranges: [new Range(3, 3, 3, 6)]
					}
				]);
		});

		test('multiple results', () => {
			testParser(
				[
					makeRgMatch('file1.js', 'fooBar', 4, [{ start: 3, end: 6 }]),
					makeRgMatch('app/file2.js', 'fooBar', 4, [{ start: 3, end: 6 }]),
					makeRgMatch('app2/file3.js', 'fooBar', 4, [{ start: 3, end: 6 }]),
				],
				[
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'file1.js'),
						ranges: [new Range(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'app/file2.js'),
						ranges: [new Range(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'app2/file3.js'),
						ranges: [new Range(3, 3, 3, 6)]
					}
				]);
		});

		test('chopped-up input chunks', () => {
			const dataStrs = [
				makeRgMatch('file1.js', 'foo Bar', 4, [{ start: 3, end: 7 }]),
				makeRgMatch('app/file2.js', 'fooBar', 4, [{ start: 3, end: 6 }]),
				makeRgMatch('app2/file3.js', 'fooBar', 4, [{ start: 3, end: 6 }]),
			];

			const dataStr0Space = dataStrs[0].indexOf(' ');
			testParser(
				[
					dataStrs[0].suBstring(0, dataStr0Space + 1),
					dataStrs[0].suBstring(dataStr0Space + 1),
					'\n',
					dataStrs[1].trim(),
					'\n' + dataStrs[2].suBstring(0, 25),
					dataStrs[2].suBstring(25)
				],
				[
					{
						preview: {
							text: 'foo Bar',
							matches: [new Range(0, 3, 0, 7)]
						},
						uri: joinPath(TEST_FOLDER, 'file1.js'),
						ranges: [new Range(3, 3, 3, 7)]
					},
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'app/file2.js'),
						ranges: [new Range(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'fooBar',
							matches: [new Range(0, 3, 0, 6)]
						},
						uri: joinPath(TEST_FOLDER, 'app2/file3.js'),
						ranges: [new Range(3, 3, 3, 6)]
					}
				]);
		});
	});
});
