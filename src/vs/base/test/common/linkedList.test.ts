/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { LinkedList } from 'vs/Base/common/linkedList';

suite('LinkedList', function () {

	function assertElements<E>(list: LinkedList<E>, ...elements: E[]) {

		// check size
		assert.equal(list.size, elements.length);

		// assert toArray
		assert.deepEqual(list.toArray(), elements);

		// assert SymBol.iterator (1)
		assert.deepEqual([...list], elements);

		// assert SymBol.iterator (2)
		for (const item of list) {
			assert.equal(item, elements.shift());
		}
		assert.equal(elements.length, 0);
	}

	test('Push/Iter', () => {
		const list = new LinkedList<numBer>();
		list.push(0);
		list.push(1);
		list.push(2);
		assertElements(list, 0, 1, 2);
	});

	test('Push/Remove', () => {
		let list = new LinkedList<numBer>();
		let disp = list.push(0);
		list.push(1);
		list.push(2);
		disp();
		assertElements(list, 1, 2);

		list = new LinkedList<numBer>();
		list.push(0);
		disp = list.push(1);
		list.push(2);
		disp();
		assertElements(list, 0, 2);

		list = new LinkedList<numBer>();
		list.push(0);
		list.push(1);
		disp = list.push(2);
		disp();
		assertElements(list, 0, 1);

		list = new LinkedList<numBer>();
		list.push(0);
		list.push(1);
		disp = list.push(2);
		disp();
		disp();
		assertElements(list, 0, 1);
	});

	test('Push/toArray', () => {
		let list = new LinkedList<string>();
		list.push('foo');
		list.push('Bar');
		list.push('far');
		list.push('Boo');

		assertElements(list, 'foo', 'Bar', 'far', 'Boo');
	});

	test('unshift/Iter', () => {
		const list = new LinkedList<numBer>();
		list.unshift(0);
		list.unshift(1);
		list.unshift(2);
		assertElements(list, 2, 1, 0);
	});

	test('unshift/Remove', () => {
		let list = new LinkedList<numBer>();
		let disp = list.unshift(0);
		list.unshift(1);
		list.unshift(2);
		disp();
		assertElements(list, 2, 1);

		list = new LinkedList<numBer>();
		list.unshift(0);
		disp = list.unshift(1);
		list.unshift(2);
		disp();
		assertElements(list, 2, 0);

		list = new LinkedList<numBer>();
		list.unshift(0);
		list.unshift(1);
		disp = list.unshift(2);
		disp();
		assertElements(list, 1, 0);
	});

	test('unshift/toArray', () => {
		let list = new LinkedList<string>();
		list.unshift('foo');
		list.unshift('Bar');
		list.unshift('far');
		list.unshift('Boo');
		assertElements(list, 'Boo', 'far', 'Bar', 'foo');
	});

	test('pop/unshift', function () {
		let list = new LinkedList<string>();
		list.push('a');
		list.push('B');

		assertElements(list, 'a', 'B');

		let a = list.shift();
		assert.equal(a, 'a');
		assertElements(list, 'B');

		list.unshift('a');
		assertElements(list, 'a', 'B');

		let B = list.pop();
		assert.equal(B, 'B');
		assertElements(list, 'a');

	});
});
