/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/bAse/common/Actions';
import { distinct } from 'vs/bAse/common/ArrAys';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import * As plAtform from 'vs/bAse/common/plAtform';
import { dirnAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { ToggleCAseSensitiveKeybinding, TogglePreserveCAseKeybinding, ToggleRegexKeybinding, ToggleWholeWordKeybinding } from 'vs/editor/contrib/find/findModel';
import * As nls from 'vs/nls';
import { ICommAndAction, MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry, ICommAndHAndler } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionScope, Extensions As ConfigurAtionExtensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IFileService } from 'vs/plAtform/files/common/files';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IListService, WorkbenchListFocusContextKey, WorkbenchObjectTree } from 'vs/plAtform/list/browser/listService';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { defAultQuickAccessContextKeyVAlue } from 'vs/workbench/browser/quickAccess';
import { CATEGORIES, Extensions As ActionExtensions, IWorkbenchActionRegistry } from 'vs/workbench/common/Actions';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { Extensions As ViewExtensions, IViewsRegistry, IViewContAinersRegistry, ViewContAinerLocAtion, IViewDescriptorService, IViewsService } from 'vs/workbench/common/views';
import { getMultiSelectedResources } from 'vs/workbench/contrib/files/browser/files';
import { ExplorerFolderContext, ExplorerRootContext, FilesExplorerFocusCondition, IExplorerService, VIEWLET_ID As VIEWLET_ID_FILES } from 'vs/workbench/contrib/files/common/files';
import { registerContributions As replAceContributions } from 'vs/workbench/contrib/seArch/browser/replAceContributions';
import { cleArHistoryCommAnd, CleArSeArchResultsAction, CloseReplAceAction, CollApseDeepestExpAndedLevelAction, copyAllCommAnd, copyMAtchCommAnd, copyPAthCommAnd, FocusNextInputAction, FocusNextSeArchResultAction, FocusPreviousInputAction, FocusPreviousSeArchResultAction, focusSeArchListCommAnd, getSeArchView, openSeArchView, OpenSeArchViewletAction, RefreshAction, RemoveAction, ReplAceAction, ReplAceAllAction, ReplAceAllInFolderAction, ReplAceInFilesAction, toggleCAseSensitiveCommAnd, togglePreserveCAseCommAnd, toggleRegexCommAnd, toggleWholeWordCommAnd, FindInFilesCommAnd, ToggleSeArchOnTypeAction, ExpAndAllAction } from 'vs/workbench/contrib/seArch/browser/seArchActions';
import { SeArchView } from 'vs/workbench/contrib/seArch/browser/seArchView';
import { registerContributions As seArchWidgetContributions } from 'vs/workbench/contrib/seArch/browser/seArchWidget';
import * As ConstAnts from 'vs/workbench/contrib/seArch/common/constAnts';
import * As SeArchEditorConstAnts from 'vs/workbench/contrib/seArchEditor/browser/constAnts';
import { getWorkspAceSymbols } from 'vs/workbench/contrib/seArch/common/seArch';
import { ISeArchHistoryService, SeArchHistoryService } from 'vs/workbench/contrib/seArch/common/seArchHistoryService';
import { FileMAtchOrMAtch, ISeArchWorkbenchService, RenderAbleMAtch, SeArchWorkbenchService, FileMAtch, MAtch, FolderMAtch } from 'vs/workbench/contrib/seArch/common/seArchModel';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { VIEWLET_ID, VIEW_ID, SEARCH_EXCLUDE_CONFIG, SeArchSortOrder } from 'vs/workbench/services/seArch/common/seArch';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ExplorerViewPAneContAiner } from 'vs/workbench/contrib/files/browser/explorerViewlet';
import { AssertType, AssertIsDefined } from 'vs/bAse/common/types';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { SeArchEditor } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditor';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IQuickAccessRegistry, Extensions As QuickAccessExtensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { SymbolsQuickAccessProvider } from 'vs/workbench/contrib/seArch/browser/symbolsQuickAccess';
import { AnythingQuickAccessProvider } from 'vs/workbench/contrib/seArch/browser/AnythingQuickAccess';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { AbstrActGotoLineQuickAccessProvider } from 'vs/editor/contrib/quickAccess/gotoLineQuickAccess';
import { GotoSymbolQuickAccessProvider } from 'vs/workbench/contrib/codeEditor/browser/quickAccess/gotoSymbolQuickAccess';
import { seArchViewIcon } from 'vs/workbench/contrib/seArch/browser/seArchIcons';

registerSingleton(ISeArchWorkbenchService, SeArchWorkbenchService, true);
registerSingleton(ISeArchHistoryService, SeArchHistoryService, true);

replAceContributions();
seArchWidgetContributions();

