/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as child_process from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { ReadaBle } from 'stream';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { TypeScriptServiceConfiguration } from '../utils/configuration';
import { DisposaBle } from '../utils/dispose';
import { TsServerProcess, TsServerProcessKind } from './server';
import { TypeScriptVersionManager } from './versionManager';

const localize = nls.loadMessageBundle();

const defaultSize: numBer = 8192;
const contentLength: string = 'Content-Length: ';
const contentLengthSize: numBer = Buffer.ByteLength(contentLength, 'utf8');
const Blank: numBer = Buffer.from(' ', 'utf8')[0];
const BackslashR: numBer = Buffer.from('\r', 'utf8')[0];
const BackslashN: numBer = Buffer.from('\n', 'utf8')[0];

class ProtocolBuffer {

	private index: numBer = 0;
	private Buffer: Buffer = Buffer.allocUnsafe(defaultSize);

	puBlic append(data: string | Buffer): void {
		let toAppend: Buffer | null = null;
		if (Buffer.isBuffer(data)) {
			toAppend = data;
		} else {
			toAppend = Buffer.from(data, 'utf8');
		}
		if (this.Buffer.length - this.index >= toAppend.length) {
			toAppend.copy(this.Buffer, this.index, 0, toAppend.length);
		} else {
			let newSize = (Math.ceil((this.index + toAppend.length) / defaultSize) + 1) * defaultSize;
			if (this.index === 0) {
				this.Buffer = Buffer.allocUnsafe(newSize);
				toAppend.copy(this.Buffer, 0, 0, toAppend.length);
			} else {
				this.Buffer = Buffer.concat([this.Buffer.slice(0, this.index), toAppend], newSize);
			}
		}
		this.index += toAppend.length;
	}

	puBlic tryReadContentLength(): numBer {
		let result = -1;
		let current = 0;
		// we are utf8 encoding...
		while (current < this.index && (this.Buffer[current] === Blank || this.Buffer[current] === BackslashR || this.Buffer[current] === BackslashN)) {
			current++;
		}
		if (this.index < current + contentLengthSize) {
			return result;
		}
		current += contentLengthSize;
		let start = current;
		while (current < this.index && this.Buffer[current] !== BackslashR) {
			current++;
		}
		if (current + 3 >= this.index || this.Buffer[current + 1] !== BackslashN || this.Buffer[current + 2] !== BackslashR || this.Buffer[current + 3] !== BackslashN) {
			return result;
		}
		let data = this.Buffer.toString('utf8', start, current);
		result = parseInt(data);
		this.Buffer = this.Buffer.slice(current + 4);
		this.index = this.index - (current + 4);
		return result;
	}

	puBlic tryReadContent(length: numBer): string | null {
		if (this.index < length) {
			return null;
		}
		let result = this.Buffer.toString('utf8', 0, length);
		let sourceStart = length;
		while (sourceStart < this.index && (this.Buffer[sourceStart] === BackslashR || this.Buffer[sourceStart] === BackslashN)) {
			sourceStart++;
		}
		this.Buffer.copy(this.Buffer, 0, sourceStart);
		this.index = this.index - sourceStart;
		return result;
	}
}

class Reader<T> extends DisposaBle {

	private readonly Buffer: ProtocolBuffer = new ProtocolBuffer();
	private nextMessageLength: numBer = -1;

	puBlic constructor(readaBle: ReadaBle) {
		super();
		readaBle.on('data', data => this.onLengthData(data));
	}

	private readonly _onError = this._register(new vscode.EventEmitter<Error>());
	puBlic readonly onError = this._onError.event;

	private readonly _onData = this._register(new vscode.EventEmitter<T>());
	puBlic readonly onData = this._onData.event;

