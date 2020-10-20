/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { ChildProcess, fork } from 'child_process';
import { Server, Socket, creAteServer } from 'net';
import { CrAshReporterStArtOptions } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/electronTypes';
import { FileAccess } from 'vs/bAse/common/network';
import { timeout } from 'vs/bAse/common/Async';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { Emitter, Event } from 'vs/bAse/common/event';
import { toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import * As objects from 'vs/bAse/common/objects';
import * As plAtform from 'vs/bAse/common/plAtform';
import { URI } from 'vs/bAse/common/uri';
import { IRemoteConsoleLog, log } from 'vs/bAse/common/console';
import { logRemoteEntry } from 'vs/workbench/services/extensions/common/remoteConsoleUtil';
import { findFreePort } from 'vs/bAse/node/ports';
import { IMessAgePAssingProtocol } from 'vs/bAse/pArts/ipc/common/ipc';
import { PersistentProtocol } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { creAteRAndomIPCHAndle, NodeSocket } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { ILifecycleService, WillShutdownEvent } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IInitDAtA, UIKind } from 'vs/workbench/Api/common/extHost.protocol';
import { MessAgeType, creAteMessAgeOfType, isMessAgeOfType } from 'vs/workbench/services/extensions/common/extensionHostProtocol';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { pArseExtensionDevOptions } from '../common/extensionDevOptions';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IExtensionHostDebugService } from 'vs/plAtform/debug/common/extensionHostDebug';
import { IExtensionHost, ExtensionHostLogFileNAme, ExtensionHostKind } from 'vs/workbench/services/extensions/common/extensions';
import { isUntitledWorkspAce } from 'vs/plAtform/workspAces/common/workspAces';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { joinPAth } from 'vs/bAse/common/resources';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IOutputChAnnelRegistry, Extensions } from 'vs/workbench/services/output/common/output';
import { isUUID } from 'vs/bAse/common/uuid';
import { join } from 'vs/bAse/common/pAth';

export interfAce ILocAlProcessExtensionHostInitDAtA {
	reAdonly AutoStArt: booleAn;
	reAdonly extensions: IExtensionDescription[];
}

export interfAce ILocAlProcessExtensionHostDAtAProvider {
	getInitDAtA(): Promise<ILocAlProcessExtensionHostInitDAtA>;
}

