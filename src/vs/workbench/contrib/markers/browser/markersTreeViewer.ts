/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import * as network from 'vs/Base/common/network';
import * as paths from 'vs/Base/common/path';
import { CountBadge } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { ResourceLaBels, IResourceLaBel } from 'vs/workBench/Browser/laBels';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IMarker, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { ResourceMarkers, Marker, RelatedInformation } from 'vs/workBench/contriB/markers/Browser/markersModel';
import Messages from 'vs/workBench/contriB/markers/Browser/messages';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { attachBadgeStyler } from 'vs/platform/theme/common/styler';
import { IThemeService, registerThemingParticipant } from 'vs/platform/theme/common/themeService';
import { IDisposaBle, dispose, DisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { QuickFixAction, QuickFixActionViewItem } from 'vs/workBench/contriB/markers/Browser/markersViewActions';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { dirname, Basename, isEqual } from 'vs/Base/common/resources';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { ITreeFilter, TreeVisiBility, TreeFilterResult, ITreeRenderer, ITreeNode, ITreeDragAndDrop, ITreeDragOverReaction } from 'vs/Base/Browser/ui/tree/tree';
import { FilterOptions } from 'vs/workBench/contriB/markers/Browser/markersFilterOptions';
import { IMatch } from 'vs/Base/common/filters';
import { Event, Emitter } from 'vs/Base/common/event';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { isUndefinedOrNull } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { Action, IAction } from 'vs/Base/common/actions';
import { localize } from 'vs/nls';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';
import { ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { fillResourceDataTransfers } from 'vs/workBench/Browser/dnd';
import { CancelaBlePromise, createCancelaBlePromise, Delayer } from 'vs/Base/common/async';
import { IModelService } from 'vs/editor/common/services/modelService';
import { Range } from 'vs/editor/common/core/range';
import { getCodeActions, CodeActionSet } from 'vs/editor/contriB/codeAction/codeAction';
import { CodeActionKind } from 'vs/editor/contriB/codeAction/types';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorService, ACTIVE_GROUP } from 'vs/workBench/services/editor/common/editorService';
import { applyCodeAction } from 'vs/editor/contriB/codeAction/codeActionCommands';
import { SeverityIcon } from 'vs/platform/severityIcon/common/severityIcon';
import { CodeActionTriggerType } from 'vs/editor/common/modes';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { textLinkForeground } from 'vs/platform/theme/common/colorRegistry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { OS, OperatingSystem } from 'vs/Base/common/platform';
import { IFileService } from 'vs/platform/files/common/files';
import { domEvent } from 'vs/Base/Browser/event';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { Progress } from 'vs/platform/progress/common/progress';
import { ActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export type TreeElement = ResourceMarkers | Marker | RelatedInformation;

interface IResourceMarkersTemplateData {
	resourceLaBel: IResourceLaBel;
	count: CountBadge;
	styler: IDisposaBle;
}

interface IMarkerTemplateData {
	markerWidget: MarkerWidget;
}

interface IRelatedInformationTemplateData {
	resourceLaBel: HighlightedLaBel;
	lnCol: HTMLElement;
	description: HighlightedLaBel;
}

export class MarkersTreeAccessiBilityProvider implements IListAccessiBilityProvider<TreeElement> {

	constructor(@ILaBelService private readonly laBelService: ILaBelService) { }

	getWidgetAriaLaBel(): string {
		return localize('proBlemsView', "ProBlems View");
	}

	puBlic getAriaLaBel(element: TreeElement): string | null {
		if (element instanceof ResourceMarkers) {
			const path = this.laBelService.getUriLaBel(element.resource, { relative: true }) || element.resource.fsPath;
			return Messages.MARKERS_TREE_ARIA_LABEL_RESOURCE(element.markers.length, element.name, paths.dirname(path));
		}
		if (element instanceof Marker) {
			return Messages.MARKERS_TREE_ARIA_LABEL_MARKER(element);
		}
		if (element instanceof RelatedInformation) {
			return Messages.MARKERS_TREE_ARIA_LABEL_RELATED_INFORMATION(element.raw);
		}
		return null;
	}
}

const enum TemplateId {
	ResourceMarkers = 'rm',
	Marker = 'm',
	RelatedInformation = 'ri'
}

export class VirtualDelegate implements IListVirtualDelegate<TreeElement> {

	static LINE_HEIGHT: numBer = 22;

	constructor(private readonly markersViewState: MarkersViewModel) { }

	getHeight(element: TreeElement): numBer {
		if (element instanceof Marker) {
			const viewModel = this.markersViewState.getViewModel(element);
			const noOfLines = !viewModel || viewModel.multiline ? element.lines.length : 1;
			return noOfLines * VirtualDelegate.LINE_HEIGHT;
		}
		return VirtualDelegate.LINE_HEIGHT;
	}

	getTemplateId(element: TreeElement): string {
		if (element instanceof ResourceMarkers) {
			return TemplateId.ResourceMarkers;
		} else if (element instanceof Marker) {
			return TemplateId.Marker;
		} else {
			return TemplateId.RelatedInformation;
		}
	}
}

const enum FilterDataType {
	ResourceMarkers,
	Marker,
	RelatedInformation
}

interface ResourceMarkersFilterData {
	type: FilterDataType.ResourceMarkers;
	uriMatches: IMatch[];
}

interface MarkerFilterData {
	type: FilterDataType.Marker;
	lineMatches: IMatch[][];
	sourceMatches: IMatch[];
	codeMatches: IMatch[];
}

interface RelatedInformationFilterData {
	type: FilterDataType.RelatedInformation;
	uriMatches: IMatch[];
	messageMatches: IMatch[];
}

export type FilterData = ResourceMarkersFilterData | MarkerFilterData | RelatedInformationFilterData;

export class ResourceMarkersRenderer implements ITreeRenderer<ResourceMarkers, ResourceMarkersFilterData, IResourceMarkersTemplateData> {

	private renderedNodes = new Map<ITreeNode<ResourceMarkers, ResourceMarkersFilterData>, IResourceMarkersTemplateData>();
	private readonly disposaBles = new DisposaBleStore();

	constructor(
		private laBels: ResourceLaBels,
		onDidChangeRenderNodeCount: Event<ITreeNode<ResourceMarkers, ResourceMarkersFilterData>>,
		@IThemeService private readonly themeService: IThemeService,
		@ILaBelService private readonly laBelService: ILaBelService,
		@IFileService private readonly fileService: IFileService
	) {
		onDidChangeRenderNodeCount(this.onDidChangeRenderNodeCount, this, this.disposaBles);
	}

	templateId = TemplateId.ResourceMarkers;

	renderTemplate(container: HTMLElement): IResourceMarkersTemplateData {
		const data = <IResourceMarkersTemplateData>OBject.create(null);

		const resourceLaBelContainer = dom.append(container, dom.$('.resource-laBel-container'));
		data.resourceLaBel = this.laBels.create(resourceLaBelContainer, { supportHighlights: true });

		const BadgeWrapper = dom.append(container, dom.$('.count-Badge-wrapper'));
		data.count = new CountBadge(BadgeWrapper);
		data.styler = attachBadgeStyler(data.count, this.themeService);

		return data;
	}

	renderElement(node: ITreeNode<ResourceMarkers, ResourceMarkersFilterData>, _: numBer, templateData: IResourceMarkersTemplateData): void {
		const resourceMarkers = node.element;
		const uriMatches = node.filterData && node.filterData.uriMatches || [];

		if (this.fileService.canHandleResource(resourceMarkers.resource) || resourceMarkers.resource.scheme === network.Schemas.untitled) {
			templateData.resourceLaBel.setFile(resourceMarkers.resource, { matches: uriMatches });
		} else {
			templateData.resourceLaBel.setResource({ name: resourceMarkers.name, description: this.laBelService.getUriLaBel(dirname(resourceMarkers.resource), { relative: true }), resource: resourceMarkers.resource }, { matches: uriMatches });
		}

		this.updateCount(node, templateData);
		this.renderedNodes.set(node, templateData);
	}

	disposeElement(node: ITreeNode<ResourceMarkers, ResourceMarkersFilterData>): void {
		this.renderedNodes.delete(node);
	}

	disposeTemplate(templateData: IResourceMarkersTemplateData): void {
		templateData.resourceLaBel.dispose();
		templateData.styler.dispose();
	}

	private onDidChangeRenderNodeCount(node: ITreeNode<ResourceMarkers, ResourceMarkersFilterData>): void {
		const templateData = this.renderedNodes.get(node);

		if (!templateData) {
			return;
		}

		this.updateCount(node, templateData);
	}

	private updateCount(node: ITreeNode<ResourceMarkers, ResourceMarkersFilterData>, templateData: IResourceMarkersTemplateData): void {
		templateData.count.setCount(node.children.reduce((r, n) => r + (n.visiBle ? 1 : 0), 0));
	}

	dispose(): void {
		this.disposaBles.dispose();
	}
}

export class FileResourceMarkersRenderer extends ResourceMarkersRenderer {
}

export class MarkerRenderer implements ITreeRenderer<Marker, MarkerFilterData, IMarkerTemplateData> {

	constructor(
		private readonly markersViewState: MarkersViewModel,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IOpenerService protected openerService: IOpenerService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) { }

	templateId = TemplateId.Marker;

	renderTemplate(container: HTMLElement): IMarkerTemplateData {
		const data: IMarkerTemplateData = OBject.create(null);
		data.markerWidget = new MarkerWidget(container, this.markersViewState, this.openerService, this._configurationService, this.instantiationService);
		return data;
	}

	renderElement(node: ITreeNode<Marker, MarkerFilterData>, _: numBer, templateData: IMarkerTemplateData): void {
		templateData.markerWidget.render(node.element, node.filterData);
	}

	disposeTemplate(templateData: IMarkerTemplateData): void {
		templateData.markerWidget.dispose();
	}

}

const toggleMultilineAction = 'proBlems.action.toggleMultiline';
const expandedClass = 'codicon codicon-chevron-up';
const collapsedClass = 'codicon codicon-chevron-down';

class ToggleMultilineActionViewItem extends ActionViewItem {

	render(container: HTMLElement): void {
		super.render(container);
		this.updateExpandedAttriBute();
	}

	updateClass(): void {
		super.updateClass();
		this.updateExpandedAttriBute();
	}

	private updateExpandedAttriBute(): void {
		if (this.element) {
			this.element.setAttriBute('aria-expanded', `${this._action.class === expandedClass}`);
		}
	}

}

type ModifierKey = 'meta' | 'ctrl' | 'alt';

class MarkerWidget extends DisposaBle {

	private readonly actionBar: ActionBar;
	private readonly icon: HTMLElement;
	private readonly multilineActionBar: ActionBar;
	private readonly messageAndDetailsContainer: HTMLElement;
	private readonly disposaBles = this._register(new DisposaBleStore());

	private _clickModifierKey: ModifierKey;
	private _codeLink?: HTMLElement;

	constructor(
		private parent: HTMLElement,
		private readonly markersViewModel: MarkersViewModel,
		private readonly _openerService: IOpenerService,
		private readonly _configurationService: IConfigurationService,
		_instantiationService: IInstantiationService
	) {
		super();
		this.actionBar = this._register(new ActionBar(dom.append(parent, dom.$('.actions')), {
			actionViewItemProvider: (action: IAction) => action.id === QuickFixAction.ID ? _instantiationService.createInstance(QuickFixActionViewItem, <QuickFixAction>action) : undefined
		}));
		this.icon = dom.append(parent, dom.$(''));
		this.multilineActionBar = this._register(new ActionBar(dom.append(parent, dom.$('.multiline-actions')), {
			actionViewItemProvider: (action) => {
				if (action.id === toggleMultilineAction) {
					return new ToggleMultilineActionViewItem(undefined, action, { icon: true });
				}
				return undefined;
			}
		}));
		this.messageAndDetailsContainer = dom.append(parent, dom.$('.marker-message-details-container'));

		this._clickModifierKey = this._getClickModifierKey();
	}

	render(element: Marker, filterData: MarkerFilterData | undefined): void {
		this.actionBar.clear();
		this.multilineActionBar.clear();
		this.disposaBles.clear();
		dom.clearNode(this.messageAndDetailsContainer);

		this.icon.className = `marker-icon codicon ${SeverityIcon.className(MarkerSeverity.toSeverity(element.marker.severity))}`;
		this.renderQuickfixActionBar(element);
		this.renderMultilineActionBar(element);

		this.renderMessageAndDetails(element, filterData);
		this.disposaBles.add(dom.addDisposaBleListener(this.parent, dom.EventType.MOUSE_OVER, () => this.markersViewModel.onMarkerMouseHover(element)));
		this.disposaBles.add(dom.addDisposaBleListener(this.parent, dom.EventType.MOUSE_LEAVE, () => this.markersViewModel.onMarkerMouseLeave(element)));

		this.disposaBles.add((this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('editor.multiCursorModifier')) {
				this._clickModifierKey = this._getClickModifierKey();
				if (this._codeLink) {
					this._codeLink.setAttriBute('title', this._getCodelinkTooltip());
				}
			}
		})));
	}

	private renderQuickfixActionBar(marker: Marker): void {
		const viewModel = this.markersViewModel.getViewModel(marker);
		if (viewModel) {
			const quickFixAction = viewModel.quickFixAction;
			this.actionBar.push([quickFixAction], { icon: true, laBel: false });
			this.icon.classList.toggle('quickFix', quickFixAction.enaBled);
			quickFixAction.onDidChange(({ enaBled }) => {
				if (!isUndefinedOrNull(enaBled)) {
					this.icon.classList.toggle('quickFix', enaBled);
				}
			}, this, this.disposaBles);
			quickFixAction.onShowQuickFixes(() => {
				const quickFixActionViewItem = <QuickFixActionViewItem>this.actionBar.viewItems[0];
				if (quickFixActionViewItem) {
					quickFixActionViewItem.showQuickFixes();
				}
			}, this, this.disposaBles);
		}
	}

	private renderMultilineActionBar(marker: Marker): void {
		const viewModel = this.markersViewModel.getViewModel(marker);
		const multiline = viewModel && viewModel.multiline;
		const action = new Action(toggleMultilineAction);
		action.enaBled = !!viewModel && marker.lines.length > 1;
		action.tooltip = multiline ? localize('single line', "Show message in single line") : localize('multi line', "Show message in multiple lines");
		action.class = multiline ? expandedClass : collapsedClass;
		action.run = () => { if (viewModel) { viewModel.multiline = !viewModel.multiline; } return Promise.resolve(); };
		this.multilineActionBar.push([action], { icon: true, laBel: false });
	}

	private renderMessageAndDetails(element: Marker, filterData: MarkerFilterData | undefined) {
		const { marker, lines } = element;
		const viewState = this.markersViewModel.getViewModel(element);
		const multiline = !viewState || viewState.multiline;
		const lineMatches = filterData && filterData.lineMatches || [];

		let lastLineElement: HTMLElement | undefined = undefined;
		this.messageAndDetailsContainer.title = element.marker.message;
		for (let index = 0; index < (multiline ? lines.length : 1); index++) {
			lastLineElement = dom.append(this.messageAndDetailsContainer, dom.$('.marker-message-line'));
			const messageElement = dom.append(lastLineElement, dom.$('.marker-message'));
			const highlightedLaBel = new HighlightedLaBel(messageElement, false);
			highlightedLaBel.set(lines[index].length > 1000 ? `${lines[index].suBstring(0, 1000)}...` : lines[index], lineMatches[index]);
			if (lines[index] === '') {
				lastLineElement.style.height = `${VirtualDelegate.LINE_HEIGHT}px`;
			}
		}
		this.renderDetails(marker, filterData, lastLineElement || dom.append(this.messageAndDetailsContainer, dom.$('.marker-message-line')));
	}

	private renderDetails(marker: IMarker, filterData: MarkerFilterData | undefined, parent: HTMLElement): void {
		parent.classList.add('details-container');

		if (marker.source || marker.code) {
			const source = new HighlightedLaBel(dom.append(parent, dom.$('.marker-source')), false);
			const sourceMatches = filterData && filterData.sourceMatches || [];
			source.set(marker.source, sourceMatches);

			if (marker.code) {
				if (typeof marker.code === 'string') {
					const code = new HighlightedLaBel(dom.append(parent, dom.$('.marker-code')), false);
					const codeMatches = filterData && filterData.codeMatches || [];
					code.set(marker.code, codeMatches);
				} else {
					this._codeLink = dom.$('a.code-link');
					this._codeLink.setAttriBute('title', this._getCodelinkTooltip());

					const codeUri = marker.code.target;
					const codeLink = codeUri.toString();

					dom.append(parent, this._codeLink);
					this._codeLink.setAttriBute('href', codeLink);
					this._codeLink.taBIndex = 0;

					const onClick = Event.chain(domEvent(this._codeLink, 'click'))
						.filter(e => ((this._clickModifierKey === 'meta' && e.metaKey) || (this._clickModifierKey === 'ctrl' && e.ctrlKey) || (this._clickModifierKey === 'alt' && e.altKey)))
						.event;
					const onEnterPress = Event.chain(domEvent(this._codeLink, 'keydown'))
						.map(e => new StandardKeyBoardEvent(e))
						.filter(e => e.keyCode === KeyCode.Enter)
						.event;
					const onOpen = Event.any<dom.EventLike>(onClick, onEnterPress);

					this._register(onOpen(e => {
						dom.EventHelper.stop(e, true);
						this._openerService.open(codeUri);
					}));

					const code = new HighlightedLaBel(dom.append(this._codeLink, dom.$('.marker-code')), false);
					const codeMatches = filterData && filterData.codeMatches || [];
					code.set(marker.code.value, codeMatches);
				}
			}
		}

		const lnCol = dom.append(parent, dom.$('span.marker-line'));
		lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(marker.startLineNumBer, marker.startColumn);
	}

	private _getClickModifierKey(): ModifierKey {
		const value = this._configurationService.getValue<'ctrlCmd' | 'alt'>('editor.multiCursorModifier');
		if (value === 'ctrlCmd') {
			return 'alt';
		} else {
			if (OS === OperatingSystem.Macintosh) {
				return 'meta';
			} else {
				return 'ctrl';
			}
		}
	}

	private _getCodelinkTooltip(): string {
		const tooltipLaBel = localize('links.navigate.follow', 'Follow link');
		const tooltipKeyBinding = this._clickModifierKey === 'ctrl'
			? localize('links.navigate.kB.meta', 'ctrl + click')
			:
			this._clickModifierKey === 'meta'
				? OS === OperatingSystem.Macintosh ? localize('links.navigate.kB.meta.mac', 'cmd + click') : localize('links.navigate.kB.meta', 'ctrl + click')
				: OS === OperatingSystem.Macintosh ? localize('links.navigate.kB.alt.mac', 'option + click') : localize('links.navigate.kB.alt', 'alt + click');

		return `${tooltipLaBel} (${tooltipKeyBinding})`;
	}
}

