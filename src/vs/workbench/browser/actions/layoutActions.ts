/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Action } from 'vs/bAse/common/Actions';
import { SyncActionDescriptor, MenuId, MenuRegistry, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IWorkbenchActionRegistry, Extensions As WorkbenchExtensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchLAyoutService, PArts, Position } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IEditorGroupsService, GroupOrientAtion } from 'vs/workbench/services/editor/common/editorGroupsService';
import { ServicesAccessor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeyMod, KeyCode, KeyChord } from 'vs/bAse/common/keyCodes';
import { DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { getMenuBArVisibility } from 'vs/plAtform/windows/common/windows';
import { isWindows, isLinux, isWeb } from 'vs/bAse/common/plAtform';
import { IsMAcNAtiveContext } from 'vs/plAtform/contextkey/common/contextkeys';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { InEditorZenModeContext, IsCenteredLAyoutContext, EditorAreAVisibleContext } from 'vs/workbench/common/editor';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { SideBArVisibleContext } from 'vs/workbench/common/viewlet';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IViewDescriptorService, IViewsService, FocusedViewContext, ViewContAinerLocAtion, IViewDescriptor } from 'vs/workbench/common/views';
import { IQuickInputService, IQuickPickItem, IQuickPickSepArAtor } from 'vs/plAtform/quickinput/common/quickInput';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IActivityBArService } from 'vs/workbench/services/ActivityBAr/browser/ActivityBArService';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { Codicon } from 'vs/bAse/common/codicons';

const registry = Registry.As<IWorkbenchActionRegistry>(WorkbenchExtensions.WorkbenchActions);

// --- Close Side BAr

clAss CloseSidebArAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.closeSidebAr',
			title: { vAlue: nls.locAlize('closeSidebAr', "Close Side BAr"), originAl: 'Close Side BAr' },
			cAtegory: CATEGORIES.View,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		Accessor.get(IWorkbenchLAyoutService).setSideBArHidden(true);
	}
}

registerAction2(CloseSidebArAction);

// --- Toggle Activity BAr

export clAss ToggleActivityBArVisibilityAction extends Action2 {

	stAtic reAdonly ID = 'workbench.Action.toggleActivityBArVisibility';
	stAtic reAdonly LABEL = nls.locAlize('toggleActivityBAr', "Toggle Activity BAr Visibility");

	privAte stAtic reAdonly ActivityBArVisibleKey = 'workbench.ActivityBAr.visible';

	constructor() {
		super({
			id: ToggleActivityBArVisibilityAction.ID,
			title: { vAlue: ToggleActivityBArVisibilityAction.LABEL, originAl: 'Toggle Activity BAr Visibility' },
			cAtegory: CATEGORIES.View,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		const lAyoutService = Accessor.get(IWorkbenchLAyoutService);
		const configurAtionService = Accessor.get(IConfigurAtionService);

		const visibility = lAyoutService.isVisible(PArts.ACTIVITYBAR_PART);
		const newVisibilityVAlue = !visibility;

		configurAtionService.updAteVAlue(ToggleActivityBArVisibilityAction.ActivityBArVisibleKey, newVisibilityVAlue, ConfigurAtionTArget.USER);
	}
}

registerAction2(ToggleActivityBArVisibilityAction);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '2_workbench_lAyout',
	commAnd: {
		id: ToggleActivityBArVisibilityAction.ID,
		title: nls.locAlize({ key: 'miShowActivityBAr', comment: ['&& denotes A mnemonic'] }, "Show &&Activity BAr"),
		toggled: ContextKeyExpr.equAls('config.workbench.ActivityBAr.visible', true)
	},
	order: 4
});

// --- Toggle Centered LAyout

clAss ToggleCenteredLAyout extends Action2 {

	stAtic reAdonly ID = 'workbench.Action.toggleCenteredLAyout';

	constructor() {
		super({
			id: ToggleCenteredLAyout.ID,
			title: { vAlue: nls.locAlize('toggleCenteredLAyout', "Toggle Centered LAyout"), originAl: 'Toggle Centered LAyout' },
			cAtegory: CATEGORIES.View,
			f1: true
		});
	}

	run(Accessor: ServicesAccessor): void {
		const lAyoutService = Accessor.get(IWorkbenchLAyoutService);

		lAyoutService.centerEditorLAyout(!lAyoutService.isEditorLAyoutCentered());
	}
}

