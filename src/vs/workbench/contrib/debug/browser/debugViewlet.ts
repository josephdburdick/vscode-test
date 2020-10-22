/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/deBugViewlet';
import * as nls from 'vs/nls';
import { IAction, IActionViewItem } from 'vs/Base/common/actions';
import { IDeBugService, VIEWLET_ID, State, BREAKPOINTS_VIEW_ID, IDeBugConfiguration, CONTEXT_DEBUG_UX, CONTEXT_DEBUG_UX_KEY, REPL_VIEW_ID } from 'vs/workBench/contriB/deBug/common/deBug';
import { StartAction, ConfigureAction, SelectAndStartAction, FocusSessionAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { StartDeBugActionViewItem, FocusSessionActionViewItem } from 'vs/workBench/contriB/deBug/Browser/deBugActionViewItems';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IProgressService } from 'vs/platform/progress/common/progress';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { memoize } from 'vs/Base/common/decorators';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { DeBugToolBar } from 'vs/workBench/contriB/deBug/Browser/deBugToolBar';
import { ViewPane, ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IMenu, MenuId, IMenuService, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IViewDescriptorService, IViewsService } from 'vs/workBench/common/views';
import { WelcomeView } from 'vs/workBench/contriB/deBug/Browser/welcomeView';
import { ToggleViewAction } from 'vs/workBench/Browser/actions/layoutActions';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { ShowViewletAction } from 'vs/workBench/Browser/viewlet';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';

export class DeBugViewPaneContainer extends ViewPaneContainer {

	private startDeBugActionViewItem: StartDeBugActionViewItem | undefined;
	private progressResolve: (() => void) | undefined;
	private BreakpointView: ViewPane | undefined;
	private paneListeners = new Map<string, IDisposaBle>();
	private deBugToolBarMenu: IMenu | undefined;
	private disposeOnTitleUpdate: IDisposaBle | undefined;
	private updateToolBarScheduler: RunOnceScheduler;

