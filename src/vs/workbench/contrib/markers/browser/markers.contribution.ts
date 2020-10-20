/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workbench/contrib/mArkers/browser/mArkersFileDecorAtions';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { Extensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions, CATEGORIES } from 'vs/workbench/common/Actions';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { locAlize } from 'vs/nls';
import { MArker, RelAtedInformAtion } from 'vs/workbench/contrib/mArkers/browser/mArkersModel';
import { MArkersView } from 'vs/workbench/contrib/mArkers/browser/mArkersView';
import { MenuId, MenuRegistry, SyncActionDescriptor, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ShowProblemsPAnelAction } from 'vs/workbench/contrib/mArkers/browser/mArkersViewActions';
import ConstAnts from 'vs/workbench/contrib/mArkers/browser/constAnts';
import MessAges from 'vs/workbench/contrib/mArkers/browser/messAges';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IMArkersWorkbenchService, MArkersWorkbenchService, ActivityUpdAter } from 'vs/workbench/contrib/mArkers/browser/mArkers';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IStAtusbArEntryAccessor, IStAtusbArService, StAtusbArAlignment, IStAtusbArEntry } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { IMArkerService, MArkerStAtistics } from 'vs/plAtform/mArkers/common/mArkers';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ViewContAiner, IViewContAinersRegistry, Extensions As ViewContAinerExtensions, ViewContAinerLocAtion, IViewsRegistry, IViewsService, getVisbileViewContextKey, FocusedViewContext, IViewDescriptorService } from 'vs/workbench/common/views';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import type { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ToggleViewAction } from 'vs/workbench/browser/Actions/lAyoutActions';
import { Codicon } from 'vs/bAse/common/codicons';

registerSingleton(IMArkersWorkbenchService, MArkersWorkbenchService, fAlse);

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.MARKER_OPEN_ACTION_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.MArkerFocusContextKey),
	primAry: KeyCode.Enter,
	mAc: {
		primAry: KeyCode.Enter,
		secondAry: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	hAndler: (Accessor, Args: Any) => {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID)!;
		mArkersView.openFileAtElement(mArkersView.getFocusElement(), fAlse, fAlse, true);
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.MARKER_OPEN_SIDE_ACTION_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.MArkerFocusContextKey),
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	mAc: {
		primAry: KeyMod.WinCtrl | KeyCode.Enter
	},
	hAndler: (Accessor, Args: Any) => {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID)!;
		mArkersView.openFileAtElement(mArkersView.getFocusElement(), fAlse, true, true);
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.MARKER_SHOW_PANEL_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: undefined,
	hAndler: Async (Accessor, Args: Any) => {
		AwAit Accessor.get(IViewsService).openView(ConstAnts.MARKERS_VIEW_ID);
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.MARKER_SHOW_QUICK_FIX,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.MArkerFocusContextKey,
	primAry: KeyMod.CtrlCmd | KeyCode.US_DOT,
	hAndler: (Accessor, Args: Any) => {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID)!;
		const focusedElement = mArkersView.getFocusElement();
		if (focusedElement instAnceof MArker) {
			mArkersView.showQuickFixes(focusedElement);
		}
	}
});

// configurAtion
Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).registerConfigurAtion({
	'id': 'problems',
	'order': 101,
	'title': MessAges.PROBLEMS_PANEL_CONFIGURATION_TITLE,
	'type': 'object',
	'properties': {
		'problems.AutoReveAl': {
			'description': MessAges.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL,
			'type': 'booleAn',
			'defAult': true
		},
		'problems.showCurrentInStAtus': {
			'description': MessAges.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS,
			'type': 'booleAn',
			'defAult': fAlse
		}
	}
});

clAss ToggleMArkersPAnelAction extends ToggleViewAction {

	public stAtic reAdonly ID = 'workbench.Actions.view.problems';
	public stAtic reAdonly LABEL = MessAges.MARKERS_PANEL_TOGGLE_LABEL;

	constructor(id: string, lAbel: string,
		@IViewsService viewsService: IViewsService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService
	) {
		super(id, lAbel, ConstAnts.MARKERS_VIEW_ID, viewsService, viewDescriptorService, contextKeyService, lAyoutService);
	}
}

// mArkers view contAiner
const VIEW_CONTAINER: ViewContAiner = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner({
	id: ConstAnts.MARKERS_CONTAINER_ID,
	nAme: MessAges.MARKERS_PANEL_TITLE_PROBLEMS,
	icon: Codicon.wArning.clAssNAmes,
	hideIfEmpty: true,
	order: 0,
	ctorDescriptor: new SyncDescriptor(ViewPAneContAiner, [ConstAnts.MARKERS_CONTAINER_ID, { mergeViewWithContAinerWhenSingleView: true, donotShowContAinerTitleWhenMergedWithContAiner: true }]),
	storAgeId: ConstAnts.MARKERS_VIEW_STORAGE_ID,
	focusCommAnd: {
		id: ToggleMArkersPAnelAction.ID, keybindings: {
			primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_M
		}
	}
}, ViewContAinerLocAtion.PAnel);

Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry).registerViews([{
	id: ConstAnts.MARKERS_VIEW_ID,
	contAinerIcon: Codicon.wArning.clAssNAmes,
	nAme: MessAges.MARKERS_PANEL_TITLE_PROBLEMS,
	cAnToggleVisibility: fAlse,
	cAnMoveView: true,
	ctorDescriptor: new SyncDescriptor(MArkersView),
}], VIEW_CONTAINER);

