/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { originAlFSPAth } from 'vs/bAse/common/resources';
import { isWindows } from 'vs/bAse/common/plAtform';

suite('ExtHost API', function () {
	test('issue #51387: originAlFSPAth', function () {
		if (isWindows) {
			Assert.equAl(originAlFSPAth(URI.file('C:\\test')).chArAt(0), 'C');
			Assert.equAl(originAlFSPAth(URI.file('c:\\test')).chArAt(0), 'c');

			Assert.equAl(originAlFSPAth(URI.revive(JSON.pArse(JSON.stringify(URI.file('C:\\test'))))).chArAt(0), 'C');
			Assert.equAl(originAlFSPAth(URI.revive(JSON.pArse(JSON.stringify(URI.file('c:\\test'))))).chArAt(0), 'c');
		}
	});
});