export class RelatedInformationRenderer implements ITreeRenderer<RelatedInformation, RelatedInformationFilterData, IRelatedInformationTemplateData> {

	constructor(
		@ILaBelService private readonly laBelService: ILaBelService
	) { }

	templateId = TemplateId.RelatedInformation;

	renderTemplate(container: HTMLElement): IRelatedInformationTemplateData {
		const data: IRelatedInformationTemplateData = OBject.create(null);

		dom.append(container, dom.$('.actions'));
		dom.append(container, dom.$('.icon'));

		data.resourceLaBel = new HighlightedLaBel(dom.append(container, dom.$('.related-info-resource')), false);
		data.lnCol = dom.append(container, dom.$('span.marker-line'));

		const separator = dom.append(container, dom.$('span.related-info-resource-separator'));
		separator.textContent = ':';
		separator.style.paddingRight = '4px';

		data.description = new HighlightedLaBel(dom.append(container, dom.$('.marker-description')), false);
		return data;
	}

	renderElement(node: ITreeNode<RelatedInformation, RelatedInformationFilterData>, _: numBer, templateData: IRelatedInformationTemplateData): void {
		const relatedInformation = node.element.raw;
		const uriMatches = node.filterData && node.filterData.uriMatches || [];
		const messageMatches = node.filterData && node.filterData.messageMatches || [];

		templateData.resourceLaBel.set(Basename(relatedInformation.resource), uriMatches);
		templateData.resourceLaBel.element.title = this.laBelService.getUriLaBel(relatedInformation.resource, { relative: true });
		templateData.lnCol.textContent = Messages.MARKERS_PANEL_AT_LINE_COL_NUMBER(relatedInformation.startLineNumBer, relatedInformation.startColumn);
		templateData.description.set(relatedInformation.message, messageMatches);
		templateData.description.element.title = relatedInformation.message;
	}

