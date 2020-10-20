/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import * As sinon from 'sinon';
import { IViewsRegistry, IViewDescriptor, IViewContAinersRegistry, Extensions As ViewContAinerExtensions, ViewContAinerLocAtion, IViewContAinerModel, IViewDescriptorService, ViewContAiner } from 'vs/workbench/common/views';
import { IDisposAble, dispose, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { move } from 'vs/bAse/common/ArrAys';
import { workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { ContextKeyService } from 'vs/plAtform/contextkey/browser/contextKeyService';
import { ViewDescriptorService } from 'vs/workbench/services/views/browser/viewDescriptorService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';

const ViewContAinerRegistry = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry);
const ViewsRegistry = Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry);

clAss ViewDescriptorSequence {

	reAdonly elements: IViewDescriptor[];
	privAte disposAbles: IDisposAble[] = [];

	constructor(model: IViewContAinerModel) {
		this.elements = [...model.visibleViewDescriptors];
		model.onDidAddVisibleViewDescriptors(Added => Added.forEAch(({ viewDescriptor, index }) => this.elements.splice(index, 0, viewDescriptor)), null, this.disposAbles);
		model.onDidRemoveVisibleViewDescriptors(removed => removed.sort((A, b) => b.index - A.index).forEAch(({ index }) => this.elements.splice(index, 1)), null, this.disposAbles);
		model.onDidMoveVisibleViewDescriptors(({ from, to }) => move(this.elements, from.index, to.index), null, this.disposAbles);
	}

	dispose() {
		this.disposAbles = dispose(this.disposAbles);
	}
}