const cAtegory = { vAlue: nls.locAlize('seArch', "SeArch"), originAl: 'SeArch' };

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: 'workbench.Action.seArch.toggleQueryDetAils',
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.or(ConstAnts.SeArchViewFocusedKey, SeArchEditorConstAnts.InSeArchEditor),
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_J,
	hAndler: Accessor => {
		const contextService = Accessor.get(IContextKeyService).getContext(document.ActiveElement);
		if (contextService.getVAlue(SeArchEditorConstAnts.InSeArchEditor.seriAlize())) {
			(Accessor.get(IEditorService).ActiveEditorPAne As SeArchEditor).toggleQueryDetAils();
		} else if (contextService.getVAlue(ConstAnts.SeArchViewFocusedKey.seriAlize())) {
			const seArchView = getSeArchView(Accessor.get(IViewsService));
			AssertIsDefined(seArchView).toggleQueryDetAils();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.FocusSeArchFromResults,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.FirstMAtchFocusKey),
	primAry: KeyMod.CtrlCmd | KeyCode.UpArrow,
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			seArchView.focusPreviousInputBox();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.OpenMAtch,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.FileMAtchOrMAtchFocusKey),
	primAry: KeyCode.Enter,
	mAc: {
		primAry: KeyCode.Enter,
		secondAry: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	hAndler: (Accessor) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			seArchView.open(<FileMAtchOrMAtch>tree.getFocus()[0], fAlse, fAlse, true);
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.OpenMAtchToSide,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.FileMAtchOrMAtchFocusKey),
	primAry: KeyMod.CtrlCmd | KeyCode.Enter,
	mAc: {
		primAry: KeyMod.WinCtrl | KeyCode.Enter
	},
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			seArchView.open(<FileMAtchOrMAtch>tree.getFocus()[0], fAlse, true, true);
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.CAncelActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, WorkbenchListFocusContextKey),
	primAry: KeyCode.EscApe,
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			seArchView.cAncelSeArch();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.RemoveActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.FileMAtchOrMAtchFocusKey),
	primAry: KeyCode.Delete,
	mAc: {
		primAry: KeyMod.CtrlCmd | KeyCode.BAckspAce,
	},
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			Accessor.get(IInstAntiAtionService).creAteInstAnce(RemoveAction, tree, tree.getFocus()[0]!).run();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.ReplAceActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.ReplAceActiveKey, ConstAnts.MAtchFocusKey),
	primAry: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			Accessor.get(IInstAntiAtionService).creAteInstAnce(ReplAceAction, tree, tree.getFocus()[0] As MAtch, seArchView).run();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.ReplAceAllInFileActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.ReplAceActiveKey, ConstAnts.FileFocusKey),
	primAry: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	secondAry: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter],
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			Accessor.get(IInstAntiAtionService).creAteInstAnce(ReplAceAllAction, seArchView, tree.getFocus()[0] As FileMAtch).run();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.ReplAceAllInFolderActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.ReplAceActiveKey, ConstAnts.FolderFocusKey),
	primAry: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	secondAry: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter],
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			Accessor.get(IInstAntiAtionService).creAteInstAnce(ReplAceAllInFolderAction, tree, tree.getFocus()[0] As FolderMAtch).run();
		}
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.CloseReplAceWidgetActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.ReplAceInputBoxFocusedKey),
	primAry: KeyCode.EscApe,
	hAndler: (Accessor, Args: Any) => {
		Accessor.get(IInstAntiAtionService).creAteInstAnce(CloseReplAceAction, ConstAnts.CloseReplAceWidgetActionId, '').run();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: FocusNextInputAction.ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.or(
		ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor, ConstAnts.InputBoxFocusedKey),
		ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.InputBoxFocusedKey)),
	primAry: KeyMod.CtrlCmd | KeyCode.DownArrow,
	hAndler: (Accessor, Args: Any) => {
		Accessor.get(IInstAntiAtionService).creAteInstAnce(FocusNextInputAction, FocusNextInputAction.ID, '').run();
	}
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: FocusPreviousInputAction.ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.or(
		ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor, ConstAnts.InputBoxFocusedKey),
		ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.InputBoxFocusedKey, ConstAnts.SeArchInputBoxFocusedKey.toNegAted())),
	primAry: KeyMod.CtrlCmd | KeyCode.UpArrow,
	hAndler: (Accessor, Args: Any) => {
		Accessor.get(IInstAntiAtionService).creAteInstAnce(FocusPreviousInputAction, FocusPreviousInputAction.ID, '').run();
	}
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.ReplAceActionId,
		title: ReplAceAction.LABEL
	},
	when: ContextKeyExpr.And(ConstAnts.ReplAceActiveKey, ConstAnts.MAtchFocusKey),
	group: 'seArch',
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.ReplAceAllInFolderActionId,
		title: ReplAceAllInFolderAction.LABEL
	},
	when: ContextKeyExpr.And(ConstAnts.ReplAceActiveKey, ConstAnts.FolderFocusKey),
	group: 'seArch',
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.ReplAceAllInFileActionId,
		title: ReplAceAllAction.LABEL
	},
	when: ContextKeyExpr.And(ConstAnts.ReplAceActiveKey, ConstAnts.FileFocusKey),
	group: 'seArch',
	order: 1
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.RemoveActionId,
		title: RemoveAction.LABEL
	},
	when: ConstAnts.FileMAtchOrMAtchFocusKey,
	group: 'seArch',
	order: 2
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.CopyMAtchCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.FileMAtchOrMAtchFocusKey,
	primAry: KeyMod.CtrlCmd | KeyCode.KEY_C,
	hAndler: copyMAtchCommAnd
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.CopyMAtchCommAndId,
		title: nls.locAlize('copyMAtchLAbel', "Copy")
	},
	when: ConstAnts.FileMAtchOrMAtchFocusKey,
	group: 'seArch_2',
	order: 1
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.CopyPAthCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.FileMAtchOrFolderMAtchWithResourceFocusKey,
	primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C,
	win: {
		primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_C
	},
	hAndler: copyPAthCommAnd
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.CopyPAthCommAndId,
		title: nls.locAlize('copyPAthLAbel', "Copy PAth")
	},
	when: ConstAnts.FileMAtchOrFolderMAtchWithResourceFocusKey,
	group: 'seArch_2',
	order: 2
});

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: {
		id: ConstAnts.CopyAllCommAndId,
		title: nls.locAlize('copyAllLAbel', "Copy All")
	},
	when: ConstAnts.HAsSeArchResults,
	group: 'seArch_2',
	order: 3
});

