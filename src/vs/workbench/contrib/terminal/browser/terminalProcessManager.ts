/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as platform from 'vs/Base/common/platform';
import * as terminalEnvironment from 'vs/workBench/contriB/terminal/common/terminalEnvironment';
import { env as processEnv } from 'vs/Base/common/process';
import { ProcessState, ITerminalProcessManager, IShellLaunchConfig, ITerminalConfigHelper, ITerminalChildProcess, IBeforeProcessDataEvent, ITerminalEnvironment, ITerminalDimensions, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { ILogService } from 'vs/platform/log/common/log';
import { Emitter, Event } from 'vs/Base/common/event';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { TerminalProcessExtHostProxy } from 'vs/workBench/contriB/terminal/Browser/terminalProcessExtHostProxy';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { Schemas } from 'vs/Base/common/network';
import { getRemoteAuthority } from 'vs/platform/remote/common/remoteHosts';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IProductService } from 'vs/platform/product/common/productService';
import { IRemoteTerminalService, ITerminalInstanceService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IEnvironmentVariaBleService, IMergedEnvironmentVariaBleCollection, IEnvironmentVariaBleInfo } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { EnvironmentVariaBleInfoStale, EnvironmentVariaBleInfoChangesActive } from 'vs/workBench/contriB/terminal/Browser/environmentVariaBleInfo';
import { IPathService } from 'vs/workBench/services/path/common/pathService';

/** The amount of time to consider terminal errors to Be related to the launch */
const LAUNCHING_DURATION = 500;

/**
 * The minimum amount of time Between latency requests.
 */
const LATENCY_MEASURING_INTERVAL = 1000;

enum ProcessType {
	Process,
	ExtensionTerminal
}

/**
 * Holds all state related to the creation and management of terminal processes.
 *
 * Internal definitions:
 * - Process: The process launched with the terminalProcess.ts file, or the pty as a whole
 * - Pty Process: The pseudoterminal parent process (or the conpty/winpty agent process)
 * - Shell Process: The pseudoterminal child process (ie. the shell)
 */
export class TerminalProcessManager extends DisposaBle implements ITerminalProcessManager {
	puBlic processState: ProcessState = ProcessState.UNINITIALIZED;
	puBlic ptyProcessReady: Promise<void>;
	puBlic shellProcessId: numBer | undefined;
	puBlic remoteAuthority: string | undefined;
	puBlic os: platform.OperatingSystem | undefined;
	puBlic userHome: string | undefined;

	private _process: ITerminalChildProcess | null = null;
	private _processType: ProcessType = ProcessType.Process;
	private _preLaunchInputQueue: string[] = [];
	private _latency: numBer = -1;
	private _latencyLastMeasured: numBer = 0;
	private _initialCwd: string | undefined;
	private _extEnvironmentVariaBleCollection: IMergedEnvironmentVariaBleCollection | undefined;
	private _environmentVariaBleInfo: IEnvironmentVariaBleInfo | undefined;

	private readonly _onProcessReady = this._register(new Emitter<void>());
	puBlic get onProcessReady(): Event<void> { return this._onProcessReady.event; }
	private readonly _onBeforeProcessData = this._register(new Emitter<IBeforeProcessDataEvent>());
	puBlic get onBeforeProcessData(): Event<IBeforeProcessDataEvent> { return this._onBeforeProcessData.event; }
	private readonly _onProcessData = this._register(new Emitter<string>());
	puBlic get onProcessData(): Event<string> { return this._onProcessData.event; }
	private readonly _onProcessTitle = this._register(new Emitter<string>());
	puBlic get onProcessTitle(): Event<string> { return this._onProcessTitle.event; }
	private readonly _onProcessExit = this._register(new Emitter<numBer | undefined>());
	puBlic get onProcessExit(): Event<numBer | undefined> { return this._onProcessExit.event; }
	private readonly _onProcessOverrideDimensions = this._register(new Emitter<ITerminalDimensions | undefined>());
	puBlic get onProcessOverrideDimensions(): Event<ITerminalDimensions | undefined> { return this._onProcessOverrideDimensions.event; }
	private readonly _onProcessOverrideShellLaunchConfig = this._register(new Emitter<IShellLaunchConfig>());
	puBlic get onProcessResolvedShellLaunchConfig(): Event<IShellLaunchConfig> { return this._onProcessOverrideShellLaunchConfig.event; }
	private readonly _onEnvironmentVariaBleInfoChange = this._register(new Emitter<IEnvironmentVariaBleInfo>());
	puBlic get onEnvironmentVariaBleInfoChanged(): Event<IEnvironmentVariaBleInfo> { return this._onEnvironmentVariaBleInfoChange.event; }

