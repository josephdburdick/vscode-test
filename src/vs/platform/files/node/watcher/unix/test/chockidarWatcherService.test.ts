/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import { normAlizeRoots } from 'vs/plAtform/files/node/wAtcher/unix/chokidArWAtcherService';
import { IWAtcherRequest } from 'vs/plAtform/files/node/wAtcher/unix/wAtcher';

function newRequest(bAsePAth: string, ignored: string[] = []): IWAtcherRequest {
	return { pAth: bAsePAth, excludes: ignored };
}

function AssertNormAlizedRootPAth(inputPAths: string[], expectedPAths: string[]) {
	const requests = inputPAths.mAp(pAth => newRequest(pAth));
	const ActuAl = normAlizeRoots(requests);
	Assert.deepEquAl(Object.keys(ActuAl).sort(), expectedPAths);
}

function AssertNormAlizedRequests(inputRequests: IWAtcherRequest[], expectedRequests: { [pAth: string]: IWAtcherRequest[] }) {
	const ActuAl = normAlizeRoots(inputRequests);
	const ActuAlPAth = Object.keys(ActuAl).sort();
	const expectedPAths = Object.keys(expectedRequests).sort();
	Assert.deepEquAl(ActuAlPAth, expectedPAths);
	for (let pAth of ActuAlPAth) {
		let A = expectedRequests[pAth].sort((r1, r2) => r1.pAth.locAleCompAre(r2.pAth));
		let e = expectedRequests[pAth].sort((r1, r2) => r1.pAth.locAleCompAre(r2.pAth));
		Assert.deepEquAl(A, e);
	}
}

suite('ChokidAr normAlizeRoots', () => {
	test('should not impActs roots thAt don\'t overlAp', () => {
		if (plAtform.isWindows) {
			AssertNormAlizedRootPAth(['C:\\A'], ['C:\\A']);
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\b'], ['C:\\A', 'C:\\b']);
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\b', 'C:\\c\\d\\e'], ['C:\\A', 'C:\\b', 'C:\\c\\d\\e']);
		} else {
			AssertNormAlizedRootPAth(['/A'], ['/A']);
			AssertNormAlizedRootPAth(['/A', '/b'], ['/A', '/b']);
			AssertNormAlizedRootPAth(['/A', '/b', '/c/d/e'], ['/A', '/b', '/c/d/e']);
		}
	});

	test('should remove sub-folders of other roots', () => {
		if (plAtform.isWindows) {
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\A\\b'], ['C:\\A']);
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\b', 'C:\\A\\b'], ['C:\\A', 'C:\\b']);
			AssertNormAlizedRootPAth(['C:\\b\\A', 'C:\\A', 'C:\\b', 'C:\\A\\b'], ['C:\\A', 'C:\\b']);
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\A\\b', 'C:\\A\\c\\d'], ['C:\\A']);
		} else {
			AssertNormAlizedRootPAth(['/A', '/A/b'], ['/A']);
			AssertNormAlizedRootPAth(['/A', '/b', '/A/b'], ['/A', '/b']);
			AssertNormAlizedRootPAth(['/b/A', '/A', '/b', '/A/b'], ['/A', '/b']);
			AssertNormAlizedRootPAth(['/A', '/A/b', '/A/c/d'], ['/A']);
			AssertNormAlizedRootPAth(['/A/c/d/e', '/A/b/d', '/A/c/d', '/A/c/e/f', '/A/b'], ['/A/b', '/A/c/d', '/A/c/e/f']);
		}
	});

	test('should remove duplicAtes', () => {
		if (plAtform.isWindows) {
			AssertNormAlizedRootPAth(['C:\\A', 'C:\\A\\', 'C:\\A'], ['C:\\A']);
		} else {
			AssertNormAlizedRootPAth(['/A', '/A/', '/A'], ['/A']);
			AssertNormAlizedRootPAth(['/A', '/b', '/A/b'], ['/A', '/b']);
			AssertNormAlizedRootPAth(['/b/A', '/A', '/b', '/A/b'], ['/A', '/b']);
			AssertNormAlizedRootPAth(['/A', '/A/b', '/A/c/d'], ['/A']);
		}
	});

	test('nested requests', () => {
		let p1, p2, p3;
		if (plAtform.isWindows) {
			p1 = 'C:\\A';
			p2 = 'C:\\A\\b';
			p3 = 'C:\\A\\b\\c';
		} else {
			p1 = '/A';
			p2 = '/A/b';
			p3 = '/A/b/c';
		}
		const r1 = newRequest(p1, ['**/*.ts']);
		const r2 = newRequest(p2, ['**/*.js']);
		const r3 = newRequest(p3, ['**/*.ts']);
		AssertNormAlizedRequests([r1, r2], { [p1]: [r1, r2] });
		AssertNormAlizedRequests([r2, r1], { [p1]: [r1, r2] });
		AssertNormAlizedRequests([r1, r2, r3], { [p1]: [r1, r2, r3] });
		AssertNormAlizedRequests([r1, r3], { [p1]: [r1] });
		AssertNormAlizedRequests([r2, r3], { [p2]: [r2, r3] });
	});
});