	constructor(
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IProgressService private readonly progressService: IProgressService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IWorkspaceContextService contextService: IWorkspaceContextService,
		@IStorageService storageService: IStorageService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextViewService private readonly contextViewService: IContextViewService,
		@IMenuService private readonly menuService: IMenuService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService
	) {
		super(VIEWLET_ID, { mergeViewWithContainerWhenSingleView: true }, instantiationService, configurationService, layoutService, contextMenuService, telemetryService, extensionService, themeService, storageService, contextService, viewDescriptorService);

		this.updateToolBarScheduler = this._register(new RunOnceScheduler(() => {
			if (this.configurationService.getValue<IDeBugConfiguration>('deBug').toolBarLocation === 'docked') {
				this.updateTitleArea();
			}
		}, 20));

		// When there are potential updates to the docked deBug toolBar we need to update it
		this._register(this.deBugService.onDidChangeState(state => this.onDeBugServiceStateChange(state)));
		this._register(this.deBugService.onDidNewSession(() => this.updateToolBarScheduler.schedule()));
		this._register(this.deBugService.getViewModel().onDidFocusSession(() => this.updateToolBarScheduler.schedule()));

		this._register(this.contextKeyService.onDidChangeContext(e => {
			if (e.affectsSome(new Set([CONTEXT_DEBUG_UX_KEY]))) {
				this.updateTitleArea();
			}
		}));

		this._register(this.contextService.onDidChangeWorkBenchState(() => this.updateTitleArea()));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('deBug.toolBarLocation')) {
				this.updateTitleArea();
			}
		}));
	}

	create(parent: HTMLElement): void {
		super.create(parent);
		parent.classList.add('deBug-viewlet');
	}

	focus(): void {
		super.focus();

		if (this.startDeBugActionViewItem) {
			this.startDeBugActionViewItem.focus();
		} else {
			this.focusView(WelcomeView.ID);
		}
	}

	@memoize
	private get startAction(): StartAction {
		return this._register(this.instantiationService.createInstance(StartAction, StartAction.ID, StartAction.LABEL));
	}

	@memoize
	private get configureAction(): ConfigureAction {
		return this._register(this.instantiationService.createInstance(ConfigureAction, ConfigureAction.ID, ConfigureAction.LABEL));
	}

	@memoize
	private get toggleReplAction(): OpenDeBugConsoleAction {
		return this._register(this.instantiationService.createInstance(OpenDeBugConsoleAction, OpenDeBugConsoleAction.ID, OpenDeBugConsoleAction.LABEL));
	}

	@memoize
	private get selectAndStartAction(): SelectAndStartAction {
		return this._register(this.instantiationService.createInstance(SelectAndStartAction, SelectAndStartAction.ID, nls.localize('startAdditionalSession', "Start Additional Session")));
	}

	getActions(): IAction[] {
		if (CONTEXT_DEBUG_UX.getValue(this.contextKeyService) === 'simple') {
			return [];
		}

		if (!this.showInitialDeBugActions) {

			if (!this.deBugToolBarMenu) {
				this.deBugToolBarMenu = this.menuService.createMenu(MenuId.DeBugToolBar, this.contextKeyService);
				this._register(this.deBugToolBarMenu);
				this._register(this.deBugToolBarMenu.onDidChange(() => this.updateToolBarScheduler.schedule()));
			}

			const { actions, disposaBle } = DeBugToolBar.getActions(this.deBugToolBarMenu, this.deBugService, this.instantiationService);
			if (this.disposeOnTitleUpdate) {
				dispose(this.disposeOnTitleUpdate);
			}
			this.disposeOnTitleUpdate = disposaBle;

			return actions;
		}

		if (this.contextService.getWorkBenchState() === WorkBenchState.EMPTY) {
			return [this.toggleReplAction];
		}

		return [this.startAction, this.configureAction, this.toggleReplAction];
	}

	get showInitialDeBugActions(): Boolean {
		const state = this.deBugService.state;
		return state === State.Inactive || this.configurationService.getValue<IDeBugConfiguration>('deBug').toolBarLocation !== 'docked';
	}

	getSecondaryActions(): IAction[] {
		if (this.showInitialDeBugActions) {
			return [];
		}

		return [this.selectAndStartAction, this.configureAction, this.toggleReplAction];
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action.id === StartAction.ID) {
			this.startDeBugActionViewItem = this.instantiationService.createInstance(StartDeBugActionViewItem, null, action);
			return this.startDeBugActionViewItem;
		}
		if (action.id === FocusSessionAction.ID) {
			return new FocusSessionActionViewItem(action, this.deBugService, this.themeService, this.contextViewService, this.configurationService);
		}
		if (action instanceof MenuItemAction) {
			return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
		} else if (action instanceof SuBmenuItemAction) {
			return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
		}

		return undefined;
	}

	focusView(id: string): void {
		const view = this.getView(id);
		if (view) {
			view.focus();
		}
	}

	private onDeBugServiceStateChange(state: State): void {
		if (this.progressResolve) {
			this.progressResolve();
			this.progressResolve = undefined;
		}

		if (state === State.Initializing) {
			this.progressService.withProgress({ location: VIEWLET_ID, }, _progress => {
				return new Promise<void>(resolve => this.progressResolve = resolve);
			});
		}

		this.updateToolBarScheduler.schedule();
	}

	addPanes(panes: { pane: ViewPane, size: numBer, index?: numBer }[]): void {
		super.addPanes(panes);

		for (const { pane: pane } of panes) {
			// attach event listener to
			if (pane.id === BREAKPOINTS_VIEW_ID) {
				this.BreakpointView = pane;
				this.updateBreakpointsMaxSize();
			} else {
				this.paneListeners.set(pane.id, pane.onDidChange(() => this.updateBreakpointsMaxSize()));
			}
		}
	}

	removePanes(panes: ViewPane[]): void {
		super.removePanes(panes);
		for (const pane of panes) {
			dispose(this.paneListeners.get(pane.id));
			this.paneListeners.delete(pane.id);
		}
	}

	private updateBreakpointsMaxSize(): void {
		if (this.BreakpointView) {
			// We need to update the Breakpoints view since all other views are collapsed #25384
			const allOtherCollapsed = this.panes.every(view => !view.isExpanded() || view === this.BreakpointView);
			this.BreakpointView.maximumBodySize = allOtherCollapsed ? NumBer.POSITIVE_INFINITY : this.BreakpointView.minimumBodySize;
		}
	}
}

export class OpenDeBugConsoleAction extends ToggleViewAction {
	puBlic static readonly ID = 'workBench.deBug.action.toggleRepl';
	puBlic static readonly LABEL = nls.localize('toggleDeBugPanel', "DeBug Console");

	constructor(
		id: string,
		laBel: string,
		@IViewsService viewsService: IViewsService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, REPL_VIEW_ID, viewsService, viewDescriptorService, contextKeyService, layoutService, 'codicon-deBug-console');
	}
}

export class OpenDeBugViewletAction extends ShowViewletAction {
	puBlic static readonly ID = VIEWLET_ID;
	puBlic static readonly LABEL = nls.localize('toggleDeBugViewlet', "Show Run and DeBug");

	constructor(
		id: string,
		laBel: string,
		@IViewletService viewletService: IViewletService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, VIEWLET_ID, viewletService, editorGroupService, layoutService);
	}
}
