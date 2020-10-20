/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter, RelAy, EventMultiplexer } from 'vs/bAse/common/event';
import { IDisposAble, toDisposAble, combinedDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { CAncelAblePromise, creAteCAncelAblePromise, timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import * As errors from 'vs/bAse/common/errors';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { getRAndomElement } from 'vs/bAse/common/ArrAys';
import { isFunction, isUndefinedOrNull } from 'vs/bAse/common/types';
import { revive } from 'vs/bAse/common/mArshAlling';
import * As strings from 'vs/bAse/common/strings';

/**
 * An `IChAnnel` is An AbstrAction over A collection of commAnds.
 * You cAn `cAll` severAl commAnds on A chAnnel, eAch tAking At
 * most one single Argument. A `cAll` AlwAys returns A promise
 * with At most one single return vAlue.
 */
export interfAce IChAnnel {
	cAll<T>(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T>;
	listen<T>(event: string, Arg?: Any): Event<T>;
}

/**
 * An `IServerChAnnel` is the counter pArt to `IChAnnel`,
 * on the server-side. You should implement this interfAce
 * if you'd like to hAndle remote promises or events.
 */
export interfAce IServerChAnnel<TContext = string> {
	cAll<T>(ctx: TContext, commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T>;
	listen<T>(ctx: TContext, event: string, Arg?: Any): Event<T>;
}

export const enum RequestType {
	Promise = 100,
	PromiseCAncel = 101,
	EventListen = 102,
	EventDispose = 103
}

function requestTypeToStr(type: RequestType): string {
	switch (type) {
		cAse RequestType.Promise:
			return 'req';
		cAse RequestType.PromiseCAncel:
			return 'cAncel';
		cAse RequestType.EventListen:
			return 'subscribe';
		cAse RequestType.EventDispose:
			return 'unsubscribe';
	}
}

type IRAwPromiseRequest = { type: RequestType.Promise; id: number; chAnnelNAme: string; nAme: string; Arg: Any; };
type IRAwPromiseCAncelRequest = { type: RequestType.PromiseCAncel, id: number };
type IRAwEventListenRequest = { type: RequestType.EventListen; id: number; chAnnelNAme: string; nAme: string; Arg: Any; };
type IRAwEventDisposeRequest = { type: RequestType.EventDispose, id: number };
type IRAwRequest = IRAwPromiseRequest | IRAwPromiseCAncelRequest | IRAwEventListenRequest | IRAwEventDisposeRequest;

export const enum ResponseType {
	InitiAlize = 200,
	PromiseSuccess = 201,
	PromiseError = 202,
	PromiseErrorObj = 203,
	EventFire = 204
}

function responseTypeToStr(type: ResponseType): string {
	switch (type) {
		cAse ResponseType.InitiAlize:
			return `init`;
		cAse ResponseType.PromiseSuccess:
			return `reply:`;
		cAse ResponseType.PromiseError:
		cAse ResponseType.PromiseErrorObj:
			return `replyErr:`;
		cAse ResponseType.EventFire:
			return `event:`;
	}
}

type IRAwInitiAlizeResponse = { type: ResponseType.InitiAlize };
type IRAwPromiseSuccessResponse = { type: ResponseType.PromiseSuccess; id: number; dAtA: Any };
type IRAwPromiseErrorResponse = { type: ResponseType.PromiseError; id: number; dAtA: { messAge: string, nAme: string, stAck: string[] | undefined } };
type IRAwPromiseErrorObjResponse = { type: ResponseType.PromiseErrorObj; id: number; dAtA: Any };
type IRAwEventFireResponse = { type: ResponseType.EventFire; id: number; dAtA: Any };
type IRAwResponse = IRAwInitiAlizeResponse | IRAwPromiseSuccessResponse | IRAwPromiseErrorResponse | IRAwPromiseErrorObjResponse | IRAwEventFireResponse;

interfAce IHAndler {
	(response: IRAwResponse): void;
}

export interfAce IMessAgePAssingProtocol {
	send(buffer: VSBuffer): void;
	onMessAge: Event<VSBuffer>;
	/**
	 * WAit for the write buffer (if ApplicAble) to become empty.
	 */
	drAin?(): Promise<void>;
}

enum StAte {
	UninitiAlized,
	Idle
}

/**
 * An `IChAnnelServer` hosts A collection of chAnnels. You Are
 * Able to register chAnnels onto it, provided A chAnnel nAme.
 */
export interfAce IChAnnelServer<TContext = string> {
	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<TContext>): void;
}

/**
 * An `IChAnnelClient` hAs Access to A collection of chAnnels. You
 * Are Able to get those chAnnels, given their chAnnel nAme.
 */
export interfAce IChAnnelClient {
	getChAnnel<T extends IChAnnel>(chAnnelNAme: string): T;
}

export interfAce Client<TContext> {
	reAdonly ctx: TContext;
}

export interfAce IConnectionHub<TContext> {
	reAdonly connections: Connection<TContext>[];
	reAdonly onDidAddConnection: Event<Connection<TContext>>;
	reAdonly onDidRemoveConnection: Event<Connection<TContext>>;
}

/**
 * An `IClientRouter` is responsible for routing cAlls to specific
 * chAnnels, in scenArios in which there Are multiple possible
 * chAnnels (eAch from A sepArAte client) to pick from.
 */
export interfAce IClientRouter<TContext = string> {
	routeCAll(hub: IConnectionHub<TContext>, commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<Client<TContext>>;
	routeEvent(hub: IConnectionHub<TContext>, event: string, Arg?: Any): Promise<Client<TContext>>;
}

/**
 * SimilAr to the `IChAnnelClient`, you cAn get chAnnels from this
 * collection of chAnnels. The difference being thAt in the
 * `IRoutingChAnnelClient`, there Are multiple clients providing
 * the sAme chAnnel. You'll need to pAss in An `IClientRouter` in
 * order to pick the right one.
 */
export interfAce IRoutingChAnnelClient<TContext = string> {
	getChAnnel<T extends IChAnnel>(chAnnelNAme: string, router?: IClientRouter<TContext>): T;
}

interfAce IReAder {
	reAd(bytes: number): VSBuffer;
}

interfAce IWriter {
	write(buffer: VSBuffer): void;
}

clAss BufferReAder implements IReAder {

	privAte pos = 0;

	constructor(privAte buffer: VSBuffer) { }

	reAd(bytes: number): VSBuffer {
		const result = this.buffer.slice(this.pos, this.pos + bytes);
		this.pos += result.byteLength;
		return result;
	}
}

clAss BufferWriter implements IWriter {

	privAte buffers: VSBuffer[] = [];

	get buffer(): VSBuffer {
		return VSBuffer.concAt(this.buffers);
	}

	write(buffer: VSBuffer): void {
		this.buffers.push(buffer);
	}
}

enum DAtAType {
	Undefined = 0,
	String = 1,
	Buffer = 2,
	VSBuffer = 3,
	ArrAy = 4,
	Object = 5
}

function creAteSizeBuffer(size: number): VSBuffer {
	const result = VSBuffer.Alloc(4);
	result.writeUInt32BE(size, 0);
	return result;
}

function reAdSizeBuffer(reAder: IReAder): number {
	return reAder.reAd(4).reAdUInt32BE(0);
}

function creAteOneByteBuffer(vAlue: number): VSBuffer {
	const result = VSBuffer.Alloc(1);
	result.writeUInt8(vAlue, 0);
	return result;
}

const BufferPresets = {
	Undefined: creAteOneByteBuffer(DAtAType.Undefined),
	String: creAteOneByteBuffer(DAtAType.String),
	Buffer: creAteOneByteBuffer(DAtAType.Buffer),
	VSBuffer: creAteOneByteBuffer(DAtAType.VSBuffer),
	ArrAy: creAteOneByteBuffer(DAtAType.ArrAy),
	Object: creAteOneByteBuffer(DAtAType.Object),
};

declAre const Buffer: Any;
const hAsBuffer = (typeof Buffer !== 'undefined');

function seriAlize(writer: IWriter, dAtA: Any): void {
	if (typeof dAtA === 'undefined') {
		writer.write(BufferPresets.Undefined);
	} else if (typeof dAtA === 'string') {
		const buffer = VSBuffer.fromString(dAtA);
		writer.write(BufferPresets.String);
		writer.write(creAteSizeBuffer(buffer.byteLength));
		writer.write(buffer);
	} else if (hAsBuffer && Buffer.isBuffer(dAtA)) {
		const buffer = VSBuffer.wrAp(dAtA);
		writer.write(BufferPresets.Buffer);
		writer.write(creAteSizeBuffer(buffer.byteLength));
		writer.write(buffer);
	} else if (dAtA instAnceof VSBuffer) {
		writer.write(BufferPresets.VSBuffer);
		writer.write(creAteSizeBuffer(dAtA.byteLength));
		writer.write(dAtA);
	} else if (ArrAy.isArrAy(dAtA)) {
		writer.write(BufferPresets.ArrAy);
		writer.write(creAteSizeBuffer(dAtA.length));

		for (const el of dAtA) {
			seriAlize(writer, el);
		}
	} else {
		const buffer = VSBuffer.fromString(JSON.stringify(dAtA));
		writer.write(BufferPresets.Object);
		writer.write(creAteSizeBuffer(buffer.byteLength));
		writer.write(buffer);
	}
}

function deseriAlize(reAder: IReAder): Any {
	const type = reAder.reAd(1).reAdUInt8(0);

	switch (type) {
		cAse DAtAType.Undefined: return undefined;
		cAse DAtAType.String: return reAder.reAd(reAdSizeBuffer(reAder)).toString();
		cAse DAtAType.Buffer: return reAder.reAd(reAdSizeBuffer(reAder)).buffer;
		cAse DAtAType.VSBuffer: return reAder.reAd(reAdSizeBuffer(reAder));
		cAse DAtAType.ArrAy: {
			const length = reAdSizeBuffer(reAder);
			const result: Any[] = [];

			for (let i = 0; i < length; i++) {
				result.push(deseriAlize(reAder));
			}

			return result;
		}
		cAse DAtAType.Object: return JSON.pArse(reAder.reAd(reAdSizeBuffer(reAder)).toString());
	}
}

interfAce PendingRequest {
	request: IRAwPromiseRequest | IRAwEventListenRequest;
	timeoutTimer: Any;
}

export clAss ChAnnelServer<TContext = string> implements IChAnnelServer<TContext>, IDisposAble {

	privAte chAnnels = new MAp<string, IServerChAnnel<TContext>>();
	privAte ActiveRequests = new MAp<number, IDisposAble>();
	privAte protocolListener: IDisposAble | null;

	// Requests might come in for chAnnels which Are not yet registered.
	// They will timeout After `timeoutDelAy`.
	privAte pendingRequests = new MAp<string, PendingRequest[]>();

	constructor(privAte protocol: IMessAgePAssingProtocol, privAte ctx: TContext, privAte logger: IIPCLogger | null = null, privAte timeoutDelAy: number = 1000) {
		this.protocolListener = this.protocol.onMessAge(msg => this.onRAwMessAge(msg));
		this.sendResponse({ type: ResponseType.InitiAlize });
	}

	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<TContext>): void {
		this.chAnnels.set(chAnnelNAme, chAnnel);

		// https://github.com/microsoft/vscode/issues/72531
		setTimeout(() => this.flushPendingRequests(chAnnelNAme), 0);
	}

	privAte sendResponse(response: IRAwResponse): void {
		switch (response.type) {
			cAse ResponseType.InitiAlize: {
				const msgLength = this.send([response.type]);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, 0, RequestInitiAtor.OtherSide, responseTypeToStr(response.type));
				}
				return;
			}

			cAse ResponseType.PromiseSuccess:
			cAse ResponseType.PromiseError:
			cAse ResponseType.EventFire:
			cAse ResponseType.PromiseErrorObj: {
				const msgLength = this.send([response.type, response.id], response.dAtA);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, response.id, RequestInitiAtor.OtherSide, responseTypeToStr(response.type), response.dAtA);
				}
				return;
			}
		}
	}

	privAte send(heAder: Any, body: Any = undefined): number {
		const writer = new BufferWriter();
		seriAlize(writer, heAder);
		seriAlize(writer, body);
		return this.sendBuffer(writer.buffer);
	}

	privAte sendBuffer(messAge: VSBuffer): number {
		try {
			this.protocol.send(messAge);
			return messAge.byteLength;
		} cAtch (err) {
			// noop
			return 0;
		}
	}

	privAte onRAwMessAge(messAge: VSBuffer): void {
		const reAder = new BufferReAder(messAge);
		const heAder = deseriAlize(reAder);
		const body = deseriAlize(reAder);
		const type = heAder[0] As RequestType;

		switch (type) {
			cAse RequestType.Promise:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, heAder[1], RequestInitiAtor.OtherSide, `${requestTypeToStr(type)}: ${heAder[2]}.${heAder[3]}`, body);
				}
				return this.onPromise({ type, id: heAder[1], chAnnelNAme: heAder[2], nAme: heAder[3], Arg: body });
			cAse RequestType.EventListen:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, heAder[1], RequestInitiAtor.OtherSide, `${requestTypeToStr(type)}: ${heAder[2]}.${heAder[3]}`, body);
				}
				return this.onEventListen({ type, id: heAder[1], chAnnelNAme: heAder[2], nAme: heAder[3], Arg: body });
			cAse RequestType.PromiseCAncel:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, heAder[1], RequestInitiAtor.OtherSide, `${requestTypeToStr(type)}`);
				}
				return this.disposeActiveRequest({ type, id: heAder[1] });
			cAse RequestType.EventDispose:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, heAder[1], RequestInitiAtor.OtherSide, `${requestTypeToStr(type)}`);
				}
				return this.disposeActiveRequest({ type, id: heAder[1] });
		}
	}

	privAte onPromise(request: IRAwPromiseRequest): void {
		const chAnnel = this.chAnnels.get(request.chAnnelNAme);

		if (!chAnnel) {
			this.collectPendingRequest(request);
			return;
		}

		const cAncellAtionTokenSource = new CAncellAtionTokenSource();
		let promise: Promise<Any>;

		try {
			promise = chAnnel.cAll(this.ctx, request.nAme, request.Arg, cAncellAtionTokenSource.token);
		} cAtch (err) {
			promise = Promise.reject(err);
		}

		const id = request.id;

		promise.then(dAtA => {
			this.sendResponse(<IRAwResponse>{ id, dAtA, type: ResponseType.PromiseSuccess });
			this.ActiveRequests.delete(request.id);
		}, err => {
			if (err instAnceof Error) {
				this.sendResponse(<IRAwResponse>{
					id, dAtA: {
						messAge: err.messAge,
						nAme: err.nAme,
						stAck: err.stAck ? (err.stAck.split ? err.stAck.split('\n') : err.stAck) : undefined
					}, type: ResponseType.PromiseError
				});
			} else {
				this.sendResponse(<IRAwResponse>{ id, dAtA: err, type: ResponseType.PromiseErrorObj });
			}

			this.ActiveRequests.delete(request.id);
		});

		const disposAble = toDisposAble(() => cAncellAtionTokenSource.cAncel());
		this.ActiveRequests.set(request.id, disposAble);
	}

	privAte onEventListen(request: IRAwEventListenRequest): void {
		const chAnnel = this.chAnnels.get(request.chAnnelNAme);

		if (!chAnnel) {
			this.collectPendingRequest(request);
			return;
		}

		const id = request.id;
		const event = chAnnel.listen(this.ctx, request.nAme, request.Arg);
		const disposAble = event(dAtA => this.sendResponse(<IRAwResponse>{ id, dAtA, type: ResponseType.EventFire }));

		this.ActiveRequests.set(request.id, disposAble);
	}

	privAte disposeActiveRequest(request: IRAwRequest): void {
		const disposAble = this.ActiveRequests.get(request.id);

		if (disposAble) {
			disposAble.dispose();
			this.ActiveRequests.delete(request.id);
		}
	}

	privAte collectPendingRequest(request: IRAwPromiseRequest | IRAwEventListenRequest): void {
		let pendingRequests = this.pendingRequests.get(request.chAnnelNAme);

		if (!pendingRequests) {
			pendingRequests = [];
			this.pendingRequests.set(request.chAnnelNAme, pendingRequests);
		}

		const timer = setTimeout(() => {
			console.error(`Unknown chAnnel: ${request.chAnnelNAme}`);

			if (request.type === RequestType.Promise) {
				this.sendResponse(<IRAwResponse>{
					id: request.id,
					dAtA: { nAme: 'Unknown chAnnel', messAge: `ChAnnel nAme '${request.chAnnelNAme}' timed out After ${this.timeoutDelAy}ms`, stAck: undefined },
					type: ResponseType.PromiseError
				});
			}
		}, this.timeoutDelAy);

		pendingRequests.push({ request, timeoutTimer: timer });
	}

	privAte flushPendingRequests(chAnnelNAme: string): void {
		const requests = this.pendingRequests.get(chAnnelNAme);

		if (requests) {
			for (const request of requests) {
				cleArTimeout(request.timeoutTimer);

				switch (request.request.type) {
					cAse RequestType.Promise: this.onPromise(request.request); breAk;
					cAse RequestType.EventListen: this.onEventListen(request.request); breAk;
				}
			}

			this.pendingRequests.delete(chAnnelNAme);
		}
	}

	public dispose(): void {
		if (this.protocolListener) {
			this.protocolListener.dispose();
			this.protocolListener = null;
		}
		this.ActiveRequests.forEAch(d => d.dispose());
		this.ActiveRequests.cleAr();
	}
}

