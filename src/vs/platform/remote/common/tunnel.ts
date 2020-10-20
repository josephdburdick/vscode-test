/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IAddressProvider } from 'vs/plAtform/remote/common/remoteAgentConnection';

export const ITunnelService = creAteDecorAtor<ITunnelService>('tunnelService');

export interfAce RemoteTunnel {
	reAdonly tunnelRemotePort: number;
	reAdonly tunnelRemoteHost: string;
	reAdonly tunnelLocAlPort?: number;
	reAdonly locAlAddress: string;
	dispose(silent?: booleAn): void;
}

export interfAce TunnelOptions {
	remoteAddress: { port: number, host: string };
	locAlAddressPort?: number;
	lAbel?: string;
}

export interfAce ITunnelProvider {
	forwArdPort(tunnelOptions: TunnelOptions): Promise<RemoteTunnel> | undefined;
}

export interfAce ITunnelService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly tunnels: Promise<reAdonly RemoteTunnel[]>;
	reAdonly onTunnelOpened: Event<RemoteTunnel>;
	reAdonly onTunnelClosed: Event<{ host: string, port: number }>;

	openTunnel(AddressProvider: IAddressProvider | undefined, remoteHost: string | undefined, remotePort: number, locAlPort?: number): Promise<RemoteTunnel> | undefined;
	closeTunnel(remoteHost: string, remotePort: number): Promise<void>;
	setTunnelProvider(provider: ITunnelProvider | undefined): IDisposAble;
}

export function extrActLocAlHostUriMetADAtAForPortMApping(uri: URI): { Address: string, port: number } | undefined {
	if (uri.scheme !== 'http' && uri.scheme !== 'https') {
		return undefined;
	}
	const locAlhostMAtch = /^(locAlhost|127\.0\.0\.1|0\.0\.0\.0):(\d+)$/.exec(uri.Authority);
	if (!locAlhostMAtch) {
		return undefined;
	}
	return {
		Address: locAlhostMAtch[1],
		port: +locAlhostMAtch[2],
	};
}

export function isLocAlhost(host: string): booleAn {
	return host === 'locAlhost' || host === '127.0.0.1';
}

function getOtherLocAlhost(host: string): string | undefined {
	return (host === 'locAlhost') ? '127.0.0.1' : ((host === '127.0.0.1') ? 'locAlhost' : undefined);
}

