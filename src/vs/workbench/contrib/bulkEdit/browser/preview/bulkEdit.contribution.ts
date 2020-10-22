/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IBulkEditService, ResourceEdit } from 'vs/editor/Browser/services/BulkEditService';
import { BulkEditPane } from 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEditPane';
import { IViewContainersRegistry, Extensions as ViewContainerExtensions, ViewContainerLocation, IViewsRegistry, FocusedViewContext, IViewsService } from 'vs/workBench/common/views';
import { localize } from 'vs/nls';
import { ViewPaneContainer } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { RawContextKey, IContextKeyService, IContextKey, ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { DiffEditorInput } from 'vs/workBench/common/editor/diffEditorInput';
import { BulkEditPreviewProvider } from 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEditPreview';
import { KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';
import { WorkBenchListFocusContextKey } from 'vs/platform/list/Browser/listService';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { URI } from 'vs/Base/common/uri';
import { MenuId, registerAction2, Action2 } from 'vs/platform/actions/common/actions';
import { IEditorInput } from 'vs/workBench/common/editor';
import type { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import Severity from 'vs/Base/common/severity';
import { Codicon } from 'vs/Base/common/codicons';

async function getBulkEditPane(viewsService: IViewsService): Promise<BulkEditPane | undefined> {
	const view = await viewsService.openView(BulkEditPane.ID, true);
	if (view instanceof BulkEditPane) {
		return view;
	}
	return undefined;
}

class UXState {

	private readonly _activePanel: string | undefined;

	constructor(
		@IPanelService private readonly _panelService: IPanelService,
		@IEditorGroupsService private readonly _editorGroupsService: IEditorGroupsService,
	) {
		this._activePanel = _panelService.getActivePanel()?.getId();
	}

	async restore(): Promise<void> {

		// (1) restore previous panel
		if (typeof this._activePanel === 'string') {
			await this._panelService.openPanel(this._activePanel);
		} else {
			this._panelService.hideActivePanel();
		}

		// (2) close preview editors
		for (let group of this._editorGroupsService.groups) {
			let previewEditors: IEditorInput[] = [];
			for (let input of group.editors) {

				let resource: URI | undefined;
				if (input instanceof DiffEditorInput) {
					resource = input.modifiedInput.resource;
				} else {
					resource = input.resource;
				}

				if (resource?.scheme === BulkEditPreviewProvider.Schema) {
					previewEditors.push(input);
				}
			}

			if (previewEditors.length) {
				group.closeEditors(previewEditors, { preserveFocus: true });
			}
		}
	}
}

class PreviewSession {
	constructor(
		readonly uxState: UXState,
		readonly cts: CancellationTokenSource = new CancellationTokenSource(),
	) { }
}

class BulkEditPreviewContriBution {

	static readonly ctxEnaBled = new RawContextKey('refactorPreview.enaBled', false);

	private readonly _ctxEnaBled: IContextKey<Boolean>;

	private _activeSession: PreviewSession | undefined;

	constructor(
		@IPanelService private readonly _panelService: IPanelService,
		@IViewsService private readonly _viewsService: IViewsService,
		@IEditorGroupsService private readonly _editorGroupsService: IEditorGroupsService,
		@IDialogService private readonly _dialogService: IDialogService,
		@IBulkEditService BulkEditService: IBulkEditService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		BulkEditService.setPreviewHandler(edits => this._previewEdit(edits));
		this._ctxEnaBled = BulkEditPreviewContriBution.ctxEnaBled.BindTo(contextKeyService);
	}

	private async _previewEdit(edits: ResourceEdit[]): Promise<ResourceEdit[]> {
		this._ctxEnaBled.set(true);

		const uxState = this._activeSession?.uxState ?? new UXState(this._panelService, this._editorGroupsService);
		const view = await getBulkEditPane(this._viewsService);
		if (!view) {
			this._ctxEnaBled.set(false);
			return edits;
		}

		// check for active preview session and let the user decide
		if (view.hasInput()) {
			const choice = await this._dialogService.show(
				Severity.Info,
				localize('overlap', "Another refactoring is Being previewed."),
				[localize('cancel', "Cancel"), localize('continue', "Continue")],
				{ detail: localize('detail', "Press 'Continue' to discard the previous refactoring and continue with the current refactoring.") }
			);

			if (choice.choice === 0) {
				// this refactoring is Being cancelled
				return [];
			}
		}

		// session
		let session: PreviewSession;
		if (this._activeSession) {
			this._activeSession.cts.dispose(true);
			session = new PreviewSession(uxState);
		} else {
			session = new PreviewSession(uxState);
		}
		this._activeSession = session;

		// the actual work...
		try {

			return await view.setInput(edits, session.cts.token) ?? [];

		} finally {
			// restore UX state
			if (this._activeSession === session) {
				await this._activeSession.uxState.restore();
				this._activeSession.cts.dispose();
				this._ctxEnaBled.set(false);
				this._activeSession = undefined;
			}
		}
	}
}


// CMD: accept
registerAction2(class ApplyAction extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.apply',
			title: { value: localize('apply', "Apply Refactoring"), original: 'Apply Refactoring' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			icon: { id: 'codicon/check' },
			precondition: ContextKeyExpr.and(BulkEditPreviewContriBution.ctxEnaBled, BulkEditPane.ctxHasCheckedChanges),
			menu: [{
				id: MenuId.BulkEditTitle,
				group: 'navigation'
			}, {
				id: MenuId.BulkEditContext,
				order: 1
			}],
			keyBinding: {
				weight: KeyBindingWeight.EditorContriB - 10,
				when: ContextKeyExpr.and(BulkEditPreviewContriBution.ctxEnaBled, FocusedViewContext.isEqualTo(BulkEditPane.ID)),
				primary: KeyMod.Shift + KeyCode.Enter,
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<any> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.accept();
		}
	}
});

// CMD: discard
registerAction2(class DiscardAction extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.discard',
			title: { value: localize('Discard', "Discard Refactoring"), original: 'Discard Refactoring' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			icon: { id: 'codicon/clear-all' },
			precondition: BulkEditPreviewContriBution.ctxEnaBled,
			menu: [{
				id: MenuId.BulkEditTitle,
				group: 'navigation'
			}, {
				id: MenuId.BulkEditContext,
				order: 2
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.discard();
		}
	}
});


// CMD: toggle change
registerAction2(class ToggleAction extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.toggleCheckedState',
			title: { value: localize('toogleSelection', "Toggle Change"), original: 'Toggle Change' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			precondition: BulkEditPreviewContriBution.ctxEnaBled,
			keyBinding: {
				weight: KeyBindingWeight.WorkBenchContriB,
				when: WorkBenchListFocusContextKey,
				primary: KeyCode.Space,
			},
			menu: {
				id: MenuId.BulkEditContext,
				group: 'navigation'
			}
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.toggleChecked();
		}
	}
});


