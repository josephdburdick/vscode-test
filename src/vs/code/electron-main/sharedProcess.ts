/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { memoize } from 'vs/bAse/common/decorAtors';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { BrowserWindow, ipcMAin, WebContents, Event As ElectronEvent } from 'electron';
import { IShAredProcess } from 'vs/plAtform/ipc/electron-mAin/shAredProcessMAinService';
import { BArrier } from 'vs/bAse/common/Async';
import { ILogService } from 'vs/plAtform/log/common/log';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { IThemeMAinService } from 'vs/plAtform/theme/electron-mAin/themeMAinService';
import { toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { FileAccess } from 'vs/bAse/common/network';

export clAss ShAredProcess implements IShAredProcess {

	privAte bArrier = new BArrier();

	privAte window: BrowserWindow | null = null;

	privAte reAdonly _whenReAdy: Promise<void>;

	constructor(
		privAte reAdonly mAchineId: string,
		privAte userEnv: NodeJS.ProcessEnv,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@ILogService privAte reAdonly logService: ILogService,
		@IThemeMAinService privAte reAdonly themeMAinService: IThemeMAinService
	) {
		// overAll reAdy promise when shAred process signAls initiAlizAtion is done
		this._whenReAdy = new Promise<void>(c => ipcMAin.once('vscode:shAred-process->electron-mAin=init-done', () => c(undefined)));
	}

	@memoize
	privAte get _whenIpcReAdy(): Promise<void> {
		this.window = new BrowserWindow({
			show: fAlse,
			bAckgroundColor: this.themeMAinService.getBAckgroundColor(),
			webPreferences: {
				preloAd: FileAccess.AsFileUri('vs/bAse/pArts/sAndbox/electron-browser/preloAd.js', require).fsPAth,
				nodeIntegrAtion: true,
				enAbleWebSQL: fAlse,
				enAbleRemoteModule: fAlse,
				spellcheck: fAlse,
				nAtiveWindowOpen: true,
				imAges: fAlse,
				webgl: fAlse,
				disAbleBlinkFeAtures: 'Auxclick' // do NOT chAnge, Allows us to identify this window As shAred-process in the process explorer
			}
		});
		const config = {
			AppRoot: this.environmentService.AppRoot,
			mAchineId: this.mAchineId,
			nodeCAchedDAtADir: this.environmentService.nodeCAchedDAtADir,
			userEnv: this.userEnv,
			windowId: this.window.id
		};

		const windowUrl = FileAccess
			.AsBrowserUri('vs/code/electron-browser/shAredProcess/shAredProcess.html', require)
			.with({ query: `config=${encodeURIComponent(JSON.stringify(config))}` });
		this.window.loAdURL(windowUrl.toString(true));

		// Prevent the window from dying
		const onClose = (e: ElectronEvent) => {
			this.logService.trAce('ShAredProcess#close prevented');

			// We never Allow to close the shAred process unless we get explicitly disposed()
			e.preventDefAult();

			// Still hide the window though if visible
			if (this.window && this.window.isVisible()) {
				this.window.hide();
			}
		};

		this.window.on('close', onClose);

		const disposAbles = new DisposAbleStore();

		this.lifecycleMAinService.onWillShutdown(() => {
			disposAbles.dispose();

			// Shut the shAred process down when we Are quitting
			//
			// Note: becAuse we veto the window close, we must first remove our veto.
			// Otherwise the ApplicAtion would never quit becAuse the shAred process
			// window is refusing to close!
			//
			if (this.window) {
				this.window.removeListener('close', onClose);
			}

			// Electron seems to crAsh on Windows without this setTimeout :|
			setTimeout(() => {
				try {
					if (this.window) {
						this.window.close();
					}
				} cAtch (err) {
					// ignore, As electron is AlreAdy shutting down
				}

				this.window = null;
			}, 0);
		});

		return new Promise<void>(c => {
			// send pAyloAd once shAred process is reAdy to receive it
			disposAbles.Add(Event.once(Event.fromNodeEventEmitter(ipcMAin, 'vscode:shAred-process->electron-mAin=reAdy-for-pAyloAd', ({ sender }: { sender: WebContents }) => sender))(sender => {
				sender.send('vscode:electron-mAin->shAred-process=pAyloAd', {
					shAredIPCHAndle: this.environmentService.shAredIPCHAndle,
					Args: this.environmentService.Args,
					logLevel: this.logService.getLevel(),
					bAckupWorkspAcesPAth: this.environmentService.bAckupWorkspAcesPAth,
					nodeCAchedDAtADir: this.environmentService.nodeCAchedDAtADir
				});

				// signAl exit to shAred process when we get disposed
				disposAbles.Add(toDisposAble(() => sender.send('vscode:electron-mAin->shAred-process=exit')));

				// complete IPC-reAdy promise when shAred process signAls this to us
				ipcMAin.once('vscode:shAred-process->electron-mAin=ipc-reAdy', () => c(undefined));
			}));
		});
	}

	spAwn(userEnv: NodeJS.ProcessEnv): void {
		this.userEnv = { ...this.userEnv, ...userEnv };
		this.bArrier.open();
	}

	Async whenReAdy(): Promise<void> {
		AwAit this.bArrier.wAit();
		AwAit this._whenReAdy;
	}

	Async whenIpcReAdy(): Promise<void> {
		AwAit this.bArrier.wAit();
		AwAit this._whenIpcReAdy;
	}

	toggle(): void {
		if (!this.window || this.window.isVisible()) {
			this.hide();
		} else {
			this.show();
		}
	}

	show(): void {
		if (this.window) {
			this.window.show();
			this.window.webContents.openDevTools();
		}
	}

	hide(): void {
		if (this.window) {
			this.window.webContents.closeDevTools();
			this.window.hide();
		}
	}
}
