/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceMap, TernarySearchTree, PathIterator, StringIterator, LinkedMap, Touch, LRUCache, UriIterator } from 'vs/Base/common/map';
import * as assert from 'assert';
import { URI } from 'vs/Base/common/uri';
import { extUriIgnorePathCase } from 'vs/Base/common/resources';

suite('Map', () => {

	test('LinkedMap - Simple', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		assert.deepStrictEqual([...map.keys()], ['ak', 'Bk']);
		assert.deepStrictEqual([...map.values()], ['av', 'Bv']);
		assert.equal(map.first, 'av');
		assert.equal(map.last, 'Bv');
	});

	test('LinkedMap - Touch Old one', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('ak', 'av', Touch.AsOld);
		assert.deepStrictEqual([...map.keys()], ['ak']);
		assert.deepStrictEqual([...map.values()], ['av']);
	});

	test('LinkedMap - Touch New one', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('ak', 'av', Touch.AsNew);
		assert.deepStrictEqual([...map.keys()], ['ak']);
		assert.deepStrictEqual([...map.values()], ['av']);
	});

	test('LinkedMap - Touch Old two', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		map.set('Bk', 'Bv', Touch.AsOld);
		assert.deepStrictEqual([...map.keys()], ['Bk', 'ak']);
		assert.deepStrictEqual([...map.values()], ['Bv', 'av']);
	});

	test('LinkedMap - Touch New two', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		map.set('ak', 'av', Touch.AsNew);
		assert.deepStrictEqual([...map.keys()], ['Bk', 'ak']);
		assert.deepStrictEqual([...map.values()], ['Bv', 'av']);
	});

	test('LinkedMap - Touch Old from middle', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		map.set('ck', 'cv');
		map.set('Bk', 'Bv', Touch.AsOld);
		assert.deepStrictEqual([...map.keys()], ['Bk', 'ak', 'ck']);
		assert.deepStrictEqual([...map.values()], ['Bv', 'av', 'cv']);
	});

	test('LinkedMap - Touch New from middle', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		map.set('ck', 'cv');
		map.set('Bk', 'Bv', Touch.AsNew);
		assert.deepStrictEqual([...map.keys()], ['ak', 'ck', 'Bk']);
		assert.deepStrictEqual([...map.values()], ['av', 'cv', 'Bv']);
	});

	test('LinkedMap - Basics', function () {
		const map = new LinkedMap<string, any>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		map.set('2', '2');
		map.set('3', true);

		const oBj = OBject.create(null);
		map.set('4', oBj);

		const date = Date.now();
		map.set('5', date);

		assert.equal(map.size, 5);
		assert.equal(map.get('1'), 1);
		assert.equal(map.get('2'), '2');
		assert.equal(map.get('3'), true);
		assert.equal(map.get('4'), oBj);
		assert.equal(map.get('5'), date);
		assert.ok(!map.get('6'));

		map.delete('6');
		assert.equal(map.size, 5);
		assert.equal(map.delete('1'), true);
		assert.equal(map.delete('2'), true);
		assert.equal(map.delete('3'), true);
		assert.equal(map.delete('4'), true);
		assert.equal(map.delete('5'), true);

		assert.equal(map.size, 0);
		assert.ok(!map.get('5'));
		assert.ok(!map.get('4'));
		assert.ok(!map.get('3'));
		assert.ok(!map.get('2'));
		assert.ok(!map.get('1'));

		map.set('1', 1);
		map.set('2', '2');
		map.set('3', true);

		assert.ok(map.has('1'));
		assert.equal(map.get('1'), 1);
		assert.equal(map.get('2'), '2');
		assert.equal(map.get('3'), true);

		map.clear();

		assert.equal(map.size, 0);
		assert.ok(!map.get('1'));
		assert.ok(!map.get('2'));
		assert.ok(!map.get('3'));
		assert.ok(!map.has('1'));
	});

	test('LinkedMap - Iterators', () => {
		const map = new LinkedMap<numBer, any>();
		map.set(1, 1);
		map.set(2, 2);
		map.set(3, 3);

		for (const elem of map.keys()) {
			assert.ok(elem);
		}

		for (const elem of map.values()) {
			assert.ok(elem);
		}

		for (const elem of map.entries()) {
			assert.ok(elem);
		}

		{
			const keys = map.keys();
			const values = map.values();
			const entries = map.entries();
			map.get(1);
			keys.next();
			values.next();
			entries.next();
		}

		{
			const keys = map.keys();
			const values = map.values();
			const entries = map.entries();
			map.get(1, Touch.AsNew);

			let exceptions: numBer = 0;
			try {
				keys.next();
			} catch (err) {
				exceptions++;
			}
			try {
				values.next();
			} catch (err) {
				exceptions++;
			}
			try {
				entries.next();
			} catch (err) {
				exceptions++;
			}

			assert.strictEqual(exceptions, 3);
		}
	});

	test('LinkedMap - LRU Cache simple', () => {
		const cache = new LRUCache<numBer, numBer>(5);

		[1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
		assert.strictEqual(cache.size, 5);
		cache.set(6, 6);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [2, 3, 4, 5, 6]);
		cache.set(7, 7);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [3, 4, 5, 6, 7]);
		let values: numBer[] = [];
		[3, 4, 5, 6, 7].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [3, 4, 5, 6, 7]);
	});

	test('LinkedMap - LRU Cache get', () => {
		const cache = new LRUCache<numBer, numBer>(5);

		[1, 2, 3, 4, 5].forEach(value => cache.set(value, value));
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 3, 4, 5]);
		cache.get(3);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
		cache.peek(4);
		assert.deepStrictEqual([...cache.keys()], [1, 2, 4, 5, 3]);
		let values: numBer[] = [];
		[1, 2, 3, 4, 5].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [1, 2, 3, 4, 5]);
	});

	test('LinkedMap - LRU Cache limit', () => {
		const cache = new LRUCache<numBer, numBer>(10);

		for (let i = 1; i <= 10; i++) {
			cache.set(i, i);
		}
		assert.strictEqual(cache.size, 10);
		cache.limit = 5;
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [6, 7, 8, 9, 10]);
		cache.limit = 20;
		assert.strictEqual(cache.size, 5);
		for (let i = 11; i <= 20; i++) {
			cache.set(i, i);
		}
		assert.deepEqual(cache.size, 15);
		let values: numBer[] = [];
		for (let i = 6; i <= 20; i++) {
			values.push(cache.get(i)!);
			assert.strictEqual(cache.get(i), i);
		}
		assert.deepStrictEqual([...cache.values()], values);
	});

	test('LinkedMap - LRU Cache limit with ratio', () => {
		const cache = new LRUCache<numBer, numBer>(10, 0.5);

		for (let i = 1; i <= 10; i++) {
			cache.set(i, i);
		}
		assert.strictEqual(cache.size, 10);
		cache.set(11, 11);
		assert.strictEqual(cache.size, 5);
		assert.deepStrictEqual([...cache.keys()], [7, 8, 9, 10, 11]);
		let values: numBer[] = [];
		[...cache.keys()].forEach(key => values.push(cache.get(key)!));
		assert.deepStrictEqual(values, [7, 8, 9, 10, 11]);
		assert.deepStrictEqual([...cache.values()], values);
	});

	test('LinkedMap - toJSON / fromJSON', () => {
		let map = new LinkedMap<string, string>();
		map.set('ak', 'av');
		map.set('Bk', 'Bv');
		map.set('ck', 'cv');

		const json = map.toJSON();
		map = new LinkedMap<string, string>();
		map.fromJSON(json);

		let i = 0;
		map.forEach((value, key) => {
			if (i === 0) {
				assert.equal(key, 'ak');
				assert.equal(value, 'av');
			} else if (i === 1) {
				assert.equal(key, 'Bk');
				assert.equal(value, 'Bv');
			} else if (i === 2) {
				assert.equal(key, 'ck');
				assert.equal(value, 'cv');
			}
			i++;
		});
	});

	test('LinkedMap - delete Head and Tail', function () {
		const map = new LinkedMap<string, numBer>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		assert.equal(map.size, 1);
		map.delete('1');
		assert.equal(map.get('1'), undefined);
		assert.equal(map.size, 0);
		assert.equal([...map.keys()].length, 0);
	});

	test('LinkedMap - delete Head', function () {
		const map = new LinkedMap<string, numBer>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		map.set('2', 2);
		assert.equal(map.size, 2);
		map.delete('1');
		assert.equal(map.get('2'), 2);
		assert.equal(map.size, 1);
		assert.equal([...map.keys()].length, 1);
		assert.equal([...map.keys()][0], 2);
	});

	test('LinkedMap - delete Tail', function () {
		const map = new LinkedMap<string, numBer>();

		assert.equal(map.size, 0);

		map.set('1', 1);
		map.set('2', 2);
		assert.equal(map.size, 2);
		map.delete('2');
		assert.equal(map.get('1'), 1);
		assert.equal(map.size, 1);
		assert.equal([...map.keys()].length, 1);
		assert.equal([...map.keys()][0], 1);
	});


	test('PathIterator', () => {
		const iter = new PathIterator();
		iter.reset('file:///usr/Bin/file.txt');

		assert.equal(iter.value(), 'file:');
		assert.equal(iter.hasNext(), true);
		assert.equal(iter.cmp('file:'), 0);
		assert.ok(iter.cmp('a') < 0);
		assert.ok(iter.cmp('aile:') < 0);
		assert.ok(iter.cmp('z') > 0);
		assert.ok(iter.cmp('zile:') > 0);

		iter.next();
		assert.equal(iter.value(), 'usr');
		assert.equal(iter.hasNext(), true);

		iter.next();
		assert.equal(iter.value(), 'Bin');
		assert.equal(iter.hasNext(), true);

		iter.next();
		assert.equal(iter.value(), 'file.txt');
		assert.equal(iter.hasNext(), false);

		iter.next();
		assert.equal(iter.value(), '');
		assert.equal(iter.hasNext(), false);
		iter.next();
		assert.equal(iter.value(), '');
		assert.equal(iter.hasNext(), false);

		//
		iter.reset('/foo/Bar/');
		assert.equal(iter.value(), 'foo');
		assert.equal(iter.hasNext(), true);

		iter.next();
		assert.equal(iter.value(), 'Bar');
		assert.equal(iter.hasNext(), false);
	});

	test('URIIterator', function () {
		const iter = new UriIterator(false);
		iter.reset(URI.parse('file:///usr/Bin/file.txt'));

		assert.equal(iter.value(), 'file');
		// assert.equal(iter.cmp('FILE'), 0);
		assert.equal(iter.cmp('file'), 0);
		assert.equal(iter.hasNext(), true);
		iter.next();

		assert.equal(iter.value(), 'usr');
		assert.equal(iter.hasNext(), true);
		iter.next();

		assert.equal(iter.value(), 'Bin');
		assert.equal(iter.hasNext(), true);
		iter.next();

		assert.equal(iter.value(), 'file.txt');
		assert.equal(iter.hasNext(), false);


		iter.reset(URI.parse('file://share/usr/Bin/file.txt?foo'));

		// scheme
		assert.equal(iter.value(), 'file');
		// assert.equal(iter.cmp('FILE'), 0);
		assert.equal(iter.cmp('file'), 0);
		assert.equal(iter.hasNext(), true);
		iter.next();

		// authority
		assert.equal(iter.value(), 'share');
		assert.equal(iter.cmp('SHARe'), 0);
		assert.equal(iter.hasNext(), true);
		iter.next();

		// path
		assert.equal(iter.value(), 'usr');
		assert.equal(iter.hasNext(), true);
		iter.next();

		// path
		assert.equal(iter.value(), 'Bin');
		assert.equal(iter.hasNext(), true);
		iter.next();

		// path
		assert.equal(iter.value(), 'file.txt');
		assert.equal(iter.hasNext(), true);
		iter.next();

		// query
		assert.equal(iter.value(), 'foo');
		assert.equal(iter.cmp('z') > 0, true);
		assert.equal(iter.cmp('a') < 0, true);
		assert.equal(iter.hasNext(), false);
	});

	function assertTernarySearchTree<E>(trie: TernarySearchTree<string, E>, ...elements: [string, E][]) {
		const map = new Map<string, E>();
		for (const [key, value] of elements) {
			map.set(key, value);
		}
		map.forEach((value, key) => {
			assert.equal(trie.get(key), value);
		});

		// forEach
		let forEachCount = 0;
		trie.forEach((element, key) => {
			assert.equal(element, map.get(key));
			forEachCount++;
		});
		assert.equal(map.size, forEachCount);

		// iterator
		let iterCount = 0;
		for (let [key, value] of trie) {
			assert.equal(value, map.get(key));
			iterCount++;
		}
		assert.equal(map.size, iterCount);
	}

	test('TernarySearchTree - set', function () {

		let trie = TernarySearchTree.forStrings<numBer>();
		trie.set('fooBar', 1);
		trie.set('fooBaz', 2);

		assertTernarySearchTree(trie, ['fooBar', 1], ['fooBaz', 2]); // longer

		trie = TernarySearchTree.forStrings<numBer>();
		trie.set('fooBar', 1);
		trie.set('fooBa', 2);
		assertTernarySearchTree(trie, ['fooBar', 1], ['fooBa', 2]); // shorter

		trie = TernarySearchTree.forStrings<numBer>();
		trie.set('foo', 1);
		trie.set('foo', 2);
		assertTernarySearchTree(trie, ['foo', 2]);

		trie = TernarySearchTree.forStrings<numBer>();
		trie.set('foo', 1);
		trie.set('fooBar', 2);
		trie.set('Bar', 3);
		trie.set('fooB', 4);
		trie.set('Bazz', 5);

		assertTernarySearchTree(trie,
			['foo', 1],
			['fooBar', 2],
			['Bar', 3],
			['fooB', 4],
			['Bazz', 5]
		);
	});

	test('TernarySearchTree - findLongestMatch', function () {

		let trie = TernarySearchTree.forStrings<numBer>();
		trie.set('foo', 1);
		trie.set('fooBar', 2);
		trie.set('fooBaz', 3);

		assert.equal(trie.findSuBstr('f'), undefined);
		assert.equal(trie.findSuBstr('z'), undefined);
		assert.equal(trie.findSuBstr('foo'), 1);
		assert.equal(trie.findSuBstr('fooö'), 1);
		assert.equal(trie.findSuBstr('fooBa'), 1);
		assert.equal(trie.findSuBstr('fooBarr'), 2);
		assert.equal(trie.findSuBstr('fooBazrr'), 3);
	});

	test('TernarySearchTree - Basics', function () {
		let trie = new TernarySearchTree<string, numBer>(new StringIterator());

		trie.set('foo', 1);
		trie.set('Bar', 2);
		trie.set('fooBar', 3);

		assert.equal(trie.get('foo'), 1);
		assert.equal(trie.get('Bar'), 2);
		assert.equal(trie.get('fooBar'), 3);
		assert.equal(trie.get('fooBaz'), undefined);
		assert.equal(trie.get('fooBarr'), undefined);

		assert.equal(trie.findSuBstr('fo'), undefined);
		assert.equal(trie.findSuBstr('foo'), 1);
		assert.equal(trie.findSuBstr('foooo'), 1);


		trie.delete('fooBar');
		trie.delete('Bar');
		assert.equal(trie.get('fooBar'), undefined);
		assert.equal(trie.get('Bar'), undefined);

		trie.set('fooBar', 17);
		trie.set('Barr', 18);
		assert.equal(trie.get('fooBar'), 17);
		assert.equal(trie.get('Barr'), 18);
		assert.equal(trie.get('Bar'), undefined);
	});

	test('TernarySearchTree - delete & cleanup', function () {
		let trie = new TernarySearchTree<string, numBer>(new StringIterator());
		trie.set('foo', 1);
		trie.set('fooBar', 2);
		trie.set('Bar', 3);

		trie.delete('foo');
		trie.delete('fooBar');
	});

	test('TernarySearchTree (PathSegments) - Basics', function () {
		let trie = new TernarySearchTree<string, numBer>(new PathIterator());

		trie.set('/user/foo/Bar', 1);
		trie.set('/user/foo', 2);
		trie.set('/user/foo/flip/flop', 3);

		assert.equal(trie.get('/user/foo/Bar'), 1);
		assert.equal(trie.get('/user/foo'), 2);
		assert.equal(trie.get('/user//foo'), 2);
		assert.equal(trie.get('/user\\foo'), 2);
		assert.equal(trie.get('/user/foo/flip/flop'), 3);

		assert.equal(trie.findSuBstr('/user/Bar'), undefined);
		assert.equal(trie.findSuBstr('/user/foo'), 2);
		assert.equal(trie.findSuBstr('\\user\\foo'), 2);
		assert.equal(trie.findSuBstr('/user//foo'), 2);
		assert.equal(trie.findSuBstr('/user/foo/Ba'), 2);
		assert.equal(trie.findSuBstr('/user/foo/far/Boo'), 2);
		assert.equal(trie.findSuBstr('/user/foo/Bar'), 1);
		assert.equal(trie.findSuBstr('/user/foo/Bar/far/Boo'), 1);
	});

	test('TernarySearchTree (PathSegments) - lookup', function () {

		const map = new TernarySearchTree<string, numBer>(new PathIterator());
		map.set('/user/foo/Bar', 1);
		map.set('/user/foo', 2);
		map.set('/user/foo/flip/flop', 3);

		assert.equal(map.get('/foo'), undefined);
		assert.equal(map.get('/user'), undefined);
		assert.equal(map.get('/user/foo'), 2);
		assert.equal(map.get('/user/foo/Bar'), 1);
		assert.equal(map.get('/user/foo/Bar/Boo'), undefined);
	});

	test('TernarySearchTree (PathSegments) - superstr', function () {

		const map = new TernarySearchTree<string, numBer>(new PathIterator());
		map.set('/user/foo/Bar', 1);
		map.set('/user/foo', 2);
		map.set('/user/foo/flip/flop', 3);
		map.set('/usr/foo', 4);

		let item: IteratorResult<numBer>;
		let iter = map.findSuperstr('/user');

		item = iter!.next();
		assert.equal(item.value, 2);
		assert.equal(item.done, false);
		item = iter!.next();
		assert.equal(item.value, 1);
		assert.equal(item.done, false);
		item = iter!.next();
		assert.equal(item.value, 3);
		assert.equal(item.done, false);
		item = iter!.next();
		assert.equal(item.value, undefined);
		assert.equal(item.done, true);

		iter = map.findSuperstr('/usr');
		item = iter!.next();
		assert.equal(item.value, 4);
		assert.equal(item.done, false);

		item = iter!.next();
		assert.equal(item.value, undefined);
		assert.equal(item.done, true);

		assert.equal(map.findSuperstr('/not'), undefined);
		assert.equal(map.findSuperstr('/us'), undefined);
		assert.equal(map.findSuperstr('/usrr'), undefined);
		assert.equal(map.findSuperstr('/userr'), undefined);
	});


	test('TernarySearchTree (URI) - Basics', function () {
		let trie = new TernarySearchTree<URI, numBer>(new UriIterator(false));

		trie.set(URI.file('/user/foo/Bar'), 1);
		trie.set(URI.file('/user/foo'), 2);
		trie.set(URI.file('/user/foo/flip/flop'), 3);

		assert.equal(trie.get(URI.file('/user/foo/Bar')), 1);
		assert.equal(trie.get(URI.file('/user/foo')), 2);
		assert.equal(trie.get(URI.file('/user/foo/flip/flop')), 3);

		assert.equal(trie.findSuBstr(URI.file('/user/Bar')), undefined);
		assert.equal(trie.findSuBstr(URI.file('/user/foo')), 2);
		assert.equal(trie.findSuBstr(URI.file('/user/foo/Ba')), 2);
		assert.equal(trie.findSuBstr(URI.file('/user/foo/far/Boo')), 2);
		assert.equal(trie.findSuBstr(URI.file('/user/foo/Bar')), 1);
		assert.equal(trie.findSuBstr(URI.file('/user/foo/Bar/far/Boo')), 1);
	});

	test('TernarySearchTree (URI) - lookup', function () {

		const map = new TernarySearchTree<URI, numBer>(new UriIterator(false));
		map.set(URI.parse('http://foo.Bar/user/foo/Bar'), 1);
		map.set(URI.parse('http://foo.Bar/user/foo?query'), 2);
		map.set(URI.parse('http://foo.Bar/user/foo?QUERY'), 3);
		map.set(URI.parse('http://foo.Bar/user/foo/flip/flop'), 3);

		assert.equal(map.get(URI.parse('http://foo.Bar/foo')), undefined);
		assert.equal(map.get(URI.parse('http://foo.Bar/user')), undefined);
		assert.equal(map.get(URI.parse('http://foo.Bar/user/foo/Bar')), 1);
		assert.equal(map.get(URI.parse('http://foo.Bar/user/foo?query')), 2);
		assert.equal(map.get(URI.parse('http://foo.Bar/user/foo?Query')), undefined);
		assert.equal(map.get(URI.parse('http://foo.Bar/user/foo?QUERY')), 3);
		assert.equal(map.get(URI.parse('http://foo.Bar/user/foo/Bar/Boo')), undefined);
	});

	test('TernarySearchTree (PathSegments) - superstr', function () {

		const map = new TernarySearchTree<URI, numBer>(new UriIterator(false));
		map.set(URI.file('/user/foo/Bar'), 1);
		map.set(URI.file('/user/foo'), 2);
		map.set(URI.file('/user/foo/flip/flop'), 3);
		map.set(URI.file('/usr/foo'), 4);

		let item: IteratorResult<numBer>;
		let iter = map.findSuperstr(URI.file('/user'))!;

		item = iter.next();
		assert.equal(item.value, 2);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, 1);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, 3);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, undefined);
		assert.equal(item.done, true);

		iter = map.findSuperstr(URI.file('/usr'))!;
		item = iter.next();
		assert.equal(item.value, 4);
		assert.equal(item.done, false);

		item = iter.next();
		assert.equal(item.value, undefined);
		assert.equal(item.done, true);

		iter = map.findSuperstr(URI.file('/'))!;
		item = iter.next();
		assert.equal(item.value, 2);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, 1);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, 3);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, 4);
		assert.equal(item.done, false);
		item = iter.next();
		assert.equal(item.value, undefined);
		assert.equal(item.done, true);

		assert.equal(map.findSuperstr(URI.file('/not')), undefined);
		assert.equal(map.findSuperstr(URI.file('/us')), undefined);
		assert.equal(map.findSuperstr(URI.file('/usrr')), undefined);
		assert.equal(map.findSuperstr(URI.file('/userr')), undefined);
	});


	test('ResourceMap - Basics', function () {
		const map = new ResourceMap<any>();

		const resource1 = URI.parse('some://1');
		const resource2 = URI.parse('some://2');
		const resource3 = URI.parse('some://3');
		const resource4 = URI.parse('some://4');
		const resource5 = URI.parse('some://5');
		const resource6 = URI.parse('some://6');

		assert.equal(map.size, 0);

		let res = map.set(resource1, 1);
		assert.ok(res === map);
		map.set(resource2, '2');
		map.set(resource3, true);

		const values = [...map.values()];
		assert.equal(values[0], 1);
		assert.equal(values[1], '2');
		assert.equal(values[2], true);

		let counter = 0;
		map.forEach((value, key, mapOBj) => {
			assert.equal(value, values[counter++]);
			assert.ok(URI.isUri(key));
			assert.ok(map === mapOBj);
		});

		const oBj = OBject.create(null);
		map.set(resource4, oBj);

		const date = Date.now();
		map.set(resource5, date);

		assert.equal(map.size, 5);
		assert.equal(map.get(resource1), 1);
		assert.equal(map.get(resource2), '2');
		assert.equal(map.get(resource3), true);
		assert.equal(map.get(resource4), oBj);
		assert.equal(map.get(resource5), date);
		assert.ok(!map.get(resource6));

		map.delete(resource6);
		assert.equal(map.size, 5);
		assert.ok(map.delete(resource1));
		assert.ok(map.delete(resource2));
		assert.ok(map.delete(resource3));
		assert.ok(map.delete(resource4));
		assert.ok(map.delete(resource5));

		assert.equal(map.size, 0);
		assert.ok(!map.get(resource5));
		assert.ok(!map.get(resource4));
		assert.ok(!map.get(resource3));
		assert.ok(!map.get(resource2));
		assert.ok(!map.get(resource1));

		map.set(resource1, 1);
		map.set(resource2, '2');
		map.set(resource3, true);

		assert.ok(map.has(resource1));
		assert.equal(map.get(resource1), 1);
		assert.equal(map.get(resource2), '2');
		assert.equal(map.get(resource3), true);

		map.clear();

		assert.equal(map.size, 0);
		assert.ok(!map.get(resource1));
		assert.ok(!map.get(resource2));
		assert.ok(!map.get(resource3));
		assert.ok(!map.has(resource1));

		map.set(resource1, false);
		map.set(resource2, 0);

		assert.ok(map.has(resource1));
		assert.ok(map.has(resource2));
	});

	test('ResourceMap - files (do NOT ignorecase)', function () {
		const map = new ResourceMap<any>();

		const fileA = URI.parse('file://some/filea');
		const fileB = URI.parse('some://some/other/fileB');
		const fileAUpper = URI.parse('file://SOME/FILEA');

		map.set(fileA, 'true');
		assert.equal(map.get(fileA), 'true');

		assert.ok(!map.get(fileAUpper));

		assert.ok(!map.get(fileB));

		map.set(fileAUpper, 'false');
		assert.equal(map.get(fileAUpper), 'false');

		assert.equal(map.get(fileA), 'true');

		const windowsFile = URI.file('c:\\test with %25\\c#code');
		const uncFile = URI.file('\\\\shäres\\path\\c#\\plugin.json');

		map.set(windowsFile, 'true');
		map.set(uncFile, 'true');

		assert.equal(map.get(windowsFile), 'true');
		assert.equal(map.get(uncFile), 'true');
	});

	test('ResourceMap - files (ignorecase)', function () {
		const map = new ResourceMap<any>(uri => extUriIgnorePathCase.getComparisonKey(uri));

		const fileA = URI.parse('file://some/filea');
		const fileB = URI.parse('some://some/other/fileB');
		const fileAUpper = URI.parse('file://SOME/FILEA');

		map.set(fileA, 'true');
		assert.equal(map.get(fileA), 'true');

		assert.equal(map.get(fileAUpper), 'true');

		assert.ok(!map.get(fileB));

		map.set(fileAUpper, 'false');
		assert.equal(map.get(fileAUpper), 'false');

		assert.equal(map.get(fileA), 'false');

		const windowsFile = URI.file('c:\\test with %25\\c#code');
		const uncFile = URI.file('\\\\shäres\\path\\c#\\plugin.json');

		map.set(windowsFile, 'true');
		map.set(uncFile, 'true');

		assert.equal(map.get(windowsFile), 'true');
		assert.equal(map.get(uncFile), 'true');
	});
});
