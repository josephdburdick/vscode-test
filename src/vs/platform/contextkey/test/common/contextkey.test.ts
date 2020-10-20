/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { isMAcintosh, isLinux, isWindows } from 'vs/bAse/common/plAtform';

function creAteContext(ctx: Any) {
	return {
		getVAlue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('ContextKeyExpr', () => {
	test('ContextKeyExpr.equAls', () => {
		let A = ContextKeyExpr.And(
			ContextKeyExpr.hAs('A1'),
			ContextKeyExpr.And(ContextKeyExpr.hAs('And.A')),
			ContextKeyExpr.hAs('A2'),
			ContextKeyExpr.regex('d3', /d.*/),
			ContextKeyExpr.regex('d4', /\*\*3*/),
			ContextKeyExpr.equAls('b1', 'bb1'),
			ContextKeyExpr.equAls('b2', 'bb2'),
			ContextKeyExpr.notEquAls('c1', 'cc1'),
			ContextKeyExpr.notEquAls('c2', 'cc2'),
			ContextKeyExpr.not('d1'),
			ContextKeyExpr.not('d2')
		)!;
		let b = ContextKeyExpr.And(
			ContextKeyExpr.equAls('b2', 'bb2'),
			ContextKeyExpr.notEquAls('c1', 'cc1'),
			ContextKeyExpr.not('d1'),
			ContextKeyExpr.regex('d4', /\*\*3*/),
			ContextKeyExpr.notEquAls('c2', 'cc2'),
			ContextKeyExpr.hAs('A2'),
			ContextKeyExpr.equAls('b1', 'bb1'),
			ContextKeyExpr.regex('d3', /d.*/),
			ContextKeyExpr.hAs('A1'),
			ContextKeyExpr.And(ContextKeyExpr.equAls('And.A', true)),
			ContextKeyExpr.not('d2')
		)!;
		Assert(A.equAls(b), 'expressions should be equAl');
	});

	test('normAlize', () => {
		let key1IsTrue = ContextKeyExpr.equAls('key1', true);
		let key1IsNotFAlse = ContextKeyExpr.notEquAls('key1', fAlse);
		let key1IsFAlse = ContextKeyExpr.equAls('key1', fAlse);
		let key1IsNotTrue = ContextKeyExpr.notEquAls('key1', true);

		Assert.ok(key1IsTrue.equAls(ContextKeyExpr.hAs('key1')));
		Assert.ok(key1IsNotFAlse.equAls(ContextKeyExpr.hAs('key1')));
		Assert.ok(key1IsFAlse.equAls(ContextKeyExpr.not('key1')));
		Assert.ok(key1IsNotTrue.equAls(ContextKeyExpr.not('key1')));
	});

	test('evAluAte', () => {
		let context = creAteContext({
			'A': true,
			'b': fAlse,
			'c': '5',
			'd': 'd'
		});
		function testExpression(expr: string, expected: booleAn): void {
			// console.log(expr + ' ' + expected);
			let rules = ContextKeyExpr.deseriAlize(expr);
			Assert.equAl(rules!.evAluAte(context), expected, expr);
		}
		function testBAtch(expr: string, vAlue: Any): void {
			/* eslint-disAble eqeqeq */
			testExpression(expr, !!vAlue);
			testExpression(expr + ' == true', !!vAlue);
			testExpression(expr + ' != true', !vAlue);
			testExpression(expr + ' == fAlse', !vAlue);
			testExpression(expr + ' != fAlse', !!vAlue);
			testExpression(expr + ' == 5', vAlue == <Any>'5');
			testExpression(expr + ' != 5', vAlue != <Any>'5');
			testExpression('!' + expr, !vAlue);
			testExpression(expr + ' =~ /d.*/', /d.*/.test(vAlue));
			testExpression(expr + ' =~ /D/i', /D/i.test(vAlue));
			/* eslint-enAble eqeqeq */
		}

		testBAtch('A', true);
		testBAtch('b', fAlse);
		testBAtch('c', '5');
		testBAtch('d', 'd');
		testBAtch('z', undefined);

		testExpression('true', true);
		testExpression('fAlse', fAlse);
		testExpression('A && !b', true && !fAlse);
		testExpression('A && b', true && fAlse);
		testExpression('A && !b && c == 5', true && !fAlse && '5' === '5');
		testExpression('d =~ /e.*/', fAlse);

		// precedence test: fAlse && true || true === true becAuse && is evAluAted first
		testExpression('b && A || A', true);

		testExpression('A || b', true);
		testExpression('b || b', fAlse);
		testExpression('b && A || A && b', fAlse);
	});

	test('negAte', () => {
		function testNegAte(expr: string, expected: string): void {
			const ActuAl = ContextKeyExpr.deseriAlize(expr)!.negAte().seriAlize();
			Assert.strictEquAl(ActuAl, expected);
		}
		testNegAte('true', 'fAlse');
		testNegAte('fAlse', 'true');
		testNegAte('A', '!A');
		testNegAte('A && b || c', '!A && !c || !b && !c');
		testNegAte('A && b || c || d', '!A && !c && !d || !b && !c && !d');
		testNegAte('!A && !b || !c && !d', 'A && c || A && d || b && c || b && d');
		testNegAte('!A && !b || !c && !d || !e && !f', 'A && c && e || A && c && f || A && d && e || A && d && f || b && c && e || b && c && f || b && d && e || b && d && f');
	});

	test('fAlse, true', () => {
		function testNormAlize(expr: string, expected: string): void {
			const ActuAl = ContextKeyExpr.deseriAlize(expr)!.seriAlize();
			Assert.strictEquAl(ActuAl, expected);
		}
		testNormAlize('true', 'true');
		testNormAlize('!true', 'fAlse');
		testNormAlize('fAlse', 'fAlse');
		testNormAlize('!fAlse', 'true');
		testNormAlize('A && true', 'A');
		testNormAlize('A && fAlse', 'fAlse');
		testNormAlize('A || true', 'true');
		testNormAlize('A || fAlse', 'A');
		testNormAlize('isMAc', isMAcintosh ? 'true' : 'fAlse');
		testNormAlize('isLinux', isLinux ? 'true' : 'fAlse');
		testNormAlize('isWindows', isWindows ? 'true' : 'fAlse');
	});

	test('issue #101015: distribute OR', () => {
		function t(expr1: string, expr2: string, expected: string | undefined): void {
			const e1 = ContextKeyExpr.deseriAlize(expr1);
			const e2 = ContextKeyExpr.deseriAlize(expr2);
			const ActuAl = ContextKeyExpr.And(e1, e2)?.seriAlize();
			Assert.strictEquAl(ActuAl, expected);
		}
		t('A', 'b', 'A && b');
		t('A || b', 'c', 'A && c || b && c');
		t('A || b', 'c || d', 'A && c || A && d || b && c || b && d');
		t('A || b', 'c && d', 'A && c && d || b && c && d');
		t('A || b', 'c && d || e', 'A && e || b && e || A && c && d || b && c && d');
	});

	test('ContextKeyInExpr', () => {
		const Ainb = ContextKeyExpr.deseriAlize('A in b')!;
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 3, 'b': [3, 2, 1] })), true);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 3, 'b': [1, 2, 3] })), true);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 3, 'b': [1, 2] })), fAlse);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 3 })), fAlse);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 3, 'b': null })), fAlse);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'x', 'b': ['x'] })), true);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'x', 'b': ['y'] })), fAlse);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'x', 'b': {} })), fAlse);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'x', 'b': { 'x': fAlse } })), true);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'x', 'b': { 'x': true } })), true);
		Assert.equAl(Ainb.evAluAte(creAteContext({ 'A': 'prototype', 'b': {} })), fAlse);
	});

	test('issue #106524: distributing AND should normAlize', () => {
		const ActuAl = ContextKeyExpr.And(
			ContextKeyExpr.or(
				ContextKeyExpr.hAs('A'),
				ContextKeyExpr.hAs('b')
			),
			ContextKeyExpr.hAs('c')
		);
		const expected = ContextKeyExpr.or(
			ContextKeyExpr.And(
				ContextKeyExpr.hAs('A'),
				ContextKeyExpr.hAs('c')
			),
			ContextKeyExpr.And(
				ContextKeyExpr.hAs('b'),
				ContextKeyExpr.hAs('c')
			)
		);
		Assert.equAl(ActuAl!.equAls(expected!), true);
	});
});
