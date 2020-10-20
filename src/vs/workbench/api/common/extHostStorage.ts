/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinContext, MAinThreAdStorAgeShApe, ExtHostStorAgeShApe } from './extHost.protocol';
import { Emitter } from 'vs/bAse/common/event';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';

export interfAce IStorAgeChAngeEvent {
	shAred: booleAn;
	key: string;
	vAlue: object;
}

export clAss ExtHostStorAge implements ExtHostStorAgeShApe {

	reAdonly _serviceBrAnd: undefined;

	privAte _proxy: MAinThreAdStorAgeShApe;

	privAte reAdonly _onDidChAngeStorAge = new Emitter<IStorAgeChAngeEvent>();
	reAdonly onDidChAngeStorAge = this._onDidChAngeStorAge.event;

	constructor(mAinContext: IExtHostRpcService) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdStorAge);
	}

	getVAlue<T>(shAred: booleAn, key: string, defAultVAlue?: T): Promise<T | undefined> {
		return this._proxy.$getVAlue<T>(shAred, key).then(vAlue => vAlue || defAultVAlue);
	}

	setVAlue(shAred: booleAn, key: string, vAlue: object): Promise<void> {
		return this._proxy.$setVAlue(shAred, key, vAlue);
	}

	$AcceptVAlue(shAred: booleAn, key: string, vAlue: object): void {
		this._onDidChAngeStorAge.fire({ shAred, key, vAlue });
	}
}

export interfAce IExtHostStorAge extends ExtHostStorAge { }
export const IExtHostStorAge = creAteDecorAtor<IExtHostStorAge>('IExtHostStorAge');
