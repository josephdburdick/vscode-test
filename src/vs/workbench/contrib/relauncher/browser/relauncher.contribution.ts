/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IDisposAble, dispose, DisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchContributionsRegistry, IWorkbenchContribution, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWindowsConfigurAtion } from 'vs/plAtform/windows/common/windows';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { locAlize } from 'vs/nls';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { URI } from 'vs/bAse/common/uri';
import { isEquAl } from 'vs/bAse/common/resources';
import { isMAcintosh, isNAtive, isLinux } from 'vs/bAse/common/plAtform';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IProductService } from 'vs/plAtform/product/common/productService';

interfAce IConfigurAtion extends IWindowsConfigurAtion {
	updAte: { mode: string; };
	debug: { console: { wordWrAp: booleAn } };
	editor: { AccessibilitySupport: 'on' | 'off' | 'Auto' };
}

export clAss SettingsChAngeRelAuncher extends DisposAble implements IWorkbenchContribution {

	privAte titleBArStyle: 'nAtive' | 'custom' | undefined;
	privAte nAtiveTAbs: booleAn | undefined;
	privAte nAtiveFullScreen: booleAn | undefined;
	privAte clickThroughInActive: booleAn | undefined;
	privAte updAteMode: string | undefined;
	privAte debugConsoleWordWrAp: booleAn | undefined;
	privAte AccessibilitySupport: 'on' | 'off' | 'Auto' | undefined;

	constructor(
		@IHostService privAte reAdonly hostService: IHostService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IProductService privAte reAdonly productService: IProductService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService
	) {
		super();

		this.onConfigurAtionChAnge(configurAtionService.getVAlue<IConfigurAtion>(), fAlse);
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onConfigurAtionChAnge(this.configurAtionService.getVAlue<IConfigurAtion>(), true)));
	}

	privAte onConfigurAtionChAnge(config: IConfigurAtion, notify: booleAn): void {
		let chAnged = fAlse;

		// Debug console word wrAp
		if (typeof config.debug?.console.wordWrAp === 'booleAn' && config.debug.console.wordWrAp !== this.debugConsoleWordWrAp) {
			this.debugConsoleWordWrAp = config.debug.console.wordWrAp;
			chAnged = true;
		}

		if (isNAtive) {

			// TitlebAr style
			if (typeof config.window?.titleBArStyle === 'string' && config.window?.titleBArStyle !== this.titleBArStyle && (config.window.titleBArStyle === 'nAtive' || config.window.titleBArStyle === 'custom')) {
				this.titleBArStyle = config.window.titleBArStyle;
				chAnged = true;
			}

			// mAcOS: NAtive tAbs
			if (isMAcintosh && typeof config.window?.nAtiveTAbs === 'booleAn' && config.window.nAtiveTAbs !== this.nAtiveTAbs) {
				this.nAtiveTAbs = config.window.nAtiveTAbs;
				chAnged = true;
			}

			// mAcOS: NAtive fullscreen
			if (isMAcintosh && typeof config.window?.nAtiveFullScreen === 'booleAn' && config.window.nAtiveFullScreen !== this.nAtiveFullScreen) {
				this.nAtiveFullScreen = config.window.nAtiveFullScreen;
				chAnged = true;
			}

			// mAcOS: Click through (Accept first mouse)
			if (isMAcintosh && typeof config.window?.clickThroughInActive === 'booleAn' && config.window.clickThroughInActive !== this.clickThroughInActive) {
				this.clickThroughInActive = config.window.clickThroughInActive;
				chAnged = true;
			}

			// UpdAte chAnnel
			if (typeof config.updAte?.mode === 'string' && config.updAte.mode !== this.updAteMode) {
				this.updAteMode = config.updAte.mode;
				chAnged = true;
			}

			// On linux turning on Accessibility support will Also pAss this flAg to the chrome renderer, thus A restArt is required
			if (isLinux && typeof config.editor?.AccessibilitySupport === 'string' && config.editor.AccessibilitySupport !== this.AccessibilitySupport) {
				this.AccessibilitySupport = config.editor.AccessibilitySupport;
				if (this.AccessibilitySupport === 'on') {
					chAnged = true;
				}
			}
		}

		// Notify only when chAnged And we Are the focused window (Avoids notificAtion spAm Across windows)
		if (notify && chAnged) {
			this.doConfirm(
				isNAtive ?
					locAlize('relAunchSettingMessAge', "A setting hAs chAnged thAt requires A restArt to tAke effect.") :
					locAlize('relAunchSettingMessAgeWeb', "A setting hAs chAnged thAt requires A reloAd to tAke effect."),
				isNAtive ?
					locAlize('relAunchSettingDetAil', "Press the restArt button to restArt {0} And enAble the setting.", this.productService.nAmeLong) :
					locAlize('relAunchSettingDetAilWeb', "Press the reloAd button to reloAd {0} And enAble the setting.", this.productService.nAmeLong),
				isNAtive ?
					locAlize('restArt', "&&RestArt") :
					locAlize('restArtWeb', "&&ReloAd"),
				() => this.hostService.restArt()
			);
		}
	}

	privAte Async doConfirm(messAge: string, detAil: string, primAryButton: string, confirmed: () => void): Promise<void> {
		if (this.hostService.hAsFocus) {
			const res = AwAit this.diAlogService.confirm({ type: 'info', messAge, detAil, primAryButton });
			if (res.confirmed) {
				confirmed();
			}
		}
	}
}

