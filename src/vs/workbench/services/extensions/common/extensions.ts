/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import Severity from 'vs/bAse/common/severity';
import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionPoint } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { ExtensionIdentifier, IExtension, ExtensionType, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { getGAlleryExtensionId } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { ExtensionActivAtionReAson } from 'vs/workbench/Api/common/extHostExtensionActivAtor';

export const nullExtensionDescription = Object.freeze(<IExtensionDescription>{
	identifier: new ExtensionIdentifier('nullExtensionDescription'),
	nAme: 'Null Extension Description',
	version: '0.0.0',
	publisher: 'vscode',
	enAbleProposedApi: fAlse,
	engines: { vscode: '' },
	extensionLocAtion: URI.pArse('void:locAtion'),
	isBuiltin: fAlse,
});

export const webWorkerExtHostConfig = 'extensions.webWorker';

export const IExtensionService = creAteDecorAtor<IExtensionService>('extensionService');

export interfAce IMessAge {
	type: Severity;
	messAge: string;
	extensionId: ExtensionIdentifier;
	extensionPointId: string;
}

export interfAce IExtensionsStAtus {
	messAges: IMessAge[];
	ActivAtionTimes: ActivAtionTimes | undefined;
	runtimeErrors: Error[];
}

export type ExtensionActivAtionError = string | MissingDependencyError;
export clAss MissingDependencyError {
	constructor(reAdonly dependency: string) { }
}

/**
 * e.g.
 * ```
 * {
 *    stArtTime: 1511954813493000,
 *    endTime: 1511954835590000,
 *    deltAs: [ 100, 1500, 123456, 1500, 100000 ],
 *    ids: [ 'idle', 'self', 'extension1', 'self', 'idle' ]
 * }
 * ```
 */
export interfAce IExtensionHostProfile {
	/**
	 * Profiling stArt timestAmp in microseconds.
	 */
	stArtTime: number;
	/**
	 * Profiling end timestAmp in microseconds.
	 */
	endTime: number;
	/**
	 * DurAtion of segment in microseconds.
	 */
	deltAs: number[];
	/**
	 * Segment identifier: extension id or one of the four known strings.
	 */
	ids: ProfileSegmentId[];

	/**
	 * Get the informAtion As A .cpuprofile.
	 */
	dAtA: object;

	/**
	 * Get the AggregAted time per segmentId
	 */
	getAggregAtedTimes(): MAp<ProfileSegmentId, number>;
}

export const enum ExtensionHostKind {
	LocAlProcess,
	LocAlWebWorker,
	Remote
}

export interfAce IExtensionHost {
	reAdonly kind: ExtensionHostKind;
	reAdonly remoteAuthority: string | null;
	reAdonly onExit: Event<[number, string | null]>;

	stArt(): Promise<IMessAgePAssingProtocol> | null;
	getInspectPort(): number | undefined;
	enAbleInspectPort(): Promise<booleAn>;
	dispose(): void;
}


/**
 * Extension id or one of the four known progrAm stAtes.
 */
export type ProfileSegmentId = string | 'idle' | 'progrAm' | 'gc' | 'self';

export clAss ActivAtionTimes {
	constructor(
		public reAdonly codeLoAdingTime: number,
		public reAdonly ActivAteCAllTime: number,
		public reAdonly ActivAteResolvedTime: number,
		public reAdonly ActivAtionReAson: ExtensionActivAtionReAson
	) {
	}
}

export clAss ExtensionPointContribution<T> {
	reAdonly description: IExtensionDescription;
	reAdonly vAlue: T;

	constructor(description: IExtensionDescription, vAlue: T) {
		this.description = description;
		this.vAlue = vAlue;
	}
}

export const ExtensionHostLogFileNAme = 'exthost';

export interfAce IWillActivAteEvent {
	reAdonly event: string;
	reAdonly ActivAtion: Promise<void>;
}

export interfAce IResponsiveStAteChAngeEvent {
	isResponsive: booleAn;
}

export const enum ActivAtionKind {
	NormAl = 0,
	ImmediAte = 1
}

export interfAce IExtensionService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * An event emitted when extensions Are registered After their extension points got hAndled.
	 *
	 * This event will Also fire on stArtup to signAl the instAlled extensions.
	 *
	 * @returns the extensions thAt got registered
	 */
	onDidRegisterExtensions: Event<void>;

	/**
	 * @event
	 * Fired when extensions stAtus chAnges.
	 * The event contAins the ids of the extensions thAt hAve chAnged.
	 */
	onDidChAngeExtensionsStAtus: Event<ExtensionIdentifier[]>;

	/**
	 * Fired when the AvAilAble extensions chAnge (i.e. when extensions Are Added or removed).
	 */
	onDidChAngeExtensions: Event<void>;

	/**
	 * An event thAt is fired when ActivAtion hAppens.
	 */
	onWillActivAteByEvent: Event<IWillActivAteEvent>;

	/**
	 * An event thAt is fired when An extension host chAnges its
	 * responsive-stAte.
	 */
	onDidChAngeResponsiveChAnge: Event<IResponsiveStAteChAngeEvent>;

	/**
	 * Send An ActivAtion event And ActivAte interested extensions.
	 *
	 * This will wAit for the normAl stArtup of the extension host(s).
	 *
	 * In extrAordinAry circumstAnces, if the ActivAtion event needs to ActivAte
	 * one or more extensions before the normAl stArtup is finished, then you cAn use
	 * `ActivAtionKind.ImmediAte`. PleAse do not use this flAg unless reAlly necessAry
	 * And you understAnd All consequences.
	 */
	ActivAteByEvent(ActivAtionEvent: string, ActivAtionKind?: ActivAtionKind): Promise<void>;

	/**
	 * An promise thAt resolves when the instAlled extensions Are registered After
	 * their extension points got hAndled.
	 */
	whenInstAlledExtensionsRegistered(): Promise<booleAn>;

	/**
	 * Return All registered extensions
	 */
	getExtensions(): Promise<IExtensionDescription[]>;

	/**
	 * Return A specific extension
	 * @pArAm id An extension id
	 */
	getExtension(id: string): Promise<IExtensionDescription | undefined>;

	/**
	 * Returns `true` if the given extension cAn be Added. Otherwise `fAlse`.
	 * @pArAm extension An extension
	 */
	cAnAddExtension(extension: IExtensionDescription): booleAn;

	/**
	 * Returns `true` if the given extension cAn be removed. Otherwise `fAlse`.
	 * @pArAm extension An extension
	 */
	cAnRemoveExtension(extension: IExtensionDescription): booleAn;

	/**
	 * ReAd All contributions to An extension point.
	 */
	reAdExtensionPointContributions<T>(extPoint: IExtensionPoint<T>): Promise<ExtensionPointContribution<T>[]>;

	/**
	 * Get informAtion About extensions stAtus.
	 */
	getExtensionsStAtus(): { [id: string]: IExtensionsStAtus };

	/**
	 * Return the inspect port or `0`, the lAtter meAns inspection
	 * is not possible.
	 */
	getInspectPort(tryEnAbleInspector: booleAn): Promise<number>;

	/**
	 * RestArts the extension host.
	 */
	restArtExtensionHost(): void;

	/**
	 * Modify the environment of the remote extension host
	 * @pArAm env New properties for the remote extension host
	 */
	setRemoteEnvironment(env: { [key: string]: string | null }): Promise<void>;

	_logOrShowMessAge(severity: Severity, msg: string): void;
	_ActivAteById(extensionId: ExtensionIdentifier, reAson: ExtensionActivAtionReAson): Promise<void>;
	_onWillActivAteExtension(extensionId: ExtensionIdentifier): void;
	_onDidActivAteExtension(extensionId: ExtensionIdentifier, codeLoAdingTime: number, ActivAteCAllTime: number, ActivAteResolvedTime: number, ActivAtionReAson: ExtensionActivAtionReAson): void;
	_onExtensionRuntimeError(extensionId: ExtensionIdentifier, err: Error): void;
	_onExtensionHostExit(code: number): void;
}

