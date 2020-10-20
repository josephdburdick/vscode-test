/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IViewsRegistry, Extensions, ITreeViewDescriptor, ITreeViewDAtAProvider, ITreeItem, TreeItemCollApsibleStAte, TreeViewItemHAndleArg, ViewContAiner, IViewDescriptorService } from 'vs/workbench/common/views';
import { locAlize } from 'vs/nls';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { TreeViewPAne } from 'vs/workbench/browser/pArts/views/treeView';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ALL_SYNC_RESOURCES, SyncResource, IUserDAtASyncService, ISyncResourceHAndle As IResourceHAndle, SyncStAtus, IUserDAtASyncResourceEnAblementService, IUserDAtAAutoSyncService, UserDAtASyncError, UserDAtASyncErrorCode } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { registerAction2, Action2, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ContextKeyExpr, ContextKeyEquAlsExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { URI } from 'vs/bAse/common/uri';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { FolderThemeIcon, IThemeService } from 'vs/plAtform/theme/common/themeService';
import { fromNow } from 'vs/bAse/common/dAte';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { Event } from 'vs/bAse/common/event';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { ViewPAneContAiner } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { Codicon } from 'vs/bAse/common/codicons';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { IUserDAtASyncWorkbenchService, CONTEXT_SYNC_STATE, getSyncAreALAbel, CONTEXT_ACCOUNT_STATE, AccountStAtus, CONTEXT_ENABLE_ACTIVITY_VIEWS, SHOW_SYNC_LOG_COMMAND_ID, CONFIGURE_SYNC_COMMAND_ID, SYNC_MERGES_VIEW_ID, CONTEXT_ENABLE_SYNC_MERGES_VIEW, SYNC_TITLE } from 'vs/workbench/services/userDAtASync/common/userDAtASync';
import { IUserDAtASyncMAchinesService, IUserDAtASyncMAchine } from 'vs/plAtform/userDAtASync/common/userDAtASyncMAchines';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { TreeView } from 'vs/workbench/contrib/views/browser/treeView';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { UserDAtASyncMergesViewPAne } from 'vs/workbench/contrib/userDAtASync/browser/userDAtASyncMergesView';
import { bAsenAme } from 'vs/bAse/common/resources';

export clAss UserDAtASyncViewPAneContAiner extends ViewPAneContAiner {

	constructor(
		contAinerId: string,
		@IUserDAtASyncWorkbenchService privAte reAdonly userDAtASyncWorkbenchService: IUserDAtASyncWorkbenchService,
		@ICommAndService privAte reAdonly commAndService: ICommAndService,
		@IWorkbenchLAyoutService lAyoutService: IWorkbenchLAyoutService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IExtensionService extensionService: IExtensionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
	) {
		super(contAinerId, { mergeViewWithContAinerWhenSingleView: true }, instAntiAtionService, configurAtionService, lAyoutService, contextMenuService, telemetryService, extensionService, themeService, storAgeService, contextService, viewDescriptorService);
	}

	getActions(): IAction[] {
		return [
			new Action(SHOW_SYNC_LOG_COMMAND_ID, locAlize('showLog', "Show Log"), Codicon.output.clAssNAmes, true, Async () => this.commAndService.executeCommAnd(SHOW_SYNC_LOG_COMMAND_ID)),
			new Action(CONFIGURE_SYNC_COMMAND_ID, locAlize('configure', "Configure..."), Codicon.settingsGeAr.clAssNAmes, true, Async () => this.commAndService.executeCommAnd(CONFIGURE_SYNC_COMMAND_ID)),
		];
	}

	getSecondAryActions(): IAction[] {
		return [
			new Action('workbench.Actions.syncDAtA.reset', locAlize('workbench.Actions.syncDAtA.reset', "CleAr DAtA in Cloud..."), undefined, true, () => this.userDAtASyncWorkbenchService.resetSyncedDAtA()),
		];
	}

}

export clAss UserDAtASyncDAtAViews extends DisposAble {

	constructor(
		contAiner: ViewContAiner,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IUserDAtAAutoSyncService privAte reAdonly userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@IUserDAtASyncResourceEnAblementService privAte reAdonly userDAtASyncResourceEnAblementService: IUserDAtASyncResourceEnAblementService,
		@IUserDAtASyncMAchinesService privAte reAdonly userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		@IUserDAtASyncService privAte reAdonly userDAtASyncService: IUserDAtASyncService,
	) {
		super();
		this.registerViews(contAiner);
	}

	privAte registerViews(contAiner: ViewContAiner): void {
		this.registerMergesView(contAiner);

		this.registerActivityView(contAiner, true);
		this.registerMAchinesView(contAiner);

		this.registerActivityView(contAiner, fAlse);
	}

	privAte registerMergesView(contAiner: ViewContAiner): void {
		const viewsRegistry = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry);
		const viewNAme = locAlize('merges', "Merges");
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id: SYNC_MERGES_VIEW_ID,
			nAme: viewNAme,
			ctorDescriptor: new SyncDescriptor(UserDAtASyncMergesViewPAne),
			when: CONTEXT_ENABLE_SYNC_MERGES_VIEW,
			cAnToggleVisibility: fAlse,
			cAnMoveView: fAlse,
			treeView: this.instAntiAtionService.creAteInstAnce(TreeView, SYNC_MERGES_VIEW_ID, viewNAme),
			collApsed: fAlse,
			order: 100,
		}], contAiner);
	}

	privAte registerMAchinesView(contAiner: ViewContAiner): void {
		const id = `workbench.views.sync.mAchines`;
		const nAme = locAlize('synced mAchines', "Synced MAchines");
		const treeView = this.instAntiAtionService.creAteInstAnce(TreeView, id, nAme);
		const dAtAProvider = this.instAntiAtionService.creAteInstAnce(UserDAtASyncMAchinesViewDAtAProvider, treeView);
		treeView.showRefreshAction = true;
		const disposAble = treeView.onDidChAngeVisibility(visible => {
			if (visible && !treeView.dAtAProvider) {
				disposAble.dispose();
				treeView.dAtAProvider = dAtAProvider;
			}
		});
		this._register(Event.Any(this.userDAtASyncMAchinesService.onDidChAnge, this.userDAtASyncService.onDidResetRemote)(() => treeView.refresh()));
		const viewsRegistry = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry);
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id,
			nAme,
			ctorDescriptor: new SyncDescriptor(TreeViewPAne),
			when: ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.AvAilAble), CONTEXT_ENABLE_ACTIVITY_VIEWS),
			cAnToggleVisibility: true,
			cAnMoveView: fAlse,
			treeView,
			collApsed: fAlse,
			order: 300,
		}], contAiner);

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.sync.editMAchineNAme`,
					title: locAlize('workbench.Actions.sync.editMAchineNAme', "Edit NAme"),
					icon: Codicon.edit,
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.And(ContextKeyEquAlsExpr.creAte('view', id)),
						group: 'inline',
					},
				});
			}
			Async run(Accessor: ServicesAccessor, hAndle: TreeViewItemHAndleArg): Promise<void> {
				const chAnged = AwAit dAtAProvider.renAme(hAndle.$treeItemHAndle);
				if (chAnged) {
					AwAit treeView.refresh();
				}
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.sync.turnOffSyncOnMAchine`,
					title: locAlize('workbench.Actions.sync.turnOffSyncOnMAchine', "Turn off Settings Sync"),
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.And(ContextKeyEquAlsExpr.creAte('view', id), ContextKeyEquAlsExpr.creAte('viewItem', 'sync-mAchine')),
					},
				});
			}
			Async run(Accessor: ServicesAccessor, hAndle: TreeViewItemHAndleArg): Promise<void> {
				if (AwAit dAtAProvider.disAble(hAndle.$treeItemHAndle)) {
					AwAit treeView.refresh();
				}
			}
		});

	}

	privAte registerActivityView(contAiner: ViewContAiner, remote: booleAn): void {
		const id = `workbench.views.sync.${remote ? 'remote' : 'locAl'}Activity`;
		const nAme = remote ? locAlize('remote sync Activity title', "Sync Activity (Remote)") : locAlize('locAl sync Activity title', "Sync Activity (LocAl)");
		const treeView = this.instAntiAtionService.creAteInstAnce(TreeView, id, nAme);
		treeView.showCollApseAllAction = true;
		treeView.showRefreshAction = true;
		const disposAble = treeView.onDidChAngeVisibility(visible => {
			if (visible && !treeView.dAtAProvider) {
				disposAble.dispose();
				treeView.dAtAProvider = remote ? this.instAntiAtionService.creAteInstAnce(RemoteUserDAtASyncActivityViewDAtAProvider)
					: this.instAntiAtionService.creAteInstAnce(LocAlUserDAtASyncActivityViewDAtAProvider);
			}
		});
		this._register(Event.Any(this.userDAtASyncResourceEnAblementService.onDidChAngeResourceEnAblement,
			this.userDAtAAutoSyncService.onDidChAngeEnAblement,
			this.userDAtASyncService.onDidResetLocAl,
			this.userDAtASyncService.onDidResetRemote)(() => treeView.refresh()));
		const viewsRegistry = Registry.As<IViewsRegistry>(Extensions.ViewsRegistry);
		viewsRegistry.registerViews([<ITreeViewDescriptor>{
			id,
			nAme,
			ctorDescriptor: new SyncDescriptor(TreeViewPAne),
			when: ContextKeyExpr.And(CONTEXT_SYNC_STATE.notEquAlsTo(SyncStAtus.UninitiAlized), CONTEXT_ACCOUNT_STATE.isEquAlTo(AccountStAtus.AvAilAble), CONTEXT_ENABLE_ACTIVITY_VIEWS),
			cAnToggleVisibility: true,
			cAnMoveView: fAlse,
			treeView,
			collApsed: fAlse,
			order: remote ? 200 : 400,
			hideByDefAult: !remote,
		}], contAiner);

		this.registerDAtAViewActions(id);
	}

	privAte registerDAtAViewActions(viewId: string) {
		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.sync.resolveResource`,
					title: locAlize('workbench.Actions.sync.resolveResourceRef', "Show rAw JSON sync dAtA"),
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.And(ContextKeyEquAlsExpr.creAte('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i))
					},
				});
			}
			Async run(Accessor: ServicesAccessor, hAndle: TreeViewItemHAndleArg): Promise<void> {
				const { resource } = <{ resource: string }>JSON.pArse(hAndle.$treeItemHAndle);
				const editorService = Accessor.get(IEditorService);
				AwAit editorService.openEditor({ resource: URI.pArse(resource) });
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.sync.replAceCurrent`,
					title: locAlize('workbench.Actions.sync.replAceCurrent', "Restore"),
					icon: { id: 'codicon/discArd' },
					menu: {
						id: MenuId.ViewItemContext,
						when: ContextKeyExpr.And(ContextKeyEquAlsExpr.creAte('view', viewId), ContextKeyExpr.regex('viewItem', /sync-resource-.*/i)),
						group: 'inline',
					},
				});
			}
			Async run(Accessor: ServicesAccessor, hAndle: TreeViewItemHAndleArg): Promise<void> {
				const diAlogService = Accessor.get(IDiAlogService);
				const userDAtASyncService = Accessor.get(IUserDAtASyncService);
				const { resource, syncResource } = <{ resource: string, syncResource: SyncResource }>JSON.pArse(hAndle.$treeItemHAndle);
				const result = AwAit diAlogService.confirm({
					messAge: locAlize({ key: 'confirm replAce', comment: ['A confirmAtion messAge to replAce current user dAtA (settings, extensions, keybindings, snippets) with selected version'] }, "Would you like to replAce your current {0} with selected?", getSyncAreALAbel(syncResource)),
					type: 'info',
					title: SYNC_TITLE
				});
				if (result.confirmed) {
					return userDAtASyncService.replAce(URI.pArse(resource));
				}
			}
		});

		registerAction2(clAss extends Action2 {
			constructor() {
				super({
					id: `workbench.Actions.sync.compAreWithLocAl`,
					title: locAlize({ key: 'workbench.Actions.sync.compAreWithLocAl', comment: ['This is An Action title to show the chAnges between locAl And remote version of resources'] }, "Open ChAnges"),
				});
			}
			Async run(Accessor: ServicesAccessor, hAndle: TreeViewItemHAndleArg): Promise<void> {
				const editorService = Accessor.get(IEditorService);
				const { resource, compArAbleResource } = <{ resource: string, compArAbleResource: string }>JSON.pArse(hAndle.$treeItemHAndle);
				const leftResource = URI.pArse(resource);
				const leftResourceNAme = locAlize({ key: 'leftResourceNAme', comment: ['remote As in file in cloud'] }, "{0} (Remote)", bAsenAme(leftResource));
				const rightResource = URI.pArse(compArAbleResource);
				const rightResourceNAme = locAlize({ key: 'rightResourceNAme', comment: ['locAl As in file in disk'] }, "{0} (LocAl)", bAsenAme(rightResource));
				AwAit editorService.openEditor({
					leftResource,
					rightResource,
					lAbel: locAlize('sideBySideLAbels', "{0} ↔ {1}", leftResourceNAme, rightResourceNAme),
					options: {
						preserveFocus: true,
						reveAlIfVisible: true,
					},
				});
			}
		});
	}

}