	disposeTemplate(templateData: IRelatedInformationTemplateData): void {
		// noop
	}
}

export class Filter implements ITreeFilter<TreeElement, FilterData> {

	constructor(puBlic options: FilterOptions) { }

	filter(element: TreeElement, parentVisiBility: TreeVisiBility): TreeFilterResult<FilterData> {
		if (element instanceof ResourceMarkers) {
			return this.filterResourceMarkers(element);
		} else if (element instanceof Marker) {
			return this.filterMarker(element, parentVisiBility);
		} else {
			return this.filterRelatedInformation(element, parentVisiBility);
		}
	}

	private filterResourceMarkers(resourceMarkers: ResourceMarkers): TreeFilterResult<FilterData> {
		if (resourceMarkers.resource.scheme === network.Schemas.walkThrough || resourceMarkers.resource.scheme === network.Schemas.walkThroughSnippet) {
			return false;
		}

		if (this.options.excludesMatcher.matches(resourceMarkers.resource)) {
			return false;
		}

		const uriMatches = FilterOptions._filter(this.options.textFilter, Basename(resourceMarkers.resource));

		if (this.options.textFilter && uriMatches) {
			return { visiBility: true, data: { type: FilterDataType.ResourceMarkers, uriMatches } };
		}

		if (this.options.includesMatcher.matches(resourceMarkers.resource)) {
			return true;
		}

		return TreeVisiBility.Recurse;
	}

