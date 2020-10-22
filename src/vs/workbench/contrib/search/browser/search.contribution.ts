/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Action } from 'vs/Base/common/actions';
import { distinct } from 'vs/Base/common/arrays';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import * as platform from 'vs/Base/common/platform';
import { dirname } from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ToggleCaseSensitiveKeyBinding, TogglePreserveCaseKeyBinding, ToggleRegexKeyBinding, ToggleWholeWordKeyBinding } from 'vs/editor/contriB/find/findModel';
import * as nls from 'vs/nls';
import { ICommandAction, MenuId, MenuRegistry, SyncActionDescriptor } from 'vs/platform/actions/common/actions';
import { CommandsRegistry, ICommandHandler } from 'vs/platform/commands/common/commands';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { ConfigurationScope, Extensions as ConfigurationExtensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IFileService } from 'vs/platform/files/common/files';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IListService, WorkBenchListFocusContextKey, WorkBenchOBjectTree } from 'vs/platform/list/Browser/listService';
import { Registry } from 'vs/platform/registry/common/platform';
import { defaultQuickAccessContextKeyValue } from 'vs/workBench/Browser/quickaccess';
import { CATEGORIES, Extensions as ActionExtensions, IWorkBenchActionRegistry } from 'vs/workBench/common/actions';
import { Extensions as WorkBenchExtensions, IWorkBenchContriBution, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { Extensions as ViewExtensions, IViewsRegistry, IViewContainersRegistry, ViewContainerLocation, IViewDescriptorService, IViewsService } from 'vs/workBench/common/views';
import { getMultiSelectedResources } from 'vs/workBench/contriB/files/Browser/files';
import { ExplorerFolderContext, ExplorerRootContext, FilesExplorerFocusCondition, IExplorerService, VIEWLET_ID as VIEWLET_ID_FILES } from 'vs/workBench/contriB/files/common/files';
import { registerContriButions as replaceContriButions } from 'vs/workBench/contriB/search/Browser/replaceContriButions';
import { clearHistoryCommand, ClearSearchResultsAction, CloseReplaceAction, CollapseDeepestExpandedLevelAction, copyAllCommand, copyMatchCommand, copyPathCommand, FocusNextInputAction, FocusNextSearchResultAction, FocusPreviousInputAction, FocusPreviousSearchResultAction, focusSearchListCommand, getSearchView, openSearchView, OpenSearchViewletAction, RefreshAction, RemoveAction, ReplaceAction, ReplaceAllAction, ReplaceAllInFolderAction, ReplaceInFilesAction, toggleCaseSensitiveCommand, togglePreserveCaseCommand, toggleRegexCommand, toggleWholeWordCommand, FindInFilesCommand, ToggleSearchOnTypeAction, ExpandAllAction } from 'vs/workBench/contriB/search/Browser/searchActions';
import { SearchView } from 'vs/workBench/contriB/search/Browser/searchView';
import { registerContriButions as searchWidgetContriButions } from 'vs/workBench/contriB/search/Browser/searchWidget';
import * as Constants from 'vs/workBench/contriB/search/common/constants';
import * as SearchEditorConstants from 'vs/workBench/contriB/searchEditor/Browser/constants';
import { getWorkspaceSymBols } from 'vs/workBench/contriB/search/common/search';
import { ISearchHistoryService, SearchHistoryService } from 'vs/workBench/contriB/search/common/searchHistoryService';
import { FileMatchOrMatch, ISearchWorkBenchService, RenderaBleMatch, SearchWorkBenchService, FileMatch, Match, FolderMatch } from 'vs/workBench/contriB/search/common/searchModel';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { VIEWLET_ID, VIEW_ID, SEARCH_EXCLUDE_CONFIG, SearchSortOrder } from 'vs/workBench/services/search/common/search';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ExplorerViewPaneContainer } from 'vs/workBench/contriB/files/Browser/explorerViewlet';
import { assertType, assertIsDefined } from 'vs/Base/common/types';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { SearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditor';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IQuickAccessRegistry, Extensions as QuickAccessExtensions } from 'vs/platform/quickinput/common/quickAccess';
import { SymBolsQuickAccessProvider } from 'vs/workBench/contriB/search/Browser/symBolsQuickAccess';
import { AnythingQuickAccessProvider } from 'vs/workBench/contriB/search/Browser/anythingQuickAccess';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { ABstractGotoLineQuickAccessProvider } from 'vs/editor/contriB/quickAccess/gotoLineQuickAccess';
import { GotoSymBolQuickAccessProvider } from 'vs/workBench/contriB/codeEditor/Browser/quickaccess/gotoSymBolQuickAccess';
import { searchViewIcon } from 'vs/workBench/contriB/search/Browser/searchIcons';

registerSingleton(ISearchWorkBenchService, SearchWorkBenchService, true);
registerSingleton(ISearchHistoryService, SearchHistoryService, true);

replaceContriButions();
searchWidgetContriButions();

const category = { value: nls.localize('search', "Search"), original: 'Search' };

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: 'workBench.action.search.toggleQueryDetails',
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.or(Constants.SearchViewFocusedKey, SearchEditorConstants.InSearchEditor),
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_J,
	handler: accessor => {
		const contextService = accessor.get(IContextKeyService).getContext(document.activeElement);
		if (contextService.getValue(SearchEditorConstants.InSearchEditor.serialize())) {
			(accessor.get(IEditorService).activeEditorPane as SearchEditor).toggleQueryDetails();
		} else if (contextService.getValue(Constants.SearchViewFocusedKey.serialize())) {
			const searchView = getSearchView(accessor.get(IViewsService));
			assertIsDefined(searchView).toggleQueryDetails();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.FocusSearchFromResults,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.FirstMatchFocusKey),
	primary: KeyMod.CtrlCmd | KeyCode.UpArrow,
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			searchView.focusPreviousInputBox();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.OpenMatch,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.FileMatchOrMatchFocusKey),
	primary: KeyCode.Enter,
	mac: {
		primary: KeyCode.Enter,
		secondary: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	handler: (accessor) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			searchView.open(<FileMatchOrMatch>tree.getFocus()[0], false, false, true);
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.OpenMatchToSide,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.FileMatchOrMatchFocusKey),
	primary: KeyMod.CtrlCmd | KeyCode.Enter,
	mac: {
		primary: KeyMod.WinCtrl | KeyCode.Enter
	},
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			searchView.open(<FileMatchOrMatch>tree.getFocus()[0], false, true, true);
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.CancelActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, WorkBenchListFocusContextKey),
	primary: KeyCode.Escape,
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			searchView.cancelSearch();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.RemoveActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.FileMatchOrMatchFocusKey),
	primary: KeyCode.Delete,
	mac: {
		primary: KeyMod.CtrlCmd | KeyCode.Backspace,
	},
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			accessor.get(IInstantiationService).createInstance(RemoveAction, tree, tree.getFocus()[0]!).run();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.ReplaceActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.ReplaceActiveKey, Constants.MatchFocusKey),
	primary: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			accessor.get(IInstantiationService).createInstance(ReplaceAction, tree, tree.getFocus()[0] as Match, searchView).run();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.ReplaceAllInFileActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.ReplaceActiveKey, Constants.FileFocusKey),
	primary: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter],
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			accessor.get(IInstantiationService).createInstance(ReplaceAllAction, searchView, tree.getFocus()[0] as FileMatch).run();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.ReplaceAllInFolderActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.ReplaceActiveKey, Constants.FolderFocusKey),
	primary: KeyMod.Shift | KeyMod.CtrlCmd | KeyCode.KEY_1,
	secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.Enter],
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			accessor.get(IInstantiationService).createInstance(ReplaceAllInFolderAction, tree, tree.getFocus()[0] as FolderMatch).run();
		}
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.CloseReplaceWidgetActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.ReplaceInputBoxFocusedKey),
	primary: KeyCode.Escape,
	handler: (accessor, args: any) => {
		accessor.get(IInstantiationService).createInstance(CloseReplaceAction, Constants.CloseReplaceWidgetActionId, '').run();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: FocusNextInputAction.ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.or(
		ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, Constants.InputBoxFocusedKey),
		ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.InputBoxFocusedKey)),
	primary: KeyMod.CtrlCmd | KeyCode.DownArrow,
	handler: (accessor, args: any) => {
		accessor.get(IInstantiationService).createInstance(FocusNextInputAction, FocusNextInputAction.ID, '').run();
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: FocusPreviousInputAction.ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.or(
		ContextKeyExpr.and(SearchEditorConstants.InSearchEditor, Constants.InputBoxFocusedKey),
		ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.InputBoxFocusedKey, Constants.SearchInputBoxFocusedKey.toNegated())),
	primary: KeyMod.CtrlCmd | KeyCode.UpArrow,
	handler: (accessor, args: any) => {
		accessor.get(IInstantiationService).createInstance(FocusPreviousInputAction, FocusPreviousInputAction.ID, '').run();
	}
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.ReplaceActionId,
		title: ReplaceAction.LABEL
	},
	when: ContextKeyExpr.and(Constants.ReplaceActiveKey, Constants.MatchFocusKey),
	group: 'search',
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.ReplaceAllInFolderActionId,
		title: ReplaceAllInFolderAction.LABEL
	},
	when: ContextKeyExpr.and(Constants.ReplaceActiveKey, Constants.FolderFocusKey),
	group: 'search',
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.ReplaceAllInFileActionId,
		title: ReplaceAllAction.LABEL
	},
	when: ContextKeyExpr.and(Constants.ReplaceActiveKey, Constants.FileFocusKey),
	group: 'search',
	order: 1
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.RemoveActionId,
		title: RemoveAction.LABEL
	},
	when: Constants.FileMatchOrMatchFocusKey,
	group: 'search',
	order: 2
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.CopyMatchCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.FileMatchOrMatchFocusKey,
	primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
	handler: copyMatchCommand
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.CopyMatchCommandId,
		title: nls.localize('copyMatchLaBel', "Copy")
	},
	when: Constants.FileMatchOrMatchFocusKey,
	group: 'search_2',
	order: 1
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.CopyPathCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.FileMatchOrFolderMatchWithResourceFocusKey,
	primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_C,
	win: {
		primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_C
	},
	handler: copyPathCommand
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.CopyPathCommandId,
		title: nls.localize('copyPathLaBel', "Copy Path")
	},
	when: Constants.FileMatchOrFolderMatchWithResourceFocusKey,
	group: 'search_2',
	order: 2
});

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: {
		id: Constants.CopyAllCommandId,
		title: nls.localize('copyAllLaBel', "Copy All")
	},
	when: Constants.HasSearchResults,
	group: 'search_2',
	order: 3
});

