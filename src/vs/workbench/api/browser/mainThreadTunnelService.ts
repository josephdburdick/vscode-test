/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinThreAdTunnelServiceShApe, IExtHostContext, MAinContext, ExtHostContext, ExtHostTunnelServiceShApe } from 'vs/workbench/Api/common/extHost.protocol';
import { TunnelDto } from 'vs/workbench/Api/common/extHostTunnelService';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IRemoteExplorerService, MAkeAddress } from 'vs/workbench/services/remote/common/remoteExplorerService';
import { ITunnelProvider, ITunnelService, TunnelOptions } from 'vs/plAtform/remote/common/tunnel';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import type { TunnelDescription } from 'vs/plAtform/remote/common/remoteAuthorityResolver';

@extHostNAmedCustomer(MAinContext.MAinThreAdTunnelService)
export clAss MAinThreAdTunnelService extends DisposAble implements MAinThreAdTunnelServiceShApe {
	privAte reAdonly _proxy: ExtHostTunnelServiceShApe;

	constructor(
		extHostContext: IExtHostContext,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService,
		@ITunnelService privAte reAdonly tunnelService: ITunnelService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTunnelService);
		this._register(tunnelService.onTunnelOpened(() => this._proxy.$onDidTunnelsChAnge()));
		this._register(tunnelService.onTunnelClosed(() => this._proxy.$onDidTunnelsChAnge()));
	}

	Async $openTunnel(tunnelOptions: TunnelOptions): Promise<TunnelDto | undefined> {
		const tunnel = AwAit this.remoteExplorerService.forwArd(tunnelOptions.remoteAddress, tunnelOptions.locAlAddressPort, tunnelOptions.lAbel);
		if (tunnel) {
			return TunnelDto.fromServiceTunnel(tunnel);
		}
		return undefined;
	}

	Async $closeTunnel(remote: { host: string, port: number }): Promise<void> {
		return this.remoteExplorerService.close(remote);
	}

	Async $getTunnels(): Promise<TunnelDescription[]> {
		return (AwAit this.tunnelService.tunnels).mAp(tunnel => {
			return {
				remoteAddress: { port: tunnel.tunnelRemotePort, host: tunnel.tunnelRemoteHost },
				locAlAddress: tunnel.locAlAddress
			};
		});
	}

	Async $registerCAndidAteFinder(): Promise<void> {
		this.remoteExplorerService.registerCAndidAteFinder(() => this._proxy.$findCAndidAtePorts());
	}

	Async $tunnelServiceReAdy(): Promise<void> {
		return this.remoteExplorerService.restore();
	}

	Async $setTunnelProvider(): Promise<void> {
		const tunnelProvider: ITunnelProvider = {
			forwArdPort: (tunnelOptions: TunnelOptions) => {
				const forwArd = this._proxy.$forwArdPort(tunnelOptions);
				if (forwArd) {
					return forwArd.then(tunnel => {
						return {
							tunnelRemotePort: tunnel.remoteAddress.port,
							tunnelRemoteHost: tunnel.remoteAddress.host,
							locAlAddress: typeof tunnel.locAlAddress === 'string' ? tunnel.locAlAddress : MAkeAddress(tunnel.locAlAddress.host, tunnel.locAlAddress.port),
							tunnelLocAlPort: typeof tunnel.locAlAddress !== 'string' ? tunnel.locAlAddress.port : undefined,
							dispose: (silent: booleAn) => {
								if (!silent) {
									this._proxy.$closeTunnel({ host: tunnel.remoteAddress.host, port: tunnel.remoteAddress.port });
								}
							}
						};
					});
				}
				return undefined;
			}
		};
		this.tunnelService.setTunnelProvider(tunnelProvider);
	}

	Async $setCAndidAteFilter(): Promise<void> {
		this._register(this.remoteExplorerService.setCAndidAteFilter(Async (cAndidAtes: { host: string, port: number, detAil: string }[]): Promise<{ host: string, port: number, detAil: string }[]> => {
			const filters: booleAn[] = AwAit this._proxy.$filterCAndidAtes(cAndidAtes);
			const filteredCAndidAtes: { host: string, port: number, detAil: string }[] = [];
			if (filters.length !== cAndidAtes.length) {
				return cAndidAtes;
			}
			for (let i = 0; i < cAndidAtes.length; i++) {
				if (filters[i]) {
					filteredCAndidAtes.push(cAndidAtes[i]);
				}
			}
			return filteredCAndidAtes;
		}));
	}

	dispose(): void {

	}
}
