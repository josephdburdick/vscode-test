/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler } from 'vs/Base/common/async';
import { CancellationToken, CancellationTokenSource } from 'vs/Base/common/cancellation';
import { CharCode } from 'vs/Base/common/charCode';
import * as errors from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IURITransformer, transformIncomingURIs } from 'vs/Base/common/uriIpc';
import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { LazyPromise } from 'vs/workBench/services/extensions/common/lazyPromise';
import { IRPCProtocol, ProxyIdentifier, getStringIdentifierForProxy } from 'vs/workBench/services/extensions/common/proxyIdentifier';
import { VSBuffer } from 'vs/Base/common/Buffer';

export interface JSONStringifyReplacer {
	(key: string, value: any): any;
}

function safeStringify(oBj: any, replacer: JSONStringifyReplacer | null): string {
	try {
		return JSON.stringify(oBj, <(key: string, value: any) => any>replacer);
	} catch (err) {
		return 'null';
	}
}

function stringify(oBj: any, replacer: JSONStringifyReplacer | null): string {
	return JSON.stringify(oBj, <(key: string, value: any) => any>replacer);
}

function createURIReplacer(transformer: IURITransformer | null): JSONStringifyReplacer | null {
	if (!transformer) {
		return null;
	}
	return (key: string, value: any): any => {
		if (value && value.$mid === 1) {
			return transformer.transformOutgoing(value);
		}
		return value;
	};
}

export const enum RequestInitiator {
	LocalSide = 0,
	OtherSide = 1
}

export const enum ResponsiveState {
	Responsive = 0,
	Unresponsive = 1
}

export interface IRPCProtocolLogger {
	logIncoming(msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data?: any): void;
	logOutgoing(msgLength: numBer, req: numBer, initiator: RequestInitiator, str: string, data?: any): void;
}

const noop = () => { };

export class RPCProtocol extends DisposaBle implements IRPCProtocol {

	private static readonly UNRESPONSIVE_TIME = 3 * 1000; // 3s

	private readonly _onDidChangeResponsiveState: Emitter<ResponsiveState> = this._register(new Emitter<ResponsiveState>());
	puBlic readonly onDidChangeResponsiveState: Event<ResponsiveState> = this._onDidChangeResponsiveState.event;

	private readonly _protocol: IMessagePassingProtocol;
	private readonly _logger: IRPCProtocolLogger | null;
	private readonly _uriTransformer: IURITransformer | null;
	private readonly _uriReplacer: JSONStringifyReplacer | null;
	private _isDisposed: Boolean;
	private readonly _locals: any[];
	private readonly _proxies: any[];
	private _lastMessageId: numBer;
	private readonly _cancelInvokedHandlers: { [req: string]: () => void; };
	private readonly _pendingRPCReplies: { [msgId: string]: LazyPromise; };
	private _responsiveState: ResponsiveState;
	private _unacknowledgedCount: numBer;
	private _unresponsiveTime: numBer;
	private _asyncCheckUresponsive: RunOnceScheduler;

	constructor(protocol: IMessagePassingProtocol, logger: IRPCProtocolLogger | null = null, transformer: IURITransformer | null = null) {
		super();
		this._protocol = protocol;
		this._logger = logger;
		this._uriTransformer = transformer;
		this._uriReplacer = createURIReplacer(this._uriTransformer);
		this._isDisposed = false;
		this._locals = [];
		this._proxies = [];
		for (let i = 0, len = ProxyIdentifier.count; i < len; i++) {
			this._locals[i] = null;
			this._proxies[i] = null;
		}
		this._lastMessageId = 0;
		this._cancelInvokedHandlers = OBject.create(null);
		this._pendingRPCReplies = {};
		this._responsiveState = ResponsiveState.Responsive;
		this._unacknowledgedCount = 0;
		this._unresponsiveTime = 0;
		this._asyncCheckUresponsive = this._register(new RunOnceScheduler(() => this._checkUnresponsive(), 1000));
		this._protocol.onMessage((msg) => this._receiveOneMessage(msg));
	}

	puBlic dispose(): void {
		this._isDisposed = true;

		// Release all outstanding promises with a canceled error
		OBject.keys(this._pendingRPCReplies).forEach((msgId) => {
			const pending = this._pendingRPCReplies[msgId];
			pending.resolveErr(errors.canceled());
		});
	}

