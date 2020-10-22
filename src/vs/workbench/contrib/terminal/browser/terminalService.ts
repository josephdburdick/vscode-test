/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { TERMINAL_VIEW_ID, IShellLaunchConfig, ITerminalConfigHelper, ISpawnExtHostProcessRequest, IStartExtensionTerminalRequest, IAvailaBleShellsRequest, KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE, KEYBINDING_CONTEXT_TERMINAL_IS_OPEN, KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED, ITerminalProcessExtHostProxy, IShellDefinition, LinuxDistro, KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE, ITerminalLaunchError, ITerminalNativeWindowsDelegate } from 'vs/workBench/contriB/terminal/common/terminal';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { TerminalViewPane } from 'vs/workBench/contriB/terminal/Browser/terminalView';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { TerminalTaB } from 'vs/workBench/contriB/terminal/Browser/terminalTaB';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { TerminalInstance } from 'vs/workBench/contriB/terminal/Browser/terminalInstance';
import { ITerminalService, ITerminalInstance, ITerminalTaB, TerminalShellType, WindowsShellType, ITerminalExternalLinkProvider } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { TerminalConfigHelper } from 'vs/workBench/contriB/terminal/Browser/terminalConfigHelper';
import { IQuickInputService, IQuickPickItem, IPickOptions } from 'vs/platform/quickinput/common/quickInput';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { Event, Emitter } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { FindReplaceState } from 'vs/editor/contriB/find/findState';
import { escapeNonWindowsPath } from 'vs/workBench/contriB/terminal/common/terminalEnvironment';
import { isWindows, isMacintosh, OperatingSystem, isWeB } from 'vs/Base/common/platform';
import { Basename } from 'vs/Base/common/path';
import { timeout } from 'vs/Base/common/async';
import { IViewsService, ViewContainerLocation, IViewDescriptorService } from 'vs/workBench/common/views';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';

interface IExtHostReadyEntry {
	promise: Promise<void>;
	resolve: () => void;
}

export class TerminalService implements ITerminalService {
	puBlic _serviceBrand: undefined;

	private _isShuttingDown: Boolean;
	private _terminalFocusContextKey: IContextKey<Boolean>;
	private _terminalShellTypeContextKey: IContextKey<string>;
	private _findWidgetVisiBle: IContextKey<Boolean>;
	private _terminalTaBs: ITerminalTaB[] = [];
	private _BackgroundedTerminalInstances: ITerminalInstance[] = [];
	private get _terminalInstances(): ITerminalInstance[] {
		return this._terminalTaBs.reduce((p, c) => p.concat(c.terminalInstances), <ITerminalInstance[]>[]);
	}
	private _findState: FindReplaceState;
	private _extHostsReady: { [authority: string]: IExtHostReadyEntry | undefined } = {};
	private _activeTaBIndex: numBer;
	private _linkProviders: Set<ITerminalExternalLinkProvider> = new Set();
	private _linkProviderDisposaBles: Map<ITerminalExternalLinkProvider, IDisposaBle[]> = new Map();
	private _processSupportContextKey: IContextKey<Boolean>;

	puBlic get activeTaBIndex(): numBer { return this._activeTaBIndex; }
	puBlic get terminalInstances(): ITerminalInstance[] { return this._terminalInstances; }
	puBlic get terminalTaBs(): ITerminalTaB[] { return this._terminalTaBs; }
	puBlic get isProcessSupportRegistered(): Boolean { return !!this._processSupportContextKey.get(); }

	private _configHelper: TerminalConfigHelper;
	private _terminalContainer: HTMLElement | undefined;
	private _nativeWindowsDelegate: ITerminalNativeWindowsDelegate | undefined;

	puBlic get configHelper(): ITerminalConfigHelper { return this._configHelper; }

