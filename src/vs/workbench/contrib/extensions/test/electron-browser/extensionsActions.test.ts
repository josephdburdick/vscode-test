/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { generateUuid } from 'vs/Base/common/uuid';
import { IExtensionsWorkBenchService, ExtensionContainers } from 'vs/workBench/contriB/extensions/common/extensions';
import * as ExtensionsActions from 'vs/workBench/contriB/extensions/Browser/extensionsActions';
import { ExtensionsWorkBenchService } from 'vs/workBench/contriB/extensions/Browser/extensionsWorkBenchService';
import {
	IExtensionManagementService, IExtensionGalleryService, ILocalExtension, IGalleryExtension,
	DidInstallExtensionEvent, DidUninstallExtensionEvent, InstallExtensionEvent, IExtensionIdentifier, InstallOperation, IExtensionTipsService, IGalleryMetadata
} from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IExtensionManagementServerService, IExtensionManagementServer } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { IExtensionRecommendationsService } from 'vs/workBench/services/extensionRecommendations/common/extensionRecommendations';
import { getGalleryExtensionId } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { TestExtensionEnaBlementService } from 'vs/workBench/services/extensionManagement/test/Browser/extensionEnaBlementService.test';
import { ExtensionGalleryService } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { IURLService } from 'vs/platform/url/common/url';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { Emitter, Event } from 'vs/Base/common/event';
import { IPager } from 'vs/Base/common/paging';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IExtensionService, toExtensionDescription } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { TestSharedProcessService } from 'vs/workBench/test/electron-Browser/workBenchTestServices';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { NativeURLService } from 'vs/platform/url/common/urlService';
import { URI } from 'vs/Base/common/uri';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { RemoteAgentService } from 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import { ExtensionIdentifier, IExtensionContriButions, ExtensionType, IExtensionDescription, IExtension } from 'vs/platform/extensions/common/extensions';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ILaBelService, IFormatterChangeEvent } from 'vs/platform/laBel/common/laBel';
import { ExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/electron-Browser/extensionManagementServerService';
import { IProductService } from 'vs/platform/product/common/productService';
import { Schemas } from 'vs/Base/common/network';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { ProgressService } from 'vs/workBench/services/progress/Browser/progressService';
import { IStorageKeysSyncRegistryService, StorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { TestExperimentService } from 'vs/workBench/contriB/experiments/test/electron-Browser/experimentService.test';
import { IExperimentService } from 'vs/workBench/contriB/experiments/common/experimentService';
import { ExtensionTipsService } from 'vs/platform/extensionManagement/electron-sandBox/extensionTipsService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { TestLifecycleService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

let instantiationService: TestInstantiationService;
let installEvent: Emitter<InstallExtensionEvent>,
	didInstallEvent: Emitter<DidInstallExtensionEvent>,
	uninstallEvent: Emitter<IExtensionIdentifier>,
	didUninstallEvent: Emitter<DidUninstallExtensionEvent>;

let disposaBles: DisposaBleStore;

async function setupTest() {
	disposaBles = new DisposaBleStore();
	installEvent = new Emitter<InstallExtensionEvent>();
	didInstallEvent = new Emitter<DidInstallExtensionEvent>();
	uninstallEvent = new Emitter<IExtensionIdentifier>();
	didUninstallEvent = new Emitter<DidUninstallExtensionEvent>();

	instantiationService = new TestInstantiationService();
	instantiationService.stuB(ITelemetryService, NullTelemetryService);
	instantiationService.stuB(ILogService, NullLogService);

	instantiationService.stuB(IWorkspaceContextService, new TestContextService());
	instantiationService.stuB(IConfigurationService, new TestConfigurationService());
	instantiationService.stuB(IProgressService, ProgressService);
	instantiationService.stuB(IStorageKeysSyncRegistryService, new StorageKeysSyncRegistryService());
	instantiationService.stuB(IProductService, {});

	instantiationService.stuB(IExtensionGalleryService, ExtensionGalleryService);
	instantiationService.stuB(ISharedProcessService, TestSharedProcessService);

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

	instantiationService.stuB(IRemoteAgentService, RemoteAgentService);

	instantiationService.stuB(IExtensionManagementServerService, new class extends ExtensionManagementServerService {
		#localExtensionManagementServer: IExtensionManagementServer = { extensionManagementService: instantiationService.get(IExtensionManagementService), laBel: 'local', id: 'vscode-local' };
		constructor() {
			super(instantiationService.get(ISharedProcessService), instantiationService.get(IRemoteAgentService), instantiationService.get(ILaBelService), instantiationService);
		}
		get localExtensionManagementServer(): IExtensionManagementServer { return this.#localExtensionManagementServer; }
		set localExtensionManagementServer(server: IExtensionManagementServer) { }
	}());

	instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
	instantiationService.stuB(ILaBelService, { onDidChangeFormatters: new Emitter<IFormatterChangeEvent>().event });

	instantiationService.stuB(ILifecycleService, new TestLifecycleService());
	instantiationService.stuB(IExperimentService, instantiationService.createInstance(TestExperimentService));
	instantiationService.stuB(IExtensionTipsService, instantiationService.createInstance(ExtensionTipsService));
	instantiationService.stuB(IExtensionRecommendationsService, {});
	instantiationService.stuB(IURLService, NativeURLService);

	instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage());
	instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{ getExtensions: () => Promise.resolve([]), onDidChangeExtensions: new Emitter<void>().event, canAddExtension: (extension: IExtensionDescription) => false, canRemoveExtension: (extension: IExtensionDescription) => false });
	(<TestExtensionEnaBlementService>instantiationService.get(IWorkBenchExtensionEnaBlementService)).reset();

	instantiationService.set(IExtensionsWorkBenchService, disposaBles.add(instantiationService.createInstance(ExtensionsWorkBenchService)));
}


suite('ExtensionsActions', () => {

	setup(setupTest);
	teardown(() => disposaBles.dispose());

	test('Install action is disaBled when there is no extension', () => {
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);

		assert.ok(!testOBject.enaBled);
	});

	test('Test Install action when state is installed', () => {
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		return workBenchService.queryLocal()
			.then(() => {
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier })));
				return workBenchService.queryGallery(CancellationToken.None)
					.then((paged) => {
						testOBject.extension = paged.firstPage[0];
						assert.ok(!testOBject.enaBled);
						assert.equal('Install', testOBject.laBel);
						assert.equal('extension-action laBel prominent install', testOBject.class);
					});
			});
	});

	test('Test Install action when state is installing', () => {
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		return workBenchService.queryGallery(CancellationToken.None)
			.then((paged) => {
				testOBject.extension = paged.firstPage[0];
				installEvent.fire({ identifier: gallery.identifier, gallery });

				assert.ok(!testOBject.enaBled);
				assert.equal('Installing', testOBject.laBel);
				assert.equal('extension-action laBel install installing', testOBject.class);
			});
	});

	test('Test Install action when state is uninstalled', () => {
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		return workBenchService.queryGallery(CancellationToken.None)
			.then((paged) => {
				testOBject.extension = paged.firstPage[0];
				assert.ok(testOBject.enaBled);
				assert.equal('Install', testOBject.laBel);
			});
	});

	test('Test Install action when extension is system action', () => {
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				uninstallEvent.fire(local.identifier);
				didUninstallEvent.fire({ identifier: local.identifier });
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test Install action when extension doesnot has gallery', () => {
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.InstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				uninstallEvent.fire(local.identifier);
				didUninstallEvent.fire({ identifier: local.identifier });
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Uninstall action is disaBled when there is no extension', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		assert.ok(!testOBject.enaBled);
	});

	test('Test Uninstall action when state is uninstalling', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				uninstallEvent.fire(local.identifier);
				assert.ok(!testOBject.enaBled);
				assert.equal('Uninstalling', testOBject.laBel);
				assert.equal('extension-action laBel uninstall uninstalling', testOBject.class);
			});
	});

	test('Test Uninstall action when state is installed and is user extension', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
				assert.equal('Uninstall', testOBject.laBel);
				assert.equal('extension-action laBel uninstall', testOBject.class);
			});
	});

	test('Test Uninstall action when state is installed and is system extension', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
				assert.equal('Uninstall', testOBject.laBel);
				assert.equal('extension-action laBel uninstall', testOBject.class);
			});
	});

	test('Test Uninstall action when state is installing and is user extension', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const gallery = aGalleryExtension('a');
				const extension = extensions[0];
				extension.gallery = gallery;
				installEvent.fire({ identifier: gallery.identifier, gallery });
				testOBject.extension = extension;
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test Uninstall action after extension is installed', () => {
		const testOBject: ExtensionsActions.UninstallAction = instantiationService.createInstance(ExtensionsActions.UninstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(paged => {
				testOBject.extension = paged.firstPage[0];

				installEvent.fire({ identifier: gallery.identifier, gallery });
				didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });

				assert.ok(testOBject.enaBled);
				assert.equal('Uninstall', testOBject.laBel);
				assert.equal('extension-action laBel uninstall', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when there is no extension', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		assert.ok(!testOBject.enaBled);
		assert.equal('extension-action laBel prominent install no-extension', testOBject.class);
	});

	test('Test ComBinedInstallAction when extension is system extension', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
				assert.equal('extension-action laBel prominent install no-extension', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when installAction is enaBled', () => {
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return workBenchService.queryGallery(CancellationToken.None)
			.then((paged) => {
				testOBject.extension = paged.firstPage[0];
				assert.ok(testOBject.enaBled);
				assert.equal('Install', testOBject.laBel);
				assert.equal('extension-action laBel prominent install', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when unInstallAction is enaBled', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
				assert.equal('Uninstall', testOBject.laBel);
				assert.equal('extension-action laBel uninstall', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when state is installing', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		return workBenchService.queryGallery(CancellationToken.None)
			.then((paged) => {
				testOBject.extension = paged.firstPage[0];
				installEvent.fire({ identifier: gallery.identifier, gallery });

				assert.ok(!testOBject.enaBled);
				assert.equal('Installing', testOBject.laBel);
				assert.equal('extension-action laBel install installing', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when state is installing during update', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const gallery = aGalleryExtension('a');
				const extension = extensions[0];
				extension.gallery = gallery;
				testOBject.extension = extension;
				installEvent.fire({ identifier: gallery.identifier, gallery });
				assert.ok(!testOBject.enaBled);
				assert.equal('Installing', testOBject.laBel);
				assert.equal('extension-action laBel install installing', testOBject.class);
			});
	});

	test('Test ComBinedInstallAction when state is uninstalling', () => {
		const testOBject: ExtensionsActions.ComBinedInstallAction = instantiationService.createInstance(ExtensionsActions.ComBinedInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				uninstallEvent.fire(local.identifier);
				assert.ok(!testOBject.enaBled);
				assert.equal('Uninstalling', testOBject.laBel);
				assert.equal('extension-action laBel uninstall uninstalling', testOBject.class);
			});
	});

	test('Test UpdateAction when there is no extension', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		assert.ok(!testOBject.enaBled);
	});

	test('Test UpdateAction when extension is uninstalled', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a', { version: '1.0.0' });
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then((paged) => {
				testOBject.extension = paged.firstPage[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test UpdateAction when extension is installed and not outdated', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.0' });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: local.manifest.version })));
				return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
					.then(extensions => assert.ok(!testOBject.enaBled));
			});
	});

	test('Test UpdateAction when extension is installed outdated and system extension', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.0' }, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' })));
				return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
					.then(extensions => assert.ok(!testOBject.enaBled));
			});
	});

	test('Test UpdateAction when extension is installed outdated and user extension', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.0' });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		return workBenchService.queryLocal()
			.then(async extensions => {
				testOBject.extension = extensions[0];
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' })));
				assert.ok(!testOBject.enaBled);
				return new Promise<void>(c => {
					testOBject.onDidChange(() => {
						if (testOBject.enaBled) {
							c();
						}
					});
					instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None);
				});
			});
	});

	test('Test UpdateAction when extension is installing and outdated and user extension', () => {
		const testOBject: ExtensionsActions.UpdateAction = instantiationService.createInstance(ExtensionsActions.UpdateAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.0' });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.1' });
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
				return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
					.then(extensions => {
						installEvent.fire({ identifier: local.identifier, gallery });
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test ManageExtensionAction when there is no extension', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		assert.ok(!testOBject.enaBled);
	});

	test('Test ManageExtensionAction when extension is installed', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear', testOBject.class);
				assert.equal('', testOBject.tooltip);
			});
	});

	test('Test ManageExtensionAction when extension is uninstalled', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				testOBject.extension = page.firstPage[0];
				assert.ok(!testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear hide', testOBject.class);
				assert.equal('', testOBject.tooltip);
			});
	});

	test('Test ManageExtensionAction when extension is installing', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				testOBject.extension = page.firstPage[0];

				installEvent.fire({ identifier: gallery.identifier, gallery });
				assert.ok(!testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear hide', testOBject.class);
				assert.equal('', testOBject.tooltip);
			});
	});

	test('Test ManageExtensionAction when extension is queried from gallery and installed', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				testOBject.extension = page.firstPage[0];
				installEvent.fire({ identifier: gallery.identifier, gallery });
				didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });

				assert.ok(testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear', testOBject.class);
				assert.equal('', testOBject.tooltip);
			});
	});

	test('Test ManageExtensionAction when extension is system extension', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', {}, { type: ExtensionType.System });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear', testOBject.class);
				assert.equal('', testOBject.tooltip);
			});
	});

	test('Test ManageExtensionAction when extension is uninstalling', () => {
		const testOBject: ExtensionsActions.ManageExtensionAction = instantiationService.createInstance(ExtensionsActions.ManageExtensionAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				testOBject.extension = extensions[0];
				uninstallEvent.fire(local.identifier);

				assert.ok(!testOBject.enaBled);
				assert.equal('extension-action icon manage codicon-gear', testOBject.class);
				assert.equal('Uninstalling', testOBject.tooltip);
			});
	});

	test('Test EnaBleForWorkspaceAction when there is no extension', () => {
		const testOBject: ExtensionsActions.EnaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.EnaBleForWorkspaceAction);

		assert.ok(!testOBject.enaBled);
	});

	test('Test EnaBleForWorkspaceAction when there extension is not disaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.EnaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.EnaBleForWorkspaceAction);
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test EnaBleForWorkspaceAction when the extension is disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.EnaBleForWorkspaceAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleForWorkspaceAction when extension is disaBled for workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.EnaBleForWorkspaceAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleForWorkspaceAction when the extension is disaBled gloBally and workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace))
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.EnaBleForWorkspaceAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleGloBallyAction when there is no extension', () => {
		const testOBject: ExtensionsActions.EnaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.EnaBleGloBallyAction);

		assert.ok(!testOBject.enaBled);
	});

	test('Test EnaBleGloBallyAction when the extension is not disaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.EnaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.EnaBleGloBallyAction);
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test EnaBleGloBallyAction when the extension is disaBled for workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.EnaBleGloBallyAction);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleGloBallyAction when the extension is disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.EnaBleGloBallyAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleGloBallyAction when the extension is disaBled in Both', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace))
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.EnaBleGloBallyAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleAction when there is no extension', () => {
		const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);

		assert.ok(!testOBject.enaBled);
	});

	test('Test EnaBleDropDownAction when extension is installed and enaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
				testOBject.extension = extensions[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test EnaBleDropDownAction when extension is installed and disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleDropDownAction when extension is installed and disaBled for workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
						testOBject.extension = extensions[0];
						assert.ok(testOBject.enaBled);
					});
			});
	});

	test('Test EnaBleDropDownAction when extension is uninstalled', () => {
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
				testOBject.extension = page.firstPage[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test EnaBleDropDownAction when extension is installing', () => {
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
				testOBject.extension = page.firstPage[0];
				instantiationService.createInstance(ExtensionContainers, [testOBject]);

				installEvent.fire({ identifier: gallery.identifier, gallery });
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test EnaBleDropDownAction when extension is uninstalling', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.EnaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.EnaBleDropDownAction);
				testOBject.extension = extensions[0];
				uninstallEvent.fire(local.identifier);
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test DisaBleForWorkspaceAction when there is no extension', () => {
		const testOBject: ExtensionsActions.DisaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.DisaBleForWorkspaceAction, []);

		assert.ok(!testOBject.enaBled);
	});

	test('Test DisaBleForWorkspaceAction when the extension is disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.DisaBleForWorkspaceAction, []);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleForWorkspaceAction when the extension is disaBled workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.DisaBleForWorkspaceAction, []);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleForWorkspaceAction when extension is enaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.DisaBleForWorkspaceAction = instantiationService.createInstance(ExtensionsActions.DisaBleForWorkspaceAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
			});
	});

	test('Test DisaBleGloBallyAction when there is no extension', () => {
		const testOBject: ExtensionsActions.DisaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.DisaBleGloBallyAction, []);

		assert.ok(!testOBject.enaBled);
	});

	test('Test DisaBleGloBallyAction when the extension is disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.DisaBleGloBallyAction, []);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleGloBallyAction when the extension is disaBled for workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.DisaBleGloBallyAction, []);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleGloBallyAction when the extension is enaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.DisaBleGloBallyAction = instantiationService.createInstance(ExtensionsActions.DisaBleGloBallyAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
			});
	});

	test('Test DisaBleDropDownAction when there is no extension', () => {
		const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, []);

		assert.ok(!testOBject.enaBled);
	});

	test('Test DisaBleDropDownAction when extension is installed and enaBled', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = extensions[0];
				assert.ok(testOBject.enaBled);
			});
	});

	test('Test DisaBleDropDownAction when extension is installed and disaBled gloBally', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleDropDownAction when extension is installed and disaBled for workspace', () => {
		const local = aLocalExtension('a');
		return instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledWorkspace)
			.then(() => {
				instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

				return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
					.then(extensions => {
						const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
						testOBject.extension = extensions[0];
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test('Test DisaBleDropDownAction when extension is uninstalled', () => {
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = page.firstPage[0];
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test DisaBleDropDownAction when extension is installing', () => {
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		return instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None)
			.then(page => {
				const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = page.firstPage[0];
				instantiationService.createInstance(ExtensionContainers, [testOBject]);
				installEvent.fire({ identifier: gallery.identifier, gallery });
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test DisaBleDropDownAction when extension is uninstalling', () => {
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => {
				const testOBject: ExtensionsActions.DisaBleDropDownAction = instantiationService.createInstance(ExtensionsActions.DisaBleDropDownAction, [{ identifier: new ExtensionIdentifier('puB.a'), extensionLocation: URI.file('puB.a') }]);
				testOBject.extension = extensions[0];
				instantiationService.createInstance(ExtensionContainers, [testOBject]);
				uninstallEvent.fire(local.identifier);
				assert.ok(!testOBject.enaBled);
			});
	});

	test('Test UpdateAllAction when no installed extensions', () => {
		const testOBject: ExtensionsActions.UpdateAllAction = instantiationService.createInstance(ExtensionsActions.UpdateAllAction, 'id', 'laBel');

		assert.ok(!testOBject.enaBled);
	});

	test('Test UpdateAllAction when installed extensions are not outdated', () => {
		const testOBject: ExtensionsActions.UpdateAllAction = instantiationService.createInstance(ExtensionsActions.UpdateAllAction, 'id', 'laBel');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [aLocalExtension('a'), aLocalExtension('B')]);
		return instantiationService.get(IExtensionsWorkBenchService).queryLocal()
			.then(extensions => assert.ok(!testOBject.enaBled));
	});

	test('Test UpdateAllAction when some installed extensions are outdated', () => {
		const testOBject: ExtensionsActions.UpdateAllAction = instantiationService.createInstance(ExtensionsActions.UpdateAllAction, 'id', 'laBel');
		const local = [aLocalExtension('a', { version: '1.0.1' }), aLocalExtension('B', { version: '1.0.1' }), aLocalExtension('c', { version: '1.0.1' })];
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', local);
		return workBenchService.queryLocal()
			.then(async () => {
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: local[0].identifier, version: '1.0.2' }), aGalleryExtension('B', { identifier: local[1].identifier, version: '1.0.2' }), aGalleryExtension('c', local[2].manifest)));
				assert.ok(!testOBject.enaBled);
				return new Promise<void>(c => {
					testOBject.onDidChange(() => {
						if (testOBject.enaBled) {
							c();
						}
					});
					workBenchService.queryGallery(CancellationToken.None);
				});
			});
	});

	test('Test UpdateAllAction when some installed extensions are outdated and some outdated are Being installed', () => {
		const testOBject: ExtensionsActions.UpdateAllAction = instantiationService.createInstance(ExtensionsActions.UpdateAllAction, 'id', 'laBel');
		const local = [aLocalExtension('a', { version: '1.0.1' }), aLocalExtension('B', { version: '1.0.1' }), aLocalExtension('c', { version: '1.0.1' })];
		const gallery = [aGalleryExtension('a', { identifier: local[0].identifier, version: '1.0.2' }), aGalleryExtension('B', { identifier: local[1].identifier, version: '1.0.2' }), aGalleryExtension('c', local[2].manifest)];
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', local);
		return workBenchService.queryLocal()
			.then(async () => {
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...gallery));
				assert.ok(!testOBject.enaBled);
				return new Promise<void>(c => {
					installEvent.fire({ identifier: local[0].identifier, gallery: gallery[0] });
					testOBject.onDidChange(() => {
						if (testOBject.enaBled) {
							c();
						}
					});
					workBenchService.queryGallery(CancellationToken.None);
				});
			});
	});

	test('Test UpdateAllAction when some installed extensions are outdated and all outdated are Being installed', () => {
		const testOBject: ExtensionsActions.UpdateAllAction = instantiationService.createInstance(ExtensionsActions.UpdateAllAction, 'id', 'laBel');
		const local = [aLocalExtension('a', { version: '1.0.1' }), aLocalExtension('B', { version: '1.0.1' }), aLocalExtension('c', { version: '1.0.1' })];
		const gallery = [aGalleryExtension('a', { identifier: local[0].identifier, version: '1.0.2' }), aGalleryExtension('B', { identifier: local[1].identifier, version: '1.0.2' }), aGalleryExtension('c', local[2].manifest)];
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', local);
		return workBenchService.queryLocal()
			.then(() => {
				instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(...gallery));
				return workBenchService.queryGallery(CancellationToken.None)
					.then(() => {
						installEvent.fire({ identifier: local[0].identifier, gallery: gallery[0] });
						installEvent.fire({ identifier: local[1].identifier, gallery: gallery[1] });
						assert.ok(!testOBject.enaBled);
					});
			});
	});

	test(`RecommendToFolderAction`, () => {
		// TODO: Implement test
	});

});

