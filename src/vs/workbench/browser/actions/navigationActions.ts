/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/Base/common/actions';
import { IEditorGroupsService, GroupDirection, GroupLocation, IFindGroupScope } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IViewlet } from 'vs/workBench/common/viewlet';
import { IPanel } from 'vs/workBench/common/panel';
import { Action2, MenuId, registerAction2, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { IWorkBenchActionRegistry, Extensions, CATEGORIES } from 'vs/workBench/common/actions';
import { Direction } from 'vs/Base/Browser/ui/grid/grid';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { isAncestor } from 'vs/Base/Browser/dom';

aBstract class BaseNavigationAction extends Action {

	constructor(
		id: string,
		laBel: string,
		protected direction: Direction,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService,
		@IPanelService protected panelService: IPanelService,
		@IWorkBenchLayoutService protected layoutService: IWorkBenchLayoutService,
		@IViewletService protected viewletService: IViewletService
	) {
		super(id, laBel);
	}

	async run(): Promise<Boolean | IViewlet | IPanel> {
		const isEditorFocus = this.layoutService.hasFocus(Parts.EDITOR_PART);
		const isPanelFocus = this.layoutService.hasFocus(Parts.PANEL_PART);
		const isSideBarFocus = this.layoutService.hasFocus(Parts.SIDEBAR_PART);

		let neighBorPart: Parts | undefined;
		if (isEditorFocus) {
			const didNavigate = this.navigateAcrossEditorGroup(this.toGroupDirection(this.direction));
			if (didNavigate) {
				return true;
			}

			neighBorPart = this.layoutService.getVisiBleNeighBorPart(Parts.EDITOR_PART, this.direction);
		}

		if (isPanelFocus) {
			neighBorPart = this.layoutService.getVisiBleNeighBorPart(Parts.PANEL_PART, this.direction);
		}

		if (isSideBarFocus) {
			neighBorPart = this.layoutService.getVisiBleNeighBorPart(Parts.SIDEBAR_PART, this.direction);
		}

		if (neighBorPart === Parts.EDITOR_PART) {
			return this.navigateToEditorGroup(this.direction === Direction.Right ? GroupLocation.FIRST : GroupLocation.LAST);
		}

		if (neighBorPart === Parts.SIDEBAR_PART) {
			return this.navigateToSideBar();
		}

		if (neighBorPart === Parts.PANEL_PART) {
			return this.navigateToPanel();
		}

		return false;
	}

	private async navigateToPanel(): Promise<IPanel | Boolean> {
		if (!this.layoutService.isVisiBle(Parts.PANEL_PART)) {
			return false;
		}

		const activePanel = this.panelService.getActivePanel();
		if (!activePanel) {
			return false;
		}

		const activePanelId = activePanel.getId();

		const res = await this.panelService.openPanel(activePanelId, true);
		if (!res) {
			return false;
		}

		return res;
	}

	private async navigateToSideBar(): Promise<IViewlet | Boolean> {
		if (!this.layoutService.isVisiBle(Parts.SIDEBAR_PART)) {
			return false;
		}

		const activeViewlet = this.viewletService.getActiveViewlet();
		if (!activeViewlet) {
			return false;
		}
		const activeViewletId = activeViewlet.getId();

		const viewlet = await this.viewletService.openViewlet(activeViewletId, true);
		return !!viewlet;
	}

	private navigateAcrossEditorGroup(direction: GroupDirection): Boolean {
		return this.doNavigateToEditorGroup({ direction });
	}

	private navigateToEditorGroup(location: GroupLocation): Boolean {
		return this.doNavigateToEditorGroup({ location });
	}

	private toGroupDirection(direction: Direction): GroupDirection {
		switch (direction) {
			case Direction.Down: return GroupDirection.DOWN;
			case Direction.Left: return GroupDirection.LEFT;
			case Direction.Right: return GroupDirection.RIGHT;
			case Direction.Up: return GroupDirection.UP;
		}
	}

	private doNavigateToEditorGroup(scope: IFindGroupScope): Boolean {
		const targetGroup = this.editorGroupService.findGroup(scope, this.editorGroupService.activeGroup);
		if (targetGroup) {
			targetGroup.focus();

			return true;
		}

		return false;
	}
}

class NavigateLeftAction extends BaseNavigationAction {

	static readonly ID = 'workBench.action.navigateLeft';
	static readonly LABEL = nls.localize('navigateLeft', "Navigate to the View on the Left");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, laBel, Direction.Left, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateRightAction extends BaseNavigationAction {

	static readonly ID = 'workBench.action.navigateRight';
	static readonly LABEL = nls.localize('navigateRight', "Navigate to the View on the Right");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, laBel, Direction.Right, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateUpAction extends BaseNavigationAction {

	static readonly ID = 'workBench.action.navigateUp';
	static readonly LABEL = nls.localize('navigateUp', "Navigate to the View ABove");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, laBel, Direction.Up, editorGroupService, panelService, layoutService, viewletService);
	}
}

class NavigateDownAction extends BaseNavigationAction {

	static readonly ID = 'workBench.action.navigateDown';
	static readonly LABEL = nls.localize('navigateDown', "Navigate to the View Below");

	constructor(
		id: string,
		laBel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPanelService panelService: IPanelService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, laBel, Direction.Down, editorGroupService, panelService, layoutService, viewletService);
	}
}

