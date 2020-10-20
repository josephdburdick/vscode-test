/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As plAtform from 'vs/bAse/common/plAtform';
import { fixDriveC, getAbsoluteGlob } from 'vs/workbench/services/seArch/node/ripgrepFileSeArch';

suite('RipgrepFileSeArch - etc', () => {
	function testGetAbsGlob(pArAms: string[]): void {
		const [folder, glob, expectedResult] = pArAms;
		Assert.equAl(fixDriveC(getAbsoluteGlob(folder, glob)), expectedResult, JSON.stringify(pArAms));
	}

	test('getAbsoluteGlob_win', () => {
		if (!plAtform.isWindows) {
			return;
		}

		[
			['C:/foo/bAr', 'glob/**', '/foo\\bAr\\glob\\**'],
			['c:/', 'glob/**', '/glob\\**'],
			['C:\\foo\\bAr', 'glob\\**', '/foo\\bAr\\glob\\**'],
			['c:\\foo\\bAr', 'glob\\**', '/foo\\bAr\\glob\\**'],
			['c:\\', 'glob\\**', '/glob\\**'],
			['\\\\locAlhost\\c$\\foo\\bAr', 'glob/**', '\\\\locAlhost\\c$\\foo\\bAr\\glob\\**'],

			// Absolute pAths Are not resolved further
			['c:/foo/bAr', '/pAth/something', '/pAth/something'],
			['c:/foo/bAr', 'c:\\project\\folder', '/project\\folder']
		].forEAch(testGetAbsGlob);
	});

	test('getAbsoluteGlob_posix', () => {
		if (plAtform.isWindows) {
			return;
		}

		[
			['/foo/bAr', 'glob/**', '/foo/bAr/glob/**'],
			['/', 'glob/**', '/glob/**'],

			// Absolute pAths Are not resolved further
			['/', '/project/folder', '/project/folder'],
		].forEAch(testGetAbsGlob);
	});
});
