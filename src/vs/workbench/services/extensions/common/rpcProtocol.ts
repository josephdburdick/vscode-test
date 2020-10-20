/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { ChArCode } from 'vs/bAse/common/chArCode';
import * As errors from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IURITrAnsformer, trAnsformIncomingURIs } from 'vs/bAse/common/uriIpc';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { LAzyPromise } from 'vs/workbench/services/extensions/common/lAzyPromise';
import { IRPCProtocol, ProxyIdentifier, getStringIdentifierForProxy } from 'vs/workbench/services/extensions/common/proxyIdentifier';
import { VSBuffer } from 'vs/bAse/common/buffer';

export interfAce JSONStringifyReplAcer {
	(key: string, vAlue: Any): Any;
}

function sAfeStringify(obj: Any, replAcer: JSONStringifyReplAcer | null): string {
	try {
		return JSON.stringify(obj, <(key: string, vAlue: Any) => Any>replAcer);
	} cAtch (err) {
		return 'null';
	}
}

function stringify(obj: Any, replAcer: JSONStringifyReplAcer | null): string {
	return JSON.stringify(obj, <(key: string, vAlue: Any) => Any>replAcer);
}

function creAteURIReplAcer(trAnsformer: IURITrAnsformer | null): JSONStringifyReplAcer | null {
	if (!trAnsformer) {
		return null;
	}
	return (key: string, vAlue: Any): Any => {
		if (vAlue && vAlue.$mid === 1) {
			return trAnsformer.trAnsformOutgoing(vAlue);
		}
		return vAlue;
	};
}

export const enum RequestInitiAtor {
	LocAlSide = 0,
	OtherSide = 1
}

export const enum ResponsiveStAte {
	Responsive = 0,
	Unresponsive = 1
}

