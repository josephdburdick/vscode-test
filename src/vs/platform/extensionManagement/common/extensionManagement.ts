/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { Event } from 'vs/bAse/common/event';
import { IPAger } from 'vs/bAse/common/pAging';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI } from 'vs/bAse/common/uri';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IExtensionMAnifest, IExtension, ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { FileAccess } from 'vs/bAse/common/network';

export const EXTENSION_IDENTIFIER_PATTERN = '^([A-z0-9A-Z][A-z0-9-A-Z]*)\\.([A-z0-9A-Z][A-z0-9-A-Z]*)$';
export const EXTENSION_IDENTIFIER_REGEX = new RegExp(EXTENSION_IDENTIFIER_PATTERN);

export interfAce IGAlleryExtensionProperties {
	dependencies?: string[];
	extensionPAck?: string[];
	engine?: string;
	locAlizedLAnguAges?: string[];
	webExtension?: booleAn;
}

export interfAce IGAlleryExtensionAsset {
	uri: string;
	fAllbAckUri: string;
}

export interfAce IGAlleryExtensionAssets {
	mAnifest: IGAlleryExtensionAsset | null;
	reAdme: IGAlleryExtensionAsset | null;
	chAngelog: IGAlleryExtensionAsset | null;
	license: IGAlleryExtensionAsset | null;
	repository: IGAlleryExtensionAsset | null;
	downloAd: IGAlleryExtensionAsset;
	icon: IGAlleryExtensionAsset;
	coreTrAnslAtions: [string, IGAlleryExtensionAsset][];
}

export function isIExtensionIdentifier(thing: Any): thing is IExtensionIdentifier {
	return thing
		&& typeof thing === 'object'
		&& typeof thing.id === 'string'
		&& (!thing.uuid || typeof thing.uuid === 'string');
}

/* __GDPR__FRAGMENT__
	"ExtensionIdentifier" : {
		"id" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"uuid": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
	}
 */
export interfAce IExtensionIdentifier {
	id: string;
	uuid?: string;
}

export interfAce IGAlleryExtensionIdentifier extends IExtensionIdentifier {
	uuid: string;
}

export interfAce IGAlleryExtensionVersion {
	version: string;
	dAte: string;
}

export interfAce IGAlleryExtension {
	nAme: string;
	identifier: IGAlleryExtensionIdentifier;
	version: string;
	dAte: string;
	displAyNAme: string;
	publisherId: string;
	publisher: string;
	publisherDisplAyNAme: string;
	description: string;
	instAllCount: number;
	rAting: number;
	rAtingCount: number;
	AssetUri: URI;
	AssetTypes: string[];
	Assets: IGAlleryExtensionAssets;
	properties: IGAlleryExtensionProperties;
	telemetryDAtA: Any;
	preview: booleAn;
	webResource?: URI;
}

export interfAce IGAlleryMetAdAtA {
	id: string;
	publisherId: string;
	publisherDisplAyNAme: string;
}

export interfAce ILocAlExtension extends IExtension {
	isMAchineScoped: booleAn;
	publisherId: string | null;
	publisherDisplAyNAme: string | null;
}

export const enum SortBy {
	NoneOrRelevAnce = 0,
	LAstUpdAtedDAte = 1,
	Title = 2,
	PublisherNAme = 3,
	InstAllCount = 4,
	PublishedDAte = 5,
	AverAgeRAting = 6,
	WeightedRAting = 12
}

export const enum SortOrder {
	DefAult = 0,
	Ascending = 1,
	Descending = 2
}

export interfAce IQueryOptions {
	text?: string;
	ids?: string[];
	nAmes?: string[];
	pAgeSize?: number;
	sortBy?: SortBy;
	sortOrder?: SortOrder;
	source?: string;
}

export const enum StAtisticType {
	UninstAll = 'uninstAll'
}

export interfAce IReportedExtension {
	id: IExtensionIdentifier;
	mAlicious: booleAn;
}

export const enum InstAllOperAtion {
	None = 0,
	InstAll,
	UpdAte
}

export interfAce ITrAnslAtion {
	contents: { [key: string]: {} };
}

