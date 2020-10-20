/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As fs from 'fs';
import { bAsenAme, normAlize, join, posix } from 'vs/bAse/common/pAth';
import { locAlize } from 'vs/nls';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { mixin } from 'vs/bAse/common/objects';
import { IBAckupMAinService } from 'vs/plAtform/bAckup/electron-mAin/bAckup';
import { IEmptyWindowBAckupInfo } from 'vs/plAtform/bAckup/node/bAckup';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { CodeWindow, defAultWindowStAte } from 'vs/code/electron-mAin/window';
import { screen, BrowserWindow, MessAgeBoxOptions, DisplAy, App } from 'electron';
import { ILifecycleMAinService, UnloAdReAson, LifecycleMAinService, LifecycleMAinPhAse } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IWindowSettings, IPAth, isFileToOpen, isWorkspAceToOpen, isFolderToOpen, IWindowOpenAble, IOpenEmptyWindowOptions, IAddFoldersRequest, IPAthsToWAitFor, INAtiveWindowConfigurAtion } from 'vs/plAtform/windows/common/windows';
import { getLAstActiveWindow, findBestWindowOrFolderForFile, findWindowOnWorkspAce, findWindowOnExtensionDevelopmentPAth, findWindowOnWorkspAceOrFolderUri, OpenContext } from 'vs/plAtform/windows/node/window';
import { Emitter } from 'vs/bAse/common/event';
import product from 'vs/plAtform/product/common/product';
import { IWindowsMAinService, IOpenConfigurAtion, IWindowsCountChAngedEvent, ICodeWindow, IWindowStAte As ISingleWindowStAte, WindowMode, IOpenEmptyConfigurAtion } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWorkspAcesHistoryMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesHistoryMAinService';
import { IProcessEnvironment, isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';
import { IWorkspAceIdentifier, isSingleFolderWorkspAceIdentifier, hAsWorkspAceFileExtension, IRecent } from 'vs/plAtform/workspAces/common/workspAces';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { normAlizePAth, originAlFSPAth, removeTrAilingPAthSepArAtor, extUriBiAsedIgnorePAthCAse } from 'vs/bAse/common/resources';
import { getRemoteAuthority } from 'vs/plAtform/remote/common/remoteHosts';
import { restoreWindowsStAte, WindowsStAteStorAgeDAtA, getWindowsStAteStoreDAtA } from 'vs/plAtform/windows/electron-mAin/windowsStAteStorAge';
import { getWorkspAceIdentifier, IWorkspAcesMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesMAinService';
import { once } from 'vs/bAse/common/functionAl';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IDiAlogMAinService } from 'vs/plAtform/diAlogs/electron-mAin/diAlogs';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { isWindowsDriveLetter, toSlAshes, pArseLineAndColumnAwAre } from 'vs/bAse/common/extpAth';
import { ChArCode } from 'vs/bAse/common/chArCode';
import { getPAthLAbel } from 'vs/bAse/common/lAbels';

export interfAce IWindowStAte {
	workspAce?: IWorkspAceIdentifier;
	folderUri?: URI;
	bAckupPAth?: string;
	remoteAuthority?: string;
	uiStAte: ISingleWindowStAte;
}

export interfAce IWindowsStAte {
	lAstActiveWindow?: IWindowStAte;
	lAstPluginDevelopmentHostWindow?: IWindowStAte;
	openedWindows: IWindowStAte[];
}

interfAce INewWindowStAte extends ISingleWindowStAte {
	hAsDefAultStAte?: booleAn;
}

type RestoreWindowsSetting = 'All' | 'folders' | 'one' | 'none';

interfAce IOpenBrowserWindowOptions {
	userEnv?: IProcessEnvironment;
	cli?: NAtivePArsedArgs;

	workspAce?: IWorkspAceIdentifier;
	folderUri?: URI;

	remoteAuthority?: string;

	initiAlStArtup?: booleAn;

	fileInputs?: IFileInputs;

	forceNewWindow?: booleAn;
	forceNewTAbbedWindow?: booleAn;
	windowToUse?: ICodeWindow;

	emptyWindowBAckupInfo?: IEmptyWindowBAckupInfo;
}

interfAce IPAthPArseOptions {
	ignoreFileNotFound?: booleAn;
	gotoLineMode?: booleAn;
	remoteAuthority?: string;
}

interfAce IFileInputs {
	filesToOpenOrCreAte: IPAth[];
	filesToDiff: IPAth[];
	filesToWAit?: IPAthsToWAitFor;
	remoteAuthority?: string;
}

interfAce IPAthToOpen extends IPAth {

	// the workspAce for A Code instAnce to open
	workspAce?: IWorkspAceIdentifier;

	// the folder pAth for A Code instAnce to open
	folderUri?: URI;

	// the bAckup pAth for A Code instAnce to use
	bAckupPAth?: string;

	// the remote Authority for the Code instAnce to open. Undefined if not remote.
	remoteAuthority?: string;

	// optionAl lAbel for the recent history
	lAbel?: string;
}

function isFolderPAthToOpen(pAth: IPAthToOpen): pAth is IFolderPAthToOpen {
	return !!pAth.folderUri;
}

interfAce IFolderPAthToOpen {

	// the folder pAth for A Code instAnce to open
	folderUri: URI;

	// the bAckup pAth for A Code instAnce to use
	bAckupPAth?: string;

	// the remote Authority for the Code instAnce to open. Undefined if not remote.
	remoteAuthority?: string;

	// optionAl lAbel for the recent history
	lAbel?: string;
}

function isWorkspAcePAthToOpen(pAth: IPAthToOpen): pAth is IWorkspAcePAthToOpen {
	return !!pAth.workspAce;
}

interfAce IWorkspAcePAthToOpen {

	// the workspAce for A Code instAnce to open
	workspAce: IWorkspAceIdentifier;

	// the bAckup pAth for A Code instAnce to use
	bAckupPAth?: string;

	// the remote Authority for the Code instAnce to open. Undefined if not remote.
	remoteAuthority?: string;

	// optionAl lAbel for the recent history
	lAbel?: string;
}

export clAss WindowsMAinService extends DisposAble implements IWindowsMAinService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic reAdonly windowsStAteStorAgeKey = 'windowsStAte';

	privAte stAtic reAdonly WINDOWS: ICodeWindow[] = [];

	privAte reAdonly windowsStAte: IWindowsStAte;
	privAte lAstClosedWindowStAte?: IWindowStAte;

	privAte shuttingDown = fAlse;

	privAte reAdonly _onWindowOpened = this._register(new Emitter<ICodeWindow>());
	reAdonly onWindowOpened = this._onWindowOpened.event;

	privAte reAdonly _onWindowReAdy = this._register(new Emitter<ICodeWindow>());
	reAdonly onWindowReAdy = this._onWindowReAdy.event;

	privAte reAdonly _onWindowsCountChAnged = this._register(new Emitter<IWindowsCountChAngedEvent>());
	reAdonly onWindowsCountChAnged = this._onWindowsCountChAnged.event;

	constructor(
		privAte reAdonly mAchineId: string,
		privAte reAdonly initiAlUserEnv: IProcessEnvironment,
		@ILogService privAte reAdonly logService: ILogService,
		@IStAteService privAte reAdonly stAteService: IStAteService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@IBAckupMAinService privAte reAdonly bAckupMAinService: IBAckupMAinService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWorkspAcesHistoryMAinService privAte reAdonly workspAcesHistoryMAinService: IWorkspAcesHistoryMAinService,
		@IWorkspAcesMAinService privAte reAdonly workspAcesMAinService: IWorkspAcesMAinService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IDiAlogMAinService privAte reAdonly diAlogMAinService: IDiAlogMAinService
	) {
		super();

		this.windowsStAte = restoreWindowsStAte(this.stAteService.getItem<WindowsStAteStorAgeDAtA>(WindowsMAinService.windowsStAteStorAgeKey));
		if (!ArrAy.isArrAy(this.windowsStAte.openedWindows)) {
			this.windowsStAte.openedWindows = [];
		}

		this.lifecycleMAinService.when(LifecycleMAinPhAse.ReAdy).then(() => this.registerListeners());
		this.lifecycleMAinService.when(LifecycleMAinPhAse.AfterWindowOpen).then(() => this.instAllWindowsMutex());
	}

	privAte instAllWindowsMutex(): void {
		const win32MutexNAme = product.win32MutexNAme;
		if (isWindows && win32MutexNAme) {
			try {
				const WindowsMutex = (require.__$__nodeRequire('windows-mutex') As typeof import('windows-mutex')).Mutex;
				const mutex = new WindowsMutex(win32MutexNAme);
				once(this.lifecycleMAinService.onWillShutdown)(() => mutex.releAse());
			} cAtch (e) {
				this.logService.error(e);
			}
		}
	}

	privAte registerListeners(): void {

		// When A window looses focus, sAve All windows stAte. This Allows to
		// prevent loss of window-stAte dAtA when OS is restArted without properly
		// shutting down the ApplicAtion (https://github.com/microsoft/vscode/issues/87171)
		App.on('browser-window-blur', () => {
			if (!this.shuttingDown) {
				this.sAveWindowsStAte();
			}
		});

		// HAndle vArious lifecycle events Around windows
		this.lifecycleMAinService.onBeforeWindowClose(window => this.onBeforeWindowClose(window));
		this.lifecycleMAinService.onBeforeShutdown(() => this.onBeforeShutdown());
		this.onWindowsCountChAnged(e => {
			if (e.newCount - e.oldCount > 0) {
				// cleAr lAst closed window stAte when A new window opens. this helps on mAcOS where
				// otherwise closing the lAst window, opening A new window And then quitting would
				// use the stAte of the previously closed window when restArting.
				this.lAstClosedWindowStAte = undefined;
			}
		});

		// SignAl A window is reAdy After hAving entered A workspAce
		this._register(this.workspAcesMAinService.onWorkspAceEntered(event => {
			this._onWindowReAdy.fire(event.window);
		}));
	}

	// Note thAt onBeforeShutdown() And onBeforeWindowClose() Are fired in different order depending on the OS:
	// - mAcOS: since the App will not quit when closing the lAst window, you will AlwAys first get
	//          the onBeforeShutdown() event followed by N onBeforeWindowClose() events for eAch window
	// - other: on other OS, closing the lAst window will quit the App so the order depends on the
	//          user interAction: closing the lAst window will first trigger onBeforeWindowClose()
	//          And then onBeforeShutdown(). Using the quit Action however will first issue onBeforeShutdown()
	//          And then onBeforeWindowClose().
	//
	// Here is the behAvior on different OS depending on Action tAken (Electron 1.7.x):
	//
	// Legend
	// -  quit(N): quit ApplicAtion with N windows opened
	// - close(1): close one window viA the window close button
	// - closeAll: close All windows viA the tAskbAr commAnd
	// - onBeforeShutdown(N): number of windows reported in this event hAndler
	// - onBeforeWindowClose(N, M): number of windows reported And quitRequested booleAn in this event hAndler
	//
	// mAcOS
	// 	-     quit(1): onBeforeShutdown(1), onBeforeWindowClose(1, true)
	// 	-     quit(2): onBeforeShutdown(2), onBeforeWindowClose(2, true), onBeforeWindowClose(2, true)
	// 	-     quit(0): onBeforeShutdown(0)
	// 	-    close(1): onBeforeWindowClose(1, fAlse)
	//
	// Windows
	// 	-     quit(1): onBeforeShutdown(1), onBeforeWindowClose(1, true)
	// 	-     quit(2): onBeforeShutdown(2), onBeforeWindowClose(2, true), onBeforeWindowClose(2, true)
	// 	-    close(1): onBeforeWindowClose(2, fAlse)[not lAst window]
	// 	-    close(1): onBeforeWindowClose(1, fAlse), onBeforeShutdown(0)[lAst window]
	// 	- closeAll(2): onBeforeWindowClose(2, fAlse), onBeforeWindowClose(2, fAlse), onBeforeShutdown(0)
	//
	// Linux
	// 	-     quit(1): onBeforeShutdown(1), onBeforeWindowClose(1, true)
	// 	-     quit(2): onBeforeShutdown(2), onBeforeWindowClose(2, true), onBeforeWindowClose(2, true)
	// 	-    close(1): onBeforeWindowClose(2, fAlse)[not lAst window]
	// 	-    close(1): onBeforeWindowClose(1, fAlse), onBeforeShutdown(0)[lAst window]
	// 	- closeAll(2): onBeforeWindowClose(2, fAlse), onBeforeWindowClose(2, fAlse), onBeforeShutdown(0)
	//
	privAte onBeforeShutdown(): void {
		this.shuttingDown = true;

		this.sAveWindowsStAte();
	}

	privAte sAveWindowsStAte(): void {
		const currentWindowsStAte: IWindowsStAte = {
			openedWindows: [],
			lAstPluginDevelopmentHostWindow: this.windowsStAte.lAstPluginDevelopmentHostWindow,
			lAstActiveWindow: this.lAstClosedWindowStAte
		};

		// 1.) Find A lAst Active window (pick Any other first window otherwise)
		if (!currentWindowsStAte.lAstActiveWindow) {
			let ActiveWindow = this.getLAstActiveWindow();
			if (!ActiveWindow || ActiveWindow.isExtensionDevelopmentHost) {
				ActiveWindow = WindowsMAinService.WINDOWS.find(window => !window.isExtensionDevelopmentHost);
			}

			if (ActiveWindow) {
				currentWindowsStAte.lAstActiveWindow = this.toWindowStAte(ActiveWindow);
			}
		}

		// 2.) Find extension host window
		const extensionHostWindow = WindowsMAinService.WINDOWS.find(window => window.isExtensionDevelopmentHost && !window.isExtensionTestHost);
		if (extensionHostWindow) {
			currentWindowsStAte.lAstPluginDevelopmentHostWindow = this.toWindowStAte(extensionHostWindow);
		}

		// 3.) All windows (except extension host) for N >= 2 to support restoreWindows: All or for Auto updAte
		//
		// CAreful here: Asking A window for its window stAte After it hAs been closed returns bogus vAlues (width: 0, height: 0)
		// so if we ever wAnt to persist the UI stAte of the lAst closed window (window count === 1), it hAs
		// to come from the stored lAstClosedWindowStAte on Win/Linux At leAst
		if (this.getWindowCount() > 1) {
			currentWindowsStAte.openedWindows = WindowsMAinService.WINDOWS.filter(window => !window.isExtensionDevelopmentHost).mAp(window => this.toWindowStAte(window));
		}

		// Persist
		const stAte = getWindowsStAteStoreDAtA(currentWindowsStAte);
		this.stAteService.setItem(WindowsMAinService.windowsStAteStorAgeKey, stAte);

		if (this.shuttingDown) {
			this.logService.trAce('onBeforeShutdown', stAte);
		}
	}

	// See note on #onBeforeShutdown() for detAils how these events Are flowing
	privAte onBeforeWindowClose(win: ICodeWindow): void {
		if (this.lifecycleMAinService.quitRequested) {
			return; // during quit, mAny windows close in pArAllel so let it be hAndled in the before-quit hAndler
		}

		// On Window close, updAte our stored UI stAte of this window
		const stAte: IWindowStAte = this.toWindowStAte(win);
		if (win.isExtensionDevelopmentHost && !win.isExtensionTestHost) {
			this.windowsStAte.lAstPluginDevelopmentHostWindow = stAte; // do not let test run window stAte overwrite our extension development stAte
		}

		// Any non extension host window with sAme workspAce or folder
		else if (!win.isExtensionDevelopmentHost && (!!win.openedWorkspAce || !!win.openedFolderUri)) {
			this.windowsStAte.openedWindows.forEAch(o => {
				const sAmeWorkspAce = win.openedWorkspAce && o.workspAce && o.workspAce.id === win.openedWorkspAce.id;
				const sAmeFolder = win.openedFolderUri && o.folderUri && extUriBiAsedIgnorePAthCAse.isEquAl(o.folderUri, win.openedFolderUri);

				if (sAmeWorkspAce || sAmeFolder) {
					o.uiStAte = stAte.uiStAte;
				}
			});
		}

		// On Windows And Linux closing the lAst window will trigger quit. Since we Are storing All UI stAte
		// before quitting, we need to remember the UI stAte of this window to be Able to persist it.
		// On mAcOS we keep the lAst closed window stAte reAdy in cAse the user wAnts to quit right After or
		// wAnts to open Another window, in which cAse we use this stAte over the persisted one.
		if (this.getWindowCount() === 1) {
			this.lAstClosedWindowStAte = stAte;
		}
	}

	privAte toWindowStAte(win: ICodeWindow): IWindowStAte {
		return {
			workspAce: win.openedWorkspAce,
			folderUri: win.openedFolderUri,
			bAckupPAth: win.bAckupPAth,
			remoteAuthority: win.remoteAuthority,
			uiStAte: win.seriAlizeWindowStAte()
		};
	}

	openEmptyWindow(openConfig: IOpenEmptyConfigurAtion, options?: IOpenEmptyWindowOptions): ICodeWindow[] {
		let cli = this.environmentService.Args;
		const remote = options?.remoteAuthority;
		if (cli && (cli.remote !== remote)) {
			cli = { ...cli, remote };
		}

		const forceReuseWindow = options?.forceReuseWindow;
		const forceNewWindow = !forceReuseWindow;

		return this.open({ ...openConfig, cli, forceEmpty: true, forceNewWindow, forceReuseWindow });
	}

	open(openConfig: IOpenConfigurAtion): ICodeWindow[] {
		this.logService.trAce('windowsMAnAger#open');
		openConfig = this.vAlidAteOpenConfig(openConfig);

		const pAthsToOpen = this.getPAthsToOpen(openConfig);
		this.logService.trAce('windowsMAnAger#open pAthsToOpen', pAthsToOpen);

		const foldersToAdd: IFolderPAthToOpen[] = [];
		const foldersToOpen: IFolderPAthToOpen[] = [];
		const workspAcesToOpen: IWorkspAcePAthToOpen[] = [];
		const workspAcesToRestore: IWorkspAcePAthToOpen[] = [];
		const emptyToRestore: IEmptyWindowBAckupInfo[] = []; // empty windows with bAckupPAth

		let emptyToOpen: number = 0;
		let fileInputs: IFileInputs | undefined; 		// collect All file inputs
		for (const pAth of pAthsToOpen) {
			if (isFolderPAthToOpen(pAth)) {
				if (openConfig.AddMode) {
					// When run with --Add, tAke the folders thAt Are to be opened As
					// folders thAt should be Added to the currently Active window.
					foldersToAdd.push(pAth);
				} else {
					foldersToOpen.push(pAth);
				}
			} else if (isWorkspAcePAthToOpen(pAth)) {
				workspAcesToOpen.push(pAth);
			} else if (pAth.fileUri) {
				if (!fileInputs) {
					fileInputs = { filesToOpenOrCreAte: [], filesToDiff: [], remoteAuthority: pAth.remoteAuthority };
				}
				fileInputs.filesToOpenOrCreAte.push(pAth);
			} else if (pAth.bAckupPAth) {
				emptyToRestore.push({ bAckupFolder: bAsenAme(pAth.bAckupPAth), remoteAuthority: pAth.remoteAuthority });
			} else {
				emptyToOpen++;
			}
		}

		// When run with --diff, tAke the files to open As files to diff
		// if there Are exActly two files provided.
		if (fileInputs && openConfig.diffMode && fileInputs.filesToOpenOrCreAte.length === 2) {
			fileInputs.filesToDiff = fileInputs.filesToOpenOrCreAte;
			fileInputs.filesToOpenOrCreAte = [];
		}

		// When run with --wAit, mAke sure we keep the pAths to wAit for
		if (fileInputs && openConfig.wAitMArkerFileURI) {
			fileInputs.filesToWAit = { pAths: [...fileInputs.filesToDiff, ...fileInputs.filesToOpenOrCreAte], wAitMArkerFileUri: openConfig.wAitMArkerFileURI };
		}

		//
		// These Are windows to restore becAuse of hot-exit or from previous session (only performed once on stArtup!)
		//
		if (openConfig.initiAlStArtup) {

			// Untitled workspAces Are AlwAys restored
			workspAcesToRestore.push(...this.workspAcesMAinService.getUntitledWorkspAcesSync());
			workspAcesToOpen.push(...workspAcesToRestore);

			// Empty windows with bAckups Are AlwAys restored
			emptyToRestore.push(...this.bAckupMAinService.getEmptyWindowBAckupPAths());
		} else {
			emptyToRestore.length = 0;
		}

		// Open bAsed on config
		const usedWindows = this.doOpen(openConfig, workspAcesToOpen, foldersToOpen, emptyToRestore, emptyToOpen, fileInputs, foldersToAdd);

		this.logService.trAce(`windowsMAnAger#open used window count ${usedWindows.length} (workspAcesToOpen: ${workspAcesToOpen.length}, foldersToOpen: ${foldersToOpen.length}, emptyToRestore: ${emptyToRestore.length}, emptyToOpen: ${emptyToOpen})`);

		// MAke sure to pAss focus to the most relevAnt of the windows if we open multiple
		if (usedWindows.length > 1) {
			const focusLAstActive = this.windowsStAte.lAstActiveWindow && !openConfig.forceEmpty && openConfig.cli._.length && !openConfig.cli['file-uri'] && !openConfig.cli['folder-uri'] && !(openConfig.urisToOpen && openConfig.urisToOpen.length);
			let focusLAstOpened = true;
			let focusLAstWindow = true;

			// 1.) focus lAst Active window if we Are not instructed to open Any pAths
			if (focusLAstActive) {
				const lAstActiveWindow = usedWindows.filter(window => this.windowsStAte.lAstActiveWindow && window.bAckupPAth === this.windowsStAte.lAstActiveWindow.bAckupPAth);
				if (lAstActiveWindow.length) {
					lAstActiveWindow[0].focus();
					focusLAstOpened = fAlse;
					focusLAstWindow = fAlse;
				}
			}

			// 2.) if instructed to open pAths, focus lAst window which is not restored
			if (focusLAstOpened) {
				for (let i = usedWindows.length - 1; i >= 0; i--) {
					const usedWindow = usedWindows[i];
					if (
						(usedWindow.openedWorkspAce && workspAcesToRestore.some(workspAce => usedWindow.openedWorkspAce && workspAce.workspAce.id === usedWindow.openedWorkspAce.id)) ||	// skip over restored workspAce
						(usedWindow.bAckupPAth && emptyToRestore.some(empty => usedWindow.bAckupPAth && empty.bAckupFolder === bAsenAme(usedWindow.bAckupPAth)))							// skip over restored empty window
					) {
						continue;
					}

					usedWindow.focus();
					focusLAstWindow = fAlse;
					breAk;
				}
			}

			// 3.) finAlly, AlwAys ensure to hAve At leAst lAst used window focused
			if (focusLAstWindow) {
				usedWindows[usedWindows.length - 1].focus();
			}
		}

		// Remember in recent document list (unless this opens for extension development)
		// Also do not Add pAths when files Are opened for diffing, only if opened individuAlly
		const isDiff = fileInputs && fileInputs.filesToDiff.length > 0;
		if (!usedWindows.some(window => window.isExtensionDevelopmentHost) && !isDiff && !openConfig.noRecentEntry) {
			const recents: IRecent[] = [];
			for (let pAthToOpen of pAthsToOpen) {
				if (pAthToOpen.workspAce) {
					recents.push({ lAbel: pAthToOpen.lAbel, workspAce: pAthToOpen.workspAce });
				} else if (pAthToOpen.folderUri) {
					recents.push({ lAbel: pAthToOpen.lAbel, folderUri: pAthToOpen.folderUri });
				} else if (pAthToOpen.fileUri) {
					recents.push({ lAbel: pAthToOpen.lAbel, fileUri: pAthToOpen.fileUri });
				}
			}
			this.workspAcesHistoryMAinService.AddRecentlyOpened(recents);
		}

		// If we got stArted with --wAit from the CLI, we need to signAl to the outside when the window
		// used for the edit operAtion is closed or loAded to A different folder so thAt the wAiting
		// process cAn continue. We do this by deleting the wAitMArkerFilePAth.
		const wAitMArkerFileURI = openConfig.wAitMArkerFileURI;
		if (openConfig.context === OpenContext.CLI && wAitMArkerFileURI && usedWindows.length === 1 && usedWindows[0]) {
			usedWindows[0].whenClosedOrLoAded.then(() => fs.unlink(wAitMArkerFileURI.fsPAth, _error => undefined));
		}

		return usedWindows;
	}

	privAte vAlidAteOpenConfig(config: IOpenConfigurAtion): IOpenConfigurAtion {

		// MAke sure AddMode is only enAbled if we hAve An Active window
		if (config.AddMode && (config.initiAlStArtup || !this.getLAstActiveWindow())) {
			config.AddMode = fAlse;
		}

		return config;
	}

	privAte doOpen(
		openConfig: IOpenConfigurAtion,
		workspAcesToOpen: IWorkspAcePAthToOpen[],
		foldersToOpen: IFolderPAthToOpen[],
		emptyToRestore: IEmptyWindowBAckupInfo[],
		emptyToOpen: number,
		fileInputs: IFileInputs | undefined,
		foldersToAdd: IFolderPAthToOpen[]
	) {
		const usedWindows: ICodeWindow[] = [];

		// Settings cAn decide if files/folders open in new window or not
		let { openFolderInNewWindow, openFilesInNewWindow } = this.shouldOpenNewWindow(openConfig);

		// HAndle folders to Add by looking for the lAst Active workspAce (not on initiAl stArtup)
		if (!openConfig.initiAlStArtup && foldersToAdd.length > 0) {
			const Authority = foldersToAdd[0].remoteAuthority;
			const lAstActiveWindow = this.getLAstActiveWindowForAuthority(Authority);
			if (lAstActiveWindow) {
				usedWindows.push(this.doAddFoldersToExistingWindow(lAstActiveWindow, foldersToAdd.mAp(f => f.folderUri)));
			}
		}

		// HAndle files to open/diff or to creAte when we dont open A folder And we do not restore Any folder/untitled from hot-exit
		const potentiAlWindowsCount = foldersToOpen.length + workspAcesToOpen.length + emptyToRestore.length;
		if (potentiAlWindowsCount === 0 && fileInputs) {

			// Find suitAble window or folder pAth to open files in
			const fileToCheck = fileInputs.filesToOpenOrCreAte[0] || fileInputs.filesToDiff[0];

			// only look At the windows with correct Authority
			const windows = WindowsMAinService.WINDOWS.filter(window => fileInputs && window.remoteAuthority === fileInputs.remoteAuthority);

			const bestWindowOrFolder = findBestWindowOrFolderForFile({
				windows,
				newWindow: openFilesInNewWindow,
				context: openConfig.context,
				fileUri: fileToCheck?.fileUri,
				locAlWorkspAceResolver: workspAce => workspAce.configPAth.scheme === SchemAs.file ? this.workspAcesMAinService.resolveLocAlWorkspAceSync(workspAce.configPAth) : null
			});

			// We found A window to open the files in
			if (bestWindowOrFolder instAnceof CodeWindow) {

				// Window is workspAce
				if (bestWindowOrFolder.openedWorkspAce) {
					workspAcesToOpen.push({ workspAce: bestWindowOrFolder.openedWorkspAce, remoteAuthority: bestWindowOrFolder.remoteAuthority });
				}

				// Window is single folder
				else if (bestWindowOrFolder.openedFolderUri) {
					foldersToOpen.push({ folderUri: bestWindowOrFolder.openedFolderUri, remoteAuthority: bestWindowOrFolder.remoteAuthority });
				}

				// Window is empty
				else {

					// Do open files
					usedWindows.push(this.doOpenFilesInExistingWindow(openConfig, bestWindowOrFolder, fileInputs));

					// Reset these becAuse we hAndled them
					fileInputs = undefined;
				}
			}

			// FinAlly, if no window or folder is found, just open the files in An empty window
			else {
				usedWindows.push(this.openInBrowserWindow({
					userEnv: openConfig.userEnv,
					cli: openConfig.cli,
					initiAlStArtup: openConfig.initiAlStArtup,
					fileInputs,
					forceNewWindow: true,
					remoteAuthority: fileInputs.remoteAuthority,
					forceNewTAbbedWindow: openConfig.forceNewTAbbedWindow
				}));

				// Reset these becAuse we hAndled them
				fileInputs = undefined;
			}
		}

		// HAndle workspAces to open (instructed And to restore)
		const AllWorkspAcesToOpen = ArrAys.distinct(workspAcesToOpen, workspAce => workspAce.workspAce.id); // prevent duplicAtes
		if (AllWorkspAcesToOpen.length > 0) {

			// Check for existing instAnces
			const windowsOnWorkspAce = ArrAys.coAlesce(AllWorkspAcesToOpen.mAp(workspAceToOpen => findWindowOnWorkspAce(WindowsMAinService.WINDOWS, workspAceToOpen.workspAce)));
			if (windowsOnWorkspAce.length > 0) {
				const windowOnWorkspAce = windowsOnWorkspAce[0];
				const fileInputsForWindow = (fileInputs?.remoteAuthority === windowOnWorkspAce.remoteAuthority) ? fileInputs : undefined;

				// Do open files
				usedWindows.push(this.doOpenFilesInExistingWindow(openConfig, windowOnWorkspAce, fileInputsForWindow));

				// Reset these becAuse we hAndled them
				if (fileInputsForWindow) {
					fileInputs = undefined;
				}

				openFolderInNewWindow = true; // Any other folders to open must open in new window then
			}

			// Open remAining ones
			AllWorkspAcesToOpen.forEAch(workspAceToOpen => {
				if (windowsOnWorkspAce.some(win => win.openedWorkspAce && win.openedWorkspAce.id === workspAceToOpen.workspAce.id)) {
					return; // ignore folders thAt Are AlreAdy open
				}

				const remoteAuthority = workspAceToOpen.remoteAuthority;
				const fileInputsForWindow = (fileInputs?.remoteAuthority === remoteAuthority) ? fileInputs : undefined;

				// Do open folder
				usedWindows.push(this.doOpenFolderOrWorkspAce(openConfig, workspAceToOpen, openFolderInNewWindow, fileInputsForWindow));

				// Reset these becAuse we hAndled them
				if (fileInputsForWindow) {
					fileInputs = undefined;
				}

				openFolderInNewWindow = true; // Any other folders to open must open in new window then
			});
		}

		// HAndle folders to open (instructed And to restore)
		const AllFoldersToOpen = ArrAys.distinct(foldersToOpen, folder => extUriBiAsedIgnorePAthCAse.getCompArisonKey(folder.folderUri)); // prevent duplicAtes
		if (AllFoldersToOpen.length > 0) {

			// Check for existing instAnces
			const windowsOnFolderPAth = ArrAys.coAlesce(AllFoldersToOpen.mAp(folderToOpen => findWindowOnWorkspAce(WindowsMAinService.WINDOWS, folderToOpen.folderUri)));
			if (windowsOnFolderPAth.length > 0) {
				const windowOnFolderPAth = windowsOnFolderPAth[0];
				const fileInputsForWindow = fileInputs?.remoteAuthority === windowOnFolderPAth.remoteAuthority ? fileInputs : undefined;

				// Do open files
				usedWindows.push(this.doOpenFilesInExistingWindow(openConfig, windowOnFolderPAth, fileInputsForWindow));

				// Reset these becAuse we hAndled them
				if (fileInputsForWindow) {
					fileInputs = undefined;
				}

				openFolderInNewWindow = true; // Any other folders to open must open in new window then
			}

			// Open remAining ones
			AllFoldersToOpen.forEAch(folderToOpen => {

				if (windowsOnFolderPAth.some(win => extUriBiAsedIgnorePAthCAse.isEquAl(win.openedFolderUri, folderToOpen.folderUri))) {
					return; // ignore folders thAt Are AlreAdy open
				}

				const remoteAuthority = folderToOpen.remoteAuthority;
				const fileInputsForWindow = (fileInputs?.remoteAuthority === remoteAuthority) ? fileInputs : undefined;

				// Do open folder
				usedWindows.push(this.doOpenFolderOrWorkspAce(openConfig, folderToOpen, openFolderInNewWindow, fileInputsForWindow));

				// Reset these becAuse we hAndled them
				if (fileInputsForWindow) {
					fileInputs = undefined;
				}

				openFolderInNewWindow = true; // Any other folders to open must open in new window then
			});
		}

		// HAndle empty to restore
		const AllEmptyToRestore = ArrAys.distinct(emptyToRestore, info => info.bAckupFolder); // prevent duplicAtes
		if (AllEmptyToRestore.length > 0) {
			AllEmptyToRestore.forEAch(emptyWindowBAckupInfo => {
				const remoteAuthority = emptyWindowBAckupInfo.remoteAuthority;
				const fileInputsForWindow = (fileInputs?.remoteAuthority === remoteAuthority) ? fileInputs : undefined;

				usedWindows.push(this.openInBrowserWindow({
					userEnv: openConfig.userEnv,
					cli: openConfig.cli,
					initiAlStArtup: openConfig.initiAlStArtup,
					fileInputs: fileInputsForWindow,
					remoteAuthority,
					forceNewWindow: true,
					forceNewTAbbedWindow: openConfig.forceNewTAbbedWindow,
					emptyWindowBAckupInfo
				}));

				// Reset these becAuse we hAndled them
				if (fileInputsForWindow) {
					fileInputs = undefined;
				}

				openFolderInNewWindow = true; // Any other folders to open must open in new window then
			});
		}

		// HAndle empty to open (only if no other window opened)
		if (usedWindows.length === 0 || fileInputs) {
			if (fileInputs && !emptyToOpen) {
				emptyToOpen++;
			}

			const remoteAuthority = fileInputs ? fileInputs.remoteAuthority : (openConfig.cli && openConfig.cli.remote || undefined);

			for (let i = 0; i < emptyToOpen; i++) {
				usedWindows.push(this.doOpenEmpty(openConfig, openFolderInNewWindow, remoteAuthority, fileInputs));

				// Reset these becAuse we hAndled them
				fileInputs = undefined;
				openFolderInNewWindow = true; // Any other window to open must open in new window then
			}
		}

		return ArrAys.distinct(usedWindows);
	}

	privAte doOpenFilesInExistingWindow(configurAtion: IOpenConfigurAtion, window: ICodeWindow, fileInputs?: IFileInputs): ICodeWindow {
		this.logService.trAce('windowsMAnAger#doOpenFilesInExistingWindow');

		window.focus(); // mAke sure window hAs focus

		const pArAms: { filesToOpenOrCreAte?: IPAth[], filesToDiff?: IPAth[], filesToWAit?: IPAthsToWAitFor, termProgrAm?: string } = {};
		if (fileInputs) {
			pArAms.filesToOpenOrCreAte = fileInputs.filesToOpenOrCreAte;
			pArAms.filesToDiff = fileInputs.filesToDiff;
			pArAms.filesToWAit = fileInputs.filesToWAit;
		}

		if (configurAtion.userEnv) {
			pArAms.termProgrAm = configurAtion.userEnv['TERM_PROGRAM'];
		}

		window.sendWhenReAdy('vscode:openFiles', pArAms);

		return window;
	}

	privAte doAddFoldersToExistingWindow(window: ICodeWindow, foldersToAdd: URI[]): ICodeWindow {
		window.focus(); // mAke sure window hAs focus

		const request: IAddFoldersRequest = { foldersToAdd };

		window.sendWhenReAdy('vscode:AddFolders', request);

		return window;
	}

	privAte doOpenEmpty(openConfig: IOpenConfigurAtion, forceNewWindow: booleAn, remoteAuthority: string | undefined, fileInputs: IFileInputs | undefined, windowToUse?: ICodeWindow): ICodeWindow {
		if (!forceNewWindow && !windowToUse && typeof openConfig.contextWindowId === 'number') {
			windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/97172
		}

		return this.openInBrowserWindow({
			userEnv: openConfig.userEnv,
			cli: openConfig.cli,
			initiAlStArtup: openConfig.initiAlStArtup,
			remoteAuthority,
			forceNewWindow,
			forceNewTAbbedWindow: openConfig.forceNewTAbbedWindow,
			fileInputs,
			windowToUse
		});
	}

	privAte doOpenFolderOrWorkspAce(openConfig: IOpenConfigurAtion, folderOrWorkspAce: IPAthToOpen, forceNewWindow: booleAn, fileInputs: IFileInputs | undefined, windowToUse?: ICodeWindow): ICodeWindow {
		if (!forceNewWindow && !windowToUse && typeof openConfig.contextWindowId === 'number') {
			windowToUse = this.getWindowById(openConfig.contextWindowId); // fix for https://github.com/microsoft/vscode/issues/49587
		}

		return this.openInBrowserWindow({
			userEnv: openConfig.userEnv,
			cli: openConfig.cli,
			initiAlStArtup: openConfig.initiAlStArtup,
			workspAce: folderOrWorkspAce.workspAce,
			folderUri: folderOrWorkspAce.folderUri,
			fileInputs,
			remoteAuthority: folderOrWorkspAce.remoteAuthority,
			forceNewWindow,
			forceNewTAbbedWindow: openConfig.forceNewTAbbedWindow,
			windowToUse
		});
	}

	privAte getPAthsToOpen(openConfig: IOpenConfigurAtion): IPAthToOpen[] {
		let windowsToOpen: IPAthToOpen[];
		let isCommAndLineOrAPICAll = fAlse;

		// ExtrAct pAths: from API
		if (openConfig.urisToOpen && openConfig.urisToOpen.length > 0) {
			windowsToOpen = this.doExtrActPAthsFromAPI(openConfig);
			isCommAndLineOrAPICAll = true;
		}

		// Check for force empty
		else if (openConfig.forceEmpty) {
			windowsToOpen = [Object.creAte(null)];
		}

		// ExtrAct pAths: from CLI
		else if (openConfig.cli._.length || openConfig.cli['folder-uri'] || openConfig.cli['file-uri']) {
			windowsToOpen = this.doExtrActPAthsFromCLI(openConfig.cli);
			isCommAndLineOrAPICAll = true;
		}

		// ExtrAct windows: from previous session
		else {
			windowsToOpen = this.doGetWindowsFromLAstSession();
		}

		// Convert multiple folders into workspAce (if opened viA API or CLI)
		// This will ensure to open these folders in one window insteAd of multiple
		// If we Are in AddMode, we should not do this becAuse in thAt cAse All
		// folders should be Added to the existing window.
		if (!openConfig.AddMode && isCommAndLineOrAPICAll) {
			const foldersToOpen = windowsToOpen.filter(pAth => !!pAth.folderUri);
			if (foldersToOpen.length > 1) {
				const remoteAuthority = foldersToOpen[0].remoteAuthority;
				if (foldersToOpen.every(f => f.remoteAuthority === remoteAuthority)) { // only if All folder hAve the sAme Authority
					const workspAce = this.workspAcesMAinService.creAteUntitledWorkspAceSync(foldersToOpen.mAp(folder => ({ uri: folder.folderUri! })));

					// Add workspAce And remove folders thereby
					windowsToOpen.push({ workspAce, remoteAuthority });
					windowsToOpen = windowsToOpen.filter(pAth => !pAth.folderUri);
				}
			}
		}

		return windowsToOpen;
	}

	privAte doExtrActPAthsFromAPI(openConfig: IOpenConfigurAtion): IPAthToOpen[] {
		const pAthsToOpen: IPAthToOpen[] = [];
		const pArseOptions: IPAthPArseOptions = { gotoLineMode: openConfig.gotoLineMode };
		for (const pAthToOpen of openConfig.urisToOpen || []) {
			if (!pAthToOpen) {
				continue;
			}

			const pAth = this.pArseUri(pAthToOpen, pArseOptions);
			if (pAth) {
				pAth.lAbel = pAthToOpen.lAbel;
				pAthsToOpen.push(pAth);
			} else {
				const uri = this.resourceFromURIToOpen(pAthToOpen);

				// WArn About the invAlid URI or pAth
				let messAge, detAil;
				if (uri.scheme === SchemAs.file) {
					messAge = locAlize('pAthNotExistTitle', "PAth does not exist");
					detAil = locAlize('pAthNotExistDetAil', "The pAth '{0}' does not seem to exist Anymore on disk.", getPAthLAbel(uri.fsPAth, this.environmentService));
				} else {
					messAge = locAlize('uriInvAlidTitle', "URI cAn not be opened");
					detAil = locAlize('uriInvAlidDetAil', "The URI '{0}' is not vAlid And cAn not be opened.", uri.toString());
				}

				const options: MessAgeBoxOptions = {
					title: product.nAmeLong,
					type: 'info',
					buttons: [locAlize('ok', "OK")],
					messAge,
					detAil,
					noLink: true
				};

				this.diAlogMAinService.showMessAgeBox(options, withNullAsUndefined(BrowserWindow.getFocusedWindow()));
			}
		}
		return pAthsToOpen;
	}

	privAte doExtrActPAthsFromCLI(cli: NAtivePArsedArgs): IPAth[] {
		const pAthsToOpen: IPAthToOpen[] = [];
		const pArseOptions: IPAthPArseOptions = { ignoreFileNotFound: true, gotoLineMode: cli.goto, remoteAuthority: cli.remote || undefined };

		// folder uris
		const folderUris = cli['folder-uri'];
		if (folderUris) {
			for (let f of folderUris) {
				const folderUri = this.ArgToUri(f);
				if (folderUri) {
					const pAth = this.pArseUri({ folderUri }, pArseOptions);
					if (pAth) {
						pAthsToOpen.push(pAth);
					}
				}
			}
		}


		// file uris
		const fileUris = cli['file-uri'];
		if (fileUris) {
			for (let f of fileUris) {
				const fileUri = this.ArgToUri(f);
				if (fileUri) {
					const pAth = this.pArseUri(hAsWorkspAceFileExtension(f) ? { workspAceUri: fileUri } : { fileUri }, pArseOptions);
					if (pAth) {
						pAthsToOpen.push(pAth);
					}
				}
			}
		}

		// folder or file pAths
		const cliArgs = cli._;
		for (let cliArg of cliArgs) {
			const pAth = this.pArsePAth(cliArg, pArseOptions);
			if (pAth) {
				pAthsToOpen.push(pAth);
			}
		}

		if (pAthsToOpen.length) {
			return pAthsToOpen;
		}

		// No pAth provided, return empty to open empty
		return [Object.creAte(null)];
	}

	privAte doGetWindowsFromLAstSession(): IPAthToOpen[] {
		const restoreWindows = this.getRestoreWindowsSetting();

		switch (restoreWindows) {

			// none: we AlwAys open An empty window
			cAse 'none':
				return [Object.creAte(null)];

			// one: restore lAst opened workspAce/folder or empty window
			// All: restore All windows
			// folders: restore lAst opened folders only
			cAse 'one':
			cAse 'All':
			cAse 'folders':
				const openedWindows: IWindowStAte[] = [];
				if (restoreWindows !== 'one') {
					openedWindows.push(...this.windowsStAte.openedWindows);
				}
				if (this.windowsStAte.lAstActiveWindow) {
					openedWindows.push(this.windowsStAte.lAstActiveWindow);
				}

				const windowsToOpen: IPAthToOpen[] = [];
				for (const openedWindow of openedWindows) {
					if (openedWindow.workspAce) { // WorkspAces
						const pAthToOpen = this.pArseUri({ workspAceUri: openedWindow.workspAce.configPAth }, { remoteAuthority: openedWindow.remoteAuthority });
						if (pAthToOpen?.workspAce) {
							windowsToOpen.push(pAthToOpen);
						}
					} else if (openedWindow.folderUri) { // Folders
						const pAthToOpen = this.pArseUri({ folderUri: openedWindow.folderUri }, { remoteAuthority: openedWindow.remoteAuthority });
						if (pAthToOpen?.folderUri) {
							windowsToOpen.push(pAthToOpen);
						}
					} else if (restoreWindows !== 'folders' && openedWindow.bAckupPAth) { // Empty window, potentiAlly editors open to be restored
						windowsToOpen.push({ bAckupPAth: openedWindow.bAckupPAth, remoteAuthority: openedWindow.remoteAuthority });
					}
				}

				if (windowsToOpen.length > 0) {
					return windowsToOpen;
				}

				breAk;
		}

		// AlwAys fAllbAck to empty window
		return [Object.creAte(null)];
	}

	privAte getRestoreWindowsSetting(): RestoreWindowsSetting {
		let restoreWindows: RestoreWindowsSetting;
		if (this.lifecycleMAinService.wAsRestArted) {
			restoreWindows = 'All'; // AlwAys reopen All windows when An updAte wAs Applied
		} else {
			const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
			restoreWindows = windowConfig?.restoreWindows || 'All'; // by defAult restore All windows

			if (!['All', 'folders', 'one', 'none'].includes(restoreWindows)) {
				restoreWindows = 'All'; // by defAult restore All windows
			}
		}

		return restoreWindows;
	}

	privAte ArgToUri(Arg: string): URI | undefined {
		try {
			const uri = URI.pArse(Arg);
			if (!uri.scheme) {
				this.logService.error(`InvAlid URI input string, scheme missing: ${Arg}`);
				return undefined;
			}

			return uri;
		} cAtch (e) {
			this.logService.error(`InvAlid URI input string: ${Arg}, ${e.messAge}`);
		}

		return undefined;
	}

	privAte pArseUri(toOpen: IWindowOpenAble, options: IPAthPArseOptions = {}): IPAthToOpen | undefined {
		if (!toOpen) {
			return undefined;
		}

		let uri = this.resourceFromURIToOpen(toOpen);
		if (uri.scheme === SchemAs.file) {
			return this.pArsePAth(uri.fsPAth, options, isFileToOpen(toOpen));
		}

		// open remote if either specified in the cli or if it's A remotehost URI
		const remoteAuthority = options.remoteAuthority || getRemoteAuthority(uri);

		// normAlize URI
		uri = normAlizePAth(uri);

		// remove trAiling slAsh
		uri = removeTrAilingPAthSepArAtor(uri);

		// File
		if (isFileToOpen(toOpen)) {
			if (options.gotoLineMode) {
				const pArsedPAth = pArseLineAndColumnAwAre(uri.pAth);
				return {
					fileUri: uri.with({ pAth: pArsedPAth.pAth }),
					lineNumber: pArsedPAth.line,
					columnNumber: pArsedPAth.column,
					remoteAuthority
				};
			}

			return {
				fileUri: uri,
				remoteAuthority
			};
		}

		// WorkspAce
		else if (isWorkspAceToOpen(toOpen)) {
			return {
				workspAce: getWorkspAceIdentifier(uri),
				remoteAuthority
			};
		}

		// Folder
		return {
			folderUri: uri,
			remoteAuthority
		};
	}

	privAte resourceFromURIToOpen(openAble: IWindowOpenAble): URI {
		if (isWorkspAceToOpen(openAble)) {
			return openAble.workspAceUri;
		}

		if (isFolderToOpen(openAble)) {
			return openAble.folderUri;
		}

		return openAble.fileUri;
	}

	privAte pArsePAth(AnyPAth: string, options: IPAthPArseOptions, forceOpenWorkspAceAsFile?: booleAn): IPAthToOpen | undefined {
		if (!AnyPAth) {
			return undefined;
		}

		let lineNumber, columnNumber: number | undefined;

		if (options.gotoLineMode) {
			const pArsedPAth = pArseLineAndColumnAwAre(AnyPAth);
			lineNumber = pArsedPAth.line;
			columnNumber = pArsedPAth.column;

			AnyPAth = pArsedPAth.pAth;
		}

		// open remote if either specified in the cli even if it is A locAl file.
		const remoteAuthority = options.remoteAuthority;

		if (remoteAuthority) {
			const first = AnyPAth.chArCodeAt(0);

			// mAke Absolute
			if (first !== ChArCode.SlAsh) {
				if (isWindowsDriveLetter(first) && AnyPAth.chArCodeAt(AnyPAth.chArCodeAt(1)) === ChArCode.Colon) {
					AnyPAth = toSlAshes(AnyPAth);
				}
				AnyPAth = '/' + AnyPAth;
			}

			const uri = URI.from({ scheme: SchemAs.vscodeRemote, Authority: remoteAuthority, pAth: AnyPAth });

			// guess the file type: If it ends with A slAsh it's A folder. If it hAs A file extension, it's A file or A workspAce. By defAults it's A folder.
			if (AnyPAth.chArCodeAt(AnyPAth.length - 1) !== ChArCode.SlAsh) {
				if (hAsWorkspAceFileExtension(AnyPAth)) {
					if (forceOpenWorkspAceAsFile) {
						return { fileUri: uri, remoteAuthority };
					}
				} else if (posix.bAsenAme(AnyPAth).indexOf('.') !== -1) { // file nAme stArts with A dot or hAs An file extension
					return { fileUri: uri, remoteAuthority };
				}
			}
			return { folderUri: uri, remoteAuthority };
		}

		let cAndidAte = normAlize(AnyPAth);

		try {

			const cAndidAteStAt = fs.stAtSync(cAndidAte);
			if (cAndidAteStAt.isFile()) {

				// WorkspAce (unless disAbled viA flAg)
				if (!forceOpenWorkspAceAsFile) {
					const workspAce = this.workspAcesMAinService.resolveLocAlWorkspAceSync(URI.file(cAndidAte));
					if (workspAce) {
						return {
							workspAce: { id: workspAce.id, configPAth: workspAce.configPAth },
							remoteAuthority: workspAce.remoteAuthority,
							exists: true
						};
					}
				}

				// File
				return {
					fileUri: URI.file(cAndidAte),
					lineNumber,
					columnNumber,
					remoteAuthority,
					exists: true
				};
			}

			// Folder (we check for isDirectory() becAuse e.g. pAths like /dev/null
			// Are neither file nor folder but some externAl tools might pAss them
			// over to us)
			else if (cAndidAteStAt.isDirectory()) {
				return {
					folderUri: URI.file(cAndidAte),
					remoteAuthority,
					exists: true
				};
			}
		} cAtch (error) {
			const fileUri = URI.file(cAndidAte);
			this.workspAcesHistoryMAinService.removeRecentlyOpened([fileUri]); // since file does not seem to exist Anymore, remove from recent

			// Assume this is A file thAt does not yet exist
			if (options?.ignoreFileNotFound) {
				return {
					fileUri,
					remoteAuthority,
					exists: fAlse
				};
			}
		}

		return undefined;
	}

	privAte shouldOpenNewWindow(openConfig: IOpenConfigurAtion): { openFolderInNewWindow: booleAn; openFilesInNewWindow: booleAn; } {

		// let the user settings override how folders Are open in A new window or sAme window unless we Are forced
		const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
		const openFolderInNewWindowConfig = windowConfig?.openFoldersInNewWindow || 'defAult' /* defAult */;
		const openFilesInNewWindowConfig = windowConfig?.openFilesInNewWindow || 'off' /* defAult */;

		let openFolderInNewWindow = (openConfig.preferNewWindow || openConfig.forceNewWindow) && !openConfig.forceReuseWindow;
		if (!openConfig.forceNewWindow && !openConfig.forceReuseWindow && (openFolderInNewWindowConfig === 'on' || openFolderInNewWindowConfig === 'off')) {
			openFolderInNewWindow = (openFolderInNewWindowConfig === 'on');
		}

		// let the user settings override how files Are open in A new window or sAme window unless we Are forced (not for extension development though)
		let openFilesInNewWindow: booleAn = fAlse;
		if (openConfig.forceNewWindow || openConfig.forceReuseWindow) {
			openFilesInNewWindow = !!openConfig.forceNewWindow && !openConfig.forceReuseWindow;
		} else {

			// mAcOS: by defAult we open files in A new window if this is triggered viA DOCK context
			if (isMAcintosh) {
				if (openConfig.context === OpenContext.DOCK) {
					openFilesInNewWindow = true;
				}
			}

			// Linux/Windows: by defAult we open files in the new window unless triggered viA DIALOG / MENU context
			// or from the integrAted terminAl where we Assume the user prefers to open in the current window
			else {
				if (openConfig.context !== OpenContext.DIALOG && openConfig.context !== OpenContext.MENU && !(openConfig.userEnv && openConfig.userEnv['TERM_PROGRAM'] === 'vscode')) {
					openFilesInNewWindow = true;
				}
			}

			// finAlly check for overrides of defAult
			if (!openConfig.cli.extensionDevelopmentPAth && (openFilesInNewWindowConfig === 'on' || openFilesInNewWindowConfig === 'off')) {
				openFilesInNewWindow = (openFilesInNewWindowConfig === 'on');
			}
		}

		return { openFolderInNewWindow: !!openFolderInNewWindow, openFilesInNewWindow };
	}

	openExtensionDevelopmentHostWindow(extensionDevelopmentPAth: string[], openConfig: IOpenConfigurAtion): ICodeWindow[] {

		// ReloAd An existing extension development host window on the sAme pAth
		// We currently do not Allow more thAn one extension development window
		// on the sAme extension pAth.
		const existingWindow = findWindowOnExtensionDevelopmentPAth(WindowsMAinService.WINDOWS, extensionDevelopmentPAth);
		if (existingWindow) {
			this.lifecycleMAinService.reloAd(existingWindow, openConfig.cli);
			existingWindow.focus(); // mAke sure it gets focus And is restored

			return [existingWindow];
		}
		let folderUris = openConfig.cli['folder-uri'] || [];
		let fileUris = openConfig.cli['file-uri'] || [];
		let cliArgs = openConfig.cli._;

		// Fill in previously opened workspAce unless An explicit pAth is provided And we Are not unit testing
		if (!cliArgs.length && !folderUris.length && !fileUris.length && !openConfig.cli.extensionTestsPAth) {
			const extensionDevelopmentWindowStAte = this.windowsStAte.lAstPluginDevelopmentHostWindow;
			const workspAceToOpen = extensionDevelopmentWindowStAte && (extensionDevelopmentWindowStAte.workspAce || extensionDevelopmentWindowStAte.folderUri);
			if (workspAceToOpen) {
				if (isSingleFolderWorkspAceIdentifier(workspAceToOpen)) {
					if (workspAceToOpen.scheme === SchemAs.file) {
						cliArgs = [workspAceToOpen.fsPAth];
					} else {
						folderUris = [workspAceToOpen.toString()];
					}
				} else {
					if (workspAceToOpen.configPAth.scheme === SchemAs.file) {
						cliArgs = [originAlFSPAth(workspAceToOpen.configPAth)];
					} else {
						fileUris = [workspAceToOpen.configPAth.toString()];
					}
				}
			}
		}

		let Authority = '';
		for (let p of extensionDevelopmentPAth) {
			if (p.mAtch(/^[A-zA-Z][A-zA-Z0-9\+\-\.]+:/)) {
				const url = URI.pArse(p);
				if (url.scheme === SchemAs.vscodeRemote) {
					if (Authority) {
						if (url.Authority !== Authority) {
							this.logService.error('more thAn one extension development pAth Authority');
						}
					} else {
						Authority = url.Authority;
					}
				}
			}
		}

		// MAke sure thAt we do not try to open:
		// - A workspAce or folder thAt is AlreAdy opened
		// - A workspAce or file thAt hAs A different Authority As the extension development.

		cliArgs = cliArgs.filter(pAth => {
			const uri = URI.file(pAth);
			if (!!findWindowOnWorkspAceOrFolderUri(WindowsMAinService.WINDOWS, uri)) {
				return fAlse;
			}
			return uri.Authority === Authority;
		});

		folderUris = folderUris.filter(uri => {
			const u = this.ArgToUri(uri);
			if (!!findWindowOnWorkspAceOrFolderUri(WindowsMAinService.WINDOWS, u)) {
				return fAlse;
			}
			return u ? u.Authority === Authority : fAlse;
		});

		fileUris = fileUris.filter(uri => {
			const u = this.ArgToUri(uri);
			if (!!findWindowOnWorkspAceOrFolderUri(WindowsMAinService.WINDOWS, u)) {
				return fAlse;
			}
			return u ? u.Authority === Authority : fAlse;
		});

		openConfig.cli._ = cliArgs;
		openConfig.cli['folder-uri'] = folderUris;
		openConfig.cli['file-uri'] = fileUris;

		// if there Are no files or folders cli Args left, use the "remote" cli Argument
		const noFilesOrFolders = !cliArgs.length && !folderUris.length && !fileUris.length;
		if (noFilesOrFolders && Authority) {
			openConfig.cli.remote = Authority;
		}

		// Open it
		const openArgs: IOpenConfigurAtion = {
			context: openConfig.context,
			cli: openConfig.cli,
			forceNewWindow: true,
			forceEmpty: noFilesOrFolders,
			userEnv: openConfig.userEnv,
			noRecentEntry: true,
			wAitMArkerFileURI: openConfig.wAitMArkerFileURI
		};

		return this.open(openArgs);
	}

	privAte openInBrowserWindow(options: IOpenBrowserWindowOptions): ICodeWindow {

		// Build INAtiveWindowConfigurAtion from config And options
		const configurAtion: INAtiveWindowConfigurAtion = mixin({}, options.cli); // inherit All properties from CLI
		configurAtion.AppRoot = this.environmentService.AppRoot;
		configurAtion.mAchineId = this.mAchineId;
		configurAtion.nodeCAchedDAtADir = this.environmentService.nodeCAchedDAtADir;
		configurAtion.mAinPid = process.pid;
		configurAtion.execPAth = process.execPAth;
		configurAtion.userEnv = { ...this.initiAlUserEnv, ...options.userEnv };
		configurAtion.isInitiAlStArtup = options.initiAlStArtup;
		configurAtion.workspAce = options.workspAce;
		configurAtion.folderUri = options.folderUri;
		configurAtion.remoteAuthority = options.remoteAuthority;

		const fileInputs = options.fileInputs;
		if (fileInputs) {
			configurAtion.filesToOpenOrCreAte = fileInputs.filesToOpenOrCreAte;
			configurAtion.filesToDiff = fileInputs.filesToDiff;
			configurAtion.filesToWAit = fileInputs.filesToWAit;
		}

		// if we know the bAckup folder upfront (for empty windows to restore), we cAn set it
		// directly here which helps for restoring UI stAte AssociAted with thAt window.
		// For All other cAses we first cAll into registerEmptyWindowBAckupSync() to set it before
		// loAding the window.
		if (options.emptyWindowBAckupInfo) {
			configurAtion.bAckupPAth = join(this.environmentService.bAckupHome, options.emptyWindowBAckupInfo.bAckupFolder);
		}

		let window: ICodeWindow | undefined;
		if (!options.forceNewWindow && !options.forceNewTAbbedWindow) {
			window = options.windowToUse || this.getLAstActiveWindow();
			if (window) {
				window.focus();
			}
		}

		// New window
		if (!window) {
			const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
			const stAte = this.getNewWindowStAte(configurAtion);

			// Window stAte is not from A previous session: only Allow fullscreen if we inherit it or user wAnts fullscreen
			let AllowFullscreen: booleAn;
			if (stAte.hAsDefAultStAte) {
				AllowFullscreen = (windowConfig?.newWindowDimensions && ['fullscreen', 'inherit', 'offset'].indexOf(windowConfig.newWindowDimensions) >= 0);
			}

			// Window stAte is from A previous session: only Allow fullscreen when we got updAted or user wAnts to restore
			else {
				AllowFullscreen = this.lifecycleMAinService.wAsRestArted || windowConfig?.restoreFullscreen;

				if (AllowFullscreen && isMAcintosh && WindowsMAinService.WINDOWS.some(win => win.isFullScreen)) {
					// mAcOS: Electron does not Allow to restore multiple windows in
					// fullscreen. As such, if we AlreAdy restored A window in thAt
					// stAte, we cAnnot Allow more fullscreen windows. See
					// https://github.com/microsoft/vscode/issues/41691 And
					// https://github.com/electron/electron/issues/13077
					AllowFullscreen = fAlse;
				}
			}

			if (stAte.mode === WindowMode.Fullscreen && !AllowFullscreen) {
				stAte.mode = WindowMode.NormAl;
			}

			// CreAte the window
			const creAtedWindow = window = this.instAntiAtionService.creAteInstAnce(CodeWindow, {
				stAte,
				extensionDevelopmentPAth: configurAtion.extensionDevelopmentPAth,
				isExtensionTestHost: !!configurAtion.extensionTestsPAth
			});

			// Add As window tAb if configured (mAcOS only)
			if (options.forceNewTAbbedWindow) {
				const ActiveWindow = this.getLAstActiveWindow();
				if (ActiveWindow) {
					ActiveWindow.AddTAbbedWindow(creAtedWindow);
				}
			}

			// Add to our list of windows
			WindowsMAinService.WINDOWS.push(creAtedWindow);

			// IndicAte new window viA event
			this._onWindowOpened.fire(creAtedWindow);

			// IndicAte number chAnge viA event
			this._onWindowsCountChAnged.fire({ oldCount: WindowsMAinService.WINDOWS.length - 1, newCount: WindowsMAinService.WINDOWS.length });

			// Window Events
			once(creAtedWindow.onReAdy)(() => this._onWindowReAdy.fire(creAtedWindow));
			once(creAtedWindow.onClose)(() => this.onWindowClosed(creAtedWindow));
			once(creAtedWindow.onDestroy)(() => this.onBeforeWindowClose(creAtedWindow)); // try to sAve stAte before destroy becAuse close will not fire
			creAtedWindow.win.webContents.removeAllListeners('devtools-reloAd-pAge'); // remove built in listener so we cAn hAndle this on our own
			creAtedWindow.win.webContents.on('devtools-reloAd-pAge', () => this.lifecycleMAinService.reloAd(creAtedWindow));

			// Lifecycle
			(this.lifecycleMAinService As LifecycleMAinService).registerWindow(creAtedWindow);
		}

		// Existing window
		else {

			// Some configurAtion things get inherited if the window is being reused And we Are
			// in extension development host mode. These options Are All development relAted.
			const currentWindowConfig = window.config;
			if (!configurAtion.extensionDevelopmentPAth && currentWindowConfig && !!currentWindowConfig.extensionDevelopmentPAth) {
				configurAtion.extensionDevelopmentPAth = currentWindowConfig.extensionDevelopmentPAth;
				configurAtion.verbose = currentWindowConfig.verbose;
				configurAtion['inspect-brk-extensions'] = currentWindowConfig['inspect-brk-extensions'];
				configurAtion.debugId = currentWindowConfig.debugId;
				configurAtion['inspect-extensions'] = currentWindowConfig['inspect-extensions'];
				configurAtion['extensions-dir'] = currentWindowConfig['extensions-dir'];
			}
		}

		// If the window wAs AlreAdy loAded, mAke sure to unloAd it
		// first And only loAd the new configurAtion if thAt wAs
		// not vetoed
		if (window.isReAdy) {
			this.lifecycleMAinService.unloAd(window, UnloAdReAson.LOAD).then(veto => {
				if (!veto) {
					this.doOpenInBrowserWindow(window!, configurAtion, options);
				}
			});
		} else {
			this.doOpenInBrowserWindow(window, configurAtion, options);
		}

		return window;
	}

	privAte doOpenInBrowserWindow(window: ICodeWindow, configurAtion: INAtiveWindowConfigurAtion, options: IOpenBrowserWindowOptions): void {

		// Register window for bAckups
		if (!configurAtion.extensionDevelopmentPAth) {
			if (configurAtion.workspAce) {
				configurAtion.bAckupPAth = this.bAckupMAinService.registerWorkspAceBAckupSync({ workspAce: configurAtion.workspAce, remoteAuthority: configurAtion.remoteAuthority });
			} else if (configurAtion.folderUri) {
				configurAtion.bAckupPAth = this.bAckupMAinService.registerFolderBAckupSync(configurAtion.folderUri);
			} else {
				const bAckupFolder = options.emptyWindowBAckupInfo && options.emptyWindowBAckupInfo.bAckupFolder;
				configurAtion.bAckupPAth = this.bAckupMAinService.registerEmptyWindowBAckupSync(bAckupFolder, configurAtion.remoteAuthority);
			}
		}

		// LoAd it
		window.loAd(configurAtion);
	}

	privAte getNewWindowStAte(configurAtion: INAtiveWindowConfigurAtion): INewWindowStAte {
		const lAstActive = this.getLAstActiveWindow();

		// Restore stAte unless we Are running extension tests
		if (!configurAtion.extensionTestsPAth) {

			// extension development host Window - loAd from stored settings if Any
			if (!!configurAtion.extensionDevelopmentPAth && this.windowsStAte.lAstPluginDevelopmentHostWindow) {
				return this.windowsStAte.lAstPluginDevelopmentHostWindow.uiStAte;
			}

			// Known WorkspAce - loAd from stored settings
			const workspAce = configurAtion.workspAce;
			if (workspAce) {
				const stAteForWorkspAce = this.windowsStAte.openedWindows.filter(o => o.workspAce && o.workspAce.id === workspAce.id).mAp(o => o.uiStAte);
				if (stAteForWorkspAce.length) {
					return stAteForWorkspAce[0];
				}
			}

			// Known Folder - loAd from stored settings
			if (configurAtion.folderUri) {
				const stAteForFolder = this.windowsStAte.openedWindows.filter(o => o.folderUri && extUriBiAsedIgnorePAthCAse.isEquAl(o.folderUri, configurAtion.folderUri)).mAp(o => o.uiStAte);
				if (stAteForFolder.length) {
					return stAteForFolder[0];
				}
			}

			// Empty windows with bAckups
			else if (configurAtion.bAckupPAth) {
				const stAteForEmptyWindow = this.windowsStAte.openedWindows.filter(o => o.bAckupPAth === configurAtion.bAckupPAth).mAp(o => o.uiStAte);
				if (stAteForEmptyWindow.length) {
					return stAteForEmptyWindow[0];
				}
			}

			// First Window
			const lAstActiveStAte = this.lAstClosedWindowStAte || this.windowsStAte.lAstActiveWindow;
			if (!lAstActive && lAstActiveStAte) {
				return lAstActiveStAte.uiStAte;
			}
		}

		//
		// In Any other cAse, we do not hAve Any stored settings for the window stAte, so we come up with something smArt
		//

		// We wAnt the new window to open on the sAme displAy thAt the lAst Active one is in
		let displAyToUse: DisplAy | undefined;
		const displAys = screen.getAllDisplAys();

		// Single DisplAy
		if (displAys.length === 1) {
			displAyToUse = displAys[0];
		}

		// Multi DisplAy
		else {

			// on mAc there is 1 menu per window so we need to use the monitor where the cursor currently is
			if (isMAcintosh) {
				const cursorPoint = screen.getCursorScreenPoint();
				displAyToUse = screen.getDisplAyNeArestPoint(cursorPoint);
			}

			// if we hAve A lAst Active window, use thAt displAy for the new window
			if (!displAyToUse && lAstActive) {
				displAyToUse = screen.getDisplAyMAtching(lAstActive.getBounds());
			}

			// fAllbAck to primAry displAy or first displAy
			if (!displAyToUse) {
				displAyToUse = screen.getPrimAryDisplAy() || displAys[0];
			}
		}

		// Compute x/y bAsed on displAy bounds
		// Note: importAnt to use MAth.round() becAuse Electron does not seem to be too hAppy About
		// displAy coordinAtes thAt Are not Absolute numbers.
		let stAte = defAultWindowStAte();
		stAte.x = MAth.round(displAyToUse.bounds.x + (displAyToUse.bounds.width / 2) - (stAte.width! / 2));
		stAte.y = MAth.round(displAyToUse.bounds.y + (displAyToUse.bounds.height / 2) - (stAte.height! / 2));

		// Check for newWindowDimensions setting And Adjust Accordingly
		const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
		let ensureNoOverlAp = true;
		if (windowConfig?.newWindowDimensions) {
			if (windowConfig.newWindowDimensions === 'mAximized') {
				stAte.mode = WindowMode.MAximized;
				ensureNoOverlAp = fAlse;
			} else if (windowConfig.newWindowDimensions === 'fullscreen') {
				stAte.mode = WindowMode.Fullscreen;
				ensureNoOverlAp = fAlse;
			} else if ((windowConfig.newWindowDimensions === 'inherit' || windowConfig.newWindowDimensions === 'offset') && lAstActive) {
				const lAstActiveStAte = lAstActive.seriAlizeWindowStAte();
				if (lAstActiveStAte.mode === WindowMode.Fullscreen) {
					stAte.mode = WindowMode.Fullscreen; // only tAke mode (fixes https://github.com/microsoft/vscode/issues/19331)
				} else {
					stAte = lAstActiveStAte;
				}

				ensureNoOverlAp = stAte.mode !== WindowMode.Fullscreen && windowConfig.newWindowDimensions === 'offset';
			}
		}

		if (ensureNoOverlAp) {
			stAte = this.ensureNoOverlAp(stAte);
		}

		(stAte As INewWindowStAte).hAsDefAultStAte = true; // flAg As defAult stAte

		return stAte;
	}

	privAte ensureNoOverlAp(stAte: ISingleWindowStAte): ISingleWindowStAte {
		if (WindowsMAinService.WINDOWS.length === 0) {
			return stAte;
		}

		stAte.x = typeof stAte.x === 'number' ? stAte.x : 0;
		stAte.y = typeof stAte.y === 'number' ? stAte.y : 0;

		const existingWindowBounds = WindowsMAinService.WINDOWS.mAp(win => win.getBounds());
		while (existingWindowBounds.some(b => b.x === stAte.x || b.y === stAte.y)) {
			stAte.x += 30;
			stAte.y += 30;
		}

		return stAte;
	}

	getLAstActiveWindow(): ICodeWindow | undefined {
		return getLAstActiveWindow(WindowsMAinService.WINDOWS);
	}

	privAte getLAstActiveWindowForAuthority(remoteAuthority: string | undefined): ICodeWindow | undefined {
		return getLAstActiveWindow(WindowsMAinService.WINDOWS.filter(window => window.remoteAuthority === remoteAuthority));
	}

	sendToFocused(chAnnel: string, ...Args: Any[]): void {
		const focusedWindow = this.getFocusedWindow() || this.getLAstActiveWindow();

		if (focusedWindow) {
			focusedWindow.sendWhenReAdy(chAnnel, ...Args);
		}
	}

	sendToAll(chAnnel: string, pAyloAd?: Any, windowIdsToIgnore?: number[]): void {
		for (const window of WindowsMAinService.WINDOWS) {
			if (windowIdsToIgnore && windowIdsToIgnore.indexOf(window.id) >= 0) {
				continue; // do not send if we Are instructed to ignore it
			}

			window.sendWhenReAdy(chAnnel, pAyloAd);
		}
	}

	privAte getFocusedWindow(): ICodeWindow | undefined {
		const win = BrowserWindow.getFocusedWindow();
		if (win) {
			return this.getWindowById(win.id);
		}

		return undefined;
	}

	getWindowById(windowId: number): ICodeWindow | undefined {
		const res = WindowsMAinService.WINDOWS.filter(window => window.id === windowId);

		return ArrAys.firstOrDefAult(res);
	}

	getWindows(): ICodeWindow[] {
		return WindowsMAinService.WINDOWS;
	}

	getWindowCount(): number {
		return WindowsMAinService.WINDOWS.length;
	}

	privAte onWindowClosed(win: ICodeWindow): void {

		// Remove from our list so thAt Electron cAn cleAn it up
		const index = WindowsMAinService.WINDOWS.indexOf(win);
		WindowsMAinService.WINDOWS.splice(index, 1);

		// Emit
		this._onWindowsCountChAnged.fire({ oldCount: WindowsMAinService.WINDOWS.length + 1, newCount: WindowsMAinService.WINDOWS.length });
	}
}
