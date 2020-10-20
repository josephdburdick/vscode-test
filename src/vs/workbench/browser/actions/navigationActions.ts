/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Action } from 'vs/bAse/common/Actions';
import { IEditorGroupsService, GroupDirection, GroupLocAtion, IFindGroupScope } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IWorkbenchLAyoutService, PArts } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IViewlet } from 'vs/workbench/common/viewlet';
import { IPAnel } from 'vs/workbench/common/pAnel';
import { Action2, MenuId, registerAction2, SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { IWorkbenchActionRegistry, Extensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { Direction } from 'vs/bAse/browser/ui/grid/grid';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { isAncestor } from 'vs/bAse/browser/dom';

AbstrAct clAss BAseNAvigAtionAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		protected direction: Direction,
		@IEditorGroupsService protected editorGroupService: IEditorGroupsService,
		@IPAnelService protected pAnelService: IPAnelService,
		@IWorkbenchLAyoutService protected lAyoutService: IWorkbenchLAyoutService,
		@IViewletService protected viewletService: IViewletService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<booleAn | IViewlet | IPAnel> {
		const isEditorFocus = this.lAyoutService.hAsFocus(PArts.EDITOR_PART);
		const isPAnelFocus = this.lAyoutService.hAsFocus(PArts.PANEL_PART);
		const isSidebArFocus = this.lAyoutService.hAsFocus(PArts.SIDEBAR_PART);

		let neighborPArt: PArts | undefined;
		if (isEditorFocus) {
			const didNAvigAte = this.nAvigAteAcrossEditorGroup(this.toGroupDirection(this.direction));
			if (didNAvigAte) {
				return true;
			}

			neighborPArt = this.lAyoutService.getVisibleNeighborPArt(PArts.EDITOR_PART, this.direction);
		}

		if (isPAnelFocus) {
			neighborPArt = this.lAyoutService.getVisibleNeighborPArt(PArts.PANEL_PART, this.direction);
		}

		if (isSidebArFocus) {
			neighborPArt = this.lAyoutService.getVisibleNeighborPArt(PArts.SIDEBAR_PART, this.direction);
		}

		if (neighborPArt === PArts.EDITOR_PART) {
			return this.nAvigAteToEditorGroup(this.direction === Direction.Right ? GroupLocAtion.FIRST : GroupLocAtion.LAST);
		}

		if (neighborPArt === PArts.SIDEBAR_PART) {
			return this.nAvigAteToSidebAr();
		}

		if (neighborPArt === PArts.PANEL_PART) {
			return this.nAvigAteToPAnel();
		}

		return fAlse;
	}

	privAte Async nAvigAteToPAnel(): Promise<IPAnel | booleAn> {
		if (!this.lAyoutService.isVisible(PArts.PANEL_PART)) {
			return fAlse;
		}

		const ActivePAnel = this.pAnelService.getActivePAnel();
		if (!ActivePAnel) {
			return fAlse;
		}

		const ActivePAnelId = ActivePAnel.getId();

		const res = AwAit this.pAnelService.openPAnel(ActivePAnelId, true);
		if (!res) {
			return fAlse;
		}

		return res;
	}

	privAte Async nAvigAteToSidebAr(): Promise<IViewlet | booleAn> {
		if (!this.lAyoutService.isVisible(PArts.SIDEBAR_PART)) {
			return fAlse;
		}

		const ActiveViewlet = this.viewletService.getActiveViewlet();
		if (!ActiveViewlet) {
			return fAlse;
		}
		const ActiveViewletId = ActiveViewlet.getId();

		const viewlet = AwAit this.viewletService.openViewlet(ActiveViewletId, true);
		return !!viewlet;
	}

	privAte nAvigAteAcrossEditorGroup(direction: GroupDirection): booleAn {
		return this.doNAvigAteToEditorGroup({ direction });
	}

	privAte nAvigAteToEditorGroup(locAtion: GroupLocAtion): booleAn {
		return this.doNAvigAteToEditorGroup({ locAtion });
	}

	privAte toGroupDirection(direction: Direction): GroupDirection {
		switch (direction) {
			cAse Direction.Down: return GroupDirection.DOWN;
			cAse Direction.Left: return GroupDirection.LEFT;
			cAse Direction.Right: return GroupDirection.RIGHT;
			cAse Direction.Up: return GroupDirection.UP;
		}
	}

	privAte doNAvigAteToEditorGroup(scope: IFindGroupScope): booleAn {
		const tArgetGroup = this.editorGroupService.findGroup(scope, this.editorGroupService.ActiveGroup);
		if (tArgetGroup) {
			tArgetGroup.focus();

			return true;
		}

		return fAlse;
	}
}

clAss NAvigAteLeftAction extends BAseNAvigAtionAction {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteLeft';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteLeft', "NAvigAte to the View on the Left");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPAnelService pAnelService: IPAnelService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, lAbel, Direction.Left, editorGroupService, pAnelService, lAyoutService, viewletService);
	}
}

clAss NAvigAteRightAction extends BAseNAvigAtionAction {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteRight';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteRight', "NAvigAte to the View on the Right");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPAnelService pAnelService: IPAnelService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, lAbel, Direction.Right, editorGroupService, pAnelService, lAyoutService, viewletService);
	}
}

clAss NAvigAteUpAction extends BAseNAvigAtionAction {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteUp';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteUp', "NAvigAte to the View Above");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPAnelService pAnelService: IPAnelService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, lAbel, Direction.Up, editorGroupService, pAnelService, lAyoutService, viewletService);
	}
}

