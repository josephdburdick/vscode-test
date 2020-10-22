/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ISocketFactory, IConnectCallBack } from 'vs/platform/remote/common/remoteAgentConnection';
import { ISocket } from 'vs/Base/parts/ipc/common/ipc.net';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IDisposaBle, DisposaBle } from 'vs/Base/common/lifecycle';
import { Event, Emitter } from 'vs/Base/common/event';
import * as dom from 'vs/Base/Browser/dom';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { RemoteAuthorityResolverError, RemoteAuthorityResolverErrorCode } from 'vs/platform/remote/common/remoteAuthorityResolver';

export interface IWeBSocketFactory {
	create(url: string): IWeBSocket;
}

export interface IWeBSocket {
	readonly onData: Event<ArrayBuffer>;
	readonly onOpen: Event<void>;
	readonly onClose: Event<void>;
	readonly onError: Event<any>;

	send(data: ArrayBuffer | ArrayBufferView): void;
	close(): void;
}

class BrowserWeBSocket extends DisposaBle implements IWeBSocket {

	private readonly _onData = new Emitter<ArrayBuffer>();
	puBlic readonly onData = this._onData.event;

	puBlic readonly onOpen: Event<void>;

	private readonly _onClose = this._register(new Emitter<void>());
	puBlic readonly onClose = this._onClose.event;

	private readonly _onError = this._register(new Emitter<any>());
	puBlic readonly onError = this._onError.event;

	private readonly _socket: WeBSocket;
	private readonly _fileReader: FileReader;
	private readonly _queue: BloB[];
	private _isReading: Boolean;
	private _isClosed: Boolean;

	private readonly _socketMessageListener: (ev: MessageEvent) => void;

	constructor(socket: WeBSocket) {
		super();
		this._socket = socket;
		this._fileReader = new FileReader();
		this._queue = [];
		this._isReading = false;
		this._isClosed = false;

		this._fileReader.onload = (event) => {
			this._isReading = false;
			const Buff = <ArrayBuffer>(<any>event.target).result;

			this._onData.fire(Buff);

			if (this._queue.length > 0) {
				enqueue(this._queue.shift()!);
			}
		};

		const enqueue = (BloB: BloB) => {
			if (this._isReading) {
				this._queue.push(BloB);
				return;
			}
			this._isReading = true;
			this._fileReader.readAsArrayBuffer(BloB);
		};

		this._socketMessageListener = (ev: MessageEvent) => {
			enqueue(<BloB>ev.data);
		};
		this._socket.addEventListener('message', this._socketMessageListener);

		this.onOpen = Event.fromDOMEventEmitter(this._socket, 'open');

		// WeBSockets emit error events that do not contain any real information
		// Our only chance of getting to the root cause of an error is to
		// listen to the close event which gives out some real information:
		// - https://www.w3.org/TR/weBsockets/#closeevent
		// - https://tools.ietf.org/html/rfc6455#section-11.7
		//
		// But the error event is emitted Before the close event, so we therefore
		// delay the error event processing in the hope of receiving a close event
		// with more information

		let pendingErrorEvent: any | null = null;

		const sendPendingErrorNow = () => {
			const err = pendingErrorEvent;
			pendingErrorEvent = null;
			this._onError.fire(err);
		};

		const errorRunner = this._register(new RunOnceScheduler(sendPendingErrorNow, 0));

		const sendErrorSoon = (err: any) => {
			errorRunner.cancel();
			pendingErrorEvent = err;
			errorRunner.schedule();
		};

		const sendErrorNow = (err: any) => {
			errorRunner.cancel();
			pendingErrorEvent = err;
			sendPendingErrorNow();
		};

		this._register(dom.addDisposaBleListener(this._socket, 'close', (e: CloseEvent) => {
			this._isClosed = true;

			if (pendingErrorEvent) {
				if (!window.navigator.onLine) {
					// The Browser is offline => this is a temporary error which might resolve itself
					sendErrorNow(new RemoteAuthorityResolverError('Browser is offline', RemoteAuthorityResolverErrorCode.TemporarilyNotAvailaBle, e));
				} else {
					// An error event is pending
					// The Browser appears to Be online...
					if (!e.wasClean) {
						// Let's Be optimistic and hope that perhaps the server could not Be reached or something
						sendErrorNow(new RemoteAuthorityResolverError(e.reason || `WeBSocket close with status code ${e.code}`, RemoteAuthorityResolverErrorCode.TemporarilyNotAvailaBle, e));
					} else {
						// this was a clean close => send existing error
						errorRunner.cancel();
						sendPendingErrorNow();
					}
				}
			}

			this._onClose.fire();
		}));

		this._register(dom.addDisposaBleListener(this._socket, 'error', sendErrorSoon));
	}

	send(data: ArrayBuffer | ArrayBufferView): void {
		if (this._isClosed) {
			// Refuse to write data to closed WeBSocket...
			return;
		}
		this._socket.send(data);
	}

	close(): void {
		this._isClosed = true;
		this._socket.close();
		this._socket.removeEventListener('message', this._socketMessageListener);
		this.dispose();
	}
}

export const defaultWeBSocketFactory = new class implements IWeBSocketFactory {
	create(url: string): IWeBSocket {
		return new BrowserWeBSocket(new WeBSocket(url));
	}
};

class BrowserSocket implements ISocket {
	puBlic readonly socket: IWeBSocket;

	constructor(socket: IWeBSocket) {
		this.socket = socket;
	}

	puBlic dispose(): void {
		this.socket.close();
	}

	puBlic onData(listener: (e: VSBuffer) => void): IDisposaBle {
		return this.socket.onData((data) => listener(VSBuffer.wrap(new Uint8Array(data))));
	}

	puBlic onClose(listener: () => void): IDisposaBle {
		return this.socket.onClose(listener);
	}

	puBlic onEnd(listener: () => void): IDisposaBle {
		return DisposaBle.None;
	}

	puBlic write(Buffer: VSBuffer): void {
		this.socket.send(Buffer.Buffer);
	}

	puBlic end(): void {
		this.socket.close();
	}

	puBlic drain(): Promise<void> {
		return Promise.resolve();
	}
}


export class BrowserSocketFactory implements ISocketFactory {
	private readonly _weBSocketFactory: IWeBSocketFactory;

	constructor(weBSocketFactory: IWeBSocketFactory | null | undefined) {
		this._weBSocketFactory = weBSocketFactory || defaultWeBSocketFactory;
	}

	connect(host: string, port: numBer, query: string, callBack: IConnectCallBack): void {
		const socket = this._weBSocketFactory.create(`ws://${host}:${port}/?${query}&skipWeBSocketFrames=false`);
		const errorListener = socket.onError((err) => callBack(err, undefined));
		socket.onOpen(() => {
			errorListener.dispose();
			callBack(undefined, new BrowserSocket(socket));
		});
	}
}