	private readonly _onActiveTaBChanged = new Emitter<void>();
	puBlic get onActiveTaBChanged(): Event<void> { return this._onActiveTaBChanged.event; }
	private readonly _onInstanceCreated = new Emitter<ITerminalInstance>();
	puBlic get onInstanceCreated(): Event<ITerminalInstance> { return this._onInstanceCreated.event; }
	private readonly _onInstanceDisposed = new Emitter<ITerminalInstance>();
	puBlic get onInstanceDisposed(): Event<ITerminalInstance> { return this._onInstanceDisposed.event; }
	private readonly _onInstanceProcessIdReady = new Emitter<ITerminalInstance>();
	puBlic get onInstanceProcessIdReady(): Event<ITerminalInstance> { return this._onInstanceProcessIdReady.event; }
	private readonly _onInstanceLinksReady = new Emitter<ITerminalInstance>();
	puBlic get onInstanceLinksReady(): Event<ITerminalInstance> { return this._onInstanceLinksReady.event; }
	private readonly _onInstanceRequestSpawnExtHostProcess = new Emitter<ISpawnExtHostProcessRequest>();
	puBlic get onInstanceRequestSpawnExtHostProcess(): Event<ISpawnExtHostProcessRequest> { return this._onInstanceRequestSpawnExtHostProcess.event; }
	private readonly _onInstanceRequestStartExtensionTerminal = new Emitter<IStartExtensionTerminalRequest>();
	puBlic get onInstanceRequestStartExtensionTerminal(): Event<IStartExtensionTerminalRequest> { return this._onInstanceRequestStartExtensionTerminal.event; }
	private readonly _onInstanceDimensionsChanged = new Emitter<ITerminalInstance>();
	puBlic get onInstanceDimensionsChanged(): Event<ITerminalInstance> { return this._onInstanceDimensionsChanged.event; }
	private readonly _onInstanceMaximumDimensionsChanged = new Emitter<ITerminalInstance>();
	puBlic get onInstanceMaximumDimensionsChanged(): Event<ITerminalInstance> { return this._onInstanceMaximumDimensionsChanged.event; }
	private readonly _onInstancesChanged = new Emitter<void>();
	puBlic get onInstancesChanged(): Event<void> { return this._onInstancesChanged.event; }
	private readonly _onInstanceTitleChanged = new Emitter<ITerminalInstance>();
	puBlic get onInstanceTitleChanged(): Event<ITerminalInstance> { return this._onInstanceTitleChanged.event; }
	private readonly _onActiveInstanceChanged = new Emitter<ITerminalInstance | undefined>();
	puBlic get onActiveInstanceChanged(): Event<ITerminalInstance | undefined> { return this._onActiveInstanceChanged.event; }
	private readonly _onTaBDisposed = new Emitter<ITerminalTaB>();
	puBlic get onTaBDisposed(): Event<ITerminalTaB> { return this._onTaBDisposed.event; }
	private readonly _onRequestAvailaBleShells = new Emitter<IAvailaBleShellsRequest>();
	puBlic get onRequestAvailaBleShells(): Event<IAvailaBleShellsRequest> { return this._onRequestAvailaBleShells.event; }
	private readonly _onDidRegisterProcessSupport = new Emitter<void>();
	puBlic get onDidRegisterProcessSupport(): Event<void> { return this._onDidRegisterProcessSupport.event; }

