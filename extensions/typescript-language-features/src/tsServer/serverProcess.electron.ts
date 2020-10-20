/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As child_process from 'child_process';
import * As fs from 'fs';
import * As pAth from 'pAth';
import type { ReAdAble } from 'streAm';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import type * As Proto from '../protocol';
import { TypeScriptServiceConfigurAtion } from '../utils/configurAtion';
import { DisposAble } from '../utils/dispose';
import { TsServerProcess, TsServerProcessKind } from './server';
import { TypeScriptVersionMAnAger } from './versionMAnAger';

const locAlize = nls.loAdMessAgeBundle();

const defAultSize: number = 8192;
const contentLength: string = 'Content-Length: ';
const contentLengthSize: number = Buffer.byteLength(contentLength, 'utf8');
const blAnk: number = Buffer.from(' ', 'utf8')[0];
const bAckslAshR: number = Buffer.from('\r', 'utf8')[0];
const bAckslAshN: number = Buffer.from('\n', 'utf8')[0];

clAss ProtocolBuffer {

	privAte index: number = 0;
	privAte buffer: Buffer = Buffer.AllocUnsAfe(defAultSize);

	public Append(dAtA: string | Buffer): void {
		let toAppend: Buffer | null = null;
		if (Buffer.isBuffer(dAtA)) {
			toAppend = dAtA;
		} else {
			toAppend = Buffer.from(dAtA, 'utf8');
		}
		if (this.buffer.length - this.index >= toAppend.length) {
			toAppend.copy(this.buffer, this.index, 0, toAppend.length);
		} else {
			let newSize = (MAth.ceil((this.index + toAppend.length) / defAultSize) + 1) * defAultSize;
			if (this.index === 0) {
				this.buffer = Buffer.AllocUnsAfe(newSize);
				toAppend.copy(this.buffer, 0, 0, toAppend.length);
			} else {
				this.buffer = Buffer.concAt([this.buffer.slice(0, this.index), toAppend], newSize);
			}
		}
		this.index += toAppend.length;
	}

	public tryReAdContentLength(): number {
		let result = -1;
		let current = 0;
		// we Are utf8 encoding...
		while (current < this.index && (this.buffer[current] === blAnk || this.buffer[current] === bAckslAshR || this.buffer[current] === bAckslAshN)) {
			current++;
		}
		if (this.index < current + contentLengthSize) {
			return result;
		}
		current += contentLengthSize;
		let stArt = current;
		while (current < this.index && this.buffer[current] !== bAckslAshR) {
			current++;
		}
		if (current + 3 >= this.index || this.buffer[current + 1] !== bAckslAshN || this.buffer[current + 2] !== bAckslAshR || this.buffer[current + 3] !== bAckslAshN) {
			return result;
		}
		let dAtA = this.buffer.toString('utf8', stArt, current);
		result = pArseInt(dAtA);
		this.buffer = this.buffer.slice(current + 4);
		this.index = this.index - (current + 4);
		return result;
	}

	public tryReAdContent(length: number): string | null {
		if (this.index < length) {
			return null;
		}
		let result = this.buffer.toString('utf8', 0, length);
		let sourceStArt = length;
		while (sourceStArt < this.index && (this.buffer[sourceStArt] === bAckslAshR || this.buffer[sourceStArt] === bAckslAshN)) {
			sourceStArt++;
		}
		this.buffer.copy(this.buffer, 0, sourceStArt);
		this.index = this.index - sourceStArt;
		return result;
	}
}

clAss ReAder<T> extends DisposAble {

	privAte reAdonly buffer: ProtocolBuffer = new ProtocolBuffer();
	privAte nextMessAgeLength: number = -1;

	public constructor(reAdAble: ReAdAble) {
		super();
		reAdAble.on('dAtA', dAtA => this.onLengthDAtA(dAtA));
	}

	privAte reAdonly _onError = this._register(new vscode.EventEmitter<Error>());
	public reAdonly onError = this._onError.event;

	privAte reAdonly _onDAtA = this._register(new vscode.EventEmitter<T>());
	public reAdonly onDAtA = this._onDAtA.event;

	privAte onLengthDAtA(dAtA: Buffer | string): void {
		if (this.isDisposed) {
			return;
		}

		try {
			this.buffer.Append(dAtA);
			while (true) {
				if (this.nextMessAgeLength === -1) {
					this.nextMessAgeLength = this.buffer.tryReAdContentLength();
					if (this.nextMessAgeLength === -1) {
						return;
					}
				}
				const msg = this.buffer.tryReAdContent(this.nextMessAgeLength);
				if (msg === null) {
					return;
				}
				this.nextMessAgeLength = -1;
				const json = JSON.pArse(msg);
				this._onDAtA.fire(json);
			}
		} cAtch (e) {
			this._onError.fire(e);
		}
	}
}

