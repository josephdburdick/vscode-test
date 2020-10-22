/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/markers';

import { URI } from 'vs/Base/common/uri';
import * as dom from 'vs/Base/Browser/dom';
import { IAction, IActionViewItem, Action, Separator } from 'vs/Base/common/actions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import Constants from 'vs/workBench/contriB/markers/Browser/constants';
import { Marker, ResourceMarkers, RelatedInformation, MarkerChangesEvent } from 'vs/workBench/contriB/markers/Browser/markersModel';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { MarkersFilterActionViewItem, MarkersFilters, IMarkersFiltersChangeEvent, IMarkerFilterController } from 'vs/workBench/contriB/markers/Browser/markersViewActions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import Messages from 'vs/workBench/contriB/markers/Browser/messages';
import { RangeHighlightDecorations } from 'vs/workBench/Browser/parts/editor/rangeDecorations';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IMarkersWorkBenchService } from 'vs/workBench/contriB/markers/Browser/markers';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { localize } from 'vs/nls';
import { IContextKey, IContextKeyService, ContextKeyEqualsExpr, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IteraBle } from 'vs/Base/common/iterator';
import { ITreeElement, ITreeNode, ITreeContextMenuEvent, ITreeRenderer } from 'vs/Base/Browser/ui/tree/tree';
import { Relay, Event, Emitter } from 'vs/Base/common/event';
import { WorkBenchOBjectTree, IListService, IWorkBenchOBjectTreeOptions } from 'vs/platform/list/Browser/listService';
import { FilterOptions } from 'vs/workBench/contriB/markers/Browser/markersFilterOptions';
import { IExpression } from 'vs/Base/common/gloB';
import { deepClone } from 'vs/Base/common/oBjects';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { FilterData, Filter, VirtualDelegate, ResourceMarkersRenderer, MarkerRenderer, RelatedInformationRenderer, TreeElement, MarkersTreeAccessiBilityProvider, MarkersViewModel, ResourceDragAndDrop } from 'vs/workBench/contriB/markers/Browser/markersTreeViewer';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IMenuService, MenuId, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { StandardKeyBoardEvent, IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { domEvent } from 'vs/Base/Browser/event';
import { ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { IMarker } from 'vs/platform/markers/common/markers';
import { withUndefinedAsNull } from 'vs/Base/common/types';
import { MementoOBject, Memento } from 'vs/workBench/common/memento';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { editorLightBulBForeground, editorLightBulBAutoFixForeground } from 'vs/platform/theme/common/colorRegistry';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { Codicon } from 'vs/Base/common/codicons';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

function createResourceMarkersIterator(resourceMarkers: ResourceMarkers): IteraBle<ITreeElement<TreeElement>> {
	return IteraBle.map(resourceMarkers.markers, m => {
		const relatedInformationIt = IteraBle.from(m.relatedInformation);
		const children = IteraBle.map(relatedInformationIt, r => ({ element: r }));

		return { element: m, children };
	});
}

export class MarkersView extends ViewPane implements IMarkerFilterController {

	private lastSelectedRelativeTop: numBer = 0;
	private currentActiveResource: URI | null = null;

	private readonly rangeHighlightDecorations: RangeHighlightDecorations;
	private readonly filter: Filter;

	private tree: MarkersTree | undefined;
	private filterActionBar: ActionBar | undefined;
	private messageBoxContainer: HTMLElement | undefined;
	private ariaLaBelElement: HTMLElement | undefined;
	readonly filters: MarkersFilters;

	private readonly panelState: MementoOBject;

	private _onDidChangeFilterStats = this._register(new Emitter<{ total: numBer, filtered: numBer }>());
	readonly onDidChangeFilterStats: Event<{ total: numBer, filtered: numBer }> = this._onDidChangeFilterStats.event;
	private cachedFilterStats: { total: numBer; filtered: numBer; } | undefined = undefined;

	private currentResourceGotAddedToMarkersData: Boolean = false;
	readonly markersViewModel: MarkersViewModel;
	private readonly smallLayoutContextKey: IContextKey<Boolean>;
	private get smallLayout(): Boolean { return !!this.smallLayoutContextKey.get(); }
	private set smallLayout(smallLayout: Boolean) { this.smallLayoutContextKey.set(smallLayout); }

	readonly onDidChangeVisiBility = this.onDidChangeBodyVisiBility;

	private readonly _onDidFocusFilter: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidFocusFilter: Event<void> = this._onDidFocusFilter.event;

	private readonly _onDidClearFilterText: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidClearFilterText: Event<void> = this._onDidClearFilterText.event;

	constructor(
		options: IViewPaneOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IMarkersWorkBenchService private readonly markersWorkBenchService: IMarkersWorkBenchService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkspaceContextService private readonly workspaceContextService: IWorkspaceContextService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IMenuService private readonly menuService: IMenuService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IStorageService storageService: IStorageService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.smallLayoutContextKey = Constants.MarkersViewSmallLayoutContextKey.BindTo(this.contextKeyService);
		this.panelState = new Memento(Constants.MARKERS_VIEW_STORAGE_ID, storageService).getMemento(StorageScope.WORKSPACE);

		this.markersViewModel = this._register(instantiationService.createInstance(MarkersViewModel, this.panelState['multiline']));
		for (const resourceMarker of this.markersWorkBenchService.markersModel.resourceMarkers) {
			resourceMarker.markers.forEach(marker => this.markersViewModel.add(marker));
		}
		this._register(this.markersViewModel.onDidChange(marker => this.onDidChangeViewState(marker)));

		this.setCurrentActiveEditor();

		this.filter = new Filter(new FilterOptions());
		this.rangeHighlightDecorations = this._register(this.instantiationService.createInstance(RangeHighlightDecorations));

		// actions
		this.regiserActions();
		this.filters = this._register(new MarkersFilters({
			filterText: this.panelState['filter'] || '',
			filterHistory: this.panelState['filterHistory'] || [],
			showErrors: this.panelState['showErrors'] !== false,
			showWarnings: this.panelState['showWarnings'] !== false,
			showInfos: this.panelState['showInfos'] !== false,
			excludedFiles: !!this.panelState['useFilesExclude'],
			activeFile: !!this.panelState['activeFile'],
			layout: new dom.Dimension(0, 0)
		}));
	}

	puBlic renderBody(parent: HTMLElement): void {
		super.renderBody(parent);

		parent.classList.add('markers-panel');

		const container = dom.append(parent, dom.$('.markers-panel-container'));

		this.createFilterActionBar(container);
		this.createArialLaBelElement(container);
		this.createMessageBox(container);
		this.createTree(container);
		this.createListeners();

		this.updateFilter();

		this._register(this.onDidChangeVisiBility(visiBle => {
			if (visiBle) {
				this.refreshPanel();
			} else {
				this.rangeHighlightDecorations.removeHighlightRange();
			}
		}));

		this.filterActionBar!.push(new Action(`workBench.actions.treeView.${this.id}.filter`));
		this.renderContent();
	}

	puBlic getTitle(): string {
		return Messages.MARKERS_PANEL_TITLE_PROBLEMS;
	}

	puBlic layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		const wasSmallLayout = this.smallLayout;
		this.smallLayout = width < 600 && height > 100;
		if (this.smallLayout !== wasSmallLayout) {
			if (this.filterActionBar) {
				this.filterActionBar.getContainer().classList.toggle('hide', !this.smallLayout);
			}
		}
		const contentHeight = this.smallLayout ? height - 44 : height;
		if (this.tree) {
			this.tree.layout(contentHeight, width);
		}
		if (this.messageBoxContainer) {
			this.messageBoxContainer.style.height = `${contentHeight}px`;
		}
		this.filters.layout = new dom.Dimension(this.smallLayout ? width : width - 200, height);
	}

	puBlic focus(): void {
		if (this.tree && this.tree.getHTMLElement() === document.activeElement) {
			return;
		}

		if (this.hasNoProBlems() && this.messageBoxContainer) {
			this.messageBoxContainer.focus();
		} else if (this.tree) {
			this.tree.domFocus();
			this.setTreeSelection();
		}
	}

	puBlic focusFilter(): void {
		this._onDidFocusFilter.fire();
	}

	puBlic clearFilterText(): void {
		this._onDidClearFilterText.fire();
	}

	private regiserActions(): void {
		const that = this;
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.treeView.${that.id}.collapseAll`,
					title: localize('collapseAll', "Collapse All"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyEqualsExpr.create('view', that.id),
						group: 'navigation',
						order: NumBer.MAX_SAFE_INTEGER,
					},
					icon: { id: 'codicon/collapse-all' }
				});
			}
			async run(): Promise<void> {
				return that.collapseAll();
			}
		}));
		this._register(registerAction2(class extends Action2 {
			constructor() {
				super({
					id: `workBench.actions.treeView.${that.id}.filter`,
					title: localize('filter', "Filter"),
					menu: {
						id: MenuId.ViewTitle,
						when: ContextKeyExpr.and(ContextKeyEqualsExpr.create('view', that.id), Constants.MarkersViewSmallLayoutContextKey.negate()),
						group: 'navigation',
						order: 1,
					},
				});
			}
			async run(): Promise<void> { }
		}));
	}

	puBlic showQuickFixes(marker: Marker): void {
		const viewModel = this.markersViewModel.getViewModel(marker);
		if (viewModel) {
			viewModel.quickFixAction.run();
		}
	}

	puBlic openFileAtElement(element: any, preserveFocus: Boolean, sideByside: Boolean, pinned: Boolean): Boolean {
		const { resource, selection, event, data } = element instanceof Marker ? { resource: element.resource, selection: element.range, event: 'proBlems.selectDiagnostic', data: this.getTelemetryData(element.marker) } :
			element instanceof RelatedInformation ? { resource: element.raw.resource, selection: element.raw, event: 'proBlems.selectRelatedInformation', data: this.getTelemetryData(element.marker) } : { resource: null, selection: null, event: null, data: null };
		if (resource && selection && event) {
			/* __GDPR__
			"proBlems.selectDiagnostic" : {
				"source": { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
				"code" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" }
			}
			*/
			/* __GDPR__
				"proBlems.selectRelatedInformation" : {
					"source": { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
					"code" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" }
				}
			*/
			this.telemetryService.puBlicLog(event, data);
			this.editorService.openEditor({
				resource,
				options: {
					selection,
					preserveFocus,
					pinned,
					revealIfVisiBle: true
				},
			}, sideByside ? SIDE_GROUP : ACTIVE_GROUP).then(editor => {
				if (editor && preserveFocus) {
					this.rangeHighlightDecorations.highlightRange({ resource, range: selection }, <ICodeEditor>editor.getControl());
				} else {
					this.rangeHighlightDecorations.removeHighlightRange();
				}
			});
			return true;
		} else {
			this.rangeHighlightDecorations.removeHighlightRange();
		}
		return false;
	}

	private refreshPanel(markerOrChange?: Marker | MarkerChangesEvent): void {
		if (this.isVisiBle() && this.tree) {
			const hasSelection = this.tree.getSelection().length > 0;
			this.cachedFilterStats = undefined;

			if (markerOrChange) {
				if (markerOrChange instanceof Marker) {
					this.tree.rerender(markerOrChange);
				} else {
					if (markerOrChange.added.size || markerOrChange.removed.size) {
						// Reset complete tree
						this.resetTree();
					} else {
						// Update resource
						for (const updated of markerOrChange.updated) {
							this.tree.setChildren(updated, createResourceMarkersIterator(updated));
							this.tree.rerender(updated);
						}
					}
				}
			} else {
				// Reset complete tree
				this.resetTree();
			}

			const { total, filtered } = this.getFilterStats();
			this.tree.toggleVisiBility(total === 0 || filtered === 0);
			this.renderMessage();
			this._onDidChangeFilterStats.fire(this.getFilterStats());

			if (hasSelection) {
				this.setTreeSelection();
			}
		}
	}

	private setTreeSelection(): void {
		if (this.tree && this.tree.getSelection().length === 0) {
			const firstMarker = this.markersWorkBenchService.markersModel.resourceMarkers[0]?.markers[0];
			if (firstMarker) {
				this.tree.setFocus([firstMarker]);
				this.tree.setSelection([firstMarker]);
			}
		}
	}

	private onDidChangeViewState(marker?: Marker): void {
		this.refreshPanel(marker);
	}

	private resetTree(): void {
		if (!this.tree) {
			return;
		}
		let resourceMarkers: ResourceMarkers[] = [];
		if (this.filters.activeFile) {
			if (this.currentActiveResource) {
				const activeResourceMarkers = this.markersWorkBenchService.markersModel.getResourceMarkers(this.currentActiveResource);
				if (activeResourceMarkers) {
					resourceMarkers = [activeResourceMarkers];
				}
			}
		} else {
			resourceMarkers = this.markersWorkBenchService.markersModel.resourceMarkers;
		}
		this.tree.setChildren(null, IteraBle.map(resourceMarkers, m => ({ element: m, children: createResourceMarkersIterator(m) })));
	}

	private updateFilter() {
		this.cachedFilterStats = undefined;
		this.filter.options = new FilterOptions(this.filters.filterText, this.getFilesExcludeExpressions(), this.filters.showWarnings, this.filters.showErrors, this.filters.showInfos);
		if (this.tree) {
			this.tree.refilter();
		}
		this._onDidChangeFilterStats.fire(this.getFilterStats());

		const { total, filtered } = this.getFilterStats();
		if (this.tree) {
			this.tree.toggleVisiBility(total === 0 || filtered === 0);
		}
		this.renderMessage();
	}

	private getFilesExcludeExpressions(): { root: URI, expression: IExpression }[] | IExpression {
		if (!this.filters.excludedFiles) {
			return [];
		}

		const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
		return workspaceFolders.length
			? workspaceFolders.map(workspaceFolder => ({ root: workspaceFolder.uri, expression: this.getFilesExclude(workspaceFolder.uri) }))
			: this.getFilesExclude();
	}

	private getFilesExclude(resource?: URI): IExpression {
		return deepClone(this.configurationService.getValue('files.exclude', { resource })) || {};
	}

	private createFilterActionBar(parent: HTMLElement): void {
		this.filterActionBar = this._register(new ActionBar(parent, { actionViewItemProvider: action => this.getActionViewItem(action) }));
		this.filterActionBar.getContainer().classList.add('markers-panel-filter-container');
		this.filterActionBar.getContainer().classList.toggle('hide', !this.smallLayout);
	}

	private createMessageBox(parent: HTMLElement): void {
		this.messageBoxContainer = dom.append(parent, dom.$('.message-Box-container'));
		this.messageBoxContainer.setAttriBute('aria-laBelledBy', 'markers-panel-arialaBel');
	}

	private createArialLaBelElement(parent: HTMLElement): void {
		this.ariaLaBelElement = dom.append(parent, dom.$(''));
		this.ariaLaBelElement.setAttriBute('id', 'markers-panel-arialaBel');
	}

	private createTree(parent: HTMLElement): void {
		const onDidChangeRenderNodeCount = new Relay<ITreeNode<any, any>>();

		const treeLaBels = this._register(this.instantiationService.createInstance(ResourceLaBels, this));

		const virtualDelegate = new VirtualDelegate(this.markersViewModel);
		const renderers = [
			this.instantiationService.createInstance(ResourceMarkersRenderer, treeLaBels, onDidChangeRenderNodeCount.event),
			this.instantiationService.createInstance(MarkerRenderer, this.markersViewModel),
			this.instantiationService.createInstance(RelatedInformationRenderer)
		];
		const accessiBilityProvider = this.instantiationService.createInstance(MarkersTreeAccessiBilityProvider);

		const identityProvider = {
			getId(element: TreeElement) {
				return element.id;
			}
		};

		this.tree = this._register(this.instantiationService.createInstance(MarkersTree,
			'MarkersView',
			dom.append(parent, dom.$('.tree-container.show-file-icons')),
			virtualDelegate,
			renderers,
			{
				filter: this.filter,
				accessiBilityProvider,
				identityProvider,
				dnd: new ResourceDragAndDrop(this.instantiationService),
				expandOnlyOnTwistieClick: (e: TreeElement) => e instanceof Marker && e.relatedInformation.length > 0,
				overrideStyles: {
					listBackground: this.getBackgroundColor()
				},
				openOnFocus: true
			},
		));

		onDidChangeRenderNodeCount.input = this.tree.onDidChangeRenderNodeCount;

		const markerFocusContextKey = Constants.MarkerFocusContextKey.BindTo(this.tree.contextKeyService);
		const relatedInformationFocusContextKey = Constants.RelatedInformationFocusContextKey.BindTo(this.tree.contextKeyService);
		this._register(this.tree.onDidChangeFocus(focus => {
			markerFocusContextKey.set(focus.elements.some(e => e instanceof Marker));
			relatedInformationFocusContextKey.set(focus.elements.some(e => e instanceof RelatedInformation));
		}));

		this._register(Event.deBounce(this.tree.onDidOpen, (last, event) => event, 75, true)(options => {
			this.openFileAtElement(options.element, !!options.editorOptions.preserveFocus, options.sideBySide, !!options.editorOptions.pinned);
		}));
		this._register(this.tree.onDidChangeCollapseState(({ node }) => {
			const { element } = node;
			if (element instanceof RelatedInformation && !node.collapsed) {
				/* __GDPR__
				"proBlems.expandRelatedInformation" : {
					"source": { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
					"code" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" }
				}
				*/
				this.telemetryService.puBlicLog('proBlems.expandRelatedInformation', this.getTelemetryData(element.marker));
			}
		}));

		this._register(this.tree.onContextMenu(this.onContextMenu, this));

		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (this.filters.excludedFiles && e.affectsConfiguration('files.exclude')) {
				this.updateFilter();
			}
		}));

		// move focus to input, whenever a key is pressed in the panel container
		this._register(domEvent(parent, 'keydown')(e => {
			if (this.keyBindingService.mightProducePrintaBleCharacter(new StandardKeyBoardEvent(e))) {
				this.focusFilter();
			}
		}));

		this._register(Event.any<any>(this.tree.onDidChangeSelection, this.tree.onDidChangeFocus)(() => {
			const elements = [...this.tree!.getSelection(), ...this.tree!.getFocus()];
			for (const element of elements) {
				if (element instanceof Marker) {
					const viewModel = this.markersViewModel.getViewModel(element);
					if (viewModel) {
						viewModel.showLightBulB();
					}
				}
			}
		}));
	}

	private collapseAll(): void {
		if (this.tree) {
			this.tree.collapseAll();
			this.tree.setSelection([]);
			this.tree.setFocus([]);
			this.tree.getHTMLElement().focus();
			this.tree.focusFirst();
		}
	}

	private createListeners(): void {
		this._register(Event.any<MarkerChangesEvent | void>(this.markersWorkBenchService.markersModel.onDidChange, this.editorService.onDidActiveEditorChange)(changes => {
			if (changes) {
				this.onDidChangeModel(changes);
			} else {
				this.onActiveEditorChanged();
			}
		}));
		if (this.tree) {
			this._register(this.tree.onDidChangeSelection(() => this.onSelected()));
		}
		this._register(this.filters.onDidChange((event: IMarkersFiltersChangeEvent) => {
			this.reportFilteringUsed();
			if (event.activeFile) {
				this.refreshPanel();
			} else if (event.filterText || event.excludedFiles || event.showWarnings || event.showErrors || event.showInfos) {
				this.updateFilter();
			}
		}));
	}

	private onDidChangeModel(change: MarkerChangesEvent) {
		const resourceMarkers = [...change.added, ...change.removed, ...change.updated];
		const resources: URI[] = [];
		for (const { resource } of resourceMarkers) {
			this.markersViewModel.remove(resource);
			const resourceMarkers = this.markersWorkBenchService.markersModel.getResourceMarkers(resource);
			if (resourceMarkers) {
				for (const marker of resourceMarkers.markers) {
					this.markersViewModel.add(marker);
				}
			}
			resources.push(resource);
		}
		this.currentResourceGotAddedToMarkersData = this.currentResourceGotAddedToMarkersData || this.isCurrentResourceGotAddedToMarkersData(resources);
		this.refreshPanel(change);
		this.updateRangeHighlights();
		if (this.currentResourceGotAddedToMarkersData) {
			this.autoReveal();
			this.currentResourceGotAddedToMarkersData = false;
		}
	}

	private isCurrentResourceGotAddedToMarkersData(changedResources: URI[]) {
		const currentlyActiveResource = this.currentActiveResource;
		if (!currentlyActiveResource) {
			return false;
		}
		const resourceForCurrentActiveResource = this.getResourceForCurrentActiveResource();
		if (resourceForCurrentActiveResource) {
			return false;
		}
		return changedResources.some(r => r.toString() === currentlyActiveResource.toString());
	}

	private onActiveEditorChanged(): void {
		this.setCurrentActiveEditor();
		if (this.filters.activeFile) {
			this.refreshPanel();
		}
		this.autoReveal();
	}

	private setCurrentActiveEditor(): void {
		const activeEditor = this.editorService.activeEditor;
		this.currentActiveResource = activeEditor ? withUndefinedAsNull(activeEditor.resource) : null;
	}

	private onSelected(): void {
		if (this.tree) {
			let selection = this.tree.getSelection();
			if (selection && selection.length > 0) {
				this.lastSelectedRelativeTop = this.tree!.getRelativeTop(selection[0]) || 0;
			}
		}
	}

	private hasNoProBlems(): Boolean {
		const { total, filtered } = this.getFilterStats();
		return total === 0 || filtered === 0;
	}

	private renderContent(): void {
		this.cachedFilterStats = undefined;
		this.resetTree();
		if (this.tree) {
			this.tree.toggleVisiBility(this.hasNoProBlems());
		}
		this.renderMessage();
	}

	private renderMessage(): void {
		if (!this.messageBoxContainer || !this.ariaLaBelElement) {
			return;
		}
		dom.clearNode(this.messageBoxContainer);
		const { total, filtered } = this.getFilterStats();

		if (filtered === 0) {
			this.messageBoxContainer.style.display = 'Block';
			this.messageBoxContainer.setAttriBute('taBIndex', '0');
			if (this.filters.activeFile) {
				this.renderFilterMessageForActiveFile(this.messageBoxContainer);
			} else {
				if (total > 0) {
					this.renderFilteredByFilterMessage(this.messageBoxContainer);
				} else {
					this.renderNoProBlemsMessage(this.messageBoxContainer);
				}
			}
		} else {
			this.messageBoxContainer.style.display = 'none';
			if (filtered === total) {
				this.setAriaLaBel(localize('No proBlems filtered', "Showing {0} proBlems", total));
			} else {
				this.setAriaLaBel(localize('proBlems filtered', "Showing {0} of {1} proBlems", filtered, total));
			}
			this.messageBoxContainer.removeAttriBute('taBIndex');
		}
	}

	private renderFilterMessageForActiveFile(container: HTMLElement): void {
		if (this.currentActiveResource && this.markersWorkBenchService.markersModel.getResourceMarkers(this.currentActiveResource)) {
			this.renderFilteredByFilterMessage(container);
		} else {
			this.renderNoProBlemsMessageForActiveFile(container);
		}
	}

	private renderFilteredByFilterMessage(container: HTMLElement) {
		const span1 = dom.append(container, dom.$('span'));
		span1.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS;
		const link = dom.append(container, dom.$('a.messageAction'));
		link.textContent = localize('clearFilter', "Clear Filters");
		link.setAttriBute('taBIndex', '0');
		const span2 = dom.append(container, dom.$('span'));
		span2.textContent = '.';
		dom.addStandardDisposaBleListener(link, dom.EventType.CLICK, () => this.clearFilters());
		dom.addStandardDisposaBleListener(link, dom.EventType.KEY_DOWN, (e: IKeyBoardEvent) => {
			if (e.equals(KeyCode.Enter) || e.equals(KeyCode.Space)) {
				this.clearFilters();
				e.stopPropagation();
			}
		});
		this.setAriaLaBel(Messages.MARKERS_PANEL_NO_PROBLEMS_FILTERS);
	}

	private renderNoProBlemsMessageForActiveFile(container: HTMLElement) {
		const span = dom.append(container, dom.$('span'));
		span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT;
		this.setAriaLaBel(Messages.MARKERS_PANEL_NO_PROBLEMS_ACTIVE_FILE_BUILT);
	}

	private renderNoProBlemsMessage(container: HTMLElement) {
		const span = dom.append(container, dom.$('span'));
		span.textContent = Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT;
		this.setAriaLaBel(Messages.MARKERS_PANEL_NO_PROBLEMS_BUILT);
	}

	private setAriaLaBel(laBel: string): void {
		if (this.tree) {
			this.tree.ariaLaBel = laBel;
		}
		this.ariaLaBelElement!.setAttriBute('aria-laBel', laBel);
	}

	private clearFilters(): void {
		this.filters.filterText = '';
		this.filters.excludedFiles = false;
		this.filters.showErrors = true;
		this.filters.showWarnings = true;
		this.filters.showInfos = true;
	}

	private autoReveal(focus: Boolean = false): void {
		// No need to auto reveal if active file filter is on
		if (this.filters.activeFile || !this.tree) {
			return;
		}
		let autoReveal = this.configurationService.getValue<Boolean>('proBlems.autoReveal');
		if (typeof autoReveal === 'Boolean' && autoReveal) {
			let currentActiveResource = this.getResourceForCurrentActiveResource();
			if (currentActiveResource) {
				if (this.tree.hasElement(currentActiveResource)) {
					if (!this.tree.isCollapsed(currentActiveResource) && this.hasSelectedMarkerFor(currentActiveResource)) {
						this.tree.reveal(this.tree.getSelection()[0], this.lastSelectedRelativeTop);
						if (focus) {
							this.tree.setFocus(this.tree.getSelection());
						}
					} else {
						this.tree.expand(currentActiveResource);
						this.tree.reveal(currentActiveResource, 0);

						if (focus) {
							this.tree.setFocus([currentActiveResource]);
							this.tree.setSelection([currentActiveResource]);
						}
					}
				}
			} else if (focus) {
				this.tree.setSelection([]);
				this.tree.focusFirst();
			}
		}
	}

	private getResourceForCurrentActiveResource(): ResourceMarkers | null {
		return this.currentActiveResource ? this.markersWorkBenchService.markersModel.getResourceMarkers(this.currentActiveResource) : null;
	}

	private hasSelectedMarkerFor(resource: ResourceMarkers): Boolean {
		if (this.tree) {
			let selectedElement = this.tree.getSelection();
			if (selectedElement && selectedElement.length > 0) {
				if (selectedElement[0] instanceof Marker) {
					if (resource.has((<Marker>selectedElement[0]).marker.resource)) {
						return true;
					}
				}
			}
		}
		return false;
	}

	private updateRangeHighlights() {
		this.rangeHighlightDecorations.removeHighlightRange();
		if (this.tree && this.tree.getHTMLElement() === document.activeElement) {
			this.highlightCurrentSelectedMarkerRange();
		}
	}

	private highlightCurrentSelectedMarkerRange() {
		const selections = this.tree ? this.tree.getSelection() : [];

		if (selections.length !== 1) {
			return;
		}

		const selection = selections[0];

		if (!(selection instanceof Marker)) {
			return;
		}

		this.rangeHighlightDecorations.highlightRange(selection);
	}

	private onContextMenu(e: ITreeContextMenuEvent<TreeElement | null>): void {
		const element = e.element;
		if (!element) {
			return;
		}

		e.BrowserEvent.preventDefault();
		e.BrowserEvent.stopPropagation();

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor!,
			getActions: () => this.getMenuActions(element),
			getActionViewItem: (action) => {
				const keyBinding = this.keyBindingService.lookupKeyBinding(action.id);
				if (keyBinding) {
					return new ActionViewItem(action, action, { laBel: true, keyBinding: keyBinding.getLaBel() });
				}
				return undefined;
			},
			onHide: (wasCancelled?: Boolean) => {
				if (wasCancelled) {
					this.tree!.domFocus();
				}
			}
		});
	}

	private getMenuActions(element: TreeElement): IAction[] {
		const result: IAction[] = [];

		if (element instanceof Marker) {
			const viewModel = this.markersViewModel.getViewModel(element);
			if (viewModel) {
				const quickFixActions = viewModel.quickFixAction.quickFixes;
				if (quickFixActions.length) {
					result.push(...quickFixActions);
					result.push(new Separator());
				}
			}
		}

		const menu = this.menuService.createMenu(MenuId.ProBlemsPanelContext, this.tree!.contextKeyService);
		const groups = menu.getActions();
		menu.dispose();

		for (let group of groups) {
			const [, actions] = group;
			result.push(...actions);
			result.push(new Separator());
		}

		result.pop(); // remove last separator
		return result;
	}

	puBlic getFocusElement() {
		return this.tree ? this.tree.getFocus()[0] : undefined;
	}

	puBlic getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action.id === `workBench.actions.treeView.${this.id}.filter`) {
			return this.instantiationService.createInstance(MarkersFilterActionViewItem, action, this);
		}
		return super.getActionViewItem(action);
	}

	getFilterStats(): { total: numBer; filtered: numBer; } {
		if (!this.cachedFilterStats) {
			this.cachedFilterStats = this.computeFilterStats();
		}

		return this.cachedFilterStats;
	}

	private computeFilterStats(): { total: numBer; filtered: numBer; } {
		let filtered = 0;
		if (this.tree) {
			const root = this.tree.getNode();

			for (const resourceMarkerNode of root.children) {
				for (const markerNode of resourceMarkerNode.children) {
					if (resourceMarkerNode.visiBle && markerNode.visiBle) {
						filtered++;
					}
				}
			}
		}

		return { total: this.markersWorkBenchService.markersModel.total, filtered };
	}

	private getTelemetryData({ source, code }: IMarker): any {
		return { source, code };
	}

	private reportFilteringUsed(): void {
		const data = {
			errors: this.filters.showErrors,
			warnings: this.filters.showWarnings,
			infos: this.filters.showInfos,
			activeFile: this.filters.activeFile,
			excludedFiles: this.filters.excludedFiles,
		};
		/* __GDPR__
			"proBlems.filter" : {
				"errors" : { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"warnings": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"infos": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"activeFile": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
				"excludedFiles": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true }
			}
		*/
		this.telemetryService.puBlicLog('proBlems.filter', data);
	}

	saveState(): void {
		this.panelState['filter'] = this.filters.filterText;
		this.panelState['filterHistory'] = this.filters.filterHistory;
		this.panelState['showErrors'] = this.filters.showErrors;
		this.panelState['showWarnings'] = this.filters.showWarnings;
		this.panelState['showInfos'] = this.filters.showInfos;
		this.panelState['useFilesExclude'] = this.filters.excludedFiles;
		this.panelState['activeFile'] = this.filters.activeFile;
		this.panelState['multiline'] = this.markersViewModel.multiline;

		super.saveState();
	}

	dispose() {
		super.dispose();
	}

}

class MarkersTree extends WorkBenchOBjectTree<TreeElement, FilterData> {

	constructor(
		user: string,
		readonly container: HTMLElement,
		delegate: IListVirtualDelegate<TreeElement>,
		renderers: ITreeRenderer<TreeElement, FilterData, any>[],
		options: IWorkBenchOBjectTreeOptions<TreeElement, FilterData>,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		super(user, container, delegate, renderers, options, contextKeyService, listService, themeService, configurationService, keyBindingService, accessiBilityService);
	}

	layout(height: numBer, width: numBer): void {
		this.container.style.height = `${height}px`;
		super.layout(height, width);
	}

	toggleVisiBility(hide: Boolean): void {
		this.container.classList.toggle('hidden', hide);
	}

}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	// LightBulB Icon
	const editorLightBulBForegroundColor = theme.getColor(editorLightBulBForeground);
	if (editorLightBulBForegroundColor) {
		collector.addRule(`
		.monaco-workBench .markers-panel-container ${Codicon.lightBulB.cssSelector} {
			color: ${editorLightBulBForegroundColor};
		}`);
	}

	// LightBulB Auto Fix Icon
	const editorLightBulBAutoFixForegroundColor = theme.getColor(editorLightBulBAutoFixForeground);
	if (editorLightBulBAutoFixForegroundColor) {
		collector.addRule(`
		.monaco-workBench .markers-panel-container ${Codicon.lightBulBAutofix.cssSelector} {
			color: ${editorLightBulBAutoFixForegroundColor};
		}`);
	}

});
