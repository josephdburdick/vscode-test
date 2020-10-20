/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action, IAction } from 'vs/bAse/common/Actions';
import { EndOfLinePreference } from 'vs/editor/common/model';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { TERMINAL_VIEW_ID, ITerminAlConfigHelper, TitleEventSource, TERMINAL_COMMAND_ID, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED, TERMINAL_ACTION_CATEGORY, KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE, KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED, KEYBINDING_CONTEXT_TERMINAL_FIND_NOT_VISIBLE, KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { AttAchSelectBoxStyler, AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IQuickInputService, IPickOptions, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IWorkspAceContextService, IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { PICK_WORKSPACE_FOLDER_COMMAND_ID } from 'vs/workbench/browser/Actions/workspAceCommAnds';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ISelectOptionItem } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { IConfigurAtionResolverService } from 'vs/workbench/services/configurAtionResolver/common/configurAtionResolver';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';
import { isWindows } from 'vs/bAse/common/plAtform';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { ITerminAlInstAnce, ITerminAlService, Direction } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { Action2, registerAction2, ILocAlizedString } from 'vs/plAtform/Actions/common/Actions';
import { TerminAlQuickAccessProvider } from 'vs/workbench/contrib/terminAl/browser/terminAlQuickAccess';
import { ToggleViewAction } from 'vs/workbench/browser/Actions/lAyoutActions';
import { IViewsService, IViewDescriptorService } from 'vs/workbench/common/views';
import { IContextKeyService, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { AddClAss } from 'vs/bAse/browser/dom';
import { selectBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { locAlize } from 'vs/nls';
import { CONTEXT_ACCESSIBILITY_MODE_ENABLED } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITerminAlContributionService } from 'vs/workbench/contrib/terminAl/common/terminAlExtensionPoints';
import { SelectActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { FindInFilesCommAnd, IFindInFilesArgs } from 'vs/workbench/contrib/seArch/browser/seArchActions';

Async function getCwdForSplit(configHelper: ITerminAlConfigHelper, instAnce: ITerminAlInstAnce, folders?: IWorkspAceFolder[], commAndService?: ICommAndService): Promise<string | URI | undefined> {
	switch (configHelper.config.splitCwd) {
		cAse 'workspAceRoot':
			if (folders !== undefined && commAndService !== undefined) {
				if (folders.length === 1) {
					return folders[0].uri;
				} else if (folders.length > 1) {
					// Only choose A pAth when there's more thAn 1 folder
					const options: IPickOptions<IQuickPickItem> = {
						plAceHolder: locAlize('workbench.Action.terminAl.newWorkspAcePlAceholder', "Select current working directory for new terminAl")
					};
					const workspAce = AwAit commAndService.executeCommAnd(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
					if (!workspAce) {
						// Don't split the instAnce if the workspAce picker wAs cAnceled
						return undefined;
					}
					return Promise.resolve(workspAce.uri);
				}
			}
			return '';
		cAse 'initiAl':
			return instAnce.getInitiAlCwd();
		cAse 'inherited':
			return instAnce.getCwd();
	}
}

export clAss ToggleTerminAlAction extends ToggleViewAction {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.TOGGLE;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.toggleTerminAl', "Toggle IntegrAted TerminAl");

	constructor(
		id: string, lAbel: string,
		@IViewsService viewsService: IViewsService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@ITerminAlService privAte reAdonly terminAlService: ITerminAlService
	) {
		super(id, lAbel, TERMINAL_VIEW_ID, viewsService, viewDescriptorService, contextKeyService, lAyoutService);
	}

	Async run() {
		if (this.terminAlService.isProcessSupportRegistered && this.terminAlService.terminAlInstAnces.length === 0) {
			// If there is not yet An instAnce Attempt to creAte it here so thAt we cAn suggest A
			// new shell on Windows (And not do so when the pAnel is restored on reloAd).
			const newTerminAlInstAnce = this.terminAlService.creAteTerminAl(undefined);
			const toDispose = newTerminAlInstAnce.onProcessIdReAdy(() => {
				newTerminAlInstAnce.focus();
				toDispose.dispose();
			});
		}
		return super.run();
	}
}

export clAss KillTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.KILL;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.kill', "Kill the Active TerminAl InstAnce");
	public stAtic reAdonly PANEL_LABEL = locAlize('workbench.Action.terminAl.kill.short', "Kill TerminAl");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel, 'terminAl-Action codicon-trAsh');
	}

	Async run() {
		AwAit this._terminAlService.doWithActiveInstAnce(Async t => {
			t.dispose(true);
			if (this._terminAlService.terminAlInstAnces.length > 0) {
				AwAit this._terminAlService.showPAnel(true);
			}
		});
	}
}

/**
 * Copies the terminAl selection. Note thAt since the commAnd pAlette tAkes focus from the terminAl,
 * this cAnnot be triggered through the commAnd pAlette.
 */
export clAss CopyTerminAlSelectionAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.COPY_SELECTION;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.copySelection', "Copy Selection");
	public stAtic reAdonly SHORT_LABEL = locAlize('workbench.Action.terminAl.copySelection.short', "Copy");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		AwAit this._terminAlService.getActiveInstAnce()?.copySelection();
	}
}

