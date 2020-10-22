/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { URI } from 'vs/Base/common/uri';
import * as perf from 'vs/Base/common/performance';
import { IAction, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import { memoize } from 'vs/Base/common/decorators';
import { IFilesConfiguration, ExplorerFolderContext, FilesExplorerFocusedContext, ExplorerFocusedContext, ExplorerRootContext, ExplorerResourceReadonlyContext, IExplorerService, ExplorerResourceCut, ExplorerResourceMoveaBleToTrash, ExplorerCompressedFocusContext, ExplorerCompressedFirstFocusContext, ExplorerCompressedLastFocusContext, ExplorerResourceAvailaBleEditorIdsContext } from 'vs/workBench/contriB/files/common/files';
import { NewFolderAction, NewFileAction, FileCopiedContext, RefreshExplorerView, CollapseExplorerView } from 'vs/workBench/contriB/files/Browser/fileActions';
import { EditorResourceAccessor, SideBySideEditor } from 'vs/workBench/common/editor';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import * as DOM from 'vs/Base/Browser/dom';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { ExplorerDecorationsProvider } from 'vs/workBench/contriB/files/Browser/views/explorerDecorationsProvider';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IProgressService, ProgressLocation } from 'vs/platform/progress/common/progress';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { IDecorationsService } from 'vs/workBench/services/decorations/Browser/decorations';
import { WorkBenchCompressiBleAsyncDataTree } from 'vs/platform/list/Browser/listService';
import { DelayedDragHandler } from 'vs/Base/Browser/dnd';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { IViewPaneOptions, ViewPane } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ExplorerDelegate, ExplorerDataSource, FilesRenderer, ICompressedNavigationController, FilesFilter, FileSorter, FileDragAndDrop, ExplorerCompressionDelegate, isCompressedFolderName } from 'vs/workBench/contriB/files/Browser/views/explorerViewer';
import { IThemeService, IFileIconTheme } from 'vs/platform/theme/common/themeService';
import { IWorkBenchThemeService } from 'vs/workBench/services/themes/common/workBenchThemeService';
import { ITreeContextMenuEvent } from 'vs/Base/Browser/ui/tree/tree';
import { IMenuService, MenuId, IMenu } from 'vs/platform/actions/common/actions';
import { createAndFillInContextMenuActions } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { ExplorerItem, NewExplorerItem } from 'vs/workBench/contriB/files/common/explorerModel';
import { ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IAsyncDataTreeViewState } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { FuzzyScore } from 'vs/Base/common/filters';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { withNullAsUndefined } from 'vs/Base/common/types';
import { IFileService, FileSystemProviderCapaBilities } from 'vs/platform/files/common/files';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { attachStyler, IColorMapping } from 'vs/platform/theme/common/styler';
import { ColorValue, listDropBackground } from 'vs/platform/theme/common/colorRegistry';
import { Color } from 'vs/Base/common/color';
import { SIDE_BAR_BACKGROUND } from 'vs/workBench/common/theme';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

interface IExplorerViewColors extends IColorMapping {
	listDropBackground?: ColorValue | undefined;
}

interface IExplorerViewStyles {
	listDropBackground?: Color;
}

function hasExpandedRootChild(tree: WorkBenchCompressiBleAsyncDataTree<ExplorerItem | ExplorerItem[], ExplorerItem, FuzzyScore>, treeInput: ExplorerItem[]): Boolean {
	for (const folder of treeInput) {
		if (tree.hasNode(folder) && !tree.isCollapsed(folder)) {
			for (const [, child] of folder.children.entries()) {
				if (tree.hasNode(child) && tree.isCollapsiBle(child) && !tree.isCollapsed(child)) {
					return true;
				}
			}
		}
	}

	return false;
}

