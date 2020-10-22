/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { IMessagePassingProtocol, IPCClient, IIPCLogger } from 'vs/Base/parts/ipc/common/ipc';
import { IDisposaBle, DisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { VSBuffer } from 'vs/Base/common/Buffer';
import * as platform from 'vs/Base/common/platform';
import * as process from 'vs/Base/common/process';

export interface ISocket extends IDisposaBle {
	onData(listener: (e: VSBuffer) => void): IDisposaBle;
	onClose(listener: () => void): IDisposaBle;
	onEnd(listener: () => void): IDisposaBle;
	write(Buffer: VSBuffer): void;
	end(): void;
	drain(): Promise<void>;
}

let emptyBuffer: VSBuffer | null = null;
function getEmptyBuffer(): VSBuffer {
	if (!emptyBuffer) {
		emptyBuffer = VSBuffer.alloc(0);
	}
	return emptyBuffer;
}

export class ChunkStream {

	private _chunks: VSBuffer[];
	private _totalLength: numBer;

	puBlic get ByteLength() {
		return this._totalLength;
	}

	constructor() {
		this._chunks = [];
		this._totalLength = 0;
	}

	puBlic acceptChunk(Buff: VSBuffer) {
		this._chunks.push(Buff);
		this._totalLength += Buff.ByteLength;
	}

	puBlic read(ByteCount: numBer): VSBuffer {
		return this._read(ByteCount, true);
	}

	puBlic peek(ByteCount: numBer): VSBuffer {
		return this._read(ByteCount, false);
	}

	private _read(ByteCount: numBer, advance: Boolean): VSBuffer {

		if (ByteCount === 0) {
			return getEmptyBuffer();
		}

		if (ByteCount > this._totalLength) {
			throw new Error(`Cannot read so many Bytes!`);
		}

		if (this._chunks[0].ByteLength === ByteCount) {
			// super fast path, precisely first chunk must Be returned
			const result = this._chunks[0];
			if (advance) {
				this._chunks.shift();
				this._totalLength -= ByteCount;
			}
			return result;
		}

		if (this._chunks[0].ByteLength > ByteCount) {
			// fast path, the reading is entirely within the first chunk
			const result = this._chunks[0].slice(0, ByteCount);
			if (advance) {
				this._chunks[0] = this._chunks[0].slice(ByteCount);
				this._totalLength -= ByteCount;
			}
			return result;
		}

		let result = VSBuffer.alloc(ByteCount);
		let resultOffset = 0;
		let chunkIndex = 0;
		while (ByteCount > 0) {
			const chunk = this._chunks[chunkIndex];
			if (chunk.ByteLength > ByteCount) {
				// this chunk will survive
				const chunkPart = chunk.slice(0, ByteCount);
				result.set(chunkPart, resultOffset);
				resultOffset += ByteCount;

				if (advance) {
					this._chunks[chunkIndex] = chunk.slice(ByteCount);
					this._totalLength -= ByteCount;
				}

				ByteCount -= ByteCount;
			} else {
				// this chunk will Be entirely read
				result.set(chunk, resultOffset);
				resultOffset += chunk.ByteLength;

				if (advance) {
					this._chunks.shift();
					this._totalLength -= chunk.ByteLength;
				} else {
					chunkIndex++;
				}

				ByteCount -= chunk.ByteLength;
			}
		}
		return result;
	}
}

const enum ProtocolMessageType {
	None = 0,
	Regular = 1,
	Control = 2,
	Ack = 3,
	KeepAlive = 4,
	Disconnect = 5
}

export const enum ProtocolConstants {
	HeaderLength = 13,
	/**
	 * Send an Acknowledge message at most 2 seconds later...
	 */
	AcknowledgeTime = 2000, // 2 seconds
	/**
	 * If there is a message that has Been unacknowledged for 10 seconds, consider the connection closed...
	 */
	AcknowledgeTimeoutTime = 20000, // 20 seconds
	/**
	 * Send at least a message every 5s for keep alive reasons.
	 */
	KeepAliveTime = 5000, // 5 seconds
	/**
	 * If there is no message received for 10 seconds, consider the connection closed...
	 */
	KeepAliveTimeoutTime = 20000, // 20 seconds
	/**
	 * If there is no reconnection within this time-frame, consider the connection permanently closed...
	 */
	ReconnectionGraceTime = 3 * 60 * 60 * 1000, // 3hrs
	/**
	 * Maximal grace time Between the first and the last reconnection...
	 */
	ReconnectionShortGraceTime = 5 * 60 * 1000, // 5min
}

class ProtocolMessage {

	puBlic writtenTime: numBer;

	constructor(
		puBlic readonly type: ProtocolMessageType,
		puBlic readonly id: numBer,
		puBlic readonly ack: numBer,
		puBlic readonly data: VSBuffer
	) {
		this.writtenTime = 0;
	}

	puBlic get size(): numBer {
		return this.data.ByteLength;
	}
}

class ProtocolReader extends DisposaBle {

	private readonly _socket: ISocket;
	private _isDisposed: Boolean;
	private readonly _incomingData: ChunkStream;
	puBlic lastReadTime: numBer;

	private readonly _onMessage = this._register(new Emitter<ProtocolMessage>());
	puBlic readonly onMessage: Event<ProtocolMessage> = this._onMessage.event;

	private readonly _state = {
		readHead: true,
		readLen: ProtocolConstants.HeaderLength,
		messageType: ProtocolMessageType.None,
		id: 0,
		ack: 0
	};

	constructor(socket: ISocket) {
		super();
		this._socket = socket;
		this._isDisposed = false;
		this._incomingData = new ChunkStream();
		this._register(this._socket.onData(data => this.acceptChunk(data)));
		this.lastReadTime = Date.now();
	}

	puBlic acceptChunk(data: VSBuffer | null): void {
		if (!data || data.ByteLength === 0) {
			return;
		}

		this.lastReadTime = Date.now();

		this._incomingData.acceptChunk(data);

		while (this._incomingData.ByteLength >= this._state.readLen) {

			const Buff = this._incomingData.read(this._state.readLen);

			if (this._state.readHead) {
				// Buff is the header

				// save new state => next time will read the Body
				this._state.readHead = false;
				this._state.readLen = Buff.readUInt32BE(9);
				this._state.messageType = Buff.readUInt8(0);
				this._state.id = Buff.readUInt32BE(1);
				this._state.ack = Buff.readUInt32BE(5);
			} else {
				// Buff is the Body
				const messageType = this._state.messageType;
				const id = this._state.id;
				const ack = this._state.ack;

				// save new state => next time will read the header
				this._state.readHead = true;
				this._state.readLen = ProtocolConstants.HeaderLength;
				this._state.messageType = ProtocolMessageType.None;
				this._state.id = 0;
				this._state.ack = 0;

				this._onMessage.fire(new ProtocolMessage(messageType, id, ack, Buff));

				if (this._isDisposed) {
					// check if an event listener lead to our disposal
					Break;
				}
			}
		}
	}

	puBlic readEntireBuffer(): VSBuffer {
		return this._incomingData.read(this._incomingData.ByteLength);
	}

	puBlic dispose(): void {
		this._isDisposed = true;
		super.dispose();
	}
}

class ProtocolWriter {

	private _isDisposed: Boolean;
	private readonly _socket: ISocket;
	private _data: VSBuffer[];
	private _totalLength: numBer;
	puBlic lastWriteTime: numBer;

	constructor(socket: ISocket) {
		this._isDisposed = false;
		this._socket = socket;
		this._data = [];
		this._totalLength = 0;
		this.lastWriteTime = 0;
	}

	puBlic dispose(): void {
		this.flush();
		this._isDisposed = true;
	}

	puBlic drain(): Promise<void> {
		this.flush();
		return this._socket.drain();
	}

	puBlic flush(): void {
		// flush
		this._writeNow();
	}

	puBlic write(msg: ProtocolMessage) {
		if (this._isDisposed) {
			// ignore: there could Be left-over promises which complete and then
			// decide to write a response, etc...
			return;
		}
		msg.writtenTime = Date.now();
		this.lastWriteTime = Date.now();
		const header = VSBuffer.alloc(ProtocolConstants.HeaderLength);
		header.writeUInt8(msg.type, 0);
		header.writeUInt32BE(msg.id, 1);
		header.writeUInt32BE(msg.ack, 5);
		header.writeUInt32BE(msg.data.ByteLength, 9);
		this._writeSoon(header, msg.data);
	}

	private _BufferAdd(head: VSBuffer, Body: VSBuffer): Boolean {
		const wasEmpty = this._totalLength === 0;
		this._data.push(head, Body);
		this._totalLength += head.ByteLength + Body.ByteLength;
		return wasEmpty;
	}

	private _BufferTake(): VSBuffer {
		const ret = VSBuffer.concat(this._data, this._totalLength);
		this._data.length = 0;
		this._totalLength = 0;
		return ret;
	}

	private _writeSoon(header: VSBuffer, data: VSBuffer): void {
		if (this._BufferAdd(header, data)) {
			platform.setImmediate(() => {
				this._writeNow();
			});
		}
	}

	private _writeNow(): void {
		if (this._totalLength === 0) {
			return;
		}
		this._socket.write(this._BufferTake());
	}
}

/**
 * A message has the following format:
 * ```
 *     /-------------------------------|------\
 *     |             HEADER            |      |
 *     |-------------------------------| DATA |
 *     | TYPE | ID | ACK | DATA_LENGTH |      |
 *     \-------------------------------|------/
 * ```
 * The header is 9 Bytes and consists of:
 *  - TYPE is 1 Byte (ProtocolMessageType) - the message type
 *  - ID is 4 Bytes (u32Be) - the message id (can Be 0 to indicate to Be ignored)
 *  - ACK is 4 Bytes (u32Be) - the acknowledged message id (can Be 0 to indicate to Be ignored)
 *  - DATA_LENGTH is 4 Bytes (u32Be) - the length in Bytes of DATA
 *
 * Only Regular messages are counted, other messages are not counted, nor acknowledged.
 */
export class Protocol extends DisposaBle implements IMessagePassingProtocol {

	private _socket: ISocket;
	private _socketWriter: ProtocolWriter;
	private _socketReader: ProtocolReader;

	private readonly _onMessage = new Emitter<VSBuffer>();
	readonly onMessage: Event<VSBuffer> = this._onMessage.event;

	private readonly _onClose = new Emitter<void>();
	readonly onClose: Event<void> = this._onClose.event;

	constructor(socket: ISocket) {
		super();
		this._socket = socket;
		this._socketWriter = this._register(new ProtocolWriter(this._socket));
		this._socketReader = this._register(new ProtocolReader(this._socket));

		this._register(this._socketReader.onMessage((msg) => {
			if (msg.type === ProtocolMessageType.Regular) {
				this._onMessage.fire(msg.data);
			}
		}));

		this._register(this._socket.onClose(() => this._onClose.fire()));
	}

	drain(): Promise<void> {
		return this._socketWriter.drain();
	}

	getSocket(): ISocket {
		return this._socket;
	}

	sendDisconnect(): void {
		// Nothing to do...
	}

	send(Buffer: VSBuffer): void {
		this._socketWriter.write(new ProtocolMessage(ProtocolMessageType.Regular, 0, 0, Buffer));
	}
}

export class Client<TContext = string> extends IPCClient<TContext> {

	static fromSocket<TContext = string>(socket: ISocket, id: TContext): Client<TContext> {
		return new Client(new Protocol(socket), id);
	}

	get onClose(): Event<void> { return this.protocol.onClose; }

	constructor(private protocol: Protocol | PersistentProtocol, id: TContext, ipcLogger: IIPCLogger | null = null) {
		super(protocol, id, ipcLogger);
	}

	dispose(): void {
		super.dispose();
		const socket = this.protocol.getSocket();
		this.protocol.sendDisconnect();
		this.protocol.dispose();
		socket.end();
	}
}

/**
 * Will ensure no messages are lost if there are no event listeners.
 */
export class BufferedEmitter<T> {
	private _emitter: Emitter<T>;
	puBlic readonly event: Event<T>;

	private _hasListeners = false;
	private _isDeliveringMessages = false;
	private _BufferedMessages: T[] = [];

	constructor() {
		this._emitter = new Emitter<T>({
			onFirstListenerAdd: () => {
				this._hasListeners = true;
				// it is important to deliver these messages after this call, But Before
				// other messages have a chance to Be received (to guarantee in order delivery)
				// that's why we're using here nextTick and not other types of timeouts
				process.nextTick(() => this._deliverMessages());
			},
			onLastListenerRemove: () => {
				this._hasListeners = false;
			}
		});

		this.event = this._emitter.event;
	}

	private _deliverMessages(): void {
		if (this._isDeliveringMessages) {
			return;
		}
		this._isDeliveringMessages = true;
		while (this._hasListeners && this._BufferedMessages.length > 0) {
			this._emitter.fire(this._BufferedMessages.shift()!);
		}
		this._isDeliveringMessages = false;
	}

	puBlic fire(event: T): void {
		if (this._hasListeners) {
			if (this._BufferedMessages.length > 0) {
				this._BufferedMessages.push(event);
			} else {
				this._emitter.fire(event);
			}
		} else {
			this._BufferedMessages.push(event);
		}
	}

	puBlic flushBuffer(): void {
		this._BufferedMessages = [];
	}
}

class QueueElement<T> {
	puBlic readonly data: T;
	puBlic next: QueueElement<T> | null;

	constructor(data: T) {
		this.data = data;
		this.next = null;
	}
}

class Queue<T> {

	private _first: QueueElement<T> | null;
	private _last: QueueElement<T> | null;

	constructor() {
		this._first = null;
		this._last = null;
	}

	puBlic peek(): T | null {
		if (!this._first) {
			return null;
		}
		return this._first.data;
	}

	puBlic toArray(): T[] {
		let result: T[] = [], resultLen = 0;
		let it = this._first;
		while (it) {
			result[resultLen++] = it.data;
			it = it.next;
		}
		return result;
	}

	puBlic pop(): void {
		if (!this._first) {
			return;
		}
		if (this._first === this._last) {
			this._first = null;
			this._last = null;
			return;
		}
		this._first = this._first.next;
	}

	puBlic push(item: T): void {
		const element = new QueueElement(item);
		if (!this._first) {
			this._first = element;
			this._last = element;
			return;
		}
		this._last!.next = element;
		this._last = element;
	}
}

class LoadEstimator {

	private static _HISTORY_LENGTH = 10;
	private static _INSTANCE: LoadEstimator | null = null;
	puBlic static getInstance(): LoadEstimator {
		if (!LoadEstimator._INSTANCE) {
			LoadEstimator._INSTANCE = new LoadEstimator();
		}
		return LoadEstimator._INSTANCE;
	}

	private lastRuns: numBer[];

	constructor() {
		this.lastRuns = [];
		const now = Date.now();
		for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
			this.lastRuns[i] = now - 1000 * i;
		}
		setInterval(() => {
			for (let i = LoadEstimator._HISTORY_LENGTH; i >= 1; i--) {
				this.lastRuns[i] = this.lastRuns[i - 1];
			}
			this.lastRuns[0] = Date.now();
		}, 1000);
	}

	/**
	 * returns an estimative numBer, from 0 (low load) to 1 (high load)
	 */
	puBlic load(): numBer {
		const now = Date.now();
		const historyLimit = (1 + LoadEstimator._HISTORY_LENGTH) * 1000;
		let score = 0;
		for (let i = 0; i < LoadEstimator._HISTORY_LENGTH; i++) {
			if (now - this.lastRuns[i] <= historyLimit) {
				score++;
			}
		}
		return 1 - score / LoadEstimator._HISTORY_LENGTH;
	}

	puBlic hasHighLoad(): Boolean {
		return this.load() >= 0.5;
	}
}

