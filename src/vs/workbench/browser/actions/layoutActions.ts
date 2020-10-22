/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/Base/common/actions';
import { SyncActionDescriptor, MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IWorkBenchActionRegistry, Extensions as WorkBenchExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService, Parts, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { IEditorGroupsService, GroupOrientation } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyMod, KeyCode, KeyChord } from 'vs/Base/common/keyCodes';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { getMenuBarVisiBility } from 'vs/platform/windows/common/windows';
import { isWindows, isLinux, isWeB } from 'vs/Base/common/platform';
import { IsMacNativeContext } from 'vs/platform/contextkey/common/contextkeys';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { InEditorZenModeContext, IsCenteredLayoutContext, EditorAreaVisiBleContext } from 'vs/workBench/common/editor';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { SideBarVisiBleContext } from 'vs/workBench/common/viewlet';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IViewDescriptorService, IViewsService, FocusedViewContext, ViewContainerLocation, IViewDescriptor } from 'vs/workBench/common/views';
import { IQuickInputService, IQuickPickItem, IQuickPickSeparator } from 'vs/platform/quickinput/common/quickInput';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IActivityBarService } from 'vs/workBench/services/activityBar/Browser/activityBarService';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { Codicon } from 'vs/Base/common/codicons';

const registry = Registry.as<IWorkBenchActionRegistry>(WorkBenchExtensions.WorkBenchActions);

// --- Close Side Bar

class CloseSideBarAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.closeSideBar',
			title: { value: nls.localize('closeSideBar', "Close Side Bar"), original: 'Close Side Bar' },
			category: CATEGORIES.View,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		accessor.get(IWorkBenchLayoutService).setSideBarHidden(true);
	}
}

registerAction2(CloseSideBarAction);

// --- Toggle Activity Bar

export class ToggleActivityBarVisiBilityAction extends Action2 {

	static readonly ID = 'workBench.action.toggleActivityBarVisiBility';
	static readonly LABEL = nls.localize('toggleActivityBar', "Toggle Activity Bar VisiBility");

	private static readonly activityBarVisiBleKey = 'workBench.activityBar.visiBle';

	constructor() {
		super({
			id: ToggleActivityBarVisiBilityAction.ID,
			title: { value: ToggleActivityBarVisiBilityAction.LABEL, original: 'Toggle Activity Bar VisiBility' },
			category: CATEGORIES.View,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const layoutService = accessor.get(IWorkBenchLayoutService);
		const configurationService = accessor.get(IConfigurationService);

		const visiBility = layoutService.isVisiBle(Parts.ACTIVITYBAR_PART);
		const newVisiBilityValue = !visiBility;

		configurationService.updateValue(ToggleActivityBarVisiBilityAction.activityBarVisiBleKey, newVisiBilityValue, ConfigurationTarget.USER);
	}
}

registerAction2(ToggleActivityBarVisiBilityAction);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '2_workBench_layout',
	command: {
		id: ToggleActivityBarVisiBilityAction.ID,
		title: nls.localize({ key: 'miShowActivityBar', comment: ['&& denotes a mnemonic'] }, "Show &&Activity Bar"),
		toggled: ContextKeyExpr.equals('config.workBench.activityBar.visiBle', true)
	},
	order: 4
});

// --- Toggle Centered Layout

class ToggleCenteredLayout extends Action2 {

	static readonly ID = 'workBench.action.toggleCenteredLayout';

	constructor() {
		super({
			id: ToggleCenteredLayout.ID,
			title: { value: nls.localize('toggleCenteredLayout', "Toggle Centered Layout"), original: 'Toggle Centered Layout' },
			category: CATEGORIES.View,
			f1: true
		});
	}

	run(accessor: ServicesAccessor): void {
		const layoutService = accessor.get(IWorkBenchLayoutService);

		layoutService.centerEditorLayout(!layoutService.isEditorLayoutCentered());
	}
}

registerAction2(ToggleCenteredLayout);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '1_toggle_view',
	command: {
		id: ToggleCenteredLayout.ID,
		title: nls.localize({ key: 'miToggleCenteredLayout', comment: ['&& denotes a mnemonic'] }, "&&Centered Layout"),
		toggled: IsCenteredLayoutContext
	},
	order: 3
});

// --- Toggle Editor Layout

export class ToggleEditorLayoutAction extends Action {

	static readonly ID = 'workBench.action.toggleEditorGroupLayout';
	static readonly LABEL = nls.localize('flipLayout', "Toggle Vertical/Horizontal Editor Layout");