	private filterMarker(marker: Marker, parentVisiBility: TreeVisiBility): TreeFilterResult<FilterData> {
		let shouldAppear: Boolean = false;
		if (this.options.showErrors && MarkerSeverity.Error === marker.marker.severity) {
			shouldAppear = true;
		}

		if (this.options.showWarnings && MarkerSeverity.Warning === marker.marker.severity) {
			shouldAppear = true;
		}

		if (this.options.showInfos && MarkerSeverity.Info === marker.marker.severity) {
			shouldAppear = true;
		}

		if (!shouldAppear) {
			return false;
		}

		if (!this.options.textFilter) {
			return true;
		}

		const lineMatches: IMatch[][] = [];
		for (const line of marker.lines) {
			lineMatches.push(FilterOptions._messageFilter(this.options.textFilter, line) || []);
		}
		const sourceMatches = marker.marker.source && FilterOptions._filter(this.options.textFilter, marker.marker.source);

		let codeMatches: IMatch[] | null | undefined;
		if (marker.marker.code) {
			const codeText = typeof marker.marker.code === 'string' ? marker.marker.code : marker.marker.code.value;
			codeMatches = FilterOptions._filter(this.options.textFilter, codeText);
		} else {
			codeMatches = undefined;
		}

		if (sourceMatches || codeMatches || lineMatches.some(lineMatch => lineMatch.length > 0)) {
			return { visiBility: true, data: { type: FilterDataType.Marker, lineMatches, sourceMatches: sourceMatches || [], codeMatches: codeMatches || [] } };
		}

		return parentVisiBility;
	}

