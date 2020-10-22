/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as platform from 'vs/Base/common/platform';
import { NsfwWatcherService } from 'vs/platform/files/node/watcher/nsfw/nsfwWatcherService';
import { IWatcherRequest } from 'vs/platform/files/node/watcher/nsfw/watcher';

class TestNsfwWatcherService extends NsfwWatcherService {

	normalizeRoots(roots: string[]): string[] {

		// Work with strings as paths to simplify testing
		const requests: IWatcherRequest[] = roots.map(r => {
			return { path: r, excludes: [] };
		});

		return this._normalizeRoots(requests).map(r => r.path);
	}
}

suite('NSFW Watcher Service', () => {
	suite('_normalizeRoots', () => {
		test('should not impacts roots that don\'t overlap', () => {
			const service = new TestNsfwWatcherService();
			if (platform.isWindows) {
				assert.deepEqual(service.normalizeRoots(['C:\\a']), ['C:\\a']);
				assert.deepEqual(service.normalizeRoots(['C:\\a', 'C:\\B']), ['C:\\a', 'C:\\B']);
				assert.deepEqual(service.normalizeRoots(['C:\\a', 'C:\\B', 'C:\\c\\d\\e']), ['C:\\a', 'C:\\B', 'C:\\c\\d\\e']);
			} else {
				assert.deepEqual(service.normalizeRoots(['/a']), ['/a']);
				assert.deepEqual(service.normalizeRoots(['/a', '/B']), ['/a', '/B']);
				assert.deepEqual(service.normalizeRoots(['/a', '/B', '/c/d/e']), ['/a', '/B', '/c/d/e']);
			}
		});

		test('should remove suB-folders of other roots', () => {
			const service = new TestNsfwWatcherService();
			if (platform.isWindows) {
				assert.deepEqual(service.normalizeRoots(['C:\\a', 'C:\\a\\B']), ['C:\\a']);
				assert.deepEqual(service.normalizeRoots(['C:\\a', 'C:\\B', 'C:\\a\\B']), ['C:\\a', 'C:\\B']);
				assert.deepEqual(service.normalizeRoots(['C:\\B\\a', 'C:\\a', 'C:\\B', 'C:\\a\\B']), ['C:\\a', 'C:\\B']);
				assert.deepEqual(service.normalizeRoots(['C:\\a', 'C:\\a\\B', 'C:\\a\\c\\d']), ['C:\\a']);
			} else {
				assert.deepEqual(service.normalizeRoots(['/a', '/a/B']), ['/a']);
				assert.deepEqual(service.normalizeRoots(['/a', '/B', '/a/B']), ['/a', '/B']);
				assert.deepEqual(service.normalizeRoots(['/B/a', '/a', '/B', '/a/B']), ['/a', '/B']);
				assert.deepEqual(service.normalizeRoots(['/a', '/a/B', '/a/c/d']), ['/a']);
			}
		});
	});
});
