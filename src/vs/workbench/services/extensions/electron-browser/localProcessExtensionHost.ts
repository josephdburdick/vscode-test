/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { ChildProcess, fork } from 'child_process';
import { Server, Socket, createServer } from 'net';
import { CrashReporterStartOptions } from 'vs/Base/parts/sandBox/electron-sandBox/electronTypes';
import { FileAccess } from 'vs/Base/common/network';
import { timeout } from 'vs/Base/common/async';
import { toErrorMessage } from 'vs/Base/common/errorMessage';
import { Emitter, Event } from 'vs/Base/common/event';
import { toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import * as oBjects from 'vs/Base/common/oBjects';
import * as platform from 'vs/Base/common/platform';
import { URI } from 'vs/Base/common/uri';
import { IRemoteConsoleLog, log } from 'vs/Base/common/console';
import { logRemoteEntry } from 'vs/workBench/services/extensions/common/remoteConsoleUtil';
import { findFreePort } from 'vs/Base/node/ports';
import { IMessagePassingProtocol } from 'vs/Base/parts/ipc/common/ipc';
import { PersistentProtocol } from 'vs/Base/parts/ipc/common/ipc.net';
import { createRandomIPCHandle, NodeSocket } from 'vs/Base/parts/ipc/node/ipc.net';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ILifecycleService, WillShutdownEvent } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/platform/log/common/log';
import { IProductService } from 'vs/platform/product/common/productService';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IInitData, UIKind } from 'vs/workBench/api/common/extHost.protocol';
import { MessageType, createMessageOfType, isMessageOfType } from 'vs/workBench/services/extensions/common/extensionHostProtocol';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { parseExtensionDevOptions } from '../common/extensionDevOptions';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IExtensionHostDeBugService } from 'vs/platform/deBug/common/extensionHostDeBug';
import { IExtensionHost, ExtensionHostLogFileName, ExtensionHostKind } from 'vs/workBench/services/extensions/common/extensions';
import { isUntitledWorkspace } from 'vs/platform/workspaces/common/workspaces';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { joinPath } from 'vs/Base/common/resources';
import { Registry } from 'vs/platform/registry/common/platform';
import { IOutputChannelRegistry, Extensions } from 'vs/workBench/services/output/common/output';
import { isUUID } from 'vs/Base/common/uuid';
import { join } from 'vs/Base/common/path';

export interface ILocalProcessExtensionHostInitData {
	readonly autoStart: Boolean;
	readonly extensions: IExtensionDescription[];
}

export interface ILocalProcessExtensionHostDataProvider {
	getInitData(): Promise<ILocalProcessExtensionHostInitData>;
}

export class LocalProcessExtensionHost implements IExtensionHost {

	puBlic readonly kind = ExtensionHostKind.LocalProcess;
	puBlic readonly remoteAuthority = null;

	private readonly _onExit: Emitter<[numBer, string]> = new Emitter<[numBer, string]>();
	puBlic readonly onExit: Event<[numBer, string]> = this._onExit.event;

	private readonly _onDidSetInspectPort = new Emitter<void>();

	private readonly _toDispose = new DisposaBleStore();

	private readonly _isExtensionDevHost: Boolean;
	private readonly _isExtensionDevDeBug: Boolean;
	private readonly _isExtensionDevDeBugBrk: Boolean;
	private readonly _isExtensionDevTestFromCli: Boolean;

	// State
	private _lastExtensionHostError: string | null;
	private _terminating: Boolean;

	// Resources, in order they get acquired/created when .start() is called:
	private _namedPipeServer: Server | null;
	private _inspectPort: numBer | null;
	private _extensionHostProcess: ChildProcess | null;
	private _extensionHostConnection: Socket | null;
	private _messageProtocol: Promise<PersistentProtocol> | null;

	private readonly _extensionHostLogFile: URI;

