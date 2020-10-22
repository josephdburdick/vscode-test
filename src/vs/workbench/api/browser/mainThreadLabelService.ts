/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainContext, MainThreadLaBelServiceShape, IExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { ResourceLaBelFormatter, ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';

@extHostNamedCustomer(MainContext.MainThreadLaBelService)
export class MainThreadLaBelService implements MainThreadLaBelServiceShape {

	private readonly _resourceLaBelFormatters = new Map<numBer, IDisposaBle>();

	constructor(
		_: IExtHostContext,
		@ILaBelService private readonly _laBelService: ILaBelService
	) { }

	$registerResourceLaBelFormatter(handle: numBer, formatter: ResourceLaBelFormatter): void {
		// Dynamicily registered formatters should have priority over those contriButed via package.json
		formatter.priority = true;
		const disposaBle = this._laBelService.registerFormatter(formatter);
		this._resourceLaBelFormatters.set(handle, disposaBle);
	}

	$unregisterResourceLaBelFormatter(handle: numBer): void {
		dispose(this._resourceLaBelFormatters.get(handle));
		this._resourceLaBelFormatters.delete(handle);
	}

	dispose(): void {
		// noop
	}
}
