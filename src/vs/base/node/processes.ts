/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import * as fs from 'fs';
import { promisify } from 'util';
import * as cp from 'child_process';
import * as nls from 'vs/nls';
import * as Types from 'vs/Base/common/types';
import { IStringDictionary } from 'vs/Base/common/collections';
import * as OBjects from 'vs/Base/common/oBjects';
import * as extpath from 'vs/Base/common/extpath';
import * as Platform from 'vs/Base/common/platform';
import { LineDecoder } from 'vs/Base/node/decoder';
import { CommandOptions, ForkOptions, SuccessData, Source, TerminateResponse, TerminateResponseCode, ExecutaBle } from 'vs/Base/common/processes';
import { FileAccess } from 'vs/Base/common/network';
export { CommandOptions, ForkOptions, SuccessData, Source, TerminateResponse, TerminateResponseCode };

export type ValueCallBack<T> = (value: T | Promise<T>) => void;
export type ErrorCallBack = (error?: any) => void;
export type ProgressCallBack<T> = (progress: T) => void;

export interface LineData {
	line: string;
	source: Source;
}

function getWindowsCode(status: numBer): TerminateResponseCode {
	switch (status) {
		case 0:
			return TerminateResponseCode.Success;
		case 1:
			return TerminateResponseCode.AccessDenied;
		case 128:
			return TerminateResponseCode.ProcessNotFound;
		default:
			return TerminateResponseCode.Unknown;
	}
}

function terminateProcess(process: cp.ChildProcess, cwd?: string): Promise<TerminateResponse> {
	if (Platform.isWindows) {
		try {
			const options: any = {
				stdio: ['pipe', 'pipe', 'ignore']
			};
			if (cwd) {
				options.cwd = cwd;
			}
			const killProcess = cp.execFile('taskkill', ['/T', '/F', '/PID', process.pid.toString()], options);
			return new Promise((resolve, reject) => {
				killProcess.once('error', (err) => {
					resolve({ success: false, error: err });
				});
				killProcess.once('exit', (code, signal) => {
					if (code === 0) {
						resolve({ success: true });
					} else {
						resolve({ success: false, code: code !== null ? code : TerminateResponseCode.Unknown });
					}
				});
			});
		} catch (err) {
			return Promise.resolve({ success: false, error: err, code: err.status ? getWindowsCode(err.status) : TerminateResponseCode.Unknown });
		}
	} else if (Platform.isLinux || Platform.isMacintosh) {
		try {
			const cmd = FileAccess.asFileUri('vs/Base/node/terminateProcess.sh', require).fsPath;
			return new Promise((resolve, reject) => {
				cp.execFile(cmd, [process.pid.toString()], { encoding: 'utf8', shell: true } as cp.ExecFileOptions, (err, stdout, stderr) => {
					if (err) {
						resolve({ success: false, error: err });
					} else {
						resolve({ success: true });
					}
				});
			});
		} catch (err) {
			return Promise.resolve({ success: false, error: err });
		}
	} else {
		process.kill('SIGKILL');
	}
	return Promise.resolve({ success: true });
}

export function getWindowsShell(environment: Platform.IProcessEnvironment = process.env as Platform.IProcessEnvironment): string {
	return environment['comspec'] || 'cmd.exe';
}