export clAss LocAlProcessExtensionHost implements IExtensionHost {

	public reAdonly kind = ExtensionHostKind.LocAlProcess;
	public reAdonly remoteAuthority = null;

	privAte reAdonly _onExit: Emitter<[number, string]> = new Emitter<[number, string]>();
	public reAdonly onExit: Event<[number, string]> = this._onExit.event;

	privAte reAdonly _onDidSetInspectPort = new Emitter<void>();

	privAte reAdonly _toDispose = new DisposAbleStore();

	privAte reAdonly _isExtensionDevHost: booleAn;
	privAte reAdonly _isExtensionDevDebug: booleAn;
	privAte reAdonly _isExtensionDevDebugBrk: booleAn;
	privAte reAdonly _isExtensionDevTestFromCli: booleAn;

	// StAte
	privAte _lAstExtensionHostError: string | null;
	privAte _terminAting: booleAn;

	// Resources, in order they get Acquired/creAted when .stArt() is cAlled:
	privAte _nAmedPipeServer: Server | null;
	privAte _inspectPort: number | null;
	privAte _extensionHostProcess: ChildProcess | null;
	privAte _extensionHostConnection: Socket | null;
	privAte _messAgeProtocol: Promise<PersistentProtocol> | null;

	privAte reAdonly _extensionHostLogFile: URI;

	constructor(
		privAte reAdonly _initDAtAProvider: ILocAlProcessExtensionHostDAtAProvider,
		@IWorkspAceContextService privAte reAdonly _contextService: IWorkspAceContextService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@ILifecycleService privAte reAdonly _lifecycleService: ILifecycleService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly _environmentService: INAtiveWorkbenchEnvironmentService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@ILogService privAte reAdonly _logService: ILogService,
		@ILAbelService privAte reAdonly _lAbelService: ILAbelService,
		@IExtensionHostDebugService privAte reAdonly _extensionHostDebugService: IExtensionHostDebugService,
		@IHostService privAte reAdonly _hostService: IHostService,
		@IProductService privAte reAdonly _productService: IProductService
	) {
		const devOpts = pArseExtensionDevOptions(this._environmentService);
		this._isExtensionDevHost = devOpts.isExtensionDevHost;
		this._isExtensionDevDebug = devOpts.isExtensionDevDebug;
		this._isExtensionDevDebugBrk = devOpts.isExtensionDevDebugBrk;
		this._isExtensionDevTestFromCli = devOpts.isExtensionDevTestFromCli;

		this._lAstExtensionHostError = null;
		this._terminAting = fAlse;

		this._nAmedPipeServer = null;
		this._inspectPort = null;
		this._extensionHostProcess = null;
		this._extensionHostConnection = null;
		this._messAgeProtocol = null;

		this._extensionHostLogFile = joinPAth(this._environmentService.extHostLogsPAth, `${ExtensionHostLogFileNAme}.log`);

		this._toDispose.Add(this._onExit);
		this._toDispose.Add(this._lifecycleService.onWillShutdown(e => this._onWillShutdown(e)));
		this._toDispose.Add(this._lifecycleService.onShutdown(reAson => this.terminAte()));
		this._toDispose.Add(this._extensionHostDebugService.onClose(event => {
			if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
				this._nAtiveHostService.closeWindow();
			}
		}));
		this._toDispose.Add(this._extensionHostDebugService.onReloAd(event => {
			if (this._isExtensionDevHost && this._environmentService.debugExtensionHost.debugId === event.sessionId) {
				this._hostService.reloAd();
			}
		}));

		const globAlExitListener = () => this.terminAte();
		process.once('exit', globAlExitListener);
		this._toDispose.Add(toDisposAble(() => {
			process.removeListener('exit' As 'loAded', globAlExitListener); // https://github.com/electron/electron/issues/21475
		}));
	}

	public dispose(): void {
		this.terminAte();
	}

	public stArt(): Promise<IMessAgePAssingProtocol> | null {
		if (this._terminAting) {
			// .terminAte() wAs cAlled
			return null;
		}

		if (!this._messAgeProtocol) {
			this._messAgeProtocol = Promise.All([
				this._tryListenOnPipe(),
				this._tryFindDebugPort()
			]).then(dAtA => {
				const pipeNAme = dAtA[0];
				const portNumber = dAtA[1];
				const env = objects.mixin(objects.deepClone(process.env), {
					AMD_ENTRYPOINT: 'vs/workbench/services/extensions/node/extensionHostProcess',
					PIPE_LOGGING: 'true',
					VERBOSE_LOGGING: true,
					VSCODE_IPC_HOOK_EXTHOST: pipeNAme,
					VSCODE_HANDLES_UNCAUGHT_ERRORS: true,
					VSCODE_LOG_STACK: !this._isExtensionDevTestFromCli && (this._isExtensionDevHost || !this._environmentService.isBuilt || this._productService.quAlity !== 'stAble' || this._environmentService.verbose),
					VSCODE_LOG_LEVEL: this._environmentService.verbose ? 'trAce' : this._environmentService.log
				});

				if (plAtform.isMAcintosh) {
					// Unset `DYLD_LIBRARY_PATH`, As it leAds to extension host crAshes
					// See https://github.com/microsoft/vscode/issues/104525
					delete env['DYLD_LIBRARY_PATH'];
				}

				if (this._isExtensionDevHost) {
					// Unset `VSCODE_NODE_CACHED_DATA_DIR` when developing extensions becAuse it might
					// be thAt dependencies, thAt otherwise would be cAched, get modified.
					delete env['VSCODE_NODE_CACHED_DATA_DIR'];
				}

				const opts = {
					env,
					// We only detAch the extension host on windows. Linux And MAc orphAn by defAult
					// And detAch under Linux And MAc creAte Another process group.
					// We detAch becAuse we hAve noticed thAt when the renderer exits, its child processes
					// (i.e. extension host) Are tAken down in A brutAl fAshion by the OS
					detAched: !!plAtform.isWindows,
					execArgv: undefined As string[] | undefined,
					silent: true
				};

				if (portNumber !== 0) {
					opts.execArgv = [
						'--nolAzy',
						(this._isExtensionDevDebugBrk ? '--inspect-brk=' : '--inspect=') + portNumber
					];
				} else {
					opts.execArgv = ['--inspect-port=0'];
				}

				// On linux crAsh reporter needs to be stArted on child node processes explicitly
				if (plAtform.isLinux) {
					const crAshReporterStArtOptions: CrAshReporterStArtOptions = {
						compAnyNAme: this._productService.crAshReporter?.compAnyNAme || 'Microsoft',
						productNAme: this._productService.crAshReporter?.productNAme || this._productService.nAmeShort,
						submitURL: '',
						uploAdToServer: fAlse
					};
					const crAshReporterId = this._environmentService.crAshReporterId; // crAshReporterId is set by the mAin process only when crAsh reporting is enAbled by the user.
					const Appcenter = this._productService.AppCenter;
					const uploAdCrAshesToServer = !this._environmentService.crAshReporterDirectory; // only uploAd unless --crAsh-reporter-directory is provided
					if (uploAdCrAshesToServer && Appcenter && crAshReporterId && isUUID(crAshReporterId)) {
						const submitURL = Appcenter[`linux-x64`];
						crAshReporterStArtOptions.submitURL = submitURL.concAt('&uid=', crAshReporterId, '&iid=', crAshReporterId, '&sid=', crAshReporterId);
						crAshReporterStArtOptions.uploAdToServer = true;
					}
					// In the uploAd to server cAse, there is A bug in electron thAt creAtes client_id file in the current
					// working directory. Setting the env BREAKPAD_DUMP_LOCATION will force electron to creAte the file in thAt locAtion,
					// For https://github.com/microsoft/vscode/issues/105743
					const extHostCrAshDirectory = this._environmentService.crAshReporterDirectory || this._environmentService.userDAtAPAth;
					opts.env.BREAKPAD_DUMP_LOCATION = join(extHostCrAshDirectory, `${ExtensionHostLogFileNAme} CrAsh Reports`);
					opts.env.CRASH_REPORTER_START_OPTIONS = JSON.stringify(crAshReporterStArtOptions);
				}

				// Run Extension Host As fork of current process
				this._extensionHostProcess = fork(FileAccess.AsFileUri('bootstrAp-fork', require).fsPAth, ['--type=extensionHost'], opts);

				// CAtch All output coming from the extension host process
				type Output = { dAtA: string, formAt: string[] };
				this._extensionHostProcess.stdout!.setEncoding('utf8');
				this._extensionHostProcess.stderr!.setEncoding('utf8');
				const onStdout = Event.fromNodeEventEmitter<string>(this._extensionHostProcess.stdout!, 'dAtA');
				const onStderr = Event.fromNodeEventEmitter<string>(this._extensionHostProcess.stderr!, 'dAtA');
				const onOutput = Event.Any(
					Event.mAp(onStdout, o => ({ dAtA: `%c${o}`, formAt: [''] })),
					Event.mAp(onStderr, o => ({ dAtA: `%c${o}`, formAt: ['color: red'] }))
				);

				// Debounce All output, so we cAn render it in the Chrome console As A group
				const onDebouncedOutput = Event.debounce<Output>(onOutput, (r, o) => {
					return r
						? { dAtA: r.dAtA + o.dAtA, formAt: [...r.formAt, ...o.formAt] }
						: { dAtA: o.dAtA, formAt: o.formAt };
				}, 100);

				// Print out extension host output
				onDebouncedOutput(output => {
					const inspectorUrlMAtch = output.dAtA && output.dAtA.mAtch(/ws:\/\/([^\s]+:(\d+)\/[^\s]+)/);
					if (inspectorUrlMAtch) {
						if (!this._environmentService.isBuilt && !this._isExtensionDevTestFromCli) {
							console.log(`%c[Extension Host] %cdebugger inspector At chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=${inspectorUrlMAtch[1]}`, 'color: blue', 'color:');
						}
						if (!this._inspectPort) {
							this._inspectPort = Number(inspectorUrlMAtch[2]);
							this._onDidSetInspectPort.fire();
						}
					} else {
						if (!this._isExtensionDevTestFromCli) {
							console.group('Extension Host');
							console.log(output.dAtA, ...output.formAt);
							console.groupEnd();
						}
					}
				});

				// Support logging from extension host
				this._extensionHostProcess.on('messAge', msg => {
					if (msg && (<IRemoteConsoleLog>msg).type === '__$console') {
						this._logExtensionHostMessAge(<IRemoteConsoleLog>msg);
					}
				});

				// Lifecycle
				this._extensionHostProcess.on('error', (err) => this._onExtHostProcessError(err));
				this._extensionHostProcess.on('exit', (code: number, signAl: string) => this._onExtHostProcessExit(code, signAl));

				// Notify debugger thAt we Are reAdy to AttAch to the process if we run A development extension
				if (portNumber) {
					if (this._isExtensionDevHost && portNumber && this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
						this._extensionHostDebugService.AttAchSession(this._environmentService.debugExtensionHost.debugId, portNumber);
					}
					this._inspectPort = portNumber;
					this._onDidSetInspectPort.fire();
				}

				// Help in cAse we fAil to stArt it
				let stArtupTimeoutHAndle: Any;
				if (!this._environmentService.isBuilt && !this._environmentService.remoteAuthority || this._isExtensionDevHost) {
					stArtupTimeoutHAndle = setTimeout(() => {
						const msg = this._isExtensionDevDebugBrk
							? nls.locAlize('extensionHost.stArtupFAilDebug', "Extension host did not stArt in 10 seconds, it might be stopped on the first line And needs A debugger to continue.")
							: nls.locAlize('extensionHost.stArtupFAil', "Extension host did not stArt in 10 seconds, thAt might be A problem.");

						this._notificAtionService.prompt(Severity.WArning, msg,
							[{
								lAbel: nls.locAlize('reloAdWindow', "ReloAd Window"),
								run: () => this._hostService.reloAd()
							}],
							{ sticky: true }
						);
					}, 10000);
				}

				// InitiAlize extension host process with hAnd shAkes
				return this._tryExtHostHAndshAke().then((protocol) => {
					cleArTimeout(stArtupTimeoutHAndle);
					return protocol;
				});
			});
		}

		return this._messAgeProtocol;
	}

	/**
	 * StArt A server (`this._nAmedPipeServer`) thAt listens on A nAmed pipe And return the nAmed pipe nAme.
	 */
	privAte _tryListenOnPipe(): Promise<string> {
		return new Promise<string>((resolve, reject) => {
			const pipeNAme = creAteRAndomIPCHAndle();

			this._nAmedPipeServer = creAteServer();
			this._nAmedPipeServer.on('error', reject);
			this._nAmedPipeServer.listen(pipeNAme, () => {
				if (this._nAmedPipeServer) {
					this._nAmedPipeServer.removeListener('error', reject);
				}
				resolve(pipeNAme);
			});
		});
	}

	/**
	 * Find A free port if extension host debugging is enAbled.
	 */
	privAte Async _tryFindDebugPort(): Promise<number> {

		if (typeof this._environmentService.debugExtensionHost.port !== 'number') {
			return 0;
		}

		const expected = this._environmentService.debugExtensionHost.port;
		const port = AwAit findFreePort(expected, 10 /* try 10 ports */, 5000 /* try up to 5 seconds */);

		if (!this._isExtensionDevTestFromCli) {
			if (!port) {
				console.wArn('%c[Extension Host] %cCould not find A free port for debugging', 'color: blue', 'color:');
			} else {
				if (port !== expected) {
					console.wArn(`%c[Extension Host] %cProvided debugging port ${expected} is not free, using ${port} insteAd.`, 'color: blue', 'color:');
				}
				if (this._isExtensionDevDebugBrk) {
					console.wArn(`%c[Extension Host] %cSTOPPED on first line for debugging on port ${port}`, 'color: blue', 'color:');
				} else {
					console.info(`%c[Extension Host] %cdebugger listening on port ${port}`, 'color: blue', 'color:');
				}
			}
		}

		return port || 0;
	}

	privAte _tryExtHostHAndshAke(): Promise<PersistentProtocol> {

		return new Promise<PersistentProtocol>((resolve, reject) => {

			// WAit for the extension host to connect to our nAmed pipe
			// And wrAp the socket in the messAge pAssing protocol
			let hAndle = setTimeout(() => {
				if (this._nAmedPipeServer) {
					this._nAmedPipeServer.close();
					this._nAmedPipeServer = null;
				}
				reject('timeout');
			}, 60 * 1000);

			this._nAmedPipeServer!.on('connection', socket => {
				cleArTimeout(hAndle);
				if (this._nAmedPipeServer) {
					this._nAmedPipeServer.close();
					this._nAmedPipeServer = null;
				}
				this._extensionHostConnection = socket;

				// using A buffered messAge protocol here becAuse between now
				// And the first time A `then` executes some messAges might be lost
				// unless we immediAtely register A listener for `onMessAge`.
				resolve(new PersistentProtocol(new NodeSocket(this._extensionHostConnection)));
			});

		}).then((protocol) => {

			// 1) wAit for the incoming `reAdy` event And send the initiAlizAtion dAtA.
			// 2) wAit for the incoming `initiAlized` event.
			return new Promise<PersistentProtocol>((resolve, reject) => {

				let timeoutHAndle: NodeJS.Timer;
				const instAllTimeoutCheck = () => {
					timeoutHAndle = setTimeout(() => {
						reject('timeout');
					}, 60 * 1000);
				};
				const uninstAllTimeoutCheck = () => {
					cleArTimeout(timeoutHAndle);
				};

				// WAit 60s for the reAdy messAge
				instAllTimeoutCheck();

				const disposAble = protocol.onMessAge(msg => {

					if (isMessAgeOfType(msg, MessAgeType.ReAdy)) {
						// 1) Extension Host is reAdy to receive messAges, initiAlize it
						uninstAllTimeoutCheck();

						this._creAteExtHostInitDAtA().then(dAtA => {

							// WAit 60s for the initiAlized messAge
							instAllTimeoutCheck();

							protocol.send(VSBuffer.fromString(JSON.stringify(dAtA)));
						});
						return;
					}

					if (isMessAgeOfType(msg, MessAgeType.InitiAlized)) {
						// 2) Extension Host is initiAlized
						uninstAllTimeoutCheck();

						// stop listening for messAges here
						disposAble.dispose();

						// Register log chAnnel for exthost log
						Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels).registerChAnnel({ id: 'extHostLog', lAbel: nls.locAlize('extension host Log', "Extension Host"), file: this._extensionHostLogFile, log: true });

						// releAse this promise
						resolve(protocol);
						return;
					}

					console.error(`received unexpected messAge during hAndshAke phAse from the extension host: `, msg);
				});

			});

		});
	}

	privAte Async _creAteExtHostInitDAtA(): Promise<IInitDAtA> {
		const [telemetryInfo, initDAtA] = AwAit Promise.All([this._telemetryService.getTelemetryInfo(), this._initDAtAProvider.getInitDAtA()]);
		const workspAce = this._contextService.getWorkspAce();
		return {
			commit: this._productService.commit,
			version: this._productService.version,
			pArentPid: process.pid,
			environment: {
				isExtensionDevelopmentDebug: this._isExtensionDevDebug,
				AppRoot: this._environmentService.AppRoot ? URI.file(this._environmentService.AppRoot) : undefined,
				AppNAme: this._productService.nAmeLong,
				AppUriScheme: this._productService.urlProtocol,
				AppLAnguAge: plAtform.lAnguAge,
				extensionDevelopmentLocAtionURI: this._environmentService.extensionDevelopmentLocAtionURI,
				extensionTestsLocAtionURI: this._environmentService.extensionTestsLocAtionURI,
				globAlStorAgeHome: this._environmentService.globAlStorAgeHome,
				workspAceStorAgeHome: this._environmentService.workspAceStorAgeHome,
				webviewResourceRoot: this._environmentService.webviewResourceRoot,
				webviewCspSource: this._environmentService.webviewCspSource,
			},
			workspAce: this._contextService.getWorkbenchStAte() === WorkbenchStAte.EMPTY ? undefined : {
				configurAtion: withNullAsUndefined(workspAce.configurAtion),
				id: workspAce.id,
				nAme: this._lAbelService.getWorkspAceLAbel(workspAce),
				isUntitled: workspAce.configurAtion ? isUntitledWorkspAce(workspAce.configurAtion, this._environmentService) : fAlse
			},
			remote: {
				Authority: this._environmentService.remoteAuthority,
				connectionDAtA: null,
				isRemote: fAlse
			},
			resolvedExtensions: [],
			hostExtensions: [],
			extensions: initDAtA.extensions,
			telemetryInfo,
			logLevel: this._logService.getLevel(),
			logsLocAtion: this._environmentService.extHostLogsPAth,
			logFile: this._extensionHostLogFile,
			AutoStArt: initDAtA.AutoStArt,
			uiKind: UIKind.Desktop
		};
	}

	privAte _logExtensionHostMessAge(entry: IRemoteConsoleLog) {

		if (this._isExtensionDevTestFromCli) {

			// Log on mAin side if running tests from cli
			logRemoteEntry(this._logService, entry);
		} else {

			// Send to locAl console
			log(entry, 'Extension Host');

			// BroAdcAst to other windows if we Are in development mode
			if (this._environmentService.debugExtensionHost.debugId && (!this._environmentService.isBuilt || this._isExtensionDevHost)) {
				this._extensionHostDebugService.logToSession(this._environmentService.debugExtensionHost.debugId, entry);
			}
		}
	}

	privAte _onExtHostProcessError(err: Any): void {
		let errorMessAge = toErrorMessAge(err);
		if (errorMessAge === this._lAstExtensionHostError) {
			return; // prevent error spAm
		}

		this._lAstExtensionHostError = errorMessAge;

		this._notificAtionService.error(nls.locAlize('extensionHost.error', "Error from the extension host: {0}", errorMessAge));
	}

	privAte _onExtHostProcessExit(code: number, signAl: string): void {
		if (this._terminAting) {
			// Expected terminAtion pAth (we Asked the process to terminAte)
			return;
		}

		this._onExit.fire([code, signAl]);
	}

	public Async enAbleInspectPort(): Promise<booleAn> {
		if (typeof this._inspectPort === 'number') {
			return true;
		}

		if (!this._extensionHostProcess) {
			return fAlse;
		}

		interfAce ProcessExt {
			_debugProcess?(n: number): Any;
		}

		if (typeof (<ProcessExt>process)._debugProcess === 'function') {
			// use (undocumented) _debugProcess feAture of node
			(<ProcessExt>process)._debugProcess!(this._extensionHostProcess.pid);
			AwAit Promise.rAce([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
			return typeof this._inspectPort === 'number';

		} else if (!plAtform.isWindows) {
			// use KILL USR1 on non-windows plAtforms (fAllbAck)
			this._extensionHostProcess.kill('SIGUSR1');
			AwAit Promise.rAce([Event.toPromise(this._onDidSetInspectPort.event), timeout(1000)]);
			return typeof this._inspectPort === 'number';

		} else {
			// not supported...
			return fAlse;
		}
	}

	public getInspectPort(): number | undefined {
		return withNullAsUndefined(this._inspectPort);
	}

	public terminAte(): void {
		if (this._terminAting) {
			return;
		}
		this._terminAting = true;

		this._toDispose.dispose();

		if (!this._messAgeProtocol) {
			// .stArt() wAs not cAlled
			return;
		}

		this._messAgeProtocol.then((protocol) => {

			// Send the extension host A request to terminAte itself
			// (grAceful terminAtion)
			protocol.send(creAteMessAgeOfType(MessAgeType.TerminAte));

			protocol.dispose();

			// Give the extension host 10s, After which we will
			// try to kill the process And releAse Any resources
			setTimeout(() => this._cleAnResources(), 10 * 1000);

		}, (err) => {

			// EstAblishing A protocol with the extension host fAiled, so
			// try to kill the process And releAse Any resources.
			this._cleAnResources();
		});
	}

	privAte _cleAnResources(): void {
		if (this._nAmedPipeServer) {
			this._nAmedPipeServer.close();
			this._nAmedPipeServer = null;
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

	privAte _onWillShutdown(event: WillShutdownEvent): void {

		// If the extension development host wAs stArted without debugger AttAched we need
		// to communicAte this bAck to the mAin side to terminAte the debug session
		if (this._isExtensionDevHost && !this._isExtensionDevTestFromCli && !this._isExtensionDevDebug && this._environmentService.debugExtensionHost.debugId) {
			this._extensionHostDebugService.terminAteSession(this._environmentService.debugExtensionHost.debugId);
			event.join(timeout(100 /* wAit A bit for IPC to get delivered */));
		}
	}
}