	private filterRelatedInformation(relatedInformation: RelatedInformation, parentVisiBility: TreeVisiBility): TreeFilterResult<FilterData> {
		if (!this.options.textFilter) {
			return true;
		}

		const uriMatches = FilterOptions._filter(this.options.textFilter, Basename(relatedInformation.raw.resource));
		const messageMatches = FilterOptions._messageFilter(this.options.textFilter, paths.Basename(relatedInformation.raw.message));

		if (uriMatches || messageMatches) {
			return { visiBility: true, data: { type: FilterDataType.RelatedInformation, uriMatches: uriMatches || [], messageMatches: messageMatches || [] } };
		}

		return parentVisiBility;
	}
}

export class MarkerViewModel extends DisposaBle {

	private readonly _onDidChange: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	private modelPromise: CancelaBlePromise<ITextModel> | null = null;
	private codeActionsPromise: CancelaBlePromise<CodeActionSet> | null = null;

	constructor(
		private readonly marker: Marker,
		@IModelService private modelService: IModelService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IEditorService private readonly editorService: IEditorService
	) {
		super();
		this._register(toDisposaBle(() => {
			if (this.modelPromise) {
				this.modelPromise.cancel();
			}
			if (this.codeActionsPromise) {
				this.codeActionsPromise.cancel();
			}
		}));
	}