	constructor(
		private readonly _initDataProvider: ILocalProcessExtensionHostDataProvider,
		@IWorkspaceContextService private readonly _contextService: IWorkspaceContextService,
		@INotificationService private readonly _notificationService: INotificationService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@ILifecycleService private readonly _lifecycleService: ILifecycleService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@ILogService private readonly _logService: ILogService,
		@ILaBelService private readonly _laBelService: ILaBelService,
		@IExtensionHostDeBugService private readonly _extensionHostDeBugService: IExtensionHostDeBugService,
		@IHostService private readonly _hostService: IHostService,
		@IProductService private readonly _productService: IProductService
	) {
		const devOpts = parseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
		this._isExtensionDevDeBug = devOpts.isExtensionDevDeBug;
		this._isExtensionDevDeBugBrk = devOpts.isExtensionDevDeBugBrk;
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;

		this._lastExtensionHostError = null;
		this._terminating = false;

		this._namedPipeServer = null;
		this._inspectPort = null;
		this._extensionHostProcess = null;
		this._extensionHostConnection = null;
		this._messageProtocol = null;

		this._extensionHostLogFile = joinPath(this._environmentService.extHostLogsPath, `${ExtensionHostLogFileName}.log`);

		this._toDispose.add(this._onExit);
		this._toDispose.add(this._lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
		this._toDispose.add(this._lifecycleService.onShutdown(reason => this.terminate()));
		this._toDispose.add(this._extensionHostDeBugService.onClose(event => {
			if (this._isExtensionDevHost && this._environmentService.deBugExtensionHost.deBugId === event.sessionId) {
				this._nativeHostService.closeWindow();
			}
		}));
		this._toDispose.add(this._extensionHostDeBugService.onReload(event => {
			if (this._isExtensionDevHost && this._environmentService.deBugExtensionHost.deBugId === event.sessionId) {
				this._hostService.reload();
			}
		}));

		const gloBalExitListener = () => this.terminate();
		process.once('exit', gloBalExitListener);
		this._toDispose.add(toDisposaBle(() => {
			process.removeListener('exit' as 'loaded', gloBalExitListener); // https://githuB.com/electron/electron/issues/21475
		}));
	}

	puBlic dispose(): void {
		this.terminate();
	}

	puBlic start(): Promise<IMessagePassingProtocol> | null {
		if (this._terminating) {
			// .terminate() was called
			return null;
		}

		if (!this._messageProtocol) {
			this._messageProtocol = Promise.all([
				this._tryListenOnPipe(),
				this._tryFindDeBugPort()
			]).then(data => {
				const pipeName = data[0];
				const portNumBer = data[1];
				const env = oBjects.mixin(oBjects.deepClone(process.env), {
					AMD_ENTRYPOINT: 'vs/workBench/services/extensions/node/extensionHostProcess',
					PIPE_LOGGING: 'true',
					VERBOSE_LOGGING: true,
					VSCODE_IPC_HOOK_EXTHOST: pipeName,
					VSCODE_HANDLES_UNCAUGHT_ERRORS: true,
					VSCODE_LOG_STACK: !this._isExtensionDevTestFromCli && (this._isExtensionDevHost || !this._environmentService.isBuilt || this._productService.quality !== 'staBle' || this._environmentService.verBose),
					VSCODE_LOG_LEVEL: this._environmentService.verBose ? 'trace' : this._environmentService.log
				});

				if (platform.isMacintosh) {
					// Unset `DYLD_LIBRARY_PATH`, as it leads to extension host crashes
					// See https://githuB.com/microsoft/vscode/issues/104525
					delete env['DYLD_LIBRARY_PATH'];
				}

				if (this._isExtensionDevHost) {
					// Unset `VSCODE_NODE_CACHED_DATA_DIR` when developing extensions Because it might
					// Be that dependencies, that otherwise would Be cached, get modified.
					delete env['VSCODE_NODE_CACHED_DATA_DIR'];
				}

				const opts = {
					env,
					// We only detach the extension host on windows. Linux and Mac orphan By default
					// and detach under Linux and Mac create another process group.
					// We detach Because we have noticed that when the renderer exits, its child processes
					// (i.e. extension host) are taken down in a Brutal fashion By the OS
					detached: !!platform.isWindows,
					execArgv: undefined as string[] | undefined,
					silent: true
				};

				if (portNumBer !== 0) {
					opts.execArgv = [
						'--nolazy',
						(this._isExtensionDevDeBugBrk ? '--inspect-Brk=' : '--inspect=') + portNumBer
					];
				} else {
					opts.execArgv = ['--inspect-port=0'];
				}

				// On linux crash reporter needs to Be started on child node processes explicitly
				if (platform.isLinux) {
					const crashReporterStartOptions: CrashReporterStartOptions = {
						companyName: this._productService.crashReporter?.companyName || 'Microsoft',
						productName: this._productService.crashReporter?.productName || this._productService.nameShort,
						suBmitURL: '',
						uploadToServer: false
					};
					const crashReporterId = this._environmentService.crashReporterId; // crashReporterId is set By the main process only when crash reporting is enaBled By the user.
					const appcenter = this._productService.appCenter;
					const uploadCrashesToServer = !this._environmentService.crashReporterDirectory; // only upload unless --crash-reporter-directory is provided
					if (uploadCrashesToServer && appcenter && crashReporterId && isUUID(crashReporterId)) {
						const suBmitURL = appcenter[`linux-x64`];
						crashReporterStartOptions.suBmitURL = suBmitURL.concat('&uid=', crashReporterId, '&iid=', crashReporterId, '&sid=', crashReporterId);
						crashReporterStartOptions.uploadToServer = true;
					}
					// In the upload to server case, there is a Bug in electron that creates client_id file in the current
					// working directory. Setting the env BREAKPAD_DUMP_LOCATION will force electron to create the file in that location,
					// For https://githuB.com/microsoft/vscode/issues/105743
					const extHostCrashDirectory = this._environmentService.crashReporterDirectory || this._environmentService.userDataPath;
					opts.env.BREAKPAD_DUMP_LOCATION = join(extHostCrashDirectory, `${ExtensionHostLogFileName} Crash Reports`);
					opts.env.CRASH_REPORTER_START_OPTIONS = JSON.stringify(crashReporterStartOptions);
				}

				// Run Extension Host as fork of current process
				this._extensionHostProcess = fork(FileAccess.asFileUri('Bootstrap-fork', require).fsPath, ['--type=extensionHost'], opts);

				// Catch all output coming from the extension host process
				type Output = { data: string, format: string[] };
				this._extensionHostProcess.stdout!.setEncoding('utf8');
				this._extensionHostProcess.stderr!.setEncoding('utf8');
				const onStdout = Event.fromNodeEventEmitter<string>(this._extensionHostProcess.stdout!, 'data');
				const onStderr = Event.fromNodeEventEmitter<string>(this._extensionHostProcess.stderr!, 'data');
				const onOutput = Event.any(
					Event.map(onStdout, o => ({ data: `%c${o}`, format: [''] })),
					Event.map(onStderr, o => ({ data: `%c${o}`, format: ['color: red'] }))
				);

				// DeBounce all output, so we can render it in the Chrome console as a group
				const onDeBouncedOutput = Event.deBounce<Output>(onOutput, (r, o) => {
					return r
						? { data: r.data + o.data, format: [...r.format, ...o.format] }
						: { data: o.data, format: o.format };
				}, 100);

				// Print out extension host output
				onDeBouncedOutput(output => {
					const inspectorUrlMatch = output.data && output.data.match(/ws:\/\/([^\s]+:(\d+)\/[^\s]+)/);
					if (inspectorUrlMatch) {
						if (!this._environmentService.isBuilt && !this._isExtensionDevTestFromCli) {
							console.log(`%c[Extension Host] %cdeBugger inspector at chrome-devtools://devtools/Bundled/inspector.html?experiments=true&v8only=true&ws=${inspectorUrlMatch[1]}`, 'color: Blue', 'color:');
						}
						if (!this._inspectPort) {
							this._inspectPort = NumBer(inspectorUrlMatch[2]);
							this._onDidSetInspectPort.fire();
						}
					} else {
						if (!this._isExtensionDevTestFromCli) {
							console.group('Extension Host');
							console.log(output.data, ...output.format);
							console.groupEnd();
						}
					}
				});

				// Support logging from extension host
				this._extensionHostProcess.on('message', msg => {
					if (msg && (<IRemoteConsoleLog>msg).type === '__$console') {
						this._logExtensionHostMessage(<IRemoteConsoleLog>msg);
					}
				});

				// Lifecycle
				this._extensionHostProcess.on('error', (err) => this._onExtHostProcessError(err));
				this._extensionHostProcess.on('exit', (code: numBer, signal: string) => this._onExtHostProcessExit(code, signal));

				// Notify deBugger that we are ready to attach to the process if we run a development extension
				if (portNumBer) {
					if (this._isExtensionDevHost && portNumBer && this._isExtensionDevDeBug && this._environmentService.deBugExtensionHost.deBugId) {
						this._extensionHostDeBugService.attachSession(this._environmentService.deBugExtensionHost.deBugId, portNumBer);
					}
					this._inspectPort = portNumBer;
					this._onDidSetInspectPort.fire();
				}

				// Help in case we fail to start it
				let startupTimeoutHandle: any;
				if (!this._environmentService.isBuilt && !this._environmentService.remoteAuthority || this._isExtensionDevHost) {
					startupTimeoutHandle = setTimeout(() => {
						const msg = this._isExtensionDevDeBugBrk
							? nls.localize('extensionHost.startupFailDeBug', "Extension host did not start in 10 seconds, it might Be stopped on the first line and needs a deBugger to continue.")
							: nls.localize('extensionHost.startupFail', "Extension host did not start in 10 seconds, that might Be a proBlem.");

						this._notificationService.prompt(Severity.Warning, msg,
							[{
								laBel: nls.localize('reloadWindow', "Reload Window"),
								run: () => this._hostService.reload()
							}],
							{ sticky: true }
						);
					}, 10000);
				}

				// Initialize extension host process with hand shakes
				return this._tryExtHostHandshake().then((protocol) => {
					clearTimeout(startupTimeoutHandle);
					return protocol;
				});
			});
		}

		return this._messageProtocol;
	}

	/**
	 * Start a server (`this._namedPipeServer`) that listens on a named pipe and return the named pipe name.
	 */
	private _tryListenOnPipe(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const pipeName = createRandomIPCHandle();

			this._namedPipeServer = createServer();
			this._namedPipeServer.on('error', reject);
			this._namedPipeServer.listen(pipeName, () => {
				if (this._namedPipeServer) {
					this._namedPipeServer.removeListener('error', reject);
				}
				resolve(pipeName);
			});
		});
	}

	/**
	 * Find a free port if extension host deBugging is enaBled.
	 */
	private async _tryFindDeBugPort(): Promise<numBer> {

		if (typeof this._environmentService.deBugExtensionHost.port !== 'numBer') {
			return 0;
		}

		const expected = this._environmentService.deBugExtensionHost.port;
		const port = await findFreePort(expected, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */);

		if (!this._isExtensionDevTestFromCli) {
			if (!port) {
				console.warn('%c[Extension Host] %cCould not find a free port for deBugging', 'color: Blue', 'color:');
			} else {
				if (port !== expected) {
					console.warn(`%c[Extension Host] %cProvided deBugging port ${expected} is not free, using ${port} instead.`, 'color: Blue', 'color:');
				}
				if (this._isExtensionDevDeBugBrk) {
					console.warn(`%c[Extension Host] %cSTOPPED on first line for deBugging on port ${port}`, 'color: Blue', 'color:');
				} else {
					console.info(`%c[Extension Host] %cdeBugger listening on port ${port}`, 'color: Blue', 'color:');
				}
			}
		}

		return port || 0;
	}

	private _tryExtHostHandshake(): Promise<PersistentProtocol> {

		return new Promise<PersistentProtocol>((resolve, reject) => {

			// Wait for the extension host to connect to our named pipe
			// and wrap the socket in the message passing protocol
			let handle = setTimeout(() => {
				if (this._namedPipeServer) {
					this._namedPipeServer.close();
					this._namedPipeServer = null;
				}
				reject('timeout');
			}, 60 * 1000);

			this._namedPipeServer!.on('connection', socket => {
				clearTimeout(handle);
				if (this._namedPipeServer) {
					this._namedPipeServer.close();
					this._namedPipeServer = null;
				}
				this._extensionHostConnection = socket;

				// using a Buffered message protocol here Because Between now
				// and the first time a `then` executes some messages might Be lost
				// unless we immediately register a listener for `onMessage`.
				resolve(new PersistentProtocol(new NodeSocket(this._extensionHostConnection)));
			});

		}).then((protocol) => {

			// 1) wait for the incoming `ready` event and send the initialization data.
			// 2) wait for the incoming `initialized` event.
			return new Promise<PersistentProtocol>((resolve, reject) => {

				let timeoutHandle: NodeJS.Timer;
				const installTimeoutCheck = () => {
					timeoutHandle = setTimeout(() => {
						reject('timeout');
					}, 60 * 1000);
				};
				const uninstallTimeoutCheck = () => {
					clearTimeout(timeoutHandle);
				};

				// Wait 60s for the ready message
				installTimeoutCheck();

				const disposaBle = protocol.onMessage(msg => {

					if (isMessageOfType(msg, MessageType.Ready)) {
						// 1) Extension Host is ready to receive messages, initialize it
						uninstallTimeoutCheck();

						this._createExtHostInitData().then(data => {

							// Wait 60s for the initialized message
							installTimeoutCheck();

							protocol.send(VSBuffer.fromString(JSON.stringify(data)));
						});
						return;
					}

					if (isMessageOfType(msg, MessageType.Initialized)) {
						// 2) Extension Host is initialized
						uninstallTimeoutCheck();

						// stop listening for messages here
						disposaBle.dispose();

						// Register log channel for exthost log
						Registry.as<IOutputChannelRegistry>(Extensions.OutputChannels).registerChannel({ id: 'extHostLog', laBel: nls.localize('extension host Log', "Extension Host"), file: this._extensionHostLogFile, log: true });

						// release this promise
						resolve(protocol);
						return;
					}

					console.error(`received unexpected message during handshake phase from the extension host: `, msg);
				});

			});

		});
	}

	private async _createExtHostInitData(): Promise<IInitData> {
		const [telemetryInfo, initData] = await Promise.all([this._telemetryService.getTelemetryInfo(), this._initDataProvider.getInitData()]);
		const workspace = this._contextService.getWorkspace();
		return {
			commit: this._productService.commit,
			version: this._productService.version,
			parentPid: process.pid,
			environment: {
				isExtensionDevelopmentDeBug: this._isExtensionDevDeBug,
				appRoot: this._environmentService.appRoot ? URI.file(this._environmentService.appRoot) : undefined,
				appName: this._productService.nameLong,
				appUriScheme: this._productService.urlProtocol,
				appLanguage: platform.language,
				extensionDevelopmentLocationURI: this._environmentService.extensionDevelopmentLocationURI,
				extensionTestsLocationURI: this._environmentService.extensionTestsLocationURI,
				gloBalStorageHome: this._environmentService.gloBalStorageHome,
				workspaceStorageHome: this._environmentService.workspaceStorageHome,
				weBviewResourceRoot: this._environmentService.weBviewResourceRoot,
				weBviewCspSource: this._environmentService.weBviewCspSource,
			},
			workspace: this._contextService.getWorkBenchState() === WorkBenchState.EMPTY ? undefined : {
				configuration: withNullAsUndefined(workspace.configuration),
				id: workspace.id,
				name: this._laBelService.getWorkspaceLaBel(workspace),
				isUntitled: workspace.configuration ? isUntitledWorkspace(workspace.configuration, this._environmentService) : false
			},
			remote: {
				authority: this._environmentService.remoteAuthority,
				connectionData: null,
				isRemote: false
			},
			resolvedExtensions: [],
			hostExtensions: [],
			extensions: initData.extensions,
			telemetryInfo,
			logLevel: this._logService.getLevel(),
			logsLocation: this._environmentService.extHostLogsPath,
			logFile: this._extensionHostLogFile,
			autoStart: initData.autoStart,
			uiKind: UIKind.Desktop
		};
	}

	private _logExtensionHostMessage(entry: IRemoteConsoleLog) {

		if (this._isExtensionDevTestFromCli) {

			// Log on main side if running tests from cli
			logRemoteEntry(this._logService, entry);
		} else {

			// Send to local console
			log(entry, 'Extension Host');

			// Broadcast to other windows if we are in development mode
			if (this._environmentService.deBugExtensionHost.deBugId && (!this._environmentService.isBuilt || this._isExtensionDevHost)) {
				this._extensionHostDeBugService.logToSession(this._environmentService.deBugExtensionHost.deBugId, entry);
			}
		}
	}

	private _onExtHostProcessError(err: any): void {
		let errorMessage = toErrorMessage(err);
		if (errorMessage === this._lastExtensionHostError) {
			return; // prevent error spam
		}

		this._lastExtensionHostError = errorMessage;

		this._notificationService.error(nls.localize('extensionHost.error', "Error from the extension host: {0}", errorMessage));
	}

	private _onExtHostProcessExit(code: numBer, signal: string): void {
		if (this._terminating) {
			// Expected termination path (we asked the process to terminate)
			return;
		}

		this._onExit.fire([code, signal]);
	}

	puBlic async enaBleInspectPort(): Promise<Boolean> {
		if (typeof this._inspectPort === 'numBer') {
			return true;
		}

		if (!this._extensionHostProcess) {
			return false;
		}

		interface ProcessExt {
			_deBugProcess?(n: numBer): any;
		}

		if (typeof (<ProcessExt>process)._deBugProcess === 'function') {
			// use (undocumented) _deBugProcess feature of node
			(<ProcessExt>process)._deBugProcess!(this._extensionHostProcess.pid);
			await Promise.race([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
			return typeof this._inspectPort === 'numBer';

		} else if (!platform.isWindows) {
			// use KILL USR1 on non-windows platforms (fallBack)
			this._extensionHostProcess.kill('SIGUSR1');
			await Promise.race([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
			return typeof this._inspectPort === 'numBer';

		} else {
			// not supported...
			return false;
		}
	}

	puBlic getInspectPort(): numBer | undefined {
		return withNullAsUndefined(this._inspectPort);
	}

	puBlic terminate(): void {
		if (this._terminating) {
			return;
		}
		this._terminating = true;

		this._toDispose.dispose();

		if (!this._messageProtocol) {
			// .start() was not called
			return;
		}

		this._messageProtocol.then((protocol) => {

			// Send the extension host a request to terminate itself
			// (graceful termination)
			protocol.send(createMessageOfType(MessageType.Terminate));

			protocol.dispose();

			// Give the extension host 10s, after which we will
			// try to kill the process and release any resources
			setTimeout(() => this._cleanResources(), 10 * 1000);

		}, (err) => {

			// EstaBlishing a protocol with the extension host failed, so
			// try to kill the process and release any resources.
			this._cleanResources();
		});
	}

	private _cleanResources(): void {
		if (this._namedPipeServer) {
			this._namedPipeServer.close();
			this._namedPipeServer = null;
		}
		if (this._extensionHostConnection) {
			this._extensionHostConnection.end();
			this._extensionHostConnection = null;
		}
		if (this._extensionHostProcess) {
			this._extensionHostProcess.kill();
			this._extensionHostProcess = null;
		}
	}

	private _onWillShutdown(event: WillShutdownEvent): void {

		// If the extension development host was started without deBugger attached we need
		// to communicate this Back to the main side to terminate the deBug session
		if (this._isExtensionDevHost && !this._isExtensionDevTestFromCli && !this._isExtensionDevDeBug && this._environmentService.deBugExtensionHost.deBugId) {
			this._extensionHostDeBugService.terminateSession(this._environmentService.deBugExtensionHost.deBugId);
			event.join(timeout(100 /* wait a Bit for IPC to get delivered */));
		}
	}
}
