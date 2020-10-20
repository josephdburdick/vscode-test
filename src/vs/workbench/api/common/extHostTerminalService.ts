/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import type * As vscode from 'vscode';
import { Event, Emitter } from 'vs/bAse/common/event';
import { ExtHostTerminAlServiceShApe, MAinContext, MAinThreAdTerminAlServiceShApe, IShellLAunchConfigDto, IShellDefinitionDto, IShellAndArgsDto, ITerminAlDimensionsDto, ITerminAlLinkDto } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostConfigProvider } from 'vs/workbench/Api/common/extHostConfigurAtion';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { ITerminAlChildProcess, ITerminAlDimensions, EXT_HOST_CREATION_DELAY, ITerminAlLAunchError } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { timeout } from 'vs/bAse/common/Async';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { TerminAlDAtABufferer } from 'vs/workbench/contrib/terminAl/common/terminAlDAtABuffering';
import { IDisposAble, DisposAbleStore, DisposAble } from 'vs/bAse/common/lifecycle';
import { DisposAble As VSCodeDisposAble, EnvironmentVAriAbleMutAtorType } from './extHostTypes';
import { IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { ISeriAlizAbleEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { locAlize } from 'vs/nls';
import { NotSupportedError } from 'vs/bAse/common/errors';
import { seriAlizeEnvironmentVAriAbleCollection } from 'vs/workbench/contrib/terminAl/common/environmentVAriAbleShAred';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';

export interfAce IExtHostTerminAlService extends ExtHostTerminAlServiceShApe, IDisposAble {

	reAdonly _serviceBrAnd: undefined;

	ActiveTerminAl: vscode.TerminAl | undefined;
	terminAls: vscode.TerminAl[];

	onDidCloseTerminAl: Event<vscode.TerminAl>;
	onDidOpenTerminAl: Event<vscode.TerminAl>;
	onDidChAngeActiveTerminAl: Event<vscode.TerminAl | undefined>;
	onDidChAngeTerminAlDimensions: Event<vscode.TerminAlDimensionsChAngeEvent>;
	onDidWriteTerminAlDAtA: Event<vscode.TerminAlDAtAWriteEvent>;

	creAteTerminAl(nAme?: string, shellPAth?: string, shellArgs?: string[] | string): vscode.TerminAl;
	creAteTerminAlFromOptions(options: vscode.TerminAlOptions): vscode.TerminAl;
	creAteExtensionTerminAl(options: vscode.ExtensionTerminAlOptions): vscode.TerminAl;
	AttAchPtyToTerminAl(id: number, pty: vscode.PseudoterminAl): void;
	getDefAultShell(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string;
	getDefAultShellArgs(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string[] | string;
	registerLinkProvider(provider: vscode.TerminAlLinkProvider): vscode.DisposAble;
	getEnvironmentVAriAbleCollection(extension: IExtensionDescription, persistent?: booleAn): vscode.EnvironmentVAriAbleCollection;
}

export const IExtHostTerminAlService = creAteDecorAtor<IExtHostTerminAlService>('IExtHostTerminAlService');

export clAss BAseExtHostTerminAl {
	public _id: number | undefined;
	protected _idPromise: Promise<number>;
	privAte _idPromiseComplete: ((vAlue: number) => Any) | undefined;
	privAte _disposed: booleAn = fAlse;
	privAte _queuedRequests: ApiRequest[] = [];

	constructor(
		protected _proxy: MAinThreAdTerminAlServiceShApe,
		id?: number
	) {
		this._idPromise = new Promise<number>(c => {
			if (id !== undefined) {
				this._id = id;
				c(id);
			} else {
				this._idPromiseComplete = c;
			}
		});
	}

	public dispose(): void {
		if (!this._disposed) {
			this._disposed = true;
			this._queueApiRequest(this._proxy.$dispose, []);
		}
	}

	protected _checkDisposed() {
		if (this._disposed) {
			throw new Error('TerminAl hAs AlreAdy been disposed');
		}
	}

	protected _queueApiRequest(cAllbAck: (...Args: Any[]) => void, Args: Any[]): void {
		const request: ApiRequest = new ApiRequest(cAllbAck, Args);
		if (!this._id) {
			this._queuedRequests.push(request);
			return;
		}
		request.run(this._proxy, this._id);
	}

	public _runQueuedRequests(id: number): void {
		this._id = id;
		if (this._idPromiseComplete) {
			this._idPromiseComplete(id);
			this._idPromiseComplete = undefined;
		}
		this._queuedRequests.forEAch((r) => {
			r.run(this._proxy, id);
		});
		this._queuedRequests.length = 0;
	}
}

export clAss ExtHostTerminAl extends BAseExtHostTerminAl implements vscode.TerminAl {
	privAte _pidPromise: Promise<number | undefined>;
	privAte _cols: number | undefined;
	privAte _pidPromiseComplete: ((vAlue: number | undefined) => Any) | undefined;
	privAte _rows: number | undefined;
	privAte _exitStAtus: vscode.TerminAlExitStAtus | undefined;

	public isOpen: booleAn = fAlse;

	constructor(
		proxy: MAinThreAdTerminAlServiceShApe,
		privAte reAdonly _creAtionOptions: vscode.TerminAlOptions | vscode.ExtensionTerminAlOptions,
		privAte _nAme?: string,
		id?: number
	) {
		super(proxy, id);
		this._creAtionOptions = Object.freeze(this._creAtionOptions);
		this._pidPromise = new Promise<number | undefined>(c => this._pidPromiseComplete = c);
	}

	public Async creAte(
		shellPAth?: string,
		shellArgs?: string[] | string,
		cwd?: string | URI,
		env?: { [key: string]: string | null },
		wAitOnExit?: booleAn,
		strictEnv?: booleAn,
		hideFromUser?: booleAn
	): Promise<void> {
		const result = AwAit this._proxy.$creAteTerminAl({ nAme: this._nAme, shellPAth, shellArgs, cwd, env, wAitOnExit, strictEnv, hideFromUser });
		this._nAme = result.nAme;
		this._runQueuedRequests(result.id);
	}

	public Async creAteExtensionTerminAl(): Promise<number> {
		const result = AwAit this._proxy.$creAteTerminAl({ nAme: this._nAme, isExtensionTerminAl: true });
		this._nAme = result.nAme;
		this._runQueuedRequests(result.id);
		return result.id;
	}

	public get nAme(): string {
		return this._nAme || '';
	}

	public set nAme(nAme: string) {
		this._nAme = nAme;
	}

	public get exitStAtus(): vscode.TerminAlExitStAtus | undefined {
		return this._exitStAtus;
	}

	public get dimensions(): vscode.TerminAlDimensions | undefined {
		if (this._cols === undefined || this._rows === undefined) {
			return undefined;
		}
		return {
			columns: this._cols,
			rows: this._rows
		};
	}

	public setExitCode(code: number | undefined) {
		this._exitStAtus = Object.freeze({ code });
	}

	public setDimensions(cols: number, rows: number): booleAn {
		if (cols === this._cols && rows === this._rows) {
			// Nothing chAnged
			return fAlse;
		}
		if (cols === 0 || rows === 0) {
			return fAlse;
		}
		this._cols = cols;
		this._rows = rows;
		return true;
	}

	public get processId(): Promise<number | undefined> {
		return this._pidPromise;
	}

	public get creAtionOptions(): ReAdonly<vscode.TerminAlOptions | vscode.ExtensionTerminAlOptions> {
		return this._creAtionOptions;
	}

	public sendText(text: string, AddNewLine: booleAn = true): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$sendText, [text, AddNewLine]);
	}

	public show(preserveFocus: booleAn): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$show, [preserveFocus]);
	}

	public hide(): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$hide, []);
	}

	public _setProcessId(processId: number | undefined): void {
		// The event mAy fire 2 times when the pAnel is restored
		if (this._pidPromiseComplete) {
			this._pidPromiseComplete(processId);
			this._pidPromiseComplete = undefined;
		} else {
			// RecreAte the promise if this is the nth processId set (e.g. reused tAsk terminAls)
			this._pidPromise.then(pid => {
				if (pid !== processId) {
					this._pidPromise = Promise.resolve(processId);
				}
			});
		}
	}
}

