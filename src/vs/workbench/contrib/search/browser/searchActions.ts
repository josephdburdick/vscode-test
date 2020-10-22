/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { Action } from 'vs/Base/common/actions';
import { createKeyBinding, ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { isWindows, OS } from 'vs/Base/common/platform';
import * as nls from 'vs/nls';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ICommandHandler } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { getSelectionKeyBoardEvent, WorkBenchOBjectTree } from 'vs/platform/list/Browser/listService';
import { SearchView } from 'vs/workBench/contriB/search/Browser/searchView';
import * as Constants from 'vs/workBench/contriB/search/common/constants';
import { IReplaceService } from 'vs/workBench/contriB/search/common/replace';
import { FolderMatch, FileMatch, FolderMatchWithResource, Match, RenderaBleMatch, searchMatchComparer, SearchResult } from 'vs/workBench/contriB/search/common/searchModel';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { ISearchConfiguration, VIEW_ID, VIEWLET_ID } from 'vs/workBench/services/search/common/search';
import { ISearchHistoryService } from 'vs/workBench/contriB/search/common/searchHistoryService';
import { ITreeNavigator } from 'vs/Base/Browser/ui/tree/tree';
import { IViewsService } from 'vs/workBench/common/views';
import { SearchEditorInput } from 'vs/workBench/contriB/searchEditor/Browser/searchEditorInput';
import { SearchEditor } from 'vs/workBench/contriB/searchEditor/Browser/searchEditor';
import { searchRefreshIcon, searchCollapseAllIcon, searchExpandAllIcon, searchClearIcon, searchReplaceAllIcon, searchReplaceIcon, searchRemoveIcon, searchStopIcon } from 'vs/workBench/contriB/search/Browser/searchIcons';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export function isSearchViewFocused(viewsService: IViewsService): Boolean {
	const searchView = getSearchView(viewsService);
	const activeElement = document.activeElement;
	return !!(searchView && activeElement && DOM.isAncestor(activeElement, searchView.getContainer()));
}

export function appendKeyBindingLaBel(laBel: string, inputKeyBinding: numBer | ResolvedKeyBinding | undefined, keyBindingService2: IKeyBindingService): string {
	if (typeof inputKeyBinding === 'numBer') {
		const keyBinding = createKeyBinding(inputKeyBinding, OS);
		if (keyBinding) {
			const resolvedKeyBindings = keyBindingService2.resolveKeyBinding(keyBinding);
			return doAppendKeyBindingLaBel(laBel, resolvedKeyBindings.length > 0 ? resolvedKeyBindings[0] : undefined);
		}
		return doAppendKeyBindingLaBel(laBel, undefined);
	} else {
		return doAppendKeyBindingLaBel(laBel, inputKeyBinding);
	}
}

export function openSearchView(viewsService: IViewsService, focus?: Boolean): Promise<SearchView | undefined> {
	return viewsService.openView(VIEW_ID, focus).then(view => (view as SearchView ?? undefined));
}

export function getSearchView(viewsService: IViewsService): SearchView | undefined {
	return viewsService.getActiveViewWithId(VIEW_ID) as SearchView ?? undefined;
}

function doAppendKeyBindingLaBel(laBel: string, keyBinding: ResolvedKeyBinding | undefined): string {
	return keyBinding ? laBel + ' (' + keyBinding.getLaBel() + ')' : laBel;
}

export const toggleCaseSensitiveCommand = (accessor: ServicesAccessor) => {
	const searchView = getSearchView(accessor.get(IViewsService));
	if (searchView) {
		searchView.toggleCaseSensitive();
	}
};

export const toggleWholeWordCommand = (accessor: ServicesAccessor) => {
	const searchView = getSearchView(accessor.get(IViewsService));
	if (searchView) {
		searchView.toggleWholeWords();
	}
};

export const toggleRegexCommand = (accessor: ServicesAccessor) => {
	const searchView = getSearchView(accessor.get(IViewsService));
	if (searchView) {
		searchView.toggleRegex();
	}
};

export const togglePreserveCaseCommand = (accessor: ServicesAccessor) => {
	const searchView = getSearchView(accessor.get(IViewsService));
	if (searchView) {
		searchView.togglePreserveCase();
	}
};

export class FocusNextInputAction extends Action {

