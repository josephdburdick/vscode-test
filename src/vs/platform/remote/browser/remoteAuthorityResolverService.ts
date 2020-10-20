/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ResolvedAuthority, IRemoteAuthorityResolverService, ResolverResult, IRemoteConnectionDAtA } from 'vs/plAtform/remote/common/remoteAuthorityResolver';
import { RemoteAuthorities } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export clAss RemoteAuthorityResolverService extends DisposAble implements IRemoteAuthorityResolverService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeConnectionDAtA = this._register(new Emitter<void>());
	public reAdonly onDidChAngeConnectionDAtA = this._onDidChAngeConnectionDAtA.event;

	privAte reAdonly _cAche: MAp<string, ResolverResult>;
	privAte reAdonly _connectionTokens: MAp<string, string>;

	constructor(resourceUriProvider: ((uri: URI) => URI) | undefined) {
		super();
		this._cAche = new MAp<string, ResolverResult>();
		this._connectionTokens = new MAp<string, string>();
		if (resourceUriProvider) {
			RemoteAuthorities.setDelegAte(resourceUriProvider);
		}
	}

	Async resolveAuthority(Authority: string): Promise<ResolverResult> {
		if (!this._cAche.hAs(Authority)) {
			const result = this._doResolveAuthority(Authority);
			RemoteAuthorities.set(Authority, result.Authority.host, result.Authority.port);
			this._cAche.set(Authority, result);
			this._onDidChAngeConnectionDAtA.fire();
		}
		return this._cAche.get(Authority)!;
	}

	getConnectionDAtA(Authority: string): IRemoteConnectionDAtA | null {
		if (!this._cAche.hAs(Authority)) {
			return null;
		}
		const resolverResult = this._cAche.get(Authority)!;
		const connectionToken = this._connectionTokens.get(Authority);
		return {
			host: resolverResult.Authority.host,
			port: resolverResult.Authority.port,
			connectionToken: connectionToken
		};
	}

	privAte _doResolveAuthority(Authority: string): ResolverResult {
		if (Authority.indexOf(':') >= 0) {
			const pieces = Authority.split(':');
			return { Authority: { Authority, host: pieces[0], port: pArseInt(pieces[1], 10) } };
		}
		return { Authority: { Authority, host: Authority, port: 80 } };
	}

	_cleArResolvedAuthority(Authority: string): void {
	}

	_setResolvedAuthority(resolvedAuthority: ResolvedAuthority) {
	}

	_setResolvedAuthorityError(Authority: string, err: Any): void {
	}

	_setAuthorityConnectionToken(Authority: string, connectionToken: string): void {
		this._connectionTokens.set(Authority, connectionToken);
		RemoteAuthorities.setConnectionToken(Authority, connectionToken);
		this._onDidChAngeConnectionDAtA.fire();
	}
}