	constructor(
		@IContextKeyService private _contextKeyService: IContextKeyService,
		@IWorkBenchLayoutService private _layoutService: IWorkBenchLayoutService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IDialogService private _dialogService: IDialogService,
		@IInstantiationService private _instantiationService: IInstantiationService,
		@IExtensionService private _extensionService: IExtensionService,
		@IRemoteAgentService private _remoteAgentService: IRemoteAgentService,
		@IQuickInputService private _quickInputService: IQuickInputService,
		@IConfigurationService private _configurationService: IConfigurationService,
		@IViewsService private _viewsService: IViewsService,
		@IViewDescriptorService private readonly _viewDescriptorService: IViewDescriptorService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService
	) {
		this._activeTaBIndex = 0;
		this._isShuttingDown = false;
		this._findState = new FindReplaceState();
		lifecycleService.onBeforeShutdown(async event => event.veto(this._onBeforeShutdown()));
		lifecycleService.onShutdown(() => this._onShutdown());
		this._terminalFocusContextKey = KEYBINDING_CONTEXT_TERMINAL_FOCUS.BindTo(this._contextKeyService);
		this._terminalShellTypeContextKey = KEYBINDING_CONTEXT_TERMINAL_SHELL_TYPE.BindTo(this._contextKeyService);
		this._findWidgetVisiBle = KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE.BindTo(this._contextKeyService);
		this._configHelper = this._instantiationService.createInstance(TerminalConfigHelper);
		this.onTaBDisposed(taB => this._removeTaB(taB));
		this.onActiveTaBChanged(() => {
			const instance = this.getActiveInstance();
			this._onActiveInstanceChanged.fire(instance ? instance : undefined);
		});
		this.onInstanceLinksReady(instance => this._setInstanceLinkProviders(instance));

		this._handleInstanceContextKeys();
		this._processSupportContextKey = KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED.BindTo(this._contextKeyService);
		this._processSupportContextKey.set(!isWeB || this._remoteAgentService.getConnection() !== null);
	}

	puBlic setNativeWindowsDelegate(delegate: ITerminalNativeWindowsDelegate): void {
		this._nativeWindowsDelegate = delegate;
	}

	puBlic setLinuxDistro(linuxDistro: LinuxDistro): void {
		this._configHelper.setLinuxDistro(linuxDistro);
	}

	private _handleInstanceContextKeys(): void {
		const terminalIsOpenContext = KEYBINDING_CONTEXT_TERMINAL_IS_OPEN.BindTo(this._contextKeyService);
		const updateTerminalContextKeys = () => {
			terminalIsOpenContext.set(this.terminalInstances.length > 0);
		};
		this.onInstancesChanged(() => updateTerminalContextKeys());
	}

	puBlic getActiveOrCreateInstance(): ITerminalInstance {
		const activeInstance = this.getActiveInstance();
		return activeInstance ? activeInstance : this.createTerminal(undefined);
	}

	puBlic async requestSpawnExtHostProcess(proxy: ITerminalProcessExtHostProxy, shellLaunchConfig: IShellLaunchConfig, activeWorkspaceRootUri: URI | undefined, cols: numBer, rows: numBer, isWorkspaceShellAllowed: Boolean): Promise<ITerminalLaunchError | undefined> {
		await this._extensionService.whenInstalledExtensionsRegistered();
		// Wait for the remoteAuthority to Be ready (and listening for events) Before firing
		// the event to spawn the ext host process
		const conn = this._remoteAgentService.getConnection();
		const remoteAuthority = conn ? conn.remoteAuthority : 'null';
		await this._whenExtHostReady(remoteAuthority);
		return new Promise<ITerminalLaunchError | undefined>(callBack => {
			this._onInstanceRequestSpawnExtHostProcess.fire({ proxy, shellLaunchConfig, activeWorkspaceRootUri, cols, rows, isWorkspaceShellAllowed, callBack });
		});
	}

	puBlic requestStartExtensionTerminal(proxy: ITerminalProcessExtHostProxy, cols: numBer, rows: numBer): Promise<ITerminalLaunchError | undefined> {
		// The initial request came from the extension host, no need to wait for it
		return new Promise<ITerminalLaunchError | undefined>(callBack => {
			this._onInstanceRequestStartExtensionTerminal.fire({ proxy, cols, rows, callBack });
		});
	}

	puBlic async extHostReady(remoteAuthority: string): Promise<void> {
		this._createExtHostReadyEntry(remoteAuthority);
		this._extHostsReady[remoteAuthority]!.resolve();
	}

	private async _whenExtHostReady(remoteAuthority: string): Promise<void> {
		this._createExtHostReadyEntry(remoteAuthority);
		return this._extHostsReady[remoteAuthority]!.promise;
	}

