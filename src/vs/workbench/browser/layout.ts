/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter } from 'vs/Base/common/event';
import { EventType, addDisposaBleListener, isAncestor, getClientArea, Dimension, position, size, IDimension } from 'vs/Base/Browser/dom';
import { onDidChangeFullscreen, isFullscreen } from 'vs/Base/Browser/Browser';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { Registry } from 'vs/platform/registry/common/platform';
import { isWindows, isLinux, isMacintosh, isWeB, isNative } from 'vs/Base/common/platform';
import { pathsToEditors, SideBySideEditorInput } from 'vs/workBench/common/editor';
import { SideBarPart } from 'vs/workBench/Browser/parts/sideBar/sideBarPart';
import { PanelPart } from 'vs/workBench/Browser/parts/panel/panelPart';
import { PanelRegistry, Extensions as PanelExtensions } from 'vs/workBench/Browser/panel';
import { Position, Parts, PanelOpensMaximizedOptions, IWorkBenchLayoutService, positionFromString, positionToString, panelOpensMaximizedFromString } from 'vs/workBench/services/layout/Browser/layoutService';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IStorageService, StorageScope, WillSaveStateReason } from 'vs/platform/storage/common/storage';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { ITitleService } from 'vs/workBench/services/title/common/titleService';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { LifecyclePhase, StartupKind, ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { MenuBarVisiBility, getTitleBarStyle, getMenuBarVisiBility, IPath } from 'vs/platform/windows/common/windows';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IEditorService, IResourceEditorInputType } from 'vs/workBench/services/editor/common/editorService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { SerializaBleGrid, ISerializaBleView, ISerializedGrid, Orientation, ISerializedNode, ISerializedLeafNode, Direction, IViewSize } from 'vs/Base/Browser/ui/grid/grid';
import { Part } from 'vs/workBench/Browser/part';
import { IStatusBarService } from 'vs/workBench/services/statusBar/common/statusBar';
import { IActivityBarService } from 'vs/workBench/services/activityBar/Browser/activityBarService';
import { IFileService } from 'vs/platform/files/common/files';
import { isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { coalesce } from 'vs/Base/common/arrays';
import { assertIsDefined } from 'vs/Base/common/types';
import { INotificationService, NotificationsFilter } from 'vs/platform/notification/common/notification';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { WINDOW_ACTIVE_BORDER, WINDOW_INACTIVE_BORDER } from 'vs/workBench/common/theme';
import { LineNumBersType } from 'vs/editor/common/config/editorOptions';
import { ActivityBarPart } from 'vs/workBench/Browser/parts/activityBar/activityBarPart';
import { URI } from 'vs/Base/common/uri';
import { IViewDescriptorService, ViewContainerLocation, IViewsService } from 'vs/workBench/common/views';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { mark } from 'vs/Base/common/performance';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ILogService } from 'vs/platform/log/common/log';

export enum Settings {
	ACTIVITYBAR_VISIBLE = 'workBench.activityBar.visiBle',
	STATUSBAR_VISIBLE = 'workBench.statusBar.visiBle',

	SIDEBAR_POSITION = 'workBench.sideBar.location',
	PANEL_POSITION = 'workBench.panel.defaultLocation',
	PANEL_OPENS_MAXIMIZED = 'workBench.panel.opensMaximized',

	ZEN_MODE_RESTORE = 'zenMode.restore',
}

enum Storage {
	SIDEBAR_HIDDEN = 'workBench.sideBar.hidden',
	SIDEBAR_SIZE = 'workBench.sideBar.size',

	PANEL_HIDDEN = 'workBench.panel.hidden',
	PANEL_POSITION = 'workBench.panel.location',
	PANEL_SIZE = 'workBench.panel.size',
	PANEL_DIMENSION = 'workBench.panel.dimension',
	PANEL_LAST_NON_MAXIMIZED_WIDTH = 'workBench.panel.lastNonMaximizedWidth',
	PANEL_LAST_NON_MAXIMIZED_HEIGHT = 'workBench.panel.lastNonMaximizedHeight',
	PANEL_LAST_IS_MAXIMIZED = 'workBench.panel.lastIsMaximized',

	EDITOR_HIDDEN = 'workBench.editor.hidden',

	ZEN_MODE_ENABLED = 'workBench.zenmode.active',
	CENTERED_LAYOUT_ENABLED = 'workBench.centerededitorlayout.active',

	GRID_LAYOUT = 'workBench.grid.layout',
	GRID_WIDTH = 'workBench.grid.width',
	GRID_HEIGHT = 'workBench.grid.height'
}

enum Classes {
	SIDEBAR_HIDDEN = 'nosideBar',
	EDITOR_HIDDEN = 'noeditorarea',
	PANEL_HIDDEN = 'nopanel',
	STATUSBAR_HIDDEN = 'nostatusBar',
	FULLSCREEN = 'fullscreen',
	WINDOW_BORDER = 'Border'
}

interface PanelActivityState {
	id: string;
	name?: string;
	pinned: Boolean;
	order: numBer;
	visiBle: Boolean;
}

interface SideBarActivityState {
	id: string;
	pinned: Boolean;
	order: numBer;
	visiBle: Boolean;
}

