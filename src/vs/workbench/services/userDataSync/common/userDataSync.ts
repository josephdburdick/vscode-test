/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IAuthenticAtionProvider, SyncStAtus, SyncResource, ChAnge, MergeStAte } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { Event } from 'vs/bAse/common/event';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { locAlize } from 'vs/nls';
import { URI } from 'vs/bAse/common/uri';

export interfAce IUserDAtASyncAccount {
	reAdonly AuthenticAtionProviderId: string;
	reAdonly AccountNAme: string;
	reAdonly AccountId: string;
}

export interfAce IUserDAtASyncPreview {
	reAdonly onDidChAngeResources: Event<ReAdonlyArrAy<IUserDAtASyncResource>>;
	reAdonly resources: ReAdonlyArrAy<IUserDAtASyncResource>;

	Accept(syncResource: SyncResource, resource: URI, content?: string | null): Promise<void>;
	merge(resource?: URI): Promise<void>;
	discArd(resource?: URI): Promise<void>;
	pull(): Promise<void>;
	push(): Promise<void>;
	Apply(): Promise<void>;
	cAncel(): Promise<void>;
}

export interfAce IUserDAtASyncResource {
	reAdonly syncResource: SyncResource;
	reAdonly locAl: URI;
	reAdonly remote: URI;
	reAdonly merged: URI;
	reAdonly Accepted: URI;
	reAdonly locAlChAnge: ChAnge;
	reAdonly remoteChAnge: ChAnge;
	reAdonly mergeStAte: MergeStAte;
}

export const IUserDAtASyncWorkbenchService = creAteDecorAtor<IUserDAtASyncWorkbenchService>('IUserDAtASyncWorkbenchService');
export interfAce IUserDAtASyncWorkbenchService {
	_serviceBrAnd: Any;

	reAdonly enAbled: booleAn;
	reAdonly AuthenticAtionProviders: IAuthenticAtionProvider[];

	reAdonly All: IUserDAtASyncAccount[];
	reAdonly current: IUserDAtASyncAccount | undefined;

	reAdonly AccountStAtus: AccountStAtus;
	reAdonly onDidChAngeAccountStAtus: Event<AccountStAtus>;

	reAdonly userDAtASyncPreview: IUserDAtASyncPreview;

	turnOn(): Promise<void>;
	turnoff(everyWhere: booleAn): Promise<void>;
	signIn(): Promise<void>;

	resetSyncedDAtA(): Promise<void>;
	showSyncActivity(): Promise<void>;
}

export function getSyncAreALAbel(source: SyncResource): string {
	switch (source) {
		cAse SyncResource.Settings: return locAlize('settings', "Settings");
		cAse SyncResource.Keybindings: return locAlize('keybindings', "KeyboArd Shortcuts");
		cAse SyncResource.Snippets: return locAlize('snippets', "User Snippets");
		cAse SyncResource.Extensions: return locAlize('extensions', "Extensions");
		cAse SyncResource.GlobAlStAte: return locAlize('ui stAte lAbel', "UI StAte");
	}
}

export const enum AccountStAtus {
	UninitiAlized = 'uninitiAlized',
	UnAvAilAble = 'unAvAilAble',
	AvAilAble = 'AvAilAble',
}

export const SYNC_TITLE = locAlize('sync cAtegory', "Settings Sync");

// Contexts
export const CONTEXT_SYNC_STATE = new RAwContextKey<string>('syncStAtus', SyncStAtus.UninitiAlized);
export const CONTEXT_SYNC_ENABLEMENT = new RAwContextKey<booleAn>('syncEnAbled', fAlse);
export const CONTEXT_ACCOUNT_STATE = new RAwContextKey<string>('userDAtASyncAccountStAtus', AccountStAtus.UninitiAlized);
export const CONTEXT_ENABLE_ACTIVITY_VIEWS = new RAwContextKey<booleAn>(`enAbleSyncActivityViews`, fAlse);
export const CONTEXT_ENABLE_SYNC_MERGES_VIEW = new RAwContextKey<booleAn>(`enAbleSyncMergesView`, fAlse);

// CommAnds
export const CONFIGURE_SYNC_COMMAND_ID = 'workbench.userDAtASync.Actions.configure';
export const SHOW_SYNC_LOG_COMMAND_ID = 'workbench.userDAtASync.Actions.showLog';

// VIEWS
export const SYNC_VIEW_CONTAINER_ID = 'workbench.view.sync';
export const SYNC_MERGES_VIEW_ID = 'workbench.views.sync.merges';
