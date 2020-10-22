/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createHash } from 'crypto';
import { Socket, Server as NetServer, createConnection, createServer } from 'net';
import { Event, Emitter } from 'vs/Base/common/event';
import { ClientConnectionEvent, IPCServer } from 'vs/Base/parts/ipc/common/ipc';
import { join } from 'vs/Base/common/path';
import { tmpdir } from 'os';
import { generateUuid } from 'vs/Base/common/uuid';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { ISocket, Protocol, Client, ChunkStream } from 'vs/Base/parts/ipc/common/ipc.net';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Platform, platform } from 'vs/Base/common/platform';

export class NodeSocket implements ISocket {
	puBlic readonly socket: Socket;

	constructor(socket: Socket) {
		this.socket = socket;
	}

	puBlic dispose(): void {
		this.socket.destroy();
	}

	puBlic onData(_listener: (e: VSBuffer) => void): IDisposaBle {
		const listener = (Buff: Buffer) => _listener(VSBuffer.wrap(Buff));
		this.socket.on('data', listener);
		return {
			dispose: () => this.socket.off('data', listener)
		};
	}

	puBlic onClose(listener: () => void): IDisposaBle {
		this.socket.on('close', listener);
		return {
			dispose: () => this.socket.off('close', listener)
		};
	}

	puBlic onEnd(listener: () => void): IDisposaBle {
		this.socket.on('end', listener);
		return {
			dispose: () => this.socket.off('end', listener)
		};
	}

	puBlic write(Buffer: VSBuffer): void {
		// return early if socket has Been destroyed in the meantime
		if (this.socket.destroyed) {
			return;
		}

		// we ignore the returned value from `write` Because we would have to cached the data
		// anyways and nodejs is already doing that for us:
		// > https://nodejs.org/api/stream.html#stream_writaBle_write_chunk_encoding_callBack
		// > However, the false return value is only advisory and the writaBle stream will unconditionally
		// > accept and Buffer chunk even if it has not Been allowed to drain.
		try {
			this.socket.write(<Buffer>Buffer.Buffer);
		} catch (err) {
			if (err.code === 'EPIPE') {
				// An EPIPE exception at the wrong time can lead to a renderer process crash
				// so ignore the error since the socket will fire the close event soon anyways:
				// > https://nodejs.org/api/errors.html#errors_common_system_errors
				// > EPIPE (Broken pipe): A write on a pipe, socket, or FIFO for which there is no
				// > process to read the data. Commonly encountered at the net and http layers,
				// > indicative that the remote side of the stream Being written to has Been closed.
				return;
			}
			onUnexpectedError(err);
		}
	}

	puBlic end(): void {
		this.socket.end();
	}

	puBlic drain(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.socket.BufferSize === 0) {
				resolve();
				return;
			}
			const finished = () => {
				this.socket.off('close', finished);
				this.socket.off('end', finished);
				this.socket.off('error', finished);
				this.socket.off('timeout', finished);
				this.socket.off('drain', finished);
				resolve();
			};
			this.socket.on('close', finished);
			this.socket.on('end', finished);
			this.socket.on('error', finished);
			this.socket.on('timeout', finished);
			this.socket.on('drain', finished);
		});
	}
}

const enum Constants {
	MinHeaderByteSize = 2
}

const enum ReadState {
	PeekHeader = 1,
	ReadHeader = 2,
	ReadBody = 3,
	Fin = 4
}

/**
 * See https://tools.ietf.org/html/rfc6455#section-5.2
 */
export class WeBSocketNodeSocket extends DisposaBle implements ISocket {

	puBlic readonly socket: NodeSocket;
	private readonly _incomingData: ChunkStream;
	private readonly _onData = this._register(new Emitter<VSBuffer>());

	private readonly _state = {
		state: ReadState.PeekHeader,
		readLen: Constants.MinHeaderByteSize,
		mask: 0
	};

	constructor(socket: NodeSocket) {
		super();
		this.socket = socket;
		this._incomingData = new ChunkStream();
		this._register(this.socket.onData(data => this._acceptChunk(data)));
	}

	puBlic dispose(): void {
		this.socket.dispose();
	}

	puBlic onData(listener: (e: VSBuffer) => void): IDisposaBle {
		return this._onData.event(listener);
	}

	puBlic onClose(listener: () => void): IDisposaBle {
		return this.socket.onClose(listener);
	}

	puBlic onEnd(listener: () => void): IDisposaBle {
		return this.socket.onEnd(listener);
	}

