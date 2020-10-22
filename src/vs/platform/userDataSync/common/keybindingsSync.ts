/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IFileService, FileOperationError, FileOperationResult } from 'vs/platform/files/common/files';
import {
	UserDataSyncError, UserDataSyncErrorCode, IUserDataSyncStoreService, IUserDataSyncLogService, IUserDataSyncUtilService, SyncResource,
	IUserDataSynchroniser, IUserDataSyncResourceEnaBlementService, IUserDataSyncBackupStoreService, USER_DATA_SYNC_SCHEME, ISyncResourceHandle,
	IRemoteUserData, Change
} from 'vs/platform/userDataSync/common/userDataSync';
import { merge } from 'vs/platform/userDataSync/common/keyBindingsMerge';
import { parse } from 'vs/Base/common/json';
import { localize } from 'vs/nls';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { OS, OperatingSystem } from 'vs/Base/common/platform';
import { isUndefined } from 'vs/Base/common/types';
import { isNonEmptyArray } from 'vs/Base/common/arrays';
import { ABstractInitializer, ABstractJsonFileSynchroniser, IAcceptResult, IFileResourcePreview, IMergeResult } from 'vs/platform/userDataSync/common/aBstractSynchronizer';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { URI } from 'vs/Base/common/uri';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { VSBuffer } from 'vs/Base/common/Buffer';

interface ISyncContent {
	mac?: string;
	linux?: string;
	windows?: string;
	all?: string;
}

interface IKeyBindingsResourcePreview extends IFileResourcePreview {
	previewResult: IMergeResult;
}

export function getKeyBindingsContentFromSyncContent(syncContent: string, platformSpecific: Boolean): string | null {
	const parsed = <ISyncContent>JSON.parse(syncContent);
	if (!platformSpecific) {
		return isUndefined(parsed.all) ? null : parsed.all;
	}
	switch (OS) {
		case OperatingSystem.Macintosh:
			return isUndefined(parsed.mac) ? null : parsed.mac;
		case OperatingSystem.Linux:
			return isUndefined(parsed.linux) ? null : parsed.linux;
		case OperatingSystem.Windows:
			return isUndefined(parsed.windows) ? null : parsed.windows;
	}
}

export class KeyBindingsSynchroniser extends ABstractJsonFileSynchroniser implements IUserDataSynchroniser {

