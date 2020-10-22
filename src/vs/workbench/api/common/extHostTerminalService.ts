/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import { Event, Emitter } from 'vs/Base/common/event';
import { ExtHostTerminalServiceShape, MainContext, MainThreadTerminalServiceShape, IShellLaunchConfigDto, IShellDefinitionDto, IShellAndArgsDto, ITerminalDimensionsDto, ITerminalLinkDto } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostConfigProvider } from 'vs/workBench/api/common/extHostConfiguration';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { URI, UriComponents } from 'vs/Base/common/uri';
import { ITerminalChildProcess, ITerminalDimensions, EXT_HOST_CREATION_DELAY, ITerminalLaunchError } from 'vs/workBench/contriB/terminal/common/terminal';
import { timeout } from 'vs/Base/common/async';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { TerminalDataBufferer } from 'vs/workBench/contriB/terminal/common/terminalDataBuffering';
import { IDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { DisposaBle as VSCodeDisposaBle, EnvironmentVariaBleMutatorType } from './extHostTypes';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { ISerializaBleEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { localize } from 'vs/nls';
import { NotSupportedError } from 'vs/Base/common/errors';
import { serializeEnvironmentVariaBleCollection } from 'vs/workBench/contriB/terminal/common/environmentVariaBleShared';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';

export interface IExtHostTerminalService extends ExtHostTerminalServiceShape, IDisposaBle {

	readonly _serviceBrand: undefined;

	activeTerminal: vscode.Terminal | undefined;
	terminals: vscode.Terminal[];

	onDidCloseTerminal: Event<vscode.Terminal>;
	onDidOpenTerminal: Event<vscode.Terminal>;
	onDidChangeActiveTerminal: Event<vscode.Terminal | undefined>;
	onDidChangeTerminalDimensions: Event<vscode.TerminalDimensionsChangeEvent>;
	onDidWriteTerminalData: Event<vscode.TerminalDataWriteEvent>;

	createTerminal(name?: string, shellPath?: string, shellArgs?: string[] | string): vscode.Terminal;
	createTerminalFromOptions(options: vscode.TerminalOptions): vscode.Terminal;
	createExtensionTerminal(options: vscode.ExtensionTerminalOptions): vscode.Terminal;
	attachPtyToTerminal(id: numBer, pty: vscode.Pseudoterminal): void;
	getDefaultShell(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string;
	getDefaultShellArgs(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string[] | string;
	registerLinkProvider(provider: vscode.TerminalLinkProvider): vscode.DisposaBle;
	getEnvironmentVariaBleCollection(extension: IExtensionDescription, persistent?: Boolean): vscode.EnvironmentVariaBleCollection;
}

export const IExtHostTerminalService = createDecorator<IExtHostTerminalService>('IExtHostTerminalService');

export class BaseExtHostTerminal {
	puBlic _id: numBer | undefined;
	protected _idPromise: Promise<numBer>;
	private _idPromiseComplete: ((value: numBer) => any) | undefined;
	private _disposed: Boolean = false;
	private _queuedRequests: ApiRequest[] = [];

	constructor(
		protected _proxy: MainThreadTerminalServiceShape,
		id?: numBer
	) {
		this._idPromise = new Promise<numBer>(c => {
			if (id !== undefined) {
				this._id = id;
				c(id);
			} else {
				this._idPromiseComplete = c;
			}
		});
	}

	puBlic dispose(): void {
		if (!this._disposed) {
			this._disposed = true;
			this._queueApiRequest(this._proxy.$dispose, []);
		}
	}

	protected _checkDisposed() {
		if (this._disposed) {
			throw new Error('Terminal has already Been disposed');
		}
	}

	protected _queueApiRequest(callBack: (...args: any[]) => void, args: any[]): void {
		const request: ApiRequest = new ApiRequest(callBack, args);
		if (!this._id) {
			this._queuedRequests.push(request);
			return;
		}
		request.run(this._proxy, this._id);
	}

	puBlic _runQueuedRequests(id: numBer): void {
		this._id = id;
		if (this._idPromiseComplete) {
			this._idPromiseComplete(id);
			this._idPromiseComplete = undefined;
		}
		this._queuedRequests.forEach((r) => {
			r.run(this._proxy, id);
		});
		this._queuedRequests.length = 0;
	}
}

export class ExtHostTerminal extends BaseExtHostTerminal implements vscode.Terminal {
	private _pidPromise: Promise<numBer | undefined>;
	private _cols: numBer | undefined;
	private _pidPromiseComplete: ((value: numBer | undefined) => any) | undefined;
	private _rows: numBer | undefined;
	private _exitStatus: vscode.TerminalExitStatus | undefined;

	puBlic isOpen: Boolean = false;

	constructor(
		proxy: MainThreadTerminalServiceShape,
		private readonly _creationOptions: vscode.TerminalOptions | vscode.ExtensionTerminalOptions,
		private _name?: string,
		id?: numBer
	) {
		super(proxy, id);
		this._creationOptions = OBject.freeze(this._creationOptions);
		this._pidPromise = new Promise<numBer | undefined>(c => this._pidPromiseComplete = c);
	}

	puBlic async create(
		shellPath?: string,
		shellArgs?: string[] | string,
		cwd?: string | URI,
		env?: { [key: string]: string | null },
		waitOnExit?: Boolean,
		strictEnv?: Boolean,
		hideFromUser?: Boolean
	): Promise<void> {
		const result = await this._proxy.$createTerminal({ name: this._name, shellPath, shellArgs, cwd, env, waitOnExit, strictEnv, hideFromUser });
		this._name = result.name;
		this._runQueuedRequests(result.id);
	}

	puBlic async createExtensionTerminal(): Promise<numBer> {
		const result = await this._proxy.$createTerminal({ name: this._name, isExtensionTerminal: true });
		this._name = result.name;
		this._runQueuedRequests(result.id);
		return result.id;
	}

	puBlic get name(): string {
		return this._name || '';
	}

	puBlic set name(name: string) {
		this._name = name;
	}

	puBlic get exitStatus(): vscode.TerminalExitStatus | undefined {
		return this._exitStatus;
	}

	puBlic get dimensions(): vscode.TerminalDimensions | undefined {
		if (this._cols === undefined || this._rows === undefined) {
			return undefined;
		}
		return {
			columns: this._cols,
			rows: this._rows
		};
	}

	puBlic setExitCode(code: numBer | undefined) {
		this._exitStatus = OBject.freeze({ code });
	}

	puBlic setDimensions(cols: numBer, rows: numBer): Boolean {
		if (cols === this._cols && rows === this._rows) {
			// Nothing changed
			return false;
		}
		if (cols === 0 || rows === 0) {
			return false;
		}
		this._cols = cols;
		this._rows = rows;
		return true;
	}

	puBlic get processId(): Promise<numBer | undefined> {
		return this._pidPromise;
	}

	puBlic get creationOptions(): Readonly<vscode.TerminalOptions | vscode.ExtensionTerminalOptions> {
		return this._creationOptions;
	}

	puBlic sendText(text: string, addNewLine: Boolean = true): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$sendText, [text, addNewLine]);
	}

	puBlic show(preserveFocus: Boolean): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$show, [preserveFocus]);
	}

	puBlic hide(): void {
		this._checkDisposed();
		this._queueApiRequest(this._proxy.$hide, []);
	}

	puBlic _setProcessId(processId: numBer | undefined): void {
		// The event may fire 2 times when the panel is restored
		if (this._pidPromiseComplete) {
			this._pidPromiseComplete(processId);
			this._pidPromiseComplete = undefined;
		} else {
			// Recreate the promise if this is the nth processId set (e.g. reused task terminals)
			this._pidPromise.then(pid => {
				if (pid !== processId) {
					this._pidPromise = Promise.resolve(processId);
				}
			});
		}
	}
}