CommandsRegistry.registerCommand({
	id: Constants.CopyAllCommandId,
	handler: copyAllCommand
});

CommandsRegistry.registerCommand({
	id: Constants.ClearSearchHistoryCommandId,
	handler: clearHistoryCommand
});

CommandsRegistry.registerCommand({
	id: Constants.RevealInSideBarForSearchResults,
	handler: (accessor, args: any) => {
		const viewletService = accessor.get(IViewletService);
		const explorerService = accessor.get(IExplorerService);
		const contextService = accessor.get(IWorkspaceContextService);

		const searchView = getSearchView(accessor.get(IViewsService));
		if (!searchView) {
			return;
		}

		let fileMatch: FileMatch;
		if (!(args instanceof FileMatch)) {
			args = searchView.getControl().getFocus()[0];
		}
		if (args instanceof FileMatch) {
			fileMatch = args;
		} else {
			return;
		}

		viewletService.openViewlet(VIEWLET_ID_FILES, false).then((viewlet) => {
			if (!viewlet) {
				return;
			}

			const explorerViewContainer = viewlet.getViewPaneContainer() as ExplorerViewPaneContainer;
			const uri = fileMatch.resource;
			if (uri && contextService.isInsideWorkspace(uri)) {
				const explorerView = explorerViewContainer.getExplorerView();
				explorerView.setExpanded(true);
				explorerService.select(uri, true).then(() => explorerView.focus(), onUnexpectedError);
			}
		});
	}
});

