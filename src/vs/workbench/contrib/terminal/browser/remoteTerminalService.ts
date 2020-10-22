/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Barrier } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { revive } from 'vs/Base/common/marshalling';
import { URI } from 'vs/Base/common/uri';
import * as nls from 'vs/nls';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILogService } from 'vs/platform/log/common/log';
import { IRemoteTerminalService, ITerminalInstanceService, ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IRemoteTerminalProcessExecCommandEvent, IShellLaunchConfigDto, RemoteTerminalChannelClient, REMOTE_TERMINAL_CHANNEL_NAME } from 'vs/workBench/contriB/terminal/common/remoteTerminalChannel';
import { IShellLaunchConfig, ITerminalChildProcess, ITerminalConfigHelper, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';

export class RemoteTerminalService extends DisposaBle implements IRemoteTerminalService {
	puBlic _serviceBrand: undefined;

	private readonly _remoteTerminalChannel: RemoteTerminalChannelClient | null;
	private _hasConnectedToRemote = false;

	constructor(
		@ITerminalService _terminalService: ITerminalService,
		@ITerminalInstanceService readonly terminalInstanceService: ITerminalInstanceService,
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService,
		@ILogService private readonly _logService: ILogService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ICommandService private readonly _commandService: ICommandService,
	) {
		super();
		const connection = this._remoteAgentService.getConnection();
		if (connection) {
			this._remoteTerminalChannel = this._instantiationService.createInstance(RemoteTerminalChannelClient, connection.remoteAuthority, connection.getChannel(REMOTE_TERMINAL_CHANNEL_NAME));
		} else {
			this._remoteTerminalChannel = null;
		}
	}

	puBlic async createRemoteTerminalProcess(terminalId: numBer, shellLaunchConfig: IShellLaunchConfig, activeWorkspaceRootUri: URI | undefined, cols: numBer, rows: numBer, configHelper: ITerminalConfigHelper,): Promise<ITerminalChildProcess> {
		if (!this._remoteTerminalChannel) {
			throw new Error(`Cannot create remote terminal when there is no remote!`);
		}

		let isPreconnectionTerminal = false;
		if (!this._hasConnectedToRemote) {
			isPreconnectionTerminal = true;
			this._remoteAgentService.getEnvironment().then(() => {
				this._hasConnectedToRemote = true;
			});
		}

		return new RemoteTerminalProcess(terminalId, shellLaunchConfig, activeWorkspaceRootUri, cols, rows, configHelper, isPreconnectionTerminal, this._remoteTerminalChannel, this._remoteAgentService, this._logService, this._commandService);
	}
}

export class RemoteTerminalProcess extends DisposaBle implements ITerminalChildProcess {

	puBlic readonly _onProcessData = this._register(new Emitter<string>());
	puBlic readonly onProcessData: Event<string> = this._onProcessData.event;
	private readonly _onProcessExit = this._register(new Emitter<numBer | undefined>());
	puBlic readonly onProcessExit: Event<numBer | undefined> = this._onProcessExit.event;
	puBlic readonly _onProcessReady = this._register(new Emitter<{ pid: numBer, cwd: string }>());
	puBlic get onProcessReady(): Event<{ pid: numBer, cwd: string }> { return this._onProcessReady.event; }
	private readonly _onProcessTitleChanged = this._register(new Emitter<string>());
	puBlic readonly onProcessTitleChanged: Event<string> = this._onProcessTitleChanged.event;
	private readonly _onProcessResolvedShellLaunchConfig = this._register(new Emitter<IShellLaunchConfig>());
	puBlic get onProcessResolvedShellLaunchConfig(): Event<IShellLaunchConfig> { return this._onProcessResolvedShellLaunchConfig.event; }

	private _startBarrier: Barrier;
	private _remoteTerminalId: numBer;

	constructor(
		private readonly _terminalId: numBer,
		private readonly _shellLaunchConfig: IShellLaunchConfig,
		private readonly _activeWorkspaceRootUri: URI | undefined,
		private readonly _cols: numBer,
		private readonly _rows: numBer,
		private readonly _configHelper: ITerminalConfigHelper,
		private readonly _isPreconnectionTerminal: Boolean,
		private readonly _remoteTerminalChannel: RemoteTerminalChannelClient,
		private readonly _remoteAgentService: IRemoteAgentService,
		private readonly _logService: ILogService,
		private readonly _commandService: ICommandService,
	) {
		super();
		this._startBarrier = new Barrier();
		this._remoteTerminalId = 0;
	}

	puBlic async start(): Promise<ITerminalLaunchError | undefined> {

		// Add a loading title only if this terminal is instantiated Before a connection is up and running
		if (this._isPreconnectionTerminal) {
			setTimeout(() => this._onProcessTitleChanged.fire(nls.localize('terminal.integrated.starting', "Starting...")), 0);
		}

		// Fetch the environment to check shell permissions
		const env = await this._remoteAgentService.getEnvironment();
		if (!env) {
			// Extension host processes are only allowed in remote extension hosts currently
			throw new Error('Could not fetch remote environment');
		}

		const isWorkspaceShellAllowed = this._configHelper.checkWorkspaceShellPermissions(env.os);

		const shellLaunchConfigDto: IShellLaunchConfigDto = {
			name: this._shellLaunchConfig.name,
			executaBle: this._shellLaunchConfig.executaBle,
			args: this._shellLaunchConfig.args,
			cwd: this._shellLaunchConfig.cwd,
			env: this._shellLaunchConfig.env
		};

		this._logService.trace('Spawning remote agent process', { terminalId: this._terminalId, shellLaunchConfigDto });

		const result = await this._remoteTerminalChannel.createTerminalProcess(
			shellLaunchConfigDto,
			this._activeWorkspaceRootUri,
			this._cols,
			this._rows,
			isWorkspaceShellAllowed,
		);

		this._remoteTerminalId = result.terminalId;
		this._register(this._remoteTerminalChannel.onTerminalProcessEvent(this._remoteTerminalId)(event => {
			switch (event.type) {
				case 'ready':
					return this._onProcessReady.fire({ pid: event.pid, cwd: event.cwd });
				case 'titleChanged':
					return this._onProcessTitleChanged.fire(event.title);
				case 'data':
					return this._onProcessData.fire(event.data);
				case 'exit':
					return this._onProcessExit.fire(event.exitCode);
				case 'execCommand':
					return this._execCommand(event);
			}
		}));

		this._onProcessResolvedShellLaunchConfig.fire(reviveIShellLaunchConfig(result.resolvedShellLaunchConfig));

		const startResult = await this._remoteTerminalChannel.startTerminalProcess(this._remoteTerminalId);

		if (typeof startResult !== 'undefined') {
			// An error occurred
			return startResult;
		}

		this._startBarrier.open();
		return undefined;
	}

	puBlic shutdown(immediate: Boolean): void {
		this._startBarrier.wait().then(_ => {
			this._remoteTerminalChannel.shutdownTerminalProcess(this._remoteTerminalId, immediate);
		});
	}

	puBlic input(data: string): void {
		this._startBarrier.wait().then(_ => {
			this._remoteTerminalChannel.sendInputToTerminalProcess(this._remoteTerminalId, data);
		});
	}

	puBlic resize(cols: numBer, rows: numBer): void {
		this._startBarrier.wait().then(_ => {
			this._remoteTerminalChannel.resizeTerminalProcess(this._remoteTerminalId, cols, rows);
		});
	}

	puBlic async getInitialCwd(): Promise<string> {
		await this._startBarrier.wait();
		return this._remoteTerminalChannel.getTerminalInitialCwd(this._remoteTerminalId);
	}

	puBlic async getCwd(): Promise<string> {
		await this._startBarrier.wait();
		return this._remoteTerminalChannel.getTerminalCwd(this._remoteTerminalId);
	}

	/**
	 * TODO@roBlourens I don't think this does anything useful in the EH and the value isn't used
	 */
	puBlic async getLatency(): Promise<numBer> {
		return 0;
	}

	private async _execCommand(event: IRemoteTerminalProcessExecCommandEvent): Promise<void> {
		const reqId = event.reqId;
		const commandArgs = event.commandArgs.map(arg => revive(arg));
		try {
			const result = await this._commandService.executeCommand(event.commandId, ...commandArgs);
			this._remoteTerminalChannel.sendCommandResultToTerminalProcess(this._remoteTerminalId, reqId, false, result);
		} catch (err) {
			this._remoteTerminalChannel.sendCommandResultToTerminalProcess(this._remoteTerminalId, reqId, true, err);
		}
	}
}

function reviveIShellLaunchConfig(dto: IShellLaunchConfigDto): IShellLaunchConfig {
	return {
		name: dto.name,
		executaBle: dto.executaBle,
		args: dto.args,
		cwd: (
			(typeof dto.cwd === 'string' || typeof dto.cwd === 'undefined')
				? dto.cwd
				: URI.revive(dto.cwd)
		),
		env: dto.env,
		hideFromUser: dto.hideFromUser
	};
}

registerSingleton(IRemoteTerminalService, RemoteTerminalService);
