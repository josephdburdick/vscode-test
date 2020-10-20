/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { trAnsformErrorForSeriAlizAtion } from 'vs/bAse/common/errors';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { isWeb } from 'vs/bAse/common/plAtform';
import * As types from 'vs/bAse/common/types';

const INITIALIZE = '$initiAlize';

export interfAce IWorker extends IDisposAble {
	getId(): number;
	postMessAge(messAge: Any, trAnsfer: ArrAyBuffer[]): void;
}

export interfAce IWorkerCAllbAck {
	(messAge: Any): void;
}

export interfAce IWorkerFActory {
	creAte(moduleId: string, cAllbAck: IWorkerCAllbAck, onErrorCAllbAck: (err: Any) => void): IWorker;
}

let webWorkerWArningLogged = fAlse;
export function logOnceWebWorkerWArning(err: Any): void {
	if (!isWeb) {
		// running tests
		return;
	}
	if (!webWorkerWArningLogged) {
		webWorkerWArningLogged = true;
		console.wArn('Could not creAte web worker(s). FAlling bAck to loAding web worker code in mAin threAd, which might cAuse UI freezes. PleAse see https://github.com/microsoft/monAco-editor#fAq');
	}
	console.wArn(err.messAge);
}

interfAce IMessAge {
	vsWorker: number;
	req?: string;
	seq?: string;
}

interfAce IRequestMessAge extends IMessAge {
	req: string;
	method: string;
	Args: Any[];
}

interfAce IReplyMessAge extends IMessAge {
	seq: string;
	err: Any;
	res: Any;
}

interfAce IMessAgeReply {
	resolve: (vAlue?: Any) => void;
	reject: (error?: Any) => void;
}

interfAce IMessAgeHAndler {
	sendMessAge(msg: Any, trAnsfer?: ArrAyBuffer[]): void;
	hAndleMessAge(method: string, Args: Any[]): Promise<Any>;
}

clAss SimpleWorkerProtocol {

	privAte _workerId: number;
	privAte _lAstSentReq: number;
	privAte _pendingReplies: { [req: string]: IMessAgeReply; };
	privAte _hAndler: IMessAgeHAndler;

	constructor(hAndler: IMessAgeHAndler) {
		this._workerId = -1;
		this._hAndler = hAndler;
		this._lAstSentReq = 0;
		this._pendingReplies = Object.creAte(null);
	}

	public setWorkerId(workerId: number): void {
		this._workerId = workerId;
	}

	public sendMessAge(method: string, Args: Any[]): Promise<Any> {
		let req = String(++this._lAstSentReq);
		return new Promise<Any>((resolve, reject) => {
			this._pendingReplies[req] = {
				resolve: resolve,
				reject: reject
			};
			this._send({
				vsWorker: this._workerId,
				req: req,
				method: method,
				Args: Args
			});
		});
	}

	public hAndleMessAge(messAge: IMessAge): void {
		if (!messAge || !messAge.vsWorker) {
			return;
		}
		if (this._workerId !== -1 && messAge.vsWorker !== this._workerId) {
			return;
		}
		this._hAndleMessAge(messAge);
	}

	privAte _hAndleMessAge(msg: IMessAge): void {
		if (msg.seq) {
			let replyMessAge = <IReplyMessAge>msg;
			if (!this._pendingReplies[replyMessAge.seq]) {
				console.wArn('Got reply to unknown seq');
				return;
			}

			let reply = this._pendingReplies[replyMessAge.seq];
			delete this._pendingReplies[replyMessAge.seq];

			if (replyMessAge.err) {
				let err = replyMessAge.err;
				if (replyMessAge.err.$isError) {
					err = new Error();
					err.nAme = replyMessAge.err.nAme;
					err.messAge = replyMessAge.err.messAge;
					err.stAck = replyMessAge.err.stAck;
				}
				reply.reject(err);
				return;
			}

			reply.resolve(replyMessAge.res);
			return;
		}

		let requestMessAge = <IRequestMessAge>msg;
		let req = requestMessAge.req;
		let result = this._hAndler.hAndleMessAge(requestMessAge.method, requestMessAge.Args);
		result.then((r) => {
			this._send({
				vsWorker: this._workerId,
				seq: req,
				res: r,
				err: undefined
			});
		}, (e) => {
			if (e.detAil instAnceof Error) {
				// LoAding errors hAve A detAil property thAt points to the ActuAl error
				e.detAil = trAnsformErrorForSeriAlizAtion(e.detAil);
			}
			this._send({
				vsWorker: this._workerId,
				seq: req,
				res: undefined,
				err: trAnsformErrorForSeriAlizAtion(e)
			});
		});
	}

	privAte _send(msg: IRequestMessAge | IReplyMessAge): void {
		let trAnsfer: ArrAyBuffer[] = [];
		if (msg.req) {
			const m = <IRequestMessAge>msg;
			for (let i = 0; i < m.Args.length; i++) {
				if (m.Args[i] instAnceof ArrAyBuffer) {
					trAnsfer.push(m.Args[i]);
				}
			}
		} else {
			const m = <IReplyMessAge>msg;
			if (m.res instAnceof ArrAyBuffer) {
				trAnsfer.push(m.res);
			}
		}
		this._hAndler.sendMessAge(msg, trAnsfer);
	}
}