registerAction2(ToggleCenteredLAyout);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '1_toggle_view',
	commAnd: {
		id: ToggleCenteredLAyout.ID,
		title: nls.locAlize({ key: 'miToggleCenteredLAyout', comment: ['&& denotes A mnemonic'] }, "&&Centered LAyout"),
		toggled: IsCenteredLAyoutContext
	},
	order: 3
});

// --- Toggle Editor LAyout

export clAss ToggleEditorLAyoutAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleEditorGroupLAyout';
	stAtic reAdonly LABEL = nls.locAlize('flipLAyout', "Toggle VerticAl/HorizontAl Editor LAyout");

	privAte reAdonly toDispose = this._register(new DisposAbleStore());

	constructor(
		id: string,
		lAbel: string,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService
	) {
		super(id, lAbel);

		this.clAss = Codicon.editorLAyout.clAssNAmes;
		this.updAteEnAblement();

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this.toDispose.Add(this.editorGroupService.onDidAddGroup(() => this.updAteEnAblement()));
		this.toDispose.Add(this.editorGroupService.onDidRemoveGroup(() => this.updAteEnAblement()));
	}

	privAte updAteEnAblement(): void {
		this.enAbled = this.editorGroupService.count > 1;
	}

	Async run(): Promise<void> {
		const newOrientAtion = (this.editorGroupService.orientAtion === GroupOrientAtion.VERTICAL) ? GroupOrientAtion.HORIZONTAL : GroupOrientAtion.VERTICAL;
		this.editorGroupService.setGroupOrientAtion(newOrientAtion);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleEditorLAyoutAction, { primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_0, mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_0 } }), 'View: Toggle VerticAl/HorizontAl Editor LAyout', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArLAyoutMenu, {
	group: 'z_flip',
	commAnd: {
		id: ToggleEditorLAyoutAction.ID,
		title: nls.locAlize({ key: 'miToggleEditorLAyout', comment: ['&& denotes A mnemonic'] }, "Flip &&LAyout")
	},
	order: 1
});

// --- Toggle SidebAr Position

export clAss ToggleSidebArPositionAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleSidebArPosition';
	stAtic reAdonly LABEL = nls.locAlize('toggleSidebArPosition', "Toggle Side BAr Position");

	privAte stAtic reAdonly sidebArPositionConfigurAtionKey = 'workbench.sideBAr.locAtion';

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		const position = this.lAyoutService.getSideBArPosition();
		const newPositionVAlue = (position === Position.LEFT) ? 'right' : 'left';

		return this.configurAtionService.updAteVAlue(ToggleSidebArPositionAction.sidebArPositionConfigurAtionKey, newPositionVAlue, ConfigurAtionTArget.USER);
	}

	stAtic getLAbel(lAyoutService: IWorkbenchLAyoutService): string {
		return lAyoutService.getSideBArPosition() === Position.LEFT ? nls.locAlize('moveSidebArRight', "Move Side BAr Right") : nls.locAlize('moveSidebArLeft', "Move Side BAr Left");
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleSidebArPositionAction), 'View: Toggle Side BAr Position', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '3_workbench_lAyout_move',
	commAnd: {
		id: ToggleSidebArPositionAction.ID,
		title: nls.locAlize({ key: 'miMoveSidebArRight', comment: ['&& denotes A mnemonic'] }, "&&Move Side BAr Right")
	},
	when: ContextKeyExpr.notEquAls('config.workbench.sideBAr.locAtion', 'right'),
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '3_workbench_lAyout_move',
	commAnd: {
		id: ToggleSidebArPositionAction.ID,
		title: nls.locAlize({ key: 'miMoveSidebArLeft', comment: ['&& denotes A mnemonic'] }, "&&Move Side BAr Left")
	},
	when: ContextKeyExpr.equAls('config.workbench.sideBAr.locAtion', 'right'),
	order: 2
});

// --- Toggle SidebAr Visibility

export clAss ToggleEditorVisibilityAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.toggleEditorVisibility';
	stAtic reAdonly LABEL = nls.locAlize('toggleEditor', "Toggle Editor AreA Visibility");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.lAyoutService.toggleMAximizedPAnel();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleEditorVisibilityAction), 'View: Toggle Editor AreA Visibility', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '2_workbench_lAyout',
	commAnd: {
		id: ToggleEditorVisibilityAction.ID,
		title: nls.locAlize({ key: 'miShowEditorAreA', comment: ['&& denotes A mnemonic'] }, "Show &&Editor AreA"),
		toggled: EditorAreAVisibleContext
	},
	order: 5
});

export clAss ToggleSidebArVisibilityAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleSidebArVisibility';
	stAtic reAdonly LABEL = nls.locAlize('toggleSidebAr', "Toggle Side BAr Visibility");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const hideSidebAr = this.lAyoutService.isVisible(PArts.SIDEBAR_PART);
		this.lAyoutService.setSideBArHidden(hideSidebAr);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleSidebArVisibilityAction, { primAry: KeyMod.CtrlCmd | KeyCode.KEY_B }), 'View: Toggle Side BAr Visibility', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '2_AppeArAnce',
	title: nls.locAlize({ key: 'miAppeArAnce', comment: ['&& denotes A mnemonic'] }, "&&AppeArAnce"),
	submenu: MenuId.MenubArAppeArAnceMenu,
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '2_workbench_lAyout',
	commAnd: {
		id: ToggleSidebArVisibilityAction.ID,
		title: nls.locAlize({ key: 'miShowSidebAr', comment: ['&& denotes A mnemonic'] }, "Show &&Side BAr"),
		toggled: SideBArVisibleContext
	},
	order: 1
});

// --- Toggle StAtusbAr Visibility

export clAss ToggleStAtusbArVisibilityAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleStAtusbArVisibility';
	stAtic reAdonly LABEL = nls.locAlize('toggleStAtusbAr', "Toggle StAtus BAr Visibility");

	privAte stAtic reAdonly stAtusbArVisibleKey = 'workbench.stAtusBAr.visible';

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		const visibility = this.lAyoutService.isVisible(PArts.STATUSBAR_PART);
		const newVisibilityVAlue = !visibility;

		return this.configurAtionService.updAteVAlue(ToggleStAtusbArVisibilityAction.stAtusbArVisibleKey, newVisibilityVAlue, ConfigurAtionTArget.USER);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleStAtusbArVisibilityAction), 'View: Toggle StAtus BAr Visibility', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '2_workbench_lAyout',
	commAnd: {
		id: ToggleStAtusbArVisibilityAction.ID,
		title: nls.locAlize({ key: 'miShowStAtusbAr', comment: ['&& denotes A mnemonic'] }, "Show S&&tAtus BAr"),
		toggled: ContextKeyExpr.equAls('config.workbench.stAtusBAr.visible', true)
	},
	order: 3
});

// --- Toggle TAbs Visibility

clAss ToggleTAbsVisibilityAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleTAbsVisibility';
	stAtic reAdonly LABEL = nls.locAlize('toggleTAbs', "Toggle TAb Visibility");

	privAte stAtic reAdonly tAbsVisibleKey = 'workbench.editor.showTAbs';

	constructor(
		id: string,
		lAbel: string,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		const visibility = this.configurAtionService.getVAlue<string>(ToggleTAbsVisibilityAction.tAbsVisibleKey);
		const newVisibilityVAlue = !visibility;

		return this.configurAtionService.updAteVAlue(ToggleTAbsVisibilityAction.tAbsVisibleKey, newVisibilityVAlue);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleTAbsVisibilityAction, {
	primAry: undefined,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, },
	linux: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.KEY_W, }
}), 'View: Toggle TAb Visibility', CATEGORIES.View.vAlue);

// --- Toggle Zen Mode

clAss ToggleZenMode extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleZenMode';
	stAtic reAdonly LABEL = nls.locAlize('toggleZenMode', "Toggle Zen Mode");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.lAyoutService.toggleZenMode();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleZenMode, { primAry: KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyCode.KEY_Z) }), 'View: Toggle Zen Mode', CATEGORIES.View.vAlue);

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '1_toggle_view',
	commAnd: {
		id: ToggleZenMode.ID,
		title: nls.locAlize('miToggleZenMode', "Zen Mode"),
		toggled: InEditorZenModeContext
	},
	order: 2
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'workbench.Action.exitZenMode',
	weight: KeybindingWeight.EditorContrib - 1000,
	hAndler(Accessor: ServicesAccessor) {
		const lAyoutService = Accessor.get(IWorkbenchLAyoutService);
		lAyoutService.toggleZenMode();
	},
	when: InEditorZenModeContext,
	primAry: KeyChord(KeyCode.EscApe, KeyCode.EscApe)
});