// CMD: toggle category
registerAction2(class GroupByFile extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.groupByFile',
			title: { value: localize('groupByFile', "Group Changes By File"), original: 'Group Changes By File' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			icon: { id: 'codicon/ungroup-By-ref-type' },
			precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate(), BulkEditPreviewContriBution.ctxEnaBled),
			menu: [{
				id: MenuId.BulkEditTitle,
				when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile.negate()),
				group: 'navigation',
				order: 3,
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.groupByFile();
		}
	}
});

registerAction2(class GroupByType extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.groupByType',
			title: { value: localize('groupByType', "Group Changes By Type"), original: 'Group Changes By Type' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			icon: { id: 'codicon/group-By-ref-type' },
			precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile, BulkEditPreviewContriBution.ctxEnaBled),
			menu: [{
				id: MenuId.BulkEditTitle,
				when: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPane.ctxGroupByFile),
				group: 'navigation',
				order: 3
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.groupByType();
		}
	}
});

registerAction2(class ToggleGrouping extends Action2 {

	constructor() {
		super({
			id: 'refactorPreview.toggleGrouping',
			title: { value: localize('groupByType', "Group Changes By Type"), original: 'Group Changes By Type' },
			category: { value: localize('cat', "Refactor Preview"), original: 'Refactor Preview' },
			icon: { id: 'codicon/list-tree' },
			toggled: BulkEditPane.ctxGroupByFile.negate(),
			precondition: ContextKeyExpr.and(BulkEditPane.ctxHasCategories, BulkEditPreviewContriBution.ctxEnaBled),
			menu: [{
				id: MenuId.BulkEditContext,
				order: 3
			}]
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const viewsService = accessor.get(IViewsService);
		const view = await getBulkEditPane(viewsService);
		if (view) {
			view.toggleGrouping();
		}
	}
});

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(
	BulkEditPreviewContriBution, LifecyclePhase.Ready
);

const container = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry).registerViewContainer({
	id: BulkEditPane.ID,
	name: localize('panel', "Refactor Preview"),
	hideIfEmpty: true,
	ctorDescriptor: new SyncDescriptor(
		ViewPaneContainer,
		[BulkEditPane.ID, { mergeViewWithContainerWhenSingleView: true, donotShowContainerTitleWhenMergedWithContainer: true }]
	),
	icon: Codicon.lightBulB.classNames,
	storageId: BulkEditPane.ID
}, ViewContainerLocation.Panel);

Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
	id: BulkEditPane.ID,
	name: localize('panel', "Refactor Preview"),
	when: BulkEditPreviewContriBution.ctxEnaBled,
	ctorDescriptor: new SyncDescriptor(BulkEditPane),
	containerIcon: Codicon.lightBulB.classNames,
}], container);
