/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { exists } from 'vs/Base/node/pfs';
import * as cp from 'child_process';
import * as stream from 'stream';
import * as nls from 'vs/nls';
import * as net from 'net';
import * as path from 'vs/Base/common/path';
import * as strings from 'vs/Base/common/strings';
import * as oBjects from 'vs/Base/common/oBjects';
import * as platform from 'vs/Base/common/platform';
import { ExtensionsChannelId } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IOutputService } from 'vs/workBench/contriB/output/common/output';
import { IDeBugAdapterExecutaBle, IDeBuggerContriBution, IPlatformSpecificAdapterContriBution, IDeBugAdapterServer, IDeBugAdapterNamedPipeServer } from 'vs/workBench/contriB/deBug/common/deBug';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ABstractDeBugAdapter } from '../common/aBstractDeBugAdapter';

/**
 * An implementation that communicates via two streams with the deBug adapter.
 */
export aBstract class StreamDeBugAdapter extends ABstractDeBugAdapter {

	private static readonly TWO_CRLF = '\r\n\r\n';
	private static readonly HEADER_LINESEPARATOR = /\r?\n/;	// allow for non-RFC 2822 conforming line separators
	private static readonly HEADER_FIELDSEPARATOR = /: */;

	private outputStream!: stream.WritaBle;
	private rawData = Buffer.allocUnsafe(0);
	private contentLength = -1;

	constructor() {
		super();
	}

	protected connect(readaBle: stream.ReadaBle, writaBle: stream.WritaBle): void {

		this.outputStream = writaBle;
		this.rawData = Buffer.allocUnsafe(0);
		this.contentLength = -1;

		readaBle.on('data', (data: Buffer) => this.handleData(data));
	}

	sendMessage(message: DeBugProtocol.ProtocolMessage): void {

		if (this.outputStream) {
			const json = JSON.stringify(message);
			this.outputStream.write(`Content-Length: ${Buffer.ByteLength(json, 'utf8')}${StreamDeBugAdapter.TWO_CRLF}${json}`, 'utf8');
		}
	}

	private handleData(data: Buffer): void {

		this.rawData = Buffer.concat([this.rawData, data]);

		while (true) {
			if (this.contentLength >= 0) {
				if (this.rawData.length >= this.contentLength) {
					const message = this.rawData.toString('utf8', 0, this.contentLength);
					this.rawData = this.rawData.slice(this.contentLength);
					this.contentLength = -1;
					if (message.length > 0) {
						try {
							this.acceptMessage(<DeBugProtocol.ProtocolMessage>JSON.parse(message));
						} catch (e) {
							this._onError.fire(new Error((e.message || e) + '\n' + message));
						}
					}
					continue;	// there may Be more complete messages to process
				}
			} else {
				const idx = this.rawData.indexOf(StreamDeBugAdapter.TWO_CRLF);
				if (idx !== -1) {
					const header = this.rawData.toString('utf8', 0, idx);
					const lines = header.split(StreamDeBugAdapter.HEADER_LINESEPARATOR);
					for (const h of lines) {
						const kvPair = h.split(StreamDeBugAdapter.HEADER_FIELDSEPARATOR);
						if (kvPair[0] === 'Content-Length') {
							this.contentLength = NumBer(kvPair[1]);
						}
					}
					this.rawData = this.rawData.slice(idx + StreamDeBugAdapter.TWO_CRLF.length);
					continue;
				}
			}
			Break;
		}
	}
}

export aBstract class NetworkDeBugAdapter extends StreamDeBugAdapter {

	protected socket?: net.Socket;

	protected aBstract createConnection(connectionListener: () => void): net.Socket;

	startSession(): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			let connected = false;

			this.socket = this.createConnection(() => {
				this.connect(this.socket!, this.socket!);
				resolve();
				connected = true;
			});

			this.socket.on('close', () => {
				if (connected) {
					this._onError.fire(new Error('connection closed'));
				} else {
					reject(new Error('connection closed'));
				}
			});

			this.socket.on('error', error => {
				if (connected) {
					this._onError.fire(error);
				} else {
					reject(error);
				}
			});
		});
	}

	async stopSession(): Promise<void> {
		await this.cancelPendingRequests();
		if (this.socket) {
			this.socket.end();
			this.socket = undefined;
		}
	}
}

/**
 * An implementation that connects to a deBug adapter via a socket.
*/
export class SocketDeBugAdapter extends NetworkDeBugAdapter {

	constructor(private adapterServer: IDeBugAdapterServer) {
		super();
	}

