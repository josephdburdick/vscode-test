/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { join } from 'vs/Base/common/path';
import { tmpdir } from 'os';
import { generateUuid } from 'vs/Base/common/uuid';
import { IExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { MainContext } from 'vs/workBench/api/common/extHost.protocol';
import { URI } from 'vs/Base/common/uri';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';

export class ExtHostDownloadService extends DisposaBle {

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostCommands commands: IExtHostCommands
	) {
		super();

		const proxy = extHostRpc.getProxy(MainContext.MainThreadDownloadService);

		commands.registerCommand(false, '_workBench.downloadResource', async (resource: URI): Promise<any> => {
			const location = URI.file(join(tmpdir(), generateUuid()));
			await proxy.$download(resource, location);
			return location;
		});
	}
}
