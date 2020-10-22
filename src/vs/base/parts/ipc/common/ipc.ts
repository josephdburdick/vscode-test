/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter, Relay, EventMultiplexer } from 'vs/Base/common/event';
import { IDisposaBle, toDisposaBle, comBinedDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { CancelaBlePromise, createCancelaBlePromise, timeout } from 'vs/Base/common/async';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import * as errors from 'vs/Base/common/errors';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { getRandomElement } from 'vs/Base/common/arrays';
import { isFunction, isUndefinedOrNull } from 'vs/Base/common/types';
import { revive } from 'vs/Base/common/marshalling';
import * as strings from 'vs/Base/common/strings';

/**
 * An `IChannel` is an aBstraction over a collection of commands.
 * You can `call` several commands on a channel, each taking at
 * most one single argument. A `call` always returns a promise
 * with at most one single return value.
 */
export interface IChannel {
	call<T>(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
	listen<T>(event: string, arg?: any): Event<T>;
}

/**
 * An `IServerChannel` is the counter part to `IChannel`,
 * on the server-side. You should implement this interface
 * if you'd like to handle remote promises or events.
 */
export interface IServerChannel<TContext = string> {
	call<T>(ctx: TContext, command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T>;
	listen<T>(ctx: TContext, event: string, arg?: any): Event<T>;
}

export const enum RequestType {
	Promise = 100,
	PromiseCancel = 101,
	EventListen = 102,
	EventDispose = 103
}

function requestTypeToStr(type: RequestType): string {
	switch (type) {
		case RequestType.Promise:
			return 'req';
		case RequestType.PromiseCancel:
			return 'cancel';
		case RequestType.EventListen:
			return 'suBscriBe';
		case RequestType.EventDispose:
			return 'unsuBscriBe';
	}
}

type IRawPromiseRequest = { type: RequestType.Promise; id: numBer; channelName: string; name: string; arg: any; };
type IRawPromiseCancelRequest = { type: RequestType.PromiseCancel, id: numBer };
type IRawEventListenRequest = { type: RequestType.EventListen; id: numBer; channelName: string; name: string; arg: any; };
type IRawEventDisposeRequest = { type: RequestType.EventDispose, id: numBer };
type IRawRequest = IRawPromiseRequest | IRawPromiseCancelRequest | IRawEventListenRequest | IRawEventDisposeRequest;

export const enum ResponseType {
	Initialize = 200,
	PromiseSuccess = 201,
	PromiseError = 202,
	PromiseErrorOBj = 203,
	EventFire = 204
}

function responseTypeToStr(type: ResponseType): string {
	switch (type) {
		case ResponseType.Initialize:
			return `init`;
		case ResponseType.PromiseSuccess:
			return `reply:`;
		case ResponseType.PromiseError:
		case ResponseType.PromiseErrorOBj:
			return `replyErr:`;
		case ResponseType.EventFire:
			return `event:`;
	}
}

type IRawInitializeResponse = { type: ResponseType.Initialize };
type IRawPromiseSuccessResponse = { type: ResponseType.PromiseSuccess; id: numBer; data: any };
type IRawPromiseErrorResponse = { type: ResponseType.PromiseError; id: numBer; data: { message: string, name: string, stack: string[] | undefined } };
type IRawPromiseErrorOBjResponse = { type: ResponseType.PromiseErrorOBj; id: numBer; data: any };
type IRawEventFireResponse = { type: ResponseType.EventFire; id: numBer; data: any };
type IRawResponse = IRawInitializeResponse | IRawPromiseSuccessResponse | IRawPromiseErrorResponse | IRawPromiseErrorOBjResponse | IRawEventFireResponse;

interface IHandler {
	(response: IRawResponse): void;
}

export interface IMessagePassingProtocol {
	send(Buffer: VSBuffer): void;
	onMessage: Event<VSBuffer>;
	/**
	 * Wait for the write Buffer (if applicaBle) to Become empty.
	 */
	drain?(): Promise<void>;
}

enum State {
	Uninitialized,
	Idle
}

/**
 * An `IChannelServer` hosts a collection of channels. You are
 * aBle to register channels onto it, provided a channel name.
 */
export interface IChannelServer<TContext = string> {
	registerChannel(channelName: string, channel: IServerChannel<TContext>): void;
}

/**
 * An `IChannelClient` has access to a collection of channels. You
 * are aBle to get those channels, given their channel name.
 */
export interface IChannelClient {
	getChannel<T extends IChannel>(channelName: string): T;
}

export interface Client<TContext> {
	readonly ctx: TContext;
}

export interface IConnectionHuB<TContext> {
	readonly connections: Connection<TContext>[];
	readonly onDidAddConnection: Event<Connection<TContext>>;
	readonly onDidRemoveConnection: Event<Connection<TContext>>;
}

/**
 * An `IClientRouter` is responsiBle for routing calls to specific
 * channels, in scenarios in which there are multiple possiBle
 * channels (each from a separate client) to pick from.
 */
export interface IClientRouter<TContext = string> {
	routeCall(huB: IConnectionHuB<TContext>, command: string, arg?: any, cancellationToken?: CancellationToken): Promise<Client<TContext>>;
	routeEvent(huB: IConnectionHuB<TContext>, event: string, arg?: any): Promise<Client<TContext>>;
}

/**
 * Similar to the `IChannelClient`, you can get channels from this
 * collection of channels. The difference Being that in the
 * `IRoutingChannelClient`, there are multiple clients providing
 * the same channel. You'll need to pass in an `IClientRouter` in
 * order to pick the right one.
 */
export interface IRoutingChannelClient<TContext = string> {
	getChannel<T extends IChannel>(channelName: string, router?: IClientRouter<TContext>): T;
}

interface IReader {
	read(Bytes: numBer): VSBuffer;
}

interface IWriter {
	write(Buffer: VSBuffer): void;
}

class BufferReader implements IReader {

	private pos = 0;

	constructor(private Buffer: VSBuffer) { }

	read(Bytes: numBer): VSBuffer {
		const result = this.Buffer.slice(this.pos, this.pos + Bytes);
		this.pos += result.ByteLength;
		return result;
	}
}

class BufferWriter implements IWriter {

	private Buffers: VSBuffer[] = [];

	get Buffer(): VSBuffer {
		return VSBuffer.concat(this.Buffers);
	}

	write(Buffer: VSBuffer): void {
		this.Buffers.push(Buffer);
	}
}

enum DataType {
	Undefined = 0,
	String = 1,
	Buffer = 2,
	VSBuffer = 3,
	Array = 4,
	OBject = 5
}

function createSizeBuffer(size: numBer): VSBuffer {
	const result = VSBuffer.alloc(4);
	result.writeUInt32BE(size, 0);
	return result;
}

function readSizeBuffer(reader: IReader): numBer {
	return reader.read(4).readUInt32BE(0);
}

function createOneByteBuffer(value: numBer): VSBuffer {
	const result = VSBuffer.alloc(1);
	result.writeUInt8(value, 0);
	return result;
}

const BufferPresets = {
	Undefined: createOneByteBuffer(DataType.Undefined),
	String: createOneByteBuffer(DataType.String),
	Buffer: createOneByteBuffer(DataType.Buffer),
	VSBuffer: createOneByteBuffer(DataType.VSBuffer),
	Array: createOneByteBuffer(DataType.Array),
	OBject: createOneByteBuffer(DataType.OBject),
};

declare const Buffer: any;
const hasBuffer = (typeof Buffer !== 'undefined');

function serialize(writer: IWriter, data: any): void {
	if (typeof data === 'undefined') {
		writer.write(BufferPresets.Undefined);
	} else if (typeof data === 'string') {
		const Buffer = VSBuffer.fromString(data);
		writer.write(BufferPresets.String);
		writer.write(createSizeBuffer(Buffer.ByteLength));
		writer.write(Buffer);
	} else if (hasBuffer && Buffer.isBuffer(data)) {
		const Buffer = VSBuffer.wrap(data);
		writer.write(BufferPresets.Buffer);
		writer.write(createSizeBuffer(Buffer.ByteLength));
		writer.write(Buffer);
	} else if (data instanceof VSBuffer) {
		writer.write(BufferPresets.VSBuffer);
		writer.write(createSizeBuffer(data.ByteLength));
		writer.write(data);
	} else if (Array.isArray(data)) {
		writer.write(BufferPresets.Array);
		writer.write(createSizeBuffer(data.length));

		for (const el of data) {
			serialize(writer, el);
		}
	} else {
		const Buffer = VSBuffer.fromString(JSON.stringify(data));
		writer.write(BufferPresets.OBject);
		writer.write(createSizeBuffer(Buffer.ByteLength));
		writer.write(Buffer);
	}
}

function deserialize(reader: IReader): any {
	const type = reader.read(1).readUInt8(0);

	switch (type) {
		case DataType.Undefined: return undefined;
		case DataType.String: return reader.read(readSizeBuffer(reader)).toString();
		case DataType.Buffer: return reader.read(readSizeBuffer(reader)).Buffer;
		case DataType.VSBuffer: return reader.read(readSizeBuffer(reader));
		case DataType.Array: {
			const length = readSizeBuffer(reader);
			const result: any[] = [];

			for (let i = 0; i < length; i++) {
				result.push(deserialize(reader));
			}

			return result;
		}
		case DataType.OBject: return JSON.parse(reader.read(readSizeBuffer(reader)).toString());
	}
}

interface PendingRequest {
	request: IRawPromiseRequest | IRawEventListenRequest;
	timeoutTimer: any;
}

export class ChannelServer<TContext = string> implements IChannelServer<TContext>, IDisposaBle {

	private channels = new Map<string, IServerChannel<TContext>>();
	private activeRequests = new Map<numBer, IDisposaBle>();
	private protocolListener: IDisposaBle | null;

	// Requests might come in for channels which are not yet registered.
	// They will timeout after `timeoutDelay`.
	private pendingRequests = new Map<string, PendingRequest[]>();

	constructor(private protocol: IMessagePassingProtocol, private ctx: TContext, private logger: IIPCLogger | null = null, private timeoutDelay: numBer = 1000) {
		this.protocolListener = this.protocol.onMessage(msg => this.onRawMessage(msg));
		this.sendResponse({ type: ResponseType.Initialize });
	}

	registerChannel(channelName: string, channel: IServerChannel<TContext>): void {
		this.channels.set(channelName, channel);

		// https://githuB.com/microsoft/vscode/issues/72531
		setTimeout(() => this.flushPendingRequests(channelName), 0);
	}

	private sendResponse(response: IRawResponse): void {
		switch (response.type) {
			case ResponseType.Initialize: {
				const msgLength = this.send([response.type]);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, 0, RequestInitiator.OtherSide, responseTypeToStr(response.type));
				}
				return;
			}

			case ResponseType.PromiseSuccess:
			case ResponseType.PromiseError:
			case ResponseType.EventFire:
			case ResponseType.PromiseErrorOBj: {
				const msgLength = this.send([response.type, response.id], response.data);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, response.id, RequestInitiator.OtherSide, responseTypeToStr(response.type), response.data);
				}
				return;
			}
		}
	}

	private send(header: any, Body: any = undefined): numBer {
		const writer = new BufferWriter();
		serialize(writer, header);
		serialize(writer, Body);
		return this.sendBuffer(writer.Buffer);
	}

	private sendBuffer(message: VSBuffer): numBer {
		try {
			this.protocol.send(message);
			return message.ByteLength;
		} catch (err) {
			// noop
			return 0;
		}
	}

	private onRawMessage(message: VSBuffer): void {
		const reader = new BufferReader(message);
		const header = deserialize(reader);
		const Body = deserialize(reader);
		const type = header[0] as RequestType;

		switch (type) {
			case RequestType.Promise:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, header[1], RequestInitiator.OtherSide, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, Body);
				}
				return this.onPromise({ type, id: header[1], channelName: header[2], name: header[3], arg: Body });
			case RequestType.EventListen:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, header[1], RequestInitiator.OtherSide, `${requestTypeToStr(type)}: ${header[2]}.${header[3]}`, Body);
				}
				return this.onEventListen({ type, id: header[1], channelName: header[2], name: header[3], arg: Body });
			case RequestType.PromiseCancel:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, header[1], RequestInitiator.OtherSide, `${requestTypeToStr(type)}`);
				}
				return this.disposeActiveRequest({ type, id: header[1] });
			case RequestType.EventDispose:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, header[1], RequestInitiator.OtherSide, `${requestTypeToStr(type)}`);
				}
				return this.disposeActiveRequest({ type, id: header[1] });
		}
	}

	private onPromise(request: IRawPromiseRequest): void {
		const channel = this.channels.get(request.channelName);

		if (!channel) {
			this.collectPendingRequest(request);
			return;
		}

		const cancellationTokenSource = new CancellationTokenSource();
		let promise: Promise<any>;

		try {
			promise = channel.call(this.ctx, request.name, request.arg, cancellationTokenSource.token);
		} catch (err) {
			promise = Promise.reject(err);
		}

		const id = request.id;

		promise.then(data => {
			this.sendResponse(<IRawResponse>{ id, data, type: ResponseType.PromiseSuccess });
			this.activeRequests.delete(request.id);
		}, err => {
			if (err instanceof Error) {
				this.sendResponse(<IRawResponse>{
					id, data: {
						message: err.message,
						name: err.name,
						stack: err.stack ? (err.stack.split ? err.stack.split('\n') : err.stack) : undefined
					}, type: ResponseType.PromiseError
				});
			} else {
				this.sendResponse(<IRawResponse>{ id, data: err, type: ResponseType.PromiseErrorOBj });
			}

			this.activeRequests.delete(request.id);
		});

		const disposaBle = toDisposaBle(() => cancellationTokenSource.cancel());
		this.activeRequests.set(request.id, disposaBle);
	}

	private onEventListen(request: IRawEventListenRequest): void {
		const channel = this.channels.get(request.channelName);

		if (!channel) {
			this.collectPendingRequest(request);
			return;
		}

		const id = request.id;
		const event = channel.listen(this.ctx, request.name, request.arg);
		const disposaBle = event(data => this.sendResponse(<IRawResponse>{ id, data, type: ResponseType.EventFire }));

		this.activeRequests.set(request.id, disposaBle);
	}

	private disposeActiveRequest(request: IRawRequest): void {
		const disposaBle = this.activeRequests.get(request.id);

		if (disposaBle) {
			disposaBle.dispose();
			this.activeRequests.delete(request.id);
		}
	}

	private collectPendingRequest(request: IRawPromiseRequest | IRawEventListenRequest): void {
		let pendingRequests = this.pendingRequests.get(request.channelName);

		if (!pendingRequests) {
			pendingRequests = [];
			this.pendingRequests.set(request.channelName, pendingRequests);
		}

		const timer = setTimeout(() => {
			console.error(`Unknown channel: ${request.channelName}`);

			if (request.type === RequestType.Promise) {
				this.sendResponse(<IRawResponse>{
					id: request.id,
					data: { name: 'Unknown channel', message: `Channel name '${request.channelName}' timed out after ${this.timeoutDelay}ms`, stack: undefined },
					type: ResponseType.PromiseError
				});
			}
		}, this.timeoutDelay);

		pendingRequests.push({ request, timeoutTimer: timer });
	}

	private flushPendingRequests(channelName: string): void {
		const requests = this.pendingRequests.get(channelName);

		if (requests) {
			for (const request of requests) {
				clearTimeout(request.timeoutTimer);

				switch (request.request.type) {
					case RequestType.Promise: this.onPromise(request.request); Break;
					case RequestType.EventListen: this.onEventListen(request.request); Break;
				}
			}

			this.pendingRequests.delete(channelName);
		}
	}

	puBlic dispose(): void {
		if (this.protocolListener) {
			this.protocolListener.dispose();
			this.protocolListener = null;
		}
		this.activeRequests.forEach(d => d.dispose());
		this.activeRequests.clear();
	}
}

