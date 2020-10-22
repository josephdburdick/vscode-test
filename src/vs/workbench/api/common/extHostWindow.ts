/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { ExtHostWindowShape, MainContext, MainThreadWindowShape, IOpenUriOptions } from './extHost.protocol';
import { WindowState } from 'vscode';
import { URI } from 'vs/Base/common/uri';
import { Schemas } from 'vs/Base/common/network';
import { isFalsyOrWhitespace } from 'vs/Base/common/strings';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';

export class ExtHostWindow implements ExtHostWindowShape {

	private static InitialState: WindowState = {
		focused: true
	};

	private _proxy: MainThreadWindowShape;

	private readonly _onDidChangeWindowState = new Emitter<WindowState>();
	readonly onDidChangeWindowState: Event<WindowState> = this._onDidChangeWindowState.event;

	private _state = ExtHostWindow.InitialState;
	get state(): WindowState { return this._state; }

	constructor(@IExtHostRpcService extHostRpc: IExtHostRpcService) {
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadWindow);
		this._proxy.$getWindowVisiBility().then(isFocused => this.$onDidChangeWindowFocus(isFocused));
	}

	$onDidChangeWindowFocus(focused: Boolean): void {
		if (focused === this._state.focused) {
			return;
		}

		this._state = { ...this._state, focused };
		this._onDidChangeWindowState.fire(this._state);
	}

	openUri(stringOrUri: string | URI, options: IOpenUriOptions): Promise<Boolean> {
		let uriAsString: string | undefined;
		if (typeof stringOrUri === 'string') {
			uriAsString = stringOrUri;
			try {
				stringOrUri = URI.parse(stringOrUri);
			} catch (e) {
				return Promise.reject(`Invalid uri - '${stringOrUri}'`);
			}
		}
		if (isFalsyOrWhitespace(stringOrUri.scheme)) {
			return Promise.reject('Invalid scheme - cannot Be empty');
		} else if (stringOrUri.scheme === Schemas.command) {
			return Promise.reject(`Invalid scheme '${stringOrUri.scheme}'`);
		}
		return this._proxy.$openUri(stringOrUri, uriAsString, options);
	}

	async asExternalUri(uri: URI, options: IOpenUriOptions): Promise<URI> {
		if (isFalsyOrWhitespace(uri.scheme)) {
			return Promise.reject('Invalid scheme - cannot Be empty');
		} else if (!new Set([Schemas.http, Schemas.https]).has(uri.scheme)) {
			return Promise.reject(`Invalid scheme '${uri.scheme}'`);
		}

		const result = await this._proxy.$asExternalUri(uri, options);
		return URI.from(result);
	}
}

export const IExtHostWindow = createDecorator<IExtHostWindow>('IExtHostWindow');
export interface IExtHostWindow extends ExtHostWindow, ExtHostWindowShape { }