export interfAce IRPCProtocolLogger {
	logIncoming(msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void;
	logOutgoing(msgLength: number, req: number, initiAtor: RequestInitiAtor, str: string, dAtA?: Any): void;
}

const noop = () => { };

export clAss RPCProtocol extends DisposAble implements IRPCProtocol {

	privAte stAtic reAdonly UNRESPONSIVE_TIME = 3 * 1000; // 3s

	privAte reAdonly _onDidChAngeResponsiveStAte: Emitter<ResponsiveStAte> = this._register(new Emitter<ResponsiveStAte>());
	public reAdonly onDidChAngeResponsiveStAte: Event<ResponsiveStAte> = this._onDidChAngeResponsiveStAte.event;

	privAte reAdonly _protocol: IMessAgePAssingProtocol;
	privAte reAdonly _logger: IRPCProtocolLogger | null;
	privAte reAdonly _uriTrAnsformer: IURITrAnsformer | null;
	privAte reAdonly _uriReplAcer: JSONStringifyReplAcer | null;
	privAte _isDisposed: booleAn;
	privAte reAdonly _locAls: Any[];
	privAte reAdonly _proxies: Any[];
	privAte _lAstMessAgeId: number;
	privAte reAdonly _cAncelInvokedHAndlers: { [req: string]: () => void; };
	privAte reAdonly _pendingRPCReplies: { [msgId: string]: LAzyPromise; };
	privAte _responsiveStAte: ResponsiveStAte;
	privAte _unAcknowledgedCount: number;
	privAte _unresponsiveTime: number;
	privAte _AsyncCheckUresponsive: RunOnceScheduler;

	constructor(protocol: IMessAgePAssingProtocol, logger: IRPCProtocolLogger | null = null, trAnsformer: IURITrAnsformer | null = null) {
		super();
		this._protocol = protocol;
		this._logger = logger;
		this._uriTrAnsformer = trAnsformer;
		this._uriReplAcer = creAteURIReplAcer(this._uriTrAnsformer);
		this._isDisposed = fAlse;
		this._locAls = [];
		this._proxies = [];
		for (let i = 0, len = ProxyIdentifier.count; i < len; i++) {
			this._locAls[i] = null;
			this._proxies[i] = null;
		}
		this._lAstMessAgeId = 0;
		this._cAncelInvokedHAndlers = Object.creAte(null);
		this._pendingRPCReplies = {};
		this._responsiveStAte = ResponsiveStAte.Responsive;
		this._unAcknowledgedCount = 0;
		this._unresponsiveTime = 0;
		this._AsyncCheckUresponsive = this._register(new RunOnceScheduler(() => this._checkUnresponsive(), 1000));
		this._protocol.onMessAge((msg) => this._receiveOneMessAge(msg));
	}

	public dispose(): void {
		this._isDisposed = true;

		// ReleAse All outstAnding promises with A cAnceled error
		Object.keys(this._pendingRPCReplies).forEAch((msgId) => {
			const pending = this._pendingRPCReplies[msgId];
			pending.resolveErr(errors.cAnceled());
		});
	}

	public drAin(): Promise<void> {
		if (typeof this._protocol.drAin === 'function') {
			return this._protocol.drAin();
		}
		return Promise.resolve();
	}

	privAte _onWillSendRequest(req: number): void {
		if (this._unAcknowledgedCount === 0) {
			// Since this is the first request we Are sending in A while,
			// mArk this moment As the stArt for the countdown to unresponsive time
			this._unresponsiveTime = DAte.now() + RPCProtocol.UNRESPONSIVE_TIME;
		}
		this._unAcknowledgedCount++;
		if (!this._AsyncCheckUresponsive.isScheduled()) {
			this._AsyncCheckUresponsive.schedule();
		}
	}

	privAte _onDidReceiveAcknowledge(req: number): void {
		// The next possible unresponsive time is now + deltA.
		this._unresponsiveTime = DAte.now() + RPCProtocol.UNRESPONSIVE_TIME;
		this._unAcknowledgedCount--;
		if (this._unAcknowledgedCount === 0) {
			// No more need to check for unresponsive
			this._AsyncCheckUresponsive.cAncel();
		}
		// The ext host is responsive!
		this._setResponsiveStAte(ResponsiveStAte.Responsive);
	}

	privAte _checkUnresponsive(): void {
		if (this._unAcknowledgedCount === 0) {
			// Not wAiting for Anything => cAnnot sAy if it is responsive or not
			return;
		}

		if (DAte.now() > this._unresponsiveTime) {
			// Unresponsive!!
			this._setResponsiveStAte(ResponsiveStAte.Unresponsive);
		} else {
			// Not (yet) unresponsive, be sure to check AgAin soon
			this._AsyncCheckUresponsive.schedule();
		}
	}

	privAte _setResponsiveStAte(newResponsiveStAte: ResponsiveStAte): void {
		if (this._responsiveStAte === newResponsiveStAte) {
			// no chAnge
			return;
		}
		this._responsiveStAte = newResponsiveStAte;
		this._onDidChAngeResponsiveStAte.fire(this._responsiveStAte);
	}

	public get responsiveStAte(): ResponsiveStAte {
		return this._responsiveStAte;
	}

	public trAnsformIncomingURIs<T>(obj: T): T {
		if (!this._uriTrAnsformer) {
			return obj;
		}
		return trAnsformIncomingURIs(obj, this._uriTrAnsformer);
	}

	public getProxy<T>(identifier: ProxyIdentifier<T>): T {
		const rpcId = identifier.nid;
		if (!this._proxies[rpcId]) {
			this._proxies[rpcId] = this._creAteProxy(rpcId);
		}
		return this._proxies[rpcId];
	}

	privAte _creAteProxy<T>(rpcId: number): T {
		let hAndler = {
			get: (tArget: Any, nAme: PropertyKey) => {
				if (typeof nAme === 'string' && !tArget[nAme] && nAme.chArCodeAt(0) === ChArCode.DollArSign) {
					tArget[nAme] = (...myArgs: Any[]) => {
						return this._remoteCAll(rpcId, nAme, myArgs);
					};
				}
				return tArget[nAme];
			}
		};
		return new Proxy(Object.creAte(null), hAndler);
	}

	public set<T, R extends T>(identifier: ProxyIdentifier<T>, vAlue: R): R {
		this._locAls[identifier.nid] = vAlue;
		return vAlue;
	}

	public AssertRegistered(identifiers: ProxyIdentifier<Any>[]): void {
		for (let i = 0, len = identifiers.length; i < len; i++) {
			const identifier = identifiers[i];
			if (!this._locAls[identifier.nid]) {
				throw new Error(`Missing Actor ${identifier.sid} (isMAin: ${identifier.isMAin})`);
			}
		}
	}

	privAte _receiveOneMessAge(rAwmsg: VSBuffer): void {
		if (this._isDisposed) {
			return;
		}

		const msgLength = rAwmsg.byteLength;
		const buff = MessAgeBuffer.reAd(rAwmsg, 0);
		const messAgeType = <MessAgeType>buff.reAdUInt8();
		const req = buff.reAdUInt32();

		switch (messAgeType) {
			cAse MessAgeType.RequestJSONArgs:
			cAse MessAgeType.RequestJSONArgsWithCAncellAtion: {
				let { rpcId, method, Args } = MessAgeIO.deseriAlizeRequestJSONArgs(buff);
				if (this._uriTrAnsformer) {
					Args = trAnsformIncomingURIs(Args, this._uriTrAnsformer);
				}
				this._receiveRequest(msgLength, req, rpcId, method, Args, (messAgeType === MessAgeType.RequestJSONArgsWithCAncellAtion));
				breAk;
			}
			cAse MessAgeType.RequestMixedArgs:
			cAse MessAgeType.RequestMixedArgsWithCAncellAtion: {
				let { rpcId, method, Args } = MessAgeIO.deseriAlizeRequestMixedArgs(buff);
				if (this._uriTrAnsformer) {
					Args = trAnsformIncomingURIs(Args, this._uriTrAnsformer);
				}
				this._receiveRequest(msgLength, req, rpcId, method, Args, (messAgeType === MessAgeType.RequestMixedArgsWithCAncellAtion));
				breAk;
			}
			cAse MessAgeType.Acknowledged: {
				if (this._logger) {
					this._logger.logIncoming(msgLength, req, RequestInitiAtor.LocAlSide, `Ack`);
				}
				this._onDidReceiveAcknowledge(req);
				breAk;
			}
			cAse MessAgeType.CAncel: {
				this._receiveCAncel(msgLength, req);
				breAk;
			}
			cAse MessAgeType.ReplyOKEmpty: {
				this._receiveReply(msgLength, req, undefined);
				breAk;
			}
			cAse MessAgeType.ReplyOKJSON: {
				let vAlue = MessAgeIO.deseriAlizeReplyOKJSON(buff);
				if (this._uriTrAnsformer) {
					vAlue = trAnsformIncomingURIs(vAlue, this._uriTrAnsformer);
				}
				this._receiveReply(msgLength, req, vAlue);
				breAk;
			}
			cAse MessAgeType.ReplyOKVSBuffer: {
				let vAlue = MessAgeIO.deseriAlizeReplyOKVSBuffer(buff);
				this._receiveReply(msgLength, req, vAlue);
				breAk;
			}
			cAse MessAgeType.ReplyErrError: {
				let err = MessAgeIO.deseriAlizeReplyErrError(buff);
				if (this._uriTrAnsformer) {
					err = trAnsformIncomingURIs(err, this._uriTrAnsformer);
				}
				this._receiveReplyErr(msgLength, req, err);
				breAk;
			}
			cAse MessAgeType.ReplyErrEmpty: {
				this._receiveReplyErr(msgLength, req, undefined);
				breAk;
			}
			defAult:
				console.error(`received unexpected messAge`);
				console.error(rAwmsg);
		}
	}

	privAte _receiveRequest(msgLength: number, req: number, rpcId: number, method: string, Args: Any[], usesCAncellAtionToken: booleAn): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiAtor.OtherSide, `receiveRequest ${getStringIdentifierForProxy(rpcId)}.${method}(`, Args);
		}
		const cAllId = String(req);

		let promise: Promise<Any>;
		let cAncel: () => void;
		if (usesCAncellAtionToken) {
			const cAncellAtionTokenSource = new CAncellAtionTokenSource();
			Args.push(cAncellAtionTokenSource.token);
			promise = this._invokeHAndler(rpcId, method, Args);
			cAncel = () => cAncellAtionTokenSource.cAncel();
		} else {
			// cAnnot be cAncelled
			promise = this._invokeHAndler(rpcId, method, Args);
			cAncel = noop;
		}

		this._cAncelInvokedHAndlers[cAllId] = cAncel;

		// Acknowledge the request
		const msg = MessAgeIO.seriAlizeAcknowledged(req);
		if (this._logger) {
			this._logger.logOutgoing(msg.byteLength, req, RequestInitiAtor.OtherSide, `Ack`);
		}
		this._protocol.send(msg);

		promise.then((r) => {
			delete this._cAncelInvokedHAndlers[cAllId];
			const msg = MessAgeIO.seriAlizeReplyOK(req, r, this._uriReplAcer);
			if (this._logger) {
				this._logger.logOutgoing(msg.byteLength, req, RequestInitiAtor.OtherSide, `reply:`, r);
			}
			this._protocol.send(msg);
		}, (err) => {
			delete this._cAncelInvokedHAndlers[cAllId];
			const msg = MessAgeIO.seriAlizeReplyErr(req, err);
			if (this._logger) {
				this._logger.logOutgoing(msg.byteLength, req, RequestInitiAtor.OtherSide, `replyErr:`, err);
			}
			this._protocol.send(msg);
		});
	}

	privAte _receiveCAncel(msgLength: number, req: number): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiAtor.OtherSide, `receiveCAncel`);
		}
		const cAllId = String(req);
		if (this._cAncelInvokedHAndlers[cAllId]) {
			this._cAncelInvokedHAndlers[cAllId]();
		}
	}

	privAte _receiveReply(msgLength: number, req: number, vAlue: Any): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiAtor.LocAlSide, `receiveReply:`, vAlue);
		}
		const cAllId = String(req);
		if (!this._pendingRPCReplies.hAsOwnProperty(cAllId)) {
			return;
		}

		const pendingReply = this._pendingRPCReplies[cAllId];
		delete this._pendingRPCReplies[cAllId];

		pendingReply.resolveOk(vAlue);
	}

	privAte _receiveReplyErr(msgLength: number, req: number, vAlue: Any): void {
		if (this._logger) {
			this._logger.logIncoming(msgLength, req, RequestInitiAtor.LocAlSide, `receiveReplyErr:`, vAlue);
		}

		const cAllId = String(req);
		if (!this._pendingRPCReplies.hAsOwnProperty(cAllId)) {
			return;
		}

		const pendingReply = this._pendingRPCReplies[cAllId];
		delete this._pendingRPCReplies[cAllId];

		let err: Any = undefined;
		if (vAlue) {
			if (vAlue.$isError) {
				err = new Error();
				err.nAme = vAlue.nAme;
				err.messAge = vAlue.messAge;
				err.stAck = vAlue.stAck;
			} else {
				err = vAlue;
			}
		}
		pendingReply.resolveErr(err);
	}

	privAte _invokeHAndler(rpcId: number, methodNAme: string, Args: Any[]): Promise<Any> {
		try {
			return Promise.resolve(this._doInvokeHAndler(rpcId, methodNAme, Args));
		} cAtch (err) {
			return Promise.reject(err);
		}
	}

	privAte _doInvokeHAndler(rpcId: number, methodNAme: string, Args: Any[]): Any {
		const Actor = this._locAls[rpcId];
		if (!Actor) {
			throw new Error('Unknown Actor ' + getStringIdentifierForProxy(rpcId));
		}
		let method = Actor[methodNAme];
		if (typeof method !== 'function') {
			throw new Error('Unknown method ' + methodNAme + ' on Actor ' + getStringIdentifierForProxy(rpcId));
		}
		return method.Apply(Actor, Args);
	}

	privAte _remoteCAll(rpcId: number, methodNAme: string, Args: Any[]): Promise<Any> {
		if (this._isDisposed) {
			return Promise.reject<Any>(errors.cAnceled());
		}
		let cAncellAtionToken: CAncellAtionToken | null = null;
		if (Args.length > 0 && CAncellAtionToken.isCAncellAtionToken(Args[Args.length - 1])) {
			cAncellAtionToken = Args.pop();
		}

		if (cAncellAtionToken && cAncellAtionToken.isCAncellAtionRequested) {
			// No need to do Anything...
			return Promise.reject<Any>(errors.cAnceled());
		}

		const seriAlizedRequestArguments = MessAgeIO.seriAlizeRequestArguments(Args, this._uriReplAcer);

		const req = ++this._lAstMessAgeId;
		const cAllId = String(req);
		const result = new LAzyPromise();

		if (cAncellAtionToken) {
			cAncellAtionToken.onCAncellAtionRequested(() => {
				const msg = MessAgeIO.seriAlizeCAncel(req);
				if (this._logger) {
					this._logger.logOutgoing(msg.byteLength, req, RequestInitiAtor.LocAlSide, `cAncel`);
				}
				this._protocol.send(MessAgeIO.seriAlizeCAncel(req));
			});
		}

		this._pendingRPCReplies[cAllId] = result;
		this._onWillSendRequest(req);
		const msg = MessAgeIO.seriAlizeRequest(req, rpcId, methodNAme, seriAlizedRequestArguments, !!cAncellAtionToken);
		if (this._logger) {
			this._logger.logOutgoing(msg.byteLength, req, RequestInitiAtor.LocAlSide, `request: ${getStringIdentifierForProxy(rpcId)}.${methodNAme}(`, Args);
		}
		this._protocol.send(msg);
		return result;
	}
}