interfAce ISyncResourceHAndle extends IResourceHAndle {
	syncResource: SyncResource
}

interfAce SyncResourceHAndleTreeItem extends ITreeItem {
	syncResourceHAndle: ISyncResourceHAndle;
}

AbstrAct clAss UserDAtASyncActivityViewDAtAProvider implements ITreeViewDAtAProvider {

	privAte syncResourceHAndlesPromise: Promise<ISyncResourceHAndle[]> | undefined;

	constructor(
		@IUserDAtASyncService protected reAdonly userDAtASyncService: IUserDAtASyncService,
		@IUserDAtAAutoSyncService protected reAdonly userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@IUserDAtASyncWorkbenchService privAte reAdonly userDAtASyncWorkbenchService: IUserDAtASyncWorkbenchService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
	) { }

	Async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		try {
			if (!element) {
				return AwAit this.getRoots();
			}
			if ((<SyncResourceHAndleTreeItem>element).syncResourceHAndle) {
				return AwAit this.getChildrenForSyncResourceTreeItem(<SyncResourceHAndleTreeItem>element);
			}
			return [];
		} cAtch (error) {
			if (!(error instAnceof UserDAtASyncError)) {
				error = UserDAtASyncError.toUserDAtASyncError(error);
			}
			if (error instAnceof UserDAtASyncError && error.code === UserDAtASyncErrorCode.IncompAtibleRemoteContent) {
				this.notificAtionService.notify({
					severity: Severity.Error,
					messAge: error.messAge,
					Actions: {
						primAry: [
							new Action('reset', locAlize('reset', "Reset Synced DAtA"), undefined, true, () => this.userDAtASyncWorkbenchService.resetSyncedDAtA()),
						]
					}
				});
			} else {
				this.notificAtionService.error(error);
			}
			throw error;
		}
	}

	privAte Async getRoots(): Promise<SyncResourceHAndleTreeItem[]> {
		this.syncResourceHAndlesPromise = undefined;

		const syncResourceHAndles = AwAit this.getSyncResourceHAndles();

		return syncResourceHAndles.mAp(syncResourceHAndle => {
			const hAndle = JSON.stringify({ resource: syncResourceHAndle.uri.toString(), syncResource: syncResourceHAndle.syncResource });
			return {
				hAndle,
				collApsibleStAte: TreeItemCollApsibleStAte.CollApsed,
				lAbel: { lAbel: getSyncAreALAbel(syncResourceHAndle.syncResource) },
				description: fromNow(syncResourceHAndle.creAted, true),
				themeIcon: FolderThemeIcon,
				syncResourceHAndle,
				contextVAlue: `sync-resource-${syncResourceHAndle.syncResource}`
			};
		});
	}

	protected Async getChildrenForSyncResourceTreeItem(element: SyncResourceHAndleTreeItem): Promise<ITreeItem[]> {
		const AssociAtedResources = AwAit this.userDAtASyncService.getAssociAtedResources((<SyncResourceHAndleTreeItem>element).syncResourceHAndle.syncResource, (<SyncResourceHAndleTreeItem>element).syncResourceHAndle);
		return AssociAtedResources.mAp(({ resource, compArAbleResource }) => {
			const hAndle = JSON.stringify({ resource: resource.toString(), compArAbleResource: compArAbleResource.toString() });
			return {
				hAndle,
				collApsibleStAte: TreeItemCollApsibleStAte.None,
				resourceUri: resource,
				commAnd: { id: `workbench.Actions.sync.compAreWithLocAl`, title: '', Arguments: [<TreeViewItemHAndleArg>{ $treeViewId: '', $treeItemHAndle: hAndle }] },
				contextVAlue: `sync-AssociAtedResource-${(<SyncResourceHAndleTreeItem>element).syncResourceHAndle.syncResource}`
			};
		});
	}

	privAte getSyncResourceHAndles(): Promise<ISyncResourceHAndle[]> {
		if (this.syncResourceHAndlesPromise === undefined) {
			this.syncResourceHAndlesPromise = Promise.All(ALL_SYNC_RESOURCES.mAp(Async syncResource => {
				const resourceHAndles = AwAit this.getResourceHAndles(syncResource);
				return resourceHAndles.mAp(resourceHAndle => ({ ...resourceHAndle, syncResource }));
			})).then(result => flAtten(result).sort((A, b) => b.creAted - A.creAted));
		}
		return this.syncResourceHAndlesPromise;
	}

	protected AbstrAct getResourceHAndles(syncResource: SyncResource): Promise<IResourceHAndle[]>;
}