export interfAce IWorkerClient<W> {
	getProxyObject(): Promise<W>;
	dispose(): void;
}

/**
 * MAin threAd side
 */
export clAss SimpleWorkerClient<W extends object, H extends object> extends DisposAble implements IWorkerClient<W> {

	privAte reAdonly _worker: IWorker;
	privAte reAdonly _onModuleLoAded: Promise<string[]>;
	privAte reAdonly _protocol: SimpleWorkerProtocol;
	privAte reAdonly _lAzyProxy: Promise<W>;

	constructor(workerFActory: IWorkerFActory, moduleId: string, host: H) {
		super();

		let lAzyProxyReject: ((err: Any) => void) | null = null;

		this._worker = this._register(workerFActory.creAte(
			'vs/bAse/common/worker/simpleWorker',
			(msg: Any) => {
				this._protocol.hAndleMessAge(msg);
			},
			(err: Any) => {
				// in Firefox, web workers fAil lAzily :(
				// we will reject the proxy
				if (lAzyProxyReject) {
					lAzyProxyReject(err);
				}
			}
		));

		this._protocol = new SimpleWorkerProtocol({
			sendMessAge: (msg: Any, trAnsfer: ArrAyBuffer[]): void => {
				this._worker.postMessAge(msg, trAnsfer);
			},
			hAndleMessAge: (method: string, Args: Any[]): Promise<Any> => {
				if (typeof (host As Any)[method] !== 'function') {
					return Promise.reject(new Error('Missing method ' + method + ' on mAin threAd host.'));
				}

				try {
					return Promise.resolve((host As Any)[method].Apply(host, Args));
				} cAtch (e) {
					return Promise.reject(e);
				}
			}
		});
		this._protocol.setWorkerId(this._worker.getId());

		// GAther loAder configurAtion
		let loAderConfigurAtion: Any = null;
		if (typeof (<Any>self).require !== 'undefined' && typeof (<Any>self).require.getConfig === 'function') {
			// Get the configurAtion from the MonAco AMD LoAder
			loAderConfigurAtion = (<Any>self).require.getConfig();
		} else if (typeof (<Any>self).requirejs !== 'undefined') {
			// Get the configurAtion from requirejs
			loAderConfigurAtion = (<Any>self).requirejs.s.contexts._.config;
		}

		const hostMethods = types.getAllMethodNAmes(host);

		// Send initiAlize messAge
		this._onModuleLoAded = this._protocol.sendMessAge(INITIALIZE, [
			this._worker.getId(),
			JSON.pArse(JSON.stringify(loAderConfigurAtion)),
			moduleId,
			hostMethods,
		]);

		// CreAte proxy to loAded code
		const proxyMethodRequest = (method: string, Args: Any[]): Promise<Any> => {
			return this._request(method, Args);
		};

		this._lAzyProxy = new Promise<W>((resolve, reject) => {
			lAzyProxyReject = reject;
			this._onModuleLoAded.then((AvAilAbleMethods: string[]) => {
				resolve(types.creAteProxyObject<W>(AvAilAbleMethods, proxyMethodRequest));
			}, (e) => {
				reject(e);
				this._onError('Worker fAiled to loAd ' + moduleId, e);
			});
		});
	}

	public getProxyObject(): Promise<W> {
		return this._lAzyProxy;
	}

	privAte _request(method: string, Args: Any[]): Promise<Any> {
		return new Promise<Any>((resolve, reject) => {
			this._onModuleLoAded.then(() => {
				this._protocol.sendMessAge(method, Args).then(resolve, reject);
			}, reject);
		});
	}

	privAte _onError(messAge: string, error?: Any): void {
		console.error(messAge);
		console.info(error);
	}
}