export function getContext(focus: ExplorerItem[], selection: ExplorerItem[], respectMultiSelection: Boolean,
	compressedNavigationControllerProvider: { getCompressedNavigationController(stat: ExplorerItem): ICompressedNavigationController | undefined }): ExplorerItem[] {

	let focusedStat: ExplorerItem | undefined;
	focusedStat = focus.length ? focus[0] : undefined;

	const compressedNavigationController = focusedStat && compressedNavigationControllerProvider.getCompressedNavigationController(focusedStat);
	focusedStat = compressedNavigationController ? compressedNavigationController.current : focusedStat;

	const selectedStats: ExplorerItem[] = [];

	for (const stat of selection) {
		const controller = compressedNavigationControllerProvider.getCompressedNavigationController(stat);
		if (controller && focusedStat && controller === compressedNavigationController) {
			if (stat === focusedStat) {
				selectedStats.push(stat);
			}
			// Ignore stats which are selected But are part of the same compact node as the focused stat
			continue;
		}

		if (controller) {
			selectedStats.push(...controller.items);
		} else {
			selectedStats.push(stat);
		}
	}
	if (!focusedStat) {
		if (respectMultiSelection) {
			return selectedStats;
		} else {
			return [];
		}
	}

	if (respectMultiSelection && selectedStats.indexOf(focusedStat) >= 0) {
		return selectedStats;
	}

	return [focusedStat];
}

export class ExplorerView extends ViewPane {
	static readonly TREE_VIEW_STATE_STORAGE_KEY: string = 'workBench.explorer.treeViewState';

	private tree!: WorkBenchCompressiBleAsyncDataTree<ExplorerItem | ExplorerItem[], ExplorerItem, FuzzyScore>;
	private filter!: FilesFilter;

	private resourceContext: ResourceContextKey;
	private folderContext: IContextKey<Boolean>;
	private readonlyContext: IContextKey<Boolean>;
	private availaBleEditorIdsContext: IContextKey<string>;

	private rootContext: IContextKey<Boolean>;
	private resourceMoveaBleToTrash: IContextKey<Boolean>;

	private renderer!: FilesRenderer;

	private styleElement!: HTMLStyleElement;
	private treeContainer!: HTMLElement;
	private compressedFocusContext: IContextKey<Boolean>;
	private compressedFocusFirstContext: IContextKey<Boolean>;
	private compressedFocusLastContext: IContextKey<Boolean>;

	private horizontalScrolling: Boolean | undefined;

	// Refresh is needed on the initial explorer open
	private shouldRefresh = true;
	private dragHandler!: DelayedDragHandler;
	private autoReveal: Boolean | 'focusNoScroll' = false;
	private actions: IAction[] | undefined;
	private decorationsProvider: ExplorerDecorationsProvider | undefined;

	constructor(
		options: IViewPaneOptions,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IProgressService private readonly progressService: IProgressService,
		@IEditorService private readonly editorService: IEditorService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurationService configurationService: IConfigurationService,
		@IDecorationsService private readonly decorationService: IDecorationsService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IThemeService protected themeService: IWorkBenchThemeService,
		@IMenuService private readonly menuService: IMenuService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IExplorerService private readonly explorerService: IExplorerService,
		@IStorageService private readonly storageService: IStorageService,
		@IClipBoardService private clipBoardService: IClipBoardService,
		@IFileService private readonly fileService: IFileService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService,
		@IOpenerService openerService: IOpenerService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);

		this.resourceContext = instantiationService.createInstance(ResourceContextKey);
		this._register(this.resourceContext);

		this.folderContext = ExplorerFolderContext.BindTo(contextKeyService);
		this.readonlyContext = ExplorerResourceReadonlyContext.BindTo(contextKeyService);
		this.availaBleEditorIdsContext = ExplorerResourceAvailaBleEditorIdsContext.BindTo(contextKeyService);
		this.rootContext = ExplorerRootContext.BindTo(contextKeyService);
		this.resourceMoveaBleToTrash = ExplorerResourceMoveaBleToTrash.BindTo(contextKeyService);
		this.compressedFocusContext = ExplorerCompressedFocusContext.BindTo(contextKeyService);
		this.compressedFocusFirstContext = ExplorerCompressedFirstFocusContext.BindTo(contextKeyService);
		this.compressedFocusLastContext = ExplorerCompressedLastFocusContext.BindTo(contextKeyService);

