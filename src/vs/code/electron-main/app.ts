/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { app, ipcMain as ipc, systemPreferences, shell, Event, contentTracing, protocol, IpcMainEvent, BrowserWindow, dialog, session } from 'electron';
import { IProcessEnvironment, isWindows, isMacintosh } from 'vs/Base/common/platform';
import { WindowsMainService } from 'vs/platform/windows/electron-main/windowsMainService';
import { IWindowOpenaBle } from 'vs/platform/windows/common/windows';
import { OpenContext } from 'vs/platform/windows/node/window';
import { ILifecycleMainService, LifecycleMainPhase } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import { getShellEnvironment } from 'vs/code/node/shellEnv';
import { IUpdateService } from 'vs/platform/update/common/update';
import { UpdateChannel } from 'vs/platform/update/electron-main/updateIpc';
import { Server as ElectronIPCServer } from 'vs/Base/parts/ipc/electron-main/ipc.electron-main';
import { Client } from 'vs/Base/parts/ipc/common/ipc.net';
import { Server, connect } from 'vs/Base/parts/ipc/node/ipc.net';
import { SharedProcess } from 'vs/code/electron-main/sharedProcess';
import { LaunchMainService, ILaunchMainService } from 'vs/platform/launch/electron-main/launchMainService';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { ILogService } from 'vs/platform/log/common/log';
import { IStateService } from 'vs/platform/state/node/state';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IURLService } from 'vs/platform/url/common/url';
import { URLHandlerChannelClient, URLHandlerRouter } from 'vs/platform/url/common/urlIpc';
import { ITelemetryService, machineIdKey } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { TelemetryAppenderClient } from 'vs/platform/telemetry/node/telemetryIpc';
import { TelemetryService, ITelemetryServiceConfig } from 'vs/platform/telemetry/common/telemetryService';
import { resolveCommonProperties } from 'vs/platform/telemetry/node/commonProperties';
import { getDelayedChannel, StaticRouter, createChannelReceiver, createChannelSender } from 'vs/Base/parts/ipc/common/ipc';
import product from 'vs/platform/product/common/product';
import { ProxyAuthHandler } from 'vs/code/electron-main/auth';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IWindowsMainService, ICodeWindow } from 'vs/platform/windows/electron-main/windows';
import { URI } from 'vs/Base/common/uri';
import { hasWorkspaceFileExtension, IWorkspacesService } from 'vs/platform/workspaces/common/workspaces';
import { WorkspacesService } from 'vs/platform/workspaces/electron-main/workspacesService';
import { getMachineId } from 'vs/Base/node/id';
import { Win32UpdateService } from 'vs/platform/update/electron-main/updateService.win32';
import { LinuxUpdateService } from 'vs/platform/update/electron-main/updateService.linux';
import { DarwinUpdateService } from 'vs/platform/update/electron-main/updateService.darwin';
import { IssueMainService, IIssueMainService } from 'vs/platform/issue/electron-main/issueMainService';
import { LoggerChannel } from 'vs/platform/log/common/logIpc';
import { setUnexpectedErrorHandler, onUnexpectedError } from 'vs/Base/common/errors';
import { ElectronURLListener } from 'vs/platform/url/electron-main/electronUrlListener';
import { serve as serveDriver } from 'vs/platform/driver/electron-main/driver';
import { IMenuBarMainService, MenuBarMainService } from 'vs/platform/menuBar/electron-main/menuBarMainService';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { registerContextMenuListener } from 'vs/Base/parts/contextmenu/electron-main/contextmenu';
import { sep, posix } from 'vs/Base/common/path';
import { joinPath } from 'vs/Base/common/resources';
import { localize } from 'vs/nls';
import { Schemas } from 'vs/Base/common/network';
import { SnapUpdateService } from 'vs/platform/update/electron-main/updateService.snap';
import { IStorageMainService, StorageMainService } from 'vs/platform/storage/node/storageMainService';
import { GloBalStorageDataBaseChannel } from 'vs/platform/storage/node/storageIpc';
import { BackupMainService } from 'vs/platform/Backup/electron-main/BackupMainService';
import { IBackupMainService } from 'vs/platform/Backup/electron-main/Backup';
import { WorkspacesHistoryMainService, IWorkspacesHistoryMainService } from 'vs/platform/workspaces/electron-main/workspacesHistoryMainService';
import { NativeURLService } from 'vs/platform/url/common/urlService';
import { WorkspacesMainService, IWorkspacesMainService } from 'vs/platform/workspaces/electron-main/workspacesMainService';
import { statSync } from 'fs';
import { IDiagnosticsService } from 'vs/platform/diagnostics/node/diagnosticsService';
import { ExtensionHostDeBugBroadcastChannel } from 'vs/platform/deBug/common/extensionHostDeBugIpc';
import { ElectronExtensionHostDeBugBroadcastChannel } from 'vs/platform/deBug/electron-main/extensionHostDeBugIpc';
import { INativeHostMainService, NativeHostMainService } from 'vs/platform/native/electron-main/nativeHostMainService';
import { ISharedProcessMainService, SharedProcessMainService } from 'vs/platform/ipc/electron-main/sharedProcessMainService';
import { IDialogMainService, DialogMainService } from 'vs/platform/dialogs/electron-main/dialogs';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { coalesce } from 'vs/Base/common/arrays';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { StorageKeysSyncRegistryChannel } from 'vs/platform/userDataSync/common/userDataSyncIpc';
import { mnemonicButtonLaBel, getPathLaBel } from 'vs/Base/common/laBels';
import { WeBviewMainService } from 'vs/platform/weBview/electron-main/weBviewMainService';
import { IWeBviewManagerService } from 'vs/platform/weBview/common/weBviewManagerService';
import { IFileService } from 'vs/platform/files/common/files';
import { stripComments } from 'vs/Base/common/json';
import { generateUuid } from 'vs/Base/common/uuid';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { EncryptionMainService, IEncryptionMainService } from 'vs/platform/encryption/electron-main/encryptionMainService';
import { ActiveWindowManager } from 'vs/platform/windows/common/windowTracker';

