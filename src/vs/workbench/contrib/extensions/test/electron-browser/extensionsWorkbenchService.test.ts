/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As sinon from 'sinon';
import * As Assert from 'Assert';
import * As fs from 'fs';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IExtensionsWorkbenchService, ExtensionStAte, AutoCheckUpdAtesConfigurAtionKey, AutoUpdAteConfigurAtionKey } from 'vs/workbench/contrib/extensions/common/extensions';
import { ExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/browser/extensionsWorkbenchService';
import {
	IExtensionMAnAgementService, IExtensionGAlleryService, ILocAlExtension, IGAlleryExtension,
	DidInstAllExtensionEvent, DidUninstAllExtensionEvent, InstAllExtensionEvent, IGAlleryExtensionAssets, IExtensionIdentifier, InstAllOperAtion, IExtensionTipsService, IGAlleryMetAdAtA
} from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService, EnAblementStAte, IExtensionMAnAgementServerService, IExtensionMAnAgementServer } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { TestExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/test/browser/extensionEnAblementService.test';
import { ExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionGAlleryService';
import { IURLService } from 'vs/plAtform/url/common/url';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IPAger } from 'vs/bAse/common/pAging';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { TestShAredProcessService } from 'vs/workbench/test/electron-browser/workbenchTestServices';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService, NullLogService } from 'vs/plAtform/log/common/log';
import { IProgressService } from 'vs/plAtform/progress/common/progress';
import { ProgressService } from 'vs/workbench/services/progress/browser/progressService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { NAtiveURLService } from 'vs/plAtform/url/common/urlService';
import { URI } from 'vs/bAse/common/uri';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ExtensionType, IExtension, ExtensionKind } from 'vs/plAtform/extensions/common/extensions';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { RemoteAgentService } from 'vs/workbench/services/remote/electron-browser/remoteAgentServiceImpl';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { TestContextService } from 'vs/workbench/test/common/workbenchTestServices';
import { IStorAgeKeysSyncRegistryService, StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { TestLifecycleService } from 'vs/workbench/test/browser/workbenchTestServices';
import { IExperimentService } from 'vs/workbench/contrib/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workbench/contrib/experiments/test/electron-browser/experimentService.test';
import { ExtensionTipsService } from 'vs/plAtform/extensionMAnAgement/electron-sAndbox/extensionTipsService';
import { SchemAs } from 'vs/bAse/common/network';

suite('ExtensionsWorkbenchServiceTest', () => {

	let instAntiAtionService: TestInstAntiAtionService;
	let testObject: IExtensionsWorkbenchService;

	let instAllEvent: Emitter<InstAllExtensionEvent>,
		didInstAllEvent: Emitter<DidInstAllExtensionEvent>,
		uninstAllEvent: Emitter<IExtensionIdentifier>,
		didUninstAllEvent: Emitter<DidUninstAllExtensionEvent>;

	suiteSetup(() => {
		instAllEvent = new Emitter<InstAllExtensionEvent>();
		didInstAllEvent = new Emitter<DidInstAllExtensionEvent>();
		uninstAllEvent = new Emitter<IExtensionIdentifier>();
		didUninstAllEvent = new Emitter<DidUninstAllExtensionEvent>();

		instAntiAtionService = new TestInstAntiAtionService();
		instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
		instAntiAtionService.stub(ILogService, NullLogService);
		instAntiAtionService.stub(IProgressService, ProgressService);
		instAntiAtionService.stub(IStorAgeKeysSyncRegistryService, new StorAgeKeysSyncRegistryService());
		instAntiAtionService.stub(IProductService, {});

		instAntiAtionService.stub(IExtensionGAlleryService, ExtensionGAlleryService);
		instAntiAtionService.stub(IURLService, NAtiveURLService);
		instAntiAtionService.stub(IShAredProcessService, TestShAredProcessService);

		instAntiAtionService.stub(IWorkspAceContextService, new TestContextService());
		instAntiAtionService.stub(IConfigurAtionService, <PArtiAl<IConfigurAtionService>>{
			onDidChAngeConfigurAtion: () => { return undefined!; },
			getVAlue: (key?: string) => {
				return (key === AutoCheckUpdAtesConfigurAtionKey || key === AutoUpdAteConfigurAtionKey) ? true : undefined;
			}
		});

		instAntiAtionService.stub(IRemoteAgentService, RemoteAgentService);

		instAntiAtionService.stub(IExtensionMAnAgementService, <PArtiAl<IExtensionMAnAgementService>>{
			onInstAllExtension: instAllEvent.event,
			onDidInstAllExtension: didInstAllEvent.event,
			onUninstAllExtension: uninstAllEvent.event,
			onDidUninstAllExtension: didUninstAllEvent.event,
			Async getInstAlled() { return []; },
			Async getExtensionsReport() { return []; },
			Async updAteMetAdAtA(locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA) {
				locAl.identifier.uuid = metAdAtA.id;
				locAl.publisherDisplAyNAme = metAdAtA.publisherDisplAyNAme;
				locAl.publisherId = metAdAtA.publisherId;
				return locAl;
			}
		});

		instAntiAtionService.stub(IExtensionMAnAgementServerService, <IExtensionMAnAgementServerService>{
			locAlExtensionMAnAgementServer: {
				extensionMAnAgementService: instAntiAtionService.get(IExtensionMAnAgementService)
			}
		});

		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));

		instAntiAtionService.stub(ILifecycleService, new TestLifecycleService());
		instAntiAtionService.stub(IExperimentService, instAntiAtionService.creAteInstAnce(TestExperimentService));
		instAntiAtionService.stub(IExtensionTipsService, instAntiAtionService.creAteInstAnce(ExtensionTipsService));
		instAntiAtionService.stub(IExtensionRecommendAtionsService, {});

		instAntiAtionService.stub(INotificAtionService, { prompt: () => null! });
	});

	setup(Async () => {
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', []);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge());
		instAntiAtionService.stubPromise(INotificAtionService, 'prompt', 0);
		AwAit (<TestExtensionEnAblementService>instAntiAtionService.get(IWorkbenchExtensionEnAblementService)).reset();
	});

	teArdown(() => {
		(<ExtensionsWorkbenchService>testObject).dispose();
	});

	test('test gAllery extension', Async () => {
		const expected = AGAlleryExtension('expectedNAme', {
			displAyNAme: 'expectedDisplAyNAme',
			version: '1.5.0',
			publisherId: 'expectedPublisherId',
			publisher: 'expectedPublisher',
			publisherDisplAyNAme: 'expectedPublisherDisplAyNAme',
			description: 'expectedDescription',
			instAllCount: 1000,
			rAting: 4,
			rAtingCount: 100
		}, {
			dependencies: ['pub.1', 'pub.2'],
		}, {
			mAnifest: { uri: 'uri:mAnifest', fAllbAckUri: 'fAllbAck:mAnifest' },
			reAdme: { uri: 'uri:reAdme', fAllbAckUri: 'fAllbAck:reAdme' },
			chAngelog: { uri: 'uri:chAngelog', fAllbAckUri: 'fAllbAck:chAnglog' },
			downloAd: { uri: 'uri:downloAd', fAllbAckUri: 'fAllbAck:downloAd' },
			icon: { uri: 'uri:icon', fAllbAckUri: 'fAllbAck:icon' },
			license: { uri: 'uri:license', fAllbAckUri: 'fAllbAck:license' },
			repository: { uri: 'uri:repository', fAllbAckUri: 'fAllbAck:repository' },
			coreTrAnslAtions: []
		});

		testObject = AwAit AWorkbenchService();
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(expected));

		return testObject.queryGAllery(CAncellAtionToken.None).then(pAgedResponse => {
			Assert.equAl(1, pAgedResponse.firstPAge.length);
			const ActuAl = pAgedResponse.firstPAge[0];

			Assert.equAl(ExtensionType.User, ActuAl.type);
			Assert.equAl('expectedNAme', ActuAl.nAme);
			Assert.equAl('expectedDisplAyNAme', ActuAl.displAyNAme);
			Assert.equAl('expectedpublisher.expectednAme', ActuAl.identifier.id);
			Assert.equAl('expectedPublisher', ActuAl.publisher);
			Assert.equAl('expectedPublisherDisplAyNAme', ActuAl.publisherDisplAyNAme);
			Assert.equAl('1.5.0', ActuAl.version);
			Assert.equAl('1.5.0', ActuAl.lAtestVersion);
			Assert.equAl('expectedDescription', ActuAl.description);
			Assert.equAl('uri:icon', ActuAl.iconUrl);
			Assert.equAl('fAllbAck:icon', ActuAl.iconUrlFAllbAck);
			Assert.equAl('uri:license', ActuAl.licenseUrl);
			Assert.equAl(ExtensionStAte.UninstAlled, ActuAl.stAte);
			Assert.equAl(1000, ActuAl.instAllCount);
			Assert.equAl(4, ActuAl.rAting);
			Assert.equAl(100, ActuAl.rAtingCount);
			Assert.equAl(fAlse, ActuAl.outdAted);
			Assert.deepEquAl(['pub.1', 'pub.2'], ActuAl.dependencies);
		});
	});

	test('test for empty instAlled extensions', Async () => {
		testObject = AwAit AWorkbenchService();

		Assert.deepEquAl([], testObject.locAl);
	});

	test('test for instAlled extensions', Async () => {
		const expected1 = ALocAlExtension('locAl1', {
			publisher: 'locAlPublisher1',
			version: '1.1.0',
			displAyNAme: 'locAlDisplAyNAme1',
			description: 'locAlDescription1',
			icon: 'locAlIcon1',
			extensionDependencies: ['pub.1', 'pub.2'],
		}, {
			type: ExtensionType.User,
			reAdmeUrl: 'locAlReAdmeUrl1',
			chAngelogUrl: 'locAlChAngelogUrl1',
			locAtion: URI.file('locAlPAth1')
		});
		const expected2 = ALocAlExtension('locAl2', {
			publisher: 'locAlPublisher2',
			version: '1.2.0',
			displAyNAme: 'locAlDisplAyNAme2',
			description: 'locAlDescription2',
		}, {
			type: ExtensionType.System,
			reAdmeUrl: 'locAlReAdmeUrl2',
			chAngelogUrl: 'locAlChAngelogUrl2',
		});
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [expected1, expected2]);
		testObject = AwAit AWorkbenchService();

		const ActuAls = testObject.locAl;
		Assert.equAl(2, ActuAls.length);

		let ActuAl = ActuAls[0];
		Assert.equAl(ExtensionType.User, ActuAl.type);
		Assert.equAl('locAl1', ActuAl.nAme);
		Assert.equAl('locAlDisplAyNAme1', ActuAl.displAyNAme);
		Assert.equAl('locAlpublisher1.locAl1', ActuAl.identifier.id);
		Assert.equAl('locAlPublisher1', ActuAl.publisher);
		Assert.equAl('1.1.0', ActuAl.version);
		Assert.equAl('1.1.0', ActuAl.lAtestVersion);
		Assert.equAl('locAlDescription1', ActuAl.description);
		Assert.equAl('file:///locAlPAth1/locAlIcon1', ActuAl.iconUrl);
		Assert.equAl('file:///locAlPAth1/locAlIcon1', ActuAl.iconUrlFAllbAck);
		Assert.equAl(null, ActuAl.licenseUrl);
		Assert.equAl(ExtensionStAte.InstAlled, ActuAl.stAte);
		Assert.equAl(null, ActuAl.instAllCount);
		Assert.equAl(null, ActuAl.rAting);
		Assert.equAl(null, ActuAl.rAtingCount);
		Assert.equAl(fAlse, ActuAl.outdAted);
		Assert.deepEquAl(['pub.1', 'pub.2'], ActuAl.dependencies);

		ActuAl = ActuAls[1];
		Assert.equAl(ExtensionType.System, ActuAl.type);
		Assert.equAl('locAl2', ActuAl.nAme);
		Assert.equAl('locAlDisplAyNAme2', ActuAl.displAyNAme);
		Assert.equAl('locAlpublisher2.locAl2', ActuAl.identifier.id);
		Assert.equAl('locAlPublisher2', ActuAl.publisher);
		Assert.equAl('1.2.0', ActuAl.version);
		Assert.equAl('1.2.0', ActuAl.lAtestVersion);
		Assert.equAl('locAlDescription2', ActuAl.description);
		Assert.ok(fs.existsSync(URI.pArse(ActuAl.iconUrl).fsPAth));
		Assert.equAl(null, ActuAl.licenseUrl);
		Assert.equAl(ExtensionStAte.InstAlled, ActuAl.stAte);
		Assert.equAl(null, ActuAl.instAllCount);
		Assert.equAl(null, ActuAl.rAting);
		Assert.equAl(null, ActuAl.rAtingCount);
		Assert.equAl(fAlse, ActuAl.outdAted);
		Assert.deepEquAl([], ActuAl.dependencies);
	});

	test('test instAlled extensions get syncs with gAllery', Async () => {
		const locAl1 = ALocAlExtension('locAl1', {
			publisher: 'locAlPublisher1',
			version: '1.1.0',
			displAyNAme: 'locAlDisplAyNAme1',
			description: 'locAlDescription1',
			icon: 'locAlIcon1',
			extensionDependencies: ['pub.1', 'pub.2'],
		}, {
			type: ExtensionType.User,
			reAdmeUrl: 'locAlReAdmeUrl1',
			chAngelogUrl: 'locAlChAngelogUrl1',
			locAtion: URI.file('locAlPAth1')
		});
		const locAl2 = ALocAlExtension('locAl2', {
			publisher: 'locAlPublisher2',
			version: '1.2.0',
			displAyNAme: 'locAlDisplAyNAme2',
			description: 'locAlDescription2',
		}, {
			type: ExtensionType.System,
			reAdmeUrl: 'locAlReAdmeUrl2',
			chAngelogUrl: 'locAlChAngelogUrl2',
		});
		const gAllery1 = AGAlleryExtension(locAl1.mAnifest.nAme, {
			identifier: locAl1.identifier,
			displAyNAme: 'expectedDisplAyNAme',
			version: '1.5.0',
			publisherId: 'expectedPublisherId',
			publisher: locAl1.mAnifest.publisher,
			publisherDisplAyNAme: 'expectedPublisherDisplAyNAme',
			description: 'expectedDescription',
			instAllCount: 1000,
			rAting: 4,
			rAtingCount: 100
		}, {
			dependencies: ['pub.1'],
		}, {
			mAnifest: { uri: 'uri:mAnifest', fAllbAckUri: 'fAllbAck:mAnifest' },
			reAdme: { uri: 'uri:reAdme', fAllbAckUri: 'fAllbAck:reAdme' },
			chAngelog: { uri: 'uri:chAngelog', fAllbAckUri: 'fAllbAck:chAnglog' },
			downloAd: { uri: 'uri:downloAd', fAllbAckUri: 'fAllbAck:downloAd' },
			icon: { uri: 'uri:icon', fAllbAckUri: 'fAllbAck:icon' },
			license: { uri: 'uri:license', fAllbAckUri: 'fAllbAck:license' },
			repository: { uri: 'uri:repository', fAllbAckUri: 'fAllbAck:repository' },
			coreTrAnslAtions: []
		});
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl1, locAl2]);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(gAllery1));
		testObject = AwAit AWorkbenchService();
		AwAit testObject.queryLocAl();

		return eventToPromise(testObject.onChAnge).then(() => {
			const ActuAls = testObject.locAl;
			Assert.equAl(2, ActuAls.length);

			let ActuAl = ActuAls[0];
			Assert.equAl(ExtensionType.User, ActuAl.type);
			Assert.equAl('locAl1', ActuAl.nAme);
			Assert.equAl('expectedDisplAyNAme', ActuAl.displAyNAme);
			Assert.equAl('locAlpublisher1.locAl1', ActuAl.identifier.id);
			Assert.equAl('locAlPublisher1', ActuAl.publisher);
			Assert.equAl('1.1.0', ActuAl.version);
			Assert.equAl('1.5.0', ActuAl.lAtestVersion);
			Assert.equAl('expectedDescription', ActuAl.description);
			Assert.equAl('uri:icon', ActuAl.iconUrl);
			Assert.equAl('fAllbAck:icon', ActuAl.iconUrlFAllbAck);
			Assert.equAl(ExtensionStAte.InstAlled, ActuAl.stAte);
			Assert.equAl('uri:license', ActuAl.licenseUrl);
			Assert.equAl(1000, ActuAl.instAllCount);
			Assert.equAl(4, ActuAl.rAting);
			Assert.equAl(100, ActuAl.rAtingCount);
			Assert.equAl(true, ActuAl.outdAted);
			Assert.deepEquAl(['pub.1'], ActuAl.dependencies);

			ActuAl = ActuAls[1];
			Assert.equAl(ExtensionType.System, ActuAl.type);
			Assert.equAl('locAl2', ActuAl.nAme);
			Assert.equAl('locAlDisplAyNAme2', ActuAl.displAyNAme);
			Assert.equAl('locAlpublisher2.locAl2', ActuAl.identifier.id);
			Assert.equAl('locAlPublisher2', ActuAl.publisher);
			Assert.equAl('1.2.0', ActuAl.version);
			Assert.equAl('1.2.0', ActuAl.lAtestVersion);
			Assert.equAl('locAlDescription2', ActuAl.description);
			Assert.ok(fs.existsSync(URI.pArse(ActuAl.iconUrl).fsPAth));
			Assert.equAl(null, ActuAl.licenseUrl);
			Assert.equAl(ExtensionStAte.InstAlled, ActuAl.stAte);
			Assert.equAl(null, ActuAl.instAllCount);
			Assert.equAl(null, ActuAl.rAting);
			Assert.equAl(null, ActuAl.rAtingCount);
			Assert.equAl(fAlse, ActuAl.outdAted);
			Assert.deepEquAl([], ActuAl.dependencies);
		});
	});

	test('test extension stAte computAtion', Async () => {
		const gAllery = AGAlleryExtension('gAllery1');
		testObject = AwAit AWorkbenchService();
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(gAllery));

		return testObject.queryGAllery(CAncellAtionToken.None).then(pAge => {
			const extension = pAge.firstPAge[0];
			Assert.equAl(ExtensionStAte.UninstAlled, extension.stAte);

			testObject.instAll(extension);
			const identifier = gAllery.identifier;

			// InstAlling
			instAllEvent.fire({ identifier, gAllery });
			let locAl = testObject.locAl;
			Assert.equAl(1, locAl.length);
			const ActuAl = locAl[0];
			Assert.equAl(`${gAllery.publisher}.${gAllery.nAme}`, ActuAl.identifier.id);
			Assert.equAl(ExtensionStAte.InstAlling, ActuAl.stAte);

			// InstAlled
			didInstAllEvent.fire({ identifier, gAllery, operAtion: InstAllOperAtion.InstAll, locAl: ALocAlExtension(gAllery.nAme, gAllery, { identifier }) });
			Assert.equAl(ExtensionStAte.InstAlled, ActuAl.stAte);
			Assert.equAl(1, testObject.locAl.length);

			testObject.uninstAll(ActuAl);

			// UninstAlling
			uninstAllEvent.fire(identifier);
			Assert.equAl(ExtensionStAte.UninstAlling, ActuAl.stAte);

			// UninstAlled
			didUninstAllEvent.fire({ identifier });
			Assert.equAl(ExtensionStAte.UninstAlled, ActuAl.stAte);

			Assert.equAl(0, testObject.locAl.length);
		});
	});

	test('test extension doesnot show outdAted for system extensions', Async () => {
		const locAl = ALocAlExtension('A', { version: '1.0.1' }, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(AGAlleryExtension(locAl.mAnifest.nAme, { identifier: locAl.identifier, version: '1.0.2' })));
		testObject = AwAit AWorkbenchService();
		AwAit testObject.queryLocAl();

		Assert.ok(!testObject.locAl[0].outdAted);
	});

	test('test cAnInstAll returns fAlse for extensions with out gAllery', Async () => {
		const locAl = ALocAlExtension('A', { version: '1.0.1' }, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		testObject = AwAit AWorkbenchService();
		const tArget = testObject.locAl[0];
		testObject.uninstAll(tArget);
		uninstAllEvent.fire(locAl.identifier);
		didUninstAllEvent.fire({ identifier: locAl.identifier });

		Assert.ok(!testObject.cAnInstAll(tArget));
	});

	test('test cAnInstAll returns fAlse for A system extension', Async () => {
		const locAl = ALocAlExtension('A', { version: '1.0.1' }, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(AGAlleryExtension(locAl.mAnifest.nAme, { identifier: locAl.identifier })));
		testObject = AwAit AWorkbenchService();
		const tArget = testObject.locAl[0];

		Assert.ok(!testObject.cAnInstAll(tArget));
	});

	test('test cAnInstAll returns true for extensions with gAllery', Async () => {
		const locAl = ALocAlExtension('A', { version: '1.0.1' }, { type: ExtensionType.User });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(AGAlleryExtension(locAl.mAnifest.nAme, { identifier: locAl.identifier })));
		testObject = AwAit AWorkbenchService();
		const tArget = testObject.locAl[0];

		return eventToPromise(testObject.onChAnge).then(() => {
			Assert.ok(testObject.cAnInstAll(tArget));
		});
	});

	test('test onchAnge event is triggered while instAlling', Async () => {
		const gAllery = AGAlleryExtension('gAllery1');
		testObject = AwAit AWorkbenchService();
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(gAllery));
		const tArget = sinon.spy();

		return testObject.queryGAllery(CAncellAtionToken.None).then(pAge => {
			const extension = pAge.firstPAge[0];
			Assert.equAl(ExtensionStAte.UninstAlled, extension.stAte);

			testObject.instAll(extension);
			instAllEvent.fire({ identifier: gAllery.identifier, gAllery });
			testObject.onChAnge(tArget);

			// InstAlled
			didInstAllEvent.fire({ identifier: gAllery.identifier, gAllery, operAtion: InstAllOperAtion.InstAll, locAl: ALocAlExtension(gAllery.nAme, gAllery, gAllery) });

			Assert.ok(tArget.cAlledOnce);
		});
	});

	test('test onchAnge event is triggered when instAllAtion is finished', Async () => {
		const gAllery = AGAlleryExtension('gAllery1');
		testObject = AwAit AWorkbenchService();
		instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(gAllery));
		const tArget = sinon.spy();

		return testObject.queryGAllery(CAncellAtionToken.None).then(pAge => {
			const extension = pAge.firstPAge[0];
			Assert.equAl(ExtensionStAte.UninstAlled, extension.stAte);

			testObject.instAll(extension);
			testObject.onChAnge(tArget);

			// InstAlling
			instAllEvent.fire({ identifier: gAllery.identifier, gAllery });

			Assert.ok(tArget.cAlledOnce);
		});
	});

	test('test onchAnge event is triggered while uninstAlling', Async () => {
		const locAl = ALocAlExtension('A', {}, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		testObject = AwAit AWorkbenchService();
		const tArget = sinon.spy();

		testObject.uninstAll(testObject.locAl[0]);
		testObject.onChAnge(tArget);
		uninstAllEvent.fire(locAl.identifier);

		Assert.ok(tArget.cAlledOnce);
	});

	test('test onchAnge event is triggered when uninstAlling is finished', Async () => {
		const locAl = ALocAlExtension('A', {}, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		testObject = AwAit AWorkbenchService();
		const tArget = sinon.spy();

		testObject.uninstAll(testObject.locAl[0]);
		uninstAllEvent.fire(locAl.identifier);
		testObject.onChAnge(tArget);
		didUninstAllEvent.fire({ identifier: locAl.identifier });

		Assert.ok(tArget.cAlledOnce);
	});

	test('test uninstAlled extensions Are AlwAys enAbled', Async () => {
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				testObject = AwAit AWorkbenchService();
				instAntiAtionService.stubPromise(IExtensionGAlleryService, 'query', APAge(AGAlleryExtension('A')));
				return testObject.queryGAllery(CAncellAtionToken.None).then(pAgedResponse => {
					const ActuAl = pAgedResponse.firstPAge[0];
					Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
				});
			});
	});

	test('test enAblement stAte instAlled enAbled extension', Async () => {
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [ALocAlExtension('A')]);
				testObject = AwAit AWorkbenchService();

				const ActuAl = testObject.locAl[0];

				Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
			});
	});

	test('test workspAce disAbled extension', Async () => {
		const extensionA = ALocAlExtension('A');
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('d')], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledWorkspAce))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('e')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA]);
				testObject = AwAit AWorkbenchService();

				const ActuAl = testObject.locAl[0];

				Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledWorkspAce);
			});
	});

	test('test globAlly disAbled extension', Async () => {
		const locAlExtension = ALocAlExtension('A');
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('d')], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAlExtension]);
				testObject = AwAit AWorkbenchService();

				const ActuAl = testObject.locAl[0];

				Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
			});
	});

	test('test enAblement stAte is updAted for user extensions', Async () => {
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [ALocAlExtension('A')]);
				testObject = AwAit AWorkbenchService();
				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledWorkspAce)
					.then(() => {
						const ActuAl = testObject.locAl[0];
						Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledWorkspAce);
					});
			});
	});

	test('test enAble extension globAlly when extension is disAbled for workspAce', Async () => {
		const locAlExtension = ALocAlExtension('A');
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledWorkspAce)
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAlExtension]);
				testObject = AwAit AWorkbenchService();
				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						const ActuAl = testObject.locAl[0];
						Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test disAble extension globAlly', Async () => {
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [ALocAlExtension('A')]);
		testObject = AwAit AWorkbenchService();

		return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
			.then(() => {
				const ActuAl = testObject.locAl[0];
				Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
			});
	});

	test('test system extensions cAn be disAbled', Async () => {
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [ALocAlExtension('A', {}, { type: ExtensionType.System })]);
		testObject = AwAit AWorkbenchService();

		return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
			.then(() => {
				const ActuAl = testObject.locAl[0];
				Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
			});
	});

	test('test enAblement stAte is updAted on chAnge from outside', Async () => {
		const locAlExtension = ALocAlExtension('A');
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAlExtension]);
				testObject = AwAit AWorkbenchService();

				return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						const ActuAl = testObject.locAl[0];
						Assert.equAl(ActuAl.enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble extension with dependencies disAble only itself', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test disAble extension pAck disAbles the pAck', Async () => {
		const extensionA = ALocAlExtension('A', { extensionPAck: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble extension pAck disAble All', Async () => {
		const extensionA = ALocAlExtension('A', { extensionPAck: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble extension fAils if extension is A dependent of other', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();
				return testObject.setEnAblement(testObject.locAl[1], EnAblementStAte.DisAbledGlobAlly).then(() => Assert.fAil('Should fAil'), error => Assert.ok(true));
			});
	});

	test('test disAble extension when extension is pArt of A pAck', Async () => {
		const extensionA = ALocAlExtension('A', { extensionPAck: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();
				return testObject.setEnAblement(testObject.locAl[1], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble both dependency And dependent do not promot And do not fAil', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				const tArget = sinon.spy();
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement([testObject.locAl[1], testObject.locAl[0]], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.ok(!tArget.cAlled);
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test enAble both dependency And dependent do not promot And do not fAil', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				const tArget = sinon.spy();
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement([testObject.locAl[1], testObject.locAl[0]], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						Assert.ok(!tArget.cAlled);
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test disAble extension does not fAil if its dependency is A dependent of other but chosen to disAble only itself', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c', { extensionDependencies: ['pub.b'] });

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble extension if its dependency is A dependent of other disAbled extension', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c', { extensionDependencies: ['pub.b'] });

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
					});
			});
	});

	test('test disAble extension if its dependencys dependency is itself', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b', { extensionDependencies: ['pub.A'] });
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => Assert.fAil('An extension with dependent should not be disAbled'), () => null);
			});
	});

	test('test disAble extension if its dependency is dependent And is disAbled', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c', { extensionDependencies: ['pub.b'] });

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);

				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly));
			});
	});

	test('test disAble extension with cyclic dependencies', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b', { extensionDependencies: ['pub.c'] });
		const extensionC = ALocAlExtension('c', { extensionDependencies: ['pub.A'] });

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.EnAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.EnAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();
				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => Assert.fAil('An extension with dependent should not be disAbled'), () => null);
			});
	});

	test('test enAble extension with dependencies enAble All', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test enAble extension with dependencies does not prompt if dependency is enAbled AlreAdy', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.EnAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				const tArget = sinon.spy();
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						Assert.ok(!tArget.cAlled);
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test enAble extension with dependency does not prompt if both Are enAbled', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b');
		const extensionC = ALocAlExtension('c');

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);
				const tArget = sinon.spy();
				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement([testObject.locAl[1], testObject.locAl[0]], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						Assert.ok(!tArget.cAlled);
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test enAble extension with cyclic dependencies', Async () => {
		const extensionA = ALocAlExtension('A', { extensionDependencies: ['pub.b'] });
		const extensionB = ALocAlExtension('b', { extensionDependencies: ['pub.c'] });
		const extensionC = ALocAlExtension('c', { extensionDependencies: ['pub.A'] });

		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionA], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionB], EnAblementStAte.DisAbledGlobAlly))
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([extensionC], EnAblementStAte.DisAbledGlobAlly))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [extensionA, extensionB, extensionC]);

				testObject = AwAit AWorkbenchService();

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.EnAbledGlobAlly)
					.then(() => {
						Assert.equAl(testObject.locAl[0].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
						Assert.equAl(testObject.locAl[1].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
						Assert.equAl(testObject.locAl[2].enAblementStAte, EnAblementStAte.EnAbledGlobAlly);
					});
			});
	});

	test('test chAnge event is fired when disAblement flAgs Are chAnged', Async () => {
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [ALocAlExtension('A')]);
				testObject = AwAit AWorkbenchService();
				const tArget = sinon.spy();
				testObject.onChAnge(tArget);

				return testObject.setEnAblement(testObject.locAl[0], EnAblementStAte.DisAbledGlobAlly)
					.then(() => Assert.ok(tArget.cAlledOnce));
			});
	});

	test('test chAnge event is fired when disAblement flAgs Are chAnged from outside', Async () => {
		const locAlExtension = ALocAlExtension('A');
		return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('c')], EnAblementStAte.DisAbledGlobAlly)
			.then(() => instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([ALocAlExtension('b')], EnAblementStAte.DisAbledWorkspAce))
			.then(Async () => {
				instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAlExtension]);
				testObject = AwAit AWorkbenchService();
				const tArget = sinon.spy();
				testObject.onChAnge(tArget);

				return instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledGlobAlly)
					.then(() => Assert.ok(tArget.cAlledOnce));
			});
	});

	test('test updAting An extension does not re-eAnbles it when disAbled globAlly', Async () => {
		testObject = AwAit AWorkbenchService();
		const locAl = ALocAlExtension('pub.A');
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAl], EnAblementStAte.DisAbledGlobAlly);
		didInstAllEvent.fire({ locAl, identifier: locAl.identifier, operAtion: InstAllOperAtion.UpdAte });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		const ActuAl = AwAit testObject.queryLocAl();
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
	});

	test('test updAting An extension does not re-eAnbles it when workspAce disAbled', Async () => {
		testObject = AwAit AWorkbenchService();
		const locAl = ALocAlExtension('pub.A');
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAl], EnAblementStAte.DisAbledWorkspAce);
		didInstAllEvent.fire({ locAl, identifier: locAl.identifier, operAtion: InstAllOperAtion.UpdAte });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [locAl]);
		const ActuAl = AwAit testObject.queryLocAl();
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledWorkspAce);
	});

	test('test user extension is preferred when the sAme extension exists As system And user extension', Async () => {
		testObject = AwAit AWorkbenchService();
		const userExtension = ALocAlExtension('pub.A');
		const systemExtension = ALocAlExtension('pub.A', {}, { type: ExtensionType.System });
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [systemExtension, userExtension]);

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, userExtension);
	});

	test('test user extension is disAbled when the sAme extension exists As system And user extension And system extension is disAbled', Async () => {
		testObject = AwAit AWorkbenchService();
		const systemExtension = ALocAlExtension('pub.A', {}, { type: ExtensionType.System });
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([systemExtension], EnAblementStAte.DisAbledGlobAlly);
		const userExtension = ALocAlExtension('pub.A');
		instAntiAtionService.stubPromise(IExtensionMAnAgementService, 'getInstAlled', [systemExtension, userExtension]);

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, userExtension);
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
	});

	test('Test locAl ui extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl workspAce extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl web extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['web'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl ui,workspAce extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl workspAce,ui extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce', 'ui'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl ui,workspAce,web extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspAce', 'web'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl ui,web,workspAce extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'web', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl web,ui,workspAce extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['web', 'ui', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl web,workspAce,ui extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['web', 'workspAce', 'ui'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl workspAce,web,ui extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce', 'web', 'ui'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl workspAce,ui,web extension is chosen if it exists only in locAl server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce', 'ui', 'web'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl UI extension is chosen if it exists in both servers', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test locAl ui,workspAce extension is chosen if it exists in both servers', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test remote workspAce extension is chosen if it exists in remote server', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce'];
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService(), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, remoteExtension);
	});

	test('Test remote workspAce extension is chosen if it exists in both servers', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, remoteExtension);
	});

	test('Test remote workspAce extension is chosen if it exists in both servers And locAl is disAbled', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledGlobAlly);
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, remoteExtension);
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
	});

	test('Test remote workspAce extension is chosen if it exists in both servers And remote is disAbled in workspAce', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([remoteExtension], EnAblementStAte.DisAbledWorkspAce);
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, remoteExtension);
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledWorkspAce);
	});

	test('Test locAl ui, workspAce extension is chosen if it exists in both servers And locAl is disAbled', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledGlobAlly);
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledGlobAlly);
	});

	test('Test locAl ui, workspAce extension is chosen if it exists in both servers And locAl is disAbled in workspAce', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspAce'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		AwAit instAntiAtionService.get(IWorkbenchExtensionEnAblementService).setEnAblement([locAlExtension], EnAblementStAte.DisAbledWorkspAce);
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
		Assert.equAl(ActuAl[0].enAblementStAte, EnAblementStAte.DisAbledWorkspAce);
	});

	test('Test locAl web extension is chosen if it exists in both servers', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['web'];
		const locAlExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`) });
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([locAlExtension]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, locAlExtension);
	});

	test('Test remote web extension is chosen if it exists only in remote', Async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['web'];
		const remoteExtension = ALocAlExtension('A', { extensionKind }, { locAtion: URI.file(`pub.A`).with({ scheme: SchemAs.vscodeRemote }) });

		const extensionMAnAgementServerService = AMultiExtensionMAnAgementServerService(instAntiAtionService, creAteExtensionMAnAgementService([]), creAteExtensionMAnAgementService([remoteExtension]));
		instAntiAtionService.stub(IExtensionMAnAgementServerService, extensionMAnAgementServerService);
		instAntiAtionService.stub(IWorkbenchExtensionEnAblementService, new TestExtensionEnAblementService(instAntiAtionService));
		testObject = AwAit AWorkbenchService();

		const ActuAl = AwAit testObject.queryLocAl();

		Assert.equAl(ActuAl.length, 1);
		Assert.equAl(ActuAl[0].locAl, remoteExtension);
	});

	Async function AWorkbenchService(): Promise<ExtensionsWorkbenchService> {
		const workbenchService: ExtensionsWorkbenchService = instAntiAtionService.creAteInstAnce(ExtensionsWorkbenchService);
		AwAit workbenchService.queryLocAl();
		return workbenchService;
	}

	function ALocAlExtension(nAme: string = 'someext', mAnifest: Any = {}, properties: Any = {}): ILocAlExtension {
		mAnifest = { nAme, publisher: 'pub', version: '1.0.0', ...mAnifest };
		properties = {
			type: ExtensionType.User,
			locAtion: URI.file(`pub.${nAme}`),
			identifier: { id: getGAlleryExtensionId(mAnifest.publisher, mAnifest.nAme) },
			...properties
		};
		return <ILocAlExtension>Object.creAte({ mAnifest, ...properties });
	}

	const noAssets: IGAlleryExtensionAssets = {
		chAngelog: null,
		downloAd: null!,
		icon: null!,
		license: null,
		mAnifest: null,
		reAdme: null,
		repository: null,
		coreTrAnslAtions: []
	};

	function AGAlleryExtension(nAme: string, properties: Any = {}, gAlleryExtensionProperties: Any = {}, Assets: IGAlleryExtensionAssets = noAssets): IGAlleryExtension {
		const gAlleryExtension = <IGAlleryExtension>Object.creAte({ nAme, publisher: 'pub', version: '1.0.0', properties: {}, Assets: {}, ...properties });
		gAlleryExtension.properties = { ...gAlleryExtension.properties, dependencies: [], ...gAlleryExtensionProperties };
		gAlleryExtension.Assets = { ...gAlleryExtension.Assets, ...Assets };
		gAlleryExtension.identifier = { id: getGAlleryExtensionId(gAlleryExtension.publisher, gAlleryExtension.nAme), uuid: generAteUuid() };
		return <IGAlleryExtension>gAlleryExtension;
	}

	function APAge<T>(...objects: T[]): IPAger<T> {
		return { firstPAge: objects, totAl: objects.length, pAgeSize: objects.length, getPAge: () => null! };
	}

	function eventToPromise(event: Event<Any>, count: number = 1): Promise<void> {
		return new Promise<void>(c => {
			let counter = 0;
			event(() => {
				if (++counter === count) {
					c(undefined);
				}
			});
		});
	}

	function AMultiExtensionMAnAgementServerService(instAntiAtionService: TestInstAntiAtionService, locAlExtensionMAnAgementService?: IExtensionMAnAgementService, remoteExtensionMAnAgementService?: IExtensionMAnAgementService): IExtensionMAnAgementServerService {
		const locAlExtensionMAnAgementServer: IExtensionMAnAgementServer = {
			id: 'vscode-locAl',
			lAbel: 'locAl',
			extensionMAnAgementService: locAlExtensionMAnAgementService || creAteExtensionMAnAgementService()
		};
		const remoteExtensionMAnAgementServer: IExtensionMAnAgementServer = {
			id: 'vscode-remote',
			lAbel: 'remote',
			extensionMAnAgementService: remoteExtensionMAnAgementService || creAteExtensionMAnAgementService()
		};
		return {
			_serviceBrAnd: undefined,
			locAlExtensionMAnAgementServer,
			remoteExtensionMAnAgementServer,
			webExtensionMAnAgementServer: null,
			getExtensionMAnAgementServer: (extension: IExtension) => {
				if (extension.locAtion.scheme === SchemAs.file) {
					return locAlExtensionMAnAgementServer;
				}
				if (extension.locAtion.scheme === SchemAs.vscodeRemote) {
					return remoteExtensionMAnAgementServer;
				}
				throw new Error('');
			}
		};
	}

	function creAteExtensionMAnAgementService(instAlled: ILocAlExtension[] = []): IExtensionMAnAgementService {
		return <IExtensionMAnAgementService>{
			onInstAllExtension: Event.None,
			onDidInstAllExtension: Event.None,
			onUninstAllExtension: Event.None,
			onDidUninstAllExtension: Event.None,
			getInstAlled: () => Promise.resolve<ILocAlExtension[]>(instAlled),
			instAllFromGAllery: (extension: IGAlleryExtension) => Promise.reject(new Error('not supported')),
			updAteMetAdAtA: Async (locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA) => {
				locAl.identifier.uuid = metAdAtA.id;
				locAl.publisherDisplAyNAme = metAdAtA.publisherDisplAyNAme;
				locAl.publisherId = metAdAtA.publisherId;
				return locAl;
			}
		};
	}
});
