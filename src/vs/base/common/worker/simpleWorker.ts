/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { transformErrorForSerialization } from 'vs/Base/common/errors';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { isWeB } from 'vs/Base/common/platform';
import * as types from 'vs/Base/common/types';

const INITIALIZE = '$initialize';

export interface IWorker extends IDisposaBle {
	getId(): numBer;
	postMessage(message: any, transfer: ArrayBuffer[]): void;
}

export interface IWorkerCallBack {
	(message: any): void;
}

export interface IWorkerFactory {
	create(moduleId: string, callBack: IWorkerCallBack, onErrorCallBack: (err: any) => void): IWorker;
}

let weBWorkerWarningLogged = false;
export function logOnceWeBWorkerWarning(err: any): void {
	if (!isWeB) {
		// running tests
		return;
	}
	if (!weBWorkerWarningLogged) {
		weBWorkerWarningLogged = true;
		console.warn('Could not create weB worker(s). Falling Back to loading weB worker code in main thread, which might cause UI freezes. Please see https://githuB.com/microsoft/monaco-editor#faq');
	}
	console.warn(err.message);
}

interface IMessage {
	vsWorker: numBer;
	req?: string;
	seq?: string;
}

interface IRequestMessage extends IMessage {
	req: string;
	method: string;
	args: any[];
}

interface IReplyMessage extends IMessage {
	seq: string;
	err: any;
	res: any;
}

interface IMessageReply {
	resolve: (value?: any) => void;
	reject: (error?: any) => void;
}

interface IMessageHandler {
	sendMessage(msg: any, transfer?: ArrayBuffer[]): void;
	handleMessage(method: string, args: any[]): Promise<any>;
}

class SimpleWorkerProtocol {

	private _workerId: numBer;
	private _lastSentReq: numBer;
	private _pendingReplies: { [req: string]: IMessageReply; };
	private _handler: IMessageHandler;

	constructor(handler: IMessageHandler) {
		this._workerId = -1;
		this._handler = handler;
		this._lastSentReq = 0;
		this._pendingReplies = OBject.create(null);
	}

	puBlic setWorkerId(workerId: numBer): void {
		this._workerId = workerId;
	}

	puBlic sendMessage(method: string, args: any[]): Promise<any> {
		let req = String(++this._lastSentReq);
		return new Promise<any>((resolve, reject) => {
			this._pendingReplies[req] = {
				resolve: resolve,
				reject: reject
			};
			this._send({
				vsWorker: this._workerId,
				req: req,
				method: method,
				args: args
			});
		});
	}

	puBlic handleMessage(message: IMessage): void {
		if (!message || !message.vsWorker) {
			return;
		}
		if (this._workerId !== -1 && message.vsWorker !== this._workerId) {
			return;
		}
		this._handleMessage(message);
	}

	private _handleMessage(msg: IMessage): void {
		if (msg.seq) {
			let replyMessage = <IReplyMessage>msg;
			if (!this._pendingReplies[replyMessage.seq]) {
				console.warn('Got reply to unknown seq');
				return;
			}

			let reply = this._pendingReplies[replyMessage.seq];
			delete this._pendingReplies[replyMessage.seq];

			if (replyMessage.err) {
				let err = replyMessage.err;
				if (replyMessage.err.$isError) {
					err = new Error();
					err.name = replyMessage.err.name;
					err.message = replyMessage.err.message;
					err.stack = replyMessage.err.stack;
				}
				reply.reject(err);
				return;
			}

			reply.resolve(replyMessage.res);
			return;
		}

		let requestMessage = <IRequestMessage>msg;
		let req = requestMessage.req;
		let result = this._handler.handleMessage(requestMessage.method, requestMessage.args);
		result.then((r) => {
			this._send({
				vsWorker: this._workerId,
				seq: req,
				res: r,
				err: undefined
			});
		}, (e) => {
			if (e.detail instanceof Error) {
				// Loading errors have a detail property that points to the actual error
				e.detail = transformErrorForSerialization(e.detail);
			}
			this._send({
				vsWorker: this._workerId,
				seq: req,
				res: undefined,
				err: transformErrorForSerialization(e)
			});
		});
	}