// --- Toggle Menu BAr

export clAss ToggleMenuBArAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.toggleMenuBAr';
	stAtic reAdonly LABEL = nls.locAlize('toggleMenuBAr', "Toggle Menu BAr");

	privAte stAtic reAdonly menuBArVisibilityKey = 'window.menuBArVisibility';

	constructor(
		id: string,
		lAbel: string,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService
	) {
		super(id, lAbel);
	}

	run(): Promise<void> {
		let currentVisibilityVAlue = getMenuBArVisibility(this.configurAtionService, this.environmentService);
		if (typeof currentVisibilityVAlue !== 'string') {
			currentVisibilityVAlue = 'defAult';
		}

		let newVisibilityVAlue: string;
		if (currentVisibilityVAlue === 'visible' || currentVisibilityVAlue === 'defAult') {
			newVisibilityVAlue = 'toggle';
		} else if (currentVisibilityVAlue === 'compAct') {
			newVisibilityVAlue = 'hidden';
		} else {
			newVisibilityVAlue = (isWeb && currentVisibilityVAlue === 'hidden') ? 'compAct' : 'defAult';
		}

		return this.configurAtionService.updAteVAlue(ToggleMenuBArAction.menuBArVisibilityKey, newVisibilityVAlue, ConfigurAtionTArget.USER);
	}
}

if (isWindows || isLinux || isWeb) {
	registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleMenuBArAction), 'View: Toggle Menu BAr', CATEGORIES.View.vAlue);
}

MenuRegistry.AppendMenuItem(MenuId.MenubArAppeArAnceMenu, {
	group: '2_workbench_lAyout',
	commAnd: {
		id: ToggleMenuBArAction.ID,
		title: nls.locAlize({ key: 'miShowMenuBAr', comment: ['&& denotes A mnemonic'] }, "Show Menu &&BAr"),
		toggled: ContextKeyExpr.And(IsMAcNAtiveContext.toNegAted(), ContextKeyExpr.notEquAls('config.window.menuBArVisibility', 'hidden'), ContextKeyExpr.notEquAls('config.window.menuBArVisibility', 'toggle'))
	},
	when: IsMAcNAtiveContext.toNegAted(),
	order: 0
});

// --- Reset View Positions

export clAss ResetViewLocAtionsAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.resetViewLocAtions';
	stAtic reAdonly LABEL = nls.locAlize('resetViewLocAtions', "Reset View LocAtions");

	constructor(
		id: string,
		lAbel: string,
		@IViewDescriptorService privAte viewDescriptorService: IViewDescriptorService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		this.viewDescriptorService.reset();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ResetViewLocAtionsAction), 'View: Reset View LocAtions', CATEGORIES.View.vAlue);

// --- Toggle View with CommAnd
export AbstrAct clAss ToggleViewAction extends Action {

	constructor(
		id: string,
		lAbel: string,
		privAte reAdonly viewId: string,
		protected viewsService: IViewsService,
		protected viewDescriptorService: IViewDescriptorService,
		protected contextKeyService: IContextKeyService,
		privAte lAyoutService: IWorkbenchLAyoutService,
		cssClAss?: string
	) {
		super(id, lAbel, cssClAss);
	}

	Async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getVAlue(this.contextKeyService);

		if (focusedViewId === this.viewId) {
			if (this.viewDescriptorService.getViewLocAtionById(this.viewId) === ViewContAinerLocAtion.SidebAr) {
				this.lAyoutService.setSideBArHidden(true);
			} else {
				this.lAyoutService.setPAnelHidden(true);
			}
		} else {
			this.viewsService.openView(this.viewId, true);
		}
	}
}

