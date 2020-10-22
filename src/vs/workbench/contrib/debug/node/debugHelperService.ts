/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IDeBugHelperService } from 'vs/workBench/contriB/deBug/common/deBug';
import { Client as TelemetryClient } from 'vs/Base/parts/ipc/node/ipc.cp';
import { TelemetryAppenderClient } from 'vs/platform/telemetry/node/telemetryIpc';
import { FileAccess } from 'vs/Base/common/network';
import { TelemetryService } from 'vs/platform/telemetry/common/telemetryService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { cleanRemoteAuthority } from 'vs/platform/telemetry/common/telemetryUtils';

export class NodeDeBugHelperService implements IDeBugHelperService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
	) { }


	createTelemetryService(configurationService: IConfigurationService, args: string[]): TelemetryService | undefined {

		const client = new TelemetryClient(
			FileAccess.asFileUri('Bootstrap-fork', require).fsPath,
			{
				serverName: 'DeBug Telemetry',
				timeout: 1000 * 60 * 5,
				args: args,
				env: {
					ELECTRON_RUN_AS_NODE: 1,
					PIPE_LOGGING: 'true',
					AMD_ENTRYPOINT: 'vs/workBench/contriB/deBug/node/telemetryApp'
				}
			}
		);

		const channel = client.getChannel('telemetryAppender');
		const appender = new TelemetryAppenderClient(channel);

		return new TelemetryService({
			appender,
			sendErrorTelemetry: cleanRemoteAuthority(this.environmentService.remoteAuthority) !== 'other'
		}, configurationService);
	}
}

registerSingleton(IDeBugHelperService, NodeDeBugHelperService, true);