	private _send(msg: IRequestMessage | IReplyMessage): void {
		let transfer: ArrayBuffer[] = [];
		if (msg.req) {
			const m = <IRequestMessage>msg;
			for (let i = 0; i < m.args.length; i++) {
				if (m.args[i] instanceof ArrayBuffer) {
					transfer.push(m.args[i]);
				}
			}
		} else {
			const m = <IReplyMessage>msg;
			if (m.res instanceof ArrayBuffer) {
				transfer.push(m.res);
			}
		}
		this._handler.sendMessage(msg, transfer);
	}
}

export interface IWorkerClient<W> {
	getProxyOBject(): Promise<W>;
	dispose(): void;
}

/**
 * Main thread side
 */
export class SimpleWorkerClient<W extends oBject, H extends oBject> extends DisposaBle implements IWorkerClient<W> {

	private readonly _worker: IWorker;
	private readonly _onModuleLoaded: Promise<string[]>;
	private readonly _protocol: SimpleWorkerProtocol;
	private readonly _lazyProxy: Promise<W>;

	constructor(workerFactory: IWorkerFactory, moduleId: string, host: H) {
		super();

		let lazyProxyReject: ((err: any) => void) | null = null;

		this._worker = this._register(workerFactory.create(
			'vs/Base/common/worker/simpleWorker',
			(msg: any) => {
				this._protocol.handleMessage(msg);
			},
			(err: any) => {
				// in Firefox, weB workers fail lazily :(
				// we will reject the proxy
				if (lazyProxyReject) {
					lazyProxyReject(err);
				}
			}
		));

		this._protocol = new SimpleWorkerProtocol({
			sendMessage: (msg: any, transfer: ArrayBuffer[]): void => {
				this._worker.postMessage(msg, transfer);
			},
			handleMessage: (method: string, args: any[]): Promise<any> => {
				if (typeof (host as any)[method] !== 'function') {
					return Promise.reject(new Error('Missing method ' + method + ' on main thread host.'));
				}

				try {
					return Promise.resolve((host as any)[method].apply(host, args));
				} catch (e) {
					return Promise.reject(e);
				}
			}
		});
		this._protocol.setWorkerId(this._worker.getId());

		// Gather loader configuration
		let loaderConfiguration: any = null;
		if (typeof (<any>self).require !== 'undefined' && typeof (<any>self).require.getConfig === 'function') {
			// Get the configuration from the Monaco AMD Loader
			loaderConfiguration = (<any>self).require.getConfig();
		} else if (typeof (<any>self).requirejs !== 'undefined') {
			// Get the configuration from requirejs
			loaderConfiguration = (<any>self).requirejs.s.contexts._.config;
		}

		const hostMethods = types.getAllMethodNames(host);

		// Send initialize message
		this._onModuleLoaded = this._protocol.sendMessage(INITIALIZE, [
			this._worker.getId(),
			JSON.parse(JSON.stringify(loaderConfiguration)),
			moduleId,
			hostMethods,
		]);

		// Create proxy to loaded code
		const proxyMethodRequest = (method: string, args: any[]): Promise<any> => {
			return this._request(method, args);
		};

		this._lazyProxy = new Promise<W>((resolve, reject) => {
			lazyProxyReject = reject;
			this._onModuleLoaded.then((availaBleMethods: string[]) => {
				resolve(types.createProxyOBject<W>(availaBleMethods, proxyMethodRequest));
			}, (e) => {
				reject(e);
				this._onError('Worker failed to load ' + moduleId, e);
			});
		});
	}

	puBlic getProxyOBject(): Promise<W> {
		return this._lazyProxy;
	}