const RevealInSideBarForSearchResultsCommand: ICommandAction = {
	id: Constants.RevealInSideBarForSearchResults,
	title: nls.localize('revealInSideBar', "Reveal in Side Bar")
};

MenuRegistry.appendMenuItem(MenuId.SearchContext, {
	command: RevealInSideBarForSearchResultsCommand,
	when: ContextKeyExpr.and(Constants.FileFocusKey, Constants.HasSearchResults),
	group: 'search_3',
	order: 1
});

const ClearSearchHistoryCommand: ICommandAction = {
	id: Constants.ClearSearchHistoryCommandId,
	title: { value: nls.localize('clearSearchHistoryLaBel', "Clear Search History"), original: 'Clear Search History' },
	category
};
MenuRegistry.addCommand(ClearSearchHistoryCommand);

CommandsRegistry.registerCommand({
	id: Constants.FocusSearchListCommandID,
	handler: focusSearchListCommand
});

const FocusSearchListCommand: ICommandAction = {
	id: Constants.FocusSearchListCommandID,
	title: { value: nls.localize('focusSearchListCommandLaBel', "Focus List"), original: 'Focus List' },
	category
};
MenuRegistry.addCommand(FocusSearchListCommand);

const searchInFolderCommand: ICommandHandler = (accessor, resource?: URI) => {
	const listService = accessor.get(IListService);
	const fileService = accessor.get(IFileService);
	const viewsService = accessor.get(IViewsService);
	const resources = getMultiSelectedResources(resource, listService, accessor.get(IEditorService), accessor.get(IExplorerService));

	return openSearchView(viewsService, true).then(searchView => {
		if (resources && resources.length && searchView) {
			return fileService.resolveAll(resources.map(resource => ({ resource }))).then(results => {
				const folders: URI[] = [];

				results.forEach(result => {
					if (result.success && result.stat) {
						folders.push(result.stat.isDirectory ? result.stat.resource : dirname(result.stat.resource));
					}
				});

				searchView.searchInFolders(distinct(folders, folder => folder.toString()));
			});
		}

		return undefined;
	});
};

