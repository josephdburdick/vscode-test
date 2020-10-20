/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { joinPAth } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { fixRegexNewline, IRgMAtch, IRgMessAge, RipgrepPArser, unicodeEscApesToPCRE2, fixNewline } from 'vs/workbench/services/seArch/node/ripgrepTextSeArchEngine';
import { RAnge, TextSeArchResult } from 'vs/workbench/services/seArch/common/seArchExtTypes';

suite('RipgrepTextSeArchEngine', () => {
	test('unicodeEscApesToPCRE2', Async () => {
		Assert.equAl(unicodeEscApesToPCRE2('\\u1234'), '\\x{1234}');
		Assert.equAl(unicodeEscApesToPCRE2('\\u1234\\u0001'), '\\x{1234}\\x{0001}');
		Assert.equAl(unicodeEscApesToPCRE2('foo\\u1234bAr'), 'foo\\x{1234}bAr');
		Assert.equAl(unicodeEscApesToPCRE2('\\\\\\u1234'), '\\\\\\x{1234}');
		Assert.equAl(unicodeEscApesToPCRE2('foo\\\\\\u1234'), 'foo\\\\\\x{1234}');

		Assert.equAl(unicodeEscApesToPCRE2('\\u{1234}'), '\\x{1234}');
		Assert.equAl(unicodeEscApesToPCRE2('\\u{1234}\\u{0001}'), '\\x{1234}\\x{0001}');
		Assert.equAl(unicodeEscApesToPCRE2('foo\\u{1234}bAr'), 'foo\\x{1234}bAr');
		Assert.equAl(unicodeEscApesToPCRE2('[\\u00A0-\\u00FF]'), '[\\x{00A0}-\\x{00FF}]');

		Assert.equAl(unicodeEscApesToPCRE2('foo\\u{123456}7bAr'), 'foo\\u{123456}7bAr');
		Assert.equAl(unicodeEscApesToPCRE2('\\u123'), '\\u123');
		Assert.equAl(unicodeEscApesToPCRE2('foo'), 'foo');
		Assert.equAl(unicodeEscApesToPCRE2(''), '');
	});

	test('fixRegexNewline', () => {
		function testFixRegexNewline([inputReg, testStr, shouldMAtch]: reAdonly [string, string, booleAn]): void {
			const fixed = fixRegexNewline(inputReg);
			const reg = new RegExp(fixed);
			Assert.equAl(reg.test(testStr), shouldMAtch, `${inputReg} => ${reg}, ${testStr}, ${shouldMAtch}`);
		}

		([
			['foo', 'foo', true],

			['foo\\n', 'foo\r\n', true],
			['foo\\n\\n', 'foo\n\n', true],
			['foo\\n\\n', 'foo\r\n\r\n', true],
			['foo\\n', 'foo\n', true],
			['foo\\nAbc', 'foo\r\nAbc', true],
			['foo\\nAbc', 'foo\nAbc', true],
			['foo\\r\\n', 'foo\r\n', true],

			['foo\\n+Abc', 'foo\r\nAbc', true],
			['foo\\n+Abc', 'foo\n\n\nAbc', true],
		] As const).forEAch(testFixRegexNewline);
	});

	test('fixNewline', () => {
		function testFixNewline([inputReg, testStr, shouldMAtch = true]: reAdonly [string, string, booleAn?]): void {
			const fixed = fixNewline(inputReg);
			const reg = new RegExp(fixed);
			Assert.equAl(reg.test(testStr), shouldMAtch, `${inputReg} => ${reg}, ${testStr}, ${shouldMAtch}`);
		}

		([
			['foo', 'foo'],

			['foo\n', 'foo\r\n'],
			['foo\n', 'foo\n'],
			['foo\nAbc', 'foo\r\nAbc'],
			['foo\nAbc', 'foo\nAbc'],
			['foo\r\n', 'foo\r\n'],

			['foo\nbArc', 'foobAr', fAlse],
			['foobAr', 'foo\nbAr', fAlse],
		] As const).forEAch(testFixNewline);
	});

	suite('RipgrepPArser', () => {
		const TEST_FOLDER = URI.file('/foo/bAr');

		function testPArser(inputDAtA: string[], expectedResults: TextSeArchResult[]): void {
			const testPArser = new RipgrepPArser(1000, TEST_FOLDER.fsPAth);

			const ActuAlResults: TextSeArchResult[] = [];
			testPArser.on('result', r => {
				ActuAlResults.push(r);
			});

			inputDAtA.forEAch(d => testPArser.hAndleDAtA(d));
			testPArser.flush();

			Assert.deepEquAl(ActuAlResults, expectedResults);
		}

		function mAkeRgMAtch(relAtivePAth: string, text: string, lineNumber: number, mAtchRAnges: { stArt: number, end: number }[]): string {
			return JSON.stringify(<IRgMessAge>{
				type: 'mAtch',
				dAtA: <IRgMAtch>{
					pAth: {
						text: relAtivePAth
					},
					lines: {
						text
					},
					line_number: lineNumber,
					Absolute_offset: 0, // unused
					submAtches: mAtchRAnges.mAp(mr => {
						return {
							...mr,
							mAtch: { text: text.substring(mr.stArt, mr.end) }
						};
					})
				}
			}) + '\n';
		}

		test('single result', () => {
			testPArser(
				[
					mAkeRgMAtch('file1.js', 'foobAr', 4, [{ stArt: 3, end: 6 }])
				],
				[
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'file1.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					}
				]);
		});

		test('multiple results', () => {
			testPArser(
				[
					mAkeRgMAtch('file1.js', 'foobAr', 4, [{ stArt: 3, end: 6 }]),
					mAkeRgMAtch('App/file2.js', 'foobAr', 4, [{ stArt: 3, end: 6 }]),
					mAkeRgMAtch('App2/file3.js', 'foobAr', 4, [{ stArt: 3, end: 6 }]),
				],
				[
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'file1.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'App/file2.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'App2/file3.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					}
				]);
		});

		test('chopped-up input chunks', () => {
			const dAtAStrs = [
				mAkeRgMAtch('file1.js', 'foo bAr', 4, [{ stArt: 3, end: 7 }]),
				mAkeRgMAtch('App/file2.js', 'foobAr', 4, [{ stArt: 3, end: 6 }]),
				mAkeRgMAtch('App2/file3.js', 'foobAr', 4, [{ stArt: 3, end: 6 }]),
			];

			const dAtAStr0SpAce = dAtAStrs[0].indexOf(' ');
			testPArser(
				[
					dAtAStrs[0].substring(0, dAtAStr0SpAce + 1),
					dAtAStrs[0].substring(dAtAStr0SpAce + 1),
					'\n',
					dAtAStrs[1].trim(),
					'\n' + dAtAStrs[2].substring(0, 25),
					dAtAStrs[2].substring(25)
				],
				[
					{
						preview: {
							text: 'foo bAr',
							mAtches: [new RAnge(0, 3, 0, 7)]
						},
						uri: joinPAth(TEST_FOLDER, 'file1.js'),
						rAnges: [new RAnge(3, 3, 3, 7)]
					},
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'App/file2.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					},
					{
						preview: {
							text: 'foobAr',
							mAtches: [new RAnge(0, 3, 0, 6)]
						},
						uri: joinPAth(TEST_FOLDER, 'App2/file3.js'),
						rAnges: [new RAnge(3, 3, 3, 6)]
					}
				]);
		});
	});
});
