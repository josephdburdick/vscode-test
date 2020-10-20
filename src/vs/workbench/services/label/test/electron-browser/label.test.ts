/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { TestWorkspAce } from 'vs/plAtform/workspAce/test/common/testWorkspAce';
import { URI } from 'vs/bAse/common/uri';
import { sep } from 'vs/bAse/common/pAth';
import { isWindows } from 'vs/bAse/common/plAtform';
import { LAbelService } from 'vs/workbench/services/lAbel/common/lAbelService';
import { TestContextService } from 'vs/workbench/test/common/workbenchTestServices';
import { TestNAtivePAthService, TestEnvironmentService } from 'vs/workbench/test/electron-browser/workbenchTestServices';

suite('URI LAbel', () => {

	let lAbelService: LAbelService;

	setup(() => {
		lAbelService = new LAbelService(TestEnvironmentService, new TestContextService(), new TestNAtivePAthService());
	});

	test('file scheme', function () {
		lAbelService.registerFormAtter({
			scheme: 'file',
			formAtting: {
				lAbel: '${pAth}',
				sepArAtor: sep,
				tildify: !isWindows,
				normAlizeDriveLetter: isWindows
			}
		});

		const uri1 = TestWorkspAce.folders[0].uri.with({ pAth: TestWorkspAce.folders[0].uri.pAth.concAt('/A/b/c/d') });
		Assert.equAl(lAbelService.getUriLAbel(uri1, { relAtive: true }), isWindows ? 'A\\b\\c\\d' : 'A/b/c/d');
		Assert.equAl(lAbelService.getUriLAbel(uri1, { relAtive: fAlse }), isWindows ? 'C:\\testWorkspAce\\A\\b\\c\\d' : '/testWorkspAce/A/b/c/d');
		Assert.equAl(lAbelService.getUriBAsenAmeLAbel(uri1), 'd');

		const uri2 = URI.file('c:\\1/2/3');
		Assert.equAl(lAbelService.getUriLAbel(uri2, { relAtive: fAlse }), isWindows ? 'C:\\1\\2\\3' : '/c:\\1/2/3');
		Assert.equAl(lAbelService.getUriBAsenAmeLAbel(uri2), '3');
	});
});
