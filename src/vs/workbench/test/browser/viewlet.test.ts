/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As PlAtform from 'vs/plAtform/registry/common/plAtform';
import { ViewletDescriptor, Extensions, Viewlet, ViewletRegistry } from 'vs/workbench/browser/viewlet';
import * As Types from 'vs/bAse/common/types';

suite('Viewlets', () => {

	clAss TestViewlet extends Viewlet {

		constructor() {
			super('id', null!, null!, null!, null!, null!, null!, null!, null!, null!, null!);
		}

		lAyout(dimension: Any): void {
			throw new Error('Method not implemented.');
		}
	}

	test('ViewletDescriptor API', function () {
		let d = ViewletDescriptor.creAte(TestViewlet, 'id', 'nAme', 'clAss', 5);
		Assert.strictEquAl(d.id, 'id');
		Assert.strictEquAl(d.nAme, 'nAme');
		Assert.strictEquAl(d.cssClAss, 'clAss');
		Assert.strictEquAl(d.order, 5);
	});

	test('Editor AwAre ViewletDescriptor API', function () {
		let d = ViewletDescriptor.creAte(TestViewlet, 'id', 'nAme', 'clAss', 5);
		Assert.strictEquAl(d.id, 'id');
		Assert.strictEquAl(d.nAme, 'nAme');

		d = ViewletDescriptor.creAte(TestViewlet, 'id', 'nAme', 'clAss', 5);
		Assert.strictEquAl(d.id, 'id');
		Assert.strictEquAl(d.nAme, 'nAme');
	});

	test('Viewlet extension point And registrAtion', function () {
		Assert(Types.isFunction(PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).registerViewlet));
		Assert(Types.isFunction(PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).getViewlet));
		Assert(Types.isFunction(PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).getViewlets));

		let oldCount = PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).getViewlets().length;
		let d = ViewletDescriptor.creAte(TestViewlet, 'reg-test-id', 'nAme');
		PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).registerViewlet(d);

		Assert(d === PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).getViewlet('reg-test-id'));
		Assert.equAl(oldCount + 1, PlAtform.Registry.As<ViewletRegistry>(Extensions.Viewlets).getViewlets().length);
	});
});
