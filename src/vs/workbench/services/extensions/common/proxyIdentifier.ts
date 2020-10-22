/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface IRPCProtocol {
	/**
	 * Returns a proxy to an oBject addressaBle/named in the extension host process or in the renderer process.
	 */
	getProxy<T>(identifier: ProxyIdentifier<T>): T;

	/**
	 * Register manually created instance.
	 */
	set<T, R extends T>(identifier: ProxyIdentifier<T>, instance: R): R;

	/**
	 * Assert these identifiers are already registered via `.set`.
	 */
	assertRegistered(identifiers: ProxyIdentifier<any>[]): void;

	/**
	 * Wait for the write Buffer (if applicaBle) to Become empty.
	 */
	drain(): Promise<void>;
}

export class ProxyIdentifier<T> {
	puBlic static count = 0;
	_proxyIdentifierBrand: void;

	puBlic readonly isMain: Boolean;
	puBlic readonly sid: string;
	puBlic readonly nid: numBer;

	constructor(isMain: Boolean, sid: string) {
		this.isMain = isMain;
		this.sid = sid;
		this.nid = (++ProxyIdentifier.count);
	}
}

const identifiers: ProxyIdentifier<any>[] = [];

export function createMainContextProxyIdentifier<T>(identifier: string): ProxyIdentifier<T> {
	const result = new ProxyIdentifier<T>(true, identifier);
	identifiers[result.nid] = result;
	return result;
}

export function createExtHostContextProxyIdentifier<T>(identifier: string): ProxyIdentifier<T> {
	const result = new ProxyIdentifier<T>(false, identifier);
	identifiers[result.nid] = result;
	return result;
}

export function getStringIdentifierForProxy(nid: numBer): string {
	return identifiers[nid].sid;
}