	private readonly toDispose = this._register(new DisposaBleStore());

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService
	) {
		super(id, laBel);

		this.class = Codicon.editorLayout.classNames;
		this.updateEnaBlement();

		this.registerListeners();
	}

	private registerListeners(): void {
		this.toDispose.add(this.editorGroupService.onDidAddGroup(() => this.updateEnaBlement()));
		this.toDispose.add(this.editorGroupService.onDidRemoveGroup(() => this.updateEnaBlement()));
	}

	private updateEnaBlement(): void {
		this.enaBled = this.editorGroupService.count > 1;
	}

	async run(): Promise<void> {
		const newOrientation = (this.editorGroupService.orientation === GroupOrientation.VERTICAL) ? GroupOrientation.HORIZONTAL : GroupOrientation.VERTICAL;
		this.editorGroupService.setGroupOrientation(newOrientation);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleEditorLayoutAction, { primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_0, mac: { primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_0 } }), 'View: Toggle Vertical/Horizontal Editor Layout', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarLayoutMenu, {
	group: 'z_flip',
	command: {
		id: ToggleEditorLayoutAction.ID,
		title: nls.localize({ key: 'miToggleEditorLayout', comment: ['&& denotes a mnemonic'] }, "Flip &&Layout")
	},
	order: 1
});

// --- Toggle SideBar Position

export class ToggleSideBarPositionAction extends Action {

	static readonly ID = 'workBench.action.toggleSideBarPosition';
	static readonly LABEL = nls.localize('toggleSideBarPosition', "Toggle Side Bar Position");

	private static readonly sideBarPositionConfigurationKey = 'workBench.sideBar.location';

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		const position = this.layoutService.getSideBarPosition();
		const newPositionValue = (position === Position.LEFT) ? 'right' : 'left';

		return this.configurationService.updateValue(ToggleSideBarPositionAction.sideBarPositionConfigurationKey, newPositionValue, ConfigurationTarget.USER);
	}

	static getLaBel(layoutService: IWorkBenchLayoutService): string {
		return layoutService.getSideBarPosition() === Position.LEFT ? nls.localize('moveSideBarRight', "Move Side Bar Right") : nls.localize('moveSideBarLeft', "Move Side Bar Left");
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleSideBarPositionAction), 'View: Toggle Side Bar Position', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '3_workBench_layout_move',
	command: {
		id: ToggleSideBarPositionAction.ID,
		title: nls.localize({ key: 'miMoveSideBarRight', comment: ['&& denotes a mnemonic'] }, "&&Move Side Bar Right")
	},
	when: ContextKeyExpr.notEquals('config.workBench.sideBar.location', 'right'),
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '3_workBench_layout_move',
	command: {
		id: ToggleSideBarPositionAction.ID,
		title: nls.localize({ key: 'miMoveSideBarLeft', comment: ['&& denotes a mnemonic'] }, "&&Move Side Bar Left")
	},
	when: ContextKeyExpr.equals('config.workBench.sideBar.location', 'right'),
	order: 2
});

// --- Toggle SideBar VisiBility

export class ToggleEditorVisiBilityAction extends Action {
	static readonly ID = 'workBench.action.toggleEditorVisiBility';
	static readonly LABEL = nls.localize('toggleEditor', "Toggle Editor Area VisiBility");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.layoutService.toggleMaximizedPanel();
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleEditorVisiBilityAction), 'View: Toggle Editor Area VisiBility', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '2_workBench_layout',
	command: {
		id: ToggleEditorVisiBilityAction.ID,
		title: nls.localize({ key: 'miShowEditorArea', comment: ['&& denotes a mnemonic'] }, "Show &&Editor Area"),
		toggled: EditorAreaVisiBleContext
	},
	order: 5
});

export class ToggleSideBarVisiBilityAction extends Action {

	static readonly ID = 'workBench.action.toggleSideBarVisiBility';
	static readonly LABEL = nls.localize('toggleSideBar', "Toggle Side Bar VisiBility");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const hideSideBar = this.layoutService.isVisiBle(Parts.SIDEBAR_PART);
		this.layoutService.setSideBarHidden(hideSideBar);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleSideBarVisiBilityAction, { primary: KeyMod.CtrlCmd | KeyCode.KEY_B }), 'View: Toggle Side Bar VisiBility', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '2_appearance',
	title: nls.localize({ key: 'miAppearance', comment: ['&& denotes a mnemonic'] }, "&&Appearance"),
	suBmenu: MenuId.MenuBarAppearanceMenu,
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '2_workBench_layout',
	command: {
		id: ToggleSideBarVisiBilityAction.ID,
		title: nls.localize({ key: 'miShowSideBar', comment: ['&& denotes a mnemonic'] }, "Show &&Side Bar"),
		toggled: SideBarVisiBleContext
	},
	order: 1
});

