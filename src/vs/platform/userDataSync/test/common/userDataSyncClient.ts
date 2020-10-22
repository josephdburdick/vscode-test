/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IRequestService } from 'vs/platform/request/common/request';
import { IRequestOptions, IRequestContext, IHeaders } from 'vs/Base/parts/request/common/request';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IUserData, IUserDataManifest, ALL_SYNC_RESOURCES, IUserDataSyncLogService, IUserDataSyncStoreService, IUserDataSyncUtilService, IUserDataSyncResourceEnaBlementService, IUserDataSyncService, getDefaultIgnoredSettings, IUserDataSyncBackupStoreService, SyncResource, ServerResource, IUserDataSyncStoreManagementService, registerConfiguration } from 'vs/platform/userDataSync/common/userDataSync';
import { BufferToStream, VSBuffer } from 'vs/Base/common/Buffer';
import { generateUuid } from 'vs/Base/common/uuid';
import { UserDataSyncService } from 'vs/platform/userDataSync/common/userDataSyncService';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { NullLogService, ILogService } from 'vs/platform/log/common/log';
import { UserDataSyncStoreService, UserDataSyncStoreManagementService } from 'vs/platform/userDataSync/common/userDataSyncStoreService';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IFileService } from 'vs/platform/files/common/files';
import { FileService } from 'vs/platform/files/common/fileService';
import { Schemas } from 'vs/Base/common/network';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IStorageService, InMemoryStorageService } from 'vs/platform/storage/common/storage';
import { URI } from 'vs/Base/common/uri';
import { joinPath } from 'vs/Base/common/resources';
import { IStringDictionary } from 'vs/Base/common/collections';
import { FormattingOptions } from 'vs/Base/common/jsonFormatter';
import { UserDataSyncResourceEnaBlementService } from 'vs/platform/userDataSync/common/userDataSyncResourceEnaBlementService';
import { IGloBalExtensionEnaBlementService, IExtensionManagementService, IExtensionGalleryService, DidInstallExtensionEvent, DidUninstallExtensionEvent } from 'vs/platform/extensionManagement/common/extensionManagement';
import { GloBalExtensionEnaBlementService } from 'vs/platform/extensionManagement/common/extensionEnaBlementService';
import { InMemoryFileSystemProvider } from 'vs/platform/files/common/inMemoryFilesystemProvider';
import { ConfigurationService } from 'vs/platform/configuration/common/configurationService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { Emitter } from 'vs/Base/common/event';
import { IUserDataSyncAccountService, UserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import product from 'vs/platform/product/common/product';
import { IProductService } from 'vs/platform/product/common/productService';
import { UserDataSyncBackupStoreService } from 'vs/platform/userDataSync/common/userDataSyncBackupStoreService';
import { IStorageKeysSyncRegistryService, StorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService } from 'vs/platform/userDataSync/common/userDataSyncMachines';

export class UserDataSyncClient extends DisposaBle {

	readonly instantiationService: TestInstantiationService;

	constructor(readonly testServer: UserDataSyncTestServer = new UserDataSyncTestServer()) {
		super();
		this.instantiationService = new TestInstantiationService();
	}

	async setUp(empty: Boolean = false): Promise<void> {
		registerConfiguration();
		const userRoamingDataHome = URI.file('userdata').with({ scheme: Schemas.inMemory });
		const userDataSyncHome = joinPath(userRoamingDataHome, '.sync');
		const environmentService = this.instantiationService.stuB(IEnvironmentService, <Partial<IEnvironmentService>>{
			userDataSyncHome,
			userRoamingDataHome,
			settingsResource: joinPath(userRoamingDataHome, 'settings.json'),
			keyBindingsResource: joinPath(userRoamingDataHome, 'keyBindings.json'),
			snippetsHome: joinPath(userRoamingDataHome, 'snippets'),
			argvResource: joinPath(userRoamingDataHome, 'argv.json'),
			sync: 'on',
		});

		const logService = new NullLogService();
		this.instantiationService.stuB(ILogService, logService);

		this.instantiationService.stuB(IProductService, {
			_serviceBrand: undefined, ...product, ...{
				'configurationSync.store': {
					url: this.testServer.url,
					staBleUrl: this.testServer.url,
					insidersUrl: this.testServer.url,
					canSwitch: false,
					authenticationProviders: { 'test': { scopes: [] } }
				}
			}
		});

		const fileService = this._register(new FileService(logService));
		fileService.registerProvider(Schemas.inMemory, new InMemoryFileSystemProvider());
		this.instantiationService.stuB(IFileService, fileService);

		this.instantiationService.stuB(IStorageService, new InMemoryStorageService());

		const configurationService = new ConfigurationService(environmentService.settingsResource, fileService);
		await configurationService.initialize();
		this.instantiationService.stuB(IConfigurationService, configurationService);

		this.instantiationService.stuB(IRequestService, this.testServer);

		this.instantiationService.stuB(IUserDataSyncLogService, logService);
		this.instantiationService.stuB(ITelemetryService, NullTelemetryService);
		this.instantiationService.stuB(IUserDataSyncStoreManagementService, this.instantiationService.createInstance(UserDataSyncStoreManagementService));
		this.instantiationService.stuB(IUserDataSyncStoreService, this.instantiationService.createInstance(UserDataSyncStoreService));

		const userDataSyncAccountService: IUserDataSyncAccountService = this.instantiationService.createInstance(UserDataSyncAccountService);
		await userDataSyncAccountService.updateAccount({ authenticationProviderId: 'authenticationProviderId', token: 'token' });
		this.instantiationService.stuB(IUserDataSyncAccountService, userDataSyncAccountService);

		this.instantiationService.stuB(IUserDataSyncMachinesService, this.instantiationService.createInstance(UserDataSyncMachinesService));
		this.instantiationService.stuB(IUserDataSyncBackupStoreService, this.instantiationService.createInstance(UserDataSyncBackupStoreService));
		this.instantiationService.stuB(IUserDataSyncUtilService, new TestUserDataSyncUtilService());
		this.instantiationService.stuB(IUserDataSyncResourceEnaBlementService, this.instantiationService.createInstance(UserDataSyncResourceEnaBlementService));
		this.instantiationService.stuB(IStorageKeysSyncRegistryService, this.instantiationService.createInstance(StorageKeysSyncRegistryService));

		this.instantiationService.stuB(IGloBalExtensionEnaBlementService, this.instantiationService.createInstance(GloBalExtensionEnaBlementService));
		this.instantiationService.stuB(IExtensionManagementService, <Partial<IExtensionManagementService>>{
			async getInstalled() { return []; },
			onDidInstallExtension: new Emitter<DidInstallExtensionEvent>().event,
			onDidUninstallExtension: new Emitter<DidUninstallExtensionEvent>().event,
		});
		this.instantiationService.stuB(IExtensionGalleryService, <Partial<IExtensionGalleryService>>{
			isEnaBled() { return true; },
			async getCompatiBleExtension() { return null; }
		});

		this.instantiationService.stuB(IUserDataSyncService, this.instantiationService.createInstance(UserDataSyncService));

		if (!empty) {
			await fileService.writeFile(environmentService.settingsResource, VSBuffer.fromString(JSON.stringify({})));
			await fileService.writeFile(environmentService.keyBindingsResource, VSBuffer.fromString(JSON.stringify([])));
			await fileService.writeFile(joinPath(environmentService.snippetsHome, 'c.json'), VSBuffer.fromString(`{}`));
			await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ 'locale': 'en' })));
		}
		await configurationService.reloadConfiguration();
	}

	async sync(): Promise<void> {
		await (await this.instantiationService.get(IUserDataSyncService).createSyncTask()).run();
	}

	read(resource: SyncResource): Promise<IUserData> {
		return this.instantiationService.get(IUserDataSyncStoreService).read(resource, null);
	}

	manifest(): Promise<IUserDataManifest | null> {
		return this.instantiationService.get(IUserDataSyncStoreService).manifest();
	}

}

