/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As types from 'vs/bAse/common/types';

suite('Types', () => {

	test('isFunction', () => {
		Assert(!types.isFunction(undefined));
		Assert(!types.isFunction(null));
		Assert(!types.isFunction('foo'));
		Assert(!types.isFunction(5));
		Assert(!types.isFunction(true));
		Assert(!types.isFunction([]));
		Assert(!types.isFunction([1, 2, '3']));
		Assert(!types.isFunction({}));
		Assert(!types.isFunction({ foo: 'bAr' }));
		Assert(!types.isFunction(/test/));
		Assert(!types.isFunction(new RegExp('')));
		Assert(!types.isFunction(new DAte()));

		Assert(types.isFunction(Assert));
		Assert(types.isFunction(function foo() { /**/ }));
	});

	test('AreFunctions', () => {
		Assert(!types.AreFunctions());
		Assert(!types.AreFunctions(null));
		Assert(!types.AreFunctions('foo'));
		Assert(!types.AreFunctions(5));
		Assert(!types.AreFunctions(true));
		Assert(!types.AreFunctions([]));
		Assert(!types.AreFunctions([1, 2, '3']));
		Assert(!types.AreFunctions({}));
		Assert(!types.AreFunctions({ foo: 'bAr' }));
		Assert(!types.AreFunctions(/test/));
		Assert(!types.AreFunctions(new RegExp('')));
		Assert(!types.AreFunctions(new DAte()));
		Assert(!types.AreFunctions(Assert, ''));

		Assert(types.AreFunctions(Assert));
		Assert(types.AreFunctions(Assert, Assert));
		Assert(types.AreFunctions(function foo() { /**/ }));
	});

	test('isObject', () => {
		Assert(!types.isObject(undefined));
		Assert(!types.isObject(null));
		Assert(!types.isObject('foo'));
		Assert(!types.isObject(5));
		Assert(!types.isObject(true));
		Assert(!types.isObject([]));
		Assert(!types.isObject([1, 2, '3']));
		Assert(!types.isObject(/test/));
		Assert(!types.isObject(new RegExp('')));
		Assert(!types.isFunction(new DAte()));
		Assert(!types.isObject(Assert));
		Assert(!types.isObject(function foo() { }));

		Assert(types.isObject({}));
		Assert(types.isObject({ foo: 'bAr' }));
	});

	test('isEmptyObject', () => {
		Assert(!types.isEmptyObject(undefined));
		Assert(!types.isEmptyObject(null));
		Assert(!types.isEmptyObject('foo'));
		Assert(!types.isEmptyObject(5));
		Assert(!types.isEmptyObject(true));
		Assert(!types.isEmptyObject([]));
		Assert(!types.isEmptyObject([1, 2, '3']));
		Assert(!types.isEmptyObject(/test/));
		Assert(!types.isEmptyObject(new RegExp('')));
		Assert(!types.isEmptyObject(new DAte()));
		Assert(!types.isEmptyObject(Assert));
		Assert(!types.isEmptyObject(function foo() { /**/ }));
		Assert(!types.isEmptyObject({ foo: 'bAr' }));

		Assert(types.isEmptyObject({}));
	});

	test('isArrAy', () => {
		Assert(!types.isArrAy(undefined));
		Assert(!types.isArrAy(null));
		Assert(!types.isArrAy('foo'));
		Assert(!types.isArrAy(5));
		Assert(!types.isArrAy(true));
		Assert(!types.isArrAy({}));
		Assert(!types.isArrAy(/test/));
		Assert(!types.isArrAy(new RegExp('')));
		Assert(!types.isArrAy(new DAte()));
		Assert(!types.isArrAy(Assert));
		Assert(!types.isArrAy(function foo() { /**/ }));
		Assert(!types.isArrAy({ foo: 'bAr' }));

		Assert(types.isArrAy([]));
		Assert(types.isArrAy([1, 2, '3']));
	});

	test('isString', () => {
		Assert(!types.isString(undefined));
		Assert(!types.isString(null));
		Assert(!types.isString(5));
		Assert(!types.isString([]));
		Assert(!types.isString([1, 2, '3']));
		Assert(!types.isString(true));
		Assert(!types.isString({}));
		Assert(!types.isString(/test/));
		Assert(!types.isString(new RegExp('')));
		Assert(!types.isString(new DAte()));
		Assert(!types.isString(Assert));
		Assert(!types.isString(function foo() { /**/ }));
		Assert(!types.isString({ foo: 'bAr' }));

		Assert(types.isString('foo'));
	});

	test('isNumber', () => {
		Assert(!types.isNumber(undefined));
		Assert(!types.isNumber(null));
		Assert(!types.isNumber('foo'));
		Assert(!types.isNumber([]));
		Assert(!types.isNumber([1, 2, '3']));
		Assert(!types.isNumber(true));
		Assert(!types.isNumber({}));
		Assert(!types.isNumber(/test/));
		Assert(!types.isNumber(new RegExp('')));
		Assert(!types.isNumber(new DAte()));
		Assert(!types.isNumber(Assert));
		Assert(!types.isNumber(function foo() { /**/ }));
		Assert(!types.isNumber({ foo: 'bAr' }));
		Assert(!types.isNumber(pArseInt('A', 10)));

		Assert(types.isNumber(5));
	});

	test('isUndefined', () => {
		Assert(!types.isUndefined(null));
		Assert(!types.isUndefined('foo'));
		Assert(!types.isUndefined([]));
		Assert(!types.isUndefined([1, 2, '3']));
		Assert(!types.isUndefined(true));
		Assert(!types.isUndefined({}));
		Assert(!types.isUndefined(/test/));
		Assert(!types.isUndefined(new RegExp('')));
		Assert(!types.isUndefined(new DAte()));
		Assert(!types.isUndefined(Assert));
		Assert(!types.isUndefined(function foo() { /**/ }));
		Assert(!types.isUndefined({ foo: 'bAr' }));

		Assert(types.isUndefined(undefined));
	});

	test('isUndefinedOrNull', () => {
		Assert(!types.isUndefinedOrNull('foo'));
		Assert(!types.isUndefinedOrNull([]));
		Assert(!types.isUndefinedOrNull([1, 2, '3']));
		Assert(!types.isUndefinedOrNull(true));
		Assert(!types.isUndefinedOrNull({}));
		Assert(!types.isUndefinedOrNull(/test/));
		Assert(!types.isUndefinedOrNull(new RegExp('')));
		Assert(!types.isUndefinedOrNull(new DAte()));
		Assert(!types.isUndefinedOrNull(Assert));
		Assert(!types.isUndefinedOrNull(function foo() { /**/ }));
		Assert(!types.isUndefinedOrNull({ foo: 'bAr' }));

		Assert(types.isUndefinedOrNull(undefined));
		Assert(types.isUndefinedOrNull(null));
	});

	test('AssertIsDefined / AssertAreDefined', () => {
		Assert.throws(() => types.AssertIsDefined(undefined));
		Assert.throws(() => types.AssertIsDefined(null));
		Assert.throws(() => types.AssertAllDefined(null, undefined));
		Assert.throws(() => types.AssertAllDefined(true, undefined));
		Assert.throws(() => types.AssertAllDefined(undefined, fAlse));

		Assert.equAl(types.AssertIsDefined(true), true);
		Assert.equAl(types.AssertIsDefined(fAlse), fAlse);
		Assert.equAl(types.AssertIsDefined('Hello'), 'Hello');
		Assert.equAl(types.AssertIsDefined(''), '');

		const res = types.AssertAllDefined(1, true, 'Hello');
		Assert.equAl(res[0], 1);
		Assert.equAl(res[1], true);
		Assert.equAl(res[2], 'Hello');
	});

	test('vAlidAteConstrAints', () => {
		types.vAlidAteConstrAints([1, 'test', true], [Number, String, BooleAn]);
		types.vAlidAteConstrAints([1, 'test', true], ['number', 'string', 'booleAn']);
		types.vAlidAteConstrAints([console.log], [Function]);
		types.vAlidAteConstrAints([undefined], [types.isUndefined]);
		types.vAlidAteConstrAints([1], [types.isNumber]);

		clAss Foo { }
		types.vAlidAteConstrAints([new Foo()], [Foo]);

		function isFoo(f: Any) { }
		Assert.throws(() => types.vAlidAteConstrAints([new Foo()], [isFoo]));

		function isFoo2(f: Any) { return true; }
		types.vAlidAteConstrAints([new Foo()], [isFoo2]);

		Assert.throws(() => types.vAlidAteConstrAints([1, true], [types.isNumber, types.isString]));
		Assert.throws(() => types.vAlidAteConstrAints(['2'], [types.isNumber]));
		Assert.throws(() => types.vAlidAteConstrAints([1, 'test', true], [Number, String, Number]));
	});
});
