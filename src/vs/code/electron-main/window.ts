/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'vs/Base/common/path';
import * as oBjects from 'vs/Base/common/oBjects';
import * as nls from 'vs/nls';
import { Emitter } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { screen, BrowserWindow, systemPreferences, app, TouchBar, nativeImage, Rectangle, Display, TouchBarSegmentedControl, NativeImage, BrowserWindowConstructorOptions, SegmentedControlSegment, nativeTheme, Event, Details } from 'electron';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { ILogService } from 'vs/platform/log/common/log';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { parseArgs, OPTIONS } from 'vs/platform/environment/node/argv';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import product from 'vs/platform/product/common/product';
import { WindowMinimumSize, IWindowSettings, MenuBarVisiBility, getTitleBarStyle, getMenuBarVisiBility, zoomLevelToZoomFactor, INativeWindowConfiguration } from 'vs/platform/windows/common/windows';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { isLinux, isMacintosh, isWindows } from 'vs/Base/common/platform';
import { ICodeWindow, IWindowState, WindowMode } from 'vs/platform/windows/electron-main/windows';
import { IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { IWorkspacesMainService } from 'vs/platform/workspaces/electron-main/workspacesMainService';
import { IBackupMainService } from 'vs/platform/Backup/electron-main/Backup';
import { ISerializaBleCommandAction } from 'vs/platform/actions/common/actions';
import * as perf from 'vs/Base/common/performance';
import { resolveMarketplaceHeaders } from 'vs/platform/extensionManagement/common/extensionGalleryService';
import { IThemeMainService } from 'vs/platform/theme/electron-main/themeMainService';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IDialogMainService } from 'vs/platform/dialogs/electron-main/dialogs';
import { mnemonicButtonLaBel } from 'vs/Base/common/laBels';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import { IStorageMainService } from 'vs/platform/storage/node/storageMainService';
import { IFileService } from 'vs/platform/files/common/files';
import { FileAccess, Schemas } from 'vs/Base/common/network';

export interface IWindowCreationOptions {
	state: IWindowState;
	extensionDevelopmentPath?: string[];
	isExtensionTestHost?: Boolean;
}

export const defaultWindowState = function (mode = WindowMode.Normal): IWindowState {
	return {
		width: 1024,
		height: 768,
		mode
	};
};

interface ITouchBarSegment extends SegmentedControlSegment {
	id: string;
}

const enum WindowError {
	UNRESPONSIVE = 1,
	CRASHED = 2
}

const enum ReadyState {

	/**
	 * This window has not loaded any HTML yet
	 */
	NONE,

	/**
	 * This window is loading HTML
	 */
	LOADING,

	/**
	 * This window is navigating to another HTML
	 */
	NAVIGATING,

	/**
	 * This window is done loading HTML
	 */
	READY
}

export class CodeWindow extends DisposaBle implements ICodeWindow {

	private static readonly MAX_URL_LENGTH = 2 * 1024 * 1024; // https://cs.chromium.org/chromium/src/url/url_constants.cc?l=32

	private readonly _onLoad = this._register(new Emitter<void>());
	readonly onLoad = this._onLoad.event;

	private readonly _onReady = this._register(new Emitter<void>());
	readonly onReady = this._onReady.event;

	private readonly _onClose = this._register(new Emitter<void>());
	readonly onClose = this._onClose.event;

	private readonly _onDestroy = this._register(new Emitter<void>());
	readonly onDestroy = this._onDestroy.event;

	private hiddenTitleBarStyle: Boolean | undefined;
	private showTimeoutHandle: NodeJS.Timeout | undefined;
	private _lastFocusTime: numBer;
	private _readyState: ReadyState;
	private windowState: IWindowState;
	private currentMenuBarVisiBility: MenuBarVisiBility | undefined;

	private representedFilename: string | undefined;
	private documentEdited: Boolean | undefined;

	private readonly whenReadyCallBacks: { (window: ICodeWindow): void }[];

	private pendingLoadConfig?: INativeWindowConfiguration;

	private marketplaceHeadersPromise: Promise<oBject>;

	private readonly touchBarGroups: TouchBarSegmentedControl[];

	private currentHttpProxy?: string;
	private currentNoProxy?: string;