CommAndsRegistry.registerCommAnd({
	id: ConstAnts.CopyAllCommAndId,
	hAndler: copyAllCommAnd
});

CommAndsRegistry.registerCommAnd({
	id: ConstAnts.CleArSeArchHistoryCommAndId,
	hAndler: cleArHistoryCommAnd
});

CommAndsRegistry.registerCommAnd({
	id: ConstAnts.ReveAlInSideBArForSeArchResults,
	hAndler: (Accessor, Args: Any) => {
		const viewletService = Accessor.get(IViewletService);
		const explorerService = Accessor.get(IExplorerService);
		const contextService = Accessor.get(IWorkspAceContextService);

		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (!seArchView) {
			return;
		}

		let fileMAtch: FileMAtch;
		if (!(Args instAnceof FileMAtch)) {
			Args = seArchView.getControl().getFocus()[0];
		}
		if (Args instAnceof FileMAtch) {
			fileMAtch = Args;
		} else {
			return;
		}

		viewletService.openViewlet(VIEWLET_ID_FILES, fAlse).then((viewlet) => {
			if (!viewlet) {
				return;
			}

			const explorerViewContAiner = viewlet.getViewPAneContAiner() As ExplorerViewPAneContAiner;
			const uri = fileMAtch.resource;
			if (uri && contextService.isInsideWorkspAce(uri)) {
				const explorerView = explorerViewContAiner.getExplorerView();
				explorerView.setExpAnded(true);
				explorerService.select(uri, true).then(() => explorerView.focus(), onUnexpectedError);
			}
		});
	}
});

const ReveAlInSideBArForSeArchResultsCommAnd: ICommAndAction = {
	id: ConstAnts.ReveAlInSideBArForSeArchResults,
	title: nls.locAlize('reveAlInSideBAr', "ReveAl in Side BAr")
};

MenuRegistry.AppendMenuItem(MenuId.SeArchContext, {
	commAnd: ReveAlInSideBArForSeArchResultsCommAnd,
	when: ContextKeyExpr.And(ConstAnts.FileFocusKey, ConstAnts.HAsSeArchResults),
	group: 'seArch_3',
	order: 1
});

const CleArSeArchHistoryCommAnd: ICommAndAction = {
	id: ConstAnts.CleArSeArchHistoryCommAndId,
	title: { vAlue: nls.locAlize('cleArSeArchHistoryLAbel', "CleAr SeArch History"), originAl: 'CleAr SeArch History' },
	cAtegory
};
MenuRegistry.AddCommAnd(CleArSeArchHistoryCommAnd);

CommAndsRegistry.registerCommAnd({
	id: ConstAnts.FocusSeArchListCommAndID,
	hAndler: focusSeArchListCommAnd
});

const FocusSeArchListCommAnd: ICommAndAction = {
	id: ConstAnts.FocusSeArchListCommAndID,
	title: { vAlue: nls.locAlize('focusSeArchListCommAndLAbel', "Focus List"), originAl: 'Focus List' },
	cAtegory
};
MenuRegistry.AddCommAnd(FocusSeArchListCommAnd);

const seArchInFolderCommAnd: ICommAndHAndler = (Accessor, resource?: URI) => {
	const listService = Accessor.get(IListService);
	const fileService = Accessor.get(IFileService);
	const viewsService = Accessor.get(IViewsService);
	const resources = getMultiSelectedResources(resource, listService, Accessor.get(IEditorService), Accessor.get(IExplorerService));

	return openSeArchView(viewsService, true).then(seArchView => {
		if (resources && resources.length && seArchView) {
			return fileService.resolveAll(resources.mAp(resource => ({ resource }))).then(results => {
				const folders: URI[] = [];

				results.forEAch(result => {
					if (result.success && result.stAt) {
						folders.push(result.stAt.isDirectory ? result.stAt.resource : dirnAme(result.stAt.resource));
					}
				});

				seArchView.seArchInFolders(distinct(folders, folder => folder.toString()));
			});
		}

		return undefined;
	});
};

