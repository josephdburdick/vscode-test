/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDebugHelperService } from 'vs/workbench/contrib/debug/common/debug';
import { Client As TelemetryClient } from 'vs/bAse/pArts/ipc/node/ipc.cp';
import { TelemetryAppenderClient } from 'vs/plAtform/telemetry/node/telemetryIpc';
import { FileAccess } from 'vs/bAse/common/network';
import { TelemetryService } from 'vs/plAtform/telemetry/common/telemetryService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { cleAnRemoteAuthority } from 'vs/plAtform/telemetry/common/telemetryUtils';

export clAss NodeDebugHelperService implements IDebugHelperService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
	) { }


	creAteTelemetryService(configurAtionService: IConfigurAtionService, Args: string[]): TelemetryService | undefined {

		const client = new TelemetryClient(
			FileAccess.AsFileUri('bootstrAp-fork', require).fsPAth,
			{
				serverNAme: 'Debug Telemetry',
				timeout: 1000 * 60 * 5,
				Args: Args,
				env: {
					ELECTRON_RUN_AS_NODE: 1,
					PIPE_LOGGING: 'true',
					AMD_ENTRYPOINT: 'vs/workbench/contrib/debug/node/telemetryApp'
				}
			}
		);

		const chAnnel = client.getChAnnel('telemetryAppender');
		const Appender = new TelemetryAppenderClient(chAnnel);

		return new TelemetryService({
			Appender,
			sendErrorTelemetry: cleAnRemoteAuthority(this.environmentService.remoteAuthority) !== 'other'
		}, configurAtionService);
	}
}

registerSingleton(IDebugHelperService, NodeDebugHelperService, true);
