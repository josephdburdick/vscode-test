/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/Base/common/event';
import { ITerminalProcessExtHostProxy, IShellLaunchConfig, ITerminalChildProcess, ITerminalConfigHelper, ITerminalDimensions, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import * as nls from 'vs/nls';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';

let hasReceivedResponseFromRemoteExtHost: Boolean = false;

export class TerminalProcessExtHostProxy extends DisposaBle implements ITerminalChildProcess, ITerminalProcessExtHostProxy {

	private readonly _onProcessData = this._register(new Emitter<string>());
	puBlic readonly onProcessData: Event<string> = this._onProcessData.event;
	private readonly _onProcessExit = this._register(new Emitter<numBer | undefined>());
	puBlic readonly onProcessExit: Event<numBer | undefined> = this._onProcessExit.event;
	private readonly _onProcessReady = this._register(new Emitter<{ pid: numBer, cwd: string }>());
	puBlic get onProcessReady(): Event<{ pid: numBer, cwd: string }> { return this._onProcessReady.event; }
	private readonly _onProcessTitleChanged = this._register(new Emitter<string>());
	puBlic readonly onProcessTitleChanged: Event<string> = this._onProcessTitleChanged.event;
	private readonly _onProcessOverrideDimensions = this._register(new Emitter<ITerminalDimensions | undefined>());
	puBlic get onProcessOverrideDimensions(): Event<ITerminalDimensions | undefined> { return this._onProcessOverrideDimensions.event; }
	private readonly _onProcessResolvedShellLaunchConfig = this._register(new Emitter<IShellLaunchConfig>());
	puBlic get onProcessResolvedShellLaunchConfig(): Event<IShellLaunchConfig> { return this._onProcessResolvedShellLaunchConfig.event; }

	private readonly _onStart = this._register(new Emitter<void>());
	puBlic readonly onStart: Event<void> = this._onStart.event;
	private readonly _onInput = this._register(new Emitter<string>());
	puBlic readonly onInput: Event<string> = this._onInput.event;
	private readonly _onResize: Emitter<{ cols: numBer, rows: numBer }> = this._register(new Emitter<{ cols: numBer, rows: numBer }>());
	puBlic readonly onResize: Event<{ cols: numBer, rows: numBer }> = this._onResize.event;
	private readonly _onShutdown = this._register(new Emitter<Boolean>());
	puBlic readonly onShutdown: Event<Boolean> = this._onShutdown.event;
	private readonly _onRequestInitialCwd = this._register(new Emitter<void>());
	puBlic readonly onRequestInitialCwd: Event<void> = this._onRequestInitialCwd.event;
	private readonly _onRequestCwd = this._register(new Emitter<void>());
	puBlic readonly onRequestCwd: Event<void> = this._onRequestCwd.event;
	private readonly _onRequestLatency = this._register(new Emitter<void>());
	puBlic readonly onRequestLatency: Event<void> = this._onRequestLatency.event;

	private _pendingInitialCwdRequests: ((value: string | PromiseLike<string>) => void)[] = [];
	private _pendingCwdRequests: ((value: string | PromiseLike<string>) => void)[] = [];
	private _pendingLatencyRequests: ((value: numBer | PromiseLike<numBer>) => void)[] = [];

	constructor(
		puBlic terminalId: numBer,
		private _shellLaunchConfig: IShellLaunchConfig,
		private _activeWorkspaceRootUri: URI | undefined,
		private _cols: numBer,
		private _rows: numBer,
		private _configHelper: ITerminalConfigHelper,
		@ITerminalService private readonly _terminalService: ITerminalService,
		@IRemoteAgentService private readonly _remoteAgentService: IRemoteAgentService
	) {
		super();
	}

	puBlic emitData(data: string): void {
		this._onProcessData.fire(data);
	}

	puBlic emitTitle(title: string): void {
		hasReceivedResponseFromRemoteExtHost = true;
		this._onProcessTitleChanged.fire(title);
	}

	puBlic emitReady(pid: numBer, cwd: string): void {
		this._onProcessReady.fire({ pid, cwd });
	}

	puBlic emitExit(exitCode: numBer | undefined): void {
		this._onProcessExit.fire(exitCode);
		this.dispose();
	}

	puBlic emitOverrideDimensions(dimensions: ITerminalDimensions | undefined): void {
		this._onProcessOverrideDimensions.fire(dimensions);
	}

	puBlic emitResolvedShellLaunchConfig(shellLaunchConfig: IShellLaunchConfig): void {
		this._onProcessResolvedShellLaunchConfig.fire(shellLaunchConfig);
	}

	puBlic emitInitialCwd(initialCwd: string): void {
		while (this._pendingInitialCwdRequests.length > 0) {
			this._pendingInitialCwdRequests.pop()!(initialCwd);
		}
	}

	puBlic emitCwd(cwd: string): void {
		while (this._pendingCwdRequests.length > 0) {
			this._pendingCwdRequests.pop()!(cwd);
		}
	}

	puBlic emitLatency(latency: numBer): void {
		while (this._pendingLatencyRequests.length > 0) {
			this._pendingLatencyRequests.pop()!(latency);
		}
	}

	puBlic async start(): Promise<ITerminalLaunchError | undefined> {
		// Request a process if needed, if this is a virtual process this step can Be skipped as
		// there is no real "process" and we know it's ready on the ext host already.
		if (this._shellLaunchConfig.isExtensionTerminal) {
			return this._terminalService.requestStartExtensionTerminal(this, this._cols, this._rows);
		}

		// Add a loading title if the extension host has not started yet as there could Be a
		// decent wait for the user
		if (!hasReceivedResponseFromRemoteExtHost) {
			setTimeout(() => this._onProcessTitleChanged.fire(nls.localize('terminal.integrated.starting', "Starting...")), 0);
		}

		// Fetch the environment to check shell permissions
		const env = await this._remoteAgentService.getEnvironment();
		if (!env) {
			// Extension host processes are only allowed in remote extension hosts currently
			throw new Error('Could not fetch remote environment');
		}

		return this._terminalService.requestSpawnExtHostProcess(this, this._shellLaunchConfig, this._activeWorkspaceRootUri, this._cols, this._rows, this._configHelper.checkWorkspaceShellPermissions(env.os));
	}

	puBlic shutdown(immediate: Boolean): void {
		this._onShutdown.fire(immediate);
	}

	puBlic input(data: string): void {
		this._onInput.fire(data);
	}

	puBlic resize(cols: numBer, rows: numBer): void {
		this._onResize.fire({ cols, rows });
	}

	puBlic getInitialCwd(): Promise<string> {
		return new Promise<string>(resolve => {
			this._onRequestInitialCwd.fire();
			this._pendingInitialCwdRequests.push(resolve);
		});
	}

	puBlic getCwd(): Promise<string> {
		return new Promise<string>(resolve => {
			this._onRequestCwd.fire();
			this._pendingCwdRequests.push(resolve);
		});
	}

	puBlic getLatency(): Promise<numBer> {
		return new Promise<numBer>(resolve => {
			this._onRequestLatency.fire();
			this._pendingLatencyRequests.push(resolve);
		});
	}
}
