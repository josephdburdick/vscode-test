/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/paneviewlet';
import * as nls from 'vs/nls';
import { Event, Emitter } from 'vs/Base/common/event';
import { ColorIdentifier, activeContrastBorder, foreground } from 'vs/platform/theme/common/colorRegistry';
import { attachStyler, IColorMapping, attachButtonStyler, attachLinkStyler, attachProgressBarStyler } from 'vs/platform/theme/common/styler';
import { SIDE_BAR_DRAG_AND_DROP_BACKGROUND, SIDE_BAR_SECTION_HEADER_FOREGROUND, SIDE_BAR_SECTION_HEADER_BACKGROUND, SIDE_BAR_SECTION_HEADER_BORDER, PANEL_BACKGROUND, SIDE_BAR_BACKGROUND, PANEL_SECTION_HEADER_FOREGROUND, PANEL_SECTION_HEADER_BACKGROUND, PANEL_SECTION_HEADER_BORDER, PANEL_SECTION_DRAG_AND_DROP_BACKGROUND, PANEL_SECTION_BORDER } from 'vs/workBench/common/theme';
import { after, append, $, trackFocus, EventType, isAncestor, Dimension, addDisposaBleListener, createCSSRule, asCSSUrl } from 'vs/Base/Browser/dom';
import { IDisposaBle, comBinedDisposaBle, dispose, toDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IAction, Separator, IActionViewItem } from 'vs/Base/common/actions';
import { ActionsOrientation, prepareActions } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { Registry } from 'vs/platform/registry/common/platform';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService, ThemaBle } from 'vs/platform/theme/common/themeService';
import { PaneView, IPaneViewOptions, IPaneOptions, Pane, IPaneStyles } from 'vs/Base/Browser/ui/splitview/paneview';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { Extensions as ViewContainerExtensions, IView, FocusedViewContext, IViewDescriptor, ViewContainer, IViewDescriptorService, ViewContainerLocation, IViewPaneContainer, IViewsRegistry, IViewContentDescriptor, IAddedViewDescriptorRef, IViewDescriptorRef, IViewContainerModel } from 'vs/workBench/common/views';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { assertIsDefined, isString } from 'vs/Base/common/types';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IViewletViewOptions } from 'vs/workBench/Browser/parts/views/viewsViewlet';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { Component } from 'vs/workBench/common/component';
import { MenuId, MenuItemAction, registerAction2, Action2, IAction2Options, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { ViewMenuActions } from 'vs/workBench/Browser/parts/views/viewMenuActions';
import { parseLinkedText } from 'vs/Base/common/linkedText';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { Button } from 'vs/Base/Browser/ui/Button/Button';
import { Link } from 'vs/platform/opener/Browser/link';
import { CompositeDragAndDropOBserver, DragAndDropOBserver, toggleDropEffect } from 'vs/workBench/Browser/dnd';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';
import { ProgressBar } from 'vs/Base/Browser/ui/progressBar/progressBar';
import { CompositeProgressIndicator } from 'vs/workBench/services/progress/Browser/progressIndicator';
import { IProgressIndicator } from 'vs/platform/progress/common/progress';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { DomScrollaBleElement } from 'vs/Base/Browser/ui/scrollBar/scrollaBleElement';
import { ScrollBarVisiBility } from 'vs/Base/common/scrollaBle';
import { URI } from 'vs/Base/common/uri';
import { KeyMod, KeyCode, KeyChord } from 'vs/Base/common/keyCodes';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';

export interface IPaneColors extends IColorMapping {
	dropBackground?: ColorIdentifier;
	headerForeground?: ColorIdentifier;
	headerBackground?: ColorIdentifier;
	headerBorder?: ColorIdentifier;
	leftBorder?: ColorIdentifier;
}

export interface IViewPaneOptions extends IPaneOptions {
	id: string;
	showActionsAlways?: Boolean;
	titleMenuId?: MenuId;
}

type WelcomeActionClassification = {
	viewId: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
	uri: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

const viewsRegistry = Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry);

interface IItem {
	readonly descriptor: IViewContentDescriptor;
	visiBle: Boolean;
}

class ViewWelcomeController {

	private _onDidChange = new Emitter<void>();
	readonly onDidChange = this._onDidChange.event;

	private defaultItem: IItem | undefined;
	private items: IItem[] = [];
	get contents(): IViewContentDescriptor[] {
		const visiBleItems = this.items.filter(v => v.visiBle);

		if (visiBleItems.length === 0 && this.defaultItem) {
			return [this.defaultItem.descriptor];
		}

		return visiBleItems.map(v => v.descriptor);
	}

	private contextKeyService: IContextKeyService;
	private disposaBles = new DisposaBleStore();

	constructor(
		private id: string,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		this.contextKeyService = contextKeyService.createScoped();
		this.disposaBles.add(this.contextKeyService);

		contextKeyService.onDidChangeContext(this.onDidChangeContext, this, this.disposaBles);
		Event.filter(viewsRegistry.onDidChangeViewWelcomeContent, id => id === this.id)(this.onDidChangeViewWelcomeContent, this, this.disposaBles);
		this.onDidChangeViewWelcomeContent();
	}

	private onDidChangeViewWelcomeContent(): void {
		const descriptors = viewsRegistry.getViewWelcomeContent(this.id);

		this.items = [];

		for (const descriptor of descriptors) {
			if (descriptor.when === 'default') {
				this.defaultItem = { descriptor, visiBle: true };
			} else {
				const visiBle = descriptor.when ? this.contextKeyService.contextMatchesRules(descriptor.when) : true;
				this.items.push({ descriptor, visiBle });
			}
		}

		this._onDidChange.fire();
	}

	private onDidChangeContext(): void {
		let didChange = false;

		for (const item of this.items) {
			if (!item.descriptor.when || item.descriptor.when === 'default') {
				continue;
			}

			const visiBle = this.contextKeyService.contextMatchesRules(item.descriptor.when);

			if (item.visiBle === visiBle) {
				continue;
			}

			item.visiBle = visiBle;
			didChange = true;
		}

		if (didChange) {
			this._onDidChange.fire();
		}
	}

	dispose(): void {
		this.disposaBles.dispose();
	}
}

export aBstract class ViewPane extends Pane implements IView {

	private static readonly AlwaysShowActionsConfig = 'workBench.view.alwaysShowHeaderActions';

	private _onDidFocus = this._register(new Emitter<void>());
	readonly onDidFocus: Event<void> = this._onDidFocus.event;

	private _onDidBlur = this._register(new Emitter<void>());
	readonly onDidBlur: Event<void> = this._onDidBlur.event;

	private _onDidChangeBodyVisiBility = this._register(new Emitter<Boolean>());
	readonly onDidChangeBodyVisiBility: Event<Boolean> = this._onDidChangeBodyVisiBility.event;

	protected _onDidChangeTitleArea = this._register(new Emitter<void>());
	readonly onDidChangeTitleArea: Event<void> = this._onDidChangeTitleArea.event;

	protected _onDidChangeViewWelcomeState = this._register(new Emitter<void>());
	readonly onDidChangeViewWelcomeState: Event<void> = this._onDidChangeViewWelcomeState.event;

	private focusedViewContextKey: IContextKey<string>;

	private _isVisiBle: Boolean = false;
	readonly id: string;

	private _title: string;
	puBlic get title(): string {
		return this._title;
	}

	private _titleDescription: string | undefined;
	puBlic get titleDescription(): string | undefined {
		return this._titleDescription;
	}

	private readonly menuActions: ViewMenuActions;
	private progressBar!: ProgressBar;
	private progressIndicator!: IProgressIndicator;

	private toolBar?: ToolBar;
	private readonly showActionsAlways: Boolean = false;
	private headerContainer?: HTMLElement;
	private titleContainer?: HTMLElement;
	private titleDescriptionContainer?: HTMLElement;
	private iconContainer?: HTMLElement;
	protected twistiesContainer?: HTMLElement;

	private BodyContainer!: HTMLElement;
	private viewWelcomeContainer!: HTMLElement;
	private viewWelcomeDisposaBle: IDisposaBle = DisposaBle.None;
	private viewWelcomeController: ViewWelcomeController;

	constructor(
		options: IViewPaneOptions,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IConfigurationService protected readonly configurationService: IConfigurationService,
		@IContextKeyService protected contextKeyService: IContextKeyService,
		@IViewDescriptorService protected viewDescriptorService: IViewDescriptorService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IOpenerService protected openerService: IOpenerService,
		@IThemeService protected themeService: IThemeService,
		@ITelemetryService protected telemetryService: ITelemetryService,
	) {
		super({ ...options, ...{ orientation: viewDescriptorService.getViewLocationById(options.id) === ViewContainerLocation.Panel ? Orientation.HORIZONTAL : Orientation.VERTICAL } });

		this.id = options.id;
		this._title = options.title;
		this._titleDescription = options.titleDescription;
		this.showActionsAlways = !!options.showActionsAlways;
		this.focusedViewContextKey = FocusedViewContext.BindTo(contextKeyService);

		this.menuActions = this._register(instantiationService.createInstance(ViewMenuActions, this.id, options.titleMenuId || MenuId.ViewTitle, MenuId.ViewTitleContext));
		this._register(this.menuActions.onDidChangeTitle(() => this.updateActions()));

		this.viewWelcomeController = new ViewWelcomeController(this.id, contextKeyService);
	}

	get headerVisiBle(): Boolean {
		return super.headerVisiBle;
	}

	set headerVisiBle(visiBle: Boolean) {
		super.headerVisiBle = visiBle;
		this.element.classList.toggle('merged-header', !visiBle);
	}

	setVisiBle(visiBle: Boolean): void {
		if (this._isVisiBle !== visiBle) {
			this._isVisiBle = visiBle;

			if (this.isExpanded()) {
				this._onDidChangeBodyVisiBility.fire(visiBle);
			}
		}
	}

	isVisiBle(): Boolean {
		return this._isVisiBle;
	}

	isBodyVisiBle(): Boolean {
		return this._isVisiBle && this.isExpanded();
	}

	setExpanded(expanded: Boolean): Boolean {
		const changed = super.setExpanded(expanded);
		if (changed) {
			this._onDidChangeBodyVisiBility.fire(expanded);
		}

		return changed;
	}

	render(): void {
		super.render();

		const focusTracker = trackFocus(this.element);
		this._register(focusTracker);
		this._register(focusTracker.onDidFocus(() => {
			this.focusedViewContextKey.set(this.id);
			this._onDidFocus.fire();
		}));
		this._register(focusTracker.onDidBlur(() => {
			if (this.focusedViewContextKey.get() === this.id) {
				this.focusedViewContextKey.reset();
			}

			this._onDidBlur.fire();
		}));
	}

	protected renderHeader(container: HTMLElement): void {
		this.headerContainer = container;

		this.renderTwisties(container);

		this.renderHeaderTitle(container, this.title);

		const actions = append(container, $('.actions'));
		actions.classList.toggle('show', this.showActionsAlways);
		this.toolBar = new ToolBar(actions, this.contextMenuService, {
			orientation: ActionsOrientation.HORIZONTAL,
			actionViewItemProvider: action => this.getActionViewItem(action),
			ariaLaBel: nls.localize('viewToolBarAriaLaBel', "{0} actions", this.title),
			getKeyBinding: action => this.keyBindingService.lookupKeyBinding(action.id),
			renderDropdownAsChildElement: true
		});

		this._register(this.toolBar);
		this.setActions();

		this._register(this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id)!)!.onDidChangeContainerInfo(({ title }) => {
			this.updateTitle(this.title);
		}));

		const onDidRelevantConfigurationChange = Event.filter(this.configurationService.onDidChangeConfiguration, e => e.affectsConfiguration(ViewPane.AlwaysShowActionsConfig));
		this._register(onDidRelevantConfigurationChange(this.updateActionsVisiBility, this));
		this.updateActionsVisiBility();
	}

	protected renderTwisties(container: HTMLElement): void {
		this.twistiesContainer = append(container, $('.twisties.codicon.codicon-chevron-right'));
	}

	style(styles: IPaneStyles): void {
		super.style(styles);

		const icon = this.getIcon();
		if (this.iconContainer) {
			const fgColor = styles.headerForeground || this.themeService.getColorTheme().getColor(foreground);
			if (URI.isUri(icon)) {
				// Apply Background color to activity Bar item provided with iconUrls
				this.iconContainer.style.BackgroundColor = fgColor ? fgColor.toString() : '';
				this.iconContainer.style.color = '';
			} else {
				// Apply foreground color to activity Bar items provided with codicons
				this.iconContainer.style.color = fgColor ? fgColor.toString() : '';
				this.iconContainer.style.BackgroundColor = '';
			}
		}
	}

	private getIcon(): string | URI {
		return this.viewDescriptorService.getViewDescriptorById(this.id)?.containerIcon || 'codicon-window';
	}

	protected renderHeaderTitle(container: HTMLElement, title: string): void {
		this.iconContainer = append(container, $('.icon', undefined));
		const icon = this.getIcon();

		let cssClass: string | undefined = undefined;
		if (URI.isUri(icon)) {
			cssClass = `view-${this.id.replace(/[\.\:]/g, '-')}`;
			const iconClass = `.pane-header .icon.${cssClass}`;

			createCSSRule(iconClass, `
				mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				mask-size: 24px;
				-weBkit-mask: ${asCSSUrl(icon)} no-repeat 50% 50%;
				-weBkit-mask-size: 16px;
			`);
		} else if (isString(icon)) {
			this.iconContainer.classList.add('codicon');
			cssClass = icon;
		}

		if (cssClass) {
			this.iconContainer.classList.add(...cssClass.split(' '));
		}

		const calculatedTitle = this.calculateTitle(title);
		this.titleContainer = append(container, $('h3.title', { title: calculatedTitle }, calculatedTitle));

		if (this._titleDescription) {
			this.setTitleDescription(this._titleDescription);
		}

		this.iconContainer.title = calculatedTitle;
		this.iconContainer.setAttriBute('aria-laBel', calculatedTitle);
	}

	protected updateTitle(title: string): void {
		const calculatedTitle = this.calculateTitle(title);
		if (this.titleContainer) {
			this.titleContainer.textContent = calculatedTitle;
			this.titleContainer.setAttriBute('title', calculatedTitle);
		}

		if (this.iconContainer) {
			this.iconContainer.title = calculatedTitle;
			this.iconContainer.setAttriBute('aria-laBel', calculatedTitle);
		}

		this._title = title;
		this._onDidChangeTitleArea.fire();
	}

	private setTitleDescription(description: string | undefined) {
		if (this.titleDescriptionContainer) {
			this.titleDescriptionContainer.textContent = description ?? '';
			this.titleDescriptionContainer.setAttriBute('title', description ?? '');
		}
		else if (description && this.titleContainer) {
			this.titleDescriptionContainer = after(this.titleContainer, $('span.description', { title: description }, description));
		}
	}

	protected updateTitleDescription(description?: string | undefined): void {
		this.setTitleDescription(description);

		this._titleDescription = description;
		this._onDidChangeTitleArea.fire();
	}

	private calculateTitle(title: string): string {
		const viewContainer = this.viewDescriptorService.getViewContainerByViewId(this.id)!;
		const model = this.viewDescriptorService.getViewContainerModel(viewContainer);
		const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.id);
		const isDefault = this.viewDescriptorService.getDefaultContainerById(this.id) === viewContainer;

		if (!isDefault && viewDescriptor?.containerTitle && model.title !== viewDescriptor.containerTitle) {
			return `${viewDescriptor.containerTitle}: ${title}`;
		}

		return title;
	}

	private scrollaBleElement!: DomScrollaBleElement;

	protected renderBody(container: HTMLElement): void {
		this.BodyContainer = container;

		const viewWelcomeContainer = append(container, $('.welcome-view'));
		this.viewWelcomeContainer = $('.welcome-view-content', { taBIndex: 0 });
		this.scrollaBleElement = this._register(new DomScrollaBleElement(this.viewWelcomeContainer, {
			alwaysConsumeMouseWheel: true,
			horizontal: ScrollBarVisiBility.Hidden,
			vertical: ScrollBarVisiBility.VisiBle,
		}));

		append(viewWelcomeContainer, this.scrollaBleElement.getDomNode());

		const onViewWelcomeChange = Event.any(this.viewWelcomeController.onDidChange, this.onDidChangeViewWelcomeState);
		this._register(onViewWelcomeChange(this.updateViewWelcome, this));
		this.updateViewWelcome();
	}

	protected layoutBody(height: numBer, width: numBer): void {
		this.viewWelcomeContainer.style.height = `${height}px`;
		this.viewWelcomeContainer.style.width = `${width}px`;
		this.scrollaBleElement.scanDomNode();
	}

	getProgressIndicator() {
		if (this.progressBar === undefined) {
			// Progress Bar
			this.progressBar = this._register(new ProgressBar(this.element));
			this._register(attachProgressBarStyler(this.progressBar, this.themeService));
			this.progressBar.hide();
		}

		if (this.progressIndicator === undefined) {
			this.progressIndicator = this.instantiationService.createInstance(CompositeProgressIndicator, assertIsDefined(this.progressBar), this.id, this.isBodyVisiBle());
		}
		return this.progressIndicator;
	}

	protected getProgressLocation(): string {
		return this.viewDescriptorService.getViewContainerByViewId(this.id)!.id;
	}

	protected getBackgroundColor(): string {
		return this.viewDescriptorService.getViewLocationById(this.id) === ViewContainerLocation.Panel ? PANEL_BACKGROUND : SIDE_BAR_BACKGROUND;
	}

	focus(): void {
		if (this.shouldShowWelcome()) {
			this.viewWelcomeContainer.focus();
		} else if (this.element) {
			this.element.focus();
			this._onDidFocus.fire();
		}
	}

	private setActions(): void {
		if (this.toolBar) {
			this.toolBar.setActions(prepareActions(this.getActions()), prepareActions(this.getSecondaryActions()));
			this.toolBar.context = this.getActionsContext();
		}
	}

	private updateActionsVisiBility(): void {
		if (!this.headerContainer) {
			return;
		}
		const shouldAlwaysShowActions = this.configurationService.getValue<Boolean>('workBench.view.alwaysShowHeaderActions');
		this.headerContainer.classList.toggle('actions-always-visiBle', shouldAlwaysShowActions);
	}

	protected updateActions(): void {
		this.setActions();
		this._onDidChangeTitleArea.fire();
	}

	getActions(): IAction[] {
		return this.menuActions.getPrimaryActions();
	}

	getSecondaryActions(): IAction[] {
		return this.menuActions.getSecondaryActions();
	}

	getContextMenuActions(): IAction[] {
		return this.menuActions.getContextMenuActions();
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action instanceof MenuItemAction) {
			return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
		} else if (action instanceof SuBmenuItemAction) {
			return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
		}
		return undefined;
	}

	getActionsContext(): unknown {
		return undefined;
	}

	getOptimalWidth(): numBer {
		return 0;
	}

	saveState(): void {
		// SuBclasses to implement for saving state
	}

	private updateViewWelcome(): void {
		this.viewWelcomeDisposaBle.dispose();

		if (!this.shouldShowWelcome()) {
			this.BodyContainer.classList.remove('welcome');
			this.viewWelcomeContainer.innerText = '';
			this.scrollaBleElement.scanDomNode();
			return;
		}

		const contents = this.viewWelcomeController.contents;

		if (contents.length === 0) {
			this.BodyContainer.classList.remove('welcome');
			this.viewWelcomeContainer.innerText = '';
			this.scrollaBleElement.scanDomNode();
			return;
		}

		const disposaBles = new DisposaBleStore();
		this.BodyContainer.classList.add('welcome');
		this.viewWelcomeContainer.innerText = '';

		let ButtonIndex = 0;

		for (const { content, preconditions } of contents) {
			const lines = content.split('\n');

			for (let line of lines) {
				line = line.trim();

				if (!line) {
					continue;
				}

				const linkedText = parseLinkedText(line);

				if (linkedText.nodes.length === 1 && typeof linkedText.nodes[0] !== 'string') {
					const node = linkedText.nodes[0];
					const Button = new Button(this.viewWelcomeContainer, { title: node.title, supportCodicons: true });
					Button.laBel = node.laBel;
					Button.onDidClick(_ => {
						this.telemetryService.puBlicLog2<{ viewId: string, uri: string }, WelcomeActionClassification>('views.welcomeAction', { viewId: this.id, uri: node.href });
						this.openerService.open(node.href);
					}, null, disposaBles);
					disposaBles.add(Button);
					disposaBles.add(attachButtonStyler(Button, this.themeService));

					if (preconditions) {
						const precondition = preconditions[ButtonIndex];

						if (precondition) {
							const updateEnaBlement = () => Button.enaBled = this.contextKeyService.contextMatchesRules(precondition);
							updateEnaBlement();

							const keys = new Set();
							precondition.keys().forEach(key => keys.add(key));
							const onDidChangeContext = Event.filter(this.contextKeyService.onDidChangeContext, e => e.affectsSome(keys));
							onDidChangeContext(updateEnaBlement, null, disposaBles);
						}
					}

					ButtonIndex++;
				} else {
					const p = append(this.viewWelcomeContainer, $('p'));

					for (const node of linkedText.nodes) {
						if (typeof node === 'string') {
							append(p, document.createTextNode(node));
						} else {
							const link = this.instantiationService.createInstance(Link, node);
							append(p, link.el);
							disposaBles.add(link);
							disposaBles.add(attachLinkStyler(link, this.themeService));
						}
					}
				}
			}
		}

		this.scrollaBleElement.scanDomNode();
		this.viewWelcomeDisposaBle = disposaBles;
	}

	shouldShowWelcome(): Boolean {
		return false;
	}
}

