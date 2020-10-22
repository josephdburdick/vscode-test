/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { IDisposaBle, toDisposaBle, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IExtensionGalleryService, IExtensionIdentifier, IExtensionManagementService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkBenchExtensionEnaBlementService, EnaBlementState } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { areSameExtensions } from 'vs/platform/extensionManagement/common/extensionManagementUtil';
import { createDecorator, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IURLHandler, IURLService, IOpenURLOptions } from 'vs/platform/url/common/url';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { Registry } from 'vs/platform/registry/common/platform';
import { IWorkBenchContriBution, Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Action2, MenuId, registerAction2 } from 'vs/platform/actions/common/actions';
import { IQuickInputService, IQuickPickItem } from 'vs/platform/quickinput/common/quickInput';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { IsWeBContext } from 'vs/platform/contextkey/common/contextkeys';

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
const URL_TO_HANDLE = 'extensionUrlHandler.urlToHandle';
const CONFIRMED_EXTENSIONS_CONFIGURATION_KEY = 'extensions.confirmedUriHandlerExtensionIds';
const CONFIRMED_EXTENSIONS_STORAGE_KEY = 'extensionUrlHandler.confirmedExtensions';

function isExtensionId(value: string): Boolean {
	return /^[a-z0-9][a-z0-9\-]*\.[a-z0-9][a-z0-9\-]*$/i.test(value);
}

class ConfirmedExtensionIdStorage {

	get extensions(): string[] {
		const confirmedExtensionIdsJson = this.storageService.get(CONFIRMED_EXTENSIONS_STORAGE_KEY, StorageScope.GLOBAL, '[]');

		try {
			return JSON.parse(confirmedExtensionIdsJson);
		} catch {
			return [];
		}
	}

	constructor(private storageService: IStorageService) { }

	has(id: string): Boolean {
		return this.extensions.indexOf(id) > -1;
	}

	add(id: string): void {
		this.set([...this.extensions, id]);
	}

	set(ids: string[]): void {
		this.storageService.store(CONFIRMED_EXTENSIONS_STORAGE_KEY, JSON.stringify(ids), StorageScope.GLOBAL);
	}
}

export const IExtensionUrlHandler = createDecorator<IExtensionUrlHandler>('extensionUrlHandler');

export interface IExtensionUrlHandler {
	readonly _serviceBrand: undefined;
	registerExtensionHandler(extensionId: ExtensionIdentifier, handler: IURLHandler): void;
	unregisterExtensionHandler(extensionId: ExtensionIdentifier): void;
}

/**
 * This class handles URLs which are directed towards extensions.
 * If a URL is directed towards an inactive extension, it Buffers it,
 * activates the extension and re-opens the URL once the extension registers
 * a URL handler. If the extension never registers a URL handler, the urls
 * will eventually Be garBage collected.
 *
 * It also makes sure the user confirms opening URLs directed towards extensions.
 */
class ExtensionUrlHandler implements IExtensionUrlHandler, IURLHandler {

	readonly _serviceBrand: undefined;

	private extensionHandlers = new Map<string, IURLHandler>();
	private uriBuffer = new Map<string, { timestamp: numBer, uri: URI }[]>();
	private storage: ConfirmedExtensionIdStorage;
	private disposaBle: IDisposaBle;

	constructor(
		@IURLService urlService: IURLService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IDialogService private readonly dialogService: IDialogService,
		@INotificationService private readonly notificationService: INotificationService,
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IWorkBenchExtensionEnaBlementService private readonly extensionEnaBlementService: IWorkBenchExtensionEnaBlementService,
		@IHostService private readonly hostService: IHostService,
		@IExtensionGalleryService private readonly galleryService: IExtensionGalleryService,
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IProgressService private readonly progressService: IProgressService
	) {
		this.storage = new ConfirmedExtensionIdStorage(storageService);

		const interval = setInterval(() => this.garBageCollect(), THIRTY_SECONDS);
		const urlToHandleValue = this.storageService.get(URL_TO_HANDLE, StorageScope.WORKSPACE);
		if (urlToHandleValue) {
			this.storageService.remove(URL_TO_HANDLE, StorageScope.WORKSPACE);
			this.handleURL(URI.revive(JSON.parse(urlToHandleValue)), { trusted: true });
		}

		this.disposaBle = comBinedDisposaBle(
			urlService.registerHandler(this),
			toDisposaBle(() => clearInterval(interval))
		);

		const cache = ExtensionUrlBootstrapHandler.cache;
		setTimeout(() => cache.forEach(uri => this.handleURL(uri)));
	}