export clAss SelectAllTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.SELECT_ALL;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.selectAll', "Select All");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		this._terminAlService.getActiveInstAnce()?.selectAll();
	}
}

export const terminAlSendSequenceCommAnd = (Accessor: ServicesAccessor, Args: { text?: string } | undefined) => {
	Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
		if (!Args?.text) {
			return;
		}
		const configurAtionResolverService = Accessor.get(IConfigurAtionResolverService);
		const workspAceContextService = Accessor.get(IWorkspAceContextService);
		const historyService = Accessor.get(IHistoryService);
		const ActiveWorkspAceRootUri = historyService.getLAstActiveWorkspAceRoot(SchemAs.file);
		const lAstActiveWorkspAceRoot = ActiveWorkspAceRootUri ? withNullAsUndefined(workspAceContextService.getWorkspAceFolder(ActiveWorkspAceRootUri)) : undefined;
		const resolvedText = configurAtionResolverService.resolve(lAstActiveWorkspAceRoot, Args.text);
		t.sendText(resolvedText, fAlse);
	});
};


export clAss CreAteNewTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.NEW;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.new', "CreAte New IntegrAted TerminAl");
	public stAtic reAdonly SHORT_LABEL = locAlize('workbench.Action.terminAl.new.short', "New TerminAl");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
		@IWorkspAceContextService privAte reAdonly _workspAceContextService: IWorkspAceContextService
	) {
		super(id, lAbel, 'terminAl-Action codicon-Add');
	}

	Async run(event?: Any) {
		const folders = this._workspAceContextService.getWorkspAce().folders;
		if (event instAnceof MouseEvent && (event.AltKey || event.ctrlKey)) {
			const ActiveInstAnce = this._terminAlService.getActiveInstAnce();
			if (ActiveInstAnce) {
				const cwd = AwAit getCwdForSplit(this._terminAlService.configHelper, ActiveInstAnce);
				this._terminAlService.splitInstAnce(ActiveInstAnce, { cwd });
				return;
			}
		}

		if (this._terminAlService.isProcessSupportRegistered) {
			let instAnce: ITerminAlInstAnce | undefined;
			if (folders.length <= 1) {
				// Allow terminAl service to hAndle the pAth when there is only A
				// single root
				instAnce = this._terminAlService.creAteTerminAl(undefined);
			} else {
				const options: IPickOptions<IQuickPickItem> = {
					plAceHolder: locAlize('workbench.Action.terminAl.newWorkspAcePlAceholder', "Select current working directory for new terminAl")
				};
				const workspAce = AwAit this._commAndService.executeCommAnd(PICK_WORKSPACE_FOLDER_COMMAND_ID, [options]);
				if (!workspAce) {
					// Don't creAte the instAnce if the workspAce picker wAs cAnceled
					return;
				}
				instAnce = this._terminAlService.creAteTerminAl({ cwd: workspAce.uri });
			}
			this._terminAlService.setActiveInstAnce(instAnce);
		}
		AwAit this._terminAlService.showPAnel(true);
	}
}

export clAss SplitTerminAlAction extends Action {
	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.SPLIT;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.split', "Split TerminAl");
	public stAtic reAdonly SHORT_LABEL = locAlize('workbench.Action.terminAl.split.short', "Split");
	public stAtic reAdonly HORIZONTAL_CLASS = 'terminAl-Action codicon-split-horizontAl';
	public stAtic reAdonly VERTICAL_CLASS = 'terminAl-Action codicon-split-verticAl';

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@ICommAndService privAte reAdonly _commAndService: ICommAndService,
		@IWorkspAceContextService privAte reAdonly _workspAceContextService: IWorkspAceContextService
	) {
		super(id, lAbel, SplitTerminAlAction.HORIZONTAL_CLASS);
	}

	public Async run(): Promise<Any> {
		AwAit this._terminAlService.doWithActiveInstAnce(Async t => {
			const cwd = AwAit getCwdForSplit(this._terminAlService.configHelper, t, this._workspAceContextService.getWorkspAce().folders, this._commAndService);
			if (cwd === undefined) {
				return undefined;
			}
			this._terminAlService.splitInstAnce(t, { cwd });
			return this._terminAlService.showPAnel(true);
		});
	}
}