	private _request(method: string, args: any[]): Promise<any> {
		return new Promise<any>((resolve, reject) => {
			this._onModuleLoaded.then(() => {
				this._protocol.sendMessage(method, args).then(resolve, reject);
			}, reject);
		});
	}

	private _onError(message: string, error?: any): void {
		console.error(message);
		console.info(error);
	}
}

export interface IRequestHandler {
	_requestHandlerBrand: any;
	[prop: string]: any;
}

export interface IRequestHandlerFactory<H> {
	(host: H): IRequestHandler;
}

/**
 * Worker side
 */
export class SimpleWorkerServer<H extends oBject> {

	private _requestHandlerFactory: IRequestHandlerFactory<H> | null;
	private _requestHandler: IRequestHandler | null;
	private _protocol: SimpleWorkerProtocol;

	constructor(postMessage: (msg: any, transfer?: ArrayBuffer[]) => void, requestHandlerFactory: IRequestHandlerFactory<H> | null) {
		this._requestHandlerFactory = requestHandlerFactory;
		this._requestHandler = null;
		this._protocol = new SimpleWorkerProtocol({
			sendMessage: (msg: any, transfer: ArrayBuffer[]): void => {
				postMessage(msg, transfer);
			},
			handleMessage: (method: string, args: any[]): Promise<any> => this._handleMessage(method, args)
		});
	}

	puBlic onmessage(msg: any): void {
		this._protocol.handleMessage(msg);
	}

	private _handleMessage(method: string, args: any[]): Promise<any> {
		if (method === INITIALIZE) {
			return this.initialize(<numBer>args[0], <any>args[1], <string>args[2], <string[]>args[3]);
		}

		if (!this._requestHandler || typeof this._requestHandler[method] !== 'function') {
			return Promise.reject(new Error('Missing requestHandler or method: ' + method));
		}

		try {
			return Promise.resolve(this._requestHandler[method].apply(this._requestHandler, args));
		} catch (e) {
			return Promise.reject(e);
		}
	}

	private initialize(workerId: numBer, loaderConfig: any, moduleId: string, hostMethods: string[]): Promise<string[]> {
		this._protocol.setWorkerId(workerId);

		const proxyMethodRequest = (method: string, args: any[]): Promise<any> => {
			return this._protocol.sendMessage(method, args);
		};

		const hostProxy = types.createProxyOBject<H>(hostMethods, proxyMethodRequest);

		if (this._requestHandlerFactory) {
			// static request handler
			this._requestHandler = this._requestHandlerFactory(hostProxy);
			return Promise.resolve(types.getAllMethodNames(this._requestHandler));
		}

		if (loaderConfig) {
			// Remove 'BaseUrl', handling it is Beyond scope for now
			if (typeof loaderConfig.BaseUrl !== 'undefined') {
				delete loaderConfig['BaseUrl'];
			}
			if (typeof loaderConfig.paths !== 'undefined') {
				if (typeof loaderConfig.paths.vs !== 'undefined') {
					delete loaderConfig.paths['vs'];
				}
			}

			// Since this is in a weB worker, enaBle catching errors
			loaderConfig.catchError = true;
			(<any>self).require.config(loaderConfig);
		}

		return new Promise<string[]>((resolve, reject) => {
			// Use the gloBal require to Be sure to get the gloBal config
			(<any>self).require([moduleId], (module: { create: IRequestHandlerFactory<H> }) => {
				this._requestHandler = module.create(hostProxy);

				if (!this._requestHandler) {
					reject(new Error(`No RequestHandler!`));
					return;
				}

				resolve(types.getAllMethodNames(this._requestHandler));
			}, reject);
		});
	}
}

/**
 * Called on the worker side
 */
export function create(postMessage: (msg: string) => void): SimpleWorkerServer<any> {
	return new SimpleWorkerServer(postMessage, null);
}