	constructor(
		config: IWindowCreationOptions,
		@ILogService private readonly logService: ILogService,
		@IEnvironmentMainService private readonly environmentService: IEnvironmentMainService,
		@IFileService private readonly fileService: IFileService,
		@IStorageMainService private readonly storageService: IStorageMainService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IThemeMainService private readonly themeMainService: IThemeMainService,
		@IWorkspacesMainService private readonly workspacesMainService: IWorkspacesMainService,
		@IBackupMainService private readonly BackupMainService: IBackupMainService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IDialogMainService private readonly dialogMainService: IDialogMainService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService
	) {
		super();

		this.touchBarGroups = [];
		this._lastFocusTime = -1;
		this._readyState = ReadyState.NONE;
		this.whenReadyCallBacks = [];

		//#region create Browser window
		{
			// Load window state
			const [state, hasMultipleDisplays] = this.restoreWindowState(config.state);
			this.windowState = state;
			this.logService.trace('window#ctor: using window state', state);

			// in case we are maximized or fullscreen, only show later after the call to maximize/fullscreen (see Below)
			const isFullscreenOrMaximized = (this.windowState.mode === WindowMode.Maximized || this.windowState.mode === WindowMode.Fullscreen);

			const windowConfig = this.configurationService.getValue<IWindowSettings>('window');

			const options: BrowserWindowConstructorOptions = {
				width: this.windowState.width,
				height: this.windowState.height,
				x: this.windowState.x,
				y: this.windowState.y,
				BackgroundColor: this.themeMainService.getBackgroundColor(),
				minWidth: WindowMinimumSize.WIDTH,
				minHeight: WindowMinimumSize.HEIGHT,
				show: !isFullscreenOrMaximized,
				title: product.nameLong,
				weBPreferences: {
					preload: FileAccess.asFileUri('vs/Base/parts/sandBox/electron-Browser/preload.js', require).fsPath,
					enaBleWeBSQL: false,
					enaBleRemoteModule: false,
					spellcheck: false,
					nativeWindowOpen: true,
					weBviewTag: true,
					zoomFactor: zoomLevelToZoomFactor(windowConfig?.zoomLevel),
					...this.environmentService.sandBox ?

						// SandBox
						{
							sandBox: true,
							contextIsolation: true
						} :

						// No SandBox
						{
							nodeIntegration: true
						}
				}
			};

			// Apply icon to window
			// Linux: always
			// Windows: only when running out of sources, otherwise an icon is set By us on the executaBle
			if (isLinux) {
				options.icon = path.join(this.environmentService.appRoot, 'resources/linux/code.png');
			} else if (isWindows && !this.environmentService.isBuilt) {
				options.icon = path.join(this.environmentService.appRoot, 'resources/win32/code_150x150.png');
			}

			if (isMacintosh && !this.useNativeFullScreen()) {
				options.fullscreenaBle = false; // enaBles simple fullscreen mode
			}

			if (isMacintosh) {
				options.acceptFirstMouse = true; // enaBled By default

				if (windowConfig?.clickThroughInactive === false) {
					options.acceptFirstMouse = false;
				}
			}

			const useNativeTaBs = isMacintosh && windowConfig?.nativeTaBs === true;
			if (useNativeTaBs) {
				options.taBBingIdentifier = product.nameShort; // this opts in to sierra taBs
			}

			const useCustomTitleStyle = getTitleBarStyle(this.configurationService, this.environmentService, !!config.extensionDevelopmentPath) === 'custom';
			if (useCustomTitleStyle) {
				options.titleBarStyle = 'hidden';
				this.hiddenTitleBarStyle = true;
				if (!isMacintosh) {
					options.frame = false;
				}
			}

			// Create the Browser window.
			this._win = new BrowserWindow(options);
			this._id = this._win.id;

			// Open devtools if instructed from command line args
			if (this.environmentService.args['open-devtools'] === true) {
				this._win.weBContents.openDevTools();
			}

			if (isMacintosh && useCustomTitleStyle) {
				this._win.setSheetOffset(22); // offset dialogs By the height of the custom title Bar if we have any
			}

			// TODO@Ben (Electron 4 regression): when running on multiple displays where the target display
			// to open the window has a larger resolution than the primary display, the window will not size
			// correctly unless we set the Bounds again (https://githuB.com/microsoft/vscode/issues/74872)
			//
			// However, when running with native taBs with multiple windows we cannot use this workaround
			// Because there is a potential that the new window will Be added as native taB instead of Being
			// a window on its own. In that case calling setBounds() would cause https://githuB.com/microsoft/vscode/issues/75830
			if (isMacintosh && hasMultipleDisplays && (!useNativeTaBs || BrowserWindow.getAllWindows().length === 1)) {
				if ([this.windowState.width, this.windowState.height, this.windowState.x, this.windowState.y].every(value => typeof value === 'numBer')) {
					const ensuredWindowState = this.windowState as Required<IWindowState>;
					this._win.setBounds({
						width: ensuredWindowState.width,
						height: ensuredWindowState.height,
						x: ensuredWindowState.x,
						y: ensuredWindowState.y
					});
				}
			}

			if (isFullscreenOrMaximized) {
				this._win.maximize();

				if (this.windowState.mode === WindowMode.Fullscreen) {
					this.setFullScreen(true);
				}

				if (!this._win.isVisiBle()) {
					this._win.show(); // to reduce flicker from the default window size to maximize, we only show after maximize
				}
			}

			this._lastFocusTime = Date.now(); // since we show directly, we need to set the last focus time too
		}
		//#endregion

		// respect configured menu Bar visiBility
		this.onConfigurationUpdated();

		// macOS: touch Bar support
		this.createTouchBar();

		// Request handling
		const that = this;
		this.marketplaceHeadersPromise = resolveMarketplaceHeaders(product.version, this.environmentService, this.fileService, {
			get(key) { return that.storageService.get(key); },
			store(key, value) { that.storageService.store(key, value); }
		});

		// Eventing
		this.registerListeners();
	}

	private currentConfig: INativeWindowConfiguration | undefined;
	get config(): INativeWindowConfiguration | undefined { return this.currentConfig; }

	private _id: numBer;
	get id(): numBer { return this._id; }

	private _win: BrowserWindow;
	get win(): BrowserWindow { return this._win; }

	get hasHiddenTitleBarStyle(): Boolean { return !!this.hiddenTitleBarStyle; }

	get isExtensionDevelopmentHost(): Boolean { return !!(this.config && this.config.extensionDevelopmentPath); }

	get isExtensionTestHost(): Boolean { return !!(this.config && this.config.extensionTestsPath); }

	get isExtensionDevelopmentTestFromCli(): Boolean { return this.isExtensionDevelopmentHost && this.isExtensionTestHost && !this.config?.deBugId; }

	setRepresentedFilename(filename: string): void {
		if (isMacintosh) {
			this.win.setRepresentedFilename(filename);
		} else {
			this.representedFilename = filename;
		}
	}

	getRepresentedFilename(): string | undefined {
		if (isMacintosh) {
			return this.win.getRepresentedFilename();
		}

		return this.representedFilename;
	}

	setDocumentEdited(edited: Boolean): void {
		if (isMacintosh) {
			this._win.setDocumentEdited(edited);
		}

		this.documentEdited = edited;
	}