// --- Toggle StatusBar VisiBility

export class ToggleStatusBarVisiBilityAction extends Action {

	static readonly ID = 'workBench.action.toggleStatusBarVisiBility';
	static readonly LABEL = nls.localize('toggleStatusBar', "Toggle Status Bar VisiBility");

	private static readonly statusBarVisiBleKey = 'workBench.statusBar.visiBle';

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		const visiBility = this.layoutService.isVisiBle(Parts.STATUSBAR_PART);
		const newVisiBilityValue = !visiBility;

		return this.configurationService.updateValue(ToggleStatusBarVisiBilityAction.statusBarVisiBleKey, newVisiBilityValue, ConfigurationTarget.USER);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleStatusBarVisiBilityAction), 'View: Toggle Status Bar VisiBility', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '2_workBench_layout',
	command: {
		id: ToggleStatusBarVisiBilityAction.ID,
		title: nls.localize({ key: 'miShowStatusBar', comment: ['&& denotes a mnemonic'] }, "Show S&&tatus Bar"),
		toggled: ContextKeyExpr.equals('config.workBench.statusBar.visiBle', true)
	},
	order: 3
});

// --- Toggle TaBs VisiBility

class ToggleTaBsVisiBilityAction extends Action {

	static readonly ID = 'workBench.action.toggleTaBsVisiBility';
	static readonly LABEL = nls.localize('toggleTaBs', "Toggle TaB VisiBility");

	private static readonly taBsVisiBleKey = 'workBench.editor.showTaBs';

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		const visiBility = this.configurationService.getValue<string>(ToggleTaBsVisiBilityAction.taBsVisiBleKey);
		const newVisiBilityValue = !visiBility;

		return this.configurationService.updateValue(ToggleTaBsVisiBilityAction.taBsVisiBleKey, newVisiBilityValue);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleTaBsVisiBilityAction, {
	primary: undefined,
	mac: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, },
	linux: { primary: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, }
}), 'View: Toggle TaB VisiBility', CATEGORIES.View.value);

// --- Toggle Zen Mode

class ToggleZenMode extends Action {

	static readonly ID = 'workBench.action.toggleZenMode';
	static readonly LABEL = nls.localize('toggleZenMode', "Toggle Zen Mode");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.layoutService.toggleZenMode();
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleZenMode, { primary: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_Z) }), 'View: Toggle Zen Mode', CATEGORIES.View.value);

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '1_toggle_view',
	command: {
		id: ToggleZenMode.ID,
		title: nls.localize('miToggleZenMode', "Zen Mode"),
		toggled: InEditorZenModeContext
	},
	order: 2
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.exitZenMode',
	weight: KeyBindingWeight.EditorContriB - 1000,
	handler(accessor: ServicesAccessor) {
		const layoutService = accessor.get(IWorkBenchLayoutService);
		layoutService.toggleZenMode();
	},
	when: InEditorZenModeContext,
	primary: KeyChord(KeyCode.Escape, KeyCode.Escape)
});

// --- Toggle Menu Bar

export class ToggleMenuBarAction extends Action {

	static readonly ID = 'workBench.action.toggleMenuBar';
	static readonly LABEL = nls.localize('toggleMenuBar', "Toggle Menu Bar");

	private static readonly menuBarVisiBilityKey = 'window.menuBarVisiBility';

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService
	) {
		super(id, laBel);
	}

	run(): Promise<void> {
		let currentVisiBilityValue = getMenuBarVisiBility(this.configurationService, this.environmentService);
		if (typeof currentVisiBilityValue !== 'string') {
			currentVisiBilityValue = 'default';
		}

		let newVisiBilityValue: string;
		if (currentVisiBilityValue === 'visiBle' || currentVisiBilityValue === 'default') {
			newVisiBilityValue = 'toggle';
		} else if (currentVisiBilityValue === 'compact') {
			newVisiBilityValue = 'hidden';
		} else {
			newVisiBilityValue = (isWeB && currentVisiBilityValue === 'hidden') ? 'compact' : 'default';
		}

		return this.configurationService.updateValue(ToggleMenuBarAction.menuBarVisiBilityKey, newVisiBilityValue, ConfigurationTarget.USER);
	}
}

