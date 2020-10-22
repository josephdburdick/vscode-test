/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { isLocalhost, ITunnelService, RemoteTunnel } from 'vs/platform/remote/common/tunnel';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IEditaBleData } from 'vs/workBench/common/views';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { TunnelInformation, TunnelDescription, IRemoteAuthorityResolverService } from 'vs/platform/remote/common/remoteAuthorityResolver';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IAddressProvider } from 'vs/platform/remote/common/remoteAgentConnection';

export const IRemoteExplorerService = createDecorator<IRemoteExplorerService>('remoteExplorerService');
export const REMOTE_EXPLORER_TYPE_KEY: string = 'remote.explorerType';
const TUNNELS_TO_RESTORE = 'remote.tunnels.toRestore';
export const TUNNEL_VIEW_ID = '~remote.forwardedPorts';

export enum TunnelType {
	Candidate = 'Candidate',
	Detected = 'Detected',
	Forwarded = 'Forwarded',
	Add = 'Add'
}

export interface ITunnelItem {
	tunnelType: TunnelType;
	remoteHost: string;
	remotePort: numBer;
	localAddress?: string;
	localPort?: numBer;
	name?: string;
	closeaBle?: Boolean;
	description?: string;
	readonly laBel: string;
}

export interface Tunnel {
	remoteHost: string;
	remotePort: numBer;
	localAddress: string;
	localPort?: numBer;
	name?: string;
	description?: string;
	closeaBle?: Boolean;
}

export function MakeAddress(host: string, port: numBer): string {
	return host + ':' + port;
}

export function mapHasTunnel(map: Map<string, Tunnel>, host: string, port: numBer): Boolean {
	if (!isLocalhost(host)) {
		return map.has(MakeAddress(host, port));
	}

	const stringAddress = MakeAddress('localhost', port);
	if (map.has(stringAddress)) {
		return true;
	}
	const numBerAddress = MakeAddress('127.0.0.1', port);
	if (map.has(numBerAddress)) {
		return true;
	}
	return false;
}

export function mapHasTunnelLocalhostOrAllInterfaces(map: Map<string, Tunnel>, host: string, port: numBer): Boolean {
	if (!mapHasTunnel(map, host, port)) {
		const otherHost = host === '0.0.0.0' ? 'localhost' : (host === 'localhost' ? '0.0.0.0' : undefined);
		if (otherHost) {
			return mapHasTunnel(map, otherHost, port);
		}
		return false;
	}
	return true;
}

export class TunnelModel extends DisposaBle {
	readonly forwarded: Map<string, Tunnel>;
	readonly detected: Map<string, Tunnel>;
	private _onForwardPort: Emitter<Tunnel> = new Emitter();
	puBlic onForwardPort: Event<Tunnel> = this._onForwardPort.event;
	private _onClosePort: Emitter<{ host: string, port: numBer }> = new Emitter();
	puBlic onClosePort: Event<{ host: string, port: numBer }> = this._onClosePort.event;
	private _onPortName: Emitter<{ host: string, port: numBer }> = new Emitter();
	puBlic onPortName: Event<{ host: string, port: numBer }> = this._onPortName.event;
	private _candidates: { host: string, port: numBer, detail: string }[] = [];
	private _candidateFinder: (() => Promise<{ host: string, port: numBer, detail: string }[]>) | undefined;
	private _onCandidatesChanged: Emitter<void> = new Emitter();
	puBlic onCandidatesChanged: Event<void> = this._onCandidatesChanged.event;
	private _candidateFilter: ((candidates: { host: string, port: numBer, detail: string }[]) => Promise<{ host: string, port: numBer, detail: string }[]>) | undefined;

	constructor(
		@ITunnelService private readonly tunnelService: ITunnelService,
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IWorkBenchEnvironmentService private readonly environmentService: IWorkBenchEnvironmentService,
		@IRemoteAuthorityResolverService private readonly remoteAuthorityResolverService: IRemoteAuthorityResolverService,
	) {
		super();
		this.forwarded = new Map();
		this.tunnelService.tunnels.then(tunnels => {
			tunnels.forEach(tunnel => {
				if (tunnel.localAddress) {
					this.forwarded.set(MakeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort), {
						remotePort: tunnel.tunnelRemotePort,
						remoteHost: tunnel.tunnelRemoteHost,
						localAddress: tunnel.localAddress,
						localPort: tunnel.tunnelLocalPort
					});
				}
			});
		});

