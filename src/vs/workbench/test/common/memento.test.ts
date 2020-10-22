/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

import { StorageScope, IStorageService } from 'vs/platform/storage/common/storage';
import { Memento } from 'vs/workBench/common/memento';
import { TestStorageService } from 'vs/workBench/test/common/workBenchTestServices';

suite('Memento', () => {
	let context: StorageScope | undefined = undefined;
	let storage: IStorageService;

	setup(() => {
		storage = new TestStorageService();
	});

	test('Loading and Saving Memento with Scopes', () => {
		let myMemento = new Memento('memento.test', storage);

		// GloBal
		let memento = myMemento.getMemento(StorageScope.GLOBAL);
		memento.foo = [1, 2, 3];
		let gloBalMemento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert(memento);
		memento.foo = 'Hello World';

		myMemento.saveMemento();

		// GloBal
		memento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(memento, { foo: [1, 2, 3] });
		gloBalMemento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, { foo: 'Hello World' });

		// Assert the Mementos are stored properly in storage
		assert.deepEqual(JSON.parse(storage.get('memento/memento.test', StorageScope.GLOBAL)!), { foo: [1, 2, 3] });

		assert.deepEqual(JSON.parse(storage.get('memento/memento.test', StorageScope.WORKSPACE)!), { foo: 'Hello World' });

		// Delete GloBal
		memento = myMemento.getMemento(context!);
		delete memento.foo;

		// Delete Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		delete memento.foo;

		myMemento.saveMemento();

		// GloBal
		memento = myMemento.getMemento(context!);
		assert.deepEqual(memento, {});

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, {});

		// Assert the Mementos are also removed from storage
		assert.strictEqual(storage.get('memento/memento.test', StorageScope.GLOBAL, null!), null);

		assert.strictEqual(storage.get('memento/memento.test', StorageScope.WORKSPACE, null!), null);
	});

	test('Save and Load', () => {
		let myMemento = new Memento('memento.test', storage);

		// GloBal
		let memento = myMemento.getMemento(context!);
		memento.foo = [1, 2, 3];

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert(memento);
		memento.foo = 'Hello World';

		myMemento.saveMemento();

		// GloBal
		memento = myMemento.getMemento(context!);
		assert.deepEqual(memento, { foo: [1, 2, 3] });
		let gloBalMemento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, { foo: 'Hello World' });

		// GloBal
		memento = myMemento.getMemento(context!);
		memento.foo = [4, 5, 6];

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert(memento);
		memento.foo = 'World Hello';

		myMemento.saveMemento();

		// GloBal
		memento = myMemento.getMemento(context!);
		assert.deepEqual(memento, { foo: [4, 5, 6] });
		gloBalMemento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, { foo: 'World Hello' });

		// Delete GloBal
		memento = myMemento.getMemento(context!);
		delete memento.foo;

		// Delete Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		delete memento.foo;

		myMemento.saveMemento();

		// GloBal
		memento = myMemento.getMemento(context!);
		assert.deepEqual(memento, {});

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, {});
	});

	test('Save and Load - 2 Components with same id', () => {
		let myMemento = new Memento('memento.test', storage);
		let myMemento2 = new Memento('memento.test', storage);

		// GloBal
		let memento = myMemento.getMemento(context!);
		memento.foo = [1, 2, 3];

		memento = myMemento2.getMemento(context!);
		memento.Bar = [1, 2, 3];

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert(memento);
		memento.foo = 'Hello World';

		memento = myMemento2.getMemento(StorageScope.WORKSPACE);
		assert(memento);
		memento.Bar = 'Hello World';

		myMemento.saveMemento();
		myMemento2.saveMemento();

		// GloBal
		memento = myMemento.getMemento(context!);
		assert.deepEqual(memento, { foo: [1, 2, 3], Bar: [1, 2, 3] });
		let gloBalMemento = myMemento.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		memento = myMemento2.getMemento(context!);
		assert.deepEqual(memento, { foo: [1, 2, 3], Bar: [1, 2, 3] });
		gloBalMemento = myMemento2.getMemento(StorageScope.GLOBAL);
		assert.deepEqual(gloBalMemento, memento);

		// Workspace
		memento = myMemento.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, { foo: 'Hello World', Bar: 'Hello World' });

		memento = myMemento2.getMemento(StorageScope.WORKSPACE);
		assert.deepEqual(memento, { foo: 'Hello World', Bar: 'Hello World' });
	});
});
