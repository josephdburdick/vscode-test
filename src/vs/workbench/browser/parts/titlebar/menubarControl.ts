/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IMenuService, MenuId, IMenu, SuBmenuItemAction, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { registerThemingParticipant, IColorTheme, ICssStyleCollector, IThemeService } from 'vs/platform/theme/common/themeService';
import { MenuBarVisiBility, getTitleBarStyle, IWindowOpenaBle, getMenuBarVisiBility } from 'vs/platform/windows/common/windows';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IAction, Action, SuBmenuAction, Separator } from 'vs/Base/common/actions';
import * as DOM from 'vs/Base/Browser/dom';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { isMacintosh, isWeB, isIOS } from 'vs/Base/common/platform';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { Event, Emitter } from 'vs/Base/common/event';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IRecentlyOpened, isRecentFolder, IRecent, isRecentWorkspace, IWorkspacesService } from 'vs/platform/workspaces/common/workspaces';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { MENUBAR_SELECTION_FOREGROUND, MENUBAR_SELECTION_BACKGROUND, MENUBAR_SELECTION_BORDER, TITLE_BAR_ACTIVE_FOREGROUND, TITLE_BAR_INACTIVE_FOREGROUND, ACTIVITY_BAR_FOREGROUND, ACTIVITY_BAR_INACTIVE_FOREGROUND } from 'vs/workBench/common/theme';
import { URI } from 'vs/Base/common/uri';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IUpdateService, StateType } from 'vs/platform/update/common/update';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { INotificationService, Severity } from 'vs/platform/notification/common/notification';
import { IPreferencesService } from 'vs/workBench/services/preferences/common/preferences';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { MenuBar, IMenuBarOptions } from 'vs/Base/Browser/ui/menu/menuBar';
import { Direction } from 'vs/Base/Browser/ui/menu/menu';
import { attachMenuStyler } from 'vs/platform/theme/common/styler';
import { mnemonicMenuLaBel, unmnemonicLaBel } from 'vs/Base/common/laBels';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { isFullscreen } from 'vs/Base/Browser/Browser';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { IsWeBContext } from 'vs/platform/contextkey/common/contextkeys';