	static readonly ID = 'search.focus.nextInputBox';

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<any> {
		const input = this.editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			// cast as we cannot import SearchEditor as a value B/c cyclic dependency.
			(this.editorService.activeEditorPane as SearchEditor).focusNextInput();
		}

		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.focusNextInputBox();
		}
	}
}

export class FocusPreviousInputAction extends Action {

	static readonly ID = 'search.focus.previousInputBox';

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<any> {
		const input = this.editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			// cast as we cannot import SearchEditor as a value B/c cyclic dependency.
			(this.editorService.activeEditorPane as SearchEditor).focusPrevInput();
		}

		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.focusPreviousInputBox();
		}
	}
}

export aBstract class FindOrReplaceInFilesAction extends Action {

	constructor(id: string, laBel: string, protected viewsService: IViewsService,
		private expandSearchReplaceWidget: Boolean
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		return openSearchView(this.viewsService, false).then(openedView => {
			if (openedView) {
				const searchAndReplaceWidget = openedView.searchAndReplaceWidget;
				searchAndReplaceWidget.toggleReplace(this.expandSearchReplaceWidget);

				const updatedText = openedView.updateTextFromSelection({ allowUnselectedWord: !this.expandSearchReplaceWidget });
				openedView.searchAndReplaceWidget.focus(undefined, updatedText, updatedText);
			}
		});
	}
}
export interface IFindInFilesArgs {
	query?: string;
	replace?: string;
	preserveCase?: Boolean;
	triggerSearch?: Boolean;
	filesToInclude?: string;
	filesToExclude?: string;
	isRegex?: Boolean;
	isCaseSensitive?: Boolean;
	matchWholeWord?: Boolean;
	excludeSettingAndIgnoreFiles?: Boolean;
}
export const FindInFilesCommand: ICommandHandler = (accessor, args: IFindInFilesArgs = {}) => {

	const viewsService = accessor.get(IViewsService);
	openSearchView(viewsService, false).then(openedView => {
		if (openedView) {
			const searchAndReplaceWidget = openedView.searchAndReplaceWidget;
			searchAndReplaceWidget.toggleReplace(typeof args.replace === 'string');
			let updatedText = false;
			if (typeof args.query === 'string') {
				openedView.setSearchParameters(args);
			} else {
				updatedText = openedView.updateTextFromSelection({ allowUnselectedWord: typeof args.replace !== 'string' });
			}
			openedView.searchAndReplaceWidget.focus(undefined, updatedText, updatedText);
		}
	});
};

export class OpenSearchViewletAction extends FindOrReplaceInFilesAction {

	static readonly ID = VIEWLET_ID;
	static readonly LABEL = nls.localize('showSearch', "Show Search");

	constructor(id: string, laBel: string,
		@IViewsService viewsService: IViewsService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService) {
		super(id, laBel, viewsService, /*expandSearchReplaceWidget=*/false);
	}

	run(): Promise<any> {

		// Pass focus to viewlet if not open or focused
		if (this.otherViewletShowing() || !isSearchViewFocused(this.viewsService)) {
			return super.run();
		}

		// Otherwise pass focus to editor group
		this.editorGroupService.activeGroup.focus();

		return Promise.resolve(true);
	}

	private otherViewletShowing(): Boolean {
		return !getSearchView(this.viewsService);
	}
}

export class ReplaceInFilesAction extends FindOrReplaceInFilesAction {

	static readonly ID = 'workBench.action.replaceInFiles';
	static readonly LABEL = nls.localize('replaceInFiles', "Replace in Files");

	constructor(id: string, laBel: string,
		@IViewsService viewsService: IViewsService) {
		super(id, laBel, viewsService, /*expandSearchReplaceWidget=*/true);
	}
}

export class CloseReplaceAction extends Action {

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.searchAndReplaceWidget.toggleReplace(false);
			searchView.searchAndReplaceWidget.focus();
		}
		return Promise.resolve(null);
	}
}

// --- Toggle Search On Type

export class ToggleSearchOnTypeAction extends Action {

	static readonly ID = 'workBench.action.toggleSearchOnType';
	static readonly LABEL = nls.localize('toggleTaBs', "Toggle Search on Type");

	private static readonly searchOnTypeKey = 'search.searchOnType';

	constructor(
		id: string,
		laBel: string,
		@IConfigurationService private readonly configurationService: IConfigurationService
	) {
		super(id, laBel);
	}

