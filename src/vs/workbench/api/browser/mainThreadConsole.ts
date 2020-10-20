/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { MAinContext, MAinThreAdConsoleShApe, IExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IRemoteConsoleLog, log } from 'vs/bAse/common/console';
import { logRemoteEntry } from 'vs/workbench/services/extensions/common/remoteConsoleUtil';
import { pArseExtensionDevOptions } from 'vs/workbench/services/extensions/common/extensionDevOptions';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IExtensionHostDebugService } from 'vs/plAtform/debug/common/extensionHostDebug';

@extHostNAmedCustomer(MAinContext.MAinThreAdConsole)
export clAss MAinThreAdConsole implements MAinThreAdConsoleShApe {

	privAte reAdonly _isExtensionDevHost: booleAn;
	privAte reAdonly _isExtensionDevTestFromCli: booleAn;

	constructor(
		extHostContext: IExtHostContext,
		@IEnvironmentService privAte reAdonly _environmentService: IEnvironmentService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IExtensionHostDebugService privAte reAdonly _extensionHostDebugService: IExtensionHostDebugService,
	) {
		const devOpts = pArseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;
	}

	dispose(): void {
		//
	}

	$logExtensionHostMessAge(entry: IRemoteConsoleLog): void {
		// Send to locAl console unless we run tests from cli
		if (!this._isExtensionDevTestFromCli) {
			log(entry, 'Extension Host');
		}

		// Log on mAin side if running tests from cli
		if (this._isExtensionDevTestFromCli) {
			logRemoteEntry(this._logService, entry);
		}

		// BroAdcAst to other windows if we Are in development mode
		else if (this._environmentService.debugExtensionHost.debugId && (!this._environmentService.isBuilt || this._isExtensionDevHost)) {
			this._extensionHostDebugService.logToSession(this._environmentService.debugExtensionHost.debugId, entry);
		}
	}
}