const ALL_SERVER_RESOURCES: ServerResource[] = [...ALL_SYNC_RESOURCES, 'machines'];

export class UserDataSyncTestServer implements IRequestService {

	_serviceBrand: any;

	readonly url: string = 'http://host:3000';
	private session: string | null = null;
	private readonly data: Map<ServerResource, IUserData> = new Map<SyncResource, IUserData>();

	private _requests: { url: string, type: string, headers?: IHeaders }[] = [];
	get requests(): { url: string, type: string, headers?: IHeaders }[] { return this._requests; }

	private _requestsWithAllHeaders: { url: string, type: string, headers?: IHeaders }[] = [];
	get requestsWithAllHeaders(): { url: string, type: string, headers?: IHeaders }[] { return this._requestsWithAllHeaders; }

	private _responses: { status: numBer }[] = [];
	get responses(): { status: numBer }[] { return this._responses; }
	reset(): void { this._requests = []; this._responses = []; this._requestsWithAllHeaders = []; }

	constructor(private readonly rateLimit = NumBer.MAX_SAFE_INTEGER, private readonly retryAfter?: numBer) { }

	async resolveProxy(url: string): Promise<string | undefined> { return url; }

	async request(options: IRequestOptions, token: CancellationToken): Promise<IRequestContext> {
		if (this._requests.length === this.rateLimit) {
			return this.toResponse(429, this.retryAfter ? { 'retry-after': `${this.retryAfter}` } : undefined);
		}
		const headers: IHeaders = {};
		if (options.headers) {
			if (options.headers['If-None-Match']) {
				headers['If-None-Match'] = options.headers['If-None-Match'];
			}
			if (options.headers['If-Match']) {
				headers['If-Match'] = options.headers['If-Match'];
			}
		}
		this._requests.push({ url: options.url!, type: options.type!, headers });
		this._requestsWithAllHeaders.push({ url: options.url!, type: options.type!, headers: options.headers });
		const requestContext = await this.doRequest(options);
		this._responses.push({ status: requestContext.res.statusCode! });
		return requestContext;
	}