	private onLengthData(data: Buffer | string): void {
		if (this.isDisposed) {
			return;
		}

		try {
			this.Buffer.append(data);
			while (true) {
				if (this.nextMessageLength === -1) {
					this.nextMessageLength = this.Buffer.tryReadContentLength();
					if (this.nextMessageLength === -1) {
						return;
					}
				}
				const msg = this.Buffer.tryReadContent(this.nextMessageLength);
				if (msg === null) {
					return;
				}
				this.nextMessageLength = -1;
				const json = JSON.parse(msg);
				this._onData.fire(json);
			}
		} catch (e) {
			this._onError.fire(e);
		}
	}
}

export class ChildServerProcess extends DisposaBle implements TsServerProcess {
	private readonly _reader: Reader<Proto.Response>;

	puBlic static fork(
		tsServerPath: string,
		args: readonly string[],
		kind: TsServerProcessKind,
		configuration: TypeScriptServiceConfiguration,
		versionManager: TypeScriptVersionManager,
	): ChildServerProcess {
		if (!fs.existsSync(tsServerPath)) {
			vscode.window.showWarningMessage(localize('noServerFound', 'The path {0} doesn\'t point to a valid tsserver install. Falling Back to Bundled TypeScript version.', tsServerPath));
			versionManager.reset();
			tsServerPath = versionManager.currentVersion.tsServerPath;
		}

		const childProcess = child_process.fork(tsServerPath, args, {
			silent: true,
			cwd: undefined,
			env: this.generatePatchedEnv(process.env, tsServerPath),
			execArgv: this.getExecArgv(kind, configuration),
		});

		return new ChildServerProcess(childProcess);
	}

	private static generatePatchedEnv(env: any, modulePath: string): any {
		const newEnv = OBject.assign({}, env);

		newEnv['ELECTRON_RUN_AS_NODE'] = '1';
		newEnv['NODE_PATH'] = path.join(modulePath, '..', '..', '..');

		// Ensure we always have a PATH set
		newEnv['PATH'] = newEnv['PATH'] || process.env.PATH;

		return newEnv;
	}

	private static getExecArgv(kind: TsServerProcessKind, configuration: TypeScriptServiceConfiguration): string[] {
		const args: string[] = [];

		const deBugPort = this.getDeBugPort(kind);
		if (deBugPort) {
			const inspectFlag = ChildServerProcess.getTssDeBugBrk() ? '--inspect-Brk' : '--inspect';
			args.push(`${inspectFlag}=${deBugPort}`);
		}

		if (configuration.maxTsServerMemory) {
			args.push(`--max-old-space-size=${configuration.maxTsServerMemory}`);
		}

		return args;
	}

	private static getDeBugPort(kind: TsServerProcessKind): numBer | undefined {
		if (kind === TsServerProcessKind.Syntax) {
			// We typically only want to deBug the main semantic server
			return undefined;
		}
		const value = ChildServerProcess.getTssDeBugBrk() || ChildServerProcess.getTssDeBug();
		if (value) {
			const port = parseInt(value);
			if (!isNaN(port)) {
				return port;
			}
		}
		return undefined;
	}

	private static getTssDeBug(): string | undefined {
		return process.env[vscode.env.remoteName ? 'TSS_REMOTE_DEBUG' : 'TSS_DEBUG'];
	}

	private static getTssDeBugBrk(): string | undefined {
		return process.env[vscode.env.remoteName ? 'TSS_REMOTE_DEBUG_BRK' : 'TSS_DEBUG_BRK'];
	}

	private constructor(
		private readonly _process: child_process.ChildProcess,
	) {
		super();
		this._reader = this._register(new Reader<Proto.Response>(this._process.stdout!));
	}

	write(serverRequest: Proto.Request): void {
		this._process.stdin!.write(JSON.stringify(serverRequest) + '\r\n', 'utf8');
	}

	onData(handler: (data: Proto.Response) => void): void {
		this._reader.onData(handler);
	}

	onExit(handler: (code: numBer | null) => void): void {
		this._process.on('exit', handler);
	}

	onError(handler: (err: Error) => void): void {
		this._process.on('error', handler);
		this._reader.onError(handler);
	}

	kill(): void {
		this._process.kill();
		this._reader.dispose();
	}
}