suite('ReloadAction', () => {

	setup(setupTest);
	teardown(() => disposaBles.dispose());

	test('Test ReloadAction when there is no extension', () => {
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension state is installing', async () => {
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const paged = await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = paged.firstPage[0];
		installEvent.fire({ identifier: gallery.identifier, gallery });

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension state is uninstalling', async () => {
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);

		const extensions = await instantiationService.get(IExtensionsWorkBenchService).queryLocal();
		testOBject.extension = extensions[0];
		uninstallEvent.fire(local.identifier);
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is newly installed', async () => {
		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		const runningExtensions = [toExtensionDescription(aLocalExtension('B'))];
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve(runningExtensions),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		const paged = await instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None);
		testOBject.extension = paged.firstPage[0];
		assert.ok(!testOBject.enaBled);

		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });
		assert.ok(testOBject.enaBled);
		assert.equal(testOBject.tooltip, 'Please reload Visual Studio Code to enaBle this extension.');
	});

	test('Test ReloadAction when extension is newly installed and reload is not required', async () => {
		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		const runningExtensions = [toExtensionDescription(aLocalExtension('B'))];
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve(runningExtensions),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => true
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		const paged = await instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None);
		testOBject.extension = paged.firstPage[0];
		assert.ok(!testOBject.enaBled);

		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is installed and uninstalled', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const paged = await instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None);

		testOBject.extension = paged.firstPage[0];
		const identifier = gallery.identifier;
		installEvent.fire({ identifier, gallery });
		didInstallEvent.fire({ identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, { identifier }) });
		uninstallEvent.fire(identifier);
		didUninstallEvent.fire({ identifier });

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is uninstalled', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await instantiationService.get(IExtensionsWorkBenchService).queryLocal();
		testOBject.extension = extensions[0];

		uninstallEvent.fire(local.identifier);
		didUninstallEvent.fire({ identifier: local.identifier });
		assert.ok(testOBject.enaBled);
		assert.equal(testOBject.tooltip, 'Please reload Visual Studio Code to complete the uninstallation of this extension.');
	});

	test('Test ReloadAction when extension is uninstalled and can Be removed', async () => {
		const local = aLocalExtension('a');
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(local)]),
			onDidChangeExtensions: new Emitter<void>().event,
			canRemoveExtension: (extension) => true,
			canAddExtension: (extension) => true
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await instantiationService.get(IExtensionsWorkBenchService).queryLocal();
		testOBject.extension = extensions[0];

		uninstallEvent.fire(local.identifier);
		didUninstallEvent.fire({ identifier: local.identifier });
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is uninstalled and installed', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await instantiationService.get(IExtensionsWorkBenchService).queryLocal();

		testOBject.extension = extensions[0];
		uninstallEvent.fire(local.identifier);
		didUninstallEvent.fire({ identifier: local.identifier });

		const gallery = aGalleryExtension('a');
		const identifier = gallery.identifier;
		installEvent.fire({ identifier, gallery });
		didInstallEvent.fire({ identifier, gallery, operation: InstallOperation.Install, local });

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is updated while running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.1' });
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];

		return new Promise<void>(c => {
			testOBject.onDidChange(() => {
				if (testOBject.enaBled && testOBject.tooltip === 'Please reload Visual Studio Code to enaBle the updated extension.') {
					c();
				}
			});
			const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
			installEvent.fire({ identifier: gallery.identifier, gallery });
			didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });
		});
	});

	test('Test ReloadAction when extension is updated when not running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const local = aLocalExtension('a', { version: '1.0.1' });
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];

		const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Update, local: aLocalExtension('a', gallery, gallery) });

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is disaBled when running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a'))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.DisaBledGloBally);
		await testOBject.update();

		assert.ok(testOBject.enaBled);
		assert.equal('Please reload Visual Studio Code to disaBle this extension.', testOBject.tooltip);
	});

	test('Test ReloadAction when extension enaBlement is toggled when running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a', { version: '1.0.0' }))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a');
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.DisaBledGloBally);
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.EnaBledGloBally);
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is enaBled when not running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const local = aLocalExtension('a');
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.EnaBledGloBally);
		await testOBject.update();
		assert.ok(testOBject.enaBled);
		assert.equal('Please reload Visual Studio Code to enaBle this extension.', testOBject.tooltip);
	});

	test('Test ReloadAction when extension enaBlement is toggled when not running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const local = aLocalExtension('a');
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.EnaBledGloBally);
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.DisaBledGloBally);
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is updated when not running and enaBled', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const local = aLocalExtension('a', { version: '1.0.1' });
		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([local], EnaBlementState.DisaBledGloBally);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];

		const gallery = aGalleryExtension('a', { identifier: local.identifier, version: '1.0.2' });
		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', gallery, gallery) });
		await workBenchService.setEnaBlement(extensions[0], EnaBlementState.EnaBledGloBally);
		await testOBject.update();
		assert.ok(testOBject.enaBled);
		assert.equal('Please reload Visual Studio Code to enaBle this extension.', testOBject.tooltip);
	});

	test('Test ReloadAction when a localization extension is newly installed', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('B'))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const gallery = aGalleryExtension('a');
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		const paged = await instantiationService.get(IExtensionsWorkBenchService).queryGallery(CancellationToken.None);
		testOBject.extension = paged.firstPage[0];
		assert.ok(!testOBject.enaBled);

		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', { ...gallery, ...{ contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } } }, gallery) });
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when a localization extension is updated while running', async () => {
		instantiationService.stuBPromise(IExtensionService, 'getExtensions', [toExtensionDescription(aLocalExtension('a', { version: '1.0.1' }))]);
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		const local = aLocalExtension('a', { version: '1.0.1', contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } });
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [local]);
		const extensions = await workBenchService.queryLocal();
		testOBject.extension = extensions[0];

		const gallery = aGalleryExtension('a', { uuid: local.identifier.id, version: '1.0.2' });
		installEvent.fire({ identifier: gallery.identifier, gallery });
		didInstallEvent.fire({ identifier: gallery.identifier, gallery, operation: InstallOperation.Install, local: aLocalExtension('a', { ...gallery, ...{ contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } } }, gallery) });
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is not installed But extension from different server is installed and running', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a') });
		const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		const runningExtensions = [toExtensionDescription(remoteExtension)];
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve(runningExtensions),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when extension is uninstalled But extension from different server is installed and running', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a') });
		const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const localExtensionManagementService = createExtensionManagementService([localExtension]);
		const uninstallEvent = new Emitter<IExtensionIdentifier>();
		const onDidUninstallEvent = new Emitter<{ identifier: IExtensionIdentifier }>();
		localExtensionManagementService.onUninstallExtension = uninstallEvent.event;
		localExtensionManagementService.onDidUninstallExtension = onDidUninstallEvent.event;
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		const runningExtensions = [toExtensionDescription(remoteExtension)];
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve(runningExtensions),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);

		uninstallEvent.fire(localExtension.identifier);
		didUninstallEvent.fire({ identifier: localExtension.identifier });

		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction when workspace extension is disaBled on local server and installed in remote server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const remoteExtensionManagementService = createExtensionManagementService([]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		remoteExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const localExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a') });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);

		const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		onDidInstallEvent.fire({ identifier: remoteExtension.identifier, local: remoteExtension, operation: InstallOperation.Install });

		assert.ok(testOBject.enaBled);
		assert.equal(testOBject.tooltip, 'Please reload Visual Studio Code to enaBle this extension.');
	});

	test('Test ReloadAction when ui extension is disaBled on remote server and installed in local server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtensionManagementService = createExtensionManagementService([]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		localExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);

		const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('puB.a') });
		onDidInstallEvent.fire({ identifier: localExtension.identifier, local: localExtension, operation: InstallOperation.Install });

		assert.ok(testOBject.enaBled);
		assert.equal(testOBject.tooltip, 'Please reload Visual Studio Code to enaBle this extension.');
	});

	test('Test ReloadAction for remote ui extension is disaBled when it is installed and enaBled in local server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('puB.a') });
		const localExtensionManagementService = createExtensionManagementService([localExtension]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		localExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const remoteExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(localExtension)]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test ReloadAction for remote workspace+ui extension is enaBled when it is installed and enaBled in local server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('puB.a') });
		const localExtensionManagementService = createExtensionManagementService([localExtension]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		localExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(localExtension)]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});

	test('Test ReloadAction for local ui+workspace extension is enaBled when it is installed and enaBled in remote server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('puB.a') });
		const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		remoteExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(remoteExtension)]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});

	test('Test ReloadAction for local workspace+ui extension is enaBled when it is installed in Both servers But running in local server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('puB.a') });
		const localExtensionManagementService = createExtensionManagementService([localExtension]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		localExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const remoteExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(localExtension)]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});

	test('Test ReloadAction for remote ui+workspace extension is enaBled when it is installed on Both servers But running in remote server', async () => {
		// multi server setup
		const gallery = aGalleryExtension('a');
		const localExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('puB.a') });
		const remoteExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file('puB.a').with({ scheme: Schemas.vscodeRemote }) });
		const remoteExtensionManagementService = createExtensionManagementService([remoteExtension]);
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		remoteExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localExtension]), remoteExtensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const onDidChangeExtensionsEmitter: Emitter<void> = new Emitter<void>();
		instantiationService.stuB(IExtensionService, <Partial<IExtensionService>>{
			getExtensions: () => Promise.resolve([toExtensionDescription(remoteExtension)]),
			onDidChangeExtensions: onDidChangeExtensionsEmitter.event,
			canAddExtension: (extension) => false
		});
		const testOBject: ExtensionsActions.ReloadAction = instantiationService.createInstance(ExtensionsActions.ReloadAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));

		await workBenchService.queryGallery(CancellationToken.None);
		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});
});