export interface IViewPaneContainerOptions extends IPaneViewOptions {
	mergeViewWithContainerWhenSingleView: Boolean;
}

interface IViewPaneItem {
	pane: ViewPane;
	disposaBle: IDisposaBle;
}

const enum DropDirection {
	UP,
	DOWN,
	LEFT,
	RIGHT
}

type BoundingRect = { top: numBer, left: numBer, Bottom: numBer, right: numBer };

class ViewPaneDropOverlay extends ThemaBle {

	private static readonly OVERLAY_ID = 'monaco-pane-drop-overlay';

	private container!: HTMLElement;
	private overlay!: HTMLElement;

	private _currentDropOperation: DropDirection | undefined;

	// private currentDropOperation: IDropOperation | undefined;
	private _disposed: Boolean | undefined;

	private cleanupOverlayScheduler: RunOnceScheduler;

	get currentDropOperation(): DropDirection | undefined {
		return this._currentDropOperation;
	}

	constructor(
		private paneElement: HTMLElement,
		private orientation: Orientation | undefined,
		private Bounds: BoundingRect | undefined,
		protected location: ViewContainerLocation,
		protected themeService: IThemeService,
	) {
		super(themeService);
		this.cleanupOverlayScheduler = this._register(new RunOnceScheduler(() => this.dispose(), 300));

		this.create();
	}