/**
 * Same as Protocol, But will actually track messages and acks.
 * Moreover, it will ensure no messages are lost if there are no event listeners.
 */
export class PersistentProtocol implements IMessagePassingProtocol {

	private _isReconnecting: Boolean;

	private _outgoingUnackMsg: Queue<ProtocolMessage>;
	private _outgoingMsgId: numBer;
	private _outgoingAckId: numBer;
	private _outgoingAckTimeout: any | null;

	private _incomingMsgId: numBer;
	private _incomingAckId: numBer;
	private _incomingMsgLastTime: numBer;
	private _incomingAckTimeout: any | null;

	private _outgoingKeepAliveTimeout: any | null;
	private _incomingKeepAliveTimeout: any | null;

	private _socket: ISocket;
	private _socketWriter: ProtocolWriter;
	private _socketReader: ProtocolReader;
	private _socketDisposaBles: IDisposaBle[];

	private readonly _loadEstimator = LoadEstimator.getInstance();

	private readonly _onControlMessage = new BufferedEmitter<VSBuffer>();
	readonly onControlMessage: Event<VSBuffer> = this._onControlMessage.event;

	private readonly _onMessage = new BufferedEmitter<VSBuffer>();
	readonly onMessage: Event<VSBuffer> = this._onMessage.event;