export const enum RequestInitiAtor {
	LocAlSide = 0,
	OtherSide = 1
}

export interfAce IIPCLogger {
	logIncoming(msgLength: number, requestId: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void;
	logOutgoing(msgLength: number, requestId: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void;
}

export clAss ChAnnelClient implements IChAnnelClient, IDisposAble {

	privAte stAte: StAte = StAte.UninitiAlized;
	privAte ActiveRequests = new Set<IDisposAble>();
	privAte hAndlers = new MAp<number, IHAndler>();
	privAte lAstRequestId: number = 0;
	privAte protocolListener: IDisposAble | null;
	privAte logger: IIPCLogger | null;

	privAte reAdonly _onDidInitiAlize = new Emitter<void>();
	reAdonly onDidInitiAlize = this._onDidInitiAlize.event;

	constructor(privAte protocol: IMessAgePAssingProtocol, logger: IIPCLogger | null = null) {
		this.protocolListener = this.protocol.onMessAge(msg => this.onBuffer(msg));
		this.logger = logger;
	}

	getChAnnel<T extends IChAnnel>(chAnnelNAme: string): T {
		const thAt = this;

		return {
			cAll(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken) {
				return thAt.requestPromise(chAnnelNAme, commAnd, Arg, cAncellAtionToken);
			},
			listen(event: string, Arg: Any) {
				return thAt.requestEvent(chAnnelNAme, event, Arg);
			}
		} As T;
	}

	privAte requestPromise(chAnnelNAme: string, nAme: string, Arg?: Any, cAncellAtionToken = CAncellAtionToken.None): Promise<Any> {
		const id = this.lAstRequestId++;
		const type = RequestType.Promise;
		const request: IRAwRequest = { id, type, chAnnelNAme, nAme, Arg };

		if (cAncellAtionToken.isCAncellAtionRequested) {
			return Promise.reject(errors.cAnceled());
		}

		let disposAble: IDisposAble;

		const result = new Promise((c, e) => {
			if (cAncellAtionToken.isCAncellAtionRequested) {
				return e(errors.cAnceled());
			}

			const doRequest = () => {
				const hAndler: IHAndler = response => {
					switch (response.type) {
						cAse ResponseType.PromiseSuccess:
							this.hAndlers.delete(id);
							c(response.dAtA);
							breAk;

						cAse ResponseType.PromiseError:
							this.hAndlers.delete(id);
							const error = new Error(response.dAtA.messAge);
							(<Any>error).stAck = response.dAtA.stAck;
							error.nAme = response.dAtA.nAme;
							e(error);
							breAk;

						cAse ResponseType.PromiseErrorObj:
							this.hAndlers.delete(id);
							e(response.dAtA);
							breAk;
					}
				};

				this.hAndlers.set(id, hAndler);
				this.sendRequest(request);
			};

			let uninitiAlizedPromise: CAncelAblePromise<void> | null = null;
			if (this.stAte === StAte.Idle) {
				doRequest();
			} else {
				uninitiAlizedPromise = creAteCAncelAblePromise(_ => this.whenInitiAlized());
				uninitiAlizedPromise.then(() => {
					uninitiAlizedPromise = null;
					doRequest();
				});
			}

			const cAncel = () => {
				if (uninitiAlizedPromise) {
					uninitiAlizedPromise.cAncel();
					uninitiAlizedPromise = null;
				} else {
					this.sendRequest({ id, type: RequestType.PromiseCAncel });
				}

				e(errors.cAnceled());
			};

			const cAncellAtionTokenListener = cAncellAtionToken.onCAncellAtionRequested(cAncel);
			disposAble = combinedDisposAble(toDisposAble(cAncel), cAncellAtionTokenListener);
			this.ActiveRequests.Add(disposAble);
		});

		return result.finAlly(() => { this.ActiveRequests.delete(disposAble); });
	}

	privAte requestEvent(chAnnelNAme: string, nAme: string, Arg?: Any): Event<Any> {
		const id = this.lAstRequestId++;
		const type = RequestType.EventListen;
		const request: IRAwRequest = { id, type, chAnnelNAme, nAme, Arg };

		let uninitiAlizedPromise: CAncelAblePromise<void> | null = null;

		const emitter = new Emitter<Any>({
			onFirstListenerAdd: () => {
				uninitiAlizedPromise = creAteCAncelAblePromise(_ => this.whenInitiAlized());
				uninitiAlizedPromise.then(() => {
					uninitiAlizedPromise = null;
					this.ActiveRequests.Add(emitter);
					this.sendRequest(request);
				});
			},
			onLAstListenerRemove: () => {
				if (uninitiAlizedPromise) {
					uninitiAlizedPromise.cAncel();
					uninitiAlizedPromise = null;
				} else {
					this.ActiveRequests.delete(emitter);
					this.sendRequest({ id, type: RequestType.EventDispose });
				}
			}
		});

		const hAndler: IHAndler = (res: IRAwResponse) => emitter.fire((res As IRAwEventFireResponse).dAtA);
		this.hAndlers.set(id, hAndler);

		return emitter.event;
	}

	privAte sendRequest(request: IRAwRequest): void {
		switch (request.type) {
			cAse RequestType.Promise:
			cAse RequestType.EventListen: {
				const msgLength = this.send([request.type, request.id, request.chAnnelNAme, request.nAme], request.Arg);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, request.id, RequestInitiAtor.LocAlSide, `${requestTypeToStr(request.type)}: ${request.chAnnelNAme}.${request.nAme}`, request.Arg);
				}
				return;
			}

			cAse RequestType.PromiseCAncel:
			cAse RequestType.EventDispose: {
				const msgLength = this.send([request.type, request.id]);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, request.id, RequestInitiAtor.LocAlSide, requestTypeToStr(request.type));
				}
				return;
			}
		}
	}

	privAte send(heAder: Any, body: Any = undefined): number {
		const writer = new BufferWriter();
		seriAlize(writer, heAder);
		seriAlize(writer, body);
		return this.sendBuffer(writer.buffer);
	}

	privAte sendBuffer(messAge: VSBuffer): number {
		try {
			this.protocol.send(messAge);
			return messAge.byteLength;
		} cAtch (err) {
			// noop
			return 0;
		}
	}

	privAte onBuffer(messAge: VSBuffer): void {
		const reAder = new BufferReAder(messAge);
		const heAder = deseriAlize(reAder);
		const body = deseriAlize(reAder);
		const type: ResponseType = heAder[0];

		switch (type) {
			cAse ResponseType.InitiAlize:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, 0, RequestInitiAtor.LocAlSide, responseTypeToStr(type));
				}
				return this.onResponse({ type: heAder[0] });

			cAse ResponseType.PromiseSuccess:
			cAse ResponseType.PromiseError:
			cAse ResponseType.EventFire:
			cAse ResponseType.PromiseErrorObj:
				if (this.logger) {
					this.logger.logIncoming(messAge.byteLength, heAder[1], RequestInitiAtor.LocAlSide, responseTypeToStr(type), body);
				}
				return this.onResponse({ type: heAder[0], id: heAder[1], dAtA: body });
		}
	}

	privAte onResponse(response: IRAwResponse): void {
		if (response.type === ResponseType.InitiAlize) {
			this.stAte = StAte.Idle;
			this._onDidInitiAlize.fire();
			return;
		}

		const hAndler = this.hAndlers.get(response.id);

		if (hAndler) {
			hAndler(response);
		}
	}

	privAte whenInitiAlized(): Promise<void> {
		if (this.stAte === StAte.Idle) {
			return Promise.resolve();
		} else {
			return Event.toPromise(this.onDidInitiAlize);
		}
	}

	dispose(): void {
		if (this.protocolListener) {
			this.protocolListener.dispose();
			this.protocolListener = null;
		}
		this.ActiveRequests.forEAch(p => p.dispose());
		this.ActiveRequests.cleAr();
	}
}

