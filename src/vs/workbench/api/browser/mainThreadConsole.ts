/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { extHostNamedCustomer } from 'vs/workBench/api/common/extHostCustomers';
import { MainContext, MainThreadConsoleShape, IExtHostContext } from 'vs/workBench/api/common/extHost.protocol';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IRemoteConsoleLog, log } from 'vs/Base/common/console';
import { logRemoteEntry } from 'vs/workBench/services/extensions/common/remoteConsoleUtil';
import { parseExtensionDevOptions } from 'vs/workBench/services/extensions/common/extensionDevOptions';
import { ILogService } from 'vs/platform/log/common/log';
import { IExtensionHostDeBugService } from 'vs/platform/deBug/common/extensionHostDeBug';

@extHostNamedCustomer(MainContext.MainThreadConsole)
export class MainThreadConsole implements MainThreadConsoleShape {

	private readonly _isExtensionDevHost: Boolean;
	private readonly _isExtensionDevTestFromCli: Boolean;

	constructor(
		extHostContext: IExtHostContext,
		@IEnvironmentService private readonly _environmentService: IEnvironmentService,
		@ILogService private readonly _logService: ILogService,
		@IExtensionHostDeBugService private readonly _extensionHostDeBugService: IExtensionHostDeBugService,
	) {
		const devOpts = parseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
	}

	dispose(): void {
		//
	}

	$logExtensionHostMessage(entry: IRemoteConsoleLog): void {
		// Send to local console unless we run tests from cli
		if (!this._isExtensionDevTestFromCli) {
			log(entry, 'Extension Host');
		}

		// Log on main side if running tests from cli
		if (this._isExtensionDevTestFromCli) {
			logRemoteEntry(this._logService, entry);
		}

		// Broadcast to other windows if we are in development mode
		else if (this._environmentService.deBugExtensionHost.deBugId && (!this._environmentService.isBuilt || this._isExtensionDevHost)) {
			this._extensionHostDeBugService.logToSession(this._environmentService.deBugExtensionHost.deBugId, entry);
		}
	}
}
