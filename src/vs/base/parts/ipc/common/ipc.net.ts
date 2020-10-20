/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { IMessAgePAssingProtocol, IPCClient, IIPCLogger } from 'vs/bAse/pArts/ipc/common/ipc';
import { IDisposAble, DisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { VSBuffer } from 'vs/bAse/common/buffer';
import * As plAtform from 'vs/bAse/common/plAtform';
import * As process from 'vs/bAse/common/process';

export interfAce ISocket extends IDisposAble {
	onDAtA(listener: (e: VSBuffer) => void): IDisposAble;
	onClose(listener: () => void): IDisposAble;
	onEnd(listener: () => void): IDisposAble;
	write(buffer: VSBuffer): void;
	end(): void;
	drAin(): Promise<void>;
}

let emptyBuffer: VSBuffer | null = null;
function getEmptyBuffer(): VSBuffer {
	if (!emptyBuffer) {
		emptyBuffer = VSBuffer.Alloc(0);
	}
	return emptyBuffer;
}

export clAss ChunkStreAm {

	privAte _chunks: VSBuffer[];
	privAte _totAlLength: number;

	public get byteLength() {
		return this._totAlLength;
	}

	constructor() {
		this._chunks = [];
		this._totAlLength = 0;
	}

	public AcceptChunk(buff: VSBuffer) {
		this._chunks.push(buff);
		this._totAlLength += buff.byteLength;
	}

	public reAd(byteCount: number): VSBuffer {
		return this._reAd(byteCount, true);
	}

	public peek(byteCount: number): VSBuffer {
		return this._reAd(byteCount, fAlse);
	}

	privAte _reAd(byteCount: number, AdvAnce: booleAn): VSBuffer {

		if (byteCount === 0) {
			return getEmptyBuffer();
		}

		if (byteCount > this._totAlLength) {
			throw new Error(`CAnnot reAd so mAny bytes!`);
		}

		if (this._chunks[0].byteLength === byteCount) {
			// super fAst pAth, precisely first chunk must be returned
			const result = this._chunks[0];
			if (AdvAnce) {
				this._chunks.shift();
				this._totAlLength -= byteCount;
			}
			return result;
		}

		if (this._chunks[0].byteLength > byteCount) {
			// fAst pAth, the reAding is entirely within the first chunk
			const result = this._chunks[0].slice(0, byteCount);
			if (AdvAnce) {
				this._chunks[0] = this._chunks[0].slice(byteCount);
				this._totAlLength -= byteCount;
			}
			return result;
		}

		let result = VSBuffer.Alloc(byteCount);
		let resultOffset = 0;
		let chunkIndex = 0;
		while (byteCount > 0) {
			const chunk = this._chunks[chunkIndex];
			if (chunk.byteLength > byteCount) {
				// this chunk will survive
				const chunkPArt = chunk.slice(0, byteCount);
				result.set(chunkPArt, resultOffset);
				resultOffset += byteCount;

				if (AdvAnce) {
					this._chunks[chunkIndex] = chunk.slice(byteCount);
					this._totAlLength -= byteCount;
				}

				byteCount -= byteCount;
			} else {
				// this chunk will be entirely reAd
				result.set(chunk, resultOffset);
				resultOffset += chunk.byteLength;

				if (AdvAnce) {
					this._chunks.shift();
					this._totAlLength -= chunk.byteLength;
				} else {
					chunkIndex++;
				}

				byteCount -= chunk.byteLength;
			}
		}
		return result;
	}
}

const enum ProtocolMessAgeType {
	None = 0,
	RegulAr = 1,
	Control = 2,
	Ack = 3,
	KeepAlive = 4,
	Disconnect = 5
}

export const enum ProtocolConstAnts {
	HeAderLength = 13,
	/**
	 * Send An Acknowledge messAge At most 2 seconds lAter...
	 */
	AcknowledgeTime = 2000, // 2 seconds
	/**
	 * If there is A messAge thAt hAs been unAcknowledged for 10 seconds, consider the connection closed...
	 */
	AcknowledgeTimeoutTime = 20000, // 20 seconds
	/**
	 * Send At leAst A messAge every 5s for keep Alive reAsons.
	 */
	KeepAliveTime = 5000, // 5 seconds
	/**
	 * If there is no messAge received for 10 seconds, consider the connection closed...
	 */
	KeepAliveTimeoutTime = 20000, // 20 seconds
	/**
	 * If there is no reconnection within this time-frAme, consider the connection permAnently closed...
	 */
	ReconnectionGrAceTime = 3 * 60 * 60 * 1000, // 3hrs
	/**
	 * MAximAl grAce time between the first And the lAst reconnection...
	 */
	ReconnectionShortGrAceTime = 5 * 60 * 1000, // 5min
}

clAss ProtocolMessAge {

	public writtenTime: number;

	constructor(
		public reAdonly type: ProtocolMessAgeType,
		public reAdonly id: number,
		public reAdonly Ack: number,
		public reAdonly dAtA: VSBuffer
	) {
		this.writtenTime = 0;
	}

	public get size(): number {
		return this.dAtA.byteLength;
	}
}

clAss ProtocolReAder extends DisposAble {

	privAte reAdonly _socket: ISocket;
	privAte _isDisposed: booleAn;
	privAte reAdonly _incomingDAtA: ChunkStreAm;
	public lAstReAdTime: number;

	privAte reAdonly _onMessAge = this._register(new Emitter<ProtocolMessAge>());
	public reAdonly onMessAge: Event<ProtocolMessAge> = this._onMessAge.event;

	privAte reAdonly _stAte = {
		reAdHeAd: true,
		reAdLen: ProtocolConstAnts.HeAderLength,
		messAgeType: ProtocolMessAgeType.None,
		id: 0,
		Ack: 0
	};

	constructor(socket: ISocket) {
		super();
		this._socket = socket;
		this._isDisposed = fAlse;
		this._incomingDAtA = new ChunkStreAm();
		this._register(this._socket.onDAtA(dAtA => this.AcceptChunk(dAtA)));
		this.lAstReAdTime = DAte.now();
	}

	public AcceptChunk(dAtA: VSBuffer | null): void {
		if (!dAtA || dAtA.byteLength === 0) {
			return;
		}

		this.lAstReAdTime = DAte.now();

		this._incomingDAtA.AcceptChunk(dAtA);

		while (this._incomingDAtA.byteLength >= this._stAte.reAdLen) {

			const buff = this._incomingDAtA.reAd(this._stAte.reAdLen);

			if (this._stAte.reAdHeAd) {
				// buff is the heAder

				// sAve new stAte => next time will reAd the body
				this._stAte.reAdHeAd = fAlse;
				this._stAte.reAdLen = buff.reAdUInt32BE(9);
				this._stAte.messAgeType = buff.reAdUInt8(0);
				this._stAte.id = buff.reAdUInt32BE(1);
				this._stAte.Ack = buff.reAdUInt32BE(5);
			} else {
				// buff is the body
				const messAgeType = this._stAte.messAgeType;
				const id = this._stAte.id;
				const Ack = this._stAte.Ack;

				// sAve new stAte => next time will reAd the heAder
				this._stAte.reAdHeAd = true;
				this._stAte.reAdLen = ProtocolConstAnts.HeAderLength;
				this._stAte.messAgeType = ProtocolMessAgeType.None;
				this._stAte.id = 0;
				this._stAte.Ack = 0;

				this._onMessAge.fire(new ProtocolMessAge(messAgeType, id, Ack, buff));

				if (this._isDisposed) {
					// check if An event listener leAd to our disposAl
					breAk;
				}
			}
		}
	}

	public reAdEntireBuffer(): VSBuffer {
		return this._incomingDAtA.reAd(this._incomingDAtA.byteLength);
	}

	public dispose(): void {
		this._isDisposed = true;
		super.dispose();
	}
}

clAss ProtocolWriter {

	privAte _isDisposed: booleAn;
	privAte reAdonly _socket: ISocket;
	privAte _dAtA: VSBuffer[];
	privAte _totAlLength: number;
	public lAstWriteTime: number;

	constructor(socket: ISocket) {
		this._isDisposed = fAlse;
		this._socket = socket;
		this._dAtA = [];
		this._totAlLength = 0;
		this.lAstWriteTime = 0;
	}

	public dispose(): void {
		this.flush();
		this._isDisposed = true;
	}

	public drAin(): Promise<void> {
		this.flush();
		return this._socket.drAin();
	}

	public flush(): void {
		// flush
		this._writeNow();
	}

	public write(msg: ProtocolMessAge) {
		if (this._isDisposed) {
			// ignore: there could be left-over promises which complete And then
			// decide to write A response, etc...
			return;
		}
		msg.writtenTime = DAte.now();
		this.lAstWriteTime = DAte.now();
		const heAder = VSBuffer.Alloc(ProtocolConstAnts.HeAderLength);
		heAder.writeUInt8(msg.type, 0);
		heAder.writeUInt32BE(msg.id, 1);
		heAder.writeUInt32BE(msg.Ack, 5);
		heAder.writeUInt32BE(msg.dAtA.byteLength, 9);
		this._writeSoon(heAder, msg.dAtA);
	}

	privAte _bufferAdd(heAd: VSBuffer, body: VSBuffer): booleAn {
		const wAsEmpty = this._totAlLength === 0;
		this._dAtA.push(heAd, body);
		this._totAlLength += heAd.byteLength + body.byteLength;
		return wAsEmpty;
	}

	privAte _bufferTAke(): VSBuffer {
		const ret = VSBuffer.concAt(this._dAtA, this._totAlLength);
		this._dAtA.length = 0;
		this._totAlLength = 0;
		return ret;
	}

	privAte _writeSoon(heAder: VSBuffer, dAtA: VSBuffer): void {
		if (this._bufferAdd(heAder, dAtA)) {
			plAtform.setImmediAte(() => {
				this._writeNow();
			});
		}
	}

	privAte _writeNow(): void {
		if (this._totAlLength === 0) {
			return;
		}
		this._socket.write(this._bufferTAke());
	}
}

/**
 * A messAge hAs the following formAt:
 * ```
 *     /-------------------------------|------\
 *     |             HEADER            |      |
 *     |-------------------------------| DATA |
 *     | TYPE | ID | ACK | DATA_LENGTH |      |
 *     \-------------------------------|------/
 * ```
 * The heAder is 9 bytes And consists of:
 *  - TYPE is 1 byte (ProtocolMessAgeType) - the messAge type
 *  - ID is 4 bytes (u32be) - the messAge id (cAn be 0 to indicAte to be ignored)
 *  - ACK is 4 bytes (u32be) - the Acknowledged messAge id (cAn be 0 to indicAte to be ignored)
 *  - DATA_LENGTH is 4 bytes (u32be) - the length in bytes of DATA
 *
 * Only RegulAr messAges Are counted, other messAges Are not counted, nor Acknowledged.
 */
export clAss Protocol extends DisposAble implements IMessAgePAssingProtocol {

	privAte _socket: ISocket;
	privAte _socketWriter: ProtocolWriter;
	privAte _socketReAder: ProtocolReAder;

	privAte reAdonly _onMessAge = new Emitter<VSBuffer>();
	reAdonly onMessAge: Event<VSBuffer> = this._onMessAge.event;

	privAte reAdonly _onClose = new Emitter<void>();
	reAdonly onClose: Event<void> = this._onClose.event;

	constructor(socket: ISocket) {
		super();
		this._socket = socket;
		this._socketWriter = this._register(new ProtocolWriter(this._socket));
		this._socketReAder = this._register(new ProtocolReAder(this._socket));

		this._register(this._socketReAder.onMessAge((msg) => {
			if (msg.type === ProtocolMessAgeType.RegulAr) {
				this._onMessAge.fire(msg.dAtA);
			}
		}));

		this._register(this._socket.onClose(() => this._onClose.fire()));
	}

	drAin(): Promise<void> {
		return this._socketWriter.drAin();
	}

	getSocket(): ISocket {
		return this._socket;
	}

	sendDisconnect(): void {
		// Nothing to do...
	}

	send(buffer: VSBuffer): void {
		this._socketWriter.write(new ProtocolMessAge(ProtocolMessAgeType.RegulAr, 0, 0, buffer));
	}
}

export clAss Client<TContext = string> extends IPCClient<TContext> {

	stAtic fromSocket<TContext = string>(socket: ISocket, id: TContext): Client<TContext> {
		return new Client(new Protocol(socket), id);
	}

	get onClose(): Event<void> { return this.protocol.onClose; }

	constructor(privAte protocol: Protocol | PersistentProtocol, id: TContext, ipcLogger: IIPCLogger | null = null) {
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
 * Will ensure no messAges Are lost if there Are no event listeners.
 */
export clAss BufferedEmitter<T> {
	privAte _emitter: Emitter<T>;
	public reAdonly event: Event<T>;

	privAte _hAsListeners = fAlse;
	privAte _isDeliveringMessAges = fAlse;
	privAte _bufferedMessAges: T[] = [];

	constructor() {
		this._emitter = new Emitter<T>({
			onFirstListenerAdd: () => {
				this._hAsListeners = true;
				// it is importAnt to deliver these messAges After this cAll, but before
				// other messAges hAve A chAnce to be received (to guArAntee in order delivery)
				// thAt's why we're using here nextTick And not other types of timeouts
				process.nextTick(() => this._deliverMessAges());
			},
			onLAstListenerRemove: () => {
				this._hAsListeners = fAlse;
			}
		});

		this.event = this._emitter.event;
	}

	privAte _deliverMessAges(): void {
		if (this._isDeliveringMessAges) {
			return;
		}
		this._isDeliveringMessAges = true;
		while (this._hAsListeners && this._bufferedMessAges.length > 0) {
			this._emitter.fire(this._bufferedMessAges.shift()!);
		}
		this._isDeliveringMessAges = fAlse;
	}

	public fire(event: T): void {
		if (this._hAsListeners) {
			if (this._bufferedMessAges.length > 0) {
				this._bufferedMessAges.push(event);
			} else {
				this._emitter.fire(event);
			}
		} else {
			this._bufferedMessAges.push(event);
		}
	}

	public flushBuffer(): void {
		this._bufferedMessAges = [];
	}
}

clAss QueueElement<T> {
	public reAdonly dAtA: T;
	public next: QueueElement<T> | null;

	constructor(dAtA: T) {
		this.dAtA = dAtA;
		this.next = null;
	}
}

clAss Queue<T> {

	privAte _first: QueueElement<T> | null;
	privAte _lAst: QueueElement<T> | null;

	constructor() {
		this._first = null;
		this._lAst = null;
	}

	public peek(): T | null {
		if (!this._first) {
			return null;
		}
		return this._first.dAtA;
	}

	public toArrAy(): T[] {
		let result: T[] = [], resultLen = 0;
		let it = this._first;
		while (it) {
			result[resultLen++] = it.dAtA;
			it = it.next;
		}
		return result;
	}

	public pop(): void {
		if (!this._first) {
			return;
		}
		if (this._first === this._lAst) {
			this._first = null;
			this._lAst = null;
			return;
		}
		this._first = this._first.next;
	}

	public push(item: T): void {
		const element = new QueueElement(item);
		if (!this._first) {
			this._first = element;
			this._lAst = element;
			return;
		}
		this._lAst!.next = element;
		this._lAst = element;
	}
}

clAss LoAdEstimAtor {

	privAte stAtic _HISTORY_LENGTH = 10;
	privAte stAtic _INSTANCE: LoAdEstimAtor | null = null;
	public stAtic getInstAnce(): LoAdEstimAtor {
		if (!LoAdEstimAtor._INSTANCE) {
			LoAdEstimAtor._INSTANCE = new LoAdEstimAtor();
		}
		return LoAdEstimAtor._INSTANCE;
	}

	privAte lAstRuns: number[];

	constructor() {
		this.lAstRuns = [];
		const now = DAte.now();
		for (let i = 0; i < LoAdEstimAtor._HISTORY_LENGTH; i++) {
			this.lAstRuns[i] = now - 1000 * i;
		}
		setIntervAl(() => {
			for (let i = LoAdEstimAtor._HISTORY_LENGTH; i >= 1; i--) {
				this.lAstRuns[i] = this.lAstRuns[i - 1];
			}
			this.lAstRuns[0] = DAte.now();
		}, 1000);
	}

	/**
	 * returns An estimAtive number, from 0 (low loAd) to 1 (high loAd)
	 */
	public loAd(): number {
		const now = DAte.now();
		const historyLimit = (1 + LoAdEstimAtor._HISTORY_LENGTH) * 1000;
		let score = 0;
		for (let i = 0; i < LoAdEstimAtor._HISTORY_LENGTH; i++) {
			if (now - this.lAstRuns[i] <= historyLimit) {
				score++;
			}
		}
		return 1 - score / LoAdEstimAtor._HISTORY_LENGTH;
	}

	public hAsHighLoAd(): booleAn {
		return this.loAd() >= 0.5;
	}
}

/**
 * SAme As Protocol, but will ActuAlly trAck messAges And Acks.
 * Moreover, it will ensure no messAges Are lost if there Are no event listeners.
 */
export clAss PersistentProtocol implements IMessAgePAssingProtocol {

	privAte _isReconnecting: booleAn;

	privAte _outgoingUnAckMsg: Queue<ProtocolMessAge>;
	privAte _outgoingMsgId: number;
	privAte _outgoingAckId: number;
	privAte _outgoingAckTimeout: Any | null;

	privAte _incomingMsgId: number;
	privAte _incomingAckId: number;
	privAte _incomingMsgLAstTime: number;
	privAte _incomingAckTimeout: Any | null;

	privAte _outgoingKeepAliveTimeout: Any | null;
	privAte _incomingKeepAliveTimeout: Any | null;

	privAte _socket: ISocket;
	privAte _socketWriter: ProtocolWriter;
	privAte _socketReAder: ProtocolReAder;
	privAte _socketDisposAbles: IDisposAble[];

	privAte reAdonly _loAdEstimAtor = LoAdEstimAtor.getInstAnce();

	privAte reAdonly _onControlMessAge = new BufferedEmitter<VSBuffer>();
	reAdonly onControlMessAge: Event<VSBuffer> = this._onControlMessAge.event;

	privAte reAdonly _onMessAge = new BufferedEmitter<VSBuffer>();
	reAdonly onMessAge: Event<VSBuffer> = this._onMessAge.event;

	privAte reAdonly _onClose = new BufferedEmitter<void>();
	reAdonly onClose: Event<void> = this._onClose.event;

	privAte reAdonly _onSocketClose = new BufferedEmitter<void>();
	reAdonly onSocketClose: Event<void> = this._onSocketClose.event;

	privAte reAdonly _onSocketTimeout = new BufferedEmitter<void>();
	reAdonly onSocketTimeout: Event<void> = this._onSocketTimeout.event;

	public get unAcknowledgedCount(): number {
		return this._outgoingMsgId - this._outgoingAckId;
	}

	constructor(socket: ISocket, initiAlChunk: VSBuffer | null = null) {
		this._isReconnecting = fAlse;
		this._outgoingUnAckMsg = new Queue<ProtocolMessAge>();
		this._outgoingMsgId = 0;
		this._outgoingAckId = 0;
		this._outgoingAckTimeout = null;

		this._incomingMsgId = 0;
		this._incomingAckId = 0;
		this._incomingMsgLAstTime = 0;
		this._incomingAckTimeout = null;

		this._outgoingKeepAliveTimeout = null;
		this._incomingKeepAliveTimeout = null;

		this._socketDisposAbles = [];
		this._socket = socket;
		this._socketWriter = new ProtocolWriter(this._socket);
		this._socketDisposAbles.push(this._socketWriter);
		this._socketReAder = new ProtocolReAder(this._socket);
		this._socketDisposAbles.push(this._socketReAder);
		this._socketDisposAbles.push(this._socketReAder.onMessAge(msg => this._receiveMessAge(msg)));
		this._socketDisposAbles.push(this._socket.onClose(() => this._onSocketClose.fire()));
		if (initiAlChunk) {
			this._socketReAder.AcceptChunk(initiAlChunk);
		}

		this._sendKeepAliveCheck();
		this._recvKeepAliveCheck();
	}

	dispose(): void {
		if (this._outgoingAckTimeout) {
			cleArTimeout(this._outgoingAckTimeout);
			this._outgoingAckTimeout = null;
		}
		if (this._incomingAckTimeout) {
			cleArTimeout(this._incomingAckTimeout);
			this._incomingAckTimeout = null;
		}
		if (this._outgoingKeepAliveTimeout) {
			cleArTimeout(this._outgoingKeepAliveTimeout);
			this._outgoingKeepAliveTimeout = null;
		}
		if (this._incomingKeepAliveTimeout) {
			cleArTimeout(this._incomingKeepAliveTimeout);
			this._incomingKeepAliveTimeout = null;
		}
		this._socketDisposAbles = dispose(this._socketDisposAbles);
	}

	drAin(): Promise<void> {
		return this._socketWriter.drAin();
	}

	sendDisconnect(): void {
		const msg = new ProtocolMessAge(ProtocolMessAgeType.Disconnect, 0, 0, getEmptyBuffer());
		this._socketWriter.write(msg);
		this._socketWriter.flush();
	}

	privAte _sendKeepAliveCheck(): void {
		if (this._outgoingKeepAliveTimeout) {
			// there will be A check in the neAr future
			return;
		}

		const timeSinceLAstOutgoingMsg = DAte.now() - this._socketWriter.lAstWriteTime;
		if (timeSinceLAstOutgoingMsg >= ProtocolConstAnts.KeepAliveTime) {
			// sufficient time hAs pAssed since lAst messAge wAs written,
			// And no messAge from our side needed to be sent in the meAntime,
			// so we will send A messAge contAining only A keep Alive.
			const msg = new ProtocolMessAge(ProtocolMessAgeType.KeepAlive, 0, 0, getEmptyBuffer());
			this._socketWriter.write(msg);
			this._sendKeepAliveCheck();
			return;
		}

		this._outgoingKeepAliveTimeout = setTimeout(() => {
			this._outgoingKeepAliveTimeout = null;
			this._sendKeepAliveCheck();
		}, ProtocolConstAnts.KeepAliveTime - timeSinceLAstOutgoingMsg + 5);
	}

	privAte _recvKeepAliveCheck(): void {
		if (this._incomingKeepAliveTimeout) {
			// there will be A check in the neAr future
			return;
		}

		const timeSinceLAstIncomingMsg = DAte.now() - this._socketReAder.lAstReAdTime;
		if (timeSinceLAstIncomingMsg >= ProtocolConstAnts.KeepAliveTimeoutTime) {
			// It's been A long time since we received A server messAge
			// But this might be cAused by the event loop being busy And fAiling to reAd messAges
			if (!this._loAdEstimAtor.hAsHighLoAd()) {
				// TrAsh the socket
				this._onSocketTimeout.fire(undefined);
				return;
			}
		}

		this._incomingKeepAliveTimeout = setTimeout(() => {
			this._incomingKeepAliveTimeout = null;
			this._recvKeepAliveCheck();
		}, MAth.mAx(ProtocolConstAnts.KeepAliveTimeoutTime - timeSinceLAstIncomingMsg, 0) + 5);
	}

	public getSocket(): ISocket {
		return this._socket;
	}

	public beginAcceptReconnection(socket: ISocket, initiAlDAtAChunk: VSBuffer | null): void {
		this._isReconnecting = true;

		this._socketDisposAbles = dispose(this._socketDisposAbles);
		this._onControlMessAge.flushBuffer();
		this._onSocketClose.flushBuffer();
		this._onSocketTimeout.flushBuffer();
		this._socket.dispose();

		this._socket = socket;
		this._socketWriter = new ProtocolWriter(this._socket);
		this._socketDisposAbles.push(this._socketWriter);
		this._socketReAder = new ProtocolReAder(this._socket);
		this._socketDisposAbles.push(this._socketReAder);
		this._socketDisposAbles.push(this._socketReAder.onMessAge(msg => this._receiveMessAge(msg)));
		this._socketDisposAbles.push(this._socket.onClose(() => this._onSocketClose.fire()));
		this._socketReAder.AcceptChunk(initiAlDAtAChunk);
	}

	public endAcceptReconnection(): void {
		this._isReconnecting = fAlse;

		// Send AgAin All unAcknowledged messAges
		const toSend = this._outgoingUnAckMsg.toArrAy();
		for (let i = 0, len = toSend.length; i < len; i++) {
			this._socketWriter.write(toSend[i]);
		}
		this._recvAckCheck();

		this._sendKeepAliveCheck();
		this._recvKeepAliveCheck();
	}

	public AcceptDisconnect(): void {
		this._onClose.fire();
	}

	privAte _receiveMessAge(msg: ProtocolMessAge): void {
		if (msg.Ack > this._outgoingAckId) {
			this._outgoingAckId = msg.Ack;
			do {
				const first = this._outgoingUnAckMsg.peek();
				if (first && first.id <= msg.Ack) {
					// this messAge hAs been confirmed, remove it
					this._outgoingUnAckMsg.pop();
				} else {
					breAk;
				}
			} while (true);
		}

		if (msg.type === ProtocolMessAgeType.RegulAr) {
			if (msg.id > this._incomingMsgId) {
				if (msg.id !== this._incomingMsgId + 1) {
					console.error(`PROTOCOL CORRUPTION, LAST SAW MSG ${this._incomingMsgId} AND HAVE NOW RECEIVED MSG ${msg.id}`);
				}
				this._incomingMsgId = msg.id;
				this._incomingMsgLAstTime = DAte.now();
				this._sendAckCheck();
				this._onMessAge.fire(msg.dAtA);
			}
		} else if (msg.type === ProtocolMessAgeType.Control) {
			this._onControlMessAge.fire(msg.dAtA);
		} else if (msg.type === ProtocolMessAgeType.Disconnect) {
			this._onClose.fire();
		}
	}

	reAdEntireBuffer(): VSBuffer {
		return this._socketReAder.reAdEntireBuffer();
	}

	flush(): void {
		this._socketWriter.flush();
	}

	send(buffer: VSBuffer): void {
		const myId = ++this._outgoingMsgId;
		this._incomingAckId = this._incomingMsgId;
		const msg = new ProtocolMessAge(ProtocolMessAgeType.RegulAr, myId, this._incomingAckId, buffer);
		this._outgoingUnAckMsg.push(msg);
		if (!this._isReconnecting) {
			this._socketWriter.write(msg);
			this._recvAckCheck();
		}
	}

	/**
	 * Send A messAge which will not be pArt of the regulAr Acknowledge flow.
	 * Use this for eArly control messAges which Are repeAted in cAse of reconnection.
	 */
	sendControl(buffer: VSBuffer): void {
		const msg = new ProtocolMessAge(ProtocolMessAgeType.Control, 0, 0, buffer);
		this._socketWriter.write(msg);
	}

	privAte _sendAckCheck(): void {
		if (this._incomingMsgId <= this._incomingAckId) {
			// nothink to Acknowledge
			return;
		}

		if (this._incomingAckTimeout) {
			// there will be A check in the neAr future
			return;
		}

		const timeSinceLAstIncomingMsg = DAte.now() - this._incomingMsgLAstTime;
		if (timeSinceLAstIncomingMsg >= ProtocolConstAnts.AcknowledgeTime) {
			// sufficient time hAs pAssed since this messAge hAs been received,
			// And no messAge from our side needed to be sent in the meAntime,
			// so we will send A messAge contAining only An Ack.
			this._sendAck();
			return;
		}

		this._incomingAckTimeout = setTimeout(() => {
			this._incomingAckTimeout = null;
			this._sendAckCheck();
		}, ProtocolConstAnts.AcknowledgeTime - timeSinceLAstIncomingMsg + 5);
	}

	privAte _recvAckCheck(): void {
		if (this._outgoingMsgId <= this._outgoingAckId) {
			// everything hAs been Acknowledged
			return;
		}

		if (this._outgoingAckTimeout) {
			// there will be A check in the neAr future
			return;
		}

		const oldestUnAcknowledgedMsg = this._outgoingUnAckMsg.peek()!;
		const timeSinceOldestUnAcknowledgedMsg = DAte.now() - oldestUnAcknowledgedMsg.writtenTime;
		if (timeSinceOldestUnAcknowledgedMsg >= ProtocolConstAnts.AcknowledgeTimeoutTime) {
			// It's been A long time since our sent messAge wAs Acknowledged
			// But this might be cAused by the event loop being busy And fAiling to reAd messAges
			if (!this._loAdEstimAtor.hAsHighLoAd()) {
				// TrAsh the socket
				this._onSocketTimeout.fire(undefined);
				return;
			}
		}

		this._outgoingAckTimeout = setTimeout(() => {
			this._outgoingAckTimeout = null;
			this._recvAckCheck();
		}, MAth.mAx(ProtocolConstAnts.AcknowledgeTimeoutTime - timeSinceOldestUnAcknowledgedMsg, 0) + 5);
	}

	privAte _sendAck(): void {
		if (this._incomingMsgId <= this._incomingAckId) {
			// nothink to Acknowledge
			return;
		}

		this._incomingAckId = this._incomingMsgId;
		const msg = new ProtocolMessAge(ProtocolMessAgeType.Ack, 0, this._incomingAckId, getEmptyBuffer());
		this._socketWriter.write(msg);
	}
}
