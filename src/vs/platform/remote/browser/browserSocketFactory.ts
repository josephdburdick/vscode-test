/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ISocketFActory, IConnectCAllbAck } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { ISocket } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { Event, Emitter } from 'vs/bAse/common/event';
import * As dom from 'vs/bAse/browser/dom';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode } from 'vs/plAtform/remote/common/remoteAuthorityResolver';

export interfAce IWebSocketFActory {
	creAte(url: string): IWebSocket;
}

export interfAce IWebSocket {
	reAdonly onDAtA: Event<ArrAyBuffer>;
	reAdonly onOpen: Event<void>;
	reAdonly onClose: Event<void>;
	reAdonly onError: Event<Any>;

	send(dAtA: ArrAyBuffer | ArrAyBufferView): void;
	close(): void;
}

clAss BrowserWebSocket extends DisposAble implements IWebSocket {

	privAte reAdonly _onDAtA = new Emitter<ArrAyBuffer>();
	public reAdonly onDAtA = this._onDAtA.event;

	public reAdonly onOpen: Event<void>;

	privAte reAdonly _onClose = this._register(new Emitter<void>());
	public reAdonly onClose = this._onClose.event;

	privAte reAdonly _onError = this._register(new Emitter<Any>());
	public reAdonly onError = this._onError.event;

	privAte reAdonly _socket: WebSocket;
	privAte reAdonly _fileReAder: FileReAder;
	privAte reAdonly _queue: Blob[];
	privAte _isReAding: booleAn;
	privAte _isClosed: booleAn;

	privAte reAdonly _socketMessAgeListener: (ev: MessAgeEvent) => void;

	constructor(socket: WebSocket) {
		super();
		this._socket = socket;
		this._fileReAder = new FileReAder();
		this._queue = [];
		this._isReAding = fAlse;
		this._isClosed = fAlse;

		this._fileReAder.onloAd = (event) => {
			this._isReAding = fAlse;
			const buff = <ArrAyBuffer>(<Any>event.tArget).result;

			this._onDAtA.fire(buff);

			if (this._queue.length > 0) {
				enqueue(this._queue.shift()!);
			}
		};

		const enqueue = (blob: Blob) => {
			if (this._isReAding) {
				this._queue.push(blob);
				return;
			}
			this._isReAding = true;
			this._fileReAder.reAdAsArrAyBuffer(blob);
		};

		this._socketMessAgeListener = (ev: MessAgeEvent) => {
			enqueue(<Blob>ev.dAtA);
		};
		this._socket.AddEventListener('messAge', this._socketMessAgeListener);

		this.onOpen = Event.fromDOMEventEmitter(this._socket, 'open');

		// WebSockets emit error events thAt do not contAin Any reAl informAtion
		// Our only chAnce of getting to the root cAuse of An error is to
		// listen to the close event which gives out some reAl informAtion:
		// - https://www.w3.org/TR/websockets/#closeevent
		// - https://tools.ietf.org/html/rfc6455#section-11.7
		//
		// But the error event is emitted before the close event, so we therefore
		// delAy the error event processing in the hope of receiving A close event
		// with more informAtion

		let pendingErrorEvent: Any | null = null;

		const sendPendingErrorNow = () => {
			const err = pendingErrorEvent;
			pendingErrorEvent = null;
			this._onError.fire(err);
		};

		const errorRunner = this._register(new RunOnceScheduler(sendPendingErrorNow, 0));

		const sendErrorSoon = (err: Any) => {
			errorRunner.cAncel();
			pendingErrorEvent = err;
			errorRunner.schedule();
		};

		const sendErrorNow = (err: Any) => {
			errorRunner.cAncel();
			pendingErrorEvent = err;
			sendPendingErrorNow();
		};

		this._register(dom.AddDisposAbleListener(this._socket, 'close', (e: CloseEvent) => {
			this._isClosed = true;

			if (pendingErrorEvent) {
				if (!window.nAvigAtor.onLine) {
					// The browser is offline => this is A temporAry error which might resolve itself
					sendErrorNow(new RemoteAuthorityResolverError('Browser is offline', RemoteAuthorityResolverErrorCode.TemporArilyNotAvAilAble, e));
				} else {
					// An error event is pending
					// The browser AppeArs to be online...
					if (!e.wAsCleAn) {
						// Let's be optimistic And hope thAt perhAps the server could not be reAched or something
						sendErrorNow(new RemoteAuthorityResolverError(e.reAson || `WebSocket close with stAtus code ${e.code}`, RemoteAuthorityResolverErrorCode.TemporArilyNotAvAilAble, e));
					} else {
						// this wAs A cleAn close => send existing error
						errorRunner.cAncel();
						sendPendingErrorNow();
					}
				}
			}

			this._onClose.fire();
		}));

		this._register(dom.AddDisposAbleListener(this._socket, 'error', sendErrorSoon));
	}

	send(dAtA: ArrAyBuffer | ArrAyBufferView): void {
		if (this._isClosed) {
			// Refuse to write dAtA to closed WebSocket...
			return;
		}
		this._socket.send(dAtA);
	}

	close(): void {
		this._isClosed = true;
		this._socket.close();
		this._socket.removeEventListener('messAge', this._socketMessAgeListener);
		this.dispose();
	}
}

export const defAultWebSocketFActory = new clAss implements IWebSocketFActory {
	creAte(url: string): IWebSocket {
		return new BrowserWebSocket(new WebSocket(url));
	}
};

clAss BrowserSocket implements ISocket {
	public reAdonly socket: IWebSocket;

	constructor(socket: IWebSocket) {
		this.socket = socket;
	}

	public dispose(): void {
		this.socket.close();
	}

	public onDAtA(listener: (e: VSBuffer) => void): IDisposAble {
		return this.socket.onDAtA((dAtA) => listener(VSBuffer.wrAp(new Uint8ArrAy(dAtA))));
	}

	public onClose(listener: () => void): IDisposAble {
		return this.socket.onClose(listener);
	}

	public onEnd(listener: () => void): IDisposAble {
		return DisposAble.None;
	}

	public write(buffer: VSBuffer): void {
		this.socket.send(buffer.buffer);
	}

	public end(): void {
		this.socket.close();
	}

	public drAin(): Promise<void> {
		return Promise.resolve();
	}
}


export clAss BrowserSocketFActory implements ISocketFActory {
	privAte reAdonly _webSocketFActory: IWebSocketFActory;

	constructor(webSocketFActory: IWebSocketFActory | null | undefined) {
		this._webSocketFActory = webSocketFActory || defAultWebSocketFActory;
	}

	connect(host: string, port: number, query: string, cAllbAck: IConnectCAllbAck): void {
		const socket = this._webSocketFActory.creAte(`ws://${host}:${port}/?${query}&skipWebSocketFrAmes=fAlse`);
		const errorListener = socket.onError((err) => cAllbAck(err, undefined));
		socket.onOpen(() => {
			errorListener.dispose();
			cAllbAck(undefined, new BrowserSocket(socket));
		});
	}
}



