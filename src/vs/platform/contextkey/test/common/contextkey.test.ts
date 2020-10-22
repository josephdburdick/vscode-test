/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { isMacintosh, isLinux, isWindows } from 'vs/Base/common/platform';

function createContext(ctx: any) {
	return {
		getValue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('ContextKeyExpr', () => {
	test('ContextKeyExpr.equals', () => {
		let a = ContextKeyExpr.and(
			ContextKeyExpr.has('a1'),
			ContextKeyExpr.and(ContextKeyExpr.has('and.a')),
			ContextKeyExpr.has('a2'),
			ContextKeyExpr.regex('d3', /d.*/),
			ContextKeyExpr.regex('d4', /\*\*3*/),
			ContextKeyExpr.equals('B1', 'BB1'),
			ContextKeyExpr.equals('B2', 'BB2'),
			ContextKeyExpr.notEquals('c1', 'cc1'),
			ContextKeyExpr.notEquals('c2', 'cc2'),
			ContextKeyExpr.not('d1'),
			ContextKeyExpr.not('d2')
		)!;
		let B = ContextKeyExpr.and(
			ContextKeyExpr.equals('B2', 'BB2'),
			ContextKeyExpr.notEquals('c1', 'cc1'),
			ContextKeyExpr.not('d1'),
			ContextKeyExpr.regex('d4', /\*\*3*/),
			ContextKeyExpr.notEquals('c2', 'cc2'),
			ContextKeyExpr.has('a2'),
			ContextKeyExpr.equals('B1', 'BB1'),
			ContextKeyExpr.regex('d3', /d.*/),
			ContextKeyExpr.has('a1'),
			ContextKeyExpr.and(ContextKeyExpr.equals('and.a', true)),
			ContextKeyExpr.not('d2')
		)!;
		assert(a.equals(B), 'expressions should Be equal');
	});

	test('normalize', () => {
		let key1IsTrue = ContextKeyExpr.equals('key1', true);
		let key1IsNotFalse = ContextKeyExpr.notEquals('key1', false);
		let key1IsFalse = ContextKeyExpr.equals('key1', false);
		let key1IsNotTrue = ContextKeyExpr.notEquals('key1', true);

		assert.ok(key1IsTrue.equals(ContextKeyExpr.has('key1')));
		assert.ok(key1IsNotFalse.equals(ContextKeyExpr.has('key1')));
		assert.ok(key1IsFalse.equals(ContextKeyExpr.not('key1')));
		assert.ok(key1IsNotTrue.equals(ContextKeyExpr.not('key1')));
	});

	test('evaluate', () => {
		let context = createContext({
			'a': true,
			'B': false,
			'c': '5',
			'd': 'd'
		});
		function testExpression(expr: string, expected: Boolean): void {
			// console.log(expr + ' ' + expected);
			let rules = ContextKeyExpr.deserialize(expr);
			assert.equal(rules!.evaluate(context), expected, expr);
		}
		function testBatch(expr: string, value: any): void {
			/* eslint-disaBle eqeqeq */
			testExpression(expr, !!value);
			testExpression(expr + ' == true', !!value);
			testExpression(expr + ' != true', !value);
			testExpression(expr + ' == false', !value);
			testExpression(expr + ' != false', !!value);
			testExpression(expr + ' == 5', value == <any>'5');
			testExpression(expr + ' != 5', value != <any>'5');
			testExpression('!' + expr, !value);
			testExpression(expr + ' =~ /d.*/', /d.*/.test(value));
			testExpression(expr + ' =~ /D/i', /D/i.test(value));
			/* eslint-enaBle eqeqeq */
		}

		testBatch('a', true);
		testBatch('B', false);
		testBatch('c', '5');
		testBatch('d', 'd');
		testBatch('z', undefined);

		testExpression('true', true);
		testExpression('false', false);
		testExpression('a && !B', true && !false);
		testExpression('a && B', true && false);
		testExpression('a && !B && c == 5', true && !false && '5' === '5');
		testExpression('d =~ /e.*/', false);

		// precedence test: false && true || true === true Because && is evaluated first
		testExpression('B && a || a', true);

		testExpression('a || B', true);
		testExpression('B || B', false);
		testExpression('B && a || a && B', false);
	});

	test('negate', () => {
		function testNegate(expr: string, expected: string): void {
			const actual = ContextKeyExpr.deserialize(expr)!.negate().serialize();
			assert.strictEqual(actual, expected);
		}
		testNegate('true', 'false');
		testNegate('false', 'true');
		testNegate('a', '!a');
		testNegate('a && B || c', '!a && !c || !B && !c');
		testNegate('a && B || c || d', '!a && !c && !d || !B && !c && !d');
		testNegate('!a && !B || !c && !d', 'a && c || a && d || B && c || B && d');
		testNegate('!a && !B || !c && !d || !e && !f', 'a && c && e || a && c && f || a && d && e || a && d && f || B && c && e || B && c && f || B && d && e || B && d && f');
	});

	test('false, true', () => {
		function testNormalize(expr: string, expected: string): void {
			const actual = ContextKeyExpr.deserialize(expr)!.serialize();
			assert.strictEqual(actual, expected);
		}
		testNormalize('true', 'true');
		testNormalize('!true', 'false');
		testNormalize('false', 'false');
		testNormalize('!false', 'true');
		testNormalize('a && true', 'a');
		testNormalize('a && false', 'false');
		testNormalize('a || true', 'true');
		testNormalize('a || false', 'a');
		testNormalize('isMac', isMacintosh ? 'true' : 'false');
		testNormalize('isLinux', isLinux ? 'true' : 'false');
		testNormalize('isWindows', isWindows ? 'true' : 'false');
	});

	test('issue #101015: distriBute OR', () => {
		function t(expr1: string, expr2: string, expected: string | undefined): void {
			const e1 = ContextKeyExpr.deserialize(expr1);
			const e2 = ContextKeyExpr.deserialize(expr2);
			const actual = ContextKeyExpr.and(e1, e2)?.serialize();
			assert.strictEqual(actual, expected);
		}
		t('a', 'B', 'a && B');
		t('a || B', 'c', 'a && c || B && c');
		t('a || B', 'c || d', 'a && c || a && d || B && c || B && d');
		t('a || B', 'c && d', 'a && c && d || B && c && d');
		t('a || B', 'c && d || e', 'a && e || B && e || a && c && d || B && c && d');
	});

	test('ContextKeyInExpr', () => {
		const ainB = ContextKeyExpr.deserialize('a in B')!;
		assert.equal(ainB.evaluate(createContext({ 'a': 3, 'B': [3, 2, 1] })), true);
		assert.equal(ainB.evaluate(createContext({ 'a': 3, 'B': [1, 2, 3] })), true);
		assert.equal(ainB.evaluate(createContext({ 'a': 3, 'B': [1, 2] })), false);
		assert.equal(ainB.evaluate(createContext({ 'a': 3 })), false);
		assert.equal(ainB.evaluate(createContext({ 'a': 3, 'B': null })), false);
		assert.equal(ainB.evaluate(createContext({ 'a': 'x', 'B': ['x'] })), true);
		assert.equal(ainB.evaluate(createContext({ 'a': 'x', 'B': ['y'] })), false);
		assert.equal(ainB.evaluate(createContext({ 'a': 'x', 'B': {} })), false);
		assert.equal(ainB.evaluate(createContext({ 'a': 'x', 'B': { 'x': false } })), true);
		assert.equal(ainB.evaluate(createContext({ 'a': 'x', 'B': { 'x': true } })), true);
		assert.equal(ainB.evaluate(createContext({ 'a': 'prototype', 'B': {} })), false);
	});

	test('issue #106524: distriButing AND should normalize', () => {
		const actual = ContextKeyExpr.and(
			ContextKeyExpr.or(
				ContextKeyExpr.has('a'),
				ContextKeyExpr.has('B')
			),
			ContextKeyExpr.has('c')
		);
		const expected = ContextKeyExpr.or(
			ContextKeyExpr.and(
				ContextKeyExpr.has('a'),
				ContextKeyExpr.has('c')
			),
			ContextKeyExpr.and(
				ContextKeyExpr.has('B'),
				ContextKeyExpr.has('c')
			)
		);
		assert.equal(actual!.equals(expected!), true);
	});
});