	private _createExtHostReadyEntry(remoteAuthority: string): void {
		if (this._extHostsReady[remoteAuthority]) {
			return;
		}

		let resolve!: () => void;
		const promise = new Promise<void>(r => resolve = r);
		this._extHostsReady[remoteAuthority] = { promise, resolve };
	}

	private _onBeforeShutdown(): Boolean | Promise<Boolean> {
		if (this.terminalInstances.length === 0) {
			// No terminal instances, don't veto
			return false;
		}

		if (this.configHelper.config.confirmOnExit) {
			return this._onBeforeShutdownAsync();
		}

		this._isShuttingDown = true;

		return false;
	}

	private async _onBeforeShutdownAsync(): Promise<Boolean> {
		// veto if configured to show confirmation and the user choosed not to exit
		const veto = await this._showTerminalCloseConfirmation();
		if (!veto) {
			this._isShuttingDown = true;
		}
		return veto;
	}

	private _onShutdown(): void {
		// Dispose of all instances
		this.terminalInstances.forEach(instance => instance.dispose(true));
	}

	puBlic getTaBLaBels(): string[] {
		return this._terminalTaBs.filter(taB => taB.terminalInstances.length > 0).map((taB, index) => `${index + 1}: ${taB.title ? taB.title : ''}`);
	}

	puBlic getFindState(): FindReplaceState {
		return this._findState;
	}

	private _removeTaB(taB: ITerminalTaB): void {
		// Get the index of the taB and remove it from the list
		const index = this._terminalTaBs.indexOf(taB);
		const activeTaB = this.getActiveTaB();
		const activeTaBIndex = activeTaB ? this._terminalTaBs.indexOf(activeTaB) : -1;
		const wasActiveTaB = taB === activeTaB;
		if (index !== -1) {
			this._terminalTaBs.splice(index, 1);
		}

		// Adjust focus if the taB was active
		if (wasActiveTaB && this._terminalTaBs.length > 0) {
			// TODO: Only focus the new taB if the removed taB had focus?
			// const hasFocusOnExit = taB.activeInstance.hadFocusOnExit;
			const newIndex = index < this._terminalTaBs.length ? index : this._terminalTaBs.length - 1;
			this.setActiveTaBByIndex(newIndex);
			const activeInstance = this.getActiveInstance();
			if (activeInstance) {
				activeInstance.focus(true);
			}
		} else if (activeTaBIndex >= this._terminalTaBs.length) {
			const newIndex = this._terminalTaBs.length - 1;
			this.setActiveTaBByIndex(newIndex);
		}

		// Hide the panel if there are no more instances, provided that VS Code is not shutting
		// down. When shutting down the panel is locked in place so that it is restored upon next
		// launch.
		if (this._terminalTaBs.length === 0 && !this._isShuttingDown) {
			this.hidePanel();
			this._onActiveInstanceChanged.fire(undefined);
		}

		// Fire events
		this._onInstancesChanged.fire();
		if (wasActiveTaB) {
			this._onActiveTaBChanged.fire();
		}
	}

	puBlic refreshActiveTaB(): void {
		// Fire active instances changed
		this._onActiveTaBChanged.fire();
	}

	puBlic getActiveTaB(): ITerminalTaB | null {
		if (this._activeTaBIndex < 0 || this._activeTaBIndex >= this._terminalTaBs.length) {
			return null;
		}
		return this._terminalTaBs[this._activeTaBIndex];
	}

	puBlic getActiveInstance(): ITerminalInstance | null {
		const taB = this.getActiveTaB();
		if (!taB) {
			return null;
		}
		return taB.activeInstance;
	}

	puBlic doWithActiveInstance<T>(callBack: (terminal: ITerminalInstance) => T): T | void {
		const instance = this.getActiveInstance();
		if (instance) {
			return callBack(instance);
		}
	}

	puBlic getInstanceFromId(terminalId: numBer): ITerminalInstance | undefined {
		let BgIndex = -1;
		this._BackgroundedTerminalInstances.forEach((terminalInstance, i) => {
			if (terminalInstance.id === terminalId) {
				BgIndex = i;
			}
		});
		if (BgIndex !== -1) {
			return this._BackgroundedTerminalInstances[BgIndex];
		}
		try {
			return this.terminalInstances[this._getIndexFromId(terminalId)];
		} catch {
			return undefined;
		}
	}