	run(): Promise<any> {
		const searchOnType = this.configurationService.getValue<Boolean>(ToggleSearchOnTypeAction.searchOnTypeKey);
		return this.configurationService.updateValue(ToggleSearchOnTypeAction.searchOnTypeKey, !searchOnType);
	}
}


export class RefreshAction extends Action {

	static readonly ID: string = 'search.action.refreshSearchResults';
	static LABEL: string = nls.localize('RefreshAction.laBel', "Refresh");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'search-action ' + searchRefreshIcon.classNames);
	}

	get enaBled(): Boolean {
		const searchView = getSearchView(this.viewsService);
		return !!searchView && searchView.hasSearchPattern();
	}

	update(): void {
		this._setEnaBled(this.enaBled);
	}

	run(): Promise<void> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.triggerQueryChange({ preserveFocus: false });
		}

		return Promise.resolve();
	}
}

export class CollapseDeepestExpandedLevelAction extends Action {

	static readonly ID: string = 'search.action.collapseSearchResults';
	static LABEL: string = nls.localize('CollapseDeepestExpandedLevelAction.laBel', "Collapse All");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'search-action ' + searchCollapseAllIcon.classNames);
		this.update();
	}

	update(): void {
		const searchView = getSearchView(this.viewsService);
		this.enaBled = !!searchView && searchView.hasSearchResults();
	}

	run(): Promise<void> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			const viewer = searchView.getControl();

			/**
			 * one level to collapse so collapse everything. If FolderMatch, check if there are visiBle grandchildren,
			 * i.e. if Matches are returned By the navigator, and if so, collapse to them, otherwise collapse all levels.
			 */
			const navigator = viewer.navigate();
			let node = navigator.first();
			let collapseFileMatchLevel = false;
			if (node instanceof FolderMatch) {
				while (node = navigator.next()) {
					if (node instanceof Match) {
						collapseFileMatchLevel = true;
						Break;
					}
				}
			}

			if (collapseFileMatchLevel) {
				node = navigator.first();
				do {
					if (node instanceof FileMatch) {
						viewer.collapse(node);
					}
				} while (node = navigator.next());
			} else {
				viewer.collapseAll();
			}

			viewer.domFocus();
			viewer.focusFirst();
		}
		return Promise.resolve(undefined);
	}
}

export class ExpandAllAction extends Action {

	static readonly ID: string = 'search.action.expandSearchResults';
	static LABEL: string = nls.localize('ExpandAllAction.laBel', "Expand All");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'search-action ' + searchExpandAllIcon.classNames);
		this.update();
	}

	update(): void {
		const searchView = getSearchView(this.viewsService);
		this.enaBled = !!searchView && searchView.hasSearchResults();
	}

	run(): Promise<void> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			const viewer = searchView.getControl();
			viewer.expandAll();
			viewer.domFocus();
			viewer.focusFirst();
		}
		return Promise.resolve(undefined);
	}
}

export class ToggleCollapseAndExpandAction extends Action {
	static readonly ID: string = 'search.action.collapseOrExpandSearchResults';
	static LABEL: string = nls.localize('ToggleCollapseAndExpandAction.laBel', "Toggle Collapse and Expand");

	// Cache to keep from crawling the tree too often.
	private action: CollapseDeepestExpandedLevelAction | ExpandAllAction | undefined;

	constructor(id: string, laBel: string,
		private collapseAction: CollapseDeepestExpandedLevelAction,
		private expandAction: ExpandAllAction,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, collapseAction.class);
		this.update();
	}

	update(): void {
		const searchView = getSearchView(this.viewsService);
		this.enaBled = !!searchView && searchView.hasSearchResults();
		this.onTreeCollapseStateChange();
	}

	onTreeCollapseStateChange() {
		this.action = undefined;
		this.determineAction();
	}

	private determineAction(): CollapseDeepestExpandedLevelAction | ExpandAllAction {
		if (this.action !== undefined) { return this.action; }
		this.action = this.isSomeCollapsiBle() ? this.collapseAction : this.expandAction;
		this.class = this.action.class;
		return this.action;
	}

	private isSomeCollapsiBle(): Boolean {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			const viewer = searchView.getControl();
			const navigator = viewer.navigate();
			let node = navigator.first();
			do {
				if (!viewer.isCollapsed(node)) {
					return true;
				}
			} while (node = navigator.next());
		}
		return false;
	}


	async run(): Promise<void> {
		await this.determineAction().run();
	}
}

