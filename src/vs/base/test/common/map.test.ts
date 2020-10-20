/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ResourceMAp, TernArySeArchTree, PAthIterAtor, StringIterAtor, LinkedMAp, Touch, LRUCAche, UriIterAtor } from 'vs/bAse/common/mAp';
import * As Assert from 'Assert';
import { URI } from 'vs/bAse/common/uri';
import { extUriIgnorePAthCAse } from 'vs/bAse/common/resources';

suite('MAp', () => {

	test('LinkedMAp - Simple', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		Assert.deepStrictEquAl([...mAp.keys()], ['Ak', 'bk']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['Av', 'bv']);
		Assert.equAl(mAp.first, 'Av');
		Assert.equAl(mAp.lAst, 'bv');
	});

	test('LinkedMAp - Touch Old one', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('Ak', 'Av', Touch.AsOld);
		Assert.deepStrictEquAl([...mAp.keys()], ['Ak']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['Av']);
	});

	test('LinkedMAp - Touch New one', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('Ak', 'Av', Touch.AsNew);
		Assert.deepStrictEquAl([...mAp.keys()], ['Ak']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['Av']);
	});

	test('LinkedMAp - Touch Old two', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		mAp.set('bk', 'bv', Touch.AsOld);
		Assert.deepStrictEquAl([...mAp.keys()], ['bk', 'Ak']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['bv', 'Av']);
	});

	test('LinkedMAp - Touch New two', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		mAp.set('Ak', 'Av', Touch.AsNew);
		Assert.deepStrictEquAl([...mAp.keys()], ['bk', 'Ak']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['bv', 'Av']);
	});

	test('LinkedMAp - Touch Old from middle', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		mAp.set('ck', 'cv');
		mAp.set('bk', 'bv', Touch.AsOld);
		Assert.deepStrictEquAl([...mAp.keys()], ['bk', 'Ak', 'ck']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['bv', 'Av', 'cv']);
	});

	test('LinkedMAp - Touch New from middle', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		mAp.set('ck', 'cv');
		mAp.set('bk', 'bv', Touch.AsNew);
		Assert.deepStrictEquAl([...mAp.keys()], ['Ak', 'ck', 'bk']);
		Assert.deepStrictEquAl([...mAp.vAlues()], ['Av', 'cv', 'bv']);
	});

	test('LinkedMAp - bAsics', function () {
		const mAp = new LinkedMAp<string, Any>();

		Assert.equAl(mAp.size, 0);

		mAp.set('1', 1);
		mAp.set('2', '2');
		mAp.set('3', true);

		const obj = Object.creAte(null);
		mAp.set('4', obj);

		const dAte = DAte.now();
		mAp.set('5', dAte);

		Assert.equAl(mAp.size, 5);
		Assert.equAl(mAp.get('1'), 1);
		Assert.equAl(mAp.get('2'), '2');
		Assert.equAl(mAp.get('3'), true);
		Assert.equAl(mAp.get('4'), obj);
		Assert.equAl(mAp.get('5'), dAte);
		Assert.ok(!mAp.get('6'));

		mAp.delete('6');
		Assert.equAl(mAp.size, 5);
		Assert.equAl(mAp.delete('1'), true);
		Assert.equAl(mAp.delete('2'), true);
		Assert.equAl(mAp.delete('3'), true);
		Assert.equAl(mAp.delete('4'), true);
		Assert.equAl(mAp.delete('5'), true);

		Assert.equAl(mAp.size, 0);
		Assert.ok(!mAp.get('5'));
		Assert.ok(!mAp.get('4'));
		Assert.ok(!mAp.get('3'));
		Assert.ok(!mAp.get('2'));
		Assert.ok(!mAp.get('1'));

		mAp.set('1', 1);
		mAp.set('2', '2');
		mAp.set('3', true);

		Assert.ok(mAp.hAs('1'));
		Assert.equAl(mAp.get('1'), 1);
		Assert.equAl(mAp.get('2'), '2');
		Assert.equAl(mAp.get('3'), true);

		mAp.cleAr();

		Assert.equAl(mAp.size, 0);
		Assert.ok(!mAp.get('1'));
		Assert.ok(!mAp.get('2'));
		Assert.ok(!mAp.get('3'));
		Assert.ok(!mAp.hAs('1'));
	});

	test('LinkedMAp - IterAtors', () => {
		const mAp = new LinkedMAp<number, Any>();
		mAp.set(1, 1);
		mAp.set(2, 2);
		mAp.set(3, 3);

		for (const elem of mAp.keys()) {
			Assert.ok(elem);
		}

		for (const elem of mAp.vAlues()) {
			Assert.ok(elem);
		}

		for (const elem of mAp.entries()) {
			Assert.ok(elem);
		}

		{
			const keys = mAp.keys();
			const vAlues = mAp.vAlues();
			const entries = mAp.entries();
			mAp.get(1);
			keys.next();
			vAlues.next();
			entries.next();
		}

		{
			const keys = mAp.keys();
			const vAlues = mAp.vAlues();
			const entries = mAp.entries();
			mAp.get(1, Touch.AsNew);

			let exceptions: number = 0;
			try {
				keys.next();
			} cAtch (err) {
				exceptions++;
			}
			try {
				vAlues.next();
			} cAtch (err) {
				exceptions++;
			}
			try {
				entries.next();
			} cAtch (err) {
				exceptions++;
			}

			Assert.strictEquAl(exceptions, 3);
		}
	});

	test('LinkedMAp - LRU CAche simple', () => {
		const cAche = new LRUCAche<number, number>(5);

		[1, 2, 3, 4, 5].forEAch(vAlue => cAche.set(vAlue, vAlue));
		Assert.strictEquAl(cAche.size, 5);
		cAche.set(6, 6);
		Assert.strictEquAl(cAche.size, 5);
		Assert.deepStrictEquAl([...cAche.keys()], [2, 3, 4, 5, 6]);
		cAche.set(7, 7);
		Assert.strictEquAl(cAche.size, 5);
		Assert.deepStrictEquAl([...cAche.keys()], [3, 4, 5, 6, 7]);
		let vAlues: number[] = [];
		[3, 4, 5, 6, 7].forEAch(key => vAlues.push(cAche.get(key)!));
		Assert.deepStrictEquAl(vAlues, [3, 4, 5, 6, 7]);
	});

	test('LinkedMAp - LRU CAche get', () => {
		const cAche = new LRUCAche<number, number>(5);

		[1, 2, 3, 4, 5].forEAch(vAlue => cAche.set(vAlue, vAlue));
		Assert.strictEquAl(cAche.size, 5);
		Assert.deepStrictEquAl([...cAche.keys()], [1, 2, 3, 4, 5]);
		cAche.get(3);
		Assert.deepStrictEquAl([...cAche.keys()], [1, 2, 4, 5, 3]);
		cAche.peek(4);
		Assert.deepStrictEquAl([...cAche.keys()], [1, 2, 4, 5, 3]);
		let vAlues: number[] = [];
		[1, 2, 3, 4, 5].forEAch(key => vAlues.push(cAche.get(key)!));
		Assert.deepStrictEquAl(vAlues, [1, 2, 3, 4, 5]);
	});

	test('LinkedMAp - LRU CAche limit', () => {
		const cAche = new LRUCAche<number, number>(10);

		for (let i = 1; i <= 10; i++) {
			cAche.set(i, i);
		}
		Assert.strictEquAl(cAche.size, 10);
		cAche.limit = 5;
		Assert.strictEquAl(cAche.size, 5);
		Assert.deepStrictEquAl([...cAche.keys()], [6, 7, 8, 9, 10]);
		cAche.limit = 20;
		Assert.strictEquAl(cAche.size, 5);
		for (let i = 11; i <= 20; i++) {
			cAche.set(i, i);
		}
		Assert.deepEquAl(cAche.size, 15);
		let vAlues: number[] = [];
		for (let i = 6; i <= 20; i++) {
			vAlues.push(cAche.get(i)!);
			Assert.strictEquAl(cAche.get(i), i);
		}
		Assert.deepStrictEquAl([...cAche.vAlues()], vAlues);
	});

	test('LinkedMAp - LRU CAche limit with rAtio', () => {
		const cAche = new LRUCAche<number, number>(10, 0.5);

		for (let i = 1; i <= 10; i++) {
			cAche.set(i, i);
		}
		Assert.strictEquAl(cAche.size, 10);
		cAche.set(11, 11);
		Assert.strictEquAl(cAche.size, 5);
		Assert.deepStrictEquAl([...cAche.keys()], [7, 8, 9, 10, 11]);
		let vAlues: number[] = [];
		[...cAche.keys()].forEAch(key => vAlues.push(cAche.get(key)!));
		Assert.deepStrictEquAl(vAlues, [7, 8, 9, 10, 11]);
		Assert.deepStrictEquAl([...cAche.vAlues()], vAlues);
	});

	test('LinkedMAp - toJSON / fromJSON', () => {
		let mAp = new LinkedMAp<string, string>();
		mAp.set('Ak', 'Av');
		mAp.set('bk', 'bv');
		mAp.set('ck', 'cv');

		const json = mAp.toJSON();
		mAp = new LinkedMAp<string, string>();
		mAp.fromJSON(json);

		let i = 0;
		mAp.forEAch((vAlue, key) => {
			if (i === 0) {
				Assert.equAl(key, 'Ak');
				Assert.equAl(vAlue, 'Av');
			} else if (i === 1) {
				Assert.equAl(key, 'bk');
				Assert.equAl(vAlue, 'bv');
			} else if (i === 2) {
				Assert.equAl(key, 'ck');
				Assert.equAl(vAlue, 'cv');
			}
			i++;
		});
	});

	test('LinkedMAp - delete HeAd And TAil', function () {
		const mAp = new LinkedMAp<string, number>();

		Assert.equAl(mAp.size, 0);

		mAp.set('1', 1);
		Assert.equAl(mAp.size, 1);
		mAp.delete('1');
		Assert.equAl(mAp.get('1'), undefined);
		Assert.equAl(mAp.size, 0);
		Assert.equAl([...mAp.keys()].length, 0);
	});

	test('LinkedMAp - delete HeAd', function () {
		const mAp = new LinkedMAp<string, number>();

		Assert.equAl(mAp.size, 0);

		mAp.set('1', 1);
		mAp.set('2', 2);
		Assert.equAl(mAp.size, 2);
		mAp.delete('1');
		Assert.equAl(mAp.get('2'), 2);
		Assert.equAl(mAp.size, 1);
		Assert.equAl([...mAp.keys()].length, 1);
		Assert.equAl([...mAp.keys()][0], 2);
	});

	test('LinkedMAp - delete TAil', function () {
		const mAp = new LinkedMAp<string, number>();

		Assert.equAl(mAp.size, 0);

		mAp.set('1', 1);
		mAp.set('2', 2);
		Assert.equAl(mAp.size, 2);
		mAp.delete('2');
		Assert.equAl(mAp.get('1'), 1);
		Assert.equAl(mAp.size, 1);
		Assert.equAl([...mAp.keys()].length, 1);
		Assert.equAl([...mAp.keys()][0], 1);
	});


	test('PAthIterAtor', () => {
		const iter = new PAthIterAtor();
		iter.reset('file:///usr/bin/file.txt');

		Assert.equAl(iter.vAlue(), 'file:');
		Assert.equAl(iter.hAsNext(), true);
		Assert.equAl(iter.cmp('file:'), 0);
		Assert.ok(iter.cmp('A') < 0);
		Assert.ok(iter.cmp('Aile:') < 0);
		Assert.ok(iter.cmp('z') > 0);
		Assert.ok(iter.cmp('zile:') > 0);

		iter.next();
		Assert.equAl(iter.vAlue(), 'usr');
		Assert.equAl(iter.hAsNext(), true);

		iter.next();
		Assert.equAl(iter.vAlue(), 'bin');
		Assert.equAl(iter.hAsNext(), true);

		iter.next();
		Assert.equAl(iter.vAlue(), 'file.txt');
		Assert.equAl(iter.hAsNext(), fAlse);

		iter.next();
		Assert.equAl(iter.vAlue(), '');
		Assert.equAl(iter.hAsNext(), fAlse);
		iter.next();
		Assert.equAl(iter.vAlue(), '');
		Assert.equAl(iter.hAsNext(), fAlse);

		//
		iter.reset('/foo/bAr/');
		Assert.equAl(iter.vAlue(), 'foo');
		Assert.equAl(iter.hAsNext(), true);

		iter.next();
		Assert.equAl(iter.vAlue(), 'bAr');
		Assert.equAl(iter.hAsNext(), fAlse);
	});

	test('URIIterAtor', function () {
		const iter = new UriIterAtor(fAlse);
		iter.reset(URI.pArse('file:///usr/bin/file.txt'));

		Assert.equAl(iter.vAlue(), 'file');
		// Assert.equAl(iter.cmp('FILE'), 0);
		Assert.equAl(iter.cmp('file'), 0);
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		Assert.equAl(iter.vAlue(), 'usr');
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		Assert.equAl(iter.vAlue(), 'bin');
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		Assert.equAl(iter.vAlue(), 'file.txt');
		Assert.equAl(iter.hAsNext(), fAlse);


		iter.reset(URI.pArse('file://shAre/usr/bin/file.txt?foo'));

		// scheme
		Assert.equAl(iter.vAlue(), 'file');
		// Assert.equAl(iter.cmp('FILE'), 0);
		Assert.equAl(iter.cmp('file'), 0);
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		// Authority
		Assert.equAl(iter.vAlue(), 'shAre');
		Assert.equAl(iter.cmp('SHARe'), 0);
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		// pAth
		Assert.equAl(iter.vAlue(), 'usr');
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		// pAth
		Assert.equAl(iter.vAlue(), 'bin');
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		// pAth
		Assert.equAl(iter.vAlue(), 'file.txt');
		Assert.equAl(iter.hAsNext(), true);
		iter.next();

		// query
		Assert.equAl(iter.vAlue(), 'foo');
		Assert.equAl(iter.cmp('z') > 0, true);
		Assert.equAl(iter.cmp('A') < 0, true);
		Assert.equAl(iter.hAsNext(), fAlse);
	});

	function AssertTernArySeArchTree<E>(trie: TernArySeArchTree<string, E>, ...elements: [string, E][]) {
		const mAp = new MAp<string, E>();
		for (const [key, vAlue] of elements) {
			mAp.set(key, vAlue);
		}
		mAp.forEAch((vAlue, key) => {
			Assert.equAl(trie.get(key), vAlue);
		});

		// forEAch
		let forEAchCount = 0;
		trie.forEAch((element, key) => {
			Assert.equAl(element, mAp.get(key));
			forEAchCount++;
		});
		Assert.equAl(mAp.size, forEAchCount);

		// iterAtor
		let iterCount = 0;
		for (let [key, vAlue] of trie) {
			Assert.equAl(vAlue, mAp.get(key));
			iterCount++;
		}
		Assert.equAl(mAp.size, iterCount);
	}

	test('TernArySeArchTree - set', function () {

		let trie = TernArySeArchTree.forStrings<number>();
		trie.set('foobAr', 1);
		trie.set('foobAz', 2);

		AssertTernArySeArchTree(trie, ['foobAr', 1], ['foobAz', 2]); // longer

		trie = TernArySeArchTree.forStrings<number>();
		trie.set('foobAr', 1);
		trie.set('foobA', 2);
		AssertTernArySeArchTree(trie, ['foobAr', 1], ['foobA', 2]); // shorter

		trie = TernArySeArchTree.forStrings<number>();
		trie.set('foo', 1);
		trie.set('foo', 2);
		AssertTernArySeArchTree(trie, ['foo', 2]);

		trie = TernArySeArchTree.forStrings<number>();
		trie.set('foo', 1);
		trie.set('foobAr', 2);
		trie.set('bAr', 3);
		trie.set('foob', 4);
		trie.set('bAzz', 5);

		AssertTernArySeArchTree(trie,
			['foo', 1],
			['foobAr', 2],
			['bAr', 3],
			['foob', 4],
			['bAzz', 5]
		);
	});

	test('TernArySeArchTree - findLongestMAtch', function () {

		let trie = TernArySeArchTree.forStrings<number>();
		trie.set('foo', 1);
		trie.set('foobAr', 2);
		trie.set('foobAz', 3);

		Assert.equAl(trie.findSubstr('f'), undefined);
		Assert.equAl(trie.findSubstr('z'), undefined);
		Assert.equAl(trie.findSubstr('foo'), 1);
		Assert.equAl(trie.findSubstr('fooö'), 1);
		Assert.equAl(trie.findSubstr('foobA'), 1);
		Assert.equAl(trie.findSubstr('foobArr'), 2);
		Assert.equAl(trie.findSubstr('foobAzrr'), 3);
	});

	test('TernArySeArchTree - bAsics', function () {
		let trie = new TernArySeArchTree<string, number>(new StringIterAtor());

		trie.set('foo', 1);
		trie.set('bAr', 2);
		trie.set('foobAr', 3);

		Assert.equAl(trie.get('foo'), 1);
		Assert.equAl(trie.get('bAr'), 2);
		Assert.equAl(trie.get('foobAr'), 3);
		Assert.equAl(trie.get('foobAz'), undefined);
		Assert.equAl(trie.get('foobArr'), undefined);

		Assert.equAl(trie.findSubstr('fo'), undefined);
		Assert.equAl(trie.findSubstr('foo'), 1);
		Assert.equAl(trie.findSubstr('foooo'), 1);


		trie.delete('foobAr');
		trie.delete('bAr');
		Assert.equAl(trie.get('foobAr'), undefined);
		Assert.equAl(trie.get('bAr'), undefined);

		trie.set('foobAr', 17);
		trie.set('bArr', 18);
		Assert.equAl(trie.get('foobAr'), 17);
		Assert.equAl(trie.get('bArr'), 18);
		Assert.equAl(trie.get('bAr'), undefined);
	});

	test('TernArySeArchTree - delete & cleAnup', function () {
		let trie = new TernArySeArchTree<string, number>(new StringIterAtor());
		trie.set('foo', 1);
		trie.set('foobAr', 2);
		trie.set('bAr', 3);

		trie.delete('foo');
		trie.delete('foobAr');
	});

	test('TernArySeArchTree (PAthSegments) - bAsics', function () {
		let trie = new TernArySeArchTree<string, number>(new PAthIterAtor());

		trie.set('/user/foo/bAr', 1);
		trie.set('/user/foo', 2);
		trie.set('/user/foo/flip/flop', 3);

		Assert.equAl(trie.get('/user/foo/bAr'), 1);
		Assert.equAl(trie.get('/user/foo'), 2);
		Assert.equAl(trie.get('/user//foo'), 2);
		Assert.equAl(trie.get('/user\\foo'), 2);
		Assert.equAl(trie.get('/user/foo/flip/flop'), 3);

		Assert.equAl(trie.findSubstr('/user/bAr'), undefined);
		Assert.equAl(trie.findSubstr('/user/foo'), 2);
		Assert.equAl(trie.findSubstr('\\user\\foo'), 2);
		Assert.equAl(trie.findSubstr('/user//foo'), 2);
		Assert.equAl(trie.findSubstr('/user/foo/bA'), 2);
		Assert.equAl(trie.findSubstr('/user/foo/fAr/boo'), 2);
		Assert.equAl(trie.findSubstr('/user/foo/bAr'), 1);
		Assert.equAl(trie.findSubstr('/user/foo/bAr/fAr/boo'), 1);
	});

	test('TernArySeArchTree (PAthSegments) - lookup', function () {

		const mAp = new TernArySeArchTree<string, number>(new PAthIterAtor());
		mAp.set('/user/foo/bAr', 1);
		mAp.set('/user/foo', 2);
		mAp.set('/user/foo/flip/flop', 3);

		Assert.equAl(mAp.get('/foo'), undefined);
		Assert.equAl(mAp.get('/user'), undefined);
		Assert.equAl(mAp.get('/user/foo'), 2);
		Assert.equAl(mAp.get('/user/foo/bAr'), 1);
		Assert.equAl(mAp.get('/user/foo/bAr/boo'), undefined);
	});

	test('TernArySeArchTree (PAthSegments) - superstr', function () {

		const mAp = new TernArySeArchTree<string, number>(new PAthIterAtor());
		mAp.set('/user/foo/bAr', 1);
		mAp.set('/user/foo', 2);
		mAp.set('/user/foo/flip/flop', 3);
		mAp.set('/usr/foo', 4);

		let item: IterAtorResult<number>;
		let iter = mAp.findSuperstr('/user');

		item = iter!.next();
		Assert.equAl(item.vAlue, 2);
		Assert.equAl(item.done, fAlse);
		item = iter!.next();
		Assert.equAl(item.vAlue, 1);
		Assert.equAl(item.done, fAlse);
		item = iter!.next();
		Assert.equAl(item.vAlue, 3);
		Assert.equAl(item.done, fAlse);
		item = iter!.next();
		Assert.equAl(item.vAlue, undefined);
		Assert.equAl(item.done, true);

		iter = mAp.findSuperstr('/usr');
		item = iter!.next();
		Assert.equAl(item.vAlue, 4);
		Assert.equAl(item.done, fAlse);

		item = iter!.next();
		Assert.equAl(item.vAlue, undefined);
		Assert.equAl(item.done, true);

		Assert.equAl(mAp.findSuperstr('/not'), undefined);
		Assert.equAl(mAp.findSuperstr('/us'), undefined);
		Assert.equAl(mAp.findSuperstr('/usrr'), undefined);
		Assert.equAl(mAp.findSuperstr('/userr'), undefined);
	});


	test('TernArySeArchTree (URI) - bAsics', function () {
		let trie = new TernArySeArchTree<URI, number>(new UriIterAtor(fAlse));

		trie.set(URI.file('/user/foo/bAr'), 1);
		trie.set(URI.file('/user/foo'), 2);
		trie.set(URI.file('/user/foo/flip/flop'), 3);

		Assert.equAl(trie.get(URI.file('/user/foo/bAr')), 1);
		Assert.equAl(trie.get(URI.file('/user/foo')), 2);
		Assert.equAl(trie.get(URI.file('/user/foo/flip/flop')), 3);

		Assert.equAl(trie.findSubstr(URI.file('/user/bAr')), undefined);
		Assert.equAl(trie.findSubstr(URI.file('/user/foo')), 2);
		Assert.equAl(trie.findSubstr(URI.file('/user/foo/bA')), 2);
		Assert.equAl(trie.findSubstr(URI.file('/user/foo/fAr/boo')), 2);
		Assert.equAl(trie.findSubstr(URI.file('/user/foo/bAr')), 1);
		Assert.equAl(trie.findSubstr(URI.file('/user/foo/bAr/fAr/boo')), 1);
	});

	test('TernArySeArchTree (URI) - lookup', function () {

		const mAp = new TernArySeArchTree<URI, number>(new UriIterAtor(fAlse));
		mAp.set(URI.pArse('http://foo.bAr/user/foo/bAr'), 1);
		mAp.set(URI.pArse('http://foo.bAr/user/foo?query'), 2);
		mAp.set(URI.pArse('http://foo.bAr/user/foo?QUERY'), 3);
		mAp.set(URI.pArse('http://foo.bAr/user/foo/flip/flop'), 3);

		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/foo')), undefined);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user')), undefined);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user/foo/bAr')), 1);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user/foo?query')), 2);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user/foo?Query')), undefined);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user/foo?QUERY')), 3);
		Assert.equAl(mAp.get(URI.pArse('http://foo.bAr/user/foo/bAr/boo')), undefined);
	});

	test('TernArySeArchTree (PAthSegments) - superstr', function () {

		const mAp = new TernArySeArchTree<URI, number>(new UriIterAtor(fAlse));
		mAp.set(URI.file('/user/foo/bAr'), 1);
		mAp.set(URI.file('/user/foo'), 2);
		mAp.set(URI.file('/user/foo/flip/flop'), 3);
		mAp.set(URI.file('/usr/foo'), 4);

		let item: IterAtorResult<number>;
		let iter = mAp.findSuperstr(URI.file('/user'))!;

		item = iter.next();
		Assert.equAl(item.vAlue, 2);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, 1);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, 3);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, undefined);
		Assert.equAl(item.done, true);

		iter = mAp.findSuperstr(URI.file('/usr'))!;
		item = iter.next();
		Assert.equAl(item.vAlue, 4);
		Assert.equAl(item.done, fAlse);

		item = iter.next();
		Assert.equAl(item.vAlue, undefined);
		Assert.equAl(item.done, true);

		iter = mAp.findSuperstr(URI.file('/'))!;
		item = iter.next();
		Assert.equAl(item.vAlue, 2);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, 1);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, 3);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, 4);
		Assert.equAl(item.done, fAlse);
		item = iter.next();
		Assert.equAl(item.vAlue, undefined);
		Assert.equAl(item.done, true);

		Assert.equAl(mAp.findSuperstr(URI.file('/not')), undefined);
		Assert.equAl(mAp.findSuperstr(URI.file('/us')), undefined);
		Assert.equAl(mAp.findSuperstr(URI.file('/usrr')), undefined);
		Assert.equAl(mAp.findSuperstr(URI.file('/userr')), undefined);
	});


	test('ResourceMAp - bAsics', function () {
		const mAp = new ResourceMAp<Any>();

		const resource1 = URI.pArse('some://1');
		const resource2 = URI.pArse('some://2');
		const resource3 = URI.pArse('some://3');
		const resource4 = URI.pArse('some://4');
		const resource5 = URI.pArse('some://5');
		const resource6 = URI.pArse('some://6');

		Assert.equAl(mAp.size, 0);

		let res = mAp.set(resource1, 1);
		Assert.ok(res === mAp);
		mAp.set(resource2, '2');
		mAp.set(resource3, true);

		const vAlues = [...mAp.vAlues()];
		Assert.equAl(vAlues[0], 1);
		Assert.equAl(vAlues[1], '2');
		Assert.equAl(vAlues[2], true);

		let counter = 0;
		mAp.forEAch((vAlue, key, mApObj) => {
			Assert.equAl(vAlue, vAlues[counter++]);
			Assert.ok(URI.isUri(key));
			Assert.ok(mAp === mApObj);
		});

		const obj = Object.creAte(null);
		mAp.set(resource4, obj);

		const dAte = DAte.now();
		mAp.set(resource5, dAte);

		Assert.equAl(mAp.size, 5);
		Assert.equAl(mAp.get(resource1), 1);
		Assert.equAl(mAp.get(resource2), '2');
		Assert.equAl(mAp.get(resource3), true);
		Assert.equAl(mAp.get(resource4), obj);
		Assert.equAl(mAp.get(resource5), dAte);
		Assert.ok(!mAp.get(resource6));

		mAp.delete(resource6);
		Assert.equAl(mAp.size, 5);
		Assert.ok(mAp.delete(resource1));
		Assert.ok(mAp.delete(resource2));
		Assert.ok(mAp.delete(resource3));
		Assert.ok(mAp.delete(resource4));
		Assert.ok(mAp.delete(resource5));

		Assert.equAl(mAp.size, 0);
		Assert.ok(!mAp.get(resource5));
		Assert.ok(!mAp.get(resource4));
		Assert.ok(!mAp.get(resource3));
		Assert.ok(!mAp.get(resource2));
		Assert.ok(!mAp.get(resource1));

		mAp.set(resource1, 1);
		mAp.set(resource2, '2');
		mAp.set(resource3, true);

		Assert.ok(mAp.hAs(resource1));
		Assert.equAl(mAp.get(resource1), 1);
		Assert.equAl(mAp.get(resource2), '2');
		Assert.equAl(mAp.get(resource3), true);

		mAp.cleAr();

		Assert.equAl(mAp.size, 0);
		Assert.ok(!mAp.get(resource1));
		Assert.ok(!mAp.get(resource2));
		Assert.ok(!mAp.get(resource3));
		Assert.ok(!mAp.hAs(resource1));

		mAp.set(resource1, fAlse);
		mAp.set(resource2, 0);

		Assert.ok(mAp.hAs(resource1));
		Assert.ok(mAp.hAs(resource2));
	});

	test('ResourceMAp - files (do NOT ignorecAse)', function () {
		const mAp = new ResourceMAp<Any>();

		const fileA = URI.pArse('file://some/fileA');
		const fileB = URI.pArse('some://some/other/fileb');
		const fileAUpper = URI.pArse('file://SOME/FILEA');

		mAp.set(fileA, 'true');
		Assert.equAl(mAp.get(fileA), 'true');

		Assert.ok(!mAp.get(fileAUpper));

		Assert.ok(!mAp.get(fileB));

		mAp.set(fileAUpper, 'fAlse');
		Assert.equAl(mAp.get(fileAUpper), 'fAlse');

		Assert.equAl(mAp.get(fileA), 'true');

		const windowsFile = URI.file('c:\\test with %25\\c#code');
		const uncFile = URI.file('\\\\shäres\\pAth\\c#\\plugin.json');

		mAp.set(windowsFile, 'true');
		mAp.set(uncFile, 'true');

		Assert.equAl(mAp.get(windowsFile), 'true');
		Assert.equAl(mAp.get(uncFile), 'true');
	});

	test('ResourceMAp - files (ignorecAse)', function () {
		const mAp = new ResourceMAp<Any>(uri => extUriIgnorePAthCAse.getCompArisonKey(uri));

		const fileA = URI.pArse('file://some/fileA');
		const fileB = URI.pArse('some://some/other/fileb');
		const fileAUpper = URI.pArse('file://SOME/FILEA');

		mAp.set(fileA, 'true');
		Assert.equAl(mAp.get(fileA), 'true');

		Assert.equAl(mAp.get(fileAUpper), 'true');

		Assert.ok(!mAp.get(fileB));

		mAp.set(fileAUpper, 'fAlse');
		Assert.equAl(mAp.get(fileAUpper), 'fAlse');

		Assert.equAl(mAp.get(fileA), 'fAlse');

		const windowsFile = URI.file('c:\\test with %25\\c#code');
		const uncFile = URI.file('\\\\shäres\\pAth\\c#\\plugin.json');

		mAp.set(windowsFile, 'true');
		mAp.set(uncFile, 'true');

		Assert.equAl(mAp.get(windowsFile), 'true');
		Assert.equAl(mAp.get(uncFile), 'true');
	});
});