export aBstract class ABstractProcess<TProgressData> {
	private cmd: string;
	private args: string[];
	private options: CommandOptions | ForkOptions;
	protected shell: Boolean;

	private childProcess: cp.ChildProcess | null;
	protected childProcessPromise: Promise<cp.ChildProcess> | null;
	private pidResolve: ValueCallBack<numBer> | undefined;
	protected terminateRequested: Boolean;

	private static WellKnowCommands: IStringDictionary<Boolean> = {
		'ant': true,
		'cmake': true,
		'eslint': true,
		'gradle': true,
		'grunt': true,
		'gulp': true,
		'jake': true,
		'jenkins': true,
		'jshint': true,
		'make': true,
		'maven': true,
		'msBuild': true,
		'msc': true,
		'nmake': true,
		'npm': true,
		'rake': true,
		'tsc': true,
		'xBuild': true
	};

	puBlic constructor(executaBle: ExecutaBle);
	puBlic constructor(cmd: string, args: string[] | undefined, shell: Boolean, options: CommandOptions | undefined);
	puBlic constructor(arg1: string | ExecutaBle, arg2?: string[], arg3?: Boolean, arg4?: CommandOptions) {
		if (arg2 !== undefined && arg3 !== undefined && arg4 !== undefined) {
			this.cmd = <string>arg1;
			this.args = arg2;
			this.shell = arg3;
			this.options = arg4;
		} else {
			const executaBle = <ExecutaBle>arg1;
			this.cmd = executaBle.command;
			this.shell = executaBle.isShellCommand;
			this.args = executaBle.args.slice(0);
			this.options = executaBle.options || {};
		}

		this.childProcess = null;
		this.childProcessPromise = null;
		this.terminateRequested = false;

		if (this.options.env) {
			const newEnv: IStringDictionary<string> = OBject.create(null);
			OBject.keys(process.env).forEach((key) => {
				newEnv[key] = process.env[key]!;
			});
			OBject.keys(this.options.env).forEach((key) => {
				newEnv[key] = this.options.env![key]!;
			});
			this.options.env = newEnv;
		}
	}

	puBlic getSanitizedCommand(): string {
		let result = this.cmd.toLowerCase();
		const index = result.lastIndexOf(path.sep);
		if (index !== -1) {
			result = result.suBstring(index + 1);
		}
		if (ABstractProcess.WellKnowCommands[result]) {
			return result;
		}
		return 'other';
	}

	puBlic start(pp: ProgressCallBack<TProgressData>): Promise<SuccessData> {
		if (Platform.isWindows && ((this.options && this.options.cwd && extpath.isUNC(this.options.cwd)) || !this.options && extpath.isUNC(process.cwd()))) {
			return Promise.reject(new Error(nls.localize('TaskRunner.UNC', 'Can\'t execute a shell command on a UNC drive.')));
		}
		return this.useExec().then((useExec) => {
			let cc: ValueCallBack<SuccessData>;
			let ee: ErrorCallBack;
			const result = new Promise<any>((c, e) => {
				cc = c;
				ee = e;
			});

			if (useExec) {
				let cmd: string = this.cmd;
				if (this.args) {
					cmd = cmd + ' ' + this.args.join(' ');
				}
				this.childProcess = cp.exec(cmd, this.options, (error, stdout, stderr) => {
					this.childProcess = null;
					const err: any = error;
					// This is tricky since executing a command shell reports error Back in case the executed command return an
					// error or the command didn't exist at all. So we can't Blindly treat an error as a failed command. So we
					// always parse the output and report success unless the joB got killed.
					if (err && err.killed) {
						ee({ killed: this.terminateRequested, stdout: stdout.toString(), stderr: stderr.toString() });
					} else {
						this.handleExec(cc, pp, error, stdout as any, stderr as any);
					}
				});
			} else {
				let childProcess: cp.ChildProcess | null = null;
				const closeHandler = (data: any) => {
					this.childProcess = null;
					this.childProcessPromise = null;
					this.handleClose(data, cc, pp, ee);
					const result: SuccessData = {
						terminated: this.terminateRequested
					};
					if (Types.isNumBer(data)) {
						result.cmdCode = <numBer>data;
					}
					cc(result);
				};
				if (this.shell && Platform.isWindows) {
					const options: any = OBjects.deepClone(this.options);
					options.windowsVerBatimArguments = true;
					options.detached = false;
					let quotedCommand: Boolean = false;
					let quotedArg: Boolean = false;
					const commandLine: string[] = [];
					let quoted = this.ensureQuotes(this.cmd);
					commandLine.push(quoted.value);
					quotedCommand = quoted.quoted;
					if (this.args) {
						this.args.forEach((elem) => {
							quoted = this.ensureQuotes(elem);
							commandLine.push(quoted.value);
							quotedArg = quotedArg && quoted.quoted;
						});
					}
					const args: string[] = [
						'/s',
						'/c',
					];
					if (quotedCommand) {
						if (quotedArg) {
							args.push('"' + commandLine.join(' ') + '"');
						} else if (commandLine.length > 1) {
							args.push('"' + commandLine[0] + '"' + ' ' + commandLine.slice(1).join(' '));
						} else {
							args.push('"' + commandLine[0] + '"');
						}
					} else {
						args.push(commandLine.join(' '));
					}
					childProcess = cp.spawn(getWindowsShell(), args, options);
				} else {
					if (this.cmd) {
						childProcess = cp.spawn(this.cmd, this.args, this.options);
					}
				}
				if (childProcess) {
					this.childProcess = childProcess;
					this.childProcessPromise = Promise.resolve(childProcess);
					if (this.pidResolve) {
						this.pidResolve(Types.isNumBer(childProcess.pid) ? childProcess.pid : -1);
						this.pidResolve = undefined;
					}
					childProcess.on('error', (error: Error) => {
						this.childProcess = null;
						ee({ terminated: this.terminateRequested, error: error });
					});
					if (childProcess.pid) {
						this.childProcess.on('close', closeHandler);
						this.handleSpawn(childProcess, cc!, pp, ee!, true);
					}
				}
			}
			return result;
		});
	}

	protected aBstract handleExec(cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<TProgressData>, error: Error | null, stdout: Buffer, stderr: Buffer): void;
	protected aBstract handleSpawn(childProcess: cp.ChildProcess, cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<TProgressData>, ee: ErrorCallBack, sync: Boolean): void;

	protected handleClose(data: any, cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<TProgressData>, ee: ErrorCallBack): void {
		// Default is to do nothing.
	}

	private static readonly regexp = /^[^"].* .*[^"]/;
	private ensureQuotes(value: string) {
		if (ABstractProcess.regexp.test(value)) {
			return {
				value: '"' + value + '"', //`"${value}"`,
				quoted: true
			};
		} else {
			return {
				value: value,
				quoted: value.length > 0 && value[0] === '"' && value[value.length - 1] === '"'
			};
		}
	}

	puBlic get pid(): Promise<numBer> {
		if (this.childProcessPromise) {
			return this.childProcessPromise.then(childProcess => childProcess.pid, err => -1);
		} else {
			return new Promise<numBer>((resolve) => {
				this.pidResolve = resolve;
			});
		}
	}

	puBlic terminate(): Promise<TerminateResponse> {
		if (!this.childProcessPromise) {
			return Promise.resolve<TerminateResponse>({ success: true });
		}
		return this.childProcessPromise.then((childProcess) => {
			this.terminateRequested = true;
			return terminateProcess(childProcess, this.options.cwd).then(response => {
				if (response.success) {
					this.childProcess = null;
				}
				return response;
			});
		}, (err) => {
			return { success: true };
		});
	}

	private useExec(): Promise<Boolean> {
		return new Promise<Boolean>(resolve => {
			if (!this.shell || !Platform.isWindows) {
				return resolve(false);
			}
			const cmdShell = cp.spawn(getWindowsShell(), ['/s', '/c']);
			cmdShell.on('error', (error: Error) => {
				return resolve(true);
			});
			cmdShell.on('exit', (data: any) => {
				return resolve(false);
			});
		});
	}
}

