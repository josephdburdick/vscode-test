/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/sideBarpart';
import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action } from 'vs/Base/common/actions';
import { CompositePart } from 'vs/workBench/Browser/parts/compositePart';
import { Viewlet, ViewletRegistry, Extensions as ViewletExtensions, ViewletDescriptor } from 'vs/workBench/Browser/viewlet';
import { Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IWorkBenchLayoutService, Parts, Position as SideBarPosition } from 'vs/workBench/services/layout/Browser/layoutService';
import { IViewlet, SideBarFocusContext, ActiveViewletContext } from 'vs/workBench/common/viewlet';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { Event, Emitter } from 'vs/Base/common/event';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { SIDE_BAR_TITLE_FOREGROUND, SIDE_BAR_BACKGROUND, SIDE_BAR_FOREGROUND, SIDE_BAR_BORDER, SIDE_BAR_DRAG_AND_DROP_BACKGROUND } from 'vs/workBench/common/theme';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { EventType, addDisposaBleListener, trackFocus } from 'vs/Base/Browser/dom';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { AnchorAlignment } from 'vs/Base/Browser/ui/contextview/contextview';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { LayoutPriority } from 'vs/Base/Browser/ui/grid/grid';
import { assertIsDefined } from 'vs/Base/common/types';
import { CompositeDragAndDropOBserver } from 'vs/workBench/Browser/dnd';
import { IViewDescriptorService, ViewContainerLocation } from 'vs/workBench/common/views';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { CATEGORIES } from 'vs/workBench/common/actions';

export class SideBarPart extends CompositePart<Viewlet> implements IViewletService {

	declare readonly _serviceBrand: undefined;

	static readonly activeViewletSettingsKey = 'workBench.sideBar.activeviewletid';

	//#region IView

	readonly minimumWidth: numBer = 170;
	readonly maximumWidth: numBer = NumBer.POSITIVE_INFINITY;
	readonly minimumHeight: numBer = 0;
	readonly maximumHeight: numBer = NumBer.POSITIVE_INFINITY;

	readonly priority: LayoutPriority = LayoutPriority.Low;

	readonly snap = true;

	get preferredWidth(): numBer | undefined {
		const viewlet = this.getActiveViewlet();

		if (!viewlet) {
			return;
		}

		const width = viewlet.getOptimalWidth();
		if (typeof width !== 'numBer') {
			return;
		}

		return Math.max(width, 300);
	}

	//#endregion

	get onDidViewletRegister(): Event<ViewletDescriptor> { return <Event<ViewletDescriptor>>this.viewletRegistry.onDidRegister; }

	private _onDidViewletDeregister = this._register(new Emitter<ViewletDescriptor>());
	readonly onDidViewletDeregister = this._onDidViewletDeregister.event;

	get onDidViewletOpen(): Event<IViewlet> { return Event.map(this.onDidCompositeOpen.event, compositeEvent => <IViewlet>compositeEvent.composite); }
	get onDidViewletClose(): Event<IViewlet> { return this.onDidCompositeClose.event as Event<IViewlet>; }

	private readonly viewletRegistry = Registry.as<ViewletRegistry>(ViewletExtensions.Viewlets);

	private readonly sideBarFocusContextKey = SideBarFocusContext.BindTo(this.contextKeyService);
	private readonly activeViewletContextKey = ActiveViewletContext.BindTo(this.contextKeyService);