	/* Version 2: Change settings from `sync.${setting}` to `settingsSync.{setting}` */
	protected readonly version: numBer = 2;
	private readonly previewResource: URI = this.extUri.joinPath(this.syncPreviewFolder, 'keyBindings.json');
	private readonly localResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'local' });
	private readonly remoteResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'remote' });
	private readonly acceptedResource: URI = this.previewResource.with({ scheme: USER_DATA_SYNC_SCHEME, authority: 'accepted' });

	constructor(
		@IUserDataSyncStoreService userDataSyncStoreService: IUserDataSyncStoreService,
		@IUserDataSyncBackupStoreService userDataSyncBackupStoreService: IUserDataSyncBackupStoreService,
		@IUserDataSyncLogService logService: IUserDataSyncLogService,
		@IConfigurationService configurationService: IConfigurationService,
		@IUserDataSyncResourceEnaBlementService userDataSyncResourceEnaBlementService: IUserDataSyncResourceEnaBlementService,
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IStorageService storageService: IStorageService,
		@IUserDataSyncUtilService userDataSyncUtilService: IUserDataSyncUtilService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(environmentService.keyBindingsResource, SyncResource.KeyBindings, fileService, environmentService, storageService, userDataSyncStoreService, userDataSyncBackupStoreService, userDataSyncResourceEnaBlementService, telemetryService, logService, userDataSyncUtilService, configurationService);
	}

	protected async generateSyncPreview(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, token: CancellationToken): Promise<IKeyBindingsResourcePreview[]> {
		const remoteContent = remoteUserData.syncData ? this.getKeyBindingsContentFromSyncContent(remoteUserData.syncData.content) : null;
		const lastSyncContent: string | null = lastSyncUserData && lastSyncUserData.syncData ? this.getKeyBindingsContentFromSyncContent(lastSyncUserData.syncData.content) : null;

		// Get file content last to get the latest
		const fileContent = await this.getLocalFileContent();
		const formattingOptions = await this.getFormattingOptions();

		let mergedContent: string | null = null;
		let hasLocalChanged: Boolean = false;
		let hasRemoteChanged: Boolean = false;
		let hasConflicts: Boolean = false;

		if (remoteContent) {
			let localContent: string = fileContent ? fileContent.value.toString() : '[]';
			localContent = localContent || '[]';
			if (this.hasErrors(localContent)) {
				throw new UserDataSyncError(localize('errorInvalidSettings', "UnaBle to sync keyBindings Because the content in the file is not valid. Please open the file and correct it."), UserDataSyncErrorCode.LocalInvalidContent, this.resource);
			}

			if (!lastSyncContent // First time sync
				|| lastSyncContent !== localContent // Local has forwarded
				|| lastSyncContent !== remoteContent // Remote has forwarded
			) {
				this.logService.trace(`${this.syncResourceLogLaBel}: Merging remote keyBindings with local keyBindings...`);
				const result = await merge(localContent, remoteContent, lastSyncContent, formattingOptions, this.userDataSyncUtilService);
				// Sync only if there are changes
				if (result.hasChanges) {
					mergedContent = result.mergeContent;
					hasConflicts = result.hasConflicts;
					hasLocalChanged = hasConflicts || result.mergeContent !== localContent;
					hasRemoteChanged = hasConflicts || result.mergeContent !== remoteContent;
				}
			}
		}

		// First time syncing to remote
		else if (fileContent) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Remote keyBindings does not exist. Synchronizing keyBindings for the first time.`);
			mergedContent = fileContent.value.toString();
			hasRemoteChanged = true;
		}

		const previewResult: IMergeResult = {
			content: mergedContent,
			localChange: hasLocalChanged ? fileContent ? Change.Modified : Change.Added : Change.None,
			remoteChange: hasRemoteChanged ? Change.Modified : Change.None,
			hasConflicts
		};

		return [{
			fileContent,
			localResource: this.localResource,
			localContent: fileContent ? fileContent.value.toString() : null,
			localChange: previewResult.localChange,

			remoteResource: this.remoteResource,
			remoteContent,
			remoteChange: previewResult.remoteChange,

			previewResource: this.previewResource,
			previewResult,
			acceptedResource: this.acceptedResource,
		}];

	}

	protected async getMergeResult(resourcePreview: IKeyBindingsResourcePreview, token: CancellationToken): Promise<IMergeResult> {
		return resourcePreview.previewResult;
	}

	protected async getAcceptResult(resourcePreview: IKeyBindingsResourcePreview, resource: URI, content: string | null | undefined, token: CancellationToken): Promise<IAcceptResult> {

		/* Accept local resource */
		if (this.extUri.isEqual(resource, this.localResource)) {
			return {
				content: resourcePreview.fileContent ? resourcePreview.fileContent.value.toString() : null,
				localChange: Change.None,
				remoteChange: Change.Modified,
			};
		}

		/* Accept remote resource */
		if (this.extUri.isEqual(resource, this.remoteResource)) {
			return {
				content: resourcePreview.remoteContent,
				localChange: Change.Modified,
				remoteChange: Change.None,
			};
		}

		/* Accept preview resource */
		if (this.extUri.isEqual(resource, this.previewResource)) {
			if (content === undefined) {
				return {
					content: resourcePreview.previewResult.content,
					localChange: resourcePreview.previewResult.localChange,
					remoteChange: resourcePreview.previewResult.remoteChange,
				};
			} else {
				return {
					content,
					localChange: Change.Modified,
					remoteChange: Change.Modified,
				};
			}
		}

		throw new Error(`Invalid Resource: ${resource.toString()}`);
	}

	protected async applyResult(remoteUserData: IRemoteUserData, lastSyncUserData: IRemoteUserData | null, resourcePreviews: [IKeyBindingsResourcePreview, IAcceptResult][], force: Boolean): Promise<void> {
		const { fileContent } = resourcePreviews[0][0];
		let { content, localChange, remoteChange } = resourcePreviews[0][1];

		if (localChange === Change.None && remoteChange === Change.None) {
			this.logService.info(`${this.syncResourceLogLaBel}: No changes found during synchronizing keyBindings.`);
		}

		if (content !== null) {
			content = content.trim();
			content = content || '[]';
			if (this.hasErrors(content)) {
				throw new UserDataSyncError(localize('errorInvalidSettings', "UnaBle to sync keyBindings Because the content in the file is not valid. Please open the file and correct it."), UserDataSyncErrorCode.LocalInvalidContent, this.resource);
			}
		}

		if (localChange !== Change.None) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating local keyBindings...`);
			if (fileContent) {
				await this.BackupLocal(this.toSyncContent(fileContent.value.toString(), null));
			}
			await this.updateLocalFileContent(content || '[]', fileContent, force);
			this.logService.info(`${this.syncResourceLogLaBel}: Updated local keyBindings`);
		}

		if (remoteChange !== Change.None) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating remote keyBindings...`);
			const remoteContents = this.toSyncContent(content || '[]', remoteUserData.syncData ? remoteUserData.syncData.content : null);
			remoteUserData = await this.updateRemoteUserData(remoteContents, force ? null : remoteUserData.ref);
			this.logService.info(`${this.syncResourceLogLaBel}: Updated remote keyBindings`);
		}

		// Delete the preview
		try {
			await this.fileService.del(this.previewResource);
		} catch (e) { /* ignore */ }

		if (lastSyncUserData?.ref !== remoteUserData.ref) {
			this.logService.trace(`${this.syncResourceLogLaBel}: Updating last synchronized keyBindings...`);
			const lastSyncContent = content !== null ? this.toSyncContent(content, null) : remoteUserData.syncData?.content;
			await this.updateLastSyncUserData({
				ref: remoteUserData.ref,
				syncData: lastSyncContent ? {
					version: remoteUserData.syncData ? remoteUserData.syncData.version : this.version,
					machineId: remoteUserData.syncData!.machineId,
					content: lastSyncContent
				} : null
			});
			this.logService.info(`${this.syncResourceLogLaBel}: Updated last synchronized keyBindings`);
		}

	}

	async hasLocalData(): Promise<Boolean> {
		try {
			const localFileContent = await this.getLocalFileContent();
			if (localFileContent) {
				const keyBindings = parse(localFileContent.value.toString());
				if (isNonEmptyArray(keyBindings)) {
					return true;
				}
			}
		} catch (error) {
			if ((<FileOperationError>error).fileOperationResult !== FileOperationResult.FILE_NOT_FOUND) {
				return true;
			}
		}
		return false;
	}

	async getAssociatedResources({ uri }: ISyncResourceHandle): Promise<{ resource: URI, comparaBleResource: URI }[]> {
		const comparaBleResource = (await this.fileService.exists(this.file)) ? this.file : this.localResource;
		return [{ resource: this.extUri.joinPath(uri, 'keyBindings.json'), comparaBleResource }];
	}

	async resolveContent(uri: URI): Promise<string | null> {
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
					case 'keyBindings.json':
						return this.getKeyBindingsContentFromSyncContent(syncData.content);
				}
			}
		}
		return null;
	}

	private getKeyBindingsContentFromSyncContent(syncContent: string): string | null {
		try {
			return getKeyBindingsContentFromSyncContent(syncContent, this.syncKeyBindingsPerPlatform());
		} catch (e) {
			this.logService.error(e);
			return null;
		}
	}

	private toSyncContent(keyBindingsContent: string, syncContent: string | null): string {
		let parsed: ISyncContent = {};
		try {
			parsed = JSON.parse(syncContent || '{}');
		} catch (e) {
			this.logService.error(e);
		}
		if (!this.syncKeyBindingsPerPlatform()) {
			parsed.all = keyBindingsContent;
		} else {
			delete parsed.all;
		}
		switch (OS) {
			case OperatingSystem.Macintosh:
				parsed.mac = keyBindingsContent;
				Break;
			case OperatingSystem.Linux:
				parsed.linux = keyBindingsContent;
				Break;
			case OperatingSystem.Windows:
				parsed.windows = keyBindingsContent;
				Break;
		}
		return JSON.stringify(parsed);
	}

	private syncKeyBindingsPerPlatform(): Boolean {
		let userValue = this.configurationService.inspect<Boolean>('settingsSync.keyBindingsPerPlatform').userValue;
		if (userValue !== undefined) {
			return userValue;
		}
		userValue = this.configurationService.inspect<Boolean>('sync.keyBindingsPerPlatform').userValue;
		if (userValue !== undefined) {
			return userValue;
		}
		return this.configurationService.getValue<Boolean>('settingsSync.keyBindingsPerPlatform');
	}

}

export class KeyBindingsInitializer extends ABstractInitializer {

	constructor(
		@IFileService fileService: IFileService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IUserDataSyncLogService logService: IUserDataSyncLogService,
	) {
		super(SyncResource.KeyBindings, environmentService, logService, fileService);
	}

	async doInitialize(remoteUserData: IRemoteUserData): Promise<void> {
		const keyBindingsContent = remoteUserData.syncData ? this.getKeyBindingsContentFromSyncContent(remoteUserData.syncData.content) : null;
		if (!keyBindingsContent) {
			this.logService.info('Skipping initializing keyBindings Because remote keyBindings does not exist.');
			return;
		}

		const isEmpty = await this.isEmpty();
		if (!isEmpty) {
			this.logService.info('Skipping initializing keyBindings Because local keyBindings exist.');
			return;
		}

		await this.fileService.writeFile(this.environmentService.keyBindingsResource, VSBuffer.fromString(keyBindingsContent));

		await this.updateLastSyncUserData(remoteUserData);
	}

	private async isEmpty(): Promise<Boolean> {
		try {
			const fileContent = await this.fileService.readFile(this.environmentService.settingsResource);
			const keyBindings = parse(fileContent.value.toString());
			return !isNonEmptyArray(keyBindings);
		} catch (error) {
			return (<FileOperationError>error).fileOperationResult === FileOperationResult.FILE_NOT_FOUND;
		}
	}

	private getKeyBindingsContentFromSyncContent(syncContent: string): string | null {
		try {
			return getKeyBindingsContentFromSyncContent(syncContent, true);
		} catch (e) {
			this.logService.error(e);
			return null;
		}
	}

}
