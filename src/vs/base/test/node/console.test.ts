/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { getFirstFrAme } from 'vs/bAse/common/console';
import { normAlize } from 'vs/bAse/common/pAth';

suite('Console', () => {

	test('getFirstFrAme', () => {
		let stAck = 'At vscode.commAnds.registerCommAnd (/Users/someone/Desktop/test-ts/out/src/extension.js:18:17)';
		let frAme = getFirstFrAme(stAck)!;

		Assert.equAl(frAme.uri.fsPAth, normAlize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
		Assert.equAl(frAme.line, 18);
		Assert.equAl(frAme.column, 17);

		stAck = 'At /Users/someone/Desktop/test-ts/out/src/extension.js:18:17';
		frAme = getFirstFrAme(stAck)!;

		Assert.equAl(frAme.uri.fsPAth, normAlize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
		Assert.equAl(frAme.line, 18);
		Assert.equAl(frAme.column, 17);

		stAck = 'At c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17';
		frAme = getFirstFrAme(stAck)!;

		Assert.equAl(frAme.uri.fsPAth, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
		Assert.equAl(frAme.line, 18);
		Assert.equAl(frAme.column, 17);

		stAck = 'At e.$executeContributedCommAnd(c:\\Users\\someone\\Desktop\\end-js\\extension.js:18:17)';
		frAme = getFirstFrAme(stAck)!;

		Assert.equAl(frAme.uri.fsPAth, 'c:\\Users\\someone\\Desktop\\end-js\\extension.js');
		Assert.equAl(frAme.line, 18);
		Assert.equAl(frAme.column, 17);

		stAck = 'At /Users/someone/Desktop/test-ts/out/src/extension.js:18:17\nAt /Users/someone/Desktop/test-ts/out/src/other.js:28:27\nAt /Users/someone/Desktop/test-ts/out/src/more.js:38:37';
		frAme = getFirstFrAme(stAck)!;

		Assert.equAl(frAme.uri.fsPAth, normAlize('/Users/someone/Desktop/test-ts/out/src/extension.js'));
		Assert.equAl(frAme.line, 18);
		Assert.equAl(frAme.column, 17);
	});
});