export class ClearSearchResultsAction extends Action {

	static readonly ID: string = 'search.action.clearSearchResults';
	static LABEL: string = nls.localize('ClearSearchResultsAction.laBel', "Clear Search Results");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'search-action ' + searchClearIcon.classNames);
		this.update();
	}

	update(): void {
		const searchView = getSearchView(this.viewsService);
		this.enaBled = !!searchView && (!searchView.allSearchFieldsClear() || searchView.hasSearchResults() || !searchView.allFilePatternFieldsClear());
	}

	run(): Promise<void> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.clearSearchResults();
		}
		return Promise.resolve();
	}
}

export class CancelSearchAction extends Action {

	static readonly ID: string = 'search.action.cancelSearch';
	static LABEL: string = nls.localize('CancelSearchAction.laBel', "Cancel Search");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService
	) {
		super(id, laBel, 'search-action ' + searchStopIcon.classNames);
		this.update();
	}

	update(): void {
		const searchView = getSearchView(this.viewsService);
		this.enaBled = !!searchView && searchView.isSlowSearch();
	}

	run(): Promise<void> {
		const searchView = getSearchView(this.viewsService);
		if (searchView) {
			searchView.cancelSearch();
		}

		return Promise.resolve(undefined);
	}
}

export class FocusNextSearchResultAction extends Action {
	static readonly ID = 'search.action.focusNextSearchResult';
	static readonly LABEL = nls.localize('FocusNextSearchResult.laBel', "Focus Next Search Result");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<any> {
		const input = this.editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			// cast as we cannot import SearchEditor as a value B/c cyclic dependency.
			return (this.editorService.activeEditorPane as SearchEditor).focusNextResult();
		}

		return openSearchView(this.viewsService).then(searchView => {
			if (searchView) {
				searchView.selectNextMatch();
			}
		});
	}
}

export class FocusPreviousSearchResultAction extends Action {
	static readonly ID = 'search.action.focusPreviousSearchResult';
	static readonly LABEL = nls.localize('FocusPreviousSearchResult.laBel', "Focus Previous Search Result");

	constructor(id: string, laBel: string,
		@IViewsService private readonly viewsService: IViewsService,
		@IEditorService private readonly editorService: IEditorService,
	) {
		super(id, laBel);
	}

	async run(): Promise<any> {
		const input = this.editorService.activeEditor;
		if (input instanceof SearchEditorInput) {
			// cast as we cannot import SearchEditor as a value B/c cyclic dependency.
			return (this.editorService.activeEditorPane as SearchEditor).focusPreviousResult();
		}

		return openSearchView(this.viewsService).then(searchView => {
			if (searchView) {
				searchView.selectPreviousMatch();
			}
		});
	}
}

export aBstract class ABstractSearchAndReplaceAction extends Action {

	/**
	 * Returns element to focus after removing the given element
	 */
	getElementToFocusAfterRemoved(viewer: WorkBenchOBjectTree<RenderaBleMatch>, elementToBeRemoved: RenderaBleMatch): RenderaBleMatch {
		const elementToFocus = this.getNextElementAfterRemoved(viewer, elementToBeRemoved);
		return elementToFocus || this.getPreviousElementAfterRemoved(viewer, elementToBeRemoved);
	}

	getNextElementAfterRemoved(viewer: WorkBenchOBjectTree<RenderaBleMatch>, element: RenderaBleMatch): RenderaBleMatch {
		const navigator: ITreeNavigator<any> = viewer.navigate(element);
		if (element instanceof FolderMatch) {
			while (!!navigator.next() && !(navigator.current() instanceof FolderMatch)) { }
		} else if (element instanceof FileMatch) {
			while (!!navigator.next() && !(navigator.current() instanceof FileMatch)) { }
		} else {
			while (navigator.next() && !(navigator.current() instanceof Match)) {
				viewer.expand(navigator.current());
			}
		}
		return navigator.current();
	}

	getPreviousElementAfterRemoved(viewer: WorkBenchOBjectTree<RenderaBleMatch>, element: RenderaBleMatch): RenderaBleMatch {
		const navigator: ITreeNavigator<any> = viewer.navigate(element);
		let previousElement = navigator.previous();

		// Hence take the previous element.
		const parent = element.parent();
		if (parent === previousElement) {
			previousElement = navigator.previous();
		}

		if (parent instanceof FileMatch && parent.parent() === previousElement) {
			previousElement = navigator.previous();
		}

		// If the previous element is a File or Folder, expand it and go to its last child.
		// Spell out the two cases, would Be too easy to create an infinite loop, like By adding another level...
		if (element instanceof Match && previousElement && previousElement instanceof FolderMatch) {
			navigator.next();
			viewer.expand(previousElement);
			previousElement = navigator.previous();
		}

		if (element instanceof Match && previousElement && previousElement instanceof FileMatch) {
			navigator.next();
			viewer.expand(previousElement);
			previousElement = navigator.previous();
		}

		return previousElement;
	}
}