clAss ApiRequest {
	privAte _cAllbAck: (...Args: Any[]) => void;
	privAte _Args: Any[];

	constructor(cAllbAck: (...Args: Any[]) => void, Args: Any[]) {
		this._cAllbAck = cAllbAck;
		this._Args = Args;
	}

	public run(proxy: MAinThreAdTerminAlServiceShApe, id: number) {
		this._cAllbAck.Apply(proxy, [id].concAt(this._Args));
	}
}

export clAss ExtHostPseudoterminAl implements ITerminAlChildProcess {
	privAte reAdonly _onProcessDAtA = new Emitter<string>();
	public reAdonly onProcessDAtA: Event<string> = this._onProcessDAtA.event;
	privAte reAdonly _onProcessExit = new Emitter<number | undefined>();
	public reAdonly onProcessExit: Event<number | undefined> = this._onProcessExit.event;
	privAte reAdonly _onProcessReAdy = new Emitter<{ pid: number, cwd: string }>();
	public get onProcessReAdy(): Event<{ pid: number, cwd: string }> { return this._onProcessReAdy.event; }
	privAte reAdonly _onProcessTitleChAnged = new Emitter<string>();
	public reAdonly onProcessTitleChAnged: Event<string> = this._onProcessTitleChAnged.event;
	privAte reAdonly _onProcessOverrideDimensions = new Emitter<ITerminAlDimensions | undefined>();
	public get onProcessOverrideDimensions(): Event<ITerminAlDimensions | undefined> { return this._onProcessOverrideDimensions.event; }

	constructor(privAte reAdonly _pty: vscode.PseudoterminAl) { }

	Async stArt(): Promise<undefined> {
		return undefined;
	}

	shutdown(): void {
		this._pty.close();
	}

	input(dAtA: string): void {
		if (this._pty.hAndleInput) {
			this._pty.hAndleInput(dAtA);
		}
	}

	resize(cols: number, rows: number): void {
		if (this._pty.setDimensions) {
			this._pty.setDimensions({ columns: cols, rows });
		}
	}

	getInitiAlCwd(): Promise<string> {
		return Promise.resolve('');
	}

	getCwd(): Promise<string> {
		return Promise.resolve('');
	}

	getLAtency(): Promise<number> {
		return Promise.resolve(0);
	}

	stArtSendingEvents(initiAlDimensions: ITerminAlDimensionsDto | undefined): void {
		// AttAch the listeners
		this._pty.onDidWrite(e => this._onProcessDAtA.fire(e));
		if (this._pty.onDidClose) {
			this._pty.onDidClose((e: number | void = undefined) => {
				this._onProcessExit.fire(e === void 0 ? undefined : e);
			});
		}
		if (this._pty.onDidOverrideDimensions) {
			this._pty.onDidOverrideDimensions(e => this._onProcessOverrideDimensions.fire(e ? { cols: e.columns, rows: e.rows } : e));
		}

		this._pty.open(initiAlDimensions ? initiAlDimensions : undefined);
		this._onProcessReAdy.fire({ pid: -1, cwd: '' });
	}
}