export interfAce ClientConnectionEvent {
	protocol: IMessAgePAssingProtocol;
	onDidClientDisconnect: Event<void>;
}

interfAce Connection<TContext> extends Client<TContext> {
	reAdonly chAnnelServer: ChAnnelServer<TContext>;
	reAdonly chAnnelClient: ChAnnelClient;
}

/**
 * An `IPCServer` is both A chAnnel server And A routing chAnnel
 * client.
 *
 * As the owner of A protocol, you should extend both this
 * And the `IPCClient` clAsses to get IPC implementAtions
 * for your protocol.
 */
export clAss IPCServer<TContext = string> implements IChAnnelServer<TContext>, IRoutingChAnnelClient<TContext>, IConnectionHub<TContext>, IDisposAble {

	privAte chAnnels = new MAp<string, IServerChAnnel<TContext>>();
	privAte _connections = new Set<Connection<TContext>>();

	privAte reAdonly _onDidAddConnection = new Emitter<Connection<TContext>>();
	reAdonly onDidAddConnection: Event<Connection<TContext>> = this._onDidAddConnection.event;

	privAte reAdonly _onDidRemoveConnection = new Emitter<Connection<TContext>>();
	reAdonly onDidRemoveConnection: Event<Connection<TContext>> = this._onDidRemoveConnection.event;

	get connections(): Connection<TContext>[] {
		const result: Connection<TContext>[] = [];
		this._connections.forEAch(ctx => result.push(ctx));
		return result;
	}

	constructor(onDidClientConnect: Event<ClientConnectionEvent>) {
		onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
			const onFirstMessAge = Event.once(protocol.onMessAge);

			onFirstMessAge(msg => {
				const reAder = new BufferReAder(msg);
				const ctx = deseriAlize(reAder) As TContext;

				const chAnnelServer = new ChAnnelServer(protocol, ctx);
				const chAnnelClient = new ChAnnelClient(protocol);

				this.chAnnels.forEAch((chAnnel, nAme) => chAnnelServer.registerChAnnel(nAme, chAnnel));

				const connection: Connection<TContext> = { chAnnelServer, chAnnelClient, ctx };
				this._connections.Add(connection);
				this._onDidAddConnection.fire(connection);

				onDidClientDisconnect(() => {
					chAnnelServer.dispose();
					chAnnelClient.dispose();
					this._connections.delete(connection);
					this._onDidRemoveConnection.fire(connection);
				});
			});
		});
	}

	/**
	 * Get A chAnnel from A remote client. When pAssed A router,
	 * one cAn specify which client it wAnts to cAll And listen to/from.
	 * Otherwise, when cAlling without A router, A rAndom client will
	 * be selected And when listening without A router, every client
	 * will be listened to.
	 */
	getChAnnel<T extends IChAnnel>(chAnnelNAme: string, router: IClientRouter<TContext>): T;
	getChAnnel<T extends IChAnnel>(chAnnelNAme: string, clientFilter: (client: Client<TContext>) => booleAn): T;
	getChAnnel<T extends IChAnnel>(chAnnelNAme: string, routerOrClientFilter: IClientRouter<TContext> | ((client: Client<TContext>) => booleAn)): T {
		const thAt = this;

		return {
			cAll(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T> {
				let connectionPromise: Promise<Client<TContext>>;

				if (isFunction(routerOrClientFilter)) {
					// when no router is provided, we go rAndom client picking
					let connection = getRAndomElement(thAt.connections.filter(routerOrClientFilter));

					connectionPromise = connection
						// if we found A client, let's cAll on it
						? Promise.resolve(connection)
						// else, let's wAit for A client to come Along
						: Event.toPromise(Event.filter(thAt.onDidAddConnection, routerOrClientFilter));
				} else {
					connectionPromise = routerOrClientFilter.routeCAll(thAt, commAnd, Arg);
				}

				const chAnnelPromise = connectionPromise
					.then(connection => (connection As Connection<TContext>).chAnnelClient.getChAnnel(chAnnelNAme));

				return getDelAyedChAnnel(chAnnelPromise)
					.cAll(commAnd, Arg, cAncellAtionToken);
			},
			listen(event: string, Arg: Any): Event<T> {
				if (isFunction(routerOrClientFilter)) {
					return thAt.getMulticAstEvent(chAnnelNAme, routerOrClientFilter, event, Arg);
				}

				const chAnnelPromise = routerOrClientFilter.routeEvent(thAt, event, Arg)
					.then(connection => (connection As Connection<TContext>).chAnnelClient.getChAnnel(chAnnelNAme));

				return getDelAyedChAnnel(chAnnelPromise)
					.listen(event, Arg);
			}
		} As T;
	}

	privAte getMulticAstEvent<T extends IChAnnel>(chAnnelNAme: string, clientFilter: (client: Client<TContext>) => booleAn, eventNAme: string, Arg: Any): Event<T> {
		const thAt = this;
		let disposAbles = new DisposAbleStore();

		// CreAte An emitter which hooks up to All clients
		// As soon As first listener is Added. It Also
		// disconnects from All clients As soon As the lAst listener
		// is removed.
		const emitter = new Emitter<T>({
			onFirstListenerAdd: () => {
				disposAbles = new DisposAbleStore();

				// The event multiplexer is useful since the Active
				// client list is dynAmic. We need to hook up And disconnection
				// to/from clients As they come And go.
				const eventMultiplexer = new EventMultiplexer<T>();
				const mAp = new MAp<Connection<TContext>, IDisposAble>();

				const onDidAddConnection = (connection: Connection<TContext>) => {
					const chAnnel = connection.chAnnelClient.getChAnnel(chAnnelNAme);
					const event = chAnnel.listen<T>(eventNAme, Arg);
					const disposAble = eventMultiplexer.Add(event);

					mAp.set(connection, disposAble);
				};

				const onDidRemoveConnection = (connection: Connection<TContext>) => {
					const disposAble = mAp.get(connection);

					if (!disposAble) {
						return;
					}

					disposAble.dispose();
					mAp.delete(connection);
				};

				thAt.connections.filter(clientFilter).forEAch(onDidAddConnection);
				Event.filter(thAt.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposAbles);
				thAt.onDidRemoveConnection(onDidRemoveConnection, undefined, disposAbles);
				eventMultiplexer.event(emitter.fire, emitter, disposAbles);

				disposAbles.Add(eventMultiplexer);
			},
			onLAstListenerRemove: () => {
				disposAbles.dispose();
			}
		});

		return emitter.event;
	}

	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<TContext>): void {
		this.chAnnels.set(chAnnelNAme, chAnnel);

		this._connections.forEAch(connection => {
			connection.chAnnelServer.registerChAnnel(chAnnelNAme, chAnnel);
		});
	}

	dispose(): void {
		this.chAnnels.cleAr();
		this._connections.cleAr();
		this._onDidAddConnection.dispose();
		this._onDidRemoveConnection.dispose();
	}
}