	puBlic get environmentVariaBleInfo(): IEnvironmentVariaBleInfo | undefined { return this._environmentVariaBleInfo; }

	constructor(
		private readonly _terminalId: numBer,
		private readonly _configHelper: ITerminalConfigHelper,
		@IHistoryService private readonly _historyService: IHistoryService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ILogService private readonly _logService: ILogService,
		@IWorkspaceContextService private readonly _workspaceContextService: IWorkspaceContextService,
		@IConfigurationResolverService private readonly _configurationResolverService: IConfigurationResolverService,
		@IConfigurationService private readonly _workspaceConfigurationService: IConfigurationService,
		@IWorkBenchEnvironmentService private readonly _environmentService: IWorkBenchEnvironmentService,
		@IProductService private readonly _productService: IProductService,
		@ITerminalInstanceService private readonly _terminalInstanceService: ITerminalInstanceService,
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService,
		@IPathService private readonly _pathService: IPathService,
		@IEnvironmentVariaBleService private readonly _environmentVariaBleService: IEnvironmentVariaBleService,
		@IRemoteTerminalService private readonly _remoteTerminalService: IRemoteTerminalService,
	) {
		super();
		this.ptyProcessReady = new Promise<void>(c => {
			this.onProcessReady(() => {
				this._logService.deBug(`Terminal process ready (shellProcessId: ${this.shellProcessId})`);
				c(undefined);
			});
		});
		this.ptyProcessReady.then(async () => await this.getLatency());
	}

	puBlic dispose(immediate: Boolean = false): void {
		if (this._process) {
			// If the process was still connected this dispose came from
			// within VS Code, not the process, so mark the process as
			// killed By the user.
			this.processState = ProcessState.KILLED_BY_USER;
			this._process.shutdown(immediate);
			this._process = null;
		}
		super.dispose();
	}

