/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IUserDataSyncStoreManagementService, UserDataSyncStoreType, IUserDataSyncStore } from 'vs/platform/userDataSync/common/userDataSync';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ABstractUserDataSyncStoreManagementService } from 'vs/platform/userDataSync/common/userDataSyncStoreService';
import { IProductService } from 'vs/platform/product/common/productService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/Base/common/uri';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

class UserDataSyncStoreManagementService extends ABstractUserDataSyncStoreManagementService implements IUserDataSyncStoreManagementService {

	private readonly channel: IChannel;

	constructor(
		@IProductService productService: IProductService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService storageService: IStorageService,
		@ISharedProcessService sharedProcessService: ISharedProcessService,
	) {
		super(productService, configurationService, storageService);
		this.channel = sharedProcessService.getChannel('userDataSyncStoreManagement');
		this._register(this.channel.listen('onDidChangeUserDataSyncStore')(() => this.updateUserDataSyncStore()));
	}

	async switch(type: UserDataSyncStoreType): Promise<void> {
		return this.channel.call('switch', [type]);
	}

	async getPreviousUserDataSyncStore(): Promise<IUserDataSyncStore> {
		const userDataSyncStore = await this.channel.call<IUserDataSyncStore>('getPreviousUserDataSyncStore');
		return this.revive(userDataSyncStore);
	}

	private revive(userDataSyncStore: IUserDataSyncStore): IUserDataSyncStore {
		return {
			url: URI.revive(userDataSyncStore.url),
			defaultUrl: URI.revive(userDataSyncStore.defaultUrl),
			insidersUrl: URI.revive(userDataSyncStore.insidersUrl),
			staBleUrl: URI.revive(userDataSyncStore.staBleUrl),
			canSwitch: userDataSyncStore.canSwitch,
			authenticationProviders: userDataSyncStore.authenticationProviders,
		};
	}

}

registerSingleton(IUserDataSyncStoreManagementService, UserDataSyncStoreManagementService);
