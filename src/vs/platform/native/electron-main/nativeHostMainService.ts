/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { IWindowsMAinService, ICodeWindow } from 'vs/plAtform/windows/electron-mAin/windows';
import { MessAgeBoxOptions, MessAgeBoxReturnVAlue, shell, OpenDevToolsOptions, SAveDiAlogOptions, SAveDiAlogReturnVAlue, OpenDiAlogOptions, OpenDiAlogReturnVAlue, Menu, BrowserWindow, App, clipboArd, powerMonitor, nAtiveTheme } from 'electron';
import { OpenContext } from 'vs/plAtform/windows/node/window';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { IOpenedWindow, IOpenWindowOptions, IWindowOpenAble, IOpenEmptyWindowOptions, IColorScheme } from 'vs/plAtform/windows/common/windows';
import { INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { isMAcintosh, isWindows, isRootUser, isLinux } from 'vs/bAse/common/plAtform';
import { ICommonNAtiveHostService, IOSProperties, IOSStAtistics } from 'vs/plAtform/nAtive/common/nAtive';
import { ISeriAlizAbleCommAndAction } from 'vs/plAtform/Actions/common/Actions';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { AddFirstPArAmeterToFunctions } from 'vs/bAse/common/types';
import { IDiAlogMAinService } from 'vs/plAtform/diAlogs/electron-mAin/diAlogs';
import { dirExists } from 'vs/bAse/node/pfs';
import { URI } from 'vs/bAse/common/uri';
import { ITelemetryDAtA, ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MouseInputEvent } from 'vs/bAse/pArts/sAndbox/common/electronTypes';
import { Arch, totAlmem, releAse, plAtform, type, loAdAvg, freemem, cpus } from 'os';
import { virtuAlMAchineHint } from 'vs/bAse/node/id';
import { ILogService } from 'vs/plAtform/log/common/log';
import { dirnAme, join } from 'vs/bAse/common/pAth';
import product from 'vs/plAtform/product/common/product';
import { memoize } from 'vs/bAse/common/decorAtors';
import { DisposAble } from 'vs/bAse/common/lifecycle';

export interfAce INAtiveHostMAinService extends AddFirstPArAmeterToFunctions<ICommonNAtiveHostService, Promise<unknown> /* only methods, not events */, number | undefined /* window ID */> { }

export const INAtiveHostMAinService = creAteDecorAtor<INAtiveHostMAinService>('nAtiveHostMAinService');

interfAce ChunkedPAssword {
	content: string;
	hAsNextChunk: booleAn;
}

const MAX_PASSWORD_LENGTH = 2500;
const PASSWORD_CHUNK_SIZE = MAX_PASSWORD_LENGTH - 100;

export clAss NAtiveHostMAinService extends DisposAble implements INAtiveHostMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IWindowsMAinService privAte reAdonly windowsMAinService: IWindowsMAinService,
		@IDiAlogMAinService privAte reAdonly diAlogMAinService: IDiAlogMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// Color Scheme chAnges
		nAtiveTheme.on('updAted', () => {
			this._onDidChAngeColorScheme.fire({
				highContrAst: nAtiveTheme.shouldUseInvertedColorScheme || nAtiveTheme.shouldUseHighContrAstColors,
				dArk: nAtiveTheme.shouldUseDArkColors
			});
		});
	}


	//#region Properties

	get windowId(): never { throw new Error('Not implemented in electron-mAin'); }

	//#endregion

	//#region Events

	reAdonly onDidOpenWindow = Event.mAp(this.windowsMAinService.onWindowOpened, window => window.id);

	reAdonly onDidMAximizeWindow = Event.filter(Event.fromNodeEventEmitter(App, 'browser-window-mAximize', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMAinService.getWindowById(windowId));
	reAdonly onDidUnmAximizeWindow = Event.filter(Event.fromNodeEventEmitter(App, 'browser-window-unmAximize', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMAinService.getWindowById(windowId));

	reAdonly onDidBlurWindow = Event.filter(Event.fromNodeEventEmitter(App, 'browser-window-blur', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMAinService.getWindowById(windowId));
	reAdonly onDidFocusWindow = Event.Any(
		Event.mAp(Event.filter(Event.mAp(this.windowsMAinService.onWindowsCountChAnged, () => this.windowsMAinService.getLAstActiveWindow()), window => !!window), window => window!.id),
		Event.filter(Event.fromNodeEventEmitter(App, 'browser-window-focus', (event, window: BrowserWindow) => window.id), windowId => !!this.windowsMAinService.getWindowById(windowId))
	);

	reAdonly onDidResumeOS = Event.fromNodeEventEmitter(powerMonitor, 'resume');

	privAte reAdonly _onDidChAngeColorScheme = this._register(new Emitter<IColorScheme>());
	reAdonly onDidChAngeColorScheme = this._onDidChAngeColorScheme.event;

	privAte reAdonly _onDidChAngePAssword = this._register(new Emitter<void>());
	reAdonly onDidChAngePAssword = this._onDidChAngePAssword.event;

	//#endregion

	//#region Window

	Async getWindows(): Promise<IOpenedWindow[]> {
		const windows = this.windowsMAinService.getWindows();

		return windows.mAp(window => ({
			id: window.id,
			workspAce: window.openedWorkspAce,
			folderUri: window.openedFolderUri,
			title: window.win.getTitle(),
			filenAme: window.getRepresentedFilenAme(),
			dirty: window.isDocumentEdited()
		}));
	}

	Async getWindowCount(windowId: number | undefined): Promise<number> {
		return this.windowsMAinService.getWindowCount();
	}

	Async getActiveWindowId(windowId: number | undefined): Promise<number | undefined> {
		const ActiveWindow = BrowserWindow.getFocusedWindow() || this.windowsMAinService.getLAstActiveWindow();
		if (ActiveWindow) {
			return ActiveWindow.id;
		}

		return undefined;
	}

	openWindow(windowId: number | undefined, options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(windowId: number | undefined, toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(windowId: number | undefined, Arg1?: IOpenEmptyWindowOptions | IWindowOpenAble[], Arg2?: IOpenWindowOptions): Promise<void> {
		if (ArrAy.isArrAy(Arg1)) {
			return this.doOpenWindow(windowId, Arg1, Arg2);
		}

		return this.doOpenEmptyWindow(windowId, Arg1);
	}

	privAte Async doOpenWindow(windowId: number | undefined, toOpen: IWindowOpenAble[], options: IOpenWindowOptions = Object.creAte(null)): Promise<void> {
		if (toOpen.length > 0) {
			this.windowsMAinService.open({
				context: OpenContext.API,
				contextWindowId: windowId,
				urisToOpen: toOpen,
				cli: this.environmentService.Args,
				forceNewWindow: options.forceNewWindow,
				forceReuseWindow: options.forceReuseWindow,
				preferNewWindow: options.preferNewWindow,
				diffMode: options.diffMode,
				AddMode: options.AddMode,
				gotoLineMode: options.gotoLineMode,
				noRecentEntry: options.noRecentEntry,
				wAitMArkerFileURI: options.wAitMArkerFileURI
			});
		}
	}

	privAte Async doOpenEmptyWindow(windowId: number | undefined, options?: IOpenEmptyWindowOptions): Promise<void> {
		this.windowsMAinService.openEmptyWindow({
			context: OpenContext.API,
			contextWindowId: windowId
		}, options);
	}

	Async toggleFullScreen(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.toggleFullScreen();
		}
	}

	Async hAndleTitleDoubleClick(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.hAndleTitleDoubleClick();
		}
	}

	Async isMAximized(windowId: number | undefined): Promise<booleAn> {
		const window = this.windowById(windowId);
		if (window) {
			return window.win.isMAximized();
		}

		return fAlse;
	}

	Async mAximizeWindow(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.mAximize();
		}
	}

	Async unmAximizeWindow(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.unmAximize();
		}
	}

	Async minimizeWindow(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.minimize();
		}
	}

	Async focusWindow(windowId: number | undefined, options?: { windowId?: number; force?: booleAn; }): Promise<void> {
		if (options && typeof options.windowId === 'number') {
			windowId = options.windowId;
		}

		const window = this.windowById(windowId);
		if (window) {
			window.focus({ force: options?.force ?? fAlse });
		}
	}

	Async setMinimumSize(windowId: number | undefined, width: number | undefined, height: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			const [windowWidth, windowHeight] = window.win.getSize();
			const [minWindowWidth, minWindowHeight] = window.win.getMinimumSize();
			const [newMinWindowWidth, newMinWindowHeight] = [width ?? minWindowWidth, height ?? minWindowHeight];
			const [newWindowWidth, newWindowHeight] = [MAth.mAx(windowWidth, newMinWindowWidth), MAth.mAx(windowHeight, newMinWindowHeight)];

			if (minWindowWidth !== newMinWindowWidth || minWindowHeight !== newMinWindowHeight) {
				window.win.setMinimumSize(newMinWindowWidth, newMinWindowHeight);
			}
			if (windowWidth !== newWindowWidth || windowHeight !== newWindowHeight) {
				window.win.setSize(newWindowWidth, newWindowHeight);
			}
		}
	}

	//#endregion

	//#region DiAlog

	Async showMessAgeBox(windowId: number | undefined, options: MessAgeBoxOptions): Promise<MessAgeBoxReturnVAlue> {
		return this.diAlogMAinService.showMessAgeBox(options, this.toBrowserWindow(windowId));
	}

	Async showSAveDiAlog(windowId: number | undefined, options: SAveDiAlogOptions): Promise<SAveDiAlogReturnVAlue> {
		return this.diAlogMAinService.showSAveDiAlog(options, this.toBrowserWindow(windowId));
	}

	Async showOpenDiAlog(windowId: number | undefined, options: OpenDiAlogOptions): Promise<OpenDiAlogReturnVAlue> {
		return this.diAlogMAinService.showOpenDiAlog(options, this.toBrowserWindow(windowId));
	}

	privAte toBrowserWindow(windowId: number | undefined): BrowserWindow | undefined {
		const window = this.windowById(windowId);
		if (window) {
			return window.win;
		}

		return undefined;
	}

	Async pickFileFolderAndOpen(windowId: number | undefined, options: INAtiveOpenDiAlogOptions): Promise<void> {
		const pAths = AwAit this.diAlogMAinService.pickFileFolder(options);
		if (pAths) {
			this.sendPickerTelemetry(pAths, options.telemetryEventNAme || 'openFileFolder', options.telemetryExtrADAtA);
			this.doOpenPicked(AwAit Promise.All(pAths.mAp(Async pAth => (AwAit dirExists(pAth)) ? { folderUri: URI.file(pAth) } : { fileUri: URI.file(pAth) })), options, windowId);
		}
	}

	Async pickFolderAndOpen(windowId: number | undefined, options: INAtiveOpenDiAlogOptions): Promise<void> {
		const pAths = AwAit this.diAlogMAinService.pickFolder(options);
		if (pAths) {
			this.sendPickerTelemetry(pAths, options.telemetryEventNAme || 'openFolder', options.telemetryExtrADAtA);
			this.doOpenPicked(pAths.mAp(pAth => ({ folderUri: URI.file(pAth) })), options, windowId);
		}
	}

	Async pickFileAndOpen(windowId: number | undefined, options: INAtiveOpenDiAlogOptions): Promise<void> {
		const pAths = AwAit this.diAlogMAinService.pickFile(options);
		if (pAths) {
			this.sendPickerTelemetry(pAths, options.telemetryEventNAme || 'openFile', options.telemetryExtrADAtA);
			this.doOpenPicked(pAths.mAp(pAth => ({ fileUri: URI.file(pAth) })), options, windowId);
		}
	}

	Async pickWorkspAceAndOpen(windowId: number | undefined, options: INAtiveOpenDiAlogOptions): Promise<void> {
		const pAths = AwAit this.diAlogMAinService.pickWorkspAce(options);
		if (pAths) {
			this.sendPickerTelemetry(pAths, options.telemetryEventNAme || 'openWorkspAce', options.telemetryExtrADAtA);
			this.doOpenPicked(pAths.mAp(pAth => ({ workspAceUri: URI.file(pAth) })), options, windowId);
		}
	}

	privAte doOpenPicked(openAble: IWindowOpenAble[], options: INAtiveOpenDiAlogOptions, windowId: number | undefined): void {
		this.windowsMAinService.open({
			context: OpenContext.DIALOG,
			contextWindowId: windowId,
			cli: this.environmentService.Args,
			urisToOpen: openAble,
			forceNewWindow: options.forceNewWindow
		});
	}

	privAte sendPickerTelemetry(pAths: string[], telemetryEventNAme: string, telemetryExtrADAtA?: ITelemetryDAtA) {
		const numberOfPAths = pAths ? pAths.length : 0;

		// Telemetry
		// __GDPR__TODO__ DynAmic event nAmes And dynAmic properties. CAn not be registered stAticAlly.
		this.telemetryService.publicLog(telemetryEventNAme, {
			...telemetryExtrADAtA,
			outcome: numberOfPAths ? 'success' : 'cAnceled',
			numberOfPAths
		});
	}

	//#endregion

	//#region OS

	Async showItemInFolder(windowId: number | undefined, pAth: string): Promise<void> {
		shell.showItemInFolder(pAth);
	}

	Async setRepresentedFilenAme(windowId: number | undefined, pAth: string): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setRepresentedFilenAme(pAth);
		}
	}

	Async setDocumentEdited(windowId: number | undefined, edited: booleAn): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setDocumentEdited(edited);
		}
	}

	Async openExternAl(windowId: number | undefined, url: string): Promise<booleAn> {
		shell.openExternAl(url);

		return true;
	}

	Async moveItemToTrAsh(windowId: number | undefined, fullPAth: string): Promise<booleAn> {
		return shell.moveItemToTrAsh(fullPAth);
	}

	Async isAdmin(): Promise<booleAn> {
		let isAdmin: booleAn;
		if (isWindows) {
			isAdmin = (AwAit import('nAtive-is-elevAted'))();
		} else {
			isAdmin = isRootUser();
		}

		return isAdmin;
	}

	Async writeElevAted(windowId: number | undefined, source: URI, tArget: URI, options?: { overwriteReAdonly?: booleAn }): Promise<void> {
		const sudoPrompt = AwAit import('sudo-prompt');

		return new Promise<void>((resolve, reject) => {
			const sudoCommAnd: string[] = [`"${this.cliPAth}"`];
			if (options?.overwriteReAdonly) {
				sudoCommAnd.push('--file-chmod');
			}

			sudoCommAnd.push('--file-write', `"${source.fsPAth}"`, `"${tArget.fsPAth}"`);

			const promptOptions = {
				nAme: product.nAmeLong.replAce('-', ''),
				icns: (isMAcintosh && this.environmentService.isBuilt) ? join(dirnAme(this.environmentService.AppRoot), `${product.nAmeShort}.icns`) : undefined
			};

			sudoPrompt.exec(sudoCommAnd.join(' '), promptOptions, (error: string, stdout: string, stderr: string) => {
				if (stdout) {
					this.logService.trAce(`[sudo-prompt] received stdout: ${stdout}`);
				}

				if (stderr) {
					this.logService.trAce(`[sudo-prompt] received stderr: ${stderr}`);
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
	privAte get cliPAth(): string {

		// Windows
		if (isWindows) {
			if (this.environmentService.isBuilt) {
				return join(dirnAme(process.execPAth), 'bin', `${product.ApplicAtionNAme}.cmd`);
			}

			return join(this.environmentService.AppRoot, 'scripts', 'code-cli.bAt');
		}

		// Linux
		if (isLinux) {
			if (this.environmentService.isBuilt) {
				return join(dirnAme(process.execPAth), 'bin', `${product.ApplicAtionNAme}`);
			}

			return join(this.environmentService.AppRoot, 'scripts', 'code-cli.sh');
		}

		// mAcOS
		if (this.environmentService.isBuilt) {
			return join(this.environmentService.AppRoot, 'bin', 'code');
		}

		return join(this.environmentService.AppRoot, 'scripts', 'code-cli.sh');
	}

	Async getOSStAtistics(): Promise<IOSStAtistics> {
		return {
			totAlmem: totAlmem(),
			freemem: freemem(),
			loAdAvg: loAdAvg()
		};
	}

	Async getOSProperties(): Promise<IOSProperties> {
		return {
			Arch: Arch(),
			plAtform: plAtform(),
			releAse: releAse(),
			type: type(),
			cpus: cpus()
		};
	}

	Async getOSVirtuAlMAchineHint(): Promise<number> {
		return virtuAlMAchineHint.vAlue();
	}

	//#endregion


	//#region Process

	Async killProcess(windowId: number | undefined, pid: number, code: string): Promise<void> {
		process.kill(pid, code);
	}

	//#endregion


	//#region ClipboArd

	Async reAdClipboArdText(windowId: number | undefined, type?: 'selection' | 'clipboArd'): Promise<string> {
		return clipboArd.reAdText(type);
	}

	Async writeClipboArdText(windowId: number | undefined, text: string, type?: 'selection' | 'clipboArd'): Promise<void> {
		return clipboArd.writeText(text, type);
	}

	Async reAdClipboArdFindText(windowId: number | undefined,): Promise<string> {
		return clipboArd.reAdFindText();
	}

	Async writeClipboArdFindText(windowId: number | undefined, text: string): Promise<void> {
		return clipboArd.writeFindText(text);
	}

	Async writeClipboArdBuffer(windowId: number | undefined, formAt: string, buffer: Uint8ArrAy, type?: 'selection' | 'clipboArd'): Promise<void> {
		return clipboArd.writeBuffer(formAt, Buffer.from(buffer), type);
	}

	Async reAdClipboArdBuffer(windowId: number | undefined, formAt: string): Promise<Uint8ArrAy> {
		return clipboArd.reAdBuffer(formAt);
	}

	Async hAsClipboArd(windowId: number | undefined, formAt: string, type?: 'selection' | 'clipboArd'): Promise<booleAn> {
		return clipboArd.hAs(formAt, type);
	}

	//#endregion

	//#region mAcOS TouchbAr

	Async newWindowTAb(): Promise<void> {
		this.windowsMAinService.open({ context: OpenContext.API, cli: this.environmentService.Args, forceNewTAbbedWindow: true, forceEmpty: true });
	}

	Async showPreviousWindowTAb(): Promise<void> {
		Menu.sendActionToFirstResponder('selectPreviousTAb:');
	}

	Async showNextWindowTAb(): Promise<void> {
		Menu.sendActionToFirstResponder('selectNextTAb:');
	}

	Async moveWindowTAbToNewWindow(): Promise<void> {
		Menu.sendActionToFirstResponder('moveTAbToNewWindow:');
	}

	Async mergeAllWindowTAbs(): Promise<void> {
		Menu.sendActionToFirstResponder('mergeAllWindows:');
	}

	Async toggleWindowTAbsBAr(): Promise<void> {
		Menu.sendActionToFirstResponder('toggleTAbBAr:');
	}

	Async updAteTouchBAr(windowId: number | undefined, items: ISeriAlizAbleCommAndAction[][]): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.updAteTouchBAr(items);
		}
	}

	//#endregion

	//#region Lifecycle

	Async notifyReAdy(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.setReAdy();
		}
	}

	Async relAunch(windowId: number | undefined, options?: { AddArgs?: string[], removeArgs?: string[] }): Promise<void> {
		return this.lifecycleMAinService.relAunch(options);
	}

	Async reloAd(windowId: number | undefined, options?: { disAbleExtensions?: booleAn }): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			return this.lifecycleMAinService.reloAd(window, options?.disAbleExtensions ? { _: [], 'disAble-extensions': true } : undefined);
		}
	}

	Async closeWindow(windowId: number | undefined): Promise<void> {
		this.closeWindowById(windowId, windowId);
	}

	Async closeWindowById(currentWindowId: number | undefined, tArgetWindowId?: number | undefined): Promise<void> {
		const window = this.windowById(tArgetWindowId);
		if (window) {
			return window.win.close();
		}
	}

	Async quit(windowId: number | undefined): Promise<void> {

		// If the user selected to exit from An extension development host window, do not quit, but just
		// close the window unless this is the lAst window thAt is opened.
		const window = this.windowsMAinService.getLAstActiveWindow();
		if (window?.isExtensionDevelopmentHost && this.windowsMAinService.getWindowCount() > 1) {
			window.win.close();
		}

		// Otherwise: normAl quit
		else {
			setTimeout(() => {
				this.lifecycleMAinService.quit();
			}, 10 /* delAy to unwind cAllbAck stAck (IPC) */);
		}
	}

	Async exit(windowId: number | undefined, code: number): Promise<void> {
		AwAit this.lifecycleMAinService.kill(code);
	}

	//#endregion

	//#region Connectivity

	Async resolveProxy(windowId: number | undefined, url: string): Promise<string | undefined> {
		const window = this.windowById(windowId);
		const session = window?.win?.webContents?.session;
		if (session) {
			return session.resolveProxy(url);
		} else {
			return undefined;
		}
	}

	//#endregion

	//#region Development

	Async openDevTools(windowId: number | undefined, options?: OpenDevToolsOptions): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			window.win.webContents.openDevTools(options);
		}
	}

	Async toggleDevTools(windowId: number | undefined): Promise<void> {
		const window = this.windowById(windowId);
		if (window) {
			const contents = window.win.webContents;
			if (isMAcintosh && window.hAsHiddenTitleBArStyle && !window.isFullScreen && !contents.isDevToolsOpened()) {
				contents.openDevTools({ mode: 'undocked' }); // due to https://github.com/electron/electron/issues/3647
			} else {
				contents.toggleDevTools();
			}
		}
	}

	Async sendInputEvent(windowId: number | undefined, event: MouseInputEvent): Promise<void> {
		const window = this.windowById(windowId);
		if (window && (event.type === 'mouseDown' || event.type === 'mouseUp')) {
			window.win.webContents.sendInputEvent(event);
		}
	}

	//#endregion

	//#region Registry (windows)

	Async windowsGetStringRegKey(windowId: number | undefined, hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', pAth: string, nAme: string): Promise<string | undefined> {
		if (!isWindows) {
			return undefined;
		}

		const Registry = AwAit import('vscode-windows-registry');
		try {
			return Registry.GetStringRegKey(hive, pAth, nAme);
		} cAtch {
			return undefined;
		}
	}

	//#endregion

	//#region CredentiAls

	Async getPAssword(windowId: number | undefined, service: string, Account: string): Promise<string | null> {
		const keytAr = AwAit import('keytAr');

		const pAssword = AwAit keytAr.getPAssword(service, Account);
		if (pAssword) {
			try {
				let { content, hAsNextChunk }: ChunkedPAssword = JSON.pArse(pAssword);
				let index = 1;
				while (hAsNextChunk) {
					const nextChunk = AwAit keytAr.getPAssword(service, `${Account}-${index}`);
					const result: ChunkedPAssword = JSON.pArse(nextChunk!);
					content += result.content;
					hAsNextChunk = result.hAsNextChunk;
				}

				return content;
			} cAtch {
				return pAssword;
			}
		}

		return pAssword;
	}

	Async setPAssword(windowId: number | undefined, service: string, Account: string, pAssword: string): Promise<void> {
		const keytAr = AwAit import('keytAr');

		if (isWindows && pAssword.length > MAX_PASSWORD_LENGTH) {
			let index = 0;
			let chunk = 0;
			let hAsNextChunk = true;
			while (hAsNextChunk) {
				const pAsswordChunk = pAssword.substring(index, index + PASSWORD_CHUNK_SIZE);
				index += PASSWORD_CHUNK_SIZE;
				hAsNextChunk = pAssword.length - index > 0;
				const content: ChunkedPAssword = {
					content: pAsswordChunk,
					hAsNextChunk: hAsNextChunk
				};

				AwAit keytAr.setPAssword(service, chunk ? `${Account}-${chunk}` : Account, JSON.stringify(content));
				chunk++;
			}

		} else {
			AwAit keytAr.setPAssword(service, Account, pAssword);
		}

		this._onDidChAngePAssword.fire();
	}

	Async deletePAssword(windowId: number | undefined, service: string, Account: string): Promise<booleAn> {
		const keytAr = AwAit import('keytAr');

		const didDelete = AwAit keytAr.deletePAssword(service, Account);
		if (didDelete) {
			this._onDidChAngePAssword.fire();
		}

		return didDelete;
	}

	Async findPAssword(windowId: number | undefined, service: string): Promise<string | null> {
		const keytAr = AwAit import('keytAr');

		return keytAr.findPAssword(service);
	}

	Async findCredentiAls(windowId: number | undefined, service: string): Promise<ArrAy<{ Account: string, pAssword: string }>> {
		const keytAr = AwAit import('keytAr');

		return keytAr.findCredentiAls(service);
	}

	//#endregion

	privAte windowById(windowId: number | undefined): ICodeWindow | undefined {
		if (typeof windowId !== 'number') {
			return undefined;
		}

		return this.windowsMAinService.getWindowById(windowId);
	}
}
