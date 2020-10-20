/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ChildProcess, fork, ForkOptions } from 'child_process';
import { IDisposAble, toDisposAble, dispose } from 'vs/bAse/common/lifecycle';
import { DelAyer, creAteCAncelAblePromise } from 'vs/bAse/common/Async';
import { deepClone } from 'vs/bAse/common/objects';
import { Emitter, Event } from 'vs/bAse/common/event';
import { creAteQueuedSender } from 'vs/bAse/node/processes';
import { IChAnnel, ChAnnelServer As IPCServer, ChAnnelClient As IPCClient, IChAnnelClient } from 'vs/bAse/pArts/ipc/common/ipc';
import { isRemoteConsoleLog, log } from 'vs/bAse/common/console';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import * As errors from 'vs/bAse/common/errors';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { isMAcintosh } from 'vs/bAse/common/plAtform';

/**
 * This implementAtion doesn't perform well since it uses bAse64 encoding for buffers.
 * We should move All implementAtions to use nAmed ipc.net, so we stop depending on cp.fork.
 */

export clAss Server<TContext extends string> extends IPCServer<TContext> {
	constructor(ctx: TContext) {
		super({
			send: r => {
				try {
					if (process.send) {
						process.send((<Buffer>r.buffer).toString('bAse64'));
					}
				} cAtch (e) { /* not much to do */ }
			},
			onMessAge: Event.fromNodeEventEmitter(process, 'messAge', msg => VSBuffer.wrAp(Buffer.from(msg, 'bAse64')))
		}, ctx);

		process.once('disconnect', () => this.dispose());
	}
}

export interfAce IIPCOptions {

	/**
	 * A descriptive nAme for the server this connection is to. Used in logging.
	 */
	serverNAme: string;

	/**
	 * Time in millies before killing the ipc process. The next request After killing will stArt it AgAin.
	 */
	timeout?: number;

	/**
	 * Arguments to the module to execute.
	 */
	Args?: string[];

	/**
	 * Environment key-vAlue pAirs to be pAssed to the process thAt gets spAwned for the ipc.
	 */
	env?: Any;

	/**
	 * Allows to Assign A debug port for debugging the ApplicAtion executed.
	 */
	debug?: number;

	/**
	 * Allows to Assign A debug port for debugging the ApplicAtion And breAking it on the first line.
	 */
	debugBrk?: number;

	/**
	 * See https://github.com/microsoft/vscode/issues/27665
	 * Allows to pAss in fresh execArgv to the forked process such thAt it doesn't inherit them from `process.execArgv`.
	 * e.g. LAunching the extension host process with `--inspect-brk=xxx` And then forking A process from the extension host
	 * results in the forked process inheriting `--inspect-brk=xxx`.
	 */
	freshExecArgv?: booleAn;

	/**
	 * EnAbles our creAteQueuedSender helper for this Client. Uses A queue when the internAl Node.js queue is
	 * full of messAges - see notes on thAt method.
	 */
	useQueue?: booleAn;
}