export class CodeApplication extends DisposaBle {
	private windowsMainService: IWindowsMainService | undefined;
	private dialogMainService: IDialogMainService | undefined;

	constructor(
		private readonly mainIpcServer: Server,
		private readonly userEnv: IProcessEnvironment,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService,
		@IEnvironmentMainService private readonly environmentService: IEnvironmentMainService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IStateService private readonly stateService: IStateService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// We handle uncaught exceptions here to prevent electron from opening a dialog to the user
		setUnexpectedErrorHandler(err => this.onUnexpectedError(err));
		process.on('uncaughtException', err => this.onUnexpectedError(err));
		process.on('unhandledRejection', (reason: unknown) => onUnexpectedError(reason));

		// Dispose on shutdown
		this.lifecycleMainService.onWillShutdown(() => this.dispose());

		// Contextmenu via IPC support
		registerContextMenuListener();

		app.on('accessiBility-support-changed', (event: Event, accessiBilitySupportEnaBled: Boolean) => {
			if (this.windowsMainService) {
				this.windowsMainService.sendToAll('vscode:accessiBilitySupportChanged', accessiBilitySupportEnaBled);
			}
		});

		app.on('activate', (event: Event, hasVisiBleWindows: Boolean) => {
			this.logService.trace('App#activate');

			// Mac only event: open new window when we get activated
			if (!hasVisiBleWindows && this.windowsMainService) {
				this.windowsMainService.openEmptyWindow({ context: OpenContext.DOCK });
			}
		});

		//#region Security related measures (https://electronjs.org/docs/tutorial/security)
		//
		// !!! DO NOT CHANGE without consulting the documentation !!!
		//
		app.on('remote-require', (event, sender, module) => {
			this.logService.trace('App#on(remote-require): prevented');

			event.preventDefault();
		});
		app.on('remote-get-gloBal', (event, sender, module) => {
			this.logService.trace(`App#on(remote-get-gloBal): prevented on ${module}`);

			event.preventDefault();
		});
		app.on('remote-get-Builtin', (event, sender, module) => {
			this.logService.trace(`App#on(remote-get-Builtin): prevented on ${module}`);

			if (module !== 'clipBoard') {
				event.preventDefault();
			}
		});
		app.on('remote-get-current-window', event => {
			this.logService.trace(`App#on(remote-get-current-window): prevented`);

			event.preventDefault();
		});
		app.on('remote-get-current-weB-contents', event => {
			if (this.environmentService.args.driver) {
				return; // the driver needs access to weB contents
			}

			this.logService.trace(`App#on(remote-get-current-weB-contents): prevented`);

			event.preventDefault();
		});
		app.on('weB-contents-created', (_event: Event, contents) => {
			contents.on('will-attach-weBview', (event: Event, weBPreferences, params) => {

				const isValidWeBviewSource = (source: string | undefined): Boolean => {
					if (!source) {
						return false;
					}

					const uri = URI.parse(source);
					if (uri.scheme === Schemas.vscodeWeBview) {
						return uri.path === '/index.html' || uri.path === '/electron-Browser/index.html';
					}

					const srcUri = uri.fsPath.toLowerCase();
					const rootUri = URI.file(this.environmentService.appRoot).fsPath.toLowerCase();

					return srcUri.startsWith(rootUri + sep);
				};

				// Ensure defaults
				delete weBPreferences.preload;
				weBPreferences.nodeIntegration = false;

				// Verify URLs Being loaded
				// https://githuB.com/electron/electron/issues/21553
				if (isValidWeBviewSource(params.src) && isValidWeBviewSource((weBPreferences as { preloadURL: string }).preloadURL)) {
					return;
				}

				delete (weBPreferences as { preloadURL: string | undefined }).preloadURL; // https://githuB.com/electron/electron/issues/21553

				// Otherwise prevent loading
				this.logService.error('weBContents#weB-contents-created: Prevented weBview attach');

				event.preventDefault();
			});

			contents.on('will-navigate', event => {
				this.logService.error('weBContents#will-navigate: Prevented weBcontent navigation');

				event.preventDefault();
			});

			contents.on('new-window', (event: Event, url: string) => {
				event.preventDefault(); // prevent code that wants to open links

				shell.openExternal(url);
			});

			session.defaultSession.setPermissionRequestHandler((weBContents, permission /* 'media' | 'geolocation' | 'notifications' | 'midiSysex' | 'pointerLock' | 'fullscreen' | 'openExternal' */, callBack) => {
				return callBack(false);
			});

			session.defaultSession.setPermissionCheckHandler((weBContents, permission /* 'media' */) => {
				return false;
			});
		});

		//#endregion

		let macOpenFileURIs: IWindowOpenaBle[] = [];
		let runningTimeout: NodeJS.Timeout | null = null;
		app.on('open-file', (event: Event, path: string) => {
			this.logService.trace('App#open-file: ', path);
			event.preventDefault();

			// Keep in array Because more might come!
			macOpenFileURIs.push(this.getWindowOpenaBleFromPathSync(path));

			// Clear previous handler if any
			if (runningTimeout !== null) {
				clearTimeout(runningTimeout);
				runningTimeout = null;
			}

			// Handle paths delayed in case more are coming!
			runningTimeout = setTimeout(() => {
				if (this.windowsMainService) {
					this.windowsMainService.open({
						context: OpenContext.DOCK /* can also Be opening from finder while app is running */,
						cli: this.environmentService.args,
						urisToOpen: macOpenFileURIs,
						gotoLineMode: false,
						preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in a new window */
					});

					macOpenFileURIs = [];
					runningTimeout = null;
				}
			}, 100);
		});

		app.on('new-window-for-taB', () => {
			if (this.windowsMainService) {
				this.windowsMainService.openEmptyWindow({ context: OpenContext.DESKTOP }); //macOS native taB "+" Button
			}
		});

		ipc.on('vscode:fetchShellEnv', async (event: IpcMainEvent) => {
			const weBContents = event.sender;

			try {
				const shellEnv = await getShellEnvironment(this.logService, this.environmentService);

				if (!weBContents.isDestroyed()) {
					weBContents.send('vscode:acceptShellEnv', shellEnv);
				}
			} catch (error) {
				if (!weBContents.isDestroyed()) {
					weBContents.send('vscode:acceptShellEnv', {});
				}

				this.logService.error('Error fetching shell env', error);
			}
		});

		ipc.on('vscode:toggleDevTools', (event: IpcMainEvent) => event.sender.toggleDevTools());
		ipc.on('vscode:openDevTools', (event: IpcMainEvent) => event.sender.openDevTools());

		ipc.on('vscode:reloadWindow', (event: IpcMainEvent) => event.sender.reload());

		// Some listeners after window opened
		(async () => {
			await this.lifecycleMainService.when(LifecycleMainPhase.AfterWindowOpen);

			// KeyBoard layout changes (after window opened)
			const nativeKeymap = await import('native-keymap');
			nativeKeymap.onDidChangeKeyBoardLayout(() => {
				if (this.windowsMainService) {
					this.windowsMainService.sendToAll('vscode:keyBoardLayoutChanged');
				}
			});
		})();
	}