const FIND_IN_FOLDER_ID = 'filesExplorer.findInFolder';
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: FIND_IN_FOLDER_ID,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(FilesExplorerFocusCondition, ExplorerFolderContext),
	primAry: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
	hAndler: seArchInFolderCommAnd
});

CommAndsRegistry.registerCommAnd({
	id: CleArSeArchResultsAction.ID,
	hAndler: (Accessor, Args: Any) => {
		Accessor.get(IInstAntiAtionService).creAteInstAnce(CleArSeArchResultsAction, CleArSeArchResultsAction.ID, '').run();
	}
});

CommAndsRegistry.registerCommAnd({
	id: RefreshAction.ID,
	hAndler: (Accessor, Args: Any) => {
		Accessor.get(IInstAntiAtionService).creAteInstAnce(RefreshAction, RefreshAction.ID, '').run();
	}
});

const FIND_IN_WORKSPACE_ID = 'filesExplorer.findInWorkspAce';
CommAndsRegistry.registerCommAnd({
	id: FIND_IN_WORKSPACE_ID,
	hAndler: (Accessor) => {
		return openSeArchView(Accessor.get(IViewsService), true).then(seArchView => {
			if (seArchView) {
				seArchView.seArchInFolders();
			}
		});
	}
});

MenuRegistry.AppendMenuItem(MenuId.ExplorerContext, {
	group: '4_seArch',
	order: 10,
	commAnd: {
		id: FIND_IN_FOLDER_ID,
		title: nls.locAlize('findInFolder', "Find in Folder...")
	},
	when: ContextKeyExpr.And(ExplorerFolderContext)
});

MenuRegistry.AppendMenuItem(MenuId.ExplorerContext, {
	group: '4_seArch',
	order: 10,
	commAnd: {
		id: FIND_IN_WORKSPACE_ID,
		title: nls.locAlize('findInWorkspAce', "Find in WorkspAce...")
	},
	when: ContextKeyExpr.And(ExplorerRootContext, ExplorerFolderContext.toNegAted())
});


clAss ShowAllSymbolsAction extends Action {

	stAtic reAdonly ID = 'workbench.Action.showAllSymbols';
	stAtic reAdonly LABEL = nls.locAlize('showTriggerActions', "Go to Symbol in WorkspAce...");
	stAtic reAdonly ALL_SYMBOLS_PREFIX = '#';

	constructor(
		ActionId: string,
		ActionLAbel: string,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService
	) {
		super(ActionId, ActionLAbel);
	}

	Async run(): Promise<void> {
		this.quickInputService.quickAccess.show(ShowAllSymbolsAction.ALL_SYMBOLS_PREFIX);
	}
}

const viewContAiner = Registry.As<IViewContAinersRegistry>(ViewExtensions.ViewContAinersRegistry).registerViewContAiner({
	id: VIEWLET_ID,
	nAme: nls.locAlize('nAme', "SeArch"),
	ctorDescriptor: new SyncDescriptor(ViewPAneContAiner, [VIEWLET_ID, { mergeViewWithContAinerWhenSingleView: true, donotShowContAinerTitleWhenMergedWithContAiner: true }]),
	hideIfEmpty: true,
	icon: seArchViewIcon.clAssNAmes,
	order: 1
}, ViewContAinerLocAtion.SidebAr);

const viewDescriptor = { id: VIEW_ID, contAinerIcon: 'codicon-seArch', nAme: nls.locAlize('seArch', "SeArch"), ctorDescriptor: new SyncDescriptor(SeArchView), cAnToggleVisibility: fAlse, cAnMoveView: true };

// Register seArch defAult locAtion to sidebAr
Registry.As<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContAiner);


// MigrAte seArch locAtion setting to new model
clAss RegisterSeArchViewContribution implements IWorkbenchContribution {
	constructor(
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		const dAtA = configurAtionService.inspect('seArch.locAtion');

		if (dAtA.vAlue === 'pAnel') {
			viewDescriptorService.moveViewToLocAtion(viewDescriptor, ViewContAinerLocAtion.PAnel);
		}

		if (dAtA.userVAlue) {
			configurAtionService.updAteVAlue('seArch.locAtion', undefined, ConfigurAtionTArget.USER);
		}

		if (dAtA.userLocAlVAlue) {
			configurAtionService.updAteVAlue('seArch.locAtion', undefined, ConfigurAtionTArget.USER_LOCAL);
		}

		if (dAtA.userRemoteVAlue) {
			configurAtionService.updAteVAlue('seArch.locAtion', undefined, ConfigurAtionTArget.USER_REMOTE);
		}

		if (dAtA.workspAceFolderVAlue) {
			configurAtionService.updAteVAlue('seArch.locAtion', undefined, ConfigurAtionTArget.WORKSPACE_FOLDER);
		}

		if (dAtA.workspAceVAlue) {
			configurAtionService.updAteVAlue('seArch.locAtion', undefined, ConfigurAtionTArget.WORKSPACE);
		}
	}
}
Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(RegisterSeArchViewContribution, LifecyclePhAse.StArting);