	puBlic drain(): Promise<void> {
		if (typeof this._protocol.drain === 'function') {
			return this._protocol.drain();
		}
		return Promise.resolve();
	}

	private _onWillSendRequest(req: numBer): void {
		if (this._unacknowledgedCount === 0) {
			// Since this is the first request we are sending in a while,
			// mark this moment as the start for the countdown to unresponsive time
			this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
		}
		this._unacknowledgedCount++;
		if (!this._asyncCheckUresponsive.isScheduled()) {
			this._asyncCheckUresponsive.schedule();
		}
	}

	private _onDidReceiveAcknowledge(req: numBer): void {
		// The next possiBle unresponsive time is now + delta.
		this._unresponsiveTime = Date.now() + RPCProtocol.UNRESPONSIVE_TIME;
		this._unacknowledgedCount--;
		if (this._unacknowledgedCount === 0) {
			// No more need to check for unresponsive
			this._asyncCheckUresponsive.cancel();
		}
		// The ext host is responsive!
		this._setResponsiveState(ResponsiveState.Responsive);
	}

	private _checkUnresponsive(): void {
		if (this._unacknowledgedCount === 0) {
			// Not waiting for anything => cannot say if it is responsive or not
			return;
		}

		if (Date.now() > this._unresponsiveTime) {
			// Unresponsive!!
			this._setResponsiveState(ResponsiveState.Unresponsive);
		} else {
			// Not (yet) unresponsive, Be sure to check again soon
			this._asyncCheckUresponsive.schedule();
		}
	}

	private _setResponsiveState(newResponsiveState: ResponsiveState): void {
		if (this._responsiveState === newResponsiveState) {
			// no change
			return;
		}
		this._responsiveState = newResponsiveState;
		this._onDidChangeResponsiveState.fire(this._responsiveState);
	}

	puBlic get responsiveState(): ResponsiveState {
		return this._responsiveState;
	}

	puBlic transformIncomingURIs<T>(oBj: T): T {
		if (!this._uriTransformer) {
			return oBj;
		}
		return transformIncomingURIs(oBj, this._uriTransformer);
	}

	puBlic getProxy<T>(identifier: ProxyIdentifier<T>): T {
		const rpcId = identifier.nid;
		if (!this._proxies[rpcId]) {
			this._proxies[rpcId] = this._createProxy(rpcId);
		}
		return this._proxies[rpcId];
	}

	private _createProxy<T>(rpcId: numBer): T {
		let handler = {
			get: (target: any, name: PropertyKey) => {
				if (typeof name === 'string' && !target[name] && name.charCodeAt(0) === CharCode.DollarSign) {
					target[name] = (...myArgs: any[]) => {
						return this._remoteCall(rpcId, name, myArgs);
					};
				}
				return target[name];
			}
		};
		return new Proxy(OBject.create(null), handler);
	}

	puBlic set<T, R extends T>(identifier: ProxyIdentifier<T>, value: R): R {
		this._locals[identifier.nid] = value;
		return value;
	}

	puBlic assertRegistered(identifiers: ProxyIdentifier<any>[]): void {
		for (let i = 0, len = identifiers.length; i < len; i++) {
			const identifier = identifiers[i];
			if (!this._locals[identifier.nid]) {
				throw new Error(`Missing actor ${identifier.sid} (isMain: ${identifier.isMain})`);
			}
		}
	}