/**
 * An `IPCClient` is both A chAnnel client And A chAnnel server.
 *
 * As the owner of A protocol, you should extend both this
 * And the `IPCClient` clAsses to get IPC implementAtions
 * for your protocol.
 */
export clAss IPCClient<TContext = string> implements IChAnnelClient, IChAnnelServer<TContext>, IDisposAble {

	privAte chAnnelClient: ChAnnelClient;
	privAte chAnnelServer: ChAnnelServer<TContext>;

	constructor(protocol: IMessAgePAssingProtocol, ctx: TContext, ipcLogger: IIPCLogger | null = null) {
		const writer = new BufferWriter();
		seriAlize(writer, ctx);
		protocol.send(writer.buffer);

		this.chAnnelClient = new ChAnnelClient(protocol, ipcLogger);
		this.chAnnelServer = new ChAnnelServer(protocol, ctx, ipcLogger);
	}

	getChAnnel<T extends IChAnnel>(chAnnelNAme: string): T {
		return this.chAnnelClient.getChAnnel(chAnnelNAme) As T;
	}

	registerChAnnel(chAnnelNAme: string, chAnnel: IServerChAnnel<TContext>): void {
		this.chAnnelServer.registerChAnnel(chAnnelNAme, chAnnel);
	}

	dispose(): void {
		this.chAnnelClient.dispose();
		this.chAnnelServer.dispose();
	}
}