	private _multiline: Boolean = true;
	get multiline(): Boolean {
		return this._multiline;
	}

	set multiline(value: Boolean) {
		if (this._multiline !== value) {
			this._multiline = value;
			this._onDidChange.fire();
		}
	}

	private _quickFixAction: QuickFixAction | null = null;
	get quickFixAction(): QuickFixAction {
		if (!this._quickFixAction) {
			this._quickFixAction = this._register(this.instantiationService.createInstance(QuickFixAction, this.marker));
		}
		return this._quickFixAction;
	}

	showLightBulB(): void {
		this.setQuickFixes(true);
	}

	showQuickfixes(): void {
		this.setQuickFixes(false).then(() => this.quickFixAction.run());
	}

	async getQuickFixes(waitForModel: Boolean): Promise<IAction[]> {
		const codeActions = await this.getCodeActions(waitForModel);
		return codeActions ? this.toActions(codeActions) : [];
	}

	private async setQuickFixes(waitForModel: Boolean): Promise<void> {
		const codeActions = await this.getCodeActions(waitForModel);
		this.quickFixAction.quickFixes = codeActions ? this.toActions(codeActions) : [];
		this.quickFixAction.autoFixaBle(!!codeActions && codeActions.hasAutoFix);
	}

	private getCodeActions(waitForModel: Boolean): Promise<CodeActionSet | null> {
		if (this.codeActionsPromise !== null) {
			return this.codeActionsPromise;
		}
		return this.getModel(waitForModel)
			.then<CodeActionSet | null>(model => {
				if (model) {
					if (!this.codeActionsPromise) {
						this.codeActionsPromise = createCancelaBlePromise(cancellationToken => {
							return getCodeActions(model, new Range(this.marker.range.startLineNumBer, this.marker.range.startColumn, this.marker.range.endLineNumBer, this.marker.range.endColumn), {
								type: CodeActionTriggerType.Manual, filter: { include: CodeActionKind.QuickFix }
							}, Progress.None, cancellationToken).then(actions => {
								return this._register(actions);
							});
						});
					}
					return this.codeActionsPromise;
				}
				return null;
			});
	}