export clAss SplitInActiveWorkspAceTerminAlAction extends Action {
	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.SPLIT_IN_ACTIVE_WORKSPACE;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.splitInActiveWorkspAce', "Split TerminAl (In Active WorkspAce)");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		AwAit this._terminAlService.doWithActiveInstAnce(Async t => {
			const cwd = AwAit getCwdForSplit(this._terminAlService.configHelper, t);
			this._terminAlService.splitInstAnce(t, { cwd });
			AwAit this._terminAlService.showPAnel(true);
		});
	}
}

export clAss TerminAlPAsteAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.PASTE;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.pAste', "PAste into Active TerminAl");
	public stAtic reAdonly SHORT_LABEL = locAlize('workbench.Action.terminAl.pAste.short', "PAste");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		this._terminAlService.getActiveOrCreAteInstAnce()?.pAste();
	}
}

export clAss SelectDefAultShellWindowsTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.SELECT_DEFAULT_SHELL;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.selectDefAultShell', "Select DefAult Shell");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		this._terminAlService.selectDefAultShell();
	}
}

const terminAlIndexRe = /^([0-9]+): /;

export clAss SwitchTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.SWITCH_TERMINAL;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.switchTerminAl', "Switch TerminAl");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@ITerminAlContributionService privAte reAdonly _contributions: ITerminAlContributionService,
		@ICommAndService privAte reAdonly _commAnds: ICommAndService,
	) {
		super(id, lAbel, 'terminAl-Action switch-terminAl');
	}

	public run(item?: string): Promise<Any> {
		if (!item || !item.split) {
			return Promise.resolve(null);
		}
		if (item === SwitchTerminAlActionViewItem.SEPARATOR) {
			this._terminAlService.refreshActiveTAb();
			return Promise.resolve(null);
		}
		if (item === SelectDefAultShellWindowsTerminAlAction.LABEL) {
			this._terminAlService.refreshActiveTAb();
			return this._terminAlService.selectDefAultShell();
		}

		const indexMAtches = terminAlIndexRe.exec(item);
		if (indexMAtches) {
			this._terminAlService.setActiveTAbByIndex(Number(indexMAtches[1]) - 1);
			return this._terminAlService.showPAnel(true);
		}

		const customType = this._contributions.terminAlTypes.find(t => t.title === item);
		if (customType) {
			return this._commAnds.executeCommAnd(customType.commAnd);
		}

		console.wArn(`UnmAtched terminAl item: "${item}"`);
		return Promise.resolve();
	}
}

export clAss SwitchTerminAlActionViewItem extends SelectActionViewItem {

	public stAtic reAdonly SEPARATOR = '─────────';

	constructor(
		Action: IAction,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@IThemeService privAte reAdonly _themeService: IThemeService,
		@ITerminAlContributionService privAte reAdonly _contributions: ITerminAlContributionService,
		@IContextViewService contextViewService: IContextViewService,
	) {
		super(null, Action, getTerminAlSelectOpenItems(_terminAlService, _contributions), _terminAlService.ActiveTAbIndex, contextViewService, { AriALAbel: locAlize('terminAls', 'Open TerminAls.'), optionsAsChildren: true });

		this._register(_terminAlService.onInstAncesChAnged(this._updAteItems, this));
		this._register(_terminAlService.onActiveTAbChAnged(this._updAteItems, this));
		this._register(_terminAlService.onInstAnceTitleChAnged(this._updAteItems, this));
		this._register(_terminAlService.onTAbDisposed(this._updAteItems, this));
		this._register(AttAchSelectBoxStyler(this.selectBox, this._themeService));
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);
		AddClAss(contAiner, 'switch-terminAl');
		this._register(AttAchStylerCAllbAck(this._themeService, { selectBorder }, colors => {
			contAiner.style.borderColor = colors.selectBorder ? `${colors.selectBorder}` : '';
		}));
	}

	privAte _updAteItems(): void {
		this.setOptions(getTerminAlSelectOpenItems(this._terminAlService, this._contributions), this._terminAlService.ActiveTAbIndex);
	}
}