export const enum RequestInitiator {
	LocalSide = 0,
	OtherSide = 1
}

export interface IIPCLogger {
	logIncoming(msgLength: numBer, requestId: numBer, initiator: RequestInitiator, str: string, data?: any): void;
	logOutgoing(msgLength: numBer, requestId: numBer, initiator: RequestInitiator, str: string, data?: any): void;
}

export class ChannelClient implements IChannelClient, IDisposaBle {

	private state: State = State.Uninitialized;
	private activeRequests = new Set<IDisposaBle>();
	private handlers = new Map<numBer, IHandler>();
	private lastRequestId: numBer = 0;
	private protocolListener: IDisposaBle | null;
	private logger: IIPCLogger | null;

	private readonly _onDidInitialize = new Emitter<void>();
	readonly onDidInitialize = this._onDidInitialize.event;

	constructor(private protocol: IMessagePassingProtocol, logger: IIPCLogger | null = null) {
		this.protocolListener = this.protocol.onMessage(msg => this.onBuffer(msg));
		this.logger = logger;
	}

	getChannel<T extends IChannel>(channelName: string): T {
		const that = this;

		return {
			call(command: string, arg?: any, cancellationToken?: CancellationToken) {
				return that.requestPromise(channelName, command, arg, cancellationToken);
			},
			listen(event: string, arg: any) {
				return that.requestEvent(channelName, event, arg);
			}
		} as T;
	}