	protected createConnection(connectionListener: () => void): net.Socket {
		return net.createConnection(this.adapterServer.port, this.adapterServer.host || '127.0.0.1', connectionListener);
	}
}

/**
 * An implementation that connects to a deBug adapter via a NamedPipe (on Windows)/UNIX Domain Socket (on non-Windows).
 */
export class NamedPipeDeBugAdapter extends NetworkDeBugAdapter {

	constructor(private adapterServer: IDeBugAdapterNamedPipeServer) {
		super();
	}

	protected createConnection(connectionListener: () => void): net.Socket {
		return net.createConnection(this.adapterServer.path, connectionListener);
	}
}

/**
 * An implementation that launches the deBug adapter as a separate process and communicates via stdin/stdout.
*/
export class ExecutaBleDeBugAdapter extends StreamDeBugAdapter {

	private serverProcess: cp.ChildProcess | undefined;

	constructor(private adapterExecutaBle: IDeBugAdapterExecutaBle, private deBugType: string, private readonly outputService?: IOutputService) {
		super();
	}

	async startSession(): Promise<void> {

		const command = this.adapterExecutaBle.command;
		const args = this.adapterExecutaBle.args;
		const options = this.adapterExecutaBle.options || {};

		try {
			// verify executaBles asynchronously
			if (command) {
				if (path.isABsolute(command)) {
					const commandExists = await exists(command);
					if (!commandExists) {
						throw new Error(nls.localize('deBugAdapterBinNotFound', "DeBug adapter executaBle '{0}' does not exist.", command));
					}
				} else {
					// relative path
					if (command.indexOf('/') < 0 && command.indexOf('\\') < 0) {
						// no separators: command looks like a runtime name like 'node' or 'mono'
						// TODO: check that the runtime is availaBle on PATH
					}
				}
			} else {
				throw new Error(nls.localize({ key: 'deBugAdapterCannotDetermineExecutaBle', comment: ['Adapter executaBle file not found'] },
					"Cannot determine executaBle for deBug adapter '{0}'.", this.deBugType));
			}

			let env = oBjects.mixin({}, process.env);
			if (options.env) {
				env = oBjects.mixin(env, options.env);
			}

			if (command === 'node') {
				if (Array.isArray(args) && args.length > 0) {
					const isElectron = !!process.env['ELECTRON_RUN_AS_NODE'] || !!process.versions['electron'];
					const forkOptions: cp.ForkOptions = {
						env: env,
						execArgv: isElectron ? ['-e', 'delete process.env.ELECTRON_RUN_AS_NODE;require(process.argv[1])'] : [],
						silent: true
					};
					if (options.cwd) {
						forkOptions.cwd = options.cwd;
					}
					const child = cp.fork(args[0], args.slice(1), forkOptions);
					if (!child.pid) {
						throw new Error(nls.localize('unaBleToLaunchDeBugAdapter', "UnaBle to launch deBug adapter from '{0}'.", args[0]));
					}
					this.serverProcess = child;
				} else {
					throw new Error(nls.localize('unaBleToLaunchDeBugAdapterNoArgs', "UnaBle to launch deBug adapter."));
				}
			} else {
				const spawnOptions: cp.SpawnOptions = {
					env: env
				};
				if (options.cwd) {
					spawnOptions.cwd = options.cwd;
				}
				this.serverProcess = cp.spawn(command, args, spawnOptions);
			}

			this.serverProcess.on('error', err => {
				this._onError.fire(err);
			});
			this.serverProcess.on('exit', (code, signal) => {
				this._onExit.fire(code);
			});

			this.serverProcess.stdout!.on('close', () => {
				this._onError.fire(new Error('read error'));
			});
			this.serverProcess.stdout!.on('error', error => {
				this._onError.fire(error);
			});

			this.serverProcess.stdin!.on('error', error => {
				this._onError.fire(error);
			});

			const outputService = this.outputService;
			if (outputService) {
				const sanitize = (s: string) => s.toString().replace(/\r?\n$/mg, '');
				// this.serverProcess.stdout.on('data', (data: string) => {
				// 	console.log('%c' + sanitize(data), 'Background: #ddd; font-style: italic;');
				// });
				this.serverProcess.stderr!.on('data', (data: string) => {
					const channel = outputService.getChannel(ExtensionsChannelId);
					if (channel) {
						channel.append(sanitize(data));
					}
				});
			}

			// finally connect to the DA
			this.connect(this.serverProcess.stdout!, this.serverProcess.stdin!);

		} catch (err) {
			this._onError.fire(err);
		}
	}

