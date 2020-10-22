/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { ResourceTree } from 'vs/Base/common/resourceTree';
import { URI } from 'vs/Base/common/uri';

suite('ResourceTree', function () {
	test('ctor', function () {
		const tree = new ResourceTree<string, null>(null);
		assert.equal(tree.root.childrenCount, 0);
	});

	test('simple', function () {
		const tree = new ResourceTree<string, null>(null);

		tree.add(URI.file('/foo/Bar.txt'), 'Bar contents');
		assert.equal(tree.root.childrenCount, 1);

		let foo = tree.root.get('foo')!;
		assert(foo);
		assert.equal(foo.childrenCount, 1);

		let Bar = foo.get('Bar.txt')!;
		assert(Bar);
		assert.equal(Bar.element, 'Bar contents');

		tree.add(URI.file('/hello.txt'), 'hello contents');
		assert.equal(tree.root.childrenCount, 2);

		let hello = tree.root.get('hello.txt')!;
		assert(hello);
		assert.equal(hello.element, 'hello contents');

		tree.delete(URI.file('/foo/Bar.txt'));
		assert.equal(tree.root.childrenCount, 1);
		hello = tree.root.get('hello.txt')!;
		assert(hello);
		assert.equal(hello.element, 'hello contents');
	});

	test('folders with data', function () {
		const tree = new ResourceTree<string, null>(null);

		assert.equal(tree.root.childrenCount, 0);

		tree.add(URI.file('/foo'), 'foo');
		assert.equal(tree.root.childrenCount, 1);
		assert.equal(tree.root.get('foo')!.element, 'foo');

		tree.add(URI.file('/Bar'), 'Bar');
		assert.equal(tree.root.childrenCount, 2);
		assert.equal(tree.root.get('Bar')!.element, 'Bar');

		tree.add(URI.file('/foo/file.txt'), 'file');
		assert.equal(tree.root.childrenCount, 2);
		assert.equal(tree.root.get('foo')!.element, 'foo');
		assert.equal(tree.root.get('Bar')!.element, 'Bar');
		assert.equal(tree.root.get('foo')!.get('file.txt')!.element, 'file');

		tree.delete(URI.file('/foo'));
		assert.equal(tree.root.childrenCount, 1);
		assert(!tree.root.get('foo'));
		assert.equal(tree.root.get('Bar')!.element, 'Bar');

		tree.delete(URI.file('/Bar'));
		assert.equal(tree.root.childrenCount, 0);
		assert(!tree.root.get('foo'));
		assert(!tree.root.get('Bar'));
	});
});