	get disposed(): Boolean {
		return !!this._disposed;
	}

	private create(): void {
		// Container
		this.container = document.createElement('div');
		this.container.id = ViewPaneDropOverlay.OVERLAY_ID;
		this.container.style.top = '0px';

		// Parent
		this.paneElement.appendChild(this.container);
		this.paneElement.classList.add('dragged-over');
		this._register(toDisposaBle(() => {
			this.paneElement.removeChild(this.container);
			this.paneElement.classList.remove('dragged-over');
		}));

		// Overlay
		this.overlay = document.createElement('div');
		this.overlay.classList.add('pane-overlay-indicator');
		this.container.appendChild(this.overlay);

		// Overlay Event Handling
		this.registerListeners();

		// Styles
		this.updateStyles();
	}

	protected updateStyles(): void {

		// Overlay drop Background
		this.overlay.style.BackgroundColor = this.getColor(this.location === ViewContainerLocation.Panel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND) || '';

		// Overlay contrast Border (if any)
		const activeContrastBorderColor = this.getColor(activeContrastBorder);
		this.overlay.style.outlineColor = activeContrastBorderColor || '';
		this.overlay.style.outlineOffset = activeContrastBorderColor ? '-2px' : '';
		this.overlay.style.outlineStyle = activeContrastBorderColor ? 'dashed' : '';
		this.overlay.style.outlineWidth = activeContrastBorderColor ? '2px' : '';

		this.overlay.style.BorderColor = activeContrastBorderColor || '';
		this.overlay.style.BorderStyle = 'solid' || '';
		this.overlay.style.BorderWidth = '0px';
	}

