/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ITunnelService, TunnelOptions, RemoteTunnel } from 'vs/platform/remote/common/tunnel';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

export class TunnelFactoryContriBution extends DisposaBle implements IWorkBenchContriBution {
	constructor(
		@ITunnelService tunnelService: ITunnelService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
	) {
		super();
		const tunnelFactory = environmentService.options?.tunnelProvider?.tunnelFactory;
		if (tunnelFactory) {
			this._register(tunnelService.setTunnelProvider({
				forwardPort: (tunnelOptions: TunnelOptions): Promise<RemoteTunnel> | undefined => {
					const tunnelPromise = tunnelFactory(tunnelOptions);
					if (!tunnelPromise) {
						return undefined;
					}
					return new Promise(resolve => {
						tunnelPromise.then(tunnel => {
							const remoteTunnel: RemoteTunnel = {
								tunnelRemotePort: tunnel.remoteAddress.port,
								tunnelRemoteHost: tunnel.remoteAddress.host,
								localAddress: tunnel.localAddress,
								dispose: tunnel.dispose
							};
							resolve(remoteTunnel);
						});
					});
				}
			}));
		}
	}
}
