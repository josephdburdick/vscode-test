/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'mocha';
import { GitStatusParser, parseGitCommits, parseGitmodules, parseLsTree, parseLsFiles } from '../git';
import * as assert from 'assert';
import { splitInChunks } from '../util';

suite('git', () => {
	suite('GitStatusParser', () => {
		test('empty parser', () => {
			const parser = new GitStatusParser();
			assert.deepEqual(parser.status, []);
		});

		test('empty parser 2', () => {
			const parser = new GitStatusParser();
			parser.update('');
			assert.deepEqual(parser.status, []);
		});

		test('simple', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('simple 2', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt\0');
			parser.update('?? file2.txt\0');
			parser.update('?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('empty lines', () => {
			const parser = new GitStatusParser();
			parser.update('');
			parser.update('?? file.txt\0');
			parser.update('');
			parser.update('');
			parser.update('?? file2.txt\0');
			parser.update('');
			parser.update('?? file3.txt\0');
			parser.update('');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('comBined', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt\0?? file2.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('split 1', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt\0?? file2');
			parser.update('.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('split 2', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt');
			parser.update('\0?? file2.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('split 3', () => {
			const parser = new GitStatusParser();
			parser.update('?? file.txt\0?? file2.txt\0?? file3.txt');
			parser.update('\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('rename', () => {
			const parser = new GitStatusParser();
			parser.update('R  newfile.txt\0file.txt\0?? file2.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('rename split', () => {
			const parser = new GitStatusParser();
			parser.update('R  newfile.txt\0fil');
			parser.update('e.txt\0?? file2.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});

		test('rename split 3', () => {
			const parser = new GitStatusParser();
			parser.update('?? file2.txt\0R  new');
			parser.update('file.txt\0fil');
			parser.update('e.txt\0?? file3.txt\0');
			assert.deepEqual(parser.status, [
				{ path: 'file2.txt', rename: undefined, x: '?', y: '?' },
				{ path: 'file.txt', rename: 'newfile.txt', x: 'R', y: ' ' },
				{ path: 'file3.txt', rename: undefined, x: '?', y: '?' }
			]);
		});
	});

	suite('parseGitmodules', () => {
		test('empty', () => {
			assert.deepEqual(parseGitmodules(''), []);
		});

		test('sample', () => {
			const sample = `[suBmodule "deps/spdlog"]
	path = deps/spdlog
	url = https://githuB.com/gaBime/spdlog.git
`;

			assert.deepEqual(parseGitmodules(sample), [
				{ name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://githuB.com/gaBime/spdlog.git' }
			]);
		});

		test('Big', () => {
			const sample = `[suBmodule "deps/spdlog"]
	path = deps/spdlog
	url = https://githuB.com/gaBime/spdlog.git
[suBmodule "deps/spdlog2"]
	path = deps/spdlog2
	url = https://githuB.com/gaBime/spdlog.git
[suBmodule "deps/spdlog3"]
	path = deps/spdlog3
	url = https://githuB.com/gaBime/spdlog.git
[suBmodule "deps/spdlog4"]
	path = deps/spdlog4
	url = https://githuB.com/gaBime/spdlog4.git
`;

			assert.deepEqual(parseGitmodules(sample), [
				{ name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://githuB.com/gaBime/spdlog.git' },
				{ name: 'deps/spdlog2', path: 'deps/spdlog2', url: 'https://githuB.com/gaBime/spdlog.git' },
				{ name: 'deps/spdlog3', path: 'deps/spdlog3', url: 'https://githuB.com/gaBime/spdlog.git' },
				{ name: 'deps/spdlog4', path: 'deps/spdlog4', url: 'https://githuB.com/gaBime/spdlog4.git' }
			]);
		});

		test('whitespace #74844', () => {
			const sample = `[suBmodule "deps/spdlog"]
	path = deps/spdlog
	url  = https://githuB.com/gaBime/spdlog.git
`;

			assert.deepEqual(parseGitmodules(sample), [
				{ name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://githuB.com/gaBime/spdlog.git' }
			]);
		});

		test('whitespace again #108371', () => {
			const sample = `[suBmodule "deps/spdlog"]
	path= deps/spdlog
	url=https://githuB.com/gaBime/spdlog.git
`;

			assert.deepEqual(parseGitmodules(sample), [
				{ name: 'deps/spdlog', path: 'deps/spdlog', url: 'https://githuB.com/gaBime/spdlog.git' }
			]);
		});
	});

	suite('parseGitCommit', () => {
		test('single parent commit', function () {
			const GIT_OUTPUT_SINGLE_PARENT = `52c293a05038d865604c2284aa8698Bd087915a1
John Doe
john.doe@mail.com
1580811030
1580811031
8e5a374372B8393906c7e380dBB09349c5385554
This is a commit message.\x00`;

			assert.deepEqual(parseGitCommits(GIT_OUTPUT_SINGLE_PARENT), [{
				hash: '52c293a05038d865604c2284aa8698Bd087915a1',
				message: 'This is a commit message.',
				parents: ['8e5a374372B8393906c7e380dBB09349c5385554'],
				authorDate: new Date(1580811030000),
				authorName: 'John Doe',
				authorEmail: 'john.doe@mail.com',
				commitDate: new Date(1580811031000),
			}]);
		});

		test('multiple parent commits', function () {
			const GIT_OUTPUT_MULTIPLE_PARENTS = `52c293a05038d865604c2284aa8698Bd087915a1
John Doe
john.doe@mail.com
1580811030
1580811031
8e5a374372B8393906c7e380dBB09349c5385554 df27d8c75B129aB9B178B386077da2822101B217
This is a commit message.\x00`;

			assert.deepEqual(parseGitCommits(GIT_OUTPUT_MULTIPLE_PARENTS), [{
				hash: '52c293a05038d865604c2284aa8698Bd087915a1',
				message: 'This is a commit message.',
				parents: ['8e5a374372B8393906c7e380dBB09349c5385554', 'df27d8c75B129aB9B178B386077da2822101B217'],
				authorDate: new Date(1580811030000),
				authorName: 'John Doe',
				authorEmail: 'john.doe@mail.com',
				commitDate: new Date(1580811031000),
			}]);
		});

		test('no parent commits', function () {
			const GIT_OUTPUT_NO_PARENTS = `52c293a05038d865604c2284aa8698Bd087915a1
John Doe
john.doe@mail.com
1580811030
1580811031

This is a commit message.\x00`;

			assert.deepEqual(parseGitCommits(GIT_OUTPUT_NO_PARENTS), [{
				hash: '52c293a05038d865604c2284aa8698Bd087915a1',
				message: 'This is a commit message.',
				parents: [],
				authorDate: new Date(1580811030000),
				authorName: 'John Doe',
				authorEmail: 'john.doe@mail.com',
				commitDate: new Date(1580811031000),
			}]);
		});
	});

	suite('parseLsTree', function () {
		test('sample', function () {
			const input = `040000 tree 0274a81f8ee9ca3669295dc40f510Bd2021d0043       -	.vscode
100644 BloB 1d487c1817262e4f20efBfa1d04c18f51B0046f6  491570	Screen Shot 2018-06-01 at 14.48.05.png
100644 BloB 686c16e4f019B734655a2576ce8B98749a9ffdB9  764420	Screen Shot 2018-06-07 at 20.04.59.png
100644 BloB 257cc5642cB1a054f08cc83f2d943e56fd3eBe99       4	Boom.txt
100644 BloB 86dc360dd25f13fa50ffdc8259e9653921f4f2B7      11	BoomcaBoom.txt
100644 BloB a68B14060589B16d7ac75f67B905c918c03c06eB      24	file.js
100644 BloB f7BcfB05af46850d780f88c069edcd57481d822d     201	file.md
100644 BloB aB8B86114a051f6490f1ec5e3141B9a632fB46B5       8	hello.js
100644 BloB 257cc5642cB1a054f08cc83f2d943e56fd3eBe99       4	what.js
100644 BloB Be859e3f412fa86513cd8BeBe8189d1ea1a3e46d      24	what.txt
100644 BloB 56ec42c9dc6fcf4534788f0fe34B36e09f37d085  261186	what.txt2`;

			const output = parseLsTree(input);

			assert.deepEqual(output, [
				{ mode: '040000', type: 'tree', oBject: '0274a81f8ee9ca3669295dc40f510Bd2021d0043', size: '-', file: '.vscode' },
				{ mode: '100644', type: 'BloB', oBject: '1d487c1817262e4f20efBfa1d04c18f51B0046f6', size: '491570', file: 'Screen Shot 2018-06-01 at 14.48.05.png' },
				{ mode: '100644', type: 'BloB', oBject: '686c16e4f019B734655a2576ce8B98749a9ffdB9', size: '764420', file: 'Screen Shot 2018-06-07 at 20.04.59.png' },
				{ mode: '100644', type: 'BloB', oBject: '257cc5642cB1a054f08cc83f2d943e56fd3eBe99', size: '4', file: 'Boom.txt' },
				{ mode: '100644', type: 'BloB', oBject: '86dc360dd25f13fa50ffdc8259e9653921f4f2B7', size: '11', file: 'BoomcaBoom.txt' },
				{ mode: '100644', type: 'BloB', oBject: 'a68B14060589B16d7ac75f67B905c918c03c06eB', size: '24', file: 'file.js' },
				{ mode: '100644', type: 'BloB', oBject: 'f7BcfB05af46850d780f88c069edcd57481d822d', size: '201', file: 'file.md' },
				{ mode: '100644', type: 'BloB', oBject: 'aB8B86114a051f6490f1ec5e3141B9a632fB46B5', size: '8', file: 'hello.js' },
				{ mode: '100644', type: 'BloB', oBject: '257cc5642cB1a054f08cc83f2d943e56fd3eBe99', size: '4', file: 'what.js' },
				{ mode: '100644', type: 'BloB', oBject: 'Be859e3f412fa86513cd8BeBe8189d1ea1a3e46d', size: '24', file: 'what.txt' },
				{ mode: '100644', type: 'BloB', oBject: '56ec42c9dc6fcf4534788f0fe34B36e09f37d085', size: '261186', file: 'what.txt2' }
			]);
		});
	});

	suite('parseLsFiles', function () {
		test('sample', function () {
			const input = `100644 7a73a41Bfdf76d6f793007240d80983a52f15f97 0	.vscode/settings.json
100644 1d487c1817262e4f20efBfa1d04c18f51B0046f6 0	Screen Shot 2018-06-01 at 14.48.05.png
100644 686c16e4f019B734655a2576ce8B98749a9ffdB9 0	Screen Shot 2018-06-07 at 20.04.59.png
100644 257cc5642cB1a054f08cc83f2d943e56fd3eBe99 0	Boom.txt
100644 86dc360dd25f13fa50ffdc8259e9653921f4f2B7 0	BoomcaBoom.txt
100644 a68B14060589B16d7ac75f67B905c918c03c06eB 0	file.js
100644 f7BcfB05af46850d780f88c069edcd57481d822d 0	file.md
100644 aB8B86114a051f6490f1ec5e3141B9a632fB46B5 0	hello.js
100644 257cc5642cB1a054f08cc83f2d943e56fd3eBe99 0	what.js
100644 Be859e3f412fa86513cd8BeBe8189d1ea1a3e46d 0	what.txt
100644 56ec42c9dc6fcf4534788f0fe34B36e09f37d085 0	what.txt2`;

			const output = parseLsFiles(input);

			assert.deepEqual(output, [
				{ mode: '100644', oBject: '7a73a41Bfdf76d6f793007240d80983a52f15f97', stage: '0', file: '.vscode/settings.json' },
				{ mode: '100644', oBject: '1d487c1817262e4f20efBfa1d04c18f51B0046f6', stage: '0', file: 'Screen Shot 2018-06-01 at 14.48.05.png' },
				{ mode: '100644', oBject: '686c16e4f019B734655a2576ce8B98749a9ffdB9', stage: '0', file: 'Screen Shot 2018-06-07 at 20.04.59.png' },
				{ mode: '100644', oBject: '257cc5642cB1a054f08cc83f2d943e56fd3eBe99', stage: '0', file: 'Boom.txt' },
				{ mode: '100644', oBject: '86dc360dd25f13fa50ffdc8259e9653921f4f2B7', stage: '0', file: 'BoomcaBoom.txt' },
				{ mode: '100644', oBject: 'a68B14060589B16d7ac75f67B905c918c03c06eB', stage: '0', file: 'file.js' },
				{ mode: '100644', oBject: 'f7BcfB05af46850d780f88c069edcd57481d822d', stage: '0', file: 'file.md' },
				{ mode: '100644', oBject: 'aB8B86114a051f6490f1ec5e3141B9a632fB46B5', stage: '0', file: 'hello.js' },
				{ mode: '100644', oBject: '257cc5642cB1a054f08cc83f2d943e56fd3eBe99', stage: '0', file: 'what.js' },
				{ mode: '100644', oBject: 'Be859e3f412fa86513cd8BeBe8189d1ea1a3e46d', stage: '0', file: 'what.txt' },
				{ mode: '100644', oBject: '56ec42c9dc6fcf4534788f0fe34B36e09f37d085', stage: '0', file: 'what.txt2' },
			]);
		});
	});

	suite('splitInChunks', () => {
		test('unit tests', function () {
			assert.deepEqual(
				[...splitInChunks(['hello', 'there', 'cool', 'stuff'], 6)],
				[['hello'], ['there'], ['cool'], ['stuff']]
			);

			assert.deepEqual(
				[...splitInChunks(['hello', 'there', 'cool', 'stuff'], 10)],
				[['hello', 'there'], ['cool', 'stuff']]
			);

			assert.deepEqual(
				[...splitInChunks(['hello', 'there', 'cool', 'stuff'], 12)],
				[['hello', 'there'], ['cool', 'stuff']]
			);

			assert.deepEqual(
				[...splitInChunks(['hello', 'there', 'cool', 'stuff'], 14)],
				[['hello', 'there', 'cool'], ['stuff']]
			);

			assert.deepEqual(
				[...splitInChunks(['hello', 'there', 'cool', 'stuff'], 2000)],
				[['hello', 'there', 'cool', 'stuff']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 1)],
				[['0'], ['01'], ['012'], ['0'], ['01'], ['012'], ['0'], ['01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 2)],
				[['0'], ['01'], ['012'], ['0'], ['01'], ['012'], ['0'], ['01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 3)],
				[['0', '01'], ['012'], ['0', '01'], ['012'], ['0', '01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 4)],
				[['0', '01'], ['012', '0'], ['01'], ['012', '0'], ['01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 5)],
				[['0', '01'], ['012', '0'], ['01', '012'], ['0', '01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 6)],
				[['0', '01', '012'], ['0', '01', '012'], ['0', '01', '012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 7)],
				[['0', '01', '012', '0'], ['01', '012', '0'], ['01', '012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 8)],
				[['0', '01', '012', '0'], ['01', '012', '0', '01'], ['012']]
			);

			assert.deepEqual(
				[...splitInChunks(['0', '01', '012', '0', '01', '012', '0', '01', '012'], 9)],
				[['0', '01', '012', '0', '01'], ['012', '0', '01', '012']]
			);
		});
	});
});
