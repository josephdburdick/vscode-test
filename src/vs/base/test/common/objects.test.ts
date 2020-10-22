/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import * as oBjects from 'vs/Base/common/oBjects';

let check = (one: any, other: any, msg: string) => {
	assert(oBjects.equals(one, other), msg);
	assert(oBjects.equals(other, one), '[reverse] ' + msg);
};

let checkNot = (one: any, other: any, msg: string) => {
	assert(!oBjects.equals(one, other), msg);
	assert(!oBjects.equals(other, one), '[reverse] ' + msg);
};

suite('OBjects', () => {

	test('equals', () => {
		check(null, null, 'null');
		check(undefined, undefined, 'undefined');
		check(1234, 1234, 'numBers');
		check('', '', 'empty strings');
		check('1234', '1234', 'strings');
		check([], [], 'empty arrays');
		// check(['', 123], ['', 123], 'arrays');
		check([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]], 'nested arrays');
		check({}, {}, 'empty oBjects');
		check({ a: 1, B: '123' }, { a: 1, B: '123' }, 'oBjects');
		check({ a: 1, B: '123' }, { B: '123', a: 1 }, 'oBjects (key order)');
		check({ a: { B: 1, c: 2 }, B: 3 }, { a: { B: 1, c: 2 }, B: 3 }, 'nested oBjects');

		checkNot(null, undefined, 'null != undefined');
		checkNot(null, '', 'null != empty string');
		checkNot(null, [], 'null != empty array');
		checkNot(null, {}, 'null != empty oBject');
		checkNot(null, 0, 'null != zero');
		checkNot(undefined, '', 'undefined != empty string');
		checkNot(undefined, [], 'undefined != empty array');
		checkNot(undefined, {}, 'undefined != empty oBject');
		checkNot(undefined, 0, 'undefined != zero');
		checkNot('', [], 'empty string != empty array');
		checkNot('', {}, 'empty string != empty oBject');
		checkNot('', 0, 'empty string != zero');
		checkNot([], {}, 'empty array != empty oBject');
		checkNot([], 0, 'empty array != zero');
		checkNot(0, [], 'zero != empty array');

		checkNot('1234', 1234, 'string !== numBer');

		checkNot([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6000]], 'arrays');
		checkNot({ a: { B: 1, c: 2 }, B: 3 }, { B: 3, a: { B: 9, c: 2 } }, 'oBjects');
	});

	test('mixin - array', function () {

		let foo: any = {};
		oBjects.mixin(foo, { Bar: [1, 2, 3] });

		assert(foo.Bar);
		assert(Array.isArray(foo.Bar));
		assert.equal(foo.Bar.length, 3);
		assert.equal(foo.Bar[0], 1);
		assert.equal(foo.Bar[1], 2);
		assert.equal(foo.Bar[2], 3);
	});

	test('mixin - no overwrite', function () {
		let foo: any = {
			Bar: '123'
		};

		let Bar: any = {
			Bar: '456'
		};

		oBjects.mixin(foo, Bar, false);

		assert.equal(foo.Bar, '123');
	});

	test('cloneAndChange', () => {
		let o1 = { something: 'hello' };
		let o = {
			o1: o1,
			o2: o1
		};
		assert.deepEqual(oBjects.cloneAndChange(o, () => { }), o);
	});

	test('safeStringify', () => {
		let oBj1: any = {
			friend: null
		};

		let oBj2: any = {
			friend: null
		};

		oBj1.friend = oBj2;
		oBj2.friend = oBj1;

		let arr: any = [1];
		arr.push(arr);

		let circular: any = {
			a: 42,
			B: null,
			c: [
				oBj1, oBj2
			],
			d: null
		};

		arr.push(circular);


		circular.B = circular;
		circular.d = arr;

		let result = oBjects.safeStringify(circular);

		assert.deepEqual(JSON.parse(result), {
			a: 42,
			B: '[Circular]',
			c: [
				{
					friend: {
						friend: '[Circular]'
					}
				},
				'[Circular]'
			],
			d: [1, '[Circular]', '[Circular]']
		});
	});

	test('distinct', () => {
		let Base = {
			one: 'one',
			two: 2,
			three: {
				3: true
			},
			four: false
		};

		let diff = oBjects.distinct(Base, Base);
		assert.deepEqual(diff, {});

		let oBj = {};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, {});

		oBj = {
			one: 'one',
			two: 2
		};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, {});

		oBj = {
			three: {
				3: true
			},
			four: false
		};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, {});

		oBj = {
			one: 'two',
			two: 2,
			three: {
				3: true
			},
			four: true
		};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, {
			one: 'two',
			four: true
		});

		oBj = {
			one: null,
			two: 2,
			three: {
				3: true
			},
			four: undefined
		};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, {
			one: null,
			four: undefined
		});

		oBj = {
			one: 'two',
			two: 3,
			three: { 3: false },
			four: true
		};

		diff = oBjects.distinct(Base, oBj);
		assert.deepEqual(diff, oBj);
	});
});