function getTerminAlSelectOpenItems(terminAlService: ITerminAlService, contributions: ITerminAlContributionService): ISelectOptionItem[] {
	const items = terminAlService.getTAbLAbels().mAp(lAbel => <ISelectOptionItem>{ text: lAbel });
	items.push({ text: SwitchTerminAlActionViewItem.SEPARATOR, isDisAbled: true });

	for (const contributed of contributions.terminAlTypes) {
		items.push({ text: contributed.title });
	}

	items.push({ text: SelectDefAultShellWindowsTerminAlAction.LABEL });
	return items;
}

export clAss CleArTerminAlAction extends Action {

	public stAtic reAdonly ID = TERMINAL_COMMAND_ID.CLEAR;
	public stAtic reAdonly LABEL = locAlize('workbench.Action.terminAl.cleAr', "CleAr");

	constructor(
		id: string, lAbel: string,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
		super(id, lAbel);
	}

	Async run() {
		this._terminAlService.doWithActiveInstAnce(t => {
			t.cleAr();
			t.focus();
		});
	}
}

export clAss TerminAlLAunchHelpAction extends Action {

	constructor(
		@IOpenerService privAte reAdonly _openerService: IOpenerService
	) {
		super('workbench.Action.terminAl.lAunchHelp', locAlize('terminAlLAunchHelp', "Open Help"));
	}

	Async run(): Promise<void> {
		this._openerService.open('https://AkA.ms/vscode-troubleshoot-terminAl-lAunch');
	}
}

