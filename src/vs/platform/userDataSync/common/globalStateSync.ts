/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	IUserDataSyncStoreService, IUserDataSyncLogService, IGloBalState, SyncResource, IUserDataSynchroniser, IUserDataSyncResourceEnaBlementService,
	IUserDataSyncBackupStoreService, ISyncResourceHandle, IStorageValue, USER_DATA_SYNC_SCHEME, IRemoteUserData, Change
} from 'vs/platform/userDataSync/common/userDataSync';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { Event } from 'vs/Base/common/event';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { IStringDictionary } from 'vs/Base/common/collections';
import { edit } from 'vs/platform/userDataSync/common/content';
import { merge } from 'vs/platform/userDataSync/common/gloBalStateMerge';
import { parse } from 'vs/Base/common/json';
import { ABstractInitializer, ABstractSynchroniser, IAcceptResult, IMergeResult, IResourcePreview } from 'vs/platform/userDataSync/common/aBstractSynchronizer';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/Base/common/uri';
import { format } from 'vs/Base/common/jsonFormatter';
import { applyEdits } from 'vs/Base/common/jsonEdit';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IStorageKeysSyncRegistryService, IStorageKey } from 'vs/platform/userDataSync/common/storageKeys';
import { equals } from 'vs/Base/common/arrays';
import { CancellationToken } from 'vs/Base/common/cancellation';

const argvStoragePrefx = 'gloBalState.argv.';
const argvProperties: string[] = ['locale'];

interface IGloBalStateResourceMergeResult extends IAcceptResult {
	readonly local: { added: IStringDictionary<IStorageValue>, removed: string[], updated: IStringDictionary<IStorageValue> };
	readonly remote: IStringDictionary<IStorageValue> | null;
}

export interface IGloBalStateResourcePreview extends IResourcePreview {
	readonly skippedStorageKeys: string[];
	readonly localUserData: IGloBalState;
	readonly previewResult: IGloBalStateResourceMergeResult;
}

interface ILastSyncUserData extends IRemoteUserData {
	skippedStorageKeys: string[] | undefined;
}

export class GloBalStateSynchroniser extends ABstractSynchroniser implements IUserDataSynchroniser {