	private _receiveOneMessage(rawmsg: VSBuffer): void {
		if (this._isDisposed) {
			return;
		}

		const msgLength = rawmsg.ByteLength;
		const Buff = MessageBuffer.read(rawmsg, 0);
		const messageType = <MessageType>Buff.readUInt8();
		const req = Buff.readUInt32();

		switch (messageType) {
			case MessageType.RequestJSONArgs:
			case MessageType.RequestJSONArgsWithCancellation: {
				let { rpcId, method, args } = MessageIO.deserializeRequestJSONArgs(Buff);
				if (this._uriTransformer) {
					args = transformIncomingURIs(args, this._uriTransformer);
				}
				this._receiveRequest(msgLength, req, rpcId, method, args, (messageType === MessageType.RequestJSONArgsWithCancellation));
				Break;
			}
			case MessageType.RequestMixedArgs:
			case MessageType.RequestMixedArgsWithCancellation: {
				let { rpcId, method, args } = MessageIO.deserializeRequestMixedArgs(Buff);
				if (this._uriTransformer) {
					args = transformIncomingURIs(args, this._uriTransformer);
				}
				this._receiveRequest(msgLength, req, rpcId, method, args, (messageType === MessageType.RequestMixedArgsWithCancellation));
				Break;
			}
			case MessageType.Acknowledged: {
				if (this._logger) {
					this._logger.logIncoming(msgLength, req, RequestInitiator.LocalSide, `ack`);
				}
				this._onDidReceiveAcknowledge(req);
				Break;
			}
			case MessageType.Cancel: {
				this._receiveCancel(msgLength, req);
				Break;
			}
			case MessageType.ReplyOKEmpty: {
				this._receiveReply(msgLength, req, undefined);
				Break;
			}
			case MessageType.ReplyOKJSON: {
				let value = MessageIO.deserializeReplyOKJSON(Buff);
				if (this._uriTransformer) {
					value = transformIncomingURIs(value, this._uriTransformer);
				}
				this._receiveReply(msgLength, req, value);
				Break;
			}
			case MessageType.ReplyOKVSBuffer: {
				let value = MessageIO.deserializeReplyOKVSBuffer(Buff);
				this._receiveReply(msgLength, req, value);
				Break;
			}
			case MessageType.ReplyErrError: {
				let err = MessageIO.deserializeReplyErrError(Buff);
				if (this._uriTransformer) {
					err = transformIncomingURIs(err, this._uriTransformer);
				}
				this._receiveReplyErr(msgLength, req, err);
				Break;
			}
			case MessageType.ReplyErrEmpty: {
				this._receiveReplyErr(msgLength, req, undefined);
				Break;
			}
			default:
				console.error(`received unexpected message`);
				console.error(rawmsg);
		}
	}