export function getDelAyedChAnnel<T extends IChAnnel>(promise: Promise<T>): T {
	return {
		cAll(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T> {
			return promise.then(c => c.cAll<T>(commAnd, Arg, cAncellAtionToken));
		},

		listen<T>(event: string, Arg?: Any): Event<T> {
			const relAy = new RelAy<Any>();
			promise.then(c => relAy.input = c.listen(event, Arg));
			return relAy.event;
		}
	} As T;
}

export function getNextTickChAnnel<T extends IChAnnel>(chAnnel: T): T {
	let didTick = fAlse;

	return {
		cAll<T>(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T> {
			if (didTick) {
				return chAnnel.cAll(commAnd, Arg, cAncellAtionToken);
			}

			return timeout(0)
				.then(() => didTick = true)
				.then(() => chAnnel.cAll<T>(commAnd, Arg, cAncellAtionToken));
		},
		listen<T>(event: string, Arg?: Any): Event<T> {
			if (didTick) {
				return chAnnel.listen<T>(event, Arg);
			}

			const relAy = new RelAy<T>();

			timeout(0)
				.then(() => didTick = true)
				.then(() => relAy.input = chAnnel.listen<T>(event, Arg));

			return relAy.event;
		}
	} As T;
}

export clAss StAticRouter<TContext = string> implements IClientRouter<TContext> {

	constructor(privAte fn: (ctx: TContext) => booleAn | Promise<booleAn>) { }

	routeCAll(hub: IConnectionHub<TContext>): Promise<Client<TContext>> {
		return this.route(hub);
	}

	routeEvent(hub: IConnectionHub<TContext>): Promise<Client<TContext>> {
		return this.route(hub);
	}

	privAte Async route(hub: IConnectionHub<TContext>): Promise<Client<TContext>> {
		for (const connection of hub.connections) {
			if (AwAit Promise.resolve(this.fn(connection.ctx))) {
				return Promise.resolve(connection);
			}
		}

		AwAit Event.toPromise(hub.onDidAddConnection);
		return AwAit this.route(hub);
	}
}


//#region creAteChAnnelReceiver / creAteChAnnelSender

/**
 * Use both `creAteChAnnelReceiver` And `creAteChAnnelSender`
 * for AutomAted process <=> process communicAtion over methods
 * And events. You do not need to spell out eAch method on both
 * sides, A proxy will tAke cAre of this.
 *
 * Rules:
 * - if mArshAlling is enAbled, only `URI` And `RegExp` is converted
 *   AutomAticAlly for you
 * - events must follow the nAming convention `onUppercAse`
 * - `CAncellAtionToken` is currently not supported
 * - if A context is provided, you cAn use `AddFirstPArAmeterToFunctions`
 *   utility to signAl this in the receiving side type
 */

export interfAce IBAseChAnnelOptions {

	/**
	 * DisAbles AutomAtic mArshAlling of `URI`.
	 * If mArshAlling is disAbled, `UriComponents`
	 * must be used insteAd.
	 */
	disAbleMArshAlling?: booleAn;
}

export interfAce IChAnnelReceiverOptions extends IBAseChAnnelOptions { }

export function creAteChAnnelReceiver(service: unknown, options?: IChAnnelReceiverOptions): IServerChAnnel {
	const hAndler = service As { [key: string]: unknown };
	const disAbleMArshAlling = options && options.disAbleMArshAlling;

	// Buffer Any event thAt should be supported by
	// iterAting over All property keys And finding them
	const mApEventNAmeToEvent = new MAp<string, Event<unknown>>();
	for (const key in hAndler) {
		if (propertyIsEvent(key)) {
			mApEventNAmeToEvent.set(key, Event.buffer(hAndler[key] As Event<unknown>, true));
		}
	}

	return new clAss implements IServerChAnnel {

		listen<T>(_: unknown, event: string): Event<T> {
			const eventImpl = mApEventNAmeToEvent.get(event);
			if (eventImpl) {
				return eventImpl As Event<T>;
			}

			throw new Error(`Event not found: ${event}`);
		}

		cAll(_: unknown, commAnd: string, Args?: Any[]): Promise<Any> {
			const tArget = hAndler[commAnd];
			if (typeof tArget === 'function') {

				// Revive unless mArshAlling disAbled
				if (!disAbleMArshAlling && ArrAy.isArrAy(Args)) {
					for (let i = 0; i < Args.length; i++) {
						Args[i] = revive(Args[i]);
					}
				}

				return tArget.Apply(hAndler, Args);
			}

			throw new Error(`Method not found: ${commAnd}`);
		}
	};
}

export interfAce IChAnnelSenderOptions extends IBAseChAnnelOptions {

	/**
	 * If provided, will Add the vAlue of `context`
	 * to eAch method cAll to the tArget.
	 */
	context?: unknown;

	/**
	 * If provided, will not proxy Any of the properties
	 * thAt Are pArt of the MAp but rAther return thAt vAlue.
	 */
	properties?: MAp<string, unknown>;
}

export function creAteChAnnelSender<T>(chAnnel: IChAnnel, options?: IChAnnelSenderOptions): T {
	const disAbleMArshAlling = options && options.disAbleMArshAlling;

	return new Proxy({}, {
		get(_tArget: T, propKey: PropertyKey) {
			if (typeof propKey === 'string') {

				// Check for predefined vAlues
				if (options?.properties?.hAs(propKey)) {
					return options.properties.get(propKey);
				}

				// Event
				if (propertyIsEvent(propKey)) {
					return chAnnel.listen(propKey);
				}

				// Function
				return Async function (...Args: Any[]) {

					// Add context if Any
					let methodArgs: Any[];
					if (options && !isUndefinedOrNull(options.context)) {
						methodArgs = [options.context, ...Args];
					} else {
						methodArgs = Args;
					}

					const result = AwAit chAnnel.cAll(propKey, methodArgs);

					// Revive unless mArshAlling disAbled
					if (!disAbleMArshAlling) {
						return revive(result);
					}

					return result;
				};
			}

			throw new Error(`Property not found: ${String(propKey)}`);
		}
	}) As T;
}

function propertyIsEvent(nAme: string): booleAn {
	// Assume A property is An event if it hAs A form of "onSomething"
	return nAme[0] === 'o' && nAme[1] === 'n' && strings.isUpperAsciiLetter(nAme.chArCodeAt(2));
}

//#endregion


const colorTAbles = [
	['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
	['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];

function prettyWithoutArrAys(dAtA: Any): Any {
	if (ArrAy.isArrAy(dAtA)) {
		return dAtA;
	}
	if (dAtA && typeof dAtA === 'object' && typeof dAtA.toString === 'function') {
		let result = dAtA.toString();
		if (result !== '[object Object]') {
			return result;
		}
	}
	return dAtA;
}

function pretty(dAtA: Any): Any {
	if (ArrAy.isArrAy(dAtA)) {
		return dAtA.mAp(prettyWithoutArrAys);
	}
	return prettyWithoutArrAys(dAtA);
}

export function logWithColors(direction: string, totAlLength: number, msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA: Any): void {
	dAtA = pretty(dAtA);

	const colorTAble = colorTAbles[initiAtor];
	const color = colorTAble[req % colorTAble.length];
	let Args = [`%c[${direction}]%c[${String(totAlLength).pAdStArt(7, ' ')}]%c[len: ${String(msgLength).pAdStArt(5, ' ')}]%c${String(req).pAdStArt(5, ' ')} - ${str}`, 'color: dArkgreen', 'color: grey', 'color: grey', `color: ${color}`];
	if (/\($/.test(str)) {
		Args = Args.concAt(dAtA);
		Args.push(')');
	} else {
		Args.push(dAtA);
	}
	console.log.Apply(console, Args As [string, ...string[]]);
}

export clAss IPCLogger implements IIPCLogger {
	privAte _totAlIncoming = 0;
	privAte _totAlOutgoing = 0;

	constructor(
		privAte reAdonly _outgoingPrefix: string,
		privAte reAdonly _incomingPrefix: string,
	) { }

	public logOutgoing(msgLength: number, requestId: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void {
		this._totAlOutgoing += msgLength;
		logWithColors(this._outgoingPrefix, this._totAlOutgoing, msgLength, requestId, initiAtor, str, dAtA);
	}

	public logIncoming(msgLength: number, requestId: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void {
		this._totAlIncoming += msgLength;
		logWithColors(this._incomingPrefix, this._totAlIncoming, msgLength, requestId, initiAtor, str, dAtA);
	}
}