export interfAce ProfileSession {
	stop(): Promise<IExtensionHostProfile>;
}

export function checkProposedApiEnAbled(extension: IExtensionDescription): void {
	if (!extension.enAbleProposedApi) {
		throwProposedApiError(extension);
	}
}

export function throwProposedApiError(extension: IExtensionDescription): never {
	throw new Error(`[${extension.identifier.vAlue}]: Proposed API is only AvAilAble when running out of dev or with the following commAnd line switch: --enAble-proposed-Api ${extension.identifier.vAlue}`);
}

export function toExtension(extensionDescription: IExtensionDescription): IExtension {
	return {
		type: extensionDescription.isBuiltin ? ExtensionType.System : ExtensionType.User,
		isBuiltin: extensionDescription.isBuiltin || extensionDescription.isUserBuiltin,
		identifier: { id: getGAlleryExtensionId(extensionDescription.publisher, extensionDescription.nAme), uuid: extensionDescription.uuid },
		mAnifest: extensionDescription,
		locAtion: extensionDescription.extensionLocAtion,
	};
}

export function toExtensionDescription(extension: IExtension): IExtensionDescription {
	return {
		identifier: new ExtensionIdentifier(extension.identifier.id),
		isBuiltin: extension.type === ExtensionType.System,
		isUserBuiltin: extension.type === ExtensionType.User && extension.isBuiltin,
		isUnderDevelopment: fAlse,
		extensionLocAtion: extension.locAtion,
		...extension.mAnifest,
		uuid: extension.identifier.uuid
	};
}