class ApiRequest {
	private _callBack: (...args: any[]) => void;
	private _args: any[];

	constructor(callBack: (...args: any[]) => void, args: any[]) {
		this._callBack = callBack;
		this._args = args;
	}

	puBlic run(proxy: MainThreadTerminalServiceShape, id: numBer) {
		this._callBack.apply(proxy, [id].concat(this._args));
	}
}

export class ExtHostPseudoterminal implements ITerminalChildProcess {
	private readonly _onProcessData = new Emitter<string>();
	puBlic readonly onProcessData: Event<string> = this._onProcessData.event;
	private readonly _onProcessExit = new Emitter<numBer | undefined>();
	puBlic readonly onProcessExit: Event<numBer | undefined> = this._onProcessExit.event;
	private readonly _onProcessReady = new Emitter<{ pid: numBer, cwd: string }>();
	puBlic get onProcessReady(): Event<{ pid: numBer, cwd: string }> { return this._onProcessReady.event; }
	private readonly _onProcessTitleChanged = new Emitter<string>();
	puBlic readonly onProcessTitleChanged: Event<string> = this._onProcessTitleChanged.event;
	private readonly _onProcessOverrideDimensions = new Emitter<ITerminalDimensions | undefined>();
	puBlic get onProcessOverrideDimensions(): Event<ITerminalDimensions | undefined> { return this._onProcessOverrideDimensions.event; }