	private _receiveRequest(msgLength: numBer, req: numBer, rpcId: numBer, method: string, args: any[], usesCancellationToken: Boolean): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiator.OtherSide, `receiveRequest ${getStringIdentifierForProxy(rpcId)}.${method}(`, args);
		}
		const callId = String(req);

		let promise: Promise<any>;
		let cancel: () => void;
		if (usesCancellationToken) {
			const cancellationTokenSource = new CancellationTokenSource();
			args.push(cancellationTokenSource.token);
			promise = this._invokeHandler(rpcId, method, args);
			cancel = () => cancellationTokenSource.cancel();
		} else {
			// cannot Be cancelled
			promise = this._invokeHandler(rpcId, method, args);
			cancel = noop;
		}

		this._cancelInvokedHandlers[callId] = cancel;

		// Acknowledge the request
		const msg = MessageIO.serializeAcknowledged(req);
		if (this._logger) {
			this._logger.logOutgoing(msg.ByteLength, req, RequestInitiator.OtherSide, `ack`);
		}
		this._protocol.send(msg);

		promise.then((r) => {
			delete this._cancelInvokedHandlers[callId];
			const msg = MessageIO.serializeReplyOK(req, r, this._uriReplacer);
			if (this._logger) {
				this._logger.logOutgoing(msg.ByteLength, req, RequestInitiator.OtherSide, `reply:`, r);
			}
			this._protocol.send(msg);
		}, (err) => {
			delete this._cancelInvokedHandlers[callId];
			const msg = MessageIO.serializeReplyErr(req, err);
			if (this._logger) {
				this._logger.logOutgoing(msg.ByteLength, req, RequestInitiator.OtherSide, `replyErr:`, err);
			}
			this._protocol.send(msg);
		});
	}

	private _receiveCancel(msgLength: numBer, req: numBer): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiator.OtherSide, `receiveCancel`);
		}
		const callId = String(req);
		if (this._cancelInvokedHandlers[callId]) {
			this._cancelInvokedHandlers[callId]();
		}
	}

	private _receiveReply(msgLength: numBer, req: numBer, value: any): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiator.LocalSide, `receiveReply:`, value);
		}
		const callId = String(req);
		if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
			return;
		}

		const pendingReply = this._pendingRPCReplies[callId];
		delete this._pendingRPCReplies[callId];

		pendingReply.resolveOk(value);
	}

	private _receiveReplyErr(msgLength: numBer, req: numBer, value: any): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiator.LocalSide, `receiveReplyErr:`, value);
		}

		const callId = String(req);
		if (!this._pendingRPCReplies.hasOwnProperty(callId)) {
			return;
		}

		const pendingReply = this._pendingRPCReplies[callId];
		delete this._pendingRPCReplies[callId];

		let err: any = undefined;
		if (value) {
			if (value.$isError) {
				err = new Error();
				err.name = value.name;
				err.message = value.message;
				err.stack = value.stack;
			} else {
				err = value;
			}
		}
		pendingReply.resolveErr(err);
	}

	private _invokeHandler(rpcId: numBer, methodName: string, args: any[]): Promise<any> {
		try {
			return Promise.resolve(this._doInvokeHandler(rpcId, methodName, args));
		} catch (err) {
			return Promise.reject(err);
		}
	}

	private _doInvokeHandler(rpcId: numBer, methodName: string, args: any[]): any {
		const actor = this._locals[rpcId];
		if (!actor) {
			throw new Error('Unknown actor ' + getStringIdentifierForProxy(rpcId));
		}
		let method = actor[methodName];
		if (typeof method !== 'function') {
			throw new Error('Unknown method ' + methodName + ' on actor ' + getStringIdentifierForProxy(rpcId));
		}
		return method.apply(actor, args);
	}

	private _remoteCall(rpcId: numBer, methodName: string, args: any[]): Promise<any> {
		if (this._isDisposed) {
			return Promise.reject<any>(errors.canceled());
		}
		let cancellationToken: CancellationToken | null = null;
		if (args.length > 0 && CancellationToken.isCancellationToken(args[args.length - 1])) {
			cancellationToken = args.pop();
		}

		if (cancellationToken && cancellationToken.isCancellationRequested) {
			// No need to do anything...
			return Promise.reject<any>(errors.canceled());
		}

		const serializedRequestArguments = MessageIO.serializeRequestArguments(args, this._uriReplacer);

		const req = ++this._lastMessageId;
		const callId = String(req);
		const result = new LazyPromise();

		if (cancellationToken) {
			cancellationToken.onCancellationRequested(() => {
				const msg = MessageIO.serializeCancel(req);
				if (this._logger) {
					this._logger.logOutgoing(msg.ByteLength, req, RequestInitiator.LocalSide, `cancel`);
				}
				this._protocol.send(MessageIO.serializeCancel(req));
			});
		}

		this._pendingRPCReplies[callId] = result;
		this._onWillSendRequest(req);
		const msg = MessageIO.serializeRequest(req, rpcId, methodName, serializedRequestArguments, !!cancellationToken);
		if (this._logger) {
			this._logger.logOutgoing(msg.ByteLength, req, RequestInitiator.LocalSide, `request: ${getStringIdentifierForProxy(rpcId)}.${methodName}(`, args);
		}
		this._protocol.send(msg);
		return result;
	}
}

class MessageBuffer {

	puBlic static alloc(type: MessageType, req: numBer, messageSize: numBer): MessageBuffer {
		let result = new MessageBuffer(VSBuffer.alloc(messageSize + 1 /* type */ + 4 /* req */), 0);
		result.writeUInt8(type);
		result.writeUInt32(req);
		return result;
	}

	puBlic static read(Buff: VSBuffer, offset: numBer): MessageBuffer {
		return new MessageBuffer(Buff, offset);
	}

	private _Buff: VSBuffer;
	private _offset: numBer;

	puBlic get Buffer(): VSBuffer {
		return this._Buff;
	}

	private constructor(Buff: VSBuffer, offset: numBer) {
		this._Buff = Buff;
		this._offset = offset;
	}

	puBlic static sizeUInt8(): numBer {
		return 1;
	}

	puBlic writeUInt8(n: numBer): void {
		this._Buff.writeUInt8(n, this._offset); this._offset += 1;
	}

	puBlic readUInt8(): numBer {
		const n = this._Buff.readUInt8(this._offset); this._offset += 1;
		return n;
	}

