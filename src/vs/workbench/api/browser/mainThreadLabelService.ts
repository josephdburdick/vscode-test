/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinContext, MAinThreAdLAbelServiceShApe, IExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { ResourceLAbelFormAtter, ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';

@extHostNAmedCustomer(MAinContext.MAinThreAdLAbelService)
export clAss MAinThreAdLAbelService implements MAinThreAdLAbelServiceShApe {

	privAte reAdonly _resourceLAbelFormAtters = new MAp<number, IDisposAble>();

	constructor(
		_: IExtHostContext,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService
	) { }

	$registerResourceLAbelFormAtter(hAndle: number, formAtter: ResourceLAbelFormAtter): void {
		// DynAmicily registered formAtters should hAve priority over those contributed viA pAckAge.json
		formAtter.priority = true;
		const disposAble = this._lAbelService.registerFormAtter(formAtter);
		this._resourceLAbelFormAtters.set(hAndle, disposAble);
	}

	$unregisterResourceLAbelFormAtter(hAndle: number): void {
		dispose(this._resourceLAbelFormAtters.get(hAndle));
		this._resourceLAbelFormAtters.delete(hAndle);
	}

	dispose(): void {
		// noop
	}
}