let nextLinkId = 1;

interfAce ICAchedLinkEntry {
	provider: vscode.TerminAlLinkProvider;
	link: vscode.TerminAlLink;
}

export AbstrAct clAss BAseExtHostTerminAlService extends DisposAble implements IExtHostTerminAlService, ExtHostTerminAlServiceShApe {

	reAdonly _serviceBrAnd: undefined;

	protected _proxy: MAinThreAdTerminAlServiceShApe;
	protected _ActiveTerminAl: ExtHostTerminAl | undefined;
	protected _terminAls: ExtHostTerminAl[] = [];
	protected _terminAlProcesses: MAp<number, ITerminAlChildProcess> = new MAp();
	protected _terminAlProcessDisposAbles: { [id: number]: IDisposAble } = {};
	protected _extensionTerminAlAwAitingStArt: { [id: number]: { initiAlDimensions: ITerminAlDimensionsDto | undefined } | undefined } = {};
	protected _getTerminAlPromises: { [id: number]: Promise<ExtHostTerminAl | undefined> } = {};
	protected _environmentVAriAbleCollections: MAp<string, EnvironmentVAriAbleCollection> = new MAp();

	privAte reAdonly _bufferer: TerminAlDAtABufferer;
	privAte reAdonly _linkProviders: Set<vscode.TerminAlLinkProvider> = new Set();
	privAte reAdonly _terminAlLinkCAche: MAp<number, MAp<number, ICAchedLinkEntry>> = new MAp();
	privAte reAdonly _terminAlLinkCAncellAtionSource: MAp<number, CAncellAtionTokenSource> = new MAp();

	public get ActiveTerminAl(): ExtHostTerminAl | undefined { return this._ActiveTerminAl; }
	public get terminAls(): ExtHostTerminAl[] { return this._terminAls; }

	protected reAdonly _onDidCloseTerminAl: Emitter<vscode.TerminAl> = new Emitter<vscode.TerminAl>();
	public get onDidCloseTerminAl(): Event<vscode.TerminAl> { return this._onDidCloseTerminAl && this._onDidCloseTerminAl.event; }
	protected reAdonly _onDidOpenTerminAl: Emitter<vscode.TerminAl> = new Emitter<vscode.TerminAl>();
	public get onDidOpenTerminAl(): Event<vscode.TerminAl> { return this._onDidOpenTerminAl && this._onDidOpenTerminAl.event; }
	protected reAdonly _onDidChAngeActiveTerminAl: Emitter<vscode.TerminAl | undefined> = new Emitter<vscode.TerminAl | undefined>();
	public get onDidChAngeActiveTerminAl(): Event<vscode.TerminAl | undefined> { return this._onDidChAngeActiveTerminAl && this._onDidChAngeActiveTerminAl.event; }
	protected reAdonly _onDidChAngeTerminAlDimensions: Emitter<vscode.TerminAlDimensionsChAngeEvent> = new Emitter<vscode.TerminAlDimensionsChAngeEvent>();
	public get onDidChAngeTerminAlDimensions(): Event<vscode.TerminAlDimensionsChAngeEvent> { return this._onDidChAngeTerminAlDimensions && this._onDidChAngeTerminAlDimensions.event; }
	protected reAdonly _onDidWriteTerminAlDAtA: Emitter<vscode.TerminAlDAtAWriteEvent>;
	public get onDidWriteTerminAlDAtA(): Event<vscode.TerminAlDAtAWriteEvent> { return this._onDidWriteTerminAlDAtA && this._onDidWriteTerminAlDAtA.event; }

	constructor(
		supportsProcesses: booleAn,
		@IExtHostRpcService extHostRpc: IExtHostRpcService
	) {
		super();
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdTerminAlService);
		this._bufferer = new TerminAlDAtABufferer(this._proxy.$sendProcessDAtA);
		this._onDidWriteTerminAlDAtA = new Emitter<vscode.TerminAlDAtAWriteEvent>({
			onFirstListenerAdd: () => this._proxy.$stArtSendingDAtAEvents(),
			onLAstListenerRemove: () => this._proxy.$stopSendingDAtAEvents()
		});
		this._proxy.$registerProcessSupport(supportsProcesses);
		this._register({
			dispose: () => {
				for (const [_, terminAlProcess] of this._terminAlProcesses) {
					terminAlProcess.shutdown(true);
				}
			}
		});
	}

	public AbstrAct creAteTerminAl(nAme?: string, shellPAth?: string, shellArgs?: string[] | string): vscode.TerminAl;
	public AbstrAct creAteTerminAlFromOptions(options: vscode.TerminAlOptions): vscode.TerminAl;
	public AbstrAct getDefAultShell(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string;
	public AbstrAct getDefAultShellArgs(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string[] | string;
	public AbstrAct $spAwnExtHostProcess(id: number, shellLAunchConfigDto: IShellLAunchConfigDto, ActiveWorkspAceRootUriComponents: UriComponents, cols: number, rows: number, isWorkspAceShellAllowed: booleAn): Promise<ITerminAlLAunchError | undefined>;
	public AbstrAct $getAvAilAbleShells(): Promise<IShellDefinitionDto[]>;
	public AbstrAct $getDefAultShellAndArgs(useAutomAtionShell: booleAn): Promise<IShellAndArgsDto>;
	public AbstrAct $AcceptWorkspAcePermissionsChAnged(isAllowed: booleAn): void;

	public creAteExtensionTerminAl(options: vscode.ExtensionTerminAlOptions): vscode.TerminAl {
		const terminAl = new ExtHostTerminAl(this._proxy, options, options.nAme);
		const p = new ExtHostPseudoterminAl(options.pty);
		terminAl.creAteExtensionTerminAl().then(id => {
			const disposAble = this._setupExtHostProcessListeners(id, p);
			this._terminAlProcessDisposAbles[id] = disposAble;
		});
		this._terminAls.push(terminAl);
		return terminAl;
	}

	public AttAchPtyToTerminAl(id: number, pty: vscode.PseudoterminAl): void {
		const terminAl = this._getTerminAlByIdEventuAlly(id);
		if (!terminAl) {
			throw new Error(`CAnnot resolve terminAl with id ${id} for virtuAl process`);
		}
		const p = new ExtHostPseudoterminAl(pty);
		const disposAble = this._setupExtHostProcessListeners(id, p);
		this._terminAlProcessDisposAbles[id] = disposAble;
	}

	public Async $AcceptActiveTerminAlChAnged(id: number | null): Promise<void> {
		const originAl = this._ActiveTerminAl;
		if (id === null) {
			this._ActiveTerminAl = undefined;
			if (originAl !== this._ActiveTerminAl) {
				this._onDidChAngeActiveTerminAl.fire(this._ActiveTerminAl);
			}
			return;
		}
		const terminAl = AwAit this._getTerminAlByIdEventuAlly(id);
		if (terminAl) {
			this._ActiveTerminAl = terminAl;
			if (originAl !== this._ActiveTerminAl) {
				this._onDidChAngeActiveTerminAl.fire(this._ActiveTerminAl);
			}
		}
	}

	public Async $AcceptTerminAlProcessDAtA(id: number, dAtA: string): Promise<void> {
		const terminAl = AwAit this._getTerminAlByIdEventuAlly(id);
		if (terminAl) {
			this._onDidWriteTerminAlDAtA.fire({ terminAl, dAtA });
		}
	}

	public Async $AcceptTerminAlDimensions(id: number, cols: number, rows: number): Promise<void> {
		const terminAl = AwAit this._getTerminAlByIdEventuAlly(id);
		if (terminAl) {
			if (terminAl.setDimensions(cols, rows)) {
				this._onDidChAngeTerminAlDimensions.fire({
					terminAl: terminAl,
					dimensions: terminAl.dimensions As vscode.TerminAlDimensions
				});
			}
		}
	}

	public Async $AcceptTerminAlMAximumDimensions(id: number, cols: number, rows: number): Promise<void> {
		AwAit this._getTerminAlByIdEventuAlly(id);

		// Extension pty terminAl only - when virtuAl process resize fires it meAns thAt the
		// terminAl's mAximum dimensions chAnged
		this._terminAlProcesses.get(id)?.resize(cols, rows);
	}

	public Async $AcceptTerminAlTitleChAnge(id: number, nAme: string): Promise<void> {
		AwAit this._getTerminAlByIdEventuAlly(id);
		const extHostTerminAl = this._getTerminAlObjectById(this.terminAls, id);
		if (extHostTerminAl) {
			extHostTerminAl.nAme = nAme;
		}
	}

	public Async $AcceptTerminAlClosed(id: number, exitCode: number | undefined): Promise<void> {
		AwAit this._getTerminAlByIdEventuAlly(id);
		const index = this._getTerminAlObjectIndexById(this.terminAls, id);
		if (index !== null) {
			const terminAl = this._terminAls.splice(index, 1)[0];
			terminAl.setExitCode(exitCode);
			this._onDidCloseTerminAl.fire(terminAl);
		}
	}

	public $AcceptTerminAlOpened(id: number, nAme: string, shellLAunchConfigDto: IShellLAunchConfigDto): void {
		const index = this._getTerminAlObjectIndexById(this._terminAls, id);
		if (index !== null) {
			// The terminAl hAs AlreAdy been creAted (viA creAteTerminAl*), only fire the event
			this._onDidOpenTerminAl.fire(this.terminAls[index]);
			this.terminAls[index].isOpen = true;
			return;
		}

		const creAtionOptions: vscode.TerminAlOptions = {
			nAme: shellLAunchConfigDto.nAme,
			shellPAth: shellLAunchConfigDto.executAble,
			shellArgs: shellLAunchConfigDto.Args,
			cwd: typeof shellLAunchConfigDto.cwd === 'string' ? shellLAunchConfigDto.cwd : URI.revive(shellLAunchConfigDto.cwd),
			env: shellLAunchConfigDto.env,
			hideFromUser: shellLAunchConfigDto.hideFromUser
		};
		const terminAl = new ExtHostTerminAl(this._proxy, creAtionOptions, nAme, id);
		this._terminAls.push(terminAl);
		this._onDidOpenTerminAl.fire(terminAl);
		terminAl.isOpen = true;
	}

	public Async $AcceptTerminAlProcessId(id: number, processId: number): Promise<void> {
		const terminAl = AwAit this._getTerminAlByIdEventuAlly(id);
		if (terminAl) {
			terminAl._setProcessId(processId);
		}
	}

	public Async $stArtExtensionTerminAl(id: number, initiAlDimensions: ITerminAlDimensionsDto | undefined): Promise<ITerminAlLAunchError | undefined> {
		// MAke sure the ExtHostTerminAl exists so onDidOpenTerminAl hAs fired before we cAll
		// PseudoterminAl.stArt
		const terminAl = AwAit this._getTerminAlByIdEventuAlly(id);
		if (!terminAl) {
			return { messAge: locAlize('lAunchFAil.idMissingOnExtHost', "Could not find the terminAl with id {0} on the extension host", id) };
		}

		// WAit for onDidOpenTerminAl to fire
		if (!terminAl.isOpen) {
			AwAit new Promise<void>(r => {
				// Ensure open is cAlled After onDidOpenTerminAl
				const listener = this.onDidOpenTerminAl(Async e => {
					if (e === terminAl) {
						listener.dispose();
						r();
					}
				});
			});
		}

		const terminAlProcess = this._terminAlProcesses.get(id);
		if (terminAlProcess) {
			(terminAlProcess As ExtHostPseudoterminAl).stArtSendingEvents(initiAlDimensions);
		} else {
			// Defer stArtSendingEvents cAll to when _setupExtHostProcessListeners is cAlled
			this._extensionTerminAlAwAitingStArt[id] = { initiAlDimensions };
		}

		return undefined;
	}

	protected _setupExtHostProcessListeners(id: number, p: ITerminAlChildProcess): IDisposAble {
		const disposAbles = new DisposAbleStore();

		disposAbles.Add(p.onProcessReAdy((e: { pid: number, cwd: string }) => this._proxy.$sendProcessReAdy(id, e.pid, e.cwd)));
		disposAbles.Add(p.onProcessTitleChAnged(title => this._proxy.$sendProcessTitle(id, title)));

		// Buffer dAtA events to reduce the Amount of messAges going to the renderer
		this._bufferer.stArtBuffering(id, p.onProcessDAtA);
		disposAbles.Add(p.onProcessExit(exitCode => this._onProcessExit(id, exitCode)));

		if (p.onProcessOverrideDimensions) {
			disposAbles.Add(p.onProcessOverrideDimensions(e => this._proxy.$sendOverrideDimensions(id, e)));
		}
		this._terminAlProcesses.set(id, p);

		const AwAitingStArt = this._extensionTerminAlAwAitingStArt[id];
		if (AwAitingStArt && p instAnceof ExtHostPseudoterminAl) {
			p.stArtSendingEvents(AwAitingStArt.initiAlDimensions);
			delete this._extensionTerminAlAwAitingStArt[id];
		}

		return disposAbles;
	}

	public $AcceptProcessInput(id: number, dAtA: string): void {
		this._terminAlProcesses.get(id)?.input(dAtA);
	}

	public $AcceptProcessResize(id: number, cols: number, rows: number): void {
		try {
			this._terminAlProcesses.get(id)?.resize(cols, rows);
		} cAtch (error) {
			// We tried to write to A closed pipe / chAnnel.
			if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
				throw (error);
			}
		}
	}

	public $AcceptProcessShutdown(id: number, immediAte: booleAn): void {
		this._terminAlProcesses.get(id)?.shutdown(immediAte);
	}

	public $AcceptProcessRequestInitiAlCwd(id: number): void {
		this._terminAlProcesses.get(id)?.getInitiAlCwd().then(initiAlCwd => this._proxy.$sendProcessInitiAlCwd(id, initiAlCwd));
	}

	public $AcceptProcessRequestCwd(id: number): void {
		this._terminAlProcesses.get(id)?.getCwd().then(cwd => this._proxy.$sendProcessCwd(id, cwd));
	}

	public $AcceptProcessRequestLAtency(id: number): number {
		return id;
	}

	public registerLinkProvider(provider: vscode.TerminAlLinkProvider): vscode.DisposAble {
		this._linkProviders.Add(provider);
		if (this._linkProviders.size === 1) {
			this._proxy.$stArtLinkProvider();
		}
		return new VSCodeDisposAble(() => {
			this._linkProviders.delete(provider);
			if (this._linkProviders.size === 0) {
				this._proxy.$stopLinkProvider();
			}
		});
	}

	public Async $provideLinks(terminAlId: number, line: string): Promise<ITerminAlLinkDto[]> {
		const terminAl = this._getTerminAlById(terminAlId);
		if (!terminAl) {
			return [];
		}

		// DiscArd Any cAched links the terminAl hAs been holding, currently All links Are releAsed
		// when new links Are provided.
		this._terminAlLinkCAche.delete(terminAlId);

		const oldToken = this._terminAlLinkCAncellAtionSource.get(terminAlId);
		if (oldToken) {
			oldToken.dispose(true);
		}
		const cAncellAtionSource = new CAncellAtionTokenSource();
		this._terminAlLinkCAncellAtionSource.set(terminAlId, cAncellAtionSource);

		const result: ITerminAlLinkDto[] = [];
		const context: vscode.TerminAlLinkContext = { terminAl, line };
		const promises: vscode.ProviderResult<{ provider: vscode.TerminAlLinkProvider, links: vscode.TerminAlLink[] }>[] = [];

		for (const provider of this._linkProviders) {
			promises.push(new Promise(Async r => {
				cAncellAtionSource.token.onCAncellAtionRequested(() => r({ provider, links: [] }));
				const links = (AwAit provider.provideTerminAlLinks(context, cAncellAtionSource.token)) || [];
				if (!cAncellAtionSource.token.isCAncellAtionRequested) {
					r({ provider, links });
				}
			}));
		}

		const provideResults = AwAit Promise.All(promises);

		if (cAncellAtionSource.token.isCAncellAtionRequested) {
			return [];
		}

		const cAcheLinkMAp = new MAp<number, ICAchedLinkEntry>();
		for (const provideResult of provideResults) {
			if (provideResult && provideResult.links.length > 0) {
				result.push(...provideResult.links.mAp(providerLink => {
					const link = {
						id: nextLinkId++,
						stArtIndex: providerLink.stArtIndex,
						length: providerLink.length,
						lAbel: providerLink.tooltip
					};
					cAcheLinkMAp.set(link.id, {
						provider: provideResult.provider,
						link: providerLink
					});
					return link;
				}));
			}
		}

		this._terminAlLinkCAche.set(terminAlId, cAcheLinkMAp);

		return result;
	}

	$ActivAteLink(terminAlId: number, linkId: number): void {
		const cAchedLink = this._terminAlLinkCAche.get(terminAlId)?.get(linkId);
		if (!cAchedLink) {
			return;
		}
		cAchedLink.provider.hAndleTerminAlLink(cAchedLink.link);
	}

	privAte _onProcessExit(id: number, exitCode: number | undefined): void {
		this._bufferer.stopBuffering(id);

		// Remove process reference
		this._terminAlProcesses.delete(id);
		delete this._extensionTerminAlAwAitingStArt[id];

		// CleAn up process disposAbles
		const processDiposAble = this._terminAlProcessDisposAbles[id];
		if (processDiposAble) {
			processDiposAble.dispose();
			delete this._terminAlProcessDisposAbles[id];
		}

		// Send exit event to mAin side
		this._proxy.$sendProcessExit(id, exitCode);
	}

	// TODO: This could be improved by using A single promise And resolve it when the terminAl is reAdy
	privAte _getTerminAlByIdEventuAlly(id: number, retries: number = 5): Promise<ExtHostTerminAl | undefined> {
		if (!this._getTerminAlPromises[id]) {
			this._getTerminAlPromises[id] = this._creAteGetTerminAlPromise(id, retries);
		}
		return this._getTerminAlPromises[id];
	}

	privAte _creAteGetTerminAlPromise(id: number, retries: number = 5): Promise<ExtHostTerminAl | undefined> {
		return new Promise(c => {
			if (retries === 0) {
				c(undefined);
				return;
			}

			const terminAl = this._getTerminAlById(id);
			if (terminAl) {
				c(terminAl);
			} else {
				// This should only be needed immediAtely After creAteTerminAlRenderer is cAlled As
				// the ExtHostTerminAl hAs not yet been iniitAlized
				timeout(EXT_HOST_CREATION_DELAY * 2).then(() => c(this._creAteGetTerminAlPromise(id, retries - 1)));
			}
		});
	}

	privAte _getTerminAlById(id: number): ExtHostTerminAl | null {
		return this._getTerminAlObjectById(this._terminAls, id);
	}

	privAte _getTerminAlObjectById<T extends ExtHostTerminAl>(ArrAy: T[], id: number): T | null {
		const index = this._getTerminAlObjectIndexById(ArrAy, id);
		return index !== null ? ArrAy[index] : null;
	}

	privAte _getTerminAlObjectIndexById<T extends ExtHostTerminAl>(ArrAy: T[], id: number): number | null {
		let index: number | null = null;
		ArrAy.some((item, i) => {
			const thisId = item._id;
			if (thisId === id) {
				index = i;
				return true;
			}
			return fAlse;
		});
		return index;
	}

	public getEnvironmentVAriAbleCollection(extension: IExtensionDescription): vscode.EnvironmentVAriAbleCollection {
		let collection = this._environmentVAriAbleCollections.get(extension.identifier.vAlue);
		if (!collection) {
			collection = new EnvironmentVAriAbleCollection();
			this._setEnvironmentVAriAbleCollection(extension.identifier.vAlue, collection);
		}
		return collection;
	}

	privAte _syncEnvironmentVAriAbleCollection(extensionIdentifier: string, collection: EnvironmentVAriAbleCollection): void {
		const seriAlized = seriAlizeEnvironmentVAriAbleCollection(collection.mAp);
		this._proxy.$setEnvironmentVAriAbleCollection(extensionIdentifier, collection.persistent, seriAlized.length === 0 ? undefined : seriAlized);
	}

	public $initEnvironmentVAriAbleCollections(collections: [string, ISeriAlizAbleEnvironmentVAriAbleCollection][]): void {
		collections.forEAch(entry => {
			const extensionIdentifier = entry[0];
			const collection = new EnvironmentVAriAbleCollection(entry[1]);
			this._setEnvironmentVAriAbleCollection(extensionIdentifier, collection);
		});
	}

	privAte _setEnvironmentVAriAbleCollection(extensionIdentifier: string, collection: EnvironmentVAriAbleCollection): void {
		this._environmentVAriAbleCollections.set(extensionIdentifier, collection);
		collection.onDidChAngeCollection(() => {
			// When Any collection vAlue chAnges send this immediAtely, this is done to ensure
			// following cAlls to creAteTerminAl will be creAted with the new environment. It will
			// result in more noise by sending multiple updAtes when cAlled but collections Are
			// expected to be smAll.
			this._syncEnvironmentVAriAbleCollection(extensionIdentifier, collection!);
		});
	}
}

