/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ExtensionsInitiAlizer } from 'vs/plAtform/userDAtASync/common/extensionsSync';
import { GlobAlStAteInitiAlizer } from 'vs/plAtform/userDAtASync/common/globAlStAteSync';
import { KeybindingsInitiAlizer } from 'vs/plAtform/userDAtASync/common/keybindingsSync';
import { SettingsInitiAlizer } from 'vs/plAtform/userDAtASync/common/settingsSync';
import { SnippetsInitiAlizer } from 'vs/plAtform/userDAtASync/common/snippetsSync';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { UserDAtASyncStoreClient } from 'vs/plAtform/userDAtASync/common/userDAtASyncStoreService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { IUserDAtAInitiAlizer, IUserDAtASyncStoreClient, IUserDAtASyncStoreMAnAgementService, SyncResource } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { getCurrentAuthenticAtionSessionInfo } from 'vs/workbench/services/AuthenticAtion/browser/AuthenticAtionService';
import { getSyncAreALAbel } from 'vs/workbench/services/userDAtASync/common/userDAtASync';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { isWeb } from 'vs/bAse/common/plAtform';

export const IUserDAtAInitiAlizAtionService = creAteDecorAtor<IUserDAtAInitiAlizAtionService>('IUserDAtAInitiAlizAtionService');
export interfAce IUserDAtAInitiAlizAtionService {
	_serviceBrAnd: Any;

	requiresInitiAlizAtion(): Promise<booleAn>;
	initiAlizeRequiredResources(): Promise<void>;
	initiAlizeOtherResources(instAntiAtionService: IInstAntiAtionService): Promise<void>;
}