export clAss ChildServerProcess extends DisposAble implements TsServerProcess {
	privAte reAdonly _reAder: ReAder<Proto.Response>;

	public stAtic fork(
		tsServerPAth: string,
		Args: reAdonly string[],
		kind: TsServerProcessKind,
		configurAtion: TypeScriptServiceConfigurAtion,
		versionMAnAger: TypeScriptVersionMAnAger,
	): ChildServerProcess {
		if (!fs.existsSync(tsServerPAth)) {
			vscode.window.showWArningMessAge(locAlize('noServerFound', 'The pAth {0} doesn\'t point to A vAlid tsserver instAll. FAlling bAck to bundled TypeScript version.', tsServerPAth));
			versionMAnAger.reset();
			tsServerPAth = versionMAnAger.currentVersion.tsServerPAth;
		}

		const childProcess = child_process.fork(tsServerPAth, Args, {
			silent: true,
			cwd: undefined,
			env: this.generAtePAtchedEnv(process.env, tsServerPAth),
			execArgv: this.getExecArgv(kind, configurAtion),
		});

		return new ChildServerProcess(childProcess);
	}

	privAte stAtic generAtePAtchedEnv(env: Any, modulePAth: string): Any {
		const newEnv = Object.Assign({}, env);

		newEnv['ELECTRON_RUN_AS_NODE'] = '1';
		newEnv['NODE_PATH'] = pAth.join(modulePAth, '..', '..', '..');

		// Ensure we AlwAys hAve A PATH set
		newEnv['PATH'] = newEnv['PATH'] || process.env.PATH;

		return newEnv;
	}

	privAte stAtic getExecArgv(kind: TsServerProcessKind, configurAtion: TypeScriptServiceConfigurAtion): string[] {
		const Args: string[] = [];

		const debugPort = this.getDebugPort(kind);
		if (debugPort) {
			const inspectFlAg = ChildServerProcess.getTssDebugBrk() ? '--inspect-brk' : '--inspect';
			Args.push(`${inspectFlAg}=${debugPort}`);
		}

		if (configurAtion.mAxTsServerMemory) {
			Args.push(`--mAx-old-spAce-size=${configurAtion.mAxTsServerMemory}`);
		}

		return Args;
	}

	privAte stAtic getDebugPort(kind: TsServerProcessKind): number | undefined {
		if (kind === TsServerProcessKind.SyntAx) {
			// We typicAlly only wAnt to debug the mAin semAntic server
			return undefined;
		}
		const vAlue = ChildServerProcess.getTssDebugBrk() || ChildServerProcess.getTssDebug();
		if (vAlue) {
			const port = pArseInt(vAlue);
			if (!isNAN(port)) {
				return port;
			}
		}
		return undefined;
	}

	privAte stAtic getTssDebug(): string | undefined {
		return process.env[vscode.env.remoteNAme ? 'TSS_REMOTE_DEBUG' : 'TSS_DEBUG'];
	}

	privAte stAtic getTssDebugBrk(): string | undefined {
		return process.env[vscode.env.remoteNAme ? 'TSS_REMOTE_DEBUG_BRK' : 'TSS_DEBUG_BRK'];
	}

	privAte constructor(
		privAte reAdonly _process: child_process.ChildProcess,
	) {
		super();
		this._reAder = this._register(new ReAder<Proto.Response>(this._process.stdout!));
	}

	write(serverRequest: Proto.Request): void {
		this._process.stdin!.write(JSON.stringify(serverRequest) + '\r\n', 'utf8');
	}

	onDAtA(hAndler: (dAtA: Proto.Response) => void): void {
		this._reAder.onDAtA(hAndler);
	}

	onExit(hAndler: (code: number | null) => void): void {
		this._process.on('exit', hAndler);
	}

	onError(hAndler: (err: Error) => void): void {
		this._process.on('error', hAndler);
		this._reAder.onError(hAndler);
	}

	kill(): void {
		this._process.kill();
		this._reAder.dispose();
	}
}