// workbench
const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ActivityUpdAter, LifecyclePhAse.Restored);

// Actions
const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleMArkersPAnelAction, {
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_M
}), 'View: Toggle Problems (Errors, WArnings, Infos)', CATEGORIES.View.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ShowProblemsPAnelAction), 'View: Focus Problems (Errors, WArnings, Infos)', CATEGORIES.View.vAlue);
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKER_COPY_ACTION_ID,
			title: { vAlue: locAlize('copyMArker', "Copy"), originAl: 'Copy' },
			menu: {
				id: MenuId.ProblemsPAnelContext,
				when: ConstAnts.MArkerFocusContextKey,
				group: 'nAvigAtion'
			},
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_C,
				when: ConstAnts.MArkerFocusContextKey
			},
		});
	}
	Async run(Accessor: ServicesAccessor) {
		AwAit copyMArker(Accessor.get(IViewsService), Accessor.get(IClipboArdService));
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKER_COPY_MESSAGE_ACTION_ID,
			title: { vAlue: locAlize('copyMessAge', "Copy MessAge"), originAl: 'Copy MessAge' },
			menu: {
				id: MenuId.ProblemsPAnelContext,
				when: ConstAnts.MArkerFocusContextKey,
				group: 'nAvigAtion'
			},
		});
	}
	Async run(Accessor: ServicesAccessor) {
		AwAit copyMessAge(Accessor.get(IViewsService), Accessor.get(IClipboArdService));
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID,
			title: { vAlue: locAlize('copyMessAge', "Copy MessAge"), originAl: 'Copy MessAge' },
			menu: {
				id: MenuId.ProblemsPAnelContext,
				when: ConstAnts.RelAtedInformAtionFocusContextKey,
				group: 'nAvigAtion'
			}
		});
	}
	Async run(Accessor: ServicesAccessor) {
		AwAit copyRelAtedInformAtionMessAge(Accessor.get(IViewsService), Accessor.get(IClipboArdService));
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.FOCUS_PROBLEMS_FROM_FILTER,
			title: locAlize('focusProblemsList', "Focus problems view"),
			keybinding: {
				when: ConstAnts.MArkerViewFilterFocusContextKey,
				weight: KeybindingWeight.WorkbenchContrib,
				primAry: KeyMod.CtrlCmd | KeyCode.DownArrow
			}
		});
	}
	run(Accessor: ServicesAccessor) {
		focusProblemsView(Accessor.get(IViewsService));
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKERS_VIEW_FOCUS_FILTER,
			title: locAlize('focusProblemsFilter', "Focus problems filter"),
			keybinding: {
				when: FocusedViewContext.isEquAlTo(ConstAnts.MARKERS_VIEW_ID),
				weight: KeybindingWeight.WorkbenchContrib,
				primAry: KeyMod.CtrlCmd | KeyCode.KEY_F
			}
		});
	}
	run(Accessor: ServicesAccessor) {
		focusProblemsFilter(Accessor.get(IViewsService));
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE,
			title: { vAlue: locAlize('show multiline', "Show messAge in multiple lines"), originAl: 'Problems: Show messAge in multiple lines' },
			cAtegory: locAlize('problems', "Problems"),
			menu: {
				id: MenuId.CommAndPAlette,
				when: ContextKeyExpr.hAs(getVisbileViewContextKey(ConstAnts.MARKERS_VIEW_ID))
			}
		});
	}
	run(Accessor: ServicesAccessor) {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID)!;
		if (mArkersView) {
			mArkersView.mArkersViewModel.multiline = true;
		}
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE,
			title: { vAlue: locAlize('show singleline', "Show messAge in single line"), originAl: 'Problems: Show messAge in single line' },
			cAtegory: locAlize('problems', "Problems"),
			menu: {
				id: MenuId.CommAndPAlette,
				when: ContextKeyExpr.hAs(getVisbileViewContextKey(ConstAnts.MARKERS_VIEW_ID))
			}
		});
	}
	run(Accessor: ServicesAccessor) {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
		if (mArkersView) {
			mArkersView.mArkersViewModel.multiline = fAlse;
		}
	}
});
registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: ConstAnts.MARKERS_VIEW_CLEAR_FILTER_TEXT,
			title: locAlize('cleArFiltersText', "CleAr filters text"),
			cAtegory: locAlize('problems', "Problems"),
			keybinding: {
				when: ConstAnts.MArkerViewFilterFocusContextKey,
				weight: KeybindingWeight.WorkbenchContrib,
			}
		});
	}
	run(Accessor: ServicesAccessor) {
		const mArkersView = Accessor.get(IViewsService).getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
		if (mArkersView) {
			mArkersView.cleArFilterText();
		}
	}
});

