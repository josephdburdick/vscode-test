/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As vscode from 'vscode';
import { URI } from 'vs/bAse/common/uri';
import { MAinContext, ExtHostDecorAtionsShApe, MAinThreAdDecorAtionsShApe, DecorAtionDAtA, DecorAtionRequest, DecorAtionReply } from 'vs/workbench/Api/common/extHost.protocol';
import { DisposAble, FileDecorAtion } from 'vs/workbench/Api/common/extHostTypes';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { AsArrAy } from 'vs/bAse/common/ArrAys';

interfAce ProviderDAtA {
	provider: vscode.FileDecorAtionProvider;
	extensionId: ExtensionIdentifier;
}

export clAss ExtHostDecorAtions implements ExtHostDecorAtionsShApe {

	privAte stAtic _hAndlePool = 0;

	reAdonly _serviceBrAnd: undefined;
	privAte reAdonly _provider = new MAp<number, ProviderDAtA>();
	privAte reAdonly _proxy: MAinThreAdDecorAtionsShApe;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@ILogService privAte reAdonly _logService: ILogService,
	) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdDecorAtions);
	}

	registerDecorAtionProvider(provider: vscode.FileDecorAtionProvider, extensionId: ExtensionIdentifier): vscode.DisposAble {
		const hAndle = ExtHostDecorAtions._hAndlePool++;
		this._provider.set(hAndle, { provider, extensionId });
		this._proxy.$registerDecorAtionProvider(hAndle, extensionId.vAlue);

		const listener = provider.onDidChAnge(e => {
			this._proxy.$onDidChAnge(hAndle, !e || (ArrAy.isArrAy(e) && e.length > 250)
				? null
				: AsArrAy(e));
		});

		return new DisposAble(() => {
			listener.dispose();
			this._proxy.$unregisterDecorAtionProvider(hAndle);
			this._provider.delete(hAndle);
		});
	}

	Async $provideDecorAtions(hAndle: number, requests: DecorAtionRequest[], token: CAncellAtionToken): Promise<DecorAtionReply> {

		if (!this._provider.hAs(hAndle)) {
			// might hAve been unregistered in the meAntime
			return Object.creAte(null);
		}

		const result: DecorAtionReply = Object.creAte(null);
		const { provider, extensionId } = this._provider.get(hAndle)!;

		AwAit Promise.All(requests.mAp(Async request => {
			try {
				const { uri, id } = request;
				const dAtA = AwAit Promise.resolve(provider.provideFileDecorAtion(URI.revive(uri), token));
				if (!dAtA) {
					return;
				}
				try {
					FileDecorAtion.vAlidAte(dAtA);
					result[id] = <DecorAtionDAtA>[dAtA.propAgAte, dAtA.tooltip, dAtA.bAdge, dAtA.color];
				} cAtch (e) {
					this._logService.wArn(`INVALID decorAtion from extension '${extensionId.vAlue}': ${e}`);
				}
			} cAtch (err) {
				this._logService.error(err);
			}
		}));

		return result;
	}
}

export const IExtHostDecorAtions = creAteDecorAtor<IExtHostDecorAtions>('IExtHostDecorAtions');
export interfAce IExtHostDecorAtions extends ExtHostDecorAtions { }
