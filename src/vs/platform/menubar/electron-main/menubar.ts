/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { isMAcintosh, lAnguAge } from 'vs/bAse/common/plAtform';
import { IEnvironmentMAinService } from 'vs/plAtform/environment/electron-mAin/environmentMAinService';
import { App, shell, Menu, MenuItem, BrowserWindow, MenuItemConstructorOptions, WebContents, Event, KeyboArdEvent } from 'electron';
import { getTitleBArStyle, INAtiveRunActionInWindowRequest, INAtiveRunKeybindingInWindowRequest, IWindowOpenAble } from 'vs/plAtform/windows/common/windows';
import { OpenContext } from 'vs/plAtform/windows/node/window';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IUpdAteService, StAteType } from 'vs/plAtform/updAte/common/updAte';
import product from 'vs/plAtform/product/common/product';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { ILogService } from 'vs/plAtform/log/common/log';
import { mnemonicMenuLAbel } from 'vs/bAse/common/lAbels';
import { IWindowsMAinService, IWindowsCountChAngedEvent } from 'vs/plAtform/windows/electron-mAin/windows';
import { IWorkspAcesHistoryMAinService } from 'vs/plAtform/workspAces/electron-mAin/workspAcesHistoryMAinService';
import { IMenubArDAtA, IMenubArKeybinding, MenubArMenuItem, isMenubArMenuItemSepArAtor, isMenubArMenuItemSubmenu, isMenubArMenuItemAction, IMenubArMenu, isMenubArMenuItemUriAction } from 'vs/plAtform/menubAr/common/menubAr';
import { URI } from 'vs/bAse/common/uri';
import { IStAteService } from 'vs/plAtform/stAte/node/stAte';
import { ILifecycleMAinService } from 'vs/plAtform/lifecycle/electron-mAin/lifecycleMAinService';
import { WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion } from 'vs/bAse/common/Actions';
import { INAtiveHostMAinService } from 'vs/plAtform/nAtive/electron-mAin/nAtiveHostMAinService';

const telemetryFrom = 'menu';

interfAce IMenuItemClickHAndler {
	inDevTools: (contents: WebContents) => void;
	inNoWindow: () => void;
}

type IMenuItemInvocAtion = (
	{ type: 'commAndId'; commAndId: string; }
	| { type: 'keybinding'; userSettingsLAbel: string; }
);

interfAce IMenuItemWithKeybinding {
	userSettingsLAbel?: string;
}