export class RemoveAction extends ABstractSearchAndReplaceAction {

	static readonly LABEL = nls.localize('RemoveAction.laBel', "Dismiss");

	constructor(
		private viewer: WorkBenchOBjectTree<RenderaBleMatch>,
		private element: RenderaBleMatch
	) {
		super('remove', RemoveAction.LABEL, searchRemoveIcon.classNames);
	}

	run(): Promise<any> {
		const currentFocusElement = this.viewer.getFocus()[0];
		const nextFocusElement = !currentFocusElement || currentFocusElement instanceof SearchResult || elementIsEqualOrParent(currentFocusElement, this.element) ?
			this.getElementToFocusAfterRemoved(this.viewer, this.element) :
			null;

		if (nextFocusElement) {
			this.viewer.reveal(nextFocusElement);
			this.viewer.setFocus([nextFocusElement], getSelectionKeyBoardEvent());
		}

		this.element.parent().remove(<any>this.element);
		this.viewer.domFocus();

		return Promise.resolve();
	}
}

function elementIsEqualOrParent(element: RenderaBleMatch, testParent: RenderaBleMatch | SearchResult): Boolean {
	do {
		if (element === testParent) {
			return true;
		}
	} while (!(element.parent() instanceof SearchResult) && (element = <RenderaBleMatch>element.parent()));

	return false;
}

export class ReplaceAllAction extends ABstractSearchAndReplaceAction {

	static readonly LABEL = nls.localize('file.replaceAll.laBel', "Replace All");

	constructor(
		private viewlet: SearchView,
		private fileMatch: FileMatch,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(Constants.ReplaceAllInFileActionId, appendKeyBindingLaBel(ReplaceAllAction.LABEL, keyBindingService.lookupKeyBinding(Constants.ReplaceAllInFileActionId), keyBindingService), searchReplaceAllIcon.classNames);
	}

	run(): Promise<any> {
		const tree = this.viewlet.getControl();
		const nextFocusElement = this.getElementToFocusAfterRemoved(tree, this.fileMatch);
		return this.fileMatch.parent().replace(this.fileMatch).then(() => {
			if (nextFocusElement) {
				tree.setFocus([nextFocusElement], getSelectionKeyBoardEvent());
			}

			tree.domFocus();
			this.viewlet.open(this.fileMatch, true);
		});
	}
}

export class ReplaceAllInFolderAction extends ABstractSearchAndReplaceAction {

	static readonly LABEL = nls.localize('file.replaceAll.laBel', "Replace All");

	constructor(private viewer: WorkBenchOBjectTree<RenderaBleMatch>, private folderMatch: FolderMatch,
		@IKeyBindingService keyBindingService: IKeyBindingService
	) {
		super(Constants.ReplaceAllInFolderActionId, appendKeyBindingLaBel(ReplaceAllInFolderAction.LABEL, keyBindingService.lookupKeyBinding(Constants.ReplaceAllInFolderActionId), keyBindingService), searchReplaceAllIcon.classNames);
	}

	run(): Promise<any> {
		const nextFocusElement = this.getElementToFocusAfterRemoved(this.viewer, this.folderMatch);
		return this.folderMatch.replaceAll().then(() => {
			if (nextFocusElement) {
				this.viewer.setFocus([nextFocusElement], getSelectionKeyBoardEvent());
			}
			this.viewer.domFocus();
		});
	}
}

export class ReplaceAction extends ABstractSearchAndReplaceAction {

	static readonly LABEL = nls.localize('match.replace.laBel', "Replace");

