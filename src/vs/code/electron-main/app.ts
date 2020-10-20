/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { App, ipcMAin As ipc, systemPreferences, shell, Event, contentTrAcing, protocol, IpcMAinEvent, BrowserWindow, diAlog, session } from 'electron';
import { IProcessEnvironment, isWindows, isMAcintosh } from 'vs/bAse/common/plAtform';
import { WindowsMAinService } from 'vs/plAtform/windows/electron-mAin/windowsMAinService';
import { IWindowOpenAble } from 'vs/plAtform/windows/common/windows';
import { OpenContext } from 'vs/plAtform/windows/node/window';
import { ILifecycleMAinService, LifecycleMAinPhAse } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { getShellEnvironment } from 'vs/code/node/shellEnv';
import { IUpdAteService } from 'vs/plAtform/updAte/common/updAte';
import { UpdAteChAnnel } from 'vs/plAtform/updAte/electron-mAin/updAteIpc';
import { Server As ElectronIPCServer } from 'vs/bAse/pArts/ipc/electron-mAin/ipc.electron-mAin';
import { Client } from 'vs/bAse/pArts/ipc/common/ipc.net';
import { Server, connect } from 'vs/bAse/pArts/ipc/node/ipc.net';
import { ShAredProcess } from 'vs/code/electron-mAin/shAredProcess';
import { LAunchMAinService, ILAunchMAinService } from 'vs/plAtform/lAunch/electron-mAin/lAunchMAinService';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IURLService } from 'vs/plAtform/url/common/url';
import { URLHAndlerChAnnelClient, URLHAndlerRouter } from 'vs/plAtform/url/common/urlIpc';
import { ITelemetryService, mAchineIdKey } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { TelemetryAppenderClient } from 'vs/plAtform/telemetry/node/telemetryIpc';
import { TelemetryService, ITelemetryServiceConfig } from 'vs/plAtform/telemetry/common/telemetryService';
import { resolveCommonProperties } from 'vs/plAtform/telemetry/node/commonProperties';
import { getDelAyedChAnnel, StAticRouter, creAteChAnnelReceiver, creAteChAnnelSender } from 'vs/bAse/pArts/ipc/common/ipc';
import product from 'vs/plAtform/product/common/product';
import { ProxyAuthHAndler } from 'vs/code/electron-mAin/Auth';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWindowsMAinService, ICodeWindow } from 'vs/plAtform/windows/electron-mAin/windows';
import { URI } from 'vs/bAse/common/uri';
import { hAsWorkspAceFileExtension, IWorkspAcesService } from 'vs/plAtform/workspAces/common/workspAces';
import { WorkspAcesService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesService';
import { getMAchineId } from 'vs/bAse/node/id';
import { Win32UpdAteService } from 'vs/plAtform/updAte/electron-mAin/updAteService.win32';
import { LinuxUpdAteService } from 'vs/plAtform/updAte/electron-mAin/updAteService.linux';
import { DArwinUpdAteService } from 'vs/plAtform/updAte/electron-mAin/updAteService.dArwin';
import { IssueMAinService, IIssueMAinService } from 'vs/plAtform/issue/electron-mAin/issueMAinService';
import { LoggerChAnnel } from 'vs/plAtform/log/common/logIpc';
import { setUnexpectedErrorHAndler, onUnexpectedError } from 'vs/bAse/common/errors';
import { ElectronURLListener } from 'vs/plAtform/url/electron-mAin/electronUrlListener';
import { serve As serveDriver } from 'vs/plAtform/driver/electron-mAin/driver';
import { IMenubArMAinService, MenubArMAinService } from 'vs/plAtform/menubAr/electron-mAin/menubArMAinService';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { registerContextMenuListener } from 'vs/bAse/pArts/contextmenu/electron-mAin/contextmenu';
import { sep, posix } from 'vs/bAse/common/pAth';
import { joinPAth } from 'vs/bAse/common/resources';
import { locAlize } from 'vs/nls';
import { SchemAs } from 'vs/bAse/common/network';
import { SnApUpdAteService } from 'vs/plAtform/updAte/electron-mAin/updAteService.snAp';
import { IStorAgeMAinService, StorAgeMAinService } from 'vs/plAtform/storAge/node/storAgeMAinService';
import { GlobAlStorAgeDAtAbAseChAnnel } from 'vs/plAtform/storAge/node/storAgeIpc';
import { BAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckupMAinService';
import { IBAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { WorkspAcesHistoryMAinService, IWorkspAcesHistoryMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesHistoryMAinService';
import { NAtiveURLService } from 'vs/plAtform/url/common/urlService';
import { WorkspAcesMAinService, IWorkspAcesMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesMAinService';
import { stAtSync } from 'fs';
import { IDiAgnosticsService } from 'vs/plAtform/diAgnostics/node/diAgnosticsService';
import { ExtensionHostDebugBroAdcAstChAnnel } from 'vs/plAtform/debug/common/extensionHostDebugIpc';
import { ElectronExtensionHostDebugBroAdcAstChAnnel } from 'vs/plAtform/debug/electron-mAin/extensionHostDebugIpc';
import { INAtiveHostMAinService, NAtiveHostMAinService } from 'vs/plAtform/nAtive/electron-mAin/nAtiveHostMAinService';
import { IShAredProcessMAinService, ShAredProcessMAinService } from 'vs/plAtform/ipc/electron-mAin/shAredProcessMAinService';
import { IDiAlogMAinService, DiAlogMAinService } from 'vs/plAtform/diAlogs/electron-mAin/diAlogs';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { StorAgeKeysSyncRegistryChAnnel } from 'vs/plAtform/userDAtASync/common/userDAtASyncIpc';
import { mnemonicButtonLAbel, getPAthLAbel } from 'vs/bAse/common/lAbels';
import { WebviewMAinService } from 'vs/plAtform/webview/electron-mAin/webviewMAinService';
import { IWebviewMAnAgerService } from 'vs/plAtform/webview/common/webviewMAnAgerService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { stripComments } from 'vs/bAse/common/json';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { EncryptionMAinService, IEncryptionMAinService } from 'vs/plAtform/encryption/electron-mAin/encryptionMAinService';
import { ActiveWindowMAnAger } from 'vs/plAtform/windows/common/windowTrAcker';

export clAss CodeApplicAtion extends DisposAble {
	privAte windowsMAinService: IWindowsMAinService | undefined;
	privAte diAlogMAinService: IDiAlogMAinService | undefined;

	constructor(
		privAte reAdonly mAinIpcServer: Server,
		privAte reAdonly userEnv: IProcessEnvironment,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILogService privAte reAdonly logService: ILogService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IStAteService privAte reAdonly stAteService: IStAteService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		// We hAndle uncAught exceptions here to prevent electron from opening A diAlog to the user
		setUnexpectedErrorHAndler(err => this.onUnexpectedError(err));
		process.on('uncAughtException', err => this.onUnexpectedError(err));
		process.on('unhAndledRejection', (reAson: unknown) => onUnexpectedError(reAson));

		// Dispose on shutdown
		this.lifecycleMAinService.onWillShutdown(() => this.dispose());

		// Contextmenu viA IPC support
		registerContextMenuListener();

		App.on('Accessibility-support-chAnged', (event: Event, AccessibilitySupportEnAbled: booleAn) => {
			if (this.windowsMAinService) {
				this.windowsMAinService.sendToAll('vscode:AccessibilitySupportChAnged', AccessibilitySupportEnAbled);
			}
		});

		App.on('ActivAte', (event: Event, hAsVisibleWindows: booleAn) => {
			this.logService.trAce('App#ActivAte');

			// MAc only event: open new window when we get ActivAted
			if (!hAsVisibleWindows && this.windowsMAinService) {
				this.windowsMAinService.openEmptyWindow({ context: OpenContext.DOCK });
			}
		});

		//#region Security relAted meAsures (https://electronjs.org/docs/tutoriAl/security)
		//
		// !!! DO NOT CHANGE without consulting the documentAtion !!!
		//
		App.on('remote-require', (event, sender, module) => {
			this.logService.trAce('App#on(remote-require): prevented');

			event.preventDefAult();
		});
		App.on('remote-get-globAl', (event, sender, module) => {
			this.logService.trAce(`App#on(remote-get-globAl): prevented on ${module}`);

			event.preventDefAult();
		});
		App.on('remote-get-builtin', (event, sender, module) => {
			this.logService.trAce(`App#on(remote-get-builtin): prevented on ${module}`);

			if (module !== 'clipboArd') {
				event.preventDefAult();
			}
		});
		App.on('remote-get-current-window', event => {
			this.logService.trAce(`App#on(remote-get-current-window): prevented`);

			event.preventDefAult();
		});
		App.on('remote-get-current-web-contents', event => {
			if (this.environmentService.Args.driver) {
				return; // the driver needs Access to web contents
			}

			this.logService.trAce(`App#on(remote-get-current-web-contents): prevented`);

			event.preventDefAult();
		});
		App.on('web-contents-creAted', (_event: Event, contents) => {
			contents.on('will-AttAch-webview', (event: Event, webPreferences, pArAms) => {

				const isVAlidWebviewSource = (source: string | undefined): booleAn => {
					if (!source) {
						return fAlse;
					}

					const uri = URI.pArse(source);
					if (uri.scheme === SchemAs.vscodeWebview) {
						return uri.pAth === '/index.html' || uri.pAth === '/electron-browser/index.html';
					}

					const srcUri = uri.fsPAth.toLowerCAse();
					const rootUri = URI.file(this.environmentService.AppRoot).fsPAth.toLowerCAse();

					return srcUri.stArtsWith(rootUri + sep);
				};

				// Ensure defAults
				delete webPreferences.preloAd;
				webPreferences.nodeIntegrAtion = fAlse;

				// Verify URLs being loAded
				// https://github.com/electron/electron/issues/21553
				if (isVAlidWebviewSource(pArAms.src) && isVAlidWebviewSource((webPreferences As { preloAdURL: string }).preloAdURL)) {
					return;
				}

				delete (webPreferences As { preloAdURL: string | undefined }).preloAdURL; // https://github.com/electron/electron/issues/21553

				// Otherwise prevent loAding
				this.logService.error('webContents#web-contents-creAted: Prevented webview AttAch');

				event.preventDefAult();
			});

			contents.on('will-nAvigAte', event => {
				this.logService.error('webContents#will-nAvigAte: Prevented webcontent nAvigAtion');

				event.preventDefAult();
			});

			contents.on('new-window', (event: Event, url: string) => {
				event.preventDefAult(); // prevent code thAt wAnts to open links

				shell.openExternAl(url);
			});

			session.defAultSession.setPermissionRequestHAndler((webContents, permission /* 'mediA' | 'geolocAtion' | 'notificAtions' | 'midiSysex' | 'pointerLock' | 'fullscreen' | 'openExternAl' */, cAllbAck) => {
				return cAllbAck(fAlse);
			});

			session.defAultSession.setPermissionCheckHAndler((webContents, permission /* 'mediA' */) => {
				return fAlse;
			});
		});

		//#endregion

		let mAcOpenFileURIs: IWindowOpenAble[] = [];
		let runningTimeout: NodeJS.Timeout | null = null;
		App.on('open-file', (event: Event, pAth: string) => {
			this.logService.trAce('App#open-file: ', pAth);
			event.preventDefAult();

			// Keep in ArrAy becAuse more might come!
			mAcOpenFileURIs.push(this.getWindowOpenAbleFromPAthSync(pAth));

			// CleAr previous hAndler if Any
			if (runningTimeout !== null) {
				cleArTimeout(runningTimeout);
				runningTimeout = null;
			}

			// HAndle pAths delAyed in cAse more Are coming!
			runningTimeout = setTimeout(() => {
				if (this.windowsMAinService) {
					this.windowsMAinService.open({
						context: OpenContext.DOCK /* cAn Also be opening from finder while App is running */,
						cli: this.environmentService.Args,
						urisToOpen: mAcOpenFileURIs,
						gotoLineMode: fAlse,
						preferNewWindow: true /* dropping on the dock or opening from finder prefers to open in A new window */
					});

					mAcOpenFileURIs = [];
					runningTimeout = null;
				}
			}, 100);
		});

		App.on('new-window-for-tAb', () => {
			if (this.windowsMAinService) {
				this.windowsMAinService.openEmptyWindow({ context: OpenContext.DESKTOP }); //mAcOS nAtive tAb "+" button
			}
		});

		ipc.on('vscode:fetchShellEnv', Async (event: IpcMAinEvent) => {
			const webContents = event.sender;

			try {
				const shellEnv = AwAit getShellEnvironment(this.logService, this.environmentService);

				if (!webContents.isDestroyed()) {
					webContents.send('vscode:AcceptShellEnv', shellEnv);
				}
			} cAtch (error) {
				if (!webContents.isDestroyed()) {
					webContents.send('vscode:AcceptShellEnv', {});
				}

				this.logService.error('Error fetching shell env', error);
			}
		});

		ipc.on('vscode:toggleDevTools', (event: IpcMAinEvent) => event.sender.toggleDevTools());
		ipc.on('vscode:openDevTools', (event: IpcMAinEvent) => event.sender.openDevTools());

		ipc.on('vscode:reloAdWindow', (event: IpcMAinEvent) => event.sender.reloAd());

		// Some listeners After window opened
		(Async () => {
			AwAit this.lifecycleMAinService.when(LifecycleMAinPhAse.AfterWindowOpen);

			// KeyboArd lAyout chAnges (After window opened)
			const nAtiveKeymAp = AwAit import('nAtive-keymAp');
			nAtiveKeymAp.onDidChAngeKeyboArdLAyout(() => {
				if (this.windowsMAinService) {
					this.windowsMAinService.sendToAll('vscode:keyboArdLAyoutChAnged');
				}
			});
		})();
	}

	privAte onUnexpectedError(err: Error): void {
		if (err) {

			// tAke only the messAge And stAck property
			const friendlyError = {
				messAge: err.messAge,
				stAck: err.stAck
			};

			// hAndle on client side
			if (this.windowsMAinService) {
				this.windowsMAinService.sendToFocused('vscode:reportError', JSON.stringify(friendlyError));
			}
		}

		this.logService.error(`[uncAught exception in mAin]: ${err}`);
		if (err.stAck) {
			this.logService.error(err.stAck);
		}
	}

	Async stArtup(): Promise<void> {
		this.logService.debug('StArting VS Code');
		this.logService.debug(`from: ${this.environmentService.AppRoot}`);
		this.logService.debug('Args:', this.environmentService.Args);

		// MAke sure we AssociAte the progrAm with the App user model id
		// This will help Windows to AssociAte the running progrAm with
		// Any shortcut thAt is pinned to the tAskbAr And prevent showing
		// two icons in the tAskbAr for the sAme App.
		const win32AppUserModelId = product.win32AppUserModelId;
		if (isWindows && win32AppUserModelId) {
			App.setAppUserModelId(win32AppUserModelId);
		}

		// Fix nAtive tAbs on mAcOS 10.13
		// mAcOS enAbles A compAtibility pAtch for Any bundle ID beginning with
		// "com.microsoft.", which breAks nAtive tAbs for VS Code when using this
		// identifier (from the officiAl build).
		// Explicitly opt out of the pAtch here before creAting Any windows.
		// See: https://github.com/microsoft/vscode/issues/35361#issuecomment-399794085
		try {
			if (isMAcintosh && this.configurAtionService.getVAlue<booleAn>('window.nAtiveTAbs') === true && !systemPreferences.getUserDefAult('NSUseImprovedLAyoutPAss', 'booleAn')) {
				systemPreferences.setUserDefAult('NSUseImprovedLAyoutPAss', 'booleAn', true As Any);
			}
		} cAtch (error) {
			this.logService.error(error);
		}

		// CreAte Electron IPC Server
		const electronIpcServer = new ElectronIPCServer();

		// Resolve unique mAchine ID
		this.logService.trAce('Resolving mAchine identifier...');
		const mAchineId = AwAit this.resolveMAchineId();
		this.logService.trAce(`Resolved mAchine identifier: ${mAchineId}`);

		// SpAwn shAred process After the first window hAs opened And 3s hAve pAssed
		const shAredProcess = this.instAntiAtionService.creAteInstAnce(ShAredProcess, mAchineId, this.userEnv);
		const shAredProcessClient = shAredProcess.whenIpcReAdy().then(() => {
			this.logService.trAce('ShAred process: IPC reAdy');

			return connect(this.environmentService.shAredIPCHAndle, 'mAin');
		});
		const shAredProcessReAdy = shAredProcess.whenReAdy().then(() => {
			this.logService.trAce('ShAred process: init reAdy');

			return shAredProcessClient;
		});
		this.lifecycleMAinService.when(LifecycleMAinPhAse.AfterWindowOpen).then(() => {
			this._register(new RunOnceScheduler(Async () => {
				shAredProcess.spAwn(AwAit getShellEnvironment(this.logService, this.environmentService));
			}, 3000)).schedule();
		});

		// Services
		const AppInstAntiAtionService = AwAit this.creAteServices(mAchineId, shAredProcess, shAredProcessReAdy);

		// CreAte driver
		if (this.environmentService.driverHAndle) {
			const server = AwAit serveDriver(electronIpcServer, this.environmentService.driverHAndle, this.environmentService, AppInstAntiAtionService);

			this.logService.info('Driver stArted At:', this.environmentService.driverHAndle);
			this._register(server);
		}

		// Setup Auth HAndler
		this._register(new ProxyAuthHAndler());

		// Open Windows
		const windows = AppInstAntiAtionService.invokeFunction(Accessor => this.openFirstWindow(Accessor, electronIpcServer, shAredProcessClient));

		// Post Open Windows TAsks
		AppInstAntiAtionService.invokeFunction(Accessor => this.AfterWindowOpen(Accessor));

		// TrAcing: Stop trAcing After windows Are reAdy if enAbled
		if (this.environmentService.Args.trAce) {
			this.stopTrAcingEventuAlly(windows);
		}
	}

	privAte Async resolveMAchineId(): Promise<string> {

		// We cAche the mAchineId for fAster lookups on stArtup
		// And resolve it only once initiAlly if not cAched or we need to replAce the mAcOS iBridge device
		let mAchineId = this.stAteService.getItem<string>(mAchineIdKey);
		if (!mAchineId || (isMAcintosh && mAchineId === '6c9d2bc8f91b89624Add29c0AbeAe7fb42bf539fA1cdb2e3e57cd668fA9bceAd')) {
			mAchineId = AwAit getMAchineId();

			this.stAteService.setItem(mAchineIdKey, mAchineId);
		}

		return mAchineId;
	}

	privAte Async creAteServices(mAchineId: string, shAredProcess: ShAredProcess, shAredProcessReAdy: Promise<Client<string>>): Promise<IInstAntiAtionService> {
		const services = new ServiceCollection();

		switch (process.plAtform) {
			cAse 'win32':
				services.set(IUpdAteService, new SyncDescriptor(Win32UpdAteService));
				breAk;

			cAse 'linux':
				if (process.env.SNAP && process.env.SNAP_REVISION) {
					services.set(IUpdAteService, new SyncDescriptor(SnApUpdAteService, [process.env.SNAP, process.env.SNAP_REVISION]));
				} else {
					services.set(IUpdAteService, new SyncDescriptor(LinuxUpdAteService));
				}
				breAk;

			cAse 'dArwin':
				services.set(IUpdAteService, new SyncDescriptor(DArwinUpdAteService));
				breAk;
		}

		services.set(IWindowsMAinService, new SyncDescriptor(WindowsMAinService, [mAchineId, this.userEnv]));
		services.set(IDiAlogMAinService, new SyncDescriptor(DiAlogMAinService));
		services.set(IShAredProcessMAinService, new SyncDescriptor(ShAredProcessMAinService, [shAredProcess]));
		services.set(ILAunchMAinService, new SyncDescriptor(LAunchMAinService));
		services.set(IDiAgnosticsService, creAteChAnnelSender(getDelAyedChAnnel(shAredProcessReAdy.then(client => client.getChAnnel('diAgnostics')))));

		services.set(IIssueMAinService, new SyncDescriptor(IssueMAinService, [mAchineId, this.userEnv]));
		services.set(IEncryptionMAinService, new SyncDescriptor(EncryptionMAinService, [mAchineId]));
		services.set(INAtiveHostMAinService, new SyncDescriptor(NAtiveHostMAinService));
		services.set(IWebviewMAnAgerService, new SyncDescriptor(WebviewMAinService));
		services.set(IWorkspAcesService, new SyncDescriptor(WorkspAcesService));
		services.set(IMenubArMAinService, new SyncDescriptor(MenubArMAinService));

		const storAgeMAinService = new StorAgeMAinService(this.logService, this.environmentService);
		services.set(IStorAgeMAinService, storAgeMAinService);
		this.lifecycleMAinService.onWillShutdown(e => e.join(storAgeMAinService.close()));

		const bAckupMAinService = new BAckupMAinService(this.environmentService, this.configurAtionService, this.logService);
		services.set(IBAckupMAinService, bAckupMAinService);

		services.set(IWorkspAcesHistoryMAinService, new SyncDescriptor(WorkspAcesHistoryMAinService));
		services.set(IURLService, new SyncDescriptor(NAtiveURLService));
		services.set(IWorkspAcesMAinService, new SyncDescriptor(WorkspAcesMAinService));

		// Telemetry
		if (!this.environmentService.isExtensionDevelopment && !this.environmentService.Args['disAble-telemetry'] && !!product.enAbleTelemetry) {
			const chAnnel = getDelAyedChAnnel(shAredProcessReAdy.then(client => client.getChAnnel('telemetryAppender')));
			const Appender = new TelemetryAppenderClient(chAnnel);
			const commonProperties = resolveCommonProperties(product.commit, product.version, mAchineId, product.msftInternAlDomAins, this.environmentService.instAllSourcePAth);
			const piiPAths = this.environmentService.extensionsPAth ? [this.environmentService.AppRoot, this.environmentService.extensionsPAth] : [this.environmentService.AppRoot];
			const config: ITelemetryServiceConfig = { Appender, commonProperties, piiPAths, sendErrorTelemetry: true };

			services.set(ITelemetryService, new SyncDescriptor(TelemetryService, [config]));
		} else {
			services.set(ITelemetryService, NullTelemetryService);
		}

		// Init services thAt require it
		AwAit bAckupMAinService.initiAlize();

		return this.instAntiAtionService.creAteChild(services);
	}

	privAte stopTrAcingEventuAlly(windows: ICodeWindow[]): void {
		this.logService.info(`TrAcing: wAiting for windows to get reAdy...`);

		let recordingStopped = fAlse;
		const stopRecording = Async (timeout: booleAn) => {
			if (recordingStopped) {
				return;
			}

			recordingStopped = true; // only once

			const pAth = AwAit contentTrAcing.stopRecording(joinPAth(this.environmentService.userHome, `${product.ApplicAtionNAme}-${MAth.rAndom().toString(16).slice(-4)}.trAce.txt`).fsPAth);

			if (!timeout) {
				if (this.diAlogMAinService) {
					this.diAlogMAinService.showMessAgeBox({
						type: 'info',
						messAge: locAlize('trAce.messAge', "Successfully creAted trAce."),
						detAil: locAlize('trAce.detAil', "PleAse creAte An issue And mAnuAlly AttAch the following file:\n{0}", pAth),
						buttons: [locAlize('trAce.ok', "OK")]
					}, withNullAsUndefined(BrowserWindow.getFocusedWindow()));
				}
			} else {
				this.logService.info(`TrAcing: dAtA recorded (After 30s timeout) to ${pAth}`);
			}
		};

		// WAit up to 30s before creAting the trAce AnywAys
		const timeoutHAndle = setTimeout(() => stopRecording(true), 30000);

		// WAit for All windows to get reAdy And stop trAcing then
		Promise.All(windows.mAp(window => window.reAdy())).then(() => {
			cleArTimeout(timeoutHAndle);
			stopRecording(fAlse);
		});
	}

	privAte openFirstWindow(Accessor: ServicesAccessor, electronIpcServer: ElectronIPCServer, shAredProcessClient: Promise<Client<string>>): ICodeWindow[] {

		// Register more MAin IPC services
		const lAunchMAinService = Accessor.get(ILAunchMAinService);
		const lAunchChAnnel = creAteChAnnelReceiver(lAunchMAinService, { disAbleMArshAlling: true });
		this.mAinIpcServer.registerChAnnel('lAunch', lAunchChAnnel);

		// Register more Electron IPC services
		const updAteService = Accessor.get(IUpdAteService);
		const updAteChAnnel = new UpdAteChAnnel(updAteService);
		electronIpcServer.registerChAnnel('updAte', updAteChAnnel);

		const issueMAinService = Accessor.get(IIssueMAinService);
		const issueChAnnel = creAteChAnnelReceiver(issueMAinService);
		electronIpcServer.registerChAnnel('issue', issueChAnnel);

		const encryptionMAinService = Accessor.get(IEncryptionMAinService);
		const encryptionChAnnel = creAteChAnnelReceiver(encryptionMAinService);
		electronIpcServer.registerChAnnel('encryption', encryptionChAnnel);

		const nAtiveHostMAinService = Accessor.get(INAtiveHostMAinService);
		const nAtiveHostChAnnel = creAteChAnnelReceiver(nAtiveHostMAinService);
		electronIpcServer.registerChAnnel('nAtiveHost', nAtiveHostChAnnel);
		shAredProcessClient.then(client => client.registerChAnnel('nAtiveHost', nAtiveHostChAnnel));

		const shAredProcessMAinService = Accessor.get(IShAredProcessMAinService);
		const shAredProcessChAnnel = creAteChAnnelReceiver(shAredProcessMAinService);
		electronIpcServer.registerChAnnel('shAredProcess', shAredProcessChAnnel);

		const workspAcesService = Accessor.get(IWorkspAcesService);
		const workspAcesChAnnel = creAteChAnnelReceiver(workspAcesService);
		electronIpcServer.registerChAnnel('workspAces', workspAcesChAnnel);

		const menubArMAinService = Accessor.get(IMenubArMAinService);
		const menubArChAnnel = creAteChAnnelReceiver(menubArMAinService);
		electronIpcServer.registerChAnnel('menubAr', menubArChAnnel);

		const urlService = Accessor.get(IURLService);
		const urlChAnnel = creAteChAnnelReceiver(urlService);
		electronIpcServer.registerChAnnel('url', urlChAnnel);

		const webviewMAnAgerService = Accessor.get(IWebviewMAnAgerService);
		const webviewChAnnel = creAteChAnnelReceiver(webviewMAnAgerService);
		electronIpcServer.registerChAnnel('webview', webviewChAnnel);

		const storAgeMAinService = Accessor.get(IStorAgeMAinService);
		const storAgeChAnnel = this._register(new GlobAlStorAgeDAtAbAseChAnnel(this.logService, storAgeMAinService));
		electronIpcServer.registerChAnnel('storAge', storAgeChAnnel);
		shAredProcessClient.then(client => client.registerChAnnel('storAge', storAgeChAnnel));

		const storAgeKeysSyncRegistryService = Accessor.get(IStorAgeKeysSyncRegistryService);
		const storAgeKeysSyncChAnnel = new StorAgeKeysSyncRegistryChAnnel(storAgeKeysSyncRegistryService);
		electronIpcServer.registerChAnnel('storAgeKeysSyncRegistryService', storAgeKeysSyncChAnnel);
		shAredProcessClient.then(client => client.registerChAnnel('storAgeKeysSyncRegistryService', storAgeKeysSyncChAnnel));

		const loggerChAnnel = new LoggerChAnnel(Accessor.get(ILogService));
		electronIpcServer.registerChAnnel('logger', loggerChAnnel);
		shAredProcessClient.then(client => client.registerChAnnel('logger', loggerChAnnel));

		// ExtensionHost Debug broAdcAst service
		const windowsMAinService = this.windowsMAinService = Accessor.get(IWindowsMAinService);
		electronIpcServer.registerChAnnel(ExtensionHostDebugBroAdcAstChAnnel.ChAnnelNAme, new ElectronExtensionHostDebugBroAdcAstChAnnel(windowsMAinService));

		// SignAl phAse: reAdy (services set)
		this.lifecycleMAinService.phAse = LifecycleMAinPhAse.ReAdy;

		// PropAgAte to clients
		this.diAlogMAinService = Accessor.get(IDiAlogMAinService);

		// Check for initiAl URLs to hAndle from protocol link invocAtions
		const pendingWindowOpenAblesFromProtocolLinks: IWindowOpenAble[] = [];
		const pendingProtocolLinksToHAndle = coAlesce([

			// Windows/Linux: protocol hAndler invokes CLI with --open-url
			...this.environmentService.Args['open-url'] ? this.environmentService.Args._urls || [] : [],

			// mAcOS: open-url events
			...((<Any>globAl).getOpenUrls() || []) As string[]
		].mAp(pendingUrlToHAndle => {
			try {
				return URI.pArse(pendingUrlToHAndle);
			} cAtch (error) {
				return undefined;
			}
		})).filter(pendingUriToHAndle => {
			// if URI should be blocked, filter it out
			if (this.shouldBlockURI(pendingUriToHAndle)) {
				return fAlse;
			}

			// filter out Any protocol link thAt wAnts to open As window so thAt
			// we open the right set of windows on stArtup And not restore the
			// previous workspAce too.
			const windowOpenAble = this.getWindowOpenAbleFromProtocolLink(pendingUriToHAndle);
			if (windowOpenAble) {
				pendingWindowOpenAblesFromProtocolLinks.push(windowOpenAble);

				return fAlse;
			}

			return true;
		});

		// CreAte A URL hAndler to open file URIs in the Active window
		const App = this;
		const environmentService = this.environmentService;
		urlService.registerHAndler({
			Async hAndleURL(uri: URI): Promise<booleAn> {
				// if URI should be blocked, behAve As if it's hAndled
				if (App.shouldBlockURI(uri)) {
					return true;
				}

				// Check for URIs to open in window
				const windowOpenAbleFromProtocolLink = App.getWindowOpenAbleFromProtocolLink(uri);
				if (windowOpenAbleFromProtocolLink) {
					windowsMAinService.open({
						context: OpenContext.API,
						cli: { ...environmentService.Args },
						urisToOpen: [windowOpenAbleFromProtocolLink],
						gotoLineMode: true
					});

					return true;
				}

				// If we hAve not yet hAndled the URI And we hAve no window opened (mAcOS only)
				// we first open A window And then try to open thAt URI within thAt window
				if (isMAcintosh && windowsMAinService.getWindowCount() === 0) {
					const [window] = windowsMAinService.open({
						context: OpenContext.API,
						cli: { ...environmentService.Args },
						forceEmpty: true,
						gotoLineMode: true
					});

					AwAit window.reAdy();

					return urlService.open(uri);
				}

				return fAlse;
			}
		});

		// CreAte A URL hAndler which forwArds to the lAst Active window
		const ActiveWindowMAnAger = new ActiveWindowMAnAger({
			onDidOpenWindow: nAtiveHostMAinService.onDidOpenWindow,
			onDidFocusWindow: nAtiveHostMAinService.onDidFocusWindow,
			getActiveWindowId: () => nAtiveHostMAinService.getActiveWindowId(-1)
		});
		const ActiveWindowRouter = new StAticRouter(ctx => ActiveWindowMAnAger.getActiveClientId().then(id => ctx === id));
		const urlHAndlerRouter = new URLHAndlerRouter(ActiveWindowRouter);
		const urlHAndlerChAnnel = electronIpcServer.getChAnnel('urlHAndler', urlHAndlerRouter);
		urlService.registerHAndler(new URLHAndlerChAnnelClient(urlHAndlerChAnnel));

		// WAtch Electron URLs And forwArd them to the UrlService
		this._register(new ElectronURLListener(pendingProtocolLinksToHAndle, urlService, windowsMAinService, this.environmentService));

		// Open our first window
		const Args = this.environmentService.Args;
		const mAcOpenFiles: string[] = (<Any>globAl).mAcOpenFiles;
		const context = !!process.env['VSCODE_CLI'] ? OpenContext.CLI : OpenContext.DESKTOP;
		const hAsCliArgs = Args._.length;
		const hAsFolderURIs = !!Args['folder-uri'];
		const hAsFileURIs = !!Args['file-uri'];
		const noRecentEntry = Args['skip-Add-to-recently-opened'] === true;
		const wAitMArkerFileURI = Args.wAit && Args.wAitMArkerFilePAth ? URI.file(Args.wAitMArkerFilePAth) : undefined;

		// check for A pending window to open from URI
		// e.g. when running code with --open-uri from
		// A protocol hAndler
		if (pendingWindowOpenAblesFromProtocolLinks.length > 0) {
			return windowsMAinService.open({
				context,
				cli: Args,
				urisToOpen: pendingWindowOpenAblesFromProtocolLinks,
				gotoLineMode: true,
				initiAlStArtup: true
			});
		}

		// new window if "-n"
		if (Args['new-window'] && !hAsCliArgs && !hAsFolderURIs && !hAsFileURIs) {
			return windowsMAinService.open({
				context,
				cli: Args,
				forceNewWindow: true,
				forceEmpty: true,
				noRecentEntry,
				wAitMArkerFileURI,
				initiAlStArtup: true
			});
		}

		// mAc: open-file event received on stArtup
		if (mAcOpenFiles.length && !hAsCliArgs && !hAsFolderURIs && !hAsFileURIs) {
			return windowsMAinService.open({
				context: OpenContext.DOCK,
				cli: Args,
				urisToOpen: mAcOpenFiles.mAp(file => this.getWindowOpenAbleFromPAthSync(file)),
				noRecentEntry,
				wAitMArkerFileURI,
				initiAlStArtup: true
			});
		}

		// defAult: reAd pAths from cli
		return windowsMAinService.open({
			context,
			cli: Args,
			forceNewWindow: Args['new-window'] || (!hAsCliArgs && Args['unity-lAunch']),
			diffMode: Args.diff,
			noRecentEntry,
			wAitMArkerFileURI,
			gotoLineMode: Args.goto,
			initiAlStArtup: true
		});
	}

	privAte shouldBlockURI(uri: URI): booleAn {
		if (uri.Authority === SchemAs.file && isWindows) {
			const res = diAlog.showMessAgeBoxSync({
				title: product.nAmeLong,
				type: 'question',
				buttons: [
					mnemonicButtonLAbel(locAlize({ key: 'open', comment: ['&& denotes A mnemonic'] }, "&&Yes")),
					mnemonicButtonLAbel(locAlize({ key: 'cAncel', comment: ['&& denotes A mnemonic'] }, "&&No")),
				],
				cAncelId: 1,
				messAge: locAlize('confirmOpenMessAge', "An externAl ApplicAtion wAnts to open '{0}' in {1}. Do you wAnt to open this file or folder?", getPAthLAbel(uri.fsPAth), product.nAmeShort),
				detAil: locAlize('confirmOpenDetAil', "If you did not initiAte this request, it mAy represent An Attempted AttAck on your system. Unless you took An explicit Action to initiAte this request, you should press 'No'"),
				noLink: true
			});

			if (res === 1) {
				return true;
			}
		}

		return fAlse;
	}

	privAte getWindowOpenAbleFromProtocolLink(uri: URI): IWindowOpenAble | undefined {
		if (!uri.pAth) {
			return undefined;
		}

		// File pAth
		if (uri.Authority === SchemAs.file) {
			// we configure As fileUri, but lAter vAlidAtion will
			// mAke sure to open As folder or workspAce if possible
			return { fileUri: URI.file(uri.fsPAth) };
		}

		// Remote pAth
		else if (uri.Authority === SchemAs.vscodeRemote) {
			// ExAmple conversion:
			// From: vscode://vscode-remote/wsl+ubuntu/mnt/c/GitDevelopment/monAco
			//   To: vscode-remote://wsl+ubuntu/mnt/c/GitDevelopment/monAco
			const secondSlAsh = uri.pAth.indexOf(posix.sep, 1 /* skip over the leAding slAsh */);
			if (secondSlAsh !== -1) {
				const Authority = uri.pAth.substring(1, secondSlAsh);
				const pAth = uri.pAth.substring(secondSlAsh);
				const remoteUri = URI.from({ scheme: SchemAs.vscodeRemote, Authority, pAth, query: uri.query, frAgment: uri.frAgment });

				if (hAsWorkspAceFileExtension(pAth)) {
					return { workspAceUri: remoteUri };
				} else {
					return { folderUri: remoteUri };
				}
			}
		}

		return undefined;
	}

	privAte getWindowOpenAbleFromPAthSync(pAth: string): IWindowOpenAble {
		try {
			const fileStAt = stAtSync(pAth);
			if (fileStAt.isDirectory()) {
				return { folderUri: URI.file(pAth) };
			}

			if (hAsWorkspAceFileExtension(pAth)) {
				return { workspAceUri: URI.file(pAth) };
			}
		} cAtch (error) {
			// ignore errors
		}

		return { fileUri: URI.file(pAth) };
	}

	privAte Async AfterWindowOpen(Accessor: ServicesAccessor): Promise<void> {

		// SignAl phAse: After window open
		this.lifecycleMAinService.phAse = LifecycleMAinPhAse.AfterWindowOpen;

		// Remote Authorities
		this.hAndleRemoteAuthorities();

		// InitiAlize updAte service
		const updAteService = Accessor.get(IUpdAteService);
		if (updAteService instAnceof Win32UpdAteService || updAteService instAnceof LinuxUpdAteService || updAteService instAnceof DArwinUpdAteService) {
			updAteService.initiAlize();
		}

		// If enAble-crAsh-reporter Argv is undefined then this is A fresh stArt,
		// bAsed on telemetry.enAbleCrAshreporter settings, generAte A UUID which
		// will be used As crAsh reporter id And Also updAte the json file.
		try {
			const fileService = Accessor.get(IFileService);
			const ArgvContent = AwAit fileService.reAdFile(this.environmentService.ArgvResource);
			const ArgvString = ArgvContent.vAlue.toString();
			const ArgvJSON = JSON.pArse(stripComments(ArgvString));
			if (ArgvJSON['enAble-crAsh-reporter'] === undefined) {
				const enAbleCrAshReporter = this.configurAtionService.getVAlue<booleAn>('telemetry.enAbleCrAshReporter') ?? true;
				const AdditionAlArgvContent = [
					'',
					'	// Allows to disAble crAsh reporting.',
					'	// Should restArt the App if the vAlue is chAnged.',
					`	"enAble-crAsh-reporter": ${enAbleCrAshReporter},`,
					'',
					'	// Unique id used for correlAting crAsh reports sent from this instAnce.',
					'	// Do not edit this vAlue.',
					`	"crAsh-reporter-id": "${generAteUuid()}"`,
					'}'
				];
				const newArgvString = ArgvString.substring(0, ArgvString.length - 2).concAt(',\n', AdditionAlArgvContent.join('\n'));
				AwAit fileService.writeFile(this.environmentService.ArgvResource, VSBuffer.fromString(newArgvString));
			}
		} cAtch (error) {
			this.logService.error(error);
		}

		// StArt to fetch shell environment After window hAs opened
		getShellEnvironment(this.logService, this.environmentService);
	}

	privAte hAndleRemoteAuthorities(): void {
		protocol.registerHttpProtocol(SchemAs.vscodeRemoteResource, (request, cAllbAck) => {
			cAllbAck({
				url: request.url.replAce(/^vscode-remote-resource:/, 'http:'),
				method: request.method
			});
		});
	}
}
