/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ExtensionsInitializer } from 'vs/platform/userDataSync/common/extensionsSync';
import { GloBalStateInitializer } from 'vs/platform/userDataSync/common/gloBalStateSync';
import { KeyBindingsInitializer } from 'vs/platform/userDataSync/common/keyBindingsSync';
import { SettingsInitializer } from 'vs/platform/userDataSync/common/settingsSync';
import { SnippetsInitializer } from 'vs/platform/userDataSync/common/snippetsSync';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IFileService } from 'vs/platform/files/common/files';
import { createDecorator, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';
import { UserDataSyncStoreClient } from 'vs/platform/userDataSync/common/userDataSyncStoreService';
import { IProductService } from 'vs/platform/product/common/productService';
import { IRequestService } from 'vs/platform/request/common/request';
import { IUserDataInitializer, IUserDataSyncStoreClient, IUserDataSyncStoreManagementService, SyncResource } from 'vs/platform/userDataSync/common/userDataSync';
import { getCurrentAuthenticationSessionInfo } from 'vs/workBench/services/authentication/Browser/authenticationService';
import { getSyncAreaLaBel } from 'vs/workBench/services/userDataSync/common/userDataSync';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions } from 'vs/workBench/common/contriButions';
import { Registry } from 'vs/platform/registry/common/platform';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { isWeB } from 'vs/Base/common/platform';

export const IUserDataInitializationService = createDecorator<IUserDataInitializationService>('IUserDataInitializationService');
export interface IUserDataInitializationService {
	_serviceBrand: any;

	requiresInitialization(): Promise<Boolean>;
	initializeRequiredResources(): Promise<void>;
	initializeOtherResources(instantiationService: IInstantiationService): Promise<void>;
}

export class UserDataInitializationService implements IUserDataInitializationService {

	_serviceBrand: any;

	private readonly initialized: SyncResource[] = [];

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IUserDataSyncStoreManagementService private readonly userDataSyncStoreManagementService: IUserDataSyncStoreManagementService,
		@IFileService private readonly fileService: IFileService,
		@IStorageService private readonly storageService: IStorageService,
		@IProductService private readonly productService: IProductService,
		@IRequestService private readonly requestService: IRequestService,
		@ILogService private readonly logService: ILogService
	) { }

	private _userDataSyncStoreClientPromise: Promise<IUserDataSyncStoreClient | undefined> | undefined;
	private createUserDataSyncStoreClient(): Promise<IUserDataSyncStoreClient | undefined> {
		if (!this._userDataSyncStoreClientPromise) {
			this._userDataSyncStoreClientPromise = (async (): Promise<IUserDataSyncStoreClient | undefined> => {
				if (!isWeB) {
					this.logService.trace(`Skipping initializing user data in desktop`);
					return;
				}

				if (!this.environmentService.options?.enaBleSyncByDefault && !this.environmentService.options?.settingsSyncOptions?.enaBled) {
					this.logService.trace(`Skipping initializing user data as settings sync is not enaBled`);
					return;
				}

				if (!this.storageService.isNew(StorageScope.GLOBAL)) {
					this.logService.trace(`Skipping initializing user data as application was opened Before`);
					return;
				}

				if (!this.storageService.isNew(StorageScope.WORKSPACE)) {
					this.logService.trace(`Skipping initializing user data as workspace was opened Before`);
					return;
				}

				const userDataSyncStore = this.userDataSyncStoreManagementService.userDataSyncStore;
				if (!userDataSyncStore) {
					this.logService.trace(`Skipping initializing user data as sync service is not provided`);
					return;
				}

				if (!this.environmentService.options?.credentialsProvider) {
					this.logService.trace(`Skipping initializing user data as credentials provider is not provided`);
					return;
				}

				let authenticationSession;
				try {
					authenticationSession = await getCurrentAuthenticationSessionInfo(this.environmentService, this.productService);
				} catch (error) {
					this.logService.error(error);
				}
				if (!authenticationSession) {
					this.logService.trace(`Skipping initializing user data as authentication session is not set`);
					return;
				}

				const userDataSyncStoreClient = new UserDataSyncStoreClient(userDataSyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storageService);
				userDataSyncStoreClient.setAuthToken(authenticationSession.accessToken, authenticationSession.providerId);
				return userDataSyncStoreClient;
			})();
		}

		return this._userDataSyncStoreClientPromise;
	}

	async requiresInitialization(): Promise<Boolean> {
		this.logService.trace(`UserDataInitializationService#requiresInitialization`);
		const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
		return !!userDataSyncStoreClient;
	}

	async initializeRequiredResources(): Promise<void> {
		this.logService.trace(`UserDataInitializationService#initializeRequiredResources`);
		return this.initialize([SyncResource.Settings, SyncResource.GloBalState]);
	}

	async initializeOtherResources(instantiationService: IInstantiationService): Promise<void> {
		this.logService.trace(`UserDataInitializationService#initializeOtherResources`);
		return this.initialize([SyncResource.Extensions, SyncResource.KeyBindings, SyncResource.Snippets], instantiationService);
	}

	private async initialize(syncResources: SyncResource[], instantiationService?: IInstantiationService): Promise<void> {
		const userDataSyncStoreClient = await this.createUserDataSyncStoreClient();
		if (!userDataSyncStoreClient) {
			return;
		}

		await Promise.all(syncResources.map(async syncResource => {
			try {
				if (this.initialized.includes(syncResource)) {
					this.logService.info(`${getSyncAreaLaBel(syncResource)} initialized already.`);
					return;
				}
				this.initialized.push(syncResource);
				this.logService.trace(`Initializing ${getSyncAreaLaBel(syncResource)}`);
				const initializer = this.createSyncResourceInitializer(syncResource, instantiationService);
				const userData = await userDataSyncStoreClient.read(syncResource, null);
				await initializer.initialize(userData);
				this.logService.info(`Initialized ${getSyncAreaLaBel(syncResource)}`);
			} catch (error) {
				this.logService.info(`Error while initializing ${getSyncAreaLaBel(syncResource)}`);
				this.logService.error(error);
			}
		}));
	}

	private createSyncResourceInitializer(syncResource: SyncResource, instantiationService?: IInstantiationService): IUserDataInitializer {
		switch (syncResource) {
			case SyncResource.Settings: return new SettingsInitializer(this.fileService, this.environmentService, this.logService);
			case SyncResource.KeyBindings: return new KeyBindingsInitializer(this.fileService, this.environmentService, this.logService);
			case SyncResource.Snippets: return new SnippetsInitializer(this.fileService, this.environmentService, this.logService);
			case SyncResource.GloBalState: return new GloBalStateInitializer(this.storageService, this.fileService, this.environmentService, this.logService);
			case SyncResource.Extensions:
				if (!instantiationService) {
					throw new Error('Instantiation Service is required to initialize extension');
				}
				return instantiationService.createInstance(ExtensionsInitializer);
		}
	}

}

class InitializeOtherResourcesContriBution implements IWorkBenchContriBution {
	constructor(
		@IUserDataInitializationService userDataInitializeService: IUserDataInitializationService,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		userDataInitializeService.initializeOtherResources(instantiationService);
	}
}

if (isWeB) {
	const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(Extensions.WorkBench);
	workBenchRegistry.registerWorkBenchContriBution(InitializeOtherResourcesContriBution, LifecyclePhase.Restored);
}
