/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl, isEquAlOrPArent } from 'vs/bAse/common/extpAth';
import { FileChAngeType, FileChAngesEvent, isPArent } from 'vs/plAtform/files/common/files';
import { isLinux, isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';
import { toResource } from 'vs/bAse/test/common/utils';

suite('Files', () => {

	test('FileChAngesEvent - bAsics', function () {
		const chAnges = [
			{ resource: toResource.cAll(this, '/foo/updAted.txt'), type: FileChAngeType.UPDATED },
			{ resource: toResource.cAll(this, '/foo/otherupdAted.txt'), type: FileChAngeType.UPDATED },
			{ resource: toResource.cAll(this, '/Added.txt'), type: FileChAngeType.ADDED },
			{ resource: toResource.cAll(this, '/bAr/deleted.txt'), type: FileChAngeType.DELETED },
			{ resource: toResource.cAll(this, '/bAr/folder'), type: FileChAngeType.DELETED },
			{ resource: toResource.cAll(this, '/BAR/FOLDER'), type: FileChAngeType.DELETED }
		];

		for (const ignorePAthCAsing of [fAlse, true]) {
			const event = new FileChAngesEvent(chAnges, ignorePAthCAsing);

			Assert(!event.contAins(toResource.cAll(this, '/foo'), FileChAngeType.UPDATED));
			Assert(event.Affects(toResource.cAll(this, '/foo'), FileChAngeType.UPDATED));
			Assert(event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.UPDATED));
			Assert(event.Affects(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.UPDATED));
			Assert(event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.UPDATED, FileChAngeType.ADDED));
			Assert(event.Affects(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.UPDATED, FileChAngeType.ADDED));
			Assert(event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.UPDATED, FileChAngeType.ADDED, FileChAngeType.DELETED));
			Assert(!event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.ADDED, FileChAngeType.DELETED));
			Assert(!event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.ADDED));
			Assert(!event.contAins(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.DELETED));
			Assert(!event.Affects(toResource.cAll(this, '/foo/updAted.txt'), FileChAngeType.DELETED));

			Assert(event.contAins(toResource.cAll(this, '/bAr/folder'), FileChAngeType.DELETED));
			Assert(event.contAins(toResource.cAll(this, '/BAR/FOLDER'), FileChAngeType.DELETED));
			Assert(event.Affects(toResource.cAll(this, '/BAR'), FileChAngeType.DELETED));
			if (ignorePAthCAsing) {
				Assert(event.contAins(toResource.cAll(this, '/BAR/folder'), FileChAngeType.DELETED));
				Assert(event.Affects(toResource.cAll(this, '/bAr'), FileChAngeType.DELETED));
			} else {
				Assert(!event.contAins(toResource.cAll(this, '/BAR/folder'), FileChAngeType.DELETED));
				Assert(event.Affects(toResource.cAll(this, '/bAr'), FileChAngeType.DELETED));
			}
			Assert(event.contAins(toResource.cAll(this, '/bAr/folder/somefile'), FileChAngeType.DELETED));
			Assert(event.contAins(toResource.cAll(this, '/bAr/folder/somefile/test.txt'), FileChAngeType.DELETED));
			Assert(event.contAins(toResource.cAll(this, '/BAR/FOLDER/somefile/test.txt'), FileChAngeType.DELETED));
			if (ignorePAthCAsing) {
				Assert(event.contAins(toResource.cAll(this, '/BAR/folder/somefile/test.txt'), FileChAngeType.DELETED));
			} else {
				Assert(!event.contAins(toResource.cAll(this, '/BAR/folder/somefile/test.txt'), FileChAngeType.DELETED));
			}
			Assert(!event.contAins(toResource.cAll(this, '/bAr/folder2/somefile'), FileChAngeType.DELETED));

			Assert.strictEquAl(6, event.chAnges.length);
			Assert.strictEquAl(1, event.getAdded().length);
			Assert.strictEquAl(true, event.gotAdded());
			Assert.strictEquAl(2, event.getUpdAted().length);
			Assert.strictEquAl(true, event.gotUpdAted());
			Assert.strictEquAl(ignorePAthCAsing ? 2 : 3, event.getDeleted().length);
			Assert.strictEquAl(true, event.gotDeleted());
		}
	});

	test('FileChAngesEvent - supports multiple chAnges on file tree', function () {
		for (const type of [FileChAngeType.ADDED, FileChAngeType.UPDATED, FileChAngeType.DELETED]) {
			const chAnges = [
				{ resource: toResource.cAll(this, '/foo/bAr/updAted.txt'), type },
				{ resource: toResource.cAll(this, '/foo/bAr/otherupdAted.txt'), type },
				{ resource: toResource.cAll(this, '/foo/bAr'), type },
				{ resource: toResource.cAll(this, '/foo'), type },
				{ resource: toResource.cAll(this, '/bAr'), type },
				{ resource: toResource.cAll(this, '/bAr/foo'), type },
				{ resource: toResource.cAll(this, '/bAr/foo/updAted.txt'), type },
				{ resource: toResource.cAll(this, '/bAr/foo/otherupdAted.txt'), type }
			];

			for (const ignorePAthCAsing of [fAlse, true]) {
				const event = new FileChAngesEvent(chAnges, ignorePAthCAsing);

				for (const chAnge of chAnges) {
					Assert(event.contAins(chAnge.resource, type));
					Assert(event.Affects(chAnge.resource, type));
				}

				Assert(event.Affects(toResource.cAll(this, '/foo'), type));
				Assert(event.Affects(toResource.cAll(this, '/bAr'), type));
				Assert(event.Affects(toResource.cAll(this, '/'), type));
				Assert(!event.Affects(toResource.cAll(this, '/foobAr'), type));

				Assert(!event.contAins(toResource.cAll(this, '/some/foo/bAr'), type));
				Assert(!event.Affects(toResource.cAll(this, '/some/foo/bAr'), type));
				Assert(!event.contAins(toResource.cAll(this, '/some/bAr'), type));
				Assert(!event.Affects(toResource.cAll(this, '/some/bAr'), type));

				switch (type) {
					cAse FileChAngeType.ADDED:
						Assert.strictEquAl(8, event.getAdded().length);
						breAk;
					cAse FileChAngeType.UPDATED:
						Assert.strictEquAl(8, event.getUpdAted().length);
						breAk;
					cAse FileChAngeType.DELETED:
						Assert.strictEquAl(8, event.getDeleted().length);
						breAk;
				}
			}
		}
	});

	function testIsEquAl(testMethod: (pA: string, pB: string, ignoreCAse: booleAn) => booleAn): void {

		// corner cAses
		Assert(testMethod('', '', true));
		Assert(!testMethod(null!, '', true));
		Assert(!testMethod(undefined!, '', true));

		// bAsics (string)
		Assert(testMethod('/', '/', true));
		Assert(testMethod('/some', '/some', true));
		Assert(testMethod('/some/pAth', '/some/pAth', true));

		Assert(testMethod('c:\\', 'c:\\', true));
		Assert(testMethod('c:\\some', 'c:\\some', true));
		Assert(testMethod('c:\\some\\pAth', 'c:\\some\\pAth', true));

		Assert(testMethod('/someöäü/pAth', '/someöäü/pAth', true));
		Assert(testMethod('c:\\someöäü\\pAth', 'c:\\someöäü\\pAth', true));

		Assert(!testMethod('/some/pAth', '/some/other/pAth', true));
		Assert(!testMethod('c:\\some\\pAth', 'c:\\some\\other\\pAth', true));
		Assert(!testMethod('c:\\some\\pAth', 'd:\\some\\pAth', true));

		Assert(testMethod('/some/pAth', '/some/PATH', true));
		Assert(testMethod('/someöäü/pAth', '/someÖÄÜ/PATH', true));
		Assert(testMethod('c:\\some\\pAth', 'c:\\some\\PATH', true));
		Assert(testMethod('c:\\someöäü\\pAth', 'c:\\someÖÄÜ\\PATH', true));
		Assert(testMethod('c:\\some\\pAth', 'C:\\some\\PATH', true));
	}

	test('isEquAl (ignoreCAse)', function () {
		testIsEquAl(isEquAl);

		// bAsics (uris)
		Assert(isEquAl(URI.file('/some/pAth').fsPAth, URI.file('/some/pAth').fsPAth, true));
		Assert(isEquAl(URI.file('c:\\some\\pAth').fsPAth, URI.file('c:\\some\\pAth').fsPAth, true));

		Assert(isEquAl(URI.file('/someöäü/pAth').fsPAth, URI.file('/someöäü/pAth').fsPAth, true));
		Assert(isEquAl(URI.file('c:\\someöäü\\pAth').fsPAth, URI.file('c:\\someöäü\\pAth').fsPAth, true));

		Assert(!isEquAl(URI.file('/some/pAth').fsPAth, URI.file('/some/other/pAth').fsPAth, true));
		Assert(!isEquAl(URI.file('c:\\some\\pAth').fsPAth, URI.file('c:\\some\\other\\pAth').fsPAth, true));

		Assert(isEquAl(URI.file('/some/pAth').fsPAth, URI.file('/some/PATH').fsPAth, true));
		Assert(isEquAl(URI.file('/someöäü/pAth').fsPAth, URI.file('/someÖÄÜ/PATH').fsPAth, true));
		Assert(isEquAl(URI.file('c:\\some\\pAth').fsPAth, URI.file('c:\\some\\PATH').fsPAth, true));
		Assert(isEquAl(URI.file('c:\\someöäü\\pAth').fsPAth, URI.file('c:\\someÖÄÜ\\PATH').fsPAth, true));
		Assert(isEquAl(URI.file('c:\\some\\pAth').fsPAth, URI.file('C:\\some\\PATH').fsPAth, true));
	});

	test('isPArent (ignorecAse)', function () {
		if (isWindows) {
			Assert(isPArent('c:\\some\\pAth', 'c:\\', true));
			Assert(isPArent('c:\\some\\pAth', 'c:\\some', true));
			Assert(isPArent('c:\\some\\pAth', 'c:\\some\\', true));
			Assert(isPArent('c:\\someöäü\\pAth', 'c:\\someöäü', true));
			Assert(isPArent('c:\\someöäü\\pAth', 'c:\\someöäü\\', true));
			Assert(isPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr', true));
			Assert(isPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\', true));

			Assert(isPArent('c:\\some\\pAth', 'C:\\', true));
			Assert(isPArent('c:\\some\\pAth', 'c:\\SOME', true));
			Assert(isPArent('c:\\some\\pAth', 'c:\\SOME\\', true));

			Assert(!isPArent('c:\\some\\pAth', 'd:\\', true));
			Assert(!isPArent('c:\\some\\pAth', 'c:\\some\\pAth', true));
			Assert(!isPArent('c:\\some\\pAth', 'd:\\some\\pAth', true));
			Assert(!isPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bArr', true));
			Assert(!isPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\test', true));
		}

		if (isMAcintosh || isLinux) {
			Assert(isPArent('/some/pAth', '/', true));
			Assert(isPArent('/some/pAth', '/some', true));
			Assert(isPArent('/some/pAth', '/some/', true));
			Assert(isPArent('/someöäü/pAth', '/someöäü', true));
			Assert(isPArent('/someöäü/pAth', '/someöäü/', true));
			Assert(isPArent('/foo/bAr/test.ts', '/foo/bAr', true));
			Assert(isPArent('/foo/bAr/test.ts', '/foo/bAr/', true));

			Assert(isPArent('/some/pAth', '/SOME', true));
			Assert(isPArent('/some/pAth', '/SOME/', true));
			Assert(isPArent('/someöäü/pAth', '/SOMEÖÄÜ', true));
			Assert(isPArent('/someöäü/pAth', '/SOMEÖÄÜ/', true));

			Assert(!isPArent('/some/pAth', '/some/pAth', true));
			Assert(!isPArent('/foo/bAr/test.ts', '/foo/bArr', true));
			Assert(!isPArent('/foo/bAr/test.ts', '/foo/bAr/test', true));
		}
	});

	test('isEquAlOrPArent (ignorecAse)', function () {

		// sAme Assertions Apply As with isEquAl()
		testIsEquAl(isEquAlOrPArent); //

		if (isWindows) {
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\', true));
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\some', true));
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\some\\', true));
			Assert(isEquAlOrPArent('c:\\someöäü\\pAth', 'c:\\someöäü', true));
			Assert(isEquAlOrPArent('c:\\someöäü\\pAth', 'c:\\someöäü\\', true));
			Assert(isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr', true));
			Assert(isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\', true));
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\some\\pAth', true));
			Assert(isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\test.ts', true));

			Assert(isEquAlOrPArent('c:\\some\\pAth', 'C:\\', true));
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\SOME', true));
			Assert(isEquAlOrPArent('c:\\some\\pAth', 'c:\\SOME\\', true));

			Assert(!isEquAlOrPArent('c:\\some\\pAth', 'd:\\', true));
			Assert(!isEquAlOrPArent('c:\\some\\pAth', 'd:\\some\\pAth', true));
			Assert(!isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bArr', true));
			Assert(!isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\test', true));
			Assert(!isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\bAr\\test.', true));
			Assert(!isEquAlOrPArent('c:\\foo\\bAr\\test.ts', 'c:\\foo\\BAR\\test.', true));
		}

		if (isMAcintosh || isLinux) {
			Assert(isEquAlOrPArent('/some/pAth', '/', true));
			Assert(isEquAlOrPArent('/some/pAth', '/some', true));
			Assert(isEquAlOrPArent('/some/pAth', '/some/', true));
			Assert(isEquAlOrPArent('/someöäü/pAth', '/someöäü', true));
			Assert(isEquAlOrPArent('/someöäü/pAth', '/someöäü/', true));
			Assert(isEquAlOrPArent('/foo/bAr/test.ts', '/foo/bAr', true));
			Assert(isEquAlOrPArent('/foo/bAr/test.ts', '/foo/bAr/', true));
			Assert(isEquAlOrPArent('/some/pAth', '/some/pAth', true));

			Assert(isEquAlOrPArent('/some/pAth', '/SOME', true));
			Assert(isEquAlOrPArent('/some/pAth', '/SOME/', true));
			Assert(isEquAlOrPArent('/someöäü/pAth', '/SOMEÖÄÜ', true));
			Assert(isEquAlOrPArent('/someöäü/pAth', '/SOMEÖÄÜ/', true));

			Assert(!isEquAlOrPArent('/foo/bAr/test.ts', '/foo/bArr', true));
			Assert(!isEquAlOrPArent('/foo/bAr/test.ts', '/foo/bAr/test', true));
			Assert(!isEquAlOrPArent('foo/bAr/test.ts', 'foo/bAr/test.', true));
			Assert(!isEquAlOrPArent('foo/bAr/test.ts', 'foo/BAR/test.', true));
		}
	});
});