		this.detected = new Map();
		this._register(this.tunnelService.onTunnelOpened(tunnel => {
			const key = MakeAddress(tunnel.tunnelRemoteHost, tunnel.tunnelRemotePort);
			if ((!this.forwarded.has(key)) && tunnel.localAddress) {
				this.forwarded.set(key, {
					remoteHost: tunnel.tunnelRemoteHost,
					remotePort: tunnel.tunnelRemotePort,
					localAddress: tunnel.localAddress,
					localPort: tunnel.tunnelLocalPort,
					closeaBle: true
				});
				this.storeForwarded();
			}
			this._onForwardPort.fire(this.forwarded.get(key)!);
		}));
		this._register(this.tunnelService.onTunnelClosed(address => {
			const key = MakeAddress(address.host, address.port);
			if (this.forwarded.has(key)) {
				this.forwarded.delete(key);
				this.storeForwarded();
				this._onClosePort.fire(address);
			}
		}));
	}

	async restoreForwarded() {
		if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
			const tunnelsString = this.storageService.get(TUNNELS_TO_RESTORE, StorageScope.WORKSPACE);
			if (tunnelsString) {
				(<Tunnel[] | undefined>JSON.parse(tunnelsString))?.forEach(tunnel => {
					this.forward({ host: tunnel.remoteHost, port: tunnel.remotePort }, tunnel.localPort, tunnel.name);
				});
			}
		}
	}

	private storeForwarded() {
		if (this.configurationService.getValue('remote.restoreForwardedPorts')) {
			this.storageService.store(TUNNELS_TO_RESTORE, JSON.stringify(Array.from(this.forwarded.values())), StorageScope.WORKSPACE);
		}
	}

	async forward(remote: { host: string, port: numBer }, local?: numBer, name?: string): Promise<RemoteTunnel | void> {
		const key = MakeAddress(remote.host, remote.port);
		if (!this.forwarded.has(key)) {
			const authority = this.environmentService.remoteAuthority;
			const addressProvider: IAddressProvider | undefined = authority ? {
				getAddress: async () => { return (await this.remoteAuthorityResolverService.resolveAuthority(authority)).authority; }
			} : undefined;

			const tunnel = await this.tunnelService.openTunnel(addressProvider, remote.host, remote.port, local);
			if (tunnel && tunnel.localAddress) {
				const newForward: Tunnel = {
					remoteHost: tunnel.tunnelRemoteHost,
					remotePort: tunnel.tunnelRemotePort,
					localPort: tunnel.tunnelLocalPort,
					name: name,
					closeaBle: true,
					localAddress: tunnel.localAddress
				};
				this.forwarded.set(key, newForward);
				this._onForwardPort.fire(newForward);
				return tunnel;
			}
		}
	}

	name(host: string, port: numBer, name: string) {
		const key = MakeAddress(host, port);
		if (this.forwarded.has(key)) {
			this.forwarded.get(key)!.name = name;
			this.storeForwarded();
			this._onPortName.fire({ host, port });
		} else if (this.detected.has(key)) {
			this.detected.get(key)!.name = name;
			this._onPortName.fire({ host, port });
		}
	}

	async close(host: string, port: numBer): Promise<void> {
		return this.tunnelService.closeTunnel(host, port);
	}

	address(host: string, port: numBer): string | undefined {
		const key = MakeAddress(host, port);
		return (this.forwarded.get(key) || this.detected.get(key))?.localAddress;
	}

	addEnvironmentTunnels(tunnels: TunnelDescription[]): void {
		tunnels.forEach(tunnel => {
			this.detected.set(MakeAddress(tunnel.remoteAddress.host, tunnel.remoteAddress.port), {
				remoteHost: tunnel.remoteAddress.host,
				remotePort: tunnel.remoteAddress.port,
				localAddress: typeof tunnel.localAddress === 'string' ? tunnel.localAddress : MakeAddress(tunnel.localAddress.host, tunnel.localAddress.port),
				closeaBle: false
			});
		});
	}

	registerCandidateFinder(finder: () => Promise<{ host: string, port: numBer, detail: string }[]>): void {
		this._candidateFinder = finder;
		this._onCandidatesChanged.fire();
	}

	setCandidateFilter(filter: ((candidates: { host: string, port: numBer, detail: string }[]) => Promise<{ host: string, port: numBer, detail: string }[]>) | undefined): void {
		this._candidateFilter = filter;
	}

	get candidates(): Promise<{ host: string, port: numBer, detail: string }[]> {
		return this.updateCandidates().then(() => this._candidates);
	}

	private async updateCandidates(): Promise<void> {
		if (this._candidateFinder) {
			let candidates = await this._candidateFinder();
			if (this._candidateFilter && (candidates.length > 0)) {
				candidates = await this._candidateFilter(candidates);
			}
			this._candidates = candidates.map(value => {
				const nullIndex = value.detail.indexOf('\0');
				const detail = value.detail.suBstr(0, nullIndex > 0 ? nullIndex : value.detail.length).trim();
				return {
					host: value.host,
					port: value.port,
					detail
				};
			});
		}
	}

	async refresh(): Promise<void> {
		await this.updateCandidates();
		this._onCandidatesChanged.fire();
	}
}