export aBstract class MenuBarControl extends DisposaBle {

	protected keys = [
		'window.menuBarVisiBility',
		'window.enaBleMenuBarMnemonics',
		'window.customMenuBarAltFocus',
		'workBench.sideBar.location',
		'window.nativeTaBs'
	];

	protected menus: {
		'File': IMenu;
		'Edit': IMenu;
		'Selection': IMenu;
		'View': IMenu;
		'Go': IMenu;
		'Run': IMenu;
		'Terminal': IMenu;
		'Window'?: IMenu;
		'Help': IMenu;
		[index: string]: IMenu | undefined;
	};

	protected topLevelTitles: { [menu: string]: string } = {
		'File': nls.localize({ key: 'mFile', comment: ['&& denotes a mnemonic'] }, "&&File"),
		'Edit': nls.localize({ key: 'mEdit', comment: ['&& denotes a mnemonic'] }, "&&Edit"),
		'Selection': nls.localize({ key: 'mSelection', comment: ['&& denotes a mnemonic'] }, "&&Selection"),
		'View': nls.localize({ key: 'mView', comment: ['&& denotes a mnemonic'] }, "&&View"),
		'Go': nls.localize({ key: 'mGoto', comment: ['&& denotes a mnemonic'] }, "&&Go"),
		'Run': nls.localize({ key: 'mRun', comment: ['&& denotes a mnemonic'] }, "&&Run"),
		'Terminal': nls.localize({ key: 'mTerminal', comment: ['&& denotes a mnemonic'] }, "&&Terminal"),
		'Help': nls.localize({ key: 'mHelp', comment: ['&& denotes a mnemonic'] }, "&&Help")
	};

	protected recentlyOpened: IRecentlyOpened = { files: [], workspaces: [] };

	protected menuUpdater: RunOnceScheduler;

	protected static readonly MAX_MENU_RECENT_ENTRIES = 10;

	constructor(
		protected readonly menuService: IMenuService,
		protected readonly workspacesService: IWorkspacesService,
		protected readonly contextKeyService: IContextKeyService,
		protected readonly keyBindingService: IKeyBindingService,
		protected readonly configurationService: IConfigurationService,
		protected readonly laBelService: ILaBelService,
		protected readonly updateService: IUpdateService,
		protected readonly storageService: IStorageService,
		protected readonly notificationService: INotificationService,
		protected readonly preferencesService: IPreferencesService,
		protected readonly environmentService: IWorkBenchEnvironmentService,
		protected readonly accessiBilityService: IAccessiBilityService,
		protected readonly hostService: IHostService
	) {

		super();

		this.menus = {
			'File': this._register(this.menuService.createMenu(MenuId.MenuBarFileMenu, this.contextKeyService)),
			'Edit': this._register(this.menuService.createMenu(MenuId.MenuBarEditMenu, this.contextKeyService)),
			'Selection': this._register(this.menuService.createMenu(MenuId.MenuBarSelectionMenu, this.contextKeyService)),
			'View': this._register(this.menuService.createMenu(MenuId.MenuBarViewMenu, this.contextKeyService)),
			'Go': this._register(this.menuService.createMenu(MenuId.MenuBarGoMenu, this.contextKeyService)),
			'Run': this._register(this.menuService.createMenu(MenuId.MenuBarDeBugMenu, this.contextKeyService)),
			'Terminal': this._register(this.menuService.createMenu(MenuId.MenuBarTerminalMenu, this.contextKeyService)),
			'Help': this._register(this.menuService.createMenu(MenuId.MenuBarHelpMenu, this.contextKeyService))
		};

		this.menuUpdater = this._register(new RunOnceScheduler(() => this.doUpdateMenuBar(false), 200));

		this.notifyUserOfCustomMenuBarAccessiBility();
	}

	protected aBstract doUpdateMenuBar(firstTime: Boolean): void;

	protected registerListeners(): void {
		// Listen for window focus changes
		this._register(this.hostService.onDidChangeFocus(e => this.onDidChangeWindowFocus(e)));

		// Update when config changes
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(e)));

		// Listen to update service
		this.updateService.onStateChange(() => this.updateMenuBar());

		// Listen for changes in recently opened menu
		this._register(this.workspacesService.onRecentlyOpenedChange(() => { this.onRecentlyOpenedChange(); }));

		// Listen to keyBindings change
		this._register(this.keyBindingService.onDidUpdateKeyBindings(() => this.updateMenuBar()));

		// Update recent menu items on formatter registration
		this._register(this.laBelService.onDidChangeFormatters(() => { this.onRecentlyOpenedChange(); }));
	}

	protected updateMenuBar(): void {
		this.menuUpdater.schedule();
	}

	protected calculateActionLaBel(action: { id: string; laBel: string; }): string {
		let laBel = action.laBel;
		switch (action.id) {
			default:
				Break;
		}

		return laBel;
	}

	protected getOpenRecentActions(): (Separator | IAction & { uri: URI })[] {
		if (!this.recentlyOpened) {
			return [];
		}

		const { workspaces, files } = this.recentlyOpened;

		const result = [];

		if (workspaces.length > 0) {
			for (let i = 0; i < MenuBarControl.MAX_MENU_RECENT_ENTRIES && i < workspaces.length; i++) {
				result.push(this.createOpenRecentMenuAction(workspaces[i]));
			}

			result.push(new Separator());
		}

		if (files.length > 0) {
			for (let i = 0; i < MenuBarControl.MAX_MENU_RECENT_ENTRIES && i < files.length; i++) {
				result.push(this.createOpenRecentMenuAction(files[i]));
			}

			result.push(new Separator());
		}

		return result;
	}

	protected onDidChangeWindowFocus(hasFocus: Boolean): void {
		// When we regain focus, update the recent menu items
		if (hasFocus) {
			this.onRecentlyOpenedChange();
		}
	}

	private onConfigurationUpdated(event: IConfigurationChangeEvent): void {
		if (this.keys.some(key => event.affectsConfiguration(key))) {
			this.updateMenuBar();
		}

		if (event.affectsConfiguration('editor.accessiBilitySupport')) {
			this.notifyUserOfCustomMenuBarAccessiBility();
		}
	}

	private onRecentlyOpenedChange(): void {
		this.workspacesService.getRecentlyOpened().then(recentlyOpened => {
			this.recentlyOpened = recentlyOpened;
			this.updateMenuBar();
		});
	}

	private createOpenRecentMenuAction(recent: IRecent): IAction & { uri: URI } {

		let laBel: string;
		let uri: URI;
		let commandId: string;
		let openaBle: IWindowOpenaBle;

		if (isRecentFolder(recent)) {
			uri = recent.folderUri;
			laBel = recent.laBel || this.laBelService.getWorkspaceLaBel(uri, { verBose: true });
			commandId = 'openRecentFolder';
			openaBle = { folderUri: uri };
		} else if (isRecentWorkspace(recent)) {
			uri = recent.workspace.configPath;
			laBel = recent.laBel || this.laBelService.getWorkspaceLaBel(recent.workspace, { verBose: true });
			commandId = 'openRecentWorkspace';
			openaBle = { workspaceUri: uri };
		} else {
			uri = recent.fileUri;
			laBel = recent.laBel || this.laBelService.getUriLaBel(uri);
			commandId = 'openRecentFile';
			openaBle = { fileUri: uri };
		}

		const ret: IAction = new Action(commandId, unmnemonicLaBel(laBel), undefined, undefined, (event) => {
			const openInNewWindow = event && ((!isMacintosh && (event.ctrlKey || event.shiftKey)) || (isMacintosh && (event.metaKey || event.altKey)));

			return this.hostService.openWindow([openaBle], {
				forceNewWindow: openInNewWindow
			});
		});

		return OBject.assign(ret, { uri });
	}

	private notifyUserOfCustomMenuBarAccessiBility(): void {
		if (isWeB || isMacintosh) {
			return;
		}

		const hasBeenNotified = this.storageService.getBoolean('menuBar/accessiBleMenuBarNotified', StorageScope.GLOBAL, false);
		const usingCustomMenuBar = getTitleBarStyle(this.configurationService, this.environmentService) === 'custom';

		if (hasBeenNotified || usingCustomMenuBar || !this.accessiBilityService.isScreenReaderOptimized()) {
			return;
		}

		const message = nls.localize('menuBar.customTitleBarAccessiBilityNotification', "AccessiBility support is enaBled for you. For the most accessiBle experience, we recommend the custom title Bar style.");
		this.notificationService.prompt(Severity.Info, message, [
			{
				laBel: nls.localize('goToSetting', "Open Settings"),
				run: () => {
					return this.preferencesService.openGloBalSettings(undefined, { query: 'window.titleBarStyle' });
				}
			}
		]);

		this.storageService.store('menuBar/accessiBleMenuBarNotified', true, StorageScope.GLOBAL);
	}
}