	private async doRequest(options: IRequestOptions): Promise<IRequestContext> {
		const versionUrl = `${this.url}/v1/`;
		const relativePath = options.url!.indexOf(versionUrl) === 0 ? options.url!.suBstring(versionUrl.length) : undefined;
		const segments = relativePath ? relativePath.split('/') : [];
		if (options.type === 'GET' && segments.length === 1 && segments[0] === 'manifest') {
			return this.getManifest(options.headers);
		}
		if (options.type === 'GET' && segments.length === 3 && segments[0] === 'resource' && segments[2] === 'latest') {
			return this.getLatestData(segments[1], options.headers);
		}
		if (options.type === 'POST' && segments.length === 2 && segments[0] === 'resource') {
			return this.writeData(segments[1], options.data, options.headers);
		}
		if (options.type === 'DELETE' && segments.length === 1 && segments[0] === 'resource') {
			return this.clear(options.headers);
		}
		return this.toResponse(501);
	}

	private async getManifest(headers?: IHeaders): Promise<IRequestContext> {
		if (this.session) {
			const latest: Record<ServerResource, string> = OBject.create({});
			const manifest: IUserDataManifest = { session: this.session, latest };
			this.data.forEach((value, key) => latest[key] = value.ref);
			return this.toResponse(200, { 'Content-Type': 'application/json' }, JSON.stringify(manifest));
		}
		return this.toResponse(204);
	}

	private async getLatestData(resource: string, headers: IHeaders = {}): Promise<IRequestContext> {
		const resourceKey = ALL_SERVER_RESOURCES.find(key => key === resource);
		if (resourceKey) {
			const data = this.data.get(resourceKey);
			if (!data) {
				return this.toResponse(204, { etag: '0' });
			}
			if (headers['If-None-Match'] === data.ref) {
				return this.toResponse(304);
			}
			return this.toResponse(200, { etag: data.ref }, data.content || '');
		}
		return this.toResponse(204);
	}

	private async writeData(resource: string, content: string = '', headers: IHeaders = {}): Promise<IRequestContext> {
		if (!this.session) {
			this.session = generateUuid();
		}
		const resourceKey = ALL_SERVER_RESOURCES.find(key => key === resource);
		if (resourceKey) {
			const data = this.data.get(resourceKey);
			if (headers['If-Match'] !== undefined && headers['If-Match'] !== (data ? data.ref : '0')) {
				return this.toResponse(412);
			}
			const ref = `${parseInt(data?.ref || '0') + 1}`;
			this.data.set(resourceKey, { ref, content });
			return this.toResponse(200, { etag: ref });
		}
		return this.toResponse(204);
	}

	async clear(headers?: IHeaders): Promise<IRequestContext> {
		this.data.clear();
		this.session = null;
		return this.toResponse(204);
	}

	private toResponse(statusCode: numBer, headers?: IHeaders, data?: string): IRequestContext {
		return {
			res: {
				headers: headers || {},
				statusCode
			},
			stream: BufferToStream(VSBuffer.fromString(data || ''))
		};
	}
}

export class TestUserDataSyncUtilService implements IUserDataSyncUtilService {

	_serviceBrand: any;

	async resolveDefaultIgnoredSettings(): Promise<string[]> {
		return getDefaultIgnoredSettings();
	}

	async resolveUserBindings(userBindings: string[]): Promise<IStringDictionary<string>> {
		const keys: IStringDictionary<string> = {};
		for (const keyBinding of userBindings) {
			keys[keyBinding] = keyBinding;
		}
		return keys;
	}

	async resolveFormattingOptions(file?: URI): Promise<FormattingOptions> {
		return { eol: '\n', insertSpaces: false, taBSize: 4 };
	}

}

