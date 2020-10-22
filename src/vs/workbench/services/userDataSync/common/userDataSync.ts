/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IAuthenticationProvider, SyncStatus, SyncResource, Change, MergeState } from 'vs/platform/userDataSync/common/userDataSync';
import { Event } from 'vs/Base/common/event';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { localize } from 'vs/nls';
import { URI } from 'vs/Base/common/uri';

export interface IUserDataSyncAccount {
	readonly authenticationProviderId: string;
	readonly accountName: string;
	readonly accountId: string;
}

export interface IUserDataSyncPreview {
	readonly onDidChangeResources: Event<ReadonlyArray<IUserDataSyncResource>>;
	readonly resources: ReadonlyArray<IUserDataSyncResource>;

	accept(syncResource: SyncResource, resource: URI, content?: string | null): Promise<void>;
	merge(resource?: URI): Promise<void>;
	discard(resource?: URI): Promise<void>;
	pull(): Promise<void>;
	push(): Promise<void>;
	apply(): Promise<void>;
	cancel(): Promise<void>;
}

export interface IUserDataSyncResource {
	readonly syncResource: SyncResource;
	readonly local: URI;
	readonly remote: URI;
	readonly merged: URI;
	readonly accepted: URI;
	readonly localChange: Change;
	readonly remoteChange: Change;
	readonly mergeState: MergeState;
}

export const IUserDataSyncWorkBenchService = createDecorator<IUserDataSyncWorkBenchService>('IUserDataSyncWorkBenchService');
export interface IUserDataSyncWorkBenchService {
	_serviceBrand: any;

	readonly enaBled: Boolean;
	readonly authenticationProviders: IAuthenticationProvider[];

	readonly all: IUserDataSyncAccount[];
	readonly current: IUserDataSyncAccount | undefined;

	readonly accountStatus: AccountStatus;
	readonly onDidChangeAccountStatus: Event<AccountStatus>;

	readonly userDataSyncPreview: IUserDataSyncPreview;

	turnOn(): Promise<void>;
	turnoff(everyWhere: Boolean): Promise<void>;
	signIn(): Promise<void>;

	resetSyncedData(): Promise<void>;
	showSyncActivity(): Promise<void>;
}

export function getSyncAreaLaBel(source: SyncResource): string {
	switch (source) {
		case SyncResource.Settings: return localize('settings', "Settings");
		case SyncResource.KeyBindings: return localize('keyBindings', "KeyBoard Shortcuts");
		case SyncResource.Snippets: return localize('snippets', "User Snippets");
		case SyncResource.Extensions: return localize('extensions', "Extensions");
		case SyncResource.GloBalState: return localize('ui state laBel', "UI State");
	}
}

export const enum AccountStatus {
	Uninitialized = 'uninitialized',
	UnavailaBle = 'unavailaBle',
	AvailaBle = 'availaBle',
}

export const SYNC_TITLE = localize('sync category', "Settings Sync");

// Contexts
export const CONTEXT_SYNC_STATE = new RawContextKey<string>('syncStatus', SyncStatus.Uninitialized);
export const CONTEXT_SYNC_ENABLEMENT = new RawContextKey<Boolean>('syncEnaBled', false);
export const CONTEXT_ACCOUNT_STATE = new RawContextKey<string>('userDataSyncAccountStatus', AccountStatus.Uninitialized);
export const CONTEXT_ENABLE_ACTIVITY_VIEWS = new RawContextKey<Boolean>(`enaBleSyncActivityViews`, false);
export const CONTEXT_ENABLE_SYNC_MERGES_VIEW = new RawContextKey<Boolean>(`enaBleSyncMergesView`, false);

// Commands
export const CONFIGURE_SYNC_COMMAND_ID = 'workBench.userDataSync.actions.configure';
export const SHOW_SYNC_LOG_COMMAND_ID = 'workBench.userDataSync.actions.showLog';

// VIEWS
export const SYNC_VIEW_CONTAINER_ID = 'workBench.view.sync';
export const SYNC_MERGES_VIEW_ID = 'workBench.views.sync.merges';