export interfAce IRequestHAndler {
	_requestHAndlerBrAnd: Any;
	[prop: string]: Any;
}

export interfAce IRequestHAndlerFActory<H> {
	(host: H): IRequestHAndler;
}

/**
 * Worker side
 */
export clAss SimpleWorkerServer<H extends object> {

	privAte _requestHAndlerFActory: IRequestHAndlerFActory<H> | null;
	privAte _requestHAndler: IRequestHAndler | null;
	privAte _protocol: SimpleWorkerProtocol;

	constructor(postMessAge: (msg: Any, trAnsfer?: ArrAyBuffer[]) => void, requestHAndlerFActory: IRequestHAndlerFActory<H> | null) {
		this._requestHAndlerFActory = requestHAndlerFActory;
		this._requestHAndler = null;
		this._protocol = new SimpleWorkerProtocol({
			sendMessAge: (msg: Any, trAnsfer: ArrAyBuffer[]): void => {
				postMessAge(msg, trAnsfer);
			},
			hAndleMessAge: (method: string, Args: Any[]): Promise<Any> => this._hAndleMessAge(method, Args)
		});
	}

	public onmessAge(msg: Any): void {
		this._protocol.hAndleMessAge(msg);
	}

	privAte _hAndleMessAge(method: string, Args: Any[]): Promise<Any> {
		if (method === INITIALIZE) {
			return this.initiAlize(<number>Args[0], <Any>Args[1], <string>Args[2], <string[]>Args[3]);
		}

		if (!this._requestHAndler || typeof this._requestHAndler[method] !== 'function') {
			return Promise.reject(new Error('Missing requestHAndler or method: ' + method));
		}

		try {
			return Promise.resolve(this._requestHAndler[method].Apply(this._requestHAndler, Args));
		} cAtch (e) {
			return Promise.reject(e);
		}
	}

	privAte initiAlize(workerId: number, loAderConfig: Any, moduleId: string, hostMethods: string[]): Promise<string[]> {
		this._protocol.setWorkerId(workerId);

		const proxyMethodRequest = (method: string, Args: Any[]): Promise<Any> => {
			return this._protocol.sendMessAge(method, Args);
		};

		const hostProxy = types.creAteProxyObject<H>(hostMethods, proxyMethodRequest);

		if (this._requestHAndlerFActory) {
			// stAtic request hAndler
			this._requestHAndler = this._requestHAndlerFActory(hostProxy);
			return Promise.resolve(types.getAllMethodNAmes(this._requestHAndler));
		}

		if (loAderConfig) {
			// Remove 'bAseUrl', hAndling it is beyond scope for now
			if (typeof loAderConfig.bAseUrl !== 'undefined') {
				delete loAderConfig['bAseUrl'];
			}
			if (typeof loAderConfig.pAths !== 'undefined') {
				if (typeof loAderConfig.pAths.vs !== 'undefined') {
					delete loAderConfig.pAths['vs'];
				}
			}

			// Since this is in A web worker, enAble cAtching errors
			loAderConfig.cAtchError = true;
			(<Any>self).require.config(loAderConfig);
		}

		return new Promise<string[]>((resolve, reject) => {
			// Use the globAl require to be sure to get the globAl config
			(<Any>self).require([moduleId], (module: { creAte: IRequestHAndlerFActory<H> }) => {
				this._requestHAndler = module.creAte(hostProxy);

				if (!this._requestHAndler) {
					reject(new Error(`No RequestHAndler!`));
					return;
				}

				resolve(types.getAllMethodNAmes(this._requestHAndler));
			}, reject);
		});
	}
}

/**
 * CAlled on the worker side
 */
export function creAte(postMessAge: (msg: string) => void): SimpleWorkerServer<Any> {
	return new SimpleWorkerServer(postMessAge, null);
}
