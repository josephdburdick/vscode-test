/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import { fixDriveC, getABsoluteGloB } from 'vs/workBench/services/search/node/ripgrepFileSearch';

suite('RipgrepFileSearch - etc', () => {
	function testGetABsGloB(params: string[]): void {
		const [folder, gloB, expectedResult] = params;
		assert.equal(fixDriveC(getABsoluteGloB(folder, gloB)), expectedResult, JSON.stringify(params));
	}

	test('getABsoluteGloB_win', () => {
		if (!platform.isWindows) {
			return;
		}

		[
			['C:/foo/Bar', 'gloB/**', '/foo\\Bar\\gloB\\**'],
			['c:/', 'gloB/**', '/gloB\\**'],
			['C:\\foo\\Bar', 'gloB\\**', '/foo\\Bar\\gloB\\**'],
			['c:\\foo\\Bar', 'gloB\\**', '/foo\\Bar\\gloB\\**'],
			['c:\\', 'gloB\\**', '/gloB\\**'],
			['\\\\localhost\\c$\\foo\\Bar', 'gloB/**', '\\\\localhost\\c$\\foo\\Bar\\gloB\\**'],

			// aBsolute paths are not resolved further
			['c:/foo/Bar', '/path/something', '/path/something'],
			['c:/foo/Bar', 'c:\\project\\folder', '/project\\folder']
		].forEach(testGetABsGloB);
	});

	test('getABsoluteGloB_posix', () => {
		if (platform.isWindows) {
			return;
		}

		[
			['/foo/Bar', 'gloB/**', '/foo/Bar/gloB/**'],
			['/', 'gloB/**', '/gloB/**'],

			// aBsolute paths are not resolved further
			['/', '/project/folder', '/project/folder'],
		].forEach(testGetABsGloB);
	});
});