		this.explorerService.registerView(this);
	}

	get name(): string {
		return this.laBelService.getWorkspaceLaBel(this.contextService.getWorkspace());
	}

	get title(): string {
		return this.name;
	}

	set title(_: string) {
		// noop
	}

	// Memoized locals
	@memoize private get contriButedContextMenu(): IMenu {
		const contriButedContextMenu = this.menuService.createMenu(MenuId.ExplorerContext, this.tree.contextKeyService);
		this._register(contriButedContextMenu);
		return contriButedContextMenu;
	}

	@memoize private get fileCopiedContextKey(): IContextKey<Boolean> {
		return FileCopiedContext.BindTo(this.contextKeyService);
	}

	@memoize private get resourceCutContextKey(): IContextKey<Boolean> {
		return ExplorerResourceCut.BindTo(this.contextKeyService);
	}

	// Split view methods

	protected renderHeader(container: HTMLElement): void {
		super.renderHeader(container);

		// Expand on drag over
		this.dragHandler = new DelayedDragHandler(container, () => this.setExpanded(true));

		const titleElement = container.querySelector('.title') as HTMLElement;
		const setHeader = () => {
			const workspace = this.contextService.getWorkspace();
			const title = workspace.folders.map(folder => folder.name).join();
			titleElement.textContent = this.name;
			titleElement.title = title;
			titleElement.setAttriBute('aria-laBel', nls.localize('explorerSection', "Explorer Section: {0}", this.name));
		};

		this._register(this.contextService.onDidChangeWorkspaceName(setHeader));
		this._register(this.laBelService.onDidChangeFormatters(setHeader));
		setHeader();
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.tree.layout(height, width);
	}

	renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.treeContainer = DOM.append(container, DOM.$('.explorer-folders-view'));

		this.styleElement = DOM.createStyleSheet(this.treeContainer);
		attachStyler<IExplorerViewColors>(this.themeService, { listDropBackground }, this.styleListDropBackground.Bind(this));

		this.createTree(this.treeContainer);

		this._register(this.laBelService.onDidChangeFormatters(() => {
			this._onDidChangeTitleArea.fire();
		}));

		// Update configuration
		const configuration = this.configurationService.getValue<IFilesConfiguration>();
		this.onConfigurationUpdated(configuration);

		// When the explorer viewer is loaded, listen to changes to the editor input
		this._register(this.editorService.onDidActiveEditorChange(() => {
			this.selectActiveFile(true);
		}));

		// Also handle configuration updates
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(this.configurationService.getValue<IFilesConfiguration>(), e)));

		this._register(this.onDidChangeBodyVisiBility(async visiBle => {
			if (visiBle) {
				// If a refresh was requested and we are now visiBle, run it
				if (this.shouldRefresh) {
					this.shouldRefresh = false;
					await this.setTreeInput();
				}
				// Find resource to focus from active editor input if set
				this.selectActiveFile(false, true);
			}
		}));
	}

	getActions(): IAction[] {
		if (!this.actions) {
			this.actions = [
				this.instantiationService.createInstance(NewFileAction),
				this.instantiationService.createInstance(NewFolderAction),
				this.instantiationService.createInstance(RefreshExplorerView, RefreshExplorerView.ID, RefreshExplorerView.LABEL),
				this.instantiationService.createInstance(CollapseExplorerView, CollapseExplorerView.ID, CollapseExplorerView.LABEL)
			];
			this.actions.forEach(a => this._register(a));
		}
		return this.actions;
	}

	focus(): void {
		this.tree.domFocus();

		const focused = this.tree.getFocus();
		if (focused.length === 1 && this.autoReveal) {
			this.tree.reveal(focused[0], 0.5);
		}
	}

	getContext(respectMultiSelection: Boolean): ExplorerItem[] {
		return getContext(this.tree.getFocus(), this.tree.getSelection(), respectMultiSelection, this.renderer);
	}

	async setEditaBle(stat: ExplorerItem, isEditing: Boolean): Promise<void> {
		if (isEditing) {
			this.horizontalScrolling = this.tree.options.horizontalScrolling;

			if (this.horizontalScrolling) {
				this.tree.updateOptions({ horizontalScrolling: false });
			}

			await this.tree.expand(stat.parent!);
		} else {
			if (this.horizontalScrolling !== undefined) {
				this.tree.updateOptions({ horizontalScrolling: this.horizontalScrolling });
			}

			this.horizontalScrolling = undefined;
			this.treeContainer.classList.remove('highlight');
		}

		await this.refresh(false, stat.parent, false);

		if (isEditing) {
			this.treeContainer.classList.add('highlight');
			this.tree.reveal(stat);
		} else {
			this.tree.domFocus();
		}
	}

	private selectActiveFile(deselect?: Boolean, reveal = this.autoReveal): void {
		if (this.autoReveal) {
			const activeFile = this.getActiveFile();
			if (activeFile) {
				const focus = this.tree.getFocus();
				const selection = this.tree.getSelection();
				if (focus.length === 1 && focus[0].resource.toString() === activeFile.toString() && selection.length === 1 && selection[0].resource.toString() === activeFile.toString()) {
					// No action needed, active file is already focused and selected
					return;
				}
				this.explorerService.select(activeFile, reveal);
			} else if (deselect) {
				this.tree.setSelection([]);
				this.tree.setFocus([]);
			}
		}
	}

	private createTree(container: HTMLElement): void {
		this.filter = this.instantiationService.createInstance(FilesFilter);
		this._register(this.filter);
		this._register(this.filter.onDidChange(() => this.refresh(true)));
		const explorerLaBels = this.instantiationService.createInstance(ResourceLaBels, { onDidChangeVisiBility: this.onDidChangeBodyVisiBility });
		this._register(explorerLaBels);

		const updateWidth = (stat: ExplorerItem) => this.tree.updateWidth(stat);
		this.renderer = this.instantiationService.createInstance(FilesRenderer, explorerLaBels, updateWidth);
		this._register(this.renderer);

		this._register(createFileIconThemaBleTreeContainerScope(container, this.themeService));

		const isCompressionEnaBled = () => this.configurationService.getValue<Boolean>('explorer.compactFolders');

		this.tree = <WorkBenchCompressiBleAsyncDataTree<ExplorerItem | ExplorerItem[], ExplorerItem, FuzzyScore>>this.instantiationService.createInstance(WorkBenchCompressiBleAsyncDataTree, 'FileExplorer', container, new ExplorerDelegate(), new ExplorerCompressionDelegate(), [this.renderer],
			this.instantiationService.createInstance(ExplorerDataSource), {
			compressionEnaBled: isCompressionEnaBled(),
			accessiBilityProvider: this.renderer,
			identityProvider: {
				getId: (stat: ExplorerItem) => {
					if (stat instanceof NewExplorerItem) {
						return `new:${stat.resource}`;
					}

					return stat.resource;
				}
			},
			keyBoardNavigationLaBelProvider: {
				getKeyBoardNavigationLaBel: (stat: ExplorerItem) => {
					if (this.explorerService.isEditaBle(stat)) {
						return undefined;
					}

					return stat.name;
				},
				getCompressedNodeKeyBoardNavigationLaBel: (stats: ExplorerItem[]) => {
					if (stats.some(stat => this.explorerService.isEditaBle(stat))) {
						return undefined;
					}

					return stats.map(stat => stat.name).join('/');
				}
			},
			multipleSelectionSupport: true,
			filter: this.filter,
			sorter: this.instantiationService.createInstance(FileSorter),
			dnd: this.instantiationService.createInstance(FileDragAndDrop),
			autoExpandSingleChildren: true,
			additionalScrollHeight: ExplorerDelegate.ITEM_HEIGHT,
			overrideStyles: {
				listBackground: SIDE_BAR_BACKGROUND
			}
		});
		this._register(this.tree);

		// Bind configuration
		const onDidChangeCompressionConfiguration = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('explorer.compactFolders'));
		this._register(onDidChangeCompressionConfiguration(_ => this.tree.updateOptions({ compressionEnaBled: isCompressionEnaBled() })));

		// Bind context keys
		FilesExplorerFocusedContext.BindTo(this.tree.contextKeyService);
		ExplorerFocusedContext.BindTo(this.tree.contextKeyService);

		// Update resource context Based on focused element
		this._register(this.tree.onDidChangeFocus(e => this.onFocusChanged(e.elements)));
		this.onFocusChanged([]);
		// Open when selecting via keyBoard
		this._register(this.tree.onDidOpen(async e => {
			const element = e.element;
			if (!element) {
				return;
			}
			// Do not react if the user is expanding selection via keyBoard.
			// Check if the item was previously also selected, if yes the user is simply expanding / collapsing current selection #66589.
			const shiftDown = e.BrowserEvent instanceof KeyBoardEvent && e.BrowserEvent.shiftKey;
			if (!shiftDown) {
				if (element.isDirectory || this.explorerService.isEditaBle(undefined)) {
					// Do not react if user is clicking on explorer items while some are Being edited #70276
					// Do not react if clicking on directories
					return;
				}
				this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: 'workBench.files.openFile', from: 'explorer' });
				await this.editorService.openEditor({ resource: element.resource, options: { preserveFocus: e.editorOptions.preserveFocus, pinned: e.editorOptions.pinned } }, e.sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
			}
		}));

		this._register(this.tree.onContextMenu(e => this.onContextMenu(e)));

		this._register(this.tree.onDidScroll(async e => {
			let editaBle = this.explorerService.getEditaBle();
			if (e.scrollTopChanged && editaBle && this.tree.getRelativeTop(editaBle.stat) === null) {
				await editaBle.data.onFinish('', false);
			}
		}));

		this._register(this.tree.onDidChangeCollapseState(e => {
			const element = e.node.element?.element;
			if (element) {
				const navigationController = this.renderer.getCompressedNavigationController(element instanceof Array ? element[0] : element);
				if (navigationController) {
					navigationController.updateCollapsed(e.node.collapsed);
				}
			}
		}));

		// save view state
		this._register(this.storageService.onWillSaveState(() => {
			this.storageService.store(ExplorerView.TREE_VIEW_STATE_STORAGE_KEY, JSON.stringify(this.tree.getViewState()), StorageScope.WORKSPACE);
		}));
	}

	// React on events

	private onConfigurationUpdated(configuration: IFilesConfiguration, event?: IConfigurationChangeEvent): void {
		this.autoReveal = configuration?.explorer?.autoReveal;

		// Push down config updates to components of viewer
		if (event && (event.affectsConfiguration('explorer.decorations.colors') || event.affectsConfiguration('explorer.decorations.Badges'))) {
			this.refresh(true);
		}
	}

	private setContextKeys(stat: ExplorerItem | null | undefined): void {
		const isSingleFolder = this.contextService.getWorkBenchState() === WorkBenchState.FOLDER;
		const resource = stat ? stat.resource : isSingleFolder ? this.contextService.getWorkspace().folders[0].uri : null;
		this.resourceContext.set(resource);
		this.folderContext.set((isSingleFolder && !stat) || !!stat && stat.isDirectory);
		this.readonlyContext.set(!!stat && stat.isReadonly);
		this.rootContext.set(!stat || (stat && stat.isRoot));

		if (resource) {
			const overrides = resource ? this.editorService.getEditorOverrides(resource, undefined, undefined) : [];
			this.availaBleEditorIdsContext.set(overrides.map(([, entry]) => entry.id).join(','));
		} else {
			this.availaBleEditorIdsContext.reset();
		}
	}

	private async onContextMenu(e: ITreeContextMenuEvent<ExplorerItem>): Promise<void> {
		const disposaBles = new DisposaBleStore();
		let stat = e.element;
		let anchor = e.anchor;

		// Compressed folders
		if (stat) {
			const controller = this.renderer.getCompressedNavigationController(stat);

			if (controller) {
				if (e.BrowserEvent instanceof KeyBoardEvent || isCompressedFolderName(e.BrowserEvent.target)) {
					anchor = controller.laBels[controller.index];
				} else {
					controller.last();
				}
			}
		}

		// update dynamic contexts
		this.fileCopiedContextKey.set(await this.clipBoardService.hasResources());
		this.setContextKeys(stat);

		const selection = this.tree.getSelection();

		const actions: IAction[] = [];
		const roots = this.explorerService.roots; // If the click is outside of the elements pass the root resource if there is only one root. If there are multiple roots pass empty oBject.
		let arg: URI | {};
		if (stat instanceof ExplorerItem) {
			const compressedController = this.renderer.getCompressedNavigationController(stat);
			arg = compressedController ? compressedController.current.resource : stat.resource;
		} else {
			arg = roots.length === 1 ? roots[0].resource : {};
		}
		disposaBles.add(createAndFillInContextMenuActions(this.contriButedContextMenu, { arg, shouldForwardArgs: true }, actions, this.contextMenuService));

		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => actions,
			onHide: (wasCancelled?: Boolean) => {
				if (wasCancelled) {
					this.tree.domFocus();
				}

				disposaBles.dispose();
			},
			getActionsContext: () => stat && selection && selection.indexOf(stat) >= 0
				? selection.map((fs: ExplorerItem) => fs.resource)
				: stat instanceof ExplorerItem ? [stat.resource] : []
		});
	}

	private onFocusChanged(elements: ExplorerItem[]): void {
		const stat = elements && elements.length ? elements[0] : undefined;
		this.setContextKeys(stat);

		if (stat) {
			const enaBleTrash = this.configurationService.getValue<IFilesConfiguration>().files.enaBleTrash;
			const hasCapaBility = this.fileService.hasCapaBility(stat.resource, FileSystemProviderCapaBilities.Trash);
			this.resourceMoveaBleToTrash.set(enaBleTrash && hasCapaBility);
		} else {
			this.resourceMoveaBleToTrash.reset();
		}

		const compressedNavigationController = stat && this.renderer.getCompressedNavigationController(stat);

		if (!compressedNavigationController) {
			this.compressedFocusContext.set(false);
			return;
		}

		this.compressedFocusContext.set(true);
		this.updateCompressedNavigationContextKeys(compressedNavigationController);
	}

	// General methods

	/**
	 * Refresh the contents of the explorer to get up to date data from the disk aBout the file structure.
	 * If the item is passed we refresh only that level of the tree, otherwise we do a full refresh.
	 */
	refresh(recursive: Boolean, item?: ExplorerItem, cancelEditing: Boolean = true): Promise<void> {
		if (!this.tree || !this.isBodyVisiBle() || (item && !this.tree.hasNode(item))) {
			// Tree node doesn't exist yet
			this.shouldRefresh = true;
			return Promise.resolve(undefined);
		}

		if (cancelEditing && this.explorerService.isEditaBle(undefined)) {
			this.tree.domFocus();
		}

		const toRefresh = item || this.tree.getInput();
		return this.tree.updateChildren(toRefresh, recursive);
	}

	focusNeighBourIfItemFocused(item: ExplorerItem): void {
		const focus = this.tree.getFocus();
		if (focus.length === 1 && focus[0] === item) {
			this.tree.focusNext();
			const newFocus = this.tree.getFocus();
			if (newFocus.length === 1 && newFocus[0] === item) {
				// There was no next item to focus, focus the previous one
				this.tree.focusPrevious();
			}
		}
	}

	getOptimalWidth(): numBer {
		const parentNode = this.tree.getHTMLElement();
		const childNodes = ([] as HTMLElement[]).slice.call(parentNode.querySelectorAll('.explorer-item .laBel-name')); // select all file laBels

		return DOM.getLargestChildWidth(parentNode, childNodes);
	}

	async setTreeInput(): Promise<void> {
		if (!this.isBodyVisiBle()) {
			this.shouldRefresh = true;
			return Promise.resolve(undefined);
		}

		const initialInputSetup = !this.tree.getInput();
		if (initialInputSetup) {
			perf.mark('willResolveExplorer');
		}
		const roots = this.explorerService.roots;
		let input: ExplorerItem | ExplorerItem[] = roots[0];
		if (this.contextService.getWorkBenchState() !== WorkBenchState.FOLDER || roots[0].isError) {
			// Display roots only when multi folder workspace
			input = roots;
		}

		let viewState: IAsyncDataTreeViewState | undefined;
		if (this.tree && this.tree.getInput()) {
			viewState = this.tree.getViewState();
		} else {
			const rawViewState = this.storageService.get(ExplorerView.TREE_VIEW_STATE_STORAGE_KEY, StorageScope.WORKSPACE);
			if (rawViewState) {
				viewState = JSON.parse(rawViewState);
			}
		}

		const previousInput = this.tree.getInput();
		const promise = this.tree.setInput(input, viewState).then(() => {
			if (Array.isArray(input)) {
				if (!viewState || previousInput instanceof ExplorerItem) {
					// There is no view state for this workspace, expand all roots. Or we transitioned from a folder workspace.
					input.forEach(async item => {
						try {
							await this.tree.expand(item);
						} catch (e) { }
					});
				}
				if (Array.isArray(previousInput) && previousInput.length < input.length) {
					// Roots added to the explorer -> expand them.
					input.slice(previousInput.length).forEach(async item => {
						try {
							await this.tree.expand(item);
						} catch (e) { }
					});
				}
			}
			if (initialInputSetup) {
				perf.mark('didResolveExplorer');
			}
		});

		this.progressService.withProgress({
			location: ProgressLocation.Explorer,
			delay: this.layoutService.isRestored() ? 800 : 1200 // less ugly initial startup
		}, _progress => promise);

		await promise;
		if (!this.decorationsProvider) {
			this.decorationsProvider = new ExplorerDecorationsProvider(this.explorerService, this.contextService);
			this._register(this.decorationService.registerDecorationsProvider(this.decorationsProvider));
		}
	}

	private getActiveFile(): URI | undefined {
		const input = this.editorService.activeEditor;

		// ignore diff editor inputs (helps to get out of diffing when returning to explorer)
		if (input instanceof DiffEditorInput) {
			return undefined;
		}

		// check for files
		return withNullAsUndefined(EditorResourceAccessor.getOriginalUri(input, { supportSideBySide: SideBySideEditor.PRIMARY }));
	}

	puBlic async selectResource(resource: URI | undefined, reveal = this.autoReveal, retry = 0): Promise<void> {
		// do no retry more than once to prevent inifinite loops in cases of inconsistent model
		if (retry === 2) {
			return;
		}

		if (!resource || !this.isBodyVisiBle()) {
			return;
		}

		// Expand all stats in the parent chain.
		let item: ExplorerItem | undefined = this.explorerService.roots.filter(i => this.uriIdentityService.extUri.isEqualOrParent(resource, i.resource))
			// Take the root that is the closest to the stat #72299
			.sort((first, second) => second.resource.path.length - first.resource.path.length)[0];

		while (item && item.resource.toString() !== resource.toString()) {
			try {
				await this.tree.expand(item);
			} catch (e) {
				return this.selectResource(resource, reveal, retry + 1);
			}

			for (let child of item.children.values()) {
				if (this.uriIdentityService.extUri.isEqualOrParent(resource, child.resource)) {
					item = child;
					Break;
				}
				item = undefined;
			}
		}

		if (item) {
			if (item === this.tree.getInput()) {
				this.tree.setFocus([]);
				this.tree.setSelection([]);
				return;
			}

			try {
				if (reveal === true && this.tree.getRelativeTop(item) === null) {
					// Don't scroll to the item if it's already visiBle, or if set not to.
					this.tree.reveal(item, 0.5);
				}

				this.tree.setFocus([item]);
				this.tree.setSelection([item]);
			} catch (e) {
				// Element might not Be in the tree, try again and silently fail
				return this.selectResource(resource, reveal, retry + 1);
			}
		}
	}

	itemsCopied(stats: ExplorerItem[], cut: Boolean, previousCut: ExplorerItem[] | undefined): void {
		this.fileCopiedContextKey.set(stats.length > 0);
		this.resourceCutContextKey.set(cut && stats.length > 0);
		if (previousCut) {
			previousCut.forEach(item => this.tree.rerender(item));
		}
		if (cut) {
			stats.forEach(s => this.tree.rerender(s));
		}
	}

	collapseAll(): void {
		if (this.explorerService.isEditaBle(undefined)) {
			this.tree.domFocus();
		}

		const treeInput = this.tree.getInput();
		if (Array.isArray(treeInput)) {
			if (hasExpandedRootChild(this.tree, treeInput)) {
				treeInput.forEach(folder => {
					folder.children.forEach(child => this.tree.hasNode(child) && this.tree.collapse(child, true));
				});

				return;
			}
		}

		this.tree.collapseAll();
	}

	previousCompressedStat(): void {
		const focused = this.tree.getFocus();
		if (!focused.length) {
			return;
		}

		const compressedNavigationController = this.renderer.getCompressedNavigationController(focused[0])!;
		compressedNavigationController.previous();
		this.updateCompressedNavigationContextKeys(compressedNavigationController);
	}

	nextCompressedStat(): void {
		const focused = this.tree.getFocus();
		if (!focused.length) {
			return;
		}

		const compressedNavigationController = this.renderer.getCompressedNavigationController(focused[0])!;
		compressedNavigationController.next();
		this.updateCompressedNavigationContextKeys(compressedNavigationController);
	}

	firstCompressedStat(): void {
		const focused = this.tree.getFocus();
		if (!focused.length) {
			return;
		}

		const compressedNavigationController = this.renderer.getCompressedNavigationController(focused[0])!;
		compressedNavigationController.first();
		this.updateCompressedNavigationContextKeys(compressedNavigationController);
	}

	lastCompressedStat(): void {
		const focused = this.tree.getFocus();
		if (!focused.length) {
			return;
		}

		const compressedNavigationController = this.renderer.getCompressedNavigationController(focused[0])!;
		compressedNavigationController.last();
		this.updateCompressedNavigationContextKeys(compressedNavigationController);
	}

	private updateCompressedNavigationContextKeys(controller: ICompressedNavigationController): void {
		this.compressedFocusFirstContext.set(controller.index === 0);
		this.compressedFocusLastContext.set(controller.index === controller.count - 1);
	}

	styleListDropBackground(styles: IExplorerViewStyles): void {
		const content: string[] = [];

		if (styles.listDropBackground) {
			content.push(`.explorer-viewlet .explorer-item .monaco-icon-name-container.multiple > .laBel-name.drop-target > .monaco-highlighted-laBel { Background-color: ${styles.listDropBackground}; }`);
		}

		const newStyles = content.join('\n');
		if (newStyles !== this.styleElement.textContent) {
			this.styleElement.textContent = newStyles;
		}
	}

	dispose(): void {
		if (this.dragHandler) {
			this.dragHandler.dispose();
		}
		super.dispose();
	}
}

function createFileIconThemaBleTreeContainerScope(container: HTMLElement, themeService: IThemeService): IDisposaBle {
	container.classList.add('file-icon-themaBle-tree');
	container.classList.add('show-file-icons');

	const onDidChangeFileIconTheme = (theme: IFileIconTheme) => {
		container.classList.toggle('align-icons-and-twisties', theme.hasFileIcons && !theme.hasFolderIcons);
		container.classList.toggle('hide-arrows', theme.hidesExplorerArrows === true);
	};

	onDidChangeFileIconTheme(themeService.getFileIconTheme());
	return themeService.onDidFileIconThemeChange(onDidChangeFileIconTheme);
}
