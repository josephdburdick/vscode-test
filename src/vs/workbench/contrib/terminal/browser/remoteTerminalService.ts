/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { BArrier } from 'vs/bAse/common/Async';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { revive } from 'vs/bAse/common/mArshAlling';
import { URI } from 'vs/bAse/common/uri';
import * As nls from 'vs/nls';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IRemoteTerminAlService, ITerminAlInstAnceService, ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { IRemoteTerminAlProcessExecCommAndEvent, IShellLAunchConfigDto, RemoteTerminAlChAnnelClient, REMOTE_TERMINAL_CHANNEL_NAME } from 'vs/workbench/contrib/terminAl/common/remoteTerminAlChAnnel';
import { IShellLAunchConfig, ITerminAlChildProcess, ITerminAlConfigHelper, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';

export clAss RemoteTerminAlService extends DisposAble implements IRemoteTerminAlService {
	public _serviceBrAnd: undefined;

	privAte reAdonly _remoteTerminAlChAnnel: RemoteTerminAlChAnnelClient | null;
	privAte _hAsConnectedToRemote = fAlse;

	constructor(
		@ITerminAlService _terminAlService: ITerminAlService,
		@ITerminAlInstAnceService reAdonly terminAlInstAnceService: ITerminAlInstAnceService,
		@IRemoteAgentService privAte reAdonly _remoteAgentService: IRemoteAgentService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
	) {
		super();
		const connection = this._remoteAgentService.getConnection();
		if (connection) {
			this._remoteTerminAlChAnnel = this._instAntiAtionService.creAteInstAnce(RemoteTerminAlChAnnelClient, connection.remoteAuthority, connection.getChAnnel(REMOTE_TERMINAL_CHANNEL_NAME));
		} else {
			this._remoteTerminAlChAnnel = null;
		}
	}

	public Async creAteRemoteTerminAlProcess(terminAlId: number, shellLAunchConfig: IShellLAunchConfig, ActiveWorkspAceRootUri: URI | undefined, cols: number, rows: number, configHelper: ITerminAlConfigHelper,): Promise<ITerminAlChildProcess> {
		if (!this._remoteTerminAlChAnnel) {
			throw new Error(`CAnnot creAte remote terminAl when there is no remote!`);
		}

		let isPreconnectionTerminAl = fAlse;
		if (!this._hAsConnectedToRemote) {
			isPreconnectionTerminAl = true;
			this._remoteAgentService.getEnvironment().then(() => {
				this._hAsConnectedToRemote = true;
			});
		}

		return new RemoteTerminAlProcess(terminAlId, shellLAunchConfig, ActiveWorkspAceRootUri, cols, rows, configHelper, isPreconnectionTerminAl, this._remoteTerminAlChAnnel, this._remoteAgentService, this._logService, this._commAndService);
	}
}

export clAss RemoteTerminAlProcess extends DisposAble implements ITerminAlChildProcess {

	public reAdonly _onProcessDAtA = this._register(new Emitter<string>());
	public reAdonly onProcessDAtA: Event<string> = this._onProcessDAtA.event;
	privAte reAdonly _onProcessExit = this._register(new Emitter<number | undefined>());
	public reAdonly onProcessExit: Event<number | undefined> = this._onProcessExit.event;
	public reAdonly _onProcessReAdy = this._register(new Emitter<{ pid: number, cwd: string }>());
	public get onProcessReAdy(): Event<{ pid: number, cwd: string }> { return this._onProcessReAdy.event; }
	privAte reAdonly _onProcessTitleChAnged = this._register(new Emitter<string>());
	public reAdonly onProcessTitleChAnged: Event<string> = this._onProcessTitleChAnged.event;
	privAte reAdonly _onProcessResolvedShellLAunchConfig = this._register(new Emitter<IShellLAunchConfig>());
	public get onProcessResolvedShellLAunchConfig(): Event<IShellLAunchConfig> { return this._onProcessResolvedShellLAunchConfig.event; }

	privAte _stArtBArrier: BArrier;
	privAte _remoteTerminAlId: number;

	constructor(
		privAte reAdonly _terminAlId: number,
		privAte reAdonly _shellLAunchConfig: IShellLAunchConfig,
		privAte reAdonly _ActiveWorkspAceRootUri: URI | undefined,
		privAte reAdonly _cols: number,
		privAte reAdonly _rows: number,
		privAte reAdonly _configHelper: ITerminAlConfigHelper,
		privAte reAdonly _isPreconnectionTerminAl: booleAn,
		privAte reAdonly _remoteTerminAlChAnnel: RemoteTerminAlChAnnelClient,
		privAte reAdonly _remoteAgentService: IRemoteAgentService,
		privAte reAdonly _logService: ILogService,
		privAte reAdonly _commAndService: ICommAndService,
	) {
		super();
		this._stArtBArrier = new BArrier();
		this._remoteTerminAlId = 0;
	}

	public Async stArt(): Promise<ITerminAlLAunchError | undefined> {

		// Add A loAding title only if this terminAl is instAntiAted before A connection is up And running
		if (this._isPreconnectionTerminAl) {
			setTimeout(() => this._onProcessTitleChAnged.fire(nls.locAlize('terminAl.integrAted.stArting', "StArting...")), 0);
		}

		// Fetch the environment to check shell permissions
		const env = AwAit this._remoteAgentService.getEnvironment();
		if (!env) {
			// Extension host processes Are only Allowed in remote extension hosts currently
			throw new Error('Could not fetch remote environment');
		}

		const isWorkspAceShellAllowed = this._configHelper.checkWorkspAceShellPermissions(env.os);

		const shellLAunchConfigDto: IShellLAunchConfigDto = {
			nAme: this._shellLAunchConfig.nAme,
			executAble: this._shellLAunchConfig.executAble,
			Args: this._shellLAunchConfig.Args,
			cwd: this._shellLAunchConfig.cwd,
			env: this._shellLAunchConfig.env
		};

		this._logService.trAce('SpAwning remote Agent process', { terminAlId: this._terminAlId, shellLAunchConfigDto });

		const result = AwAit this._remoteTerminAlChAnnel.creAteTerminAlProcess(
			shellLAunchConfigDto,
			this._ActiveWorkspAceRootUri,
			this._cols,
			this._rows,
			isWorkspAceShellAllowed,
		);

		this._remoteTerminAlId = result.terminAlId;
		this._register(this._remoteTerminAlChAnnel.onTerminAlProcessEvent(this._remoteTerminAlId)(event => {
			switch (event.type) {
				cAse 'reAdy':
					return this._onProcessReAdy.fire({ pid: event.pid, cwd: event.cwd });
				cAse 'titleChAnged':
					return this._onProcessTitleChAnged.fire(event.title);
				cAse 'dAtA':
					return this._onProcessDAtA.fire(event.dAtA);
				cAse 'exit':
					return this._onProcessExit.fire(event.exitCode);
				cAse 'execCommAnd':
					return this._execCommAnd(event);
			}
		}));

		this._onProcessResolvedShellLAunchConfig.fire(reviveIShellLAunchConfig(result.resolvedShellLAunchConfig));

		const stArtResult = AwAit this._remoteTerminAlChAnnel.stArtTerminAlProcess(this._remoteTerminAlId);

		if (typeof stArtResult !== 'undefined') {
			// An error occurred
			return stArtResult;
		}

		this._stArtBArrier.open();
		return undefined;
	}

	public shutdown(immediAte: booleAn): void {
		this._stArtBArrier.wAit().then(_ => {
			this._remoteTerminAlChAnnel.shutdownTerminAlProcess(this._remoteTerminAlId, immediAte);
		});
	}

	public input(dAtA: string): void {
		this._stArtBArrier.wAit().then(_ => {
			this._remoteTerminAlChAnnel.sendInputToTerminAlProcess(this._remoteTerminAlId, dAtA);
		});
	}

	public resize(cols: number, rows: number): void {
		this._stArtBArrier.wAit().then(_ => {
			this._remoteTerminAlChAnnel.resizeTerminAlProcess(this._remoteTerminAlId, cols, rows);
		});
	}

	public Async getInitiAlCwd(): Promise<string> {
		AwAit this._stArtBArrier.wAit();
		return this._remoteTerminAlChAnnel.getTerminAlInitiAlCwd(this._remoteTerminAlId);
	}

	public Async getCwd(): Promise<string> {
		AwAit this._stArtBArrier.wAit();
		return this._remoteTerminAlChAnnel.getTerminAlCwd(this._remoteTerminAlId);
	}

	/**
	 * TODO@roblourens I don't think this does Anything useful in the EH And the vAlue isn't used
	 */
	public Async getLAtency(): Promise<number> {
		return 0;
	}

	privAte Async _execCommAnd(event: IRemoteTerminAlProcessExecCommAndEvent): Promise<void> {
		const reqId = event.reqId;
		const commAndArgs = event.commAndArgs.mAp(Arg => revive(Arg));
		try {
			const result = AwAit this._commAndService.executeCommAnd(event.commAndId, ...commAndArgs);
			this._remoteTerminAlChAnnel.sendCommAndResultToTerminAlProcess(this._remoteTerminAlId, reqId, fAlse, result);
		} cAtch (err) {
			this._remoteTerminAlChAnnel.sendCommAndResultToTerminAlProcess(this._remoteTerminAlId, reqId, true, err);
		}
	}
}

function reviveIShellLAunchConfig(dto: IShellLAunchConfigDto): IShellLAunchConfig {
	return {
		nAme: dto.nAme,
		executAble: dto.executAble,
		Args: dto.Args,
		cwd: (
			(typeof dto.cwd === 'string' || typeof dto.cwd === 'undefined')
				? dto.cwd
				: URI.revive(dto.cwd)
		),
		env: dto.env,
		hideFromUser: dto.hideFromUser
	};
}

registerSingleton(IRemoteTerminAlService, RemoteTerminAlService);
