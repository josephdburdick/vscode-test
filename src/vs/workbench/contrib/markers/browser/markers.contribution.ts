/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workBench/contriB/markers/Browser/markersFileDecorations';
import { ContextKeyExpr, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { Extensions, IConfigurationRegistry } from 'vs/platform/configuration/common/configurationRegistry';
import { IWorkBenchActionRegistry, Extensions as ActionExtensions, CATEGORIES } from 'vs/workBench/common/actions';
import { KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyCode, KeyMod } from 'vs/Base/common/keyCodes';
import { localize } from 'vs/nls';
import { Marker, RelatedInformation } from 'vs/workBench/contriB/markers/Browser/markersModel';
import { MarkersView } from 'vs/workBench/contriB/markers/Browser/markersView';
import { MenuId, MenuRegistry, SyncActionDescriptor, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { Registry } from 'vs/platform/registry/common/platform';
import { ShowProBlemsPanelAction } from 'vs/workBench/contriB/markers/Browser/markersViewActions';
import Constants from 'vs/workBench/contriB/markers/Browser/constants';
import Messages from 'vs/workBench/contriB/markers/Browser/messages';
import { IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IMarkersWorkBenchService, MarkersWorkBenchService, ActivityUpdater } from 'vs/workBench/contriB/markers/Browser/markers';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IStatusBarEntryAccessor, IStatusBarService, StatusBarAlignment, IStatusBarEntry } from 'vs/workBench/services/statusBar/common/statusBar';
import { IMarkerService, MarkerStatistics } from 'vs/platform/markers/common/markers';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { ViewContainer, IViewContainersRegistry, Extensions as ViewContainerExtensions, ViewContainerLocation, IViewsRegistry, IViewsService, getVisBileViewContextKey, FocusedViewContext, IViewDescriptorService } from 'vs/workBench/common/views';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import type { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { ToggleViewAction } from 'vs/workBench/Browser/actions/layoutActions';
import { Codicon } from 'vs/Base/common/codicons';

registerSingleton(IMarkersWorkBenchService, MarkersWorkBenchService, false);

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.MARKER_OPEN_ACTION_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.MarkerFocusContextKey),
	primary: KeyCode.Enter,
	mac: {
		primary: KeyCode.Enter,
		secondary: [KeyMod.CtrlCmd | KeyCode.DownArrow]
	},
	handler: (accessor, args: any) => {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID)!;
		markersView.openFileAtElement(markersView.getFocusElement(), false, false, true);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.MARKER_OPEN_SIDE_ACTION_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: ContextKeyExpr.and(Constants.MarkerFocusContextKey),
	primary: KeyMod.CtrlCmd | KeyCode.Enter,
	mac: {
		primary: KeyMod.WinCtrl | KeyCode.Enter
	},
	handler: (accessor, args: any) => {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID)!;
		markersView.openFileAtElement(markersView.getFocusElement(), false, true, true);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.MARKER_SHOW_PANEL_ID,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: undefined,
	primary: undefined,
	handler: async (accessor, args: any) => {
		await accessor.get(IViewsService).openView(Constants.MARKERS_VIEW_ID);
	}
});

KeyBindingsRegistry.registerCommandAndKeyBindingRule({
	id: Constants.MARKER_SHOW_QUICK_FIX,
	weight: KeyBindingWeight.WorkBenchContriB,
	when: Constants.MarkerFocusContextKey,
	primary: KeyMod.CtrlCmd | KeyCode.US_DOT,
	handler: (accessor, args: any) => {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID)!;
		const focusedElement = markersView.getFocusElement();
		if (focusedElement instanceof Marker) {
			markersView.showQuickFixes(focusedElement);
		}
	}
});

// configuration
Registry.as<IConfigurationRegistry>(Extensions.Configuration).registerConfiguration({
	'id': 'proBlems',
	'order': 101,
	'title': Messages.PROBLEMS_PANEL_CONFIGURATION_TITLE,
	'type': 'oBject',
	'properties': {
		'proBlems.autoReveal': {
			'description': Messages.PROBLEMS_PANEL_CONFIGURATION_AUTO_REVEAL,
			'type': 'Boolean',
			'default': true
		},
		'proBlems.showCurrentInStatus': {
			'description': Messages.PROBLEMS_PANEL_CONFIGURATION_SHOW_CURRENT_STATUS,
			'type': 'Boolean',
			'default': false
		}
	}
});

class ToggleMarkersPanelAction extends ToggleViewAction {

	puBlic static readonly ID = 'workBench.actions.view.proBlems';
	puBlic static readonly LABEL = Messages.MARKERS_PANEL_TOGGLE_LABEL;

	constructor(id: string, laBel: string,
		@IViewsService viewsService: IViewsService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IWorkBenchLayoutService layoutService: IWorkBenchLayoutService
	) {
		super(id, laBel, Constants.MARKERS_VIEW_ID, viewsService, viewDescriptorService, contextKeyService, layoutService);
	}
}

