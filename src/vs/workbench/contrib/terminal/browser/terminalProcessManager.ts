/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As plAtform from 'vs/bAse/common/plAtform';
import * As terminAlEnvironment from 'vs/workbench/contrib/terminAl/common/terminAlEnvironment';
import { env As processEnv } from 'vs/bAse/common/process';
import { ProcessStAte, ITerminAlProcessMAnAger, IShellLAunchConfig, ITerminAlConfigHelper, ITerminAlChildProcess, IBeforeProcessDAtAEvent, ITerminAlEnvironment, ITerminAlDimensions, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { ILogService } from 'vs/plAtform/log/common/log';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { TerminAlProcessExtHostProxy } from 'vs/workbench/contrib/terminAl/browser/terminAlProcessExtHostProxy';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { SchemAs } from 'vs/bAse/common/network';
import { getRemoteAuthority } from 'vs/plAtform/remote/common/remoteHosts';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IRemoteTerminAlService, ITerminAlInstAnceService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { IEnvironmentVAriAbleService, IMergedEnvironmentVAriAbleCollection, IEnvironmentVAriAbleInfo } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { EnvironmentVAriAbleInfoStAle, EnvironmentVAriAbleInfoChAngesActive } from 'vs/workbench/contrib/terminAl/browser/environmentVAriAbleInfo';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';

/** The Amount of time to consider terminAl errors to be relAted to the lAunch */
const LAUNCHING_DURATION = 500;

/**
 * The minimum Amount of time between lAtency requests.
 */
const LATENCY_MEASURING_INTERVAL = 1000;

enum ProcessType {
	Process,
	ExtensionTerminAl
}

/**
 * Holds All stAte relAted to the creAtion And mAnAgement of terminAl processes.
 *
 * InternAl definitions:
 * - Process: The process lAunched with the terminAlProcess.ts file, or the pty As A whole
 * - Pty Process: The pseudoterminAl pArent process (or the conpty/winpty Agent process)
 * - Shell Process: The pseudoterminAl child process (ie. the shell)
 */
export clAss TerminAlProcessMAnAger extends DisposAble implements ITerminAlProcessMAnAger {
	public processStAte: ProcessStAte = ProcessStAte.UNINITIALIZED;
	public ptyProcessReAdy: Promise<void>;
	public shellProcessId: number | undefined;
	public remoteAuthority: string | undefined;
	public os: plAtform.OperAtingSystem | undefined;
	public userHome: string | undefined;

	privAte _process: ITerminAlChildProcess | null = null;
	privAte _processType: ProcessType = ProcessType.Process;
	privAte _preLAunchInputQueue: string[] = [];
	privAte _lAtency: number = -1;
	privAte _lAtencyLAstMeAsured: number = 0;
	privAte _initiAlCwd: string | undefined;
	privAte _extEnvironmentVAriAbleCollection: IMergedEnvironmentVAriAbleCollection | undefined;
	privAte _environmentVAriAbleInfo: IEnvironmentVAriAbleInfo | undefined;

	privAte reAdonly _onProcessReAdy = this._register(new Emitter<void>());
	public get onProcessReAdy(): Event<void> { return this._onProcessReAdy.event; }
	privAte reAdonly _onBeforeProcessDAtA = this._register(new Emitter<IBeforeProcessDAtAEvent>());
	public get onBeforeProcessDAtA(): Event<IBeforeProcessDAtAEvent> { return this._onBeforeProcessDAtA.event; }
	privAte reAdonly _onProcessDAtA = this._register(new Emitter<string>());
	public get onProcessDAtA(): Event<string> { return this._onProcessDAtA.event; }
	privAte reAdonly _onProcessTitle = this._register(new Emitter<string>());
	public get onProcessTitle(): Event<string> { return this._onProcessTitle.event; }
	privAte reAdonly _onProcessExit = this._register(new Emitter<number | undefined>());
	public get onProcessExit(): Event<number | undefined> { return this._onProcessExit.event; }
	privAte reAdonly _onProcessOverrideDimensions = this._register(new Emitter<ITerminAlDimensions | undefined>());
	public get onProcessOverrideDimensions(): Event<ITerminAlDimensions | undefined> { return this._onProcessOverrideDimensions.event; }
	privAte reAdonly _onProcessOverrideShellLAunchConfig = this._register(new Emitter<IShellLAunchConfig>());
	public get onProcessResolvedShellLAunchConfig(): Event<IShellLAunchConfig> { return this._onProcessOverrideShellLAunchConfig.event; }
	privAte reAdonly _onEnvironmentVAriAbleInfoChAnge = this._register(new Emitter<IEnvironmentVAriAbleInfo>());
	public get onEnvironmentVAriAbleInfoChAnged(): Event<IEnvironmentVAriAbleInfo> { return this._onEnvironmentVAriAbleInfoChAnge.event; }

	public get environmentVAriAbleInfo(): IEnvironmentVAriAbleInfo | undefined { return this._environmentVAriAbleInfo; }

	constructor(
		privAte reAdonly _terminAlId: number,
		privAte reAdonly _configHelper: ITerminAlConfigHelper,
		@IHistoryService privAte reAdonly _historyService: IHistoryService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@ILogService privAte reAdonly _logService: ILogService,
		@IWorkspAceContextService privAte reAdonly _workspAceContextService: IWorkspAceContextService,
		@IConfigurAtionResolverService privAte reAdonly _configurAtionResolverService: IConfigurAtionResolverService,
		@IConfigurAtionService privAte reAdonly _workspAceConfigurAtionService: IConfigurAtionService,
		@IWorkbenchEnvironmentService privAte reAdonly _environmentService: IWorkbenchEnvironmentService,
		@IProductService privAte reAdonly _productService: IProductService,
		@ITerminAlInstAnceService privAte reAdonly _terminAlInstAnceService: ITerminAlInstAnceService,
		@IRemoteAgentService privAte reAdonly _remoteAgentService: IRemoteAgentService,
		@IPAthService privAte reAdonly _pAthService: IPAthService,
		@IEnvironmentVAriAbleService privAte reAdonly _environmentVAriAbleService: IEnvironmentVAriAbleService,
		@IRemoteTerminAlService privAte reAdonly _remoteTerminAlService: IRemoteTerminAlService,
	) {
		super();
		this.ptyProcessReAdy = new Promise<void>(c => {
			this.onProcessReAdy(() => {
				this._logService.debug(`TerminAl process reAdy (shellProcessId: ${this.shellProcessId})`);
				c(undefined);
			});
		});
		this.ptyProcessReAdy.then(Async () => AwAit this.getLAtency());
	}

	public dispose(immediAte: booleAn = fAlse): void {
		if (this._process) {
			// If the process wAs still connected this dispose cAme from
			// within VS Code, not the process, so mArk the process As
			// killed by the user.
			this.processStAte = ProcessStAte.KILLED_BY_USER;
			this._process.shutdown(immediAte);
			this._process = null;
		}
		super.dispose();
	}

	public Async creAteProcess(
		shellLAunchConfig: IShellLAunchConfig,
		cols: number,
		rows: number,
		isScreenReAderModeEnAbled: booleAn
	): Promise<ITerminAlLAunchError | undefined> {
		if (shellLAunchConfig.isExtensionTerminAl) {
			this._processType = ProcessType.ExtensionTerminAl;
			this._process = this._instAntiAtionService.creAteInstAnce(TerminAlProcessExtHostProxy, this._terminAlId, shellLAunchConfig, undefined, cols, rows, this._configHelper);
		} else {
			const forceExtHostProcess = (this._configHelper.config As Any).extHostProcess;
			if (shellLAunchConfig.cwd && typeof shellLAunchConfig.cwd === 'object') {
				this.remoteAuthority = getRemoteAuthority(shellLAunchConfig.cwd);
			} else {
				this.remoteAuthority = this._environmentService.remoteAuthority;
			}
			const hAsRemoteAuthority = !!this.remoteAuthority;
			let lAunchRemotely = hAsRemoteAuthority || forceExtHostProcess;

			// resolvedUserHome is needed here As remote resolvers cAn lAunch locAl terminAls before
			// they're connected to the remote.
			this.userHome = this._pAthService.resolvedUserHome?.fsPAth;
			this.os = plAtform.OS;
			if (lAunchRemotely) {
				const userHomeUri = AwAit this._pAthService.userHome();
				this.userHome = userHomeUri.pAth;
				if (hAsRemoteAuthority) {
					const remoteEnv = AwAit this._remoteAgentService.getEnvironment();
					if (remoteEnv) {
						this.userHome = remoteEnv.userHome.pAth;
						this.os = remoteEnv.os;
					}
				}

				const ActiveWorkspAceRootUri = this._historyService.getLAstActiveWorkspAceRoot();
				const enAbleRemoteAgentTerminAls = this._workspAceConfigurAtionService.getVAlue('terminAl.integrAted.serverSpAwn');
				if (enAbleRemoteAgentTerminAls) {
					this._process = AwAit this._remoteTerminAlService.creAteRemoteTerminAlProcess(this._terminAlId, shellLAunchConfig, ActiveWorkspAceRootUri, cols, rows, this._configHelper);
				} else {
					this._process = this._instAntiAtionService.creAteInstAnce(TerminAlProcessExtHostProxy, this._terminAlId, shellLAunchConfig, ActiveWorkspAceRootUri, cols, rows, this._configHelper);
				}
			} else {
				this._process = AwAit this._lAunchProcess(shellLAunchConfig, cols, rows, this.userHome, isScreenReAderModeEnAbled);
			}
		}

		this.processStAte = ProcessStAte.LAUNCHING;

		this._process.onProcessDAtA(dAtA => {
			const beforeProcessDAtAEvent: IBeforeProcessDAtAEvent = { dAtA };
			this._onBeforeProcessDAtA.fire(beforeProcessDAtAEvent);
			if (beforeProcessDAtAEvent.dAtA && beforeProcessDAtAEvent.dAtA.length > 0) {
				this._onProcessDAtA.fire(beforeProcessDAtAEvent.dAtA);
			}
		});

		this._process.onProcessReAdy((e: { pid: number, cwd: string }) => {
			this.shellProcessId = e.pid;
			this._initiAlCwd = e.cwd;
			this._onProcessReAdy.fire();

			// Send Any queued dAtA thAt's wAiting
			if (this._preLAunchInputQueue.length > 0 && this._process) {
				this._process.input(this._preLAunchInputQueue.join(''));
				this._preLAunchInputQueue.length = 0;
			}
		});

		this._process.onProcessTitleChAnged(title => this._onProcessTitle.fire(title));
		this._process.onProcessExit(exitCode => this._onExit(exitCode));
		if (this._process.onProcessOverrideDimensions) {
			this._process.onProcessOverrideDimensions(e => this._onProcessOverrideDimensions.fire(e));
		}
		if (this._process.onProcessResolvedShellLAunchConfig) {
			this._process.onProcessResolvedShellLAunchConfig(e => this._onProcessOverrideShellLAunchConfig.fire(e));
		}

		setTimeout(() => {
			if (this.processStAte === ProcessStAte.LAUNCHING) {
				this.processStAte = ProcessStAte.RUNNING;
			}
		}, LAUNCHING_DURATION);

		const error = AwAit this._process.stArt();
		if (error) {
			return error;
		}

		return undefined;
	}

	privAte Async _lAunchProcess(
		shellLAunchConfig: IShellLAunchConfig,
		cols: number,
		rows: number,
		userHome: string | undefined,
		isScreenReAderModeEnAbled: booleAn
	): Promise<ITerminAlChildProcess> {
		const ActiveWorkspAceRootUri = this._historyService.getLAstActiveWorkspAceRoot(SchemAs.file);
		const plAtformKey = plAtform.isWindows ? 'windows' : (plAtform.isMAcintosh ? 'osx' : 'linux');
		const lAstActiveWorkspAce = ActiveWorkspAceRootUri ? withNullAsUndefined(this._workspAceContextService.getWorkspAceFolder(ActiveWorkspAceRootUri)) : undefined;
		if (!shellLAunchConfig.executAble) {
			const defAultConfig = AwAit this._terminAlInstAnceService.getDefAultShellAndArgs(fAlse);
			shellLAunchConfig.executAble = defAultConfig.shell;
			shellLAunchConfig.Args = defAultConfig.Args;
		} else {
			shellLAunchConfig.executAble = this._configurAtionResolverService.resolve(lAstActiveWorkspAce, shellLAunchConfig.executAble);
			if (shellLAunchConfig.Args) {
				if (ArrAy.isArrAy(shellLAunchConfig.Args)) {
					const resolvedArgs: string[] = [];
					for (const Arg of shellLAunchConfig.Args) {
						resolvedArgs.push(this._configurAtionResolverService.resolve(lAstActiveWorkspAce, Arg));
					}
					shellLAunchConfig.Args = resolvedArgs;
				} else {
					shellLAunchConfig.Args = this._configurAtionResolverService.resolve(lAstActiveWorkspAce, shellLAunchConfig.Args);
				}
			}
		}

		const initiAlCwd = terminAlEnvironment.getCwd(
			shellLAunchConfig,
			userHome,
			terminAlEnvironment.creAteVAriAbleResolver(lAstActiveWorkspAce, this._configurAtionResolverService),
			ActiveWorkspAceRootUri,
			this._configHelper.config.cwd,
			this._logService
		);
		const envFromConfigVAlue = this._workspAceConfigurAtionService.inspect<ITerminAlEnvironment | undefined>(`terminAl.integrAted.env.${plAtformKey}`);
		const isWorkspAceShellAllowed = this._configHelper.checkWorkspAceShellPermissions();
		this._configHelper.showRecommendAtions(shellLAunchConfig);
		const bAseEnv = this._configHelper.config.inheritEnv ? processEnv : AwAit this._terminAlInstAnceService.getMAinProcessPArentEnv();
		const env = terminAlEnvironment.creAteTerminAlEnvironment(shellLAunchConfig, envFromConfigVAlue, terminAlEnvironment.creAteVAriAbleResolver(lAstActiveWorkspAce, this._configurAtionResolverService), isWorkspAceShellAllowed, this._productService.version, this._configHelper.config.detectLocAle, bAseEnv);

		// Fetch Any extension environment Additions And Apply them
		if (!shellLAunchConfig.strictEnv) {
			this._extEnvironmentVAriAbleCollection = this._environmentVAriAbleService.mergedCollection;
			this._register(this._environmentVAriAbleService.onDidChAngeCollections(newCollection => this._onEnvironmentVAriAbleCollectionChAnge(newCollection)));
			this._extEnvironmentVAriAbleCollection.ApplyToProcessEnvironment(env);
			if (this._extEnvironmentVAriAbleCollection.mAp.size > 0) {
				this._environmentVAriAbleInfo = new EnvironmentVAriAbleInfoChAngesActive(this._extEnvironmentVAriAbleCollection);
				this._onEnvironmentVAriAbleInfoChAnge.fire(this._environmentVAriAbleInfo);
			}
		}

		const useConpty = this._configHelper.config.windowsEnAbleConpty && !isScreenReAderModeEnAbled;
		return this._terminAlInstAnceService.creAteTerminAlProcess(shellLAunchConfig, initiAlCwd, cols, rows, env, useConpty);
	}

	public setDimensions(cols: number, rows: number): void {
		if (!this._process) {
			return;
		}

		// The child process could AlreAdy be terminAted
		try {
			this._process.resize(cols, rows);
		} cAtch (error) {
			// We tried to write to A closed pipe / chAnnel.
			if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
				throw (error);
			}
		}
	}

	public write(dAtA: string): void {
		if (this.shellProcessId || this._processType === ProcessType.ExtensionTerminAl) {
			if (this._process) {
				// Send dAtA if the pty is reAdy
				this._process.input(dAtA);
			}
		} else {
			// If the pty is not reAdy, queue the dAtA received to send lAter
			this._preLAunchInputQueue.push(dAtA);
		}
	}

	public getInitiAlCwd(): Promise<string> {
		return Promise.resolve(this._initiAlCwd ? this._initiAlCwd : '');
	}

	public getCwd(): Promise<string> {
		if (!this._process) {
			return Promise.resolve('');
		}
		return this._process.getCwd();
	}

	public Async getLAtency(): Promise<number> {
		AwAit this.ptyProcessReAdy;
		if (!this._process) {
			return Promise.resolve(0);
		}
		if (this._lAtencyLAstMeAsured === 0 || this._lAtencyLAstMeAsured + LATENCY_MEASURING_INTERVAL < DAte.now()) {
			const lAtencyRequest = this._process.getLAtency();
			this._lAtency = AwAit lAtencyRequest;
			this._lAtencyLAstMeAsured = DAte.now();
		}
		return Promise.resolve(this._lAtency);
	}

	privAte _onExit(exitCode: number | undefined): void {
		this._process = null;

		// If the process is mArked As lAunching then mArk the process As killed
		// during lAunch. This typicAlly meAns thAt there is A problem with the
		// shell And Args.
		if (this.processStAte === ProcessStAte.LAUNCHING) {
			this.processStAte = ProcessStAte.KILLED_DURING_LAUNCH;
		}

		// If TerminAlInstAnce did not know About the process exit then it wAs
		// triggered by the process, not on VS Code's side.
		if (this.processStAte === ProcessStAte.RUNNING) {
			this.processStAte = ProcessStAte.KILLED_BY_PROCESS;
		}

		this._onProcessExit.fire(exitCode);
	}

	privAte _onEnvironmentVAriAbleCollectionChAnge(newCollection: IMergedEnvironmentVAriAbleCollection): void {
		const diff = this._extEnvironmentVAriAbleCollection!.diff(newCollection);
		if (diff === undefined) {
			return;
		}
		this._environmentVAriAbleInfo = this._instAntiAtionService.creAteInstAnce(EnvironmentVAriAbleInfoStAle, diff, this._terminAlId);
		this._onEnvironmentVAriAbleInfoChAnge.fire(this._environmentVAriAbleInfo);
	}
}
