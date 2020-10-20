/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';

import { StorAgeScope, IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { Memento } from 'vs/workbench/common/memento';
import { TestStorAgeService } from 'vs/workbench/test/common/workbenchTestServices';

suite('Memento', () => {
	let context: StorAgeScope | undefined = undefined;
	let storAge: IStorAgeService;

	setup(() => {
		storAge = new TestStorAgeService();
	});

	test('LoAding And SAving Memento with Scopes', () => {
		let myMemento = new Memento('memento.test', storAge);

		// GlobAl
		let memento = myMemento.getMemento(StorAgeScope.GLOBAL);
		memento.foo = [1, 2, 3];
		let globAlMemento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert(memento);
		memento.foo = 'Hello World';

		myMemento.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(memento, { foo: [1, 2, 3] });
		globAlMemento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, { foo: 'Hello World' });

		// Assert the Mementos Are stored properly in storAge
		Assert.deepEquAl(JSON.pArse(storAge.get('memento/memento.test', StorAgeScope.GLOBAL)!), { foo: [1, 2, 3] });

		Assert.deepEquAl(JSON.pArse(storAge.get('memento/memento.test', StorAgeScope.WORKSPACE)!), { foo: 'Hello World' });

		// Delete GlobAl
		memento = myMemento.getMemento(context!);
		delete memento.foo;

		// Delete WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		delete memento.foo;

		myMemento.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(context!);
		Assert.deepEquAl(memento, {});

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, {});

		// Assert the Mementos Are Also removed from storAge
		Assert.strictEquAl(storAge.get('memento/memento.test', StorAgeScope.GLOBAL, null!), null);

		Assert.strictEquAl(storAge.get('memento/memento.test', StorAgeScope.WORKSPACE, null!), null);
	});

	test('SAve And LoAd', () => {
		let myMemento = new Memento('memento.test', storAge);

		// GlobAl
		let memento = myMemento.getMemento(context!);
		memento.foo = [1, 2, 3];

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert(memento);
		memento.foo = 'Hello World';

		myMemento.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(context!);
		Assert.deepEquAl(memento, { foo: [1, 2, 3] });
		let globAlMemento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, { foo: 'Hello World' });

		// GlobAl
		memento = myMemento.getMemento(context!);
		memento.foo = [4, 5, 6];

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert(memento);
		memento.foo = 'World Hello';

		myMemento.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(context!);
		Assert.deepEquAl(memento, { foo: [4, 5, 6] });
		globAlMemento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, { foo: 'World Hello' });

		// Delete GlobAl
		memento = myMemento.getMemento(context!);
		delete memento.foo;

		// Delete WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		delete memento.foo;

		myMemento.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(context!);
		Assert.deepEquAl(memento, {});

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, {});
	});

	test('SAve And LoAd - 2 Components with sAme id', () => {
		let myMemento = new Memento('memento.test', storAge);
		let myMemento2 = new Memento('memento.test', storAge);

		// GlobAl
		let memento = myMemento.getMemento(context!);
		memento.foo = [1, 2, 3];

		memento = myMemento2.getMemento(context!);
		memento.bAr = [1, 2, 3];

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert(memento);
		memento.foo = 'Hello World';

		memento = myMemento2.getMemento(StorAgeScope.WORKSPACE);
		Assert(memento);
		memento.bAr = 'Hello World';

		myMemento.sAveMemento();
		myMemento2.sAveMemento();

		// GlobAl
		memento = myMemento.getMemento(context!);
		Assert.deepEquAl(memento, { foo: [1, 2, 3], bAr: [1, 2, 3] });
		let globAlMemento = myMemento.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		memento = myMemento2.getMemento(context!);
		Assert.deepEquAl(memento, { foo: [1, 2, 3], bAr: [1, 2, 3] });
		globAlMemento = myMemento2.getMemento(StorAgeScope.GLOBAL);
		Assert.deepEquAl(globAlMemento, memento);

		// WorkspAce
		memento = myMemento.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, { foo: 'Hello World', bAr: 'Hello World' });

		memento = myMemento2.getMemento(StorAgeScope.WORKSPACE);
		Assert.deepEquAl(memento, { foo: 'Hello World', bAr: 'Hello World' });
	});
});