	constructor(private readonly _pty: vscode.Pseudoterminal) { }

	async start(): Promise<undefined> {
		return undefined;
	}

	shutdown(): void {
		this._pty.close();
	}

	input(data: string): void {
		if (this._pty.handleInput) {
			this._pty.handleInput(data);
		}
	}

	resize(cols: numBer, rows: numBer): void {
		if (this._pty.setDimensions) {
			this._pty.setDimensions({ columns: cols, rows });
		}
	}

	getInitialCwd(): Promise<string> {
		return Promise.resolve('');
	}

	getCwd(): Promise<string> {
		return Promise.resolve('');
	}

	getLatency(): Promise<numBer> {
		return Promise.resolve(0);
	}

	startSendingEvents(initialDimensions: ITerminalDimensionsDto | undefined): void {
		// Attach the listeners
		this._pty.onDidWrite(e => this._onProcessData.fire(e));
		if (this._pty.onDidClose) {
			this._pty.onDidClose((e: numBer | void = undefined) => {
				this._onProcessExit.fire(e === void 0 ? undefined : e);
			});
		}
		if (this._pty.onDidOverrideDimensions) {
			this._pty.onDidOverrideDimensions(e => this._onProcessOverrideDimensions.fire(e ? { cols: e.columns, rows: e.rows } : e));
		}

		this._pty.open(initialDimensions ? initialDimensions : undefined);
		this._onProcessReady.fire({ pid: -1, cwd: '' });
	}
}

let nextLinkId = 1;

interface ICachedLinkEntry {
	provider: vscode.TerminalLinkProvider;
	link: vscode.TerminalLink;
}