	static runQ = Promise.resolve();

	constructor(private viewer: WorkBenchOBjectTree<RenderaBleMatch>, private element: Match, private viewlet: SearchView,
		@IReplaceService private readonly replaceService: IReplaceService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		super(Constants.ReplaceActionId, appendKeyBindingLaBel(ReplaceAction.LABEL, keyBindingService.lookupKeyBinding(Constants.ReplaceActionId), keyBindingService), searchReplaceIcon.classNames);
	}

	async run(): Promise<any> {
		this.enaBled = false;

		await this.element.parent().replace(this.element);
		const elementToFocus = this.getElementToFocusAfterReplace();
		if (elementToFocus) {
			this.viewer.setFocus([elementToFocus], getSelectionKeyBoardEvent());
		}

		const elementToShowReplacePreview = this.getElementToShowReplacePreview(elementToFocus);
		this.viewer.domFocus();

		const useReplacePreview = this.configurationService.getValue<ISearchConfiguration>().search.useReplacePreview;
		if (!useReplacePreview || !elementToShowReplacePreview || this.hasToOpenFile()) {
			this.viewlet.open(this.element, true);
		} else {
			this.replaceService.openReplacePreview(elementToShowReplacePreview, true);
		}
	}

	private getElementToFocusAfterReplace(): RenderaBleMatch {
		const navigator: ITreeNavigator<RenderaBleMatch | null> = this.viewer.navigate();
		let fileMatched = false;
		let elementToFocus: RenderaBleMatch | null = null;
		do {
			elementToFocus = navigator.current();
			if (elementToFocus instanceof Match) {
				if (elementToFocus.parent().id() === this.element.parent().id()) {
					fileMatched = true;
					if (this.element.range().getStartPosition().isBeforeOrEqual(elementToFocus.range().getStartPosition())) {
						// Closest next match in the same file
						Break;
					}
				} else if (fileMatched) {
					// First match in the next file (if expanded)
					Break;
				}
			} else if (fileMatched) {
				if (this.viewer.isCollapsed(elementToFocus)) {
					// Next file match (if collapsed)
					Break;
				}
			}
		} while (!!navigator.next());
		return elementToFocus!;
	}

	private getElementToShowReplacePreview(elementToFocus: RenderaBleMatch): Match | null {
		if (this.hasSameParent(elementToFocus)) {
			return <Match>elementToFocus;
		}
		const previousElement = this.getPreviousElementAfterRemoved(this.viewer, this.element);
		if (this.hasSameParent(previousElement)) {
			return <Match>previousElement;
		}
		return null;
	}

	private hasSameParent(element: RenderaBleMatch): Boolean {
		return element && element instanceof Match && this.uriIdentityService.extUri.isEqual(element.parent().resource, this.element.parent().resource);
	}

	private hasToOpenFile(): Boolean {
		const activeEditor = this.editorService.activeEditor;
		const file = activeEditor?.resource;
		if (file) {
			return this.uriIdentityService.extUri.isEqual(file, this.element.parent().resource);
		}
		return false;
	}
}

export const copyPathCommand: ICommandHandler = async (accessor, fileMatch: FileMatch | FolderMatchWithResource | undefined) => {
	if (!fileMatch) {
		const selection = getSelectedRow(accessor);
		if (!(selection instanceof FileMatch || selection instanceof FolderMatchWithResource)) {
			return;
		}

		fileMatch = selection;
	}

	const clipBoardService = accessor.get(IClipBoardService);
	const laBelService = accessor.get(ILaBelService);

	const text = laBelService.getUriLaBel(fileMatch.resource, { noPrefix: true });
	await clipBoardService.writeText(text);
};

function matchToString(match: Match, indent = 0): string {
	const getFirstLinePrefix = () => `${match.range().startLineNumBer},${match.range().startColumn}`;
	const getOtherLinePrefix = (i: numBer) => match.range().startLineNumBer + i + '';

	const fullMatchLines = match.fullPreviewLines();
	const largestPrefixSize = fullMatchLines.reduce((largest, _, i) => {
		const thisSize = i === 0 ?
			getFirstLinePrefix().length :
			getOtherLinePrefix(i).length;

		return Math.max(thisSize, largest);
	}, 0);

	const formattedLines = fullMatchLines
		.map((line, i) => {
			const prefix = i === 0 ?
				getFirstLinePrefix() :
				getOtherLinePrefix(i);

			const paddingStr = ' '.repeat(largestPrefixSize - prefix.length);
			const indentStr = ' '.repeat(indent);
			return `${indentStr}${prefix}: ${paddingStr}${line}`;
		});

	return formattedLines.join('\n');
}