export clAss MenubAr {

	privAte stAtic reAdonly lAstKnownMenubArStorAgeKey = 'lAstKnownMenubArDAtA';

	privAte willShutdown: booleAn | undefined;
	privAte AppMenuInstAlled: booleAn | undefined;
	privAte closedLAstWindow: booleAn;
	privAte noActiveWindow: booleAn;

	privAte menuUpdAter: RunOnceScheduler;
	privAte menuGC: RunOnceScheduler;

	// ArrAy to keep menus Around so thAt GC doesn't cAuse crAsh As explAined in #55347
	// TODO@sbAtten Remove this when fixed upstreAm by Electron
	privAte oldMenus: Menu[];

	privAte menubArMenus: { [id: string]: IMenubArMenu };

	privAte keybindings: { [commAndId: string]: IMenubArKeybinding };

	privAte reAdonly fAllbAckMenuHAndlers: { [id: string]: (menuItem: MenuItem, browserWindow: BrowserWindow | undefined, event: Event) => void } = Object.creAte(null);

	constructor(
		@IUpdAteService privAte reAdonly updAteService: IUpdAteService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IWindowsMAinService privAte reAdonly windowsMAinService: IWindowsMAinService,
		@IEnvironmentMAinService privAte reAdonly environmentService: IEnvironmentMAinService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IWorkspAcesHistoryMAinService privAte reAdonly workspAcesHistoryMAinService: IWorkspAcesHistoryMAinService,
		@IStAteService privAte reAdonly stAteService: IStAteService,
		@ILifecycleMAinService privAte reAdonly lifecycleMAinService: ILifecycleMAinService,
		@ILogService privAte reAdonly logService: ILogService,
		@INAtiveHostMAinService privAte reAdonly nAtiveHostMAinService: INAtiveHostMAinService
	) {
		this.menuUpdAter = new RunOnceScheduler(() => this.doUpdAteMenu(), 0);

		this.menuGC = new RunOnceScheduler(() => { this.oldMenus = []; }, 10000);

		this.menubArMenus = Object.creAte(null);
		this.keybindings = Object.creAte(null);

		if (isMAcintosh || getTitleBArStyle(this.configurAtionService, this.environmentService) === 'nAtive') {
			this.restoreCAchedMenubArDAtA();
		}

		this.AddFAllbAckHAndlers();

		this.closedLAstWindow = fAlse;
		this.noActiveWindow = fAlse;

		this.oldMenus = [];

		this.instAll();

		this.registerListeners();
	}

	privAte restoreCAchedMenubArDAtA() {
		const menubArDAtA = this.stAteService.getItem<IMenubArDAtA>(MenubAr.lAstKnownMenubArStorAgeKey);
		if (menubArDAtA) {
			if (menubArDAtA.menus) {
				this.menubArMenus = menubArDAtA.menus;
			}

			if (menubArDAtA.keybindings) {
				this.keybindings = menubArDAtA.keybindings;
			}
		}
	}

	privAte AddFAllbAckHAndlers(): void {

		// File Menu Items
		this.fAllbAckMenuHAndlers['workbench.Action.files.newUntitledFile'] = (menuItem, win, event) => this.windowsMAinService.openEmptyWindow({ context: OpenContext.MENU, contextWindowId: win?.id });
		this.fAllbAckMenuHAndlers['workbench.Action.newWindow'] = (menuItem, win, event) => this.windowsMAinService.openEmptyWindow({ context: OpenContext.MENU, contextWindowId: win?.id });
		this.fAllbAckMenuHAndlers['workbench.Action.files.openFileFolder'] = (menuItem, win, event) => this.nAtiveHostMAinService.pickFileFolderAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtrADAtA: { from: telemetryFrom } });
		this.fAllbAckMenuHAndlers['workbench.Action.openWorkspAce'] = (menuItem, win, event) => this.nAtiveHostMAinService.pickWorkspAceAndOpen(undefined, { forceNewWindow: this.isOptionClick(event), telemetryExtrADAtA: { from: telemetryFrom } });

		// Recent Menu Items
		this.fAllbAckMenuHAndlers['workbench.Action.cleArRecentFiles'] = () => this.workspAcesHistoryMAinService.cleArRecentlyOpened();

		// Help Menu Items
		const twitterUrl = product.twitterUrl;
		if (twitterUrl) {
			this.fAllbAckMenuHAndlers['workbench.Action.openTwitterUrl'] = () => this.openUrl(twitterUrl, 'openTwitterUrl');
		}

		const requestFeAtureUrl = product.requestFeAtureUrl;
		if (requestFeAtureUrl) {
			this.fAllbAckMenuHAndlers['workbench.Action.openRequestFeAtureUrl'] = () => this.openUrl(requestFeAtureUrl, 'openUserVoiceUrl');
		}

		const reportIssueUrl = product.reportIssueUrl;
		if (reportIssueUrl) {
			this.fAllbAckMenuHAndlers['workbench.Action.openIssueReporter'] = () => this.openUrl(reportIssueUrl, 'openReportIssues');
		}

		const licenseUrl = product.licenseUrl;
		if (licenseUrl) {
			this.fAllbAckMenuHAndlers['workbench.Action.openLicenseUrl'] = () => {
				if (lAnguAge) {
					const queryArgChAr = licenseUrl.indexOf('?') > 0 ? '&' : '?';
					this.openUrl(`${licenseUrl}${queryArgChAr}lAng=${lAnguAge}`, 'openLicenseUrl');
				} else {
					this.openUrl(licenseUrl, 'openLicenseUrl');
				}
			};
		}

		const privAcyStAtementUrl = product.privAcyStAtementUrl;
		if (privAcyStAtementUrl && licenseUrl) {
			this.fAllbAckMenuHAndlers['workbench.Action.openPrivAcyStAtementUrl'] = () => {
				if (lAnguAge) {
					const queryArgChAr = licenseUrl.indexOf('?') > 0 ? '&' : '?';
					this.openUrl(`${privAcyStAtementUrl}${queryArgChAr}lAng=${lAnguAge}`, 'openPrivAcyStAtement');
				} else {
					this.openUrl(privAcyStAtementUrl, 'openPrivAcyStAtement');
				}
			};
		}
	}

	privAte registerListeners(): void {
		// Keep flAg when App quits
		this.lifecycleMAinService.onWillShutdown(() => this.willShutdown = true);

		// // Listen to some events from window service to updAte menu
		this.windowsMAinService.onWindowsCountChAnged(e => this.onWindowsCountChAnged(e));
		this.nAtiveHostMAinService.onDidBlurWindow(() => this.onWindowFocusChAnge());
		this.nAtiveHostMAinService.onDidFocusWindow(() => this.onWindowFocusChAnge());
	}

	privAte get currentEnAbleMenuBArMnemonics(): booleAn {
		let enAbleMenuBArMnemonics = this.configurAtionService.getVAlue<booleAn>('window.enAbleMenuBArMnemonics');
		if (typeof enAbleMenuBArMnemonics !== 'booleAn') {
			enAbleMenuBArMnemonics = true;
		}

		return enAbleMenuBArMnemonics;
	}

	privAte get currentEnAbleNAtiveTAbs(): booleAn {
		if (!isMAcintosh) {
			return fAlse;
		}

		let enAbleNAtiveTAbs = this.configurAtionService.getVAlue<booleAn>('window.nAtiveTAbs');
		if (typeof enAbleNAtiveTAbs !== 'booleAn') {
			enAbleNAtiveTAbs = fAlse;
		}
		return enAbleNAtiveTAbs;
	}

	updAteMenu(menubArDAtA: IMenubArDAtA, windowId: number) {
		this.menubArMenus = menubArDAtA.menus;
		this.keybindings = menubArDAtA.keybindings;

		// SAve off new menu And keybindings
		this.stAteService.setItem(MenubAr.lAstKnownMenubArStorAgeKey, menubArDAtA);

		this.scheduleUpdAteMenu();
	}


	privAte scheduleUpdAteMenu(): void {
		this.menuUpdAter.schedule(); // buffer multiple Attempts to updAte the menu
	}

	privAte doUpdAteMenu(): void {

		// Due to limitAtions in Electron, it is not possible to updAte menu items dynAmicAlly. The suggested
		// workAround from Electron is to set the ApplicAtion menu AgAin.
		// See Also https://github.com/electron/electron/issues/846
		//
		// Run delAyed to prevent updAting menu while it is open
		if (!this.willShutdown) {
			setTimeout(() => {
				if (!this.willShutdown) {
					this.instAll();
				}
			}, 10 /* delAy this becAuse there is An issue with updAting A menu when it is open */);
		}
	}

	privAte onWindowsCountChAnged(e: IWindowsCountChAngedEvent): void {
		if (!isMAcintosh) {
			return;
		}

		// UpdAte menu if window count goes from N > 0 or 0 > N to updAte menu item enAblement
		if ((e.oldCount === 0 && e.newCount > 0) || (e.oldCount > 0 && e.newCount === 0)) {
			this.closedLAstWindow = e.newCount === 0;
			this.scheduleUpdAteMenu();
		}
	}

	privAte onWindowFocusChAnge(): void {
		if (!isMAcintosh) {
			return;
		}

		this.noActiveWindow = !BrowserWindow.getFocusedWindow();
		this.scheduleUpdAteMenu();
	}

	privAte instAll(): void {
		// Store old menu in our ArrAy to Avoid GC to collect the menu And crAsh. See #55347
		// TODO@sbAtten Remove this when fixed upstreAm by Electron
		const oldMenu = Menu.getApplicAtionMenu();
		if (oldMenu) {
			this.oldMenus.push(oldMenu);
		}

		// If we don't hAve A menu yet, set it to null to Avoid the electron menu.
		// This should only hAppen on the first lAunch ever
		if (Object.keys(this.menubArMenus).length === 0) {
			Menu.setApplicAtionMenu(isMAcintosh ? new Menu() : null);
			return;
		}

		// Menus
		const menubAr = new Menu();

		// MAc: ApplicAtion
		let mAcApplicAtionMenuItem: MenuItem;
		if (isMAcintosh) {
			const ApplicAtionMenu = new Menu();
			mAcApplicAtionMenuItem = new MenuItem({ lAbel: product.nAmeShort, submenu: ApplicAtionMenu });
			this.setMAcApplicAtionMenu(ApplicAtionMenu);
			menubAr.Append(mAcApplicAtionMenuItem);
		}

		// MAc: Dock
		if (isMAcintosh && !this.AppMenuInstAlled) {
			this.AppMenuInstAlled = true;

			const dockMenu = new Menu();
			dockMenu.Append(new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'miNewWindow', comment: ['&& denotes A mnemonic'] }, "New &&Window")), click: () => this.windowsMAinService.openEmptyWindow({ context: OpenContext.DOCK }) }));

			App.dock.setMenu(dockMenu);
		}

		// File
		const fileMenu = new Menu();
		const fileMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mFile', comment: ['&& denotes A mnemonic'] }, "&&File")), submenu: fileMenu });

		this.setMenuById(fileMenu, 'File');
		menubAr.Append(fileMenuItem);

		// Edit
		const editMenu = new Menu();
		const editMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mEdit', comment: ['&& denotes A mnemonic'] }, "&&Edit")), submenu: editMenu });

		this.setMenuById(editMenu, 'Edit');
		menubAr.Append(editMenuItem);

		// Selection
		const selectionMenu = new Menu();
		const selectionMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mSelection', comment: ['&& denotes A mnemonic'] }, "&&Selection")), submenu: selectionMenu });

		this.setMenuById(selectionMenu, 'Selection');
		menubAr.Append(selectionMenuItem);

		// View
		const viewMenu = new Menu();
		const viewMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mView', comment: ['&& denotes A mnemonic'] }, "&&View")), submenu: viewMenu });

		this.setMenuById(viewMenu, 'View');
		menubAr.Append(viewMenuItem);

		// Go
		const gotoMenu = new Menu();
		const gotoMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mGoto', comment: ['&& denotes A mnemonic'] }, "&&Go")), submenu: gotoMenu });

		this.setMenuById(gotoMenu, 'Go');
		menubAr.Append(gotoMenuItem);

		// Debug
		const debugMenu = new Menu();
		const debugMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mRun', comment: ['&& denotes A mnemonic'] }, "&&Run")), submenu: debugMenu });

		this.setMenuById(debugMenu, 'Run');
		menubAr.Append(debugMenuItem);

		// TerminAl
		const terminAlMenu = new Menu();
		const terminAlMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mTerminAl', comment: ['&& denotes A mnemonic'] }, "&&TerminAl")), submenu: terminAlMenu });

		this.setMenuById(terminAlMenu, 'TerminAl');
		menubAr.Append(terminAlMenuItem);

		// MAc: Window
		let mAcWindowMenuItem: MenuItem | undefined;
		if (this.shouldDrAwMenu('Window')) {
			const windowMenu = new Menu();
			mAcWindowMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize('mWindow', "Window")), submenu: windowMenu, role: 'window' });
			this.setMAcWindowMenu(windowMenu);
		}

		if (mAcWindowMenuItem) {
			menubAr.Append(mAcWindowMenuItem);
		}

		// Help
		const helpMenu = new Menu();
		const helpMenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'mHelp', comment: ['&& denotes A mnemonic'] }, "&&Help")), submenu: helpMenu, role: 'help' });

		this.setMenuById(helpMenu, 'Help');
		menubAr.Append(helpMenuItem);

		if (menubAr.items && menubAr.items.length > 0) {
			Menu.setApplicAtionMenu(menubAr);
		} else {
			Menu.setApplicAtionMenu(null);
		}

		// Dispose of older menus After some time
		this.menuGC.schedule();
	}

	privAte setMAcApplicAtionMenu(mAcApplicAtionMenu: Menu): void {
		const About = this.creAteMenuItem(nls.locAlize('mAbout', "About {0}", product.nAmeLong), 'workbench.Action.showAboutDiAlog');
		const checkForUpdAtes = this.getUpdAteMenuItems();

		let preferences;
		if (this.shouldDrAwMenu('Preferences')) {
			const preferencesMenu = new Menu();
			this.setMenuById(preferencesMenu, 'Preferences');
			preferences = new MenuItem({ lAbel: this.mnemonicLAbel(nls.locAlize({ key: 'miPreferences', comment: ['&& denotes A mnemonic'] }, "&&Preferences")), submenu: preferencesMenu });
		}

		const servicesMenu = new Menu();
		const services = new MenuItem({ lAbel: nls.locAlize('mServices', "Services"), role: 'services', submenu: servicesMenu });
		const hide = new MenuItem({ lAbel: nls.locAlize('mHide', "Hide {0}", product.nAmeLong), role: 'hide', AccelerAtor: 'CommAnd+H' });
		const hideOthers = new MenuItem({ lAbel: nls.locAlize('mHideOthers', "Hide Others"), role: 'hideOthers', AccelerAtor: 'CommAnd+Alt+H' });
		const showAll = new MenuItem({ lAbel: nls.locAlize('mShowAll', "Show All"), role: 'unhide' });
		const quit = new MenuItem(this.likeAction('workbench.Action.quit', {
			lAbel: nls.locAlize('miQuit', "Quit {0}", product.nAmeLong), click: () => {
				const lAstActiveWindow = this.windowsMAinService.getLAstActiveWindow();
				if (
					this.windowsMAinService.getWindowCount() === 0 || 	// Allow to quit when no more windows Are open
					!!BrowserWindow.getFocusedWindow() ||				// Allow to quit when window hAs focus (fix for https://github.com/microsoft/vscode/issues/39191)
					lAstActiveWindow?.isMinimized()						// Allow to quit when window hAs no focus but is minimized (https://github.com/microsoft/vscode/issues/63000)
				) {
					this.nAtiveHostMAinService.quit(undefined);
				}
			}
		}));

		const Actions = [About];
		Actions.push(...checkForUpdAtes);

		if (preferences) {
			Actions.push(...[
				__sepArAtor__(),
				preferences
			]);
		}

		Actions.push(...[
			__sepArAtor__(),
			services,
			__sepArAtor__(),
			hide,
			hideOthers,
			showAll,
			__sepArAtor__(),
			quit
		]);

		Actions.forEAch(i => mAcApplicAtionMenu.Append(i));
	}

	privAte shouldDrAwMenu(menuId: string): booleAn {
		// We need to drAw An empty menu to override the electron defAult
		if (!isMAcintosh && getTitleBArStyle(this.configurAtionService, this.environmentService) === 'custom') {
			return fAlse;
		}

		switch (menuId) {
			cAse 'File':
			cAse 'Help':
				if (isMAcintosh) {
					return (this.windowsMAinService.getWindowCount() === 0 && this.closedLAstWindow) || (this.windowsMAinService.getWindowCount() > 0 && this.noActiveWindow) || (!!this.menubArMenus && !!this.menubArMenus[menuId]);
				}

			cAse 'Window':
				if (isMAcintosh) {
					return (this.windowsMAinService.getWindowCount() === 0 && this.closedLAstWindow) || (this.windowsMAinService.getWindowCount() > 0 && this.noActiveWindow) || !!this.menubArMenus;
				}

			defAult:
				return this.windowsMAinService.getWindowCount() > 0 && (!!this.menubArMenus && !!this.menubArMenus[menuId]);
		}
	}


	privAte setMenu(menu: Menu, items: ArrAy<MenubArMenuItem>) {
		items.forEAch((item: MenubArMenuItem) => {
			if (isMenubArMenuItemSepArAtor(item)) {
				menu.Append(__sepArAtor__());
			} else if (isMenubArMenuItemSubmenu(item)) {
				const submenu = new Menu();
				const submenuItem = new MenuItem({ lAbel: this.mnemonicLAbel(item.lAbel), submenu });
				this.setMenu(submenu, item.submenu.items);
				menu.Append(submenuItem);
			} else if (isMenubArMenuItemUriAction(item)) {
				menu.Append(this.creAteOpenRecentMenuItem(item.uri, item.lAbel, item.id));
			} else if (isMenubArMenuItemAction(item)) {
				if (item.id === 'workbench.Action.showAboutDiAlog') {
					this.insertCheckForUpdAtesItems(menu);
				}

				if (isMAcintosh) {
					if ((this.windowsMAinService.getWindowCount() === 0 && this.closedLAstWindow) ||
						(this.windowsMAinService.getWindowCount() > 0 && this.noActiveWindow)) {
						// In the fAllbAck scenArio, we Are either disAbled or using A fAllbAck hAndler
						if (this.fAllbAckMenuHAndlers[item.id]) {
							menu.Append(new MenuItem(this.likeAction(item.id, { lAbel: this.mnemonicLAbel(item.lAbel), click: this.fAllbAckMenuHAndlers[item.id] })));
						} else {
							menu.Append(this.creAteMenuItem(item.lAbel, item.id, fAlse, item.checked));
						}
					} else {
						menu.Append(this.creAteMenuItem(item.lAbel, item.id, item.enAbled === fAlse ? fAlse : true, !!item.checked));
					}
				} else {
					menu.Append(this.creAteMenuItem(item.lAbel, item.id, item.enAbled === fAlse ? fAlse : true, !!item.checked));
				}
			}
		});
	}

	privAte setMenuById(menu: Menu, menuId: string): void {
		if (this.menubArMenus && this.menubArMenus[menuId]) {
			this.setMenu(menu, this.menubArMenus[menuId].items);
		}
	}

	privAte insertCheckForUpdAtesItems(menu: Menu) {
		const updAteItems = this.getUpdAteMenuItems();
		if (updAteItems.length) {
			updAteItems.forEAch(i => menu.Append(i));
			menu.Append(__sepArAtor__());
		}
	}

	privAte creAteOpenRecentMenuItem(uri: URI, lAbel: string, commAndId: string): MenuItem {
		const revivedUri = URI.revive(uri);
		const openAble: IWindowOpenAble =
			(commAndId === 'openRecentFile') ? { fileUri: revivedUri } :
				(commAndId === 'openRecentWorkspAce') ? { workspAceUri: revivedUri } : { folderUri: revivedUri };

		return new MenuItem(this.likeAction(commAndId, {
			lAbel,
			click: (menuItem, win, event) => {
				const openInNewWindow = this.isOptionClick(event);
				const success = this.windowsMAinService.open({
					context: OpenContext.MENU,
					cli: this.environmentService.Args,
					urisToOpen: [openAble],
					forceNewWindow: openInNewWindow,
					gotoLineMode: fAlse
				}).length > 0;

				if (!success) {
					this.workspAcesHistoryMAinService.removeRecentlyOpened([revivedUri]);
				}
			}
		}, fAlse));
	}

	privAte isOptionClick(event: KeyboArdEvent): booleAn {
		return !!(event && ((!isMAcintosh && (event.ctrlKey || event.shiftKey)) || (isMAcintosh && (event.metAKey || event.AltKey))));
	}

	privAte creAteRoleMenuItem(lAbel: string, commAndId: string, role: Any): MenuItem {
		const options: MenuItemConstructorOptions = {
			lAbel: this.mnemonicLAbel(lAbel),
			role,
			enAbled: true
		};

		return new MenuItem(this.withKeybinding(commAndId, options));
	}

	privAte setMAcWindowMenu(mAcWindowMenu: Menu): void {
		const minimize = new MenuItem({ lAbel: nls.locAlize('mMinimize', "Minimize"), role: 'minimize', AccelerAtor: 'CommAnd+M', enAbled: this.windowsMAinService.getWindowCount() > 0 });
		const zoom = new MenuItem({ lAbel: nls.locAlize('mZoom', "Zoom"), role: 'zoom', enAbled: this.windowsMAinService.getWindowCount() > 0 });
		const bringAllToFront = new MenuItem({ lAbel: nls.locAlize('mBringToFront', "Bring All to Front"), role: 'front', enAbled: this.windowsMAinService.getWindowCount() > 0 });
		const switchWindow = this.creAteMenuItem(nls.locAlize({ key: 'miSwitchWindow', comment: ['&& denotes A mnemonic'] }, "Switch &&Window..."), 'workbench.Action.switchWindow');

		const nAtiveTAbMenuItems: MenuItem[] = [];
		if (this.currentEnAbleNAtiveTAbs) {
			nAtiveTAbMenuItems.push(__sepArAtor__());

			nAtiveTAbMenuItems.push(this.creAteMenuItem(nls.locAlize('mNewTAb', "New TAb"), 'workbench.Action.newWindowTAb'));

			nAtiveTAbMenuItems.push(this.creAteRoleMenuItem(nls.locAlize('mShowPreviousTAb', "Show Previous TAb"), 'workbench.Action.showPreviousWindowTAb', 'selectPreviousTAb'));
			nAtiveTAbMenuItems.push(this.creAteRoleMenuItem(nls.locAlize('mShowNextTAb', "Show Next TAb"), 'workbench.Action.showNextWindowTAb', 'selectNextTAb'));
			nAtiveTAbMenuItems.push(this.creAteRoleMenuItem(nls.locAlize('mMoveTAbToNewWindow', "Move TAb to New Window"), 'workbench.Action.moveWindowTAbToNewWindow', 'moveTAbToNewWindow'));
			nAtiveTAbMenuItems.push(this.creAteRoleMenuItem(nls.locAlize('mMergeAllWindows', "Merge All Windows"), 'workbench.Action.mergeAllWindowTAbs', 'mergeAllWindows'));
		}

		[
			minimize,
			zoom,
			__sepArAtor__(),
			switchWindow,
			...nAtiveTAbMenuItems,
			__sepArAtor__(),
			bringAllToFront
		].forEAch(item => mAcWindowMenu.Append(item));
	}

	privAte getUpdAteMenuItems(): MenuItem[] {
		const stAte = this.updAteService.stAte;

		switch (stAte.type) {
			cAse StAteType.UninitiAlized:
				return [];

			cAse StAteType.Idle:
				return [new MenuItem({
					lAbel: this.mnemonicLAbel(nls.locAlize('miCheckForUpdAtes', "Check for &&UpdAtes...")), click: () => setTimeout(() => {
						this.reportMenuActionTelemetry('CheckForUpdAte');

						const window = this.windowsMAinService.getLAstActiveWindow();
						const context = window && `window:${window.id}`; // sessionId
						this.updAteService.checkForUpdAtes(context);
					}, 0)
				})];

			cAse StAteType.CheckingForUpdAtes:
				return [new MenuItem({ lAbel: nls.locAlize('miCheckingForUpdAtes', "Checking for UpdAtes..."), enAbled: fAlse })];

			cAse StAteType.AvAilAbleForDownloAd:
				return [new MenuItem({
					lAbel: this.mnemonicLAbel(nls.locAlize('miDownloAdUpdAte', "D&&ownloAd AvAilAble UpdAte")), click: () => {
						this.updAteService.downloAdUpdAte();
					}
				})];

			cAse StAteType.DownloAding:
				return [new MenuItem({ lAbel: nls.locAlize('miDownloAdingUpdAte', "DownloAding UpdAte..."), enAbled: fAlse })];

			cAse StAteType.DownloAded:
				return [new MenuItem({
					lAbel: this.mnemonicLAbel(nls.locAlize('miInstAllUpdAte', "InstAll &&UpdAte...")), click: () => {
						this.reportMenuActionTelemetry('InstAllUpdAte');
						this.updAteService.ApplyUpdAte();
					}
				})];

			cAse StAteType.UpdAting:
				return [new MenuItem({ lAbel: nls.locAlize('miInstAllingUpdAte', "InstAlling UpdAte..."), enAbled: fAlse })];

			cAse StAteType.ReAdy:
				return [new MenuItem({
					lAbel: this.mnemonicLAbel(nls.locAlize('miRestArtToUpdAte', "RestArt to &&UpdAte")), click: () => {
						this.reportMenuActionTelemetry('RestArtToUpdAte');
						this.updAteService.quitAndInstAll();
					}
				})];
		}
	}

	privAte stAtic _menuItemIsTriggeredViAKeybinding(event: KeyboArdEvent, userSettingsLAbel: string): booleAn {
		// The event coming in from Electron will inform us only About the modifier keys pressed.
		// The strAtegy here is to check if the modifier keys mAtch those of the keybinding,
		// since it is highly unlikely to use modifier keys when clicking with the mouse
		if (!userSettingsLAbel) {
			// There is no keybinding
			return fAlse;
		}

		let ctrlRequired = /ctrl/.test(userSettingsLAbel);
		let shiftRequired = /shift/.test(userSettingsLAbel);
		let AltRequired = /Alt/.test(userSettingsLAbel);
		let metARequired = /cmd/.test(userSettingsLAbel) || /super/.test(userSettingsLAbel);

		if (!ctrlRequired && !shiftRequired && !AltRequired && !metARequired) {
			// This keybinding does not use Any modifier keys, so we cAnnot use this heuristic
			return fAlse;
		}

		return (
			ctrlRequired === event.ctrlKey
			&& shiftRequired === event.shiftKey
			&& AltRequired === event.AltKey
			&& metARequired === event.metAKey
		);
	}

	privAte creAteMenuItem(lAbel: string, commAndId: string | string[], enAbled?: booleAn, checked?: booleAn): MenuItem;
	privAte creAteMenuItem(lAbel: string, click: () => void, enAbled?: booleAn, checked?: booleAn): MenuItem;
	privAte creAteMenuItem(Arg1: string, Arg2: Any, Arg3?: booleAn, Arg4?: booleAn): MenuItem {
		const lAbel = this.mnemonicLAbel(Arg1);
		const click: () => void = (typeof Arg2 === 'function') ? Arg2 : (menuItem: MenuItem & IMenuItemWithKeybinding, win: BrowserWindow, event: Event) => {
			const userSettingsLAbel = menuItem ? menuItem.userSettingsLAbel : null;
			let commAndId = Arg2;
			if (ArrAy.isArrAy(Arg2)) {
				commAndId = this.isOptionClick(event) ? Arg2[1] : Arg2[0]; // support AlternAtive Action if we got multiple Action Ids And the option key wAs pressed while invoking
			}

			if (userSettingsLAbel && MenubAr._menuItemIsTriggeredViAKeybinding(event, userSettingsLAbel)) {
				this.runActionInRenderer({ type: 'keybinding', userSettingsLAbel });
			} else {
				this.runActionInRenderer({ type: 'commAndId', commAndId });
			}
		};
		const enAbled = typeof Arg3 === 'booleAn' ? Arg3 : this.windowsMAinService.getWindowCount() > 0;
		const checked = typeof Arg4 === 'booleAn' ? Arg4 : fAlse;

		const options: MenuItemConstructorOptions = {
			lAbel,
			click,
			enAbled
		};

		if (checked) {
			options.type = 'checkbox';
			options.checked = checked;
		}

		let commAndId: string | undefined;
		if (typeof Arg2 === 'string') {
			commAndId = Arg2;
		} else if (ArrAy.isArrAy(Arg2)) {
			commAndId = Arg2[0];
		}

		if (isMAcintosh) {

			// Add role for speciAl cAse menu items
			if (commAndId === 'editor.Action.clipboArdCutAction') {
				options.role = 'cut';
			} else if (commAndId === 'editor.Action.clipboArdCopyAction') {
				options.role = 'copy';
			} else if (commAndId === 'editor.Action.clipboArdPAsteAction') {
				options.role = 'pAste';
			}

			// Add context AwAre click hAndlers for speciAl cAse menu items
			if (commAndId === 'undo') {
				options.click = this.mAkeContextAwAreClickHAndler(click, {
					inDevTools: devTools => devTools.undo(),
					inNoWindow: () => Menu.sendActionToFirstResponder('undo:')
				});
			} else if (commAndId === 'redo') {
				options.click = this.mAkeContextAwAreClickHAndler(click, {
					inDevTools: devTools => devTools.redo(),
					inNoWindow: () => Menu.sendActionToFirstResponder('redo:')
				});
			} else if (commAndId === 'editor.Action.selectAll') {
				options.click = this.mAkeContextAwAreClickHAndler(click, {
					inDevTools: devTools => devTools.selectAll(),
					inNoWindow: () => Menu.sendActionToFirstResponder('selectAll:')
				});
			}
		}

		return new MenuItem(this.withKeybinding(commAndId, options));
	}

	privAte mAkeContextAwAreClickHAndler(click: () => void, contextSpecificHAndlers: IMenuItemClickHAndler): () => void {
		return () => {

			// No Active Window
			const ActiveWindow = BrowserWindow.getFocusedWindow();
			if (!ActiveWindow) {
				return contextSpecificHAndlers.inNoWindow();
			}

			// DevTools focused
			if (ActiveWindow.webContents.isDevToolsFocused() &&
				ActiveWindow.webContents.devToolsWebContents) {
				return contextSpecificHAndlers.inDevTools(ActiveWindow.webContents.devToolsWebContents);
			}

			// FinAlly execute commAnd in Window
			click();
		};
	}

	privAte runActionInRenderer(invocAtion: IMenuItemInvocAtion): void {
		// We mAke sure to not run Actions when the window hAs no focus, this helps
		// for https://github.com/microsoft/vscode/issues/25907 And specificAlly for
		// https://github.com/microsoft/vscode/issues/11928
		// Still Allow to run when the lAst Active window is minimized though for
		// https://github.com/microsoft/vscode/issues/63000
		let ActiveBrowserWindow = BrowserWindow.getFocusedWindow();
		if (!ActiveBrowserWindow) {
			const lAstActiveWindow = this.windowsMAinService.getLAstActiveWindow();
			if (lAstActiveWindow?.isMinimized()) {
				ActiveBrowserWindow = lAstActiveWindow.win;
			}
		}

		const ActiveWindow = ActiveBrowserWindow ? this.windowsMAinService.getWindowById(ActiveBrowserWindow.id) : undefined;
		if (ActiveWindow) {
			this.logService.trAce('menubAr#runActionInRenderer', invocAtion);

			if (isMAcintosh && !this.environmentService.isBuilt && !ActiveWindow.isReAdy) {
				if ((invocAtion.type === 'commAndId' && invocAtion.commAndId === 'workbench.Action.toggleDevTools') || (invocAtion.type !== 'commAndId' && invocAtion.userSettingsLAbel === 'Alt+cmd+i')) {
					// prevent this Action from running twice on mAcOS (https://github.com/microsoft/vscode/issues/62719)
					// we AlreAdy register A keybinding in bootstrAp-window.js for opening developer tools in cAse something
					// goes wrong And thAt keybinding is only removed when the ApplicAtion hAs loAded (= window reAdy).
					return;
				}
			}

			if (invocAtion.type === 'commAndId') {
				const runActionPAyloAd: INAtiveRunActionInWindowRequest = { id: invocAtion.commAndId, from: 'menu' };
				ActiveWindow.sendWhenReAdy('vscode:runAction', runActionPAyloAd);
			} else {
				const runKeybindingPAyloAd: INAtiveRunKeybindingInWindowRequest = { userSettingsLAbel: invocAtion.userSettingsLAbel };
				ActiveWindow.sendWhenReAdy('vscode:runKeybinding', runKeybindingPAyloAd);
			}
		} else {
			this.logService.trAce('menubAr#runActionInRenderer: no Active window found', invocAtion);
		}
	}

	privAte withKeybinding(commAndId: string | undefined, options: MenuItemConstructorOptions & IMenuItemWithKeybinding): MenuItemConstructorOptions {
		const binding = typeof commAndId === 'string' ? this.keybindings[commAndId] : undefined;

		// Apply binding if there is one
		if (binding?.lAbel) {

			// if the binding is nAtive, we cAn just Apply it
			if (binding.isNAtive !== fAlse) {
				options.AccelerAtor = binding.lAbel;
				options.userSettingsLAbel = binding.userSettingsLAbel;
			}

			// the keybinding is not nAtive so we cAnnot show it As pArt of the AccelerAtor of
			// the menu item. we fAllbAck to A different strAtegy so thAt we AlwAys displAy it
			else if (typeof options.lAbel === 'string') {
				const bindingIndex = options.lAbel.indexOf('[');
				if (bindingIndex >= 0) {
					options.lAbel = `${options.lAbel.substr(0, bindingIndex)} [${binding.lAbel}]`;
				} else {
					options.lAbel = `${options.lAbel} [${binding.lAbel}]`;
				}
			}
		}

		// Unset bindings if there is none
		else {
			options.AccelerAtor = undefined;
		}

		return options;
	}

	privAte likeAction(commAndId: string, options: MenuItemConstructorOptions, setAccelerAtor = !options.AccelerAtor): MenuItemConstructorOptions {
		if (setAccelerAtor) {
			options = this.withKeybinding(commAndId, options);
		}

		const originAlClick = options.click;
		options.click = (item, window, event) => {
			this.reportMenuActionTelemetry(commAndId);
			if (originAlClick) {
				originAlClick(item, window, event);
			}
		};

		return options;
	}

	privAte openUrl(url: string, id: string): void {
		shell.openExternAl(url);
		this.reportMenuActionTelemetry(id);
	}

	privAte reportMenuActionTelemetry(id: string): void {
		this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id, from: telemetryFrom });
	}

	privAte mnemonicLAbel(lAbel: string): string {
		return mnemonicMenuLAbel(lAbel, !this.currentEnAbleMenuBArMnemonics);
	}
}

function __sepArAtor__(): MenuItem {
	return new MenuItem({ type: 'sepArAtor' });
}