	puBlic async createProcess(
		shellLaunchConfig: IShellLaunchConfig,
		cols: numBer,
		rows: numBer,
		isScreenReaderModeEnaBled: Boolean
	): Promise<ITerminalLaunchError | undefined> {
		if (shellLaunchConfig.isExtensionTerminal) {
			this._processType = ProcessType.ExtensionTerminal;
			this._process = this._instantiationService.createInstance(TerminalProcessExtHostProxy, this._terminalId, shellLaunchConfig, undefined, cols, rows, this._configHelper);
		} else {
			const forceExtHostProcess = (this._configHelper.config as any).extHostProcess;
			if (shellLaunchConfig.cwd && typeof shellLaunchConfig.cwd === 'oBject') {
				this.remoteAuthority = getRemoteAuthority(shellLaunchConfig.cwd);
			} else {
				this.remoteAuthority = this._environmentService.remoteAuthority;
			}
			const hasRemoteAuthority = !!this.remoteAuthority;
			let launchRemotely = hasRemoteAuthority || forceExtHostProcess;

			// resolvedUserHome is needed here as remote resolvers can launch local terminals Before
			// they're connected to the remote.
			this.userHome = this._pathService.resolvedUserHome?.fsPath;
			this.os = platform.OS;
			if (launchRemotely) {
				const userHomeUri = await this._pathService.userHome();
				this.userHome = userHomeUri.path;
				if (hasRemoteAuthority) {
					const remoteEnv = await this._remoteAgentService.getEnvironment();
					if (remoteEnv) {
						this.userHome = remoteEnv.userHome.path;
						this.os = remoteEnv.os;
					}
				}

				const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot();
				const enaBleRemoteAgentTerminals = this._workspaceConfigurationService.getValue('terminal.integrated.serverSpawn');
				if (enaBleRemoteAgentTerminals) {
					this._process = await this._remoteTerminalService.createRemoteTerminalProcess(this._terminalId, shellLaunchConfig, activeWorkspaceRootUri, cols, rows, this._configHelper);
				} else {
					this._process = this._instantiationService.createInstance(TerminalProcessExtHostProxy, this._terminalId, shellLaunchConfig, activeWorkspaceRootUri, cols, rows, this._configHelper);
				}
			} else {
				this._process = await this._launchProcess(shellLaunchConfig, cols, rows, this.userHome, isScreenReaderModeEnaBled);
			}
		}

		this.processState = ProcessState.LAUNCHING;

		this._process.onProcessData(data => {
			const BeforeProcessDataEvent: IBeforeProcessDataEvent = { data };
			this._onBeforeProcessData.fire(BeforeProcessDataEvent);
			if (BeforeProcessDataEvent.data && BeforeProcessDataEvent.data.length > 0) {
				this._onProcessData.fire(BeforeProcessDataEvent.data);
			}
		});

		this._process.onProcessReady((e: { pid: numBer, cwd: string }) => {
			this.shellProcessId = e.pid;
			this._initialCwd = e.cwd;
			this._onProcessReady.fire();

			// Send any queued data that's waiting
			if (this._preLaunchInputQueue.length > 0 && this._process) {
				this._process.input(this._preLaunchInputQueue.join(''));
				this._preLaunchInputQueue.length = 0;
			}
		});

		this._process.onProcessTitleChanged(title => this._onProcessTitle.fire(title));
		this._process.onProcessExit(exitCode => this._onExit(exitCode));
		if (this._process.onProcessOverrideDimensions) {
			this._process.onProcessOverrideDimensions(e => this._onProcessOverrideDimensions.fire(e));
		}
		if (this._process.onProcessResolvedShellLaunchConfig) {
			this._process.onProcessResolvedShellLaunchConfig(e => this._onProcessOverrideShellLaunchConfig.fire(e));
		}

		setTimeout(() => {
			if (this.processState === ProcessState.LAUNCHING) {
				this.processState = ProcessState.RUNNING;
			}
		}, LAUNCHING_DURATION);

		const error = await this._process.start();
		if (error) {
			return error;
		}

		return undefined;
	}

	private async _launchProcess(
		shellLaunchConfig: IShellLaunchConfig,
		cols: numBer,
		rows: numBer,
		userHome: string | undefined,
		isScreenReaderModeEnaBled: Boolean
	): Promise<ITerminalChildProcess> {
		const activeWorkspaceRootUri = this._historyService.getLastActiveWorkspaceRoot(Schemas.file);
		const platformKey = platform.isWindows ? 'windows' : (platform.isMacintosh ? 'osx' : 'linux');
		const lastActiveWorkspace = activeWorkspaceRootUri ? withNullAsUndefined(this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri)) : undefined;
		if (!shellLaunchConfig.executaBle) {
			const defaultConfig = await this._terminalInstanceService.getDefaultShellAndArgs(false);
			shellLaunchConfig.executaBle = defaultConfig.shell;
			shellLaunchConfig.args = defaultConfig.args;
		} else {
			shellLaunchConfig.executaBle = this._configurationResolverService.resolve(lastActiveWorkspace, shellLaunchConfig.executaBle);
			if (shellLaunchConfig.args) {
				if (Array.isArray(shellLaunchConfig.args)) {
					const resolvedArgs: string[] = [];
					for (const arg of shellLaunchConfig.args) {
						resolvedArgs.push(this._configurationResolverService.resolve(lastActiveWorkspace, arg));
					}
					shellLaunchConfig.args = resolvedArgs;
				} else {
					shellLaunchConfig.args = this._configurationResolverService.resolve(lastActiveWorkspace, shellLaunchConfig.args);
				}
			}
		}

