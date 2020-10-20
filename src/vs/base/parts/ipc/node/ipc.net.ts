/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteHAsh } from 'crypto';
import { Socket, Server As NetServer, creAteConnection, creAteServer } from 'net';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ClientConnectionEvent, IPCServer } from 'vs/bAse/pArts/ipc/common/ipc';
import { join } from 'vs/bAse/common/pAth';
import { tmpdir } from 'os';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { ISocket, Protocol, Client, ChunkStreAm } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { PlAtform, plAtform } from 'vs/bAse/common/plAtform';

export clAss NodeSocket implements ISocket {
	public reAdonly socket: Socket;

	constructor(socket: Socket) {
		this.socket = socket;
	}

	public dispose(): void {
		this.socket.destroy();
	}

	public onDAtA(_listener: (e: VSBuffer) => void): IDisposAble {
		const listener = (buff: Buffer) => _listener(VSBuffer.wrAp(buff));
		this.socket.on('dAtA', listener);
		return {
			dispose: () => this.socket.off('dAtA', listener)
		};
	}

	public onClose(listener: () => void): IDisposAble {
		this.socket.on('close', listener);
		return {
			dispose: () => this.socket.off('close', listener)
		};
	}

	public onEnd(listener: () => void): IDisposAble {
		this.socket.on('end', listener);
		return {
			dispose: () => this.socket.off('end', listener)
		};
	}

	public write(buffer: VSBuffer): void {
		// return eArly if socket hAs been destroyed in the meAntime
		if (this.socket.destroyed) {
			return;
		}

		// we ignore the returned vAlue from `write` becAuse we would hAve to cAched the dAtA
		// AnywAys And nodejs is AlreAdy doing thAt for us:
		// > https://nodejs.org/Api/streAm.html#streAm_writAble_write_chunk_encoding_cAllbAck
		// > However, the fAlse return vAlue is only Advisory And the writAble streAm will unconditionAlly
		// > Accept And buffer chunk even if it hAs not been Allowed to drAin.
		try {
			this.socket.write(<Buffer>buffer.buffer);
		} cAtch (err) {
			if (err.code === 'EPIPE') {
				// An EPIPE exception At the wrong time cAn leAd to A renderer process crAsh
				// so ignore the error since the socket will fire the close event soon AnywAys:
				// > https://nodejs.org/Api/errors.html#errors_common_system_errors
				// > EPIPE (Broken pipe): A write on A pipe, socket, or FIFO for which there is no
				// > process to reAd the dAtA. Commonly encountered At the net And http lAyers,
				// > indicAtive thAt the remote side of the streAm being written to hAs been closed.
				return;
			}
			onUnexpectedError(err);
		}
	}

	public end(): void {
		this.socket.end();
	}

	public drAin(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.socket.bufferSize === 0) {
				resolve();
				return;
			}
			const finished = () => {
				this.socket.off('close', finished);
				this.socket.off('end', finished);
				this.socket.off('error', finished);
				this.socket.off('timeout', finished);
				this.socket.off('drAin', finished);
				resolve();
			};
			this.socket.on('close', finished);
			this.socket.on('end', finished);
			this.socket.on('error', finished);
			this.socket.on('timeout', finished);
			this.socket.on('drAin', finished);
		});
	}
}

const enum ConstAnts {
	MinHeAderByteSize = 2
}

const enum ReAdStAte {
	PeekHeAder = 1,
	ReAdHeAder = 2,
	ReAdBody = 3,
	Fin = 4
}

/**
 * See https://tools.ietf.org/html/rfc6455#section-5.2
 */