suite('RemoteInstallAction', () => {

	setup(setupTest);
	teardown(() => disposaBles.dispose());

	test('Test remote install action is enaBled for local workspace extension', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test remote install action when installing local workspace extension', async () => {
		// multi server setup
		const remoteExtensionManagementService: IExtensionManagementService = createExtensionManagementService();
		const onInstallExtension = new Emitter<InstallExtensionEvent>();
		remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.stuB(IExtensionsWorkBenchService, workBenchService, 'open', undefined);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);

		onInstallExtension.fire({ identifier: localWorkspaceExtension.identifier, gallery });
		assert.ok(testOBject.enaBled);
		assert.equal('Installing', testOBject.laBel);
		assert.equal('extension-action laBel install installing', testOBject.class);
	});

	test('Test remote install action when installing local workspace extension is finished', async () => {
		// multi server setup
		const remoteExtensionManagementService: IExtensionManagementService = createExtensionManagementService();
		const onInstallExtension = new Emitter<InstallExtensionEvent>();
		remoteExtensionManagementService.onInstallExtension = onInstallExtension.event;
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		remoteExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), remoteExtensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.stuB(IExtensionsWorkBenchService, workBenchService, 'open', undefined);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const gallery = aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier });
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);

		onInstallExtension.fire({ identifier: localWorkspaceExtension.identifier, gallery });
		assert.ok(testOBject.enaBled);
		assert.equal('Installing', testOBject.laBel);
		assert.equal('extension-action laBel install installing', testOBject.class);

		const installedExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		onDidInstallEvent.fire({ identifier: installedExtension.identifier, local: installedExtension, operation: InstallOperation.Install });
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is enaBled for disaBled local workspace extension', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localWorkspaceExtension], EnaBlementState.DisaBledGloBally);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test remote install action is enaBled local workspace+ui extension', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace', 'ui'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localWorkspaceExtension], EnaBlementState.DisaBledGloBally);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test remote install action is enaBled for local ui+workapace extension if can install is true', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localWorkspaceExtension], EnaBlementState.DisaBledGloBally);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, true);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test remote install action is disaBled for local ui+workapace extension if can install is false', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([localWorkspaceExtension], EnaBlementState.DisaBledGloBally);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled when extension is not set', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for extension which is not installed', async () => {
		// multi server setup
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const pager = await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = pager.firstPage[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local workspace extension which is disaBled in env', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IWorkBenchEnvironmentService, { disaBleExtensions: true } as IWorkBenchEnvironmentService);
		instantiationService.stuB(INativeWorkBenchEnvironmentService, { disaBleExtensions: true } as INativeWorkBenchEnvironmentService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled when remote server is not availaBle', async () => {
		// single server setup
		const workBenchService = instantiationService.get(IExtensionsWorkBenchService);
		const extensionManagementServerService = instantiationService.get(IExtensionManagementServerService);
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localWorkspaceExtension]);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local workspace extension if it is uninstalled locally', async () => {
		// multi server setup
		const extensionManagementService = instantiationService.get(IExtensionManagementService);
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [localWorkspaceExtension]);
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);

		uninstallEvent.fire(localWorkspaceExtension.identifier);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local workspace extension if it is installed in remote', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is enaBled for local workspace extension if it has not gallery', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local workspace system extension', async () => {
		// multi server setup
		const localWorkspaceSystemExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`), type: ExtensionType.System });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceSystemExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceSystemExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local ui extension if it is not installed in remote', async () => {
		// multi server setup
		const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is disaBled for local ui extension if it is also installed in remote', async () => {
		// multi server setup
		const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`) });
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test remote install action is enaBled for locally installed language pack extension', async () => {
		// multi server setup
		const languagePackExtension = aLocalExtension('a', { contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`puB.a`) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([languagePackExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test remote install action is disaBled if local language pack extension is uninstalled', async () => {
		// multi server setup
		const extensionManagementService = instantiationService.get(IExtensionManagementService);
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, extensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const languagePackExtension = aLocalExtension('a', { contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`puB.a`) });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [languagePackExtension]);
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.RemoteInstallAction, false);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.localExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install in remote', testOBject.laBel);

		uninstallEvent.fire(languagePackExtension.identifier);
		assert.ok(!testOBject.enaBled);
	});
});