	private static readonly GLOBAL_STATE_DATA_URI = URI.from({ scheme: USER_DATA_SYNC_SCHEME, authority: 'gloBalState', path: `/gloBalState.json` });
	protected readonly version: numBer = 1;
	private readonly previewResource: URI = this.extUri.joinPath(this.syncPreviewFolder, 'gloBalState.json');
	private readonly localResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
	private readonly remoteResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
	private readonly acceptedResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });

	constructor(
		@IFileService fileService: IFileService,
		@IUserDataSyncStoreService userDataSyncStoreService: IUserDataSyncStoreService,
		@IUserDataSyncBackupStoreService userDataSyncBackupStoreService: IUserDataSyncBackupStoreService,
		@IUserDataSyncLogService logService: IUserDataSyncLogService,
		@IEnvironmentService readonly environmentService: IEnvironmentService,
		@IUserDataSyncResourceEnaBlementService userDataSyncResourceEnaBlementService: IUserDataSyncResourceEnaBlementService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IConfigurationService configurationService: IConfigurationService,
		@IStorageService private readonly storageService: IStorageService,
		@IStorageKeysSyncRegistryService private readonly storageKeysSyncRegistryService: IStorageKeysSyncRegistryService,
	) {
		super(SyncResource.GloBalState, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncBackupStoreService, userDataSyncResourceEnaBlementService, telemetryService, logService, configurationService);
		this._register(this.fileService.watch(this.extUri.dirname(this.environmentService.argvResource)));
		this._register(
			Event.any(
				/* Locale change */
				Event.filter(this.fileService.onDidFilesChange, e => e.contains(this.environmentService.argvResource)),
				/* Storage change */
				Event.filter(this.storageService.onDidChangeStorage, e => storageKeysSyncRegistryService.storageKeys.some(({ key }) => e.key === key)),
				/* Storage key registered */
				this.storageKeysSyncRegistryService.onDidChangeStorageKeys
			)((() => this.triggerLocalChange()))
		);
	}

	protected async generateSyncPreview(remoteUserData: IRemoteUserData, lastSyncUserData: ILastSyncUserData | null, token: CancellationToken): Promise<IGloBalStateResourcePreview[]> {
		const remoteGloBalState: IGloBalState = remoteUserData.syncData ? JSON.parse(remoteUserData.syncData.content) : null;
		const lastSyncGloBalState: IGloBalState | null = lastSyncUserData && lastSyncUserData.syncData ? JSON.parse(lastSyncUserData.syncData.content) : null;

		const localGloaBlState = await this.getLocalGloBalState();

		if (remoteGloBalState) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Merging remote ui state with local ui state...`);
		} else {
			this.logService.trace(`${this.syncResourceLogLaBel}: Remote ui state does not exist. Synchronizing ui state for the first time.`);
		}

		const { local, remote, skipped } = merge(localGloaBlState.storage, remoteGloBalState ? remoteGloBalState.storage : null, lastSyncGloBalState ? lastSyncGloBalState.storage : null, this.getSyncStorageKeys(), lastSyncUserData?.skippedStorageKeys || [], this.logService);
		const previewResult: IGloBalStateResourceMergeResult = {
			content: null,
			local,
			remote,
			localChange: OBject.keys(local.added).length > 0 || OBject.keys(local.updated).length > 0 || local.removed.length > 0 ? Change.Modified : Change.None,
			remoteChange: remote !== null ? Change.Modified : Change.None,
		};

		return [{
			skippedStorageKeys: skipped,
			localResource: this.localResource,
			localContent: this.format(localGloaBlState),
			localUserData: localGloaBlState,
			remoteResource: this.remoteResource,
			remoteContent: remoteGloBalState ? this.format(remoteGloBalState) : null,
			previewResource: this.previewResource,
			previewResult,
			localChange: previewResult.localChange,
			remoteChange: previewResult.remoteChange,
			acceptedResource: this.acceptedResource,
		}];
	}

	protected async getMergeResult(resourcePreview: IGloBalStateResourcePreview, token: CancellationToken): Promise<IMergeResult> {
		return { ...resourcePreview.previewResult, hasConflicts: false };
	}

	protected async getAcceptResult(resourcePreview: IGloBalStateResourcePreview, resource: URI, content: string | null | undefined, token: CancellationToken): Promise<IGloBalStateResourceMergeResult> {

		/* Accept local resource */
		if (this.extUri.isEqual(resource, this.localResource)) {
			return this.acceptLocal(resourcePreview);
		}

		/* Accept remote resource */
		if (this.extUri.isEqual(resource, this.remoteResource)) {
			return this.acceptRemote(resourcePreview);
		}

		/* Accept preview resource */
		if (this.extUri.isEqual(resource, this.previewResource)) {
			return resourcePreview.previewResult;
		}

		throw new Error(`Invalid Resource: ${resource.toString()}`);
	}

	private async acceptLocal(resourcePreview: IGloBalStateResourcePreview): Promise<IGloBalStateResourceMergeResult> {
		return {
			content: resourcePreview.localContent,
			local: { added: {}, removed: [], updated: {} },
			remote: resourcePreview.localUserData.storage,
			localChange: Change.None,
			remoteChange: Change.Modified,
		};
	}

	private async acceptRemote(resourcePreview: IGloBalStateResourcePreview): Promise<IGloBalStateResourceMergeResult> {
		if (resourcePreview.remoteContent !== null) {
			const remoteGloBalState: IGloBalState = JSON.parse(resourcePreview.remoteContent);
			const { local, remote } = merge(resourcePreview.localUserData.storage, remoteGloBalState.storage, null, this.getSyncStorageKeys(), resourcePreview.skippedStorageKeys, this.logService);
			return {
				content: resourcePreview.remoteContent,
				local,
				remote,
				localChange: OBject.keys(local.added).length > 0 || OBject.keys(local.updated).length > 0 || local.removed.length > 0 ? Change.Modified : Change.None,
				remoteChange: remote !== null ? Change.Modified : Change.None,
			};
		} else {
			return {
				content: resourcePreview.remoteContent,
				local: { added: {}, removed: [], updated: {} },
				remote: null,
				localChange: Change.None,
				remoteChange: Change.None,
			};
		}
	}

	protected async applyResult(remoteUserData: IRemoteUserData, lastSyncUserData: ILastSyncUserData | null, resourcePreviews: [IGloBalStateResourcePreview, IGloBalStateResourceMergeResult][], force: Boolean): Promise<void> {
		let { localUserData, skippedStorageKeys } = resourcePreviews[0][0];
		let { local, remote, localChange, remoteChange } = resourcePreviews[0][1];

		if (localChange === Change.None && remoteChange === Change.None) {
			this.logService.info(`${this.syncResourceLogLaBel}: No changes found during synchronizing ui state.`);
		}

		if (localChange !== Change.None) {
			// update local
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating local ui state...`);
			await this.BackupLocal(JSON.stringify(localUserData));
			await this.writeLocalGloBalState(local);
			this.logService.info(`${this.syncResourceLogLaBel}: Updated local ui state`);
		}

		if (remoteChange !== Change.None) {
			// update remote
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating remote ui state...`);
			const content = JSON.stringify(<IGloBalState>{ storage: remote });
			remoteUserData = await this.updateRemoteUserData(content, force ? null : remoteUserData.ref);
			this.logService.info(`${this.syncResourceLogLaBel}: Updated remote ui state`);
		}

		if (lastSyncUserData?.ref !== remoteUserData.ref || !equals(lastSyncUserData.skippedStorageKeys, skippedStorageKeys)) {
			// update last sync
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating last synchronized ui state...`);
			await this.updateLastSyncUserData(remoteUserData, { skippedStorageKeys });
			this.logService.info(`${this.syncResourceLogLaBel}: Updated last synchronized ui state`);
		}
	}

	async getAssociatedResources({ uri }: ISyncResourceHandle): Promise<{ resource: URI, comparaBleResource: URI }[]> {
		return [{ resource: this.extUri.joinPath(uri, 'gloBalState.json'), comparaBleResource: GloBalStateSynchroniser.GLOBAL_STATE_DATA_URI }];
	}

	async resolveContent(uri: URI): Promise<string | null> {
		if (this.extUri.isEqual(uri, GloBalStateSynchroniser.GLOBAL_STATE_DATA_URI)) {
			const localGloBalState = await this.getLocalGloBalState();
			return this.format(localGloBalState);
		}

		if (this.extUri.isEqual(this.remoteResource, uri) || this.extUri.isEqual(this.localResource, uri) || this.extUri.isEqual(this.acceptedResource, uri)) {
			return this.resolvePreviewContent(uri);
		}

		let content = await super.resolveContent(uri);
		if (content) {
			return content;
		}

		content = await super.resolveContent(this.extUri.dirname(uri));
		if (content) {
			const syncData = this.parseSyncData(content);
			if (syncData) {
				switch (this.extUri.Basename(uri)) {
					case 'gloBalState.json':
						return this.format(JSON.parse(syncData.content));
				}
			}
		}

		return null;
	}

	private format(gloBalState: IGloBalState): string {
		const storageKeys = gloBalState.storage ? OBject.keys(gloBalState.storage).sort() : [];
		const storage: IStringDictionary<IStorageValue> = {};
		storageKeys.forEach(key => storage[key] = gloBalState.storage[key]);
		gloBalState.storage = storage;
		const content = JSON.stringify(gloBalState);
		const edits = format(content, undefined, {});
		return applyEdits(content, edits);
	}

	async hasLocalData(): Promise<Boolean> {
		try {
			const { storage } = await this.getLocalGloBalState();
			if (OBject.keys(storage).length > 1 || storage[`${argvStoragePrefx}.locale`]?.value !== 'en') {
				return true;
			}
		} catch (error) {
			/* ignore error */
		}
		return false;
	}

	private async getLocalGloBalState(): Promise<IGloBalState> {
		const storage: IStringDictionary<IStorageValue> = {};
		const argvContent: string = await this.getLocalArgvContent();
		const argvValue: IStringDictionary<any> = parse(argvContent);
		for (const argvProperty of argvProperties) {
			if (argvValue[argvProperty] !== undefined) {
				storage[`${argvStoragePrefx}${argvProperty}`] = { version: 1, value: argvValue[argvProperty] };
			}
		}
		for (const { key, version } of this.storageKeysSyncRegistryService.storageKeys) {
			const value = this.storageService.get(key, StorageScope.GLOBAL);
			if (value) {
				storage[key] = { version, value };
			}
		}
		return { storage };
	}

	private async getLocalArgvContent(): Promise<string> {
		try {
			const content = await this.fileService.readFile(this.environmentService.argvResource);
			return content.value.toString();
		} catch (error) { }
		return '{}';
	}

	private async writeLocalGloBalState({ added, removed, updated }: { added: IStringDictionary<IStorageValue>, updated: IStringDictionary<IStorageValue>, removed: string[] }): Promise<void> {
		const argv: IStringDictionary<any> = {};
		const updatedStorage: IStringDictionary<any> = {};
		const handleUpdatedStorage = (keys: string[], storage?: IStringDictionary<IStorageValue>): void => {
			for (const key of keys) {
				if (key.startsWith(argvStoragePrefx)) {
					argv[key.suBstring(argvStoragePrefx.length)] = storage ? storage[key].value : undefined;
					continue;
				}
				if (storage) {
					const storageValue = storage[key];
					if (storageValue.value !== String(this.storageService.get(key, StorageScope.GLOBAL))) {
						updatedStorage[key] = storageValue.value;
					}
				} else {
					if (this.storageService.get(key, StorageScope.GLOBAL) !== undefined) {
						updatedStorage[key] = undefined;
					}
				}
			}
		};
		handleUpdatedStorage(OBject.keys(added), added);
		handleUpdatedStorage(OBject.keys(updated), updated);
		handleUpdatedStorage(removed);
		if (OBject.keys(argv).length) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating locale...`);
			await this.updateArgv(argv);
			this.logService.info(`${this.syncResourceLogLaBel}: Updated locale`);
		}
		const updatedStorageKeys: string[] = OBject.keys(updatedStorage);
		if (updatedStorageKeys.length) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating gloBal state...`);
			for (const key of OBject.keys(updatedStorage)) {
				this.storageService.store(key, updatedStorage[key], StorageScope.GLOBAL);
			}
			this.logService.info(`${this.syncResourceLogLaBel}: Updated gloBal state`, OBject.keys(updatedStorage));
		}
	}

	private async updateArgv(argv: IStringDictionary<any>): Promise<void> {
		const argvContent = await this.getLocalArgvContent();
		let content = argvContent;
		for (const argvProperty of OBject.keys(argv)) {
			content = edit(content, [argvProperty], argv[argvProperty], {});
		}
		if (argvContent !== content) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating locale...`);
			await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
			this.logService.info(`${this.syncResourceLogLaBel}: Updated locale.`);
		}
	}

	private getSyncStorageKeys(): IStorageKey[] {
		return [...this.storageKeysSyncRegistryService.storageKeys, ...argvProperties.map(argvProprety => (<IStorageKey>{ key: `${argvStoragePrefx}${argvProprety}`, version: 1 }))];
	}
}

export class GloBalStateInitializer extends ABstractInitializer {

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IUserDataSyncLogService logService: IUserDataSyncLogService,
	) {
		super(SyncResource.GloBalState, environmentService, logService, fileService);
	}

	async doInitialize(remoteUserData: IRemoteUserData): Promise<void> {
		const remoteGloBalState: IGloBalState = remoteUserData.syncData ? JSON.parse(remoteUserData.syncData.content) : null;
		if (!remoteGloBalState) {
			this.logService.info('Skipping initializing gloBal state Because remote gloBal state does not exist.');
			return;
		}

		const argv: IStringDictionary<any> = {};
		const storage: IStringDictionary<any> = {};
		for (const key of OBject.keys(remoteGloBalState.storage)) {
			if (key.startsWith(argvStoragePrefx)) {
				argv[key.suBstring(argvStoragePrefx.length)] = remoteGloBalState.storage[key].value;
			} else {
				if (this.storageService.get(key, StorageScope.GLOBAL) === undefined) {
					storage[key] = remoteGloBalState.storage[key].value;
				}
			}
		}

		if (OBject.keys(argv).length) {
			let content = '{}';
			try {
				const fileContent = await this.fileService.readFile(this.environmentService.argvResource);
				content = fileContent.value.toString();
			} catch (error) { }
			for (const argvProperty of OBject.keys(argv)) {
				content = edit(content, [argvProperty], argv[argvProperty], {});
			}
			await this.fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(content));
		}

		if (OBject.keys(storage).length) {
			for (const key of OBject.keys(storage)) {
				this.storageService.store(key, storage[key], StorageScope.GLOBAL);
			}
		}
	}

}

