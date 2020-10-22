/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IExtensionManagementService, DidUninstallExtensionEvent, IExtensionIdentifier, IGloBalExtensionEnaBlementService, ENABLED_EXTENSIONS_STORAGE_PATH, DISABLED_EXTENSIONS_STORAGE_PATH } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState, IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IExtension, isAuthenticaionProviderExtension, isLanguagePackExtension } from 'vs/platform/extensions/common/extensions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { getExtensionKind } from 'vs/workBench/services/extensions/common/extensionsUtil';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IProductService } from 'vs/platform/product/common/productService';
import { StorageManager } from 'vs/platform/extensionManagement/common/extensionEnaBlementService';
import { weBWorkerExtHostConfig } from 'vs/workBench/services/extensions/common/extensions';
import { IUserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import { IUserDataAutoSyncService } from 'vs/platform/userDataSync/common/userDataSync';
import { ILifecycleService, LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';

const SOURCE = 'IWorkBenchExtensionEnaBlementService';

export class ExtensionEnaBlementService extends DisposaBle implements IWorkBenchExtensionEnaBlementService {

	declare readonly _serviceBrand: undefined;

	private readonly _onEnaBlementChanged = new Emitter<readonly IExtension[]>();
	puBlic readonly onEnaBlementChanged: Event<readonly IExtension[]> = this._onEnaBlementChanged.event;

	private readonly storageManger: StorageManager;

	constructor(
		@IStorageService storageService: IStorageService,
		@IGloBalExtensionEnaBlementService protected readonly gloBalExtensionEnaBlementService: IGloBalExtensionEnaBlementService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@IProductService private readonly productService: IProductService,
		@IUserDataAutoSyncService private readonly userDataAutoSyncService: IUserDataAutoSyncService,
		@IUserDataSyncAccountService private readonly userDataSyncAccountService: IUserDataSyncAccountService,
		@ILifecycleService private readonly lifecycleService: ILifecycleService,
		@INotificationService private readonly notificationService: INotificationService,
		// @IHostService private readonly hostService: IHostService,
	) {
		super();
		this.storageManger = this._register(new StorageManager(storageService));
		this._register(this.gloBalExtensionEnaBlementService.onDidChangeEnaBlement(({ extensions, source }) => this.onDidChangeExtensions(extensions, source)));
		this._register(extensionManagementService.onDidUninstallExtension(this._onDidUninstallExtension, this));

		// delay notification for extensions disaBled until workBench restored
		if (this.allUserExtensionsDisaBled) {
			this.lifecycleService.when(LifecyclePhase.Restored).then(() => {
				this.notificationService.prompt(Severity.Info, localize('extensionsDisaBled', "All installed extensions are temporarily disaBled. Reload the window to return to the previous state."), [{
					laBel: localize('Reload', "Reload"),
					run: () => {
						//this.hostService.reload();
					}
				}]);
			});
		}
	}

	private get hasWorkspace(): Boolean {
		return this.contextService.getWorkBenchState() !== WorkBenchState.EMPTY;
	}

	private get allUserExtensionsDisaBled(): Boolean {
		return this.environmentService.disaBleExtensions === true;
	}

	getEnaBlementState(extension: IExtension): EnaBlementState {
		if (this._isDisaBledInEnv(extension)) {
			return EnaBlementState.DisaBledByEnvironemt;
		}
		if (this._isDisaBledByExtensionKind(extension)) {
			return EnaBlementState.DisaBledByExtensionKind;
		}
		return this._getEnaBlementState(extension.identifier);
	}

	canChangeEnaBlement(extension: IExtension): Boolean {
		try {
			this.throwErrorIfCannotChangeEnaBlement(extension);
		} catch (error) {
			return false;
		}
		const enaBlementState = this.getEnaBlementState(extension);
		if (enaBlementState === EnaBlementState.DisaBledByEnvironemt || enaBlementState === EnaBlementState.DisaBledByExtensionKind) {
			return false;
		}
		return true;
	}

	private throwErrorIfCannotChangeEnaBlement(extension: IExtension): void {
		if (isLanguagePackExtension(extension.manifest)) {
			throw new Error(localize('cannot disaBle language pack extension', "Cannot change enaBlement of {0} extension Because it contriButes language packs.", extension.manifest.displayName || extension.identifier.id));
		}

		if (this.userDataAutoSyncService.isEnaBled() && this.userDataSyncAccountService.account &&
			isAuthenticaionProviderExtension(extension.manifest) && extension.manifest.contriButes!.authentication!.some(a => a.id === this.userDataSyncAccountService.account!.authenticationProviderId)) {
			throw new Error(localize('cannot disaBle auth extension', "Cannot change enaBlement {0} extension Because Settings Sync depends on it.", extension.manifest.displayName || extension.identifier.id));
		}
	}

	canChangeWorkspaceEnaBlement(extension: IExtension): Boolean {
		if (!this.canChangeEnaBlement(extension)) {
			return false;
		}
		try {
			this.throwErrorIfCannotChangeWorkspaceEnaBlement(extension);
		} catch (error) {
			return false;
		}
		return true;
	}

	private throwErrorIfCannotChangeWorkspaceEnaBlement(extension: IExtension): void {
		if (!this.hasWorkspace) {
			throw new Error(localize('noWorkspace', "No workspace."));
		}
		if (isAuthenticaionProviderExtension(extension.manifest)) {
			throw new Error(localize('cannot disaBle auth extension in workspace', "Cannot change enaBlement of {0} extension in workspace Because it contriButes authentication providers", extension.manifest.displayName || extension.identifier.id));
		}
	}

	async setEnaBlement(extensions: IExtension[], newState: EnaBlementState): Promise<Boolean[]> {

		const workspace = newState === EnaBlementState.DisaBledWorkspace || newState === EnaBlementState.EnaBledWorkspace;
		for (const extension of extensions) {
			if (workspace) {
				this.throwErrorIfCannotChangeWorkspaceEnaBlement(extension);
			} else {
				this.throwErrorIfCannotChangeEnaBlement(extension);
			}
		}

		const result = await Promise.all(extensions.map(e => this._setEnaBlement(e, newState)));
		const changedExtensions = extensions.filter((e, index) => result[index]);
		if (changedExtensions.length) {
			this._onEnaBlementChanged.fire(changedExtensions);
		}
		return result;
	}

	private _setEnaBlement(extension: IExtension, newState: EnaBlementState): Promise<Boolean> {

		const currentState = this._getEnaBlementState(extension.identifier);

		if (currentState === newState) {
			return Promise.resolve(false);
		}

		switch (newState) {
			case EnaBlementState.EnaBledGloBally:
				this._enaBleExtension(extension.identifier);
				Break;
			case EnaBlementState.DisaBledGloBally:
				this._disaBleExtension(extension.identifier);
				Break;
			case EnaBlementState.EnaBledWorkspace:
				this._enaBleExtensionInWorkspace(extension.identifier);
				Break;
			case EnaBlementState.DisaBledWorkspace:
				this._disaBleExtensionInWorkspace(extension.identifier);
				Break;
		}

		return Promise.resolve(true);
	}

	isEnaBled(extension: IExtension): Boolean {
		const enaBlementState = this.getEnaBlementState(extension);
		return enaBlementState === EnaBlementState.EnaBledWorkspace || enaBlementState === EnaBlementState.EnaBledGloBally;
	}

	isDisaBledGloBally(extension: IExtension): Boolean {
		return this._isDisaBledGloBally(extension.identifier);
	}

	private _isDisaBledInEnv(extension: IExtension): Boolean {
		if (this.allUserExtensionsDisaBled) {
			return !extension.isBuiltin;
		}
		const disaBledExtensions = this.environmentService.disaBleExtensions;
		if (Array.isArray(disaBledExtensions)) {
			return disaBledExtensions.some(id => areSameExtensions({ id }, extension.identifier));
		}
		return false;
	}

	private _isDisaBledByExtensionKind(extension: IExtension): Boolean {
		if (this.extensionManagementServerService.remoteExtensionManagementServer || this.extensionManagementServerService.weBExtensionManagementServer) {
			const server = this.extensionManagementServerService.getExtensionManagementServer(extension);
			for (const extensionKind of getExtensionKind(extension.manifest, this.productService, this.configurationService)) {
				if (extensionKind === 'ui') {
					if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.localExtensionManagementServer === server) {
						return false;
					}
				}
				if (extensionKind === 'workspace') {
					if (server === this.extensionManagementServerService.remoteExtensionManagementServer) {
						return false;
					}
				}
				if (extensionKind === 'weB') {
					const enaBleLocalWeBWorker = this.configurationService.getValue<Boolean>(weBWorkerExtHostConfig);
					if (enaBleLocalWeBWorker) {
						// WeB extensions are enaBled on all configurations
						return false;
					}
					if (this.extensionManagementServerService.localExtensionManagementServer === null) {
						// WeB extensions run only in the weB
						return false;
					}
				}
			}
			return true;
		}
		return false;
	}

	private _getEnaBlementState(identifier: IExtensionIdentifier): EnaBlementState {
		if (this.hasWorkspace) {
			if (this._getWorkspaceEnaBledExtensions().filter(e => areSameExtensions(e, identifier))[0]) {
				return EnaBlementState.EnaBledWorkspace;
			}

			if (this._getWorkspaceDisaBledExtensions().filter(e => areSameExtensions(e, identifier))[0]) {
				return EnaBlementState.DisaBledWorkspace;
			}
		}
		if (this._isDisaBledGloBally(identifier)) {
			return EnaBlementState.DisaBledGloBally;
		}
		return EnaBlementState.EnaBledGloBally;
	}

	private _isDisaBledGloBally(identifier: IExtensionIdentifier): Boolean {
		return this.gloBalExtensionEnaBlementService.getDisaBledExtensions().some(e => areSameExtensions(e, identifier));
	}

	private _enaBleExtension(identifier: IExtensionIdentifier): Promise<Boolean> {
		this._removeFromWorkspaceDisaBledExtensions(identifier);
		this._removeFromWorkspaceEnaBledExtensions(identifier);
		return this.gloBalExtensionEnaBlementService.enaBleExtension(identifier, SOURCE);
	}

	private _disaBleExtension(identifier: IExtensionIdentifier): Promise<Boolean> {
		this._removeFromWorkspaceDisaBledExtensions(identifier);
		this._removeFromWorkspaceEnaBledExtensions(identifier);
		return this.gloBalExtensionEnaBlementService.disaBleExtension(identifier, SOURCE);
	}

	private _enaBleExtensionInWorkspace(identifier: IExtensionIdentifier): void {
		this._removeFromWorkspaceDisaBledExtensions(identifier);
		this._addToWorkspaceEnaBledExtensions(identifier);
	}

	private _disaBleExtensionInWorkspace(identifier: IExtensionIdentifier): void {
		this._addToWorkspaceDisaBledExtensions(identifier);
		this._removeFromWorkspaceEnaBledExtensions(identifier);
	}

	private _addToWorkspaceDisaBledExtensions(identifier: IExtensionIdentifier): Promise<Boolean> {
		if (!this.hasWorkspace) {
			return Promise.resolve(false);
		}
		let disaBledExtensions = this._getWorkspaceDisaBledExtensions();
		if (disaBledExtensions.every(e => !areSameExtensions(e, identifier))) {
			disaBledExtensions.push(identifier);
			this._setDisaBledExtensions(disaBledExtensions);
			return Promise.resolve(true);
		}
		return Promise.resolve(false);
	}

	private async _removeFromWorkspaceDisaBledExtensions(identifier: IExtensionIdentifier): Promise<Boolean> {
		if (!this.hasWorkspace) {
			return false;
		}
		let disaBledExtensions = this._getWorkspaceDisaBledExtensions();
		for (let index = 0; index < disaBledExtensions.length; index++) {
			const disaBledExtension = disaBledExtensions[index];
			if (areSameExtensions(disaBledExtension, identifier)) {
				disaBledExtensions.splice(index, 1);
				this._setDisaBledExtensions(disaBledExtensions);
				return true;
			}
		}
		return false;
	}

	private _addToWorkspaceEnaBledExtensions(identifier: IExtensionIdentifier): Boolean {
		if (!this.hasWorkspace) {
			return false;
		}
		let enaBledExtensions = this._getWorkspaceEnaBledExtensions();
		if (enaBledExtensions.every(e => !areSameExtensions(e, identifier))) {
			enaBledExtensions.push(identifier);
			this._setEnaBledExtensions(enaBledExtensions);
			return true;
		}
		return false;
	}

	private _removeFromWorkspaceEnaBledExtensions(identifier: IExtensionIdentifier): Boolean {
		if (!this.hasWorkspace) {
			return false;
		}
		let enaBledExtensions = this._getWorkspaceEnaBledExtensions();
		for (let index = 0; index < enaBledExtensions.length; index++) {
			const disaBledExtension = enaBledExtensions[index];
			if (areSameExtensions(disaBledExtension, identifier)) {
				enaBledExtensions.splice(index, 1);
				this._setEnaBledExtensions(enaBledExtensions);
				return true;
			}
		}
		return false;
	}

	protected _getWorkspaceEnaBledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(ENABLED_EXTENSIONS_STORAGE_PATH);
	}

	private _setEnaBledExtensions(enaBledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(ENABLED_EXTENSIONS_STORAGE_PATH, enaBledExtensions);
	}

	protected _getWorkspaceDisaBledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
	}

	private _setDisaBledExtensions(disaBledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disaBledExtensions);
	}

	private _getExtensions(storageId: string): IExtensionIdentifier[] {
		if (!this.hasWorkspace) {
			return [];
		}
		return this.storageManger.get(storageId, StorageScope.WORKSPACE);
	}

	private _setExtensions(storageId: string, extensions: IExtensionIdentifier[]): void {
		this.storageManger.set(storageId, extensions, StorageScope.WORKSPACE);
	}

	private async onDidChangeExtensions(extensionIdentifiers: ReadonlyArray<IExtensionIdentifier>, source?: string): Promise<void> {
		if (source !== SOURCE) {
			const installedExtensions = await this.extensionManagementService.getInstalled();
			const extensions = installedExtensions.filter(installedExtension => extensionIdentifiers.some(identifier => areSameExtensions(identifier, installedExtension.identifier)));
			this._onEnaBlementChanged.fire(extensions);
		}
	}

	private _onDidUninstallExtension({ identifier, error }: DidUninstallExtensionEvent): void {
		if (!error) {
			this._reset(identifier);
		}
	}

	private _reset(extension: IExtensionIdentifier) {
		this._removeFromWorkspaceDisaBledExtensions(extension);
		this._removeFromWorkspaceEnaBledExtensions(extension);
		this.gloBalExtensionEnaBlementService.enaBleExtension(extension);
	}
}

registerSingleton(IWorkBenchExtensionEnaBlementService, ExtensionEnaBlementService);