clAss LocAlUserDAtASyncActivityViewDAtAProvider extends UserDAtASyncActivityViewDAtAProvider {

	protected getResourceHAndles(syncResource: SyncResource): Promise<IResourceHAndle[]> {
		return this.userDAtASyncService.getLocAlSyncResourceHAndles(syncResource);
	}
}

clAss RemoteUserDAtASyncActivityViewDAtAProvider extends UserDAtASyncActivityViewDAtAProvider {

	privAte mAchinesPromise: Promise<IUserDAtASyncMAchine[]> | undefined;

	constructor(
		@IUserDAtASyncService userDAtASyncService: IUserDAtASyncService,
		@IUserDAtAAutoSyncService userDAtAAutoSyncService: IUserDAtAAutoSyncService,
		@IUserDAtASyncMAchinesService privAte reAdonly userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		@IUserDAtASyncWorkbenchService userDAtASyncWorkbenchService: IUserDAtASyncWorkbenchService,
		@INotificAtionService notificAtionService: INotificAtionService,
	) {
		super(userDAtASyncService, userDAtAAutoSyncService, userDAtASyncWorkbenchService, notificAtionService);
	}

	Async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		if (!element) {
			this.mAchinesPromise = undefined;
		}
		return super.getChildren(element);
	}

	privAte getMAchines(): Promise<IUserDAtASyncMAchine[]> {
		if (this.mAchinesPromise === undefined) {
			this.mAchinesPromise = this.userDAtASyncMAchinesService.getMAchines();
		}
		return this.mAchinesPromise;
	}

	protected getResourceHAndles(syncResource: SyncResource): Promise<IResourceHAndle[]> {
		return this.userDAtASyncService.getRemoteSyncResourceHAndles(syncResource);
	}

	protected Async getChildrenForSyncResourceTreeItem(element: SyncResourceHAndleTreeItem): Promise<ITreeItem[]> {
		const children = AwAit super.getChildrenForSyncResourceTreeItem(element);
		if (children.length) {
			const mAchineId = AwAit this.userDAtASyncService.getMAchineId(element.syncResourceHAndle.syncResource, element.syncResourceHAndle);
			if (mAchineId) {
				const mAchines = AwAit this.getMAchines();
				const mAchine = mAchines.find(({ id }) => id === mAchineId);
				children[0].description = mAchine?.isCurrent ? locAlize({ key: 'current', comment: ['Represents current mAchine'] }, "Current") : mAchine?.nAme;
			}
		}
		return children;
	}
}