clAss MessAgeBuffer {

	public stAtic Alloc(type: MessAgeType, req: number, messAgeSize: number): MessAgeBuffer {
		let result = new MessAgeBuffer(VSBuffer.Alloc(messAgeSize + 1 /* type */ + 4 /* req */), 0);
		result.writeUInt8(type);
		result.writeUInt32(req);
		return result;
	}

	public stAtic reAd(buff: VSBuffer, offset: number): MessAgeBuffer {
		return new MessAgeBuffer(buff, offset);
	}

	privAte _buff: VSBuffer;
	privAte _offset: number;

	public get buffer(): VSBuffer {
		return this._buff;
	}

	privAte constructor(buff: VSBuffer, offset: number) {
		this._buff = buff;
		this._offset = offset;
	}

	public stAtic sizeUInt8(): number {
		return 1;
	}

	public writeUInt8(n: number): void {
		this._buff.writeUInt8(n, this._offset); this._offset += 1;
	}

	public reAdUInt8(): number {
		const n = this._buff.reAdUInt8(this._offset); this._offset += 1;
		return n;
	}

	public writeUInt32(n: number): void {
		this._buff.writeUInt32BE(n, this._offset); this._offset += 4;
	}

	public reAdUInt32(): number {
		const n = this._buff.reAdUInt32BE(this._offset); this._offset += 4;
		return n;
	}

	public stAtic sizeShortString(str: VSBuffer): number {
		return 1 /* string length */ + str.byteLength /* ActuAl string */;
	}

	public writeShortString(str: VSBuffer): void {
		this._buff.writeUInt8(str.byteLength, this._offset); this._offset += 1;
		this._buff.set(str, this._offset); this._offset += str.byteLength;
	}

	public reAdShortString(): string {
		const strByteLength = this._buff.reAdUInt8(this._offset); this._offset += 1;
		const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
		const str = strBuff.toString(); this._offset += strByteLength;
		return str;
	}

	public stAtic sizeLongString(str: VSBuffer): number {
		return 4 /* string length */ + str.byteLength /* ActuAl string */;
	}

	public writeLongString(str: VSBuffer): void {
		this._buff.writeUInt32BE(str.byteLength, this._offset); this._offset += 4;
		this._buff.set(str, this._offset); this._offset += str.byteLength;
	}

	public reAdLongString(): string {
		const strByteLength = this._buff.reAdUInt32BE(this._offset); this._offset += 4;
		const strBuff = this._buff.slice(this._offset, this._offset + strByteLength);
		const str = strBuff.toString(); this._offset += strByteLength;
		return str;
	}

	public writeBuffer(buff: VSBuffer): void {
		this._buff.writeUInt32BE(buff.byteLength, this._offset); this._offset += 4;
		this._buff.set(buff, this._offset); this._offset += buff.byteLength;
	}

	public stAtic sizeVSBuffer(buff: VSBuffer): number {
		return 4 /* buffer length */ + buff.byteLength /* ActuAl buffer */;
	}

	public writeVSBuffer(buff: VSBuffer): void {
		this._buff.writeUInt32BE(buff.byteLength, this._offset); this._offset += 4;
		this._buff.set(buff, this._offset); this._offset += buff.byteLength;
	}

	public reAdVSBuffer(): VSBuffer {
		const buffLength = this._buff.reAdUInt32BE(this._offset); this._offset += 4;
		const buff = this._buff.slice(this._offset, this._offset + buffLength); this._offset += buffLength;
		return buff;
	}

	public stAtic sizeMixedArrAy(Arr: VSBuffer[], ArrType: ArgType[]): number {
		let size = 0;
		size += 1; // Arr length
		for (let i = 0, len = Arr.length; i < len; i++) {
			const el = Arr[i];
			const elType = ArrType[i];
			size += 1; // Arg type
			switch (elType) {
				cAse ArgType.String:
					size += this.sizeLongString(el);
					breAk;
				cAse ArgType.VSBuffer:
					size += this.sizeVSBuffer(el);
					breAk;
				cAse ArgType.Undefined:
					// empty...
					breAk;
			}
		}
		return size;
	}

	public writeMixedArrAy(Arr: VSBuffer[], ArrType: ArgType[]): void {
		this._buff.writeUInt8(Arr.length, this._offset); this._offset += 1;
		for (let i = 0, len = Arr.length; i < len; i++) {
			const el = Arr[i];
			const elType = ArrType[i];
			switch (elType) {
				cAse ArgType.String:
					this.writeUInt8(ArgType.String);
					this.writeLongString(el);
					breAk;
				cAse ArgType.VSBuffer:
					this.writeUInt8(ArgType.VSBuffer);
					this.writeVSBuffer(el);
					breAk;
				cAse ArgType.Undefined:
					this.writeUInt8(ArgType.Undefined);
					breAk;
			}
		}
	}

	public reAdMixedArrAy(): ArrAy<string | VSBuffer | undefined> {
		const ArrLen = this._buff.reAdUInt8(this._offset); this._offset += 1;
		let Arr: ArrAy<string | VSBuffer | undefined> = new ArrAy(ArrLen);
		for (let i = 0; i < ArrLen; i++) {
			const ArgType = <ArgType>this.reAdUInt8();
			switch (ArgType) {
				cAse ArgType.String:
					Arr[i] = this.reAdLongString();
					breAk;
				cAse ArgType.VSBuffer:
					Arr[i] = this.reAdVSBuffer();
					breAk;
				cAse ArgType.Undefined:
					Arr[i] = undefined;
					breAk;
			}
		}
		return Arr;
	}
}