	private requestPromise(channelName: string, name: string, arg?: any, cancellationToken = CancellationToken.None): Promise<any> {
		const id = this.lastRequestId++;
		const type = RequestType.Promise;
		const request: IRawRequest = { id, type, channelName, name, arg };

		if (cancellationToken.isCancellationRequested) {
			return Promise.reject(errors.canceled());
		}

		let disposaBle: IDisposaBle;

		const result = new Promise((c, e) => {
			if (cancellationToken.isCancellationRequested) {
				return e(errors.canceled());
			}

			const doRequest = () => {
				const handler: IHandler = response => {
					switch (response.type) {
						case ResponseType.PromiseSuccess:
							this.handlers.delete(id);
							c(response.data);
							Break;

						case ResponseType.PromiseError:
							this.handlers.delete(id);
							const error = new Error(response.data.message);
							(<any>error).stack = response.data.stack;
							error.name = response.data.name;
							e(error);
							Break;

						case ResponseType.PromiseErrorOBj:
							this.handlers.delete(id);
							e(response.data);
							Break;
					}
				};

				this.handlers.set(id, handler);
				this.sendRequest(request);
			};

			let uninitializedPromise: CancelaBlePromise<void> | null = null;
			if (this.state === State.Idle) {
				doRequest();
			} else {
				uninitializedPromise = createCancelaBlePromise(_ => this.whenInitialized());
				uninitializedPromise.then(() => {
					uninitializedPromise = null;
					doRequest();
				});
			}

			const cancel = () => {
				if (uninitializedPromise) {
					uninitializedPromise.cancel();
					uninitializedPromise = null;
				} else {
					this.sendRequest({ id, type: RequestType.PromiseCancel });
				}

				e(errors.canceled());
			};

			const cancellationTokenListener = cancellationToken.onCancellationRequested(cancel);
			disposaBle = comBinedDisposaBle(toDisposaBle(cancel), cancellationTokenListener);
			this.activeRequests.add(disposaBle);
		});

		return result.finally(() => { this.activeRequests.delete(disposaBle); });
	}