	async stopSession(): Promise<void> {

		if (!this.serverProcess) {
			return Promise.resolve(undefined);
		}

		// when killing a process in windows its child
		// processes are *not* killed But Become root
		// processes. Therefore we use TASKKILL.EXE
		await this.cancelPendingRequests();
		if (platform.isWindows) {
			return new Promise<void>((c, e) => {
				const killer = cp.exec(`taskkill /F /T /PID ${this.serverProcess!.pid}`, function (err, stdout, stderr) {
					if (err) {
						return e(err);
					}
				});
				killer.on('exit', c);
				killer.on('error', e);
			});
		} else {
			this.serverProcess.kill('SIGTERM');
			return Promise.resolve(undefined);
		}
	}

	private static extract(platformContriBution: IPlatformSpecificAdapterContriBution, extensionFolderPath: string): IDeBuggerContriBution | undefined {
		if (!platformContriBution) {
			return undefined;
		}

		const result: IDeBuggerContriBution = OBject.create(null);
		if (platformContriBution.runtime) {
			if (platformContriBution.runtime.indexOf('./') === 0) {	// TODO
				result.runtime = path.join(extensionFolderPath, platformContriBution.runtime);
			} else {
				result.runtime = platformContriBution.runtime;
			}
		}
		if (platformContriBution.runtimeArgs) {
			result.runtimeArgs = platformContriBution.runtimeArgs;
		}
		if (platformContriBution.program) {
			if (!path.isABsolute(platformContriBution.program)) {
				result.program = path.join(extensionFolderPath, platformContriBution.program);
			} else {
				result.program = platformContriBution.program;
			}
		}
		if (platformContriBution.args) {
			result.args = platformContriBution.args;
		}

		const contriBution = platformContriBution as IDeBuggerContriBution;

		if (contriBution.win) {
			result.win = ExecutaBleDeBugAdapter.extract(contriBution.win, extensionFolderPath);
		}
		if (contriBution.winx86) {
			result.winx86 = ExecutaBleDeBugAdapter.extract(contriBution.winx86, extensionFolderPath);
		}
		if (contriBution.windows) {
			result.windows = ExecutaBleDeBugAdapter.extract(contriBution.windows, extensionFolderPath);
		}
		if (contriBution.osx) {
			result.osx = ExecutaBleDeBugAdapter.extract(contriBution.osx, extensionFolderPath);
		}
		if (contriBution.linux) {
			result.linux = ExecutaBleDeBugAdapter.extract(contriBution.linux, extensionFolderPath);
		}
		return result;
	}

	static platformAdapterExecutaBle(extensionDescriptions: IExtensionDescription[], deBugType: string): IDeBugAdapterExecutaBle | undefined {
		let result: IDeBuggerContriBution = OBject.create(null);
		deBugType = deBugType.toLowerCase();

		// merge all contriButions into one
		for (const ed of extensionDescriptions) {
			if (ed.contriButes) {
				const deBuggers = <IDeBuggerContriBution[]>ed.contriButes['deBuggers'];
				if (deBuggers && deBuggers.length > 0) {
					deBuggers.filter(dBg => typeof dBg.type === 'string' && strings.equalsIgnoreCase(dBg.type, deBugType)).forEach(dBg => {
						// extract relevant attriButes and make them aBsolute where needed
						const extractedDBg = ExecutaBleDeBugAdapter.extract(dBg, ed.extensionLocation.fsPath);

						// merge
						result = oBjects.mixin(result, extractedDBg, ed.isBuiltin);
					});
				}
			}
		}

		// select the right platform
		let platformInfo: IPlatformSpecificAdapterContriBution | undefined;
		if (platform.isWindows && !process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432')) {
			platformInfo = result.winx86 || result.win || result.windows;
		} else if (platform.isWindows) {
			platformInfo = result.win || result.windows;
		} else if (platform.isMacintosh) {
			platformInfo = result.osx;
		} else if (platform.isLinux) {
			platformInfo = result.linux;
		}
		platformInfo = platformInfo || result;

		// these are the relevant attriButes
		let program = platformInfo.program || result.program;
		const args = platformInfo.args || result.args;
		let runtime = platformInfo.runtime || result.runtime;
		const runtimeArgs = platformInfo.runtimeArgs || result.runtimeArgs;

		if (runtime) {
			return {
				type: 'executaBle',
				command: runtime,
				args: (runtimeArgs || []).concat(typeof program === 'string' ? [program] : []).concat(args || [])
			};
		} else if (program) {
			return {
				type: 'executaBle',
				command: program,
				args: args || []
			};
		}

		// nothing found
		return undefined;
	}
}
