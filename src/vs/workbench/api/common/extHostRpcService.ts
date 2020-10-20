/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ProxyIdentifier, IRPCProtocol } from 'vs/workbench/services/extensions/common/proxyIdentifier';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export const IExtHostRpcService = creAteDecorAtor<IExtHostRpcService>('IExtHostRpcService');

export interfAce IExtHostRpcService extends IRPCProtocol {
	reAdonly _serviceBrAnd: undefined;
}

export clAss ExtHostRpcService implements IExtHostRpcService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly getProxy: <T>(identifier: ProxyIdentifier<T>) => T;
	reAdonly set: <T, R extends T> (identifier: ProxyIdentifier<T>, instAnce: R) => R;
	reAdonly AssertRegistered: (identifiers: ProxyIdentifier<Any>[]) => void;
	reAdonly drAin: () => Promise<void>;

	constructor(rpcProtocol: IRPCProtocol) {
		this.getProxy = rpcProtocol.getProxy.bind(rpcProtocol);
		this.set = rpcProtocol.set.bind(rpcProtocol);
		this.AssertRegistered = rpcProtocol.AssertRegistered.bind(rpcProtocol);
		this.drAin = rpcProtocol.drAin.bind(rpcProtocol);
	}
}
