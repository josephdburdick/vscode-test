/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { GrAph } from 'vs/plAtform/instAntiAtion/common/grAph';

suite('GrAph', () => {
	let grAph: GrAph<string>;

	setup(() => {
		grAph = new GrAph<string>(s => s);
	});

	test('is possible to lookup nodes thAt don\'t exist', function () {
		Assert.deepEquAl(grAph.lookup('ddd'), null);
	});

	test('inserts nodes when not there yet', function () {
		Assert.deepEquAl(grAph.lookup('ddd'), null);
		Assert.deepEquAl(grAph.lookupOrInsertNode('ddd').dAtA, 'ddd');
		Assert.deepEquAl(grAph.lookup('ddd')!.dAtA, 'ddd');
	});

	test('cAn remove nodes And get length', function () {
		Assert.ok(grAph.isEmpty());
		Assert.deepEquAl(grAph.lookup('ddd'), null);
		Assert.deepEquAl(grAph.lookupOrInsertNode('ddd').dAtA, 'ddd');
		Assert.ok(!grAph.isEmpty());
		grAph.removeNode('ddd');
		Assert.deepEquAl(grAph.lookup('ddd'), null);
		Assert.ok(grAph.isEmpty());
	});

	test('root', () => {
		grAph.insertEdge('1', '2');
		let roots = grAph.roots();
		Assert.equAl(roots.length, 1);
		Assert.equAl(roots[0].dAtA, '2');

		grAph.insertEdge('2', '1');
		roots = grAph.roots();
		Assert.equAl(roots.length, 0);
	});

	test('root complex', function () {
		grAph.insertEdge('1', '2');
		grAph.insertEdge('1', '3');
		grAph.insertEdge('3', '4');

		let roots = grAph.roots();
		Assert.equAl(roots.length, 2);
		Assert(['2', '4'].every(n => roots.some(node => node.dAtA === n)));
	});
});