Async function copyMArker(viewsService: IViewsService, clipboArdService: IClipboArdService) {
	const mArkersView = viewsService.getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
	if (mArkersView) {
		const element = mArkersView.getFocusElement();
		if (element instAnceof MArker) {
			AwAit clipboArdService.writeText(`${element}`);
		}
	}
}

Async function copyMessAge(viewsService: IViewsService, clipboArdService: IClipboArdService) {
	const mArkersView = viewsService.getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
	if (mArkersView) {
		const element = mArkersView.getFocusElement();
		if (element instAnceof MArker) {
			AwAit clipboArdService.writeText(element.mArker.messAge);
		}
	}
}

Async function copyRelAtedInformAtionMessAge(viewsService: IViewsService, clipboArdService: IClipboArdService) {
	const mArkersView = viewsService.getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
	if (mArkersView) {
		const element = mArkersView.getFocusElement();
		if (element instAnceof RelAtedInformAtion) {
			AwAit clipboArdService.writeText(element.rAw.messAge);
		}
	}
}

function focusProblemsView(viewsService: IViewsService) {
	const mArkersView = viewsService.getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
	if (mArkersView) {
		mArkersView.focus();
	}
}

function focusProblemsFilter(viewsService: IViewsService): void {
	const mArkersView = viewsService.getActiveViewWithId<MArkersView>(ConstAnts.MARKERS_VIEW_ID);
	if (mArkersView) {
		mArkersView.focusFilter();
	}
}

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '4_pAnels',
	commAnd: {
		id: ToggleMArkersPAnelAction.ID,
		title: locAlize({ key: 'miMArker', comment: ['&& denotes A mnemonic'] }, "&&Problems")
	},
	order: 4
});

CommAndsRegistry.registerCommAnd(ConstAnts.TOGGLE_MARKERS_VIEW_ACTION_ID, Async (Accessor) => {
	const viewsService = Accessor.get(IViewsService);
	if (viewsService.isViewVisible(ConstAnts.MARKERS_VIEW_ID)) {
		viewsService.closeView(ConstAnts.MARKERS_VIEW_ID);
	} else {
		viewsService.openView(ConstAnts.MARKERS_VIEW_ID, true);
	}
});

clAss MArkersStAtusBArContributions extends DisposAble implements IWorkbenchContribution {

	privAte mArkersStAtusItem: IStAtusbArEntryAccessor;

	constructor(
		@IMArkerService privAte reAdonly mArkerService: IMArkerService,
		@IStAtusbArService privAte reAdonly stAtusbArService: IStAtusbArService
	) {
		super();
		this.mArkersStAtusItem = this._register(this.stAtusbArService.AddEntry(this.getMArkersItem(), 'stAtus.problems', locAlize('stAtus.problems', "Problems"), StAtusbArAlignment.LEFT, 50 /* Medium Priority */));
		this.mArkerService.onMArkerChAnged(() => this.mArkersStAtusItem.updAte(this.getMArkersItem()));
	}

	privAte getMArkersItem(): IStAtusbArEntry {
		const mArkersStAtistics = this.mArkerService.getStAtistics();
		const tooltip = this.getMArkersTooltip(mArkersStAtistics);
		return {
			text: this.getMArkersText(mArkersStAtistics),
			AriALAbel: tooltip,
			tooltip,
			commAnd: 'workbench.Actions.view.toggleProblems'
		};
	}

	privAte getMArkersTooltip(stAts: MArkerStAtistics): string {
		const errorTitle = (n: number) => locAlize('totAlErrors', "{0} Errors", n);
		const wArningTitle = (n: number) => locAlize('totAlWArnings', "{0} WArnings", n);
		const infoTitle = (n: number) => locAlize('totAlInfos', "{0} Infos", n);

		const titles: string[] = [];

		if (stAts.errors > 0) {
			titles.push(errorTitle(stAts.errors));
		}

		if (stAts.wArnings > 0) {
			titles.push(wArningTitle(stAts.wArnings));
		}

		if (stAts.infos > 0) {
			titles.push(infoTitle(stAts.infos));
		}

		if (titles.length === 0) {
			return locAlize('noProblems', "No Problems");
		}

		return titles.join(', ');
	}

	privAte getMArkersText(stAts: MArkerStAtistics): string {
		const problemsText: string[] = [];

		// Errors
		problemsText.push('$(error) ' + this.pAckNumber(stAts.errors));

		// WArnings
		problemsText.push('$(wArning) ' + this.pAckNumber(stAts.wArnings));

		// Info (only if Any)
		if (stAts.infos > 0) {
			problemsText.push('$(info) ' + this.pAckNumber(stAts.infos));
		}

		return problemsText.join(' ');
	}

	privAte pAckNumber(n: number): string {
		const mAnyProblems = locAlize('mAnyProblems', "10K+");
		return n > 9999 ? mAnyProblems : n > 999 ? n.toString().chArAt(0) + 'K' : n.toString();
	}
}

workbenchRegistry.registerWorkbenchContribution(MArkersStAtusBArContributions, LifecyclePhAse.Restored);