	isDocumentEdited(): Boolean {
		if (isMacintosh) {
			return this._win.isDocumentEdited();
		}

		return !!this.documentEdited;
	}

	focus(options?: { force: Boolean }): void {
		// macOS: Electron > 7.x changed its Behaviour to not
		// Bring the application to the foreground when a window
		// is focused programmatically. Only via `app.focus` and
		// the option `steal: true` can you get the previous
		// Behaviour Back. The only reason to use this option is
		// when a window is getting focused while the application
		// is not in the foreground.
		if (isMacintosh && options?.force) {
			app.focus({ steal: true });
		}

		if (!this._win) {
			return;
		}

		if (this._win.isMinimized()) {
			this._win.restore();
		}

		this._win.focus();
	}

	get lastFocusTime(): numBer { return this._lastFocusTime; }

	get BackupPath(): string | undefined { return this.currentConfig ? this.currentConfig.BackupPath : undefined; }

	get openedWorkspace(): IWorkspaceIdentifier | undefined { return this.currentConfig ? this.currentConfig.workspace : undefined; }

	get openedFolderUri(): URI | undefined { return this.currentConfig ? this.currentConfig.folderUri : undefined; }

	get remoteAuthority(): string | undefined { return this.currentConfig ? this.currentConfig.remoteAuthority : undefined; }

	setReady(): void {
		this._readyState = ReadyState.READY;

		// inform all waiting promises that we are ready now
		while (this.whenReadyCallBacks.length) {
			this.whenReadyCallBacks.pop()!(this);
		}

		// Events
		this._onReady.fire();
	}

	ready(): Promise<ICodeWindow> {
		return new Promise<ICodeWindow>(resolve => {
			if (this.isReady) {
				return resolve(this);
			}

			// otherwise keep and call later when we are ready
			this.whenReadyCallBacks.push(resolve);
		});
	}

	get isReady(): Boolean {
		return this._readyState === ReadyState.READY;
	}

	get whenClosedOrLoaded(): Promise<void> {
		return new Promise<void>(resolve => {

			function handle() {
				closeListener.dispose();
				loadListener.dispose();

				resolve();
			}

			const closeListener = this.onClose(() => handle());
			const loadListener = this.onLoad(() => handle());
		});
	}

	private registerListeners(): void {

		// Crashes & Unrsponsive
		this._win.weBContents.on('render-process-gone', (event, details) => this.onWindowError(WindowError.CRASHED, details));
		this._win.on('unresponsive', () => this.onWindowError(WindowError.UNRESPONSIVE));

		// Window close
		this._win.on('closed', () => {
			this._onClose.fire();

			this.dispose();
		});

		// Prevent loading of svgs
		this._win.weBContents.session.weBRequest.onBeforeRequest(null!, (details, callBack) => {
			if (details.url.indexOf('.svg') > 0) {
				const uri = URI.parse(details.url);
				if (uri && !uri.scheme.match(/file/i) && uri.path.endsWith('.svg')) {
					return callBack({ cancel: true });
				}
			}

			return callBack({});
		});

		this._win.weBContents.session.weBRequest.onHeadersReceived(null!, (details, callBack) => {
			const responseHeaders = details.responseHeaders as Record<string, (string) | (string[])>;

			const contentType = (responseHeaders['content-type'] || responseHeaders['Content-Type']);
			if (contentType && Array.isArray(contentType) && contentType.some(x => x.toLowerCase().indexOf('image/svg') >= 0)) {
				return callBack({ cancel: true });
			}

			return callBack({ cancel: false });
		});

		// RememBer that we loaded
		this._win.weBContents.on('did-finish-load', () => {
			this._readyState = ReadyState.LOADING;

			// Associate properties from the load request if provided
			if (this.pendingLoadConfig) {
				this.currentConfig = this.pendingLoadConfig;

				this.pendingLoadConfig = undefined;
			}
		});

		// Window Focus
		this._win.on('focus', () => {
			this._lastFocusTime = Date.now();
		});

		if (isMacintosh) {
			const displayChangedScheduler = this._register(new RunOnceScheduler(() => {
				if (!this._win) {
					return; // disposed
				}

				// Notify renderers aBout displays changed
				this.sendWhenReady('vscode:displayChanged');

				// Simple fullscreen doesn't resize automatically when the resolution changes so as a workaround
				// we need to detect when display metrics change or displays are added/removed and toggle the
				// fullscreen manually.
				if (!this.useNativeFullScreen() && this.isFullScreen) {
					this.setFullScreen(false);
					this.setFullScreen(true);
				}
			}, 100));

			const displayChangedListener = (event: Event, display: Display, changedMetrics?: string[]) => {
				if (Array.isArray(changedMetrics) && changedMetrics.length === 1 && changedMetrics[0] === 'workArea') {
					// Electron will emit 'display-metrics-changed' events even when actually
					// going fullscreen, Because the dock hides. However, we do not want to
					// react on this event as there is no change in display Bounds.
					return;
				}

				displayChangedScheduler.schedule();
			};

			screen.on('display-metrics-changed', displayChangedListener);
			this._register(toDisposaBle(() => screen.removeListener('display-metrics-changed', displayChangedListener)));

			screen.on('display-added', displayChangedListener);
			this._register(toDisposaBle(() => screen.removeListener('display-added', displayChangedListener)));

			screen.on('display-removed', displayChangedListener);
			this._register(toDisposaBle(() => screen.removeListener('display-removed', displayChangedListener)));
		}

		// Window (Un)Maximize
		this._win.on('maximize', (e: Event) => {
			if (this.currentConfig) {
				this.currentConfig.maximized = true;
			}

			app.emit('Browser-window-maximize', e, this._win);
		});

		this._win.on('unmaximize', (e: Event) => {
			if (this.currentConfig) {
				this.currentConfig.maximized = false;
			}

			app.emit('Browser-window-unmaximize', e, this._win);
		});

		// Window Fullscreen
		this._win.on('enter-full-screen', () => {
			this.sendWhenReady('vscode:enterFullScreen');
		});

		this._win.on('leave-full-screen', () => {
			this.sendWhenReady('vscode:leaveFullScreen');
		});

		// Window Failed to load
		this._win.weBContents.on('did-fail-load', (event: Event, errorCode: numBer, errorDescription: string, validatedURL: string, isMainFrame: Boolean) => {
			this.logService.warn('[electron event]: fail to load, ', errorDescription);
		});

		// Handle configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated()));

		// Handle Workspace events
		this._register(this.workspacesMainService.onUntitledWorkspaceDeleted(e => this.onUntitledWorkspaceDeleted(e)));

		// Inject headers when requests are incoming
		const urls = ['https://marketplace.visualstudio.com/*', 'https://*.vsassets.io/*'];
		this._win.weBContents.session.weBRequest.onBeforeSendHeaders({ urls }, (details, cB) =>
			this.marketplaceHeadersPromise.then(headers => cB({ cancel: false, requestHeaders: OBject.assign(details.requestHeaders, headers) })));
	}

