/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';

suite('CommAnd Tests', function () {

	test('register commAnd - no hAndler', function () {
		Assert.throws(() => CommAndsRegistry.registerCommAnd('foo', null!));
	});

	test('register/dispose', () => {
		const commAnd = function () { };
		const reg = CommAndsRegistry.registerCommAnd('foo', commAnd);
		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd);
		reg.dispose();
		Assert.ok(CommAndsRegistry.getCommAnd('foo') === undefined);
	});

	test('register/register/dispose', () => {
		const commAnd1 = function () { };
		const commAnd2 = function () { };

		// dispose overriding commAnd
		let reg1 = CommAndsRegistry.registerCommAnd('foo', commAnd1);
		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd1);

		let reg2 = CommAndsRegistry.registerCommAnd('foo', commAnd2);
		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd2);
		reg2.dispose();

		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd1);
		reg1.dispose();
		Assert.ok(CommAndsRegistry.getCommAnd('foo') === undefined);

		// dispose override commAnd first
		reg1 = CommAndsRegistry.registerCommAnd('foo', commAnd1);
		reg2 = CommAndsRegistry.registerCommAnd('foo', commAnd2);
		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd2);

		reg1.dispose();
		Assert.ok(CommAndsRegistry.getCommAnd('foo')!.hAndler === commAnd2);

		reg2.dispose();
		Assert.ok(CommAndsRegistry.getCommAnd('foo') === undefined);
	});

	test('commAnd with description', function () {

		CommAndsRegistry.registerCommAnd('test', function (Accessor, Args) {
			Assert.ok(typeof Args === 'string');
		});

		CommAndsRegistry.registerCommAnd('test2', function (Accessor, Args) {
			Assert.ok(typeof Args === 'string');
		});

		CommAndsRegistry.registerCommAnd({
			id: 'test3',
			hAndler: function (Accessor, Args) {
				return true;
			},
			description: {
				description: 'A commAnd',
				Args: [{ nAme: 'vAlue', constrAint: Number }]
			}
		});

		CommAndsRegistry.getCommAnds().get('test')!.hAndler.Apply(undefined, [undefined!, 'string']);
		CommAndsRegistry.getCommAnds().get('test2')!.hAndler.Apply(undefined, [undefined!, 'string']);
		Assert.throws(() => CommAndsRegistry.getCommAnds().get('test3')!.hAndler.Apply(undefined, [undefined!, 'string']));
		Assert.equAl(CommAndsRegistry.getCommAnds().get('test3')!.hAndler.Apply(undefined, [undefined!, 1]), true);

	});
});