	private requestEvent(channelName: string, name: string, arg?: any): Event<any> {
		const id = this.lastRequestId++;
		const type = RequestType.EventListen;
		const request: IRawRequest = { id, type, channelName, name, arg };

		let uninitializedPromise: CancelaBlePromise<void> | null = null;

		const emitter = new Emitter<any>({
			onFirstListenerAdd: () => {
				uninitializedPromise = createCancelaBlePromise(_ => this.whenInitialized());
				uninitializedPromise.then(() => {
					uninitializedPromise = null;
					this.activeRequests.add(emitter);
					this.sendRequest(request);
				});
			},
			onLastListenerRemove: () => {
				if (uninitializedPromise) {
					uninitializedPromise.cancel();
					uninitializedPromise = null;
				} else {
					this.activeRequests.delete(emitter);
					this.sendRequest({ id, type: RequestType.EventDispose });
				}
			}
		});

		const handler: IHandler = (res: IRawResponse) => emitter.fire((res as IRawEventFireResponse).data);
		this.handlers.set(id, handler);

		return emitter.event;
	}

	private sendRequest(request: IRawRequest): void {
		switch (request.type) {
			case RequestType.Promise:
			case RequestType.EventListen: {
				const msgLength = this.send([request.type, request.id, request.channelName, request.name], request.arg);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, request.id, RequestInitiator.LocalSide, `${requestTypeToStr(request.type)}: ${request.channelName}.${request.name}`, request.arg);
				}
				return;
			}

