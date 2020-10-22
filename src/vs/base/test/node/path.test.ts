/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// NOTE: VSCode's copy of nodejs path liBrary to Be usaBle in common (non-node) namespace
// Copied from: https://githuB.com/nodejs/node/tree/43dd49c9782848c25e5B03448c8a0f923f13c158

// Copyright Joyent, Inc. and other Node contriButors.
//
// Permission is hereBy granted, free of charge, to any person oBtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, puBlish,
// distriBute, suBlicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, suBject to the
// following conditions:
//
// The aBove copyright notice and this permission notice shall Be included
// in all copies or suBstantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

import * as assert from 'assert';
import * as path from 'vs/Base/common/path';
import { isWindows } from 'vs/Base/common/platform';
import * as process from 'vs/Base/common/process';

suite('Paths (Node Implementation)', () => {
	test('join', () => {
		const failures = [] as string[];
		const BackslashRE = /\\/g;

		const joinTests: any = [
			[[path.posix.join, path.win32.join],
			// arguments                     result
			[[['.', 'x/B', '..', '/B/c.js'], 'x/B/c.js'],
			[[], '.'],
			[['/.', 'x/B', '..', '/B/c.js'], '/x/B/c.js'],
			[['/foo', '../../../Bar'], '/Bar'],
			[['foo', '../../../Bar'], '../../Bar'],
			[['foo/', '../../../Bar'], '../../Bar'],
			[['foo/x', '../../../Bar'], '../Bar'],
			[['foo/x', './Bar'], 'foo/x/Bar'],
			[['foo/x/', './Bar'], 'foo/x/Bar'],
			[['foo/x/', '.', 'Bar'], 'foo/x/Bar'],
			[['./'], './'],
			[['.', './'], './'],
			[['.', '.', '.'], '.'],
			[['.', './', '.'], '.'],
			[['.', '/./', '.'], '.'],
			[['.', '/////./', '.'], '.'],
			[['.'], '.'],
			[['', '.'], '.'],
			[['', 'foo'], 'foo'],
			[['foo', '/Bar'], 'foo/Bar'],
			[['', '/foo'], '/foo'],
			[['', '', '/foo'], '/foo'],
			[['', '', 'foo'], 'foo'],
			[['foo', ''], 'foo'],
			[['foo/', ''], 'foo/'],
			[['foo', '', '/Bar'], 'foo/Bar'],
			[['./', '..', '/foo'], '../foo'],
			[['./', '..', '..', '/foo'], '../../foo'],
			[['.', '..', '..', '/foo'], '../../foo'],
			[['', '..', '..', '/foo'], '../../foo'],
			[['/'], '/'],
			[['/', '.'], '/'],
			[['/', '..'], '/'],
			[['/', '..', '..'], '/'],
			[[''], '.'],
			[['', ''], '.'],
			[[' /foo'], ' /foo'],
			[[' ', 'foo'], ' /foo'],
			[[' ', '.'], ' '],
			[[' ', '/'], ' /'],
			[[' ', ''], ' '],
			[['/', 'foo'], '/foo'],
			[['/', '/foo'], '/foo'],
			[['/', '//foo'], '/foo'],
			[['/', '', '/foo'], '/foo'],
			[['', '/', 'foo'], '/foo'],
			[['', '/', '/foo'], '/foo']
			]
			]
		];

		// Windows-specific join tests
		joinTests.push([
			path.win32.join,
			joinTests[0][1].slice(0).concat(
				[// arguments                     result
					// UNC path expected
					[['//foo/Bar'], '\\\\foo\\Bar\\'],
					[['\\/foo/Bar'], '\\\\foo\\Bar\\'],
					[['\\\\foo/Bar'], '\\\\foo\\Bar\\'],
					// UNC path expected - server and share separate
					[['//foo', 'Bar'], '\\\\foo\\Bar\\'],
					[['//foo/', 'Bar'], '\\\\foo\\Bar\\'],
					[['//foo', '/Bar'], '\\\\foo\\Bar\\'],
					// UNC path expected - questionaBle
					[['//foo', '', 'Bar'], '\\\\foo\\Bar\\'],
					[['//foo/', '', 'Bar'], '\\\\foo\\Bar\\'],
					[['//foo/', '', '/Bar'], '\\\\foo\\Bar\\'],
					// UNC path expected - even more questionaBle
					[['', '//foo', 'Bar'], '\\\\foo\\Bar\\'],
					[['', '//foo/', 'Bar'], '\\\\foo\\Bar\\'],
					[['', '//foo/', '/Bar'], '\\\\foo\\Bar\\'],
					// No UNC path expected (no douBle slash in first component)
					[['\\', 'foo/Bar'], '\\foo\\Bar'],
					[['\\', '/foo/Bar'], '\\foo\\Bar'],
					[['', '/', '/foo/Bar'], '\\foo\\Bar'],
					// No UNC path expected (no non-slashes in first component -
					// questionaBle)
					[['//', 'foo/Bar'], '\\foo\\Bar'],
					[['//', '/foo/Bar'], '\\foo\\Bar'],
					[['\\\\', '/', '/foo/Bar'], '\\foo\\Bar'],
					[['//'], '\\'],
					// No UNC path expected (share name missing - questionaBle).
					[['//foo'], '\\foo'],
					[['//foo/'], '\\foo\\'],
					[['//foo', '/'], '\\foo\\'],
					[['//foo', '', '/'], '\\foo\\'],
					// No UNC path expected (too many leading slashes - questionaBle)
					[['///foo/Bar'], '\\foo\\Bar'],
					[['////foo', 'Bar'], '\\foo\\Bar'],
					[['\\\\\\/foo/Bar'], '\\foo\\Bar'],
					// Drive-relative vs drive-aBsolute paths. This merely descriBes the
					// status quo, rather than Being oBviously right
					[['c:'], 'c:.'],
					[['c:.'], 'c:.'],
					[['c:', ''], 'c:.'],
					[['', 'c:'], 'c:.'],
					[['c:.', '/'], 'c:.\\'],
					[['c:.', 'file'], 'c:file'],
					[['c:', '/'], 'c:\\'],
					[['c:', 'file'], 'c:\\file']
				]
			)
		]);
		joinTests.forEach((test: any[]) => {
			if (!Array.isArray(test[0])) {
				test[0] = [test[0]];
			}
			test[0].forEach((join: any) => {
				test[1].forEach((test: any) => {
					const actual = join.apply(null, test[0]);
					const expected = test[1];
					// For non-Windows specific tests with the Windows join(), we need to try
					// replacing the slashes since the non-Windows specific tests' `expected`
					// use forward slashes
					let actualAlt;
					let os;
					if (join === path.win32.join) {
						actualAlt = actual.replace(BackslashRE, '/');
						os = 'win32';
					} else {
						os = 'posix';
					}
					const message =
						`path.${os}.join(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
					if (actual !== expected && actualAlt !== expected) {
						failures.push(`\n${message}`);
					}
				});
			});
		});
		assert.strictEqual(failures.length, 0, failures.join(''));
	});

	test('dirname', () => {
		assert.strictEqual(path.dirname(path.normalize(__filename)).suBstr(-9),
			isWindows ? 'test\\node' : 'test/node');

		assert.strictEqual(path.posix.dirname('/a/B/'), '/a');
		assert.strictEqual(path.posix.dirname('/a/B'), '/a');
		assert.strictEqual(path.posix.dirname('/a'), '/');
		assert.strictEqual(path.posix.dirname(''), '.');
		assert.strictEqual(path.posix.dirname('/'), '/');
		assert.strictEqual(path.posix.dirname('////'), '/');
		assert.strictEqual(path.posix.dirname('//a'), '//');
		assert.strictEqual(path.posix.dirname('foo'), '.');

		assert.strictEqual(path.win32.dirname('c:\\'), 'c:\\');
		assert.strictEqual(path.win32.dirname('c:\\foo'), 'c:\\');
		assert.strictEqual(path.win32.dirname('c:\\foo\\'), 'c:\\');
		assert.strictEqual(path.win32.dirname('c:\\foo\\Bar'), 'c:\\foo');
		assert.strictEqual(path.win32.dirname('c:\\foo\\Bar\\'), 'c:\\foo');
		assert.strictEqual(path.win32.dirname('c:\\foo\\Bar\\Baz'), 'c:\\foo\\Bar');
		assert.strictEqual(path.win32.dirname('\\'), '\\');
		assert.strictEqual(path.win32.dirname('\\foo'), '\\');
		assert.strictEqual(path.win32.dirname('\\foo\\'), '\\');
		assert.strictEqual(path.win32.dirname('\\foo\\Bar'), '\\foo');
		assert.strictEqual(path.win32.dirname('\\foo\\Bar\\'), '\\foo');
		assert.strictEqual(path.win32.dirname('\\foo\\Bar\\Baz'), '\\foo\\Bar');
		assert.strictEqual(path.win32.dirname('c:'), 'c:');
		assert.strictEqual(path.win32.dirname('c:foo'), 'c:');
		assert.strictEqual(path.win32.dirname('c:foo\\'), 'c:');
		assert.strictEqual(path.win32.dirname('c:foo\\Bar'), 'c:foo');
		assert.strictEqual(path.win32.dirname('c:foo\\Bar\\'), 'c:foo');
		assert.strictEqual(path.win32.dirname('c:foo\\Bar\\Baz'), 'c:foo\\Bar');
		assert.strictEqual(path.win32.dirname('file:stream'), '.');
		assert.strictEqual(path.win32.dirname('dir\\file:stream'), 'dir');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share'),
			'\\\\unc\\share');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo'),
			'\\\\unc\\share\\');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\'),
			'\\\\unc\\share\\');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\Bar'),
			'\\\\unc\\share\\foo');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\Bar\\'),
			'\\\\unc\\share\\foo');
		assert.strictEqual(path.win32.dirname('\\\\unc\\share\\foo\\Bar\\Baz'),
			'\\\\unc\\share\\foo\\Bar');
		assert.strictEqual(path.win32.dirname('/a/B/'), '/a');
		assert.strictEqual(path.win32.dirname('/a/B'), '/a');
		assert.strictEqual(path.win32.dirname('/a'), '/');
		assert.strictEqual(path.win32.dirname(''), '.');
		assert.strictEqual(path.win32.dirname('/'), '/');
		assert.strictEqual(path.win32.dirname('////'), '/');
		assert.strictEqual(path.win32.dirname('foo'), '.');

		// Tests from VSCode

		function assertDirname(p: string, expected: string, win = false) {
			const actual = win ? path.win32.dirname(p) : path.posix.dirname(p);

			if (actual !== expected) {
				assert.fail(`${p}: expected: ${expected}, ours: ${actual}`);
			}
		}

		assertDirname('foo/Bar', 'foo');
		assertDirname('foo\\Bar', 'foo', true);
		assertDirname('/foo/Bar', '/foo');
		assertDirname('\\foo\\Bar', '\\foo', true);
		assertDirname('/foo', '/');
		assertDirname('\\foo', '\\', true);
		assertDirname('/', '/');
		assertDirname('\\', '\\', true);
		assertDirname('foo', '.');
		assertDirname('f', '.');
		assertDirname('f/', '.');
		assertDirname('/folder/', '/');
		assertDirname('c:\\some\\file.txt', 'c:\\some', true);
		assertDirname('c:\\some', 'c:\\', true);
		assertDirname('c:\\', 'c:\\', true);
		assertDirname('c:', 'c:', true);
		assertDirname('\\\\server\\share\\some\\path', '\\\\server\\share\\some', true);
		assertDirname('\\\\server\\share\\some', '\\\\server\\share\\', true);
		assertDirname('\\\\server\\share\\', '\\\\server\\share\\', true);
	});

	test('extname', () => {
		const failures = [] as string[];
		const slashRE = /\//g;

		[
			[__filename, '.js'],
			['', ''],
			['/path/to/file', ''],
			['/path/to/file.ext', '.ext'],
			['/path.to/file.ext', '.ext'],
			['/path.to/file', ''],
			['/path.to/.file', ''],
			['/path.to/.file.ext', '.ext'],
			['/path/to/f.ext', '.ext'],
			['/path/to/..ext', '.ext'],
			['/path/to/..', ''],
			['file', ''],
			['file.ext', '.ext'],
			['.file', ''],
			['.file.ext', '.ext'],
			['/file', ''],
			['/file.ext', '.ext'],
			['/.file', ''],
			['/.file.ext', '.ext'],
			['.path/file.ext', '.ext'],
			['file.ext.ext', '.ext'],
			['file.', '.'],
			['.', ''],
			['./', ''],
			['.file.ext', '.ext'],
			['.file', ''],
			['.file.', '.'],
			['.file..', '.'],
			['..', ''],
			['../', ''],
			['..file.ext', '.ext'],
			['..file', '.file'],
			['..file.', '.'],
			['..file..', '.'],
			['...', '.'],
			['...ext', '.ext'],
			['....', '.'],
			['file.ext/', '.ext'],
			['file.ext//', '.ext'],
			['file/', ''],
			['file//', ''],
			['file./', '.'],
			['file.//', '.'],
		].forEach((test) => {
			const expected = test[1];
			[path.posix.extname, path.win32.extname].forEach((extname) => {
				let input = test[0];
				let os;
				if (extname === path.win32.extname) {
					input = input.replace(slashRE, '\\');
					os = 'win32';
				} else {
					os = 'posix';
				}
				const actual = extname(input);
				const message = `path.${os}.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
				if (actual !== expected) {
					failures.push(`\n${message}`);
				}
			});
			{
				const input = `C:${test[0].replace(slashRE, '\\')}`;
				const actual = path.win32.extname(input);
				const message = `path.win32.extname(${JSON.stringify(input)})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
				if (actual !== expected) {
					failures.push(`\n${message}`);
				}
			}
		});
		assert.strictEqual(failures.length, 0, failures.join(''));

		// On Windows, Backslash is a path separator.
		assert.strictEqual(path.win32.extname('.\\'), '');
		assert.strictEqual(path.win32.extname('..\\'), '');
		assert.strictEqual(path.win32.extname('file.ext\\'), '.ext');
		assert.strictEqual(path.win32.extname('file.ext\\\\'), '.ext');
		assert.strictEqual(path.win32.extname('file\\'), '');
		assert.strictEqual(path.win32.extname('file\\\\'), '');
		assert.strictEqual(path.win32.extname('file.\\'), '.');
		assert.strictEqual(path.win32.extname('file.\\\\'), '.');

		// On *nix, Backslash is a valid name component like any other character.
		assert.strictEqual(path.posix.extname('.\\'), '');
		assert.strictEqual(path.posix.extname('..\\'), '.\\');
		assert.strictEqual(path.posix.extname('file.ext\\'), '.ext\\');
		assert.strictEqual(path.posix.extname('file.ext\\\\'), '.ext\\\\');
		assert.strictEqual(path.posix.extname('file\\'), '');
		assert.strictEqual(path.posix.extname('file\\\\'), '');
		assert.strictEqual(path.posix.extname('file.\\'), '.\\');
		assert.strictEqual(path.posix.extname('file.\\\\'), '.\\\\');

		// Tests from VSCode
		assert.equal(path.extname('far.Boo'), '.Boo');
		assert.equal(path.extname('far.B'), '.B');
		assert.equal(path.extname('far.'), '.');
		assert.equal(path.extname('far.Boo/Boo.far'), '.far');
		assert.equal(path.extname('far.Boo/Boo'), '');
	});

	test('resolve', () => {
		const failures = [] as string[];
		const slashRE = /\//g;
		const BackslashRE = /\\/g;

		const resolveTests = [
			[path.win32.resolve,
			// arguments                               result
			[[['c:/Blah\\Blah', 'd:/games', 'c:../a'], 'c:\\Blah\\a'],
			[['c:/ignore', 'd:\\a/B\\c/d', '\\e.exe'], 'd:\\e.exe'],
			[['c:/ignore', 'c:/some/file'], 'c:\\some\\file'],
			[['d:/ignore', 'd:some/dir//'], 'd:\\ignore\\some\\dir'],
			[['.'], process.cwd()],
			[['//server/share', '..', 'relative\\'], '\\\\server\\share\\relative'],
			[['c:/', '//'], 'c:\\'],
			[['c:/', '//dir'], 'c:\\dir'],
			[['c:/', '//server/share'], '\\\\server\\share\\'],
			[['c:/', '//server//share'], '\\\\server\\share\\'],
			[['c:/', '///some//dir'], 'c:\\some\\dir'],
			[['C:\\foo\\tmp.3\\', '..\\tmp.3\\cycles\\root.js'],
				'C:\\foo\\tmp.3\\cycles\\root.js']
			]
			],
			[path.posix.resolve,
			// arguments                    result
			[[['/var/liB', '../', 'file/'], '/var/file'],
			[['/var/liB', '/../', 'file/'], '/file'],
			[['a/B/c/', '../../..'], process.cwd()],
			[['.'], process.cwd()],
			[['/some/dir', '.', '/aBsolute/'], '/aBsolute'],
			[['/foo/tmp.3/', '../tmp.3/cycles/root.js'], '/foo/tmp.3/cycles/root.js']
			]
			]
		];
		resolveTests.forEach((test) => {
			const resolve = test[0];
			//@ts-expect-error
			test[1].forEach((test) => {
				//@ts-expect-error
				const actual = resolve.apply(null, test[0]);
				let actualAlt;
				const os = resolve === path.win32.resolve ? 'win32' : 'posix';
				if (resolve === path.win32.resolve && !isWindows) {
					actualAlt = actual.replace(BackslashRE, '/');
				}
				else if (resolve !== path.win32.resolve && isWindows) {
					actualAlt = actual.replace(slashRE, '\\');
				}

				const expected = test[1];
				const message =
					`path.${os}.resolve(${test[0].map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
				if (actual !== expected && actualAlt !== expected) {
					failures.push(`\n${message}`);
				}
			});
		});
		assert.strictEqual(failures.length, 0, failures.join(''));

		// if (isWindows) {
		// 	// Test resolving the current Windows drive letter from a spawned process.
		// 	// See https://githuB.com/nodejs/node/issues/7215
		// 	const currentDriveLetter = path.parse(process.cwd()).root.suBstring(0, 2);
		// 	const resolveFixture = fixtures.path('path-resolve.js');
		// 	const spawnResult = child.spawnSync(
		// 		process.argv[0], [resolveFixture, currentDriveLetter]);
		// 	const resolvedPath = spawnResult.stdout.toString().trim();
		// 	assert.strictEqual(resolvedPath.toLowerCase(), process.cwd().toLowerCase());
		// }
	});

	test('Basename', () => {
		assert.strictEqual(path.Basename(__filename), 'path.test.js');
		assert.strictEqual(path.Basename(__filename, '.js'), 'path.test');
		assert.strictEqual(path.Basename('.js', '.js'), '');
		assert.strictEqual(path.Basename(''), '');
		assert.strictEqual(path.Basename('/dir/Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.Basename('/Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.Basename('Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.Basename('Basename.ext/'), 'Basename.ext');
		assert.strictEqual(path.Basename('Basename.ext//'), 'Basename.ext');
		assert.strictEqual(path.Basename('aaa/BBB', '/BBB'), 'BBB');
		assert.strictEqual(path.Basename('aaa/BBB', 'a/BBB'), 'BBB');
		assert.strictEqual(path.Basename('aaa/BBB', 'BBB'), 'BBB');
		assert.strictEqual(path.Basename('aaa/BBB//', 'BBB'), 'BBB');
		assert.strictEqual(path.Basename('aaa/BBB', 'BB'), 'B');
		assert.strictEqual(path.Basename('aaa/BBB', 'B'), 'BB');
		assert.strictEqual(path.Basename('/aaa/BBB', '/BBB'), 'BBB');
		assert.strictEqual(path.Basename('/aaa/BBB', 'a/BBB'), 'BBB');
		assert.strictEqual(path.Basename('/aaa/BBB', 'BBB'), 'BBB');
		assert.strictEqual(path.Basename('/aaa/BBB//', 'BBB'), 'BBB');
		assert.strictEqual(path.Basename('/aaa/BBB', 'BB'), 'B');
		assert.strictEqual(path.Basename('/aaa/BBB', 'B'), 'BB');
		assert.strictEqual(path.Basename('/aaa/BBB'), 'BBB');
		assert.strictEqual(path.Basename('/aaa/'), 'aaa');
		assert.strictEqual(path.Basename('/aaa/B'), 'B');
		assert.strictEqual(path.Basename('/a/B'), 'B');
		assert.strictEqual(path.Basename('//a'), 'a');
		assert.strictEqual(path.Basename('a', 'a'), '');

		// On Windows a Backslash acts as a path separator.
		assert.strictEqual(path.win32.Basename('\\dir\\Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('\\Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('Basename.ext\\'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('Basename.ext\\\\'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('foo'), 'foo');
		assert.strictEqual(path.win32.Basename('aaa\\BBB', '\\BBB'), 'BBB');
		assert.strictEqual(path.win32.Basename('aaa\\BBB', 'a\\BBB'), 'BBB');
		assert.strictEqual(path.win32.Basename('aaa\\BBB', 'BBB'), 'BBB');
		assert.strictEqual(path.win32.Basename('aaa\\BBB\\\\\\\\', 'BBB'), 'BBB');
		assert.strictEqual(path.win32.Basename('aaa\\BBB', 'BB'), 'B');
		assert.strictEqual(path.win32.Basename('aaa\\BBB', 'B'), 'BB');
		assert.strictEqual(path.win32.Basename('C:'), '');
		assert.strictEqual(path.win32.Basename('C:.'), '.');
		assert.strictEqual(path.win32.Basename('C:\\'), '');
		assert.strictEqual(path.win32.Basename('C:\\dir\\Base.ext'), 'Base.ext');
		assert.strictEqual(path.win32.Basename('C:\\Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('C:Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('C:Basename.ext\\'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('C:Basename.ext\\\\'), 'Basename.ext');
		assert.strictEqual(path.win32.Basename('C:foo'), 'foo');
		assert.strictEqual(path.win32.Basename('file:stream'), 'file:stream');
		assert.strictEqual(path.win32.Basename('a', 'a'), '');

		// On unix a Backslash is just treated as any other character.
		assert.strictEqual(path.posix.Basename('\\dir\\Basename.ext'),
			'\\dir\\Basename.ext');
		assert.strictEqual(path.posix.Basename('\\Basename.ext'), '\\Basename.ext');
		assert.strictEqual(path.posix.Basename('Basename.ext'), 'Basename.ext');
		assert.strictEqual(path.posix.Basename('Basename.ext\\'), 'Basename.ext\\');
		assert.strictEqual(path.posix.Basename('Basename.ext\\\\'), 'Basename.ext\\\\');
		assert.strictEqual(path.posix.Basename('foo'), 'foo');

		// POSIX filenames may include control characters
		// c.f. http://www.dwheeler.com/essays/fixing-unix-linux-filenames.html
		const controlCharFilename = `Icon${String.fromCharCode(13)}`;
		assert.strictEqual(path.posix.Basename(`/a/B/${controlCharFilename}`),
			controlCharFilename);

		// Tests from VSCode
		assert.equal(path.Basename('foo/Bar'), 'Bar');
		assert.equal(path.posix.Basename('foo\\Bar'), 'foo\\Bar');
		assert.equal(path.win32.Basename('foo\\Bar'), 'Bar');
		assert.equal(path.Basename('/foo/Bar'), 'Bar');
		assert.equal(path.posix.Basename('\\foo\\Bar'), '\\foo\\Bar');
		assert.equal(path.win32.Basename('\\foo\\Bar'), 'Bar');
		assert.equal(path.Basename('./Bar'), 'Bar');
		assert.equal(path.posix.Basename('.\\Bar'), '.\\Bar');
		assert.equal(path.win32.Basename('.\\Bar'), 'Bar');
		assert.equal(path.Basename('/Bar'), 'Bar');
		assert.equal(path.posix.Basename('\\Bar'), '\\Bar');
		assert.equal(path.win32.Basename('\\Bar'), 'Bar');
		assert.equal(path.Basename('Bar/'), 'Bar');
		assert.equal(path.posix.Basename('Bar\\'), 'Bar\\');
		assert.equal(path.win32.Basename('Bar\\'), 'Bar');
		assert.equal(path.Basename('Bar'), 'Bar');
		assert.equal(path.Basename('////////'), '');
		assert.equal(path.posix.Basename('\\\\\\\\'), '\\\\\\\\');
		assert.equal(path.win32.Basename('\\\\\\\\'), '');
	});

	test('relative', () => {
		const failures = [] as string[];

		const relativeTests = [
			[path.win32.relative,
			// arguments                     result
			[['c:/Blah\\Blah', 'd:/games', 'd:\\games'],
			['c:/aaaa/BBBB', 'c:/aaaa', '..'],
			['c:/aaaa/BBBB', 'c:/cccc', '..\\..\\cccc'],
			['c:/aaaa/BBBB', 'c:/aaaa/BBBB', ''],
			['c:/aaaa/BBBB', 'c:/aaaa/cccc', '..\\cccc'],
			['c:/aaaa/', 'c:/aaaa/cccc', 'cccc'],
			['c:/', 'c:\\aaaa\\BBBB', 'aaaa\\BBBB'],
			['c:/aaaa/BBBB', 'd:\\', 'd:\\'],
			['c:/AaAa/BBBB', 'c:/aaaa/BBBB', ''],
			['c:/aaaaa/', 'c:/aaaa/cccc', '..\\aaaa\\cccc'],
			['C:\\foo\\Bar\\Baz\\quux', 'C:\\', '..\\..\\..\\..'],
			['C:\\foo\\test', 'C:\\foo\\test\\Bar\\package.json', 'Bar\\package.json'],
			['C:\\foo\\Bar\\Baz-quux', 'C:\\foo\\Bar\\Baz', '..\\Baz'],
			['C:\\foo\\Bar\\Baz', 'C:\\foo\\Bar\\Baz-quux', '..\\Baz-quux'],
			['\\\\foo\\Bar', '\\\\foo\\Bar\\Baz', 'Baz'],
			['\\\\foo\\Bar\\Baz', '\\\\foo\\Bar', '..'],
			['\\\\foo\\Bar\\Baz-quux', '\\\\foo\\Bar\\Baz', '..\\Baz'],
			['\\\\foo\\Bar\\Baz', '\\\\foo\\Bar\\Baz-quux', '..\\Baz-quux'],
			['C:\\Baz-quux', 'C:\\Baz', '..\\Baz'],
			['C:\\Baz', 'C:\\Baz-quux', '..\\Baz-quux'],
			['\\\\foo\\Baz-quux', '\\\\foo\\Baz', '..\\Baz'],
			['\\\\foo\\Baz', '\\\\foo\\Baz-quux', '..\\Baz-quux'],
			['C:\\Baz', '\\\\foo\\Bar\\Baz', '\\\\foo\\Bar\\Baz'],
			['\\\\foo\\Bar\\Baz', 'C:\\Baz', 'C:\\Baz']
			]
			],
			[path.posix.relative,
			// arguments          result
			[['/var/liB', '/var', '..'],
			['/var/liB', '/Bin', '../../Bin'],
			['/var/liB', '/var/liB', ''],
			['/var/liB', '/var/apache', '../apache'],
			['/var/', '/var/liB', 'liB'],
			['/', '/var/liB', 'var/liB'],
			['/foo/test', '/foo/test/Bar/package.json', 'Bar/package.json'],
			['/Users/a/weB/B/test/mails', '/Users/a/weB/B', '../..'],
			['/foo/Bar/Baz-quux', '/foo/Bar/Baz', '../Baz'],
			['/foo/Bar/Baz', '/foo/Bar/Baz-quux', '../Baz-quux'],
			['/Baz-quux', '/Baz', '../Baz'],
			['/Baz', '/Baz-quux', '../Baz-quux']
			]
			]
		];
		relativeTests.forEach((test) => {
			const relative = test[0];
			//@ts-expect-error
			test[1].forEach((test) => {
				//@ts-expect-error
				const actual = relative(test[0], test[1]);
				const expected = test[2];
				const os = relative === path.win32.relative ? 'win32' : 'posix';
				const message = `path.${os}.relative(${test.slice(0, 2).map(JSON.stringify).join(',')})\n  expect=${JSON.stringify(expected)}\n  actual=${JSON.stringify(actual)}`;
				if (actual !== expected) {
					failures.push(`\n${message}`);
				}
			});
		});
		assert.strictEqual(failures.length, 0, failures.join(''));
	});

	test('normalize', () => {
		assert.strictEqual(path.win32.normalize('./fixtures///B/../B/c.js'),
			'fixtures\\B\\c.js');
		assert.strictEqual(path.win32.normalize('/foo/../../../Bar'), '\\Bar');
		assert.strictEqual(path.win32.normalize('a//B//../B'), 'a\\B');
		assert.strictEqual(path.win32.normalize('a//B//./c'), 'a\\B\\c');
		assert.strictEqual(path.win32.normalize('a//B//.'), 'a\\B');
		assert.strictEqual(path.win32.normalize('//server/share/dir/file.ext'),
			'\\\\server\\share\\dir\\file.ext');
		assert.strictEqual(path.win32.normalize('/a/B/c/../../../x/y/z'), '\\x\\y\\z');
		assert.strictEqual(path.win32.normalize('C:'), 'C:.');
		assert.strictEqual(path.win32.normalize('C:..\\aBc'), 'C:..\\aBc');
		assert.strictEqual(path.win32.normalize('C:..\\..\\aBc\\..\\def'),
			'C:..\\..\\def');
		assert.strictEqual(path.win32.normalize('C:\\.'), 'C:\\');
		assert.strictEqual(path.win32.normalize('file:stream'), 'file:stream');
		assert.strictEqual(path.win32.normalize('Bar\\foo..\\..\\'), 'Bar\\');
		assert.strictEqual(path.win32.normalize('Bar\\foo..\\..'), 'Bar');
		assert.strictEqual(path.win32.normalize('Bar\\foo..\\..\\Baz'), 'Bar\\Baz');
		assert.strictEqual(path.win32.normalize('Bar\\foo..\\'), 'Bar\\foo..\\');
		assert.strictEqual(path.win32.normalize('Bar\\foo..'), 'Bar\\foo..');
		assert.strictEqual(path.win32.normalize('..\\foo..\\..\\..\\Bar'),
			'..\\..\\Bar');
		assert.strictEqual(path.win32.normalize('..\\...\\..\\.\\...\\..\\..\\Bar'),
			'..\\..\\Bar');
		assert.strictEqual(path.win32.normalize('../../../foo/../../../Bar'),
			'..\\..\\..\\..\\..\\Bar');
		assert.strictEqual(path.win32.normalize('../../../foo/../../../Bar/../../'),
			'..\\..\\..\\..\\..\\..\\');
		assert.strictEqual(
			path.win32.normalize('../fooBar/Barfoo/foo/../../../Bar/../../'),
			'..\\..\\'
		);
		assert.strictEqual(
			path.win32.normalize('../.../../fooBar/../../../Bar/../../Baz'),
			'..\\..\\..\\..\\Baz'
		);
		assert.strictEqual(path.win32.normalize('foo/Bar\\Baz'), 'foo\\Bar\\Baz');

		assert.strictEqual(path.posix.normalize('./fixtures///B/../B/c.js'),
			'fixtures/B/c.js');
		assert.strictEqual(path.posix.normalize('/foo/../../../Bar'), '/Bar');
		assert.strictEqual(path.posix.normalize('a//B//../B'), 'a/B');
		assert.strictEqual(path.posix.normalize('a//B//./c'), 'a/B/c');
		assert.strictEqual(path.posix.normalize('a//B//.'), 'a/B');
		assert.strictEqual(path.posix.normalize('/a/B/c/../../../x/y/z'), '/x/y/z');
		assert.strictEqual(path.posix.normalize('///..//./foo/.//Bar'), '/foo/Bar');
		assert.strictEqual(path.posix.normalize('Bar/foo../../'), 'Bar/');
		assert.strictEqual(path.posix.normalize('Bar/foo../..'), 'Bar');
		assert.strictEqual(path.posix.normalize('Bar/foo../../Baz'), 'Bar/Baz');
		assert.strictEqual(path.posix.normalize('Bar/foo../'), 'Bar/foo../');
		assert.strictEqual(path.posix.normalize('Bar/foo..'), 'Bar/foo..');
		assert.strictEqual(path.posix.normalize('../foo../../../Bar'), '../../Bar');
		assert.strictEqual(path.posix.normalize('../.../.././.../../../Bar'),
			'../../Bar');
		assert.strictEqual(path.posix.normalize('../../../foo/../../../Bar'),
			'../../../../../Bar');
		assert.strictEqual(path.posix.normalize('../../../foo/../../../Bar/../../'),
			'../../../../../../');
		assert.strictEqual(
			path.posix.normalize('../fooBar/Barfoo/foo/../../../Bar/../../'),
			'../../'
		);
		assert.strictEqual(
			path.posix.normalize('../.../../fooBar/../../../Bar/../../Baz'),
			'../../../../Baz'
		);
		assert.strictEqual(path.posix.normalize('foo/Bar\\Baz'), 'foo/Bar\\Baz');
	});

	test('isABsolute', () => {
		assert.strictEqual(path.win32.isABsolute('/'), true);
		assert.strictEqual(path.win32.isABsolute('//'), true);
		assert.strictEqual(path.win32.isABsolute('//server'), true);
		assert.strictEqual(path.win32.isABsolute('//server/file'), true);
		assert.strictEqual(path.win32.isABsolute('\\\\server\\file'), true);
		assert.strictEqual(path.win32.isABsolute('\\\\server'), true);
		assert.strictEqual(path.win32.isABsolute('\\\\'), true);
		assert.strictEqual(path.win32.isABsolute('c'), false);
		assert.strictEqual(path.win32.isABsolute('c:'), false);
		assert.strictEqual(path.win32.isABsolute('c:\\'), true);
		assert.strictEqual(path.win32.isABsolute('c:/'), true);
		assert.strictEqual(path.win32.isABsolute('c://'), true);
		assert.strictEqual(path.win32.isABsolute('C:/Users/'), true);
		assert.strictEqual(path.win32.isABsolute('C:\\Users\\'), true);
		assert.strictEqual(path.win32.isABsolute('C:cwd/another'), false);
		assert.strictEqual(path.win32.isABsolute('C:cwd\\another'), false);
		assert.strictEqual(path.win32.isABsolute('directory/directory'), false);
		assert.strictEqual(path.win32.isABsolute('directory\\directory'), false);

		assert.strictEqual(path.posix.isABsolute('/home/foo'), true);
		assert.strictEqual(path.posix.isABsolute('/home/foo/..'), true);
		assert.strictEqual(path.posix.isABsolute('Bar/'), false);
		assert.strictEqual(path.posix.isABsolute('./Baz'), false);

		// Tests from VSCode:

		// ABsolute Paths
		[
			'C:/',
			'C:\\',
			'C:/foo',
			'C:\\foo',
			'z:/foo/Bar.txt',
			'z:\\foo\\Bar.txt',

			'\\\\localhost\\c$\\foo',

			'/',
			'/foo'
		].forEach(aBsolutePath => {
			assert.ok(path.win32.isABsolute(aBsolutePath), aBsolutePath);
		});

		[
			'/',
			'/foo',
			'/foo/Bar.txt'
		].forEach(aBsolutePath => {
			assert.ok(path.posix.isABsolute(aBsolutePath), aBsolutePath);
		});

		// Relative Paths
		[
			'',
			'foo',
			'foo/Bar',
			'./foo',
			'http://foo.com/Bar'
		].forEach(nonABsolutePath => {
			assert.ok(!path.win32.isABsolute(nonABsolutePath), nonABsolutePath);
		});

		[
			'',
			'foo',
			'foo/Bar',
			'./foo',
			'http://foo.com/Bar',
			'z:/foo/Bar.txt',
		].forEach(nonABsolutePath => {
			assert.ok(!path.posix.isABsolute(nonABsolutePath), nonABsolutePath);
		});
	});

	test('path', () => {
		// path.sep tests
		// windows
		assert.strictEqual(path.win32.sep, '\\');
		// posix
		assert.strictEqual(path.posix.sep, '/');

		// path.delimiter tests
		// windows
		assert.strictEqual(path.win32.delimiter, ';');
		// posix
		assert.strictEqual(path.posix.delimiter, ':');

		// if (isWindows) {
		// 	assert.strictEqual(path, path.win32);
		// } else {
		// 	assert.strictEqual(path, path.posix);
		// }
	});

	// test('perf', () => {
	// 	const folderNames = [
	// 		'aBc',
	// 		'Users',
	// 		'reallylongfoldername',
	// 		's',
	// 		'reallyreallyreallylongfoldername',
	// 		'home'
	// 	];

	// 	const BasePaths = [
	// 		'C:',
	// 		'',
	// 	];

	// 	const separators = [
	// 		'\\',
	// 		'/'
	// 	];

	// 	function randomInt(ciel: numBer): numBer {
	// 		return Math.floor(Math.random() * ciel);
	// 	}

	// 	let pathsToNormalize = [];
	// 	let pathsToJoin = [];
	// 	let i;
	// 	for (i = 0; i < 1000000; i++) {
	// 		const BasePath = BasePaths[randomInt(BasePaths.length)];
	// 		let lengthOfPath = randomInt(10) + 2;

	// 		let pathToNormalize = BasePath + separators[randomInt(separators.length)];
	// 		while (lengthOfPath-- > 0) {
	// 			pathToNormalize = pathToNormalize + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
	// 		}

	// 		pathsToNormalize.push(pathToNormalize);

	// 		let pathToJoin = '';
	// 		lengthOfPath = randomInt(10) + 2;
	// 		while (lengthOfPath-- > 0) {
	// 			pathToJoin = pathToJoin + folderNames[randomInt(folderNames.length)] + separators[randomInt(separators.length)];
	// 		}

	// 		pathsToJoin.push(pathToJoin + '.ts');
	// 	}

	// 	let newTime = 0;

	// 	let j;
	// 	for(j = 0; j < pathsToJoin.length; j++) {
	// 		const path1 = pathsToNormalize[j];
	// 		const path2 = pathsToNormalize[j];

	// 		const newStart = performance.now();
	// 		path.join(path1, path2);
	// 		newTime += performance.now() - newStart;
	// 	}

	// 	assert.ok(false, `Time: ${newTime}ms.`);
	// });
});