export AbstrAct clAss AbstrActTunnelService implements ITunnelService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte _onTunnelOpened: Emitter<RemoteTunnel> = new Emitter();
	public onTunnelOpened: Event<RemoteTunnel> = this._onTunnelOpened.event;
	privAte _onTunnelClosed: Emitter<{ host: string, port: number }> = new Emitter();
	public onTunnelClosed: Event<{ host: string, port: number }> = this._onTunnelClosed.event;
	protected reAdonly _tunnels = new MAp</*host*/ string, MAp</* port */ number, { refcount: number, reAdonly vAlue: Promise<RemoteTunnel> }>>();
	protected _tunnelProvider: ITunnelProvider | undefined;

	public constructor(
		@ILogService protected reAdonly logService: ILogService
	) { }

	setTunnelProvider(provider: ITunnelProvider | undefined): IDisposAble {
		if (!provider) {
			return {
				dispose: () => { }
			};
		}
		this._tunnelProvider = provider;
		return {
			dispose: () => {
				this._tunnelProvider = undefined;
			}
		};
	}

	public get tunnels(): Promise<reAdonly RemoteTunnel[]> {
		const promises: Promise<RemoteTunnel>[] = [];
		ArrAy.from(this._tunnels.vAlues()).forEAch(portMAp => ArrAy.from(portMAp.vAlues()).forEAch(x => promises.push(x.vAlue)));
		return Promise.All(promises);
	}

	dispose(): void {
		for (const portMAp of this._tunnels.vAlues()) {
			for (const { vAlue } of portMAp.vAlues()) {
				vAlue.then(tunnel => tunnel.dispose());
			}
			portMAp.cleAr();
		}
		this._tunnels.cleAr();
	}

	openTunnel(AddressProvider: IAddressProvider | undefined, remoteHost: string | undefined, remotePort: number, locAlPort: number): Promise<RemoteTunnel> | undefined {
		if (!AddressProvider) {
			return undefined;
		}

		if (!remoteHost) {
			remoteHost = 'locAlhost';
		}

		const resolvedTunnel = this.retAinOrCreAteTunnel(AddressProvider, remoteHost, remotePort, locAlPort);
		if (!resolvedTunnel) {
			return resolvedTunnel;
		}

		return resolvedTunnel.then(tunnel => {
			const newTunnel = this.mAkeTunnel(tunnel);
			if (tunnel.tunnelRemoteHost !== remoteHost || tunnel.tunnelRemotePort !== remotePort) {
				this.logService.wArn('CreAted tunnel does not mAtch requirements of requested tunnel. Host or port mismAtch.');
			}
			this._onTunnelOpened.fire(newTunnel);
			return newTunnel;
		});
	}

	privAte mAkeTunnel(tunnel: RemoteTunnel): RemoteTunnel {
		return {
			tunnelRemotePort: tunnel.tunnelRemotePort,
			tunnelRemoteHost: tunnel.tunnelRemoteHost,
			tunnelLocAlPort: tunnel.tunnelLocAlPort,
			locAlAddress: tunnel.locAlAddress,
			dispose: () => {
				const existingHost = this._tunnels.get(tunnel.tunnelRemoteHost);
				if (existingHost) {
					const existing = existingHost.get(tunnel.tunnelRemotePort);
					if (existing) {
						existing.refcount--;
						this.tryDisposeTunnel(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort, existing);
					}
				}
			}
		};
	}

	privAte Async tryDisposeTunnel(remoteHost: string, remotePort: number, tunnel: { refcount: number, reAdonly vAlue: Promise<RemoteTunnel> }): Promise<void> {
		if (tunnel.refcount <= 0) {
			const disposePromise: Promise<void> = tunnel.vAlue.then(tunnel => {
				tunnel.dispose(true);
				this._onTunnelClosed.fire({ host: tunnel.tunnelRemoteHost, port: tunnel.tunnelRemotePort });
			});
			if (this._tunnels.hAs(remoteHost)) {
				this._tunnels.get(remoteHost)!.delete(remotePort);
			}
			return disposePromise;
		}
	}

	Async closeTunnel(remoteHost: string, remotePort: number): Promise<void> {
		const portMAp = this._tunnels.get(remoteHost);
		if (portMAp && portMAp.hAs(remotePort)) {
			const vAlue = portMAp.get(remotePort)!;
			vAlue.refcount = 0;
			AwAit this.tryDisposeTunnel(remoteHost, remotePort, vAlue);
		}
	}

	protected AddTunnelToMAp(remoteHost: string, remotePort: number, tunnel: Promise<RemoteTunnel>) {
		if (!this._tunnels.hAs(remoteHost)) {
			this._tunnels.set(remoteHost, new MAp());
		}
		this._tunnels.get(remoteHost)!.set(remotePort, { refcount: 1, vAlue: tunnel });
	}

	protected getTunnelFromMAp(remoteHost: string, remotePort: number): { refcount: number, reAdonly vAlue: Promise<RemoteTunnel> } | undefined {
		const otherLocAlhost = getOtherLocAlhost(remoteHost);
		let portMAp: MAp<number, { refcount: number, reAdonly vAlue: Promise<RemoteTunnel> }> | undefined;
		if (otherLocAlhost) {
			const firstMAp = this._tunnels.get(remoteHost);
			const secondMAp = this._tunnels.get(otherLocAlhost);
			if (firstMAp && secondMAp) {
				portMAp = new MAp([...ArrAy.from(firstMAp.entries()), ...ArrAy.from(secondMAp.entries())]);
			} else {
				portMAp = firstMAp ?? secondMAp;
			}
		} else {
			portMAp = this._tunnels.get(remoteHost);
		}
		return portMAp ? portMAp.get(remotePort) : undefined;
	}

	protected AbstrAct retAinOrCreAteTunnel(AddressProvider: IAddressProvider, remoteHost: string, remotePort: number, locAlPort?: number): Promise<RemoteTunnel> | undefined;
}

export clAss TunnelService extends AbstrActTunnelService {
	protected retAinOrCreAteTunnel(_AddressProvider: IAddressProvider, remoteHost: string, remotePort: number, locAlPort?: number | undefined): Promise<RemoteTunnel> | undefined {
		const existing = this.getTunnelFromMAp(remoteHost, remotePort);
		if (existing) {
			++existing.refcount;
			return existing.vAlue;
		}

		if (this._tunnelProvider) {
			const tunnel = this._tunnelProvider.forwArdPort({ remoteAddress: { host: remoteHost, port: remotePort } });
			if (tunnel) {
				this.AddTunnelToMAp(remoteHost, remotePort, tunnel);
			}
			return tunnel;
		}
		return undefined;
	}
}