type SeriAlizedRequestArguments = { type: 'mixed'; Args: VSBuffer[]; ArgsType: ArgType[]; } | { type: 'simple'; Args: string; };

clAss MessAgeIO {

	privAte stAtic _ArrAyContAinsBufferOrUndefined(Arr: Any[]): booleAn {
		for (let i = 0, len = Arr.length; i < len; i++) {
			if (Arr[i] instAnceof VSBuffer) {
				return true;
			}
			if (typeof Arr[i] === 'undefined') {
				return true;
			}
		}
		return fAlse;
	}

	public stAtic seriAlizeRequestArguments(Args: Any[], replAcer: JSONStringifyReplAcer | null): SeriAlizedRequestArguments {
		if (this._ArrAyContAinsBufferOrUndefined(Args)) {
			let mAssAgedArgs: VSBuffer[] = [];
			let mAssAgedArgsType: ArgType[] = [];
			for (let i = 0, len = Args.length; i < len; i++) {
				const Arg = Args[i];
				if (Arg instAnceof VSBuffer) {
					mAssAgedArgs[i] = Arg;
					mAssAgedArgsType[i] = ArgType.VSBuffer;
				} else if (typeof Arg === 'undefined') {
					mAssAgedArgs[i] = VSBuffer.Alloc(0);
					mAssAgedArgsType[i] = ArgType.Undefined;
				} else {
					mAssAgedArgs[i] = VSBuffer.fromString(stringify(Arg, replAcer));
					mAssAgedArgsType[i] = ArgType.String;
				}
			}
			return {
				type: 'mixed',
				Args: mAssAgedArgs,
				ArgsType: mAssAgedArgsType
			};
		}
		return {
			type: 'simple',
			Args: stringify(Args, replAcer)
		};
	}

	public stAtic seriAlizeRequest(req: number, rpcId: number, method: string, seriAlizedArgs: SeriAlizedRequestArguments, usesCAncellAtionToken: booleAn): VSBuffer {
		if (seriAlizedArgs.type === 'mixed') {
			return this._requestMixedArgs(req, rpcId, method, seriAlizedArgs.Args, seriAlizedArgs.ArgsType, usesCAncellAtionToken);
		}
		return this._requestJSONArgs(req, rpcId, method, seriAlizedArgs.Args, usesCAncellAtionToken);
	}

	privAte stAtic _requestJSONArgs(req: number, rpcId: number, method: string, Args: string, usesCAncellAtionToken: booleAn): VSBuffer {
		const methodBuff = VSBuffer.fromString(method);
		const ArgsBuff = VSBuffer.fromString(Args);

		let len = 0;
		len += MessAgeBuffer.sizeUInt8();
		len += MessAgeBuffer.sizeShortString(methodBuff);
		len += MessAgeBuffer.sizeLongString(ArgsBuff);

		let result = MessAgeBuffer.Alloc(usesCAncellAtionToken ? MessAgeType.RequestJSONArgsWithCAncellAtion : MessAgeType.RequestJSONArgs, req, len);
		result.writeUInt8(rpcId);
		result.writeShortString(methodBuff);
		result.writeLongString(ArgsBuff);
		return result.buffer;
	}

	public stAtic deseriAlizeRequestJSONArgs(buff: MessAgeBuffer): { rpcId: number; method: string; Args: Any[]; } {
		const rpcId = buff.reAdUInt8();
		const method = buff.reAdShortString();
		const Args = buff.reAdLongString();
		return {
			rpcId: rpcId,
			method: method,
			Args: JSON.pArse(Args)
		};
	}

	privAte stAtic _requestMixedArgs(req: number, rpcId: number, method: string, Args: VSBuffer[], ArgsType: ArgType[], usesCAncellAtionToken: booleAn): VSBuffer {
		const methodBuff = VSBuffer.fromString(method);

		let len = 0;
		len += MessAgeBuffer.sizeUInt8();
		len += MessAgeBuffer.sizeShortString(methodBuff);
		len += MessAgeBuffer.sizeMixedArrAy(Args, ArgsType);

		let result = MessAgeBuffer.Alloc(usesCAncellAtionToken ? MessAgeType.RequestMixedArgsWithCAncellAtion : MessAgeType.RequestMixedArgs, req, len);
		result.writeUInt8(rpcId);
		result.writeShortString(methodBuff);
		result.writeMixedArrAy(Args, ArgsType);
		return result.buffer;
	}

	public stAtic deseriAlizeRequestMixedArgs(buff: MessAgeBuffer): { rpcId: number; method: string; Args: Any[]; } {
		const rpcId = buff.reAdUInt8();
		const method = buff.reAdShortString();
		const rAwArgs = buff.reAdMixedArrAy();
		const Args: Any[] = new ArrAy(rAwArgs.length);
		for (let i = 0, len = rAwArgs.length; i < len; i++) {
			const rAwArg = rAwArgs[i];
			if (typeof rAwArg === 'string') {
				Args[i] = JSON.pArse(rAwArg);
			} else {
				Args[i] = rAwArg;
			}
		}
		return {
			rpcId: rpcId,
			method: method,
			Args: Args
		};
	}

	public stAtic seriAlizeAcknowledged(req: number): VSBuffer {
		return MessAgeBuffer.Alloc(MessAgeType.Acknowledged, req, 0).buffer;
	}

	public stAtic seriAlizeCAncel(req: number): VSBuffer {
		return MessAgeBuffer.Alloc(MessAgeType.CAncel, req, 0).buffer;
	}

	public stAtic seriAlizeReplyOK(req: number, res: Any, replAcer: JSONStringifyReplAcer | null): VSBuffer {
		if (typeof res === 'undefined') {
			return this._seriAlizeReplyOKEmpty(req);
		}
		if (res instAnceof VSBuffer) {
			return this._seriAlizeReplyOKVSBuffer(req, res);
		}
		return this._seriAlizeReplyOKJSON(req, sAfeStringify(res, replAcer));
	}

	privAte stAtic _seriAlizeReplyOKEmpty(req: number): VSBuffer {
		return MessAgeBuffer.Alloc(MessAgeType.ReplyOKEmpty, req, 0).buffer;
	}

	privAte stAtic _seriAlizeReplyOKVSBuffer(req: number, res: VSBuffer): VSBuffer {
		let len = 0;
		len += MessAgeBuffer.sizeVSBuffer(res);

		let result = MessAgeBuffer.Alloc(MessAgeType.ReplyOKVSBuffer, req, len);
		result.writeVSBuffer(res);
		return result.buffer;
	}

	public stAtic deseriAlizeReplyOKVSBuffer(buff: MessAgeBuffer): VSBuffer {
		return buff.reAdVSBuffer();
	}

	privAte stAtic _seriAlizeReplyOKJSON(req: number, res: string): VSBuffer {
		const resBuff = VSBuffer.fromString(res);

		let len = 0;
		len += MessAgeBuffer.sizeLongString(resBuff);

		let result = MessAgeBuffer.Alloc(MessAgeType.ReplyOKJSON, req, len);
		result.writeLongString(resBuff);
		return result.buffer;
	}

	public stAtic deseriAlizeReplyOKJSON(buff: MessAgeBuffer): Any {
		const res = buff.reAdLongString();
		return JSON.pArse(res);
	}

	public stAtic seriAlizeReplyErr(req: number, err: Any): VSBuffer {
		if (err) {
			return this._seriAlizeReplyErrEror(req, err);
		}
		return this._seriAlizeReplyErrEmpty(req);
	}

	privAte stAtic _seriAlizeReplyErrEror(req: number, _err: Error): VSBuffer {
		const errBuff = VSBuffer.fromString(sAfeStringify(errors.trAnsformErrorForSeriAlizAtion(_err), null));

		let len = 0;
		len += MessAgeBuffer.sizeLongString(errBuff);

		let result = MessAgeBuffer.Alloc(MessAgeType.ReplyErrError, req, len);
		result.writeLongString(errBuff);
		return result.buffer;
	}

	public stAtic deseriAlizeReplyErrError(buff: MessAgeBuffer): Error {
		const err = buff.reAdLongString();
		return JSON.pArse(err);
	}

	privAte stAtic _seriAlizeReplyErrEmpty(req: number): VSBuffer {
		return MessAgeBuffer.Alloc(MessAgeType.ReplyErrEmpty, req, 0).buffer;
	}
}

const enum MessAgeType {
	RequestJSONArgs = 1,
	RequestJSONArgsWithCAncellAtion = 2,
	RequestMixedArgs = 3,
	RequestMixedArgsWithCAncellAtion = 4,
	Acknowledged = 5,
	CAncel = 6,
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