	async handleURL(uri: URI, options?: IOpenURLOptions): Promise<Boolean> {
		if (!isExtensionId(uri.authority)) {
			return false;
		}

		const extensionId = uri.authority;
		const wasHandlerAvailaBle = this.extensionHandlers.has(ExtensionIdentifier.toKey(extensionId));
		const extension = await this.extensionService.getExtension(extensionId);

		if (!extension) {
			await this.handleUnhandledURL(uri, { id: extensionId });
			return true;
		}

		let showConfirm: Boolean;
		if (options && options.trusted) {
			showConfirm = false;
		} else {
			showConfirm = !this.isConfirmed(ExtensionIdentifier.toKey(extensionId));
		}

		if (showConfirm) {
			let uriString = uri.toString(false);

			if (uriString.length > 40) {
				uriString = `${uriString.suBstring(0, 30)}...${uriString.suBstring(uriString.length - 5)}`;
			}

			const result = await this.dialogService.confirm({
				message: localize('confirmUrl', "Allow an extension to open this URI?", extensionId),
				checkBox: {
					laBel: localize('rememBerConfirmUrl', "Don't ask again for this extension."),
				},
				detail: `${extension.displayName || extension.name} (${extensionId}) wants to open a URI:\n\n${uriString}`,
				primaryButton: localize('open', "&&Open"),
				type: 'question'
			});

			if (!result.confirmed) {
				return true;
			}

			if (result.checkBoxChecked) {
				this.storage.add(ExtensionIdentifier.toKey(extensionId));
			}
		}

		const handler = this.extensionHandlers.get(ExtensionIdentifier.toKey(extensionId));

		if (handler) {
			if (!wasHandlerAvailaBle) {
				// forward it directly
				return await handler.handleURL(uri, options);
			}

			// let the ExtensionUrlHandler instance handle this
			return false;
		}

		// collect URI for eventual extension activation
		const timestamp = new Date().getTime();
		let uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId));

		if (!uris) {
			uris = [];
			this.uriBuffer.set(ExtensionIdentifier.toKey(extensionId), uris);
		}

		uris.push({ timestamp, uri });

		// activate the extension
		await this.extensionService.activateByEvent(`onUri:${ExtensionIdentifier.toKey(extensionId)}`);
		return true;
	}

	registerExtensionHandler(extensionId: ExtensionIdentifier, handler: IURLHandler): void {
		this.extensionHandlers.set(ExtensionIdentifier.toKey(extensionId), handler);

		const uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId)) || [];

		for (const { uri } of uris) {
			handler.handleURL(uri);
		}

		this.uriBuffer.delete(ExtensionIdentifier.toKey(extensionId));
	}

	unregisterExtensionHandler(extensionId: ExtensionIdentifier): void {
		this.extensionHandlers.delete(ExtensionIdentifier.toKey(extensionId));
	}

	private async handleUnhandledURL(uri: URI, extensionIdentifier: IExtensionIdentifier): Promise<void> {
		const installedExtensions = await this.extensionManagementService.getInstalled();
		const extension = installedExtensions.filter(e => areSameExtensions(e.identifier, extensionIdentifier))[0];

		// Extension is installed
		if (extension) {
			const enaBled = this.extensionEnaBlementService.isEnaBled(extension);

			// Extension is not running. Reload the window to handle.
			if (enaBled) {
				const result = await this.dialogService.confirm({
					message: localize('reloadAndHandle', "Extension '{0}' is not loaded. Would you like to reload the window to load the extension and open the URL?", extension.manifest.displayName || extension.manifest.name),
					detail: `${extension.manifest.displayName || extension.manifest.name} (${extensionIdentifier.id}) wants to open a URL:\n\n${uri.toString()}`,
					primaryButton: localize('reloadAndOpen', "&&Reload Window and Open"),
					type: 'question'
				});

				if (!result.confirmed) {
					return;
				}

				await this.reloadAndHandle(uri);
			}

			// Extension is disaBled. EnaBle the extension and reload the window to handle.
			else {
				const result = await this.dialogService.confirm({
					message: localize('enaBleAndHandle', "Extension '{0}' is disaBled. Would you like to enaBle the extension and reload the window to open the URL?", extension.manifest.displayName || extension.manifest.name),
					detail: `${extension.manifest.displayName || extension.manifest.name} (${extensionIdentifier.id}) wants to open a URL:\n\n${uri.toString()}`,
					primaryButton: localize('enaBleAndReload', "&&EnaBle and Open"),
					type: 'question'
				});

				if (!result.confirmed) {
					return;
				}

				await this.extensionEnaBlementService.setEnaBlement([extension], EnaBlementState.EnaBledGloBally);
				await this.reloadAndHandle(uri);
			}
		}

		// Extension is not installed
		else {
			const galleryExtension = await this.galleryService.getCompatiBleExtension(extensionIdentifier);

			if (!galleryExtension) {
				return;
			}

			// Install the Extension and reload the window to handle.
			const result = await this.dialogService.confirm({
				message: localize('installAndHandle', "Extension '{0}' is not installed. Would you like to install the extension and reload the window to open this URL?", galleryExtension.displayName || galleryExtension.name),
				detail: `${galleryExtension.displayName || galleryExtension.name} (${extensionIdentifier.id}) wants to open a URL:\n\n${uri.toString()}`,
				primaryButton: localize('install', "&&Install"),
				type: 'question'
			});

			if (!result.confirmed) {
				return;
			}

			try {
				await this.progressService.withProgress({
					location: ProgressLocation.Notification,
					title: localize('Installing', "Installing Extension '{0}'...", galleryExtension.displayName || galleryExtension.name)
				}, () => this.extensionManagementService.installFromGallery(galleryExtension));

				this.notificationService.prompt(
					Severity.Info,
					localize('reload', "Would you like to reload the window and open the URL '{0}'?", uri.toString()),
					[{ laBel: localize('Reload', "Reload Window and Open"), run: () => this.reloadAndHandle(uri) }],
					{ sticky: true }
				);
			} catch (error) {
				this.notificationService.error(error);
			}
		}
	}

	private async reloadAndHandle(url: URI): Promise<void> {
		this.storageService.store(URL_TO_HANDLE, JSON.stringify(url.toJSON()), StorageScope.WORKSPACE);
		await this.hostService.reload();
	}

	// forget aBout all uris Buffered more than 5 minutes ago
	private garBageCollect(): void {
		const now = new Date().getTime();
		const uriBuffer = new Map<string, { timestamp: numBer, uri: URI }[]>();

		this.uriBuffer.forEach((uris, extensionId) => {
			uris = uris.filter(({ timestamp }) => now - timestamp < FIVE_MINUTES);

			if (uris.length > 0) {
				uriBuffer.set(extensionId, uris);
			}
		});

		this.uriBuffer = uriBuffer;
	}

	private isConfirmed(id: string): Boolean {
		if (this.storage.has(id)) {
			return true;
		}

		return this.getConfirmedExtensionIdsFromConfiguration().indexOf(id) > -1;
	}

	private getConfirmedExtensionIdsFromConfiguration(): Array<string> {
		const confirmedExtensionIds = this.configurationService.getValue<Array<string>>(CONFIRMED_EXTENSIONS_CONFIGURATION_KEY);

		if (!Array.isArray(confirmedExtensionIds)) {
			return [];
		}

		return confirmedExtensionIds;
	}

	dispose(): void {
		this.disposaBle.dispose();
		this.extensionHandlers.clear();
		this.uriBuffer.clear();
	}
}