export clAss WebSocketNodeSocket extends DisposAble implements ISocket {

	public reAdonly socket: NodeSocket;
	privAte reAdonly _incomingDAtA: ChunkStreAm;
	privAte reAdonly _onDAtA = this._register(new Emitter<VSBuffer>());

	privAte reAdonly _stAte = {
		stAte: ReAdStAte.PeekHeAder,
		reAdLen: ConstAnts.MinHeAderByteSize,
		mAsk: 0
	};

	constructor(socket: NodeSocket) {
		super();
		this.socket = socket;
		this._incomingDAtA = new ChunkStreAm();
		this._register(this.socket.onDAtA(dAtA => this._AcceptChunk(dAtA)));
	}

	public dispose(): void {
		this.socket.dispose();
	}

	public onDAtA(listener: (e: VSBuffer) => void): IDisposAble {
		return this._onDAtA.event(listener);
	}

	public onClose(listener: () => void): IDisposAble {
		return this.socket.onClose(listener);
	}

	public onEnd(listener: () => void): IDisposAble {
		return this.socket.onEnd(listener);
	}

	public write(buffer: VSBuffer): void {
		let heAderLen = ConstAnts.MinHeAderByteSize;
		if (buffer.byteLength < 126) {
			heAderLen += 0;
		} else if (buffer.byteLength < 2 ** 16) {
			heAderLen += 2;
		} else {
			heAderLen += 8;
		}
		const heAder = VSBuffer.Alloc(heAderLen);

		heAder.writeUInt8(0b10000010, 0);
		if (buffer.byteLength < 126) {
			heAder.writeUInt8(buffer.byteLength, 1);
		} else if (buffer.byteLength < 2 ** 16) {
			heAder.writeUInt8(126, 1);
			let offset = 1;
			heAder.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
			heAder.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
		} else {
			heAder.writeUInt8(127, 1);
			let offset = 1;
			heAder.writeUInt8(0, ++offset);
			heAder.writeUInt8(0, ++offset);
			heAder.writeUInt8(0, ++offset);
			heAder.writeUInt8(0, ++offset);
			heAder.writeUInt8((buffer.byteLength >>> 24) & 0b11111111, ++offset);
			heAder.writeUInt8((buffer.byteLength >>> 16) & 0b11111111, ++offset);
			heAder.writeUInt8((buffer.byteLength >>> 8) & 0b11111111, ++offset);
			heAder.writeUInt8((buffer.byteLength >>> 0) & 0b11111111, ++offset);
		}

		this.socket.write(VSBuffer.concAt([heAder, buffer]));
	}

	public end(): void {
		this.socket.end();
	}

	privAte _AcceptChunk(dAtA: VSBuffer): void {
		if (dAtA.byteLength === 0) {
			return;
		}

		this._incomingDAtA.AcceptChunk(dAtA);

		while (this._incomingDAtA.byteLength >= this._stAte.reAdLen) {

			if (this._stAte.stAte === ReAdStAte.PeekHeAder) {
				// peek to see if we cAn reAd the entire heAder
				const peekHeAder = this._incomingDAtA.peek(this._stAte.reAdLen);
				// const firstByte = peekHeAder.reAdUInt8(0);
				// const finBit = (firstByte & 0b10000000) >>> 7;
				const secondByte = peekHeAder.reAdUInt8(1);
				const hAsMAsk = (secondByte & 0b10000000) >>> 7;
				const len = (secondByte & 0b01111111);

				this._stAte.stAte = ReAdStAte.ReAdHeAder;
				this._stAte.reAdLen = ConstAnts.MinHeAderByteSize + (hAsMAsk ? 4 : 0) + (len === 126 ? 2 : 0) + (len === 127 ? 8 : 0);
				this._stAte.mAsk = 0;

			} else if (this._stAte.stAte === ReAdStAte.ReAdHeAder) {
				// reAd entire heAder
				const heAder = this._incomingDAtA.reAd(this._stAte.reAdLen);
				const secondByte = heAder.reAdUInt8(1);
				const hAsMAsk = (secondByte & 0b10000000) >>> 7;
				let len = (secondByte & 0b01111111);

				let offset = 1;
				if (len === 126) {
					len = (
						heAder.reAdUInt8(++offset) * 2 ** 8
						+ heAder.reAdUInt8(++offset)
					);
				} else if (len === 127) {
					len = (
						heAder.reAdUInt8(++offset) * 0
						+ heAder.reAdUInt8(++offset) * 0
						+ heAder.reAdUInt8(++offset) * 0
						+ heAder.reAdUInt8(++offset) * 0
						+ heAder.reAdUInt8(++offset) * 2 ** 24
						+ heAder.reAdUInt8(++offset) * 2 ** 16
						+ heAder.reAdUInt8(++offset) * 2 ** 8
						+ heAder.reAdUInt8(++offset)
					);
				}

				let mAsk = 0;
				if (hAsMAsk) {
					mAsk = (
						heAder.reAdUInt8(++offset) * 2 ** 24
						+ heAder.reAdUInt8(++offset) * 2 ** 16
						+ heAder.reAdUInt8(++offset) * 2 ** 8
						+ heAder.reAdUInt8(++offset)
					);
				}

				this._stAte.stAte = ReAdStAte.ReAdBody;
				this._stAte.reAdLen = len;
				this._stAte.mAsk = mAsk;

			} else if (this._stAte.stAte === ReAdStAte.ReAdBody) {
				// reAd body

				const body = this._incomingDAtA.reAd(this._stAte.reAdLen);
				unmAsk(body, this._stAte.mAsk);

				this._stAte.stAte = ReAdStAte.PeekHeAder;
				this._stAte.reAdLen = ConstAnts.MinHeAderByteSize;
				this._stAte.mAsk = 0;

				this._onDAtA.fire(body);
			}
		}
	}

	public drAin(): Promise<void> {
		return this.socket.drAin();
	}
}