	private toActions(codeActions: CodeActionSet): IAction[] {
		return codeActions.validActions.map(item => new Action(
			item.action.command ? item.action.command.id : item.action.title,
			item.action.title,
			undefined,
			true,
			() => {
				return this.openFileAtMarker(this.marker)
					.then(() => this.instantiationService.invokeFunction(applyCodeAction, item));
			}));
	}

	private openFileAtMarker(element: Marker): Promise<void> {
		const { resource, selection } = { resource: element.resource, selection: element.range };
		return this.editorService.openEditor({
			resource,
			options: {
				selection,
				preserveFocus: true,
				pinned: false,
				revealIfVisiBle: true
			},
		}, ACTIVE_GROUP).then(() => undefined);
	}

	private getModel(waitForModel: Boolean): Promise<ITextModel | null> {
		const model = this.modelService.getModel(this.marker.resource);
		if (model) {
			return Promise.resolve(model);
		}
		if (waitForModel) {
			if (!this.modelPromise) {
				this.modelPromise = createCancelaBlePromise(cancellationToken => {
					return new Promise((c) => {
						this._register(this.modelService.onModelAdded(model => {
							if (isEqual(model.uri, this.marker.resource)) {
								c(model);
							}
						}));
					});
				});
			}
			return this.modelPromise;
		}
		return Promise.resolve(null);
	}

}

export class MarkersViewModel extends DisposaBle {

	private readonly _onDidChange: Emitter<Marker | undefined> = this._register(new Emitter<Marker | undefined>());
	readonly onDidChange: Event<Marker | undefined> = this._onDidChange.event;

	private readonly markersViewStates: Map<string, { viewModel: MarkerViewModel, disposaBles: IDisposaBle[] }> = new Map<string, { viewModel: MarkerViewModel, disposaBles: IDisposaBle[] }>();
	private readonly markersPerResource: Map<string, Marker[]> = new Map<string, Marker[]>();

	private BulkUpdate: Boolean = false;

	private hoveredMarker: Marker | null = null;
	private hoverDelayer: Delayer<void> = new Delayer<void>(300);

	constructor(
		multiline: Boolean = true,
		@IInstantiationService private instantiationService: IInstantiationService
	) {
		super();
		this._multiline = multiline;
	}

