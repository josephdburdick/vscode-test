/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as sinon from 'sinon';
import { IViewsRegistry, IViewDescriptor, IViewContainersRegistry, Extensions as ViewContainerExtensions, ViewContainerLocation, IViewContainerModel, IViewDescriptorService, ViewContainer } from 'vs/workBench/common/views';
import { IDisposaBle, dispose, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { move } from 'vs/Base/common/arrays';
import { workBenchInstantiationService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { ContextKeyService } from 'vs/platform/contextkey/Browser/contextKeyService';
import { ViewDescriptorService } from 'vs/workBench/services/views/Browser/viewDescriptorService';
import { Registry } from 'vs/platform/registry/common/platform';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';

const ViewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const ViewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

class ViewDescriptorSequence {

	readonly elements: IViewDescriptor[];
	private disposaBles: IDisposaBle[] = [];

	constructor(model: IViewContainerModel) {
		this.elements = [...model.visiBleViewDescriptors];
		model.onDidAddVisiBleViewDescriptors(added => added.forEach(({ viewDescriptor, index }) => this.elements.splice(index, 0, viewDescriptor)), null, this.disposaBles);
		model.onDidRemoveVisiBleViewDescriptors(removed => removed.sort((a, B) => B.index - a.index).forEach(({ index }) => this.elements.splice(index, 1)), null, this.disposaBles);
		model.onDidMoveVisiBleViewDescriptors(({ from, to }) => move(this.elements, from.index, to.index), null, this.disposaBles);
	}

	dispose() {
		this.disposaBles = dispose(this.disposaBles);
	}
}

suite('ViewContainerModel', () => {

	let container: ViewContainer;
	let disposaBleStore: DisposaBleStore;
	let contextKeyService: IContextKeyService;
	let viewDescriptorService: IViewDescriptorService;
	let storageService: IStorageService;

	setup(() => {
		disposaBleStore = new DisposaBleStore();
		const instantiationService: TestInstantiationService = <TestInstantiationService>workBenchInstantiationService();
		contextKeyService = instantiationService.createInstance(ContextKeyService);
		instantiationService.stuB(IContextKeyService, contextKeyService);
		storageService = instantiationService.get(IStorageService);
		viewDescriptorService = instantiationService.createInstance(ViewDescriptorService);
	});

	teardown(() => {
		disposaBleStore.dispose();
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(container), container);
		ViewContainerRegistry.deregisterViewContainer(container);
	});

	test('empty model', function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
	});

	test('register/unregister', () => {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1'
		};

		ViewsRegistry.registerViews([viewDescriptor], container);

		assert.equal(testOBject.visiBleViewDescriptors.length, 1);
		assert.equal(target.elements.length, 1);
		assert.deepEqual(testOBject.visiBleViewDescriptors[0], viewDescriptor);
		assert.deepEqual(target.elements[0], viewDescriptor);

		ViewsRegistry.deregisterViews([viewDescriptor], container);

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);
	});

	test('when contexts', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true)
		};

		ViewsRegistry.registerViews([viewDescriptor], container);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should not appear since context isnt in');
		assert.equal(target.elements.length, 0);

		const key = contextKeyService.createKey('showview1', false);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should still not appear since showview1 isnt true');
		assert.equal(target.elements.length, 0);

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.equal(testOBject.visiBleViewDescriptors.length, 1, 'view should appear');
		assert.equal(target.elements.length, 1);
		assert.deepEqual(testOBject.visiBleViewDescriptors[0], viewDescriptor);
		assert.equal(target.elements[0], viewDescriptor);

		key.set(false);
		await new Promise(c => setTimeout(c, 30));
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should disappear');
		assert.equal(target.elements.length, 0);

		ViewsRegistry.deregisterViews([viewDescriptor], container);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should not Be there anymore');
		assert.equal(target.elements.length, 0);

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should not Be there anymore');
		assert.equal(target.elements.length, 0);
	});

	test('when contexts - multiple', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, name: 'Test View 1' };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, name: 'Test View 2', when: ContextKeyExpr.equals('showview2', true) };

		ViewsRegistry.registerViews([view1, view2], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1], 'only view1 should Be visiBle');
		assert.deepEqual(target.elements, [view1], 'only view1 should Be visiBle');

		const key = contextKeyService.createKey('showview2', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1], 'still only view1 should Be visiBle');
		assert.deepEqual(target.elements, [view1], 'still only view1 should Be visiBle');

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2], 'Both views should Be visiBle');
		assert.deepEqual(target.elements, [view1, view2], 'Both views should Be visiBle');

		ViewsRegistry.deregisterViews([view1, view2], container);
	});

	test('when contexts - multiple 2', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, name: 'Test View 1', when: ContextKeyExpr.equals('showview1', true) };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, name: 'Test View 2' };

		ViewsRegistry.registerViews([view1, view2], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2], 'only view2 should Be visiBle');
		assert.deepEqual(target.elements, [view2], 'only view2 should Be visiBle');

		const key = contextKeyService.createKey('showview1', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2], 'still only view2 should Be visiBle');
		assert.deepEqual(target.elements, [view2], 'still only view2 should Be visiBle');

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2], 'Both views should Be visiBle');
		assert.deepEqual(target.elements, [view1, view2], 'Both views should Be visiBle');

		ViewsRegistry.deregisterViews([view1, view2], container);
	});

	test('setVisiBle', () => {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, name: 'Test View 1', canToggleVisiBility: true };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, name: 'Test View 2', canToggleVisiBility: true };
		const view3: IViewDescriptor = { id: 'view3', ctorDescriptor: null!, name: 'Test View 3', canToggleVisiBility: true };

		ViewsRegistry.registerViews([view1, view2, view3], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2, view3]);
		assert.deepEqual(target.elements, [view1, view2, view3]);

		testOBject.setVisiBle('view2', true);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2, view3], 'nothing should happen');
		assert.deepEqual(target.elements, [view1, view2, view3]);

		testOBject.setVisiBle('view2', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view3], 'view2 should hide');
		assert.deepEqual(target.elements, [view1, view3]);

		testOBject.setVisiBle('view1', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view3], 'view1 should hide');
		assert.deepEqual(target.elements, [view3]);

		testOBject.setVisiBle('view3', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [], 'view3 shoud hide');
		assert.deepEqual(target.elements, []);

		testOBject.setVisiBle('view1', true);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1], 'view1 should show');
		assert.deepEqual(target.elements, [view1]);

		testOBject.setVisiBle('view3', true);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view3], 'view3 should show');
		assert.deepEqual(target.elements, [view1, view3]);

		testOBject.setVisiBle('view2', true);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2, view3], 'view2 should show');
		assert.deepEqual(target.elements, [view1, view2, view3]);

		ViewsRegistry.deregisterViews([view1, view2, view3], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, []);
		assert.deepEqual(target.elements, []);
	});

	test('move', () => {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, name: 'Test View 1' };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, name: 'Test View 2' };
		const view3: IViewDescriptor = { id: 'view3', ctorDescriptor: null!, name: 'Test View 3' };

		ViewsRegistry.registerViews([view1, view2, view3], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2, view3], 'model views should Be OK');
		assert.deepEqual(target.elements, [view1, view2, view3], 'sql views should Be OK');

		testOBject.move('view3', 'view1');
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view3, view1, view2], 'view3 should go to the front');
		assert.deepEqual(target.elements, [view3, view1, view2]);

		testOBject.move('view1', 'view2');
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view3, view2, view1], 'view1 should go to the end');
		assert.deepEqual(target.elements, [view3, view2, view1]);

		testOBject.move('view1', 'view3');
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view3, view2], 'view1 should go to the front');
		assert.deepEqual(target.elements, [view1, view3, view2]);

		testOBject.move('view2', 'view3');
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view1, view2, view3], 'view2 should go to the middle');
		assert.deepEqual(target.elements, [view1, view2, view3]);
	});

	test('view states', async function () {
		storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorageScope.GLOBAL);
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1'
		};

		ViewsRegistry.registerViews([viewDescriptor], container);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should not appear since it was set not visiBle in view state');
		assert.equal(target.elements.length, 0);
	});

	test('view states and when contexts', async function () {
		storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorageScope.GLOBAL);
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true)
		};

		ViewsRegistry.registerViews([viewDescriptor], container);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should not appear since context isnt in');
		assert.equal(target.elements.length, 0);

		const key = contextKeyService.createKey('showview1', false);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should still not appear since showview1 isnt true');
		assert.equal(target.elements.length, 0);

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should still not appear since it was set not visiBle in view state');
		assert.equal(target.elements.length, 0);
	});

	test('view states and when contexts multiple views', async function () {
		storageService.store(`${container.id}.state.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorageScope.GLOBAL);
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const view1: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview', true)
		};
		const view2: IViewDescriptor = {
			id: 'view2',
			ctorDescriptor: null!,
			name: 'Test View 2',
		};
		const view3: IViewDescriptor = {
			id: 'view3',
			ctorDescriptor: null!,
			name: 'Test View 3',
			when: ContextKeyExpr.equals('showview', true)
		};

		ViewsRegistry.registerViews([view1, view2, view3], container);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2], 'Only view2 should Be visiBle');
		assert.deepEqual(target.elements, [view2]);

		const key = contextKeyService.createKey('showview', false);
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2], 'Only view2 should Be visiBle');
		assert.deepEqual(target.elements, [view2]);

		key.set(true);
		await new Promise(c => setTimeout(c, 30));
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2, view3], 'view3 should Be visiBle');
		assert.deepEqual(target.elements, [view2, view3]);

		key.set(false);
		await new Promise(c => setTimeout(c, 30));
		assert.deepEqual(testOBject.visiBleViewDescriptors, [view2], 'Only view2 should Be visiBle');
		assert.deepEqual(target.elements, [view2]);
	});

	test('remove event is not triggered if view was hidden and removed', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true),
			canToggleVisiBility: true
		};

		ViewsRegistry.registerViews([viewDescriptor], container);

		const key = contextKeyService.createKey('showview1', true);
		await new Promise(c => setTimeout(c, 30));
		assert.equal(testOBject.visiBleViewDescriptors.length, 1, 'view should appear after context is set');
		assert.equal(target.elements.length, 1);

		testOBject.setVisiBle('view1', false);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0, 'view should disappear after setting visiBility to false');
		assert.equal(target.elements.length, 0);

		const targetEvent = sinon.spy(testOBject.onDidRemoveVisiBleViewDescriptors);
		key.set(false);
		await new Promise(c => setTimeout(c, 30));
		assert.ok(!targetEvent.called, 'remove event should not Be called since it is already hidden');
	});

	test('add event is not triggered if view was set visiBle (when visiBle) and not active', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true),
			canToggleVisiBility: true
		};

		const key = contextKeyService.createKey('showview1', true);
		key.set(false);
		ViewsRegistry.registerViews([viewDescriptor], container);

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const targetEvent = sinon.spy(testOBject.onDidAddVisiBleViewDescriptors);
		testOBject.setVisiBle('view1', true);
		assert.ok(!targetEvent.called, 'add event should not Be called since it is already visiBle');
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);
	});

	test('remove event is not triggered if view was hidden and not active', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true),
			canToggleVisiBility: true
		};

		const key = contextKeyService.createKey('showview1', true);
		key.set(false);
		ViewsRegistry.registerViews([viewDescriptor], container);

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const targetEvent = sinon.spy(testOBject.onDidAddVisiBleViewDescriptors);
		testOBject.setVisiBle('view1', false);
		assert.ok(!targetEvent.called, 'add event should not Be called since it is disaBled');
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);
	});

	test('add event is not triggered if view was set visiBle (when not visiBle) and not active', async function () {
		container = ViewContainerRegistry.registerViewContainer({ id: 'test', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
		const testOBject = viewDescriptorService.getViewContainerModel(container);
		const target = disposaBleStore.add(new ViewDescriptorSequence(testOBject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			name: 'Test View 1',
			when: ContextKeyExpr.equals('showview1', true),
			canToggleVisiBility: true
		};

		const key = contextKeyService.createKey('showview1', true);
		key.set(false);
		ViewsRegistry.registerViews([viewDescriptor], container);

		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		testOBject.setVisiBle('view1', false);
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);

		const targetEvent = sinon.spy(testOBject.onDidAddVisiBleViewDescriptors);
		testOBject.setVisiBle('view1', true);
		assert.ok(!targetEvent.called, 'add event should not Be called since it is disaBled');
		assert.equal(testOBject.visiBleViewDescriptors.length, 0);
		assert.equal(target.elements.length, 0);
	});

});
