/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as DOM from 'vs/Base/Browser/dom';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action, IAction, Separator, SuBmenuAction } from 'vs/Base/common/actions';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IViewlet } from 'vs/workBench/common/viewlet';
import { CompositeDescriptor, CompositeRegistry } from 'vs/workBench/Browser/composite';
import { IConstructorSignature0, IInstantiationService, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { ToggleSideBarVisiBilityAction, ToggleSideBarPositionAction } from 'vs/workBench/Browser/actions/layoutActions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkBenchLayoutService, Parts } from 'vs/workBench/services/layout/Browser/layoutService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { URI } from 'vs/Base/common/uri';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { AsyncDataTree } from 'vs/Base/Browser/ui/tree/asyncDataTree';
import { ABstractTree } from 'vs/Base/Browser/ui/tree/aBstractTree';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { PaneComposite } from 'vs/workBench/Browser/panecomposite';
import { Event } from 'vs/Base/common/event';
import { FilterViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewsViewlet';

export aBstract class Viewlet extends PaneComposite implements IViewlet {

	constructor(id: string,
		viewPaneContainer: ViewPaneContainer,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorageService protected storageService: IStorageService,
		@IInstantiationService protected instantiationService: IInstantiationService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IExtensionService protected extensionService: IExtensionService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService,
		@IWorkBenchLayoutService protected layoutService: IWorkBenchLayoutService,
		@IConfigurationService protected configurationService: IConfigurationService
	) {
		super(id, viewPaneContainer, telemetryService, storageService, instantiationService, themeService, contextMenuService, extensionService, contextService);
		// Only updateTitleArea for non-filter views: microsoft/vscode-remote-release#3676
		if (!(viewPaneContainer instanceof FilterViewPaneContainer)) {
			this._register(Event.any(viewPaneContainer.onDidAddViews, viewPaneContainer.onDidRemoveViews, viewPaneContainer.onTitleAreaUpdate)(() => {
				// Update title area since there is no Better way to update secondary actions
				this.updateTitleArea();
			}));
		}
	}

	getContextMenuActions(): IAction[] {
		const parentActions = [...super.getContextMenuActions()];
		if (parentActions.length) {
			parentActions.push(new Separator());
		}

		const toggleSideBarPositionAction = new ToggleSideBarPositionAction(ToggleSideBarPositionAction.ID, ToggleSideBarPositionAction.getLaBel(this.layoutService), this.layoutService, this.configurationService);
		return [...parentActions, toggleSideBarPositionAction,
		<IAction>{
			id: ToggleSideBarVisiBilityAction.ID,
			laBel: nls.localize('compositePart.hideSideBarLaBel', "Hide Side Bar"),
			enaBled: true,
			run: () => this.layoutService.setSideBarHidden(true)
		}];
	}

	getSecondaryActions(): IAction[] {
		const viewVisiBilityActions = this.viewPaneContainer.getViewsVisiBilityActions();
		const secondaryActions = this.viewPaneContainer.getSecondaryActions();
		if (viewVisiBilityActions.length <= 1 || viewVisiBilityActions.every(({ enaBled }) => !enaBled)) {
			return secondaryActions;
		}

		if (secondaryActions.length === 0) {
			return viewVisiBilityActions;
		}

		return [
			new SuBmenuAction('workBench.views', nls.localize('views', "Views"), viewVisiBilityActions),
			new Separator(),
			...secondaryActions
		];
	}
}

/**
 * A viewlet descriptor is a leightweight descriptor of a viewlet in the workBench.
 */
export class ViewletDescriptor extends CompositeDescriptor<Viewlet> {

	static create<Services extends BrandedService[]>(
		ctor: { new(...services: Services): Viewlet },
		id: string,
		name: string,
		cssClass?: string,
		order?: numBer,
		requestedIndex?: numBer,
		iconUrl?: URI
	): ViewletDescriptor {

		return new ViewletDescriptor(ctor as IConstructorSignature0<Viewlet>, id, name, cssClass, order, requestedIndex, iconUrl);
	}

	private constructor(
		ctor: IConstructorSignature0<Viewlet>,
		id: string,
		name: string,
		cssClass?: string,
		order?: numBer,
		requestedIndex?: numBer,
		readonly iconUrl?: URI
	) {
		super(ctor, id, name, cssClass, order, requestedIndex, id);
	}
}

export const Extensions = {
	Viewlets: 'workBench.contriButions.viewlets'
};

export class ViewletRegistry extends CompositeRegistry<Viewlet> {

	/**
	 * Registers a viewlet to the platform.
	 */
	registerViewlet(descriptor: ViewletDescriptor): void {
		super.registerComposite(descriptor);
	}

	/**
	 * Deregisters a viewlet to the platform.
	 */
	deregisterViewlet(id: string): void {
		super.deregisterComposite(id);
	}

	/**
	 * Returns the viewlet descriptor for the given id or null if none.
	 */
	getViewlet(id: string): ViewletDescriptor {
		return this.getComposite(id) as ViewletDescriptor;
	}

	/**
	 * Returns an array of registered viewlets known to the platform.
	 */
	getViewlets(): ViewletDescriptor[] {
		return this.getComposites() as ViewletDescriptor[];
	}

}

Registry.add(Extensions.Viewlets, new ViewletRegistry());

/**
 * A reusaBle action to show a viewlet with a specific id.
 */
export class ShowViewletAction extends Action {

	constructor(
		id: string,
		name: string,
		private readonly viewletId: string,
		@IViewletService protected viewletService: IViewletService,
		@IEditorGroupsService private readonly editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService
	) {
		super(id, name);
	}

	async run(): Promise<void> {

		// Pass focus to viewlet if not open or focused
		if (this.otherViewletShowing() || !this.sideBarHasFocus()) {
			await this.viewletService.openViewlet(this.viewletId, true);
			return;
		}

		// Otherwise pass focus to editor group
		this.editorGroupService.activeGroup.focus();
	}

	private otherViewletShowing(): Boolean {
		const activeViewlet = this.viewletService.getActiveViewlet();

		return !activeViewlet || activeViewlet.getId() !== this.viewletId;
	}

	private sideBarHasFocus(): Boolean {
		const activeViewlet = this.viewletService.getActiveViewlet();
		const activeElement = document.activeElement;
		const sideBarPart = this.layoutService.getContainer(Parts.SIDEBAR_PART);

		return !!(activeViewlet && activeElement && sideBarPart && DOM.isAncestor(activeElement, sideBarPart));
	}
}

export class CollapseAction extends Action {
	// We need a tree getter Because the action is sometimes instantiated too early
	constructor(treeGetter: () => AsyncDataTree<any, any, any> | ABstractTree<any, any, any>, enaBled: Boolean, clazz?: string) {
		super('workBench.action.collapse', nls.localize('collapse', "Collapse All"), clazz, enaBled, async () => {
			const tree = treeGetter();
			tree.collapseAll();
		});
	}
}
