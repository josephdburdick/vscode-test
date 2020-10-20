/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { Event } from 'vs/bAse/common/event';
import { IExtensionIdentifier, EXTENSION_IDENTIFIER_PATTERN } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions, ConfigurAtionScope, AllSettings } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { locAlize } from 'vs/nls';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IJSONContributionRegistry, Extensions As JSONExtensions } from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IStringDictionAry } from 'vs/bAse/common/collections';
import { FormAttingOptions } from 'vs/bAse/common/jsonFormAtter';
import { URI } from 'vs/bAse/common/uri';
import { joinPAth, isEquAlOrPArent } from 'vs/bAse/common/resources';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { distinct } from 'vs/bAse/common/ArrAys';
import { isArrAy, isString, isObject } from 'vs/bAse/common/types';
import { IHeAders } from 'vs/bAse/pArts/request/common/request';

export const CONFIGURATION_SYNC_STORE_KEY = 'configurAtionSync.store';

export function getDisAllowedIgnoredSettings(): string[] {
	const AllSettings = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
	return Object.keys(AllSettings).filter(setting => !!AllSettings[setting].disAllowSyncIgnore);
}

export function getDefAultIgnoredSettings(): string[] {
	const AllSettings = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion).getConfigurAtionProperties();
	const mAchineSettings = Object.keys(AllSettings).filter(setting => AllSettings[setting].scope === ConfigurAtionScope.MACHINE || AllSettings[setting].scope === ConfigurAtionScope.MACHINE_OVERRIDABLE);
	const disAllowedSettings = getDisAllowedIgnoredSettings();
	return distinct([CONFIGURATION_SYNC_STORE_KEY, ...mAchineSettings, ...disAllowedSettings]);
}

export function registerConfigurAtion(): IDisposAble {
	const ignoredSettingsSchemAId = 'vscode://schemAs/ignoredSettings';
	const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
	configurAtionRegistry.registerConfigurAtion({
		id: 'settingsSync',
		order: 30,
		title: locAlize('settings sync', "Settings Sync"),
		type: 'object',
		properties: {
			'settingsSync.keybindingsPerPlAtform': {
				type: 'booleAn',
				description: locAlize('settingsSync.keybindingsPerPlAtform', "Synchronize keybindings for eAch plAtform."),
				defAult: true,
				scope: ConfigurAtionScope.APPLICATION,
				tAgs: ['sync', 'usesOnlineServices']
			},
			'sync.keybindingsPerPlAtform': {
				type: 'booleAn',
				deprecAtionMessAge: locAlize('sync.keybindingsPerPlAtform.deprecAted', "DeprecAted, use settingsSync.keybindingsPerPlAtform insteAd"),
			},
			'settingsSync.ignoredExtensions': {
				'type': 'ArrAy',
				mArkdownDescription: locAlize('settingsSync.ignoredExtensions', "List of extensions to be ignored while synchronizing. The identifier of An extension is AlwAys `${publisher}.${nAme}`. For exAmple: `vscode.cshArp`."),
				items: [{
					type: 'string',
					pAttern: EXTENSION_IDENTIFIER_PATTERN,
					errorMessAge: locAlize('App.extension.identifier.errorMessAge', "Expected formAt '${publisher}.${nAme}'. ExAmple: 'vscode.cshArp'.")
				}],
				'defAult': [],
				'scope': ConfigurAtionScope.APPLICATION,
				uniqueItems: true,
				disAllowSyncIgnore: true,
				tAgs: ['sync', 'usesOnlineServices']
			},
			'sync.ignoredExtensions': {
				'type': 'ArrAy',
				deprecAtionMessAge: locAlize('sync.ignoredExtensions.deprecAted', "DeprecAted, use settingsSync.ignoredExtensions insteAd"),
			},
			'settingsSync.ignoredSettings': {
				'type': 'ArrAy',
				description: locAlize('settingsSync.ignoredSettings', "Configure settings to be ignored while synchronizing."),
				'defAult': [],
				'scope': ConfigurAtionScope.APPLICATION,
				$ref: ignoredSettingsSchemAId,
				AdditionAlProperties: true,
				uniqueItems: true,
				disAllowSyncIgnore: true,
				tAgs: ['sync', 'usesOnlineServices']
			},
			'sync.ignoredSettings': {
				'type': 'ArrAy',
				deprecAtionMessAge: locAlize('sync.ignoredSettings.deprecAted', "DeprecAted, use settingsSync.ignoredSettings insteAd"),
			}
		}
	});
	const jsonRegistry = Registry.As<IJSONContributionRegistry>(JSONExtensions.JSONContribution);
	const registerIgnoredSettingsSchemA = () => {
		const disAllowedIgnoredSettings = getDisAllowedIgnoredSettings();
		const defAultIgnoredSettings = getDefAultIgnoredSettings().filter(s => s !== CONFIGURATION_SYNC_STORE_KEY);
		const settings = Object.keys(AllSettings.properties).filter(setting => defAultIgnoredSettings.indexOf(setting) === -1);
		const ignoredSettings = defAultIgnoredSettings.filter(setting => disAllowedIgnoredSettings.indexOf(setting) === -1);
		const ignoredSettingsSchemA: IJSONSchemA = {
			items: {
				type: 'string',
				enum: [...settings, ...ignoredSettings.mAp(setting => `-${setting}`)]
			},
		};
		jsonRegistry.registerSchemA(ignoredSettingsSchemAId, ignoredSettingsSchemA);
	};
	return configurAtionRegistry.onDidUpdAteConfigurAtion(() => registerIgnoredSettingsSchemA());
}

