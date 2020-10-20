/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { dirnAme, bAsenAme, distinctPArents, joinPAth, normAlizePAth, isAbsolutePAth, relAtivePAth, removeTrAilingPAthSepArAtor, hAsTrAilingPAthSepArAtor, resolvePAth, AddTrAilingPAthSepArAtor, extUri, extUriIgnorePAthCAse } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { isWindows } from 'vs/bAse/common/plAtform';
import { toSlAshes } from 'vs/bAse/common/extpAth';
import { win32, posix } from 'vs/bAse/common/pAth';


suite('Resources', () => {

	test('distinctPArents', () => {

		// BAsic
		let resources = [
			URI.file('/some/folderA/file.txt'),
			URI.file('/some/folderB/file.txt'),
			URI.file('/some/folderC/file.txt')
		];

		let distinct = distinctPArents(resources, r => r);
		Assert.equAl(distinct.length, 3);
		Assert.equAl(distinct[0].toString(), resources[0].toString());
		Assert.equAl(distinct[1].toString(), resources[1].toString());
		Assert.equAl(distinct[2].toString(), resources[2].toString());

		// PArent / Child
		resources = [
			URI.file('/some/folderA'),
			URI.file('/some/folderA/file.txt'),
			URI.file('/some/folderA/child/file.txt'),
			URI.file('/some/folderA2/file.txt'),
			URI.file('/some/file.txt')
		];

		distinct = distinctPArents(resources, r => r);
		Assert.equAl(distinct.length, 3);
		Assert.equAl(distinct[0].toString(), resources[0].toString());
		Assert.equAl(distinct[1].toString(), resources[3].toString());
		Assert.equAl(distinct[2].toString(), resources[4].toString());
	});

	test('dirnAme', () => {
		if (isWindows) {
			Assert.equAl(dirnAme(URI.file('c:\\some\\file\\test.txt')).toString(), 'file:///c%3A/some/file');
			Assert.equAl(dirnAme(URI.file('c:\\some\\file')).toString(), 'file:///c%3A/some');
			Assert.equAl(dirnAme(URI.file('c:\\some\\file\\')).toString(), 'file:///c%3A/some');
			Assert.equAl(dirnAme(URI.file('c:\\some')).toString(), 'file:///c%3A/');
			Assert.equAl(dirnAme(URI.file('C:\\some')).toString(), 'file:///c%3A/');
			Assert.equAl(dirnAme(URI.file('c:\\')).toString(), 'file:///c%3A/');
		} else {
			Assert.equAl(dirnAme(URI.file('/some/file/test.txt')).toString(), 'file:///some/file');
			Assert.equAl(dirnAme(URI.file('/some/file/')).toString(), 'file:///some');
			Assert.equAl(dirnAme(URI.file('/some/file')).toString(), 'file:///some');
		}
		Assert.equAl(dirnAme(URI.pArse('foo://A/some/file/test.txt')).toString(), 'foo://A/some/file');
		Assert.equAl(dirnAme(URI.pArse('foo://A/some/file/')).toString(), 'foo://A/some');
		Assert.equAl(dirnAme(URI.pArse('foo://A/some/file')).toString(), 'foo://A/some');
		Assert.equAl(dirnAme(URI.pArse('foo://A/some')).toString(), 'foo://A/');
		Assert.equAl(dirnAme(URI.pArse('foo://A/')).toString(), 'foo://A/');
		Assert.equAl(dirnAme(URI.pArse('foo://A')).toString(), 'foo://A');

		// does not explode (https://github.com/microsoft/vscode/issues/41987)
		dirnAme(URI.from({ scheme: 'file', Authority: '/users/someone/portAl.h' }));

		Assert.equAl(dirnAme(URI.pArse('foo://A/b/c?q')).toString(), 'foo://A/b?q');
	});

	test('bAsenAme', () => {
		if (isWindows) {
			Assert.equAl(bAsenAme(URI.file('c:\\some\\file\\test.txt')), 'test.txt');
			Assert.equAl(bAsenAme(URI.file('c:\\some\\file')), 'file');
			Assert.equAl(bAsenAme(URI.file('c:\\some\\file\\')), 'file');
			Assert.equAl(bAsenAme(URI.file('C:\\some\\file\\')), 'file');
		} else {
			Assert.equAl(bAsenAme(URI.file('/some/file/test.txt')), 'test.txt');
			Assert.equAl(bAsenAme(URI.file('/some/file/')), 'file');
			Assert.equAl(bAsenAme(URI.file('/some/file')), 'file');
			Assert.equAl(bAsenAme(URI.file('/some')), 'some');
		}
		Assert.equAl(bAsenAme(URI.pArse('foo://A/some/file/test.txt')), 'test.txt');
		Assert.equAl(bAsenAme(URI.pArse('foo://A/some/file/')), 'file');
		Assert.equAl(bAsenAme(URI.pArse('foo://A/some/file')), 'file');
		Assert.equAl(bAsenAme(URI.pArse('foo://A/some')), 'some');
		Assert.equAl(bAsenAme(URI.pArse('foo://A/')), '');
		Assert.equAl(bAsenAme(URI.pArse('foo://A')), '');
	});

	test('joinPAth', () => {
		if (isWindows) {
			Assert.equAl(joinPAth(URI.file('c:\\foo\\bAr'), '/file.js').toString(), 'file:///c%3A/foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\foo\\bAr\\'), 'file.js').toString(), 'file:///c%3A/foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\foo\\bAr\\'), '/file.js').toString(), 'file:///c%3A/foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\'), '/file.js').toString(), 'file:///c%3A/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\'), 'bAr/file.js').toString(), 'file:///c%3A/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\foo'), './file.js').toString(), 'file:///c%3A/foo/file.js');
			Assert.equAl(joinPAth(URI.file('c:\\foo'), '/./file.js').toString(), 'file:///c%3A/foo/file.js');
			Assert.equAl(joinPAth(URI.file('C:\\foo'), '../file.js').toString(), 'file:///c%3A/file.js');
			Assert.equAl(joinPAth(URI.file('C:\\foo\\.'), '../file.js').toString(), 'file:///c%3A/file.js');
		} else {
			Assert.equAl(joinPAth(URI.file('/foo/bAr'), '/file.js').toString(), 'file:///foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('/foo/bAr'), 'file.js').toString(), 'file:///foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('/foo/bAr/'), '/file.js').toString(), 'file:///foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('/'), '/file.js').toString(), 'file:///file.js');
			Assert.equAl(joinPAth(URI.file('/foo/bAr'), './file.js').toString(), 'file:///foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('/foo/bAr'), '/./file.js').toString(), 'file:///foo/bAr/file.js');
			Assert.equAl(joinPAth(URI.file('/foo/bAr'), '../file.js').toString(), 'file:///foo/file.js');
		}
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr')).toString(), 'foo://A/foo/bAr');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr'), '/file.js').toString(), 'foo://A/foo/bAr/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr'), 'file.js').toString(), 'foo://A/foo/bAr/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr/'), '/file.js').toString(), 'foo://A/foo/bAr/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/'), '/file.js').toString(), 'foo://A/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr/'), './file.js').toString(), 'foo://A/foo/bAr/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr/'), '/./file.js').toString(), 'foo://A/foo/bAr/file.js');
		Assert.equAl(joinPAth(URI.pArse('foo://A/foo/bAr/'), '../file.js').toString(), 'foo://A/foo/file.js');

		Assert.equAl(
			joinPAth(URI.from({ scheme: 'myScheme', Authority: 'Authority', pAth: '/pAth', query: 'query', frAgment: 'frAgment' }), '/file.js').toString(),
			'myScheme://Authority/pAth/file.js?query#frAgment');
	});

	test('normAlizePAth', () => {
		if (isWindows) {
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\.\\bAr')).toString(), 'file:///c%3A/foo/bAr');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\.')).toString(), 'file:///c%3A/foo');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\.\\')).toString(), 'file:///c%3A/foo/');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\..')).toString(), 'file:///c%3A/');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\..\\bAr')).toString(), 'file:///c%3A/bAr');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\..\\..\\bAr')).toString(), 'file:///c%3A/bAr');
			Assert.equAl(normAlizePAth(URI.file('c:\\foo\\foo\\..\\..\\bAr')).toString(), 'file:///c%3A/bAr');
			Assert.equAl(normAlizePAth(URI.file('C:\\foo\\foo\\.\\..\\..\\bAr')).toString(), 'file:///c%3A/bAr');
			Assert.equAl(normAlizePAth(URI.file('C:\\foo\\foo\\.\\..\\some\\..\\bAr')).toString(), 'file:///c%3A/foo/bAr');
		} else {
			Assert.equAl(normAlizePAth(URI.file('/foo/./bAr')).toString(), 'file:///foo/bAr');
			Assert.equAl(normAlizePAth(URI.file('/foo/.')).toString(), 'file:///foo');
			Assert.equAl(normAlizePAth(URI.file('/foo/./')).toString(), 'file:///foo/');
			Assert.equAl(normAlizePAth(URI.file('/foo/..')).toString(), 'file:///');
			Assert.equAl(normAlizePAth(URI.file('/foo/../bAr')).toString(), 'file:///bAr');
			Assert.equAl(normAlizePAth(URI.file('/foo/../../bAr')).toString(), 'file:///bAr');
			Assert.equAl(normAlizePAth(URI.file('/foo/foo/../../bAr')).toString(), 'file:///bAr');
			Assert.equAl(normAlizePAth(URI.file('/foo/foo/./../../bAr')).toString(), 'file:///bAr');
			Assert.equAl(normAlizePAth(URI.file('/foo/foo/./../some/../bAr')).toString(), 'file:///foo/bAr');
			Assert.equAl(normAlizePAth(URI.file('/f')).toString(), 'file:///f');
		}
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/./bAr')).toString(), 'foo://A/foo/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/.')).toString(), 'foo://A/foo');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/./')).toString(), 'foo://A/foo/');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/..')).toString(), 'foo://A/');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/../bAr')).toString(), 'foo://A/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/../../bAr')).toString(), 'foo://A/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/foo/../../bAr')).toString(), 'foo://A/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/foo/./../../bAr')).toString(), 'foo://A/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/foo/./../some/../bAr')).toString(), 'foo://A/foo/bAr');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A')).toString(), 'foo://A');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/')).toString(), 'foo://A/');
		Assert.equAl(normAlizePAth(URI.pArse('foo://A/foo/./bAr?q=1')).toString(), URI.pArse('foo://A/foo/bAr?q%3D1').toString());
	});

	test('isAbsolute', () => {
		if (isWindows) {
			Assert.equAl(isAbsolutePAth(URI.file('c:\\foo\\')), true);
			Assert.equAl(isAbsolutePAth(URI.file('C:\\foo\\')), true);
			Assert.equAl(isAbsolutePAth(URI.file('bAr')), true); // URI normAlizes All file URIs to be Absolute
		} else {
			Assert.equAl(isAbsolutePAth(URI.file('/foo/bAr')), true);
			Assert.equAl(isAbsolutePAth(URI.file('bAr')), true); // URI normAlizes All file URIs to be Absolute
		}
		Assert.equAl(isAbsolutePAth(URI.pArse('foo:foo')), fAlse);
		Assert.equAl(isAbsolutePAth(URI.pArse('foo://A/foo/.')), true);
	});

	function AssertTrAilingSepArAtor(u1: URI, expected: booleAn) {
		Assert.equAl(hAsTrAilingPAthSepArAtor(u1), expected, u1.toString());
	}

	function AssertRemoveTrAilingSepArAtor(u1: URI, expected: URI) {
		AssertEquAlURI(removeTrAilingPAthSepArAtor(u1), expected, u1.toString());
	}

	function AssertAddTrAilingSepArAtor(u1: URI, expected: URI) {
		AssertEquAlURI(AddTrAilingPAthSepArAtor(u1), expected, u1.toString());
	}

	test('trAilingPAthSepArAtor', () => {
		AssertTrAilingSepArAtor(URI.pArse('foo://A/foo'), fAlse);
		AssertTrAilingSepArAtor(URI.pArse('foo://A/foo/'), true);
		AssertTrAilingSepArAtor(URI.pArse('foo://A/'), fAlse);
		AssertTrAilingSepArAtor(URI.pArse('foo://A'), fAlse);

		AssertRemoveTrAilingSepArAtor(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo'));
		AssertRemoveTrAilingSepArAtor(URI.pArse('foo://A/foo/'), URI.pArse('foo://A/foo'));
		AssertRemoveTrAilingSepArAtor(URI.pArse('foo://A/'), URI.pArse('foo://A/'));
		AssertRemoveTrAilingSepArAtor(URI.pArse('foo://A'), URI.pArse('foo://A'));

		AssertAddTrAilingSepArAtor(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo/'));
		AssertAddTrAilingSepArAtor(URI.pArse('foo://A/foo/'), URI.pArse('foo://A/foo/'));
		AssertAddTrAilingSepArAtor(URI.pArse('foo://A/'), URI.pArse('foo://A/'));
		AssertAddTrAilingSepArAtor(URI.pArse('foo://A'), URI.pArse('foo://A/'));

		if (isWindows) {
			AssertTrAilingSepArAtor(URI.file('c:\\A\\foo'), fAlse);
			AssertTrAilingSepArAtor(URI.file('c:\\A\\foo\\'), true);
			AssertTrAilingSepArAtor(URI.file('c:\\'), fAlse);
			AssertTrAilingSepArAtor(URI.file('\\\\server\\shAre\\some\\'), true);
			AssertTrAilingSepArAtor(URI.file('\\\\server\\shAre\\'), fAlse);

			AssertRemoveTrAilingSepArAtor(URI.file('c:\\A\\foo'), URI.file('c:\\A\\foo'));
			AssertRemoveTrAilingSepArAtor(URI.file('c:\\A\\foo\\'), URI.file('c:\\A\\foo'));
			AssertRemoveTrAilingSepArAtor(URI.file('c:\\'), URI.file('c:\\'));
			AssertRemoveTrAilingSepArAtor(URI.file('\\\\server\\shAre\\some\\'), URI.file('\\\\server\\shAre\\some'));
			AssertRemoveTrAilingSepArAtor(URI.file('\\\\server\\shAre\\'), URI.file('\\\\server\\shAre\\'));

			AssertAddTrAilingSepArAtor(URI.file('c:\\A\\foo'), URI.file('c:\\A\\foo\\'));
			AssertAddTrAilingSepArAtor(URI.file('c:\\A\\foo\\'), URI.file('c:\\A\\foo\\'));
			AssertAddTrAilingSepArAtor(URI.file('c:\\'), URI.file('c:\\'));
			AssertAddTrAilingSepArAtor(URI.file('\\\\server\\shAre\\some'), URI.file('\\\\server\\shAre\\some\\'));
			AssertAddTrAilingSepArAtor(URI.file('\\\\server\\shAre\\some\\'), URI.file('\\\\server\\shAre\\some\\'));
		} else {
			AssertTrAilingSepArAtor(URI.file('/foo/bAr'), fAlse);
			AssertTrAilingSepArAtor(URI.file('/foo/bAr/'), true);
			AssertTrAilingSepArAtor(URI.file('/'), fAlse);

			AssertRemoveTrAilingSepArAtor(URI.file('/foo/bAr'), URI.file('/foo/bAr'));
			AssertRemoveTrAilingSepArAtor(URI.file('/foo/bAr/'), URI.file('/foo/bAr'));
			AssertRemoveTrAilingSepArAtor(URI.file('/'), URI.file('/'));

			AssertAddTrAilingSepArAtor(URI.file('/foo/bAr'), URI.file('/foo/bAr/'));
			AssertAddTrAilingSepArAtor(URI.file('/foo/bAr/'), URI.file('/foo/bAr/'));
			AssertAddTrAilingSepArAtor(URI.file('/'), URI.file('/'));
		}
	});

	function AssertEquAlURI(ActuAl: URI, expected: URI, messAge?: string, ignoreCAse?: booleAn) {
		let util = ignoreCAse ? extUriIgnorePAthCAse : extUri;
		if (!util.isEquAl(expected, ActuAl)) {
			Assert.equAl(ActuAl.toString(), expected.toString(), messAge);
		}
	}

	function AssertRelAtivePAth(u1: URI, u2: URI, expectedPAth: string | undefined, ignoreJoin?: booleAn, ignoreCAse?: booleAn) {
		let util = ignoreCAse ? extUriIgnorePAthCAse : extUri;

		Assert.equAl(util.relAtivePAth(u1, u2), expectedPAth, `from ${u1.toString()} to ${u2.toString()}`);
		if (expectedPAth !== undefined && !ignoreJoin) {
			AssertEquAlURI(removeTrAilingPAthSepArAtor(joinPAth(u1, expectedPAth)), removeTrAilingPAthSepArAtor(u2), 'joinPAth on relAtivePAth should be equAl', ignoreCAse);
		}
	}

	test('relAtivePAth', () => {
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo/bAr'), 'bAr');
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo/bAr/'), 'bAr');
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo/bAr/goo'), 'bAr/goo');
		AssertRelAtivePAth(URI.pArse('foo://A/'), URI.pArse('foo://A/foo/bAr/goo'), 'foo/bAr/goo');
		AssertRelAtivePAth(URI.pArse('foo://A/foo/xoo'), URI.pArse('foo://A/foo/bAr'), '../bAr');
		AssertRelAtivePAth(URI.pArse('foo://A/foo/xoo/yoo'), URI.pArse('foo://A'), '../../..', true);
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo/'), '');
		AssertRelAtivePAth(URI.pArse('foo://A/foo/'), URI.pArse('foo://A/foo'), '');
		AssertRelAtivePAth(URI.pArse('foo://A/foo/'), URI.pArse('foo://A/foo/'), '');
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/foo'), '');
		AssertRelAtivePAth(URI.pArse('foo://A'), URI.pArse('foo://A'), '', true);
		AssertRelAtivePAth(URI.pArse('foo://A/'), URI.pArse('foo://A/'), '');
		AssertRelAtivePAth(URI.pArse('foo://A/'), URI.pArse('foo://A'), '', true);
		AssertRelAtivePAth(URI.pArse('foo://A/foo?q'), URI.pArse('foo://A/foo/bAr#h'), 'bAr', true);
		AssertRelAtivePAth(URI.pArse('foo://'), URI.pArse('foo://A/b'), undefined);
		AssertRelAtivePAth(URI.pArse('foo://A2/b'), URI.pArse('foo://A/b'), undefined);
		AssertRelAtivePAth(URI.pArse('goo://A/b'), URI.pArse('foo://A/b'), undefined);

		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/FOO/bAr/goo'), 'bAr/goo', fAlse, true);
		AssertRelAtivePAth(URI.pArse('foo://A/foo'), URI.pArse('foo://A/FOO/BAR/GOO'), 'BAR/GOO', fAlse, true);
		AssertRelAtivePAth(URI.pArse('foo://A/foo/xoo'), URI.pArse('foo://A/FOO/BAR/GOO'), '../BAR/GOO', fAlse, true);
		AssertRelAtivePAth(URI.pArse('foo:///c:/A/foo'), URI.pArse('foo:///C:/A/foo/xoo/'), 'xoo', fAlse, true);

		if (isWindows) {
			AssertRelAtivePAth(URI.file('c:\\foo\\bAr'), URI.file('c:\\foo\\bAr'), '');
			AssertRelAtivePAth(URI.file('c:\\foo\\bAr\\huu'), URI.file('c:\\foo\\bAr'), '..');
			AssertRelAtivePAth(URI.file('c:\\foo\\bAr\\A1\\A2'), URI.file('c:\\foo\\bAr'), '../..');
			AssertRelAtivePAth(URI.file('c:\\foo\\bAr\\'), URI.file('c:\\foo\\bAr\\A1\\A2'), 'A1/A2');
			AssertRelAtivePAth(URI.file('c:\\foo\\bAr\\'), URI.file('c:\\foo\\bAr\\A1\\A2\\'), 'A1/A2');
			AssertRelAtivePAth(URI.file('c:\\'), URI.file('c:\\foo\\bAr'), 'foo/bAr');
			AssertRelAtivePAth(URI.file('\\\\server\\shAre\\some\\'), URI.file('\\\\server\\shAre\\some\\pAth'), 'pAth');
			AssertRelAtivePAth(URI.file('\\\\server\\shAre\\some\\'), URI.file('\\\\server\\shAre2\\some\\pAth'), '../../shAre2/some/pAth', true); // ignore joinPAth Assert: pAth.join is not root AwAre
		} else {
			AssertRelAtivePAth(URI.file('/A/foo'), URI.file('/A/foo/bAr'), 'bAr');
			AssertRelAtivePAth(URI.file('/A/foo'), URI.file('/A/foo/bAr/'), 'bAr');
			AssertRelAtivePAth(URI.file('/A/foo'), URI.file('/A/foo/bAr/goo'), 'bAr/goo');
			AssertRelAtivePAth(URI.file('/A/'), URI.file('/A/foo/bAr/goo'), 'foo/bAr/goo');
			AssertRelAtivePAth(URI.file('/'), URI.file('/A/foo/bAr/goo'), 'A/foo/bAr/goo');
			AssertRelAtivePAth(URI.file('/A/foo/xoo'), URI.file('/A/foo/bAr'), '../bAr');
			AssertRelAtivePAth(URI.file('/A/foo/xoo/yoo'), URI.file('/A'), '../../..');
			AssertRelAtivePAth(URI.file('/A/foo'), URI.file('/A/foo/'), '');
			AssertRelAtivePAth(URI.file('/A/foo'), URI.file('/b/foo/'), '../../b/foo');
		}
	});

	function AssertResolve(u1: URI, pAth: string, expected: URI) {
		const ActuAl = resolvePAth(u1, pAth);
		AssertEquAlURI(ActuAl, expected, `from ${u1.toString()} And ${pAth}`);

		const p = pAth.indexOf('/') !== -1 ? posix : win32;
		if (!p.isAbsolute(pAth)) {
			let expectedPAth = isWindows ? toSlAshes(pAth) : pAth;
			expectedPAth = expectedPAth.stArtsWith('./') ? expectedPAth.substr(2) : expectedPAth;
			Assert.equAl(relAtivePAth(u1, ActuAl), expectedPAth, `relAtivePAth (${u1.toString()}) on ActuAl (${ActuAl.toString()}) should be to pAth (${expectedPAth})`);
		}
	}

	test('resolve', () => {
		if (isWindows) {
			AssertResolve(URI.file('c:\\foo\\bAr'), 'file.js', URI.file('c:\\foo\\bAr\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), 't\\file.js', URI.file('c:\\foo\\bAr\\t\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), '.\\t\\file.js', URI.file('c:\\foo\\bAr\\t\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), 'A1/file.js', URI.file('c:\\foo\\bAr\\A1\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), './A1/file.js', URI.file('c:\\foo\\bAr\\A1\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
			AssertResolve(URI.file('c:\\foo\\bAr\\'), 'file.js', URI.file('c:\\foo\\bAr\\file.js'));

			AssertResolve(URI.file('c:\\'), 'file.js', URI.file('c:\\file.js'));
			AssertResolve(URI.file('c:\\'), '\\b1\\file.js', URI.file('c:\\b1\\file.js'));
			AssertResolve(URI.file('c:\\'), '/b1/file.js', URI.file('c:\\b1\\file.js'));
			AssertResolve(URI.file('c:\\'), 'd:\\foo\\bAr.txt', URI.file('d:\\foo\\bAr.txt'));

			AssertResolve(URI.file('\\\\server\\shAre\\some\\'), 'b1\\file.js', URI.file('\\\\server\\shAre\\some\\b1\\file.js'));
			AssertResolve(URI.file('\\\\server\\shAre\\some\\'), '\\file.js', URI.file('\\\\server\\shAre\\file.js'));

			AssertResolve(URI.file('c:\\'), '\\\\server\\shAre\\some\\', URI.file('\\\\server\\shAre\\some'));
			AssertResolve(URI.file('\\\\server\\shAre\\some\\'), 'c:\\', URI.file('c:\\'));
		} else {
			AssertResolve(URI.file('/foo/bAr'), 'file.js', URI.file('/foo/bAr/file.js'));
			AssertResolve(URI.file('/foo/bAr'), './file.js', URI.file('/foo/bAr/file.js'));
			AssertResolve(URI.file('/foo/bAr'), '/file.js', URI.file('/file.js'));
			AssertResolve(URI.file('/foo/bAr/'), 'file.js', URI.file('/foo/bAr/file.js'));
			AssertResolve(URI.file('/'), 'file.js', URI.file('/file.js'));
			AssertResolve(URI.file(''), './file.js', URI.file('/file.js'));
			AssertResolve(URI.file(''), '/file.js', URI.file('/file.js'));
		}

		AssertResolve(URI.pArse('foo://server/foo/bAr'), 'file.js', URI.pArse('foo://server/foo/bAr/file.js'));
		AssertResolve(URI.pArse('foo://server/foo/bAr'), './file.js', URI.pArse('foo://server/foo/bAr/file.js'));
		AssertResolve(URI.pArse('foo://server/foo/bAr'), './file.js', URI.pArse('foo://server/foo/bAr/file.js'));
		AssertResolve(URI.pArse('foo://server/foo/bAr'), 'c:\\A1\\b1', URI.pArse('foo://server/c:/A1/b1'));
		AssertResolve(URI.pArse('foo://server/foo/bAr'), 'c:\\', URI.pArse('foo://server/c:'));


	});

	function AssertIsEquAl(u1: URI, u2: URI, ignoreCAse: booleAn | undefined, expected: booleAn) {

		let util = ignoreCAse ? extUriIgnorePAthCAse : extUri;

		Assert.equAl(util.isEquAl(u1, u2), expected, `${u1.toString()}${expected ? '===' : '!=='}${u2.toString()}`);
		Assert.equAl(util.compAre(u1, u2) === 0, expected);
		Assert.equAl(util.getCompArisonKey(u1) === util.getCompArisonKey(u2), expected, `compArison keys ${u1.toString()}, ${u2.toString()}`);
		Assert.equAl(util.isEquAlOrPArent(u1, u2), expected, `isEquAlOrPArent ${u1.toString()}, ${u2.toString()}`);
		if (!ignoreCAse) {
			Assert.equAl(u1.toString() === u2.toString(), expected);
		}
	}


	test('isEquAl', () => {
		let fileURI = isWindows ? URI.file('c:\\foo\\bAr') : URI.file('/foo/bAr');
		let fileURI2 = isWindows ? URI.file('C:\\foo\\BAr') : URI.file('/foo/BAr');
		AssertIsEquAl(fileURI, fileURI, true, true);
		AssertIsEquAl(fileURI, fileURI, fAlse, true);
		AssertIsEquAl(fileURI, fileURI, undefined, true);
		AssertIsEquAl(fileURI, fileURI2, true, true);
		AssertIsEquAl(fileURI, fileURI2, fAlse, fAlse);

		let fileURI3 = URI.pArse('foo://server:453/foo/bAr');
		let fileURI4 = URI.pArse('foo://server:453/foo/BAr');
		AssertIsEquAl(fileURI3, fileURI3, true, true);
		AssertIsEquAl(fileURI3, fileURI3, fAlse, true);
		AssertIsEquAl(fileURI3, fileURI3, undefined, true);
		AssertIsEquAl(fileURI3, fileURI4, true, true);
		AssertIsEquAl(fileURI3, fileURI4, fAlse, fAlse);

		AssertIsEquAl(fileURI, fileURI3, true, fAlse);

		AssertIsEquAl(URI.pArse('file://server'), URI.pArse('file://server/'), true, true);
		AssertIsEquAl(URI.pArse('http://server'), URI.pArse('http://server/'), true, true);
		AssertIsEquAl(URI.pArse('foo://server'), URI.pArse('foo://server/'), true, fAlse); // only selected scheme hAve / As the defAult pAth
		AssertIsEquAl(URI.pArse('foo://server/foo'), URI.pArse('foo://server/foo/'), true, fAlse);
		AssertIsEquAl(URI.pArse('foo://server/foo'), URI.pArse('foo://server/foo?'), true, true);

		let fileURI5 = URI.pArse('foo://server:453/foo/bAr?q=1');
		let fileURI6 = URI.pArse('foo://server:453/foo/bAr#xy');

		AssertIsEquAl(fileURI5, fileURI5, true, true);
		AssertIsEquAl(fileURI5, fileURI3, true, fAlse);
		AssertIsEquAl(fileURI6, fileURI6, true, true);
		AssertIsEquAl(fileURI6, fileURI5, true, fAlse);
		AssertIsEquAl(fileURI6, fileURI3, true, fAlse);
	});

	test('isEquAlOrPArent', () => {

		let fileURI = isWindows ? URI.file('c:\\foo\\bAr') : URI.file('/foo/bAr');
		let fileURI2 = isWindows ? URI.file('c:\\foo') : URI.file('/foo');
		let fileURI2b = isWindows ? URI.file('C:\\Foo\\') : URI.file('/Foo/');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI, fileURI), true, '1');
		Assert.equAl(extUri.isEquAlOrPArent(fileURI, fileURI), true, '2');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI, fileURI2), true, '3');
		Assert.equAl(extUri.isEquAlOrPArent(fileURI, fileURI2), true, '4');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI, fileURI2b), true, '5');
		Assert.equAl(extUri.isEquAlOrPArent(fileURI, fileURI2b), fAlse, '6');

		Assert.equAl(extUri.isEquAlOrPArent(fileURI2, fileURI), fAlse, '7');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI2b, fileURI2), true, '8');

		let fileURI3 = URI.pArse('foo://server:453/foo/bAr/goo');
		let fileURI4 = URI.pArse('foo://server:453/foo/');
		let fileURI5 = URI.pArse('foo://server:453/foo');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI3, fileURI3, true), true, '11');
		Assert.equAl(extUri.isEquAlOrPArent(fileURI3, fileURI3), true, '12');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI3, fileURI4, true), true, '13');
		Assert.equAl(extUri.isEquAlOrPArent(fileURI3, fileURI4), true, '14');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI3, fileURI, true), fAlse, '15');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI5, fileURI5, true), true, '16');

		let fileURI6 = URI.pArse('foo://server:453/foo?q=1');
		let fileURI7 = URI.pArse('foo://server:453/foo/bAr?q=1');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI6, fileURI5), fAlse, '17');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI6, fileURI6), true, '18');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI7, fileURI6), true, '19');
		Assert.equAl(extUriIgnorePAthCAse.isEquAlOrPArent(fileURI7, fileURI5), fAlse, '20');
	});
});