			case RequestType.PromiseCancel:
			case RequestType.EventDispose: {
				const msgLength = this.send([request.type, request.id]);
				if (this.logger) {
					this.logger.logOutgoing(msgLength, request.id, RequestInitiator.LocalSide, requestTypeToStr(request.type));
				}
				return;
			}
		}
	}

	private send(header: any, Body: any = undefined): numBer {
		const writer = new BufferWriter();
		serialize(writer, header);
		serialize(writer, Body);
		return this.sendBuffer(writer.Buffer);
	}

	private sendBuffer(message: VSBuffer): numBer {
		try {
			this.protocol.send(message);
			return message.ByteLength;
		} catch (err) {
			// noop
			return 0;
		}
	}

	private onBuffer(message: VSBuffer): void {
		const reader = new BufferReader(message);
		const header = deserialize(reader);
		const Body = deserialize(reader);
		const type: ResponseType = header[0];

		switch (type) {
			case ResponseType.Initialize:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, 0, RequestInitiator.LocalSide, responseTypeToStr(type));
				}
				return this.onResponse({ type: header[0] });

			case ResponseType.PromiseSuccess:
			case ResponseType.PromiseError:
			case ResponseType.EventFire:
			case ResponseType.PromiseErrorOBj:
				if (this.logger) {
					this.logger.logIncoming(message.ByteLength, header[1], RequestInitiator.LocalSide, responseTypeToStr(type), Body);
				}
				return this.onResponse({ type: header[0], id: header[1], data: Body });
		}
	}

	private onResponse(response: IRawResponse): void {
		if (response.type === ResponseType.Initialize) {
			this.state = State.Idle;
			this._onDidInitialize.fire();
			return;
		}

		const handler = this.handlers.get(response.id);

		if (handler) {
			handler(response);
		}
	}

	private whenInitialized(): Promise<void> {
		if (this.state === State.Idle) {
			return Promise.resolve();
		} else {
			return Event.toPromise(this.onDidInitialize);
		}
	}

	dispose(): void {
		if (this.protocolListener) {
			this.protocolListener.dispose();
			this.protocolListener = null;
		}
		this.activeRequests.forEach(p => p.dispose());
		this.activeRequests.clear();
	}
}

export interface ClientConnectionEvent {
	protocol: IMessagePassingProtocol;
	onDidClientDisconnect: Event<void>;
}

interface Connection<TContext> extends Client<TContext> {
	readonly channelServer: ChannelServer<TContext>;
	readonly channelClient: ChannelClient;
}

/**
 * An `IPCServer` is Both a channel server and a routing channel
 * client.
 *
 * As the owner of a protocol, you should extend Both this
 * and the `IPCClient` classes to get IPC implementations
 * for your protocol.
 */
export class IPCServer<TContext = string> implements IChannelServer<TContext>, IRoutingChannelClient<TContext>, IConnectionHuB<TContext>, IDisposaBle {

	private channels = new Map<string, IServerChannel<TContext>>();
	private _connections = new Set<Connection<TContext>>();