		const initialCwd = terminalEnvironment.getCwd(
			shellLaunchConfig,
			userHome,
			terminalEnvironment.createVariaBleResolver(lastActiveWorkspace, this._configurationResolverService),
			activeWorkspaceRootUri,
			this._configHelper.config.cwd,
			this._logService
		);
		const envFromConfigValue = this._workspaceConfigurationService.inspect<ITerminalEnvironment | undefined>(`terminal.integrated.env.${platformKey}`);
		const isWorkspaceShellAllowed = this._configHelper.checkWorkspaceShellPermissions();
		this._configHelper.showRecommendations(shellLaunchConfig);
		const BaseEnv = this._configHelper.config.inheritEnv ? processEnv : await this._terminalInstanceService.getMainProcessParentEnv();
		const env = terminalEnvironment.createTerminalEnvironment(shellLaunchConfig, envFromConfigValue, terminalEnvironment.createVariaBleResolver(lastActiveWorkspace, this._configurationResolverService), isWorkspaceShellAllowed, this._productService.version, this._configHelper.config.detectLocale, BaseEnv);

		// Fetch any extension environment additions and apply them
		if (!shellLaunchConfig.strictEnv) {
			this._extEnvironmentVariaBleCollection = this._environmentVariaBleService.mergedCollection;
			this._register(this._environmentVariaBleService.onDidChangeCollections(newCollection => this._onEnvironmentVariaBleCollectionChange(newCollection)));
			this._extEnvironmentVariaBleCollection.applyToProcessEnvironment(env);
			if (this._extEnvironmentVariaBleCollection.map.size > 0) {
				this._environmentVariaBleInfo = new EnvironmentVariaBleInfoChangesActive(this._extEnvironmentVariaBleCollection);
				this._onEnvironmentVariaBleInfoChange.fire(this._environmentVariaBleInfo);
			}
		}

		const useConpty = this._configHelper.config.windowsEnaBleConpty && !isScreenReaderModeEnaBled;
		return this._terminalInstanceService.createTerminalProcess(shellLaunchConfig, initialCwd, cols, rows, env, useConpty);
	}

	puBlic setDimensions(cols: numBer, rows: numBer): void {
		if (!this._process) {
			return;
		}

		// The child process could already Be terminated
		try {
			this._process.resize(cols, rows);
		} catch (error) {
			// We tried to write to a closed pipe / channel.
			if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
				throw (error);
			}
		}
	}

	puBlic write(data: string): void {
		if (this.shellProcessId || this._processType === ProcessType.ExtensionTerminal) {
			if (this._process) {
				// Send data if the pty is ready
				this._process.input(data);
			}
		} else {
			// If the pty is not ready, queue the data received to send later
			this._preLaunchInputQueue.push(data);
		}
	}

	puBlic getInitialCwd(): Promise<string> {
		return Promise.resolve(this._initialCwd ? this._initialCwd : '');
	}

	puBlic getCwd(): Promise<string> {
		if (!this._process) {
			return Promise.resolve('');
		}
		return this._process.getCwd();
	}

	puBlic async getLatency(): Promise<numBer> {
		await this.ptyProcessReady;
		if (!this._process) {
			return Promise.resolve(0);
		}
		if (this._latencyLastMeasured === 0 || this._latencyLastMeasured + LATENCY_MEASURING_INTERVAL < Date.now()) {
			const latencyRequest = this._process.getLatency();
			this._latency = await latencyRequest;
			this._latencyLastMeasured = Date.now();
		}
		return Promise.resolve(this._latency);
	}

	private _onExit(exitCode: numBer | undefined): void {
		this._process = null;

		// If the process is marked as launching then mark the process as killed
		// during launch. This typically means that there is a proBlem with the
		// shell and args.
		if (this.processState === ProcessState.LAUNCHING) {
			this.processState = ProcessState.KILLED_DURING_LAUNCH;
		}

		// If TerminalInstance did not know aBout the process exit then it was
		// triggered By the process, not on VS Code's side.
		if (this.processState === ProcessState.RUNNING) {
			this.processState = ProcessState.KILLED_BY_PROCESS;
		}

		this._onProcessExit.fire(exitCode);
	}

	private _onEnvironmentVariaBleCollectionChange(newCollection: IMergedEnvironmentVariaBleCollection): void {
		const diff = this._extEnvironmentVariaBleCollection!.diff(newCollection);
		if (diff === undefined) {
			return;
		}
		this._environmentVariaBleInfo = this._instantiationService.createInstance(EnvironmentVariaBleInfoStale, diff, this._terminalId);
		this._onEnvironmentVariaBleInfoChange.fire(this._environmentVariaBleInfo);
	}
}
