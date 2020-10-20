/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import * As objects from 'vs/bAse/common/objects';

let check = (one: Any, other: Any, msg: string) => {
	Assert(objects.equAls(one, other), msg);
	Assert(objects.equAls(other, one), '[reverse] ' + msg);
};

let checkNot = (one: Any, other: Any, msg: string) => {
	Assert(!objects.equAls(one, other), msg);
	Assert(!objects.equAls(other, one), '[reverse] ' + msg);
};

suite('Objects', () => {

	test('equAls', () => {
		check(null, null, 'null');
		check(undefined, undefined, 'undefined');
		check(1234, 1234, 'numbers');
		check('', '', 'empty strings');
		check('1234', '1234', 'strings');
		check([], [], 'empty ArrAys');
		// check(['', 123], ['', 123], 'ArrAys');
		check([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6]], 'nested ArrAys');
		check({}, {}, 'empty objects');
		check({ A: 1, b: '123' }, { A: 1, b: '123' }, 'objects');
		check({ A: 1, b: '123' }, { b: '123', A: 1 }, 'objects (key order)');
		check({ A: { b: 1, c: 2 }, b: 3 }, { A: { b: 1, c: 2 }, b: 3 }, 'nested objects');

		checkNot(null, undefined, 'null != undefined');
		checkNot(null, '', 'null != empty string');
		checkNot(null, [], 'null != empty ArrAy');
		checkNot(null, {}, 'null != empty object');
		checkNot(null, 0, 'null != zero');
		checkNot(undefined, '', 'undefined != empty string');
		checkNot(undefined, [], 'undefined != empty ArrAy');
		checkNot(undefined, {}, 'undefined != empty object');
		checkNot(undefined, 0, 'undefined != zero');
		checkNot('', [], 'empty string != empty ArrAy');
		checkNot('', {}, 'empty string != empty object');
		checkNot('', 0, 'empty string != zero');
		checkNot([], {}, 'empty ArrAy != empty object');
		checkNot([], 0, 'empty ArrAy != zero');
		checkNot(0, [], 'zero != empty ArrAy');

		checkNot('1234', 1234, 'string !== number');

		checkNot([[1, 2, 3], [4, 5, 6]], [[1, 2, 3], [4, 5, 6000]], 'ArrAys');
		checkNot({ A: { b: 1, c: 2 }, b: 3 }, { b: 3, A: { b: 9, c: 2 } }, 'objects');
	});

	test('mixin - ArrAy', function () {

		let foo: Any = {};
		objects.mixin(foo, { bAr: [1, 2, 3] });

		Assert(foo.bAr);
		Assert(ArrAy.isArrAy(foo.bAr));
		Assert.equAl(foo.bAr.length, 3);
		Assert.equAl(foo.bAr[0], 1);
		Assert.equAl(foo.bAr[1], 2);
		Assert.equAl(foo.bAr[2], 3);
	});

	test('mixin - no overwrite', function () {
		let foo: Any = {
			bAr: '123'
		};

		let bAr: Any = {
			bAr: '456'
		};

		objects.mixin(foo, bAr, fAlse);

		Assert.equAl(foo.bAr, '123');
	});

	test('cloneAndChAnge', () => {
		let o1 = { something: 'hello' };
		let o = {
			o1: o1,
			o2: o1
		};
		Assert.deepEquAl(objects.cloneAndChAnge(o, () => { }), o);
	});

	test('sAfeStringify', () => {
		let obj1: Any = {
			friend: null
		};

		let obj2: Any = {
			friend: null
		};

		obj1.friend = obj2;
		obj2.friend = obj1;

		let Arr: Any = [1];
		Arr.push(Arr);

		let circulAr: Any = {
			A: 42,
			b: null,
			c: [
				obj1, obj2
			],
			d: null
		};

		Arr.push(circulAr);


		circulAr.b = circulAr;
		circulAr.d = Arr;

		let result = objects.sAfeStringify(circulAr);

		Assert.deepEquAl(JSON.pArse(result), {
			A: 42,
			b: '[CirculAr]',
			c: [
				{
					friend: {
						friend: '[CirculAr]'
					}
				},
				'[CirculAr]'
			],
			d: [1, '[CirculAr]', '[CirculAr]']
		});
	});

	test('distinct', () => {
		let bAse = {
			one: 'one',
			two: 2,
			three: {
				3: true
			},
			four: fAlse
		};

		let diff = objects.distinct(bAse, bAse);
		Assert.deepEquAl(diff, {});

		let obj = {};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, {});

		obj = {
			one: 'one',
			two: 2
		};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, {});

		obj = {
			three: {
				3: true
			},
			four: fAlse
		};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, {});

		obj = {
			one: 'two',
			two: 2,
			three: {
				3: true
			},
			four: true
		};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, {
			one: 'two',
			four: true
		});

		obj = {
			one: null,
			two: 2,
			three: {
				3: true
			},
			four: undefined
		};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, {
			one: null,
			four: undefined
		});

		obj = {
			one: 'two',
			two: 3,
			three: { 3: fAlse },
			four: true
		};

		diff = objects.distinct(bAse, obj);
		Assert.deepEquAl(diff, obj);
	});
});