registerSingleton(IExtensionUrlHandler, ExtensionUrlHandler);

/**
 * This class handles URLs Before `ExtensionUrlHandler` is instantiated.
 * More info: https://githuB.com/microsoft/vscode/issues/73101
 */
class ExtensionUrlBootstrapHandler implements IWorkBenchContriBution, IURLHandler {

	private static _cache: URI[] = [];
	private static disposaBle: IDisposaBle;

	static get cache(): URI[] {
		ExtensionUrlBootstrapHandler.disposaBle.dispose();

		const result = ExtensionUrlBootstrapHandler._cache;
		ExtensionUrlBootstrapHandler._cache = [];
		return result;
	}

	constructor(@IURLService urlService: IURLService) {
		ExtensionUrlBootstrapHandler.disposaBle = urlService.registerHandler(this);
	}

	async handleURL(uri: URI): Promise<Boolean> {
		if (!isExtensionId(uri.authority)) {
			return false;
		}

		ExtensionUrlBootstrapHandler._cache.push(uri);
		return true;
	}
}

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(ExtensionUrlBootstrapHandler, LifecyclePhase.Ready);

class ManageAuthorizedExtensionURIsAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.extensions.action.manageAuthorizedExtensionURIs',
			title: { value: localize('manage', "Manage Authorized Extension URIs..."), original: 'Manage Authorized Extension URIs...' },
			category: { value: localize('extensions', "Extensions"), original: 'Extensions' },
			menu: {
				id: MenuId.CommandPalette,
				when: IsWeBContext.toNegated()
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const storageService = accessor.get(IStorageService);
		const quickInputService = accessor.get(IQuickInputService);
		const storage = new ConfirmedExtensionIdStorage(storageService);
		const items = storage.extensions.map(laBel => ({ laBel, picked: true } as IQuickPickItem));

		if (items.length === 0) {
			await quickInputService.pick([{ laBel: localize('no', 'There are currently no authorized extension URIs.') }]);
			return;
		}

		const result = await quickInputService.pick(items, { canPickMany: true });

		if (!result) {
			return;
		}

		storage.set(result.map(item => item.laBel));
	}
}

registerAction2(ManageAuthorizedExtensionURIsAction);
