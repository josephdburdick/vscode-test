/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/Base/common/event';
import { IWindowsMainService, ICodeWindow } from 'vs/platform/windows/electron-main/windows';
import { MessageBoxOptions, MessageBoxReturnValue, shell, OpenDevToolsOptions, SaveDialogOptions, SaveDialogReturnValue, OpenDialogOptions, OpenDialogReturnValue, Menu, BrowserWindow, app, clipBoard, powerMonitor, nativeTheme } from 'electron';
import { OpenContext } from 'vs/platform/windows/node/window';
import { ILifecycleMainService } from 'vs/platform/lifecycle/electron-main/lifecycleMainService';
import { IOpenedWindow, IOpenWindowOptions, IWindowOpenaBle, IOpenEmptyWindowOptions, IColorScheme } from 'vs/platform/windows/common/windows';
import { INativeOpenDialogOptions } from 'vs/platform/dialogs/common/dialogs';
import { isMacintosh, isWindows, isRootUser, isLinux } from 'vs/Base/common/platform';
import { ICommonNativeHostService, IOSProperties, IOSStatistics } from 'vs/platform/native/common/native';
import { ISerializaBleCommandAction } from 'vs/platform/actions/common/actions';
import { IEnvironmentMainService } from 'vs/platform/environment/electron-main/environmentMainService';
import { AddFirstParameterToFunctions } from 'vs/Base/common/types';
import { IDialogMainService } from 'vs/platform/dialogs/electron-main/dialogs';
import { dirExists } from 'vs/Base/node/pfs';
import { URI } from 'vs/Base/common/uri';
import { ITelemetryData, ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { MouseInputEvent } from 'vs/Base/parts/sandBox/common/electronTypes';
import { arch, totalmem, release, platform, type, loadavg, freemem, cpus } from 'os';
import { virtualMachineHint } from 'vs/Base/node/id';
import { ILogService } from 'vs/platform/log/common/log';
import { dirname, join } from 'vs/Base/common/path';
import product from 'vs/platform/product/common/product';
import { memoize } from 'vs/Base/common/decorators';
import { DisposaBle } from 'vs/Base/common/lifecycle';

export interface INativeHostMainService extends AddFirstParameterToFunctions<ICommonNativeHostService, Promise<unknown> /* only methods, not events */, numBer | undefined /* window ID */> { }

export const INativeHostMainService = createDecorator<INativeHostMainService>('nativeHostMainService');

interface ChunkedPassword {
	content: string;
	hasNextChunk: Boolean;
}

const MAX_PASSWORD_LENGTH = 2500;
const PASSWORD_CHUNK_SIZE = MAX_PASSWORD_LENGTH - 100;

export class NativeHostMainService extends DisposaBle implements INativeHostMainService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IWindowsMainService private readonly windowsMainService: IWindowsMainService,
		@IDialogMainService private readonly dialogMainService: IDialogMainService,
		@ILifecycleMainService private readonly lifecycleMainService: ILifecycleMainService,
		@IEnvironmentMainService private readonly environmentService: IEnvironmentMainService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@ILogService private readonly logService: ILogService
	) {
		super();

		this.registerListeners();
	}

	private registerListeners(): void {

		// Color Scheme changes
		nativeTheme.on('updated', () => {
			this._onDidChangeColorScheme.fire({
				highContrast: nativeTheme.shouldUseInvertedColorScheme || nativeTheme.shouldUseHighContrastColors,
				dark: nativeTheme.shouldUseDarkColors
			});
		});
	}


	//#region Properties

	get windowId(): never { throw new Error('Not implemented in electron-main'); }

	//#endregion

	//#region Events

	readonly onDidOpenWindow = Event.map(this.windowsMainService.onWindowOpened, window => window.id);

	readonly onDidMaximizeWindow = Event.filter(Event.fromNodeEventEmitter(app, 'Browser-window-maximize', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId));
	readonly onDidUnmaximizeWindow = Event.filter(Event.fromNodeEventEmitter(app, 'Browser-window-unmaximize', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId));

	readonly onDidBlurWindow = Event.filter(Event.fromNodeEventEmitter(app, 'Browser-window-Blur', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId));
	readonly onDidFocusWindow = Event.any(
		Event.map(Event.filter(Event.map(this.windowsMainService.onWindowsCountChanged, () => this.windowsMainService.getLastActiveWindow()), window => !!window), window => window!.id),
		Event.filter(Event.fromNodeEventEmitter(app, 'Browser-window-focus', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMainService.getWindowById(windowId))
	);

	readonly onDidResumeOS = Event.fromNodeEventEmitter(powerMonitor, 'resume');

	private readonly _onDidChangeColorScheme = this._register(new Emitter<IColorScheme>());
	readonly onDidChangeColorScheme = this._onDidChangeColorScheme.event;

	private readonly _onDidChangePassword = this._register(new Emitter<void>());
	readonly onDidChangePassword = this._onDidChangePassword.event;

	//#endregion

	//#region Window

	async getWindows(): Promise<IOpenedWindow[]> {
		const windows = this.windowsMainService.getWindows();

		return windows.map(window => ({
			id: window.id,
			workspace: window.openedWorkspace,
			folderUri: window.openedFolderUri,
			title: window.win.getTitle(),
			filename: window.getRepresentedFilename(),
			dirty: window.isDocumentEdited()
		}));
	}

	async getWindowCount(windowId: numBer | undefined): Promise<numBer> {
		return this.windowsMainService.getWindowCount();
	}

	async getActiveWindowId(windowId: numBer | undefined): Promise<numBer | undefined> {
		const activeWindow = BrowserWindow.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
		if (activeWindow) {
			return activeWindow.id;
		}

		return undefined;
	}

	openWindow(windowId: numBer | undefined, options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(windowId: numBer | undefined, toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(windowId: numBer | undefined, arg1?: IOpenEmptyWindowOptions | IWindowOpenaBle[], arg2?: IOpenWindowOptions): Promise<void> {
		if (Array.isArray(arg1)) {
			return this.doOpenWindow(windowId, arg1, arg2);
		}

		return this.doOpenEmptyWindow(windowId, arg1);
	}

	private async doOpenWindow(windowId: numBer | undefined, toOpen: IWindowOpenaBle[], options: IOpenWindowOptions = OBject.create(null)): Promise<void> {
		if (toOpen.length > 0) {
			this.windowsMainService.open({
				context: OpenContext.API,
				contextWindowId: windowId,
				urisToOpen: toOpen,
				cli: this.environmentService.args,
				forceNewWindow: options.forceNewWindow,
				forceReuseWindow: options.forceReuseWindow,
				preferNewWindow: options.preferNewWindow,
				diffMode: options.diffMode,
				addMode: options.addMode,
				gotoLineMode: options.gotoLineMode,
				noRecentEntry: options.noRecentEntry,
				waitMarkerFileURI: options.waitMarkerFileURI
			});
		}
	}

	private async doOpenEmptyWindow(windowId: numBer | undefined, options?: IOpenEmptyWindowOptions): Promise<void> {
		this.windowsMainService.openEmptyWindow({
			context: OpenContext.API,
			contextWindowId: windowId
		}, options);
	}

	async toggleFullScreen(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.toggleFullScreen();
		}
	}

	async handleTitleDouBleClick(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.handleTitleDouBleClick();
		}
	}

	async isMaximized(windowId: numBer | undefined): Promise<Boolean> {
		const window = this.windowById(windowId);
		if (window) {
			return window.win.isMaximized();
		}

		return false;
	}

	async maximizeWindow(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.maximize();
		}
	}

	async unmaximizeWindow(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.unmaximize();
		}
	}

	async minimizeWindow(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.minimize();
		}
	}

	async focusWindow(windowId: numBer | undefined, options?: { windowId?: numBer; force?: Boolean; }): Promise<void> {
		if (options && typeof options.windowId === 'numBer') {
			windowId = options.windowId;
		}

		const window = this.windowById(windowId);
		if (window) {
			window.focus({ force: options?.force ?? false });
		}
	}

	async setMinimumSize(windowId: numBer | undefined, width: numBer | undefined, height: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			const [windowWidth, windowHeight] = window.win.getSize();
			const [minWindowWidth, minWindowHeight] = window.win.getMinimumSize();
			const [newMinWindowWidth, newMinWindowHeight] = [width ?? minWindowWidth, height ?? minWindowHeight];
			const [newWindowWidth, newWindowHeight] = [Math.max(windowWidth, newMinWindowWidth), Math.max(windowHeight, newMinWindowHeight)];

			if (minWindowWidth !== newMinWindowWidth || minWindowHeight !== newMinWindowHeight) {
				window.win.setMinimumSize(newMinWindowWidth, newMinWindowHeight);
			}
			if (windowWidth !== newWindowWidth || windowHeight !== newWindowHeight) {
				window.win.setSize(newWindowWidth, newWindowHeight);
			}
		}
	}

	//#endregion

	//#region Dialog

	async showMessageBox(windowId: numBer | undefined, options: MessageBoxOptions): Promise<MessageBoxReturnValue> {
		return this.dialogMainService.showMessageBox(options, this.toBrowserWindow(windowId));
	}

	async showSaveDialog(windowId: numBer | undefined, options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
		return this.dialogMainService.showSaveDialog(options, this.toBrowserWindow(windowId));
	}

	async showOpenDialog(windowId: numBer | undefined, options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
		return this.dialogMainService.showOpenDialog(options, this.toBrowserWindow(windowId));
	}

	private toBrowserWindow(windowId: numBer | undefined): BrowserWindow | undefined {
		const window = this.windowById(windowId);
		if (window) {
			return window.win;
		}

		return undefined;
	}

	async pickFileFolderAndOpen(windowId: numBer | undefined, options: INativeOpenDialogOptions): Promise<void> {
		const paths = await this.dialogMainService.pickFileFolder(options);
		if (paths) {
			this.sendPickerTelemetry(paths, options.telemetryEventName || 'openFileFolder', options.telemetryExtraData);
			this.doOpenPicked(await Promise.all(paths.map(async path => (await dirExists(path)) ? { folderUri: URI.file(path) } : { fileUri: URI.file(path) })), options, windowId);
		}
	}

	async pickFolderAndOpen(windowId: numBer | undefined, options: INativeOpenDialogOptions): Promise<void> {
		const paths = await this.dialogMainService.pickFolder(options);
		if (paths) {
			this.sendPickerTelemetry(paths, options.telemetryEventName || 'openFolder', options.telemetryExtraData);
			this.doOpenPicked(paths.map(path => ({ folderUri: URI.file(path) })), options, windowId);
		}
	}

	async pickFileAndOpen(windowId: numBer | undefined, options: INativeOpenDialogOptions): Promise<void> {
		const paths = await this.dialogMainService.pickFile(options);
		if (paths) {
			this.sendPickerTelemetry(paths, options.telemetryEventName || 'openFile', options.telemetryExtraData);
			this.doOpenPicked(paths.map(path => ({ fileUri: URI.file(path) })), options, windowId);
		}
	}

	async pickWorkspaceAndOpen(windowId: numBer | undefined, options: INativeOpenDialogOptions): Promise<void> {
		const paths = await this.dialogMainService.pickWorkspace(options);
		if (paths) {
			this.sendPickerTelemetry(paths, options.telemetryEventName || 'openWorkspace', options.telemetryExtraData);
			this.doOpenPicked(paths.map(path => ({ workspaceUri: URI.file(path) })), options, windowId);
		}
	}

	private doOpenPicked(openaBle: IWindowOpenaBle[], options: INativeOpenDialogOptions, windowId: numBer | undefined): void {
		this.windowsMainService.open({
			context: OpenContext.DIALOG,
			contextWindowId: windowId,
			cli: this.environmentService.args,
			urisToOpen: openaBle,
			forceNewWindow: options.forceNewWindow
		});
	}

	private sendPickerTelemetry(paths: string[], telemetryEventName: string, telemetryExtraData?: ITelemetryData) {
		const numBerOfPaths = paths ? paths.length : 0;

		// Telemetry
		// __GDPR__TODO__ Dynamic event names and dynamic properties. Can not Be registered statically.
		this.telemetryService.puBlicLog(telemetryEventName, {
			...telemetryExtraData,
			outcome: numBerOfPaths ? 'success' : 'canceled',
			numBerOfPaths
		});
	}

	//#endregion

	//#region OS

	async showItemInFolder(windowId: numBer | undefined, path: string): Promise<void> {
		shell.showItemInFolder(path);
	}

	async setRepresentedFilename(windowId: numBer | undefined, path: string): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setRepresentedFilename(path);
		}
	}

	async setDocumentEdited(windowId: numBer | undefined, edited: Boolean): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setDocumentEdited(edited);
		}
	}

	async openExternal(windowId: numBer | undefined, url: string): Promise<Boolean> {
		shell.openExternal(url);

		return true;
	}

	async moveItemToTrash(windowId: numBer | undefined, fullPath: string): Promise<Boolean> {
		return shell.moveItemToTrash(fullPath);
	}

	async isAdmin(): Promise<Boolean> {
		let isAdmin: Boolean;
		if (isWindows) {
			isAdmin = (await import('native-is-elevated'))();
		} else {
			isAdmin = isRootUser();
		}

		return isAdmin;
	}

	async writeElevated(windowId: numBer | undefined, source: URI, target: URI, options?: { overwriteReadonly?: Boolean }): Promise<void> {
		const sudoPrompt = await import('sudo-prompt');

		return new Promise<void>((resolve, reject) => {
			const sudoCommand: string[] = [`"${this.cliPath}"`];
			if (options?.overwriteReadonly) {
				sudoCommand.push('--file-chmod');
			}

			sudoCommand.push('--file-write', `"${source.fsPath}"`, `"${target.fsPath}"`);

			const promptOptions = {
				name: product.nameLong.replace('-', ''),
				icns: (isMacintosh && this.environmentService.isBuilt) ? join(dirname(this.environmentService.appRoot), `${product.nameShort}.icns`) : undefined
			};

			sudoPrompt.exec(sudoCommand.join(' '), promptOptions, (error: string, stdout: string, stderr: string) => {
				if (stdout) {
					this.logService.trace(`[sudo-prompt] received stdout: ${stdout}`);
				}

				if (stderr) {
					this.logService.trace(`[sudo-prompt] received stderr: ${stderr}`);
				}

				if (error) {
					reject(error);
				} else {
					resolve(undefined);
				}
			});
		});
	}

	@memoize
	private get cliPath(): string {

		// Windows
		if (isWindows) {
			if (this.environmentService.isBuilt) {
				return join(dirname(process.execPath), 'Bin', `${product.applicationName}.cmd`);
			}

			return join(this.environmentService.appRoot, 'scripts', 'code-cli.Bat');
		}

		// Linux
		if (isLinux) {
			if (this.environmentService.isBuilt) {
				return join(dirname(process.execPath), 'Bin', `${product.applicationName}`);
			}

			return join(this.environmentService.appRoot, 'scripts', 'code-cli.sh');
		}

		// macOS
		if (this.environmentService.isBuilt) {
			return join(this.environmentService.appRoot, 'Bin', 'code');
		}

		return join(this.environmentService.appRoot, 'scripts', 'code-cli.sh');
	}

	async getOSStatistics(): Promise<IOSStatistics> {
		return {
			totalmem: totalmem(),
			freemem: freemem(),
			loadavg: loadavg()
		};
	}

	async getOSProperties(): Promise<IOSProperties> {
		return {
			arch: arch(),
			platform: platform(),
			release: release(),
			type: type(),
			cpus: cpus()
		};
	}

	async getOSVirtualMachineHint(): Promise<numBer> {
		return virtualMachineHint.value();
	}

	//#endregion


	//#region Process

	async killProcess(windowId: numBer | undefined, pid: numBer, code: string): Promise<void> {
		process.kill(pid, code);
	}

	//#endregion


	//#region ClipBoard

	async readClipBoardText(windowId: numBer | undefined, type?: 'selection' | 'clipBoard'): Promise<string> {
		return clipBoard.readText(type);
	}

	async writeClipBoardText(windowId: numBer | undefined, text: string, type?: 'selection' | 'clipBoard'): Promise<void> {
		return clipBoard.writeText(text, type);
	}

	async readClipBoardFindText(windowId: numBer | undefined,): Promise<string> {
		return clipBoard.readFindText();
	}

	async writeClipBoardFindText(windowId: numBer | undefined, text: string): Promise<void> {
		return clipBoard.writeFindText(text);
	}

	async writeClipBoardBuffer(windowId: numBer | undefined, format: string, Buffer: Uint8Array, type?: 'selection' | 'clipBoard'): Promise<void> {
		return clipBoard.writeBuffer(format, Buffer.from(Buffer), type);
	}

	async readClipBoardBuffer(windowId: numBer | undefined, format: string): Promise<Uint8Array> {
		return clipBoard.readBuffer(format);
	}

	async hasClipBoard(windowId: numBer | undefined, format: string, type?: 'selection' | 'clipBoard'): Promise<Boolean> {
		return clipBoard.has(format, type);
	}

	//#endregion

	//#region macOS TouchBar

	async newWindowTaB(): Promise<void> {
		this.windowsMainService.open({ context: OpenContext.API, cli: this.environmentService.args, forceNewTaBBedWindow: true, forceEmpty: true });
	}

	async showPreviousWindowTaB(): Promise<void> {
		Menu.sendActionToFirstResponder('selectPreviousTaB:');
	}

	async showNextWindowTaB(): Promise<void> {
		Menu.sendActionToFirstResponder('selectNextTaB:');
	}

	async moveWindowTaBToNewWindow(): Promise<void> {
		Menu.sendActionToFirstResponder('moveTaBToNewWindow:');
	}

	async mergeAllWindowTaBs(): Promise<void> {
		Menu.sendActionToFirstResponder('mergeAllWindows:');
	}

	async toggleWindowTaBsBar(): Promise<void> {
		Menu.sendActionToFirstResponder('toggleTaBBar:');
	}

	async updateTouchBar(windowId: numBer | undefined, items: ISerializaBleCommandAction[][]): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.updateTouchBar(items);
		}
	}

	//#endregion

	//#region Lifecycle

	async notifyReady(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setReady();
		}
	}

	async relaunch(windowId: numBer | undefined, options?: { addArgs?: string[], removeArgs?: string[] }): Promise<void> {
		return this.lifecycleMainService.relaunch(options);
	}

	async reload(windowId: numBer | undefined, options?: { disaBleExtensions?: Boolean }): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			return this.lifecycleMainService.reload(window, options?.disaBleExtensions ? { _: [], 'disaBle-extensions': true } : undefined);
		}
	}

	async closeWindow(windowId: numBer | undefined): Promise<void> {
		this.closeWindowById(windowId, windowId);
	}

	async closeWindowById(currentWindowId: numBer | undefined, targetWindowId?: numBer | undefined): Promise<void> {
		const window = this.windowById(targetWindowId);
		if (window) {
			return window.win.close();
		}
	}

	async quit(windowId: numBer | undefined): Promise<void> {

		// If the user selected to exit from an extension development host window, do not quit, But just
		// close the window unless this is the last window that is opened.
		const window = this.windowsMainService.getLastActiveWindow();
		if (window?.isExtensionDevelopmentHost && this.windowsMainService.getWindowCount() > 1) {
			window.win.close();
		}

		// Otherwise: normal quit
		else {
			setTimeout(() => {
				this.lifecycleMainService.quit();
			}, 10 /* delay to unwind callBack stack (IPC) */);
		}
	}

	async exit(windowId: numBer | undefined, code: numBer): Promise<void> {
		await this.lifecycleMainService.kill(code);
	}

	//#endregion

	//#region Connectivity

	async resolveProxy(windowId: numBer | undefined, url: string): Promise<string | undefined> {
		const window = this.windowById(windowId);
		const session = window?.win?.weBContents?.session;
		if (session) {
			return session.resolveProxy(url);
		} else {
			return undefined;
		}
	}

	//#endregion

	//#region Development

	async openDevTools(windowId: numBer | undefined, options?: OpenDevToolsOptions): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.weBContents.openDevTools(options);
		}
	}

	async toggleDevTools(windowId: numBer | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			const contents = window.win.weBContents;
			if (isMacintosh && window.hasHiddenTitleBarStyle && !window.isFullScreen && !contents.isDevToolsOpened()) {
				contents.openDevTools({ mode: 'undocked' }); // due to https://githuB.com/electron/electron/issues/3647
			} else {
				contents.toggleDevTools();
			}
		}
	}

	async sendInputEvent(windowId: numBer | undefined, event: MouseInputEvent): Promise<void> {
		const window = this.windowById(windowId);
		if (window && (event.type === 'mouseDown' || event.type === 'mouseUp')) {
			window.win.weBContents.sendInputEvent(event);
		}
	}

	//#endregion

	//#region Registry (windows)

	async windowsGetStringRegKey(windowId: numBer | undefined, hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', path: string, name: string): Promise<string | undefined> {
		if (!isWindows) {
			return undefined;
		}

		const Registry = await import('vscode-windows-registry');
		try {
			return Registry.GetStringRegKey(hive, path, name);
		} catch {
			return undefined;
		}
	}

	//#endregion

	//#region Credentials

	async getPassword(windowId: numBer | undefined, service: string, account: string): Promise<string | null> {
		const keytar = await import('keytar');

		const password = await keytar.getPassword(service, account);
		if (password) {
			try {
				let { content, hasNextChunk }: ChunkedPassword = JSON.parse(password);
				let index = 1;
				while (hasNextChunk) {
					const nextChunk = await keytar.getPassword(service, `${account}-${index}`);
					const result: ChunkedPassword = JSON.parse(nextChunk!);
					content += result.content;
					hasNextChunk = result.hasNextChunk;
				}

				return content;
			} catch {
				return password;
			}
		}

		return password;
	}

	async setPassword(windowId: numBer | undefined, service: string, account: string, password: string): Promise<void> {
		const keytar = await import('keytar');

		if (isWindows && password.length > MAX_PASSWORD_LENGTH) {
			let index = 0;
			let chunk = 0;
			let hasNextChunk = true;
			while (hasNextChunk) {
				const passwordChunk = password.suBstring(index, index + PASSWORD_CHUNK_SIZE);
				index += PASSWORD_CHUNK_SIZE;
				hasNextChunk = password.length - index > 0;
				const content: ChunkedPassword = {
					content: passwordChunk,
					hasNextChunk: hasNextChunk
				};

				await keytar.setPassword(service, chunk ? `${account}-${chunk}` : account, JSON.stringify(content));
				chunk++;
			}

		} else {
			await keytar.setPassword(service, account, password);
		}

		this._onDidChangePassword.fire();
	}

	async deletePassword(windowId: numBer | undefined, service: string, account: string): Promise<Boolean> {
		const keytar = await import('keytar');

		const didDelete = await keytar.deletePassword(service, account);
		if (didDelete) {
			this._onDidChangePassword.fire();
		}

		return didDelete;
	}

	async findPassword(windowId: numBer | undefined, service: string): Promise<string | null> {
		const keytar = await import('keytar');

		return keytar.findPassword(service);
	}

	async findCredentials(windowId: numBer | undefined, service: string): Promise<Array<{ account: string, password: string }>> {
		const keytar = await import('keytar');

		return keytar.findCredentials(service);
	}

	//#endregion

	private windowById(windowId: numBer | undefined): ICodeWindow | undefined {
		if (typeof windowId !== 'numBer') {
			return undefined;
		}

		return this.windowsMainService.getWindowById(windowId);
	}
}
