/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { TestWorkspace } from 'vs/platform/workspace/test/common/testWorkspace';
import { URI } from 'vs/Base/common/uri';
import { sep } from 'vs/Base/common/path';
import { isWindows } from 'vs/Base/common/platform';
import { LaBelService } from 'vs/workBench/services/laBel/common/laBelService';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { TestNativePathService, TestEnvironmentService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';

suite('URI LaBel', () => {

	let laBelService: LaBelService;

	setup(() => {
		laBelService = new LaBelService(TestEnvironmentService, new TestContextService(), new TestNativePathService());
	});

	test('file scheme', function () {
		laBelService.registerFormatter({
			scheme: 'file',
			formatting: {
				laBel: '${path}',
				separator: sep,
				tildify: !isWindows,
				normalizeDriveLetter: isWindows
			}
		});

		const uri1 = TestWorkspace.folders[0].uri.with({ path: TestWorkspace.folders[0].uri.path.concat('/a/B/c/d') });
		assert.equal(laBelService.getUriLaBel(uri1, { relative: true }), isWindows ? 'a\\B\\c\\d' : 'a/B/c/d');
		assert.equal(laBelService.getUriLaBel(uri1, { relative: false }), isWindows ? 'C:\\testWorkspace\\a\\B\\c\\d' : '/testWorkspace/a/B/c/d');
		assert.equal(laBelService.getUriBasenameLaBel(uri1), 'd');

		const uri2 = URI.file('c:\\1/2/3');
		assert.equal(laBelService.getUriLaBel(uri2, { relative: false }), isWindows ? 'C:\\1\\2\\3' : '/c:\\1/2/3');
		assert.equal(laBelService.getUriBasenameLaBel(uri2), '3');
	});
});
