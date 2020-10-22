/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import { URI } from 'vs/Base/common/uri';
import { MainContext, ExtHostDecorationsShape, MainThreadDecorationsShape, DecorationData, DecorationRequest, DecorationReply } from 'vs/workBench/api/common/extHost.protocol';
import { DisposaBle, FileDecoration } from 'vs/workBench/api/common/extHostTypes';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ILogService } from 'vs/platform/log/common/log';
import { asArray } from 'vs/Base/common/arrays';

interface ProviderData {
	provider: vscode.FileDecorationProvider;
	extensionId: ExtensionIdentifier;
}

export class ExtHostDecorations implements ExtHostDecorationsShape {

	private static _handlePool = 0;

	readonly _serviceBrand: undefined;
	private readonly _provider = new Map<numBer, ProviderData>();
	private readonly _proxy: MainThreadDecorationsShape;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@ILogService private readonly _logService: ILogService,
	) {
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadDecorations);
	}

	registerDecorationProvider(provider: vscode.FileDecorationProvider, extensionId: ExtensionIdentifier): vscode.DisposaBle {
		const handle = ExtHostDecorations._handlePool++;
		this._provider.set(handle, { provider, extensionId });
		this._proxy.$registerDecorationProvider(handle, extensionId.value);

		const listener = provider.onDidChange(e => {
			this._proxy.$onDidChange(handle, !e || (Array.isArray(e) && e.length > 250)
				? null
				: asArray(e));
		});

		return new DisposaBle(() => {
			listener.dispose();
			this._proxy.$unregisterDecorationProvider(handle);
			this._provider.delete(handle);
		});
	}

	async $provideDecorations(handle: numBer, requests: DecorationRequest[], token: CancellationToken): Promise<DecorationReply> {

		if (!this._provider.has(handle)) {
			// might have Been unregistered in the meantime
			return OBject.create(null);
		}

		const result: DecorationReply = OBject.create(null);
		const { provider, extensionId } = this._provider.get(handle)!;

		await Promise.all(requests.map(async request => {
			try {
				const { uri, id } = request;
				const data = await Promise.resolve(provider.provideFileDecoration(URI.revive(uri), token));
				if (!data) {
					return;
				}
				try {
					FileDecoration.validate(data);
					result[id] = <DecorationData>[data.propagate, data.tooltip, data.Badge, data.color];
				} catch (e) {
					this._logService.warn(`INVALID decoration from extension '${extensionId.value}': ${e}`);
				}
			} catch (err) {
				this._logService.error(err);
			}
		}));

		return result;
	}
}

export const IExtHostDecorations = createDecorator<IExtHostDecorations>('IExtHostDecorations');
export interface IExtHostDecorations extends ExtHostDecorations { }