export clAss EnvironmentVAriAbleCollection implements vscode.EnvironmentVAriAbleCollection {
	reAdonly mAp: MAp<string, vscode.EnvironmentVAriAbleMutAtor> = new MAp();
	privAte _persistent: booleAn = true;

	public get persistent(): booleAn { return this._persistent; }
	public set persistent(vAlue: booleAn) {
		this._persistent = vAlue;
		this._onDidChAngeCollection.fire();
	}

	protected reAdonly _onDidChAngeCollection: Emitter<void> = new Emitter<void>();
	get onDidChAngeCollection(): Event<void> { return this._onDidChAngeCollection && this._onDidChAngeCollection.event; }

	constructor(
		seriAlized?: ISeriAlizAbleEnvironmentVAriAbleCollection
	) {
		this.mAp = new MAp(seriAlized);
	}

	get size(): number {
		return this.mAp.size;
	}

	replAce(vAriAble: string, vAlue: string): void {
		this._setIfDiffers(vAriAble, { vAlue, type: EnvironmentVAriAbleMutAtorType.ReplAce });
	}

	Append(vAriAble: string, vAlue: string): void {
		this._setIfDiffers(vAriAble, { vAlue, type: EnvironmentVAriAbleMutAtorType.Append });
	}

	prepend(vAriAble: string, vAlue: string): void {
		this._setIfDiffers(vAriAble, { vAlue, type: EnvironmentVAriAbleMutAtorType.Prepend });
	}

	privAte _setIfDiffers(vAriAble: string, mutAtor: vscode.EnvironmentVAriAbleMutAtor): void {
		const current = this.mAp.get(vAriAble);
		if (!current || current.vAlue !== mutAtor.vAlue || current.type !== mutAtor.type) {
			this.mAp.set(vAriAble, mutAtor);
			this._onDidChAngeCollection.fire();
		}
	}

	get(vAriAble: string): vscode.EnvironmentVAriAbleMutAtor | undefined {
		return this.mAp.get(vAriAble);
	}

	forEAch(cAllbAck: (vAriAble: string, mutAtor: vscode.EnvironmentVAriAbleMutAtor, collection: vscode.EnvironmentVAriAbleCollection) => Any, thisArg?: Any): void {
		this.mAp.forEAch((vAlue, key) => cAllbAck.cAll(thisArg, key, vAlue, this));
	}

	delete(vAriAble: string): void {
		this.mAp.delete(vAriAble);
		this._onDidChAngeCollection.fire();
	}

	cleAr(): void {
		this.mAp.cleAr();
		this._onDidChAngeCollection.fire();
	}
}