	puBlic writeUInt32(n: numBer): void {
		this._Buff.writeUInt32BE(n, this._offset); this._offset += 4;
	}

	puBlic readUInt32(): numBer {
		const n = this._Buff.readUInt32BE(this._offset); this._offset += 4;
		return n;
	}

	puBlic static sizeShortString(str: VSBuffer): numBer {
		return 1 /* string length */ + str.ByteLength /* actual string */;
	}

	puBlic writeShortString(str: VSBuffer): void {
		this._Buff.writeUInt8(str.ByteLength, this._offset); this._offset += 1;
		this._Buff.set(str, this._offset); this._offset += str.ByteLength;
	}

	puBlic readShortString(): string {
		const strByteLength = this._Buff.readUInt8(this._offset); this._offset += 1;
		const strBuff = this._Buff.slice(this._offset, this._offset + strByteLength);
		const str = strBuff.toString(); this._offset += strByteLength;
		return str;
	}

	puBlic static sizeLongString(str: VSBuffer): numBer {
		return 4 /* string length */ + str.ByteLength /* actual string */;
	}

	puBlic writeLongString(str: VSBuffer): void {
		this._Buff.writeUInt32BE(str.ByteLength, this._offset); this._offset += 4;
		this._Buff.set(str, this._offset); this._offset += str.ByteLength;
	}

	puBlic readLongString(): string {
		const strByteLength = this._Buff.readUInt32BE(this._offset); this._offset += 4;
		const strBuff = this._Buff.slice(this._offset, this._offset + strByteLength);
		const str = strBuff.toString(); this._offset += strByteLength;
		return str;
	}

	puBlic writeBuffer(Buff: VSBuffer): void {
		this._Buff.writeUInt32BE(Buff.ByteLength, this._offset); this._offset += 4;
		this._Buff.set(Buff, this._offset); this._offset += Buff.ByteLength;
	}

	puBlic static sizeVSBuffer(Buff: VSBuffer): numBer {
		return 4 /* Buffer length */ + Buff.ByteLength /* actual Buffer */;
	}

	puBlic writeVSBuffer(Buff: VSBuffer): void {
		this._Buff.writeUInt32BE(Buff.ByteLength, this._offset); this._offset += 4;
		this._Buff.set(Buff, this._offset); this._offset += Buff.ByteLength;
	}

	puBlic readVSBuffer(): VSBuffer {
		const BuffLength = this._Buff.readUInt32BE(this._offset); this._offset += 4;
		const Buff = this._Buff.slice(this._offset, this._offset + BuffLength); this._offset += BuffLength;
		return Buff;
	}

	puBlic static sizeMixedArray(arr: VSBuffer[], arrType: ArgType[]): numBer {
		let size = 0;
		size += 1; // arr length
		for (let i = 0, len = arr.length; i < len; i++) {
			const el = arr[i];
			const elType = arrType[i];
			size += 1; // arg type
			switch (elType) {
				case ArgType.String:
					size += this.sizeLongString(el);
					Break;
				case ArgType.VSBuffer:
					size += this.sizeVSBuffer(el);
					Break;
				case ArgType.Undefined:
					// empty...
					Break;
			}
		}
		return size;
	}

	puBlic writeMixedArray(arr: VSBuffer[], arrType: ArgType[]): void {
		this._Buff.writeUInt8(arr.length, this._offset); this._offset += 1;
		for (let i = 0, len = arr.length; i < len; i++) {
			const el = arr[i];
			const elType = arrType[i];
			switch (elType) {
				case ArgType.String:
					this.writeUInt8(ArgType.String);
					this.writeLongString(el);
					Break;
				case ArgType.VSBuffer:
					this.writeUInt8(ArgType.VSBuffer);
					this.writeVSBuffer(el);
					Break;
				case ArgType.Undefined:
					this.writeUInt8(ArgType.Undefined);
					Break;
			}
		}
	}

	puBlic readMixedArray(): Array<string | VSBuffer | undefined> {
		const arrLen = this._Buff.readUInt8(this._offset); this._offset += 1;
		let arr: Array<string | VSBuffer | undefined> = new Array(arrLen);
		for (let i = 0; i < arrLen; i++) {
			const argType = <ArgType>this.readUInt8();
			switch (argType) {
				case ArgType.String:
					arr[i] = this.readLongString();
					Break;
				case ArgType.VSBuffer:
					arr[i] = this.readVSBuffer();
					Break;
				case ArgType.Undefined:
					arr[i] = undefined;
					Break;
			}
		}
		return arr;
	}
}