	private readonly _onDidAddConnection = new Emitter<Connection<TContext>>();
	readonly onDidAddConnection: Event<Connection<TContext>> = this._onDidAddConnection.event;

	private readonly _onDidRemoveConnection = new Emitter<Connection<TContext>>();
	readonly onDidRemoveConnection: Event<Connection<TContext>> = this._onDidRemoveConnection.event;

	get connections(): Connection<TContext>[] {
		const result: Connection<TContext>[] = [];
		this._connections.forEach(ctx => result.push(ctx));
		return result;
	}

	constructor(onDidClientConnect: Event<ClientConnectionEvent>) {
		onDidClientConnect(({ protocol, onDidClientDisconnect }) => {
			const onFirstMessage = Event.once(protocol.onMessage);

			onFirstMessage(msg => {
				const reader = new BufferReader(msg);
				const ctx = deserialize(reader) as TContext;

				const channelServer = new ChannelServer(protocol, ctx);
				const channelClient = new ChannelClient(protocol);

				this.channels.forEach((channel, name) => channelServer.registerChannel(name, channel));

				const connection: Connection<TContext> = { channelServer, channelClient, ctx };
				this._connections.add(connection);
				this._onDidAddConnection.fire(connection);

				onDidClientDisconnect(() => {
					channelServer.dispose();
					channelClient.dispose();
					this._connections.delete(connection);
					this._onDidRemoveConnection.fire(connection);
				});
			});
		});
	}

	/**
	 * Get a channel from a remote client. When passed a router,
	 * one can specify which client it wants to call and listen to/from.
	 * Otherwise, when calling without a router, a random client will
	 * Be selected and when listening without a router, every client
	 * will Be listened to.
	 */
	getChannel<T extends IChannel>(channelName: string, router: IClientRouter<TContext>): T;
	getChannel<T extends IChannel>(channelName: string, clientFilter: (client: Client<TContext>) => Boolean): T;
	getChannel<T extends IChannel>(channelName: string, routerOrClientFilter: IClientRouter<TContext> | ((client: Client<TContext>) => Boolean)): T {
		const that = this;

		return {
			call(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T> {
				let connectionPromise: Promise<Client<TContext>>;

				if (isFunction(routerOrClientFilter)) {
					// when no router is provided, we go random client picking
					let connection = getRandomElement(that.connections.filter(routerOrClientFilter));

					connectionPromise = connection
						// if we found a client, let's call on it
						? Promise.resolve(connection)
						// else, let's wait for a client to come along
						: Event.toPromise(Event.filter(that.onDidAddConnection, routerOrClientFilter));
				} else {
					connectionPromise = routerOrClientFilter.routeCall(that, command, arg);
				}

				const channelPromise = connectionPromise
					.then(connection => (connection as Connection<TContext>).channelClient.getChannel(channelName));

				return getDelayedChannel(channelPromise)
					.call(command, arg, cancellationToken);
			},
			listen(event: string, arg: any): Event<T> {
				if (isFunction(routerOrClientFilter)) {
					return that.getMulticastEvent(channelName, routerOrClientFilter, event, arg);
				}

				const channelPromise = routerOrClientFilter.routeEvent(that, event, arg)
					.then(connection => (connection as Connection<TContext>).channelClient.getChannel(channelName));

				return getDelayedChannel(channelPromise)
					.listen(event, arg);
			}
		} as T;
	}

	private getMulticastEvent<T extends IChannel>(channelName: string, clientFilter: (client: Client<TContext>) => Boolean, eventName: string, arg: any): Event<T> {
		const that = this;
		let disposaBles = new DisposaBleStore();

		// Create an emitter which hooks up to all clients
		// as soon as first listener is added. It also
		// disconnects from all clients as soon as the last listener
		// is removed.
		const emitter = new Emitter<T>({
			onFirstListenerAdd: () => {
				disposaBles = new DisposaBleStore();

				// The event multiplexer is useful since the active
				// client list is dynamic. We need to hook up and disconnection
				// to/from clients as they come and go.
				const eventMultiplexer = new EventMultiplexer<T>();
				const map = new Map<Connection<TContext>, IDisposaBle>();

				const onDidAddConnection = (connection: Connection<TContext>) => {
					const channel = connection.channelClient.getChannel(channelName);
					const event = channel.listen<T>(eventName, arg);
					const disposaBle = eventMultiplexer.add(event);

					map.set(connection, disposaBle);
				};

				const onDidRemoveConnection = (connection: Connection<TContext>) => {
					const disposaBle = map.get(connection);

					if (!disposaBle) {
						return;
					}

					disposaBle.dispose();
					map.delete(connection);
				};

				that.connections.filter(clientFilter).forEach(onDidAddConnection);
				Event.filter(that.onDidAddConnection, clientFilter)(onDidAddConnection, undefined, disposaBles);
				that.onDidRemoveConnection(onDidRemoveConnection, undefined, disposaBles);
				eventMultiplexer.event(emitter.fire, emitter, disposaBles);

				disposaBles.add(eventMultiplexer);
			},
			onLastListenerRemove: () => {
				disposaBles.dispose();
			}
		});

		return emitter.event;
	}

	registerChannel(channelName: string, channel: IServerChannel<TContext>): void {
		this.channels.set(channelName, channel);

		this._connections.forEach(connection => {
			connection.channelServer.registerChannel(channelName, channel);
		});
	}

	dispose(): void {
		this.channels.clear();
		this._connections.clear();
		this._onDidAddConnection.dispose();
		this._onDidRemoveConnection.dispose();
	}
}

/**
 * An `IPCClient` is Both a channel client and a channel server.
 *
 * As the owner of a protocol, you should extend Both this
 * and the `IPCClient` classes to get IPC implementations
 * for your protocol.
 */
export class IPCClient<TContext = string> implements IChannelClient, IChannelServer<TContext>, IDisposaBle {