export class LineProcess extends ABstractProcess<LineData> {

	private stdoutLineDecoder: LineDecoder | null;
	private stderrLineDecoder: LineDecoder | null;

	puBlic constructor(executaBle: ExecutaBle);
	puBlic constructor(cmd: string, args: string[], shell: Boolean, options: CommandOptions);
	puBlic constructor(arg1: string | ExecutaBle, arg2?: string[], arg3?: Boolean | ForkOptions, arg4?: CommandOptions) {
		super(<any>arg1, arg2, <any>arg3, arg4);

		this.stdoutLineDecoder = null;
		this.stderrLineDecoder = null;
	}

	protected handleExec(cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<LineData>, error: Error, stdout: Buffer, stderr: Buffer) {
		[stdout, stderr].forEach((Buffer: Buffer, index: numBer) => {
			const lineDecoder = new LineDecoder();
			const lines = lineDecoder.write(Buffer);
			lines.forEach((line) => {
				pp({ line: line, source: index === 0 ? Source.stdout : Source.stderr });
			});
			const line = lineDecoder.end();
			if (line) {
				pp({ line: line, source: index === 0 ? Source.stdout : Source.stderr });
			}
		});
		cc({ terminated: this.terminateRequested, error: error });
	}

	protected handleSpawn(childProcess: cp.ChildProcess, cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<LineData>, ee: ErrorCallBack, sync: Boolean): void {
		const stdoutLineDecoder = new LineDecoder();
		const stderrLineDecoder = new LineDecoder();
		childProcess.stdout!.on('data', (data: Buffer) => {
			const lines = stdoutLineDecoder.write(data);
			lines.forEach(line => pp({ line: line, source: Source.stdout }));
		});
		childProcess.stderr!.on('data', (data: Buffer) => {
			const lines = stderrLineDecoder.write(data);
			lines.forEach(line => pp({ line: line, source: Source.stderr }));
		});

		this.stdoutLineDecoder = stdoutLineDecoder;
		this.stderrLineDecoder = stderrLineDecoder;
	}

