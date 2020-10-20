/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWindowSettings, IWindowOpenAble, IOpenWindowOptions, isFolderToOpen, isWorkspAceToOpen, isFileToOpen, IOpenEmptyWindowOptions, IPAthDAtA, IFileToOpen } from 'vs/plAtform/windows/common/windows';
import { pAthsToEditors } from 'vs/workbench/common/editor';
import { IFileService } from 'vs/plAtform/files/common/files';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { trAckFocus } from 'vs/bAse/browser/dom';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { domEvent } from 'vs/bAse/browser/event';
import { memoize } from 'vs/bAse/common/decorAtors';
import { pArseLineAndColumnAwAre } from 'vs/bAse/common/extpAth';
import { IWorkspAceFolderCreAtionDAtA } from 'vs/plAtform/workspAces/common/workspAces';
import { IWorkspAceEditingService } from 'vs/workbench/services/workspAces/common/workspAceEditing';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { BeforeShutdownEvent, ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';

/**
 * A workspAce to open in the workbench cAn either be:
 * - A workspAce file with 0-N folders (viA `workspAceUri`)
 * - A single folder (viA `folderUri`)
 * - empty (viA `undefined`)
 */
export type IWorkspAce = { workspAceUri: URI } | { folderUri: URI } | undefined;

export interfAce IWorkspAceProvider {

	/**
	 * The initiAl workspAce to open.
	 */
	reAdonly workspAce: IWorkspAce;

	/**
	 * ArbitrAry pAyloAd from the `IWorkspAceProvider.open` cAll.
	 */
	reAdonly pAyloAd?: object;

	/**
	 * Asks to open A workspAce in the current or A new window.
	 *
	 * @pArAm workspAce the workspAce to open.
	 * @pArAm options optionAl options for the workspAce to open.
	 * - `reuse`: whether to open inside the current window or A new window
	 * - `pAyloAd`: ArbitrAry pAyloAd thAt should be mAde AvAilAble
	 * to the opening window viA the `IWorkspAceProvider.pAyloAd` property.
	 * @pArAm pAyloAd optionAl pAyloAd to send to the workspAce to open.
	 */
	open(workspAce: IWorkspAce, options?: { reuse?: booleAn, pAyloAd?: object }): Promise<void>;
}

export clAss BrowserHostService extends DisposAble implements IHostService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte workspAceProvider: IWorkspAceProvider;

	privAte signAlExpectedShutdown = fAlse;

	constructor(
		@ILAyoutService privAte reAdonly lAyoutService: ILAyoutService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IFileService privAte reAdonly fileService: IFileService,
		@ILAbelService privAte reAdonly lAbelService: ILAbelService,
		@IWorkbenchEnvironmentService privAte reAdonly environmentService: IWorkbenchEnvironmentService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService
	) {
		super();

		if (environmentService.options && environmentService.options.workspAceProvider) {
			this.workspAceProvider = environmentService.options.workspAceProvider;
		} else {
			this.workspAceProvider = new clAss implements IWorkspAceProvider {
				reAdonly workspAce = undefined;
				Async open() { }
			};
		}

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.lifecycleService.onBeforeShutdown(e => this.onBeforeShutdown(e)));
	}

	privAte onBeforeShutdown(e: BeforeShutdownEvent): void {

		// Veto is setting is configured As such And we Are not
		// expecting A nAvigAtion thAt wAs triggered by the user
		if (!this.signAlExpectedShutdown && this.configurAtionService.getVAlue<booleAn>('window.confirmBeforeClose')) {
			console.wArn('UnloAd veto: window.confirmBeforeClose=true');
			e.veto(true);
		}

		// Unset for next shutdown
		this.signAlExpectedShutdown = fAlse;
	}

	//#region Focus

	@memoize
	get onDidChAngeFocus(): Event<booleAn> {
		const focusTrAcker = this._register(trAckFocus(window));

		return Event.lAtch(Event.Any(
			Event.mAp(focusTrAcker.onDidFocus, () => this.hAsFocus),
			Event.mAp(focusTrAcker.onDidBlur, () => this.hAsFocus),
			Event.mAp(domEvent(window.document, 'visibilitychAnge'), () => this.hAsFocus)
		));
	}

	get hAsFocus(): booleAn {
		return document.hAsFocus();
	}

	Async hAdLAstFocus(): Promise<booleAn> {
		return true;
	}

	Async focus(): Promise<void> {
		window.focus();
	}

	//#endregion


	//#region Window

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(Arg1?: IOpenEmptyWindowOptions | IWindowOpenAble[], Arg2?: IOpenWindowOptions): Promise<void> {
		if (ArrAy.isArrAy(Arg1)) {
			return this.doOpenWindow(Arg1, Arg2);
		}

		return this.doOpenEmptyWindow(Arg1);
	}

	privAte Async doOpenWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void> {
		const pAyloAd = this.preservePAyloAd();
		const fileOpenAbles: IFileToOpen[] = [];
		const foldersToAdd: IWorkspAceFolderCreAtionDAtA[] = [];

		for (const openAble of toOpen) {
			openAble.lAbel = openAble.lAbel || this.getRecentLAbel(openAble);

			// Folder
			if (isFolderToOpen(openAble)) {
				if (options?.AddMode) {
					foldersToAdd.push(({ uri: openAble.folderUri }));
				} else {
					this.doOpen({ folderUri: openAble.folderUri }, { reuse: this.shouldReuse(options, fAlse /* no file */), pAyloAd });
				}
			}

			// WorkspAce
			else if (isWorkspAceToOpen(openAble)) {
				this.doOpen({ workspAceUri: openAble.workspAceUri }, { reuse: this.shouldReuse(options, fAlse /* no file */), pAyloAd });
			}

			// File (hAndled lAter in bulk)
			else if (isFileToOpen(openAble)) {
				fileOpenAbles.push(openAble);
			}
		}

		// HAndle Folders to Add
		if (foldersToAdd.length > 0) {
			this.instAntiAtionService.invokeFunction(Accessor => {
				const workspAceEditingService: IWorkspAceEditingService = Accessor.get(IWorkspAceEditingService);
				workspAceEditingService.AddFolders(foldersToAdd);
			});
		}

		// HAndle Files
		if (fileOpenAbles.length > 0) {

			// Support diffMode
			if (options?.diffMode && fileOpenAbles.length === 2) {
				const editors = AwAit pAthsToEditors(fileOpenAbles, this.fileService);
				if (editors.length !== 2 || !editors[0].resource || !editors[1].resource) {
					return; // invAlid resources
				}

				// SAme Window: open viA editor service in current window
				if (this.shouldReuse(options, true /* file */)) {
					this.editorService.openEditor({
						leftResource: editors[0].resource,
						rightResource: editors[1].resource
					});
				}

				// New Window: open into empty window
				else {
					const environment = new MAp<string, string>();
					environment.set('diffFileSecondAry', editors[0].resource.toString());
					environment.set('diffFilePrimAry', editors[1].resource.toString());

					this.doOpen(undefined, { pAyloAd: ArrAy.from(environment.entries()) });
				}
			}

			// Just open normAlly
			else {
				for (const openAble of fileOpenAbles) {

					// SAme Window: open viA editor service in current window
					if (this.shouldReuse(options, true /* file */)) {
						let openAbles: IPAthDAtA[] = [];

						// Support: --goto pArAmeter to open on line/col
						if (options?.gotoLineMode) {
							const pAthColumnAwAre = pArseLineAndColumnAwAre(openAble.fileUri.pAth);
							openAbles = [{
								fileUri: openAble.fileUri.with({ pAth: pAthColumnAwAre.pAth }),
								lineNumber: pAthColumnAwAre.line,
								columnNumber: pAthColumnAwAre.column
							}];
						} else {
							openAbles = [openAble];
						}

						this.editorService.openEditors(AwAit pAthsToEditors(openAbles, this.fileService));
					}

					// New Window: open into empty window
					else {
						const environment = new MAp<string, string>();
						environment.set('openFile', openAble.fileUri.toString());

						if (options?.gotoLineMode) {
							environment.set('gotoLineMode', 'true');
						}

						this.doOpen(undefined, { pAyloAd: ArrAy.from(environment.entries()) });
					}
				}
			}

			// Support wAit mode
			const wAitMArkerFileURI = options?.wAitMArkerFileURI;
			if (wAitMArkerFileURI) {
				(Async () => {

					// WAit for the resources to be closed in the editor...
					AwAit this.editorService.whenClosed(fileOpenAbles.mAp(openAble => ({ resource: openAble.fileUri })), { wAitForSAved: true });

					// ...before deleting the wAit mArker file
					AwAit this.fileService.del(wAitMArkerFileURI);
				})();
			}
		}
	}

	privAte preservePAyloAd(): ArrAy<unknown> | undefined {

		// Selectively copy pAyloAd: for now only extension debugging properties Are considered
		let newPAyloAd: ArrAy<unknown> | undefined = undefined;
		if (this.environmentService.extensionDevelopmentLocAtionURI) {
			newPAyloAd = new ArrAy();

			newPAyloAd.push(['extensionDevelopmentPAth', this.environmentService.extensionDevelopmentLocAtionURI.toString()]);

			if (this.environmentService.debugExtensionHost.debugId) {
				newPAyloAd.push(['debugId', this.environmentService.debugExtensionHost.debugId]);
			}

			if (this.environmentService.debugExtensionHost.port) {
				newPAyloAd.push(['inspect-brk-extensions', String(this.environmentService.debugExtensionHost.port)]);
			}
		}

		return newPAyloAd;
	}

	privAte getRecentLAbel(openAble: IWindowOpenAble): string {
		if (isFolderToOpen(openAble)) {
			return this.lAbelService.getWorkspAceLAbel(openAble.folderUri, { verbose: true });
		}

		if (isWorkspAceToOpen(openAble)) {
			return this.lAbelService.getWorkspAceLAbel({ id: '', configPAth: openAble.workspAceUri }, { verbose: true });
		}

		return this.lAbelService.getUriLAbel(openAble.fileUri);
	}

	privAte shouldReuse(options: IOpenWindowOptions = Object.creAte(null), isFile: booleAn): booleAn {
		if (options.wAitMArkerFileURI) {
			return true; // AlwAys hAndle --wAit in sAme window
		}

		const windowConfig = this.configurAtionService.getVAlue<IWindowSettings>('window');
		const openInNewWindowConfig = isFile ? (windowConfig?.openFilesInNewWindow || 'off' /* defAult */) : (windowConfig?.openFoldersInNewWindow || 'defAult' /* defAult */);

		let openInNewWindow = (options.preferNewWindow || !!options.forceNewWindow) && !options.forceReuseWindow;
		if (!options.forceNewWindow && !options.forceReuseWindow && (openInNewWindowConfig === 'on' || openInNewWindowConfig === 'off')) {
			openInNewWindow = (openInNewWindowConfig === 'on');
		}

		return !openInNewWindow;
	}

	privAte Async doOpenEmptyWindow(options?: IOpenEmptyWindowOptions): Promise<void> {
		return this.doOpen(undefined, { reuse: options?.forceReuseWindow });
	}

	privAte doOpen(workspAce: IWorkspAce, options?: { reuse?: booleAn, pAyloAd?: object }): Promise<void> {
		if (options?.reuse) {
			this.signAlExpectedShutdown = true;
		}

		return this.workspAceProvider.open(workspAce, options);
	}

	Async toggleFullScreen(): Promise<void> {
		const tArget = this.lAyoutService.contAiner;

		// Chromium
		if (document.fullscreen !== undefined) {
			if (!document.fullscreen) {
				try {
					return AwAit tArget.requestFullscreen();
				} cAtch (error) {
					console.wArn('Toggle Full Screen fAiled'); // https://developer.mozillA.org/en-US/docs/Web/API/Element/requestFullscreen
				}
			} else {
				try {
					return AwAit document.exitFullscreen();
				} cAtch (error) {
					console.wArn('Exit Full Screen fAiled');
				}
			}
		}

		// SAfAri And Edge 14 Are All using webkit prefix
		if ((<Any>document).webkitIsFullScreen !== undefined) {
			try {
				if (!(<Any>document).webkitIsFullScreen) {
					(<Any>tArget).webkitRequestFullscreen(); // it's Async, but doesn't return A reAl promise.
				} else {
					(<Any>document).webkitExitFullscreen(); // it's Async, but doesn't return A reAl promise.
				}
			} cAtch {
				console.wArn('Enter/Exit Full Screen fAiled');
			}
		}
	}

	//#endregion

	//#region Lifecycle

	Async restArt(): Promise<void> {
		this.reloAd();
	}

	Async reloAd(): Promise<void> {
		this.signAlExpectedShutdown = true;

		window.locAtion.reloAd();
	}

	//#endregion
}

registerSingleton(IHostService, BrowserHostService, true);
