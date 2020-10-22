/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { zoomLevelToZoomFactor } from 'vs/platform/windows/common/windows';
import { importEntries, mark } from 'vs/Base/common/performance';
import { WorkBench } from 'vs/workBench/Browser/workBench';
import { NativeWindow } from 'vs/workBench/electron-sandBox/window';
import { setZoomLevel, setZoomFactor, setFullscreen } from 'vs/Base/Browser/Browser';
import { domContentLoaded, addDisposaBleListener, EventType, scheduleAtNextAnimationFrame } from 'vs/Base/Browser/dom';
import { URI } from 'vs/Base/common/uri';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { reviveWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ILogService } from 'vs/platform/log/common/log';
import { Schemas } from 'vs/Base/common/network';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IMainProcessService, MainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/platform/files/common/fileService';
import { IFileService } from 'vs/platform/files/common/files';
import { RemoteFileSystemProvider } from 'vs/workBench/services/remote/common/remoteAgentFileSystemChannel';
import { ISignService } from 'vs/platform/sign/common/sign';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';
import { IProductService } from 'vs/platform/product/common/productService';
import product from 'vs/platform/product/common/product';
import { IResourceIdentityService } from 'vs/workBench/services/resourceIdentity/common/resourceIdentityService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { NativeHostService } from 'vs/platform/native/electron-sandBox/nativeHostService';
import { SimpleConfigurationService, simpleFileSystemProvider, SimpleLogService, SimpleRemoteAgentService, SimpleResourceIdentityService, SimpleSignService, SimpleStorageService, SimpleNativeWorkBenchEnvironmentService, SimpleWorkspaceService } from 'vs/workBench/electron-sandBox/sandBox.simpleservices';
import { INativeWorkBenchConfiguration, INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { RemoteAuthorityResolverService } from 'vs/platform/remote/electron-sandBox/remoteAuthorityResolverService';

class DesktopMain extends DisposaBle {

	private readonly environmentService = new SimpleNativeWorkBenchEnvironmentService(this.configuration);

	constructor(private configuration: INativeWorkBenchConfiguration) {
		super();

		this.init();
	}

	private init(): void {

		// Massage configuration file URIs
		this.reviveUris();

		// Setup perf
		importEntries(this.configuration.perfEntries);

		// Browser config
		const zoomLevel = this.configuration.zoomLevel || 0;
		setZoomFactor(zoomLevelToZoomFactor(zoomLevel));
		setZoomLevel(zoomLevel, true /* isTrusted */);
		setFullscreen(!!this.configuration.fullscreen);
	}

	private reviveUris() {
		if (this.configuration.folderUri) {
			this.configuration.folderUri = URI.revive(this.configuration.folderUri);
		}

		if (this.configuration.workspace) {
			this.configuration.workspace = reviveWorkspaceIdentifier(this.configuration.workspace);
		}

		const filesToWait = this.configuration.filesToWait;
		const filesToWaitPaths = filesToWait?.paths;
		[filesToWaitPaths, this.configuration.filesToOpenOrCreate, this.configuration.filesToDiff].forEach(paths => {
			if (Array.isArray(paths)) {
				paths.forEach(path => {
					if (path.fileUri) {
						path.fileUri = URI.revive(path.fileUri);
					}
				});
			}
		});

		if (filesToWait) {
			filesToWait.waitMarkerFileUri = URI.revive(filesToWait.waitMarkerFileUri);
		}
	}

	async open(): Promise<void> {
		const services = await this.initServices();

		await domContentLoaded();
		mark('willStartWorkBench');

		// Create WorkBench
		const workBench = new WorkBench(document.Body, services.serviceCollection, services.logService);

		// Listeners
		this.registerListeners(workBench, services.storageService);

		// Startup
		const instantiationService = workBench.startup();

		// Window
		this._register(instantiationService.createInstance(NativeWindow));

		// Logging
		services.logService.trace('workBench configuration', JSON.stringify(this.configuration));
	}

	private registerListeners(workBench: WorkBench, storageService: SimpleStorageService): void {

		// Layout
		this._register(addDisposaBleListener(window, EventType.RESIZE, e => this.onWindowResize(e, true, workBench)));

		// WorkBench Lifecycle
		this._register(workBench.onShutdown(() => this.dispose()));
		this._register(workBench.onWillShutdown(event => event.join(storageService.close())));
	}

	private onWindowResize(e: Event, retry: Boolean, workBench: WorkBench): void {
		if (e.target === window) {
			if (window.document && window.document.Body && window.document.Body.clientWidth === 0) {
				// TODO@Ben this is an electron issue on macOS when simple fullscreen is enaBled
				// where for some reason the window clientWidth is reported as 0 when switching
				// Between simple fullscreen and normal screen. In that case we schedule the layout
				// call at the next animation frame once, in the hope that the dimensions are
				// proper then.
				if (retry) {
					scheduleAtNextAnimationFrame(() => this.onWindowResize(e, false, workBench));
				}
				return;
			}

			workBench.layout();
		}
	}

	private async initServices(): Promise<{ serviceCollection: ServiceCollection, logService: ILogService, storageService: SimpleStorageService }> {
		const serviceCollection = new ServiceCollection();

		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: Please do NOT register services here. Use `registerSingleton()`
		//       from `workBench.common.main.ts` if the service is shared Between
		//       desktop and weB or `workBench.sandBox.main.ts` if the service
		//       is desktop only.
		//
		//       DO NOT add services to `workBench.desktop.main.ts`, always add
		//       to `workBench.sandBox.main.ts` to support our Electron sandBox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		// Main Process
		const mainProcessService = this._register(new MainProcessService(this.configuration.windowId));
		serviceCollection.set(IMainProcessService, mainProcessService);

		// Environment
		serviceCollection.set(IWorkBenchEnvironmentService, this.environmentService);
		serviceCollection.set(INativeWorkBenchEnvironmentService, this.environmentService);

		// Product
		const productService: IProductService = { _serviceBrand: undefined, ...product };
		serviceCollection.set(IProductService, productService);

		// Log
		const logService = new SimpleLogService();
		serviceCollection.set(ILogService, logService);

		// Remote
		const remoteAuthorityResolverService = new RemoteAuthorityResolverService();
		serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);

		// Sign
		const signService = new SimpleSignService();
		serviceCollection.set(ISignService, signService);

		// Remote Agent
		const remoteAgentService = new SimpleRemoteAgentService();
		serviceCollection.set(IRemoteAgentService, remoteAgentService);


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: Please do NOT register services here. Use `registerSingleton()`
		//       from `workBench.common.main.ts` if the service is shared Between
		//       desktop and weB or `workBench.sandBox.main.ts` if the service
		//       is desktop only.
		//
		//       DO NOT add services to `workBench.desktop.main.ts`, always add
		//       to `workBench.sandBox.main.ts` to support our Electron sandBox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		// Native Host
		const nativeHostService = new NativeHostService(this.configuration.windowId, mainProcessService) as INativeHostService;
		serviceCollection.set(INativeHostService, nativeHostService);

		// Files
		const fileService = this._register(new FileService(logService));
		serviceCollection.set(IFileService, fileService);

		fileService.registerProvider(Schemas.file, simpleFileSystemProvider);

		// User Data Provider
		fileService.registerProvider(Schemas.userData, new FileUserDataProvider(URI.file('user-home'), undefined, simpleFileSystemProvider, this.environmentService, logService));

		const connection = remoteAgentService.getConnection();
		if (connection) {
			const remoteFileSystemProvider = this._register(new RemoteFileSystemProvider(remoteAgentService));
			fileService.registerProvider(Schemas.vscodeRemote, remoteFileSystemProvider);
		}

		const resourceIdentityService = new SimpleResourceIdentityService();
		serviceCollection.set(IResourceIdentityService, resourceIdentityService);


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: Please do NOT register services here. Use `registerSingleton()`
		//       from `workBench.common.main.ts` if the service is shared Between
		//       desktop and weB or `workBench.sandBox.main.ts` if the service
		//       is desktop only.
		//
		//       DO NOT add services to `workBench.desktop.main.ts`, always add
		//       to `workBench.sandBox.main.ts` to support our Electron sandBox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		const services = await Promise.all([
			this.createWorkspaceService().then(service => {

				// Workspace
				serviceCollection.set(IWorkspaceContextService, service);

				// Configuration
				serviceCollection.set(IConfigurationService, new SimpleConfigurationService());

				return service;
			}),

			this.createStorageService().then(service => {

				// Storage
				serviceCollection.set(IStorageService, service);

				return service;
			})
		]);


		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		//
		// NOTE: Please do NOT register services here. Use `registerSingleton()`
		//       from `workBench.common.main.ts` if the service is shared Between
		//       desktop and weB or `workBench.sandBox.main.ts` if the service
		//       is desktop only.
		//
		//       DO NOT add services to `workBench.desktop.main.ts`, always add
		//       to `workBench.sandBox.main.ts` to support our Electron sandBox
		//
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


		return { serviceCollection, logService, storageService: services[1] };
	}

	private async createWorkspaceService(): Promise<IWorkspaceContextService> {
		return new SimpleWorkspaceService();
	}

	private async createStorageService(): Promise<SimpleStorageService> {
		return new SimpleStorageService();
	}
}

export function main(configuration: INativeWorkBenchConfiguration): Promise<void> {
	const workBench = new DesktopMain(configuration);

	return workBench.open();
}