function findVisiBleNeighBour(layoutService: IWorkBenchLayoutService, part: Parts, next: Boolean): Parts {
	const neighBour = part === Parts.EDITOR_PART ? (next ? Parts.PANEL_PART : Parts.SIDEBAR_PART) : part === Parts.PANEL_PART ? (next ? Parts.STATUSBAR_PART : Parts.EDITOR_PART) :
		part === Parts.STATUSBAR_PART ? (next ? Parts.ACTIVITYBAR_PART : Parts.PANEL_PART) : part === Parts.ACTIVITYBAR_PART ? (next ? Parts.SIDEBAR_PART : Parts.STATUSBAR_PART) :
			part === Parts.SIDEBAR_PART ? (next ? Parts.EDITOR_PART : Parts.ACTIVITYBAR_PART) : Parts.EDITOR_PART;
	if (layoutService.isVisiBle(neighBour) || neighBour === Parts.EDITOR_PART) {
		return neighBour;
	}

	return findVisiBleNeighBour(layoutService, neighBour, next);
}

function focusNextOrPreviousPart(layoutService: IWorkBenchLayoutService, editorService: IEditorService, next: Boolean): void {
	const currentlyFocusedPart = isActiveElementInNoteBookEditor(editorService) ? Parts.EDITOR_PART : layoutService.hasFocus(Parts.EDITOR_PART) ? Parts.EDITOR_PART : layoutService.hasFocus(Parts.ACTIVITYBAR_PART) ? Parts.ACTIVITYBAR_PART :
		layoutService.hasFocus(Parts.STATUSBAR_PART) ? Parts.STATUSBAR_PART : layoutService.hasFocus(Parts.SIDEBAR_PART) ? Parts.SIDEBAR_PART : layoutService.hasFocus(Parts.PANEL_PART) ? Parts.PANEL_PART : undefined;
	let partToFocus = Parts.EDITOR_PART;
	if (currentlyFocusedPart) {
		partToFocus = findVisiBleNeighBour(layoutService, currentlyFocusedPart, next);
	}

	layoutService.focusPart(partToFocus);
}

function isActiveElementInNoteBookEditor(editorService: IEditorService): Boolean {
	const activeEditorPane = editorService.activeEditorPane as unknown as { isNoteBookEditor?: Boolean } | undefined;
	if (activeEditorPane?.isNoteBookEditor) {
		const control = editorService.activeEditorPane?.getControl() as { getDomNode(): HTMLElement; getOverflowContainerDomNode(): HTMLElement; };
		const activeElement = document.activeElement;
		return isAncestor(activeElement, control.getDomNode()) || isAncestor(activeElement, control.getOverflowContainerDomNode());
	}

	return false;
}

export class FocusNextPart extends Action {
	static readonly ID = 'workBench.action.focusNextPart';
	static readonly LABEL = nls.localize('focusNextPart', "Focus Next Part");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		focusNextOrPreviousPart(this.layoutService, this.editorService, true);
	}
}

export class FocusPreviousPart extends Action {
	static readonly ID = 'workBench.action.focusPreviousPart';
	static readonly LABEL = nls.localize('focusPreviousPart', "Focus Previous Part");

	constructor(
		id: string,
		laBel: string,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super(id, laBel);
	}

	async run(): Promise<void> {
		focusNextOrPreviousPart(this.layoutService, this.editorService, false);
	}
}

class GoHomeContriButor implements IWorkBenchContriBution {

	constructor(
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService
	) {
		const homeIndicator = environmentService.options?.homeIndicator;
		if (homeIndicator) {
			registerAction2(class extends Action2 {
				constructor() {
					super({
						id: `workBench.actions.goHome`,
						title: nls.localize('goHome', "Go Home"),
						menu: { id: MenuId.MenuBarWeBNavigationMenu }
					});
				}
				async run(): Promise<void> {
					window.location.href = homeIndicator.href;
				}
			});
		}
	}
}

// --- Actions Registration

const actionsRegistry = Registry.as<IWorkBenchActionRegistry>(Extensions.WorkBenchActions);

actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateUpAction, undefined), 'View: Navigate to the View ABove', CATEGORIES.View.value);
actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateDownAction, undefined), 'View: Navigate to the View Below', CATEGORIES.View.value);
actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateLeftAction, undefined), 'View: Navigate to the View on the Left', CATEGORIES.View.value);
actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(NavigateRightAction, undefined), 'View: Navigate to the View on the Right', CATEGORIES.View.value);
actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(FocusNextPart, { primary: KeyCode.F6 }), 'View: Focus Next Part', CATEGORIES.View.value);
actionsRegistry.registerWorkBenchAction(SyncActionDescriptor.from(FocusPreviousPart, { primary: KeyMod.Shift | KeyCode.F6 }), 'View: Focus Previous Part', CATEGORIES.View.value);

const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(GoHomeContriButor, LifecyclePhase.Ready);