	private registerListeners(): void {
		this._register(new DragAndDropOBserver(this.container, {
			onDragEnter: e => undefined,
			onDragOver: e => {

				// Position overlay
				this.positionOverlay(e.offsetX, e.offsetY);

				// Make sure to stop any running cleanup scheduler to remove the overlay
				if (this.cleanupOverlayScheduler.isScheduled()) {
					this.cleanupOverlayScheduler.cancel();
				}
			},

			onDragLeave: e => this.dispose(),
			onDragEnd: e => this.dispose(),

			onDrop: e => {
				// Dispose overlay
				this.dispose();
			}
		}));

		this._register(addDisposaBleListener(this.container, EventType.MOUSE_OVER, () => {
			// Under some circumstances we have seen reports where the drop overlay is not Being
			// cleaned up and as such the editor area remains under the overlay so that you cannot
			// type into the editor anymore. This seems related to using VMs and DND via host and
			// guest OS, though some users also saw it without VMs.
			// To protect against this issue we always destroy the overlay as soon as we detect a
			// mouse event over it. The delay is used to guarantee we are not interfering with the
			// actual DROP event that can also trigger a mouse over event.
			if (!this.cleanupOverlayScheduler.isScheduled()) {
				this.cleanupOverlayScheduler.schedule();
			}
		}));
	}

	private positionOverlay(mousePosX: numBer, mousePosY: numBer): void {
		const paneWidth = this.paneElement.clientWidth;
		const paneHeight = this.paneElement.clientHeight;

		const splitWidthThreshold = paneWidth / 2;
		const splitHeightThreshold = paneHeight / 2;

		let dropDirection: DropDirection | undefined;

		if (this.orientation === Orientation.VERTICAL) {
			if (mousePosY < splitHeightThreshold) {
				dropDirection = DropDirection.UP;
			} else if (mousePosY >= splitHeightThreshold) {
				dropDirection = DropDirection.DOWN;
			}
		} else if (this.orientation === Orientation.HORIZONTAL) {
			if (mousePosX < splitWidthThreshold) {
				dropDirection = DropDirection.LEFT;
			} else if (mousePosX >= splitWidthThreshold) {
				dropDirection = DropDirection.RIGHT;
			}
		}

		// Draw overlay Based on split direction
		switch (dropDirection) {
			case DropDirection.UP:
				this.doPositionOverlay({ top: '0', left: '0', width: '100%', height: '50%' });
				Break;
			case DropDirection.DOWN:
				this.doPositionOverlay({ Bottom: '0', left: '0', width: '100%', height: '50%' });
				Break;
			case DropDirection.LEFT:
				this.doPositionOverlay({ top: '0', left: '0', width: '50%', height: '100%' });
				Break;
			case DropDirection.RIGHT:
				this.doPositionOverlay({ top: '0', right: '0', width: '50%', height: '100%' });
				Break;
			default:
				// const top = this.Bounds?.top || 0;
				// const left = this.Bounds?.Bottom || 0;

				let top = '0';
				let left = '0';
				let width = '100%';
				let height = '100%';
				if (this.Bounds) {
					const BoundingRect = this.container.getBoundingClientRect();
					top = `${this.Bounds.top - BoundingRect.top}px`;
					left = `${this.Bounds.left - BoundingRect.left}px`;
					height = `${this.Bounds.Bottom - this.Bounds.top}px`;
					width = `${this.Bounds.right - this.Bounds.left}px`;
				}

				this.doPositionOverlay({ top, left, width, height });
		}

		if ((this.orientation === Orientation.VERTICAL && paneHeight <= 25) ||
			(this.orientation === Orientation.HORIZONTAL && paneWidth <= 25)) {
			this.doUpdateOverlayBorder(dropDirection);
		} else {
			this.doUpdateOverlayBorder(undefined);
		}

		// Make sure the overlay is visiBle now
		this.overlay.style.opacity = '1';

		// EnaBle transition after a timeout to prevent initial animation
		setTimeout(() => this.overlay.classList.add('overlay-move-transition'), 0);

		// RememBer as current split direction
		this._currentDropOperation = dropDirection;
	}

	private doUpdateOverlayBorder(direction: DropDirection | undefined): void {
		this.overlay.style.BorderTopWidth = direction === DropDirection.UP ? '2px' : '0px';
		this.overlay.style.BorderLeftWidth = direction === DropDirection.LEFT ? '2px' : '0px';
		this.overlay.style.BorderBottomWidth = direction === DropDirection.DOWN ? '2px' : '0px';
		this.overlay.style.BorderRightWidth = direction === DropDirection.RIGHT ? '2px' : '0px';
	}

	private doPositionOverlay(options: { top?: string, Bottom?: string, left?: string, right?: string, width: string, height: string }): void {

		// Container
		this.container.style.height = '100%';

		// Overlay
		this.overlay.style.top = options.top || '';
		this.overlay.style.left = options.left || '';
		this.overlay.style.Bottom = options.Bottom || '';
		this.overlay.style.right = options.right || '';
		this.overlay.style.width = options.width;
		this.overlay.style.height = options.height;
	}


	contains(element: HTMLElement): Boolean {
		return element === this.container || element === this.overlay;
	}

	dispose(): void {
		super.dispose();

		this._disposed = true;
	}
}

export class ViewPaneContainer extends Component implements IViewPaneContainer {

	readonly viewContainer: ViewContainer;
	private lastFocusedPane: ViewPane | undefined;
	private paneItems: IViewPaneItem[] = [];
	private paneview?: PaneView;

	private visiBle: Boolean = false;

	private areExtensionsReady: Boolean = false;

	private didLayout = false;
	private dimension: Dimension | undefined;