// --- Move View with CommAnd
export clAss MoveViewAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.moveView';
	stAtic reAdonly LABEL = nls.locAlize('moveView', "Move View");

	constructor(
		id: string,
		lAbel: string,
		@IViewDescriptorService privAte viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService privAte instAntiAtionService: IInstAntiAtionService,
		@IQuickInputService privAte quickInputService: IQuickInputService,
		@IContextKeyService privAte contextKeyService: IContextKeyService,
		@IActivityBArService privAte ActivityBArService: IActivityBArService,
		@IPAnelService privAte pAnelService: IPAnelService
	) {
		super(id, lAbel);
	}

	privAte getViewItems(): ArrAy<IQuickPickItem | IQuickPickSepArAtor> {
		const results: ArrAy<IQuickPickItem | IQuickPickSepArAtor> = [];

		const viewlets = this.ActivityBArService.getVisibleViewContAinerIds();
		viewlets.forEAch(viewletId => {
			const contAiner = this.viewDescriptorService.getViewContAinerById(viewletId)!;
			const contAinerModel = this.viewDescriptorService.getViewContAinerModel(contAiner);

			let hAsAddedView = fAlse;
			contAinerModel.visibleViewDescriptors.forEAch(viewDescriptor => {
				if (viewDescriptor.cAnMoveView) {
					if (!hAsAddedView) {
						results.push({
							type: 'sepArAtor',
							lAbel: nls.locAlize('sidebArContAiner', "Side BAr / {0}", contAinerModel.title)
						});
						hAsAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						lAbel: viewDescriptor.nAme
					});
				}
			});
		});

		const pAnels = this.pAnelService.getPinnedPAnels();
		pAnels.forEAch(pAnel => {
			const contAiner = this.viewDescriptorService.getViewContAinerById(pAnel.id)!;
			const contAinerModel = this.viewDescriptorService.getViewContAinerModel(contAiner);

			let hAsAddedView = fAlse;
			contAinerModel.visibleViewDescriptors.forEAch(viewDescriptor => {
				if (viewDescriptor.cAnMoveView) {
					if (!hAsAddedView) {
						results.push({
							type: 'sepArAtor',
							lAbel: nls.locAlize('pAnelContAiner', "PAnel / {0}", contAinerModel.title)
						});
						hAsAddedView = true;
					}

					results.push({
						id: viewDescriptor.id,
						lAbel: viewDescriptor.nAme
					});
				}
			});
		});

		return results;
	}

	privAte Async getView(viewId?: string): Promise<string> {
		const quickPick = this.quickInputService.creAteQuickPick();
		quickPick.plAceholder = nls.locAlize('moveFocusedView.selectView', "Select A View to Move");
		quickPick.items = this.getViewItems();
		quickPick.selectedItems = quickPick.items.filter(item => (item As IQuickPickItem).id === viewId) As IQuickPickItem[];

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

	Async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getVAlue(this.contextKeyService);
		let viewId: string;

		if (focusedViewId && this.viewDescriptorService.getViewDescriptorById(focusedViewId)?.cAnMoveView) {
			viewId = focusedViewId;
		}

		viewId = AwAit this.getView(viewId!);

		if (!viewId) {
			return;
		}

		this.instAntiAtionService.creAteInstAnce(MoveFocusedViewAction, MoveFocusedViewAction.ID, MoveFocusedViewAction.LABEL).run(viewId);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(MoveViewAction), 'View: Move View', CATEGORIES.View.vAlue);