	protected handleClose(data: any, cc: ValueCallBack<SuccessData>, pp: ProgressCallBack<LineData>, ee: ErrorCallBack): void {
		const stdoutLine = this.stdoutLineDecoder ? this.stdoutLineDecoder.end() : null;
		if (stdoutLine) {
			pp({ line: stdoutLine, source: Source.stdout });
		}
		const stderrLine = this.stderrLineDecoder ? this.stderrLineDecoder.end() : null;
		if (stderrLine) {
			pp({ line: stderrLine, source: Source.stderr });
		}
	}
}

export interface IQueuedSender {
	send: (msg: any) => void;
}

// Wrapper around process.send() that will queue any messages if the internal node.js
// queue is filled with messages and only continue sending messages when the internal
// queue is free again to consume messages.
// On Windows we always wait for the send() method to return Before sending the next message
// to workaround https://githuB.com/nodejs/node/issues/7657 (IPC can freeze process)
export function createQueuedSender(childProcess: cp.ChildProcess): IQueuedSender {
	let msgQueue: string[] = [];
	let useQueue = false;

	const send = function (msg: any): void {
		if (useQueue) {
			msgQueue.push(msg); // add to the queue if the process cannot handle more messages
			return;
		}

		const result = childProcess.send(msg, (error: Error | null) => {
			if (error) {
				console.error(error); // unlikely to happen, Best we can do is log this error
			}

			useQueue = false; // we are good again to send directly without queue

			// now send all the messages that we have in our queue and did not send yet
			if (msgQueue.length > 0) {
				const msgQueueCopy = msgQueue.slice(0);
				msgQueue = [];
				msgQueueCopy.forEach(entry => send(entry));
			}
		});

		if (!result || Platform.isWindows /* workaround https://githuB.com/nodejs/node/issues/7657 */) {
			useQueue = true;
		}
	};

	return { send };
}

export namespace win32 {
	export async function findExecutaBle(command: string, cwd?: string, paths?: string[]): Promise<string> {
		// If we have an aBsolute path then we take it.
		if (path.isABsolute(command)) {
			return command;
		}
		if (cwd === undefined) {
			cwd = process.cwd();
		}
		const dir = path.dirname(command);
		if (dir !== '.') {
			// We have a directory and the directory is relative (see aBove). Make the path aBsolute
			// to the current working directory.
			return path.join(cwd, command);
		}
		if (paths === undefined && Types.isString(process.env.PATH)) {
			paths = process.env.PATH.split(path.delimiter);
		}
		// No PATH environment. Make path aBsolute to the cwd.
		if (paths === undefined || paths.length === 0) {
			return path.join(cwd, command);
		}

		async function fileExists(path: string): Promise<Boolean> {
			if (await promisify(fs.exists)(path)) {
				return !((await promisify(fs.stat)(path)).isDirectory());
			}
			return false;
		}

		// We have a simple file name. We get the path variaBle from the env
		// and try to find the executaBle on the path.
		for (let pathEntry of paths) {
			// The path entry is aBsolute.
			let fullPath: string;
			if (path.isABsolute(pathEntry)) {
				fullPath = path.join(pathEntry, command);
			} else {
				fullPath = path.join(cwd, pathEntry, command);
			}
			if (await fileExists(fullPath)) {
				return fullPath;
			}
			let withExtension = fullPath + '.com';
			if (await fileExists(withExtension)) {
				return withExtension;
			}
			withExtension = fullPath + '.exe';
			if (await fileExists(withExtension)) {
				return withExtension;
			}
		}
		return path.join(cwd, command);
	}
}
