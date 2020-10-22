/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ResourceLaBelFormatter } from 'vs/platform/laBel/common/laBel';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { MainThreadLaBelServiceShape, ExtHostLaBelServiceShape, MainContext, IMainContext } from 'vs/workBench/api/common/extHost.protocol';

export class ExtHostLaBelService implements ExtHostLaBelServiceShape {

	private readonly _proxy: MainThreadLaBelServiceShape;
	private _handlePool: numBer = 0;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadLaBelService);
	}

	$registerResourceLaBelFormatter(formatter: ResourceLaBelFormatter): IDisposaBle {
		const handle = this._handlePool++;
		this._proxy.$registerResourceLaBelFormatter(handle, formatter);

		return toDisposaBle(() => {
			this._proxy.$unregisterResourceLaBelFormatter(handle);
		});
	}
}
