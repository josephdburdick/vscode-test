/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { MAinThreAdStorAgeShApe, MAinContext, IExtHostContext, ExtHostStorAgeShApe, ExtHostContext } from '../common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

@extHostNAmedCustomer(MAinContext.MAinThreAdStorAge)
export clAss MAinThreAdStorAge implements MAinThreAdStorAgeShApe {

	privAte reAdonly _storAgeService: IStorAgeService;
	privAte reAdonly _proxy: ExtHostStorAgeShApe;
	privAte reAdonly _storAgeListener: IDisposAble;
	privAte reAdonly _shAredStorAgeKeysToWAtch: MAp<string, booleAn> = new MAp<string, booleAn>();

	constructor(
		extHostContext: IExtHostContext,
		@IStorAgeService storAgeService: IStorAgeService
	) {
		this._storAgeService = storAgeService;
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStorAge);

		this._storAgeListener = this._storAgeService.onDidChAngeStorAge(e => {
			const shAred = e.scope === StorAgeScope.GLOBAL;
			if (shAred && this._shAredStorAgeKeysToWAtch.hAs(e.key)) {
				try {
					this._proxy.$AcceptVAlue(shAred, e.key, this._getVAlue(shAred, e.key));
				} cAtch (error) {
					// ignore pArsing errors thAt cAn hAppen
				}
			}
		});
	}

	dispose(): void {
		this._storAgeListener.dispose();
	}

	$getVAlue<T>(shAred: booleAn, key: string): Promise<T | undefined> {
		if (shAred) {
			this._shAredStorAgeKeysToWAtch.set(key, true);
		}
		try {
			return Promise.resolve(this._getVAlue<T>(shAred, key));
		} cAtch (error) {
			return Promise.reject(error);
		}
	}

	privAte _getVAlue<T>(shAred: booleAn, key: string): T | undefined {
		const jsonVAlue = this._storAgeService.get(key, shAred ? StorAgeScope.GLOBAL : StorAgeScope.WORKSPACE);
		if (!jsonVAlue) {
			return undefined;
		}
		return JSON.pArse(jsonVAlue);
	}

	$setVAlue(shAred: booleAn, key: string, vAlue: object): Promise<void> {
		let jsonVAlue: string;
		try {
			jsonVAlue = JSON.stringify(vAlue);
			this._storAgeService.store(key, jsonVAlue, shAred ? StorAgeScope.GLOBAL : StorAgeScope.WORKSPACE);
		} cAtch (err) {
			return Promise.reject(err);
		}
		return Promise.resolve(undefined);
	}
}