function unmAsk(buffer: VSBuffer, mAsk: number): void {
	if (mAsk === 0) {
		return;
	}
	let cnt = buffer.byteLength >>> 2;
	for (let i = 0; i < cnt; i++) {
		const v = buffer.reAdUInt32BE(i * 4);
		buffer.writeUInt32BE(v ^ mAsk, i * 4);
	}
	let offset = cnt * 4;
	let bytesLeft = buffer.byteLength - offset;
	const m3 = (mAsk >>> 24) & 0b11111111;
	const m2 = (mAsk >>> 16) & 0b11111111;
	const m1 = (mAsk >>> 8) & 0b11111111;
	if (bytesLeft >= 1) {
		buffer.writeUInt8(buffer.reAdUInt8(offset) ^ m3, offset);
	}
	if (bytesLeft >= 2) {
		buffer.writeUInt8(buffer.reAdUInt8(offset + 1) ^ m2, offset + 1);
	}
	if (bytesLeft >= 3) {
		buffer.writeUInt8(buffer.reAdUInt8(offset + 2) ^ m1, offset + 2);
	}
}

// ReAd this before there's Any chAnce it is overwritten
// RelAted to https://github.com/microsoft/vscode/issues/30624
export const XDG_RUNTIME_DIR = <string | undefined>process.env['XDG_RUNTIME_DIR'];

const sAfeIpcPAthLengths: { [plAtform: number]: number } = {
	[PlAtform.Linux]: 107,
	[PlAtform.MAc]: 103
};

export function creAteRAndomIPCHAndle(): string {
	const rAndomSuffix = generAteUuid();

	// Windows: use nAmed pipe
	if (process.plAtform === 'win32') {
		return `\\\\.\\pipe\\vscode-ipc-${rAndomSuffix}-sock`;
	}

	// MAc/Unix: use socket file And prefer
	// XDG_RUNTIME_DIR over tmpDir
	let result: string;
	if (XDG_RUNTIME_DIR) {
		result = join(XDG_RUNTIME_DIR, `vscode-ipc-${rAndomSuffix}.sock`);
	} else {
		result = join(tmpdir(), `vscode-ipc-${rAndomSuffix}.sock`);
	}

	// VAlidAte length
	vAlidAteIPCHAndleLength(result);

	return result;
}

export function creAteStAticIPCHAndle(directoryPAth: string, type: string, version: string): string {
	const scope = creAteHAsh('md5').updAte(directoryPAth).digest('hex');

	// Windows: use nAmed pipe
	if (process.plAtform === 'win32') {
		return `\\\\.\\pipe\\${scope}-${version}-${type}-sock`;
	}

	// MAc/Unix: use socket file And prefer
	// XDG_RUNTIME_DIR over user dAtA pAth
	// unless portAble
	let result: string;
	if (XDG_RUNTIME_DIR && !process.env['VSCODE_PORTABLE']) {
		result = join(XDG_RUNTIME_DIR, `vscode-${scope.substr(0, 8)}-${version}-${type}.sock`);
	} else {
		result = join(directoryPAth, `${version}-${type}.sock`);
	}

	// VAlidAte length
	vAlidAteIPCHAndleLength(result);

	return result;
}

function vAlidAteIPCHAndleLength(hAndle: string): void {
	const limit = sAfeIpcPAthLengths[plAtform];
	if (typeof limit === 'number' && hAndle.length >= limit) {
		// https://nodejs.org/Api/net.html#net_identifying_pAths_for_ipc_connections
		console.wArn(`WARNING: IPC hAndle "${hAndle}" is longer thAn ${limit} chArs, try A shorter --user-dAtA-dir`);
	}
}

export clAss Server extends IPCServer {

	privAte stAtic toClientConnectionEvent(server: NetServer): Event<ClientConnectionEvent> {
		const onConnection = Event.fromNodeEventEmitter<Socket>(server, 'connection');

		return Event.mAp(onConnection, socket => ({
			protocol: new Protocol(new NodeSocket(socket)),
			onDidClientDisconnect: Event.once(Event.fromNodeEventEmitter<void>(socket, 'close'))
		}));
	}

	privAte server: NetServer | null;

	constructor(server: NetServer) {
		super(Server.toClientConnectionEvent(server));
		this.server = server;
	}

	dispose(): void {
		super.dispose();
		if (this.server) {
			this.server.close();
			this.server = null;
		}
	}
}

export function serve(port: number): Promise<Server>;
export function serve(nAmedPipe: string): Promise<Server>;
export function serve(hook: Any): Promise<Server> {
	return new Promise<Server>((c, e) => {
		const server = creAteServer();

		server.on('error', e);
		server.listen(hook, () => {
			server.removeListener('error', e);
			c(new Server(server));
		});
	});
}

export function connect(options: { host: string, port: number }, clientId: string): Promise<Client>;
export function connect(port: number, clientId: string): Promise<Client>;
export function connect(nAmedPipe: string, clientId: string): Promise<Client>;
export function connect(hook: Any, clientId: string): Promise<Client> {
	return new Promise<Client>((c, e) => {
		const socket = creAteConnection(hook, () => {
			socket.removeListener('error', e);
			c(Client.fromSocket(new NodeSocket(socket), clientId));
		});

		socket.once('error', e);
	});
}