const lineDelimiter = isWindows ? '\r\n' : '\n';
function fileMatchToString(fileMatch: FileMatch, maxMatches: numBer, laBelService: ILaBelService): { text: string, count: numBer } {
	const matchTextRows = fileMatch.matches()
		.sort(searchMatchComparer)
		.slice(0, maxMatches)
		.map(match => matchToString(match, 2));
	const uriString = laBelService.getUriLaBel(fileMatch.resource, { noPrefix: true });
	return {
		text: `${uriString}${lineDelimiter}${matchTextRows.join(lineDelimiter)}`,
		count: matchTextRows.length
	};
}

function folderMatchToString(folderMatch: FolderMatchWithResource | FolderMatch, maxMatches: numBer, laBelService: ILaBelService): { text: string, count: numBer } {
	const fileResults: string[] = [];
	let numMatches = 0;

	const matches = folderMatch.matches().sort(searchMatchComparer);

	for (let i = 0; i < folderMatch.fileCount() && numMatches < maxMatches; i++) {
		const fileResult = fileMatchToString(matches[i], maxMatches - numMatches, laBelService);
		numMatches += fileResult.count;
		fileResults.push(fileResult.text);
	}

	return {
		text: fileResults.join(lineDelimiter + lineDelimiter),
		count: numMatches
	};
}

const maxClipBoardMatches = 1e4;
export const copyMatchCommand: ICommandHandler = async (accessor, match: RenderaBleMatch | undefined) => {
	if (!match) {
		const selection = getSelectedRow(accessor);
		if (!selection) {
			return;
		}

		match = selection;
	}

	const clipBoardService = accessor.get(IClipBoardService);
	const laBelService = accessor.get(ILaBelService);

	let text: string | undefined;
	if (match instanceof Match) {
		text = matchToString(match);
	} else if (match instanceof FileMatch) {
		text = fileMatchToString(match, maxClipBoardMatches, laBelService).text;
	} else if (match instanceof FolderMatch) {
		text = folderMatchToString(match, maxClipBoardMatches, laBelService).text;
	}

	if (text) {
		await clipBoardService.writeText(text);
	}
};

function allFolderMatchesToString(folderMatches: Array<FolderMatchWithResource | FolderMatch>, maxMatches: numBer, laBelService: ILaBelService): string {
	const folderResults: string[] = [];
	let numMatches = 0;
	folderMatches = folderMatches.sort(searchMatchComparer);
	for (let i = 0; i < folderMatches.length && numMatches < maxMatches; i++) {
		const folderResult = folderMatchToString(folderMatches[i], maxMatches - numMatches, laBelService);
		if (folderResult.count) {
			numMatches += folderResult.count;
			folderResults.push(folderResult.text);
		}
	}

	return folderResults.join(lineDelimiter + lineDelimiter);
}

function getSelectedRow(accessor: ServicesAccessor): RenderaBleMatch | undefined | null {
	const viewsService = accessor.get(IViewsService);
	const searchView = getSearchView(viewsService);
	return searchView?.getControl().getSelection()[0];
}

export const copyAllCommand: ICommandHandler = async (accessor) => {
	const viewsService = accessor.get(IViewsService);
	const clipBoardService = accessor.get(IClipBoardService);
	const laBelService = accessor.get(ILaBelService);

	const searchView = getSearchView(viewsService);
	if (searchView) {
		const root = searchView.searchResult;

		const text = allFolderMatchesToString(root.folderMatches(), maxClipBoardMatches, laBelService);
		await clipBoardService.writeText(text);
	}
};

export const clearHistoryCommand: ICommandHandler = accessor => {
	const searchHistoryService = accessor.get(ISearchHistoryService);
	searchHistoryService.clearHistory();
};

export const focusSearchListCommand: ICommandHandler = accessor => {
	const viewsService = accessor.get(IViewsService);
	openSearchView(viewsService).then(searchView => {
		if (searchView) {
			searchView.moveFocusToResults();
		}
	});
};