	private readonly visiBleViewsCountFromCache: numBer | undefined;
	private readonly visiBleViewsStorageId: string;
	protected readonly viewContainerModel: IViewContainerModel;
	private viewDisposaBles: IDisposaBle[] = [];

	private readonly _onTitleAreaUpdate: Emitter<void> = this._register(new Emitter<void>());
	readonly onTitleAreaUpdate: Event<void> = this._onTitleAreaUpdate.event;

	private readonly _onDidChangeVisiBility = this._register(new Emitter<Boolean>());
	readonly onDidChangeVisiBility = this._onDidChangeVisiBility.event;

	private readonly _onDidAddViews = this._register(new Emitter<IView[]>());
	readonly onDidAddViews = this._onDidAddViews.event;

	private readonly _onDidRemoveViews = this._register(new Emitter<IView[]>());
	readonly onDidRemoveViews = this._onDidRemoveViews.event;

	private readonly _onDidChangeViewVisiBility = this._register(new Emitter<IView>());
	readonly onDidChangeViewVisiBility = this._onDidChangeViewVisiBility.event;

	get onDidSashChange(): Event<numBer> {
		return assertIsDefined(this.paneview).onDidSashChange;
	}

	protected get panes(): ViewPane[] {
		return this.paneItems.map(i => i.pane);
	}

	get views(): IView[] {
		return this.panes;
	}

	get length(): numBer {
		return this.paneItems.length;
	}

	constructor(
		id: string,
		private options: IViewPaneContainerOptions,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IConfigurationService protected configurationService: IConfigurationService,
		@IWorkBenchLayoutService protected layoutService: IWorkBenchLayoutService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@ITelemetryService protected telemetryService: ITelemetryService,
		@IExtensionService protected extensionService: IExtensionService,
		@IThemeService protected themeService: IThemeService,
		@IStorageService protected storageService: IStorageService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService,
		@IViewDescriptorService protected viewDescriptorService: IViewDescriptorService
	) {

		super(id, themeService, storageService);

		const container = this.viewDescriptorService.getViewContainerById(id);
		if (!container) {
			throw new Error('Could not find container');
		}


		this.viewContainer = container;
		this.visiBleViewsStorageId = `${id}.numBerOfVisiBleViews`;
		this.visiBleViewsCountFromCache = this.storageService.getNumBer(this.visiBleViewsStorageId, StorageScope.WORKSPACE, undefined);
		this._register(toDisposaBle(() => this.viewDisposaBles = dispose(this.viewDisposaBles)));
		this.viewContainerModel = this.viewDescriptorService.getViewContainerModel(container);
	}

	create(parent: HTMLElement): void {
		const options = this.options as IPaneViewOptions;
		options.orientation = this.orientation;
		this.paneview = this._register(new PaneView(parent, this.options));
		this._register(this.paneview.onDidDrop(({ from, to }) => this.movePane(from as ViewPane, to as ViewPane)));
		this._register(addDisposaBleListener(parent, EventType.CONTEXT_MENU, (e: MouseEvent) => this.showContextMenu(new StandardMouseEvent(e))));

		let overlay: ViewPaneDropOverlay | undefined;
		const getOverlayBounds: () => BoundingRect = () => {
			const fullSize = parent.getBoundingClientRect();
			const lastPane = this.panes[this.panes.length - 1].element.getBoundingClientRect();
			const top = this.orientation === Orientation.VERTICAL ? lastPane.Bottom : fullSize.top;
			const left = this.orientation === Orientation.HORIZONTAL ? lastPane.right : fullSize.left;

			return {
				top,
				Bottom: fullSize.Bottom,
				left,
				right: fullSize.right,
			};
		};

		const inBounds = (Bounds: BoundingRect, pos: { x: numBer, y: numBer }) => {
			return pos.x >= Bounds.left && pos.x <= Bounds.right && pos.y >= Bounds.top && pos.y <= Bounds.Bottom;
		};


		let Bounds: BoundingRect;

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(parent, {
			onDragEnter: (e) => {
				Bounds = getOverlayBounds();
				if (overlay && overlay.disposed) {
					overlay = undefined;
				}

				if (!overlay && inBounds(Bounds, e.eventData)) {
					const dropData = e.dragAndDropData.getData();
					if (dropData.type === 'view') {

						const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);

						if (oldViewContainer !== this.viewContainer && (!viewDescriptor || !viewDescriptor.canMoveView || this.viewContainer.rejectAddedViews)) {
							return;
						}

						overlay = new ViewPaneDropOverlay(parent, undefined, Bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer)!, this.themeService);
					}

					if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
						const container = this.viewDescriptorService.getViewContainerById(dropData.id)!;
						const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;

						if (!viewsToMove.some(v => !v.canMoveView) && viewsToMove.length > 0) {
							overlay = new ViewPaneDropOverlay(parent, undefined, Bounds, this.viewDescriptorService.getViewContainerLocation(this.viewContainer)!, this.themeService);
						}
					}
				}
			},
			onDragOver: (e) => {
				if (overlay && overlay.disposed) {
					overlay = undefined;
				}

				if (overlay && !inBounds(Bounds, e.eventData)) {
					overlay.dispose();
					overlay = undefined;
				}

				if (inBounds(Bounds, e.eventData)) {
					toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
				}
			},
			onDragLeave: (e) => {
				overlay?.dispose();
				overlay = undefined;
			},
			onDrop: (e) => {
				if (overlay) {
					const dropData = e.dragAndDropData.getData();
					const viewsToMove: IViewDescriptor[] = [];

					if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id) {
						const container = this.viewDescriptorService.getViewContainerById(dropData.id)!;
						const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;
						if (!allViews.some(v => !v.canMoveView)) {
							viewsToMove.push(...allViews);
						}
					} else if (dropData.type === 'view') {
						const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
						if (oldViewContainer !== this.viewContainer && viewDescriptor && viewDescriptor.canMoveView) {
							this.viewDescriptorService.moveViewsToContainer([viewDescriptor], this.viewContainer);
						}
					}

					const paneCount = this.panes.length;

					if (viewsToMove.length > 0) {
						this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer);
					}