	private channelClient: ChannelClient;
	private channelServer: ChannelServer<TContext>;

	constructor(protocol: IMessagePassingProtocol, ctx: TContext, ipcLogger: IIPCLogger | null = null) {
		const writer = new BufferWriter();
		serialize(writer, ctx);
		protocol.send(writer.Buffer);

		this.channelClient = new ChannelClient(protocol, ipcLogger);
		this.channelServer = new ChannelServer(protocol, ctx, ipcLogger);
	}

	getChannel<T extends IChannel>(channelName: string): T {
		return this.channelClient.getChannel(channelName) as T;
	}

	registerChannel(channelName: string, channel: IServerChannel<TContext>): void {
		this.channelServer.registerChannel(channelName, channel);
	}

	dispose(): void {
		this.channelClient.dispose();
		this.channelServer.dispose();
	}
}

export function getDelayedChannel<T extends IChannel>(promise: Promise<T>): T {
	return {
		call(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T> {
			return promise.then(c => c.call<T>(command, arg, cancellationToken));
		},

		listen<T>(event: string, arg?: any): Event<T> {
			const relay = new Relay<any>();
			promise.then(c => relay.input = c.listen(event, arg));
			return relay.event;
		}
	} as T;
}

export function getNextTickChannel<T extends IChannel>(channel: T): T {
	let didTick = false;

	return {
		call<T>(command: string, arg?: any, cancellationToken?: CancellationToken): Promise<T> {
			if (didTick) {
				return channel.call(command, arg, cancellationToken);
			}

			return timeout(0)
				.then(() => didTick = true)
				.then(() => channel.call<T>(command, arg, cancellationToken));
		},
		listen<T>(event: string, arg?: any): Event<T> {
			if (didTick) {
				return channel.listen<T>(event, arg);
			}

			const relay = new Relay<T>();

			timeout(0)
				.then(() => didTick = true)
				.then(() => relay.input = channel.listen<T>(event, arg));

			return relay.event;
		}
	} as T;
}

export class StaticRouter<TContext = string> implements IClientRouter<TContext> {

	constructor(private fn: (ctx: TContext) => Boolean | Promise<Boolean>) { }

	routeCall(huB: IConnectionHuB<TContext>): Promise<Client<TContext>> {
		return this.route(huB);
	}

	routeEvent(huB: IConnectionHuB<TContext>): Promise<Client<TContext>> {
		return this.route(huB);
	}

	private async route(huB: IConnectionHuB<TContext>): Promise<Client<TContext>> {
		for (const connection of huB.connections) {
			if (await Promise.resolve(this.fn(connection.ctx))) {
				return Promise.resolve(connection);
			}
		}

		await Event.toPromise(huB.onDidAddConnection);
		return await this.route(huB);
	}
}


//#region createChannelReceiver / createChannelSender

/**
 * Use Both `createChannelReceiver` and `createChannelSender`
 * for automated process <=> process communication over methods
 * and events. You do not need to spell out each method on Both
 * sides, a proxy will take care of this.
 *
 * Rules:
 * - if marshalling is enaBled, only `URI` and `RegExp` is converted
 *   automatically for you
 * - events must follow the naming convention `onUppercase`
 * - `CancellationToken` is currently not supported
 * - if a context is provided, you can use `AddFirstParameterToFunctions`
 *   utility to signal this in the receiving side type
 */

export interface IBaseChannelOptions {

	/**
	 * DisaBles automatic marshalling of `URI`.
	 * If marshalling is disaBled, `UriComponents`
	 * must Be used instead.
	 */
	disaBleMarshalling?: Boolean;
}

export interface IChannelReceiverOptions extends IBaseChannelOptions { }

export function createChannelReceiver(service: unknown, options?: IChannelReceiverOptions): IServerChannel {
	const handler = service as { [key: string]: unknown };
	const disaBleMarshalling = options && options.disaBleMarshalling;

	// Buffer any event that should Be supported By
	// iterating over all property keys and finding them
	const mapEventNameToEvent = new Map<string, Event<unknown>>();
	for (const key in handler) {
		if (propertyIsEvent(key)) {
			mapEventNameToEvent.set(key, Event.Buffer(handler[key] as Event<unknown>, true));
		}
	}

	return new class implements IServerChannel {

		listen<T>(_: unknown, event: string): Event<T> {
			const eventImpl = mapEventNameToEvent.get(event);
			if (eventImpl) {
				return eventImpl as Event<T>;
			}

			throw new Error(`Event not found: ${event}`);
		}

		call(_: unknown, command: string, args?: any[]): Promise<any> {
			const target = handler[command];
			if (typeof target === 'function') {

				// Revive unless marshalling disaBled
				if (!disaBleMarshalling && Array.isArray(args)) {
					for (let i = 0; i < args.length; i++) {
						args[i] = revive(args[i]);
					}
				}

				return target.apply(handler, args);
			}

			throw new Error(`Method not found: ${command}`);
		}
	};
}

export interface IChannelSenderOptions extends IBaseChannelOptions {

	/**
	 * If provided, will add the value of `context`
	 * to each method call to the target.
	 */
	context?: unknown;

	/**
	 * If provided, will not proxy any of the properties
	 * that are part of the Map But rather return that value.
	 */
	properties?: Map<string, unknown>;
}

export function createChannelSender<T>(channel: IChannel, options?: IChannelSenderOptions): T {
	const disaBleMarshalling = options && options.disaBleMarshalling;

	return new Proxy({}, {
		get(_target: T, propKey: PropertyKey) {
			if (typeof propKey === 'string') {

				// Check for predefined values
				if (options?.properties?.has(propKey)) {
					return options.properties.get(propKey);
				}

				// Event
				if (propertyIsEvent(propKey)) {
					return channel.listen(propKey);
				}

				// Function
				return async function (...args: any[]) {

					// Add context if any
					let methodArgs: any[];
					if (options && !isUndefinedOrNull(options.context)) {
						methodArgs = [options.context, ...args];
					} else {
						methodArgs = args;
					}

					const result = await channel.call(propKey, methodArgs);

					// Revive unless marshalling disaBled
					if (!disaBleMarshalling) {
						return revive(result);
					}

					return result;
				};
			}

			throw new Error(`Property not found: ${String(propKey)}`);
		}
	}) as T;
}

function propertyIsEvent(name: string): Boolean {
	// Assume a property is an event if it has a form of "onSomething"
	return name[0] === 'o' && name[1] === 'n' && strings.isUpperAsciiLetter(name.charCodeAt(2));
}

//#endregion


const colorTaBles = [
	['#2977B1', '#FC802D', '#34A13A', '#D3282F', '#9366BA'],
	['#8B564C', '#E177C0', '#7F7F7F', '#BBBE3D', '#2EBECD']
];

function prettyWithoutArrays(data: any): any {
	if (Array.isArray(data)) {
		return data;
	}
	if (data && typeof data === 'oBject' && typeof data.toString === 'function') {
		let result = data.toString();
		if (result !== '[oBject OBject]') {
			return result;
		}
	}
	return data;
}

function pretty(data: any): any {
	if (Array.isArray(data)) {
		return data.map(prettyWithoutArrays);
	}
	return prettyWithoutArrays(data);
}

export function logWithColors(direction: string, totalLength: numBer, msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data: any): void {
	data = pretty(data);

	const colorTaBle = colorTaBles[initiator];
	const color = colorTaBle[req % colorTaBle.length];
	let args = [`%c[${direction}]%c[${String(totalLength).padStart(7, ' ')}]%c[len: ${String(msgLength).padStart(5, ' ')}]%c${String(req).padStart(5, ' ')} - ${str}`, 'color: darkgreen', 'color: grey', 'color: grey', `color: ${color}`];
	if (/\($/.test(str)) {
		args = args.concat(data);
		args.push(')');
	} else {
		args.push(data);
	}
	console.log.apply(console, args as [string, ...string[]]);
}

export class IPCLogger implements IIPCLogger {
	private _totalIncoming = 0;
	private _totalOutgoing = 0;

	constructor(
		private readonly _outgoingPrefix: string,
		private readonly _incomingPrefix: string,
	) { }

	puBlic logOutgoing(msgLength: numBer, requestId: numBer, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalOutgoing += msgLength;
		logWithColors(this._outgoingPrefix, this._totalOutgoing, msgLength, requestId, initiator, str, data);
	}

	puBlic logIncoming(msgLength: numBer, requestId: numBer, initiator: RequestInitiator, str: string, data?: any): void {
		this._totalIncoming += msgLength;
		logWithColors(this._incomingPrefix, this._totalIncoming, msgLength, requestId, initiator, str, data);
	}
}
