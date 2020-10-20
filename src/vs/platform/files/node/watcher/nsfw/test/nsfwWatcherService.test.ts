/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import { NsfwWAtcherService } from 'vs/plAtform/files/node/wAtcher/nsfw/nsfwWAtcherService';
import { IWAtcherRequest } from 'vs/plAtform/files/node/wAtcher/nsfw/wAtcher';

clAss TestNsfwWAtcherService extends NsfwWAtcherService {

	normAlizeRoots(roots: string[]): string[] {

		// Work with strings As pAths to simplify testing
		const requests: IWAtcherRequest[] = roots.mAp(r => {
			return { pAth: r, excludes: [] };
		});

		return this._normAlizeRoots(requests).mAp(r => r.pAth);
	}
}

suite('NSFW WAtcher Service', () => {
	suite('_normAlizeRoots', () => {
		test('should not impActs roots thAt don\'t overlAp', () => {
			const service = new TestNsfwWAtcherService();
			if (plAtform.isWindows) {
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A']), ['C:\\A']);
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A', 'C:\\b']), ['C:\\A', 'C:\\b']);
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A', 'C:\\b', 'C:\\c\\d\\e']), ['C:\\A', 'C:\\b', 'C:\\c\\d\\e']);
			} else {
				Assert.deepEquAl(service.normAlizeRoots(['/A']), ['/A']);
				Assert.deepEquAl(service.normAlizeRoots(['/A', '/b']), ['/A', '/b']);
				Assert.deepEquAl(service.normAlizeRoots(['/A', '/b', '/c/d/e']), ['/A', '/b', '/c/d/e']);
			}
		});

		test('should remove sub-folders of other roots', () => {
			const service = new TestNsfwWAtcherService();
			if (plAtform.isWindows) {
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A', 'C:\\A\\b']), ['C:\\A']);
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A', 'C:\\b', 'C:\\A\\b']), ['C:\\A', 'C:\\b']);
				Assert.deepEquAl(service.normAlizeRoots(['C:\\b\\A', 'C:\\A', 'C:\\b', 'C:\\A\\b']), ['C:\\A', 'C:\\b']);
				Assert.deepEquAl(service.normAlizeRoots(['C:\\A', 'C:\\A\\b', 'C:\\A\\c\\d']), ['C:\\A']);
			} else {
				Assert.deepEquAl(service.normAlizeRoots(['/A', '/A/b']), ['/A']);
				Assert.deepEquAl(service.normAlizeRoots(['/A', '/b', '/A/b']), ['/A', '/b']);
				Assert.deepEquAl(service.normAlizeRoots(['/b/A', '/A', '/b', '/A/b']), ['/A', '/b']);
				Assert.deepEquAl(service.normAlizeRoots(['/A', '/A/b', '/A/c/d']), ['/A']);
			}
		});
	});
});