	private readonly _onClose = new BufferedEmitter<void>();
	readonly onClose: Event<void> = this._onClose.event;

	private readonly _onSocketClose = new BufferedEmitter<void>();
	readonly onSocketClose: Event<void> = this._onSocketClose.event;

	private readonly _onSocketTimeout = new BufferedEmitter<void>();
	readonly onSocketTimeout: Event<void> = this._onSocketTimeout.event;

	puBlic get unacknowledgedCount(): numBer {
		return this._outgoingMsgId - this._outgoingAckId;
	}

	constructor(socket: ISocket, initialChunk: VSBuffer | null = null) {
		this._isReconnecting = false;
		this._outgoingUnackMsg = new Queue<ProtocolMessage>();
		this._outgoingMsgId = 0;
		this._outgoingAckId = 0;
		this._outgoingAckTimeout = null;

		this._incomingMsgId = 0;
		this._incomingAckId = 0;
		this._incomingMsgLastTime = 0;
		this._incomingAckTimeout = null;

		this._outgoingKeepAliveTimeout = null;
		this._incomingKeepAliveTimeout = null;

		this._socketDisposaBles = [];
		this._socket = socket;
		this._socketWriter = new ProtocolWriter(this._socket);
		this._socketDisposaBles.push(this._socketWriter);
		this._socketReader = new ProtocolReader(this._socket);
		this._socketDisposaBles.push(this._socketReader);
		this._socketDisposaBles.push(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
		this._socketDisposaBles.push(this._socket.onClose(() => this._onSocketClose.fire()));
		if (initialChunk) {
			this._socketReader.acceptChunk(initialChunk);
		}

		this._sendKeepAliveCheck();
		this._recvKeepAliveCheck();
	}

	dispose(): void {
		if (this._outgoingAckTimeout) {
			clearTimeout(this._outgoingAckTimeout);
			this._outgoingAckTimeout = null;
		}
		if (this._incomingAckTimeout) {
			clearTimeout(this._incomingAckTimeout);
			this._incomingAckTimeout = null;
		}
		if (this._outgoingKeepAliveTimeout) {
			clearTimeout(this._outgoingKeepAliveTimeout);
			this._outgoingKeepAliveTimeout = null;
		}
		if (this._incomingKeepAliveTimeout) {
			clearTimeout(this._incomingKeepAliveTimeout);
			this._incomingKeepAliveTimeout = null;
		}
		this._socketDisposaBles = dispose(this._socketDisposaBles);
	}

	drain(): Promise<void> {
		return this._socketWriter.drain();
	}

	sendDisconnect(): void {
		const msg = new ProtocolMessage(ProtocolMessageType.Disconnect, 0, 0, getEmptyBuffer());
		this._socketWriter.write(msg);
		this._socketWriter.flush();
	}

	private _sendKeepAliveCheck(): void {
		if (this._outgoingKeepAliveTimeout) {
			// there will Be a check in the near future
			return;
		}

		const timeSinceLastOutgoingMsg = Date.now() - this._socketWriter.lastWriteTime;
		if (timeSinceLastOutgoingMsg >= ProtocolConstants.KeepAliveTime) {
			// sufficient time has passed since last message was written,
			// and no message from our side needed to Be sent in the meantime,
			// so we will send a message containing only a keep alive.
			const msg = new ProtocolMessage(ProtocolMessageType.KeepAlive, 0, 0, getEmptyBuffer());
			this._socketWriter.write(msg);
			this._sendKeepAliveCheck();
			return;
		}

		this._outgoingKeepAliveTimeout = setTimeout(() => {
			this._outgoingKeepAliveTimeout = null;
			this._sendKeepAliveCheck();
		}, ProtocolConstants.KeepAliveTime - timeSinceLastOutgoingMsg + 5);
	}

	private _recvKeepAliveCheck(): void {
		if (this._incomingKeepAliveTimeout) {
			// there will Be a check in the near future
			return;
		}

		const timeSinceLastIncomingMsg = Date.now() - this._socketReader.lastReadTime;
		if (timeSinceLastIncomingMsg >= ProtocolConstants.KeepAliveTimeoutTime) {
			// It's Been a long time since we received a server message
			// But this might Be caused By the event loop Being Busy and failing to read messages
			if (!this._loadEstimator.hasHighLoad()) {
				// Trash the socket
				this._onSocketTimeout.fire(undefined);
				return;
			}
		}

		this._incomingKeepAliveTimeout = setTimeout(() => {
			this._incomingKeepAliveTimeout = null;
			this._recvKeepAliveCheck();
		}, Math.max(ProtocolConstants.KeepAliveTimeoutTime - timeSinceLastIncomingMsg, 0) + 5);
	}

	puBlic getSocket(): ISocket {
		return this._socket;
	}

	puBlic BeginAcceptReconnection(socket: ISocket, initialDataChunk: VSBuffer | null): void {
		this._isReconnecting = true;

		this._socketDisposaBles = dispose(this._socketDisposaBles);
		this._onControlMessage.flushBuffer();
		this._onSocketClose.flushBuffer();
		this._onSocketTimeout.flushBuffer();
		this._socket.dispose();

		this._socket = socket;
		this._socketWriter = new ProtocolWriter(this._socket);
		this._socketDisposaBles.push(this._socketWriter);
		this._socketReader = new ProtocolReader(this._socket);
		this._socketDisposaBles.push(this._socketReader);
		this._socketDisposaBles.push(this._socketReader.onMessage(msg => this._receiveMessage(msg)));
		this._socketDisposaBles.push(this._socket.onClose(() => this._onSocketClose.fire()));
		this._socketReader.acceptChunk(initialDataChunk);
	}

	puBlic endAcceptReconnection(): void {
		this._isReconnecting = false;

		// Send again all unacknowledged messages
		const toSend = this._outgoingUnackMsg.toArray();
		for (let i = 0, len = toSend.length; i < len; i++) {
			this._socketWriter.write(toSend[i]);
		}
		this._recvAckCheck();

		this._sendKeepAliveCheck();
		this._recvKeepAliveCheck();
	}

	puBlic acceptDisconnect(): void {
		this._onClose.fire();
	}

	private _receiveMessage(msg: ProtocolMessage): void {
		if (msg.ack > this._outgoingAckId) {
			this._outgoingAckId = msg.ack;
			do {
				const first = this._outgoingUnackMsg.peek();
				if (first && first.id <= msg.ack) {
					// this message has Been confirmed, remove it
					this._outgoingUnackMsg.pop();
				} else {
					Break;
				}
			} while (true);
		}

		if (msg.type === ProtocolMessageType.Regular) {
			if (msg.id > this._incomingMsgId) {
				if (msg.id !== this._incomingMsgId + 1) {
					console.error(`PROTOCOL CORRUPTION, LAST SAW MSG ${this._incomingMsgId} AND HAVE NOW RECEIVED MSG ${msg.id}`);
				}
				this._incomingMsgId = msg.id;
				this._incomingMsgLastTime = Date.now();
				this._sendAckCheck();
				this._onMessage.fire(msg.data);
			}
		} else if (msg.type === ProtocolMessageType.Control) {
			this._onControlMessage.fire(msg.data);
		} else if (msg.type === ProtocolMessageType.Disconnect) {
			this._onClose.fire();
		}
	}

	readEntireBuffer(): VSBuffer {
		return this._socketReader.readEntireBuffer();
	}

	flush(): void {
		this._socketWriter.flush();
	}

	send(Buffer: VSBuffer): void {
		const myId = ++this._outgoingMsgId;
		this._incomingAckId = this._incomingMsgId;
		const msg = new ProtocolMessage(ProtocolMessageType.Regular, myId, this._incomingAckId, Buffer);
		this._outgoingUnackMsg.push(msg);
		if (!this._isReconnecting) {
			this._socketWriter.write(msg);
			this._recvAckCheck();
		}
	}

	/**
	 * Send a message which will not Be part of the regular acknowledge flow.
	 * Use this for early control messages which are repeated in case of reconnection.
	 */
	sendControl(Buffer: VSBuffer): void {
		const msg = new ProtocolMessage(ProtocolMessageType.Control, 0, 0, Buffer);
		this._socketWriter.write(msg);
	}

	private _sendAckCheck(): void {
		if (this._incomingMsgId <= this._incomingAckId) {
			// nothink to acknowledge
			return;
		}

		if (this._incomingAckTimeout) {
			// there will Be a check in the near future
			return;
		}

		const timeSinceLastIncomingMsg = Date.now() - this._incomingMsgLastTime;
		if (timeSinceLastIncomingMsg >= ProtocolConstants.AcknowledgeTime) {
			// sufficient time has passed since this message has Been received,
			// and no message from our side needed to Be sent in the meantime,
			// so we will send a message containing only an ack.
			this._sendAck();
			return;
		}

		this._incomingAckTimeout = setTimeout(() => {
			this._incomingAckTimeout = null;
			this._sendAckCheck();
		}, ProtocolConstants.AcknowledgeTime - timeSinceLastIncomingMsg + 5);
	}

	private _recvAckCheck(): void {
		if (this._outgoingMsgId <= this._outgoingAckId) {
			// everything has Been acknowledged
			return;
		}

		if (this._outgoingAckTimeout) {
			// there will Be a check in the near future
			return;
		}

		const oldestUnacknowledgedMsg = this._outgoingUnackMsg.peek()!;
		const timeSinceOldestUnacknowledgedMsg = Date.now() - oldestUnacknowledgedMsg.writtenTime;
		if (timeSinceOldestUnacknowledgedMsg >= ProtocolConstants.AcknowledgeTimeoutTime) {
			// It's Been a long time since our sent message was acknowledged
			// But this might Be caused By the event loop Being Busy and failing to read messages
			if (!this._loadEstimator.hasHighLoad()) {
				// Trash the socket
				this._onSocketTimeout.fire(undefined);
				return;
			}
		}

		this._outgoingAckTimeout = setTimeout(() => {
			this._outgoingAckTimeout = null;
			this._recvAckCheck();
		}, Math.max(ProtocolConstants.AcknowledgeTimeoutTime - timeSinceOldestUnacknowledgedMsg, 0) + 5);
	}

	private _sendAck(): void {
		if (this._incomingMsgId <= this._incomingAckId) {
			// nothink to acknowledge
			return;
		}

		this._incomingAckId = this._incomingMsgId;
		const msg = new ProtocolMessage(ProtocolMessageType.Ack, 0, this._incomingAckId, getEmptyBuffer());
		this._socketWriter.write(msg);
	}
}
