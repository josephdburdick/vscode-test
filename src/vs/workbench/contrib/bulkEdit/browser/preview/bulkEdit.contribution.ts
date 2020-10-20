/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IBulkEditService, ResourceEdit } from 'vs/editor/browser/services/bulkEditService';
import { BulkEditPAne } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditPAne';
import { IViewContAinersRegistry, Extensions As ViewContAinerExtensions, ViewContAinerLocAtion, IViewsRegistry, FocusedViewContext, IViewsService } from 'vs/workbench/common/views';
import { locAlize } from 'vs/nls';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { RAwContextKey, IContextKeyService, IContextKey, ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { DiffEditorInput } from 'vs/workbench/common/editor/diffEditorInput';
import { BulkEditPreviewProvider } from 'vs/workbench/contrib/bulkEdit/browser/preview/bulkEditPreview';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { WorkbenchListFocusContextKey } from 'vs/plAtform/list/browser/listService';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { URI } from 'vs/bAse/common/uri';
import { MenuId, registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { IEditorInput } from 'vs/workbench/common/editor';
import type { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import Severity from 'vs/bAse/common/severity';
import { Codicon } from 'vs/bAse/common/codicons';

Async function getBulkEditPAne(viewsService: IViewsService): Promise<BulkEditPAne | undefined> {
	const view = AwAit viewsService.openView(BulkEditPAne.ID, true);
	if (view instAnceof BulkEditPAne) {
		return view;
	}
	return undefined;
}

clAss UXStAte {

	privAte reAdonly _ActivePAnel: string | undefined;

	constructor(
		@IPAnelService privAte reAdonly _pAnelService: IPAnelService,
		@IEditorGroupsService privAte reAdonly _editorGroupsService: IEditorGroupsService,
	) {
		this._ActivePAnel = _pAnelService.getActivePAnel()?.getId();
	}

	Async restore(): Promise<void> {

		// (1) restore previous pAnel
		if (typeof this._ActivePAnel === 'string') {
			AwAit this._pAnelService.openPAnel(this._ActivePAnel);
		} else {
			this._pAnelService.hideActivePAnel();
		}

		// (2) close preview editors
		for (let group of this._editorGroupsService.groups) {
			let previewEditors: IEditorInput[] = [];
			for (let input of group.editors) {

				let resource: URI | undefined;
				if (input instAnceof DiffEditorInput) {
					resource = input.modifiedInput.resource;
				} else {
					resource = input.resource;
				}

				if (resource?.scheme === BulkEditPreviewProvider.SchemA) {
					previewEditors.push(input);
				}
			}

			if (previewEditors.length) {
				group.closeEditors(previewEditors, { preserveFocus: true });
			}
		}
	}
}

clAss PreviewSession {
	constructor(
		reAdonly uxStAte: UXStAte,
		reAdonly cts: CAncellAtionTokenSource = new CAncellAtionTokenSource(),
	) { }
}

clAss BulkEditPreviewContribution {

	stAtic reAdonly ctxEnAbled = new RAwContextKey('refActorPreview.enAbled', fAlse);

	privAte reAdonly _ctxEnAbled: IContextKey<booleAn>;

	privAte _ActiveSession: PreviewSession | undefined;

	constructor(
		@IPAnelService privAte reAdonly _pAnelService: IPAnelService,
		@IViewsService privAte reAdonly _viewsService: IViewsService,
		@IEditorGroupsService privAte reAdonly _editorGroupsService: IEditorGroupsService,
		@IDiAlogService privAte reAdonly _diAlogService: IDiAlogService,
		@IBulkEditService bulkEditService: IBulkEditService,
		@IContextKeyService contextKeyService: IContextKeyService,
	) {
		bulkEditService.setPreviewHAndler(edits => this._previewEdit(edits));
		this._ctxEnAbled = BulkEditPreviewContribution.ctxEnAbled.bindTo(contextKeyService);
	}

	privAte Async _previewEdit(edits: ResourceEdit[]): Promise<ResourceEdit[]> {
		this._ctxEnAbled.set(true);

		const uxStAte = this._ActiveSession?.uxStAte ?? new UXStAte(this._pAnelService, this._editorGroupsService);
		const view = AwAit getBulkEditPAne(this._viewsService);
		if (!view) {
			this._ctxEnAbled.set(fAlse);
			return edits;
		}

		// check for Active preview session And let the user decide
		if (view.hAsInput()) {
			const choice = AwAit this._diAlogService.show(
				Severity.Info,
				locAlize('overlAp', "Another refActoring is being previewed."),
				[locAlize('cAncel', "CAncel"), locAlize('continue', "Continue")],
				{ detAil: locAlize('detAil', "Press 'Continue' to discArd the previous refActoring And continue with the current refActoring.") }
			);

			if (choice.choice === 0) {
				// this refActoring is being cAncelled
				return [];
			}
		}

		// session
		let session: PreviewSession;
		if (this._ActiveSession) {
			this._ActiveSession.cts.dispose(true);
			session = new PreviewSession(uxStAte);
		} else {
			session = new PreviewSession(uxStAte);
		}
		this._ActiveSession = session;

		// the ActuAl work...
		try {

			return AwAit view.setInput(edits, session.cts.token) ?? [];

		} finAlly {
			// restore UX stAte
			if (this._ActiveSession === session) {
				AwAit this._ActiveSession.uxStAte.restore();
				this._ActiveSession.cts.dispose();
				this._ctxEnAbled.set(fAlse);
				this._ActiveSession = undefined;
			}
		}
	}
}


// CMD: Accept
registerAction2(clAss ApplyAction extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.Apply',
			title: { vAlue: locAlize('Apply', "Apply RefActoring"), originAl: 'Apply RefActoring' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			icon: { id: 'codicon/check' },
			precondition: ContextKeyExpr.And(BulkEditPreviewContribution.ctxEnAbled, BulkEditPAne.ctxHAsCheckedChAnges),
			menu: [{
				id: MenuId.BulkEditTitle,
				group: 'nAvigAtion'
			}, {
				id: MenuId.BulkEditContext,
				order: 1
			}],
			keybinding: {
				weight: KeybindingWeight.EditorContrib - 10,
				when: ContextKeyExpr.And(BulkEditPreviewContribution.ctxEnAbled, FocusedViewContext.isEquAlTo(BulkEditPAne.ID)),
				primAry: KeyMod.Shift + KeyCode.Enter,
			}
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<Any> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.Accept();
		}
	}
});

// CMD: discArd
registerAction2(clAss DiscArdAction extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.discArd',
			title: { vAlue: locAlize('DiscArd', "DiscArd RefActoring"), originAl: 'DiscArd RefActoring' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			icon: { id: 'codicon/cleAr-All' },
			precondition: BulkEditPreviewContribution.ctxEnAbled,
			menu: [{
				id: MenuId.BulkEditTitle,
				group: 'nAvigAtion'
			}, {
				id: MenuId.BulkEditContext,
				order: 2
			}]
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.discArd();
		}
	}
});


