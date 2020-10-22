/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { IViewsRegistry, IViewDescriptor, IViewContainersRegistry, Extensions as ViewContainerExtensions, IViewDescriptorService, ViewContainerLocation, ViewContainer } from 'vs/workBench/common/views';
import { Registry } from 'vs/platform/registry/common/platform';
import { workBenchInstantiationService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ViewDescriptorService } from 'vs/workBench/services/views/Browser/viewDescriptorService';
import { assertIsDefined } from 'vs/Base/common/types';
import { ContextKeyService } from 'vs/platform/contextkey/Browser/contextKeyService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';

const ViewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);
const sideBarContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({ id: 'testSideBar', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.SideBar);
const panelContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({ id: 'testPanel', name: 'test', ctorDescriptor: new SyncDescriptor(<any>{}) }, ViewContainerLocation.Panel);

suite('ViewDescriptorService', () => {

	let viewDescriptorService: IViewDescriptorService;

	setup(() => {
		const instantiationService: TestInstantiationService = <TestInstantiationService>workBenchInstantiationService();
		instantiationService.stuB(IContextKeyService, instantiationService.createInstance(ContextKeyService));
		viewDescriptorService = instantiationService.createInstance(ViewDescriptorService);
	});

	teardown(() => {
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(sideBarContainer), sideBarContainer);
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(panelContainer), panelContainer);
	});

	test('Empty Containers', function () {
		const sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		const panelViews = viewDescriptorService.getViewContainerModel(panelContainer);
		assert.equal(sideBarViews.allViewDescriptors.length, 0, 'The sideBar container should have no views yet.');
		assert.equal(panelViews.allViewDescriptors.length, 0, 'The panel container should have no views yet.');
	});

	test('Register/Deregister', () => {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				name: 'Test View 1',
				canMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				name: 'Test View 2',
				canMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				name: 'Test View 3',
				canMoveView: true
			}
		];


		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sideBarContainer);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);


		let sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		let panelViews = viewDescriptorService.getViewContainerModel(panelContainer);

		assert.equal(sideBarViews.activeViewDescriptors.length, 2, 'SideBar should have 2 views');
		assert.equal(panelViews.activeViewDescriptors.length, 1, 'Panel should have 1 view');

		ViewsRegistry.deregisterViews(viewDescriptors.slice(0, 2), sideBarContainer);
		ViewsRegistry.deregisterViews(viewDescriptors.slice(2), panelContainer);


		sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		panelViews = viewDescriptorService.getViewContainerModel(panelContainer);

		assert.equal(sideBarViews.activeViewDescriptors.length, 0, 'SideBar should have no views');
		assert.equal(panelViews.activeViewDescriptors.length, 0, 'Panel should have no views');
	});

	test('move views to existing containers', async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				name: 'Test View 1',
				canMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				name: 'Test View 2',
				canMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				name: 'Test View 3',
				canMoveView: true
			}
		];

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sideBarContainer);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);

		viewDescriptorService.moveViewsToContainer(viewDescriptors.slice(2), sideBarContainer);
		viewDescriptorService.moveViewsToContainer(viewDescriptors.slice(0, 2), panelContainer);

		let sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		let panelViews = viewDescriptorService.getViewContainerModel(panelContainer);

		assert.equal(sideBarViews.activeViewDescriptors.length, 1, 'SideBar should have 2 views');
		assert.equal(panelViews.activeViewDescriptors.length, 2, 'Panel should have 1 view');

		assert.notEqual(sideBarViews.activeViewDescriptors.indexOf(viewDescriptors[2]), -1, `SideBar should have ${viewDescriptors[2].name}`);
		assert.notEqual(panelViews.activeViewDescriptors.indexOf(viewDescriptors[0]), -1, `Panel should have ${viewDescriptors[0].name}`);
		assert.notEqual(panelViews.activeViewDescriptors.indexOf(viewDescriptors[1]), -1, `Panel should have ${viewDescriptors[1].name}`);
	});

	test('move views to generated containers', async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				name: 'Test View 1',
				canMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				name: 'Test View 2',
				canMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				name: 'Test View 3',
				canMoveView: true
			}
		];

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sideBarContainer);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);

		viewDescriptorService.moveViewToLocation(viewDescriptors[0], ViewContainerLocation.Panel);
		viewDescriptorService.moveViewToLocation(viewDescriptors[2], ViewContainerLocation.SideBar);

		let sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		let panelViews = viewDescriptorService.getViewContainerModel(panelContainer);

		assert.equal(sideBarViews.activeViewDescriptors.length, 1, 'SideBar container should have 1 view');
		assert.equal(panelViews.activeViewDescriptors.length, 0, 'Panel container should have no views');

		const generatedPanel = assertIsDefined(viewDescriptorService.getViewContainerByViewId(viewDescriptors[0].id));
		const generatedSideBar = assertIsDefined(viewDescriptorService.getViewContainerByViewId(viewDescriptors[2].id));

		assert.equal(viewDescriptorService.getViewContainerLocation(generatedPanel), ViewContainerLocation.Panel, 'Generated Panel should Be in located in the panel');
		assert.equal(viewDescriptorService.getViewContainerLocation(generatedSideBar), ViewContainerLocation.SideBar, 'Generated SideBar should Be in located in the sideBar');

		assert.equal(viewDescriptorService.getViewContainerLocation(generatedPanel), viewDescriptorService.getViewLocationById(viewDescriptors[0].id), 'Panel view location and container location should match');
		assert.equal(viewDescriptorService.getViewContainerLocation(generatedSideBar), viewDescriptorService.getViewLocationById(viewDescriptors[2].id), 'SideBar view location and container location should match');

		assert.equal(viewDescriptorService.getDefaultContainerById(viewDescriptors[2].id), panelContainer, `${viewDescriptors[2].name} has wrong default container`);
		assert.equal(viewDescriptorService.getDefaultContainerById(viewDescriptors[0].id), sideBarContainer, `${viewDescriptors[0].name} has wrong default container`);

		viewDescriptorService.moveViewToLocation(viewDescriptors[0], ViewContainerLocation.SideBar);
		viewDescriptorService.moveViewToLocation(viewDescriptors[2], ViewContainerLocation.Panel);

		sideBarViews = viewDescriptorService.getViewContainerModel(sideBarContainer);
		panelViews = viewDescriptorService.getViewContainerModel(panelContainer);

		assert.equal(sideBarViews.activeViewDescriptors.length, 1, 'SideBar should have 2 views');
		assert.equal(panelViews.activeViewDescriptors.length, 0, 'Panel should have 1 view');

		assert.equal(viewDescriptorService.getViewLocationById(viewDescriptors[0].id), ViewContainerLocation.SideBar, 'View should Be located in the sideBar');
		assert.equal(viewDescriptorService.getViewLocationById(viewDescriptors[2].id), ViewContainerLocation.Panel, 'View should Be located in the panel');
	});

	test('move view events', async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				name: 'Test View 1',
				canMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				name: 'Test View 2',
				canMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				name: 'Test View 3',
				canMoveView: true
			}
		];


		let expectedSequence = '';
		let actualSequence = '';
		const disposaBles = [];

		const containerMoveString = (view: IViewDescriptor, from: ViewContainer, to: ViewContainer) => {
			return `Moved ${view.id} from ${from.id} to ${to.id}\n`;
		};

		const locationMoveString = (view: IViewDescriptor, from: ViewContainerLocation, to: ViewContainerLocation) => {
			return `Moved ${view.id} from ${from === ViewContainerLocation.SideBar ? 'SideBar' : 'Panel'} to ${to === ViewContainerLocation.SideBar ? 'SideBar' : 'Panel'}\n`;
		};
		disposaBles.push(viewDescriptorService.onDidChangeContainer(({ views, from, to }) => {
			views.forEach(view => {
				actualSequence += containerMoveString(view, from, to);
			});
		}));

		disposaBles.push(viewDescriptorService.onDidChangeLocation(({ views, from, to }) => {
			views.forEach(view => {
				actualSequence += locationMoveString(view, from, to);
			});
		}));

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sideBarContainer);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), panelContainer);

		expectedSequence += locationMoveString(viewDescriptors[0], ViewContainerLocation.SideBar, ViewContainerLocation.Panel);
		viewDescriptorService.moveViewToLocation(viewDescriptors[0], ViewContainerLocation.Panel);
		expectedSequence += containerMoveString(viewDescriptors[0], sideBarContainer, viewDescriptorService.getViewContainerByViewId(viewDescriptors[0].id)!);

		expectedSequence += locationMoveString(viewDescriptors[2], ViewContainerLocation.Panel, ViewContainerLocation.SideBar);
		viewDescriptorService.moveViewToLocation(viewDescriptors[2], ViewContainerLocation.SideBar);
		expectedSequence += containerMoveString(viewDescriptors[2], panelContainer, viewDescriptorService.getViewContainerByViewId(viewDescriptors[2].id)!);


		expectedSequence += locationMoveString(viewDescriptors[0], ViewContainerLocation.Panel, ViewContainerLocation.SideBar);
		expectedSequence += containerMoveString(viewDescriptors[0], viewDescriptorService.getViewContainerByViewId(viewDescriptors[0].id)!, sideBarContainer);
		viewDescriptorService.moveViewsToContainer([viewDescriptors[0]], sideBarContainer);

		expectedSequence += locationMoveString(viewDescriptors[2], ViewContainerLocation.SideBar, ViewContainerLocation.Panel);
		expectedSequence += containerMoveString(viewDescriptors[2], viewDescriptorService.getViewContainerByViewId(viewDescriptors[2].id)!, panelContainer);
		viewDescriptorService.moveViewsToContainer([viewDescriptors[2]], panelContainer);

		expectedSequence += locationMoveString(viewDescriptors[0], ViewContainerLocation.SideBar, ViewContainerLocation.Panel);
		expectedSequence += containerMoveString(viewDescriptors[0], sideBarContainer, panelContainer);
		viewDescriptorService.moveViewsToContainer([viewDescriptors[0]], panelContainer);

		expectedSequence += locationMoveString(viewDescriptors[2], ViewContainerLocation.Panel, ViewContainerLocation.SideBar);
		expectedSequence += containerMoveString(viewDescriptors[2], panelContainer, sideBarContainer);
		viewDescriptorService.moveViewsToContainer([viewDescriptors[2]], sideBarContainer);

		expectedSequence += locationMoveString(viewDescriptors[1], ViewContainerLocation.SideBar, ViewContainerLocation.Panel);
		expectedSequence += locationMoveString(viewDescriptors[2], ViewContainerLocation.SideBar, ViewContainerLocation.Panel);
		expectedSequence += containerMoveString(viewDescriptors[1], sideBarContainer, panelContainer);
		expectedSequence += containerMoveString(viewDescriptors[2], sideBarContainer, panelContainer);
		viewDescriptorService.moveViewsToContainer([viewDescriptors[1], viewDescriptors[2]], panelContainer);

		assert.equal(actualSequence, expectedSequence, 'Event sequence not matching expected sequence');
	});

});