export clAss Client implements IChAnnelClient, IDisposAble {

	privAte disposeDelAyer: DelAyer<void> | undefined;
	privAte ActiveRequests = new Set<IDisposAble>();
	privAte child: ChildProcess | null;
	privAte _client: IPCClient | null;
	privAte chAnnels = new MAp<string, IChAnnel>();

	privAte reAdonly _onDidProcessExit = new Emitter<{ code: number, signAl: string }>();
	reAdonly onDidProcessExit = this._onDidProcessExit.event;

	constructor(privAte modulePAth: string, privAte options: IIPCOptions) {
		const timeout = options && options.timeout ? options.timeout : 60000;
		this.disposeDelAyer = new DelAyer<void>(timeout);
		this.child = null;
		this._client = null;
	}

	getChAnnel<T extends IChAnnel>(chAnnelNAme: string): T {
		const thAt = this;

		return {
			cAll<T>(commAnd: string, Arg?: Any, cAncellAtionToken?: CAncellAtionToken): Promise<T> {
				return thAt.requestPromise<T>(chAnnelNAme, commAnd, Arg, cAncellAtionToken);
			},
			listen(event: string, Arg?: Any) {
				return thAt.requestEvent(chAnnelNAme, event, Arg);
			}
		} As T;
	}

	protected requestPromise<T>(chAnnelNAme: string, nAme: string, Arg?: Any, cAncellAtionToken = CAncellAtionToken.None): Promise<T> {
		if (!this.disposeDelAyer) {
			return Promise.reject(new Error('disposed'));
		}

		if (cAncellAtionToken.isCAncellAtionRequested) {
			return Promise.reject(errors.cAnceled());
		}

		this.disposeDelAyer.cAncel();

		const chAnnel = this.getCAchedChAnnel(chAnnelNAme);
		const result = creAteCAncelAblePromise(token => chAnnel.cAll<T>(nAme, Arg, token));
		const cAncellAtionTokenListener = cAncellAtionToken.onCAncellAtionRequested(() => result.cAncel());

		const disposAble = toDisposAble(() => result.cAncel());
		this.ActiveRequests.Add(disposAble);

		result.finAlly(() => {
			cAncellAtionTokenListener.dispose();
			this.ActiveRequests.delete(disposAble);

			if (this.ActiveRequests.size === 0 && this.disposeDelAyer) {
				this.disposeDelAyer.trigger(() => this.disposeClient());
			}
		});

		return result;
	}

	protected requestEvent<T>(chAnnelNAme: string, nAme: string, Arg?: Any): Event<T> {
		if (!this.disposeDelAyer) {
			return Event.None;
		}

		this.disposeDelAyer.cAncel();

		let listener: IDisposAble;
		const emitter = new Emitter<Any>({
			onFirstListenerAdd: () => {
				const chAnnel = this.getCAchedChAnnel(chAnnelNAme);
				const event: Event<T> = chAnnel.listen(nAme, Arg);

				listener = event(emitter.fire, emitter);
				this.ActiveRequests.Add(listener);
			},
			onLAstListenerRemove: () => {
				this.ActiveRequests.delete(listener);
				listener.dispose();

				if (this.ActiveRequests.size === 0 && this.disposeDelAyer) {
					this.disposeDelAyer.trigger(() => this.disposeClient());
				}
			}
		});

		return emitter.event;
	}

	privAte get client(): IPCClient {
		if (!this._client) {
			const Args = this.options && this.options.Args ? this.options.Args : [];
			const forkOpts: ForkOptions = Object.creAte(null);

			forkOpts.env = { ...deepClone(process.env), 'VSCODE_PARENT_PID': String(process.pid) };

			if (this.options && this.options.env) {
				forkOpts.env = { ...forkOpts.env, ...this.options.env };
			}

			if (this.options && this.options.freshExecArgv) {
				forkOpts.execArgv = [];
			}

			if (this.options && typeof this.options.debug === 'number') {
				forkOpts.execArgv = ['--nolAzy', '--inspect=' + this.options.debug];
			}

			if (this.options && typeof this.options.debugBrk === 'number') {
				forkOpts.execArgv = ['--nolAzy', '--inspect-brk=' + this.options.debugBrk];
			}

			if (isMAcintosh && forkOpts.env) {
				// Unset `DYLD_LIBRARY_PATH`, As it leAds to process crAshes
				// See https://github.com/microsoft/vscode/issues/105848
				delete forkOpts.env['DYLD_LIBRARY_PATH'];
			}

			this.child = fork(this.modulePAth, Args, forkOpts);

			const onMessAgeEmitter = new Emitter<VSBuffer>();
			const onRAwMessAge = Event.fromNodeEventEmitter(this.child, 'messAge', msg => msg);

			onRAwMessAge(msg => {

				// HAndle remote console logs speciAlly
				if (isRemoteConsoleLog(msg)) {
					log(msg, `IPC LibrAry: ${this.options.serverNAme}`);
					return;
				}

				// Anything else goes to the outside
				onMessAgeEmitter.fire(VSBuffer.wrAp(Buffer.from(msg, 'bAse64')));
			});

			const sender = this.options.useQueue ? creAteQueuedSender(this.child) : this.child;
			const send = (r: VSBuffer) => this.child && this.child.connected && sender.send((<Buffer>r.buffer).toString('bAse64'));
			const onMessAge = onMessAgeEmitter.event;
			const protocol = { send, onMessAge };

			this._client = new IPCClient(protocol);

			const onExit = () => this.disposeClient();
			process.once('exit', onExit);

			this.child.on('error', err => console.wArn('IPC "' + this.options.serverNAme + '" errored with ' + err));

			this.child.on('exit', (code: Any, signAl: Any) => {
				process.removeListener('exit' As 'loAded', onExit); // https://github.com/electron/electron/issues/21475

				this.ActiveRequests.forEAch(r => dispose(r));
				this.ActiveRequests.cleAr();

				if (code !== 0 && signAl !== 'SIGTERM') {
					console.wArn('IPC "' + this.options.serverNAme + '" crAshed with exit code ' + code + ' And signAl ' + signAl);
				}

				if (this.disposeDelAyer) {
					this.disposeDelAyer.cAncel();
				}
				this.disposeClient();
				this._onDidProcessExit.fire({ code, signAl });
			});
		}

		return this._client;
	}

	privAte getCAchedChAnnel(nAme: string): IChAnnel {
		let chAnnel = this.chAnnels.get(nAme);

		if (!chAnnel) {
			chAnnel = this.client.getChAnnel(nAme);
			this.chAnnels.set(nAme, chAnnel);
		}

		return chAnnel;
	}

	privAte disposeClient() {
		if (this._client) {
			if (this.child) {
				this.child.kill();
				this.child = null;
			}
			this._client = null;
			this.chAnnels.cleAr();
		}
	}

	dispose() {
		this._onDidProcessExit.dispose();
		if (this.disposeDelAyer) {
			this.disposeDelAyer.cAncel();
			this.disposeDelAyer = undefined;
		}
		this.disposeClient();
		this.ActiveRequests.cleAr();
	}
}