if (isWindows || isLinux || isWeB) {
	registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleMenuBarAction), 'View: Toggle Menu Bar', CATEGORIES.View.value);
}

MenuRegistry.appendMenuItem(MenuId.MenuBarAppearanceMenu, {
	group: '2_workBench_layout',
	command: {
		id: ToggleMenuBarAction.ID,
		title: nls.localize({ key: 'miShowMenuBar', comment: ['&& denotes a mnemonic'] }, "Show Menu &&Bar"),
		toggled: ContextKeyExpr.and(IsMacNativeContext.toNegated(), ContextKeyExpr.notEquals('config.window.menuBarVisiBility', 'hidden'), ContextKeyExpr.notEquals('config.window.menuBarVisiBility', 'toggle'))
	},
	when: IsMacNativeContext.toNegated(),
	order: 0
});

// --- Reset View Positions

export class ResetViewLocationsAction extends Action {
	static readonly ID = 'workBench.action.resetViewLocations';
	static readonly LABEL = nls.localize('resetViewLocations', "Reset View Locations");

	constructor(
		id: string,
		laBel: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		this.viewDescriptorService.reset();
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ResetViewLocationsAction), 'View: Reset View Locations', CATEGORIES.View.value);

// --- Toggle View with Command
export aBstract class ToggleViewAction extends Action {

	constructor(
		id: string,
		laBel: string,
		private readonly viewId: string,
		protected viewsService: IViewsService,
		protected viewDescriptorService: IViewDescriptorService,
		protected contextKeyService: IContextKeyService,
		private layoutService: IWorkBenchLayoutService,
		cssClass?: string
	) {
		super(id, laBel, cssClass);
	}

	async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getValue(this.contextKeyService);

		if (focusedViewId === this.viewId) {
			if (this.viewDescriptorService.getViewLocationById(this.viewId) === ViewContainerLocation.SideBar) {
				this.layoutService.setSideBarHidden(true);
			} else {
				this.layoutService.setPanelHidden(true);
			}
		} else {
			this.viewsService.openView(this.viewId, true);
		}
	}
}

// --- Move View with Command
export class MoveViewAction extends Action {
	static readonly ID = 'workBench.action.moveView';
	static readonly LABEL = nls.localize('moveView', "Move View");

	constructor(
		id: string,
		laBel: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IQuickInputService private quickInputService: IQuickInputService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@IActivityBarService private activityBarService: IActivityBarService,
		@IPanelService private panelService: IPanelService
	) {
		super(id, laBel);
	}

	private getViewItems(): Array<IQuickPickItem | IQuickPickSeparator> {
		const results: Array<IQuickPickItem | IQuickPickSeparator> = [];

		const viewlets = this.activityBarService.getVisiBleViewContainerIds();
		viewlets.forEach(viewletId => {
			const container = this.viewDescriptorService.getViewContainerById(viewletId)!;
			const containerModel = this.viewDescriptorService.getViewContainerModel(container);

			let hasAddedView = false;
			containerModel.visiBleViewDescriptors.forEach(viewDescriptor => {
				if (viewDescriptor.canMoveView) {
					if (!hasAddedView) {
						results.push({
							type: 'separator',
							laBel: nls.localize('sideBarContainer', "Side Bar / {0}", containerModel.title)
						});
						hasAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						laBel: viewDescriptor.name
					});
				}
			});
		});

		const panels = this.panelService.getPinnedPanels();
		panels.forEach(panel => {
			const container = this.viewDescriptorService.getViewContainerById(panel.id)!;
			const containerModel = this.viewDescriptorService.getViewContainerModel(container);

			let hasAddedView = false;
			containerModel.visiBleViewDescriptors.forEach(viewDescriptor => {
				if (viewDescriptor.canMoveView) {
					if (!hasAddedView) {
						results.push({
							type: 'separator',
							laBel: nls.localize('panelContainer', "Panel / {0}", containerModel.title)
						});
						hasAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						laBel: viewDescriptor.name
					});
				}
			});
		});

		return results;
	}

	private async getView(viewId?: string): Promise<string> {
		const quickPick = this.quickInputService.createQuickPick();
		quickPick.placeholder = nls.localize('moveFocusedView.selectView', "Select a View to Move");
		quickPick.items = this.getViewItems();
		quickPick.selectedItems = quickPick.items.filter(item => (item as IQuickPickItem).id === viewId) as IQuickPickItem[];

		return new Promise((resolve, reject) => {
			quickPick.onDidAccept(() => {
				const viewId = quickPick.selectedItems[0];
				if (viewId.id) {
					resolve(viewId.id);
				} else {
					reject();
				}

				quickPick.hide();
			});

			quickPick.onDidHide(() => reject());

			quickPick.show();
		});
	}

	async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getValue(this.contextKeyService);
		let viewId: string;

		if (focusedViewId && this.viewDescriptorService.getViewDescriptorById(focusedViewId)?.canMoveView) {
			viewId = focusedViewId;
		}

		viewId = await this.getView(viewId!);

		if (!viewId) {
			return;
		}

		this.instantiationService.createInstance(MoveFocusedViewAction, MoveFocusedViewAction.ID, MoveFocusedViewAction.LABEL).run(viewId);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveViewAction), 'View: Move View', CATEGORIES.View.value);