suite('ViewContAinerModel', () => {

	let contAiner: ViewContAiner;
	let disposAbleStore: DisposAbleStore;
	let contextKeyService: IContextKeyService;
	let viewDescriptorService: IViewDescriptorService;
	let storAgeService: IStorAgeService;

	setup(() => {
		disposAbleStore = new DisposAbleStore();
		const instAntiAtionService: TestInstAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		contextKeyService = instAntiAtionService.creAteInstAnce(ContextKeyService);
		instAntiAtionService.stub(IContextKeyService, contextKeyService);
		storAgeService = instAntiAtionService.get(IStorAgeService);
		viewDescriptorService = instAntiAtionService.creAteInstAnce(ViewDescriptorService);
	});

	teArdown(() => {
		disposAbleStore.dispose();
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(contAiner), contAiner);
		ViewContAinerRegistry.deregisterViewContAiner(contAiner);
	});

	test('empty model', function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
	});

	test('register/unregister', () => {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1'
		};

		ViewsRegistry.registerViews([viewDescriptor], contAiner);

		Assert.equAl(testObject.visibleViewDescriptors.length, 1);
		Assert.equAl(tArget.elements.length, 1);
		Assert.deepEquAl(testObject.visibleViewDescriptors[0], viewDescriptor);
		Assert.deepEquAl(tArget.elements[0], viewDescriptor);

		ViewsRegistry.deregisterViews([viewDescriptor], contAiner);

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);
	});

	test('when contexts', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true)
		};

		ViewsRegistry.registerViews([viewDescriptor], contAiner);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should not AppeAr since context isnt in');
		Assert.equAl(tArget.elements.length, 0);

		const key = contextKeyService.creAteKey('showview1', fAlse);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should still not AppeAr since showview1 isnt true');
		Assert.equAl(tArget.elements.length, 0);

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.equAl(testObject.visibleViewDescriptors.length, 1, 'view should AppeAr');
		Assert.equAl(tArget.elements.length, 1);
		Assert.deepEquAl(testObject.visibleViewDescriptors[0], viewDescriptor);
		Assert.equAl(tArget.elements[0], viewDescriptor);

		key.set(fAlse);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should disAppeAr');
		Assert.equAl(tArget.elements.length, 0);

		ViewsRegistry.deregisterViews([viewDescriptor], contAiner);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should not be there Anymore');
		Assert.equAl(tArget.elements.length, 0);

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should not be there Anymore');
		Assert.equAl(tArget.elements.length, 0);
	});

	test('when contexts - multiple', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, nAme: 'Test View 1' };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, nAme: 'Test View 2', when: ContextKeyExpr.equAls('showview2', true) };

		ViewsRegistry.registerViews([view1, view2], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1], 'only view1 should be visible');
		Assert.deepEquAl(tArget.elements, [view1], 'only view1 should be visible');

		const key = contextKeyService.creAteKey('showview2', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1], 'still only view1 should be visible');
		Assert.deepEquAl(tArget.elements, [view1], 'still only view1 should be visible');

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2], 'both views should be visible');
		Assert.deepEquAl(tArget.elements, [view1, view2], 'both views should be visible');

		ViewsRegistry.deregisterViews([view1, view2], contAiner);
	});

	test('when contexts - multiple 2', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, nAme: 'Test View 1', when: ContextKeyExpr.equAls('showview1', true) };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, nAme: 'Test View 2' };

		ViewsRegistry.registerViews([view1, view2], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2], 'only view2 should be visible');
		Assert.deepEquAl(tArget.elements, [view2], 'only view2 should be visible');

		const key = contextKeyService.creAteKey('showview1', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2], 'still only view2 should be visible');
		Assert.deepEquAl(tArget.elements, [view2], 'still only view2 should be visible');

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2], 'both views should be visible');
		Assert.deepEquAl(tArget.elements, [view1, view2], 'both views should be visible');

		ViewsRegistry.deregisterViews([view1, view2], contAiner);
	});

	test('setVisible', () => {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, nAme: 'Test View 1', cAnToggleVisibility: true };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, nAme: 'Test View 2', cAnToggleVisibility: true };
		const view3: IViewDescriptor = { id: 'view3', ctorDescriptor: null!, nAme: 'Test View 3', cAnToggleVisibility: true };

		ViewsRegistry.registerViews([view1, view2, view3], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2, view3]);
		Assert.deepEquAl(tArget.elements, [view1, view2, view3]);

		testObject.setVisible('view2', true);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2, view3], 'nothing should hAppen');
		Assert.deepEquAl(tArget.elements, [view1, view2, view3]);

		testObject.setVisible('view2', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view3], 'view2 should hide');
		Assert.deepEquAl(tArget.elements, [view1, view3]);

		testObject.setVisible('view1', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view3], 'view1 should hide');
		Assert.deepEquAl(tArget.elements, [view3]);

		testObject.setVisible('view3', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [], 'view3 shoud hide');
		Assert.deepEquAl(tArget.elements, []);

		testObject.setVisible('view1', true);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1], 'view1 should show');
		Assert.deepEquAl(tArget.elements, [view1]);

		testObject.setVisible('view3', true);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view3], 'view3 should show');
		Assert.deepEquAl(tArget.elements, [view1, view3]);

		testObject.setVisible('view2', true);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2, view3], 'view2 should show');
		Assert.deepEquAl(tArget.elements, [view1, view2, view3]);

		ViewsRegistry.deregisterViews([view1, view2, view3], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, []);
		Assert.deepEquAl(tArget.elements, []);
	});

	test('move', () => {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const view1: IViewDescriptor = { id: 'view1', ctorDescriptor: null!, nAme: 'Test View 1' };
		const view2: IViewDescriptor = { id: 'view2', ctorDescriptor: null!, nAme: 'Test View 2' };
		const view3: IViewDescriptor = { id: 'view3', ctorDescriptor: null!, nAme: 'Test View 3' };

		ViewsRegistry.registerViews([view1, view2, view3], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2, view3], 'model views should be OK');
		Assert.deepEquAl(tArget.elements, [view1, view2, view3], 'sql views should be OK');

		testObject.move('view3', 'view1');
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view3, view1, view2], 'view3 should go to the front');
		Assert.deepEquAl(tArget.elements, [view3, view1, view2]);

		testObject.move('view1', 'view2');
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view3, view2, view1], 'view1 should go to the end');
		Assert.deepEquAl(tArget.elements, [view3, view2, view1]);

		testObject.move('view1', 'view3');
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view3, view2], 'view1 should go to the front');
		Assert.deepEquAl(tArget.elements, [view1, view3, view2]);

		testObject.move('view2', 'view3');
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view1, view2, view3], 'view2 should go to the middle');
		Assert.deepEquAl(tArget.elements, [view1, view2, view3]);
	});

	test('view stAtes', Async function () {
		storAgeService.store(`${contAiner.id}.stAte.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorAgeScope.GLOBAL);
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1'
		};

		ViewsRegistry.registerViews([viewDescriptor], contAiner);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should not AppeAr since it wAs set not visible in view stAte');
		Assert.equAl(tArget.elements.length, 0);
	});

	test('view stAtes And when contexts', Async function () {
		storAgeService.store(`${contAiner.id}.stAte.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorAgeScope.GLOBAL);
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true)
		};

		ViewsRegistry.registerViews([viewDescriptor], contAiner);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should not AppeAr since context isnt in');
		Assert.equAl(tArget.elements.length, 0);

		const key = contextKeyService.creAteKey('showview1', fAlse);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should still not AppeAr since showview1 isnt true');
		Assert.equAl(tArget.elements.length, 0);

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should still not AppeAr since it wAs set not visible in view stAte');
		Assert.equAl(tArget.elements.length, 0);
	});

	test('view stAtes And when contexts multiple views', Async function () {
		storAgeService.store(`${contAiner.id}.stAte.hidden`, JSON.stringify([{ id: 'view1', isHidden: true }]), StorAgeScope.GLOBAL);
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const view1: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview', true)
		};
		const view2: IViewDescriptor = {
			id: 'view2',
			ctorDescriptor: null!,
			nAme: 'Test View 2',
		};
		const view3: IViewDescriptor = {
			id: 'view3',
			ctorDescriptor: null!,
			nAme: 'Test View 3',
			when: ContextKeyExpr.equAls('showview', true)
		};

		ViewsRegistry.registerViews([view1, view2, view3], contAiner);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
		Assert.deepEquAl(tArget.elements, [view2]);

		const key = contextKeyService.creAteKey('showview', fAlse);
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
		Assert.deepEquAl(tArget.elements, [view2]);

		key.set(true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2, view3], 'view3 should be visible');
		Assert.deepEquAl(tArget.elements, [view2, view3]);

		key.set(fAlse);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.deepEquAl(testObject.visibleViewDescriptors, [view2], 'Only view2 should be visible');
		Assert.deepEquAl(tArget.elements, [view2]);
	});

	test('remove event is not triggered if view wAs hidden And removed', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true),
			cAnToggleVisibility: true
		};

		ViewsRegistry.registerViews([viewDescriptor], contAiner);

		const key = contextKeyService.creAteKey('showview1', true);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.equAl(testObject.visibleViewDescriptors.length, 1, 'view should AppeAr After context is set');
		Assert.equAl(tArget.elements.length, 1);

		testObject.setVisible('view1', fAlse);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0, 'view should disAppeAr After setting visibility to fAlse');
		Assert.equAl(tArget.elements.length, 0);

		const tArgetEvent = sinon.spy(testObject.onDidRemoveVisibleViewDescriptors);
		key.set(fAlse);
		AwAit new Promise(c => setTimeout(c, 30));
		Assert.ok(!tArgetEvent.cAlled, 'remove event should not be cAlled since it is AlreAdy hidden');
	});

	test('Add event is not triggered if view wAs set visible (when visible) And not Active', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true),
			cAnToggleVisibility: true
		};

		const key = contextKeyService.creAteKey('showview1', true);
		key.set(fAlse);
		ViewsRegistry.registerViews([viewDescriptor], contAiner);

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const tArgetEvent = sinon.spy(testObject.onDidAddVisibleViewDescriptors);
		testObject.setVisible('view1', true);
		Assert.ok(!tArgetEvent.cAlled, 'Add event should not be cAlled since it is AlreAdy visible');
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);
	});

	test('remove event is not triggered if view wAs hidden And not Active', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true),
			cAnToggleVisibility: true
		};

		const key = contextKeyService.creAteKey('showview1', true);
		key.set(fAlse);
		ViewsRegistry.registerViews([viewDescriptor], contAiner);

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const tArgetEvent = sinon.spy(testObject.onDidAddVisibleViewDescriptors);
		testObject.setVisible('view1', fAlse);
		Assert.ok(!tArgetEvent.cAlled, 'Add event should not be cAlled since it is disAbled');
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);
	});

	test('Add event is not triggered if view wAs set visible (when not visible) And not Active', Async function () {
		contAiner = ViewContAinerRegistry.registerViewContAiner({ id: 'test', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
		const testObject = viewDescriptorService.getViewContAinerModel(contAiner);
		const tArget = disposAbleStore.Add(new ViewDescriptorSequence(testObject));
		const viewDescriptor: IViewDescriptor = {
			id: 'view1',
			ctorDescriptor: null!,
			nAme: 'Test View 1',
			when: ContextKeyExpr.equAls('showview1', true),
			cAnToggleVisibility: true
		};

		const key = contextKeyService.creAteKey('showview1', true);
		key.set(fAlse);
		ViewsRegistry.registerViews([viewDescriptor], contAiner);

		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		testObject.setVisible('view1', fAlse);
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);

		const tArgetEvent = sinon.spy(testObject.onDidAddVisibleViewDescriptors);
		testObject.setVisible('view1', true);
		Assert.ok(!tArgetEvent.cAlled, 'Add event should not be cAlled since it is disAbled');
		Assert.equAl(testObject.visibleViewDescriptors.length, 0);
		Assert.equAl(tArget.elements.length, 0);
	});

});