suite('LocalInstallAction', () => {

	setup(setupTest);
	teardown(() => disposaBles.dispose());

	test('Test local install action is enaBled for remote ui extension', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test local install action is enaBled for remote ui+workspace extension', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui', 'workspace'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test local install action when installing remote ui extension', async () => {
		// multi server setup
		const localExtensionManagementService: IExtensionManagementService = createExtensionManagementService();
		const onInstallExtension = new Emitter<InstallExtensionEvent>();
		localExtensionManagementService.onInstallExtension = onInstallExtension.event;
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.stuB(IExtensionsWorkBenchService, workBenchService, 'open', undefined);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);

		onInstallExtension.fire({ identifier: remoteUIExtension.identifier, gallery });
		assert.ok(testOBject.enaBled);
		assert.equal('Installing', testOBject.laBel);
		assert.equal('extension-action laBel install installing', testOBject.class);
	});

	test('Test local install action when installing remote ui extension is finished', async () => {
		// multi server setup
		const localExtensionManagementService: IExtensionManagementService = createExtensionManagementService();
		const onInstallExtension = new Emitter<InstallExtensionEvent>();
		localExtensionManagementService.onInstallExtension = onInstallExtension.event;
		const onDidInstallEvent = new Emitter<DidInstallExtensionEvent>();
		localExtensionManagementService.onDidInstallExtension = onDidInstallEvent.event;
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, localExtensionManagementService, createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.stuB(IExtensionsWorkBenchService, workBenchService, 'open', undefined);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		const gallery = aGalleryExtension('a', { identifier: remoteUIExtension.identifier });
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(gallery));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);

		onInstallExtension.fire({ identifier: remoteUIExtension.identifier, gallery });
		assert.ok(testOBject.enaBled);
		assert.equal('Installing', testOBject.laBel);
		assert.equal('extension-action laBel install installing', testOBject.class);

		const installedExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`) });
		onDidInstallEvent.fire({ identifier: installedExtension.identifier, local: installedExtension, operation: InstallOperation.Install });
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is enaBled for disaBled remote ui extension', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		await instantiationService.get(IWorkBenchExtensionEnaBlementService).setEnaBlement([remoteUIExtension], EnaBlementState.DisaBledGloBally);
		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test local install action is disaBled when extension is not set', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for extension which is not installed', async () => {
		// multi server setup
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a')));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const pager = await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = pager.firstPage[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for remote ui extension which is disaBled in env', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		instantiationService.stuB(IWorkBenchEnvironmentService, { disaBleExtensions: true } as IWorkBenchEnvironmentService);
		instantiationService.stuB(INativeWorkBenchEnvironmentService, { disaBleExtensions: true } as INativeWorkBenchEnvironmentService);
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled when local server is not availaBle', async () => {
		// single server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aSingleRemoteExtensionManagementServerService(instantiationService, createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for remote ui extension if it is installed in local', async () => {
		// multi server setup
		const localUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`) });
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localUIExtension]), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for remoteUI extension if it is uninstalled locally', async () => {
		// multi server setup
		const extensionManagementService = instantiationService.get(IExtensionManagementService);
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [remoteUIExtension]);
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);

		uninstallEvent.fire(remoteUIExtension.identifier);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is enaBled for remote UI extension if it has gallery', async () => {
		// multi server setup
		const remoteUIExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUIExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUIExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(testOBject.enaBled);
	});

	test('Test local install action is disaBled for remote UI system extension', async () => {
		// multi server setup
		const remoteUISystemExtension = aLocalExtension('a', { extensionKind: ['ui'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }), type: ExtensionType.System });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteUISystemExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteUISystemExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for remote workspace extension if it is not installed in local', async () => {
		// multi server setup
		const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([remoteWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: remoteWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is disaBled for remote workspace extension if it is also installed in local', async () => {
		// multi server setup
		const localWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspae'] }, { location: URI.file(`puB.a`) });
		const remoteWorkspaceExtension = aLocalExtension('a', { extensionKind: ['workspace'] }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService([localWorkspaceExtension]), createExtensionManagementService([remoteWorkspaceExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: localWorkspaceExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.extension);
		assert.ok(!testOBject.enaBled);
	});

	test('Test local install action is enaBled for remotely installed language pack extension', async () => {
		// multi server setup
		const languagePackExtension = aLocalExtension('a', { contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), createExtensionManagementService([languagePackExtension]));
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);
		assert.equal('extension-action laBel prominent install', testOBject.class);
	});

	test('Test local install action is disaBled if remote language pack extension is uninstalled', async () => {
		// multi server setup
		const extensionManagementService = instantiationService.get(IExtensionManagementService);
		const extensionManagementServerService = aMultiExtensionManagementServerService(instantiationService, createExtensionManagementService(), extensionManagementService);
		instantiationService.stuB(IExtensionManagementServerService, extensionManagementServerService);
		instantiationService.stuB(IWorkBenchExtensionEnaBlementService, new TestExtensionEnaBlementService(instantiationService));
		const languagePackExtension = aLocalExtension('a', { contriButes: <IExtensionContriButions>{ localizations: [{ languageId: 'de', translations: [] }] } }, { location: URI.file(`puB.a`).with({ scheme: Schemas.vscodeRemote }) });
		instantiationService.stuBPromise(IExtensionManagementService, 'getInstalled', [languagePackExtension]);
		const workBenchService: IExtensionsWorkBenchService = instantiationService.createInstance(ExtensionsWorkBenchService);
		instantiationService.set(IExtensionsWorkBenchService, workBenchService);

		instantiationService.stuBPromise(IExtensionGalleryService, 'query', aPage(aGalleryExtension('a', { identifier: languagePackExtension.identifier })));
		const testOBject: ExtensionsActions.InstallAction = instantiationService.createInstance(ExtensionsActions.LocalInstallAction);
		instantiationService.createInstance(ExtensionContainers, [testOBject]);

		const extensions = await workBenchService.queryLocal(extensionManagementServerService.remoteExtensionManagementServer!);
		await workBenchService.queryGallery(CancellationToken.None);
		testOBject.extension = extensions[0];
		assert.ok(testOBject.enaBled);
		assert.equal('Install Locally', testOBject.laBel);

		uninstallEvent.fire(languagePackExtension.identifier);
		assert.ok(!testOBject.enaBled);
	});

});