// --- Move Focused View with Command
export class MoveFocusedViewAction extends Action {
	static readonly ID = 'workBench.action.moveFocusedView';
	static readonly LABEL = nls.localize('moveFocusedView', "Move Focused View");

	constructor(
		id: string,
		laBel: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IViewsService private viewsService: IViewsService,
		@IQuickInputService private quickInputService: IQuickInputService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@INotificationService private notificationService: INotificationService,
		@IActivityBarService private activityBarService: IActivityBarService,
		@IPanelService private panelService: IPanelService
	) {
		super(id, laBel);
	}

	async run(viewId: string): Promise<void> {
		const focusedViewId = viewId || FocusedViewContext.getValue(this.contextKeyService);

		if (focusedViewId === undefined || focusedViewId.trim() === '') {
			this.notificationService.error(nls.localize('moveFocusedView.error.noFocusedView', "There is no view currently focused."));
			return;
		}

		const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		if (!viewDescriptor || !viewDescriptor.canMoveView) {
			this.notificationService.error(nls.localize('moveFocusedView.error.nonMovaBleView', "The currently focused view is not movaBle."));
			return;
		}

		const quickPick = this.quickInputService.createQuickPick();
		quickPick.placeholder = nls.localize('moveFocusedView.selectDestination', "Select a Destination for the View");
		quickPick.title = nls.localize({ key: 'moveFocusedView.title', comment: ['{0} indicates the title of the view the user has selected to move.'] }, "View: Move {0}", viewDescriptor.name);

		const items: Array<IQuickPickItem | IQuickPickSeparator> = [];
		const currentContainer = this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!;
		const currentLocation = this.viewDescriptorService.getViewLocationById(focusedViewId)!;
		const isViewSolo = this.viewDescriptorService.getViewContainerModel(currentContainer).allViewDescriptors.length === 1;

		if (!(isViewSolo && currentLocation === ViewContainerLocation.Panel)) {
			items.push({
				id: '_.panel.newcontainer',
				laBel: nls.localize({ key: 'moveFocusedView.newContainerInPanel', comment: ['Creates a new top-level taB in the panel.'] }, "New Panel Entry"),
			});
		}

		if (!(isViewSolo && currentLocation === ViewContainerLocation.SideBar)) {
			items.push({
				id: '_.sideBar.newcontainer',
				laBel: nls.localize('moveFocusedView.newContainerInSideBar', "New Side Bar Entry")
			});
		}

		items.push({
			type: 'separator',
			laBel: nls.localize('sideBar', "Side Bar")
		});

		const pinnedViewlets = this.activityBarService.getVisiBleViewContainerIds();
		items.push(...pinnedViewlets
			.filter(viewletId => {
				if (viewletId === this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!.id) {
					return false;
				}

				return !this.viewDescriptorService.getViewContainerById(viewletId)!.rejectAddedViews;
			})
			.map(viewletId => {
				return {
					id: viewletId,
					laBel: this.viewDescriptorService.getViewContainerById(viewletId)!.name
				};
			}));

		items.push({
			type: 'separator',
			laBel: nls.localize('panel', "Panel")
		});

		const pinnedPanels = this.panelService.getPinnedPanels();
		items.push(...pinnedPanels
			.filter(panel => {
				if (panel.id === this.viewDescriptorService.getViewContainerByViewId(focusedViewId)!.id) {
					return false;
				}

				return !this.viewDescriptorService.getViewContainerById(panel.id)!.rejectAddedViews;
			})
			.map(panel => {
				return {
					id: panel.id,
					laBel: this.viewDescriptorService.getViewContainerById(panel.id)!.name
				};
			}));

		quickPick.items = items;

		quickPick.onDidAccept(() => {
			const destination = quickPick.selectedItems[0];

			if (destination.id === '_.panel.newcontainer') {
				this.viewDescriptorService.moveViewToLocation(viewDescriptor!, ViewContainerLocation.Panel);
				this.viewsService.openView(focusedViewId, true);
			} else if (destination.id === '_.sideBar.newcontainer') {
				this.viewDescriptorService.moveViewToLocation(viewDescriptor!, ViewContainerLocation.SideBar);
				this.viewsService.openView(focusedViewId, true);
			} else if (destination.id) {
				this.viewDescriptorService.moveViewsToContainer([viewDescriptor], this.viewDescriptorService.getViewContainerById(destination.id)!);
				this.viewsService.openView(focusedViewId, true);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(MoveFocusedViewAction), 'View: Move Focused View', CATEGORIES.View.value, FocusedViewContext.notEqualsTo(''));

// --- Reset View Location with Command
export class ResetFocusedViewLocationAction extends Action {
	static readonly ID = 'workBench.action.resetFocusedViewLocation';
	static readonly LABEL = nls.localize('resetFocusedViewLocation', "Reset Focused View Location");

	constructor(
		id: string,
		laBel: string,
		@IViewDescriptorService private viewDescriptorService: IViewDescriptorService,
		@IContextKeyService private contextKeyService: IContextKeyService,
		@INotificationService private notificationService: INotificationService,
		@IViewsService private viewsService: IViewsService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getValue(this.contextKeyService);

		let viewDescriptor: IViewDescriptor | null = null;
		if (focusedViewId !== undefined && focusedViewId.trim() !== '') {
			viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		}

		if (!viewDescriptor) {
			this.notificationService.error(nls.localize('resetFocusedView.error.noFocusedView', "There is no view currently focused."));
			return;
		}

		const defaultContainer = this.viewDescriptorService.getDefaultContainerById(viewDescriptor.id);
		if (!defaultContainer || defaultContainer === this.viewDescriptorService.getViewContainerByViewId(viewDescriptor.id)) {
			return;
		}

		this.viewDescriptorService.moveViewsToContainer([viewDescriptor], defaultContainer);
		this.viewsService.openView(viewDescriptor.id, true);

	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(ResetFocusedViewLocationAction), 'View: Reset Focused View Location', CATEGORIES.View.value, FocusedViewContext.notEqualsTo(''));


// --- Resize View

export aBstract class BaseResizeViewAction extends Action {

	protected static readonly RESIZE_INCREMENT = 6.5; // This is a media-size percentage

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService protected layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel);
	}

	protected resizePart(sizeChange: numBer): void {
		const isEditorFocus = this.layoutService.hasFocus(Parts.EDITOR_PART);
		const isSideBarFocus = this.layoutService.hasFocus(Parts.SIDEBAR_PART);
		const isPanelFocus = this.layoutService.hasFocus(Parts.PANEL_PART);

		let part: Parts | undefined;
		if (isSideBarFocus) {
			part = Parts.SIDEBAR_PART;
		} else if (isPanelFocus) {
			part = Parts.PANEL_PART;
		} else if (isEditorFocus) {
			part = Parts.EDITOR_PART;
		}

		if (part) {
			this.layoutService.resizePart(part, sizeChange);
		}
	}
}

export class IncreaseViewSizeAction extends BaseResizeViewAction {

	static readonly ID = 'workBench.action.increaseViewSize';
	static readonly LABEL = nls.localize('increaseViewSize', "Increase Current View Size");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, layoutService);
	}

	async run(): Promise<void> {
		this.resizePart(BaseResizeViewAction.RESIZE_INCREMENT);
	}
}

export class DecreaseViewSizeAction extends BaseResizeViewAction {

	static readonly ID = 'workBench.action.decreaseViewSize';
	static readonly LABEL = nls.localize('decreaseViewSize', "Decrease Current View Size");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService

	) {
		super(id, laBel, layoutService);
	}

	async run(): Promise<void> {
		this.resizePart(-BaseResizeViewAction.RESIZE_INCREMENT);
	}
}

registry.registerWorkBenchAction(SyncActionDescriptor.from(IncreaseViewSizeAction, undefined), 'View: Increase Current View Size', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(DecreaseViewSizeAction, undefined), 'View: Decrease Current View Size', CATEGORIES.View.value);