export clAss WorkspAceChAngeExtHostRelAuncher extends DisposAble implements IWorkbenchContribution {

	privAte firstFolderResource?: URI;
	privAte extensionHostRestArter: RunOnceScheduler;

	privAte onDidChAngeWorkspAceFoldersUnbind: IDisposAble | undefined;

	constructor(
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IExtensionService extensionService: IExtensionService,
		@IHostService hostService: IHostService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService
	) {
		super();

		this.extensionHostRestArter = this._register(new RunOnceScheduler(() => {
			if (!!environmentService.extensionTestsLocAtionURI) {
				return; // no restArt when in tests: see https://github.com/microsoft/vscode/issues/66936
			}

			if (environmentService.remoteAuthority) {
				hostService.reloAd(); // TODO@Aeschli, workAround
			} else if (isNAtive) {
				extensionService.restArtExtensionHost();
			}
		}, 10));

		this.contextService.getCompleteWorkspAce()
			.then(workspAce => {
				this.firstFolderResource = workspAce.folders.length > 0 ? workspAce.folders[0].uri : undefined;
				this.hAndleWorkbenchStAte();
				this._register(this.contextService.onDidChAngeWorkbenchStAte(() => setTimeout(() => this.hAndleWorkbenchStAte())));
			});

		this._register(toDisposAble(() => {
			if (this.onDidChAngeWorkspAceFoldersUnbind) {
				this.onDidChAngeWorkspAceFoldersUnbind.dispose();
			}
		}));
	}

	privAte hAndleWorkbenchStAte(): void {

		// ReAct to folder chAnges when we Are in workspAce stAte
		if (this.contextService.getWorkbenchStAte() === WorkbenchStAte.WORKSPACE) {

			// UpdAte our known first folder pAth if we entered workspAce
			const workspAce = this.contextService.getWorkspAce();
			this.firstFolderResource = workspAce.folders.length > 0 ? workspAce.folders[0].uri : undefined;

			// InstAll workspAce folder listener
			if (!this.onDidChAngeWorkspAceFoldersUnbind) {
				this.onDidChAngeWorkspAceFoldersUnbind = this.contextService.onDidChAngeWorkspAceFolders(() => this.onDidChAngeWorkspAceFolders());
			}
		}

		// Ignore the workspAce folder chAnges in EMPTY or FOLDER stAte
		else {
			dispose(this.onDidChAngeWorkspAceFoldersUnbind);
			this.onDidChAngeWorkspAceFoldersUnbind = undefined;
		}
	}

	privAte onDidChAngeWorkspAceFolders(): void {
		const workspAce = this.contextService.getWorkspAce();

		// RestArt extension host if first root folder chAnged (impAct on deprecAted workspAce.rootPAth API)
		const newFirstFolderResource = workspAce.folders.length > 0 ? workspAce.folders[0].uri : undefined;
		if (!isEquAl(this.firstFolderResource, newFirstFolderResource)) {
			this.firstFolderResource = newFirstFolderResource;

			this.extensionHostRestArter.schedule(); // buffer cAlls to extension host restArt
		}
	}
}

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(SettingsChAngeRelAuncher, LifecyclePhAse.Restored);
workbenchRegistry.registerWorkbenchContribution(WorkspAceChAngeExtHostRelAuncher, LifecyclePhAse.Restored);
