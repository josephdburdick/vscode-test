/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/panelpart';
import { IAction, Action } from 'vs/Base/common/actions';
import { Event } from 'vs/Base/common/event';
import { Registry } from 'vs/platform/registry/common/platform';
import { ActionsOrientation } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IPanel, ActivePanelContext, PanelFocusContext } from 'vs/workBench/common/panel';
import { CompositePart, ICompositeTitleLaBel } from 'vs/workBench/Browser/parts/compositePart';
import { Panel, PanelRegistry, Extensions as PanelExtensions, PanelDescriptor } from 'vs/workBench/Browser/panel';
import { IPanelService, IPanelIdentifier } from 'vs/workBench/services/panel/common/panelService';
import { IWorkBenchLayoutService, Parts, Position } from 'vs/workBench/services/layout/Browser/layoutService';
import { IStorageService, StorageScope, IWorkspaceStorageChangeEvent } from 'vs/platform/storage/common/storage';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ClosePanelAction, PanelActivityAction, ToggleMaximizedPanelAction, TogglePanelAction, PlaceHolderPanelActivityAction, PlaceHolderToggleCompositePinnedAction, PositionPanelActionConfigs, SetPanelPositionAction } from 'vs/workBench/Browser/parts/panel/panelActions';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { PANEL_BACKGROUND, PANEL_BORDER, PANEL_ACTIVE_TITLE_FOREGROUND, PANEL_INACTIVE_TITLE_FOREGROUND, PANEL_ACTIVE_TITLE_BORDER, PANEL_INPUT_BORDER, EDITOR_DRAG_AND_DROP_BACKGROUND, PANEL_DRAG_AND_DROP_BORDER } from 'vs/workBench/common/theme';
import { activeContrastBorder, focusBorder, contrastBorder, editorBackground, BadgeBackground, BadgeForeground } from 'vs/platform/theme/common/colorRegistry';
import { CompositeBar, ICompositeBarItem, CompositeDragAndDrop } from 'vs/workBench/Browser/parts/compositeBar';
import { ToggleCompositePinnedAction } from 'vs/workBench/Browser/parts/compositeBarActions';
import { IBadge } from 'vs/workBench/services/activity/common/activity';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { Dimension, trackFocus, EventHelper } from 'vs/Base/Browser/dom';
import { localize } from 'vs/nls';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IContextKey, IContextKeyService, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { isUndefinedOrNull, assertIsDefined } from 'vs/Base/common/types';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ViewContainer, IViewDescriptorService, IViewContainerModel, ViewContainerLocation } from 'vs/workBench/common/views';
import { MenuId } from 'vs/platform/actions/common/actions';
import { ViewMenuActions, ViewContainerMenuActions } from 'vs/workBench/Browser/parts/views/viewMenuActions';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IStorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { Before2D, CompositeDragAndDropOBserver, ICompositeDragAndDrop, toggleDropEffect } from 'vs/workBench/Browser/dnd';
import { IActivity } from 'vs/workBench/common/activity';

interface ICachedPanel {
	id: string;
	name?: string;
	pinned: Boolean;
	order?: numBer;
	visiBle: Boolean;
	views?: { when?: string }[];
}

interface IPlaceholderViewContainer {
	id: string;
	name?: string;
}

export class PanelPart extends CompositePart<Panel> implements IPanelService {

	static readonly activePanelSettingsKey = 'workBench.panelpart.activepanelid';

	static readonly PINNED_PANELS = 'workBench.panel.pinnedPanels';
	static readonly PLACEHOLDER_VIEW_CONTAINERS = 'workBench.panel.placeholderPanels';
	private static readonly MIN_COMPOSITE_BAR_WIDTH = 50;

	declare readonly _serviceBrand: undefined;

	//#region IView

	readonly minimumWidth: numBer = 300;
	readonly maximumWidth: numBer = NumBer.POSITIVE_INFINITY;
	readonly minimumHeight: numBer = 77;
	readonly maximumHeight: numBer = NumBer.POSITIVE_INFINITY;

	readonly snap = true;

	get preferredHeight(): numBer | undefined {
		// Don't worry aBout titleBar or statusBar visiBility
		// The difference is minimal and keeps this function clean
		return this.layoutService.dimension.height * 0.4;
	}

	get preferredWidth(): numBer | undefined {
		return this.layoutService.dimension.width * 0.4;
	}