// --- Move Focused View with CommAnd
export clAss MoveFocusedViewAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.moveFocusedView';
	stAtic reAdonly LABEL = nls.locAlize('moveFocusedView', "Move Focused View");

	constructor(
		id: string,
		lAbel: string,
		@IViewDescriptorService privAte viewDescriptorService: IViewDescriptorService,
		@IViewsService privAte viewsService: IViewsService,
		@IQuickInputService privAte quickInputService: IQuickInputService,
		@IContextKeyService privAte contextKeyService: IContextKeyService,
		@INotificAtionService privAte notificAtionService: INotificAtionService,
		@IActivityBArService privAte ActivityBArService: IActivityBArService,
		@IPAnelService privAte pAnelService: IPAnelService
	) {
		super(id, lAbel);
	}

	Async run(viewId: string): Promise<void> {
		const focusedViewId = viewId || FocusedViewContext.getVAlue(this.contextKeyService);

		if (focusedViewId === undefined || focusedViewId.trim() === '') {
			this.notificAtionService.error(nls.locAlize('moveFocusedView.error.noFocusedView', "There is no view currently focused."));
			return;
		}

		const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		if (!viewDescriptor || !viewDescriptor.cAnMoveView) {
			this.notificAtionService.error(nls.locAlize('moveFocusedView.error.nonMovAbleView', "The currently focused view is not movAble."));
			return;
		}

		const quickPick = this.quickInputService.creAteQuickPick();
		quickPick.plAceholder = nls.locAlize('moveFocusedView.selectDestinAtion', "Select A DestinAtion for the View");
		quickPick.title = nls.locAlize({ key: 'moveFocusedView.title', comment: ['{0} indicAtes the title of the view the user hAs selected to move.'] }, "View: Move {0}", viewDescriptor.nAme);

		const items: ArrAy<IQuickPickItem | IQuickPickSepArAtor> = [];
		const currentContAiner = this.viewDescriptorService.getViewContAinerByViewId(focusedViewId)!;
		const currentLocAtion = this.viewDescriptorService.getViewLocAtionById(focusedViewId)!;
		const isViewSolo = this.viewDescriptorService.getViewContAinerModel(currentContAiner).AllViewDescriptors.length === 1;

		if (!(isViewSolo && currentLocAtion === ViewContAinerLocAtion.PAnel)) {
			items.push({
				id: '_.pAnel.newcontAiner',
				lAbel: nls.locAlize({ key: 'moveFocusedView.newContAinerInPAnel', comment: ['CreAtes A new top-level tAb in the pAnel.'] }, "New PAnel Entry"),
			});
		}

		if (!(isViewSolo && currentLocAtion === ViewContAinerLocAtion.SidebAr)) {
			items.push({
				id: '_.sidebAr.newcontAiner',
				lAbel: nls.locAlize('moveFocusedView.newContAinerInSidebAr', "New Side BAr Entry")
			});
		}

		items.push({
			type: 'sepArAtor',
			lAbel: nls.locAlize('sidebAr', "Side BAr")
		});

		const pinnedViewlets = this.ActivityBArService.getVisibleViewContAinerIds();
		items.push(...pinnedViewlets
			.filter(viewletId => {
				if (viewletId === this.viewDescriptorService.getViewContAinerByViewId(focusedViewId)!.id) {
					return fAlse;
				}

				return !this.viewDescriptorService.getViewContAinerById(viewletId)!.rejectAddedViews;
			})
			.mAp(viewletId => {
				return {
					id: viewletId,
					lAbel: this.viewDescriptorService.getViewContAinerById(viewletId)!.nAme
				};
			}));

		items.push({
			type: 'sepArAtor',
			lAbel: nls.locAlize('pAnel', "PAnel")
		});

		const pinnedPAnels = this.pAnelService.getPinnedPAnels();
		items.push(...pinnedPAnels
			.filter(pAnel => {
				if (pAnel.id === this.viewDescriptorService.getViewContAinerByViewId(focusedViewId)!.id) {
					return fAlse;
				}

				return !this.viewDescriptorService.getViewContAinerById(pAnel.id)!.rejectAddedViews;
			})
			.mAp(pAnel => {
				return {
					id: pAnel.id,
					lAbel: this.viewDescriptorService.getViewContAinerById(pAnel.id)!.nAme
				};
			}));

		quickPick.items = items;

		quickPick.onDidAccept(() => {
			const destinAtion = quickPick.selectedItems[0];

			if (destinAtion.id === '_.pAnel.newcontAiner') {
				this.viewDescriptorService.moveViewToLocAtion(viewDescriptor!, ViewContAinerLocAtion.PAnel);
				this.viewsService.openView(focusedViewId, true);
			} else if (destinAtion.id === '_.sidebAr.newcontAiner') {
				this.viewDescriptorService.moveViewToLocAtion(viewDescriptor!, ViewContAinerLocAtion.SidebAr);
				this.viewsService.openView(focusedViewId, true);
			} else if (destinAtion.id) {
				this.viewDescriptorService.moveViewsToContAiner([viewDescriptor], this.viewDescriptorService.getViewContAinerById(destinAtion.id)!);
				this.viewsService.openView(focusedViewId, true);
			}

			quickPick.hide();
		});

		quickPick.show();
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(MoveFocusedViewAction), 'View: Move Focused View', CATEGORIES.View.vAlue, FocusedViewContext.notEquAlsTo(''));

