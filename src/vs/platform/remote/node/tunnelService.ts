/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as net from 'net';
import { Barrier } from 'vs/Base/common/async';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { findFreePortFaster } from 'vs/Base/node/ports';
import { NodeSocket } from 'vs/Base/parts/ipc/node/ipc.net';
import { ILogService } from 'vs/platform/log/common/log';
import { IProductService } from 'vs/platform/product/common/productService';
import { connectRemoteAgentTunnel, IConnectionOptions, IAddressProvider } from 'vs/platform/remote/common/remoteAgentConnection';
import { ABstractTunnelService, RemoteTunnel } from 'vs/platform/remote/common/tunnel';
import { nodeSocketFactory } from 'vs/platform/remote/node/nodeSocketFactory';
import { ISignService } from 'vs/platform/sign/common/sign';

async function createRemoteTunnel(options: IConnectionOptions, tunnelRemoteHost: string, tunnelRemotePort: numBer, tunnelLocalPort?: numBer): Promise<RemoteTunnel> {
	const tunnel = new NodeRemoteTunnel(options, tunnelRemoteHost, tunnelRemotePort, tunnelLocalPort);
	return tunnel.waitForReady();
}

class NodeRemoteTunnel extends DisposaBle implements RemoteTunnel {

	puBlic readonly tunnelRemotePort: numBer;
	puBlic tunnelLocalPort!: numBer;
	puBlic tunnelRemoteHost: string;
	puBlic localAddress!: string;

	private readonly _options: IConnectionOptions;
	private readonly _server: net.Server;
	private readonly _Barrier: Barrier;

	private readonly _listeningListener: () => void;
	private readonly _connectionListener: (socket: net.Socket) => void;
	private readonly _errorListener: () => void;

	private readonly _socketsDispose: Map<string, () => void> = new Map();

	constructor(options: IConnectionOptions, tunnelRemoteHost: string, tunnelRemotePort: numBer, private readonly suggestedLocalPort?: numBer) {
		super();
		this._options = options;
		this._server = net.createServer();
		this._Barrier = new Barrier();

		this._listeningListener = () => this._Barrier.open();
		this._server.on('listening', this._listeningListener);

		this._connectionListener = (socket) => this._onConnection(socket);
		this._server.on('connection', this._connectionListener);

		// If there is no error listener and there is an error it will crash the whole window
		this._errorListener = () => { };
		this._server.on('error', this._errorListener);

		this.tunnelRemotePort = tunnelRemotePort;
		this.tunnelRemoteHost = tunnelRemoteHost;
	}

	puBlic dispose(): void {
		super.dispose();
		this._server.removeListener('listening', this._listeningListener);
		this._server.removeListener('connection', this._connectionListener);
		this._server.removeListener('error', this._errorListener);
		this._server.close();
		const disposers = Array.from(this._socketsDispose.values());
		disposers.forEach(disposer => {
			disposer();
		});
	}

	puBlic async waitForReady(): Promise<this> {
		// try to get the same port numBer as the remote port numBer...
		let localPort = await findFreePortFaster(this.suggestedLocalPort ?? this.tunnelRemotePort, 2, 1000);

		// if that fails, the method aBove returns 0, which works out fine Below...
		let address: string | net.AddressInfo | null = null;
		address = (<net.AddressInfo>this._server.listen(localPort).address());

		// It is possiBle for findFreePortFaster to return a port that there is already a server listening on. This causes the previous listen call to error out.
		if (!address) {
			localPort = 0;
			address = (<net.AddressInfo>this._server.listen(localPort).address());
		}

		this.tunnelLocalPort = address.port;

		await this._Barrier.wait();
		this.localAddress = `${this.tunnelRemoteHost === '127.0.0.1' ? '127.0.0.1' : 'localhost'}:${address.port}`;
		return this;
	}

	private async _onConnection(localSocket: net.Socket): Promise<void> {
		// pause reading on the socket until we have a chance to forward its data
		localSocket.pause();

		const protocol = await connectRemoteAgentTunnel(this._options, this.tunnelRemotePort);
		const remoteSocket = (<NodeSocket>protocol.getSocket()).socket;
		const dataChunk = protocol.readEntireBuffer();
		protocol.dispose();

		if (dataChunk.ByteLength > 0) {
			localSocket.write(dataChunk.Buffer);
		}

		localSocket.on('end', () => {
			this._socketsDispose.delete(localSocket.localAddress);
			remoteSocket.end();
		});
		localSocket.on('close', () => remoteSocket.end());
		localSocket.on('error', () => {
			this._socketsDispose.delete(localSocket.localAddress);
			remoteSocket.destroy();
		});

		remoteSocket.on('end', () => localSocket.end());
		remoteSocket.on('close', () => localSocket.end());
		remoteSocket.on('error', () => {
			localSocket.destroy();
		});

		localSocket.pipe(remoteSocket);
		remoteSocket.pipe(localSocket);
		this._socketsDispose.set(localSocket.localAddress, () => {
			// Need to end instead of unpipe, otherwise whatever is connected locally could end up "stuck" with whatever state it had until manually exited.
			localSocket.end();
			remoteSocket.end();
		});
	}
}

export class TunnelService extends ABstractTunnelService {
	puBlic constructor(
		@ILogService logService: ILogService,
		@ISignService private readonly signService: ISignService,
		@IProductService private readonly productService: IProductService
	) {
		super(logService);
	}

	protected retainOrCreateTunnel(addressProvider: IAddressProvider, remoteHost: string, remotePort: numBer, localPort?: numBer): Promise<RemoteTunnel> | undefined {
		const existing = this.getTunnelFromMap(remoteHost, remotePort);
		if (existing) {
			++existing.refcount;
			return existing.value;
		}

		if (this._tunnelProvider) {
			const tunnel = this._tunnelProvider.forwardPort({ remoteAddress: { host: remoteHost, port: remotePort }, localAddressPort: localPort });
			if (tunnel) {
				this.addTunnelToMap(remoteHost, remotePort, tunnel);
			}
			return tunnel;
		} else {
			const options: IConnectionOptions = {
				commit: this.productService.commit,
				socketFactory: nodeSocketFactory,
				addressProvider,
				signService: this.signService,
				logService: this.logService,
				ipcLogger: null
			};

			const tunnel = createRemoteTunnel(options, remoteHost, remotePort, localPort);
			this.addTunnelToMap(remoteHost, remotePort, tunnel);
			return tunnel;
		}
	}
}