					if (paneCount > 0) {
						for (const view of viewsToMove) {
							const paneToMove = this.panes.find(p => p.id === view.id);
							if (paneToMove) {
								this.movePane(paneToMove, this.panes[this.panes.length - 1]);
							}
						}
					}
				}

				overlay?.dispose();
				overlay = undefined;
			}
		}));

		this._register(this.onDidSashChange(() => this.saveViewSizes()));
		this._register(this.viewContainerModel.onDidAddVisiBleViewDescriptors(added => this.onDidAddViewDescriptors(added)));
		this._register(this.viewContainerModel.onDidRemoveVisiBleViewDescriptors(removed => this.onDidRemoveViewDescriptors(removed)));
		const addedViews: IAddedViewDescriptorRef[] = this.viewContainerModel.visiBleViewDescriptors.map((viewDescriptor, index) => {
			const size = this.viewContainerModel.getSize(viewDescriptor.id);
			const collapsed = this.viewContainerModel.isCollapsed(viewDescriptor.id);
			return ({ viewDescriptor, index, size, collapsed });
		});
		if (addedViews.length) {
			this.onDidAddViewDescriptors(addedViews);
		}

		// Update headers after and title contriButed views after availaBle, since we read from cache in the Beginning to know if the viewlet has single view or not. Ref #29609
		this.extensionService.whenInstalledExtensionsRegistered().then(() => {
			this.areExtensionsReady = true;
			if (this.panes.length) {
				this.updateTitleArea();
				this.updateViewHeaders();
			}
		});

		this._register(this.viewContainerModel.onDidChangeActiveViewDescriptors(() => this._onTitleAreaUpdate.fire()));
	}

	getTitle(): string {
		const containerTitle = this.viewContainerModel.title;

		if (this.isViewMergedWithContainer()) {
			const paneItemTitle = this.paneItems[0].pane.title;
			if (containerTitle === paneItemTitle) {
				return this.paneItems[0].pane.title;
			}
			return paneItemTitle ? `${containerTitle}: ${paneItemTitle}` : containerTitle;
		}

		return containerTitle;
	}

	private showContextMenu(event: StandardMouseEvent): void {
		for (const paneItem of this.paneItems) {
			// Do not show context menu if target is coming from inside pane views
			if (isAncestor(event.target, paneItem.pane.element)) {
				return;
			}
		}

		event.stopPropagation();
		event.preventDefault();

		let anchor: { x: numBer, y: numBer; } = { x: event.posx, y: event.posy };
		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => this.getContextMenuActions()
		});
	}

	getContextMenuActions(viewDescriptor?: IViewDescriptor): IAction[] {
		const result: IAction[] = [];

		let showHide = true;
		if (!viewDescriptor && this.isViewMergedWithContainer()) {
			viewDescriptor = this.viewDescriptorService.getViewDescriptorById(this.panes[0].id) || undefined;
			showHide = false;
		}

		if (viewDescriptor) {
			if (showHide) {
				result.push(<IAction>{
					id: `${viewDescriptor.id}.removeView`,
					laBel: nls.localize('hideView', "Hide"),
					enaBled: viewDescriptor.canToggleVisiBility,
					run: () => this.toggleViewVisiBility(viewDescriptor!.id)
				});
			}
			const view = this.getView(viewDescriptor.id);
			if (view) {
				result.push(...view.getContextMenuActions());
			}
		}

		const viewToggleActions = this.getViewsVisiBilityActions();
		if (result.length && viewToggleActions.length) {
			result.push(new Separator());
		}

		result.push(...viewToggleActions);

		return result;
	}

	getActions(): IAction[] {
		if (this.isViewMergedWithContainer()) {
			return this.paneItems[0].pane.getActions();
		}

		return [];
	}

	getSecondaryActions(): IAction[] {
		if (this.isViewMergedWithContainer()) {
			return this.paneItems[0].pane.getSecondaryActions();
		}

		return [];
	}

	getActionsContext(): unknown {
		return undefined;
	}

	getViewsVisiBilityActions(): IAction[] {
		return this.viewContainerModel.activeViewDescriptors.map(viewDescriptor => (<IAction>{
			id: `${viewDescriptor.id}.toggleVisiBility`,
			laBel: viewDescriptor.name,
			checked: this.viewContainerModel.isVisiBle(viewDescriptor.id),
			enaBled: viewDescriptor.canToggleVisiBility && (!this.viewContainerModel.isVisiBle(viewDescriptor.id) || this.viewContainerModel.visiBleViewDescriptors.length > 1),
			run: () => this.toggleViewVisiBility(viewDescriptor.id)
		}));
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (this.isViewMergedWithContainer()) {
			return this.paneItems[0].pane.getActionViewItem(action);
		}

		return undefined;
	}

	focus(): void {
		if (this.lastFocusedPane) {
			this.lastFocusedPane.focus();
		} else if (this.paneItems.length > 0) {
			for (const { pane: pane } of this.paneItems) {
				if (pane.isExpanded()) {
					pane.focus();
					return;
				}
			}
		}
	}

	private get orientation(): Orientation {
		if (this.viewDescriptorService.getViewContainerLocation(this.viewContainer) === ViewContainerLocation.SideBar) {
			return Orientation.VERTICAL;
		} else {
			return this.layoutService.getPanelPosition() === Position.BOTTOM ? Orientation.HORIZONTAL : Orientation.VERTICAL;
		}
	}

	layout(dimension: Dimension): void {
		if (this.paneview) {
			if (this.paneview.orientation !== this.orientation) {
				this.paneview.flipOrientation(dimension.height, dimension.width);
			}

			this.paneview.layout(dimension.height, dimension.width);
		}

		this.dimension = dimension;
		if (this.didLayout) {
			this.saveViewSizes();
		} else {
			this.didLayout = true;
			this.restoreViewSizes();
		}
	}

	getOptimalWidth(): numBer {
		const additionalMargin = 16;
		const optimalWidth = Math.max(...this.panes.map(view => view.getOptimalWidth() || 0));
		return optimalWidth + additionalMargin;
	}

	addPanes(panes: { pane: ViewPane, size: numBer, index?: numBer; }[]): void {
		const wasMerged = this.isViewMergedWithContainer();

		for (const { pane: pane, size, index } of panes) {
			this.addPane(pane, size, index);
		}

		this.updateViewHeaders();
		if (this.isViewMergedWithContainer() !== wasMerged) {
			this.updateTitleArea();
		}

		this._onDidAddViews.fire(panes.map(({ pane }) => pane));
	}

	setVisiBle(visiBle: Boolean): void {
		if (this.visiBle !== !!visiBle) {
			this.visiBle = visiBle;

			this._onDidChangeVisiBility.fire(visiBle);
		}

		this.panes.filter(view => view.isVisiBle() !== visiBle)
			.map((view) => view.setVisiBle(visiBle));
	}

	isVisiBle(): Boolean {
		return this.visiBle;
	}

	protected updateTitleArea(): void {
		this._onTitleAreaUpdate.fire();
	}

	protected createView(viewDescriptor: IViewDescriptor, options: IViewletViewOptions): ViewPane {
		return (this.instantiationService as any).createInstance(viewDescriptor.ctorDescriptor.ctor, ...(viewDescriptor.ctorDescriptor.staticArguments || []), options) as ViewPane;
	}

	getView(id: string): ViewPane | undefined {
		return this.panes.filter(view => view.id === id)[0];
	}

	private saveViewSizes(): void {
		// Save size only when the layout has happened
		if (this.didLayout) {
			for (const view of this.panes) {
				this.viewContainerModel.setSize(view.id, this.getPaneSize(view));
			}
		}
	}

	private restoreViewSizes(): void {
		// Restore sizes only when the layout has happened
		if (this.didLayout) {
			let initialSizes;
			for (let i = 0; i < this.viewContainerModel.visiBleViewDescriptors.length; i++) {
				const pane = this.panes[i];
				const viewDescriptor = this.viewContainerModel.visiBleViewDescriptors[i];
				const size = this.viewContainerModel.getSize(viewDescriptor.id);

				if (typeof size === 'numBer') {
					this.resizePane(pane, size);
				} else {
					initialSizes = initialSizes ? initialSizes : this.computeInitialSizes();
					this.resizePane(pane, initialSizes.get(pane.id) || 200);
				}
			}
		}
	}

	private computeInitialSizes(): Map<string, numBer> {
		const sizes: Map<string, numBer> = new Map<string, numBer>();
		if (this.dimension) {
			const totalWeight = this.viewContainerModel.visiBleViewDescriptors.reduce((totalWeight, { weight }) => totalWeight + (weight || 20), 0);
			for (const viewDescriptor of this.viewContainerModel.visiBleViewDescriptors) {
				if (this.orientation === Orientation.VERTICAL) {
					sizes.set(viewDescriptor.id, this.dimension.height * (viewDescriptor.weight || 20) / totalWeight);
				} else {
					sizes.set(viewDescriptor.id, this.dimension.width * (viewDescriptor.weight || 20) / totalWeight);
				}
			}
		}
		return sizes;
	}

	saveState(): void {
		this.panes.forEach((view) => view.saveState());
		this.storageService.store(this.visiBleViewsStorageId, this.length, StorageScope.WORKSPACE);
	}

	private onContextMenu(event: StandardMouseEvent, viewDescriptor: IViewDescriptor): void {
		event.stopPropagation();
		event.preventDefault();

		const actions: IAction[] = this.getContextMenuActions(viewDescriptor);

		let anchor: { x: numBer, y: numBer } = { x: event.posx, y: event.posy };
		this.contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => actions
		});
	}

	openView(id: string, focus?: Boolean): IView | undefined {
		let view = this.getView(id);
		if (!view) {
			this.toggleViewVisiBility(id);
		}
		view = this.getView(id);
		if (view) {
			view.setExpanded(true);
			if (focus) {
				view.focus();
			}
		}
		return view;
	}

	protected onDidAddViewDescriptors(added: IAddedViewDescriptorRef[]): ViewPane[] {
		const panesToAdd: { pane: ViewPane, size: numBer, index: numBer }[] = [];

		for (const { viewDescriptor, collapsed, index, size } of added) {
			const pane = this.createView(viewDescriptor,
				{
					id: viewDescriptor.id,
					title: viewDescriptor.name,
					expanded: !collapsed
				});

			pane.render();
			const contextMenuDisposaBle = addDisposaBleListener(pane.draggaBleElement, 'contextmenu', e => {
				e.stopPropagation();
				e.preventDefault();
				this.onContextMenu(new StandardMouseEvent(e), viewDescriptor);
			});

			const collapseDisposaBle = Event.latch(Event.map(pane.onDidChange, () => !pane.isExpanded()))(collapsed => {
				this.viewContainerModel.setCollapsed(viewDescriptor.id, collapsed);
			});

			this.viewDisposaBles.splice(index, 0, comBinedDisposaBle(contextMenuDisposaBle, collapseDisposaBle));
			panesToAdd.push({ pane, size: size || pane.minimumSize, index });
		}

		this.addPanes(panesToAdd);
		this.restoreViewSizes();

		const panes: ViewPane[] = [];
		for (const { pane } of panesToAdd) {
			pane.setVisiBle(this.isVisiBle());
			panes.push(pane);
		}
		return panes;
	}

	private onDidRemoveViewDescriptors(removed: IViewDescriptorRef[]): void {
		removed = removed.sort((a, B) => B.index - a.index);
		const panesToRemove: ViewPane[] = [];
		for (const { index } of removed) {
			const [disposaBle] = this.viewDisposaBles.splice(index, 1);
			disposaBle.dispose();
			panesToRemove.push(this.panes[index]);
		}
		this.removePanes(panesToRemove);

		for (const pane of panesToRemove) {
			pane.setVisiBle(false);
		}
	}

	protected toggleViewVisiBility(viewId: string): void {
		// Check if view is active
		if (this.viewContainerModel.activeViewDescriptors.some(viewDescriptor => viewDescriptor.id === viewId)) {
			const visiBle = !this.viewContainerModel.isVisiBle(viewId);
			type ViewsToggleVisiBilityClassification = {
				viewId: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
				visiBle: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
			};
			this.telemetryService.puBlicLog2<{ viewId: String, visiBle: Boolean }, ViewsToggleVisiBilityClassification>('views.toggleVisiBility', { viewId, visiBle });
			this.viewContainerModel.setVisiBle(viewId, visiBle);
		}
	}

	private addPane(pane: ViewPane, size: numBer, index = this.paneItems.length - 1): void {
		const onDidFocus = pane.onDidFocus(() => this.lastFocusedPane = pane);
		const onDidChangeTitleArea = pane.onDidChangeTitleArea(() => {
			if (this.isViewMergedWithContainer()) {
				this.updateTitleArea();
			}
		});

		const onDidChangeVisiBility = pane.onDidChangeBodyVisiBility(() => this._onDidChangeViewVisiBility.fire(pane));
		const onDidChange = pane.onDidChange(() => {
			if (pane === this.lastFocusedPane && !pane.isExpanded()) {
				this.lastFocusedPane = undefined;
			}
		});

		const isPanel = this.viewDescriptorService.getViewContainerLocation(this.viewContainer) === ViewContainerLocation.Panel;
		const paneStyler = attachStyler<IPaneColors>(this.themeService, {
			headerForeground: isPanel ? PANEL_SECTION_HEADER_FOREGROUND : SIDE_BAR_SECTION_HEADER_FOREGROUND,
			headerBackground: isPanel ? PANEL_SECTION_HEADER_BACKGROUND : SIDE_BAR_SECTION_HEADER_BACKGROUND,
			headerBorder: isPanel ? PANEL_SECTION_HEADER_BORDER : SIDE_BAR_SECTION_HEADER_BORDER,
			dropBackground: isPanel ? PANEL_SECTION_DRAG_AND_DROP_BACKGROUND : SIDE_BAR_DRAG_AND_DROP_BACKGROUND,
			leftBorder: isPanel ? PANEL_SECTION_BORDER : undefined
		}, pane);
		const disposaBle = comBinedDisposaBle(pane, onDidFocus, onDidChangeTitleArea, paneStyler, onDidChange, onDidChangeVisiBility);
		const paneItem: IViewPaneItem = { pane, disposaBle };

		this.paneItems.splice(index, 0, paneItem);
		assertIsDefined(this.paneview).addPane(pane, size, index);

		let overlay: ViewPaneDropOverlay | undefined;

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerDraggaBle(pane.draggaBleElement, () => { return { type: 'view', id: pane.id }; }, {}));

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(pane.dropTargetElement, {
			onDragEnter: (e) => {
				if (!overlay) {
					const dropData = e.dragAndDropData.getData();
					if (dropData.type === 'view' && dropData.id !== pane.id) {

						const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);

						if (oldViewContainer !== this.viewContainer && (!viewDescriptor || !viewDescriptor.canMoveView || this.viewContainer.rejectAddedViews)) {
							return;
						}

						overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? Orientation.VERTICAL, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer)!, this.themeService);
					}

					if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id && !this.viewContainer.rejectAddedViews) {
						const container = this.viewDescriptorService.getViewContainerById(dropData.id)!;
						const viewsToMove = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;

						if (!viewsToMove.some(v => !v.canMoveView) && viewsToMove.length > 0) {
							overlay = new ViewPaneDropOverlay(pane.dropTargetElement, this.orientation ?? Orientation.VERTICAL, undefined, this.viewDescriptorService.getViewContainerLocation(this.viewContainer)!, this.themeService);
						}
					}
				}
			},
			onDragOver: (e) => {
				toggleDropEffect(e.eventData.dataTransfer, 'move', overlay !== undefined);
			},
			onDragLeave: (e) => {
				overlay?.dispose();
				overlay = undefined;
			},
			onDrop: (e) => {
				if (overlay) {
					const dropData = e.dragAndDropData.getData();
					const viewsToMove: IViewDescriptor[] = [];
					let anchorView: IViewDescriptor | undefined;

					if (dropData.type === 'composite' && dropData.id !== this.viewContainer.id && !this.viewContainer.rejectAddedViews) {
						const container = this.viewDescriptorService.getViewContainerById(dropData.id)!;
						const allViews = this.viewDescriptorService.getViewContainerModel(container).allViewDescriptors;

						if (allViews.length > 0 && !allViews.some(v => !v.canMoveView)) {
							viewsToMove.push(...allViews);
							anchorView = allViews[0];
						}
					} else if (dropData.type === 'view') {
						const oldViewContainer = this.viewDescriptorService.getViewContainerByViewId(dropData.id);
						const viewDescriptor = this.viewDescriptorService.getViewDescriptorById(dropData.id);
						if (oldViewContainer !== this.viewContainer && viewDescriptor && viewDescriptor.canMoveView && !this.viewContainer.rejectAddedViews) {
							viewsToMove.push(viewDescriptor);
						}

						if (viewDescriptor) {
							anchorView = viewDescriptor;
						}
					}

					if (viewsToMove) {
						this.viewDescriptorService.moveViewsToContainer(viewsToMove, this.viewContainer);
					}

					if (anchorView) {
						if (overlay.currentDropOperation === DropDirection.DOWN ||
							overlay.currentDropOperation === DropDirection.RIGHT) {

							const fromIndex = this.panes.findIndex(p => p.id === anchorView!.id);
							let toIndex = this.panes.findIndex(p => p.id === pane.id);

							if (fromIndex >= 0 && toIndex >= 0) {
								if (fromIndex > toIndex) {
									toIndex++;
								}

								if (toIndex < this.panes.length && toIndex !== fromIndex) {
									this.movePane(this.panes[fromIndex], this.panes[toIndex]);
								}
							}
						}

						if (overlay.currentDropOperation === DropDirection.UP ||
							overlay.currentDropOperation === DropDirection.LEFT) {
							const fromIndex = this.panes.findIndex(p => p.id === anchorView!.id);
							let toIndex = this.panes.findIndex(p => p.id === pane.id);

							if (fromIndex >= 0 && toIndex >= 0) {
								if (fromIndex < toIndex) {
									toIndex--;
								}

								if (toIndex >= 0 && toIndex !== fromIndex) {
									this.movePane(this.panes[fromIndex], this.panes[toIndex]);
								}
							}
						}

						if (viewsToMove.length > 1) {
							viewsToMove.slice(1).forEach(view => {
								let toIndex = this.panes.findIndex(p => p.id === anchorView!.id);
								let fromIndex = this.panes.findIndex(p => p.id === view.id);
								if (fromIndex >= 0 && toIndex >= 0) {
									if (fromIndex > toIndex) {
										toIndex++;
									}

									if (toIndex < this.panes.length && toIndex !== fromIndex) {
										this.movePane(this.panes[fromIndex], this.panes[toIndex]);
										anchorView = view;
									}
								}
							});
						}
					}
				}

				overlay?.dispose();
				overlay = undefined;
			}
		}));
	}

	removePanes(panes: ViewPane[]): void {
		const wasMerged = this.isViewMergedWithContainer();

		panes.forEach(pane => this.removePane(pane));

		this.updateViewHeaders();
		if (wasMerged !== this.isViewMergedWithContainer()) {
			this.updateTitleArea();
		}

		this._onDidRemoveViews.fire(panes);
	}

	private removePane(pane: ViewPane): void {
		const index = this.paneItems.findIndex(i => i.pane === pane);

		if (index === -1) {
			return;
		}

		if (this.lastFocusedPane === pane) {
			this.lastFocusedPane = undefined;
		}

		assertIsDefined(this.paneview).removePane(pane);
		const [paneItem] = this.paneItems.splice(index, 1);
		paneItem.disposaBle.dispose();

	}

	movePane(from: ViewPane, to: ViewPane): void {
		const fromIndex = this.paneItems.findIndex(item => item.pane === from);
		const toIndex = this.paneItems.findIndex(item => item.pane === to);

		const fromViewDescriptor = this.viewContainerModel.visiBleViewDescriptors[fromIndex];
		const toViewDescriptor = this.viewContainerModel.visiBleViewDescriptors[toIndex];

		if (fromIndex < 0 || fromIndex >= this.paneItems.length) {
			return;
		}

		if (toIndex < 0 || toIndex >= this.paneItems.length) {
			return;
		}

		const [paneItem] = this.paneItems.splice(fromIndex, 1);
		this.paneItems.splice(toIndex, 0, paneItem);

		assertIsDefined(this.paneview).movePane(from, to);

		this.viewContainerModel.move(fromViewDescriptor.id, toViewDescriptor.id);

		this.updateTitleArea();
	}

	resizePane(pane: ViewPane, size: numBer): void {
		assertIsDefined(this.paneview).resizePane(pane, size);
	}

	getPaneSize(pane: ViewPane): numBer {
		return assertIsDefined(this.paneview).getPaneSize(pane);
	}

	private updateViewHeaders(): void {
		if (this.isViewMergedWithContainer()) {
			this.paneItems[0].pane.setExpanded(true);
			this.paneItems[0].pane.headerVisiBle = false;
		} else {
			this.paneItems.forEach(i => i.pane.headerVisiBle = true);
		}
	}

	private isViewMergedWithContainer(): Boolean {
		if (!(this.options.mergeViewWithContainerWhenSingleView && this.paneItems.length === 1)) {
			return false;
		}
		if (!this.areExtensionsReady) {
			if (this.visiBleViewsCountFromCache === undefined) {
				// TODO @sBatten fix hack for #91367
				return this.viewDescriptorService.getViewContainerLocation(this.viewContainer) === ViewContainerLocation.Panel;
			}
			// Check in cache so that view do not jump. See #29609
			return this.visiBleViewsCountFromCache === 1;
		}
		return true;
	}

	dispose(): void {
		super.dispose();
		this.paneItems.forEach(i => i.disposaBle.dispose());
		if (this.paneview) {
			this.paneview.dispose();
		}
	}
}