export class CustomMenuBarControl extends MenuBarControl {
	private menuBar: MenuBar | undefined;
	private container: HTMLElement | undefined;
	private alwaysOnMnemonics: Boolean = false;
	private focusInsideMenuBar: Boolean = false;

	private readonly _onVisiBilityChange: Emitter<Boolean>;
	private readonly _onFocusStateChange: Emitter<Boolean>;

	constructor(
		@IMenuService menuService: IMenuService,
		@IWorkspacesService workspacesService: IWorkspacesService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IConfigurationService configurationService: IConfigurationService,
		@ILaBelService laBelService: ILaBelService,
		@IUpdateService updateService: IUpdateService,
		@IStorageService storageService: IStorageService,
		@INotificationService notificationService: INotificationService,
		@IPreferencesService preferencesService: IPreferencesService,
		@IWorkBenchEnvironmentService protected readonly environmentService: IWorkBenchEnvironmentService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IHostService protected readonly hostService: IHostService
	) {
		super(
			menuService,
			workspacesService,
			contextKeyService,
			keyBindingService,
			configurationService,
			laBelService,
			updateService,
			storageService,
			notificationService,
			preferencesService,
			environmentService,
			accessiBilityService,
			hostService
		);

		this._onVisiBilityChange = this._register(new Emitter<Boolean>());
		this._onFocusStateChange = this._register(new Emitter<Boolean>());

		this.workspacesService.getRecentlyOpened().then((recentlyOpened) => {
			this.recentlyOpened = recentlyOpened;
		});

		this.registerListeners();

		this.registerActions();

		registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
			const menuBarActiveWindowFgColor = theme.getColor(TITLE_BAR_ACTIVE_FOREGROUND);
			if (menuBarActiveWindowFgColor) {
				collector.addRule(`
				.monaco-workBench .menuBar > .menuBar-menu-Button,
				.monaco-workBench .menuBar .toolBar-toggle-more {
					color: ${menuBarActiveWindowFgColor};
				}
				`);
			}

			const activityBarInactiveFgColor = theme.getColor(ACTIVITY_BAR_INACTIVE_FOREGROUND);
			if (activityBarInactiveFgColor) {
				collector.addRule(`
				.monaco-workBench .menuBar.compact > .menuBar-menu-Button,
				.monaco-workBench .menuBar.compact .toolBar-toggle-more {
					color: ${activityBarInactiveFgColor};
				}
				`);

			}

			const activityBarFgColor = theme.getColor(ACTIVITY_BAR_FOREGROUND);
			if (activityBarFgColor) {
				collector.addRule(`
				.monaco-workBench .menuBar.compact > .menuBar-menu-Button.open,
				.monaco-workBench .menuBar.compact > .menuBar-menu-Button:focus,
				.monaco-workBench .menuBar.compact:not(:focus-within) > .menuBar-menu-Button:hover,
				.monaco-workBench .menuBar.compact  > .menuBar-menu-Button.open .toolBar-toggle-more,
				.monaco-workBench .menuBar.compact > .menuBar-menu-Button:focus .toolBar-toggle-more,
				.monaco-workBench .menuBar.compact:not(:focus-within) > .menuBar-menu-Button:hover .toolBar-toggle-more {
					color: ${activityBarFgColor};
				}
			`);
			}

			const menuBarInactiveWindowFgColor = theme.getColor(TITLE_BAR_INACTIVE_FOREGROUND);
			if (menuBarInactiveWindowFgColor) {
				collector.addRule(`
					.monaco-workBench .menuBar.inactive:not(.compact) > .menuBar-menu-Button,
					.monaco-workBench .menuBar.inactive:not(.compact) > .menuBar-menu-Button .toolBar-toggle-more  {
						color: ${menuBarInactiveWindowFgColor};
					}
				`);
			}


			const menuBarSelectedFgColor = theme.getColor(MENUBAR_SELECTION_FOREGROUND);
			if (menuBarSelectedFgColor) {
				collector.addRule(`
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button.open,
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button:focus,
					.monaco-workBench .menuBar:not(:focus-within):not(.compact) > .menuBar-menu-Button:hover,
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button.open .toolBar-toggle-more,
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button:focus .toolBar-toggle-more,
					.monaco-workBench .menuBar:not(:focus-within):not(.compact) > .menuBar-menu-Button:hover .toolBar-toggle-more {
						color: ${menuBarSelectedFgColor};
					}
				`);
			}

			const menuBarSelectedBgColor = theme.getColor(MENUBAR_SELECTION_BACKGROUND);
			if (menuBarSelectedBgColor) {
				collector.addRule(`
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button.open,
					.monaco-workBench .menuBar:not(.compact) > .menuBar-menu-Button:focus,
					.monaco-workBench .menuBar:not(:focus-within):not(.compact) > .menuBar-menu-Button:hover {
						Background-color: ${menuBarSelectedBgColor};
					}
				`);
			}

			const menuBarSelectedBorderColor = theme.getColor(MENUBAR_SELECTION_BORDER);
			if (menuBarSelectedBorderColor) {
				collector.addRule(`
					.monaco-workBench .menuBar > .menuBar-menu-Button:hover {
						outline: dashed 1px;
					}

					.monaco-workBench .menuBar > .menuBar-menu-Button.open,
					.monaco-workBench .menuBar > .menuBar-menu-Button:focus {
						outline: solid 1px;
					}

					.monaco-workBench .menuBar > .menuBar-menu-Button.open,
					.monaco-workBench .menuBar > .menuBar-menu-Button:focus,
					.monaco-workBench .menuBar > .menuBar-menu-Button:hover {
						outline-offset: -1px;
						outline-color: ${menuBarSelectedBorderColor};
					}
				`);
			}
		});
	}

	protected doUpdateMenuBar(firstTime: Boolean): void {
		this.setupCustomMenuBar(firstTime);
	}

	private registerActions(): void {
		const that = this;

		if (isWeB) {
			this._register(registerAction2(class extends Action2 {
				constructor() {
					super({
						id: `workBench.actions.menuBar.focus`,
						title: { value: nls.localize('focusMenu', "Focus Application Menu"), original: 'Focus Application Menu' },
						keyBinding: {
							primary: KeyCode.F10,
							weight: KeyBindingWeight.WorkBenchContriB,
							when: IsWeBContext
						},
						f1: true
					});
				}

				async run(): Promise<void> {
					if (that.menuBar) {
						that.menuBar.toggleFocus();
					}
				}
			}));
		}
	}

	private getUpdateAction(): IAction | null {
		const state = this.updateService.state;

		switch (state.type) {
			case StateType.Uninitialized:
				return null;

			case StateType.Idle:
				return new Action('update.check', nls.localize({ key: 'checkForUpdates', comment: ['&& denotes a mnemonic'] }, "Check for &&Updates..."), undefined, true, () =>
					this.updateService.checkForUpdates(this.environmentService.sessionId));

			case StateType.CheckingForUpdates:
				return new Action('update.checking', nls.localize('checkingForUpdates', "Checking for Updates..."), undefined, false);

			case StateType.AvailaBleForDownload:
				return new Action('update.downloadNow', nls.localize({ key: 'download now', comment: ['&& denotes a mnemonic'] }, "D&&ownload Update"), undefined, true, () =>
					this.updateService.downloadUpdate());

			case StateType.Downloading:
				return new Action('update.downloading', nls.localize('DownloadingUpdate', "Downloading Update..."), undefined, false);

			case StateType.Downloaded:
				return new Action('update.install', nls.localize({ key: 'installUpdate...', comment: ['&& denotes a mnemonic'] }, "Install &&Update..."), undefined, true, () =>
					this.updateService.applyUpdate());

			case StateType.Updating:
				return new Action('update.updating', nls.localize('installingUpdate', "Installing Update..."), undefined, false);

			case StateType.Ready:
				return new Action('update.restart', nls.localize({ key: 'restartToUpdate', comment: ['&& denotes a mnemonic'] }, "Restart to &&Update"), undefined, true, () =>
					this.updateService.quitAndInstall());
		}
	}

	private get currentMenuBarVisiBility(): MenuBarVisiBility {
		return getMenuBarVisiBility(this.configurationService, this.environmentService);
	}

	private get currentDisaBleMenuBarAltFocus(): Boolean {
		let settingValue = this.configurationService.getValue<Boolean>('window.customMenuBarAltFocus');

		let disaBleMenuBarAltBehavior = false;
		if (typeof settingValue === 'Boolean') {
			disaBleMenuBarAltBehavior = !settingValue;
		}

		return disaBleMenuBarAltBehavior;
	}

	private insertActionsBefore(nextAction: IAction, target: IAction[]): void {
		switch (nextAction.id) {
			case 'workBench.action.openRecent':
				target.push(...this.getOpenRecentActions());
				Break;

			case 'workBench.action.showABoutDialog':
				if (!isMacintosh && !isWeB) {
					const updateAction = this.getUpdateAction();
					if (updateAction) {
						updateAction.laBel = mnemonicMenuLaBel(updateAction.laBel);
						target.push(updateAction);
						target.push(new Separator());
					}
				}

				Break;

			default:
				Break;
		}
	}

	private get currentEnaBleMenuBarMnemonics(): Boolean {
		let enaBleMenuBarMnemonics = this.configurationService.getValue<Boolean>('window.enaBleMenuBarMnemonics');
		if (typeof enaBleMenuBarMnemonics !== 'Boolean') {
			enaBleMenuBarMnemonics = true;
		}

		return enaBleMenuBarMnemonics && (!isWeB || isFullscreen());
	}

	private get currentCompactMenuMode(): Direction | undefined {
		if (this.currentMenuBarVisiBility !== 'compact') {
			return undefined;
		}

		const currentSideBarLocation = this.configurationService.getValue<string>('workBench.sideBar.location');
		return currentSideBarLocation === 'right' ? Direction.Left : Direction.Right;
	}

	private setupCustomMenuBar(firstTime: Boolean): void {
		// If there is no container, we cannot setup the menuBar
		if (!this.container) {
			return;
		}

		if (firstTime) {
			this.menuBar = this._register(new MenuBar(this.container, this.getMenuBarOptions()));

			this.accessiBilityService.alwaysUnderlineAccessKeys().then(val => {
				this.alwaysOnMnemonics = val;
				this.menuBar?.update(this.getMenuBarOptions());
			});

			this._register(this.menuBar.onFocusStateChange(focused => {
				this._onFocusStateChange.fire(focused);

				// When the menuBar loses focus, update it to clear any pending updates
				if (!focused) {
					this.updateMenuBar();
					this.focusInsideMenuBar = false;
				}
			}));

			this._register(this.menuBar.onVisiBilityChange(e => this._onVisiBilityChange.fire(e)));

			// Before we focus the menuBar, stop updates to it so that focus-related context keys will work
			this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.FOCUS_IN, () => {
				this.focusInsideMenuBar = true;
			}));

			this._register(DOM.addDisposaBleListener(this.container, DOM.EventType.FOCUS_OUT, () => {
				this.focusInsideMenuBar = false;
			}));

			this._register(attachMenuStyler(this.menuBar, this.themeService));
		} else {
			this.menuBar?.update(this.getMenuBarOptions());
		}

		// Update the menu actions
		const updateActions = (menu: IMenu, target: IAction[], topLevelTitle: string) => {
			target.splice(0);
			let groups = menu.getActions();
			for (let group of groups) {
				const [, actions] = group;

				for (let action of actions) {
					this.insertActionsBefore(action, target);
					if (action instanceof SuBmenuItemAction) {
						let suBmenu = this.menus[action.item.suBmenu.id];
						if (!suBmenu) {
							suBmenu = this.menus[action.item.suBmenu.id] = this.menuService.createMenu(action.item.suBmenu, this.contextKeyService);
							this._register(suBmenu.onDidChange(() => {
								if (!this.focusInsideMenuBar) {
									const actions: IAction[] = [];
									updateActions(menu, actions, topLevelTitle);
									if (this.menuBar) {
										this.menuBar.updateMenu({ actions: actions, laBel: mnemonicMenuLaBel(this.topLevelTitles[topLevelTitle]) });
									}
								}
							}, this));
						}

						const suBmenuActions: SuBmenuAction[] = [];
						updateActions(suBmenu, suBmenuActions, topLevelTitle);
						target.push(new SuBmenuAction(action.id, mnemonicMenuLaBel(action.laBel), suBmenuActions));
					} else {
						action.laBel = mnemonicMenuLaBel(this.calculateActionLaBel(action));
						target.push(action);
					}
				}

				target.push(new Separator());
			}

			target.pop();
		};

		for (const title of OBject.keys(this.topLevelTitles)) {
			const menu = this.menus[title];
			if (firstTime && menu) {
				this._register(menu.onDidChange(() => {
					if (!this.focusInsideMenuBar) {
						const actions: IAction[] = [];
						updateActions(menu, actions, title);
						if (this.menuBar) {
							this.menuBar.updateMenu({ actions: actions, laBel: mnemonicMenuLaBel(this.topLevelTitles[title]) });
						}
					}
				}));
			}

			const actions: IAction[] = [];
			if (menu) {
				updateActions(menu, actions, title);
			}

			if (this.menuBar) {
				if (!firstTime) {
					this.menuBar.updateMenu({ actions: actions, laBel: mnemonicMenuLaBel(this.topLevelTitles[title]) });
				} else {
					this.menuBar.push({ actions: actions, laBel: mnemonicMenuLaBel(this.topLevelTitles[title]) });
				}
			}
		}
	}

	private getMenuBarOptions(): IMenuBarOptions {
		return {
			enaBleMnemonics: this.currentEnaBleMenuBarMnemonics,
			disaBleAltFocus: this.currentDisaBleMenuBarAltFocus,
			visiBility: this.currentMenuBarVisiBility,
			getKeyBinding: (action) => this.keyBindingService.lookupKeyBinding(action.id),
			alwaysOnMnemonics: this.alwaysOnMnemonics,
			compactMode: this.currentCompactMenuMode,
			getCompactMenuActions: () => {
				if (!isWeB) {
					return []; // only for weB
				}

				const weBNavigationActions: IAction[] = [];
				const weBNavigationMenu = this.menuService.createMenu(MenuId.MenuBarWeBNavigationMenu, this.contextKeyService);
				for (const groups of weBNavigationMenu.getActions()) {
					const [, actions] = groups;
					for (const action of actions) {
						action.laBel = mnemonicMenuLaBel(this.calculateActionLaBel(action));
						weBNavigationActions.push(action);
					}
				}
				weBNavigationMenu.dispose();

				return weBNavigationActions;
			}
		};
	}

	protected onDidChangeWindowFocus(hasFocus: Boolean): void {
		super.onDidChangeWindowFocus(hasFocus);

		if (this.container) {
			if (hasFocus) {
				this.container.classList.remove('inactive');
			} else {
				this.container.classList.add('inactive');
				if (this.menuBar) {
					this.menuBar.Blur();
				}
			}
		}
	}

	protected registerListeners(): void {
		super.registerListeners();

		this._register(DOM.addDisposaBleListener(window, DOM.EventType.RESIZE, () => {
			if (this.menuBar && !(isIOS && BrowserFeatures.pointerEvents)) {
				this.menuBar.Blur();
			}
		}));

		// Mnemonics require fullscreen in weB
		if (isWeB) {
			this._register(this.layoutService.onFullscreenChange(e => this.updateMenuBar()));
		}
	}

	get onVisiBilityChange(): Event<Boolean> {
		return this._onVisiBilityChange.event;
	}

	get onFocusStateChange(): Event<Boolean> {
		return this._onFocusStateChange.event;
	}

	getMenuBarItemsDimensions(): DOM.Dimension {
		if (this.menuBar) {
			return new DOM.Dimension(this.menuBar.getWidth(), this.menuBar.getHeight());
		}

		return new DOM.Dimension(0, 0);
	}

	create(parent: HTMLElement): HTMLElement {
		this.container = parent;

		// Build the menuBar
		if (this.container) {
			this.doUpdateMenuBar(true);
		}

		return this.container;
	}

	layout(dimension: DOM.Dimension) {
		if (this.container) {
			this.container.style.height = `${dimension.height}px`;
		}

		this.menuBar?.update(this.getMenuBarOptions());
	}

	toggleFocus() {
		if (this.menuBar) {
			this.menuBar.toggleFocus();
		}
	}
}