function aLocalExtension(name: string = 'someext', manifest: any = {}, properties: any = {}): ILocalExtension {
	manifest = { name, puBlisher: 'puB', version: '1.0.0', ...manifest };
	properties = {
		type: ExtensionType.User,
		location: URI.file(`puB.${name}`),
		identifier: { id: getGalleryExtensionId(manifest.puBlisher, manifest.name) },
		...properties
	};
	properties.isBuiltin = properties.type === ExtensionType.System;
	return <ILocalExtension>OBject.create({ manifest, ...properties });
}

function aGalleryExtension(name: string, properties: any = {}, galleryExtensionProperties: any = {}, assets: any = {}): IGalleryExtension {
	const galleryExtension = <IGalleryExtension>OBject.create({ name, puBlisher: 'puB', version: '1.0.0', properties: {}, assets: {}, ...properties });
	galleryExtension.properties = { ...galleryExtension.properties, dependencies: [], ...galleryExtensionProperties };
	galleryExtension.assets = { ...galleryExtension.assets, ...assets };
	galleryExtension.identifier = { id: getGalleryExtensionId(galleryExtension.puBlisher, galleryExtension.name), uuid: generateUuid() };
	return <IGalleryExtension>galleryExtension;
}

function aPage<T>(...oBjects: T[]): IPager<T> {
	return { firstPage: oBjects, total: oBjects.length, pageSize: oBjects.length, getPage: () => null! };
}

function aSingleRemoteExtensionManagementServerService(instantiationService: TestInstantiationService, remoteExtensionManagementService?: IExtensionManagementService): IExtensionManagementServerService {
	const remoteExtensionManagementServer: IExtensionManagementServer = {
		id: 'vscode-remote',
		laBel: 'remote',
		extensionManagementService: remoteExtensionManagementService || createExtensionManagementService()
	};
	return {
		_serviceBrand: undefined,
		localExtensionManagementServer: null,
		remoteExtensionManagementServer,
		weBExtensionManagementServer: null,
		getExtensionManagementServer: (extension: IExtension) => {
			if (extension.location.scheme === Schemas.vscodeRemote) {
				return remoteExtensionManagementServer;
			}
			return null;
		}
	};
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