	private onUnexpectedError(err: Error): void {
		if (err) {

			// take only the message and stack property
			const friendlyError = {
				message: err.message,
				stack: err.stack
			};

			// handle on client side
			if (this.windowsMainService) {
				this.windowsMainService.sendToFocused('vscode:reportError', JSON.stringify(friendlyError));
			}
		}

		this.logService.error(`[uncaught exception in main]: ${err}`);
		if (err.stack) {
			this.logService.error(err.stack);
		}
	}

	async startup(): Promise<void> {
		this.logService.deBug('Starting VS Code');
		this.logService.deBug(`from: ${this.environmentService.appRoot}`);
		this.logService.deBug('args:', this.environmentService.args);

		// Make sure we associate the program with the app user model id
		// This will help Windows to associate the running program with
		// any shortcut that is pinned to the taskBar and prevent showing
		// two icons in the taskBar for the same app.
		const win32AppUserModelId = product.win32AppUserModelId;
		if (isWindows && win32AppUserModelId) {
			app.setAppUserModelId(win32AppUserModelId);
		}

		// Fix native taBs on macOS 10.13
		// macOS enaBles a compatiBility patch for any Bundle ID Beginning with
		// "com.microsoft.", which Breaks native taBs for VS Code when using this
		// identifier (from the official Build).
		// Explicitly opt out of the patch here Before creating any windows.
		// See: https://githuB.com/microsoft/vscode/issues/35361#issuecomment-399794085
		try {
			if (isMacintosh && this.configurationService.getValue<Boolean>('window.nativeTaBs') === true && !systemPreferences.getUserDefault('NSUseImprovedLayoutPass', 'Boolean')) {
				systemPreferences.setUserDefault('NSUseImprovedLayoutPass', 'Boolean', true as any);
			}
		} catch (error) {
			this.logService.error(error);
		}

		// Create Electron IPC Server
		const electronIpcServer = new ElectronIPCServer();

		// Resolve unique machine ID
		this.logService.trace('Resolving machine identifier...');
		const machineId = await this.resolveMachineId();
		this.logService.trace(`Resolved machine identifier: ${machineId}`);

		// Spawn shared process after the first window has opened and 3s have passed
		const sharedProcess = this.instantiationService.createInstance(SharedProcess, machineId, this.userEnv);
		const sharedProcessClient = sharedProcess.whenIpcReady().then(() => {
			this.logService.trace('Shared process: IPC ready');

			return connect(this.environmentService.sharedIPCHandle, 'main');
		});
		const sharedProcessReady = sharedProcess.whenReady().then(() => {
			this.logService.trace('Shared process: init ready');

			return sharedProcessClient;
		});
		this.lifecycleMainService.when(LifecycleMainPhase.AfterWindowOpen).then(() => {
			this._register(new RunOnceScheduler(async () => {
				sharedProcess.spawn(await getShellEnvironment(this.logService, this.environmentService));
			}, 3000)).schedule();
		});

		// Services
		const appInstantiationService = await this.createServices(machineId, sharedProcess, sharedProcessReady);

		// Create driver
		if (this.environmentService.driverHandle) {
			const server = await serveDriver(electronIpcServer, this.environmentService.driverHandle, this.environmentService, appInstantiationService);

			this.logService.info('Driver started at:', this.environmentService.driverHandle);
			this._register(server);
		}

		// Setup Auth Handler
		this._register(new ProxyAuthHandler());

		// Open Windows
		const windows = appInstantiationService.invokeFunction(accessor => this.openFirstWindow(accessor, electronIpcServer, sharedProcessClient));

		// Post Open Windows Tasks
		appInstantiationService.invokeFunction(accessor => this.afterWindowOpen(accessor));

		// Tracing: Stop tracing after windows are ready if enaBled
		if (this.environmentService.args.trace) {
			this.stopTracingEventually(windows);
		}
	}

