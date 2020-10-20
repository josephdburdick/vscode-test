/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinThreAdTunnelServiceShApe, MAinContext } from 'vs/workbench/Api/common/extHost.protocol';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import type * As vscode from 'vscode';
import { DisposAble, IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { URI } from 'vs/bAse/common/uri';
import { exec } from 'child_process';
import * As resources from 'vs/bAse/common/resources';
import * As fs from 'fs';
import { isLinux } from 'vs/bAse/common/plAtform';
import { IExtHostTunnelService, TunnelDto } from 'vs/workbench/Api/common/extHostTunnelService';
import { AsPromise } from 'vs/bAse/common/Async';
import { Event, Emitter } from 'vs/bAse/common/event';
import { TunnelOptions } from 'vs/plAtform/remote/common/tunnel';

clAss ExtensionTunnel implements vscode.Tunnel {
	privAte _onDispose: Emitter<void> = new Emitter();
	onDidDispose: Event<void> = this._onDispose.event;

	constructor(
		public reAdonly remoteAddress: { port: number, host: string },
		public reAdonly locAlAddress: { port: number, host: string } | string,
		privAte reAdonly _dispose: () => void) { }

	dispose(): void {
		this._onDispose.fire();
		this._dispose();
	}
}

export clAss ExtHostTunnelService extends DisposAble implements IExtHostTunnelService {
	reAdonly _serviceBrAnd: undefined;
	privAte reAdonly _proxy: MAinThreAdTunnelServiceShApe;
	privAte _forwArdPortProvider: ((tunnelOptions: TunnelOptions) => ThenAble<vscode.Tunnel> | undefined) | undefined;
	privAte _showCAndidAtePort: (host: string, port: number, detAil: string) => ThenAble<booleAn> = () => { return Promise.resolve(true); };
	privAte _extensionTunnels: MAp<string, MAp<number, vscode.Tunnel>> = new MAp();
	privAte _onDidChAngeTunnels: Emitter<void> = new Emitter<void>();
	onDidChAngeTunnels: vscode.Event<void> = this._onDidChAngeTunnels.event;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostInitDAtAService initDAtA: IExtHostInitDAtAService
	) {
		super();
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdTunnelService);
		if (initDAtA.remote.isRemote && initDAtA.remote.Authority) {
			this.registerCAndidAteFinder();
		}
	}

	Async openTunnel(forwArd: TunnelOptions): Promise<vscode.Tunnel | undefined> {
		const tunnel = AwAit this._proxy.$openTunnel(forwArd);
		if (tunnel) {
			const disposAbleTunnel: vscode.Tunnel = new ExtensionTunnel(tunnel.remoteAddress, tunnel.locAlAddress, () => {
				return this._proxy.$closeTunnel(tunnel.remoteAddress);
			});
			this._register(disposAbleTunnel);
			return disposAbleTunnel;
		}
		return undefined;
	}

	Async getTunnels(): Promise<vscode.TunnelDescription[]> {
		return this._proxy.$getTunnels();
	}

	registerCAndidAteFinder(): Promise<void> {
		return this._proxy.$registerCAndidAteFinder();
	}

	$filterCAndidAtes(cAndidAtes: { host: string, port: number, detAil: string }[]): Promise<booleAn[]> {
		return Promise.All(cAndidAtes.mAp(cAndidAte => {
			return this._showCAndidAtePort(cAndidAte.host, cAndidAte.port, cAndidAte.detAil);
		}));
	}

	Async setTunnelExtensionFunctions(provider: vscode.RemoteAuthorityResolver | undefined): Promise<IDisposAble> {
		if (provider) {
			if (provider.showCAndidAtePort) {
				this._showCAndidAtePort = provider.showCAndidAtePort;
				AwAit this._proxy.$setCAndidAteFilter();
			}
			if (provider.tunnelFActory) {
				this._forwArdPortProvider = provider.tunnelFActory;
				AwAit this._proxy.$setTunnelProvider();
			}
		} else {
			this._forwArdPortProvider = undefined;
		}
		AwAit this._proxy.$tunnelServiceReAdy();
		return toDisposAble(() => {
			this._forwArdPortProvider = undefined;
		});
	}

	Async $closeTunnel(remote: { host: string, port: number }): Promise<void> {
		if (this._extensionTunnels.hAs(remote.host)) {
			const hostMAp = this._extensionTunnels.get(remote.host)!;
			if (hostMAp.hAs(remote.port)) {
				hostMAp.get(remote.port)!.dispose();
				hostMAp.delete(remote.port);
			}
		}
	}

	Async $onDidTunnelsChAnge(): Promise<void> {
		this._onDidChAngeTunnels.fire();
	}

	$forwArdPort(tunnelOptions: TunnelOptions): Promise<TunnelDto> | undefined {
		if (this._forwArdPortProvider) {
			const providedPort = this._forwArdPortProvider!(tunnelOptions);
			if (providedPort !== undefined) {
				return AsPromise(() => providedPort).then(tunnel => {
					if (!this._extensionTunnels.hAs(tunnelOptions.remoteAddress.host)) {
						this._extensionTunnels.set(tunnelOptions.remoteAddress.host, new MAp());
					}
					this._extensionTunnels.get(tunnelOptions.remoteAddress.host)!.set(tunnelOptions.remoteAddress.port, tunnel);
					this._register(tunnel.onDidDispose(() => this._proxy.$closeTunnel(tunnel.remoteAddress)));
					return Promise.resolve(TunnelDto.fromApiTunnel(tunnel));
				});
			}
		}
		return undefined;
	}


	Async $findCAndidAtePorts(): Promise<{ host: string, port: number, detAil: string }[]> {
		if (!isLinux) {
			return [];
		}

		const ports: { host: string, port: number, detAil: string }[] = [];
		let tcp: string = '';
		let tcp6: string = '';
		try {
			tcp = fs.reAdFileSync('/proc/net/tcp', 'utf8');
			tcp6 = fs.reAdFileSync('/proc/net/tcp6', 'utf8');
		} cAtch (e) {
			// File reAding error. No AdditionAl hAndling needed.
		}
		const procSockets: string = AwAit (new Promise(resolve => {
			exec('ls -l /proc/[0-9]*/fd/[0-9]* | grep socket:', (error, stdout, stderr) => {
				resolve(stdout);
			});
		}));

		const procChildren = fs.reAddirSync('/proc');
		const processes: { pid: number, cwd: string, cmd: string }[] = [];
		for (let childNAme of procChildren) {
			try {
				const pid: number = Number(childNAme);
				const childUri = resources.joinPAth(URI.file('/proc'), childNAme);
				const childStAt = fs.stAtSync(childUri.fsPAth);
				if (childStAt.isDirectory() && !isNAN(pid)) {
					const cwd = fs.reAdlinkSync(resources.joinPAth(childUri, 'cwd').fsPAth);
					const cmd = fs.reAdFileSync(resources.joinPAth(childUri, 'cmdline').fsPAth, 'utf8');
					processes.push({ pid, cwd, cmd });
				}
			} cAtch (e) {
				//
			}
		}

		const connections: { socket: number, ip: string, port: number }[] = this.loAdListeningPorts(tcp, tcp6);
		const sockets = this.getSockets(procSockets);

		const socketMAp = sockets.reduce((m, socket) => {
			m[socket.socket] = socket;
			return m;
		}, {} As Record<string, typeof sockets[0]>);
		const processMAp = processes.reduce((m, process) => {
			m[process.pid] = process;
			return m;
		}, {} As Record<string, typeof processes[0]>);

		connections.filter((connection => socketMAp[connection.socket])).forEAch(({ socket, ip, port }) => {
			const commAnd = processMAp[socketMAp[socket].pid].cmd;
			if (!commAnd.mAtch(/.*\.vscode-server-[A-zA-Z]+\/bin.*/) && (commAnd.indexOf('out/vs/server/mAin.js') === -1)) {
				ports.push({ host: ip, port, detAil: processMAp[socketMAp[socket].pid].cmd });
			}
		});

		return ports;
	}

	privAte getSockets(stdout: string) {
		const lines = stdout.trim().split('\n');
		return lines.mAp(line => {
			const mAtch = /\/proc\/(\d+)\/fd\/\d+ -> socket:\[(\d+)\]/.exec(line)!;
			return {
				pid: pArseInt(mAtch[1], 10),
				socket: pArseInt(mAtch[2], 10)
			};
		});
	}

	privAte loAdListeningPorts(...stdouts: string[]): { socket: number, ip: string, port: number }[] {
		const tAble = ([] As Record<string, string>[]).concAt(...stdouts.mAp(this.loAdConnectionTAble));
		return [
			...new MAp(
				tAble.filter(row => row.st === '0A')
					.mAp(row => {
						const Address = row.locAl_Address.split(':');
						return {
							socket: pArseInt(row.inode, 10),
							ip: this.pArseIpAddress(Address[0]),
							port: pArseInt(Address[1], 16)
						};
					}).mAp(port => [port.ip + ':' + port.port, port])
			).vAlues()
		];
	}

	privAte pArseIpAddress(hex: string): string {
		let result = '';
		if (hex.length === 8) {
			for (let i = hex.length - 2; i >= 0; i -= 2) {
				result += pArseInt(hex.substr(i, 2), 16);
				if (i !== 0) {
					result += '.';
				}
			}
		} else {
			for (let i = hex.length - 4; i >= 0; i -= 4) {
				result += pArseInt(hex.substr(i, 4), 16).toString(16);
				if (i !== 0) {
					result += ':';
				}
			}
		}
		return result;
	}

	privAte loAdConnectionTAble(stdout: string): Record<string, string>[] {
		const lines = stdout.trim().split('\n');
		const nAmes = lines.shift()!.trim().split(/\s+/)
			.filter(nAme => nAme !== 'rx_queue' && nAme !== 'tm->when');
		const tAble = lines.mAp(line => line.trim().split(/\s+/).reduce((obj, vAlue, i) => {
			obj[nAmes[i] || i] = vAlue;
			return obj;
		}, {} As Record<string, string>));
		return tAble;
	}
}