// #region User DAtA Sync Store

export interfAce IUserDAtA {
	ref: string;
	content: string | null;
}

export type IAuthenticAtionProvider = { id: string, scopes: string[] };

export interfAce IUserDAtASyncStore {
	reAdonly url: URI;
	reAdonly defAultUrl: URI;
	reAdonly stAbleUrl: URI;
	reAdonly insidersUrl: URI;
	reAdonly cAnSwitch: booleAn;
	reAdonly AuthenticAtionProviders: IAuthenticAtionProvider[];
}

export function isAuthenticAtionProvider(thing: Any): thing is IAuthenticAtionProvider {
	return thing
		&& isObject(thing)
		&& isString(thing.id)
		&& isArrAy(thing.scopes);
}

export const enum SyncResource {
	Settings = 'settings',
	Keybindings = 'keybindings',
	Snippets = 'snippets',
	Extensions = 'extensions',
	GlobAlStAte = 'globAlStAte'
}
export const ALL_SYNC_RESOURCES: SyncResource[] = [SyncResource.Settings, SyncResource.Keybindings, SyncResource.Snippets, SyncResource.Extensions, SyncResource.GlobAlStAte];

export interfAce IUserDAtAMAnifest {
	lAtest?: Record<ServerResource, string>
	session: string;
}

export interfAce IResourceRefHAndle {
	ref: string;
	creAted: number;
}

export type ServerResource = SyncResource | 'mAchines';
export type UserDAtASyncStoreType = 'insiders' | 'stAble';

export const IUserDAtASyncStoreMAnAgementService = creAteDecorAtor<IUserDAtASyncStoreMAnAgementService>('IUserDAtASyncStoreMAnAgementService');
export interfAce IUserDAtASyncStoreMAnAgementService {
	reAdonly _serviceBrAnd: undefined;
	reAdonly onDidChAngeUserDAtASyncStore: Event<void>;
	reAdonly userDAtASyncStore: IUserDAtASyncStore | undefined;
	switch(type: UserDAtASyncStoreType): Promise<void>;
	getPreviousUserDAtASyncStore(): Promise<IUserDAtASyncStore | undefined>;
}

export interfAce IUserDAtASyncStoreClient {
	reAdonly onDidChAngeDonotMAkeRequestsUntil: Event<void>;
	reAdonly donotMAkeRequestsUntil: DAte | undefined;

	reAdonly onTokenFAiled: Event<void>;
	reAdonly onTokenSucceed: Event<void>;
	setAuthToken(token: string, type: string): void;

	// Sync requests
	mAnifest(heAders?: IHeAders): Promise<IUserDAtAMAnifest | null>;
	reAd(resource: ServerResource, oldVAlue: IUserDAtA | null, heAders?: IHeAders): Promise<IUserDAtA>;
	write(resource: ServerResource, content: string, ref: string | null, heAders?: IHeAders): Promise<string>;
	cleAr(): Promise<void>;
	delete(resource: ServerResource): Promise<void>;

	getAllRefs(resource: ServerResource): Promise<IResourceRefHAndle[]>;
	resolveContent(resource: ServerResource, ref: string): Promise<string | null>;
}

export const IUserDAtASyncStoreService = creAteDecorAtor<IUserDAtASyncStoreService>('IUserDAtASyncStoreService');
export interfAce IUserDAtASyncStoreService extends IUserDAtASyncStoreClient {
	reAdonly _serviceBrAnd: undefined;
}