// Actions
const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);

// Show SeArch And Find in Files Are redundAnt, but we cAn't breAk keybindings by removing one. So it's the sAme Action, sAme keybinding, registered to different IDs.
// Show SeArch 'when' is redundAnt but if the two conflict with exActly the sAme keybinding And 'when' clAuse, then they cAn show up As "unbound" - #51780
registry.registerWorkbenchAction(SyncActionDescriptor.from(OpenSeArchViewletAction, { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_F }, ConstAnts.SeArchViewVisibleKey.toNegAted()), 'View: Show SeArch', CATEGORIES.View.vAlue);
KeybindingsRegistry.registerCommAndAndKeybindingRule({
	description: {
		description: nls.locAlize('findInFiles.description', "Open the seArch viewlet"),
		Args: [
			{
				nAme: nls.locAlize('findInFiles.Args', "A set of options for the seArch viewlet"),
				schemA: {
					type: 'object',
					properties: {
						query: { 'type': 'string' },
						replAce: { 'type': 'string' },
						triggerSeArch: { 'type': 'booleAn' },
						filesToInclude: { 'type': 'string' },
						filesToExclude: { 'type': 'string' },
						isRegex: { 'type': 'booleAn' },
						isCAseSensitive: { 'type': 'booleAn' },
						mAtchWholeWord: { 'type': 'booleAn' },
					}
				}
			},
		]
	},
	id: ConstAnts.FindInFilesActionId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: null,
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_F,
	hAndler: FindInFilesCommAnd
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, { commAnd: { id: ConstAnts.FindInFilesActionId, title: { vAlue: nls.locAlize('findInFiles', "Find in Files"), originAl: 'Find in Files' }, cAtegory } });
MenuRegistry.AppendMenuItem(MenuId.MenubArEditMenu, {
	group: '4_find_globAl',
	commAnd: {
		id: ConstAnts.FindInFilesActionId,
		title: nls.locAlize({ key: 'miFindInFiles', comment: ['&& denotes A mnemonic'] }, "Find &&in Files")
	},
	order: 1
});

registry.registerWorkbenchAction(SyncActionDescriptor.from(FocusNextSeArchResultAction, { primAry: KeyCode.F4 }), 'SeArch: Focus Next SeArch Result', cAtegory.vAlue, ContextKeyExpr.or(ConstAnts.HAsSeArchResults, SeArchEditorConstAnts.InSeArchEditor));
registry.registerWorkbenchAction(SyncActionDescriptor.from(FocusPreviousSeArchResultAction, { primAry: KeyMod.Shift | KeyCode.F4 }), 'SeArch: Focus Previous SeArch Result', cAtegory.vAlue, ContextKeyExpr.or(ConstAnts.HAsSeArchResults, SeArchEditorConstAnts.InSeArchEditor));

registry.registerWorkbenchAction(SyncActionDescriptor.from(ReplAceInFilesAction, { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_H }), 'SeArch: ReplAce in Files', cAtegory.vAlue);
MenuRegistry.AppendMenuItem(MenuId.MenubArEditMenu, {
	group: '4_find_globAl',
	commAnd: {
		id: ReplAceInFilesAction.ID,
		title: nls.locAlize({ key: 'miReplAceInFiles', comment: ['&& denotes A mnemonic'] }, "ReplAce &&in Files")
	},
	order: 2
});

if (plAtform.isMAcintosh) {
	// Register this with A more restrictive `when` on mAc to Avoid conflict with "copy pAth"
	KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
		id: ConstAnts.ToggleCAseSensitiveCommAndId,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ContextKeyExpr.And(ConstAnts.SeArchViewFocusedKey, ConstAnts.FileMAtchOrFolderMAtchFocusKey.toNegAted()),
		hAndler: toggleCAseSensitiveCommAnd
	}, ToggleCAseSensitiveKeybinding));
} else {
	KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
		id: ConstAnts.ToggleCAseSensitiveCommAndId,
		weight: KeybindingWeight.WorkbenchContrib,
		when: ConstAnts.SeArchViewFocusedKey,
		hAndler: toggleCAseSensitiveCommAnd
	}, ToggleCAseSensitiveKeybinding));
}

KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ConstAnts.ToggleWholeWordCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.SeArchViewFocusedKey,
	hAndler: toggleWholeWordCommAnd
}, ToggleWholeWordKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ConstAnts.ToggleRegexCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.SeArchViewFocusedKey,
	hAndler: toggleRegexCommAnd
}, ToggleRegexKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ConstAnts.TogglePreserveCAseId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ConstAnts.SeArchViewFocusedKey,
	hAndler: togglePreserveCAseCommAnd
}, TogglePreserveCAseKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ConstAnts.AddCursorsAtSeArchResults,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(ConstAnts.SeArchViewVisibleKey, ConstAnts.FileMAtchOrMAtchFocusKey),
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
	hAndler: (Accessor, Args: Any) => {
		const seArchView = getSeArchView(Accessor.get(IViewsService));
		if (seArchView) {
			const tree: WorkbenchObjectTree<RenderAbleMAtch> = seArchView.getControl();
			seArchView.openEditorWithMultiCursor(<FileMAtchOrMAtch>tree.getFocus()[0]);
		}
	}
});

