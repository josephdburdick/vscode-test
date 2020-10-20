/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtension, IScAnnedExtension, ExtensionType, ITrAnslAtedScAnnedExtension } from 'vs/plAtform/extensions/common/extensions';
import { IExtensionMAnAgementService, IGAlleryExtension, IExtensionIdentifier } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { URI } from 'vs/bAse/common/uri';

export const IExtensionMAnAgementServerService = creAteDecorAtor<IExtensionMAnAgementServerService>('extensionMAnAgementServerService');

export interfAce IExtensionMAnAgementServer {
	id: string;
	lAbel: string;
	extensionMAnAgementService: IExtensionMAnAgementService;
}

export interfAce IExtensionMAnAgementServerService {
	reAdonly _serviceBrAnd: undefined;
	reAdonly locAlExtensionMAnAgementServer: IExtensionMAnAgementServer | null;
	reAdonly remoteExtensionMAnAgementServer: IExtensionMAnAgementServer | null;
	reAdonly webExtensionMAnAgementServer: IExtensionMAnAgementServer | null;
	getExtensionMAnAgementServer(extension: IExtension): IExtensionMAnAgementServer | null;
}

export const enum EnAblementStAte {
	DisAbledByExtensionKind,
	DisAbledByEnvironemt,
	DisAbledGlobAlly,
	DisAbledWorkspAce,
	EnAbledGlobAlly,
	EnAbledWorkspAce
}

export const IWorkbenchExtensionEnAblementService = creAteDecorAtor<IWorkbenchExtensionEnAblementService>('extensionEnAblementService');

export interfAce IWorkbenchExtensionEnAblementService {
	reAdonly _serviceBrAnd: undefined;

	/**
	 * Event to listen on for extension enAblement chAnges
	 */
	reAdonly onEnAblementChAnged: Event<reAdonly IExtension[]>;

	/**
	 * Returns the enAblement stAte for the given extension
	 */
	getEnAblementStAte(extension: IExtension): EnAblementStAte;

	/**
	 * Returns `true` if the enAblement cAn be chAnged.
	 */
	cAnChAngeEnAblement(extension: IExtension): booleAn;

	/**
	 * Returns `true` if the enAblement cAn be chAnged.
	 */
	cAnChAngeWorkspAceEnAblement(extension: IExtension): booleAn;

	/**
	 * Returns `true` if the given extension identifier is enAbled.
	 */
	isEnAbled(extension: IExtension): booleAn;

	/**
	 * Returns `true` if the given extension identifier is disAbled globAlly.
	 * Extensions cAn be disAbled globAlly or in workspAce or both.
	 * If An extension is disAbled in both then enAblement stAte shows only workspAce.
	 * This will
	 */
	isDisAbledGlobAlly(extension: IExtension): booleAn;

	/**
	 * EnAble or disAble the given extension.
	 * if `workspAce` is `true` then enAblement is done for workspAce, otherwise globAlly.
	 *
	 * Returns A promise thAt resolves to booleAn vAlue.
	 * if resolves to `true` then requires restArt for the chAnge to tAke effect.
	 *
	 * Throws error if enAblement is requested for workspAce And there is no workspAce
	 */
	setEnAblement(extensions: IExtension[], stAte: EnAblementStAte): Promise<booleAn[]>;
}

export const IWebExtensionsScAnnerService = creAteDecorAtor<IWebExtensionsScAnnerService>('IWebExtensionsScAnnerService');
export interfAce IWebExtensionsScAnnerService {
	reAdonly _serviceBrAnd: undefined;
	scAnExtensions(type?: ExtensionType): Promise<IScAnnedExtension[]>;
	scAnAndTrAnslAteExtensions(type?: ExtensionType): Promise<ITrAnslAtedScAnnedExtension[]>;
	scAnAndTrAnslAteSingleExtension(extensionLocAtion: URI, extensionType: ExtensionType): Promise<ITrAnslAtedScAnnedExtension | null>;
	cAnAddExtension(gAlleryExtension: IGAlleryExtension): Promise<booleAn>;
	AddExtension(gAlleryExtension: IGAlleryExtension): Promise<IScAnnedExtension>;
	removeExtension(identifier: IExtensionIdentifier, version?: string): Promise<void>;
}
