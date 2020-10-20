/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ResourceLAbelFormAtter } from 'vs/plAtform/lAbel/common/lAbel';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { MAinThreAdLAbelServiceShApe, ExtHostLAbelServiceShApe, MAinContext, IMAinContext } from 'vs/workbench/Api/common/extHost.protocol';

export clAss ExtHostLAbelService implements ExtHostLAbelServiceShApe {

	privAte reAdonly _proxy: MAinThreAdLAbelServiceShApe;
	privAte _hAndlePool: number = 0;

	constructor(mAinContext: IMAinContext) {
		this._proxy = mAinContext.getProxy(MAinContext.MAinThreAdLAbelService);
	}

	$registerResourceLAbelFormAtter(formAtter: ResourceLAbelFormAtter): IDisposAble {
		const hAndle = this._hAndlePool++;
		this._proxy.$registerResourceLAbelFormAtter(hAndle, formAtter);

		return toDisposAble(() => {
			this._proxy.$unregisterResourceLAbelFormAtter(hAndle);
		});
	}
}