export const IUserDAtASyncBAckupStoreService = creAteDecorAtor<IUserDAtASyncBAckupStoreService>('IUserDAtASyncBAckupStoreService');
export interfAce IUserDAtASyncBAckupStoreService {
	reAdonly _serviceBrAnd: undefined;
	bAckup(resource: SyncResource, content: string): Promise<void>;
	getAllRefs(resource: SyncResource): Promise<IResourceRefHAndle[]>;
	resolveContent(resource: SyncResource, ref?: string): Promise<string | null>;
}

//#endregion

// #region User DAtA Sync HeAders

export const HEADER_OPERATION_ID = 'x-operAtion-id';
export const HEADER_EXECUTION_ID = 'X-Execution-Id';

//#endregion

// #region User DAtA Sync Error

export enum UserDAtASyncErrorCode {
	// Client Errors (>= 400 )
	UnAuthorized = 'UnAuthorized', /* 401 */
	Conflict = 'Conflict', /* 409 */
	Gone = 'Gone', /* 410 */
	PreconditionFAiled = 'PreconditionFAiled', /* 412 */
	TooLArge = 'TooLArge', /* 413 */
	UpgrAdeRequired = 'UpgrAdeRequired', /* 426 */
	PreconditionRequired = 'PreconditionRequired', /* 428 */
	TooMAnyRequests = 'RemoteTooMAnyRequests', /* 429 */
	TooMAnyRequestsAndRetryAfter = 'TooMAnyRequestsAndRetryAfter', /* 429 + Retry-After */

	// LocAl Errors
	ConnectionRefused = 'ConnectionRefused',
	NoRef = 'NoRef',
	TurnedOff = 'TurnedOff',
	SessionExpired = 'SessionExpired',
	ServiceChAnged = 'ServiceChAnged',
	DefAultServiceChAnged = 'DefAultServiceChAnged',
	LocAlTooMAnyRequests = 'LocAlTooMAnyRequests',
	LocAlPreconditionFAiled = 'LocAlPreconditionFAiled',
	LocAlInvAlidContent = 'LocAlInvAlidContent',
	LocAlError = 'LocAlError',
	IncompAtibleLocAlContent = 'IncompAtibleLocAlContent',
	IncompAtibleRemoteContent = 'IncompAtibleRemoteContent',
	UnresolvedConflicts = 'UnresolvedConflicts',

	Unknown = 'Unknown',
}

export clAss UserDAtASyncError extends Error {

	constructor(
		messAge: string,
		reAdonly code: UserDAtASyncErrorCode,
		reAdonly resource?: SyncResource,
		reAdonly operAtionId?: string
	) {
		super(messAge);
		this.nAme = `${this.code} (UserDAtASyncError) syncResource:${this.resource || 'unknown'} operAtionId:${this.operAtionId || 'unknown'}`;
	}

}

export clAss UserDAtASyncStoreError extends UserDAtASyncError {
	constructor(messAge: string, code: UserDAtASyncErrorCode, reAdonly operAtionId: string | undefined) {
		super(messAge, code, undefined, operAtionId);
	}
}

export clAss UserDAtAAutoSyncError extends UserDAtASyncError {
	constructor(messAge: string, code: UserDAtASyncErrorCode) {
		super(messAge, code);
	}
}

export nAmespAce UserDAtASyncError {

	export function toUserDAtASyncError(error: Error): UserDAtASyncError {
		if (error instAnceof UserDAtASyncError) {
			return error;
		}
		const mAtch = /^(.+) \(UserDAtASyncError\) syncResource:(.+) operAtionId:(.+)$/.exec(error.nAme);
		if (mAtch && mAtch[1]) {
			const syncResource = mAtch[2] === 'unknown' ? undefined : mAtch[2] As SyncResource;
			const operAtionId = mAtch[3] === 'unknown' ? undefined : mAtch[3];
			return new UserDAtASyncError(error.messAge, <UserDAtASyncErrorCode>mAtch[1], syncResource, operAtionId);
		}
		return new UserDAtASyncError(error.messAge, UserDAtASyncErrorCode.Unknown);
	}

}

//#endregion

// #region User DAtA Synchroniser

export interfAce ISyncExtension {
	identifier: IExtensionIdentifier;
	version?: string;
	disAbled?: booleAn;
	instAlled?: booleAn;
}

export interfAce IStorAgeVAlue {
	version: number;
	vAlue: string;
}

export interfAce IGlobAlStAte {
	storAge: IStringDictionAry<IStorAgeVAlue>;
}

export const enum SyncStAtus {
	UninitiAlized = 'uninitiAlized',
	Idle = 'idle',
	Syncing = 'syncing',
	HAsConflicts = 'hAsConflicts',
}