const FIND_IN_FOLDER_ID = 'filesExplorer.findInFolder';
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: FIND_IN_FOLDER_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(FilesExplorerFocusCondition, ExplorerFolderContext),
	primary: KeyMod.Shift | KeyMod.Alt | KeyCode.KEY_F,
	handler: searchInFolderCommand
});

CommandsRegistry.registerCommand({
	id: ClearSearchResultsAction.ID,
	handler: (accessor, args: any) => {
		accessor.get(IInstantiationService).createInstance(ClearSearchResultsAction, ClearSearchResultsAction.ID, '').run();
	}
});

CommandsRegistry.registerCommand({
	id: RefreshAction.ID,
	handler: (accessor, args: any) => {
		accessor.get(IInstantiationService).createInstance(RefreshAction, RefreshAction.ID, '').run();
	}
});

const FIND_IN_WORKSPACE_ID = 'filesExplorer.findInWorkspace';
CommandsRegistry.registerCommand({
	id: FIND_IN_WORKSPACE_ID,
	handler: (accessor) => {
		return openSearchView(accessor.get(IViewsService), true).then(searchView => {
			if (searchView) {
				searchView.searchInFolders();
			}
		});
	}
});

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '4_search',
	order: 10,
	command: {
		id: FIND_IN_FOLDER_ID,
		title: nls.localize('findInFolder', "Find in Folder...")
	},
	when: ContextKeyExpr.and(ExplorerFolderContext)
});

MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
	group: '4_search',
	order: 10,
	command: {
		id: FIND_IN_WORKSPACE_ID,
		title: nls.localize('findInWorkspace', "Find in Workspace...")
	},
	when: ContextKeyExpr.and(ExplorerRootContext, ExplorerFolderContext.toNegated())
});


class ShowAllSymBolsAction extends Action {

	static readonly ID = 'workBench.action.showAllSymBols';
	static readonly LABEL = nls.localize('showTriggerActions', "Go to SymBol in Workspace...");
	static readonly ALL_SYMBOLS_PREFIX = '#';

	constructor(
		actionId: string,
		actionLaBel: string,
		@IQuickInputService private readonly quickInputService: IQuickInputService
	) {
		super(actionId, actionLaBel);
	}

	async run(): Promise<void> {
		this.quickInputService.quickAccess.show(ShowAllSymBolsAction.ALL_SYMBOLS_PREFIX);
	}
}

const viewContainer = Registry.as<IViewContainersRegistry>(ViewExtensions.ViewContainersRegistry).registerViewContainer({
	id: VIEWLET_ID,
	name: nls.localize('name', "Search"),
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]),
	hideIfEmpty: true,
	icon: searchViewIcon.classNames,
	order: 1
}, ViewContainerLocation.SideBar);

const viewDescriptor = { id: VIEW_ID, containerIcon: 'codicon-search', name: nls.localize('search', "Search"), ctorDescriptor: new SyncDescriptor(SearchView), canToggleVisiBility: false, canMoveView: true };

// Register search default location to sideBar
Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry).registerViews([viewDescriptor], viewContainer);


// Migrate search location setting to new model
class RegisterSearchViewContriBution implements IWorkBenchContriBution {
	constructor(
		@IConfigurationService configurationService: IConfigurationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		const data = configurationService.inspect('search.location');

		if (data.value === 'panel') {
			viewDescriptorService.moveViewToLocation(viewDescriptor, ViewContainerLocation.Panel);
		}

		if (data.userValue) {
			configurationService.updateValue('search.location', undefined, ConfigurationTarget.USER);
		}

		if (data.userLocalValue) {
			configurationService.updateValue('search.location', undefined, ConfigurationTarget.USER_LOCAL);
		}

		if (data.userRemoteValue) {
			configurationService.updateValue('search.location', undefined, ConfigurationTarget.USER_REMOTE);
		}

		if (data.workspaceFolderValue) {
			configurationService.updateValue('search.location', undefined, ConfigurationTarget.WORKSPACE_FOLDER);
		}

		if (data.workspaceValue) {
			configurationService.updateValue('search.location', undefined, ConfigurationTarget.WORKSPACE);
		}
	}
}
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(RegisterSearchViewContriBution, LifecyclePhase.Starting);