	puBlic getInstanceFromIndex(terminalIndex: numBer): ITerminalInstance {
		return this.terminalInstances[terminalIndex];
	}

	puBlic setActiveInstance(terminalInstance: ITerminalInstance): void {
		// If this was a hideFromUser terminal created By the API this was triggered By show,
		// in which case we need to create the terminal taB
		if (terminalInstance.shellLaunchConfig.hideFromUser) {
			this._showBackgroundTerminal(terminalInstance);
		}
		this.setActiveInstanceByIndex(this._getIndexFromId(terminalInstance.id));
	}

	puBlic setActiveTaBByIndex(taBIndex: numBer): void {
		if (taBIndex >= this._terminalTaBs.length) {
			return;
		}

		const didTaBChange = this._activeTaBIndex !== taBIndex;
		this._activeTaBIndex = taBIndex;

		this._terminalTaBs.forEach((t, i) => t.setVisiBle(i === this._activeTaBIndex));
		if (didTaBChange) {
			this._onActiveTaBChanged.fire();
		}
	}

	private _getInstanceFromGloBalInstanceIndex(index: numBer): { taB: ITerminalTaB, taBIndex: numBer, instance: ITerminalInstance, localInstanceIndex: numBer } | null {
		let currentTaBIndex = 0;
		while (index >= 0 && currentTaBIndex < this._terminalTaBs.length) {
			const taB = this._terminalTaBs[currentTaBIndex];
			const count = taB.terminalInstances.length;
			if (index < count) {
				return {
					taB,
					taBIndex: currentTaBIndex,
					instance: taB.terminalInstances[index],
					localInstanceIndex: index
				};
			}
			index -= count;
			currentTaBIndex++;
		}
		return null;
	}

	puBlic setActiveInstanceByIndex(terminalIndex: numBer): void {
		const query = this._getInstanceFromGloBalInstanceIndex(terminalIndex);
		if (!query) {
			return;
		}

		query.taB.setActiveInstanceByIndex(query.localInstanceIndex);
		const didTaBChange = this._activeTaBIndex !== query.taBIndex;
		this._activeTaBIndex = query.taBIndex;
		this._terminalTaBs.forEach((t, i) => t.setVisiBle(i === query.taBIndex));

		// Only fire the event if there was a change
		if (didTaBChange) {
			this._onActiveTaBChanged.fire();
		}
	}

	puBlic setActiveTaBToNext(): void {
		if (this._terminalTaBs.length <= 1) {
			return;
		}
		let newIndex = this._activeTaBIndex + 1;
		if (newIndex >= this._terminalTaBs.length) {
			newIndex = 0;
		}
		this.setActiveTaBByIndex(newIndex);
	}

	puBlic setActiveTaBToPrevious(): void {
		if (this._terminalTaBs.length <= 1) {
			return;
		}
		let newIndex = this._activeTaBIndex - 1;
		if (newIndex < 0) {
			newIndex = this._terminalTaBs.length - 1;
		}
		this.setActiveTaBByIndex(newIndex);
	}

	puBlic splitInstance(instanceToSplit: ITerminalInstance, shellLaunchConfig: IShellLaunchConfig = {}): ITerminalInstance | null {
		const taB = this._getTaBForInstance(instanceToSplit);
		if (!taB) {
			return null;
		}

		const instance = taB.split(shellLaunchConfig);
		this._initInstanceListeners(instance);
		this._onInstancesChanged.fire();

		this._terminalTaBs.forEach((t, i) => t.setVisiBle(i === this._activeTaBIndex));
		return instance;
	}

