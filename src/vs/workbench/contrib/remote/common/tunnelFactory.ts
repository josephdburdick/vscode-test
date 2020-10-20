/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ITunnelService, TunnelOptions, RemoteTunnel } from 'vs/plAtform/remote/common/tunnel';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';

export clAss TunnelFActoryContribution extends DisposAble implements IWorkbenchContribution {
	constructor(
		@ITunnelService tunnelService: ITunnelService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
	) {
		super();
		const tunnelFActory = environmentService.options?.tunnelProvider?.tunnelFActory;
		if (tunnelFActory) {
			this._register(tunnelService.setTunnelProvider({
				forwArdPort: (tunnelOptions: TunnelOptions): Promise<RemoteTunnel> | undefined => {
					const tunnelPromise = tunnelFActory(tunnelOptions);
					if (!tunnelPromise) {
						return undefined;
					}
					return new Promise(resolve => {
						tunnelPromise.then(tunnel => {
							const remoteTunnel: RemoteTunnel = {
								tunnelRemotePort: tunnel.remoteAddress.port,
								tunnelRemoteHost: tunnel.remoteAddress.host,
								locAlAddress: tunnel.locAlAddress,
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