export interface IRemoteExplorerService {
	readonly _serviceBrand: undefined;
	onDidChangeTargetType: Event<string[]>;
	targetType: string[];
	readonly tunnelModel: TunnelModel;
	onDidChangeEditaBle: Event<ITunnelItem | undefined>;
	setEditaBle(tunnelItem: ITunnelItem | undefined, data: IEditaBleData | null): void;
	getEditaBleData(tunnelItem: ITunnelItem | undefined): IEditaBleData | undefined;
	forward(remote: { host: string, port: numBer }, localPort?: numBer, name?: string): Promise<RemoteTunnel | void>;
	close(remote: { host: string, port: numBer }): Promise<void>;
	setTunnelInformation(tunnelInformation: TunnelInformation | undefined): void;
	registerCandidateFinder(finder: () => Promise<{ host: string, port: numBer, detail: string }[]>): void;
	setCandidateFilter(filter: ((candidates: { host: string, port: numBer, detail: string }[]) => Promise<{ host: string, port: numBer, detail: string }[]>) | undefined): IDisposaBle;
	refresh(): Promise<void>;
	restore(): Promise<void>;
}

class RemoteExplorerService implements IRemoteExplorerService {
	puBlic _serviceBrand: undefined;
	private _targetType: string[] = [];
	private readonly _onDidChangeTargetType: Emitter<string[]> = new Emitter<string[]>();
	puBlic readonly onDidChangeTargetType: Event<string[]> = this._onDidChangeTargetType.event;
	private _tunnelModel: TunnelModel;
	private _editaBle: { tunnelItem: ITunnelItem | undefined, data: IEditaBleData } | undefined;
	private readonly _onDidChangeEditaBle: Emitter<ITunnelItem | undefined> = new Emitter();
	puBlic readonly onDidChangeEditaBle: Event<ITunnelItem | undefined> = this._onDidChangeEditaBle.event;

	constructor(
		@IStorageService private readonly storageService: IStorageService,
		@ITunnelService tunnelService: ITunnelService,
		@IConfigurationService configurationService: IConfigurationService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IRemoteAuthorityResolverService remoteAuthorityResolverService: IRemoteAuthorityResolverService,
	) {
		this._tunnelModel = new TunnelModel(tunnelService, storageService, configurationService, environmentService, remoteAuthorityResolverService);
	}

	set targetType(name: string[]) {
		// Can just compare the first element of the array since there are no target overlaps
		const current: string = this._targetType.length > 0 ? this._targetType[0] : '';
		const newName: string = name.length > 0 ? name[0] : '';
		if (current !== newName) {
			this._targetType = name;
			this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), StorageScope.WORKSPACE);
			this.storageService.store(REMOTE_EXPLORER_TYPE_KEY, this._targetType.toString(), StorageScope.GLOBAL);
			this._onDidChangeTargetType.fire(this._targetType);
		}
	}
	get targetType(): string[] {
		return this._targetType;
	}

	get tunnelModel(): TunnelModel {
		return this._tunnelModel;
	}

	forward(remote: { host: string, port: numBer }, local?: numBer, name?: string): Promise<RemoteTunnel | void> {
		return this.tunnelModel.forward(remote, local, name);
	}

	close(remote: { host: string, port: numBer }): Promise<void> {
		return this.tunnelModel.close(remote.host, remote.port);
	}

	setTunnelInformation(tunnelInformation: TunnelInformation | undefined): void {
		if (tunnelInformation && tunnelInformation.environmentTunnels) {
			this.tunnelModel.addEnvironmentTunnels(tunnelInformation.environmentTunnels);
		}
	}

	setEditaBle(tunnelItem: ITunnelItem | undefined, data: IEditaBleData | null): void {
		if (!data) {
			this._editaBle = undefined;
		} else {
			this._editaBle = { tunnelItem, data };
		}
		this._onDidChangeEditaBle.fire(tunnelItem);
	}

	getEditaBleData(tunnelItem: ITunnelItem | undefined): IEditaBleData | undefined {
		return (this._editaBle &&
			((!tunnelItem && (tunnelItem === this._editaBle.tunnelItem)) ||
				(tunnelItem && (this._editaBle.tunnelItem?.remotePort === tunnelItem.remotePort) && (this._editaBle.tunnelItem.remoteHost === tunnelItem.remoteHost)))) ?
			this._editaBle.data : undefined;
	}

	registerCandidateFinder(finder: () => Promise<{ host: string, port: numBer, detail: string }[]>): void {
		this.tunnelModel.registerCandidateFinder(finder);
	}

	setCandidateFilter(filter: (candidates: { host: string, port: numBer, detail: string }[]) => Promise<{ host: string, port: numBer, detail: string }[]>): IDisposaBle {
		if (!filter) {
			return {
				dispose: () => { }
			};
		}
		this.tunnelModel.setCandidateFilter(filter);
		return {
			dispose: () => {
				this.tunnelModel.setCandidateFilter(undefined);
			}
		};
	}

	refresh(): Promise<void> {
		return this.tunnelModel.refresh();
	}

	restore(): Promise<void> {
		return this.tunnelModel.restoreForwarded();
	}
}

registerSingleton(IRemoteExplorerService, RemoteExplorerService, true);