registry.registerWorkbenchAction(SyncActionDescriptor.from(CollApseDeepestExpAndedLevelAction), 'SeArch: CollApse All', cAtegory.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ExpAndAllAction), 'SeArch: ExpAnd All', cAtegory.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(ShowAllSymbolsAction, { primAry: KeyMod.CtrlCmd | KeyCode.KEY_T }), 'Go to Symbol in WorkspAce...');
registry.registerWorkbenchAction(SyncActionDescriptor.from(ToggleSeArchOnTypeAction), 'SeArch: Toggle SeArch on Type', cAtegory.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(RefreshAction), 'SeArch: Refresh', cAtegory.vAlue);
registry.registerWorkbenchAction(SyncActionDescriptor.from(CleArSeArchResultsAction), 'SeArch: CleAr SeArch Results', cAtegory.vAlue);

// Register Quick Access HAndler
const quickAccessRegistry = Registry.As<IQuickAccessRegistry>(QuickAccessExtensions.QuickAccess);

quickAccessRegistry.registerQuickAccessProvider({
	ctor: AnythingQuickAccessProvider,
	prefix: AnythingQuickAccessProvider.PREFIX,
	plAceholder: nls.locAlize('AnythingQuickAccessPlAceholder', "SeArch files by nAme (Append {0} to go to line or {1} to go to symbol)", AbstrActGotoLineQuickAccessProvider.PREFIX, GotoSymbolQuickAccessProvider.PREFIX),
	contextKey: defAultQuickAccessContextKeyVAlue,
	helpEntries: [{ description: nls.locAlize('AnythingQuickAccess', "Go to File"), needsEditor: fAlse }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: SymbolsQuickAccessProvider,
	prefix: SymbolsQuickAccessProvider.PREFIX,
	plAceholder: nls.locAlize('symbolsQuickAccessPlAceholder', "Type the nAme of A symbol to open."),
	contextKey: 'inWorkspAceSymbolsPicker',
	helpEntries: [{ description: nls.locAlize('symbolsQuickAccess', "Go to Symbol in WorkspAce"), needsEditor: fAlse }]
});

// ConfigurAtion
const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion({
	id: 'seArch',
	order: 13,
	title: nls.locAlize('seArchConfigurAtionTitle', "SeArch"),
	type: 'object',
	properties: {
		[SEARCH_EXCLUDE_CONFIG]: {
			type: 'object',
			mArkdownDescription: nls.locAlize('exclude', "Configure glob pAtterns for excluding files And folders in fulltext seArches And quick open. Inherits All glob pAtterns from the `#files.exclude#` setting. ReAd more About glob pAtterns [here](https://code.visuAlstudio.com/docs/editor/codebAsics#_AdvAnced-seArch-options)."),
			defAult: { '**/node_modules': true, '**/bower_components': true, '**/*.code-seArch': true },
			AdditionAlProperties: {
				AnyOf: [
					{
						type: 'booleAn',
						description: nls.locAlize('exclude.booleAn', "The glob pAttern to mAtch file pAths AgAinst. Set to true or fAlse to enAble or disAble the pAttern."),
					},
					{
						type: 'object',
						properties: {
							when: {
								type: 'string', // expression ({ "**/*.js": { "when": "$(bAsenAme).js" } })
								pAttern: '\\w*\\$\\(bAsenAme\\)\\w*',
								defAult: '$(bAsenAme).ext',
								description: nls.locAlize('exclude.when', 'AdditionAl check on the siblings of A mAtching file. Use $(bAsenAme) As vAriAble for the mAtching file nAme.')
							}
						}
					}
				]
			},
			scope: ConfigurAtionScope.RESOURCE
		},
		'seArch.useRipgrep': {
			type: 'booleAn',
			description: nls.locAlize('useRipgrep', "This setting is deprecAted And now fAlls bAck on \"seArch.usePCRE2\"."),
			deprecAtionMessAge: nls.locAlize('useRipgrepDeprecAted', "DeprecAted. Consider \"seArch.usePCRE2\" for AdvAnced regex feAture support."),
			defAult: true
		},
		'seArch.mAintAinFileSeArchCAche': {
			type: 'booleAn',
			description: nls.locAlize('seArch.mAintAinFileSeArchCAche', "When enAbled, the seArchService process will be kept Alive insteAd of being shut down After An hour of inActivity. This will keep the file seArch cAche in memory."),
			defAult: fAlse
		},
		'seArch.useIgnoreFiles': {
			type: 'booleAn',
			mArkdownDescription: nls.locAlize('useIgnoreFiles', "Controls whether to use `.gitignore` And `.ignore` files when seArching for files."),
			defAult: true,
			scope: ConfigurAtionScope.RESOURCE
		},
		'seArch.useGlobAlIgnoreFiles': {
			type: 'booleAn',
			mArkdownDescription: nls.locAlize('useGlobAlIgnoreFiles', "Controls whether to use globAl `.gitignore` And `.ignore` files when seArching for files."),
			defAult: fAlse,
			scope: ConfigurAtionScope.RESOURCE
		},
		'seArch.quickOpen.includeSymbols': {
			type: 'booleAn',
			description: nls.locAlize('seArch.quickOpen.includeSymbols', "Whether to include results from A globAl symbol seArch in the file results for Quick Open."),
			defAult: fAlse
		},
		'seArch.quickOpen.includeHistory': {
			type: 'booleAn',
			description: nls.locAlize('seArch.quickOpen.includeHistory', "Whether to include results from recently opened files in the file results for Quick Open."),
			defAult: true
		},
		'seArch.quickOpen.history.filterSortOrder': {
			'type': 'string',
			'enum': ['defAult', 'recency'],
			'defAult': 'defAult',
			'enumDescriptions': [
				nls.locAlize('filterSortOrder.defAult', 'History entries Are sorted by relevAnce bAsed on the filter vAlue used. More relevAnt entries AppeAr first.'),
				nls.locAlize('filterSortOrder.recency', 'History entries Are sorted by recency. More recently opened entries AppeAr first.')
			],
			'description': nls.locAlize('filterSortOrder', "Controls sorting order of editor history in quick open when filtering.")
		},
		'seArch.followSymlinks': {
			type: 'booleAn',
			description: nls.locAlize('seArch.followSymlinks', "Controls whether to follow symlinks while seArching."),
			defAult: true
		},
		'seArch.smArtCAse': {
			type: 'booleAn',
			description: nls.locAlize('seArch.smArtCAse', "SeArch cAse-insensitively if the pAttern is All lowercAse, otherwise, seArch cAse-sensitively."),
			defAult: fAlse
		},
		'seArch.globAlFindClipboArd': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('seArch.globAlFindClipboArd', "Controls whether the seArch view should reAd or modify the shAred find clipboArd on mAcOS."),
			included: plAtform.isMAcintosh
		},
		'seArch.locAtion': {
			type: 'string',
			enum: ['sidebAr', 'pAnel'],
			defAult: 'sidebAr',
			description: nls.locAlize('seArch.locAtion', "Controls whether the seArch will be shown As A view in the sidebAr or As A pAnel in the pAnel AreA for more horizontAl spAce."),
			deprecAtionMessAge: nls.locAlize('seArch.locAtion.deprecAtionMessAge', "This setting is deprecAted. PleAse use drAg And drop insteAd by drAgging the seArch icon.")
		},
		'seArch.collApseResults': {
			type: 'string',
			enum: ['Auto', 'AlwAysCollApse', 'AlwAysExpAnd'],
			enumDescriptions: [
				nls.locAlize('seArch.collApseResults.Auto', "Files with less thAn 10 results Are expAnded. Others Are collApsed."),
				'',
				''
			],
			defAult: 'AlwAysExpAnd',
			description: nls.locAlize('seArch.collApseAllResults', "Controls whether the seArch results will be collApsed or expAnded."),
		},
		'seArch.useReplAcePreview': {
			type: 'booleAn',
			defAult: true,
			description: nls.locAlize('seArch.useReplAcePreview', "Controls whether to open ReplAce Preview when selecting or replAcing A mAtch."),
		},
		'seArch.showLineNumbers': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('seArch.showLineNumbers', "Controls whether to show line numbers for seArch results."),
		},
		'seArch.usePCRE2': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('seArch.usePCRE2', "Whether to use the PCRE2 regex engine in text seArch. This enAbles using some AdvAnced regex feAtures like lookAheAd And bAckreferences. However, not All PCRE2 feAtures Are supported - only feAtures thAt Are Also supported by JAvAScript."),
			deprecAtionMessAge: nls.locAlize('usePCRE2DeprecAted', "DeprecAted. PCRE2 will be used AutomAticAlly when using regex feAtures thAt Are only supported by PCRE2."),
		},
		'seArch.ActionsPosition': {
			type: 'string',
			enum: ['Auto', 'right'],
			enumDescriptions: [
				nls.locAlize('seArch.ActionsPositionAuto', "Position the ActionbAr to the right when the seArch view is nArrow, And immediAtely After the content when the seArch view is wide."),
				nls.locAlize('seArch.ActionsPositionRight', "AlwAys position the ActionbAr to the right."),
			],
			defAult: 'Auto',
			description: nls.locAlize('seArch.ActionsPosition', "Controls the positioning of the ActionbAr on rows in the seArch view.")
		},
		'seArch.seArchOnType': {
			type: 'booleAn',
			defAult: true,
			description: nls.locAlize('seArch.seArchOnType', "SeArch All files As you type.")
		},
		'seArch.seedWithNeArestWord': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('seArch.seedWithNeArestWord', "EnAble seeding seArch from the word neArest the cursor when the Active editor hAs no selection.")
		},
		'seArch.seedOnFocus': {
			type: 'booleAn',
			defAult: fAlse,
			description: nls.locAlize('seArch.seedOnFocus', "UpdAte workspAce seArch query to the editor's selected text when focusing the seArch view. This hAppens either on click or when triggering the `workbench.views.seArch.focus` commAnd.")
		},
		'seArch.seArchOnTypeDebouncePeriod': {
			type: 'number',
			defAult: 300,
			mArkdownDescription: nls.locAlize('seArch.seArchOnTypeDebouncePeriod', "When `#seArch.seArchOnType#` is enAbled, controls the timeout in milliseconds between A chArActer being typed And the seArch stArting. HAs no effect when `seArch.seArchOnType` is disAbled.")
		},
		'seArch.seArchEditor.doubleClickBehAviour': {
			type: 'string',
			enum: ['selectWord', 'goToLocAtion', 'openLocAtionToSide'],
			defAult: 'goToLocAtion',
			enumDescriptions: [
				nls.locAlize('seArch.seArchEditor.doubleClickBehAviour.selectWord', "Double clicking selects the word under the cursor."),
				nls.locAlize('seArch.seArchEditor.doubleClickBehAviour.goToLocAtion', "Double clicking opens the result in the Active editor group."),
				nls.locAlize('seArch.seArchEditor.doubleClickBehAviour.openLocAtionToSide', "Double clicking opens the result in the editor group to the side, creAting one if it does not yet exist."),
			],
			mArkdownDescription: nls.locAlize('seArch.seArchEditor.doubleClickBehAviour', "Configure effect of double clicking A result in A seArch editor.")
		},
		'seArch.seArchEditor.reusePriorSeArchConfigurAtion': {
			type: 'booleAn',
			defAult: fAlse,
			mArkdownDescription: nls.locAlize({ key: 'seArch.seArchEditor.reusePriorSeArchConfigurAtion', comment: ['"SeArch Editor" is A type thAt editor thAt cAn displAy seArch results. "includes, excludes, And flAgs" just refers to settings thAt Affect seArch. For exAmple, the "seArch.exclude" setting.'] }, "When enAbled, new SeArch Editors will reuse the includes, excludes, And flAgs of the previously opened SeArch Editor")
		},
		'seArch.seArchEditor.defAultNumberOfContextLines': {
			type: ['number', 'null'],
			defAult: 1,
			mArkdownDescription: nls.locAlize('seArch.seArchEditor.defAultNumberOfContextLines', "The defAult number of surrounding context lines to use when creAting new SeArch Editors. If using `#seArch.seArchEditor.reusePriorSeArchConfigurAtion#`, this cAn be set to `null` (empty) to use the prior SeArch Editor's configurAtion.")
		},
		'seArch.sortOrder': {
			'type': 'string',
			'enum': [SeArchSortOrder.DefAult, SeArchSortOrder.FileNAmes, SeArchSortOrder.Type, SeArchSortOrder.Modified, SeArchSortOrder.CountDescending, SeArchSortOrder.CountAscending],
			'defAult': SeArchSortOrder.DefAult,
			'enumDescriptions': [
				nls.locAlize('seArchSortOrder.defAult', "Results Are sorted by folder And file nAmes, in AlphAbeticAl order."),
				nls.locAlize('seArchSortOrder.filesOnly', "Results Are sorted by file nAmes ignoring folder order, in AlphAbeticAl order."),
				nls.locAlize('seArchSortOrder.type', "Results Are sorted by file extensions, in AlphAbeticAl order."),
				nls.locAlize('seArchSortOrder.modified', "Results Are sorted by file lAst modified dAte, in descending order."),
				nls.locAlize('seArchSortOrder.countDescending', "Results Are sorted by count per file, in descending order."),
				nls.locAlize('seArchSortOrder.countAscending', "Results Are sorted by count per file, in Ascending order.")
			],
			'description': nls.locAlize('seArch.sortOrder', "Controls sorting order of seArch results.")
		},
	}
});

CommAndsRegistry.registerCommAnd('_executeWorkspAceSymbolProvider', function (Accessor, ...Args) {
	const [query] = Args;
	AssertType(typeof query === 'string');
	return getWorkspAceSymbols(query);
});

// View menu

MenuRegistry.AppendMenuItem(MenuId.MenubArViewMenu, {
	group: '3_views',
	commAnd: {
		id: VIEWLET_ID,
		title: nls.locAlize({ key: 'miViewSeArch', comment: ['&& denotes A mnemonic'] }, "&&SeArch")
	},
	order: 2
});

// Go to menu

MenuRegistry.AppendMenuItem(MenuId.MenubArGoMenu, {
	group: '3_globAl_nAv',
	commAnd: {
		id: 'workbench.Action.showAllSymbols',
		title: nls.locAlize({ key: 'miGotoSymbolInWorkspAce', comment: ['&& denotes A mnemonic'] }, "Go to Symbol in &&WorkspAce...")
	},
	order: 2
});