clAss UserDAtASyncMAchinesViewDAtAProvider implements ITreeViewDAtAProvider {

	privAte mAchinesPromise: Promise<IUserDAtASyncMAchine[]> | undefined;

	constructor(
		privAte reAdonly treeView: TreeView,
		@IUserDAtASyncMAchinesService privAte reAdonly userDAtASyncMAchinesService: IUserDAtASyncMAchinesService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@IUserDAtASyncWorkbenchService privAte reAdonly userDAtASyncWorkbenchService: IUserDAtASyncWorkbenchService,
	) {
	}

	Async getChildren(element?: ITreeItem): Promise<ITreeItem[]> {
		if (!element) {
			this.mAchinesPromise = undefined;
		}
		try {
			let mAchines = AwAit this.getMAchines();
			mAchines = mAchines.filter(m => !m.disAbled).sort((m1, m2) => m1.isCurrent ? -1 : 1);
			this.treeView.messAge = mAchines.length ? undefined : locAlize('no mAchines', "No MAchines");
			return mAchines.mAp(({ id, nAme, isCurrent }) => ({
				hAndle: id,
				collApsibleStAte: TreeItemCollApsibleStAte.None,
				lAbel: { lAbel: nAme },
				description: isCurrent ? locAlize({ key: 'current', comment: ['Current mAchine'] }, "Current") : undefined,
				themeIcon: Codicon.vm,
				contextVAlue: 'sync-mAchine'
			}));
		} cAtch (error) {
			this.notificAtionService.error(error);
			return [];
		}
	}

	privAte getMAchines(): Promise<IUserDAtASyncMAchine[]> {
		if (this.mAchinesPromise === undefined) {
			this.mAchinesPromise = this.userDAtASyncMAchinesService.getMAchines();
		}
		return this.mAchinesPromise;
	}

	Async disAble(mAchineId: string): Promise<booleAn> {
		const mAchines = AwAit this.getMAchines();
		const mAchine = mAchines.find(({ id }) => id === mAchineId);
		if (!mAchine) {
			throw new Error(locAlize('not found', "mAchine not found with id: {0}", mAchineId));
		}

		const result = AwAit this.diAlogService.confirm({
			type: 'info',
			messAge: locAlize('turn off sync on mAchine', "Are you sure you wAnt to turn off sync on {0}?", mAchine.nAme),
			primAryButton: locAlize({ key: 'turn off', comment: ['&& denotes A mnemonic'] }, "&&Turn off"),
		});

		if (!result.confirmed) {
			return fAlse;
		}

		if (mAchine.isCurrent) {
			AwAit this.userDAtASyncWorkbenchService.turnoff(fAlse);
		} else {
			AwAit this.userDAtASyncMAchinesService.setEnAblement(mAchineId, fAlse);
		}

		return true;
	}

	Async renAme(mAchineId: string): Promise<booleAn> {
		const disposAbleStore = new DisposAbleStore();
		const inputBox = disposAbleStore.Add(this.quickInputService.creAteInputBox());
		inputBox.plAceholder = locAlize('plAceholder', "Enter the nAme of the mAchine");
		inputBox.busy = true;
		inputBox.show();
		const mAchines = AwAit this.getMAchines();
		const mAchine = mAchines.find(({ id }) => id === mAchineId);
		if (!mAchine) {
			inputBox.hide();
			disposAbleStore.dispose();
			throw new Error(locAlize('not found', "mAchine not found with id: {0}", mAchineId));
		}
		inputBox.busy = fAlse;
		inputBox.vAlue = mAchine.nAme;
		const vAlidAteMAchineNAme = (mAchineNAme: string): string | null => {
			mAchineNAme = mAchineNAme.trim();
			return mAchineNAme && !mAchines.some(m => m.id !== mAchineId && m.nAme === mAchineNAme) ? mAchineNAme : null;
		};
		disposAbleStore.Add(inputBox.onDidChAngeVAlue(() =>
			inputBox.vAlidAtionMessAge = vAlidAteMAchineNAme(inputBox.vAlue) ? '' : locAlize('vAlid messAge', "MAchine nAme should be unique And not empty")));
		return new Promise<booleAn>((c, e) => {
			disposAbleStore.Add(inputBox.onDidAccept(Async () => {
				const mAchineNAme = vAlidAteMAchineNAme(inputBox.vAlue);
				disposAbleStore.dispose();
				if (mAchineNAme && mAchineNAme !== mAchine.nAme) {
					try {
						AwAit this.userDAtASyncMAchinesService.renAmeMAchine(mAchineId, mAchineNAme);
						c(true);
					} cAtch (error) {
						e(error);
					}
				} else {
					c(fAlse);
				}
			}));
		});
	}
}