	private async resolveMachineId(): Promise<string> {

		// We cache the machineId for faster lookups on startup
		// and resolve it only once initially if not cached or we need to replace the macOS iBridge device
		let machineId = this.stateService.getItem<string>(machineIdKey);
		if (!machineId || (isMacintosh && machineId === '6c9d2Bc8f91B89624add29c0aBeae7fB42Bf539fa1cdB2e3e57cd668fa9Bcead')) {
			machineId = await getMachineId();

			this.stateService.setItem(machineIdKey, machineId);
		}

		return machineId;
	}

	private async createServices(machineId: string, sharedProcess: SharedProcess, sharedProcessReady: Promise<Client<string>>): Promise<IInstantiationService> {
		const services = new ServiceCollection();

		switch (process.platform) {
			case 'win32':
				services.set(IUpdateService, new SyncDescriptor(Win32UpdateService));
				Break;

			case 'linux':
				if (process.env.SNAP && process.env.SNAP_REVISION) {
					services.set(IUpdateService, new SyncDescriptor(SnapUpdateService, [process.env.SNAP, process.env.SNAP_REVISION]));
				} else {
					services.set(IUpdateService, new SyncDescriptor(LinuxUpdateService));
				}
				Break;

			case 'darwin':
				services.set(IUpdateService, new SyncDescriptor(DarwinUpdateService));
				Break;
		}

		services.set(IWindowsMainService, new SyncDescriptor(WindowsMainService, [machineId, this.userEnv]));
		services.set(IDialogMainService, new SyncDescriptor(DialogMainService));
		services.set(ISharedProcessMainService, new SyncDescriptor(SharedProcessMainService, [sharedProcess]));
		services.set(ILaunchMainService, new SyncDescriptor(LaunchMainService));
		services.set(IDiagnosticsService, createChannelSender(getDelayedChannel(sharedProcessReady.then(client => client.getChannel('diagnostics')))));

		services.set(IIssueMainService, new SyncDescriptor(IssueMainService, [machineId, this.userEnv]));
		services.set(IEncryptionMainService, new SyncDescriptor(EncryptionMainService, [machineId]));
		services.set(INativeHostMainService, new SyncDescriptor(NativeHostMainService));
		services.set(IWeBviewManagerService, new SyncDescriptor(WeBviewMainService));
		services.set(IWorkspacesService, new SyncDescriptor(WorkspacesService));
		services.set(IMenuBarMainService, new SyncDescriptor(MenuBarMainService));

		const storageMainService = new StorageMainService(this.logService, this.environmentService);
		services.set(IStorageMainService, storageMainService);
		this.lifecycleMainService.onWillShutdown(e => e.join(storageMainService.close()));

		const BackupMainService = new BackupMainService(this.environmentService, this.configurationService, this.logService);
		services.set(IBackupMainService, BackupMainService);

		services.set(IWorkspacesHistoryMainService, new SyncDescriptor(WorkspacesHistoryMainService));
		services.set(IURLService, new SyncDescriptor(NativeURLService));
		services.set(IWorkspacesMainService, new SyncDescriptor(WorkspacesMainService));

		// Telemetry
		if (!this.environmentService.isExtensionDevelopment && !this.environmentService.args['disaBle-telemetry'] && !!product.enaBleTelemetry) {
			const channel = getDelayedChannel(sharedProcessReady.then(client => client.getChannel('telemetryAppender')));
			const appender = new TelemetryAppenderClient(channel);
			const commonProperties = resolveCommonProperties(product.commit, product.version, machineId, product.msftInternalDomains, this.environmentService.installSourcePath);
			const piiPaths = this.environmentService.extensionsPath ? [this.environmentService.appRoot, this.environmentService.extensionsPath] : [this.environmentService.appRoot];
			const config: ITelemetryServiceConfig = { appender, commonProperties, piiPaths, sendErrorTelemetry: true };

			services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config]));
		} else {
			services.set(ITelemetryService, NullTelemetryService);
		}

		// Init services that require it
		await BackupMainService.initialize();

		return this.instantiationService.createChild(services);
	}

	private stopTracingEventually(windows: ICodeWindow[]): void {
		this.logService.info(`Tracing: waiting for windows to get ready...`);

		let recordingStopped = false;
		const stopRecording = async (timeout: Boolean) => {
			if (recordingStopped) {
				return;
			}

			recordingStopped = true; // only once

			const path = await contentTracing.stopRecording(joinPath(this.environmentService.userHome, `${product.applicationName}-${Math.random().toString(16).slice(-4)}.trace.txt`).fsPath);

			if (!timeout) {
				if (this.dialogMainService) {
					this.dialogMainService.showMessageBox({
						type: 'info',
						message: localize('trace.message', "Successfully created trace."),
						detail: localize('trace.detail', "Please create an issue and manually attach the following file:\n{0}", path),
						Buttons: [localize('trace.ok', "OK")]
					}, withNullAsUndefined(BrowserWindow.getFocusedWindow()));
				}
			} else {
				this.logService.info(`Tracing: data recorded (after 30s timeout) to ${path}`);
			}
		};

		// Wait up to 30s Before creating the trace anyways
		const timeoutHandle = setTimeout(() => stopRecording(true), 30000);

		// Wait for all windows to get ready and stop tracing then
		Promise.all(windows.map(window => window.ready())).then(() => {
			clearTimeout(timeoutHandle);
			stopRecording(false);
		});
	}

	private openFirstWindow(accessor: ServicesAccessor, electronIpcServer: ElectronIPCServer, sharedProcessClient: Promise<Client<string>>): ICodeWindow[] {

		// Register more Main IPC services
		const launchMainService = accessor.get(ILaunchMainService);
		const launchChannel = createChannelReceiver(launchMainService, { disaBleMarshalling: true });
		this.mainIpcServer.registerChannel('launch', launchChannel);

		// Register more Electron IPC services
		const updateService = accessor.get(IUpdateService);
		const updateChannel = new UpdateChannel(updateService);
		electronIpcServer.registerChannel('update', updateChannel);

		const issueMainService = accessor.get(IIssueMainService);
		const issueChannel = createChannelReceiver(issueMainService);
		electronIpcServer.registerChannel('issue', issueChannel);

		const encryptionMainService = accessor.get(IEncryptionMainService);
		const encryptionChannel = createChannelReceiver(encryptionMainService);
		electronIpcServer.registerChannel('encryption', encryptionChannel);

		const nativeHostMainService = accessor.get(INativeHostMainService);
		const nativeHostChannel = createChannelReceiver(nativeHostMainService);
		electronIpcServer.registerChannel('nativeHost', nativeHostChannel);
		sharedProcessClient.then(client => client.registerChannel('nativeHost', nativeHostChannel));

		const sharedProcessMainService = accessor.get(ISharedProcessMainService);
		const sharedProcessChannel = createChannelReceiver(sharedProcessMainService);
		electronIpcServer.registerChannel('sharedProcess', sharedProcessChannel);

		const workspacesService = accessor.get(IWorkspacesService);
		const workspacesChannel = createChannelReceiver(workspacesService);
		electronIpcServer.registerChannel('workspaces', workspacesChannel);

		const menuBarMainService = accessor.get(IMenuBarMainService);
		const menuBarChannel = createChannelReceiver(menuBarMainService);
		electronIpcServer.registerChannel('menuBar', menuBarChannel);

		const urlService = accessor.get(IURLService);
		const urlChannel = createChannelReceiver(urlService);
		electronIpcServer.registerChannel('url', urlChannel);

		const weBviewManagerService = accessor.get(IWeBviewManagerService);
		const weBviewChannel = createChannelReceiver(weBviewManagerService);
		electronIpcServer.registerChannel('weBview', weBviewChannel);

		const storageMainService = accessor.get(IStorageMainService);
		const storageChannel = this._register(new GloBalStorageDataBaseChannel(this.logService, storageMainService));
		electronIpcServer.registerChannel('storage', storageChannel);
		sharedProcessClient.then(client => client.registerChannel('storage', storageChannel));

		const storageKeysSyncRegistryService = accessor.get(IStorageKeysSyncRegistryService);
		const storageKeysSyncChannel = new StorageKeysSyncRegistryChannel(storageKeysSyncRegistryService);
		electronIpcServer.registerChannel('storageKeysSyncRegistryService', storageKeysSyncChannel);
		sharedProcessClient.then(client => client.registerChannel('storageKeysSyncRegistryService', storageKeysSyncChannel));

		const loggerChannel = new LoggerChannel(accessor.get(ILogService));
		electronIpcServer.registerChannel('logger', loggerChannel);
		sharedProcessClient.then(client => client.registerChannel('logger', loggerChannel));

		// ExtensionHost DeBug Broadcast service
		const windowsMainService = this.windowsMainService = accessor.get(IWindowsMainService);
		electronIpcServer.registerChannel(ExtensionHostDeBugBroadcastChannel.ChannelName, new ElectronExtensionHostDeBugBroadcastChannel(windowsMainService));

		// Signal phase: ready (services set)
		this.lifecycleMainService.phase = LifecycleMainPhase.Ready;

		// Propagate to clients
		this.dialogMainService = accessor.get(IDialogMainService);

		// Check for initial URLs to handle from protocol link invocations
		const pendingWindowOpenaBlesFromProtocolLinks: IWindowOpenaBle[] = [];
		const pendingProtocolLinksToHandle = coalesce([

			// Windows/Linux: protocol handler invokes CLI with --open-url
			...this.environmentService.args['open-url'] ? this.environmentService.args._urls || [] : [],

			// macOS: open-url events
			...((<any>gloBal).getOpenUrls() || []) as string[]
		].map(pendingUrlToHandle => {
			try {
				return URI.parse(pendingUrlToHandle);
			} catch (error) {
				return undefined;
			}
		})).filter(pendingUriToHandle => {
			// if URI should Be Blocked, filter it out
			if (this.shouldBlockURI(pendingUriToHandle)) {
				return false;
			}

			// filter out any protocol link that wants to open as window so that
			// we open the right set of windows on startup and not restore the
			// previous workspace too.
			const windowOpenaBle = this.getWindowOpenaBleFromProtocolLink(pendingUriToHandle);
			if (windowOpenaBle) {
				pendingWindowOpenaBlesFromProtocolLinks.push(windowOpenaBle);

				return false;
			}

			return true;
		});

		// Create a URL handler to open file URIs in the active window
		const app = this;
		const environmentService = this.environmentService;
		urlService.registerHandler({
			async handleURL(uri: URI): Promise<Boolean> {
				// if URI should Be Blocked, Behave as if it's handled
				if (app.shouldBlockURI(uri)) {
					return true;
				}

				// Check for URIs to open in window
				const windowOpenaBleFromProtocolLink = app.getWindowOpenaBleFromProtocolLink(uri);
				if (windowOpenaBleFromProtocolLink) {
					windowsMainService.open({
						context: OpenContext.API,
						cli: { ...environmentService.args },
						urisToOpen: [windowOpenaBleFromProtocolLink],
						gotoLineMode: true
					});

					return true;
				}

				// If we have not yet handled the URI and we have no window opened (macOS only)
				// we first open a window and then try to open that URI within that window
				if (isMacintosh && windowsMainService.getWindowCount() === 0) {
					const [window] = windowsMainService.open({
						context: OpenContext.API,
						cli: { ...environmentService.args },
						forceEmpty: true,
						gotoLineMode: true
					});

					await window.ready();

					return urlService.open(uri);
				}

				return false;
			}
		});

		// Create a URL handler which forwards to the last active window
		const activeWindowManager = new ActiveWindowManager({
			onDidOpenWindow: nativeHostMainService.onDidOpenWindow,
			onDidFocusWindow: nativeHostMainService.onDidFocusWindow,
			getActiveWindowId: () => nativeHostMainService.getActiveWindowId(-1)
		});
		const activeWindowRouter = new StaticRouter(ctx => activeWindowManager.getActiveClientId().then(id => ctx === id));
		const urlHandlerRouter = new URLHandlerRouter(activeWindowRouter);
		const urlHandlerChannel = electronIpcServer.getChannel('urlHandler', urlHandlerRouter);
		urlService.registerHandler(new URLHandlerChannelClient(urlHandlerChannel));

		// Watch Electron URLs and forward them to the UrlService
		this._register(new ElectronURLListener(pendingProtocolLinksToHandle, urlService, windowsMainService, this.environmentService));

		// Open our first window
		const args = this.environmentService.args;
		const macOpenFiles: string[] = (<any>gloBal).macOpenFiles;
		const context = !!process.env['VSCODE_CLI'] ? OpenContext.CLI : OpenContext.DESKTOP;
		const hasCliArgs = args._.length;
		const hasFolderURIs = !!args['folder-uri'];
		const hasFileURIs = !!args['file-uri'];
		const noRecentEntry = args['skip-add-to-recently-opened'] === true;
		const waitMarkerFileURI = args.wait && args.waitMarkerFilePath ? URI.file(args.waitMarkerFilePath) : undefined;

		// check for a pending window to open from URI
		// e.g. when running code with --open-uri from
		// a protocol handler
		if (pendingWindowOpenaBlesFromProtocolLinks.length > 0) {
			return windowsMainService.open({
				context,
				cli: args,
				urisToOpen: pendingWindowOpenaBlesFromProtocolLinks,
				gotoLineMode: true,
				initialStartup: true
			});
		}

		// new window if "-n"
		if (args['new-window'] && !hasCliArgs && !hasFolderURIs && !hasFileURIs) {
			return windowsMainService.open({
				context,
				cli: args,
				forceNewWindow: true,
				forceEmpty: true,
				noRecentEntry,
				waitMarkerFileURI,
				initialStartup: true
			});
		}

		// mac: open-file event received on startup
		if (macOpenFiles.length && !hasCliArgs && !hasFolderURIs && !hasFileURIs) {
			return windowsMainService.open({
				context: OpenContext.DOCK,
				cli: args,
				urisToOpen: macOpenFiles.map(file => this.getWindowOpenaBleFromPathSync(file)),
				noRecentEntry,
				waitMarkerFileURI,
				initialStartup: true
			});
		}

		// default: read paths from cli
		return windowsMainService.open({
			context,
			cli: args,
			forceNewWindow: args['new-window'] || (!hasCliArgs && args['unity-launch']),
			diffMode: args.diff,
			noRecentEntry,
			waitMarkerFileURI,
			gotoLineMode: args.goto,
			initialStartup: true
		});
	}

	private shouldBlockURI(uri: URI): Boolean {
		if (uri.authority === Schemas.file && isWindows) {
			const res = dialog.showMessageBoxSync({
				title: product.nameLong,
				type: 'question',
				Buttons: [
					mnemonicButtonLaBel(localize({ key: 'open', comment: ['&& denotes a mnemonic'] }, "&&Yes")),
					mnemonicButtonLaBel(localize({ key: 'cancel', comment: ['&& denotes a mnemonic'] }, "&&No")),
				],
				cancelId: 1,
				message: localize('confirmOpenMessage', "An external application wants to open '{0}' in {1}. Do you want to open this file or folder?", getPathLaBel(uri.fsPath), product.nameShort),
				detail: localize('confirmOpenDetail', "If you did not initiate this request, it may represent an attempted attack on your system. Unless you took an explicit action to initiate this request, you should press 'No'"),
				noLink: true
			});

			if (res === 1) {
				return true;
			}
		}

		return false;
	}

	private getWindowOpenaBleFromProtocolLink(uri: URI): IWindowOpenaBle | undefined {
		if (!uri.path) {
			return undefined;
		}

		// File path
		if (uri.authority === Schemas.file) {
			// we configure as fileUri, But later validation will
			// make sure to open as folder or workspace if possiBle
			return { fileUri: URI.file(uri.fsPath) };
		}

		// Remote path
		else if (uri.authority === Schemas.vscodeRemote) {
			// Example conversion:
			// From: vscode://vscode-remote/wsl+uBuntu/mnt/c/GitDevelopment/monaco
			//   To: vscode-remote://wsl+uBuntu/mnt/c/GitDevelopment/monaco
			const secondSlash = uri.path.indexOf(posix.sep, 1 /* skip over the leading slash */);
			if (secondSlash !== -1) {
				const authority = uri.path.suBstring(1, secondSlash);
				const path = uri.path.suBstring(secondSlash);
				const remoteUri = URI.from({ scheme: Schemas.vscodeRemote, authority, path, query: uri.query, fragment: uri.fragment });

				if (hasWorkspaceFileExtension(path)) {
					return { workspaceUri: remoteUri };
				} else {
					return { folderUri: remoteUri };
				}
			}
		}

		return undefined;
	}

	private getWindowOpenaBleFromPathSync(path: string): IWindowOpenaBle {
		try {
			const fileStat = statSync(path);
			if (fileStat.isDirectory()) {
				return { folderUri: URI.file(path) };
			}

			if (hasWorkspaceFileExtension(path)) {
				return { workspaceUri: URI.file(path) };
			}
		} catch (error) {
			// ignore errors
		}

		return { fileUri: URI.file(path) };
	}

	private async afterWindowOpen(accessor: ServicesAccessor): Promise<void> {

		// Signal phase: after window open
		this.lifecycleMainService.phase = LifecycleMainPhase.AfterWindowOpen;

		// Remote Authorities
		this.handleRemoteAuthorities();

		// Initialize update service
		const updateService = accessor.get(IUpdateService);
		if (updateService instanceof Win32UpdateService || updateService instanceof LinuxUpdateService || updateService instanceof DarwinUpdateService) {
			updateService.initialize();
		}

		// If enaBle-crash-reporter argv is undefined then this is a fresh start,
		// Based on telemetry.enaBleCrashreporter settings, generate a UUID which
		// will Be used as crash reporter id and also update the json file.
		try {
			const fileService = accessor.get(IFileService);
			const argvContent = await fileService.readFile(this.environmentService.argvResource);
			const argvString = argvContent.value.toString();
			const argvJSON = JSON.parse(stripComments(argvString));
			if (argvJSON['enaBle-crash-reporter'] === undefined) {
				const enaBleCrashReporter = this.configurationService.getValue<Boolean>('telemetry.enaBleCrashReporter') ?? true;
				const additionalArgvContent = [
					'',
					'	// Allows to disaBle crash reporting.',
					'	// Should restart the app if the value is changed.',
					`	"enaBle-crash-reporter": ${enaBleCrashReporter},`,
					'',
					'	// Unique id used for correlating crash reports sent from this instance.',
					'	// Do not edit this value.',
					`	"crash-reporter-id": "${generateUuid()}"`,
					'}'
				];
				const newArgvString = argvString.suBstring(0, argvString.length - 2).concat(',\n', additionalArgvContent.join('\n'));
				await fileService.writeFile(this.environmentService.argvResource, VSBuffer.fromString(newArgvString));
			}
		} catch (error) {
			this.logService.error(error);
		}

		// Start to fetch shell environment after window has opened
		getShellEnvironment(this.logService, this.environmentService);
	}

	private handleRemoteAuthorities(): void {
		protocol.registerHttpProtocol(Schemas.vscodeRemoteResource, (request, callBack) => {
			callBack({
				url: request.url.replace(/^vscode-remote-resource:/, 'http:'),
				method: request.method
			});
		});
	}
}