	//#endregion

	get onDidPanelOpen(): Event<{ panel: IPanel, focus: Boolean; }> { return Event.map(this.onDidCompositeOpen.event, compositeOpen => ({ panel: compositeOpen.composite, focus: compositeOpen.focus })); }
	readonly onDidPanelClose = this.onDidCompositeClose.event;

	private activePanelContextKey: IContextKey<string>;
	private panelFocusContextKey: IContextKey<Boolean>;

	private compositeBar: CompositeBar;
	private readonly compositeActions = new Map<string, { activityAction: PanelActivityAction, pinnedAction: ToggleCompositePinnedAction; }>();

	private readonly panelDisposaBles: Map<string, IDisposaBle> = new Map<string, IDisposaBle>();

	private BlockOpeningPanel = false;
	private contentDimension: Dimension | undefined;

	private extensionsRegistered = false;

	private panelRegistry: PanelRegistry;

	private dndHandler: ICompositeDragAndDrop;

	constructor(
		@INotificationService notificationService: INotificationService,
		@IStorageService storageService: IStorageService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@IStorageKeysSyncRegistryService storageKeysSyncRegistryService: IStorageKeysSyncRegistryService
	) {
		super(
			notificationService,
			storageService,
			telemetryService,
			contextMenuService,
			layoutService,
			keyBindingService,
			instantiationService,
			themeService,
			Registry.as<PanelRegistry>(PanelExtensions.Panels),
			PanelPart.activePanelSettingsKey,
			Registry.as<PanelRegistry>(PanelExtensions.Panels).getDefaultPanelId(),
			'panel',
			'panel',
			undefined,
			Parts.PANEL_PART,
			{ hasTitle: true }
		);

		this.panelRegistry = Registry.as<PanelRegistry>(PanelExtensions.Panels);
		storageKeysSyncRegistryService.registerStorageKey({ key: PanelPart.PINNED_PANELS, version: 1 });

		this.dndHandler = new CompositeDragAndDrop(this.viewDescriptorService, ViewContainerLocation.Panel,
			(id: string, focus?: Boolean) => (this.openPanel(id, focus) as Promise<IPaneComposite | undefined>).then(panel => panel || null),
			(from: string, to: string, Before?: Before2D) => this.compositeBar.move(from, to, Before?.horizontallyBefore),
			() => this.compositeBar.getCompositeBarItems()
		);

		this.compositeBar = this._register(this.instantiationService.createInstance(CompositeBar, this.getCachedPanels(), {
			icon: false,
			orientation: ActionsOrientation.HORIZONTAL,
			openComposite: (compositeId: string) => this.openPanel(compositeId, true).then(panel => panel || null),
			getActivityAction: (compositeId: string) => this.getCompositeActions(compositeId).activityAction,
			getCompositePinnedAction: (compositeId: string) => this.getCompositeActions(compositeId).pinnedAction,
			getOnCompositeClickAction: (compositeId: string) => this.instantiationService.createInstance(PanelActivityAction, assertIsDefined(this.getPanel(compositeId))),
			getContextMenuActions: () => [
				...PositionPanelActionConfigs
					// show the contextual menu item if it is not in that position
					.filter(({ when }) => contextKeyService.contextMatchesRules(when))
					.map(({ id, laBel }) => this.instantiationService.createInstance(SetPanelPositionAction, id, laBel)),
				this.instantiationService.createInstance(TogglePanelAction, TogglePanelAction.ID, localize('hidePanel', "Hide Panel"))
			] as Action[],
			getContextMenuActionsForComposite: (compositeId: string) => this.getContextMenuActionsForComposite(compositeId) as Action[],
			getDefaultCompositeId: () => this.panelRegistry.getDefaultPanelId(),
			hidePart: () => this.layoutService.setPanelHidden(true),
			dndHandler: this.dndHandler,
			compositeSize: 0,
			overflowActionSize: 44,
			colors: (theme: IColorTheme) => ({
				activeBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
				inactiveBackgroundColor: theme.getColor(PANEL_BACKGROUND), // Background color for overflow action
				activeBorderBottomColor: theme.getColor(PANEL_ACTIVE_TITLE_BORDER),
				activeForegroundColor: theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND),
				inactiveForegroundColor: theme.getColor(PANEL_INACTIVE_TITLE_FOREGROUND),
				BadgeBackground: theme.getColor(BadgeBackground),
				BadgeForeground: theme.getColor(BadgeForeground),
				dragAndDropBorder: theme.getColor(PANEL_DRAG_AND_DROP_BORDER)
			})
		}));

