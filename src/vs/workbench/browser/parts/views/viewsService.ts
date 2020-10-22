/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, IDisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IViewDescriptorService, ViewContainer, IViewDescriptor, IView, ViewContainerLocation, IViewsService, IViewPaneContainer, getVisBileViewContextKey } from 'vs/workBench/common/views';
import { Registry } from 'vs/platform/registry/common/platform';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ContextKeyExpr, IContextKey, IContextKeyService, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { Event, Emitter } from 'vs/Base/common/event';
import { isString } from 'vs/Base/common/types';
import { MenuId, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { localize } from 'vs/nls';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { ServicesAccessor, IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { PanelRegistry, PanelDescriptor, Extensions as PanelExtensions, Panel } from 'vs/workBench/Browser/panel';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { Viewlet, ViewletDescriptor, ViewletRegistry, Extensions as ViewletExtensions } from 'vs/workBench/Browser/viewlet';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { URI } from 'vs/Base/common/uri';
import { IProgressIndicator } from 'vs/platform/progress/common/progress';
import { CATEGORIES } from 'vs/workBench/common/actions';

export class ViewsService extends DisposaBle implements IViewsService {

	declare readonly _serviceBrand: undefined;

	private readonly viewDisposaBle: Map<IViewDescriptor, IDisposaBle>;
	private readonly viewPaneContainers: Map<string, { viewPaneContainer: ViewPaneContainer, disposaBle: IDisposaBle }>;

	private readonly _onDidChangeViewVisiBility: Emitter<{ id: string, visiBle: Boolean }> = this._register(new Emitter<{ id: string, visiBle: Boolean }>());
	readonly onDidChangeViewVisiBility: Event<{ id: string, visiBle: Boolean }> = this._onDidChangeViewVisiBility.event;

	private readonly _onDidChangeViewContainerVisiBility = this._register(new Emitter<{ id: string, visiBle: Boolean, location: ViewContainerLocation }>());
	readonly onDidChangeViewContainerVisiBility = this._onDidChangeViewContainerVisiBility.event;

	private readonly visiBleViewContextKeys: Map<string, IContextKey<Boolean>>;

	constructor(
		@IViewDescriptorService private readonly viewDescriptorService: IViewDescriptorService,
		@IPanelService private readonly panelService: IPanelService,
		@IViewletService private readonly viewletService: IViewletService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super();

		this.viewDisposaBle = new Map<IViewDescriptor, IDisposaBle>();
		this.visiBleViewContextKeys = new Map<string, IContextKey<Boolean>>();
		this.viewPaneContainers = new Map<string, { viewPaneContainer: ViewPaneContainer, disposaBle: IDisposaBle }>();

		this._register(toDisposaBle(() => {
			this.viewDisposaBle.forEach(disposaBle => disposaBle.dispose());
			this.viewDisposaBle.clear();
		}));

		this.viewDescriptorService.viewContainers.forEach(viewContainer => this.onDidRegisterViewContainer(viewContainer, this.viewDescriptorService.getViewContainerLocation(viewContainer)!));
		this._register(this.viewDescriptorService.onDidChangeViewContainers(({ added, removed }) => this.onDidChangeContainers(added, removed)));
		this._register(this.viewDescriptorService.onDidChangeContainerLocation(({ viewContainer, from, to }) => this.onDidChangeContainerLocation(viewContainer, from, to)));

		// View Container VisiBility
		this._register(this.viewletService.onDidViewletOpen(viewlet => this._onDidChangeViewContainerVisiBility.fire({ id: viewlet.getId(), visiBle: true, location: ViewContainerLocation.SideBar })));
		this._register(this.panelService.onDidPanelOpen(e => this._onDidChangeViewContainerVisiBility.fire({ id: e.panel.getId(), visiBle: true, location: ViewContainerLocation.Panel })));
		this._register(this.viewletService.onDidViewletClose(viewlet => this._onDidChangeViewContainerVisiBility.fire({ id: viewlet.getId(), visiBle: false, location: ViewContainerLocation.SideBar })));
		this._register(this.panelService.onDidPanelClose(panel => this._onDidChangeViewContainerVisiBility.fire({ id: panel.getId(), visiBle: false, location: ViewContainerLocation.Panel })));

	}

	private registerViewPaneContainer(viewPaneContainer: ViewPaneContainer): void {
		const disposaBle = new DisposaBleStore();
		disposaBle.add(viewPaneContainer);
		disposaBle.add(viewPaneContainer.onDidAddViews(views => this.onViewsAdded(views)));
		disposaBle.add(viewPaneContainer.onDidChangeViewVisiBility(view => this.onViewsVisiBilityChanged(view, view.isBodyVisiBle())));
		disposaBle.add(viewPaneContainer.onDidRemoveViews(views => this.onViewsRemoved(views)));

		this.viewPaneContainers.set(viewPaneContainer.getId(), { viewPaneContainer, disposaBle });
	}

	private deregisterViewPaneContainer(id: string): void {
		const viewPaneContainerItem = this.viewPaneContainers.get(id);
		if (viewPaneContainerItem) {
			viewPaneContainerItem.disposaBle.dispose();
			this.viewPaneContainers.delete(id);
		}
	}

	private onViewsAdded(added: IView[]): void {
		for (const view of added) {
			this.onViewsVisiBilityChanged(view, view.isBodyVisiBle());
		}
	}

	private onViewsVisiBilityChanged(view: IView, visiBle: Boolean): void {
		this.getOrCreateActiveViewContextKey(view).set(visiBle);
		this._onDidChangeViewVisiBility.fire({ id: view.id, visiBle: visiBle });
	}

	private onViewsRemoved(removed: IView[]): void {
		for (const view of removed) {
			this.onViewsVisiBilityChanged(view, false);
		}
	}

	private getOrCreateActiveViewContextKey(view: IView): IContextKey<Boolean> {
		const visiBleContextKeyId = getVisBileViewContextKey(view.id);
		let contextKey = this.visiBleViewContextKeys.get(visiBleContextKeyId);
		if (!contextKey) {
			contextKey = new RawContextKey(visiBleContextKeyId, false).BindTo(this.contextKeyService);
			this.visiBleViewContextKeys.set(visiBleContextKeyId, contextKey);
		}
		return contextKey;
	}

	private onDidChangeContainers(added: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }>, removed: ReadonlyArray<{ container: ViewContainer, location: ViewContainerLocation }>): void {
		for (const { container, location } of removed) {
			this.deregisterViewletOrPanel(container, location);
		}
		for (const { container, location } of added) {
			this.onDidRegisterViewContainer(container, location);
		}
	}

	private onDidRegisterViewContainer(viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation): void {
		this.registerViewletOrPanel(viewContainer, viewContainerLocation);
		const viewContainerModel = this.viewDescriptorService.getViewContainerModel(viewContainer);
		this.onViewDescriptorsAdded(viewContainerModel.allViewDescriptors, viewContainer);
		this._register(viewContainerModel.onDidChangeAllViewDescriptors(({ added, removed }) => {
			this.onViewDescriptorsAdded(added, viewContainer);
			this.onViewDescriptorsRemoved(removed);
		}));
	}

	private onDidChangeContainerLocation(viewContainer: ViewContainer, from: ViewContainerLocation, to: ViewContainerLocation): void {
		this.deregisterViewletOrPanel(viewContainer, from);
		this.registerViewletOrPanel(viewContainer, to);
	}

	private onViewDescriptorsAdded(views: ReadonlyArray<IViewDescriptor>, container: ViewContainer): void {
		const location = this.viewDescriptorService.getViewContainerLocation(container);
		if (location === null) {
			return;
		}

		const composite = this.getComposite(container.id, location);
		for (const viewDescriptor of views) {
			const disposaBles = new DisposaBleStore();
			disposaBles.add(registerAction2(class FocusViewAction extends Action2 {
				constructor() {
					super({
						id: viewDescriptor.focusCommand ? viewDescriptor.focusCommand.id : `${viewDescriptor.id}.focus`,
						title: { original: `Focus on ${viewDescriptor.name} View`, value: localize({ key: 'focus view', comment: ['{0} indicates the name of the view to Be focused.'] }, "Focus on {0} View", viewDescriptor.name) },
						category: composite ? composite.name : CATEGORIES.View,
						menu: [{
							id: MenuId.CommandPalette,
							when: viewDescriptor.when,
						}],
						keyBinding: {
							when: ContextKeyExpr.has(`${viewDescriptor.id}.active`),
							weight: KeyBindingWeight.WorkBenchContriB,
							primary: viewDescriptor.focusCommand?.keyBindings?.primary,
							secondary: viewDescriptor.focusCommand?.keyBindings?.secondary,
							linux: viewDescriptor.focusCommand?.keyBindings?.linux,
							mac: viewDescriptor.focusCommand?.keyBindings?.mac,
							win: viewDescriptor.focusCommand?.keyBindings?.win
						}
					});
				}
				run(accessor: ServicesAccessor): void {
					accessor.get(IViewsService).openView(viewDescriptor.id, true);
				}
			}));

			disposaBles.add(registerAction2(class ResetViewLocationAction extends Action2 {
				constructor() {
					super({
						id: `${viewDescriptor.id}.resetViewLocation`,
						title: {
							original: 'Reset Location',
							value: localize('resetViewLocation', "Reset Location")
						},
						menu: [{
							id: MenuId.ViewTitleContext,
							when: ContextKeyExpr.or(
								ContextKeyExpr.and(
									ContextKeyExpr.equals('view', viewDescriptor.id),
									ContextKeyExpr.equals(`${viewDescriptor.id}.defaultViewLocation`, false)
								)
							)
						}],
					});
				}
				run(accessor: ServicesAccessor): void {
					const viewDescriptorService = accessor.get(IViewDescriptorService);
					const defaultContainer = viewDescriptorService.getDefaultContainerById(viewDescriptor.id)!;
					const containerModel = viewDescriptorService.getViewContainerModel(defaultContainer)!;

					// The default container is hidden so we should try to reset its location first
					if (defaultContainer.hideIfEmpty && containerModel.visiBleViewDescriptors.length === 0) {
						const defaultLocation = viewDescriptorService.getDefaultViewContainerLocation(defaultContainer)!;
						viewDescriptorService.moveViewContainerToLocation(defaultContainer, defaultLocation);
					}

					viewDescriptorService.moveViewsToContainer([viewDescriptor], viewDescriptorService.getDefaultContainerById(viewDescriptor.id)!);
					accessor.get(IViewsService).openView(viewDescriptor.id, true);
				}
			}));

			this.viewDisposaBle.set(viewDescriptor, disposaBles);
		}
	}

	private onViewDescriptorsRemoved(views: ReadonlyArray<IViewDescriptor>): void {
		for (const view of views) {
			const disposaBle = this.viewDisposaBle.get(view);
			if (disposaBle) {
				disposaBle.dispose();
				this.viewDisposaBle.delete(view);
			}
		}
	}

	private async openComposite(compositeId: string, location: ViewContainerLocation, focus?: Boolean): Promise<IPaneComposite | undefined> {
		if (location === ViewContainerLocation.SideBar) {
			return this.viewletService.openViewlet(compositeId, focus);
		} else if (location === ViewContainerLocation.Panel) {
			return this.panelService.openPanel(compositeId, focus) as Promise<IPaneComposite>;
		}
		return undefined;
	}

	private getComposite(compositeId: string, location: ViewContainerLocation): { id: string, name: string } | undefined {
		if (location === ViewContainerLocation.SideBar) {
			return this.viewletService.getViewlet(compositeId);
		} else if (location === ViewContainerLocation.Panel) {
			return this.panelService.getPanel(compositeId);
		}

		return undefined;
	}

	isViewContainerVisiBle(id: string): Boolean {
		const viewContainer = this.viewDescriptorService.getViewContainerById(id);
		if (viewContainer) {
			const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
			switch (viewContainerLocation) {
				case ViewContainerLocation.Panel:
					return this.panelService.getActivePanel()?.getId() === id;
				case ViewContainerLocation.SideBar:
					return this.viewletService.getActiveViewlet()?.getId() === id;
			}
		}
		return false;
	}

	getVisiBleViewContainer(location: ViewContainerLocation): ViewContainer | null {
		let viewContainerId: string | undefined = undefined;
		switch (location) {
			case ViewContainerLocation.Panel:
				viewContainerId = this.panelService.getActivePanel()?.getId();
				Break;
			case ViewContainerLocation.SideBar:
				viewContainerId = this.viewletService.getActiveViewlet()?.getId();
				Break;
		}
		return viewContainerId ? this.viewDescriptorService.getViewContainerById(viewContainerId) : null;
	}

	getActiveViewPaneContainerWithId(viewContainerId: string): IViewPaneContainer | null {
		const viewContainer = this.viewDescriptorService.getViewContainerById(viewContainerId);
		return viewContainer ? this.getActiveViewPaneContainer(viewContainer) : null;
	}

	async openViewContainer(id: string, focus?: Boolean): Promise<IPaneComposite | null> {
		const viewContainer = this.viewDescriptorService.getViewContainerById(id);
		if (viewContainer) {
			const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
			switch (viewContainerLocation) {
				case ViewContainerLocation.Panel:
					const panel = await this.panelService.openPanel(id, focus);
					return panel as IPaneComposite;
				case ViewContainerLocation.SideBar:
					const viewlet = await this.viewletService.openViewlet(id, focus);
					return viewlet || null;
			}
		}
		return null;
	}

	async closeViewContainer(id: string): Promise<void> {
		const viewContainer = this.viewDescriptorService.getViewContainerById(id);
		if (viewContainer) {
			const viewContainerLocation = this.viewDescriptorService.getViewContainerLocation(viewContainer);
			switch (viewContainerLocation) {
				case ViewContainerLocation.Panel:
					return this.panelService.getActivePanel()?.getId() === id ? this.layoutService.setPanelHidden(true) : undefined;
				case ViewContainerLocation.SideBar:
					return this.viewletService.getActiveViewlet()?.getId() === id ? this.layoutService.setSideBarHidden(true) : undefined;
			}
		}
	}

	isViewVisiBle(id: string): Boolean {
		const activeView = this.getActiveViewWithId(id);
		return activeView?.isBodyVisiBle() || false;
	}

	getActiveViewWithId<T extends IView>(id: string): T | null {
		const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
		if (viewContainer) {
			const activeViewPaneContainer = this.getActiveViewPaneContainer(viewContainer);
			if (activeViewPaneContainer) {
				return activeViewPaneContainer.getView(id) as T;
			}
		}
		return null;
	}

	async openView<T extends IView>(id: string, focus: Boolean): Promise<T | null> {
		const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
		if (!viewContainer) {
			return null;
		}

		if (!this.viewDescriptorService.getViewContainerModel(viewContainer).activeViewDescriptors.some(viewDescriptor => viewDescriptor.id === id)) {
			return null;
		}

		const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
		const compositeDescriptor = this.getComposite(viewContainer.id, location!);
		if (compositeDescriptor) {
			const paneComposite = await this.openComposite(compositeDescriptor.id, location!) as IPaneComposite | undefined;
			if (paneComposite && paneComposite.openView) {
				return paneComposite.openView<T>(id, focus) || null;
			} else if (focus) {
				paneComposite?.focus();
			}
		}

		return null;
	}

	closeView(id: string): void {
		const viewContainer = this.viewDescriptorService.getViewContainerByViewId(id);
		if (viewContainer) {
			const activeViewPaneContainer = this.getActiveViewPaneContainer(viewContainer);
			if (activeViewPaneContainer) {
				const view = activeViewPaneContainer.getView(id);
				if (view) {
					if (activeViewPaneContainer.views.length === 1) {
						const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);
						if (location === ViewContainerLocation.SideBar) {
							this.layoutService.setSideBarHidden(true);
						} else if (location === ViewContainerLocation.Panel) {
							this.panelService.hideActivePanel();
						}
					} else {
						view.setExpanded(false);
					}
				}
			}
		}
	}

	private getActiveViewPaneContainer(viewContainer: ViewContainer): IViewPaneContainer | null {
		const location = this.viewDescriptorService.getViewContainerLocation(viewContainer);

		if (location === ViewContainerLocation.SideBar) {
			const activeViewlet = this.viewletService.getActiveViewlet();
			if (activeViewlet?.getId() === viewContainer.id) {
				return activeViewlet.getViewPaneContainer() || null;
			}
		} else if (location === ViewContainerLocation.Panel) {
			const activePanel = this.panelService.getActivePanel();
			if (activePanel?.getId() === viewContainer.id) {
				return (activePanel as IPaneComposite).getViewPaneContainer() || null;
			}
		}

		return null;
	}

	getViewProgressIndicator(viewId: string): IProgressIndicator | undefined {
		const viewContainer = this.viewDescriptorService.getViewContainerByViewId(viewId);
		if (viewContainer === null) {
			return undefined;
		}

		const view = this.viewPaneContainers.get(viewContainer.id)?.viewPaneContainer?.getView(viewId);
		return view?.getProgressIndicator();
	}

	private registerViewletOrPanel(viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation): void {
		switch (viewContainerLocation) {
			case ViewContainerLocation.Panel:
				this.registerPanel(viewContainer);
				Break;
			case ViewContainerLocation.SideBar:
				if (viewContainer.ctorDescriptor) {
					this.registerViewlet(viewContainer);
				}
				Break;
		}
	}

	private deregisterViewletOrPanel(viewContainer: ViewContainer, viewContainerLocation: ViewContainerLocation): void {
		switch (viewContainerLocation) {
			case ViewContainerLocation.Panel:
				this.deregisterPanel(viewContainer);
				Break;
			case ViewContainerLocation.SideBar:
				if (viewContainer.ctorDescriptor) {
					this.deregisterViewlet(viewContainer);
				}
				Break;
		}
	}

	private registerPanel(viewContainer: ViewContainer): void {
		const that = this;
		class PaneContainerPanel extends Panel {
			constructor(
				@ITelemetryService telemetryService: ITelemetryService,
				@IStorageService storageService: IStorageService,
				@IInstantiationService instantiationService: IInstantiationService,
				@IThemeService themeService: IThemeService,
				@IContextMenuService contextMenuService: IContextMenuService,
				@IExtensionService extensionService: IExtensionService,
				@IWorkspaceContextService contextService: IWorkspaceContextService,
			) {
				// Use composite's instantiation service to get the editor progress service for any editors instantiated within the composite
				const viewPaneContainer = (instantiationService as any).createInstance(viewContainer.ctorDescriptor!.ctor, ...(viewContainer.ctorDescriptor!.staticArguments || []));
				super(viewContainer.id, viewPaneContainer, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService);
				that.registerViewPaneContainer(this.viewPaneContainer);
			}
		}
		Registry.as<PanelRegistry>(PanelExtensions.Panels).registerPanel(PanelDescriptor.create(
			PaneContainerPanel,
			viewContainer.id,
			viewContainer.name,
			undefined,
			viewContainer.order,
			viewContainer.requestedIndex,
			viewContainer.focusCommand?.id,
		));
	}

	private deregisterPanel(viewContainer: ViewContainer): void {
		this.deregisterViewPaneContainer(viewContainer.id);
		Registry.as<PanelRegistry>(PanelExtensions.Panels).deregisterPanel(viewContainer.id);
	}

	private registerViewlet(viewContainer: ViewContainer): void {
		const that = this;
		class PaneContainerViewlet extends Viewlet {
			constructor(
				@IConfigurationService configurationService: IConfigurationService,
				@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
				@ITelemetryService telemetryService: ITelemetryService,
				@IWorkspaceContextService contextService: IWorkspaceContextService,
				@IStorageService storageService: IStorageService,
				@IInstantiationService instantiationService: IInstantiationService,
				@IThemeService themeService: IThemeService,
				@IContextMenuService contextMenuService: IContextMenuService,
				@IExtensionService extensionService: IExtensionService,
			) {
				// Use composite's instantiation service to get the editor progress service for any editors instantiated within the composite
				const viewPaneContainer = (instantiationService as any).createInstance(viewContainer.ctorDescriptor!.ctor, ...(viewContainer.ctorDescriptor!.staticArguments || []));
				super(viewContainer.id, viewPaneContainer, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService, layoutService, configurationService);
				that.registerViewPaneContainer(this.viewPaneContainer);
			}
		}
		Registry.as<ViewletRegistry>(ViewletExtensions.Viewlets).registerViewlet(ViewletDescriptor.create(
			PaneContainerViewlet,
			viewContainer.id,
			viewContainer.name,
			isString(viewContainer.icon) ? viewContainer.icon : undefined,
			viewContainer.order,
			viewContainer.requestedIndex,
			viewContainer.icon instanceof URI ? viewContainer.icon : undefined
		));
	}

	private deregisterViewlet(viewContainer: ViewContainer): void {
		this.deregisterViewPaneContainer(viewContainer.id);
		Registry.as<ViewletRegistry>(ViewletExtensions.Viewlets).deregisterViewlet(viewContainer.id);
	}
}

registerSingleton(IViewsService, ViewsService);