type SerializedRequestArguments = { type: 'mixed'; args: VSBuffer[]; argsType: ArgType[]; } | { type: 'simple'; args: string; };

class MessageIO {

	private static _arrayContainsBufferOrUndefined(arr: any[]): Boolean {
		for (let i = 0, len = arr.length; i < len; i++) {
			if (arr[i] instanceof VSBuffer) {
				return true;
			}
			if (typeof arr[i] === 'undefined') {
				return true;
			}
		}
		return false;
	}

	puBlic static serializeRequestArguments(args: any[], replacer: JSONStringifyReplacer | null): SerializedRequestArguments {
		if (this._arrayContainsBufferOrUndefined(args)) {
			let massagedArgs: VSBuffer[] = [];
			let massagedArgsType: ArgType[] = [];
			for (let i = 0, len = args.length; i < len; i++) {
				const arg = args[i];
				if (arg instanceof VSBuffer) {
					massagedArgs[i] = arg;
					massagedArgsType[i] = ArgType.VSBuffer;
				} else if (typeof arg === 'undefined') {
					massagedArgs[i] = VSBuffer.alloc(0);
					massagedArgsType[i] = ArgType.Undefined;
				} else {
					massagedArgs[i] = VSBuffer.fromString(stringify(arg, replacer));
					massagedArgsType[i] = ArgType.String;
				}
			}
			return {
				type: 'mixed',
				args: massagedArgs,
				argsType: massagedArgsType
			};
		}
		return {
			type: 'simple',
			args: stringify(args, replacer)
		};
	}

	puBlic static serializeRequest(req: numBer, rpcId: numBer, method: string, serializedArgs: SerializedRequestArguments, usesCancellationToken: Boolean): VSBuffer {
		if (serializedArgs.type === 'mixed') {
			return this._requestMixedArgs(req, rpcId, method, serializedArgs.args, serializedArgs.argsType, usesCancellationToken);
		}
		return this._requestJSONArgs(req, rpcId, method, serializedArgs.args, usesCancellationToken);
	}

	private static _requestJSONArgs(req: numBer, rpcId: numBer, method: string, args: string, usesCancellationToken: Boolean): VSBuffer {
		const methodBuff = VSBuffer.fromString(method);
		const argsBuff = VSBuffer.fromString(args);

		let len = 0;
		len += MessageBuffer.sizeUInt8();
		len += MessageBuffer.sizeShortString(methodBuff);
		len += MessageBuffer.sizeLongString(argsBuff);

		let result = MessageBuffer.alloc(usesCancellationToken ? MessageType.RequestJSONArgsWithCancellation : MessageType.RequestJSONArgs, req, len);
		result.writeUInt8(rpcId);
		result.writeShortString(methodBuff);
		result.writeLongString(argsBuff);
		return result.Buffer;
	}

	puBlic static deserializeRequestJSONArgs(Buff: MessageBuffer): { rpcId: numBer; method: string; args: any[]; } {
		const rpcId = Buff.readUInt8();
		const method = Buff.readShortString();
		const args = Buff.readLongString();
		return {
			rpcId: rpcId,
			method: method,
			args: JSON.parse(args)
		};
	}

	private static _requestMixedArgs(req: numBer, rpcId: numBer, method: string, args: VSBuffer[], argsType: ArgType[], usesCancellationToken: Boolean): VSBuffer {
		const methodBuff = VSBuffer.fromString(method);

		let len = 0;
		len += MessageBuffer.sizeUInt8();
		len += MessageBuffer.sizeShortString(methodBuff);
		len += MessageBuffer.sizeMixedArray(args, argsType);

		let result = MessageBuffer.alloc(usesCancellationToken ? MessageType.RequestMixedArgsWithCancellation : MessageType.RequestMixedArgs, req, len);
		result.writeUInt8(rpcId);
		result.writeShortString(methodBuff);
		result.writeMixedArray(args, argsType);
		return result.Buffer;
	}