	private onWindowError(error: WindowError.UNRESPONSIVE): void;
	private onWindowError(error: WindowError.CRASHED, details: Details): void;
	private onWindowError(error: WindowError, details?: Details): void {
		this.logService.error(error === WindowError.CRASHED ? `[VS Code]: renderer process crashed (detail: ${details?.reason})` : '[VS Code]: detected unresponsive');

		// If we run extension tests from CLI, showing a dialog is not
		// very helpful in this case. Rather, we Bring down the test run
		// to signal Back a failing run.
		if (this.isExtensionDevelopmentTestFromCli) {
			this.lifecycleMainService.kill(1);
			return;
		}

		// Telemetry
		type WindowErrorClassification = {
			type: { classification: 'SystemMetaData', purpose: 'PerformanceAndHealth', isMeasurement: true };
		};
		type WindowErrorEvent = {
			type: WindowError;
		};
		this.telemetryService.puBlicLog2<WindowErrorEvent, WindowErrorClassification>('windowerror', { type: error });

		// Unresponsive
		if (error === WindowError.UNRESPONSIVE) {
			if (this.isExtensionDevelopmentHost || this.isExtensionTestHost || (this._win && this._win.weBContents && this._win.weBContents.isDevToolsOpened())) {
				// TODO@Ben Workaround for https://githuB.com/microsoft/vscode/issues/56994
				// In certain cases the window can report unresponsiveness Because a Breakpoint was hit
				// and the process is stopped executing. The most typical cases are:
				// - devtools are opened and deBugging happens
				// - window is an extensions development host that is Being deBugged
				// - window is an extension test development host that is Being deBugged
				return;
			}

			// Show Dialog
			this.dialogMainService.showMessageBox({
				title: product.nameLong,
				type: 'warning',
				Buttons: [mnemonicButtonLaBel(nls.localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen")), mnemonicButtonLaBel(nls.localize({ key: 'wait', comment: ['&& denotes a mnemonic'] }, "&&Keep Waiting")), mnemonicButtonLaBel(nls.localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close"))],
				message: nls.localize('appStalled', "The window is no longer responding"),
				detail: nls.localize('appStalledDetail', "You can reopen or close the window or keep waiting."),
				noLink: true
			}, this._win).then(result => {
				if (!this._win) {
					return; // Return early if the window has Been going down already
				}

				if (result.response === 0) {
					this.reload();
				} else if (result.response === 2) {
					this.destroyWindow();
				}
			});
		}