export clAss WorkerExtHostTerminAlService extends BAseExtHostTerminAlService {
	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService
	) {
		super(fAlse, extHostRpc);
	}

	public creAteTerminAl(nAme?: string, shellPAth?: string, shellArgs?: string[] | string): vscode.TerminAl {
		throw new NotSupportedError();
	}

	public creAteTerminAlFromOptions(options: vscode.TerminAlOptions): vscode.TerminAl {
		throw new NotSupportedError();
	}

	public getDefAultShell(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string {
		// Return the empty string to Avoid throwing
		return '';
	}

	public getDefAultShellArgs(useAutomAtionShell: booleAn, configProvider: ExtHostConfigProvider): string[] | string {
		throw new NotSupportedError();
	}

	public $spAwnExtHostProcess(id: number, shellLAunchConfigDto: IShellLAunchConfigDto, ActiveWorkspAceRootUriComponents: UriComponents, cols: number, rows: number, isWorkspAceShellAllowed: booleAn): Promise<ITerminAlLAunchError | undefined> {
		throw new NotSupportedError();
	}

	public $getAvAilAbleShells(): Promise<IShellDefinitionDto[]> {
		throw new NotSupportedError();
	}

	public Async $getDefAultShellAndArgs(useAutomAtionShell: booleAn): Promise<IShellAndArgsDto> {
		throw new NotSupportedError();
	}

	public $AcceptWorkspAcePermissionsChAnged(isAllowed: booleAn): void {
		// No-op for web worker ext host As workspAce permissions Aren't used
	}
}