export clAss UserDAtAInitiAlizAtionService implements IUserDAtAInitiAlizAtionService {

	_serviceBrAnd: Any;

	privAte reAdonly initiAlized: SyncResource[] = [];

	constructor(
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IUserDAtASyncStoreMAnAgementService privAte reAdonly userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IProductService privAte reAdonly productService: IProductService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@ILogService privAte reAdonly logService: ILogService
	) { }

	privAte _userDAtASyncStoreClientPromise: Promise<IUserDAtASyncStoreClient | undefined> | undefined;
	privAte creAteUserDAtASyncStoreClient(): Promise<IUserDAtASyncStoreClient | undefined> {
		if (!this._userDAtASyncStoreClientPromise) {
			this._userDAtASyncStoreClientPromise = (Async (): Promise<IUserDAtASyncStoreClient | undefined> => {
				if (!isWeb) {
					this.logService.trAce(`Skipping initiAlizing user dAtA in desktop`);
					return;
				}

				if (!this.environmentService.options?.enAbleSyncByDefAult && !this.environmentService.options?.settingsSyncOptions?.enAbled) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As settings sync is not enAbled`);
					return;
				}

				if (!this.storAgeService.isNew(StorAgeScope.GLOBAL)) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As ApplicAtion wAs opened before`);
					return;
				}

				if (!this.storAgeService.isNew(StorAgeScope.WORKSPACE)) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As workspAce wAs opened before`);
					return;
				}

				const userDAtASyncStore = this.userDAtASyncStoreMAnAgementService.userDAtASyncStore;
				if (!userDAtASyncStore) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As sync service is not provided`);
					return;
				}

				if (!this.environmentService.options?.credentiAlsProvider) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As credentiAls provider is not provided`);
					return;
				}

				let AuthenticAtionSession;
				try {
					AuthenticAtionSession = AwAit getCurrentAuthenticAtionSessionInfo(this.environmentService, this.productService);
				} cAtch (error) {
					this.logService.error(error);
				}
				if (!AuthenticAtionSession) {
					this.logService.trAce(`Skipping initiAlizing user dAtA As AuthenticAtion session is not set`);
					return;
				}

				const userDAtASyncStoreClient = new UserDAtASyncStoreClient(userDAtASyncStore.url, this.productService, this.requestService, this.logService, this.environmentService, this.fileService, this.storAgeService);
				userDAtASyncStoreClient.setAuthToken(AuthenticAtionSession.AccessToken, AuthenticAtionSession.providerId);
				return userDAtASyncStoreClient;
			})();
		}

		return this._userDAtASyncStoreClientPromise;
	}

	Async requiresInitiAlizAtion(): Promise<booleAn> {
		this.logService.trAce(`UserDAtAInitiAlizAtionService#requiresInitiAlizAtion`);
		const userDAtASyncStoreClient = AwAit this.creAteUserDAtASyncStoreClient();
		return !!userDAtASyncStoreClient;
	}

	Async initiAlizeRequiredResources(): Promise<void> {
		this.logService.trAce(`UserDAtAInitiAlizAtionService#initiAlizeRequiredResources`);
		return this.initiAlize([SyncResource.Settings, SyncResource.GlobAlStAte]);
	}

	Async initiAlizeOtherResources(instAntiAtionService: IInstAntiAtionService): Promise<void> {
		this.logService.trAce(`UserDAtAInitiAlizAtionService#initiAlizeOtherResources`);
		return this.initiAlize([SyncResource.Extensions, SyncResource.Keybindings, SyncResource.Snippets], instAntiAtionService);
	}

	privAte Async initiAlize(syncResources: SyncResource[], instAntiAtionService?: IInstAntiAtionService): Promise<void> {
		const userDAtASyncStoreClient = AwAit this.creAteUserDAtASyncStoreClient();
		if (!userDAtASyncStoreClient) {
			return;
		}

		AwAit Promise.All(syncResources.mAp(Async syncResource => {
			try {
				if (this.initiAlized.includes(syncResource)) {
					this.logService.info(`${getSyncAreALAbel(syncResource)} initiAlized AlreAdy.`);
					return;
				}
				this.initiAlized.push(syncResource);
				this.logService.trAce(`InitiAlizing ${getSyncAreALAbel(syncResource)}`);
				const initiAlizer = this.creAteSyncResourceInitiAlizer(syncResource, instAntiAtionService);
				const userDAtA = AwAit userDAtASyncStoreClient.reAd(syncResource, null);
				AwAit initiAlizer.initiAlize(userDAtA);
				this.logService.info(`InitiAlized ${getSyncAreALAbel(syncResource)}`);
			} cAtch (error) {
				this.logService.info(`Error while initiAlizing ${getSyncAreALAbel(syncResource)}`);
				this.logService.error(error);
			}
		}));
	}

	privAte creAteSyncResourceInitiAlizer(syncResource: SyncResource, instAntiAtionService?: IInstAntiAtionService): IUserDAtAInitiAlizer {
		switch (syncResource) {
			cAse SyncResource.Settings: return new SettingsInitiAlizer(this.fileService, this.environmentService, this.logService);
			cAse SyncResource.Keybindings: return new KeybindingsInitiAlizer(this.fileService, this.environmentService, this.logService);
			cAse SyncResource.Snippets: return new SnippetsInitiAlizer(this.fileService, this.environmentService, this.logService);
			cAse SyncResource.GlobAlStAte: return new GlobAlStAteInitiAlizer(this.storAgeService, this.fileService, this.environmentService, this.logService);
			cAse SyncResource.Extensions:
				if (!instAntiAtionService) {
					throw new Error('InstAntiAtion Service is required to initiAlize extension');
				}
				return instAntiAtionService.creAteInstAnce(ExtensionsInitiAlizer);
		}
	}

}

clAss InitiAlizeOtherResourcesContribution implements IWorkbenchContribution {
	constructor(
		@IUserDAtAInitiAlizAtionService userDAtAInitiAlizeService: IUserDAtAInitiAlizAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		userDAtAInitiAlizeService.initiAlizeOtherResources(instAntiAtionService);
	}
}

if (isWeb) {
	const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(Extensions.Workbench);
	workbenchRegistry.registerWorkbenchContribution(InitiAlizeOtherResourcesContribution, LifecyclePhAse.Restored);
}