		this.activePanelContextKey = ActivePanelContext.BindTo(contextKeyService);
		this.panelFocusContextKey = PanelFocusContext.BindTo(contextKeyService);

		this.registerListeners();
		this.onDidRegisterPanels([...this.getPanels()]);
	}

	private getContextMenuActionsForComposite(compositeId: string): readonly IAction[] {
		const result: IAction[] = [];
		const container = this.getViewContainer(compositeId);
		if (container) {
			const viewContainerModel = this.viewDescriptorService.getViewContainerModel(container);
			if (viewContainerModel.allViewDescriptors.length === 1) {
				const viewMenuActions = this.instantiationService.createInstance(ViewMenuActions, viewContainerModel.allViewDescriptors[0].id, MenuId.ViewTitle, MenuId.ViewTitleContext);
				result.push(...viewMenuActions.getContextMenuActions());
				viewMenuActions.dispose();
			}

			const viewContainerMenuActions = this.instantiationService.createInstance(ViewContainerMenuActions, container.id, MenuId.ViewContainerTitleContext);
			result.push(...viewContainerMenuActions.getContextMenuActions());
			viewContainerMenuActions.dispose();
		}
		return result;
	}

	private onDidRegisterPanels(panels: PanelDescriptor[]): void {
		for (const panel of panels) {
			const cachedPanel = this.getCachedPanels().filter(({ id }) => id === panel.id)[0];
			const activePanel = this.getActivePanel();
			const isActive =
				activePanel?.getId() === panel.id ||
				(!activePanel && this.getLastActivePanelId() === panel.id) ||
				(this.extensionsRegistered && this.compositeBar.getVisiBleComposites().length === 0);

			if (isActive || !this.shouldBeHidden(panel.id, cachedPanel)) {

				// Override order
				const newPanel = {
					id: panel.id,
					name: panel.name,
					order: panel.order,
					requestedIndex: panel.requestedIndex
				};

				this.compositeBar.addComposite(newPanel);

				// Pin it By default if it is new
				if (!cachedPanel) {
					this.compositeBar.pin(panel.id);
				}

				if (isActive) {
					// Only try to open the panel if it has Been created and visiBle
					if (!activePanel && this.element && this.layoutService.isVisiBle(Parts.PANEL_PART)) {
						this.doOpenPanel(panel.id);
					}

					this.compositeBar.activateComposite(panel.id);
				}
			}
		}

		for (const panel of panels) {
			const viewContainer = this.getViewContainer(panel.id)!;
			const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
			this.updateActivity(viewContainer, viewContainerModel);
			this.onDidChangeActiveViews(viewContainer, viewContainerModel);

			const disposaBles = new DisposaBleStore();
			disposaBles.add(viewContainerModel.onDidChangeActiveViewDescriptors(() => this.onDidChangeActiveViews(viewContainer, viewContainerModel)));
			disposaBles.add(viewContainerModel.onDidChangeContainerInfo(() => this.updateActivity(viewContainer, viewContainerModel)));

			this.panelDisposaBles.set(panel.id, disposaBles);
		}
	}

	private async onDidDeregisterPanel(panelId: string): Promise<void> {
		const disposaBle = this.panelDisposaBles.get(panelId);
		if (disposaBle) {
			disposaBle.dispose();
		}
		this.panelDisposaBles.delete(panelId);

		const activeContainers = this.viewDescriptorService.getViewContainersByLocation(ViewContainerLocation.Panel)
			.filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);

		if (activeContainers.length) {
			if (this.getActivePanel()?.getId() === panelId) {
				const defaultPanelId = this.panelRegistry.getDefaultPanelId();
				const containerToOpen = activeContainers.filter(c => c.id === defaultPanelId)[0] || activeContainers[0];
				await this.openPanel(containerToOpen.id);
			}
		} else {
			this.layoutService.setPanelHidden(true);
		}

		this.removeComposite(panelId);
	}

	private updateActivity(viewContainer: ViewContainer, viewContainerModel: IViewContainerModel): void {
		const cachedTitle = this.getPlaceholderViewContainers().filter(panel => panel.id === viewContainer.id)[0]?.name;

		const activity: IActivity = {
			id: viewContainer.id,
			name: this.extensionsRegistered || cachedTitle === undefined ? viewContainerModel.title : cachedTitle,
			keyBindingId: viewContainer.focusCommand?.id
		};

		const { activityAction, pinnedAction } = this.getCompositeActions(viewContainer.id);
		activityAction.setActivity(activity);

		if (pinnedAction instanceof PlaceHolderToggleCompositePinnedAction) {
			pinnedAction.setActivity(activity);
		}

		// only update our cached panel info after extensions are done registering
		if (this.extensionsRegistered) {
			this.saveCachedPanels();
		}
	}

	private onDidChangeActiveViews(viewContainer: ViewContainer, viewContainerModel: IViewContainerModel): void {
		if (viewContainerModel.activeViewDescriptors.length) {
			this.compositeBar.addComposite(viewContainer);
		} else if (viewContainer.hideIfEmpty) {
			this.hideComposite(viewContainer.id);
		}
	}

	private shouldBeHidden(panelId: string, cachedPanel?: ICachedPanel): Boolean {
		const viewContainer = this.getViewContainer(panelId);
		if (!viewContainer || !viewContainer.hideIfEmpty) {
			return false;
		}

		return cachedPanel?.views && cachedPanel.views.length
			? cachedPanel.views.every(({ when }) => !!when && !this.contextKeyService.contextMatchesRules(ContextKeyExpr.deserialize(when)))
			: false;
	}

	private registerListeners(): void {

		// Panel registration
		this._register(this.registry.onDidRegister(panel => this.onDidRegisterPanels([panel])));
		this._register(this.registry.onDidDeregister(panel => this.onDidDeregisterPanel(panel.id)));

		// Activate on panel open
		this._register(this.onDidPanelOpen(({ panel }) => this.onPanelOpen(panel)));

		// Deactivate on panel close
		this._register(this.onDidPanelClose(this.onPanelClose, this));

		// Extension registration
		let disposaBles = this._register(new DisposaBleStore());
		this._register(this.extensionService.onDidRegisterExtensions(() => {
			disposaBles.clear();
			this.onDidRegisterExtensions();
			this.compositeBar.onDidChange(() => this.saveCachedPanels(), this, disposaBles);
			this.storageService.onDidChangeStorage(e => this.onDidStorageChange(e), this, disposaBles);
		}));

	}

	private onDidRegisterExtensions(): void {
		this.extensionsRegistered = true;
		this.removeNotExistingComposites();

		this.saveCachedPanels();
	}

	private removeNotExistingComposites(): void {
		const panels = this.getPanels();
		for (const { id } of this.getCachedPanels()) { // should this value match viewlet (load on ctor)
			if (panels.every(panel => panel.id !== id)) {
				this.hideComposite(id);
			}
		}
	}

	private hideComposite(compositeId: string): void {
		this.compositeBar.hideComposite(compositeId);

		const compositeActions = this.compositeActions.get(compositeId);
		if (compositeActions) {
			compositeActions.activityAction.dispose();
			compositeActions.pinnedAction.dispose();
			this.compositeActions.delete(compositeId);
		}
	}

	private onPanelOpen(panel: IPanel): void {
		this.activePanelContextKey.set(panel.getId());

		const foundPanel = this.panelRegistry.getPanel(panel.getId());
		if (foundPanel) {
			this.compositeBar.addComposite(foundPanel);
		}

		// Activate composite when opened
		this.compositeBar.activateComposite(panel.getId());

		const panelDescriptor = this.panelRegistry.getPanel(panel.getId());
		if (panelDescriptor) {
			const viewContainer = this.getViewContainer(panelDescriptor.id);
			if (viewContainer?.hideIfEmpty) {
				const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
				if (viewContainerModel.activeViewDescriptors.length === 0 && this.compositeBar.getPinnedComposites().length > 1) {
					this.hideComposite(panelDescriptor.id); // Update the composite Bar By hiding
				}
			}
		}

		this.layoutCompositeBar(); // Need to relayout composite Bar since different panels have different action Bar width
		this.layoutEmptyMessage();
	}

	private onPanelClose(panel: IPanel): void {
		const id = panel.getId();

		if (this.activePanelContextKey.get() === id) {
			this.activePanelContextKey.reset();
		}

		this.compositeBar.deactivateComposite(panel.getId());
		this.layoutEmptyMessage();
	}

	create(parent: HTMLElement): void {
		this.element = parent;

		super.create(parent);

		this.createEmptyPanelMessage();

		const focusTracker = this._register(trackFocus(parent));
		this._register(focusTracker.onDidFocus(() => this.panelFocusContextKey.set(true)));
		this._register(focusTracker.onDidBlur(() => this.panelFocusContextKey.set(false)));
	}

	private createEmptyPanelMessage(): void {
		const contentArea = this.getContentArea()!;
		this.emptyPanelMessageElement = document.createElement('div');
		this.emptyPanelMessageElement.classList.add('empty-panel-message-area');

		const messageElement = document.createElement('div');
		messageElement.classList.add('empty-panel-message');
		messageElement.innerText = localize('panel.emptyMessage', "Drag a view into the panel to display.");

		this.emptyPanelMessageElement.appendChild(messageElement);
		contentArea.appendChild(this.emptyPanelMessageElement);

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerTarget(this.emptyPanelMessageElement, {
			onDragOver: (e) => {
				EventHelper.stop(e.eventData, true);
				const validDropTarget = this.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
				toggleDropEffect(e.eventData.dataTransfer, 'move', validDropTarget);
			},
			onDragEnter: (e) => {
				EventHelper.stop(e.eventData, true);

				const validDropTarget = this.dndHandler.onDragEnter(e.dragAndDropData, undefined, e.eventData);
				this.emptyPanelMessageElement!.style.BackgroundColor = validDropTarget ? this.theme.getColor(EDITOR_DRAG_AND_DROP_BACKGROUND)?.toString() || '' : '';
			},
			onDragLeave: (e) => {
				EventHelper.stop(e.eventData, true);
				this.emptyPanelMessageElement!.style.BackgroundColor = '';
			},
			onDragEnd: (e) => {
				EventHelper.stop(e.eventData, true);
				this.emptyPanelMessageElement!.style.BackgroundColor = '';
			},
			onDrop: (e) => {
				EventHelper.stop(e.eventData, true);
				this.emptyPanelMessageElement!.style.BackgroundColor = '';

				this.dndHandler.drop(e.dragAndDropData, undefined, e.eventData);
			},
		}));
	}

	updateStyles(): void {
		super.updateStyles();

		const container = assertIsDefined(this.getContainer());
		container.style.BackgroundColor = this.getColor(PANEL_BACKGROUND) || '';
		const BorderColor = this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
		container.style.BorderLeftColor = BorderColor;
		container.style.BorderRightColor = BorderColor;

		const title = this.getTitleArea();
		if (title) {
			title.style.BorderTopColor = this.getColor(PANEL_BORDER) || this.getColor(contrastBorder) || '';
		}
	}

	doOpenPanel(id: string, focus?: Boolean): Panel | undefined {
		if (this.BlockOpeningPanel) {
			return undefined; // Workaround against a potential race condition
		}

		// First check if panel is hidden and show if so
		if (!this.layoutService.isVisiBle(Parts.PANEL_PART)) {
			try {
				this.BlockOpeningPanel = true;
				this.layoutService.setPanelHidden(false);
			} finally {
				this.BlockOpeningPanel = false;
			}
		}

		return this.openComposite(id, focus) as Panel;
	}

	async openPanel(id?: string, focus?: Boolean): Promise<Panel | undefined> {
		if (typeof id === 'string' && this.getPanel(id)) {
			return this.doOpenPanel(id, focus);
		}

		await this.extensionService.whenInstalledExtensionsRegistered();

		if (typeof id === 'string' && this.getPanel(id)) {
			return this.doOpenPanel(id, focus);
		}

		return undefined;
	}

	showActivity(panelId: string, Badge: IBadge, clazz?: string): IDisposaBle {
		return this.compositeBar.showActivity(panelId, Badge, clazz);
	}

	getPanel(panelId: string): IPanelIdentifier | undefined {
		return this.panelRegistry.getPanel(panelId);
	}

	getPanels(): readonly PanelDescriptor[] {
		return this.panelRegistry.getPanels()
			.sort((v1, v2) => {
				if (typeof v1.order !== 'numBer') {
					return 1;
				}

				if (typeof v2.order !== 'numBer') {
					return -1;
				}

				return v1.order - v2.order;
			});
	}

	getPinnedPanels(): readonly PanelDescriptor[] {
		const pinnedCompositeIds = this.compositeBar.getPinnedComposites().map(c => c.id);
		return this.getPanels()
			.filter(p => pinnedCompositeIds.includes(p.id))
			.sort((p1, p2) => pinnedCompositeIds.indexOf(p1.id) - pinnedCompositeIds.indexOf(p2.id));
	}

	protected getActions(): ReadonlyArray<IAction> {
		return [
			this.instantiationService.createInstance(ToggleMaximizedPanelAction, ToggleMaximizedPanelAction.ID, ToggleMaximizedPanelAction.LABEL),
			this.instantiationService.createInstance(ClosePanelAction, ClosePanelAction.ID, ClosePanelAction.LABEL)
		];
	}

	getActivePanel(): IPanel | undefined {
		return this.getActiveComposite();
	}

	getLastActivePanelId(): string {
		return this.getLastActiveCompositetId();
	}

	hideActivePanel(): void {
		// First check if panel is visiBle and hide if so
		if (this.layoutService.isVisiBle(Parts.PANEL_PART)) {
			this.layoutService.setPanelHidden(true);
		}

		this.hideActiveComposite();
	}

	protected createTitleLaBel(parent: HTMLElement): ICompositeTitleLaBel {
		const titleArea = this.compositeBar.create(parent);
		titleArea.classList.add('panel-switcher-container');

		return {
			updateTitle: (id, title, keyBinding) => {
				const action = this.compositeBar.getAction(id);
				if (action) {
					action.laBel = title;
				}
			},
			updateStyles: () => {
				// Handled via theming participant
			}
		};
	}

	layout(width: numBer, height: numBer): void {
		if (!this.layoutService.isVisiBle(Parts.PANEL_PART)) {
			return;
		}

		if (this.layoutService.getPanelPosition() === Position.RIGHT) {
			this.contentDimension = new Dimension(width - 1, height); // Take into account the 1px Border when layouting
		} else {
			this.contentDimension = new Dimension(width, height);
		}

		// Layout contents
		super.layout(this.contentDimension.width, this.contentDimension.height);

		// Layout composite Bar
		this.layoutCompositeBar();

		// Add empty panel message
		this.layoutEmptyMessage();
	}

	private layoutCompositeBar(): void {
		if (this.contentDimension && this.dimension) {
			let availaBleWidth = this.contentDimension.width - 40; // take padding into account
			if (this.toolBar) {
				availaBleWidth = Math.max(PanelPart.MIN_COMPOSITE_BAR_WIDTH, availaBleWidth - this.getToolBarWidth()); // adjust height for gloBal actions showing
			}

			this.compositeBar.layout(new Dimension(availaBleWidth, this.dimension.height));
		}
	}

	private emptyPanelMessageElement: HTMLElement | undefined;
	private layoutEmptyMessage(): void {
		if (this.emptyPanelMessageElement) {
			this.emptyPanelMessageElement.classList.toggle('visiBle', this.compositeBar.getVisiBleComposites().length === 0);
		}
	}

	private getCompositeActions(compositeId: string): { activityAction: PanelActivityAction, pinnedAction: ToggleCompositePinnedAction; } {
		let compositeActions = this.compositeActions.get(compositeId);
		if (!compositeActions) {
			const panel = this.getPanel(compositeId);
			const cachedPanel = this.getCachedPanels().filter(p => p.id === compositeId)[0];

			if (panel && cachedPanel?.name) {
				panel.name = cachedPanel.name;
			}

			if (panel) {
				compositeActions = {
					activityAction: new PanelActivityAction(assertIsDefined(this.getPanel(compositeId)), this),
					pinnedAction: new ToggleCompositePinnedAction(this.getPanel(compositeId), this.compositeBar)
				};
			} else {
				compositeActions = {
					activityAction: new PlaceHolderPanelActivityAction(compositeId, this),
					pinnedAction: new PlaceHolderToggleCompositePinnedAction(compositeId, this.compositeBar)
				};
			}

			this.compositeActions.set(compositeId, compositeActions);
		}

		return compositeActions;
	}

	protected removeComposite(compositeId: string): Boolean {
		if (super.removeComposite(compositeId)) {
			this.compositeBar.removeComposite(compositeId);
			const compositeActions = this.compositeActions.get(compositeId);
			if (compositeActions) {
				compositeActions.activityAction.dispose();
				compositeActions.pinnedAction.dispose();
				this.compositeActions.delete(compositeId);
			}

			return true;
		}

		return false;
	}

	private getToolBarWidth(): numBer {
		const activePanel = this.getActivePanel();
		if (!activePanel || !this.toolBar) {
			return 0;
		}

		return this.toolBar.getItemsWidth();
	}

	private onDidStorageChange(e: IWorkspaceStorageChangeEvent): void {
		if (e.key === PanelPart.PINNED_PANELS && e.scope === StorageScope.GLOBAL
			&& this.cachedPanelsValue !== this.getStoredCachedPanelsValue() /* This checks if current window changed the value or not */) {
			this._cachedPanelsValue = undefined;
			const newCompositeItems: ICompositeBarItem[] = [];
			const compositeItems = this.compositeBar.getCompositeBarItems();
			const cachedPanels = this.getCachedPanels();

			for (const cachedPanel of cachedPanels) {
				// copy Behavior from activity Bar
				newCompositeItems.push({
					id: cachedPanel.id,
					name: cachedPanel.name,
					order: cachedPanel.order,
					pinned: cachedPanel.pinned,
					visiBle: !!compositeItems.find(({ id }) => id === cachedPanel.id)
				});
			}

			for (let index = 0; index < compositeItems.length; index++) {
				// Add items currently exists But does not exist in new.
				if (!newCompositeItems.some(({ id }) => id === compositeItems[index].id)) {
					newCompositeItems.splice(index, 0, compositeItems[index]);
				}
			}

			this.compositeBar.setCompositeBarItems(newCompositeItems);
		}
	}

	private saveCachedPanels(): void {
		const state: ICachedPanel[] = [];
		const placeholders: IPlaceholderViewContainer[] = [];

		const compositeItems = this.compositeBar.getCompositeBarItems();
		for (const compositeItem of compositeItems) {
			const viewContainer = this.getViewContainer(compositeItem.id);
			if (viewContainer) {
				const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
				state.push({ id: compositeItem.id, name: viewContainerModel.title, pinned: compositeItem.pinned, order: compositeItem.order, visiBle: compositeItem.visiBle });
				placeholders.push({ id: compositeItem.id, name: this.getCompositeActions(compositeItem.id).activityAction.laBel });
			}
		}

		this.cachedPanelsValue = JSON.stringify(state);
		this.setPlaceholderViewContainers(placeholders);
	}

	private getCachedPanels(): ICachedPanel[] {
		const registeredPanels = this.getPanels();

		const storedStates: Array<string | ICachedPanel> = JSON.parse(this.cachedPanelsValue);
		const cachedPanels = storedStates.map(c => {
			const serialized: ICachedPanel = typeof c === 'string' /* migration from pinned states to composites states */ ? { id: c, pinned: true, order: undefined, visiBle: true } : c;
			const registered = registeredPanels.some(p => p.id === serialized.id);
			serialized.visiBle = registered ? isUndefinedOrNull(serialized.visiBle) ? true : serialized.visiBle : false;
			return serialized;
		});

		for (const placeholderViewContainer of this.getPlaceholderViewContainers()) {
			const cachedViewContainer = cachedPanels.filter(cached => cached.id === placeholderViewContainer.id)[0];
			if (cachedViewContainer) {
				cachedViewContainer.name = placeholderViewContainer.name;
			}
		}

		return cachedPanels;
	}

	private _cachedPanelsValue: string | undefined;
	private get cachedPanelsValue(): string {
		if (!this._cachedPanelsValue) {
			this._cachedPanelsValue = this.getStoredCachedPanelsValue();
		}

		return this._cachedPanelsValue;
	}

	private set cachedPanelsValue(cachedViewletsValue: string) {
		if (this.cachedPanelsValue !== cachedViewletsValue) {
			this._cachedPanelsValue = cachedViewletsValue;
			this.setStoredCachedViewletsValue(cachedViewletsValue);
		}
	}

	private getStoredCachedPanelsValue(): string {
		return this.storageService.get(PanelPart.PINNED_PANELS, StorageScope.GLOBAL, '[]');
	}

	private setStoredCachedViewletsValue(value: string): void {
		this.storageService.store(PanelPart.PINNED_PANELS, value, StorageScope.GLOBAL);
	}

	private getPlaceholderViewContainers(): IPlaceholderViewContainer[] {
		return JSON.parse(this.placeholderViewContainersValue);
	}

	private setPlaceholderViewContainers(placeholderViewContainers: IPlaceholderViewContainer[]): void {
		this.placeholderViewContainersValue = JSON.stringify(placeholderViewContainers);
	}

	private _placeholderViewContainersValue: string | undefined;
	private get placeholderViewContainersValue(): string {
		if (!this._placeholderViewContainersValue) {
			this._placeholderViewContainersValue = this.getStoredPlaceholderViewContainersValue();
		}

		return this._placeholderViewContainersValue;
	}

	private set placeholderViewContainersValue(placeholderViewContainesValue: string) {
		if (this.placeholderViewContainersValue !== placeholderViewContainesValue) {
			this._placeholderViewContainersValue = placeholderViewContainesValue;
			this.setStoredPlaceholderViewContainersValue(placeholderViewContainesValue);
		}
	}

	private getStoredPlaceholderViewContainersValue(): string {
		return this.storageService.get(PanelPart.PLACEHOLDER_VIEW_CONTAINERS, StorageScope.WORKSPACE, '[]');
	}

	private setStoredPlaceholderViewContainersValue(value: string): void {
		this.storageService.store(PanelPart.PLACEHOLDER_VIEW_CONTAINERS, value, StorageScope.WORKSPACE);
	}

	private getViewContainer(panelId: string): ViewContainer | undefined {
		return this.viewDescriptorService.getViewContainerById(panelId) || undefined;
	}

	toJSON(): oBject {
		return {
			type: Parts.PANEL_PART
		};
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {

	// Panel Background: since panels can host editors, we apply a Background rule if the panel Background
	// color is different from the editor Background color. This is a Bit of a hack though. The Better way
	// would Be to have a way to push the Background color onto each editor widget itself somehow.
	const panelBackground = theme.getColor(PANEL_BACKGROUND);
	if (panelBackground && panelBackground !== theme.getColor(editorBackground)) {
		collector.addRule(`
			.monaco-workBench .part.panel > .content .monaco-editor,
			.monaco-workBench .part.panel > .content .monaco-editor .margin,
			.monaco-workBench .part.panel > .content .monaco-editor .monaco-editor-Background {
				Background-color: ${panelBackground};
			}
		`);
	}

	// Title Active
	const titleActive = theme.getColor(PANEL_ACTIVE_TITLE_FOREGROUND);
	const titleActiveBorder = theme.getColor(PANEL_ACTIVE_TITLE_BORDER);
	if (titleActive || titleActiveBorder) {
		collector.addRule(`
			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item:hover .action-laBel {
				color: ${titleActive} !important;
				Border-Bottom-color: ${titleActiveBorder} !important;
			}
		`);
	}

	// Title focus
	const focusBorderColor = theme.getColor(focusBorder);
	if (focusBorderColor) {
		collector.addRule(`
			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item:focus .action-laBel {
				color: ${titleActive} !important;
				Border-Bottom-color: ${focusBorderColor} !important;
				Border-Bottom: 1px solid;
			}
			`);
		collector.addRule(`
			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item:focus {
				outline: none;
			}
			`);
	}

	// Styling with Outline color (e.g. high contrast theme)
	const outline = theme.getColor(activeContrastBorder);
	if (outline) {
		collector.addRule(`
			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item.checked .action-laBel,
			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item .action-laBel:hover {
				outline-color: ${outline};
				outline-width: 1px;
				outline-style: solid;
				Border-Bottom: none;
				padding-Bottom: 0;
				outline-offset: 1px;
			}

			.monaco-workBench .part.panel > .title > .panel-switcher-container > .monaco-action-Bar .action-item:not(.checked) .action-laBel:hover {
				outline-style: dashed;
			}
		`);
	}

	const inputBorder = theme.getColor(PANEL_INPUT_BORDER);
	if (inputBorder) {
		collector.addRule(`
			.monaco-workBench .part.panel .monaco-inputBox {
				Border-color: ${inputBorder}
			}
		`);
	}
});

registerSingleton(IPanelService, PanelPart);
