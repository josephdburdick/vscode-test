/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as assert from 'assert';
import * as fs from 'fs';
import { generateUuid } from 'vs/Base/common/uuid';
import { IExtensionsWorkBenchService, ExtensionState, AutoCheckUpdatesConfigurationKey, AutoUpdateConfigurationKey } from 'vs/workBench/contriB/extensions/common/extensions';
import { ExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/Browser/extensionsWorkBenchService';
import {
	IExtensionManagementService, IExtensionGalleryService, ILocalExtension, IGalleryExtension,
	DidInstallExtensionEvent, DidUninstallExtensionEvent, InstallExtensionEvent, IGalleryExtensionAssets, IExtensionIdentifier, InstallOperation, IExtensionTipsService, IGalleryMetadata
} from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IExtensionManagementServerService, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { TestExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/test/Browser/extensionEnaBlementService.test';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { IURLService } from 'vs/platform/url/common/url';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { Event, Emitter } from 'vs/Base/common/event';
import { IPager } from 'vs/Base/common/paging';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { TestSharedProcessService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { ProgressService } from 'vs/workBench/services/progress/Browser/progressService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { NativeURLService } from 'vs/platform/url/common/urlService';
import { URI } from 'vs/Base/common/uri';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ExtensionType, IExtension, ExtensionKind } from 'vs/platform/extensions/common/extensions';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { RemoteAgentService } from 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { IStorageKeysSyncRegistryService, StorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { IProductService } from 'vs/platform/product/common/productService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { TestLifecycleService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { IExperimentService } from 'vs/workBench/contriB/experiments/common/experimentService';
import { TestExperimentService } from 'vs/workBench/contriB/experiments/test/electron-Browser/experimentService.test';
import { ExtensionTipsService } from 'vs/platform/extensionManagement/electron-sandBox/extensionTipsService';
import { Schemas } from 'vs/Base/common/network';

suite('ExtensionsWorkBenchServiceTest', () => {

	let instantiationService: TestInstantiationService;
	let testOBject: IExtensionsWorkBenchService;

	let installEvent: Emitter<InstallExtensionEvent>,
		didInstallEvent: Emitter<DidInstallExtensionEvent>,
		uninstallEvent: Emitter<IExtensionIdentifier>,
		didUninstallEvent: Emitter<DidUninstallExtensionEvent>;

	suiteSetup(() => {
		installEvent = new Emitter<InstallExtensionEvent>();
		didInstallEvent = new Emitter<DidInstallExtensionEvent>();
		uninstallEvent = new Emitter<IExtensionIdentifier>();
		didUninstallEvent = new Emitter<DidUninstallExtensionEvent>();

		instantiationService = new TestInstantiationService();
		instantiationService.stuB(ITelemetryService, NullTelemetryService);
		instantiationService.stuB(ILogService, NullLogService);
		instantiationService.stuB(IProgressService, ProgressService);
		instantiationService.stuB(IStorageKeysSyncRegistryService, new StorageKeysSyncRegistryService());
		instantiationService.stuB(IProductService, {});

		instantiationService.stuB(IExtensionGalleryService, ExtensionGalleryService);
		instantiationService.stuB(IURLService, NativeURLService);
		instantiationService.stuB(ISharedProcessService, TestSharedProcessService);

		instantiationService.stuB(IWorkspaceContextService, new TestContextService());
		instantiationService.stuB(IConfigurationService, <Partial<IConfigurationService>>{
			onDidChangeConfiguration: () => { return undefined!; },
			getValue: (key?: string) => {
				return (key === AutoCheckUpdatesConfigurationKey || key === AutoUpdateConfigurationKey) ? true : undefined;
			}
		});

		instantiationService.stuB(IRemoteAgentService, RemoteAgentService);

		instantiationService.stuB(IExtensionManagementService, <Partial<IExtensionManagementService>>{
			onInstallExtension: installEvent.event,
			onDidInstallExtension: didInstallEvent.event,
			onUninstallExtension: uninstallEvent.event,
			onDidUninstallExtension: didUninstallEvent.event,
			async getInstalled() { return []; },
			async getExtensionsReport() { return []; },
			async updateMetadata(local: ILocalExtension, metadata: IGalleryMetadata) {
				local.identifier.uuid = metadata.id;
				local.puBlisherDisplayName = metadata.puBlisherDisplayName;
				local.puBlisherId = metadata.puBlisherId;
				return local;
			}
		});

		instantiationService.stuB(IExtensionManagementServerService, <IExtensionManagementServerService>{
			localExtensionManagementServer: {
				extensionManagementService: instantiationService.get(IExtensionManagementService)
			}
		});

		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));

		instantiationService.stuB(ILifecycleService, new TestLifecycleService());
		instantiationService.stuB(IExperimentService, instantiationService.createInstance(TestExperimentService));
		instantiationService.stuB(IExtensionTipsService, instantiationService.createInstance(ExtensionTipsService));
		instantiationService.stuB(IExtensionRecommendationsService, {});

		instantiationService.stuB(INotificationService, { prompt: () => null! });
	});

	setup(async () => {
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', []);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
		instantiationService.stuBPromise(INotificationService, 'prompt', 0);
		await (<TestExtensionEnaBlementService>instantiationService.get(IWorkBenchExtensionEnaBlementService)).reset();
	});

	teardown(() => {
		(<ExtensionsWorkBenchService>testOBject).dispose();
	});

	test('test gallery extension', async () => {
		const expected = aGalleryExtension('expectedName', {
			displayName: 'expectedDisplayName',
			version: '1.5.0',
			puBlisherId: 'expectedPuBlisherId',
			puBlisher: 'expectedPuBlisher',
			puBlisherDisplayName: 'expectedPuBlisherDisplayName',
			description: 'expectedDescription',
			installCount: 1000,
			rating: 4,
			ratingCount: 100
		}, {
			dependencies: ['puB.1', 'puB.2'],
		}, {
			manifest: { uri: 'uri:manifest', fallBackUri: 'fallBack:manifest' },
			readme: { uri: 'uri:readme', fallBackUri: 'fallBack:readme' },
			changelog: { uri: 'uri:changelog', fallBackUri: 'fallBack:changlog' },
			download: { uri: 'uri:download', fallBackUri: 'fallBack:download' },
			icon: { uri: 'uri:icon', fallBackUri: 'fallBack:icon' },
			license: { uri: 'uri:license', fallBackUri: 'fallBack:license' },
			repository: { uri: 'uri:repository', fallBackUri: 'fallBack:repository' },
			coreTranslations: []
		});

		testOBject = await aWorkBenchService();
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(expected));

		return testOBject.queryGallery(CancellationToken.None).then(pagedResponse => {
			assert.equal(1, pagedResponse.firstPage.length);
			const actual = pagedResponse.firstPage[0];

			assert.equal(ExtensionType.User, actual.type);
			assert.equal('expectedName', actual.name);
			assert.equal('expectedDisplayName', actual.displayName);
			assert.equal('expectedpuBlisher.expectedname', actual.identifier.id);
			assert.equal('expectedPuBlisher', actual.puBlisher);
			assert.equal('expectedPuBlisherDisplayName', actual.puBlisherDisplayName);
			assert.equal('1.5.0', actual.version);
			assert.equal('1.5.0', actual.latestVersion);
			assert.equal('expectedDescription', actual.description);
			assert.equal('uri:icon', actual.iconUrl);
			assert.equal('fallBack:icon', actual.iconUrlFallBack);
			assert.equal('uri:license', actual.licenseUrl);
			assert.equal(ExtensionState.Uninstalled, actual.state);
			assert.equal(1000, actual.installCount);
			assert.equal(4, actual.rating);
			assert.equal(100, actual.ratingCount);
			assert.equal(false, actual.outdated);
			assert.deepEqual(['puB.1', 'puB.2'], actual.dependencies);
		});
	});

	test('test for empty installed extensions', async () => {
		testOBject = await aWorkBenchService();

		assert.deepEqual([], testOBject.local);
	});

	test('test for installed extensions', async () => {
		const expected1 = aLocalExtension('local1', {
			puBlisher: 'localPuBlisher1',
			version: '1.1.0',
			displayName: 'localDisplayName1',
			description: 'localDescription1',
			icon: 'localIcon1',
			extensionDependencies: ['puB.1', 'puB.2'],
		}, {
			type: ExtensionType.User,
			readmeUrl: 'localReadmeUrl1',
			changelogUrl: 'localChangelogUrl1',
			location: URI.file('localPath1')
		});
		const expected2 = aLocalExtension('local2', {
			puBlisher: 'localPuBlisher2',
			version: '1.2.0',
			displayName: 'localDisplayName2',
			description: 'localDescription2',
		}, {
			type: ExtensionType.System,
			readmeUrl: 'localReadmeUrl2',
			changelogUrl: 'localChangelogUrl2',
		});
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [expected1, expected2]);
		testOBject = await aWorkBenchService();

		const actuals = testOBject.local;
		assert.equal(2, actuals.length);

		let actual = actuals[0];
		assert.equal(ExtensionType.User, actual.type);
		assert.equal('local1', actual.name);
		assert.equal('localDisplayName1', actual.displayName);
		assert.equal('localpuBlisher1.local1', actual.identifier.id);
		assert.equal('localPuBlisher1', actual.puBlisher);
		assert.equal('1.1.0', actual.version);
		assert.equal('1.1.0', actual.latestVersion);
		assert.equal('localDescription1', actual.description);
		assert.equal('file:///localPath1/localIcon1', actual.iconUrl);
		assert.equal('file:///localPath1/localIcon1', actual.iconUrlFallBack);
		assert.equal(null, actual.licenseUrl);
		assert.equal(ExtensionState.Installed, actual.state);
		assert.equal(null, actual.installCount);
		assert.equal(null, actual.rating);
		assert.equal(null, actual.ratingCount);
		assert.equal(false, actual.outdated);
		assert.deepEqual(['puB.1', 'puB.2'], actual.dependencies);

		actual = actuals[1];
		assert.equal(ExtensionType.System, actual.type);
		assert.equal('local2', actual.name);
		assert.equal('localDisplayName2', actual.displayName);
		assert.equal('localpuBlisher2.local2', actual.identifier.id);
		assert.equal('localPuBlisher2', actual.puBlisher);
		assert.equal('1.2.0', actual.version);
		assert.equal('1.2.0', actual.latestVersion);
		assert.equal('localDescription2', actual.description);
		assert.ok(fs.existsSync(URI.parse(actual.iconUrl).fsPath));
		assert.equal(null, actual.licenseUrl);
		assert.equal(ExtensionState.Installed, actual.state);
		assert.equal(null, actual.installCount);
		assert.equal(null, actual.rating);
		assert.equal(null, actual.ratingCount);
		assert.equal(false, actual.outdated);
		assert.deepEqual([], actual.dependencies);
	});

	test('test installed extensions get syncs with gallery', async () => {
		const local1 = aLocalExtension('local1', {
			puBlisher: 'localPuBlisher1',
			version: '1.1.0',
			displayName: 'localDisplayName1',
			description: 'localDescription1',
			icon: 'localIcon1',
			extensionDependencies: ['puB.1', 'puB.2'],
		}, {
			type: ExtensionType.User,
			readmeUrl: 'localReadmeUrl1',
			changelogUrl: 'localChangelogUrl1',
			location: URI.file('localPath1')
		});
		const local2 = aLocalExtension('local2', {
			puBlisher: 'localPuBlisher2',
			version: '1.2.0',
			displayName: 'localDisplayName2',
			description: 'localDescription2',
		}, {
			type: ExtensionType.System,
			readmeUrl: 'localReadmeUrl2',
			changelogUrl: 'localChangelogUrl2',
		});
		const gallery1 = aGalleryExtension(local1.manifest.name, {
			identifier: local1.identifier,
			displayName: 'expectedDisplayName',
			version: '1.5.0',
			puBlisherId: 'expectedPuBlisherId',
			puBlisher: local1.manifest.puBlisher,
			puBlisherDisplayName: 'expectedPuBlisherDisplayName',
			description: 'expectedDescription',
			installCount: 1000,
			rating: 4,
			ratingCount: 100
		}, {
			dependencies: ['puB.1'],
		}, {
			manifest: { uri: 'uri:manifest', fallBackUri: 'fallBack:manifest' },
			readme: { uri: 'uri:readme', fallBackUri: 'fallBack:readme' },
			changelog: { uri: 'uri:changelog', fallBackUri: 'fallBack:changlog' },
			download: { uri: 'uri:download', fallBackUri: 'fallBack:download' },
			icon: { uri: 'uri:icon', fallBackUri: 'fallBack:icon' },
			license: { uri: 'uri:license', fallBackUri: 'fallBack:license' },
			repository: { uri: 'uri:repository', fallBackUri: 'fallBack:repository' },
			coreTranslations: []
		});
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local1, local2]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery1));
		testOBject = await aWorkBenchService();
		await testOBject.queryLocal();

		return eventToPromise(testOBject.onChange).then(() => {
			const actuals = testOBject.local;
			assert.equal(2, actuals.length);

			let actual = actuals[0];
			assert.equal(ExtensionType.User, actual.type);
			assert.equal('local1', actual.name);
			assert.equal('expectedDisplayName', actual.displayName);
			assert.equal('localpuBlisher1.local1', actual.identifier.id);
			assert.equal('localPuBlisher1', actual.puBlisher);
			assert.equal('1.1.0', actual.version);
			assert.equal('1.5.0', actual.latestVersion);
			assert.equal('expectedDescription', actual.description);
			assert.equal('uri:icon', actual.iconUrl);
			assert.equal('fallBack:icon', actual.iconUrlFallBack);
			assert.equal(ExtensionState.Installed, actual.state);
			assert.equal('uri:license', actual.licenseUrl);
			assert.equal(1000, actual.installCount);
			assert.equal(4, actual.rating);
			assert.equal(100, actual.ratingCount);
			assert.equal(true, actual.outdated);
			assert.deepEqual(['puB.1'], actual.dependencies);

			actual = actuals[1];
			assert.equal(ExtensionType.System, actual.type);
			assert.equal('local2', actual.name);
			assert.equal('localDisplayName2', actual.displayName);
			assert.equal('localpuBlisher2.local2', actual.identifier.id);
			assert.equal('localPuBlisher2', actual.puBlisher);
			assert.equal('1.2.0', actual.version);
			assert.equal('1.2.0', actual.latestVersion);
			assert.equal('localDescription2', actual.description);
			assert.ok(fs.existsSync(URI.parse(actual.iconUrl).fsPath));
			assert.equal(null, actual.licenseUrl);
			assert.equal(ExtensionState.Installed, actual.state);
			assert.equal(null, actual.installCount);
			assert.equal(null, actual.rating);
			assert.equal(null, actual.ratingCount);
			assert.equal(false, actual.outdated);
			assert.deepEqual([], actual.dependencies);
		});
	});

	test('test extension state computation', async () => {
		const gallery = aGalleryExtension('gallery1');
		testOBject = await aWorkBenchService();
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return testOBject.queryGallery(CancellationToken.None).then(page => {
			const extension = page.firstPage[0];
			assert.equal(ExtensionState.Uninstalled, extension.state);

			testOBject.install(extension);
			const identifier = gallery.identifier;

			// Installing
			installEvent.fire({ identifier, gallery });
			let local = testOBject.local;
			assert.equal(1, local.length);
			const actual = local[0];
			assert.equal(`${gallery.puBlisher}.${gallery.name}`, actual.identifier.id);
			assert.equal(ExtensionState.Installing, actual.state);

			// Installed
			didInstallEvent.fire({ identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension(gallery.name, gallery, { identifier }) });
			assert.equal(ExtensionState.Installed, actual.state);
			assert.equal(1, testOBject.local.length);

			testOBject.uninstall(actual);

			// Uninstalling
			uninstallEvent.fire(identifier);
			assert.equal(ExtensionState.Uninstalling, actual.state);

			// Uninstalled
			didUninstallEvent.fire({ identifier });
			assert.equal(ExtensionState.Uninstalled, actual.state);

			assert.equal(0, testOBject.local.length);
		});
	});

	test('test extension doesnot show outdated for system extensions', async () => {
		const local = aLocalExtension('a', { version: '1.0.1' }, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier, version: '1.0.2' })));
		testOBject = await aWorkBenchService();
		await testOBject.queryLocal();

		assert.ok(!testOBject.local[0].outdated);
	});

	test('test canInstall returns false for extensions with out gallery', async () => {
		const local = aLocalExtension('a', { version: '1.0.1' }, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		testOBject = await aWorkBenchService();
		const target = testOBject.local[0];
		testOBject.uninstall(target);
		uninstallEvent.fire(local.identifier);
		didUninstallEvent.fire({ identifier: local.identifier });

		assert.ok(!testOBject.canInstall(target));
	});

	test('test canInstall returns false for a system extension', async () => {
		const local = aLocalExtension('a', { version: '1.0.1' }, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier })));
		testOBject = await aWorkBenchService();
		const target = testOBject.local[0];

		assert.ok(!testOBject.canInstall(target));
	});

	test('test canInstall returns true for extensions with gallery', async () => {
		const local = aLocalExtension('a', { version: '1.0.1' }, { type: ExtensionType.User });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension(local.manifest.name, { identifier: local.identifier })));
		testOBject = await aWorkBenchService();
		const target = testOBject.local[0];

		return eventToPromise(testOBject.onChange).then(() => {
			assert.ok(testOBject.canInstall(target));
		});
	});

	test('test onchange event is triggered while installing', async () => {
		const gallery = aGalleryExtension('gallery1');
		testOBject = await aWorkBenchService();
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const target = sinon.spy();

		return testOBject.queryGallery(CancellationToken.None).then(page => {
			const extension = page.firstPage[0];
			assert.equal(ExtensionState.Uninstalled, extension.state);

			testOBject.install(extension);
			installEvent.fire({ identifier: gallery.identifier, gallery });
			testOBject.onChange(target);

			// Installed
			didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension(gallery.name, gallery, gallery) });

			assert.ok(target.calledOnce);
		});
	});

	test('test onchange event is triggered when installation is finished', async () => {
		const gallery = aGalleryExtension('gallery1');
		testOBject = await aWorkBenchService();
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const target = sinon.spy();

		return testOBject.queryGallery(CancellationToken.None).then(page => {
			const extension = page.firstPage[0];
			assert.equal(ExtensionState.Uninstalled, extension.state);

			testOBject.install(extension);
			testOBject.onChange(target);

			// Installing
			installEvent.fire({ identifier: gallery.identifier, gallery });

			assert.ok(target.calledOnce);
		});
	});

	test('test onchange event is triggered while uninstalling', async () => {
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		testOBject = await aWorkBenchService();
		const target = sinon.spy();

		testOBject.uninstall(testOBject.local[0]);
		testOBject.onChange(target);
		uninstallEvent.fire(local.identifier);

		assert.ok(target.calledOnce);
	});

	test('test onchange event is triggered when uninstalling is finished', async () => {
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		testOBject = await aWorkBenchService();
		const target = sinon.spy();

		testOBject.uninstall(testOBject.local[0]);
		uninstallEvent.fire(local.identifier);
		testOBject.onChange(target);
		didUninstallEvent.fire({ identifier: local.identifier });

		assert.ok(target.calledOnce);
	});

	test('test uninstalled extensions are always enaBled', async () => {
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				testOBject = await aWorkBenchService();
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
				return testOBject.queryGallery(CancellationToken.None).then(pagedResponse => {
					const actual = pagedResponse.firstPage[0];
					assert.equal(actual.enaBlementState, EnaBlementState.EnaBledGloBally);
				});
			});
	});

	test('test enaBlement state installed enaBled extension', async () => {
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
				testOBject = await aWorkBenchService();

				const actual = testOBject.local[0];

				assert.equal(actual.enaBlementState, EnaBlementState.EnaBledGloBally);
			});
	});

	test('test workspace disaBled extension', async () => {
		const extensionA = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('d')], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledWorkspace))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('e')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA]);
				testOBject = await aWorkBenchService();

				const actual = testOBject.local[0];

				assert.equal(actual.enaBlementState, EnaBlementState.DisaBledWorkspace);
			});
	});

	test('test gloBally disaBled extension', async () => {
		const localExtension = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('d')], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
				testOBject = await aWorkBenchService();

				const actual = testOBject.local[0];

				assert.equal(actual.enaBlementState, EnaBlementState.DisaBledGloBally);
			});
	});

	test('test enaBlement state is updated for user extensions', async () => {
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
				testOBject = await aWorkBenchService();
				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledWorkspace)
					.then(() => {
						const actual = testOBject.local[0];
						assert.equal(actual.enaBlementState, EnaBlementState.DisaBledWorkspace);
					});
			});
	});

	test('test enaBle extension gloBally when extension is disaBled for workspace', async () => {
		const localExtension = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledWorkspace)
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
				testOBject = await aWorkBenchService();
				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.EnaBledGloBally)
					.then(() => {
						const actual = testOBject.local[0];
						assert.equal(actual.enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test disaBle extension gloBally', async () => {
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
		testOBject = await aWorkBenchService();

		return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
			.then(() => {
				const actual = testOBject.local[0];
				assert.equal(actual.enaBlementState, EnaBlementState.DisaBledGloBally);
			});
	});

	test('test system extensions can Be disaBled', async () => {
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a', {}, { type: ExtensionType.System })]);
		testOBject = await aWorkBenchService();

		return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
			.then(() => {
				const actual = testOBject.local[0];
				assert.equal(actual.enaBlementState, EnaBlementState.DisaBledGloBally);
			});
	});

	test('test enaBlement state is updated on change from outside', async () => {
		const localExtension = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
				testOBject = await aWorkBenchService();

				return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledGloBally)
					.then(() => {
						const actual = testOBject.local[0];
						assert.equal(actual.enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle extension with dependencies disaBle only itself', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test disaBle extension pack disaBles the pack', async () => {
		const extensionA = aLocalExtension('a', { extensionPack: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle extension pack disaBle all', async () => {
		const extensionA = aLocalExtension('a', { extensionPack: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle extension fails if extension is a dependent of other', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();
				return testOBject.setEnaBlement(testOBject.local[1], EnaBlementState.DisaBledGloBally).then(() => assert.fail('Should fail'), error => assert.ok(true));
			});
	});

	test('test disaBle extension when extension is part of a pack', async () => {
		const extensionA = aLocalExtension('a', { extensionPack: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();
				return testOBject.setEnaBlement(testOBject.local[1], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle Both dependency and dependent do not promot and do not fail', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				const target = sinon.spy();
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement([testOBject.local[1], testOBject.local[0]], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.ok(!target.called);
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test enaBle Both dependency and dependent do not promot and do not fail', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				const target = sinon.spy();
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement([testOBject.local[1], testOBject.local[0]], EnaBlementState.EnaBledGloBally)
					.then(() => {
						assert.ok(!target.called);
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.EnaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test disaBle extension does not fail if its dependency is a dependent of other But chosen to disaBle only itself', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c', { extensionDependencies: ['puB.B'] });

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle extension if its dependency is a dependent of other disaBled extension', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c', { extensionDependencies: ['puB.B'] });

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally);
					});
			});
	});

	test('test disaBle extension if its dependencys dependency is itself', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B', { extensionDependencies: ['puB.a'] });
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => assert.fail('An extension with dependent should not Be disaBled'), () => null);
			});
	});

	test('test disaBle extension if its dependency is dependent and is disaBled', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c', { extensionDependencies: ['puB.B'] });

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);

				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.DisaBledGloBally));
			});
	});

	test('test disaBle extension with cyclic dependencies', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B', { extensionDependencies: ['puB.c'] });
		const extensionC = aLocalExtension('c', { extensionDependencies: ['puB.a'] });

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.EnaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.EnaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();
				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => assert.fail('An extension with dependent should not Be disaBled'), () => null);
			});
	});

	test('test enaBle extension with dependencies enaBle all', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.EnaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.EnaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test enaBle extension with dependencies does not prompt if dependency is enaBled already', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.EnaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				const target = sinon.spy();
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.EnaBledGloBally)
					.then(() => {
						assert.ok(!target.called);
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test enaBle extension with dependency does not prompt if Both are enaBled', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B');
		const extensionC = aLocalExtension('c');

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);
				const target = sinon.spy();
				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement([testOBject.local[1], testOBject.local[0]], EnaBlementState.EnaBledGloBally)
					.then(() => {
						assert.ok(!target.called);
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.EnaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test enaBle extension with cyclic dependencies', async () => {
		const extensionA = aLocalExtension('a', { extensionDependencies: ['puB.B'] });
		const extensionB = aLocalExtension('B', { extensionDependencies: ['puB.c'] });
		const extensionC = aLocalExtension('c', { extensionDependencies: ['puB.a'] });

		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionA], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionB], EnaBlementState.DisaBledGloBally))
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([extensionC], EnaBlementState.DisaBledGloBally))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [extensionA, extensionB, extensionC]);

				testOBject = await aWorkBenchService();

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.EnaBledGloBally)
					.then(() => {
						assert.equal(testOBject.local[0].enaBlementState, EnaBlementState.EnaBledGloBally);
						assert.equal(testOBject.local[1].enaBlementState, EnaBlementState.EnaBledGloBally);
						assert.equal(testOBject.local[2].enaBlementState, EnaBlementState.EnaBledGloBally);
					});
			});
	});

	test('test change event is fired when disaBlement flags are changed', async () => {
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a')]);
				testOBject = await aWorkBenchService();
				const target = sinon.spy();
				testOBject.onChange(target);

				return testOBject.setEnaBlement(testOBject.local[0], EnaBlementState.DisaBledGloBally)
					.then(() => assert.ok(target.calledOnce));
			});
	});

	test('test change event is fired when disaBlement flags are changed from outside', async () => {
		const localExtension = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('c')], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([aLocalExtension('B')], EnaBlementState.DisaBledWorkspace))
			.then(async () => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localExtension]);
				testOBject = await aWorkBenchService();
				const target = sinon.spy();
				testOBject.onChange(target);

				return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledGloBally)
					.then(() => assert.ok(target.calledOnce));
			});
	});

	test('test updating an extension does not re-eanBles it when disaBled gloBally', async () => {
		testOBject = await aWorkBenchService();
		const local = aLocalExtension('puB.a');
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally);
		didInstallEvent.fire({ local, identifier: local.identifier, operation: InstallOperation.Update });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const actual = await testOBject.queryLocal();
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledGloBally);
	});

	test('test updating an extension does not re-eanBles it when workspace disaBled', async () => {
		testOBject = await aWorkBenchService();
		const local = aLocalExtension('puB.a');
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace);
		didInstallEvent.fire({ local, identifier: local.identifier, operation: InstallOperation.Update });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const actual = await testOBject.queryLocal();
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledWorkspace);
	});

	test('test user extension is preferred when the same extension exists as system and user extension', async () => {
		testOBject = await aWorkBenchService();
		const userExtension = aLocalExtension('puB.a');
		const systemExtension = aLocalExtension('puB.a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [systemExtension, userExtension]);

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, userExtension);
	});

	test('test user extension is disaBled when the same extension exists as system and user extension and system extension is disaBled', async () => {
		testOBject = await aWorkBenchService();
		const systemExtension = aLocalExtension('puB.a', {}, { type: ExtensionType.System });
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([systemExtension], EnaBlementState.DisaBledGloBally);
		const userExtension = aLocalExtension('puB.a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [systemExtension, userExtension]);

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, userExtension);
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledGloBally);
	});

	test('Test local ui extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local workspace extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local weB extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['weB'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local ui,workspace extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local workspace,ui extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace', 'ui'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local ui,workspace,weB extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspace', 'weB'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local ui,weB,workspace extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'weB', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local weB,ui,workspace extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['weB', 'ui', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local weB,workspace,ui extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['weB', 'workspace', 'ui'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local workspace,weB,ui extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace', 'weB', 'ui'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local workspace,ui,weB extension is chosen if it exists only in local server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace', 'ui', 'weB'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local UI extension is chosen if it exists in Both servers', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test local ui,workspace extension is chosen if it exists in Both servers', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test remote workspace extension is chosen if it exists in remote server', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace'];
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, remoteExtension);
	});

	test('Test remote workspace extension is chosen if it exists in Both servers', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, remoteExtension);
	});

	test('Test remote workspace extension is chosen if it exists in Both servers and local is disaBled', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledGloBally);
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, remoteExtension);
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledGloBally);
	});

	test('Test remote workspace extension is chosen if it exists in Both servers and remote is disaBled in workspace', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([remoteExtension], EnaBlementState.DisaBledWorkspace);
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, remoteExtension);
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledWorkspace);
	});

	test('Test local ui, workspace extension is chosen if it exists in Both servers and local is disaBled', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledGloBally);
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledGloBally);
	});

	test('Test local ui, workspace extension is chosen if it exists in Both servers and local is disaBled in workspace', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['ui', 'workspace'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localExtension], EnaBlementState.DisaBledWorkspace);
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
		assert.equal(actual[0].enaBlementState, EnaBlementState.DisaBledWorkspace);
	});

	test('Test local weB extension is chosen if it exists in Both servers', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['weB'];
		const localExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`) });
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, localExtension);
	});

	test('Test remote weB extension is chosen if it exists only in remote', async () => {
		// multi server setup
		const extensionKind: ExtensionKind[] = ['weB'];
		const remoteExtension = aLocalExtension('a', { extensionKind }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });

		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		testOBject = await aWorkBenchService();

		const actual = await testOBject.queryLocal();

		assert.equal(actual.length, 1);
		assert.equal(actual[0].local, remoteExtension);
	});

	async function aWorkBenchService(): Promise<ExtensionsWorkBenchService> {
		const workBenchService: ExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		await workBenchService.queryLocal();
		return workBenchService;
	}

	function aLocalExtension(name: string = 'someext', manifest: any = {}, properties: any = {}): ILocalExtension {
		manifest = { name, puBlisher: 'puB', version: '1.0.0', ...manifest };
		properties = {
			type: ExtensionType.User,
			location: URI.file(`puB.${name}`),
			identifier: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name) },
			...properties
		};
		return <ILocalExtension>OBject.create({ manifest, ...properties });
	}

	const noAssets: IGalleryExtensionAssets = {
		changelog: null,
		download: null!,
		icon: null!,
		license: null,
		manifest: null,
		readme: null,
		repository: null,
		coreTranslations: []
	};

	function aGalleryExtension(name: string, properties: any = {}, galleryExtensionProperties: any = {}, assets: IGalleryExtensionAssets = noAssets): IGalleryExtension {
		const galleryExtension = <IGalleryExtension>OBject.create({ name, puBlisher: 'puB', version: '1.0.0', properties: {}, assets: {}, ...properties });
		galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], ...galleryExtensionProperties };
		galleryExtension.assets = { ...galleryExtension.assets, ...assets };
		galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.puBlisher, galleryExtension.name), uuid: generateUuid() };
		return <IGalleryExtension>galleryExtension;
	}

	function aPage<T>(...oBjects: T[]): IPager<T> {
		return { firstPage: oBjects, total: oBjects.length, pageSize: oBjects.length, getPage: () => null! };
	}

	function eventToPromise(event: Event<any>, count: numBer = 1): Promise<void> {
		return new Promise<void>(c => {
			let counter = 0;
			event(() => {
				if (++counter === count) {
					c(undefined);
				}
			});
		});
	}

	function aMultiExtensionManagementServerService(instantiationService: TestInstantiationService, localExtensionManagementService?: IExtensionManagementService, remoteExtensionManagementService?: IExtensionManagementService): IExtensionManagementServerService {
		const localExtensionManagementServer: IExtensionManagementServer = {
			id: 'vscode-local',
			laBel: 'local',
			extensionManagementService: localExtensionManagementService || createExtensionManagementService()
		};
		const remoteExtensionManagementServer: IExtensionManagementServer = {
			id: 'vscode-remote',
			laBel: 'remote',
			extensionManagementService: remoteExtensionManagementService || createExtensionManagementService()
		};
		return {
			_serviceBrand: undefined,
			localExtensionManagementServer,
			remoteExtensionManagementServer,
			weBExtensionManagementServer: null,
			getExtensionManagementServer: (extension: IExtension) => {
				if (extension.location.scheme === Schemas.file) {
					return localExtensionManagementServer;
				}
				if (extension.location.scheme === Schemas.vscodeRemote) {
					return remoteExtensionManagementServer;
				}
				throw new Error('');
			}
		};
	}

	function createExtensionManagementService(installed: ILocalExtension[] = []): IExtensionManagementService {
		return <IExtensionManagementService>{
			onInstallExtension: Event.None,
			onDidInstallExtension: Event.None,
			onUninstallExtension: Event.None,
			onDidUninstallExtension: Event.None,
			getInstalled: () => Promise.resolve<ILocalExtension[]>(installed),
			installFromGallery: (extension: IGalleryExtension) => Promise.reject(new Error('not supported')),
			updateMetadata: async (local: ILocalExtension, metadata: IGalleryMetadata) => {
				local.identifier.uuid = metadata.id;
				local.puBlisherDisplayName = metadata.puBlisherDisplayName;
				local.puBlisherId = metadata.puBlisherId;
				return local;
			}
		};
	}
});