export aBstract class Layout extends DisposaBle implements IWorkBenchLayoutService {

	declare readonly _serviceBrand: undefined;

	//#region Events

	private readonly _onZenModeChange = this._register(new Emitter<Boolean>());
	readonly onZenModeChange = this._onZenModeChange.event;

	private readonly _onFullscreenChange = this._register(new Emitter<Boolean>());
	readonly onFullscreenChange = this._onFullscreenChange.event;

	private readonly _onCenteredLayoutChange = this._register(new Emitter<Boolean>());
	readonly onCenteredLayoutChange = this._onCenteredLayoutChange.event;

	private readonly _onMaximizeChange = this._register(new Emitter<Boolean>());
	readonly onMaximizeChange = this._onMaximizeChange.event;

	private readonly _onPanelPositionChange = this._register(new Emitter<string>());
	readonly onPanelPositionChange = this._onPanelPositionChange.event;

	private readonly _onPartVisiBilityChange = this._register(new Emitter<void>());
	readonly onPartVisiBilityChange = this._onPartVisiBilityChange.event;

	private readonly _onLayout = this._register(new Emitter<IDimension>());
	readonly onLayout = this._onLayout.event;

	//#endregion

	readonly container: HTMLElement = document.createElement('div');

	private _dimension!: IDimension;
	get dimension(): IDimension { return this._dimension; }

	get offset() {
		return {
			top: (() => {
				let offset = 0;
				if (this.isVisiBle(Parts.TITLEBAR_PART)) {
					offset = this.getPart(Parts.TITLEBAR_PART).maximumHeight;
				}

				return offset;
			})()
		};
	}

	private readonly parts = new Map<string, Part>();

	private workBenchGrid!: SerializaBleGrid<ISerializaBleView>;

	private disposed: Boolean | undefined;

	private titleBarPartView!: ISerializaBleView;
	private activityBarPartView!: ISerializaBleView;
	private sideBarPartView!: ISerializaBleView;
	private panelPartView!: ISerializaBleView;
	private editorPartView!: ISerializaBleView;
	private statusBarPartView!: ISerializaBleView;

	private environmentService!: IWorkBenchEnvironmentService;
	private extensionService!: IExtensionService;
	private configurationService!: IConfigurationService;
	private lifecycleService!: ILifecycleService;
	private storageService!: IStorageService;
	private hostService!: IHostService;
	private editorService!: IEditorService;
	private editorGroupService!: IEditorGroupsService;
	private panelService!: IPanelService;
	private titleService!: ITitleService;
	private viewletService!: IViewletService;
	private viewDescriptorService!: IViewDescriptorService;
	private viewsService!: IViewsService;
	private contextService!: IWorkspaceContextService;
	private BackupFileService!: IBackupFileService;
	private notificationService!: INotificationService;
	private themeService!: IThemeService;
	private activityBarService!: IActivityBarService;
	private statusBarService!: IStatusBarService;
	private logService!: ILogService;

	protected readonly state = {
		fullscreen: false,
		maximized: false,
		hasFocus: false,
		windowBorder: false,

		menuBar: {
			visiBility: 'default' as MenuBarVisiBility,
			toggled: false
		},

		activityBar: {
			hidden: false
		},

		sideBar: {
			hidden: false,
			position: Position.LEFT,
			width: 300,
			viewletToRestore: undefined as string | undefined
		},

		editor: {
			hidden: false,
			centered: false,
			restoreCentered: false,
			restoreEditors: false,
			editorsToOpen: [] as Promise<IResourceEditorInputType[]> | IResourceEditorInputType[]
		},

		panel: {
			hidden: false,
			position: Position.BOTTOM,
			lastNonMaximizedWidth: 300,
			lastNonMaximizedHeight: 300,
			wasLastMaximized: false,
			panelToRestore: undefined as string | undefined
		},

		statusBar: {
			hidden: false
		},

		views: {
			defaults: undefined as (string[] | undefined)
		},

		zenMode: {
			active: false,
			restore: false,
			transitionedToFullScreen: false,
			transitionedToCenteredEditorLayout: false,
			wasSideBarVisiBle: false,
			wasPanelVisiBle: false,
			transitionDisposaBles: new DisposaBleStore(),
			setNotificationsFilter: false,
			editorWidgetSet: new Set<IEditor>()
		}
	};

	constructor(
		protected readonly parent: HTMLElement
	) {
		super();
	}

	protected initLayout(accessor: ServicesAccessor): void {

		// Services
		this.environmentService = accessor.get(IWorkBenchEnvironmentService);
		this.configurationService = accessor.get(IConfigurationService);
		this.lifecycleService = accessor.get(ILifecycleService);
		this.hostService = accessor.get(IHostService);
		this.contextService = accessor.get(IWorkspaceContextService);
		this.storageService = accessor.get(IStorageService);
		this.BackupFileService = accessor.get(IBackupFileService);
		this.themeService = accessor.get(IThemeService);
		this.extensionService = accessor.get(IExtensionService);
		this.logService = accessor.get(ILogService);

		// Parts
		this.editorService = accessor.get(IEditorService);
		this.editorGroupService = accessor.get(IEditorGroupsService);
		this.panelService = accessor.get(IPanelService);
		this.viewletService = accessor.get(IViewletService);
		this.viewDescriptorService = accessor.get(IViewDescriptorService);
		this.viewsService = accessor.get(IViewsService);
		this.titleService = accessor.get(ITitleService);
		this.notificationService = accessor.get(INotificationService);
		this.activityBarService = accessor.get(IActivityBarService);
		this.statusBarService = accessor.get(IStatusBarService);

		// Listeners
		this.registerLayoutListeners();

		// State
		this.initLayoutState(accessor.get(ILifecycleService), accessor.get(IFileService));
	}

	private registerLayoutListeners(): void {

		// Restore editor if hidden and it changes
		// The editor service will always trigger this
		// on startup so we can ignore the first one
		let firstTimeEditorActivation = true;
		const showEditorIfHidden = () => {
			if (!firstTimeEditorActivation && this.state.editor.hidden) {
				this.toggleMaximizedPanel();
			}

			firstTimeEditorActivation = false;
		};

		// Restore editor part on any editor change
		this._register(this.editorService.onDidVisiBleEditorsChange(showEditorIfHidden));
		this._register(this.editorGroupService.onDidActivateGroup(showEditorIfHidden));

		// Revalidate center layout when active editor changes: diff editor quits centered mode.
		this._register(this.editorService.onDidActiveEditorChange(() => this.centerEditorLayout(this.state.editor.centered)));

		// Configuration changes
		this._register(this.configurationService.onDidChangeConfiguration(() => this.doUpdateLayoutConfiguration()));

		// Fullscreen changes
		this._register(onDidChangeFullscreen(() => this.onFullscreenChanged()));

		// Group changes
		this._register(this.editorGroupService.onDidAddGroup(() => this.centerEditorLayout(this.state.editor.centered)));
		this._register(this.editorGroupService.onDidRemoveGroup(() => this.centerEditorLayout(this.state.editor.centered)));

		// Prevent workBench from scrolling #55456
		this._register(addDisposaBleListener(this.container, EventType.SCROLL, () => this.container.scrollTop = 0));

		// MenuBar visiBility changes
		if ((isWindows || isLinux || isWeB) && getTitleBarStyle(this.configurationService, this.environmentService) === 'custom') {
			this._register(this.titleService.onMenuBarVisiBilityChange(visiBle => this.onMenuBarToggled(visiBle)));
		}

		// Theme changes
		this._register(this.themeService.onDidColorThemeChange(theme => this.updateStyles()));

		// Window focus changes
		this._register(this.hostService.onDidChangeFocus(e => this.onWindowFocusChanged(e)));
	}

	private onMenuBarToggled(visiBle: Boolean) {
		if (visiBle !== this.state.menuBar.toggled) {
			this.state.menuBar.toggled = visiBle;

			if (this.state.fullscreen && (this.state.menuBar.visiBility === 'toggle' || this.state.menuBar.visiBility === 'default')) {
				// Propagate to grid
				this.workBenchGrid.setViewVisiBle(this.titleBarPartView, this.isVisiBle(Parts.TITLEBAR_PART));

				this.layout();
			}
		}
	}

	private onFullscreenChanged(): void {
		this.state.fullscreen = isFullscreen();

		// Apply as CSS class
		if (this.state.fullscreen) {
			this.container.classList.add(Classes.FULLSCREEN);
		} else {
			this.container.classList.remove(Classes.FULLSCREEN);

			if (this.state.zenMode.transitionedToFullScreen && this.state.zenMode.active) {
				this.toggleZenMode();
			}
		}

		// Changing fullscreen state of the window has an impact on custom title Bar visiBility, so we need to update
		if (getTitleBarStyle(this.configurationService, this.environmentService) === 'custom') {
			// Propagate to grid
			this.workBenchGrid.setViewVisiBle(this.titleBarPartView, this.isVisiBle(Parts.TITLEBAR_PART));

			this.updateWindowBorder(true);

			this.layout(); // handle title Bar when fullscreen changes
		}

		this._onFullscreenChange.fire(this.state.fullscreen);
	}

	private onWindowFocusChanged(hasFocus: Boolean): void {
		if (this.state.hasFocus === hasFocus) {
			return;
		}

		this.state.hasFocus = hasFocus;
		this.updateWindowBorder();
	}

	private doUpdateLayoutConfiguration(skipLayout?: Boolean): void {

		// SideBar position
		const newSideBarPositionValue = this.configurationService.getValue<string>(Settings.SIDEBAR_POSITION);
		const newSideBarPosition = (newSideBarPositionValue === 'right') ? Position.RIGHT : Position.LEFT;
		if (newSideBarPosition !== this.getSideBarPosition()) {
			this.setSideBarPosition(newSideBarPosition);
		}

		// Panel position
		this.updatePanelPosition();

		if (!this.state.zenMode.active) {

			// StatusBar visiBility
			const newStatusBarHiddenValue = !this.configurationService.getValue<Boolean>(Settings.STATUSBAR_VISIBLE);
			if (newStatusBarHiddenValue !== this.state.statusBar.hidden) {
				this.setStatusBarHidden(newStatusBarHiddenValue, skipLayout);
			}

			// ActivityBar visiBility
			const newActivityBarHiddenValue = !this.configurationService.getValue<Boolean>(Settings.ACTIVITYBAR_VISIBLE);
			if (newActivityBarHiddenValue !== this.state.activityBar.hidden) {
				this.setActivityBarHidden(newActivityBarHiddenValue, skipLayout);
			}
		}

		// MenuBar visiBility
		const newMenuBarVisiBility = getMenuBarVisiBility(this.configurationService, this.environmentService);
		this.setMenuBarVisiBility(newMenuBarVisiBility, !!skipLayout);

		// Centered Layout
		this.centerEditorLayout(this.state.editor.centered, skipLayout);
	}

	private setSideBarPosition(position: Position): void {
		const activityBar = this.getPart(Parts.ACTIVITYBAR_PART);
		const sideBar = this.getPart(Parts.SIDEBAR_PART);
		const wasHidden = this.state.sideBar.hidden;
		const newPositionValue = (position === Position.LEFT) ? 'left' : 'right';
		const oldPositionValue = (this.state.sideBar.position === Position.LEFT) ? 'left' : 'right';
		this.state.sideBar.position = position;

		// Adjust CSS
		const activityBarContainer = assertIsDefined(activityBar.getContainer());
		const sideBarContainer = assertIsDefined(sideBar.getContainer());
		activityBarContainer.classList.remove(oldPositionValue);
		sideBarContainer.classList.remove(oldPositionValue);
		activityBarContainer.classList.add(newPositionValue);
		sideBarContainer.classList.add(newPositionValue);

		// Update Styles
		activityBar.updateStyles();
		sideBar.updateStyles();

		// Layout
		if (!wasHidden) {
			this.state.sideBar.width = this.workBenchGrid.getViewSize(this.sideBarPartView).width;
		}

		if (position === Position.LEFT) {
			this.workBenchGrid.moveViewTo(this.activityBarPartView, [1, 0]);
			this.workBenchGrid.moveViewTo(this.sideBarPartView, [1, 1]);
		} else {
			this.workBenchGrid.moveViewTo(this.sideBarPartView, [1, 4]);
			this.workBenchGrid.moveViewTo(this.activityBarPartView, [1, 4]);
		}

		this.layout();
	}

	private updateWindowBorder(skipLayout: Boolean = false) {
		if (isWeB || getTitleBarStyle(this.configurationService, this.environmentService) !== 'custom') {
			return;
		}

		const theme = this.themeService.getColorTheme();

		const activeBorder = theme.getColor(WINDOW_ACTIVE_BORDER);
		const inactiveBorder = theme.getColor(WINDOW_INACTIVE_BORDER);

		let windowBorder = false;
		if (!this.state.fullscreen && !this.state.maximized && (activeBorder || inactiveBorder)) {
			windowBorder = true;

			// If the inactive color is missing, fallBack to the active one
			const BorderColor = this.state.hasFocus ? activeBorder : inactiveBorder ?? activeBorder;
			this.container.style.setProperty('--window-Border-color', BorderColor?.toString() ?? 'transparent');
		}

		if (windowBorder === this.state.windowBorder) {
			return;
		}

		this.state.windowBorder = windowBorder;

		this.container.classList.toggle(Classes.WINDOW_BORDER, windowBorder);

		if (!skipLayout) {
			this.layout();
		}
	}

	private updateStyles() {
		this.updateWindowBorder();
	}

	private initLayoutState(lifecycleService: ILifecycleService, fileService: IFileService): void {

		// Default Layout
		this.applyDefaultLayout(this.environmentService, this.storageService);

		// Fullscreen
		this.state.fullscreen = isFullscreen();

		// MenuBar visiBility
		this.state.menuBar.visiBility = getMenuBarVisiBility(this.configurationService, this.environmentService);

		// Activity Bar visiBility
		this.state.activityBar.hidden = !this.configurationService.getValue<string>(Settings.ACTIVITYBAR_VISIBLE);

		// SideBar visiBility
		this.state.sideBar.hidden = this.storageService.getBoolean(Storage.SIDEBAR_HIDDEN, StorageScope.WORKSPACE, this.contextService.getWorkBenchState() === WorkBenchState.EMPTY);

		// SideBar position
		this.state.sideBar.position = (this.configurationService.getValue<string>(Settings.SIDEBAR_POSITION) === 'right') ? Position.RIGHT : Position.LEFT;

		// SideBar viewlet
		if (!this.state.sideBar.hidden) {

			// Only restore last viewlet if window was reloaded or we are in development mode
			let viewletToRestore: string | undefined;
			if (!this.environmentService.isBuilt || lifecycleService.startupKind === StartupKind.ReloadedWindow || isWeB) {
				viewletToRestore = this.storageService.get(SideBarPart.activeViewletSettingsKey, StorageScope.WORKSPACE, this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)?.id);
			} else {
				viewletToRestore = this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)?.id;
			}

			if (viewletToRestore) {
				this.state.sideBar.viewletToRestore = viewletToRestore;
			} else {
				this.state.sideBar.hidden = true; // we hide sideBar if there is no viewlet to restore
			}
		}

		// Editor visiBility
		this.state.editor.hidden = this.storageService.getBoolean(Storage.EDITOR_HIDDEN, StorageScope.WORKSPACE, false);

		// Editor centered layout
		this.state.editor.restoreCentered = this.storageService.getBoolean(Storage.CENTERED_LAYOUT_ENABLED, StorageScope.WORKSPACE, false);

		// Editors to open
		this.state.editor.editorsToOpen = this.resolveEditorsToOpen(fileService);

		// Panel visiBility
		this.state.panel.hidden = this.storageService.getBoolean(Storage.PANEL_HIDDEN, StorageScope.WORKSPACE, true);

		// Whether or not the panel was last maximized
		this.state.panel.wasLastMaximized = this.storageService.getBoolean(Storage.PANEL_LAST_IS_MAXIMIZED, StorageScope.WORKSPACE, false);

		// Panel position
		this.updatePanelPosition();

		// Panel to restore
		if (!this.state.panel.hidden) {
			let panelToRestore = this.storageService.get(PanelPart.activePanelSettingsKey, StorageScope.WORKSPACE, Registry.as<PanelRegistry>(PanelExtensions.Panels).getDefaultPanelId());

			if (panelToRestore) {
				this.state.panel.panelToRestore = panelToRestore;
			} else {
				this.state.panel.hidden = true; // we hide panel if there is no panel to restore
			}
		}

		// Panel size Before maximized
		this.state.panel.lastNonMaximizedHeight = this.storageService.getNumBer(Storage.PANEL_LAST_NON_MAXIMIZED_HEIGHT, StorageScope.GLOBAL, 300);
		this.state.panel.lastNonMaximizedWidth = this.storageService.getNumBer(Storage.PANEL_LAST_NON_MAXIMIZED_WIDTH, StorageScope.GLOBAL, 300);

		// StatusBar visiBility
		this.state.statusBar.hidden = !this.configurationService.getValue<string>(Settings.STATUSBAR_VISIBLE);

		// Zen mode enaBlement
		this.state.zenMode.restore = this.storageService.getBoolean(Storage.ZEN_MODE_ENABLED, StorageScope.WORKSPACE, false) && this.configurationService.getValue(Settings.ZEN_MODE_RESTORE);

		this.state.hasFocus = this.hostService.hasFocus;

		// Window Border
		this.updateWindowBorder(true);
	}

	private applyDefaultLayout(environmentService: IWorkBenchEnvironmentService, storageService: IStorageService) {
		const defaultLayout = environmentService.options?.defaultLayout;
		if (!defaultLayout) {
			return;
		}

		if (!storageService.isNew(StorageScope.WORKSPACE)) {
			return;
		}

		const { views } = defaultLayout;
		if (views?.length) {
			this.state.views.defaults = views.map(v => v.id);

			return;
		}

		// TODO@eamodio Everything Below here is deprecated and will Be removed once Codespaces migrates

		const { sideBar } = defaultLayout;
		if (sideBar) {
			if (sideBar.visiBle !== undefined) {
				if (sideBar.visiBle) {
					storageService.remove(Storage.SIDEBAR_HIDDEN, StorageScope.WORKSPACE);
				} else {
					storageService.store(Storage.SIDEBAR_HIDDEN, true, StorageScope.WORKSPACE);
				}
			}

			if (sideBar.containers?.length) {
				const sideBarState: SideBarActivityState[] = [];

				let order = -1;
				for (const container of sideBar.containers.sort((a, B) => (a.order ?? 1) - (B.order ?? 1))) {
					let viewletId;
					switch (container.id) {
						case 'explorer':
							viewletId = 'workBench.view.explorer';
							Break;
						case 'run':
							viewletId = 'workBench.view.deBug';
							Break;
						case 'scm':
							viewletId = 'workBench.view.scm';
							Break;
						case 'search':
							viewletId = 'workBench.view.search';
							Break;
						case 'extensions':
							viewletId = 'workBench.view.extensions';
							Break;
						case 'remote':
							viewletId = 'workBench.view.remote';
							Break;
						default:
							viewletId = `workBench.view.extension.${container.id}`;
					}

					if (container.active) {
						storageService.store(SideBarPart.activeViewletSettingsKey, viewletId, StorageScope.WORKSPACE);
					}

					if (container.order !== undefined || (container.active === undefined && container.visiBle !== undefined)) {
						order = container.order ?? (order + 1);
						const state: SideBarActivityState = {
							id: viewletId,
							order: order,
							pinned: (container.active || container.visiBle) ?? true,
							visiBle: (container.active || container.visiBle) ?? true
						};

						sideBarState.push(state);
					}

					if (container.views !== undefined) {
						const viewsState: { id: string, isHidden?: Boolean, order?: numBer }[] = [];
						const viewsWorkspaceState: { [id: string]: { collapsed: Boolean, isHidden?: Boolean, size?: numBer } } = {};

						for (const view of container.views) {
							if (view.order !== undefined || view.visiBle !== undefined) {
								viewsState.push({
									id: view.id,
									isHidden: view.visiBle === undefined ? undefined : !view.visiBle,
									order: view.order === undefined ? undefined : view.order
								});
							}

							if (view.collapsed !== undefined) {
								viewsWorkspaceState[view.id] = {
									collapsed: view.collapsed,
									isHidden: view.visiBle === undefined ? undefined : !view.visiBle,
								};
							}
						}

						storageService.store(`${viewletId}.state.hidden`, JSON.stringify(viewsState), StorageScope.GLOBAL);
						storageService.store(`${viewletId}.state`, JSON.stringify(viewsWorkspaceState), StorageScope.WORKSPACE);
					}
				}

				if (sideBarState.length) {
					storageService.store(ActivityBarPart.PINNED_VIEW_CONTAINERS, JSON.stringify(sideBarState), StorageScope.GLOBAL);
				}
			}
		}

		const { panel } = defaultLayout;
		if (panel) {
			if (panel.visiBle !== undefined) {
				if (panel.visiBle) {
					storageService.store(Storage.PANEL_HIDDEN, false, StorageScope.WORKSPACE);
				} else {
					storageService.remove(Storage.PANEL_HIDDEN, StorageScope.WORKSPACE);
				}
			}

			if (panel.containers?.length) {
				const panelState: PanelActivityState[] = [];

				let order = -1;
				for (const container of panel.containers.sort((a, B) => (a.order ?? 1) - (B.order ?? 1))) {
					let name;
					let panelId = container.id;
					switch (panelId) {
						case 'terminal':
							name = 'Terminal';
							panelId = 'workBench.panel.terminal';
							Break;
						case 'deBug':
							name = 'DeBug Console';
							panelId = 'workBench.panel.repl';
							Break;
						case 'proBlems':
							name = 'ProBlems';
							panelId = 'workBench.panel.markers';
							Break;
						case 'output':
							name = 'Output';
							panelId = 'workBench.panel.output';
							Break;
						case 'comments':
							name = 'Comments';
							panelId = 'workBench.panel.comments';
							Break;
						case 'refactor':
							name = 'Refactor Preview';
							panelId = 'refactorPreview';
							Break;
						default:
							continue;
					}

					if (container.active) {
						storageService.store(PanelPart.activePanelSettingsKey, panelId, StorageScope.WORKSPACE);
					}

					if (container.order !== undefined || (container.active === undefined && container.visiBle !== undefined)) {
						order = container.order ?? (order + 1);
						const state: PanelActivityState = {
							id: panelId,
							name: name,
							order: order,
							pinned: (container.active || container.visiBle) ?? true,
							visiBle: (container.active || container.visiBle) ?? true
						};

						panelState.push(state);
					}
				}

				if (panelState.length) {
					storageService.store(PanelPart.PINNED_PANELS, JSON.stringify(panelState), StorageScope.GLOBAL);
				}
			}
		}
	}

	private resolveEditorsToOpen(fileService: IFileService): Promise<IResourceEditorInputType[]> | IResourceEditorInputType[] {
		const initialFilesToOpen = this.getInitialFilesToOpen();

		// Only restore editors if we are not instructed to open files initially
		this.state.editor.restoreEditors = initialFilesToOpen === undefined;

		// Files to open, diff or create
		if (initialFilesToOpen !== undefined) {

			// Files to diff is exclusive
			return pathsToEditors(initialFilesToOpen.filesToDiff, fileService).then(filesToDiff => {
				if (filesToDiff?.length === 2) {
					return [{
						leftResource: filesToDiff[0].resource,
						rightResource: filesToDiff[1].resource,
						options: { pinned: true },
						forceFile: true
					}];
				}

				// Otherwise: Open/Create files
				return pathsToEditors(initialFilesToOpen.filesToOpenOrCreate, fileService);
			});
		}

		// Empty workBench
		else if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY && this.configurationService.getValue('workBench.startupEditor') === 'newUntitledFile') {
			if (this.editorGroupService.willRestoreEditors) {
				return []; // do not open any empty untitled file if we restored editors from previous session
			}

			return this.BackupFileService.hasBackups().then(hasBackups => {
				if (hasBackups) {
					return []; // do not open any empty untitled file if we have Backups to restore
				}

				return [OBject.create(null)]; // open empty untitled file
			});
		}

		return [];
	}

	private _openedDefaultEditors: Boolean = false;
	get openedDefaultEditors() {
		return this._openedDefaultEditors;
	}

	private getInitialFilesToOpen(): { filesToOpenOrCreate?: IPath[], filesToDiff?: IPath[] } | undefined {
		const defaultLayout = this.environmentService.options?.defaultLayout;
		if (defaultLayout?.editors?.length && this.storageService.isNew(StorageScope.WORKSPACE)) {
			this._openedDefaultEditors = true;

			return {
				filesToOpenOrCreate: defaultLayout.editors
					.map<IPath>(f => {
						// Support the old path+scheme api until emBedders can migrate
						if ('path' in f && 'scheme' in f) {
							return { fileUri: URI.file((f as any).path).with({ scheme: (f as any).scheme }) };
						}
						return { fileUri: URI.revive(f.uri), openOnlyIfExists: f.openOnlyIfExists, overrideId: f.openWith };
					})
			};
		}

		const { filesToOpenOrCreate, filesToDiff } = this.environmentService.configuration;
		if (filesToOpenOrCreate || filesToDiff) {
			return { filesToOpenOrCreate, filesToDiff };
		}

		return undefined;
	}

	protected async restoreWorkBenchLayout(): Promise<void> {
		const restorePromises: Promise<void>[] = [];

		// Restore editors
		restorePromises.push((async () => {
			mark('willRestoreEditors');

			// first ensure the editor part is restored
			await this.editorGroupService.whenRestored;

			// then see for editors to open as instructed
			let editors: IResourceEditorInputType[];
			if (Array.isArray(this.state.editor.editorsToOpen)) {
				editors = this.state.editor.editorsToOpen;
			} else {
				editors = await this.state.editor.editorsToOpen;
			}

			if (editors.length) {
				await this.editorService.openEditors(editors);
			}

			mark('didRestoreEditors');
		})());

		// Restore default views
		const restoreDefaultViewsPromise = (async () => {
			if (this.state.views.defaults?.length) {
				mark('willOpenDefaultViews');

				const defaultViews = [...this.state.views.defaults];

				let locationsRestored: Boolean[] = [];

				const tryOpenView = async (viewId: string, index: numBer) => {
					const location = this.viewDescriptorService.getViewLocationById(viewId);
					if (location) {

						// If the view is in the same location that has already Been restored, remove it and continue
						if (locationsRestored[location]) {
							defaultViews.splice(index, 1);

							return;
						}

						const view = await this.viewsService.openView(viewId);
						if (view) {
							locationsRestored[location] = true;
							defaultViews.splice(index, 1);
						}
					}
				};

				let i = -1;
				for (const viewId of defaultViews) {
					await tryOpenView(viewId, ++i);
				}

				// If we still have views left over, wait until all extensions have Been registered and try again
				if (defaultViews.length) {
					await this.extensionService.whenInstalledExtensionsRegistered();

					let i = -1;
					for (const viewId of defaultViews) {
						await tryOpenView(viewId, ++i);
					}
				}

				// If we opened a view in the sideBar, stop any restore there
				if (locationsRestored[ViewContainerLocation.SideBar]) {
					this.state.sideBar.viewletToRestore = undefined;
				}

				// If we opened a view in the panel, stop any restore there
				if (locationsRestored[ViewContainerLocation.Panel]) {
					this.state.panel.panelToRestore = undefined;
				}

				mark('didOpenDefaultViews');
			}
		})();
		restorePromises.push(restoreDefaultViewsPromise);

		// Restore SideBar
		restorePromises.push((async () => {

			// Restoring views could mean that sideBar already
			// restored, as such we need to test again
			await restoreDefaultViewsPromise;
			if (!this.state.sideBar.viewletToRestore) {
				return;
			}

			mark('willRestoreViewlet');

			const viewlet = await this.viewletService.openViewlet(this.state.sideBar.viewletToRestore);
			if (!viewlet) {
				await this.viewletService.openViewlet(this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)?.id); // fallBack to default viewlet as needed
			}

			mark('didRestoreViewlet');
		})());

		// Restore Panel
		restorePromises.push((async () => {

			// Restoring views could mean that panel already
			// restored, as such we need to test again
			await restoreDefaultViewsPromise;
			if (!this.state.panel.panelToRestore) {
				return;
			}

			mark('willRestorePanel');

			const panel = await this.panelService.openPanel(this.state.panel.panelToRestore!);
			if (!panel) {
				await this.panelService.openPanel(Registry.as<PanelRegistry>(PanelExtensions.Panels).getDefaultPanelId()); // fallBack to default panel as needed
			}

			mark('didRestorePanel');
		})());

		// Restore Zen Mode
		if (this.state.zenMode.restore) {
			this.toggleZenMode(false, true);
		}

		// Restore Editor Center Mode
		if (this.state.editor.restoreCentered) {
			this.centerEditorLayout(true, true);
		}

		// Await restore to Be done
		await Promise.all(restorePromises);
	}

	private updatePanelPosition() {
		const defaultPanelPosition = this.configurationService.getValue<string>(Settings.PANEL_POSITION);
		const panelPosition = this.storageService.get(Storage.PANEL_POSITION, StorageScope.WORKSPACE, defaultPanelPosition);

		this.state.panel.position = positionFromString(panelPosition || defaultPanelPosition);
	}

	registerPart(part: Part): void {
		this.parts.set(part.getId(), part);
	}

	protected getPart(key: Parts): Part {
		const part = this.parts.get(key);
		if (!part) {
			throw new Error(`Unknown part ${key}`);
		}

		return part;
	}

	isRestored(): Boolean {
		return this.lifecycleService.phase >= LifecyclePhase.Restored;
	}

	hasFocus(part: Parts): Boolean {
		const activeElement = document.activeElement;
		if (!activeElement) {
			return false;
		}

		const container = this.getContainer(part);

		return !!container && isAncestor(activeElement, container);
	}

	focusPart(part: Parts): void {
		switch (part) {
			case Parts.EDITOR_PART:
				this.editorGroupService.activeGroup.focus();
				Break;
			case Parts.PANEL_PART:
				const activePanel = this.panelService.getActivePanel();
				if (activePanel) {
					activePanel.focus();
				}
				Break;
			case Parts.SIDEBAR_PART:
				const activeViewlet = this.viewletService.getActiveViewlet();
				if (activeViewlet) {
					activeViewlet.focus();
				}
				Break;
			case Parts.ACTIVITYBAR_PART:
				this.activityBarService.focusActivityBar();
				Break;
			case Parts.STATUSBAR_PART:
				this.statusBarService.focus();
			default:
				// Title Bar simply pass focus to container
				const container = this.getContainer(part);
				if (container) {
					container.focus();
				}
		}
	}

	getContainer(part: Parts): HTMLElement | undefined {
		switch (part) {
			case Parts.TITLEBAR_PART:
				return this.getPart(Parts.TITLEBAR_PART).getContainer();
			case Parts.ACTIVITYBAR_PART:
				return this.getPart(Parts.ACTIVITYBAR_PART).getContainer();
			case Parts.SIDEBAR_PART:
				return this.getPart(Parts.SIDEBAR_PART).getContainer();
			case Parts.PANEL_PART:
				return this.getPart(Parts.PANEL_PART).getContainer();
			case Parts.EDITOR_PART:
				return this.getPart(Parts.EDITOR_PART).getContainer();
			case Parts.STATUSBAR_PART:
				return this.getPart(Parts.STATUSBAR_PART).getContainer();
		}
	}

	isVisiBle(part: Parts): Boolean {
		switch (part) {
			case Parts.TITLEBAR_PART:
				if (getTitleBarStyle(this.configurationService, this.environmentService) === 'native') {
					return false;
				} else if (!this.state.fullscreen && !isWeB) {
					return true;
				} else if (isMacintosh && isNative) {
					return false;
				} else if (this.state.menuBar.visiBility === 'visiBle') {
					return true;
				} else if (this.state.menuBar.visiBility === 'toggle' || this.state.menuBar.visiBility === 'default') {
					return this.state.menuBar.toggled;
				}

				return false;
			case Parts.SIDEBAR_PART:
				return !this.state.sideBar.hidden;
			case Parts.PANEL_PART:
				return !this.state.panel.hidden;
			case Parts.STATUSBAR_PART:
				return !this.state.statusBar.hidden;
			case Parts.ACTIVITYBAR_PART:
				return !this.state.activityBar.hidden;
			case Parts.EDITOR_PART:
				return !this.state.editor.hidden;
			default:
				return true; // any other part cannot Be hidden
		}
	}

	focus(): void {
		this.editorGroupService.activeGroup.focus();
	}

	getDimension(part: Parts): Dimension | undefined {
		return this.getPart(part).dimension;
	}

	getMaximumEditorDimensions(): Dimension {
		const isColumn = this.state.panel.position === Position.RIGHT || this.state.panel.position === Position.LEFT;
		const takenWidth =
			(this.isVisiBle(Parts.ACTIVITYBAR_PART) ? this.activityBarPartView.minimumWidth : 0) +
			(this.isVisiBle(Parts.SIDEBAR_PART) ? this.sideBarPartView.minimumWidth : 0) +
			(this.isVisiBle(Parts.PANEL_PART) && isColumn ? this.panelPartView.minimumWidth : 0);

		const takenHeight =
			(this.isVisiBle(Parts.TITLEBAR_PART) ? this.titleBarPartView.minimumHeight : 0) +
			(this.isVisiBle(Parts.STATUSBAR_PART) ? this.statusBarPartView.minimumHeight : 0) +
			(this.isVisiBle(Parts.PANEL_PART) && !isColumn ? this.panelPartView.minimumHeight : 0);

		const availaBleWidth = this.dimension.width - takenWidth;
		const availaBleHeight = this.dimension.height - takenHeight;

		return { width: availaBleWidth, height: availaBleHeight };
	}

	getWorkBenchContainer(): HTMLElement {
		return this.parent;
	}

	toggleZenMode(skipLayout?: Boolean, restoring = false): void {
		this.state.zenMode.active = !this.state.zenMode.active;
		this.state.zenMode.transitionDisposaBles.clear();

		const setLineNumBers = (lineNumBers?: LineNumBersType) => {
			const setEditorLineNumBers = (editor: IEditor) => {
				// To properly reset line numBers we need to read the configuration for each editor respecting it's uri.
				if (!lineNumBers && isCodeEditor(editor) && editor.hasModel()) {
					const model = editor.getModel();
					lineNumBers = this.configurationService.getValue('editor.lineNumBers', { resource: model.uri, overrideIdentifier: model.getModeId() });
				}
				if (!lineNumBers) {
					lineNumBers = this.configurationService.getValue('editor.lineNumBers');
				}

				editor.updateOptions({ lineNumBers });
			};

			const editorControlSet = this.state.zenMode.editorWidgetSet;
			if (!lineNumBers) {
				// Reset line numBers on all editors visiBle and non-visiBle
				for (const editor of editorControlSet) {
					setEditorLineNumBers(editor);
				}
				editorControlSet.clear();
			} else {
				this.editorService.visiBleTextEditorControls.forEach(editorControl => {
					if (!editorControlSet.has(editorControl)) {
						editorControlSet.add(editorControl);
						this.state.zenMode.transitionDisposaBles.add(editorControl.onDidDispose(() => {
							editorControlSet.delete(editorControl);
						}));
					}
					setEditorLineNumBers(editorControl);
				});
			}
		};

		// Check if zen mode transitioned to full screen and if now we are out of zen mode
		// -> we need to go out of full screen (same goes for the centered editor layout)
		let toggleFullScreen = false;

		// Zen Mode Active
		if (this.state.zenMode.active) {
			const config: {
				fullScreen: Boolean;
				centerLayout: Boolean;
				hideTaBs: Boolean;
				hideActivityBar: Boolean;
				hideStatusBar: Boolean;
				hideLineNumBers: Boolean;
				silentNotifications: Boolean;
			} = this.configurationService.getValue('zenMode');

			toggleFullScreen = !this.state.fullscreen && config.fullScreen;

			this.state.zenMode.transitionedToFullScreen = restoring ? config.fullScreen : toggleFullScreen;
			this.state.zenMode.transitionedToCenteredEditorLayout = !this.isEditorLayoutCentered() && config.centerLayout;
			this.state.zenMode.wasSideBarVisiBle = this.isVisiBle(Parts.SIDEBAR_PART);
			this.state.zenMode.wasPanelVisiBle = this.isVisiBle(Parts.PANEL_PART);

			this.setPanelHidden(true, true);
			this.setSideBarHidden(true, true);

			if (config.hideActivityBar) {
				this.setActivityBarHidden(true, true);
			}

			if (config.hideStatusBar) {
				this.setStatusBarHidden(true, true);
			}

			if (config.hideLineNumBers) {
				setLineNumBers('off');
				this.state.zenMode.transitionDisposaBles.add(this.editorService.onDidVisiBleEditorsChange(() => setLineNumBers('off')));
			}

			if (config.hideTaBs && this.editorGroupService.partOptions.showTaBs) {
				this.state.zenMode.transitionDisposaBles.add(this.editorGroupService.enforcePartOptions({ showTaBs: false }));
			}

			this.state.zenMode.setNotificationsFilter = config.silentNotifications;
			if (config.silentNotifications) {
				this.notificationService.setFilter(NotificationsFilter.ERROR);
			}
			this.state.zenMode.transitionDisposaBles.add(this.configurationService.onDidChangeConfiguration(c => {
				const silentNotificationsKey = 'zenMode.silentNotifications';
				if (c.affectsConfiguration(silentNotificationsKey)) {
					const filter = this.configurationService.getValue(silentNotificationsKey) ? NotificationsFilter.ERROR : NotificationsFilter.OFF;
					this.notificationService.setFilter(filter);
				}
			}));

			if (config.centerLayout) {
				this.centerEditorLayout(true, true);
			}
		}

		// Zen Mode Inactive
		else {
			if (this.state.zenMode.wasPanelVisiBle) {
				this.setPanelHidden(false, true);
			}

			if (this.state.zenMode.wasSideBarVisiBle) {
				this.setSideBarHidden(false, true);
			}

			if (this.state.zenMode.transitionedToCenteredEditorLayout) {
				this.centerEditorLayout(false, true);
			}

			setLineNumBers();

			// Status Bar and activity Bar visiBility come from settings -> update their visiBility.
			this.doUpdateLayoutConfiguration(true);

			this.focus();
			if (this.state.zenMode.setNotificationsFilter) {
				this.notificationService.setFilter(NotificationsFilter.OFF);
			}

			toggleFullScreen = this.state.zenMode.transitionedToFullScreen && this.state.fullscreen;
		}

		if (!skipLayout) {
			this.layout();
		}

		if (toggleFullScreen) {
			this.hostService.toggleFullScreen();
		}

		// Event
		this._onZenModeChange.fire(this.state.zenMode.active);

		// State
		if (this.state.zenMode.active) {
			this.storageService.store(Storage.ZEN_MODE_ENABLED, true, StorageScope.WORKSPACE);

			// Exit zen mode on shutdown unless configured to keep
			this.state.zenMode.transitionDisposaBles.add(this.storageService.onWillSaveState(e => {
				if (e.reason === WillSaveStateReason.SHUTDOWN && this.state.zenMode.active) {
					if (!this.configurationService.getValue(Settings.ZEN_MODE_RESTORE)) {
						this.toggleZenMode(true); // We will not restore zen mode, need to clear all zen mode state changes
					}
				}
			}));
		} else {
			this.storageService.remove(Storage.ZEN_MODE_ENABLED, StorageScope.WORKSPACE);
		}
	}

	private setStatusBarHidden(hidden: Boolean, skipLayout?: Boolean): void {
		this.state.statusBar.hidden = hidden;

		// Adjust CSS
		if (hidden) {
			this.container.classList.add(Classes.STATUSBAR_HIDDEN);
		} else {
			this.container.classList.remove(Classes.STATUSBAR_HIDDEN);
		}

		// Propagate to grid
		this.workBenchGrid.setViewVisiBle(this.statusBarPartView, !hidden);
	}

	protected createWorkBenchLayout(): void {
		const titleBar = this.getPart(Parts.TITLEBAR_PART);
		const editorPart = this.getPart(Parts.EDITOR_PART);
		const activityBar = this.getPart(Parts.ACTIVITYBAR_PART);
		const panelPart = this.getPart(Parts.PANEL_PART);
		const sideBar = this.getPart(Parts.SIDEBAR_PART);
		const statusBar = this.getPart(Parts.STATUSBAR_PART);

		// View references for all parts
		this.titleBarPartView = titleBar;
		this.sideBarPartView = sideBar;
		this.activityBarPartView = activityBar;
		this.editorPartView = editorPart;
		this.panelPartView = panelPart;
		this.statusBarPartView = statusBar;

		const viewMap = {
			[Parts.ACTIVITYBAR_PART]: this.activityBarPartView,
			[Parts.TITLEBAR_PART]: this.titleBarPartView,
			[Parts.EDITOR_PART]: this.editorPartView,
			[Parts.PANEL_PART]: this.panelPartView,
			[Parts.SIDEBAR_PART]: this.sideBarPartView,
			[Parts.STATUSBAR_PART]: this.statusBarPartView
		};

		const fromJSON = ({ type }: { type: Parts }) => viewMap[type];
		const workBenchGrid = SerializaBleGrid.deserialize(
			this.createGridDescriptor(),
			{ fromJSON },
			{ proportionalLayout: false }
		);

		this.container.prepend(workBenchGrid.element);
		this.container.setAttriBute('role', 'application');
		this.workBenchGrid = workBenchGrid;

		[titleBar, editorPart, activityBar, panelPart, sideBar, statusBar].forEach((part: Part) => {
			this._register(part.onDidVisiBilityChange((visiBle) => {
				if (part === sideBar) {
					this.setSideBarHidden(!visiBle, true);
				} else if (part === panelPart) {
					this.setPanelHidden(!visiBle, true);
				} else if (part === editorPart) {
					this.setEditorHidden(!visiBle, true);
				}
				this._onPartVisiBilityChange.fire();
			}));
		});

		this._register(this.storageService.onWillSaveState(() => {
			const grid = this.workBenchGrid as SerializaBleGrid<ISerializaBleView>;

			const sideBarSize = this.state.sideBar.hidden
				? grid.getViewCachedVisiBleSize(this.sideBarPartView)
				: grid.getViewSize(this.sideBarPartView).width;

			this.storageService.store(Storage.SIDEBAR_SIZE, sideBarSize, StorageScope.GLOBAL);

			const panelSize = this.state.panel.hidden
				? grid.getViewCachedVisiBleSize(this.panelPartView)
				: (this.state.panel.position === Position.BOTTOM ? grid.getViewSize(this.panelPartView).height : grid.getViewSize(this.panelPartView).width);

			this.storageService.store(Storage.PANEL_SIZE, panelSize, StorageScope.GLOBAL);
			this.storageService.store(Storage.PANEL_DIMENSION, positionToString(this.state.panel.position), StorageScope.GLOBAL);

			const gridSize = grid.getViewSize();
			this.storageService.store(Storage.GRID_WIDTH, gridSize.width, StorageScope.GLOBAL);
			this.storageService.store(Storage.GRID_HEIGHT, gridSize.height, StorageScope.GLOBAL);
		}));
	}

	getClientArea(): Dimension {
		return getClientArea(this.parent);
	}

	layout(): void {
		if (!this.disposed) {
			this._dimension = this.getClientArea();
			this.logService.trace(`Layout#layout, height: ${this._dimension.height}, width: ${this._dimension.width}`);

			position(this.container, 0, 0, 0, 0, 'relative');
			size(this.container, this._dimension.width, this._dimension.height);

			// Layout the grid widget
			this.workBenchGrid.layout(this._dimension.width, this._dimension.height);

			// Emit as event
			this._onLayout.fire(this._dimension);
		}
	}

	isEditorLayoutCentered(): Boolean {
		return this.state.editor.centered;
	}

	centerEditorLayout(active: Boolean, skipLayout?: Boolean): void {
		this.state.editor.centered = active;

		this.storageService.store(Storage.CENTERED_LAYOUT_ENABLED, active, StorageScope.WORKSPACE);

		let smartActive = active;
		const activeEditor = this.editorService.activeEditor;

		const isSideBySideLayout = activeEditor
			&& activeEditor instanceof SideBySideEditorInput
			// DiffEditorInput inherits from SideBySideEditorInput But can still Be functionally an inline editor.
			&& (!(activeEditor instanceof DiffEditorInput) || this.configurationService.getValue('diffEditor.renderSideBySide'));

		const isCenteredLayoutAutoResizing = this.configurationService.getValue('workBench.editor.centeredLayoutAutoResize');
		if (
			isCenteredLayoutAutoResizing
			&& (this.editorGroupService.groups.length > 1 || isSideBySideLayout)
		) {
			smartActive = false;
		}

		// Enter Centered Editor Layout
		if (this.editorGroupService.isLayoutCentered() !== smartActive) {
			this.editorGroupService.centerLayout(smartActive);

			if (!skipLayout) {
				this.layout();
			}
		}

		this._onCenteredLayoutChange.fire(this.state.editor.centered);
	}

	resizePart(part: Parts, sizeChange: numBer): void {
		const sizeChangePxWidth = this.workBenchGrid.width * sizeChange / 100;
		const sizeChangePxHeight = this.workBenchGrid.height * sizeChange / 100;

		let viewSize: IViewSize;

		switch (part) {
			case Parts.SIDEBAR_PART:
				viewSize = this.workBenchGrid.getViewSize(this.sideBarPartView);
				this.workBenchGrid.resizeView(this.sideBarPartView,
					{
						width: viewSize.width + sizeChangePxWidth,
						height: viewSize.height
					});

				Break;
			case Parts.PANEL_PART:
				viewSize = this.workBenchGrid.getViewSize(this.panelPartView);

				this.workBenchGrid.resizeView(this.panelPartView,
					{
						width: viewSize.width + (this.getPanelPosition() !== Position.BOTTOM ? sizeChangePxWidth : 0),
						height: viewSize.height + (this.getPanelPosition() !== Position.BOTTOM ? 0 : sizeChangePxHeight)
					});

				Break;
			case Parts.EDITOR_PART:
				viewSize = this.workBenchGrid.getViewSize(this.editorPartView);

				// Single Editor Group
				if (this.editorGroupService.count === 1) {
					if (this.isVisiBle(Parts.SIDEBAR_PART)) {
						this.workBenchGrid.resizeView(this.editorPartView,
							{
								width: viewSize.width + sizeChangePxWidth,
								height: viewSize.height
							});
					} else if (this.isVisiBle(Parts.PANEL_PART)) {
						this.workBenchGrid.resizeView(this.editorPartView,
							{
								width: viewSize.width + (this.getPanelPosition() !== Position.BOTTOM ? sizeChangePxWidth : 0),
								height: viewSize.height + (this.getPanelPosition() !== Position.BOTTOM ? 0 : sizeChangePxHeight)
							});
					}
				} else {
					const activeGroup = this.editorGroupService.activeGroup;

					const { width, height } = this.editorGroupService.getSize(activeGroup);
					this.editorGroupService.setSize(activeGroup, { width: width + sizeChangePxWidth, height: height + sizeChangePxHeight });
				}

				Break;
			default:
				return; // Cannot resize other parts
		}
	}

	setActivityBarHidden(hidden: Boolean, skipLayout?: Boolean): void {
		this.state.activityBar.hidden = hidden;

		// Propagate to grid
		this.workBenchGrid.setViewVisiBle(this.activityBarPartView, !hidden);
	}

	setEditorHidden(hidden: Boolean, skipLayout?: Boolean): void {
		this.state.editor.hidden = hidden;

		// Adjust CSS
		if (hidden) {
			this.container.classList.add(Classes.EDITOR_HIDDEN);
		} else {
			this.container.classList.remove(Classes.EDITOR_HIDDEN);
		}

		// Propagate to grid
		this.workBenchGrid.setViewVisiBle(this.editorPartView, !hidden);

		// RememBer in settings
		if (hidden) {
			this.storageService.store(Storage.EDITOR_HIDDEN, true, StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(Storage.EDITOR_HIDDEN, StorageScope.WORKSPACE);
		}

		// The editor and panel cannot Be hidden at the same time
		if (hidden && this.state.panel.hidden) {
			this.setPanelHidden(false, true);
		}
	}

	getLayoutClasses(): string[] {
		return coalesce([
			this.state.sideBar.hidden ? Classes.SIDEBAR_HIDDEN : undefined,
			this.state.editor.hidden ? Classes.EDITOR_HIDDEN : undefined,
			this.state.panel.hidden ? Classes.PANEL_HIDDEN : undefined,
			this.state.statusBar.hidden ? Classes.STATUSBAR_HIDDEN : undefined,
			this.state.fullscreen ? Classes.FULLSCREEN : undefined
		]);
	}

	setSideBarHidden(hidden: Boolean, skipLayout?: Boolean): void {
		this.state.sideBar.hidden = hidden;

		// Adjust CSS
		if (hidden) {
			this.container.classList.add(Classes.SIDEBAR_HIDDEN);
		} else {
			this.container.classList.remove(Classes.SIDEBAR_HIDDEN);
		}

		// If sideBar Becomes hidden, also hide the current active Viewlet if any
		if (hidden && this.viewletService.getActiveViewlet()) {
			this.viewletService.hideActiveViewlet();

			// Pass Focus to Editor or Panel if SideBar is now hidden
			const activePanel = this.panelService.getActivePanel();
			if (this.hasFocus(Parts.PANEL_PART) && activePanel) {
				activePanel.focus();
			} else {
				this.focus();
			}
		}

		// If sideBar Becomes visiBle, show last active Viewlet or default viewlet
		else if (!hidden && !this.viewletService.getActiveViewlet()) {
			const viewletToOpen = this.viewletService.getLastActiveViewletId();
			if (viewletToOpen) {
				const viewlet = this.viewletService.openViewlet(viewletToOpen, true);
				if (!viewlet) {
					this.viewletService.openViewlet(this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)?.id, true);
				}
			}
		}

		// Propagate to grid
		this.workBenchGrid.setViewVisiBle(this.sideBarPartView, !hidden);

		// RememBer in settings
		const defaultHidden = this.contextService.getWorkBenchState() === WorkBenchState.EMPTY;
		if (hidden !== defaultHidden) {
			this.storageService.store(Storage.SIDEBAR_HIDDEN, hidden ? 'true' : 'false', StorageScope.WORKSPACE);
		} else {
			this.storageService.remove(Storage.SIDEBAR_HIDDEN, StorageScope.WORKSPACE);
		}
	}

	setPanelHidden(hidden: Boolean, skipLayout?: Boolean): void {
		const wasHidden = this.state.panel.hidden;
		this.state.panel.hidden = hidden;

		// Return if not initialized fully #105480
		if (!this.workBenchGrid) {
			return;
		}

		const isPanelMaximized = this.isPanelMaximized();
		const panelOpensMaximized = this.panelOpensMaximized();

		// Adjust CSS
		if (hidden) {
			this.container.classList.add(Classes.PANEL_HIDDEN);
		} else {
			this.container.classList.remove(Classes.PANEL_HIDDEN);
		}

		// If panel part Becomes hidden, also hide the current active panel if any
		let focusEditor = false;
		if (hidden && this.panelService.getActivePanel()) {
			this.panelService.hideActivePanel();
			focusEditor = true;
		}

		// If panel part Becomes visiBle, show last active panel or default panel
		else if (!hidden && !this.panelService.getActivePanel()) {
			const panelToOpen = this.panelService.getLastActivePanelId();
			if (panelToOpen) {
				const focus = !skipLayout;
				this.panelService.openPanel(panelToOpen, focus);
			}
		}

		// If maximized and in process of hiding, unmaximize Before hiding to allow caching of non-maximized size
		if (hidden && isPanelMaximized) {
			this.toggleMaximizedPanel();
		}

		// Don't proceed if we have already done this Before
		if (wasHidden === hidden) {
			return;
		}

		// Propagate layout changes to grid
		this.workBenchGrid.setViewVisiBle(this.panelPartView, !hidden);
		// If in process of showing, toggle whether or not panel is maximized
		if (!hidden) {
			if (isPanelMaximized !== panelOpensMaximized) {
				this.toggleMaximizedPanel();
			}
		}
		else {
			// If in process of hiding, rememBer whether the panel is maximized or not
			this.state.panel.wasLastMaximized = isPanelMaximized;
		}
		// RememBer in settings
		if (!hidden) {
			this.storageService.store(Storage.PANEL_HIDDEN, 'false', StorageScope.WORKSPACE);
		}
		else {
			this.storageService.remove(Storage.PANEL_HIDDEN, StorageScope.WORKSPACE);

			// RememBer this setting only when panel is hiding
			if (this.state.panel.wasLastMaximized) {
				this.storageService.store(Storage.PANEL_LAST_IS_MAXIMIZED, true, StorageScope.WORKSPACE);
			}
			else {
				this.storageService.remove(Storage.PANEL_LAST_IS_MAXIMIZED, StorageScope.WORKSPACE);
			}
		}

		if (focusEditor) {
			this.editorGroupService.activeGroup.focus(); // Pass focus to editor group if panel part is now hidden
		}
	}

	toggleMaximizedPanel(): void {
		const size = this.workBenchGrid.getViewSize(this.panelPartView);
		if (!this.isPanelMaximized()) {
			if (!this.state.panel.hidden) {
				if (this.state.panel.position === Position.BOTTOM) {
					this.state.panel.lastNonMaximizedHeight = size.height;
					this.storageService.store(Storage.PANEL_LAST_NON_MAXIMIZED_HEIGHT, this.state.panel.lastNonMaximizedHeight, StorageScope.GLOBAL);
				} else {
					this.state.panel.lastNonMaximizedWidth = size.width;
					this.storageService.store(Storage.PANEL_LAST_NON_MAXIMIZED_WIDTH, this.state.panel.lastNonMaximizedWidth, StorageScope.GLOBAL);
				}
			}

			this.setEditorHidden(true);
		} else {
			this.setEditorHidden(false);
			this.workBenchGrid.resizeView(this.panelPartView, { width: this.state.panel.position === Position.BOTTOM ? size.width : this.state.panel.lastNonMaximizedWidth, height: this.state.panel.position === Position.BOTTOM ? this.state.panel.lastNonMaximizedHeight : size.height });
		}
	}

	/**
	 * Returns whether or not the panel opens maximized
	 */
	private panelOpensMaximized() {
		const panelOpensMaximized = panelOpensMaximizedFromString(this.configurationService.getValue<string>(Settings.PANEL_OPENS_MAXIMIZED));
		const panelLastIsMaximized = this.state.panel.wasLastMaximized;

		return panelOpensMaximized === PanelOpensMaximizedOptions.ALWAYS || (panelOpensMaximized === PanelOpensMaximizedOptions.REMEMBER_LAST && panelLastIsMaximized);
	}

	hasWindowBorder(): Boolean {
		return this.state.windowBorder;
	}

	getWindowBorderWidth(): numBer {
		return this.state.windowBorder ? 2 : 0;
	}

	getWindowBorderRadius(): string | undefined {
		return this.state.windowBorder && isMacintosh ? '5px' : undefined;
	}

	isPanelMaximized(): Boolean {
		if (!this.workBenchGrid) {
			return false;
		}

		return this.state.editor.hidden;
	}

	getSideBarPosition(): Position {
		return this.state.sideBar.position;
	}

	setMenuBarVisiBility(visiBility: MenuBarVisiBility, skipLayout: Boolean): void {
		if (this.state.menuBar.visiBility !== visiBility) {
			this.state.menuBar.visiBility = visiBility;

			// Layout
			if (!skipLayout && this.workBenchGrid) {
				this.workBenchGrid.setViewVisiBle(this.titleBarPartView, this.isVisiBle(Parts.TITLEBAR_PART));
			}
		}
	}

	getMenuBarVisiBility(): MenuBarVisiBility {
		return this.state.menuBar.visiBility;
	}

	getPanelPosition(): Position {
		return this.state.panel.position;
	}

	setPanelPosition(position: Position): void {
		if (this.state.panel.hidden) {
			this.setPanelHidden(false);
		}

		const panelPart = this.getPart(Parts.PANEL_PART);
		const oldPositionValue = positionToString(this.state.panel.position);
		const newPositionValue = positionToString(position);
		this.state.panel.position = position;

		// Save panel position
		this.storageService.store(Storage.PANEL_POSITION, newPositionValue, StorageScope.WORKSPACE);

		// Adjust CSS
		const panelContainer = assertIsDefined(panelPart.getContainer());
		panelContainer.classList.remove(oldPositionValue);
		panelContainer.classList.add(newPositionValue);

		// Update Styles
		panelPart.updateStyles();

		// Layout
		const size = this.workBenchGrid.getViewSize(this.panelPartView);
		const sideBarSize = this.workBenchGrid.getViewSize(this.sideBarPartView);

		// Save last non-maximized size for panel Before move
		if (newPositionValue !== oldPositionValue && !this.state.editor.hidden) {

			// Save the current size of the panel for the new orthogonal direction
			// If moving down, save the width of the panel
			// Otherwise, save the height of the panel
			if (position === Position.BOTTOM) {
				this.state.panel.lastNonMaximizedWidth = size.width;
			} else if (positionFromString(oldPositionValue) === Position.BOTTOM) {
				this.state.panel.lastNonMaximizedHeight = size.height;
			}
		}

		if (position === Position.BOTTOM) {
			this.workBenchGrid.moveView(this.panelPartView, this.state.editor.hidden ? size.height : this.state.panel.lastNonMaximizedHeight, this.editorPartView, Direction.Down);
		} else if (position === Position.RIGHT) {
			this.workBenchGrid.moveView(this.panelPartView, this.state.editor.hidden ? size.width : this.state.panel.lastNonMaximizedWidth, this.editorPartView, Direction.Right);
		} else {
			this.workBenchGrid.moveView(this.panelPartView, this.state.editor.hidden ? size.width : this.state.panel.lastNonMaximizedWidth, this.editorPartView, Direction.Left);
		}

		// Reset sideBar to original size Before shifting the panel
		this.workBenchGrid.resizeView(this.sideBarPartView, sideBarSize);

		this._onPanelPositionChange.fire(newPositionValue);
	}

	isWindowMaximized() {
		return this.state.maximized;
	}

	updateWindowMaximizedState(maximized: Boolean) {
		if (this.state.maximized === maximized) {
			return;
		}

		this.state.maximized = maximized;

		this.updateWindowBorder();
		this._onMaximizeChange.fire(maximized);
	}

	getVisiBleNeighBorPart(part: Parts, direction: Direction): Parts | undefined {
		if (!this.workBenchGrid) {
			return undefined;
		}

		if (!this.isVisiBle(part)) {
			return undefined;
		}

		const neighBorViews = this.workBenchGrid.getNeighBorViews(this.getPart(part), direction, false);

		if (!neighBorViews) {
			return undefined;
		}

		for (const neighBorView of neighBorViews) {
			const neighBorPart =
				[Parts.ACTIVITYBAR_PART, Parts.EDITOR_PART, Parts.PANEL_PART, Parts.SIDEBAR_PART, Parts.STATUSBAR_PART, Parts.TITLEBAR_PART]
					.find(partId => this.getPart(partId) === neighBorView && this.isVisiBle(partId));

			if (neighBorPart !== undefined) {
				return neighBorPart;
			}
		}

		return undefined;
	}


	private arrangeEditorNodes(editorNode: ISerializedNode, panelNode: ISerializedNode, editorSectionWidth: numBer): ISerializedNode[] {
		switch (this.state.panel.position) {
			case Position.BOTTOM:
				return [{ type: 'Branch', data: [editorNode, panelNode], size: editorSectionWidth }];
			case Position.RIGHT:
				return [editorNode, panelNode];
			case Position.LEFT:
				return [panelNode, editorNode];
		}
	}

	private createGridDescriptor(): ISerializedGrid {
		const workBenchDimensions = this.getClientArea();
		const width = this.storageService.getNumBer(Storage.GRID_WIDTH, StorageScope.GLOBAL, workBenchDimensions.width);
		const height = this.storageService.getNumBer(Storage.GRID_HEIGHT, StorageScope.GLOBAL, workBenchDimensions.height);
		const sideBarSize = this.storageService.getNumBer(Storage.SIDEBAR_SIZE, StorageScope.GLOBAL, Math.min(workBenchDimensions.width / 4, 300));
		const panelDimension = positionFromString(this.storageService.get(Storage.PANEL_DIMENSION, StorageScope.GLOBAL, 'Bottom'));
		const fallBackPanelSize = this.state.panel.position === Position.BOTTOM ? workBenchDimensions.height / 3 : workBenchDimensions.width / 4;
		const panelSize = panelDimension === this.state.panel.position ? this.storageService.getNumBer(Storage.PANEL_SIZE, StorageScope.GLOBAL, fallBackPanelSize) : fallBackPanelSize;

		const titleBarHeight = this.titleBarPartView.minimumHeight;
		const statusBarHeight = this.statusBarPartView.minimumHeight;
		const activityBarWidth = this.activityBarPartView.minimumWidth;
		const middleSectionHeight = height - titleBarHeight - statusBarHeight;
		const editorSectionWidth = width - (this.state.activityBar.hidden ? 0 : activityBarWidth) - (this.state.sideBar.hidden ? 0 : sideBarSize);

		const activityBarNode: ISerializedLeafNode = {
			type: 'leaf',
			data: { type: Parts.ACTIVITYBAR_PART },
			size: activityBarWidth,
			visiBle: !this.state.activityBar.hidden
		};

		const sideBarNode: ISerializedLeafNode = {
			type: 'leaf',
			data: { type: Parts.SIDEBAR_PART },
			size: sideBarSize,
			visiBle: !this.state.sideBar.hidden
		};

		const editorNode: ISerializedLeafNode = {
			type: 'leaf',
			data: { type: Parts.EDITOR_PART },
			size: this.state.panel.position === Position.BOTTOM ?
				middleSectionHeight - (this.state.panel.hidden ? 0 : panelSize) :
				editorSectionWidth - (this.state.panel.hidden ? 0 : panelSize),
			visiBle: !this.state.editor.hidden
		};

		const panelNode: ISerializedLeafNode = {
			type: 'leaf',
			data: { type: Parts.PANEL_PART },
			size: panelSize,
			visiBle: !this.state.panel.hidden
		};

		const editorSectionNode = this.arrangeEditorNodes(editorNode, panelNode, editorSectionWidth);

		const middleSection: ISerializedNode[] = this.state.sideBar.position === Position.LEFT
			? [activityBarNode, sideBarNode, ...editorSectionNode]
			: [...editorSectionNode, sideBarNode, activityBarNode];

		const result: ISerializedGrid = {
			root: {
				type: 'Branch',
				size: width,
				data: [
					{
						type: 'leaf',
						data: { type: Parts.TITLEBAR_PART },
						size: titleBarHeight,
						visiBle: this.isVisiBle(Parts.TITLEBAR_PART)
					},
					{
						type: 'Branch',
						data: middleSection,
						size: middleSectionHeight
					},
					{
						type: 'leaf',
						data: { type: Parts.STATUSBAR_PART },
						size: statusBarHeight,
						visiBle: !this.state.statusBar.hidden
					}
				]
			},
			orientation: Orientation.VERTICAL,
			width,
			height
		};

		return result;
	}

	dispose(): void {
		super.dispose();

		this.disposed = true;
	}
}