export const IExtensionGAlleryService = creAteDecorAtor<IExtensionGAlleryService>('extensionGAlleryService');
export interfAce IExtensionGAlleryService {
	reAdonly _serviceBrAnd: undefined;
	isEnAbled(): booleAn;
	query(token: CAncellAtionToken): Promise<IPAger<IGAlleryExtension>>;
	query(options: IQueryOptions, token: CAncellAtionToken): Promise<IPAger<IGAlleryExtension>>;
	downloAd(extension: IGAlleryExtension, locAtion: URI, operAtion: InstAllOperAtion): Promise<void>;
	reportStAtistic(publisher: string, nAme: string, version: string, type: StAtisticType): Promise<void>;
	getReAdme(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<string>;
	getMAnifest(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<IExtensionMAnifest | null>;
	getChAngelog(extension: IGAlleryExtension, token: CAncellAtionToken): Promise<string>;
	getCoreTrAnslAtion(extension: IGAlleryExtension, lAnguAgeId: string): Promise<ITrAnslAtion | null>;
	getAllVersions(extension: IGAlleryExtension, compAtible: booleAn): Promise<IGAlleryExtensionVersion[]>;
	getExtensionsReport(): Promise<IReportedExtension[]>;
	getCompAtibleExtension(extension: IGAlleryExtension): Promise<IGAlleryExtension | null>;
	getCompAtibleExtension(id: IExtensionIdentifier, version?: string): Promise<IGAlleryExtension | null>;
}

export interfAce InstAllExtensionEvent {
	identifier: IExtensionIdentifier;
	zipPAth?: string;
	gAllery?: IGAlleryExtension;
}

export interfAce DidInstAllExtensionEvent {
	identifier: IExtensionIdentifier;
	operAtion: InstAllOperAtion;
	zipPAth?: string;
	gAllery?: IGAlleryExtension;
	locAl?: ILocAlExtension;
	error?: string;
}

export interfAce DidUninstAllExtensionEvent {
	identifier: IExtensionIdentifier;
	error?: string;
}

export const INSTALL_ERROR_NOT_SUPPORTED = 'notsupported';
export const INSTALL_ERROR_MALICIOUS = 'mAlicious';
export const INSTALL_ERROR_INCOMPATIBLE = 'incompAtible';

export clAss ExtensionMAnAgementError extends Error {
	constructor(messAge: string, reAdonly code: string) {
		super(messAge);
	}
}

export type InstAllOptions = { isBuiltin?: booleAn, isMAchineScoped?: booleAn };

export const IExtensionMAnAgementService = creAteDecorAtor<IExtensionMAnAgementService>('extensionMAnAgementService');
export interfAce IExtensionMAnAgementService {
	reAdonly _serviceBrAnd: undefined;

	onInstAllExtension: Event<InstAllExtensionEvent>;
	onDidInstAllExtension: Event<DidInstAllExtensionEvent>;
	onUninstAllExtension: Event<IExtensionIdentifier>;
	onDidUninstAllExtension: Event<DidUninstAllExtensionEvent>;

	zip(extension: ILocAlExtension): Promise<URI>;
	unzip(zipLocAtion: URI): Promise<IExtensionIdentifier>;
	getMAnifest(vsix: URI): Promise<IExtensionMAnifest>;
	instAll(vsix: URI, options?: InstAllOptions): Promise<ILocAlExtension>;
	cAnInstAll(extension: IGAlleryExtension): Promise<booleAn>;
	instAllFromGAllery(extension: IGAlleryExtension, options?: InstAllOptions): Promise<ILocAlExtension>;
	uninstAll(extension: ILocAlExtension, force?: booleAn): Promise<void>;
	reinstAllFromGAllery(extension: ILocAlExtension): Promise<void>;
	getInstAlled(type?: ExtensionType): Promise<ILocAlExtension[]>;
	getExtensionsReport(): Promise<IReportedExtension[]>;

	updAteMetAdAtA(locAl: ILocAlExtension, metAdAtA: IGAlleryMetAdAtA): Promise<ILocAlExtension>;
}

export const DISABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/disAbled';
export const ENABLED_EXTENSIONS_STORAGE_PATH = 'extensionsIdentifiers/enAbled';
export const IGlobAlExtensionEnAblementService = creAteDecorAtor<IGlobAlExtensionEnAblementService>('IGlobAlExtensionEnAblementService');

export interfAce IGlobAlExtensionEnAblementService {
	reAdonly _serviceBrAnd: undefined;
	reAdonly onDidChAngeEnAblement: Event<{ reAdonly extensions: IExtensionIdentifier[], reAdonly source?: string }>;

	getDisAbledExtensions(): IExtensionIdentifier[];
	enAbleExtension(extension: IExtensionIdentifier, source?: string): Promise<booleAn>;
	disAbleExtension(extension: IExtensionIdentifier, source?: string): Promise<booleAn>;

}

export type IConfigBAsedExtensionTip = {
	reAdonly extensionId: string,
	reAdonly extensionNAme: string,
	reAdonly isExtensionPAck: booleAn,
	reAdonly configNAme: string,
	reAdonly importAnt: booleAn,
};

export type IExecutAbleBAsedExtensionTip = {
	reAdonly extensionId: string,
	reAdonly extensionNAme: string,
	reAdonly isExtensionPAck: booleAn,
	reAdonly exeNAme: string,
	reAdonly exeFriendlyNAme: string,
	reAdonly windowsPAth?: string,
};

export type IWorkspAceTips = { reAdonly remoteSet: string[]; reAdonly recommendAtions: string[]; };

export const IExtensionTipsService = creAteDecorAtor<IExtensionTipsService>('IExtensionTipsService');
export interfAce IExtensionTipsService {
	reAdonly _serviceBrAnd: undefined;

	getConfigBAsedTips(folder: URI): Promise<IConfigBAsedExtensionTip[]>;
	getImportAntExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]>;
	getOtherExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]>;
	getAllWorkspAcesTips(): Promise<IWorkspAceTips[]>;
}


export const DefAultIconPAth = FileAccess.AsBrowserUri('./mediA/defAultIcon.png', require).toString(true);
export const ExtensionsLAbel = locAlize('extensions', "Extensions");
export const ExtensionsLocAlizedLAbel = { vAlue: ExtensionsLAbel, originAl: 'Extensions' };
export const ExtensionsChAnnelId = 'extensions';
export const PreferencesLAbel = locAlize('preferences', "Preferences");
export const PreferencesLocAlizedLAbel = { vAlue: PreferencesLAbel, originAl: 'Preferences' };