export function registerTerminAlActions() {
	const cAtegory: ILocAlizedString = { vAlue: TERMINAL_ACTION_CATEGORY, originAl: 'TerminAl' };

	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.NEW_IN_ACTIVE_WORKSPACE,
				title: { vAlue: locAlize('workbench.Action.terminAl.newInActiveWorkspAce', "CreAte New IntegrAted TerminAl (In Active WorkspAce)"), originAl: 'CreAte New IntegrAted TerminAl (In Active WorkspAce)' },
				f1: true,
				cAtegory
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			if (terminAlService.isProcessSupportRegistered) {
				const instAnce = terminAlService.creAteTerminAl(undefined);
				if (!instAnce) {
					return;
				}
				terminAlService.setActiveInstAnce(instAnce);
			}
			AwAit terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FOCUS_PREVIOUS_PANE,
				title: { vAlue: locAlize('workbench.Action.terminAl.focusPreviousPAne', "Focus Previous PAne"), originAl: 'Focus Previous PAne' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Alt | KeyCode.LeftArrow,
					secondAry: [KeyMod.Alt | KeyCode.UpArrow],
					mAc: {
						primAry: KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.LeftArrow,
						secondAry: [KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.UpArrow]
					},
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			terminAlService.getActiveTAb()?.focusPreviousPAne();
			AwAit terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FOCUS_NEXT_PANE,
				title: { vAlue: locAlize('workbench.Action.terminAl.focusNextPAne', "Focus Next PAne"), originAl: 'Focus Next PAne' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Alt | KeyCode.RightArrow,
					secondAry: [KeyMod.Alt | KeyCode.DownArrow],
					mAc: {
						primAry: KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.RightArrow,
						secondAry: [KeyMod.Alt | KeyMod.CtrlCmd | KeyCode.DownArrow]
					},
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			terminAlService.getActiveTAb()?.focusNextPAne();
			AwAit terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RESIZE_PANE_LEFT,
				title: { vAlue: locAlize('workbench.Action.terminAl.resizePAneLeft', "Resize PAne Left"), originAl: 'Resize PAne Left' },
				f1: true,
				cAtegory,
				keybinding: {
					linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.LeftArrow },
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.LeftArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveTAb()?.resizePAne(Direction.Left);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RESIZE_PANE_RIGHT,
				title: { vAlue: locAlize('workbench.Action.terminAl.resizePAneRight', "Resize PAne Right"), originAl: 'Resize PAne Right' },
				f1: true,
				cAtegory,
				keybinding: {
					linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.RightArrow },
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.RightArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveTAb()?.resizePAne(Direction.Right);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RESIZE_PANE_UP,
				title: { vAlue: locAlize('workbench.Action.terminAl.resizePAneUp', "Resize PAne Up"), originAl: 'Resize PAne Up' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.UpArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveTAb()?.resizePAne(Direction.Up);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RESIZE_PANE_DOWN,
				title: { vAlue: locAlize('workbench.Action.terminAl.resizePAneDown', "Resize PAne Down"), originAl: 'Resize PAne Down' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.WinCtrl | KeyCode.DownArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveTAb()?.resizePAne(Direction.Down);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FOCUS,
				title: { vAlue: locAlize('workbench.Action.terminAl.focus', "Focus TerminAl"), originAl: 'Focus TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			const instAnce = terminAlService.getActiveOrCreAteInstAnce();
			if (!instAnce) {
				return;
			}
			terminAlService.setActiveInstAnce(instAnce);
			return terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FOCUS_NEXT,
				title: { vAlue: locAlize('workbench.Action.terminAl.focusNext', "Focus Next TerminAl"), originAl: 'Focus Next TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			terminAlService.setActiveTAbToNext();
			AwAit terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FOCUS_PREVIOUS,
				title: { vAlue: locAlize('workbench.Action.terminAl.focusPrevious', "Focus Previous TerminAl"), originAl: 'Focus Previous TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			terminAlService.setActiveTAbToPrevious();
			AwAit terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RUN_SELECTED_TEXT,
				title: { vAlue: locAlize('workbench.Action.terminAl.runSelectedText', "Run Selected Text In Active TerminAl"), originAl: 'Run Selected Text In Active TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			const codeEditorService = Accessor.get(ICodeEditorService);

			const instAnce = terminAlService.getActiveOrCreAteInstAnce();
			let editor = codeEditorService.getActiveCodeEditor();
			if (!editor || !editor.hAsModel()) {
				return;
			}
			let selection = editor.getSelection();
			let text: string;
			if (selection.isEmpty()) {
				text = editor.getModel().getLineContent(selection.selectionStArtLineNumber).trim();
			} else {
				const endOfLinePreference = isWindows ? EndOfLinePreference.LF : EndOfLinePreference.CRLF;
				text = editor.getModel().getVAlueInRAnge(selection, endOfLinePreference);
			}
			instAnce.sendText(text, true);
			return terminAlService.showPAnel();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RUN_ACTIVE_FILE,
				title: { vAlue: locAlize('workbench.Action.terminAl.runActiveFile', "Run Active File In Active TerminAl"), originAl: 'Run Active File In Active TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			const terminAlService = Accessor.get(ITerminAlService);
			const codeEditorService = Accessor.get(ICodeEditorService);
			const notificAtionService = Accessor.get(INotificAtionService);

			const instAnce = terminAlService.getActiveOrCreAteInstAnce();
			AwAit instAnce.processReAdy;

			const editor = codeEditorService.getActiveCodeEditor();
			if (!editor || !editor.hAsModel()) {
				return;
			}

			const uri = editor.getModel().uri;
			if (uri.scheme !== SchemAs.file) {
				notificAtionService.wArn(locAlize('workbench.Action.terminAl.runActiveFile.noFile', 'Only files on disk cAn be run in the terminAl'));
				return;
			}

			// TODO: Convert this to ctrl+c, ctrl+v for pwsh?
			const pAth = AwAit terminAlService.prepArePAthForTerminAlAsync(uri.fsPAth, instAnce.shellLAunchConfig.executAble, instAnce.title, instAnce.shellType);
			instAnce.sendText(pAth, true);
			return terminAlService.showPAnel();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_DOWN_LINE,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollDown', "Scroll Down (Line)"), originAl: 'Scroll Down (Line)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.PAgeDown,
					linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.DownArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollDownLine();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_DOWN_PAGE,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollDownPAge', "Scroll Down (PAge)"), originAl: 'Scroll Down (PAge)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Shift | KeyCode.PAgeDown,
					mAc: { primAry: KeyCode.PAgeDown },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollDownPAge();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_TO_BOTTOM,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollToBottom', "Scroll to Bottom"), originAl: 'Scroll to Bottom' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyCode.End,
					linux: { primAry: KeyMod.Shift | KeyCode.End },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollToBottom();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_UP_LINE,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollUp', "Scroll Up (Line)"), originAl: 'Scroll Up (Line)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.PAgeUp,
					linux: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.UpArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollUpLine();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_UP_PAGE,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollUpPAge', "Scroll Up (PAge)"), originAl: 'Scroll Up (PAge)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Shift | KeyCode.PAgeUp,
					mAc: { primAry: KeyCode.PAgeUp },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollUpPAge();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_TO_TOP,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollToTop', "Scroll to Top"), originAl: 'Scroll to Top' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyCode.Home,
					linux: { primAry: KeyMod.Shift | KeyCode.Home },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.scrollToTop();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.NAVIGATION_MODE_EXIT,
				title: { vAlue: locAlize('workbench.Action.terminAl.nAvigAtionModeExit', "Exit NAvigAtion Mode"), originAl: 'Exit NAvigAtion Mode' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyCode.EscApe,
					when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.nAvigAtionMode?.exitNAvigAtionMode();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.NAVIGATION_MODE_FOCUS_PREVIOUS,
				title: { vAlue: locAlize('workbench.Action.terminAl.nAvigAtionModeFocusPrevious', "Focus Previous Line (NAvigAtion Mode)"), originAl: 'Focus Previous Line (NAvigAtion Mode)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyCode.UpArrow,
					when: ContextKeyExpr.or(
						ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
						ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED)
					),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.nAvigAtionMode?.focusPreviousLine();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.NAVIGATION_MODE_FOCUS_NEXT,
				title: { vAlue: locAlize('workbench.Action.terminAl.nAvigAtionModeFocusNext', "Focus Next Line (NAvigAtion Mode)"), originAl: 'Focus Next Line (NAvigAtion Mode)' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyCode.DownArrow,
					when: ContextKeyExpr.or(
						ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_A11Y_TREE_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED),
						ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED)
					),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.nAvigAtionMode?.focusNextLine();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.CLEAR_SELECTION,
				title: { vAlue: locAlize('workbench.Action.terminAl.cleArSelection', "CleAr Selection"), originAl: 'CleAr Selection' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyCode.EscApe,
					when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED, KEYBINDING_CONTEXT_TERMINAL_FIND_NOT_VISIBLE),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			const terminAlInstAnce = Accessor.get(ITerminAlService).getActiveInstAnce();
			if (terminAlInstAnce && terminAlInstAnce.hAsSelection()) {
				terminAlInstAnce.cleArSelection();
			}
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.MANAGE_WORKSPACE_SHELL_PERMISSIONS,
				title: { vAlue: locAlize('workbench.Action.terminAl.mAnAgeWorkspAceShellPermissions', "MAnAge WorkspAce Shell Permissions"), originAl: 'MAnAge WorkspAce Shell Permissions' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).mAnAgeWorkspAceShellPermissions();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RENAME,
				title: { vAlue: locAlize('workbench.Action.terminAl.renAme', "RenAme"), originAl: 'RenAme' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor) {
			AwAit Accessor.get(ITerminAlService).doWithActiveInstAnce(Async t => {
				const nAme = AwAit Accessor.get(IQuickInputService).input({
					vAlue: t.title,
					prompt: locAlize('workbench.Action.terminAl.renAme.prompt', "Enter terminAl nAme"),
				});
				if (nAme) {
					t.setTitle(nAme, TitleEventSource.Api);
				}
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FIND_FOCUS,
				title: { vAlue: locAlize('workbench.Action.terminAl.focusFind', "Focus Find"), originAl: 'Focus Find' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.CtrlCmd | KeyCode.KEY_F,
					when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED, KEYBINDING_CONTEXT_TERMINAL_FOCUS),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).focusFindWidget();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FIND_HIDE,
				title: { vAlue: locAlize('workbench.Action.terminAl.hideFind', "Hide Find"), originAl: 'Hide Find' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyCode.EscApe,
					secondAry: [KeyMod.Shift | KeyCode.EscApe],
					when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_VISIBLE),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).hideFindWidget();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.QUICK_OPEN_TERM,
				title: { vAlue: locAlize('quickAccessTerminAl', "Switch Active TerminAl"), originAl: 'Switch Active TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(IQuickInputService).quickAccess.show(TerminAlQuickAccessProvider.PREFIX);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_TO_PREVIOUS_COMMAND,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollToPreviousCommAnd', "Scroll To Previous CommAnd"), originAl: 'Scroll To Previous CommAnd' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyCode.UpArrow },
					when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negAte()),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.scrollToPreviousCommAnd();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SCROLL_TO_NEXT_COMMAND,
				title: { vAlue: locAlize('workbench.Action.terminAl.scrollToNextCommAnd', "Scroll To Next CommAnd"), originAl: 'Scroll To Next CommAnd' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyCode.DownArrow },
					when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_FOCUS, CONTEXT_ACCESSIBILITY_MODE_ENABLED.negAte()),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.scrollToNextCommAnd();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SELECT_TO_PREVIOUS_COMMAND,
				title: { vAlue: locAlize('workbench.Action.terminAl.selectToPreviousCommAnd', "Select To Previous CommAnd"), originAl: 'Select To Previous CommAnd' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.UpArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.selectToPreviousCommAnd();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SELECT_TO_NEXT_COMMAND,
				title: { vAlue: locAlize('workbench.Action.terminAl.selectToNextCommAnd', "Select To Next CommAnd"), originAl: 'Select To Next CommAnd' },
				f1: true,
				cAtegory,
				keybinding: {
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.DownArrow },
					when: KEYBINDING_CONTEXT_TERMINAL_FOCUS,
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.selectToNextCommAnd();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SELECT_TO_PREVIOUS_LINE,
				title: { vAlue: locAlize('workbench.Action.terminAl.selectToPreviousLine', "Select To Previous Line"), originAl: 'Select To Previous Line' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.selectToPreviousLine();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SELECT_TO_NEXT_LINE,
				title: { vAlue: locAlize('workbench.Action.terminAl.selectToNextLine', "Select To Next Line"), originAl: 'Select To Next Line' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).doWithActiveInstAnce(t => {
				t.commAndTrAcker?.selectToNextLine();
				t.focus();
			});
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.TOGGLE_ESCAPE_SEQUENCE_LOGGING,
				title: { vAlue: locAlize('workbench.Action.terminAl.toggleEscApeSequenceLogging', "Toggle EscApe Sequence Logging"), originAl: 'Toggle EscApe Sequence Logging' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.toggleEscApeSequenceLogging();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			const title = locAlize('workbench.Action.terminAl.sendSequence', "Send Custom Sequence To TerminAl");
			super({
				id: TERMINAL_COMMAND_ID.SEND_SEQUENCE,
				title: { vAlue: title, originAl: 'Send Custom Sequence To TerminAl' },
				cAtegory,
				description: {
					description: title,
					Args: [{
						nAme: 'Args',
						schemA: {
							type: 'object',
							required: ['text'],
							properties: {
								text: { type: 'string' }
							},
						}
					}]
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor, Args?: { text?: string }) {
			terminAlSendSequenceCommAnd(Accessor, Args);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			const title = locAlize('workbench.Action.terminAl.newWithCwd', "CreAte New IntegrAted TerminAl StArting in A Custom Working Directory");
			super({
				id: TERMINAL_COMMAND_ID.NEW_WITH_CWD,
				title: { vAlue: title, originAl: 'CreAte New IntegrAted TerminAl StArting in A Custom Working Directory' },
				cAtegory,
				description: {
					description: title,
					Args: [{
						nAme: 'Args',
						schemA: {
							type: 'object',
							required: ['cwd'],
							properties: {
								cwd: {
									description: locAlize('workbench.Action.terminAl.newWithCwd.cwd', "The directory to stArt the terminAl At"),
									type: 'string'
								}
							},
						}
					}]
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		Async run(Accessor: ServicesAccessor, Args?: { cwd?: string }) {
			const terminAlService = Accessor.get(ITerminAlService);
			if (terminAlService.isProcessSupportRegistered) {
				const instAnce = terminAlService.creAteTerminAl({ cwd: Args?.cwd });
				if (!instAnce) {
					return;
				}
				terminAlService.setActiveInstAnce(instAnce);
			}
			return terminAlService.showPAnel(true);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			const title = locAlize('workbench.Action.terminAl.renAmeWithArg', "RenAme the Currently Active TerminAl");
			super({
				id: TERMINAL_COMMAND_ID.RENAME_WITH_ARG,
				title: { vAlue: title, originAl: 'RenAme the Currently Active TerminAl' },
				cAtegory,
				description: {
					description: title,
					Args: [{
						nAme: 'Args',
						schemA: {
							type: 'object',
							required: ['nAme'],
							properties: {
								nAme: {
									description: locAlize('workbench.Action.terminAl.renAmeWithArg.nAme', "The new nAme for the terminAl"),
									type: 'string',
									minLength: 1
								}
							}
						}
					}]
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor, Args?: { nAme?: string }) {
			const notificAtionService = Accessor.get(INotificAtionService);
			if (!Args?.nAme) {
				notificAtionService.wArn(locAlize('workbench.Action.terminAl.renAmeWithArg.noNAme', "No nAme Argument provided"));
				return;
			}
			Accessor.get(ITerminAlService).getActiveInstAnce()?.setTitle(Args.nAme, TitleEventSource.Api);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.TOGGLE_FIND_REGEX,
				title: { vAlue: locAlize('workbench.Action.terminAl.toggleFindRegex', "Toggle Find Using Regex"), originAl: 'Toggle Find Using Regex' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Alt | KeyCode.KEY_R,
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_R },
					when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			const stAte = Accessor.get(ITerminAlService).getFindStAte();
			stAte.chAnge({ isRegex: !stAte.isRegex }, fAlse);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.TOGGLE_FIND_WHOLE_WORD,
				title: { vAlue: locAlize('workbench.Action.terminAl.toggleFindWholeWord', "Toggle Find Using Whole Word"), originAl: 'Toggle Find Using Whole Word' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Alt | KeyCode.KEY_W,
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_W },
					when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			const stAte = Accessor.get(ITerminAlService).getFindStAte();
			stAte.chAnge({ wholeWord: !stAte.wholeWord }, fAlse);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.TOGGLE_FIND_CASE_SENSITIVE,
				title: { vAlue: locAlize('workbench.Action.terminAl.toggleFindCAseSensitive', "Toggle Find Using CAse Sensitive"), originAl: 'Toggle Find Using CAse Sensitive' },
				f1: true,
				cAtegory,
				keybinding: {
					primAry: KeyMod.Alt | KeyCode.KEY_C,
					mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C },
					when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED),
					weight: KeybindingWeight.WorkbenchContrib
				},
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			const stAte = Accessor.get(ITerminAlService).getFindStAte();
			stAte.chAnge({ mAtchCAse: !stAte.mAtchCAse }, fAlse);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FIND_NEXT,
				title: { vAlue: locAlize('workbench.Action.terminAl.findNext', "Find Next"), originAl: 'Find Next' },
				f1: true,
				cAtegory,
				keybinding: [
					{
						primAry: KeyCode.F3,
						mAc: { primAry: KeyMod.CtrlCmd | KeyCode.KEY_G, secondAry: [KeyCode.F3] },
						when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED),
						weight: KeybindingWeight.WorkbenchContrib
					},
					{
						primAry: KeyMod.Shift | KeyCode.Enter,
						when: KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED,
						weight: KeybindingWeight.WorkbenchContrib
					}
				],
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).findNext();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.FIND_PREVIOUS,
				title: { vAlue: locAlize('workbench.Action.terminAl.findPrevious', "Find Previous"), originAl: 'Find Previous' },
				f1: true,
				cAtegory,
				keybinding: [
					{
						primAry: KeyMod.Shift | KeyCode.F3,
						mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_G, secondAry: [KeyMod.Shift | KeyCode.F3] },
						when: ContextKeyExpr.or(KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED),
						weight: KeybindingWeight.WorkbenchContrib
					},
					{
						primAry: KeyCode.Enter,
						when: KEYBINDING_CONTEXT_TERMINAL_FIND_FOCUSED,
						weight: KeybindingWeight.WorkbenchContrib
					}
				],
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).findPrevious();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SEARCH_WORKSPACE,
				title: { vAlue: locAlize('workbench.Action.terminAl.seArchWorkspAce', "SeArch WorkspAce"), originAl: 'SeArch WorkspAce' },
				f1: true,
				cAtegory,
				keybinding: [
					{
						primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_F,
						when: ContextKeyExpr.And(KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED, KEYBINDING_CONTEXT_TERMINAL_FOCUS, KEYBINDING_CONTEXT_TERMINAL_TEXT_SELECTED),
						weight: KeybindingWeight.WorkbenchContrib
					}
				],
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			const query = Accessor.get(ITerminAlService).getActiveInstAnce()?.selection;
			FindInFilesCommAnd(Accessor, { query } As IFindInFilesArgs);
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.RELAUNCH,
				title: { vAlue: locAlize('workbench.Action.terminAl.relAunch', "RelAunch Active TerminAl"), originAl: 'RelAunch Active TerminAl' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.relAunch();
		}
	});
	registerAction2(clAss extends Action2 {
		constructor() {
			super({
				id: TERMINAL_COMMAND_ID.SHOW_ENVIRONMENT_INFORMATION,
				title: { vAlue: locAlize('workbench.Action.terminAl.showEnvironmentInformAtion', "Show Environment InformAtion"), originAl: 'Show Environment InformAtion' },
				f1: true,
				cAtegory,
				precondition: KEYBINDING_CONTEXT_TERMINAL_PROCESS_SUPPORTED
			});
		}
		run(Accessor: ServicesAccessor) {
			Accessor.get(ITerminAlService).getActiveInstAnce()?.showEnvironmentInfoHover();
		}
	});
}