export aBstract class BaseExtHostTerminalService extends DisposaBle implements IExtHostTerminalService, ExtHostTerminalServiceShape {

	readonly _serviceBrand: undefined;

	protected _proxy: MainThreadTerminalServiceShape;
	protected _activeTerminal: ExtHostTerminal | undefined;
	protected _terminals: ExtHostTerminal[] = [];
	protected _terminalProcesses: Map<numBer, ITerminalChildProcess> = new Map();
	protected _terminalProcessDisposaBles: { [id: numBer]: IDisposaBle } = {};
	protected _extensionTerminalAwaitingStart: { [id: numBer]: { initialDimensions: ITerminalDimensionsDto | undefined } | undefined } = {};
	protected _getTerminalPromises: { [id: numBer]: Promise<ExtHostTerminal | undefined> } = {};
	protected _environmentVariaBleCollections: Map<string, EnvironmentVariaBleCollection> = new Map();

	private readonly _Bufferer: TerminalDataBufferer;
	private readonly _linkProviders: Set<vscode.TerminalLinkProvider> = new Set();
	private readonly _terminalLinkCache: Map<numBer, Map<numBer, ICachedLinkEntry>> = new Map();
	private readonly _terminalLinkCancellationSource: Map<numBer, CancellationTokenSource> = new Map();

	puBlic get activeTerminal(): ExtHostTerminal | undefined { return this._activeTerminal; }
	puBlic get terminals(): ExtHostTerminal[] { return this._terminals; }

	protected readonly _onDidCloseTerminal: Emitter<vscode.Terminal> = new Emitter<vscode.Terminal>();
	puBlic get onDidCloseTerminal(): Event<vscode.Terminal> { return this._onDidCloseTerminal && this._onDidCloseTerminal.event; }
	protected readonly _onDidOpenTerminal: Emitter<vscode.Terminal> = new Emitter<vscode.Terminal>();
	puBlic get onDidOpenTerminal(): Event<vscode.Terminal> { return this._onDidOpenTerminal && this._onDidOpenTerminal.event; }
	protected readonly _onDidChangeActiveTerminal: Emitter<vscode.Terminal | undefined> = new Emitter<vscode.Terminal | undefined>();
	puBlic get onDidChangeActiveTerminal(): Event<vscode.Terminal | undefined> { return this._onDidChangeActiveTerminal && this._onDidChangeActiveTerminal.event; }
	protected readonly _onDidChangeTerminalDimensions: Emitter<vscode.TerminalDimensionsChangeEvent> = new Emitter<vscode.TerminalDimensionsChangeEvent>();
	puBlic get onDidChangeTerminalDimensions(): Event<vscode.TerminalDimensionsChangeEvent> { return this._onDidChangeTerminalDimensions && this._onDidChangeTerminalDimensions.event; }
	protected readonly _onDidWriteTerminalData: Emitter<vscode.TerminalDataWriteEvent>;
	puBlic get onDidWriteTerminalData(): Event<vscode.TerminalDataWriteEvent> { return this._onDidWriteTerminalData && this._onDidWriteTerminalData.event; }

	constructor(
		supportsProcesses: Boolean,
		@IExtHostRpcService extHostRpc: IExtHostRpcService
	) {
		super();
		this._proxy = extHostRpc.getProxy(MainContext.MainThreadTerminalService);
		this._Bufferer = new TerminalDataBufferer(this._proxy.$sendProcessData);
		this._onDidWriteTerminalData = new Emitter<vscode.TerminalDataWriteEvent>({
			onFirstListenerAdd: () => this._proxy.$startSendingDataEvents(),
			onLastListenerRemove: () => this._proxy.$stopSendingDataEvents()
		});
		this._proxy.$registerProcessSupport(supportsProcesses);
		this._register({
			dispose: () => {
				for (const [_, terminalProcess] of this._terminalProcesses) {
					terminalProcess.shutdown(true);
				}
			}
		});
	}

	puBlic aBstract createTerminal(name?: string, shellPath?: string, shellArgs?: string[] | string): vscode.Terminal;
	puBlic aBstract createTerminalFromOptions(options: vscode.TerminalOptions): vscode.Terminal;
	puBlic aBstract getDefaultShell(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string;
	puBlic aBstract getDefaultShellArgs(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string[] | string;
	puBlic aBstract $spawnExtHostProcess(id: numBer, shellLaunchConfigDto: IShellLaunchConfigDto, activeWorkspaceRootUriComponents: UriComponents, cols: numBer, rows: numBer, isWorkspaceShellAllowed: Boolean): Promise<ITerminalLaunchError | undefined>;
	puBlic aBstract $getAvailaBleShells(): Promise<IShellDefinitionDto[]>;
	puBlic aBstract $getDefaultShellAndArgs(useAutomationShell: Boolean): Promise<IShellAndArgsDto>;
	puBlic aBstract $acceptWorkspacePermissionsChanged(isAllowed: Boolean): void;

	puBlic createExtensionTerminal(options: vscode.ExtensionTerminalOptions): vscode.Terminal {
		const terminal = new ExtHostTerminal(this._proxy, options, options.name);
		const p = new ExtHostPseudoterminal(options.pty);
		terminal.createExtensionTerminal().then(id => {
			const disposaBle = this._setupExtHostProcessListeners(id, p);
			this._terminalProcessDisposaBles[id] = disposaBle;
		});
		this._terminals.push(terminal);
		return terminal;
	}

	puBlic attachPtyToTerminal(id: numBer, pty: vscode.Pseudoterminal): void {
		const terminal = this._getTerminalByIdEventually(id);
		if (!terminal) {
			throw new Error(`Cannot resolve terminal with id ${id} for virtual process`);
		}
		const p = new ExtHostPseudoterminal(pty);
		const disposaBle = this._setupExtHostProcessListeners(id, p);
		this._terminalProcessDisposaBles[id] = disposaBle;
	}

	puBlic async $acceptActiveTerminalChanged(id: numBer | null): Promise<void> {
		const original = this._activeTerminal;
		if (id === null) {
			this._activeTerminal = undefined;
			if (original !== this._activeTerminal) {
				this._onDidChangeActiveTerminal.fire(this._activeTerminal);
			}
			return;
		}
		const terminal = await this._getTerminalByIdEventually(id);
		if (terminal) {
			this._activeTerminal = terminal;
			if (original !== this._activeTerminal) {
				this._onDidChangeActiveTerminal.fire(this._activeTerminal);
			}
		}
	}

	puBlic async $acceptTerminalProcessData(id: numBer, data: string): Promise<void> {
		const terminal = await this._getTerminalByIdEventually(id);
		if (terminal) {
			this._onDidWriteTerminalData.fire({ terminal, data });
		}
	}

	puBlic async $acceptTerminalDimensions(id: numBer, cols: numBer, rows: numBer): Promise<void> {
		const terminal = await this._getTerminalByIdEventually(id);
		if (terminal) {
			if (terminal.setDimensions(cols, rows)) {
				this._onDidChangeTerminalDimensions.fire({
					terminal: terminal,
					dimensions: terminal.dimensions as vscode.TerminalDimensions
				});
			}
		}
	}

	puBlic async $acceptTerminalMaximumDimensions(id: numBer, cols: numBer, rows: numBer): Promise<void> {
		await this._getTerminalByIdEventually(id);

		// Extension pty terminal only - when virtual process resize fires it means that the
		// terminal's maximum dimensions changed
		this._terminalProcesses.get(id)?.resize(cols, rows);
	}

	puBlic async $acceptTerminalTitleChange(id: numBer, name: string): Promise<void> {
		await this._getTerminalByIdEventually(id);
		const extHostTerminal = this._getTerminalOBjectById(this.terminals, id);
		if (extHostTerminal) {
			extHostTerminal.name = name;
		}
	}

	puBlic async $acceptTerminalClosed(id: numBer, exitCode: numBer | undefined): Promise<void> {
		await this._getTerminalByIdEventually(id);
		const index = this._getTerminalOBjectIndexById(this.terminals, id);
		if (index !== null) {
			const terminal = this._terminals.splice(index, 1)[0];
			terminal.setExitCode(exitCode);
			this._onDidCloseTerminal.fire(terminal);
		}
	}

	puBlic $acceptTerminalOpened(id: numBer, name: string, shellLaunchConfigDto: IShellLaunchConfigDto): void {
		const index = this._getTerminalOBjectIndexById(this._terminals, id);
		if (index !== null) {
			// The terminal has already Been created (via createTerminal*), only fire the event
			this._onDidOpenTerminal.fire(this.terminals[index]);
			this.terminals[index].isOpen = true;
			return;
		}

		const creationOptions: vscode.TerminalOptions = {
			name: shellLaunchConfigDto.name,
			shellPath: shellLaunchConfigDto.executaBle,
			shellArgs: shellLaunchConfigDto.args,
			cwd: typeof shellLaunchConfigDto.cwd === 'string' ? shellLaunchConfigDto.cwd : URI.revive(shellLaunchConfigDto.cwd),
			env: shellLaunchConfigDto.env,
			hideFromUser: shellLaunchConfigDto.hideFromUser
		};
		const terminal = new ExtHostTerminal(this._proxy, creationOptions, name, id);
		this._terminals.push(terminal);
		this._onDidOpenTerminal.fire(terminal);
		terminal.isOpen = true;
	}

	puBlic async $acceptTerminalProcessId(id: numBer, processId: numBer): Promise<void> {
		const terminal = await this._getTerminalByIdEventually(id);
		if (terminal) {
			terminal._setProcessId(processId);
		}
	}

	puBlic async $startExtensionTerminal(id: numBer, initialDimensions: ITerminalDimensionsDto | undefined): Promise<ITerminalLaunchError | undefined> {
		// Make sure the ExtHostTerminal exists so onDidOpenTerminal has fired Before we call
		// Pseudoterminal.start
		const terminal = await this._getTerminalByIdEventually(id);
		if (!terminal) {
			return { message: localize('launchFail.idMissingOnExtHost', "Could not find the terminal with id {0} on the extension host", id) };
		}

		// Wait for onDidOpenTerminal to fire
		if (!terminal.isOpen) {
			await new Promise<void>(r => {
				// Ensure open is called after onDidOpenTerminal
				const listener = this.onDidOpenTerminal(async e => {
					if (e === terminal) {
						listener.dispose();
						r();
					}
				});
			});
		}

		const terminalProcess = this._terminalProcesses.get(id);
		if (terminalProcess) {
			(terminalProcess as ExtHostPseudoterminal).startSendingEvents(initialDimensions);
		} else {
			// Defer startSendingEvents call to when _setupExtHostProcessListeners is called
			this._extensionTerminalAwaitingStart[id] = { initialDimensions };
		}

		return undefined;
	}

	protected _setupExtHostProcessListeners(id: numBer, p: ITerminalChildProcess): IDisposaBle {
		const disposaBles = new DisposaBleStore();

		disposaBles.add(p.onProcessReady((e: { pid: numBer, cwd: string }) => this._proxy.$sendProcessReady(id, e.pid, e.cwd)));
		disposaBles.add(p.onProcessTitleChanged(title => this._proxy.$sendProcessTitle(id, title)));

		// Buffer data events to reduce the amount of messages going to the renderer
		this._Bufferer.startBuffering(id, p.onProcessData);
		disposaBles.add(p.onProcessExit(exitCode => this._onProcessExit(id, exitCode)));

		if (p.onProcessOverrideDimensions) {
			disposaBles.add(p.onProcessOverrideDimensions(e => this._proxy.$sendOverrideDimensions(id, e)));
		}
		this._terminalProcesses.set(id, p);

		const awaitingStart = this._extensionTerminalAwaitingStart[id];
		if (awaitingStart && p instanceof ExtHostPseudoterminal) {
			p.startSendingEvents(awaitingStart.initialDimensions);
			delete this._extensionTerminalAwaitingStart[id];
		}

		return disposaBles;
	}

	puBlic $acceptProcessInput(id: numBer, data: string): void {
		this._terminalProcesses.get(id)?.input(data);
	}

	puBlic $acceptProcessResize(id: numBer, cols: numBer, rows: numBer): void {
		try {
			this._terminalProcesses.get(id)?.resize(cols, rows);
		} catch (error) {
			// We tried to write to a closed pipe / channel.
			if (error.code !== 'EPIPE' && error.code !== 'ERR_IPC_CHANNEL_CLOSED') {
				throw (error);
			}
		}
	}

	puBlic $acceptProcessShutdown(id: numBer, immediate: Boolean): void {
		this._terminalProcesses.get(id)?.shutdown(immediate);
	}

	puBlic $acceptProcessRequestInitialCwd(id: numBer): void {
		this._terminalProcesses.get(id)?.getInitialCwd().then(initialCwd => this._proxy.$sendProcessInitialCwd(id, initialCwd));
	}

	puBlic $acceptProcessRequestCwd(id: numBer): void {
		this._terminalProcesses.get(id)?.getCwd().then(cwd => this._proxy.$sendProcessCwd(id, cwd));
	}

	puBlic $acceptProcessRequestLatency(id: numBer): numBer {
		return id;
	}

	puBlic registerLinkProvider(provider: vscode.TerminalLinkProvider): vscode.DisposaBle {
		this._linkProviders.add(provider);
		if (this._linkProviders.size === 1) {
			this._proxy.$startLinkProvider();
		}
		return new VSCodeDisposaBle(() => {
			this._linkProviders.delete(provider);
			if (this._linkProviders.size === 0) {
				this._proxy.$stopLinkProvider();
			}
		});
	}

	puBlic async $provideLinks(terminalId: numBer, line: string): Promise<ITerminalLinkDto[]> {
		const terminal = this._getTerminalById(terminalId);
		if (!terminal) {
			return [];
		}

		// Discard any cached links the terminal has Been holding, currently all links are released
		// when new links are provided.
		this._terminalLinkCache.delete(terminalId);

		const oldToken = this._terminalLinkCancellationSource.get(terminalId);
		if (oldToken) {
			oldToken.dispose(true);
		}
		const cancellationSource = new CancellationTokenSource();
		this._terminalLinkCancellationSource.set(terminalId, cancellationSource);

		const result: ITerminalLinkDto[] = [];
		const context: vscode.TerminalLinkContext = { terminal, line };
		const promises: vscode.ProviderResult<{ provider: vscode.TerminalLinkProvider, links: vscode.TerminalLink[] }>[] = [];

		for (const provider of this._linkProviders) {
			promises.push(new Promise(async r => {
				cancellationSource.token.onCancellationRequested(() => r({ provider, links: [] }));
				const links = (await provider.provideTerminalLinks(context, cancellationSource.token)) || [];
				if (!cancellationSource.token.isCancellationRequested) {
					r({ provider, links });
				}
			}));
		}

		const provideResults = await Promise.all(promises);

		if (cancellationSource.token.isCancellationRequested) {
			return [];
		}

		const cacheLinkMap = new Map<numBer, ICachedLinkEntry>();
		for (const provideResult of provideResults) {
			if (provideResult && provideResult.links.length > 0) {
				result.push(...provideResult.links.map(providerLink => {
					const link = {
						id: nextLinkId++,
						startIndex: providerLink.startIndex,
						length: providerLink.length,
						laBel: providerLink.tooltip
					};
					cacheLinkMap.set(link.id, {
						provider: provideResult.provider,
						link: providerLink
					});
					return link;
				}));
			}
		}

		this._terminalLinkCache.set(terminalId, cacheLinkMap);

		return result;
	}

	$activateLink(terminalId: numBer, linkId: numBer): void {
		const cachedLink = this._terminalLinkCache.get(terminalId)?.get(linkId);
		if (!cachedLink) {
			return;
		}
		cachedLink.provider.handleTerminalLink(cachedLink.link);
	}

	private _onProcessExit(id: numBer, exitCode: numBer | undefined): void {
		this._Bufferer.stopBuffering(id);

		// Remove process reference
		this._terminalProcesses.delete(id);
		delete this._extensionTerminalAwaitingStart[id];

		// Clean up process disposaBles
		const processDiposaBle = this._terminalProcessDisposaBles[id];
		if (processDiposaBle) {
			processDiposaBle.dispose();
			delete this._terminalProcessDisposaBles[id];
		}

		// Send exit event to main side
		this._proxy.$sendProcessExit(id, exitCode);
	}

	// TODO: This could Be improved By using a single promise and resolve it when the terminal is ready
	private _getTerminalByIdEventually(id: numBer, retries: numBer = 5): Promise<ExtHostTerminal | undefined> {
		if (!this._getTerminalPromises[id]) {
			this._getTerminalPromises[id] = this._createGetTerminalPromise(id, retries);
		}
		return this._getTerminalPromises[id];
	}

	private _createGetTerminalPromise(id: numBer, retries: numBer = 5): Promise<ExtHostTerminal | undefined> {
		return new Promise(c => {
			if (retries === 0) {
				c(undefined);
				return;
			}

			const terminal = this._getTerminalById(id);
			if (terminal) {
				c(terminal);
			} else {
				// This should only Be needed immediately after createTerminalRenderer is called as
				// the ExtHostTerminal has not yet Been iniitalized
				timeout(EXT_HOST_CREATION_DELAY * 2).then(() => c(this._createGetTerminalPromise(id, retries - 1)));
			}
		});
	}

	private _getTerminalById(id: numBer): ExtHostTerminal | null {
		return this._getTerminalOBjectById(this._terminals, id);
	}

	private _getTerminalOBjectById<T extends ExtHostTerminal>(array: T[], id: numBer): T | null {
		const index = this._getTerminalOBjectIndexById(array, id);
		return index !== null ? array[index] : null;
	}

	private _getTerminalOBjectIndexById<T extends ExtHostTerminal>(array: T[], id: numBer): numBer | null {
		let index: numBer | null = null;
		array.some((item, i) => {
			const thisId = item._id;
			if (thisId === id) {
				index = i;
				return true;
			}
			return false;
		});
		return index;
	}

	puBlic getEnvironmentVariaBleCollection(extension: IExtensionDescription): vscode.EnvironmentVariaBleCollection {
		let collection = this._environmentVariaBleCollections.get(extension.identifier.value);
		if (!collection) {
			collection = new EnvironmentVariaBleCollection();
			this._setEnvironmentVariaBleCollection(extension.identifier.value, collection);
		}
		return collection;
	}

	private _syncEnvironmentVariaBleCollection(extensionIdentifier: string, collection: EnvironmentVariaBleCollection): void {
		const serialized = serializeEnvironmentVariaBleCollection(collection.map);
		this._proxy.$setEnvironmentVariaBleCollection(extensionIdentifier, collection.persistent, serialized.length === 0 ? undefined : serialized);
	}

	puBlic $initEnvironmentVariaBleCollections(collections: [string, ISerializaBleEnvironmentVariaBleCollection][]): void {
		collections.forEach(entry => {
			const extensionIdentifier = entry[0];
			const collection = new EnvironmentVariaBleCollection(entry[1]);
			this._setEnvironmentVariaBleCollection(extensionIdentifier, collection);
		});
	}

	private _setEnvironmentVariaBleCollection(extensionIdentifier: string, collection: EnvironmentVariaBleCollection): void {
		this._environmentVariaBleCollections.set(extensionIdentifier, collection);
		collection.onDidChangeCollection(() => {
			// When any collection value changes send this immediately, this is done to ensure
			// following calls to createTerminal will Be created with the new environment. It will
			// result in more noise By sending multiple updates when called But collections are
			// expected to Be small.
			this._syncEnvironmentVariaBleCollection(extensionIdentifier, collection!);
		});
	}
}

export class EnvironmentVariaBleCollection implements vscode.EnvironmentVariaBleCollection {
	readonly map: Map<string, vscode.EnvironmentVariaBleMutator> = new Map();
	private _persistent: Boolean = true;

	puBlic get persistent(): Boolean { return this._persistent; }
	puBlic set persistent(value: Boolean) {
		this._persistent = value;
		this._onDidChangeCollection.fire();
	}

	protected readonly _onDidChangeCollection: Emitter<void> = new Emitter<void>();
	get onDidChangeCollection(): Event<void> { return this._onDidChangeCollection && this._onDidChangeCollection.event; }

	constructor(
		serialized?: ISerializaBleEnvironmentVariaBleCollection
	) {
		this.map = new Map(serialized);
	}

	get size(): numBer {
		return this.map.size;
	}

	replace(variaBle: string, value: string): void {
		this._setIfDiffers(variaBle, { value, type: EnvironmentVariaBleMutatorType.Replace });
	}

	append(variaBle: string, value: string): void {
		this._setIfDiffers(variaBle, { value, type: EnvironmentVariaBleMutatorType.Append });
	}

	prepend(variaBle: string, value: string): void {
		this._setIfDiffers(variaBle, { value, type: EnvironmentVariaBleMutatorType.Prepend });
	}

	private _setIfDiffers(variaBle: string, mutator: vscode.EnvironmentVariaBleMutator): void {
		const current = this.map.get(variaBle);
		if (!current || current.value !== mutator.value || current.type !== mutator.type) {
			this.map.set(variaBle, mutator);
			this._onDidChangeCollection.fire();
		}
	}

	get(variaBle: string): vscode.EnvironmentVariaBleMutator | undefined {
		return this.map.get(variaBle);
	}

	forEach(callBack: (variaBle: string, mutator: vscode.EnvironmentVariaBleMutator, collection: vscode.EnvironmentVariaBleCollection) => any, thisArg?: any): void {
		this.map.forEach((value, key) => callBack.call(thisArg, key, value, this));
	}

	delete(variaBle: string): void {
		this.map.delete(variaBle);
		this._onDidChangeCollection.fire();
	}

	clear(): void {
		this.map.clear();
		this._onDidChangeCollection.fire();
	}
}

export class WorkerExtHostTerminalService extends BaseExtHostTerminalService {
	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService
	) {
		super(false, extHostRpc);
	}

	puBlic createTerminal(name?: string, shellPath?: string, shellArgs?: string[] | string): vscode.Terminal {
		throw new NotSupportedError();
	}

	puBlic createTerminalFromOptions(options: vscode.TerminalOptions): vscode.Terminal {
		throw new NotSupportedError();
	}

	puBlic getDefaultShell(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string {
		// Return the empty string to avoid throwing
		return '';
	}

	puBlic getDefaultShellArgs(useAutomationShell: Boolean, configProvider: ExtHostConfigProvider): string[] | string {
		throw new NotSupportedError();
	}

	puBlic $spawnExtHostProcess(id: numBer, shellLaunchConfigDto: IShellLaunchConfigDto, activeWorkspaceRootUriComponents: UriComponents, cols: numBer, rows: numBer, isWorkspaceShellAllowed: Boolean): Promise<ITerminalLaunchError | undefined> {
		throw new NotSupportedError();
	}

	puBlic $getAvailaBleShells(): Promise<IShellDefinitionDto[]> {
		throw new NotSupportedError();
	}

	puBlic async $getDefaultShellAndArgs(useAutomationShell: Boolean): Promise<IShellAndArgsDto> {
		throw new NotSupportedError();
	}

	puBlic $acceptWorkspacePermissionsChanged(isAllowed: Boolean): void {
		// No-op for weB worker ext host as workspace permissions aren't used
	}
}