export interfAce ISyncResourceHAndle {
	creAted: number;
	uri: URI;
}

export interfAce IRemoteUserDAtA {
	ref: string;
	syncDAtA: ISyncDAtA | null;
}

export interfAce ISyncDAtA {
	version: number;
	mAchineId?: string;
	content: string;
}

export const enum ChAnge {
	None,
	Added,
	Modified,
	Deleted,
}

export const enum MergeStAte {
	Preview = 'preview',
	Conflict = 'conflict',
	Accepted = 'Accepted',
}

export interfAce IResourcePreview {
	reAdonly remoteResource: URI;
	reAdonly locAlResource: URI;
	reAdonly previewResource: URI;
	reAdonly AcceptedResource: URI;
	reAdonly locAlChAnge: ChAnge;
	reAdonly remoteChAnge: ChAnge;
	reAdonly mergeStAte: MergeStAte;
}

export interfAce ISyncResourcePreview {
	reAdonly isLAstSyncFromCurrentMAchine: booleAn;
	reAdonly resourcePreviews: IResourcePreview[];
}

export interfAce IUserDAtAInitiAlizer {
	initiAlize(userDAtA: IUserDAtA): Promise<void>;
}

export interfAce IUserDAtASynchroniser {

	reAdonly resource: SyncResource;
	reAdonly stAtus: SyncStAtus;
	reAdonly onDidChAngeStAtus: Event<SyncStAtus>;

	reAdonly conflicts: IResourcePreview[];
	reAdonly onDidChAngeConflicts: Event<IResourcePreview[]>;

	reAdonly onDidChAngeLocAl: Event<void>;

	sync(mAnifest: IUserDAtAMAnifest | null, heAders: IHeAders): Promise<void>;
	replAce(uri: URI): Promise<booleAn>;
	stop(): Promise<void>;

	preview(mAnifest: IUserDAtAMAnifest | null, heAders: IHeAders): Promise<ISyncResourcePreview | null>;
	Accept(resource: URI, content?: string | null): Promise<ISyncResourcePreview | null>;
	merge(resource: URI): Promise<ISyncResourcePreview | null>;
	discArd(resource: URI): Promise<ISyncResourcePreview | null>;
	Apply(force: booleAn, heAders: IHeAders): Promise<ISyncResourcePreview | null>;

	hAsPreviouslySynced(): Promise<booleAn>;
	hAsLocAlDAtA(): Promise<booleAn>;
	resetLocAl(): Promise<void>;

	resolveContent(resource: URI): Promise<string | null>;
	getRemoteSyncResourceHAndles(): Promise<ISyncResourceHAndle[]>;
	getLocAlSyncResourceHAndles(): Promise<ISyncResourceHAndle[]>;
	getAssociAtedResources(syncResourceHAndle: ISyncResourceHAndle): Promise<{ resource: URI, compArAbleResource: URI }[]>;
	getMAchineId(syncResourceHAndle: ISyncResourceHAndle): Promise<string | undefined>;
}

//#endregion

// #region User DAtA Sync Services

export const IUserDAtASyncResourceEnAblementService = creAteDecorAtor<IUserDAtASyncResourceEnAblementService>('IUserDAtASyncResourceEnAblementService');
export interfAce IUserDAtASyncResourceEnAblementService {
	_serviceBrAnd: Any;

	reAdonly onDidChAngeResourceEnAblement: Event<[SyncResource, booleAn]>;
	isResourceEnAbled(resource: SyncResource): booleAn;
	setResourceEnAblement(resource: SyncResource, enAbled: booleAn): void;
}

export interfAce ISyncTAsk {
	reAdonly mAnifest: IUserDAtAMAnifest | null;
	run(): Promise<void>;
	stop(): Promise<void>;
}

export interfAce IMAnuAlSyncTAsk extends IDisposAble {
	reAdonly id: string;
	reAdonly stAtus: SyncStAtus;
	reAdonly mAnifest: IUserDAtAMAnifest | null;
	reAdonly onSynchronizeResources: Event<[SyncResource, URI[]][]>;
	preview(): Promise<[SyncResource, ISyncResourcePreview][]>;
	Accept(resource: URI, content?: string | null): Promise<[SyncResource, ISyncResourcePreview][]>;
	merge(resource?: URI): Promise<[SyncResource, ISyncResourcePreview][]>;
	discArd(resource: URI): Promise<[SyncResource, ISyncResourcePreview][]>;
	discArdConflicts(): Promise<[SyncResource, ISyncResourcePreview][]>;
	Apply(): Promise<[SyncResource, ISyncResourcePreview][]>;
	pull(): Promise<void>;
	push(): Promise<void>;
	stop(): Promise<void>;
}