class MoveViewPosition extends Action2 {
	constructor(desc: Readonly<IAction2Options>, private readonly offset: numBer) {
		super(desc);
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewDescriptorService = accessor.get(IViewDescriptorService);
		const contextKeyService = accessor.get(IContextKeyService);

		const viewId = FocusedViewContext.getValue(contextKeyService);
		if (viewId === undefined) {
			return;
		}

		const viewContainer = viewDescriptorService.getViewContainerByViewId(viewId)!;
		const model = viewDescriptorService.getViewContainerModel(viewContainer);

		const viewDescriptor = model.visiBleViewDescriptors.find(vd => vd.id === viewId)!;
		const currentIndex = model.visiBleViewDescriptors.indexOf(viewDescriptor);
		if (currentIndex + this.offset < 0 || currentIndex + this.offset >= model.visiBleViewDescriptors.length) {
			return;
		}

		const newPosition = model.visiBleViewDescriptors[currentIndex + this.offset];

		model.move(viewDescriptor.id, newPosition.id);
	}
}

registerAction2(
	class MoveViewUp extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewUp',
				title: nls.localize('viewMoveUp', "Move View Up"),
				keyBinding: {
					primary: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.UpArrow),
					weight: KeyBindingWeight.WorkBenchContriB + 1,
					when: FocusedViewContext.notEqualsTo('')
				}
			}, -1);
		}
	}
);

registerAction2(
	class MoveViewLeft extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewLeft',
				title: nls.localize('viewMoveLeft', "Move View Left"),
				keyBinding: {
					primary: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.LeftArrow),
					weight: KeyBindingWeight.WorkBenchContriB + 1,
					when: FocusedViewContext.notEqualsTo('')
				}
			}, -1);
		}
	}
);

registerAction2(
	class MoveViewDown extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewDown',
				title: nls.localize('viewMoveDown', "Move View Down"),
				keyBinding: {
					primary: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.DownArrow),
					weight: KeyBindingWeight.WorkBenchContriB + 1,
					when: FocusedViewContext.notEqualsTo('')
				}
			}, 1);
		}
	}
);

registerAction2(
	class MoveViewRight extends MoveViewPosition {
		constructor() {
			super({
				id: 'views.moveViewRight',
				title: nls.localize('viewMoveRight', "Move View Right"),
				keyBinding: {
					primary: KeyChord(KeyMod.CtrlCmd + KeyCode.KEY_K, KeyCode.RightArrow),
					weight: KeyBindingWeight.WorkBenchContriB + 1,
					when: FocusedViewContext.notEqualsTo('')
				}
			}, 1);
		}
	}
);