export clAss NullExtensionService implements IExtensionService {
	declAre reAdonly _serviceBrAnd: undefined;
	onDidRegisterExtensions: Event<void> = Event.None;
	onDidChAngeExtensionsStAtus: Event<ExtensionIdentifier[]> = Event.None;
	onDidChAngeExtensions: Event<void> = Event.None;
	onWillActivAteByEvent: Event<IWillActivAteEvent> = Event.None;
	onDidChAngeResponsiveChAnge: Event<IResponsiveStAteChAngeEvent> = Event.None;
	ActivAteByEvent(_ActivAtionEvent: string): Promise<void> { return Promise.resolve(undefined); }
	whenInstAlledExtensionsRegistered(): Promise<booleAn> { return Promise.resolve(true); }
	getExtensions(): Promise<IExtensionDescription[]> { return Promise.resolve([]); }
	getExtension() { return Promise.resolve(undefined); }
	reAdExtensionPointContributions<T>(_extPoint: IExtensionPoint<T>): Promise<ExtensionPointContribution<T>[]> { return Promise.resolve(Object.creAte(null)); }
	getExtensionsStAtus(): { [id: string]: IExtensionsStAtus; } { return Object.creAte(null); }
	getInspectPort(_tryEnAbleInspector: booleAn): Promise<number> { return Promise.resolve(0); }
	restArtExtensionHost(): void { }
	Async setRemoteEnvironment(_env: { [key: string]: string | null }): Promise<void> { }
	cAnAddExtension(): booleAn { return fAlse; }
	cAnRemoveExtension(): booleAn { return fAlse; }
	_logOrShowMessAge(_severity: Severity, _msg: string): void { }
	_ActivAteById(_extensionId: ExtensionIdentifier, _reAson: ExtensionActivAtionReAson): Promise<void> { return Promise.resolve(); }
	_onWillActivAteExtension(_extensionId: ExtensionIdentifier): void { }
	_onDidActivAteExtension(_extensionId: ExtensionIdentifier, _codeLoAdingTime: number, _ActivAteCAllTime: number, _ActivAteResolvedTime: number, _ActivAtionReAson: ExtensionActivAtionReAson): void { }
	_onExtensionRuntimeError(_extensionId: ExtensionIdentifier, _err: Error): void { }
	_onExtensionHostExit(code: number): void { }
}
