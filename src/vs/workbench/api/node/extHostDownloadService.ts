/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/bAse/common/pAth';
import { tmpdir } from 'os';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { URI } from 'vs/bAse/common/uri';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';

export clAss ExtHostDownloAdService extends DisposAble {

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostCommAnds commAnds: IExtHostCommAnds
	) {
		super();

		const proxy = extHostRpc.getProxy(MAinContext.MAinThreAdDownloAdService);

		commAnds.registerCommAnd(fAlse, '_workbench.downloAdResource', Async (resource: URI): Promise<Any> => {
			const locAtion = URI.file(join(tmpdir(), generAteUuid()));
			AwAit proxy.$downloAd(resource, locAtion);
			return locAtion;
		});
	}
}