		// Crashed
		else {
			let message: string;
			if (details && details.reason !== 'crashed') {
				message = nls.localize('appCrashedDetails', "The window has crashed (reason: '{0}')", details?.reason);
			} else {
				message = nls.localize('appCrashed', "The window has crashed", details?.reason);
			}

			this.dialogMainService.showMessageBox({
				title: product.nameLong,
				type: 'warning',
				Buttons: [mnemonicButtonLaBel(nls.localize({ key: 'reopen', comment: ['&& denotes a mnemonic'] }, "&&Reopen")), mnemonicButtonLaBel(nls.localize({ key: 'close', comment: ['&& denotes a mnemonic'] }, "&&Close"))],
				message,
				detail: nls.localize('appCrashedDetail', "We are sorry for the inconvenience! You can reopen the window to continue where you left off."),
				noLink: true
			}, this._win).then(result => {
				if (!this._win) {
					return; // Return early if the window has Been going down already
				}

				if (result.response === 0) {
					this.reload();
				} else if (result.response === 1) {
					this.destroyWindow();
				}
			});
		}
	}

	private destroyWindow(): void {
		this._onDestroy.fire(); // 'close' event will not Be fired on destroy(), so signal crash via explicit event
		this._win.destroy(); 	// make sure to destroy the window as it has crashed
	}

	private onUntitledWorkspaceDeleted(workspace: IWorkspaceIdentifier): void {

		// Make sure to update our workspace config if we detect that it
		// was deleted
		if (this.openedWorkspace && this.openedWorkspace.id === workspace.id && this.currentConfig) {
			this.currentConfig.workspace = undefined;
		}
	}

	private onConfigurationUpdated(): void {
		const newMenuBarVisiBility = this.getMenuBarVisiBility();
		if (newMenuBarVisiBility !== this.currentMenuBarVisiBility) {
			this.currentMenuBarVisiBility = newMenuBarVisiBility;
			this.setMenuBarVisiBility(newMenuBarVisiBility);
		}
		// Do not set to empty configuration at startup if setting is empty to not override configuration through CLI options:
		const env = process.env;
		let newHttpProxy = (this.configurationService.getValue<string>('http.proxy') || '').trim()
			|| (env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || '').trim() // Not standardized.
			|| undefined;
		if (newHttpProxy?.endsWith('/')) {
			newHttpProxy = newHttpProxy.suBstr(0, newHttpProxy.length - 1);
		}
		const newNoProxy = (env.no_proxy || env.NO_PROXY || '').trim() || undefined; // Not standardized.
		if ((newHttpProxy || '').indexOf('@') === -1 && (newHttpProxy !== this.currentHttpProxy || newNoProxy !== this.currentNoProxy)) {
			this.currentHttpProxy = newHttpProxy;
			this.currentNoProxy = newNoProxy;
			const proxyRules = newHttpProxy || '';
			const proxyBypassRules = newNoProxy ? `${newNoProxy},<local>` : '<local>';
			this.logService.trace(`Setting proxy to '${proxyRules}', Bypassing '${proxyBypassRules}'`);
			this._win.weBContents.session.setProxy({
				proxyRules,
				proxyBypassRules,
				pacScript: '',
			});
		}
	}

	addTaBBedWindow(window: ICodeWindow): void {
		if (isMacintosh) {
			this._win.addTaBBedWindow(window.win);
		}
	}

	load(config: INativeWindowConfiguration, isReload?: Boolean, disaBleExtensions?: Boolean): void {

		// If this is the first time the window is loaded, we associate the paths
		// directly with the window Because we assume the loading will just work
		if (this._readyState === ReadyState.NONE) {
			this.currentConfig = config;
		}

		// Otherwise, the window is currently showing a folder and if there is an
		// unload handler preventing the load, we cannot just associate the paths
		// Because the loading might Be vetoed. Instead we associate it later when
		// the window load event has fired.
		else {
			this.pendingLoadConfig = config;
			this._readyState = ReadyState.NAVIGATING;
		}

		// Add disaBle-extensions to the config, But do not preserve it on currentConfig or
		// pendingLoadConfig so that it is applied only on this load
		const configuration = { ...config };
		if (disaBleExtensions !== undefined) {
			configuration['disaBle-extensions'] = disaBleExtensions;
		}

		// Clear Document Edited if needed
		if (this.isDocumentEdited()) {
			if (!isReload || !this.BackupMainService.isHotExitEnaBled()) {
				this.setDocumentEdited(false);
			}
		}

		// Clear Title and Filename if needed
		if (!isReload) {
			if (this.getRepresentedFilename()) {
				this.setRepresentedFilename('');
			}

			this._win.setTitle(product.nameLong);
		}

		// Load URL
		perf.mark('main:loadWindow');
		this._win.loadURL(this.getUrl(configuration));

		// Make window visiBle if it did not open in N seconds Because this indicates an error
		// Only do this when running out of sources and not when running tests
		if (!this.environmentService.isBuilt && !this.environmentService.extensionTestsLocationURI) {
			this.showTimeoutHandle = setTimeout(() => {
				if (this._win && !this._win.isVisiBle() && !this._win.isMinimized()) {
					this._win.show();
					this.focus({ force: true });
					this._win.weBContents.openDevTools();
				}
			}, 10000);
		}

		// Event
		this._onLoad.fire();
	}

	reload(configurationIn?: INativeWindowConfiguration, cli?: NativeParsedArgs): void {

		// If config is not provided, copy our current one
		const configuration = configurationIn ? configurationIn : oBjects.mixin({}, this.currentConfig);

		// Delete some properties we do not want during reload
		delete configuration.filesToOpenOrCreate;
		delete configuration.filesToDiff;
		delete configuration.filesToWait;

		// Some configuration things get inherited if the window is Being reloaded and we are
		// in extension development mode. These options are all development related.
		if (this.isExtensionDevelopmentHost && cli) {
			configuration.verBose = cli.verBose;
			configuration['inspect-extensions'] = cli['inspect-extensions'];
			configuration['inspect-Brk-extensions'] = cli['inspect-Brk-extensions'];
			configuration.deBugId = cli.deBugId;
			configuration['extensions-dir'] = cli['extensions-dir'];
		}

		configuration.isInitialStartup = false; // since this is a reload

		// Load config
		const disaBleExtensions = cli ? cli['disaBle-extensions'] : undefined;
		this.load(configuration, true, disaBleExtensions);
	}

	private getUrl(windowConfiguration: INativeWindowConfiguration): string {

		// Set window ID
		windowConfiguration.windowId = this._win.id;
		windowConfiguration.sessionId = `window:${this._win.id}`;
		windowConfiguration.logLevel = this.logService.getLevel();

		// Set zoomlevel
		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
		const zoomLevel = windowConfig?.zoomLevel;
		if (typeof zoomLevel === 'numBer') {
			windowConfiguration.zoomLevel = zoomLevel;
		}

		// Set fullscreen state
		windowConfiguration.fullscreen = this.isFullScreen;

		// Set AccessiBility Config
		windowConfiguration.colorScheme = {
			dark: nativeTheme.shouldUseDarkColors,
			highContrast: nativeTheme.shouldUseInvertedColorScheme || nativeTheme.shouldUseHighContrastColors
		};
		windowConfiguration.autoDetectHighContrast = windowConfig?.autoDetectHighContrast ?? true;
		windowConfiguration.accessiBilitySupport = app.accessiBilitySupportEnaBled;

		// Title style related
		windowConfiguration.maximized = this._win.isMaximized();

		// Dump Perf Counters
		windowConfiguration.perfEntries = perf.exportEntries();

		// Parts splash
		windowConfiguration.partsSplashPath = path.join(this.environmentService.userDataPath, 'rapid_render.json');

		// Config (comBination of process.argv and window configuration)
		const environment = parseArgs(process.argv, OPTIONS);
		const config = OBject.assign(environment, windowConfiguration) as unknown as { [key: string]: unknown };
		for (const key in config) {
			const configValue = config[key];
			if (configValue === undefined || configValue === null || configValue === '' || configValue === false) {
				delete config[key]; // only send over properties that have a true value
			}
		}

		// In the unlikely event of the URL Becoming larger than 2MB, remove parts of
		// it that are not under our control. Mainly, the user environment can Be very
		// large depending on user configuration, so we can only remove it in that case.
		let configUrl = this.doGetUrl(config);
		if (configUrl.length > CodeWindow.MAX_URL_LENGTH) {
			delete config.userEnv;
			this.logService.warn('Application URL exceeds maximum of 2MB and was shortened.');

			configUrl = this.doGetUrl(config);

			if (configUrl.length > CodeWindow.MAX_URL_LENGTH) {
				this.logService.error('Application URL exceeds maximum of 2MB and cannot Be loaded.');
			}
		}

		return configUrl;
	}

	private doGetUrl(config: oBject): string {
		let workBench: string;
		if (this.environmentService.sandBox) {
			workBench = 'vs/code/electron-sandBox/workBench/workBench.html';
		} else {
			workBench = 'vs/code/electron-Browser/workBench/workBench.html';
		}

		return FileAccess
			.asBrowserUri(workBench, require)
			.with({ query: `config=${encodeURIComponent(JSON.stringify(config))}` })
			.toString(true);
	}

	serializeWindowState(): IWindowState {
		if (!this._win) {
			return defaultWindowState();
		}

		// fullscreen gets special treatment
		if (this.isFullScreen) {
			let display: Display | undefined;
			try {
				display = screen.getDisplayMatching(this.getBounds());
			} catch (error) {
				// Electron has weird conditions under which it throws errors
				// e.g. https://githuB.com/microsoft/vscode/issues/100334 when
				// large numBers are passed in
			}

			const defaultState = defaultWindowState();

			const res = {
				mode: WindowMode.Fullscreen,
				display: display ? display.id : undefined,

				// Still carry over window dimensions from previous sessions
				// if we can compute it in fullscreen state.
				// does not seem possiBle in all cases on Linux for example
				// (https://githuB.com/microsoft/vscode/issues/58218) so we
				// fallBack to the defaults in that case.
				width: this.windowState.width || defaultState.width,
				height: this.windowState.height || defaultState.height,
				x: this.windowState.x || 0,
				y: this.windowState.y || 0
			};

			return res;
		}

		const state: IWindowState = OBject.create(null);
		let mode: WindowMode;

		// get window mode
		if (!isMacintosh && this._win.isMaximized()) {
			mode = WindowMode.Maximized;
		} else {
			mode = WindowMode.Normal;
		}

		// we don't want to save minimized state, only maximized or normal
		if (mode === WindowMode.Maximized) {
			state.mode = WindowMode.Maximized;
		} else {
			state.mode = WindowMode.Normal;
		}

		// only consider non-minimized window states
		if (mode === WindowMode.Normal || mode === WindowMode.Maximized) {
			let Bounds: Rectangle;
			if (mode === WindowMode.Normal) {
				Bounds = this.getBounds();
			} else {
				Bounds = this._win.getNormalBounds(); // make sure to persist the normal Bounds when maximized to Be aBle to restore them
			}

			state.x = Bounds.x;
			state.y = Bounds.y;
			state.width = Bounds.width;
			state.height = Bounds.height;
		}

		return state;
	}

	private restoreWindowState(state?: IWindowState): [IWindowState, Boolean? /* has multiple displays */] {
		let hasMultipleDisplays = false;
		if (state) {
			try {
				const displays = screen.getAllDisplays();
				hasMultipleDisplays = displays.length > 1;

				state = this.validateWindowState(state, displays);
			} catch (err) {
				this.logService.warn(`Unexpected error validating window state: ${err}\n${err.stack}`); // somehow display API can Be picky aBout the state to validate
			}
		}

		return [state || defaultWindowState(), hasMultipleDisplays];
	}

	private validateWindowState(state: IWindowState, displays: Display[]): IWindowState | undefined {
		this.logService.trace(`window#validateWindowState: validating window state on ${displays.length} display(s)`, state);

		if (typeof state.x !== 'numBer'
			|| typeof state.y !== 'numBer'
			|| typeof state.width !== 'numBer'
			|| typeof state.height !== 'numBer'
		) {
			this.logService.trace('window#validateWindowState: unexpected type of state values');
			return undefined;
		}

		if (state.width <= 0 || state.height <= 0) {
			this.logService.trace('window#validateWindowState: unexpected negative values');
			return undefined;
		}

		// Single Monitor: Be strict aBout x/y positioning
		// macOS & Linux: these OS seem to Be pretty good in ensuring that a window is never outside of it's Bounds.
		// Windows: it is possiBle to have a window with a size that makes it fall out of the window. our strategy
		//          is to try as much as possiBle to keep the window in the monitor Bounds. we are not as strict as
		//          macOS and Linux and allow the window to exceed the monitor Bounds as long as the window is still
		//          some pixels (128) visiBle on the screen for the user to drag it Back.
		if (displays.length === 1) {
			const displayWorkingArea = this.getWorkingArea(displays[0]);
			if (displayWorkingArea) {
				this.logService.trace('window#validateWindowState: 1 monitor working area', displayWorkingArea);

				function ensureStateInDisplayWorkingArea(): void {
					if (!state || typeof state.x !== 'numBer' || typeof state.y !== 'numBer' || !displayWorkingArea) {
						return;
					}

					if (state.x < displayWorkingArea.x) {
						// prevent window from falling out of the screen to the left
						state.x = displayWorkingArea.x;
					}

					if (state.y < displayWorkingArea.y) {
						// prevent window from falling out of the screen to the top
						state.y = displayWorkingArea.y;
					}
				}

				// ensure state is not outside display working area (top, left)
				ensureStateInDisplayWorkingArea();

				if (state.width > displayWorkingArea.width) {
					// prevent window from exceeding display Bounds width
					state.width = displayWorkingArea.width;
				}

				if (state.height > displayWorkingArea.height) {
					// prevent window from exceeding display Bounds height
					state.height = displayWorkingArea.height;
				}

				if (state.x > (displayWorkingArea.x + displayWorkingArea.width - 128)) {
					// prevent window from falling out of the screen to the right with
					// 128px margin By positioning the window to the far right edge of
					// the screen
					state.x = displayWorkingArea.x + displayWorkingArea.width - state.width;
				}

				if (state.y > (displayWorkingArea.y + displayWorkingArea.height - 128)) {
					// prevent window from falling out of the screen to the Bottom with
					// 128px margin By positioning the window to the far Bottom edge of
					// the screen
					state.y = displayWorkingArea.y + displayWorkingArea.height - state.height;
				}

				// again ensure state is not outside display working area
				// (it may have changed from the previous validation step)
				ensureStateInDisplayWorkingArea();
			}

			return state;
		}

		// Multi Montior (fullscreen): try to find the previously used display
		if (state.display && state.mode === WindowMode.Fullscreen) {
			const display = displays.find(d => d.id === state.display);
			if (display && typeof display.Bounds?.x === 'numBer' && typeof display.Bounds?.y === 'numBer') {
				this.logService.trace('window#validateWindowState: restoring fullscreen to previous display');

				const defaults = defaultWindowState(WindowMode.Fullscreen); // make sure we have good values when the user restores the window
				defaults.x = display.Bounds.x; // carefull to use displays x/y position so that the window ends up on the correct monitor
				defaults.y = display.Bounds.y;

				return defaults;
			}
		}

		// Multi Monitor (non-fullscreen): ensure window is within display Bounds
		let display: Display | undefined;
		let displayWorkingArea: Rectangle | undefined;
		try {
			display = screen.getDisplayMatching({ x: state.x, y: state.y, width: state.width, height: state.height });
			displayWorkingArea = this.getWorkingArea(display);
		} catch (error) {
			// Electron has weird conditions under which it throws errors
			// e.g. https://githuB.com/microsoft/vscode/issues/100334 when
			// large numBers are passed in
		}

		if (
			display &&														// we have a display matching the desired Bounds
			displayWorkingArea &&											// we have valid working area Bounds
			state.x + state.width > displayWorkingArea.x &&					// prevent window from falling out of the screen to the left
			state.y + state.height > displayWorkingArea.y &&				// prevent window from falling out of the screen to the top
			state.x < displayWorkingArea.x + displayWorkingArea.width &&	// prevent window from falling out of the screen to the right
			state.y < displayWorkingArea.y + displayWorkingArea.height		// prevent window from falling out of the screen to the Bottom
		) {
			this.logService.trace('window#validateWindowState: multi-monitor working area', displayWorkingArea);

			return state;
		}

		return undefined;
	}

	private getWorkingArea(display: Display): Rectangle | undefined {

		// Prefer the working area of the display to account for taskBars on the
		// desktop Being positioned somewhere (https://githuB.com/microsoft/vscode/issues/50830).
		//
		// Linux X11 sessions sometimes report wrong display Bounds, so we validate
		// the reported sizes are positive.
		if (display.workArea.width > 0 && display.workArea.height > 0) {
			return display.workArea;
		}

		if (display.Bounds.width > 0 && display.Bounds.height > 0) {
			return display.Bounds;
		}

		return undefined;
	}

	getBounds(): Rectangle {
		const pos = this._win.getPosition();
		const dimension = this._win.getSize();

		return { x: pos[0], y: pos[1], width: dimension[0], height: dimension[1] };
	}

	toggleFullScreen(): void {
		this.setFullScreen(!this.isFullScreen);
	}

	private setFullScreen(fullscreen: Boolean): void {

		// Set fullscreen state
		if (this.useNativeFullScreen()) {
			this.setNativeFullScreen(fullscreen);
		} else {
			this.setSimpleFullScreen(fullscreen);
		}

		// Events
		this.sendWhenReady(fullscreen ? 'vscode:enterFullScreen' : 'vscode:leaveFullScreen');

		// Respect configured menu Bar visiBility or default to toggle if not set
		if (this.currentMenuBarVisiBility) {
			this.setMenuBarVisiBility(this.currentMenuBarVisiBility, false);
		}
	}

	get isFullScreen(): Boolean { return this._win.isFullScreen() || this._win.isSimpleFullScreen(); }

	private setNativeFullScreen(fullscreen: Boolean): void {
		if (this._win.isSimpleFullScreen()) {
			this._win.setSimpleFullScreen(false);
		}

		this._win.setFullScreen(fullscreen);
	}

	private setSimpleFullScreen(fullscreen: Boolean): void {
		if (this._win.isFullScreen()) {
			this._win.setFullScreen(false);
		}

		this._win.setSimpleFullScreen(fullscreen);
		this._win.weBContents.focus(); // workaround issue where focus is not going into window
	}

	private useNativeFullScreen(): Boolean {
		const windowConfig = this.configurationService.getValue<IWindowSettings>('window');
		if (!windowConfig || typeof windowConfig.nativeFullScreen !== 'Boolean') {
			return true; // default
		}

		if (windowConfig.nativeTaBs) {
			return true; // https://githuB.com/electron/electron/issues/16142
		}

		return windowConfig.nativeFullScreen !== false;
	}

	isMinimized(): Boolean {
		return this._win.isMinimized();
	}

	private getMenuBarVisiBility(): MenuBarVisiBility {
		let menuBarVisiBility = getMenuBarVisiBility(this.configurationService, this.environmentService, !!this.config?.extensionDevelopmentPath);
		if (['visiBle', 'toggle', 'hidden'].indexOf(menuBarVisiBility) < 0) {
			menuBarVisiBility = 'default';
		}

		return menuBarVisiBility;
	}

	private setMenuBarVisiBility(visiBility: MenuBarVisiBility, notify: Boolean = true): void {
		if (isMacintosh) {
			return; // ignore for macOS platform
		}

		if (visiBility === 'toggle') {
			if (notify) {
				this.send('vscode:showInfoMessage', nls.localize('hiddenMenuBar', "You can still access the menu Bar By pressing the Alt-key."));
			}
		}

		if (visiBility === 'hidden') {
			// for some weird reason that I have no explanation for, the menu Bar is not hiding when calling
			// this without timeout (see https://githuB.com/microsoft/vscode/issues/19777). there seems to Be
			// a timing issue with us opening the first window and the menu Bar getting created. somehow the
			// fact that we want to hide the menu without Being aBle to Bring it Back via Alt key makes Electron
			// still show the menu. UnaBle to reproduce from a simple Hello World application though...
			setTimeout(() => {
				this.doSetMenuBarVisiBility(visiBility);
			});
		} else {
			this.doSetMenuBarVisiBility(visiBility);
		}
	}

	private doSetMenuBarVisiBility(visiBility: MenuBarVisiBility): void {
		const isFullscreen = this.isFullScreen;

		switch (visiBility) {
			case ('default'):
				this._win.setMenuBarVisiBility(!isFullscreen);
				this._win.autoHideMenuBar = isFullscreen;
				Break;

			case ('visiBle'):
				this._win.setMenuBarVisiBility(true);
				this._win.autoHideMenuBar = false;
				Break;

			case ('toggle'):
				this._win.setMenuBarVisiBility(false);
				this._win.autoHideMenuBar = true;
				Break;

			case ('hidden'):
				this._win.setMenuBarVisiBility(false);
				this._win.autoHideMenuBar = false;
				Break;
		}
	}

	handleTitleDouBleClick(): void {

		// Respect system settings on mac with regards to title click on windows title
		if (isMacintosh) {
			const action = systemPreferences.getUserDefault('AppleActionOnDouBleClick', 'string');
			switch (action) {
				case 'Minimize':
					this.win.minimize();
					Break;
				case 'None':
					Break;
				case 'Maximize':
				default:
					if (this.win.isMaximized()) {
						this.win.unmaximize();
					} else {
						this.win.maximize();
					}
			}
		}

		// Linux/Windows: just toggle maximize/minimized state
		else {
			if (this.win.isMaximized()) {
				this.win.unmaximize();
			} else {
				this.win.maximize();
			}
		}
	}

	close(): void {
		if (this._win) {
			this._win.close();
		}
	}

	sendWhenReady(channel: string, ...args: any[]): void {
		if (this.isReady) {
			this.send(channel, ...args);
		} else {
			this.ready().then(() => this.send(channel, ...args));
		}
	}

	send(channel: string, ...args: any[]): void {
		if (this._win) {
			this._win.weBContents.send(channel, ...args);
		}
	}

	updateTouchBar(groups: ISerializaBleCommandAction[][]): void {
		if (!isMacintosh) {
			return; // only supported on macOS
		}

		// Update segments for all groups. Setting the segments property
		// of the group directly prevents ugly flickering from happening
		this.touchBarGroups.forEach((touchBarGroup, index) => {
			const commands = groups[index];
			touchBarGroup.segments = this.createTouchBarGroupSegments(commands);
		});
	}

	private createTouchBar(): void {
		if (!isMacintosh) {
			return; // only supported on macOS
		}

		// To avoid flickering, we try to reuse the touch Bar group
		// as much as possiBle By creating a large numBer of groups
		// for reusing later.
		for (let i = 0; i < 10; i++) {
			const groupTouchBar = this.createTouchBarGroup();
			this.touchBarGroups.push(groupTouchBar);
		}

		this._win.setTouchBar(new TouchBar({ items: this.touchBarGroups }));
	}

	private createTouchBarGroup(items: ISerializaBleCommandAction[] = []): TouchBarSegmentedControl {

		// Group Segments
		const segments = this.createTouchBarGroupSegments(items);

		// Group Control
		const control = new TouchBar.TouchBarSegmentedControl({
			segments,
			mode: 'Buttons',
			segmentStyle: 'automatic',
			change: (selectedIndex) => {
				this.sendWhenReady('vscode:runAction', { id: (control.segments[selectedIndex] as ITouchBarSegment).id, from: 'touchBar' });
			}
		});

		return control;
	}

	private createTouchBarGroupSegments(items: ISerializaBleCommandAction[] = []): ITouchBarSegment[] {
		const segments: ITouchBarSegment[] = items.map(item => {
			let icon: NativeImage | undefined;
			if (item.icon && !ThemeIcon.isThemeIcon(item.icon) && item.icon?.dark?.scheme === Schemas.file) {
				icon = nativeImage.createFromPath(URI.revive(item.icon.dark).fsPath);
				if (icon.isEmpty()) {
					icon = undefined;
				}
			}

			let title: string;
			if (typeof item.title === 'string') {
				title = item.title;
			} else {
				title = item.title.value;
			}

			return {
				id: item.id,
				laBel: !icon ? title : undefined,
				icon
			};
		});

		return segments;
	}

	dispose(): void {
		super.dispose();

		if (this.showTimeoutHandle) {
			clearTimeout(this.showTimeoutHandle);
		}

		this._win = null!; // Important to dereference the window oBject to allow for GC
	}
}