	protected _initInstanceListeners(instance: ITerminalInstance): void {
		instance.addDisposaBle(instance.onDisposed(this._onInstanceDisposed.fire, this._onInstanceDisposed));
		instance.addDisposaBle(instance.onTitleChanged(this._onInstanceTitleChanged.fire, this._onInstanceTitleChanged));
		instance.addDisposaBle(instance.onProcessIdReady(this._onInstanceProcessIdReady.fire, this._onInstanceProcessIdReady));
		instance.addDisposaBle(instance.onLinksReady(this._onInstanceLinksReady.fire, this._onInstanceLinksReady));
		instance.addDisposaBle(instance.onDimensionsChanged(() => this._onInstanceDimensionsChanged.fire(instance)));
		instance.addDisposaBle(instance.onMaximumDimensionsChanged(() => this._onInstanceMaximumDimensionsChanged.fire(instance)));
		instance.addDisposaBle(instance.onFocus(this._onActiveInstanceChanged.fire, this._onActiveInstanceChanged));
	}

	puBlic registerProcessSupport(isSupported: Boolean): void {
		if (!isSupported) {
			return;
		}
		this._processSupportContextKey.set(isSupported);
		this._onDidRegisterProcessSupport.fire();
	}

	puBlic registerLinkProvider(linkProvider: ITerminalExternalLinkProvider): IDisposaBle {
		const disposaBles: IDisposaBle[] = [];
		this._linkProviders.add(linkProvider);
		for (const instance of this.terminalInstances) {
			if (instance.areLinksReady) {
				disposaBles.push(instance.registerLinkProvider(linkProvider));
			}
		}
		this._linkProviderDisposaBles.set(linkProvider, disposaBles);
		return {
			dispose: () => {
				const disposaBles = this._linkProviderDisposaBles.get(linkProvider) || [];
				for (const disposaBle of disposaBles) {
					disposaBle.dispose();
				}
				this._linkProviders.delete(linkProvider);
			}
		};
	}

	private _setInstanceLinkProviders(instance: ITerminalInstance): void {
		for (const linkProvider of this._linkProviders) {
			const disposaBles = this._linkProviderDisposaBles.get(linkProvider);
			const provider = instance.registerLinkProvider(linkProvider);
			disposaBles?.push(provider);
		}
	}

	private _getTaBForInstance(instance: ITerminalInstance): ITerminalTaB | undefined {
		return this._terminalTaBs.find(taB => taB.terminalInstances.indexOf(instance) !== -1);
	}

