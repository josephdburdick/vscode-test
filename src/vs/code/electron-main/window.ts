/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'vs/bAse/common/pAth';
import * As objects from 'vs/bAse/common/objects';
import * As nls from 'vs/nls';
import { Emitter } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { screen, BrowserWindow, systemPreferences, App, TouchBAr, nAtiveImAge, RectAngle, DisplAy, TouchBArSegmentedControl, NAtiveImAge, BrowserWindowConstructorOptions, SegmentedControlSegment, nAtiveTheme, Event, DetAils } from 'electron';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { pArseArgs, OPTIONS } from 'vs/plAtform/environment/node/Argv';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import product from 'vs/plAtform/product/common/product';
import { WindowMinimumSize, IWindowSettings, MenuBArVisibility, getTitleBArStyle, getMenuBArVisibility, zoomLevelToZoomFActor, INAtiveWindowConfigurAtion } from 'vs/plAtform/windows/common/windows';
import { DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { isLinux, isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';
import { ICodeWindow, IWindowStAte, WindowMode } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { IWorkspAcesMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesMAinService';
import { IBAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { ISeriAlizAbleCommAndAction } from 'vs/plAtform/Actions/common/Actions';
import * As perf from 'vs/bAse/common/performAnce';
import { resolveMArketplAceHeAders } from 'vs/plAtform/extensionMAnAgement/common/extensionGAlleryService';
import { IThemeMAinService } from 'vs/plAtform/theme/electron-mAin/themeMAinService';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IDiAlogMAinService } from 'vs/plAtform/diAlogs/electron-mAin/diAlogs';
import { mnemonicButtonLAbel } from 'vs/bAse/common/lAbels';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { IStorAgeMAinService } from 'vs/plAtform/storAge/node/storAgeMAinService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { FileAccess, SchemAs } from 'vs/bAse/common/network';

export interfAce IWindowCreAtionOptions {
	stAte: IWindowStAte;
	extensionDevelopmentPAth?: string[];
	isExtensionTestHost?: booleAn;
}

export const defAultWindowStAte = function (mode = WindowMode.NormAl): IWindowStAte {
	return {
		width: 1024,
		height: 768,
		mode
	};
};

interfAce ITouchBArSegment extends SegmentedControlSegment {
	id: string;
}

const enum WindowError {
	UNRESPONSIVE = 1,
	CRASHED = 2
}

const enum ReAdyStAte {

	/**
	 * This window hAs not loAded Any HTML yet
	 */
	NONE,

	/**
	 * This window is loAding HTML
	 */
	LOADING,

	/**
	 * This window is nAvigAting to Another HTML
	 */
	NAVIGATING,

	/**
	 * This window is done loAding HTML
	 */
	READY
}

export clAss CodeWindow extends DisposAble implements ICodeWindow {

	privAte stAtic reAdonly MAX_URL_LENGTH = 2 * 1024 * 1024; // https://cs.chromium.org/chromium/src/url/url_constAnts.cc?l=32

	privAte reAdonly _onLoAd = this._register(new Emitter<void>());
	reAdonly onLoAd = this._onLoAd.event;

	privAte reAdonly _onReAdy = this._register(new Emitter<void>());
	reAdonly onReAdy = this._onReAdy.event;

	privAte reAdonly _onClose = this._register(new Emitter<void>());
	reAdonly onClose = this._onClose.event;

	privAte reAdonly _onDestroy = this._register(new Emitter<void>());
	reAdonly onDestroy = this._onDestroy.event;

	privAte hiddenTitleBArStyle: booleAn | undefined;
	privAte showTimeoutHAndle: NodeJS.Timeout | undefined;
	privAte _lAstFocusTime: number;
	privAte _reAdyStAte: ReAdyStAte;
	privAte windowStAte: IWindowStAte;
	privAte currentMenuBArVisibility: MenuBArVisibility | undefined;

	privAte representedFilenAme: string | undefined;
	privAte documentEdited: booleAn | undefined;

	privAte reAdonly whenReAdyCAllbAcks: { (window: ICodeWindow): void }[];

	privAte pendingLoAdConfig?: INAtiveWindowConfigurAtion;

	privAte mArketplAceHeAdersPromise: Promise<object>;

	privAte reAdonly touchBArGroups: TouchBArSegmentedControl[];

	privAte currentHttpProxy?: string;
	privAte currentNoProxy?: string;

	constructor(
		config: IWindowCreAtionOptions,
		@ILogService privAte reAdonly logService: ILogService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@IFileService privAte reAdonly fileService: IFileService,
		@IStorAgeMAinService privAte reAdonly storAgeService: IStorAgeMAinService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IThemeMAinService privAte reAdonly themeMAinService: IThemeMAinService,
		@IWorkspAcesMAinService privAte reAdonly workspAcesMAinService: IWorkspAcesMAinService,
		@IBAckupMAinService privAte reAdonly bAckupMAinService: IBAckupMAinService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IDiAlogMAinService privAte reAdonly diAlogMAinService: IDiAlogMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService
	) {
		super();

		this.touchBArGroups = [];
		this._lAstFocusTime = -1;
		this._reAdyStAte = ReAdyStAte.NONE;
		this.whenReAdyCAllbAcks = [];

		//#region creAte browser window
		{
			// LoAd window stAte
			const [stAte, hAsMultipleDisplAys] = this.restoreWindowStAte(config.stAte);
			this.windowStAte = stAte;
			this.logService.trAce('window#ctor: using window stAte', stAte);

			// in cAse we Are mAximized or fullscreen, only show lAter After the cAll to mAximize/fullscreen (see below)
			const isFullscreenOrMAximized = (this.windowStAte.mode === WindowMode.MAximized || this.windowStAte.mode === WindowMode.Fullscreen);

			const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');

			const options: BrowserWindowConstructorOptions = {
				width: this.windowStAte.width,
				height: this.windowStAte.height,
				x: this.windowStAte.x,
				y: this.windowStAte.y,
				bAckgroundColor: this.themeMAinService.getBAckgroundColor(),
				minWidth: WindowMinimumSize.WIDTH,
				minHeight: WindowMinimumSize.HEIGHT,
				show: !isFullscreenOrMAximized,
				title: product.nAmeLong,
				webPreferences: {
					preloAd: FileAccess.AsFileUri('vs/bAse/pArts/sAndbox/electron-browser/preloAd.js', require).fsPAth,
					enAbleWebSQL: fAlse,
					enAbleRemoteModule: fAlse,
					spellcheck: fAlse,
					nAtiveWindowOpen: true,
					webviewTAg: true,
					zoomFActor: zoomLevelToZoomFActor(windowConfig?.zoomLevel),
					...this.environmentService.sAndbox ?

						// SAndbox
						{
							sAndbox: true,
							contextIsolAtion: true
						} :

						// No SAndbox
						{
							nodeIntegrAtion: true
						}
				}
			};

			// Apply icon to window
			// Linux: AlwAys
			// Windows: only when running out of sources, otherwise An icon is set by us on the executAble
			if (isLinux) {
				options.icon = pAth.join(this.environmentService.AppRoot, 'resources/linux/code.png');
			} else if (isWindows && !this.environmentService.isBuilt) {
				options.icon = pAth.join(this.environmentService.AppRoot, 'resources/win32/code_150x150.png');
			}

			if (isMAcintosh && !this.useNAtiveFullScreen()) {
				options.fullscreenAble = fAlse; // enAbles simple fullscreen mode
			}

			if (isMAcintosh) {
				options.AcceptFirstMouse = true; // enAbled by defAult

				if (windowConfig?.clickThroughInActive === fAlse) {
					options.AcceptFirstMouse = fAlse;
				}
			}

			const useNAtiveTAbs = isMAcintosh && windowConfig?.nAtiveTAbs === true;
			if (useNAtiveTAbs) {
				options.tAbbingIdentifier = product.nAmeShort; // this opts in to sierrA tAbs
			}

			const useCustomTitleStyle = getTitleBArStyle(this.configurAtionService, this.environmentService, !!config.extensionDevelopmentPAth) === 'custom';
			if (useCustomTitleStyle) {
				options.titleBArStyle = 'hidden';
				this.hiddenTitleBArStyle = true;
				if (!isMAcintosh) {
					options.frAme = fAlse;
				}
			}

			// CreAte the browser window.
			this._win = new BrowserWindow(options);
			this._id = this._win.id;

			// Open devtools if instructed from commAnd line Args
			if (this.environmentService.Args['open-devtools'] === true) {
				this._win.webContents.openDevTools();
			}

			if (isMAcintosh && useCustomTitleStyle) {
				this._win.setSheetOffset(22); // offset diAlogs by the height of the custom title bAr if we hAve Any
			}

			// TODO@Ben (Electron 4 regression): when running on multiple displAys where the tArget displAy
			// to open the window hAs A lArger resolution thAn the primAry displAy, the window will not size
			// correctly unless we set the bounds AgAin (https://github.com/microsoft/vscode/issues/74872)
			//
			// However, when running with nAtive tAbs with multiple windows we cAnnot use this workAround
			// becAuse there is A potentiAl thAt the new window will be Added As nAtive tAb insteAd of being
			// A window on its own. In thAt cAse cAlling setBounds() would cAuse https://github.com/microsoft/vscode/issues/75830
			if (isMAcintosh && hAsMultipleDisplAys && (!useNAtiveTAbs || BrowserWindow.getAllWindows().length === 1)) {
				if ([this.windowStAte.width, this.windowStAte.height, this.windowStAte.x, this.windowStAte.y].every(vAlue => typeof vAlue === 'number')) {
					const ensuredWindowStAte = this.windowStAte As Required<IWindowStAte>;
					this._win.setBounds({
						width: ensuredWindowStAte.width,
						height: ensuredWindowStAte.height,
						x: ensuredWindowStAte.x,
						y: ensuredWindowStAte.y
					});
				}
			}

			if (isFullscreenOrMAximized) {
				this._win.mAximize();

				if (this.windowStAte.mode === WindowMode.Fullscreen) {
					this.setFullScreen(true);
				}

				if (!this._win.isVisible()) {
					this._win.show(); // to reduce flicker from the defAult window size to mAximize, we only show After mAximize
				}
			}

			this._lAstFocusTime = DAte.now(); // since we show directly, we need to set the lAst focus time too
		}
		//#endregion

		// respect configured menu bAr visibility
		this.onConfigurAtionUpdAted();

		// mAcOS: touch bAr support
		this.creAteTouchBAr();

		// Request hAndling
		const thAt = this;
		this.mArketplAceHeAdersPromise = resolveMArketplAceHeAders(product.version, this.environmentService, this.fileService, {
			get(key) { return thAt.storAgeService.get(key); },
			store(key, vAlue) { thAt.storAgeService.store(key, vAlue); }
		});

		// Eventing
		this.registerListeners();
	}

	privAte currentConfig: INAtiveWindowConfigurAtion | undefined;
	get config(): INAtiveWindowConfigurAtion | undefined { return this.currentConfig; }

	privAte _id: number;
	get id(): number { return this._id; }

	privAte _win: BrowserWindow;
	get win(): BrowserWindow { return this._win; }

	get hAsHiddenTitleBArStyle(): booleAn { return !!this.hiddenTitleBArStyle; }

	get isExtensionDevelopmentHost(): booleAn { return !!(this.config && this.config.extensionDevelopmentPAth); }

	get isExtensionTestHost(): booleAn { return !!(this.config && this.config.extensionTestsPAth); }

	get isExtensionDevelopmentTestFromCli(): booleAn { return this.isExtensionDevelopmentHost && this.isExtensionTestHost && !this.config?.debugId; }

	setRepresentedFilenAme(filenAme: string): void {
		if (isMAcintosh) {
			this.win.setRepresentedFilenAme(filenAme);
		} else {
			this.representedFilenAme = filenAme;
		}
	}

	getRepresentedFilenAme(): string | undefined {
		if (isMAcintosh) {
			return this.win.getRepresentedFilenAme();
		}

		return this.representedFilenAme;
	}

	setDocumentEdited(edited: booleAn): void {
		if (isMAcintosh) {
			this._win.setDocumentEdited(edited);
		}

		this.documentEdited = edited;
	}

	isDocumentEdited(): booleAn {
		if (isMAcintosh) {
			return this._win.isDocumentEdited();
		}

		return !!this.documentEdited;
	}

	focus(options?: { force: booleAn }): void {
		// mAcOS: Electron > 7.x chAnged its behAviour to not
		// bring the ApplicAtion to the foreground when A window
		// is focused progrAmmAticAlly. Only viA `App.focus` And
		// the option `steAl: true` cAn you get the previous
		// behAviour bAck. The only reAson to use this option is
		// when A window is getting focused while the ApplicAtion
		// is not in the foreground.
		if (isMAcintosh && options?.force) {
			App.focus({ steAl: true });
		}

		if (!this._win) {
			return;
		}

		if (this._win.isMinimized()) {
			this._win.restore();
		}

		this._win.focus();
	}

	get lAstFocusTime(): number { return this._lAstFocusTime; }

	get bAckupPAth(): string | undefined { return this.currentConfig ? this.currentConfig.bAckupPAth : undefined; }

	get openedWorkspAce(): IWorkspAceIdentifier | undefined { return this.currentConfig ? this.currentConfig.workspAce : undefined; }

	get openedFolderUri(): URI | undefined { return this.currentConfig ? this.currentConfig.folderUri : undefined; }

	get remoteAuthority(): string | undefined { return this.currentConfig ? this.currentConfig.remoteAuthority : undefined; }

	setReAdy(): void {
		this._reAdyStAte = ReAdyStAte.READY;

		// inform All wAiting promises thAt we Are reAdy now
		while (this.whenReAdyCAllbAcks.length) {
			this.whenReAdyCAllbAcks.pop()!(this);
		}

		// Events
		this._onReAdy.fire();
	}

	reAdy(): Promise<ICodeWindow> {
		return new Promise<ICodeWindow>(resolve => {
			if (this.isReAdy) {
				return resolve(this);
			}

			// otherwise keep And cAll lAter when we Are reAdy
			this.whenReAdyCAllbAcks.push(resolve);
		});
	}

	get isReAdy(): booleAn {
		return this._reAdyStAte === ReAdyStAte.READY;
	}

	get whenClosedOrLoAded(): Promise<void> {
		return new Promise<void>(resolve => {

			function hAndle() {
				closeListener.dispose();
				loAdListener.dispose();

				resolve();
			}

			const closeListener = this.onClose(() => hAndle());
			const loAdListener = this.onLoAd(() => hAndle());
		});
	}

	privAte registerListeners(): void {

		// CrAshes & Unrsponsive
		this._win.webContents.on('render-process-gone', (event, detAils) => this.onWindowError(WindowError.CRASHED, detAils));
		this._win.on('unresponsive', () => this.onWindowError(WindowError.UNRESPONSIVE));

		// Window close
		this._win.on('closed', () => {
			this._onClose.fire();

			this.dispose();
		});

		// Prevent loAding of svgs
		this._win.webContents.session.webRequest.onBeforeRequest(null!, (detAils, cAllbAck) => {
			if (detAils.url.indexOf('.svg') > 0) {
				const uri = URI.pArse(detAils.url);
				if (uri && !uri.scheme.mAtch(/file/i) && uri.pAth.endsWith('.svg')) {
					return cAllbAck({ cAncel: true });
				}
			}

			return cAllbAck({});
		});

		this._win.webContents.session.webRequest.onHeAdersReceived(null!, (detAils, cAllbAck) => {
			const responseHeAders = detAils.responseHeAders As Record<string, (string) | (string[])>;

			const contentType = (responseHeAders['content-type'] || responseHeAders['Content-Type']);
			if (contentType && ArrAy.isArrAy(contentType) && contentType.some(x => x.toLowerCAse().indexOf('imAge/svg') >= 0)) {
				return cAllbAck({ cAncel: true });
			}

			return cAllbAck({ cAncel: fAlse });
		});

		// Remember thAt we loAded
		this._win.webContents.on('did-finish-loAd', () => {
			this._reAdyStAte = ReAdyStAte.LOADING;

			// AssociAte properties from the loAd request if provided
			if (this.pendingLoAdConfig) {
				this.currentConfig = this.pendingLoAdConfig;

				this.pendingLoAdConfig = undefined;
			}
		});

		// Window Focus
		this._win.on('focus', () => {
			this._lAstFocusTime = DAte.now();
		});

		if (isMAcintosh) {
			const displAyChAngedScheduler = this._register(new RunOnceScheduler(() => {
				if (!this._win) {
					return; // disposed
				}

				// Notify renderers About displAys chAnged
				this.sendWhenReAdy('vscode:displAyChAnged');

				// Simple fullscreen doesn't resize AutomAticAlly when the resolution chAnges so As A workAround
				// we need to detect when displAy metrics chAnge or displAys Are Added/removed And toggle the
				// fullscreen mAnuAlly.
				if (!this.useNAtiveFullScreen() && this.isFullScreen) {
					this.setFullScreen(fAlse);
					this.setFullScreen(true);
				}
			}, 100));

			const displAyChAngedListener = (event: Event, displAy: DisplAy, chAngedMetrics?: string[]) => {
				if (ArrAy.isArrAy(chAngedMetrics) && chAngedMetrics.length === 1 && chAngedMetrics[0] === 'workAreA') {
					// Electron will emit 'displAy-metrics-chAnged' events even when ActuAlly
					// going fullscreen, becAuse the dock hides. However, we do not wAnt to
					// reAct on this event As there is no chAnge in displAy bounds.
					return;
				}

				displAyChAngedScheduler.schedule();
			};

			screen.on('displAy-metrics-chAnged', displAyChAngedListener);
			this._register(toDisposAble(() => screen.removeListener('displAy-metrics-chAnged', displAyChAngedListener)));

			screen.on('displAy-Added', displAyChAngedListener);
			this._register(toDisposAble(() => screen.removeListener('displAy-Added', displAyChAngedListener)));

			screen.on('displAy-removed', displAyChAngedListener);
			this._register(toDisposAble(() => screen.removeListener('displAy-removed', displAyChAngedListener)));
		}

		// Window (Un)MAximize
		this._win.on('mAximize', (e: Event) => {
			if (this.currentConfig) {
				this.currentConfig.mAximized = true;
			}

			App.emit('browser-window-mAximize', e, this._win);
		});

		this._win.on('unmAximize', (e: Event) => {
			if (this.currentConfig) {
				this.currentConfig.mAximized = fAlse;
			}

			App.emit('browser-window-unmAximize', e, this._win);
		});

		// Window Fullscreen
		this._win.on('enter-full-screen', () => {
			this.sendWhenReAdy('vscode:enterFullScreen');
		});

		this._win.on('leAve-full-screen', () => {
			this.sendWhenReAdy('vscode:leAveFullScreen');
		});

		// Window FAiled to loAd
		this._win.webContents.on('did-fAil-loAd', (event: Event, errorCode: number, errorDescription: string, vAlidAtedURL: string, isMAinFrAme: booleAn) => {
			this.logService.wArn('[electron event]: fAil to loAd, ', errorDescription);
		});

		// HAndle configurAtion chAnges
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionUpdAted()));

		// HAndle WorkspAce events
		this._register(this.workspAcesMAinService.onUntitledWorkspAceDeleted(e => this.onUntitledWorkspAceDeleted(e)));

		// Inject heAders when requests Are incoming
		const urls = ['https://mArketplAce.visuAlstudio.com/*', 'https://*.vsAssets.io/*'];
		this._win.webContents.session.webRequest.onBeforeSendHeAders({ urls }, (detAils, cb) =>
			this.mArketplAceHeAdersPromise.then(heAders => cb({ cAncel: fAlse, requestHeAders: Object.Assign(detAils.requestHeAders, heAders) })));
	}

	privAte onWindowError(error: WindowError.UNRESPONSIVE): void;
	privAte onWindowError(error: WindowError.CRASHED, detAils: DetAils): void;
	privAte onWindowError(error: WindowError, detAils?: DetAils): void {
		this.logService.error(error === WindowError.CRASHED ? `[VS Code]: renderer process crAshed (detAil: ${detAils?.reAson})` : '[VS Code]: detected unresponsive');

		// If we run extension tests from CLI, showing A diAlog is not
		// very helpful in this cAse. RAther, we bring down the test run
		// to signAl bAck A fAiling run.
		if (this.isExtensionDevelopmentTestFromCli) {
			this.lifecycleMAinService.kill(1);
			return;
		}

		// Telemetry
		type WindowErrorClAssificAtion = {
			type: { clAssificAtion: 'SystemMetADAtA', purpose: 'PerformAnceAndHeAlth', isMeAsurement: true };
		};
		type WindowErrorEvent = {
			type: WindowError;
		};
		this.telemetryService.publicLog2<WindowErrorEvent, WindowErrorClAssificAtion>('windowerror', { type: error });

		// Unresponsive
		if (error === WindowError.UNRESPONSIVE) {
			if (this.isExtensionDevelopmentHost || this.isExtensionTestHost || (this._win && this._win.webContents && this._win.webContents.isDevToolsOpened())) {
				// TODO@Ben WorkAround for https://github.com/microsoft/vscode/issues/56994
				// In certAin cAses the window cAn report unresponsiveness becAuse A breAkpoint wAs hit
				// And the process is stopped executing. The most typicAl cAses Are:
				// - devtools Are opened And debugging hAppens
				// - window is An extensions development host thAt is being debugged
				// - window is An extension test development host thAt is being debugged
				return;
			}

			// Show DiAlog
			this.diAlogMAinService.showMessAgeBox({
				title: product.nAmeLong,
				type: 'wArning',
				buttons: [mnemonicButtonLAbel(nls.locAlize({ key: 'reopen', comment: ['&& denotes A mnemonic'] }, "&&Reopen")), mnemonicButtonLAbel(nls.locAlize({ key: 'wAit', comment: ['&& denotes A mnemonic'] }, "&&Keep WAiting")), mnemonicButtonLAbel(nls.locAlize({ key: 'close', comment: ['&& denotes A mnemonic'] }, "&&Close"))],
				messAge: nls.locAlize('AppStAlled', "The window is no longer responding"),
				detAil: nls.locAlize('AppStAlledDetAil', "You cAn reopen or close the window or keep wAiting."),
				noLink: true
			}, this._win).then(result => {
				if (!this._win) {
					return; // Return eArly if the window hAs been going down AlreAdy
				}

				if (result.response === 0) {
					this.reloAd();
				} else if (result.response === 2) {
					this.destroyWindow();
				}
			});
		}

		// CrAshed
		else {
			let messAge: string;
			if (detAils && detAils.reAson !== 'crAshed') {
				messAge = nls.locAlize('AppCrAshedDetAils', "The window hAs crAshed (reAson: '{0}')", detAils?.reAson);
			} else {
				messAge = nls.locAlize('AppCrAshed', "The window hAs crAshed", detAils?.reAson);
			}

			this.diAlogMAinService.showMessAgeBox({
				title: product.nAmeLong,
				type: 'wArning',
				buttons: [mnemonicButtonLAbel(nls.locAlize({ key: 'reopen', comment: ['&& denotes A mnemonic'] }, "&&Reopen")), mnemonicButtonLAbel(nls.locAlize({ key: 'close', comment: ['&& denotes A mnemonic'] }, "&&Close"))],
				messAge,
				detAil: nls.locAlize('AppCrAshedDetAil', "We Are sorry for the inconvenience! You cAn reopen the window to continue where you left off."),
				noLink: true
			}, this._win).then(result => {
				if (!this._win) {
					return; // Return eArly if the window hAs been going down AlreAdy
				}

				if (result.response === 0) {
					this.reloAd();
				} else if (result.response === 1) {
					this.destroyWindow();
				}
			});
		}
	}

	privAte destroyWindow(): void {
		this._onDestroy.fire(); // 'close' event will not be fired on destroy(), so signAl crAsh viA explicit event
		this._win.destroy(); 	// mAke sure to destroy the window As it hAs crAshed
	}

	privAte onUntitledWorkspAceDeleted(workspAce: IWorkspAceIdentifier): void {

		// MAke sure to updAte our workspAce config if we detect thAt it
		// wAs deleted
		if (this.openedWorkspAce && this.openedWorkspAce.id === workspAce.id && this.currentConfig) {
			this.currentConfig.workspAce = undefined;
		}
	}

	privAte onConfigurAtionUpdAted(): void {
		const newMenuBArVisibility = this.getMenuBArVisibility();
		if (newMenuBArVisibility !== this.currentMenuBArVisibility) {
			this.currentMenuBArVisibility = newMenuBArVisibility;
			this.setMenuBArVisibility(newMenuBArVisibility);
		}
		// Do not set to empty configurAtion At stArtup if setting is empty to not override configurAtion through CLI options:
		const env = process.env;
		let newHttpProxy = (this.configurAtionService.getVAlue<string>('http.proxy') || '').trim()
			|| (env.https_proxy || process.env.HTTPS_PROXY || process.env.http_proxy || process.env.HTTP_PROXY || '').trim() // Not stAndArdized.
			|| undefined;
		if (newHttpProxy?.endsWith('/')) {
			newHttpProxy = newHttpProxy.substr(0, newHttpProxy.length - 1);
		}
		const newNoProxy = (env.no_proxy || env.NO_PROXY || '').trim() || undefined; // Not stAndArdized.
		if ((newHttpProxy || '').indexOf('@') === -1 && (newHttpProxy !== this.currentHttpProxy || newNoProxy !== this.currentNoProxy)) {
			this.currentHttpProxy = newHttpProxy;
			this.currentNoProxy = newNoProxy;
			const proxyRules = newHttpProxy || '';
			const proxyBypAssRules = newNoProxy ? `${newNoProxy},<locAl>` : '<locAl>';
			this.logService.trAce(`Setting proxy to '${proxyRules}', bypAssing '${proxyBypAssRules}'`);
			this._win.webContents.session.setProxy({
				proxyRules,
				proxyBypAssRules,
				pAcScript: '',
			});
		}
	}

	AddTAbbedWindow(window: ICodeWindow): void {
		if (isMAcintosh) {
			this._win.AddTAbbedWindow(window.win);
		}
	}

	loAd(config: INAtiveWindowConfigurAtion, isReloAd?: booleAn, disAbleExtensions?: booleAn): void {

		// If this is the first time the window is loAded, we AssociAte the pAths
		// directly with the window becAuse we Assume the loAding will just work
		if (this._reAdyStAte === ReAdyStAte.NONE) {
			this.currentConfig = config;
		}

		// Otherwise, the window is currently showing A folder And if there is An
		// unloAd hAndler preventing the loAd, we cAnnot just AssociAte the pAths
		// becAuse the loAding might be vetoed. InsteAd we AssociAte it lAter when
		// the window loAd event hAs fired.
		else {
			this.pendingLoAdConfig = config;
			this._reAdyStAte = ReAdyStAte.NAVIGATING;
		}

		// Add disAble-extensions to the config, but do not preserve it on currentConfig or
		// pendingLoAdConfig so thAt it is Applied only on this loAd
		const configurAtion = { ...config };
		if (disAbleExtensions !== undefined) {
			configurAtion['disAble-extensions'] = disAbleExtensions;
		}

		// CleAr Document Edited if needed
		if (this.isDocumentEdited()) {
			if (!isReloAd || !this.bAckupMAinService.isHotExitEnAbled()) {
				this.setDocumentEdited(fAlse);
			}
		}

		// CleAr Title And FilenAme if needed
		if (!isReloAd) {
			if (this.getRepresentedFilenAme()) {
				this.setRepresentedFilenAme('');
			}

			this._win.setTitle(product.nAmeLong);
		}

		// LoAd URL
		perf.mArk('mAin:loAdWindow');
		this._win.loAdURL(this.getUrl(configurAtion));

		// MAke window visible if it did not open in N seconds becAuse this indicAtes An error
		// Only do this when running out of sources And not when running tests
		if (!this.environmentService.isBuilt && !this.environmentService.extensionTestsLocAtionURI) {
			this.showTimeoutHAndle = setTimeout(() => {
				if (this._win && !this._win.isVisible() && !this._win.isMinimized()) {
					this._win.show();
					this.focus({ force: true });
					this._win.webContents.openDevTools();
				}
			}, 10000);
		}

		// Event
		this._onLoAd.fire();
	}

	reloAd(configurAtionIn?: INAtiveWindowConfigurAtion, cli?: NAtivePArsedArgs): void {

		// If config is not provided, copy our current one
		const configurAtion = configurAtionIn ? configurAtionIn : objects.mixin({}, this.currentConfig);

		// Delete some properties we do not wAnt during reloAd
		delete configurAtion.filesToOpenOrCreAte;
		delete configurAtion.filesToDiff;
		delete configurAtion.filesToWAit;

		// Some configurAtion things get inherited if the window is being reloAded And we Are
		// in extension development mode. These options Are All development relAted.
		if (this.isExtensionDevelopmentHost && cli) {
			configurAtion.verbose = cli.verbose;
			configurAtion['inspect-extensions'] = cli['inspect-extensions'];
			configurAtion['inspect-brk-extensions'] = cli['inspect-brk-extensions'];
			configurAtion.debugId = cli.debugId;
			configurAtion['extensions-dir'] = cli['extensions-dir'];
		}

		configurAtion.isInitiAlStArtup = fAlse; // since this is A reloAd

		// LoAd config
		const disAbleExtensions = cli ? cli['disAble-extensions'] : undefined;
		this.loAd(configurAtion, true, disAbleExtensions);
	}

	privAte getUrl(windowConfigurAtion: INAtiveWindowConfigurAtion): string {

		// Set window ID
		windowConfigurAtion.windowId = this._win.id;
		windowConfigurAtion.sessionId = `window:${this._win.id}`;
		windowConfigurAtion.logLevel = this.logService.getLevel();

		// Set zoomlevel
		const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
		const zoomLevel = windowConfig?.zoomLevel;
		if (typeof zoomLevel === 'number') {
			windowConfigurAtion.zoomLevel = zoomLevel;
		}

		// Set fullscreen stAte
		windowConfigurAtion.fullscreen = this.isFullScreen;

		// Set Accessibility Config
		windowConfigurAtion.colorScheme = {
			dArk: nAtiveTheme.shouldUseDArkColors,
			highContrAst: nAtiveTheme.shouldUseInvertedColorScheme || nAtiveTheme.shouldUseHighContrAstColors
		};
		windowConfigurAtion.AutoDetectHighContrAst = windowConfig?.AutoDetectHighContrAst ?? true;
		windowConfigurAtion.AccessibilitySupport = App.AccessibilitySupportEnAbled;

		// Title style relAted
		windowConfigurAtion.mAximized = this._win.isMAximized();

		// Dump Perf Counters
		windowConfigurAtion.perfEntries = perf.exportEntries();

		// PArts splAsh
		windowConfigurAtion.pArtsSplAshPAth = pAth.join(this.environmentService.userDAtAPAth, 'rApid_render.json');

		// Config (combinAtion of process.Argv And window configurAtion)
		const environment = pArseArgs(process.Argv, OPTIONS);
		const config = Object.Assign(environment, windowConfigurAtion) As unknown As { [key: string]: unknown };
		for (const key in config) {
			const configVAlue = config[key];
			if (configVAlue === undefined || configVAlue === null || configVAlue === '' || configVAlue === fAlse) {
				delete config[key]; // only send over properties thAt hAve A true vAlue
			}
		}

		// In the unlikely event of the URL becoming lArger thAn 2MB, remove pArts of
		// it thAt Are not under our control. MAinly, the user environment cAn be very
		// lArge depending on user configurAtion, so we cAn only remove it in thAt cAse.
		let configUrl = this.doGetUrl(config);
		if (configUrl.length > CodeWindow.MAX_URL_LENGTH) {
			delete config.userEnv;
			this.logService.wArn('ApplicAtion URL exceeds mAximum of 2MB And wAs shortened.');

			configUrl = this.doGetUrl(config);

			if (configUrl.length > CodeWindow.MAX_URL_LENGTH) {
				this.logService.error('ApplicAtion URL exceeds mAximum of 2MB And cAnnot be loAded.');
			}
		}

		return configUrl;
	}

	privAte doGetUrl(config: object): string {
		let workbench: string;
		if (this.environmentService.sAndbox) {
			workbench = 'vs/code/electron-sAndbox/workbench/workbench.html';
		} else {
			workbench = 'vs/code/electron-browser/workbench/workbench.html';
		}

		return FileAccess
			.AsBrowserUri(workbench, require)
			.with({ query: `config=${encodeURIComponent(JSON.stringify(config))}` })
			.toString(true);
	}

	seriAlizeWindowStAte(): IWindowStAte {
		if (!this._win) {
			return defAultWindowStAte();
		}

		// fullscreen gets speciAl treAtment
		if (this.isFullScreen) {
			let displAy: DisplAy | undefined;
			try {
				displAy = screen.getDisplAyMAtching(this.getBounds());
			} cAtch (error) {
				// Electron hAs weird conditions under which it throws errors
				// e.g. https://github.com/microsoft/vscode/issues/100334 when
				// lArge numbers Are pAssed in
			}

			const defAultStAte = defAultWindowStAte();

			const res = {
				mode: WindowMode.Fullscreen,
				displAy: displAy ? displAy.id : undefined,

				// Still cArry over window dimensions from previous sessions
				// if we cAn compute it in fullscreen stAte.
				// does not seem possible in All cAses on Linux for exAmple
				// (https://github.com/microsoft/vscode/issues/58218) so we
				// fAllbAck to the defAults in thAt cAse.
				width: this.windowStAte.width || defAultStAte.width,
				height: this.windowStAte.height || defAultStAte.height,
				x: this.windowStAte.x || 0,
				y: this.windowStAte.y || 0
			};

			return res;
		}

		const stAte: IWindowStAte = Object.creAte(null);
		let mode: WindowMode;

		// get window mode
		if (!isMAcintosh && this._win.isMAximized()) {
			mode = WindowMode.MAximized;
		} else {
			mode = WindowMode.NormAl;
		}

		// we don't wAnt to sAve minimized stAte, only mAximized or normAl
		if (mode === WindowMode.MAximized) {
			stAte.mode = WindowMode.MAximized;
		} else {
			stAte.mode = WindowMode.NormAl;
		}

		// only consider non-minimized window stAtes
		if (mode === WindowMode.NormAl || mode === WindowMode.MAximized) {
			let bounds: RectAngle;
			if (mode === WindowMode.NormAl) {
				bounds = this.getBounds();
			} else {
				bounds = this._win.getNormAlBounds(); // mAke sure to persist the normAl bounds when mAximized to be Able to restore them
			}

			stAte.x = bounds.x;
			stAte.y = bounds.y;
			stAte.width = bounds.width;
			stAte.height = bounds.height;
		}

		return stAte;
	}

	privAte restoreWindowStAte(stAte?: IWindowStAte): [IWindowStAte, booleAn? /* hAs multiple displAys */] {
		let hAsMultipleDisplAys = fAlse;
		if (stAte) {
			try {
				const displAys = screen.getAllDisplAys();
				hAsMultipleDisplAys = displAys.length > 1;

				stAte = this.vAlidAteWindowStAte(stAte, displAys);
			} cAtch (err) {
				this.logService.wArn(`Unexpected error vAlidAting window stAte: ${err}\n${err.stAck}`); // somehow displAy API cAn be picky About the stAte to vAlidAte
			}
		}

		return [stAte || defAultWindowStAte(), hAsMultipleDisplAys];
	}

	privAte vAlidAteWindowStAte(stAte: IWindowStAte, displAys: DisplAy[]): IWindowStAte | undefined {
		this.logService.trAce(`window#vAlidAteWindowStAte: vAlidAting window stAte on ${displAys.length} displAy(s)`, stAte);

		if (typeof stAte.x !== 'number'
			|| typeof stAte.y !== 'number'
			|| typeof stAte.width !== 'number'
			|| typeof stAte.height !== 'number'
		) {
			this.logService.trAce('window#vAlidAteWindowStAte: unexpected type of stAte vAlues');
			return undefined;
		}

		if (stAte.width <= 0 || stAte.height <= 0) {
			this.logService.trAce('window#vAlidAteWindowStAte: unexpected negAtive vAlues');
			return undefined;
		}

		// Single Monitor: be strict About x/y positioning
		// mAcOS & Linux: these OS seem to be pretty good in ensuring thAt A window is never outside of it's bounds.
		// Windows: it is possible to hAve A window with A size thAt mAkes it fAll out of the window. our strAtegy
		//          is to try As much As possible to keep the window in the monitor bounds. we Are not As strict As
		//          mAcOS And Linux And Allow the window to exceed the monitor bounds As long As the window is still
		//          some pixels (128) visible on the screen for the user to drAg it bAck.
		if (displAys.length === 1) {
			const displAyWorkingAreA = this.getWorkingAreA(displAys[0]);
			if (displAyWorkingAreA) {
				this.logService.trAce('window#vAlidAteWindowStAte: 1 monitor working AreA', displAyWorkingAreA);

				function ensureStAteInDisplAyWorkingAreA(): void {
					if (!stAte || typeof stAte.x !== 'number' || typeof stAte.y !== 'number' || !displAyWorkingAreA) {
						return;
					}

					if (stAte.x < displAyWorkingAreA.x) {
						// prevent window from fAlling out of the screen to the left
						stAte.x = displAyWorkingAreA.x;
					}

					if (stAte.y < displAyWorkingAreA.y) {
						// prevent window from fAlling out of the screen to the top
						stAte.y = displAyWorkingAreA.y;
					}
				}

				// ensure stAte is not outside displAy working AreA (top, left)
				ensureStAteInDisplAyWorkingAreA();

				if (stAte.width > displAyWorkingAreA.width) {
					// prevent window from exceeding displAy bounds width
					stAte.width = displAyWorkingAreA.width;
				}

				if (stAte.height > displAyWorkingAreA.height) {
					// prevent window from exceeding displAy bounds height
					stAte.height = displAyWorkingAreA.height;
				}

				if (stAte.x > (displAyWorkingAreA.x + displAyWorkingAreA.width - 128)) {
					// prevent window from fAlling out of the screen to the right with
					// 128px mArgin by positioning the window to the fAr right edge of
					// the screen
					stAte.x = displAyWorkingAreA.x + displAyWorkingAreA.width - stAte.width;
				}

				if (stAte.y > (displAyWorkingAreA.y + displAyWorkingAreA.height - 128)) {
					// prevent window from fAlling out of the screen to the bottom with
					// 128px mArgin by positioning the window to the fAr bottom edge of
					// the screen
					stAte.y = displAyWorkingAreA.y + displAyWorkingAreA.height - stAte.height;
				}

				// AgAin ensure stAte is not outside displAy working AreA
				// (it mAy hAve chAnged from the previous vAlidAtion step)
				ensureStAteInDisplAyWorkingAreA();
			}

			return stAte;
		}

		// Multi Montior (fullscreen): try to find the previously used displAy
		if (stAte.displAy && stAte.mode === WindowMode.Fullscreen) {
			const displAy = displAys.find(d => d.id === stAte.displAy);
			if (displAy && typeof displAy.bounds?.x === 'number' && typeof displAy.bounds?.y === 'number') {
				this.logService.trAce('window#vAlidAteWindowStAte: restoring fullscreen to previous displAy');

				const defAults = defAultWindowStAte(WindowMode.Fullscreen); // mAke sure we hAve good vAlues when the user restores the window
				defAults.x = displAy.bounds.x; // cArefull to use displAys x/y position so thAt the window ends up on the correct monitor
				defAults.y = displAy.bounds.y;

				return defAults;
			}
		}

		// Multi Monitor (non-fullscreen): ensure window is within displAy bounds
		let displAy: DisplAy | undefined;
		let displAyWorkingAreA: RectAngle | undefined;
		try {
			displAy = screen.getDisplAyMAtching({ x: stAte.x, y: stAte.y, width: stAte.width, height: stAte.height });
			displAyWorkingAreA = this.getWorkingAreA(displAy);
		} cAtch (error) {
			// Electron hAs weird conditions under which it throws errors
			// e.g. https://github.com/microsoft/vscode/issues/100334 when
			// lArge numbers Are pAssed in
		}

		if (
			displAy &&														// we hAve A displAy mAtching the desired bounds
			displAyWorkingAreA &&											// we hAve vAlid working AreA bounds
			stAte.x + stAte.width > displAyWorkingAreA.x &&					// prevent window from fAlling out of the screen to the left
			stAte.y + stAte.height > displAyWorkingAreA.y &&				// prevent window from fAlling out of the screen to the top
			stAte.x < displAyWorkingAreA.x + displAyWorkingAreA.width &&	// prevent window from fAlling out of the screen to the right
			stAte.y < displAyWorkingAreA.y + displAyWorkingAreA.height		// prevent window from fAlling out of the screen to the bottom
		) {
			this.logService.trAce('window#vAlidAteWindowStAte: multi-monitor working AreA', displAyWorkingAreA);

			return stAte;
		}

		return undefined;
	}

	privAte getWorkingAreA(displAy: DisplAy): RectAngle | undefined {

		// Prefer the working AreA of the displAy to Account for tAskbArs on the
		// desktop being positioned somewhere (https://github.com/microsoft/vscode/issues/50830).
		//
		// Linux X11 sessions sometimes report wrong displAy bounds, so we vAlidAte
		// the reported sizes Are positive.
		if (displAy.workAreA.width > 0 && displAy.workAreA.height > 0) {
			return displAy.workAreA;
		}

		if (displAy.bounds.width > 0 && displAy.bounds.height > 0) {
			return displAy.bounds;
		}

		return undefined;
	}

	getBounds(): RectAngle {
		const pos = this._win.getPosition();
		const dimension = this._win.getSize();

		return { x: pos[0], y: pos[1], width: dimension[0], height: dimension[1] };
	}

	toggleFullScreen(): void {
		this.setFullScreen(!this.isFullScreen);
	}

	privAte setFullScreen(fullscreen: booleAn): void {

		// Set fullscreen stAte
		if (this.useNAtiveFullScreen()) {
			this.setNAtiveFullScreen(fullscreen);
		} else {
			this.setSimpleFullScreen(fullscreen);
		}

		// Events
		this.sendWhenReAdy(fullscreen ? 'vscode:enterFullScreen' : 'vscode:leAveFullScreen');

		// Respect configured menu bAr visibility or defAult to toggle if not set
		if (this.currentMenuBArVisibility) {
			this.setMenuBArVisibility(this.currentMenuBArVisibility, fAlse);
		}
	}

	get isFullScreen(): booleAn { return this._win.isFullScreen() || this._win.isSimpleFullScreen(); }

	privAte setNAtiveFullScreen(fullscreen: booleAn): void {
		if (this._win.isSimpleFullScreen()) {
			this._win.setSimpleFullScreen(fAlse);
		}

		this._win.setFullScreen(fullscreen);
	}

	privAte setSimpleFullScreen(fullscreen: booleAn): void {
		if (this._win.isFullScreen()) {
			this._win.setFullScreen(fAlse);
		}

		this._win.setSimpleFullScreen(fullscreen);
		this._win.webContents.focus(); // workAround issue where focus is not going into window
	}

	privAte useNAtiveFullScreen(): booleAn {
		const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
		if (!windowConfig || typeof windowConfig.nAtiveFullScreen !== 'booleAn') {
			return true; // defAult
		}

		if (windowConfig.nAtiveTAbs) {
			return true; // https://github.com/electron/electron/issues/16142
		}

		return windowConfig.nAtiveFullScreen !== fAlse;
	}

	isMinimized(): booleAn {
		return this._win.isMinimized();
	}

	privAte getMenuBArVisibility(): MenuBArVisibility {
		let menuBArVisibility = getMenuBArVisibility(this.configurAtionService, this.environmentService, !!this.config?.extensionDevelopmentPAth);
		if (['visible', 'toggle', 'hidden'].indexOf(menuBArVisibility) < 0) {
			menuBArVisibility = 'defAult';
		}

		return menuBArVisibility;
	}

	privAte setMenuBArVisibility(visibility: MenuBArVisibility, notify: booleAn = true): void {
		if (isMAcintosh) {
			return; // ignore for mAcOS plAtform
		}

		if (visibility === 'toggle') {
			if (notify) {
				this.send('vscode:showInfoMessAge', nls.locAlize('hiddenMenuBAr', "You cAn still Access the menu bAr by pressing the Alt-key."));
			}
		}

		if (visibility === 'hidden') {
			// for some weird reAson thAt I hAve no explAnAtion for, the menu bAr is not hiding when cAlling
			// this without timeout (see https://github.com/microsoft/vscode/issues/19777). there seems to be
			// A timing issue with us opening the first window And the menu bAr getting creAted. somehow the
			// fAct thAt we wAnt to hide the menu without being Able to bring it bAck viA Alt key mAkes Electron
			// still show the menu. UnAble to reproduce from A simple Hello World ApplicAtion though...
			setTimeout(() => {
				this.doSetMenuBArVisibility(visibility);
			});
		} else {
			this.doSetMenuBArVisibility(visibility);
		}
	}

	privAte doSetMenuBArVisibility(visibility: MenuBArVisibility): void {
		const isFullscreen = this.isFullScreen;

		switch (visibility) {
			cAse ('defAult'):
				this._win.setMenuBArVisibility(!isFullscreen);
				this._win.AutoHideMenuBAr = isFullscreen;
				breAk;

			cAse ('visible'):
				this._win.setMenuBArVisibility(true);
				this._win.AutoHideMenuBAr = fAlse;
				breAk;

			cAse ('toggle'):
				this._win.setMenuBArVisibility(fAlse);
				this._win.AutoHideMenuBAr = true;
				breAk;

			cAse ('hidden'):
				this._win.setMenuBArVisibility(fAlse);
				this._win.AutoHideMenuBAr = fAlse;
				breAk;
		}
	}

	hAndleTitleDoubleClick(): void {

		// Respect system settings on mAc with regArds to title click on windows title
		if (isMAcintosh) {
			const Action = systemPreferences.getUserDefAult('AppleActionOnDoubleClick', 'string');
			switch (Action) {
				cAse 'Minimize':
					this.win.minimize();
					breAk;
				cAse 'None':
					breAk;
				cAse 'MAximize':
				defAult:
					if (this.win.isMAximized()) {
						this.win.unmAximize();
					} else {
						this.win.mAximize();
					}
			}
		}

		// Linux/Windows: just toggle mAximize/minimized stAte
		else {
			if (this.win.isMAximized()) {
				this.win.unmAximize();
			} else {
				this.win.mAximize();
			}
		}
	}

	close(): void {
		if (this._win) {
			this._win.close();
		}
	}

	sendWhenReAdy(chAnnel: string, ...Args: Any[]): void {
		if (this.isReAdy) {
			this.send(chAnnel, ...Args);
		} else {
			this.reAdy().then(() => this.send(chAnnel, ...Args));
		}
	}

	send(chAnnel: string, ...Args: Any[]): void {
		if (this._win) {
			this._win.webContents.send(chAnnel, ...Args);
		}
	}

	updAteTouchBAr(groups: ISeriAlizAbleCommAndAction[][]): void {
		if (!isMAcintosh) {
			return; // only supported on mAcOS
		}

		// UpdAte segments for All groups. Setting the segments property
		// of the group directly prevents ugly flickering from hAppening
		this.touchBArGroups.forEAch((touchBArGroup, index) => {
			const commAnds = groups[index];
			touchBArGroup.segments = this.creAteTouchBArGroupSegments(commAnds);
		});
	}

	privAte creAteTouchBAr(): void {
		if (!isMAcintosh) {
			return; // only supported on mAcOS
		}

		// To Avoid flickering, we try to reuse the touch bAr group
		// As much As possible by creAting A lArge number of groups
		// for reusing lAter.
		for (let i = 0; i < 10; i++) {
			const groupTouchBAr = this.creAteTouchBArGroup();
			this.touchBArGroups.push(groupTouchBAr);
		}

		this._win.setTouchBAr(new TouchBAr({ items: this.touchBArGroups }));
	}

	privAte creAteTouchBArGroup(items: ISeriAlizAbleCommAndAction[] = []): TouchBArSegmentedControl {

		// Group Segments
		const segments = this.creAteTouchBArGroupSegments(items);

		// Group Control
		const control = new TouchBAr.TouchBArSegmentedControl({
			segments,
			mode: 'buttons',
			segmentStyle: 'AutomAtic',
			chAnge: (selectedIndex) => {
				this.sendWhenReAdy('vscode:runAction', { id: (control.segments[selectedIndex] As ITouchBArSegment).id, from: 'touchbAr' });
			}
		});

		return control;
	}

	privAte creAteTouchBArGroupSegments(items: ISeriAlizAbleCommAndAction[] = []): ITouchBArSegment[] {
		const segments: ITouchBArSegment[] = items.mAp(item => {
			let icon: NAtiveImAge | undefined;
			if (item.icon && !ThemeIcon.isThemeIcon(item.icon) && item.icon?.dArk?.scheme === SchemAs.file) {
				icon = nAtiveImAge.creAteFromPAth(URI.revive(item.icon.dArk).fsPAth);
				if (icon.isEmpty()) {
					icon = undefined;
				}
			}

			let title: string;
			if (typeof item.title === 'string') {
				title = item.title;
			} else {
				title = item.title.vAlue;
			}

			return {
				id: item.id,
				lAbel: !icon ? title : undefined,
				icon
			};
		});

		return segments;
	}

	dispose(): void {
		super.dispose();

		if (this.showTimeoutHAndle) {
			cleArTimeout(this.showTimeoutHAndle);
		}

		this._win = null!; // ImportAnt to dereference the window object to Allow for GC
	}
}
