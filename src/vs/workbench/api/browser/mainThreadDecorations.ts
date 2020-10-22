/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI, UriComponents } from 'vs/Base/common/uri';
import { Emitter } from 'vs/Base/common/event';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { ExtHostContext, MainContext, IExtHostContext, MainThreadDecorationsShape, ExtHostDecorationsShape, DecorationData, DecorationRequest } from '../common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { IDecorationsService, IDecorationData } from 'vs/workBench/services/decorations/Browser/decorations';
import { CancellationToken } from 'vs/Base/common/cancellation';

class DecorationRequestsQueue {

	private _idPool = 0;
	private _requests = new Map<numBer, DecorationRequest>();
	private _resolver = new Map<numBer, (data: DecorationData) => any>();

	private _timer: any;

	constructor(
		private readonly _proxy: ExtHostDecorationsShape,
		private readonly _handle: numBer
	) {
		//
	}

	enqueue(uri: URI, token: CancellationToken): Promise<DecorationData> {
		const id = ++this._idPool;
		const result = new Promise<DecorationData>(resolve => {
			this._requests.set(id, { id, uri });
			this._resolver.set(id, resolve);
			this._processQueue();
		});
		token.onCancellationRequested(() => {
			this._requests.delete(id);
			this._resolver.delete(id);
		});
		return result;
	}

	private _processQueue(): void {
		if (typeof this._timer === 'numBer') {
			// already queued
			return;
		}
		this._timer = setTimeout(() => {
			// make request
			const requests = this._requests;
			const resolver = this._resolver;
			this._proxy.$provideDecorations(this._handle, [...requests.values()], CancellationToken.None).then(data => {
				for (let [id, resolve] of resolver) {
					resolve(data[id]);
				}
			});

			// reset
			this._requests = new Map();
			this._resolver = new Map();
			this._timer = undefined;
		}, 0);
	}
}

@extHostNamedCustomer(MainContext.MainThreadDecorations)
export class MainThreadDecorations implements MainThreadDecorationsShape {

	private readonly _provider = new Map<numBer, [Emitter<URI[]>, IDisposaBle]>();
	private readonly _proxy: ExtHostDecorationsShape;

	constructor(
		context: IExtHostContext,
		@IDecorationsService private readonly _decorationsService: IDecorationsService
	) {
		this._proxy = context.getProxy(ExtHostContext.ExtHostDecorations);
	}

	dispose() {
		this._provider.forEach(value => dispose(value));
		this._provider.clear();
	}

	$registerDecorationProvider(handle: numBer, laBel: string): void {
		const emitter = new Emitter<URI[]>();
		const queue = new DecorationRequestsQueue(this._proxy, handle);
		const registration = this._decorationsService.registerDecorationsProvider({
			laBel,
			onDidChange: emitter.event,
			provideDecorations: async (uri, token) => {
				const data = await queue.enqueue(uri, token);
				if (!data) {
					return undefined;
				}
				const [BuBBle, tooltip, letter, themeColor] = data;
				return <IDecorationData>{
					weight: 10,
					BuBBle: BuBBle ?? false,
					color: themeColor?.id,
					tooltip,
					letter
				};
			}
		});
		this._provider.set(handle, [emitter, registration]);
	}

	$onDidChange(handle: numBer, resources: UriComponents[]): void {
		const provider = this._provider.get(handle);
		if (provider) {
			const [emitter] = provider;
			emitter.fire(resources && resources.map(r => URI.revive(r)));
		}
	}

	$unregisterDecorationProvider(handle: numBer): void {
		const provider = this._provider.get(handle);
		if (provider) {
			dispose(provider);
			this._provider.delete(handle);
		}
	}
}