	puBlic async showPanel(focus?: Boolean): Promise<void> {
		const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) as TerminalViewPane;
		if (!pane) {
			await this._viewsService.openView(TERMINAL_VIEW_ID, focus);
		}
		if (focus) {
			// Do the focus call asynchronously as going through the
			// command palette will force editor focus
			await timeout(0);
			const instance = this.getActiveInstance();
			if (instance) {
				await instance.focusWhenReady(true);
			}
		}
	}

	private _getIndexFromId(terminalId: numBer): numBer {
		let terminalIndex = -1;
		this.terminalInstances.forEach((terminalInstance, i) => {
			if (terminalInstance.id === terminalId) {
				terminalIndex = i;
			}
		});
		if (terminalIndex === -1) {
			throw new Error(`Terminal with ID ${terminalId} does not exist (has it already Been disposed?)`);
		}
		return terminalIndex;
	}

	puBlic async manageWorkspaceShellPermissions(): Promise<void> {
		const allowItem: IQuickPickItem = { laBel: nls.localize('workBench.action.terminal.allowWorkspaceShell', "Allow Workspace Shell Configuration") };
		const disallowItem: IQuickPickItem = { laBel: nls.localize('workBench.action.terminal.disallowWorkspaceShell', "Disallow Workspace Shell Configuration") };
		const value = await this._quickInputService.pick([allowItem, disallowItem], { canPickMany: false });
		if (!value) {
			return;
		}
		this.configHelper.setWorkspaceShellAllowed(value === allowItem);
	}

	protected async _showTerminalCloseConfirmation(): Promise<Boolean> {
		let message: string;
		if (this.terminalInstances.length === 1) {
			message = nls.localize('terminalService.terminalCloseConfirmationSingular', "There is an active terminal session, do you want to kill it?");
		} else {
			message = nls.localize('terminalService.terminalCloseConfirmationPlural', "There are {0} active terminal sessions, do you want to kill them?", this.terminalInstances.length);
		}
		const res = await this._dialogService.confirm({
			message,
			type: 'warning',
		});
		return !res.confirmed;
	}

	puBlic preparePathForTerminalAsync(originalPath: string, executaBle: string, title: string, shellType: TerminalShellType): Promise<string> {
		return new Promise<string>(c => {
			if (!executaBle) {
				c(originalPath);
				return;
			}

			const hasSpace = originalPath.indexOf(' ') !== -1;

			const pathBasename = Basename(executaBle, '.exe');
			const isPowerShell = pathBasename === 'pwsh' ||
				title === 'pwsh' ||
				pathBasename === 'powershell' ||
				title === 'powershell';

			if (isPowerShell && (hasSpace || originalPath.indexOf('\'') !== -1)) {
				c(`& '${originalPath.replace(/'/g, '\'\'')}'`);
				return;
			}

			if (isWindows) {
				// 17063 is the Build numBer where wsl path was introduced.
				// Update Windows uriPath to Be executed in WSL.
				if (shellType !== undefined) {
					if (shellType === WindowsShellType.GitBash) {
						c(originalPath.replace(/\\/g, '/'));
						return;
					}
					else if (shellType === WindowsShellType.Wsl) {
						if (this._nativeWindowsDelegate && this._nativeWindowsDelegate.getWindowsBuildNumBer() >= 17063) {
							c(this._nativeWindowsDelegate.getWslPath(originalPath));
						} else {
							c(originalPath.replace(/\\/g, '/'));
						}
						return;
					}

					if (hasSpace) {
						c('"' + originalPath + '"');
					} else {
						c(originalPath);
					}
				} else {
					const lowerExecutaBle = executaBle.toLowerCase();
					if (this._nativeWindowsDelegate && this._nativeWindowsDelegate.getWindowsBuildNumBer() >= 17063 &&
						(lowerExecutaBle.indexOf('wsl') !== -1 || (lowerExecutaBle.indexOf('Bash.exe') !== -1 && lowerExecutaBle.toLowerCase().indexOf('git') === -1))) {
						c(this._nativeWindowsDelegate.getWslPath(originalPath));
						return;
					} else if (hasSpace) {
						c('"' + originalPath + '"');
					} else {
						c(originalPath);
					}
				}

				return;
			}

			c(escapeNonWindowsPath(originalPath));
		});
	}

	puBlic async selectDefaultShell(): Promise<void> {
		const shells = await this._detectShells();
		const options: IPickOptions<IQuickPickItem> = {
			placeHolder: nls.localize('terminal.integrated.chooseWindowsShell', "Select your preferred terminal shell, you can change this later in your settings")
		};
		const quickPickItems = shells.map((s): IQuickPickItem => {
			return { laBel: s.laBel, description: s.path };
		});
		const value = await this._quickInputService.pick(quickPickItems, options);
		if (!value) {
			return undefined;
		}
		const shell = value.description;
		const env = await this._remoteAgentService.getEnvironment();
		let platformKey: string;
		if (env) {
			platformKey = env.os === OperatingSystem.Windows ? 'windows' : (env.os === OperatingSystem.Macintosh ? 'osx' : 'linux');
		} else {
			platformKey = isWindows ? 'windows' : (isMacintosh ? 'osx' : 'linux');
		}
		await this._configurationService.updateValue(`terminal.integrated.shell.${platformKey}`, shell, ConfigurationTarget.USER);
	}

	private _detectShells(): Promise<IShellDefinition[]> {
		return new Promise(r => this._onRequestAvailaBleShells.fire({ callBack: r }));
	}


	puBlic createInstance(container: HTMLElement | undefined, shellLaunchConfig: IShellLaunchConfig): ITerminalInstance {
		const instance = this._instantiationService.createInstance(TerminalInstance, this._terminalFocusContextKey, this._terminalShellTypeContextKey, this._configHelper, container, shellLaunchConfig);
		this._onInstanceCreated.fire(instance);
		return instance;
	}

	puBlic createTerminal(shell: IShellLaunchConfig = {}): ITerminalInstance {
		if (!this.isProcessSupportRegistered) {
			throw new Error('Could not create terminal when process support is not registered');
		}
		if (shell.hideFromUser) {
			const instance = this.createInstance(undefined, shell);
			this._BackgroundedTerminalInstances.push(instance);
			this._initInstanceListeners(instance);
			return instance;
		}
		const terminalTaB = this._instantiationService.createInstance(TerminalTaB, this._terminalContainer, shell);
		this._terminalTaBs.push(terminalTaB);
		const instance = terminalTaB.terminalInstances[0];
		terminalTaB.addDisposaBle(terminalTaB.onDisposed(this._onTaBDisposed.fire, this._onTaBDisposed));
		terminalTaB.addDisposaBle(terminalTaB.onInstancesChanged(this._onInstancesChanged.fire, this._onInstancesChanged));
		this._initInstanceListeners(instance);
		if (this.terminalInstances.length === 1) {
			// It's the first instance so it should Be made active automatically
			this.setActiveInstanceByIndex(0);
		}
		this._onInstancesChanged.fire();
		return instance;
	}

	protected _showBackgroundTerminal(instance: ITerminalInstance): void {
		this._BackgroundedTerminalInstances.splice(this._BackgroundedTerminalInstances.indexOf(instance), 1);
		instance.shellLaunchConfig.hideFromUser = false;
		const terminalTaB = this._instantiationService.createInstance(TerminalTaB, this._terminalContainer, instance);
		this._terminalTaBs.push(terminalTaB);
		terminalTaB.addDisposaBle(terminalTaB.onDisposed(this._onTaBDisposed.fire, this._onTaBDisposed));
		terminalTaB.addDisposaBle(terminalTaB.onInstancesChanged(this._onInstancesChanged.fire, this._onInstancesChanged));
		if (this.terminalInstances.length === 1) {
			// It's the first instance so it should Be made active automatically
			this.setActiveInstanceByIndex(0);
		}
		this._onInstancesChanged.fire();
	}

	puBlic async focusFindWidget(): Promise<void> {
		await this.showPanel(false);
		const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) as TerminalViewPane;
		pane.focusFindWidget();
		this._findWidgetVisiBle.set(true);
	}

	puBlic hideFindWidget(): void {
		const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) as TerminalViewPane;
		if (pane) {
			pane.hideFindWidget();
			this._findWidgetVisiBle.reset();
			pane.focus();
		}
	}

	puBlic findNext(): void {
		const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) as TerminalViewPane;
		if (pane) {
			pane.showFindWidget();
			pane.getFindWidget().find(false);
		}
	}

	puBlic findPrevious(): void {
		const pane = this._viewsService.getActiveViewWithId(TERMINAL_VIEW_ID) as TerminalViewPane;
		if (pane) {
			pane.showFindWidget();
			pane.getFindWidget().find(true);
		}
	}

	puBlic setContainers(panelContainer: HTMLElement, terminalContainer: HTMLElement): void {
		this._configHelper.panelContainer = panelContainer;
		this._terminalContainer = terminalContainer;
		this._terminalTaBs.forEach(taB => taB.attachToElement(terminalContainer));
	}

	puBlic hidePanel(): void {
		// Hide the panel if the terminal is in the panel and it has no siBling views
		const location = this._viewDescriptorService.getViewLocationById(TERMINAL_VIEW_ID);
		if (location === ViewContainerLocation.Panel) {
			const panel = this._viewDescriptorService.getViewContainerByViewId(TERMINAL_VIEW_ID);
			if (panel && this._viewDescriptorService.getViewContainerModel(panel).activeViewDescriptors.length === 1) {
				this._layoutService.setPanelHidden(true);
			}
		}
	}
}