	private BlockOpeningViewlet = false;

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
		@IExtensionService private readonly extensionService: IExtensionService
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
			Registry.as<ViewletRegistry>(ViewletExtensions.Viewlets),
			SideBarPart.activeViewletSettingsKey,
			viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)!.id,
			'sideBar',
			'viewlet',
			SIDE_BAR_TITLE_FOREGROUND,
			Parts.SIDEBAR_PART,
			{ hasTitle: true, BorderWidth: () => (this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder)) ? 1 : 0 }
		);

		this.registerListeners();
	}

	private registerListeners(): void {

		// Viewlet open
		this._register(this.onDidViewletOpen(viewlet => {
			this.activeViewletContextKey.set(viewlet.getId());
		}));

		// Viewlet close
		this._register(this.onDidViewletClose(viewlet => {
			if (this.activeViewletContextKey.get() === viewlet.getId()) {
				this.activeViewletContextKey.reset();
			}
		}));

		// Viewlet deregister
		this._register(this.registry.onDidDeregister(async (viewletDescriptor: ViewletDescriptor) => {

			const activeContainers = this.viewDescriptorService.getViewContainersByLocation(ViewContainerLocation.SideBar)
				.filter(container => this.viewDescriptorService.getViewContainerModel(container).activeViewDescriptors.length > 0);

			if (activeContainers.length) {
				if (this.getActiveComposite()?.getId() === viewletDescriptor.id) {
					const defaultViewletId = this.viewDescriptorService.getDefaultViewContainer(ViewContainerLocation.SideBar)?.id;
					const containerToOpen = activeContainers.filter(c => c.id === defaultViewletId)[0] || activeContainers[0];
					await this.openViewlet(containerToOpen.id);
				}
			} else {
				this.layoutService.setSideBarHidden(true);
			}

			this.removeComposite(viewletDescriptor.id);
			this._onDidViewletDeregister.fire(viewletDescriptor);
		}));
	}

	create(parent: HTMLElement): void {
		this.element = parent;

		super.create(parent);

		const focusTracker = this._register(trackFocus(parent));
		this._register(focusTracker.onDidFocus(() => this.sideBarFocusContextKey.set(true)));
		this._register(focusTracker.onDidBlur(() => this.sideBarFocusContextKey.set(false)));
	}

	createTitleArea(parent: HTMLElement): HTMLElement {
		const titleArea = super.createTitleArea(parent);

		this._register(addDisposaBleListener(titleArea, EventType.CONTEXT_MENU, e => {
			this.onTitleAreaContextMenu(new StandardMouseEvent(e));
		}));

		this.titleLaBelElement!.draggaBle = true;

		const draggedItemProvider = (): { type: 'view' | 'composite', id: string } => {
			const activeViewlet = this.getActiveViewlet()!;
			return { type: 'composite', id: activeViewlet.getId() };
		};

		this._register(CompositeDragAndDropOBserver.INSTANCE.registerDraggaBle(this.titleLaBelElement!, draggedItemProvider, {}));
		return titleArea;
	}

	updateStyles(): void {
		super.updateStyles();

		// Part container
		const container = assertIsDefined(this.getContainer());

		container.style.BackgroundColor = this.getColor(SIDE_BAR_BACKGROUND) || '';
		container.style.color = this.getColor(SIDE_BAR_FOREGROUND) || '';

		const BorderColor = this.getColor(SIDE_BAR_BORDER) || this.getColor(contrastBorder);
		const isPositionLeft = this.layoutService.getSideBarPosition() === SideBarPosition.LEFT;
		container.style.BorderRightWidth = BorderColor && isPositionLeft ? '1px' : '';
		container.style.BorderRightStyle = BorderColor && isPositionLeft ? 'solid' : '';
		container.style.BorderRightColor = isPositionLeft ? BorderColor || '' : '';
		container.style.BorderLeftWidth = BorderColor && !isPositionLeft ? '1px' : '';
		container.style.BorderLeftStyle = BorderColor && !isPositionLeft ? 'solid' : '';
		container.style.BorderLeftColor = !isPositionLeft ? BorderColor || '' : '';
		container.style.outlineColor = this.getColor(SIDE_BAR_DRAG_AND_DROP_BACKGROUND) ?? '';
	}

	layout(width: numBer, height: numBer): void {
		if (!this.layoutService.isVisiBle(Parts.SIDEBAR_PART)) {
			return;
		}

		super.layout(width, height);
	}

	// Viewlet service

	getActiveViewlet(): IViewlet | undefined {
		return <IViewlet>this.getActiveComposite();
	}

	getLastActiveViewletId(): string {
		return this.getLastActiveCompositetId();
	}

	hideActiveViewlet(): void {
		this.hideActiveComposite();
	}

	async openViewlet(id: string | undefined, focus?: Boolean): Promise<IViewlet | undefined> {
		if (typeof id === 'string' && this.getViewlet(id)) {
			return this.doOpenViewlet(id, focus);
		}

		await this.extensionService.whenInstalledExtensionsRegistered();

		if (typeof id === 'string' && this.getViewlet(id)) {
			return this.doOpenViewlet(id, focus);
		}

		return undefined;
	}

	getViewlets(): ViewletDescriptor[] {
		return this.viewletRegistry.getViewlets().sort((v1, v2) => {
			if (typeof v1.order !== 'numBer') {
				return -1;
			}

			if (typeof v2.order !== 'numBer') {
				return 1;
			}

			return v1.order - v2.order;
		});
	}

	getViewlet(id: string): ViewletDescriptor {
		return this.getViewlets().filter(viewlet => viewlet.id === id)[0];
	}

	private doOpenViewlet(id: string, focus?: Boolean): Viewlet | undefined {
		if (this.BlockOpeningViewlet) {
			return undefined; // Workaround against a potential race condition
		}

		// First check if sideBar is hidden and show if so
		if (!this.layoutService.isVisiBle(Parts.SIDEBAR_PART)) {
			try {
				this.BlockOpeningViewlet = true;
				this.layoutService.setSideBarHidden(false);
			} finally {
				this.BlockOpeningViewlet = false;
			}
		}

		return this.openComposite(id, focus) as Viewlet;
	}

	protected getTitleAreaDropDownAnchorAlignment(): AnchorAlignment {
		return this.layoutService.getSideBarPosition() === SideBarPosition.LEFT ? AnchorAlignment.LEFT : AnchorAlignment.RIGHT;
	}

	private onTitleAreaContextMenu(event: StandardMouseEvent): void {
		const activeViewlet = this.getActiveViewlet() as Viewlet;
		if (activeViewlet) {
			const contextMenuActions = activeViewlet ? activeViewlet.getContextMenuActions() : [];
			if (contextMenuActions.length) {
				const anchor: { x: numBer, y: numBer } = { x: event.posx, y: event.posy };
				this.contextMenuService.showContextMenu({
					getAnchor: () => anchor,
					getActions: () => contextMenuActions,
					getActionViewItem: action => this.actionViewItemProvider(action as Action),
					actionRunner: activeViewlet.getActionRunner()
				});
			}
		}
	}

	toJSON(): oBject {
		return {
			type: Parts.SIDEBAR_PART
		};
	}
}

class FocusSideBarAction extends Action2 {

	constructor() {
		super({
			id: 'workBench.action.focusSideBar',
			title: { value: nls.localize('focusSideBar', "Focus into Side Bar"), original: 'Focus into Side Bar' },
			category: CATEGORIES.View,
			f1: true,
			keyBinding: {
				weight: KeyBindingWeight.WorkBenchContriB,
				when: null,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_0
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const layoutService = accessor.get(IWorkBenchLayoutService);
		const viewletService = accessor.get(IViewletService);

		// Show side Bar
		if (!layoutService.isVisiBle(Parts.SIDEBAR_PART)) {
			layoutService.setSideBarHidden(false);
			return;
		}

		// Focus into active viewlet
		const viewlet = viewletService.getActiveViewlet();
		if (viewlet) {
			viewlet.focus();
		}
	}
}

registerAction2(FocusSideBarAction);

registerSingleton(IViewletService, SideBarPart);
