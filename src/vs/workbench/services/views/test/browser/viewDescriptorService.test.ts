/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As Assert from 'Assert';
import { IViewsRegistry, IViewDescriptor, IViewContAinersRegistry, Extensions As ViewContAinerExtensions, IViewDescriptorService, ViewContAinerLocAtion, ViewContAiner } from 'vs/workbench/common/views';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { workbenchInstAntiAtionService } from 'vs/workbench/test/browser/workbenchTestServices';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { ViewDescriptorService } from 'vs/workbench/services/views/browser/viewDescriptorService';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { ContextKeyService } from 'vs/plAtform/contextkey/browser/contextKeyService';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';

const ViewsRegistry = Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry);
const sidebArContAiner = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner({ id: 'testSidebAr', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.SidebAr);
const pAnelContAiner = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner({ id: 'testPAnel', nAme: 'test', ctorDescriptor: new SyncDescriptor(<Any>{}) }, ViewContAinerLocAtion.PAnel);

suite('ViewDescriptorService', () => {

	let viewDescriptorService: IViewDescriptorService;

	setup(() => {
		const instAntiAtionService: TestInstAntiAtionService = <TestInstAntiAtionService>workbenchInstAntiAtionService();
		instAntiAtionService.stub(IContextKeyService, instAntiAtionService.creAteInstAnce(ContextKeyService));
		viewDescriptorService = instAntiAtionService.creAteInstAnce(ViewDescriptorService);
	});

	teArdown(() => {
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(sidebArContAiner), sidebArContAiner);
		ViewsRegistry.deregisterViews(ViewsRegistry.getViews(pAnelContAiner), pAnelContAiner);
	});

	test('Empty ContAiners', function () {
		const sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		const pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);
		Assert.equAl(sidebArViews.AllViewDescriptors.length, 0, 'The sidebAr contAiner should hAve no views yet.');
		Assert.equAl(pAnelViews.AllViewDescriptors.length, 0, 'The pAnel contAiner should hAve no views yet.');
	});

	test('Register/Deregister', () => {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				nAme: 'Test View 1',
				cAnMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				nAme: 'Test View 2',
				cAnMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				nAme: 'Test View 3',
				cAnMoveView: true
			}
		];


		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebArContAiner);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), pAnelContAiner);


		let sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		let pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);

		Assert.equAl(sidebArViews.ActiveViewDescriptors.length, 2, 'SidebAr should hAve 2 views');
		Assert.equAl(pAnelViews.ActiveViewDescriptors.length, 1, 'PAnel should hAve 1 view');

		ViewsRegistry.deregisterViews(viewDescriptors.slice(0, 2), sidebArContAiner);
		ViewsRegistry.deregisterViews(viewDescriptors.slice(2), pAnelContAiner);


		sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);

		Assert.equAl(sidebArViews.ActiveViewDescriptors.length, 0, 'SidebAr should hAve no views');
		Assert.equAl(pAnelViews.ActiveViewDescriptors.length, 0, 'PAnel should hAve no views');
	});

	test('move views to existing contAiners', Async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				nAme: 'Test View 1',
				cAnMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				nAme: 'Test View 2',
				cAnMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				nAme: 'Test View 3',
				cAnMoveView: true
			}
		];

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebArContAiner);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), pAnelContAiner);

		viewDescriptorService.moveViewsToContAiner(viewDescriptors.slice(2), sidebArContAiner);
		viewDescriptorService.moveViewsToContAiner(viewDescriptors.slice(0, 2), pAnelContAiner);

		let sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		let pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);

		Assert.equAl(sidebArViews.ActiveViewDescriptors.length, 1, 'SidebAr should hAve 2 views');
		Assert.equAl(pAnelViews.ActiveViewDescriptors.length, 2, 'PAnel should hAve 1 view');

		Assert.notEquAl(sidebArViews.ActiveViewDescriptors.indexOf(viewDescriptors[2]), -1, `SidebAr should hAve ${viewDescriptors[2].nAme}`);
		Assert.notEquAl(pAnelViews.ActiveViewDescriptors.indexOf(viewDescriptors[0]), -1, `PAnel should hAve ${viewDescriptors[0].nAme}`);
		Assert.notEquAl(pAnelViews.ActiveViewDescriptors.indexOf(viewDescriptors[1]), -1, `PAnel should hAve ${viewDescriptors[1].nAme}`);
	});

	test('move views to generAted contAiners', Async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				nAme: 'Test View 1',
				cAnMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				nAme: 'Test View 2',
				cAnMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				nAme: 'Test View 3',
				cAnMoveView: true
			}
		];

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebArContAiner);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), pAnelContAiner);

		viewDescriptorService.moveViewToLocAtion(viewDescriptors[0], ViewContAinerLocAtion.PAnel);
		viewDescriptorService.moveViewToLocAtion(viewDescriptors[2], ViewContAinerLocAtion.SidebAr);

		let sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		let pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);

		Assert.equAl(sidebArViews.ActiveViewDescriptors.length, 1, 'SidebAr contAiner should hAve 1 view');
		Assert.equAl(pAnelViews.ActiveViewDescriptors.length, 0, 'PAnel contAiner should hAve no views');

		const generAtedPAnel = AssertIsDefined(viewDescriptorService.getViewContAinerByViewId(viewDescriptors[0].id));
		const generAtedSidebAr = AssertIsDefined(viewDescriptorService.getViewContAinerByViewId(viewDescriptors[2].id));

		Assert.equAl(viewDescriptorService.getViewContAinerLocAtion(generAtedPAnel), ViewContAinerLocAtion.PAnel, 'GenerAted PAnel should be in locAted in the pAnel');
		Assert.equAl(viewDescriptorService.getViewContAinerLocAtion(generAtedSidebAr), ViewContAinerLocAtion.SidebAr, 'GenerAted SidebAr should be in locAted in the sidebAr');

		Assert.equAl(viewDescriptorService.getViewContAinerLocAtion(generAtedPAnel), viewDescriptorService.getViewLocAtionById(viewDescriptors[0].id), 'PAnel view locAtion And contAiner locAtion should mAtch');
		Assert.equAl(viewDescriptorService.getViewContAinerLocAtion(generAtedSidebAr), viewDescriptorService.getViewLocAtionById(viewDescriptors[2].id), 'SidebAr view locAtion And contAiner locAtion should mAtch');

		Assert.equAl(viewDescriptorService.getDefAultContAinerById(viewDescriptors[2].id), pAnelContAiner, `${viewDescriptors[2].nAme} hAs wrong defAult contAiner`);
		Assert.equAl(viewDescriptorService.getDefAultContAinerById(viewDescriptors[0].id), sidebArContAiner, `${viewDescriptors[0].nAme} hAs wrong defAult contAiner`);

		viewDescriptorService.moveViewToLocAtion(viewDescriptors[0], ViewContAinerLocAtion.SidebAr);
		viewDescriptorService.moveViewToLocAtion(viewDescriptors[2], ViewContAinerLocAtion.PAnel);

		sidebArViews = viewDescriptorService.getViewContAinerModel(sidebArContAiner);
		pAnelViews = viewDescriptorService.getViewContAinerModel(pAnelContAiner);

		Assert.equAl(sidebArViews.ActiveViewDescriptors.length, 1, 'SidebAr should hAve 2 views');
		Assert.equAl(pAnelViews.ActiveViewDescriptors.length, 0, 'PAnel should hAve 1 view');

		Assert.equAl(viewDescriptorService.getViewLocAtionById(viewDescriptors[0].id), ViewContAinerLocAtion.SidebAr, 'View should be locAted in the sidebAr');
		Assert.equAl(viewDescriptorService.getViewLocAtionById(viewDescriptors[2].id), ViewContAinerLocAtion.PAnel, 'View should be locAted in the pAnel');
	});

	test('move view events', Async function () {
		const viewDescriptors: IViewDescriptor[] = [
			{
				id: 'view1',
				ctorDescriptor: null!,
				nAme: 'Test View 1',
				cAnMoveView: true
			},
			{
				id: 'view2',
				ctorDescriptor: null!,
				nAme: 'Test View 2',
				cAnMoveView: true
			},
			{
				id: 'view3',
				ctorDescriptor: null!,
				nAme: 'Test View 3',
				cAnMoveView: true
			}
		];


		let expectedSequence = '';
		let ActuAlSequence = '';
		const disposAbles = [];

		const contAinerMoveString = (view: IViewDescriptor, from: ViewContAiner, to: ViewContAiner) => {
			return `Moved ${view.id} from ${from.id} to ${to.id}\n`;
		};

		const locAtionMoveString = (view: IViewDescriptor, from: ViewContAinerLocAtion, to: ViewContAinerLocAtion) => {
			return `Moved ${view.id} from ${from === ViewContAinerLocAtion.SidebAr ? 'SidebAr' : 'PAnel'} to ${to === ViewContAinerLocAtion.SidebAr ? 'SidebAr' : 'PAnel'}\n`;
		};
		disposAbles.push(viewDescriptorService.onDidChAngeContAiner(({ views, from, to }) => {
			views.forEAch(view => {
				ActuAlSequence += contAinerMoveString(view, from, to);
			});
		}));

		disposAbles.push(viewDescriptorService.onDidChAngeLocAtion(({ views, from, to }) => {
			views.forEAch(view => {
				ActuAlSequence += locAtionMoveString(view, from, to);
			});
		}));

		ViewsRegistry.registerViews(viewDescriptors.slice(0, 2), sidebArContAiner);
		ViewsRegistry.registerViews(viewDescriptors.slice(2), pAnelContAiner);

		expectedSequence += locAtionMoveString(viewDescriptors[0], ViewContAinerLocAtion.SidebAr, ViewContAinerLocAtion.PAnel);
		viewDescriptorService.moveViewToLocAtion(viewDescriptors[0], ViewContAinerLocAtion.PAnel);
		expectedSequence += contAinerMoveString(viewDescriptors[0], sidebArContAiner, viewDescriptorService.getViewContAinerByViewId(viewDescriptors[0].id)!);

		expectedSequence += locAtionMoveString(viewDescriptors[2], ViewContAinerLocAtion.PAnel, ViewContAinerLocAtion.SidebAr);
		viewDescriptorService.moveViewToLocAtion(viewDescriptors[2], ViewContAinerLocAtion.SidebAr);
		expectedSequence += contAinerMoveString(viewDescriptors[2], pAnelContAiner, viewDescriptorService.getViewContAinerByViewId(viewDescriptors[2].id)!);


		expectedSequence += locAtionMoveString(viewDescriptors[0], ViewContAinerLocAtion.PAnel, ViewContAinerLocAtion.SidebAr);
		expectedSequence += contAinerMoveString(viewDescriptors[0], viewDescriptorService.getViewContAinerByViewId(viewDescriptors[0].id)!, sidebArContAiner);
		viewDescriptorService.moveViewsToContAiner([viewDescriptors[0]], sidebArContAiner);

		expectedSequence += locAtionMoveString(viewDescriptors[2], ViewContAinerLocAtion.SidebAr, ViewContAinerLocAtion.PAnel);
		expectedSequence += contAinerMoveString(viewDescriptors[2], viewDescriptorService.getViewContAinerByViewId(viewDescriptors[2].id)!, pAnelContAiner);
		viewDescriptorService.moveViewsToContAiner([viewDescriptors[2]], pAnelContAiner);

		expectedSequence += locAtionMoveString(viewDescriptors[0], ViewContAinerLocAtion.SidebAr, ViewContAinerLocAtion.PAnel);
		expectedSequence += contAinerMoveString(viewDescriptors[0], sidebArContAiner, pAnelContAiner);
		viewDescriptorService.moveViewsToContAiner([viewDescriptors[0]], pAnelContAiner);

		expectedSequence += locAtionMoveString(viewDescriptors[2], ViewContAinerLocAtion.PAnel, ViewContAinerLocAtion.SidebAr);
		expectedSequence += contAinerMoveString(viewDescriptors[2], pAnelContAiner, sidebArContAiner);
		viewDescriptorService.moveViewsToContAiner([viewDescriptors[2]], sidebArContAiner);

		expectedSequence += locAtionMoveString(viewDescriptors[1], ViewContAinerLocAtion.SidebAr, ViewContAinerLocAtion.PAnel);
		expectedSequence += locAtionMoveString(viewDescriptors[2], ViewContAinerLocAtion.SidebAr, ViewContAinerLocAtion.PAnel);
		expectedSequence += contAinerMoveString(viewDescriptors[1], sidebArContAiner, pAnelContAiner);
		expectedSequence += contAinerMoveString(viewDescriptors[2], sidebArContAiner, pAnelContAiner);
		viewDescriptorService.moveViewsToContAiner([viewDescriptors[1], viewDescriptors[2]], pAnelContAiner);

		Assert.equAl(ActuAlSequence, expectedSequence, 'Event sequence not mAtching expected sequence');
	});

});
