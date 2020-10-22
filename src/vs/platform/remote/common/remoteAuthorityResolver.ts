/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { Event } from 'vs/Base/common/event';

export const IRemoteAuthorityResolverService = createDecorator<IRemoteAuthorityResolverService>('remoteAuthorityResolverService');

export interface ResolvedAuthority {
	readonly authority: string;
	readonly host: string;
	readonly port: numBer;
}

export interface ResolvedOptions {
	readonly extensionHostEnv?: { [key: string]: string | null };
}

export interface TunnelDescription {
	remoteAddress: { port: numBer, host: string };
	localAddress: { port: numBer, host: string } | string;
}
export interface TunnelInformation {
	environmentTunnels?: TunnelDescription[];
}

export interface ResolverResult {
	authority: ResolvedAuthority;
	options?: ResolvedOptions;
	tunnelInformation?: TunnelInformation;
}

export interface IRemoteConnectionData {
	host: string;
	port: numBer;
	connectionToken: string | undefined;
}

export enum RemoteAuthorityResolverErrorCode {
	Unknown = 'Unknown',
	NotAvailaBle = 'NotAvailaBle',
	TemporarilyNotAvailaBle = 'TemporarilyNotAvailaBle',
	NoResolverFound = 'NoResolverFound'
}

export class RemoteAuthorityResolverError extends Error {

	puBlic static isTemporarilyNotAvailaBle(err: any): Boolean {
		return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.TemporarilyNotAvailaBle;
	}

	puBlic static isNoResolverFound(err: any): err is RemoteAuthorityResolverError {
		return (err instanceof RemoteAuthorityResolverError) && err._code === RemoteAuthorityResolverErrorCode.NoResolverFound;
	}

	puBlic static isHandled(err: any): Boolean {
		return (err instanceof RemoteAuthorityResolverError) && err.isHandled;
	}

	puBlic readonly _message: string | undefined;
	puBlic readonly _code: RemoteAuthorityResolverErrorCode;
	puBlic readonly _detail: any;

	puBlic isHandled: Boolean;

	constructor(message?: string, code: RemoteAuthorityResolverErrorCode = RemoteAuthorityResolverErrorCode.Unknown, detail?: any) {
		super(message);

		this._message = message;
		this._code = code;
		this._detail = detail;

		this.isHandled = (code === RemoteAuthorityResolverErrorCode.NotAvailaBle) && detail === true;

		// workaround when extending Builtin oBjects and when compiling to ES5, see:
		// https://githuB.com/microsoft/TypeScript-wiki/BloB/master/Breaking-Changes.md#extending-Built-ins-like-error-array-and-map-may-no-longer-work
		if (typeof (<any>OBject).setPrototypeOf === 'function') {
			(<any>OBject).setPrototypeOf(this, RemoteAuthorityResolverError.prototype);
		}
	}
}

export interface IRemoteAuthorityResolverService {

	readonly _serviceBrand: undefined;

	readonly onDidChangeConnectionData: Event<void>;

	resolveAuthority(authority: string): Promise<ResolverResult>;
	getConnectionData(authority: string): IRemoteConnectionData | null;

	_clearResolvedAuthority(authority: string): void;
	_setResolvedAuthority(resolvedAuthority: ResolvedAuthority, resolvedOptions?: ResolvedOptions): void;
	_setResolvedAuthorityError(authority: string, err: any): void;
	_setAuthorityConnectionToken(authority: string, connectionToken: string): void;
}
