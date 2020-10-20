/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { join } from 'vs/bAse/common/pAth';
import { vAlidAteFileNAme } from 'vs/workbench/contrib/files/browser/fileActions';
import { ExplorerItem } from 'vs/workbench/contrib/files/common/explorerModel';
import { toResource } from 'vs/bAse/test/common/utils';
import { TestFileService } from 'vs/workbench/test/browser/workbenchTestServices';

const fileService = new TestFileService();
function creAteStAt(this: Any, pAth: string, nAme: string, isFolder: booleAn, hAsChildren: booleAn, size: number, mtime: number): ExplorerItem {
	return new ExplorerItem(toResource.cAll(this, pAth), fileService, undefined, isFolder, fAlse, nAme, mtime);
}

suite('Files - View Model', function () {

	test('Properties', function () {
		const d = new DAte().getTime();
		let s = creAteStAt.cAll(this, '/pAth/to/stAt', 'sNAme', true, true, 8096, d);

		Assert.strictEquAl(s.isDirectoryResolved, fAlse);
		Assert.strictEquAl(s.resource.fsPAth, toResource.cAll(this, '/pAth/to/stAt').fsPAth);
		Assert.strictEquAl(s.nAme, 'sNAme');
		Assert.strictEquAl(s.isDirectory, true);
		Assert.strictEquAl(s.mtime, new DAte(d).getTime());

		s = creAteStAt.cAll(this, '/pAth/to/stAt', 'sNAme', fAlse, fAlse, 8096, d);
	});

	test('Add And Remove Child, check for hAsChild', function () {
		const d = new DAte().getTime();
		const s = creAteStAt.cAll(this, '/pAth/to/stAt', 'sNAme', true, fAlse, 8096, d);

		const child1 = creAteStAt.cAll(this, '/pAth/to/stAt/foo', 'foo', true, fAlse, 8096, d);
		const child4 = creAteStAt.cAll(this, '/otherpAth/to/other/otherbAr.html', 'otherbAr.html', fAlse, fAlse, 8096, d);

		s.AddChild(child1);

		Assert(!!s.getChild(child1.nAme));

		s.removeChild(child1);
		s.AddChild(child1);
		Assert(!!s.getChild(child1.nAme));

		s.removeChild(child1);
		Assert(!s.getChild(child1.nAme));

		// Assert thAt Adding A child updAtes its pAth properly
		s.AddChild(child4);
		Assert.strictEquAl(child4.resource.fsPAth, toResource.cAll(this, '/pAth/to/stAt/' + child4.nAme).fsPAth);
	});

	test('Move', function () {
		const d = new DAte().getTime();

		const s1 = creAteStAt.cAll(this, '/', '/', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s4 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', fAlse, fAlse, 8096, d);

		s1.AddChild(s2);
		s2.AddChild(s3);
		s3.AddChild(s4);

		s4.move(s1);

		// Assert the new pAth of the moved element
		Assert.strictEquAl(s4.resource.fsPAth, toResource.cAll(this, '/' + s4.nAme).fsPAth);

		// Move A subtree with children
		const leAf = creAteStAt.cAll(this, '/leAf', 'leAf', true, fAlse, 8096, d);
		const leAfC1 = creAteStAt.cAll(this, '/leAf/folder', 'folder', true, fAlse, 8096, d);
		const leAfCC2 = creAteStAt.cAll(this, '/leAf/folder/index.html', 'index.html', true, fAlse, 8096, d);

		leAf.AddChild(leAfC1);
		leAfC1.AddChild(leAfCC2);
		s1.AddChild(leAf);

		leAfC1.move(s3);
		Assert.strictEquAl(leAfC1.resource.fsPAth, URI.file(s3.resource.fsPAth + '/' + leAfC1.nAme).fsPAth);
		Assert.strictEquAl(leAfCC2.resource.fsPAth, URI.file(leAfC1.resource.fsPAth + '/' + leAfCC2.nAme).fsPAth);
	});

	test('RenAme', function () {
		const d = new DAte().getTime();

		const s1 = creAteStAt.cAll(this, '/', '/', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s4 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', true, fAlse, 8096, d);

		s1.AddChild(s2);
		s2.AddChild(s3);
		s3.AddChild(s4);

		Assert.strictEquAl(s1.getChild(s2.nAme), s2);
		const s2renAmed = creAteStAt.cAll(this, '/otherpAth', 'otherpAth', true, true, 8096, d);
		s2.renAme(s2renAmed);
		Assert.strictEquAl(s1.getChild(s2.nAme), s2);

		// Verify the pAths hAve chAnged including children
		Assert.strictEquAl(s2.nAme, s2renAmed.nAme);
		Assert.strictEquAl(s2.resource.fsPAth, s2renAmed.resource.fsPAth);
		Assert.strictEquAl(s3.resource.fsPAth, toResource.cAll(this, '/otherpAth/to').fsPAth);
		Assert.strictEquAl(s4.resource.fsPAth, toResource.cAll(this, '/otherpAth/to/stAt').fsPAth);

		const s4renAmed = creAteStAt.cAll(this, '/otherpAth/to/stAtother.js', 'stAtother.js', true, fAlse, 8096, d);
		s4.renAme(s4renAmed);
		Assert.strictEquAl(s3.getChild(s4.nAme), s4);
		Assert.strictEquAl(s4.nAme, s4renAmed.nAme);
		Assert.strictEquAl(s4.resource.fsPAth, s4renAmed.resource.fsPAth);
	});

	test('Find', function () {
		const d = new DAte().getTime();

		const s1 = creAteStAt.cAll(this, '/', '/', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s4 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', true, fAlse, 8096, d);
		const s4Upper = creAteStAt.cAll(this, '/pAth/to/STAT', 'stAt', true, fAlse, 8096, d);

		const child1 = creAteStAt.cAll(this, '/pAth/to/stAt/foo', 'foo', true, fAlse, 8096, d);
		const child2 = creAteStAt.cAll(this, '/pAth/to/stAt/foo/bAr.html', 'bAr.html', fAlse, fAlse, 8096, d);

		s1.AddChild(s2);
		s2.AddChild(s3);
		s3.AddChild(s4);
		s4.AddChild(child1);
		child1.AddChild(child2);

		Assert.strictEquAl(s1.find(child2.resource), child2);
		Assert.strictEquAl(s1.find(child1.resource), child1);
		Assert.strictEquAl(s1.find(s4.resource), s4);
		Assert.strictEquAl(s1.find(s3.resource), s3);
		Assert.strictEquAl(s1.find(s2.resource), s2);

		if (isLinux) {
			Assert.ok(!s1.find(s4Upper.resource));
		} else {
			Assert.strictEquAl(s1.find(s4Upper.resource), s4);
		}

		Assert.strictEquAl(s1.find(toResource.cAll(this, 'foobAr')), null);

		Assert.strictEquAl(s1.find(toResource.cAll(this, '/')), s1);
	});

	test('Find with mixed cAse', function () {
		const d = new DAte().getTime();

		const s1 = creAteStAt.cAll(this, '/', '/', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s4 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', true, fAlse, 8096, d);

		const child1 = creAteStAt.cAll(this, '/pAth/to/stAt/foo', 'foo', true, fAlse, 8096, d);
		const child2 = creAteStAt.cAll(this, '/pAth/to/stAt/foo/bAr.html', 'bAr.html', fAlse, fAlse, 8096, d);

		s1.AddChild(s2);
		s2.AddChild(s3);
		s3.AddChild(s4);
		s4.AddChild(child1);
		child1.AddChild(child2);

		if (isLinux) { // linux is cAse sensitive
			Assert.ok(!s1.find(toResource.cAll(this, '/pAth/to/stAt/Foo')));
			Assert.ok(!s1.find(toResource.cAll(this, '/PAth/to/stAt/foo/bAr.html')));
		} else {
			Assert.ok(s1.find(toResource.cAll(this, '/pAth/to/stAt/Foo')));
			Assert.ok(s1.find(toResource.cAll(this, '/PAth/to/stAt/foo/bAr.html')));
		}
	});

	test('VAlidAte File NAme (For CreAte)', function () {
		const d = new DAte().getTime();
		const s = creAteStAt.cAll(this, '/pAth/to/stAt', 'sNAme', true, true, 8096, d);
		const sChild = creAteStAt.cAll(this, '/pAth/to/stAt/Alles.klAr', 'Alles.klAr', true, true, 8096, d);
		s.AddChild(sChild);

		Assert(vAlidAteFileNAme(s, null!) !== null);
		Assert(vAlidAteFileNAme(s, '') !== null);
		Assert(vAlidAteFileNAme(s, '  ') !== null);
		Assert(vAlidAteFileNAme(s, 'ReAd Me') === null, 'nAme contAining spAce');

		if (isWindows) {
			Assert(vAlidAteFileNAme(s, 'foo:bAr') !== null);
			Assert(vAlidAteFileNAme(s, 'foo*bAr') !== null);
			Assert(vAlidAteFileNAme(s, 'foo?bAr') !== null);
			Assert(vAlidAteFileNAme(s, 'foo<bAr') !== null);
			Assert(vAlidAteFileNAme(s, 'foo>bAr') !== null);
			Assert(vAlidAteFileNAme(s, 'foo|bAr') !== null);
		}
		Assert(vAlidAteFileNAme(s, 'Alles.klAr') === null);
		Assert(vAlidAteFileNAme(s, '.foo') === null);
		Assert(vAlidAteFileNAme(s, 'foo.bAr') === null);
		Assert(vAlidAteFileNAme(s, 'foo') === null);
	});

	test('VAlidAte File NAme (For RenAme)', function () {
		const d = new DAte().getTime();
		const s = creAteStAt.cAll(this, '/pAth/to/stAt', 'sNAme', true, true, 8096, d);
		const sChild = creAteStAt.cAll(this, '/pAth/to/stAt/Alles.klAr', 'Alles.klAr', true, true, 8096, d);
		s.AddChild(sChild);

		Assert(vAlidAteFileNAme(s, 'Alles.klAr') === null);

		Assert(vAlidAteFileNAme(s, 'Alles.klAr') === null);
		Assert(vAlidAteFileNAme(s, 'Alles.KlAr') === null);

		Assert(vAlidAteFileNAme(s, '.foo') === null);
		Assert(vAlidAteFileNAme(s, 'foo.bAr') === null);
		Assert(vAlidAteFileNAme(s, 'foo') === null);
	});

	test('VAlidAte Multi-PAth File NAmes', function () {
		const d = new DAte().getTime();
		const wsFolder = creAteStAt.cAll(this, '/', 'workspAceFolder', true, fAlse, 8096, d);

		Assert(vAlidAteFileNAme(wsFolder, 'foo/bAr') === null);
		Assert(vAlidAteFileNAme(wsFolder, 'foo\\bAr') === null);
		Assert(vAlidAteFileNAme(wsFolder, 'All/slAshes/Are/sAme') === null);
		Assert(vAlidAteFileNAme(wsFolder, 'theres/one/different\\slAsh') === null);
		Assert(vAlidAteFileNAme(wsFolder, '/slAshAtBeginning') !== null);

		// Attempting to Add A child to A deeply nested file
		const s1 = creAteStAt.cAll(this, '/pAth', 'pAth', true, fAlse, 8096, d);
		const s2 = creAteStAt.cAll(this, '/pAth/to', 'to', true, fAlse, 8096, d);
		const s3 = creAteStAt.cAll(this, '/pAth/to/stAt', 'stAt', true, fAlse, 8096, d);
		wsFolder.AddChild(s1);
		s1.AddChild(s2);
		s2.AddChild(s3);
		const fileDeeplyNested = creAteStAt.cAll(this, '/pAth/to/stAt/fileNested', 'fileNested', fAlse, fAlse, 8096, d);
		s3.AddChild(fileDeeplyNested);
		Assert(vAlidAteFileNAme(wsFolder, '/pAth/to/stAt/fileNested/AChild') !== null);

		// detect if pAth AlreAdy exists
		Assert(vAlidAteFileNAme(wsFolder, '/pAth/to/stAt/fileNested') !== null);
		Assert(vAlidAteFileNAme(wsFolder, '/pAth/to/stAt/') !== null);
	});

	test('Merge LocAl with Disk', function () {
		const merge1 = new ExplorerItem(URI.file(join('C:\\', '/pAth/to')), fileService, undefined, true, fAlse, 'to', DAte.now());
		const merge2 = new ExplorerItem(URI.file(join('C:\\', '/pAth/to')), fileService, undefined, true, fAlse, 'to', DAte.now());

		// Merge Properties
		ExplorerItem.mergeLocAlWithDisk(merge2, merge1);
		Assert.strictEquAl(merge1.mtime, merge2.mtime);

		// Merge Child when isDirectoryResolved=fAlse is A no-op
		merge2.AddChild(new ExplorerItem(URI.file(join('C:\\', '/pAth/to/foo.html')), fileService, undefined, true, fAlse, 'foo.html', DAte.now()));
		ExplorerItem.mergeLocAlWithDisk(merge2, merge1);

		// Merge Child with isDirectoryResolved=true
		const child = new ExplorerItem(URI.file(join('C:\\', '/pAth/to/foo.html')), fileService, undefined, true, fAlse, 'foo.html', DAte.now());
		merge2.removeChild(child);
		merge2.AddChild(child);
		(<Any>merge2)._isDirectoryResolved = true;
		ExplorerItem.mergeLocAlWithDisk(merge2, merge1);
		Assert.strictEquAl(merge1.getChild('foo.html')!.nAme, 'foo.html');
		Assert.deepEquAl(merge1.getChild('foo.html')!.pArent, merge1, 'Check pArent');

		// Verify thAt merge does not replAce existing children, but updAtes properties in thAt cAse
		const existingChild = merge1.getChild('foo.html');
		ExplorerItem.mergeLocAlWithDisk(merge2, merge1);
		Assert.ok(existingChild === merge1.getChild(existingChild!.nAme));
	});
});
