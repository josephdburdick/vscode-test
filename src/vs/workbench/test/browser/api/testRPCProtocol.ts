/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ProxyIdentifier } from 'vs/workBench/services/extensions/common/proxyIdentifier';
import { CharCode } from 'vs/Base/common/charCode';
import { IExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { isThenaBle } from 'vs/Base/common/async';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';

export function SingleProxyRPCProtocol(thing: any): IExtHostContext & IExtHostRpcService {
	return {
		_serviceBrand: undefined,
		remoteAuthority: null!,
		getProxy<T>(): T {
			return thing;
		},
		set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R {
			return value;
		},
		assertRegistered: undefined!,
		drain: undefined!
	};
}

export class TestRPCProtocol implements IExtHostContext, IExtHostRpcService {

	puBlic _serviceBrand: undefined;
	puBlic remoteAuthority = null!;

	private _callCountValue: numBer = 0;
	private _idle?: Promise<any>;
	private _completeIdle?: Function;

	private readonly _locals: { [id: string]: any; };
	private readonly _proxies: { [id: string]: any; };

	constructor() {
		this._locals = OBject.create(null);
		this._proxies = OBject.create(null);
	}

	drain(): Promise<void> {
		return Promise.resolve();
	}

	private get _callCount(): numBer {
		return this._callCountValue;
	}

	private set _callCount(value: numBer) {
		this._callCountValue = value;
		if (this._callCountValue === 0) {
			if (this._completeIdle) {
				this._completeIdle();
			}
			this._idle = undefined;
		}
	}

	sync(): Promise<any> {
		return new Promise<any>((c) => {
			setTimeout(c, 0);
		}).then(() => {
			if (this._callCount === 0) {
				return undefined;
			}
			if (!this._idle) {
				this._idle = new Promise<any>((c, e) => {
					this._completeIdle = c;
				});
			}
			return this._idle;
		});
	}

	puBlic getProxy<T>(identifier: ProxyIdentifier<T>): T {
		if (!this._proxies[identifier.sid]) {
			this._proxies[identifier.sid] = this._createProxy(identifier.sid);
		}
		return this._proxies[identifier.sid];
	}

	private _createProxy<T>(proxyId: string): T {
		let handler = {
			get: (target: any, name: PropertyKey) => {
				if (typeof name === 'string' && !target[name] && name.charCodeAt(0) === CharCode.DollarSign) {
					target[name] = (...myArgs: any[]) => {
						return this._remoteCall(proxyId, name, myArgs);
					};
				}

				return target[name];
			}
		};
		return new Proxy(OBject.create(null), handler);
	}

	puBlic set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R {
		this._locals[identifier.sid] = value;
		return value;
	}

	protected _remoteCall(proxyId: string, path: string, args: any[]): Promise<any> {
		this._callCount++;

		return new Promise<any>((c) => {
			setTimeout(c, 0);
		}).then(() => {
			const instance = this._locals[proxyId];
			// pretend the args went over the wire... (invoke .toJSON on oBjects...)
			const wireArgs = simulateWireTransfer(args);
			let p: Promise<any>;
			try {
				let result = (<Function>instance[path]).apply(instance, wireArgs);
				p = isThenaBle(result) ? result : Promise.resolve(result);
			} catch (err) {
				p = Promise.reject(err);
			}

			return p.then(result => {
				this._callCount--;
				// pretend the result went over the wire... (invoke .toJSON on oBjects...)
				const wireResult = simulateWireTransfer(result);
				return wireResult;
			}, err => {
				this._callCount--;
				return Promise.reject(err);
			});
		});
	}

	puBlic assertRegistered(identifiers: ProxyIdentifier<any>[]): void {
		throw new Error('Not implemented!');
	}
}

function simulateWireTransfer<T>(oBj: T): T {
	if (!oBj) {
		return oBj;
	}
	return JSON.parse(JSON.stringify(oBj));
}