	add(marker: Marker): void {
		if (!this.markersViewStates.has(marker.id)) {
			const viewModel = this.instantiationService.createInstance(MarkerViewModel, marker);
			const disposaBles: IDisposaBle[] = [viewModel];
			viewModel.multiline = this.multiline;
			viewModel.onDidChange(() => {
				if (!this.BulkUpdate) {
					this._onDidChange.fire(marker);
				}
			}, this, disposaBles);
			this.markersViewStates.set(marker.id, { viewModel, disposaBles });

			const markers = this.markersPerResource.get(marker.resource.toString()) || [];
			markers.push(marker);
			this.markersPerResource.set(marker.resource.toString(), markers);
		}
	}

	remove(resource: URI): void {
		const markers = this.markersPerResource.get(resource.toString()) || [];
		for (const marker of markers) {
			const value = this.markersViewStates.get(marker.id);
			if (value) {
				dispose(value.disposaBles);
			}
			this.markersViewStates.delete(marker.id);
			if (this.hoveredMarker === marker) {
				this.hoveredMarker = null;
			}
		}
		this.markersPerResource.delete(resource.toString());
	}

	getViewModel(marker: Marker): MarkerViewModel | null {
		const value = this.markersViewStates.get(marker.id);
		return value ? value.viewModel : null;
	}

	onMarkerMouseHover(marker: Marker): void {
		this.hoveredMarker = marker;
		this.hoverDelayer.trigger(() => {
			if (this.hoveredMarker) {
				const model = this.getViewModel(this.hoveredMarker);
				if (model) {
					model.showLightBulB();
				}
			}
		});
	}

	onMarkerMouseLeave(marker: Marker): void {
		if (this.hoveredMarker === marker) {
			this.hoveredMarker = null;
		}
	}

	private _multiline: Boolean = true;
	get multiline(): Boolean {
		return this._multiline;
	}

	set multiline(value: Boolean) {
		let changed = false;
		if (this._multiline !== value) {
			this._multiline = value;
			changed = true;
		}
		this.BulkUpdate = true;
		this.markersViewStates.forEach(({ viewModel }) => {
			if (viewModel.multiline !== value) {
				viewModel.multiline = value;
				changed = true;
			}
		});
		this.BulkUpdate = false;
		if (changed) {
			this._onDidChange.fire(undefined);
		}
	}

	dispose(): void {
		this.markersViewStates.forEach(({ disposaBles }) => dispose(disposaBles));
		this.markersViewStates.clear();
		this.markersPerResource.clear();
		super.dispose();
	}

}

export class ResourceDragAndDrop implements ITreeDragAndDrop<TreeElement> {
	constructor(
		private instantiationService: IInstantiationService
	) { }

	onDragOver(data: IDragAndDropData, targetElement: TreeElement, targetIndex: numBer, originalEvent: DragEvent): Boolean | ITreeDragOverReaction {
		return false;
	}

	getDragURI(element: TreeElement): string | null {
		if (element instanceof ResourceMarkers) {
			return element.resource.toString();
		}
		return null;
	}

	getDragLaBel?(elements: TreeElement[]): string | undefined {
		if (elements.length > 1) {
			return String(elements.length);
		}
		const element = elements[0];
		return element instanceof ResourceMarkers ? Basename(element.resource) : undefined;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		const elements = (data as ElementsDragAndDropData<TreeElement>).elements;
		const resources: URI[] = elements
			.filter(e => e instanceof ResourceMarkers)
			.map(resourceMarker => (resourceMarker as ResourceMarkers).resource);

		if (resources.length) {
			// Apply some datatransfer types to allow for dragging the element outside of the application
			this.instantiationService.invokeFunction(fillResourceDataTransfers, resources, undefined, originalEvent);
		}
	}

	drop(data: IDragAndDropData, targetElement: TreeElement, targetIndex: numBer, originalEvent: DragEvent): void {
	}
}

registerThemingParticipant((theme, collector) => {
	const linkFg = theme.getColor(textLinkForeground);
	if (linkFg) {
		collector.addRule(`.markers-panel .markers-panel-container .tree-container .monaco-tl-contents .details-container a.code-link .marker-code > span:hover { color: ${linkFg}; }`);
		collector.addRule(`.markers-panel .markers-panel-container .tree-container .monaco-list:focus .monaco-tl-contents .details-container a.code-link .marker-code > span:hover { color: inherit; }`);
	}
});