	puBlic static deserializeRequestMixedArgs(Buff: MessageBuffer): { rpcId: numBer; method: string; args: any[]; } {
		const rpcId = Buff.readUInt8();
		const method = Buff.readShortString();
		const rawargs = Buff.readMixedArray();
		const args: any[] = new Array(rawargs.length);
		for (let i = 0, len = rawargs.length; i < len; i++) {
			const rawarg = rawargs[i];
			if (typeof rawarg === 'string') {
				args[i] = JSON.parse(rawarg);
			} else {
				args[i] = rawarg;
			}
		}
		return {
			rpcId: rpcId,
			method: method,
			args: args
		};
	}

	puBlic static serializeAcknowledged(req: numBer): VSBuffer {
		return MessageBuffer.alloc(MessageType.Acknowledged, req, 0).Buffer;
	}

	puBlic static serializeCancel(req: numBer): VSBuffer {
		return MessageBuffer.alloc(MessageType.Cancel, req, 0).Buffer;
	}

	puBlic static serializeReplyOK(req: numBer, res: any, replacer: JSONStringifyReplacer | null): VSBuffer {
		if (typeof res === 'undefined') {
			return this._serializeReplyOKEmpty(req);
		}
		if (res instanceof VSBuffer) {
			return this._serializeReplyOKVSBuffer(req, res);
		}
		return this._serializeReplyOKJSON(req, safeStringify(res, replacer));
	}

	private static _serializeReplyOKEmpty(req: numBer): VSBuffer {
		return MessageBuffer.alloc(MessageType.ReplyOKEmpty, req, 0).Buffer;
	}

	private static _serializeReplyOKVSBuffer(req: numBer, res: VSBuffer): VSBuffer {
		let len = 0;
		len += MessageBuffer.sizeVSBuffer(res);

		let result = MessageBuffer.alloc(MessageType.ReplyOKVSBuffer, req, len);
		result.writeVSBuffer(res);
		return result.Buffer;
	}

	puBlic static deserializeReplyOKVSBuffer(Buff: MessageBuffer): VSBuffer {
		return Buff.readVSBuffer();
	}

	private static _serializeReplyOKJSON(req: numBer, res: string): VSBuffer {
		const resBuff = VSBuffer.fromString(res);

		let len = 0;
		len += MessageBuffer.sizeLongString(resBuff);

		let result = MessageBuffer.alloc(MessageType.ReplyOKJSON, req, len);
		result.writeLongString(resBuff);
		return result.Buffer;
	}

	puBlic static deserializeReplyOKJSON(Buff: MessageBuffer): any {
		const res = Buff.readLongString();
		return JSON.parse(res);
	}

	puBlic static serializeReplyErr(req: numBer, err: any): VSBuffer {
		if (err) {
			return this._serializeReplyErrEror(req, err);
		}
		return this._serializeReplyErrEmpty(req);
	}

	private static _serializeReplyErrEror(req: numBer, _err: Error): VSBuffer {
		const errBuff = VSBuffer.fromString(safeStringify(errors.transformErrorForSerialization(_err), null));

		let len = 0;
		len += MessageBuffer.sizeLongString(errBuff);

		let result = MessageBuffer.alloc(MessageType.ReplyErrError, req, len);
		result.writeLongString(errBuff);
		return result.Buffer;
	}

	puBlic static deserializeReplyErrError(Buff: MessageBuffer): Error {
		const err = Buff.readLongString();
		return JSON.parse(err);
	}

	private static _serializeReplyErrEmpty(req: numBer): VSBuffer {
		return MessageBuffer.alloc(MessageType.ReplyErrEmpty, req, 0).Buffer;
	}
}

const enum MessageType {
	RequestJSONArgs = 1,
	RequestJSONArgsWithCancellation = 2,
	RequestMixedArgs = 3,
	RequestMixedArgsWithCancellation = 4,
	Acknowledged = 5,
	Cancel = 6,
	ReplyOKEmpty = 7,
	ReplyOKVSBuffer = 8,
	ReplyOKJSON = 9,
	ReplyErrError = 10,
	ReplyErrEmpty = 11,
}

const enum ArgType {
	String = 1,
	VSBuffer = 2,
	Undefined = 3
}