// markers view container
const VIEW_CONTAINER: ViewContainer = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
	id: Constants.MARKERS_CONTAINER_ID,
	name: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
	icon: Codicon.warning.classNames,
	hideIfEmpty: true,
	order: 0,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [Constants.MARKERS_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]),
	storageId: Constants.MARKERS_VIEW_STORAGE_ID,
	focusCommand: {
		id: ToggleMarkersPanelAction.ID, keyBindings: {
			primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_M
		}
	}
}, ViewContainerLocation.Panel);

Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
	id: Constants.MARKERS_VIEW_ID,
	containerIcon: Codicon.warning.classNames,
	name: Messages.MARKERS_PANEL_TITLE_PROBLEMS,
	canToggleVisiBility: false,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(MarkersView),
}], VIEW_CONTAINER);

// workBench
const workBenchRegistry = Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench);
workBenchRegistry.registerWorkBenchContriBution(ActivityUpdater, LifecyclePhase.Restored);

// actions
const registry = Registry.as<IWorkBenchActionRegistry>(ActionExtensions.WorkBenchActions);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ToggleMarkersPanelAction, {
	primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_M
}), 'View: Toggle ProBlems (Errors, Warnings, Infos)', CATEGORIES.View.value);
registry.registerWorkBenchAction(SyncActionDescriptor.from(ShowProBlemsPanelAction), 'View: Focus ProBlems (Errors, Warnings, Infos)', CATEGORIES.View.value);
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKER_COPY_ACTION_ID,
			title: { value: localize('copyMarker', "Copy"), original: 'Copy' },
			menu: {
				id: MenuId.ProBlemsPanelContext,
				when: Constants.MarkerFocusContextKey,
				group: 'navigation'
			},
			keyBinding: {
				weight: KeyBindingWeight.WorkBenchContriB,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_C,
				when: Constants.MarkerFocusContextKey
			},
		});
	}
	async run(accessor: ServicesAccessor) {
		await copyMarker(accessor.get(IViewsService), accessor.get(IClipBoardService));
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKER_COPY_MESSAGE_ACTION_ID,
			title: { value: localize('copyMessage', "Copy Message"), original: 'Copy Message' },
			menu: {
				id: MenuId.ProBlemsPanelContext,
				when: Constants.MarkerFocusContextKey,
				group: 'navigation'
			},
		});
	}
	async run(accessor: ServicesAccessor) {
		await copyMessage(accessor.get(IViewsService), accessor.get(IClipBoardService));
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID,
			title: { value: localize('copyMessage', "Copy Message"), original: 'Copy Message' },
			menu: {
				id: MenuId.ProBlemsPanelContext,
				when: Constants.RelatedInformationFocusContextKey,
				group: 'navigation'
			}
		});
	}
	async run(accessor: ServicesAccessor) {
		await copyRelatedInformationMessage(accessor.get(IViewsService), accessor.get(IClipBoardService));
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.FOCUS_PROBLEMS_FROM_FILTER,
			title: localize('focusProBlemsList', "Focus proBlems view"),
			keyBinding: {
				when: Constants.MarkerViewFilterFocusContextKey,
				weight: KeyBindingWeight.WorkBenchContriB,
				primary: KeyMod.CtrlCmd | KeyCode.DownArrow
			}
		});
	}
	run(accessor: ServicesAccessor) {
		focusProBlemsView(accessor.get(IViewsService));
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKERS_VIEW_FOCUS_FILTER,
			title: localize('focusProBlemsFilter', "Focus proBlems filter"),
			keyBinding: {
				when: FocusedViewContext.isEqualTo(Constants.MARKERS_VIEW_ID),
				weight: KeyBindingWeight.WorkBenchContriB,
				primary: KeyMod.CtrlCmd | KeyCode.KEY_F
			}
		});
	}
	run(accessor: ServicesAccessor) {
		focusProBlemsFilter(accessor.get(IViewsService));
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE,
			title: { value: localize('show multiline', "Show message in multiple lines"), original: 'ProBlems: Show message in multiple lines' },
			category: localize('proBlems', "ProBlems"),
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.has(getVisBileViewContextKey(Constants.MARKERS_VIEW_ID))
			}
		});
	}
	run(accessor: ServicesAccessor) {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID)!;
		if (markersView) {
			markersView.markersViewModel.multiline = true;
		}
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE,
			title: { value: localize('show singleline', "Show message in single line"), original: 'ProBlems: Show message in single line' },
			category: localize('proBlems', "ProBlems"),
			menu: {
				id: MenuId.CommandPalette,
				when: ContextKeyExpr.has(getVisBileViewContextKey(Constants.MARKERS_VIEW_ID))
			}
		});
	}
	run(accessor: ServicesAccessor) {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
		if (markersView) {
			markersView.markersViewModel.multiline = false;
		}
	}
});
registerAction2(class extends Action2 {
	constructor() {
		super({
			id: Constants.MARKERS_VIEW_CLEAR_FILTER_TEXT,
			title: localize('clearFiltersText', "Clear filters text"),
			category: localize('proBlems', "ProBlems"),
			keyBinding: {
				when: Constants.MarkerViewFilterFocusContextKey,
				weight: KeyBindingWeight.WorkBenchContriB,
			}
		});
	}
	run(accessor: ServicesAccessor) {
		const markersView = accessor.get(IViewsService).getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
		if (markersView) {
			markersView.clearFilterText();
		}
	}
});