// Actions
const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);

// Show Search and Find in Files are redundant, But we can't Break keyBindings By removing one. So it's the same action, same keyBinding, registered to different IDs.
// Show Search 'when' is redundant But if the two conflict with exactly the same keyBinding and 'when' clause, then they can show up as "unBound" - #51780
registry.registerWorkBenchAction(SyncActionDescriptor.from(OpenSearchViewletAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_F }, Constants.SearchViewVisiBleKey.toNegated()), 'View: Show Search', CATEGORIES.View.value);
KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	description: {
		description: nls.localize('findInFiles.description', "Open the search viewlet"),
		args: [
			{
				name: nls.localize('findInFiles.args', "A set of options for the search viewlet"),
				schema: {
					type: 'oBject',
					properties: {
						query: { 'type': 'string' },
						replace: { 'type': 'string' },
						triggerSearch: { 'type': 'Boolean' },
						filesToInclude: { 'type': 'string' },
						filesToExclude: { 'type': 'string' },
						isRegex: { 'type': 'Boolean' },
						isCaseSensitive: { 'type': 'Boolean' },
						matchWholeWord: { 'type': 'Boolean' },
					}
				}
			},
		]
	},
	id: Constants.FindInFilesActionId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: null,
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_F,
	handler: FindInFilesCommand
});
MenuRegistry.appendMenuItem(MenuId.CommandPalette, { command: { id: Constants.FindInFilesActionId, title: { value: nls.localize('findInFiles', "Find in Files"), original: 'Find in Files' }, category } });
MenuRegistry.appendMenuItem(MenuId.MenuBarEditMenu, {
	group: '4_find_gloBal',
	command: {
		id: Constants.FindInFilesActionId,
		title: nls.localize({ key: 'miFindInFiles', comment: ['&& denotes a mnemonic'] }, "Find &&in Files")
	},
	order: 1
});

registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusNextSearchResultAction, { primary: KeyCode.F4 }), 'Search: Focus Next Search Result', category.value, ContextKeyExpr.or(Constants.HasSearchResults, SearchEditorConstants.InSearchEditor));
registry.registerWorkBenchAction(SyncActionDescriptor.from(FocusPreviousSearchResultAction, { primary: KeyMod.Shift | KeyCode.F4 }), 'Search: Focus Previous Search Result', category.value, ContextKeyExpr.or(Constants.HasSearchResults, SearchEditorConstants.InSearchEditor));

registry.registerWorkBenchAction(SyncActionDescriptor.from(ReplaceInFilesAction, { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_H }), 'Search: Replace in Files', category.value);
MenuRegistry.appendMenuItem(MenuId.MenuBarEditMenu, {
	group: '4_find_gloBal',
	command: {
		id: ReplaceInFilesAction.ID,
		title: nls.localize({ key: 'miReplaceInFiles', comment: ['&& denotes a mnemonic'] }, "Replace &&in Files")
	},
	order: 2
});

if (platform.isMacintosh) {
	// Register this with a more restrictive `when` on mac to avoid conflict with "copy path"
	KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
		id: Constants.ToggleCaseSensitiveCommandId,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: ContextKeyExpr.and(Constants.SearchViewFocusedKey, Constants.FileMatchOrFolderMatchFocusKey.toNegated()),
		handler: toggleCaseSensitiveCommand
	}, ToggleCaseSensitiveKeyBinding));
} else {
	KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
		id: Constants.ToggleCaseSensitiveCommandId,
		weight: KeyBindingWeight.WorkBenchContriB,
		when: Constants.SearchViewFocusedKey,
		handler: toggleCaseSensitiveCommand
	}, ToggleCaseSensitiveKeyBinding));
}

KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: Constants.ToggleWholeWordCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.SearchViewFocusedKey,
	handler: toggleWholeWordCommand
}, ToggleWholeWordKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: Constants.ToggleRegexCommandId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.SearchViewFocusedKey,
	handler: toggleRegexCommand
}, ToggleRegexKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule(OBject.assign({
	id: Constants.TogglePreserveCaseId,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.SearchViewFocusedKey,
	handler: togglePreserveCaseCommand
}, TogglePreserveCaseKeyBinding));

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.AddCursorsAtSearchResults,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.SearchViewVisiBleKey, Constants.FileMatchOrMatchFocusKey),
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
	handler: (accessor, args: any) => {
		const searchView = getSearchView(accessor.get(IViewsService));
		if (searchView) {
			const tree: WorkBenchOBjectTree<RenderaBleMatch> = searchView.getControl();
			searchView.openEditorWithMultiCursor(<FileMatchOrMatch>tree.getFocus()[0]);
		}
	}
});

registry.registerWorkBenchAction(SyncActionDescriptor.from(CollapseDeepestExpandedLevelAction), 'Search: Collapse All', category.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ExpandAllAction), 'Search: Expand All', category.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowAllSymBolsAction, { primary: KeyMod.CtrlCmd | KeyCode.KEY_T }), 'Go to SymBol in Workspace...');
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleSearchOnTypeAction), 'Search: Toggle Search on Type', category.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(RefreshAction), 'Search: Refresh', category.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ClearSearchResultsAction), 'Search: Clear Search Results', category.value);

// Register Quick Access Handler
const quickAccessRegistry = Registry.as<IQuickAccessRegistry>(QuickAccessExtensions.Quickaccess);

quickAccessRegistry.registerQuickAccessProvider({
	ctor: AnythingQuickAccessProvider,
	prefix: AnythingQuickAccessProvider.PREFIX,
	placeholder: nls.localize('anythingQuickAccessPlaceholder', "Search files By name (append {0} to go to line or {1} to go to symBol)", ABstractGotoLineQuickAccessProvider.PREFIX, GotoSymBolQuickAccessProvider.PREFIX),
	contextKey: defaultQuickAccessContextKeyValue,
	helpEntries: [{ description: nls.localize('anythingQuickAccess', "Go to File"), needsEditor: false }]
});

quickAccessRegistry.registerQuickAccessProvider({
	ctor: SymBolsQuickAccessProvider,
	prefix: SymBolsQuickAccessProvider.PREFIX,
	placeholder: nls.localize('symBolsQuickAccessPlaceholder', "Type the name of a symBol to open."),
	contextKey: 'inWorkspaceSymBolsPicker',
	helpEntries: [{ description: nls.localize('symBolsQuickAccess', "Go to SymBol in Workspace"), needsEditor: false }]
});