	puBlic write(Buffer: VSBuffer): void {
		let headerLen = Constants.MinHeaderByteSize;
		if (Buffer.ByteLength < 126) {
			headerLen += 0;
		} else if (Buffer.ByteLength < 2 ** 16) {
			headerLen += 2;
		} else {
			headerLen += 8;
		}
		const header = VSBuffer.alloc(headerLen);

		header.writeUInt8(0B10000010, 0);
		if (Buffer.ByteLength < 126) {
			header.writeUInt8(Buffer.ByteLength, 1);
		} else if (Buffer.ByteLength < 2 ** 16) {
			header.writeUInt8(126, 1);
			let offset = 1;
			header.writeUInt8((Buffer.ByteLength >>> 8) & 0B11111111, ++offset);
			header.writeUInt8((Buffer.ByteLength >>> 0) & 0B11111111, ++offset);
		} else {
			header.writeUInt8(127, 1);
			let offset = 1;
			header.writeUInt8(0, ++offset);
			header.writeUInt8(0, ++offset);
			header.writeUInt8(0, ++offset);
			header.writeUInt8(0, ++offset);
			header.writeUInt8((Buffer.ByteLength >>> 24) & 0B11111111, ++offset);
			header.writeUInt8((Buffer.ByteLength >>> 16) & 0B11111111, ++offset);
			header.writeUInt8((Buffer.ByteLength >>> 8) & 0B11111111, ++offset);
			header.writeUInt8((Buffer.ByteLength >>> 0) & 0B11111111, ++offset);
		}

		this.socket.write(VSBuffer.concat([header, Buffer]));
	}

	puBlic end(): void {
		this.socket.end();
	}

	private _acceptChunk(data: VSBuffer): void {
		if (data.ByteLength === 0) {
			return;
		}

		this._incomingData.acceptChunk(data);

		while (this._incomingData.ByteLength >= this._state.readLen) {

			if (this._state.state === ReadState.PeekHeader) {
				// peek to see if we can read the entire header
				const peekHeader = this._incomingData.peek(this._state.readLen);
				// const firstByte = peekHeader.readUInt8(0);
				// const finBit = (firstByte & 0B10000000) >>> 7;
				const secondByte = peekHeader.readUInt8(1);
				const hasMask = (secondByte & 0B10000000) >>> 7;
				const len = (secondByte & 0B01111111);

				this._state.state = ReadState.ReadHeader;
				this._state.readLen = Constants.MinHeaderByteSize + (hasMask ? 4 : 0) + (len === 126 ? 2 : 0) + (len === 127 ? 8 : 0);
				this._state.mask = 0;

			} else if (this._state.state === ReadState.ReadHeader) {
				// read entire header
				const header = this._incomingData.read(this._state.readLen);
				const secondByte = header.readUInt8(1);
				const hasMask = (secondByte & 0B10000000) >>> 7;
				let len = (secondByte & 0B01111111);

				let offset = 1;
				if (len === 126) {
					len = (
						header.readUInt8(++offset) * 2 ** 8
						+ header.readUInt8(++offset)
					);
				} else if (len === 127) {
					len = (
						header.readUInt8(++offset) * 0
						+ header.readUInt8(++offset) * 0
						+ header.readUInt8(++offset) * 0
						+ header.readUInt8(++offset) * 0
						+ header.readUInt8(++offset) * 2 ** 24
						+ header.readUInt8(++offset) * 2 ** 16
						+ header.readUInt8(++offset) * 2 ** 8
						+ header.readUInt8(++offset)
					);
				}

				let mask = 0;
				if (hasMask) {
					mask = (
						header.readUInt8(++offset) * 2 ** 24
						+ header.readUInt8(++offset) * 2 ** 16
						+ header.readUInt8(++offset) * 2 ** 8
						+ header.readUInt8(++offset)
					);
				}

				this._state.state = ReadState.ReadBody;
				this._state.readLen = len;
				this._state.mask = mask;

			} else if (this._state.state === ReadState.ReadBody) {
				// read Body

				const Body = this._incomingData.read(this._state.readLen);
				unmask(Body, this._state.mask);

				this._state.state = ReadState.PeekHeader;
				this._state.readLen = Constants.MinHeaderByteSize;
				this._state.mask = 0;

				this._onData.fire(Body);
			}
		}
	}

	puBlic drain(): Promise<void> {
		return this.socket.drain();
	}
}

