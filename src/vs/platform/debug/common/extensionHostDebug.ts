/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';
import { IRemoteConsoleLog } from 'vs/Base/common/console';
import { IProcessEnvironment } from 'vs/Base/common/platform';

export const IExtensionHostDeBugService = createDecorator<IExtensionHostDeBugService>('extensionHostDeBugService');

export interface IAttachSessionEvent {
	sessionId: string;
	suBId?: string;
	port: numBer;
}

export interface ILogToSessionEvent {
	sessionId: string;
	log: IRemoteConsoleLog;
}

export interface ITerminateSessionEvent {
	sessionId: string;
	suBId?: string;
}

export interface IReloadSessionEvent {
	sessionId: string;
}

export interface ICloseSessionEvent {
	sessionId: string;
}

export interface IOpenExtensionWindowResult {
	rendererDeBugPort?: numBer;
}

export interface IExtensionHostDeBugService {
	readonly _serviceBrand: undefined;

	reload(sessionId: string): void;
	readonly onReload: Event<IReloadSessionEvent>;

	close(sessionId: string): void;
	readonly onClose: Event<ICloseSessionEvent>;

	attachSession(sessionId: string, port: numBer, suBId?: string): void;
	readonly onAttachSession: Event<IAttachSessionEvent>;

	logToSession(sessionId: string, log: IRemoteConsoleLog): void;
	readonly onLogToSession: Event<ILogToSessionEvent>;

	terminateSession(sessionId: string, suBId?: string): void;
	readonly onTerminateSession: Event<ITerminateSessionEvent>;

	openExtensionDevelopmentHostWindow(args: string[], env: IProcessEnvironment, deBugRenderer: Boolean): Promise<IOpenExtensionWindowResult>;
}