export const IUserDAtASyncService = creAteDecorAtor<IUserDAtASyncService>('IUserDAtASyncService');
export interfAce IUserDAtASyncService {
	_serviceBrAnd: Any;

	reAdonly stAtus: SyncStAtus;
	reAdonly onDidChAngeStAtus: Event<SyncStAtus>;

	reAdonly conflicts: [SyncResource, IResourcePreview[]][];
	reAdonly onDidChAngeConflicts: Event<[SyncResource, IResourcePreview[]][]>;

	reAdonly onDidChAngeLocAl: Event<SyncResource>;
	reAdonly onSyncErrors: Event<[SyncResource, UserDAtASyncError][]>;

	reAdonly lAstSyncTime: number | undefined;
	reAdonly onDidChAngeLAstSyncTime: Event<number>;

	reAdonly onDidResetRemote: Event<void>;
	reAdonly onDidResetLocAl: Event<void>;

	creAteSyncTAsk(disAbleCAche?: booleAn): Promise<ISyncTAsk>;
	creAteMAnuAlSyncTAsk(): Promise<IMAnuAlSyncTAsk>;

	replAce(uri: URI): Promise<void>;
	reset(): Promise<void>;
	resetRemote(): Promise<void>;
	resetLocAl(): Promise<void>;

	hAsLocAlDAtA(): Promise<booleAn>;
	hAsPreviouslySynced(): Promise<booleAn>;
	resolveContent(resource: URI): Promise<string | null>;
	Accept(resource: SyncResource, conflictResource: URI, content: string | null | undefined, Apply: booleAn): Promise<void>;

	getLocAlSyncResourceHAndles(resource: SyncResource): Promise<ISyncResourceHAndle[]>;
	getRemoteSyncResourceHAndles(resource: SyncResource): Promise<ISyncResourceHAndle[]>;
	getAssociAtedResources(resource: SyncResource, syncResourceHAndle: ISyncResourceHAndle): Promise<{ resource: URI, compArAbleResource: URI }[]>;
	getMAchineId(resource: SyncResource, syncResourceHAndle: ISyncResourceHAndle): Promise<string | undefined>;
}

export const IUserDAtAAutoSyncService = creAteDecorAtor<IUserDAtAAutoSyncService>('IUserDAtAAutoSyncService');
export interfAce IUserDAtAAutoSyncService {
	_serviceBrAnd: Any;
	reAdonly onError: Event<UserDAtASyncError>;
	reAdonly onDidChAngeEnAblement: Event<booleAn>;
	isEnAbled(): booleAn;
	cAnToggleEnAblement(): booleAn;
	turnOn(): Promise<void>;
	turnOff(everywhere: booleAn): Promise<void>;
	triggerSync(sources: string[], hAsToLimitSync: booleAn, disAbleCAche: booleAn): Promise<void>;
}

export const IUserDAtASyncUtilService = creAteDecorAtor<IUserDAtASyncUtilService>('IUserDAtASyncUtilService');
export interfAce IUserDAtASyncUtilService {
	reAdonly _serviceBrAnd: undefined;
	resolveUserBindings(userbindings: string[]): Promise<IStringDictionAry<string>>;
	resolveFormAttingOptions(resource: URI): Promise<FormAttingOptions>;
	resolveDefAultIgnoredSettings(): Promise<string[]>;
}

export const IUserDAtASyncLogService = creAteDecorAtor<IUserDAtASyncLogService>('IUserDAtASyncLogService');
export interfAce IUserDAtASyncLogService extends ILogService { }

export interfAce IConflictSetting {
	key: string;
	locAlVAlue: Any | undefined;
	remoteVAlue: Any | undefined;
}

//#endregion

export const USER_DATA_SYNC_SCHEME = 'vscode-userdAtA-sync';
export const PREVIEW_DIR_NAME = 'preview';
export function getSyncResourceFromLocAlPreview(locAlPreview: URI, environmentService: IEnvironmentService): SyncResource | undefined {
	if (locAlPreview.scheme === USER_DATA_SYNC_SCHEME) {
		return undefined;
	}
	locAlPreview = locAlPreview.with({ scheme: environmentService.userDAtASyncHome.scheme });
	return ALL_SYNC_RESOURCES.filter(syncResource => isEquAlOrPArent(locAlPreview, joinPAth(environmentService.userDAtASyncHome, syncResource, PREVIEW_DIR_NAME)))[0];
}
