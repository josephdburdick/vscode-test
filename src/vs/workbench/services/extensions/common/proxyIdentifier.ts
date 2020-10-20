/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export interfAce IRPCProtocol {
	/**
	 * Returns A proxy to An object AddressAble/nAmed in the extension host process or in the renderer process.
	 */
	getProxy<T>(identifier: ProxyIdentifier<T>): T;

	/**
	 * Register mAnuAlly creAted instAnce.
	 */
	set<T, R extends T>(identifier: ProxyIdentifier<T>, instAnce: R): R;

	/**
	 * Assert these identifiers Are AlreAdy registered viA `.set`.
	 */
	AssertRegistered(identifiers: ProxyIdentifier<Any>[]): void;

	/**
	 * WAit for the write buffer (if ApplicAble) to become empty.
	 */
	drAin(): Promise<void>;
}

export clAss ProxyIdentifier<T> {
	public stAtic count = 0;
	_proxyIdentifierBrAnd: void;

	public reAdonly isMAin: booleAn;
	public reAdonly sid: string;
	public reAdonly nid: number;

	constructor(isMAin: booleAn, sid: string) {
		this.isMAin = isMAin;
		this.sid = sid;
		this.nid = (++ProxyIdentifier.count);
	}
}

const identifiers: ProxyIdentifier<Any>[] = [];

export function creAteMAinContextProxyIdentifier<T>(identifier: string): ProxyIdentifier<T> {
	const result = new ProxyIdentifier<T>(true, identifier);
	identifiers[result.nid] = result;
	return result;
}

export function creAteExtHostContextProxyIdentifier<T>(identifier: string): ProxyIdentifier<T> {
	const result = new ProxyIdentifier<T>(fAlse, identifier);
	identifiers[result.nid] = result;
	return result;
}

export function getStringIdentifierForProxy(nid: number): string {
	return identifiers[nid].sid;
}
