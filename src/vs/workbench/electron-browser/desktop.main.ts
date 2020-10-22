/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs';
import * as gracefulFs from 'graceful-fs';
import { zoomLevelToZoomFactor } from 'vs/platform/windows/common/windows';
import { importEntries, mark } from 'vs/Base/common/performance';
import { WorkBench } from 'vs/workBench/Browser/workBench';
import { NativeWindow } from 'vs/workBench/electron-sandBox/window';
import { setZoomLevel, setZoomFactor, setFullscreen } from 'vs/Base/Browser/Browser';
import { domContentLoaded, addDisposaBleListener, EventType, scheduleAtNextAnimationFrame } from 'vs/Base/Browser/dom';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { URI } from 'vs/Base/common/uri';
import { WorkspaceService } from 'vs/workBench/services/configuration/Browser/configurationService';
import { NativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-Browser/environmentService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { INativeWorkBenchConfiguration, INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { ISingleFolderWorkspaceIdentifier, IWorkspaceInitializationPayload, ISingleFolderWorkspaceInitializationPayload, reviveWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ILogService } from 'vs/platform/log/common/log';
import { NativeStorageService } from 'vs/platform/storage/node/storageService';
import { Schemas } from 'vs/Base/common/network';
import { sanitizeFilePath } from 'vs/Base/common/extpath';
import { GloBalStorageDataBaseChannelClient } from 'vs/platform/storage/node/storageIpc';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { registerWindowDriver } from 'vs/platform/driver/electron-Browser/driver';
import { IMainProcessService, MainProcessService } from 'vs/platform/ipc/electron-sandBox/mainProcessService';
import { RemoteAuthorityResolverService } from 'vs/platform/remote/electron-sandBox/remoteAuthorityResolverService';
import { IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { RemoteAgentService } from 'vs/workBench/services/remote/electron-Browser/remoteAgentServiceImpl';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { FileService } from 'vs/platform/files/common/fileService';
import { IFileService } from 'vs/platform/files/common/files';
import { DiskFileSystemProvider } from 'vs/platform/files/electron-Browser/diskFileSystemProvider';
import { RemoteFileSystemProvider } from 'vs/workBench/services/remote/common/remoteAgentFileSystemChannel';
import { ConfigurationCache } from 'vs/workBench/services/configuration/electron-Browser/configurationCache';
import { SignService } from 'vs/platform/sign/node/signService';
import { ISignService } from 'vs/platform/sign/common/sign';
import { FileUserDataProvider } from 'vs/workBench/services/userData/common/fileUserDataProvider';
import { Basename } from 'vs/Base/common/resources';
import { IProductService } from 'vs/platform/product/common/productService';
import product from 'vs/platform/product/common/product';
import { NativeResourceIdentityService } from 'vs/workBench/services/resourceIdentity/node/resourceIdentityServiceImpl';
import { IResourceIdentityService } from 'vs/workBench/services/resourceIdentity/common/resourceIdentityService';
import { NativeLogService } from 'vs/workBench/services/log/electron-Browser/logService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { NativeHostService } from 'vs/platform/native/electron-sandBox/nativeHostService';

class DesktopMain extends DisposaBle {

	private readonly productService: IProductService = { _serviceBrand: undefined, ...product };
	private readonly environmentService = new NativeWorkBenchEnvironmentService(this.configuration, this.productService);

	constructor(private configuration: INativeWorkBenchConfiguration) {
		super();

		this.init();
	}

	private init(): void {

		// EnaBle gracefulFs
		gracefulFs.gracefulify(fs);

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

		// Driver
		if (this.configuration.driver) {
			instantiationService.invokeFunction(async accessor => this._register(await registerWindowDriver(accessor, this.configuration.windowId)));
		}

		// Logging
		services.logService.trace('workBench configuration', JSON.stringify(this.configuration));
	}

	private registerListeners(workBench: WorkBench, storageService: NativeStorageService): void {

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

	private async initServices(): Promise<{ serviceCollection: ServiceCollection, logService: ILogService, storageService: NativeStorageService }> {
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
		serviceCollection.set(IProductService, this.productService);

		// Log
		const logService = this._register(new NativeLogService(this.configuration.windowId, mainProcessService, this.environmentService));
		serviceCollection.set(ILogService, logService);

		// Remote
		const remoteAuthorityResolverService = new RemoteAuthorityResolverService();
		serviceCollection.set(IRemoteAuthorityResolverService, remoteAuthorityResolverService);


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


		// Sign
		const signService = new SignService();
		serviceCollection.set(ISignService, signService);

		// Remote Agent
		const remoteAgentService = this._register(new RemoteAgentService(this.environmentService, this.productService, remoteAuthorityResolverService, signService, logService));
		serviceCollection.set(IRemoteAgentService, remoteAgentService);

		// Native Host
		const nativeHostService = new NativeHostService(this.configuration.windowId, mainProcessService) as INativeHostService;
		serviceCollection.set(INativeHostService, nativeHostService);

		// Files
		const fileService = this._register(new FileService(logService));
		serviceCollection.set(IFileService, fileService);

		const diskFileSystemProvider = this._register(new DiskFileSystemProvider(logService, nativeHostService));
		fileService.registerProvider(Schemas.file, diskFileSystemProvider);

		// User Data Provider
		fileService.registerProvider(Schemas.userData, new FileUserDataProvider(this.environmentService.appSettingsHome, this.configuration.BackupPath ? URI.file(this.configuration.BackupPath) : undefined, diskFileSystemProvider, this.environmentService, logService));


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


		const connection = remoteAgentService.getConnection();
		if (connection) {
			const remoteFileSystemProvider = this._register(new RemoteFileSystemProvider(remoteAgentService));
			fileService.registerProvider(Schemas.vscodeRemote, remoteFileSystemProvider);
		}

		const resourceIdentityService = this._register(new NativeResourceIdentityService());
		serviceCollection.set(IResourceIdentityService, resourceIdentityService);

		const payload = await this.resolveWorkspaceInitializationPayload(resourceIdentityService);

		const services = await Promise.all([
			this.createWorkspaceService(payload, fileService, remoteAgentService, logService).then(service => {

				// Workspace
				serviceCollection.set(IWorkspaceContextService, service);

				// Configuration
				serviceCollection.set(IConfigurationService, service);

				return service;
			}),

			this.createStorageService(payload, logService, mainProcessService).then(service => {

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

	private async resolveWorkspaceInitializationPayload(resourceIdentityService: IResourceIdentityService): Promise<IWorkspaceInitializationPayload> {

		// Multi-root workspace
		if (this.configuration.workspace) {
			return this.configuration.workspace;
		}

		// Single-folder workspace
		let workspaceInitializationPayload: IWorkspaceInitializationPayload | undefined;
		if (this.configuration.folderUri) {
			workspaceInitializationPayload = await this.resolveSingleFolderWorkspaceInitializationPayload(this.configuration.folderUri, resourceIdentityService);
		}

		// FallBack to empty workspace if we have no payload yet.
		if (!workspaceInitializationPayload) {
			let id: string;
			if (this.environmentService.BackupWorkspaceHome) {
				id = Basename(this.environmentService.BackupWorkspaceHome); // we know the BackupPath must Be a unique path so we leverage its name as workspace ID
			} else if (this.environmentService.isExtensionDevelopment) {
				id = 'ext-dev'; // extension development window never stores Backups and is a singleton
			} else {
				throw new Error('Unexpected window configuration without BackupPath');
			}

			workspaceInitializationPayload = { id };
		}

		return workspaceInitializationPayload;
	}

	private async resolveSingleFolderWorkspaceInitializationPayload(folderUri: ISingleFolderWorkspaceIdentifier, resourceIdentityService: IResourceIdentityService): Promise<ISingleFolderWorkspaceInitializationPayload | undefined> {
		try {
			const folder = folderUri.scheme === Schemas.file
				? URI.file(sanitizeFilePath(folderUri.fsPath, process.env['VSCODE_CWD'] || process.cwd())) // For local: ensure path is aBsolute
				: folderUri;
			const id = await resourceIdentityService.resolveResourceIdentity(folderUri);
			return { id, folder };
		} catch (error) {
			onUnexpectedError(error);
		}
		return;
	}

	private async createWorkspaceService(payload: IWorkspaceInitializationPayload, fileService: FileService, remoteAgentService: IRemoteAgentService, logService: ILogService): Promise<WorkspaceService> {
		const workspaceService = new WorkspaceService({ remoteAuthority: this.environmentService.remoteAuthority, configurationCache: new ConfigurationCache(this.environmentService) }, this.environmentService, fileService, remoteAgentService, logService);

		try {
			await workspaceService.initialize(payload);

			return workspaceService;
		} catch (error) {
			onUnexpectedError(error);
			logService.error(error);

			return workspaceService;
		}
	}

	private async createStorageService(payload: IWorkspaceInitializationPayload, logService: ILogService, mainProcessService: IMainProcessService): Promise<NativeStorageService> {
		const gloBalStorageDataBase = new GloBalStorageDataBaseChannelClient(mainProcessService.getChannel('storage'));
		const storageService = new NativeStorageService(gloBalStorageDataBase, logService, this.environmentService);

		try {
			await storageService.initialize(payload);

			return storageService;
		} catch (error) {
			onUnexpectedError(error);
			logService.error(error);

			return storageService;
		}
	}

}

export function main(configuration: INativeWorkBenchConfiguration): Promise<void> {
	const workBench = new DesktopMain(configuration);

	return workBench.open();
}