// CMD: toggle chAnge
registerAction2(clAss ToggleAction extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.toggleCheckedStAte',
			title: { vAlue: locAlize('toogleSelection', "Toggle ChAnge"), originAl: 'Toggle ChAnge' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			precondition: BulkEditPreviewContribution.ctxEnAbled,
			keybinding: {
				weight: KeybindingWeight.WorkbenchContrib,
				when: WorkbenchListFocusContextKey,
				primAry: KeyCode.SpAce,
			},
			menu: {
				id: MenuId.BulkEditContext,
				group: 'nAvigAtion'
			}
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.toggleChecked();
		}
	}
});


// CMD: toggle cAtegory
registerAction2(clAss GroupByFile extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.groupByFile',
			title: { vAlue: locAlize('groupByFile', "Group ChAnges By File"), originAl: 'Group ChAnges By File' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			icon: { id: 'codicon/ungroup-by-ref-type' },
			precondition: ContextKeyExpr.And(BulkEditPAne.ctxHAsCAtegories, BulkEditPAne.ctxGroupByFile.negAte(), BulkEditPreviewContribution.ctxEnAbled),
			menu: [{
				id: MenuId.BulkEditTitle,
				when: ContextKeyExpr.And(BulkEditPAne.ctxHAsCAtegories, BulkEditPAne.ctxGroupByFile.negAte()),
				group: 'nAvigAtion',
				order: 3,
			}]
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.groupByFile();
		}
	}
});

registerAction2(clAss GroupByType extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.groupByType',
			title: { vAlue: locAlize('groupByType', "Group ChAnges By Type"), originAl: 'Group ChAnges By Type' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			icon: { id: 'codicon/group-by-ref-type' },
			precondition: ContextKeyExpr.And(BulkEditPAne.ctxHAsCAtegories, BulkEditPAne.ctxGroupByFile, BulkEditPreviewContribution.ctxEnAbled),
			menu: [{
				id: MenuId.BulkEditTitle,
				when: ContextKeyExpr.And(BulkEditPAne.ctxHAsCAtegories, BulkEditPAne.ctxGroupByFile),
				group: 'nAvigAtion',
				order: 3
			}]
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.groupByType();
		}
	}
});

registerAction2(clAss ToggleGrouping extends Action2 {

	constructor() {
		super({
			id: 'refActorPreview.toggleGrouping',
			title: { vAlue: locAlize('groupByType', "Group ChAnges By Type"), originAl: 'Group ChAnges By Type' },
			cAtegory: { vAlue: locAlize('cAt', "RefActor Preview"), originAl: 'RefActor Preview' },
			icon: { id: 'codicon/list-tree' },
			toggled: BulkEditPAne.ctxGroupByFile.negAte(),
			precondition: ContextKeyExpr.And(BulkEditPAne.ctxHAsCAtegories, BulkEditPreviewContribution.ctxEnAbled),
			menu: [{
				id: MenuId.BulkEditContext,
				order: 3
			}]
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const viewsService = Accessor.get(IViewsService);
		const view = AwAit getBulkEditPAne(viewsService);
		if (view) {
			view.toggleGrouping();
		}
	}
});

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(
	BulkEditPreviewContribution, LifecyclePhAse.ReAdy
);

const contAiner = Registry.As<IViewContAinersRegistry>(ViewContAinerExtensions.ViewContAinersRegistry).registerViewContAiner({
	id: BulkEditPAne.ID,
	nAme: locAlize('pAnel', "RefActor Preview"),
	hideIfEmpty: true,
	ctorDescriptor: new SyncDescriptor(
		ViewPAneContAiner,
		[BulkEditPAne.ID, { mergeViewWithContAinerWhenSingleView: true, donotShowContAinerTitleWhenMergedWithContAiner: true }]
	),
	icon: Codicon.lightbulb.clAssNAmes,
	storAgeId: BulkEditPAne.ID
}, ViewContAinerLocAtion.PAnel);

Registry.As<IViewsRegistry>(ViewContAinerExtensions.ViewsRegistry).registerViews([{
	id: BulkEditPAne.ID,
	nAme: locAlize('pAnel', "RefActor Preview"),
	when: BulkEditPreviewContribution.ctxEnAbled,
	ctorDescriptor: new SyncDescriptor(BulkEditPAne),
	contAinerIcon: Codicon.lightbulb.clAssNAmes,
}], contAiner);