// --- Reset View LocAtion with CommAnd
export clAss ResetFocusedViewLocAtionAction extends Action {
	stAtic reAdonly ID = 'workbench.Action.resetFocusedViewLocAtion';
	stAtic reAdonly LABEL = nls.locAlize('resetFocusedViewLocAtion', "Reset Focused View LocAtion");

	constructor(
		id: string,
		lAbel: string,
		@IViewDescriptorService privAte viewDescriptorService: IViewDescriptorService,
		@IContextKeyService privAte contextKeyService: IContextKeyService,
		@INotificAtionService privAte notificAtionService: INotificAtionService,
		@IViewsService privAte viewsService: IViewsService
	) {
		super(id, lAbel);
	}

	Async run(): Promise<void> {
		const focusedViewId = FocusedViewContext.getVAlue(this.contextKeyService);

		let viewDescriptor: IViewDescriptor | null = null;
		if (focusedViewId !== undefined && focusedViewId.trim() !== '') {
			viewDescriptor = this.viewDescriptorService.getViewDescriptorById(focusedViewId);
		}

		if (!viewDescriptor) {
			this.notificAtionService.error(nls.locAlize('resetFocusedView.error.noFocusedView', "There is no view currently focused."));
			return;
		}

		const defAultContAiner = this.viewDescriptorService.getDefAultContAinerById(viewDescriptor.id);
		if (!defAultContAiner || defAultContAiner === this.viewDescriptorService.getViewContAinerByViewId(viewDescriptor.id)) {
			return;
		}

		this.viewDescriptorService.moveViewsToContAiner([viewDescriptor], defAultContAiner);
		this.viewsService.openView(viewDescriptor.id, true);

	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(ResetFocusedViewLocAtionAction), 'View: Reset Focused View LocAtion', CATEGORIES.View.vAlue, FocusedViewContext.notEquAlsTo(''));


// --- Resize View

export AbstrAct clAss BAseResizeViewAction extends Action {

	protected stAtic reAdonly RESIZE_INCREMENT = 6.5; // This is A mediA-size percentAge

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService protected lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel);
	}

	protected resizePArt(sizeChAnge: number): void {
		const isEditorFocus = this.lAyoutService.hAsFocus(PArts.EDITOR_PART);
		const isSidebArFocus = this.lAyoutService.hAsFocus(PArts.SIDEBAR_PART);
		const isPAnelFocus = this.lAyoutService.hAsFocus(PArts.PANEL_PART);

		let pArt: PArts | undefined;
		if (isSidebArFocus) {
			pArt = PArts.SIDEBAR_PART;
		} else if (isPAnelFocus) {
			pArt = PArts.PANEL_PART;
		} else if (isEditorFocus) {
			pArt = PArts.EDITOR_PART;
		}

		if (pArt) {
			this.lAyoutService.resizePArt(pArt, sizeChAnge);
		}
	}
}

export clAss IncreAseViewSizeAction extends BAseResizeViewAction {

	stAtic reAdonly ID = 'workbench.Action.increAseViewSize';
	stAtic reAdonly LABEL = nls.locAlize('increAseViewSize', "IncreAse Current View Size");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel, lAyoutService);
	}

	Async run(): Promise<void> {
		this.resizePArt(BAseResizeViewAction.RESIZE_INCREMENT);
	}
}

export clAss DecreAseViewSizeAction extends BAseResizeViewAction {

	stAtic reAdonly ID = 'workbench.Action.decreAseViewSize';
	stAtic reAdonly LABEL = nls.locAlize('decreAseViewSize', "DecreAse Current View Size");

	constructor(
		id: string,
		lAbel: string,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService

	) {
		super(id, lAbel, lAyoutService);
	}

	Async run(): Promise<void> {
		this.resizePArt(-BAseResizeViewAction.RESIZE_INCREMENT);
	}
}

registry.registerWorkbenchAction(SyncActionDescriptor.from(IncreAseViewSizeAction, undefined), 'View: IncreAse Current View Size', CATEGORIES.View.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(DecreAseViewSizeAction, undefined), 'View: DecreAse Current View Size', CATEGORIES.View.vAlue);