clAss NAvigAteDownAction extends BAseNAvigAtionAction {

	stAtic reAdonly ID = 'workbench.Action.nAvigAteDown';
	stAtic reAdonly LABEL = nls.locAlize('nAvigAteDown', "NAvigAte to the View Below");

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IPAnelService pAnelService: IPAnelService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@IViewletService viewletService: IViewletService
	) {
		super(id, lAbel, Direction.Down, editorGroupService, pAnelService, lAyoutService, viewletService);
	}
}

function findVisibleNeighbour(lAyoutService: IWorkbenchLAyoutService, pArt: PArts, next: booleAn): PArts {
	const neighbour = pArt === PArts.EDITOR_PART ? (next ? PArts.PANEL_PART : PArts.SIDEBAR_PART) : pArt === PArts.PANEL_PART ? (next ? PArts.STATUSBAR_PART : PArts.EDITOR_PART) :
		pArt === PArts.STATUSBAR_PART ? (next ? PArts.ACTIVITYBAR_PART : PArts.PANEL_PART) : pArt === PArts.ACTIVITYBAR_PART ? (next ? PArts.SIDEBAR_PART : PArts.STATUSBAR_PART) :
			pArt === PArts.SIDEBAR_PART ? (next ? PArts.EDITOR_PART : PArts.ACTIVITYBAR_PART) : PArts.EDITOR_PART;
	if (lAyoutService.isVisible(neighbour) || neighbour === PArts.EDITOR_PART) {
		return neighbour;
	}

	return findVisibleNeighbour(lAyoutService, neighbour, next);
}

function focusNextOrPreviousPArt(lAyoutService: IWorkbenchLAyoutService, editorService: IEditorService, next: booleAn): void {
	const currentlyFocusedPArt = isActiveElementInNotebookEditor(editorService) ? PArts.EDITOR_PART : lAyoutService.hAsFocus(PArts.EDITOR_PART) ? PArts.EDITOR_PART : lAyoutService.hAsFocus(PArts.ACTIVITYBAR_PART) ? PArts.ACTIVITYBAR_PART :
		lAyoutService.hAsFocus(PArts.STATUSBAR_PART) ? PArts.STATUSBAR_PART : lAyoutService.hAsFocus(PArts.SIDEBAR_PART) ? PArts.SIDEBAR_PART : lAyoutService.hAsFocus(PArts.PANEL_PART) ? PArts.PANEL_PART : undefined;
	let pArtToFocus = PArts.EDITOR_PART;
	if (currentlyFocusedPArt) {
		pArtToFocus = findVisibleNeighbour(lAyoutService, currentlyFocusedPArt, next);
	}

	lAyoutService.focusPArt(pArtToFocus);
}

function isActiveElementInNotebookEditor(editorService: IEditorService): booleAn {
	const ActiveEditorPAne = editorService.ActiveEditorPAne As unknown As { isNotebookEditor?: booleAn } | undefined;
	if (ActiveEditorPAne?.isNotebookEditor) {
		const control = editorService.ActiveEditorPAne?.getControl() As { getDomNode(): HTMLElement; getOverflowContAinerDomNode(): HTMLElement; };
		const ActiveElement = document.ActiveElement;
		return isAncestor(ActiveElement, control.getDomNode()) || isAncestor(ActiveElement, control.getOverflowContAinerDomNode());
	}

	return fAlse;
}

export clAss FocusNextPArt extends Action {
	stAtic reAdonly ID = 'workbench.Action.focusNextPArt';
	stAtic reAdonly LABEL = nls.locAlize('focusNextPArt', "Focus Next PArt");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		focusNextOrPreviousPArt(this.lAyoutService, this.editorService, true);
	}
}

export clAss FocusPreviousPArt extends Action {
	stAtic reAdonly ID = 'workbench.Action.focusPreviousPArt';
	stAtic reAdonly LABEL = nls.locAlize('focusPreviousPArt', "Focus Previous PArt");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		focusNextOrPreviousPArt(this.lAyoutService, this.editorService, fAlse);
	}
}

clAss GoHomeContributor implements IWorkbenchContribution {

	constructor(
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService
	) {
		const homeIndicAtor = environmentService.options?.homeIndicAtor;
		if (homeIndicAtor) {
			registerAction2(clAss extends Action2 {
				constructor() {
					super({
						id: `workbench.Actions.goHome`,
						title: nls.locAlize('goHome', "Go Home"),
						menu: { id: MenuId.MenubArWebNAvigAtionMenu }
					});
				}
				Async run(): Promise<void> {
					window.locAtion.href = homeIndicAtor.href;
				}
			});
		}
	}
}

// --- Actions RegistrAtion

const ActionsRegistry = Registry.As<IWorkbenchActionRegistry>(Extensions.WorkbenchActions);

ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(NAvigAteUpAction, undefined), 'View: NAvigAte to the View Above', CATEGORIES.View.vAlue);
ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(NAvigAteDownAction, undefined), 'View: NAvigAte to the View Below', CATEGORIES.View.vAlue);
ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(NAvigAteLeftAction, undefined), 'View: NAvigAte to the View on the Left', CATEGORIES.View.vAlue);
ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(NAvigAteRightAction, undefined), 'View: NAvigAte to the View on the Right', CATEGORIES.View.vAlue);
ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(FocusNextPArt, { primAry: KeyCode.F6 }), 'View: Focus Next PArt', CATEGORIES.View.vAlue);
ActionsRegistry.registerWorkbenchAction(SyncActionDescriptor.from(FocusPreviousPArt, { primAry: KeyMod.Shift | KeyCode.F6 }), 'View: Focus Previous PArt', CATEGORIES.View.vAlue);

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(GoHomeContributor, LifecyclePhAse.ReAdy);