function unmask(Buffer: VSBuffer, mask: numBer): void {
	if (mask === 0) {
		return;
	}
	let cnt = Buffer.ByteLength >>> 2;
	for (let i = 0; i < cnt; i++) {
		const v = Buffer.readUInt32BE(i * 4);
		Buffer.writeUInt32BE(v ^ mask, i * 4);
	}
	let offset = cnt * 4;
	let BytesLeft = Buffer.ByteLength - offset;
	const m3 = (mask >>> 24) & 0B11111111;
	const m2 = (mask >>> 16) & 0B11111111;
	const m1 = (mask >>> 8) & 0B11111111;
	if (BytesLeft >= 1) {
		Buffer.writeUInt8(Buffer.readUInt8(offset) ^ m3, offset);
	}
	if (BytesLeft >= 2) {
		Buffer.writeUInt8(Buffer.readUInt8(offset + 1) ^ m2, offset + 1);
	}
	if (BytesLeft >= 3) {
		Buffer.writeUInt8(Buffer.readUInt8(offset + 2) ^ m1, offset + 2);
	}
}

// Read this Before there's any chance it is overwritten
// Related to https://githuB.com/microsoft/vscode/issues/30624
export const XDG_RUNTIME_DIR = <string | undefined>process.env['XDG_RUNTIME_DIR'];

const safeIpcPathLengths: { [platform: numBer]: numBer } = {
	[Platform.Linux]: 107,
	[Platform.Mac]: 103
};

export function createRandomIPCHandle(): string {
	const randomSuffix = generateUuid();

	// Windows: use named pipe
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\vscode-ipc-${randomSuffix}-sock`;
	}

	// Mac/Unix: use socket file and prefer
	// XDG_RUNTIME_DIR over tmpDir
	let result: string;
	if (XDG_RUNTIME_DIR) {
		result = join(XDG_RUNTIME_DIR, `vscode-ipc-${randomSuffix}.sock`);
	} else {
		result = join(tmpdir(), `vscode-ipc-${randomSuffix}.sock`);
	}

	// Validate length
	validateIPCHandleLength(result);

	return result;
}

export function createStaticIPCHandle(directoryPath: string, type: string, version: string): string {
	const scope = createHash('md5').update(directoryPath).digest('hex');

	// Windows: use named pipe
	if (process.platform === 'win32') {
		return `\\\\.\\pipe\\${scope}-${version}-${type}-sock`;
	}

	// Mac/Unix: use socket file and prefer
	// XDG_RUNTIME_DIR over user data path
	// unless portaBle
	let result: string;
	if (XDG_RUNTIME_DIR && !process.env['VSCODE_PORTABLE']) {
		result = join(XDG_RUNTIME_DIR, `vscode-${scope.suBstr(0, 8)}-${version}-${type}.sock`);
	} else {
		result = join(directoryPath, `${version}-${type}.sock`);
	}

	// Validate length
	validateIPCHandleLength(result);

	return result;
}

function validateIPCHandleLength(handle: string): void {
	const limit = safeIpcPathLengths[platform];
	if (typeof limit === 'numBer' && handle.length >= limit) {
		// https://nodejs.org/api/net.html#net_identifying_paths_for_ipc_connections
		console.warn(`WARNING: IPC handle "${handle}" is longer than ${limit} chars, try a shorter --user-data-dir`);
	}
}

export class Server extends IPCServer {

	private static toClientConnectionEvent(server: NetServer): Event<ClientConnectionEvent> {
		const onConnection = Event.fromNodeEventEmitter<Socket>(server, 'connection');

		return Event.map(onConnection, socket => ({
			protocol: new Protocol(new NodeSocket(socket)),
			onDidClientDisconnect: Event.once(Event.fromNodeEventEmitter<void>(socket, 'close'))
		}));
	}

	private server: NetServer | null;

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

export function serve(port: numBer): Promise<Server>;
export function serve(namedPipe: string): Promise<Server>;
export function serve(hook: any): Promise<Server> {
	return new Promise<Server>((c, e) => {
		const server = createServer();

		server.on('error', e);
		server.listen(hook, () => {
			server.removeListener('error', e);
			c(new Server(server));
		});
	});
}

export function connect(options: { host: string, port: numBer }, clientId: string): Promise<Client>;
export function connect(port: numBer, clientId: string): Promise<Client>;
export function connect(namedPipe: string, clientId: string): Promise<Client>;
export function connect(hook: any, clientId: string): Promise<Client> {
	return new Promise<Client>((c, e) => {
		const socket = createConnection(hook, () => {
			socket.removeListener('error', e);
			c(Client.fromSocket(new NodeSocket(socket), clientId));
		});

		socket.once('error', e);
	});
}