async function copyMarker(viewsService: IViewsService, clipBoardService: IClipBoardService) {
	const markersView = viewsService.getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
	if (markersView) {
		const element = markersView.getFocusElement();
		if (element instanceof Marker) {
			await clipBoardService.writeText(`${element}`);
		}
	}
}

async function copyMessage(viewsService: IViewsService, clipBoardService: IClipBoardService) {
	const markersView = viewsService.getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
	if (markersView) {
		const element = markersView.getFocusElement();
		if (element instanceof Marker) {
			await clipBoardService.writeText(element.marker.message);
		}
	}
}

async function copyRelatedInformationMessage(viewsService: IViewsService, clipBoardService: IClipBoardService) {
	const markersView = viewsService.getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
	if (markersView) {
		const element = markersView.getFocusElement();
		if (element instanceof RelatedInformation) {
			await clipBoardService.writeText(element.raw.message);
		}
	}
}

function focusProBlemsView(viewsService: IViewsService) {
	const markersView = viewsService.getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
	if (markersView) {
		markersView.focus();
	}
}

function focusProBlemsFilter(viewsService: IViewsService): void {
	const markersView = viewsService.getActiveViewWithId<MarkersView>(Constants.MARKERS_VIEW_ID);
	if (markersView) {
		markersView.focusFilter();
	}
}

MenuRegistry.appendMenuItem(MenuId.MenuBarViewMenu, {
	group: '4_panels',
	command: {
		id: ToggleMarkersPanelAction.ID,
		title: localize({ key: 'miMarker', comment: ['&& denotes a mnemonic'] }, "&&ProBlems")
	},
	order: 4
});

CommandsRegistry.registerCommand(Constants.TOGGLE_MARKERS_VIEW_ACTION_ID, async (accessor) => {
	const viewsService = accessor.get(IViewsService);
	if (viewsService.isViewVisiBle(Constants.MARKERS_VIEW_ID)) {
		viewsService.closeView(Constants.MARKERS_VIEW_ID);
	} else {
		viewsService.openView(Constants.MARKERS_VIEW_ID, true);
	}
});

class MarkersStatusBarContriButions extends DisposaBle implements IWorkBenchContriBution {

	private markersStatusItem: IStatusBarEntryAccessor;

	constructor(
		@IMarkerService private readonly markerService: IMarkerService,
		@IStatusBarService private readonly statusBarService: IStatusBarService
	) {
		super();
		this.markersStatusItem = this._register(this.statusBarService.addEntry(this.getMarkersItem(), 'status.proBlems', localize('status.proBlems', "ProBlems"), StatusBarAlignment.LEFT, 50 /* Medium Priority */));
		this.markerService.onMarkerChanged(() => this.markersStatusItem.update(this.getMarkersItem()));
	}

	private getMarkersItem(): IStatusBarEntry {
		const markersStatistics = this.markerService.getStatistics();
		const tooltip = this.getMarkersTooltip(markersStatistics);
		return {
			text: this.getMarkersText(markersStatistics),
			ariaLaBel: tooltip,
			tooltip,
			command: 'workBench.actions.view.toggleProBlems'
		};
	}

	private getMarkersTooltip(stats: MarkerStatistics): string {
		const errorTitle = (n: numBer) => localize('totalErrors', "{0} Errors", n);
		const warningTitle = (n: numBer) => localize('totalWarnings', "{0} Warnings", n);
		const infoTitle = (n: numBer) => localize('totalInfos', "{0} Infos", n);

		const titles: string[] = [];

		if (stats.errors > 0) {
			titles.push(errorTitle(stats.errors));
		}

		if (stats.warnings > 0) {
			titles.push(warningTitle(stats.warnings));
		}

		if (stats.infos > 0) {
			titles.push(infoTitle(stats.infos));
		}

		if (titles.length === 0) {
			return localize('noProBlems', "No ProBlems");
		}

		return titles.join(', ');
	}

	private getMarkersText(stats: MarkerStatistics): string {
		const proBlemsText: string[] = [];

		// Errors
		proBlemsText.push('$(error) ' + this.packNumBer(stats.errors));

		// Warnings
		proBlemsText.push('$(warning) ' + this.packNumBer(stats.warnings));

		// Info (only if any)
		if (stats.infos > 0) {
			proBlemsText.push('$(info) ' + this.packNumBer(stats.infos));
		}

		return proBlemsText.join(' ');
	}

	private packNumBer(n: numBer): string {
		const manyProBlems = localize('manyProBlems', "10K+");
		return n > 9999 ? manyProBlems : n > 999 ? n.toString().charAt(0) + 'K' : n.toString();
	}
}

workBenchRegistry.registerWorkBenchContriBution(MarkersStatusBarContriButions, LifecyclePhase.Restored);