// Configuration
const configurationRegistry = Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
	id: 'search',
	order: 13,
	title: nls.localize('searchConfigurationTitle', "Search"),
	type: 'oBject',
	properties: {
		[SEARCH_EXCLUDE_CONFIG]: {
			type: 'oBject',
			markdownDescription: nls.localize('exclude', "Configure gloB patterns for excluding files and folders in fulltext searches and quick open. Inherits all gloB patterns from the `#files.exclude#` setting. Read more aBout gloB patterns [here](https://code.visualstudio.com/docs/editor/codeBasics#_advanced-search-options)."),
			default: { '**/node_modules': true, '**/Bower_components': true, '**/*.code-search': true },
			additionalProperties: {
				anyOf: [
					{
						type: 'Boolean',
						description: nls.localize('exclude.Boolean', "The gloB pattern to match file paths against. Set to true or false to enaBle or disaBle the pattern."),
					},
					{
						type: 'oBject',
						properties: {
							when: {
								type: 'string', // expression ({ "**/*.js": { "when": "$(Basename).js" } })
								pattern: '\\w*\\$\\(Basename\\)\\w*',
								default: '$(Basename).ext',
								description: nls.localize('exclude.when', 'Additional check on the siBlings of a matching file. Use $(Basename) as variaBle for the matching file name.')
							}
						}
					}
				]
			},
			scope: ConfigurationScope.RESOURCE
		},
		'search.useRipgrep': {
			type: 'Boolean',
			description: nls.localize('useRipgrep', "This setting is deprecated and now falls Back on \"search.usePCRE2\"."),
			deprecationMessage: nls.localize('useRipgrepDeprecated', "Deprecated. Consider \"search.usePCRE2\" for advanced regex feature support."),
			default: true
		},
		'search.maintainFileSearchCache': {
			type: 'Boolean',
			description: nls.localize('search.maintainFileSearchCache', "When enaBled, the searchService process will Be kept alive instead of Being shut down after an hour of inactivity. This will keep the file search cache in memory."),
			default: false
		},
		'search.useIgnoreFiles': {
			type: 'Boolean',
			markdownDescription: nls.localize('useIgnoreFiles', "Controls whether to use `.gitignore` and `.ignore` files when searching for files."),
			default: true,
			scope: ConfigurationScope.RESOURCE
		},
		'search.useGloBalIgnoreFiles': {
			type: 'Boolean',
			markdownDescription: nls.localize('useGloBalIgnoreFiles', "Controls whether to use gloBal `.gitignore` and `.ignore` files when searching for files."),
			default: false,
			scope: ConfigurationScope.RESOURCE
		},
		'search.quickOpen.includeSymBols': {
			type: 'Boolean',
			description: nls.localize('search.quickOpen.includeSymBols', "Whether to include results from a gloBal symBol search in the file results for Quick Open."),
			default: false
		},
		'search.quickOpen.includeHistory': {
			type: 'Boolean',
			description: nls.localize('search.quickOpen.includeHistory', "Whether to include results from recently opened files in the file results for Quick Open."),
			default: true
		},
		'search.quickOpen.history.filterSortOrder': {
			'type': 'string',
			'enum': ['default', 'recency'],
			'default': 'default',
			'enumDescriptions': [
				nls.localize('filterSortOrder.default', 'History entries are sorted By relevance Based on the filter value used. More relevant entries appear first.'),
				nls.localize('filterSortOrder.recency', 'History entries are sorted By recency. More recently opened entries appear first.')
			],
			'description': nls.localize('filterSortOrder', "Controls sorting order of editor history in quick open when filtering.")
		},
		'search.followSymlinks': {
			type: 'Boolean',
			description: nls.localize('search.followSymlinks', "Controls whether to follow symlinks while searching."),
			default: true
		},
		'search.smartCase': {
			type: 'Boolean',
			description: nls.localize('search.smartCase', "Search case-insensitively if the pattern is all lowercase, otherwise, search case-sensitively."),
			default: false
		},
		'search.gloBalFindClipBoard': {
			type: 'Boolean',
			default: false,
			description: nls.localize('search.gloBalFindClipBoard', "Controls whether the search view should read or modify the shared find clipBoard on macOS."),
			included: platform.isMacintosh
		},
		'search.location': {
			type: 'string',
			enum: ['sideBar', 'panel'],
			default: 'sideBar',
			description: nls.localize('search.location', "Controls whether the search will Be shown as a view in the sideBar or as a panel in the panel area for more horizontal space."),
			deprecationMessage: nls.localize('search.location.deprecationMessage', "This setting is deprecated. Please use drag and drop instead By dragging the search icon.")
		},
		'search.collapseResults': {
			type: 'string',
			enum: ['auto', 'alwaysCollapse', 'alwaysExpand'],
			enumDescriptions: [
				nls.localize('search.collapseResults.auto', "Files with less than 10 results are expanded. Others are collapsed."),
				'',
				''
			],
			default: 'alwaysExpand',
			description: nls.localize('search.collapseAllResults', "Controls whether the search results will Be collapsed or expanded."),
		},
		'search.useReplacePreview': {
			type: 'Boolean',
			default: true,
			description: nls.localize('search.useReplacePreview', "Controls whether to open Replace Preview when selecting or replacing a match."),
		},
		'search.showLineNumBers': {
			type: 'Boolean',
			default: false,
			description: nls.localize('search.showLineNumBers', "Controls whether to show line numBers for search results."),
		},
		'search.usePCRE2': {
			type: 'Boolean',
			default: false,
			description: nls.localize('search.usePCRE2', "Whether to use the PCRE2 regex engine in text search. This enaBles using some advanced regex features like lookahead and Backreferences. However, not all PCRE2 features are supported - only features that are also supported By JavaScript."),
			deprecationMessage: nls.localize('usePCRE2Deprecated', "Deprecated. PCRE2 will Be used automatically when using regex features that are only supported By PCRE2."),
		},
		'search.actionsPosition': {
			type: 'string',
			enum: ['auto', 'right'],
			enumDescriptions: [
				nls.localize('search.actionsPositionAuto', "Position the actionBar to the right when the search view is narrow, and immediately after the content when the search view is wide."),
				nls.localize('search.actionsPositionRight', "Always position the actionBar to the right."),
			],
			default: 'auto',
			description: nls.localize('search.actionsPosition', "Controls the positioning of the actionBar on rows in the search view.")
		},
		'search.searchOnType': {
			type: 'Boolean',
			default: true,
			description: nls.localize('search.searchOnType', "Search all files as you type.")
		},
		'search.seedWithNearestWord': {
			type: 'Boolean',
			default: false,
			description: nls.localize('search.seedWithNearestWord', "EnaBle seeding search from the word nearest the cursor when the active editor has no selection.")
		},
		'search.seedOnFocus': {
			type: 'Boolean',
			default: false,
			description: nls.localize('search.seedOnFocus', "Update workspace search query to the editor's selected text when focusing the search view. This happens either on click or when triggering the `workBench.views.search.focus` command.")
		},
		'search.searchOnTypeDeBouncePeriod': {
			type: 'numBer',
			default: 300,
			markdownDescription: nls.localize('search.searchOnTypeDeBouncePeriod', "When `#search.searchOnType#` is enaBled, controls the timeout in milliseconds Between a character Being typed and the search starting. Has no effect when `search.searchOnType` is disaBled.")
		},
		'search.searchEditor.douBleClickBehaviour': {
			type: 'string',
			enum: ['selectWord', 'goToLocation', 'openLocationToSide'],
			default: 'goToLocation',
			enumDescriptions: [
				nls.localize('search.searchEditor.douBleClickBehaviour.selectWord', "DouBle clicking selects the word under the cursor."),
				nls.localize('search.searchEditor.douBleClickBehaviour.goToLocation', "DouBle clicking opens the result in the active editor group."),
				nls.localize('search.searchEditor.douBleClickBehaviour.openLocationToSide', "DouBle clicking opens the result in the editor group to the side, creating one if it does not yet exist."),
			],
			markdownDescription: nls.localize('search.searchEditor.douBleClickBehaviour', "Configure effect of douBle clicking a result in a search editor.")
		},
		'search.searchEditor.reusePriorSearchConfiguration': {
			type: 'Boolean',
			default: false,
			markdownDescription: nls.localize({ key: 'search.searchEditor.reusePriorSearchConfiguration', comment: ['"Search Editor" is a type that editor that can display search results. "includes, excludes, and flags" just refers to settings that affect search. For example, the "search.exclude" setting.'] }, "When enaBled, new Search Editors will reuse the includes, excludes, and flags of the previously opened Search Editor")
		},
		'search.searchEditor.defaultNumBerOfContextLines': {
			type: ['numBer', 'null'],
			default: 1,
			markdownDescription: nls.localize('search.searchEditor.defaultNumBerOfContextLines', "The default numBer of surrounding context lines to use when creating new Search Editors. If using `#search.searchEditor.reusePriorSearchConfiguration#`, this can Be set to `null` (empty) to use the prior Search Editor's configuration.")
		},
		'search.sortOrder': {
			'type': 'string',
			'enum': [SearchSortOrder.Default, SearchSortOrder.FileNames, SearchSortOrder.Type, SearchSortOrder.Modified, SearchSortOrder.CountDescending, SearchSortOrder.CountAscending],
			'default': SearchSortOrder.Default,
			'enumDescriptions': [
				nls.localize('searchSortOrder.default', "Results are sorted By folder and file names, in alphaBetical order."),
				nls.localize('searchSortOrder.filesOnly', "Results are sorted By file names ignoring folder order, in alphaBetical order."),
				nls.localize('searchSortOrder.type', "Results are sorted By file extensions, in alphaBetical order."),
				nls.localize('searchSortOrder.modified', "Results are sorted By file last modified date, in descending order."),
				nls.localize('searchSortOrder.countDescending', "Results are sorted By count per file, in descending order."),
				nls.localize('searchSortOrder.countAscending', "Results are sorted By count per file, in ascending order.")
			],
			'description': nls.localize('search.sortOrder', "Controls sorting order of search results.")
		},
	}
});

CommandsRegistry.registerCommand('_executeWorkspaceSymBolProvider', function (accessor, ...args) {
	const [query] = args;
	assertType(typeof query === 'string');
	return getWorkspaceSymBols(query);
});

// View menu

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '3_views',
	command: {
		id: VIEWLET_ID,
		title: nls.localize({ key: 'miViewSearch', comment: ['&& denotes a mnemonic'] }, "&&Search")
	},
	order: 2
});

// Go to menu

MenuRegistry.appendMenuItem(MenuId.MenuBarGoMenu, {
	group: '3_gloBal_nav',
	command: {
		id: 'workBench.action.showAllSymBols',
		title: nls.localize({ key: 'miGotoSymBolInWorkspace', comment: ['&& denotes a mnemonic'] }, "Go to SymBol in &&Workspace...")
	},
	order: 2
});
